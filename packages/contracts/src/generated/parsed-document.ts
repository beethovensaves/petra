/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * One immutable Petra-normalized interpretation produced by an exact parser run over one source Artifact.
 */
export interface PetraParsedDocument {
  schema_name: "petra.parsed-document";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is parsed_document.
   */
  parsed_document_id: string;
  /**
   * A changed source, parser, configuration, adapter, or normalization creates a new ParsedDocument.
   */
  revision: 1;
  /**
   * A Petra identifier whose kind is artifact.
   */
  source_artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  source_artifact_content_hash: string;
  /**
   * A Petra identifier whose kind is artifact.
   */
  parser_output_artifact_id: string;
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * A Petra identifier whose kind is parser_run.
   */
  parser_run_id: string;
  source_format:
    "pdf" | "html" | "xml" | "json" | "plain_text" | "code" | "image" | "other";
  document_language?: string;
  adapter: VersionedComponent;
  normalization_version: string;
  parser_provenance: ParserProvenance;
  quality_state: "complete" | "partial" | "needs_ocr" | "failed";
  /**
   * @maxItems 100000
   */
  pages: Page[];
  /**
   * @maxItems 1000000
   *
   * Items: A Petra identifier whose kind is structural_block.
   */
  block_ids: string[];
  /**
   * @maxItems 10000
   */
  diagnostics: Diagnostic[];
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface VersionedComponent {
  name: string;
  version: string;
}
export interface ParserProvenance {
  parser: VersionedComponent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  configuration_hash: string;
  /**
   * @maxItems 100
   */
  component_models?: VersionedComponent[];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
}
export interface Page {
  page_number: number;
  page_label?: string;
  width: number;
  height: number;
  unit: "pt" | "px" | "mm";
  coordinate_origin: "top_left" | "bottom_left";
  text_layer_state: "present" | "absent" | "unusable" | "unknown";
  parse_state: "complete" | "partial" | "needs_ocr" | "failed";
  quality_score?: number;
}
export interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  page_number?: number;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
