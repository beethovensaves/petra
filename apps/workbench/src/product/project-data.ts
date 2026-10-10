import { readProjectBrief } from "./brief-read.js";
import { ProjectSemanticGraphClient } from "@petra/adapters";
import type { PetraProjectSemanticGraphView } from "@petra/contracts";
import {
  FocusedGraphClient,
  FocusedGraphClientError,
  ProjectBriefClientError,
  ProjectDefinitionDraftClient,
  ProjectModelClient,
  ProjectProfileClient,
  ProjectSourceDiscoveryClient,
  ProjectWorkClient,
} from "@petra/adapters";
import {
  PetraInteractionClient,
  type PetraInteractionResult,
} from "@petra/adapters/ag-ui";
import type {
  CommunicationPlanClient,
  ReviewCandidateBasisRevisionRequest,
  ReviewCandidateBasisRevisionResult,
  ReviewCandidateCorrectionFromHumanEditRequest,
  ReviewCandidateCorrectionResult,
  ReviewSessionSeparationRequest,
  ReviewSessionSeparationResult,
} from "@petra/adapters";
import type {
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationExecutionView,
  PetraProjectHistoryCompensationPlanRequest,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryCompensationPreviewView,
  CommandProjectSourceReplacementRef,
  PetraProjectSource,
  PetraProjectEffectiveControlsView,
  PetraProjectHistoryView,
  PetraProjectBriefReadView,
  PetraProjectHistoryEpisodeViewV12,
  PetraProjectHistoryImpactViewV14,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedContinuationFailure,
  PetraProjectHistoryRetainedViewV12,
  PetraCommunicationPlan,
  PetraProjectInquiryView,
  PetraProjectModelReadinessView,
  PetraProjectObjectLocationView,
  PetraProjectDefinition,
  PetraProjectDefinitionDraftCommandReceipt,
  PetraProjectDefinitionDraftCommandRequest,
  ProjectDefinitionDraftInitialMaterial,
  PetraProjectDefinitionDraftRequest,
  PetraProjectDefinitionDraftView,
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
  PetraProjectRelationshipOverlayView,
  PetraProjectRelationshipView,
  PetraProjectReviewViewRecord,
  PetraProjectShellCollectionView,
  PetraReviewSessionRefreshReceipt,
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRecord,
  PetraReviewSessionApplyRequest,
  PetraReviewSessionRejectRequest,
  PetraReviewSessionV110,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectShellViewV12,
  PetraProjectShellViewV13,
  PetraSuggestedActionView,
  PetraProjectSourceView,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceReplacementRetraction,
  PetraProjectSourceRevisionRequest,
  PetraSuggestedActionInvocationRequest,
  PetraSuggestedActionInvocationView,
  PetraSuggestedActionViewV11,
  RegisteredProjectThreadView as PetraProjectThreadView,
  PetraProjectWorkReadView,
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkResumeRequest,
  PetraProjectWorkStartAgainReceipt,
  PetraProjectWorkStartAgainRequest,
  RegisteredWorkerOutputManifest as PetraWorkerOutputManifest,
  FocusedGraphProjectSnapshotRef,
  ProjectDefinitionTerm,
  CommandReviewSessionRef,
  ProjectSourceLifecycleExactSourceRef,
  ProjectSourceReplacementActiveSourceRef,
  ProjectSourceReplacementContent,
  ProjectSourceReplacementExcludedSourceRef,
  ProjectSourceReplacementExclusionReceiptRef,
  ProjectHistoryRetainedCollectionFiltersV12,
  ProjectHistoryRetainedExactTargetFilterV12,
  ProjectHistoryRetainedContinuationFailureSubcode,
  ProjectHistoryRetainedContinuationRestart,
  ProjectWorkDetailContent,
  ProjectWorkDetailContentV11,
  ProjectWorkTaskSummary,
  ProjectWorkTaskSummaryV11,
} from "@petra/contracts";
import type {
  FocusedGraphAnalysisViewRequest,
  FocusedGraphReadRequest,
  ProjectShellCollectionRequest,
} from "@petra/core";
import { parseFocusedGraphViewRequest } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { redirect, type LoaderFunctionArgs } from "react-router";

import {
  createFocusedGraphRequestId,
  focusedGraphEntryFromSearch,
  type FocusedGraphEntry,
  type FocusedGraphRouteData,
} from "./focused-graph-entry.js";
import {
  projectObjectiveCanonicalHash,
  type ProjectObjectiveCommandContext,
} from "./project-objective-command.js";
import type { SourceRegistrationContext } from "./source-registration.js";
import type { SourceRevisionContext } from "./source-revision.js";

import type {
  AttentionItem,
  GraphQuestion,
  InquiryBranch,
  ProjectProfile,
  ProjectRecord,
  PetraThread,
  ReviewSession,
  ReviewSessionMember,
  SourceRecord,
  WorkExecutionState,
  WorkProjectView,
  WorkUnit,
} from "./model.js";
import { expectedProjectWorkDestinationFromSearch } from "./project-work-destination.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const API_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;
const COMMAND_ID = /^command_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORK_UNIT_ID = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORK_UNIT_CANCELLATION_ID =
  /^work_unit_cancellation_[0-9A-HJKMNP-TV-Z]{26}$/u;
const INTERACTION_CONNECTION_ID =
  /^interaction_connection_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;
const GROUNDED_RESPONSE_ID = /^grounded_response_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HISTORY_CONTINUATION_FAILURE_MESSAGE =
  "This Full History traversal can no longer continue from its verified snapshot. Start again with the same filters.";

export class ProjectDataError extends Error {
  readonly status: number;
  readonly code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID" | undefined;
  readonly subcode:
    ProjectHistoryRetainedContinuationFailureSubcode | undefined;
  readonly restart: ProjectHistoryRetainedContinuationRestart | undefined;
  readonly suggestedActionRegeneration: PetraSuggestedActionViewV11 | undefined;

  constructor(
    message: string,
    status: number,
    continuationFailure?: PetraProjectHistoryRetainedContinuationFailure,
    suggestedActionRegeneration?: PetraSuggestedActionViewV11,
  ) {
    super(message);
    this.name = "ProjectDataError";
    this.status = status;
    this.code = continuationFailure?.error.code;
    this.subcode = continuationFailure?.error.subcode;
    this.restart =
      continuationFailure === undefined
        ? undefined
        : { ...continuationFailure.error.restart };
    this.suggestedActionRegeneration = suggestedActionRegeneration;
  }
}

const apiToken = (): string => {
  if (typeof window === "undefined") return DEVELOPMENT_TOKEN;
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN;
};

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

const projectSourceDiscoveryClient = (): ProjectSourceDiscoveryClient =>
  new ProjectSourceDiscoveryClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    fetch: (input, init) => fetch(input, init),
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index])
  );
};

const retainedHistoryContinuationFailure = (
  value: unknown,
): PetraProjectHistoryRetainedContinuationFailure | undefined => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schema_name",
      "schema_version",
      "error",
      "requestId",
      "traceId",
    ]) ||
    value.schema_name !==
      "petra.project-history-retained-continuation-failure" ||
    value.schema_version !== "1.0.0" ||
    typeof value.requestId !== "string" ||
    !API_REQUEST_ID.test(value.requestId) ||
    typeof value.traceId !== "string" ||
    !API_REQUEST_ID.test(value.traceId) ||
    !isRecord(value.error) ||
    !hasExactKeys(value.error, ["code", "subcode", "message", "restart"]) ||
    value.error.code !== "PROJECT_HISTORY_RETAINED_QUERY_INVALID" ||
    (value.error.subcode !== "CURSOR_INVALID" &&
      value.error.subcode !== "CURSOR_BINDING_MISMATCH" &&
      value.error.subcode !== "SNAPSHOT_UNAVAILABLE") ||
    value.error.message !== HISTORY_CONTINUATION_FAILURE_MESSAGE ||
    !isRecord(value.error.restart) ||
    !hasExactKeys(value.error.restart, [
      "cursor_disposition",
      "request_kind",
    ]) ||
    value.error.restart.cursor_disposition !==
      "discard_without_client_decoding" ||
    value.error.restart.request_kind !==
      "cursorless_same_project_limit_and_filters"
  ) {
    return undefined;
  }
  return value as unknown as PetraProjectHistoryRetainedContinuationFailure;
};

const toUnknownArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value.map((entry: unknown): unknown => entry) : [];

const sameHistoryTargetRef = (
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): boolean =>
  left.role === right.role &&
  left.semantic_key === right.semantic_key &&
  left.object_id === right.object_id &&
  left.revision === right.revision &&
  left.content_hash === right.content_hash &&
  left.record_hash === right.record_hash &&
  left.authority_state === right.authority_state;

const registeredHistorySemanticKey = (value: unknown): boolean =>
  value === "petra.change-set" ||
  value === "petra.approval" ||
  value === "scientific.claim" ||
  value === "scientific.assertion" ||
  value === "petra.project-source" ||
  value === "petra.project-source-replacement";

const HISTORY_SEMANTIC_REGISTRY = [
  [
    "change_control",
    "immutable_change_control_target_bindings",
    [
      "petra.change-set",
      "petra.approval",
      "scientific.claim",
      "scientific.assertion",
    ],
  ],
  [
    "review_membership",
    "immutable_review_candidate_bindings",
    ["scientific.claim", "scientific.assertion"],
  ],
  [
    "grounded_response_dependency",
    "immutable_grounded_response_dependencies",
    ["scientific.claim", "scientific.assertion"],
  ],
  [
    "composition_lineage",
    "immutable_composition_target_bindings",
    ["scientific.claim", "scientific.assertion"],
  ],
  [
    "project_source_lifecycle",
    "immutable_project_source_lifecycle_receipts",
    ["petra.project-source"],
  ],
  [
    "project_source_dependency",
    "immutable_project_source_dependency_bindings",
    ["petra.project-source"],
  ],
  [
    "project_source_replacement_lineage",
    "immutable_project_source_replacement_bindings",
    ["petra.project-source", "petra.project-source-replacement"],
  ],
  [
    "project_source_replacement_receipt",
    "immutable_project_source_replacement_receipts",
    ["petra.project-source-replacement"],
  ],
  [
    "project_source_effective_head",
    "current_project_source_replacement_heads",
    ["petra.project-source", "petra.project-source-replacement"],
  ],
] as const;

const historySemanticRegistryIsExact = (value: unknown[]): boolean =>
  value.every((entry, index) => {
    const expected = HISTORY_SEMANTIC_REGISTRY[index];
    return (
      expected !== undefined &&
      isRecord(entry) &&
      entry.adapter_kind === expected[0] &&
      entry.authority_source === expected[1] &&
      Array.isArray(entry.semantic_keys) &&
      entry.semantic_keys.length === expected[2].length &&
      entry.semantic_keys.every(
        (semanticKey, semanticIndex) =>
          semanticKey === expected[2][semanticIndex],
      )
    );
  });

const historySemanticGroupIsValid = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    typeof value.adapter_kind !== "string" ||
    typeof value.authority_source !== "string" ||
    value.relation_scope !== "exact_target_revision" ||
    typeof value.total_count !== "number" ||
    !Number.isSafeInteger(value.total_count) ||
    value.total_count < 0 ||
    typeof value.returned_count !== "number" ||
    !Number.isSafeInteger(value.returned_count) ||
    value.returned_count < 0 ||
    !Array.isArray(value.refs) ||
    value.refs.length > 25 ||
    value.returned_count !== value.refs.length ||
    value.coverage !==
      (value.total_count > value.returned_count ? "truncated" : "complete")
  ) {
    return false;
  }
  const registration = HISTORY_SEMANTIC_REGISTRY.find(
    ([adapterKind]) => adapterKind === value.adapter_kind,
  );
  if (registration?.[1] !== value.authority_source) return false;
  return value.refs.every((ref) => {
    if (!isRecord(ref)) return false;
    if (value.adapter_kind === "project_source_replacement_lineage") {
      return (
        ref.posture === "immutable_revision" &&
        (ref.relation === "retains_exact_replaced_source" ||
          ref.relation === "retains_exact_replacement_source" ||
          ref.relation === "retracts_exact_source_replacement")
      );
    }
    if (value.adapter_kind === "project_source_effective_head") {
      return (
        ref.semantic_key === "petra.project-source-replacement" &&
        ref.posture === "current" &&
        (ref.relation === "is_current_active_replacement_head" ||
          ref.relation === "is_current_retracted_replacement_head")
      );
    }
    return true;
  });
};

const expectedHistorySemanticGroups = (semanticKey: unknown): string[] => {
  if (semanticKey === "petra.change-set" || semanticKey === "petra.approval") {
    return ["change_control"];
  }
  if (
    semanticKey === "scientific.claim" ||
    semanticKey === "scientific.assertion"
  ) {
    return [
      "change_control",
      "review_membership",
      "grounded_response_dependency",
      "composition_lineage",
    ];
  }
  if (semanticKey === "petra.project-source") {
    return [
      "project_source_lifecycle",
      "project_source_dependency",
      "project_source_replacement_lineage",
      "project_source_effective_head",
    ];
  }
  if (semanticKey === "petra.project-source-replacement") {
    return [
      "project_source_replacement_lineage",
      "project_source_replacement_receipt",
      "project_source_effective_head",
    ];
  }
  return [];
};

const HISTORY_OPERATIONAL_REGISTRY = [
  [
    "work_input_binding",
    "current_work_heads_with_immutable_input_bindings",
    "petra.work-unit",
    "uses_exact_history_target_as_work_input",
    "current",
  ],
  [
    "work_output",
    "immutable_worker_output_manifests_for_bound_work",
    "petra.worker-output-manifest",
    "reports_output_for_work_using_exact_history_target",
    "immutable_revision",
  ],
  [
    "interaction_delivery",
    "immutable_interaction_replay_records_for_bound_work",
    "petra.interaction-replay-record",
    "delivers_interaction_for_work_using_exact_history_target",
    "immutable_revision",
  ],
] as const;

const historyOperationalRegistryIsExact = (value: unknown[]): boolean =>
  value.every((entry, index) => {
    const expected = HISTORY_OPERATIONAL_REGISTRY[index];
    return (
      expected !== undefined &&
      isRecord(entry) &&
      entry.adapter_kind === expected[0] &&
      entry.authority_source === expected[1] &&
      entry.dependent_semantic_key === expected[2]
    );
  });

const historyOperationalDestinationIsValid = (
  value: unknown,
  semanticKey: (typeof HISTORY_OPERATIONAL_REGISTRY)[number][2],
  workUnitRef: Record<string, unknown>,
): boolean => {
  if (!isRecord(value) || typeof value.state !== "string") return false;
  if (semanticKey === "petra.work-unit") {
    if (value.state === "unavailable") {
      return (
        value.reason_code === "project_work_route_authority_unavailable" &&
        value.reason ===
          "The current ProjectDefinition does not authorize the exact Project Work detail destination."
      );
    }
    return (
      value.state === "available" &&
      value.place_role === "work" &&
      value.task_intent === "inspect" &&
      isRecord(value.object_ref) &&
      value.object_ref.semantic_key === "petra.work-unit" &&
      value.object_ref.object_id === workUnitRef.work_unit_id &&
      value.object_ref.revision === workUnitRef.revision &&
      value.object_ref.record_hash === workUnitRef.record_hash &&
      isRecord(value.route_authority) &&
      value.route_authority.schema_name === "petra.project-work-view" &&
      value.route_authority.schema_version === "1.0.0" &&
      value.route_authority.view_kind === "detail" &&
      value.route_authority.authority_source ===
        "current_project_definition_and_project_work_view" &&
      isRecord(value.project_definition_ref) &&
      typeof value.project_definition_ref.project_definition_id === "string" &&
      typeof value.project_definition_ref.revision === "number" &&
      typeof value.project_definition_ref.content_hash === "string" &&
      typeof value.project_definition_ref.definition_family === "string"
    );
  }
  if (semanticKey === "petra.worker-output-manifest") {
    return (
      value.state === "unavailable" &&
      value.reason_code === "worker_output_manifest_route_not_registered" &&
      value.reason ===
        "No exact Project-owned WorkerOutputManifest destination is registered."
    );
  }
  return (
    value.state === "unavailable" &&
    value.reason_code === "interaction_replay_record_route_not_registered" &&
    value.reason ===
      "No exact Project-owned InteractionReplayRecord destination is registered; replay is not a ProjectThread binding."
  );
};

const historyOperationalGroupIsValid = (
  value: unknown,
  groupIndex: number,
  resolvedTarget: Record<string, unknown>,
): boolean => {
  const expected = HISTORY_OPERATIONAL_REGISTRY[groupIndex];
  if (
    expected === undefined ||
    !isRecord(value) ||
    value.adapter_kind !== expected[0] ||
    value.authority_source !== expected[1] ||
    value.relation_scope !== "exact_target_record_binding" ||
    typeof value.total_count !== "number" ||
    !Number.isSafeInteger(value.total_count) ||
    value.total_count < 0 ||
    typeof value.returned_count !== "number" ||
    !Number.isSafeInteger(value.returned_count) ||
    value.returned_count < 0 ||
    !Array.isArray(value.refs) ||
    value.refs.length > 25 ||
    value.returned_count !== value.refs.length ||
    value.total_count < value.returned_count ||
    value.coverage !==
      (value.total_count > value.returned_count ? "truncated" : "complete")
  ) {
    return false;
  }
  return value.refs.every((ref) => {
    if (
      !isRecord(ref) ||
      ref.semantic_key !== expected[2] ||
      ref.schema_name !== expected[2] ||
      ref.schema_version !== "1.0.0" ||
      ref.relation !== expected[3] ||
      ref.posture !== expected[4] ||
      typeof ref.object_id !== "string" ||
      typeof ref.revision !== "number" ||
      typeof ref.record_hash !== "string" ||
      !isRecord(ref.work_unit_ref) ||
      typeof ref.work_unit_ref.work_unit_id !== "string" ||
      typeof ref.work_unit_ref.revision !== "number" ||
      typeof ref.work_unit_ref.spec_hash !== "string" ||
      typeof ref.work_unit_ref.record_hash !== "string" ||
      !historyOperationalDestinationIsValid(
        ref.destination,
        expected[2],
        ref.work_unit_ref,
      ) ||
      !isRecord(ref.input_binding_ref) ||
      ref.input_binding_ref.record_id !== resolvedTarget.object_id ||
      ref.input_binding_ref.record_revision !== resolvedTarget.revision ||
      ref.input_binding_ref.snapshot_hash !== resolvedTarget.record_hash
    ) {
      return false;
    }
    if (expected[0] === "work_input_binding") {
      return (
        ref.object_id === ref.work_unit_ref.work_unit_id &&
        ref.revision === ref.work_unit_ref.revision &&
        ref.record_hash === ref.work_unit_ref.record_hash &&
        ref.content_hash === undefined &&
        ref.interaction_run_ref === undefined
      );
    }
    if (typeof ref.content_hash !== "string") return false;
    if (expected[0] === "work_output") {
      return ref.interaction_run_ref === undefined;
    }
    return (
      isRecord(ref.interaction_run_ref) &&
      typeof ref.interaction_run_ref.interaction_run_id === "string" &&
      typeof ref.interaction_run_ref.revision === "number" &&
      typeof ref.interaction_run_ref.content_hash === "string" &&
      typeof ref.interaction_run_ref.record_hash === "string"
    );
  });
};

type ProjectShellView =
  | PetraProjectShellView
  | PetraProjectShellViewV11
  | PetraProjectShellViewV12
  | PetraProjectShellViewV13;

const shellView = (value: unknown): ProjectShellView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-shell-view" ||
    (value.schema_version !== "1.0.0" &&
      value.schema_version !== "1.1.0" &&
      value.schema_version !== "1.2.0" &&
      value.schema_version !== "1.3.0") ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project shell view.",
      502,
    );
  }
  return value as unknown as ProjectShellView;
};

const effectiveControlsView = (
  value: unknown,
): PetraProjectEffectiveControlsView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-effective-controls-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid effective Project controls view.",
      502,
    );
  }
  return value as unknown as PetraProjectEffectiveControlsView;
};

const projectHistoryView = (value: unknown): PetraProjectHistoryView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "recent_changes" ||
    value.content.order !== "newest_first" ||
    value.content.quick_window_limit !== 10 ||
    !Array.isArray(value.content.changes) ||
    value.content.changes.length > 10 ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project Recent changes view.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryView;
};

const projectHistoryEpisodeView = (
  value: unknown,
): PetraProjectHistoryEpisodeViewV12 => {
  const definitionAuthority =
    isRecord(value) && isRecord(value.content)
      ? value.content.project_definition_authority
      : undefined;
  const definitionRefIsValid = (
    candidate: unknown,
  ): candidate is Record<string, unknown> =>
    isRecord(candidate) &&
    hasExactKeys(candidate, [
      "schema_name",
      "schema_version",
      "project_definition_id",
      "revision",
      "content_hash",
      "record_hash",
    ]) &&
    candidate.schema_name === "petra.project-definition" &&
    candidate.schema_version === "1.0.0" &&
    typeof candidate.project_definition_id === "string" &&
    Number.isSafeInteger(candidate.revision) &&
    Number(candidate.revision) >= 1 &&
    typeof candidate.content_hash === "string" &&
    typeof candidate.record_hash === "string";
  const exactScalarRecordMatch = (
    left: Record<string, unknown>,
    right: Record<string, unknown>,
  ): boolean => {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] &&
          typeof left[key] !== "object" &&
          left[key] === right[key],
      )
    );
  };
  const registeredHistoricalTarget = (candidate: unknown): boolean => {
    if (
      !isRecord(candidate) ||
      typeof candidate.semantic_key !== "string" ||
      typeof candidate.object_id !== "string"
    ) {
      return false;
    }
    const prefix =
      HISTORY_RETAINED_TARGET_PREFIXES[
        candidate.semantic_key as keyof typeof HISTORY_RETAINED_TARGET_PREFIXES
      ];
    return (
      prefix !== undefined &&
      candidate.object_id.startsWith(prefix) &&
      candidate.object_id.length === prefix.length + 26 &&
      /^[0-9A-HJKMNP-TV-Z]{26}$/u.test(candidate.object_id.slice(prefix.length))
    );
  };
  const availableDefinitionAuthority =
    isRecord(definitionAuthority) &&
    hasExactKeys(definitionAuthority, [
      "state",
      "authority_source",
      "selection_basis",
      "effective_after_stream_revision",
      "project_definition_ref",
      "historical_destination_interpretation",
    ]) &&
    definitionAuthority.state === "available" &&
    definitionAuthority.authority_source ===
      "immutable_project_definition_event_stream_binding" &&
    definitionAuthority.selection_basis ===
      "latest_retained_binding_effective_before_selected_event" &&
    Number.isSafeInteger(definitionAuthority.effective_after_stream_revision) &&
    Number(definitionAuthority.effective_after_stream_revision) >= 0 &&
    definitionRefIsValid(definitionAuthority.project_definition_ref) &&
    definitionAuthority.historical_destination_interpretation ===
      "performed_for_selected_event_target";
  const unavailableDefinitionAuthority =
    isRecord(definitionAuthority) &&
    hasExactKeys(definitionAuthority, [
      "state",
      "reason_code",
      "reason",
      "historical_destination_interpretation",
    ]) &&
    definitionAuthority.state === "unavailable" &&
    definitionAuthority.reason_code ===
      "retained_project_definition_authority_not_available" &&
    definitionAuthority.reason ===
      "No exact retained ProjectDefinition authority binding is available for this selected event." &&
    definitionAuthority.historical_destination_interpretation ===
      "not_performed";
  const change =
    isRecord(value) && isRecord(value.content) && isRecord(value.content.change)
      ? value.content.change
      : undefined;
  const eventRef = isRecord(change?.event_ref) ? change.event_ref : undefined;
  const primaryTarget =
    Array.isArray(change?.targets) &&
    change.targets.filter(
      (target): target is Record<string, unknown> =>
        isRecord(target) && target.role === "primary",
    ).length === 1
      ? (change.targets.find(
          (target) => isRecord(target) && target.role === "primary",
        ) as Record<string, unknown>)
      : undefined;
  const destination =
    isRecord(value) && isRecord(value.content)
      ? value.content.historical_semantic_destination
      : undefined;
  const targetMatches =
    isRecord(destination) &&
    isRecord(destination.target_ref) &&
    primaryTarget !== undefined &&
    exactScalarRecordMatch(destination.target_ref, primaryTarget);
  const destinationDefinitionMatches =
    isRecord(destination) &&
    definitionRefIsValid(destination.project_definition_ref) &&
    availableDefinitionAuthority &&
    isRecord(definitionAuthority) &&
    definitionRefIsValid(definitionAuthority.project_definition_ref) &&
    exactScalarRecordMatch(
      destination.project_definition_ref,
      definitionAuthority.project_definition_ref,
    );
  const availableDestination =
    isRecord(destination) &&
    hasExactKeys(destination, [
      "state",
      "target_ref",
      "place_role",
      "task_intent",
      "route_authority",
      "project_definition_ref",
      "interpretation_basis",
    ]) &&
    destination.state === "available" &&
    targetMatches &&
    destination.place_role === "history" &&
    destination.task_intent === "view_history" &&
    destination.interpretation_basis ===
      "exact_retained_project_definition_and_registered_history_target" &&
    destinationDefinitionMatches &&
    registeredHistoricalTarget(destination.target_ref) &&
    isRecord(destination.route_authority) &&
    hasExactKeys(destination.route_authority, [
      "schema_name",
      "schema_version",
      "view_kind",
      "event_ref",
      "authority_source",
    ]) &&
    destination.route_authority.schema_name ===
      "petra.project-history-episode-view" &&
    destination.route_authority.schema_version === "1.2.0" &&
    destination.route_authority.view_kind === "causal_episode" &&
    destination.route_authority.authority_source ===
      "selected_project_event_and_exact_retained_project_definition" &&
    isRecord(destination.route_authority.event_ref) &&
    eventRef !== undefined &&
    exactScalarRecordMatch(destination.route_authority.event_ref, eventRef);
  const unavailableWithoutAuthority =
    isRecord(destination) &&
    hasExactKeys(destination, [
      "state",
      "target_ref",
      "reason_code",
      "reason",
      "interpretation_status",
    ]) &&
    destination.state === "unavailable" &&
    targetMatches &&
    unavailableDefinitionAuthority &&
    destination.reason_code ===
      "retained_project_definition_authority_not_available" &&
    destination.reason ===
      "No historical semantic destination is available because exact retained ProjectDefinition authority is unavailable for this selected event." &&
    destination.interpretation_status === "not_performed";
  const unavailableWithAuthority =
    isRecord(destination) &&
    hasExactKeys(destination, [
      "state",
      "target_ref",
      "reason_code",
      "reason",
      "interpretation_status",
      "project_definition_ref",
    ]) &&
    destination.state === "unavailable" &&
    targetMatches &&
    destinationDefinitionMatches &&
    destination.interpretation_status === "performed" &&
    ((destination.reason_code ===
      "retained_project_definition_history_place_not_supported" &&
      destination.reason ===
        "The exact retained ProjectDefinition does not authorize the History place for this selected event." &&
      registeredHistoricalTarget(destination.target_ref)) ||
      (destination.reason_code ===
        "historical_event_target_destination_not_registered" &&
        destination.reason ===
          "No historical semantic-destination adapter is registered for this selected event target." &&
        !registeredHistoricalTarget(destination.target_ref)));
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-episode-view" ||
    value.schema_version !== "1.2.0" ||
    typeof value.project_id !== "string" ||
    typeof value.event_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "causal_episode" ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    (!availableDefinitionAuthority && !unavailableDefinitionAuthority) ||
    (!availableDestination &&
      !unavailableWithoutAuthority &&
      !unavailableWithAuthority) ||
    (availableDefinitionAuthority &&
      (eventRef === undefined ||
        !Number.isSafeInteger(eventRef.stream_revision) ||
        Number(definitionAuthority.effective_after_stream_revision) >=
          Number(eventRef.stream_revision))) ||
    (unavailableDefinitionAuthority && !unavailableWithoutAuthority) ||
    (availableDefinitionAuthority && unavailableWithoutAuthority) ||
    eventRef?.event_id !== value.event_id ||
    !Array.isArray(value.content.omissions) ||
    !value.content.omissions.includes(
      "historical_project_definition_content_not_returned",
    ) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project History episode.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryEpisodeViewV12;
};

const projectHistoryRetainedView = (
  value: unknown,
): PetraProjectHistoryRetainedViewV12 => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-retained-view" ||
    value.schema_version !== "1.2.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "retained_events" ||
    value.content.order_kind !== "project_stream_newest_first" ||
    !isRecord(value.content.query) ||
    !isRecord(value.content.query.filters) ||
    value.content.cursor_binding !== "project_snapshot_and_complete_query" ||
    !Array.isArray(value.content.changes) ||
    value.content.changes.length > 100 ||
    !isRecord(value.content.page) ||
    !retainedHistoryFilterOptionsAreValid(
      value.content.filter_options,
      value.content.page.snapshot_total_count,
      value.content.query.filters,
    ) ||
    !isRecord(value.content.retention_snapshot) ||
    !isRecord(value.content.current_authority) ||
    value.content.recovery_authority !== "current_at_page_read" ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid retained Project History view.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryRetainedViewV12;
};

const projectHistoryImpactView = (
  value: unknown,
): PetraProjectHistoryImpactViewV14 => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-impact-view" ||
    value.schema_version !== "1.4.0" ||
    typeof value.project_id !== "string" ||
    typeof value.event_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "dependency_impact" ||
    value.content.authorization_scope !== "authenticated_project" ||
    !isRecord(value.content.selected_event) ||
    !Array.isArray(value.content.selected_event.targets) ||
    !isRecord(value.content.impact) ||
    !isRecord(value.content.semantic_target_impact) ||
    value.content.semantic_target_impact.scope !==
      "registered_exact_semantic_target_dependents" ||
    value.content.semantic_target_impact.target_limit !== 10 ||
    value.content.semantic_target_impact.per_adapter_ref_limit !== 25 ||
    !Array.isArray(value.content.semantic_target_impact.registry) ||
    value.content.semantic_target_impact.registry.length !== 9 ||
    !historySemanticRegistryIsExact(
      value.content.semantic_target_impact.registry,
    ) ||
    !Array.isArray(value.content.semantic_target_impact.target_assessments) ||
    !isRecord(value.content.operational_dependency_impact) ||
    value.content.operational_dependency_impact.scope !==
      "registered_exact_operational_dependents" ||
    value.content.operational_dependency_impact.target_limit !== 10 ||
    value.content.operational_dependency_impact.per_adapter_ref_limit !== 25 ||
    !Array.isArray(value.content.operational_dependency_impact.registry) ||
    value.content.operational_dependency_impact.registry.length !== 3 ||
    !historyOperationalRegistryIsExact(
      value.content.operational_dependency_impact.registry,
    ) ||
    !Array.isArray(
      value.content.operational_dependency_impact.target_assessments,
    ) ||
    !isRecord(value.content.decision_boundary) ||
    value.content.decision_boundary.reversibility !== "not_assessed" ||
    value.content.decision_boundary.compensation !== "not_composed" ||
    !isRecord(value.content.authority) ||
    value.content.authority.isolation !== "repeatable_read" ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project History dependency-impact view.",
      502,
    );
  }
  const selectedTargets = value.content.selected_event.targets;
  const semanticImpact = value.content.semantic_target_impact;
  const assessments = semanticImpact.target_assessments;
  if (!Array.isArray(assessments)) {
    throw new ProjectDataError(
      "Petra returned invalid semantic History target assessments.",
      502,
    );
  }
  if (
    semanticImpact.target_total_count !== selectedTargets.length ||
    semanticImpact.target_returned_count !== assessments.length ||
    assessments.some((assessment, index) => {
      const selectedTarget: unknown = selectedTargets[index];
      if (
        !isRecord(assessment) ||
        assessment.target_index !== index ||
        !isRecord(assessment.target_ref) ||
        !isRecord(selectedTarget) ||
        !sameHistoryTargetRef(assessment.target_ref, selectedTarget) ||
        !Array.isArray(assessment.groups)
      ) {
        return true;
      }
      if (assessment.adapter_state === "registered") {
        const resolved = assessment.resolved_target_ref;
        const expectedGroups = expectedHistorySemanticGroups(
          selectedTarget.semantic_key,
        );
        return (
          !isRecord(resolved) ||
          assessment.groups.length < 1 ||
          assessment.groups.length !== expectedGroups.length ||
          assessment.groups.some(
            (group, groupIndex) =>
              !historySemanticGroupIsValid(group) ||
              !isRecord(group) ||
              group.adapter_kind !== expectedGroups[groupIndex],
          ) ||
          resolved.semantic_key !== selectedTarget.semantic_key ||
          resolved.object_id !== selectedTarget.object_id ||
          resolved.revision !== selectedTarget.revision ||
          (selectedTarget.content_hash !== undefined &&
            resolved.content_hash !== selectedTarget.content_hash) ||
          (selectedTarget.record_hash !== undefined &&
            resolved.record_hash !== selectedTarget.record_hash)
        );
      }
      if (assessment.groups.length !== 0) return true;
      if (assessment.adapter_state === "no_registered_exact_adapter") {
        return (
          registeredHistorySemanticKey(selectedTarget.semantic_key) ||
          assessment.reason !==
            "No exact semantic-target adapter is registered for this semantic key."
        );
      }
      if (assessment.adapter_state === "target_identity_incomplete") {
        return (
          !registeredHistorySemanticKey(selectedTarget.semantic_key) ||
          selectedTarget.revision !== undefined ||
          assessment.reason !==
            "Registered semantic-target adapters require an immutable target revision."
        );
      }
      if (assessment.adapter_state === "target_authority_unavailable") {
        return (
          !registeredHistorySemanticKey(selectedTarget.semantic_key) ||
          typeof selectedTarget.revision !== "number" ||
          assessment.reason !==
            "The exact immutable target authority is unavailable in this Project snapshot."
        );
      }
      return true;
    })
  ) {
    throw new ProjectDataError(
      "Petra returned semantic impact for different History targets.",
      502,
    );
  }
  const operationalImpact = value.content.operational_dependency_impact;
  const operationalAssessments = toUnknownArray(
    operationalImpact.target_assessments,
  );
  const operationalGroups = operationalAssessments.flatMap((assessment) =>
    isRecord(assessment) ? toUnknownArray(assessment.groups) : [],
  );
  const operationalSupportedCount = operationalAssessments.filter(
    (assessment) =>
      isRecord(assessment) && assessment.adapter_state === "registered",
  ).length;
  const operationalTotalCount = operationalGroups.reduce<number>(
    (total, group) =>
      total +
      (isRecord(group) && typeof group.total_count === "number"
        ? group.total_count
        : Number.NaN),
    0,
  );
  if (
    operationalImpact.target_total_count !== selectedTargets.length ||
    operationalImpact.target_returned_count !== operationalAssessments.length ||
    !isRecord(operationalImpact.summary) ||
    operationalImpact.summary.registered_adapter_count !== 3 ||
    operationalImpact.summary.assessed_target_count !==
      operationalAssessments.length ||
    operationalImpact.summary.supported_target_count !==
      operationalSupportedCount ||
    operationalImpact.summary.total_count !== operationalTotalCount ||
    operationalImpact.summary.coverage !==
      (operationalImpact.target_coverage === "truncated" ||
      operationalGroups.some(
        (group) => isRecord(group) && group.coverage === "truncated",
      )
        ? "truncated"
        : "complete") ||
    operationalAssessments.some((assessment, index) => {
      const selectedTarget: unknown = selectedTargets[index];
      if (
        !isRecord(assessment) ||
        assessment.target_index !== index ||
        !isRecord(assessment.target_ref) ||
        !isRecord(selectedTarget) ||
        !sameHistoryTargetRef(assessment.target_ref, selectedTarget) ||
        !Array.isArray(assessment.groups)
      ) {
        return true;
      }
      if (assessment.adapter_state === "registered") {
        if (
          !isRecord(assessment.resolved_target_record) ||
          assessment.resolved_target_record.semantic_key !==
            selectedTarget.semantic_key ||
          assessment.resolved_target_record.object_id !==
            selectedTarget.object_id ||
          assessment.resolved_target_record.revision !==
            selectedTarget.revision ||
          typeof assessment.resolved_target_record.record_hash !== "string" ||
          ![
            "selected_event_target",
            "resolved_immutable_semantic_authority",
          ].includes(
            String(assessment.resolved_target_record.authority_source),
          ) ||
          assessment.groups.length !== 3
        ) {
          return true;
        }
        return assessment.groups.some(
          (group, groupIndex) =>
            !historyOperationalGroupIsValid(
              group,
              groupIndex,
              assessment.resolved_target_record as Record<string, unknown>,
            ),
        );
      }
      const unavailableReasons = {
        target_identity_incomplete:
          "Operational adapters require an immutable target revision.",
        target_record_authority_unavailable:
          "The exact immutable target record authority is unavailable in this Project snapshot.",
      } as const;
      const adapterState = String(assessment.adapter_state);
      return assessment.groups.length !== 0 ||
        !(adapterState in unavailableReasons)
        ? true
        : assessment.reason !==
            unavailableReasons[adapterState as keyof typeof unavailableReasons];
    })
  ) {
    throw new ProjectDataError(
      "Petra returned operational impact for different History targets.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryImpactViewV14;
};

const projectHistoryRecoveryAssessmentView = (
  value: unknown,
): PetraProjectHistoryRecoveryAssessmentView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-recovery-assessment-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.event_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "change_set_recovery_assessment" ||
    value.content.authorization_scope !== "authenticated_project" ||
    !isRecord(value.content.selected_event) ||
    !isRecord(value.content.selected_event.event_ref) ||
    !isRecord(value.content.recovery_subject) ||
    !Array.isArray(value.content.recovery_subject.current_targets) ||
    value.content.recovery_subject.current_targets.length !== 2 ||
    !isRecord(value.content.command_authority) ||
    !Array.isArray(value.content.command_authority.required_commands) ||
    value.content.command_authority.required_commands.length !== 3 ||
    !isRecord(value.content.causal_impact_basis) ||
    !isRecord(value.content.assessment) ||
    !["eligible_for_preview", "blocked", "already_compensated"].includes(
      String(value.content.assessment.state),
    ) ||
    !isRecord(value.content.decision_boundary) ||
    value.content.decision_boundary.compensation_preview !== "not_composed" ||
    value.content.decision_boundary.compensation_execution !==
      "not_performed" ||
    value.content.decision_boundary.multi_step_compensation !==
      "not_assessed" ||
    !isRecord(value.content.authority) ||
    value.content.authority.isolation !== "repeatable_read" ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project History recovery assessment.",
      502,
    );
  }
  const commands = value.content.command_authority.required_commands;
  const targets = value.content.recovery_subject.current_targets;
  if (
    commands.some(
      (command, index) =>
        !isRecord(command) ||
        command.command_name !==
          ["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"][index],
    ) ||
    targets.some(
      (target, index) =>
        !isRecord(target) ||
        target.semantic_key !==
          ["scientific.claim", "scientific.assertion"][index],
    )
  ) {
    throw new ProjectDataError(
      "Petra returned recovery authority for a different command or evidence pair.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryRecoveryAssessmentView;
};

const projectHistoryCompensationPreviewView = (
  value: unknown,
): PetraProjectHistoryCompensationPreviewView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-compensation-preview-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.event_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "single_change_set_compensation_preview" ||
    value.content.authorization_scope !== "authenticated_project" ||
    !isRecord(value.content.assessment_ref) ||
    value.content.assessment_ref.assessment_state !== "eligible_for_preview" ||
    !Array.isArray(value.content.operation_preview) ||
    value.content.operation_preview.length !== 2 ||
    !Array.isArray(value.content.result_preview) ||
    value.content.result_preview.length !== 2 ||
    value.content.change_set_composition !== "deferred_until_confirmed_input" ||
    !Array.isArray(value.content.command_sequence) ||
    value.content.command_sequence.length !== 3 ||
    !isRecord(value.content.freshness) ||
    typeof value.content.freshness.binding_hash !== "string" ||
    !isRecord(value.content.decision_boundary) ||
    value.content.decision_boundary.preview !== "read_only" ||
    value.content.decision_boundary.change_set !== "not_created" ||
    value.content.decision_boundary.approval !== "not_recorded" ||
    value.content.decision_boundary.commands !== "not_composed_or_executed" ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project History compensation preview.",
      502,
    );
  }
  const operations = value.content.operation_preview;
  const results = value.content.result_preview;
  const commands = value.content.command_sequence;
  if (
    operations.some(
      (operation, index) =>
        !isRecord(operation) ||
        operation.operation_kind !==
          ["retract_claim", "retract_assertion"][index],
    ) ||
    results.some(
      (result, index) =>
        !isRecord(result) ||
        result.semantic_key !==
          ["scientific.claim", "scientific.assertion"][index] ||
        typeof result.prior_revision !== "number" ||
        result.resulting_revision !== result.prior_revision + 1,
    ) ||
    commands.some(
      (command, index) =>
        !isRecord(command) ||
        command.position !== index + 1 ||
        command.command_name !==
          ["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"][index],
    ) ||
    Date.parse(String(value.content.freshness.valid_through)) <=
      Date.parse(String(value.content.freshness.issued_at))
  ) {
    throw new ProjectDataError(
      "Petra returned a compensation preview with inconsistent revisions, operations, sequence, or freshness.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryCompensationPreviewView;
};

const projectHistoryCompensationPlanView = (
  value: unknown,
): PetraProjectHistoryCompensationPlanView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-compensation-plan-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.event_id !== "string" ||
    !isRecord(value.content) ||
    value.content.plan_kind !== "single_change_set_compensation_command_plan" ||
    value.content.authorization_scope !== "authenticated_project" ||
    !isRecord(value.content.preview_ref) ||
    !isRecord(value.content.confirmation) ||
    value.content.confirmation.state !== "explicitly_confirmed" ||
    !isRecord(value.content.revalidation) ||
    value.content.revalidation.state !== "passed" ||
    value.content.revalidation.preview_expiry !== "unexpired" ||
    !isRecord(value.content.change_set) ||
    value.content.change_set.schema_name !== "petra.change-set" ||
    value.content.change_set.schema_version !== "1.1.0" ||
    !isRecord(value.content.approval) ||
    !Array.isArray(value.content.commands) ||
    value.content.commands.length !== 3 ||
    !isRecord(value.content.persistence) ||
    value.content.persistence.change_set !== "not_persisted" ||
    value.content.persistence.approval !== "not_persisted" ||
    value.content.persistence.commands !== "not_persisted" ||
    !isRecord(value.content.execution) ||
    value.content.execution.state !== "not_performed" ||
    value.content.execution.requires_separate_request !== true ||
    value.content.execution.authority_recheck !== "required_at_each_command" ||
    !isRecord(value.content.decision_boundary) ||
    value.content.decision_boundary.command_plan !== "composed" ||
    value.content.decision_boundary.compensation !==
      "not_persisted_or_executed" ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project History compensation command plan.",
      502,
    );
  }
  const changeSet = value.content.change_set;
  const approval = value.content.approval;
  const commands = value.content.commands;
  if (
    typeof changeSet.change_set_id !== "string" ||
    typeof changeSet.content_hash !== "string" ||
    !isRecord(changeSet.content) ||
    changeSet.content.compensates_change_set_id === undefined ||
    approval.schema_name !== "petra.approval" ||
    approval.decision !== "approved" ||
    !isRecord(approval.subject) ||
    approval.subject.change_set_id !== changeSet.change_set_id ||
    approval.subject.change_set_content_hash !== changeSet.content_hash ||
    commands.some((step, index) => {
      if (
        !isRecord(step) ||
        step.position !== index + 1 ||
        step.command_name !==
          ["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"][index] ||
        step.state !== "composed_not_submitted" ||
        !isRecord(step.envelope) ||
        step.envelope.project_id !== value.project_id ||
        !isRecord(step.envelope.command) ||
        step.envelope.command.command_name !== step.command_name
      ) {
        return true;
      }
      return false;
    })
  ) {
    throw new ProjectDataError(
      "Petra returned a compensation plan with inconsistent ChangeSet, Approval, or command identities.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryCompensationPlanView;
};

const projectHistoryCompensationExecutionView = (
  value: unknown,
): PetraProjectHistoryCompensationExecutionView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-compensation-execution-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.event_id !== "string" ||
    !isRecord(value.content) ||
    value.content.execution_kind !==
      "single_change_set_compensation_execution" ||
    value.content.authorization_scope !== "authenticated_project" ||
    !isRecord(value.content.plan_ref) ||
    !isRecord(value.content.preflight) ||
    (value.content.outcome !== "completed" &&
      value.content.outcome !== "stopped") ||
    !Number.isInteger(value.content.completed_prefix) ||
    !Array.isArray(value.content.steps) ||
    value.content.steps.length !== 3 ||
    value.content.atomicity !==
      "per_command_transaction_not_three_command_atomic" ||
    !isRecord(value.content.derivation) ||
    value.content.derivation.aggregate_ledger !== "not_created" ||
    !isRecord(value.content.authoritative_effect) ||
    !isRecord(value.content.recovery) ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project History compensation execution result.",
      502,
    );
  }
  const expectedCommands = [
    "SubmitChangeSet",
    "RecordApproval",
    "ApplyChangeSet",
  ];
  if (
    value.content.steps.some((step, index) => {
      if (
        !isRecord(step) ||
        step.position !== index + 1 ||
        step.command_name !== expectedCommands[index] ||
        !isRecord(step.command_ref) ||
        step.command_ref.command_name !== step.command_name
      ) {
        return true;
      }
      return ![
        "retained_success",
        "retained_failure",
        "attempt_failed_not_retained",
        "not_attempted",
      ].includes(String(step.state));
    }) ||
    (value.content.outcome === "completed" &&
      (value.content.completed_prefix !== 3 ||
        value.content.steps.some(
          (step) => !isRecord(step) || step.state !== "retained_success",
        ) ||
        value.content.authoritative_effect.state !== "compensation_applied" ||
        value.content.recovery.state !== "complete")) ||
    (value.content.outcome === "stopped" &&
      (Number(value.content.completed_prefix) > 2 ||
        value.content.authoritative_effect.state !== "not_completed"))
  ) {
    throw new ProjectDataError(
      "Petra returned a compensation execution with inconsistent command order, outcome, or recovery state.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryCompensationExecutionView;
};

type ReviewCandidateBasisRevisionSourceRef = NonNullable<
  NonNullable<
    ReviewSession["candidateBasisRevision"]
  >["expectedProjectSourceRef"]
>;

const reviewCandidateBasisRevisionSourceRef = (
  value: unknown,
  projectId: string,
  projectSourceId: string,
): ReviewCandidateBasisRevisionSourceRef => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-source-lifecycle-view" ||
    value.schema_version !== "1.0.0" ||
    value.project_id !== projectId ||
    value.project_source_id !== projectSourceId ||
    !isRecord(value.content) ||
    value.content.requested_action !== "exclude_project_source" ||
    !isRecord(value.content.source_ref) ||
    value.content.source_ref.project_source_id !== projectSourceId ||
    !Number.isSafeInteger(value.content.source_ref.revision) ||
    Number(value.content.source_ref.revision) < 1 ||
    typeof value.content.source_ref.content_hash !== "string" ||
    !CONTENT_HASH.test(value.content.source_ref.content_hash) ||
    typeof value.content.source_ref.record_hash !== "string" ||
    !CONTENT_HASH.test(value.content.source_ref.record_hash) ||
    value.content.source_ref.status !== "active"
  ) {
    throw new ProjectDataError(
      "Petra did not return the exact active ProjectSource revision required for a Review basis change.",
      502,
    );
  }
  return structuredClone(
    value.content.source_ref,
  ) as ReviewCandidateBasisRevisionSourceRef;
};

