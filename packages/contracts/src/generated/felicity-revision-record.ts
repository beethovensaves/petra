/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type FelicityRevisionRecordId = string;

/**
 * An immutable receipt proving that one bounded Felicity transformation became a new DraftArtifact revision without changing scientific force, epistemic origin, provenance bases, or citation scope.
 */
export interface PetraFelicityRevisionRecord {
  schema_name: "petra.felicity-revision-record";
  schema_version: "1.0.0";
  felicity_revision_record_id: FelicityRevisionRecordId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  command_id: string;
  previous_draft_ref: DraftRef;
  revised_draft_ref: DraftRef;
  provenance_map_ref: ProvenanceMapRef;
  citation_bundle_ref: CitationBundleRef;
  language_contract: NamedVersionHash;
  content: RevisionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  recorded_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
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
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RevisionContent {
  state: "passed";
  /**
   * @minItems 1
   * @maxItems 100000
   */
  transformations: [SpanTransformation, ...SpanTransformation[]];
  /**
   * @minItems 5
   * @maxItems 1000
   */
  validator_results: [
    ValidatorResult,
    ValidatorResult,
    ValidatorResult,
    ValidatorResult,
    ValidatorResult,
    ...ValidatorResult[],
  ];
  preservation: PreservationBoundary;
  authority_boundary: AuthorityBoundary;
}
export interface SpanTransformation {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  position: number;
  previous_draft_span_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  previous_exact_text_hash: string;
  revised_draft_span_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  revised_exact_text_hash: string;
  transformation_kind:
    | "unchanged"
    | "filler_reduction"
    | "whitespace_normalization"
    | "filler_and_whitespace";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  basis_snapshot_hash: string;
  /**
   * @maxItems 100000
   */
  previous_citation_ids: (string & string)[];
  /**
   * @maxItems 100000
   */
  revised_citation_ids: (string & string)[];
}
export interface ValidatorResult {
  validator: string;
  version: string;
  outcome: "pass" | "fail" | "warning";
  code: string;
  message?: string;
}
export interface PreservationBoundary {
  scientific_force_preserved: true;
  epistemic_origin_preserved: true;
  provenance_bases_preserved: true;
  citation_scope_preserved: true;
}
export interface AuthorityBoundary {
  record_is_scientific_evidence: false;
  content_changes_require_new_draft_revision: true;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
