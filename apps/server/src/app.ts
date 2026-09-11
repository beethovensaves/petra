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
import type {
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationPlanRequest,
  ProjectHistoryRetainedCollectionFiltersV11,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  DurableReviewInterruptError,
  PetraInteractionRuntime,
  ProjectHistoryCompensationExecutionUnavailableError,
  ProjectHistoryCompensationPlanUnavailableError,
  ProjectHistoryRecoveryPreviewUnavailableError,
  ProjectHistoryViewRequestError,
  ProjectSourceLifecycleAuthorityError,
  ProjectSourceReplacementCommandError,
  derivePetraId,
  type AuthenticatedCommandPrincipalResolver,
  type ReviewInterruptBoundary,
  type ReviewResolutionContext,
  type ProjectEffectiveControlsViewReader,
  type ProjectHistoryViewReader,
  type ProjectHistoryCompensationExecutionBoundary,
  type ProjectInquiryAuthoredStatus,
  type ProjectInquiryViewReader,
  type ProjectObjectLocationViewReader,
  type ProjectRelationshipViewReader,
  type ProjectReviewViewReader,
  type ProjectShellViewReader,
  type ProjectSourceLifecycleAction,
  type ProjectSourceLifecycleAuthorityRepository,
  type ProjectSourceLifecycleCommandEnvelope,
  type ProjectSourceLifecycleViewReader,
  type ProjectSourceReplacementCommandAuthorityRepository,
  type ProjectSourceReplacementCommandEnvelope,
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
  projectHistoryViews?: ProjectHistoryViewReader;
  projectHistoryCompensationExecution?: ProjectHistoryCompensationExecutionBoundary;
  projectSourceViews?: ProjectSourceViewReader;
  projectSourceLifecycleViews?: ProjectSourceLifecycleViewReader;
  commandPrincipalResolver?: AuthenticatedCommandPrincipalResolver;
  projectSourceLifecycleAuthority?: ProjectSourceLifecycleAuthorityRepository;
  projectSourceReplacementAuthority?: ProjectSourceReplacementCommandAuthorityRepository;
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
const PROJECT_ID_PATTERN = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID_PATTERN = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_REPLACEMENT_ID_PATTERN =
  /^project_source_replacement_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_LIFECYCLE_RECEIPT_ID_PATTERN =
  /^project_source_lifecycle_receipt_[0-9A-HJKMNP-TV-Z]{26}$/u;
const COMMAND_ID_PATTERN = /^command_[0-9A-HJKMNP-TV-Z]{26}$/u;
const EVENT_ID_PATTERN = /^event_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HISTORY_CURSOR_PATTERN = /^phc2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/u;
const HISTORY_ACTOR_ID_PATTERN = /^actor_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HISTORY_TIMESTAMP_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u;
const HISTORY_FAMILIES = new Set([
  "change_control",
  "project_source_lifecycle",
  "project_source_replacement",
]);
const HISTORY_COMMAND_NAMES = new Set([
  "SubmitChangeSet",
  "RecordApproval",
  "ApplyChangeSet",
  "ExcludeProjectSource",
  "RestoreProjectSource",
  "CreateProjectSourceReplacement",
  "RetractProjectSourceReplacement",
]);
const HISTORY_EVENT_TYPES = new Set([
  "change_set.submitted",
  "approval.recorded",
  "change_set.applied",
  "change_set.conflicted",
  "change_set.reverted",
  "change_set.reversal_conflicted",
  "project_source.excluded",
  "project_source.restored",
  "project_source.replacement_created",
  "project_source.replacement_retracted",
]);
const HISTORY_OUTCOMES = new Set(["completed", "conflicted"]);
const HISTORY_EFFECTS = new Set([
  "change_proposed",
  "approval_recorded",
  "authority_change_applied",
  "authority_change_conflicted",
  "authority_change_reverted",
  "reversal_conflicted",
  "project_source_excluded",
  "project_source_restored",
  "source_replacement_created",
  "source_replacement_retracted",
]);
const HISTORY_TARGET_SEMANTIC_KEYS = new Set([
  "petra.change-set",
  "petra.approval",
  "scientific.claim",
  "scientific.assertion",
  "petra.project-source",
  "petra.project-source-replacement",
  "petra.project-source-replacement-retraction",
]);
const CONTENT_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,511}$/u;
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
const PROJECT_SOURCE_LIFECYCLE_ACTIONS: readonly ProjectSourceLifecycleAction[] =
  ["exclude_project_source", "restore_project_source", "delete_local_copy"];
const PROJECT_SOURCE_LIFECYCLE_COMMAND_ACTIONS = [
  "exclude_project_source",
  "restore_project_source",
] as const;
const PROJECT_SOURCE_REPLACEMENT_KINDS = [
  "newer_source_version",
  "identity_resolution",
  "preferred_copy_changed",
  "project_role_replacement",
] as const;

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

const positiveSafeInteger = (
  value: Record<string, unknown>,
  key: string,
): number => {
  const member = value[key];
  if (!Number.isSafeInteger(member) || Number(member) < 1) {
    throw new InteractionInputError(`${key} must be a positive safe integer.`);
  }
  return Number(member);
};

const canonicalHashMember = (
  value: Record<string, unknown>,
  key: string,
): string => {
  const member = requiredString(value, key);
  if (!CONTENT_HASH_PATTERN.test(member)) {
    throw new InteractionInputError(`${key} must be a canonical SHA-256 hash.`);
  }
  return member;
};

const projectSourceReplacementSourceRef = <
  Status extends "active" | "excluded",
