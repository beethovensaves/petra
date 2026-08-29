/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type BlockContent = TextContent | StructuredContent | VisualContent;

/**
 * One immutable ordered and hierarchical unit in a Petra ParsedDocument.
 */
export interface PetraStructuralBlock {
  schema_name: "petra.structural-block";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is structural_block.
   */
  structural_block_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is parsed_document.
   */
  parsed_document_id: string;
  block_kind:
    | "document_title"
    | "heading"
    | "paragraph"
    | "sentence"
    | "list"
    | "list_item"
    | "footnote"
    | "reference"
    | "formula"
    | "table"
    | "table_row"
    | "table_cell"
    | "figure"
    | "caption"
    | "code_block"
    | "other";
  content_layer: "source_native" | "ocr" | "parser_derived" | "visual_only";
  reading_order: number;
  /**
   * @minItems 1
   * @maxItems 100
   */
  structural_path: [string, ...string[]];
  /**
   * A Petra identifier whose kind is structural_block.
   */
  parent_block_id?: string;
  /**
   * @maxItems 100000
   *
   * Items: A Petra identifier whose kind is structural_block.
   */
  child_block_ids: string[];
  /**
   * A Petra identifier whose kind is structural_block.
   */
  previous_block_id?: string;
  /**
   * A Petra identifier whose kind is structural_block.
   */
  next_block_id?: string;
  /**
   * @maxItems 10000
   */
  page_locations: PageLocation[];
  content: BlockContent;
  /**
   * @minItems 1
   * @maxItems 100000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_ids: [string & string, ...(string & string)[]];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface PageLocation {
  page_number: number;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  bounding_boxes: [BoundingBox, ...BoundingBox[]];
}
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface TextContent {
  content_kind: "text";
  text: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface StructuredContent {
  content_kind: "structured_artifact";
  /**
   * A Petra identifier whose kind is artifact.
   */
  structured_artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface VisualContent {
  content_kind: "visual_only";
}
