import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraCommandEnvelope,
  PetraDomainEvent,
  PetraGraphProjectionRecord,
  PetraOutboxRecord,
  PetraProject,
  PetraProjectionCheckpoint,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresGraphProjectionAuthorityRepository } from "../src/graph-projection-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service",
  display_name: "Petra graph projector",
  created_at: "2026-08-28T18:00:01.000Z",
});

const projectionCheckpoint = (): PetraProjectionCheckpoint => {
  const checkpoint = readFixture<PetraProjectionCheckpoint>(
    "projection-checkpoint-catching-up",
  );
  checkpoint.recorded_by = {
    actor_id: serviceActor().actor_id,
    actor_kind: "service",
  };
  return checkpoint;
};

const failedRecord = (): PetraGraphProjectionRecord => {
  const record = readFixture<PetraGraphProjectionRecord>(
    "graph-projection-record-failed",
  );
  record.recorded_by = {
    actor_id: serviceActor().actor_id,
    actor_kind: "service",
  };
  return record;
};

const appliedRecord = (): PetraGraphProjectionRecord => {
  const record = readFixture<PetraGraphProjectionRecord>(
    "graph-projection-record-applied",
  );
  record.recorded_by = {
    actor_id: serviceActor().actor_id,
    actor_kind: "service",
  };
  return record;
};

const graphOutbox = (sequence = 1): PetraOutboxRecord => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  if (sequence === 2) {
    event.event_id = "event_01ARZ3NDEKTSV4RRFFQ69G5FD5";
    event.event_position = 4;
    event.stream_revision = 4;
    event.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FD4";
    event.causation_id = event.command_id;
    event.idempotency_key = "review:claim-fbb:apply:projection-2";
    event.occurred_at = "2026-08-28T18:13:02.000Z";
    event.recorded_at = event.occurred_at;
  }
  return {
    schema_name: "petra.outbox-record",
    schema_version: "1.0.0",
    outbox_id:
      sequence === 1
        ? "outbox_01ARZ3NDEKTSV4RRFFQ69G5FC6"
        : "outbox_01ARZ3NDEKTSV4RRFFQ69G5FD6",
    outbox_position: sequence === 1 ? 3 : 4,
    target: "neo4j_graph",
    target_sequence: sequence,
    partition_key: event.project_id,
    deduplication_key: `neo4j_graph:${event.event_id}`,
    enqueued_at: event.recorded_at,
    message: { message_kind: "domain_event", event },
  };
};

