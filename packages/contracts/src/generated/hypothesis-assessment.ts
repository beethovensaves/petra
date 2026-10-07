/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

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
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
