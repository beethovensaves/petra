/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCopilotInputManifest {
  schema_name: "petra.copilot-input-manifest";
  schema_version: "1.0.0";
  content: {
    run_id: string;
    thread_id: string;
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    actor_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    context_hash: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    profile_hash: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    input_payload_hash: string;
    input_bytes: number;
    history_bytes: number;
    history_query_limit: 200;
    history_query_may_have_omissions: boolean;
    retained_history_count: number;
    excluded_history_count: number;
    /**
     * @maxItems 200
     */
    history: {
      run_id: string;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      context_hash: string;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      question_hash: string;
      answer_hash: string | null;
      disclosure:
        | "included_current_basis"
        | "withheld_changed_basis"
        | "excluded_history_budget";
    }[];
    /**
     * @maxItems 60
     */
    context_record_keys: string[];
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    prepared_at: string;
    authority: "advisory_input_only";
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
