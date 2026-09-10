/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type SemanticKey = string;
export type Recovery = EligibleRecovery | IneligibleRecovery;

/**
 * An authorized, read-only Project History projection composed from immutable command and event authority, receipts, and current recovery authority. It is not a second ledger and excludes client-local graph navigation history.
 */
export interface PetraProjectHistoryView {
  schema_name: "petra.project-history-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: HistoryContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface HistoryContent {
  view_kind: "recent_changes";
  order: "newest_first";
  quick_window_limit: 10;
  /**
   * @maxItems 10
   */
  changes:
    | []
    | [RecentChange]
    | [RecentChange, RecentChange]
    | [RecentChange, RecentChange, RecentChange]
    | [RecentChange, RecentChange, RecentChange, RecentChange]
    | [RecentChange, RecentChange, RecentChange, RecentChange, RecentChange]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ]
    | [
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
        RecentChange,
      ];
  has_older: boolean;
  authority: AuthorityPosition;
  graph_navigation_history: "client_local_separate";
}
export interface RecentChange {
  command_ref: CommandRef;
  event_ref: EventRef;
  actor: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  family:
    | "change_control"
    | "project_source_lifecycle"
    | "project_source_replacement";
  /**
   * @minItems 1
   * @maxItems 100
   */
  targets: [TargetRef, ...TargetRef[]];
  observed_effect: ObservedEffect;
  recovery: Recovery;
  semantic_destination: SemanticDestination;
}
export interface CommandRef {
  command_id: string & string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  command_name:
    | "SubmitChangeSet"
    | "RecordApproval"
    | "ApplyChangeSet"
    | "ExcludeProjectSource"
    | "RestoreProjectSource"
    | "CreateProjectSourceReplacement"
    | "RetractProjectSourceReplacement";
  idempotency_key: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  command_fingerprint: string;
  capability_grant_id: string;
  correlation_id: string;
}
export interface EventRef {
  event_id: string & string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  event_type:
    | "change_set.submitted"
    | "approval.recorded"
    | "change_set.applied"
    | "change_set.conflicted"
    | "change_set.reverted"
    | "change_set.reversal_conflicted"
    | "project_source.excluded"
    | "project_source.restored"
    | "project_source.replacement_created"
    | "project_source.replacement_retracted";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string & string;
  actor_kind: "human" | "service" | "model";
}
export interface TargetRef {
  role: "primary" | "affected" | "related";
  semantic_key: SemanticKey;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision?: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash?: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash?: string;
  authority_state?: string;
}
export interface ObservedEffect {
  effect:
    | "change_proposed"
    | "approval_recorded"
    | "authority_change_applied"
    | "authority_change_conflicted"
    | "authority_change_reverted"
    | "reversal_conflicted"
    | "project_source_excluded"
    | "project_source_restored"
    | "source_replacement_created"
    | "source_replacement_retracted";
  outcome: "completed" | "conflicted";
  summary: string;
}
export interface EligibleRecovery {
  eligibility: "eligible";
  command_name:
    | "ExcludeProjectSource"
    | "RestoreProjectSource"
    | "RetractProjectSourceReplacement";
  expected_target_ref: RecoveryRef;
  reason: string;
}
export interface RecoveryRef {
  semantic_key: SemanticKey;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
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
export interface IneligibleRecovery {
  eligibility: "ineligible";
  reason: string;
}
export interface SemanticDestination {
  place_role: "history";
  task_intent: "view_history";
  object_ref: {
    semantic_key: SemanticKey;
    /**
     * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
     */
    object_id: string;
    /**
     * A one-based optimistic revision within JavaScript's safe-integer range.
     */
    revision?: number;
  };
}
export interface AuthorityPosition {
  through_event_position: number;
  through_stream_revision: number;
}
