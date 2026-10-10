import { createHash } from "node:crypto";

import type {
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionReplayRecord,
  PetraInteractionRun,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  InMemoryInteractionRecordRegistry,
  InteractionRecordError,
  type InteractionAuthorityRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

interface PayloadRow {
  payload: unknown;
}

interface RecordRow extends PayloadRow {
  record_hash: string;
}

interface ConnectionRow {
  interaction_run_id: string;
  current_attempt: number;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const asRun = (value: unknown): PetraInteractionRun =>
  clone(value) as PetraInteractionRun;

const asEvent = (value: unknown): PetraInteractionEventRecord =>
  clone(value) as PetraInteractionEventRecord;

const asInterrupt = (value: unknown): PetraInteractionInterrupt =>
  clone(value) as PetraInteractionInterrupt;

const asReplay = (value: unknown): PetraInteractionReplayRecord =>
  clone(value) as PetraInteractionReplayRecord;

export class PostgresInteractionAuthorityRepository implements InteractionAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #transactionClient: PoolClient | undefined;

  constructor(
    pool: Pool,
    contracts = new PetraContractRegistry(),
    transactionClient?: PoolClient,
  ) {
    this.#pool = pool;
    this.#contracts = contracts;
    this.#transactionClient = transactionClient;
  }

  /** The caller owns commit/rollback; canonical validations still run. */
  inTransaction(client: PoolClient): PostgresInteractionAuthorityRepository {
    return new PostgresInteractionAuthorityRepository(
      this.#pool,
      this.#contracts,
      client,
    );
  }

  async registerFeatureManifest(
    manifest: PetraInteractionFeatureManifest,
  ): Promise<PetraInteractionFeatureManifest> {
    this.#contracts.assertValid(
      "interaction-feature-manifest",
      "1.0.0",
      manifest,
    );
    new InMemoryInteractionRecordRegistry().registerFeatureManifest(
      clone(manifest),
    );
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `interaction-feature:${manifest.interaction_feature_manifest_id}`,
      ]);
      const existing = await this.#recordById(
        client,
        "interaction_feature_manifests",
        "interaction_feature_manifest_id",
        manifest.interaction_feature_manifest_id,
      );
      if (existing !== undefined) {
        return this.#exactReplay(
          existing,
          manifest,
          "The InteractionFeatureManifest ID is already bound to different content.",
          (payload) => this.#readFeature(payload),
        );
      }
      await client.query(
        `INSERT INTO petra.interaction_feature_manifests (
           interaction_feature_manifest_id, revision, protocol_name,
           sdk_version, profile_version, content_hash,
           compiled_by_actor_id, compiled_by_actor_kind, compiled_at,
           record_hash, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz,
                   $10, $11::jsonb)`,
        [
          manifest.interaction_feature_manifest_id,
          manifest.revision,
          manifest.content.protocol.name,
          manifest.content.protocol.sdk_version,
          manifest.content.protocol.profile_version,
          manifest.content_hash,
          manifest.compiled_by.actor_id,
          manifest.compiled_by.actor_kind,
          manifest.compiled_at,
          canonicalHash(manifest),
          JSON.stringify(manifest),
        ],
      );
      for (const [
        position,
        eventType,
      ] of manifest.content.standard_events.entries()) {
        await client.query(
          `INSERT INTO petra.interaction_feature_standard_events (
             interaction_feature_manifest_id, position, event_type
           ) VALUES ($1, $2, $3)`,
          [manifest.interaction_feature_manifest_id, position + 1, eventType],
        );
      }
      for (const [
        position,
        registration,
      ] of manifest.content.custom_events.entries()) {
        await client.query(
          `INSERT INTO petra.interaction_feature_custom_events (
             interaction_feature_manifest_id, position, event_name,
             schema_name, schema_version, schema_hash, json_pointer,
             stability, authority_effect, registration
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
          [
            manifest.interaction_feature_manifest_id,
            position + 1,
            registration.event_name,
            registration.payload_schema_ref.schema_name,
            registration.payload_schema_ref.schema_version,
            registration.payload_schema_ref.content_hash,
            registration.payload_schema_ref.json_pointer ?? null,
            registration.stability,
            registration.authority_effect,
            JSON.stringify(registration),
          ],
        );
      }
      return clone(manifest);
    });
  }

  async getFeatureManifest(
    interactionFeatureManifestId: string,
  ): Promise<PetraInteractionFeatureManifest | undefined> {
    const row = await this.#recordById(
      this.#transactionClient ?? this.#pool,
      "interaction_feature_manifests",
      "interaction_feature_manifest_id",
      interactionFeatureManifestId,
    );
    return row === undefined ? undefined : this.#readFeature(row.payload);
  }

  async registerRun(run: PetraInteractionRun): Promise<PetraInteractionRun> {
    this.#contracts.assertValid("interaction-run", "1.0.0", run);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `interaction-run:${run.interaction_run_id}`,
        `interaction-protocol:${run.content.correlation.protocol_thread_id}:${run.content.correlation.protocol_run_id}`,
        `interaction-feature:${run.feature_manifest_ref.interaction_feature_manifest_id}`,
      ]);
      const existing = await client.query<RecordRow>(
        `SELECT record_hash, payload
           FROM petra.interaction_run_revisions
          WHERE interaction_run_id = $1 AND revision = $2`,
        [run.interaction_run_id, run.revision],
      );
      if (existing.rows[0] !== undefined) {
        return this.#exactReplay(
          existing.rows[0],
          run,
          "The InteractionRun revision is already bound to different content.",
          (payload) => this.#readRun(payload),
        );
      }

      const registry = await this.#validationContext(
        client,
        run.feature_manifest_ref.interaction_feature_manifest_id,
        run.interaction_run_id,
      );
      const validated = asRun(registry.registerRun(clone(run)));
      if (run.revision === 1) await this.#insertRunHead(client, run);
      await this.#insertRunRevision(client, run);
      if (run.revision > 1) {
        const advanced = await client.query(
          `UPDATE petra.interaction_runs
              SET current_revision = $2
            WHERE interaction_run_id = $1 AND current_revision = $2 - 1`,
          [run.interaction_run_id, run.revision],
        );
        if (advanced.rowCount !== 1) {
          throw new InteractionRecordError(
            "INTERACTION_RUN_LINEAGE_INVALID",
            "The InteractionRun head changed before its revision could commit.",
          );
        }
      }
      return validated;
    });
  }

  getRun(interactionRunId: string): Promise<PetraInteractionRun | undefined> {
    return this.#getCurrentRun(
      this.#transactionClient ?? this.#pool,
      interactionRunId,
    );
  }

  async getRunByProtocolCorrelation(
    protocolThreadId: string,
    protocolRunId: string,
  ): Promise<PetraInteractionRun | undefined> {
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.interaction_runs AS head
         JOIN petra.interaction_run_revisions AS revision
           ON revision.interaction_run_id = head.interaction_run_id
          AND revision.revision = head.current_revision
        WHERE head.protocol_thread_id = $1 AND head.protocol_run_id = $2`,
      [protocolThreadId, protocolRunId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#readRun(result.rows[0].payload);
  }

  async getRunRevision(
    interactionRunId: string,
    revision: number,
  ): Promise<PetraInteractionRun | undefined> {
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<PayloadRow>(
      `SELECT payload FROM petra.interaction_run_revisions
        WHERE interaction_run_id = $1 AND revision = $2`,
      [interactionRunId, revision],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#readRun(result.rows[0].payload);
  }

  async appendEvent(
    event: PetraInteractionEventRecord,
  ): Promise<PetraInteractionEventRecord> {
    this.#contracts.assertValid("interaction-event-record", "1.0.0", event);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `interaction-run:${event.interaction_run_ref.interaction_run_id}`,
        `interaction-event:${event.interaction_event_record_id}`,
      ]);
      const existing = await this.#recordById(
        client,
        "interaction_event_records",
        "interaction_event_record_id",
        event.interaction_event_record_id,
      );
      if (existing !== undefined) {
        return this.#exactReplay(
          existing,
          event,
          "The InteractionEventRecord ID is already bound to different content.",
          (payload) => this.#readEvent(payload),
        );
      }
      const head = await this.#requireRunHead(
        client,
        event.interaction_run_ref.interaction_run_id,
      );
      const registry = await this.#rehydrate(client, head.interaction_run_id);
      const validated = asEvent(registry.appendEvent(clone(event)));
      await this.#insertEvent(client, event);
      return validated;
    });
  }

  async getEvent(
    interactionEventRecordId: string,
  ): Promise<PetraInteractionEventRecord | undefined> {
    const row = await this.#recordById(
      this.#transactionClient ?? this.#pool,
      "interaction_event_records",
      "interaction_event_record_id",
      interactionEventRecordId,
    );
    return row === undefined ? undefined : this.#readEvent(row.payload);
  }

  async listEvents(
    interactionRunId: string,
    afterSequence = 0,
    limit = 1000,
  ): Promise<PetraInteractionEventRecord[]> {
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
      throw new RangeError(
        "afterSequence must be a non-negative safe integer.",
      );
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10_000) {
      throw new RangeError("limit must be a safe integer between 1 and 10000.");
    }
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<PayloadRow>(
      `SELECT payload FROM petra.interaction_event_records
        WHERE interaction_run_id = $1 AND sequence > $2
        ORDER BY sequence
        LIMIT $3`,
      [interactionRunId, afterSequence, limit],
    );
    return result.rows.map((row) => this.#readEvent(row.payload));
  }

  async registerInterrupt(
    interrupt: PetraInteractionInterrupt,
  ): Promise<PetraInteractionInterrupt> {
    this.#contracts.assertValid("interaction-interrupt", "1.0.0", interrupt);
    return this.#transaction(async (client) => {
      const commandId =
        interrupt.content.state === "responded"
          ? interrupt.content.resulting_command_ref.command_id
          : undefined;
      await this.#lock(client, [
        `interaction-run:${interrupt.interaction_run_ref.interaction_run_id}`,
        `interaction-interrupt:${interrupt.interaction_interrupt_id}`,
        ...(commandId === undefined
          ? []
          : [`interaction-command-response:${commandId}`]),
      ]);
      const existing = await client.query<RecordRow>(
        `SELECT record_hash, payload
           FROM petra.interaction_interrupt_revisions
          WHERE interaction_interrupt_id = $1 AND revision = $2`,
        [interrupt.interaction_interrupt_id, interrupt.revision],
      );
      if (existing.rows[0] !== undefined) {
        return this.#exactReplay(
          existing.rows[0],
          interrupt,
          "The InteractionInterrupt revision is already bound to different content.",
          (payload) => this.#readInterrupt(payload),
        );
      }
      const head = await this.#requireRunHead(
        client,
        interrupt.interaction_run_ref.interaction_run_id,
      );
      const registry = await this.#rehydrate(client, head.interaction_run_id);
      const validated = asInterrupt(
        registry.registerInterrupt(clone(interrupt)),
      );
      if (interrupt.revision === 1) {
        await this.#insertInterruptHead(client, interrupt);
      }
      await this.#insertInterruptRevision(client, interrupt);
      if (interrupt.revision > 1) {
        const advanced = await client.query(
          `UPDATE petra.interaction_interrupts
              SET current_revision = $2
            WHERE interaction_interrupt_id = $1
              AND current_revision = $2 - 1`,
          [interrupt.interaction_interrupt_id, interrupt.revision],
        );
        if (advanced.rowCount !== 1) {
          throw new InteractionRecordError(
            "INTERACTION_INTERRUPT_LINEAGE_INVALID",
            "The InteractionInterrupt head changed before its revision could commit.",
          );
        }
      }
      return validated;
    });
  }

  async getInterrupt(
    interactionInterruptId: string,
  ): Promise<PetraInteractionInterrupt | undefined> {
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.interaction_interrupts AS head
         JOIN petra.interaction_interrupt_revisions AS revision
           ON revision.interaction_interrupt_id = head.interaction_interrupt_id
          AND revision.revision = head.current_revision
        WHERE head.interaction_interrupt_id = $1`,
      [interactionInterruptId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#readInterrupt(result.rows[0].payload);
  }

  async getInterruptRevision(
    interactionInterruptId: string,
    revision: number,
  ): Promise<PetraInteractionInterrupt | undefined> {
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<PayloadRow>(
      `SELECT payload FROM petra.interaction_interrupt_revisions
        WHERE interaction_interrupt_id = $1 AND revision = $2`,
      [interactionInterruptId, revision],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#readInterrupt(result.rows[0].payload);
  }

  async registerReplay(
    replay: PetraInteractionReplayRecord,
  ): Promise<PetraInteractionReplayRecord> {
    this.#contracts.assertValid("interaction-replay-record", "1.0.0", replay);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `interaction-run:${replay.interaction_run_ref.interaction_run_id}`,
        `interaction-connection:${replay.content.connection_id}`,
        `interaction-replay:${replay.interaction_replay_record_id}`,
      ]);
      const existing = await this.#recordById(
        client,
        "interaction_replay_records",
        "interaction_replay_record_id",
        replay.interaction_replay_record_id,
      );
      if (existing !== undefined) {
        return this.#exactReplay(
          existing,
          replay,
          "The InteractionReplayRecord ID is already bound to different content.",
          (payload) => this.#readReplay(payload),
        );
      }
      const head = await this.#requireRunHead(
        client,
        replay.interaction_run_ref.interaction_run_id,
      );
      const registry = await this.#rehydrate(client, head.interaction_run_id);
      const validated = asReplay(registry.registerReplay(clone(replay)));

      const connection = await client.query<ConnectionRow>(
        `SELECT interaction_run_id, current_attempt
           FROM petra.interaction_connections
          WHERE connection_id = $1 FOR UPDATE`,
        [replay.content.connection_id],
      );
      if (connection.rows[0] === undefined) {
        await client.query(
          `INSERT INTO petra.interaction_connections (
             connection_id, interaction_run_id, project_id, current_attempt
           ) VALUES ($1, $2, $3, $4)`,
          [
            replay.content.connection_id,
            replay.interaction_run_ref.interaction_run_id,
            replay.project_id,
            replay.content.attempt,
          ],
        );
      } else {
        if (
          connection.rows[0].interaction_run_id !==
          replay.interaction_run_ref.interaction_run_id
        ) {
          throw new InteractionRecordError(
            "INTERACTION_REPLAY_REFERENCE_MISMATCH",
            "A connection identity cannot be rebound to another interaction run.",
          );
        }
        const advanced = await client.query(
          `UPDATE petra.interaction_connections
              SET current_attempt = $2
            WHERE connection_id = $1 AND current_attempt = $2 - 1`,
          [replay.content.connection_id, replay.content.attempt],
        );
        if (advanced.rowCount !== 1) {
          throw new InteractionRecordError(
            "INTERACTION_REPLAY_ATTEMPT_INVALID",
            "Replay attempts must advance exactly once per connection.",
          );
        }
      }
      await this.#insertReplay(client, replay);
      return validated;
    });
  }

  async getReplay(
    interactionReplayRecordId: string,
  ): Promise<PetraInteractionReplayRecord | undefined> {
    const row = await this.#recordById(
      this.#transactionClient ?? this.#pool,
      "interaction_replay_records",
      "interaction_replay_record_id",
      interactionReplayRecordId,
    );
    return row === undefined ? undefined : this.#readReplay(row.payload);
  }

  async getConnectionAttempt(connectionId: string): Promise<number> {
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<ConnectionRow>(
      `SELECT interaction_run_id, current_attempt
         FROM petra.interaction_connections
        WHERE connection_id = $1`,
      [connectionId],
    );
    return result.rows[0]?.current_attempt ?? 0;
  }

  async #insertRunHead(client: PoolClient, run: PetraInteractionRun) {
    const correlation = run.content.correlation;
    const authority = run.content.authority_context;
    await client.query(
      `INSERT INTO petra.interaction_runs (
         interaction_run_id, project_id, current_revision,
         feature_manifest_id, feature_manifest_revision, feature_manifest_hash,
         protocol_thread_id, protocol_run_id, request_id, trace_id,
         work_unit_id, work_unit_revision, work_unit_spec_hash,
         model_request_id, agent_run_id, authority_actor_id,
         authority_actor_kind, capability_grant_id, privacy_profile_id,
         privacy_profile_revision, privacy_profile_hash, budget_profile_id,
         budget_profile_revision, budget_profile_hash, input_hash,
         source_message_id, created_by_actor_id, created_by_actor_kind, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
                 $23, $24, $25, $26, $27, $28, $29::timestamptz)`,
      [
        run.interaction_run_id,
        run.project_id,
        run.revision,
        run.feature_manifest_ref.interaction_feature_manifest_id,
        run.feature_manifest_ref.revision,
        run.feature_manifest_ref.content_hash,
        correlation.protocol_thread_id,
        correlation.protocol_run_id,
        correlation.request_id,
        correlation.trace_id,
        correlation.work_unit_ref.work_unit_id,
        correlation.work_unit_ref.revision,
        correlation.work_unit_ref.spec_hash,
        correlation.model_request_id ?? null,
        correlation.agent_run_id ?? null,
        authority.actor.actor_id,
        authority.actor.actor_kind,
        authority.capability_grant_id,
        authority.privacy_profile_ref.record_id,
        authority.privacy_profile_ref.revision,
        authority.privacy_profile_ref.content_hash,
        authority.budget_profile_ref.record_id,
        authority.budget_profile_ref.revision,
        authority.budget_profile_ref.content_hash,
        run.content.input.input_hash,
        run.content.input.source_message_id,
        run.created_by.actor_id,
        run.created_by.actor_kind,
        run.created_at,
      ],
    );
  }

  async #insertRunRevision(client: PoolClient, run: PetraInteractionRun) {
    const parent = run.lineage.lineage_kind === "revision" ? run.lineage : null;
    const lifecycle = run.content.lifecycle;
    const stream = run.content.stream_head;
    await client.query(
      `INSERT INTO petra.interaction_run_revisions (
         interaction_run_id, revision, project_id, content_hash,
         parent_revision, parent_hash, lifecycle_state, started_at, ended_at,
         outcome_code, stream_state, event_count, latest_sequence,
         stream_head_hash, updated_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz,
                 $9::timestamptz, $10, $11, $12, $13, $14,
                 $15::timestamptz, $16, $17::jsonb)`,
      [
        run.interaction_run_id,
        run.revision,
        run.project_id,
        run.content_hash,
        parent?.parent_revision ?? null,
        parent?.parent_hash ?? null,
        lifecycle.state,
        lifecycle.started_at,
        "ended_at" in lifecycle ? lifecycle.ended_at : null,
        "outcome_code" in lifecycle ? lifecycle.outcome_code : null,
        stream.state,
        stream.event_count,
        "latest_sequence" in stream ? stream.latest_sequence : null,
        "head_hash" in stream ? stream.head_hash : null,
        run.updated_at,
        canonicalHash(run),
        JSON.stringify(run),
      ],
    );
    if (lifecycle.state === "awaiting_interrupt") {
      for (const [
        position,
        interactionInterruptId,
      ] of lifecycle.interaction_interrupt_ids.entries()) {
        await client.query(
          `INSERT INTO petra.interaction_run_revision_interrupts (
             interaction_run_id, revision, position, interaction_interrupt_id
           ) VALUES ($1, $2, $3, $4)`,
          [
            run.interaction_run_id,
            run.revision,
            position + 1,
            interactionInterruptId,
          ],
        );
      }
    }
  }

  async #insertEvent(client: PoolClient, event: PetraInteractionEventRecord) {
    const protocol = event.content.protocol;
    const prior =
      event.lineage.lineage_kind === "continuation" ? event.lineage : null;
    const effect = event.content.authority_effect;
    const command = effect.effect_kind === "none" ? null : effect.command_ref;
    await client.query(
      `INSERT INTO petra.interaction_event_records (
         interaction_event_record_id, revision, project_id,
         interaction_run_id, interaction_run_revision, interaction_run_hash,
         sequence, previous_event_record_id, previous_sequence,
         previous_content_hash, protocol_name, protocol_event_type,
         protocol_event_id, custom_event_name, custom_schema_name,
         custom_schema_version, custom_schema_hash, semantic_kind,
         payload_artifact_id, payload_content_hash, payload_byte_size,
         payload_media_type, audience, redaction, visibility_reason,
         authority_effect, command_id, command_idempotency_key, command_hash,
         content_hash, recorded_by_actor_id, recorded_by_actor_kind,
         recorded_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                 $12, $13, $14, $15, $16, $17, $18, $19, $20,
                 $21, $22, $23, $24, $25, $26, $27, $28, $29,
                 $30, $31, $32, $33::timestamptz, $34, $35::jsonb)`,
      [
        event.interaction_event_record_id,
        event.revision,
        event.project_id,
        event.interaction_run_ref.interaction_run_id,
        event.interaction_run_ref.revision,
        event.interaction_run_ref.content_hash,
        event.sequence,
        prior?.previous_event_record_id ?? null,
        prior?.previous_sequence ?? null,
        prior?.previous_content_hash ?? null,
        protocol.protocol,
        protocol.event_type,
        protocol.protocol_event_id ?? null,
        protocol.event_type === "CUSTOM"
          ? protocol.custom_event.event_name
          : null,
        protocol.event_type === "CUSTOM"
          ? protocol.custom_event.schema_name
          : null,
        protocol.event_type === "CUSTOM"
          ? protocol.custom_event.schema_version
          : null,
        protocol.event_type === "CUSTOM"
          ? protocol.custom_event.schema_hash
          : null,
        event.content.semantic_kind,
        event.content.payload_artifact_ref.artifact_id,
        event.content.payload_artifact_ref.content_sha256,
        event.content.payload_artifact_ref.byte_size,
        event.content.payload_artifact_ref.media_type,
        event.content.visibility.audience,
        event.content.visibility.redaction,
        event.content.visibility.reason ?? null,
        effect.effect_kind,
        command?.command_id ?? null,
        command?.idempotency_key ?? null,
        command?.command_hash ?? null,
        event.content_hash,
        event.recorded_by.actor_id,
        event.recorded_by.actor_kind,
        event.recorded_at,
        canonicalHash(event),
        JSON.stringify(event),
      ],
    );
  }

  async #insertInterruptHead(
    client: PoolClient,
    interrupt: PetraInteractionInterrupt,
  ) {
    const request = interrupt.content.request_event_ref;
    await client.query(
      `INSERT INTO petra.interaction_interrupts (
         interaction_interrupt_id, project_id, current_revision,
         interaction_run_id, interaction_run_revision, interaction_run_hash,
         request_event_record_id, request_event_sequence, request_event_hash,
         interrupt_kind, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz)`,
      [
        interrupt.interaction_interrupt_id,
        interrupt.project_id,
        interrupt.revision,
        interrupt.interaction_run_ref.interaction_run_id,
        interrupt.interaction_run_ref.revision,
        interrupt.interaction_run_ref.content_hash,
        request.interaction_event_record_id,
        request.sequence,
        request.content_hash,
        interrupt.content.interrupt_kind,
        interrupt.created_at,
      ],
    );
  }

  async #insertInterruptRevision(
    client: PoolClient,
    interrupt: PetraInteractionInterrupt,
  ) {
    const parent =
      interrupt.lineage.lineage_kind === "revision" ? interrupt.lineage : null;
    const content = interrupt.content;
    const pending = content.state === "pending" ? content : null;
    const responded = content.state === "responded" ? content : null;
    const closed = content.state === "closed_without_response" ? content : null;
    await client.query(
      `INSERT INTO petra.interaction_interrupt_revisions (
         interaction_interrupt_id, revision, project_id, content_hash,
         parent_revision, parent_hash, state, prompt_artifact_id,
         prompt_content_hash, prompt_byte_size, prompt_media_type,
         response_schema_name, response_schema_version, response_schema_hash,
         response_artifact_id, response_content_hash, response_byte_size,
         response_media_type, responded_by_actor_id, responded_by_actor_kind,
         resulting_command_id, resulting_command_idempotency_key,
         resulting_command_hash, close_reason, authority_effect,
         recorded_by_actor_id, recorded_by_actor_kind, updated_at,
         record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                 $12, $13, $14, $15, $16, $17, $18, $19, $20,
                 $21, $22, $23, $24, $25, $26, $27, $28::timestamptz,
                 $29, $30::jsonb)`,
      [
        interrupt.interaction_interrupt_id,
        interrupt.revision,
        interrupt.project_id,
        interrupt.content_hash,
        parent?.parent_revision ?? null,
        parent?.parent_hash ?? null,
        content.state,
        pending?.prompt_artifact_ref.artifact_id ?? null,
        pending?.prompt_artifact_ref.content_sha256 ?? null,
        pending?.prompt_artifact_ref.byte_size ?? null,
        pending?.prompt_artifact_ref.media_type ?? null,
        pending?.response_schema_ref.schema_name ?? null,
        pending?.response_schema_ref.schema_version ?? null,
        pending?.response_schema_ref.content_hash ?? null,
        responded?.response_artifact_ref.artifact_id ?? null,
        responded?.response_artifact_ref.content_sha256 ?? null,
        responded?.response_artifact_ref.byte_size ?? null,
        responded?.response_artifact_ref.media_type ?? null,
        responded?.responded_by.actor_id ?? null,
        responded?.responded_by.actor_kind ?? null,
        responded?.resulting_command_ref.command_id ?? null,
        responded?.resulting_command_ref.idempotency_key ?? null,
        responded?.resulting_command_ref.command_hash ?? null,
        closed?.close_reason ?? null,
        content.authority_effect,
        interrupt.recorded_by.actor_id,
        interrupt.recorded_by.actor_kind,
        interrupt.updated_at,
        canonicalHash(interrupt),
        JSON.stringify(interrupt),
      ],
    );
    for (const [position, subject] of content.subject_refs.entries()) {
      await client.query(
        `INSERT INTO petra.interaction_interrupt_subjects (
           interaction_interrupt_id, revision, position, subject_ref
         ) VALUES ($1, $2, $3, $4)`,
        [
          interrupt.interaction_interrupt_id,
          interrupt.revision,
          position + 1,
          subject,
        ],
      );
    }
  }

  async #insertReplay(
    client: PoolClient,
    replay: PetraInteractionReplayRecord,
  ) {
    const outcome = replay.content.outcome;
    await client.query(
      `INSERT INTO petra.interaction_replay_records (
         interaction_replay_record_id, revision, project_id,
         interaction_run_id, interaction_run_revision, interaction_run_hash,
         connection_id, attempt, delivery_kind, after_sequence, started_at,
         completed_at, outcome_kind, last_delivered_sequence, error_code,
         error_message, observed_work_unit_id, observed_work_unit_revision,
         observed_work_unit_status, content_hash, recorded_by_actor_id,
         recorded_by_actor_kind, recorded_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                 $11::timestamptz, $12::timestamptz, $13, $14, $15,
                 $16, $17, $18, $19, $20, $21, $22,
                 $23::timestamptz, $24, $25::jsonb)`,
      [
        replay.interaction_replay_record_id,
        replay.revision,
        replay.project_id,
        replay.interaction_run_ref.interaction_run_id,
        replay.interaction_run_ref.revision,
        replay.interaction_run_ref.content_hash,
        replay.content.connection_id,
        replay.content.attempt,
        replay.content.request.delivery_kind,
        replay.content.request.after_sequence,
        replay.content.started_at,
        replay.content.completed_at,
        outcome.outcome_kind,
        "last_delivered_sequence" in outcome
          ? outcome.last_delivered_sequence
          : null,
        outcome.outcome_kind === "write_error" ? outcome.error.code : null,
        outcome.outcome_kind === "write_error" ? outcome.error.message : null,
        replay.content.work_unit_observation.work_unit_id,
        replay.content.work_unit_observation.revision,
        replay.content.work_unit_observation.status,
        replay.content_hash,
        replay.recorded_by.actor_id,
        replay.recorded_by.actor_kind,
        replay.recorded_at,
        canonicalHash(replay),
        JSON.stringify(replay),
      ],
    );
    for (const [
      position,
      event,
    ] of replay.content.delivered_event_refs.entries()) {
      await client.query(
        `INSERT INTO petra.interaction_replay_deliveries (
           interaction_replay_record_id, position,
           interaction_event_record_id, sequence, content_hash
         ) VALUES ($1, $2, $3, $4, $5)`,
        [
          replay.interaction_replay_record_id,
          position + 1,
          event.interaction_event_record_id,
          event.sequence,
          event.content_hash,
        ],
      );
    }
  }

  async #validationContext(
    client: PoolClient,
    featureManifestId: string,
    interactionRunId: string,
  ): Promise<InMemoryInteractionRecordRegistry> {
    const head = await client.query<{ interaction_run_id: string }>(
      `SELECT interaction_run_id FROM petra.interaction_runs
        WHERE interaction_run_id = $1`,
      [interactionRunId],
    );
    if (head.rows[0] !== undefined)
      return this.#rehydrate(client, interactionRunId);
    const feature = await this.#recordById(
      client,
      "interaction_feature_manifests",
      "interaction_feature_manifest_id",
      featureManifestId,
    );
    if (feature === undefined) {
      throw new InteractionRecordError(
        "INTERACTION_FEATURE_REFERENCE_MISMATCH",
        "The InteractionRun must bind one exact registered feature manifest.",
      );
    }
    const registry = new InMemoryInteractionRecordRegistry();
    registry.registerFeatureManifest(this.#readFeature(feature.payload));
    return registry;
  }

  async #rehydrate(
    client: PoolClient,
    interactionRunId: string,
  ): Promise<InMemoryInteractionRecordRegistry> {
    const head = await this.#requireRunHead(client, interactionRunId);
    const feature = await this.#recordById(
      client,
      "interaction_feature_manifests",
      "interaction_feature_manifest_id",
      head.feature_manifest_id,
    );
    if (feature === undefined)
      throw new Error("Interaction run lost its feature manifest.");
    const [runRows, eventRows, interruptRows, replayRows] = await Promise.all([
      client.query<PayloadRow>(
        `SELECT payload FROM petra.interaction_run_revisions
          WHERE interaction_run_id = $1 ORDER BY revision`,
        [interactionRunId],
      ),
      client.query<PayloadRow>(
        `SELECT payload FROM petra.interaction_event_records
          WHERE interaction_run_id = $1 ORDER BY sequence`,
        [interactionRunId],
      ),
      client.query<PayloadRow>(
        `SELECT revision.payload
           FROM petra.interaction_interrupt_revisions AS revision
           JOIN petra.interaction_interrupts AS head
             ON head.interaction_interrupt_id = revision.interaction_interrupt_id
          WHERE head.interaction_run_id = $1
          ORDER BY revision.interaction_interrupt_id, revision.revision`,
        [interactionRunId],
      ),
      client.query<PayloadRow>(
        `SELECT payload FROM petra.interaction_replay_records
          WHERE interaction_run_id = $1
          ORDER BY connection_id, attempt`,
        [interactionRunId],
      ),
    ]);

    const registry = new InMemoryInteractionRecordRegistry();
    registry.registerFeatureManifest(this.#readFeature(feature.payload));
    const events = eventRows.rows.map((row) => this.#readEvent(row.payload));
    let eventIndex = 0;
    for (const row of runRows.rows) {
      const run = this.#readRun(row.payload);
      while (eventIndex < run.content.stream_head.event_count) {
        const event = events[eventIndex];
        if (event === undefined)
          throw new Error("Interaction run head exceeds its event history.");
        registry.appendEvent(event);
        eventIndex += 1;
      }
      registry.registerRun(run);
    }
    while (eventIndex < events.length) {
      registry.appendEvent(events[eventIndex]!);
      eventIndex += 1;
    }
    for (const row of interruptRows.rows) {
      registry.registerInterrupt(this.#readInterrupt(row.payload));
    }
    for (const row of replayRows.rows) {
      registry.registerReplay(this.#readReplay(row.payload));
    }
    return registry;
  }

  async #requireRunHead(client: PoolClient, interactionRunId: string) {
    const result = await client.query<{
      interaction_run_id: string;
      feature_manifest_id: string;
    }>(
      `SELECT interaction_run_id, feature_manifest_id
         FROM petra.interaction_runs
        WHERE interaction_run_id = $1 FOR UPDATE`,
      [interactionRunId],
    );
    if (result.rows[0] === undefined) {
      throw new InteractionRecordError(
        "INTERACTION_EVENT_REFERENCE_MISMATCH",
        "The interaction record must bind one exact registered run revision.",
      );
    }
    return result.rows[0];
  }

  async #getCurrentRun(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    interactionRunId: string,
  ): Promise<PetraInteractionRun | undefined> {
    const result = await queryable.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.interaction_runs AS head
         JOIN petra.interaction_run_revisions AS revision
           ON revision.interaction_run_id = head.interaction_run_id
          AND revision.revision = head.current_revision
        WHERE head.interaction_run_id = $1`,
      [interactionRunId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#readRun(result.rows[0].payload);
  }

  async #recordById(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    table: string,
    column: string,
    id: string,
  ): Promise<RecordRow | undefined> {
    const allowed = new Set([
      "interaction_feature_manifests:interaction_feature_manifest_id",
      "interaction_event_records:interaction_event_record_id",
      "interaction_replay_records:interaction_replay_record_id",
    ]);
    if (!allowed.has(`${table}:${column}`))
      throw new Error("Unsafe interaction table lookup.");
    const result = await queryable.query<RecordRow>(
      `SELECT record_hash, payload FROM petra.${table} WHERE ${column} = $1`,
      [id],
    );
    return result.rows[0];
  }

  #exactReplay<Value>(
    existing: RecordRow,
    candidate: Value,
    message: string,
    read: (payload: unknown) => Value,
  ): Value {
    if (existing.record_hash !== canonicalHash(candidate)) {
      throw new InteractionRecordError(
        "INTERACTION_ID_ALREADY_REGISTERED",
        message,
      );
    }
    return read(existing.payload);
  }

  #readFeature(payload: unknown): PetraInteractionFeatureManifest {
    this.#contracts.assertValid(
      "interaction-feature-manifest",
      "1.0.0",
      payload,
    );
    return clone(payload as PetraInteractionFeatureManifest);
  }

  #readRun(payload: unknown): PetraInteractionRun {
    this.#contracts.assertValid("interaction-run", "1.0.0", payload);
    return clone(payload as PetraInteractionRun);
  }

  #readEvent(payload: unknown): PetraInteractionEventRecord {
    this.#contracts.assertValid("interaction-event-record", "1.0.0", payload);
    return clone(payload as PetraInteractionEventRecord);
  }

  #readInterrupt(payload: unknown): PetraInteractionInterrupt {
    this.#contracts.assertValid("interaction-interrupt", "1.0.0", payload);
    return clone(payload as PetraInteractionInterrupt);
  }

  #readReplay(payload: unknown): PetraInteractionReplayRecord {
    this.#contracts.assertValid("interaction-replay-record", "1.0.0", payload);
    return clone(payload as PetraInteractionReplayRecord);
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Result>(
    operation: (client: PoolClient) => Promise<Result>,
  ): Promise<Result> {
    if (this.#transactionClient !== undefined)
      return operation(this.#transactionClient);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
