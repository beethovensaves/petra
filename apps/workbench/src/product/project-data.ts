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
  PetraProjectHistoryEpisodeView,
  PetraProjectHistoryImpactViewV14,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedViewV12,
  PetraProjectInquiryView,
  PetraProjectObjectLocationView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectSourceView,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceReplacementRetraction,
  PetraProjectThreadView,
  PetraProjectWorkView,
  ProjectDefinitionTerm,
  ProjectSourceLifecycleExactSourceRef,
  ProjectSourceReplacementActiveSourceRef,
  ProjectSourceReplacementContent,
  ProjectSourceReplacementExcludedSourceRef,
  ProjectSourceReplacementExclusionReceiptRef,
  ProjectHistoryRetainedCollectionFiltersV12,
  ProjectWorkDetailContent,
  ProjectWorkTaskSummary,
} from "@petra/contracts";
import { redirect, type LoaderFunctionArgs } from "react-router";

import type {
  AttentionItem,
  GraphQuestion,
  InquiryBranch,
  ProjectProfile,
  ProjectRecord,
  PetraThread,
  ReviewSession,
  SourceRecord,
  WorkExecutionState,
  WorkProjectView,
  WorkUnit,
} from "./model.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";

class ProjectDataError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProjectDataError";
    this.status = status;
  }
}

const apiToken = (): string => {
  if (typeof window === "undefined") return DEVELOPMENT_TOKEN;
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

type ProjectShellView = PetraProjectShellView | PetraProjectShellViewV11;

const shellView = (value: unknown): ProjectShellView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-shell-view" ||
    (value.schema_version !== "1.0.0" && value.schema_version !== "1.1.0") ||
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
): PetraProjectHistoryEpisodeView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-history-episode-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.event_id !== "string" ||
    !isRecord(value.content) ||
    value.content.view_kind !== "causal_episode" ||
    value.content.graph_navigation_history !== "client_local_separate" ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project History episode.",
      502,
    );
  }
  return value as unknown as PetraProjectHistoryEpisodeView;
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

const sourceView = (value: unknown): PetraProjectSourceView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-source-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.project_source_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project source view.",
      502,
    );
  }
  return value as unknown as PetraProjectSourceView;
};

const reviewView = (value: unknown): PetraProjectReviewView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-review-view" ||
    value.schema_version !== "1.0.0" ||
    typeof value.project_id !== "string" ||
    typeof value.review_session_id !== "string" ||
    !isRecord(value.content) ||
    typeof value.content_hash !== "string" ||
    typeof value.read_at !== "string"
  ) {
    throw new ProjectDataError(
      "Petra returned an invalid Project Review view.",
      502,
    );
  }
  return value as unknown as PetraProjectReviewView;
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

const projectWorkView = (value: unknown): PetraProjectWorkView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-work-view" ||
    value.schema_version !== "1.0.0" ||
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
  return value as unknown as PetraProjectWorkView;
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

const projectThreadView = (value: unknown): PetraProjectThreadView => {
  if (
    !isRecord(value) ||
    value.schema_name !== "petra.project-thread-view" ||
    value.schema_version !== "1.0.0" ||
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
    try {
      const body = (await response.json()) as unknown;
      if (
        isRecord(body) &&
        isRecord(body.error) &&
        typeof body.error.message === "string"
      ) {
        message = body.error.message;
      }
    } catch {
      // The status remains the authoritative error when no JSON body exists.
    }
    throw new ProjectDataError(message, response.status);
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

const fallbackTerm = (
  family: ProjectDefinitionTerm["generic_family"],
): ProjectDefinitionTerm => {
  const labels = {
    focus: ["Focus", "Focus items"],
    finding: ["Material", "Material"],
    reference: ["Reference", "References"],
    relationship: ["Relationship", "Relationships"],
    task: ["Task", "Tasks"],
    output: ["Output", "Outputs"],
    other: ["Item", "Items"],
  } as const;
  return {
    semantic_key: `petra.generic-${family}`,
    singular: labels[family][0],
    plural: labels[family][1],
    definition: `Petra's generic ${family} term.`,
    generic_family: family,
  };
};

const termFor = (
  view: ProjectShellView,
  family: "focus" | "finding" | "reference",
): ProjectDefinitionTerm =>
  view.content.definition.terms.find(
    (term) => term.generic_family === family,
  ) ?? fallbackTerm(family);

const profileFrom = (view: ProjectShellView): ProjectProfile => {
  const focus = termFor(view, "focus");
  const finding = termFor(view, "finding");
  const reference = termFor(view, "reference");
  return {
    id: view.content.definition.project_definition_id,
    version: String(view.content.definition.revision),
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
        }),
  };
};

