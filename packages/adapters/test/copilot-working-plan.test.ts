import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type {
  CodexProviderEvent,
  CodexSubscriptionProviderPort,
} from "../src/codex-app-server.js";
import {
  CodexWorkingPlanAdapter,
  workingPlanCertificationBasis,
  workingPlanOutputSchemaForProvider,
} from "../src/codex-working-plan.js";
import { copilotHash, type CopilotContext } from "@petra/core";
const outputSchema = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/schemas/copilot-working-plan/1.0.0/schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const original = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/copilot-context.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as CopilotContext;
const { content_hash: ignored, ...content } = original;
void ignored;
const context = { ...content, content_hash: copilotHash(content) };
const output = {
  schema_name: "petra.copilot-working-plan",
  schema_version: "1.0.0",
  authority: "proposed_only",
  explanation: "There is no eligible preview. Please select material first.",
  proposals: [],
};
const input = () => ({
  project_id: context.project_id,
  context,
  question: "What can we work on?",
  previews: [],
  signal: new AbortController().signal,
});
const provider = (
  options: { model?: string; tool?: string; complete?: boolean } = {},
) => {
  const listeners = new Set<(event: CodexProviderEvent) => void>();
  const emit = (event: CodexProviderEvent): void =>
    listeners.forEach((listener) => listener(event));
  const port = {
    readAccount: vi.fn(() =>
      Promise.resolve({
        authenticated: true,
        authMode: "chatgpt",
      }),
    ),
    listModels: vi.fn(() => Promise.resolve([{ model: "candidate-model" }])),
    startThread: vi.fn((request: { cwd: string }) =>
      Promise.resolve({
        threadId: "provider-thread",
        model: options.model ?? "candidate-model",
        cwd: request.cwd,
        advisoryIsolation: "petra.codex-no-tools@1.0.0",
      }),
    ),
    startTurn: vi.fn(() => {
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
      return Promise.resolve({
        threadId: "provider-thread",
        turnId: "provider-turn",
        status: "inProgress",
      });
    }),
    interruptTurn: vi.fn(() => Promise.resolve(undefined)),
    resolveApproval: vi.fn(() => Promise.resolve(undefined)),
    onEvent: (listener: (event: CodexProviderEvent) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return { port, listeners };
};
const adapter = (port: ReturnType<typeof provider>["port"]) =>
  new CodexWorkingPlanAdapter({
    provider: port as unknown as CodexSubscriptionProviderPort,
    workspaceRoot: "/evaluation-only",
    outputSchema,
    evaluationDeployment: "candidate-model",
  });
describe("working-structure model deployment boundary", () => {
  it("returns validated typed proposed output through an isolated no-tool provider and releases listeners", async () => {
    const { port, listeners } = provider();
    const response = await adapter(port).invokeWorkingPlan(input());
    expect(response.output).toEqual(output);
    expect(listeners.size).toBe(0);
    expect(port.startThread).toHaveBeenCalledWith(
      expect.objectContaining({
        advisoryOnly: true,
        approvalPolicy: "never",
        sandbox: "read-only",
      }),
    );
    expect(port.startTurn).toHaveBeenCalledWith(
      expect.objectContaining({ model: "candidate-model" }),
    );
  });
  it("projects every required field of the registered typed plan", () => {
    const schema = workingPlanOutputSchemaForProvider(outputSchema);
    expect(schema.required).toEqual([
      "schema_name",
      "schema_version",
      "authority",
      "explanation",
      "proposals",
    ]);
    expect(JSON.stringify(schema)).toContain("preview_key");
  });
  it("refuses an advisory or fixed-prompt certificate for the working-structure role", () => {
    const { port } = provider();
    const certification = {
      ...workingPlanCertificationBasis(),
      role: "petra.project-copilot@1.0.0",
      provider_model: "candidate-model",
      status: "passed",
    };
    expect(
      () =>
        new CodexWorkingPlanAdapter({
          provider: port as unknown as CodexSubscriptionProviderPort,
          workspaceRoot: "/evaluation-only",
          outputSchema,
          certification: certification as never,
        }),
    ).toThrow(/exact instructions/u);
    expect(
      () =>
        new CodexWorkingPlanAdapter({
          provider: port as unknown as CodexSubscriptionProviderPort,
          workspaceRoot: "/evaluation-only",
          outputSchema,
        }),
    ).toThrow(/own certification/u);
  });
  it("rejects forbidden tool activity and does not substitute a provider model", async () => {
    const first = provider({ tool: "commandExecution" });
    await expect(
      adapter(first.port).invokeWorkingPlan(input()),
    ).rejects.toThrow(/tool action/u);
    expect(first.port.interruptTurn).toHaveBeenCalledTimes(1);
    const second = provider({ model: "another-model" });
    await expect(
      adapter(second.port).invokeWorkingPlan(input()),
    ).rejects.toThrow(/registered deployment/u);
    expect(second.port.startTurn).not.toHaveBeenCalled();
  });
  it("rejects invalid preview context before accessing the model provider", async () => {
    const { port } = provider();
    await expect(
      adapter(port).invokeWorkingPlan({
        ...input(),
        project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAX",
      }),
    ).rejects.toThrow(/another Project/u);
    expect(port.readAccount).not.toHaveBeenCalled();
    expect(port.startThread).not.toHaveBeenCalled();
  });
});
