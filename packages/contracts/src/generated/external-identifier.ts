/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A source-observed external alias bound to the exact scholarly identity level it identifies.
 */
export interface PetraExternalIdentifier {
  schema_name: "petra.external-identifier";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is external_identifier.
   */
  external_identifier_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  subject: WorkSubject | WorkVersionSubject | AuthorSubject;
  namespace:
    | "doi"
    | "openalex_work"
    | "semantic_scholar_work"
    | "acl_anthology"
    | "arxiv"
    | "pmid"
    | "isbn"
    | "orcid"
    | "openalex_author"
    | "repository_url";
  normalized_value: string;
  source_name: string;
  verification_status:
    "verified" | "source_reported" | "unverified" | "disputed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  observed_at: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface WorkSubject {
  subject_kind: "work";
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string;
}
export interface WorkVersionSubject {
  subject_kind: "work_version";
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
}
export interface AuthorSubject {
  subject_kind: "author";
  /**
   * A Petra identifier whose kind is author.
   */
  author_id: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
