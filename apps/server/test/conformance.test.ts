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
  PetraInteractionCustomEvent,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionRun,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { PetraInteractionRuntime } from "@petra/core";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { startPetraServer, type PetraServer } from "../src/server.js";
import {
  REVIEW_FIXTURE_ACTOR,
  REVIEW_FIXTURE_CAPABILITY,
  createDurableReviewFixture,
} from "./durable-review-fixture.js";

const TOKEN = "petra-conformance-token";

const inputFor = (
  runId: string,
  options: {
    mode?: "success" | "review" | "terminal_error";
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
      fixtureMode: options.mode ?? "success",
      afterSequence: options.afterSequence ?? 0,
    },
  },
});

const rawRun = async (
  server: PetraServer,
  runId: string,
  options: {
    mode?: "success" | "review" | "terminal_error";
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

    server.runtime.recordDelivery("run_hc03_error", "write_error");
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
