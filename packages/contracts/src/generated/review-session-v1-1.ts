/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A durable, revisioned, profile-neutral decision context whose members bind exact canonical working-state revisions and exact profile-registered candidate records. Review composition grants no domain or mutation authority.
 */
export interface PetraReviewSessionV110 {
  schema_name: "petra.review-session";
  schema_version: "1.1.0";
  review_session_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  project_definition_ref: DefinitionRef;
  content: SessionContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  created_by: HumanActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface DefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface SessionContent {
  title: string;
  objective_summary: string;
  objective_ref: ObjectiveRef;
  lifecycle: "open" | "deferred" | "completed";
  responsible: HumanActorRef;
  snapshot: ProjectSnapshot;
  origin: Origin;
  return_context: ReturnContext;
  /**
   * @minItems 1
   * @maxItems 100
   */
  members: [ReviewMember, ...ReviewMember[]];
}
export interface ObjectiveRef {
  objective_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface ProjectSnapshot {
  event_position: number;
  stream_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  captured_at: string;
}
export interface Origin {
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
  summary: string;
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
  review_member_id: string & string;
  member_role: "ordinary" | "exception";
  working_state: WorkingStateBinding;
  /**
   * @minItems 1
   * @maxItems 100
   */
  candidate_bindings: [CandidateBinding, ...CandidateBinding[]];
}
export interface WorkingStateBinding {
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
export interface CandidateBinding {
  semantic_key: string;
  binding_role: "candidate" | "relationship" | "finding";
  record_ref: ExactRecordRef;
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
