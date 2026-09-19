/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
  origin: Origin1;
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
 * An additive Project-scoped working revision that binds one exact profile-registered relationship record and its endpoints to the same non-authoritative producer, task, input, basis, provenance, qualification, validation, and supersession boundary as a WorkingCandidate.
 */
export type PetraWorkingRelationship = {
  schema_name: "petra.working-relationship";
  schema_version: "1.0.0";
  working_relationship_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: ProjectDefinitionRef;
  profile_relationship: ProfileRelationshipBinding;
  endpoints: RelationshipEndpoints;
  producer: HumanProducer | ServiceProducer | ModelProducer;
  task_context: ThreadTurnTask | WorkUnitTask | InteractionWorkTask;
  input_snapshot: InputSnapshot;
  origin: Origin1;
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
  lineage: RootLineage1 | SupersessionLineage1;
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
} & {
  schema_name: "petra.working-relationship";
  schema_version: "1.0.0";
  working_relationship_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: ProjectDefinitionRef;
  profile_relationship: ProfileRelationshipBinding;
  endpoints: RelationshipEndpoints;
  producer: HumanProducer | ServiceProducer | ModelProducer;
  task_context: ThreadTurnTask | WorkUnitTask | InteractionWorkTask;
  input_snapshot: InputSnapshot;
  origin: Origin1;
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
  lineage: RootLineage1 | SupersessionLineage1;
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
export type ProfileRelationshipBinding = {
  registration: ProfileRegistration1;
  predicate: string;
  relationship_record_ref: ExactTypedRecordRef;
  candidate_operation: "create" | "revise";
  current_authoritative_ref?: ExactTypedRecordRef;
};
/**
 * @minItems 1
 * @maxItems 10000
 */
export type Basis = [BasisItem1, ...BasisItem1[]];
export type ChangeSetContent1 = {
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
 * The exact observed result of recording a rejected human Approval for one complete Review ChangeSet.
 */
export interface PetraReviewSessionRejectResult {
  schema_name: "petra.review-session-reject-result";
  schema_version: "1.0.0";
  outcome: "rejected" | "reconciliation_required";
  /**
   * @minItems 2
   * @maxItems 2
   */
  steps: [
    {
      envelope: PetraCommandEnvelope;
      observation:
        "executed" | "replayed" | "unattempted" | "unverified" | "failed";
      event?: PetraDomainEvent;
      error_code?: string;
    },
    {
      envelope: PetraCommandEnvelope;
      observation:
        "executed" | "replayed" | "unattempted" | "unverified" | "failed";
      event?: PetraDomainEvent;
      error_code?: string;
    },
  ];
  assessment: PetraReviewRecoveryAssessment;
  request: PetraReviewSessionRejectRequest;
}
/**
 * The adapter-neutral, idempotent command boundary for ChangeSet submission, human review, and application.
 */
export interface PetraCommandEnvelope {
  schema_name: "petra.command-envelope";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: ActorRef;
  capability_grant_id: string;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface SubmitChangeSet {
  command_name: "SubmitChangeSet";
  change_set: PetraChangeSet;
}
/**
 * An immutable, content-bound proposal for one atomic scientific authority change.
 */
export interface PetraChangeSet {
  schema_name: "petra.change-set";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  state:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "applied"
    | "conflicted"
    | "reverted";
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
export interface ChangeSetContent {
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
    PromoteClaimOperation | PromoteAssertionOperation,
    ...(PromoteClaimOperation | PromoteAssertionOperation)[],
  ];
  impact: ImpactPreview;
  risk_tier: "R0" | "R1" | "R2" | "R3" | "R4";
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
/**
 * An immutable completed fact in a project authority stream, correlated to the command that caused it.
 */
export interface PetraDomainEvent {
  schema_name: "petra.domain-event";
  schema_version: "1.0.0";
  event_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  stream_type: "project";
  /**
   * A Petra identifier whose kind is project.
   */
  stream_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  correlation_id: string & string;
  causation_id: string;
  command_id: string;
  idempotency_key: string;
  capability_grant_id: string;
  event:
    | ChangeSetSubmitted
    | ApprovalRecorded
    | ChangeSetApplied
    | ChangeSetConflicted;
}
export interface ChangeSetSubmitted {
  event_type: "change_set.submitted";
  payload: ChangeSetSubmittedPayload;
}
export interface ChangeSetSubmittedPayload {
  change_set: PetraChangeSet;
}
export interface ApprovalRecorded {
  event_type: "approval.recorded";
  payload: ApprovalRecordedPayload;
}
export interface ApprovalRecordedPayload {
  approval: PetraApproval;
  derived_change_set_state: "approved" | "rejected";
}
export interface ChangeSetApplied {
  event_type: "change_set.applied";
  payload: ChangeSetAppliedPayload;
}
export interface ChangeSetAppliedPayload {
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
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  prior_claim_revision: number;
  claim: PetraClaim;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  prior_assertion_revision: number;
  assertion: PetraAssertion;
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
  claim_id: string & string;
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
  supersedes_claim_id?: string & string;
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
  work_version_id: string & string;
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
  basis_claim_ids: [string & string, ...(string & string)[]];
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is assertion.
   */
  basis_assertion_ids: (string & string)[];
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
  review_policy_id: string & string;
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
/**
 * A provenance-bearing typed relation whose authority records representation review rather than scientific truth.
 */
export interface PetraAssertion {
  schema_name: "petra.assertion";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is assertion.
   */
  assertion_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  subject_id: string;
  predicate:
    | "VERSION_OF"
    | "REPRESENTED_BY"
    | "LOCATED_IN"
    | "CITES"
    | "CITES_AS_BACKGROUND"
    | "ASSERTS"
    | "ADDRESSES"
    | "SUPPORTS"
    | "CONTRADICTS"
    | "QUALIFIES"
    | "ADOPTS"
    | "DIRECTLY_TESTS"
    | "EXTENDS"
    | "REFRAMES"
    | "CHALLENGES"
    | "CRITIQUES_METHOD"
    | "ASSUMES"
    | "PREDICTS"
    | "RIVAL_OF"
    | "TESTS"
    | "IMPLEMENTS"
    | "USES"
    | "PRODUCED"
    | "ANALYZES"
    | "EVALUATES"
    | "GOVERNS"
    | "INTERPRETS"
    | "COMPOSED_FROM"
    | "GROUNDS"
    | "RENDERS"
    | "REPLICATES"
    | "FAILS_TO_REPLICATE"
    | "INVESTIGATES"
    | "TESTS_CAUSE"
    | "CORRECTS"
    | "DEPENDS_ON"
    | "SUPERSEDES";
  object:
    | EntityObject
    | StringLiteral
    | BooleanLiteral
    | IntegerLiteral
    | DecimalLiteral
    | TimestampLiteral;
  assertion_kind:
    | "source_native"
    | "source_stated"
    | "deterministic_derivation"
    | "model_inference"
    | "human_judgment"
    | "experimental_observation"
    | "synthesis";
  authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  provenance_refs: [
    (
      | SourceSpanProvenance
      | StructuredFieldProvenance
      | AssertionProvenance
      | ActorProvenance
      | RecordProvenance
    ),
    ...(
      | SourceSpanProvenance
      | StructuredFieldProvenance
      | AssertionProvenance
      | ActorProvenance
      | RecordProvenance
    )[],
  ];
  scope: ScientificScope;
  scope_comparison?: ScopeComparison;
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  valid_time?: ValidTime;
  /**
   * A Petra identifier whose kind is assertion.
   */
  supersedes_assertion_id?: string & string;
  created_by: ActorRef;
}
export interface EntityObject {
  object_kind: "entity";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  entity_id: string;
}
export interface StringLiteral {
  object_kind: "string";
  value: string;
}
export interface BooleanLiteral {
  object_kind: "boolean";
  value: boolean;
}
export interface IntegerLiteral {
  object_kind: "integer";
  value: number;
}
export interface DecimalLiteral {
  object_kind: "decimal";
  value: string;
}
export interface TimestampLiteral {
  object_kind: "timestamp";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  value: string;
}
export interface SourceSpanProvenance {
  provenance_kind: "source_span";
  /**
   * A Petra identifier whose kind is source_span.
   */
  source_span_id: string & string;
}
export interface StructuredFieldProvenance {
  provenance_kind: "structured_field";
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
  json_pointer: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  field_hash: string;
}
export interface AssertionProvenance {
  provenance_kind: "basis_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  assertion_id: string & string;
}
export interface ActorProvenance {
  provenance_kind: "actor";
  actor: ActorRef;
}
export interface RecordProvenance {
  provenance_kind: "record";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  role:
    | "derivation"
    | "input"
    | "output"
    | "model_call"
    | "run"
    | "result"
    | "analysis";
}
export interface ScopeComparison {
  relation:
    "aligned" | "overlapping" | "narrower" | "broader" | "disjoint" | "unknown";
  rationale: string;
}
export interface ValidTime {
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_from?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_to?: string;
}
export interface ChangeSetConflicted {
  event_type: "change_set.conflicted";
  payload: ChangeSetConflictedPayload;
}
export interface ChangeSetConflictedPayload {
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
  conflict_code: "STALE_TARGET_REVISION" | "TARGET_AUTHORITY_MISMATCH";
  /**
   * @minItems 2
   * @maxItems 2
   */
  targets: [
    ClaimConflictTarget | AssertionConflictTarget,
    ClaimConflictTarget | AssertionConflictTarget,
  ];
}
export interface ClaimConflictTarget {
  target_kind: "claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  expected_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  actual_revision: number;
  expected_zone: "quarantine";
  actual_zone: "quarantine" | "trusted" | "personal";
}
export interface AssertionConflictTarget {
  target_kind: "assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  expected_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  actual_revision: number;
  expected_zone: "quarantine";
  actual_zone: "quarantine" | "trusted" | "personal";
}
/**
 * D020 read-only scientific Review reconciliation. Content identity excludes read time. No action or recovery execution is registered in this version.
 */
export interface PetraReviewRecoveryAssessment {
  schema_name: "petra.review-recovery-assessment";
  schema_version: "1.0.0";
  assessment_id: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: AssessmentContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reconciled_at: string;
}
export interface AssessmentContent {
  producer: "petra.postgres.review-recovery";
  rule_version: "d020.scientific.v1";
  privacy: "authenticated_single_user_project";
  review_session: PetraReviewSessionV110;
  review: ReviewViewContent;
  /**
   * @minItems 0
   * @maxItems 10000
   */
  groups: AtomicGroup[];
  /**
   * @minItems 0
   * @maxItems 100
   */
  unbound_member_ids: string[];
  coverage: {
    state: "complete";
    review_members: number;
    assessed_members: number;
    atomic_change_sets: number;
    operations: number;
  };
  /**
   * @minItems 13
   * @maxItems 13
   */
  preservation: [
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
    PreservationItem,
  ];
  /**
   * @minItems 1
   * @maxItems 20
   */
  limitations:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
  /**
   * @maxItems 0
   */
  actions: never[];
  authority_effect: "none";
  freshness: {
    expected_review_identity: "current";
    authority_snapshot: "current" | "stale";
    /**
     * @minItems 1
     * @maxItems 100
     */
    members: [
      {
        review_member_id: string;
        working_heads: "current" | "superseded";
      },
      ...{
        review_member_id: string;
        working_heads: "current" | "superseded";
      }[],
    ];
  };
  producer_version: "1.0.0";
}
/**
 * A durable, revisioned, profile-neutral decision context whose members bind exact canonical working-state revisions and exact profile-registered candidate records. Review composition grants no domain or mutation authority.
 */
export interface PetraReviewSessionV110 {
  schema_name: "petra.review-session";
  schema_version: "1.1.0";
  review_session_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: DefinitionRef;
  content: SessionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: HumanActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface DefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface SessionContent {
  title: string;
  objective_summary: string;
  objective_ref: ObjectiveRef;
  lifecycle: "open" | "deferred" | "completed";
  responsible: HumanActorRef1;
  snapshot: ProjectSnapshot;
  origin: Origin;
  return_context: ReturnContext;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember, ...ReviewMember[]];
}
export interface ObjectiveRef {
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface HumanActorRef1 {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface ProjectSnapshot {
  event_position: number;
  stream_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  captured_at: string;
}
export interface Origin {
  origin_kind:
    | "direct_edit"
    | "evidence_extraction"
    | "work_result"
    | "interaction"
    | "history_reversal";
  /**
   * @minItems 1
   * @maxItems 100
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_refs: [string, ...string[]];
  summary: string;
}
export interface ReturnContext {
  place:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "profile_tool";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_ref?: string;
  label: string;
}
export interface ReviewMember {
  review_member_id: string & string;
  member_role: "ordinary" | "exception";
  working_state: WorkingStateBinding;
  /**
   * @minItems 1
   * @maxItems 100
   */
  candidate_bindings: [CandidateBinding, ...CandidateBinding[]];
}
export interface WorkingStateBinding {
  candidate_ref: WorkingCandidateRef;
  /**
   * @minItems 1
   * @maxItems 100
   */
  relationship_refs: [WorkingRelationshipRef, ...WorkingRelationshipRef[]];
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
export interface WorkingRelationshipRef {
  working_relationship_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CandidateBinding {
  semantic_key: string;
  binding_role: "candidate" | "relationship" | "finding";
  record_ref: ExactRecordRef;
}
export interface ExactRecordRef {
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
export interface ReviewViewContent {
  session: SessionSummary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember1, ...ReviewMember1[]];
  authority: AuthorityPosition;
  projection: UnavailableProjection | AvailableProjection;
}
/**
 * The exact canonical ReviewSession record position and its separately derived display summary. Lifecycle does not imply that a transition is eligible or authorized.
 */
export interface SessionSummary {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * The lifecycle stored on this exact ReviewSession revision. It is not an operation descriptor or an authority grant.
   */
  lifecycle: "open" | "deferred" | "completed";
  title: string;
  objective_summary: string;
  objective?: ObjectiveSummary;
  status: "needs_decision" | "waiting" | "completed";
  status_label: string;
  responsible: {
    /**
     * A Petra identifier whose kind is actor.
     */
    actor_id: string;
    display_name: string;
  };
  project_definition_ref: DefinitionRef1;
  project_definition_label: string;
  snapshot: ProjectSnapshot1;
  snapshot_state: "current" | "stale";
  origin: OriginSummary;
  return_context: ReturnContext1;
}
export interface ObjectiveSummary {
  objective_ref: ExactRef;
  objective_kind: string;
  statement: string;
}
export interface ExactRef {
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
  content_hash: string;
}
export interface DefinitionRef1 {
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ProjectSnapshot1 {
  event_position: number;
  stream_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  captured_at: string;
}
export interface OriginSummary {
  origin_kind:
    | "direct_edit"
    | "evidence_extraction"
    | "work_result"
    | "interaction"
    | "history_reversal";
  /**
   * @minItems 1
   * @maxItems 100
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_refs: [string, ...string[]];
  label: string;
  detail: string;
}
export interface ReturnContext1 {
  place:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "profile_tool";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_ref?: string;
  label: string;
}
export interface ReviewMember1 {
  review_member_id: string;
  member_role: "ordinary" | "exception";
  outcome:
    "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
  candidate: Candidate;
  working_state: WorkingState;
  basis: Basis;
  validation: ValidationSummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  consequences: [string, ...string[]];
  /**
   * @maxItems 100
   */
  change_sets: ChangeSetSummary[];
}
export interface Candidate {
  candidate_id: string;
  revision_label: string;
  kind_label: string;
  current: string;
  proposed: string;
  difference: string;
  origin_label: string;
  origin_detail: string;
  profile_payload: ScientificEvidencePayload;
}
export interface ScientificEvidencePayload {
  payload_kind: "scientific_evidence_pair";
  claim_ref: ExactRecordRef1;
  assertion_ref: ExactRecordRef1;
  claim_kind:
    | "descriptive"
    | "comparative"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "theoretical"
    | "measurement";
  assertion_predicate: "ASSERTS";
  /**
   * @maxItems 100
   */
  scope_dimensions: string[];
}
export interface ExactRecordRef1 {
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
export interface WorkingState {
  candidate: PetraWorkingCandidate;
  /**
   * @minItems 1
   * @maxItems 100
   */
  relationships: [PetraWorkingRelationship, ...PetraWorkingRelationship[]];
  selection_basis: "exact_review_session_working_bindings";
  authority_effect: "none";
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
  actor: HumanActorRef2;
  contribution_kind: "direct_edit" | "human_extraction";
}
export interface HumanActorRef2 {
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
export interface Origin1 {
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
export interface AuthorityBoundary {
  domain_authority: false;
  review_decision: false;
  mutation_authority: false;
  validation_grants_authority: false;
  promotion_requires_review: true;
}
export interface ProfileRegistration1 {
  registration_kind: "relationship_schema";
  semantic_key: string;
  contract: NamedVersionHash;
}
export interface RelationshipEndpoints {
  subject: ProfileRecordEndpoint | WorkingCandidateEndpoint | LiteralEndpoint;
  object: ProfileRecordEndpoint | WorkingCandidateEndpoint | LiteralEndpoint;
}
export interface ProfileRecordEndpoint {
  endpoint_kind: "profile_record";
  record_ref: ExactTypedRecordRef;
}
export interface WorkingCandidateEndpoint {
  endpoint_kind: "working_candidate";
  candidate_ref: WorkingCandidateRef;
}
export interface LiteralEndpoint {
  endpoint_kind: "literal";
  literal_type: "string" | "boolean" | "integer" | "decimal" | "timestamp";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  value_hash: string;
}
export interface RootLineage1 {
  lineage_kind: "root";
}
export interface SupersessionLineage1 {
  lineage_kind: "supersession";
  supersedes: WorkingRelationshipRef;
  change_kind:
    | "mechanical_correction"
    | "basis_revision"
    | "material_revision"
    | "withdrawal";
  reason: string;
}
export interface BasisItem1 {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  basis_id: string;
  label: string;
  relation: string;
  extent: string;
  detail: string;
  project_source_id?: string;
  project_source_status?: "active" | "excluded";
  source_span_ref?: ExactRecordRef1;
}
export interface ValidationSummary {
  state: "passed" | "needs_judgment" | "blocked";
  label: string;
  detail: string;
  recovery?: string;
}
export interface ChangeSetSummary {
  change_set_ref: ExactRef;
  state: "submitted" | "approved" | "rejected" | "applied" | "conflicted";
  atomicity: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  changes: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 100
   */
  protected: [string, ...string[]];
  impact_summary: string;
  approval_ref?: ExactRecordRef1;
  /**
   * @maxItems 100
   */
  commands: CommandTrace[];
  /**
   * @maxItems 100
   */
  events: EventTrace[];
}
export interface CommandTrace {
  command_id: string;
  command_name: "SubmitChangeSet" | "RecordApproval" | "ApplyChangeSet";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  outcome: "success" | "failure";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  error_code?: string;
  error_message?: string;
}
export interface EventTrace {
  event_id: string;
  event_type:
    | "change_set.submitted"
    | "approval.recorded"
    | "change_set.applied"
    | "change_set.conflicted";
  event_position: number;
  stream_revision: number;
  command_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface UnavailableProjection {
  state: "unavailable";
  reason: string;
}
export interface AvailableProjection {
  state: "current" | "catching_up" | "blocked";
  checkpoint_ref: ExactRef;
  represented_event_position: number;
  represented_stream_revision: number;
  represented_target_sequence: number;
  observed_event_position: number;
  observed_stream_revision: number;
  observed_target_sequence: number;
  pending_records: number;
  failure_code?: string;
}
export interface AtomicGroup {
  change_set: PetraChangeSet | PetraChangeSetV110;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  state: "submitted" | "approved" | "rejected" | "applied" | "conflicted";
  /**
   * @minItems 1
   * @maxItems 100
   */
  member_ids: [string, ...string[]];
  operation_count: number;
  coverage: "complete";
  /**
   * @minItems 1
   * @maxItems 100
   */
  member_outcomes: [
    {
      review_member_id: string;
      review_outcome:
        "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
    },
    ...{
      review_member_id: string;
      review_outcome:
        "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
    }[],
  ];
  effect: "applied" | "no_effect" | "unknown";
  effect_basis: string;
  next_step:
    "inspect" | "return_to_review" | "refresh_or_revise" | "reconcile_status";
  /**
   * @minItems 0
   * @maxItems 10000
   */
  approvals: PetraApproval[];
  /**
   * @minItems 0
   * @maxItems 10000
   */
  commands: CommandObservation[];
  /**
   * @minItems 0
   * @maxItems 10000
   */
  events: EventTrace[];
  history_assessment?: {
    event_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
    content: RecoveryAssessmentContent;
  };
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
  content: ChangeSetContent1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
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
export interface CommandObservation {
  trace: CommandTrace;
  receipt_owner: "petra.command_executions";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  receipt_hash: string;
  receipt_state: "success" | "failure";
  idempotency_key: string;
}
export interface RecoveryAssessmentContent {
  view_kind: "change_set_recovery_assessment";
  authorization_scope: "authenticated_project";
  selected_event: RecentChange;
  recovery_subject: RecoverySubject;
  command_authority: CommandAuthority;
  causal_impact_basis: CausalImpactBasis;
  assessment:
    EligibleAssessment | BlockedAssessment | AlreadyCompensatedAssessment;
  decision_boundary: DecisionBoundary;
  authority: AuthorityPosition1;
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
    GrantedCommand | DeniedCommand,
    GrantedCommand | DeniedCommand,
    GrantedCommand | DeniedCommand,
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
export interface AuthorityPosition1 {
  isolation: "repeatable_read";
  through_event_position: number;
  through_stream_revision: number;
}
export interface PreservationItem {
  kind:
    | "review"
    | "working_candidate"
    | "working_relationship"
    | "candidate"
    | "basis"
    | "validation"
    | "approval"
    | "command"
    | "receipt"
    | "prior_authority"
    | "projection"
    | "task"
    | "return_context";
  state: "verified" | "unavailable" | "unverified";
  /**
   * @minItems 0
   * @maxItems 10000
   */
  record_ids: string[];
  /**
   * @minItems 0
   * @maxItems 10000
   *
   * Items: A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hashes: string[];
  detail: string;
}
/**
 * An exact human request to reject the complete ChangeSet previewed by one rejection checkpoint. Actor and command grants remain server-owned.
 */
export interface PetraReviewSessionRejectRequest {
  schema_name: "petra.review-session-reject-request";
  schema_version: "1.0.0";
  checkpoint: PetraReviewSessionRejectCheckpoint;
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  decided_at: string;
}
/**
 * A read-only exact human rejection preview. Rejection records a rejected Approval for the complete proposed ChangeSet; it does not apply the candidate or mutate its source records.
 */
export interface PetraReviewSessionRejectCheckpoint {
  schema_name: "petra.review-session-reject-checkpoint";
  schema_version: "1.0.0";
  binding: {
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    review_session: PetraReviewSessionV110;
    selected_review_member: Items;
    /**
     * @minItems 1
     * @maxItems 10000
     */
    atomic_member_ids: [string, ...string[]];
    change_set: PetraChangeSet;
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    prepared_at: string;
    authorization_basis: {
      kind: "authenticated_human_checkpoint";
      decision: "reject";
      actor: {
        /**
         * A Petra identifier whose kind is actor.
         */
        actor_id: string;
        actor_kind: "human";
      };
    };
    capability_grants: {
      SubmitChangeSet: string;
      RecordApproval: string;
    };
    scope: "one_complete_change_set";
    /**
     * @minItems 1
     * @maxItems 100
     */
    consequences: [string, ...string[]];
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  displayed_commitment_hash: string;
}
export interface Items {
  review_member_id: string;
  candidate: Candidate;
  working_state: WorkingState;
  basis: Basis;
}
