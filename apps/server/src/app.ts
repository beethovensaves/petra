import {
  ProjectBriefError,
  type ProjectBriefViewReader,
  type ProjectBriefRequest,
} from "@petra/core";
import {
  ReviewSessionApplyError,
  type ReviewSessionApplyBoundary,
  type ReviewApplyAuthority,
} from "@petra/core";
import type { PetraReviewSessionApplyRequest } from "@petra/contracts";
import {
  validateReviewApplyCheckpoint,
  validateReviewApplyResult,
} from "@petra/adapters";
import {
  ReviewRecoveryAssessmentError,
  type ReviewRecoveryAssessmentReader,
} from "@petra/core";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

import type { Context } from "hono";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { canonicalize } from "json-canonicalize";

import {
  InteractionInputError,
  validateReviewRecoveryAssessment,
  encodeAgUiStream,
  parseAgUiRunInput,
} from "@petra/adapters";
import {
  parseAgUiReviewResponse,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";
import type {
  PetraClaim,
  PetraWorkingCandidate,
  PetraSuggestedActionInvocationRequest,
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationPlanRequest,
  PetraProjectHistoryRetainedContinuationFailure,
  ProjectHistoryRetainedCollectionFiltersV12,
} from "@petra/contracts";
import {
  ContractRegistryError,
  PetraContractRegistry,
} from "@petra/contracts/validator";
import {
  DurableReviewInterruptError,
  PetraInteractionRuntime,
  ProjectHistoryCompensationExecutionUnavailableError,
  ProjectHistoryCompensationPlanUnavailableError,
  ProjectHistoryRetainedContinuationError,
  ProjectHistoryRecoveryPreviewUnavailableError,
  ProjectHistoryViewRequestError,
  ProjectSourceLifecycleAuthorityError,
  ProjectSourceReplacementCommandError,
  ReviewCandidateBasisRevisionAuthorityError,
  ReviewCandidateCorrectionAuthorityError,
  ReviewSessionLifecycleAuthorityError,
  ReviewSessionRefreshAuthorityError,
  ReviewSessionSeparationAuthorityError,
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
  type ProjectRelationshipOverlayViewReader,
  type ProjectRelationshipViewReader,
  type ProjectReviewViewReader,
  type ReviewCandidateBasisRevisionAuthorityRepository,
  type ReviewCandidateBasisRevisionCommandEnvelope,
  type ReviewCandidateCorrectionAuthorityCommandEnvelope,
  type ReviewCandidateCorrectionAuthorityRepository,
  type ReviewSessionLifecycleAuthorityRepository,
  type ReviewSessionLifecycleCommandEnvelope,
  type ReviewSessionRefreshAuthorityRepository,
  type ReviewSessionRefreshCommandEnvelope,
  type ReviewSessionSeparationAuthorityRepository,
  type ReviewSessionSeparationCommandEnvelope,
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
  type ProjectWorkingStateSnapshotReader,
  type SuggestedActionViewReader,
  type SuggestedActionInvocationCoordinator,
  type SuggestedActionInvocationAuthorityRepository,
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
  projectBriefViews?: ProjectBriefViewReader;
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
  reviewRecoveryAssessments?: ReviewRecoveryAssessmentReader;
  reviewSessionApply?: ReviewSessionApplyBoundary;
  reviewSessionLifecycleAuthority?: ReviewSessionLifecycleAuthorityRepository;
  reviewSessionRefreshAuthority?: ReviewSessionRefreshAuthorityRepository;
  reviewCandidateBasisRevisionAuthority?: ReviewCandidateBasisRevisionAuthorityRepository;
  reviewSessionSeparationAuthority?: ReviewSessionSeparationAuthorityRepository;
  reviewCandidateCorrectionAuthority?: ReviewCandidateCorrectionAuthorityRepository;
  projectWorkingStateSnapshots?: ProjectWorkingStateSnapshotReader;
  projectRelationshipViews?: ProjectRelationshipViewReader;
  projectRelationshipOverlayViews?: ProjectRelationshipOverlayViewReader;
  projectObjectLocations?: ProjectObjectLocationViewReader;
  projectWorkViews?: ProjectWorkViewReader;
  projectThreadViews?: ProjectThreadViewReader;
  projectInquiryViews?: ProjectInquiryViewReader;
  suggestedActionViews?: SuggestedActionViewReader;
  suggestedActionInvocations?: Pick<
    SuggestedActionInvocationCoordinator,
    "invoke"
  >;
  suggestedActionInvocationViews?: SuggestedActionInvocationAuthorityRepository;
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
const REVIEW_SESSION_ID_PATTERN = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID_PATTERN = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_CANDIDATE_ID_PATTERN =
  /^working_candidate_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_RELATIONSHIP_ID_PATTERN =
  /^working_relationship_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_LIFECYCLE_RECEIPT_ID_PATTERN =
  /^project_source_lifecycle_receipt_[0-9A-HJKMNP-TV-Z]{26}$/u;
const COMMAND_ID_PATTERN = /^command_[0-9A-HJKMNP-TV-Z]{26}$/u;
const EVENT_ID_PATTERN = /^event_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HISTORY_CURSOR_PATTERN = /^phc2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/u;
const HISTORY_CONTINUATION_FAILURE_MESSAGE =
  "This Full History traversal can no longer continue from its verified snapshot. Start again with the same filters.";
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
const PROJECT_INQUIRY_LINK_ID_PATTERN =
  /^project_inquiry_link_[0-9A-HJKMNP-TV-Z]{26}$/u;
const SUGGESTED_ACTION_ID_PATTERN =
  /^suggested_action_[0-9A-HJKMNP-TV-Z]{26}$/u;
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
const REVIEW_SESSION_LIFECYCLE_ACTIONS = ["defer", "reopen"] as const;

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

const reviewSessionLifecycleExpectedRef = <
  Lifecycle extends "open" | "deferred",
>(
  value: unknown,
  reviewSessionId: string,
  expectedLifecycle: Lifecycle,
): {
  review_session_id: string;
  revision: number;
  content_hash: string;
  lifecycle: Lifecycle;
} => {
  if (!isRecord(value)) {
    throw new InteractionInputError(
      "expected_review_session_ref must be an exact ReviewSession reference.",
    );
  }
  assertExactKeys(
    value,
    new Set(["review_session_id", "revision", "content_hash", "lifecycle"]),
    "expected_review_session_ref",
  );
  const expectedReviewSessionId = requiredString(value, "review_session_id");
  if (
    expectedReviewSessionId !== reviewSessionId ||
    !REVIEW_SESSION_ID_PATTERN.test(expectedReviewSessionId)
  ) {
    throw new InteractionInputError(
      "expected_review_session_ref must name the ReviewSession in the route.",
    );
  }
  const lifecycle = optionalEnum(value, "lifecycle", [
    "open",
    "deferred",
    "completed",
  ] as const);
  if (lifecycle !== expectedLifecycle) {
    throw new InteractionInputError(
      `expected_review_session_ref.lifecycle must be ${expectedLifecycle}.`,
    );
  }
  return {
    review_session_id: expectedReviewSessionId,
    revision: positiveSafeInteger(value, "revision"),
    content_hash: canonicalHashMember(value, "content_hash"),
    lifecycle: expectedLifecycle,
  };
};

const reviewWorkingExpectedRef = <Kind extends "candidate" | "relationship">(
  value: unknown,
  kind: Kind,
): Kind extends "candidate"
  ? {
      working_candidate_id: string;
      revision: number;
      content_hash: string;
    }
  : {
      working_relationship_id: string;
      revision: number;
      content_hash: string;
    } => {
  if (!isRecord(value)) {
    throw new InteractionInputError(
      `expected_working_${kind}_ref must be an exact working reference.`,
    );
  }
  const idKey =
    kind === "candidate" ? "working_candidate_id" : "working_relationship_id";
  assertExactKeys(
    value,
    new Set([idKey, "revision", "content_hash"]),
    `expected_working_${kind}_ref`,
  );
  const id = requiredString(value, idKey);
  const pattern =
    kind === "candidate"
      ? WORKING_CANDIDATE_ID_PATTERN
      : WORKING_RELATIONSHIP_ID_PATTERN;
  if (!pattern.test(id)) {
    throw new InteractionInputError(
      `${idKey} must be a canonical ${kind === "candidate" ? "WorkingCandidate" : "WorkingRelationship"} identity.`,
    );
  }
  return {
    [idKey]: id,
    revision: positiveSafeInteger(value, "revision"),
    content_hash: canonicalHashMember(value, "content_hash"),
  } as never;
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
  const retainedHistoryContinuationFailure = (
    context: Context<{ Variables: Variables }>,
    error: ProjectHistoryRetainedContinuationError,
  ): Response => {
    const failure: PetraProjectHistoryRetainedContinuationFailure = {
      schema_name: "petra.project-history-retained-continuation-failure",
      schema_version: "1.0.0",
      error: {
        code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID",
        subcode: error.subcode,
        message: HISTORY_CONTINUATION_FAILURE_MESSAGE,
        restart: {
          cursor_disposition: "discard_without_client_decoding",
          request_kind: "cursorless_same_project_limit_and_filters",
        },
      },
      requestId: context.get("requestId"),
      traceId: context.get("traceId"),
    };
    contracts.assertValid(
      "project-history-retained-continuation-failure",
      "1.0.0",
      failure,
    );
    return context.json(failure, 422);
  };
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

  const resolveApplyAuthority = async (
    projectId: string,
  ): Promise<ReviewApplyAuthority> => {
    if (options.commandPrincipalResolver === undefined)
      throw new ReviewSessionApplyError(
        "REVIEW_APPLY_DENIED",
        "Authenticated command authority is unavailable.",
      );
    const commands = [
      "SubmitChangeSet",
      "RecordApproval",
      "ApplyChangeSet",
    ] as const;
    const resolved = await Promise.all(
      commands.map((commandName) =>
        options.commandPrincipalResolver!.resolveCommandPrincipal({
          projectId,
          commandName,
        }),
      ),
    );
    const first = resolved[0];
    if (
      first?.state !== "resolved" ||
      first.actor.actor_kind !== "human" ||
      resolved.some(
        (r) =>
          r.state !== "resolved" ||
          canonicalize(r.actor) !== canonicalize(first.actor),
      )
    ) {
      throw new ReviewSessionApplyError(
        "REVIEW_APPLY_DENIED",
        "One authenticated human must hold current grants for SubmitChangeSet, RecordApproval, and ApplyChangeSet.",
      );
    }
    const grants = Object.fromEntries(
      resolved.map((r, i): [string, string] => [
        commands[i]!,
        r.state === "resolved" ? r.capabilityGrantId : "",
      ]),
    );
    return {
      authorization_basis: {
        kind: "authenticated_human_checkpoint",
        decision: "apply",
        actor: { actor_id: first.actor.actor_id, actor_kind: "human" },
      },
      capability_grants: grants as ReviewApplyAuthority["capability_grants"],
    };
  };
  const applyError = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    if (error instanceof ReviewSessionApplyError) {
      const status =
        error.code === "REVIEW_APPLY_DENIED"
          ? 403
          : error.code === "REVIEW_APPLY_UNSUPPORTED"
            ? 422
            : error.code === "REVIEW_APPLY_CORRUPT"
              ? 503
              : 409;
      return jsonError(context, status, error.code, error.message);
    }
    if (
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError
    )
      return jsonError(
        context,
        422,
        "REVIEW_APPLY_INVALID",
        "The exact versioned Apply checkpoint request is invalid.",
      );
    return jsonError(
      context,
      503,
      "REVIEW_APPLY_RECONCILE",
      "The Apply observation is unavailable. Effects may exist; reconcile canonical Review status through D020 before another attempt.",
    );
  };
  app.get(
    "/api/queries/projects/:projectId/reviews/:reviewSessionId/apply-checkpoint",
    async (context) => {
      if (options.reviewSessionApply === undefined)
        return jsonError(
          context,
          503,
          "REVIEW_APPLY_UNAVAILABLE",
          "ReviewSession Apply authority is unavailable.",
        );
      try {
        const projectId = context.req.param("projectId");
        const sessionId = context.req.param("reviewSessionId");
        const params = new URL(context.req.url).searchParams;
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !REVIEW_SESSION_ID_PATTERN.test(sessionId) ||
          [...params.keys()].sort().join(",") !==
            "expected_content_hash,expected_revision,selected_review_member_id"
        )
          throw new TypeError("Invalid Apply selection.");
        const selection = {
          project_id: projectId,
          review_session_id: sessionId,
          expected_revision: Number(params.get("expected_revision")),
          expected_content_hash: params.get("expected_content_hash")!,
          selected_review_member_id: params.get("selected_review_member_id")!,
        };
        if (
          !Number.isSafeInteger(selection.expected_revision) ||
          selection.expected_revision < 1 ||
          !/^sha256:[0-9a-f]{64}$/u.test(selection.expected_content_hash) ||
          !/^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u.test(
            selection.selected_review_member_id,
          )
        )
          throw new TypeError("Invalid exact Review selection.");
        const authority = await resolveApplyAuthority(projectId);
        const result = await options.reviewSessionApply.prepareReviewApply(
          selection,
          authority,
        );
        await validateReviewApplyCheckpoint(result, selection);
        if (
          canonicalize(result.binding.authorization_basis) !==
            canonicalize(authority.authorization_basis) ||
          canonicalize(result.binding.capability_grants) !==
            canonicalize(authority.capability_grants)
        )
          throw new Error("Mismatched authenticated checkpoint.");
        return context.json(result);
      } catch (error) {
        return applyError(context, error);
      }
    },
  );
  app.post(
    "/api/commands/projects/:projectId/reviews/:reviewSessionId/apply",
    async (context) => {
      if (options.reviewSessionApply === undefined)
        return jsonError(
          context,
          503,
          "REVIEW_APPLY_UNAVAILABLE",
          "ReviewSession Apply authority is unavailable.",
        );
      try {
        const projectId = context.req.param("projectId");
        const sessionId = context.req.param("reviewSessionId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !REVIEW_SESSION_ID_PATTERN.test(sessionId) ||
          new URL(context.req.url).search !== ""
        )
          throw new TypeError("Invalid Apply route binding.");
        const body: unknown = await context.req.json();
        contracts.assertValid("review-session-apply-request", "1.0.0", body);
        const request = body as PetraReviewSessionApplyRequest;
        if (
          request.checkpoint.binding.project_id !== projectId ||
          request.checkpoint.binding.review_session.review_session_id !==
            sessionId
        )
          throw new TypeError("Mismatched Apply route binding.");
        const authority = await resolveApplyAuthority(projectId);
        if (
          canonicalize(authority.authorization_basis) !==
            canonicalize(request.checkpoint.binding.authorization_basis) ||
          canonicalize(authority.capability_grants) !==
            canonicalize(request.checkpoint.binding.capability_grants)
        )
          throw new ReviewSessionApplyError(
            "REVIEW_APPLY_DENIED",
            "The checkpoint does not bind the authenticated human's exact current grants.",
          );
        await validateReviewApplyCheckpoint(request.checkpoint);
        const result = await options.reviewSessionApply.executeReviewApply(
          request,
          authority,
        );
        await validateReviewApplyResult(result, request);
        return context.json(result);
      } catch (error) {
        return applyError(context, error);
      }
    },
  );

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

  app.get("/api/queries/projects/:projectId/brief", async (context) => {
    if (options.projectBriefViews === undefined)
      return jsonError(
        context,
        503,
        "PROJECT_BRIEF_UNAVAILABLE",
        "The authorized Brief reader is not configured.",
      );
    try {
      const parameters = new URL(context.req.url).searchParams;
      const allowed = [
        "expected_snapshot_hash",
        "baseline_event_id",
        "baseline_record_hash",
      ];
      if (
        [...parameters.keys()].some(
          (key) =>
            !allowed.includes(key) || parameters.getAll(key).length !== 1,
        )
      )
        throw new ProjectBriefError(
          "PROJECT_BRIEF_REQUEST_INVALID",
          "Brief reads accept only one value per registered snapshot or baseline control.",
        );
      const request: ProjectBriefRequest = Object.fromEntries(parameters);
      const projectId = context.req.param("projectId");
      const view = await options.projectBriefViews.getProjectBriefView(
        projectId,
        request,
      );
      if (view === undefined)
        return jsonError(
          context,
          404,
          "PROJECT_NOT_FOUND",
          "The requested Project is unavailable.",
        );
      contracts.assertValid("project-brief-view", "1.0.0", view);
      if (view.project_id !== projectId)
        throw new ProjectBriefError(
          "PROJECT_BRIEF_CORRUPT",
          "The Brief crossed a Project boundary.",
        );
      context.header("Cache-Control", "no-store");
      return context.json(view);
    } catch (error) {
      return jsonError(
        context,
        error instanceof ProjectBriefError
          ? error.code === "PROJECT_BRIEF_STALE"
            ? 409
            : error.code === "PROJECT_BRIEF_CORRUPT"
              ? 503
              : 422
          : 503,
        error instanceof ProjectBriefError
          ? error.code
          : "PROJECT_BRIEF_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Brief read is unavailable.",
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
    "/api/queries/projects/:projectId/suggested-actions",
    async (context) => {
      if (options.suggestedActionViews === undefined) {
        return jsonError(
          context,
          503,
          "SUGGESTED_ACTIONS_UNAVAILABLE",
          "The authorized SuggestedAction preview boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        const unknown = [...parameters.keys()].filter(
          (key) => key !== "inquiry_result_link_id" && key !== "action_kind",
        );
        if (
          unknown.length > 0 ||
          parameters.getAll("inquiry_result_link_id").length !== 1 ||
          parameters.getAll("action_kind").length > 1
        ) {
          throw new InteractionInputError(
            "SuggestedAction preview requires exactly one inquiry_result_link_id and at most one registered action_kind.",
            [...new Set(unknown)],
          );
        }
        const projectInquiryLinkId = parameters.get("inquiry_result_link_id")!;
        if (!PROJECT_INQUIRY_LINK_ID_PATTERN.test(projectInquiryLinkId)) {
          throw new InteractionInputError(
            "SuggestedAction preview requires a canonical ProjectInquiryLink identity.",
          );
        }
        const actionKind =
          parameters.get("action_kind") ?? "inspect_existing_inquiry_result";
        if (
          actionKind !== "inspect_existing_inquiry_result" &&
          actionKind !== "run_grounded_synthesis"
        ) {
          throw new InteractionInputError(
            "action_kind must be inspect_existing_inquiry_result or run_grounded_synthesis.",
          );
        }
        const projectId = context.req.param("projectId");
        const view =
          actionKind === "run_grounded_synthesis"
            ? await options.suggestedActionViews.getWorkStartingSuggestedActionViewForInquiryResult(
                projectId,
                projectInquiryLinkId,
              )
            : await options.suggestedActionViews.getSuggestedActionViewForInquiryResult(
                projectId,
                projectInquiryLinkId,
              );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "SUGGESTED_ACTION_NOT_FOUND",
            "No SuggestedAction is derived from the exact inquiry-result link in this Project.",
          );
        }
        contracts.assertValid(
          "suggested-action-view",
          actionKind === "run_grounded_synthesis" ? "1.1.0" : "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.content.view_kind !== "preview" ||
          view.content.action.basis.inquiry_result_link_ref
            .project_inquiry_link_id !== projectInquiryLinkId
        ) {
          throw new Error(
            "The SuggestedAction reader returned a different Project or inquiry-result basis.",
          );
        }
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "SUGGESTED_ACTION_QUERY_INVALID"
            : "SUGGESTED_ACTION_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The SuggestedAction preview is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/suggested-actions/:suggestedActionId/invoke",
    async (context) => {
      if (
        options.suggestedActionViews === undefined ||
        options.suggestedActionInvocations === undefined ||
        options.commandPrincipalResolver === undefined
      ) {
        return jsonError(
          context,
          503,
          "SUGGESTED_ACTION_INVOCATION_UNAVAILABLE",
          "The authenticated SuggestedAction-to-Work command boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "SuggestedAction invocation does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const suggestedActionId = context.req.param("suggestedActionId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "SuggestedAction invocation requires a canonical Project identity.",
          );
        }
        if (!SUGGESTED_ACTION_ID_PATTERN.test(suggestedActionId)) {
          throw new InteractionInputError(
            "SuggestedAction invocation requires a canonical SuggestedAction identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        try {
          contracts.assertValid(
            "suggested-action-invocation-request",
            "1.0.0",
            body,
          );
        } catch (error) {
          if (
            error instanceof ContractRegistryError &&
            error.code === "CONTRACT_VALUE_INVALID"
          ) {
            throw new InteractionInputError(
              "SuggestedAction invocation does not match the registered request contract.",
              error.validationErrors.map(
                (validation) => validation.instancePath || validation.keyword,
              ),
            );
          }
          throw error;
        }
        const request = body as PetraSuggestedActionInvocationRequest;
        if (
          request.expected_action_ref.suggested_action_id !== suggestedActionId
        ) {
          throw new InteractionInputError(
            "expected_action_ref must name the SuggestedAction in the route.",
          );
        }
        const currentAction =
          await options.suggestedActionViews.getWorkStartingSuggestedActionViewForInquiryResult(
            projectId,
            request.inquiry_result_link_id,
          );
        if (currentAction === undefined) {
          return jsonError(
            context,
            404,
            "SUGGESTED_ACTION_NOT_FOUND",
            "No Work-starting SuggestedAction is derived from the exact inquiry-result link in this Project.",
          );
        }
        if (
          currentAction.content.action_ref.suggested_action_id !==
            suggestedActionId ||
          currentAction.content.action_ref.revision !==
            request.expected_action_ref.revision ||
          currentAction.content.action_ref.content_hash !==
            request.expected_action_ref.content_hash
        ) {
          return context.json(
            {
              error: {
                code: "SUGGESTED_ACTION_INVOCATION_STALE",
                message:
                  "The exact SuggestedAction revision or hash is stale; regenerate from current Project authority.",
              },
              regeneration: currentAction,
            },
            409,
          );
        }
        if (currentAction.content.readiness.state !== "ready") {
          return context.json(
            {
              error: {
                code:
                  currentAction.content.readiness.state === "stale"
                    ? "SUGGESTED_ACTION_INVOCATION_STALE"
                    : "SUGGESTED_ACTION_INVOCATION_UNAVAILABLE",
                message: currentAction.content.readiness.reason,
              },
              regeneration: currentAction,
            },
            currentAction.content.readiness.state === "stale" ? 409 : 403,
          );
        }
        const principal =
          await options.commandPrincipalResolver.resolveCommandPrincipal({
            projectId,
            commandName: "InvokeSuggestedAction",
          });
        if (principal.state === "denied") {
          return jsonError(
            context,
            principal.reason === "active_grant_not_found" ? 403 : 503,
            principal.reason === "active_grant_not_found"
              ? "SUGGESTED_ACTION_INVOCATION_FORBIDDEN"
              : principal.reason === "actor_not_registered"
                ? "AUTHENTICATED_ACTOR_UNAVAILABLE"
                : "PROJECT_COMMAND_AUTHORITY_AMBIGUOUS",
            principal.reason === "active_grant_not_found"
              ? "The authenticated principal has no active InvokeSuggestedAction grant for this Project."
              : principal.reason === "actor_not_registered"
                ? "The configured authenticated Actor is not registered."
                : "More than one active grant matches InvokeSuggestedAction for this Project.",
          );
        }
        if (
          principal.capabilityGrantId !==
          currentAction.content.readiness.grant_ref.capability_grant_id
        ) {
          throw new Error(
            "SuggestedAction readiness and authenticated command authority selected different grants.",
          );
        }
        const view = await options.suggestedActionInvocations.invoke({
          projectId,
          request,
          action: currentAction,
          actor: principal.actor,
          capabilityGrantId: principal.capabilityGrantId,
          correlationId: derivePetraId(
            "trace",
            `${context.get("requestId")}:${randomUUID()}`,
          ),
        });
        contracts.assertValid(
          "suggested-action-invocation-view",
          "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.content.invocation.content.command_ref.command_id !==
            request.command_id ||
          view.content.invocation.content.action_ref.suggested_action_id !==
            suggestedActionId
        ) {
          throw new Error(
            "SuggestedAction authority returned a different Project, command, or action.",
          );
        }
        return context.json(
          view,
          view.content.operation_state === "accepted" ? 202 : 200,
        );
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "SUGGESTED_ACTION_INVOCATION_INVALID",
            error.message,
            error.issues,
          );
        }
        const code =
          error instanceof Error &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : undefined;
        if (code?.startsWith("SUGGESTED_ACTION_INVOCATION_") === true) {
          const status =
            code === "SUGGESTED_ACTION_INVOCATION_NOT_AUTHORIZED"
              ? 403
              : code === "SUGGESTED_ACTION_INVOCATION_STORED_RECORD_CORRUPT"
                ? 503
                : 409;
          return jsonError(
            context,
            status,
            code,
            error instanceof Error
              ? error.message
              : "SuggestedAction invocation failed.",
          );
        }
        return jsonError(
          context,
          503,
          "SUGGESTED_ACTION_INVOCATION_FAILED",
          error instanceof Error
            ? error.message
            : "SuggestedAction invocation failed.",
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/suggested-action-invocations/:commandId",
    async (context) => {
      if (options.suggestedActionInvocationViews === undefined) {
        return jsonError(
          context,
          503,
          "SUGGESTED_ACTION_INVOCATION_VIEW_UNAVAILABLE",
          "The SuggestedAction invocation read boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "SuggestedAction invocation detail does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const commandId = context.req.param("commandId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !COMMAND_ID_PATTERN.test(commandId)
        ) {
          throw new InteractionInputError(
            "SuggestedAction invocation detail requires canonical Project and command identities.",
          );
        }
        const view =
          await options.suggestedActionInvocationViews.getSuggestedActionInvocationView(
            projectId,
            commandId,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "SUGGESTED_ACTION_INVOCATION_NOT_FOUND",
            "The command has no SuggestedAction invocation receipt in this Project.",
          );
        }
        contracts.assertValid(
          "suggested-action-invocation-view",
          "1.0.0",
          view,
        );
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "SUGGESTED_ACTION_INVOCATION_QUERY_INVALID"
            : "SUGGESTED_ACTION_INVOCATION_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The SuggestedAction invocation view is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

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
          throw new ProjectHistoryRetainedContinuationError(
            "CURSOR_INVALID",
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
        const filters: ProjectHistoryRetainedCollectionFiltersV12 = {
          ...(family === undefined
            ? {}
            : {
                family: family as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV12["family"]
                >,
              }),
          ...(commandName === undefined
            ? {}
            : {
                command_name: commandName as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV12["command_name"]
                >,
              }),
          ...(eventType === undefined
            ? {}
            : {
                event_type: eventType as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV12["event_type"]
                >,
              }),
          ...(actorId === undefined ? {} : { actor_id: actorId }),
          ...(outcome === undefined
            ? {}
            : {
                outcome: outcome as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV12["outcome"]
                >,
              }),
          ...(effect === undefined
            ? {}
            : {
                effect: effect as NonNullable<
                  ProjectHistoryRetainedCollectionFiltersV12["effect"]
                >,
              }),
          ...(targetSemanticKey === undefined || targetObjectId === undefined
            ? {}
            : {
                target: {
                  semantic_key: targetSemanticKey as NonNullable<
                    ProjectHistoryRetainedCollectionFiltersV12["target"]
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
        contracts.assertValid("project-history-retained-view", "1.2.0", view);
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
        if (error instanceof ProjectHistoryRetainedContinuationError) {
          return retainedHistoryContinuationFailure(context, error);
        }
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
        contracts.assertValid("project-history-episode-view", "1.2.0", view);
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
        contracts.assertValid(
          "project-review-view",
          review.schema_version,
          review,
        );
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

  app.get("/api/queries/projects/:projectId/working-state", async (context) => {
    if (options.projectWorkingStateSnapshots === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_WORKING_STATE_UNAVAILABLE",
        "The authenticated Project working-state read boundary is not configured.",
      );
    }
    try {
      const snapshot =
        await options.projectWorkingStateSnapshots.getProjectWorkingStateSnapshot(
          context.req.param("projectId"),
        );
      if (snapshot === undefined) {
        return jsonError(
          context,
          404,
          "PROJECT_WORKING_STATE_NOT_FOUND",
          "The requested Project working-state boundary was not found.",
        );
      }
      contracts.assertValid(
        "project-working-state-snapshot",
        "1.0.0",
        snapshot,
      );
      return context.json(snapshot);
    } catch (error) {
      return jsonError(
        context,
        503,
        "PROJECT_WORKING_STATE_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project working-state snapshot is unavailable.",
      );
    }
  });

  app.get(
    "/api/queries/projects/:projectId/reviews/:reviewSessionId/recovery-assessment",
    async (context) => {
      if (options.reviewRecoveryAssessments === undefined) {
        return jsonError(
          context,
          503,
          "REVIEW_RECOVERY_UNAVAILABLE",
          "The read-only Review recovery assessment is not configured.",
        );
      }
      const parameters = new URL(context.req.url).searchParams;
      const revision = parameters.get("expected_revision");
      const contentHash = parameters.get("expected_content_hash");
      const projectId = context.req.param("projectId");
      const reviewSessionId = context.req.param("reviewSessionId");
      if (
        !PROJECT_ID_PATTERN.test(projectId) ||
        !/^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u.test(reviewSessionId) ||
        revision === null ||
        !/^[1-9][0-9]*$/u.test(revision) ||
        !Number.isSafeInteger(Number(revision)) ||
        contentHash === null ||
        !/^sha256:[0-9a-f]{64}$/u.test(contentHash) ||
        [...parameters.keys()].length !== 2 ||
        parameters.getAll("expected_revision").length !== 1 ||
        parameters.getAll("expected_content_hash").length !== 1
      ) {
        return jsonError(
          context,
          400,
          "REVIEW_RECOVERY_INPUT_INVALID",
          "Supply only the exact expected Review revision and content hash; member subsets and recovery instructions are not accepted.",
        );
      }
      try {
        const assessment =
          await options.reviewRecoveryAssessments.getReviewRecoveryAssessment({
            project_id: projectId,
            review_session_id: reviewSessionId,
            expected_revision: Number(revision),
            expected_content_hash: contentHash,
          });
        if (assessment === undefined)
          return jsonError(
            context,
            404,
            "REVIEW_RECOVERY_NOT_FOUND",
            "The exact Review is not available in this Project.",
          );
        contracts.assertValid(
          "review-recovery-assessment",
          "1.0.0",
          assessment,
        );
        await validateReviewRecoveryAssessment(
          assessment,
          {
            project_id: projectId,
            review_session_id: reviewSessionId,
            expected_revision: Number(revision),
            expected_content_hash: contentHash,
          },
          contracts,
        );
        context.header("cache-control", "no-store");
        return context.json(assessment);
      } catch (error) {
        if (error instanceof ReviewRecoveryAssessmentError) {
          return jsonError(
            context,
            error.code === "REVIEW_RECOVERY_STALE"
              ? 409
              : error.code === "REVIEW_RECOVERY_UNSUPPORTED"
                ? 422
                : 503,
            error.code,
            error.message,
          );
        }
        return jsonError(
          context,
          503,
          "REVIEW_RECOVERY_READ_FAILED",
          "Canonical Review recovery evidence could not be reconciled.",
        );
      }
    },
  );

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
        contracts.assertValid(
          "project-review-view",
          review.schema_version,
          review,
        );
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

  app.post(
    "/api/commands/projects/:projectId/reviews/:reviewSessionId/lifecycle",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.reviewSessionLifecycleAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "REVIEW_SESSION_LIFECYCLE_COMMAND_UNAVAILABLE",
          "The authenticated ReviewSession lifecycle command boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "ReviewSession lifecycle commands do not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const reviewSessionId = context.req.param("reviewSessionId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "ReviewSession lifecycle commands require a canonical Project identity.",
          );
        }
        if (!REVIEW_SESSION_ID_PATTERN.test(reviewSessionId)) {
          throw new InteractionInputError(
            "ReviewSession lifecycle commands require a canonical ReviewSession identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The ReviewSession lifecycle command must be an object.",
          );
        }
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "requested_action",
            "expected_review_session_ref",
            "rationale",
          ]),
          "ReviewSession lifecycle command",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
        const requestedAction = optionalEnum(
          body,
          "requested_action",
          REVIEW_SESSION_LIFECYCLE_ACTIONS,
        );
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
        const rationale =
          body.rationale === undefined
            ? undefined
            : requiredString(body, "rationale");
        if (rationale !== undefined && rationale.length > 4_000) {
          throw new InteractionInputError(
            "rationale must contain at most 4000 characters.",
          );
        }
        const command =
          requestedAction === "defer"
            ? {
                command_name: "DeferReviewSession" as const,
                expected_review_session_ref: reviewSessionLifecycleExpectedRef(
                  body.expected_review_session_ref,
                  reviewSessionId,
                  "open",
                ),
                ...(rationale === undefined ? {} : { rationale }),
              }
            : {
                command_name: "ReopenReviewSession" as const,
                expected_review_session_ref: reviewSessionLifecycleExpectedRef(
                  body.expected_review_session_ref,
                  reviewSessionId,
                  "deferred",
                ),
                ...(rationale === undefined ? {} : { rationale }),
              };
        const commandName = command.command_name;
        const expectedReviewSessionRef = command.expected_review_session_ref;
        const expectedLifecycle = expectedReviewSessionRef.lifecycle;
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
              "REVIEW_SESSION_LIFECYCLE_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for this ReviewSession command.",
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
        const envelope: ReviewSessionLifecycleCommandEnvelope = {
          schema_name: "petra.command-envelope",
          schema_version: "1.4.0",
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
        contracts.assertValid("command-envelope", "1.4.0", envelope);
        const result =
          await options.reviewSessionLifecycleAuthority.executeReviewSessionLifecycleCommand(
            envelope,
          );
        contracts.assertValid(
          "review-session-lifecycle-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid(
          "review-session",
          result.reviewSession.schema_version,
          result.reviewSession,
        );
        const receipt = result.receipt.content;
        const resultingRef = receipt.resulting_review_session_ref;
        if (
          result.receipt.project_id !== projectId ||
          receipt.command_ref.command_id !== commandId ||
          receipt.command_ref.idempotency_key !== idempotencyKey ||
          receipt.command_ref.command_name !== commandName ||
          receipt.command_ref.actor.actor_id !== principal.actor.actor_id ||
          receipt.command_ref.actor.actor_kind !== principal.actor.actor_kind ||
          receipt.command_ref.capability_grant_id !==
            principal.capabilityGrantId ||
          receipt.prior_review_session_ref.review_session_id !==
            reviewSessionId ||
          receipt.prior_review_session_ref.revision !==
            expectedReviewSessionRef.revision ||
          receipt.prior_review_session_ref.content_hash !==
            expectedReviewSessionRef.content_hash ||
          receipt.prior_review_session_ref.lifecycle !== expectedLifecycle ||
          receipt.transition !==
            (requestedAction === "defer" ? "deferred" : "reopened") ||
          receipt.rationale !== rationale ||
          result.reviewSession.project_id !== projectId ||
          result.reviewSession.review_session_id !== reviewSessionId ||
          result.reviewSession.revision !== resultingRef.revision ||
          result.reviewSession.content_hash !== resultingRef.content_hash ||
          result.reviewSession.content.lifecycle !== resultingRef.lifecycle ||
          resultingRef.lifecycle !==
            (requestedAction === "defer" ? "deferred" : "open") ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The ReviewSession lifecycle authority returned a different command, Project, session, or transition.",
          );
        }
        return context.json({
          receipt: result.receipt,
          review_session: result.reviewSession,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "REVIEW_SESSION_LIFECYCLE_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ReviewSessionLifecycleAuthorityError) {
          const status =
            error.code === "REVIEW_SESSION_LIFECYCLE_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code === "REVIEW_SESSION_LIFECYCLE_SESSION_NOT_FOUND"
                ? 404
                : error.code ===
                    "REVIEW_SESSION_LIFECYCLE_STORED_RECORD_CORRUPT"
                  ? 503
                  : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "REVIEW_SESSION_LIFECYCLE_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The ReviewSession lifecycle command failed.",
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/reviews/:reviewSessionId/refresh",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.reviewSessionRefreshAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "REVIEW_SESSION_REFRESH_COMMAND_UNAVAILABLE",
          "The authenticated ReviewSession refresh boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "ReviewSession refresh does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const reviewSessionId = context.req.param("reviewSessionId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "ReviewSession refresh requires a canonical Project identity.",
          );
        }
        if (!REVIEW_SESSION_ID_PATTERN.test(reviewSessionId)) {
          throw new InteractionInputError(
            "ReviewSession refresh requires a canonical ReviewSession identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The ReviewSession refresh command must be an object.",
          );
        }
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "expected_review_session_ref",
          ]),
          "ReviewSession refresh command",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
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
        const expectedReviewSessionRef = reviewSessionLifecycleExpectedRef(
          body.expected_review_session_ref,
          reviewSessionId,
          "open",
        );
        const commandName = "RefreshReviewSession" as const;
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
              "REVIEW_SESSION_REFRESH_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for ReviewSession refresh.",
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
              : "More than one active grant matches authenticated ReviewSession refresh.",
          );
        }
        const envelope: ReviewSessionRefreshCommandEnvelope = {
          schema_name: "petra.command-envelope",
          schema_version: "1.5.0",
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
            expected_review_session_ref: expectedReviewSessionRef,
          },
        };
        contracts.assertValid("command-envelope", "1.5.0", envelope);
        const result =
          await options.reviewSessionRefreshAuthority.executeReviewSessionRefreshCommand(
            envelope,
          );
        contracts.assertValid(
          "review-session-refresh-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid(
          "review-session",
          result.reviewSession.schema_version,
          result.reviewSession,
        );
        const receipt = result.receipt.content;
        const resultingRef = receipt.resulting_review_session_ref;
        const receiptMembers = receipt.refresh_basis.members;
        if (
          result.receipt.project_id !== projectId ||
          receipt.command_ref.command_id !== commandId ||
          receipt.command_ref.idempotency_key !== idempotencyKey ||
          receipt.command_ref.command_name !== commandName ||
          receipt.command_ref.actor.actor_id !== principal.actor.actor_id ||
          receipt.command_ref.actor.actor_kind !== principal.actor.actor_kind ||
          receipt.command_ref.capability_grant_id !==
            principal.capabilityGrantId ||
          receipt.prior_review_session_ref.review_session_id !==
            reviewSessionId ||
          receipt.prior_review_session_ref.revision !==
            expectedReviewSessionRef.revision ||
          receipt.prior_review_session_ref.content_hash !==
            expectedReviewSessionRef.content_hash ||
          receipt.prior_review_session_ref.lifecycle !== "open" ||
          receipt.transition !== "refreshed" ||
          result.reviewSession.schema_version !== "1.1.0" ||
          result.reviewSession.project_id !== projectId ||
          result.reviewSession.review_session_id !== reviewSessionId ||
          result.reviewSession.revision !== resultingRef.revision ||
          result.reviewSession.content_hash !== resultingRef.content_hash ||
          result.reviewSession.content.lifecycle !== "open" ||
          receipt.refresh_basis.resulting_snapshot.event_position !==
            result.reviewSession.content.snapshot.event_position ||
          receipt.refresh_basis.resulting_snapshot.stream_revision !==
            result.reviewSession.content.snapshot.stream_revision ||
          receipt.refresh_basis.resulting_snapshot.captured_at !==
            result.reviewSession.content.snapshot.captured_at ||
          receiptMembers.length !==
            result.reviewSession.content.members.length ||
          receiptMembers.some((member, index) => {
            const resultMember = result.reviewSession.content.members[index];
            return (
              resultMember === undefined ||
              !("working_state" in resultMember) ||
              member.review_member_id !== resultMember.review_member_id ||
              canonicalize(member.candidate_ref) !==
                canonicalize(resultMember.working_state.candidate_ref) ||
              canonicalize(member.relationship_refs) !==
                canonicalize(resultMember.working_state.relationship_refs)
            );
          }) ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The ReviewSession refresh authority returned a different command, Project, session, snapshot, or membership.",
          );
        }
        return context.json({
          receipt: result.receipt,
          review_session: result.reviewSession,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "REVIEW_SESSION_REFRESH_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ReviewSessionRefreshAuthorityError) {
          const status =
            error.code === "REVIEW_SESSION_REFRESH_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code === "REVIEW_SESSION_REFRESH_SESSION_NOT_FOUND"
                ? 404
                : error.code === "REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED"
                  ? 422
                  : error.code ===
                      "REVIEW_SESSION_REFRESH_STORED_RECORD_CORRUPT"
                    ? 503
                    : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "REVIEW_SESSION_REFRESH_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The ReviewSession refresh command failed.",
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/reviews/:reviewSessionId/candidate-correction",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.reviewCandidateCorrectionAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "REVIEW_CANDIDATE_CORRECTION_COMMAND_UNAVAILABLE",
          "The authenticated Review candidate-correction boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Review candidate correction does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const reviewSessionId = context.req.param("reviewSessionId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "Review candidate correction requires a canonical Project identity.",
          );
        }
        if (!REVIEW_SESSION_ID_PATTERN.test(reviewSessionId)) {
          throw new InteractionInputError(
            "Review candidate correction requires a canonical ReviewSession identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The Review candidate-correction command must be an object.",
          );
        }
        const fromHumanEdit = "correction_input" in body;
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "expected_review_session_ref",
            "review_member_id",
            "expected_working_candidate_ref",
            "expected_working_relationship_ref",
            ...(fromHumanEdit
              ? ["correction_input"]
              : ["corrected_candidate", "corrected_profile_record"]),
          ]),
          "Review candidate-correction command",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
        const reviewMemberId = requiredString(body, "review_member_id");
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
        if (!REVIEW_MEMBER_ID_PATTERN.test(reviewMemberId)) {
          throw new InteractionInputError(
            "review_member_id must be a canonical Review member identity.",
          );
        }
        const expectedReviewSessionRef = reviewSessionLifecycleExpectedRef(
          body.expected_review_session_ref,
          reviewSessionId,
          "open",
        );
        const expectedWorkingCandidateRef = reviewWorkingExpectedRef(
          body.expected_working_candidate_ref,
          "candidate",
        );
        const expectedWorkingRelationshipRef = reviewWorkingExpectedRef(
          body.expected_working_relationship_ref,
          "relationship",
        );
        let canonicalText: string | undefined;
        if (fromHumanEdit) {
          if (!isRecord(body.correction_input)) {
            throw new InteractionInputError(
              "correction_input must be the registered human scientific Claim text edit.",
              ["correction_input"],
            );
          }
          assertExactKeys(
            body.correction_input,
            new Set(["input_kind", "canonical_text"]),
            "Review candidate-correction input",
          );
          if (
            requiredString(body.correction_input, "input_kind") !==
            "human_scientific_claim_text_edit"
          ) {
            throw new InteractionInputError(
              "correction_input.input_kind is not supported.",
              ["correction_input.input_kind"],
            );
          }
          canonicalText = requiredString(
            body.correction_input,
            "canonical_text",
          );
          if (
            canonicalText.trim().length === 0 ||
            canonicalText.length > 20000
          ) {
            throw new InteractionInputError(
              "correction_input.canonical_text must contain between 1 and 20000 characters of Claim text.",
              ["correction_input.canonical_text"],
            );
          }
        } else {
          try {
            contracts.assertValid(
              "working-candidate",
              "1.0.0",
              body.corrected_candidate,
            );
            contracts.assertValid(
              "claim",
              "1.0.0",
              body.corrected_profile_record,
            );
          } catch (error) {
            if (error instanceof ContractRegistryError) {
              throw new InteractionInputError(
                "The corrected candidate or scientific Claim does not satisfy its registered contract.",
                error.validationErrors.map((issue) => issue.instancePath),
              );
            }
            throw error;
          }
        }
        const commandName = "CorrectReviewCandidate" as const;
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
              "REVIEW_CANDIDATE_CORRECTION_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for Review candidate correction.",
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
              : "More than one active grant matches authenticated Review candidate correction.",
          );
        }
        const envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope =
          fromHumanEdit
            ? {
                schema_name: "petra.command-envelope",
                schema_version: "1.7.0",
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
                  expected_review_session_ref: expectedReviewSessionRef,
                  review_member_id: reviewMemberId,
                  expected_working_candidate_ref: expectedWorkingCandidateRef,
                  expected_working_relationship_ref:
                    expectedWorkingRelationshipRef,
                  correction_input: {
                    input_kind: "human_scientific_claim_text_edit",
                    canonical_text: canonicalText as string,
                  },
                },
              }
            : {
                schema_name: "petra.command-envelope",
                schema_version: "1.6.0",
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
                  expected_review_session_ref: expectedReviewSessionRef,
                  review_member_id: reviewMemberId,
                  expected_working_candidate_ref: expectedWorkingCandidateRef,
                  expected_working_relationship_ref:
                    expectedWorkingRelationshipRef,
                  corrected_candidate: structuredClone(
                    body.corrected_candidate as PetraWorkingCandidate,
                  ),
                  corrected_profile_record: structuredClone(
                    body.corrected_profile_record as PetraClaim,
                  ),
                },
              };
        contracts.assertValid(
          "command-envelope",
          envelope.schema_version,
          envelope,
        );
        const result =
          await options.reviewCandidateCorrectionAuthority.executeReviewCandidateCorrectionCommand(
            envelope,
          );
        contracts.assertValid(
          "review-candidate-correction-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("working-candidate", "1.0.0", result.candidate);
        contracts.assertValid("claim", "1.0.0", result.profileRecord);
        contracts.assertValid(
          "working-relationship",
          "1.0.0",
          result.relationship,
        );
        contracts.assertValid(
          "review-session",
          result.reviewSession.schema_version,
          result.reviewSession,
        );
        const receipt = result.receipt.content;
        const resultingSessionRef = receipt.resulting_review_session_ref;
        const resultingCandidateRef = receipt.resulting_candidate_ref;
        const resultingRelationshipRef = receipt.resulting_relationship_ref;
        const resultingMember = result.reviewSession.content.members[0];
        if (
          result.receipt.project_id !== projectId ||
          receipt.command_ref.command_id !== commandId ||
          receipt.command_ref.idempotency_key !== idempotencyKey ||
          receipt.command_ref.command_name !== commandName ||
          receipt.command_ref.actor.actor_id !== principal.actor.actor_id ||
          receipt.command_ref.actor.actor_kind !== principal.actor.actor_kind ||
          receipt.command_ref.capability_grant_id !==
            principal.capabilityGrantId ||
          receipt.review_member_id !== reviewMemberId ||
          canonicalize(receipt.prior_review_session_ref) !==
            canonicalize({
              ...expectedReviewSessionRef,
              record_hash: receipt.prior_review_session_ref.record_hash,
            }) ||
          receipt.prior_candidate_ref.record_id !==
            expectedWorkingCandidateRef.working_candidate_id ||
          receipt.prior_candidate_ref.revision !==
            expectedWorkingCandidateRef.revision ||
          receipt.prior_candidate_ref.content_hash !==
            expectedWorkingCandidateRef.content_hash ||
          receipt.prior_relationship_ref.record_id !==
            expectedWorkingRelationshipRef.working_relationship_id ||
          receipt.prior_relationship_ref.revision !==
            expectedWorkingRelationshipRef.revision ||
          receipt.prior_relationship_ref.content_hash !==
            expectedWorkingRelationshipRef.content_hash ||
          result.candidate.working_candidate_id !==
            resultingCandidateRef.record_id ||
          result.candidate.revision !== resultingCandidateRef.revision ||
          result.candidate.content_hash !==
            resultingCandidateRef.content_hash ||
          ("corrected_candidate" in envelope.command &&
            canonicalize(result.candidate) !==
              canonicalize(envelope.command.corrected_candidate)) ||
          ("corrected_profile_record" in envelope.command &&
            canonicalize(result.profileRecord) !==
              canonicalize(envelope.command.corrected_profile_record)) ||
          ("correction_input" in envelope.command &&
            result.profileRecord.canonical_text !==
              envelope.command.correction_input.canonical_text) ||
          result.relationship.working_relationship_id !==
            resultingRelationshipRef.record_id ||
          result.relationship.revision !== resultingRelationshipRef.revision ||
          result.relationship.content_hash !==
            resultingRelationshipRef.content_hash ||
          result.reviewSession.schema_version !== "1.1.0" ||
          result.reviewSession.review_session_id !== reviewSessionId ||
          result.reviewSession.revision !== resultingSessionRef.revision ||
          result.reviewSession.content_hash !==
            resultingSessionRef.content_hash ||
          result.reviewSession.content.lifecycle !== "open" ||
          result.reviewSession.content.members.length !== 1 ||
          resultingMember === undefined ||
          !("working_state" in resultingMember) ||
          resultingMember.review_member_id !== reviewMemberId ||
          resultingMember.working_state.candidate_ref.working_candidate_id !==
            result.candidate.working_candidate_id ||
          resultingMember.working_state.candidate_ref.revision !==
            result.candidate.revision ||
          resultingMember.working_state.candidate_ref.content_hash !==
            result.candidate.content_hash ||
          resultingMember.working_state.relationship_refs[0]
            ?.working_relationship_id !==
            result.relationship.working_relationship_id ||
          resultingMember.working_state.relationship_refs[0]?.revision !==
            result.relationship.revision ||
          resultingMember.working_state.relationship_refs[0]?.content_hash !==
            result.relationship.content_hash ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The Review candidate-correction authority returned a different command, Project, member, candidate, relationship, or ReviewSession.",
          );
        }
        return context.json({
          receipt: result.receipt,
          candidate: result.candidate,
          profile_record: result.profileRecord,
          relationship: result.relationship,
          review_session: result.reviewSession,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "REVIEW_CANDIDATE_CORRECTION_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ReviewCandidateCorrectionAuthorityError) {
          const status =
            error.code === "REVIEW_CANDIDATE_CORRECTION_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code === "REVIEW_CANDIDATE_CORRECTION_SESSION_NOT_FOUND"
                ? 404
                : error.code ===
                    "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED"
                  ? 422
                  : error.code ===
                      "REVIEW_CANDIDATE_CORRECTION_STORED_RECORD_CORRUPT"
                    ? 503
                    : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "REVIEW_CANDIDATE_CORRECTION_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The Review candidate-correction command failed.",
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/reviews/:reviewSessionId/candidate-basis-revision",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.reviewCandidateBasisRevisionAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_UNAVAILABLE",
          "The authenticated Review candidate basis-revision boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Review candidate basis revision does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const reviewSessionId = context.req.param("reviewSessionId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "Review candidate basis revision requires a canonical Project identity.",
          );
        }
        if (!REVIEW_SESSION_ID_PATTERN.test(reviewSessionId)) {
          throw new InteractionInputError(
            "Review candidate basis revision requires a canonical ReviewSession identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The Review candidate basis-revision command must be an object.",
          );
        }
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "expected_review_session_ref",
            "review_member_id",
            "expected_project_definition_ref",
            "expected_working_candidate_ref",
            "expected_working_relationship_ref",
            "expected_claim_ref",
            "basis_revision_input",
          ]),
          "Review candidate basis-revision command",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
        const reviewMemberId = requiredString(body, "review_member_id");
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
        if (!REVIEW_MEMBER_ID_PATTERN.test(reviewMemberId)) {
          throw new InteractionInputError(
            "review_member_id must be a canonical Review member identity.",
          );
        }
        const expectedReviewSessionRef = reviewSessionLifecycleExpectedRef(
          body.expected_review_session_ref,
          reviewSessionId,
          "open",
        );
        const expectedWorkingCandidateRef = reviewWorkingExpectedRef(
          body.expected_working_candidate_ref,
          "candidate",
        );
        const expectedWorkingRelationshipRef = reviewWorkingExpectedRef(
          body.expected_working_relationship_ref,
          "relationship",
        );
        const commandName = "ReviseReviewCandidateBasis" as const;
        try {
          contracts.assertValid("command-envelope", "1.8.0", {
            schema_name: "petra.command-envelope",
            schema_version: "1.8.0",
            command_id: commandId,
            idempotency_key: idempotencyKey,
            project_id: projectId,
            actor: {
              actor_id: "actor_00000000000000000000000000",
              actor_kind: "human",
            },
            capability_grant_id: "capability_grant_00000000000000000000000000",
            correlation_id: "trace_00000000000000000000000000",
            submitted_at: new Date().toISOString(),
            command: {
              command_name: commandName,
              expected_review_session_ref: expectedReviewSessionRef,
              review_member_id: reviewMemberId,
              expected_project_definition_ref:
                body.expected_project_definition_ref,
              expected_working_candidate_ref: expectedWorkingCandidateRef,
              expected_working_relationship_ref: expectedWorkingRelationshipRef,
              expected_claim_ref: body.expected_claim_ref,
              basis_revision_input: body.basis_revision_input,
            },
          });
        } catch (error) {
          if (error instanceof ContractRegistryError) {
            throw new InteractionInputError(
              "The Review candidate basis revision does not satisfy its registered exact-reference and source-basis contract.",
              error.validationErrors.map((issue) => issue.instancePath),
            );
          }
          throw error;
        }
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
              "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for Review candidate basis revision.",
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
              : "More than one active grant matches authenticated Review candidate basis revision.",
          );
        }
        const envelope = {
          schema_name: "petra.command-envelope",
          schema_version: "1.8.0",
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
            expected_review_session_ref: expectedReviewSessionRef,
            review_member_id: reviewMemberId,
            expected_project_definition_ref: structuredClone(
              body.expected_project_definition_ref,
            ),
            expected_working_candidate_ref: expectedWorkingCandidateRef,
            expected_working_relationship_ref: expectedWorkingRelationshipRef,
            expected_claim_ref: structuredClone(body.expected_claim_ref),
            basis_revision_input: structuredClone(body.basis_revision_input),
          },
        } as ReviewCandidateBasisRevisionCommandEnvelope;
        try {
          contracts.assertValid("command-envelope", "1.8.0", envelope);
        } catch (error) {
          if (error instanceof ContractRegistryError) {
            throw new InteractionInputError(
              "The Review candidate basis revision does not satisfy its registered exact-reference and source-basis contract.",
              error.validationErrors.map((issue) => issue.instancePath),
            );
          }
          throw error;
        }
        const result =
          await options.reviewCandidateBasisRevisionAuthority.executeReviewCandidateBasisRevisionCommand(
            envelope,
          );
        contracts.assertValid(
          "review-candidate-basis-revision-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("working-candidate", "1.0.0", result.candidate);
        contracts.assertValid("claim", "1.0.0", result.profileRecord);
        contracts.assertValid(
          "working-relationship",
          "1.0.0",
          result.relationship,
        );
        contracts.assertValid(
          "review-session",
          result.reviewSession.schema_version,
          result.reviewSession,
        );
        const receipt = result.receipt.content;
        const resultingSessionRef = receipt.resulting_review_session_ref;
        const resultingCandidateRef = receipt.resulting_candidate_ref;
        const resultingRelationshipRef = receipt.resulting_relationship_ref;
        const resultingProfileRef = receipt.resulting_profile_record_ref;
        const resultingMember = result.reviewSession.content.members[0];
        const input = envelope.command.basis_revision_input;
        if (
          result.receipt.project_id !== projectId ||
          receipt.command_ref.command_id !== commandId ||
          receipt.command_ref.idempotency_key !== idempotencyKey ||
          receipt.command_ref.command_name !== commandName ||
          receipt.command_ref.actor.actor_id !== principal.actor.actor_id ||
          receipt.command_ref.actor.actor_kind !== principal.actor.actor_kind ||
          receipt.command_ref.capability_grant_id !==
            principal.capabilityGrantId ||
          receipt.review_member_id !== reviewMemberId ||
          canonicalize(receipt.project_definition_ref) !==
            canonicalize(envelope.command.expected_project_definition_ref) ||
          receipt.prior_review_session_ref.review_session_id !==
            expectedReviewSessionRef.review_session_id ||
          receipt.prior_review_session_ref.revision !==
            expectedReviewSessionRef.revision ||
          receipt.prior_review_session_ref.content_hash !==
            expectedReviewSessionRef.content_hash ||
          receipt.prior_candidate_ref.record_id !==
            expectedWorkingCandidateRef.working_candidate_id ||
          receipt.prior_candidate_ref.revision !==
            expectedWorkingCandidateRef.revision ||
          receipt.prior_candidate_ref.content_hash !==
            expectedWorkingCandidateRef.content_hash ||
          receipt.prior_relationship_ref.record_id !==
            expectedWorkingRelationshipRef.working_relationship_id ||
          receipt.prior_relationship_ref.revision !==
            expectedWorkingRelationshipRef.revision ||
          receipt.prior_relationship_ref.content_hash !==
            expectedWorkingRelationshipRef.content_hash ||
          canonicalize(receipt.prior_profile_record_ref) !==
            canonicalize(envelope.command.expected_claim_ref) ||
          canonicalize(receipt.resulting_basis.project_source_ref) !==
            canonicalize(input.project_source_ref) ||
          canonicalize(receipt.resulting_basis.source_span_refs) !==
            canonicalize(input.source_span_refs) ||
          receipt.validation_reset.state !== "pending" ||
          receipt.validation_reset.completed_validator_refs.length !== 0 ||
          result.profileRecord.basis.basis_kind !== "source" ||
          canonicalize(result.profileRecord.basis.source_span_ids) !==
            canonicalize(input.source_span_refs.map((ref) => ref.record_id)) ||
          result.profileRecord.basis.source_scope !== input.source_scope ||
          result.profileRecord.basis.detail_level !== input.detail_level ||
          result.profileRecord.basis.source_stance !== input.source_stance ||
          result.profileRecord.basis.attribution !== input.attribution ||
          result.profileRecord.basis.modality !== input.modality ||
          result.profileRecord.basis.negated !== input.negated ||
          result.candidate.working_candidate_id !==
            resultingCandidateRef.record_id ||
          result.candidate.revision !== resultingCandidateRef.revision ||
          result.candidate.content_hash !==
            resultingCandidateRef.content_hash ||
          result.profileRecord.claim_id !== resultingProfileRef.record_id ||
          result.profileRecord.revision !== resultingProfileRef.revision ||
          result.candidate.profile_object.object_record_ref.record_hash !==
            resultingProfileRef.record_hash ||
          result.relationship.working_relationship_id !==
            resultingRelationshipRef.record_id ||
          result.relationship.revision !== resultingRelationshipRef.revision ||
          result.relationship.content_hash !==
            resultingRelationshipRef.content_hash ||
          result.reviewSession.schema_version !== "1.1.0" ||
          result.reviewSession.review_session_id !== reviewSessionId ||
          result.reviewSession.revision !== resultingSessionRef.revision ||
          result.reviewSession.content_hash !==
            resultingSessionRef.content_hash ||
          result.reviewSession.content.lifecycle !== "open" ||
          result.reviewSession.content.members.length !== 1 ||
          resultingMember === undefined ||
          !("working_state" in resultingMember) ||
          resultingMember.review_member_id !== reviewMemberId ||
          resultingMember.working_state.candidate_ref.working_candidate_id !==
            result.candidate.working_candidate_id ||
          resultingMember.working_state.candidate_ref.revision !==
            result.candidate.revision ||
          resultingMember.working_state.relationship_refs[0]
            ?.working_relationship_id !==
            result.relationship.working_relationship_id ||
          resultingMember.working_state.relationship_refs[0]?.revision !==
            result.relationship.revision ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The Review candidate basis-revision authority returned a different command, ProjectDefinition, source basis, Claim, working state, member, or ReviewSession.",
          );
        }
        return context.json({
          receipt: result.receipt,
          candidate: result.candidate,
          profile_record: result.profileRecord,
          relationship: result.relationship,
          review_session: result.reviewSession,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ReviewCandidateBasisRevisionAuthorityError) {
          const status =
            error.code ===
            "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code ===
                  "REVIEW_CANDIDATE_BASIS_REVISION_SESSION_NOT_FOUND"
                ? 404
                : error.code ===
                      "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED" ||
                    error.code ===
                      "REVIEW_CANDIDATE_BASIS_REVISION_NO_MATERIAL_CHANGE"
                  ? 422
                  : error.code ===
                      "REVIEW_CANDIDATE_BASIS_REVISION_STORED_RECORD_CORRUPT"
                    ? 503
                    : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The Review candidate basis-revision command failed.",
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/reviews/:reviewSessionId/separation",
    async (context) => {
      if (
        options.commandPrincipalResolver === undefined ||
        options.reviewSessionSeparationAuthority === undefined
      ) {
        return jsonError(
          context,
          503,
          "REVIEW_SESSION_SEPARATION_COMMAND_UNAVAILABLE",
          "The authenticated ReviewSession separation boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "ReviewSession separation does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const reviewSessionId = context.req.param("reviewSessionId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "ReviewSession separation requires a canonical Project identity.",
          );
        }
        if (!REVIEW_SESSION_ID_PATTERN.test(reviewSessionId)) {
          throw new InteractionInputError(
            "ReviewSession separation requires a canonical ReviewSession identity.",
          );
        }
        const body = await readBoundedJson(context, maxBodyBytes);
        if (!isRecord(body)) {
          throw new InteractionInputError(
            "The ReviewSession separation command must be an object.",
          );
        }
        assertExactKeys(
          body,
          new Set([
            "command_id",
            "idempotency_key",
            "expected_review_session_ref",
            "review_member_id",
          ]),
          "ReviewSession separation command",
        );
        const commandId = requiredString(body, "command_id");
        const idempotencyKey = requiredString(body, "idempotency_key");
        const reviewMemberId = requiredString(body, "review_member_id");
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
        if (!REVIEW_MEMBER_ID_PATTERN.test(reviewMemberId)) {
          throw new InteractionInputError(
            "review_member_id must be a canonical Review member identity.",
          );
        }
        const expectedReviewSessionRef = reviewSessionLifecycleExpectedRef(
          body.expected_review_session_ref,
          reviewSessionId,
          "open",
        );
        const commandName = "SeparateReviewSessionMember" as const;
        try {
          contracts.assertValid("command-envelope", "1.9.0", {
            schema_name: "petra.command-envelope",
            schema_version: "1.9.0",
            command_id: commandId,
            idempotency_key: idempotencyKey,
            project_id: projectId,
            actor: {
              actor_id: "actor_00000000000000000000000000",
              actor_kind: "human",
            },
            capability_grant_id: "capability_grant_00000000000000000000000000",
            correlation_id: "trace_00000000000000000000000000",
            submitted_at: new Date().toISOString(),
            command: {
              command_name: commandName,
              expected_review_session_ref: expectedReviewSessionRef,
              review_member_id: reviewMemberId,
            },
          });
        } catch (error) {
          if (error instanceof ContractRegistryError) {
            throw new InteractionInputError(
              "ReviewSession separation does not satisfy its registered exact-session and member contract.",
              error.validationErrors.map((issue) => issue.instancePath),
            );
          }
          throw error;
        }
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
              "REVIEW_SESSION_SEPARATION_COMMAND_FORBIDDEN",
              "The authenticated principal has no active grant for ReviewSession separation.",
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
              : "More than one active grant matches authenticated ReviewSession separation.",
          );
        }
        const envelope: ReviewSessionSeparationCommandEnvelope = {
          schema_name: "petra.command-envelope",
          schema_version: "1.9.0",
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
            expected_review_session_ref: expectedReviewSessionRef,
            review_member_id: reviewMemberId,
          },
        };
        const result =
          await options.reviewSessionSeparationAuthority.executeReviewSessionSeparationCommand(
            envelope,
          );
        contracts.assertValid(
          "review-session-separation-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid(
          "review-session",
          "1.1.0",
          result.sourceReviewSession,
        );
        contracts.assertValid(
          "review-session",
          "1.1.0",
          result.separatedReviewSession,
        );
        const receipt = result.receipt.content;
        const sourceRef = receipt.source_resulting_review_session_ref;
        const separatedRef = receipt.separated_review_session_ref;
        const separatedMember =
          result.separatedReviewSession.content.members[0];
        const sourceMemberIds = result.sourceReviewSession.content.members.map(
          (member) => member.review_member_id,
        );
        const sourceContext = structuredClone(
          result.sourceReviewSession.content,
        ) as unknown as Record<string, unknown>;
        const separatedContext = structuredClone(
          result.separatedReviewSession.content,
        ) as unknown as Record<string, unknown>;
        delete sourceContext.members;
        delete separatedContext.members;
        if (
          result.receipt.project_id !== projectId ||
          receipt.command_ref.command_id !== commandId ||
          receipt.command_ref.idempotency_key !== idempotencyKey ||
          receipt.command_ref.command_name !== commandName ||
          receipt.source_prior_review_session_ref.review_session_id !==
            reviewSessionId ||
          receipt.source_prior_review_session_ref.revision !==
            expectedReviewSessionRef.revision ||
          receipt.source_prior_review_session_ref.content_hash !==
            expectedReviewSessionRef.content_hash ||
          receipt.partition.separated_review_member_id !== reviewMemberId ||
          result.sourceReviewSession.project_id !== projectId ||
          result.sourceReviewSession.review_session_id !== reviewSessionId ||
          result.sourceReviewSession.revision !== sourceRef.revision ||
          result.sourceReviewSession.content_hash !== sourceRef.content_hash ||
          result.sourceReviewSession.content.lifecycle !== "open" ||
          canonicalize(sourceMemberIds) !==
            canonicalize(receipt.partition.retained_review_member_ids) ||
          result.separatedReviewSession.project_id !== projectId ||
          result.separatedReviewSession.review_session_id !==
            separatedRef.review_session_id ||
          result.separatedReviewSession.revision !== separatedRef.revision ||
          result.separatedReviewSession.content_hash !==
            separatedRef.content_hash ||
          result.separatedReviewSession.content.lifecycle !== "open" ||
          result.separatedReviewSession.content.members.length !== 1 ||
          separatedMember === undefined ||
          separatedMember.review_member_id !== reviewMemberId ||
          canonicalize(sourceContext) !== canonicalize(separatedContext) ||
          receipt.partition.semantic_unit !== "exact_review_member_unchanged" ||
          receipt.partition.atomicity !==
            "existing_change_sets_retained_without_cross_partition_unit" ||
          typeof result.applied !== "boolean"
        ) {
          throw new Error(
            "The ReviewSession separation authority returned a different command, Project, partition, semantic member, or ReviewSession result.",
          );
        }
        return context.json({
          receipt: result.receipt,
          source_review_session: result.sourceReviewSession,
          separated_review_session: result.separatedReviewSession,
          applied: result.applied,
        });
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            422,
            "REVIEW_SESSION_SEPARATION_COMMAND_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof ReviewSessionSeparationAuthorityError) {
          const status =
            error.code === "REVIEW_SESSION_SEPARATION_COMMAND_NOT_AUTHORIZED"
              ? 403
              : error.code === "REVIEW_SESSION_SEPARATION_SESSION_NOT_FOUND"
                ? 404
                : error.code ===
                      "REVIEW_SESSION_SEPARATION_PROFILE_UNSUPPORTED" ||
                    error.code ===
                      "REVIEW_SESSION_SEPARATION_MEMBER_NOT_FOUND" ||
                    error.code ===
                      "REVIEW_SESSION_SEPARATION_MEMBER_NOT_SEPARABLE" ||
                    error.code ===
                      "REVIEW_SESSION_SEPARATION_INCOMPATIBLE_REVISION" ||
                    error.code ===
                      "REVIEW_SESSION_SEPARATION_ATOMICITY_INCOMPATIBLE"
                  ? 422
                  : error.code ===
                      "REVIEW_SESSION_SEPARATION_STORED_RECORD_CORRUPT"
                    ? 503
                    : 409;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "REVIEW_SESSION_SEPARATION_COMMAND_FAILED",
          error instanceof Error
            ? error.message
            : "The ReviewSession separation command failed.",
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
    "/api/queries/projects/:projectId/relationship-overlay",
    async (context) => {
      if (options.projectRelationshipOverlayViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_RELATIONSHIP_OVERLAY_UNAVAILABLE",
          "The authorized Project relationship overlay read boundary is not configured.",
        );
      }
      try {
        const view =
          await options.projectRelationshipOverlayViews.getProjectRelationshipOverlayView(
            context.req.param("projectId"),
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_RELATIONSHIP_OVERLAY_NOT_FOUND",
            "No supported authoritative path and working overlay are available for this Project.",
          );
        }
        if (view.project_id !== context.req.param("projectId")) {
          throw new Error(
            "The relationship overlay reader returned another Project boundary.",
          );
        }
        contracts.assertValid(
          "project-relationship-overlay-view",
          "1.0.0",
          view,
        );
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          503,
          "PROJECT_RELATIONSHIP_OVERLAY_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project relationship overlay is unavailable.",
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
