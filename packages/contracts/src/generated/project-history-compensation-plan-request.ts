/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An explicit single-user confirmation of one exact, unexpired Project History compensation preview reference. The request supplies no Actor, grant, command identity, or execution authority.
 */
export interface PetraProjectHistoryCompensationPlanRequest {
  schema_name: "petra.project-history-compensation-plan-request";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  preview_ref: {
    schema_name: "petra.project-history-compensation-preview-view";
    schema_version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    binding_hash: string;
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    issued_at: string;
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    valid_through: string;
  };
  confirmation: {
    confirmed: true;
    reason: string;
    approval_rationale: string;
  };
}
