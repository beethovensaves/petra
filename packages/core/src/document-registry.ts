import { createHash } from "node:crypto";

import type {
  LineRange,
  PageRegion,
  PetraParsedDocument,
  PetraSourceSpan,
  PetraStructuralBlock,
  SectionPath,
  TextQuote,
} from "@petra/contracts";

export type DocumentRegistrationErrorCode =
  | "SOURCE_ARTIFACT_NOT_REGISTERED"
  | "PARSER_OUTPUT_ARTIFACT_NOT_REGISTERED"
  | "SOURCE_ARTIFACT_HASH_MISMATCH"
  | "PARSED_DOCUMENT_ID_ALREADY_REGISTERED"
  | "PARSER_RUN_ID_ALREADY_REGISTERED"
  | "DUPLICATE_PAGE_NUMBER"
  | "PARSED_DOCUMENT_NOT_REGISTERED"
  | "BLOCK_NOT_DECLARED"
  | "BLOCK_ID_ALREADY_REGISTERED"
  | "READING_ORDER_MISMATCH"
  | "STRUCTURAL_REFERENCE_OUTSIDE_DOCUMENT"
  | "PAGE_NOT_DECLARED"
  | "REGION_OUT_OF_BOUNDS"
  | "BLOCK_CONTENT_ARTIFACT_NOT_REGISTERED"
  | "BLOCK_CONTENT_HASH_MISMATCH"
  | "SOURCE_SPAN_ID_ALREADY_REGISTERED"
  | "SPAN_ARTIFACT_MISMATCH"
  | "SPAN_PARSER_RUN_MISMATCH"
  | "SPAN_BLOCK_MISMATCH"
  | "SPAN_NOT_DECLARED"
  | "NORMALIZATION_VERSION_MISMATCH"
  | "TEXT_RANGE_INVALID"
  | "SELECTED_TEXT_HASH_MISMATCH"
  | "SELECTED_TEXT_MISMATCH"
  | "QUOTE_CONTEXT_MISMATCH"
  | "PAGE_COORDINATE_MISMATCH"
  | "DUPLICATE_SELECTOR_COMPONENT"
  | "LINE_RANGE_INVALID"
  | "VERIFICATION_EVIDENCE_MISMATCH";

export class DocumentRegistrationError extends Error {
  readonly code: DocumentRegistrationErrorCode;

  constructor(code: DocumentRegistrationErrorCode, message: string) {
    super(message);
    this.name = "DocumentRegistrationError";
    this.code = code;
  }
}

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const member of Object.values(value)) deepFreeze(member);
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

const immutableCopy = <Value>(value: Value): DeepReadonly<Value> =>
  deepFreeze(structuredClone(value));

