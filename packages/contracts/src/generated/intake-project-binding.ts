/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraIntakeProjectBinding {
  schema_name: "petra.intake-project-binding";
  schema_version: "1.0.0";
  content: {
    intake_session_ref: {
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
    };
    actor_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    definition_draft_hash: string;
    creation_command_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    creation_receipt_hash: string;
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    project_thread_id: string;
    /**
     * @maxItems 20
     */
    original_turns:
      | []
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ]
      | [
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
          {
            run_id: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            record_hash: string;
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            terminal_hash: string;
          },
        ];
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    bound_at: string;
    authority: "human_reviewed_creation_binding";
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
