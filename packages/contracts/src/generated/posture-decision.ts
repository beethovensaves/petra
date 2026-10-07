/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