const reviewV13ProfilesAreConsistent = (
  content: Record<string, unknown>,
): boolean => {
  if (!Array.isArray(content.members) || content.members.length === 0) {
    return false;
  }
  return content.members.every((member) => {
    if (
      !isRecord(member) ||
      !isRecord(member.candidate) ||
      !isRecord(member.candidate.profile_payload) ||
      !Array.isArray(member.change_sets) ||
      !isRecord(member.working_state) ||
      member.working_state.authority_effect !== "none"
    ) {
      return false;
    }
    const payload = member.candidate.profile_payload;
    if (payload.payload_kind === "scientific_evidence_pair") {
      return (
        isRecord(payload.claim_ref) &&
        isRecord(payload.assertion_ref) &&
        payload.assertion_predicate === "ASSERTS" &&
        !("apply_available" in payload)
      );
    }
    return (
      payload.payload_kind === "controlled_writing_requirement" &&
      payload.apply_available === false &&
      payload.relationship_predicate === "GOVERNS" &&
      isRecord(payload.requirement_ref) &&
      payload.requirement_ref.schema_name ===
        "petra.controlled-writing-requirement" &&
      isRecord(payload.governing_relationship_ref) &&
      payload.governing_relationship_ref.schema_name ===
        "petra.controlled-writing-governing-relationship" &&
      isRecord(payload.authority_source_ref) &&
      payload.authority_source_ref.schema_name === "petra.project-source" &&
      member.change_sets.length === 0
    );
  });
};

const reviewView = (value: unknown): PetraProjectReviewViewRecord => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-review-view" ||
    (value.schema_version !== "1.0.0" &&
      value.schema_version !== "1.1.0" &&
      value.schema_version !== "1.2.0" &&
      value.schema_version !== "1.3.0") ||
    typeof value.project_id !== "string" ||
    typeof value.review_session_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string" ||
    ((value.schema_version === "1.2.0" || value.schema_version === "1.3.0") &&
      (!isRecord(value.content.session) ||
        !Number.isSafeInteger(value.content.session.revision) ||
        Number(value.content.session.revision) < 1 ||
        typeof value.content.session.content_hash !== "string" ||
        !CONTENT_HASH.test(value.content.session.content_hash) ||
        (value.content.session.lifecycle !== "open" &&
          value.content.session.lifecycle !== "deferred" &&
          value.content.session.lifecycle !== "completed"))) ||
    (value.schema_version === "1.3.0" &&
      !reviewV13ProfilesAreConsistent(value.content))
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project Review view.",
      502,
    );
  }
  return value as unknown as PetraProjectReviewViewRecord;
};

const relationshipView = (value: unknown): PetraProjectRelationshipView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-relationship-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project relationship view.",
      502,
    );
  }
  return value as unknown as PetraProjectRelationshipView;
};

const relationshipOverlayView = (
  value: unknown,
): PetraProjectRelationshipOverlayView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-relationship-overlay-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project relationship overlay.",
      502,
    );
  }
  return value as unknown as PetraProjectRelationshipOverlayView;
};

const objectLocationView = (value: unknown): PetraProjectObjectLocationView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-object-location-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid semantic destination.",
      502,
    );
  }
  return value as unknown as PetraProjectObjectLocationView;
};

const projectWorkView = (value: unknown): PetraProjectWorkReadView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-work-view" ||
    (value.schema_version !== "1.0.0" && value.schema_version !== "1.1.0") ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    (value.content.view_kind !== "collection" &&
      value.content.view_kind !== "detail") ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project Work view.",
      502,
    );
  }
  return value as unknown as PetraProjectWorkReadView;
};

const projectInquiryView = (value: unknown): PetraProjectInquiryView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-inquiry-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    (value.content.view_kind !== "collection" &&
      value.content.view_kind !== "detail") ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project inquiry view.",
      502,
    );
  }
  return value as unknown as PetraProjectInquiryView;
};

const suggestedActionView = (value: unknown): PetraSuggestedActionView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.suggested-action-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "preview" ||
    !isRecord(value.content.action_ref) ||
    typeof value.content.action_ref.suggested_action_id !== "string" ||
    value.content.action_ref.revision !== 1 ||
    typeof value.content.action_ref.content_hash !== "string" ||
    !isRecord(value.content.action) ||
    value.content.action.action_kind !== "inspect_existing_inquiry_result" ||
    !isRecord(value.content.action.objective) ||
    !isRecord(value.content.action.objective.objective_ref) ||
    !isRecord(value.content.action.basis) ||
    !isRecord(value.content.action.basis.project_definition_ref) ||
    !isRecord(value.content.action.basis.inquiry_result_link_ref) ||
    !isRecord(value.content.action.basis.result_ref) ||
    !isRecord(value.content.action.basis.snapshot_ref) ||
    !isRecord(value.content.action.expected_result) ||
    !isRecord(value.content.action.resources) ||
    !isRecord(value.content.action.capability) ||
    !isRecord(value.content.action.interrupt) ||
    !isRecord(value.content.action.cancellation) ||
    !isRecord(value.content.action.background_work) ||
    !isRecord(value.content.action.invocation) ||
    !isRecord(value.content.readiness) ||
    (value.content.readiness.state !== "ready" &&
      value.content.readiness.state !== "stale") ||
    !Array.isArray(value.content.readiness.missing_prerequisites) ||
    (value.content.readiness.state === "ready" &&
      value.content.readiness.missing_prerequisites.length !== 0) ||
    (value.content.readiness.state === "stale" &&
      value.content.readiness.missing_prerequisites.length === 0) ||
    !isRecord(value.content.operation) ||
    value.content.operation.state !== "read_only" ||
    value.content.operation.work_start !== "not_performed" ||
    value.content.operation.authority_change !== "none" ||
    !isRecord(value.content.authority) ||
    !Array.isArray(value.content.limitations) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid SuggestedAction preview.",
      502,
    );
  }
  return value as unknown as PetraSuggestedActionView;
};

const exactObjectiveRefMatches = (
  left: PetraSuggestedActionView["content"]["action"]["objective"]["objective_ref"],
  right: PetraSuggestedActionView["content"]["action"]["objective"]["objective_ref"],
): boolean =>
  left.objective_id === right.objective_id &&
  left.revision === right.revision &&
  left.content_hash === right.content_hash &&
  left.record_hash === right.record_hash;

const exactResultRefMatches = (
  left: {
    readonly schema_name: string;
    readonly schema_version: string;
    readonly record_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly record_hash: string;
  },
  right: {
    readonly schema_name: string;
    readonly schema_version: string;
    readonly record_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly record_hash: string;
  },
): boolean =>
  left.schema_name === right.schema_name &&
  left.schema_version === right.schema_version &&
  left.record_id === right.record_id &&
  left.revision === right.revision &&
  left.content_hash === right.content_hash &&
  left.record_hash === right.record_hash;

const exactWorkRefMatches = (
  left: NonNullable<
    PetraSuggestedActionView["content"]["action"]["basis"]["produced_by_work_ref"]
  >,
  right: NonNullable<
    PetraSuggestedActionView["content"]["action"]["basis"]["produced_by_work_ref"]
  >,
): boolean =>
  left.work_unit_id === right.work_unit_id &&
  left.revision === right.revision &&
  left.spec_hash === right.spec_hash &&
  left.record_hash === right.record_hash;

const suggestedWorkActionView = (
  value: unknown,
): PetraSuggestedActionViewV11 => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.suggested-action-view" ||
    value.schema_version !== "1.1.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "preview" ||
    !isRecord(value.content.action_ref) ||
    !isRecord(value.content.action) ||
    value.content.action.action_kind !== "run_grounded_synthesis" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Work-starting SuggestedAction preview.",
      502,
    );
  }
  return value as unknown as PetraSuggestedActionViewV11;
};

const suggestedActionInvocationView = (
  value: unknown,
): PetraSuggestedActionInvocationView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.suggested-action-invocation-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "invocation" ||
    !isRecord(value.content.invocation) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid SuggestedAction invocation view.",
      502,
    );
  }
  return value as unknown as PetraSuggestedActionInvocationView;
};

export interface SuggestedActionWorkCancellationResult {
  readonly applied: boolean;
  readonly commandId: string;
  readonly effectId: string;
  readonly runId: string;
  readonly workUnitId: string;
  readonly workUnitRevision: number;
  readonly workUnitCancellationId: string;
  readonly cancellationHash: string;
}

const suggestedActionWorkCancellationResult = (
  value: unknown,
): SuggestedActionWorkCancellationResult => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "applied",
      "commandId",
      "effectId",
      "runId",
      "workUnitId",
      "workUnitRevision",
      "workUnitCancellationId",
      "cancellationHash",
    ]) ||
    typeof value.applied !== "boolean" ||
    typeof value.commandId !== "string" ||
    !COMMAND_ID.test(value.commandId) ||
    typeof value.effectId !== "string" ||
    typeof value.runId !== "string" ||
    value.runId.length === 0 ||
    value.runId.length > 200 ||
    typeof value.workUnitId !== "string" ||
    !WORK_UNIT_ID.test(value.workUnitId) ||
    !Number.isSafeInteger(value.workUnitRevision) ||
    (value.workUnitRevision as number) < 1 ||
    typeof value.workUnitCancellationId !== "string" ||
    !WORK_UNIT_CANCELLATION_ID.test(value.workUnitCancellationId) ||
    value.effectId !== value.workUnitCancellationId ||
    typeof value.cancellationHash !== "string" ||
    !CONTENT_HASH.test(value.cancellationHash)
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid durable Work cancellation result.",
      502,
    );
  }
  return value as unknown as SuggestedActionWorkCancellationResult;
};

const projectThreadView = (value: unknown): PetraProjectThreadView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-thread-view" ||
    (value.schema_version !== "1.0.0" && value.schema_version !== "1.1.0") ||
    typeof value.project_id !== "string" ||
    !isRecord(value.content) ||
    (value.content.view_kind !== "collection" &&
      value.content.view_kind !== "detail") ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project thread view.",
      502,
    );
  }
  return value as unknown as PetraProjectThreadView;
};

const requestJson = async (
  path: string,
  init: RequestInit = {},
): Promise<unknown> => {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${apiToken()}`);
  const response = await fetch(path, {
    ...init,
    headers,
  });
  if (!response.ok) {
    let message = `Petra could not read this Project (${response.status}).`;
    let continuationFailure:
      PetraProjectHistoryRetainedContinuationFailure | undefined;
    let suggestedActionRegeneration: PetraSuggestedActionViewV11 | undefined;
    try {
      const body = (await response.json()) as unknown;
      continuationFailure = retainedHistoryContinuationFailure(body);
      if (continuationFailure !== undefined) {
        message = continuationFailure.error.message;
      } else if (
        isRecord(body) &&
        body.schema_name ===
          "petra.project-history-retained-continuation-failure"
      ) {
        message = HISTORY_CONTINUATION_FAILURE_MESSAGE;
      } else if (
        isRecord(body) &&
        isRecord(body.error) &&
        typeof body.error.message === "string"
      ) {
        message = body.error.message;
        if (isRecord(body.regeneration)) {
          try {
            suggestedActionRegeneration = suggestedWorkActionView(
              body.regeneration,
            );
          } catch {
            // An invalid regeneration is never exposed as current authority.
          }
        }
      }
    } catch {
      // The status remains the authoritative error when no JSON body exists.
    }
    throw new ProjectDataError(
      message,
      response.status,
      continuationFailure,
      suggestedActionRegeneration,
    );
  }
  return response.json() as Promise<unknown>;
};

export interface ProjectSourceLifecycleCommandInput {
  readonly projectId: string;
  readonly projectSourceId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly requestedAction: "exclude_project_source" | "restore_project_source";
  readonly expectedSourceRef: ProjectSourceLifecycleExactSourceRef;
  readonly reason: string;
}

export interface ProjectSourceLifecycleCommandResponse {
  readonly receipt: PetraProjectSourceLifecycleReceipt;
  readonly projectSource: PetraProjectSource;
  readonly applied: boolean;
}

export interface CreateProjectSourceReplacementInput {
  readonly projectId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly replacementKind: ProjectSourceReplacementContent["replacement_kind"];
  readonly replacedSourceRef: ProjectSourceReplacementExcludedSourceRef;
  readonly replacementSourceRef: ProjectSourceReplacementActiveSourceRef;
  readonly exclusionReceiptRef: ProjectSourceReplacementExclusionReceiptRef;
  readonly rationale: string;
}

export interface CreateProjectSourceReplacementResponse {
  readonly receipt: PetraProjectSourceReplacementReceipt;
  readonly replacement: PetraProjectSourceReplacement;
  readonly applied: boolean;
}

export interface RetractProjectSourceReplacementInput {
  readonly projectId: string;
  readonly projectSourceReplacementId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedReplacementRef: CommandProjectSourceReplacementRef & {
    readonly state: "active";
  };
  readonly reason: string;
}

export interface RetractProjectSourceReplacementResponse {
  readonly receipt: PetraProjectSourceReplacementReceipt;
  readonly replacement: PetraProjectSourceReplacement;
  readonly retraction: PetraProjectSourceReplacementRetraction;
  readonly applied: boolean;
}

interface ReviewSessionLifecycleCommandInputBase {
  readonly projectId: string;
  readonly reviewSessionId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly rationale?: string;
}

export type ReviewSessionLifecycleCommandInput =
  | (ReviewSessionLifecycleCommandInputBase & {
      readonly requestedAction: "defer";
      readonly expectedReviewSessionRef: CommandReviewSessionRef & {
        readonly lifecycle: "open";
      };
    })
  | (ReviewSessionLifecycleCommandInputBase & {
      readonly requestedAction: "reopen";
      readonly expectedReviewSessionRef: CommandReviewSessionRef & {
        readonly lifecycle: "deferred";
      };
    });

export interface ReviewSessionLifecycleCommandResponse {
  readonly receipt: PetraReviewSessionLifecycleReceipt;
  readonly reviewSession: PetraReviewSessionRecord;
  readonly applied: boolean;
}

export interface ReviewSessionRefreshCommandInput {
  readonly projectId: string;
  readonly reviewSessionId: string;
  readonly commandId: string;
  readonly idempotencyKey: string;
  readonly expectedReviewSessionRef: {
    readonly review_session_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly lifecycle: "open";
  };
}

export interface ReviewSessionRefreshCommandResponse {
  readonly receipt: PetraReviewSessionRefreshReceipt;
  readonly reviewSession: PetraReviewSessionV110;
  readonly applied: boolean;
}

export interface ReviewCandidateCorrectionCommandInput {
  readonly projectId: string;
  readonly reviewSessionId: string;
  readonly request: ReviewCandidateCorrectionFromHumanEditRequest;
}

export interface ReviewCandidateCorrectionTransport {
  correctFromHumanEdit(
    projectId: string,
    request: ReviewCandidateCorrectionFromHumanEditRequest,
  ): Promise<ReviewCandidateCorrectionResult>;
}

export interface ReviewCandidateBasisRevisionDraft {
  readonly sourceScope: "full_text" | "abstract_only";
  readonly detailLevel: "broad" | "detailed";
  readonly sourceStance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  readonly attribution: string;
  readonly modality: "asserted" | "hedged" | "conditional" | "speculative";
  readonly negated: boolean;
  readonly uncertainty?: string;
  readonly reason: string;
}

export interface ReviewCandidateBasisRevisionCommandInput {
  readonly projectId: string;
  readonly reviewSessionId: string;
  readonly request: ReviewCandidateBasisRevisionRequest;
}

export interface ReviewCandidateBasisRevisionTransport {
  revise(
    projectId: string,
    request: ReviewCandidateBasisRevisionRequest,
  ): Promise<ReviewCandidateBasisRevisionResult>;
}

export interface ReviewSessionSeparationCommandInput {
  readonly projectId: string;
  readonly reviewSessionId: string;
  readonly request: ReviewSessionSeparationRequest;
}

export interface ReviewSessionSeparationTransport {
  separate(
    projectId: string,
    request: ReviewSessionSeparationRequest,
  ): Promise<ReviewSessionSeparationResult>;
}

const projectSourceLifecycleCommandResponse = (
  value: unknown,
  input: ProjectSourceLifecycleCommandInput,
): ProjectSourceLifecycleCommandResponse => {
  if (
    !isRecord(value) ||
    typeof value.applied !== "boolean" ||
    !isRecord(value.receipt) ||
    value.receipt.schema_name !== "petra.project-source-lifecycle-receipt" ||
    value.receipt.schema_version !== "1.0.0" ||
    value.receipt.project_id !== input.projectId ||
    !isRecord(value.receipt.content) ||
    !isRecord(value.receipt.content.command_ref) ||
    value.receipt.content.command_ref.command_id !== input.commandId ||
    value.receipt.content.command_ref.idempotency_key !==
      input.idempotencyKey ||
    value.receipt.content.command_ref.command_name !==
      (input.requestedAction === "exclude_project_source"
        ? "ExcludeProjectSource"
        : "RestoreProjectSource") ||
    !isRecord(value.receipt.content.prior_source_ref) ||
    value.receipt.content.prior_source_ref.project_source_id !==
      input.projectSourceId ||
    value.receipt.content.prior_source_ref.revision !==
      input.expectedSourceRef.revision ||
    value.receipt.content.prior_source_ref.content_hash !==
      input.expectedSourceRef.content_hash ||
    value.receipt.content.prior_source_ref.record_hash !==
      input.expectedSourceRef.record_hash ||
    value.receipt.content.prior_source_ref.status !==
      input.expectedSourceRef.status ||
    !isRecord(value.receipt.content.resulting_source_ref) ||
    value.receipt.content.resulting_source_ref.project_source_id !==
      input.projectSourceId ||
    !isRecord(value.project_source) ||
    value.project_source.schema_name !== "petra.project-source" ||
    value.project_source.schema_version !== "1.0.0" ||
    value.project_source.project_id !== input.projectId ||
    value.project_source.project_source_id !== input.projectSourceId ||
    value.project_source.revision !==
      value.receipt.content.resulting_source_ref.revision ||
    value.project_source.content_hash !==
      value.receipt.content.resulting_source_ref.content_hash ||
    !isRecord(value.project_source.content) ||
    value.project_source.content.status !==
      value.receipt.content.resulting_source_ref.status
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project source lifecycle command result.",
      502,
    );
  }
  return {
    receipt: value.receipt as unknown as PetraProjectSourceLifecycleReceipt,
    projectSource: value.project_source as unknown as PetraProjectSource,
    applied: value.applied,
  };
};

const reviewSessionLifecycleCommandResponse = (
  value: unknown,
  input: ReviewSessionLifecycleCommandInput,
): ReviewSessionLifecycleCommandResponse => {
  if (
    !isRecord(value) ||
    typeof value.applied !== "boolean" ||
    !isRecord(value.receipt) ||
    value.receipt.schema_name !== "petra.review-session-lifecycle-receipt" ||
    value.receipt.schema_version !== "1.0.0" ||
    value.receipt.project_id !== input.projectId ||
    !isRecord(value.receipt.content) ||
    !isRecord(value.receipt.content.command_ref) ||
    value.receipt.content.command_ref.command_id !== input.commandId ||
    value.receipt.content.command_ref.idempotency_key !==
      input.idempotencyKey ||
    value.receipt.content.command_ref.command_name !==
      (input.requestedAction === "defer"
        ? "DeferReviewSession"
        : "ReopenReviewSession") ||
    !isRecord(value.receipt.content.prior_review_session_ref) ||
    value.receipt.content.prior_review_session_ref.review_session_id !==
      input.reviewSessionId ||
    value.receipt.content.prior_review_session_ref.revision !==
      input.expectedReviewSessionRef.revision ||
    value.receipt.content.prior_review_session_ref.content_hash !==
      input.expectedReviewSessionRef.content_hash ||
    value.receipt.content.prior_review_session_ref.lifecycle !==
      input.expectedReviewSessionRef.lifecycle ||
    value.receipt.content.transition !==
      (input.requestedAction === "defer" ? "deferred" : "reopened") ||
    value.receipt.content.rationale !== input.rationale ||
    !isRecord(value.receipt.content.resulting_review_session_ref) ||
    value.receipt.content.resulting_review_session_ref.review_session_id !==
      input.reviewSessionId ||
    value.receipt.content.resulting_review_session_ref.revision !==
      input.expectedReviewSessionRef.revision + 1 ||
    typeof value.receipt.content.resulting_review_session_ref.content_hash !==
      "string" ||
    !CONTENT_HASH.test(
      value.receipt.content.resulting_review_session_ref.content_hash,
    ) ||
    typeof value.receipt.content.resulting_review_session_ref.record_hash !==
      "string" ||
    !CONTENT_HASH.test(
      value.receipt.content.resulting_review_session_ref.record_hash,
    ) ||
    value.receipt.content.resulting_review_session_ref.lifecycle !==
      (input.requestedAction === "defer" ? "deferred" : "open") ||
    !isRecord(value.receipt.content.preservation) ||
    value.receipt.content.preservation.review_history !== "retained" ||
    value.receipt.content.preservation.working_candidates !== "retained" ||
    value.receipt.content.preservation.working_relationships !== "retained" ||
    value.receipt.content.preservation.change_sets !== "retained" ||
    value.receipt.content.preservation.approvals !== "retained" ||
    value.receipt.content.preservation.command_events !==
      "retained_unchanged" ||
    value.receipt.content.preservation.projection_receipts !==
      "retained_unchanged" ||
    !isRecord(value.receipt.content.authority_boundary) ||
    value.receipt.content.authority_boundary.review_decision !== "none" ||
    value.receipt.content.authority_boundary.domain_authority !== "unchanged" ||
    value.receipt.content.authority_boundary.change_set_authority !== "none" ||
    value.receipt.content.authority_boundary.validation_authority !== "none" ||
    value.receipt.content.authority_boundary.domain_event_effect !== "none" ||
    value.receipt.content.authority_boundary.projection_effect !== "none" ||
    !isRecord(value.receipt.content.recovery) ||
    value.receipt.content.recovery.state !== "available" ||
    value.receipt.content.recovery.inverse_command_name !==
      (input.requestedAction === "defer"
        ? "ReopenReviewSession"
        : "DeferReviewSession") ||
    !isRecord(value.receipt.content.recovery.expected_review_session_ref) ||
    value.receipt.content.recovery.expected_review_session_ref
      .review_session_id !== input.reviewSessionId ||
    value.receipt.content.recovery.expected_review_session_ref.revision !==
      value.receipt.content.resulting_review_session_ref.revision ||
    value.receipt.content.recovery.expected_review_session_ref.content_hash !==
      value.receipt.content.resulting_review_session_ref.content_hash ||
    value.receipt.content.recovery.expected_review_session_ref.record_hash !==
      value.receipt.content.resulting_review_session_ref.record_hash ||
    value.receipt.content.recovery.expected_review_session_ref.lifecycle !==
      value.receipt.content.resulting_review_session_ref.lifecycle ||
    !isRecord(value.review_session) ||
    value.review_session.schema_name !== "petra.review-session" ||
    (value.review_session.schema_version !== "1.0.0" &&
      value.review_session.schema_version !== "1.1.0") ||
    value.review_session.project_id !== input.projectId ||
    value.review_session.review_session_id !== input.reviewSessionId ||
    !Number.isSafeInteger(value.review_session.revision) ||
    value.review_session.revision !==
      value.receipt.content.resulting_review_session_ref.revision ||
    typeof value.review_session.content_hash !== "string" ||
    !CONTENT_HASH.test(value.review_session.content_hash) ||
    value.review_session.content_hash !==
      value.receipt.content.resulting_review_session_ref.content_hash ||
    !isRecord(value.review_session.content) ||
    value.review_session.content.lifecycle !==
      value.receipt.content.resulting_review_session_ref.lifecycle
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid ReviewSession lifecycle command result.",
      502,
    );
  }
  return {
    receipt: value.receipt as unknown as PetraReviewSessionLifecycleReceipt,
    reviewSession: value.review_session as unknown as PetraReviewSessionRecord,
    applied: value.applied,
  };
};

const sameWorkingCandidateRef = (left: unknown, right: unknown): boolean =>
  isRecord(left) &&
  isRecord(right) &&
  left.working_candidate_id === right.working_candidate_id &&
  left.revision === right.revision &&
  left.content_hash === right.content_hash;

const sameWorkingRelationshipRefs = (left: unknown, right: unknown): boolean =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length === right.length &&
  left.every((leftRef, index) => {
    const rightRef: unknown = right[index];
    return (
      isRecord(leftRef) &&
      isRecord(rightRef) &&
      leftRef.working_relationship_id === rightRef.working_relationship_id &&
      leftRef.revision === rightRef.revision &&
      leftRef.content_hash === rightRef.content_hash
    );
  });

const refreshMembersMatch = (left: unknown, right: unknown): boolean =>
  Array.isArray(left) &&
  Array.isArray(right) &&
  left.length > 0 &&
  left.length === right.length &&
  left.every((receiptMember, index) => {
    const reviewMember: unknown = right[index];
    return (
      isRecord(receiptMember) &&
      isRecord(reviewMember) &&
      receiptMember.review_member_id === reviewMember.review_member_id &&
      isRecord(reviewMember.working_state) &&
      sameWorkingCandidateRef(
        receiptMember.candidate_ref,
        reviewMember.working_state.candidate_ref,
      ) &&
      sameWorkingRelationshipRefs(
        receiptMember.relationship_refs,
        reviewMember.working_state.relationship_refs,
      )
    );
  });

const reviewSessionRefreshCommandResponse = (
  value: unknown,
  input: ReviewSessionRefreshCommandInput,
): ReviewSessionRefreshCommandResponse => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["receipt", "review_session", "applied"]) ||
    typeof value.applied !== "boolean" ||
    !isRecord(value.receipt) ||
    value.receipt.schema_name !== "petra.review-session-refresh-receipt" ||
    value.receipt.schema_version !== "1.0.0" ||
    value.receipt.project_id !== input.projectId ||
    typeof value.receipt.content_hash !== "string" ||
    !CONTENT_HASH.test(value.receipt.content_hash) ||
    !isRecord(value.receipt.content) ||
    value.receipt.content.transition !== "refreshed" ||
    !isRecord(value.receipt.content.command_ref) ||
    value.receipt.content.command_ref.command_id !== input.commandId ||
    value.receipt.content.command_ref.idempotency_key !==
      input.idempotencyKey ||
    value.receipt.content.command_ref.command_name !== "RefreshReviewSession" ||
    !isRecord(value.receipt.content.prior_review_session_ref) ||
    value.receipt.content.prior_review_session_ref.review_session_id !==
      input.reviewSessionId ||
    value.receipt.content.prior_review_session_ref.revision !==
      input.expectedReviewSessionRef.revision ||
    value.receipt.content.prior_review_session_ref.content_hash !==
      input.expectedReviewSessionRef.content_hash ||
    value.receipt.content.prior_review_session_ref.lifecycle !== "open" ||
    typeof value.receipt.content.prior_review_session_ref.record_hash !==
      "string" ||
    !CONTENT_HASH.test(
      value.receipt.content.prior_review_session_ref.record_hash,
    ) ||
    !isRecord(value.receipt.content.resulting_review_session_ref) ||
    value.receipt.content.resulting_review_session_ref.review_session_id !==
      input.reviewSessionId ||
    value.receipt.content.resulting_review_session_ref.revision !==
      input.expectedReviewSessionRef.revision + 1 ||
    typeof value.receipt.content.resulting_review_session_ref.content_hash !==
      "string" ||
    !CONTENT_HASH.test(
      value.receipt.content.resulting_review_session_ref.content_hash,
    ) ||
    typeof value.receipt.content.resulting_review_session_ref.record_hash !==
      "string" ||
    !CONTENT_HASH.test(
      value.receipt.content.resulting_review_session_ref.record_hash,
    ) ||
    value.receipt.content.resulting_review_session_ref.lifecycle !== "open" ||
    !isRecord(value.receipt.content.refresh_basis) ||
    value.receipt.content.refresh_basis.selection_basis !==
      "same_review_members_current_working_heads" ||
    !isRecord(value.receipt.content.refresh_basis.resulting_snapshot) ||
    !Array.isArray(value.receipt.content.refresh_basis.members) ||
    !isRecord(value.receipt.content.preservation) ||
    value.receipt.content.preservation.stale_review_revision !== "retained" ||
    value.receipt.content.preservation.review_members !==
      "retained_same_identity" ||
    value.receipt.content.preservation.working_candidates !== "retained" ||
    value.receipt.content.preservation.working_relationships !== "retained" ||
    value.receipt.content.preservation.validation_records !==
      "retained_unchanged" ||
    value.receipt.content.preservation.change_sets !== "retained_unchanged" ||
    value.receipt.content.preservation.approvals !== "retained_unchanged" ||
    value.receipt.content.preservation.command_events !==
      "retained_unchanged" ||
    value.receipt.content.preservation.projection_receipts !==
      "retained_unchanged" ||
    !isRecord(value.receipt.content.authority_boundary) ||
    value.receipt.content.authority_boundary.review_decision !== "none" ||
    value.receipt.content.authority_boundary.domain_authority !== "unchanged" ||
    value.receipt.content.authority_boundary.candidate_authority !== "none" ||
    value.receipt.content.authority_boundary.validation_authority !== "none" ||
    value.receipt.content.authority_boundary.change_set_authority !== "none" ||
    value.receipt.content.authority_boundary.approval_authority !== "none" ||
    value.receipt.content.authority_boundary.domain_event_effect !== "none" ||
    value.receipt.content.authority_boundary.projection_effect !== "none" ||
    !isRecord(value.review_session) ||
    value.review_session.schema_name !== "petra.review-session" ||
    value.review_session.schema_version !== "1.1.0" ||
    value.review_session.project_id !== input.projectId ||
    value.review_session.review_session_id !== input.reviewSessionId ||
    value.review_session.revision !==
      value.receipt.content.resulting_review_session_ref.revision ||
    value.review_session.content_hash !==
      value.receipt.content.resulting_review_session_ref.content_hash ||
    !isRecord(value.review_session.content) ||
    value.review_session.content.lifecycle !== "open" ||
    !isRecord(value.review_session.content.snapshot) ||
    value.review_session.content.snapshot.event_position !==
      value.receipt.content.refresh_basis.resulting_snapshot.event_position ||
    value.review_session.content.snapshot.stream_revision !==
      value.receipt.content.refresh_basis.resulting_snapshot.stream_revision ||
    value.review_session.content.snapshot.captured_at !==
      value.receipt.content.refresh_basis.resulting_snapshot.captured_at ||
    !refreshMembersMatch(
      value.receipt.content.refresh_basis.members,
      value.review_session.content.members,
    )
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid ReviewSession refresh command result.",
      502,
    );
  }
  return {
    receipt: value.receipt as unknown as PetraReviewSessionRefreshReceipt,
    reviewSession: value.review_session as unknown as PetraReviewSessionV110,
    applied: value.applied,
  };
};

const createProjectSourceReplacementResponse = (
  value: unknown,
  input: CreateProjectSourceReplacementInput,
): CreateProjectSourceReplacementResponse => {
  if (
    !isRecord(value) ||
    typeof value.applied !== "boolean" ||
    !isRecord(value.receipt) ||
    value.receipt.schema_name !== "petra.project-source-replacement-receipt" ||
    value.receipt.schema_version !== "1.0.0" ||
    value.receipt.project_id !== input.projectId ||
    !isRecord(value.replacement) ||
    value.replacement.schema_name !== "petra.project-source-replacement" ||
    value.replacement.schema_version !== "1.0.0" ||
    value.replacement.project_id !== input.projectId
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project source replacement creation result.",
      502,
    );
  }
  const receipt =
    value.receipt as unknown as PetraProjectSourceReplacementReceipt;
  const replacement =
    value.replacement as unknown as PetraProjectSourceReplacement;
  const result = receipt.content.result;
  if (
    receipt.content.command_ref.command_id !== input.commandId ||
    receipt.content.command_ref.idempotency_key !== input.idempotencyKey ||
    receipt.content.command_ref.command_name !==
      "CreateProjectSourceReplacement" ||
    result.effect !== "replacement_activated" ||
    result.replacement_ref.state !== "active" ||
    replacement.project_source_replacement_id !==
      result.replacement_ref.project_source_replacement_id ||
    replacement.revision !== result.replacement_ref.revision ||
    replacement.content_hash !== result.replacement_ref.content_hash ||
    replacement.content.replacement_kind !== input.replacementKind ||
    replacement.content.rationale !== input.rationale ||
    replacement.content.replaced_source_ref.project_source_id !==
      input.replacedSourceRef.project_source_id ||
    replacement.content.replaced_source_ref.revision !==
      input.replacedSourceRef.revision ||
    replacement.content.replaced_source_ref.content_hash !==
      input.replacedSourceRef.content_hash ||
    replacement.content.replaced_source_ref.record_hash !==
      input.replacedSourceRef.record_hash ||
    replacement.content.replacement_source_ref.project_source_id !==
      input.replacementSourceRef.project_source_id ||
    replacement.content.replacement_source_ref.revision !==
      input.replacementSourceRef.revision ||
    replacement.content.replacement_source_ref.content_hash !==
      input.replacementSourceRef.content_hash ||
    replacement.content.replacement_source_ref.record_hash !==
      input.replacementSourceRef.record_hash ||
    replacement.content.exclusion_receipt_ref
      .project_source_lifecycle_receipt_id !==
      input.exclusionReceiptRef.project_source_lifecycle_receipt_id ||
    replacement.content.exclusion_receipt_ref.revision !==
      input.exclusionReceiptRef.revision ||
    replacement.content.exclusion_receipt_ref.content_hash !==
      input.exclusionReceiptRef.content_hash ||
    replacement.content.exclusion_receipt_ref.record_hash !==
      input.exclusionReceiptRef.record_hash
  ) {
    throw new ProjectDataError(
      "Petra returned a Project source replacement that does not match the command.",
      502,
    );
  }
  return { receipt, replacement, applied: value.applied };
};

const retractProjectSourceReplacementResponse = (
  value: unknown,
  input: RetractProjectSourceReplacementInput,
): RetractProjectSourceReplacementResponse => {
  if (
    !isRecord(value) ||
    typeof value.applied !== "boolean" ||
    !isRecord(value.receipt) ||
    value.receipt.schema_name !== "petra.project-source-replacement-receipt" ||
    value.receipt.schema_version !== "1.0.0" ||
    value.receipt.project_id !== input.projectId ||
    !isRecord(value.replacement) ||
    value.replacement.schema_name !== "petra.project-source-replacement" ||
    value.replacement.schema_version !== "1.0.0" ||
    value.replacement.project_id !== input.projectId ||
    !isRecord(value.retraction) ||
    value.retraction.schema_name !==
      "petra.project-source-replacement-retraction" ||
    value.retraction.schema_version !== "1.0.0" ||
    value.retraction.project_id !== input.projectId
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project source replacement retraction result.",
      502,
    );
  }
  const receipt =
    value.receipt as unknown as PetraProjectSourceReplacementReceipt;
  const replacement =
    value.replacement as unknown as PetraProjectSourceReplacement;
  const retraction =
    value.retraction as unknown as PetraProjectSourceReplacementRetraction;
  const result = receipt.content.result;
  const expected = input.expectedReplacementRef;
  if (
    receipt.content.command_ref.command_id !== input.commandId ||
    receipt.content.command_ref.idempotency_key !== input.idempotencyKey ||
    receipt.content.command_ref.command_name !==
      "RetractProjectSourceReplacement" ||
    result.effect !== "replacement_retracted" ||
    result.replacement_ref.project_source_replacement_id !==
      input.projectSourceReplacementId ||
    result.replacement_ref.revision !== expected.revision ||
    result.replacement_ref.content_hash !== expected.content_hash ||
    result.replacement_ref.record_hash !== expected.record_hash ||
    result.replacement_ref.state !== "retracted" ||
    replacement.project_source_replacement_id !==
      input.projectSourceReplacementId ||
    replacement.revision !== expected.revision ||
    replacement.content_hash !== expected.content_hash ||
    retraction.content.replacement_ref.project_source_replacement_id !==
      input.projectSourceReplacementId ||
    retraction.content.replacement_ref.revision !== expected.revision ||
    retraction.content.replacement_ref.content_hash !== expected.content_hash ||
    retraction.content.replacement_ref.record_hash !== expected.record_hash ||
    result.retraction_ref.project_source_replacement_retraction_id !==
      retraction.project_source_replacement_retraction_id ||
    result.retraction_ref.revision !== retraction.revision ||
    result.retraction_ref.content_hash !== retraction.content_hash
  ) {
    throw new ProjectDataError(
      "Petra returned a Project source replacement retraction that does not match the command.",
      502,
    );
  }
  return { receipt, replacement, retraction, applied: value.applied };
};

const termFor = (
  view: ProjectShellView,
  family: "focus" | "finding" | "reference",
): ProjectDefinitionTerm => {
  const term = view.content.definition.terms.find(
    (term) => term.generic_family === family,
  );
  if (term === undefined) {
    throw new ProjectDataError(
      `Petra cannot open this Project because its exact definition supplies no ${family} terminology. No substitute term was applied.`,
      503,
    );
  }
  return term;
};

const profileFrom = (view: ProjectShellView): ProjectProfile => {
  const focus = termFor(view, "focus");
  const finding = termFor(view, "finding");
  const reference = termFor(view, "reference");
  return {
    id: view.content.definition.project_definition_id,
    version: String(view.content.definition.revision),
    definitionFamily: view.content.definition.definition_family,
    label: view.content.definition.label,
    description: view.content.definition.description,
    compatibility: view.content.definition.kernel_compatibility,
    terms: {
      focus: focus.singular,
      focusPlural: focus.plural,
      finding: finding.singular,
      findingPlural: finding.plural,
      reference: reference.singular,
      referencePlural: reference.plural,
    },
  };
};

const attentionFrom = (view: ProjectShellView): AttentionItem[] => {
  const places = new Set(view.content.definition.supported_places);
  return view.content.attention.map((item) => ({
    id: item.attention_id,
    title: item.title,
    summary: item.summary,
    consequence: item.consequence,
    recommendation: item.recommendation,
    rationale: view.content.projection.detail,
    alternatives: [
      "Continue from the current focus",
      ...(places.has("review") ? ["Open Review"] : []),
      ...(places.has("history") ? ["Inspect retained History"] : []),
    ],
  }));
};

export const projectRecordFromShellView = (
  view: ProjectShellView,
): ProjectRecord => {
  const profile = profileFrom(view);
  const objective = view.content.current_objective;
  const hasAttention = view.content.attention.length > 0;
  return {
    id: view.project_id,
    revision: view.content.project.revision,
    ...(objective === undefined
      ? {}
      : {
          importBinding: {
            sourceKind: "retained_project" as const,
            projectId: view.project_id,
            projectRevision: view.content.project.revision,
            projectDefinitionRef: {
              projectDefinitionId:
                view.content.definition.project_definition_id,
              revision: view.content.definition.revision,
              contentHash: view.content.definition.content_hash,
            },
            focusedObjectiveRef: {
              objectiveId: objective.objective_id,
              revision: objective.revision,
              contentHash: objective.content_hash,
            },
          },
        }),
    title: view.content.project.name,
    objective:
      objective?.statement ?? "No current Project focus has been selected.",
    updatedAt: view.content.project.updated_at,
    state: hasAttention
      ? "attention"
      : objective === undefined
        ? "early"
        : "ready",
    stateLabel:
      view.content.project.status === "archived"
        ? "Archived"
        : hasAttention
          ? "Needs attention"
          : objective === undefined
            ? "Early Project"
            : "Ready to continue",
    profile,
    snapshot: {
      id: `authority-event-${view.content.authority.event_position}`,
      label: `Authority event ${view.content.authority.event_position}`,
      asOf: view.read_at,
    },
    projection: {
      state:
        view.content.projection.state === "blocked"
          ? "unavailable"
          : view.content.projection.state,
      label: view.content.projection.label,
      detail: view.content.projection.detail,
    },
    focus: {
      label: `Current ${profile.terms.focus.toLocaleLowerCase()}`,
      value: objective?.statement ?? "No current focus",
      summary:
        objective === undefined
          ? "Select an Objective through Petra's authoritative Project command path before starting material Work."
          : `${profile.terms.focus} revision ${objective.revision} is interpreted under ProjectDefinition revision ${view.content.definition.revision}.`,
    },
    baselineChange: `Project revision ${view.content.project.revision}, ProjectDefinition revision ${view.content.definition.revision}, and authority event ${view.content.authority.event_position} were read together under repeatable-read isolation.`,
    attention: attentionFrom(view),
    recentDecisions: [],
    sources: [],
    ...(view.schema_version === "1.0.0"
      ? {}
      : {
          placeSummaries: view.content.place_summaries.map((place) => ({
            role: place.role,
            coverage: place.coverage,
            label: place.label,
            summary: place.summary,
            ...(!("item_count" in place) || place.item_count === undefined
              ? {}
              : { itemCount: place.item_count }),
            attentionCount: place.attention_count,
            ...(place.limitation === undefined
              ? {}
              : { limitation: place.limitation }),
          })),
          ...(view.content.selection === undefined
            ? {}
            : {
                selection: {
                  state: view.content.selection.resolution.state,
                  semanticKey:
                    view.content.selection.resolution.requested_ref
                      .semantic_key,
                  objectId:
                    view.content.selection.resolution.requested_ref.object_id,
                  ...(view.content.selection.resolution.requested_ref
                    .revision === undefined
                    ? {}
                    : {
                        requestedRevision:
                          view.content.selection.resolution.requested_ref
                            .revision,
                      }),
                  ...("resolved_ref" in view.content.selection.resolution
                    ? {
                        resolvedRevision:
                          view.content.selection.resolution.resolved_ref
                            .revision,
                        recordHash:
                          view.content.selection.resolution.resolved_ref
                            .record_hash,
                        label:
                          view.content.selection.resolution.descriptor.label,
                        summary:
                          view.content.selection.resolution.descriptor.summary,
                      }
                    : {}),
                  destination: view.content.selection.primary_destination.role,
                },
              }),
          ...(view.schema_version === "1.3.0"
            ? {
                attentionWork: structuredClone(view.content.attention_work),
              }
            : {}),
          ...(view.schema_version === "1.2.0" || view.schema_version === "1.3.0"
            ? { resume: structuredClone(view.content.resume) }
            : {}),
        }),
  };
};

const titleCase = (value: string): string =>
  value
    .split("_")
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");

const displayLabel = (value: string, fallback: string): string =>
  value.trim().length === 0 ? fallback : value;

const overlayRelationshipLabel = (
  relationship: PetraProjectRelationshipOverlayView["content"]["relationships"][number],
): string =>
  relationship.layer === "working"
    ? displayLabel(
        relationship.relationship_term,
        displayLabel(relationship.label, "Relationship"),
      )
    : displayLabel(relationship.label, "Relationship");

const durationLabel = (milliseconds: number): string => {
  if (milliseconds < 1000) return `${milliseconds} ms`;
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${Number(seconds.toFixed(1))} s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Number(minutes.toFixed(1))} min`;
  return `${Number((minutes / 60).toFixed(1))} h`;
};

