/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type GraphProjectionRecordId = string;
export type OutboxId = string;
export type EventId = string;
export type ProjectionOutcome = AppliedOutcome | FailedOutcome;

/**
 * An immutable receipt for one attempt to project one Neo4j outbox delivery. An applied receipt is recorded only after the graph commit succeeds.
 */
export interface PetraGraphProjectionRecord {
  schema_name: "petra.graph-projection-record";
  schema_version: "1.0.0";
  graph_projection_record_id: GraphProjectionRecordId;
  /**
   * A retry creates another immutable projection record.
   */
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  projection: ProjectionIdentity;
  content: ProjectionContent;
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
export interface ProjectionContent {
  outbox_ref: OutboxRef;
  attempt: number;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  outcome: ProjectionOutcome;
}
export interface OutboxRef {
  outbox_id: OutboxId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  event_id: EventId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
}
export interface AppliedOutcome {
  outcome_kind: "applied";
  effect: ProjectionEffect;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  effect_hash: string;
  backend_receipt: BackendReceipt;
}
export interface ProjectionEffect {
  source_event_id: EventId;
  /**
   * @minItems 1
   * @maxItems 100000
   */
  objects: [ProjectedObject, ...ProjectedObject[]];
}
export interface ProjectedObject {
  graph_element_kind: "node" | "relationship";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  operation: "upsert" | "tombstone";
}
export interface BackendReceipt {
  backend_kind: "neo4j";
  receipt: string;
}
export interface FailedOutcome {
  outcome_kind: "failed";
  failure: ProjectionFailure;
}
export interface ProjectionFailure {
  code: string;
  message: string;
  retryable: boolean;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