>(
  value: unknown,
  label: string,
  expectedStatus: Status,
): {
  project_source_id: string;
  revision: number;
  content_hash: string;
  record_hash: string;
  status: Status;
} => {
  if (!isRecord(value)) {
    throw new InteractionInputError(
      `${label} must be an exact ProjectSource reference.`,
    );
  }
  assertExactKeys(
    value,
    new Set([
      "project_source_id",
      "revision",
      "content_hash",
      "record_hash",
      "status",
    ]),
    label,
  );
  const projectSourceId = requiredString(value, "project_source_id");
  if (!PROJECT_SOURCE_ID_PATTERN.test(projectSourceId)) {
    throw new InteractionInputError(
      `${label}.project_source_id must be canonical.`,
    );
  }
  const status = optionalEnum(value, "status", ["active", "excluded"] as const);
  if (status !== expectedStatus) {
    throw new InteractionInputError(
      `${label}.status must be ${expectedStatus}.`,
    );
  }
  return {
    project_source_id: projectSourceId,
    revision: positiveSafeInteger(value, "revision"),
    content_hash: canonicalHashMember(value, "content_hash"),
    record_hash: canonicalHashMember(value, "record_hash"),
    status: expectedStatus,
  };
};

const projectSourceReplacementExclusionReceiptRef = (
  value: unknown,
): {
  project_source_lifecycle_receipt_id: string;
  revision: 1;
  content_hash: string;
  record_hash: string;
} => {
  if (!isRecord(value)) {
    throw new InteractionInputError(
      "exclusion_receipt_ref must be an exact lifecycle receipt reference.",
    );
  }
  assertExactKeys(
    value,
    new Set([
      "project_source_lifecycle_receipt_id",
      "revision",
      "content_hash",
      "record_hash",
    ]),
    "exclusion_receipt_ref",
  );
  const receiptId = requiredString(
    value,
    "project_source_lifecycle_receipt_id",
  );
  if (!PROJECT_SOURCE_LIFECYCLE_RECEIPT_ID_PATTERN.test(receiptId)) {
    throw new InteractionInputError(
      "exclusion_receipt_ref must name a canonical lifecycle receipt.",
    );
  }
  if (positiveSafeInteger(value, "revision") !== 1) {
    throw new InteractionInputError(
      "exclusion_receipt_ref revision must be 1.",
    );
  }
  return {
    project_source_lifecycle_receipt_id: receiptId,
    revision: 1,
    content_hash: canonicalHashMember(value, "content_hash"),
    record_hash: canonicalHashMember(value, "record_hash"),
  };
};

