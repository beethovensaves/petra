/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export interface PetraProjectExaminationView {
  schema_name: "petra.project-examination-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  graph: PetraProjectSemanticGraphView;
  profile: PetraAssessmentProfile | null;
  policy: PetraAssessmentPolicy | null;
  /**
   * @maxItems 100
   */
  records: (
    | PetraHypothesis
    | PetraHypothesisAssessment
    | PetraPostureDecision
    | PetraCycleDisposition
  )[];
  /**
   * @maxItems 100
   */
  freshness: {
    record_ref: TargetClaimRef;
    state: "current" | "stale" | "invalidated" | "profile_unavailable";
    /**
     * @maxItems 8
     */
    affected_axes:
      | []
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string];
  }[];
  has_more: boolean;
  next_sequence?: number;
  authorization: {
    state: "available" | "unavailable";
    reason: string;
  };
  /**
   * @maxItems 30
   */
  limitations: string[];
  /**
   * @maxItems 100
   */
  receipts: PetraProjectExaminationReceipt[];
  owner_setup?: {
    state: "available" | "unavailable";
    reason: string;
  };
  scene?: PetraProjectExaminationScene;
}
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
  actor_id: string;
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
export interface PetraAssessmentProfile {
  schema_name: "petra.assessment-profile";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  assessment_profile_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  content: {
    semantic_key: string;
    label: string;
    purpose: string;
    subject_schema: "petra.hypothesis";
    target_schema: "petra.claim";
    /**
     * @maxItems 30
     */
    criteria: {
      key: string;
      label: string;
      method: string;
      required_for_satisfied: boolean;
      /**
       * @maxItems 3
       */
      permitted_origins:
        | []
        | ["human_judgment" | "deterministic_rule" | "model_proposal"]
        | [
            "human_judgment" | "deterministic_rule" | "model_proposal",
            "human_judgment" | "deterministic_rule" | "model_proposal",
          ]
        | [
            "human_judgment" | "deterministic_rule" | "model_proposal",
            "human_judgment" | "deterministic_rule" | "model_proposal",
            "human_judgment" | "deterministic_rule" | "model_proposal",
          ];
      /**
       * @maxItems 10
       */
      required_evidence_schemas:
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
          ];
    }[];
    /**
     * @maxItems 50
     */
    finding_types: {
      key: string;
      label: string;
      axis:
        | "warrant"
        | "scientific_standing"
        | "alternative_coverage"
        | "project_dependence"
        | "research_stakes";
      /**
       * @maxItems 20
       */
      permitted_summaries:
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
      /**
       * @maxItems 30
       */
      criterion_keys: string[];
    }[];
    /**
     * @maxItems 30
     */
    limitations: string[];
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  registered_at: string;
}
export interface PetraAssessmentPolicy {
  schema_name: "petra.assessment-policy";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  assessment_policy_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  content: {
    semantic_key: string;
    label: string;
    profile_ref: TargetClaimRef;
    activation: "authorized_human_review";
    /**
     * @maxItems 6
     */
    allowed_dispositions:
      | []
      | [
          | "supporting_within_scope"
          | "challenging_within_scope"
          | "mixed"
          | "insufficient"
          | "deferred"
          | "further_cycle",
        ]
      | [
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
        ]
      | [
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
        ]
      | [
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
        ]
      | [
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
        ]
      | [
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
          (
            | "supporting_within_scope"
            | "challenging_within_scope"
            | "mixed"
            | "insufficient"
            | "deferred"
            | "further_cycle"
          ),
        ];
    /**
     * @maxItems 30
     */
    obligation_types: {
      key: string;
      label: string;
      /**
       * @maxItems 30
       */
      criterion_keys: string[];
      enforcement:
        "advisory" | "required_for_transition" | "required_for_action";
    }[];
    waiver_policy: "unavailable";
    numerical_rules: "unavailable";
    /**
     * @maxItems 30
     */
    limitations: string[];
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  registered_at: string;
}
export interface PetraHypothesis {
  schema_name: "petra.hypothesis";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  hypothesis_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  project_id: string;
  content: {
    ordinal: string;
    descriptor: string;
    target_claim_ref: TargetClaimRef;
    rationale: string;
    /**
     * @minItems 0
     * @maxItems 50
     */
    falsification_conditions: string[];
    development:
      "seed" | "articulated" | "structured" | "test_ready" | "developed";
    lifecycle: "active" | "paused" | "retired" | "superseded";
    supersedes_ref: {
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
    } | null;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface PetraHypothesisAssessment {
  schema_name: "petra.hypothesis-assessment";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  hypothesis_assessment_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  project_id: string;
  content: {
    subject_ref: {
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
    target_claim_ref: {
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
    basis: {
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
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      graph_content_hash: string;
      event_position: number;
      stream_revision: number;
      query_kind: "current_registered_working_heads";
      objective_ref?: TargetClaimRef | null;
    };
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    as_of: string;
    perspective: "present_day" | "historical";
    scope: ScientificScope;
    profile_ref: {
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
    policy_ref: {
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
    /**
     * @minItems 0
     * @maxItems 50
     */
    criteria: {
      criterion_key: string;
      result: "passed" | "failed" | "unknown";
      method: string;
      /**
       * @minItems 0
       * @maxItems 30
       */
      evidence_refs: {
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
      }[];
      explanation: string;
      origin: "deterministic_rule" | "human_judgment" | "model_proposal";
      /**
       * @minItems 0
       * @maxItems 50
       */
      limitations: string[];
    }[];
    /**
     * @minItems 0
     * @maxItems 50
     */
    findings: {
      finding_key: string;
      type_key: string;
      axis:
        | "development"
        | "activity"
        | "warrant"
        | "lifecycle"
        | "scientific_standing"
        | "alternative_coverage"
        | "project_dependence"
        | "research_stakes";
      explanation: string;
      /**
       * @minItems 0
       * @maxItems 50
       */
      evidence_refs: {
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
      }[];
      /**
       * @minItems 0
       * @maxItems 50
       */
      criterion_keys: string[];
      origin:
        | "deterministic_rule"
        | "human_judgment"
        | "model_proposal"
        | "policy_derivation";
      review_state: "partial" | "provisional" | "reviewed" | "disputed";
      /**
       * @minItems 0
       * @maxItems 50
       */
      material_unknowns: string[];
      /**
       * @minItems 0
       * @maxItems 50
       */
      limitations: string[];
    }[];
    /**
     * @minItems 0
     * @maxItems 8
     */
    axes:
      | []
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ]
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ]
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ]
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ]
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ]
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ]
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ]
      | [
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
          {
            axis:
              | "development"
              | "activity"
              | "warrant"
              | "lifecycle"
              | "scientific_standing"
              | "alternative_coverage"
              | "project_dependence"
              | "research_stakes";
            summary: string;
            /**
             * @minItems 0
             * @maxItems 50
             */
            finding_keys: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            material_unknowns: string[];
            /**
             * @minItems 0
             * @maxItems 50
             */
            dependency_refs: {
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
            }[];
          },
        ];
    coverage: {
      state:
        | "unsearched"
        | "seeded"
        | "bounded_search"
        | "broad_search"
        | "provisionally_saturated";
      protocol: string;
      /**
       * @minItems 0
       * @maxItems 50
       */
      source_set_refs: {
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
      }[];
      /**
       * @minItems 0
       * @maxItems 50
       */
      limitations: string[];
    };
    /**
     * @minItems 0
     * @maxItems 50
     */
    conflicting_refs: {
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
    }[];
    /**
     * @minItems 0
     * @maxItems 50
     */
    material_unknowns: string[];
    origin:
      | "deterministic_rule"
      | "human_judgment"
      | "model_proposal"
      | "policy_derivation";
    review_state: "partial" | "provisional" | "reviewed" | "disputed";
    prior_assessment_ref: {
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
    } | null;
    trigger: string;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface ScientificScope {
  population?: ScopeDimension;
  language?: ScopeDimension;
  task?: ScopeDimension;
  model_family?: ScopeDimension;
  dataset?: ScopeDimension;
  intervention_or_exposure?: ScopeDimension;
  comparator?: ScopeDimension;
  outcome?: ScopeDimension;
  setting?: ScopeDimension;
  temporal_boundary?: ScopeDimension;
  /**
   * @maxItems 10
   */
  unreported_dimensions:
    | []
    | [
        | "population"
        | "language"
        | "task"
        | "model_family"
        | "dataset"
        | "intervention_or_exposure"
        | "comparator"
        | "outcome"
        | "setting"
        | "temporal_boundary",
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ];
  notes?: string;
}
export interface ScopeDimension {
  description: string;
  /**
   * @maxItems 1000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  entity_refs: string[];
}
export interface PetraPostureDecision {
  schema_name: "petra.posture-decision";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  posture_decision_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  project_id: string;
  content: {
    assessment_ref: {
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
    primary_posture:
      | "explore"
      | "clarify"
      | "challenge"
      | "discriminate"
      | "reproduce"
      | "consolidate";
    profile_ref: {
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
    policy_ref: {
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
    /**
     * @minItems 0
     * @maxItems 50
     */
    determining_finding_keys: string[];
    /**
     * @minItems 0
     * @maxItems 50
     */
    material_unknowns: string[];
    state: "proposed" | "active";
    /**
     * @minItems 0
     * @maxItems 50
     */
    obligations: {
      /**
       * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
       */
      obligation_id: string;
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      revision: number;
      type_key: string;
      creating_finding_key: string | null;
      rationale: string;
      enforcement:
        "advisory" | "required_for_transition" | "required_for_action";
      /**
       * @minItems 1
       * @maxItems 50
       */
      criterion_keys: [string, ...string[]];
      state:
        | "open"
        | "in_progress"
        | "satisfied"
        | "waived"
        | "not_applicable"
        | "superseded"
        | "expired";
      /**
       * @minItems 0
       * @maxItems 50
       */
      satisfaction_evidence_refs: {
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
      }[];
      waiver_ref: {
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
      } | null;
      /**
       * @minItems 0
       * @maxItems 50
       */
      work_refs: {
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
      }[];
    }[];
    /**
     * @minItems 0
     * @maxItems 50
     */
    suggested_work: {
      label: string;
      rationale: string;
      creating_finding_key: string | null;
      obligation_id: string | null;
      destination: string;
    }[];
    expires_at: string | null;
    human_override_reason: string | null;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface PetraCycleDisposition {
  schema_name: "petra.cycle-disposition";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  cycle_disposition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  project_id: string;
  content: {
    assessment_ref: {
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
    posture_ref: {
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
    basis: {
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
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      graph_content_hash: string;
      event_position: number;
      stream_revision: number;
      query_kind: "current_registered_working_heads";
      objective_ref?: TargetClaimRef | null;
    };
    disposition:
      | "supporting_within_scope"
      | "challenging_within_scope"
      | "mixed"
      | "insufficient"
      | "deferred"
      | "further_cycle";
    /**
     * @minItems 0
     * @maxItems 50
     */
    criterion_keys: string[];
    /**
     * @minItems 0
     * @maxItems 50
     */
    finding_keys: string[];
    /**
     * @minItems 0
     * @maxItems 50
     */
    unresolved_questions: string[];
    rationale: string;
    prior_disposition_ref: {
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
    } | null;
    authority_effect: "scoped_project_judgment";
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
}
export interface PetraProjectExaminationReceipt {
  schema_name: "petra.project-examination-receipt";
  schema_version: "1.0.0";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  project_examination_receipt_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  content: {
    command_id: string;
    idempotency_key: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    request_hash: string;
    operation:
      | "register_hypothesis"
      | "revise_hypothesis"
      | "assess_hypothesis"
      | "decide_posture"
      | "conclude_cycle";
    actor: ActorRef;
    capability_grant_id: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    graph_content_hash: string;
    profile_ref: TargetClaimRef;
    policy_ref: TargetClaimRef;
    record_ref: TargetClaimRef;
    prior_ref: TargetClaimRef | null;
    review: {
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      content_hash: string;
      /**
       * An RFC 3339 timestamp normalized to UTC with millisecond precision.
       */
      reviewed_at: string;
      rationale: string;
    };
    authority_effect: "project_scoped_examination";
    projection_effect: "none";
    /**
     * An RFC 3339 timestamp normalized to UTC with millisecond precision.
     */
    recorded_at: string;
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
}
export interface PetraProjectExaminationScene {
  schema_name: "petra.project-examination-scene";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: {
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    graph_content_hash: string;
    /**
     * @maxItems 250
     */
    nodes: {
      key: string;
      record_ref: TargetClaimRef;
      kind: string;
      label: string;
      state:
        | "working"
        | "reference"
        | "current"
        | "stale"
        | "invalidated"
        | "profile_unavailable"
        | "unassessed";
      /**
       * @maxItems 8
       */
      affected_axes:
        | []
        | [string]
        | [string, string]
        | [string, string, string]
        | [string, string, string, string]
        | [string, string, string, string, string]
        | [string, string, string, string, string, string]
        | [string, string, string, string, string, string, string]
        | [string, string, string, string, string, string, string, string];
    }[];
    /**
     * @maxItems 500
     */
    relationships: {
      key: string;
      subject_key: string;
      object_key: string;
      predicate:
        | "targets"
        | "assesses"
        | "uses_evidence"
        | "has_posture"
        | "concludes"
        | "supersedes"
        | "prior_disposition"
        | "pins_profile"
        | "pins_policy"
        | "satisfies";
    }[];
    omitted_nodes: number;
    omitted_relationships: number;
    has_more_history: boolean;
    /**
     * @maxItems 10
     */
    limitations:
      | []
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
        ];
  };
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
