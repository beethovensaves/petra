/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CausalCommandGroup = BoundedGroupBase & {
  relation: "caused_by_selected_command";
  authority_source: "immutable_command_causation";
  total_count: unknown;
  returned_count: unknown;
  coverage: unknown;
  /**
   * @maxItems 100
   */
  refs: CausalCommand[];
};
export type CausalCommand = RecordedCausalCommand | UnrecordedCausalCommand;
export type OutboxGroup = BoundedGroupBase & {
  relation: "carries_selected_event";
  authority_source: "immutable_event_outbox_binding";
  total_count: unknown;
  returned_count: unknown;
  coverage: unknown;
  /**
   * @maxItems 100
   */
  refs: OutboxRecordRef[];
};
export type ProjectionGroup = BoundedGroupBase & {
  relation: "projects_selected_event";
  authority_source: "immutable_projection_event_binding";
  total_count: unknown;
  returned_count: unknown;
  coverage: unknown;
  /**
   * @maxItems 100
   */
  refs: GraphProjectionRecordRef[];
};
export type GroundedResponseGroup = BoundedGroupBase & {
  relation: "invalidated_by_selected_event";
  authority_source: "immutable_response_invalidation_binding";
  total_count: unknown;
  returned_count: unknown;
  coverage: unknown;
  /**
   * @maxItems 100
   */
  refs: GroundedResponseInvalidationRef[];
};

/**
 * An authorized, event-selected, read-only inventory of bounded direct dependents proven by Petra's registered immutable command, outbox, projection, and grounded-response invalidation bindings. It does not decide reversibility or compose compensation.
 */
export interface PetraProjectHistoryImpactView {
  schema_name: "petra.project-history-impact-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  event_id: string;
  content: ImpactContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface ImpactContent {
  view_kind: "dependency_impact";
  selected_event: EventAnchor;
  authorization_scope: "authenticated_project";
  impact: Impact;
  decision_boundary: DecisionBoundary;
  authority: AuthorityPosition;
  /**
   * @minItems 6
   * @maxItems 6
   */
  omissions: [
    (
      | "semantic_target_dependencies_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "semantic_target_dependencies_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "semantic_target_dependencies_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "semantic_target_dependencies_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "semantic_target_dependencies_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
    (
      | "semantic_target_dependencies_not_composed"
      | "transitive_dependency_closure_not_composed"
      | "reversibility_not_assessed"
      | "compensation_not_composed"
      | "historical_project_definition_not_interpreted"
      | "cross_family_total_order_not_asserted"
    ),
  ];
  graph_navigation_history: "client_local_separate";
}
export interface EventAnchor {
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
export interface Impact {
  scope: "registered_direct_event_and_command_dependents";
  summary: ImpactSummary;
  causal_commands: CausalCommandGroup;
  outbox_records: OutboxGroup;
  graph_projection_records: ProjectionGroup;
  grounded_response_invalidations: GroundedResponseGroup;
  /**
   * @minItems 3
   * @maxItems 3
   */
  unknowns: [
    (
      | "unregistered_profile_specific_dependencies_may_exist"
      | "transitive_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
    (
      | "unregistered_profile_specific_dependencies_may_exist"
      | "transitive_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
    (
      | "unregistered_profile_specific_dependencies_may_exist"
      | "transitive_dependents_may_exist"
      | "external_system_dependents_are_not_observable"
    ),
  ];
}
export interface ImpactSummary {
  registered_group_count: 4;
  total_count: number;
  coverage: "complete" | "truncated";
}
export interface BoundedGroupBase {
  total_count: number;
  returned_count: number;
  coverage: "complete" | "truncated";
  [k: string]: unknown;
}
export interface RecordedCausalCommand {
  command_ref: CommandRef;
  outcome: "success" | "failure";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  event_state: "recorded";
  event_ref: EventRef;
}
export interface UnrecordedCausalCommand {
  command_ref: CommandRef;
  outcome: "success" | "failure";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  event_state: "not_recorded";
}
export interface OutboxRecordRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  outbox_id: string;
  schema_version: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  target: "neo4j_graph" | "interface_authority";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  enqueued_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface GraphProjectionRecordRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  graph_projection_record_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  outbox_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  attempt: number;
  outcome: "applied" | "failed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface GroundedResponseInvalidationRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  grounded_response_id: string;
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
  posture: "current" | "historical";
  cache_state: "invalidated";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  invalidation_position: number;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  change_set_id: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface DecisionBoundary {
  reversibility: "not_assessed";
  compensation: "not_composed";
  dependent_effect: "not_inferred_from_reference";
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  through_event_position: number;
  through_stream_revision: number;
}
