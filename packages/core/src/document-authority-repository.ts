import type {
  PetraParsedDocument,
  PetraSourceSpan,
  PetraStructuralBlock,
} from "@petra/contracts";

/**
 * One authoritative parser interpretation. Blocks and SourceSpans are accepted
 * atomically because neither is meaningful outside the exact ParsedDocument,
 * parser run, and immutable source bytes that declare it.
 */
export interface PersistDocumentBundleInput {
  /** The exact immutable acquisition whose RightsDecision authorized parsing. */
  sourceArtifactManifestId: string;
  document: PetraParsedDocument;
  blocks: readonly PetraStructuralBlock[];
  spans: readonly PetraSourceSpan[];
}

export interface RegisteredDocumentBundle {
  sourceArtifactManifestId: string;
  document: PetraParsedDocument;
  blocks: PetraStructuralBlock[];
  spans: PetraSourceSpan[];
}

export interface DocumentAuthorityRepository {
  registerDocumentBundle(
    input: PersistDocumentBundleInput,
  ): Promise<RegisteredDocumentBundle>;
  getDocumentBundle(
    parsedDocumentId: string,
  ): Promise<RegisteredDocumentBundle | undefined>;
  getParsedDocument(
    parsedDocumentId: string,
  ): Promise<PetraParsedDocument | undefined>;
  getStructuralBlock(
    structuralBlockId: string,
  ): Promise<PetraStructuralBlock | undefined>;
  getSourceSpan(sourceSpanId: string): Promise<PetraSourceSpan | undefined>;
  getSourceSpansForArtifact(artifactId: string): Promise<PetraSourceSpan[]>;
}
