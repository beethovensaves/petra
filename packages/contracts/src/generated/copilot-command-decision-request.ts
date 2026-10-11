/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCopilotCommandDecisionRequest {
  schema_name: "petra.copilot-command-decision-request";
  schema_version: "1.0.0";
  decision_id: string;
  proposal_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  proposal_output_hash: string;
  preview_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  preview_hash: string;
  decision: "accept" | "reject";
}
