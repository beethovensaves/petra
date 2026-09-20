/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable result of retaining one server-verified focused Graph question as a ProjectInquiry without treating projection or selection as domain authority.
 */
export interface PetraProjectInquirySaveReceipt {
  schema_name: "petra.project-inquiry-save-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: HumanActorRef;
  capability_grant_id: string;
  inquiry_role_ref: InquiryRoleRef;
  objective_ref: ObjectiveRef;
  graph_binding: GraphBinding;
  effect: Effect;
  recovery: Recovery;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
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
export interface GraphBinding {
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  graph_request_hash: string;
  focused_graph_ref: FocusedGraphRef;
  task_request_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  task_request_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  question_hash: string;
  project_definition_ref: ProjectDefinitionRef;
  snapshot_ref: ProjectSnapshotRef;
  semantic_layer: "current" | "working";
  /**
   * @minItems 1
   * @maxItems 100
   */
  focus_refs: [ExactRef, ...ExactRef[]];
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
  return_destination: AvailableDestination | UnavailableDestination;
}
export interface FocusedGraphRef {
  schema_name: "petra.focused-graph-view";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
export interface Effect {
  kind: "project_inquiry_created";
  summary: "The exact question is retained as an active ProjectInquiry; its graph snapshot and selection remain provenance rather than authority.";
  graph_authority_changed: false;
  selection_granted_authority: false;
}
export interface Recovery {
  command_path: string;
  assessment_path: string;
  retry_reuses_command_identity: true;
  missing_receipt_means_unknown: true;
}