const sha256Text = (text: string): string =>
  `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;

const withinUpperBound = (value: number, upperBound: number): boolean => {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(upperBound)) * 8;
  return value <= upperBound + tolerance;
};

const structuralReferences = (block: PetraStructuralBlock): string[] => [
  ...(block.parent_block_id === undefined ? [] : [block.parent_block_id]),
  ...block.child_block_ids,
  ...(block.previous_block_id === undefined ? [] : [block.previous_block_id]),
  ...(block.next_block_id === undefined ? [] : [block.next_block_id]),
];

/**
 * The document validator needs only immutable Artifact identity, not byte-store
 * or acquisition behavior. Keeping this resolver structural lets durable
 * adapters reuse the same cross-record validation without depending on the
 * in-memory Artifact registry implementation.
 */
export interface DocumentArtifactResolver {
  getByArtifactId(artifactId: string):
    | {
        readonly artifact: {
          readonly artifact_id: string;
          readonly content_hash: string;
        };
      }
    | undefined;
}

export class InMemoryDocumentRegistry {
  readonly #artifactRegistry: DocumentArtifactResolver;
  readonly #documents = new Map<string, DeepReadonly<PetraParsedDocument>>();
  readonly #documentIdByParserRunId = new Map<string, string>();
  readonly #blocks = new Map<string, DeepReadonly<PetraStructuralBlock>>();
  readonly #spans = new Map<string, DeepReadonly<PetraSourceSpan>>();

  constructor(artifactRegistry: DocumentArtifactResolver) {
    this.#artifactRegistry = artifactRegistry;
  }

  get documentCount(): number {
    return this.#documents.size;
  }

  get blockCount(): number {
    return this.#blocks.size;
  }

  get spanCount(): number {
    return this.#spans.size;
  }

  getParsedDocument(
    parsedDocumentId: string,
  ): DeepReadonly<PetraParsedDocument> | undefined {
    return this.#documents.get(parsedDocumentId);
  }

  getStructuralBlock(
    structuralBlockId: string,
  ): DeepReadonly<PetraStructuralBlock> | undefined {
    return this.#blocks.get(structuralBlockId);
  }

  getSourceSpan(
    sourceSpanId: string,
  ): DeepReadonly<PetraSourceSpan> | undefined {
    return this.#spans.get(sourceSpanId);
  }

  registerParsedDocument(
    document: PetraParsedDocument,
  ): DeepReadonly<PetraParsedDocument> {
    const sourceArtifact = this.#artifactRegistry.getByArtifactId(
      document.source_artifact_id,
    )?.artifact;
    if (sourceArtifact === undefined) {
      throw new DocumentRegistrationError(
        "SOURCE_ARTIFACT_NOT_REGISTERED",
        `Source Artifact ${document.source_artifact_id} is not registered.`,
      );
    }
    if (sourceArtifact.content_hash !== document.source_artifact_content_hash) {
      throw new DocumentRegistrationError(
        "SOURCE_ARTIFACT_HASH_MISMATCH",
        "The ParsedDocument does not identify the registered source bytes.",
      );
    }
    if (
      this.#artifactRegistry.getByArtifactId(
        document.parser_output_artifact_id,
      ) === undefined
    ) {
      throw new DocumentRegistrationError(
        "PARSER_OUTPUT_ARTIFACT_NOT_REGISTERED",
        `Parser-output Artifact ${document.parser_output_artifact_id} is not registered.`,
      );
    }
    if (this.#documents.has(document.parsed_document_id)) {
      throw new DocumentRegistrationError(
        "PARSED_DOCUMENT_ID_ALREADY_REGISTERED",
        `ParsedDocument ID ${document.parsed_document_id} is already registered.`,
      );
    }
    if (this.#documentIdByParserRunId.has(document.parser_run_id)) {
      throw new DocumentRegistrationError(
        "PARSER_RUN_ID_ALREADY_REGISTERED",
        `ParserRun ${document.parser_run_id} already produced a ParsedDocument.`,
      );
    }
    const pageNumbers = new Set<number>();
    for (const page of document.pages) {
      if (pageNumbers.has(page.page_number)) {
        throw new DocumentRegistrationError(
          "DUPLICATE_PAGE_NUMBER",
          `ParsedDocument ${document.parsed_document_id} repeats page ${page.page_number}.`,
        );
      }
      pageNumbers.add(page.page_number);
    }

    const registered = immutableCopy(document);
    this.#documents.set(document.parsed_document_id, registered);
    this.#documentIdByParserRunId.set(
      document.parser_run_id,
      document.parsed_document_id,
    );
    return registered;
  }

  registerStructuralBlock(
    block: PetraStructuralBlock,
  ): DeepReadonly<PetraStructuralBlock> {
    const document = this.#documents.get(block.parsed_document_id);
    if (document === undefined) {
      throw new DocumentRegistrationError(
        "PARSED_DOCUMENT_NOT_REGISTERED",
        `ParsedDocument ${block.parsed_document_id} is not registered.`,
      );
    }
    const declaredIndex = document.block_ids.indexOf(block.structural_block_id);
    if (declaredIndex === -1) {
      throw new DocumentRegistrationError(
        "BLOCK_NOT_DECLARED",
        "The StructuralBlock is not declared by its ParsedDocument.",
      );
    }
    if (block.reading_order !== declaredIndex) {
      throw new DocumentRegistrationError(
        "READING_ORDER_MISMATCH",
        "StructuralBlock reading_order does not match the ParsedDocument block order.",
      );
    }
    if (this.#blocks.has(block.structural_block_id)) {
      throw new DocumentRegistrationError(
        "BLOCK_ID_ALREADY_REGISTERED",
        `StructuralBlock ID ${block.structural_block_id} is already registered.`,
      );
    }
    for (const reference of structuralReferences(block)) {
      if (!document.block_ids.includes(reference)) {
        throw new DocumentRegistrationError(
          "STRUCTURAL_REFERENCE_OUTSIDE_DOCUMENT",
          `Structural reference ${reference} is not declared by ParsedDocument ${document.parsed_document_id}.`,
        );
      }
    }
    for (const location of block.page_locations) {
      const page = document.pages.find(
        (candidate) => candidate.page_number === location.page_number,
      );
      if (page === undefined) {
        throw new DocumentRegistrationError(
          "PAGE_NOT_DECLARED",
          `StructuralBlock references undeclared page ${location.page_number}.`,
        );
      }
      for (const box of location.bounding_boxes) {
        if (
          !withinUpperBound(box.x + box.width, page.width) ||
          !withinUpperBound(box.y + box.height, page.height)
        ) {
          throw new DocumentRegistrationError(
            "REGION_OUT_OF_BOUNDS",
            `A StructuralBlock region extends beyond page ${page.page_number}.`,
          );
        }
      }
    }
    if (
      block.content.content_kind === "text" &&
      sha256Text(block.content.text) !== block.content.content_hash
    ) {
      throw new DocumentRegistrationError(
        "BLOCK_CONTENT_HASH_MISMATCH",
        `StructuralBlock ${block.structural_block_id} text does not match its content hash.`,
      );
    }
    if (block.content.content_kind === "structured_artifact") {
      const contentArtifact = this.#artifactRegistry.getByArtifactId(
        block.content.structured_artifact_id,
      )?.artifact;
      if (contentArtifact === undefined) {
        throw new DocumentRegistrationError(
          "BLOCK_CONTENT_ARTIFACT_NOT_REGISTERED",
          `StructuralBlock content Artifact ${block.content.structured_artifact_id} is not registered.`,
        );
      }
      if (contentArtifact.content_hash !== block.content.content_hash) {
        throw new DocumentRegistrationError(
          "BLOCK_CONTENT_HASH_MISMATCH",
          `StructuralBlock ${block.structural_block_id} does not identify the registered structured content bytes.`,
        );
      }
    }

    const registered = immutableCopy(block);
    this.#blocks.set(block.structural_block_id, registered);
    return registered;
  }

  attachSourceSpan(span: PetraSourceSpan): DeepReadonly<PetraSourceSpan> {
    if (this.#spans.has(span.source_span_id)) {
      throw new DocumentRegistrationError(
        "SOURCE_SPAN_ID_ALREADY_REGISTERED",
        `SourceSpan ID ${span.source_span_id} is already registered.`,
      );
    }
    const artifact = this.#artifactRegistry.getByArtifactId(
      span.artifact_id,
    )?.artifact;
    if (artifact === undefined) {
      throw new DocumentRegistrationError(
        "SOURCE_ARTIFACT_NOT_REGISTERED",
        `Source Artifact ${span.artifact_id} is not registered.`,
      );
    }
    if (artifact.content_hash !== span.artifact_content_hash) {
      throw new DocumentRegistrationError(
        "SOURCE_ARTIFACT_HASH_MISMATCH",
        "The SourceSpan does not identify the registered source bytes.",
      );
    }
    const document = this.#documents.get(span.parsed_document_id);
    if (document === undefined) {
      throw new DocumentRegistrationError(
        "PARSED_DOCUMENT_NOT_REGISTERED",
        `ParsedDocument ${span.parsed_document_id} is not registered.`,
      );
    }
    if (
      document.source_artifact_id !== span.artifact_id ||
      document.source_artifact_content_hash !== span.artifact_content_hash
    ) {
      throw new DocumentRegistrationError(
        "SPAN_ARTIFACT_MISMATCH",
        "The SourceSpan and ParsedDocument do not identify the same immutable Artifact.",
      );
    }
    if (document.parser_run_id !== span.parser_run_id) {
      throw new DocumentRegistrationError(
        "SPAN_PARSER_RUN_MISMATCH",
        "The SourceSpan does not identify the ParsedDocument parser run.",
      );
    }
    const block = this.#blocks.get(span.structural_block_id);
    if (
      block === undefined ||
      block.parsed_document_id !== span.parsed_document_id
    ) {
      throw new DocumentRegistrationError(
        "SPAN_BLOCK_MISMATCH",
        "The SourceSpan does not identify a registered block in its ParsedDocument.",
      );
    }
    if (!block.source_span_ids.includes(span.source_span_id)) {
      throw new DocumentRegistrationError(
        "SPAN_NOT_DECLARED",
        "The StructuralBlock does not declare this SourceSpan.",
      );
    }
    if (
      span.extraction.normalization_version !== document.normalization_version
    ) {
      throw new DocumentRegistrationError(
        "NORMALIZATION_VERSION_MISMATCH",
        "The SourceSpan extraction and ParsedDocument use different normalization versions.",
      );
    }

    const evidence = this.#validateSelector(span, document, block);
    if (
      span.verification.status === "exact_text_and_geometry" &&
      (!evidence.hasExactText || !evidence.hasPageRegion)
    ) {
      throw new DocumentRegistrationError(
        "VERIFICATION_EVIDENCE_MISMATCH",
        "Exact text-and-geometry verification requires both an exact quote and a page region.",
      );
    }
    if (span.verification.status === "normalized" && !evidence.hasExactText) {
      throw new DocumentRegistrationError(
        "VERIFICATION_EVIDENCE_MISMATCH",
        "Normalized verification requires retained exact selected text.",
      );
    }
    if (span.verification.status === "visual_only" && !evidence.hasPageRegion) {
      throw new DocumentRegistrationError(
        "VERIFICATION_EVIDENCE_MISMATCH",
        "Visual-only verification requires a page region.",
      );
    }

    const registered = immutableCopy(span);
    this.#spans.set(span.source_span_id, registered);
    return registered;
  }

  #validateSelector(
    span: PetraSourceSpan,
    document: DeepReadonly<PetraParsedDocument>,
    block: DeepReadonly<PetraStructuralBlock>,
  ): { hasExactText: boolean; hasPageRegion: boolean } {
    let hasExactText = false;
    let hasPageRegion = false;
    const componentKinds = new Set<string>();

    const visitTextQuote = (quote: TextQuote): void => {
      if (quote.end_codepoint <= quote.start_codepoint) {
        throw new DocumentRegistrationError(
          "TEXT_RANGE_INVALID",
          "A text quote must end after it starts.",
        );
      }
      if (
        quote.normalization_version !== document.normalization_version ||
        quote.normalization_version !== span.extraction.normalization_version
      ) {
        throw new DocumentRegistrationError(
          "NORMALIZATION_VERSION_MISMATCH",
          "The text quote and its ParsedDocument use different normalization versions.",
        );
      }
      if (quote.exact_text === undefined) return;
      hasExactText = true;
      if (sha256Text(quote.exact_text) !== quote.selected_text_hash) {
        throw new DocumentRegistrationError(
          "SELECTED_TEXT_HASH_MISMATCH",
          "The retained exact quote does not match its selected-text hash.",
        );
      }
      if (block.content.content_kind !== "text") {
        throw new DocumentRegistrationError(
          "SELECTED_TEXT_MISMATCH",
          "An exact text quote cannot resolve against a non-text StructuralBlock.",
        );
      }
      const codepoints = Array.from(block.content.text);
      if (quote.end_codepoint > codepoints.length) {
        throw new DocumentRegistrationError(
          "TEXT_RANGE_INVALID",
          "The text quote extends beyond its StructuralBlock.",
        );
      }
      const selected = codepoints
        .slice(quote.start_codepoint, quote.end_codepoint)
        .join("");
      if (selected !== quote.exact_text) {
        throw new DocumentRegistrationError(
          "SELECTED_TEXT_MISMATCH",
          "The Unicode code-point range does not resolve to the retained exact quote.",
        );
      }
      if (
        quote.prefix !== undefined &&
        !codepoints
          .slice(0, quote.start_codepoint)
          .join("")
          .endsWith(quote.prefix)
      ) {
        throw new DocumentRegistrationError(
          "QUOTE_CONTEXT_MISMATCH",
          "The quote prefix does not match its StructuralBlock context.",
        );
      }
      if (
        quote.suffix !== undefined &&
        !codepoints.slice(quote.end_codepoint).join("").startsWith(quote.suffix)
      ) {
        throw new DocumentRegistrationError(
          "QUOTE_CONTEXT_MISMATCH",
          "The quote suffix does not match its StructuralBlock context.",
        );
      }
    };

    const visitPageRegion = (pageRegion: PageRegion): void => {
      hasPageRegion = true;
      const page = document.pages.find(
        (candidate) => candidate.page_number === pageRegion.page_number,
      );
      if (page === undefined) {
        throw new DocumentRegistrationError(
          "PAGE_NOT_DECLARED",
          `SourceSpan references undeclared page ${pageRegion.page_number}.`,
        );
      }
      if (
        page.width !== pageRegion.page_width ||
        page.height !== pageRegion.page_height ||
        page.unit !== pageRegion.unit ||
        page.coordinate_origin !== pageRegion.coordinate_origin
      ) {
        throw new DocumentRegistrationError(
          "PAGE_COORDINATE_MISMATCH",
          "SourceSpan page dimensions or coordinate system differ from the ParsedDocument.",
        );
      }
      for (const region of pageRegion.regions) {
        const points =
          region.region_kind === "bounding_box"
            ? [
                { x: region.x, y: region.y },
                { x: region.x + region.width, y: region.y + region.height },
              ]
            : region.points;
        if (
          points.some(
            ({ x, y }) =>
              !withinUpperBound(x, page.width) ||
              !withinUpperBound(y, page.height),
          )
        ) {
          throw new DocumentRegistrationError(
            "REGION_OUT_OF_BOUNDS",
            `A SourceSpan region extends beyond page ${page.page_number}.`,
          );
        }
      }
    };

    const visitSectionPath = (sectionPath: SectionPath): void => {
      if (
        sectionPath.segments.length !== block.structural_path.length ||
        sectionPath.segments.some(
          (segment, index) => segment !== block.structural_path[index],
        )
      ) {
        throw new DocumentRegistrationError(
          "SPAN_BLOCK_MISMATCH",
          "The SourceSpan section path does not match its StructuralBlock.",
        );
      }
    };

    const visitLineRange = (lineRange: LineRange): void => {
      if (lineRange.end_line < lineRange.start_line) {
        throw new DocumentRegistrationError(
          "LINE_RANGE_INVALID",
          "A line range cannot end before it starts.",
        );
      }
    };

    const selector = span.selector;
    if (selector.selector_type === "text_quote") visitTextQuote(selector.quote);
    if (selector.selector_type === "page_region")
      visitPageRegion(selector.page_region);
    if (selector.selector_type === "section_path")
      visitSectionPath(selector.section_path);
    if (selector.selector_type === "line_range")
      visitLineRange(selector.line_range);
    if (selector.selector_type === "compound") {
      for (const component of selector.components) {
        if (componentKinds.has(component.component_kind)) {
          throw new DocumentRegistrationError(
            "DUPLICATE_SELECTOR_COMPONENT",
            `Compound selector repeats ${component.component_kind}.`,
          );
        }
        componentKinds.add(component.component_kind);
        if (component.component_kind === "text_quote")
          visitTextQuote(component.quote);
        if (component.component_kind === "page_region")
          visitPageRegion(component.page_region);
        if (component.component_kind === "section_path")
          visitSectionPath(component.section_path);
        if (component.component_kind === "line_range")
          visitLineRange(component.line_range);
      }
    }

    return { hasExactText, hasPageRegion };
  }
}
