/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A renderer-neutral, bounded relationship result over one exact Project graph-projection position. Version 1.0 supports one current scientific provenance path and explicitly marks later layer and traversal capabilities unavailable.
 */
export interface PetraProjectRelationshipView {
  schema_name: "petra.project-relationship-view";
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
  position: Position;
  layer: "current";
  /**
   * @minItems 5
   * @maxItems 10000
   */
  nodes: [Node, Node, Node, Node, Node, ...Node[]];
  /**
   * @minItems 4
   * @maxItems 10000
   */
  relationships: [
    Relationship,
    Relationship,
    Relationship,
    Relationship,
    ...Relationship[],
  ];
  path: Path;
  completeness: Completeness;
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
  query_kind: "scientific_provenance_path";
  question: string;
  scope: string;
  focus_ref: ExactRef;
  objective_ref?: ExactRef;
  requested_position: "current_authority";
  maximum_depth: 3;
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
  project_definition_ref: DefinitionRef;
  label: string;
  object_term: string;
  relationship_term: string;
  source_term: string;
}
export interface DefinitionRef {
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
export interface Capabilities {
  current: "available";
  working: "unavailable";
  historical: "unavailable";
  comparison: "unavailable";
  expansion: "unavailable";
  continuation: "unavailable";
  text_peer: "available";
}
export interface Position {
  isolation: "repeatable_read_with_projection_guard";
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
export interface Node {
  node_ref: ExactRef;
  object_kind: "work" | "work_version" | "claim" | "source_span" | "artifact";
  label: string;
  summary: string;
  basis: string;
  layer: "current";
  lifecycle: "represented";
  source_destination?: SourceDestination;
}
export interface SourceDestination {
  project_source_id: string;
  status: "active" | "excluded";
  label: string;
}
export interface Relationship {
  relationship_ref: GraphElementRef;
  predicate: "VERSION_OF" | "ASSERTS" | "GROUNDED_IN" | "LOCATED_IN";
  relation_class: "structural" | "provenance" | "representation";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  source_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  target_id: string;
  direction: "outgoing";
  label: string;
  summary: string;
  basis: string;
  layer: "current";
  assertion_id?: string;
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
export interface Path {
  path_kind: "scientific_provenance";
  state: "complete_for_selected_relationship";
  ordering_rationale: string;
  /**
   * @minItems 4
   * @maxItems 10000
   */
  steps: [PathStep, PathStep, PathStep, PathStep, ...PathStep[]];
}
export interface PathStep {
  position: number;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  from_node_id: string;
  relationship_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  to_node_id: string;
  repeated_member: boolean;
}
export interface Completeness {
  state: "complete_for_selected_relationship";
  scope: string;
  returned_nodes: number;
  returned_relationships: number;
  known_path_nodes: number;
  known_path_relationships: number;
  filtered_members: 0;
  hidden_working_members: 0;
  traversal_limit: 3;
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [string, ...string[]];
}
