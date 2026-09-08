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
