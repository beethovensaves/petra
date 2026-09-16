/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type StableKey = string;
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
export type ProjectionSummary = {
  state: "current" | "catching_up" | "blocked" | "unavailable";
  label: string;
  detail: string;
  checkpoint_ref?: ExactRef1;
  represented_event_position: number;
  observed_event_position: number;
  pending_records: number;
  failure_code?: string;
};
export type SourceInspection =
  SourceInspectionAvailable | SourceInspectionUnavailable;
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
 * A read-only exact Details result for one selected member or path in a previously resolved focused graph. It composes the existing semantic-location and ProjectSource owners without granting graph selection, layout, navigation, or mutation authority.
 */
export interface PetraFocusedGraphDetailsView {
  schema_name: "petra.focused-graph-details-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: DetailsContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface DetailsContent {
  details_request_id: string;
  graph: GraphBinding;
  selection: Selection;
  /**
   * @maxItems 100
   */
  nodes: NodeDetails[];
  /**
   * @maxItems 99
   */
  relationships: RelationshipDetails[];
  /**
   * @maxItems 99
   */
  paths: Path[];
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
  authority_boundary: {
    postgresql_authoritative: true;
    neo4j_projection_only: true;
    selection_is_presentation_state: true;
    details_are_read_only: true;
    source_owner: "project_source_view";
    semantic_location_owner: "project_object_location_view";
    graph_specific_registry_added: false;
  };
}
export interface GraphBinding {
  schema_name: "petra.focused-graph-view";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  task: Task;
  profile: Profile;
  requested_snapshot: ProjectSnapshotRef;
  represented_snapshot: ProjectSnapshotRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: CurrentTemporalPosition | HistoricalTemporalPosition;
  projection_position: ProjectionPosition;
  scope: Scope;
  return_destination: AvailableDestination | UnavailableDestination;
}
export interface Task {
  request_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  task_kind:
    | "neighborhood"
    | "provenance"
    | "disagreement"
    | "comparison"
    | "impact"
    | "time";
  task_semantic_key: string;
  question: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  question_hash: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  focus_refs: [ExactRef, ...ExactRef[]];
  origin: Origin;
  return_destination_key: string;
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
export interface Origin {
  origin_kind:
    | "brief"
    | "evidence"
    | "review"
    | "petra"
    | "history"
    | "direct"
    | "saved_question";
  origin_ref?: ExactRef;
}
export interface Profile {
  project_definition_ref: ProjectDefinitionRef;
  kernel_compatibility: "petra.project-kernel@1.0.0";
  label: string;
  focused_graph_registration: {
    semantic_key: "petra.focused-graph";
    registration_kind: "extension";
    contract: ContractRef;
  };
  /**
   * @minItems 3
   * @maxItems 1000
   */
  resolved_semantics: [
    ResolvedSemantic,
    ResolvedSemantic,
    ResolvedSemantic,
    ...ResolvedSemantic[],
  ];
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
export interface ContractRef {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ResolvedSemantic {
  semantic_key: string;
  role: "task" | "object" | "relationship" | "action";
  registration_kind:
    | "objective_schema"
    | "object_schema"
    | "relationship_schema"
    | "source_role"
    | "workflow"
    | "tool"
    | "extension";
  contract: ContractRef;
  term: Term;
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
export interface CurrentTemporalPosition {
  position_kind: "current";
  dimension: "project_snapshot";
}
export interface HistoricalTemporalPosition {
  position_kind: "historical";
  dimension:
    "recorded_time" | "occurred_time" | "publication_time" | "valid_time";
  at:
    | {
        state: "exact";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        value: string;
      }
    | {
        state: "unknown";
      }
    | {
        state: "unavailable";
        reason: string;
      };
}
export interface ProjectionPosition {
  authority_source: "postgresql";
  projection_source: "neo4j_rebuildable_projection";
  state: "current" | "catching_up" | "unavailable" | "rebuilding";
  checkpoint_ref?: ExactRef;
  represented_event_position: number;
  observed_event_position: number;
  pending_records: number;
  detail: string;
}
export interface Scope {
  description: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  included_relationship_semantics: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 3
   */
  directions:
    | ["outgoing" | "incoming" | "bidirectional"]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ];
  /**
   * @minItems 1
   * @maxItems 3
   */
  included_layers:
    | ["current" | "working" | "historical"]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ];
  limits: Limits;
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [Omission, ...Omission[]];
}
export interface Limits {
  maximum_depth: number;
  maximum_nodes: number;
  maximum_relationships: number;
  maximum_paths: number;
}
export interface Omission {
  omission_kind:
    | "out_of_scope"
    | "filtered"
    | "capped"
    | "restricted"
    | "missing"
    | "unknown"
    | "unsupported"
    | "projection_unavailable"
    | "working_hidden";
  description: string;
  count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
}
export interface AvailableDestination {
  destination_key: string;
  destination_kind:
    | "details"
    | "source_inspection"
    | "brief"
    | "evidence"
    | "review"
    | "history"
    | "work";
  state: "available";
  owner:
    | "project_object_location_view"
    | "project_source_view"
    | "project_brief_view"
    | "project_relationship_view"
    | "project_review_view"
    | "project_history_episode_view"
    | "project_work_view";
  label: string;
  target_ref: ExactRef;
}
export interface UnavailableDestination {
  destination_key: string;
  destination_kind:
    | "details"
    | "source_inspection"
    | "brief"
    | "evidence"
    | "review"
    | "history"
    | "work";
  state: "unavailable";
  owner:
    | "project_object_location_view"
    | "project_source_view"
    | "project_brief_view"
    | "project_relationship_view"
    | "project_review_view"
    | "project_history_episode_view"
    | "project_work_view";
  label: string;
  reason: string;
}
export interface Selection {
  selection_kind: "node" | "relationship" | "path";
  /**
   * @minItems 1
   * @maxItems 100
   */
  selected_keys: [StableKey, ...StableKey[]];
}
export interface NodeDetails {
  member_kind: "node";
  member_key: StableKey;
  member: Node;
  semantic_location: LocationContent;
  /**
   * @maxItems 96
   */
  source_inspections: SourceInspection[];
}
export interface Node {
  node_key: string;
  record_ref: ExactRef;
  semantic_key: string;
  term: Term;
  label: string;
  summary: string;
  layer: "current" | "working" | "historical";
  authority_position:
    "current_authority" | "working_non_authority" | "historical_authority";
  lifecycle: "represented" | "superseded" | "restricted" | "missing";
  basis: Basis;
  /**
   * @maxItems 100
   */
  destination_keys: string[];
}
export interface Basis {
  summary: string;
  /**
   * @maxItems 1000
   */
  record_refs: ExactRef[];
  /**
   * @maxItems 100
   */
  limitations: string[];
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
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
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
export interface SourceInspectionAvailable {
  state: "available";
  owner: "project_source_view";
  source_span_ref: ExactRef;
  project_source_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  binding_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  binding_content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  source_view_content_hash: string;
  source_view: SourceViewContent;
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
export interface SourceInspectionUnavailable {
  state: "unavailable";
  owner: "project_source_view";
  source_span_ref: ExactRef;
  project_source_id?: string;
  reason: string;
}
export interface RelationshipDetails {
  member_kind: "relationship";
  member_key: StableKey;
  member: Relationship;
  semantic_location: LocationContent;
  /**
   * @maxItems 96
   */
  source_inspections: SourceInspection[];
}
export interface Relationship {
  relationship_key: string;
  relationship_ref: GraphElementRef;
  semantic_key: string;
  term: Term;
  predicate: string;
  meaning_kind:
    | "citation"
    | "support"
    | "contradiction"
    | "qualification"
    | "inference"
    | "structural"
    | "provenance"
    | "governance"
    | "dependency";
  source_node_key: string;
  target_node_key: string;
  direction: "outgoing" | "incoming" | "bidirectional";
  origin:
    | "canonical_record"
    | "working_candidate"
    | "historical_record"
    | "model_inference";
  layer: "current" | "working" | "historical";
  authority_position:
    "current_authority" | "working_non_authority" | "historical_authority";
  summary: string;
  basis: Basis;
  /**
   * @maxItems 100
   */
  destination_keys: string[];
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
  path_key: string;
  state: "complete" | "partial" | "no_path";
  ordering_rationale: string;
  /**
   * @maxItems 10000
   */
  steps: PathStep[];
  /**
   * @maxItems 100
   */
  limitations: string[];
}
export interface PathStep {
  position: number;
  from_node_key: string;
  relationship_key: string;
  to_node_key: string;
  traversal_direction: "outgoing" | "incoming";
  repeated_member: boolean;
}