const titleCase = (value: string): string =>
  value
    .split("_")
    .map((part) => `${part.slice(0, 1).toLocaleUpperCase()}${part.slice(1)}`)
    .join(" ");

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
  summary: ProjectWorkTaskSummary,
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
      label: "Checkpoint recorded · resume unavailable",
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
  input: ProjectWorkDetailContent["specification"]["inputs"][number],
): string =>
  input.binding_kind === "artifact"
    ? `${input.name}: ${input.artifact_id} · ${input.content_hash.slice(0, 18)}… · ${bytesLabel(input.byte_size)}`
    : `${input.name}: ${input.record_id} r${input.record_revision} · ${input.snapshot_hash.slice(0, 18)}…`;

export const workUnitFromView = (
  view: PetraProjectWorkView,
  collectionSummary?: ProjectWorkTaskSummary,
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
    stages: [],
    ...(detail === undefined
      ? {}
      : {
          inputs: detail.specification.inputs.map(exactInputLabel),
          dependencies: detail.dependencies.map(
            (dependency) =>
              `${dependency.work_unit_ref.work_unit_id} r${dependency.work_unit_ref.revision} · ${dependency.state}${dependency.terminal_outcome === undefined ? "" : ` · ${dependency.terminal_outcome}`}`,
          ),
          stagePlanLimitation: detail.stage_plan.reason,
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
  view: PetraProjectWorkView,
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

export const reviewSessionFromView = (
  view: PetraProjectReviewView,
): ReviewSession => {
  if (view.content.members.length !== 1) {
    throw new ProjectDataError(
      "The current frozen M1 Review surface requires one exact member per session; Petra did not hide or merge additional members.",
      502,
    );
  }
  const member = view.content.members[0];
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
  return {
    id: view.review_session_id,
    projectId: view.project_id,
    title: view.content.session.title,
    objective: view.content.session.objective_summary,
    status: view.content.session.status,
    statusLabel: view.content.session.status_label,
    responsible: view.content.session.responsible.display_name,
    snapshot: `Authority event ${view.content.session.snapshot.event_position} · Project stream ${view.content.session.snapshot.stream_revision}${view.content.session.snapshot_state === "stale" ? " · stale" : ""}`,
    returnLabel: view.content.session.return_context.label,
    candidate: {
      id: member.candidate.candidate_id,
      revision: member.candidate.revision_label,
      kind: member.candidate.kind_label,
      current: member.candidate.current,
      proposed: member.candidate.proposed,
      difference: member.candidate.difference,
      origin: member.candidate.origin_label,
      originDetail: member.candidate.origin_detail,
    },
    basis: member.basis.map((basis) => ({
      id: basis.basis_id,
      label: basis.label,
      relation: basis.relation,
      extent: basis.extent,
      detail: basis.detail,
      ...(basis.project_source_id === undefined
        ? {}
        : { sourceId: basis.project_source_id }),
    })),
    validation: {
      state: member.validation.state,
      label: member.validation.label,
      detail: member.validation.detail,
      ...(member.validation.recovery === undefined
        ? {}
        : { recovery: member.validation.recovery }),
    },
    consequences: [...member.consequences],
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

export const loadProjectCollection = async (): Promise<ProjectRecord[]> => {
  const value = await requestJson("/api/queries/projects");
  if (!isRecord(value) || !Array.isArray(value.projects)) {
    throw new ProjectDataError(
      "Petra returned an invalid Project collection.",
      502,
    );
  }
  return value.projects.map((project) =>
    projectRecordFromShellView(shellView(project)),
  );
};

export const loadProjectRecord = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<ProjectRecord> => {
  if (params.projectId === undefined || params.projectId.length === 0) {
    throw new ProjectDataError("A Project ID is required.", 400);
  }
  const requestUrl = new URL(request.url);
  const incoming = requestUrl.searchParams;
  const semanticKey = incoming.get("semanticKey");
  const objectPathSegment =
    semanticKey === "petra.project-source"
      ? "sources"
      : semanticKey === "petra.work-unit"
        ? "work"
        : semanticKey === "petra.draft-artifact"
          ? "composition"
          : undefined;
  const pathParts = requestUrl.pathname.split("/").filter(Boolean);
  const objectPathIndex =
    objectPathSegment === undefined
      ? -1
      : pathParts.lastIndexOf(objectPathSegment);
  const pathObjectId =
    objectPathIndex < 0 ? undefined : pathParts[objectPathIndex + 1];
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
  const query = new URLSearchParams();
  if (hasExactSelection) {
    query.set("semanticKey", semanticKey);
    query.set("objectId", selected);
    query.set("revision", revision);
    query.set("taskIntent", "inspect");
  }
  const suffix = query.size === 0 ? "" : `?${query}`;
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(params.projectId)}/shell${suffix}`,
  );
  const view = shellView(value);
  if (hasExactSelection) {
    if (
      view.schema_version !== "1.1.0" ||
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
  return projectRecordFromShellView(view);
};

export interface ProjectSettingsData {
  selectedProject?: ProjectRecord;
  controls?: PetraProjectEffectiveControlsView;
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
  const [projectValue, controlsValue] = await Promise.all([
    requestJson(`/api/queries/projects/${encoded}/shell`),
    requestJson(`/api/queries/projects/${encoded}/effective-controls`),
  ]);
  const projectView = shellView(projectValue);
  const controls = effectiveControlsView(controlsValue);
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

export const loadProjectSourceCollection = async ({
  params,
}: LoaderFunctionArgs): Promise<SourceRecord[]> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/sources`,
  );
  if (!isRecord(value) || !Array.isArray(value.sources)) {
    throw new ProjectDataError(
      "Petra returned an invalid Project source collection.",
      502,
    );
  }
  return value.sources.map((source) => {
    const view = sourceView(source);
    if (view.project_id !== projectId) {
      throw new ProjectDataError(
        "Petra returned a source from another Project.",
        502,
      );
    }
    return sourceRecordFromView(view);
  });
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
): Promise<PetraProjectHistoryEpisodeView> => {
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

export const loadProjectSourceRecord = async ({
  params,
}: LoaderFunctionArgs): Promise<SourceRecord> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const sourceId = requiredRouteIdentity(params.sourceId, "A ProjectSource ID");
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(sourceId)}`,
  );
  const view = sourceView(value);
  if (view.project_id !== projectId || view.project_source_id !== sourceId) {
    throw new ProjectDataError(
      "Petra returned a different Project source identity.",
      502,
    );
  }
  return sourceRecordFromView(view);
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

export const loadProjectReviewSession = async ({
  params,
}: LoaderFunctionArgs): Promise<ReviewSession> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const reviewSessionId = requiredRouteIdentity(
    params.reviewId,
    "A ReviewSession ID",
  );
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
  return reviewSessionFromView(view);
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
  const [value, inquiryCollectionValue] = await Promise.all([
    requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/work?${query}`,
    ),
    requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries?limit=100`,
    ),
  ]);
  const view = projectWorkView(value);
  const inquiryCollection = projectInquiryView(inquiryCollectionValue);
  if (
    view.project_id !== projectId ||
    view.content.view_kind !== "collection" ||
    inquiryCollection.project_id !== projectId ||
    inquiryCollection.content.view_kind !== "collection"
  ) {
    throw new ProjectDataError(
      "Petra returned Work or inquiries for a different Project or view kind.",
      502,
    );
  }
  const inquiryDetails = await Promise.all(
    inquiryCollection.content.inquiries.map(async (inquiry) => {
      const objectiveId = inquiry.inquiry_anchor_ref.objective_id;
      const detail = projectInquiryView(
        await requestJson(
          `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries/${encodeURIComponent(objectiveId)}`,
        ),
      );
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
      return detail;
    }),
  );
  return workProjectFromView(view, inquiryDetails);
};

export interface ProjectWorkDetailData {
  work: WorkProjectView;
  unit: WorkUnit;
}

export const loadProjectWorkDetail = async ({
  params,
}: LoaderFunctionArgs): Promise<ProjectWorkDetailData> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const workUnitId = requiredRouteIdentity(params.workId, "A WorkUnit ID");
  const [value, inquiryValue] = await Promise.all([
    requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/work/${encodeURIComponent(workUnitId)}`,
    ),
    requestJson(
      `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries?limit=100&work_unit_id=${encodeURIComponent(workUnitId)}`,
    ),
  ]);
  const view = projectWorkView(value);
  const inquiryView = projectInquiryView(inquiryValue);
  if (
    view.project_id !== projectId ||
    view.content.view_kind !== "detail" ||
    view.content.summary.work_unit_ref.work_unit_id !== workUnitId ||
    inquiryView.project_id !== projectId ||
    inquiryView.content.view_kind !== "collection" ||
    inquiryView.content.query.work_unit_id !== workUnitId
  ) {
    throw new ProjectDataError(
      "Petra returned a different Project Work or inquiry-link identity.",
      502,
    );
  }
  const work = workProjectFromView(view, [inquiryView]);
  const unit = work.units[0];
  if (unit === undefined) {
    throw new ProjectDataError("Petra returned no exact Work task.", 502);
  }
  return { work, unit };
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
          `${context.omission_count} omission${context.omission_count === 1 ? "" : "s"} recorded by the exact context packet.`,
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
        : `Authority event ${context.snapshot_ref.event_position} · snapshot revision ${context.snapshot_ref.snapshot_revision}`,
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
            "This turn retains the exact successful WorkUnit revision. Opening it shows operational evidence; it does not apply or promote the response.",
          activeWorkLinkLabel: "Open linked Work",
        }),
    messages,
  };
};

export const loadProjectPetraThread = async ({
  params,
}: LoaderFunctionArgs): Promise<PetraThread | undefined> => {
  const projectId = requiredRouteIdentity(params.projectId, "A Project ID");
  const collectionValue = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/threads?limit=1&lifecycle=open`,
  );
  const collection = projectThreadView(collectionValue);
  if (
    collection.project_id !== projectId ||
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
    `/api/queries/projects/${encodeURIComponent(projectId)}/threads/${encodeURIComponent(threadId)}`,
  );
  const detail = projectThreadView(detailValue);
  if (
    detail.project_id !== projectId ||
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

export const semanticDestinationPath = (
  view: PetraProjectObjectLocationView,
): string => {
  const projectRoot = `/projects/${encodeURIComponent(view.project_id)}`;
  const destination = view.content.primary_destination;
  const target = destination.target_ref;
  if (destination.role === "brief") return `${projectRoot}/brief`;
  if (destination.role === "settings") return "/settings";
  if (destination.role === "petra") return `${projectRoot}/petra`;
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
    throw new ProjectDataError(
      `Petra returned ${destination.role} without an exact target.`,
      502,
    );
  }
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
  return redirect(semanticDestinationPath(view));
};
