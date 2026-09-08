/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A read-only, snapshot-consistent Review-session composition. Version 1.0 renders the existing scientific Claim-Assertion path inside shared Review roles.
 */
export interface PetraProjectReviewView {
  schema_name: "petra.project-review-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  review_session_id: string;
  content: ReviewViewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ReviewViewContent {
  session: SessionSummary;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember, ...ReviewMember[]];
  authority: AuthorityPosition;
}
export interface SessionSummary {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  title: string;
  objective_summary: string;
  objective?: ObjectiveSummary;
  status: "needs_decision" | "waiting" | "completed";
  status_label: string;
  responsible: {
    /**
     * A Petra identifier whose kind is actor.
     */
    actor_id: string;
    display_name: string;
  };
  project_definition_ref: DefinitionRef;
  project_definition_label: string;
  snapshot: ProjectSnapshot;
  snapshot_state: "current" | "stale";
  origin: OriginSummary;
  return_context: ReturnContext;
}
export interface ObjectiveSummary {
  objective_ref: ExactRef;
  objective_kind: string;
  statement: string;
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
  content_hash: string;
}
export interface DefinitionRef {
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ProjectSnapshot {
  event_position: number;
  stream_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  captured_at: string;
}
export interface OriginSummary {
  origin_kind:
    | "direct_edit"
    | "evidence_extraction"
    | "work_result"
    | "interaction"
    | "history_reversal";
  /**
   * @minItems 1
   * @maxItems 100
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_refs: [string, ...string[]];
  label: string;
  detail: string;
}
export interface ReturnContext {
  place:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "profile_tool";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_ref?: string;
  label: string;
}
export interface ReviewMember {
  review_member_id: string;
  member_role: "ordinary" | "exception";
  outcome:
    "awaiting_decision" | "waiting" | "applied" | "rejected" | "conflicted";
  candidate: CandidateSummary;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  basis: [BasisItem, ...BasisItem[]];
  validation: ValidationSummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  consequences: [string, ...string[]];
  /**
   * @maxItems 100
   */
  change_sets: ChangeSetSummary[];
}
export interface CandidateSummary {
  candidate_id: string;
  revision_label: string;
  kind_label: string;
  current: string;
  proposed: string;
  difference: string;
  origin_label: string;
  origin_detail: string;
  profile_payload: ScientificEvidencePayload;
}
export interface ScientificEvidencePayload {
  payload_kind: "scientific_evidence_pair";
  claim_ref: ExactRecordRef;
  assertion_ref: ExactRecordRef;
  claim_kind:
    | "descriptive"
    | "comparative"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "theoretical"
    | "measurement";
  assertion_predicate: "ASSERTS";
  /**
   * @maxItems 100
   */
  scope_dimensions: string[];
}
export interface ExactRecordRef {
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
export interface BasisItem {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  basis_id: string;
  label: string;
  relation: string;
  extent: string;
  detail: string;
  project_source_id?: string;
  project_source_status?: "active" | "excluded";
  source_span_ref?: ExactRecordRef;
}
export interface ValidationSummary {
  state: "passed" | "needs_judgment" | "blocked";
  label: string;
  detail: string;
  recovery?: string;
}
export interface ChangeSetSummary {
  change_set_ref: ExactRef;
  state: "submitted" | "approved" | "rejected" | "applied" | "conflicted";
  atomicity: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  changes: [string, ...string[]];
  /**
   * @minItems 1
   * @maxItems 100
   */
  protected: [string, ...string[]];
  impact_summary: string;
  approval_ref?: ExactRecordRef;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