const bytesLabel = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kibibytes = bytes / 1024;
  if (kibibytes < 1024) return `${Number(kibibytes.toFixed(1))} KiB`;
  return `${Number((kibibytes / 1024).toFixed(1))} MiB`;
};

const executionFrom = (
  summary: ProjectWorkTaskSummary | ProjectWorkTaskSummaryV11,
): { state: WorkExecutionState; label: string } => {
  const { execution } = summary;
  if (execution.state === "requested") {
    return { state: "queued", label: "Requested · awaiting dispatch" };
  }
  if (execution.state === "queued") {
    return { state: "queued", label: "Queued" };
  }
  if (execution.state === "running") {
    return { state: "running", label: "Running" };
  }
  if (execution.state === "checkpointed") {
    return {
      state: "running",
      label: "Checkpoint recorded · open task to assess Resume",
    };
  }
  if (execution.state === "cancelled") {
    return { state: "cancelled", label: "Cancelled" };
  }
  if (execution.terminal_outcome === "succeeded") {
    return { state: "completed", label: "Completed operationally" };
  }
  return {
    state: "failed",
    label: titleCase(execution.terminal_outcome ?? "terminal failure"),
  };
};

const exactInputLabel = (
  input: (
    ProjectWorkDetailContent | ProjectWorkDetailContentV11
  )["specification"]["inputs"][number],
): string =>
  input.binding_kind === "artifact"
    ? `${input.name}: ${input.artifact_id} · ${input.content_hash.slice(0, 18)}… · ${bytesLabel(input.byte_size)}`
    : `${input.name}: ${input.record_id} r${input.record_revision} · ${input.snapshot_hash.slice(0, 18)}…`;

export const workUnitFromView = (
  view: PetraProjectWorkReadView,
  collectionSummary?: ProjectWorkTaskSummary | ProjectWorkTaskSummaryV11,
): WorkUnit => {
  const detail = view.content.view_kind === "detail" ? view.content : undefined;
  const summary =
    collectionSummary ??
    (view.content.view_kind === "collection"
      ? view.content.tasks[0]
      : view.content.summary);
  if (summary === undefined) {
    throw new ProjectDataError(
      "Petra returned an empty Work collection where one Work task was required.",
      502,
    );
  }
  const execution = executionFrom(summary);
  const resourceUse =
    detail === undefined
      ? summary.resource_coverage === "measured"
        ? "Measured use is available in exact Work detail."
        : "Only authorized limits are available in exact Work detail."
      : detail.resources.usage.state === "unavailable"
        ? detail.resources.usage.reason
        : `${durationLabel(detail.resources.usage.resource_usage.wall_time_ms)} wall · ${durationLabel(detail.resources.usage.resource_usage.cpu_time_ms)} CPU · ${bytesLabel(detail.resources.usage.resource_usage.output_bytes)} output`;
  const authorizedLimit =
    detail === undefined
      ? "Available in exact Work detail."
      : `${durationLabel(detail.resources.limits.max_wall_time_ms)} wall · ${bytesLabel(detail.resources.limits.max_output_bytes)} output · ${detail.resources.limits.max_attempts} ${detail.resources.limits.max_attempts === 1 ? "attempt" : "attempts"}`;
  const cancellation = detail?.controls.find(
    (control) => control.control_name === "cancel",
  );
  const outputs =
    detail?.outputs.map((output) => ({
      id:
        output.report_state === "reported"
          ? output.produced_output.output_handle
          : `declared:${output.declaration.output_name}`,
      label: `${titleCase(output.declaration.output_name)} · ${output.declaration.output_role}`,
      status:
        output.report_state === "reported" ? "Worker reported" : "Not reported",
      validation: "Project usability unavailable",
      limitation: output.availability.limitation,
    })) ?? [];
  const stagePlan = detail?.stage_plan ?? summary.stage_plan;
  const stages =
    stagePlan.state === "available"
      ? stagePlan.stages.map((stage) => ({
          id: stage.stage_id,
          label: stage.label,
          purpose: stage.purpose,
          state: stage.state,
          stateLabel: stage.state_label,
          prerequisites: stage.prerequisite_stage_ids.map(
            (stageId) =>
              stagePlan.stages.find(
                (candidate) => candidate.stage_id === stageId,
              )?.label ?? stageId,
          ),
          accountableRole: stage.accountable_role,
          input: stage.input,
          output: stage.output,
          activity: [...stage.activity],
        }))
      : [];
  return {
    id: summary.work_unit_ref.work_unit_id,
    projectId: view.project_id,
    objective: summary.objective,
    expectedOutcome:
      detail === undefined
        ? `${summary.reported_output_count} worker ${summary.reported_output_count === 1 ? "output" : "outputs"} reported; Project-level usability is not inferred.`
        : `${detail.specification.expected_outputs.length} declared output ${detail.specification.expected_outputs.length === 1 ? "slot" : "slots"}; worker reporting remains separate from Project usability.`,
    origin: `${summary.workflow.workflow_name} ${summary.workflow.workflow_version} · ${summary.task_label}`,
    execution: execution.state,
    executionLabel: execution.label,
    observedAt: view.read_at,
    revision: `Work revision ${summary.work_unit_ref.revision}`,
    branchIds: [],
    elapsed:
      summary.elapsed.state === "measured"
        ? `${durationLabel(summary.elapsed.milliseconds)} · ${summary.elapsed.basis.replaceAll("_", " ")}`
        : summary.elapsed.reason,
    estimate:
      detail === undefined
        ? "Unavailable in the bounded collection read."
        : "No execution estimate is registered; the authorized wall limit is shown separately.",
    resourceUse,
    authorizedLimit,
    cancellation:
      cancellation === undefined
        ? "Cancellation policy is available only in exact Work detail."
        : `${cancellation.reason} ${cancellation.consequence}`,
    ...(stagePlan.state === "available" &&
    stagePlan.current_stage_id !== undefined
      ? { currentStageId: stagePlan.current_stage_id }
      : {}),
    stages,
    ...(detail === undefined
      ? {}
      : {
          inputs: detail.specification.inputs.map(exactInputLabel),
          dependencies: detail.dependencies.map(
            (dependency) =>
              `${dependency.work_unit_ref.work_unit_id} r${dependency.work_unit_ref.revision} · ${dependency.state}${dependency.terminal_outcome === undefined ? "" : ` · ${dependency.terminal_outcome}`}`,
          ),
          ...(detail.stage_plan.state === "unavailable"
            ? { stagePlanLimitation: detail.stage_plan.reason }
            : {}),
          inquiryLimitation: detail.inquiry_linkage.reason,
        }),
    results: outputs,
    reviewState:
      detail === undefined
        ? "Review linkage is available only in exact Work detail."
        : detail.review.reason,
  };
};

export const inquiryBranchesFromViews = (
  projectId: string,
  views: readonly PetraProjectInquiryView[],
): InquiryBranch[] => {
  const branches = new Map<string, InquiryBranch>();
  for (const view of views) {
    if (view.project_id !== projectId) {
      throw new ProjectDataError(
        "Petra returned an inquiry path from another Project.",
        502,
      );
    }
    const summaries =
      view.content.view_kind === "collection"
        ? view.content.inquiries
        : [view.content.summary];
    for (const summary of summaries) {
      const inquiryId = summary.inquiry_anchor_ref.objective_id;
      const workIds =
        view.content.view_kind === "detail"
          ? view.content.work_links.map(
              (link) => link.linked_work_ref.work_unit_id,
            )
          : view.content.query.work_unit_id === undefined
            ? []
            : [view.content.query.work_unit_id];
      if (
        view.content.view_kind === "detail" &&
        (view.content.work_links.length !== summary.linked_work_count ||
          view.content.result_links.length !== summary.linked_result_count)
      ) {
        throw new ProjectDataError(
          "Petra returned inquiry detail whose exact links do not match its summary.",
          502,
        );
      }
      const operational = summary.operational_work;
      const currentWork = `${operational.active} active, ${operational.completed} completed, ${operational.cancelled} cancelled`;
      const parent = summary.parent_ref === undefined ? 0 : 1;
      branches.set(inquiryId, {
        id: inquiryId,
        projectId,
        label: summary.current_framing,
        kind: summary.role.singular,
        state: `${titleCase(summary.authored_status)} · authored`,
        summary:
          summary.original_framing === summary.current_framing
            ? "The current authored framing is unchanged from its first registered revision."
            : `Original framing: ${summary.original_framing}`,
        dependency: `${parent} parent · ${summary.dependency_count} ${summary.dependency_count === 1 ? "dependency" : "dependencies"}`,
        consequence: `${summary.linked_work_count} exact Work ${summary.linked_work_count === 1 ? "link" : "links"} (${currentWork}) · ${summary.linked_result_count} result ${summary.linked_result_count === 1 ? "link" : "links"}. Operational state does not change the authored inquiry status.`,
        workIds: [...new Set(workIds)],
        recommended: false,
      });
    }
  }
  return [...branches.values()];
};

export const workProjectFromView = (
  view: PetraProjectWorkReadView,
  inquiryViews: readonly PetraProjectInquiryView[] = [],
): WorkProjectView => {
  const content = view.content;
  const branches = inquiryBranchesFromViews(view.project_id, inquiryViews);
  const units =
    content.view_kind === "collection"
      ? content.tasks.map((summary) => workUnitFromView(view, summary))
      : [workUnitFromView(view)];
  for (const unit of units) {
    unit.branchIds = branches
      .filter((branch) => branch.workIds.includes(unit.id))
      .map((branch) => branch.id);
    if (unit.branchIds.length > 0 && content.view_kind === "detail") {
      unit.inquiryLimitation =
        "Exact inquiry links are shown. Work completion does not resolve an inquiry or change its authored status.";
    }
  }
  return {
    projectId: view.project_id,
    branches,
    units,
    readAt: view.read_at,
    ...(content.view_kind === "detail"
      ? {}
      : {
          query: { ...content.query },
          page: {
            totalCount: content.page.total_count,
            hasMore: content.page.has_more,
            ...(content.page.next_cursor === undefined
              ? {}
              : { nextCursor: content.page.next_cursor }),
          },
        }),
  };
};

