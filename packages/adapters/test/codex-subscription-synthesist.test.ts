import { readFileSync } from "node:fs";

import type { SynthesistAdapterRequest } from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import {
  CodexSubscriptionSynthesistAdapter,
  type CodexAccountSummary,
  type CodexManagedLoginResult,
  type CodexModelSummary,
  type CodexProviderDiagnostics,
  type CodexProviderEvent,
  type CodexSubscriptionProviderPort,
  type CodexThreadStartRequest,
  type CodexThreadSummary,
  type CodexTurnStartRequest,
  type CodexTurnSummary,
} from "../src/server.js";
import {
  projectSynthesistOutputSchemaForProvider,
  type ModelAdapterClock,
} from "../src/model-adapter-common.js";

const output = {
  schema_name: "petra.model-synthesist-output",
  schema_version: "1.0.0",
  statements: [
    {
      statement_key: "source_report_1",
      origin: "source_report",
      text: "The selected WorkVersion reports the bounded Claim.",
      evidence_refs: [
        {
          context_selection_order: 2,
          object_kind: "assertion",
          object_id: "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
          object_revision: 2,
          object_hash:
            "sha256:80dcb2c8926d758f99a45d9ca84b720e23f4583c45583586d28998b9bc013f8d",
          source_span_selection_orders: [3],
        },
      ],
      limitations: ["This is source attribution, not proof."],
    },
  ],
  coverage: {
    state: "complete_for_context",
    statement: "The response covers the bounded packet only.",
    material_omissions_acknowledged: true,
    abstract_only_sources_used: false,
    contrary_evidence_status: "checked_none_in_context",
    qualifying_evidence_status: "checked_none_in_context",
  },
};

const outputSchema = {
  name: "petra_model_synthesist_output",
  description: "A bounded Petra scientific synthesis.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["schema_name", "schema_version", "statements", "coverage"],
    properties: {
      schema_name: { type: "string", const: output.schema_name },
      schema_version: { type: "string", const: output.schema_version },
      statements: { type: "array" },
      coverage: { type: "object" },
    },
  },
} as const;

const request = (): SynthesistAdapterRequest => ({
  model_request_id: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FE4",
  model_call_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FE5",
  deployment: {
    model_deployment_id: "model_deployment_01ARZ3NDEKTSV4RRFFQ69G5FE1",
    provider_id: "provider_01ARZ3NDEKTSV4RRFFQ69G5FE2",
    provider_kind: "codex_app_server",
    provider_model: "gpt-5.6-terra",
    observed_revision: "gpt-5.6-terra",
    replayability: "best_effort",
    execution_location: "remote",
    structured_output: true,
    max_context_tokens: 131_072,
  },
  input: {
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
    messages: [
      {
        role: "system",
        content: "Synthesize only from Petra's supplied EvidencePacket.",
      },
      {
        role: "user",
        content: "Explain the selected report and its limits.",
      },
    ],
    context_selections: [
      {
        context_selection_order: 2,
        object_ref: {
          object_kind: "assertion",
          object_id: "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
          object_revision: 2,
          object_hash:
            "sha256:80dcb2c8926d758f99a45d9ca84b720e23f4583c45583586d28998b9bc013f8d",
        },
        rendered_content:
          "Assertion: The selected WorkVersion ASSERTS the selected Claim.",
        source_span_selection_orders: [3],
      },
    ],
    content_hash:
      "sha256:2222222222222222222222222222222222222222222222222222222222222222",
  },
  parameters: { temperature: 0, max_output_tokens: 1600 },
  output_contract: {
    schema_name: "model-synthesist-output",
    schema_version: "1.0.0",
    schema_hash:
      "sha256:c9feeb397df01f2772c81c53fd2edadf7154c836a273df87a8e47806b500164b",
  },
});

const clock = (...values: number[]): ModelAdapterClock => ({
  now: vi.fn(() => values.shift() ?? 0),
});

class FakeCodexSynthesistProvider implements CodexSubscriptionProviderPort {
  readonly threadRequests: CodexThreadStartRequest[] = [];
  readonly turnRequests: CodexTurnStartRequest[] = [];
  readonly #listeners = new Set<(event: CodexProviderEvent) => void>();
  authMode: CodexAccountSummary["authMode"] = "chatgpt";
  toolType: string | undefined;

  diagnostics(): CodexProviderDiagnostics {
    return {
      providerKind: "codex_app_server",
      initialized: true,
      transport: "stdio_jsonl",
      stableApiOnly: true,
      managedChatgptAuthOnly: true,
      pendingRequests: 0,
      pendingServerRequests: 0,
      scientificExtractionEligible: false,
    };
  }

  readAccount(): Promise<CodexAccountSummary> {
    return Promise.resolve({
      authenticated: this.authMode !== "none",
      authMode: this.authMode,
      planType: this.authMode === "chatgpt" ? "plus" : null,
      requiresOpenaiAuth: true,
    });
  }

  listModels(): Promise<readonly CodexModelSummary[]> {
    return Promise.resolve([]);
  }

  startManagedLogin(): Promise<CodexManagedLoginResult> {
    throw new Error("Not used by this test.");
  }

  cancelManagedLogin(): Promise<void> {
    return Promise.resolve();
  }

