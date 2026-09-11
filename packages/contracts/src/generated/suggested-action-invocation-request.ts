/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The client-supplied portion of one exact idempotent SuggestedAction invocation. Actor, grant, Project, Work, interaction, and trace identities remain server-owned.
 */
export interface PetraSuggestedActionInvocationRequest {
  schema_name: "petra.suggested-action-invocation-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  inquiry_result_link_id: string;
  expected_action_ref: SuggestedActionRef;
  response_depth: "current_graph";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
