/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CitationLocator =
  | {
      locator_kind: "page" | "section" | "paragraph" | "figure" | "table";
      value: string;
    }
  | {
      locator_kind: "source_span";
      /**
       * A Petra identifier whose kind is source_span.
       */
      source_span_id: string & string;
    };

/**
 * An immutable citation manifest over canonical Petra WorkVersions, exact DraftSpans, source depth, identity warnings, and requested render formats.
 */
export interface PetraCitationBundle {
  schema_name: "petra.citation-bundle";
  schema_version: "1.0.0";
  citation_bundle_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  draft_ref: DraftRef;
  evidence_packet_ref: EvidencePacketRef;
  content: CitationContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
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
export interface EvidencePacketRef {
  evidence_packet_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CitationContent {
  style: CitationStyle;
  /**
   * @minItems 1
   */
  export_formats: [
    "inline" | "markdown" | "latex" | "bibtex" | "csl_json",
    ...("inline" | "markdown" | "latex" | "bibtex" | "csl_json")[],
  ];
  /**
   * @minItems 1
   * @maxItems 100000
   */
  citations: [CitationEntry, ...CitationEntry[]];
  /**
   * @maxItems 1000
   */
  bibliography_artifacts: BibliographyArtifactRef[];
}
export interface CitationStyle {
  style_kind: "csl" | "bibtex" | "plain";
  style_name: string;
  style_version: string;
}
export interface CitationEntry {
  citation_id: string & string;
  bibliography_key: string;
  work_ref: WorkRef;
  work_version_ref: WorkVersionCitationRef;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  author_refs: [AuthorCitationRef, ...AuthorCitationRef[]];
  /**
   * @maxItems 1000
   */
  external_identifier_refs: ExternalIdentifierCitationRef[];
  metadata: CitationMetadata;
  identity_status: "resolved" | "provisional" | "disputed";
  metadata_completeness: "complete" | "partial" | "conflicted";
  /**
   * @maxItems 1000
   */
  identity_warnings: IdentityWarning[];
  /**
   * @minItems 1
   */
  purposes: [
    "evidence" | "background" | "method" | "data" | "software" | "quotation",
    ...(
      "evidence" | "background" | "method" | "data" | "software" | "quotation"
    )[],
  ];
  /**
   * @minItems 1
   * @maxItems 100000
   */
  linked_draft_span_ids: [string & string, ...(string & string)[]];
  locator: CitationLocator;
  source_access: CitationSourceAccess;
}
export interface WorkRef {
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkVersionCitationRef {
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface AuthorCitationRef {
  /**
   * A Petra identifier whose kind is author.
   */
  author_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  position: number;
  display_name: string;
}
export interface ExternalIdentifierCitationRef {
  /**
   * A Petra identifier whose kind is external_identifier.
   */
  external_identifier_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  namespace:
    | "doi"
    | "openalex_work"
    | "semantic_scholar_work"
    | "acl_anthology"
    | "arxiv"
    | "pmid"
    | "isbn"
    | "repository_url";
  normalized_value: string;
  verification_status:
    "verified" | "source_reported" | "unverified" | "disputed";
}
export interface CitationMetadata {
  title: string;
  work_kind:
    | "journal_article"
    | "conference_paper"
    | "preprint"
    | "thesis"
    | "book"
    | "chapter"
    | "other";
  version_label: string;
  publication_status:
    | "preprint"
    | "peer_reviewed"
    | "accepted"
    | "corrected"
    | "retracted"
    | "unknown";
  published_date:
    | null
    | (
        | {
            precision: "year";
            value: string;
          }
        | {
            precision: "month";
            value: string;
          }
        | {
            precision: "day";
            value: string;
          }
      );
}
export interface IdentityWarning {
  code: string;
  message: string;
}
export interface CitationSourceAccess {
  processing_depth:
    | "metadata_only"
    | "abstract_only"
    | "full_text_structured"
    | "full_text_analyzed";
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_ids: (string & string)[];
}
export interface BibliographyArtifactRef {
  format: "markdown" | "latex" | "bibtex" | "csl_json";
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
