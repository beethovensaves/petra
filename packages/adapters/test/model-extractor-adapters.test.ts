import type {
  ExtractorAdapterRequest,
  ExtractorAdapterResponse,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import {
  boundedFailureCode,
  DockerModelRunnerRevisionResolver,
  LocalOpenAICompatibleExtractorAdapter,
  OpenAIResponsesExtractorAdapter,
  parseDockerModelRunnerInspection,
  projectExtractorOutputSchemaForProvider,
  resolveDockerModelRunnerConfiguration,
  type ExtractorOutputSchema,
  type ModelAdapterClock,
} from "../src/index.js";
import {
  CodexSubscriptionExtractorAdapter,
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

const localModelDigest =
  "sha256:008cd4c511a1a06903eb0f12dad45acd574ef21aef5476de2bf3aff2c90912aa";

describe("provider failure normalization", () => {
  it("bounds non-string error codes without losing the failure record", () => {
    expect(boundedFailureCode(400)).toBe("PROVIDER_400");
    expect(boundedFailureCode({ code: "bad" })).toBe("PROVIDER_ERROR");
  });
});

describe("extractor provider-schema projection", () => {
  it("adds strict primitive types and omits optional fields without changing the local projection", () => {
    const commonDefinitions = Object.fromEntries(
      [
        "PetraId",
        "SourceSpanId",
        "ScopeDimensionName",
        "ScopeDimension",
        "ScientificScope",
      ].map((name) => [name, { type: "string" }]),
    );
    const canonical = {
      type: "object",
      additionalProperties: false,
      required: ["schema_name", "schema_version", "candidates", "diagnostics"],
      properties: {
        schema_name: { const: "petra.model-extractor-output" },
        schema_version: { const: "1.0.0" },
        candidates: {
          type: "array",
          maxItems: 100,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["kind"],
            properties: {
              kind: { enum: ["descriptive", "comparative"] },
              optional_note: { type: "string" },
            },
          },
        },
        diagnostics: { type: "array", items: { type: "string" } },
      },
      $defs: {},
    };
    const local = projectExtractorOutputSchemaForProvider(canonical, {
      $defs: commonDefinitions,
    });
    const strict = projectExtractorOutputSchemaForProvider(
      canonical,
      { $defs: commonDefinitions },
      { strictObjectProperties: true },
    );

    expect((local.properties as Record<string, unknown>).schema_name).toEqual({
      const: "petra.model-extractor-output",
    });
    expect(
      (
        (
          (local.properties as Record<string, unknown>).candidates as Record<
            string,
            unknown
          >
        ).items as Record<string, unknown>
      ).properties,
    ).toHaveProperty("optional_note");
    expect((strict.properties as Record<string, unknown>).schema_name).toEqual({
      const: "petra.model-extractor-output",
      type: "string",
    });
    const strictCandidate = (
      (strict.properties as Record<string, unknown>).candidates as Record<
        string,
        unknown
      >
    ).items as Record<string, unknown>;
    expect(strictCandidate.properties).toEqual({
      kind: { enum: ["descriptive", "comparative"], type: "string" },
    });
  });
});

const outputSchema: ExtractorOutputSchema = {
  name: "petra_model_extractor_output",
  description: "A source-grounded Petra extraction proposal.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["schema_name", "schema_version", "candidates", "diagnostics"],
    properties: {
      schema_name: { const: "petra.model-extractor-output" },
      schema_version: { const: "1.0.0" },
      candidates: { type: "array" },
      diagnostics: { type: "array" },
    },
  },
};

const extracted = {
  schema_name: "petra.model-extractor-output",
  schema_version: "1.0.0",
  candidates: [],
  diagnostics: [],
};

const clock = (...values: number[]): ModelAdapterClock => ({
  now: vi.fn(() => values.shift() ?? 0),
});

const deployment = (
  location: "local" | "remote",
): ExtractorAdapterRequest["deployment"] => ({
  model_deployment_id: "model_deployment_01ARZ3NDEKTSV4RRFFQ69G5FE0",
  provider_id: "provider_01ARZ3NDEKTSV4RRFFQ69G5FE0",
  provider_kind: location === "remote" ? "openai" : "openai_compatible_local",
  provider_model: location === "remote" ? "gpt-5.6-luna" : "gpt-oss:20b",
  observed_revision:
    location === "remote" ? "gpt-5.6-luna" : "sha256:local-model-weights",
  replayability: location === "remote" ? "best_effort" : "exact",
  execution_location: location,
  structured_output: true,
  max_context_tokens: 131_072,
});

