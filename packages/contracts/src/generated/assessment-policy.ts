/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
