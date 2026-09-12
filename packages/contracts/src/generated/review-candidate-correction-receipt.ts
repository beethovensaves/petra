/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable receipt for one authorized, non-authoritative candidate correction that advances the same scientific WorkingCandidate, WorkingRelationship, Review member, and ReviewSession identities.
 */
export interface PetraReviewCandidateCorrectionReceipt {
  schema_name: "petra.review-candidate-correction-receipt";
  schema_version: "1.0.0";
  review_candidate_correction_receipt_id: string;
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
  review_member_id: string;
  prior_review_session_ref: ExactReviewSessionRef;
  resulting_review_session_ref: ExactReviewSessionRef;
  prior_candidate_ref: WorkingCandidateRecordRef;
  resulting_candidate_ref: WorkingCandidateRecordRef;
  prior_relationship_ref: WorkingRelationshipRecordRef;
  resulting_relationship_ref: WorkingRelationshipRecordRef;
  prior_profile_record_ref: ExactTypedRecordRef;
  resulting_profile_record_ref: ExactTypedRecordRef;
  correction_kind: "mechanical_correction" | "material_revision";
  basis_transition: "retained_exact_scientific_source";
  validation: ValidationBinding;
  preservation: Preservation;
  authority_boundary: AuthorityBoundary;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  command_name: "CorrectReviewCandidate";
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
export interface WorkingCandidateRecordRef {
  schema_name: "petra.working-candidate";
  schema_version: "1.0.0";
  record_id: string;
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
export interface WorkingRelationshipRecordRef {
  schema_name: "petra.working-relationship";
  schema_version: "1.0.0";
  record_id: string;
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
export interface ExactTypedRecordRef {
  schema_name: "petra.claim";
  schema_version: "1.0.0";
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
export interface ValidationBinding {
  state: "pending" | "completed" | "blocked";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  target_record_hash: string;
  /**
   * @maxItems 100
   */
  validator_refs: NamedVersionHash[];
}
export interface NamedVersionHash {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Preservation {
  candidate_identity: "retained";
  prior_candidate_revision: "retained";
  relationship_identity: "retained";
  prior_relationship_revision: "retained";
  review_session_identity: "retained";
  review_member_identity: "retained";
  review_decision: "none";
  change_sets: "unchanged";
  approvals: "unchanged";
  domain_events: "none";
  projection: "unchanged";
  history: "unchanged";
}
export interface AuthorityBoundary {
  candidate_authority: "working_only";
  review_decision: "none";
  domain_authority: "unchanged";
  validation_authority: "none";
  mutation_authority: "capability_command_only";
  conversation_authority: "none";
  model_output_authority: "none";
}
