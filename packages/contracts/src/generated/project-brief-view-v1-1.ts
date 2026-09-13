/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ProjectionSummary = {
  state: "current" | "catching_up" | "blocked" | "unavailable";
  label: string;
  detail: string;
  checkpoint_ref?: ExactRef;
  represented_event_position: number;
  observed_event_position: number;
  pending_records: number;
  failure_code?: string;
};
export type Destination = {
  role:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "settings"
    | "profile_tool";
  purpose: string;
  target_ref?: ExactObjectRef;
  profile_tool_key?: string;
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
  origin: Origin;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis: [BasisItem1, ...BasisItem1[]];
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
  origin: Origin;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis: [BasisItem1, ...BasisItem1[]];
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
  origin: Origin;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis: [BasisItem1, ...BasisItem1[]];
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
export type Page = {
  returned_count: number;
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
};
export type RepresentationSummary = {
  extent: "identity_only" | "partial" | "complete" | "restricted";
  extent_label: string;
  document_ref?: ExactRef2;
  source_format?:
    "pdf" | "html" | "xml" | "json" | "plain_text" | "code" | "image" | "other";
  document_language?: string;
  quality_state?: "complete" | "partial" | "needs_ocr" | "failed";
  page_count: number;
  block_count: number;
  source_span_count: number;
  preview?: Preview;
};
/**
 * @maxItems 100
 */
export type Limitations = string[];

export interface PetraProjectBriefView {
  schema_name: "petra.project-brief-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ProjectBriefContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  snapshot_hash: string;
}
export interface ProjectBriefContent {
  shell: PetraProjectShellViewV11;
  definition: PetraProjectDefinition;
  objective: PetraProjectObjective;
  orientation: {
    statement: string;
    basis: "exact_current_objective";
  };
  section_order: [
    "current_focus",
    "attention",
    "comparison",
    "current_state",
    "work",
    "next_steps",
    "recent_decisions",
  ];
  /**
   * @maxItems 41
   */
  attention: {
    item_id: string;
    owner: "shell" | "review" | "work";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    owner_content_hash: string;
    consequence_class:
      "integrity" | "review_decision" | "work_interruption" | "projection_lag";
    reason: string;
    resolution: "inspect_canonical_owner";
    deferral: "preserves_underlying_condition";
    acknowledgment: "client_local";
  }[];
  /**
   * @maxItems 20
   */
  reviews:
    | []
    | [
        | PetraProjectReviewView
        | PetraProjectReviewViewV110
        | PetraProjectReviewViewV120,
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ]
    | [
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
        (
          | PetraProjectReviewView
          | PetraProjectReviewViewV110
          | PetraProjectReviewViewV120
        ),
      ];
  /**
   * @maxItems 20
   */
  work:
    | []
    | [PetraProjectWorkView]
    | [PetraProjectWorkView, PetraProjectWorkView]
    | [PetraProjectWorkView, PetraProjectWorkView, PetraProjectWorkView]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ]
    | [
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
        PetraProjectWorkView,
      ];
  /**
   * @maxItems 20
   */
  next_steps:
    | []
    | [PetraSuggestedActionView]
    | [PetraSuggestedActionView, PetraSuggestedActionView]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ]
    | [
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
        PetraSuggestedActionView,
      ];
  recent_decisions: PetraProjectHistoryView;
  comparison:
    | {
        state: "current_only";
        reason: string;
      }
    | {
        state: "recent_history_interval";
        baseline: EventRef;
        through: AuthorityPosition4;
        /**
         * @maxItems 10
         */
        changes:
          | []
          | [RecentChange]
          | [RecentChange, RecentChange]
          | [RecentChange, RecentChange, RecentChange]
          | [RecentChange, RecentChange, RecentChange, RecentChange]
          | [
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
            ]
          | [
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
            ]
          | [
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
            ]
          | [
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
            ]
          | [
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
            ]
          | [
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
              RecentChange,
            ];
        limitation: string;
      };
  profile_payload: PetraResearchBriefPayload;
  coverage: {
    state: "partial";
    /**
     * @minItems 1
     */
    limitations: [string, ...string[]];
  };
  /**
   * @maxItems 20
   */
  inquiry_links:
    | []
    | [PetraProjectInquiryLink]
    | [PetraProjectInquiryLink, PetraProjectInquiryLink]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ]
    | [
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
        PetraProjectInquiryLink,
      ];
  profile_registration: Registration;
}
/**
 * A read-only, snapshot-consistent Project shell composition with honest place summaries and optional exact semantic selection.
 */
