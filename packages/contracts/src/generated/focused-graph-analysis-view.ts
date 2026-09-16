/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type StableKey = string;
export type GraphView = PetraFocusedGraphView | PetraFocusedGraphViewV110;
export type Analysis = ComparisonAnalysis | ImpactAnalysis | TimeAnalysis;
export type ComparisonMember = ExactMember | AbsentMember | UnavailableMember;
export type ResolvedTargetRef = {
  semantic_key:
    | "petra.change-set"
    | "petra.approval"
    | "scientific.claim"
    | "scientific.assertion"
    | "petra.project-source"
    | "petra.project-source-replacement";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.change-set"
    | "petra.approval"
    | "petra.claim"
    | "petra.assertion"
    | "petra.project-source"
    | "petra.project-source-replacement";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
};
export type AdapterGroup = {
  adapter_kind:
    | "change_control"
    | "review_membership"
    | "grounded_response_dependency"
    | "composition_lineage"
    | "project_source_lifecycle"
    | "project_source_dependency"
    | "project_source_replacement_lineage"
    | "project_source_replacement_receipt"
    | "project_source_effective_head";
  authority_source:
    | "immutable_change_control_target_bindings"
    | "immutable_review_candidate_bindings"
    | "immutable_grounded_response_dependencies"
    | "immutable_composition_target_bindings"
    | "immutable_project_source_lifecycle_receipts"
    | "immutable_project_source_dependency_bindings"
    | "immutable_project_source_replacement_bindings"
    | "immutable_project_source_replacement_receipts"
    | "current_project_source_replacement_heads";
  relation_scope: "exact_target_revision";
  total_count: number;
  returned_count: number;
  coverage: "complete" | "truncated";
  /**
   * @maxItems 25
   */
  refs: DependentRef[];
} & (
  | {
      adapter_kind?: "change_control";
      authority_source?: "immutable_change_control_target_bindings";
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "review_membership";
      authority_source?: "immutable_review_candidate_bindings";
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "grounded_response_dependency";
      authority_source?: "immutable_grounded_response_dependencies";
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "composition_lineage";
      authority_source?: "immutable_composition_target_bindings";
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "project_source_lifecycle";
      authority_source?: "immutable_project_source_lifecycle_receipts";
      refs?: (DependentRef & {
        semantic_key?: "petra.project-source-lifecycle-receipt";
        posture?: "immutable_revision";
        relation?:
          | "records_exact_source_prior_revision"
          | "records_exact_source_resulting_revision";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "project_source_dependency";
      authority_source?: "immutable_project_source_dependency_bindings";
      refs?: (DependentRef & {
        relation?:
          | "parses_exact_source_artifact"
          | "structures_exact_source_artifact"
          | "locates_span_in_exact_source_artifact"
          | "derives_claim_from_exact_source_artifact"
          | "derives_assertion_from_exact_source_artifact"
          | "uses_exact_source_artifact_in_active_work"
          | "reviews_evidence_from_exact_source_artifact"
          | "depends_on_exact_source_authority";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "project_source_replacement_lineage";
      authority_source?: "immutable_project_source_replacement_bindings";
      refs?: (DependentRef & {
        posture?: "immutable_revision";
        relation?:
          | "retains_exact_replaced_source"
          | "retains_exact_replacement_source"
          | "retracts_exact_source_replacement";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "project_source_replacement_receipt";
      authority_source?: "immutable_project_source_replacement_receipts";
      refs?: (DependentRef & {
        semantic_key?: "petra.project-source-replacement-receipt";
        posture?: "immutable_revision";
        relation?: "records_exact_source_replacement_command";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "project_source_effective_head";
      authority_source?: "current_project_source_replacement_heads";
      refs?: (DependentRef & {
        semantic_key?: "petra.project-source-replacement";
        posture?: "current";
        relation?:
          | "is_current_active_replacement_head"
          | "is_current_retracted_replacement_head";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
) & {
    adapter_kind:
      | "change_control"
      | "review_membership"
      | "grounded_response_dependency"
      | "composition_lineage"
      | "project_source_lifecycle"
      | "project_source_dependency"
      | "project_source_replacement_lineage"
      | "project_source_replacement_receipt"
      | "project_source_effective_head";
    authority_source:
      | "immutable_change_control_target_bindings"
      | "immutable_review_candidate_bindings"
      | "immutable_grounded_response_dependencies"
      | "immutable_composition_target_bindings"
      | "immutable_project_source_lifecycle_receipts"
      | "immutable_project_source_dependency_bindings"
      | "immutable_project_source_replacement_bindings"
      | "immutable_project_source_replacement_receipts"
      | "current_project_source_replacement_heads";
    relation_scope: "exact_target_revision";
    total_count: number;
    returned_count: number;
    coverage: "complete" | "truncated";
    /**
     * @maxItems 25
     */
    refs: DependentRef[];
  } & (
    | {
        adapter_kind?: "change_control";
        authority_source?: "immutable_change_control_target_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "review_membership";
        authority_source?: "immutable_review_candidate_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "grounded_response_dependency";
        authority_source?: "immutable_grounded_response_dependencies";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "composition_lineage";
        authority_source?: "immutable_composition_target_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_lifecycle";
        authority_source?: "immutable_project_source_lifecycle_receipts";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-lifecycle-receipt";
          posture?: "immutable_revision";
          relation?:
            | "records_exact_source_prior_revision"
            | "records_exact_source_resulting_revision";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_dependency";
        authority_source?: "immutable_project_source_dependency_bindings";
        refs?: (DependentRef & {
          relation?:
            | "parses_exact_source_artifact"
            | "structures_exact_source_artifact"
            | "locates_span_in_exact_source_artifact"
            | "derives_claim_from_exact_source_artifact"
            | "derives_assertion_from_exact_source_artifact"
            | "uses_exact_source_artifact_in_active_work"
            | "reviews_evidence_from_exact_source_artifact"
            | "depends_on_exact_source_authority";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_replacement_lineage";
        authority_source?: "immutable_project_source_replacement_bindings";
        refs?: (DependentRef & {
          posture?: "immutable_revision";
          relation?:
            | "retains_exact_replaced_source"
            | "retains_exact_replacement_source"
            | "retracts_exact_source_replacement";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_replacement_receipt";
        authority_source?: "immutable_project_source_replacement_receipts";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-replacement-receipt";
          posture?: "immutable_revision";
          relation?: "records_exact_source_replacement_command";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_effective_head";
        authority_source?: "current_project_source_replacement_heads";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-replacement";
          posture?: "current";
          relation?:
            | "is_current_active_replacement_head"
            | "is_current_retracted_replacement_head";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
  ) & {
    adapter_kind:
      | "change_control"
      | "review_membership"
      | "grounded_response_dependency"
      | "composition_lineage"
      | "project_source_lifecycle"
      | "project_source_dependency"
      | "project_source_replacement_lineage"
      | "project_source_replacement_receipt"
      | "project_source_effective_head";
    authority_source:
      | "immutable_change_control_target_bindings"
      | "immutable_review_candidate_bindings"
      | "immutable_grounded_response_dependencies"
      | "immutable_composition_target_bindings"
      | "immutable_project_source_lifecycle_receipts"
      | "immutable_project_source_dependency_bindings"
      | "immutable_project_source_replacement_bindings"
      | "immutable_project_source_replacement_receipts"
      | "current_project_source_replacement_heads";
    relation_scope: "exact_target_revision";
    total_count: number;
    returned_count: number;
    coverage: "complete" | "truncated";
    /**
     * @maxItems 25
     */
    refs: DependentRef[];
  } & (
    | {
        adapter_kind?: "change_control";
        authority_source?: "immutable_change_control_target_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "review_membership";
        authority_source?: "immutable_review_candidate_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "grounded_response_dependency";
        authority_source?: "immutable_grounded_response_dependencies";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "composition_lineage";
        authority_source?: "immutable_composition_target_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_lifecycle";
        authority_source?: "immutable_project_source_lifecycle_receipts";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-lifecycle-receipt";
          posture?: "immutable_revision";
          relation?:
            | "records_exact_source_prior_revision"
            | "records_exact_source_resulting_revision";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_dependency";
        authority_source?: "immutable_project_source_dependency_bindings";
        refs?: (DependentRef & {
          relation?:
            | "parses_exact_source_artifact"
            | "structures_exact_source_artifact"
            | "locates_span_in_exact_source_artifact"
            | "derives_claim_from_exact_source_artifact"
            | "derives_assertion_from_exact_source_artifact"
            | "uses_exact_source_artifact_in_active_work"
            | "reviews_evidence_from_exact_source_artifact"
            | "depends_on_exact_source_authority";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_replacement_lineage";
        authority_source?: "immutable_project_source_replacement_bindings";
        refs?: (DependentRef & {
          posture?: "immutable_revision";
          relation?:
            | "retains_exact_replaced_source"
            | "retains_exact_replacement_source"
            | "retracts_exact_source_replacement";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_replacement_receipt";
        authority_source?: "immutable_project_source_replacement_receipts";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-replacement-receipt";
          posture?: "immutable_revision";
          relation?: "records_exact_source_replacement_command";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_effective_head";
        authority_source?: "current_project_source_replacement_heads";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-replacement";
          posture?: "current";
          relation?:
            | "is_current_active_replacement_head"
            | "is_current_retracted_replacement_head";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
  ) & {
    adapter_kind:
      | "change_control"
      | "review_membership"
      | "grounded_response_dependency"
      | "composition_lineage"
      | "project_source_lifecycle"
      | "project_source_dependency"
      | "project_source_replacement_lineage"
      | "project_source_replacement_receipt"
      | "project_source_effective_head";
    authority_source:
      | "immutable_change_control_target_bindings"
      | "immutable_review_candidate_bindings"
      | "immutable_grounded_response_dependencies"
      | "immutable_composition_target_bindings"
      | "immutable_project_source_lifecycle_receipts"
      | "immutable_project_source_dependency_bindings"
      | "immutable_project_source_replacement_bindings"
      | "immutable_project_source_replacement_receipts"
      | "current_project_source_replacement_heads";
    relation_scope: "exact_target_revision";
    total_count: number;
    returned_count: number;
    coverage: "complete" | "truncated";
    /**
     * @maxItems 25
     */
    refs: DependentRef[];
  } & (
    | {
        adapter_kind?: "change_control";
        authority_source?: "immutable_change_control_target_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "review_membership";
        authority_source?: "immutable_review_candidate_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "grounded_response_dependency";
        authority_source?: "immutable_grounded_response_dependencies";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "composition_lineage";
        authority_source?: "immutable_composition_target_bindings";
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_lifecycle";
        authority_source?: "immutable_project_source_lifecycle_receipts";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-lifecycle-receipt";
          posture?: "immutable_revision";
          relation?:
            | "records_exact_source_prior_revision"
            | "records_exact_source_resulting_revision";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_dependency";
        authority_source?: "immutable_project_source_dependency_bindings";
        refs?: (DependentRef & {
          relation?:
            | "parses_exact_source_artifact"
            | "structures_exact_source_artifact"
            | "locates_span_in_exact_source_artifact"
            | "derives_claim_from_exact_source_artifact"
            | "derives_assertion_from_exact_source_artifact"
            | "uses_exact_source_artifact_in_active_work"
            | "reviews_evidence_from_exact_source_artifact"
            | "depends_on_exact_source_authority";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_replacement_lineage";
        authority_source?: "immutable_project_source_replacement_bindings";
        refs?: (DependentRef & {
          posture?: "immutable_revision";
          relation?:
            | "retains_exact_replaced_source"
            | "retains_exact_replacement_source"
            | "retracts_exact_source_replacement";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_replacement_receipt";
        authority_source?: "immutable_project_source_replacement_receipts";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-replacement-receipt";
          posture?: "immutable_revision";
          relation?: "records_exact_source_replacement_command";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "project_source_effective_head";
        authority_source?: "current_project_source_replacement_heads";
        refs?: (DependentRef & {
          semantic_key?: "petra.project-source-replacement";
          posture?: "current";
          relation?:
            | "is_current_active_replacement_head"
            | "is_current_retracted_replacement_head";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
  );
export type DependentRef = {
  semantic_key:
    | "petra.change-set"
    | "petra.approval"
    | "scientific.claim"
    | "scientific.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.change-set"
    | "petra.approval"
    | "petra.claim"
    | "petra.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical" | "immutable_revision";
  relation:
    | "approves_exact_change_set"
    | "authorized_by_exact_change_set"
    | "authorized_by_exact_approval"
    | "proposes_promotion_from_exact_evidence_revision"
    | "contains_exact_review_candidate"
    | "depends_on_exact_grounded_evidence"
    | "selects_exact_composition_subject"
    | "uses_exact_composition_evidence"
    | "maps_exact_provenance_basis"
    | "retains_exact_draft_authority_dependency"
    | "parses_exact_source_artifact"
    | "structures_exact_source_artifact"
    | "locates_span_in_exact_source_artifact"
    | "derives_claim_from_exact_source_artifact"
    | "derives_assertion_from_exact_source_artifact"
    | "uses_exact_source_artifact_in_active_work"
    | "reviews_evidence_from_exact_source_artifact"
    | "depends_on_exact_source_authority"
    | "records_exact_source_prior_revision"
    | "records_exact_source_resulting_revision"
    | "retains_exact_replaced_source"
    | "retains_exact_replacement_source"
    | "retracts_exact_source_replacement"
    | "records_exact_source_replacement_command"
    | "is_current_active_replacement_head"
    | "is_current_retracted_replacement_head";
  relation_identity: string;
} & {
  semantic_key:
    | "petra.change-set"
    | "petra.approval"
    | "scientific.claim"
    | "scientific.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.change-set"
    | "petra.approval"
    | "petra.claim"
    | "petra.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical" | "immutable_revision";
  relation:
    | "approves_exact_change_set"
    | "authorized_by_exact_change_set"
    | "authorized_by_exact_approval"
    | "proposes_promotion_from_exact_evidence_revision"
    | "contains_exact_review_candidate"
    | "depends_on_exact_grounded_evidence"
    | "selects_exact_composition_subject"
    | "uses_exact_composition_evidence"
    | "maps_exact_provenance_basis"
    | "retains_exact_draft_authority_dependency"
    | "parses_exact_source_artifact"
    | "structures_exact_source_artifact"
    | "locates_span_in_exact_source_artifact"
    | "derives_claim_from_exact_source_artifact"
    | "derives_assertion_from_exact_source_artifact"
    | "uses_exact_source_artifact_in_active_work"
    | "reviews_evidence_from_exact_source_artifact"
    | "depends_on_exact_source_authority"
    | "records_exact_source_prior_revision"
    | "records_exact_source_resulting_revision"
    | "retains_exact_replaced_source"
    | "retains_exact_replacement_source"
    | "retracts_exact_source_replacement"
    | "records_exact_source_replacement_command"
    | "is_current_active_replacement_head"
    | "is_current_retracted_replacement_head";
  relation_identity: string;
} & {
  semantic_key:
    | "petra.change-set"
    | "petra.approval"
    | "scientific.claim"
    | "scientific.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.change-set"
    | "petra.approval"
    | "petra.claim"
    | "petra.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical" | "immutable_revision";
  relation:
    | "approves_exact_change_set"
    | "authorized_by_exact_change_set"
    | "authorized_by_exact_approval"
    | "proposes_promotion_from_exact_evidence_revision"
    | "contains_exact_review_candidate"
    | "depends_on_exact_grounded_evidence"
    | "selects_exact_composition_subject"
    | "uses_exact_composition_evidence"
    | "maps_exact_provenance_basis"
    | "retains_exact_draft_authority_dependency"
    | "parses_exact_source_artifact"
    | "structures_exact_source_artifact"
    | "locates_span_in_exact_source_artifact"
    | "derives_claim_from_exact_source_artifact"
    | "derives_assertion_from_exact_source_artifact"
    | "uses_exact_source_artifact_in_active_work"
    | "reviews_evidence_from_exact_source_artifact"
    | "depends_on_exact_source_authority"
    | "records_exact_source_prior_revision"
    | "records_exact_source_resulting_revision"
    | "retains_exact_replaced_source"
    | "retains_exact_replacement_source"
    | "retracts_exact_source_replacement"
    | "records_exact_source_replacement_command"
    | "is_current_active_replacement_head"
    | "is_current_retracted_replacement_head";
  relation_identity: string;
} & {
  semantic_key:
    | "petra.change-set"
    | "petra.approval"
    | "scientific.claim"
    | "scientific.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.change-set"
    | "petra.approval"
    | "petra.claim"
    | "petra.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical" | "immutable_revision";
  relation:
    | "approves_exact_change_set"
    | "authorized_by_exact_change_set"
    | "authorized_by_exact_approval"
    | "proposes_promotion_from_exact_evidence_revision"
    | "contains_exact_review_candidate"
    | "depends_on_exact_grounded_evidence"
    | "selects_exact_composition_subject"
    | "uses_exact_composition_evidence"
    | "maps_exact_provenance_basis"
    | "retains_exact_draft_authority_dependency"
    | "parses_exact_source_artifact"
    | "structures_exact_source_artifact"
    | "locates_span_in_exact_source_artifact"
    | "derives_claim_from_exact_source_artifact"
    | "derives_assertion_from_exact_source_artifact"
    | "uses_exact_source_artifact_in_active_work"
    | "reviews_evidence_from_exact_source_artifact"
    | "depends_on_exact_source_authority"
    | "records_exact_source_prior_revision"
    | "records_exact_source_resulting_revision"
    | "retains_exact_replaced_source"
    | "retains_exact_replacement_source"
    | "retracts_exact_source_replacement"
    | "records_exact_source_replacement_command"
    | "is_current_active_replacement_head"
    | "is_current_retracted_replacement_head";
  relation_identity: string;
} & {
  semantic_key:
    | "petra.change-set"
    | "petra.approval"
    | "scientific.claim"
    | "scientific.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.change-set"
    | "petra.approval"
    | "petra.claim"
    | "petra.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical" | "immutable_revision";
  relation:
    | "approves_exact_change_set"
    | "authorized_by_exact_change_set"
    | "authorized_by_exact_approval"
    | "proposes_promotion_from_exact_evidence_revision"
    | "contains_exact_review_candidate"
    | "depends_on_exact_grounded_evidence"
    | "selects_exact_composition_subject"
    | "uses_exact_composition_evidence"
    | "maps_exact_provenance_basis"
    | "retains_exact_draft_authority_dependency"
    | "parses_exact_source_artifact"
    | "structures_exact_source_artifact"
    | "locates_span_in_exact_source_artifact"
    | "derives_claim_from_exact_source_artifact"
    | "derives_assertion_from_exact_source_artifact"
    | "uses_exact_source_artifact_in_active_work"
    | "reviews_evidence_from_exact_source_artifact"
    | "depends_on_exact_source_authority"
    | "records_exact_source_prior_revision"
    | "records_exact_source_resulting_revision"
    | "retains_exact_replaced_source"
    | "retains_exact_replacement_source"
    | "retracts_exact_source_replacement"
    | "records_exact_source_replacement_command"
    | "is_current_active_replacement_head"
    | "is_current_retracted_replacement_head";
  relation_identity: string;
} & {
  semantic_key:
    | "petra.change-set"
    | "petra.approval"
    | "scientific.claim"
    | "scientific.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.change-set"
    | "petra.approval"
    | "petra.claim"
    | "petra.assertion"
    | "petra.review-session"
    | "petra.grounded-response"
    | "petra.composition-request"
    | "petra.composition-plan"
    | "petra.provenance-map"
    | "petra.draft-artifact"
    | "petra.parsed-document"
    | "petra.structural-block"
    | "petra.source-span"
    | "petra.work-unit"
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement"
    | "petra.project-source-replacement-retraction"
    | "petra.project-source-replacement-receipt";
  schema_version: "1.0.0" | "1.1.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical" | "immutable_revision";
  relation:
    | "approves_exact_change_set"
    | "authorized_by_exact_change_set"
    | "authorized_by_exact_approval"
    | "proposes_promotion_from_exact_evidence_revision"
    | "contains_exact_review_candidate"
    | "depends_on_exact_grounded_evidence"
    | "selects_exact_composition_subject"
    | "uses_exact_composition_evidence"
    | "maps_exact_provenance_basis"
    | "retains_exact_draft_authority_dependency"
    | "parses_exact_source_artifact"
    | "structures_exact_source_artifact"
    | "locates_span_in_exact_source_artifact"
    | "derives_claim_from_exact_source_artifact"
    | "derives_assertion_from_exact_source_artifact"
    | "uses_exact_source_artifact_in_active_work"
    | "reviews_evidence_from_exact_source_artifact"
    | "depends_on_exact_source_authority"
    | "records_exact_source_prior_revision"
    | "records_exact_source_resulting_revision"
    | "retains_exact_replaced_source"
    | "retains_exact_replacement_source"
    | "retracts_exact_source_replacement"
    | "records_exact_source_replacement_command"
    | "is_current_active_replacement_head"
    | "is_current_retracted_replacement_head";
  relation_identity: string;
};
export type UnavailableAssessment = {
  target_index: number;
  target_ref: TargetRef;
  adapter_state:
    | "no_registered_exact_adapter"
    | "target_identity_incomplete"
    | "target_authority_unavailable";
  reason:
    | "No exact semantic-target adapter is registered for this semantic key."
    | "Registered semantic-target adapters require an immutable target revision."
    | "The exact immutable target authority is unavailable in this Project snapshot.";
  /**
   * @maxItems 0
   */
  groups: [];
};
export type OperationalAdapterGroup = {
  adapter_kind: "work_input_binding" | "work_output" | "interaction_delivery";
  authority_source:
    | "current_work_heads_with_immutable_input_bindings"
    | "immutable_worker_output_manifests_for_bound_work"
    | "immutable_interaction_replay_records_for_bound_work";
  relation_scope: "exact_target_record_binding";
  total_count: number;
  returned_count: number;
  coverage: "complete" | "truncated";
  /**
   * @maxItems 25
   */
  refs: OperationalDependentRef[];
} & (
  | {
      adapter_kind?: "work_input_binding";
      authority_source?: "current_work_heads_with_immutable_input_bindings";
      refs?: (OperationalDependentRef & {
        semantic_key?: "petra.work-unit";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "work_output";
      authority_source?: "immutable_worker_output_manifests_for_bound_work";
      refs?: (OperationalDependentRef & {
        semantic_key?: "petra.worker-output-manifest";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
  | {
      adapter_kind?: "interaction_delivery";
      authority_source?: "immutable_interaction_replay_records_for_bound_work";
      refs?: (OperationalDependentRef & {
        semantic_key?: "petra.interaction-replay-record";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    }
) & {
    adapter_kind: "work_input_binding" | "work_output" | "interaction_delivery";
    authority_source:
      | "current_work_heads_with_immutable_input_bindings"
      | "immutable_worker_output_manifests_for_bound_work"
      | "immutable_interaction_replay_records_for_bound_work";
    relation_scope: "exact_target_record_binding";
    total_count: number;
    returned_count: number;
    coverage: "complete" | "truncated";
    /**
     * @maxItems 25
     */
    refs: OperationalDependentRef[];
  } & (
    | {
        adapter_kind?: "work_input_binding";
        authority_source?: "current_work_heads_with_immutable_input_bindings";
        refs?: (OperationalDependentRef & {
          semantic_key?: "petra.work-unit";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "work_output";
        authority_source?: "immutable_worker_output_manifests_for_bound_work";
        refs?: (OperationalDependentRef & {
          semantic_key?: "petra.worker-output-manifest";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "interaction_delivery";
        authority_source?: "immutable_interaction_replay_records_for_bound_work";
        refs?: (OperationalDependentRef & {
          semantic_key?: "petra.interaction-replay-record";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
  ) & {
    adapter_kind: "work_input_binding" | "work_output" | "interaction_delivery";
    authority_source:
      | "current_work_heads_with_immutable_input_bindings"
      | "immutable_worker_output_manifests_for_bound_work"
      | "immutable_interaction_replay_records_for_bound_work";
    relation_scope: "exact_target_record_binding";
    total_count: number;
    returned_count: number;
    coverage: "complete" | "truncated";
    /**
     * @maxItems 25
     */
    refs: OperationalDependentRef[];
  } & (
    | {
        adapter_kind?: "work_input_binding";
        authority_source?: "current_work_heads_with_immutable_input_bindings";
        refs?: (OperationalDependentRef & {
          semantic_key?: "petra.work-unit";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "work_output";
        authority_source?: "immutable_worker_output_manifests_for_bound_work";
        refs?: (OperationalDependentRef & {
          semantic_key?: "petra.worker-output-manifest";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
    | {
        adapter_kind?: "interaction_delivery";
        authority_source?: "immutable_interaction_replay_records_for_bound_work";
        refs?: (OperationalDependentRef & {
          semantic_key?: "petra.interaction-replay-record";
          [k: string]: unknown;
        })[];
        [k: string]: unknown;
      }
  );
export type OperationalDependentRef = {
  semantic_key:
    | "petra.work-unit"
    | "petra.worker-output-manifest"
    | "petra.interaction-replay-record";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  schema_name:
    | "petra.work-unit"
    | "petra.worker-output-manifest"
    | "petra.interaction-replay-record";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "immutable_revision";
  relation:
    | "uses_exact_history_target_as_work_input"
    | "reports_output_for_work_using_exact_history_target"
    | "delivers_interaction_for_work_using_exact_history_target";
  relation_identity: string;
  work_unit_ref: WorkUnitRef;
  input_binding_ref: InputBindingRef;
  interaction_run_ref?: InteractionRunRef;
  destination:
    | AvailableWorkDestination
    | UnavailableWorkDestination
    | OutputOperationalDestination
    | ReplayOperationalDestination;
} & (
  | {
      semantic_key?: "petra.work-unit";
      schema_name?: "petra.work-unit";
      posture?: "current";
      relation?: "uses_exact_history_target_as_work_input";
      destination?: AvailableWorkDestination | UnavailableWorkDestination;
      [k: string]: unknown;
    }
  | {
      semantic_key?: "petra.worker-output-manifest";
      schema_name?: "petra.worker-output-manifest";
      posture?: "immutable_revision";
      relation?: "reports_output_for_work_using_exact_history_target";
      content_hash: unknown;
      destination?: OutputOperationalDestination;
      [k: string]: unknown;
    }
  | {
      semantic_key?: "petra.interaction-replay-record";
      schema_name?: "petra.interaction-replay-record";
      posture?: "immutable_revision";
      relation?: "delivers_interaction_for_work_using_exact_history_target";
      content_hash: unknown;
      interaction_run_ref: unknown;
      destination?: ReplayOperationalDestination;
      [k: string]: unknown;
    }
) & {
    semantic_key:
      | "petra.work-unit"
      | "petra.worker-output-manifest"
      | "petra.interaction-replay-record";
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    object_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    schema_name:
      | "petra.work-unit"
      | "petra.worker-output-manifest"
      | "petra.interaction-replay-record";
    schema_version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash?: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    record_hash: string;
    posture: "current" | "immutable_revision";
    relation:
      | "uses_exact_history_target_as_work_input"
      | "reports_output_for_work_using_exact_history_target"
      | "delivers_interaction_for_work_using_exact_history_target";
    relation_identity: string;
    work_unit_ref: WorkUnitRef;
    input_binding_ref: InputBindingRef;
    interaction_run_ref?: InteractionRunRef;
    destination:
      | AvailableWorkDestination
      | UnavailableWorkDestination
      | OutputOperationalDestination
      | ReplayOperationalDestination;
  } & (
    | {
        semantic_key?: "petra.work-unit";
        schema_name?: "petra.work-unit";
        posture?: "current";
        relation?: "uses_exact_history_target_as_work_input";
        destination?: AvailableWorkDestination | UnavailableWorkDestination;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.worker-output-manifest";
        schema_name?: "petra.worker-output-manifest";
        posture?: "immutable_revision";
        relation?: "reports_output_for_work_using_exact_history_target";
        content_hash: unknown;
        destination?: OutputOperationalDestination;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.interaction-replay-record";
        schema_name?: "petra.interaction-replay-record";
        posture?: "immutable_revision";
        relation?: "delivers_interaction_for_work_using_exact_history_target";
        content_hash: unknown;
        interaction_run_ref: unknown;
        destination?: ReplayOperationalDestination;
        [k: string]: unknown;
      }
  ) & {
    semantic_key:
      | "petra.work-unit"
      | "petra.worker-output-manifest"
      | "petra.interaction-replay-record";
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    object_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    schema_name:
      | "petra.work-unit"
      | "petra.worker-output-manifest"
      | "petra.interaction-replay-record";
    schema_version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash?: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    record_hash: string;
    posture: "current" | "immutable_revision";
    relation:
      | "uses_exact_history_target_as_work_input"
      | "reports_output_for_work_using_exact_history_target"
      | "delivers_interaction_for_work_using_exact_history_target";
    relation_identity: string;
    work_unit_ref: WorkUnitRef;
    input_binding_ref: InputBindingRef;
    interaction_run_ref?: InteractionRunRef;
    destination:
      | AvailableWorkDestination
      | UnavailableWorkDestination
      | OutputOperationalDestination
      | ReplayOperationalDestination;
  } & (
    | {
        semantic_key?: "petra.work-unit";
        schema_name?: "petra.work-unit";
        posture?: "current";
        relation?: "uses_exact_history_target_as_work_input";
        destination?: AvailableWorkDestination | UnavailableWorkDestination;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.worker-output-manifest";
        schema_name?: "petra.worker-output-manifest";
        posture?: "immutable_revision";
        relation?: "reports_output_for_work_using_exact_history_target";
        content_hash: unknown;
        destination?: OutputOperationalDestination;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.interaction-replay-record";
        schema_name?: "petra.interaction-replay-record";
        posture?: "immutable_revision";
        relation?: "delivers_interaction_for_work_using_exact_history_target";
        content_hash: unknown;
        interaction_run_ref: unknown;
        destination?: ReplayOperationalDestination;
        [k: string]: unknown;
      }
  ) & {
    semantic_key:
      | "petra.work-unit"
      | "petra.worker-output-manifest"
      | "petra.interaction-replay-record";
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    object_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision: number;
    schema_name:
      | "petra.work-unit"
      | "petra.worker-output-manifest"
      | "petra.interaction-replay-record";
    schema_version: "1.0.0";
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    content_hash?: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    record_hash: string;
    posture: "current" | "immutable_revision";
    relation:
      | "uses_exact_history_target_as_work_input"
      | "reports_output_for_work_using_exact_history_target"
      | "delivers_interaction_for_work_using_exact_history_target";
    relation_identity: string;
    work_unit_ref: WorkUnitRef;
    input_binding_ref: InputBindingRef;
    interaction_run_ref?: InteractionRunRef;
    destination:
      | AvailableWorkDestination
      | UnavailableWorkDestination
      | OutputOperationalDestination
      | ReplayOperationalDestination;
  } & (
    | {
        semantic_key?: "petra.work-unit";
        schema_name?: "petra.work-unit";
        posture?: "current";
        relation?: "uses_exact_history_target_as_work_input";
        destination?: AvailableWorkDestination | UnavailableWorkDestination;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.worker-output-manifest";
        schema_name?: "petra.worker-output-manifest";
        posture?: "immutable_revision";
        relation?: "reports_output_for_work_using_exact_history_target";
        content_hash: unknown;
        destination?: OutputOperationalDestination;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.interaction-replay-record";
        schema_name?: "petra.interaction-replay-record";
        posture?: "immutable_revision";
        relation?: "delivers_interaction_for_work_using_exact_history_target";
        content_hash: unknown;
        interaction_run_ref: unknown;
        destination?: ReplayOperationalDestination;
        [k: string]: unknown;
      }
  );
export type UnavailableOperationalAssessment = {
  target_index: number;
  target_ref: TargetRef;
  adapter_state:
    "target_identity_incomplete" | "target_record_authority_unavailable";
  reason:
    | "Operational adapters require an immutable target revision."
    | "The exact immutable target record authority is unavailable in this Project snapshot.";
  /**
   * @maxItems 0
   */
  groups: [];
} & (
  | {
      adapter_state?: "target_identity_incomplete";
      reason?: "Operational adapters require an immutable target revision.";
      [k: string]: unknown;
    }
  | {
      adapter_state?: "target_record_authority_unavailable";
      reason?: "The exact immutable target record authority is unavailable in this Project snapshot.";
      [k: string]: unknown;
    }
);
export type DateFact = ExactTimestamp | UnknownDate | UnavailableDate;

/**
 * A renderer-neutral, read-only comparison, impact, or time composition over exact focused-graph positions and existing History and Review authority. It supplies bounded differences, recorded dependencies, separately assessed consequences, dates or explicit unknowns, snapshots, coverage, and limitations without calculating universal importance, maturity, confidence, or currentness.
 */
export interface PetraFocusedGraphAnalysisView {
  schema_name: "petra.focused-graph-analysis-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: AnalysisContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface AnalysisContent {
  task: AnalysisTask;
  /**
   * @minItems 1
   * @maxItems 2
   */
  positions: [GraphPosition] | [GraphPosition, GraphPosition];
  analysis: Analysis;
  authority_boundary: AuthorityBoundary1;
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface AnalysisTask {
  analysis_request_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  task_kind: "comparison" | "impact" | "time";
  question: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  question_hash: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  focus_refs: [ExactRef, ...ExactRef[]];
  /**
   * @minItems 1
   * @maxItems 2
   */
  position_keys: [StableKey] | [StableKey, StableKey];
}
export interface ExactRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
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
export interface GraphPosition {
  position_key: StableKey;
  label: string;
  role: "before" | "after" | "context" | "time_position";
  graph_view: GraphView;
}
/**
 * A renderer-neutral, profile-resolved result for one exact bounded relationship question. It preserves Project, definition, snapshot, layer, projection, scope, semantic membership, path, selection, destination, and action meaning without granting a renderer query or mutation authority.
 */
export interface PetraFocusedGraphView {
  schema_name: "petra.focused-graph-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent {
  task: Task;
  profile: Profile;
  /**
   * @maxItems 2
   */
  source_views:
    | []
    | [
        | {
            schema_name: "petra.project-relationship-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          }
        | {
            schema_name: "petra.project-relationship-overlay-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          },
      ]
    | [
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
      ];
  requested_snapshot: ProjectSnapshotRef;
  represented_snapshot: ProjectSnapshotRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: CurrentTemporalPosition | HistoricalTemporalPosition;
  projection_position: ProjectionPosition;
  scope: Scope;
  /**
   * @maxItems 10000
   */
  nodes: Node[];
  /**
   * @maxItems 10000
   */
  relationships: Relationship[];
  /**
   * @maxItems 10000
   */
  paths: Path[];
  selection:
    | {
        state: "none";
      }
    | {
        state: "selected";
        selection_kind: "node" | "relationship" | "path";
        /**
         * @minItems 1
         * @maxItems 100
         */
        selected_keys: [string, ...string[]];
      };
  /**
   * @minItems 1
   * @maxItems 10000
   */
  destinations: [
    AvailableDestination | UnavailableDestination,
    ...(AvailableDestination | UnavailableDestination)[],
  ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  actions: [RegisteredAction, ...RegisteredAction[]];
  authority_boundary: AuthorityBoundary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface Task {
  request_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  request_hash: string;
  task_kind:
    | "neighborhood"
    | "provenance"
    | "disagreement"
    | "comparison"
    | "impact"
    | "time";
  task_semantic_key: string;
  question: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  question_hash: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  focus_refs: [ExactRef, ...ExactRef[]];
  origin: Origin;
  return_destination_key: string;
}
export interface Origin {
  origin_kind:
    | "brief"
    | "evidence"
    | "review"
    | "petra"
    | "history"
    | "direct"
    | "saved_question";
  origin_ref?: ExactRef;
}
export interface Profile {
  project_definition_ref: ProjectDefinitionRef;
  kernel_compatibility: "petra.project-kernel@1.0.0";
  label: string;
  focused_graph_registration: {
    semantic_key: "petra.focused-graph";
    registration_kind: "extension";
    contract: ContractRef;
  };
  /**
   * @minItems 3
   * @maxItems 1000
   */
  resolved_semantics: [
    ResolvedSemantic,
    ResolvedSemantic,
    ResolvedSemantic,
    ...ResolvedSemantic[],
  ];
}
export interface ProjectDefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  definition_family: string;
}
export interface ContractRef {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ResolvedSemantic {
  semantic_key: string;
  role: "task" | "object" | "relationship" | "action";
  registration_kind:
    | "objective_schema"
    | "object_schema"
    | "relationship_schema"
    | "source_role"
    | "workflow"
    | "tool"
    | "extension";
  contract: ContractRef;
  term: Term;
}
export interface Term {
  semantic_key: string;
  singular: string;
  plural: string;
  definition: string;
  generic_family:
    | "focus"
    | "finding"
    | "reference"
    | "relationship"
    | "task"
    | "output"
    | "other";
}
export interface ProjectSnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CurrentTemporalPosition {
  position_kind: "current";
  dimension: "project_snapshot";
}
export interface HistoricalTemporalPosition {
  position_kind: "historical";
  dimension:
    "recorded_time" | "occurred_time" | "publication_time" | "valid_time";
  at:
    | {
        state: "exact";
        /**
         * An RFC 3339 timestamp normalized to UTC with millisecond precision.
         */
        value: string;
      }
    | {
        state: "unknown";
      }
    | {
        state: "unavailable";
        reason: string;
      };
}
export interface ProjectionPosition {
  authority_source: "postgresql";
  projection_source: "neo4j_rebuildable_projection";
  state: "current" | "catching_up" | "unavailable" | "rebuilding";
  checkpoint_ref?: ExactRef;
  represented_event_position: number;
  observed_event_position: number;
  pending_records: number;
  detail: string;
}
export interface Scope {
  description: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  included_relationship_semantics: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 3
   */
  directions:
    | ["outgoing" | "incoming" | "bidirectional"]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ];
  /**
   * @minItems 1
   * @maxItems 3
   */
  included_layers:
    | ["current" | "working" | "historical"]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ];
  limits: Limits;
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [Omission, ...Omission[]];
}
export interface Limits {
  maximum_depth: number;
  maximum_nodes: number;
  maximum_relationships: number;
  maximum_paths: number;
}
export interface Omission {
  omission_kind:
    | "out_of_scope"
    | "filtered"
    | "capped"
    | "restricted"
    | "missing"
    | "unknown"
    | "unsupported"
    | "projection_unavailable"
    | "working_hidden";
  description: string;
  count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
}
export interface Node {
  node_key: string;
  record_ref: ExactRef;
  semantic_key: string;
  term: Term;
  label: string;
  summary: string;
  layer: "current" | "working" | "historical";
  authority_position:
    "current_authority" | "working_non_authority" | "historical_authority";
  lifecycle: "represented" | "superseded" | "restricted" | "missing";
  basis: Basis;
  /**
   * @maxItems 100
   */
  destination_keys: string[];
}
export interface Basis {
  summary: string;
  /**
   * @maxItems 1000
   */
  record_refs: ExactRef[];
  /**
   * @maxItems 100
   */
  limitations: string[];
}
export interface Relationship {
  relationship_key: string;
  relationship_ref: GraphElementRef;
  semantic_key: string;
  term: Term;
  predicate: string;
  meaning_kind:
    | "citation"
    | "support"
    | "contradiction"
    | "qualification"
    | "inference"
    | "structural"
    | "provenance"
    | "governance"
    | "dependency";
  source_node_key: string;
  target_node_key: string;
  direction: "outgoing" | "incoming" | "bidirectional";
  origin:
    | "canonical_record"
    | "working_candidate"
    | "historical_record"
    | "model_inference";
  layer: "current" | "working" | "historical";
  authority_position:
    "current_authority" | "working_non_authority" | "historical_authority";
  summary: string;
  basis: Basis;
  /**
   * @maxItems 100
   */
  destination_keys: string[];
}
export interface GraphElementRef {
  element_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface Path {
  path_key: string;
  state: "complete" | "partial" | "no_path";
  ordering_rationale: string;
  /**
   * @maxItems 10000
   */
  steps: PathStep[];
  /**
   * @maxItems 100
   */
  limitations: string[];
}
export interface PathStep {
  position: number;
  from_node_key: string;
  relationship_key: string;
  to_node_key: string;
  traversal_direction: "outgoing" | "incoming";
  repeated_member: boolean;
}
export interface AvailableDestination {
  destination_key: string;
  destination_kind:
    | "details"
    | "source_inspection"
    | "brief"
    | "evidence"
    | "review"
    | "history"
    | "work";
  state: "available";
  owner:
    | "project_object_location_view"
    | "project_source_view"
    | "project_brief_view"
    | "project_relationship_view"
    | "project_review_view"
    | "project_history_episode_view"
    | "project_work_view";
  label: string;
  target_ref: ExactRef;
}
export interface UnavailableDestination {
  destination_key: string;
  destination_kind:
    | "details"
    | "source_inspection"
    | "brief"
    | "evidence"
    | "review"
    | "history"
    | "work";
  state: "unavailable";
  owner:
    | "project_object_location_view"
    | "project_source_view"
    | "project_brief_view"
    | "project_relationship_view"
    | "project_review_view"
    | "project_history_episode_view"
    | "project_work_view";
  label: string;
  reason: string;
}
export interface RegisteredAction {
  action_key: string;
  action_kind:
    | "inspect_details"
    | "open_source"
    | "inspect_path"
    | "expand_recorded"
    | "prepare_correction"
    | "open_review"
    | "preview_work"
    | "return_to_origin";
  semantic_key: string;
  label: string;
  consequence:
    | "read_only_navigation"
    | "read_only_expansion"
    | "prepares_working_candidate"
    | "opens_canonical_review"
    | "previews_typed_work";
  /**
   * @minItems 1
   * @maxItems 100
   */
  target_keys: [string, ...string[]];
  availability:
    | {
        state: "available";
        destination_key?: string;
      }
    | {
        state: "unavailable";
        reason: string;
      };
}
export interface AuthorityBoundary {
  postgresql_authoritative: true;
  neo4j_rebuildable_projection: true;
  renderer_neutral: true;
  renderer_queries_projection: false;
  layout_grants_authority: false;
  selection_grants_authority: false;
  actions_issue_domain_mutation: false;
  correction_requires_canonical_owner: true;
  work_requires_typed_preview: true;
}
/**
 * An additive focused-graph result for one snapshot-bound named expansion. It preserves the 1.0 authority and semantic membership boundary while making the registered recipe, normalized filters, groups, hidden membership, cycles, caps, restricted paths, incomplete state, and unknowns explicit.
 */
export interface PetraFocusedGraphViewV110 {
  schema_name: "petra.focused-graph-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ViewContent1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ViewContent1 {
  task: Task;
  profile: Profile;
  /**
   * @maxItems 2
   */
  source_views:
    | []
    | [
        | {
            schema_name: "petra.project-relationship-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          }
        | {
            schema_name: "petra.project-relationship-overlay-view";
            schema_version: "1.0.0";
            /**
             * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
             */
            content_hash: string;
            /**
             * An RFC 3339 timestamp normalized to UTC with millisecond precision.
             */
            read_at: string;
          },
      ]
    | [
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
        (
          | {
              schema_name: "petra.project-relationship-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
          | {
              schema_name: "petra.project-relationship-overlay-view";
              schema_version: "1.0.0";
              /**
               * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
               */
              content_hash: string;
              /**
               * An RFC 3339 timestamp normalized to UTC with millisecond precision.
               */
              read_at: string;
            }
        ),
      ];
  requested_snapshot: ProjectSnapshotRef;
  represented_snapshot: ProjectSnapshotRef;
  semantic_layer: "current" | "working" | "historical";
  temporal_position: CurrentTemporalPosition | HistoricalTemporalPosition;
  projection_position: ProjectionPosition;
  scope: Scope1;
  exploration: NamedExploration;
  /**
   * @minItems 1
   * @maxItems 100
   */
  groups: [Group, ...Group[]];
  /**
   * @maxItems 10000
   */
  nodes: Node[];
  /**
   * @maxItems 10000
   */
  relationships: Relationship[];
  /**
   * @maxItems 10000
   */
  paths: Path[];
  selection:
    | {
        state: "none";
      }
    | {
        state: "selected";
        selection_kind: "node" | "relationship" | "path";
        /**
         * @minItems 1
         * @maxItems 100
         */
        selected_keys: [string, ...string[]];
      };
  /**
   * @minItems 1
   * @maxItems 10000
   */
  destinations: [
    AvailableDestination | UnavailableDestination,
    ...(AvailableDestination | UnavailableDestination)[],
  ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  actions: [RegisteredAction, ...RegisteredAction[]];
  authority_boundary: AuthorityBoundary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface Scope1 {
  description: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  included_relationship_semantics: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 3
   */
  directions:
    | ["outgoing" | "incoming" | "bidirectional"]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ]
    | [
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
        "outgoing" | "incoming" | "bidirectional",
      ];
  /**
   * @minItems 1
   * @maxItems 3
   */
  included_layers:
    | ["current" | "working" | "historical"]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ]
    | [
        "current" | "working" | "historical",
        "current" | "working" | "historical",
        "current" | "working" | "historical",
      ];
  limits: Limits;
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  omissions: [Omission, ...Omission[]];
}
export interface NamedExploration {
  mode: "named_expansion";
  expansion_key: string;
  recipe_semantic_key: string;
  recipe_label: string;
  target_ref: ExactRef;
  target_node_key: string;
  maximum_depth: number;
  filters: ExplorationFilters;
  accounting: ExplorationAccounting;
}
export interface ExplorationFilters {
  /**
   * @minItems 1
   * @maxItems 9
   */
  meaning_kinds:
    | [
        | "citation"
        | "support"
        | "contradiction"
        | "qualification"
        | "inference"
        | "structural"
        | "provenance"
        | "governance"
        | "dependency",
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ]
    | [
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
        (
          | "citation"
          | "support"
          | "contradiction"
          | "qualification"
          | "inference"
          | "structural"
          | "provenance"
          | "governance"
          | "dependency"
        ),
      ];
  /**
   * @minItems 1
   * @maxItems 2
   */
  directions:
    | ["outgoing" | "incoming"]
    | ["outgoing" | "incoming", "outgoing" | "incoming"];
  /**
   * @minItems 1
   * @maxItems 4
   */
  origins:
    | [
        | "canonical_record"
        | "working_candidate"
        | "historical_record"
        | "model_inference",
      ]
    | [
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
      ]
    | [
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
      ]
    | [
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
        (
          | "canonical_record"
          | "working_candidate"
          | "historical_record"
          | "model_inference"
        ),
      ];
}
export interface ExplorationAccounting {
  result_state: "complete_for_scope" | "partial" | "capped" | "unknown";
  capped_members:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  hidden_relationships:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  restricted_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  cycle_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  incomplete_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  unknown_paths:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
}
export interface Group {
  group_key: string;
  facet: "relationship_meaning";
  label: string;
  membership_rule: string;
  count_unit: "relationships";
  layer: "current" | "working" | "historical";
  meaning_kind:
    | "citation"
    | "support"
    | "contradiction"
    | "qualification"
    | "inference"
    | "structural"
    | "provenance"
    | "governance"
    | "dependency";
  /**
   * @maxItems 10000
   */
  member_relationship_keys: string[];
  returned_count: number;
  total_count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  filtered_count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  hidden_count:
    | {
        state: "exact";
        value: number;
      }
    | {
        state: "unknown";
      }
    | {
        state: "not_disclosed";
      };
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  overlap: false;
}
export interface ComparisonAnalysis {
  analysis_kind: "comparison";
  before_position_key: StableKey;
  after_position_key: StableKey;
  common_base: ExactCommonBase | UnavailableCommonBase;
  /**
   * @minItems 1
   * @maxItems 20000
   */
  differences: [Difference, ...Difference[]];
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface ExactCommonBase {
  state: "exact";
  snapshot: ProjectSnapshotRef;
}
export interface UnavailableCommonBase {
  state: "unavailable";
  reason: string;
}
export interface Difference {
  difference_key: StableKey;
  difference_kind:
    | "added"
    | "removed"
    | "changed"
    | "unchanged"
    | "not_comparable"
    | "unavailable";
  before: ComparisonMember;
  after: ComparisonMember;
  basis: "exact_server_comparison_of_returned_record_identity";
  /**
   * @maxItems 20
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
}
export interface ExactMember {
  state: "exact";
  member_kind: "node" | "relationship";
  member_key: StableKey;
  record_ref: ExactRef;
  semantic_key: string;
  label: string;
  layer: "current" | "working" | "historical";
  authority_position:
    "current_authority" | "working_non_authority" | "historical_authority";
}
export interface AbsentMember {
  state: "absent_from_exact_position";
}
export interface UnavailableMember {
  state: "unavailable";
  reason: string;
}
export interface ImpactAnalysis {
  analysis_kind: "impact";
  position_key: StableKey;
  dependency_source: PetraProjectHistoryImpactViewV14;
  assessed_consequences: SuppliedConsequences | UnavailableConsequences;
  coverage: "complete" | "truncated" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
/**
 * An authorized, event-selected dependency inventory that preserves the 1.3 operational result and adds renderer-neutral destinations only for exact current WorkUnit references backed by the Project Work detail authority. Output and replay destinations remain explicitly unavailable; the view does not infer routes, effects, reversibility, compensation, or cross-family order.
 */
export interface PetraProjectHistoryImpactViewV14 {
  schema_name: "petra.project-history-impact-view";
  schema_version: "1.4.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  content: ImpactContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ImpactContent {
  view_kind: "dependency_impact";
  selected_event: EventAnchor;
  authorization_scope: "authenticated_project";
  impact: Impact;
  semantic_target_impact: SemanticTargetImpact;
  operational_dependency_impact: OperationalDependencyImpact;
  decision_boundary: DecisionBoundary;
  authority: AuthorityPosition;
  /**
   * @minItems 10
   * @maxItems 10
   */
  omissions: [
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "unregistered_semantic_target_adapters_not_composed"
      | "identity_only_semantic_relations_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "work_without_exact_record_binding_not_composed"
      | "operational_dependent_effect_not_inferred"
      | "unregistered_operational_destination_not_inferred"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
  ];
  graph_navigation_history: "client_local_separate";
}
export interface EventAnchor {
  command_ref: CommandRef;
  event_ref: EventRef;
  actor: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  family:
    | "change_control"
    | "project_source_lifecycle"
    | "project_source_replacement";
  /**
   * @minItems 1
   * @maxItems 100
   */
  targets: [TargetRef, ...TargetRef[]];
  observed_effect: ObservedEffect;
  semantic_destination: SemanticDestination;
}
export interface CommandRef {
  command_id: string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  command_name:
    | "SubmitChangeSet"
    | "RecordApproval"
    | "ApplyChangeSet"
    | "ExcludeProjectSource"
    | "RestoreProjectSource"
    | "CreateProjectSourceReplacement"
    | "RetractProjectSourceReplacement";
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  capability_grant_id: string;
  correlation_id: string;
}
export interface EventRef {
  event_id: string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  event_type:
    | "change_set.submitted"
    | "approval.recorded"
    | "change_set.applied"
    | "change_set.conflicted"
    | "change_set.reverted"
    | "change_set.reversal_conflicted"
    | "project_source.excluded"
    | "project_source.restored"
    | "project_source.replacement_created"
    | "project_source.replacement_retracted";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
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
export interface TargetRef {
  role: "primary" | "affected" | "related";
  semantic_key: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision?: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash?: string;
  authority_state?: string;
}
export interface ObservedEffect {
  effect:
    | "change_proposed"
    | "approval_recorded"
    | "authority_change_applied"
    | "authority_change_conflicted"
    | "authority_change_reverted"
    | "reversal_conflicted"
    | "project_source_excluded"
    | "project_source_restored"
    | "source_replacement_created"
    | "source_replacement_retracted";
  outcome: "completed" | "conflicted";
  summary: string;
}
export interface SemanticDestination {
  place_role: "history";
  task_intent: "view_history";
  object_ref: {
    semantic_key: string;
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    object_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision?: number;
  };
}
export interface Impact {
  scope: "registered_direct_event_and_command_dependents";
  summary: ImpactSummary;
  causal_commands: BoundedGroupBase & {
    relation: "caused_by_selected_command";
    authority_source: "immutable_command_causation";
    total_count: unknown;
    returned_count: unknown;
    coverage: unknown;
    /**
     * @maxItems 100
     */
    refs: (RecordedCausalCommand | UnrecordedCausalCommand)[];
  };
  outbox_records: BoundedGroupBase & {
    relation: "carries_selected_event";
    authority_source: "immutable_event_outbox_binding";
    total_count: unknown;
    returned_count: unknown;
    coverage: unknown;
    /**
     * @maxItems 100
     */
    refs: OutboxRecordRef[];
  };
  graph_projection_records: BoundedGroupBase & {
    relation: "projects_selected_event";
    authority_source: "immutable_projection_event_binding";
    total_count: unknown;
    returned_count: unknown;
    coverage: unknown;
    /**
     * @maxItems 100
     */
    refs: GraphProjectionRecordRef[];
  };
  grounded_response_invalidations: BoundedGroupBase & {
    relation: "invalidated_by_selected_event";
    authority_source: "immutable_response_invalidation_binding";
    total_count: unknown;
    returned_count: unknown;
    coverage: unknown;
    /**
     * @maxItems 100
     */
    refs: GroundedResponseInvalidationRef[];
  };
  /**
   * @minItems 3
   * @maxItems 3
   */
  unknowns: [
    (
      | "unregistered_profile_specific_dependencies_may_exist"
      | "transitive_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
    (
      | "unregistered_profile_specific_dependencies_may_exist"
      | "transitive_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
    (
      | "unregistered_profile_specific_dependencies_may_exist"
      | "transitive_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
  ];
}
export interface ImpactSummary {
  registered_group_count: 4;
  total_count: number;
  coverage: "complete" | "truncated";
}
export interface BoundedGroupBase {
  total_count: number;
  returned_count: number;
  coverage: "complete" | "truncated";
  [k: string]: unknown;
}
export interface RecordedCausalCommand {
  command_ref: CommandRef;
  outcome: "success" | "failure";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  event_state: "recorded";
  event_ref: EventRef;
}
export interface UnrecordedCausalCommand {
  command_ref: CommandRef;
  outcome: "success" | "failure";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  event_state: "not_recorded";
}
export interface OutboxRecordRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  outbox_id: string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  target: "neo4j_graph" | "interface_authority";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  enqueued_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface GraphProjectionRecordRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  graph_projection_record_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  outbox_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  attempt: number;
  outcome: "applied" | "failed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface GroundedResponseInvalidationRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  grounded_response_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  posture: "current" | "historical";
  cache_state: "invalidated";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  invalidation_position: number;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  change_set_id: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface SemanticTargetImpact {
  scope: "registered_exact_semantic_target_dependents";
  target_limit: 10;
  per_adapter_ref_limit: 25;
  target_total_count: number;
  target_returned_count: number;
  target_coverage: "complete" | "truncated";
  registry: [
    {
      adapter_kind: "change_control";
      authority_source: "immutable_change_control_target_bindings";
      semantic_keys: [
        "petra.change-set",
        "petra.approval",
        "scientific.claim",
        "scientific.assertion",
      ];
    },
    {
      adapter_kind: "review_membership";
      authority_source: "immutable_review_candidate_bindings";
      semantic_keys: ["scientific.claim", "scientific.assertion"];
    },
    {
      adapter_kind: "grounded_response_dependency";
      authority_source: "immutable_grounded_response_dependencies";
      semantic_keys: ["scientific.claim", "scientific.assertion"];
    },
    {
      adapter_kind: "composition_lineage";
      authority_source: "immutable_composition_target_bindings";
      semantic_keys: ["scientific.claim", "scientific.assertion"];
    },
    {
      adapter_kind: "project_source_lifecycle";
      authority_source: "immutable_project_source_lifecycle_receipts";
      semantic_keys: ["petra.project-source"];
    },
    {
      adapter_kind: "project_source_dependency";
      authority_source: "immutable_project_source_dependency_bindings";
      semantic_keys: ["petra.project-source"];
    },
    {
      adapter_kind: "project_source_replacement_lineage";
      authority_source: "immutable_project_source_replacement_bindings";
      semantic_keys: [
        "petra.project-source",
        "petra.project-source-replacement",
      ];
    },
    {
      adapter_kind: "project_source_replacement_receipt";
      authority_source: "immutable_project_source_replacement_receipts";
      semantic_keys: ["petra.project-source-replacement"];
    },
    {
      adapter_kind: "project_source_effective_head";
      authority_source: "current_project_source_replacement_heads";
      semantic_keys: [
        "petra.project-source",
        "petra.project-source-replacement",
      ];
    },
  ];
  /**
   * @minItems 1
   * @maxItems 10
   */
  target_assessments:
    | [RegisteredAssessment | UnavailableAssessment]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ]
    | [
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
        RegisteredAssessment | UnavailableAssessment,
      ];
  summary: SemanticSummary;
  /**
   * @minItems 4
   * @maxItems 4
   */
  unknowns: [
    (
      | "unregistered_semantic_keys_may_have_dependents"
      | "identity_only_semantic_relations_are_excluded"
      | "transitive_semantic_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
    (
      | "unregistered_semantic_keys_may_have_dependents"
      | "identity_only_semantic_relations_are_excluded"
      | "transitive_semantic_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
    (
      | "unregistered_semantic_keys_may_have_dependents"
      | "identity_only_semantic_relations_are_excluded"
      | "transitive_semantic_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
    (
      | "unregistered_semantic_keys_may_have_dependents"
      | "identity_only_semantic_relations_are_excluded"
      | "transitive_semantic_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
  ];
}
export interface RegisteredAssessment {
  target_index: number;
  target_ref: TargetRef;
  adapter_state: "registered";
  resolved_target_ref: ResolvedTargetRef;
  /**
   * @minItems 1
   * @maxItems 4
   */
  groups:
    | [AdapterGroup]
    | [AdapterGroup, AdapterGroup]
    | [AdapterGroup, AdapterGroup, AdapterGroup]
    | [AdapterGroup, AdapterGroup, AdapterGroup, AdapterGroup];
}
export interface SemanticSummary {
  registered_adapter_count: 9;
  assessed_target_count: number;
  supported_target_count: number;
  total_count: number;
  coverage: "complete" | "truncated";
}
export interface OperationalDependencyImpact {
  scope: "registered_exact_operational_dependents";
  target_limit: 10;
  per_adapter_ref_limit: 25;
  target_total_count: number;
  target_returned_count: number;
  target_coverage: "complete" | "truncated";
  registry: [
    {
      adapter_kind: "work_input_binding";
      authority_source: "current_work_heads_with_immutable_input_bindings";
      dependent_semantic_key: "petra.work-unit";
    },
    {
      adapter_kind: "work_output";
      authority_source: "immutable_worker_output_manifests_for_bound_work";
      dependent_semantic_key: "petra.worker-output-manifest";
    },
    {
      adapter_kind: "interaction_delivery";
      authority_source: "immutable_interaction_replay_records_for_bound_work";
      dependent_semantic_key: "petra.interaction-replay-record";
    },
  ];
  /**
   * @minItems 1
   * @maxItems 10
   */
  target_assessments:
    | [RegisteredOperationalAssessment | UnavailableOperationalAssessment]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ]
    | [
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
        RegisteredOperationalAssessment | UnavailableOperationalAssessment,
      ];
  summary: {
    registered_adapter_count: 3;
    assessed_target_count: number;
    supported_target_count: number;
    total_count: number;
    coverage: "complete" | "truncated";
  };
  /**
   * @minItems 6
   * @maxItems 6
   */
  unknowns: [
    (
      | "work_without_exact_record_binding_is_excluded"
      | "unresolved_target_record_authority_may_hide_bindings"
      | "worker_output_effect_is_not_inferred"
      | "interaction_delivery_effect_is_not_inferred"
      | "transitive_operational_dependency_closure_is_not_composed"
      | "cross_family_total_order_is_not_asserted"
    ),
    (
      | "work_without_exact_record_binding_is_excluded"
      | "unresolved_target_record_authority_may_hide_bindings"
      | "worker_output_effect_is_not_inferred"
      | "interaction_delivery_effect_is_not_inferred"
      | "transitive_operational_dependency_closure_is_not_composed"
      | "cross_family_total_order_is_not_asserted"
    ),
    (
      | "work_without_exact_record_binding_is_excluded"
      | "unresolved_target_record_authority_may_hide_bindings"
      | "worker_output_effect_is_not_inferred"
      | "interaction_delivery_effect_is_not_inferred"
      | "transitive_operational_dependency_closure_is_not_composed"
      | "cross_family_total_order_is_not_asserted"
    ),
    (
      | "work_without_exact_record_binding_is_excluded"
      | "unresolved_target_record_authority_may_hide_bindings"
      | "worker_output_effect_is_not_inferred"
      | "interaction_delivery_effect_is_not_inferred"
      | "transitive_operational_dependency_closure_is_not_composed"
      | "cross_family_total_order_is_not_asserted"
    ),
    (
      | "work_without_exact_record_binding_is_excluded"
      | "unresolved_target_record_authority_may_hide_bindings"
      | "worker_output_effect_is_not_inferred"
      | "interaction_delivery_effect_is_not_inferred"
      | "transitive_operational_dependency_closure_is_not_composed"
      | "cross_family_total_order_is_not_asserted"
    ),
    (
      | "work_without_exact_record_binding_is_excluded"
      | "unresolved_target_record_authority_may_hide_bindings"
      | "worker_output_effect_is_not_inferred"
      | "interaction_delivery_effect_is_not_inferred"
      | "transitive_operational_dependency_closure_is_not_composed"
      | "cross_family_total_order_is_not_asserted"
    ),
  ];
}
export interface RegisteredOperationalAssessment {
  target_index: number;
  target_ref: TargetRef;
  adapter_state: "registered";
  resolved_target_record: ResolvedTargetRecord;
  /**
   * @minItems 3
   * @maxItems 3
   */
  groups: [
    OperationalAdapterGroup,
    OperationalAdapterGroup,
    OperationalAdapterGroup,
  ];
}
export interface ResolvedTargetRecord {
  semantic_key: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  authority_source:
    "selected_event_target" | "resolved_immutable_semantic_authority";
}
export interface WorkUnitRef {
  work_unit_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface InputBindingRef {
  worker_input_manifest_id: string & string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  binding_position: number;
  binding_name: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  record_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  snapshot_hash: string;
}
export interface InteractionRunRef {
  interaction_run_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface AvailableWorkDestination {
  state: "available";
  place_role: "work";
  task_intent: "inspect";
  object_ref: OperationalDestinationObjectRef;
  route_authority: ProjectWorkRouteAuthority;
  project_definition_ref: DefinitionRef;
}
export interface OperationalDestinationObjectRef {
  semantic_key: "petra.work-unit";
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ProjectWorkRouteAuthority {
  schema_name: "petra.project-work-view";
  schema_version: "1.0.0";
  view_kind: "detail";
  authority_source: "current_project_definition_and_project_work_view";
}
export interface DefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  definition_family: string;
}
export interface UnavailableWorkDestination {
  state: "unavailable";
  reason_code: "project_work_route_authority_unavailable";
  reason: "The current ProjectDefinition does not authorize the exact Project Work detail destination.";
}
export interface OutputOperationalDestination {
  state: "unavailable";
  reason_code: "worker_output_manifest_route_not_registered";
  reason: "No exact Project-owned WorkerOutputManifest destination is registered.";
}
export interface ReplayOperationalDestination {
  state: "unavailable";
  reason_code: "interaction_replay_record_route_not_registered";
  reason: "No exact Project-owned InteractionReplayRecord destination is registered; replay is not a ProjectThread binding.";
}
export interface DecisionBoundary {
  reversibility: "not_assessed";
  compensation: "not_composed";
  dependent_effect: "not_inferred_from_reference";
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  through_event_position: number;
  through_stream_revision: number;
}
export interface SuppliedConsequences {
  state: "supplied";
  /**
   * @minItems 1
   * @maxItems 2000
   */
  items: [AssessedConsequence, ...AssessedConsequence[]];
  coverage: "exact_requested_review_members";
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface AssessedConsequence {
  consequence_key: StableKey;
  source: ReviewSource;
  review_member_id: string;
  source_kind: "review_member" | "change_set_impact";
  source_ref?: ExactRef;
  summary: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  target_refs: [ExactRef, ...ExactRef[]];
  coverage: "exact_requested_review_member";
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
}
export interface ReviewSource {
  schema_name: "petra.project-review-view";
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  review_session_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface UnavailableConsequences {
  state: "unavailable";
  reason: string;
  coverage: "not_assessed";
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface TimeAnalysis {
  analysis_kind: "time";
  position_key: StableKey;
  temporal_dimension:
    "recorded_time" | "occurred_time" | "publication_time" | "valid_time";
  position_date: DateFact;
  /**
   * @minItems 1
   * @maxItems 20000
   */
  entries: [TimelineEntry, ...TimelineEntry[]];
  ordering_rationale: string;
  coverage: "complete_for_scope" | "partial" | "capped" | "unknown";
  /**
   * @minItems 1
   * @maxItems 100
   */
  limitations: [string, ...string[]];
}
export interface ExactTimestamp {
  state: "exact_timestamp";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  value: string;
}
export interface UnknownDate {
  state: "unknown";
  reason: string;
}
export interface UnavailableDate {
  state: "unavailable";
  reason: string;
}
export interface TimelineEntry {
  position: number;
  member: ExactMember;
  date: DateFact;
  date_basis:
    "focused_graph_member_fact" | "selected_project_snapshot_position";
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
}
export interface AuthorityBoundary1 {
  postgresql_authoritative: true;
  neo4j_projection_only: true;
  focused_graph_owner_reused: true;
  history_owner_reused: true;
  review_owner_reused_when_bound: true;
  analysis_is_read_only: true;
  renderer_calculates_domain_facts: false;
  universal_scores_calculated: false;
}