describePostgres("PostgreSQL-authoritative graph projection tracking", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const projections = new PostgresGraphProjectionAuthorityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
    await seedOutbox(graphOutbox());
  });

  afterAll(async () => {
    await pool.end();
  });

  const seedOutbox = async (outbox: PetraOutboxRecord): Promise<void> => {
    const event = outbox.message.event;
    const envelope = readFixture<PetraCommandEnvelope>(
      "command-apply-change-set",
    );
    envelope.command_id = event.command_id;
    envelope.idempotency_key = event.idempotency_key;
    envelope.correlation_id = event.correlation_id;
    envelope.submitted_at = event.occurred_at;
    await pool.query(
      `INSERT INTO petra.command_executions (
         command_id, idempotency_key, project_id, actor_id, actor_kind,
         capability_grant_id, correlation_id, submitted_at, command_name,
         command_fingerprint, envelope, outcome_kind, result, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10,
                 $11::jsonb, 'success', $12::jsonb, $13::timestamptz)`,
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
        canonicalHash(envelope),
        JSON.stringify(envelope),
        JSON.stringify({ outcome: "applied" }),
        event.recorded_at,
      ],
    );
    await pool.query(
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
        canonicalHash(event),
        JSON.stringify(event),
      ],
    );
    await pool.query(
      `INSERT INTO petra.outbox_records (
         outbox_id, outbox_position, target, target_sequence, partition_key,
         deduplication_key, event_id, enqueued_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9,
                 $10::jsonb)`,
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
  };

  it("keeps a failed receipt visible and advances only after the Neo4j retry commits", async () => {
    const checkpoint = projectionCheckpoint();
    expect(await projections.register(checkpoint)).toEqual(checkpoint);
    const blocked = await projections.record(
      checkpoint.projection_checkpoint_id,
      graphOutbox(),
      failedRecord(),
      1,
    );
    expect(blocked.revision).toBe(2);
    expect(blocked.content.position.target_sequence).toBe(0);
    expect(blocked.content.freshness.state).toBe("blocked");
    expect(
      await projections.getRepairQueue(checkpoint.projection_checkpoint_id),
    ).toHaveLength(1);

    const current = await projections.record(
      checkpoint.projection_checkpoint_id,
      graphOutbox(),
      appliedRecord(),
      2,
    );
    expect(current.revision).toBe(3);
    expect(current.content.position.target_sequence).toBe(1);
    expect(current.content.freshness.state).toBe("current");
    expect(
      await projections.getRepairQueue(checkpoint.projection_checkpoint_id),
    ).toEqual([]);
    expect(
      await projections.record(
        checkpoint.projection_checkpoint_id,
        graphOutbox(),
        appliedRecord(),
        1,
      ),
    ).toEqual(current);
    expect(
      await projections.getProjectionRecords(
        checkpoint.projection_checkpoint_id,
      ),
    ).toHaveLength(2);
    expect(
      (
        await projections.getCheckpointRevision(
          checkpoint.projection_checkpoint_id,
          1,
        )
      )?.content.position.target_sequence,
    ).toBe(0);

    const objects = await pool.query<{
      graph_element_kind: string;
      object_id: string;
      object_revision: string;
    }>(
      `SELECT graph_element_kind, object_id, object_revision::text
         FROM petra.graph_projected_objects
        ORDER BY position`,
    );
    expect(objects.rows).toEqual([
      {
        graph_element_kind: "node",
        object_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
        object_revision: "2",
      },
      {
        graph_element_kind: "relationship",
        object_id: "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
        object_revision: "2",
      },
    ]);
  });

  it("observes a later head but cannot advance across a missing target sequence", async () => {
    const checkpoint = projectionCheckpoint();
    await projections.register(checkpoint);
    const second = graphOutbox(2);
    await seedOutbox(second);
    const observed = await projections.observeHead(
      checkpoint.projection_checkpoint_id,
      second,
      1,
      "2026-08-29T14:11:00.000Z",
    );
    expect(observed.content.freshness).toEqual({
      state: "catching_up",
      pending_records: 2,
    });
    const gapRecord = appliedRecord();
    gapRecord.graph_projection_record_id =
      "graph_projection_record_01ARZ3NDEKTSV4RRFFQ69G5FD7";
    gapRecord.content.outbox_ref = {
      outbox_id: second.outbox_id,
      outbox_position: second.outbox_position,
      target_sequence: second.target_sequence,
      event_id: second.message.event.event_id,
      event_position: second.message.event.event_position,
      stream_revision: second.message.event.stream_revision,
    };
    gapRecord.content.attempt = 1;
    if (gapRecord.content.outcome.outcome_kind !== "applied") {
      throw new Error("Expected applied projection fixture.");
    }
    gapRecord.content.outcome.effect.source_event_id =
      second.message.event.event_id;
    gapRecord.content.outcome.effect_hash = canonicalHash(
      gapRecord.content.outcome.effect,
    );
    gapRecord.content_hash = canonicalHash(gapRecord.content);
    await expect(
      projections.record(
        checkpoint.projection_checkpoint_id,
        second,
        gapRecord,
        observed.revision,
      ),
    ).rejects.toEqual(
      expect.objectContaining({ code: "PROJECTION_SEQUENCE_GAP" }),
    );
    expect(
      await projections.getProjectionRecords(
        checkpoint.projection_checkpoint_id,
      ),
    ).toEqual([]);
    expect(
      (await projections.getCheckpoint(checkpoint.projection_checkpoint_id))
        ?.revision,
    ).toBe(2);
  });

  it("rejects fabricated outbox payloads and keeps projection records immutable", async () => {
    const checkpoint = projectionCheckpoint();
    await projections.register(checkpoint);
    const fabricated = graphOutbox();
    if (fabricated.message.event.event.event_type !== "change_set.applied") {
      throw new Error("Expected applied domain event.");
    }
    fabricated.message.event.event.payload.claim.canonical_text =
      "Fabricated projection input.";
    await expect(
      projections.record(
        checkpoint.projection_checkpoint_id,
        fabricated,
        failedRecord(),
        1,
      ),
    ).rejects.toEqual(
      expect.objectContaining({ code: "PROJECTION_OUTBOX_REFERENCE_MISMATCH" }),
    );
    expect(
      await projections.getProjectionRecords(
        checkpoint.projection_checkpoint_id,
      ),
    ).toEqual([]);

    await projections.record(
      checkpoint.projection_checkpoint_id,
      graphOutbox(),
      failedRecord(),
      1,
    );
    await expect(
      pool.query("DELETE FROM petra.graph_projection_records"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        "UPDATE petra.projection_checkpoint_revisions SET pending_records = 99",
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
  });
});
