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
import {
  parseAgUiReviewResponse,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";
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
  codexProvider?: CodexSubscriptionProviderPort;
  codexWorkspaceRoot?: string;
}

export interface PetraApp {
  app: PetraHono;
  runtime: PetraInteractionRuntime;
  closeInteractionStreams: () => void;
}

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertExactKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void => {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new InteractionInputError(
      `${label} contains unregistered fields.`,
      unknown,
    );
  }
};

const requiredString = (
  value: Record<string, unknown>,
  key: string,
): string => {
  const member = value[key];
  if (typeof member !== "string" || member.trim().length === 0) {
    throw new InteractionInputError(`${key} must be a non-empty string.`);
  }
  return member;
};

const optionalEnum = <Value extends string>(
  value: Record<string, unknown>,
  key: string,
  choices: readonly Value[],
): Value | undefined => {
  const member = value[key];
  if (member === undefined) return undefined;
  if (typeof member !== "string" || !choices.includes(member as Value)) {
    throw new InteractionInputError(`${key} is not an allowed value.`);
  }
  return member as Value;
};

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
      providers: {
        codex:
          options.codexProvider === undefined
            ? { configured: false }
            : { configured: true, ...options.codexProvider.diagnostics() },
      },
    }),
  );

  app.get("/api/providers/codex/account", async (context) => {
    if (options.codexProvider === undefined) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider is not enabled.",
      );
    }
    try {
      return context.json(await options.codexProvider.readAccount());
    } catch (error) {
      return jsonError(
        context,
        503,
        "CODEX_ACCOUNT_UNAVAILABLE",
        error instanceof Error
          ? error.message
          : "Codex account status is unavailable.",
      );
    }
  });

  app.get("/api/providers/codex/models", async (context) => {
    if (options.codexProvider === undefined) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider is not enabled.",
      );
    }
    try {
      return context.json({ models: await options.codexProvider.listModels() });
    } catch (error) {
      return jsonError(
        context,
        503,
        "CODEX_MODEL_CATALOG_UNAVAILABLE",
        error instanceof Error
          ? error.message
          : "The Codex model catalog is unavailable.",
      );
    }
  });

  app.post("/api/providers/codex/login", async (context) => {
    if (options.codexProvider === undefined) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider is not enabled.",
      );
    }
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      if (!isRecord(body)) {
        throw new InteractionInputError("The login request must be an object.");
      }
      assertExactKeys(body, new Set(["type"]), "Codex login request");
      const type = requiredString(body, "type");
      if (type !== "chatgpt" && type !== "chatgptDeviceCode") {
        throw new InteractionInputError(
          "Only Codex-managed ChatGPT login modes are allowed.",
        );
      }
      return context.json(await options.codexProvider.startManagedLogin(type));
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
        "CODEX_LOGIN_REJECTED",
        error instanceof Error ? error.message : "Codex login was rejected.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.post("/api/providers/codex/login/cancel", async (context) => {
    if (options.codexProvider === undefined) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider is not enabled.",
      );
    }
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      if (!isRecord(body)) {
        throw new InteractionInputError(
          "The login cancellation must be an object.",
        );
      }
      assertExactKeys(body, new Set(["loginId"]), "Codex login cancellation");
      await options.codexProvider.cancelManagedLogin(
        requiredString(body, "loginId"),
      );
      return context.json({ cancelled: true });
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
        "CODEX_LOGIN_CANCELLATION_REJECTED",
        error instanceof Error
          ? error.message
          : "Codex login cancellation was rejected.",
      );
    }
  });

  app.post("/api/providers/codex/threads", async (context) => {
    if (
      options.codexProvider === undefined ||
      options.codexWorkspaceRoot === undefined
    ) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider has no configured workspace root.",
      );
    }
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      if (!isRecord(body)) {
        throw new InteractionInputError(
          "The thread request must be an object.",
        );
      }
      assertExactKeys(
        body,
        new Set([
          "model",
          "approvalPolicy",
          "sandbox",
          "personality",
          "ephemeral",
        ]),
        "Codex thread request",
      );
      const model = body.model;
      if (
        model !== undefined &&
        (typeof model !== "string" || model.length === 0)
      ) {
        throw new InteractionInputError("model must be a non-empty string.");
      }
      const ephemeral = body.ephemeral;
      if (ephemeral !== undefined && typeof ephemeral !== "boolean") {
        throw new InteractionInputError("ephemeral must be a boolean.");
      }
      const approvalPolicy = optionalEnum(body, "approvalPolicy", [
        "untrusted",
        "on-request",
        "never",
      ] as const);
      const sandbox = optionalEnum(body, "sandbox", [
        "read-only",
        "workspace-write",
      ] as const);
      const personality = optionalEnum(body, "personality", [
        "none",
        "friendly",
        "pragmatic",
      ] as const);
      return context.json(
        await options.codexProvider.startThread({
          cwd: resolve(options.codexWorkspaceRoot),
          ...(model === undefined ? {} : { model }),
          ...(approvalPolicy === undefined ? {} : { approvalPolicy }),
          ...(sandbox === undefined ? {} : { sandbox }),
          ...(personality === undefined ? {} : { personality }),
          ...(ephemeral === undefined ? {} : { ephemeral }),
        }),
      );
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
        "CODEX_THREAD_REJECTED",
        error instanceof Error ? error.message : "Codex thread was rejected.",
      );
    }
  });

  app.post("/api/providers/codex/turns", async (context) => {
    if (options.codexProvider === undefined) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider is not enabled.",
      );
    }
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      if (!isRecord(body)) {
        throw new InteractionInputError("The turn request must be an object.");
      }
      assertExactKeys(
        body,
        new Set(["threadId", "prompt", "model", "effort"]),
        "Codex turn request",
      );
      const model = body.model;
      if (
        model !== undefined &&
        (typeof model !== "string" || model.length === 0)
      ) {
        throw new InteractionInputError("model must be a non-empty string.");
      }
      const effort = optionalEnum(body, "effort", [
        "minimal",
        "low",
        "medium",
        "high",
        "xhigh",
      ] as const);
      return context.json(
        await options.codexProvider.startTurn({
          threadId: requiredString(body, "threadId"),
          prompt: requiredString(body, "prompt"),
          ...(model === undefined ? {} : { model }),
          ...(effort === undefined ? {} : { effort }),
        }),
      );
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
        "CODEX_TURN_REJECTED",
        error instanceof Error ? error.message : "Codex turn was rejected.",
      );
    }
  });

  app.post("/api/providers/codex/turns/interrupt", async (context) => {
    if (options.codexProvider === undefined) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider is not enabled.",
      );
    }
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      if (!isRecord(body)) {
        throw new InteractionInputError(
          "The interrupt request must be an object.",
        );
      }
      assertExactKeys(
        body,
        new Set(["threadId", "turnId"]),
        "Codex interrupt request",
      );
      await options.codexProvider.interruptTurn(
        requiredString(body, "threadId"),
        requiredString(body, "turnId"),
      );
      return context.json({ interrupted: true });
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
        "CODEX_INTERRUPT_REJECTED",
        error instanceof Error
          ? error.message
          : "Codex turn interrupt was rejected.",
      );
    }
  });

  app.post("/api/providers/codex/approvals/resolve", async (context) => {
    if (options.codexProvider === undefined) {
      return jsonError(
        context,
        503,
        "CODEX_PROVIDER_UNAVAILABLE",
        "The Codex subscription provider is not enabled.",
      );
    }
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      if (!isRecord(body)) {
        throw new InteractionInputError(
          "The approval response must be an object.",
        );
      }
      assertExactKeys(
        body,
        new Set(["requestId", "decision"]),
        "Codex approval response",
      );
      const requestId = body.requestId;
      if (
        typeof requestId !== "string" &&
        !(typeof requestId === "number" && Number.isSafeInteger(requestId))
      ) {
        throw new InteractionInputError(
          "requestId must be a string or safe integer.",
        );
      }
      const decision = optionalEnum(body, "decision", [
        "accept",
        "acceptForSession",
        "decline",
        "cancel",
      ] as const);
      if (decision === undefined) {
        throw new InteractionInputError("decision is required.");
      }
      await options.codexProvider.resolveApproval(requestId, decision);
      return context.json({ resolved: true });
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
        "CODEX_APPROVAL_REJECTED",
        error instanceof Error ? error.message : "Codex approval was rejected.",
      );
    }
  });

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