export const getProjectWorkInspection = async (
  projectId: string,
  workUnitId: string,
  revision: number,
  recordHash: string,
): Promise<{
  readonly work: WorkUnit;
  readonly operations: PetraProjectWorkOperationsView;
}> => {
  const [value, operations] = await Promise.all([
    requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/work/${encodeURIComponent(workUnitId)}`,
    ),
    readProjectWorkOperations(projectId, workUnitId),
  ]);
  const view = projectWorkView(value);
  if (
    view.project_id !== projectId ||
    view.content.view_kind !== "detail" ||
    view.content.summary.work_unit_ref.work_unit_id !== workUnitId ||
    view.content.summary.work_unit_ref.revision !== revision ||
    view.content.summary.work_unit_ref.record_hash !== recordHash ||
    operations.project_id !== projectId ||
    operations.work_unit_ref.work_unit_id !== workUnitId ||
    operations.work_unit_ref.revision !== revision
  ) {
    throw new ProjectDataError(
      "The current Work read does not match the selected Project shell revision.",
      409,
    );
  }
  const work = workProjectFromView(view).units[0];
  if (work === undefined) {
    throw new ProjectDataError("Petra returned no exact Work task.", 502);
  }
  return { work, operations };
};

export const sourceRecordFromView = (
  view: PetraProjectSourceView,
): SourceRecord => {
  const { binding, identity, copy, rights, representation, downstream_use } =
    view.content;
  const linkedRecords =
    downstream_use.claim_count + downstream_use.assertion_count;
  const limitation =
    representation.extent === "restricted"
      ? "The exact copy is retained, but its RightsDecision does not permit parsing."
      : representation.extent === "identity_only"
        ? "Petra has verified the exact copy and its rights, but no parsed representation is registered."
        : representation.extent === "partial"
          ? `The selected ParsedDocument reports ${representation.quality_state?.replace("_", " ") ?? "partial"} quality.`
          : undefined;
  return {
    id: view.project_source_id,
    title: identity.title,
    kind: titleCase(identity.work_kind),
    role: `${binding.source_role_label}${binding.status === "excluded" ? " · Excluded" : ""}`,
    roleId: binding.source_role,
    creator: identity.creators
      .map((creator) => creator.display_name)
      .join(", "),
    revision: `${identity.version_label} · source r${binding.revision}`,
    copy: `${copy.artifact_kind.toLocaleUpperCase()} · ${copy.byte_size.toLocaleString()} bytes · ${copy.artifact_ref.content_hash.slice(0, 18)}…`,
    location: copy.source_location,
    addedAt: binding.added_at,
    extent: representation.extent,
    extentLabel: representation.extent_label,
    rights: `${rights.license_label} · ${rights.decision_status.replace("_", " ")}`,
    downstreamUse:
      linkedRecords === 0
        ? "No Claims or Assertions currently cite this exact parsed copy."
        : `${downstream_use.claim_count} Claims and ${downstream_use.assertion_count} Assertions cite this exact parsed copy.`,
    ...(limitation === undefined ? {} : { limitation }),
    ...(representation.preview === undefined
      ? {}
      : {
          excerpt: {
            heading: representation.preview.heading,
            locator: representation.preview.locator,
            text: representation.preview.text,
            context: `Exact ${representation.preview.verification_status.replaceAll("_", " ")} span ${representation.preview.span_ref.record_id}; read with authority event ${view.content.authority.event_position}.`,
          },
        }),
  };
};

export const getProjectSourceInspection = async (
  projectId: string,
  sourceId: string,
  revision: number,
): Promise<SourceRecord> => {
  const view = await projectSourceDiscoveryClient().open(projectId, sourceId);
  if (
    view.project_id !== projectId ||
    view.project_source_id !== sourceId ||
    view.content.binding.revision !== revision
  ) {
    throw new ProjectDataError(
      "The current Source read does not match the selected Project shell revision.",
      409,
    );
  }
  return sourceRecordFromView(view);
};

const reviewReturnPath = (view: PetraProjectReviewViewRecord): string => {
  const projectRoot = `/projects/${encodeURIComponent(view.project_id)}`;
  const context = view.content.session.return_context;
  const objectRef =
    context.object_ref === undefined
      ? undefined
      : encodeURIComponent(context.object_ref);

  if (context.place === "brief") return `${projectRoot}/brief`;
  if (context.place === "sources") {
    return objectRef === undefined
      ? `${projectRoot}/sources`
      : `${projectRoot}/sources/${objectRef}`;
  }
  if (context.place === "review") {
    return objectRef === undefined
      ? `${projectRoot}/review`
      : `${projectRoot}/review/${objectRef}`;
  }
  if (context.place === "work") {
    return objectRef === undefined
      ? `${projectRoot}/work`
      : `${projectRoot}/work/${objectRef}`;
  }
  if (context.place === "composition") {
    return objectRef === undefined
      ? `${projectRoot}/composition`
      : `${projectRoot}/composition/${objectRef}`;
  }
  if (context.place === "profile_tool") {
    return objectRef === undefined
      ? `${projectRoot}/brief`
      : `${projectRoot}/tools/${objectRef}`;
  }
  return `${projectRoot}/${context.place}`;
};

const reviewMemberFromView = (
  view: PetraProjectReviewViewRecord,
  memberIndex: number,
): ReviewSessionMember => {
  const member = view.content.members[memberIndex];
  if (member === undefined) {
    throw new ProjectDataError("The Review session has no member.", 502);
  }
  if (member.change_sets.length > 1) {
    throw new ProjectDataError(
      "The current frozen M1 Review surface requires one current ChangeSet per member; Petra did not hide earlier or competing ChangeSets.",
      502,
    );
  }
  const changeSet = member.change_sets[0];
  const commitment =
    view.schema_version === "1.3.0" &&
    member.candidate.profile_payload.payload_kind ===
      "controlled_writing_requirement"
      ? {
          available: false as const,
          reason:
            "Petra has no controlled-writing ChangeSet operation, Approval, or Apply path.",
        }
      : { available: true as const };
  let candidateCorrection: ReviewSession["candidateCorrection"] | undefined;
  let candidateBasisRevision:
    ReviewSession["candidateBasisRevision"] | undefined;
  let workingOrigin: ReviewSession["candidate"]["workingOrigin"];
  const qualifications: ReviewSession["qualifications"] = [];
  if (view.schema_version !== "1.0.0") {
    const composedMember = view.content.members[memberIndex];
    if (composedMember !== undefined) {
      const candidate = composedMember.working_state.candidate;
      workingOrigin = {
        recordId: candidate.working_candidate_id,
        revision: candidate.revision,
        contentHash: candidate.content_hash,
        producerActorId: candidate.producer.actor.actor_id,
        producerActorKind: candidate.producer.actor.actor_kind,
        originKind: candidate.origin.origin_kind,
        originSummary: candidate.origin.summary,
        originRecordIds: candidate.origin.source_record_refs.map(
          (reference) => reference.record_id,
        ),
        provenance: candidate.provenance.map((item) => ({
          role: item.provenance_role,
          recordId: item.record_ref.record_id,
          statement: item.statement,
        })),
      };
      qualifications.push({
        recordKind: "candidate",
        recordId: composedMember.working_state.candidate.working_candidate_id,
        assessmentState:
          composedMember.working_state.candidate.qualifications
            .assessment_state,
        statements:
          composedMember.working_state.candidate.qualifications.statements.map(
            (statement) => ({
              kind: statement.qualification_kind,
              statement: statement.statement,
              ...(statement.basis_ref === undefined
                ? {}
                : { basisRecordId: statement.basis_ref.record_id }),
            }),
          ),
      });
      qualifications.push(
        ...composedMember.working_state.relationships.map((item) => ({
          recordKind: "relationship" as const,
          recordId: item.working_relationship_id,
          assessmentState: item.qualifications.assessment_state,
          statements: item.qualifications.statements.map((statement) => ({
            kind: statement.qualification_kind,
            statement: statement.statement,
            ...(statement.basis_ref === undefined
              ? {}
              : { basisRecordId: statement.basis_ref.record_id }),
          })),
        })),
      );
    }
  }
  if (view.schema_version === "1.2.0" || view.schema_version === "1.3.0") {
    const composedMember = view.content.members[memberIndex];
    const relationship = composedMember?.working_state.relationships[0];
    if (
      composedMember !== undefined &&
      composedMember.candidate.profile_payload.payload_kind ===
        "scientific_evidence_pair" &&
      composedMember.working_state.relationships.length === 1 &&
      relationship !== undefined
    ) {
      candidateCorrection = {
        reviewMemberId: composedMember.review_member_id,
        expectedWorkingCandidateRef: {
          working_candidate_id:
            composedMember.working_state.candidate.working_candidate_id,
          revision: composedMember.working_state.candidate.revision,
          content_hash: composedMember.working_state.candidate.content_hash,
        },
        expectedWorkingRelationshipRef: {
          working_relationship_id: relationship.working_relationship_id,
          revision: relationship.revision,
          content_hash: relationship.content_hash,
        },
      };
    }
    if (
      composedMember !== undefined &&
      composedMember.candidate.profile_payload.payload_kind ===
        "scientific_evidence_pair" &&
      composedMember.working_state.relationships.length === 1 &&
      relationship !== undefined
    ) {
      const candidate = composedMember.working_state.candidate;
      const payload = composedMember.candidate.profile_payload;
      const claimRef = candidate.profile_object.object_record_ref;
      const sourceSpanRefs = candidate.basis.flatMap((basis) => {
        const ref = basis.record_ref;
        return ref.schema_name === "petra.source-span" &&
          ref.schema_version === "1.0.0" &&
          ref.revision === 1
          ? [
              {
                schema_name: "petra.source-span" as const,
                schema_version: "1.0.0" as const,
                record_id: ref.record_id,
                revision: 1 as const,
                record_hash: ref.record_hash,
              },
            ]
          : [];
      });
      const presentedSourceBasis = composedMember.basis.filter(
        (basis) =>
          basis.project_source_id !== undefined &&
          basis.project_source_status === "active" &&
          basis.source_span_ref !== undefined,
      );
      const projectSourceIds = new Set(
        presentedSourceBasis.map((basis) => basis.project_source_id),
      );
      const presentedSourceSpanIds = new Set(
        presentedSourceBasis.map((basis) => basis.source_span_ref?.record_id),
      );
      const projectSourceId = [...projectSourceIds][0];
      const sameProjectDefinition =
        candidate.project_definition_ref.project_definition_id ===
          relationship.project_definition_ref.project_definition_id &&
        candidate.project_definition_ref.revision ===
          relationship.project_definition_ref.revision &&
        candidate.project_definition_ref.content_hash ===
          relationship.project_definition_ref.content_hash;
      if (
        candidate.project_id === view.project_id &&
        relationship.project_id === view.project_id &&
        candidate.project_definition_ref.definition_family ===
          "petra.scientific-evidence" &&
        sameProjectDefinition &&
        claimRef.schema_name === "petra.claim" &&
        claimRef.schema_version === "1.0.0" &&
        claimRef.record_id === payload.claim_ref.record_id &&
        claimRef.revision === payload.claim_ref.revision &&
        claimRef.record_hash === payload.claim_ref.record_hash &&
        sourceSpanRefs.length > 0 &&
        projectSourceIds.size === 1 &&
        projectSourceId !== undefined &&
        sourceSpanRefs.every((ref) => presentedSourceSpanIds.has(ref.record_id))
      ) {
        candidateBasisRevision = {
          reviewMemberId: composedMember.review_member_id,
          expectedProjectDefinitionRef: structuredClone(
            candidate.project_definition_ref,
          ),
          expectedWorkingCandidateRef: {
            working_candidate_id: candidate.working_candidate_id,
            revision: candidate.revision,
            content_hash: candidate.content_hash,
          },
          expectedWorkingRelationshipRef: {
            working_relationship_id: relationship.working_relationship_id,
            revision: relationship.revision,
            content_hash: relationship.content_hash,
          },
          expectedClaimRef: {
            schema_name: "petra.claim",
            schema_version: "1.0.0",
            record_id: claimRef.record_id,
            revision: claimRef.revision,
            record_hash: claimRef.record_hash,
          },
          projectSourceId,
          sourceSpanRefs,
        };
      }
    }
  }
  return {
    reviewMemberId: member.review_member_id,
    role: member.member_role,
    outcome: member.outcome,
    candidate: {
      id: member.candidate.candidate_id,
      revision: member.candidate.revision_label,
      kind: displayLabel(member.candidate.kind_label, "Working candidate"),
      current: member.candidate.current,
      proposed: member.candidate.proposed,
      difference: member.candidate.difference,
      origin: member.candidate.origin_label,
      originDetail: member.candidate.origin_detail,
      ...(workingOrigin === undefined ? {} : { workingOrigin }),
    },
    ...(candidateCorrection === undefined ? {} : { candidateCorrection }),
    ...(candidateBasisRevision === undefined ? {} : { candidateBasisRevision }),
    basis: member.basis.map((basis) => ({
      id: basis.basis_id,
      label: displayLabel(basis.label, "Basis item"),
      relation: displayLabel(basis.relation, "Relationship"),
      extent: basis.extent,
      detail: basis.detail,
      ...(basis.project_source_id === undefined
        ? {}
        : { sourceId: basis.project_source_id }),
    })),
    qualifications,
    validation: {
      state: member.validation.state,
      label: member.validation.label,
      detail: member.validation.detail,
      ...(member.validation.recovery === undefined
        ? {}
        : { recovery: member.validation.recovery }),
    },
    consequences: [...member.consequences],
    commitment,
    ...(changeSet === undefined
      ? {}
      : {
          changeSet: {
            id: changeSet.change_set_ref.record_id,
            revision: `Revision ${changeSet.change_set_ref.revision} · ${changeSet.state}`,
            atomicity: changeSet.atomicity,
            changes: [...changeSet.changes],
            protected: [...changeSet.protected],
          },
        }),
  };
};

export const reviewSessionFromView = (
  view: PetraProjectReviewViewRecord,
): ReviewSession => {
  const members = view.content.members.map((_, index) =>
    reviewMemberFromView(view, index),
  );
  const member = members[0];
  if (member === undefined) {
    throw new ProjectDataError("The Review session has no member.", 502);
  }
  return {
    id: view.review_session_id,
    projectId: view.project_id,
    exactRef: {
      revision: view.content.session.revision,
      contentHash: view.content.session.content_hash,
    },
    title: view.content.session.title,
    objective: view.content.session.objective_summary,
    status: view.content.session.status,
    statusLabel: view.content.session.status_label,
    ...(view.schema_version === "1.2.0" || view.schema_version === "1.3.0"
      ? { lifecycle: view.content.session.lifecycle }
      : {}),
    responsible: view.content.session.responsible.display_name,
    snapshot: `Authority event ${view.content.session.snapshot.event_position} · Project stream ${view.content.session.snapshot.stream_revision}${view.content.session.snapshot_state === "stale" ? " · stale" : ""}`,
    snapshotState: view.content.session.snapshot_state,
    returnLabel: view.content.session.return_context.label,
    returnPath: reviewReturnPath(view),
    reviewMemberId: member.reviewMemberId,
    memberRole: member.role,
    memberOutcome: member.outcome,
    members,
    candidate: member.candidate,
    ...(member.candidateCorrection === undefined
      ? {}
      : { candidateCorrection: member.candidateCorrection }),
    ...(member.candidateBasisRevision === undefined
      ? {}
      : { candidateBasisRevision: member.candidateBasisRevision }),
    basis: member.basis,
    qualifications: member.qualifications,
    validation: member.validation,
    consequences: member.consequences,
    commitment: member.commitment,
    ...(member.changeSet === undefined ? {} : { changeSet: member.changeSet }),
  };
};

const graphPosition = (
  kind: PetraProjectRelationshipView["content"]["nodes"][number]["object_kind"],
  index: number,
): { x: number; y: number } => {
  const positions = {
    work: { x: 18, y: 18 },
    work_version: { x: 40, y: 26 },
    claim: { x: 63, y: 43 },
    source_span: { x: 55 + (index % 2) * 20, y: 67 },
    artifact: { x: 30 + (index % 3) * 24, y: 87 },
  } as const;
  return positions[kind];
};

export const graphQuestionFromView = (
  view: PetraProjectRelationshipView,
): GraphQuestion => {
  const assertion = view.content.relationships.find(
    (relationship) => relationship.predicate === "ASSERTS",
  );
  if (
    assertion === undefined ||
    !view.content.nodes.some(
      (node) => node.node_ref.record_id === assertion.target_id,
    )
  ) {
    throw new ProjectDataError(
      "Petra returned a relationship view without its selected Claim node.",
      502,
    );
  }
  const { authority, projection } = view.content.position;
  const unavailable = "Unavailable in the current M1 relationship view";
  return {
    id: view.content.query.request_hash,
    projectId: view.project_id,
    question: view.content.query.question,
    focusNodeId: assertion.target_id,
    scope: view.content.query.scope,
    completeness: `${view.content.completeness.scope} ${view.content.completeness.omissions.join(" ")}`,
    authoritativeSnapshot: `Authority event ${authority.event_position} · Project stream ${authority.stream_revision}`,
    representedSnapshot: `Represented event ${projection.represented_event_position} · Project stream ${projection.represented_stream_revision} · graph target ${projection.represented_target_sequence}`,
    historicalSnapshot: unavailable,
    workingRevision: unavailable,
    projectionState:
      projection.state === "blocked" ? "unavailable" : projection.state,
    projectionDetail: projection.detail,
    layerAvailability: {
      current: { available: true, label: "Current" },
      working: { available: false, label: unavailable },
      historical: { available: false, label: unavailable },
    },
    nodes: view.content.nodes.map((node, index) => ({
      id: node.node_ref.record_id,
      label: node.label,
      kind: titleCase(node.object_kind),
      summary: node.summary,
      basis: node.basis,
      ...(node.source_destination === undefined
        ? {}
        : { sourceId: node.source_destination.project_source_id }),
      layers: ["current"],
      position: graphPosition(node.object_kind, index),
    })),
    edges: view.content.relationships.map((relationship) => ({
      id: relationship.relationship_ref.element_id,
      from: relationship.source_id,
      to: relationship.target_id,
      label: relationship.label,
      summary: relationship.summary,
      basis: relationship.basis,
      layers: ["current"],
      tone: "neutral",
    })),
  };
};

const overlayGraphPosition = (index: number): { x: number; y: number } => ({
  x: 17 + (index % 4) * 22,
  y: 16 + Math.floor(index / 4) * 22,
});

const overlayGraphError = (): ProjectDataError =>
  new ProjectDataError(
    "Petra returned a relationship overlay whose rendered and textual members do not match.",
    502,
  );

const overlayExclusionLabel = (
  exclusion: PetraProjectRelationshipOverlayView["content"]["completeness"]["exclusions"][number],
): string =>
  exclusion.reason === "not_referenced_by_selected_relationship"
    ? "Working candidates excluded because no selected relationship references them"
    : "Working relationships excluded because they are outside the authoritative path";

export const graphQuestionFromOverlayView = (
  view: PetraProjectRelationshipOverlayView,
): GraphQuestion => {
  const nodeByKey = new Map(
    view.content.nodes.map((node) => [node.node_key, node]),
  );
  const relationshipByKey = new Map(
    view.content.relationships.map((relationship) => [
      relationship.relationship_key,
      relationship,
    ]),
  );
  const focusNodeMatches = view.content.nodes.filter(
    (node) =>
      node.layer === "current" &&
      node.owner.record_ref.record_id ===
        view.content.query.authoritative_focus_ref.record_id &&
      node.owner.record_ref.revision ===
        view.content.query.authoritative_focus_ref.revision &&
      node.owner.record_ref.record_hash ===
        view.content.query.authoritative_focus_ref.record_hash,
  );
  const focusRelationshipMatches = view.content.relationships.filter(
    (relationship) =>
      relationship.layer === "current" &&
      relationship.owner.relationship_ref.element_id ===
        view.content.query.authoritative_focus_ref.record_id &&
      relationship.owner.relationship_ref.revision ===
        view.content.query.authoritative_focus_ref.revision &&
      relationship.owner.relationship_ref.record_hash ===
        view.content.query.authoritative_focus_ref.record_hash,
  );
  const focusNodeKey =
    focusNodeMatches.length === 1 && focusRelationshipMatches.length === 0
      ? focusNodeMatches[0]?.node_key
      : focusNodeMatches.length === 0 && focusRelationshipMatches.length === 1
        ? focusRelationshipMatches[0]?.target_node_key
        : undefined;
  const focusNode =
    focusNodeKey === undefined ? undefined : nodeByKey.get(focusNodeKey);
  const boundary = view.content.authority_boundary;
  const hasExactMembers =
    nodeByKey.size === view.content.nodes.length &&
    relationshipByKey.size === view.content.relationships.length &&
    view.content.completeness.returned_nodes === view.content.nodes.length &&
    view.content.completeness.returned_relationships ===
      view.content.relationships.length &&
    view.content.completeness.returned_nodes ===
      view.content.completeness.authoritative_nodes +
        view.content.completeness.returned_working_candidate_revisions &&
    view.content.completeness.returned_relationships ===
      view.content.completeness.authoritative_relationships +
        view.content.completeness.returned_working_relationships &&
    view.content.textual_peer.nodes.length === view.content.nodes.length &&
    view.content.textual_peer.relationships.length ===
      view.content.relationships.length;
  const hasExactBoundary =
    boundary.working_domain_authority === false &&
    boundary.working_review_decision === false &&
    boundary.working_mutation_authority === false &&
    boundary.validation_grants_authority === false &&
    boundary.visibility_grants_authority === false &&
    boundary.selection_grants_authority === false &&
    boundary.projection_grants_authority === false &&
    boundary.promotion_requires_review === true &&
    boundary.layout_client_local === true &&
    boundary.focus_client_local === true &&
    boundary.disclosure_client_local === true &&
    boundary.comparison_selection_client_local === true &&
    boundary.navigation_history_client_local === true;

  if (
    focusNode === undefined ||
    focusNode.layer !== "current" ||
    !hasExactMembers ||
    !hasExactBoundary
  ) {
    throw overlayGraphError();
  }

  for (const relationship of view.content.relationships) {
    const source = nodeByKey.get(relationship.source_node_key);
    const target = nodeByKey.get(relationship.target_node_key);
    if (source === undefined || target === undefined) {
      throw overlayGraphError();
    }
    if (
      relationship.layer === "working" &&
      (target.layer !== "working" ||
        target.endpoint_posture !== relationship.target_endpoint_posture)
    ) {
      throw overlayGraphError();
    }
  }

  for (const textNode of view.content.textual_peer.nodes) {
    const node = nodeByKey.get(textNode.node_key);
    if (
      node === undefined ||
      node.layer !== textNode.layer ||
      node.object_term !== textNode.object_term ||
      node.label !== textNode.label ||
      node.summary !== textNode.summary ||
      node.basis !== textNode.basis
    ) {
      throw overlayGraphError();
    }
  }

  for (const textRelationship of view.content.textual_peer.relationships) {
    const relationship = relationshipByKey.get(
      textRelationship.relationship_key,
    );
    const source = nodeByKey.get(textRelationship.source_node_key);
    const target = nodeByKey.get(textRelationship.target_node_key);
    if (
      relationship === undefined ||
      source === undefined ||
      target === undefined ||
      relationship.layer !== textRelationship.layer ||
      relationship.source_node_key !== textRelationship.source_node_key ||
      relationship.target_node_key !== textRelationship.target_node_key ||
      relationship.direction !== textRelationship.direction ||
      relationship.label !== textRelationship.label ||
      relationship.summary !== textRelationship.summary ||
      relationship.meaning !== textRelationship.meaning ||
      relationship.scope !== textRelationship.scope ||
      relationship.basis !== textRelationship.basis ||
      source.label !== textRelationship.source_label ||
      target.label !== textRelationship.target_label
    ) {
      throw overlayGraphError();
    }
  }

  const { authoritative, working } = view.content.positions;
  const projection = authoritative.projection;
  const unavailableHistorical =
    "Historical authority is unavailable in this result.";
  const endpointLabels = view.content.profile.endpoint_posture_labels;
  return {
    id: view.content.query.request_hash,
    projectId: view.project_id,
    question: view.content.query.question,
    focusNodeId: focusNode.node_key,
    scope: view.content.query.scope,
    completeness: view.content.completeness.scope,
    authoritativeSnapshot: `Authority event ${authoritative.authority.event_position} · Project stream ${authoritative.authority.stream_revision}`,
    representedSnapshot: `Projection ${projection.state} · represented event ${projection.represented_event_position} · Project stream ${projection.represented_stream_revision} · graph target ${projection.represented_target_sequence} · observed event ${projection.observed_event_position} · observed stream ${projection.observed_stream_revision} · observed graph target ${projection.observed_target_sequence} · checkpoint ${projection.checkpoint_ref.record_id} revision ${projection.checkpoint_ref.revision} · ${projection.pending_records} pending`,
    historicalSnapshot: unavailableHistorical,
    workingRevision: `Working snapshot ${working.snapshot_ref.content_hash} · read ${working.snapshot_ref.read_at} · based on authority event ${working.base_authority.event_position} · Project stream ${working.base_authority.stream_revision}`,
    projectionState:
      projection.state === "blocked" ? "unavailable" : projection.state,
    projectionDetail: projection.detail,
    layerLabels: {
      current: view.content.profile.layer_labels.current,
      working: view.content.profile.layer_labels.working,
      historical: "Historical",
    },
    positionLabels: {
      current: `Represented event ${projection.represented_event_position} · Project stream ${projection.represented_stream_revision}`,
      working: `Working snapshot · based on authority event ${working.base_authority.event_position} · Project stream ${working.base_authority.stream_revision}`,
      historical: unavailableHistorical,
    },
    layerCounts: {
      current: {
        objects: view.content.completeness.authoritative_nodes,
        relationships: view.content.completeness.authoritative_relationships,
        objectLayers: {
          current: view.content.completeness.authoritative_nodes,
        },
      },
      working: {
        objects: view.content.completeness.returned_nodes,
        relationships: view.content.completeness.returned_relationships,
        objectLayers: {
          current: view.content.completeness.authoritative_nodes,
          working:
            view.content.completeness.returned_working_candidate_revisions,
        },
      },
      historical: { objects: 0, relationships: 0 },
    },
    layerAvailability: {
      current: {
        available: view.content.capabilities.current === "available",
        label: view.content.profile.layer_labels.current,
      },
      working: {
        available: view.content.capabilities.working === "available",
        label: view.content.profile.layer_labels.working,
      },
      historical: { available: false, label: unavailableHistorical },
    },
    resultCounts: [
      {
        label: "Authoritative objects",
        value: view.content.completeness.authoritative_nodes,
      },
      {
        label: "Authoritative relationships",
        value: view.content.completeness.authoritative_relationships,
      },
      {
        label: "Current working candidate heads",
        value: view.content.completeness.current_working_candidate_heads,
      },
      {
        label: "Current working relationship heads",
        value: view.content.completeness.current_working_relationship_heads,
      },
      {
        label: "Returned working candidate revisions",
        value: view.content.completeness.returned_working_candidate_revisions,
      },
      {
        label: "Returned working relationships",
        value: view.content.completeness.returned_working_relationships,
      },
      {
        label: "Referenced earlier working candidate revisions",
        value:
          view.content.completeness
            .referenced_non_current_working_candidate_revisions,
      },
      {
        label: "Returned objects",
        value: view.content.completeness.returned_nodes,
      },
      {
        label: "Returned relationships",
        value: view.content.completeness.returned_relationships,
      },
      ...view.content.completeness.exclusions.map((exclusion) => ({
        label: overlayExclusionLabel(exclusion),
        value: exclusion.count,
      })),
    ],
    omissions: [...view.content.completeness.omissions],
    limitations: [...view.content.limitations],
    authorityBoundary:
      "Working records are not Project authority. Validation, visibility, selection, and projection do not grant authority; promotion requires Review.",
    nodes: view.content.nodes.map((node, index) => ({
      id: node.node_key,
      label: node.label,
      kind: displayLabel(node.object_term, "Item"),
      summary: node.summary,
      basis: node.basis,
      ...(node.layer === "current" && node.source_destination !== undefined
        ? { sourceId: node.source_destination.project_source_id }
        : {}),
      semanticLayer: node.layer,
      ...(node.layer === "working"
        ? {
            endpointPosture: endpointLabels[node.endpoint_posture],
            validationSummary: node.validation_summary,
          }
        : {}),
      layers: node.layer === "current" ? ["current", "working"] : ["working"],
      position: overlayGraphPosition(index),
    })),
    edges: view.content.relationships.map((relationship) => ({
      id: relationship.relationship_key,
      from: relationship.source_node_key,
      to: relationship.target_node_key,
      label: overlayRelationshipLabel(relationship),
      summary: relationship.summary,
      basis: relationship.basis,
      meaning: relationship.meaning,
      scope: relationship.scope,
      direction: relationship.direction,
      semanticLayer: relationship.layer,
      ...(relationship.layer === "working"
        ? {
            endpointPosture:
              endpointLabels[relationship.target_endpoint_posture],
            validationSummary: relationship.validation_summary,
          }
        : {}),
      layers:
        relationship.layer === "current" ? ["current", "working"] : ["working"],
      tone: relationship.layer === "working" ? "working" : "neutral",
    })),
    textualPeer: {
      title: view.content.textual_peer.title,
      scope: view.content.textual_peer.scope,
      completeness: view.content.textual_peer.completeness,
      nodes: view.content.textual_peer.nodes.map((textNode) => {
        const node = nodeByKey.get(textNode.node_key)!;
        return {
          id: textNode.node_key,
          layer: textNode.layer,
          kind: displayLabel(textNode.object_term, "Item"),
          label: textNode.label,
          summary: textNode.summary,
          basis: textNode.basis,
          ...(node.layer === "working"
            ? {
                endpointPosture: endpointLabels[node.endpoint_posture],
                validationSummary: node.validation_summary,
              }
            : {}),
        };
      }),
      relationships: view.content.textual_peer.relationships.map(
        (textRelationship) => {
          const relationship = relationshipByKey.get(
            textRelationship.relationship_key,
          )!;
          return {
            id: textRelationship.relationship_key,
            layer: textRelationship.layer,
            from: textRelationship.source_node_key,
            fromLabel: textRelationship.source_label,
            direction: textRelationship.direction,
            label: overlayRelationshipLabel(relationship),
            to: textRelationship.target_node_key,
            toLabel: textRelationship.target_label,
            summary: textRelationship.summary,
            meaning: textRelationship.meaning,
            scope: textRelationship.scope,
            basis: textRelationship.basis,
            ...(relationship.layer === "working"
              ? {
                  endpointPosture:
                    endpointLabels[relationship.target_endpoint_posture],
                  validationSummary: relationship.validation_summary,
                }
              : {}),
          };
        },
      ),
      omissions: [...view.content.textual_peer.omissions],
    },
  };
};

const projectCollectionPageFromView = (
  value: unknown,
): ProjectCollectionPage => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-shell-collection-view" ||
    value.schema_version !== "1.0.0" ||
    !isRecord(value.content) ||
    !Array.isArray(value.content.projects) ||
    !isRecord(value.content.page) ||
    value.content.page.returned_count !== value.content.projects.length
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project collection.",
      502,
    );
  }
  const collection = value as unknown as PetraProjectShellCollectionView;
  return {
    projects: collection.content.projects.map((project) =>
      projectRecordFromShellView(shellView(project)),
    ),
    query: structuredClone(collection.content.query),
    page: structuredClone(collection.content.page),
  };
};

export interface ProjectCollectionPage {
  readonly projects: ProjectRecord[];
  readonly query: PetraProjectShellCollectionView["content"]["query"];
  readonly page: PetraProjectShellCollectionView["content"]["page"];
}

export const searchProjectCollection = async (
  request: ProjectShellCollectionRequest = {},
): Promise<ProjectCollectionPage> => {
  const { ProjectShellClient } = await import("@petra/adapters");
  const collection = await new ProjectShellClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    fetch: (input, init) => fetch(input, init),
  }).search(request);
  return projectCollectionPageFromView(collection);
};

export const loadProjectCollection = async (): Promise<ProjectRecord[]> => {
  const value = await requestJson("/api/queries/projects");
  return projectCollectionPageFromView(value).projects;
};

const projectResumeBriefPath = (projectId: string, state: string): string => {
  const query = new URLSearchParams({ projectResume: state });
  return `/projects/${encodeURIComponent(projectId)}/brief?${query}#project-resume-outcome`;
};

const projectResumeReturnPath = (
  projectId: string,
  request: FocusedGraphReadRequest,
): string => {
  const root = `/projects/${encodeURIComponent(projectId)}`;
  const destination = request.return_destination;
  if (destination.state === "unavailable") {
    return projectResumeBriefPath(projectId, "return-unavailable");
  }
  const targetId = encodeURIComponent(destination.target_ref.record_id);
  if (destination.destination_kind === "brief") return `${root}/brief`;
  if (destination.destination_kind === "source_inspection") {
    return `${root}/sources/${targetId}`;
  }
  if (destination.destination_kind === "review") {
    return `${root}/review/${targetId}`;
  }
  if (destination.destination_kind === "history") {
    return `${root}/history/${targetId}`;
  }
  if (destination.destination_kind === "work") {
    return `${root}/work/${targetId}`;
  }
  const query = new URLSearchParams({
    semanticKey: request.object_semantic_key,
    objectId: destination.target_ref.record_id,
    revision: String(destination.target_ref.revision),
    taskIntent: "inspect",
    recordHash: destination.target_ref.record_hash,
  });
  return `${root}/locate?${query}`;
};

export const projectResumeEntry = (
  projectId: string,
  retained: NonNullable<ProjectRecord["resume"]>["retained_task"],
): FocusedGraphEntry => {
  if (retained === undefined) {
    throw new ProjectDataError(
      "Petra marked Project resume available without an exact retained task.",
      502,
    );
  }
  const request = parseFocusedGraphViewRequest(retained.request);
  if (
    retained.task_kind !== "focused_graph" ||
    retained.label !== request.question ||
    canonicalize(retained.origin) !== canonicalize(request.origin) ||
    canonicalize(retained.return_destination) !==
      canonicalize(request.return_destination) ||
    !retained.focus_refs.some(
      (focus) => canonicalize(focus) === canonicalize(request.focus_ref),
    ) ||
    request.temporal_position.position_kind !== "current"
  ) {
    throw new ProjectDataError(
      "Petra returned an incompatible retained Project task. No client identity was reconstructed.",
      502,
    );
  }
  return {
    project_id: projectId,
    request_id: request.request_id,
    question: request.question,
    focus_ref: structuredClone(request.focus_ref),
    origin: structuredClone(retained.origin),
    project_definition_ref: structuredClone(request.project_definition_ref),
    task_semantic_key: request.task_semantic_key,
    object_semantic_key: request.object_semantic_key,
    relationship_semantic_key: request.relationship_semantic_key,
    return_action_semantic_key: request.return_action_semantic_key,
    return_destination: structuredClone(retained.return_destination),
    limits: structuredClone(request.limits),
    semantic_layer: request.semantic_layer,
    presentation: "position",
    ...(request.expected_snapshot === undefined
      ? {}
      : { expected_snapshot: structuredClone(request.expected_snapshot) }),
    return_context: {
      path: projectResumeReturnPath(projectId, request),
      label:
        retained.return_destination.state === "available"
          ? retained.return_destination.label
          : "current Brief",
    },
  };
};

export const loadProjectResume = async (
  args: LoaderFunctionArgs,
): Promise<FocusedGraphRouteData | Response> => {
  const projectId = requiredRouteIdentity(
    args.params.projectId,
    "A Project ID",
  );
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/shell`,
  );
  const view = shellView(value);
  if (
    view.project_id !== projectId ||
    (view.schema_version !== "1.2.0" && view.schema_version !== "1.3.0")
  ) {
    throw new ProjectDataError(
      "Project resume requires a Project shell read with exact retained-task context.",
      502,
    );
  }
  const resume = view.content.resume;
  if (resume.state !== "available") {
    return redirect(projectResumeBriefPath(projectId, resume.state));
  }
  const retained = resume.retained_task;
  if (retained === undefined) {
    throw new ProjectDataError(
      "Petra marked Project resume available without an exact retained task.",
      502,
    );
  }
  const request = parseFocusedGraphViewRequest(retained.request);
  const entry = projectResumeEntry(projectId, retained);
  const brief = await readProjectBrief({
    projectId,
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    signal: args.request.signal,
  });
  const definition = brief.content.definition;
  let graph;
  try {
    graph = await new FocusedGraphClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
      projectDefinition: definition,
    }).read(projectId, structuredClone(request));
  } catch (error) {
    if (error instanceof FocusedGraphClientError) {
      return redirect(projectResumeBriefPath(projectId, "read-failed"));
    }
    throw error;
  }
  if (
    graph.schema_name !== retained.expected_graph.schema_name ||
    graph.schema_version !== retained.expected_graph.schema_version ||
    graph.content_hash !== retained.expected_graph.content_hash
  ) {
    return redirect(projectResumeBriefPath(projectId, "read-stale"));
  }
  if (retained.selection.state === "selected") {
    const selectionMatches = retained.selection.selected_keys.every((key) =>
      retained.selection.state !== "selected"
        ? false
        : retained.selection.selection_kind === "node"
          ? graph.content.nodes.some((node) => node.node_key === key)
          : retained.selection.selection_kind === "relationship"
            ? graph.content.relationships.some(
                (relationship) => relationship.relationship_key === key,
              )
            : graph.content.paths.some((path) => path.path_key === key),
    );
    if (!selectionMatches) {
      return redirect(projectResumeBriefPath(projectId, "selection-stale"));
    }
  }
  return {
    kind: "focused_graph",
    entry,
    definition,
    request: structuredClone(request),
    view: graph,
    resume: {
      label: retained.label,
      retainedAt: retained.retained_at,
      selection: structuredClone(retained.selection),
      origin: structuredClone(retained.origin),
      focusRefs: structuredClone(retained.focus_refs),
      recovery: structuredClone(resume.recovery),
    },
  };
};

const projectProfileClient = (): ProjectProfileClient =>
  new ProjectProfileClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    fetch: (input, init) => fetch(input, init),
  });

const projectDefinitionDraftClient = (): ProjectDefinitionDraftClient =>
  new ProjectDefinitionDraftClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    fetch: (input, init) => fetch(input, init),
  });

export interface ProjectCollectionData extends ProjectCollectionPage {
  readonly profiles: PetraRegisteredProjectProfile[];
}

export const loadProjectProfiles = async (): Promise<
  PetraRegisteredProjectProfile[]
> => projectProfileClient().listProfiles();

export const loadProjectsHome = async (): Promise<ProjectCollectionData> => {
  const [collection, profiles] = await Promise.all([
    searchProjectCollection({ limit: 12 }),
    loadProjectProfiles().catch(() => []),
  ]);
  return { ...collection, profiles };
};

export interface ProjectDefinitionDraftInput {
  readonly outcome: string;
  readonly projectName?: string;
  readonly example?: PetraRegisteredProjectProfile;
  readonly initialMaterial?: readonly ProjectDefinitionDraftInitialMaterial[];
}

export const projectDefinitionInitialMaterialFromFiles = async (
  files: readonly File[],
): Promise<ProjectDefinitionDraftInitialMaterial[]> =>
  Promise.all(
    files.map(async (file) => {
      if (file.size === 0 || file.size > 32 * 1024 * 1024) {
        throw new ProjectDataError(
          `${file.name || "An initial file"} must contain bytes and be no larger than 32 MiB.`,
          400,
        );
      }
      const digest = new Uint8Array(
        await globalThis.crypto.subtle.digest(
          "SHA-256",
          await file.arrayBuffer(),
        ),
      );
      return {
        material_id: `initial_material_${randomUlidPayload()}`,
        filename: file.name,
        media_type: file.type || "application/octet-stream",
        byte_size: file.size,
        content_hash: `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
      };
    }),
  );

export const createProjectDefinitionDraftRequest = (
  input: ProjectDefinitionDraftInput,
): PetraProjectDefinitionDraftRequest => ({
  schema_name: "petra.project-definition-draft-request",
  schema_version: "1.0.0",
  request_id: `definition_draft_request_${randomUlidPayload()}`,
  outcome: input.outcome,
  ...(input.projectName === undefined || input.projectName.length === 0
    ? {}
    : { project_name: input.projectName }),
  ...(input.example === undefined
    ? {}
    : {
        example_ref: {
          profile_id: input.example.profile_id,
          profile_version: input.example.profile_version,
          content_hash: input.example.content_hash,
        },
      }),
  ...(input.initialMaterial === undefined
    ? {}
    : {
        initial_material: structuredClone(input.initialMaterial) as Exclude<
          PetraProjectDefinitionDraftRequest["initial_material"],
          undefined
        >,
      }),
});

export const draftProjectDefinition = async (
  request: PetraProjectDefinitionDraftRequest,
): Promise<PetraProjectDefinitionDraftView> =>
  projectDefinitionDraftClient().draft(request);

export const createProjectDefinitionDraftCommandRequest = (
  draft: PetraProjectDefinitionDraftView,
): PetraProjectDefinitionDraftCommandRequest => {
  const identity = randomUlidPayload();
  return {
    schema_name: "petra.project-definition-draft-command-request",
    schema_version: "1.0.0",
    command_id: `command_${identity}`,
    idempotency_key: `project-definition-draft:create:${identity}`,
    draft: structuredClone(draft),
    accepted_assumption_codes: draft.content.assumptions.map(
      (assumption) => assumption.code,
    ) as PetraProjectDefinitionDraftCommandRequest["accepted_assumption_codes"],
  };
};

export const createProjectFromDefinitionDraft = async (
  request: PetraProjectDefinitionDraftCommandRequest,
): Promise<PetraProjectDefinitionDraftCommandReceipt> =>
  projectDefinitionDraftClient().create(request);

export const loadProjectTaxonomy = async ({
  params,
}: LoaderFunctionArgs): Promise<PetraProjectProfileTaxonomyView> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  return projectProfileClient().readProjectTaxonomy(projectId);
};

export interface ProjectProfileCommandInput {
  readonly profile: PetraRegisteredProjectProfile;
  readonly project: {
    readonly name: string;
    readonly description?: string;
  };
  readonly objective: string;
  readonly commandId?: string;
  readonly idempotencyKey?: string;
}

export interface ProjectProfileCommandIdentity {
  readonly commandId: string;
  readonly idempotencyKey: string;
}

export const createProjectProfileCommandIdentity = (
  operation: "create" | "reset",
): ProjectProfileCommandIdentity => {
  const identity = randomUlidPayload();
  return {
    commandId: `command_${identity}`,
    idempotencyKey: `project-profile:${operation}:${identity}`,
  };
};

export const createProjectProfileCommandRequest = (
  operation: "create" | "reset",
  input: ProjectProfileCommandInput,
  expectedProject?: { readonly projectId: string; readonly revision: number },
): PetraProjectProfileCommandRequest => {
  const identity = createProjectProfileCommandIdentity(operation);
  return {
    schema_name: "petra.project-profile-command-request",
    schema_version: "1.0.0",
    command_id: input.commandId ?? identity.commandId,
    idempotency_key: input.idempotencyKey ?? identity.idempotencyKey,
    operation,
    profile_ref: {
      profile_id: input.profile.profile_id,
      profile_version: input.profile.profile_version,
      content_hash: input.profile.content_hash,
    },
    ...(expectedProject === undefined
      ? {}
      : {
          expected_project: {
            project_id: expectedProject.projectId,
            revision: expectedProject.revision,
          },
        }),
    project: {
      name: input.project.name,
      ...(input.project.description === undefined ||
      input.project.description.length === 0
        ? {}
        : { description: input.project.description }),
    },
    objective: { statement: input.objective },
  };
};

export const createProjectWithProfile = async (
  input: ProjectProfileCommandInput,
): Promise<PetraProjectProfileCommandReceipt> =>
  projectProfileClient().createProject(
    createProjectProfileCommandRequest("create", input),
  );

export const resetProjectWithProfile = async (
  projectId: string,
  revision: number,
  input: ProjectProfileCommandInput,
): Promise<PetraProjectProfileCommandReceipt> =>
  projectProfileClient().resetProject(
    projectId,
    createProjectProfileCommandRequest("reset", input, {
      projectId,
      revision,
    }),
  );

export const assessProjectProfileCommandRecovery = async (
  request: PetraProjectProfileCommandRequest,
): Promise<PetraProjectProfileCommandRecoveryView> =>
  projectProfileClient().assessProjectRecovery(request);

export const executeProjectProfileCommandRequest = async (
  request: PetraProjectProfileCommandRequest,
): Promise<PetraProjectProfileCommandReceipt> =>
  request.operation === "create"
    ? projectProfileClient().createProject(request)
    : projectProfileClient().resetProject(
        request.expected_project?.project_id ?? "",
        request,
      );

export const loadProjectRecord = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ProjectRecord> => {
  if (params.projectId === undefined || params.projectId.length === 0) {
    throw new ProjectDataError("A Project ID is required.", 400);
  }
  const projectId = params.projectId;
  const requestUrl = new URL(request.url);
  const incoming = requestUrl.searchParams;
  const semanticKey = incoming.get("semanticKey");
  const pathParts = requestUrl.pathname.split("/").filter(Boolean);
  const objectPathSegment =
    pathParts.length === 4 &&
    (pathParts[2] === "sources" ||
      pathParts[2] === "work" ||
      pathParts[2] === "composition")
      ? pathParts[2]
      : undefined;
  const pathObjectId =
    objectPathSegment === undefined ? undefined : pathParts[3];
  const selected =
    incoming.get("selected") ??
    params.sourceId ??
    params.workId ??
    params.artifactId ??
    pathObjectId ??
    null;
  const revision = incoming.get("revision");
  const recordHash = incoming.get("recordHash");
  const hasExactSelection =
    semanticKey !== null &&
    selected !== null &&
    revision !== null &&
    recordHash !== null;
  const hasExactSelectionMetadata =
    semanticKey !== null || revision !== null || recordHash !== null;
  if (hasExactSelectionMetadata && !hasExactSelection) {
    throw new ProjectDataError(
      "An exact Project selection requires semantic key, object identity, revision, and record hash together.",
      400,
    );
  }
  if (
    hasExactSelection &&
    pathObjectId !== undefined &&
    selected !== pathObjectId
  ) {
    throw new ProjectDataError(
      "The exact Workspace selection does not match the object in this Project URL.",
      400,
    );
  }
  const automaticSelection =
    !hasExactSelectionMetadata && pathObjectId !== undefined
      ? objectPathSegment === "sources" &&
        /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u.test(pathObjectId)
        ? {
            semanticKey: "petra.project-source",
            objectId: pathObjectId,
            role: "sources",
          }
        : objectPathSegment === "work" &&
            /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u.test(pathObjectId)
          ? {
              semanticKey: "petra.work-unit",
              objectId: pathObjectId,
              role: "work",
            }
          : objectPathSegment === "composition" &&
              /^draft_artifact_[0-9A-HJKMNP-TV-Z]{26}$/u.test(pathObjectId)
            ? {
                semanticKey: "petra.draft-artifact",
                objectId: pathObjectId,
                role: "composition",
              }
            : undefined
      : undefined;
  const query = new URLSearchParams();
  if (hasExactSelection) {
    query.set("semanticKey", semanticKey);
    query.set("objectId", selected);
    query.set("revision", revision);
    query.set("taskIntent", "inspect");
  } else if (automaticSelection !== undefined) {
    query.set("semanticKey", automaticSelection.semanticKey);
    query.set("objectId", automaticSelection.objectId);
    query.set("taskIntent", "inspect");
  }
  const suffix = query.size === 0 ? "" : `?${query}`;
  const view =
    query.size > 0
      ? shellView(
          await requestJson(
            `/api/queries/projects/${encodeURIComponent(params.projectId)}/shell${suffix}`,
          ),
        )
      : await (async (): Promise<ProjectShellView> => {
          const { ProjectShellClient } = await import("@petra/adapters");
          return new ProjectShellClient({
            baseUrl: apiBaseUrl(),
            token: apiToken(),
            fetch: (input, init) => fetch(input, init),
          }).open(projectId);
        })();
  if (hasExactSelection) {
    if (
      view.schema_version === "1.0.0" ||
      view.content.selection === undefined ||
      !("resolved_ref" in view.content.selection.resolution) ||
      view.content.selection.resolution.resolved_ref.semantic_key !==
        semanticKey ||
      view.content.selection.resolution.resolved_ref.object_id !== selected ||
      view.content.selection.resolution.resolved_ref.revision !==
        Number(revision) ||
      view.content.selection.resolution.resolved_ref.record_hash !== recordHash
    ) {
      throw new ProjectDataError(
        "Petra could not reproduce the exact selected object in the Project shell snapshot.",
        502,
      );
    }
  }
  if (automaticSelection !== undefined) {
    if (
      view.schema_version === "1.0.0" ||
      view.content.selection === undefined ||
      view.content.selection.primary_destination.role !==
        automaticSelection.role ||
      view.content.selection.resolution.requested_ref.semantic_key !==
        automaticSelection.semanticKey ||
      view.content.selection.resolution.requested_ref.object_id !==
        automaticSelection.objectId ||
      !("resolved_ref" in view.content.selection.resolution)
    ) {
      throw new ProjectDataError(
        "Petra could not verify this Workspace object and its server-owned destination in the Project shell snapshot.",
        409,
      );
    }
  }
  return projectRecordFromShellView(view);
};

export interface ProjectBriefData {
  readonly briefView?: PetraProjectBriefReadView;
  readonly objectiveCommandContext?: ProjectObjectiveCommandContext;
  readonly profileStartingBrief?: ProjectProfileStartingBrief;
  readonly comparisonRecovery?: ProjectBriefComparisonRecovery;
  readonly suggestedAction?: PetraSuggestedActionView;
  readonly suggestedWorkAction?: PetraSuggestedActionViewV11;
  readonly invokedInquiry?: PetraProjectInquiryView;
}

export interface ProjectProfileStartingBrief {
  readonly projectRef: {
    readonly projectId: string;
    readonly revision: number;
  };
  readonly projectDefinitionRef: {
    readonly projectDefinitionId: string;
    readonly revision: number;
    readonly contentHash: string;
  };
  readonly objectiveRef: {
    readonly objectiveId: string;
    readonly revision: number;
    readonly contentHash: string;
  };
  readonly limitation: string;
}

export interface ProjectBriefComparisonRecovery {
  readonly state: "unavailable" | "stale";
  readonly eventId: string;
  readonly reason: string;
}

const objectiveCommandContextFromCurrentBrief = async (
  projectId: string,
  brief: PetraProjectBriefReadView,
  controls: PetraProjectEffectiveControlsView,
): Promise<ProjectObjectiveCommandContext> => {
  const content = brief.content;
  const project = content.shell.content.project;
  const shellDefinition = content.shell.content.definition;
  const shellObjective = content.shell.content.current_objective;
  const definitionRef = controls.content.project_definition_ref;
  const objective = content.objective;
  const term = content.definition.content.terms.find(
    (candidate) => candidate.semantic_key === objective.content.objective_kind,
  );
  const [definitionRecordHash, objectiveRecordHash] = await Promise.all([
    projectObjectiveCanonicalHash(content.definition),
    projectObjectiveCanonicalHash(objective),
  ]);
  if (
    brief.project_id !== projectId ||
    project.project_id !== projectId ||
    controls.project_id !== projectId ||
    controls.content.project_ref.record_id !== projectId ||
    controls.content.project_ref.revision !== project.revision ||
    definitionRef.project_definition_id !==
      content.definition.project_definition_id ||
    definitionRef.revision !== content.definition.revision ||
    definitionRef.content_hash !== content.definition.content_hash ||
    definitionRef.record_hash !== definitionRecordHash ||
    shellDefinition.project_definition_id !==
      content.definition.project_definition_id ||
    shellDefinition.revision !== content.definition.revision ||
    shellDefinition.content_hash !== content.definition.content_hash ||
    objective.project_id !== projectId ||
    objective.project_definition_ref.project_definition_id !==
      definitionRef.project_definition_id ||
    objective.project_definition_ref.revision !== definitionRef.revision ||
    objective.project_definition_ref.content_hash !==
      definitionRef.content_hash ||
    shellObjective === undefined ||
    shellObjective.objective_id !== objective.objective_id ||
    shellObjective.revision !== objective.revision ||
    shellObjective.content_hash !== objective.content_hash ||
    term === undefined
  ) {
    throw new ProjectDataError(
      "The Brief cannot bind Objective review to one exact current Project, ProjectDefinition, focus, and registered term. Refresh before editing.",
      409,
    );
  }
  return {
    projectId,
    projectName: project.name,
    definitionLabel: content.definition.content.label,
    projectRef: {
      project_id: projectId,
      revision: controls.content.project_ref.revision,
      record_hash: controls.content.project_ref.record_hash,
    },
    projectDefinitionRef: structuredClone(definitionRef),
    focus: {
      state: "focused",
      objective: structuredClone(objective),
      objectiveRecordHash,
      term: term.singular,
    },
  };
};

const objectiveCommandContextFromEmptyShell = (
  projectId: string,
  shell: ProjectShellView,
  controls: PetraProjectEffectiveControlsView,
): ProjectObjectiveCommandContext => {
  const project = shell.content.project;
  const definition = shell.content.definition;
  const definitionRef = controls.content.project_definition_ref;
  const focusTerms = definition.terms.filter(
    (term) => term.generic_family === "focus",
  );
  const term = focusTerms[0];
  if (
    shell.project_id !== projectId ||
    project.project_id !== projectId ||
    shell.content.current_objective !== undefined ||
    controls.project_id !== projectId ||
    controls.content.project_ref.record_id !== projectId ||
    controls.content.project_ref.revision !== project.revision ||
    definitionRef.project_definition_id !== definition.project_definition_id ||
    definitionRef.revision !== definition.revision ||
    definitionRef.content_hash !== definition.content_hash ||
    focusTerms.length !== 1 ||
    term === undefined
  ) {
    throw new ProjectDataError(
      "The Brief cannot bind Objective framing to one exact reviewed absence and one registered focus term. Refresh or inspect the Project profile.",
      409,
    );
  }
  return {
    projectId,
    projectName: project.name,
    definitionLabel: definition.label,
    projectRef: {
      project_id: projectId,
      revision: controls.content.project_ref.revision,
      record_hash: controls.content.project_ref.record_hash,
    },
    projectDefinitionRef: structuredClone(definitionRef),
    focus: {
      state: "none",
      objectiveKind: term.semantic_key,
      term: term.singular,
    },
  };
};

