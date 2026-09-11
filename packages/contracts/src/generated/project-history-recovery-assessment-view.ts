/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CommandAuthorityCheck = GrantedCommand | DeniedCommand;
export type Assessment =
  EligibleAssessment | BlockedAssessment | AlreadyCompensatedAssessment;

/**
 * A snapshot-consistent, read-only assessment of whether one exact applied scientific-authority ChangeSet can proceed to a separately requested compensation preview, or has been blocked or already compensated. It does not compose or execute compensation.
 */
export interface PetraProjectHistoryRecoveryAssessmentView {
  schema_name: "petra.project-history-recovery-assessment-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  content: RecoveryAssessmentContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface RecoveryAssessmentContent {
  view_kind: "change_set_recovery_assessment";
  authorization_scope: "authenticated_project";
  selected_event: RecentChange;
  recovery_subject: RecoverySubject;
  command_authority: CommandAuthority;
  causal_impact_basis: CausalImpactBasis;
  assessment: Assessment;
  decision_boundary: DecisionBoundary;
  authority: AuthorityPosition;
  omissions: [
    "compensation_preview_not_composed",
    "compensation_execution_not_performed",
    "generic_undo_not_implemented",
    "multi_step_compensation_not_assessed",
    "historical_project_definition_not_interpreted",
    "dependent_effect_not_inferred_from_reference",
    "cross_family_total_order_not_asserted",
  ];
  graph_navigation_history: "client_local_separate";
}
export interface RecentChange {
  command_ref: CommandRef;
  event_ref: EventRef;
  actor: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  family:
    | "change_control"
    | "project_source_lifecycle"
    | "project_source_replacement";
  /**
   * @minItems 1
   * @maxItems 100
   */
  targets: [TargetRef, ...TargetRef[]];
  observed_effect: ObservedEffect;
  recovery: EligibleRecovery | IneligibleRecovery;
  semantic_destination: SemanticDestination;
}
export interface CommandRef {
  command_id: string;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface TargetRef {
  role: "primary" | "affected" | "related";
  semantic_key: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision?: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash?: string;
  authority_state?: string;
}
export interface ObservedEffect {
  effect:
    | "change_proposed"
    | "approval_recorded"
    | "authority_change_applied"
    | "authority_change_conflicted"
    | "authority_change_reverted"
    | "reversal_conflicted"
    | "project_source_excluded"
    | "project_source_restored"
    | "source_replacement_created"
    | "source_replacement_retracted";
  outcome: "completed" | "conflicted";
  summary: string;
}
export interface EligibleRecovery {
  eligibility: "eligible";
  command_name:
    | "ExcludeProjectSource"
    | "RestoreProjectSource"
    | "RetractProjectSourceReplacement";
  expected_target_ref: RecoveryRef;
  reason: string;
}
export interface RecoveryRef {
  semantic_key: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface IneligibleRecovery {
  eligibility: "ineligible";
  reason: string;
}
export interface SemanticDestination {
  place_role: "history";
  task_intent: "view_history";
  object_ref: {
    semantic_key: string;
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    object_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision?: number;
  };
}
export interface RecoverySubject {
  selected_event_role: "promotion" | "compensation";
  promotion_change_set: ChangeSetAuthorityRef;
  applied_approval: ApprovalAuthorityRef;
  /**
   * @minItems 2
   * @maxItems 2
   */
  current_targets: [EvidenceAuthorityRef, EvidenceAuthorityRef];
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
export interface ApprovalAuthorityRef {
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  change_set_revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
  decision: "approved";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface EvidenceAuthorityRef {
  semantic_key: "scientific.claim" | "scientific.assertion";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name: "petra.claim" | "petra.assertion";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  authority_zone: "quarantine" | "trusted";
  review_state:
    | "unreviewed"
    | "machine_checked"
    | "human_accepted"
    | "human_rejected"
    | "disputed";
  admission_kind: "proposal" | "promotion" | "reversal";
  /**
   * A Petra identifier whose kind is change_set.
   */
  promotion_change_set_id?: string;
}
export interface CommandAuthority {
  principal_source: "server_authenticated_single_user";
  principal_state:
    | {
        state: "configured";
        actor: ActorRef;
      }
    | {
        state: "unavailable";
        reason: "principal_not_configured" | "actor_not_registered";
      };
  /**
   * @minItems 3
   * @maxItems 3
   */
  required_commands: [
    CommandAuthorityCheck,
    CommandAuthorityCheck,
    CommandAuthorityCheck,
  ];
  execution_recheck: "required_at_each_command";
}
export interface GrantedCommand {
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  state: "granted";
  grant_ref: GrantAuthorityRef;
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
export interface DeniedCommand {
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  state: "denied";
  reason:
    | "principal_not_configured"
    | "actor_not_registered"
    | "active_grant_not_found"
    | "active_grant_ambiguous";
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
export interface EligibleAssessment {
  state: "eligible_for_preview";
  scope: "single_change_set_compensation";
  reason: string;
  /**
   * @maxItems 0
   */
  blockers: [];
}
export interface BlockedAssessment {
  state: "blocked";
  scope: "single_change_set_compensation";
  reason: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  blockers:
    | [AssessmentBlocker]
    | [AssessmentBlocker, AssessmentBlocker]
    | [AssessmentBlocker, AssessmentBlocker, AssessmentBlocker]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ]
    | [
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
        AssessmentBlocker,
      ];
}
export interface AssessmentBlocker {
  code:
    | "selected_change_set_is_compensation"
    | "change_set_not_applied"
    | "change_set_operation_set_invalid"
    | "target_revision_changed"
    | "target_authority_changed"
    | "target_pair_mismatch"
    | "impact_target_set_mismatch"
    | "command_authority_missing"
    | "command_authority_ambiguous";
  detail: string;
}
export interface AlreadyCompensatedAssessment {
  state: "already_compensated";
  scope: "single_change_set_compensation";
  reason: string;
  /**
   * @maxItems 0
   */
  blockers: [];
  compensation_change_set: ChangeSetAuthorityRef;
  compensation_approval: ApprovalAuthorityRef;
  compensation_event_ref: EventRef;
}
export interface DecisionBoundary {
  reversibility: "assessed_for_exact_change_set";
  compensation_preview: "not_composed";
  compensation_execution: "not_performed";
  multi_step_compensation: "not_assessed";
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  through_event_position: number;
  through_stream_revision: number;
}
