import { readFileSync } from "node:fs";

import type { PetraDomainEvent } from "@petra/contracts";
import { describe, expect, it } from "vitest";

import { replayScientificAuthority } from "../src/authority-event-replay.js";

const readEvent = (name: string): PetraDomainEvent =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/domain-event-${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraDomainEvent;

const stream = (): PetraDomainEvent[] => [
  readEvent("change-set-submitted"),
  readEvent("approval-recorded"),
  readEvent("change-set-applied"),
];

describe("scientific authority event replay", () => {
  it("reconstructs the exact active trusted revisions from accepted events", () => {
    const events = stream();
    const applied = events[2];
    if (applied?.event.event_type !== "change_set.applied") {
      throw new Error("Expected applied event fixture.");
    }
    const replay = replayScientificAuthority(applied.project_id, events);
    expect(replay).toEqual({
      projectId: applied.project_id,
      throughStreamRevision: 3,
      throughEventPosition: applied.event_position,
      claims: [applied.event.payload.claim],
      assertions: [applied.event.payload.assertion],
      appliedChangeSetIds: [applied.event.payload.change_set_id],
    });
  });

  it("replays an empty Project stream as explicit empty authority", () => {
    expect(
      replayScientificAuthority("project_01ARZ3NDEKTSV4RRFFQ69G5FAW", []),
    ).toEqual({
      projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      throughStreamRevision: 0,
      throughEventPosition: 0,
      claims: [],
      assertions: [],
      appliedChangeSetIds: [],
    });
  });

  it("rejects stream gaps and cross-Project events", () => {
    const gap = stream();
    if (gap[1] === undefined) throw new Error("Expected approval fixture.");
    gap[1].stream_revision = 3;
    expect(() =>
      replayScientificAuthority(gap[0]?.project_id ?? "", gap),
    ).toThrowError(
      expect.objectContaining({ code: "AUTHORITY_REPLAY_STREAM_GAP" }),
    );

    const crossed = stream();
    if (crossed[1] === undefined) throw new Error("Expected approval fixture.");
    crossed[1].project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    expect(() =>
      replayScientificAuthority(crossed[0]?.project_id ?? "", crossed),
    ).toThrowError(
      expect.objectContaining({ code: "AUTHORITY_REPLAY_PROJECT_MISMATCH" }),
    );
  });

  it("rejects a discontinuous or duplicated application", () => {
    const discontinuous = stream();
    const applied = discontinuous[2];
    if (applied?.event.event_type !== "change_set.applied") {
      throw new Error("Expected applied event fixture.");
    }
    applied.event.payload.prior_claim_revision = 2;
    expect(() =>
      replayScientificAuthority(applied.project_id, discontinuous),
    ).toThrowError(
      expect.objectContaining({ code: "AUTHORITY_REPLAY_REVISION_INVALID" }),
    );

    const duplicated = stream();
    const duplicate = structuredClone(duplicated[2]);
    if (duplicate === undefined) throw new Error("Expected applied fixture.");
    duplicate.stream_revision = 4;
    duplicate.event_position = 4;
    duplicated.push(duplicate);
    expect(() =>
      replayScientificAuthority(duplicate.project_id, duplicated),
    ).toThrowError(
      expect.objectContaining({ code: "AUTHORITY_REPLAY_EVENT_DUPLICATE" }),
    );
  });
});
