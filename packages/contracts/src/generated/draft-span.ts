/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable Unicode-code-point range over one exact DraftArtifact revision with explicit materiality and scientific force.
 */
export interface PetraDraftSpan {
  schema_name: "petra.draft-span";
  schema_version: "1.0.0";
  draft_span_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  draft_ref: DraftRef;
  content: DraftSpanContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface DraftRef {
  draft_artifact_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface DraftSpanContent {
  offset_unit: "unicode_code_point";
  start: number;
  end: number;
  exact_text: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  exact_text_hash: string;
  materiality: "material" | "nonmaterial";
  semantic_origin:
    | "source_report"
    | "petra_inference"
    | "researcher_statement"
    | "structural_language";
  scientific_force:
    | "direct_report"
    | "descriptive"
    | "association"
    | "comparison"
    | "qualification"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "none";
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
