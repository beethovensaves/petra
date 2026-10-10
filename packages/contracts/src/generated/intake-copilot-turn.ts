/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraIntakeCopilotTurn {
  schema_name: "petra.intake-copilot-turn";
  schema_version: "1.0.0";
  run_id: string;
  intake_session_id: string;
  thread_id: string;
  actor_id: string;
  parent_run_id: string | null;
  question: string;
  context: PetraIntakeCopilotContext;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  instance_id: string;
  terminal?: {
    state: "completed" | "failed" | "cancelled";
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    finished_at: string;
    output?: PetraCopilotOutput;
    error?: string;
    model?: string;
    provider_thread_id?: string;
    provider_turn_id?: string;
  };
  input_manifest?: PetraIntakeCopilotInputManifest;
}
export interface PetraIntakeCopilotContext {
  schema_name: "petra.intake-copilot-context";
  schema_version: "1.0.0";
  content: {
    intake_session_id: string;
    actor_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    session_record_hash: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    policy_hash: string;
    outcome_wording: string | null;
    definition_draft_ref: {
      /**
       * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
       */
      record_id: string;
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      revision: number;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      record_hash: string;
    } | null;
    /**
     * @maxItems 0
     */
    records: [];
    /**
     * @minItems 1
     * @maxItems 20
     */
    limitations:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string, string]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      | [
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
          string,
        ];
    authority: "pre_project_advice_only";
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface PetraCopilotOutput {
  schema_name: "petra.copilot-output";
  schema_version: "1.0.0";
  authority: "advisory_only";
  /**
   * @minItems 1
   * @maxItems 24
   */
  blocks: [
    {
      kind: "source_report" | "inference" | "advice" | "question";
      text: string;
      /**
       * @maxItems 20
       */
      citations:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ];
    } & {
      kind: "source_report" | "inference" | "advice" | "question";
      text: string;
      /**
       * @maxItems 20
       */
      citations:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ];
    },
    ...({
      kind: "source_report" | "inference" | "advice" | "question";
      text: string;
      /**
       * @maxItems 20
       */
      citations:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ];
    } & {
      kind: "source_report" | "inference" | "advice" | "question";
      text: string;
      /**
       * @maxItems 20
       */
      citations:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ]
        | [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ];
    })[],
  ];
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
