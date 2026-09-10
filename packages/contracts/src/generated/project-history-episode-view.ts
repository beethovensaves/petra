/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CausalCommandLink =
  RecordedCausalCommandLink | CommandOnlyCausalLink;

/**
 * An authorized exact Project History episode selected by immutable event identity. It distinguishes explicit command causation from adjacent Project-stream order and persists no second ledger.
 */
export interface PetraProjectHistoryEpisodeView {
  schema_name: "petra.project-history-episode-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  content: EpisodeContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface EpisodeContent {
  view_kind: "causal_episode";
  change: RecentChange;
  causality: Causality;
  stream_order: StreamOrder;
  receipt_ref?: ReceiptRef;
  /**
   * @minItems 3
   * @maxItems 3
   */
  omissions: [
    (
      | "dependency_impact_not_composed"
      | "generic_reversal_assessment_not_composed"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "dependency_impact_not_composed"
      | "generic_reversal_assessment_not_composed"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "dependency_impact_not_composed"
      | "generic_reversal_assessment_not_composed"
      | "cross_family_total_order_not_asserted"
    ),
  ];
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
  recovery: EligibleRecovery | IneligibleRecovery;
  semantic_destination: SemanticDestination;
}
export interface CommandRef {
  command_id: string;
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
  event_id: string;
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
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface TargetRef {
  role: "primary" | "affected" | "related";
  semantic_key: string;
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
  semantic_key: string;
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
    semantic_key: string;
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
export interface Causality {
  event_causation_kind: "command";
  event_causation_command_id: string;
  parent_command?: CausalCommandLink;
  /**
   * @maxItems 100
   */
  following_commands: CausalCommandLink[];
}
export interface RecordedCausalCommandLink {
  command_id: string;
  event_state: "recorded";
  event_ref: EventRef;
}
export interface CommandOnlyCausalLink {
  command_id: string;
  event_state: "not_recorded";
}
export interface StreamOrder {
  order_kind: "project_stream";
  previous_event_ref?: EventRef;
  next_event_ref?: EventRef;
}
export interface ReceiptRef {
  schema_name:
    | "petra.project-source-lifecycle-receipt"
    | "petra.project-source-replacement-receipt";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface AuthorityPosition {
  through_event_position: number;
  through_stream_revision: number;
}
