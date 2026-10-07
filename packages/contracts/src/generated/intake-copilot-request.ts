/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraIntakeCopilotRequest {
  schema_name: "petra.intake-copilot-request";
  schema_version: "1.0.0";
  intake_session_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  context_hash: string;
  parent_run_id: string | null;
}