const profileStartingBriefFromCurrentShell = (
  projectId: string,
  shell: ProjectShellView,
  controls: PetraProjectEffectiveControlsView,
  limitation: string,
): ProjectProfileStartingBrief => {
  const project = shell.content.project;
  const definition = shell.content.definition;
  const objective = shell.content.current_objective;
  const definitionRef = controls.content.project_definition_ref;
  if (
    shell.project_id !== projectId ||
    project.project_id !== projectId ||
    objective === undefined ||
    controls.project_id !== projectId ||
    controls.content.project_ref.record_id !== projectId ||
    controls.content.project_ref.revision !== project.revision ||
    definitionRef.project_definition_id !== definition.project_definition_id ||
    definitionRef.revision !== definition.revision ||
    definitionRef.content_hash !== definition.content_hash ||
    !definition.terms.some(
      (term) => term.semantic_key === objective.objective_kind,
    )
  ) {
    throw new ProjectDataError(
      "The profile starting Brief cannot bind one exact current Project, definition, and focus.",
      409,
    );
  }
  return {
    projectRef: { projectId, revision: project.revision },
    projectDefinitionRef: {
      projectDefinitionId: definition.project_definition_id,
      revision: definition.revision,
      contentHash: definition.content_hash,
    },
    objectiveRef: {
      objectiveId: objective.objective_id,
      revision: objective.revision,
      contentHash: objective.content_hash,
    },
    limitation,
  };
};

export const getProjectSuggestedAction = async (
  projectId: string,
  projectInquiryLinkId: string,
): Promise<PetraSuggestedActionView> => {
  const query = new URLSearchParams({
    inquiry_result_link_id: projectInquiryLinkId,
  });
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/suggested-actions?${query}`,
  );
  const view = suggestedActionView(value);
  const { action, authority, operation, readiness } = view.content;
  const { basis, expected_result: expectedResult, invocation } = action;
  const basisWork = basis.produced_by_work_ref;
  const backgroundWork = action.background_work;
  const workBasisMatches =
    basisWork === undefined
      ? backgroundWork.state === "unavailable"
      : backgroundWork.state === "completed" &&
        exactWorkRefMatches(basisWork, backgroundWork.work_unit_ref);
  if (
    view.project_id !== projectId ||
    basis.inquiry_result_link_ref.project_inquiry_link_id !==
      projectInquiryLinkId ||
    invocation.kind !== "authenticated_read" ||
    invocation.contract_name !== "petra.project-inquiry-view" ||
    invocation.contract_version !== "1.0.0" ||
    invocation.operation !== "get_project_inquiry_detail" ||
    invocation.project_id !== projectId ||
    invocation.place_role !== "brief" ||
    invocation.task_intent !== "inspect" ||
    invocation.idempotency !== "safe_exact_read" ||
    !exactObjectiveRefMatches(
      action.objective.objective_ref,
      invocation.objective_ref,
    ) ||
    !exactResultRefMatches(basis.result_ref, expectedResult.result_ref) ||
    basis.snapshot_ref.event_position !== authority.event_position ||
    operation.state !== "read_only" ||
    operation.work_start !== "not_performed" ||
    operation.authority_change !== "none" ||
    (readiness.state === "ready" &&
      readiness.missing_prerequisites.length !== 0) ||
    !workBasisMatches
  ) {
    throw new ProjectDataError(
      "Petra returned a SuggestedAction whose exact basis, readiness, or invocation does not match this Project read.",
      502,
    );
  }
  return view;
};

const invokedInquiryMatchesAction = (
  inquiry: PetraProjectInquiryView,
  actionView: PetraSuggestedActionView,
): boolean => {
  if (
    inquiry.project_id !== actionView.project_id ||
    inquiry.content.view_kind !== "detail"
  ) {
    return false;
  }
  const { action } = actionView.content;
  const { basis, invocation } = action;
  const definition = inquiry.content.project_definition_ref;
  const actionDefinition = basis.project_definition_ref;
  const linkedResults = inquiry.content.result_links.filter(
    ({ link_ref: linkRef }) =>
      linkRef.project_inquiry_link_id ===
      basis.inquiry_result_link_ref.project_inquiry_link_id,
  );
  const linkedResult = linkedResults[0];
  if (
    definition.project_definition_id !==
      actionDefinition.project_definition_id ||
    definition.revision !== actionDefinition.revision ||
    definition.content_hash !== actionDefinition.content_hash ||
    definition.definition_family !== actionDefinition.definition_family ||
    !exactObjectiveRefMatches(
      inquiry.content.summary.inquiry_anchor_ref,
      invocation.objective_ref,
    ) ||
    linkedResults.length !== 1 ||
    linkedResult === undefined ||
    linkedResult.link_ref.content_hash !==
      basis.inquiry_result_link_ref.content_hash ||
    linkedResult.link_ref.record_hash !==
      basis.inquiry_result_link_ref.record_hash ||
    !exactResultRefMatches(linkedResult.result_ref, basis.result_ref)
  ) {
    return false;
  }
  const actionWork = basis.produced_by_work_ref;
  const inquiryWork = linkedResult.produced_by_work_ref;
  return actionWork === undefined
    ? inquiryWork === undefined
    : inquiryWork !== undefined && exactWorkRefMatches(actionWork, inquiryWork);
};

export const loadProjectBrief = async (
  args: LoaderFunctionArgs,
): Promise<ProjectBriefData> => {
  const projectId = requiredRouteIdentity(
    args.params.projectId,
    "A Project ID",
  );
  const query = new URL(args.request.url).searchParams;
  const projectResume = query.get("projectResume");
  const baselineEventIds = query.getAll("baseline_event_id");
  const baselineRecordHashes = query.getAll("baseline_record_hash");
  const expectedSnapshotHashes = query.getAll("expected_snapshot_hash");
  const baselineEventId = baselineEventIds[0];
  const baselineRecordHash = baselineRecordHashes[0];
  const expectedSnapshotHash = expectedSnapshotHashes[0];
  const baselineRequested =
    baselineEventId !== undefined || baselineRecordHash !== undefined;
  const actionRequested =
    query.has("inquiry_result_link_id") || query.has("invoke");
  if (
    [...query.keys()].some(
      (key) =>
        ![
          "inquiry_result_link_id",
          "invoke",
          "projectResume",
          "baseline_event_id",
          "baseline_record_hash",
          "expected_snapshot_hash",
        ].includes(key),
    ) ||
    query.getAll("projectResume").length > 1 ||
    baselineEventIds.length > 1 ||
    baselineRecordHashes.length > 1 ||
    expectedSnapshotHashes.length > 1 ||
    (baselineEventId === undefined) !== (baselineRecordHash === undefined) ||
    (expectedSnapshotHash !== undefined && !baselineRequested) ||
    (baselineRequested && (actionRequested || projectResume !== null)) ||
    (projectResume !== null &&
      ![
        "stale",
        "not_found",
        "unavailable",
        "read-failed",
        "read-stale",
        "selection-stale",
        "return-unavailable",
      ].includes(projectResume))
  ) {
    throw new ProjectDataError(
      "This Brief route requires one complete comparison baseline and keeps comparison separate from action or recovery selection.",
      400,
    );
  }
  const controlsPromise = requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/effective-controls`,
  );
  let briefView: PetraProjectBriefReadView;
  let comparisonRecovery: ProjectBriefComparisonRecovery | undefined;
  try {
    briefView = await readProjectBrief({
      projectId,
      baseUrl: apiBaseUrl(),
      token: apiToken(),
      signal: args.request.signal,
      ...(baselineEventId === undefined || baselineRecordHash === undefined
        ? {}
        : {
            request: {
              baseline_event_id: baselineEventId,
              baseline_record_hash: baselineRecordHash,
              ...(expectedSnapshotHash === undefined
                ? {}
                : { expected_snapshot_hash: expectedSnapshotHash }),
            },
          }),
    });
  } catch (error) {
    if (
      baselineEventId !== undefined &&
      error instanceof ProjectBriefClientError &&
      (error.status === 409 || error.status === 422)
    ) {
      comparisonRecovery = {
        state: error.status === 409 ? "stale" : "unavailable",
        eventId: baselineEventId,
        reason: error.message,
      };
      briefView = await readProjectBrief({
        projectId,
        baseUrl: apiBaseUrl(),
        token: apiToken(),
        signal: args.request.signal,
      });
    } else {
      const [controlsValue, shellValue] = await Promise.all([
        controlsPromise,
        requestJson(
          `/api/queries/projects/${encodeURIComponent(projectId)}/shell`,
        ),
      ]);
      const controls = effectiveControlsView(controlsValue);
      const shell = shellView(shellValue);
      if (shell.content.current_objective !== undefined) {
        if (
          error instanceof ProjectBriefClientError &&
          error.code === "PROJECT_BRIEF_UNSUPPORTED"
        ) {
          return {
            profileStartingBrief: profileStartingBriefFromCurrentShell(
              projectId,
              shell,
              controls,
              error.message,
            ),
          };
        }
        throw error;
      }
      return {
        objectiveCommandContext: objectiveCommandContextFromEmptyShell(
          projectId,
          shell,
          controls,
        ),
      };
    }
  }
  const controls = effectiveControlsView(await controlsPromise);
  const objectiveCommandContext = await objectiveCommandContextFromCurrentBrief(
    projectId,
    briefView,
    controls,
  );
  const selected = actionRequested ? await loadProjectBriefAction(args) : {};
  return {
    briefView,
    objectiveCommandContext,
    ...(comparisonRecovery === undefined ? {} : { comparisonRecovery }),
    ...selected,
  };
};

export const loadProjectBriefAction = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ProjectBriefData> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const incoming = new URL(request.url).searchParams;
  const linkIds = incoming.getAll("inquiry_result_link_id");
  const invocations = incoming.getAll("invoke");
  if (linkIds.length > 1 || invocations.length > 1) {
    throw new ProjectDataError(
      "The SuggestedAction selection and invocation must each be exact.",
      400,
    );
  }
  let linkId = linkIds[0];
  const invocation = invocations[0];
  if (linkId === undefined) {
    if (invocation !== undefined) {
      throw new ProjectDataError(
        "A SuggestedAction invocation requires its exact inquiry-result link.",
        400,
      );
    }
    const shell = shellView(
      await requestJson(
        `/api/queries/projects/${encodeURIComponent(projectId)}/shell`,
      ),
    );
    if (shell.project_id !== projectId) {
      throw new ProjectDataError(
        "Petra returned a Brief action context for another Project.",
        502,
      );
    }
    const currentObjective = shell.content.current_objective;
    if (currentObjective === undefined) return {};
    const inquiry = projectInquiryView(
      await requestJson(
        `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries/${encodeURIComponent(currentObjective.objective_id)}`,
      ),
    );
    if (
      inquiry.project_id !== projectId ||
      inquiry.content.view_kind !== "detail" ||
      inquiry.content.summary.inquiry_anchor_ref.objective_id !==
        currentObjective.objective_id ||
      inquiry.content.summary.inquiry_anchor_ref.revision !==
        currentObjective.revision ||
      inquiry.content.summary.inquiry_anchor_ref.content_hash !==
        currentObjective.content_hash ||
      inquiry.content.project_definition_ref.project_definition_id !==
        shell.content.definition.project_definition_id ||
      inquiry.content.project_definition_ref.revision !==
        shell.content.definition.revision ||
      inquiry.content.project_definition_ref.content_hash !==
        shell.content.definition.content_hash
    ) {
      throw new ProjectDataError(
        "Petra returned inquiry action context that does not match the current Brief focus and ProjectDefinition.",
        502,
      );
    }
    if (inquiry.content.result_links.length !== 1) return {};
    linkId = inquiry.content.result_links[0]?.link_ref.project_inquiry_link_id;
    if (linkId === undefined) return {};
  }
  if (!API_REQUEST_ID.test(linkId)) {
    throw new ProjectDataError(
      "The SuggestedAction inquiry-result link is invalid.",
      400,
    );
  }
  if (invocation !== undefined && invocation !== "get_project_inquiry_detail") {
    throw new ProjectDataError(
      "The SuggestedAction invocation is unsupported.",
      400,
    );
  }
  let suggestedAction: PetraSuggestedActionView | undefined;
  let unavailableInspection: ProjectDataError | undefined;
  try {
    suggestedAction = await getProjectSuggestedAction(projectId, linkId);
  } catch (error) {
    if (!(error instanceof ProjectDataError) || error.status !== 502)
      throw error;
    unavailableInspection = error;
  }
  if (
    invocation !== undefined &&
    suggestedAction?.content.readiness.state !== "ready"
  ) {
    throw new ProjectDataError(
      "This exact inspection action is unavailable from the current Project position. Return to its registered Work action or refresh the Brief.",
      409,
    );
  }
  let suggestedWorkAction: PetraSuggestedActionViewV11 | undefined;
  try {
    suggestedWorkAction = await getProjectSuggestedWorkAction(
      projectId,
      linkId,
    );
  } catch (error) {
    if (!(error instanceof ProjectDataError) || error.status !== 404) {
      throw error;
    }
  }
  if (suggestedWorkAction === undefined && unavailableInspection !== undefined)
    throw unavailableInspection;
  if (invocation === undefined) {
    return {
      ...(suggestedAction === undefined ? {} : { suggestedAction }),
      ...(suggestedWorkAction === undefined ? {} : { suggestedWorkAction }),
    };
  }
  if (suggestedAction === undefined) {
    throw new ProjectDataError(
      "The exact inspection action is unavailable from the current Project position.",
      409,
    );
  }
  const objectiveId =
    suggestedAction.content.action.invocation.objective_ref.objective_id;
  const inquiry = projectInquiryView(
    await requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries/${encodeURIComponent(objectiveId)}`,
    ),
  );
  if (!invokedInquiryMatchesAction(inquiry, suggestedAction)) {
    throw new ProjectDataError(
      "Petra returned inquiry detail that does not match the SuggestedAction's exact typed invocation and basis.",
      502,
    );
  }
  return {
    suggestedAction,
    ...(suggestedWorkAction === undefined ? {} : { suggestedWorkAction }),
    invokedInquiry: inquiry,
  };
};

export interface ProjectSettingsData {
  selectedProject?: ProjectRecord;
  controls?: PetraProjectEffectiveControlsView;
  profiles?: PetraRegisteredProjectProfile[];
  taxonomy?: PetraProjectProfileTaxonomyView;
}

export const loadProjectSettings = async ({
  request,
}: LoaderFunctionArgs): Promise<ProjectSettingsData> => {
  const target = new URL(request.url).searchParams.get("project");
  if (target === null) return {};
  if (target.length === 0) {
    throw new ProjectDataError(
      "A Settings Project target cannot be empty.",
      400,
    );
  }
  const encoded = encodeURIComponent(target);
  const [projectValue, controlsValue, profiles] = await Promise.all([
    requestJson(`/api/queries/projects/${encoded}/shell`),
    requestJson(`/api/queries/projects/${encoded}/effective-controls`),
    loadProjectProfiles(),
  ]);
  const projectView = shellView(projectValue);
  const controls = effectiveControlsView(controlsValue);
  const taxonomy = await projectProfileClient().readProjectTaxonomy(
    target,
    projectView.content.definition.revision,
  );
  if (
    projectView.project_id !== target ||
    controls.project_id !== target ||
    controls.content.project_ref.record_id !== target ||
    controls.content.project_ref.revision !==
      projectView.content.project.revision ||
    controls.content.project_definition_ref.project_definition_id !==
      projectView.content.definition.project_definition_id ||
    controls.content.project_definition_ref.revision !==
      projectView.content.definition.revision ||
    controls.content.project_definition_ref.content_hash !==
      projectView.content.definition.content_hash
  ) {
    throw new ProjectDataError(
      "Petra returned controls from a different Project or definition snapshot.",
      502,
    );
  }
  return {
    selectedProject: projectRecordFromShellView(projectView),
    controls,
    profiles,
    taxonomy,
  };
};

const requiredRouteIdentity = (
  value: string | undefined,
  label: string,
): string => {
  if (value === undefined || value.length === 0) {
    throw new ProjectDataError(`${label} is required.`, 400);
  }
  return value;
};

export interface ProjectSourceCollectionData {
  readonly sources: SourceRecord[];
  readonly registration: SourceRegistrationContext;
}

export const loadProjectSourceCollection = async ({
  params,
}: LoaderFunctionArgs): Promise<ProjectSourceCollectionData> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const encoded = encodeURIComponent(projectId);
  const [sourceViews, shellValue, controlsValue] = await Promise.all([
    projectSourceDiscoveryClient().list(projectId),
    requestJson(`/api/queries/projects/${encoded}/shell`),
    requestJson(`/api/queries/projects/${encoded}/effective-controls`),
  ]);
  const sources = sourceViews.map(sourceRecordFromView);
  const shell = shellView(shellValue);
  const controls = effectiveControlsView(controlsValue);
  const taxonomy = await projectProfileClient().readProjectTaxonomy(
    projectId,
    shell.content.definition.revision,
  );
  const definitionRef = controls.content.project_definition_ref;
  if (
    shell.project_id !== projectId ||
    shell.content.project.project_id !== projectId ||
    controls.project_id !== projectId ||
    controls.content.project_ref.record_id !== projectId ||
    controls.content.project_ref.revision !== shell.content.project.revision ||
    definitionRef.project_definition_id !==
      shell.content.definition.project_definition_id ||
    definitionRef.revision !== shell.content.definition.revision ||
    definitionRef.content_hash !== shell.content.definition.content_hash ||
    taxonomy.project_id !== projectId ||
    taxonomy.project_revision !== shell.content.project.revision ||
    taxonomy.project_definition_ref.project_definition_id !==
      definitionRef.project_definition_id ||
    taxonomy.project_definition_ref.revision !== definitionRef.revision ||
    taxonomy.project_definition_ref.content_hash !== definitionRef.content_hash
  ) {
    throw new ProjectDataError(
      "Source registration cannot bind one exact current Project, ProjectDefinition, and profile taxonomy. Refresh Sources before adding a copy.",
      409,
    );
  }
  const sourceRoles =
    taxonomy.resolution.state === "unsupported_profile"
      ? []
      : taxonomy.resolution.taxonomy.source_roles.items
          .filter(
            (item) =>
              item.availability === "available" &&
              item.contract?.name === "petra.rights-decision" &&
              item.contract.version === "1.0.0",
          )
          .map((item) => ({
            semanticKey: item.semantic_key,
            label: item.label,
            meaning: item.meaning,
          }));
  return {
    sources,
    registration: {
      projectId,
      projectRef: {
        project_id: projectId,
        revision: controls.content.project_ref.revision,
        record_hash: controls.content.project_ref.record_hash,
      },
      projectDefinitionRef: structuredClone(definitionRef),
      sourceRoles,
    },
  };
};

/**
 * Typed data boundary for the bounded Project History read. This intentionally
 * does not feed graph navigation history, which remains client-local state.
 */
export const getRecentProjectHistory = async (
  projectId: string,
): Promise<PetraProjectHistoryView> => {
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/history/recent`,
  );
  const view = projectHistoryView(value);
  if (view.project_id !== projectId) {
    throw new ProjectDataError(
      "Petra returned Recent changes from another Project.",
      502,
    );
  }
  return view;
};

export const getProjectHistoryEpisode = async (
  projectId: string,
  eventId: string,
): Promise<PetraProjectHistoryEpisodeViewV12> => {
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/history/events/${encodeURIComponent(eventId)}`,
  );
  const view = projectHistoryEpisodeView(value);
  if (view.project_id !== projectId || view.event_id !== eventId) {
    throw new ProjectDataError(
      "Petra returned a different Project History episode.",
      502,
    );
  }
  return view;
};

export const getProjectHistoryImpact = async (
  projectId: string,
  eventId: string,
): Promise<PetraProjectHistoryImpactViewV14> => {
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/history/events/${encodeURIComponent(eventId)}/impact`,
  );
  const view = projectHistoryImpactView(value);
  if (
    view.project_id !== projectId ||
    view.event_id !== eventId ||
    view.content.selected_event.event_ref.event_id !== eventId
  ) {
    throw new ProjectDataError(
      "Petra returned dependency impact from another Project or History event.",
      502,
    );
  }
  return view;
};

export const getProjectHistoryRecoveryAssessment = async (
  projectId: string,
  eventId: string,
): Promise<PetraProjectHistoryRecoveryAssessmentView> => {
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/history/events/${encodeURIComponent(eventId)}/recovery`,
  );
  const view = projectHistoryRecoveryAssessmentView(value);
  if (
    view.project_id !== projectId ||
    view.event_id !== eventId ||
    view.content.selected_event.event_ref.event_id !== eventId ||
    view.content.causal_impact_basis.source_event_id !== eventId
  ) {
    throw new ProjectDataError(
      "Petra returned a recovery assessment from another Project or History event.",
      502,
    );
  }
  return view;
};

export const getProjectHistoryCompensationPreview = async (
  projectId: string,
  eventId: string,
): Promise<PetraProjectHistoryCompensationPreviewView> => {
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/history/events/${encodeURIComponent(eventId)}/recovery/preview`,
  );
  const view = projectHistoryCompensationPreviewView(value);
  if (
    view.project_id !== projectId ||
    view.event_id !== eventId ||
    view.content.assessment_ref.event_id !== eventId ||
    view.content.impact_basis.source_event_id !== eventId
  ) {
    throw new ProjectDataError(
      "Petra returned a compensation preview from another Project or History event.",
      502,
    );
  }
  return view;
};

export interface ProjectHistoryEventData {
  readonly episode: PetraProjectHistoryEpisodeViewV12;
  readonly impact: PetraProjectHistoryImpactViewV14;
  readonly recovery: PetraProjectHistoryRecoveryAssessmentView;
}

/**
 * Reads one exact retained History event and its current impact/recovery
 * assessments. Compensation remains separately previewed, confirmed, and
 * executed by the owning production routes.
 */
export const getProjectHistoryEvent = async (
  projectId: string,
  eventId: string,
): Promise<ProjectHistoryEventData> => {
  const [episode, impact, recovery] = await Promise.all([
    getProjectHistoryEpisode(projectId, eventId),
    getProjectHistoryImpact(projectId, eventId),
    getProjectHistoryRecoveryAssessment(projectId, eventId),
  ]);
  return { episode, impact, recovery };
};

export const loadProjectHistoryEvent = async ({
  params,
}: LoaderFunctionArgs): Promise<ProjectHistoryEventData> =>
  getProjectHistoryEvent(
    requiredRouteIdentity(params.projectId, "A Project ID"),
    requiredRouteIdentity(params.episodeId, "A History event ID"),
  );

export interface ProjectHistoryCompensationPlanInput {
  readonly projectId: string;
  readonly eventId: string;
  readonly preview: PetraProjectHistoryCompensationPreviewView;
  readonly reason: string;
  readonly approvalRationale: string;
  readonly explicitConfirmation: true;
}

export const composeProjectHistoryCompensationPlan = async (
  input: ProjectHistoryCompensationPlanInput,
): Promise<PetraProjectHistoryCompensationPlanView> => {
  if (
    input.reason.trim().length === 0 ||
    input.approvalRationale.trim().length === 0 ||
    input.preview.project_id !== input.projectId ||
    input.preview.event_id !== input.eventId
  ) {
    throw new ProjectDataError(
      "A compensation plan requires an exact routed preview, reason, Approval rationale, and explicit confirmation.",
      400,
    );
  }
  const request: PetraProjectHistoryCompensationPlanRequest = {
    schema_name: "petra.project-history-compensation-plan-request",
    schema_version: "1.0.0",
    project_id: input.projectId,
    event_id: input.eventId,
    preview_ref: {
      schema_name: "petra.project-history-compensation-preview-view",
      schema_version: "1.0.0",
      content_hash: input.preview.content_hash,
      binding_hash: input.preview.content.freshness.binding_hash,
      issued_at: input.preview.content.freshness.issued_at,
      valid_through: input.preview.content.freshness.valid_through,
    },
    confirmation: {
      confirmed: input.explicitConfirmation,
      reason: input.reason,
      approval_rationale: input.approvalRationale,
    },
  };
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(input.projectId)}/history/events/${encodeURIComponent(input.eventId)}/recovery/plan`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  const view = projectHistoryCompensationPlanView(value);
  if (
    view.project_id !== input.projectId ||
    view.event_id !== input.eventId ||
    view.content.preview_ref.content_hash !== input.preview.content_hash ||
    view.content.preview_ref.binding_hash !==
      input.preview.content.freshness.binding_hash ||
    view.content.change_set.content.reason !== input.reason ||
    view.content.approval.rationale !== input.approvalRationale
  ) {
    throw new ProjectDataError(
      "Petra returned a compensation plan from another Project, event, preview, or confirmed input.",
      502,
    );
  }
  return view;
};

export interface ProjectHistoryCompensationExecutionInput {
  readonly projectId: string;
  readonly eventId: string;
  readonly plan: PetraProjectHistoryCompensationPlanView;
  readonly explicitExecutionConfirmation: true;
}

export const executeProjectHistoryCompensationPlan = async (
  input: ProjectHistoryCompensationExecutionInput,
): Promise<PetraProjectHistoryCompensationExecutionView> => {
  if (
    input.plan.project_id !== input.projectId ||
    input.plan.event_id !== input.eventId
  ) {
    throw new ProjectDataError(
      "Compensation execution requires the exact plan for the routed Project event.",
      400,
    );
  }
  const request: PetraProjectHistoryCompensationExecutionRequest = {
    schema_name: "petra.project-history-compensation-execution-request",
    schema_version: "1.0.0",
    project_id: input.projectId,
    event_id: input.eventId,
    plan: structuredClone(input.plan),
    execution_confirmation: {
      confirmed: input.explicitExecutionConfirmation,
      acknowledged_atomicity:
        "per_command_transaction_not_three_command_atomic",
    },
  };
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(input.projectId)}/history/events/${encodeURIComponent(input.eventId)}/recovery/execute`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  const view = projectHistoryCompensationExecutionView(value);
  if (
    view.project_id !== input.projectId ||
    view.event_id !== input.eventId ||
    view.content.plan_ref.content_hash !== input.plan.content_hash
  ) {
    throw new ProjectDataError(
      "Petra returned a compensation execution from another Project, event, or plan.",
      502,
    );
  }
  return view;
};

export interface RetainedProjectHistoryRequest {
  readonly limit?: number;
  readonly cursor?: string;
  readonly filters?: ProjectHistoryRetainedCollectionFiltersV12;
}

const HISTORY_RETAINED_CURSOR = /^phc2\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/u;
const HISTORY_RETAINED_ACTOR = /^actor_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HISTORY_RETAINED_CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;
const HISTORY_RETAINED_TIMESTAMP =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u;
const HISTORY_RETAINED_FILTER_VALUES = {
  family: new Set([
    "change_control",
    "project_source_lifecycle",
    "project_source_replacement",
  ]),
  command_name: new Set([
    "SubmitChangeSet",
    "RecordApproval",
    "ApplyChangeSet",
    "ExcludeProjectSource",
    "RestoreProjectSource",
    "CreateProjectSourceReplacement",
    "RetractProjectSourceReplacement",
  ]),
  event_type: new Set([
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
  ]),
  outcome: new Set(["completed", "conflicted"]),
  effect: new Set([
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
  ]),
} as const;
const HISTORY_RETAINED_TARGET_PREFIXES = {
  "petra.change-set": "change_set_",
  "petra.approval": "approval_",
  "scientific.claim": "claim_",
  "scientific.assertion": "assertion_",
  "petra.project-source": "project_source_",
  "petra.project-source-replacement": "project_source_replacement_",
  "petra.project-source-replacement-retraction": "project_source_retraction_",
} as const;

const retainedHistoryFilterOptionsAreValid = (
  supplied: unknown,
  suppliedSnapshotTotalCount: unknown,
  suppliedFilters: unknown,
): boolean => {
  if (
    !isRecord(supplied) ||
    supplied.authorization_scope !== "authenticated_project" ||
    supplied.snapshot_and_query_binding !==
      "retention_snapshot_and_complete_normalized_query" ||
    supplied.dimension_semantics !==
      "replace_same_dimension_preserve_other_filters" ||
    supplied.count_basis !==
      "matching_authorized_events_after_replacing_same_dimension" ||
    !isRecord(supplied.actor_catalogue) ||
    !isRecord(supplied.target_catalogue) ||
    !isRecord(suppliedFilters) ||
    !Number.isSafeInteger(suppliedSnapshotTotalCount) ||
    Number(suppliedSnapshotTotalCount) < 0
  ) {
    return false;
  }
  const snapshotTotalCount = Number(suppliedSnapshotTotalCount);
  const catalogueBaseIsValid = (
    catalogue: Record<string, unknown>,
    orderKind: string,
  ): catalogue is Record<string, unknown> & { options: unknown[] } =>
    catalogue.option_limit === 100 &&
    catalogue.order_kind === orderKind &&
    Number.isSafeInteger(catalogue.returned_count) &&
    Number(catalogue.returned_count) >= 0 &&
    Number(catalogue.returned_count) <= 100 &&
    Number.isSafeInteger(catalogue.total_count) &&
    Number(catalogue.total_count) >= Number(catalogue.returned_count) &&
    catalogue.continuation === "not_composed" &&
    Array.isArray(catalogue.options) &&
    catalogue.options.length === catalogue.returned_count &&
    (catalogue.coverage === "complete"
      ? catalogue.total_count === catalogue.returned_count
      : catalogue.coverage === "truncated" &&
        Number(catalogue.total_count) > Number(catalogue.returned_count));
  const actorCatalogue = supplied.actor_catalogue;
  const targetCatalogue = supplied.target_catalogue;
  if (
    !catalogueBaseIsValid(
      actorCatalogue,
      "active_option_first_then_matching_event_count_desc_then_actor_id",
    ) ||
    !catalogueBaseIsValid(
      targetCatalogue,
      "active_option_first_then_matching_event_count_desc_then_target_identity",
    )
  ) {
    return false;
  }

  const actorIds = new Set<string>();
  const actorOrder: { id: string; count: number; active: boolean }[] = [];
  let actorCountSum = 0;
  let selectedActorCount: number | undefined;
  for (const option of actorCatalogue.options) {
    if (
      !isRecord(option) ||
      !isRecord(option.actor_ref) ||
      typeof option.actor_ref.actor_id !== "string" ||
      !HISTORY_RETAINED_ACTOR.test(option.actor_ref.actor_id) ||
      (option.actor_ref.actor_kind !== "human" &&
        option.actor_ref.actor_kind !== "service" &&
        option.actor_ref.actor_kind !== "model") ||
      actorIds.has(option.actor_ref.actor_id) ||
      !isRecord(option.display_descriptor) ||
      option.display_descriptor.state !== "available" ||
      typeof option.display_descriptor.display_name !== "string" ||
      option.display_descriptor.display_name.length < 1 ||
      option.display_descriptor.display_name.length > 160 ||
      !isRecord(option.display_descriptor.authority_ref) ||
      option.display_descriptor.authority_ref.schema_name !== "petra.actor" ||
      option.display_descriptor.authority_ref.schema_version !== "1.0.0" ||
      option.display_descriptor.authority_ref.actor_id !==
        option.actor_ref.actor_id ||
      typeof option.display_descriptor.authority_ref.record_hash !== "string" ||
      !HISTORY_RETAINED_CONTENT_HASH.test(
        option.display_descriptor.authority_ref.record_hash,
      ) ||
      !Number.isSafeInteger(option.matching_event_count) ||
      Number(option.matching_event_count) < 1
    ) {
      return false;
    }
    const actorId = option.actor_ref.actor_id;
    const matchingEventCount = Number(option.matching_event_count);
    const active = suppliedFilters.actor_id === actorId;
    actorIds.add(actorId);
    actorCountSum += matchingEventCount;
    actorOrder.push({ id: actorId, count: matchingEventCount, active });
    if (active) selectedActorCount = matchingEventCount;
  }
  const expectedActorOrder = [...actorOrder].sort(
    (left, right) =>
      Number(right.active) - Number(left.active) ||
      right.count - left.count ||
      left.id.localeCompare(right.id),
  );
  if (
    actorOrder.some(
      (option, index) => option.id !== expectedActorOrder[index]?.id,
    ) ||
    (suppliedFilters.actor_id === undefined &&
      actorCatalogue.coverage === "complete" &&
      actorCountSum !== snapshotTotalCount) ||
    (suppliedFilters.actor_id !== undefined &&
      snapshotTotalCount > 0 &&
      selectedActorCount !== snapshotTotalCount)
  ) {
    return false;
  }

  const targetIds = new Set<string>();
  const targetOrder: { id: string; count: number; active: boolean }[] = [];
  let selectedTargetCount: number | undefined;
  for (const option of targetCatalogue.options) {
    if (
      !isRecord(option) ||
      !isRecord(option.target_ref) ||
      typeof option.target_ref.semantic_key !== "string" ||
      typeof option.target_ref.object_id !== "string"
    ) {
      return false;
    }
    const semanticKey = option.target_ref.semantic_key;
    const objectId = option.target_ref.object_id;
    const prefix =
      HISTORY_RETAINED_TARGET_PREFIXES[
        semanticKey as keyof typeof HISTORY_RETAINED_TARGET_PREFIXES
      ];
    const identity = `${semanticKey}\u0000${objectId}`;
    if (
      prefix === undefined ||
      objectId.length !== prefix.length + 26 ||
      !objectId.startsWith(prefix) ||
      !/^[0-9A-HJKMNP-TV-Z]{26}$/u.test(objectId.slice(prefix.length)) ||
      targetIds.has(identity) ||
      !isRecord(option.display_descriptor) ||
      option.display_descriptor.state !== "exact_identity_only" ||
      option.display_descriptor.fallback !== "semantic_key_and_object_id" ||
      option.display_descriptor.reason_code !==
        "revision_neutral_target_title_authority_not_registered" ||
      option.display_descriptor.reason !==
        "No authorized revision-neutral title is registered for this exact History target identity." ||
      !Number.isSafeInteger(option.matching_event_count) ||
      Number(option.matching_event_count) < 1
    ) {
      return false;
    }
    const matchingEventCount = Number(option.matching_event_count);
    const active =
      isRecord(suppliedFilters.target) &&
      suppliedFilters.target.semantic_key === semanticKey &&
      suppliedFilters.target.object_id === objectId;
    targetIds.add(identity);
    targetOrder.push({ id: identity, count: matchingEventCount, active });
    if (active) selectedTargetCount = matchingEventCount;
  }
  const expectedTargetOrder = [...targetOrder].sort(
    (left, right) =>
      Number(right.active) - Number(left.active) ||
      right.count - left.count ||
      left.id.localeCompare(right.id),
  );
  return (
    !targetOrder.some(
      (option, index) => option.id !== expectedTargetOrder[index]?.id,
    ) &&
    (!isRecord(suppliedFilters.target) ||
      snapshotTotalCount === 0 ||
      selectedTargetCount === snapshotTotalCount)
  );
};

const retainedProjectHistoryFilters = (
  supplied: ProjectHistoryRetainedCollectionFiltersV12 | undefined,
): ProjectHistoryRetainedCollectionFiltersV12 => {
  if (supplied === undefined) return {};
  if (!isRecord(supplied)) {
    throw new ProjectDataError(
      "Retained Project History filters must be an object.",
      400,
    );
  }
  const allowed = new Set([
    "family",
    "command_name",
    "event_type",
    "actor_id",
    "outcome",
    "effect",
    "target",
    "recorded_at",
  ]);
  if (Object.keys(supplied).some((key) => !allowed.has(key))) {
    throw new ProjectDataError(
      "Retained Project History contains an unsupported filter.",
      400,
    );
  }
  const typed =
    supplied as unknown as ProjectHistoryRetainedCollectionFiltersV12;
  for (const key of [
    "family",
    "command_name",
    "event_type",
    "outcome",
    "effect",
  ] as const) {
    const value = typed[key];
    if (
      value !== undefined &&
      !HISTORY_RETAINED_FILTER_VALUES[key].has(value)
    ) {
      throw new ProjectDataError(
        `Retained Project History ${key} filter is invalid.`,
        400,
      );
    }
  }
  if (
    typed.actor_id !== undefined &&
    !HISTORY_RETAINED_ACTOR.test(typed.actor_id)
  ) {
    throw new ProjectDataError(
      "Retained Project History Actor filter is invalid.",
      400,
    );
  }
  let target: ProjectHistoryRetainedCollectionFiltersV12["target"];
  const suppliedTarget = typed.target;
  if (suppliedTarget !== undefined) {
    if (
      !isRecord(suppliedTarget) ||
      Object.keys(suppliedTarget).length !== 2 ||
      typeof suppliedTarget.semantic_key !== "string" ||
      typeof suppliedTarget.object_id !== "string"
    ) {
      throw new ProjectDataError(
        "Retained Project History target filter requires an exact semantic key and object identity.",
        400,
      );
    }
    const semanticKey = suppliedTarget.semantic_key;
    const prefix = HISTORY_RETAINED_TARGET_PREFIXES[semanticKey];
    if (
      prefix === undefined ||
      suppliedTarget.object_id.length !== prefix.length + 26 ||
      !suppliedTarget.object_id.startsWith(prefix) ||
      !/^[0-9A-HJKMNP-TV-Z]{26}$/u.test(
        suppliedTarget.object_id.slice(prefix.length),
      )
    ) {
      throw new ProjectDataError(
        "Retained Project History target identity is invalid.",
        400,
      );
    }
    target = {
      semantic_key: semanticKey,
      object_id: suppliedTarget.object_id,
    };
  }
  let recordedAt: ProjectHistoryRetainedCollectionFiltersV12["recorded_at"];
  const suppliedRecordedAt = typed.recorded_at;
  if (suppliedRecordedAt !== undefined) {
    if (!isRecord(suppliedRecordedAt)) {
      throw new ProjectDataError(
        "Retained Project History recorded-time filter is invalid.",
        400,
      );
    }
    const keys = Object.keys(suppliedRecordedAt);
    const from = suppliedRecordedAt.from_inclusive;
    const through = suppliedRecordedAt.through_inclusive;
    const validTimestamp = (value: unknown): value is string =>
      typeof value === "string" &&
      HISTORY_RETAINED_TIMESTAMP.test(value) &&
      Number.isFinite(Date.parse(value));
    if (
      keys.length < 1 ||
      keys.length > 2 ||
      keys.some(
        (key) => key !== "from_inclusive" && key !== "through_inclusive",
      ) ||
      (from !== undefined && !validTimestamp(from)) ||
      (through !== undefined && !validTimestamp(through)) ||
      (from !== undefined &&
        through !== undefined &&
        Date.parse(from) > Date.parse(through))
    ) {
      throw new ProjectDataError(
        "Retained Project History recorded-time bounds are invalid.",
        400,
      );
    }
    recordedAt = {
      ...(from === undefined ? {} : { from_inclusive: from }),
      ...(through === undefined ? {} : { through_inclusive: through }),
    };
  }
  return {
    ...(typed.family === undefined ? {} : { family: typed.family }),
    ...(typed.command_name === undefined
      ? {}
      : { command_name: typed.command_name }),
    ...(typed.event_type === undefined ? {} : { event_type: typed.event_type }),
    ...(typed.actor_id === undefined ? {} : { actor_id: typed.actor_id }),
    ...(typed.outcome === undefined ? {} : { outcome: typed.outcome }),
    ...(typed.effect === undefined ? {} : { effect: typed.effect }),
    ...(target === undefined ? {} : { target }),
    ...(recordedAt === undefined ? {} : { recorded_at: recordedAt }),
  };
};

