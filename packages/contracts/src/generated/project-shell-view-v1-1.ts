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
export type PlaceSummary = AvailablePlaceSummary | UnavailablePlaceSummary;
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
    | [PlaceSummary]
    | [PlaceSummary, PlaceSummary]
    | [PlaceSummary, PlaceSummary, PlaceSummary]
    | [PlaceSummary, PlaceSummary, PlaceSummary, PlaceSummary]
    | [PlaceSummary, PlaceSummary, PlaceSummary, PlaceSummary, PlaceSummary]
    | [
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
      ]
    | [
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
      ]
    | [
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
      ]
    | [
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
      ]
    | [
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
        PlaceSummary,
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
