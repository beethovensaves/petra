/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type WorkerInputManifestId = string;
export type WorkUnitId = string;
export type NamespacedName = string;
export type Version = string;
export type InputBinding = ArtifactInputBinding | RecordInputBinding;
export type SlotName = string;
export type MediaType = string;
export type PositiveSafeInteger = number;
export type NetworkPolicy = BlockedNetwork | AllowlistedNetwork;

/**
 * An immutable, content-bound instruction manifest for one bounded WorkUnit. It may be reused for an authorized retry and carries references, limits, and output slots but no database authority.
 */
export interface PetraWorkerInputManifest {
  schema_name: "petra.worker-input-manifest";
  schema_version: "1.0.0";
  worker_input_manifest_id: WorkerInputManifestId;
  /**
   * A changed task, input, worker, permission, or limit creates a new manifest.
   */
  revision: 1;
  work_unit_id: WorkUnitId;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: InputContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  issued_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  issued_at: string;
}
export interface InputContent {
  task: TaskDescriptor;
  worker: WorkerDescriptor;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  inputs: [InputBinding, ...InputBinding[]];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  expected_outputs: [ExpectedOutput, ...ExpectedOutput[]];
  resource_limits: ResourceLimits;
  network_policy: NetworkPolicy;
  partial_result_policy: "discard" | "retain_declared" | "retain_diagnostics";
}
export interface TaskDescriptor {
  task_family:
    | "ingestion"
    | "document_processing"
    | "scientific_extraction"
    | "retrieval"
    | "reasoning"
    | "scientific_computation"
    | "experiment_execution"
    | "projection"
    | "maintenance";
  task_name: NamespacedName;
  task_version: Version;
}
export interface WorkerDescriptor {
  executor_kind: "python_worker" | "typescript_worker" | "sandbox";
  worker_name: NamespacedName;
  worker_version: Version;
  runtime_name: string;
  runtime_version: Version;
  entrypoint: string;
}
export interface ArtifactInputBinding {
  binding_kind: "artifact";
  name: SlotName;
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A non-negative byte count within JavaScript's safe-integer range.
   */
  byte_size: number;
}
export interface RecordInputBinding {
  binding_kind: "record";
  name: SlotName;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  record_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  snapshot_hash: string;
}
export interface ExpectedOutput {
  output_name: SlotName;
  output_role:
    "result" | "proposal" | "diagnostic" | "log" | "metrics" | "checkpoint";
  required: boolean;
  media_type: MediaType;
  max_bytes: number;
  contract?: ContractRef;
}
export interface ContractRef {
  schema_name: string;
  schema_version: Version;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface ResourceLimits {
  max_wall_time_ms: PositiveSafeInteger;
  max_output_bytes: PositiveSafeInteger;
  max_attempts: number;
  max_parallelism: number;
  max_cpu_time_ms?: PositiveSafeInteger;
  max_memory_bytes?: PositiveSafeInteger;
  max_storage_bytes?: PositiveSafeInteger;
  max_network_bytes?: PositiveSafeInteger;
  max_gpu_time_ms?: PositiveSafeInteger;
  max_input_tokens?: PositiveSafeInteger;
  max_output_tokens?: PositiveSafeInteger;
  monetary_limit?: MonetaryLimit;
}
export interface MonetaryLimit {
  currency: string;
  max_microunits: PositiveSafeInteger;
}
export interface BlockedNetwork {
  network_mode: "blocked";
}
export interface AllowlistedNetwork {
  network_mode: "allowlist";
  /**
   * @minItems 1
   * @maxItems 100
   */
  destinations: [string, ...string[]];
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
