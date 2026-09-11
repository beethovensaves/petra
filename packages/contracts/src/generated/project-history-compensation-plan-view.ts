/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ChangeSetContent = {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  origin: "direct_edit" | "agent_proposal" | "worker_proposal";
  proposed_by: ActorRef;
  reason: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  operations: [
    (
      | PromoteClaimOperation
      | PromoteAssertionOperation
      | RetractClaimOperation
      | RetractAssertionOperation
    ),
    ...(
      | PromoteClaimOperation
      | PromoteAssertionOperation
      | RetractClaimOperation
      | RetractAssertionOperation
    )[],
  ];
  impact: ImpactPreview;
  risk_tier: "R0" | "R1" | "R2" | "R3" | "R4";
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensates_change_set_id?: string;
} & (
  | {
      operations?: unknown[];
      /**
       * A Petra identifier whose kind is change_set.
       */
      compensates_change_set_id: string;
      [k: string]: unknown;
    }
  | {
      operations?: unknown[];
      compensates_change_set_id?: never;
      [k: string]: unknown;
    }
);

/**
 * A deterministic, non-persisted three-command compensation plan composed only after exact preview revalidation and explicit human confirmation. It is not execution and every command retains its transactional authority recheck.
 */
export interface PetraProjectHistoryCompensationPlanView {
  schema_name: "petra.project-history-compensation-plan-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  content: PlanContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface PlanContent {
  plan_kind: "single_change_set_compensation_command_plan";
  authorization_scope: "authenticated_project";
  preview_ref: PreviewRef;
  confirmation: {
    state: "explicitly_confirmed";
    confirmed_by: HumanActorRef;
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    confirmed_at: string;
  };
  revalidation: Revalidation;
  change_set: PetraChangeSetV110;
  approval: PetraApproval;
  /**
   * @minItems 3
   * @maxItems 3
   */
  commands: [PlannedCommand, PlannedCommand, PlannedCommand];
  persistence: {
    change_set: "not_persisted";
    approval: "not_persisted";
    commands: "not_persisted";
  };
  execution: {
    state: "not_performed";
    requires_separate_request: true;
    authority_recheck: "required_at_each_command";
  };
  decision_boundary: {
    preview: "revalidated";
    command_plan: "composed";
    compensation: "not_persisted_or_executed";
    generic_undo: "not_available";
    multi_step_compensation: "not_assessed";
  };
  omissions: [
    "commands_not_submitted",
    "compensation_not_persisted",
    "compensation_not_executed",
    "dependent_effect_not_inferred_or_reversed",
    "historical_project_definition_not_interpreted",
  ];
  graph_navigation_history: "client_local_separate";
}
export interface PreviewRef {
  schema_name: "petra.project-history-compensation-preview-view";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  binding_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  issued_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_through: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface Revalidation {
  state: "passed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  assessment_content_hash: string;
  authority: AuthorityPosition;
  /**
   * @minItems 2
   * @maxItems 2
   */
  target_bindings: [
    ClaimRetraction | AssertionRetraction,
    ClaimRetraction | AssertionRetraction,
  ];
  /**
   * @minItems 3
   * @maxItems 3
   */
  preview_command_bindings: [CommandStep, CommandStep, CommandStep];
  preview_expiry: "unexpired";
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  through_event_position: number;
  through_stream_revision: number;
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
  actor_id: string;
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
/**
 * An immutable, content-bound scientific authority change supporting both initial promotion and explicit compensating reversal.
 */
export interface PetraChangeSetV110 {
  schema_name: "petra.change-set";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  revision: 1;
  state: "submitted";
  content: ChangeSetContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface PromoteClaimOperation {
  operation_kind: "promote_claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: QuarantineState;
  after: HumanTrustedState;
}
export interface QuarantineState {
  zone: "quarantine";
  review_state: "unreviewed" | "machine_checked";
}
export interface HumanTrustedState {
  zone: "trusted";
  review_state: "human_accepted";
}
export interface PromoteAssertionOperation {
  operation_kind: "promote_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: QuarantineState;
  after: HumanTrustedState;
}
export interface RetractClaimOperation {
  operation_kind: "retract_claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: HumanTrustedState1;
  after: HumanRejectedState;
}
export interface HumanTrustedState1 {
  zone: "trusted";
  review_state: "human_accepted";
}
export interface HumanRejectedState {
  zone: "quarantine";
  review_state: "human_rejected";
}
export interface RetractAssertionOperation {
  operation_kind: "retract_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: HumanTrustedState1;
  after: HumanRejectedState;
}
export interface ImpactPreview {
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  affected_object_ids: [string, ...string[]];
  /**
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  downstream_object_ids: string[];
  summary: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  generated_at: string;
}
/**
 * A human decision bound to one exact ChangeSet revision and canonical content hash.
 */
export interface PetraApproval {
  schema_name: "petra.approval";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  subject: ChangeSetSubject;
  decision: "approved" | "rejected";
  decision_scope: "exact_change_set";
  decided_by: HumanActorRef;
  rationale: string;
  /**
   * @maxItems 100
   */
  conditions: string[];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  decided_at: string;
}
export interface ChangeSetSubject {
  subject_kind: "change_set";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  change_set_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
}
export interface PlannedCommand {
  position: 1 | 2 | 3;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  envelope: PetraCommandEnvelopeV110;
  state: "composed_not_submitted";
}
/**
 * The adapter-neutral command envelope for promotion or compensating-reversal ChangeSets.
 */
export interface PetraCommandEnvelopeV110 {
  schema_name: "petra.command-envelope";
  schema_version: "1.1.0";
  command_id: string & string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: ActorRef;
  capability_grant_id: string & string;
  correlation_id: string & string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  causation_id?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
  command: SubmitChangeSet | RecordApproval | ApplyChangeSet;
}
export interface SubmitChangeSet {
  command_name: "SubmitChangeSet";
  change_set: PetraChangeSetV110;
}
export interface RecordApproval {
  command_name: "RecordApproval";
  approval: PetraApproval;
}
export interface ApplyChangeSet {
  command_name: "ApplyChangeSet";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  change_set_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  approval_revision: number;
}
