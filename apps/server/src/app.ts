import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import type { Context } from "hono";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

import {
  InteractionInputError,
  encodeAgUiStream,
  parseAgUiRunInput,
} from "@petra/adapters";
import { parseAgUiReviewResponse } from "@petra/adapters/server";
import {
  DurableReviewInterruptError,
  PetraInteractionRuntime,
  type ReviewInterruptBoundary,
  type ReviewResolutionContext,
} from "@petra/core";

interface Variables {
  requestId: string;
  traceId: string;
}

type PetraHono = Hono<{ Variables: Variables }>;

export interface PetraAppOptions {
  runtime?: PetraInteractionRuntime;
  reviewBoundary?: ReviewInterruptBoundary;
  reviewAuthority?: ReviewResolutionContext;
  authToken?: string;
  maxBodyBytes?: number;
  publicDir?: string;
}

export interface PetraApp {
  app: PetraHono;
  runtime: PetraInteractionRuntime;
  closeInteractionStreams: () => void;
}

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const jsonError = (
  context: Context<{ Variables: Variables }>,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 503,
  code: string,
  message: string,
  details?: unknown,
): Response =>
  context.json(
    {
      error: { code, message, ...(details === undefined ? {} : { details }) },
      requestId: context.get("requestId"),
      traceId: context.get("traceId"),
    },
    status,
  );

