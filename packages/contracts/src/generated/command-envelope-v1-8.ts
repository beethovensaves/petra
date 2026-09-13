/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Command =
  | (
      | (
          | (
              | (
                  | (
                      | (
                          | SubmitChangeSet
                          | RecordApproval
                          | ApplyChangeSet
                          | ExcludeProjectSource
                          | RestoreProjectSource
                        )
                      | CreateProjectSourceReplacement
                      | RetractProjectSourceReplacement
                    )
                  | DeferReviewSession
                  | ReopenReviewSession
                )
              | RefreshReviewSession
            )
          | CorrectReviewCandidate
        )
      | CorrectReviewCandidateFromHumanEdit
    )
  | ReviseReviewCandidateBasis;
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
 * An additive Project-scoped working revision that binds one exact profile-registered object record to its producer, task, input snapshot, basis, provenance, qualifications, and validation. It is durable working state and never domain authority.
 */
export type PetraWorkingCandidate = {
  schema_name: "petra.working-candidate";
  schema_version: "1.0.0";
  working_candidate_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: ProjectDefinitionRef;
  profile_object: ProfileObjectBinding;
  producer: HumanProducer | ServiceProducer | ModelProducer;
  task_context: ThreadTurnTask | WorkUnitTask | InteractionWorkTask;
  input_snapshot: InputSnapshot;
  origin: Origin;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis: [BasisItem, ...BasisItem[]];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  provenance: [ProvenanceItem, ...ProvenanceItem[]];
  qualifications: Qualifications;
  validation: Validation;
  lineage: RootLineage | SupersessionLineage;
  disposition: "available" | "withdrawn";
  authority_boundary: AuthorityBoundary;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
};
export type ProfileObjectBinding = {
  registration: ProfileRegistration;
  object_record_ref: ExactTypedRecordRef;
  candidate_operation: "create" | "revise";
  current_authoritative_ref?: ExactTypedRecordRef;
};
export type Qualifications = {
  assessment_state: "stated" | "none_recorded";
  /**
   * @maxItems 100
   */
  statements: QualificationStatement[];
};
export type Validation = {
  state: "pending" | "completed" | "blocked";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  target_record_hash: string;
  /**
   * @maxItems 1000
   */
  results: ValidationResult[];
};

/**
 * The adapter-neutral command envelope extended with one exact, human-authored scientific source-basis revision for an existing open Review member. The server composes additive non-authoritative Claim and working-state revisions; the operation grants no Review decision or domain authority.
 */
