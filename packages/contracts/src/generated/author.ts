/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A canonical, possibly provisional identity for a person or organization credited on scholarly work.
 */
export interface PetraAuthor {
  schema_name: "petra.author";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is author.
   */
  author_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  author_kind: "person" | "organization" | "consortium";
  display_name: string;
  identity_status: "resolved" | "provisional" | "disputed";
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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
