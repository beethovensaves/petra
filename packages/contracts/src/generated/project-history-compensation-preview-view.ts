/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type OperationPreview = ClaimRetraction | AssertionRetraction;

/**
 * A short-lived, read-only preview of the exact single-ChangeSet Claim–Assertion retraction and governed command sequence available from one still-eligible recovery assessment. It is not a ChangeSet, Approval, command, or execution authority.
 */
export interface PetraProjectHistoryCompensationPreviewView {
  schema_name: "petra.project-history-compensation-preview-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  content: PreviewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface PreviewContent {
  view_kind: "single_change_set_compensation_preview";
  authorization_scope: "authenticated_project";
  assessment_ref: AssessmentRef;
  compensates_change_set: ChangeSetAuthorityRef;
  target_change_set_schema: {
    schema_name: "petra.change-set";
    schema_version: "1.1.0";
    risk_tier: "R2";
    origin: "direct_edit";
  };
  /**
   * @minItems 2
   * @maxItems 2
   */
  operation_preview: [OperationPreview, OperationPreview];
  impact_basis: CausalImpactBasis;
  /**
   * @minItems 2
   * @maxItems 2
   */
  result_preview: [ResultingTarget, ResultingTarget];
  preservation: {
    prior_revisions: "retained";
    promotion_and_approval: "retained";
    selected_event: "retained";
    dependent_records: "not_rewritten";
    dependent_effects: "not_automatically_reversed";
  };
  required_user_input: [
    "reason",
    "approval_rationale",
    "explicit_confirmation",
  ];
  change_set_composition: "deferred_until_confirmed_input";
  /**
   * @minItems 3
   * @maxItems 3
   */
  command_sequence: [CommandStep, CommandStep, CommandStep];
  freshness: Freshness;
  decision_boundary: {
    preview: "read_only";
    change_set: "not_created";
    approval: "not_recorded";
    commands: "not_composed_or_executed";
    generic_undo: "not_available";
    multi_step_compensation: "not_assessed";
  };
  omissions: [
    "user_reason_not_supplied",
    "approval_rationale_not_supplied",
    "command_envelopes_not_composed",
    "compensation_not_persisted",
    "compensation_not_executed",
    "dependent_effect_not_inferred_or_reversed",
    "historical_project_definition_not_interpreted",
  ];
  graph_navigation_history: "client_local_separate";
}
export interface AssessmentRef {
  schema_name: "petra.project-history-recovery-assessment-view";
  schema_version: "1.0.0";
  event_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  assessed_at: string;
  assessment_state: "eligible_for_preview";
  authority: AuthorityPosition;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  through_event_position: number;
  through_stream_revision: number;
}
export interface ChangeSetAuthorityRef {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  revision: 1;
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  current_state:
    | "submitted"
    | "approved"
    | "rejected"
    | "applied"
    | "conflicted"
    | "reverted";
}
export interface ClaimRetraction {
  operation_kind: "retract_claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  current_record_hash: string;
  before: TrustedState;
  after: RetractionState;
}
export interface TrustedState {
  zone: "trusted";
  review_state: "human_accepted";
}
export interface RetractionState {
  zone: "quarantine";
  review_state: "human_rejected";
}
export interface AssertionRetraction {
  operation_kind: "retract_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  current_record_hash: string;
  before: TrustedState;
  after: RetractionState;
}
export interface CausalImpactBasis {
  source_event_id: string;
  direct_dependency_summary: ImpactSummary;
  semantic_dependency_summary: SemanticSummary;
  dependent_effect: "not_inferred_from_reference";
  unknowns: [
    "unregistered_profile_specific_dependencies_may_exist",
    "transitive_dependents_may_exist",
    "external_system_dependents_are_not_observable",
  ];
}
export interface ImpactSummary {
  registered_group_count: 4;
  total_count: number;
  coverage: "complete" | "truncated";
}
export interface SemanticSummary {
  registered_adapter_count: 9;
  assessed_target_count: number;
  supported_target_count: number;
  total_count: number;
  coverage: "complete" | "truncated";
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
export interface CommandStep {
  position: 1 | 2 | 3;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  actor: ActorRef;
  grant_ref: GrantAuthorityRef;
  composition_state: "not_composed";
  authority_recheck: "required";
  prerequisite:
    | "confirmed_preview_and_required_input"
    | "submitted_exact_change_set"
    | "approved_exact_change_set";
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string & string;
  actor_kind: "human" | "service" | "model";
}
export interface GrantAuthorityRef {
  capability_grant_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface Freshness {
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  issued_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_through: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  binding_hash: string;
  invalidation_causes: [
    "expiry_reached",
    "project_authority_advanced",
    "promotion_state_changed",
    "target_revision_or_record_changed",
    "command_grant_changed",
  ];
}
