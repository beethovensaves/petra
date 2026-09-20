/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An authenticated request to reuse one exact retained Project as a new derived Project after explicit human review. Actor and authority are server-owned.
 */
export interface PetraProjectImportCommandRequest {
  schema_name: "petra.project-import-command-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  source: Source;
  admission: Admission;
  project: {
    name: string;
    description?: string;
  };
}
export interface Source {
  source_kind: "retained_project";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  project_revision: number;
  project_definition_ref: DefinitionRef;
  focused_objective_ref: ObjectiveRef;
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
}
export interface Admission {
  decision: "create_derived_project";
  copy_scope: "definition_and_focused_objective";
  source_effect: "preserve_without_modification";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reviewed_at: string;
}
