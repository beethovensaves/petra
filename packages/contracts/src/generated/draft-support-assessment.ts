/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type DraftSupportAssessmentId = string;
export type AssessmentLineage =
  | {
      lineage_kind: "root";
    }
  | {
      lineage_kind: "revision";
      /**
       * A one-based optimistic revision within JavaScript's safe-integer range.
       */
      parent_revision: number;
      /**
       * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
       */
      parent_content_hash: string;
    };
export type AssessmentTrigger = ResearcherEditTrigger | RevalidationTrigger;
export type AssessmentContent = {
  state: "stale" | "passed" | "failed";
  /**
   * @minItems 1
   * @maxItems 100000
   */
  span_assessments: [SpanAssessment, ...SpanAssessment[]];
  /**
   * @minItems 1
   * @maxItems 100000
   */
  citation_assessments: [CitationAssessment, ...CitationAssessment[]];
  /**
   * @maxItems 1000
   */
  validator_results: ValidatorResult[];
  /**
   * @maxItems 1000
   */
  limitations: string[];
  reuse_policy: ReusePolicy;
  authority_boundary: AuthorityBoundary;
};

/**
 * An immutable, revisioned assessment of whether one exact DraftArtifact revision's span provenance and citation links remain reusable after editing or explicit revalidation.
 */
export interface PetraDraftSupportAssessment {
  schema_name: "petra.draft-support-assessment";
  schema_version: "1.0.0";
  draft_support_assessment_id: DraftSupportAssessmentId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  draft_ref: DraftRef;
  provenance_map_ref: ProvenanceMapRef;
  citation_bundle_ref: CitationBundleRef;
  lineage: AssessmentLineage;
  trigger: AssessmentTrigger;
  content: AssessmentContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  assessed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  assessed_at: string;
}
export interface DraftRef {
  draft_artifact_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ProvenanceMapRef {
  provenance_map_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CitationBundleRef {
  citation_bundle_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ResearcherEditTrigger {
  trigger_kind: "researcher_edit";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  command_id: string;
  researcher: HumanActorRef;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface RevalidationTrigger {
  trigger_kind: "support_revalidation";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  command_id: string;
  requested_by: HumanActorRef;
  executed_by: ServiceActorRef;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
export interface SpanAssessment {
  draft_span_id: string & string;
  support_state: "current" | "stale" | "passed" | "failed";
  citation_state: "current" | "stale" | "not_required";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  basis_snapshot: [
    (
      | EvidenceBasis
      | PetraInferenceBasis
      | ResearcherBasis
      | StructuralBasis
      | UnsupportedBasis
    ),
    ...(
      | EvidenceBasis
      | PetraInferenceBasis
      | ResearcherBasis
      | StructuralBasis
      | UnsupportedBasis
    )[],
  ];
  /**
   * @maxItems 1000
   */
  validator_results: ValidatorResult[];
  /**
   * @maxItems 100
   */
  reasons: string[];
}
export interface EvidenceBasis {
  basis_kind: "evidence";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  evidence_selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  relation:
    | "direct_report"
    | "support"
    | "qualification"
    | "comparison"
    | "interpretation"
    | "synthesis"
    | "structural"
    | "unsupported";
}
export interface ClaimRef {
  object_kind: "claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface AssertionRef {
  object_kind: "assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface SourceSpanRef {
  object_kind: "source_span";
  /**
   * A Petra identifier whose kind is source_span.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface WorkVersionRef {
  object_kind: "work_version";
  /**
   * A Petra identifier whose kind is work_version.
   */
  object_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface PetraInferenceBasis {
  basis_kind: "petra_inference";
  inference_kind:
    "synthesis" | "comparison" | "interpretation" | "recommendation";
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A one-based optimistic revision within JavaScript's safe-integer range.
   */
  evidence_selection_orders: [number, ...number[]];
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  model_request_id: string;
  relation:
    | "direct_report"
    | "support"
    | "qualification"
    | "comparison"
    | "interpretation"
    | "synthesis"
    | "structural"
    | "unsupported";
  rationale: string;
}
export interface ResearcherBasis {
  basis_kind: "researcher";
  /**
   * A Petra identifier whose kind is actor.
   */
  researcher_id: string;
  statement_kind: "supplied_statement" | "judgment";
  relation:
    | "direct_report"
    | "support"
    | "qualification"
    | "comparison"
    | "interpretation"
    | "synthesis"
    | "structural"
    | "unsupported";
}
export interface StructuralBasis {
  basis_kind: "structural";
  function: "heading" | "connective" | "transition" | "organization";
  relation: "structural";
}
export interface UnsupportedBasis {
  basis_kind: "unsupported";
  relation: "unsupported";
  reason: string;
}
export interface ValidatorResult {
  validator: string;
  version: string;
  outcome: "pass" | "fail" | "warning";
  code: string;
  message?: string;
}
export interface CitationAssessment {
  citation_id: string & string;
  link_state: "current" | "partially_stale" | "stale";
  /**
   * @maxItems 100000
   */
  stale_draft_span_ids: (string & string)[];
}
export interface ReusePolicy {
  reuse_allowed: boolean;
  reason: string;
}
export interface AuthorityBoundary {
  assessment_is_scientific_evidence: false;
  assessment_controls_draft_reuse: true;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
