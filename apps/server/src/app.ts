import {
  CommunicationPlanError,
  communicationHash,
  validateCommunicationRequest,
  type CommunicationPlanReader,
  type CommunicationPlanRequest,
} from "@petra/core";
import {
  FocusedGraphActionPreviewQueryError,
  FocusedGraphAnalysisQueryError,
  FocusedGraphQueryError,
  FocusedGraphViewContractError,
  parseFocusedGraphActionPreviewViewRequest,
  parseFocusedGraphAnalysisViewRequest,
  parseFocusedGraphDetailsViewRequest,
  parseFocusedGraphViewRequest,
  type FocusedGraphActionPreviewViewReader,
  type FocusedGraphAnalysisViewReader,
  type FocusedGraphViewReader,
} from "@petra/core";
import {
  ProjectBriefError,
  type ProjectBriefViewReader,
  type ProjectBriefRequest,
} from "@petra/core";
import {
  ReviewSessionApplyError,
  ReviewSessionRejectError,
  type ReviewSessionApplyBoundary,
  type ReviewSessionRejectBoundary,
  type ReviewApplyAuthority,
  type ReviewRejectAuthority,
} from "@petra/core";
import type {
  PetraReviewSessionApplyRequest,
  PetraReviewSessionRejectRequest,
} from "@petra/contracts";
import {
  validateReviewApplyCheckpoint,
  validateReviewApplyResult,
  validateReviewRejectCheckpoint,
  validateReviewRejectResult,
} from "@petra/adapters";
import {
  ReviewRecoveryAssessmentError,
  type ReviewRecoveryAssessmentReader,
} from "@petra/core";
import { createHash, randomUUID } from "node:crypto";
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
  PetraProjectImportCommandRequest,
  PetraProjectInquirySaveRequest,
  PetraProjectObjectiveCommandRequest,
  PetraProjectSourceRegistrationRequest,
  PetraProjectSourceLinkRemovalRequest,
  PetraProjectSourceLocalCopyDeletionRequest,
  PetraProjectSourceRevisionRequest,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceReuseRequest,
  PetraProjectProfileCommandRequest,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkResumeRequest,
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
  ProjectInquirySaveError,
  ProjectImportError,
  ProjectObjectiveCommandError,
  ProjectSourceRegistrationError,
  ProjectSourceRevisionError,
  ProjectSourceProcessingError,
  ProjectSourceReuseError,
  ProjectProfileRuntimeError,
  ProjectModelReadinessError,
  ProjectWorkOperationError,
  ProjectSourceLifecycleAuthorityError,
  ProjectSourceLinkRemovalError,
  ProjectSourceLocalCopyDeletionError,
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
  type ProjectImportAncestryReader,
  type ProjectImportCommandAuthority,
  type ProjectImportCommandRecoveryReader,
  type ProjectInquiryAuthoredStatus,
  type ProjectInquirySaveAuthority,
  type ProjectObjectiveCommandAuthority,
  type ProjectSourceRegistrationAuthority,
  type ProjectSourceRevisionAuthority,
  type ProjectSourceProcessingAuthority,
  type ProjectSourceProcessingViewReader,
  type ProjectSourceReuseAuthority,
  type ProjectSourceReuseOptionsReader,
  type ProjectProfileCommandAuthority,
  type ProjectProfileCommandRecoveryReader,
  type ProjectProfileRuntimeReader,
  type ProjectModelReadinessReader,
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
  type ProjectSourceLinkRemovalAuthority,
  type ProjectSourceLinkRemovalPreviewReader,
  type ProjectSourceLocalCopyDeletionAuthority,
  type ProjectSourceLocalCopyDeletionPreviewReader,
  type ProjectSourceReplacementCommandAuthorityRepository,
  type ProjectSourceReplacementCommandEnvelope,
  type ProjectSourceViewReader,
  type ProjectThreadLifecycleFilter,
  type ProjectThreadViewReader,
  type ProjectWorkStateFilter,
  type ProjectWorkOperationAuthority,
  type ProjectWorkOperationsViewReader,
  type ProjectWorkResumeAuthority,
  type ProjectWorkerOutputManifestReader,
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
  maxSourceRegistrationBodyBytes?: number;
  publicDir?: string;
  codexProvider?: CodexSubscriptionProviderPort;
  codexWorkspaceRoot?: string;
  communicationPlans?: CommunicationPlanReader;
  projectBriefViews?: ProjectBriefViewReader;
  projectProfileReads?: ProjectProfileRuntimeReader;
  projectProfileCommands?: ProjectProfileCommandAuthority;
  projectProfileRecovery?: ProjectProfileCommandRecoveryReader;
  projectImportCommands?: ProjectImportCommandAuthority;
  projectImportRecovery?: ProjectImportCommandRecoveryReader;
  projectImportAncestry?: ProjectImportAncestryReader;
  projectObjectiveCommands?: ProjectObjectiveCommandAuthority;
  projectSourceRegistrationAuthority?: ProjectSourceRegistrationAuthority;
  projectSourceRevisionAuthority?: ProjectSourceRevisionAuthority;
  projectSourceProcessingAuthority?: ProjectSourceProcessingAuthority;
  projectSourceProcessingViews?: ProjectSourceProcessingViewReader;
  projectSourceReuseAuthority?: ProjectSourceReuseAuthority;
  projectSourceReuseOptions?: ProjectSourceReuseOptionsReader;
  projectModelReadiness?: ProjectModelReadinessReader;
  projectShellViews?: ProjectShellViewReader;
  projectEffectiveControls?: ProjectEffectiveControlsViewReader;
  projectHistoryViews?: ProjectHistoryViewReader;
  projectHistoryCompensationExecution?: ProjectHistoryCompensationExecutionBoundary;
  projectSourceViews?: ProjectSourceViewReader;
  projectSourceLifecycleViews?: ProjectSourceLifecycleViewReader;
  projectSourceLinkRemovalPreviews?: ProjectSourceLinkRemovalPreviewReader;
  projectSourceLinkRemovals?: ProjectSourceLinkRemovalAuthority;
  projectSourceLocalCopyDeletionPreviews?: ProjectSourceLocalCopyDeletionPreviewReader;
  projectSourceLocalCopyDeletions?: ProjectSourceLocalCopyDeletionAuthority;
  commandPrincipalResolver?: AuthenticatedCommandPrincipalResolver;
  projectSourceLifecycleAuthority?: ProjectSourceLifecycleAuthorityRepository;
  projectSourceReplacementAuthority?: ProjectSourceReplacementCommandAuthorityRepository;
  projectReviewViews?: ProjectReviewViewReader;
  reviewRecoveryAssessments?: ReviewRecoveryAssessmentReader;
  reviewSessionApply?: ReviewSessionApplyBoundary;
  reviewSessionReject?: ReviewSessionRejectBoundary;
  reviewSessionLifecycleAuthority?: ReviewSessionLifecycleAuthorityRepository;
  reviewSessionRefreshAuthority?: ReviewSessionRefreshAuthorityRepository;
  reviewCandidateBasisRevisionAuthority?: ReviewCandidateBasisRevisionAuthorityRepository;
  reviewSessionSeparationAuthority?: ReviewSessionSeparationAuthorityRepository;
  reviewCandidateCorrectionAuthority?: ReviewCandidateCorrectionAuthorityRepository;
  projectWorkingStateSnapshots?: ProjectWorkingStateSnapshotReader;
  projectRelationshipViews?: ProjectRelationshipViewReader;
  focusedGraphViews?: FocusedGraphViewReader;
  focusedGraphActionPreviewViews?: FocusedGraphActionPreviewViewReader;
  focusedGraphAnalysisViews?: FocusedGraphAnalysisViewReader;
  projectRelationshipOverlayViews?: ProjectRelationshipOverlayViewReader;
  projectObjectLocations?: ProjectObjectLocationViewReader;
  projectWorkViews?: ProjectWorkViewReader;
  projectWorkerOutputManifests?: ProjectWorkerOutputManifestReader;
  projectWorkOperations?: ProjectWorkOperationsViewReader;
  projectWorkOperationAuthority?: ProjectWorkOperationAuthority;
  projectWorkResumeAuthority?: ProjectWorkResumeAuthority;
  projectThreadViews?: ProjectThreadViewReader;
  projectInquiryViews?: ProjectInquiryViewReader;
  projectInquirySaveAuthority?: ProjectInquirySaveAuthority;
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
const PROJECT_PROFILE_ID_PATTERN = /^project_template_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID_PATTERN = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_REPLACEMENT_ID_PATTERN =
  /^project_source_replacement_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID_PATTERN = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID_PATTERN = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_CANDIDATE_ID_PATTERN =
  /^working_candidate_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_RELATIONSHIP_ID_PATTERN =
  /^working_relationship_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKER_OUTPUT_MANIFEST_ID_PATTERN =
  /^worker_output_manifest_[0-9A-HJKMNP-TV-Z]{26}$/u;
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
  const maxSourceRegistrationBodyBytes =
    options.maxSourceRegistrationBodyBytes ?? 48 * 1024 * 1024;
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
  const projectProfileError = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ): Response => {
    if (error instanceof ProjectProfileRuntimeError) {
      const status =
        error.code === "PROJECT_PROFILE_COMMAND_DENIED"
          ? 403
          : error.code === "PROJECT_PROFILE_PROJECT_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_PROFILE_NOT_REGISTERED" ||
                error.code === "PROJECT_PROFILE_VERSION_UNAVAILABLE" ||
                error.code === "PROJECT_PROFILE_HASH_MISMATCH"
              ? 422
              : error.code === "PROJECT_PROFILE_RUNTIME_CORRUPT"
                ? 503
                : 409;
      return jsonError(context, status, error.code, error.message);
    }
    if (
      error instanceof ContractRegistryError ||
      error instanceof InteractionInputError ||
      error instanceof SyntaxError
    ) {
      return jsonError(
        context,
        422,
        "PROJECT_PROFILE_REQUEST_INVALID",
        error instanceof Error
          ? error.message
          : "The Project profile request is invalid.",
      );
    }
    return jsonError(
      context,
      503,
      "PROJECT_PROFILE_RUNTIME_FAILED",
      error instanceof Error
        ? error.message
        : "The registered Project profile runtime is unavailable.",
    );
  };
  const projectImportError = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ): Response => {
    if (error instanceof ProjectImportError) {
      const status =
        error.code === "PROJECT_IMPORT_COMMAND_DENIED"
          ? 403
          : error.code === "PROJECT_IMPORT_SOURCE_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_IMPORT_RUNTIME_CORRUPT"
              ? 503
              : 409;
      return jsonError(context, status, error.code, error.message);
    }
    if (
      error instanceof ContractRegistryError ||
      error instanceof InteractionInputError ||
      error instanceof SyntaxError
    ) {
      return jsonError(
        context,
        422,
        "PROJECT_IMPORT_REQUEST_INVALID",
        error instanceof Error
          ? error.message
          : "The Project import request is invalid.",
      );
    }
    return jsonError(
      context,
      503,
      "PROJECT_IMPORT_RUNTIME_FAILED",
      error instanceof Error
        ? error.message
        : "The Project import runtime is unavailable.",
    );
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
  const resolveRejectAuthority = async (
    projectId: string,
  ): Promise<ReviewRejectAuthority> => {
    if (options.commandPrincipalResolver === undefined)
      throw new ReviewSessionRejectError(
        "REVIEW_REJECT_DENIED",
        "Authenticated command authority is unavailable.",
      );
    const commands = ["SubmitChangeSet", "RecordApproval"] as const;
    const resolved = await Promise.all(
      commands.map((commandName) =>
        options.commandPrincipalResolver!.resolveCommandPrincipal({
          projectId,
          commandName,
        }),
      ),
    );
    const first = resolved[0];
    const second = resolved[1];
    if (
      first?.state !== "resolved" ||
      second?.state !== "resolved" ||
      first.actor.actor_kind !== "human" ||
      resolved.some(
        (entry) =>
          entry.state !== "resolved" ||
          canonicalize(entry.actor) !== canonicalize(first.actor),
      )
    )
      throw new ReviewSessionRejectError(
        "REVIEW_REJECT_DENIED",
        "One authenticated human must hold current grants for SubmitChangeSet and RecordApproval.",
      );
    return {
      authorization_basis: {
        kind: "authenticated_human_checkpoint",
        decision: "reject",
        actor: { actor_id: first.actor.actor_id, actor_kind: "human" },
      },
      capability_grants: {
        SubmitChangeSet: first.capabilityGrantId,
        RecordApproval: second.capabilityGrantId,
      },
    };
  };
  const rejectError = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    if (error instanceof ReviewSessionRejectError) {
      const status =
        error.code === "REVIEW_REJECT_DENIED"
          ? 403
          : error.code === "REVIEW_REJECT_UNSUPPORTED"
            ? 422
            : error.code === "REVIEW_REJECT_CORRUPT"
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
        "REVIEW_REJECT_INVALID",
        "The exact versioned Review rejection request is invalid.",
      );
    return jsonError(
      context,
      503,
      "REVIEW_REJECT_RECONCILE",
      "The rejection observation is unavailable. Effects may exist; reconcile canonical Review status through D020 before another attempt.",
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
  app.get(
    "/api/queries/projects/:projectId/reviews/:reviewSessionId/reject-checkpoint",
    async (context) => {
      if (options.reviewSessionReject === undefined)
        return jsonError(
          context,
          503,
          "REVIEW_REJECT_UNAVAILABLE",
          "ReviewSession rejection authority is unavailable.",
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
          throw new TypeError("Invalid rejection selection.");
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
          !REVIEW_MEMBER_ID_PATTERN.test(selection.selected_review_member_id)
        )
          throw new TypeError("Invalid exact Review rejection selection.");
        const authority = await resolveRejectAuthority(projectId);
        const result = await options.reviewSessionReject.prepareReviewReject(
          selection,
          authority,
        );
        await validateReviewRejectCheckpoint(result, selection);
        if (
          canonicalize(result.binding.authorization_basis) !==
            canonicalize(authority.authorization_basis) ||
          canonicalize(result.binding.capability_grants) !==
            canonicalize(authority.capability_grants)
        )
          throw new Error("Mismatched authenticated rejection checkpoint.");
        context.header("Cache-Control", "no-store");
        return context.json(result);
      } catch (error) {
        return rejectError(context, error);
      }
    },
  );
  app.post(
    "/api/commands/projects/:projectId/reviews/:reviewSessionId/reject",
    async (context) => {
      if (options.reviewSessionReject === undefined)
        return jsonError(
          context,
          503,
          "REVIEW_REJECT_UNAVAILABLE",
          "ReviewSession rejection authority is unavailable.",
        );
      try {
        const projectId = context.req.param("projectId");
        const sessionId = context.req.param("reviewSessionId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !REVIEW_SESSION_ID_PATTERN.test(sessionId) ||
          new URL(context.req.url).search !== ""
        )
          throw new TypeError("Invalid rejection route binding.");
        const body: unknown = await context.req.json();
        contracts.assertValid("review-session-reject-request", "1.0.0", body);
        const request = body as PetraReviewSessionRejectRequest;
        if (
          request.checkpoint.binding.project_id !== projectId ||
          request.checkpoint.binding.review_session.review_session_id !==
            sessionId
        )
          throw new TypeError("Mismatched rejection route binding.");
        const authority = await resolveRejectAuthority(projectId);
        if (
          canonicalize(authority.authorization_basis) !==
            canonicalize(request.checkpoint.binding.authorization_basis) ||
          canonicalize(authority.capability_grants) !==
            canonicalize(request.checkpoint.binding.capability_grants)
        )
          throw new ReviewSessionRejectError(
            "REVIEW_REJECT_DENIED",
            "The rejection checkpoint does not bind the authenticated human's exact current grants.",
          );
        await validateReviewRejectCheckpoint(request.checkpoint);
        const result = await options.reviewSessionReject.executeReviewReject(
          request,
          authority,
        );
        await validateReviewRejectResult(result, request);
        context.header("Cache-Control", "no-store");
        return context.json(result);
      } catch (error) {
        return rejectError(context, error);
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

  app.get("/api/queries/project-profiles", async (context) => {
    if (options.projectProfileReads === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_PROFILE_RUNTIME_UNAVAILABLE",
        "The registered Project profile read boundary is not configured.",
      );
    }
    try {
      if (new URL(context.req.url).searchParams.size !== 0) {
        throw new InteractionInputError(
          "The registered Project profile collection accepts no query overrides.",
        );
      }
      const profiles =
        await options.projectProfileReads.listRegisteredProfiles();
      for (const profile of profiles) {
        contracts.assertValid("registered-project-profile", "1.0.0", profile);
      }
      context.header("Cache-Control", "no-store");
      return context.json({ profiles });
    } catch (error) {
      return projectProfileError(context, error);
    }
  });

  app.get("/api/queries/project-profiles/:profileId", async (context) => {
    if (options.projectProfileReads === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_PROFILE_RUNTIME_UNAVAILABLE",
        "The registered Project profile read boundary is not configured.",
      );
    }
    try {
      const profileId = context.req.param("profileId");
      const parameters = new URL(context.req.url).searchParams;
      if (
        !PROJECT_PROFILE_ID_PATTERN.test(profileId) ||
        [...parameters.keys()].some(
          (key) => key !== "version" || parameters.getAll(key).length !== 1,
        )
      ) {
        throw new InteractionInputError(
          "A profile read requires one canonical profile ID and at most one exact version.",
        );
      }
      const version = parameters.get("version") ?? undefined;
      if (version !== undefined && !/^[0-9]+\.[0-9]+\.[0-9]+$/u.test(version)) {
        throw new InteractionInputError(
          "A profile version must use an exact numeric major.minor.patch identity.",
        );
      }
      const profile = await options.projectProfileReads.getRegisteredProfile(
        profileId,
        version,
      );
      if (profile === undefined) {
        return jsonError(
          context,
          404,
          "PROJECT_PROFILE_NOT_REGISTERED",
          "The exact registered Project profile is unavailable.",
        );
      }
      contracts.assertValid("registered-project-profile", "1.0.0", profile);
      context.header("Cache-Control", "no-store");
      return context.json(profile);
    } catch (error) {
      return projectProfileError(context, error);
    }
  });

  app.post("/api/queries/project-profile-command-recovery", async (context) => {
    if (options.projectProfileRecovery === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_PROFILE_RUNTIME_UNAVAILABLE",
        "The Project entry recovery boundary is not configured.",
      );
    }
    try {
      const request = (await readBoundedJson(
        context,
        maxBodyBytes,
      )) as PetraProjectProfileCommandRequest;
      contracts.assertValid(
        "project-profile-command-request",
        "1.0.0",
        request,
      );
      const assessment =
        await options.projectProfileRecovery.assessProjectProfileCommandRecovery(
          request,
        );
      contracts.assertValid(
        "project-profile-command-recovery-view",
        "1.0.0",
        assessment,
      );
      context.header("Cache-Control", "no-store");
      return context.json(assessment);
    } catch (error) {
      return projectProfileError(context, error);
    }
  });

  app.post("/api/commands/projects", async (context) => {
    if (options.projectProfileCommands === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_PROFILE_RUNTIME_UNAVAILABLE",
        "The Project creation boundary is not configured.",
      );
    }
    try {
      const request = (await readBoundedJson(
        context,
        maxBodyBytes,
      )) as PetraProjectProfileCommandRequest;
      contracts.assertValid(
        "project-profile-command-request",
        "1.0.0",
        request,
      );
      if (request.operation !== "create") {
        throw new InteractionInputError(
          "The Project collection command accepts only create requests.",
        );
      }
      const receipt =
        await options.projectProfileCommands.executeProjectProfileCommand(
          request,
        );
      contracts.assertValid(
        "project-profile-command-receipt",
        "1.0.0",
        receipt,
      );
      return context.json(receipt, 201);
    } catch (error) {
      return projectProfileError(context, error);
    }
  });

  app.post("/api/commands/projects/:projectId/reset", async (context) => {
    if (options.projectProfileCommands === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_PROFILE_RUNTIME_UNAVAILABLE",
        "The Project reset boundary is not configured.",
      );
    }
    try {
      const projectId = context.req.param("projectId");
      if (!PROJECT_ID_PATTERN.test(projectId)) {
        throw new InteractionInputError(
          "Project reset requires a canonical Project ID.",
        );
      }
      const request = (await readBoundedJson(
        context,
        maxBodyBytes,
      )) as PetraProjectProfileCommandRequest;
      contracts.assertValid(
        "project-profile-command-request",
        "1.0.0",
        request,
      );
      if (
        request.operation !== "reset" ||
        request.expected_project?.project_id !== projectId
      ) {
        throw new InteractionInputError(
          "The reset route and exact expected Project must identify the same Project.",
        );
      }
      const receipt =
        await options.projectProfileCommands.executeProjectProfileCommand(
          request,
        );
      contracts.assertValid(
        "project-profile-command-receipt",
        "1.0.0",
        receipt,
      );
      return context.json(receipt);
    } catch (error) {
      return projectProfileError(context, error);
    }
  });

  app.post("/api/commands/projects/import", async (context) => {
    if (options.projectImportCommands === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_IMPORT_RUNTIME_UNAVAILABLE",
        "The reviewed Project import boundary is not configured.",
      );
    }
    try {
      const request = (await readBoundedJson(
        context,
        maxBodyBytes,
      )) as PetraProjectImportCommandRequest;
      contracts.assertValid("project-import-command-request", "1.0.0", request);
      const receipt =
        await options.projectImportCommands.executeProjectImportCommand(
          request,
        );
      contracts.assertValid("project-import-command-receipt", "1.0.0", receipt);
      return context.json(receipt, 201);
    } catch (error) {
      return projectImportError(context, error);
    }
  });

  app.post("/api/queries/project-import-command-recovery", async (context) => {
    if (options.projectImportRecovery === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_IMPORT_RUNTIME_UNAVAILABLE",
        "The Project import recovery boundary is not configured.",
      );
    }
    try {
      const request = (await readBoundedJson(
        context,
        maxBodyBytes,
      )) as PetraProjectImportCommandRequest;
      contracts.assertValid("project-import-command-request", "1.0.0", request);
      const assessment =
        await options.projectImportRecovery.assessProjectImportCommandRecovery(
          request,
        );
      contracts.assertValid(
        "project-import-command-recovery-view",
        "1.0.0",
        assessment,
      );
      context.header("Cache-Control", "no-store");
      return context.json(assessment);
    } catch (error) {
      return projectImportError(context, error);
    }
  });

  app.get(
    "/api/queries/projects/:projectId/import-ancestry",
    async (context) => {
      if (options.projectImportAncestry === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_IMPORT_RUNTIME_UNAVAILABLE",
          "The Project import ancestry read is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "Project import ancestry requires a canonical Project ID.",
          );
        }
        const receipt =
          await options.projectImportAncestry.getProjectImportAncestry(
            projectId,
          );
        if (receipt === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_IMPORT_ANCESTRY_NOT_FOUND",
            "This Project has no retained import ancestry receipt.",
          );
        }
        contracts.assertValid(
          "project-import-command-receipt",
          "1.0.0",
          receipt,
        );
        context.header("Cache-Control", "no-store");
        return context.json(receipt);
      } catch (error) {
        return projectImportError(context, error);
      }
    },
  );

  const projectObjectiveCommandResponse = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    const invalid =
      error instanceof InteractionInputError ||
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError;
    const status = invalid
      ? 422
      : error instanceof ProjectObjectiveCommandError
        ? error.code === "PROJECT_OBJECTIVE_COMMAND_NOT_AUTHORIZED"
          ? 403
          : error.code === "PROJECT_OBJECTIVE_COMMAND_PROJECT_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_OBJECTIVE_COMMAND_KIND_UNREGISTERED" ||
                error.code === "PROJECT_OBJECTIVE_COMMAND_DEPENDENCY_INVALID" ||
                error.code === "PROJECT_OBJECTIVE_COMMAND_REVIEW_INVALID"
              ? 422
              : error.code === "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT"
                ? 503
                : 409
        : 503;
    return jsonError(
      context,
      status,
      invalid
        ? "PROJECT_OBJECTIVE_COMMAND_REQUEST_INVALID"
        : error instanceof ProjectObjectiveCommandError
          ? error.code
          : "PROJECT_OBJECTIVE_COMMAND_FAILED",
      error instanceof Error
        ? error.message
        : "The reviewed Objective command is unavailable.",
      error instanceof InteractionInputError ? error.issues : undefined,
    );
  };

  const objectivePrincipal = async (projectId: string) => {
    if (options.commandPrincipalResolver === undefined) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_NOT_AUTHORIZED",
        "Authenticated Objective command authority is unavailable.",
      );
    }
    const principal =
      await options.commandPrincipalResolver.resolveCommandPrincipal({
        projectId,
        commandName: "FrameProjectObjective",
      });
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_kind !== "human"
    ) {
      throw new ProjectObjectiveCommandError(
        "PROJECT_OBJECTIVE_COMMAND_NOT_AUTHORIZED",
        `The authenticated Objective command principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
      );
    }
    return {
      actor: {
        actor_id: principal.actor.actor_id,
        actor_kind: "human" as const,
      },
      capabilityGrantId: principal.capabilityGrantId,
    };
  };

  app.post("/api/commands/projects/:projectId/objective", async (context) => {
    if (options.projectObjectiveCommands === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_OBJECTIVE_COMMAND_UNAVAILABLE",
        "The reviewed Objective framing boundary is not configured.",
      );
    }
    try {
      const projectId = context.req.param("projectId");
      if (
        !PROJECT_ID_PATTERN.test(projectId) ||
        new URL(context.req.url).searchParams.size !== 0
      ) {
        throw new InteractionInputError(
          "Objective commands require one canonical Project and accept no query overrides.",
        );
      }
      const request = (await readBoundedJson(
        context,
        maxBodyBytes,
      )) as PetraProjectObjectiveCommandRequest;
      contracts.assertValid(
        "project-objective-command-request",
        "1.0.0",
        request,
      );
      if (request.expected.project_ref.project_id !== projectId) {
        throw new ProjectObjectiveCommandError(
          "PROJECT_OBJECTIVE_COMMAND_PROJECT_STALE",
          "The Objective command route and exact expected Project must match.",
        );
      }
      const result =
        await options.projectObjectiveCommands.executeProjectObjectiveCommand(
          projectId,
          request,
          await objectivePrincipal(projectId),
        );
      contracts.assertValid(
        "project-objective-command-receipt",
        "1.0.0",
        result.receipt,
      );
      contracts.assertValid("project-objective", "1.0.0", result.objective);
      if (
        result.receipt.project_id !== projectId ||
        result.receipt.command_id !== request.command_id ||
        result.receipt.idempotency_key !== request.idempotency_key ||
        result.receipt.objective_ref.objective_id !==
          result.objective.objective_id ||
        result.receipt.objective_ref.revision !== result.objective.revision ||
        result.receipt.destination.project_id !== projectId ||
        result.receipt.destination.objective_ref.record_hash !==
          result.receipt.objective_ref.record_hash
      ) {
        throw new Error(
          "The Objective command authority returned a different command, Project, Objective, or Brief destination.",
        );
      }
      context.header("Cache-Control", "no-store");
      return context.json(result, result.applied ? 201 : 200);
    } catch (error) {
      return projectObjectiveCommandResponse(context, error);
    }
  });

  app.post(
    "/api/queries/projects/:projectId/objective-command-recovery",
    async (context) => {
      if (options.projectObjectiveCommands === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_OBJECTIVE_COMMAND_RECOVERY_UNAVAILABLE",
          "The Objective command recovery boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Objective command recovery requires one canonical Project and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectObjectiveCommandRequest;
        contracts.assertValid(
          "project-objective-command-request",
          "1.0.0",
          request,
        );
        if (request.expected.project_ref.project_id !== projectId) {
          throw new ProjectObjectiveCommandError(
            "PROJECT_OBJECTIVE_COMMAND_PROJECT_STALE",
            "The Objective recovery route and exact expected Project must match.",
          );
        }
        const assessment =
          await options.projectObjectiveCommands.assessProjectObjectiveCommandRecovery(
            projectId,
            request,
            await objectivePrincipal(projectId),
          );
        contracts.assertValid(
          "project-objective-command-recovery-view",
          "1.0.0",
          assessment,
        );
        if (
          assessment.project_id !== projectId ||
          assessment.subject.command_id !== request.command_id ||
          assessment.subject.idempotency_key !== request.idempotency_key ||
          assessment.return.destination.project_id !== projectId
        ) {
          throw new Error(
            "The Objective recovery assessment crossed its exact command or Brief return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(assessment);
      } catch (error) {
        return projectObjectiveCommandResponse(context, error);
      }
    },
  );

  const projectSourceRegistrationResponse = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    const invalid =
      error instanceof InteractionInputError ||
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError;
    const status = invalid
      ? 422
      : error instanceof ProjectSourceRegistrationError
        ? error.code === "PROJECT_SOURCE_REGISTRATION_NOT_AUTHORIZED"
          ? 403
          : error.code === "PROJECT_SOURCE_REGISTRATION_PROJECT_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_SOURCE_REGISTRATION_ROLE_UNREGISTERED" ||
                error.code === "PROJECT_SOURCE_REGISTRATION_RIGHTS_INVALID" ||
                error.code === "PROJECT_SOURCE_REGISTRATION_MATERIAL_INVALID"
              ? 422
              : error.code ===
                  "PROJECT_SOURCE_REGISTRATION_STORED_RECORD_CORRUPT"
                ? 503
                : 409
        : 503;
    return jsonError(
      context,
      status,
      invalid
        ? "PROJECT_SOURCE_REGISTRATION_REQUEST_INVALID"
        : error instanceof ProjectSourceRegistrationError
          ? error.code
          : "PROJECT_SOURCE_REGISTRATION_FAILED",
      error instanceof Error
        ? error.message
        : "The source registration boundary is unavailable.",
      error instanceof InteractionInputError ? error.issues : undefined,
    );
  };

  const sourceRegistrationPrincipal = async (projectId: string) => {
    if (options.commandPrincipalResolver === undefined) {
      throw new ProjectSourceRegistrationError(
        "PROJECT_SOURCE_REGISTRATION_NOT_AUTHORIZED",
        "Authenticated source registration authority is unavailable.",
      );
    }
    const principal =
      await options.commandPrincipalResolver.resolveCommandPrincipal({
        projectId,
        commandName: "RegisterProjectSource",
      });
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_kind !== "human"
    ) {
      throw new ProjectSourceRegistrationError(
        "PROJECT_SOURCE_REGISTRATION_NOT_AUTHORIZED",
        `The authenticated source registration principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
      );
    }
    return {
      actor: {
        actor_id: principal.actor.actor_id,
        actor_kind: "human" as const,
      },
      capabilityGrantId: principal.capabilityGrantId,
    };
  };

  const projectSourceRevisionResponse = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    const invalid =
      error instanceof InteractionInputError ||
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError;
    const status = invalid
      ? 422
      : error instanceof ProjectSourceRevisionError
        ? error.code === "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED"
          ? 403
          : error.code === "PROJECT_SOURCE_REVISION_PROJECT_NOT_FOUND" ||
              error.code === "PROJECT_SOURCE_REVISION_SOURCE_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_SOURCE_REVISION_ROLE_UNREGISTERED" ||
                error.code === "PROJECT_SOURCE_REVISION_RIGHTS_INVALID" ||
                error.code === "PROJECT_SOURCE_REVISION_MATERIAL_INVALID"
              ? 422
              : error.code === "PROJECT_SOURCE_REVISION_STORED_RECORD_CORRUPT"
                ? 503
                : 409
        : 503;
    return jsonError(
      context,
      status,
      invalid
        ? "PROJECT_SOURCE_REVISION_REQUEST_INVALID"
        : error instanceof ProjectSourceRevisionError
          ? error.code
          : "PROJECT_SOURCE_REVISION_FAILED",
      error instanceof Error
        ? error.message
        : "The source-version intake boundary is unavailable.",
      error instanceof InteractionInputError ? error.issues : undefined,
    );
  };

  const sourceRevisionPrincipal = async (projectId: string) => {
    if (options.commandPrincipalResolver === undefined) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED",
        "Authenticated source-version authority is unavailable.",
      );
    }
    const principal =
      await options.commandPrincipalResolver.resolveCommandPrincipal({
        projectId,
        commandName: "AddProjectSourceRevision",
      });
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_kind !== "human"
    ) {
      throw new ProjectSourceRevisionError(
        "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED",
        `The authenticated source-version principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
      );
    }
    return {
      actor: {
        actor_id: principal.actor.actor_id,
        actor_kind: "human" as const,
      },
      capabilityGrantId: principal.capabilityGrantId,
    };
  };

  const projectSourceLinkRemovalResponse = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    const invalid =
      error instanceof InteractionInputError ||
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError;
    const status = invalid
      ? 422
      : error instanceof ProjectSourceLinkRemovalError
        ? error.code === "PROJECT_SOURCE_LINK_REMOVAL_NOT_AUTHORIZED"
          ? 403
          : error.code === "PROJECT_SOURCE_LINK_REMOVAL_PROJECT_NOT_FOUND" ||
              error.code === "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_SOURCE_LINK_REMOVAL_STORED_RECORD_CORRUPT"
              ? 503
              : 409
        : 503;
    return jsonError(
      context,
      status,
      invalid
        ? "PROJECT_SOURCE_LINK_REMOVAL_REQUEST_INVALID"
        : error instanceof ProjectSourceLinkRemovalError
          ? error.code
          : "PROJECT_SOURCE_LINK_REMOVAL_FAILED",
      error instanceof Error
        ? error.message
        : "The Project source link-removal boundary is unavailable.",
      error instanceof InteractionInputError ? error.issues : undefined,
    );
  };

  const sourceLinkRemovalPrincipal = async (projectId: string) => {
    if (options.commandPrincipalResolver === undefined) {
      throw new ProjectSourceLinkRemovalError(
        "PROJECT_SOURCE_LINK_REMOVAL_NOT_AUTHORIZED",
        "Authenticated Project source link-removal authority is unavailable.",
      );
    }
    const principal =
      await options.commandPrincipalResolver.resolveCommandPrincipal({
        projectId,
        commandName: "ExcludeProjectSource",
      });
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_kind !== "human"
    ) {
      throw new ProjectSourceLinkRemovalError(
        "PROJECT_SOURCE_LINK_REMOVAL_NOT_AUTHORIZED",
        `The authenticated Project source link-removal principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
      );
    }
    return {
      actor: {
        actor_id: principal.actor.actor_id,
        actor_kind: "human" as const,
      },
      capabilityGrantId: principal.capabilityGrantId,
    };
  };

  const projectSourceLocalCopyDeletionResponse = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    const invalid =
      error instanceof InteractionInputError ||
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError;
    const status = invalid
      ? 422
      : error instanceof ProjectSourceLocalCopyDeletionError
        ? error.code === "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_AUTHORIZED"
          ? 403
          : error.code ===
                "PROJECT_SOURCE_LOCAL_COPY_DELETION_PROJECT_NOT_FOUND" ||
              error.code ===
                "PROJECT_SOURCE_LOCAL_COPY_DELETION_SOURCE_NOT_FOUND"
            ? 404
            : error.code ===
                  "PROJECT_SOURCE_LOCAL_COPY_DELETION_OUTCOME_UNKNOWN" ||
                error.code ===
                  "PROJECT_SOURCE_LOCAL_COPY_DELETION_STORED_RECORD_CORRUPT"
              ? 503
              : 409
        : 503;
    return jsonError(
      context,
      status,
      invalid
        ? "PROJECT_SOURCE_LOCAL_COPY_DELETION_REQUEST_INVALID"
        : error instanceof ProjectSourceLocalCopyDeletionError
          ? error.code
          : "PROJECT_SOURCE_LOCAL_COPY_DELETION_FAILED",
      error instanceof Error
        ? error.message
        : "The Project source local-copy deletion boundary is unavailable.",
      error instanceof InteractionInputError ? error.issues : undefined,
    );
  };

  const sourceLocalCopyDeletionPrincipal = async (projectId: string) => {
    if (options.commandPrincipalResolver === undefined) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_AUTHORIZED",
        "Authenticated local-copy deletion authority is unavailable.",
      );
    }
    const principal =
      await options.commandPrincipalResolver.resolveCommandPrincipal({
        projectId,
        commandName: "DeleteLocalSourceCopy",
      });
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_kind !== "human"
    ) {
      throw new ProjectSourceLocalCopyDeletionError(
        "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_AUTHORIZED",
        `The authenticated local-copy deletion principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
      );
    }
    return {
      actor: {
        actor_id: principal.actor.actor_id,
        actor_kind: "human" as const,
      },
      capabilityGrantId: principal.capabilityGrantId,
    };
  };

  const projectSourceReuseResponse = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    const invalid =
      error instanceof InteractionInputError ||
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError;
    const status = invalid
      ? 422
      : error instanceof ProjectSourceReuseError
        ? error.code === "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED" ||
          error.code === "PROJECT_SOURCE_REUSE_COPY_NOT_AUTHORIZED"
          ? 403
          : error.code === "PROJECT_SOURCE_REUSE_PROJECT_NOT_FOUND" ||
              error.code === "PROJECT_SOURCE_REUSE_SOURCE_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_SOURCE_REUSE_ROLE_UNREGISTERED"
              ? 422
              : error.code === "PROJECT_SOURCE_REUSE_STORED_RECORD_CORRUPT"
                ? 503
                : 409
        : 503;
    return jsonError(
      context,
      status,
      invalid
        ? "PROJECT_SOURCE_REUSE_REQUEST_INVALID"
        : error instanceof ProjectSourceReuseError
          ? error.code
          : "PROJECT_SOURCE_REUSE_FAILED",
      error instanceof Error
        ? error.message
        : "The source reuse boundary is unavailable.",
      error instanceof InteractionInputError ? error.issues : undefined,
    );
  };

  const sourceReusePrincipal = async (projectId: string) => {
    if (options.commandPrincipalResolver === undefined) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
        "Authenticated source reuse authority is unavailable.",
      );
    }
    const principal =
      await options.commandPrincipalResolver.resolveCommandPrincipal({
        projectId,
        commandName: "ReuseProjectSource",
      });
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_kind !== "human"
    ) {
      throw new ProjectSourceReuseError(
        "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
        `The authenticated source reuse principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
      );
    }
    return {
      actor: {
        actor_id: principal.actor.actor_id,
        actor_kind: "human" as const,
      },
      capabilityGrantId: principal.capabilityGrantId,
    };
  };

  const projectSourceProcessingResponse = (
    context: Context<{ Variables: Variables }>,
    error: unknown,
  ) => {
    const invalid =
      error instanceof InteractionInputError ||
      error instanceof ContractRegistryError ||
      error instanceof SyntaxError ||
      error instanceof TypeError;
    const status = invalid
      ? 422
      : error instanceof ProjectSourceProcessingError
        ? error.code === "PROJECT_SOURCE_PROCESSING_NOT_AUTHORIZED" ||
          error.code === "PROJECT_SOURCE_PROCESSING_PARSE_NOT_AUTHORIZED"
          ? 403
          : error.code === "PROJECT_SOURCE_PROCESSING_PROJECT_NOT_FOUND" ||
              error.code === "PROJECT_SOURCE_PROCESSING_SOURCE_NOT_FOUND"
            ? 404
            : error.code === "PROJECT_SOURCE_PROCESSING_COPY_UNAVAILABLE" ||
                error.code === "PROJECT_SOURCE_PROCESSING_ROLE_UNREGISTERED" ||
                error.code === "PROJECT_SOURCE_PROCESSING_SOURCE_UNAVAILABLE"
              ? 422
              : error.code === "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT"
                ? 503
                : 409
        : 503;
    return jsonError(
      context,
      status,
      invalid
        ? "PROJECT_SOURCE_PROCESSING_REQUEST_INVALID"
        : error instanceof ProjectSourceProcessingError
          ? error.code
          : "PROJECT_SOURCE_PROCESSING_FAILED",
      error instanceof Error
        ? error.message
        : "The source-processing boundary is unavailable.",
      error instanceof InteractionInputError ? error.issues : undefined,
    );
  };

  const sourceProcessingPrincipal = async (projectId: string) => {
    if (options.commandPrincipalResolver === undefined) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_NOT_AUTHORIZED",
        "Authenticated source-processing authority is unavailable.",
      );
    }
    const principal =
      await options.commandPrincipalResolver.resolveCommandPrincipal({
        projectId,
        commandName: "StartProjectSourceProcessing",
      });
    if (
      principal.state !== "resolved" ||
      principal.actor.actor_kind !== "human"
    ) {
      throw new ProjectSourceProcessingError(
        "PROJECT_SOURCE_PROCESSING_NOT_AUTHORIZED",
        `The authenticated source-processing principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
      );
    }
    return {
      actor: {
        actor_id: principal.actor.actor_id,
        actor_kind: "human" as const,
      },
      capabilityGrantId: principal.capabilityGrantId,
    };
  };

  app.get(
    "/api/queries/projects/:projectId/source-reuse-options",
    async (context) => {
      if (options.projectSourceReuseOptions === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REUSE_OPTIONS_UNAVAILABLE",
          "The permitted existing-source selector is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source reuse options require one canonical Project and accept no query overrides.",
          );
        }
        const view =
          await options.projectSourceReuseOptions.readProjectSourceReuseOptions(
            projectId,
            await sourceReusePrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-reuse-options-view",
          "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.expected.project_ref.project_id !== projectId
        ) {
          throw new Error(
            "The source reuse selector crossed its exact target Project boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(view);
      } catch (error) {
        return projectSourceReuseResponse(context, error);
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/sources/register",
    async (context) => {
      if (options.projectSourceRegistrationAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REGISTRATION_UNAVAILABLE",
          "The new source registration boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source registration requires one canonical Project and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxSourceRegistrationBodyBytes,
        )) as PetraProjectSourceRegistrationRequest;
        contracts.assertValid(
          "project-source-registration-request",
          "1.0.0",
          request,
        );
        if (request.expected.project_ref.project_id !== projectId) {
          throw new ProjectSourceRegistrationError(
            "PROJECT_SOURCE_REGISTRATION_PROJECT_STALE",
            "The source registration route and exact expected Project must match.",
          );
        }
        const result =
          await options.projectSourceRegistrationAuthority.executeProjectSourceRegistration(
            projectId,
            request,
            await sourceRegistrationPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-registration-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("project-source", "1.0.0", result.projectSource);
        if (
          result.receipt.project_id !== projectId ||
          result.receipt.command_id !== request.command_id ||
          result.receipt.idempotency_key !== request.idempotency_key ||
          result.receipt.project_source_ref.project_source_id !==
            result.projectSource.project_source_id ||
          result.receipt.project_source_ref.revision !==
            result.projectSource.revision ||
          result.receipt.destination.project_id !== projectId ||
          result.receipt.destination.project_source_id !==
            result.projectSource.project_source_id
        ) {
          throw new Error(
            "The source registration authority returned a different command, Project, membership, or Sources destination.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(result, result.applied ? 201 : 200);
      } catch (error) {
        return projectSourceRegistrationResponse(context, error);
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/source-registration-recovery",
    async (context) => {
      if (options.projectSourceRegistrationAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REGISTRATION_RECOVERY_UNAVAILABLE",
          "The source registration recovery boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source registration recovery requires one canonical Project and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxSourceRegistrationBodyBytes,
        )) as PetraProjectSourceRegistrationRequest;
        contracts.assertValid(
          "project-source-registration-request",
          "1.0.0",
          request,
        );
        if (request.expected.project_ref.project_id !== projectId) {
          throw new ProjectSourceRegistrationError(
            "PROJECT_SOURCE_REGISTRATION_PROJECT_STALE",
            "The source registration recovery route and exact expected Project must match.",
          );
        }
        const assessment =
          await options.projectSourceRegistrationAuthority.assessProjectSourceRegistrationRecovery(
            projectId,
            request,
            await sourceRegistrationPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-registration-recovery-view",
          "1.0.0",
          assessment,
        );
        if (
          assessment.project_id !== projectId ||
          assessment.subject.command_id !== request.command_id ||
          assessment.subject.idempotency_key !== request.idempotency_key ||
          assessment.return.destination.project_id !== projectId
        ) {
          throw new Error(
            "The source registration recovery assessment crossed its exact command or Sources return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(assessment);
      } catch (error) {
        return projectSourceRegistrationResponse(context, error);
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/sources/:projectSourceId/revisions",
    async (context) => {
      if (options.projectSourceRevisionAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REVISION_UNAVAILABLE",
          "The source-version intake boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source-version intake requires one canonical Project and predecessor and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxSourceRegistrationBodyBytes,
        )) as PetraProjectSourceRevisionRequest;
        contracts.assertValid(
          "project-source-revision-request",
          "1.0.0",
          request,
        );
        if (
          request.expected.project_ref.project_id !== projectId ||
          request.expected.current_source_ref.project_source_id !==
            projectSourceId
        ) {
          throw new ProjectSourceRevisionError(
            "PROJECT_SOURCE_REVISION_SOURCE_STALE",
            "The source-version route must match the exact expected Project and predecessor.",
          );
        }
        const result =
          await options.projectSourceRevisionAuthority.executeProjectSourceRevision(
            projectId,
            request,
            await sourceRevisionPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-revision-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("project-source", "1.0.0", result.projectSource);
        if (
          result.receipt.project_id !== projectId ||
          result.receipt.command_id !== request.command_id ||
          result.receipt.idempotency_key !== request.idempotency_key ||
          result.receipt.predecessor_source_ref.project_source_id !==
            projectSourceId ||
          result.receipt.successor_source_ref.project_source_id !==
            result.projectSource.project_source_id ||
          result.receipt.successor_source_ref.revision !==
            result.projectSource.revision ||
          result.receipt.successor_source_ref.content_hash !==
            result.projectSource.content_hash ||
          result.receipt.destination.project_id !== projectId ||
          result.receipt.destination.project_source_id !==
            result.projectSource.project_source_id
        ) {
          throw new Error(
            "The source-version authority returned a different command, predecessor, successor, or Sources destination.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(result, result.applied ? 201 : 200);
      } catch (error) {
        return projectSourceRevisionResponse(context, error);
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/source-revision-recovery",
    async (context) => {
      if (options.projectSourceRevisionAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REVISION_RECOVERY_UNAVAILABLE",
          "The source-version recovery boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source-version recovery requires one canonical Project and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxSourceRegistrationBodyBytes,
        )) as PetraProjectSourceRevisionRequest;
        contracts.assertValid(
          "project-source-revision-request",
          "1.0.0",
          request,
        );
        if (request.expected.project_ref.project_id !== projectId) {
          throw new ProjectSourceRevisionError(
            "PROJECT_SOURCE_REVISION_PROJECT_STALE",
            "The source-version recovery route and exact expected Project must match.",
          );
        }
        const assessment =
          await options.projectSourceRevisionAuthority.assessProjectSourceRevisionRecovery(
            projectId,
            request,
            await sourceRevisionPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-revision-recovery-view",
          "1.0.0",
          assessment,
        );
        if (
          assessment.project_id !== projectId ||
          assessment.subject.command_id !== request.command_id ||
          assessment.subject.idempotency_key !== request.idempotency_key ||
          assessment.return.destination.project_id !== projectId
        ) {
          throw new Error(
            "The source-version recovery assessment crossed its exact command or Sources return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(assessment);
      } catch (error) {
        return projectSourceRevisionResponse(context, error);
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/sources/reuse",
    async (context) => {
      if (options.projectSourceReuseAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REUSE_UNAVAILABLE",
          "The existing source reuse boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source reuse requires one canonical Project and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceReuseRequest;
        contracts.assertValid("project-source-reuse-request", "1.0.0", request);
        if (request.expected.project_ref.project_id !== projectId) {
          throw new ProjectSourceReuseError(
            "PROJECT_SOURCE_REUSE_PROJECT_STALE",
            "The source reuse route and exact expected Project must match.",
          );
        }
        const result =
          await options.projectSourceReuseAuthority.executeProjectSourceReuse(
            projectId,
            request,
            await sourceReusePrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-reuse-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("project-source", "1.0.0", result.projectSource);
        if (
          result.receipt.project_id !== projectId ||
          result.receipt.command_id !== request.command_id ||
          result.receipt.idempotency_key !== request.idempotency_key ||
          result.receipt.project_source_ref.project_source_id !==
            result.projectSource.project_source_id ||
          result.receipt.project_source_ref.revision !==
            result.projectSource.revision ||
          result.receipt.destination.project_id !== projectId ||
          result.receipt.destination.project_source_id !==
            result.projectSource.project_source_id
        ) {
          throw new Error(
            "The source reuse authority returned a different command, Project, membership, or Sources destination.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(result, result.applied ? 201 : 200);
      } catch (error) {
        return projectSourceReuseResponse(context, error);
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/source-reuse-recovery",
    async (context) => {
      if (options.projectSourceReuseAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_REUSE_RECOVERY_UNAVAILABLE",
          "The source reuse recovery boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source reuse recovery requires one canonical Project and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceReuseRequest;
        contracts.assertValid("project-source-reuse-request", "1.0.0", request);
        if (request.expected.project_ref.project_id !== projectId) {
          throw new ProjectSourceReuseError(
            "PROJECT_SOURCE_REUSE_PROJECT_STALE",
            "The source reuse recovery route and exact expected Project must match.",
          );
        }
        const assessment =
          await options.projectSourceReuseAuthority.assessProjectSourceReuseRecovery(
            projectId,
            request,
            await sourceReusePrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-reuse-recovery-view",
          "1.0.0",
          assessment,
        );
        if (
          assessment.project_id !== projectId ||
          assessment.subject.command_id !== request.command_id ||
          assessment.subject.idempotency_key !== request.idempotency_key ||
          assessment.return.destination.project_id !== projectId
        ) {
          throw new Error(
            "The source reuse recovery assessment crossed its exact command or Sources return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(assessment);
      } catch (error) {
        return projectSourceReuseResponse(context, error);
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/sources/:projectSourceId/processing",
    async (context) => {
      if (options.projectSourceProcessingViews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_PROCESSING_VIEW_UNAVAILABLE",
          "The composed source-processing Details read is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source-processing Details requires canonical Project and ProjectSource identities and accepts no query overrides.",
          );
        }
        const view =
          await options.projectSourceProcessingViews.getProjectSourceProcessingView(
            projectId,
            projectSourceId,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_SOURCE_PROCESSING_SOURCE_NOT_FOUND",
            "The ProjectSource is not retained in this Project.",
          );
        }
        contracts.assertValid("project-source-processing-view", "1.0.0", view);
        if (
          view.project_id !== projectId ||
          view.project_source_id !== projectSourceId ||
          view.source.project_id !== projectId ||
          view.source.project_source_id !== projectSourceId ||
          view.return.project_id !== projectId ||
          view.return.project_source_id !== projectSourceId
        ) {
          throw new Error(
            "The source-processing Details read crossed its exact source or return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(view);
      } catch (error) {
        return projectSourceProcessingResponse(context, error);
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/sources/:projectSourceId/processing",
    async (context) => {
      if (options.projectSourceProcessingAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_PROCESSING_UNAVAILABLE",
          "The bounded source-processing command is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source processing requires canonical Project and ProjectSource identities and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceProcessingRequest;
        contracts.assertValid(
          "project-source-processing-request",
          "1.0.0",
          request,
        );
        const result =
          await options.projectSourceProcessingAuthority.executeProjectSourceProcessing(
            projectId,
            projectSourceId,
            request,
            await sourceProcessingPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-processing-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("work-unit", "1.0.0", result.workUnit);
        contracts.assertValid(
          "worker-input-manifest",
          "1.0.0",
          result.inputManifest,
        );
        contracts.assertValid(
          "project-source-processing-view",
          "1.0.0",
          result.processing,
        );
        if (
          result.receipt.project_id !== projectId ||
          result.receipt.command_id !== request.command_id ||
          result.receipt.idempotency_key !== request.idempotency_key ||
          result.receipt.destination.project_source_id !== projectSourceId ||
          result.receipt.work_unit_ref.work_unit_id !==
            result.workUnit.work_unit_id ||
          result.receipt.input_manifest_ref.worker_input_manifest_id !==
            result.inputManifest.worker_input_manifest_id ||
          result.processing.project_source_id !== projectSourceId
        ) {
          throw new Error(
            "The source-processing command crossed its exact command, source, Work, or Details boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(result, result.applied ? 201 : 200);
      } catch (error) {
        return projectSourceProcessingResponse(context, error);
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/sources/:projectSourceId/processing-recovery",
    async (context) => {
      if (options.projectSourceProcessingAuthority === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_PROCESSING_RECOVERY_UNAVAILABLE",
          "The source-processing recovery boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Source-processing recovery requires canonical Project and ProjectSource identities and accepts no query overrides.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceProcessingRequest;
        contracts.assertValid(
          "project-source-processing-request",
          "1.0.0",
          request,
        );
        const assessment =
          await options.projectSourceProcessingAuthority.assessProjectSourceProcessingRecovery(
            projectId,
            projectSourceId,
            request,
            await sourceProcessingPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-processing-recovery-view",
          "1.0.0",
          assessment,
        );
        if (
          assessment.project_id !== projectId ||
          assessment.project_source_id !== projectSourceId ||
          assessment.subject.command_id !== request.command_id ||
          assessment.subject.idempotency_key !== request.idempotency_key ||
          assessment.return.destination.project_id !== projectId ||
          assessment.return.destination.project_source_id !== projectSourceId
        ) {
          throw new Error(
            "The source-processing recovery assessment crossed its exact command, source, or return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(assessment);
      } catch (error) {
        return projectSourceProcessingResponse(context, error);
      }
    },
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
      const parameters = new URL(context.req.url).searchParams;
      const allowed = new Set([
        "search",
        "status",
        "profile",
        "limit",
        "cursor",
      ]);
      const unknown = [...parameters.keys()].filter((key) => !allowed.has(key));
      if (unknown.length > 0) {
        throw new InteractionInputError(
          "Project collection contains unregistered query parameters.",
          [...new Set(unknown)],
        );
      }
      for (const key of allowed) {
        if (parameters.getAll(key).length > 1) {
          throw new InteractionInputError(
            `Project collection parameter ${key} must appear once.`,
          );
        }
      }
      const searchValue = parameters.get("search");
      const search = searchValue === null ? undefined : searchValue;
      if (
        search !== undefined &&
        (search.length < 1 || search.length > 240 || search !== search.trim())
      ) {
        throw new InteractionInputError(
          "Project collection search must be a trimmed string from 1 through 240 characters.",
        );
      }
      const statusValue = parameters.get("status");
      let status: "active" | "archived" | undefined;
      if (statusValue === "active" || statusValue === "archived") {
        status = statusValue;
      } else if (statusValue !== null) {
        throw new InteractionInputError(
          "Project collection status must be active or archived.",
        );
      }
      const profileValue = parameters.get("profile");
      const profile = profileValue === null ? undefined : profileValue;
      if (profile !== undefined && !/^[a-z][a-z0-9.-]{2,127}$/u.test(profile)) {
        throw new InteractionInputError(
          "Project collection profile must be a registered definition family.",
        );
      }
      const limitValue = parameters.get("limit");
      const limit = limitValue === null ? undefined : Number(limitValue);
      if (
        limit !== undefined &&
        (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
      ) {
        throw new InteractionInputError(
          "Project collection limit must be an integer from 1 through 100.",
        );
      }
      const cursorValue = parameters.get("cursor");
      const cursor = cursorValue === null ? undefined : cursorValue;
      if (cursor !== undefined && !/^offset:[0-9]{1,9}$/u.test(cursor)) {
        throw new InteractionInputError(
          "Project collection cursor is invalid.",
        );
      }
      const query = {
        ...(search === undefined ? {} : { search }),
        ...(status === undefined ? {} : { status }),
        ...(profile === undefined ? {} : { profile }),
        limit: limit ?? 50,
        ...(cursor === undefined ? {} : { cursor }),
      } as const;
      const collection =
        await options.projectShellViews.searchProjectShellViews(query);
      contracts.assertValid(
        "project-shell-collection-view",
        "1.0.0",
        collection,
      );
      if (
        canonicalize(collection.content.query) !== canonicalize(query) ||
        collection.content.page.returned_count !==
          collection.content.projects.length ||
        collection.content_hash !==
          `sha256:${createHash("sha256")
            .update(canonicalize(collection.content))
            .digest("hex")}`
      ) {
        throw new Error(
          "The Project collection reader returned a different query or invalid result identity.",
        );
      }
      for (const project of collection.content.projects) {
        assertProjectShellView(project);
      }
      context.header("Cache-Control", "no-store");
      return context.json(collection);
    } catch (error) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 503,
        error instanceof InteractionInputError
          ? "PROJECT_COLLECTION_QUERY_INVALID"
          : "PROJECT_SHELL_READ_FAILED",
        error instanceof Error
          ? error.message
          : "The Project shell collection is unavailable.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.get("/api/queries/projects/:projectId/communication", async (context) => {
    if (!options.communicationPlans)
      return jsonError(
        context,
        503,
        "COMMUNICATION_UNAVAILABLE",
        "The communication reader is not configured.",
      );
    try {
      const parameters = new URL(context.req.url).searchParams;
      const allowed = [
        "response_id",
        "response_revision",
        "response_content_hash",
        "response_record_hash",
        "command_id",
        "locale",
        "expected_definition_hash",
      ];
      if (
        [...parameters.keys()].some(
          (key) =>
            !allowed.includes(key) || parameters.getAll(key).length !== 1,
        )
      )
        throw new CommunicationPlanError(
          "Communication reads accept only exact registered controls.",
        );
      const request = {
        ...Object.fromEntries(parameters),
        response_revision: Number(parameters.get("response_revision")),
        locale: parameters.get("locale") ?? "en",
      } as CommunicationPlanRequest;
      const projectId = context.req.param("projectId");
      validateCommunicationRequest(projectId, request);
      const plan = await options.communicationPlans.getCommunicationPlan(
        projectId,
        request,
      );
      if (!plan)
        return jsonError(
          context,
          404,
          "COMMUNICATION_NOT_FOUND",
          "The exact response is unavailable in this Project.",
        );
      contracts.assertValid("communication-plan", "1.0.0", plan);
      if (plan.project_id !== projectId)
        throw new CommunicationPlanError(
          "The communication reader crossed a Project boundary.",
        );
      context.header("Cache-Control", "no-store");
      return context.json(plan);
    } catch (error) {
      return jsonError(
        context,
        error instanceof CommunicationPlanError ? 422 : 503,
        "COMMUNICATION_READ_FAILED",
        error instanceof Error
          ? error.message
          : "Communication is unavailable.",
      );
    }
  });

  app.get("/api/queries/projects/:projectId/taxonomy", async (context) => {
    if (options.projectProfileReads === undefined) {
      return jsonError(
        context,
        503,
        "PROJECT_PROFILE_RUNTIME_UNAVAILABLE",
        "The Project taxonomy read boundary is not configured.",
      );
    }
    try {
      const projectId = context.req.param("projectId");
      const parameters = new URL(context.req.url).searchParams;
      if (
        !PROJECT_ID_PATTERN.test(projectId) ||
        [...parameters.keys()].some(
          (key) =>
            key !== "definition_revision" ||
            parameters.getAll(key).length !== 1,
        )
      ) {
        throw new InteractionInputError(
          "A Project taxonomy read accepts one canonical Project and at most one exact definition revision.",
        );
      }
      const revisionText = parameters.get("definition_revision");
      const definitionRevision =
        revisionText === null ? undefined : Number(revisionText);
      if (
        definitionRevision !== undefined &&
        (!Number.isSafeInteger(definitionRevision) || definitionRevision < 1)
      ) {
        throw new InteractionInputError(
          "The ProjectDefinition revision must be a positive safe integer.",
        );
      }
      const taxonomy =
        await options.projectProfileReads.getProjectProfileTaxonomy(
          projectId,
          definitionRevision,
        );
      if (taxonomy === undefined) {
        return jsonError(
          context,
          404,
          "PROJECT_TAXONOMY_NOT_FOUND",
          "The Project or exact ProjectDefinition revision is unavailable.",
        );
      }
      contracts.assertValid("project-profile-taxonomy-view", "1.0.0", taxonomy);
      context.header("Cache-Control", "no-store");
      return context.json(taxonomy);
    } catch (error) {
      return projectProfileError(context, error);
    }
  });

  app.get(
    "/api/queries/projects/:projectId/model-readiness",
    async (context) => {
      if (options.projectModelReadiness === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_MODEL_READINESS_UNAVAILABLE",
          "The Project-scoped certified model readiness boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          new URL(context.req.url).search !== ""
        ) {
          throw new InteractionInputError(
            "Model readiness accepts one canonical Project identity and no query overrides.",
          );
        }
        const readiness =
          await options.projectModelReadiness.getProjectModelReadiness(
            projectId,
          );
        if (readiness === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_MODEL_READINESS_NOT_FOUND",
            "The requested Project or its exact ProjectDefinition is unavailable.",
          );
        }
        contracts.assertValid(
          "project-model-readiness-view",
          "1.0.0",
          readiness,
        );
        if (readiness.project_id !== projectId) {
          throw new ProjectModelReadinessError(
            "PROJECT_MODEL_READINESS_CORRUPT",
            "The model readiness response crossed a Project boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(readiness);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_MODEL_READINESS_REQUEST_INVALID"
            : error instanceof ProjectModelReadinessError
              ? error.code
              : "PROJECT_MODEL_READINESS_FAILED",
          error instanceof Error
            ? error.message
            : "Certified model readiness is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

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
      contracts.assertValid("project-brief-view", view.schema_version, view);
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

  app.post("/api/commands/projects/:projectId/inquiries", async (context) => {
    if (
      options.projectInquirySaveAuthority === undefined ||
      options.commandPrincipalResolver === undefined
    ) {
      return jsonError(
        context,
        503,
        "PROJECT_INQUIRY_SAVE_UNAVAILABLE",
        "The authenticated ProjectInquiry save command boundary is not configured.",
      );
    }
    try {
      const parameters = new URL(context.req.url).searchParams;
      if ([...parameters.keys()].length > 0) {
        throw new InteractionInputError(
          "ProjectInquiry save commands do not accept query parameters.",
          [...new Set(parameters.keys())],
        );
      }
      const projectId = context.req.param("projectId");
      if (!PROJECT_ID_PATTERN.test(projectId)) {
        throw new InteractionInputError(
          "ProjectInquiry save commands require one canonical Project identity.",
        );
      }
      const request = (await readBoundedJson(
        context,
        maxBodyBytes,
      )) as PetraProjectInquirySaveRequest;
      contracts.assertValid("project-inquiry-save-request", "1.0.0", request);
      parseFocusedGraphViewRequest(request.graph_request);
      const principal =
        await options.commandPrincipalResolver.resolveCommandPrincipal({
          projectId,
          commandName: "SaveProjectInquiry",
        });
      if (
        principal.state !== "resolved" ||
        principal.actor.actor_kind !== "human"
      ) {
        throw new ProjectInquirySaveError(
          "PROJECT_INQUIRY_SAVE_NOT_AUTHORIZED",
          `The authenticated ProjectInquiry save principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
        );
      }
      const result =
        await options.projectInquirySaveAuthority.saveProjectInquiry(
          projectId,
          request,
          {
            actor: {
              actor_id: principal.actor.actor_id,
              actor_kind: "human",
            },
            capabilityGrantId: principal.capabilityGrantId,
          },
        );
      contracts.assertValid(
        "project-inquiry-save-receipt",
        "1.0.0",
        result.receipt,
      );
      contracts.assertValid("project-objective", "1.0.0", result.inquiry);
      if (
        result.receipt.project_id !== projectId ||
        result.receipt.command_id !== request.command_id ||
        result.receipt.idempotency_key !== request.idempotency_key ||
        result.receipt.graph_binding.task_request_id !==
          request.graph_request.request_id ||
        result.receipt.graph_binding.focused_graph_ref.content_hash !==
          request.expected_graph.content_hash ||
        result.receipt.objective_ref.objective_id !==
          result.inquiry.objective_id ||
        result.inquiry.project_id !== projectId ||
        result.inquiry.content.statement !== request.graph_request.question
      ) {
        throw new Error(
          "The ProjectInquiry save authority returned a different command, Graph question, Project, or Objective.",
        );
      }
      context.header("Cache-Control", "no-store");
      return context.json(result);
    } catch (error) {
      const invalid =
        error instanceof InteractionInputError ||
        error instanceof ContractRegistryError ||
        error instanceof SyntaxError ||
        (error instanceof FocusedGraphQueryError &&
          error.code === "FOCUSED_GRAPH_QUERY_INVALID");
      const status = invalid
        ? 422
        : error instanceof ProjectInquirySaveError
          ? error.code === "PROJECT_INQUIRY_SAVE_NOT_AUTHORIZED"
            ? 403
            : error.code === "PROJECT_INQUIRY_SAVE_GRAPH_NOT_FOUND"
              ? 404
              : error.code === "PROJECT_INQUIRY_SAVE_ROLE_UNAVAILABLE" ||
                  error.code === "PROJECT_INQUIRY_SAVE_SELECTION_INVALID"
                ? 422
                : error.code === "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT"
                  ? 503
                  : 409
          : error instanceof FocusedGraphQueryError
            ? error.code === "FOCUSED_GRAPH_PROJECT_NOT_FOUND" ||
              error.code === "FOCUSED_GRAPH_FOCUS_NOT_FOUND"
              ? 404
              : error.code === "FOCUSED_GRAPH_DEFINITION_STALE" ||
                  error.code === "FOCUSED_GRAPH_SNAPSHOT_STALE"
                ? 409
                : 503
            : 503;
      return jsonError(
        context,
        status,
        invalid
          ? "PROJECT_INQUIRY_SAVE_REQUEST_INVALID"
          : error instanceof ProjectInquirySaveError
            ? error.code
            : error instanceof FocusedGraphQueryError
              ? error.code
              : "PROJECT_INQUIRY_SAVE_FAILED",
        error instanceof Error
          ? error.message
          : "The ProjectInquiry save command failed.",
        error instanceof InteractionInputError ? error.issues : undefined,
      );
    }
  });

  app.post(
    "/api/queries/projects/:projectId/inquiries/save-recovery",
    async (context) => {
      if (
        options.projectInquirySaveAuthority === undefined ||
        options.commandPrincipalResolver === undefined
      ) {
        return jsonError(
          context,
          503,
          "PROJECT_INQUIRY_SAVE_RECOVERY_UNAVAILABLE",
          "The authenticated ProjectInquiry save recovery boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "ProjectInquiry save recovery does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        if (!PROJECT_ID_PATTERN.test(projectId)) {
          throw new InteractionInputError(
            "ProjectInquiry save recovery requires one canonical Project identity.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectInquirySaveRequest;
        contracts.assertValid("project-inquiry-save-request", "1.0.0", request);
        parseFocusedGraphViewRequest(request.graph_request);
        const principal =
          await options.commandPrincipalResolver.resolveCommandPrincipal({
            projectId,
            commandName: "SaveProjectInquiry",
          });
        if (
          principal.state !== "resolved" ||
          principal.actor.actor_kind !== "human"
        ) {
          throw new ProjectInquirySaveError(
            "PROJECT_INQUIRY_SAVE_NOT_AUTHORIZED",
            `The authenticated ProjectInquiry recovery principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
          );
        }
        const view =
          await options.projectInquirySaveAuthority.assessProjectInquirySaveRecovery(
            projectId,
            request,
            {
              actor: {
                actor_id: principal.actor.actor_id,
                actor_kind: "human",
              },
              capabilityGrantId: principal.capabilityGrantId,
            },
          );
        contracts.assertValid(
          "project-inquiry-save-recovery-view",
          "1.0.0",
          view,
        );
        if (
          view.project_id !== projectId ||
          view.subject.command_id !== request.command_id ||
          view.subject.idempotency_key !== request.idempotency_key
        ) {
          throw new Error(
            "The ProjectInquiry save recovery view crossed its exact request boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(view);
      } catch (error) {
        const invalid =
          error instanceof InteractionInputError ||
          error instanceof ContractRegistryError ||
          error instanceof SyntaxError ||
          (error instanceof FocusedGraphQueryError &&
            error.code === "FOCUSED_GRAPH_QUERY_INVALID");
        return jsonError(
          context,
          invalid
            ? 422
            : error instanceof ProjectInquirySaveError &&
                error.code === "PROJECT_INQUIRY_SAVE_NOT_AUTHORIZED"
              ? 403
              : error instanceof ProjectInquirySaveError &&
                  error.code === "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT"
                ? 503
                : 409,
          invalid
            ? "PROJECT_INQUIRY_SAVE_RECOVERY_REQUEST_INVALID"
            : error instanceof ProjectInquirySaveError
              ? error.code
              : "PROJECT_INQUIRY_SAVE_RECOVERY_FAILED",
          error instanceof Error
            ? error.message
            : "The ProjectInquiry save recovery assessment failed.",
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
      contracts.assertValid("project-work-view", view.schema_version, view);
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
        contracts.assertValid("project-work-view", view.schema_version, view);
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

  app.get(
    "/api/queries/projects/:projectId/worker-output-manifests/:workerOutputManifestId",
    async (context) => {
      if (options.projectWorkerOutputManifests === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_WORKER_OUTPUT_UNAVAILABLE",
          "The exact WorkerOutputManifest read boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const manifestId = context.req.param("workerOutputManifestId");
        const parameters = new URL(context.req.url).searchParams;
        const allowed = ["revision", "content_hash", "record_hash"];
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !WORKER_OUTPUT_MANIFEST_ID_PATTERN.test(manifestId) ||
          [...parameters.keys()].some(
            (key) =>
              !allowed.includes(key) || parameters.getAll(key).length !== 1,
          ) ||
          allowed.some((key) => parameters.get(key) === null)
        ) {
          throw new InteractionInputError(
            "An exact WorkerOutputManifest read requires one canonical Project, manifest, revision, content hash, and record hash.",
          );
        }
        const revision = Number(parameters.get("revision"));
        const contentHash = parameters.get("content_hash")!;
        const recordHash = parameters.get("record_hash")!;
        if (
          !Number.isSafeInteger(revision) ||
          revision < 1 ||
          !CONTENT_HASH_PATTERN.test(contentHash) ||
          !CONTENT_HASH_PATTERN.test(recordHash)
        ) {
          throw new InteractionInputError(
            "The exact WorkerOutputManifest revision or hashes are invalid.",
          );
        }
        const manifest =
          await options.projectWorkerOutputManifests.getProjectWorkerOutputManifest(
            projectId,
            manifestId,
            {
              revision,
              content_hash: contentHash,
              record_hash: recordHash,
            },
          );
        if (manifest === undefined) {
          return jsonError(
            context,
            404,
            "PROJECT_WORKER_OUTPUT_NOT_FOUND",
            "The exact WorkerOutputManifest is not retained in this Project.",
          );
        }
        contracts.assertValid("worker-output-manifest", "1.0.0", manifest);
        if (
          manifest.project_id !== projectId ||
          manifest.worker_output_manifest_id !== manifestId ||
          manifest.revision !== revision ||
          manifest.content_hash !== contentHash ||
          communicationHash(manifest) !== recordHash
        ) {
          throw new Error(
            "The WorkerOutputManifest reader returned a different exact record.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(manifest);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_WORKER_OUTPUT_TARGET_INVALID"
            : "PROJECT_WORKER_OUTPUT_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The exact WorkerOutputManifest is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/work/:workUnitId/operations",
    async (context) => {
      if (options.projectWorkOperations === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_WORK_OPERATIONS_UNAVAILABLE",
          "The composed Project Work operation assessment is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Project Work operation assessment does not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const workUnitId = context.req.param("workUnitId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !WORK_UNIT_ID_PATTERN.test(workUnitId)
        ) {
          throw new InteractionInputError(
            "Project Work operation assessment requires canonical Project and WorkUnit identities.",
          );
        }
        const view =
          await options.projectWorkOperations.getProjectWorkOperationsView(
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
        contracts.assertValid("project-work-operations-view", "1.0.0", view);
        const resumeAvailable = view.controls.some(
          (control) =>
            control.operation === "resume" && control.state === "available",
        );
        if (
          view.project_id !== projectId ||
          view.work_unit_ref.work_unit_id !== workUnitId ||
          resumeAvailable !== (view.resume_binding !== undefined) ||
          (view.resume_binding !== undefined &&
            (view.resume_binding.project_id !== projectId ||
              canonicalize(view.resume_binding.expected_work_unit_ref) !==
                canonicalize(view.work_unit_ref)))
        ) {
          throw new Error(
            "The Work operation assessment crossed its exact Project, WorkUnit, or checkpoint-resume boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(view);
      } catch (error) {
        return jsonError(
          context,
          error instanceof InteractionInputError ? 422 : 503,
          error instanceof InteractionInputError
            ? "PROJECT_WORK_OPERATIONS_QUERY_INVALID"
            : error instanceof ProjectWorkOperationError
              ? error.code
              : "PROJECT_WORK_OPERATIONS_READ_FAILED",
          error instanceof Error
            ? error.message
            : "The Project Work operation assessment is unavailable.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/work/:workUnitId/resume",
    async (context) => {
      if (
        options.projectWorkResumeAuthority === undefined ||
        options.commandPrincipalResolver === undefined
      ) {
        return jsonError(
          context,
          503,
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "The authenticated checkpoint-resume boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Project Work resume commands do not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const workUnitId = context.req.param("workUnitId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !WORK_UNIT_ID_PATTERN.test(workUnitId)
        ) {
          throw new InteractionInputError(
            "Checkpoint resume requires canonical Project and WorkUnit identities.",
          );
        }
        const body = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectWorkResumeRequest;
        contracts.assertValid("project-work-resume-request", "1.0.0", body);
        if (body.expected_work_unit_ref.work_unit_id !== workUnitId) {
          throw new InteractionInputError(
            "The resume route and expected WorkUnit must identify the same task.",
          );
        }
        const principal =
          await options.commandPrincipalResolver.resolveCommandPrincipal({
            projectId,
            commandName: "ManageProjectWork",
          });
        if (
          principal.state !== "resolved" ||
          principal.actor.actor_kind !== "human"
        ) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_NOT_AUTHORIZED",
            `The authenticated resume principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
          );
        }
        const receipt =
          await options.projectWorkResumeAuthority.executeProjectWorkResume(
            projectId,
            body,
            {
              actor: {
                actor_id: principal.actor.actor_id,
                actor_kind: "human",
              },
              capabilityGrantId: principal.capabilityGrantId,
            },
          );
        contracts.assertValid("project-work-resume-receipt", "1.0.0", receipt);
        if (
          receipt.project_id !== projectId ||
          receipt.command_id !== body.command_id ||
          receipt.idempotency_key !== body.idempotency_key ||
          receipt.requested_work_unit_ref.work_unit_id !== workUnitId ||
          canonicalize(receipt.checkpoint) !==
            canonicalize(body.expected_checkpoint)
        ) {
          throw new Error(
            "The checkpoint-resume receipt crossed its exact command boundary.",
          );
        }
        return context.json(receipt);
      } catch (error) {
        const invalid =
          error instanceof InteractionInputError ||
          error instanceof ContractRegistryError ||
          error instanceof SyntaxError;
        const status = invalid
          ? 422
          : error instanceof ProjectWorkOperationError
            ? error.code === "PROJECT_WORK_OPERATION_NOT_FOUND"
              ? 404
              : error.code === "PROJECT_WORK_OPERATION_NOT_AUTHORIZED"
                ? 403
                : error.code === "PROJECT_WORK_OPERATION_STALE" ||
                    error.code === "PROJECT_WORK_OPERATION_CONFLICT"
                  ? 409
                  : error.code === "PROJECT_WORK_OPERATION_UNAVAILABLE"
                    ? 422
                    : 503
            : 503;
        return jsonError(
          context,
          status,
          invalid
            ? "PROJECT_WORK_RESUME_REQUEST_INVALID"
            : error instanceof ProjectWorkOperationError
              ? error.code
              : "PROJECT_WORK_RESUME_FAILED",
          error instanceof Error
            ? error.message
            : "The checkpoint resume command failed.",
          error instanceof InteractionInputError ? error.issues : undefined,
        );
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/work/:workUnitId",
    async (context) => {
      if (
        options.projectWorkOperationAuthority === undefined ||
        options.commandPrincipalResolver === undefined
      ) {
        return jsonError(
          context,
          503,
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "The authenticated Project Work command boundary is not configured.",
        );
      }
      try {
        const parameters = new URL(context.req.url).searchParams;
        if ([...parameters.keys()].length > 0) {
          throw new InteractionInputError(
            "Project Work commands do not accept query parameters.",
            [...new Set(parameters.keys())],
          );
        }
        const projectId = context.req.param("projectId");
        const workUnitId = context.req.param("workUnitId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !WORK_UNIT_ID_PATTERN.test(workUnitId)
        ) {
          throw new InteractionInputError(
            "Project Work commands require canonical Project and WorkUnit identities.",
          );
        }
        const body = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectWorkOperationRequest;
        contracts.assertValid("project-work-operation-request", "1.0.0", body);
        if (body.expected_work_unit_ref.work_unit_id !== workUnitId) {
          throw new InteractionInputError(
            "The Work command route and expected WorkUnit must identify the same task.",
          );
        }
        const principal =
          await options.commandPrincipalResolver.resolveCommandPrincipal({
            projectId,
            commandName: "ManageProjectWork",
          });
        if (
          principal.state !== "resolved" ||
          principal.actor.actor_kind !== "human"
        ) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_NOT_AUTHORIZED",
            `The authenticated Work command principal was denied: ${principal.state === "resolved" ? "actor_not_human" : principal.reason}.`,
          );
        }
        const receipt =
          await options.projectWorkOperationAuthority.executeProjectWorkOperation(
            projectId,
            body,
            {
              actor: {
                actor_id: principal.actor.actor_id,
                actor_kind: "human",
              },
              capabilityGrantId: principal.capabilityGrantId,
            },
          );
        contracts.assertValid(
          "project-work-operation-receipt",
          "1.0.0",
          receipt,
        );
        if (
          receipt.project_id !== projectId ||
          receipt.command_id !== body.command_id ||
          receipt.idempotency_key !== body.idempotency_key ||
          receipt.operation !== body.operation ||
          receipt.requested_work_unit_ref.work_unit_id !== workUnitId
        ) {
          throw new Error(
            "The Work operation receipt crossed its exact command boundary.",
          );
        }
        return context.json(receipt);
      } catch (error) {
        const invalid =
          error instanceof InteractionInputError ||
          error instanceof ContractRegistryError ||
          error instanceof SyntaxError;
        const status = invalid
          ? 422
          : error instanceof ProjectWorkOperationError
            ? error.code === "PROJECT_WORK_OPERATION_NOT_FOUND"
              ? 404
              : error.code === "PROJECT_WORK_OPERATION_NOT_AUTHORIZED"
                ? 403
                : error.code === "PROJECT_WORK_OPERATION_STALE" ||
                    error.code === "PROJECT_WORK_OPERATION_CONFLICT"
                  ? 409
                  : error.code === "PROJECT_WORK_OPERATION_UNAVAILABLE"
                    ? 422
                    : 503
            : 503;
        return jsonError(
          context,
          status,
          invalid
            ? "PROJECT_WORK_OPERATION_REQUEST_INVALID"
            : error instanceof ProjectWorkOperationError
              ? error.code
              : "PROJECT_WORK_OPERATION_FAILED",
          error instanceof Error
            ? error.message
            : "The Project Work command failed.",
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
    "/api/queries/projects/:projectId/sources/:projectSourceId/link-removal",
    async (context) => {
      if (options.projectSourceLinkRemovalPreviews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LINK_REMOVAL_PREVIEW_UNAVAILABLE",
          "The authenticated Project source link-removal preview is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Project source link-removal preview requires canonical route identities and accepts no query parameters.",
          );
        }
        await sourceLinkRemovalPrincipal(projectId);
        const preview =
          await options.projectSourceLinkRemovalPreviews.getProjectSourceLinkRemovalPreview(
            projectId,
            projectSourceId,
          );
        if (preview === undefined) {
          throw new ProjectSourceLinkRemovalError(
            "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_NOT_FOUND",
            "The requested active ProjectSource is not retained in this Project.",
          );
        }
        contracts.assertValid(
          "project-source-link-removal-preview",
          "1.0.0",
          preview,
        );
        if (
          preview.project_id !== projectId ||
          preview.project_source_id !== projectSourceId ||
          preview.expected.project_ref.project_id !== projectId ||
          preview.expected.current_source_ref.project_source_id !==
            projectSourceId ||
          preview.operation.command_name !== "ExcludeProjectSource"
        ) {
          throw new Error(
            "The link-removal preview crossed its exact Project, source, or command boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(preview);
      } catch (error) {
        return projectSourceLinkRemovalResponse(context, error);
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/sources/:projectSourceId/link-removal",
    async (context) => {
      if (options.projectSourceLinkRemovals === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LINK_REMOVAL_UNAVAILABLE",
          "The authenticated Project source link-removal command is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Project source link-removal requires canonical route identities and accepts no query parameters.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceLinkRemovalRequest;
        contracts.assertValid(
          "project-source-link-removal-request",
          "1.0.0",
          request,
        );
        if (
          request.expected.project_ref.project_id !== projectId ||
          request.expected.current_source_ref.project_source_id !==
            projectSourceId
        ) {
          throw new ProjectSourceLinkRemovalError(
            "PROJECT_SOURCE_LINK_REMOVAL_PROJECT_STALE",
            "The command route must match the exact previewed Project and ProjectSource.",
          );
        }
        const result =
          await options.projectSourceLinkRemovals.executeProjectSourceLinkRemoval(
            projectId,
            projectSourceId,
            request,
            await sourceLinkRemovalPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-link-removal-receipt",
          "1.0.0",
          result.receipt,
        );
        contracts.assertValid("project-source", "1.0.0", result.projectSource);
        if (
          result.receipt.project_id !== projectId ||
          result.receipt.command_id !== request.command_id ||
          result.receipt.idempotency_key !== request.idempotency_key ||
          result.receipt.prior_source_ref.project_source_id !==
            projectSourceId ||
          result.receipt.resulting_source_ref.project_source_id !==
            projectSourceId ||
          result.receipt.resulting_source_ref.revision !==
            result.projectSource.revision ||
          result.receipt.resulting_source_ref.content_hash !==
            result.projectSource.content_hash ||
          result.projectSource.content.status !== "excluded" ||
          result.receipt.effect.local_copy_deleted !== false
        ) {
          throw new Error(
            "The link-removal authority returned a different command, source, retention effect, or result.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(result, result.applied ? 201 : 200);
      } catch (error) {
        return projectSourceLinkRemovalResponse(context, error);
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/sources/:projectSourceId/link-removal-recovery",
    async (context) => {
      if (options.projectSourceLinkRemovals === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LINK_REMOVAL_RECOVERY_UNAVAILABLE",
          "The Project source link-removal recovery boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Project source link-removal recovery requires canonical route identities and accepts no query parameters.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceLinkRemovalRequest;
        contracts.assertValid(
          "project-source-link-removal-request",
          "1.0.0",
          request,
        );
        const assessment =
          await options.projectSourceLinkRemovals.assessProjectSourceLinkRemovalRecovery(
            projectId,
            projectSourceId,
            request,
            await sourceLinkRemovalPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-link-removal-recovery-view",
          "1.0.0",
          assessment,
        );
        if (
          assessment.project_id !== projectId ||
          assessment.project_source_id !== projectSourceId ||
          assessment.subject.command_id !== request.command_id ||
          assessment.subject.idempotency_key !== request.idempotency_key ||
          assessment.return.destination.project_id !== projectId
        ) {
          throw new Error(
            "The link-removal recovery assessment crossed its exact command, source, or return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(assessment);
      } catch (error) {
        return projectSourceLinkRemovalResponse(context, error);
      }
    },
  );

  app.get(
    "/api/queries/projects/:projectId/sources/:projectSourceId/local-copy-deletion",
    async (context) => {
      if (options.projectSourceLocalCopyDeletionPreviews === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_PREVIEW_UNAVAILABLE",
          "The authenticated local-copy deletion preview is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Local-copy deletion preview requires canonical route identities and accepts no query parameters.",
          );
        }
        await sourceLocalCopyDeletionPrincipal(projectId);
        const preview =
          await options.projectSourceLocalCopyDeletionPreviews.getProjectSourceLocalCopyDeletionPreview(
            projectId,
            projectSourceId,
          );
        if (preview === undefined) {
          throw new ProjectSourceLocalCopyDeletionError(
            "PROJECT_SOURCE_LOCAL_COPY_DELETION_SOURCE_NOT_FOUND",
            "The requested ProjectSource is not retained in this Project.",
          );
        }
        contracts.assertValid(
          "project-source-local-copy-deletion-preview",
          "1.0.0",
          preview,
        );
        if (
          preview.project_id !== projectId ||
          preview.project_source_id !== projectSourceId ||
          preview.expected.project_ref.project_id !== projectId ||
          preview.expected.current_source_ref.project_source_id !==
            projectSourceId ||
          preview.operation.command_name !== "DeleteLocalSourceCopy"
        ) {
          throw new Error(
            "The local-copy deletion preview crossed its exact Project, source, copy, or command boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(preview);
      } catch (error) {
        return projectSourceLocalCopyDeletionResponse(context, error);
      }
    },
  );

  app.post(
    "/api/commands/projects/:projectId/sources/:projectSourceId/local-copy-deletion",
    async (context) => {
      if (options.projectSourceLocalCopyDeletions === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_UNAVAILABLE",
          "The authenticated local-copy deletion command is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Local-copy deletion requires canonical route identities and accepts no query parameters.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceLocalCopyDeletionRequest;
        contracts.assertValid(
          "project-source-local-copy-deletion-request",
          "1.0.0",
          request,
        );
        if (
          request.expected.project_ref.project_id !== projectId ||
          request.expected.current_source_ref.project_source_id !==
            projectSourceId
        ) {
          throw new ProjectSourceLocalCopyDeletionError(
            "PROJECT_SOURCE_LOCAL_COPY_DELETION_PROJECT_STALE",
            "The command route must match the exact previewed Project and ProjectSource.",
          );
        }
        const result =
          await options.projectSourceLocalCopyDeletions.executeProjectSourceLocalCopyDeletion(
            projectId,
            projectSourceId,
            request,
            await sourceLocalCopyDeletionPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-local-copy-deletion-receipt",
          "1.0.0",
          result.receipt,
        );
        if (
          result.receipt.project_id !== projectId ||
          result.receipt.source_ref.project_source_id !== projectSourceId ||
          result.receipt.command_id !== request.command_id ||
          result.receipt.idempotency_key !== request.idempotency_key ||
          result.receipt.copy_ref.artifact_manifest_id !==
            request.expected.copy_ref.artifact_manifest_id ||
          result.receipt.effect.local_copy_state !== "absent" ||
          result.receipt.preservation.project_link !== "retained"
        ) {
          throw new Error(
            "The local-copy deletion authority returned a different command, source, copy, or preservation effect.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(result, result.applied ? 201 : 200);
      } catch (error) {
        return projectSourceLocalCopyDeletionResponse(context, error);
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/sources/:projectSourceId/local-copy-deletion-recovery",
    async (context) => {
      if (options.projectSourceLocalCopyDeletions === undefined) {
        return jsonError(
          context,
          503,
          "PROJECT_SOURCE_LOCAL_COPY_DELETION_RECOVERY_UNAVAILABLE",
          "The local-copy deletion recovery boundary is not configured.",
        );
      }
      try {
        const projectId = context.req.param("projectId");
        const projectSourceId = context.req.param("projectSourceId");
        if (
          !PROJECT_ID_PATTERN.test(projectId) ||
          !PROJECT_SOURCE_ID_PATTERN.test(projectSourceId) ||
          new URL(context.req.url).searchParams.size !== 0
        ) {
          throw new InteractionInputError(
            "Local-copy deletion recovery requires canonical route identities and accepts no query parameters.",
          );
        }
        const request = (await readBoundedJson(
          context,
          maxBodyBytes,
        )) as PetraProjectSourceLocalCopyDeletionRequest;
        contracts.assertValid(
          "project-source-local-copy-deletion-request",
          "1.0.0",
          request,
        );
        const assessment =
          await options.projectSourceLocalCopyDeletions.assessProjectSourceLocalCopyDeletionRecovery(
            projectId,
            projectSourceId,
            request,
            await sourceLocalCopyDeletionPrincipal(projectId),
          );
        contracts.assertValid(
          "project-source-local-copy-deletion-recovery-view",
          "1.0.0",
          assessment,
        );
        if (
          assessment.project_id !== projectId ||
          assessment.project_source_id !== projectSourceId ||
          assessment.subject.command_id !== request.command_id ||
          assessment.subject.idempotency_key !== request.idempotency_key ||
          assessment.return.destination.project_id !== projectId
        ) {
          throw new Error(
            "The local-copy deletion recovery assessment crossed its exact command, source, or return boundary.",
          );
        }
        context.header("Cache-Control", "no-store");
        return context.json(assessment);
      } catch (error) {
        return projectSourceLocalCopyDeletionResponse(context, error);
      }
    },
  );

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

  app.post(
    "/api/queries/projects/:projectId/focused-graph",
    async (context) => {
      if (options.focusedGraphViews === undefined) {
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_UNAVAILABLE",
          "The authenticated focused graph query boundary is not configured.",
        );
      }
      try {
        const request = parseFocusedGraphViewRequest(
          await readBoundedJson(context, maxBodyBytes),
        );
        const projectId = context.req.param("projectId");
        const view = await options.focusedGraphViews.queryFocusedGraph(
          projectId,
          request,
        );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "FOCUSED_GRAPH_NOT_FOUND",
            "The exact Project has no focused graph result.",
          );
        }
        if (view.project_id !== projectId) {
          throw new FocusedGraphQueryError(
            "FOCUSED_GRAPH_PROJECTION_INCOHERENT",
            "The focused graph query crossed its exact Project boundary.",
          );
        }
        if (
          view.schema_version !== "1.0.0" &&
          view.schema_version !== "1.1.0"
        ) {
          throw new FocusedGraphQueryError(
            "FOCUSED_GRAPH_PROJECTION_INCOHERENT",
            "The focused graph query returned an unsupported contract version.",
          );
        }
        contracts.assertValid("focused-graph-view", view.schema_version, view);
        return context.json(view);
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            error.issues?.includes("body_too_large") === true ? 413 : 422,
            "FOCUSED_GRAPH_QUERY_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof FocusedGraphQueryError) {
          const status =
            error.code === "FOCUSED_GRAPH_PROJECT_NOT_FOUND" ||
            error.code === "FOCUSED_GRAPH_FOCUS_NOT_FOUND"
              ? 404
              : error.code === "FOCUSED_GRAPH_DEFINITION_STALE" ||
                  error.code === "FOCUSED_GRAPH_SNAPSHOT_STALE"
                ? 409
                : error.code === "FOCUSED_GRAPH_QUERY_INVALID" ||
                    error.code === "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED"
                  ? 422
                  : 503;
          return jsonError(context, status, error.code, error.message);
        }
        if (error instanceof FocusedGraphViewContractError) {
          return jsonError(context, 422, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_QUERY_FAILED",
          error instanceof Error
            ? error.message
            : "The focused graph query failed.",
        );
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/focused-graph/action-preview",
    async (context) => {
      if (options.focusedGraphActionPreviewViews === undefined) {
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_ACTION_PREVIEW_UNAVAILABLE",
          "The exact governed correction and new-Work preview boundary is not configured.",
        );
      }
      try {
        const request = parseFocusedGraphActionPreviewViewRequest(
          await readBoundedJson(context, maxBodyBytes),
        );
        const projectId = context.req.param("projectId");
        const view =
          await options.focusedGraphActionPreviewViews.queryFocusedGraphActionPreview(
            projectId,
            request,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "FOCUSED_GRAPH_ACTION_PREVIEW_NOT_FOUND",
            "The exact Project, graph selection, Review binding, or SuggestedAction preview is unavailable.",
          );
        }
        if (view.project_id !== projectId) {
          throw new FocusedGraphActionPreviewQueryError(
            "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE",
            "The focused graph action preview crossed its exact Project boundary.",
          );
        }
        contracts.assertValid(
          "focused-graph-action-preview-view",
          "1.0.0",
          view,
        );
        return context.json(view);
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            error.issues?.includes("body_too_large") === true ? 413 : 422,
            "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof FocusedGraphActionPreviewQueryError) {
          const status =
            error.code === "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_INVALID"
              ? 422
              : error.code === "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_NOT_FOUND"
                ? 404
                : error.code ===
                    "FOCUSED_GRAPH_ACTION_PREVIEW_SOURCE_INCOMPATIBLE"
                  ? 409
                  : 503;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_ACTION_PREVIEW_QUERY_FAILED",
          error instanceof Error
            ? error.message
            : "The focused graph action preview is unavailable.",
        );
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/focused-graph/analysis",
    async (context) => {
      if (options.focusedGraphAnalysisViews === undefined) {
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_ANALYSIS_UNAVAILABLE",
          "The exact focused graph comparison, impact, and time boundary is not configured.",
        );
      }
      try {
        const request = parseFocusedGraphAnalysisViewRequest(
          await readBoundedJson(context, maxBodyBytes),
        );
        const projectId = context.req.param("projectId");
        const view =
          await options.focusedGraphAnalysisViews.queryFocusedGraphAnalysis(
            projectId,
            request,
          );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "FOCUSED_GRAPH_ANALYSIS_NOT_FOUND",
            "An exact Project, graph position, History event, or Review binding is unavailable.",
          );
        }
        if (view.project_id !== projectId) {
          throw new FocusedGraphAnalysisQueryError(
            "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
            "The focused graph analysis crossed its exact Project boundary.",
          );
        }
        contracts.assertValid("focused-graph-analysis-view", "1.0.0", view);
        return context.json(view);
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            error.issues?.includes("body_too_large") === true ? 413 : 422,
            "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof FocusedGraphAnalysisQueryError) {
          const status =
            error.code === "FOCUSED_GRAPH_ANALYSIS_QUERY_INVALID"
              ? 422
              : error.code === "FOCUSED_GRAPH_ANALYSIS_SOURCE_NOT_FOUND"
                ? 404
                : error.code === "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE"
                  ? 409
                  : 503;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_ANALYSIS_QUERY_FAILED",
          error instanceof Error
            ? error.message
            : "The focused graph analysis is unavailable.",
        );
      }
    },
  );

  app.post(
    "/api/queries/projects/:projectId/focused-graph/details",
    async (context) => {
      if (options.focusedGraphViews?.queryFocusedGraphDetails === undefined) {
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_DETAILS_UNAVAILABLE",
          "The exact focused graph Details boundary is not configured.",
        );
      }
      try {
        const request = parseFocusedGraphDetailsViewRequest(
          await readBoundedJson(context, maxBodyBytes),
        );
        const projectId = context.req.param("projectId");
        const view = await options.focusedGraphViews.queryFocusedGraphDetails(
          projectId,
          request,
        );
        if (view === undefined) {
          return jsonError(
            context,
            404,
            "FOCUSED_GRAPH_DETAILS_NOT_FOUND",
            "The exact Project or selected focused graph Details are unavailable.",
          );
        }
        if (view.project_id !== projectId) {
          throw new FocusedGraphQueryError(
            "FOCUSED_GRAPH_PROJECTION_INCOHERENT",
            "The focused graph Details query crossed its exact Project boundary.",
          );
        }
        contracts.assertValid("focused-graph-details-view", "1.0.0", view);
        return context.json(view);
      } catch (error) {
        if (error instanceof InteractionInputError) {
          return jsonError(
            context,
            error.issues?.includes("body_too_large") === true ? 413 : 422,
            "FOCUSED_GRAPH_DETAILS_QUERY_INVALID",
            error.message,
            error.issues,
          );
        }
        if (error instanceof FocusedGraphQueryError) {
          const status =
            error.code === "FOCUSED_GRAPH_PROJECT_NOT_FOUND" ||
            error.code === "FOCUSED_GRAPH_FOCUS_NOT_FOUND"
              ? 404
              : error.code === "FOCUSED_GRAPH_DEFINITION_STALE" ||
                  error.code === "FOCUSED_GRAPH_SNAPSHOT_STALE"
                ? 409
                : error.code === "FOCUSED_GRAPH_QUERY_INVALID" ||
                    error.code === "FOCUSED_GRAPH_SEMANTIC_UNSUPPORTED"
                  ? 422
                  : 503;
          return jsonError(context, status, error.code, error.message);
        }
        return jsonError(
          context,
          503,
          "FOCUSED_GRAPH_DETAILS_QUERY_FAILED",
          error instanceof Error
            ? error.message
            : "The focused graph Details query failed.",
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

  app.get("/api/queries/interactions/:runId", async (context) => {
    try {
      const runId = context.req.param("runId");
      try {
        return context.json(runtime.snapshot(runId));
      } catch {
        const threadId = context.req.query("thread");
        if (threadId === undefined || !ID_PATTERN.test(threadId)) {
          throw new InteractionInputError(
            "A valid thread query parameter is required to restore a durable interaction.",
          );
        }
        const restored = await runtime.restoreInteraction(threadId, runId);
        if (restored === undefined)
          throw new Error(`Unknown interaction run: ${runId}`);
        return context.json(restored);
      }
    } catch (error: unknown) {
      return jsonError(
        context,
        error instanceof InteractionInputError ? 422 : 404,
        error instanceof InteractionInputError
          ? "INVALID_RECONNECT_REQUEST"
          : "RUN_NOT_FOUND",
        error instanceof Error ? error.message : "Interaction run not found.",
      );
    }
  });

  app.post("/api/commands/reviews/resolve", async (context) => {
    try {
      const body = await readBoundedJson(context, maxBodyBytes);
      const response = parseAgUiReviewResponse(body);
      let reviewAuthority = options.reviewAuthority;
      if (options.commandPrincipalResolver !== undefined) {
        const directAuthority =
          response.decision === "accept"
            ? await resolveApplyAuthority(response.project_id)
            : await resolveRejectAuthority(response.project_id);
        const grants = Object.values(directAuthority.capability_grants);
        if (
          new Set(grants).size !== 1 ||
          directAuthority.authorization_basis.actor.actor_kind !== "human"
        ) {
          throw new DurableReviewInterruptError(
            "REVIEW_INTERRUPT_UNAUTHORIZED",
            "The durable InteractionRun requires one exact authenticated human grant for the direct Review command sequence.",
          );
        }
        reviewAuthority = {
          actor: {
            actor_id: directAuthority.authorization_basis.actor.actor_id,
            actor_kind: "human",
          },
          capability_grant_id: grants[0]!,
        };
      }
      if (reviewAuthority === undefined) {
        return jsonError(
          context,
          503,
          "REVIEW_BOUNDARY_UNAVAILABLE",
          "No authenticated durable review authority is configured.",
        );
      }
      return context.json(
        options.reviewBoundary === undefined
          ? await runtime.resolveReview(response, reviewAuthority)
          : await options.reviewBoundary.resolveReview(
              response,
              reviewAuthority,
            ),
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
      if (
        parsed.request.workflow === "grounded_synthesis" &&
        options.projectModelReadiness !== undefined
      ) {
        if (parsed.modelContext === undefined) {
          throw new InteractionInputError(
            "The production grounded-synthesis command requires the exact Project model context returned by readiness.",
          );
        }
        await options.projectModelReadiness.authorizeProjectModelInteraction({
          project_id: parsed.modelContext.project_id,
          prompt: parsed.request.prompt,
          request_context: parsed.modelContext,
        });
      }
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
      const status =
        error instanceof InteractionInputError
          ? 422
          : error instanceof ProjectModelReadinessError
            ? error.code === "PROJECT_MODEL_INTERACTION_UNAVAILABLE"
              ? 503
              : 409
            : 409;
      return jsonError(
        context,
        status,
        error instanceof ProjectModelReadinessError
          ? error.code
          : "INTERACTION_REJECTED",
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
