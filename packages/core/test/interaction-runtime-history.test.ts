import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type { PetraInteractionRun, PetraWorkUnit } from "@petra/contracts";
import { describe, expect, it } from "vitest";

import type {
  InteractionDeliveryRecord,
  InteractionHistoryPort,
} from "../src/interaction-history.js";
import {
  PetraInteractionRuntime,
  type PetraInteractionEvent,
} from "../src/interaction-runtime.js";

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

describe("durable interaction runtime restoration", () => {
  it("rehydrates a completed event suffix without starting work again", async () => {
    const run = readFixture<PetraInteractionRun>("interaction-run");
    const prompt = "What does the durable evidence support?";
    run.content.input.input_hash = `sha256:${createHash("sha256")
      .update(JSON.stringify({ prompt }))
      .digest("hex")}`;
    run.content.lifecycle = {
      state: "completed",
      started_at: "2026-08-29T16:00:01.000Z",
      ended_at: "2026-08-29T16:00:03.000Z",
      outcome_code: "INTERACTION_PRESENTATION_READY",
    };
    const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
    const envelope = {
      threadId: run.content.correlation.protocol_thread_id,
      runId: run.content.correlation.protocol_run_id,
      workUnitId: run.content.correlation.work_unit_ref.work_unit_id,
      modelRequestId: run.content.correlation.model_request_id!,
      requestId: run.content.correlation.request_id,
      traceId: run.content.correlation.trace_id,
    };
    const events = [
      {
        ...envelope,
        sequence: 1,
        timestamp: Date.parse("2026-08-29T16:00:01.000Z"),
        kind: "run.started",
      },
      {
        ...envelope,
        sequence: 2,
        timestamp: Date.parse("2026-08-29T16:00:03.000Z"),
        kind: "run.finished",
        result: { authorityEffect: "none" },
      },
    ] satisfies PetraInteractionEvent[];
    const deliveries: InteractionDeliveryRecord[] = [];
    const history: InteractionHistoryPort = {
      persistEvents: () => Promise.reject(new Error("not used")),
      listEventRecords: () => Promise.reject(new Error("not used")),
      advanceRun: () => Promise.reject(new Error("not used")),
      restore: (threadId, runId) =>
        Promise.resolve(
          threadId === envelope.threadId && runId === envelope.runId
            ? { run, workUnit, events, status: "completed" }
            : undefined,
        ),
      recordDelivery: (delivery) => {
        deliveries.push(delivery);
        return Promise.resolve(undefined);
      },
    };
    const runtime = new PetraInteractionRuntime({
      interactionHistory: history,
      groundedSynthesisExecutor: {
        execute: () => Promise.reject(new Error("must not execute")),
      },
    });

    expect(
      await runtime.restoreInteraction(
        envelope.threadId,
        envelope.runId,
        prompt,
      ),
    ).toMatchObject({ status: "completed", eventCount: 2 });
    await expect(
      runtime.restoreInteraction(
        envelope.threadId,
        envelope.runId,
        "A conflicting research prompt",
      ),
    ).rejects.toThrow("Run input conflicts");
    const suffix: PetraInteractionEvent[] = [];
    for await (const event of runtime.streamInteraction(envelope.runId, 1)) {
      suffix.push(event);
    }
    expect(suffix).toEqual([events[1]]);

    await runtime.recordDelivery(envelope.runId, "completed", {
      connectionId: "interaction_connection_01ARZ3NDEKTSV4RRFFQ69G5FDS",
      deliveryKind: "resume",
      afterSequence: 1,
      lastDeliveredSequence: 2,
      startedAt: "2026-08-29T16:00:04.000Z",
      completedAt: "2026-08-29T16:00:05.000Z",
    });
    expect(deliveries).toEqual([
      expect.objectContaining({
        threadId: envelope.threadId,
        runId: envelope.runId,
        outcome: "completed",
        afterSequence: 1,
        lastDeliveredSequence: 2,
      }),
    ]);
    expect(runtime.diagnostics()).toMatchObject({ runs: 1, activeRuns: 0 });
  });
});
