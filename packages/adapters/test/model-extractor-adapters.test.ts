import type {
  ExtractorAdapterRequest,
  ExtractorAdapterResponse,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import {
  LocalOpenAICompatibleExtractorAdapter,
  OpenAIResponsesExtractorAdapter,
  type ExtractorOutputSchema,
  type ModelAdapterClock,
} from "../src/index.js";

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
        refusal: null,
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