export interface PetraCommandEnvelopeV180 {
  schema_name: "petra.command-envelope";
  schema_version: "1.8.0";
  command_id: string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: ActorRef;
  capability_grant_id: string;
  correlation_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  causation_id?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
  command: Command;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface SubmitChangeSet {
  command_name: "SubmitChangeSet";
  change_set: PetraChangeSetV110;
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
  target_id: string;
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
  target_id: string;
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
  target_id: string;
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
  target_id: string;
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
export interface RecordApproval {
  command_name: "RecordApproval";
  approval: PetraApproval;
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
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
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
export interface ExcludeProjectSource {
  command_name: "ExcludeProjectSource";
  expected_source_ref: ExactProjectSourceRef & {
    status?: "active";
    [k: string]: unknown;
  };
  reason: string;
}
export interface ExactProjectSourceRef {
  project_source_id: string;
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
  status: "active" | "excluded";
}
export interface RestoreProjectSource {
  command_name: "RestoreProjectSource";
  expected_source_ref: ExactProjectSourceRef & {
    status?: "excluded";
    [k: string]: unknown;
  };
  reason: string;
}
export interface CreateProjectSourceReplacement {
  command_name: "CreateProjectSourceReplacement";
  replacement_kind:
    | "newer_source_version"
    | "identity_resolution"
    | "preferred_copy_changed"
    | "project_role_replacement";
  replaced_source_ref: ExcludedSourceRef;
  replacement_source_ref: ActiveSourceRef;
  exclusion_receipt_ref: ExclusionReceiptRef;
  rationale: string;
}
export interface ExcludedSourceRef {
  project_source_id: string;
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
  status: "excluded";
}
export interface ActiveSourceRef {
  project_source_id: string;
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
  status: "active";
}
export interface ExclusionReceiptRef {
  project_source_lifecycle_receipt_id: string;
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
export interface RetractProjectSourceReplacement {
  command_name: "RetractProjectSourceReplacement";
  expected_replacement_ref: ExactReplacementRef & {
    state?: "active";
    [k: string]: unknown;
  };
  reason: string;
}
export interface ExactReplacementRef {
  project_source_replacement_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  state: "active" | "retracted";
}
export interface DeferReviewSession {
  command_name: "DeferReviewSession";
  expected_review_session_ref: ExactReviewSessionRef & {
    lifecycle?: "open";
    [k: string]: unknown;
  };
  rationale?: string;
}
export interface ExactReviewSessionRef {
  review_session_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  lifecycle: "open" | "deferred" | "completed";
}
export interface ReopenReviewSession {
  command_name: "ReopenReviewSession";
  expected_review_session_ref: ExactReviewSessionRef & {
    lifecycle?: "deferred";
    [k: string]: unknown;
  };
  rationale?: string;
}
export interface RefreshReviewSession {
  command_name: "RefreshReviewSession";
  expected_review_session_ref: ExactReviewSessionRef1;
}
export interface ExactReviewSessionRef1 {
  review_session_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  lifecycle: "open";
}
export interface CorrectReviewCandidate {
  command_name: "CorrectReviewCandidate";
  expected_review_session_ref: ExactReviewSessionRef1;
  review_member_id: string;
  expected_working_candidate_ref: ExactWorkingCandidateRef;
  expected_working_relationship_ref: ExactWorkingRelationshipRef;
  corrected_candidate: PetraWorkingCandidate;
  corrected_profile_record: PetraClaim;
}
export interface ExactWorkingCandidateRef {
  working_candidate_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExactWorkingRelationshipRef {
  working_relationship_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ProjectDefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  definition_family: string;
}
export interface ProfileRegistration {
  registration_kind: "object_schema";
  semantic_key: string;
  contract: NamedVersionHash;
}
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExactTypedRecordRef {
  schema_name: string;
  schema_version: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface HumanProducer {
  producer_kind: "human";
  actor: HumanActorRef1;
  contribution_kind: "direct_edit" | "human_extraction";
}
export interface HumanActorRef1 {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface ServiceProducer {
  producer_kind: "service";
  actor: ServiceActorRef;
  contribution_kind: "tool_output" | "import" | "deterministic_mapping";
  service_role_ref: NamedVersionHash;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
export interface ModelProducer {
  producer_kind: "model";
  actor: ModelActorRef;
  contribution_kind: "model_output";
  model_role_ref: NamedVersionHash;
  model_call_ref: ExactTypedRecordRef;
}
export interface ModelActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "model";
}
export interface ThreadTurnTask {
  task_kind: "thread_turn";
  objective_ref: ExactTypedRecordRef;
  thread_binding: ThreadBinding;
}
export interface ThreadBinding {
  project_thread_ref: ExactTypedRecordRef;
  project_turn_id: string;
}
export interface WorkUnitTask {
  task_kind: "work_unit";
  objective_ref: ExactTypedRecordRef;
  work_unit_ref: ExactTypedRecordRef;
}
export interface InteractionWorkTask {
  task_kind: "interaction_work";
  objective_ref: ExactTypedRecordRef;
  thread_binding: ThreadBinding;
  work_unit_ref: ExactTypedRecordRef;
  interaction_run_ref: ExactTypedRecordRef;
}
export interface InputSnapshot {
  snapshot_ref: ProjectSnapshotRef;
  context_packet_ref?: ExactTypedRecordRef;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  input_record_refs: [ExactTypedRecordRef, ...ExactTypedRecordRef[]];
}
export interface ProjectSnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Origin {
  origin_kind:
    | "direct_edit"
    | "model_output"
    | "tool_output"
    | "import"
    | "extraction"
    | "work_result";
  /**
   * @minItems 1
   * @maxItems 100
   */
  source_record_refs: [ExactTypedRecordRef, ...ExactTypedRecordRef[]];
  summary: string;
}
export interface BasisItem {
  basis_role:
    | "source"
    | "current_state"
    | "instruction"
    | "constraint"
    | "prior_work"
    | "author_judgment";
  record_ref: ExactTypedRecordRef;
  summary: string;
}
export interface ProvenanceItem {
  provenance_role:
    | "derivation"
    | "input"
    | "output"
    | "model_call"
    | "interaction"
    | "work_result"
    | "prior_revision";
  record_ref: ExactTypedRecordRef;
  statement: string;
}
export interface QualificationStatement {
  qualification_kind: "uncertainty" | "limitation";
  statement: string;
  basis_ref?: ExactTypedRecordRef;
}
export interface ValidationResult {
  validator_ref: NamedVersionHash;
  outcome: "passed" | "warning" | "failed" | "blocked";
  code: string;
  statement: string;
  validated_by: ActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  validated_at: string;
}
export interface ActorRef1 {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface RootLineage {
  lineage_kind: "root";
}
export interface SupersessionLineage {
  lineage_kind: "supersession";
  supersedes: WorkingCandidateRef;
  change_kind:
    | "mechanical_correction"
    | "basis_revision"
    | "material_revision"
    | "withdrawal";
  reason: string;
}
export interface WorkingCandidateRef {
  working_candidate_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface AuthorityBoundary {
  domain_authority: false;
  review_decision: false;
  mutation_authority: false;
  validation_grants_authority: false;
  promotion_requires_review: true;
}
/**
 * A proposition with explicit scientific scope, epistemic basis, and authority state; existence does not imply truth.
 */
export interface PetraClaim {
  schema_name: "petra.claim";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is claim.
   */
  claim_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  canonical_text: string;
  claim_kind:
    | "descriptive"
    | "comparative"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "theoretical"
    | "measurement";
  normalization_status: "verbatim" | "normalized" | "composed";
  scope: ScientificScope;
  basis: SourceBasis | SynthesisBasis | ResearcherBasis;
  authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority;
  /**
   * A Petra identifier whose kind is claim.
   */
  supersedes_claim_id?: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface ScientificScope {
  population?: ScopeDimension;
  language?: ScopeDimension;
  task?: ScopeDimension;
  model_family?: ScopeDimension;
  dataset?: ScopeDimension;
  intervention_or_exposure?: ScopeDimension;
  comparator?: ScopeDimension;
  outcome?: ScopeDimension;
  setting?: ScopeDimension;
  temporal_boundary?: ScopeDimension;
  /**
   * @maxItems 10
   */
  unreported_dimensions:
    | []
    | [
        | "population"
        | "language"
        | "task"
        | "model_family"
        | "dataset"
        | "intervention_or_exposure"
        | "comparator"
        | "outcome"
        | "setting"
        | "temporal_boundary",
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ];
  notes?: string;
}
export interface ScopeDimension {
  description: string;
  /**
   * @maxItems 1000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  entity_refs: string[];
}
export interface SourceBasis {
  basis_kind: "source";
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  source_scope: "full_text" | "abstract_only";
  detail_level: "broad" | "detailed";
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_ids: [string & string, ...(string & string)[]];
  source_stance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  attribution: string;
  modality: "asserted" | "hedged" | "conditional" | "speculative";
  negated: boolean;
  uncertainty?: string;
  derivation: Derivation;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  validator_results: [ValidatorResult, ...ValidatorResult[]];
  extraction_confidence?: number;
  proposed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface Derivation {
  derivation_kind:
    "deterministic_mapping" | "model_extraction" | "human_extraction";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  derivation_ref: string;
}
export interface ValidatorResult {
  validator_name: string;
  validator_version: string;
  outcome: "pass" | "warning" | "fail";
  code: string;
  message?: string;
}
export interface SynthesisBasis {
  basis_kind: "synthesis";
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is claim.
   */
  basis_claim_ids: [string, ...string[]];
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is assertion.
   */
  basis_assertion_ids: string[];
  composition_kind: "human" | "model_assisted" | "deterministic";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  composition_ref: string;
  composed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  composed_at: string;
}
export interface ResearcherBasis {
  basis_kind: "researcher";
  rationale: string;
  proposed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface QuarantineAuthority {
  zone: "quarantine";
  review_state:
    "unreviewed" | "machine_checked" | "human_rejected" | "disputed";
}
export interface TrustedAuthority {
  zone: "trusted";
  review_state: "machine_checked" | "human_accepted" | "disputed";
  promotion: PromotionBasis;
}
export interface PromotionBasis {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  approval_basis: HumanApprovalBasis | PolicyApprovalBasis;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  applied_at: string;
}
export interface HumanApprovalBasis {
  approval_kind: "human";
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  approved_by: ActorRef;
}
export interface PolicyApprovalBasis {
  approval_kind: "review_policy";
  /**
   * A Petra identifier whose kind is review_policy.
   */
  review_policy_id: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  calibration_ref: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  audit_ref?: string;
}
export interface PersonalAuthority {
  zone: "personal";
  review_state: "unreviewed" | "human_accepted" | "disputed";
  recorded_by: ActorRef;
}
export interface CorrectReviewCandidateFromHumanEdit {
  command_name: "CorrectReviewCandidate";
  expected_review_session_ref: ExactReviewSessionRef1;
  review_member_id: string;
  expected_working_candidate_ref: ExactWorkingCandidateRef;
  expected_working_relationship_ref: ExactWorkingRelationshipRef;
  correction_input: HumanScientificClaimTextEdit;
}
/**
 * The only human-authored profile field accepted by this preparation boundary. Scope, kind, source identity, stance, attribution, modality, uncertainty, validators, authority, authorship, timestamps, lineage, provenance, and hashes are retained or composed by server authority.
 */
export interface HumanScientificClaimTextEdit {
  input_kind: "human_scientific_claim_text_edit";
  canonical_text: string;
}
export interface ReviseReviewCandidateBasis {
  command_name: "ReviseReviewCandidateBasis";
  expected_review_session_ref: ExactReviewSessionRef1;
  review_member_id: string;
  expected_project_definition_ref: ProjectDefinitionRef;
  expected_working_candidate_ref: ExactWorkingCandidateRef;
  expected_working_relationship_ref: ExactWorkingRelationshipRef;
  expected_claim_ref: ExactClaimRef;
  basis_revision_input: HumanScientificSourceBasisRevision;
}
export interface ExactClaimRef {
  schema_name: "petra.claim";
  schema_version: "1.0.0";
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
/**
 * Human-authored scientific source semantics and exact source material. Project scope, WorkVersion, Claim identity, derivation, validators, authorship, timestamps, lineage, provenance, validation reset, and hashes are resolved or composed by server authority.
 */
export interface HumanScientificSourceBasisRevision {
  input_kind: "human_scientific_source_basis_revision";
  project_source_ref: ExactProjectSourceRef1;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  source_span_refs: [ExactSourceSpanRef, ...ExactSourceSpanRef[]];
  source_scope: "full_text" | "abstract_only";
  detail_level: "broad" | "detailed";
  source_stance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  attribution: string;
  modality: "asserted" | "hedged" | "conditional" | "speculative";
  negated: boolean;
  uncertainty?: string;
  reason: string;
}
export interface ExactProjectSourceRef1 {
  project_source_id: string;
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
  status: "active";
}
export interface ExactSourceSpanRef {
  schema_name: "petra.source-span";
  schema_version: "1.0.0";
  record_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