const requestFor = (
  target: ExtractorAdapterRequest["deployment"],
): ExtractorAdapterRequest => ({
  model_request_id: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FE1",
  model_call_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FE2",
  deployment: target,
  input: {
    context_packet_ref: {
      context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FE3",
      content_hash:
        "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    },
    source_artifact_ref: {
      artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FE4",
      content_hash:
        "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    },
    messages: [
      {
        role: "system",
        content: "Extract only source-grounded scientific propositions.",
      },
      { role: "user", content: "Extract the selected passage." },
    ],
    source_selections: [
      {
        source_span_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FE5",
        exact_text: "The intervention was associated with a measurable change.",
        structural_path: "abstract/results",
        page_numbers: [1],
      },
    ],
    content_hash:
      "sha256:3333333333333333333333333333333333333333333333333333333333333333",
  },
  parameters: { temperature: 0, max_output_tokens: 1200 },
  output_contract: {
    schema_name: "model-extractor-output",
    schema_version: "1.0.0",
    schema_hash:
      "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  },
});

const codexDeployment = (): ExtractorAdapterRequest["deployment"] => ({
  ...deployment("remote"),
  provider_kind: "codex_app_server",
  provider_model: "gpt-5.6-sol",
  observed_revision: "gpt-5.6-sol",
});

class FakeCodexExtractorProvider implements CodexSubscriptionProviderPort {
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
    throw new Error("Not used by the extractor test.");
  }

  cancelManagedLogin(): Promise<void> {
    return Promise.resolve();
  }

  startThread(request: CodexThreadStartRequest): Promise<CodexThreadSummary> {
    this.threadRequests.push(request);
    return Promise.resolve({
      threadId: "thr_extractor",
      model: request.model ?? null,
      modelProvider: "openai",
      cwd: request.cwd,
    });
  }

  startTurn(request: CodexTurnStartRequest): Promise<CodexTurnSummary> {
    this.turnRequests.push(request);
    queueMicrotask(() => {
      if (this.toolType !== undefined) {
        this.#emit({
          kind: "notification",
          method: "item/started",
          params: {
            threadId: request.threadId,
            turnId: "turn_extractor",
            item: { id: "tool_1", type: this.toolType },
          },
        });
      }
      this.#emit({
        kind: "notification",
        method: "item/completed",
        params: {
          threadId: request.threadId,
          turnId: "turn_extractor",
          item: {
            id: "message_1",
            type: "agentMessage",
            phase: "final_answer",
            text: JSON.stringify(extracted),
          },
        },
      });
      this.#emit({
        kind: "notification",
        method: "turn/completed",
        params: {
          threadId: request.threadId,
          turn: {
            id: "turn_extractor",
            status: "completed",
            error: null,
          },
        },
      });
    });
    return Promise.resolve({
      threadId: request.threadId,
      turnId: "turn_extractor",
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

const openAIResponse = () => ({
  id: "resp_petra_test",
  object: "response",
  created_at: 1_788_380_400,
  status: "completed",
  error: null,
  incomplete_details: null,
  instructions: null,
  metadata: null,
  model: "gpt-5.6-luna",
  output: [
    {
      id: "msg_petra_test",
      type: "message",
      status: "completed",
      role: "assistant",
      content: [
        {
          type: "output_text",
          text: JSON.stringify(extracted),
          annotations: [],
        },
      ],
    },
  ],
  output_text: JSON.stringify(extracted),
  parallel_tool_calls: false,
  temperature: 0,
  text: { format: { type: "json_schema" } },
  tool_choice: "auto",
  tools: [],
  top_p: 1,
  truncation: "disabled",
  usage: {
    input_tokens: 100,
    input_tokens_details: { cached_tokens: 25, cache_write_tokens: 0 },
    output_tokens: 20,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 120,
  },
});

const localCompletion = () => ({
  id: "chatcmpl_petra_local",
  object: "chat.completion",
  created: 1_788_380_400,
  model: "gpt-oss:20b",
  choices: [
    {
      index: 0,
      finish_reason: "stop",
      logprobs: null,
      message: {
        role: "assistant",
        content: JSON.stringify(extracted),
      },
    },
  ],
  usage: {
    prompt_tokens: 80,
    completion_tokens: 15,
    total_tokens: 95,
  },
});

const parseRequestBody = (
  body: BodyInit | null | undefined,
): Record<string, unknown> => {
  if (typeof body !== "string") {
    throw new Error(
      "Expected the SDK to serialize a JSON string request body.",
    );
  }
  return JSON.parse(body) as Record<string, unknown>;
};

describe("OpenAI Responses extractor adapter", () => {
  it("sends bounded source data with strict structured output and records usage cost", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const fetch = vi.fn<typeof globalThis.fetch>((_input, init) => {
      requestBody = parseRequestBody(init?.body);
      return Promise.resolve(
        new Response(JSON.stringify(openAIResponse()), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
    const adapter = new OpenAIResponsesExtractorAdapter({
      apiKey: "test-key-not-a-secret",
      timeoutMs: 4_000,
      pricing: {
        input_usd_per_million: "0.20",
        cached_input_usd_per_million: "0.02",
        output_usd_per_million: "1.20",
        source: "Test pricing snapshot.",
      },
      outputSchema,
      clock: clock(100, 125),
      fetch,
    });

    const result = await adapter.invoke(requestFor(deployment("remote")));

    expect(result).toMatchObject({
      outcome: "success",
      provider_request_id: "resp_petra_test",
      observed_revision: "gpt-5.6-luna",
      timing: { queue_ms: 0, total_ms: 25, validation_ms: 0 },
      usage: {
        accounting: "provider_reported",
        input_tokens: 100,
        output_tokens: 20,
      },
      cost: {
        amount: "0.0000395",
        currency: "USD",
        accounting: "computed",
        pricing_source: "Test pricing snapshot.",
      },
      output: extracted,
    } satisfies Partial<ExtractorAdapterResponse>);
    expect(requestBody).toMatchObject({
      model: "gpt-5.6-luna",
      store: false,
      tools: [],
      max_output_tokens: 1200,
      text: {
        format: {
          type: "json_schema",
          name: "petra_model_extractor_output",
          strict: true,
        },
      },
    });
    expect(JSON.stringify(requestBody)).toContain(
      "source_span_01ARZ3NDEKTSV4RRFFQ69G5FE5",
    );
    expect(JSON.stringify(requestBody)).toContain(
      "untrusted scholarly source data",
    );
  });

  it("does not send a local deployment to OpenAI", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const adapter = new OpenAIResponsesExtractorAdapter({
      apiKey: "test-key-not-a-secret",
      timeoutMs: 4_000,
      pricing: {
        input_usd_per_million: "0.20",
        cached_input_usd_per_million: "0.02",
        output_usd_per_million: "1.20",
        source: "Test pricing snapshot.",
      },
      outputSchema,
      clock: clock(100, 101),
      fetch,
    });

    await expect(
      adapter.invoke(requestFor(deployment("local"))),
    ).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "OPENAI_DEPLOYMENT_MISMATCH", retryable: false },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses to silently discard a seed unsupported by Responses", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const adapter = new OpenAIResponsesExtractorAdapter({
      apiKey: "test-key-not-a-secret",
      timeoutMs: 4_000,
      pricing: {
        input_usd_per_million: "0.20",
        cached_input_usd_per_million: "0.02",
        output_usd_per_million: "1.20",
        source: "Test pricing snapshot.",
      },
      outputSchema,
      clock: clock(100, 101),
      fetch,
    });
    const request = requestFor(deployment("remote"));

    await expect(
      adapter.invoke({
        ...request,
        parameters: { ...request.parameters, seed: 17 },
      }),
    ).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "OPENAI_PARAMETER_UNSUPPORTED", retryable: false },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("local OpenAI-compatible extractor adapter", () => {
  it("rejects a non-loopback endpoint at configuration time", () => {
    expect(
      () =>
        new LocalOpenAICompatibleExtractorAdapter({
          baseURL: "https://models.example.test/v1",
          timeoutMs: 4_000,
          outputSchema,
        }),
    ).toThrow("only a loopback base URL");
  });

  it("resolves exact local weights and returns a no-egress result", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const fetch = vi.fn<typeof globalThis.fetch>((_input, init) => {
      requestBody = parseRequestBody(init?.body);
      return Promise.resolve(
        new Response(JSON.stringify(localCompletion()), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
    const resolve = vi.fn(() => Promise.resolve("sha256:local-model-weights"));
    const adapter = new LocalOpenAICompatibleExtractorAdapter({
      baseURL: "http://127.0.0.1:11434/v1",
      timeoutMs: 4_000,
      outputSchema,
      reasoningEffort: "low",
      revisionResolver: { resolve },
      clock: clock(200, 242),
      fetch,
    });

    const request = requestFor(deployment("local"));
    const result = await adapter.invoke({
      ...request,
      parameters: { ...request.parameters, seed: 17 },
    });

    expect(resolve).toHaveBeenCalledWith("gpt-oss:20b");
    expect(result).toMatchObject({
      outcome: "success",
      observed_revision: "sha256:local-model-weights",
      timing: { queue_ms: 0, total_ms: 42, validation_ms: 0 },
      usage: {
        accounting: "provider_reported",
        input_tokens: 80,
        output_tokens: 15,
      },
      cost: {
        amount: "0",
        currency: "USD",
        accounting: "unavailable",
        pricing_source:
          "Local execution has no external API charge; energy and hardware cost are not yet allocated.",
      },
      output: extracted,
    } satisfies Partial<ExtractorAdapterResponse>);
    expect(requestBody).toMatchObject({
      model: "gpt-oss:20b",
      seed: 17,
      n: 1,
      stream: false,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "petra_model_extractor_output",
          strict: true,
        },
      },
      reasoning_effort: "low",
    });
  });

  it("requires a resolver before claiming exact local replayability", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const adapter = new LocalOpenAICompatibleExtractorAdapter({
      baseURL: "http://localhost:11434/v1",
      timeoutMs: 4_000,
      outputSchema,
      clock: clock(300, 301),
      fetch,
    });

    await expect(
      adapter.invoke(requestFor(deployment("local"))),
    ).resolves.toMatchObject({
      outcome: "provider_error",
      failure: {
        code: "LOCAL_REVISION_RESOLVER_REQUIRED",
        retryable: false,
      },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Codex subscription extractor adapter", () => {
  it("uses managed ChatGPT, a read-only no-tool turn, and structured output", async () => {
    const provider = new FakeCodexExtractorProvider();
    const adapter = new CodexSubscriptionExtractorAdapter({
      provider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
      clock: clock(400, 425),
    });

    await expect(
      adapter.invoke(requestFor(codexDeployment())),
    ).resolves.toMatchObject({
      outcome: "success",
      provider_request_id: "turn_extractor",
      observed_revision: "gpt-5.6-sol",
      output: extracted,
      timing: { total_ms: 25 },
      usage: { accounting: "unavailable" },
      cost: { accounting: "unavailable" },
    });
    expect(provider.threadRequests).toHaveLength(1);
    expect(provider.threadRequests[0]).toMatchObject({
      model: "gpt-5.6-sol",
      cwd: "/work/petra",
      approvalPolicy: "never",
      sandbox: "read-only",
      ephemeral: true,
    });
    expect(provider.threadRequests[0]?.developerInstructions).toContain(
      "Do not invoke tools",
    );
    expect(provider.turnRequests[0]).toMatchObject({
      model: "gpt-5.6-sol",
      effort: "low",
      outputSchema: outputSchema.schema,
    });
    expect(provider.turnRequests[0]?.prompt).toContain(
      "source_span_01ARZ3NDEKTSV4RRFFQ69G5FE5",
    );
  });

  it("rejects non-ChatGPT authentication and tool activity", async () => {
    const apiProvider = new FakeCodexExtractorProvider();
    apiProvider.authMode = "apiKey";
    const apiAdapter = new CodexSubscriptionExtractorAdapter({
      provider: apiProvider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
    });
    await expect(
      apiAdapter.invoke(requestFor(codexDeployment())),
    ).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "CODEX_CHATGPT_LOGIN_REQUIRED" },
    });
    expect(apiProvider.threadRequests).toHaveLength(0);

    const toolProvider = new FakeCodexExtractorProvider();
    toolProvider.toolType = "webSearch";
    const toolAdapter = new CodexSubscriptionExtractorAdapter({
      provider: toolProvider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
    });
    await expect(
      toolAdapter.invoke(requestFor(codexDeployment())),
    ).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "CODEX_EXTRACTOR_TOOL_ACTIVITY" },
    });
  });

  it("refuses an unsupported seed instead of silently dropping it", async () => {
    const provider = new FakeCodexExtractorProvider();
    const adapter = new CodexSubscriptionExtractorAdapter({
      provider,
      workspaceRoot: "/work/petra",
      timeoutMs: 1_000,
      outputSchema,
    });
    const request = requestFor(codexDeployment());

    await expect(
      adapter.invoke({
        ...request,
        parameters: { ...request.parameters, seed: 17 },
      }),
    ).resolves.toMatchObject({
      outcome: "provider_error",
      failure: { code: "CODEX_PARAMETER_UNSUPPORTED" },
    });
    expect(provider.threadRequests).toHaveLength(0);
  });
});

describe("Docker Model Runner revision resolver", () => {
  it("resolves an exact digest only when the requested tag identifies it", async () => {
    const inspect = vi.fn(() =>
      Promise.resolve({
        id: localModelDigest,
        tags: ["docker.io/ai/gpt-oss:latest"],
        created: 0,
        config: { format: "gguf" },
      }),
    );
    const resolver = new DockerModelRunnerRevisionResolver({ inspect });

    await expect(resolver.resolve("docker.io/ai/gpt-oss:latest")).resolves.toBe(
      localModelDigest,
    );
    expect(inspect).toHaveBeenCalledWith("docker.io/ai/gpt-oss:latest");
  });

  it("rejects mutable, malformed, and differently tagged inspection results", async () => {
    expect(() =>
      parseDockerModelRunnerInspection({
        id: "gpt-oss:latest",
        tags: ["docker.io/ai/gpt-oss:latest"],
        created: 0,
        config: {},
      }),
    ).toThrow("immutable sha256 model digest");

    const resolver = new DockerModelRunnerRevisionResolver({
      inspect: () =>
        Promise.resolve({
          id: localModelDigest,
          tags: ["docker.io/ai/another-model:latest"],
          created: 0,
          config: { format: "gguf" },
        }),
    });
    await expect(
      resolver.resolve("docker.io/ai/gpt-oss:latest"),
    ).rejects.toThrow("is not tagged as");
  });

  it("selects one exact backend configuration for the inspected digest", () => {
    expect(
      resolveDockerModelRunnerConfiguration(
        [
          {
            Backend: "llama.cpp",
            Model: "docker.io/ai/gpt-oss:latest",
            ModelID: localModelDigest,
            Mode: "completion",
            Config: { "context-size": 8192 },
          },
        ],
        {
          modelReference: "docker.io/ai/gpt-oss:latest",
          modelId: localModelDigest,
          backend: "llama.cpp",
        },
      ),
    ).toEqual({
      Backend: "llama.cpp",
      Model: "docker.io/ai/gpt-oss:latest",
      ModelID: localModelDigest,
      Mode: "completion",
      Config: { "context-size": 8192 },
    });
  });

  it("rejects absent, ambiguous, and malformed runtime configurations", () => {
    const identity = {
      modelReference: "docker.io/ai/gpt-oss:latest",
      modelId: localModelDigest,
      backend: "llama.cpp",
    };
    expect(() => resolveDockerModelRunnerConfiguration([], identity)).toThrow(
      "exposed 0 configurations",
    );
    const match = {
      Backend: "llama.cpp",
      Model: identity.modelReference,
      ModelID: identity.modelId,
      Mode: "completion",
      Config: {},
    };
    expect(() =>
      resolveDockerModelRunnerConfiguration([match, match], identity),
    ).toThrow("exposed 2 configurations");
    expect(() =>
      resolveDockerModelRunnerConfiguration(
        [{ ...match, Config: "not-an-object" }],
        identity,
      ),
    ).toThrow("has no Config object");
  });
});
