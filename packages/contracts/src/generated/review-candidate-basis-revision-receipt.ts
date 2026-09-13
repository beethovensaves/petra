/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable receipt for one authorized, non-authoritative scientific source-basis revision that advances the same Claim, WorkingCandidate, WorkingRelationship, Review member, and ReviewSession identities while retaining prior revisions.
 */
export interface PetraReviewCandidateBasisRevisionReceipt {
  schema_name: "petra.review-candidate-basis-revision-receipt";
  schema_version: "1.0.0";
  review_candidate_basis_revision_receipt_id: string;
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
  project_definition_ref: ProjectDefinitionRef;
  prior_review_session_ref: ExactReviewSessionRef;
  resulting_review_session_ref: ExactReviewSessionRef;
  prior_candidate_ref: WorkingCandidateRecordRef;
  resulting_candidate_ref: WorkingCandidateRecordRef;
  prior_relationship_ref: WorkingRelationshipRecordRef;
  resulting_relationship_ref: WorkingRelationshipRecordRef;
  prior_profile_record_ref: ExactTypedRecordRef;
  resulting_profile_record_ref: ExactTypedRecordRef;
  prior_basis: SourceBasisSnapshot;
  resulting_basis: SourceBasisSnapshot;
  basis_transition: "material_revision_within_exact_scientific_source";
  validation_reset: ValidationReset;
  preservation: Preservation;
  authority_boundary: AuthorityBoundary;
}
export interface CommandRef {
  command_id: string;
  idempotency_key: string;
  command_name: "ReviseReviewCandidateBasis";
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
  definition_family: string;
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
export interface SourceBasisSnapshot {
  basis_kind: "source";
  project_source_ref: ExactProjectSourceRef;
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  source_span_refs: [ExactSourceSpanRef, ...ExactSourceSpanRef[]];
  source_scope: "full_text" | "abstract_only";
  detail_level: "broad" | "detailed";
  source_stance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  attribution: string;
  modality: "asserted" | "hedged" | "conditional" | "speculative";
  negated: boolean;
  uncertainty?: string;
}
export interface ExactProjectSourceRef {
  project_source_id: string;
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
  status: "active";
}
export interface ExactSourceSpanRef {
  schema_name: "petra.source-span";
  schema_version: "1.0.0";
  record_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ValidationReset {
  state: "pending";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  target_record_hash: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  required_validator_refs: [NamedVersionHash, ...NamedVersionHash[]];
  /**
   * @maxItems 0
   */
  completed_validator_refs: [];
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
