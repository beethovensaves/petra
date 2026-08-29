import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraDomainEvent,
  PetraGraphProjectionRecord,
  PetraOutboxRecord,
  PetraProjectionCheckpoint,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { InMemoryGraphProjectionRegistry } from "../src/graph-projection-registry.js";

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

const makeCheckpoint = (): PetraProjectionCheckpoint =>
  readFixture<PetraProjectionCheckpoint>("projection-checkpoint-catching-up");

const makeFailedRecord = (): PetraGraphProjectionRecord =>
  readFixture<PetraGraphProjectionRecord>("graph-projection-record-failed");

const makeAppliedRecord = (): PetraGraphProjectionRecord =>
  readFixture<PetraGraphProjectionRecord>("graph-projection-record-applied");

const makeOutbox = (): PetraOutboxRecord => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  return {
    schema_name: "petra.outbox-record",
    schema_version: "1.0.0",
    outbox_id: "outbox_01ARZ3NDEKTSV4RRFFQ69G5FC6",
    outbox_position: 3,
    target: "neo4j_graph",
    target_sequence: 1,
    partition_key: event.project_id,
    deduplication_key: `neo4j_graph:${event.event_id}`,
    enqueued_at: event.recorded_at,
    message: { message_kind: "domain_event", event },
  };
};

const rehashRecord = (record: PetraGraphProjectionRecord): void => {
  if (record.content.outcome.outcome_kind === "applied") {
    record.content.outcome.effect_hash = canonicalHash(
      record.content.outcome.effect,
    );
  }
  record.content_hash = canonicalHash(record.content);
};

const expectCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

