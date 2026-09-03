import OpenAI from "openai";

import type {
  ExtractorAdapterRequest,
  ExtractorAdapterResponse,
  ExtractorModelAdapter,
} from "@petra/core";

import {
  boundedFailureCode,
  computedUsdCost,
  elapsedMilliseconds,
  parseStructuredText,
  renderExtractorInput,
  systemClock,
  type ExtractorOutputSchema,
  type ModelAdapterClock,
  type ModelTokenPricing,
} from "./model-adapter-common.js";

export interface OpenAIResponsesExtractorOptions {
  readonly apiKey?: string;
  readonly organization?: string;
  readonly project?: string;
  readonly timeoutMs: number;
  readonly pricing: ModelTokenPricing;
  readonly outputSchema: ExtractorOutputSchema;
  readonly clock?: ModelAdapterClock;
  readonly fetch?: typeof globalThis.fetch;
}

export class OpenAIResponsesExtractorAdapter implements ExtractorModelAdapter {
  readonly #client: OpenAI;
  readonly #pricing: ModelTokenPricing;
  readonly #outputSchema: ExtractorOutputSchema;
  readonly #clock: ModelAdapterClock;

  constructor(options: OpenAIResponsesExtractorOptions) {
    this.#client = new OpenAI({
      ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
      ...(options.organization === undefined
        ? {}
        : { organization: options.organization }),
      ...(options.project === undefined ? {} : { project: options.project }),
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      timeout: options.timeoutMs,
      maxRetries: 0,
    });
    this.#pricing = options.pricing;
    this.#outputSchema = options.outputSchema;
    this.#clock = options.clock ?? systemClock;
  }

  async invoke(
    request: ExtractorAdapterRequest,
  ): Promise<ExtractorAdapterResponse> {
    const startedAt = this.#clock.now();
    if (
      request.deployment.execution_location !== "remote" ||
      request.deployment.provider_kind !== "openai"
    ) {
      return this.#configurationFailure(
        request,
        startedAt,
        "OPENAI_DEPLOYMENT_MISMATCH",
        "The OpenAI Responses adapter accepts only remote deployments whose provider_kind is openai.",
      );
    }
    if (request.parameters.seed !== undefined) {
      return this.#configurationFailure(
        request,
        startedAt,
        "OPENAI_PARAMETER_UNSUPPORTED",
        "The Responses adapter will not silently discard a configured seed that this endpoint does not accept.",
      );
    }

    try {
      const response = await this.#client.responses.create({
        model: request.deployment.provider_model,
        input: renderExtractorInput(request),
        max_output_tokens: request.parameters.max_output_tokens,
        temperature: request.parameters.temperature,
        store: false,
        tools: [],
        parallel_tool_calls: false,
        metadata: {
          petra_model_request_id: request.model_request_id,
          petra_model_call_id: request.model_call_id,
        },
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: this.#outputSchema.name,
            description: this.#outputSchema.description,
            schema: structuredClone(this.#outputSchema.schema),
            strict: true,
          },
        },
      });
      const totalMs = elapsedMilliseconds(this.#clock, startedAt);
      const usage = response.usage;
      const inputTokens = usage?.input_tokens ?? 0;
      const outputTokens = usage?.output_tokens ?? 0;
      const cachedInputTokens = usage?.input_tokens_details.cached_tokens ?? 0;
      const observation = {
        provider_request_id: response.id,
        observed_revision: response.model,
        timing: { queue_ms: 0, total_ms: totalMs, validation_ms: 0 },
        usage: {
          accounting:
            usage === undefined
              ? ("unavailable" as const)
              : ("provider_reported" as const),
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
        cost:
          usage === undefined
            ? {
                amount: "0",
                currency: "USD" as const,
                accounting: "unavailable" as const,
                pricing_source:
                  "OpenAI did not return token usage, so cost could not be computed.",
              }
            : computedUsdCost({
                inputTokens,
                cachedInputTokens,
                outputTokens,
                pricing: this.#pricing,
              }),
      };

      const refusal = response.output
        .filter((item) => item.type === "message")
        .flatMap((item) => item.content)
        .find((item) => item.type === "refusal");
      if (refusal !== undefined) {
        return {
          ...observation,
          outcome: "refusal",
          output: { refusal: refusal.refusal },
          failure: {
            code: "MODEL_REFUSAL",
            message: refusal.refusal,
            retryable: false,
          },
        };
      }
      if (response.status !== "completed" || response.error !== null) {
        const code = boundedFailureCode(
          response.error?.code ??
            response.incomplete_details?.reason ??
            response.status,
        );
        return {
          ...observation,
          outcome: "provider_error",
          output: {
            status: response.status,
            error: response.error,
            incomplete_details: response.incomplete_details,
          },
          failure: {
            code,
            message:
              response.error?.message ??
              `OpenAI returned response status ${String(response.status)}.`,
            retryable: response.error?.code === "server_error",
          },
        };
      }
      return {
        ...observation,
        outcome: "success",
        output: parseStructuredText(response.output_text),
      };
    } catch (error) {
      const totalMs = elapsedMilliseconds(this.#clock, startedAt);
      const timeout = error instanceof OpenAI.APIConnectionTimeoutError;
      const apiError = error instanceof OpenAI.APIError ? error : undefined;
      return {
        outcome: timeout ? "timeout" : "provider_error",
        ...(apiError?.requestID === null || apiError?.requestID === undefined
          ? {}
          : { provider_request_id: apiError.requestID }),
        observed_revision: request.deployment.observed_revision,
        timing: { queue_ms: 0, total_ms: totalMs, validation_ms: 0 },
        usage: {
          accounting: "unavailable",
          input_tokens: 0,
          output_tokens: 0,
        },
        cost: {
          amount: "0",
          currency: "USD",
          accounting: "unavailable",
          pricing_source:
            "The OpenAI request did not return token usage, so cost could not be computed.",
        },
        failure: {
          code: timeout
            ? "PROVIDER_TIMEOUT"
            : boundedFailureCode(apiError?.code),
          message: error instanceof Error ? error.message : String(error),
          retryable:
            timeout ||
            apiError?.status === 408 ||
            apiError?.status === 409 ||
            apiError?.status === 429 ||
            (apiError?.status !== undefined && apiError.status >= 500),
        },
      };
    }
  }

  #configurationFailure(
    request: ExtractorAdapterRequest,
    startedAt: number,
    code: string,
    message: string,
  ): ExtractorAdapterResponse {
    return {
      outcome: "provider_error",
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
      cost: {
        amount: "0",
        currency: "USD",
        accounting: "unavailable",
        pricing_source: "No provider request was made.",
      },
      failure: { code, message, retryable: false },
    };
  }
}
