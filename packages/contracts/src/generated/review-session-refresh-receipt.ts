/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable result retained in the canonical command ledger for one authenticated ReviewSession refresh. It binds the prior and resulting revisions, exact refreshed working membership, current authority snapshot, preservation, and no-authority boundary.
 */
export interface PetraReviewSessionRefreshReceipt {
  schema_name: "petra.review-session-refresh-receipt";
  schema_version: "1.0.0";
  review_session_refresh_receipt_id: string;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ReceiptContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface ReceiptContent {
  command_ref: CommandRef;
  prior_review_session_ref: ExactReviewSessionRef;
  resulting_review_session_ref: ExactReviewSessionRef;
  transition: "refreshed";
  refresh_basis: RefreshBasis;
  preservation: Preservation;
  authority_boundary: AuthorityBoundary;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  command_name: "RefreshReviewSession";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  actor: ActorRef;
  capability_grant_id: string;
  correlation_id: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface ExactReviewSessionRef {
  review_session_id: string;
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
  lifecycle: "open";
}
export interface RefreshBasis {
  selection_basis: "same_review_members_current_working_heads";
  prior_snapshot: Snapshot;
  resulting_snapshot: Snapshot;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [RefreshedMember, ...RefreshedMember[]];
}
export interface Snapshot {
  event_position: number;
  stream_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  captured_at: string;
}
export interface RefreshedMember {
  review_member_id: string;
  candidate_ref: WorkingCandidateRef;
  /**
   * @minItems 1
   * @maxItems 100
   */
  relationship_refs: [WorkingRelationshipRef, ...WorkingRelationshipRef[]];
}
export interface WorkingCandidateRef {
  working_candidate_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkingRelationshipRef {
  working_relationship_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Preservation {
  stale_review_revision: "retained";
  review_members: "retained_same_identity";
  working_candidates: "retained";
  working_relationships: "retained";
  validation_records: "retained_unchanged";
  change_sets: "retained_unchanged";
  approvals: "retained_unchanged";
  command_events: "retained_unchanged";
  projection_receipts: "retained_unchanged";
}
export interface AuthorityBoundary {
  review_decision: "none";
  domain_authority: "unchanged";
  candidate_authority: "none";
  validation_authority: "none";
  change_set_authority: "none";
  approval_authority: "none";
  domain_event_effect: "none";
  projection_effect: "none";
}
