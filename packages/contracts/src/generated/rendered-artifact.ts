/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type RenderedArtifactId = string;
export type RenderedContent = {
  format: "markdown" | "latex" | "bibtex";
  content_scope: "draft_with_citations" | "citations_only";
  renderer: RendererRef;
  options: RenderOptions;
  output_artifact_ref: OutputArtifactRef;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  semantic_content_hash: string;
  /**
   * @maxItems 10000
   */
  warnings: RenderWarning[];
  /**
   * @minItems 1
   * @maxItems 100
   */
  transformations: [Transformation, ...Transformation[]];
  authority_boundary: AuthorityBoundary;
};

/**
 * An immutable record of one deterministic representation derived from an exact DraftArtifact and CitationBundle without changing scientific support.
 */
export interface PetraRenderedArtifact {
  schema_name: "petra.rendered-artifact";
  schema_version: "1.0.0";
  rendered_artifact_id: RenderedArtifactId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  draft_ref: DraftRef;
  citation_bundle_ref: CitationBundleRef;
  content: RenderedContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  rendered_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  rendered_at: string;
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
export interface CitationBundleRef {
  citation_bundle_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RendererRef {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RenderOptions {
  encoding: "utf-8";
  line_ending: "lf";
  citation_rendering: "linked_span_suffix";
  bibliography_rendering: "canonical_metadata_only";
  standalone_document: boolean;
}
export interface OutputArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
}
export interface RenderWarning {
  code: string;
  message: string;
}
export interface Transformation {
  kind:
    | "citation_insertion"
    | "syntax_escape"
    | "bibliography_projection"
    | "document_wrapper";
  behavior: string;
  lossy: boolean;
  semantic_effect: "none";
}
export interface AuthorityBoundary {
  rendered_artifact_is_scientific_authority: false;
  renderer_may_change_support: false;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
