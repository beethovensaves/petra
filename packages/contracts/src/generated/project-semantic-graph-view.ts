/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraProjectSemanticGraphView {
  schema_name: "petra.project-semantic-graph-view";
  schema_version: "1.0.0";
  project_id: string;
  content: {
    project_label: string;
    definition_family: string;
    definition_ref: {
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
    authority: {
      event_position: number;
      stream_revision: number;
    };
    query: {
      kind: "current_registered_working_heads";
      max_candidates: 50;
      max_relationships: 100;
      authority_effect: "none";
    };
    /**
     * @maxItems 250
     */
    nodes: {
      key: string;
      semantic_key: string;
      label: string;
      summary: string;
      layer: "working" | "reference";
      record_ref: {
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
        schema_name: string;
        schema_version: string;
      };
      candidate_ref?: {
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
        schema_name: string;
        schema_version: string;
      };
      native_record?: {
        [k: string]: unknown;
      };
      material_state: "available" | "metadata_only" | "definition_stale";
      remote_context?: {
        permitted: boolean;
        reason: string;
        /**
         * @maxItems 20
         */
        rights_refs:
          | []
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ]
          | [
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
              {
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
                schema_name: string;
                schema_version: string;
              },
            ];
      };
      /**
       * @maxItems 10
       */
      source_passages?:
        | []
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ]
        | [
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
            {
              span: PetraSourceSpan;
              project_source_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              rights_ref: {
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
                schema_name: string;
                schema_version: string;
              };
              remote_permitted: boolean;
            },
          ];
    }[];
    /**
     * @maxItems 100
     */
    relationships: {
      key: string;
      semantic_key: string;
      predicate: string;
      subject_key: string;
      object_key: string;
      record_ref: {
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
        schema_name: string;
        schema_version: string;
      };
    }[];
    omitted_candidates: number;
    omitted_relationships: number;
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
    objective_ref?: TargetClaimRef | null;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
/**
 * A stable, verifiable region of exactly one immutable source Artifact, aligned through one ParsedDocument and StructuralBlock.
 */
export interface PetraSourceSpan {
  schema_name: "petra.source-span";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is source_span.
   */
  source_span_id: string & string;
  revision: 1;
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  artifact_content_hash: string;
  /**
   * A Petra identifier whose kind is parsed_document.
   */
  parsed_document_id: string & string;
  /**
   * A Petra identifier whose kind is parser_run.
   */
  parser_run_id: string & string;
  /**
   * A Petra identifier whose kind is structural_block.
   */
  structural_block_id: string & string;
  selector_schema_version: "1.0.0";
  selector:
    | TextQuoteSelector
    | PageRegionSelector
    | SectionPathSelector
    | JsonPointerSelector
    | LineRangeSelector
    | CompoundSelector;
  extraction: Extraction;
  verification: Verification;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface TextQuoteSelector {
  selector_type: "text_quote";
  quote: TextQuote;
}
export interface TextQuote {
  exact_text?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  selected_text_hash: string;
  prefix?: string;
  suffix?: string;
  start_codepoint: number;
  end_codepoint: number;
  normalization_version: string;
}
export interface PageRegionSelector {
  selector_type: "page_region";
  page_region: PageRegion;
}
export interface PageRegion {
  page_number: number;
  page_width: number;
  page_height: number;
  unit: "pt" | "px" | "mm";
  coordinate_origin: "top_left" | "bottom_left";
  /**
   * @minItems 1
   * @maxItems 10000
   */
  regions: [BoundingBox | Polygon, ...(BoundingBox | Polygon)[]];
}
export interface BoundingBox {
  region_kind: "bounding_box";
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Polygon {
  region_kind: "polygon";
  /**
   * @minItems 3
   * @maxItems 100
   */
  points: [Point, Point, Point, ...Point[]];
}
export interface Point {
  x: number;
  y: number;
}
export interface SectionPathSelector {
  selector_type: "section_path";
  section_path: SectionPath;
}
export interface SectionPath {
  /**
   * @minItems 1
   * @maxItems 100
   */
  segments: [string, ...string[]];
}
export interface JsonPointerSelector {
  selector_type: "json_pointer";
  json_pointer: JsonPointer;
}
export interface JsonPointer {
  pointer: string;
}
export interface LineRangeSelector {
  selector_type: "line_range";
  line_range: LineRange;
}
export interface LineRange {
  start_line: number;
  end_line: number;
}
export interface CompoundSelector {
  selector_type: "compound";
  /**
   * @minItems 2
   * @maxItems 20
   */
  components:
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ]
    | [
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
        (
          | {
              component_kind: "text_quote";
              quote: TextQuote;
            }
          | {
              component_kind: "page_region";
              page_region: PageRegion;
            }
          | {
              component_kind: "section_path";
              section_path: SectionPath;
            }
          | {
              component_kind: "json_pointer";
              json_pointer: JsonPointer;
            }
          | {
              component_kind: "line_range";
              line_range: LineRange;
            }
        ),
      ];
}
export interface Extraction {
  method:
    | "embedded_text"
    | "ocr"
    | "structured_source"
    | "parser_alignment"
    | "manual_selection"
    | "visual_region";
  method_version: string;
  normalization_version: string;
}
export interface Verification {
  status:
    | "exact_text_and_geometry"
    | "normalized"
    | "visual_only"
    | "manual_alignment"
    | "unresolved";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  verified_at: string;
  /**
   * @maxItems 100
   */
  transformations: string[];
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string & string;
  actor_kind: "human" | "service" | "model";
}
export interface TargetClaimRef {
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
}
