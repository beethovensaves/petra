/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraProjectExaminationAuthorityRequest {
  schema_name: "petra.project-examination-authority-request";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  graph_content_hash: string;
  operation: "authorize_own_examination";
  review: {
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    proposed_content_hash: string;
    rationale: string;
    reviewed_at: string;
  };
}
