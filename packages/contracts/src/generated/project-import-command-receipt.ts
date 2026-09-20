/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable result and retained ancestry of one authorized retained-Project reuse command.
 */
export interface PetraProjectImportCommandReceipt {
  schema_name: "petra.project-import-command-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  actor: ActorRef;
  source: SourceAncestry;
  admission: Admission;
  result: Result;
  material: {
    copied: ["project_definition", "focused_objective"];
    retained_only: [
      "source_project_identity",
      "source_history",
      "source_sources",
      "source_work",
      "source_reviews",
    ];
    /**
     * @minItems 1
     * @maxItems 10
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
        ];
  };
  destination: {
    place_role: "brief";
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
  };
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface SourceAncestry {
  source_kind: "retained_project";
  project_ref: ExactProjectRef;
  project_definition_ref: DefinitionRef;
  focused_objective_ref: ObjectiveRef;
  project_status: "active" | "archived";
}
export interface ExactProjectRef {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface Admission {
  decision: "create_derived_project";
  copy_scope: "definition_and_focused_objective";
  source_effect: "preserve_without_modification";
  reviewed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reviewed_at: string;
}
export interface Result {
  project_ref: ExactProjectRef;
  project_definition_ref: DefinitionRef;
  focused_objective_ref: ObjectiveRef;
}
