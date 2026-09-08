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
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  DurableReviewInterruptError,
  PetraInteractionRuntime,
  derivePetraId,
  type ReviewInterruptBoundary,
  type ReviewResolutionContext,
  type ProjectEffectiveControlsViewReader,
  type ProjectInquiryAuthoredStatus,
  type ProjectInquiryViewReader,
  type ProjectObjectLocationViewReader,
  type ProjectRelationshipViewReader,
  type ProjectReviewViewReader,
  type ProjectShellViewReader,
  type ProjectSourceViewReader,
  type ProjectThreadLifecycleFilter,
  type ProjectThreadViewReader,
  type ProjectWorkStateFilter,
  type ProjectWorkViewReader,
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
  projectShellViews?: ProjectShellViewReader;
  projectEffectiveControls?: ProjectEffectiveControlsViewReader;
  projectSourceViews?: ProjectSourceViewReader;
  projectReviewViews?: ProjectReviewViewReader;
  projectRelationshipViews?: ProjectRelationshipViewReader;
  projectObjectLocations?: ProjectObjectLocationViewReader;
  projectWorkViews?: ProjectWorkViewReader;
  projectThreadViews?: ProjectThreadViewReader;
  projectInquiryViews?: ProjectInquiryViewReader;
}

export interface PetraApp {
  app: PetraHono;
  runtime: PetraInteractionRuntime;
  closeInteractionStreams: () => void;
}

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const PETRA_ID_PATTERN = /^[a-z][a-z0-9_]{1,31}_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORK_UNIT_ID_PATTERN = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_THREAD_ID_PATTERN = /^project_thread_[0-9A-HJKMNP-TV-Z]{26}$/u;
const OBJECTIVE_ID_PATTERN = /^objective_[0-9A-HJKMNP-TV-Z]{26}$/u;
const SEMANTIC_KEY_PATTERN = /^[a-z][a-z0-9._/-]{1,199}$/u;
const LOCATION_INTENTS = [
  "orient",
  "inspect",
  "trace",
  "review",
  "continue_work",
  "view_history",
] as const;
const PROJECT_WORK_STATES: readonly ProjectWorkStateFilter[] = [
  "requested",
  "queued",
  "running",
  "checkpointed",
  "completed",
  "cancelled",
];
const PROJECT_THREAD_LIFECYCLES: readonly ProjectThreadLifecycleFilter[] = [
  "open",
  "archived",
];
const PROJECT_INQUIRY_STATUSES: readonly ProjectInquiryAuthoredStatus[] = [
  "active",
  "satisfied",
  "superseded",
  "abandoned",
];

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
  const contracts = new PetraContractRegistry();
  const assertProjectShellView = (
    view: Awaited<
      ReturnType<
        NonNullable<PetraAppOptions["projectShellViews"]>["getProjectShellView"]
      >
    >,
  ): void => {
    if (view === undefined) return;
    contracts.assertValid("project-shell-view", view.schema_version, view);
  };

  const interactionStreamResponse = (parameters: {
    runId: string;
    connectionId: string;
    deliveryKind: "initial" | "resume" | "replay";
    afterSequence: number;
    accept: string | undefined;
    requestId: string;
    traceId: string;
    requestSignal: AbortSignal;
  }): Response => {
    const startedAt = new Date().toISOString();
    let lastDeliveredSequence = parameters.afterSequence;
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
      (event) => {
        lastDeliveredSequence = event.sequence;
      },
    );
    const iterator = encoded.chunks[Symbol.asyncIterator]();
    let deliveryRecorded = false;
    const recordDelivery = async (
      outcome: "completed" | "aborted" | "write_error",
      error?: { code: string; message: string },
    ): Promise<void> => {
      if (deliveryRecorded) return;
      deliveryRecorded = true;
      activeStreams.delete(streamAbort);
      parameters.requestSignal.removeEventListener("abort", abortFromRequest);
      await runtime.recordDelivery(parameters.runId, outcome, {
        connectionId: parameters.connectionId,
        deliveryKind: parameters.deliveryKind,
        afterSequence: parameters.afterSequence,
        lastDeliveredSequence,
        startedAt,
        completedAt: new Date().toISOString(),
        ...(error === undefined ? {} : { error }),
      });
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
            void recordDelivery("aborted").catch(() => undefined);
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
            await recordDelivery(
              streamAbort.signal.aborted ? "aborted" : "completed",
            );
            controller.close();
            return;
          }
          controller.enqueue(result.value);
        } catch (error: unknown) {
          if (streamClosed) return;
          streamClosed = true;
          await recordDelivery("write_error", {
            code: "INTERACTION_STREAM_WRITE_FAILED",
            message:
              error instanceof Error
                ? error.message
                : "The interaction stream failed while writing.",
          });
          controller.error(error);
        }
      },
      async cancel() {
        if (streamClosed) return;
        streamClosed = true;
        streamAbort.abort();
        await iterator.return?.(undefined);
        await recordDelivery("aborted");
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

  app.get("/api/queries/projects", async (context) => {
    if (options.projectShellViews === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_SHELL_UNAVAILABLE",
        "The authorized Project shell read boundary is not configured.",
      );
    }
    try {
      const projects = await options.projectShellViews.listProjectShellViews();
      for (const project of projects) {
        assertProjectShellView(project);
      }
      return context.json({
        projects,
      });
    } catch (error) {
      return jsonError(
        context,
        503,
        "PROJECT_SHELL_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project shell collection is unavailable.",
      );
    }
  });

  app.get("/api/queries/projects/:projectId/shell", async (context) => {
    if (options.projectShellViews === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_SHELL_UNAVAILABLE",
        "The authorized Project shell read boundary is not configured.",
      );
    }
    try {
      const parameters = new URL(context.req.url).searchParams;
      const allowed = new Set([
        "semanticKey",
        "objectId",
        "revision",
        "taskIntent",
      ]);
      const unknown = [...parameters.keys()].filter((key) => !allowed.has(key));
      if (unknown.length > 0) {
        throw new InteractionInputError(
          "Project shell selection contains unregistered query parameters.",
          [...new Set(unknown)],
        );
      }
      for (const key of allowed) {
        if (parameters.getAll(key).length > 1) {
          throw new InteractionInputError(
            `Project shell selection parameter ${key} must appear once.`,
          );
        }
      }
      const hasSelection = [...parameters.keys()].length > 0;
      const semanticKey = parameters.get("semanticKey");
      const objectId = parameters.get("objectId");
      const taskIntent = parameters.get("taskIntent");
      const revisionValue = parameters.get("revision");
      if (
        hasSelection &&
        (semanticKey === null ||
          !SEMANTIC_KEY_PATTERN.test(semanticKey) ||
          objectId === null ||
          !PETRA_ID_PATTERN.test(objectId) ||
          taskIntent === null ||
          !LOCATION_INTENTS.includes(
            taskIntent as (typeof LOCATION_INTENTS)[number],
          ))
      ) {
        throw new InteractionInputError(
          "Project shell selection requires a registered semanticKey, opaque Petra objectId, and taskIntent.",
        );
      }
      const parsedRevision =
        revisionValue === null ? undefined : Number(revisionValue);
      if (
        parsedRevision !== undefined &&
        (!Number.isSafeInteger(parsedRevision) || parsedRevision < 1)
      ) {
        throw new InteractionInputError(
          "Project shell selection revision must be a positive safe integer.",
        );
      }
      const view = await options.projectShellViews.getProjectShellView(
        context.req.param("projectId"),
        hasSelection &&
          semanticKey !== null &&
          objectId !== null &&
          taskIntent !== null
          ? {
              object_ref: {
                semantic_key: semanticKey,
                object_id: objectId,
                ...(parsedRevision === undefined
                  ? {}
                  : { revision: parsedRevision }),
              },
              task_intent: taskIntent as (typeof LOCATION_INTENTS)[number],
            }
          : undefined,
      );
      if (view === undefined) {
        return jsonError(
          context,
          404,
          "PROJECT_NOT_FOUND",
          "The requested Project does not exist in the local authority store.",
        );
      }
      assertProjectShellView(view);
      return context.json(view);
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 503,
        error instanceof InteractionInputError
          ? "PROJECT_SHELL_SELECTION_INVALID"
          : "PROJECT_SHELL_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project shell view is unavailable.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.get(
    "/api/queries/projects/:projectId/effective-controls",
    async (context) => {
      if (options.projectEffectiveControls === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_EFFECTIVE_CONTROLS_UNAVAILABLE",
          "The authorized effective Project controls read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Effective Project controls do not accept client-supplied policy or profile overrides.",
            [...new Set(parameters.keys())],
          );
        }
        const view =
          await options.projectEffectiveControls.getProjectEffectiveControlsView(
            context.req.param("projectId"),
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_NOT_FOUND",
            "The requested Project does not exist in the local authority store.",
          );
        }
        contracts.assertValid("project-effective-controls-view", "1.0.0", view);
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_EFFECTIVE_CONTROLS_TARGET_INVALID"
            : "PROJECT_EFFECTIVE_CONTROLS_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The effective Project controls view is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get("/api/queries/projects/:projectId/threads", async (context) => {
    if (options.projectThreadViews === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_THREADS_UNAVAILABLE",
        "The authorized Project thread read boundary is not configured.",
      );
    }
    try {
      const parameters = new URL(context.req.url).searchParams;
      const allowed = new Set(["limit", "cursor", "lifecycle"]);
      const unknown = [...parameters.keys()].filter((key) => !allowed.has(key));
      if (unknown.length > 0) {
        throw new InteractionInputError(
          "Project thread collection contains unregistered query parameters.",
          [...new Set(unknown)],
        );
      }
      for (const key of allowed) {
        if (parameters.getAll(key).length > 1) {
          throw new InteractionInputError(
            `Project thread collection parameter ${key} must appear once.`,
          );
        }
      }
      const limitValue = parameters.get("limit");
      const limit = limitValue === null ? undefined : Number(limitValue);
      if (
        limit !== undefined &&
        (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      ) {
        throw new InteractionInputError(
          "Project thread collection limit must be an integer from 1 through 100.",
        );
      }
      const cursorValue = parameters.get("cursor");
      const cursor = cursorValue === null ? undefined : cursorValue;
      if (cursor !== undefined && !/^offset:[0-9]{1,9}$/u.test(cursor)) {
        throw new InteractionInputError(
          "Project thread collection cursor is invalid.",
        );
      }
      const lifecycle = optionalEnum(
        Object.fromEntries(parameters.entries()),
        "lifecycle",
        PROJECT_THREAD_LIFECYCLES,
      );
      const projectId = context.req.param("projectId");
      const view = await options.projectThreadViews.listProjectThreadView(
        projectId,
        {
          ...(limit === undefined ? {} : { limit }),
          ...(cursor === undefined ? {} : { cursor }),
          ...(lifecycle === undefined ? {} : { lifecycle }),
        },
      );
      if (view === undefined) {
        return jsonError(
          context,
          404,
          "PROJECT_NOT_FOUND",
          "The requested Project does not exist in the local authority store.",
        );
      }
      contracts.assertValid("project-thread-view", "1.0.0", view);
      if (
        view.project_id !== projectId ||
        view.content.view_kind !== "collection" ||
        view.content.query.limit !== (limit ?? 50) ||
        view.content.query.cursor !== cursor ||
        view.content.query.lifecycle !== lifecycle
      ) {
        throw new Error(
          "The Project thread reader returned a different Project or query.",
        );
      }
      return context.json(view);
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 503,
        error instanceof InteractionInputError
          ? "PROJECT_THREAD_QUERY_INVALID"
          : "PROJECT_THREAD_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project thread collection is unavailable.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.get(
    "/api/queries/projects/:projectId/threads/:projectThreadId",
    async (context) => {
      if (options.projectThreadViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_THREADS_UNAVAILABLE",
          "The authorized Project thread read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Exact Project thread detail does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectThreadId = context.req.param("projectThreadId");
        if (!PROJECT_THREAD_ID_PATTERN.test(projectThreadId)) {
          throw new InteractionInputError(
            "Project thread detail requires a canonical ProjectThread identity.",
          );
        }
        const projectId = context.req.param("projectId");
        const view = await options.projectThreadViews.getProjectThreadView(
          projectId,
          projectThreadId,
        );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_THREAD_NOT_FOUND",
            "The requested ProjectThread is not bound to this Project.",
          );
        }
        contracts.assertValid("project-thread-view", "1.0.0", view);
        if (
          view.project_id !== projectId ||
          view.content.view_kind !== "detail" ||
          view.content.summary.thread_ref.project_thread_id !== projectThreadId
        ) {
          throw new Error(
            "The Project thread detail reader returned a different Project or thread.",
          );
        }
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_THREAD_TARGET_INVALID"
            : "PROJECT_THREAD_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project thread detail is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get("/api/queries/projects/:projectId/inquiries", async (context) => {
    if (options.projectInquiryViews === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_INQUIRIES_UNAVAILABLE",
        "The authorized Project inquiry read boundary is not configured.",
      );
    }
    try {
      const parameters = new URL(context.req.url).searchParams;
      const allowed = new Set([
        "limit",
        "cursor",
        "authored_status",
        "work_unit_id",
      ]);
      const unknown = [...parameters.keys()].filter((key) => !allowed.has(key));
      if (unknown.length > 0) {
        throw new InteractionInputError(
          "Project inquiry collection contains unregistered query parameters.",
          [...new Set(unknown)],
        );
      }
      for (const key of allowed) {
        if (parameters.getAll(key).length > 1) {
          throw new InteractionInputError(
            `Project inquiry collection parameter ${key} must appear once.`,
          );
        }
      }
      const limitValue = parameters.get("limit");
      const limit = limitValue === null ? undefined : Number(limitValue);
      if (
        limit !== undefined &&
        (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      ) {
        throw new InteractionInputError(
          "Project inquiry collection limit must be an integer from 1 through 100.",
        );
      }
      const cursorValue = parameters.get("cursor");
      const cursor = cursorValue === null ? undefined : cursorValue;
      if (cursor !== undefined && !/^offset:[0-9]{1,9}$/u.test(cursor)) {
        throw new InteractionInputError(
          "Project inquiry collection cursor is invalid.",
        );
      }
      const authoredStatus = optionalEnum(
        Object.fromEntries(parameters.entries()),
        "authored_status",
        PROJECT_INQUIRY_STATUSES,
      );
      const workUnitValue = parameters.get("work_unit_id");
      const workUnitId = workUnitValue === null ? undefined : workUnitValue;
      if (workUnitId !== undefined && !WORK_UNIT_ID_PATTERN.test(workUnitId)) {
        throw new InteractionInputError(
          "Project inquiry Work filter requires a canonical WorkUnit identity.",
        );
      }
      const projectId = context.req.param("projectId");
      const view = await options.projectInquiryViews.listProjectInquiryView(
        projectId,
        {
          ...(limit === undefined ? {} : { limit }),
          ...(cursor === undefined ? {} : { cursor }),
          ...(authoredStatus === undefined
            ? {}
            : { authored_status: authoredStatus }),
          ...(workUnitId === undefined ? {} : { work_unit_id: workUnitId }),
        },
      );
      if (view === undefined) {
        return jsonError(
          context,
          404,
          "PROJECT_NOT_FOUND",
          "The requested Project does not exist in the local authority store.",
        );
      }
      contracts.assertValid("project-inquiry-view", "1.0.0", view);
      if (
        view.project_id !== projectId ||
        view.content.view_kind !== "collection" ||
        view.content.query.limit !== (limit ?? 50) ||
        view.content.query.cursor !== cursor ||
        view.content.query.authored_status !== authoredStatus ||
        view.content.query.work_unit_id !== workUnitId
      ) {
        throw new Error(
          "The Project inquiry reader returned a different Project or query.",
        );
      }
      return context.json(view);
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 503,
        error instanceof InteractionInputError
          ? "PROJECT_INQUIRY_QUERY_INVALID"
          : "PROJECT_INQUIRY_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project inquiry collection is unavailable.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.get(
    "/api/queries/projects/:projectId/inquiries/:objectiveId",
    async (context) => {
      if (options.projectInquiryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_INQUIRIES_UNAVAILABLE",
          "The authorized Project inquiry read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Exact Project inquiry detail does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const objectiveId = context.req.param("objectiveId");
        if (!OBJECTIVE_ID_PATTERN.test(objectiveId)) {
          throw new InteractionInputError(
            "Project inquiry detail requires a canonical mapped Objective identity.",
          );
        }
        const projectId = context.req.param("projectId");
        const view = await options.projectInquiryViews.getProjectInquiryView(
          projectId,
          objectiveId,
        );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_INQUIRY_NOT_FOUND",
            "The requested inquiry anchor is not mapped within this Project.",
          );
        }
        contracts.assertValid("project-inquiry-view", "1.0.0", view);
        if (
          view.project_id !== projectId ||
          view.content.view_kind !== "detail" ||
          view.content.summary.inquiry_anchor_ref.objective_id !== objectiveId
        ) {
          throw new Error(
            "The Project inquiry detail reader returned a different Project or inquiry anchor.",
          );
        }
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_INQUIRY_TARGET_INVALID"
            : "PROJECT_INQUIRY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project inquiry detail is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get("/api/queries/projects/:projectId/work", async (context) => {
    if (options.projectWorkViews === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_WORK_UNAVAILABLE",
        "The authorized Project Work read boundary is not configured.",
      );
    }
    try {
      const parameters = new URL(context.req.url).searchParams;
      const allowed = new Set(["limit", "cursor", "state"]);
      const unknown = [...parameters.keys()].filter((key) => !allowed.has(key));
      if (unknown.length > 0) {
        throw new InteractionInputError(
          "Project Work collection contains unregistered query parameters.",
          [...new Set(unknown)],
        );
      }
      for (const key of allowed) {
        if (parameters.getAll(key).length > 1) {
          throw new InteractionInputError(
            `Project Work collection parameter ${key} must appear once.`,
          );
        }
      }
      const limitValue = parameters.get("limit");
      const limit = limitValue === null ? undefined : Number(limitValue);
      if (
        limit !== undefined &&
        (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      ) {
        throw new InteractionInputError(
          "Project Work collection limit must be an integer from 1 through 100.",
        );
      }
      const cursorValue = parameters.get("cursor");
      const cursor = cursorValue === null ? undefined : cursorValue;
      if (cursor !== undefined && !/^offset:[0-9]{1,9}$/u.test(cursor)) {
        throw new InteractionInputError(
          "Project Work collection cursor is invalid.",
        );
      }
      const state = optionalEnum(
        Object.fromEntries(parameters.entries()),
        "state",
        PROJECT_WORK_STATES,
      );
      const projectId = context.req.param("projectId");
      const view = await options.projectWorkViews.listProjectWorkView(
        projectId,
        {
          ...(limit === undefined ? {} : { limit }),
          ...(cursor === undefined ? {} : { cursor }),
          ...(state === undefined ? {} : { state }),
        },
      );
      if (view === undefined) {
        return jsonError(
          context,
          404,
          "PROJECT_NOT_FOUND",
          "The requested Project does not exist in the local authority store.",
        );
      }
      contracts.assertValid("project-work-view", "1.0.0", view);
      if (
        view.project_id !== projectId ||
        view.content.view_kind !== "collection" ||
        view.content.query.limit !== (limit ?? 50) ||
        view.content.query.cursor !== cursor ||
        view.content.query.state !== state
      ) {
        throw new Error(
          "The Project Work collection reader returned a different Project or query.",
        );
      }
      return context.json(view);
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 503,
        error instanceof InteractionInputError
          ? "PROJECT_WORK_QUERY_INVALID"
          : "PROJECT_WORK_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project Work collection is unavailable.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.get(
    "/api/queries/projects/:projectId/work/:workUnitId",
    async (context) => {
      if (options.projectWorkViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_WORK_UNAVAILABLE",
          "The authorized Project Work read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Exact Project Work detail does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const workUnitId = context.req.param("workUnitId");
        if (!WORK_UNIT_ID_PATTERN.test(workUnitId)) {
          throw new InteractionInputError(
            "Project Work detail requires a canonical WorkUnit identity.",
          );
        }
        const projectId = context.req.param("projectId");
        const view = await options.projectWorkViews.getProjectWorkView(
          projectId,
          workUnitId,
        );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_WORK_NOT_FOUND",
            "The requested WorkUnit is not bound to this Project.",
          );
        }
        contracts.assertValid("project-work-view", "1.0.0", view);
        if (
          view.project_id !== projectId ||
          view.content.view_kind !== "detail" ||
          view.content.summary.work_unit_ref.work_unit_id !== workUnitId
        ) {
          throw new Error(
            "The Project Work detail reader returned a different Project or WorkUnit.",
          );
        }
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_WORK_TARGET_INVALID"
            : "PROJECT_WORK_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project Work detail is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get("/api/queries/projects/:projectId/sources", async (context) => {
    if (options.projectSourceViews === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_SOURCES_UNAVAILABLE",
        "The authorized Project source read boundary is not configured.",
      );
    }
    try {
      const sources = await options.projectSourceViews.listProjectSourceViews(
        context.req.param("projectId"),
      );
      for (const source of sources) {
        contracts.assertValid("project-source-view", "1.0.0", source);
      }
      return context.json({ sources });
    } catch (error) {
      return jsonError(
        context,
        503,
        "PROJECT_SOURCES_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project source collection is unavailable.",
      );
    }
  });

  app.get(
    "/api/queries/projects/:projectId/sources/:projectSourceId",
    async (context) => {
      if (options.projectSourceViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCES_UNAVAILABLE",
          "The authorized Project source read boundary is not configured.",
        );
      }
      try {
        const source = await options.projectSourceViews.getProjectSourceView(
          context.req.param("projectId"),
          context.req.param("projectSourceId"),
        );
        if (source === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_SOURCE_NOT_FOUND",
            "The requested source is not bound to this Project.",
          );
        }
        contracts.assertValid("project-source-view", "1.0.0", source);
        return context.json(source);
      } catch (error) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project source view is unavailable.",
        );
      }
    },
  );

  app.get("/api/queries/projects/:projectId/reviews", async (context) => {
    if (options.projectReviewViews === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_REVIEWS_UNAVAILABLE",
        "The authorized Project Review read boundary is not configured.",
      );
    }
    try {
      const reviews = await options.projectReviewViews.listProjectReviewViews(
        context.req.param("projectId"),
      );
      for (const review of reviews) {
        contracts.assertValid("project-review-view", "1.0.0", review);
      }
      return context.json({ reviews });
    } catch (error) {
      return jsonError(
        context,
        503,
        "PROJECT_REVIEWS_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project Review collection is unavailable.",
      );
    }
  });

  app.get(
    "/api/queries/projects/:projectId/reviews/:reviewSessionId",
    async (context) => {
      if (options.projectReviewViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_REVIEWS_UNAVAILABLE",
          "The authorized Project Review read boundary is not configured.",
        );
      }
      try {
        const review = await options.projectReviewViews.getProjectReviewView(
          context.req.param("projectId"),
          context.req.param("reviewSessionId"),
        );
        if (review === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_REVIEW_NOT_FOUND",
            "The requested Review session is not bound to this Project.",
          );
        }
        contracts.assertValid("project-review-view", "1.0.0", review);
        return context.json(review);
      } catch (error) {
        return jsonError(
          context,
          503,
          "PROJECT_REVIEW_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project Review view is unavailable.",
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/relationship-view",
    async (context) => {
      if (options.projectRelationshipViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_RELATIONSHIPS_UNAVAILABLE",
          "The authorized Project relationship read boundary is not configured.",
        );
      }
      try {
        const view =
          await options.projectRelationshipViews.getProjectRelationshipView(
            context.req.param("projectId"),
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_RELATIONSHIP_NOT_FOUND",
            "No current supported relationship path is available for this Project.",
          );
        }
        contracts.assertValid("project-relationship-view", "1.0.0", view);
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          503,
          "PROJECT_RELATIONSHIP_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project relationship view is unavailable.",
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/object-location",
    async (context) => {
      if (options.projectObjectLocations === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_OBJECT_LOCATION_UNAVAILABLE",
          "The authorized semantic destination boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const allowed = new Set([
          "semanticKey",
          "objectId",
          "revision",
          "taskIntent",
        ]);
        const unknown = [...parameters.keys()].filter(
          (key) => !allowed.has(key),
        );
        if (unknown.length > 0) {
          throw new InteractionInputError(
            "Semantic location contains unregistered query parameters.",
            [...new Set(unknown)],
          );
        }
        for (const key of allowed) {
          if (parameters.getAll(key).length > 1) {
            throw new InteractionInputError(
              `Semantic location parameter ${key} must appear once.`,
            );
          }
        }
        const semanticKey = parameters.get("semanticKey");
        const objectId = parameters.get("objectId");
        const taskIntent = parameters.get("taskIntent");
        const revisionValue = parameters.get("revision");
        if (
          semanticKey === null ||
          !SEMANTIC_KEY_PATTERN.test(semanticKey) ||
          objectId === null ||
          !PETRA_ID_PATTERN.test(objectId) ||
          taskIntent === null ||
          !LOCATION_INTENTS.includes(
            taskIntent as (typeof LOCATION_INTENTS)[number],
          )
        ) {
          throw new InteractionInputError(
            "Semantic location requires a registered semanticKey, opaque Petra objectId, and taskIntent.",
          );
        }
        const parsedRevision =
          revisionValue === null ? undefined : Number(revisionValue);
        if (
          parsedRevision !== undefined &&
          (!Number.isSafeInteger(parsedRevision) || parsedRevision < 1)
        ) {
          throw new InteractionInputError(
            "Semantic location revision must be a positive safe integer.",
          );
        }
        const view = await options.projectObjectLocations.locateProjectObject({
          project_id: context.req.param("projectId"),
          object_ref: {
            semantic_key: semanticKey,
            object_id: objectId,
            ...(parsedRevision === undefined
              ? {}
              : { revision: parsedRevision }),
          },
          task_intent: taskIntent as (typeof LOCATION_INTENTS)[number],
        });
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_NOT_FOUND",
            "The requested Project is unavailable.",
          );
        }
        contracts.assertValid("project-object-location-view", "1.0.0", view);
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_OBJECT_LOCATION_INVALID"
            : "PROJECT_OBJECT_LOCATION_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The semantic destination is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
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
      if (!isRecord(body)) {
        throw new InteractionInputError("Cancellation requires a JSON object.");
      }
      assertExactKeys(body, new Set(["commandId", "reason"]), "Cancellation");
      const commandId = requiredString(body, "commandId");
      const reason =
        body.reason === undefined
          ? "The researcher explicitly stopped this running task."
          : requiredString(body, "reason");
      return context.json(
        await runtime.cancel({
          commandId,
          runId: context.req.param("runId"),
          reason,
        }),
      );
    } catch (error: unknown) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 409,
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
      const restored = await runtime.restoreInteraction(
        parsed.request.threadId,
        runId,
        parsed.request.prompt,
      );
      if (restored === undefined) runtime.startInteraction(parsed.request);

      return interactionStreamResponse({
        runId,
        connectionId:
          parsed.connectionId ??
          derivePetraId(
            "interaction_connection",
            `${parsed.request.threadId}|default`,
          ),
        deliveryKind:
          restored === undefined
            ? "initial"
            : parsed.afterSequence > 0
              ? "resume"
              : "replay",
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

  app.get("/api/interactions/:runId", async (context) => {
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
      let snapshot: ReturnType<PetraInteractionRuntime["snapshot"]> | undefined;
      try {
        snapshot = runtime.snapshot(runId);
      } catch {
        const threadId = context.req.query("thread");
        if (threadId === undefined || !ID_PATTERN.test(threadId)) {
          throw new InteractionInputError(
            "A valid thread query parameter is required to restore a durable interaction.",
          );
        }
        snapshot = await runtime.restoreInteraction(threadId, runId);
      }
      if (snapshot === undefined)
        throw new Error(`Unknown interaction run: ${runId}`);
      const connection = context.req.query("connection");
      if (
        connection !== undefined &&
        !/^interaction_connection_[0-9A-HJKMNP-TV-Z]{26}$/.test(connection)
      ) {
        throw new InteractionInputError(
          "connection must be a Petra InteractionConnection identifier.",
        );
      }
      return interactionStreamResponse({
        runId,
        connectionId:
          connection ??
          derivePetraId(
            "interaction_connection",
            `${snapshot.threadId}|default`,
          ),
        deliveryKind: afterSequence > 0 ? "resume" : "replay",
        afterSequence,
        requestId: context.get("requestId"),
        traceId: context.get("traceId"),
        requestSignal: context.req.raw.signal,
        accept: context.req.header("accept"),
      });
    } catch (error: unknown) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 404,
        error instanceof InteractionInputError
          ? "INVALID_REPLAY_REQUEST"
          : "RUN_NOT_FOUND",
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
