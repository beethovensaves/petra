import { createHash } from "node:crypto";

import type {
  PetraContextPacket,
  PetraDomainEventRecord,
  PetraEvidencePacket,
  PetraGroundedResponse,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  deriveGroundedResponseInvalidation,
  type GroundedResponseAuthorityRepository,
  GroundedResponseError,
  InMemoryGroundedResponseRegistry,
  type InMemoryContextPacketRegistry,
  type RegisterGroundedResponseInput,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type GroundedResponsePersistenceErrorCode =
  | "GROUNDED_RESPONSE_PERSISTENCE_ID_CONFLICT"
  | "GROUNDED_RESPONSE_PERSISTENCE_CACHE_CONFLICT"
  | "GROUNDED_RESPONSE_PERSISTENCE_PACKET_CONFLICT"
  | "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISSING"
  | "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISMATCH"
  | "GROUNDED_RESPONSE_PERSISTENCE_EVENT_MISSING"
  | "GROUNDED_RESPONSE_PERSISTENCE_EVENT_CONFLICT";

export class GroundedResponsePersistenceError extends Error {
  readonly code: GroundedResponsePersistenceErrorCode;

  constructor(code: GroundedResponsePersistenceErrorCode, message: string) {
    super(message);
    this.name = "GroundedResponsePersistenceError";
    this.code = code;
  }
}

interface PayloadRow {
  payload: unknown;
}

interface RecordRow extends PayloadRow {
  record_hash: string;
}

interface ProcessedEventRow {
  event_hash: string;
  affected_response_count: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const asResponse = (value: unknown): PetraGroundedResponse =>
  clone(value) as PetraGroundedResponse;

const asContext = (value: unknown): PetraContextPacket =>
  clone(value) as PetraContextPacket;

const asEvidence = (value: unknown): PetraEvidencePacket =>
  clone(value) as PetraEvidencePacket;

export class PostgresGroundedResponseAuthorityRepository implements GroundedResponseAuthorityRepository {
  readonly #pool: Pool;
  readonly #packets: InMemoryContextPacketRegistry;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    packets: InMemoryContextPacketRegistry,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#packets = packets;
    this.#contracts = contracts;
  }

  async register(
    input: RegisterGroundedResponseInput,
  ): Promise<PetraGroundedResponse> {
    const validated = new InMemoryGroundedResponseRegistry(
      this.#packets,
      this.#contracts,
    ).register(clone(input));
    const response = asResponse(validated);
    const context = this.#packets.getContextPacket(
      response.content.context_packet_ref.context_packet_id,
    );
    const evidence = this.#packets.getEvidencePacket(
      response.content.evidence_packet_ref.evidence_packet_id,
    );
    if (context === undefined || evidence === undefined) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_CONTEXT_MISSING",
        "Validated packet authority disappeared before persistence.",
      );
    }

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `grounded-response-project:${response.project_id}`,
        `grounded-response:${response.grounded_response_id}`,
        `grounded-response-cache:${response.content.cache.cache_key}`,
      ]);
      const existing = await client.query<PayloadRow>(
        `SELECT payload
           FROM petra.grounded_response_revisions
          WHERE grounded_response_id = $1 AND revision = 1`,
        [response.grounded_response_id],
      );
      if (existing.rows[0] !== undefined) {
        const stored = asResponse(existing.rows[0].payload);
        if (!same(stored, response)) {
          throw new GroundedResponsePersistenceError(
            "GROUNDED_RESPONSE_PERSISTENCE_ID_CONFLICT",
            "The GroundedResponse ID is already bound to a different root.",
          );
        }
        return stored;
      }
      const cacheOwner = await client.query<{ grounded_response_id: string }>(
        `SELECT grounded_response_id
           FROM petra.grounded_responses
          WHERE cache_key = $1`,
        [response.content.cache.cache_key],
      );
      if (cacheOwner.rows[0] !== undefined) {
        throw new GroundedResponsePersistenceError(
          "GROUNDED_RESPONSE_PERSISTENCE_CACHE_CONFLICT",
          "The exact cache key is already owned by another GroundedResponse.",
        );
      }

      await this.#persistContextPacket(client, asContext(context));
      await this.#persistEvidencePacket(client, asEvidence(evidence));
      await this.#requireUpstreamRecords(client, input);
      await this.#insertHead(client, response);
      await this.#insertRevision(client, response);
      return response;
    });
  }

  async get(
    groundedResponseId: string,
  ): Promise<PetraGroundedResponse | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.grounded_responses AS head
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = head.grounded_response_id
          AND revision.revision = head.current_revision
        WHERE head.grounded_response_id = $1`,
      [groundedResponseId],
    );
    return result.rows[0] === undefined
      ? undefined
      : asResponse(result.rows[0].payload);
  }

  async getRevision(
    groundedResponseId: string,
    revision: number,
  ): Promise<PetraGroundedResponse | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.grounded_response_revisions
        WHERE grounded_response_id = $1 AND revision = $2`,
      [groundedResponseId, revision],
    );
    return result.rows[0] === undefined
      ? undefined
      : asResponse(result.rows[0].payload);
  }

  async getReusableByCacheKey(
    cacheKey: string,
  ): Promise<PetraGroundedResponse | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.grounded_responses AS head
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = head.grounded_response_id
          AND revision.revision = head.current_revision
        WHERE head.cache_key = $1
          AND revision.cache_state = 'reusable'`,
      [cacheKey],
    );
    return result.rows[0] === undefined
      ? undefined
      : asResponse(result.rows[0].payload);
  }

  async invalidateByAuthorityEvent(
    event: PetraDomainEventRecord,
  ): Promise<readonly PetraGroundedResponse[]> {
    this.#contracts.assertValid("domain-event", event.schema_version, event);
    if (
      event.event.event_type !== "change_set.applied" &&
      event.event.event_type !== "change_set.reverted"
    ) {
      return [];
    }
    const authorityChange = event.event;
    const affectedIds = [
      authorityChange.payload.claim.claim_id,
      authorityChange.payload.assertion.assertion_id,
    ];
    const eventHash = canonicalHash(event);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `grounded-response-project:${event.project_id}`,
        `grounded-response-event:${event.event_id}`,
      ]);
      const processed = await client.query<ProcessedEventRow>(
        `SELECT event_hash, affected_response_count
           FROM petra.grounded_response_authority_events
          WHERE event_id = $1`,
        [event.event_id],
      );
      if (processed.rows[0] !== undefined) {
        if (processed.rows[0].event_hash !== eventHash) {
          throw new GroundedResponsePersistenceError(
            "GROUNDED_RESPONSE_PERSISTENCE_EVENT_CONFLICT",
            "The authority event ID was already processed with different content.",
          );
        }
        return this.#responsesInvalidatedBy(client, event.event_id);
      }

      await this.#requireAuthorityEvent(client, event, eventHash);
      const candidates = await client.query<PayloadRow>(
        `SELECT revision.payload
           FROM petra.grounded_responses AS head
           JOIN petra.grounded_response_revisions AS revision
             ON revision.grounded_response_id = head.grounded_response_id
            AND revision.revision = head.current_revision
          WHERE head.project_id = $1
            AND head.snapshot_event_position < $2
            AND EXISTS (
              SELECT 1
                FROM petra.grounded_response_dependencies AS dependency
               WHERE dependency.grounded_response_id = head.grounded_response_id
                 AND dependency.response_revision = head.current_revision
                 AND dependency.object_id = ANY($3::text[])
            )
          ORDER BY head.grounded_response_id
          FOR UPDATE OF head`,
        [event.project_id, event.event_position, affectedIds],
      );
      const revisions = candidates.rows
        .map((row) =>
          deriveGroundedResponseInvalidation(asResponse(row.payload), event),
        )
        .filter((value): value is PetraGroundedResponse => value !== undefined);
      for (const revision of revisions) {
        this.#contracts.assertValid(
          "grounded-response",
          revision.schema_version,
          revision,
        );
      }

      await client.query(
        `INSERT INTO petra.grounded_response_authority_events (
           event_id, project_id, event_position, event_type, event_hash,
           processed_at, affected_response_count
         ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7)`,
        [
          event.event_id,
          event.project_id,
          event.event_position,
          event.event.event_type,
          eventHash,
          event.recorded_at,
          revisions.length,
        ],
      );
      for (const revision of revisions) {
        await this.#insertRevision(client, revision);
        const advanced = await client.query(
          `UPDATE petra.grounded_responses
              SET current_revision = $2
            WHERE grounded_response_id = $1
              AND current_revision = $2 - 1`,
          [revision.grounded_response_id, revision.revision],
        );
        if (advanced.rowCount !== 1) {
          throw new GroundedResponsePersistenceError(
            "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISMATCH",
            "The GroundedResponse head changed before invalidation committed.",
          );
        }
      }
      return revisions.map(clone);
    });
  }

  async #persistContextPacket(
    client: PoolClient,
    packet: PetraContextPacket,
  ): Promise<void> {
    const existing = await client.query<RecordRow>(
      `SELECT record_hash, payload
         FROM petra.context_packets
        WHERE context_packet_id = $1`,
      [packet.context_packet_id],
    );
    if (existing.rows[0] !== undefined) {
      if (!same(existing.rows[0].payload, packet)) {
        throw new GroundedResponsePersistenceError(
          "GROUNDED_RESPONSE_PERSISTENCE_PACKET_CONFLICT",
          "The ContextPacket ID is already bound to different content.",
        );
      }
      return;
    }
    await client.query(
      `INSERT INTO petra.context_packets (
         context_packet_id, revision, project_id, snapshot_id,
         snapshot_revision, snapshot_event_position, snapshot_hash,
         content_hash, compiled_by_actor_id, compiled_by_actor_kind,
         compiled_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11::timestamptz, $12, $13::jsonb
       )`,
      [
        packet.context_packet_id,
        packet.revision,
        packet.project_id,
        packet.snapshot_ref.snapshot_id,
        packet.snapshot_ref.snapshot_revision,
        packet.snapshot_ref.event_position,
        packet.snapshot_ref.content_hash,
        packet.content_hash,
        packet.compiled_by.actor_id,
        packet.compiled_by.actor_kind,
        packet.compiled_at,
        canonicalHash(packet),
        JSON.stringify(packet),
      ],
    );
  }

  async #persistEvidencePacket(
    client: PoolClient,
    packet: PetraEvidencePacket,
  ): Promise<void> {
    const existing = await client.query<RecordRow>(
      `SELECT record_hash, payload
         FROM petra.evidence_packets
        WHERE evidence_packet_id = $1`,
      [packet.evidence_packet_id],
    );
    if (existing.rows[0] !== undefined) {
      if (!same(existing.rows[0].payload, packet)) {
        throw new GroundedResponsePersistenceError(
          "GROUNDED_RESPONSE_PERSISTENCE_PACKET_CONFLICT",
          "The EvidencePacket ID is already bound to different content.",
        );
      }
      return;
    }
    await client.query(
      `INSERT INTO petra.evidence_packets (
         evidence_packet_id, revision, project_id, context_packet_id,
         context_packet_hash, snapshot_id, snapshot_revision,
         snapshot_event_position, snapshot_hash, content_hash,
         compiled_by_actor_id, compiled_by_actor_kind, compiled_at,
         record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13::timestamptz, $14, $15::jsonb
       )`,
      [
        packet.evidence_packet_id,
        packet.revision,
        packet.project_id,
        packet.content.context_packet_ref.context_packet_id,
        packet.content.context_packet_ref.content_hash,
        packet.snapshot_ref.snapshot_id,
        packet.snapshot_ref.snapshot_revision,
        packet.snapshot_ref.event_position,
        packet.snapshot_ref.content_hash,
        packet.content_hash,
        packet.compiled_by.actor_id,
        packet.compiled_by.actor_kind,
        packet.compiled_at,
        canonicalHash(packet),
        JSON.stringify(packet),
      ],
    );
  }

  async #requireUpstreamRecords(
    client: PoolClient,
    input: RegisterGroundedResponseInput,
  ): Promise<void> {
    const { response } = input;
    await this.#requireExactPayload(
      client,
      "artifacts",
      "artifact_id",
      input.responseArtifact.artifact_id,
      input.responseArtifact,
    );
    await this.#requireExactPayload(
      client,
      "model_requests",
      "model_request_id",
      input.modelRequest.model_request_id,
      input.modelRequest,
    );
    await this.#requireExactPayload(
      client,
      "model_calls",
      "model_call_id",
      input.modelCall.model_call_id,
      input.modelCall,
    );
    await this.#requireExactPayload(
      client,
      "interaction_run_revisions",
      "interaction_run_id",
      input.interactionRun.interaction_run_id,
      input.interactionRun,
      "revision",
      input.interactionRun.revision,
    );
    await this.#requireExactPayload(
      client,
      "work_unit_revisions",
      "work_unit_id",
      input.workUnit.work_unit_id,
      input.workUnit,
      "revision",
      input.workUnit.revision,
    );
    const certification = await client.query<{ model_deployment_id: string }>(
      `SELECT model_deployment_id
         FROM petra.model_role_certifications
        WHERE role_certification_id = $1
          AND role = 'synthesist'`,
      [response.content.execution_ref.role_certification_id],
    );
    if (certification.rows[0] === undefined) {
      throw new GroundedResponsePersistenceError(
        "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISSING",
        "The selected synthesist certification is not persisted.",
      );
    }
    if (
      certification.rows[0].model_deployment_id !==
      response.content.execution_ref.model_deployment_id
    ) {
      throw new GroundedResponsePersistenceError(
        "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISMATCH",
        "The persisted certification does not identify the selected deployment.",
      );
    }
  }

  async #requireExactPayload(
    client: PoolClient,
    table: string,
    idColumn: string,
    id: string,
    expected: unknown,
    revisionColumn?: string,
    revision?: number,
  ): Promise<void> {
    const result = await client.query<PayloadRow>(
      `SELECT payload FROM petra.${table}
        WHERE ${idColumn} = $1${
          revisionColumn === undefined ? "" : ` AND ${revisionColumn} = $2`
        }`,
      revisionColumn === undefined ? [id] : [id, revision],
    );
    if (result.rows[0] === undefined) {
      throw new GroundedResponsePersistenceError(
        "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISSING",
        `Required persisted record ${id} is missing.`,
      );
    }
    if (!same(result.rows[0].payload, expected)) {
      throw new GroundedResponsePersistenceError(
        "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISMATCH",
        `Persisted record ${id} differs from the terminal binding.`,
      );
    }
  }

  async #insertHead(
    client: PoolClient,
    response: PetraGroundedResponse,
  ): Promise<void> {
    const content = response.content;
    await client.query(
      `INSERT INTO petra.grounded_responses (
         grounded_response_id, project_id, current_revision, cache_key,
         response_artifact_id, response_artifact_hash,
         response_artifact_byte_size, response_artifact_media_type,
         context_packet_id, context_packet_hash, evidence_packet_id,
         evidence_packet_hash, snapshot_id, snapshot_revision,
         snapshot_event_position, snapshot_hash, model_request_id,
         model_call_id, model_deployment_id, role_certification_id,
         interaction_run_id, interaction_run_revision, interaction_run_hash,
         work_unit_id, work_unit_revision, work_unit_spec_hash,
         model_output_hash, terminal_persisted_at, created_at
       ) VALUES (
         $1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19,
         $20, $21, $22, $23, $24, $25, $26,
         $27::timestamptz, $28::timestamptz
       )`,
      [
        response.grounded_response_id,
        response.project_id,
        content.cache.cache_key,
        content.response_artifact_ref.artifact_id,
        content.response_artifact_ref.content_hash,
        content.response_artifact_ref.byte_size,
        content.response_artifact_ref.media_type,
        content.context_packet_ref.context_packet_id,
        content.context_packet_ref.content_hash,
        content.evidence_packet_ref.evidence_packet_id,
        content.evidence_packet_ref.content_hash,
        content.snapshot_ref.snapshot_id,
        content.snapshot_ref.snapshot_revision,
        content.snapshot_ref.event_position,
        content.snapshot_ref.content_hash,
        content.execution_ref.model_request_id,
        content.execution_ref.model_call_id,
        content.execution_ref.model_deployment_id,
        content.execution_ref.role_certification_id,
        content.interaction_ref.interaction_run_ref.interaction_run_id,
        content.interaction_ref.interaction_run_ref.revision,
        content.interaction_ref.interaction_run_ref.content_hash,
        content.interaction_ref.work_unit_ref.work_unit_id,
        content.interaction_ref.work_unit_ref.revision,
        content.interaction_ref.work_unit_ref.spec_hash,
        content.model_output_hash,
        content.terminal.persisted_at,
        response.recorded_at,
      ],
    );
  }

  async #insertRevision(
    client: PoolClient,
    response: PetraGroundedResponse,
  ): Promise<void> {
    const parent =
      response.lineage.lineage_kind === "revision"
        ? response.lineage
        : undefined;
    await client.query(
      `INSERT INTO petra.grounded_response_revisions (
         grounded_response_id, revision, project_id, content_hash,
         parent_revision, parent_hash, cache_state, cache_key,
         cache_checked_at, terminal_persisted_at, recorded_by_actor_id,
         recorded_by_actor_kind, recorded_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz,
         $10::timestamptz, $11, $12, $13::timestamptz, $14, $15::jsonb
       )`,
      [
        response.grounded_response_id,
        response.revision,
        response.project_id,
        response.content_hash,
        parent?.parent_revision ?? null,
        parent?.parent_hash ?? null,
        response.content.cache.state,
        response.content.cache.cache_key,
        response.content.cache.checked_at,
        response.content.terminal.persisted_at,
        response.recorded_by.actor_id,
        response.recorded_by.actor_kind,
        response.recorded_at,
        canonicalHash(response),
        JSON.stringify(response),
      ],
    );
    for (const [index, dependency] of response.content.dependencies.entries()) {
      await client.query(
        `INSERT INTO petra.grounded_response_dependencies (
           grounded_response_id, response_revision, position,
           dependency_role, object_kind, object_id, object_revision,
           object_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          response.grounded_response_id,
          response.revision,
          index + 1,
          dependency.dependency_role,
          dependency.object_ref.object_kind,
          dependency.object_ref.object_id,
          dependency.object_ref.object_revision,
          dependency.object_ref.object_hash,
        ],
      );
    }
    if (response.content.cache.state === "invalidated") {
      for (const [
        index,
        cause,
      ] of response.content.cache.invalidated_by.entries()) {
        await client.query(
          `INSERT INTO petra.grounded_response_invalidation_causes (
             grounded_response_id, response_revision, position, event_id,
             event_type, change_set_id
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            response.grounded_response_id,
            response.revision,
            index + 1,
            cause.event_id,
            cause.event_type,
            cause.change_set_id,
          ],
        );
      }
    }
  }

  async #requireAuthorityEvent(
    client: PoolClient,
    event: PetraDomainEventRecord,
    eventHash: string,
  ): Promise<void> {
    const result = await client.query<RecordRow>(
      `SELECT record_hash, payload
         FROM petra.domain_events
        WHERE event_id = $1`,
      [event.event_id],
    );
    if (result.rows[0] === undefined) {
      throw new GroundedResponsePersistenceError(
        "GROUNDED_RESPONSE_PERSISTENCE_EVENT_MISSING",
        "An invalidation event must already exist in the authority ledger.",
      );
    }
    if (
      result.rows[0].record_hash !== eventHash ||
      !same(result.rows[0].payload, event)
    ) {
      throw new GroundedResponsePersistenceError(
        "GROUNDED_RESPONSE_PERSISTENCE_EVENT_CONFLICT",
        "The supplied event differs from the immutable authority-ledger event.",
      );
    }
  }

  async #responsesInvalidatedBy(
    client: PoolClient,
    eventId: string,
  ): Promise<PetraGroundedResponse[]> {
    const result = await client.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.grounded_response_invalidation_causes AS cause
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = cause.grounded_response_id
          AND revision.revision = cause.response_revision
        WHERE cause.event_id = $1
        ORDER BY cause.grounded_response_id`,
      [eventId],
    );
    return result.rows.map((row) => asResponse(row.payload));
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
