import { createHash, randomBytes } from "node:crypto";

import type {
  PetraDomainEventV120,
  PetraOutboxRecordV120,
  PetraProjectSource,
  PetraProjectSourceLifecycleReceipt,
  ProjectSourceLifecycleExactSourceRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ProjectSourceLifecycleAuthorityError,
  createPetraId,
  derivePetraId,
  petraIdKind,
  type DomainRecordFactory,
  type ProjectSourceLifecycleAuthorityRepository,
  type ProjectSourceLifecycleCommandEnvelope,
  type ProjectSourceLifecycleCommandResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

interface CommandExecutionRow {
  command_id: string;
  command_fingerprint: string;
  result: unknown;
}

interface SourceRow {
  payload: unknown;
  record_hash: string;
}

interface PayloadRow {
  payload: unknown;
  record_hash: string;
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

const sourceRef = (
  source: PetraProjectSource,
  recordHash: string,
): ProjectSourceLifecycleExactSourceRef => ({
  project_source_id: source.project_source_id,
  revision: source.revision,
  content_hash: source.content_hash,
  record_hash: recordHash,
  status: source.content.status,
});

/**
 * Transactional ProjectSource status authority on Petra's existing
 * command/event/outbox spine. No local Artifact bytes are deleted.
 */
export class PostgresProjectSourceLifecycleAuthorityRepository implements ProjectSourceLifecycleAuthorityRepository {
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

  async executeProjectSourceLifecycleCommand(
    envelope: ProjectSourceLifecycleCommandEnvelope,
  ): Promise<ProjectSourceLifecycleCommandResult> {
    this.#contracts.assertValid("command-envelope", "1.2.0", envelope);
    if (
      envelope.command.command_name !== "ExcludeProjectSource" &&
      envelope.command.command_name !== "RestoreProjectSource"
    ) {
      throw this.#error(
        "PROJECT_SOURCE_LIFECYCLE_STATUS_MISMATCH",
        "The ProjectSource lifecycle boundary accepts only exclude or restore commands.",
      );
    }
    const fingerprint = canonicalHash(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lock(client, envelope);
      if (
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName: envelope.command.command_name,
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw this.#error(
          "PROJECT_SOURCE_LIFECYCLE_COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize ${envelope.command.command_name}.`,
        );
      }
      const replay = await this.#replay(client, envelope, fingerprint);
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireContext(client, envelope);

      const currentRow = await this.#currentSource(
        client,
        envelope.project_id,
        envelope.command.expected_source_ref.project_source_id,
      );
      if (currentRow === undefined) {
        throw this.#error(
          "PROJECT_SOURCE_LIFECYCLE_SOURCE_NOT_FOUND",
          "The requested ProjectSource is not registered in this Project.",
        );
      }
      const current = this.#source(currentRow);
      const expected = envelope.command.expected_source_ref;
      if (
        current.project_source_id !== expected.project_source_id ||
        current.revision !== expected.revision ||
        current.content_hash !== expected.content_hash ||
        currentRow.record_hash !== expected.record_hash
      ) {
        throw this.#error(
          "PROJECT_SOURCE_LIFECYCLE_STALE_SOURCE",
          "The command must name the exact current ProjectSource revision and hashes.",
        );
      }
      const targetStatus =
        envelope.command.command_name === "ExcludeProjectSource"
          ? "excluded"
          : "active";
      if (
        current.content.status !== expected.status ||
        (envelope.command.command_name === "ExcludeProjectSource" &&
          current.content.status !== "active") ||
        (envelope.command.command_name === "RestoreProjectSource" &&
          current.content.status !== "excluded")
      ) {
        throw this.#error(
          "PROJECT_SOURCE_LIFECYCLE_STATUS_MISMATCH",
          "The command transition does not apply to the current ProjectSource status.",
        );
      }

      const next = clone(current);
      next.revision += 1;
      next.content.status = targetStatus;
      next.content_hash = canonicalHash(next.content);
      next.added_by = clone(envelope.actor);
      next.added_at = envelope.submitted_at;
      this.#contracts.assertValid("project-source", "1.0.0", next);
      const nextRecordHash = canonicalHash(next);
      const recordedAt = this.#domainRecordFactory.now();
      const authority = await this.#advanceAuthority(
        client,
        envelope.project_id,
      );
      const event = this.#event(
        envelope,
        current,
        currentRow.record_hash,
        next,
        authority.eventPosition,
        authority.streamRevision,
        recordedAt,
      );
      const eventRecordHash = canonicalHash(event);
      const receipt = this.#receipt(
        envelope,
        fingerprint,
        current,
        currentRow.record_hash,
        next,
        nextRecordHash,
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
      await this.#insertSourceRevision(client, next, nextRecordHash);
      const advanced = await client.query(
        `UPDATE petra.project_sources
            SET current_revision = $2
          WHERE project_source_id = $1
            AND current_revision = $3`,
        [next.project_source_id, next.revision, current.revision],
      );
      if (advanced.rowCount !== 1) {
        throw this.#error(
          "PROJECT_SOURCE_LIFECYCLE_STALE_SOURCE",
          "The ProjectSource head changed before the lifecycle command could commit.",
        );
      }
      await this.#insertEvent(client, event, eventRecordHash);
      await this.#insertOutbox(
        client,
        event,
        authority.firstOutboxPosition,
        recordedAt,
      );
      await this.#insertReceipt(client, receipt, nextRecordHash);
      await client.query("COMMIT");
      return {
        receipt: clone(receipt),
        projectSource: clone(next),
        applied: true,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getProjectSourceLifecycleReceipt(
    commandId: string,
  ): Promise<PetraProjectSourceLifecycleReceipt | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_lifecycle_receipts
        WHERE command_id = $1`,
      [commandId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#readReceipt(result.rows[0]);
  }

  async #lock(
    client: PoolClient,
    envelope: ProjectSourceLifecycleCommandEnvelope,
  ): Promise<void> {
    const keys = [
      "authority:positions",
      `command:${envelope.command_id}`,
      `idempotency:${envelope.idempotency_key}`,
      `project:${envelope.project_id}`,
      `project-source:${envelope.command.expected_source_ref.project_source_id}`,
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
    envelope: ProjectSourceLifecycleCommandEnvelope,
    fingerprint: string,
  ): Promise<ProjectSourceLifecycleCommandResult | undefined> {
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
          "PROJECT_SOURCE_LIFECYCLE_IDEMPOTENCY_KEY_REUSED",
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
        "PROJECT_SOURCE_LIFECYCLE_COMMAND_ID_REUSED",
        "The command identity is already bound to different command content.",
      );
    }
    return this.#replayedResult(client, command);
  }

  async #replayedResult(
    client: PoolClient,
    row: CommandExecutionRow,
  ): Promise<ProjectSourceLifecycleCommandResult> {
    const receiptResult = await client.query<PayloadRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_lifecycle_receipts
        WHERE command_id = $1`,
      [row.command_id],
    );
    const receiptRow = receiptResult.rows[0];
    if (receiptRow === undefined) {
      throw this.#corrupt(
        "A persisted lifecycle command lost its immutable receipt.",
      );
    }
    if (canonicalize(receiptRow.payload) !== canonicalize(row.result)) {
      throw this.#corrupt(
        "The lifecycle command result differs from its immutable receipt.",
      );
    }
    const receipt = this.#readReceipt(receiptRow);
    const source = await this.#sourceRevision(
      client,
      receipt.content.resulting_source_ref.project_source_id,
      receipt.content.resulting_source_ref.revision,
    );
    if (source === undefined) {
      throw this.#corrupt(
        "A persisted lifecycle command lost its resulting ProjectSource revision.",
      );
    }
    const projectSource = this.#source(source);
    if (
      projectSource.content_hash !==
        receipt.content.resulting_source_ref.content_hash ||
      source.record_hash !== receipt.content.resulting_source_ref.record_hash
    ) {
      throw this.#corrupt(
        "The lifecycle receipt no longer resolves its exact ProjectSource revision.",
      );
    }
    return { receipt, projectSource, applied: false };
  }

  async #requireContext(
    client: PoolClient,
    envelope: ProjectSourceLifecycleCommandEnvelope,
  ): Promise<void> {
    const result = await client.query<{ actor_kind: string }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [envelope.project_id, envelope.actor.actor_id],
    );
    const row = result.rows[0];
    if (row === undefined || row.actor_kind !== envelope.actor.actor_kind) {
      throw this.#error(
        "PROJECT_SOURCE_LIFECYCLE_PROJECT_MISMATCH",
        "The command Project and Actor must resolve exactly in local authority.",
      );
    }
  }

  async #currentSource(
    client: PoolClient,
    projectId: string,
    projectSourceId: string,
  ): Promise<SourceRow | undefined> {
    const result = await client.query<SourceRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_sources AS source
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = source.project_source_id
          AND revision.revision = source.current_revision
        WHERE source.project_id = $1
          AND source.project_source_id = $2
        FOR UPDATE OF source`,
      [projectId, projectSourceId],
    );
    return result.rows[0];
  }

  async #sourceRevision(
    client: PoolClient,
    projectSourceId: string,
    revision: number,
  ): Promise<SourceRow | undefined> {
    const result = await client.query<SourceRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_revisions
        WHERE project_source_id = $1 AND revision = $2`,
      [projectSourceId, revision],
    );
    return result.rows[0];
  }

  #source(row: SourceRow): PetraProjectSource {
    this.#contracts.assertValid("project-source", "1.0.0", row.payload);
    const source = clone(row.payload as PetraProjectSource);
    if (
      source.content_hash !== canonicalHash(source.content) ||
      row.record_hash !== canonicalHash(source)
    ) {
      throw this.#corrupt(
        "A stored ProjectSource revision does not match its canonical hashes.",
      );
    }
    return source;
  }

  async #advanceAuthority(
    client: PoolClient,
    projectId: string,
  ): Promise<{
    eventPosition: number;
    streamRevision: number;
    firstOutboxPosition: number;
  }> {
    const positionResult = await client.query<PositionRow>(
      `UPDATE petra.authority_positions
          SET event_position = event_position + 1,
              outbox_position = outbox_position + 1
        WHERE singleton
      RETURNING event_position::text, outbox_position::text`,
    );
    const row = positionResult.rows[0];
    if (row === undefined) {
      throw this.#corrupt("The authority position row is unavailable.");
    }
    const eventPosition = this.#position(row.event_position, "event position");
    const finalOutboxPosition = this.#position(
      row.outbox_position,
      "outbox position",
    );
    const streamResult = await client.query<RevisionRow>(
      `INSERT INTO petra.project_event_stream_heads (
         project_id, current_stream_revision
       ) VALUES ($1, 1)
       ON CONFLICT (project_id) DO UPDATE
         SET current_stream_revision =
           petra.project_event_stream_heads.current_stream_revision + 1
       RETURNING current_stream_revision::text`,
      [projectId],
    );
    const streamRevision = this.#position(
      streamResult.rows[0]?.current_stream_revision ?? "",
      "Project stream revision",
    );
    return {
      eventPosition,
      streamRevision,
      firstOutboxPosition: finalOutboxPosition,
    };
  }

  #event(
    envelope: ProjectSourceLifecycleCommandEnvelope,
    current: PetraProjectSource,
    currentRecordHash: string,
    next: PetraProjectSource,
    eventPosition: number,
    streamRevision: number,
    recordedAt: string,
  ): PetraDomainEventV120 {
    const eventId = this.#domainRecordFactory.nextId("event");
    if (petraIdKind(eventId) !== "event") {
      throw this.#corrupt("DomainRecordFactory returned a non-event identity.");
    }
    const event: PetraDomainEventV120 = {
      schema_name: "petra.domain-event",
      schema_version: "1.2.0",
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
      event: {
        event_type:
          envelope.command.command_name === "ExcludeProjectSource"
            ? "project_source.excluded"
            : "project_source.restored",
        payload: {
          prior_source_ref: sourceRef(current, currentRecordHash),
          project_source: clone(next),
        },
      },
    };
    this.#contracts.assertValid("domain-event", "1.2.0", event);
    return event;
  }

  #receipt(
    envelope: ProjectSourceLifecycleCommandEnvelope,
    fingerprint: string,
    current: PetraProjectSource,
    currentRecordHash: string,
    next: PetraProjectSource,
    nextRecordHash: string,
    event: PetraDomainEventV120,
    eventRecordHash: string,
    recordedAt: string,
  ): PetraProjectSourceLifecycleReceipt {
    const nextRef = sourceRef(next, nextRecordHash);
    const excluding = envelope.command.command_name === "ExcludeProjectSource";
    const content: PetraProjectSourceLifecycleReceipt["content"] = {
      command_ref: {
        command_id: envelope.command_id,
        idempotency_key: envelope.idempotency_key,
        command_name: envelope.command.command_name,
        command_fingerprint: fingerprint,
      },
      prior_source_ref: sourceRef(current, currentRecordHash),
      resulting_source_ref: nextRef,
      event_ref: {
        event_id: event.event_id,
        event_position: event.event_position,
        stream_revision: event.stream_revision,
        event_type: event.event.event_type as
          "project_source.excluded" | "project_source.restored",
        record_hash: eventRecordHash,
      },
      preservation: {
        project_source_history: "retained",
        canonical_identity: "retained",
        selected_work_version: "retained",
        artifact_manifest: "retained",
        local_artifact: "retained",
        parsed_representation: "retained",
        provenance: "retained",
      },
      recovery: {
        recovery_kind: "compensating_status_transition",
        state: "available",
        inverse_command_name: excluding
          ? "RestoreProjectSource"
          : "ExcludeProjectSource",
        expected_source_ref: clone(nextRef),
        effect: excluding
          ? "ordinary_new_use_restored"
          : "ordinary_new_use_disabled",
      },
    };
    const receipt: PetraProjectSourceLifecycleReceipt = {
      schema_name: "petra.project-source-lifecycle-receipt",
      schema_version: "1.0.0",
      project_source_lifecycle_receipt_id: derivePetraId(
        "project_source_lifecycle_receipt",
        envelope.command_id,
      ),
      revision: 1,
      project_id: envelope.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: recordedAt,
    };
    this.#contracts.assertValid(
      "project-source-lifecycle-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  async #insertCommandExecution(
    client: PoolClient,
    envelope: ProjectSourceLifecycleCommandEnvelope,
    fingerprint: string,
    receipt: PetraProjectSourceLifecycleReceipt,
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

  async #insertSourceRevision(
    client: PoolClient,
    source: PetraProjectSource,
    recordHash: string,
  ): Promise<void> {
    const content = source.content;
    await client.query(
      `INSERT INTO petra.project_source_revisions (
         project_source_id, revision, project_id, binding_kind,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, source_role,
         work_id, work_revision, work_record_hash,
         work_version_id, work_version_revision, work_version_record_hash,
         artifact_manifest_id, artifact_manifest_revision,
         artifact_manifest_record_hash, status, content_hash,
         added_by_actor_id, added_by_actor_kind,
         schema_name, schema_version, record_hash, payload, added_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25::jsonb, $26::timestamptz
       )`,
      [
        source.project_source_id,
        source.revision,
        source.project_id,
        content.binding_kind,
        content.project_definition_ref.project_definition_id,
        content.project_definition_ref.revision,
        content.project_definition_ref.content_hash,
        content.source_role,
        content.work_ref.work_id,
        content.work_ref.revision,
        content.work_ref.record_hash,
        content.work_version_ref.work_version_id,
        content.work_version_ref.revision,
        content.work_version_ref.record_hash,
        content.artifact_manifest_ref.artifact_manifest_id,
        content.artifact_manifest_ref.revision,
        content.artifact_manifest_ref.record_hash,
        content.status,
        source.content_hash,
        source.added_by.actor_id,
        source.added_by.actor_kind,
        source.schema_name,
        source.schema_version,
        recordHash,
        JSON.stringify(source),
        source.added_at,
      ],
    );
    for (const [index, author] of content.author_refs.entries()) {
      await client.query(
        `INSERT INTO petra.project_source_author_refs (
           project_source_id, project_source_revision, position,
           author_id, author_revision, author_record_hash
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          source.project_source_id,
          source.revision,
          index + 1,
          author.author_id,
          author.revision,
          author.record_hash,
        ],
      );
    }
  }

  async #insertEvent(
    client: PoolClient,
    event: PetraDomainEventV120,
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
    event: PetraDomainEventV120,
    firstOutboxPosition: number,
    enqueuedAt: string,
  ): Promise<void> {
    const targets: PetraOutboxRecordV120["target"][] = ["interface_authority"];
    for (const [index, target] of targets.entries()) {
      const sequenceResult = await client.query<TargetSequenceRow>(
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
        sequenceResult.rows[0]?.current_target_sequence ?? "",
        `${target} sequence`,
      );
      const outboxId = this.#domainRecordFactory.nextId("outbox");
      if (petraIdKind(outboxId) !== "outbox") {
        throw this.#corrupt(
          "DomainRecordFactory returned a non-outbox identity.",
        );
      }
      const outbox: PetraOutboxRecordV120 = {
        schema_name: "petra.outbox-record",
        schema_version: "1.2.0",
        outbox_id: outboxId,
        outbox_position: firstOutboxPosition + index,
        target,
        target_sequence: targetSequence,
        partition_key: event.project_id,
        deduplication_key: `${target}:${event.event_id}`,
        enqueued_at: enqueuedAt,
        message: { message_kind: "domain_event", event: clone(event) },
      };
      this.#contracts.assertValid("outbox-record", "1.2.0", outbox);
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
    receipt: PetraProjectSourceLifecycleReceipt,
    resultingRecordHash: string,
  ): Promise<void> {
    const content = receipt.content;
    const prior = content.prior_source_ref;
    const resulting = content.resulting_source_ref;
    const event = content.event_ref;
    if (resulting.record_hash !== resultingRecordHash) {
      throw this.#corrupt(
        "The lifecycle receipt resulting hash differs from the inserted source revision.",
      );
    }
    await client.query(
      `INSERT INTO petra.project_source_lifecycle_receipts (
         project_source_lifecycle_receipt_id, revision, project_id,
         project_source_id, command_id, idempotency_key, command_name,
         command_fingerprint, prior_revision, prior_content_hash,
         prior_record_hash, prior_status, resulting_revision,
         resulting_content_hash, resulting_record_hash, resulting_status,
         event_id, event_position, stream_revision, event_type,
         event_record_hash, inverse_command_name, content_hash, recorded_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24::timestamptz, $25, $26::jsonb
       )`,
      [
        receipt.project_source_lifecycle_receipt_id,
        receipt.revision,
        receipt.project_id,
        prior.project_source_id,
        content.command_ref.command_id,
        content.command_ref.idempotency_key,
        content.command_ref.command_name,
        content.command_ref.command_fingerprint,
        prior.revision,
        prior.content_hash,
        prior.record_hash,
        prior.status,
        resulting.revision,
        resulting.content_hash,
        resulting.record_hash,
        resulting.status,
        event.event_id,
        event.event_position,
        event.stream_revision,
        event.event_type,
        event.record_hash,
        content.recovery.inverse_command_name,
        receipt.content_hash,
        receipt.recorded_at,
        canonicalHash(receipt),
        JSON.stringify(receipt),
      ],
    );
  }

  #readReceipt(row: PayloadRow): PetraProjectSourceLifecycleReceipt {
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
        "A stored ProjectSource lifecycle receipt does not match its canonical hashes.",
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

  #error(
    code: ConstructorParameters<typeof ProjectSourceLifecycleAuthorityError>[0],
    message: string,
  ): ProjectSourceLifecycleAuthorityError {
    return new ProjectSourceLifecycleAuthorityError(code, message);
  }

  #corrupt(message: string): ProjectSourceLifecycleAuthorityError {
    return this.#error(
      "PROJECT_SOURCE_LIFECYCLE_STORED_RECORD_CORRUPT",
      message,
    );
  }
}
