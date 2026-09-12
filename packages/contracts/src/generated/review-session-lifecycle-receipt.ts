/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable receipt for one authenticated, idempotent ReviewSession defer or reopen transition. The transition changes Review coordination state only and grants no approval, ChangeSet, domain-event, or projection authority.
 */
export interface PetraReviewSessionLifecycleReceipt {
  schema_name: "petra.review-session-lifecycle-receipt";
  schema_version: "1.0.0";
  review_session_lifecycle_receipt_id: string;
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
  prior_review_session_ref: ExactReviewSessionRecordRef;
  resulting_review_session_ref: ExactReviewSessionRecordRef;
  transition: "deferred" | "reopened";
  rationale?: string;
  preservation: Preservation;
  authority_boundary: AuthorityBoundary;
  recovery: Recovery;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  command_name: "DeferReviewSession" | "ReopenReviewSession";
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
export interface ExactReviewSessionRecordRef {
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
  lifecycle: "open" | "deferred" | "completed";
}
export interface Preservation {
  review_history: "retained";
  working_candidates: "retained";
  working_relationships: "retained";
  change_sets: "retained";
  approvals: "retained";
  command_events: "retained_unchanged";
  projection_receipts: "retained_unchanged";
}
export interface AuthorityBoundary {
  review_decision: "none";
  domain_authority: "unchanged";
  change_set_authority: "none";
  validation_authority: "none";
  domain_event_effect: "none";
  projection_effect: "none";
}
export interface Recovery {
  state: "available";
  inverse_command_name: "DeferReviewSession" | "ReopenReviewSession";
  expected_review_session_ref: ExactReviewSessionRecordRef;
}
