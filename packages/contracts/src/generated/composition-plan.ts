/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CompositionPlanId = string;
export type CompositionPlanContent = {
  state: "ready" | "blocked";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  sections: [CompositionSection, ...CompositionSection[]];
  /**
   * @maxItems 1000
   */
  unresolved_support: UnresolvedSupport[];
  coverage: {
    state: "sufficient" | "partial" | "insufficient";
    statement: string;
    /**
     * @maxItems 1000
     */
    limitations: string[];
  };
  authority_boundary: {
    plan_is_scientific_authority: false;
    prose_may_exceed_evidence: false;
  };
};
export type CompositionMove = {
  move_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  position: number;
  planned_text: string;
  semantic_origin:
    | "source_report"
    | "petra_inference"
    | "researcher_statement"
    | "structural_language";
  /**
   * The scientific force of the planned language. Origin is recorded separately and must not be inferred from this value.
   */
  scientific_force:
    | "direct_report"
    | "descriptive"
    | "association"
    | "comparison"
    | "qualification"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "none";
  /**
   * @maxItems 1000
   */
  evidence_refs: PlanEvidenceRef[];
  citation_required: boolean;
  /**
   * @maxItems 100
   */
  limitations: string[];
} & {
  move_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  position: number;
  planned_text: string;
  semantic_origin:
    | "source_report"
    | "petra_inference"
    | "researcher_statement"
    | "structural_language";
  /**
   * The scientific force of the planned language. Origin is recorded separately and must not be inferred from this value.
   */
  scientific_force:
    | "direct_report"
    | "descriptive"
    | "association"
    | "comparison"
    | "qualification"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "none";
  /**
   * @maxItems 1000
   */
  evidence_refs: PlanEvidenceRef[];
  citation_required: boolean;
  /**
   * @maxItems 100
   */
  limitations: string[];
};

/**
 * An immutable, inspectable plan that assigns evidence, uncertainty, citations, and scientific force before prose is drafted.
 */
export interface PetraCompositionPlan {
  schema_name: "petra.composition-plan";
  schema_version: "1.0.0";
  composition_plan_id: CompositionPlanId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  composition_request_ref: CompositionRequestRef;
  evidence_packet_ref: EvidencePacketRef;
  snapshot_ref: SnapshotRef;
  content: CompositionPlanContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
}
export interface CompositionRequestRef {
  composition_request_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidencePacketRef {
  evidence_packet_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface SnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  snapshot_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CompositionSection {
  section_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  position: number;
  heading: string;
  purpose: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  moves: [CompositionMove, ...CompositionMove[]];
}
export interface PlanEvidenceRef {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  context_selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  relation:
    "direct_report" | "qualification" | "supports_inference" | "context";
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
export interface UnresolvedSupport {
  description: string;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  affected_move_ids: [string & string, ...(string & string)[]];
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
