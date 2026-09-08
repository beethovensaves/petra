/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type SemanticKey = string;
export type Destination = {
  role: PlaceRole;
  purpose: string;
  target_ref?: ExactObjectRef;
  profile_tool_key?: SemanticKey;
};
export type PlaceRole =
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

/**
 * A read-only, Project-scoped semantic destination result. It returns registered place roles and exact identity, never client routes or layout instructions.
 */
export interface PetraProjectObjectLocationView {
  schema_name: "petra.project-object-location-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: LocationContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
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
  semantic_key: SemanticKey;
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
  semantic_key: SemanticKey;
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
  semantic_key: SemanticKey;
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
