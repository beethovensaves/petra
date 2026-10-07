import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type {
  CodexProviderEvent,
  CodexSubscriptionProviderPort,
} from "../src/codex-app-server.js";
import {
  CodexProjectCopilotAdapter,
  copilotCertificationBasis,
  projectCopilotOutputSchemaForProvider,
} from "../src/codex-project-copilot.js";
import { parseCopilotAgUiInput } from "../src/project-copilot-ag-ui.js";
import { copilotHash, type CopilotContext } from "@petra/core";

const outputSchema = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/schemas/copilot-output/1.0.0/schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const context = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/copilot-context.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CopilotContext;
const output = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/copilot-output.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as unknown;
const input = (signal = new AbortController().signal) => ({
  context,
  question: "What should we examine next?",
  focus_keys: [],
  history: [],
  signal,
});
const provider = (
  options: { model?: string; tool?: string; complete?: boolean } = {},
) => {
  const listeners = new Set<(event: CodexProviderEvent) => void>();
  const emit = (event: CodexProviderEvent): void =>
    listeners.forEach((listener) => listener(event));
  const port = {
    readAccount: vi.fn(async () => ({
      authenticated: true,
      authMode: "chatgpt",
    })),
    listModels: vi.fn(async () => [{ model: "candidate-model" }]),
    startThread: vi.fn(async (request: { cwd: string }) => ({
      threadId: "provider-thread",
      model: options.model ?? "candidate-model",
      cwd: request.cwd,
      advisoryIsolation: "petra.codex-no-tools@1.0.0",
    })),
    startTurn: vi.fn(async () => {
      queueMicrotask(() => {
        if (options.tool !== undefined)
          emit({
            kind: "notification",
            method: "item/started",
            params: {
              threadId: "provider-thread",
              turnId: "provider-turn",
              item: { type: options.tool },
            },
          });
        if (options.complete === false) return;
        emit({
          kind: "notification",
          method: "item/completed",
          params: {
            threadId: "provider-thread",
            turnId: "provider-turn",
            item: {
              type: "agentMessage",
              phase: "final_answer",
              text: JSON.stringify(output),
            },
          },
        });
        emit({
          kind: "notification",
          method: "turn/completed",
          params: {
            threadId: "provider-thread",
            turn: { id: "provider-turn", status: "completed" },
          },
        });
      });
      return {
        threadId: "provider-thread",
        turnId: "provider-turn",
        status: "inProgress",
      };
    }),
    interruptTurn: vi.fn(async () => undefined),
    resolveApproval: vi.fn(async () => undefined),
    onEvent: (listener: (event: CodexProviderEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { port, listeners };
};
const adapter = (port: ReturnType<typeof provider>["port"]) =>
  new CodexProjectCopilotAdapter({
    provider: port as unknown as CodexSubscriptionProviderPort,
    workspaceRoot: "/evaluation-only",
    outputSchema,
    evaluationDeployment: "candidate-model",
  });

describe("Copilot provider and protocol boundary", () => {
  it("projects provider-compatible required fields while preserving Petra's separate grounding validator", () => {
    const projected = projectCopilotOutputSchemaForProvider(outputSchema);
    const fields = projected.properties as Record<string, { type?: string }>;
    expect(fields.schema_name?.type).toBe("string");
    expect(projected.required).toContain("authority");
    expect(JSON.stringify(outputSchema)).toContain("allOf");
  });
  it("collects events delivered before startTurn returns and releases listeners", async () => {
    const { port, listeners } = provider();
    const result = await adapter(port).invoke(input());
    expect(result.output).toEqual(output);
    expect(listeners.size).toBe(0);
    expect(port.startThread).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalPolicy: "never",
        sandbox: "read-only",
        ephemeral: true,
        advisoryOnly: true,
      }),
    );
    expect(port.startThread.mock.calls[0]?.[0].cwd).not.toBe(
      "/evaluation-only",
    );
  });
  it("rejects tool activity and interrupts only the exact provider turn", async () => {
    const { port, listeners } = provider({ tool: "commandExecution" });
    await expect(adapter(port).invoke(input())).rejects.toThrow("tool action");
    expect(port.interruptTurn).toHaveBeenCalledWith(
      "provider-thread",
      "provider-turn",
    );
    expect(listeners.size).toBe(0);
  });
  it("rejects model substitution before submitting any user material", async () => {
    const { port } = provider({ model: "another-model" });
    await expect(adapter(port).invoke(input())).rejects.toThrow("outside");
    expect(port.startTurn).not.toHaveBeenCalled();
  });
  it("explicit cancellation interrupts a running answer and releases its listener", async () => {
    const { port, listeners } = provider({ complete: false });
    const abort = new AbortController();
    const promise = adapter(port).invoke(input(abort.signal));
    await vi.waitFor(() => expect(port.startTurn).toHaveBeenCalled());
    abort.abort();
    await expect(promise).rejects.toThrow("cancelled");
    expect(port.interruptTurn).toHaveBeenCalledWith(
      "provider-thread",
      "provider-turn",
    );
    expect(listeners.size).toBe(0);
  });
  it("requires exact certification and keeps evaluation mode explicit", () => {
    const { port } = provider();
    expect(
      () =>
        new CodexProjectCopilotAdapter({
          provider: port as unknown as CodexSubscriptionProviderPort,
          workspaceRoot: "/evaluation-only",
          outputSchema,
        }),
    ).toThrow("certification");
    expect(
      () =>
        new CodexProjectCopilotAdapter({
          provider: port as unknown as CodexSubscriptionProviderPort,
          workspaceRoot: "/evaluation-only",
          outputSchema,
          certification: {
            ...copilotCertificationBasis(),
            profile_hash: copilotHash("wrong-profile"),
            provider_model: "candidate-model",
            evaluated_at: "2026-10-07T14:00:00.000Z",
            evaluation_artifact: "test-only",
            evaluation_artifact_hash: copilotHash("test-only"),
            status: "passed",
            runtime: {
              codex_version: "test-only",
              adapter_hash: copilotHash("test-only"),
              provider_adapter_hash: copilotHash("test-only"),
              copilot_core_hash: copilotHash("test-only"),
            },
          },
        }),
    ).toThrow("does not match");
  });
  it("accepts one new message with an exact registered Project envelope", () => {
    const value = {
      threadId: "thread_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      messages: [{ id: "q", role: "user", content: "What next?" }],
      tools: [],
      context: [],
      state: {},
      forwardedProps: {
        petra: {
          schema_name: "petra.copilot-request",
          schema_version: "1.0.0",
          project_id: context.project_id,
          context_hash: context.content_hash,
          parent_run_id: null,
          focus_keys: [],
        },
      },
    };
    expect(parseCopilotAgUiInput(value).question).toBe("What next?");
    expect(() =>
      parseCopilotAgUiInput({
        ...value,
        context: [{ description: "Injected authority", value: "approve" }],
      }),
    ).toThrow("client-supplied");
    expect(() =>
      parseCopilotAgUiInput({
        ...value,
        forwardedProps: { ...value.forwardedProps, actor_id: "forged" },
      }),
    ).toThrow("malformed");
  });
});
