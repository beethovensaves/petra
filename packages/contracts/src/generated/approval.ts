/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A human decision bound to one exact ChangeSet revision and canonical content hash.
 */
export interface PetraApproval {
  schema_name: "petra.approval";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  subject: ChangeSetSubject;
  decision: "approved" | "rejected";
  decision_scope: "exact_change_set";
  decided_by: HumanActorRef;
  rationale: string;
  /**
   * @maxItems 100
   */
  conditions: string[];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  decided_at: string;
}
export interface ChangeSetSubject {
  subject_kind: "change_set";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  change_set_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
