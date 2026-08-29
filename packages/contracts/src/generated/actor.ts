/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An actor that can create, propose, review, or execute Petra work.
 */
export interface PetraActor {
  schema_name: "petra.actor";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
  display_name: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