export interface PetraProjectShellViewV11 {
  schema_name: "petra.project-shell-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ShellContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ShellContent {
  project: ProjectSummary;
  definition: DefinitionSummary;
  current_objective?: ObjectiveSummary;
  authority: AuthorityPosition;
  projection: ProjectionSummary;
  /**
   * @maxItems 100
   */
  attention: AttentionItem[];
  /**
   * @minItems 1
   * @maxItems 10
   */
  place_summaries:
    | [AvailablePlaceSummary | UnavailablePlaceSummary]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ]
    | [
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
        AvailablePlaceSummary | UnavailablePlaceSummary,
      ];
  selection?: LocationContent;
}
export interface ProjectSummary {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  name: string;
  description?: string;
  status: "active" | "archived";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface DefinitionSummary {
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
  label: string;
  description: string;
  kernel_compatibility: "petra.project-kernel@1.0.0";
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
export interface ObjectiveSummary {
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  objective_kind: string;
  statement: string;
  status: "active" | "satisfied" | "superseded" | "abandoned";
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
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
export interface AttentionItem {
  attention_id: string;
  attention_kind: "projection_catching_up" | "projection_blocked";
  title: string;
  summary: string;
  consequence: string;
  recommendation: string;
}
export interface AvailablePlaceSummary {
  role:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "settings"
    | "profile_tool";
  coverage: "complete" | "partial";
  label: string;
  summary: string;
  item_count?: number;
  attention_count: number;
  limitation?: string;
}
export interface UnavailablePlaceSummary {
  role:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "settings"
    | "profile_tool";
  coverage: "unavailable";
  label: string;
  summary: string;
  attention_count: 0;
  limitation: string;
}
export interface LocationContent {
  request: LocationRequest;
  definition_ref: DefinitionRef;
  resolution: ResolvedLocation | UnavailableLocation;
  primary_destination: Destination;
  /**
   * @maxItems 16
   */
  alternate_destinations:
    | []
    | [Destination]
    | [Destination, Destination]
    | [Destination, Destination, Destination]
    | [Destination, Destination, Destination, Destination]
    | [Destination, Destination, Destination, Destination, Destination]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ];
  fallback_destination?: Destination;
  context: LocationContext;
  authority: AuthorityPosition;
  projection: ProjectionSummary;
}
export interface LocationRequest {
  object_ref: RequestedObjectRef;
  task_intent:
    | "orient"
    | "inspect"
    | "trace"
    | "review"
    | "continue_work"
    | "view_history";
}
export interface RequestedObjectRef {
  semantic_key: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision?: number;
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
  definition_family: string;
}
export interface ResolvedLocation {
  state: "current" | "historical" | "superseded";
  requested_ref: RequestedObjectRef;
  resolved_ref: ExactObjectRef;
  current_ref: ExactObjectRef;
  descriptor: ObjectDescriptor;
  parent_ref?: ExactObjectRef;
  /**
   * @maxItems 32
   */
  replacement_chain: ExactObjectRef[];
}
export interface ExactObjectRef {
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
  record_hash: string;
}
export interface ObjectDescriptor {
  semantic_key: string;
  generic_family:
    | "focus"
    | "finding"
    | "reference"
    | "relationship"
    | "task"
    | "output"
    | "other";
  label: string;
  summary: string;
  lifecycle_state: string;
}
export interface UnavailableLocation {
  state: "missing" | "unauthorized" | "unsupported";
  requested_ref: RequestedObjectRef;
  failure: {
    code: string;
    message: string;
  };
}
export interface LocationContext {
  details_allowed: boolean;
  petra_allowed: boolean;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
/**
 * A versioned Project objective interpreted under one exact ProjectDefinition revision.
 */
export interface PetraProjectObjective {
  schema_name: "petra.project-objective";
  schema_version: "1.0.0";
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: {
    project_definition_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
  };
  content: ObjectiveContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface ObjectiveContent {
  objective_kind: string;
  statement: string;
  status: "active" | "satisfied" | "superseded" | "abandoned";
  parent_ref?: ObjectiveRef;
  /**
   * @maxItems 1000
   */
  dependency_refs: ObjectiveRef[];
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
/**
 * A read-only, snapshot-consistent Review-session composition. Version 1.0 renders the existing scientific Claim-Assertion path inside shared Review roles.
 */
export interface PetraProjectReviewView {
  schema_name: "petra.project-review-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  review_session_id: string;
  content: ReviewViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ReviewViewContent {
  session: SessionSummary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember, ...ReviewMember[]];
  authority: AuthorityPosition1;
}
export interface SessionSummary {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  title: string;
  objective_summary: string;
  objective?: ObjectiveSummary1;
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
  snapshot: ProjectSnapshot;
  snapshot_state: "current" | "stale";
  origin: OriginSummary;
  return_context: ReturnContext;
}
export interface ObjectiveSummary1 {
  objective_ref: ExactRef1;
  objective_kind: string;
  statement: string;
}
export interface ExactRef1 {
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
  record_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ProjectSnapshot {
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
  review_member_id: string;
  member_role: "ordinary" | "exception";
  outcome:
    "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
  candidate: CandidateSummary;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  basis: [BasisItem, ...BasisItem[]];
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
export interface CandidateSummary {
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
  claim_ref: ExactRecordRef;
  assertion_ref: ExactRecordRef;
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
export interface BasisItem {
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
  source_span_ref?: ExactRecordRef;
}
export interface ValidationSummary {
  state: "passed" | "needs_judgment" | "blocked";
  label: string;
  detail: string;
  recovery?: string;
}
export interface ChangeSetSummary {
  change_set_ref: ExactRef1;
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
  approval_ref?: ExactRecordRef;
}
export interface AuthorityPosition1 {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
/**
 * A read-only, snapshot-consistent Review-session composition over exact canonical working records and the existing scientific ChangeSet authority path. It preserves command, event, Approval, and graph-projection receipts without granting authority.
 */
export interface PetraProjectReviewViewV110 {
  schema_name: "petra.project-review-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  review_session_id: string;
  content: ReviewViewContent1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ReviewViewContent1 {
  session: SessionSummary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember1, ...ReviewMember1[]];
  authority: AuthorityPosition1;
  projection: UnavailableProjection | AvailableProjection;
}
export interface ReviewMember1 {
  review_member_id: string;
  member_role: "ordinary" | "exception";
  outcome:
    "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
  candidate: CandidateSummary;
  working_state: WorkingStateComposition;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  basis: [BasisItem, ...BasisItem[]];
  validation: ValidationSummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  consequences: [string, ...string[]];
  /**
   * @maxItems 100
   */
  change_sets: ChangeSetSummary1[];
}
export interface WorkingStateComposition {
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
  actor: HumanActorRef;
  contribution_kind: "direct_edit" | "human_extraction";
}
export interface HumanActorRef {
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
export interface BasisItem1 {
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
export interface ChangeSetSummary1 {
  change_set_ref: ExactRef1;
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
  approval_ref?: ExactRecordRef;
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
export interface UnavailableProjection {
  state: "unavailable";
  reason: string;
}
export interface AvailableProjection {
  state: "current" | "catching_up" | "blocked";
  checkpoint_ref: ExactRef1;
  represented_event_position: number;
  represented_stream_revision: number;
  represented_target_sequence: number;
  observed_event_position: number;
  observed_stream_revision: number;
  observed_target_sequence: number;
  pending_records: number;
  failure_code?: string;
}
/**
 * An additive Review read that preserves the 1.1 canonical composition and exposes the exact stored ReviewSession lifecycle beside its revision and content hash. Lifecycle is coordination state only; it does not express command eligibility, validation force, Review decision, completion, or mutation authority.
 */
export interface PetraProjectReviewViewV120 {
  schema_name: "petra.project-review-view";
  schema_version: "1.2.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  review_session_id: string;
  content: ReviewViewContent2;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ReviewViewContent2 {
  session: SessionSummary1;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember1, ...ReviewMember1[]];
  authority: AuthorityPosition1;
  projection: UnavailableProjection | AvailableProjection;
}
/**
 * The exact canonical ReviewSession record position and its separately derived display summary. Lifecycle does not imply that a transition is eligible or authorized.
 */
export interface SessionSummary1 {
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
  objective?: ObjectiveSummary1;
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
  snapshot: ProjectSnapshot;
  snapshot_state: "current" | "stale";
  origin: OriginSummary;
  return_context: ReturnContext;
}
/**
 * A read-only, snapshot-consistent Project Work collection or exact WorkUnit detail composed from existing operational authority.
 */
export interface PetraProjectWorkView {
  schema_name: "petra.project-work-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: CollectionContent | DetailContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface CollectionContent {
  view_kind: "collection";
  project_definition_ref: DefinitionRef2;
  query: CollectionQuery;
  /**
   * @maxItems 100
   */
  tasks: TaskSummary[];
  page: Page;
  authority: AuthorityPosition2;
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
  definition_family: string;
}
export interface CollectionQuery {
  limit: number;
  cursor?: string;
  state?:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
}
export interface TaskSummary {
  work_unit_ref: WorkUnitRef;
  task_label: string;
  objective: string;
  work_mode: "interactive" | "foreground" | "background" | "batch";
  priority: "user_blocking" | "user_visible" | "normal" | "opportunistic";
  workflow: WorkflowSummary;
  execution: ExecutionSummary;
  attention: AttentionSummary;
  elapsed:
    | {
        state: "measured";
        milliseconds: number;
        basis: "start_to_observation" | "start_to_terminal";
      }
    | {
        state: "unavailable";
        reason: string;
      };
  resource_coverage: "limits_only" | "measured";
  reported_output_count: number;
  stage_plan: {
    state: "unavailable";
    reason: string;
  };
  destination: {
    role: "work";
    target_ref: WorkUnitRef;
  };
}
export interface WorkUnitRef {
  work_unit_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkflowSummary {
  workflow_name: string;
  workflow_version: string;
  task_family:
    | "ingestion"
    | "document_processing"
    | "scientific_extraction"
    | "retrieval"
    | "reasoning"
    | "scientific_computation"
    | "experiment_execution"
    | "projection"
    | "maintenance";
  task_name: string;
  task_version: string;
}
export interface ExecutionSummary {
  state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  terminal_outcome?:
    | "succeeded"
    | "worker_failed"
    | "validation_failed"
    | "resource_exhausted"
    | "timed_out"
    | "cancelled";
  attempt: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  queued_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  finished_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
  failure?: Failure;
}
export interface Failure {
  code: string;
  message: string;
  retryable: boolean;
}
export interface AttentionSummary {
  state: "needs_attention" | "active" | "settled";
  reason_code:
    | "requested"
    | "queued"
    | "running"
    | "retryable_failure"
    | "terminal_failure"
    | "completed"
    | "cancelled";
  reason: string;
}
export interface AuthorityPosition2 {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface DetailContent {
  view_kind: "detail";
  project_definition_ref: DefinitionRef2;
  summary: TaskSummary;
  specification: SpecificationSummary;
  /**
   * @maxItems 10000
   */
  dependencies: DependencySummary[];
  stage_plan: {
    state: "unavailable";
    reason: string;
  };
  resources: ResourceSummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  outputs: [
    ReportedOutput | UnreportedOutput,
    ...(ReportedOutput | UnreportedOutput)[],
  ];
  /**
   * @minItems 3
   * @maxItems 3
   */
  controls: [ControlSummary, ControlSummary, ControlSummary];
  inquiry_linkage: UnavailableLinkage;
  review: UnavailableLinkage;
  semantic_location: LocationContent;
  /**
   * @minItems 1
   * @maxItems 11
   */
  coverage:
    | [CoverageItem]
    | [CoverageItem, CoverageItem]
    | [CoverageItem, CoverageItem, CoverageItem]
    | [CoverageItem, CoverageItem, CoverageItem, CoverageItem]
    | [CoverageItem, CoverageItem, CoverageItem, CoverageItem, CoverageItem]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ];
  authority: AuthorityPosition2;
}
export interface SpecificationSummary {
  input_manifest_ref: ContentRecordRef;
  task: TaskDescriptor;
  worker: WorkerDescriptor;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  inputs: [
    ArtifactInputBinding | RecordInputBinding,
    ...(ArtifactInputBinding | RecordInputBinding)[],
  ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  expected_outputs: [ExpectedOutput, ...ExpectedOutput[]];
  network_policy: BlockedNetwork | AllowlistedNetwork;
  partial_result_policy: "discard" | "retain_declared" | "retain_diagnostics";
  cache_mode: "reuse_exact" | "refresh" | "disabled";
  cancellation_policy: "cancellable" | "checkpoint_then_cancel" | "atomic";
  checkpoint_policy: "disabled" | "latest_valid" | "all_valid";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  deadline_at?: string;
}
export interface ContentRecordRef {
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface TaskDescriptor {
  task_family:
    | "ingestion"
    | "document_processing"
    | "scientific_extraction"
    | "retrieval"
    | "reasoning"
    | "scientific_computation"
    | "experiment_execution"
    | "projection"
    | "maintenance";
  task_name: string;
  task_version: string;
}
export interface WorkerDescriptor {
  executor_kind: "python_worker" | "typescript_worker" | "sandbox";
  worker_name: string;
  worker_version: string;
  runtime_name: string;
  runtime_version: string;
  entrypoint: string;
}
export interface ArtifactInputBinding {
  binding_kind: "artifact";
  name: string;
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
}
export interface RecordInputBinding {
  binding_kind: "record";
  name: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  record_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  snapshot_hash: string;
}
export interface ExpectedOutput {
  output_name: string;
  output_role:
    "result" | "proposal" | "diagnostic" | "log" | "metrics" | "checkpoint";
  required: boolean;
  media_type: string;
  max_bytes: number;
  contract?: ContractRef;
}
export interface ContractRef {
  schema_name: string;
  schema_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface BlockedNetwork {
  network_mode: "blocked";
}
export interface AllowlistedNetwork {
  network_mode: "allowlist";
  /**
   * @minItems 1
   * @maxItems 100
   */
  destinations: [string, ...string[]];
}
export interface DependencySummary {
  work_unit_ref: WorkUnitRef;
  state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  terminal_outcome?:
    | "succeeded"
    | "worker_failed"
    | "validation_failed"
    | "resource_exhausted"
    | "timed_out"
    | "cancelled";
}
export interface ResourceSummary {
  limits: ResourceLimits;
  usage: MeasuredUsage | UnavailableUsage;
}
export interface ResourceLimits {
  max_wall_time_ms: number;
  max_output_bytes: number;
  max_attempts: number;
  max_parallelism: number;
  max_cpu_time_ms?: number;
  max_memory_bytes?: number;
  max_storage_bytes?: number;
  max_network_bytes?: number;
  max_gpu_time_ms?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  monetary_limit?: MonetaryLimit;
}
export interface MonetaryLimit {
  currency: string;
  max_microunits: number;
}
export interface MeasuredUsage {
  state: "measured";
  output_manifest_ref: ContentRecordRef;
  resource_usage: ResourceUsage;
}
export interface ResourceUsage {
  wall_time_ms: number;
  cpu_time_ms: number;
  peak_memory_bytes: number;
  input_bytes: number;
  output_bytes: number;
  network_bytes: number;
  gpu_time_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost?: MeasuredCost;
}
export interface MeasuredCost {
  currency: string;
  microunits: number;
}
export interface UnavailableUsage {
  state: "unavailable";
  reason: string;
}
export interface ReportedOutput {
  declaration: ExpectedOutput;
  report_state: "reported";
  produced_output: ProducedOutput;
  availability: {
    state: "staged_handle_only";
    limitation: string;
  };
}
export interface ProducedOutput {
  output_name: string;
  output_role:
    "result" | "proposal" | "diagnostic" | "log" | "metrics" | "checkpoint";
  output_handle: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
  contract?: ContractRef;
}
export interface UnreportedOutput {
  declaration: ExpectedOutput;
  report_state: "not_reported";
  availability: {
    state: "unavailable";
    limitation: string;
  };
}
export interface ControlSummary {
  control_name: "cancel" | "retry" | "resume";
  policy_state: "permitted" | "forbidden" | "not_applicable" | "unresolved";
  operation_state: "unavailable";
  reason: string;
  consequence: string;
}
export interface UnavailableLinkage {
  state: "unavailable";
  reason: string;
}
export interface CoverageItem {
  area:
    | "identity"
    | "execution"
    | "inputs"
    | "dependencies"
    | "stages"
    | "resources"
    | "outputs"
    | "controls"
    | "inquiries"
    | "review"
    | "recovery";
  state: "complete" | "partial" | "unavailable";
  limitation?: string;
}
/**
 * A Project-scoped, revisioned, read-only SuggestedAction preview derived from one exact immutable inquiry-result link and its retained authority. It does not start Work or change Project authority.
 */
export interface PetraSuggestedActionView {
  schema_name: "petra.suggested-action-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent {
  view_kind: "preview";
  action_ref: SuggestedActionRef;
  action: Action;
  /**
   * Current server-owned readiness for the immutable action revision. Readiness is recomputed and is not part of action_ref.content_hash.
   */
  readiness: Ready | Stale;
  operation: {
    state: "read_only";
    work_start: "not_performed";
    authority_change: "none";
  };
  authority: AuthorityPosition3;
  /**
   * @minItems 1
   * @maxItems 16
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
      ];
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Action {
  action_kind: "inspect_existing_inquiry_result";
  title: string;
  objective: Objective;
  reason: string;
  basis: Basis;
  scope: {
    scope_kind: "exact_existing_result";
    included: string;
    /**
     * @minItems 1
     * @maxItems 8
     */
    excluded:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string];
  };
  /**
   * @maxItems 16
   */
  missing_information:
    | []
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
      ];
  response_depth: {
    /**
     * @minItems 1
     * @maxItems 1
     */
    allowed: ["current_graph"];
    recommended: "current_graph";
    adjustable: false;
  };
  expected_result: {
    state: "already_available";
    result_kind: "grounded_response";
    result_ref: TypedRecordRef;
    authority_effect: "none";
    reusable: boolean;
  };
  resources: {
    duration: "not_required";
    cost: "not_required";
    basis: "read_only_existing_result";
  };
  capability: {
    capability_key: "petra.project-inquiry.read";
    grant_status: "satisfied_by_authenticated_project_read";
    approval: "not_required";
  };
  interrupt: {
    expectation: "none";
  };
  cancellation: {
    consequence: "not_applicable_no_work_started";
  };
  background_work:
    | {
        state: "completed";
        work_unit_ref: WorkUnitRef1;
        terminal_outcome:
          | "succeeded"
          | "worker_failed"
          | "validation_failed"
          | "resource_exhausted"
          | "timed_out"
          | "cancelled";
      }
    | {
        state: "unavailable";
        reason: string;
      };
  invocation: {
    kind: "authenticated_read";
    contract_name: "petra.project-inquiry-view";
    contract_version: "1.0.0";
    operation: "get_project_inquiry_detail";
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    objective_ref: ObjectiveRef1;
    place_role: "brief";
    task_intent: "inspect";
    idempotency: "safe_exact_read";
  };
}
export interface Objective {
  objective_ref: ObjectiveRef1;
  semantic_key: string;
  statement: string;
}
export interface ObjectiveRef1 {
  objective_id: string;
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
export interface Basis {
  derivation: "exact_immutable_inquiry_result_link";
  project_definition_ref: DefinitionRef3;
  inquiry_result_link_ref: InquiryLinkRef;
  result_ref: TypedRecordRef;
  snapshot_ref: SnapshotRef;
  produced_by_work_ref?: WorkUnitRef1;
}
export interface DefinitionRef3 {
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
  definition_family: string;
}
export interface InquiryLinkRef {
  project_inquiry_link_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface TypedRecordRef {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  record_id: string;
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
export interface SnapshotRef {
  snapshot_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  snapshot_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkUnitRef1 {
  work_unit_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface Ready {
  state: "ready";
  reason_code: "exact_existing_result_available";
  reason: string;
  /**
   * @maxItems 0
   */
  missing_prerequisites: [];
}
export interface Stale {
  state: "stale";
  reason_code:
    | "project_definition_changed"
    | "objective_changed"
    | "objective_inactive"
    | "result_invalidated";
  reason: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  missing_prerequisites:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string];
}
export interface AuthorityPosition3 {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
/**
 * An authorized, read-only Project History projection composed from immutable command and event authority, receipts, and current recovery authority. It is not a second ledger and excludes client-local graph navigation history.
 */
export interface PetraProjectHistoryView {
  schema_name: "petra.project-history-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: HistoryContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface HistoryContent {
  view_kind: "recent_changes";
  order: "newest_first";
  quick_window_limit: 10;
  /**
   * @maxItems 10
   */
  changes:
    | []
    | [RecentChange]
    | [RecentChange, RecentChange]
    | [RecentChange, RecentChange, RecentChange]
    | [RecentChange, RecentChange, RecentChange, RecentChange]
    | [RecentChange, RecentChange, RecentChange, RecentChange, RecentChange]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ];
  has_older: boolean;
  authority: AuthorityPosition4;
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
export interface AuthorityPosition4 {
  through_event_position: number;
  through_stream_revision: number;
}
export interface PetraResearchBriefPayload {
  schema_name: "petra.research-brief-payload";
  schema_version: "1.1.0";
  /**
   * @maxItems 20
   */
  sources:
    | []
    | [PetraProjectSourceView]
    | [PetraProjectSourceView, PetraProjectSourceView]
    | [PetraProjectSourceView, PetraProjectSourceView, PetraProjectSourceView]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ]
    | [
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
        PetraProjectSourceView,
      ];
  source_coverage: "complete" | "partial";
  /**
   * @minItems 1
   */
  limitations: [string, ...string[]];
  current_state: {
    /**
     * @maxItems 20
     */
    syntheses:
      | []
      | [RetainedSynthesis]
      | [RetainedSynthesis, RetainedSynthesis]
      | [RetainedSynthesis, RetainedSynthesis, RetainedSynthesis]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ]
      | [
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
          RetainedSynthesis,
        ];
    coverage: {
      scope: "addressing_results_in_returned_current_objective_links";
      state: "complete" | "partial";
      link_limit: 20;
    };
    /**
     * @minItems 1
     */
    limitations: [string, ...string[]];
  };
}
/**
 * A read-only, snapshot-consistent source composition from the M1 scholarly ProjectSource binding and its authority chain.
 */
export interface PetraProjectSourceView {
  schema_name: "petra.project-source-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  content: SourceViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface SourceViewContent {
  binding: BindingSummary;
  identity: IdentitySummary;
  copy: CopySummary;
  rights: RightsSummary;
  representation: RepresentationSummary;
  downstream_use: DownstreamUse;
  authority: AuthorityPosition;
}
export interface BindingSummary {
  binding_kind: "scientific_work_version";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  project_definition_ref: ExactRef2;
  source_role: string;
  source_role_label: string;
  status: "active" | "excluded";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  added_at: string;
}
export interface ExactRef2 {
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
export interface IdentitySummary {
  work_ref: ExactRef2;
  title: string;
  work_kind:
    | "journal_article"
    | "conference_paper"
    | "preprint"
    | "thesis"
    | "book"
    | "chapter"
    | "other";
  identity_status: "resolved" | "provisional" | "disputed";
  work_version_ref: ExactRef2;
  version_label: string;
  publication_status:
    | "preprint"
    | "peer_reviewed"
    | "accepted"
    | "corrected"
    | "retracted"
    | "unknown";
  published_date?: PublishedDate;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  creators: [CreatorSummary, ...CreatorSummary[]];
}
export interface PublishedDate {
  precision: "year" | "month" | "day";
  value: string;
}
export interface CreatorSummary {
  author_ref: ExactRef2;
  display_name: string;
  author_kind: "person" | "organization" | "consortium";
  identity_status: "resolved" | "provisional" | "disputed";
}
export interface CopySummary {
  manifest_ref: ExactRef2;
  artifact_ref: ExactRef2;
  artifact_kind:
    | "pdf"
    | "html"
    | "structured_text"
    | "dataset"
    | "code"
    | "environment_lock"
    | "run_output"
    | "image"
    | "export";
  media_type: string;
  byte_size: number;
  origin_kind: "acquired" | "user_supplied" | "generated";
  source_location: string;
  original_filename?: string;
  availability: "available";
  integrity_status: "verified" | "verified_with_warnings";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface RightsSummary {
  rights_ref: ExactRef2;
  license_status: "known" | "unknown" | "restricted";
  license_label: string;
  access_basis:
    | "open_license"
    | "public_repository"
    | "subscription"
    | "user_supplied"
    | "permission"
    | "unknown";
  decision_status:
    "verified" | "inferred" | "unknown" | "conflicting" | "restricted";
  permissions: Permissions;
  conditions: (
    | "attribution"
    | "notice"
    | "noncommercial"
    | "share_alike"
    | "no_derivatives"
  )[];
  policy_version: string;
}
export interface Permissions {
  store_raw_bytes: boolean;
  parse: boolean;
  index: boolean;
  embed: boolean;
  send_selected_text_remotely: boolean;
  quote_publicly: boolean;
  redistribute_artifact: boolean;
}
export interface Preview {
  span_ref: ExactRef2;
  structural_block_ref: ExactRef2;
  heading: string;
  locator: string;
  text: string;
  verification_status:
    | "exact_text_and_geometry"
    | "normalized"
    | "visual_only"
    | "manual_alignment"
    | "unresolved";
}
export interface DownstreamUse {
  claim_count: number;
  assertion_count: number;
}
export interface RetainedSynthesis {
  project_inquiry_link_id: string;
  linked_response: PetraGroundedResponse;
  current_response: PetraGroundedResponse;
  context_packet: PetraContextPacket;
  evidence_packet: PetraEvidencePacket;
  output: PetraModelSynthesistOutput;
}
/**
 * A revisioned operational record binding immutable grounded-response bytes to their exact scientific, model, WorkUnit, interaction, and cache dependencies. Invalidation never rewrites the Artifact or scientific authority.
 */
export interface PetraGroundedResponse {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
  grounded_response_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  lineage:
    | {
        lineage_kind: "root";
      }
    | {
        lineage_kind: "revision";
        /**
         * A one-based optimistic revision within JavaScript's safe-integer range.
         */
        parent_revision: number;
        /**
         * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
         */
        parent_hash: string;
      };
  content: Content;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  recorded_by: ServiceActorRef1;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface Content {
  response_artifact_ref: ResponseArtifactRef;
  context_packet_ref: ContextPacketRef;
  evidence_packet_ref: EvidencePacketRef;
  snapshot_ref: SnapshotRef;
  execution_ref: ExecutionRef;
  interaction_ref: InteractionRef;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  dependencies: [Dependency, ...Dependency[]];
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  model_output_hash: string;
  cache: ReusableCache | InvalidatedCache;
  terminal: PersistedTerminal;
}
export interface ResponseArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: "text/markdown; charset=utf-8";
}
export interface ContextPacketRef {
  context_packet_id: string & string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidencePacketRef {
  evidence_packet_id: string & string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ExecutionRef {
  model_request_id: string & string;
  model_call_id: string & string;
  model_deployment_id: string & string;
  role_certification_id: string & string;
}
export interface InteractionRef {
  interaction_run_ref: InteractionRunRef;
  work_unit_ref: WorkUnitRef2;
}
export interface InteractionRunRef {
  interaction_run_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkUnitRef2 {
  work_unit_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
}
export interface Dependency {
  dependency_role: "selected_evidence" | "provenance" | "control";
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
}
export interface ClaimRef {
  object_kind: "claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface AssertionRef {
  object_kind: "assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface SourceSpanRef {
  object_kind: "source_span";
  /**
   * A Petra identifier whose kind is source_span.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface WorkVersionRef {
  object_kind: "work_version";
  /**
   * A Petra identifier whose kind is work_version.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface ReusableCache {
  state: "reusable";
  cache_key: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
}
export interface InvalidatedCache {
  state: "invalidated";
  cache_key: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  checked_at: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  invalidated_by: [InvalidationCause, ...InvalidationCause[]];
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  affected_dependency_ids: [string, ...string[]];
}
export interface InvalidationCause {
  event_id: string & string;
  event_type: "change_set.applied" | "change_set.reverted";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string & string;
}
export interface PersistedTerminal {
  state: "completed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  persisted_at: string;
  authority_effect: "none";
}
export interface ServiceActorRef1 {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
/**
 * An immutable, bounded manifest of the exact scientific records authorized as context for one objective, snapshot, and recipe revision.
 */
export interface PetraContextPacket {
  schema_name: "petra.context-packet";
  schema_version: "1.0.0";
  context_packet_id: string & string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  recipe_ref: ContextRecipeRef;
  content: ContextPacketContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef2;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface ContextRecipeRef {
  context_recipe_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ContextPacketContent {
  objective: Objective1;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  included_objects: [ContextInclusion, ...ContextInclusion[]];
  /**
   * @maxItems 10000
   */
  omissions: (KnownObjectOmission | SearchBoundaryOmission)[];
  coverage: Coverage;
  budget: PacketBudget;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  dependencies: [Dependency1, ...Dependency1[]];
}
export interface Objective1 {
  objective_kind:
    | "answer"
    | "inspect"
    | "compare"
    | "review"
    | "compose"
    | "experiment"
    | "other";
  statement: string;
  /**
   * @maxItems 1000
   */
  target_refs: (ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef)[];
}
export interface ContextInclusion {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  /**
   * @minItems 1
   */
  evidence_roles: [
    (
      | "relevant"
      | "supporting"
      | "contrary"
      | "qualifying"
      | "conflicting"
      | "source_location"
      | "workflow_state"
    ),
    ...(
      | "relevant"
      | "supporting"
      | "contrary"
      | "qualifying"
      | "conflicting"
      | "source_location"
      | "workflow_state"
    )[],
  ];
  authority:
    | {
        zone: "quarantine";
        review_state:
          "unreviewed" | "machine_checked" | "human_rejected" | "disputed";
      }
    | {
        zone: "trusted";
        review_state: "machine_checked" | "human_accepted" | "disputed";
      }
    | {
        zone: "personal";
        review_state: "unreviewed" | "human_accepted" | "disputed";
      }
    | {
        zone: "source_record";
        review_state: "not_applicable";
      };
  source_access:
    | "metadata_only"
    | "abstract_only"
    | "full_text_structured"
    | "full_text_analyzed"
    | "not_applicable";
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_refs: (string & string)[];
  selection: SelectionTrace;
  estimated_tokens: number;
}
export interface SelectionTrace {
  route:
    | "deterministic_graph"
    | "lexical"
    | "dense"
    | "hybrid"
    | "graph_expansion"
    | "cached"
    | "explicit_user_selection";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  rank: number;
  score?: string;
  reason: string;
}
export interface KnownObjectOmission {
  omission_kind: "known_object";
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  reason:
    | "budget"
    | "policy"
    | "rights"
    | "visibility"
    | "truncation"
    | "unavailable"
    | "not_retrieved";
  material: boolean;
  detail: string;
}
export interface SearchBoundaryOmission {
  omission_kind: "search_boundary";
  boundary: string;
  reason:
    | "budget"
    | "policy"
    | "rights"
    | "visibility"
    | "truncation"
    | "unavailable"
    | "not_retrieved";
  material: boolean;
  detail: string;
}
export interface Coverage {
  state: "complete_for_recipe" | "bounded" | "partial" | "unknown";
  statement: string;
  contrary_evidence_checked: boolean;
}
export interface PacketBudget {
  max_input_tokens: number;
  max_objects: number;
  max_source_spans: number;
  estimated_input_tokens: number;
  included_object_count: number;
  included_source_span_count: number;
  truncated: boolean;
}
export interface Dependency1 {
  dependency_kind:
    "record" | "artifact" | "schema" | "projection" | "ranking" | "policy";
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ServiceActorRef2 {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
/**
 * An immutable composition-specific selection over one exact ContextPacket; inclusion records authorized evidence, not truth.
 */
export interface PetraEvidencePacket {
  schema_name: "petra.evidence-packet";
  schema_version: "1.0.0";
  evidence_packet_id: string & string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  snapshot_ref: SnapshotRef;
  content: EvidencePacketContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef2;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface EvidencePacketContent {
  context_packet_ref: ContextPacketRef1;
  composition_objective: string;
  temporal_perspective:
    | {
        perspective: "current";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        as_of: string;
      }
    | {
        perspective: "historical" | "comparative";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        as_of: string;
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        historical_boundary: string;
      };
  /**
   * @minItems 1
   * @maxItems 10000
   */
  selected_evidence: [EvidenceSelection, ...EvidenceSelection[]];
  /**
   * @maxItems 10000
   */
  exclusions: ContextExclusion[];
  coverage: EvidenceCoverage;
  freshness:
    | {
        state: "current_for_snapshot";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        checked_at: string;
      }
    | {
        state: "stale";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        checked_at: string;
        /**
         * @minItems 1
         * @maxItems 1000
         *
         * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
         */
        invalidated_by: [string, ...string[]];
      }
    | {
        state: "unknown";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        checked_at: string;
        reason: string;
      };
}
export interface ContextPacketRef1 {
  context_packet_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidenceSelection {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  context_selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  bearing:
    | "supporting"
    | "contrary"
    | "qualifying"
    | "conflicting"
    | "background"
    | "unresolved";
  /**
   * @maxItems 10000
   *
   * Items: A one-based optimistic revision within JavaScript's safe-integer range.
   */
  source_span_selection_orders: number[];
  inclusion_reason: string;
  /**
   * @maxItems 100
   */
  use_limitations: string[];
}
export interface ContextExclusion {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  context_selection_order: number;
  reason:
    | "not_relevant"
    | "redundant"
    | "scope_mismatch"
    | "rights"
    | "budget"
    | "unsupported_depth";
  detail: string;
}
export interface EvidenceCoverage {
  state: "complete_for_context" | "bounded" | "partial";
  statement: string;
  contrary_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
  qualifying_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
}
/**
 * A provider-neutral bounded scientific response whose material statements declare epistemic origin and exact EvidencePacket references; it contains no authority state or mutation commands.
 */
export interface PetraModelSynthesistOutput {
  schema_name: "petra.model-synthesist-output";
  schema_version: "1.0.0";
  /**
   * @minItems 1
   * @maxItems 100
   */
  statements: [
    (
      | SourceReportStatement
      | PetraSynthesisStatement
      | UnresolvedInferenceStatement
    ),
    ...(
      | SourceReportStatement
      | PetraSynthesisStatement
      | UnresolvedInferenceStatement
    )[],
  ];
  coverage: CoverageDisclosure;
}
export interface SourceReportStatement {
  statement_key: string;
  origin: "source_report";
  text: string;
  /**
   * @minItems 1
   * @maxItems 20
   */
  evidence_refs:
    | [EvidenceRef]
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
}
export interface EvidenceRef {
  context_selection_order: number;
  object_kind: "claim" | "assertion";
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  source_span_selection_orders: [number, ...number[]];
}
export interface PetraSynthesisStatement {
  statement_key: string;
  origin: "petra_synthesis";
  text: string;
  /**
   * @minItems 2
   * @maxItems 20
   */
  evidence_refs:
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
}
export interface UnresolvedInferenceStatement {
  statement_key: string;
  origin: "unresolved_inference";
  text: string;
  /**
   * @maxItems 20
   */
  evidence_refs:
    | []
    | [EvidenceRef]
    | [EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef, EvidenceRef]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ]
    | [
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
        EvidenceRef,
      ];
  limitations: Limitations;
  resolution_requirement: string;
}
export interface CoverageDisclosure {
  state: "complete_for_context" | "bounded" | "partial";
  statement: string;
  material_omissions_acknowledged: boolean;
  abstract_only_sources_used: boolean;
  contrary_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
  qualifying_evidence_status:
    "included" | "checked_none_in_context" | "not_checked";
}
/**
 * An immutable exact association from a ProjectDefinition-valid inquiry anchor to Work or a result. Operational completion never changes inquiry meaning.
 */
export interface PetraProjectInquiryLink {
  schema_name: "petra.project-inquiry-link";
  schema_version: "1.0.0";
  project_inquiry_link_id: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: LinkContent;
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
export interface LinkContent {
  project_definition_ref: DefinitionRef4;
  inquiry_role_ref: InquiryRoleRef;
  inquiry_anchor: InquiryAnchor;
  target: WorkTarget | ResultTarget;
}
export interface DefinitionRef4 {
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
export interface InquiryRoleRef {
  project_inquiry_role_id: string;
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
export interface InquiryAnchor {
  anchor_kind: "project_objective";
  semantic_key: string;
  objective_ref: ObjectiveRef2;
}
export interface ObjectiveRef2 {
  objective_id: string;
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
export interface WorkTarget {
  target_kind: "work";
  relationship: "addresses";
  work_unit_ref: WorkUnitRef3;
}
export interface WorkUnitRef3 {
  work_unit_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ResultTarget {
  target_kind: "result";
  bearing: "addresses" | "admissible_basis" | "accepted_finding";
  result_ref: TypedRecordRef1;
  produced_by_work_ref?: WorkUnitRef3;
}
export interface TypedRecordRef1 {
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
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
