/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An exact idempotent request to continue one checkpointed WorkUnit through a server-registered compatible transition. Actor and capability authority are resolved by the authenticated server.
 */
export interface PetraProjectWorkResumeRequest {
  schema_name: "petra.project-work-resume-request";
  schema_version: "1.0.0";
  command_id: string;
  idempotency_key: string;
  expected_work_unit_ref: WorkUnitRef;
  expected_checkpoint: CheckpointRef;
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
export interface CheckpointRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
}
