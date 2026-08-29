/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type CachePolicy = CacheEnabled | CacheDisabled;
export type CacheKey = string;
export type WorkUnitStatus =
  | RequestedStatus
  | QueuedStatus
  | RunningStatus
  | CheckpointedStatus
  | SucceededStatus
  | FailedStatus
  | CancelledStatus;
export type CapabilityGrantId = string;
export type TraceId = string;

/**
 * A revisioned control-plane record for one bounded task. Lifecycle completion records operational outcome only and never scientific warrant.
 */
export interface PetraWorkUnit {
  schema_name: "petra.work-unit";
  schema_version: "1.0.0";
  work_unit_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  spec: WorkUnitSpec;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  spec_hash: string;
  status: WorkUnitStatus;
  capability_grant_id: CapabilityGrantId;
  trace_id: TraceId;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
}
export interface WorkUnitSpec {
  workflow_name: string;
  workflow_version: string;
  objective: string;
  work_mode: "interactive" | "foreground" | "background" | "batch";
  priority: "user_blocking" | "user_visible" | "normal" | "opportunistic";
  /**
   * @maxItems 10000
   */
  dependency_work_unit_ids: string[];
  input_manifest_ref: InputManifestRef;
  idempotency_key: string;
  cache: CachePolicy;
  cancellation_policy: "cancellable" | "checkpoint_then_cancel" | "atomic";
  checkpoint_policy: "disabled" | "latest_valid" | "all_valid";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  deadline_at?: string;
}
export interface InputManifestRef {
  worker_input_manifest_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CacheEnabled {
  cache_mode: "reuse_exact" | "refresh";
  cache_key: CacheKey;
}
export interface CacheDisabled {
  cache_mode: "disabled";
}
export interface RequestedStatus {
  state: "requested";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
}
export interface QueuedStatus {
  state: "queued";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  queued_at: string;
}
export interface RunningStatus {
  state: "running";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  queued_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  attempt: number;
}
export interface CheckpointedStatus {
  state: "checkpointed";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  queued_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  attempt: number;
  checkpoint: CheckpointRef;
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
export interface SucceededStatus {
  state: "completed";
  terminal_outcome: "succeeded";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  queued_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  attempt: number;
  output_manifest_ref: OutputManifestRef;
}
export interface OutputManifestRef {
  worker_output_manifest_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface FailedStatus {
  state: "completed";
  terminal_outcome:
    "worker_failed" | "validation_failed" | "resource_exhausted" | "timed_out";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  queued_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  attempt: number;
  failure: Failure;
  output_manifest_ref?: OutputManifestRef;
}
export interface Failure {
  code: string;
  message: string;
  retryable: boolean;
}
export interface CancelledStatus {
  state: "cancelled";
  terminal_outcome: "cancelled";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  requested_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  queued_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  cancelled_at: string;
  attempt: number;
  reason: string;
  output_manifest_ref?: OutputManifestRef;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
