/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ExecutionContent = {
  execution_kind: "single_change_set_compensation_execution";
  authorization_scope: "authenticated_project";
  plan_ref: PlanRef;
  preflight: {
    state:
      | "fresh_plan_revalidated"
      | "retained_prefix_validated"
      | "retained_completion_replayed";
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    checked_at: string;
  };
  outcome: "completed" | "stopped";
  completed_prefix: number;
  /**
   * @minItems 3
   * @maxItems 3
   */
  steps: [ExecutionStep, ExecutionStep, ExecutionStep];
  authoritative_effect: CompletedEffect | IncompleteEffect;
  recovery: CompletedRecovery | IncompleteRecovery;
  atomicity: "per_command_transaction_not_three_command_atomic";
  derivation: {
    aggregate_ledger: "not_created";
    sources: [
      "immutable_command_executions",
      "immutable_domain_events",
      "current_change_control_authority",
    ];
  };
  decision_boundary: {
    single_plan_execution: "performed_or_stopped_exactly";
    generic_undo: "not_available";
    multi_step_compensation: "not_assessed";
    reversal_of_reversal: "not_available";
  };
  omissions: [
    "dependent_effect_not_inferred_or_reversed",
    "historical_project_definition_not_interpreted",
    "cross_family_global_order_not_asserted",
  ];
  graph_navigation_history: "client_local_separate";
};
export type ExecutionStep =
  | RetainedSuccessStep
  | RetainedFailureStep
  | UnretainedFailureStep
  | NotAttemptedStep;
export type CommandResult =
  SubmittedResult | ApprovalRecordedResult | RevertedResult;

/**
 * An authenticated result for one exact compensation-plan execution or retry, derived from immutable per-command executions and events rather than a second History ledger.
 */
export interface PetraProjectHistoryCompensationExecutionView {
  schema_name: "petra.project-history-compensation-execution-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  content: ExecutionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface PlanRef {
  schema_name: "petra.project-history-compensation-plan-view";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  composed_at: string;
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  correlation_id: string;
}
export interface RetainedSuccessStep {
  position: 1 | 2 | 3;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  command_ref: CommandRef;
  state: "retained_success";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  result: CommandResult;
  event_ref: EventRef;
}
export interface CommandRef {
  command_id: string & string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  command_name:
    | "SubmitChangeSet"
    | "RecordApproval"
    | "ApplyChangeSet"
    | "ExcludeProjectSource"
    | "RestoreProjectSource"
    | "CreateProjectSourceReplacement"
    | "RetractProjectSourceReplacement";
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  capability_grant_id: string;
  correlation_id: string;
}
export interface SubmittedResult {
  outcome: "submitted";
  command_id: string & string;
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  change_set_state: "submitted";
}
export interface ApprovalRecordedResult {
  outcome: "approval_recorded";
  command_id: string & string;
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  change_set_state: "approved";
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
}
export interface RevertedResult {
  outcome: "reverted";
  command_id: string & string;
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  change_set_state: "applied";
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensates_change_set_id: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  claim_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  claim_revision: number;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  assertion_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  assertion_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  applied_at: string;
}
export interface EventRef {
  event_id: string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  event_type:
    | "change_set.submitted"
    | "approval.recorded"
    | "change_set.applied"
    | "change_set.conflicted"
    | "change_set.reverted"
    | "change_set.reversal_conflicted"
    | "project_source.excluded"
    | "project_source.restored"
    | "project_source.replacement_created"
    | "project_source.replacement_retracted";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface RetainedFailureStep {
  position: 1 | 2 | 3;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  command_ref: CommandRef;
  state: "retained_failure";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  error: {
    code: "STALE_TARGET_REVISION" | "TARGET_AUTHORITY_MISMATCH";
    message: string;
  };
  event_ref: EventRef;
}
export interface UnretainedFailureStep {
  position: 1 | 2 | 3;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  command_ref: CommandRef;
  state: "attempt_failed_not_retained";
  error: ErrorObservation;
  retention: "not_in_immutable_command_executions";
}
export interface ErrorObservation {
  code: string;
  message: string;
}
export interface NotAttemptedStep {
  position: 1 | 2 | 3;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  command_ref: CommandRef;
  state: "not_attempted";
  reason: "prior_command_did_not_complete";
}
export interface CompletedEffect {
  state: "compensation_applied";
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensation_change_set_id: string;
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensated_change_set_id: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  claim_ref: ResultingTarget;
  assertion_ref: ResultingTarget;
  reversal_event_ref: EventRef;
}
export interface ResultingTarget {
  semantic_key: "scientific.claim" | "scientific.assertion";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  prior_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  resulting_revision: number;
  resulting_authority: RetractionState;
}
export interface RetractionState {
  zone: "quarantine";
  review_state: "human_rejected";
}
export interface IncompleteEffect {
  state: "not_completed";
  reason: "command_sequence_stopped";
}
export interface CompletedRecovery {
  state: "complete";
  same_request: "returns_exact_retained_result";
}
export interface IncompleteRecovery {
  state: "retry_exact_plan" | "review_retained_failure";
  completed_prefix: number;
  same_request_is_idempotent: true;
  next_position?: number;
  reason: string;
}
