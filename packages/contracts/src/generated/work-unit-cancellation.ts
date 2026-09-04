/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type WorkUnitCancellationId = string;

/**
 * An immutable receipt for one authorized, idempotent command that cancels a durable WorkUnit. Cancellation is operational history and never a scientific finding.
 */
export interface PetraWorkUnitCancellation {
  schema_name: "petra.work-unit-cancellation";
  schema_version: "1.0.0";
  work_unit_cancellation_id: WorkUnitCancellationId;
  revision: 1;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: CancellationContent;
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
export interface CancellationContent {
  command: CancellationCommand;
  outcome: CancelledOutcome;
  authority_boundary: {
    effect_kind: "operational_only";
    scientific_authority_changed: false;
    connection_abort_was_command: false;
  };
}
export interface CancellationCommand {
  command_name: "CancelWorkUnit";
  command_id: string;
  idempotency_key: string;
  expected_work_unit_ref: WorkUnitRef;
  interaction: InteractionCorrelation;
  reason: string;
  requested_by: ServiceActorRef;
  capability_grant_id: string;
  trace_id: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
}
export interface WorkUnitRef {
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
}
export interface InteractionCorrelation {
  protocol_thread_id: string;
  protocol_run_id: string;
}
export interface ServiceActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "service";
}
export interface CancelledOutcome {
  outcome_kind: "cancelled";
  work_unit_ref: WorkUnitRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  cancelled_at: string;
}
