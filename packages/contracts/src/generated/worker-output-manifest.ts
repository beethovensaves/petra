/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type WorkerOutputManifestId = string;
export type WorkerOutcome = SucceededOutcome | UnsuccessfulOutcome;
export type NonNegativeSafeInteger = number;

/**
 * An immutable worker report containing only staged output handles, hashes, diagnostics, and measured use. The TypeScript control plane must verify it before registering artifacts or proposals.
 */
export interface PetraWorkerOutputManifest {
  schema_name: "petra.worker-output-manifest";
  schema_version: "1.0.0";
  worker_output_manifest_id: WorkerOutputManifestId;
  /**
   * A worker report is immutable; a retry creates another attempt and output manifest.
   */
  revision: 1;
  work_unit_id: string;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  attempt: number;
  worker_input_manifest_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  worker_input_manifest_hash: string;
  content: OutputContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  reported_at: string;
}
export interface OutputContent {
  worker: WorkerDescriptor;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
  outcome: WorkerOutcome;
  /**
   * @maxItems 10000
   */
  diagnostics: Diagnostic[];
  /**
   * @maxItems 10000
   */
  network_activity: NetworkActivity[];
  resource_usage: ResourceUsage;
}
export interface WorkerDescriptor {
  executor_kind: "python_worker" | "typescript_worker" | "sandbox";
  worker_name: string;
  worker_version: string;
  runtime_name: string;
  runtime_version: string;
  entrypoint: string;
}
export interface SucceededOutcome {
  outcome_kind: "succeeded";
  /**
   * @minItems 1
   * @maxItems 1000
   */
  produced_outputs: [ProducedOutput, ...ProducedOutput[]];
}
export interface ProducedOutput {
  output_name: string;
  output_role:
    "result" | "proposal" | "diagnostic" | "log" | "metrics" | "checkpoint";
  output_handle: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
  media_type: string;
  contract?: ContractRef;
}
export interface ContractRef {
  schema_name: string;
  schema_version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface UnsuccessfulOutcome {
  outcome_kind:
    "worker_failed" | "resource_exhausted" | "timed_out" | "cancelled";
  failure: Failure;
  /**
   * @maxItems 1000
   */
  produced_outputs: ProducedOutput[];
}
export interface Failure {
  code: string;
  message: string;
  retryable: boolean;
}
export interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
}
export interface NetworkActivity {
  destination: string;
  bytes_sent: NonNegativeSafeInteger;
  bytes_received: NonNegativeSafeInteger;
}
export interface ResourceUsage {
  wall_time_ms: NonNegativeSafeInteger;
  cpu_time_ms: NonNegativeSafeInteger;
  peak_memory_bytes: NonNegativeSafeInteger;
  input_bytes: NonNegativeSafeInteger;
  output_bytes: NonNegativeSafeInteger;
  network_bytes: NonNegativeSafeInteger;
  gpu_time_ms?: NonNegativeSafeInteger;
  input_tokens?: NonNegativeSafeInteger;
  output_tokens?: NonNegativeSafeInteger;
  cost?: MeasuredCost;
}
export interface MeasuredCost {
  currency: string;
  microunits: NonNegativeSafeInteger;
}
