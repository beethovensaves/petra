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
export type ResumeContext = {
  state: "available" | "stale" | "not_found" | "unavailable";
  retained_task?: RetainedTask;
  failure?: ResumeFailure;
  recovery: ResumeRecovery;
};
export type GraphRequest = {
  request_id: string;
  task_kind: "neighborhood";
  task_semantic_key: string;
  question: string;
  focus_ref: ExactRef1;
  origin: Origin;
  project_definition_ref: ProjectDefinitionRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: CurrentTemporalPosition | HistoricalTemporalPosition;
  object_semantic_key: string;
  relationship_semantic_key: string;
  return_action_semantic_key: string;
  return_destination: AvailableDestination | UnavailableDestination;
  limits: Limits;
  expected_snapshot?: ProjectSnapshotRef;
  exploration?: Exploration;
};
export type Page = {
  returned_count: number;
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
};

/**
 * An authenticated, server-filtered, snapshot-consistent page of Project shell results. Search is bounded to current Project name, objective statement, and registered profile label; clients do not decide collection membership.
 */
export interface PetraProjectShellCollectionView {
  schema_name: "petra.project-shell-collection-view";
  schema_version: "1.0.0";
  content: CollectionContent;
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
  query: CollectionQuery;
  /**
   * @maxItems 100
   */
  projects: (
    PetraProjectShellView | PetraProjectShellViewV11 | PetraProjectShellViewV12
  )[];
  page: Page;
}
export interface CollectionQuery {
  search?: string;
  status?: "active" | "archived";
  profile?: string;
  limit: number;
  cursor?: string;
}
/**
 * A read-only, snapshot-consistent Project shell composition resolved through one exact ProjectDefinition.
 */
export interface PetraProjectShellView {
  schema_name: "petra.project-shell-view";
  schema_version: "1.0.0";
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
  content: ShellContent1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ShellContent1 {
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
 * A read-only, snapshot-consistent Project shell composition with an exact PostgreSQL-retained Project resume context and explicit stale, not-found, and unavailable recovery.
 */
export interface PetraProjectShellViewV12 {
  schema_name: "petra.project-shell-view";
  schema_version: "1.2.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ShellContent2;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ShellContent2 {
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
  resume: ResumeContext;
}
export interface RetainedTask {
  task_kind: "focused_graph";
  objective_ref: ObjectiveRef;
  label: string;
  request: GraphRequest;
  expected_graph: FocusedGraphRef;
  selection:
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
        selected_keys: [string, ...string[]];
      };
  origin: Origin;
  /**
   * @minItems 1
   * @maxItems 100
   */
  focus_refs: [ExactRef1, ...ExactRef1[]];
  return_destination: AvailableDestination | UnavailableDestination;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  retained_at: string;
}
export interface ObjectiveRef {
  objective_id: string;
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
  origin_ref?: ExactRef1;
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
  target_ref: ExactRef1;
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
export interface Limits {
  maximum_depth: number;
  maximum_nodes: number;
  maximum_relationships: number;
  maximum_paths: number;
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
export interface Exploration {
  mode: "named_expansion";
  expansion_key: string;
  recipe_semantic_key: string;
  target_ref: ExactRef1;
  maximum_depth: number;
  filters: {
    /**
     * @minItems 1
     */
    meaning_kinds: [
      (
        | "citation"
        | "support"
        | "contradiction"
        | "qualification"
        | "inference"
        | "structural"
        | "provenance"
        | "governance"
        | "dependency"
      ),
      ...(
        | "citation"
        | "support"
        | "contradiction"
        | "qualification"
        | "inference"
        | "structural"
        | "provenance"
        | "governance"
        | "dependency"
      )[],
    ];
    /**
     * @minItems 1
     */
    directions: ["outgoing" | "incoming", ...("outgoing" | "incoming")[]];
    /**
     * @minItems 1
     */
    origins: [
      (
        | "canonical_record"
        | "working_candidate"
        | "historical_record"
        | "model_inference"
      ),
      ...(
        | "canonical_record"
        | "working_candidate"
        | "historical_record"
        | "model_inference"
      )[],
    ];
  };
}
export interface FocusedGraphRef {
  schema_name: "petra.focused-graph-view";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ResumeFailure {
  code:
    | "PROJECT_RESUME_DEFINITION_STALE"
    | "PROJECT_RESUME_TASK_STALE"
    | "PROJECT_RESUME_PROJECT_ARCHIVED"
    | "PROJECT_RESUME_TASK_NOT_FOUND"
    | "PROJECT_RESUME_TASK_UNAVAILABLE";
  message: string;
}
export interface ResumeRecovery {
  action: "open_retained_task" | "open_brief" | "retry_read";
  destination: ResumeDestination;
  reason: string;
}
export interface ResumeDestination {
  role: "brief" | "graph";
  purpose: string;
}
