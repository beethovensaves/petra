/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
