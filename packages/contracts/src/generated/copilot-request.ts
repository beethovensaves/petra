/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCopilotRequest {
  schema_name: "petra.copilot-request";
  schema_version: "1.0.0";
  project_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  context_hash: string;
  parent_run_id: string | null;
  /**
   * @maxItems 8
   */
  focus_keys:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string];
}
