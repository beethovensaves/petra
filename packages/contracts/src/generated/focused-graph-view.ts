/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type SemanticKey = string;
export type StableKey = string;
export type SourceViewRef =
  | {
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
    }
  | {
      schema_name: "petra.project-relationship-overlay-view";
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
export type TemporalPosition =
  CurrentTemporalPosition | HistoricalTemporalPosition;
export type HistoricalAt =
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
export type OmissionCount =
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
export type Selection =
  | {
      state: "none";
    }
  | {
      state: "selected";
      selection_kind: "node" | "relationship" | "path";
      /**
       * @minItems 1
       * @maxItems 100
       */
      selected_keys: [StableKey, ...StableKey[]];
    };
export type SemanticDestination = AvailableDestination | UnavailableDestination;
export type ActionAvailability =
  | {
      state: "available";
      destination_key?: StableKey;
    }
  | {
      state: "unavailable";
      reason: string;
    };

/**
 * A renderer-neutral, profile-resolved result for one exact bounded relationship question. It preserves Project, definition, snapshot, layer, projection, scope, semantic membership, path, selection, destination, and action meaning without granting a renderer query or mutation authority.
 */
export interface PetraFocusedGraphView {
  schema_name: "petra.focused-graph-view";
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
  task: Task;
  profile: Profile;
  /**
   * @maxItems 2
   */
  source_views: [] | [SourceViewRef] | [SourceViewRef, SourceViewRef];
  requested_snapshot: ProjectSnapshotRef;
  represented_snapshot: ProjectSnapshotRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: TemporalPosition;
  projection_position: ProjectionPosition;
  scope: Scope;
  /**
   * @maxItems 10000
   */
  nodes: Node[];
  /**
   * @maxItems 10000
   */
  relationships: Relationship[];
  /**
   * @maxItems 10000
   */
  paths: Path[];
  selection: Selection;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  destinations: [SemanticDestination, ...SemanticDestination[]];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  actions: [RegisteredAction, ...RegisteredAction[]];
  authority_boundary: AuthorityBoundary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
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
  task_semantic_key: SemanticKey;
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
  return_destination_key: StableKey;
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
  semantic_key: SemanticKey;
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
  semantic_key: SemanticKey;
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
  at: HistoricalAt;
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
  included_relationship_semantics: [SemanticKey, ...SemanticKey[]];
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
  count: OmissionCount;
}
export interface Node {
  node_key: StableKey;
  record_ref: ExactRef;
  semantic_key: SemanticKey;
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
  destination_keys: StableKey[];
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
export interface Relationship {
  relationship_key: StableKey;
  relationship_ref: GraphElementRef;
  semantic_key: SemanticKey;
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
  source_node_key: StableKey;
  target_node_key: StableKey;
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
  destination_keys: StableKey[];
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
  path_key: StableKey;
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
  from_node_key: StableKey;
  relationship_key: StableKey;
  to_node_key: StableKey;
  traversal_direction: "outgoing" | "incoming";
  repeated_member: boolean;
}
export interface AvailableDestination {
  destination_key: StableKey;
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
  destination_key: StableKey;
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
export interface RegisteredAction {
  action_key: StableKey;
  action_kind:
    | "inspect_details"
    | "open_source"
    | "inspect_path"
    | "expand_recorded"
    | "prepare_correction"
    | "open_review"
    | "preview_work"
    | "return_to_origin";
  semantic_key: SemanticKey;
  label: string;
  consequence:
    | "read_only_navigation"
    | "read_only_expansion"
    | "prepares_working_candidate"
    | "opens_canonical_review"
    | "previews_typed_work";
  /**
   * @minItems 1
   * @maxItems 100
   */
  target_keys: [StableKey, ...StableKey[]];
  availability: ActionAvailability;
}
export interface AuthorityBoundary {
  postgresql_authoritative: true;
  neo4j_rebuildable_projection: true;
  renderer_neutral: true;
  renderer_queries_projection: false;
  layout_grants_authority: false;
  selection_grants_authority: false;
  actions_issue_domain_mutation: false;
  correction_requires_canonical_owner: true;
  work_requires_typed_preview: true;
}
