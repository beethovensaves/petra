/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type RepresentationSummary = {
  extent: "identity_only" | "partial" | "complete" | "restricted";
  extent_label: string;
  document_ref?: ExactRef;
  source_format?:
    "pdf" | "html" | "xml" | "json" | "plain_text" | "code" | "image" | "other";
  document_language?: string;
  quality_state?: "complete" | "partial" | "needs_ocr" | "failed";
  page_count: number;
  block_count: number;
  source_span_count: number;
  preview?: Preview;
};

/**
 * A read-only, snapshot-consistent source composition from the M1 scholarly ProjectSource binding and its authority chain.
 */
export interface PetraProjectSourceView {
  schema_name: "petra.project-source-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_source_id: string;
  content: SourceViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface SourceViewContent {
  binding: BindingSummary;
  identity: IdentitySummary;
  copy: CopySummary;
  rights: RightsSummary;
  representation: RepresentationSummary;
  downstream_use: DownstreamUse;
  authority: AuthorityPosition;
}
export interface BindingSummary {
  binding_kind: "scientific_work_version";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  project_definition_ref: ExactRef;
  source_role: string;
  source_role_label: string;
  status: "active" | "excluded";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  added_at: string;
}
export interface ExactRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface IdentitySummary {
  work_ref: ExactRef;
  title: string;
  work_kind:
    | "journal_article"
    | "conference_paper"
    | "preprint"
    | "thesis"
    | "book"
    | "chapter"
    | "other";
  identity_status: "resolved" | "provisional" | "disputed";
  work_version_ref: ExactRef;
  version_label: string;
  publication_status:
    | "preprint"
    | "peer_reviewed"
    | "accepted"
    | "corrected"
    | "retracted"
    | "unknown";
  published_date?: PublishedDate;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  creators: [CreatorSummary, ...CreatorSummary[]];
}
export interface PublishedDate {
  precision: "year" | "month" | "day";
  value: string;
}
export interface CreatorSummary {
  author_ref: ExactRef;
  display_name: string;
  author_kind: "person" | "organization" | "consortium";
  identity_status: "resolved" | "provisional" | "disputed";
}
export interface CopySummary {
  manifest_ref: ExactRef;
  artifact_ref: ExactRef;
  artifact_kind:
    | "pdf"
    | "html"
    | "structured_text"
    | "dataset"
    | "code"
    | "environment_lock"
    | "run_output"
    | "image"
    | "export";
  media_type: string;
  byte_size: number;
  origin_kind: "acquired" | "user_supplied" | "generated";
  source_location: string;
  original_filename?: string;
  availability: "available";
  integrity_status: "verified" | "verified_with_warnings";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface RightsSummary {
  rights_ref: ExactRef;
  license_status: "known" | "unknown" | "restricted";
  license_label: string;
  access_basis:
    | "open_license"
    | "public_repository"
    | "subscription"
    | "user_supplied"
    | "permission"
    | "unknown";
  decision_status:
    "verified" | "inferred" | "unknown" | "conflicting" | "restricted";
  permissions: Permissions;
  conditions: (
    | "attribution"
    | "notice"
    | "noncommercial"
    | "share_alike"
    | "no_derivatives"
  )[];
  policy_version: string;
}
export interface Permissions {
  store_raw_bytes: boolean;
  parse: boolean;
  index: boolean;
  embed: boolean;
  send_selected_text_remotely: boolean;
  quote_publicly: boolean;
  redistribute_artifact: boolean;
}
export interface Preview {
  span_ref: ExactRef;
  structural_block_ref: ExactRef;
  heading: string;
  locator: string;
  text: string;
  verification_status:
    | "exact_text_and_geometry"
    | "normalized"
    | "visual_only"
    | "manual_alignment"
    | "unresolved";
}
export interface DownstreamUse {
  claim_count: number;
  assertion_count: number;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
