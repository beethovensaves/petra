import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { EventType, type BaseEvent } from "@ag-ui/core";
import {
  PETRA_AG_UI_PROFILE,
  PetraInteractionClient,
  toAgUiCustomEvent,
} from "@petra/adapters";
import type {
  PetraModelSynthesistOutput,
  PetraInteractionCustomEvent,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionRun,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  PetraInteractionRuntime,
  type GroundedSynthesisInteractionExecutorPort,
  type GroundedSynthesisInteractionResult,
  type GroundedSynthesisTerminalPort,
} from "@petra/core";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { startPetraServer, type PetraServer } from "../src/server.js";
import {
  REVIEW_FIXTURE_ACTOR,
  REVIEW_FIXTURE_CAPABILITY,
  createDurableReviewFixture,
} from "./durable-review-fixture.js";

const TOKEN = "petra-conformance-token";

const terminalBindingFixture = () => ({
  grounded_response_id: "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FE9",
  grounded_response_revision: 1,
  grounded_response_hash:
    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  response_artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FEA",
  response_artifact_hash:
    "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  interaction_run_id: "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FD6",
  interaction_run_revision: 2,
  interaction_run_hash:
    "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
  work_unit_revision: 4,
  work_unit_spec_hash:
    "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  persisted_at: "2026-09-04T02:00:00.000Z",
});

const inputFor = (
  runId: string,
  options: {
    mode?: "success" | "review" | "terminal_error";
    workflow?: "fixture" | "grounded_synthesis";
    afterSequence?: number;
  } = {},
): Record<string, unknown> => ({
  threadId: `thread_${runId}`,
  runId,
  state: {},
  messages: [
    {
      id: `user_${runId}`,
      role: "user",
      content: "Test a bounded research question.",
    },
  ],
  tools: [],
  context: [],
  forwardedProps: {
    petra: {
      workflow: options.workflow ?? "fixture",
      ...(options.workflow === "grounded_synthesis"
        ? {}
        : { fixtureMode: options.mode ?? "success" }),
      afterSequence: options.afterSequence ?? 0,
    },
  },
});

const rawRun = async (
  server: PetraServer,
  runId: string,
  options: {
    mode?: "success" | "review" | "terminal_error";
    workflow?: "fixture" | "grounded_synthesis";
    afterSequence?: number;
    traceId?: string;
    token?: string;
    body?: string;
  } = {},
): Promise<Response> =>
  fetch(`${server.url}/api/interactions/run`, {
    method: "POST",
    headers: {
      accept: "text/event-stream",
      authorization: `Bearer ${options.token ?? TOKEN}`,
      "content-type": "application/json",
      "x-petra-trace-id": options.traceId ?? `trace_${runId}`,
    },
    body: options.body ?? JSON.stringify(inputFor(runId, options)),
  });

const decodeSse = (text: string): BaseEvent[] =>
  text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)) as BaseEvent);

const contractRegistry = new PetraContractRegistry();

const readAcceptedFixture = async <Value>(name: string): Promise<Value> => {
  const parsed: unknown = JSON.parse(
    await readFile(
      resolve(
        process.cwd(),
        `../../packages/contracts/fixtures/accepted/${name}`,
      ),
      "utf8",
    ),
  );
  return parsed as Value;
};

const groundedSynthesisResult =
  async (): Promise<GroundedSynthesisInteractionResult> => {
    const [output, modelRequest, modelCall] = await Promise.all([
      readAcceptedFixture<PetraModelSynthesistOutput>(
        "model-synthesist-output.json",
      ),
      readAcceptedFixture<PetraSynthesistModelRequest>(
        "model-request-synthesist.json",
      ),
      readAcceptedFixture<PetraSynthesistModelCall>(
        "model-call-synthesist.json",
      ),
    ]);
    return {
      hypothesis: {
        reference: "H12",
        descriptor:
          "The bounded explanation represented by the selected evidence",
      },
      rendered_text:
        "H12 — The bounded explanation represented by the selected evidence\n\nWhat the source reports\nThe selected WorkVersion reports the bounded Claim. [Evidence 2]",
      output,
      model_request: modelRequest,
      model_call: modelCall,
      context_packet_ref: {
        context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
        content_hash:
          "sha256:d78e5ebed5060507812eeeede6154f82e8f9bbfb19897bd8ade82909088432df",
      },
      evidence_packet_ref: {
        evidence_packet_id: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
        content_hash:
          "sha256:e3d7679bec56bc80f2bbb9702398526ca69edac1c10836132efc365c36393d64",
      },
      snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
      model_request_id: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FE4",
      model_call_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FE5",
      model_deployment_id: "model_deployment_01ARZ3NDEKTSV4RRFFQ69G5FE1",
      role_certification_id: "role_certification_01ARZ3NDEKTSV4RRFFQ69G5FE0",
      output_hash:
        "sha256:5555555555555555555555555555555555555555555555555555555555555555",
      execution_source: "provider",
      trace: {
        retrieval_ms: 8,
        lexical_ms: 3,
        graph_ms: 5,
        context_compilation_ms: 2,
        evidence_compilation_ms: 2,
        packet_compilation_ms: 4,
        model_ms: 11,
        validation_ms: 2,
        projection_ms: 1,
        total_ms: 24,
      },
      cost: {
        amount: "0",
        currency: "USD",
        accounting: "computed",
        pricing_source: "W18 certified fixture route.",
      },
    };
  };

