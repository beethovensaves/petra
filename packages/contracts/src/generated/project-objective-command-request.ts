/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An exact reviewed request to frame or revise the focused Project Objective. Actor, capability grant, Objective identity, revision, and timestamps are server-owned.
 */
export type PetraProjectObjectiveCommandRequest = {
  schema_name: "petra.project-objective-command-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  operation: "frame" | "revise";
  expected: Expected;
  review: Review;
};

export interface Expected {
  project_ref: ProjectRef;
  project_definition_ref: DefinitionRef;
  focus: NoFocus | Focused;
}
export interface ProjectRef {
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
export interface NoFocus {
  state: "none";
}
export interface Focused {
  state: "focused";
  objective_ref: ObjectiveRef;
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
export interface Review {
  decision: "apply";
  rough_statement: string;
  proposed_content: ObjectiveContent;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reviewed_at: string;
}
export interface ObjectiveContent {
  objective_kind: string;
  statement: string;
  status: "active" | "satisfied" | "superseded" | "abandoned";
  parent_ref?: ObjectiveRef1;
  /**
   * @maxItems 1000
   */
  dependency_refs: ObjectiveRef1[];
}
export interface ObjectiveRef1 {
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
