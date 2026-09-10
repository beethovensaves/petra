import { createHash, randomBytes } from "node:crypto";

import type {
  CommandProjectSourceReplacementRef,
  PetraDomainEventV130,
  PetraOutboxRecordV130,
  PetraProjectSource,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceReplacementRetraction,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectSourceReplacementCommandError,
  createPetraId,
  derivePetraId,
  petraIdKind,
  type DomainRecordFactory,
  type ProjectSourceReplacementCommandAuthorityRepository,
  type ProjectSourceReplacementCommandEnvelope,
  type ProjectSourceReplacementCommandResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface CommandExecutionRow {
  command_id: string;
  command_fingerprint: string;
  result: unknown;
}

interface ReplacementRow extends StoredRow {
  project_id: string;
  replaced_project_source_id: string;
  revision: string;
  content_hash: string;
}

interface PositionRow {
  event_position: string;
  outbox_position: string;
}

interface RevisionRow {
  current_stream_revision: string;
}

interface TargetSequenceRow {
  current_target_sequence: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const commandFingerprint = (
  envelope: ProjectSourceReplacementCommandEnvelope,
): string => {
  const { correlation_id, submitted_at, ...governedCommand } = envelope;
  void correlation_id;
  void submitted_at;
  return canonicalHash(governedCommand);
};

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const encodeBase32 = (value: bigint, length: number): string => {
  let remaining = value;
  let encoded = "";
  for (let index = 0; index < length; index += 1) {
    encoded = ULID_ALPHABET[Number(remaining & 31n)] + encoded;
    remaining >>= 5n;
  }
  return encoded;
};

const systemUlid = (): string => {
  const timestamp = encodeBase32(BigInt(Date.now()), 10);
  const random = BigInt(`0x${randomBytes(10).toString("hex")}`);
  return `${timestamp}${encodeBase32(random, 16)}`;
};

const SYSTEM_DOMAIN_RECORD_FACTORY: DomainRecordFactory = {
  nextId: (kind) => createPetraId(kind, systemUlid()),
  now: () => new Date().toISOString(),
};

const replacementRef = <State extends "active" | "retracted">(
  replacement: PetraProjectSourceReplacement,
  recordHash: string,
  state: State,
): Omit<CommandProjectSourceReplacementRef, "state"> & { state: State } => ({
  project_source_replacement_id: replacement.project_source_replacement_id,
  revision: replacement.revision,
  content_hash: replacement.content_hash,
  record_hash: recordHash,
  state,
});

/**
 * Transactional ProjectSource replacement command authority. Relation creation
 * and retraction share the existing Project command/event/outbox spine.
 */
export class PostgresProjectSourceReplacementCommandAuthorityRepository implements ProjectSourceReplacementCommandAuthorityRepository {
  readonly #pool: Pool;
  readonly #commandAuthorizer: PostgresCommandAuthorizer;
  readonly #domainRecordFactory: DomainRecordFactory;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    commandAuthorizer: PostgresCommandAuthorizer,
    domainRecordFactory: DomainRecordFactory = SYSTEM_DOMAIN_RECORD_FACTORY,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#commandAuthorizer = commandAuthorizer;
    this.#domainRecordFactory = domainRecordFactory;
    this.#contracts = contracts;
  }

  async executeProjectSourceReplacementCommand(
    envelope: ProjectSourceReplacementCommandEnvelope,
  ): Promise<ProjectSourceReplacementCommandResult> {
    this.#contracts.assertValid("command-envelope", "1.3.0", envelope);
    const commandName = envelope.command.command_name;
    if (
      commandName !== "CreateProjectSourceReplacement" &&
      commandName !== "RetractProjectSourceReplacement"
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_STATUS_MISMATCH",
        "The replacement command boundary accepts only creation or retraction commands.",
      );
    }

    const fingerprint = commandFingerprint(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const target =
        commandName === "RetractProjectSourceReplacement"
          ? await this.#replacementRow(
              client,
              envelope.command.expected_replacement_ref
                .project_source_replacement_id,
            )
          : undefined;
      await this.#lock(client, envelope, target);
      if (
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName,
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize ${commandName}.`,
        );
      }
      const replay = await this.#replay(client, envelope, fingerprint);
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireProjectAndActor(client, envelope);

      const recordedAt = this.#domainRecordFactory.now();
      const authority = await this.#advanceAuthority(
        client,
        envelope.project_id,
      );
      let replacement: PetraProjectSourceReplacement;
      let replacementRecordHash: string;
      let retraction: PetraProjectSourceReplacementRetraction | undefined;
      let retractionRecordHash: string | undefined;

      if (commandName === "CreateProjectSourceReplacement") {
        await this.#requireCreateContext(client, envelope);
        const content: PetraProjectSourceReplacement["content"] = {
          relationship: "supersedes",
          replacement_kind: envelope.command.replacement_kind,
          replaced_source_ref: clone(envelope.command.replaced_source_ref),
          replacement_source_ref: clone(
            envelope.command.replacement_source_ref,
          ),
          exclusion_receipt_ref: clone(envelope.command.exclusion_receipt_ref),
          rationale: envelope.command.rationale,
        };
        replacement = {
          schema_name: "petra.project-source-replacement",
          schema_version: "1.0.0",
          project_source_replacement_id: derivePetraId(
            "project_source_replacement",
            envelope.command_id,
          ),
          revision: 1,
          project_id: envelope.project_id,
          content,
          content_hash: canonicalHash(content),
          recorded_by: clone(envelope.actor),
          recorded_at: envelope.submitted_at,
        };
        this.#contracts.assertValid(
          "project-source-replacement",
          "1.0.0",
          replacement,
        );
        replacementRecordHash = canonicalHash(replacement);
      } else {
        if (target === undefined) {
          throw this.#error(
            "PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_MISSING",
            "The ProjectSource replacement to retract is unavailable.",
          );
        }
        replacement = this.#replacement(target);
        replacementRecordHash = target.record_hash;
        const expected = envelope.command.expected_replacement_ref;
        if (
          target.project_id !== envelope.project_id ||
          Number(target.revision) !== expected.revision ||
          target.content_hash !== expected.content_hash ||
          target.record_hash !== expected.record_hash
        ) {
          throw this.#error(
            "PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_STALE",
            "The command must name the exact current replacement revision and hashes.",
          );
        }
        const active = await client.query(
          `SELECT 1
             FROM petra.project_source_replacement_heads
            WHERE project_id = $1
              AND replaced_project_source_id = $2
              AND current_project_source_replacement_id = $3
              AND state = 'active'
            FOR UPDATE`,
          [
            envelope.project_id,
            target.replaced_project_source_id,
            replacement.project_source_replacement_id,
          ],
        );
        if (active.rows[0] === undefined || expected.state !== "active") {
          throw this.#error(
            "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_ACTIVE",
            "Only the current active ProjectSource replacement can be retracted.",
          );
        }
        const content: PetraProjectSourceReplacementRetraction["content"] = {
          replacement_ref: {
            project_source_replacement_id:
              replacement.project_source_replacement_id,
            revision: replacement.revision,
            content_hash: replacement.content_hash,
            record_hash: replacementRecordHash,
          },
          reason: envelope.command.reason,
        };
        retraction = {
          schema_name: "petra.project-source-replacement-retraction",
          schema_version: "1.0.0",
          project_source_replacement_retraction_id: derivePetraId(
            "project_source_retraction",
            envelope.command_id,
          ),
          revision: 1,
          project_id: envelope.project_id,
          content,
          content_hash: canonicalHash(content),
          retracted_by: clone(envelope.actor),
          retracted_at: envelope.submitted_at,
        };
        this.#contracts.assertValid(
          "project-source-replacement-retraction",
          "1.0.0",
          retraction,
        );
        retractionRecordHash = canonicalHash(retraction);
      }

      const event = this.#event(
        envelope,
        replacement,
        retraction,
        authority.eventPosition,
        authority.streamRevision,
        recordedAt,
      );
      const eventRecordHash = canonicalHash(event);
      const receipt = this.#receipt(
        envelope,
        fingerprint,
        replacement,
        replacementRecordHash,
        retraction,
        retractionRecordHash,
        event,
        eventRecordHash,
        recordedAt,
      );

      await this.#insertCommandExecution(
        client,
        envelope,
        fingerprint,
        receipt,
        recordedAt,
      );
      if (retraction === undefined) {
        await this.#insertReplacement(
          client,
          replacement,
          replacementRecordHash,
        );
      } else {
        await this.#insertRetraction(
          client,
          retraction,
          retractionRecordHash ?? this.#never("retraction record hash"),
        );
      }
      await this.#insertEvent(client, event, eventRecordHash);
      await this.#insertOutbox(
        client,
        event,
        authority.firstOutboxPosition,
        recordedAt,
      );
      await this.#insertReceipt(client, receipt);
      await client.query("COMMIT");

      return retraction === undefined
        ? {
            outcome: "replacement_created",
            receipt: clone(receipt),
            replacement: clone(replacement),
            applied: true,
          }
        : {
            outcome: "replacement_retracted",
            receipt: clone(receipt),
            replacement: clone(replacement),
            retraction: clone(retraction),
            applied: true,
          };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ProjectSourceReplacementCommandError) throw error;
      throw this.#translate(error as { code?: string; message?: string });
    } finally {
      client.release();
    }
  }

  async getProjectSourceReplacementCommandReceipt(
    commandId: string,
  ): Promise<PetraProjectSourceReplacementReceipt | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_replacement_receipts
        WHERE command_id = $1`,
      [commandId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#readReceipt(result.rows[0]);
  }

  async #lock(
    client: PoolClient,
    envelope: ProjectSourceReplacementCommandEnvelope,
    target: ReplacementRow | undefined,
  ): Promise<void> {
    const command = envelope.command;
    const keys = [
      "authority:positions",
      `command:${envelope.command_id}`,
      `idempotency:${envelope.idempotency_key}`,
      `project:${envelope.project_id}`,
      ...(command.command_name === "CreateProjectSourceReplacement"
        ? [
            `project-source:${command.replaced_source_ref.project_source_id}`,
            `project-source:${command.replacement_source_ref.project_source_id}`,
            `project-source-replacement-outgoing:${envelope.project_id}:${command.replaced_source_ref.project_source_id}`,
          ]
        : [
            `project-source-replacement:${command.expected_replacement_ref.project_source_replacement_id}`,
            ...(target === undefined
              ? []
              : [
                  `project-source-replacement-outgoing:${target.project_id}:${target.replaced_project_source_id}`,
                ]),
          ]),
    ].sort();
    for (const key of keys) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #replay(
    client: PoolClient,
    envelope: ProjectSourceReplacementCommandEnvelope,
    fingerprint: string,
  ): Promise<ProjectSourceReplacementCommandResult | undefined> {
    const byIdempotency = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE idempotency_key = $1`,
      [envelope.idempotency_key],
    );
    const idempotent = byIdempotency.rows[0];
    if (idempotent !== undefined) {
      if (idempotent.command_fingerprint !== fingerprint) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different command content.",
        );
      }
      return this.#replayedResult(client, idempotent);
    }
    const byCommand = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE command_id = $1`,
      [envelope.command_id],
    );
    const command = byCommand.rows[0];
    if (command === undefined) return undefined;
    if (command.command_fingerprint !== fingerprint) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_ID_REUSED",
        "The command identity is already bound to different command content.",
      );
    }
    return this.#replayedResult(client, command);
  }

  async #replayedResult(
    client: PoolClient,
    row: CommandExecutionRow,
  ): Promise<ProjectSourceReplacementCommandResult> {
    const receiptResult = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_replacement_receipts
        WHERE command_id = $1`,
      [row.command_id],
    );
    const receiptRow = receiptResult.rows[0];
    if (receiptRow === undefined) {
      throw this.#corrupt("A persisted replacement command lost its receipt.");
    }
    if (canonicalize(receiptRow.payload) !== canonicalize(row.result)) {
      throw this.#corrupt(
        "The replacement command result differs from its immutable receipt.",
      );
    }
    const receipt = this.#readReceipt(receiptRow);
    const result = receipt.content.result;
    const replacementRow = await this.#replacementRow(
      client,
      result.replacement_ref.project_source_replacement_id,
    );
    if (replacementRow === undefined) {
      throw this.#corrupt(
        "A replacement command lost its immutable replacement record.",
      );
    }
    const replacement = this.#replacement(replacementRow);
    if (
      replacement.content_hash !== result.replacement_ref.content_hash ||
      replacementRow.record_hash !== result.replacement_ref.record_hash
    ) {
      throw this.#corrupt(
        "The replacement receipt no longer resolves its exact replacement.",
      );
    }
    if (result.effect === "replacement_activated") {
      return {
        outcome: "replacement_created",
        receipt,
        replacement,
        applied: false,
      };
    }
    const retractionResult = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_replacement_retractions
        WHERE project_source_replacement_retraction_id = $1`,
      [result.retraction_ref.project_source_replacement_retraction_id],
    );
    const retractionRow = retractionResult.rows[0];
    if (retractionRow === undefined) {
      throw this.#corrupt(
        "A retraction command lost its immutable retraction record.",
      );
    }
    const retraction = this.#retraction(retractionRow);
    if (
      retraction.content_hash !== result.retraction_ref.content_hash ||
      retractionRow.record_hash !== result.retraction_ref.record_hash
    ) {
      throw this.#corrupt(
        "The replacement receipt no longer resolves its exact retraction.",
      );
    }
    return {
      outcome: "replacement_retracted",
      receipt,
      replacement,
      retraction,
      applied: false,
    };
  }

  async #requireProjectAndActor(
    client: PoolClient,
    envelope: ProjectSourceReplacementCommandEnvelope,
  ): Promise<void> {
    const result = await client.query<{ actor_kind: string }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [envelope.project_id, envelope.actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== envelope.actor.actor_kind) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_PROJECT_MISMATCH",
        "The command Project and Actor must resolve exactly in local authority.",
      );
    }
  }

  async #requireCreateContext(
    client: PoolClient,
    envelope: ProjectSourceReplacementCommandEnvelope,
  ): Promise<void> {
    const command = envelope.command;
    if (command.command_name !== "CreateProjectSourceReplacement") {
      throw this.#corrupt(
        "Replacement creation context received another command kind.",
      );
    }
    if (
      command.replaced_source_ref.project_source_id ===
      command.replacement_source_ref.project_source_id
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_STATUS_MISMATCH",
        "A ProjectSource cannot replace itself.",
      );
    }
    const ids = [
      command.replaced_source_ref.project_source_id,
      command.replacement_source_ref.project_source_id,
    ];
    const sources = await client.query<
      StoredRow & { project_source_id: string }
    >(
      `SELECT head.project_source_id, revision.payload, revision.record_hash
         FROM petra.project_sources AS head
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = head.project_source_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.project_source_id = ANY($2::text[])
        FOR UPDATE OF head`,
      [envelope.project_id, ids],
    );
    if (sources.rows.length !== 2) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_MISSING",
        "Both ProjectSource identities must exist in the same Project.",
      );
    }
    for (const expected of [
      command.replaced_source_ref,
      command.replacement_source_ref,
    ]) {
      const row = sources.rows.find(
        (candidate) =>
          candidate.project_source_id === expected.project_source_id,
      );
      if (row === undefined) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_MISSING",
          "A referenced ProjectSource is unavailable in this Project.",
        );
      }
      const source = this.#source(row);
      if (
        source.revision !== expected.revision ||
        source.content_hash !== expected.content_hash ||
        row.record_hash !== expected.record_hash
      ) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_STALE",
          "Replacement creation must name both exact current ProjectSource revisions and hashes.",
        );
      }
      if (source.content.status !== expected.status) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_STATUS_MISMATCH",
          "Replacement creation requires an excluded predecessor and active successor.",
        );
      }
    }
    const active = await client.query(
      `SELECT 1
         FROM petra.project_source_replacement_heads
        WHERE project_id = $1
          AND replaced_project_source_id = $2
          AND state = 'active'
        FOR UPDATE`,
      [envelope.project_id, command.replaced_source_ref.project_source_id],
    );
    if (active.rows[0] !== undefined) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_ALREADY_ACTIVE",
        "The replaced ProjectSource already has an active successor.",
      );
    }
    const ref = command.exclusion_receipt_ref;
    const receiptResult = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_lifecycle_receipts
        WHERE project_id = $1
          AND project_source_lifecycle_receipt_id = $2`,
      [envelope.project_id, ref.project_source_lifecycle_receipt_id],
    );
    const row = receiptResult.rows[0];
    if (row === undefined) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_RECEIPT_MISSING",
        "The predecessor exclusion receipt is unavailable in this Project.",
      );
    }
    this.#contracts.assertValid(
      "project-source-lifecycle-receipt",
      "1.0.0",
      row.payload,
    );
    const receipt = clone(row.payload as PetraProjectSourceLifecycleReceipt);
    if (
      receipt.content_hash !== canonicalHash(receipt.content) ||
      row.record_hash !== canonicalHash(receipt)
    ) {
      throw this.#corrupt(
        "The predecessor exclusion receipt does not reproduce its canonical hashes.",
      );
    }
    const resulting = receipt.content.resulting_source_ref;
    const replaced = command.replaced_source_ref;
    if (
      receipt.revision !== ref.revision ||
      receipt.content_hash !== ref.content_hash ||
      row.record_hash !== ref.record_hash ||
      receipt.content.command_ref.command_name !== "ExcludeProjectSource" ||
      resulting.project_source_id !== replaced.project_source_id ||
      resulting.revision !== replaced.revision ||
      resulting.content_hash !== replaced.content_hash ||
      resulting.record_hash !== replaced.record_hash ||
      resulting.status !== "excluded"
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_RECEIPT_STALE",
        "The supplied receipt does not establish the exact predecessor exclusion.",
      );
    }
  }

  async #replacementRow(
    client: PoolClient,
    replacementId: string,
  ): Promise<ReplacementRow | undefined> {
    const result = await client.query<ReplacementRow>(
      `SELECT project_id, replaced_project_source_id, revision::text,
              content_hash, payload, record_hash
         FROM petra.project_source_replacements
        WHERE project_source_replacement_id = $1`,
      [replacementId],
    );
    return result.rows[0];
  }

  async #advanceAuthority(
    client: PoolClient,
    projectId: string,
  ): Promise<{
    eventPosition: number;
    streamRevision: number;
    firstOutboxPosition: number;
  }> {
    const positions = await client.query<PositionRow>(
      `UPDATE petra.authority_positions
          SET event_position = event_position + 1,
              outbox_position = outbox_position + 2
        WHERE singleton
      RETURNING event_position::text, outbox_position::text`,
    );
    const row = positions.rows[0];
    if (row === undefined) {
      throw this.#corrupt("The authority position row is unavailable.");
    }
    const eventPosition = this.#position(row.event_position, "event position");
    const finalOutboxPosition = this.#position(
      row.outbox_position,
      "outbox position",
    );
    const stream = await client.query<RevisionRow>(
      `INSERT INTO petra.project_event_stream_heads (
         project_id, current_stream_revision
       ) VALUES ($1, 1)
       ON CONFLICT (project_id) DO UPDATE
         SET current_stream_revision =
           petra.project_event_stream_heads.current_stream_revision + 1
       RETURNING current_stream_revision::text`,
      [projectId],
    );
    return {
      eventPosition,
      streamRevision: this.#position(
        stream.rows[0]?.current_stream_revision ?? "",
        "Project stream revision",
      ),
      firstOutboxPosition: finalOutboxPosition - 1,
    };
  }

  #event(
    envelope: ProjectSourceReplacementCommandEnvelope,
    replacement: PetraProjectSourceReplacement,
    retraction: PetraProjectSourceReplacementRetraction | undefined,
    eventPosition: number,
    streamRevision: number,
    recordedAt: string,
  ): PetraDomainEventV130 {
    const eventId = this.#domainRecordFactory.nextId("event");
    if (petraIdKind(eventId) !== "event") {
      throw this.#corrupt("DomainRecordFactory returned a non-event identity.");
    }
    const event: PetraDomainEventV130 = {
      schema_name: "petra.domain-event",
      schema_version: "1.3.0",
      event_id: eventId,
      event_position: eventPosition,
      stream_type: "project",
      stream_id: envelope.project_id,
      stream_revision: streamRevision,
      project_id: envelope.project_id,
      actor: clone(envelope.actor),
      occurred_at: envelope.submitted_at,
      recorded_at: recordedAt,
      correlation_id: envelope.correlation_id,
      causation_id: envelope.command_id,
      command_id: envelope.command_id,
      idempotency_key: envelope.idempotency_key,
      capability_grant_id: envelope.capability_grant_id,
      event:
        retraction === undefined
          ? {
              event_type: "project_source.replacement_created",
              payload: clone(replacement),
            }
          : {
              event_type: "project_source.replacement_retracted",
              payload: {
                replacement: clone(replacement),
                retraction: clone(retraction),
              },
            },
    };
    this.#contracts.assertValid("domain-event", "1.3.0", event);
    return event;
  }

  #receipt(
    envelope: ProjectSourceReplacementCommandEnvelope,
    fingerprint: string,
    replacement: PetraProjectSourceReplacement,
    replacementRecordHash: string,
    retraction: PetraProjectSourceReplacementRetraction | undefined,
    retractionRecordHash: string | undefined,
    event: PetraDomainEventV130,
    eventRecordHash: string,
    recordedAt: string,
  ): PetraProjectSourceReplacementReceipt {
    const activeRef = replacementRef(
      replacement,
      replacementRecordHash,
      "active",
    );
    const commandRef = {
      command_id: envelope.command_id,
      idempotency_key: envelope.idempotency_key,
      command_name: envelope.command.command_name,
      command_fingerprint: fingerprint,
    };
    const eventRef = {
      event_id: event.event_id,
      event_position: event.event_position,
      stream_revision: event.stream_revision,
      event_type: event.event.event_type,
      record_hash: eventRecordHash,
    };
    const preservation = {
      replacement_history: "retained" as const,
      retraction_history: "retained" as const,
      predecessor_source_history: "retained" as const,
      successor_source_history: "retained" as const,
      dependent_history: "retained" as const,
      artifact_material: "retained" as const,
    };
    const content: PetraProjectSourceReplacementReceipt["content"] =
      retraction === undefined
        ? {
            command_ref: {
              ...commandRef,
              command_name: "CreateProjectSourceReplacement",
            },
            event_ref: {
              ...eventRef,
              event_type: "project_source.replacement_created",
            },
            result: {
              effect: "replacement_activated",
              replacement_ref: activeRef,
            },
            preservation,
            recovery: {
              recovery_kind: "compensating_relationship_retraction",
              state: "available",
              inverse_command_name: "RetractProjectSourceReplacement",
              expected_replacement_ref: clone(activeRef),
              effect: "relationship_retracted_without_source_restore",
            },
          }
        : {
            command_ref: {
              ...commandRef,
              command_name: "RetractProjectSourceReplacement",
            },
            event_ref: {
              ...eventRef,
              event_type: "project_source.replacement_retracted",
            },
            result: {
              effect: "replacement_retracted",
              replacement_ref: replacementRef(
                replacement,
                replacementRecordHash,
                "retracted",
              ),
              retraction_ref: {
                project_source_replacement_retraction_id:
                  retraction.project_source_replacement_retraction_id,
                revision: retraction.revision,
                content_hash: retraction.content_hash,
                record_hash:
                  retractionRecordHash ?? this.#never("retraction record hash"),
              },
            },
            preservation,
            recovery: {
              recovery_kind: "separate_source_status_transition",
              source_status: "unchanged",
              separate_command_name: "RestoreProjectSource",
              effect: "relationship_inactive_predecessor_not_restored",
            },
          };
    const receipt: PetraProjectSourceReplacementReceipt = {
      schema_name: "petra.project-source-replacement-receipt",
      schema_version: "1.0.0",
      project_source_replacement_receipt_id: derivePetraId(
        "project_source_relation_receipt",
        envelope.command_id,
      ),
      revision: 1,
      project_id: envelope.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: recordedAt,
    };
    this.#contracts.assertValid(
      "project-source-replacement-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  async #insertCommandExecution(
    client: PoolClient,
    envelope: ProjectSourceReplacementCommandEnvelope,
    fingerprint: string,
    receipt: PetraProjectSourceReplacementReceipt,
    completedAt: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.command_executions (
         command_id, idempotency_key, project_id, actor_id, actor_kind,
         capability_grant_id, correlation_id, submitted_at, command_name,
         command_fingerprint, envelope, outcome_kind, result, error_code,
         error_message, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10,
                 $11::jsonb, 'success', $12::jsonb, NULL, NULL,
                 $13::timestamptz)`,
      [
        envelope.command_id,
        envelope.idempotency_key,
        envelope.project_id,
        envelope.actor.actor_id,
        envelope.actor.actor_kind,
        envelope.capability_grant_id,
        envelope.correlation_id,
        envelope.submitted_at,
        envelope.command.command_name,
        fingerprint,
        JSON.stringify(envelope),
        JSON.stringify(receipt),
        completedAt,
      ],
    );
  }

  async #insertReplacement(
    client: PoolClient,
    replacement: PetraProjectSourceReplacement,
    recordHash: string,
  ): Promise<void> {
    const content = replacement.content;
    const replaced = content.replaced_source_ref;
    const successor = content.replacement_source_ref;
    const exclusion = content.exclusion_receipt_ref;
    await client.query(
      `INSERT INTO petra.project_source_replacements (
         project_source_replacement_id, revision, project_id,
         relationship, replacement_kind, replaced_project_source_id,
         replaced_revision, replaced_content_hash, replaced_record_hash,
         replacement_project_source_id, replacement_revision,
         replacement_content_hash, replacement_record_hash, content_hash,
         exclusion_receipt_id, exclusion_receipt_revision,
         exclusion_receipt_content_hash, exclusion_receipt_record_hash,
         recorded_by_actor_id, recorded_by_actor_kind, recorded_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19,
         $20, $21::timestamptz, $22, $23::jsonb
       )`,
      [
        replacement.project_source_replacement_id,
        replacement.revision,
        replacement.project_id,
        content.relationship,
        content.replacement_kind,
        replaced.project_source_id,
        replaced.revision,
        replaced.content_hash,
        replaced.record_hash,
        successor.project_source_id,
        successor.revision,
        successor.content_hash,
        successor.record_hash,
        replacement.content_hash,
        exclusion.project_source_lifecycle_receipt_id,
        exclusion.revision,
        exclusion.content_hash,
        exclusion.record_hash,
        replacement.recorded_by.actor_id,
        replacement.recorded_by.actor_kind,
        replacement.recorded_at,
        recordHash,
        JSON.stringify(replacement),
      ],
    );
  }

  async #insertRetraction(
    client: PoolClient,
    retraction: PetraProjectSourceReplacementRetraction,
    recordHash: string,
  ): Promise<void> {
    const ref = retraction.content.replacement_ref;
    await client.query(
      `INSERT INTO petra.project_source_replacement_retractions (
         project_source_replacement_retraction_id, revision, project_id,
         project_source_replacement_id, replacement_revision,
         replacement_content_hash, replacement_record_hash, reason,
         content_hash, retracted_by_actor_id, retracted_by_actor_kind,
         retracted_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         $12::timestamptz, $13, $14::jsonb
       )`,
      [
        retraction.project_source_replacement_retraction_id,
        retraction.revision,
        retraction.project_id,
        ref.project_source_replacement_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
        retraction.content.reason,
        retraction.content_hash,
        retraction.retracted_by.actor_id,
        retraction.retracted_by.actor_kind,
        retraction.retracted_at,
        recordHash,
        JSON.stringify(retraction),
      ],
    );
  }

  async #insertEvent(
    client: PoolClient,
    event: PetraDomainEventV130,
    recordHash: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.domain_events (
         event_id, event_position, project_id, stream_revision, actor_id,
         actor_kind, occurred_at, recorded_at, correlation_id, command_id,
         idempotency_key, capability_grant_id, event_type, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz,
                 $8::timestamptz, $9, $10, $11, $12, $13, $14, $15::jsonb)`,
      [
        event.event_id,
        event.event_position,
        event.project_id,
        event.stream_revision,
        event.actor.actor_id,
        event.actor.actor_kind,
        event.occurred_at,
        event.recorded_at,
        event.correlation_id,
        event.command_id,
        event.idempotency_key,
        event.capability_grant_id,
        event.event.event_type,
        recordHash,
        JSON.stringify(event),
      ],
    );
  }

  async #insertOutbox(
    client: PoolClient,
    event: PetraDomainEventV130,
    firstOutboxPosition: number,
    enqueuedAt: string,
  ): Promise<void> {
    const targets: PetraOutboxRecordV130["target"][] = [
      "neo4j_graph",
      "interface_authority",
    ];
    for (const [index, target] of targets.entries()) {
      const sequence = await client.query<TargetSequenceRow>(
        `INSERT INTO petra.outbox_target_heads (
           target, project_id, current_target_sequence
         ) VALUES ($1, $2, 1)
         ON CONFLICT (target, project_id) DO UPDATE
           SET current_target_sequence =
             petra.outbox_target_heads.current_target_sequence + 1
         RETURNING current_target_sequence::text`,
        [target, event.project_id],
      );
      const targetSequence = this.#position(
        sequence.rows[0]?.current_target_sequence ?? "",
        `${target} sequence`,
      );
      const outboxId = this.#domainRecordFactory.nextId("outbox");
      if (petraIdKind(outboxId) !== "outbox") {
        throw this.#corrupt(
          "DomainRecordFactory returned a non-outbox identity.",
        );
      }
      const outbox: PetraOutboxRecordV130 = {
        schema_name: "petra.outbox-record",
        schema_version: "1.3.0",
        outbox_id: outboxId,
        outbox_position: firstOutboxPosition + index,
        target,
        target_sequence: targetSequence,
        partition_key: event.project_id,
        deduplication_key: `${target}:${event.event_id}`,
        enqueued_at: enqueuedAt,
        message: { message_kind: "domain_event", event: clone(event) },
      };
      this.#contracts.assertValid("outbox-record", "1.3.0", outbox);
      await client.query(
        `INSERT INTO petra.outbox_records (
           outbox_id, outbox_position, target, target_sequence,
           partition_key, deduplication_key, event_id, enqueued_at,
           record_hash, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz,
                   $9, $10::jsonb)`,
        [
          outbox.outbox_id,
          outbox.outbox_position,
          outbox.target,
          outbox.target_sequence,
          outbox.partition_key,
          outbox.deduplication_key,
          event.event_id,
          outbox.enqueued_at,
          canonicalHash(outbox),
          JSON.stringify(outbox),
        ],
      );
    }
  }

  async #insertReceipt(
    client: PoolClient,
    receipt: PetraProjectSourceReplacementReceipt,
  ): Promise<void> {
    const content = receipt.content;
    const replacement = content.result.replacement_ref;
    const retraction =
      content.result.effect === "replacement_retracted"
        ? content.result.retraction_ref
        : undefined;
    await client.query(
      `INSERT INTO petra.project_source_replacement_receipts (
         project_source_replacement_receipt_id, revision, project_id,
         command_id, idempotency_key, command_name, command_fingerprint,
         project_source_replacement_id, replacement_revision,
         replacement_content_hash, replacement_record_hash, replacement_state,
         project_source_retraction_id, retraction_revision,
         retraction_content_hash, retraction_record_hash,
         event_id, event_position, stream_revision, event_type,
         event_record_hash, content_hash, recorded_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23::timestamptz, $24, $25::jsonb
       )`,
      [
        receipt.project_source_replacement_receipt_id,
        receipt.revision,
        receipt.project_id,
        content.command_ref.command_id,
        content.command_ref.idempotency_key,
        content.command_ref.command_name,
        content.command_ref.command_fingerprint,
        replacement.project_source_replacement_id,
        replacement.revision,
        replacement.content_hash,
        replacement.record_hash,
        replacement.state,
        retraction?.project_source_replacement_retraction_id ?? null,
        retraction?.revision ?? null,
        retraction?.content_hash ?? null,
        retraction?.record_hash ?? null,
        content.event_ref.event_id,
        content.event_ref.event_position,
        content.event_ref.stream_revision,
        content.event_ref.event_type,
        content.event_ref.record_hash,
        receipt.content_hash,
        receipt.recorded_at,
        canonicalHash(receipt),
        JSON.stringify(receipt),
      ],
    );
  }

  #source(row: StoredRow): PetraProjectSource {
    this.#contracts.assertValid("project-source", "1.0.0", row.payload);
    const source = clone(row.payload as PetraProjectSource);
    if (
      source.content_hash !== canonicalHash(source.content) ||
      row.record_hash !== canonicalHash(source)
    ) {
      throw this.#corrupt(
        "A stored ProjectSource revision does not reproduce its canonical hashes.",
      );
    }
    return source;
  }

  #replacement(row: StoredRow): PetraProjectSourceReplacement {
    this.#contracts.assertValid(
      "project-source-replacement",
      "1.0.0",
      row.payload,
    );
    const replacement = clone(row.payload as PetraProjectSourceReplacement);
    if (
      replacement.content_hash !== canonicalHash(replacement.content) ||
      row.record_hash !== canonicalHash(replacement)
    ) {
      throw this.#corrupt(
        "A stored ProjectSource replacement does not reproduce its canonical hashes.",
      );
    }
    return replacement;
  }

  #retraction(row: StoredRow): PetraProjectSourceReplacementRetraction {
    this.#contracts.assertValid(
      "project-source-replacement-retraction",
      "1.0.0",
      row.payload,
    );
    const retraction = clone(
      row.payload as PetraProjectSourceReplacementRetraction,
    );
    if (
      retraction.content_hash !== canonicalHash(retraction.content) ||
      row.record_hash !== canonicalHash(retraction)
    ) {
      throw this.#corrupt(
        "A stored ProjectSource replacement retraction does not reproduce its canonical hashes.",
      );
    }
    return retraction;
  }

  #readReceipt(row: StoredRow): PetraProjectSourceReplacementReceipt {
    this.#contracts.assertValid(
      "project-source-replacement-receipt",
      "1.0.0",
      row.payload,
    );
    const receipt = clone(row.payload as PetraProjectSourceReplacementReceipt);
    if (
      receipt.content_hash !== canonicalHash(receipt.content) ||
      row.record_hash !== canonicalHash(receipt)
    ) {
      throw this.#corrupt(
        "A stored replacement command receipt does not reproduce its canonical hashes.",
      );
    }
    return receipt;
  }

  #position(value: string, label: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw this.#corrupt(`${label} is outside Petra's safe range.`);
    }
    return parsed;
  }

  #translate(error: { code?: string; message?: string }): Error {
    const message = error.message ?? "Replacement command persistence failed.";
    if (message.includes("active successor")) {
      return this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_ALREADY_ACTIVE",
        message,
      );
    }
    if (message.includes("current active replacement")) {
      return this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_ACTIVE",
        message,
      );
    }
    if (message.includes("cycle") || message.includes("32 edges")) {
      return this.#error(
        "PROJECT_SOURCE_REPLACEMENT_COMMAND_STATUS_MISMATCH",
        message,
      );
    }
    return this.#corrupt(message);
  }

  #never(label: string): never {
    throw this.#corrupt(`Missing ${label}.`);
  }

  #error(
    code: ConstructorParameters<typeof ProjectSourceReplacementCommandError>[0],
    message: string,
  ): ProjectSourceReplacementCommandError {
    return new ProjectSourceReplacementCommandError(code, message);
  }

  #corrupt(message: string): ProjectSourceReplacementCommandError {
    return this.#error(
      "PROJECT_SOURCE_REPLACEMENT_COMMAND_STORED_RECORD_CORRUPT",
      message,
    );
  }
}
