/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CommandId = string;
export type IdempotencyKey = string;
export type CapabilityGrantId = string;
export type TraceId = string;
export type Command = SubmitChangeSet | RecordApproval | ApplyChangeSet;

/**
 * The adapter-neutral, idempotent command boundary for ChangeSet submission, human review, and application.
 */
export interface PetraCommandEnvelope {
  schema_name: "petra.command-envelope";
  schema_version: "1.0.0";
  command_id: CommandId;
  idempotency_key: IdempotencyKey;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: ActorRef;
  capability_grant_id: CapabilityGrantId;
  correlation_id: TraceId;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  causation_id?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
  command: Command;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface SubmitChangeSet {
  command_name: "SubmitChangeSet";
  change_set: PetraChangeSet;
}
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
  operations: [
    PromoteClaimOperation | PromoteAssertionOperation,
    ...(PromoteClaimOperation | PromoteAssertionOperation)[],
  ];
  impact: ImpactPreview;
  risk_tier: "R0" | "R1" | "R2" | "R3" | "R4";
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
export interface RecordApproval {
  command_name: "RecordApproval";
  approval: PetraApproval;
}
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
export interface ApplyChangeSet {
  command_name: "ApplyChangeSet";
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
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  approval_revision: number;
}
