/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type EpisodeContent = {
  view_kind: "causal_episode";
  change: RecentChange;
  causality: Causality;
  stream_order: StreamOrder;
  receipt_ref?: ReceiptRef;
  project_definition_authority: ProjectDefinitionAuthority;
  historical_semantic_destination: HistoricalSemanticDestination;
  /**
   * @minItems 4
   * @maxItems 4
   */
  omissions: [
    (
      | "dependency_impact_not_composed"
      | "generic_reversal_assessment_not_composed"
      | "historical_project_definition_content_not_returned"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "dependency_impact_not_composed"
      | "generic_reversal_assessment_not_composed"
      | "historical_project_definition_content_not_returned"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "dependency_impact_not_composed"
      | "generic_reversal_assessment_not_composed"
      | "historical_project_definition_content_not_returned"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "dependency_impact_not_composed"
      | "generic_reversal_assessment_not_composed"
      | "historical_project_definition_content_not_returned"
      | "cross_family_total_order_not_asserted"
    ),
  ];
  authority: AuthorityPosition;
  graph_navigation_history: "client_local_separate";
} & EpisodeContent1;
export type ProjectDefinitionAuthority =
  AvailableProjectDefinitionAuthority | UnavailableProjectDefinitionAuthority;
export type HistoricalSemanticDestination =
  | AvailableHistoricalSemanticDestination
  | UnavailableHistoricalSemanticDestinationWithoutAuthority
  | UnavailableHistoricalSemanticDestinationUnsupportedPlace
  | UnavailableHistoricalSemanticDestinationUnregisteredTarget;
export type RegisteredHistoricalTargetRef = TargetRef & {
  role: "primary";
  [k: string]: unknown;
} & (
    | {
        semantic_key?: "petra.change-set";
        object_id?: string;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.approval";
        object_id?: string;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "scientific.claim";
        object_id?: string;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "scientific.assertion";
        object_id?: string;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.project-source";
        object_id?: string;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.project-source-replacement";
        object_id?: string;
        [k: string]: unknown;
      }
    | {
        semantic_key?: "petra.project-source-replacement-retraction";
        object_id?: string;
        [k: string]: unknown;
      }
  );
export type EpisodeContent1 =
  | {
      project_definition_authority?: AvailableProjectDefinitionAuthority;
      historical_semantic_destination?:
        | AvailableHistoricalSemanticDestination
        | UnavailableHistoricalSemanticDestinationUnsupportedPlace
        | UnavailableHistoricalSemanticDestinationUnregisteredTarget;
      [k: string]: unknown;
    }
  | {
      project_definition_authority?: UnavailableProjectDefinitionAuthority;
      historical_semantic_destination?: UnavailableHistoricalSemanticDestinationWithoutAuthority;
      [k: string]: unknown;
    };

/**
 * An authorized exact Project History episode with a renderer-neutral historical History destination interpreted only from the exact retained ProjectDefinition effective before the selected event and a registered target adapter.
 */
export interface PetraProjectHistoryEpisodeViewV120 {
  schema_name: "petra.project-history-episode-view";
  schema_version: "1.2.0";
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
  parent_command?: RecordedCausalCommandLink | CommandOnlyCausalLink;
  /**
   * @maxItems 100
   */
  following_commands: (RecordedCausalCommandLink | CommandOnlyCausalLink)[];
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
export interface AvailableProjectDefinitionAuthority {
  state: "available";
  authority_source: "immutable_project_definition_event_stream_binding";
  selection_basis: "latest_retained_binding_effective_before_selected_event";
  effective_after_stream_revision: number;
  project_definition_ref: ProjectDefinitionRef;
  historical_destination_interpretation: "performed_for_selected_event_target";
}
export interface ProjectDefinitionRef {
  schema_name: "petra.project-definition";
  schema_version: "1.0.0";
  project_definition_id: string;
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
export interface UnavailableProjectDefinitionAuthority {
  state: "unavailable";
  reason_code: "retained_project_definition_authority_not_available";
  reason: "No exact retained ProjectDefinition authority binding is available for this selected event.";
  historical_destination_interpretation: "not_performed";
}
export interface AvailableHistoricalSemanticDestination {
  state: "available";
  target_ref: RegisteredHistoricalTargetRef;
  place_role: "history";
  task_intent: "view_history";
  route_authority: HistoryEpisodeRouteAuthority;
  project_definition_ref: ProjectDefinitionRef;
  interpretation_basis: "exact_retained_project_definition_and_registered_history_target";
}
export interface HistoryEpisodeRouteAuthority {
  schema_name: "petra.project-history-episode-view";
  schema_version: "1.2.0";
  view_kind: "causal_episode";
  event_ref: EventRef;
  authority_source: "selected_project_event_and_exact_retained_project_definition";
}
export interface UnavailableHistoricalSemanticDestinationWithoutAuthority {
  state: "unavailable";
  target_ref: TargetRef;
  reason_code: "retained_project_definition_authority_not_available";
  reason: "No historical semantic destination is available because exact retained ProjectDefinition authority is unavailable for this selected event.";
  interpretation_status: "not_performed";
}
export interface UnavailableHistoricalSemanticDestinationUnsupportedPlace {
  state: "unavailable";
  target_ref: RegisteredHistoricalTargetRef;
  reason_code: "retained_project_definition_history_place_not_supported";
  reason: "The exact retained ProjectDefinition does not authorize the History place for this selected event.";
  interpretation_status: "performed";
  project_definition_ref: ProjectDefinitionRef;
}
export interface UnavailableHistoricalSemanticDestinationUnregisteredTarget {
  state: "unavailable";
  target_ref: TargetRef;
  reason_code: "historical_event_target_destination_not_registered";
  reason: "No historical semantic-destination adapter is registered for this selected event target.";
  interpretation_status: "performed";
  project_definition_ref: ProjectDefinitionRef;
}
export interface AuthorityPosition {
  through_event_position: number;
  through_stream_revision: number;
}
