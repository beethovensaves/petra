/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type SpanMapping = CurrentMapping | StaleMapping;
export type ProvenanceBasis =
  | EvidenceBasis
  | PetraInferenceBasis
  | ResearcherBasis
  | StructuralBasis
  | UnsupportedBasis;
export type ProvenanceRelation =
  | "direct_report"
  | "support"
  | "qualification"
  | "comparison"
  | "interpretation"
  | "synthesis"
  | "structural"
  | "unsupported";

/**
 * An immutable exhaustive mapping from one DraftArtifact revision's named spans to evidence, Petra inference, researcher origin, structural language, or explicit unsupported state.
 */
export interface PetraProvenanceMap {
  schema_name: "petra.provenance-map";
  schema_version: "1.0.0";
  provenance_map_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  draft_ref: DraftRef;
  evidence_packet_ref: EvidencePacketRef;
  content: ProvenanceContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  compiled_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  compiled_at: string;
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
export interface EvidencePacketRef {
  evidence_packet_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ProvenanceContent {
  state: "current" | "stale";
  /**
   * @minItems 1
   * @maxItems 100000
   */
  mappings: [SpanMapping, ...SpanMapping[]];
}
export interface CurrentMapping {
  draft_span_id: string & string;
  draft_span_revision: 1;
  mapping_state: "current";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  bases: [ProvenanceBasis, ...ProvenanceBasis[]];
}
export interface EvidenceBasis {
  basis_kind: "evidence";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  evidence_selection_order: number;
  object_ref: ClaimRef | AssertionRef | SourceSpanRef | WorkVersionRef;
  relation: ProvenanceRelation;
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
  relation: ProvenanceRelation;
  rationale: string;
}
export interface ResearcherBasis {
  basis_kind: "researcher";
  /**
   * A Petra identifier whose kind is actor.
   */
  researcher_id: string;
  statement_kind: "supplied_statement" | "judgment";
  relation: ProvenanceRelation;
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
export interface StaleMapping {
  draft_span_id: string & string;
  draft_span_revision: 1;
  mapping_state: "stale";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  bases: [ProvenanceBasis, ...ProvenanceBasis[]];
  /**
   * @minItems 1
   * @maxItems 1000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  invalidated_by: [string, ...string[]];
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
