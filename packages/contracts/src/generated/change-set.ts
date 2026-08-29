/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ChangeOperation = PromoteClaimOperation | PromoteAssertionOperation;

/**
 * An immutable, content-bound proposal for one atomic scientific authority change.
 */
export interface PetraChangeSet {
  schema_name: "petra.change-set";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  state:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "applied"
    | "conflicted"
    | "reverted";
  content: ChangeSetContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface ChangeSetContent {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  origin: "direct_edit" | "agent_proposal" | "worker_proposal";
  proposed_by: ActorRef;
  reason: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  operations: [ChangeOperation, ...ChangeOperation[]];
  impact: ImpactPreview;
  risk_tier: "R0" | "R1" | "R2" | "R3" | "R4";
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface PromoteClaimOperation {
  operation_kind: "promote_claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: QuarantineState;
  after: HumanTrustedState;
}
export interface QuarantineState {
  zone: "quarantine";
  review_state: "unreviewed" | "machine_checked";
}
export interface HumanTrustedState {
  zone: "trusted";
  review_state: "human_accepted";
}
export interface PromoteAssertionOperation {
  operation_kind: "promote_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: QuarantineState;
  after: HumanTrustedState;
}
export interface ImpactPreview {
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  affected_object_ids: [string, ...string[]];
  /**
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  downstream_object_ids: string[];
  summary: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  generated_at: string;
}
