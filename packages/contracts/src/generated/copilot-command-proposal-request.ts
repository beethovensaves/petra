/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCopilotCommandProposalRequest {
  schema_name: "petra.copilot-command-proposal-request";
  schema_version: "1.0.0";
  proposal_id: string;
  origin_run_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  expected_context_hash: string;
}
