/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An exact idempotent request to manage one Project WorkUnit. Actor and capability authority are resolved by the authenticated server.
 */
export type PetraProjectWorkOperationRequest = {
  schema_name: "petra.project-work-operation-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  operation:
    "start" | "answer_input" | "steer" | "prioritize" | "cancel" | "retry";
  expected_work_unit_ref: WorkUnitRef;
  input_request_ref?: InputRequestRef;
  response?: string;
  expected_plan_revision?: number;
  instruction?: string;
  priority?: "user_blocking" | "user_visible" | "normal" | "opportunistic";
  reason?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
};
/**
 * An additive Project-scoped working revision that binds one exact profile-registered object record to its producer, task, input snapshot, basis, provenance, qualifications, and validation. It is durable working state and never domain authority.
 */
export type PetraWorkingCandidate = {
  schema_name: "petra.working-candidate";
  schema_version: "1.0.0";
  working_candidate_id: string & string;
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
} & {
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
} & {
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

/**
 * An immutable explicit human choice over one retained proposed-only command. This record grants no capability or domain authority; the existing ordinary command owner must separately authorize and execute its exact request. Observed receipts are retained separately.
 */
export interface PetraCopilotHumanCommandDecision {
  schema_name: "petra.copilot-human-command-decision";
  schema_version: "1.0.0";
  decision_id: string;
  proposal_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  proposal_output_hash: string;
  preview_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  preview_hash: string;
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  decision: "accept" | "reject";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  decided_at: string;
  command: {
    preview: {
      key: string;
      kind: "command";
      operation_id:
        | "work.start"
        | "work.answer-input"
        | "work.steer"
        | "work.prioritize"
        | "work.cancel"
        | "work.retry"
        | "work.resume"
        | "work.start-again"
        | "brief.suggested-invoke"
        | "source.start-processing"
        | "review.apply";
      /**
       * A Petra identifier whose kind is project.
       */
      project_id: string;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      context_hash: string;
      contract: {
        name:
          | "project-work-operation-request"
          | "project-work-resume-request"
          | "project-work-start-again-request"
          | "suggested-action-invocation-request"
          | "project-source-processing-request"
          | "review-session-apply-checkpoint";
        version: "1.0.0";
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        hash: string;
      };
      payload:
        | PetraProjectWorkOperationRequest
        | PetraProjectWorkResumeRequest
        | PetraProjectWorkStartAgainRequest
        | PetraSuggestedActionInvocationRequest
        | PetraProjectSourceProcessingRequest
        | PetraReviewSessionApplyCheckpoint;
      /**
       * @maxItems 0
       */
      editable_paths: [];
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      preview_hash: string;
    };
    ordinary_command: {
      operation_id:
        | "work.start"
        | "work.answer-input"
        | "work.steer"
        | "work.prioritize"
        | "work.cancel"
        | "work.retry"
        | "work.resume"
        | "work.start-again"
        | "brief.suggested-invoke"
        | "source.start-processing"
        | "review.apply";
      command_name:
        | "ManageProjectWork"
        | "InvokeSuggestedAction"
        | "StartProjectSourceProcessing"
        | "ApplyChangeSet";
      method: "POST";
      path: string;
      requires_human_decision: true;
    };
  };
  request:
    | PetraProjectWorkOperationRequest
    | PetraProjectWorkResumeRequest
    | PetraProjectWorkStartAgainRequest
    | PetraSuggestedActionInvocationRequest
    | PetraProjectSourceProcessingRequest
    | PetraReviewSessionApplyRequest;
}
export interface WorkUnitRef {
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
}
export interface InputRequestRef {
  input_request_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
}
/**
 * An exact idempotent request to continue one checkpointed WorkUnit through a server-registered compatible transition. Actor and capability authority are resolved by the authenticated server.
 */
export interface PetraProjectWorkResumeRequest {
  schema_name: "petra.project-work-resume-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected_work_unit_ref: WorkUnitRef;
  expected_checkpoint: CheckpointRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
}
export interface CheckpointRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
/**
 * An exact idempotent request to begin a separately registered fresh-input Work attempt linked to retained prior Work. Actor, capability, replacement Work, and input choice are server-owned.
 */
export interface PetraProjectWorkStartAgainRequest {
  schema_name: "petra.project-work-start-again-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected_prior_work_unit_ref: WorkUnitRef;
  start_again_registration_ref: StartAgainRegistrationRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
}
export interface StartAgainRegistrationRef {
  start_again_registration_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
/**
 * The client-supplied portion of one exact idempotent SuggestedAction invocation. Actor, grant, Project, Work, interaction, and trace identities remain server-owned.
 */
export interface PetraSuggestedActionInvocationRequest {
  schema_name: "petra.suggested-action-invocation-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  inquiry_result_link_id: string;
  expected_action_ref: SuggestedActionRef;
  response_depth: "current_graph";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
/**
 * A reviewed request to create and start one bounded processing WorkUnit from an exact current ProjectSource. Actor, grant, Work identity, worker configuration, limits, and timestamps are server-owned.
 */
export interface PetraProjectSourceProcessingRequest {
  schema_name: "petra.project-source-processing-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected: Expected;
}
export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  project_source_ref: ProjectSourceRef;
  source_role: string;
  processing_family_ref: ProcessingFamilyRef;
}
export interface ProjectRef {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ProjectSourceRef {
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
export interface ProcessingFamilyRef {
  semantic_key: "petra.source-processing";
  contract: {
    name: "petra.document.parse";
    version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
  };
}
export interface PetraReviewSessionApplyCheckpoint {
  schema_name: "petra.review-session-apply-checkpoint";
  schema_version: "1.0.0";
  binding: {
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    review_session: PetraReviewSessionV110;
    project_definition: PetraProjectDefinition;
    selected_review_member_id: string;
    /**
     * @minItems 1
     * @maxItems 10000
     */
    atomic_member_ids: [string, ...string[]];
    /**
     * @minItems 1
     * @maxItems 10000
     */
    members: [
      {
        review_member_id: string;
        candidate: Candidate;
        working_state: WorkingState;
        basis: Basis;
      },
      ...{
        review_member_id: string;
        candidate: Candidate;
        working_state: WorkingState;
        basis: Basis;
      }[],
    ];
    claim: PetraClaim;
    assertion: PetraAssertion;
    /**
     * @minItems 1
     * @maxItems 10000
     */
    sources: [PetraProjectSource, ...PetraProjectSource[]];
    change_set: PetraChangeSet;
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    prepared_at: string;
    authorization_basis: {
      kind: "authenticated_human_checkpoint";
      decision: "apply";
      actor: {
        /**
         * A Petra identifier whose kind is actor.
         */
        actor_id: string;
        actor_kind: "human";
      };
    };
    review_policy: {
      applicability: "not_applicable";
    };
    capability_grants: {
      SubmitChangeSet: string;
      RecordApproval: string;
      ApplyChangeSet: string;
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
  project_definition_ref: DefinitionRef1;
  content: SessionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: HumanActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface DefinitionRef1 {
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
  responsible: HumanActorRef;
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
export interface HumanActorRef {
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
  working_candidate_id: string & string;
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
/**
 * An immutable Project-owned semantic definition revision. Reusable templates may seed it but never remain a mutable dependency.
 */
export interface PetraProjectDefinition {
  schema_name: "petra.project-definition";
  schema_version: "1.0.0";
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  definition_family: string;
  origin:
    | {
        origin_kind: "project_authored";
      }
    | {
        origin_kind: "template_seed";
        template_id: string;
        template_version: string;
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        template_hash: string;
      };
  content: DefinitionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface DefinitionContent {
  label: string;
  description: string;
  kernel_compatibility: "petra.project-kernel@1.0.0";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  registrations: [Registration, ...Registration[]];
  /**
   * @minItems 3
   * @maxItems 1000
   */
  terms: [Term, Term, Term, ...Term[]];
  /**
   * @minItems 1
   */
  supported_places: [
    (
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "settings"
      | "profile_tool"
    ),
    ...(
      | "brief"
      | "sources"
      | "review"
      | "graph"
      | "work"
      | "petra"
      | "composition"
      | "history"
      | "settings"
      | "profile_tool"
    )[],
  ];
  /**
   * @maxItems 100
   */
  omitted_flows: string[];
}
export interface Registration {
  registration_kind:
    | "objective_schema"
    | "object_schema"
    | "relationship_schema"
    | "source_role"
    | "workflow"
    | "validator"
    | "output"
    | "terminology"
    | "presentation_descriptor"
    | "model_context"
    | "prompt"
    | "tool"
    | "model_role"
    | "extension";
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
export interface Term {
  semantic_key: string;
  singular: string;
  plural: string;
  definition: string;
  generic_family:
    | "focus"
    | "finding"
    | "reference"
    | "relationship"
    | "task"
    | "output"
    | "other";
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
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
  contract: NamedVersionHash1;
}
export interface NamedVersionHash1 {
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
  service_role_ref: NamedVersionHash1;
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
  model_role_ref: NamedVersionHash1;
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
  validator_ref: NamedVersionHash1;
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
  contract: NamedVersionHash1;
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
/**
 * A provenance-bearing typed relation whose authority records representation review rather than scientific truth.
 */
export interface PetraAssertion {
  schema_name: "petra.assertion";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is assertion.
   */
  assertion_id: string;
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
  supersedes_assertion_id?: string;
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
  artifact_id: string;
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
  assertion_id: string;
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
/**
 * The M1 scholarly specialization: an immutable revision binding one Project to an exact scientific WorkVersion and copy under one ProjectDefinition source role.
 */
export interface PetraProjectSource {
  schema_name: "petra.project-source";
  schema_version: "1.0.0";
  project_source_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ProjectSourceContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  added_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  added_at: string;
}
export interface ProjectSourceContent {
  binding_kind: "scientific_work_version";
  project_definition_ref: DefinitionRef2;
  source_role: string;
  work_ref: WorkRef;
  work_version_ref: WorkVersionRef;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  author_refs: [AuthorRef, ...AuthorRef[]];
  artifact_manifest_ref: ArtifactManifestRef;
  status: "active" | "excluded";
}
export interface DefinitionRef2 {
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
export interface WorkRef {
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkVersionRef {
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface AuthorRef {
  /**
   * A Petra identifier whose kind is author.
   */
  author_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ArtifactManifestRef {
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  artifact_manifest_id: string & string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
export interface PetraReviewSessionApplyRequest {
  schema_name: "petra.review-session-apply-request";
  schema_version: "1.0.0";
  checkpoint: PetraReviewSessionApplyCheckpoint;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  decided_at: string;
}
