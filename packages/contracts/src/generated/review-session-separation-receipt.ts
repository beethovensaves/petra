/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable canonical-command result for explicitly moving one unchanged semantic Review member from a fresh open multi-member ReviewSession into a new canonical ReviewSession. Existing ChangeSet boundaries and every non-Review authority record remain unchanged.
 */
export interface PetraReviewSessionSeparationReceipt {
  schema_name: "petra.review-session-separation-receipt";
  schema_version: "1.0.0";
  review_session_separation_receipt_id: string;
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
  source_prior_review_session_ref: ExactReviewSessionRef;
  source_resulting_review_session_ref: ExactReviewSessionRef;
  separated_review_session_ref: ExactReviewSessionRef;
  partition: MemberPartition;
  preservation: Preservation;
  authority_boundary: AuthorityBoundary;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  command_name: "SeparateReviewSessionMember";
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
export interface MemberPartition {
  separated_review_member_id: string;
  /**
   * @minItems 1
   * @maxItems 99
   */
  retained_review_member_ids: [string, ...string[]];
  semantic_unit: "exact_review_member_unchanged";
  atomicity: "existing_change_sets_retained_without_cross_partition_unit";
}
export interface Preservation {
  prior_review_revision: "retained";
  review_member_identities: "retained_exactly_once";
  working_candidates: "retained_unchanged";
  working_relationships: "retained_unchanged";
  profile_records: "retained_unchanged";
  basis_and_provenance: "retained_unchanged";
  validation_records: "retained_unchanged";
  change_sets: "retained_unchanged_atomic_boundaries";
  approvals: "retained_unchanged";
  command_events: "retained_unchanged";
  projection_receipts: "retained_unchanged";
  member_outcomes: "retained_derived_from_existing_authority";
}
export interface AuthorityBoundary {
  review_membership: "separated_explicitly";
  review_decision: "none";
  candidate_authority: "none";
  validation_authority: "none";
  change_set_authority: "none";
  approval_authority: "none";
  domain_authority: "unchanged";
  domain_event_effect: "none";
  projection_effect: "none";
  recovery_effect: "none";
}