const readBoundedJson = async (
  context: Context<{ Variables: Variables }>,
  maxBodyBytes: number,
): Promise<unknown> => {
  const declaredLength = Number(context.req.header("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new InteractionInputError(
      "Request body exceeds Petra's configured limit.",
      ["body_too_large"],
    );
  }
  const text = await context.req.text();
  if (new TextEncoder().encode(text).byteLength > maxBodyBytes) {
    throw new InteractionInputError(
      "Request body exceeds Petra's configured limit.",
      ["body_too_large"],
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new InteractionInputError("Request body must be valid JSON.");
  }
};

const mediaType = (path: string): string => {
  const extension = extname(path);
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
};

const safeAssetPath = (
  publicDir: string,
  requestPath: string,
): string | undefined => {
  const root = resolve(publicDir);
  const candidate = resolve(root, `.${requestPath}`);
  if (candidate === root || candidate.startsWith(`${root}${sep}`))
    return candidate;
  return undefined;
};

export const createPetraApp = (options: PetraAppOptions = {}): PetraApp => {
  const app = new Hono<{ Variables: Variables }>();
  const runtime =
    options.runtime ??
    new PetraInteractionRuntime(
      options.reviewBoundary === undefined
        ? {}
        : { reviewBoundary: options.reviewBoundary },
    );
  const authToken = options.authToken ?? "petra-local-development";
  const maxBodyBytes = options.maxBodyBytes ?? 64 * 1024;
  const activeStreams = new Set<AbortController>();

  const interactionStreamResponse = (parameters: {
    runId: string;
    afterSequence: number;
    accept: string | undefined;
    requestId: string;
    traceId: string;
    requestSignal: AbortSignal;
  }): Response => {
    const streamAbort = new AbortController();
    activeStreams.add(streamAbort);
    const abortFromRequest = (): void => streamAbort.abort();
    parameters.requestSignal.addEventListener("abort", abortFromRequest, {
      once: true,
    });
    const encoded = encodeAgUiStream(
      runtime.streamInteraction(
        parameters.runId,
        parameters.afterSequence,
        streamAbort.signal,
      ),
      parameters.accept,
    );
    const iterator = encoded.chunks[Symbol.asyncIterator]();
    let deliveryRecorded = false;
    const recordDelivery = (
      outcome: "completed" | "aborted" | "write_error",
    ): void => {
      if (deliveryRecorded) return;
      deliveryRecorded = true;
      activeStreams.delete(streamAbort);
      parameters.requestSignal.removeEventListener("abort", abortFromRequest);
      runtime.recordDelivery(parameters.runId, outcome);
    };
    let streamClosed = false;
    const bodyStream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamAbort.signal.addEventListener(
          "abort",
          () => {
            if (streamClosed) return;
            streamClosed = true;
            void iterator.return?.(undefined);
            recordDelivery("aborted");
            controller.close();
          },
          { once: true },
        );
      },
      async pull(controller) {
        if (streamClosed) return;
        try {
          const result = await iterator.next();
          if (result.done) {
            if (streamClosed) return;
            streamClosed = true;
            recordDelivery(
              streamAbort.signal.aborted ? "aborted" : "completed",
            );
            controller.close();
            return;
          }
          controller.enqueue(result.value);
        } catch (error: unknown) {
          if (streamClosed) return;
          streamClosed = true;
          recordDelivery("write_error");
          controller.error(error);
        }
      },
      async cancel() {
        if (streamClosed) return;
        streamClosed = true;
        streamAbort.abort();
        await iterator.return?.(undefined);
        recordDelivery("aborted");
      },
    });
    return new Response(bodyStream, {
      headers: {
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": encoded.contentType,
        "x-accel-buffering": "no",
        "x-petra-request-id": parameters.requestId,
        "x-petra-trace-id": parameters.traceId,
      },
    });
  };

  app.use("*", secureHeaders());
  app.use("*", async (context, next) => {
    const suppliedRequestId = context.req.header("x-petra-request-id");
    const suppliedTraceId = context.req.header("x-petra-trace-id");
    const requestId =
      suppliedRequestId !== undefined && ID_PATTERN.test(suppliedRequestId)
        ? suppliedRequestId
        : `request_${randomUUID()}`;
    const traceId =
      suppliedTraceId !== undefined && ID_PATTERN.test(suppliedTraceId)
        ? suppliedTraceId
        : `trace_${randomUUID()}`;
    context.set("requestId", requestId);
    context.set("traceId", traceId);
    context.header("x-petra-request-id", requestId);
    context.header("x-petra-trace-id", traceId);
    await next();
  });

  app.use("/api/*", async (context, next) => {
    if (context.req.header("authorization") !== `Bearer ${authToken}`) {
      return context.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "A valid Petra bearer token is required.",
          },
          requestId: context.get("requestId"),
          traceId: context.get("traceId"),
        },
        401,
      );
    }
    await next();
  });

  app.get("/health", (context) =>
    context.json({ ok: true, service: "petra", accepting: runtime.accepting }),
  );
  app.get("/diagnostics", (context) =>
    context.json({
      service: "petra",
      runtime: runtime.diagnostics(),
      protocol: { name: "AG-UI", version: "0.0.59" },
    }),
  );

  app.get("/api/queries/interactions/:runId", (context) => {
    try {
      return context.json(runtime.snapshot(context.req.param("runId")));
    } catch (error: unknown) {
      return jsonError(
        context,
        404,
        "RUN_NOT_FOUND",
        error instanceof Error ? error.message : "Interaction run not found.",
      );
    }
  });

  app.post("/api/commands/reviews/resolve", async (context) => {
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      const response = parseAgUiReviewResponse(body);
      if (options.reviewAuthority === undefined) {
        return jsonError(
          context,
          503,
          "REVIEW_BOUNDARY_UNAVAILABLE",
          "No authenticated durable review authority is configured.",
        );
      }
      return context.json(
        await runtime.resolveReview(response, options.reviewAuthority),
      );
    } catch (error: unknown) {
      const status =
        error instanceof InteractionInputError
          ? 422
          : error instanceof DurableReviewInterruptError &&
              error.code === "REVIEW_INTERRUPT_UNAUTHORIZED"
            ? 403
            : 409;
      return jsonError(
        context,
        status,
        "REVIEW_COMMAND_REJECTED",
        error instanceof Error ? error.message : "Review command rejected.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.post("/api/work-units/:runId/cancel", async (context) => {
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      if (!isRecord(body) || typeof body.commandId !== "string") {
        throw new InteractionInputError("Cancellation requires a commandId.");
      }
      return context.json(
        runtime.cancel({
          commandId: body.commandId,
          runId: context.req.param("runId"),
        }),
      );
    } catch (error: unknown) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 404,
        "CANCELLATION_REJECTED",
        error instanceof Error ? error.message : "Cancellation rejected.",
      );
    }
  });

  app.post("/api/interactions/run", async (context) => {
    if (!runtime.accepting) {
      return jsonError(
        context,
        503,
        "DRAINING",
        "Petra is not accepting new interactions.",
      );
    }

    let runId: string;
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      const parsed = parseAgUiRunInput(body, {
        requestId: context.get("requestId"),
        traceId: context.get("traceId"),
      });
      runId = parsed.request.runId;
      runtime.startInteraction(parsed.request);

      return interactionStreamResponse({
        runId,
        afterSequence: parsed.afterSequence,
        requestId: context.get("requestId"),
        traceId: context.get("traceId"),
        requestSignal: context.req.raw.signal,
        accept: context.req.header("accept"),
      });
    } catch (error: unknown) {
      if (
        error instanceof InteractionInputError &&
        error.issues.includes("body_too_large")
      ) {
        return jsonError(context, 413, "BODY_TOO_LARGE", error.message);
      }
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
        "INTERACTION_REJECTED",
        error instanceof Error ? error.message : "Interaction rejected.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.get("/api/interactions/:runId", (context) => {
    const runId = context.req.param("runId");
    const afterSequence = Number(context.req.query("after") ?? "0");
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
      return jsonError(
        context,
        422,
        "INVALID_REPLAY_CHECKPOINT",
        "The replay checkpoint must be a non-negative safe integer.",
      );
    }
    try {
      runtime.snapshot(runId);
      return interactionStreamResponse({
        runId,
        afterSequence,
        requestId: context.get("requestId"),
        traceId: context.get("traceId"),
        requestSignal: context.req.raw.signal,
        accept: context.req.header("accept"),
      });
    } catch (error: unknown) {
      return jsonError(
        context,
        404,
        "RUN_NOT_FOUND",
        error instanceof Error ? error.message : "Interaction run not found.",
      );
    }
  });

  app.all("/api/*", (context) =>
    jsonError(
      context,
      404,
      "API_ROUTE_NOT_FOUND",
      `No Petra API route matches ${context.req.path}.`,
    ),
  );

  if (options.publicDir !== undefined) {
    app.get("/assets/*", async (context) => {
      const path = safeAssetPath(options.publicDir as string, context.req.path);
      if (path === undefined) return context.notFound();
      try {
        const bytes = await readFile(path);
        return new Response(bytes, {
          headers: {
            "cache-control": "public, max-age=31536000, immutable",
            "content-type": mediaType(path),
          },
        });
      } catch {
        return context.notFound();
      }
    });

    app.get("*", async (context) => {
      try {
        const html = await readFile(
          resolve(options.publicDir as string, "index.html"),
        );
        return new Response(html, {
          headers: {
            "cache-control": "no-cache",
            "content-type": "text/html; charset=utf-8",
          },
        });
      } catch {
        return context.notFound();
      }
    });
  }

  app.notFound((context) =>
    jsonError(
      context,
      404,
      "NOT_FOUND",
      `No Petra route matches ${context.req.path}.`,
    ),
  );

  return {
    app,
    runtime,
    closeInteractionStreams: () => {
      for (const controller of activeStreams) controller.abort();
      activeStreams.clear();
    },
  };
};
