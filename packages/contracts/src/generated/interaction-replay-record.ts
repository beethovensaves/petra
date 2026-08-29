/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type InteractionReplayRecordId = string;
export type InteractionRunId = string;
export type ConnectionId = string;
export type InteractionEventRecordId = string;
export type DeliveryOutcome =
  | {
      outcome_kind: "completed";
    }
  | {
      outcome_kind: "connection_aborted";
      last_delivered_sequence: number;
    }
  | {
      outcome_kind: "write_error";
      last_delivered_sequence: number;
      error: {
        code: string;
        message: string;
      };
    };

/**
 * An immutable receipt for one initial or resumed delivery of interaction events to a connection. It records presentation replay only and cannot reapply commands or cancel durable work.
 */
export interface PetraInteractionReplayRecord {
  schema_name: "petra.interaction-replay-record";
  schema_version: "1.0.0";
  interaction_replay_record_id: InteractionReplayRecordId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  interaction_run_ref: InteractionRunRef;
  content: ReplayContent;
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
export interface InteractionRunRef {
  interaction_run_id: InteractionRunId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ReplayContent {
  connection_id: ConnectionId;
  attempt: number;
  request: {
    delivery_kind: "initial" | "resume" | "replay";
    after_sequence: number;
  };
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  /**
   * @maxItems 100000
   */
  delivered_event_refs: EventRecordRef[];
  outcome: DeliveryOutcome;
  work_unit_observation: WorkUnitObservation;
  authority_boundary: {
    authority_reapplied: false;
    commands_reexecuted: false;
    durable_work_cancelled: false;
  };
}
export interface EventRecordRef {
  interaction_event_record_id: InteractionEventRecordId;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  sequence: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkUnitObservation {
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  status:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "succeeded"
    | "failed"
    | "cancelled";
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
