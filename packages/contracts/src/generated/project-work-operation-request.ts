/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An exact idempotent request to manage one Project WorkUnit. Actor and capability authority are resolved by the authenticated server.
 */
export type PetraProjectWorkOperationRequest = {
  schema_name: "petra.project-work-operation-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  operation:
    "start" | "answer_input" | "steer" | "prioritize" | "cancel" | "retry";
  expected_work_unit_ref: WorkUnitRef;
  input_request_ref?: InputRequestRef;
  response?: string;
  expected_plan_revision?: number;
  instruction?: string;
  priority?: "user_blocking" | "user_visible" | "normal" | "opportunistic";
  reason?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
};

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
