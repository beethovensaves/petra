import { createHash } from "node:crypto";

import type {
  PetraGraphProjectionRecord,
  PetraOutboxRecord,
  PetraProjectionCheckpoint,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  GraphProjectionError,
  InMemoryGraphProjectionRegistry,
  type GraphProjectionAuthorityRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

interface PayloadRow {
  payload: unknown;
}

interface ProjectionRecordRow {
  graph_projection_record_id: string;
  payload: unknown;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const mutableCheckpoint = (value: unknown): PetraProjectionCheckpoint =>
  structuredClone(value) as PetraProjectionCheckpoint;

export class PostgresGraphProjectionAuthorityRepository implements GraphProjectionAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async register(
    checkpoint: PetraProjectionCheckpoint,
  ): Promise<PetraProjectionCheckpoint> {
    this.#contracts.assertValid("projection-checkpoint", "1.0.0", checkpoint);
    const validator = new InMemoryGraphProjectionRegistry();
    validator.register(clone(checkpoint));

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `projection-checkpoint:${checkpoint.projection_checkpoint_id}`,
        `projection-identity:${checkpoint.project_id}:${canonicalize(checkpoint.projection)}`,
      ]);
      const byId = await client.query<{ record_hash: string }>(
        `SELECT revision.record_hash
           FROM petra.projection_checkpoints AS head
           JOIN petra.projection_checkpoint_revisions AS revision
             ON revision.projection_checkpoint_id = head.projection_checkpoint_id
            AND revision.revision = 1
          WHERE head.projection_checkpoint_id = $1`,
        [checkpoint.projection_checkpoint_id],
      );
      if (byId.rows[0] !== undefined) {
        if (byId.rows[0].record_hash !== canonicalHash(checkpoint)) {
          throw new GraphProjectionError(
            "CHECKPOINT_ID_ALREADY_REGISTERED",
            "The checkpoint ID is already bound to different content.",
          );
        }
        const current = await this.#getCheckpoint(
          client,
          checkpoint.projection_checkpoint_id,
        );
        if (current === undefined) {
          throw new Error("A projection checkpoint lost its current revision.");
        }
        return current;
      }

      const identity = await client.query(
        `SELECT 1 FROM petra.projection_checkpoints
          WHERE project_id = $1 AND target = $2 AND projection_name = $3
            AND projection_version = $4 AND configuration_hash = $5`,
        [
          checkpoint.project_id,
          checkpoint.projection.target,
          checkpoint.projection.projection_name,
          checkpoint.projection.projection_version,
          checkpoint.projection.configuration_hash,
        ],
      );
      if (identity.rows[0] !== undefined) {
        throw new GraphProjectionError(
          "CHECKPOINT_IDENTITY_ALREADY_REGISTERED",
          "This Project and projection identity already have a checkpoint.",
        );
      }
      await this.#requireOutboxByReference(
        client,
        checkpoint.content.observed_head.outbox_id,
        checkpoint.content.observed_head,
      );
      await client.query(
        `INSERT INTO petra.projection_checkpoints (
           projection_checkpoint_id, project_id, target, projection_name,
           projection_version, configuration_hash, current_revision
         ) VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [
          checkpoint.projection_checkpoint_id,
          checkpoint.project_id,
          checkpoint.projection.target,
          checkpoint.projection.projection_name,
          checkpoint.projection.projection_version,
          checkpoint.projection.configuration_hash,
        ],
      );
      await this.#insertCheckpointRevision(client, checkpoint);
      return clone(checkpoint);
    });
  }

  getCheckpoint(
    checkpointId: string,
  ): Promise<PetraProjectionCheckpoint | undefined> {
    return this.#getCheckpoint(this.#pool, checkpointId);
  }

  async getCheckpointRevision(
    checkpointId: string,
    revision: number,
  ): Promise<PetraProjectionCheckpoint | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload FROM petra.projection_checkpoint_revisions
        WHERE projection_checkpoint_id = $1 AND revision = $2`,
      [checkpointId, revision],
    );
    return this.#readCheckpoint(result.rows[0]?.payload);
  }

  async getProjectionRecords(
    checkpointId: string,
  ): Promise<PetraGraphProjectionRecord[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload FROM petra.graph_projection_records
        WHERE projection_checkpoint_id = $1
        ORDER BY target_sequence, attempt`,
      [checkpointId],
    );
    return result.rows.map(({ payload }) => this.#requiredRecord(payload));
  }

  async getRepairQueue(
    checkpointId: string,
  ): Promise<PetraGraphProjectionRecord[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT failed.payload
         FROM petra.graph_projection_records AS failed
        WHERE failed.projection_checkpoint_id = $1
          AND failed.outcome_kind = 'failed'
          AND NOT EXISTS (
            SELECT 1 FROM petra.graph_projection_records AS applied
             WHERE applied.projection_checkpoint_id = failed.projection_checkpoint_id
               AND applied.outbox_id = failed.outbox_id
               AND applied.outcome_kind = 'applied'
          )
        ORDER BY failed.target_sequence, failed.attempt`,
      [checkpointId],
    );
    return result.rows.map(({ payload }) => this.#requiredRecord(payload));
  }

  async observeHead(
    checkpointId: string,
    outbox: PetraOutboxRecord,
    expectedRevision: number,
    observedAt: string,
  ): Promise<PetraProjectionCheckpoint> {
    this.#contracts.assertValid("outbox-record", "1.0.0", outbox);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `projection-checkpoint:${checkpointId}`,
        `outbox:${outbox.outbox_id}`,
      ]);
      await this.#requireHead(client, checkpointId);
      const authoritativeOutbox = await this.#requireExactOutbox(
        client,
        outbox,
      );
      const registry = await this.#rehydrate(client, checkpointId);
      const prior = registry.getCheckpoint(checkpointId);
      const next = mutableCheckpoint(
        registry.observeHead(
          checkpointId,
          authoritativeOutbox,
          expectedRevision,
          observedAt,
        ),
      );
      if (prior?.revision === next.revision) return next;
      this.#contracts.assertValid("projection-checkpoint", "1.0.0", next);
      await this.#insertCheckpointRevision(client, next);
      await this.#advanceHead(client, next);
      return next;
    });
  }

  async record(
    checkpointId: string,
    outbox: PetraOutboxRecord,
    record: PetraGraphProjectionRecord,
    expectedRevision: number,
  ): Promise<PetraProjectionCheckpoint> {
    this.#contracts.assertValid("outbox-record", "1.0.0", outbox);
    this.#contracts.assertValid("graph-projection-record", "1.0.0", record);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `projection-checkpoint:${checkpointId}`,
        `projection-record:${record.graph_projection_record_id}`,
        `outbox:${outbox.outbox_id}`,
      ]);
      await this.#requireHead(client, checkpointId);
      const authoritativeOutbox = await this.#requireExactOutbox(
        client,
        outbox,
      );
      const existing = await client.query<{
        record_hash: string;
        projection_checkpoint_id: string;
      }>(
        `SELECT record_hash, projection_checkpoint_id
           FROM petra.graph_projection_records
          WHERE graph_projection_record_id = $1`,
        [record.graph_projection_record_id],
      );
      if (existing.rows[0] !== undefined) {
        if (
          existing.rows[0].record_hash !== canonicalHash(record) ||
          existing.rows[0].projection_checkpoint_id !== checkpointId
        ) {
          throw new GraphProjectionError(
            "PROJECTION_RECORD_ID_ALREADY_REGISTERED",
            "The projection record ID is already bound to a different attempt.",
          );
        }
        const current = await this.#getCheckpoint(client, checkpointId);
        if (current === undefined) {
          throw new Error("A projection record lost its checkpoint.");
        }
        return current;
      }

      const registry = await this.#rehydrate(client, checkpointId);
      const next = mutableCheckpoint(
        registry.record(
          checkpointId,
          authoritativeOutbox,
          clone(record),
          expectedRevision,
        ),
      );
      this.#contracts.assertValid("projection-checkpoint", "1.0.0", next);
      await this.#insertProjectionRecord(client, checkpointId, record);
      await this.#insertCheckpointRevision(client, next);
      await this.#advanceHead(client, next);
      return next;
    });
  }

  async #rehydrate(
    client: PoolClient,
    checkpointId: string,
  ): Promise<InMemoryGraphProjectionRegistry> {
    const historyResult = await client.query<PayloadRow>(
      `SELECT payload FROM petra.projection_checkpoint_revisions
        WHERE projection_checkpoint_id = $1 ORDER BY revision`,
      [checkpointId],
    );
    const history = historyResult.rows.map(({ payload }) =>
      this.#requiredCheckpoint(payload),
    );
    if (history[0] === undefined) {
      throw new GraphProjectionError(
        "CHECKPOINT_NOT_REGISTERED",
        `Projection checkpoint ${checkpointId} is not registered.`,
      );
    }
    const recordResult = await client.query<ProjectionRecordRow>(
      `SELECT graph_projection_record_id, payload
         FROM petra.graph_projection_records
        WHERE projection_checkpoint_id = $1`,
      [checkpointId],
    );
    const records = new Map<string, PetraGraphProjectionRecord>();
    const outboxIds = new Set<string>();
    for (const checkpoint of history) {
      outboxIds.add(checkpoint.content.observed_head.outbox_id);
      if (checkpoint.content.position.position_kind === "advanced") {
        outboxIds.add(checkpoint.content.position.outbox_id);
      }
    }
    for (const row of recordResult.rows) {
      const projectionRecord = this.#requiredRecord(row.payload);
      records.set(row.graph_projection_record_id, projectionRecord);
      outboxIds.add(projectionRecord.content.outbox_ref.outbox_id);
    }
    const outboxResult = await client.query<{
      outbox_id: string;
      payload: unknown;
    }>(
      "SELECT outbox_id, payload FROM petra.outbox_records WHERE outbox_id = ANY($1::text[])",
      [[...outboxIds]],
    );
    const outboxes = new Map<string, PetraOutboxRecord>();
    for (const row of outboxResult.rows) {
      outboxes.set(row.outbox_id, this.#requiredOutbox(row.payload));
    }

    const registry = new InMemoryGraphProjectionRegistry();
    registry.register(clone(history[0]));
    for (const expected of history.slice(1)) {
      const prior = registry.getCheckpoint(checkpointId);
      if (prior === undefined) throw new Error("Checkpoint replay lost state.");
      let actual: unknown;
      const position = expected.content.position;
      if (
        position.position_kind === "advanced" &&
        position.target_sequence > prior.content.position.target_sequence
      ) {
        const projectionRecord = records.get(
          position.graph_projection_record_id,
        );
        if (projectionRecord === undefined) {
          throw new Error("Advanced checkpoint lost its projection receipt.");
        }
        const outbox = outboxes.get(
          projectionRecord.content.outbox_ref.outbox_id,
        );
        if (outbox === undefined)
          throw new Error("Projection receipt lost its outbox.");
        actual = registry.record(
          checkpointId,
          clone(outbox),
          clone(projectionRecord),
          prior.revision,
        );
      } else if (
        expected.content.freshness.state === "blocked" &&
        (prior.content.freshness.state !== "blocked" ||
          prior.content.freshness.blocking_projection_record_id !==
            expected.content.freshness.blocking_projection_record_id)
      ) {
        const projectionRecord = records.get(
          expected.content.freshness.blocking_projection_record_id,
        );
        if (projectionRecord === undefined) {
          throw new Error("Blocked checkpoint lost its projection receipt.");
        }
        const outbox = outboxes.get(
          projectionRecord.content.outbox_ref.outbox_id,
        );
        if (outbox === undefined)
          throw new Error("Projection receipt lost its outbox.");
        actual = registry.record(
          checkpointId,
          clone(outbox),
          clone(projectionRecord),
          prior.revision,
        );
      } else {
        const outbox = outboxes.get(expected.content.observed_head.outbox_id);
        if (outbox === undefined)
          throw new Error("Checkpoint head lost its outbox.");
        actual = registry.observeHead(
          checkpointId,
          clone(outbox),
          prior.revision,
          expected.content.observed_head.observed_at,
        );
      }
      if (canonicalize(actual) !== canonicalize(expected)) {
        throw new Error(
          `Projection checkpoint ${checkpointId} revision ${expected.revision} does not replay deterministically.`,
        );
      }
    }
    return registry;
  }

  async #insertProjectionRecord(
    client: PoolClient,
    checkpointId: string,
    record: PetraGraphProjectionRecord,
  ): Promise<void> {
    const outcome = record.content.outcome;
    const failed =
      outcome.outcome_kind === "failed" ? outcome.failure : undefined;
    const applied = outcome.outcome_kind === "applied" ? outcome : undefined;
    const ref = record.content.outbox_ref;
    await client.query(
      `INSERT INTO petra.graph_projection_records (
         graph_projection_record_id, revision, projection_checkpoint_id,
         project_id, target, projection_name, projection_version,
         configuration_hash, outbox_id, outbox_position, target_sequence,
         event_id, event_position, stream_revision, attempt, started_at,
         completed_at, outcome_kind, failure_code, failure_message,
         failure_retryable, effect_hash, backend_receipt, content_hash,
         recorded_by_actor_id, recorded_by_actor_kind, recorded_at,
         record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16::timestamptz, $17::timestamptz, $18,
                 $19, $20, $21, $22, $23, $24, $25, $26,
                 $27::timestamptz, $28, $29::jsonb)`,
      [
        record.graph_projection_record_id,
        record.revision,
        checkpointId,
        record.project_id,
        record.projection.target,
        record.projection.projection_name,
        record.projection.projection_version,
        record.projection.configuration_hash,
        ref.outbox_id,
        ref.outbox_position,
        ref.target_sequence,
        ref.event_id,
        ref.event_position,
        ref.stream_revision,
        record.content.attempt,
        record.content.started_at,
        record.content.completed_at,
        outcome.outcome_kind,
        failed?.code ?? null,
        failed?.message ?? null,
        failed?.retryable ?? null,
        applied?.effect_hash ?? null,
        applied?.backend_receipt.receipt ?? null,
        record.content_hash,
        record.recorded_by.actor_id,
        record.recorded_by.actor_kind,
        record.recorded_at,
        canonicalHash(record),
        JSON.stringify(record),
      ],
    );
    if (applied !== undefined) {
      for (const [index, object] of applied.effect.objects.entries()) {
        await client.query(
          `INSERT INTO petra.graph_projected_objects (
             graph_projection_record_id, position, graph_element_kind,
             object_id, object_revision, operation, projected_object
           ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [
            record.graph_projection_record_id,
            index + 1,
            object.graph_element_kind,
            object.object_id,
            object.object_revision,
            object.operation,
            JSON.stringify(object),
          ],
        );
      }
    }
  }

  async #insertCheckpointRevision(
    client: PoolClient,
    checkpoint: PetraProjectionCheckpoint,
  ): Promise<void> {
    const position = checkpoint.content.position;
    const observed = checkpoint.content.observed_head;
    const freshness = checkpoint.content.freshness;
    await client.query(
      `INSERT INTO petra.projection_checkpoint_revisions (
         projection_checkpoint_id, revision, project_id, target,
         projection_name, projection_version, configuration_hash,
         position_kind, position_target_sequence, position_outbox_id,
         position_outbox_position, position_event_id, position_event_position,
         position_stream_revision, position_projection_record_id,
         position_advanced_at,
         observed_outbox_id, observed_outbox_position, observed_target_sequence,
         observed_event_id, observed_event_position, observed_stream_revision,
         observed_at,
         freshness_state, pending_records, blocking_projection_record_id,
         failure_code, failure_message, blocked_at, content_hash,
         recorded_by_actor_id,
         recorded_by_actor_kind, recorded_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16::timestamptz, $17, $18, $19, $20,
                 $21, $22, $23::timestamptz, $24, $25, $26, $27, $28,
                 $29::timestamptz, $30, $31, $32, $33::timestamptz, $34,
                 $35::jsonb)`,
      [
        checkpoint.projection_checkpoint_id,
        checkpoint.revision,
        checkpoint.project_id,
        checkpoint.projection.target,
        checkpoint.projection.projection_name,
        checkpoint.projection.projection_version,
        checkpoint.projection.configuration_hash,
        position.position_kind,
        position.target_sequence,
        position.position_kind === "advanced" ? position.outbox_id : null,
        position.position_kind === "advanced" ? position.outbox_position : null,
        position.position_kind === "advanced" ? position.event_id : null,
        position.position_kind === "advanced" ? position.event_position : null,
        position.position_kind === "advanced" ? position.stream_revision : null,
        position.position_kind === "advanced"
          ? position.graph_projection_record_id
          : null,
        position.position_kind === "advanced" ? position.advanced_at : null,
        observed.outbox_id,
        observed.outbox_position,
        observed.target_sequence,
        observed.event_id,
        observed.event_position,
        observed.stream_revision,
        observed.observed_at,
        freshness.state,
        freshness.pending_records,
        freshness.state === "blocked"
          ? freshness.blocking_projection_record_id
          : null,
        freshness.state === "blocked" ? freshness.failure_code : null,
        freshness.state === "blocked" ? freshness.message : null,
        freshness.state === "blocked" ? freshness.blocked_at : null,
        checkpoint.content_hash,
        checkpoint.recorded_by.actor_id,
        checkpoint.recorded_by.actor_kind,
        checkpoint.recorded_at,
        canonicalHash(checkpoint),
        JSON.stringify(checkpoint),
      ],
    );
  }

  async #advanceHead(
    client: PoolClient,
    checkpoint: PetraProjectionCheckpoint,
  ): Promise<void> {
    const result = await client.query(
      `UPDATE petra.projection_checkpoints
          SET current_revision = $2
        WHERE projection_checkpoint_id = $1 AND current_revision = $2 - 1`,
      [checkpoint.projection_checkpoint_id, checkpoint.revision],
    );
    if (result.rowCount !== 1) {
      throw new GraphProjectionError(
        "STALE_CHECKPOINT_REVISION",
        "The projection checkpoint changed before its revision could commit.",
      );
    }
  }

  async #requireExactOutbox(
    client: PoolClient,
    supplied: PetraOutboxRecord,
  ): Promise<PetraOutboxRecord> {
    const result = await client.query<PayloadRow>(
      "SELECT payload FROM petra.outbox_records WHERE outbox_id = $1",
      [supplied.outbox_id],
    );
    if (result.rows[0]?.payload === undefined) {
      throw new GraphProjectionError(
        "PROJECTION_OUTBOX_REFERENCE_MISMATCH",
        "Projection input does not identify a persisted outbox record.",
      );
    }
    const authoritative = this.#requiredOutbox(result.rows[0]?.payload);
    if (canonicalize(authoritative) !== canonicalize(supplied)) {
      throw new GraphProjectionError(
        "PROJECTION_OUTBOX_REFERENCE_MISMATCH",
        "Projection input must be the exact authoritative outbox record.",
      );
    }
    return authoritative;
  }

  async #requireOutboxByReference(
    client: PoolClient,
    outboxId: string,
    reference: PetraProjectionCheckpoint["content"]["observed_head"],
  ): Promise<void> {
    const result = await client.query<{
      outbox_position: string;
      target_sequence: string;
      event_id: string;
    }>(
      `SELECT outbox_position::text, target_sequence::text, event_id
         FROM petra.outbox_records
        WHERE outbox_id = $1 AND target = 'neo4j_graph'`,
      [outboxId],
    );
    const row = result.rows[0];
    if (
      row === undefined ||
      Number(row.outbox_position) !== reference.outbox_position ||
      Number(row.target_sequence) !== reference.target_sequence ||
      row.event_id !== reference.event_id
    ) {
      throw new GraphProjectionError(
        "PROJECTION_OUTBOX_REFERENCE_MISMATCH",
        "Checkpoint head must identify an exact authoritative graph outbox record.",
      );
    }
  }

  async #requireHead(client: PoolClient, checkpointId: string): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM petra.projection_checkpoints
        WHERE projection_checkpoint_id = $1 FOR UPDATE`,
      [checkpointId],
    );
    if (result.rows[0] === undefined) {
      throw new GraphProjectionError(
        "CHECKPOINT_NOT_REGISTERED",
        `Projection checkpoint ${checkpointId} is not registered.`,
      );
    }
  }

  async #getCheckpoint(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    checkpointId: string,
  ): Promise<PetraProjectionCheckpoint | undefined> {
    const result = await queryable.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.projection_checkpoints AS head
         JOIN petra.projection_checkpoint_revisions AS revision
           ON revision.projection_checkpoint_id = head.projection_checkpoint_id
          AND revision.revision = head.current_revision
        WHERE head.projection_checkpoint_id = $1`,
      [checkpointId],
    );
    return this.#readCheckpoint(result.rows[0]?.payload);
  }

  #readCheckpoint(payload: unknown): PetraProjectionCheckpoint | undefined {
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("projection-checkpoint", "1.0.0", payload);
    return clone(payload as PetraProjectionCheckpoint);
  }

  #requiredCheckpoint(payload: unknown): PetraProjectionCheckpoint {
    const checkpoint = this.#readCheckpoint(payload);
    if (checkpoint === undefined)
      throw new Error("Checkpoint payload is missing.");
    return checkpoint;
  }

  #requiredRecord(payload: unknown): PetraGraphProjectionRecord {
    this.#contracts.assertValid("graph-projection-record", "1.0.0", payload);
    return clone(payload as PetraGraphProjectionRecord);
  }

  #requiredOutbox(payload: unknown): PetraOutboxRecord {
    this.#contracts.assertValid("outbox-record", "1.0.0", payload);
    return clone(payload as PetraOutboxRecord);
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
