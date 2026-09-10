/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable Project-scoped compensation record that makes one exact ProjectSource supersession relationship ineffective without deleting its history or restoring either source.
 */
export interface PetraProjectSourceReplacementRetraction {
  schema_name: "petra.project-source-replacement-retraction";
  schema_version: "1.0.0";
  project_source_replacement_retraction_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: RetractionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  retracted_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  retracted_at: string;
}
export interface RetractionContent {
  replacement_ref: ReplacementRef;
  reason: string;
}
export interface ReplacementRef {
  project_source_replacement_id: string;
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
