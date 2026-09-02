/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type InteractionRunId = string;
export type InteractionInterruptId = string;

/**
 * A non-authoritative researcher response to one exact review interrupt and ChangeSet. Authentication and capability context are supplied by the server, not this payload.
 */
export interface PetraReviewInterruptResponse {
  schema_name: "petra.review-interrupt-response";
  schema_version: "1.0.0";
  client_response_id: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  interaction_run_id: InteractionRunId;
  interrupt_ref: InterruptRef;
  change_set_ref: ChangeSetRef;
  decision: "accept" | "reject";
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  decided_at: string;
}
export interface InterruptRef {
  interaction_interrupt_id: InteractionInterruptId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ChangeSetRef {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
