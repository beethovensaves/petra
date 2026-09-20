/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type GraphRequest = {
  request_id: string;
  task_kind: "neighborhood";
  task_semantic_key: SemanticKey;
  question: string;
  focus_ref: ExactRef;
  origin: Origin;
  project_definition_ref: ProjectDefinitionRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: TemporalPosition;
  object_semantic_key: SemanticKey;
  relationship_semantic_key: SemanticKey;
  return_action_semantic_key: SemanticKey;
  return_destination: SemanticDestination;
  limits: Limits;
  expected_snapshot?: ProjectSnapshotRef;
  exploration?: Exploration;
};
export type SemanticKey = string;
export type TemporalPosition =
  CurrentTemporalPosition | HistoricalTemporalPosition;
export type SemanticDestination = AvailableDestination | UnavailableDestination;
export type StableKey = string;
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
      selected_keys: [string, ...string[]];
    };

/**
 * An exact idempotent request to retain one server-verified focused Graph question as a ProjectInquiry. Actor and capability authority are resolved by the authenticated server.
 */
export interface PetraProjectInquirySaveRequest {
  schema_name: "petra.project-inquiry-save-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  graph_request: GraphRequest;
  expected_graph: FocusedGraphRef;
  selection: Selection;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
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
  expansion_key: StableKey;
  recipe_semantic_key: SemanticKey;
  target_ref: ExactRef;
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
