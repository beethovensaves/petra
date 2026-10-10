/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraGraphPresentationContext {
  schema_name: "petra.graph-presentation-context";
  schema_version: "1.0.0";
  content: {
    /**
     * A Petra identifier whose kind is project.
     */
    project_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    graph_content_hash: string;
    parameters: {
      renderer: "native_working" | "examination_cycles";
      mode: "graph" | "text";
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      semantic_content_hash: string;
      /**
       * @maxItems 8
       */
      selected_keys:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string];
      /**
       * @maxItems 20
       */
      excluded_kinds:
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
    };
    layout_version: "petra.graph-layout@1.0.0";
    viewport: {
      width: number;
      height: number;
    };
    /**
     * @maxItems 250
     */
    nodes: {
      key: string;
      record_ref: {
        schema_name: string;
        schema_version: string;
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
      state: string;
      position: {
        x: number;
        y: number;
      };
    }[];
    /**
     * @maxItems 500
     */
    relationships: {
      key: string;
      subject_key: string;
      object_key: string;
      predicate: string;
    }[];
    omitted_nodes: number;
    omitted_relationships: number;
    has_more_history: boolean;
    /**
     * @maxItems 250
     */
    legend: {
      kind: string;
      meaning: string;
    }[];
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    peer_content_hash: string;
    authority: "presentation_only";
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
