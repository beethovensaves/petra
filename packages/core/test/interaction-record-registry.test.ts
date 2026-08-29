import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionReplayRecord,
  PetraInteractionRun,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { InMemoryInteractionRecordRegistry } from "../src/interaction-record-registry.js";

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

const makeFeature = (): PetraInteractionFeatureManifest =>
  readFixture("interaction-feature-manifest");

const makeRun = (): PetraInteractionRun => readFixture("interaction-run");

const makeEvent = (): PetraInteractionEventRecord =>
  readFixture("interaction-event-record");

const makePendingInterrupt = (): PetraInteractionInterrupt =>
  readFixture("interaction-interrupt-pending");

const makeRespondedInterrupt = (): PetraInteractionInterrupt =>
  readFixture("interaction-interrupt-responded");

const makeReplay = (): PetraInteractionReplayRecord =>
  readFixture("interaction-replay-record");

const rehash = (value: { content: unknown; content_hash: string }): void => {
  value.content_hash = canonicalHash(value.content);
};

const expectCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

const registerRun = (
  registry: InMemoryInteractionRecordRegistry,
): PetraInteractionRun => {
  registry.registerFeatureManifest(makeFeature());
  const run = makeRun();
  registry.registerRun(run);
  return run;
};

const registerEvent = (
  registry: InMemoryInteractionRecordRegistry,
): PetraInteractionEventRecord => {
  registerRun(registry);
  const event = makeEvent();
  registry.appendEvent(event);
  return event;
};

