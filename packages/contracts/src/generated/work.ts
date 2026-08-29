/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The canonical identity of a scholarly work across its supported versions and artifacts.
 */
export interface PetraWork {
  schema_name: "petra.work";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
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
  /**
   * @minItems 1
   */
  author_credits: [AuthorCredit, ...AuthorCredit[]];
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface AuthorCredit {
  /**
   * A Petra identifier whose kind is author.
   */
  author_id: string & string;
  position: number;
  credit_role: "author" | "editor";
  corresponding?: boolean;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
