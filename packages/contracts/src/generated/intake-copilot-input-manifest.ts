/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraIntakeCopilotInputManifest {
  schema_name: "petra.intake-copilot-input-manifest";
  schema_version: "1.0.0";
  content: {
    run_id: string;
    intake_session_id: string;
    thread_id: string;
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
    retained_history_count: number;
    included_history_count: number;
    /**
     * @maxItems 20
     */
    history:
      | []
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ]
      | [
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
          {
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
              | "included_same_session"
              | "withheld_changed_policy"
              | "excluded_history_budget";
          },
        ];
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
