/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type GoverningRelationshipId = string;

/**
 * A non-authoritative controlled-writing relationship payload that records which exact authority source governs one exact proposed Requirement. It enters working state through WorkingRelationship and cannot authorize, approve, apply, or publish either endpoint.
 */
export interface PetraControlledWritingGoverningRelationship {
  schema_name: "petra.controlled-writing-governing-relationship";
  schema_version: "1.0.0";
  governing_relationship_id: GoverningRelationshipId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: ProjectDefinitionRef;
  content: GoverningRelationshipContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  authority_boundary: AuthorityBoundary;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
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
export interface GoverningRelationshipContent {
  predicate: "GOVERNS";
  authority_source_ref: ExactTypedRecordRef;
  requirement_ref: ExactTypedRecordRef;
  rationale: string;
}
export interface ExactTypedRecordRef {
  schema_name: string;
  schema_version: string;
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
export interface AuthorityBoundary {
  domain_authority: false;
  review_decision: false;
  mutation_authority: false;
  apply_path: false;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