const projectSourceReplacementExactRef = (
  value: unknown,
): {
  project_source_replacement_id: string;
  revision: 1;
  content_hash: string;
  record_hash: string;
  state: "active";
} => {
  if (!isRecord(value)) {
    throw new InteractionInputError(
      "expected_replacement_ref must be an exact active replacement reference.",
    );
  }
  assertExactKeys(
    value,
    new Set([
      "project_source_replacement_id",
      "revision",
      "content_hash",
      "record_hash",
      "state",
    ]),
    "expected_replacement_ref",
  );
  const replacementId = requiredString(value, "project_source_replacement_id");
  if (!PROJECT_SOURCE_REPLACEMENT_ID_PATTERN.test(replacementId)) {
    throw new InteractionInputError(
      "expected_replacement_ref must name a canonical replacement.",
    );
  }
  if (
    positiveSafeInteger(value, "revision") !== 1 ||
    optionalEnum(value, "state", ["active", "retracted"] as const) !== "active"
  ) {
    throw new InteractionInputError(
      "expected_replacement_ref must name active revision 1.",
    );
  }
  return {
    project_source_replacement_id: replacementId,
    revision: 1,
    content_hash: canonicalHashMember(value, "content_hash"),
    record_hash: canonicalHashMember(value, "record_hash"),
    state: "active",
  };
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

  app.post(
    "/api/queries/projects/:projectId/history/events/:eventId/recovery/plan",
    async (context) => {
      if (options.projectHistoryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_UNAVAILABLE",
          "The authorized Project History read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const projectId = context.req.param("projectId");
        const eventId = context.req.param("eventId");
        if (
          [...parameters.keys()].length > 0 ||
          !PROJECT_ID_PATTERN.test(projectId) ||
          !EVENT_ID_PATTERN.test(eventId)
        ) {
          throw new InteractionInputError(
            "A History compensation plan requires canonical Project and event identities and accepts no query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const value = await readBoundedJson(context, maxBodyBytes);
        try {
          contracts.assertValid(
            "project-history-compensation-plan-request",
            "1.0.0",
            value,
          );
        } catch {
          throw new InteractionInputError(
            "The History compensation plan request must contain one exact preview reference, non-empty reason and Approval rationale, and explicit confirmation.",
          );
        }
        const request = value as PetraProjectHistoryCompensationPlanRequest;
        if (
          request.project_id !== projectId ||
          request.event_id !== eventId ||
          request.confirmation.reason.trim().length === 0 ||
          request.confirmation.approval_rationale.trim().length === 0
        ) {
          throw new InteractionInputError(
            "The compensation plan request must remain bound to the routed Project and event and contain substantive confirmed input.",
          );
        }
        const view =
          await options.projectHistoryViews.composeProjectHistoryCompensationPlan(
            request,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_HISTORY_EVENT_NOT_FOUND",
            "The requested event is not available in this Project History.",
          );
        }
        contracts.assertValid(
          "project-history-compensation-plan-view",
          "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.event_id !== eventId ||
          view.content.preview_ref.content_hash !==
            request.preview_ref.content_hash ||
          view.content.preview_ref.binding_hash !==
            request.preview_ref.binding_hash
        ) {
          throw new Error(
            "The Project History compensation plan returned a different Project, event, or preview binding.",
          );
        }
        return context.json(view);
      } catch (error) {
        const invalid = error instanceof InteractionInputError;
        const unavailable =
          error instanceof ProjectHistoryCompensationPlanUnavailableError ||
          error instanceof ProjectHistoryRecoveryPreviewUnavailableError;
        return jsonError(
          context,
          invalid ? 422 : unavailable ? 409 : 503,
          invalid
            ? "PROJECT_HISTORY_COMPENSATION_PLAN_REQUEST_INVALID"
            : unavailable
              ? "PROJECT_HISTORY_COMPENSATION_PLAN_UNAVAILABLE"
              : "PROJECT_HISTORY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project History compensation command plan is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/history/events/:eventId/recovery/execute",
    async (context) => {
      if (options.projectHistoryCompensationExecution === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_COMPENSATION_EXECUTION_UNAVAILABLE",
          "The authenticated Project History compensation execution boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const projectId = context.req.param("projectId");
        const eventId = context.req.param("eventId");
        if (
          [...parameters.keys()].length > 0 ||
          !PROJECT_ID_PATTERN.test(projectId) ||
          !EVENT_ID_PATTERN.test(eventId)
        ) {
          throw new InteractionInputError(
            "A History compensation execution requires canonical Project and event identities and accepts no query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const value = await readBoundedJson(context, maxBodyBytes);
        try {
          contracts.assertValid(
            "project-history-compensation-execution-request",
            "1.0.0",
            value,
          );
        } catch {
          throw new InteractionInputError(
            "The History compensation execution request must contain one exact composed plan and explicit per-command atomicity confirmation.",
          );
        }
        const request =
          value as PetraProjectHistoryCompensationExecutionRequest;
        if (
          request.project_id !== projectId ||
          request.event_id !== eventId ||
          request.plan.project_id !== projectId ||
          request.plan.event_id !== eventId
        ) {
          throw new InteractionInputError(
            "The compensation execution request and plan must remain bound to the routed Project event.",
          );
        }
        const view =
          await options.projectHistoryCompensationExecution.executeProjectHistoryCompensationPlan(
            request,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_HISTORY_EVENT_NOT_FOUND",
            "The requested event is not available in this Project History.",
          );
        }
        contracts.assertValid(
          "project-history-compensation-execution-view",
          "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.event_id !== eventId ||
          view.content.plan_ref.content_hash !== request.plan.content_hash
        ) {
          throw new Error(
            "The Project History compensation execution returned a different Project, event, or plan identity.",
          );
        }
        return context.json(view);
      } catch (error) {
        const invalid = error instanceof InteractionInputError;
        const unavailable =
          error instanceof
            ProjectHistoryCompensationExecutionUnavailableError ||
          error instanceof ProjectHistoryCompensationPlanUnavailableError ||
          error instanceof ProjectHistoryRecoveryPreviewUnavailableError;
        return jsonError(
          context,
          invalid ? 422 : unavailable ? 409 : 503,
          invalid
            ? "PROJECT_HISTORY_COMPENSATION_EXECUTION_REQUEST_INVALID"
            : unavailable
              ? "PROJECT_HISTORY_COMPENSATION_EXECUTION_UNAVAILABLE"
              : "PROJECT_HISTORY_COMPENSATION_EXECUTION_FAILED",
          error instanceof Error
            ? error.message
            : "The Project History compensation execution is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/history/recent",
    async (context) => {
      if (options.projectHistoryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_UNAVAILABLE",
          "The authorized Project History read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "The bounded Recent changes read accepts no query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const view =
          await options.projectHistoryViews.getRecentProjectHistoryView(
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
        contracts.assertValid("project-history-view", "1.0.0", view);
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_HISTORY_QUERY_INVALID"
            : "PROJECT_HISTORY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project Recent changes view is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/history/events",
    async (context) => {
      if (options.projectHistoryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_UNAVAILABLE",
          "The authorized Project History read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const allowed = new Set([
          "limit",
          "cursor",
          "family",
          "command_name",
          "event_type",
          "actor_id",
          "outcome",
          "effect",
          "target_semantic_key",
          "target_object_id",
          "recorded_from",
          "recorded_through",
        ]);
        const unknown = [...parameters.keys()].filter(
          (key) => !allowed.has(key),
        );
        if (unknown.length > 0) {
          throw new InteractionInputError(
            "Retained Project History contains unregistered query parameters.",
            [...new Set(unknown)],
          );
        }
        for (const key of allowed) {
          if (parameters.getAll(key).length > 1) {
            throw new InteractionInputError(
              `Retained Project History parameter ${key} must appear once.`,
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
            "Retained Project History limit must be an integer from 1 through 100.",
          );
        }
        const cursorValue = parameters.get("cursor");
        const cursor = cursorValue === null ? undefined : cursorValue;
        if (
          cursor !== undefined &&
          (cursor.length > 1024 || !HISTORY_CURSOR_PATTERN.test(cursor))
        ) {
          throw new InteractionInputError(
            "Retained Project History cursor is invalid.",
          );
        }
        const family = parameters.get("family") ?? undefined;
        const commandName = parameters.get("command_name") ?? undefined;
        const eventType = parameters.get("event_type") ?? undefined;
        const actorId = parameters.get("actor_id") ?? undefined;
        const outcome = parameters.get("outcome") ?? undefined;
        const effect = parameters.get("effect") ?? undefined;
        const targetSemanticKey =
          parameters.get("target_semantic_key") ?? undefined;
        const targetObjectId = parameters.get("target_object_id") ?? undefined;
        const recordedFrom = parameters.get("recorded_from") ?? undefined;
        const recordedThrough = parameters.get("recorded_through") ?? undefined;
        if (family !== undefined && !HISTORY_FAMILIES.has(family)) {
          throw new InteractionInputError(
            "Retained Project History family filter is invalid.",
          );
        }
        if (
          commandName !== undefined &&
          !HISTORY_COMMAND_NAMES.has(commandName)
        ) {
          throw new InteractionInputError(
            "Retained Project History command filter is invalid.",
          );
        }
        if (eventType !== undefined && !HISTORY_EVENT_TYPES.has(eventType)) {
          throw new InteractionInputError(
            "Retained Project History event filter is invalid.",
          );
        }
        if (actorId !== undefined && !HISTORY_ACTOR_ID_PATTERN.test(actorId)) {
          throw new InteractionInputError(
            "Retained Project History Actor filter is invalid.",
          );
        }
        if (outcome !== undefined && !HISTORY_OUTCOMES.has(outcome)) {
          throw new InteractionInputError(
            "Retained Project History outcome filter is invalid.",
          );
        }
        if (effect !== undefined && !HISTORY_EFFECTS.has(effect)) {
          throw new InteractionInputError(
            "Retained Project History authority-effect filter is invalid.",
          );
        }
        if (
          (targetSemanticKey === undefined) !==
          (targetObjectId === undefined)
        ) {
          throw new InteractionInputError(
            "Retained Project History target filtering requires both semantic key and object identity.",
          );
        }
        if (
          targetSemanticKey !== undefined &&
          !HISTORY_TARGET_SEMANTIC_KEYS.has(targetSemanticKey)
        ) {
          throw new InteractionInputError(
            "Retained Project History target semantic key is invalid.",
          );
        }
        if (
          targetObjectId !== undefined &&
          !PETRA_ID_PATTERN.test(targetObjectId)
        ) {
          throw new InteractionInputError(
            "Retained Project History target object identity is invalid.",
          );
        }
        const validHistoryTimestamp = (value: string | undefined): boolean =>
          value === undefined ||
          (HISTORY_TIMESTAMP_PATTERN.test(value) &&
            Number.isFinite(Date.parse(value)));
        if (
          !validHistoryTimestamp(recordedFrom) ||
          !validHistoryTimestamp(recordedThrough) ||
          (recordedFrom !== undefined &&
            recordedThrough !== undefined &&
            Date.parse(recordedFrom) > Date.parse(recordedThrough))
        ) {
          throw new InteractionInputError(
            "Retained Project History recorded-time bounds are invalid.",
          );
        }
        const filters: ProjectHistoryRetainedCollectionFiltersV11 = {
          ...(family === undefined
            ? {}
            : {
                family: family as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV11["family"]
                >,
              }),
          ...(commandName === undefined
            ? {}
            : {
                command_name: commandName as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV11["command_name"]
                >,
              }),
          ...(eventType === undefined
            ? {}
            : {
                event_type: eventType as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV11["event_type"]
                >,
              }),
          ...(actorId === undefined ? {} : { actor_id: actorId }),
          ...(outcome === undefined
            ? {}
            : {
                outcome: outcome as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV11["outcome"]
                >,
              }),
          ...(effect === undefined
            ? {}
            : {
                effect: effect as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV11["effect"]
                >,
              }),
          ...(targetSemanticKey === undefined || targetObjectId === undefined
            ? {}
            : {
                target: {
                  semantic_key: targetSemanticKey as NonNullable<
                    ProjectHistoryRetainedCollectionFiltersV11["target"]
                  >["semantic_key"],
                  object_id: targetObjectId,
                },
              }),
          ...(recordedFrom === undefined && recordedThrough === undefined
            ? {}
            : {
                recorded_at: {
                  ...(recordedFrom === undefined
                    ? {}
                    : { from_inclusive: recordedFrom }),
                  ...(recordedThrough === undefined
                    ? {}
                    : { through_inclusive: recordedThrough }),
                },
              }),
        };
        const projectId = context.req.param("projectId");
        const view =
          await options.projectHistoryViews.listRetainedProjectHistoryView(
            projectId,
            {
              ...(limit === undefined ? {} : { limit }),
              ...(cursor === undefined ? {} : { cursor }),
              filters,
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
        contracts.assertValid("project-history-retained-view", "1.1.0", view);
        if (
          view.project_id !== projectId ||
          view.content.view_kind !== "retained_events" ||
          view.content.query.limit !== (limit ?? 50) ||
          view.content.query.cursor !== cursor ||
          JSON.stringify(view.content.query.filters) !== JSON.stringify(filters)
        ) {
          throw new Error(
            "The retained Project History reader returned a different Project or query.",
          );
        }
        return context.json(view);
      } catch (error) {
        const invalid =
          error instanceof InteractionInputError ||
          error instanceof ProjectHistoryViewRequestError;
        return jsonError(
          context,
          invalid ? 422 : 503,
          invalid
            ? "PROJECT_HISTORY_RETAINED_QUERY_INVALID"
            : "PROJECT_HISTORY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The retained Project History is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/history/events/:eventId/impact",
    async (context) => {
      if (options.projectHistoryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_UNAVAILABLE",
          "The authorized Project History read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const eventId = context.req.param("eventId");
        if (
          [...parameters.keys()].length > 0 ||
          !EVENT_ID_PATTERN.test(eventId)
        ) {
          throw new InteractionInputError(
            "A History dependency-impact read requires one canonical event identity and accepts no query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const view =
          await options.projectHistoryViews.getProjectHistoryImpactView(
            projectId,
            eventId,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_HISTORY_EVENT_NOT_FOUND",
            "The requested event is not available in this Project History.",
          );
        }
        contracts.assertValid("project-history-impact-view", "1.4.0", view);
        if (
          view.project_id !== projectId ||
          view.event_id !== eventId ||
          view.content.selected_event.event_ref.event_id !== eventId
        ) {
          throw new Error(
            "The Project History impact reader returned a different Project or event.",
          );
        }
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_HISTORY_IMPACT_TARGET_INVALID"
            : "PROJECT_HISTORY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project History dependency impact is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/history/events/:eventId/recovery",
    async (context) => {
      if (options.projectHistoryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_UNAVAILABLE",
          "The authorized Project History read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const eventId = context.req.param("eventId");
        if (
          [...parameters.keys()].length > 0 ||
          !EVENT_ID_PATTERN.test(eventId)
        ) {
          throw new InteractionInputError(
            "A History recovery assessment requires one canonical event identity and accepts no query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const view =
          await options.projectHistoryViews.getProjectHistoryRecoveryAssessmentView(
            projectId,
            eventId,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_HISTORY_EVENT_NOT_FOUND",
            "The requested event is not available in this Project History.",
          );
        }
        contracts.assertValid(
          "project-history-recovery-assessment-view",
          "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.event_id !== eventId ||
          view.content.selected_event.event_ref.event_id !== eventId ||
          view.content.causal_impact_basis.source_event_id !== eventId
        ) {
          throw new Error(
            "The Project History recovery reader returned a different Project or event.",
          );
        }
        return context.json(view);
      } catch (error) {
        const invalid =
          error instanceof InteractionInputError ||
          error instanceof ProjectHistoryViewRequestError;
        return jsonError(
          context,
          invalid ? 422 : 503,
          invalid
            ? "PROJECT_HISTORY_RECOVERY_TARGET_INVALID"
            : "PROJECT_HISTORY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project History recovery assessment is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/history/events/:eventId/recovery/preview",
    async (context) => {
      if (options.projectHistoryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_UNAVAILABLE",
          "The authorized Project History read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const eventId = context.req.param("eventId");
        if (
          [...parameters.keys()].length > 0 ||
          !EVENT_ID_PATTERN.test(eventId)
        ) {
          throw new InteractionInputError(
            "A History compensation preview requires one canonical event identity and accepts no query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const view =
          await options.projectHistoryViews.getProjectHistoryCompensationPreviewView(
            projectId,
            eventId,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_HISTORY_EVENT_NOT_FOUND",
            "The requested event is not available in this Project History.",
          );
        }
        contracts.assertValid(
          "project-history-compensation-preview-view",
          "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.event_id !== eventId ||
          view.content.assessment_ref.event_id !== eventId ||
          view.content.impact_basis.source_event_id !== eventId
        ) {
          throw new Error(
            "The Project History compensation preview returned a different Project or event.",
          );
        }
        return context.json(view);
      } catch (error) {
        const invalid = error instanceof InteractionInputError;
        const unavailable =
          error instanceof ProjectHistoryRecoveryPreviewUnavailableError;
        return jsonError(
          context,
          invalid ? 422 : unavailable ? 409 : 503,
          invalid
            ? "PROJECT_HISTORY_COMPENSATION_PREVIEW_TARGET_INVALID"
            : unavailable
              ? "PROJECT_HISTORY_RECOVERY_PREVIEW_UNAVAILABLE"
              : "PROJECT_HISTORY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project History compensation preview is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/history/events/:eventId",
    async (context) => {
      if (options.projectHistoryViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_HISTORY_UNAVAILABLE",
          "The authorized Project History read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const eventId = context.req.param("eventId");
        if (
          [...parameters.keys()].length > 0 ||
          !EVENT_ID_PATTERN.test(eventId)
        ) {
          throw new InteractionInputError(
            "A History episode requires one canonical event identity and accepts no query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const view =
          await options.projectHistoryViews.getProjectHistoryEpisodeView(
            context.req.param("projectId"),
            eventId,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_HISTORY_EVENT_NOT_FOUND",
            "The requested event is not available in this Project History.",
          );
        }
        contracts.assertValid("project-history-episode-view", "1.0.0", view);
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_HISTORY_EVENT_INVALID"
            : "PROJECT_HISTORY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project History episode is unavailable.",
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
    "/api/queries/projects/:projectId/sources/:projectSourceId/lifecycle",
    async (context) => {
      if (options.projectSourceLifecycleViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LIFECYCLE_UNAVAILABLE",
          "The authorized Project source lifecycle preview boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const unknown = [...parameters.keys()].filter(
          (key) => key !== "requested_action",
        );
        if (unknown.length > 0) {
          throw new InteractionInputError(
            "Project source lifecycle preview contains unregistered query parameters.",
            [...new Set(unknown)],
          );
        }
        if (parameters.getAll("requested_action").length !== 1) {
          throw new InteractionInputError(
            "Project source lifecycle requested_action must appear exactly once.",
          );
        }
        const requestedAction = optionalEnum(
          Object.fromEntries(parameters.entries()),
          "requested_action",
          PROJECT_SOURCE_LIFECYCLE_ACTIONS,
        );
        if (requestedAction === undefined) {
          throw new InteractionInputError(
            "Project source lifecycle requested_action is required.",
          );
        }
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (!/^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectSourceId)) {
          throw new InteractionInputError(
            "Project source lifecycle preview requires a canonical ProjectSource identity.",
          );
        }
        const view =
          await options.projectSourceLifecycleViews.getProjectSourceLifecycleView(
            projectId,
            projectSourceId,
            requestedAction,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_SOURCE_NOT_FOUND",
            "The requested source is not bound to this Project.",
          );
        }
        contracts.assertValid("project-source-lifecycle-view", "1.0.0", view);
        if (
          view.project_id !== projectId ||
          view.project_source_id !== projectSourceId ||
          view.content.requested_action !== requestedAction
        ) {
          throw new Error(
            "The Project source lifecycle reader returned a different Project, source, or action.",
          );
        }
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_SOURCE_LIFECYCLE_QUERY_INVALID"
            : "PROJECT_SOURCE_LIFECYCLE_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project source lifecycle preview is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/sources/:projectSourceId/lifecycle",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.projectSourceLifecycleAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LIFECYCLE_COMMAND_UNAVAILABLE",
          "The authenticated Project source lifecycle command boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Project source lifecycle commands do not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "Project source lifecycle commands require a canonical Project identity.",
          );
        }
        if (!PROJECT_SOURCE_ID_PATTERN.test(projectSourceId)) {
          throw new InteractionInputError(
            "Project source lifecycle commands require a canonical ProjectSource identity.",
          );
        }

        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The Project source lifecycle command must be an object.",
          );
        }
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "requested_action",
            "expected_source_ref",
            "reason",
          ]),
          "Project source lifecycle command",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
        const requestedAction = optionalEnum(
          body,
          "requested_action",
          PROJECT_SOURCE_LIFECYCLE_COMMAND_ACTIONS,
        );
        const reason = requiredString(body, "reason");
        if (!COMMAND_ID_PATTERN.test(commandId)) {
          throw new InteractionInputError(
            "command_id must be a canonical command-prefixed Petra ID.",
          );
        }
        if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
          throw new InteractionInputError(
            "idempotency_key must satisfy Petra's registered command key format.",
          );
        }
        if (requestedAction === undefined) {
          throw new InteractionInputError("requested_action is required.");
        }
        if (reason.length > 4_000) {
          throw new InteractionInputError(
            "reason must contain at most 4000 characters.",
          );
        }
        const expectedSourceRef = body.expected_source_ref;
        if (!isRecord(expectedSourceRef)) {
          throw new InteractionInputError(
            "expected_source_ref must be an exact ProjectSource reference.",
          );
        }
        assertExactKeys(
          expectedSourceRef,
          new Set([
            "project_source_id",
            "revision",
            "content_hash",
            "record_hash",
            "status",
          ]),
          "expected_source_ref",
        );
        const expectedProjectSourceId = requiredString(
          expectedSourceRef,
          "project_source_id",
        );
        const contentHash = requiredString(expectedSourceRef, "content_hash");
        const recordHash = requiredString(expectedSourceRef, "record_hash");
        const status = optionalEnum(expectedSourceRef, "status", [
          "active",
          "excluded",
        ] as const);
        const revision = expectedSourceRef.revision;
        if (
          expectedProjectSourceId !== projectSourceId ||
          !PROJECT_SOURCE_ID_PATTERN.test(expectedProjectSourceId)
        ) {
          throw new InteractionInputError(
            "expected_source_ref must name the ProjectSource in the route.",
          );
        }
        if (!Number.isSafeInteger(revision) || Number(revision) < 1) {
          throw new InteractionInputError(
            "expected_source_ref revision must be a positive safe integer.",
          );
        }
        if (
          !CONTENT_HASH_PATTERN.test(contentHash) ||
          !CONTENT_HASH_PATTERN.test(recordHash)
        ) {
          throw new InteractionInputError(
            "expected_source_ref must contain canonical SHA-256 content and record hashes.",
          );
        }
        const requiredStatus =
          requestedAction === "exclude_project_source" ? "active" : "excluded";
        if (status !== requiredStatus) {
          throw new InteractionInputError(
            `${requestedAction} requires expected_source_ref status ${requiredStatus}.`,
          );
        }
        const commandName =
          requestedAction === "exclude_project_source"
            ? "ExcludeProjectSource"
            : "RestoreProjectSource";
        const principal =
          await options.commandPrincipalResolver.resolveCommandPrincipal({
            projectId,
            commandName,
          });
        if (principal.state === "denied") {
          if (principal.reason === "active_grant_not_found") {
            return jsonError(
              context,
              403,
              "PROJECT_SOURCE_LIFECYCLE_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for this Project command.",
            );
          }
          return jsonError(
            context,
            503,
            principal.reason === "actor_not_registered"
              ? "AUTHENTICATED_ACTOR_UNAVAILABLE"
              : "PROJECT_COMMAND_AUTHORITY_AMBIGUOUS",
            principal.reason === "actor_not_registered"
              ? "The configured authenticated Actor is not registered."
              : "More than one active grant matches the authenticated Project command.",
          );
        }
        const command =
          requestedAction === "exclude_project_source"
            ? {
                command_name: "ExcludeProjectSource" as const,
                expected_source_ref: {
                  project_source_id: expectedProjectSourceId,
                  revision: Number(revision),
                  content_hash: contentHash,
                  record_hash: recordHash,
                  status: "active" as const,
                },
                reason,
              }
            : {
                command_name: "RestoreProjectSource" as const,
                expected_source_ref: {
                  project_source_id: expectedProjectSourceId,
                  revision: Number(revision),
                  content_hash: contentHash,
                  record_hash: recordHash,
                  status: "excluded" as const,
                },
                reason,
              };
        const envelope: ProjectSourceLifecycleCommandEnvelope = {
          schema_name: "petra.command-envelope",
          schema_version: "1.2.0",
          command_id: commandId,
          idempotency_key: idempotencyKey,
          project_id: projectId,
          actor: principal.actor,
          capability_grant_id: principal.capabilityGrantId,
          correlation_id: derivePetraId(
            "trace",
            `${context.get("requestId")}:${randomUUID()}`,
          ),
          submitted_at: new Date().toISOString(),
          command,
        };
        contracts.assertValid("command-envelope", "1.2.0", envelope);
        const result =
          await options.projectSourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
            envelope,
          );
        contracts.assertValid(
          "project-source-lifecycle-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("project-source", "1.0.0", result.projectSource);
        if (
          result.receipt.project_id !== projectId ||
          result.receipt.content.command_ref.command_id !== commandId ||
          result.receipt.content.command_ref.idempotency_key !==
            idempotencyKey ||
          result.receipt.content.command_ref.command_name !== commandName ||
          result.receipt.content.prior_source_ref.project_source_id !==
            projectSourceId ||
          result.receipt.content.prior_source_ref.revision !==
            Number(revision) ||
          result.receipt.content.prior_source_ref.content_hash !==
            contentHash ||
          result.receipt.content.prior_source_ref.record_hash !== recordHash ||
          result.receipt.content.prior_source_ref.status !== status ||
          result.receipt.content.resulting_source_ref.project_source_id !==
            projectSourceId ||
          result.projectSource.project_id !== projectId ||
          result.projectSource.project_source_id !== projectSourceId ||
          result.projectSource.revision !==
            result.receipt.content.resulting_source_ref.revision ||
          result.projectSource.content_hash !==
            result.receipt.content.resulting_source_ref.content_hash ||
          result.projectSource.content.status !==
            result.receipt.content.resulting_source_ref.status ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The Project source lifecycle authority returned a different command, Project, source, or result.",
          );
        }
        return context.json({
          receipt: result.receipt,
          project_source: result.projectSource,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "PROJECT_SOURCE_LIFECYCLE_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ProjectSourceLifecycleAuthorityError) {
          const status =
            error.code === "PROJECT_SOURCE_LIFECYCLE_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code === "PROJECT_SOURCE_LIFECYCLE_SOURCE_NOT_FOUND"
                ? 404
                : error.code ===
                    "PROJECT_SOURCE_LIFECYCLE_STORED_RECORD_CORRUPT"
                  ? 503
                  : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LIFECYCLE_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The Project source lifecycle command failed.",
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/source-replacements",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.projectSourceReplacementAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_UNAVAILABLE",
          "The authenticated Project source replacement command boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Project source replacement commands do not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "Project source replacement commands require a canonical Project identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The Project source replacement command must be an object.",
          );
        }
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "replacement_kind",
            "replaced_source_ref",
            "replacement_source_ref",
            "exclusion_receipt_ref",
            "rationale",
          ]),
          "Project source replacement command",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
        const replacementKind = optionalEnum(
          body,
          "replacement_kind",
          PROJECT_SOURCE_REPLACEMENT_KINDS,
        );
        const rationale = requiredString(body, "rationale");
        if (!COMMAND_ID_PATTERN.test(commandId)) {
          throw new InteractionInputError(
            "command_id must be a canonical command-prefixed Petra ID.",
          );
        }
        if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
          throw new InteractionInputError(
            "idempotency_key must satisfy Petra's registered command key format.",
          );
        }
        if (replacementKind === undefined) {
          throw new InteractionInputError("replacement_kind is required.");
        }
        if (rationale.length > 4_000) {
          throw new InteractionInputError(
            "rationale must contain at most 4000 characters.",
          );
        }
        const replacedSourceRef = projectSourceReplacementSourceRef(
          body.replaced_source_ref,
          "replaced_source_ref",
          "excluded",
        );
        const replacementSourceRef = projectSourceReplacementSourceRef(
          body.replacement_source_ref,
          "replacement_source_ref",
          "active",
        );
        if (
          replacedSourceRef.project_source_id ===
          replacementSourceRef.project_source_id
        ) {
          throw new InteractionInputError(
            "A ProjectSource cannot replace itself.",
          );
        }
        const exclusionReceiptRef = projectSourceReplacementExclusionReceiptRef(
          body.exclusion_receipt_ref,
        );
        const commandName = "CreateProjectSourceReplacement" as const;
        const principal =
          await options.commandPrincipalResolver.resolveCommandPrincipal({
            projectId,
            commandName,
          });
        if (principal.state === "denied") {
          if (principal.reason === "active_grant_not_found") {
            return jsonError(
              context,
              403,
              "PROJECT_SOURCE_REPLACEMENT_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for this Project command.",
            );
          }
          return jsonError(
            context,
            503,
            principal.reason === "actor_not_registered"
              ? "AUTHENTICATED_ACTOR_UNAVAILABLE"
              : "PROJECT_COMMAND_AUTHORITY_AMBIGUOUS",
            principal.reason === "actor_not_registered"
              ? "The configured authenticated Actor is not registered."
              : "More than one active grant matches the authenticated Project command.",
          );
        }
        const envelope: ProjectSourceReplacementCommandEnvelope = {
          schema_name: "petra.command-envelope",
          schema_version: "1.3.0",
          command_id: commandId,
          idempotency_key: idempotencyKey,
          project_id: projectId,
          actor: principal.actor,
          capability_grant_id: principal.capabilityGrantId,
          correlation_id: derivePetraId(
            "trace",
            `${context.get("requestId")}:${randomUUID()}`,
          ),
          submitted_at: new Date().toISOString(),
          command: {
            command_name: commandName,
            replacement_kind: replacementKind,
            replaced_source_ref: replacedSourceRef,
            replacement_source_ref: replacementSourceRef,
            exclusion_receipt_ref: exclusionReceiptRef,
            rationale,
          },
        };
        contracts.assertValid("command-envelope", "1.3.0", envelope);
        const result =
          await options.projectSourceReplacementAuthority.executeProjectSourceReplacementCommand(
            envelope,
          );
        contracts.assertValid(
          "project-source-replacement-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid(
          "project-source-replacement",
          "1.0.0",
          result.replacement,
        );
        const receiptResult = result.receipt.content.result;
        const content = result.replacement.content;
        if (
          result.outcome !== "replacement_created" ||
          result.receipt.project_id !== projectId ||
          result.receipt.content.command_ref.command_id !== commandId ||
          result.receipt.content.command_ref.idempotency_key !==
            idempotencyKey ||
          result.receipt.content.command_ref.command_name !== commandName ||
          receiptResult.effect !== "replacement_activated" ||
          receiptResult.replacement_ref.state !== "active" ||
          result.replacement.project_id !== projectId ||
          result.replacement.project_source_replacement_id !==
            receiptResult.replacement_ref.project_source_replacement_id ||
          result.replacement.revision !==
            receiptResult.replacement_ref.revision ||
          result.replacement.content_hash !==
            receiptResult.replacement_ref.content_hash ||
          content.replacement_kind !== replacementKind ||
          content.rationale !== rationale ||
          content.replaced_source_ref.project_source_id !==
            replacedSourceRef.project_source_id ||
          content.replaced_source_ref.revision !== replacedSourceRef.revision ||
          content.replaced_source_ref.content_hash !==
            replacedSourceRef.content_hash ||
          content.replaced_source_ref.record_hash !==
            replacedSourceRef.record_hash ||
          content.replacement_source_ref.project_source_id !==
            replacementSourceRef.project_source_id ||
          content.replacement_source_ref.revision !==
            replacementSourceRef.revision ||
          content.replacement_source_ref.content_hash !==
            replacementSourceRef.content_hash ||
          content.replacement_source_ref.record_hash !==
            replacementSourceRef.record_hash ||
          content.exclusion_receipt_ref.project_source_lifecycle_receipt_id !==
            exclusionReceiptRef.project_source_lifecycle_receipt_id ||
          content.exclusion_receipt_ref.revision !==
            exclusionReceiptRef.revision ||
          content.exclusion_receipt_ref.content_hash !==
            exclusionReceiptRef.content_hash ||
          content.exclusion_receipt_ref.record_hash !==
            exclusionReceiptRef.record_hash ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The Project source replacement authority returned a different command, Project, relation, or result.",
          );
        }
        return context.json({
          receipt: result.receipt,
          replacement: result.replacement,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "PROJECT_SOURCE_REPLACEMENT_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ProjectSourceReplacementCommandError) {
          const status =
            error.code === "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code ===
                    "PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_MISSING" ||
                  error.code ===
                    "PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_MISSING"
                ? 404
                : error.code ===
                    "PROJECT_SOURCE_REPLACEMENT_COMMAND_STORED_RECORD_CORRUPT"
                  ? 503
                  : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The Project source replacement command failed.",
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/source-replacements/:replacementId/retraction",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.projectSourceReplacementAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_UNAVAILABLE",
          "The authenticated Project source replacement command boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Project source replacement commands do not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const replacementId = context.req.param("replacementId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "Project source replacement commands require a canonical Project identity.",
          );
        }
        if (!PROJECT_SOURCE_REPLACEMENT_ID_PATTERN.test(replacementId)) {
          throw new InteractionInputError(
            "Project source replacement retraction requires a canonical replacement identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The Project source replacement retraction must be an object.",
          );
        }
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "expected_replacement_ref",
            "reason",
          ]),
          "Project source replacement retraction",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
        const reason = requiredString(body, "reason");
        if (!COMMAND_ID_PATTERN.test(commandId)) {
          throw new InteractionInputError(
            "command_id must be a canonical command-prefixed Petra ID.",
          );
        }
        if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
          throw new InteractionInputError(
            "idempotency_key must satisfy Petra's registered command key format.",
          );
        }
        if (reason.length > 4_000) {
          throw new InteractionInputError(
            "reason must contain at most 4000 characters.",
          );
        }
        const expectedReplacementRef = projectSourceReplacementExactRef(
          body.expected_replacement_ref,
        );
        if (
          expectedReplacementRef.project_source_replacement_id !== replacementId
        ) {
          throw new InteractionInputError(
            "expected_replacement_ref must name the replacement in the route.",
          );
        }
        const commandName = "RetractProjectSourceReplacement" as const;
        const principal =
          await options.commandPrincipalResolver.resolveCommandPrincipal({
            projectId,
            commandName,
          });
        if (principal.state === "denied") {
          if (principal.reason === "active_grant_not_found") {
            return jsonError(
              context,
              403,
              "PROJECT_SOURCE_REPLACEMENT_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for this Project command.",
            );
          }
          return jsonError(
            context,
            503,
            principal.reason === "actor_not_registered"
              ? "AUTHENTICATED_ACTOR_UNAVAILABLE"
              : "PROJECT_COMMAND_AUTHORITY_AMBIGUOUS",
            principal.reason === "actor_not_registered"
              ? "The configured authenticated Actor is not registered."
              : "More than one active grant matches the authenticated Project command.",
          );
        }
        const envelope: ProjectSourceReplacementCommandEnvelope = {
          schema_name: "petra.command-envelope",
          schema_version: "1.3.0",
          command_id: commandId,
          idempotency_key: idempotencyKey,
          project_id: projectId,
          actor: principal.actor,
          capability_grant_id: principal.capabilityGrantId,
          correlation_id: derivePetraId(
            "trace",
            `${context.get("requestId")}:${randomUUID()}`,
          ),
          submitted_at: new Date().toISOString(),
          command: {
            command_name: commandName,
            expected_replacement_ref: expectedReplacementRef,
            reason,
          },
        };
        contracts.assertValid("command-envelope", "1.3.0", envelope);
        const result =
          await options.projectSourceReplacementAuthority.executeProjectSourceReplacementCommand(
            envelope,
          );
        contracts.assertValid(
          "project-source-replacement-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid(
          "project-source-replacement",
          "1.0.0",
          result.replacement,
        );
        if (result.outcome === "replacement_retracted") {
          contracts.assertValid(
            "project-source-replacement-retraction",
            "1.0.0",
            result.retraction,
          );
        }
        const receiptResult = result.receipt.content.result;
        if (
          result.outcome !== "replacement_retracted" ||
          receiptResult.effect !== "replacement_retracted" ||
          result.receipt.project_id !== projectId ||
          result.receipt.content.command_ref.command_id !== commandId ||
          result.receipt.content.command_ref.idempotency_key !==
            idempotencyKey ||
          result.receipt.content.command_ref.command_name !== commandName ||
          receiptResult.replacement_ref.project_source_replacement_id !==
            replacementId ||
          receiptResult.replacement_ref.revision !==
            expectedReplacementRef.revision ||
          receiptResult.replacement_ref.content_hash !==
            expectedReplacementRef.content_hash ||
          receiptResult.replacement_ref.record_hash !==
            expectedReplacementRef.record_hash ||
          receiptResult.replacement_ref.state !== "retracted" ||
          result.replacement.project_id !== projectId ||
          result.replacement.project_source_replacement_id !== replacementId ||
          result.replacement.revision !== expectedReplacementRef.revision ||
          result.replacement.content_hash !==
            expectedReplacementRef.content_hash ||
          result.retraction.project_id !== projectId ||
          result.retraction.content.replacement_ref
            .project_source_replacement_id !== replacementId ||
          result.retraction.content.replacement_ref.revision !==
            expectedReplacementRef.revision ||
          result.retraction.content.replacement_ref.content_hash !==
            expectedReplacementRef.content_hash ||
          result.retraction.content.replacement_ref.record_hash !==
            expectedReplacementRef.record_hash ||
          receiptResult.retraction_ref
            .project_source_replacement_retraction_id !==
            result.retraction.project_source_replacement_retraction_id ||
          receiptResult.retraction_ref.revision !==
            result.retraction.revision ||
          receiptResult.retraction_ref.content_hash !==
            result.retraction.content_hash ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The Project source replacement authority returned a different retraction command, Project, relation, or result.",
          );
        }
        return context.json({
          receipt: result.receipt,
          replacement: result.replacement,
          retraction: result.retraction,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "PROJECT_SOURCE_REPLACEMENT_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ProjectSourceReplacementCommandError) {
          const status =
            error.code === "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code ===
                    "PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_MISSING" ||
                  error.code ===
                    "PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_MISSING"
                ? 404
                : error.code ===
                    "PROJECT_SOURCE_REPLACEMENT_COMMAND_STORED_RECORD_CORRUPT"
                  ? 503
                  : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REPLACEMENT_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The Project source replacement command failed.",
        );
      }
    },
  );

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
