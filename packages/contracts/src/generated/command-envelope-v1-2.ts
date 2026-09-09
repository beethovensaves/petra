/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Command =
  | SubmitChangeSet
  | RecordApproval
  | ApplyChangeSet
  | ExcludeProjectSource
  | RestoreProjectSource;
export type ChangeSetContent = {
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
    (
      | PromoteClaimOperation
      | PromoteAssertionOperation
      | RetractClaimOperation
      | RetractAssertionOperation
    ),
    ...(
      | PromoteClaimOperation
      | PromoteAssertionOperation
      | RetractClaimOperation
      | RetractAssertionOperation
    )[],
  ];
  impact: ImpactPreview;
  risk_tier: "R0" | "R1" | "R2" | "R3" | "R4";
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensates_change_set_id?: string;
} & (
  | {
      operations?: unknown[];
      /**
       * A Petra identifier whose kind is change_set.
       */
      compensates_change_set_id: string;
      [k: string]: unknown;
    }
  | {
      operations?: unknown[];
      compensates_change_set_id?: never;
      [k: string]: unknown;
    }
);

/**
 * The adapter-neutral command envelope extended with exact ProjectSource exclude and restore transitions.
 */
export interface PetraCommandEnvelopeV120 {
  schema_name: "petra.command-envelope";
  schema_version: "1.2.0";
  command_id: string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: ActorRef;
  capability_grant_id: string;
  correlation_id: string;
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
  change_set: PetraChangeSetV110;
}
/**
 * An immutable, content-bound scientific authority change supporting both initial promotion and explicit compensating reversal.
 */
export interface PetraChangeSetV110 {
  schema_name: "petra.change-set";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  revision: 1;
  state: "submitted";
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
export interface RetractClaimOperation {
  operation_kind: "retract_claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: HumanTrustedState1;
  after: HumanRejectedState;
}
export interface HumanTrustedState1 {
  zone: "trusted";
  review_state: "human_accepted";
}
export interface HumanRejectedState {
  zone: "quarantine";
  review_state: "human_rejected";
}
export interface RetractAssertionOperation {
  operation_kind: "retract_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: HumanTrustedState1;
  after: HumanRejectedState;
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
export interface ExcludeProjectSource {
  command_name: "ExcludeProjectSource";
  expected_source_ref: ExactProjectSourceRef & {
    status?: "active";
    [k: string]: unknown;
  };
  reason: string;
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
  status: "active" | "excluded";
}
export interface RestoreProjectSource {
  command_name: "RestoreProjectSource";
  expected_source_ref: ExactProjectSourceRef & {
    status?: "excluded";
    [k: string]: unknown;
  };
  reason: string;
}