export const getRetainedProjectHistory = async (
  projectId: string,
  request: RetainedProjectHistoryRequest = {},
): Promise<PetraProjectHistoryRetainedViewV12> => {
  const limit = request.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new ProjectDataError(
      "Retained Project History limit must be an integer from 1 through 100.",
      400,
    );
  }
  if (
    request.cursor !== undefined &&
    (request.cursor.length > 1024 ||
      !HISTORY_RETAINED_CURSOR.test(request.cursor))
  ) {
    throw new ProjectDataError(
      "Retained Project History cursor is invalid.",
      400,
    );
  }
  const filters = retainedProjectHistoryFilters(request.filters);
  const query = new URLSearchParams({ limit: String(limit) });
  if (request.cursor !== undefined) query.set("cursor", request.cursor);
  if (filters.family !== undefined) query.set("family", filters.family);
  if (filters.command_name !== undefined)
    query.set("command_name", filters.command_name);
  if (filters.event_type !== undefined)
    query.set("event_type", filters.event_type);
  if (filters.actor_id !== undefined) query.set("actor_id", filters.actor_id);
  if (filters.outcome !== undefined) query.set("outcome", filters.outcome);
  if (filters.effect !== undefined) query.set("effect", filters.effect);
  if (filters.target !== undefined) {
    query.set("target_semantic_key", filters.target.semantic_key);
    query.set("target_object_id", filters.target.object_id);
  }
  if (filters.recorded_at?.from_inclusive !== undefined)
    query.set("recorded_from", filters.recorded_at.from_inclusive);
  if (filters.recorded_at?.through_inclusive !== undefined)
    query.set("recorded_through", filters.recorded_at.through_inclusive);
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/history/events?${query}`,
  );
  const view = projectHistoryRetainedView(value);
  if (
    view.project_id !== projectId ||
    view.content.query.limit !== limit ||
    view.content.query.cursor !== request.cursor ||
    JSON.stringify(view.content.query.filters) !== JSON.stringify(filters)
  ) {
    throw new ProjectDataError(
      "Petra returned retained History from another Project or traversal query.",
      502,
    );
  }
  return view;
};

export interface ProjectSourceRecordData {
  readonly source: SourceRecord;
  readonly linkRemovalAvailable: boolean;
  readonly revision?: SourceRevisionContext;
  readonly revisionUnavailable?: string;
}

const sourceRevisionPredecessorRef = (
  value: unknown,
  projectId: string,
  sourceId: string,
): PetraProjectSourceRevisionRequest["expected"]["current_source_ref"] => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-source-lifecycle-view" ||
    value.schema_version !== "1.0.0" ||
    value.project_id !== projectId ||
    value.project_source_id !== sourceId ||
    !isRecord(value.content) ||
    value.content.requested_action !== "exclude_project_source" ||
    !isRecord(value.content.source_ref) ||
    value.content.source_ref.project_source_id !== sourceId ||
    !Number.isSafeInteger(value.content.source_ref.revision) ||
    Number(value.content.source_ref.revision) < 1 ||
    typeof value.content.source_ref.content_hash !== "string" ||
    !CONTENT_HASH.test(value.content.source_ref.content_hash) ||
    typeof value.content.source_ref.record_hash !== "string" ||
    !CONTENT_HASH.test(value.content.source_ref.record_hash) ||
    value.content.source_ref.status !== "active"
  ) {
    throw new ProjectDataError(
      "Petra did not return the exact active predecessor required for a new source version.",
      502,
    );
  }
  return structuredClone(
    value.content.source_ref,
  ) as unknown as PetraProjectSourceRevisionRequest["expected"]["current_source_ref"];
};

export const loadProjectSourceRecord = async ({
  params,
}: LoaderFunctionArgs): Promise<ProjectSourceRecordData> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const sourceId = requiredRouteIdentity(params.sourceId, "A ProjectSource ID");
  const view = await projectSourceDiscoveryClient().open(projectId, sourceId);
  const source = sourceRecordFromView(view);
  if (view.content.binding.status !== "active") {
    return {
      source,
      linkRemovalAvailable: false,
      revisionUnavailable:
        "Only an active Project source can receive a new immutable version.",
    };
  }
  try {
    const encodedProject = encodeURIComponent(projectId);
    const encodedSource = encodeURIComponent(sourceId);
    const [shellValue, controlsValue, predecessorValue] = await Promise.all([
      requestJson(`/api/queries/projects/${encodedProject}/shell`),
      requestJson(`/api/queries/projects/${encodedProject}/effective-controls`),
      requestJson(
        `/api/queries/projects/${encodedProject}/sources/${encodedSource}/lifecycle?requested_action=exclude_project_source`,
      ),
    ]);
    const shell = shellView(shellValue);
    const controls = effectiveControlsView(controlsValue);
    const predecessor = sourceRevisionPredecessorRef(
      predecessorValue,
      projectId,
      sourceId,
    );
    const definitionRef = controls.content.project_definition_ref;
    if (
      shell.project_id !== projectId ||
      shell.content.project.project_id !== projectId ||
      controls.project_id !== projectId ||
      controls.content.project_ref.record_id !== projectId ||
      controls.content.project_ref.revision !==
        shell.content.project.revision ||
      definitionRef.project_definition_id !==
        shell.content.definition.project_definition_id ||
      definitionRef.revision !== shell.content.definition.revision ||
      definitionRef.content_hash !== shell.content.definition.content_hash ||
      view.content.binding.project_definition_ref.record_id !==
        definitionRef.project_definition_id ||
      view.content.binding.project_definition_ref.revision !==
        definitionRef.revision ||
      view.content.binding.project_definition_ref.content_hash !==
        definitionRef.content_hash ||
      predecessor.revision !== view.content.binding.revision ||
      predecessor.content_hash !== view.content.binding.content_hash
    ) {
      throw new ProjectDataError(
        "Petra could not bind one exact current Project, ProjectDefinition, and active predecessor.",
        409,
      );
    }
    return {
      source,
      linkRemovalAvailable: true,
      revision: {
        projectId,
        projectRef: {
          project_id: projectId,
          revision: controls.content.project_ref.revision,
          record_hash: controls.content.project_ref.record_hash,
        },
        projectDefinitionRef: structuredClone(definitionRef),
        currentSourceRef: predecessor,
      },
    };
  } catch {
    return {
      source,
      linkRemovalAvailable: true,
      revisionUnavailable:
        "Petra could not bind the current Project, profile definition, and active predecessor. Re-read this exact source before adding a version.",
    };
  }
};

export const executeProjectSourceLifecycleCommand = async (
  input: ProjectSourceLifecycleCommandInput,
): Promise<ProjectSourceLifecycleCommandResponse> => {
  if (
    input.expectedSourceRef.project_source_id !== input.projectSourceId ||
    (input.requestedAction === "exclude_project_source" &&
      input.expectedSourceRef.status !== "active") ||
    (input.requestedAction === "restore_project_source" &&
      input.expectedSourceRef.status !== "excluded")
  ) {
    throw new ProjectDataError(
      "A Project source lifecycle command must use the route source's exact eligible state.",
      400,
    );
  }
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(input.projectId)}/sources/${encodeURIComponent(input.projectSourceId)}/lifecycle`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        command_id: input.commandId,
        idempotency_key: input.idempotencyKey,
        requested_action: input.requestedAction,
        expected_source_ref: input.expectedSourceRef,
        reason: input.reason,
      }),
    },
  );
  return projectSourceLifecycleCommandResponse(value, input);
};

export const executeReviewSessionLifecycleCommand = async (
  input: ReviewSessionLifecycleCommandInput,
): Promise<ReviewSessionLifecycleCommandResponse> => {
  if (
    input.expectedReviewSessionRef.review_session_id !==
      input.reviewSessionId ||
    (input.requestedAction === "defer" &&
      input.expectedReviewSessionRef.lifecycle !== "open") ||
    (input.requestedAction === "reopen" &&
      input.expectedReviewSessionRef.lifecycle !== "deferred")
  ) {
    throw new ProjectDataError(
      "A ReviewSession lifecycle command must bind the route session's exact eligible state.",
      400,
    );
  }
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(input.projectId)}/reviews/${encodeURIComponent(input.reviewSessionId)}/lifecycle`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        command_id: input.commandId,
        idempotency_key: input.idempotencyKey,
        requested_action: input.requestedAction,
        expected_review_session_ref: input.expectedReviewSessionRef,
        ...(input.rationale === undefined
          ? {}
          : { rationale: input.rationale }),
      }),
    },
  );
  return reviewSessionLifecycleCommandResponse(value, input);
};

export const executeReviewSessionRefreshCommand = async (
  input: ReviewSessionRefreshCommandInput,
): Promise<ReviewSessionRefreshCommandResponse> => {
  if (
    input.expectedReviewSessionRef.review_session_id !==
      input.reviewSessionId ||
    input.expectedReviewSessionRef.lifecycle !== "open"
  ) {
    throw new ProjectDataError(
      "A ReviewSession refresh command must bind the route session's exact open lifecycle.",
      400,
    );
  }
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(input.projectId)}/reviews/${encodeURIComponent(input.reviewSessionId)}/refresh`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        command_id: input.commandId,
        idempotency_key: input.idempotencyKey,
        expected_review_session_ref: input.expectedReviewSessionRef,
      }),
    },
  );
  return reviewSessionRefreshCommandResponse(value, input);
};

export const executeReviewCandidateCorrectionCommand = async (
  input: ReviewCandidateCorrectionCommandInput,
  transport?: ReviewCandidateCorrectionTransport,
): Promise<ReviewCandidateCorrectionResult> => {
  if (
    input.reviewSessionId !==
      input.request.expected_review_session_ref.review_session_id ||
    input.request.expected_review_session_ref.lifecycle !== "open"
  ) {
    throw new ProjectDataError(
      "A candidate correction must bind the route session's exact open Review reference.",
      400,
    );
  }
  const correctionTransport =
    transport ??
    new (await import("@petra/adapters")).ReviewCandidateCorrectionClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
    });
  return correctionTransport.correctFromHumanEdit(
    input.projectId,
    input.request,
  );
};

export const executeReviewCandidateBasisRevisionCommand = async (
  input: ReviewCandidateBasisRevisionCommandInput,
  transport?: ReviewCandidateBasisRevisionTransport,
): Promise<ReviewCandidateBasisRevisionResult> => {
  if (
    input.reviewSessionId !==
      input.request.expected_review_session_ref.review_session_id ||
    input.request.expected_review_session_ref.lifecycle !== "open" ||
    input.request.basis_revision_input.project_source_ref.status !== "active"
  ) {
    throw new ProjectDataError(
      "A candidate basis revision must bind the route session and exact active source from authenticated reads.",
      400,
    );
  }
  const revisionTransport =
    transport ??
    new (await import("@petra/adapters")).ReviewCandidateBasisRevisionClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
    });
  return revisionTransport.revise(input.projectId, input.request);
};

export const executeReviewSessionSeparationCommand = async (
  input: ReviewSessionSeparationCommandInput,
  transport?: ReviewSessionSeparationTransport,
): Promise<ReviewSessionSeparationResult> => {
  if (
    input.reviewSessionId !==
      input.request.expected_review_session_ref.review_session_id ||
    input.request.expected_review_session_ref.lifecycle !== "open"
  ) {
    throw new ProjectDataError(
      "A ReviewSession separation must bind the route session's exact open Review reference.",
      400,
    );
  }
  const separationTransport =
    transport ??
    new (await import("@petra/adapters")).ReviewSessionSeparationClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
    });
  return separationTransport.separate(input.projectId, input.request);
};

export const createProjectSourceReplacement = async (
  input: CreateProjectSourceReplacementInput,
): Promise<CreateProjectSourceReplacementResponse> => {
  if (
    input.replacedSourceRef.status !== "excluded" ||
    input.replacementSourceRef.status !== "active" ||
    input.replacedSourceRef.project_source_id ===
      input.replacementSourceRef.project_source_id
  ) {
    throw new ProjectDataError(
      "A replacement must bind a distinct excluded predecessor to an active successor.",
      400,
    );
  }
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(input.projectId)}/source-replacements`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        command_id: input.commandId,
        idempotency_key: input.idempotencyKey,
        replacement_kind: input.replacementKind,
        replaced_source_ref: input.replacedSourceRef,
        replacement_source_ref: input.replacementSourceRef,
        exclusion_receipt_ref: input.exclusionReceiptRef,
        rationale: input.rationale,
      }),
    },
  );
  return createProjectSourceReplacementResponse(value, input);
};

export const retractProjectSourceReplacement = async (
  input: RetractProjectSourceReplacementInput,
): Promise<RetractProjectSourceReplacementResponse> => {
  if (
    input.expectedReplacementRef.project_source_replacement_id !==
      input.projectSourceReplacementId ||
    input.expectedReplacementRef.state !== "active"
  ) {
    throw new ProjectDataError(
      "A replacement retraction must use the route relation's exact active state.",
      400,
    );
  }
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(input.projectId)}/source-replacements/${encodeURIComponent(input.projectSourceReplacementId)}/retraction`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        command_id: input.commandId,
        idempotency_key: input.idempotencyKey,
        expected_replacement_ref: input.expectedReplacementRef,
        reason: input.reason,
      }),
    },
  );
  return retractProjectSourceReplacementResponse(value, input);
};

export const loadProjectReviewCollection = async ({
  params,
}: LoaderFunctionArgs): Promise<ReviewSession[]> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/reviews`,
  );
  if (!isRecord(value) || !Array.isArray(value.reviews)) {
    throw new ProjectDataError(
      "Petra returned an invalid Project Review collection.",
      502,
    );
  }
  return value.reviews.map((review) => {
    const view = reviewView(review);
    if (view.project_id !== projectId) {
      throw new ProjectDataError(
        "Petra returned a Review session from another Project.",
        502,
      );
    }
    return reviewSessionFromView(view);
  });
};

export const getProjectReviewSession = async (
  projectId: string,
  reviewSessionId: string,
): Promise<ReviewSession> => {
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/reviews/${encodeURIComponent(reviewSessionId)}`,
  );
  const view = reviewView(value);
  if (
    view.project_id !== projectId ||
    view.review_session_id !== reviewSessionId
  ) {
    throw new ProjectDataError(
      "Petra returned a different Project Review identity.",
      502,
    );
  }
  const review = reviewSessionFromView(view);
  if (review.lifecycle !== "open" || review.members === undefined)
    return review;
  const members = await Promise.all(
    review.members.map(async (member): Promise<ReviewSessionMember> => {
      const basisRevision = member.candidateBasisRevision;
      if (basisRevision === undefined) return member;
      try {
        const sourceValue = await requestJson(
          `/api/queries/projects/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(basisRevision.projectSourceId)}/lifecycle?requested_action=exclude_project_source`,
        );
        const expectedProjectSourceRef = reviewCandidateBasisRevisionSourceRef(
          sourceValue,
          projectId,
          basisRevision.projectSourceId,
        );
        return {
          ...member,
          candidateBasisRevision: {
            ...basisRevision,
            expectedProjectSourceRef,
          },
        };
      } catch {
        // Review remains readable. The frozen Basis control presents the
        // missing exact source authority as unavailable instead of inventing a
        // reference.
        return member;
      }
    }),
  );
  const first = members[0];
  if (first === undefined) return review;
  return {
    ...review,
    members,
    reviewMemberId: first.reviewMemberId,
    memberRole: first.role,
    memberOutcome: first.outcome,
    candidate: first.candidate,
    ...(first.candidateCorrection === undefined
      ? {}
      : { candidateCorrection: first.candidateCorrection }),
    ...(first.candidateBasisRevision === undefined
      ? {}
      : { candidateBasisRevision: first.candidateBasisRevision }),
    basis: first.basis,
    validation: first.validation,
    consequences: first.consequences,
    commitment: first.commitment,
    ...(first.changeSet === undefined ? {} : { changeSet: first.changeSet }),
  };
};

export const loadProjectReviewSession = async ({
  params,
}: LoaderFunctionArgs): Promise<ReviewSession> =>
  getProjectReviewSession(
    requiredRouteIdentity(params.projectId, "A Project ID"),
    requiredRouteIdentity(params.reviewId, "A ReviewSession ID"),
  );

const WORK_INQUIRY_MAPPING_UNAVAILABLE =
  "The current Project profile has no active inquiry-path mapping. Exact Work remains available, but Petra cannot show how these tasks relate to authored inquiry paths.";

const readOptionalWorkInquiry = async (
  path: string,
): Promise<
  { readonly view: PetraProjectInquiryView } | { readonly limitation: string }
> => {
  try {
    return { view: projectInquiryView(await requestJson(path)) };
  } catch (caught) {
    if (
      caught instanceof ProjectDataError &&
      caught.status === 503 &&
      caught.message ===
        "The current ProjectDefinition has no active registered inquiry-role mapping."
    ) {
      return { limitation: WORK_INQUIRY_MAPPING_UNAVAILABLE };
    }
    throw caught;
  }
};

export const loadProjectWorkCollection = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<WorkProjectView> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const incoming = new URL(request.url).searchParams;
  const allowed = new Set(["limit", "cursor", "state"]);
  if ([...incoming.keys()].some((key) => !allowed.has(key))) {
    throw new ProjectDataError(
      "The Work collection URL contains unsupported filters.",
      400,
    );
  }
  const query = new URLSearchParams();
  for (const key of ["limit", "cursor", "state"]) {
    for (const value of incoming.getAll(key)) query.append(key, value);
  }
  if (!query.has("limit")) query.set("limit", "50");
  const [value, inquiryRead] = await Promise.all([
    requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/work?${query}`,
    ),
    readOptionalWorkInquiry(
      `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries?limit=100`,
    ),
  ]);
  const view = projectWorkView(value);
  if (
    view.project_id !== projectId ||
    view.content.view_kind !== "collection"
  ) {
    throw new ProjectDataError(
      "Petra returned Work for a different Project or view kind.",
      502,
    );
  }
  if ("limitation" in inquiryRead) {
    return {
      ...workProjectFromView(view),
      inquiryLimitation: inquiryRead.limitation,
    };
  }
  const inquiryCollection = inquiryRead.view;
  if (
    inquiryCollection.project_id !== projectId ||
    inquiryCollection.content.view_kind !== "collection"
  ) {
    throw new ProjectDataError(
      "Petra returned inquiries for a different Project or view kind.",
      502,
    );
  }
  const inquiryReads = await Promise.all(
    inquiryCollection.content.inquiries.map(async (inquiry) => {
      const objectiveId = inquiry.inquiry_anchor_ref.objective_id;
      const detailRead = await readOptionalWorkInquiry(
        `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries/${encodeURIComponent(objectiveId)}`,
      );
      if ("limitation" in detailRead) return detailRead;
      const detail = detailRead.view;
      if (
        detail.project_id !== projectId ||
        detail.content.view_kind !== "detail" ||
        detail.content.summary.inquiry_anchor_ref.objective_id !== objectiveId
      ) {
        throw new ProjectDataError(
          "Petra returned a different exact inquiry identity.",
          502,
        );
      }
      return { view: detail } as const;
    }),
  );
  const unavailable = inquiryReads.find((read) => "limitation" in read);
  if (unavailable !== undefined && "limitation" in unavailable) {
    return {
      ...workProjectFromView(view),
      inquiryLimitation: unavailable.limitation,
    };
  }
  const inquiryDetails = inquiryReads.map((read) => {
    if ("limitation" in read) {
      throw new ProjectDataError(
        "Petra could not resolve the Work inquiry-path boundary.",
        502,
      );
    }
    return read.view;
  });
  return workProjectFromView(view, inquiryDetails);
};

export interface ProjectWorkDetailData {
  work: WorkProjectView;
  unit: WorkUnit;
  operations: PetraProjectWorkOperationsView;
  selectedResult?: ProjectWorkerOutputSelection;
}

export interface ProjectWorkerOutputSelection {
  readonly resultRef: {
    readonly semanticKey: "petra.worker-output-manifest";
    readonly recordId: string;
    readonly revision: number;
    readonly contentHash: string;
    readonly recordHash: string;
  };
  readonly producingWorkRef: {
    readonly workUnitId: string;
    readonly revision: number;
    readonly recordHash: string;
  };
  readonly worker: {
    readonly name: string;
    readonly version: string;
    readonly runtime: string;
    readonly entrypoint: string;
  };
  readonly outcome: string;
  readonly attempt: number;
  readonly reportedAt: string;
  readonly outputs: ReadonlyArray<{
    readonly name: string;
    readonly role: string;
    readonly state: string;
    readonly handle?: string;
    readonly contentHash?: string;
    readonly byteSize?: number;
    readonly mediaType: string;
    readonly limitation: string;
  }>;
  readonly diagnostics: ReadonlyArray<{
    readonly code: string;
    readonly severity: "info" | "warning" | "error";
    readonly message: string;
  }>;
  readonly resourceUsage: {
    readonly wallTimeMs: number;
    readonly cpuTimeMs?: number;
    readonly peakMemoryBytes?: number;
    readonly inputBytes: number;
    readonly outputBytes: number;
    readonly networkBytes?: number;
    readonly gpuTimeMs?: number;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly cost?: { readonly currency: string; readonly microunits: number };
  };
  readonly limitations: readonly string[];
}

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const randomUlidPayload = (): string => {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  let timestamp = BigInt(Date.now());
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 255n);
    timestamp >>= 8n;
  }
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = CROCKFORD_BASE32[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return payload;
};

const projectWorkClient = (): ProjectWorkClient =>
  new ProjectWorkClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    fetch: (input, init) => fetch(input, init),
  });

export type ProjectWorkCommandOperation =
  PetraProjectWorkOperationRequest["operation"];

export interface ProjectWorkCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
  readonly inputRequestRef?: PetraProjectWorkOperationRequest["input_request_ref"];
  readonly response?: string;
  readonly instruction?: string;
  readonly priority?: PetraProjectWorkOperationRequest["priority"];
  readonly reason?: string;
}

export interface ProjectWorkResumeCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
  readonly submittedAt?: string;
}

export interface ProjectWorkStartAgainCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
  readonly submittedAt?: string;
}

export const createProjectWorkCommandIdentity = (
  operation: ProjectWorkCommandOperation,
): { commandId: string; idempotencyKey: string } => {
  const identity = randomUlidPayload();
  return {
    commandId: `command_${identity}`,
    idempotencyKey: `project-work:${identity}:${operation}`,
  };
};

/**
 * Builds caller-owned command identity and task input only. Actor and grant
 * authority remain server-owned, and the exact assessment supplies the Work
 * and plan references.
 */
export const createProjectWorkOperationRequest = (
  view: PetraProjectWorkOperationsView,
  operation: ProjectWorkCommandOperation,
  options: ProjectWorkCommandOptions = {},
): PetraProjectWorkOperationRequest => {
  const control = view.controls.find(
    (candidate) => candidate.operation === operation,
  );
  if (control?.state !== "available") {
    throw new ProjectDataError(
      control?.reason ?? "This Work operation is not registered.",
      409,
    );
  }
  const identity = createProjectWorkCommandIdentity(operation);
  const common = {
    schema_name: "petra.project-work-operation-request" as const,
    schema_version: "1.0.0" as const,
    command_id: options.commandId ?? identity.commandId,
    idempotency_key: options.idempotencyKey ?? identity.idempotencyKey,
    operation,
    expected_work_unit_ref: structuredClone(view.work_unit_ref),
    submitted_at: new Date().toISOString(),
  };
  if (operation === "answer_input") {
    const response = options.response?.trim();
    if (
      options.inputRequestRef === undefined ||
      response === undefined ||
      response.length === 0
    ) {
      throw new ProjectDataError(
        "Answering Work input requires the exact pending request and one registered response.",
        400,
      );
    }
    const pending = view.required_inputs.find(
      (input) =>
        input.state === "pending" &&
        input.input_request_ref.input_request_id ===
          options.inputRequestRef?.input_request_id &&
        input.input_request_ref.revision === options.inputRequestRef.revision,
    );
    if (pending === undefined || !pending.response_options.includes(response)) {
      throw new ProjectDataError(
        "The selected Work input response is not registered for this exact pending request.",
        409,
      );
    }
    return {
      ...common,
      operation,
      input_request_ref: structuredClone(options.inputRequestRef),
      response,
    };
  }
  if (operation === "steer") {
    const instruction = options.instruction?.trim();
    if (
      instruction === undefined ||
      instruction.length === 0 ||
      options.priority === undefined
    ) {
      throw new ProjectDataError(
        "Steering Work requires a clear instruction and the next scheduling priority.",
        400,
      );
    }
    return {
      ...common,
      operation,
      expected_plan_revision: view.plan.revision,
      instruction,
      priority: options.priority,
    };
  }
  if (operation === "prioritize") {
    if (options.priority === undefined) {
      throw new ProjectDataError(
        "Prioritizing Work requires one registered scheduling priority.",
        400,
      );
    }
    return {
      ...common,
      operation,
      expected_plan_revision: view.plan.revision,
      priority: options.priority,
    };
  }
  if (operation === "cancel") {
    const reason = options.reason?.trim();
    if (reason === undefined || reason.length === 0) {
      throw new ProjectDataError(
        "Cancelling Work requires a retained reason.",
        400,
      );
    }
    return { ...common, operation, reason };
  }
  return { ...common, operation };
};

/**
 * Copies the complete server-supplied checkpoint binding into one resume
 * request. The browser never derives checkpoint compatibility from Work prose
 * or execution state.
 */
export const createProjectWorkResumeRequest = (
  view: PetraProjectWorkOperationsView,
  options: ProjectWorkResumeCommandOptions = {},
): PetraProjectWorkResumeRequest => {
  const control = view.controls.find(
    (candidate) => candidate.operation === "resume",
  );
  const binding = view.resume_binding;
  if (control?.state !== "available") {
    throw new ProjectDataError(
      control?.reason ?? "The server did not make Resume available.",
      409,
    );
  }
  if (binding === undefined) {
    throw new ProjectDataError(
      "The server did not register an exact checkpoint for Resume.",
      409,
    );
  }
  if (
    binding.project_id !== view.project_id ||
    canonicalize(binding.expected_work_unit_ref) !==
      canonicalize(view.work_unit_ref)
  ) {
    throw new ProjectDataError(
      "The Resume binding does not match this exact Project and Work revision.",
      409,
    );
  }
  const identity = randomUlidPayload();
  return {
    schema_name: "petra.project-work-resume-request",
    schema_version: "1.0.0",
    command_id: options.commandId ?? `command_${identity}`,
    idempotency_key:
      options.idempotencyKey ?? `project-work:${identity}:resume`,
    expected_work_unit_ref: structuredClone(binding.expected_work_unit_ref),
    expected_checkpoint: structuredClone(binding.expected_checkpoint),
    submitted_at: options.submittedAt ?? new Date().toISOString(),
  };
};

/**
 * Copies the complete server-supplied fresh-input registration into one Start
 * again request. The browser creates only the command identity and never
 * selects replacement Work, input reuse, lineage, or authority.
 */
export const createProjectWorkStartAgainRequest = (
  view: PetraProjectWorkOperationsView,
  options: ProjectWorkStartAgainCommandOptions = {},
): PetraProjectWorkStartAgainRequest => {
  const control = view.controls.find(
    (candidate) => candidate.operation === "start_again",
  );
  const binding = view.start_again_binding;
  if (control?.state !== "available") {
    throw new ProjectDataError(
      control?.reason ?? "The server did not make Start again available.",
      409,
    );
  }
  if (binding === undefined) {
    throw new ProjectDataError(
      "The server did not register an exact fresh-input transition for Start again.",
      409,
    );
  }
  if (
    binding.project_id !== view.project_id ||
    canonicalize(binding.expected_prior_work_unit_ref) !==
      canonicalize(view.work_unit_ref) ||
    binding.fresh_work_unit_ref.work_unit_id ===
      view.work_unit_ref.work_unit_id ||
    binding.input_transition.strategy !== "fresh_input" ||
    binding.input_transition.retained_output_reuse !== "none" ||
    binding.input_transition.prior_input_manifest_ref.content_hash ===
      binding.input_transition.fresh_input_manifest_ref.content_hash ||
    binding.new_lineage_attempt !== binding.prior_lineage_attempt + 1
  ) {
    throw new ProjectDataError(
      "The Start again binding does not match this exact prior Work, fresh input, and linked execution boundary.",
      409,
    );
  }
  const identity = randomUlidPayload();
  return {
    schema_name: "petra.project-work-start-again-request",
    schema_version: "1.0.0",
    command_id: options.commandId ?? `command_${identity}`,
    idempotency_key:
      options.idempotencyKey ?? `project-work:${identity}:start-again`,
    expected_prior_work_unit_ref: structuredClone(
      binding.expected_prior_work_unit_ref,
    ),
    start_again_registration_ref: structuredClone(
      binding.start_again_registration_ref,
    ),
    submitted_at: options.submittedAt ?? new Date().toISOString(),
  };
};

export const readProjectWorkOperations = async (
  projectId: string,
  workUnitId: string,
): Promise<PetraProjectWorkOperationsView> =>
  projectWorkClient().readOperations(projectId, workUnitId);

export const readProjectWorkReceipts = async (
  projectId: string,
  workUnitId: string,
): Promise<
  readonly (
    | PetraProjectWorkOperationReceipt
    | PetraProjectWorkResumeReceipt
    | PetraProjectWorkStartAgainReceipt
  )[]
> => projectWorkClient().readReceipts(projectId, workUnitId);

export const executeProjectWorkOperation = async (
  projectId: string,
  workUnitId: string,
  request: PetraProjectWorkOperationRequest,
): Promise<PetraProjectWorkOperationReceipt> =>
  projectWorkClient().execute(projectId, workUnitId, request);

export const executeProjectWorkResume = async (
  projectId: string,
  workUnitId: string,
  request: PetraProjectWorkResumeRequest,
): Promise<PetraProjectWorkResumeReceipt> =>
  projectWorkClient().resume(projectId, workUnitId, request);

export const executeProjectWorkStartAgain = async (
  projectId: string,
  priorWorkUnitId: string,
  request: PetraProjectWorkStartAgainRequest,
): Promise<PetraProjectWorkStartAgainReceipt> =>
  projectWorkClient().startAgain(projectId, priorWorkUnitId, request);

export interface ProjectWorkDeliveryObservation {
  readonly kind: "reconnected" | "replayed";
  readonly interactionRunId: string;
  readonly protocolRunId: string;
  readonly eventCount: number;
  readonly summary: string;
}

const durableProjectWorkDelivery = (
  view: PetraProjectWorkOperationsView,
): Extract<
  PetraProjectWorkOperationsView["delivery"],
  { state: "durable" }
> => {
  if (view.delivery.state !== "durable") {
    throw new ProjectDataError(view.delivery.reason, 409);
  }
  return view.delivery;
};

export const reconnectProjectWorkDelivery = async (
  view: PetraProjectWorkOperationsView,
): Promise<ProjectWorkDeliveryObservation> => {
  const delivery = durableProjectWorkDelivery(view);
  const snapshot = await requestJson(delivery.reconnect_path);
  if (
    !isRecord(snapshot) ||
    snapshot.runId !== delivery.protocol_run_id ||
    snapshot.threadId !== delivery.protocol_thread_id ||
    snapshot.workUnitId !== view.work_unit_ref.work_unit_id ||
    !Number.isSafeInteger(snapshot.eventCount) ||
    Number(snapshot.eventCount) < 0
  ) {
    throw new ProjectDataError(
      "Petra reconnected to a different durable Work delivery.",
      502,
    );
  }
  return {
    kind: "reconnected",
    interactionRunId: delivery.interaction_run_id,
    protocolRunId: delivery.protocol_run_id,
    eventCount: Number(snapshot.eventCount),
    summary: `Canonical Work delivery is ${String(snapshot.status).replaceAll("_", " ")} with ${Number(snapshot.eventCount)} retained ${Number(snapshot.eventCount) === 1 ? "event" : "events"}.`,
  };
};

export const replayProjectWorkDelivery = async (
  view: PetraProjectWorkOperationsView,
): Promise<ProjectWorkDeliveryObservation> => {
  const delivery = durableProjectWorkDelivery(view);
  const client = new PetraInteractionClient({
    endpoint: "/api/interactions/run",
    token: apiToken(),
  });
  const replay = await client.replay({
    threadId: delivery.protocol_thread_id,
    runId: delivery.protocol_run_id,
    connectionId: `interaction_connection_${randomUlidPayload()}`,
    afterSequence: 0,
  });
  const crossedWork = replay.events.some((event) => {
    const metadata = isRecord(event.payload.metadata)
      ? event.payload.metadata
      : undefined;
    const petra = isRecord(metadata?.petra) ? metadata.petra : undefined;
    return (
      petra !== undefined &&
      petra.workUnitId !== view.work_unit_ref.work_unit_id
    );
  });
  const terminal = replay.events.at(-1);
  if (
    replay.events.length === 0 ||
    crossedWork ||
    (terminal?.type === "RUN_FINISHED" &&
      terminal.payload.runId !== delivery.protocol_run_id)
  ) {
    throw new ProjectDataError(
      "Petra replayed a different or empty durable Work delivery.",
      502,
    );
  }
  return {
    kind: "replayed",
    interactionRunId: delivery.interaction_run_id,
    protocolRunId: delivery.protocol_run_id,
    eventCount: replay.events.length,
    summary: `Replayed ${replay.events.length} retained ${replay.events.length === 1 ? "event" : "events"} without starting another Work attempt.`,
  };
};

export interface ReviewSessionLifecycleCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
  readonly rationale?: string;
}

export type ReviewSessionDeferCommandOptions =
  ReviewSessionLifecycleCommandOptions;

export interface ReviewSessionRefreshCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
}

export interface ReviewCandidateCorrectionCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
}

export interface ReviewCandidateBasisRevisionCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
}

export interface ReviewSessionSeparationCommandOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
}

/**
 * Creates only caller-owned DeferReviewSession input from the exact session
 * reference returned by the authenticated Review read. The server still
 * resolves authority and rechecks the current lifecycle.
 */
export const createReviewSessionDeferCommandInput = (
  review: ReviewSession,
  options: ReviewSessionLifecycleCommandOptions = {},
): ReviewSessionLifecycleCommandInput => {
  const identity = randomUlidPayload();
  return {
    projectId: review.projectId,
    reviewSessionId: review.id,
    commandId: options.commandId ?? `command_${identity}`,
    idempotencyKey:
      options.idempotencyKey ?? `review-session:${identity}:defer`,
    requestedAction: "defer",
    expectedReviewSessionRef: {
      review_session_id: review.id,
      revision: review.exactRef.revision,
      content_hash: review.exactRef.contentHash,
      lifecycle: "open",
    },
    ...(options.rationale === undefined
      ? {}
      : { rationale: options.rationale }),
  };
};

/**
 * Creates only caller-owned ReopenReviewSession input when the authenticated
 * Review read returned the exact deferred lifecycle. The server still resolves
 * authority and rechecks the current lifecycle.
 */
export const createReviewSessionReopenCommandInput = (
  review: ReviewSession,
  options: ReviewSessionLifecycleCommandOptions = {},
): ReviewSessionLifecycleCommandInput => {
  if (review.lifecycle !== "deferred") {
    throw new ProjectDataError(
      "A ReviewSession reopen command requires an exact deferred lifecycle from the authenticated Review read.",
      400,
    );
  }
  const identity = randomUlidPayload();
  return {
    projectId: review.projectId,
    reviewSessionId: review.id,
    commandId: options.commandId ?? `command_${identity}`,
    idempotencyKey:
      options.idempotencyKey ?? `review-session:${identity}:reopen`,
    requestedAction: "reopen",
    expectedReviewSessionRef: {
      review_session_id: review.id,
      revision: review.exactRef.revision,
      content_hash: review.exactRef.contentHash,
      lifecycle: review.lifecycle,
    },
    ...(options.rationale === undefined
      ? {}
      : { rationale: options.rationale }),
  };
};

/**
 * Creates only caller-owned RefreshReviewSession input when the authenticated
 * Review read supplied the exact open lifecycle. The server still decides
 * whether refresh is required and authorized and selects compatible heads.
 */
export const createReviewSessionRefreshCommandInput = (
  review: ReviewSession,
  options: ReviewSessionRefreshCommandOptions = {},
): ReviewSessionRefreshCommandInput => {
  if (review.lifecycle !== "open") {
    throw new ProjectDataError(
      "A ReviewSession refresh command requires an exact open lifecycle from the authenticated Review read.",
      400,
    );
  }
  const identity = randomUlidPayload();
  return {
    projectId: review.projectId,
    reviewSessionId: review.id,
    commandId: options.commandId ?? `command_${identity}`,
    idempotencyKey:
      options.idempotencyKey ?? `review-session:${identity}:refresh`,
    expectedReviewSessionRef: {
      review_session_id: review.id,
      revision: review.exactRef.revision,
      content_hash: review.exactRef.contentHash,
      lifecycle: review.lifecycle,
    },
  };
};

/**
 * Builds the compact separation request from one exact member and the exact
 * open ReviewSession returned by the authenticated Review read. Server
 * authority decides whether the member and its ChangeSets can be partitioned.
 */
export const createReviewSessionSeparationCommandInput = (
  review: ReviewSession,
  reviewMemberId: string,
  options: ReviewSessionSeparationCommandOptions = {},
): ReviewSessionSeparationCommandInput => {
  if (
    review.lifecycle !== "open" ||
    review.members === undefined ||
    review.members.length < 2 ||
    !review.members.some((member) => member.reviewMemberId === reviewMemberId)
  ) {
    throw new ProjectDataError(
      "Review separation requires one exact member of an authenticated open multi-member ReviewSession.",
      400,
    );
  }
  const identity = randomUlidPayload();
  return {
    projectId: review.projectId,
    reviewSessionId: review.id,
    request: {
      command_id: options.commandId ?? `command_${identity}`,
      idempotency_key:
        options.idempotencyKey ?? `review-session:${identity}:separation`,
      expected_review_session_ref: {
        review_session_id: review.id,
        revision: review.exactRef.revision,
        content_hash: review.exactRef.contentHash,
        lifecycle: review.lifecycle,
      },
      review_member_id: reviewMemberId,
    },
  };
};

/**
 * Creates the compact human Claim-text correction from exact references in the
 * authenticated Review read. Profile records and working revisions remain
 * server-composed.
 */
export const createReviewCandidateCorrectionCommandInput = (
  review: ReviewSession,
  canonicalText: string,
  options: ReviewCandidateCorrectionCommandOptions = {},
): ReviewCandidateCorrectionCommandInput => {
  if (review.lifecycle !== "open" || review.candidateCorrection === undefined) {
    throw new ProjectDataError(
      "A candidate correction requires exact scientific working references and an open lifecycle from the authenticated Review read.",
      400,
    );
  }
  if (
    canonicalText.trim().length === 0 ||
    canonicalText.length > 20_000 ||
    canonicalText === review.candidate.proposed
  ) {
    throw new ProjectDataError(
      "A candidate correction requires changed Claim text between 1 and 20000 characters.",
      400,
    );
  }
  const identity = randomUlidPayload();
  return {
    projectId: review.projectId,
    reviewSessionId: review.id,
    request: {
      command_id: options.commandId ?? `command_${identity}`,
      idempotency_key:
        options.idempotencyKey ??
        `review-session:${identity}:candidate-correction`,
      expected_review_session_ref: {
        review_session_id: review.id,
        revision: review.exactRef.revision,
        content_hash: review.exactRef.contentHash,
        lifecycle: review.lifecycle,
      },
      review_member_id: review.candidateCorrection.reviewMemberId,
      expected_working_candidate_ref: {
        ...review.candidateCorrection.expectedWorkingCandidateRef,
      },
      expected_working_relationship_ref: {
        ...review.candidateCorrection.expectedWorkingRelationshipRef,
      },
      correction_input: {
        input_kind: "human_scientific_claim_text_edit",
        canonical_text: canonicalText,
      },
    },
  };
};

/**
 * Builds a material source-basis revision from exact authenticated Review and
 * ProjectSource reads plus human-authored source semantics. The browser does
 * not compose profile records, working revisions, validation, or authority.
 */
export const createReviewCandidateBasisRevisionCommandInput = (
  review: ReviewSession,
  draft: ReviewCandidateBasisRevisionDraft,
  options: ReviewCandidateBasisRevisionCommandOptions = {},
): ReviewCandidateBasisRevisionCommandInput => {
  const basisRevision = review.candidateBasisRevision;
  if (
    review.lifecycle !== "open" ||
    basisRevision === undefined ||
    basisRevision.expectedProjectSourceRef === undefined ||
    basisRevision.sourceSpanRefs.length === 0
  ) {
    throw new ProjectDataError(
      "A basis revision requires exact scientific Review, working, Claim, active ProjectSource, and SourceSpan references from authenticated reads.",
      400,
    );
  }
  const attribution = draft.attribution.trim();
  const reason = draft.reason.trim();
  const uncertainty = draft.uncertainty?.trim();
  if (
    attribution.length === 0 ||
    attribution.length > 4000 ||
    reason.length === 0 ||
    reason.length > 4000 ||
    (uncertainty !== undefined && uncertainty.length > 4000)
  ) {
    throw new ProjectDataError(
      "A basis revision requires bounded human attribution and a material reason.",
      400,
    );
  }
  const identity = randomUlidPayload();
  return {
    projectId: review.projectId,
    reviewSessionId: review.id,
    request: {
      command_id: options.commandId ?? `command_${identity}`,
      idempotency_key:
        options.idempotencyKey ??
        `review-session:${identity}:candidate-basis-revision`,
      expected_review_session_ref: {
        review_session_id: review.id,
        revision: review.exactRef.revision,
        content_hash: review.exactRef.contentHash,
        lifecycle: review.lifecycle,
      },
      review_member_id: basisRevision.reviewMemberId,
      expected_project_definition_ref: structuredClone(
        basisRevision.expectedProjectDefinitionRef,
      ),
      expected_working_candidate_ref: structuredClone(
        basisRevision.expectedWorkingCandidateRef,
      ),
      expected_working_relationship_ref: structuredClone(
        basisRevision.expectedWorkingRelationshipRef,
      ),
      expected_claim_ref: structuredClone(basisRevision.expectedClaimRef),
      basis_revision_input: {
        input_kind: "human_scientific_source_basis_revision",
        project_source_ref: structuredClone(
          basisRevision.expectedProjectSourceRef,
        ),
        source_span_refs: structuredClone(basisRevision.sourceSpanRefs) as [
          (typeof basisRevision.sourceSpanRefs)[number],
          ...(typeof basisRevision.sourceSpanRefs)[number][],
        ],
        source_scope: draft.sourceScope,
        detail_level: draft.detailLevel,
        source_stance: draft.sourceStance,
        attribution,
        modality: draft.modality,
        negated: draft.negated,
        ...(uncertainty === undefined || uncertainty.length === 0
          ? {}
          : { uncertainty }),
        reason,
      },
    },
  };
};

export interface SuggestedActionInvocationRequestOptions {
  readonly commandId?: string;
  readonly idempotencyKey?: string;
  readonly submittedAt?: string;
}

/**
 * Builds only the caller-owned part of the exact invocation. Actor, grant,
 * Project, Work, interaction, and trace identities stay absent and server-owned.
 */
export const createSuggestedActionInvocationRequest = (
  actionView: PetraSuggestedActionViewV11,
  options: SuggestedActionInvocationRequestOptions = {},
): PetraSuggestedActionInvocationRequest => {
  const identity = randomUlidPayload();
  const commandId = options.commandId ?? `command_${identity}`;
  return {
    schema_name: "petra.suggested-action-invocation-request",
    schema_version: "1.0.0",
    command_id: commandId,
    idempotency_key: options.idempotencyKey ?? `suggested-action:${identity}`,
    inquiry_result_link_id:
      actionView.content.action.basis.inquiry_result_link_ref
        .project_inquiry_link_id,
    expected_action_ref: { ...actionView.content.action_ref },
    response_depth: actionView.content.action.response_depth.recommended,
    submitted_at: options.submittedAt ?? new Date().toISOString(),
  };
};

export interface SuggestedActionWorkCancellationRequest {
  readonly commandId: string;
  readonly reason?: string;
}

export interface SuggestedActionWorkCancellationRequestOptions {
  readonly commandId?: string;
  readonly reason?: string;
}

export interface SuggestedActionInteractionReplayRequest {
  readonly connectionId: string;
  readonly afterSequence: 0;
}

export interface SuggestedActionInteractionReplayRequestOptions {
  readonly connectionId?: string;
}

export interface ProjectSuggestedActionWorkCancellation {
  readonly cancellation: SuggestedActionWorkCancellationResult;
  readonly invocation: PetraSuggestedActionInvocationView;
}

export interface ProjectSuggestedActionInteractionReplay {
  readonly replay: PetraInteractionResult;
  readonly invocation: PetraSuggestedActionInvocationView;
}

/**
 * Builds only caller-owned cancellation input. Project, Actor, capability,
 * InteractionRun, WorkUnit, trace, and cancellation identities stay absent and
 * are resolved by the authenticated runtime boundary.
 */
export const createSuggestedActionWorkCancellationRequest = (
  options: SuggestedActionWorkCancellationRequestOptions = {},
): SuggestedActionWorkCancellationRequest => ({
  commandId: options.commandId ?? `command_${randomUlidPayload()}`,
  ...(options.reason === undefined ? {} : { reason: options.reason }),
});

/**
 * Creates one caller-owned delivery identity for a full persisted response
 * replay. The Project, command, Work, Actor, capability, InteractionRun, and
 * result identities are deliberately absent and come from a fresh server read.
 */
export const createSuggestedActionInteractionReplayRequest = (
  options: SuggestedActionInteractionReplayRequestOptions = {},
): SuggestedActionInteractionReplayRequest => ({
  connectionId:
    options.connectionId ?? `interaction_connection_${randomUlidPayload()}`,
  afterSequence: 0,
});

/**
 * Renderer-neutral boundary for the single Work-starting action family. The
 * caller must retain the exact action ref and pass it back unchanged when it
 * invokes the command.
 */
export const getProjectSuggestedWorkAction = async (
  projectId: string,
  inquiryResultLinkId: string,
): Promise<PetraSuggestedActionViewV11> => {
  const query = new URLSearchParams({
    inquiry_result_link_id: inquiryResultLinkId,
    action_kind: "run_grounded_synthesis",
  });
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/suggested-actions?${query}`,
  );
  const view = suggestedWorkActionView(value);
  if (
    view.project_id !== projectId ||
    view.content.action.basis.inquiry_result_link_ref
      .project_inquiry_link_id !== inquiryResultLinkId
  ) {
    throw new ProjectDataError(
      "Petra returned a SuggestedAction for a different Project or inquiry-result basis.",
      502,
    );
  }
  return view;
};

