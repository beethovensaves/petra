/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type PetraProjectExaminationRequest = {
  schema_name: "petra.project-examination-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  operation:
    | "register_hypothesis"
    | "revise_hypothesis"
    | "assess_hypothesis"
    | "decide_posture"
    | "conclude_cycle";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  expected_graph_hash: string;
  expected_prior_ref: TargetClaimRef | null;
  proposed_content: Content | Content1 | Content2 | Content3;
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
};

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
export interface Content {
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
}
export interface Content1 {
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
export interface Content2 {
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
    enforcement: "advisory" | "required_for_transition" | "required_for_action";
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
}
export interface Content3 {
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
}
