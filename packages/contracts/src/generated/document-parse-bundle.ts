/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type DocumentParseBundleId = string;

/**
 * One immutable, quarantine-only parser proposal containing a Petra-normalized document, its structural blocks, source-span candidates, and explicit diagnostics.
 */
export interface PetraDocumentParseBundle {
  schema_name: "petra.document-parse-bundle";
  schema_version: "1.0.0";
  document_parse_bundle_id: DocumentParseBundleId;
  /**
   * A changed source, parser, configuration, adapter, normalization, or correction creates another bundle.
   */
  revision: 1;
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  source_artifact_manifest_id: string;
  /**
   * A Petra identifier whose kind is rights_decision.
   */
  rights_decision_id: string;
  source_scope: "full_text" | "abstract_only";
  document: PetraParsedDocument;
  /**
   * @minItems 1
   * @maxItems 1000000
   */
  blocks: [PetraStructuralBlock, ...PetraStructuralBlock[]];
  /**
   * @minItems 1
   * @maxItems 1000000
   */
  spans: [PetraSourceSpan, ...PetraSourceSpan[]];
  /**
   * @maxItems 10000
   */
  diagnostics: Diagnostic[];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
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
  content: TextContent | StructuredContent | VisualContent;
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
/**
 * A stable, verifiable region of exactly one immutable source Artifact, aligned through one ParsedDocument and StructuralBlock.
 */
export interface PetraSourceSpan {
  schema_name: "petra.source-span";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is source_span.
   */
  source_span_id: string & string;
  revision: 1;
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  artifact_content_hash: string;
  /**
   * A Petra identifier whose kind is parsed_document.
   */
  parsed_document_id: string;
  /**
   * A Petra identifier whose kind is parser_run.
   */
  parser_run_id: string;
  /**
   * A Petra identifier whose kind is structural_block.
   */
  structural_block_id: string;
  selector_schema_version: "1.0.0";
  selector:
    | TextQuoteSelector
    | PageRegionSelector
    | SectionPathSelector
    | JsonPointerSelector
    | LineRangeSelector
    | CompoundSelector;
  extraction: Extraction;
  verification: Verification;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface TextQuoteSelector {
  selector_type: "text_quote";
  quote: TextQuote;
}
export interface TextQuote {
  exact_text?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  selected_text_hash: string;
  prefix?: string;
  suffix?: string;
  start_codepoint: number;
  end_codepoint: number;
  normalization_version: string;
}
export interface PageRegionSelector {
  selector_type: "page_region";
  page_region: PageRegion;
}
export interface PageRegion {
  page_number: number;
  page_width: number;
  page_height: number;
  unit: "pt" | "px" | "mm";
  coordinate_origin: "top_left" | "bottom_left";
  /**
   * @minItems 1
   * @maxItems 10000
   */
  regions: [BoundingBox1 | Polygon, ...(BoundingBox1 | Polygon)[]];
}
export interface BoundingBox1 {
  region_kind: "bounding_box";
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Polygon {
  region_kind: "polygon";
  /**
   * @minItems 3
   * @maxItems 100
   */
  points: [Point, Point, Point, ...Point[]];
}
export interface Point {
  x: number;
  y: number;
}
export interface SectionPathSelector {
  selector_type: "section_path";
  section_path: SectionPath;
}
export interface SectionPath {
  /**
   * @minItems 1
   * @maxItems 100
   */
  segments: [string, ...string[]];
}
export interface JsonPointerSelector {
  selector_type: "json_pointer";
  json_pointer: JsonPointer;
}
export interface JsonPointer {
  pointer: string;
}
export interface LineRangeSelector {
  selector_type: "line_range";
  line_range: LineRange;
}
export interface LineRange {
  start_line: number;
  end_line: number;
}
export interface CompoundSelector {
  selector_type: "compound";
  /**
   * @minItems 2
   * @maxItems 20
   */
  components:
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ];
}
export interface Extraction {
  method:
    | "embedded_text"
    | "ocr"
    | "structured_source"
    | "parser_alignment"
    | "manual_selection"
    | "visual_region";
  method_version: string;
  normalization_version: string;
}
export interface Verification {
  status:
    | "exact_text_and_geometry"
    | "normalized"
    | "visual_only"
    | "manual_alignment"
    | "unresolved";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  verified_at: string;
  /**
   * @maxItems 100
   */
  transformations: string[];
}