const completedGroundedExecutor =
  async (): Promise<GroundedSynthesisInteractionExecutorPort> => {
    const result = await groundedSynthesisResult();
    return {
      execute({ onProgress }) {
        onProgress({
          stage: "retrieval",
          status: "running",
          label: "Finding a bounded evidence path",
          detail: { authority_effect: "none" },
        });
        onProgress({
          stage: "retrieval",
          status: "completed",
          label: "Bounded evidence path selected",
          detail: {
            route: "hybrid_local",
            elapsed_ms: 8,
            authority_effect: "none",
          },
        });
        onProgress({
          stage: "packet_compilation",
          status: "completed",
          label: "Immutable evidence packet ready",
          detail: {
            context_packet_id: result.context_packet_ref.context_packet_id,
            evidence_packet_id: result.evidence_packet_ref.evidence_packet_id,
            snapshot_id: result.snapshot_id,
            elapsed_ms: 4,
            authority_effect: "none",
          },
        });
        onProgress({
          stage: "model_execution",
          status: "running",
          label: "Running the certified synthesist",
          detail: { authority_effect: "none" },
        });
        onProgress({
          stage: "model_execution",
          status: "completed",
          label: "Certified synthesist call completed",
          detail: {
            model_request_id: result.model_request_id,
            model_call_id: result.model_call_id,
            model_deployment_id: result.model_deployment_id,
            role_certification_id: result.role_certification_id,
            terminal_state: "completed",
            elapsed_ms: 11,
            authority_effect: "none",
          },
        });
        onProgress({
          stage: "validation",
          status: "completed",
          label: "Evidence references and epistemic origins validated",
          detail: {
            model_request_id: result.model_request_id,
            model_call_id: result.model_call_id,
            model_deployment_id: result.model_deployment_id,
            role_certification_id: result.role_certification_id,
            terminal_state: "completed",
            elapsed_ms: 2,
            authority_effect: "none",
          },
        });
        return Promise.resolve(result);
      },
    };
  };

