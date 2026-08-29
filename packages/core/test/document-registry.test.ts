import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraParsedDocument,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  SelectorComponent,
} from "@petra/contracts";
import { describe, expect, it } from "vitest";

import { InMemoryArtifactRegistry } from "../src/artifact-registry.js";
import { InMemoryDocumentRegistry } from "../src/document-registry.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const sha256 = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const sha256Text = (value: string): string =>
  sha256(new TextEncoder().encode(value));

const registerArtifacts = (): InMemoryArtifactRegistry => {
  const registry = new InMemoryArtifactRegistry();
  const sourceArtifact = readFixture<PetraArtifact>("artifact");
  const sourceManifest =
    readFixture<PetraArtifactManifest>("artifact-manifest");
  const sourceRights = readFixture<PetraRightsDecision>("rights-decision");
  registry.register({
    artifact: sourceArtifact,
    manifest: sourceManifest,
    rightsDecision: sourceRights,
    bytes: new TextEncoder().encode("Petra artifact bytes\n"),
  });

  const parserBytes = new TextEncoder().encode('{"parser":"output"}');
  const parserHash = sha256(parserBytes);
  const parserArtifact = structuredClone(sourceArtifact);
  parserArtifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB8";
  parserArtifact.artifact_kind = "structured_text";
  parserArtifact.media_type = "application/json";
  parserArtifact.content_hash = parserHash;
  parserArtifact.byte_size = parserBytes.byteLength;

  const parserManifest = structuredClone(sourceManifest);
  parserManifest.artifact_manifest_id =
    "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB9";
  parserManifest.artifact_id = parserArtifact.artifact_id;
  parserManifest.rights_decision_id =
    "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FBA";
  parserManifest.origin = {
    origin_kind: "generated",
    generator_name: "petra-docling-adapter",
    generator_version: "1.0.0",
    generated_at: "2026-08-28T18:11:02.000Z",
    input_artifact_ids: [sourceArtifact.artifact_id],
  };
  parserManifest.storage_ref.object_key = `sha256/${parserHash.slice(7)}`;
  parserManifest.storage_ref.content_hash = parserHash;

  const parserRights = structuredClone(sourceRights);
  parserRights.rights_decision_id = parserManifest.rights_decision_id;
  parserRights.artifact_manifest_id = parserManifest.artifact_manifest_id;
  parserRights.source_location =
    "urn:petra:parser-output:01ARZ3NDEKTSV4RRFFQ69G5FB8";
  parserRights.observed_license = {
    statement:
      "Petra-generated parser output retained under source-copy terms.",
    source: "artifact",
  };
  parserRights.access_basis = "permission";
  parserRights.authorization_reference = "petra-local-processing/1.0.0";

  registry.register({
    artifact: parserArtifact,
    manifest: parserManifest,
    rightsDecision: parserRights,
    bytes: parserBytes,
  });
  return registry;
};

interface DocumentSetup {
  artifacts: InMemoryArtifactRegistry;
  documents: InMemoryDocumentRegistry;
  document: PetraParsedDocument;
  block: PetraStructuralBlock;
  span: PetraSourceSpan;
}

const setup = (registerBlock = true): DocumentSetup => {
  const artifacts = registerArtifacts();
  const documents = new InMemoryDocumentRegistry(artifacts);
  const document = readFixture<PetraParsedDocument>("parsed-document");
  const block = readFixture<PetraStructuralBlock>("structural-block");
  const span = readFixture<PetraSourceSpan>("source-span");
  documents.registerParsedDocument(document);
  if (registerBlock) documents.registerStructuralBlock(block);
  return { artifacts, documents, document, block, span };
};

const compoundComponent = <Kind extends SelectorComponent["component_kind"]>(
  span: PetraSourceSpan,
  kind: Kind,
): Extract<SelectorComponent, { component_kind: Kind }> => {
  if (span.selector.selector_type !== "compound") {
    throw new Error("The test fixture must use a compound selector.");
  }
  const component = span.selector.components.find(
    (candidate) => candidate.component_kind === kind,
  );
  if (component === undefined) throw new Error(`Missing ${kind} component.`);
  return component as Extract<SelectorComponent, { component_kind: Kind }>;
};

