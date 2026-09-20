/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An exact idempotent request to begin a separately registered fresh-input Work attempt linked to retained prior Work. Actor, capability, replacement Work, and input choice are server-owned.
 */
export interface PetraProjectWorkStartAgainRequest {
  schema_name: "petra.project-work-start-again-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected_prior_work_unit_ref: WorkUnitRef;
  start_again_registration_ref: StartAgainRegistrationRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  submitted_at: string;
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
export interface StartAgainRegistrationRef {
  start_again_registration_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