describe("D014 Hono conformance", () => {
  let server: PetraServer;
  let publicDir: string;

  beforeAll(async () => {
    publicDir = await mkdtemp(join(tmpdir(), "petra-public-"));
    await writeFile(
      join(publicDir, "index.html"),
      "<!doctype html><title>Petra fixture</title>",
    );
    server = await startPetraServer({ port: 0, authToken: TOKEN, publicDir });
  });

  afterAll(async () => {
    await server.shutdown();
    await rm(publicDir, { recursive: true, force: true });
  });

  test("D014-HC01: official HttpAgent completes through PetraInteractionClient", async () => {
    const client = new PetraInteractionClient({
      endpoint: `${server.url}/api/interactions/run`,
      token: TOKEN,
      traceId: "trace_hc01",
    });
    const result = await client.run({
      threadId: "thread_hc01",
      runId: "run_hc01",
      prompt: "What would distinguish the competing hypotheses?",
    });

    expect(result.events.at(0)?.type).toBe(EventType.RUN_STARTED);
    expect(result.events.at(-1)?.type).toBe(EventType.RUN_FINISHED);
    expect(result.messages.at(-1)?.content).toContain(
      "H01 — The current working explanation",
    );
  });

  test("D014-HC02: SDK SSE is byte-clean, ordered, and not double framed", async () => {
    const response = await rawRun(server, "run_hc02");
    const wire = await response.text();
    const events = decodeSse(wire);
    console.info(
      `[D014-HC02] ${events.length} events, ${new TextEncoder().encode(wire).byteLength} SSE bytes`,
    );
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(wire).not.toContain("data: data:");
    expect(events.map((event) => event.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.STATE_SNAPSHOT,
      EventType.ACTIVITY_SNAPSHOT,
      EventType.CUSTOM,
      EventType.TOOL_CALL_START,
      EventType.TOOL_CALL_ARGS,
      EventType.TOOL_CALL_END,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED,
    ]);
    for (const event of events.filter(
      (candidate) => candidate.type === EventType.CUSTOM,
    )) {
      contractRegistry.assertValid(
        "interaction-custom-event",
        "1.0.0",
        event.value,
      );
    }
  });

  test("D014-HC03: backpressure, abort, and terminal errors remain observable", async () => {
    const slowRuntime = new PetraInteractionRuntime({ stepDelayMs: 35 });
    const slowServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime: slowRuntime,
    });
    try {
      const response = await rawRun(slowServer, "run_hc03_abort");
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      await reader?.read();
      await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 30));
      await reader?.cancel();
      await slowRuntime.drain();
      expect(slowRuntime.snapshot("run_hc03_abort").delivery.aborted).toBe(1);
      expect(slowRuntime.snapshot("run_hc03_abort").status).toBe("completed");
    } finally {
      await slowServer.shutdown();
    }

    const errorResponse = await rawRun(server, "run_hc03_error", {
      mode: "terminal_error",
    });
    const errorEvents = decodeSse(await errorResponse.text());
    expect(errorEvents.at(-1)?.type).toBe(EventType.RUN_ERROR);
    expect(server.runtime.snapshot("run_hc03_error").status).toBe("failed");

    void server.runtime.recordDelivery("run_hc03_error", "write_error");
    expect(server.runtime.snapshot("run_hc03_error").delivery.writeErrors).toBe(
      1,
    );
  });

  test("D014-HC04: replay and review presentation preserve every identity", async () => {
    const traceId = "trace_hc04";
    const first = decodeSse(
      await (await rawRun(server, "run_hc04", { traceId })).text(),
    );
    const replay = decodeSse(
      await (
        await fetch(`${server.url}/api/interactions/run_hc04?after=3`, {
          headers: {
            accept: "text/event-stream",
            authorization: `Bearer ${TOKEN}`,
            "x-petra-trace-id": traceId,
          },
        })
      ).text(),
    );
    const firstMetadata = first[0]?.metadata?.petra as Record<string, unknown>;
    const replayMetadata = replay[0]?.metadata?.petra as Record<
      string,
      unknown
    >;
    expect(replayMetadata.traceId).toBe(firstMetadata.traceId);
    expect(replayMetadata.workUnitId).toBe(firstMetadata.workUnitId);
    expect(replayMetadata.modelRequestId).toBe(firstMetadata.modelRequestId);
    expect(replay.length).toBeLessThan(first.length);

    const reviewEvents = decodeSse(
      await (
        await rawRun(server, "run_hc04_review", { mode: "review" })
      ).text(),
    );
    const reviewEvent = reviewEvents.find(
      (event) =>
        event.type === EventType.CUSTOM &&
        event.name === "petra.review.interrupt",
    );
    expect(reviewEvent).toBeDefined();
    contractRegistry.assertValid(
      "interaction-custom-event",
      "1.0.0",
      reviewEvent?.value,
    );
    const reviewValue = reviewEvent?.value as PetraInteractionCustomEvent;
    if (reviewValue.event_name !== "petra.review.interrupt") {
      throw new Error("Expected a canonical Petra review interrupt event.");
    }
    const finished = reviewEvents.find(
      (event) => event.type === EventType.RUN_FINISHED,
    );
    expect(finished).toMatchObject({
      outcome: {
        type: "interrupt",
        interrupts: [
          {
            id: reviewValue.payload.interaction_interrupt_id,
            responseSchema: {
              properties: {
                decision: { enum: ["accept", "reject"] },
              },
            },
          },
        ],
      },
    });
  });

  test("M1.6-W18: grounded synthesis streams retrieval, packet, model, validation, answer, and exact terminal provenance", async () => {
    const runtime = new PetraInteractionRuntime({
      groundedSynthesisExecutor: await completedGroundedExecutor(),
    });
    const groundedServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime,
    });
    try {
      const response = await rawRun(groundedServer, "run_m16_w18", {
        workflow: "grounded_synthesis",
        traceId: "trace_m16_w18",
      });
      const events = decodeSse(await response.text());
      const activities = events.filter(
        (event) => event.type === EventType.ACTIVITY_SNAPSHOT,
      );
      expect(
        activities.map(
          (event) =>
            (event as BaseEvent & { activityType: string }).activityType,
        ),
      ).toEqual([
        "petra.retrieval.status",
        "petra.retrieval.status",
        "petra.evidence_packet.status",
        "petra.model.status",
        "petra.model.status",
        "petra.validation.status",
        "petra.work_unit.status",
      ]);

      const validationIndex = events.findIndex(
        (event) =>
          event.type === EventType.ACTIVITY_SNAPSHOT &&
          (event as BaseEvent & { activityType: string }).activityType ===
            "petra.validation.status",
      );
      const textIndex = events.findIndex(
        (event) => event.type === EventType.TEXT_MESSAGE_START,
      );
      expect(validationIndex).toBeGreaterThan(-1);
      expect(textIndex).toBeGreaterThan(validationIndex);

      const text = events.find(
        (event) => event.type === EventType.TEXT_MESSAGE_CONTENT,
      ) as BaseEvent & { delta: string };
      expect(text.delta.match(/H12 —/g)).toHaveLength(1);
      expect(text.delta).toContain("[Evidence 2]");

      const finished = events.find(
        (event) => event.type === EventType.RUN_FINISHED,
      ) as BaseEvent & { result: Record<string, unknown> };
      expect(finished.result).toMatchObject({
        hypothesisReference: "H12",
        contextPacketRef: {
          context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
        },
        evidencePacketRef: {
          evidence_packet_id: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
        },
        snapshotId: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
        modelRequestId: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FE4",
        modelCallId: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FE5",
        modelDeploymentId: "model_deployment_01ARZ3NDEKTSV4RRFFQ69G5FE1",
        roleCertificationId: "role_certification_01ARZ3NDEKTSV4RRFFQ69G5FE0",
        statementOrigins: [
          "source_report",
          "petra_synthesis",
          "unresolved_inference",
        ],
        trace: { total_ms: 24, validation_ms: 2 },
        cost: { amount: "0", currency: "USD" },
        authorityEffect: "none",
      });
      const answerMetadata = text.metadata?.petra as Record<string, unknown>;
      expect(answerMetadata).toMatchObject({
        traceId: "trace_m16_w18",
        modelRequestId: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FE4",
      });
      expect(runtime.snapshot("run_m16_w18")).toMatchObject({
        status: "completed",
        modelRequestId: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FE4",
      });

      const replay = decodeSse(
        await (
          await fetch(
            `${groundedServer.url}/api/interactions/run_m16_w18?after=8`,
            {
              headers: {
                accept: "text/event-stream",
                authorization: `Bearer ${TOKEN}`,
              },
            },
          )
        ).text(),
      );
      const expectedReplay = events.filter(
        (event) =>
          ((event.metadata?.petra as Record<string, unknown>)
            .sequence as number) > 8,
      );
      expect(replay).toEqual(expectedReplay);
    } finally {
      await groundedServer.shutdown();
    }
  });

  test("M1.6-W20: durable terminal persistence completes before answer text", async () => {
    let persisted = false;
    let presentationPersisted = false;
    const terminal: GroundedSynthesisTerminalPort = {
      persist: async () => {
        await Promise.resolve();
        persisted = true;
        return {
          grounded_response_id: "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FE9",
          grounded_response_revision: 1,
          grounded_response_hash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          response_artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FEA",
          response_artifact_hash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          interaction_run_id: "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FD6",
          interaction_run_revision: 2,
          interaction_run_hash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
          work_unit_revision: 4,
          work_unit_spec_hash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          persisted_at: "2026-09-04T02:00:00.000Z",
        };
      },
      persistPresentation: async ({ events }) => {
        expect(events.some((event) => event.kind === "text.delta")).toBe(true);
        await Promise.resolve();
        presentationPersisted = true;
      },
    };
    const runtime = new PetraInteractionRuntime({
      groundedSynthesisExecutor: await completedGroundedExecutor(),
      groundedSynthesisTerminal: terminal,
    });
    const durableServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime,
    });
    try {
      const response = await rawRun(durableServer, "run_m16_w20", {
        workflow: "grounded_synthesis",
      });
      const events = decodeSse(await response.text());
      expect(persisted).toBe(true);
      expect(presentationPersisted).toBe(true);
      const persistenceComplete = events.findIndex(
        (event) =>
          event.type === EventType.ACTIVITY_SNAPSHOT &&
          (event as BaseEvent & { activityType: string }).activityType ===
            "petra.work_unit.status" &&
          (event as BaseEvent & { content?: { stage?: string } }).content
            ?.stage === "persistence" &&
          (event as BaseEvent & { content?: { status?: string } }).content
            ?.status === "completed",
      );
      const textStart = events.findIndex(
        (event) => event.type === EventType.TEXT_MESSAGE_START,
      );
      expect(persistenceComplete).toBeGreaterThan(-1);
      expect(textStart).toBeGreaterThan(persistenceComplete);
      const finished = events.find(
        (event) => event.type === EventType.RUN_FINISHED,
      ) as BaseEvent & { result: Record<string, unknown> };
      expect(finished.result.terminalBinding).toMatchObject({
        grounded_response_id: "grounded_response_01ARZ3NDEKTSV4RRFFQ69G5FE9",
        interaction_run_revision: 2,
        work_unit_revision: 4,
      });
    } finally {
      await durableServer.shutdown();
    }
  });

  test("M1.6-W20: terminal persistence failure emits no scientific answer", async () => {
    const runtime = new PetraInteractionRuntime({
      groundedSynthesisExecutor: await completedGroundedExecutor(),
      groundedSynthesisTerminal: {
        persist: () => Promise.reject(new Error("database unavailable")),
      },
    });
    const failedServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime,
    });
    try {
      const response = await rawRun(failedServer, "run_m16_w20_failure", {
        workflow: "grounded_synthesis",
      });
      const events = decodeSse(await response.text());
      expect(events.at(-1)).toMatchObject({
        type: EventType.RUN_ERROR,
        code: "GROUNDED_TERMINAL_PERSISTENCE_FAILED",
        message: "database unavailable",
      });
      expect(
        events.some((event) => event.type === EventType.TEXT_MESSAGE_CONTENT),
      ).toBe(false);
    } finally {
      await failedServer.shutdown();
    }
  });

  test("M1.7-W12: answer-bearing event persistence fails closed before text", async () => {
    const runtime = new PetraInteractionRuntime({
      groundedSynthesisExecutor: await completedGroundedExecutor(),
      groundedSynthesisTerminal: {
        persist: () => Promise.resolve(terminalBindingFixture()),
        persistPresentation: () =>
          Promise.reject(new Error("interaction history unavailable")),
      },
    });
    const failedServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime,
    });
    try {
      const response = await rawRun(
        failedServer,
        "run_m17_w12_presentation_failure",
        { workflow: "grounded_synthesis" },
      );
      const events = decodeSse(await response.text());
      expect(events.at(-1)).toMatchObject({
        type: EventType.RUN_ERROR,
        code: "GROUNDED_PRESENTATION_PERSISTENCE_FAILED",
        message: "interaction history unavailable",
      });
      expect(
        events.some((event) => event.type === EventType.TEXT_MESSAGE_CONTENT),
      ).toBe(false);
    } finally {
      await failedServer.shutdown();
    }
  });

  test("M1.6-W18: grounded synthesis fails closed when unavailable or combined with fixture controls", async () => {
    const unavailable = await rawRun(server, "run_m16_w18_unavailable", {
      workflow: "grounded_synthesis",
    });
    const unavailableEvents = decodeSse(await unavailable.text());
    expect(unavailableEvents.at(-1)).toMatchObject({
      type: EventType.RUN_ERROR,
      code: "GROUNDED_SYNTHESIS_UNAVAILABLE",
    });
    expect(
      unavailableEvents.some(
        (event) => event.type === EventType.TEXT_MESSAGE_CONTENT,
      ),
    ).toBe(false);

    const conflictInput = inputFor("run_m16_w18_conflict");
    conflictInput.forwardedProps = {
      petra: {
        workflow: "grounded_synthesis",
        fixtureMode: "success",
        afterSequence: 0,
      },
    };
    const conflict = await rawRun(server, "run_m16_w18_conflict", {
      body: JSON.stringify(conflictInput),
    });
    expect(conflict.status).toBe(422);
    expect(await conflict.json()).toMatchObject({
      error: {
        code: "INTERACTION_REJECTED",
        message:
          "fixtureMode cannot be combined with the grounded_synthesis workflow.",
      },
    });
  });

  test("M1.7-W12: durable cancellation precedes provider interruption and terminal publication", async () => {
    let signalObserved = false;
    let durableCancellationApplied = false;
    let cancellationPresentationPersisted = false;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolveStarted) => {
      markStarted = resolveStarted;
    });
    const executor: GroundedSynthesisInteractionExecutorPort = {
      async execute({ signal, onProgress }) {
        onProgress({
          stage: "retrieval",
          status: "running",
          label: "Finding a bounded evidence path",
          detail: { authority_effect: "none" },
        });
        markStarted?.();
        return await new Promise<GroundedSynthesisInteractionResult>(
          (_resolve, reject) => {
            const rejectCancelled = (): void => {
              signalObserved = durableCancellationApplied;
              reject(new Error("grounded execution interrupted"));
            };
            if (signal?.aborted === true) rejectCancelled();
            else
              signal?.addEventListener("abort", rejectCancelled, {
                once: true,
              });
          },
        );
      },
    };
    const terminal: GroundedSynthesisTerminalPort = {
      startWork: () =>
        Promise.resolve({
          work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
          work_unit_revision: 3,
          work_unit_spec_hash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          state: "running",
          started_at: "2026-09-04T02:00:00.000Z",
        }),
      cancelWork: (request) => {
        expect(request.work.work_unit_revision).toBe(3);
        expect(request.reason).toBe(
          "The researcher explicitly stopped this running task.",
        );
        durableCancellationApplied = true;
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
      persistCancellation: (request) => {
        expect(request.presentation_events.at(-1)).toMatchObject({
          kind: "run.error",
          code: "WORK_UNIT_CANCELLED",
        });
        cancellationPresentationPersisted = true;
        return Promise.resolve();
      },
      persist: () => Promise.reject(new Error("must not persist an answer")),
    };
    const runtime = new PetraInteractionRuntime({
      groundedSynthesisExecutor: executor,
      groundedSynthesisTerminal: terminal,
    });
    const cancellationServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime,
    });
    try {
      const response = await rawRun(cancellationServer, "run_m16_w18_cancel", {
        workflow: "grounded_synthesis",
      });
      await started;
      const cancellation = await fetch(
        `${cancellationServer.url}/api/work-units/run_m16_w18_cancel/cancel`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FE9",
          }),
        },
      );
      expect(cancellation.status).toBe(200);
      expect(await cancellation.json()).toMatchObject({
        applied: true,
        commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FE9",
        runId: "run_m16_w18_cancel",
        workUnitId: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        workUnitRevision: 4,
        workUnitCancellationId:
          "work_unit_cancellation_01ARZ3NDEKTSV4RRFFQ69G5FEA",
      });
      const events = decodeSse(await response.text());
      expect(signalObserved).toBe(true);
      expect(cancellationPresentationPersisted).toBe(true);
      expect(events.at(-1)).toMatchObject({
        type: EventType.RUN_ERROR,
        code: "WORK_UNIT_CANCELLED",
      });
      expect(
        events.filter((event) => event.type === EventType.RUN_ERROR),
      ).toHaveLength(1);
      expect(
        events.some((event) => event.type === EventType.TEXT_MESSAGE_CONTENT),
      ).toBe(false);
      expect(runtime.snapshot("run_m16_w18_cancel").status).toBe("cancelled");
    } finally {
      await cancellationServer.shutdown();
    }
  });

  test("M1.7-W12: aborting one AG-UI delivery does not issue a durable cancellation", async () => {
    const completed = await completedGroundedExecutor();
    let releaseExecution: (() => void) | undefined;
    const released = new Promise<void>((resolve) => {
      releaseExecution = resolve;
    });
    let executionStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      executionStarted = resolve;
    });
    let cancellationCommands = 0;
    const terminal: GroundedSynthesisTerminalPort = {
      startWork: () =>
        Promise.resolve({
          work_unit_id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
          work_unit_revision: 3,
          work_unit_spec_hash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          state: "running",
          started_at: "2026-09-04T02:00:00.000Z",
        }),
      cancelWork: () => {
        cancellationCommands += 1;
        return Promise.reject(new Error("must not cancel durable work"));
      },
      persistCancellation: () => Promise.resolve(),
      persist: () => Promise.resolve(terminalBindingFixture()),
      persistPresentation: () => Promise.resolve(),
    };
    const runtime = new PetraInteractionRuntime({
      groundedSynthesisExecutor: {
        async execute(request) {
          executionStarted?.();
          await released;
          return completed.execute(request);
        },
      },
      groundedSynthesisTerminal: terminal,
    });
    const deliveryServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime,
    });
    try {
      const response = await rawRun(deliveryServer, "run_m17_abort_only", {
        workflow: "grounded_synthesis",
      });
      await started;
      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      await reader?.read();
      const aborted = reader?.cancel();
      await new Promise<void>((resolve) => setTimeout(resolve, 30));
      releaseExecution?.();
      await aborted;
      await runtime.drain();
      expect(cancellationCommands).toBe(0);
      expect(runtime.snapshot("run_m17_abort_only")).toMatchObject({
        status: "completed",
        delivery: { aborted: 1 },
      });
    } finally {
      await deliveryServer.shutdown();
    }
  });

  test("M1.5-W16: AG-UI review resolution reaches the durable direct-review command", async () => {
    const fixture = createDurableReviewFixture();
    const reviewServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime: fixture.runtime,
      reviewAuthority: {
        actor: REVIEW_FIXTURE_ACTOR,
        capability_grant_id: REVIEW_FIXTURE_CAPABILITY,
      },
    });
    try {
      const client = new PetraInteractionClient({
        endpoint: `${reviewServer.url}/api/interactions/run`,
        token: TOKEN,
        traceId: "trace_m15_w16",
      });
      const interaction = await client.run({
        threadId: "thread-m1-fixture",
        runId: "run-m1-fixture",
        prompt: "Review the exact source-grounded proposal.",
        fixtureMode: "review",
      });
      expect(interaction.pendingInterrupts).toEqual([
        expect.objectContaining({
          id: fixture.response.interrupt_ref.interaction_interrupt_id,
          reason: "changeset_review",
        }),
      ]);

      const staleResponse = structuredClone(fixture.response);
      staleResponse.interrupt_ref.content_hash =
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const stale = await fetch(
        `${reviewServer.url}/api/commands/reviews/resolve`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(staleResponse),
        },
      );
      expect(stale.status).toBe(409);
      expect(
        fixture.evidence.getClaim(fixture.candidate.claim.claim_id)?.authority
          .zone,
      ).toBe("quarantine");

      const first = await client.resolveReview(fixture.response);
      const replay = await client.resolveReview(fixture.response);
      expect(first).toMatchObject({
        replayed: false,
        response_recorded: true,
        result: { outcome: "applied" },
      });
      expect(replay).toMatchObject({
        replayed: true,
        response_recorded: false,
        result: { outcome: "applied" },
      });
      expect(
        fixture.evidence.getClaim(fixture.candidate.claim.claim_id)?.authority
          .zone,
      ).toBe("trusted");

      const malformed = await fetch(
        `${reviewServer.url}/api/commands/reviews/resolve`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${TOKEN}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ decision: "accept" }),
        },
      );
      expect(malformed.status).toBe(422);

      const unauthorized = await fetch(
        `${reviewServer.url}/api/commands/reviews/resolve`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer wrong",
            "content-type": "application/json",
          },
          body: JSON.stringify(fixture.response),
        },
      );
      expect(unauthorized.status).toBe(401);
      expect(fixture.evidence.getEvents()).toHaveLength(3);
    } finally {
      await reviewServer.shutdown();
    }
  });

  test("D014-HC05: security and validation reject before application work", async () => {
    const before = server.runtime.diagnostics().runs;
    const unauthorized = await rawRun(server, "run_hc05_auth", {
      token: "wrong",
    });
    expect(unauthorized.status).toBe(401);
    expect(server.runtime.diagnostics().runs).toBe(before);

    const malformed = await rawRun(server, "run_hc05_bad", { body: "{}" });
    expect(malformed.status).toBe(422);
    expect(server.runtime.diagnostics().runs).toBe(before);

    const oversized = await rawRun(server, "run_hc05_large", {
      body: JSON.stringify({ padding: "x".repeat(70_000) }),
    });
    expect(oversized.status).toBe(413);
    expect(server.runtime.diagnostics().runs).toBe(before);
    expect(malformed.headers.get("x-petra-request-id")).toMatch(/^request_/);
    expect(malformed.headers.get("x-petra-trace-id")).toBe(
      "trace_run_hc05_bad",
    );
  });

  test("D014-HC06: one trace correlates request, run, WorkUnit, model request, and command", async () => {
    const traceId = "trace_hc06";
    const response = await rawRun(server, "run_hc06", { traceId });
    const events = decodeSse(await response.text());
    const metadata = events.map(
      (event) => event.metadata?.petra as Record<string, unknown>,
    );
    expect(metadata.every((item) => item.traceId === traceId)).toBe(true);
    expect(new Set(metadata.map((item) => item.requestId)).size).toBe(1);
    expect(new Set(metadata.map((item) => item.workUnitId)).size).toBe(1);
    expect(new Set(metadata.map((item) => item.modelRequestId)).size).toBe(1);
  });

  test("D014-HC07: SPA fallback never intercepts API or diagnostics", async () => {
    const page = await fetch(`${server.url}/projects/demo/hypotheses/H01`);
    expect(await page.text()).toContain("Petra fixture");
    expect(
      (await fetch(`${server.url}/health`)).headers.get("content-type"),
    ).toContain("application/json");
    const missingApi = await fetch(`${server.url}/api/not-a-route`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(missingApi.status).toBe(404);
    expect(missingApi.headers.get("content-type")).toContain(
      "application/json",
    );
  });

  test("D014-HC08: representative concurrent streams complete within a recorded envelope", async () => {
    const durations = await Promise.all(
      Array.from({ length: 20 }, async (_, index) => {
        const started = performance.now();
        const client = new PetraInteractionClient({
          endpoint: `${server.url}/api/interactions/run`,
          token: TOKEN,
          traceId: `trace_hc08_${index}`,
        });
        await client.run({
          threadId: `thread_hc08_${index}`,
          runId: `run_hc08_${index}`,
          prompt: "Map a bounded evidence path.",
        });
        return performance.now() - started;
      }),
    );
    const sorted = durations.toSorted((left, right) => left - right);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] as number;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] as number;
    console.info(
      `[D014-HC08] completed=${durations.length} p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms`,
    );
    expect({ completed: durations.length, p50, p95 }).toMatchObject({
      completed: 20,
    });
    expect(p95).toBeLessThan(5_000);
  });

  test("D014-HC09: Hono and AG-UI do not leak into core", async () => {
    const coreSource = await readFile(
      resolve(process.cwd(), "../../packages/core/src/interaction-runtime.ts"),
      "utf8",
    );
    expect(coreSource).not.toMatch(/from ["'](?:hono|@ag-ui)/);
    const workbenchSource = await readFile(
      resolve(process.cwd(), "../workbench/src/router.tsx"),
      "utf8",
    );
    expect(workbenchSource).not.toMatch(/from ["']hono/);
  });

  test("D014-HC10: graceful shutdown drains accepted work and rejects new admission", async () => {
    const runtime = new PetraInteractionRuntime({ stepDelayMs: 30 });
    const drainingServer = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      runtime,
    });
    const response = await rawRun(drainingServer, "run_hc10");
    expect(response.status).toBe(200);
    await drainingServer.shutdown();
    expect(runtime.accepting).toBe(false);
    expect(runtime.snapshot("run_hc10").status).toBe("completed");
    expect(() =>
      runtime.startInteraction({
        threadId: "thread_after_shutdown",
        runId: "run_after_shutdown",
        prompt: "Should not start",
        requestId: "request_after_shutdown",
        traceId: "trace_after_shutdown",
      }),
    ).toThrow(/not accepting/);
  });

  test("M1.1-W14: canonical run, state, tool, custom-event, and interrupt records map through the AG-UI adapter", async () => {
    const contractsRoot = resolve(process.cwd(), "../../packages/contracts");
    const feature = JSON.parse(
      await readFile(
        resolve(
          contractsRoot,
          "fixtures/accepted/interaction-feature-manifest.json",
        ),
        "utf8",
      ),
    ) as PetraInteractionFeatureManifest;
    const run = JSON.parse(
      await readFile(
        resolve(contractsRoot, "fixtures/accepted/interaction-run.json"),
        "utf8",
      ),
    ) as PetraInteractionRun;
    const interrupt = JSON.parse(
      await readFile(
        resolve(
          contractsRoot,
          "fixtures/accepted/interaction-interrupt-pending.json",
        ),
        "utf8",
      ),
    ) as PetraInteractionInterrupt;
    const customEvent = JSON.parse(
      await readFile(
        resolve(
          contractsRoot,
          "fixtures/accepted/interaction-custom-event.json",
        ),
        "utf8",
      ),
    ) as PetraInteractionCustomEvent;
    const mapped = toAgUiCustomEvent(customEvent, { petra: { sequence: 1 } });

    expect(feature.content.protocol).toMatchObject({
      name: "ag-ui",
      sdk_version: PETRA_AG_UI_PROFILE.sdkVersion,
    });
    expect(
      feature.content.custom_events.map((event) => event.event_name),
    ).toEqual(Object.keys(PETRA_AG_UI_PROFILE.customEvents));
    expect(feature.content.standard_events).toEqual(
      PETRA_AG_UI_PROFILE.standardEvents,
    );
    expect(run.content.correlation).toMatchObject({
      protocol_thread_id: "thread-m1-fixture",
      protocol_run_id: "run-m1-fixture",
    });
    expect(interrupt.content).toMatchObject({
      state: "pending",
      interrupt_kind: "review",
      authority_effect: "none",
    });
    expect(mapped).toMatchObject({
      type: EventType.CUSTOM,
      name: customEvent.event_name,
      value: customEvent,
      metadata: { petra: { sequence: 1 } },
    });
  });
});