  startThread(
    requestValue: CodexThreadStartRequest,
  ): Promise<CodexThreadSummary> {
    this.threadRequests.push(requestValue);
    return Promise.resolve({
      threadId: "thr_synthesist",
      model: requestValue.model ?? null,
      modelProvider: "openai",
      cwd: requestValue.cwd,
    });
  }

  startTurn(requestValue: CodexTurnStartRequest): Promise<CodexTurnSummary> {
    this.turnRequests.push(requestValue);
    queueMicrotask(() => {
      if (this.toolType !== undefined) {
        this.#emit({
          kind: "notification",
          method: "item/started",
          params: {
            threadId: requestValue.threadId,
            turnId: "turn_synthesist",
            item: { id: "tool_1", type: this.toolType },
          },
        });
      }
      this.#emit({
        kind: "notification",
        method: "item/completed",
        params: {
          threadId: requestValue.threadId,
          turnId: "turn_synthesist",
          item: {
            id: "message_1",
            type: "agentMessage",
            phase: "final_answer",
            text: JSON.stringify(output),
          },
        },
      });
      this.#emit({
        kind: "notification",
        method: "turn/completed",
        params: {
          threadId: requestValue.threadId,
          turn: { id: "turn_synthesist", status: "completed", error: null },
        },
      });
    });
    return Promise.resolve({
      threadId: requestValue.threadId,
      turnId: "turn_synthesist",
      status: "inProgress",
    });
  }

  interruptTurn(): Promise<void> {
    return Promise.resolve();
  }

  resolveApproval(): Promise<void> {
    return Promise.resolve();
  }

  onEvent(listener: (event: CodexProviderEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  #emit(event: CodexProviderEvent): void {
    for (const listener of this.#listeners) listener(event);
  }
}

describe("synthesist provider-schema projection", () => {
  it("bundles common refs and preserves the three statement alternatives", () => {
    const readSchema = (relativePath: string): Record<string, unknown> =>
      JSON.parse(
        readFileSync(new URL(relativePath, import.meta.url), "utf8"),
      ) as Record<string, unknown>;
    const schema = projectSynthesistOutputSchemaForProvider(
      readSchema(
        "../../contracts/schemas/model-synthesist-output/1.0.0/schema.json",
      ),
      readSchema("../../contracts/schemas/common/1.0.0/schema.json"),
      { strictObjectProperties: true },
    );

    expect(JSON.stringify(schema)).not.toContain("../../common");
    expect(JSON.stringify(schema)).toContain('"anyOf"');
    expect(JSON.stringify(schema)).toContain('"source_report"');
    expect(JSON.stringify(schema)).toContain('"petra_synthesis"');
    expect(JSON.stringify(schema)).toContain('"unresolved_inference"');
  });
});

describe("Codex subscription synthesist adapter", () => {
  it("uses managed ChatGPT OAuth with a read-only no-tool structured turn", async () => {
    const provider = new FakeCodexSynthesistProvider();
    const adapter = new CodexSubscriptionSynthesistAdapter({
      provider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
      clock: clock(400, 425),
    });

    await expect(adapter.invoke(request())).resolves.toMatchObject({
      outcome: "success",
      provider_request_id: "turn_synthesist",
      observed_revision: "gpt-5.6-terra",
      output,
      timing: { total_ms: 25 },
      usage: { accounting: "unavailable" },
      cost: { accounting: "unavailable" },
    });
    expect(provider.threadRequests[0]).toMatchObject({
      model: "gpt-5.6-terra",
      cwd: "/work/petra",
      approvalPolicy: "never",
      sandbox: "read-only",
      ephemeral: true,
    });
    expect(provider.threadRequests[0]?.developerInstructions).toContain(
      "Do not invoke tools",
    );
    expect(provider.turnRequests[0]).toMatchObject({
      model: "gpt-5.6-terra",
      effort: "low",
      outputSchema: outputSchema.schema,
    });
    expect(provider.turnRequests[0]?.prompt).toContain(
      "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
    );
    expect(JSON.stringify(provider.turnRequests)).not.toContain("apiKey");
  });

  it("rejects API-key authentication instead of falling back to it", async () => {
    const provider = new FakeCodexSynthesistProvider();
    provider.authMode = "apiKey";
    const adapter = new CodexSubscriptionSynthesistAdapter({
      provider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
    });

    await expect(adapter.invoke(request())).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "CODEX_CHATGPT_LOGIN_REQUIRED", retryable: false },
    });
    expect(provider.threadRequests).toHaveLength(0);
  });

  it("invalidates output after tool activity and refuses unsupported controls", async () => {
    const toolProvider = new FakeCodexSynthesistProvider();
    toolProvider.toolType = "webSearch";
    const toolAdapter = new CodexSubscriptionSynthesistAdapter({
      provider: toolProvider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
    });
    await expect(toolAdapter.invoke(request())).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "CODEX_SYNTHESIST_TOOL_ACTIVITY" },
    });

    const seedProvider = new FakeCodexSynthesistProvider();
    const seedAdapter = new CodexSubscriptionSynthesistAdapter({
      provider: seedProvider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
    });
    const value = request();
    await expect(
      seedAdapter.invoke({
        ...value,
        parameters: { ...value.parameters, seed: 17 },
      }),
    ).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "CODEX_PARAMETER_UNSUPPORTED" },
    });
    expect(seedProvider.threadRequests).toHaveLength(0);
  });
});
