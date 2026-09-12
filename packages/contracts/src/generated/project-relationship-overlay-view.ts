/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Node = CurrentNode | WorkingNode;
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
  project_definition_ref: ProjectDefinitionRef1;
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
  created_by: ActorRef;
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
export type Relationship = CurrentRelationship | WorkingRelationship;
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
  project_definition_ref: ProjectDefinitionRef1;
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
  created_by: ActorRef;
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
 * A renderer-neutral, Project-scoped composition of one exact authoritative provenance path and the relevant durable non-authoritative working structure. Exact authoritative projection and working-base positions remain separate.
 */
export interface PetraProjectRelationshipOverlayView {
  schema_name: "petra.project-relationship-overlay-view";
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
  query: Query;
  profile: Profile;
  capabilities: Capabilities;
  positions: Positions;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  nodes: [Node, ...Node[]];
  /**
   * @minItems 1
   * @maxItems 10000
   */
  relationships: [Relationship, ...Relationship[]];
  completeness: Completeness;
  textual_peer: TextPeer;
  authority_boundary: AuthorityBoundary1;
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface Query {
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  query_kind: "scientific_provenance_working_overlay";
  question: string;
  scope: string;
  authoritative_focus_ref: ExactRef;
  maximum_authoritative_depth: 3;
  working_selection: "current_relationship_heads_on_authoritative_path_with_exact_candidate_endpoints";
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
  record_hash: string;
}
export interface Profile {
  project_definition_ref: ProjectDefinitionRef;
  label: string;
  object_term: Term;
  relationship_term: Term;
  source_term: Term;
  layer_labels: {
    current: "Current authority";
    working: "Working — not authoritative";
  };
  endpoint_posture_labels: {
    current_working_head: "Current working revision";
    non_current_working_endpoint: "Referenced earlier working revision — not current";
  };
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  definition_family: string;
}
export interface Term {
  semantic_key: string;
  singular: string;
  plural: string;
  definition: string;
}
export interface Capabilities {
  current: "available";
  working: "available";
  historical_authority: "unavailable";
  historical_working_endpoints: "exact_references_only";
  comparison: "unavailable";
  expansion: "unavailable";
  continuation: "unavailable";
  text_peer: "available";
}
export interface Positions {
  isolation: "repeatable_read_working_with_exact_authoritative_projection_guard";
  authoritative: AuthoritativePosition;
  working: WorkingPosition;
}
export interface AuthoritativePosition {
  source_view_ref: {
    schema_name: "petra.project-relationship-view";
    schema_version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    read_at: string;
  };
  authority: AuthorityPosition;
  projection: ProjectionPosition;
}
export interface AuthorityPosition {
  event_position: number;
  stream_revision: number;
}
export interface ProjectionPosition {
  checkpoint_ref: CheckpointRef;
  state: "current" | "catching_up" | "blocked";
  represented_event_position: number;
  represented_stream_revision: number;
  represented_target_sequence: number;
  observed_event_position: number;
  observed_stream_revision: number;
  observed_target_sequence: number;
  pending_records: number;
  detail: string;
  failure_code?: string;
}
export interface CheckpointRef {
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
export interface WorkingPosition {
  snapshot_ref: {
    schema_name: "petra.project-working-state-snapshot";
    schema_version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    read_at: string;
  };
  base_authority: AuthorityPosition;
  project_definition_ref: ProjectDefinitionRef;
  selection_kind: "current_heads_plus_exact_referenced_working_revisions";
  historical_working_revisions_included: "referenced_only";
  authoritative_records_included: false;
}
export interface CurrentNode {
  node_key: string;
  layer: "current";
  owner: CurrentOwner;
  object_kind: "work" | "work_version" | "claim" | "source_span" | "artifact";
  object_term: string;
  label: string;
  summary: string;
  basis: string;
  lifecycle: "represented";
  source_destination?: SourceDestination;
}
export interface CurrentOwner {
  owner_kind: "authoritative_record";
  record_ref: ExactRef;
}
export interface SourceDestination {
  project_source_id: string;
  status: "active" | "excluded";
  label: string;
}
export interface WorkingNode {
  node_key: string;
  layer: "working";
  owner: WorkingOwner;
  profile_record_ref: ExactRef;
  object_term: string;
  label: string;
  summary: string;
  basis: string;
  validation_summary: string;
  endpoint_posture: "current_working_head" | "non_current_working_endpoint";
  working_record: PetraWorkingCandidate;
}
export interface WorkingOwner {
  owner_kind: "working_candidate";
  working_candidate_ref: WorkingCandidateRef;
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ProjectDefinitionRef1 {
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
  actor: HumanActorRef;
  contribution_kind: "direct_edit" | "human_extraction";
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string & string;
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
  actor_id: string & string;
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
  actor_id: string & string;
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
  validated_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  validated_at: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string & string;
  actor_kind: "human" | "service" | "model";
}
export interface RootLineage {
  lineage_kind: "root";
}
export interface SupersessionLineage {
  lineage_kind: "supersession";
  supersedes: WorkingCandidateRef1;
  change_kind:
    | "mechanical_correction"
    | "basis_revision"
    | "material_revision"
    | "withdrawal";
  reason: string;
}
export interface WorkingCandidateRef1 {
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
export interface CurrentRelationship {
  relationship_key: string;
  layer: "current";
  owner: CurrentRelationshipOwner;
  source_node_key: string;
  target_node_key: string;
  direction: "outgoing";
  relation_class: "structural" | "provenance" | "representation";
  label: string;
  summary: string;
  meaning: string;
  scope: string;
  basis: string;
}
export interface CurrentRelationshipOwner {
  owner_kind: "authoritative_relationship";
  relationship_ref: GraphElementRef;
}
export interface GraphElementRef {
  element_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkingRelationship {
  relationship_key: string;
  layer: "working";
  owner: WorkingRelationshipOwner;
  profile_record_ref: ExactRef;
  source_node_key: string;
  target_node_key: string;
  target_endpoint_posture:
    "current_working_head" | "non_current_working_endpoint";
  direction: "outgoing";
  relation_class: "representation";
  relationship_term: string;
  label: string;
  summary: string;
  meaning: string;
  scope: string;
  basis: string;
  validation_summary: string;
  working_record: PetraWorkingRelationship;
}
export interface WorkingRelationshipOwner {
  owner_kind: "working_relationship";
  working_relationship_ref: WorkingRelationshipRef;
}
export interface WorkingRelationshipRef {
  working_relationship_id: string;
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
  candidate_ref: WorkingCandidateRef1;
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
  supersedes: WorkingRelationshipRef1;
  change_kind:
    | "mechanical_correction"
    | "basis_revision"
    | "material_revision"
    | "withdrawal";
  reason: string;
}
export interface WorkingRelationshipRef1 {
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
export interface Completeness {
  state: "complete_for_selected_authoritative_path_and_relevant_working_heads";
  scope: string;
  authoritative_nodes: number;
  authoritative_relationships: number;
  current_working_candidate_heads: number;
  current_working_relationship_heads: number;
  returned_working_candidate_revisions: number;
  returned_working_relationships: number;
  referenced_non_current_working_candidate_revisions: number;
  returned_nodes: number;
  returned_relationships: number;
  /**
   * @minItems 2
   * @maxItems 2
   */
  exclusions: [Exclusion, Exclusion];
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [string, ...string[]];
}
export interface Exclusion {
  member_kind: "working_candidate" | "working_relationship";
  reason:
    "not_referenced_by_selected_relationship" | "outside_authoritative_path";
  count: number;
}
export interface TextPeer {
  title: string;
  scope: string;
  completeness: "complete_for_every_returned_node_and_relationship";
  /**
   * @minItems 1
   * @maxItems 10000
   */
  nodes: [TextNode, ...TextNode[]];
  /**
   * @minItems 1
   * @maxItems 10000
   */
  relationships: [TextRelationship, ...TextRelationship[]];
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [string, ...string[]];
}
export interface TextNode {
  node_key: string;
  layer: "current" | "working";
  object_term: string;
  label: string;
  summary: string;
  basis: string;
}
export interface TextRelationship {
  relationship_key: string;
  layer: "current" | "working";
  source_node_key: string;
  source_label: string;
  direction: "outgoing";
  label: string;
  target_node_key: string;
  target_label: string;
  summary: string;
  meaning: string;
  scope: string;
  basis: string;
}
export interface AuthorityBoundary1 {
  working_domain_authority: false;
  working_review_decision: false;
  working_mutation_authority: false;
  validation_grants_authority: false;
  visibility_grants_authority: false;
  selection_grants_authority: false;
  projection_grants_authority: false;
  promotion_requires_review: true;
  layout_client_local: true;
  focus_client_local: true;
  disclosure_client_local: true;
  comparison_selection_client_local: true;
  navigation_history_client_local: true;
}
