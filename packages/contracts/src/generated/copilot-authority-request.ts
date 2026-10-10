/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCopilotAuthorityRequest {
  schema_name: "petra.copilot-authority-request";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  command_id: string;
  idempotency_key: string;
  proposal: ConversationAuthorityProposal;
  review: ConversationAuthorityReview;
}
export interface ConversationAuthorityProposal {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  project_record_hash: string;
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  allowed_commands: ["RunProjectCopilot"];
  limits: {
    max_wall_time_ms: 120000;
    max_output_bytes: 256000;
    max_attempts: 1;
    max_parallelism: 1;
  };
  domain_authority: false;
}
export interface ConversationAuthorityReview {
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  proposed_content_hash: string;
  /**
   * Original client-reported review time. The owner accepts at most one second of clock skew against the actual database transaction time; the original review and actual receipt/grant times remain separately retained.
   */
  reviewed_at: string;
}