describe("ParsedDocument, StructuralBlock, and SourceSpan registration", () => {
  it("registers an immutable artifact-to-document-to-block-to-span chain", () => {
    const { documents, document, block, span } = setup();

    const registered = documents.attachSourceSpan(span);
    document.quality_state = "failed";
    block.content_layer = "ocr";
    span.verification.status = "unresolved";

    expect(documents.documentCount).toBe(1);
    expect(documents.blockCount).toBe(1);
    expect(documents.spanCount).toBe(1);
    expect(registered.artifact_id).toBe("artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1");
    expect(registered.verification.status).toBe("exact_text_and_geometry");
    expect(Object.isFrozen(registered.selector)).toBe(true);
    expect(
      documents.getParsedDocument(document.parsed_document_id)?.quality_state,
    ).toBe("complete");
    expect(
      documents.getStructuralBlock(block.structural_block_id)?.content_layer,
    ).toBe("source_native");
  });

  it.each([
    {
      name: "the wrong source hash",
      mutate: (document: PetraParsedDocument) => {
        document.source_artifact_content_hash =
          "sha256:0000000000000000000000000000000000000000000000000000000000000000";
      },
      code: "SOURCE_ARTIFACT_HASH_MISMATCH",
    },
    {
      name: "an unregistered parser output",
      mutate: (document: PetraParsedDocument) => {
        document.parser_output_artifact_id =
          "artifact_01ARZ3NDEKTSV4RRFFQ69G5FBB";
      },
      code: "PARSER_OUTPUT_ARTIFACT_NOT_REGISTERED",
    },
    {
      name: "duplicate page identities",
      mutate: (document: PetraParsedDocument) => {
        const page = document.pages[0];
        if (page === undefined) throw new Error("Fixture page missing.");
        document.pages.push(structuredClone(page));
      },
      code: "DUPLICATE_PAGE_NUMBER",
    },
  ])("rejects a ParsedDocument with $name atomically", ({ mutate, code }) => {
    const artifacts = registerArtifacts();
    const documents = new InMemoryDocumentRegistry(artifacts);
    const document = readFixture<PetraParsedDocument>("parsed-document");
    mutate(document);

    expect(() => documents.registerParsedDocument(document)).toThrowError(
      expect.objectContaining({ code }),
    );
    expect(documents.documentCount).toBe(0);
  });

  it.each([
    {
      name: "undeclared identity",
      mutate: (block: PetraStructuralBlock) => {
        block.structural_block_id =
          "structural_block_01ARZ3NDEKTSV4RRFFQ69G5FBB";
      },
      code: "BLOCK_NOT_DECLARED",
    },
    {
      name: "wrong reading order",
      mutate: (block: PetraStructuralBlock) => {
        block.reading_order = 1;
      },
      code: "READING_ORDER_MISMATCH",
    },
    {
      name: "out-of-page geometry",
      mutate: (block: PetraStructuralBlock) => {
        const box = block.page_locations[0]?.bounding_boxes[0];
        if (box === undefined) throw new Error("Fixture box missing.");
        box.width = 1000;
      },
      code: "REGION_OUT_OF_BOUNDS",
    },
    {
      name: "changed text beneath its hash",
      mutate: (block: PetraStructuralBlock) => {
        if (block.content.content_kind !== "text") {
          throw new Error("Fixture text missing.");
        }
        block.content.text = "Changed parser text.";
      },
      code: "BLOCK_CONTENT_HASH_MISMATCH",
    },
  ])("rejects a StructuralBlock with $name atomically", ({ mutate, code }) => {
    const { documents, block } = setup(false);
    mutate(block);

    expect(() => documents.registerStructuralBlock(block)).toThrowError(
      expect.objectContaining({ code }),
    );
    expect(documents.blockCount).toBe(0);
  });

  it.each([
    {
      name: "another Artifact hash",
      mutate: (span: PetraSourceSpan) => {
        span.artifact_content_hash =
          "sha256:0000000000000000000000000000000000000000000000000000000000000000";
      },
      code: "SOURCE_ARTIFACT_HASH_MISMATCH",
    },
    {
      name: "another parser run",
      mutate: (span: PetraSourceSpan) => {
        span.parser_run_id = "parser_run_01ARZ3NDEKTSV4RRFFQ69G5FBB";
      },
      code: "SPAN_PARSER_RUN_MISMATCH",
    },
    {
      name: "another StructuralBlock",
      mutate: (span: PetraSourceSpan) => {
        span.structural_block_id =
          "structural_block_01ARZ3NDEKTSV4RRFFQ69G5FBB";
      },
      code: "SPAN_BLOCK_MISMATCH",
    },
    {
      name: "an undeclared span ID",
      mutate: (span: PetraSourceSpan) => {
        span.source_span_id = "source_span_01ARZ3NDEKTSV4RRFFQ69G5FBB";
      },
      code: "SPAN_NOT_DECLARED",
    },
    {
      name: "a changed exact quote",
      mutate: (span: PetraSourceSpan) => {
        const component = compoundComponent(span, "text_quote");
        component.quote.exact_text = "measurable improvements";
      },
      code: "SELECTED_TEXT_HASH_MISMATCH",
    },
    {
      name: "a range beyond its block",
      mutate: (span: PetraSourceSpan) => {
        const component = compoundComponent(span, "text_quote");
        component.quote.end_codepoint = 100;
      },
      code: "TEXT_RANGE_INVALID",
    },
    {
      name: "different page dimensions",
      mutate: (span: PetraSourceSpan) => {
        const component = compoundComponent(span, "page_region");
        component.page_region.page_width = 613;
      },
      code: "PAGE_COORDINATE_MISMATCH",
    },
    {
      name: "out-of-page selector geometry",
      mutate: (span: PetraSourceSpan) => {
        const component = compoundComponent(span, "page_region");
        const region = component.page_region.regions[0];
        if (region?.region_kind !== "bounding_box") {
          throw new Error("Fixture bounding box missing.");
        }
        region.x = 600;
        region.width = 20;
      },
      code: "REGION_OUT_OF_BOUNDS",
    },
    {
      name: "a repeated selector component",
      mutate: (span: PetraSourceSpan) => {
        if (span.selector.selector_type !== "compound") {
          throw new Error("Fixture compound selector missing.");
        }
        span.selector.components.push({
          component_kind: "section_path",
          section_path: { segments: ["Results", "Paragraph 1"] },
        });
      },
      code: "DUPLICATE_SELECTOR_COMPONENT",
    },
    {
      name: "a different normalization version",
      mutate: (span: PetraSourceSpan) => {
        span.extraction.normalization_version = "petra-text/2.0.0";
      },
      code: "NORMALIZATION_VERSION_MISMATCH",
    },
  ])("rejects a SourceSpan with $name atomically", ({ mutate, code }) => {
    const { documents, span } = setup();
    mutate(span);

    expect(() => documents.attachSourceSpan(span)).toThrowError(
      expect.objectContaining({ code }),
    );
    expect(documents.spanCount).toBe(0);
  });

  it("interprets text positions as Unicode code points across runtimes", () => {
    const { documents, block, span } = setup(false);
    if (block.content.content_kind !== "text") {
      throw new Error("Fixture text block missing.");
    }
    block.content.text = "A 🪨 result.";
    block.content.content_hash = sha256Text(block.content.text);
    documents.registerStructuralBlock(block);

    const quote = compoundComponent(span, "text_quote").quote;
    quote.exact_text = "🪨 result";
    quote.selected_text_hash = sha256Text(quote.exact_text);
    quote.prefix = "A ";
    quote.suffix = ".";
    quote.start_codepoint = 2;
    quote.end_codepoint = 10;

    expect(() => documents.attachSourceSpan(span)).not.toThrow();
    expect(documents.spanCount).toBe(1);
  });
});
