import OpenAI from "openai";

import type {
  ExtractorAdapterRequest,
  ExtractorAdapterResponse,
  ExtractorModelAdapter,
} from "@petra/core";

import {
  boundedFailureCode,
  elapsedMilliseconds,
  parseStructuredText,
  renderExtractorInput,
  systemClock,
  unavailableLocalCost,
  type ExtractorOutputSchema,
  type ModelAdapterClock,
} from "./model-adapter-common.js";

export interface LocalModelRevisionResolver {
  readonly resolve: (providerModel: string) => Promise<string>;
}

export interface LocalOpenAICompatibleExtractorOptions {
  readonly baseURL: string;
  readonly timeoutMs: number;
  readonly outputSchema: ExtractorOutputSchema;
  readonly reasoningEffort?: "low" | "medium" | "high";
  readonly revisionResolver?: LocalModelRevisionResolver;
  readonly clock?: ModelAdapterClock;
  readonly fetch?: typeof globalThis.fetch;
}

const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

const assertLoopbackBaseUrl = (value: string): string => {
  const url = new URL(value);
  if (!loopbackHosts.has(url.hostname)) {
    throw new Error(
      "The local model adapter accepts only a loopback base URL. Use a remote provider adapter for network destinations.",
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The local model adapter requires an HTTP(S) base URL.");
  }
  return url.href.replace(/\/$/, "");
};

export class LocalOpenAICompatibleExtractorAdapter implements ExtractorModelAdapter {
  readonly #client: OpenAI;
  readonly #outputSchema: ExtractorOutputSchema;
  readonly #revisionResolver: LocalModelRevisionResolver | undefined;
  readonly #reasoningEffort: "low" | "medium" | "high" | undefined;
  readonly #clock: ModelAdapterClock;

  constructor(options: LocalOpenAICompatibleExtractorOptions) {
    this.#client = new OpenAI({
      apiKey: "petra-local-no-secret",
      baseURL: assertLoopbackBaseUrl(options.baseURL),
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      timeout: options.timeoutMs,
      maxRetries: 0,
    });
    this.#outputSchema = options.outputSchema;
    this.#reasoningEffort = options.reasoningEffort;
    this.#revisionResolver = options.revisionResolver;
    this.#clock = options.clock ?? systemClock;
  }

  async invoke(
    request: ExtractorAdapterRequest,
  ): Promise<ExtractorAdapterResponse> {
    const startedAt = this.#clock.now();
    if (request.deployment.execution_location !== "local") {
      return this.#failure(
        request,
        startedAt,
        "LOCAL_DEPLOYMENT_MISMATCH",
        "The local adapter accepts only deployments marked local.",
        false,
      );
    }
    if (
      request.deployment.replayability === "exact" &&
      this.#revisionResolver === undefined
    ) {
      return this.#failure(
        request,
        startedAt,
        "LOCAL_REVISION_RESOLVER_REQUIRED",
        "An exact local deployment requires a runtime-specific model revision resolver.",
        false,
      );
    }

    try {
      const observedRevision =
        (await this.#revisionResolver?.resolve(
          request.deployment.provider_model,
        )) ?? request.deployment.observed_revision;
      const response = await this.#client.chat.completions.create({
        model: request.deployment.provider_model,
        messages: renderExtractorInput(request),
        temperature: request.parameters.temperature,
        max_completion_tokens: request.parameters.max_output_tokens,
        ...(this.#reasoningEffort === undefined
          ? {}
          : { reasoning_effort: this.#reasoningEffort }),
        ...(request.parameters.seed === undefined
          ? {}
          : { seed: request.parameters.seed }),
        n: 1,
        stream: false,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: this.#outputSchema.name,
            description: this.#outputSchema.description,
            schema: structuredClone(this.#outputSchema.schema),
            strict: true,
          },
        },
      });
      const totalMs = elapsedMilliseconds(this.#clock, startedAt);
      const usage = response.usage;
      const choice = response.choices[0];
      const observation = {
        provider_request_id: response.id,
        observed_revision: observedRevision,
        timing: { queue_ms: 0, total_ms: totalMs, validation_ms: 0 },
        usage: {
          accounting:
            usage === undefined
              ? ("unavailable" as const)
              : ("provider_reported" as const),
          input_tokens: usage?.prompt_tokens ?? 0,
          output_tokens: usage?.completion_tokens ?? 0,
        },
        cost: unavailableLocalCost(),
      };
      if (choice === undefined) {
        return {
          ...observation,
          outcome: "provider_error",
          failure: {
            code: "LOCAL_RESPONSE_EMPTY",
            message: "The local runtime returned no completion choice.",
            retryable: true,
          },
        };
      }
      const refusal = choice.message.refusal;
      if (typeof refusal === "string" && refusal.length > 0) {
        return {
          ...observation,
          outcome: "refusal",
          output: { refusal },
          failure: {
            code: "MODEL_REFUSAL",
            message: refusal,
            retryable: false,
          },
        };
      }
      if (choice.finish_reason !== "stop" || choice.message.content === null) {
        return {
          ...observation,
          outcome: "provider_error",
          output: {
            finish_reason: choice.finish_reason,
            content: choice.message.content,
          },
          failure: {
            code: boundedFailureCode(choice.finish_reason),
            message: `The local runtime stopped with ${choice.finish_reason}.`,
            retryable: false,
          },
        };
      }
      return {
        ...observation,
        outcome: "success",
        output: parseStructuredText(choice.message.content),
      };
    } catch (error) {
      const timeout = error instanceof OpenAI.APIConnectionTimeoutError;
      const apiError = error instanceof OpenAI.APIError ? error : undefined;
      return this.#failure(
        request,
        startedAt,
        timeout ? "LOCAL_MODEL_TIMEOUT" : boundedFailureCode(apiError?.code),
        error instanceof Error ? error.message : String(error),
        timeout ||
          apiError?.status === 408 ||
          apiError?.status === 409 ||
          apiError?.status === 429 ||
          (apiError?.status !== undefined && apiError.status >= 500),
        timeout,
        apiError?.requestID ?? undefined,
      );
    }
  }

  #failure(
    request: ExtractorAdapterRequest,
    startedAt: number,
    code: string,
    message: string,
    retryable: boolean,
    timeout = false,
    providerRequestId?: string,
  ): ExtractorAdapterResponse {
    return {
      outcome: timeout ? "timeout" : "provider_error",
      ...(providerRequestId === undefined
        ? {}
        : { provider_request_id: providerRequestId }),
      observed_revision: request.deployment.observed_revision,
      timing: {
        queue_ms: 0,
        total_ms: elapsedMilliseconds(this.#clock, startedAt),
        validation_ms: 0,
      },
      usage: {
        accounting: "unavailable",
        input_tokens: 0,
        output_tokens: 0,
      },
      cost: unavailableLocalCost(),
      failure: { code, message, retryable },
    };
  }
}
