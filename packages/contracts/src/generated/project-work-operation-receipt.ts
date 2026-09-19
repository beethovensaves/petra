/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * The immutable result of one authorized Project Work operation. Operational effects never imply domain authority.
 */
export interface PetraProjectWorkOperationReceipt {
  schema_name: "petra.project-work-operation-receipt";
  schema_version: "1.0.0";
  receipt_id: string;
  command_id: string;
  idempotency_key: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  operation:
    "start" | "answer_input" | "steer" | "prioritize" | "cancel" | "retry";
  outcome:
    | "started"
    | "input_answered"
    | "steered"
    | "prioritized"
    | "cancelled"
    | "retried";
  actor: {
    /**
     * A Petra identifier whose kind is actor.
     */
    actor_id: string;
    actor_kind: "human";
  };
  capability_grant_id: string;
  requested_work_unit_ref: WorkUnitRef;
  resulting_work_unit_ref: WorkUnitRef;
  input_request_ref?: InputRequestRef;
  plan_revision?: number;
  effect: {
    kind: "operational_only";
    summary: string;
    prior_attempts_preserved: true;
    domain_authority_changed: false;
  };
  destination: {
    place_role: "work";
    work_unit_ref: WorkUnitRef;
  };
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
export interface InputRequestRef {
  input_request_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
}
