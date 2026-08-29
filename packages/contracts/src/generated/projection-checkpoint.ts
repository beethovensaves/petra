/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CheckpointPosition = EmptyPosition | AdvancedPosition;
export type Freshness =
  CurrentFreshness | CatchingUpFreshness | BlockedFreshness;

/**
 * A revisioned PostgreSQL-authoritative snapshot of one Project graph projection's contiguous position, observed outbox head, and visible freshness.
 */
export interface PetraProjectionCheckpoint {
  schema_name: "petra.projection-checkpoint";
  schema_version: "1.0.0";
  projection_checkpoint_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  projection: ProjectionIdentity;
  content: CheckpointContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  recorded_by: ServiceActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
export interface ProjectionIdentity {
  target: "neo4j_graph";
  projection_name: string;
  projection_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  configuration_hash: string;
}
export interface CheckpointContent {
  position: CheckpointPosition;
  observed_head: ObservedHead;
  freshness: Freshness;
}
export interface EmptyPosition {
  position_kind: "empty";
  target_sequence: 0;
}
export interface AdvancedPosition {
  position_kind: "advanced";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  outbox_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  event_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
  graph_projection_record_id: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  advanced_at: string;
}
export interface ObservedHead {
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  outbox_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  event_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  observed_at: string;
}
export interface CurrentFreshness {
  state: "current";
  pending_records: 0;
}
export interface CatchingUpFreshness {
  state: "catching_up";
  pending_records: number;
}
export interface BlockedFreshness {
  state: "blocked";
  pending_records: number;
  blocking_projection_record_id: string;
  failure_code: string;
  message: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  blocked_at: string;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