export const invokeProjectSuggestedAction = async (
  projectId: string,
  suggestedActionId: string,
  request: PetraSuggestedActionInvocationRequest,
): Promise<PetraSuggestedActionInvocationView> => {
  if (request.expected_action_ref.suggested_action_id !== suggestedActionId) {
    throw new ProjectDataError(
      "The invocation request does not name the selected SuggestedAction.",
      400,
    );
  }
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(projectId)}/suggested-actions/${encodeURIComponent(suggestedActionId)}/invoke`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  const view = suggestedActionInvocationView(value);
  if (
    view.project_id !== projectId ||
    view.content.invocation.content.command_ref.command_id !==
      request.command_id ||
    view.content.invocation.content.action_ref.suggested_action_id !==
      suggestedActionId ||
    view.content.invocation.content.action_ref.revision !==
      request.expected_action_ref.revision ||
    view.content.invocation.content.action_ref.content_hash !==
      request.expected_action_ref.content_hash
  ) {
    throw new ProjectDataError(
      "Petra returned a different SuggestedAction invocation identity.",
      502,
    );
  }
  return view;
};

export const getProjectSuggestedActionInvocation = async (
  projectId: string,
  commandId: string,
): Promise<PetraSuggestedActionInvocationView> => {
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/suggested-action-invocations/${encodeURIComponent(commandId)}`,
  );
  const view = suggestedActionInvocationView(value);
  if (
    view.project_id !== projectId ||
    view.content.invocation.content.command_ref.command_id !== commandId
  ) {
    throw new ProjectDataError(
      "Petra returned a different SuggestedAction invocation identity.",
      502,
    );
  }
  return view;
};

type SuggestedActionHistoryDestination =
  PetraSuggestedActionInvocationView["content"]["history"]["destinations"][number];

export interface ProjectSuggestedActionHistoryData {
  readonly invocation: PetraSuggestedActionInvocationView;
  readonly historyDestination: SuggestedActionHistoryDestination;
  readonly workDestination: SuggestedActionHistoryDestination;
}

/**
 * Resolves only the runtime Work History deep link supplied by an exact
 * SuggestedAction invocation. Other frozen History routes keep their existing
 * provider until their separately accepted mappings are integrated.
 */
export const loadProjectSuggestedActionHistory = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<
  ProjectSuggestedActionHistoryData | undefined
> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const incoming = new URL(request.url).searchParams;
  const semanticKeys = incoming.getAll("target_semantic_key");
  const objectIds = incoming.getAll("target_object_id");
  const commandIds = incoming.getAll("suggested_action_command_id");
  const hasRuntimeHistoryIdentity =
    semanticKeys.length > 0 || objectIds.length > 0 || commandIds.length > 0;
  if (!hasRuntimeHistoryIdentity) return undefined;
  if (
    semanticKeys.length !== 1 ||
    objectIds.length !== 1 ||
    commandIds.length !== 1
  ) {
    throw new ProjectDataError(
      "Runtime Work History requires one exact semantic key, WorkUnit, and SuggestedAction command receipt.",
      400,
    );
  }
  const semanticKey = semanticKeys[0];
  const objectId = objectIds[0];
  const commandId = commandIds[0];
  if (
    semanticKey !== "petra.work-unit" ||
    objectId === undefined ||
    !objectId.startsWith("work_unit_") ||
    !API_REQUEST_ID.test(objectId) ||
    commandId === undefined ||
    !commandId.startsWith("command_") ||
    !API_REQUEST_ID.test(commandId)
  ) {
    throw new ProjectDataError(
      "The runtime Work History destination contains an unsupported or invalid identity.",
      400,
    );
  }
  const invocation = await getProjectSuggestedActionInvocation(
    projectId,
    commandId,
  );
  const { content } = invocation;
  const historyDestinations = content.history.destinations.filter(
    (destination) =>
      destination.place_role === "history" &&
      destination.task_intent === "view_history" &&
      destination.object_ref.semantic_key === semanticKey &&
      destination.object_ref.object_id === objectId,
  );
  const workDestinations = content.history.destinations.filter(
    (destination) =>
      destination.place_role === "work" &&
      destination.task_intent === "continue_work" &&
      destination.object_ref.semantic_key === semanticKey &&
      destination.object_ref.object_id === objectId,
  );
  const historyDestination = historyDestinations[0];
  const workDestination = workDestinations[0];
  const invocationRef = content.invocation_ref;
  const receiptRef = content.history.command_receipt_ref;
  const expectedWorkId = content.invocation.content.expected_work_unit_id;
  const routedWorkId =
    content.work.state === "available"
      ? content.work.work_unit_ref.work_unit_id
      : content.work.expected_work_unit_id;
  let previousRevision = 0;
  const revisionsAreExact = content.history.work_revisions.every((entry) => {
    const exact =
      entry.work_unit_ref.work_unit_id === objectId &&
      entry.work_unit_ref.revision > previousRevision;
    previousRevision = entry.work_unit_ref.revision;
    return exact;
  });
  const currentRevisionMatches =
    content.work.state === "pending_registration"
      ? content.history.work_revisions.length === 0
      : content.history.work_revisions.at(-1)?.work_unit_ref.revision ===
        content.work.work_unit_ref.revision;
  if (
    historyDestinations.length !== 1 ||
    workDestinations.length !== 1 ||
    historyDestination === undefined ||
    workDestination === undefined ||
    expectedWorkId !== objectId ||
    routedWorkId !== objectId ||
    receiptRef.suggested_action_invocation_id !==
      invocationRef.suggested_action_invocation_id ||
    receiptRef.revision !== invocationRef.revision ||
    receiptRef.content_hash !== invocationRef.content_hash ||
    receiptRef.record_hash !== invocationRef.record_hash ||
    !revisionsAreExact ||
    !currentRevisionMatches
  ) {
    throw new ProjectDataError(
      "Petra returned runtime History for a different command receipt, WorkUnit, or canonical revision sequence.",
      502,
    );
  }
  return { invocation, historyDestination, workDestination };
};

export type ProjectHistoryRouteData =
  | {
      readonly kind: "retained";
      readonly history: PetraProjectHistoryRetainedViewV12;
    }
  | {
      readonly kind: "suggested_action";
      readonly history: ProjectSuggestedActionHistoryData;
    };

const HISTORY_ROUTE_FILTER_VALUES = {
  family: [
    "change_control",
    "project_source_lifecycle",
    "project_source_replacement",
  ],
  command_name: [
    "SubmitChangeSet",
    "RecordApproval",
    "ApplyChangeSet",
    "ExcludeProjectSource",
    "RestoreProjectSource",
    "CreateProjectSourceReplacement",
    "RetractProjectSourceReplacement",
  ],
  event_type: [
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
  ],
  outcome: ["completed", "conflicted"],
  effect: [
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
  ],
} as const;

const historyRouteValue = (
  search: URLSearchParams,
  name: string,
): string | undefined => {
  const values = search.getAll(name).filter((value) => value.length > 0);
  if (values.length > 1) {
    throw new ProjectDataError(
      `Full History requires at most one ${name.replaceAll("_", " ")} filter.`,
      400,
    );
  }
  return values[0];
};

const historyRouteEnum = <Values extends readonly string[]>(
  search: URLSearchParams,
  name: string,
  values: Values,
): Values[number] | undefined => {
  const value = historyRouteValue(search, name);
  if (value === undefined) return undefined;
  if (!values.includes(value)) {
    throw new ProjectDataError(
      `Full History ${name.replaceAll("_", " ")} is not a registered filter value.`,
      400,
    );
  }
  return value;
};

const historyRouteTimestamp = (
  search: URLSearchParams,
  name: string,
): string | undefined => {
  const value = historyRouteValue(search, name);
  if (value === undefined) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(value)
    ? `${value}:00.000Z`
    : value;
  if (
    !HISTORY_RETAINED_TIMESTAMP.test(normalized) ||
    !Number.isFinite(Date.parse(normalized))
  ) {
    throw new ProjectDataError(
      `Full History ${name.replaceAll("_", " ")} must be an exact UTC date and time.`,
      400,
    );
  }
  return normalized;
};

/**
 * Resolves either the separately bound SuggestedAction Work-History deep link
 * or the authenticated retained Project History collection. The browser route
 * never falls back to design fixtures when no deep-link identity is supplied.
 */
export const loadProjectHistory = async (
  args: LoaderFunctionArgs,
): Promise<ProjectHistoryRouteData> => {
  const suggestedAction = await loadProjectSuggestedActionHistory(args);
  if (suggestedAction !== undefined) {
    return { kind: "suggested_action", history: suggestedAction };
  }

  const projectId = requiredRouteIdentity(
    args.params.projectId,
    "A Project ID",
  );
  const search = new URL(args.request.url).searchParams;
  const family = historyRouteEnum(
    search,
    "family",
    HISTORY_ROUTE_FILTER_VALUES.family,
  );
  const commandName = historyRouteEnum(
    search,
    "command_name",
    HISTORY_ROUTE_FILTER_VALUES.command_name,
  );
  const eventType = historyRouteEnum(
    search,
    "event_type",
    HISTORY_ROUTE_FILTER_VALUES.event_type,
  );
  const outcome = historyRouteEnum(
    search,
    "outcome",
    HISTORY_ROUTE_FILTER_VALUES.outcome,
  );
  const effect = historyRouteEnum(
    search,
    "effect",
    HISTORY_ROUTE_FILTER_VALUES.effect,
  );
  const actorId = historyRouteValue(search, "actor_id");
  const targetValue = historyRouteValue(search, "target");
  const targetParts = targetValue?.split("::") ?? [];
  if (targetValue !== undefined && targetParts.length !== 2) {
    throw new ProjectDataError(
      "Full History target must preserve one exact semantic key and object identity.",
      400,
    );
  }
  const recordedFrom = historyRouteTimestamp(search, "recorded_from");
  const recordedThrough = historyRouteTimestamp(search, "recorded_through");
  const target =
    targetValue === undefined
      ? undefined
      : ({
          semantic_key: targetParts[0],
          object_id: targetParts[1],
        } as ProjectHistoryRetainedExactTargetFilterV12);
  const filters: ProjectHistoryRetainedCollectionFiltersV12 = {
    ...(family === undefined ? {} : { family }),
    ...(commandName === undefined ? {} : { command_name: commandName }),
    ...(eventType === undefined ? {} : { event_type: eventType }),
    ...(actorId === undefined ? {} : { actor_id: actorId }),
    ...(outcome === undefined ? {} : { outcome }),
    ...(effect === undefined ? {} : { effect }),
    ...(target === undefined ? {} : { target }),
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
  return {
    kind: "retained",
    history: await getRetainedProjectHistory(projectId, {
      limit: 50,
      filters,
    }),
  };
};

const sameSuggestedActionInvocationAuthority = (
  before: PetraSuggestedActionInvocationView,
  after: PetraSuggestedActionInvocationView,
): boolean => {
  const beforeInvocation = before.content.invocation_ref;
  const afterInvocation = after.content.invocation_ref;
  const beforeCommand = before.content.invocation.content.command_ref;
  const afterCommand = after.content.invocation.content.command_ref;
  const beforeHistory = before.content.history.command_receipt_ref;
  const afterHistory = after.content.history.command_receipt_ref;
  return (
    before.project_id === after.project_id &&
    JSON.stringify(before.content.invocation) ===
      JSON.stringify(after.content.invocation) &&
    beforeInvocation.suggested_action_invocation_id ===
      afterInvocation.suggested_action_invocation_id &&
    beforeInvocation.revision === afterInvocation.revision &&
    beforeInvocation.content_hash === afterInvocation.content_hash &&
    beforeInvocation.record_hash === afterInvocation.record_hash &&
    beforeCommand.command_id === afterCommand.command_id &&
    beforeCommand.command_name === afterCommand.command_name &&
    beforeCommand.idempotency_key === afterCommand.idempotency_key &&
    beforeCommand.command_fingerprint === afterCommand.command_fingerprint &&
    beforeCommand.capability_grant_id === afterCommand.capability_grant_id &&
    beforeCommand.actor.actor_id === afterCommand.actor.actor_id &&
    beforeCommand.actor.actor_kind === afterCommand.actor.actor_kind &&
    beforeCommand.correlation_id === afterCommand.correlation_id &&
    beforeCommand.submitted_at === afterCommand.submitted_at &&
    beforeHistory.suggested_action_invocation_id ===
      afterHistory.suggested_action_invocation_id &&
    beforeHistory.revision === afterHistory.revision &&
    beforeHistory.content_hash === afterHistory.content_hash &&
    beforeHistory.record_hash === afterHistory.record_hash &&
    JSON.stringify(before.content.history.destinations) ===
      JSON.stringify(after.content.history.destinations) &&
    before.content.interaction.protocol_thread_id ===
      after.content.interaction.protocol_thread_id &&
    before.content.interaction.protocol_run_id ===
      after.content.interaction.protocol_run_id
  );
};

const suggestedActionReplayMatches = (
  replay: PetraInteractionResult,
  invocation: PetraSuggestedActionInvocationView,
  connection: SuggestedActionInteractionReplayRequest,
): boolean => {
  if (
    replay.events.length === 0 ||
    replay.events[0]?.type !== "RUN_STARTED" ||
    replay.pendingInterrupts.length !== 0 ||
    connection.afterSequence !== 0
  ) {
    return false;
  }
  const correlation = invocation.content.interaction;
  const command = invocation.content.invocation.content.command_ref;
  const work = invocation.content.work;
  const interactionRunRef = correlation.interaction_run_ref;
  if (work.state !== "available" || interactionRunRef === undefined) {
    return false;
  }
  let sequence = 0;
  for (const event of replay.events) {
    const payload = event.payload;
    const metadata = isRecord(payload.metadata)
      ? payload.metadata.petra
      : undefined;
    if (
      !isRecord(metadata) ||
      !Number.isSafeInteger(metadata.sequence) ||
      Number(metadata.sequence) < 1 ||
      Number(metadata.sequence) < sequence ||
      Number(metadata.sequence) > sequence + 1 ||
      metadata.workUnitId !== work.work_unit_ref.work_unit_id ||
      metadata.traceId !== command.correlation_id ||
      (payload.threadId !== undefined &&
        payload.threadId !== correlation.protocol_thread_id) ||
      (payload.runId !== undefined &&
        payload.runId !== correlation.protocol_run_id)
    ) {
      return false;
    }
    sequence = Number(metadata.sequence);
  }
  const terminal = replay.events.at(-1);
  if (terminal?.type === "RUN_ERROR") {
    return (
      invocation.content.operation_state === "failed" ||
      invocation.content.operation_state === "cancelled"
    );
  }
  if (
    terminal?.type !== "RUN_FINISHED" ||
    terminal.payload.threadId !== correlation.protocol_thread_id ||
    terminal.payload.runId !== correlation.protocol_run_id ||
    invocation.content.operation_state !== "completed" ||
    invocation.content.result.state !== "available" ||
    !isRecord(terminal.payload.result) ||
    !isRecord(terminal.payload.result.terminalBinding)
  ) {
    return false;
  }
  const binding = terminal.payload.result.terminalBinding;
  return (
    binding.grounded_response_id ===
      invocation.content.result.result_ref.record_id &&
    binding.grounded_response_revision ===
      invocation.content.result.result_ref.revision &&
    binding.grounded_response_hash ===
      invocation.content.result.result_ref.content_hash &&
    binding.interaction_run_id === interactionRunRef.record_id &&
    binding.work_unit_id === work.work_unit_ref.work_unit_id &&
    binding.work_unit_revision === work.work_unit_ref.revision &&
    binding.work_unit_spec_hash === work.work_unit_ref.spec_hash
  );
};

/**
 * Replays one exact SuggestedAction InteractionRun through Petra's
 * authenticated presentation boundary. Server-owned recovery eligibility is
 * reread before delivery, and the immutable invocation plus canonical Work,
 * result, InteractionRun, and History identities are verified afterwards.
 */
export const replayProjectSuggestedActionInteraction = async (
  projectId: string,
  invocationCommandId: string,
  request: SuggestedActionInteractionReplayRequest,
): Promise<ProjectSuggestedActionInteractionReplay> => {
  if (
    !COMMAND_ID.test(invocationCommandId) ||
    !isRecord(request) ||
    !hasExactKeys(request, ["connectionId", "afterSequence"]) ||
    !INTERACTION_CONNECTION_ID.test(request.connectionId) ||
    request.afterSequence !== 0
  ) {
    throw new ProjectDataError(
      "SuggestedAction replay requires one canonical delivery connection and the exact full-response checkpoint.",
      400,
    );
  }
  const current = await getProjectSuggestedActionInvocation(
    projectId,
    invocationCommandId,
  );
  const reconnect = current.content.recovery.actions.find(
    (action) => action.operation === "reconnect_delivery",
  );
  if (reconnect === undefined || reconnect.command_name !== undefined) {
    throw new ProjectDataError(
      "Petra returned an inconsistent server-owned replay assessment.",
      502,
    );
  }
  if (reconnect.eligibility !== "eligible") {
    throw new ProjectDataError(reconnect.reason, 409);
  }
  if (
    current.content.interaction.durable_state !== "available" ||
    current.content.work.state !== "available"
  ) {
    throw new ProjectDataError(
      "Petra marked replay eligible without a durable InteractionRun and WorkUnit.",
      502,
    );
  }
  const correlation = current.content.interaction;
  let replay: PetraInteractionResult;
  try {
    replay = await new PetraInteractionClient({
      endpoint: "/api/interactions/run",
      token: apiToken(),
      traceId: current.content.invocation.content.command_ref.correlation_id,
    }).replay({
      threadId: correlation.protocol_thread_id,
      runId: correlation.protocol_run_id,
      connectionId: request.connectionId,
      afterSequence: request.afterSequence,
    });
  } catch (error) {
    throw new ProjectDataError(
      error instanceof Error
        ? error.message
        : "The exact SuggestedAction interaction could not be replayed.",
      502,
    );
  }

  const updated = await getProjectSuggestedActionInvocation(
    projectId,
    invocationCommandId,
  );
  const currentRevisions = current.content.history.work_revisions;
  const updatedRevisions = updated.content.history.work_revisions;
  const updatedWork = updated.content.work;
  const currentWork = current.content.work;
  const currentInteractionRunRef =
    current.content.interaction.interaction_run_ref;
  const updatedInteractionRunRef =
    updated.content.interaction.interaction_run_ref;
  if (
    !sameSuggestedActionInvocationAuthority(current, updated) ||
    currentWork.state !== "available" ||
    updatedWork.state !== "available" ||
    updatedWork.work_unit_ref.work_unit_id !==
      currentWork.work_unit_ref.work_unit_id ||
    updated.content.interaction.durable_state !== "available" ||
    currentInteractionRunRef === undefined ||
    updatedInteractionRunRef === undefined ||
    updatedInteractionRunRef.record_id !== currentInteractionRunRef.record_id ||
    currentRevisions.some(
      (revision, index) =>
        JSON.stringify(revision) !== JSON.stringify(updatedRevisions[index]),
    ) ||
    !suggestedActionReplayMatches(replay, updated, request)
  ) {
    throw new ProjectDataError(
      "Petra replay did not preserve the exact invocation, InteractionRun, Work, result, and History identities.",
      502,
    );
  }
  return { replay, invocation: updated };
};

/**
 * Authenticated renderer-neutral binding to Petra's existing exact
 * CancelWorkUnit route. Eligibility and target resolution come from a fresh
 * server invocation read; the client supplies only one retained command ID and
 * an optional researcher-readable reason.
 */
export const cancelProjectSuggestedActionWork = async (
  projectId: string,
  invocationCommandId: string,
  request: SuggestedActionWorkCancellationRequest,
): Promise<ProjectSuggestedActionWorkCancellation> => {
  if (!COMMAND_ID.test(invocationCommandId)) {
    throw new ProjectDataError(
      "SuggestedAction cancellation requires the exact invocation command identity.",
      400,
    );
  }
  if (
    !COMMAND_ID.test(request.commandId) ||
    (request.reason !== undefined &&
      (request.reason.trim().length === 0 || request.reason.length > 4_000))
  ) {
    throw new ProjectDataError(
      "SuggestedAction cancellation requires a canonical command ID and an optional reason of 1 through 4000 characters.",
      400,
    );
  }

  const current = await getProjectSuggestedActionInvocation(
    projectId,
    invocationCommandId,
  );
  const cancellationAction = current.content.recovery.actions.find(
    (action) => action.operation === "cancel_work",
  );
  if (
    cancellationAction === undefined ||
    (cancellationAction.eligibility === "eligible" &&
      cancellationAction.command_name !== "CancelWorkUnit") ||
    (cancellationAction.eligibility === "ineligible" &&
      cancellationAction.command_name !== undefined)
  ) {
    throw new ProjectDataError(
      "Petra returned an inconsistent server-owned cancellation assessment.",
      502,
    );
  }
  if (current.content.work.state !== "available") {
    throw new ProjectDataError(cancellationAction.reason, 409);
  }

  const runId = current.content.interaction.protocol_run_id;
  const workUnitId = current.content.work.work_unit_ref.work_unit_id;
  const cancellation = suggestedActionWorkCancellationResult(
    await requestJson(`/api/work-units/${encodeURIComponent(runId)}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        commandId: request.commandId,
        ...(request.reason === undefined ? {} : { reason: request.reason }),
      }),
    }),
  );
  if (
    cancellation.commandId !== request.commandId ||
    cancellation.runId !== runId ||
    cancellation.workUnitId !== workUnitId
  ) {
    throw new ProjectDataError(
      "Petra cancelled a different command, InteractionRun, or WorkUnit.",
      502,
    );
  }

  const updated = await getProjectSuggestedActionInvocation(
    projectId,
    invocationCommandId,
  );
  const updatedCancellationAction = updated.content.recovery.actions.find(
    (action) => action.operation === "cancel_work",
  );
  const cancelledRevision = updated.content.history.work_revisions.find(
    (revision) =>
      revision.work_unit_ref.work_unit_id === cancellation.workUnitId &&
      revision.work_unit_ref.revision === cancellation.workUnitRevision,
  );
  if (
    !sameSuggestedActionInvocationAuthority(current, updated) ||
    updated.content.operation_state !== "cancelled" ||
    updated.content.work.state !== "available" ||
    updated.content.work.work_unit_ref.work_unit_id !==
      cancellation.workUnitId ||
    updated.content.work.work_unit_ref.revision !==
      cancellation.workUnitRevision ||
    updated.content.work.execution_state !== "cancelled" ||
    cancelledRevision?.state !== "cancelled" ||
    updatedCancellationAction?.eligibility !== "ineligible" ||
    updatedCancellationAction.command_name !== undefined
  ) {
    throw new ProjectDataError(
      "Petra did not preserve the exact invocation authority and cancelled Work History.",
      502,
    );
  }
  return { cancellation, invocation: updated };
};

type WorkerOutputRouteSelection = {
  readonly semanticKey: "petra.worker-output-manifest";
  readonly recordId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly recordHash: string;
  readonly parentRevision: number;
  readonly parentRecordHash: string;
};

const workerOutputRouteSelection = (
  search: URLSearchParams,
): WorkerOutputRouteSelection | undefined => {
  const names = [
    "result_semantic_key",
    "result_id",
    "result_revision",
    "result_content_hash",
    "result_record_hash",
    "parent_revision",
    "parent_record_hash",
  ] as const;
  const values = Object.fromEntries(
    names.map((name) => {
      const matches = search.getAll(name);
      if (matches.length > 1) {
        throw new ProjectDataError(
          "A selected Work result must bind each exact identity once.",
          400,
        );
      }
      return [name, matches[0]];
    }),
  ) as Record<(typeof names)[number], string | undefined>;
  if (names.every((name) => values[name] === undefined)) return undefined;
  if (names.some((name) => values[name] === undefined)) {
    throw new ProjectDataError(
      "A selected Work result requires its exact manifest and producing-Work identities.",
      400,
    );
  }
  const revision = Number(values.result_revision);
  const parentRevision = Number(values.parent_revision);
  const recordId = values.result_id!;
  if (
    values.result_semantic_key !== "petra.worker-output-manifest" ||
    !/^worker_output_manifest_[0-9A-HJKMNP-TV-Z]{26}$/u.test(recordId) ||
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !CONTENT_HASH.test(values.result_content_hash!) ||
    !CONTENT_HASH.test(values.result_record_hash!) ||
    !Number.isSafeInteger(parentRevision) ||
    parentRevision < 1 ||
    !CONTENT_HASH.test(values.parent_record_hash!)
  ) {
    throw new ProjectDataError(
      "The selected WorkerOutputManifest binding is invalid.",
      400,
    );
  }
  return {
    semanticKey: "petra.worker-output-manifest",
    recordId,
    revision,
    contentHash: values.result_content_hash!,
    recordHash: values.result_record_hash!,
    parentRevision,
    parentRecordHash: values.parent_record_hash!,
  };
};

const selectedWorkerOutput = (
  view: PetraProjectWorkReadView,
  operations: PetraProjectWorkOperationsView,
  selection: WorkerOutputRouteSelection | undefined,
  manifest: PetraWorkerOutputManifest | undefined,
): ProjectWorkerOutputSelection | undefined => {
  if (selection === undefined) {
    if (manifest !== undefined) {
      throw new ProjectDataError(
        "Petra returned an unselected WorkerOutputManifest.",
        502,
      );
    }
    return undefined;
  }
  if (view.content.view_kind !== "detail") {
    throw new ProjectDataError(
      "An exact worker result requires Project Work detail.",
      502,
    );
  }
  const { summary, resources, outputs, specification, coverage } = view.content;
  const parent = summary.work_unit_ref;
  const result = operations.results.find(
    (candidate) =>
      candidate.result_kind === "worker_output_manifest" &&
      candidate.record_ref.semantic_key === selection.semanticKey &&
      candidate.record_ref.record_id === selection.recordId &&
      candidate.record_ref.revision === selection.revision &&
      candidate.record_ref.content_hash === selection.contentHash &&
      candidate.record_ref.record_hash === selection.recordHash,
  );
  const usage = resources.usage;
  const reportedOutputs = outputs.filter(
    (output) => output.report_state === "reported",
  );
  if (
    parent.revision !== selection.parentRevision ||
    parent.record_hash !== selection.parentRecordHash ||
    operations.work_unit_ref.work_unit_id !== parent.work_unit_id ||
    operations.work_unit_ref.revision !== parent.revision ||
    result === undefined ||
    result.destination.state !== "available" ||
    result.destination.place_role !== "work" ||
    result.destination.target_ref.semantic_key !== selection.semanticKey ||
    result.destination.target_ref.object_id !== selection.recordId ||
    result.destination.target_ref.revision !== selection.revision ||
    (usage.state !== "measured" && manifest?.schema_version !== "1.1.0") ||
    (usage.state === "measured" &&
      (usage.output_manifest_ref.record_id !== selection.recordId ||
        usage.output_manifest_ref.revision !== selection.revision ||
        usage.output_manifest_ref.content_hash !== selection.contentHash ||
        usage.output_manifest_ref.record_hash !== selection.recordHash)) ||
    manifest === undefined ||
    manifest.project_id !== view.project_id ||
    manifest.worker_output_manifest_id !== selection.recordId ||
    manifest.revision !== selection.revision ||
    manifest.content_hash !== selection.contentHash ||
    manifest.work_unit_id !== parent.work_unit_id ||
    manifest.attempt !== summary.execution.attempt ||
    manifest.content.outcome.outcome_kind !==
      summary.execution.terminal_outcome ||
    canonicalize(manifest.content.worker) !==
      canonicalize(specification.worker) ||
    (usage.state === "measured" &&
      canonicalize(manifest.content.resource_usage) !==
        canonicalize(usage.resource_usage)) ||
    manifest.content.outcome.produced_outputs.length !==
      reportedOutputs.length ||
    manifest.content.outcome.produced_outputs.some((output) => {
      const projected = reportedOutputs.find(
        (candidate) =>
          candidate.produced_output.output_name === output.output_name &&
          candidate.produced_output.output_role === output.output_role,
      );
      return (
        projected === undefined ||
        canonicalize(projected.produced_output) !== canonicalize(output)
      );
    })
  ) {
    throw new ProjectDataError(
      "The selected worker result no longer matches its exact producing Work and current manifest read.",
      409,
    );
  }
  const measured = manifest.content.resource_usage;
  const limitations = [
    ...("measurement_scope" in measured ? [measured.measurement_scope] : []),
    ...outputs.map((output) => output.availability.limitation),
    ...coverage.flatMap((item) =>
      item.state === "complete" || item.limitation === undefined
        ? []
        : [item.limitation],
    ),
  ];
  return {
    resultRef: {
      semanticKey: selection.semanticKey,
      recordId: selection.recordId,
      revision: selection.revision,
      contentHash: selection.contentHash,
      recordHash: selection.recordHash,
    },
    producingWorkRef: {
      workUnitId: parent.work_unit_id,
      revision: parent.revision,
      recordHash: parent.record_hash,
    },
    worker: {
      name: manifest.content.worker.worker_name,
      version: manifest.content.worker.worker_version,
      runtime: `${manifest.content.worker.runtime_name} ${manifest.content.worker.runtime_version}`,
      entrypoint: manifest.content.worker.entrypoint,
    },
    outcome: manifest.content.outcome.outcome_kind,
    attempt: manifest.attempt,
    reportedAt: manifest.reported_at,
    outputs: manifest.content.outcome.produced_outputs.map((output) => {
      const projected = reportedOutputs.find(
        (candidate) =>
          candidate.produced_output.output_name === output.output_name &&
          candidate.produced_output.output_role === output.output_role,
      );
      if (projected === undefined) {
        throw new ProjectDataError(
          "The exact WorkerOutputManifest output is absent from its producing Work read.",
          502,
        );
      }
      return {
        name: output.output_name,
        role: output.output_role,
        state: "reported",
        handle: output.output_handle,
        contentHash: output.content_hash,
        byteSize: output.byte_size,
        mediaType: output.media_type,
        limitation: projected.availability.limitation,
      };
    }),
    diagnostics: manifest.content.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message,
    })),
    resourceUsage: {
      wallTimeMs: measured.wall_time_ms,
      ...(measured.cpu_time_ms === null
        ? {}
        : { cpuTimeMs: measured.cpu_time_ms }),
      ...(measured.peak_memory_bytes === null
        ? {}
        : { peakMemoryBytes: measured.peak_memory_bytes }),
      inputBytes: measured.input_bytes,
      outputBytes: measured.output_bytes,
      ...(measured.network_bytes === null
        ? {}
        : { networkBytes: measured.network_bytes }),
      ...(measured.gpu_time_ms === undefined
        ? {}
        : { gpuTimeMs: measured.gpu_time_ms }),
      ...(measured.input_tokens === undefined
        ? {}
        : { inputTokens: measured.input_tokens }),
      ...(measured.output_tokens === undefined
        ? {}
        : { outputTokens: measured.output_tokens }),
      ...(measured.cost === undefined
        ? {}
        : { cost: structuredClone(measured.cost) }),
    },
    limitations: [...new Set(limitations)],
  };
};

export const loadProjectWorkDetail = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ProjectWorkDetailData> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const workUnitId = requiredRouteIdentity(params.workId, "A WorkUnit ID");
  const search = new URL(request.url).searchParams;
  const selection = workerOutputRouteSelection(search);
  const expectedDestination = expectedProjectWorkDestinationFromSearch(search);
  const [value, inquiryRead, operations] = await Promise.all([
    requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/work/${encodeURIComponent(workUnitId)}`,
    ),
    readOptionalWorkInquiry(
      `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries?limit=100&work_unit_id=${encodeURIComponent(workUnitId)}`,
    ),
    readProjectWorkOperations(projectId, workUnitId),
  ]);
  const view = projectWorkView(value);
  if (
    view.project_id !== projectId ||
    view.content.view_kind !== "detail" ||
    view.content.summary.work_unit_ref.work_unit_id !== workUnitId ||
    operations.project_id !== projectId ||
    operations.work_unit_ref.work_unit_id !== workUnitId ||
    (expectedDestination !== undefined &&
      (view.content.summary.work_unit_ref.revision !==
        expectedDestination.revision ||
        view.content.summary.work_unit_ref.spec_hash !==
          expectedDestination.specHash ||
        view.content.summary.work_unit_ref.record_hash !==
          expectedDestination.recordHash))
  ) {
    throw new ProjectDataError(
      expectedDestination === undefined
        ? "Petra returned a different Project Work identity."
        : "This exact Work destination is stale. Return to the originating task and open its current owner again.",
      expectedDestination === undefined ? 502 : 409,
    );
  }
  let work: WorkProjectView;
  if ("limitation" in inquiryRead) {
    work = {
      ...workProjectFromView(view),
      inquiryLimitation: inquiryRead.limitation,
    };
  } else {
    const inquiryView = inquiryRead.view;
    if (
      inquiryView.project_id !== projectId ||
      inquiryView.content.view_kind !== "collection" ||
      inquiryView.content.query.work_unit_id !== workUnitId
    ) {
      throw new ProjectDataError(
        "Petra returned a different Project inquiry-link identity.",
        502,
      );
    }
    work = workProjectFromView(view, [inquiryView]);
  }
  const unit = work.units[0];
  if (unit === undefined) {
    throw new ProjectDataError("Petra returned no exact Work task.", 502);
  }
  const manifest =
    selection === undefined
      ? undefined
      : await projectWorkClient().readWorkerOutputManifest(
          projectId,
          selection.recordId,
          {
            producing_work_unit_id: workUnitId,
            revision: selection.revision,
            content_hash: selection.contentHash,
            record_hash: selection.recordHash,
          },
        );
  const selectedResult = selectedWorkerOutput(
    view,
    operations,
    selection,
    manifest,
  );
  return {
    work,
    unit,
    operations,
    ...(selectedResult === undefined ? {} : { selectedResult }),
  };
};

