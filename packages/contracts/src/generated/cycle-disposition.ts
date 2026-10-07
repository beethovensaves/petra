/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