describe("PostgreSQL-authoritative graph projection tracking", () => {
  it("registers an immutable checkpoint idempotently", () => {
    const registry = new InMemoryGraphProjectionRegistry();
    const input = makeCheckpoint();
    const first = registry.register(input);
    const replay = registry.register(structuredClone(input));

    expect(replay).toBe(first);
    expect(registry.size).toBe(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.content.observed_head)).toBe(true);
    input.content.freshness.pending_records = 99;
    expect(first.content.freshness.pending_records).toBe(1);
  });

  it("keeps a failed graph commit visible, then advances only after a successful retry", () => {
    const registry = new InMemoryGraphProjectionRegistry();
    const checkpoint = registry.register(makeCheckpoint());
    const outbox = makeOutbox();
    const failed = registry.record(
      checkpoint.projection_checkpoint_id,
      outbox,
      makeFailedRecord(),
      1,
    );

    expect(failed.revision).toBe(2);
    expect(failed.content.position.target_sequence).toBe(0);
    expect(failed.content.freshness).toEqual(
      expect.objectContaining({
        state: "blocked",
        pending_records: 1,
        failure_code: "NEO4J_TRANSACTION_FAILED",
      }),
    );
    expect(
      registry.getRepairQueue(checkpoint.projection_checkpoint_id),
    ).toHaveLength(1);

    const current = registry.record(
      checkpoint.projection_checkpoint_id,
      outbox,
      makeAppliedRecord(),
      2,
    );
    expect(current.revision).toBe(3);
    expect(current.content.position).toEqual(
      expect.objectContaining({
        position_kind: "advanced",
        target_sequence: 1,
        graph_projection_record_id:
          "graph_projection_record_01ARZ3NDEKTSV4RRFFQ69G5FC8",
      }),
    );
    expect(current.content.freshness).toEqual({
      state: "current",
      pending_records: 0,
    });
    expect(
      registry.getRepairQueue(checkpoint.projection_checkpoint_id),
    ).toHaveLength(0);
    expect(
      registry.getProjectionRecords(checkpoint.projection_checkpoint_id),
    ).toHaveLength(2);
    expect(
      registry.getCheckpointRevision(checkpoint.projection_checkpoint_id, 2)
        ?.content.freshness.state,
    ).toBe("blocked");
  });

  it("makes exact receipt replay idempotent even with a stale caller revision", () => {
    const registry = new InMemoryGraphProjectionRegistry();
    const checkpoint = registry.register(makeCheckpoint());
    const outbox = makeOutbox();
    registry.record(
      checkpoint.projection_checkpoint_id,
      outbox,
      makeFailedRecord(),
      1,
    );
    const applied = makeAppliedRecord();
    const current = registry.record(
      checkpoint.projection_checkpoint_id,
      outbox,
      applied,
      2,
    );
    const replay = registry.record(
      checkpoint.projection_checkpoint_id,
      structuredClone(outbox),
      structuredClone(applied),
      1,
    );

    expect(replay).toBe(current);
    expect(
      registry.getProjectionRecords(checkpoint.projection_checkpoint_id),
    ).toHaveLength(2);
  });

  it("rejects changed content and effect hashes without storing partial state", () => {
    const first = new InMemoryGraphProjectionRegistry();
    const firstCheckpoint = first.register(makeCheckpoint());
    const failed = makeFailedRecord();
    failed.content.outcome = {
      outcome_kind: "failed",
      failure: {
        code: "NEO4J_TRANSACTION_FAILED",
        message: "Changed beneath the old hash.",
        retryable: true,
      },
    };
    expectCode(
      () =>
        first.record(
          firstCheckpoint.projection_checkpoint_id,
          makeOutbox(),
          failed,
          1,
        ),
      "PROJECTION_RECORD_CONTENT_HASH_MISMATCH",
    );
    expect(
      first.getProjectionRecords(firstCheckpoint.projection_checkpoint_id),
    ).toHaveLength(0);
    expect(
      first.getCheckpoint(firstCheckpoint.projection_checkpoint_id)?.revision,
    ).toBe(1);

    const second = new InMemoryGraphProjectionRegistry();
    const secondCheckpoint = second.register(makeCheckpoint());
    second.record(
      secondCheckpoint.projection_checkpoint_id,
      makeOutbox(),
      makeFailedRecord(),
      1,
    );
    const applied = makeAppliedRecord();
    if (applied.content.outcome.outcome_kind !== "applied") {
      throw new Error("Expected an applied fixture.");
    }
    applied.content.outcome.effect.objects[0].object_revision = 1;
    applied.content_hash = canonicalHash(applied.content);
    expectCode(
      () =>
        second.record(
          secondCheckpoint.projection_checkpoint_id,
          makeOutbox(),
          applied,
          2,
        ),
      "PROJECTION_EFFECT_HASH_MISMATCH",
    );
    expect(
      second.getProjectionRecords(secondCheckpoint.projection_checkpoint_id),
    ).toHaveLength(1);
    expect(
      second.getCheckpoint(secondCheckpoint.projection_checkpoint_id)?.revision,
    ).toBe(2);
  });

  it("rejects a well-hashed stale graph effect against the event revisions", () => {
    const registry = new InMemoryGraphProjectionRegistry();
    const checkpoint = registry.register(makeCheckpoint());
    registry.record(
      checkpoint.projection_checkpoint_id,
      makeOutbox(),
      makeFailedRecord(),
      1,
    );
    const applied = makeAppliedRecord();
    if (applied.content.outcome.outcome_kind !== "applied") {
      throw new Error("Expected an applied fixture.");
    }
    applied.content.outcome.effect.objects[0].object_revision = 1;
    rehashRecord(applied);

    expectCode(
      () =>
        registry.record(
          checkpoint.projection_checkpoint_id,
          makeOutbox(),
          applied,
          2,
        ),
      "PROJECTION_EFFECT_MISMATCH",
    );
    expect(
      registry.getCheckpoint(checkpoint.projection_checkpoint_id)?.content
        .position.target_sequence,
    ).toBe(0);
  });

  it("observes a later head but prevents a successful projection from crossing a gap", () => {
    const registry = new InMemoryGraphProjectionRegistry();
    const checkpoint = registry.register(makeCheckpoint());
    const laterOutbox = makeOutbox();
    laterOutbox.outbox_id = "outbox_01ARZ3NDEKTSV4RRFFQ69G5FC7";
    laterOutbox.outbox_position = 5;
    laterOutbox.target_sequence = 3;
    const observed = registry.observeHead(
      checkpoint.projection_checkpoint_id,
      laterOutbox,
      1,
      "2026-08-29T14:11:00.000Z",
    );
    expect(observed.content.freshness).toEqual({
      state: "catching_up",
      pending_records: 3,
    });

    const gap = makeFailedRecord();
    gap.graph_projection_record_id =
      "graph_projection_record_01ARZ3NDEKTSV4RRFFQ69G5FCB";
    gap.content.outbox_ref = {
      outbox_id: laterOutbox.outbox_id,
      outbox_position: laterOutbox.outbox_position,
      target_sequence: laterOutbox.target_sequence,
      event_id: laterOutbox.message.event.event_id,
      event_position: laterOutbox.message.event.event_position,
      stream_revision: laterOutbox.message.event.stream_revision,
    };
    if (gap.content.outcome.outcome_kind !== "failed") {
      throw new Error("Expected a failed fixture.");
    }
    gap.content.outcome.failure.code = "SEQUENCE_GAP";
    gap.content.outcome.failure.message =
      "Target sequences 1 and 2 are missing.";
    rehashRecord(gap);
    const blocked = registry.record(
      checkpoint.projection_checkpoint_id,
      laterOutbox,
      gap,
      2,
    );
    expect(blocked.content.position.target_sequence).toBe(0);
    expect(blocked.content.freshness).toEqual(
      expect.objectContaining({ state: "blocked", pending_records: 3 }),
    );

    const invalidAdvance = makeAppliedRecord();
    invalidAdvance.graph_projection_record_id =
      "graph_projection_record_01ARZ3NDEKTSV4RRFFQ69G5FCC";
    invalidAdvance.content.outbox_ref = structuredClone(gap.content.outbox_ref);
    invalidAdvance.content.attempt = 2;
    rehashRecord(invalidAdvance);
    expectCode(
      () =>
        registry.record(
          checkpoint.projection_checkpoint_id,
          laterOutbox,
          invalidAdvance,
          3,
        ),
      "PROJECTION_SEQUENCE_GAP",
    );
    expect(
      registry.getProjectionRecords(checkpoint.projection_checkpoint_id),
    ).toHaveLength(1);
  });

  it("requires the exact Project, target, identity, and outbox reference", () => {
    const cases: Array<{
      code: string;
      mutate: (
        outbox: PetraOutboxRecord,
        record: PetraGraphProjectionRecord,
      ) => void;
    }> = [
      {
        code: "PROJECTION_OUTBOX_TARGET_INVALID",
        mutate: (outbox) => {
          outbox.target = "interface_authority";
        },
      },
      {
        code: "PROJECTION_OUTBOX_PROJECT_MISMATCH",
        mutate: (outbox) => {
          outbox.partition_key = "project_01ARZ3NDEKTSV4RRFFQ69G5FCF";
        },
      },
      {
        code: "PROJECTION_IDENTITY_MISMATCH",
        mutate: (_outbox, record) => {
          record.projection.projection_version = "2.0.0";
          rehashRecord(record);
        },
      },
      {
        code: "PROJECTION_OUTBOX_REFERENCE_MISMATCH",
        mutate: (_outbox, record) => {
          record.content.outbox_ref.outbox_position = 4;
          rehashRecord(record);
        },
      },
    ];
    for (const testCase of cases) {
      const registry = new InMemoryGraphProjectionRegistry();
      const checkpoint = registry.register(makeCheckpoint());
      const outbox = makeOutbox();
      const record = makeFailedRecord();
      testCase.mutate(outbox, record);
      expectCode(
        () =>
          registry.record(
            checkpoint.projection_checkpoint_id,
            outbox,
            record,
            1,
          ),
        testCase.code,
      );
      expect(
        registry.getProjectionRecords(checkpoint.projection_checkpoint_id),
      ).toHaveLength(0);
    }
  });

  it("enforces optimistic checkpoint revisions and contiguous attempts", () => {
    const staleRegistry = new InMemoryGraphProjectionRegistry();
    const staleCheckpoint = staleRegistry.register(makeCheckpoint());
    expectCode(
      () =>
        staleRegistry.record(
          staleCheckpoint.projection_checkpoint_id,
          makeOutbox(),
          makeFailedRecord(),
          2,
        ),
      "STALE_CHECKPOINT_REVISION",
    );

    const attemptRegistry = new InMemoryGraphProjectionRegistry();
    const attemptCheckpoint = attemptRegistry.register(makeCheckpoint());
    expectCode(
      () =>
        attemptRegistry.record(
          attemptCheckpoint.projection_checkpoint_id,
          makeOutbox(),
          makeAppliedRecord(),
          1,
        ),
      "PROJECTION_ATTEMPT_INVALID",
    );
    expect(
      attemptRegistry.getProjectionRecords(
        attemptCheckpoint.projection_checkpoint_id,
      ),
    ).toHaveLength(0);
  });
});