export const petraThreadFromView = (
  view: PetraProjectThreadView,
): PetraThread => {
  if (view.content.view_kind !== "detail") {
    throw new ProjectDataError(
      "A Petra thread requires an exact Project thread detail view.",
      502,
    );
  }
  const { summary, turns } = view.content;
  if (summary.turn_count !== turns.length) {
    throw new ProjectDataError(
      "Petra returned a thread whose turn count does not match its detail.",
      502,
    );
  }
  const latest = turns.at(-1);
  const context = latest?.turn.context;
  const omitted = [
    ...(context === undefined
      ? ["No material turn has compiled Project context."]
      : [
          context.omission_count === null
            ? "The omission count is unavailable. The original native context preserves its stated limits."
            : `${context.omission_count} omission${context.omission_count === 1 ? "" : "s"} recorded by the exact retained context.`,
        ]),
    ...(latest === undefined
      ? []
      : [
          latest.input_representation.reason,
          latest.turn.authority_context.review_policy.reason,
          latest.turn.presentation_context.reason,
        ]),
  ];
  const messages = turns.flatMap((entry) => {
    const turn = entry.turn;
    const force = turn.response.force;
    return [
      {
        id: `${turn.project_turn_id}:input`,
        speaker: "Project author",
        origin:
          entry.input_representation.state === "hash_only"
            ? "Author instruction retained by exact hash"
            : "Author instruction retained as exact Artifact metadata",
        force: "author_instruction" as const,
        forceLabel: "Recorded direction · no new state changed",
        content: entry.input_representation.reason,
        references: [],
      },
      {
        id: `${turn.project_turn_id}:response`,
        speaker: "Petra",
        origin: `Recorded ${turn.response.result_record_ref.schema_name} response`,
        force,
        forceLabel:
          force === "explanation_only"
            ? "Explanation only · no state changed"
            : force === "work_update"
              ? "Work update · no domain authority changed"
              : "Proposal · Review still required",
        content: entry.response_representation.reason,
        references: [
          {
            label: "Open linked Work",
            kind: "Work task",
            destination: `/projects/${view.project_id}/work/${entry.work_destination.work_unit_ref.work_unit_id}`,
          },
        ],
      },
    ];
  });
  return {
    id: summary.thread_ref.project_thread_id,
    projectId: view.project_id,
    title: summary.title,
    task: summary.task,
    snapshot:
      context === undefined
        ? "No material-turn snapshot"
        : "snapshot_ref" in context
          ? `Authority event ${context.snapshot_ref.event_position} · snapshot revision ${context.snapshot_ref.snapshot_revision}`
          : `Authority event ${context.basis.event_position} · Project revision ${context.basis.project_revision}`,
    context:
      context === undefined
        ? []
        : [
            `Exact context: ${context.context_record_ref.record_id} revision ${context.context_record_ref.revision}`,
            `${context.included_object_count} included Project record${context.included_object_count === 1 ? "" : "s"}`,
            `Coverage (${context.coverage_state.replaceAll("_", " ")}): ${context.coverage_statement}`,
            `Project definition: ${summary.project_definition_ref.definition_family} revision ${summary.project_definition_ref.revision}`,
          ],
    omissions: [...new Set(omitted)],
    ...(latest === undefined
      ? {}
      : {
          activeWorkId: latest.work_destination.work_unit_ref.work_unit_id,
          activeWorkTitle: "Linked Work",
          activeWorkSummary:
            "This turn retains its exact WorkUnit revision and outcome. Opening it shows operational evidence; it does not apply or promote the response.",
          activeWorkLinkLabel: "Open linked Work",
        }),
    messages,
  };
};

export const loadProjectPetraThread = async ({
  params,
}: LoaderFunctionArgs): Promise<PetraThread | undefined> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const requestedThreadId = params.threadId;
  if (
    requestedThreadId !== undefined &&
    !/^project_thread_[0-9A-HJKMNP-TV-Z]{26}$/u.test(requestedThreadId)
  ) {
    throw new ProjectDataError(
      "The Project thread return identity is invalid.",
      400,
    );
  }
  if (requestedThreadId !== undefined) {
    const detailValue = await requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/threads/${encodeURIComponent(requestedThreadId)}`,
    );
    const detail = projectThreadView(detailValue);
    if (
      detail.project_id !== projectId ||
      detail.content.view_kind !== "detail" ||
      detail.content.summary.thread_ref.project_thread_id !== requestedThreadId
    ) {
      throw new ProjectDataError(
        "Petra returned a different Project thread identity.",
        502,
      );
    }
    return petraThreadFromView(detail);
  }
  return getLatestProjectPetraThread(projectId);
};

/**
 * Reads the latest open Project thread for the persistent Agent rail. The
 * returned thread is still composed from the authoritative Project-thread
 * query; the browser does not rebuild conversation or operation identity.
 */
export const getLatestProjectPetraThread = async (
  projectId: string,
): Promise<PetraThread | undefined> => {
  const exactProjectId = requiredRouteIdentity(projectId, "A Project ID");
  const collectionValue = await requestJson(
    `/api/queries/projects/${encodeURIComponent(exactProjectId)}/threads?limit=1&lifecycle=open`,
  );
  const collection = projectThreadView(collectionValue);
  if (
    collection.project_id !== exactProjectId ||
    collection.content.view_kind !== "collection"
  ) {
    throw new ProjectDataError(
      "Petra returned a thread collection for a different Project or view kind.",
      502,
    );
  }
  const selected = collection.content.threads[0];
  if (selected === undefined) return undefined;
  const threadId = selected.thread_ref.project_thread_id;
  const detailValue = await requestJson(
    `/api/queries/projects/${encodeURIComponent(exactProjectId)}/threads/${encodeURIComponent(threadId)}`,
  );
  const detail = projectThreadView(detailValue);
  if (
    detail.project_id !== exactProjectId ||
    detail.content.view_kind !== "detail" ||
    detail.content.summary.thread_ref.project_thread_id !== threadId ||
    detail.content.summary.thread_ref.revision !==
      selected.thread_ref.revision ||
    detail.content.summary.thread_ref.content_hash !==
      selected.thread_ref.content_hash ||
    detail.content.summary.thread_ref.record_hash !==
      selected.thread_ref.record_hash
  ) {
    throw new ProjectDataError(
      "Petra returned a different Project thread identity or revision.",
      502,
    );
  }
  return petraThreadFromView(detail);
};

export interface ProjectPetraData {
  readonly thread?: PetraThread;
  readonly suggestedWorkAction?: PetraSuggestedActionViewV11;
  readonly suggestedActionInvocation?: PetraSuggestedActionInvocationView;
  readonly communicationPlan?: PetraCommunicationPlan;
  readonly modelReadiness: PetraProjectModelReadinessView;
  readonly returnContext: ProjectPetraReturnContext;
}

export interface ProjectPetraReturnContext {
  readonly path: string;
  readonly label: string;
}

export interface ProjectModelRunIdentity {
  readonly threadId: string;
  readonly runId: string;
  readonly connectionId: string;
}

export const createProjectModelRunIdentity = (): ProjectModelRunIdentity => ({
  threadId: `thread_${randomUlidPayload()}`,
  runId: `run_${randomUlidPayload()}`,
  connectionId: `interaction_connection_${randomUlidPayload()}`,
});

const projectModelClient = (): ProjectModelClient =>
  new ProjectModelClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    fetch: (input, init) => fetch(input, init),
  });

export const getProjectModelReadiness = async (
  projectId: string,
): Promise<PetraProjectModelReadinessView> =>
  projectModelClient().readReadiness(projectId);

export const runProjectModelInteraction = async (
  readiness: PetraProjectModelReadinessView,
  identity: ProjectModelRunIdentity,
  prompt: string,
): Promise<PetraInteractionResult> =>
  projectModelClient().run({
    readiness,
    threadId: identity.threadId,
    runId: identity.runId,
    connectionId: identity.connectionId,
    prompt,
  });

export const replayProjectModelInteraction = async (
  readiness: PetraProjectModelReadinessView,
  identity: ProjectModelRunIdentity,
): Promise<PetraInteractionResult> => {
  const endpoint =
    readiness.readiness.state === "ready"
      ? readiness.readiness.command.endpoint
      : "/api/interactions/run";
  return new PetraInteractionClient({
    endpoint: new URL(endpoint, apiBaseUrl()).toString(),
    token: apiToken(),
  }).replay({
    threadId: identity.threadId,
    runId: identity.runId,
    connectionId: identity.connectionId,
    afterSequence: 0,
  });
};

const projectPetraReturnContext = (
  projectId: string,
  search: URLSearchParams,
): ProjectPetraReturnContext => {
  const fallback = {
    path: `/projects/${encodeURIComponent(projectId)}/brief`,
    label: "Brief",
  };
  const paths = search.getAll("return_to");
  const labels = search.getAll("return_label");
  const focusIds = search.getAll("return_focus");
  if (paths.length === 0 && labels.length === 0 && focusIds.length === 0) {
    return fallback;
  }
  if (paths.length !== 1 || labels.length !== 1 || focusIds.length > 1) {
    throw new ProjectDataError(
      "A Petra return must name one exact same-Project path and label.",
      400,
    );
  }
  const suppliedPath = paths[0]!;
  const label = labels[0]!.trim();
  const focusId = focusIds[0]?.trim();
  const parsed = new URL(suppliedPath, "http://petra.local");
  const projectRoot = `/projects/${encodeURIComponent(projectId)}/`;
  if (
    parsed.origin !== "http://petra.local" ||
    !parsed.pathname.startsWith(projectRoot) ||
    label.length === 0 ||
    label.length > 100 ||
    (focusId !== undefined &&
      (focusId.length === 0 ||
        focusId.length > 100 ||
        !/^[A-Za-z][A-Za-z0-9_.:-]*$/u.test(focusId)))
  ) {
    throw new ProjectDataError(
      "The Petra return target is invalid or crosses the current Project boundary.",
      400,
    );
  }
  const path = `${parsed.pathname}${parsed.search}${
    focusId === undefined ? parsed.hash : `#${encodeURIComponent(focusId)}`
  }`;
  return { path, label };
};

type CommunicationReadRequest = Parameters<CommunicationPlanClient["read"]>[1];

export const getProjectCommunicationPlan = async (
  projectId: string,
  request: CommunicationReadRequest,
): Promise<PetraCommunicationPlan> => {
  const { CommunicationPlanClient } = await import("@petra/adapters");
  return new CommunicationPlanClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  }).read(projectId, request);
};

const communicationRequestFromSearch = (
  search: URLSearchParams,
): CommunicationReadRequest | undefined => {
  const names = [
    "communication_response_id",
    "communication_response_revision",
    "communication_response_content_hash",
    "communication_response_record_hash",
    "communication_locale",
    "communication_command_id",
    "communication_definition_hash",
  ] as const;
  const values = Object.fromEntries(
    names.map((name) => {
      const matches = search.getAll(name);
      if (matches.length > 1) {
        throw new ProjectDataError(
          "A communication read must bind each exact response control once.",
          400,
        );
      }
      return [name, matches[0]];
    }),
  ) as Record<(typeof names)[number], string | undefined>;
  if (names.every((name) => values[name] === undefined)) return undefined;
  const required = names.slice(0, 5);
  if (required.some((name) => values[name] === undefined)) {
    throw new ProjectDataError(
      "A communication read requires the exact response identity, revision, hashes, and locale.",
      400,
    );
  }
  const responseId = values.communication_response_id!;
  const revision = Number(values.communication_response_revision);
  const responseContentHash = values.communication_response_content_hash!;
  const responseRecordHash = values.communication_response_record_hash!;
  const locale = values.communication_locale!;
  const commandId = values.communication_command_id;
  const definitionHash = values.communication_definition_hash;
  if (
    !GROUNDED_RESPONSE_ID.test(responseId) ||
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !CONTENT_HASH.test(responseContentHash) ||
    !CONTENT_HASH.test(responseRecordHash) ||
    locale !== "en" ||
    (commandId !== undefined && !COMMAND_ID.test(commandId)) ||
    (definitionHash !== undefined && !CONTENT_HASH.test(definitionHash))
  ) {
    throw new ProjectDataError(
      "The communication response binding is invalid or unsupported.",
      400,
    );
  }
  return {
    response_id: responseId,
    response_revision: revision,
    response_content_hash: responseContentHash,
    response_record_hash: responseRecordHash,
    locale,
    ...(commandId === undefined ? {} : { command_id: commandId }),
    ...(definitionHash === undefined
      ? {}
      : { expected_definition_hash: definitionHash }),
  };
};

export const loadProjectPetra = async (
  args: LoaderFunctionArgs,
): Promise<ProjectPetraData> => {
  const projectId = requiredRouteIdentity(
    args.params.projectId,
    "A Project ID",
  );
  const incoming = new URL(args.request.url).searchParams;
  const returnContext = projectPetraReturnContext(projectId, incoming);
  const communicationRequest = communicationRequestFromSearch(incoming);
  const linkIds = incoming.getAll("inquiry_result_link_id");
  const commandIds = incoming.getAll("suggested_action_command_id");
  if (linkIds.length > 1 || commandIds.length > 1) {
    throw new ProjectDataError(
      "The conversational SuggestedAction context must name one exact link and command.",
      400,
    );
  }
  const linkId = linkIds[0];
  const commandId = commandIds[0];
  if (
    communicationRequest !== undefined &&
    (linkId !== undefined || commandId !== undefined)
  ) {
    throw new ProjectDataError(
      "An exact communication read cannot be combined with ambient SuggestedAction context.",
      400,
    );
  }
  if (commandId !== undefined && linkId === undefined) {
    throw new ProjectDataError(
      "A SuggestedAction invocation requires its exact inquiry-result link.",
      400,
    );
  }
  if (
    (linkId !== undefined && !API_REQUEST_ID.test(linkId)) ||
    (commandId !== undefined && !API_REQUEST_ID.test(commandId))
  ) {
    throw new ProjectDataError(
      "The conversational SuggestedAction context contains an invalid identity.",
      400,
    );
  }
  const [
    thread,
    suggestedWorkAction,
    suggestedActionInvocation,
    communicationPlan,
    modelReadiness,
  ] = await Promise.all([
    communicationRequest === undefined
      ? loadProjectPetraThread(args)
      : undefined,
    linkId === undefined
      ? undefined
      : getProjectSuggestedWorkAction(projectId, linkId),
    commandId === undefined
      ? undefined
      : getProjectSuggestedActionInvocation(projectId, commandId),
    communicationRequest === undefined
      ? undefined
      : getProjectCommunicationPlan(projectId, communicationRequest),
    getProjectModelReadiness(projectId),
  ]);
  if (
    suggestedWorkAction !== undefined &&
    suggestedActionInvocation !== undefined &&
    suggestedActionInvocation.content.invocation.content.action_ref
      .suggested_action_id !==
      suggestedWorkAction.content.action_ref.suggested_action_id
  ) {
    throw new ProjectDataError(
      "Petra returned conversational action and invocation context for different exact identities.",
      502,
    );
  }
  return {
    ...(thread === undefined ? {} : { thread }),
    ...(suggestedWorkAction === undefined ? {} : { suggestedWorkAction }),
    ...(suggestedActionInvocation === undefined
      ? {}
      : { suggestedActionInvocation }),
    ...(communicationPlan === undefined ? {} : { communicationPlan }),
    modelReadiness,
    returnContext,
  };
};

export const loadProjectRelationshipView = async ({
  params,
}: LoaderFunctionArgs): Promise<GraphQuestion | undefined> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  let value: unknown;
  try {
    value = await requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/relationship-view`,
    );
  } catch (error) {
    if (error instanceof ProjectDataError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
  const view = relationshipView(value);
  if (view.project_id !== projectId) {
    throw new ProjectDataError(
      "Petra returned a relationship view from another Project.",
      502,
    );
  }
  return graphQuestionFromView(view);
};

export const loadProjectRelationshipOverlay = async (
  projectId: string,
): Promise<PetraProjectRelationshipOverlayView | undefined> => {
  const exactProjectId = requiredRouteIdentity(projectId, "A Project ID");
  let value: unknown;
  try {
    value = await requestJson(
      `/api/queries/projects/${encodeURIComponent(exactProjectId)}/relationship-overlay`,
    );
  } catch (error) {
    if (error instanceof ProjectDataError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
  const view = relationshipOverlayView(value);
  if (
    view.project_id !== exactProjectId ||
    view.content.profile.project_definition_ref.project_definition_id !==
      view.content.positions.working.project_definition_ref
        .project_definition_id ||
    view.content.profile.project_definition_ref.revision !==
      view.content.positions.working.project_definition_ref.revision ||
    view.content.profile.project_definition_ref.content_hash !==
      view.content.positions.working.project_definition_ref.content_hash ||
    view.content.profile.project_definition_ref.record_hash !==
      view.content.positions.working.project_definition_ref.record_hash ||
    view.content.positions.authoritative.authority.event_position !==
      view.content.positions.working.base_authority.event_position ||
    view.content.positions.authoritative.authority.stream_revision !==
      view.content.positions.working.base_authority.stream_revision
  ) {
    throw new ProjectDataError(
      "Petra returned a relationship overlay with mismatched Project, definition, or authority positions.",
      502,
    );
  }
  return view;
};

export const loadProjectRelationshipOverlayGraph = async ({
  params,
  ...args
}: LoaderFunctionArgs): Promise<GraphQuestion | undefined> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const view = await loadProjectRelationshipOverlay(projectId);
  return view === undefined
    ? loadProjectRelationshipView({ params, ...args })
    : graphQuestionFromOverlayView(view);
};

const canonicalHash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

export const focusedGraphRequestFromEntry = async (
  entry: FocusedGraphEntry,
  definition: PetraProjectDefinition,
  override?: {
    readonly requestId?: string;
    readonly semanticLayer?: FocusedGraphEntry["semantic_layer"];
  },
): Promise<Parameters<FocusedGraphClient["read"]>[1]> => {
  const definitionContentHash = await canonicalHash(definition.content);
  const definitionRecordHash = await canonicalHash(definition);
  const expected = entry.project_definition_ref;
  if (
    definition.project_id !== entry.project_id ||
    definition.project_definition_id !== expected.project_definition_id ||
    definition.revision !== expected.revision ||
    definition.definition_family !== expected.definition_family ||
    definition.content_hash !== expected.content_hash ||
    definition.content_hash !== definitionContentHash ||
    (expected.record_hash !== undefined &&
      expected.record_hash !== definitionRecordHash)
  ) {
    throw new ProjectDataError(
      "The focused graph entry no longer matches the exact current ProjectDefinition. Return to the originating task and open a current question deliberately.",
      409,
    );
  }
  const semanticLayer = override?.semanticLayer ?? entry.semantic_layer;
  if (
    semanticLayer === "historical" &&
    entry.historical_position === undefined
  ) {
    throw new ProjectDataError(
      "Historical Graph requires one exact retained snapshot and recorded-time position.",
      400,
    );
  }
  const expectedSnapshot =
    semanticLayer === "historical"
      ? entry.historical_position!.snapshot
      : entry.expected_snapshot;
  return {
    request_id: override?.requestId ?? entry.request_id,
    task_kind: "neighborhood",
    task_semantic_key: entry.task_semantic_key,
    question: entry.question,
    focus_ref: structuredClone(entry.focus_ref),
    origin: structuredClone(entry.origin),
    project_definition_ref: {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      record_hash: definitionRecordHash,
      definition_family: definition.definition_family,
    },
    semantic_layer: semanticLayer,
    temporal_position:
      semanticLayer === "historical"
        ? structuredClone(entry.historical_position!.temporal_position)
        : {
            position_kind: "current",
            dimension: "project_snapshot",
          },
    object_semantic_key: entry.object_semantic_key,
    relationship_semantic_key: entry.relationship_semantic_key,
    return_action_semantic_key: entry.return_action_semantic_key,
    return_destination: structuredClone(entry.return_destination),
    limits: structuredClone(entry.limits),
    ...(expectedSnapshot === undefined
      ? {}
      : { expected_snapshot: structuredClone(expectedSnapshot) }),
  };
};

const focusedGraphPositionLabel = (
  layer: FocusedGraphEntry["semantic_layer"],
): string =>
  layer === "current"
    ? "Current"
    : layer === "working"
      ? "Working changes"
      : "Historical";

export const focusedGraphAnalysisRequestFromEntry = async (
  entry: FocusedGraphEntry,
  definition: PetraProjectDefinition,
  exactSnapshot: FocusedGraphProjectSnapshotRef,
  requestIds: {
    readonly primary: string;
    readonly secondary?: string;
  },
): Promise<FocusedGraphAnalysisViewRequest> => {
  const analysis = entry.analysis;
  if (analysis === undefined || entry.presentation === "position") {
    throw new ProjectDataError(
      "A focused graph analysis entry requires one exact task-specific analysis identity.",
      400,
    );
  }
  const exactPosition = async (
    layer: FocusedGraphEntry["semantic_layer"],
    requestId: string,
  ): Promise<{
    readonly position_key: string;
    readonly label: string;
    readonly graph_request: FocusedGraphReadRequest;
  }> => {
    const graphRequest = await focusedGraphRequestFromEntry(entry, definition, {
      requestId,
      semanticLayer: layer,
    });
    return {
      position_key: `position:${layer}`,
      label: focusedGraphPositionLabel(layer),
      graph_request: {
        ...graphRequest,
        expected_snapshot: structuredClone(exactSnapshot),
      },
    };
  };
  if (analysis.analysis_kind === "comparison") {
    if (requestIds.secondary === undefined) {
      throw new ProjectDataError(
        "Focused graph comparison requires two exact position request identities.",
        400,
      );
    }
    return {
      analysis_request_id: analysis.analysis_request_id,
      task_kind: "comparison",
      question: entry.question,
      before: await exactPosition("current", requestIds.primary),
      after: await exactPosition("working", requestIds.secondary),
    };
  }
  const position = await exactPosition(
    entry.semantic_layer,
    requestIds.primary,
  );
  if (analysis.analysis_kind === "impact") {
    return {
      analysis_request_id: analysis.analysis_request_id,
      task_kind: "impact",
      question: entry.question,
      position,
      history_event_id: analysis.history_event_id,
      ...(analysis.review_binding === undefined
        ? {}
        : { review_binding: structuredClone(analysis.review_binding) }),
    };
  }
  return {
    analysis_request_id: analysis.analysis_request_id,
    task_kind: "time",
    question: entry.question,
    position,
    temporal_dimension: analysis.temporal_dimension,
  };
};

export const loadProjectGraph = async (
  args: LoaderFunctionArgs,
): Promise<
  | GraphQuestion
  | FocusedGraphRouteData
  | PetraProjectSemanticGraphView
  | undefined
> => {
  const projectId = requiredRouteIdentity(
    args.params.projectId,
    "A Project ID",
  );
  const entry = focusedGraphEntryFromSearch(
    projectId,
    new URL(args.request.url).searchParams,
  );
  if (entry === undefined) {
    if (
      new URL(args.request.url).searchParams.get("query") === "authority-path"
    )
      return loadProjectRelationshipOverlayGraph(args);
    return new ProjectSemanticGraphClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
    }).read(projectId, args.request.signal);
  }

  const brief = await readProjectBrief({
    projectId,
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    signal: args.request.signal,
  });
  const definition = brief.content.definition;
  const client = new FocusedGraphClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
    projectDefinition: definition,
  });
  try {
    if (entry.analysis !== undefined) {
      const primingRequest = await focusedGraphRequestFromEntry(
        entry,
        definition,
      );
      const primed = await client.read(projectId, primingRequest);
      const primaryRequestId = createFocusedGraphRequestId();
      const analysisRequest = await focusedGraphAnalysisRequestFromEntry(
        entry,
        definition,
        primed.content.requested_snapshot,
        {
          primary: primaryRequestId,
          ...(entry.analysis.analysis_kind === "comparison"
            ? { secondary: createFocusedGraphRequestId() }
            : {}),
        },
      );
      const analysis = await client.readAnalysis(projectId, analysisRequest);
      const preferredRole =
        entry.analysis.analysis_kind === "comparison"
          ? entry.semantic_layer === "working"
            ? "after"
            : "before"
          : entry.analysis.analysis_kind === "time"
            ? "time_position"
            : "context";
      const position =
        analysis.content.positions.find(
          (candidate) => candidate.role === preferredRole,
        ) ?? analysis.content.positions[0];
      if (position === undefined) {
        throw new ProjectDataError(
          "The focused graph analysis omitted its exact selected position.",
          502,
        );
      }
      const request =
        analysisRequest.task_kind === "comparison"
          ? entry.semantic_layer === "working"
            ? analysisRequest.after.graph_request
            : analysisRequest.before.graph_request
          : analysisRequest.position.graph_request;
      return {
        kind: "focused_graph",
        entry,
        definition,
        request,
        view: position.graph_view,
        analysis,
      };
    }
    const request = await focusedGraphRequestFromEntry(entry, definition);
    const view = await client.read(projectId, request);
    return { kind: "focused_graph", entry, definition, request, view };
  } catch (error) {
    if (error instanceof FocusedGraphClientError) {
      throw new ProjectDataError(
        "The exact focused graph result is unavailable or no longer matches this entry. Return to the originating task and retry from its current object.",
        error.status,
      );
    }
    throw error;
  }
};

const exactSelection = (
  target: NonNullable<
    PetraProjectObjectLocationView["content"]["primary_destination"]["target_ref"]
  >,
): URLSearchParams =>
  new URLSearchParams({
    selected: target.object_id,
    semanticKey: target.semantic_key,
    revision: String(target.revision),
    recordHash: target.record_hash,
  });

type SemanticResultBinding = {
  readonly contentHash?: string;
  readonly recordHash?: string;
};

const resolvedLocation = (
  view: PetraProjectObjectLocationView,
):
  | Extract<
      PetraProjectObjectLocationView["content"]["resolution"],
      { state: "current" | "historical" | "superseded" }
    >
  | undefined => {
  const resolution = view.content.resolution;
  return resolution.state === "current" ||
    resolution.state === "historical" ||
    resolution.state === "superseded"
    ? resolution
    : undefined;
};

const exactResultParent = (view: PetraProjectObjectLocationView) => {
  const parent = resolvedLocation(view)?.parent_ref;
  if (
    parent === undefined ||
    parent.semantic_key !== "petra.work-unit" ||
    !WORK_UNIT_ID.test(parent.object_id) ||
    !Number.isSafeInteger(parent.revision) ||
    parent.revision < 1 ||
    !CONTENT_HASH.test(parent.record_hash)
  ) {
    throw new ProjectDataError(
      "Petra returned a Work result without its exact producing-Work parent.",
      502,
    );
  }
  return parent;
};

export const semanticDestinationPath = (
  view: PetraProjectObjectLocationView,
  binding: SemanticResultBinding = {},
): string => {
  const projectRoot = `/projects/${encodeURIComponent(view.project_id)}`;
  const destination = view.content.primary_destination;
  const target = destination.target_ref;
  if (destination.role === "brief") return `${projectRoot}/brief`;
  if (destination.role === "settings") return "/settings";
  if (destination.role === "profile_tool") {
    if (destination.profile_tool_key === undefined) {
      throw new ProjectDataError(
        "Petra returned a profile-tool destination without a registered key.",
        502,
      );
    }
    return `${projectRoot}/tools/${encodeURIComponent(destination.profile_tool_key)}`;
  }
  if (target === undefined) {
    if (destination.role === "petra") return `${projectRoot}/petra`;
    throw new ProjectDataError(
      `Petra returned ${destination.role} without an exact target.`,
      502,
    );
  }
  const resolution = resolvedLocation(view);
  if (
    resolution !== undefined &&
    (resolution.resolved_ref.semantic_key !== target.semantic_key ||
      resolution.resolved_ref.object_id !== target.object_id ||
      resolution.resolved_ref.revision !== target.revision ||
      resolution.resolved_ref.record_hash !== target.record_hash)
  ) {
    throw new ProjectDataError(
      "Petra returned a semantic destination for a different resolved identity.",
      502,
    );
  }
  if (
    binding.recordHash !== undefined &&
    (resolution === undefined ||
      resolution.resolved_ref.record_hash !== binding.recordHash)
  ) {
    throw new ProjectDataError(
      "The selected result changed before its semantic destination was resolved.",
      409,
    );
  }
  if (
    target.semantic_key === "petra.grounded-response" &&
    destination.role === "petra"
  ) {
    if (
      resolution === undefined ||
      binding.contentHash === undefined ||
      !CONTENT_HASH.test(binding.contentHash)
    ) {
      throw new ProjectDataError(
        "Opening a grounded response requires its exact retained content identity.",
        400,
      );
    }
    const parent = exactResultParent(view);
    const returnPath = `${projectRoot}/work/${encodeURIComponent(parent.object_id)}`;
    const response = new URLSearchParams({
      communication_response_id: target.object_id,
      communication_response_revision: String(target.revision),
      communication_response_content_hash: binding.contentHash,
      communication_response_record_hash: resolution.resolved_ref.record_hash,
      communication_locale: "en",
      return_to: returnPath,
      return_label: "producing Work task",
      return_focus: "work-destinations-title",
    });
    return `${projectRoot}/petra?${response}`;
  }
  if (
    target.semantic_key === "petra.worker-output-manifest" &&
    destination.role === "work"
  ) {
    if (
      resolution === undefined ||
      binding.contentHash === undefined ||
      !CONTENT_HASH.test(binding.contentHash)
    ) {
      throw new ProjectDataError(
        "Opening a worker result requires its exact retained content identity.",
        400,
      );
    }
    const parent = exactResultParent(view);
    const result = new URLSearchParams({
      result_semantic_key: target.semantic_key,
      result_id: target.object_id,
      result_revision: String(target.revision),
      result_content_hash: binding.contentHash,
      result_record_hash: resolution.resolved_ref.record_hash,
      parent_revision: String(parent.revision),
      parent_record_hash: parent.record_hash,
    });
    return `${projectRoot}/work/${encodeURIComponent(parent.object_id)}?${result}#selected-work-result`;
  }
  if (destination.role === "petra") return `${projectRoot}/petra`;
  const selection = exactSelection(target);
  if (destination.role === "sources") {
    selection.delete("selected");
    return `${projectRoot}/sources/${encodeURIComponent(target.object_id)}?${selection}`;
  }
  if (destination.role === "work") {
    selection.delete("selected");
    return `${projectRoot}/work/${encodeURIComponent(target.object_id)}?${selection}`;
  }
  if (destination.role === "composition") {
    selection.delete("selected");
    return `${projectRoot}/composition/${encodeURIComponent(target.object_id)}?${selection}`;
  }
  return `${projectRoot}/${destination.role}?${selection}`;
};

export const loadProjectObjectLocationRedirect = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<Response> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const incoming = new URL(request.url).searchParams;
  for (const key of [
    "semanticKey",
    "objectId",
    "revision",
    "taskIntent",
    "contentHash",
    "recordHash",
  ]) {
    if (incoming.getAll(key).length > 1) {
      throw new ProjectDataError(
        "A semantic destination must bind each exact result control once.",
        400,
      );
    }
  }
  const contentHash = incoming.get("contentHash") ?? undefined;
  const recordHash = incoming.get("recordHash") ?? undefined;
  if (
    (contentHash !== undefined && !CONTENT_HASH.test(contentHash)) ||
    (recordHash !== undefined && !CONTENT_HASH.test(recordHash))
  ) {
    throw new ProjectDataError(
      "A semantic result destination contains an invalid exact hash.",
      400,
    );
  }
  const query = new URLSearchParams();
  for (const key of ["semanticKey", "objectId", "revision", "taskIntent"]) {
    const values = incoming.getAll(key);
    for (const value of values) query.append(key, value);
  }
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/object-location?${query}`,
  );
  const view = objectLocationView(value);
  const requestedSemanticKey = incoming.get("semanticKey");
  const requestedObjectId = incoming.get("objectId");
  const requestedRevision = incoming.get("revision");
  const returnedRequest = view.content.request.object_ref;
  if (
    view.project_id !== projectId ||
    returnedRequest.semantic_key !== requestedSemanticKey ||
    returnedRequest.object_id !== requestedObjectId ||
    (requestedRevision === null
      ? returnedRequest.revision !== undefined
      : returnedRequest.revision !== Number(requestedRevision))
  ) {
    throw new ProjectDataError(
      "Petra returned a semantic destination for a different identity.",
      502,
    );
  }
  return redirect(
    semanticDestinationPath(view, {
      ...(contentHash === undefined ? {} : { contentHash }),
      ...(recordHash === undefined ? {} : { recordHash }),
    }),
  );
};

/** Read the entire exact Review; member selection never narrows this assessment. */
export const getReviewRecoveryAssessment = async (review: ReviewSession) => {
  const { ReviewRecoveryAssessmentClient } = await import("@petra/adapters");
  return new ReviewRecoveryAssessmentClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  }).assess({
    project_id: review.projectId,
    review_session_id: review.id,
    expected_revision: review.exactRef.revision,
    expected_content_hash: review.exactRef.contentHash,
  });
};

/** Preparation reads authority; only the explicit Apply gesture supplies a decision. */
export const prepareReviewApply = async (review: ReviewSession) => {
  const { ReviewSessionApplyClient } = await import("@petra/adapters");
  if (review.reviewMemberId === undefined)
    throw new Error("No exact Review member supplied.");
  return new ReviewSessionApplyClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  }).prepare({
    project_id: review.projectId,
    review_session_id: review.id,
    expected_revision: review.exactRef.revision,
    expected_content_hash: review.exactRef.contentHash,
    selected_review_member_id: review.reviewMemberId,
  });
};

export const executeReviewApply = async (
  request: PetraReviewSessionApplyRequest,
) => {
  const { ReviewSessionApplyClient } = await import("@petra/adapters");
  return new ReviewSessionApplyClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  }).apply(request);
};

/** Preparation reads server-owned rejection authority without sending a decision. */
export const prepareReviewReject = async (review: ReviewSession) => {
  const { ReviewSessionRejectClient } = await import("@petra/adapters");
  if (review.reviewMemberId === undefined)
    throw new Error("No exact Review member supplied.");
  return new ReviewSessionRejectClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  }).prepare({
    project_id: review.projectId,
    review_session_id: review.id,
    expected_revision: review.exactRef.revision,
    expected_content_hash: review.exactRef.contentHash,
    selected_review_member_id: review.reviewMemberId,
  });
};

export const executeReviewReject = async (
  request: PetraReviewSessionRejectRequest,
) => {
  const { ReviewSessionRejectClient } = await import("@petra/adapters");
  return new ReviewSessionRejectClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  }).reject(request);
};
