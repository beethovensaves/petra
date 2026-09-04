import { describe, expect, it } from "vitest";

import type {
  GroundedSynthesisInteractionExecutorPort,
  GroundedSynthesisTerminalPort,
} from "../src/grounded-synthesis-interaction.js";
import {
  PetraInteractionRuntime,
  type PetraInteractionEvent,
} from "../src/interaction-runtime.js";

describe("durable grounded cancellation runtime", () => {
  it("waits for durable work, interrupts only after the command, and fails closed when history cannot persist", async () => {
    let releaseWork!: () => void;
    const workReady = new Promise<void>((resolve) => {
      releaseWork = resolve;
    });
    let commandApplied = false;
    let interruptedAfterCommand = false;
    const terminal: GroundedSynthesisTerminalPort = {
      async startWork() {
        await workReady;
        return {
          work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
          work_unit_revision: 3,
          work_unit_spec_hash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          state: "running",
          started_at: "2026-09-04T03:00:00.000Z",
        };
      },
      cancelWork(request) {
        expect(request.work.work_unit_revision).toBe(3);
        commandApplied = true;
        return Promise.resolve({
          work_unit_cancellation_id:
            "work_unit_cancellation_01ARZ3NDEKTSV4RRFFQ69G5FEA",
          command_id: request.command_id,
          cancellation_hash:
            "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          applied: true,
          work_unit_id: request.work.work_unit_id,
          work_unit_revision: 4,
          work_unit_spec_hash: request.work.work_unit_spec_hash,
          cancelled_at: request.requested_at,
        });
      },
      persistCancellation(request) {
        expect(request.presentation_events.at(-1)).toMatchObject({
          kind: "run.error",
          code: "WORK_UNIT_CANCELLED",
        });
        return Promise.reject(new Error("interaction history unavailable"));
      },
      persist: () => Promise.reject(new Error("must not persist an answer")),
    };
    const executor: GroundedSynthesisInteractionExecutorPort = {
      execute({ signal }) {
        return new Promise((_resolve, reject) => {
          const interrupted = (): void => {
            interruptedAfterCommand = commandApplied;
            reject(new Error("provider interrupted"));
          };
          if (signal?.aborted === true) interrupted();
          else signal?.addEventListener("abort", interrupted, { once: true });
        });
      },
    };
    const runtime = new PetraInteractionRuntime({
      now: () => Date.parse("2026-09-04T03:00:01.000Z"),
      groundedSynthesisExecutor: executor,
      groundedSynthesisTerminal: terminal,
    });
    runtime.startInteraction({
      threadId: "thread-runtime-cancellation",
      runId: "run-runtime-cancellation",
      prompt: "Stop this run before it produces an answer.",
      requestId: "request-runtime-cancellation",
      traceId: "trace-runtime-cancellation",
      workflow: "grounded_synthesis",
    });

    const cancellation = runtime.cancel({
      commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FE9",
      runId: "run-runtime-cancellation",
      reason: "The researcher explicitly stopped this running task.",
    });
    expect(commandApplied).toBe(false);
    releaseWork();
    await expect(cancellation).resolves.toMatchObject({
      applied: true,
      workUnitRevision: 4,
      workUnitCancellationId:
        "work_unit_cancellation_01ARZ3NDEKTSV4RRFFQ69G5FEA",
    });
    await runtime.drain();

    const events: PetraInteractionEvent[] = [];
    for await (const event of runtime.streamInteraction(
      "run-runtime-cancellation",
    )) {
      events.push(event);
    }
    expect(interruptedAfterCommand).toBe(true);
    expect(events.at(-1)).toMatchObject({
      kind: "run.error",
      code: "GROUNDED_CANCELLATION_PERSISTENCE_FAILED",
      message: "interaction history unavailable",
    });
    expect(events.some((event) => event.kind === "text.delta")).toBe(false);
    expect(
      events.some(
        (event) =>
          event.kind === "run.error" && event.code === "WORK_UNIT_CANCELLED",
      ),
    ).toBe(false);
    expect(runtime.snapshot("run-runtime-cancellation").status).toBe(
      "cancelled",
    );
  });
});
