/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraIntakeCopilotSession {
  schema_name: "petra.intake-copilot-session";
  schema_version: "1.0.0";
  content: {
    intake_session_id: string;
    thread_id: string;
    actor_id: string;
    policy: {
      managed_model_egress: true;
      retention: "owner_only_immutable_session";
      authority: "pre_project_advice_only";
      max_turns: 20;
      max_input_bytes: 160000;
      max_history_turns: 12;
      max_history_bytes: 48000;
      timeout_ms: 120000;
      price_observation: "per_call_price_unavailable";
      automatic_model_retry: false;
      provider_model: string;
    };
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    policy_hash: string;
    consent: {
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      accepted_policy_hash: string;
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      accepted_at: string;
      accepted_by: string;
    };
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    opened_at: string;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
