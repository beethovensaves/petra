/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraCopilotContext {
  schema_name: "petra.copilot-context";
  schema_version: "1.0.0";
  project_id: string;
  basis: {
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    project_revision: number;
    definition: {
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
      content_hash: string;
    };
    objective: {
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
      content_hash: string;
    } | null;
    event_position: number;
    stream_revision: number;
  };
  project_label: string;
  objective_statement: string;
  definition_family: string;
  /**
   * @maxItems 60
   */
  records: {
    key: string;
    ref: {
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
    kind: string;
    label: string;
    text?: string;
    destination: string;
    /**
     * Exact admitted native wording. Absent on metadata-only, stale, oversized, or egress-withheld records.
     */
    reportable_text?: string;
  }[];
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