describe("Petra-owned durable interaction records", () => {
  it("registers the feature profile and run immutably and idempotently", () => {
    const registry = new InMemoryInteractionRecordRegistry();
    const feature = makeFeature();
    const run = makeRun();
    const firstFeature = registry.registerFeatureManifest(feature);
    const firstRun = registry.registerRun(run);

    expect(registry.registerFeatureManifest(structuredClone(feature))).toBe(
      firstFeature,
    );
    expect(registry.registerRun(structuredClone(run))).toBe(firstRun);
    expect(Object.isFrozen(firstFeature.content.features)).toBe(true);
    expect(Object.isFrozen(firstRun.content.correlation)).toBe(true);
    feature.content.protocol.sdk_version = "mutated";
    run.content.correlation.protocol_run_id = "mutated";
    expect(firstFeature.content.protocol.sdk_version).toBe("0.0.59");
    expect(firstRun.content.correlation.protocol_run_id).toBe("run-m1-fixture");
  });

  it("rejects duplicate features, unregistered custom payloads, and conflicting protocol identity", () => {
    const duplicate = makeFeature();
    duplicate.content.features.push(
      structuredClone(duplicate.content.features[0]),
    );
    rehash(duplicate);
    const first = new InMemoryInteractionRecordRegistry();
    expectCode(
      () => first.registerFeatureManifest(duplicate),
      "INTERACTION_FEATURE_DUPLICATE",
    );

    const unknownSchema = makeFeature();
    unknownSchema.content.custom_events[0]!.payload_schema_ref.content_hash =
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    rehash(unknownSchema);
    const second = new InMemoryInteractionRecordRegistry();
    expectCode(
      () => second.registerFeatureManifest(unknownSchema),
      "INTERACTION_FEATURE_UNREGISTERED",
    );

    const third = new InMemoryInteractionRecordRegistry();
    registerRun(third);
    const conflict = makeRun();
    conflict.interaction_run_id = "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FDM";
    expectCode(
      () => third.registerRun(conflict),
      "INTERACTION_RUN_CORRELATION_CONFLICT",
    );
    expect(third.runRevisionCount).toBe(1);
  });

  it("appends one immutable contiguous event chain through the declared protocol profile", () => {
    const registry = new InMemoryInteractionRecordRegistry();
    registerRun(registry);
    const event = makeEvent();
    const first = registry.appendEvent(event);
    const replay = registry.appendEvent(structuredClone(event));

    expect(replay).toBe(first);
    expect(registry.eventCount).toBe(1);
    expect(
      registry.getEvents(event.interaction_run_ref.interaction_run_id),
    ).toEqual([first]);

    const gap = makeEvent();
    gap.interaction_event_record_id =
      "interaction_event_record_01ARZ3NDEKTSV4RRFFQ69G5FDN";
    gap.sequence = 3;
    gap.lineage = {
      lineage_kind: "continuation",
      previous_event_record_id: event.interaction_event_record_id,
      previous_sequence: 1,
      previous_content_hash: event.content_hash,
    };
    expectCode(
      () => registry.appendEvent(gap),
      "INTERACTION_EVENT_SEQUENCE_INVALID",
    );
    expect(registry.eventCount).toBe(1);
  });

  it("rejects protocol events outside the exact feature registration", () => {
    const registry = new InMemoryInteractionRecordRegistry();
    registerRun(registry);
    const event = makeEvent();
    if (event.content.protocol.event_type !== "CUSTOM") {
      throw new Error("Expected the custom event fixture.");
    }
    event.content.protocol.custom_event.schema_hash =
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    rehash(event);

    expectCode(
      () => registry.appendEvent(event),
      "INTERACTION_EVENT_PROTOCOL_INVALID",
    );
    expect(registry.eventCount).toBe(0);
  });

  it("advances a run revision only to the exact registered event head", () => {
    const registry = new InMemoryInteractionRecordRegistry();
    const root = registerRun(registry);
    const event = makeEvent();
    registry.appendEvent(event);

    const revision = makeRun();
    revision.revision = 2;
    revision.lineage = {
      lineage_kind: "revision",
      parent_revision: 1,
      parent_hash: root.content_hash,
    };
    revision.content.lifecycle = {
      state: "awaiting_interrupt",
      started_at: "2026-08-29T16:00:01.000Z",
      interaction_interrupt_ids: [
        "interaction_interrupt_01ARZ3NDEKTSV4RRFFQ69G5FD8",
      ],
    };
    revision.content.stream_head = {
      state: "advanced",
      event_count: 1,
      latest_sequence: 1,
      head_hash: event.content_hash,
    };
    revision.updated_at = "2026-08-29T16:00:03.000Z";
    rehash(revision);
    registry.registerRun(revision);

    expect(
      registry.getRun(root.interaction_run_id, 1)?.content.stream_head.state,
    ).toBe("empty");
    expect(
      registry.getRun(root.interaction_run_id, 2)?.content.stream_head.state,
    ).toBe("advanced");

    const wrongHead = structuredClone(revision);
    wrongHead.revision = 3;
    wrongHead.lineage = {
      lineage_kind: "revision",
      parent_revision: 2,
      parent_hash: revision.content_hash,
    };
    if (wrongHead.content.stream_head.state !== "advanced") {
      throw new Error("Expected an advanced stream head.");
    }
    wrongHead.content.stream_head.latest_sequence = 2;
    rehash(wrongHead);
    expectCode(
      () => registry.registerRun(wrongHead),
      "INTERACTION_RUN_HEAD_MISMATCH",
    );
  });

  it("links a response to one exact pending interrupt and one Petra command", () => {
    const registry = new InMemoryInteractionRecordRegistry();
    registerEvent(registry);
    const pending = makePendingInterrupt();
    const responded = makeRespondedInterrupt();
    registry.registerInterrupt(pending);
    registry.registerInterrupt(responded);

    expect(registry.interruptRevisionCount).toBe(2);

    const reboundPending = makePendingInterrupt();
    reboundPending.interaction_interrupt_id =
      "interaction_interrupt_01ARZ3NDEKTSV4RRFFQ69G5FDP";
    registry.registerInterrupt(reboundPending);
    const reboundResponse = makeRespondedInterrupt();
    reboundResponse.interaction_interrupt_id =
      reboundPending.interaction_interrupt_id;
    rehash(reboundResponse);
    expectCode(
      () => registry.registerInterrupt(reboundResponse),
      "INTERACTION_INTERRUPT_COMMAND_CONFLICT",
    );
    expect(registry.interruptRevisionCount).toBe(3);
  });

  it("records exact replay without reapplying commands or cancelling durable work", () => {
    const registry = new InMemoryInteractionRecordRegistry();
    registerEvent(registry);
    const replay = makeReplay();
    const first = registry.registerReplay(replay);

    expect(registry.registerReplay(structuredClone(replay))).toBe(first);
    expect(first.content.authority_boundary).toEqual({
      authority_reapplied: false,
      commands_reexecuted: false,
      durable_work_cancelled: false,
    });
    expect(first.content.work_unit_observation.status).toBe("requested");

    const aborted = makeReplay();
    aborted.interaction_replay_record_id =
      "interaction_replay_record_01ARZ3NDEKTSV4RRFFQ69G5FDQ";
    aborted.content.connection_id =
      "interaction_connection_01ARZ3NDEKTSV4RRFFQ69G5FDR";
    aborted.content.outcome = {
      outcome_kind: "connection_aborted",
      last_delivered_sequence: 1,
    };
    rehash(aborted);
    registry.registerReplay(aborted);
    expect(aborted.content.work_unit_observation.status).toBe("requested");
  });

  it("rejects incomplete completed replay and inaccurate delivery outcomes atomically", () => {
    const first = new InMemoryInteractionRecordRegistry();
    registerEvent(first);
    const incomplete = makeReplay();
    incomplete.content.delivered_event_refs = [];
    rehash(incomplete);
    expectCode(
      () => first.registerReplay(incomplete),
      "INTERACTION_REPLAY_OUTCOME_INVALID",
    );
    expect(first.replayCount).toBe(0);

    const second = new InMemoryInteractionRecordRegistry();
    registerEvent(second);
    const inaccurate = makeReplay();
    inaccurate.content.outcome = {
      outcome_kind: "connection_aborted",
      last_delivered_sequence: 0,
    };
    rehash(inaccurate);
    expectCode(
      () => second.registerReplay(inaccurate),
      "INTERACTION_REPLAY_OUTCOME_INVALID",
    );
    expect(second.replayCount).toBe(0);
  });
});
