/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ElapsedSummary =
  | {
      state: "measured";
      milliseconds: number;
      basis: "start_to_observation" | "start_to_terminal";
    }
  | {
      state: "unavailable";
      reason: string;
    };
export type Page = {
  returned_count: number;
  total_count: number;
  has_more: boolean;
  next_cursor?: string;
};
export type OutputSummary = ReportedOutput | UnreportedOutput;
export type Destination = {
  role:
    | "brief"
    | "sources"
    | "review"
    | "graph"
    | "work"
    | "petra"
    | "composition"
    | "history"
    | "settings"
    | "profile_tool";
  purpose: string;
  target_ref?: ExactObjectRef;
  profile_tool_key?: string;
};
export type ProjectionSummary = {
  state: "current" | "catching_up" | "blocked" | "unavailable";
  label: string;
  detail: string;
  checkpoint_ref?: ExactRef;
  represented_event_position: number;
  observed_event_position: number;
  pending_records: number;
  failure_code?: string;
};

/**
 * A read-only, snapshot-consistent Project Work collection or exact WorkUnit detail composed from existing operational authority.
 */
export interface PetraProjectWorkView {
  schema_name: "petra.project-work-view";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: CollectionContent | DetailContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface CollectionContent {
  view_kind: "collection";
  project_definition_ref: DefinitionRef;
  query: CollectionQuery;
  /**
   * @maxItems 100
   */
  tasks: TaskSummary[];
  page: Page;
  authority: AuthorityPosition;
}
export interface DefinitionRef {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  definition_family: string;
}
export interface CollectionQuery {
  limit: number;
  cursor?: string;
  state?:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
}
export interface TaskSummary {
  work_unit_ref: WorkUnitRef;
  task_label: string;
  objective: string;
  work_mode: "interactive" | "foreground" | "background" | "batch";
  priority: "user_blocking" | "user_visible" | "normal" | "opportunistic";
  workflow: WorkflowSummary;
  execution: ExecutionSummary;
  attention: AttentionSummary;
  elapsed: ElapsedSummary;
  resource_coverage: "limits_only" | "measured";
  reported_output_count: number;
  stage_plan: {
    state: "unavailable";
    reason: string;
  };
  destination: {
    role: "work";
    target_ref: WorkUnitRef;
  };
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkflowSummary {
  workflow_name: string;
  workflow_version: string;
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
  task_name: string;
  task_version: string;
}
export interface ExecutionSummary {
  state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  terminal_outcome?:
    | "succeeded"
    | "worker_failed"
    | "validation_failed"
    | "resource_exhausted"
    | "timed_out"
    | "cancelled";
  attempt: number;
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
  finished_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  updated_at: string;
  failure?: Failure;
}
export interface Failure {
  code: string;
  message: string;
  retryable: boolean;
}
export interface AttentionSummary {
  state: "needs_attention" | "active" | "settled";
  reason_code:
    | "requested"
    | "queued"
    | "running"
    | "retryable_failure"
    | "terminal_failure"
    | "completed"
    | "cancelled";
  reason: string;
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface DetailContent {
  view_kind: "detail";
  project_definition_ref: DefinitionRef;
  summary: TaskSummary;
  specification: SpecificationSummary;
  /**
   * @maxItems 10000
   */
  dependencies: DependencySummary[];
  stage_plan: {
    state: "unavailable";
    reason: string;
  };
  resources: ResourceSummary;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  outputs: [OutputSummary, ...OutputSummary[]];
  /**
   * @minItems 3
   * @maxItems 3
   */
  controls: [ControlSummary, ControlSummary, ControlSummary];
  inquiry_linkage: UnavailableLinkage;
  review: UnavailableLinkage;
  semantic_location: LocationContent;
  /**
   * @minItems 1
   * @maxItems 11
   */
  coverage:
    | [CoverageItem]
    | [CoverageItem, CoverageItem]
    | [CoverageItem, CoverageItem, CoverageItem]
    | [CoverageItem, CoverageItem, CoverageItem, CoverageItem]
    | [CoverageItem, CoverageItem, CoverageItem, CoverageItem, CoverageItem]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ]
    | [
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
        CoverageItem,
      ];
  authority: AuthorityPosition;
}
export interface SpecificationSummary {
  input_manifest_ref: ContentRecordRef;
  task: TaskDescriptor;
  worker: WorkerDescriptor;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  inputs: [
    ArtifactInputBinding | RecordInputBinding,
    ...(ArtifactInputBinding | RecordInputBinding)[],
  ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  expected_outputs: [ExpectedOutput, ...ExpectedOutput[]];
  network_policy: BlockedNetwork | AllowlistedNetwork;
  partial_result_policy: "discard" | "retain_declared" | "retain_diagnostics";
  cache_mode: "reuse_exact" | "refresh" | "disabled";
  cancellation_policy: "cancellable" | "checkpoint_then_cancel" | "atomic";
  checkpoint_policy: "disabled" | "latest_valid" | "all_valid";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  deadline_at?: string;
}
export interface ContentRecordRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
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
  task_name: string;
  task_version: string;
}
export interface WorkerDescriptor {
  executor_kind: "python_worker" | "typescript_worker" | "sandbox";
  worker_name: string;
  worker_version: string;
  runtime_name: string;
  runtime_version: string;
  entrypoint: string;
}
export interface ArtifactInputBinding {
  binding_kind: "artifact";
  name: string;
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
  name: string;
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
  output_name: string;
  output_role:
    "result" | "proposal" | "diagnostic" | "log" | "metrics" | "checkpoint";
  required: boolean;
  media_type: string;
  max_bytes: number;
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
export interface DependencySummary {
  work_unit_ref: WorkUnitRef;
  state:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
  terminal_outcome?:
    | "succeeded"
    | "worker_failed"
    | "validation_failed"
    | "resource_exhausted"
    | "timed_out"
    | "cancelled";
}
export interface ResourceSummary {
  limits: ResourceLimits;
  usage: MeasuredUsage | UnavailableUsage;
}
export interface ResourceLimits {
  max_wall_time_ms: number;
  max_output_bytes: number;
  max_attempts: number;
  max_parallelism: number;
  max_cpu_time_ms?: number;
  max_memory_bytes?: number;
  max_storage_bytes?: number;
  max_network_bytes?: number;
  max_gpu_time_ms?: number;
  max_input_tokens?: number;
  max_output_tokens?: number;
  monetary_limit?: MonetaryLimit;
}
export interface MonetaryLimit {
  currency: string;
  max_microunits: number;
}
export interface MeasuredUsage {
  state: "measured";
  output_manifest_ref: ContentRecordRef;
  resource_usage: ResourceUsage;
}
export interface ResourceUsage {
  wall_time_ms: number;
  cpu_time_ms: number;
  peak_memory_bytes: number;
  input_bytes: number;
  output_bytes: number;
  network_bytes: number;
  gpu_time_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  cost?: MeasuredCost;
}
export interface MeasuredCost {
  currency: string;
  microunits: number;
}
export interface UnavailableUsage {
  state: "unavailable";
  reason: string;
}
export interface ReportedOutput {
  declaration: ExpectedOutput;
  report_state: "reported";
  produced_output: ProducedOutput;
  availability: {
    state: "staged_handle_only";
    limitation: string;
  };
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
export interface UnreportedOutput {
  declaration: ExpectedOutput;
  report_state: "not_reported";
  availability: {
    state: "unavailable";
    limitation: string;
  };
}
export interface ControlSummary {
  control_name: "cancel" | "retry" | "resume";
  policy_state: "permitted" | "forbidden" | "not_applicable" | "unresolved";
  operation_state: "unavailable";
  reason: string;
  consequence: string;
}
export interface UnavailableLinkage {
  state: "unavailable";
  reason: string;
}
export interface LocationContent {
  request: LocationRequest;
  definition_ref: DefinitionRef1;
  resolution: ResolvedLocation | UnavailableLocation;
  primary_destination: Destination;
  /**
   * @maxItems 16
   */
  alternate_destinations:
    | []
    | [Destination]
    | [Destination, Destination]
    | [Destination, Destination, Destination]
    | [Destination, Destination, Destination, Destination]
    | [Destination, Destination, Destination, Destination, Destination]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ]
    | [
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
        Destination,
      ];
  fallback_destination?: Destination;
  context: LocationContext;
  authority: AuthorityPosition1;
  projection: ProjectionSummary;
}
export interface LocationRequest {
  object_ref: RequestedObjectRef;
  task_intent:
    | "orient"
    | "inspect"
    | "trace"
    | "review"
    | "continue_work"
    | "view_history";
}
export interface RequestedObjectRef {
  semantic_key: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision?: number;
}
export interface DefinitionRef1 {
  project_definition_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  definition_family: string;
}
export interface ResolvedLocation {
  state: "current" | "historical" | "superseded";
  requested_ref: RequestedObjectRef;
  resolved_ref: ExactObjectRef;
  current_ref: ExactObjectRef;
  descriptor: ObjectDescriptor;
  parent_ref?: ExactObjectRef;
  /**
   * @maxItems 32
   */
  replacement_chain: ExactObjectRef[];
}
export interface ExactObjectRef {
  semantic_key: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ObjectDescriptor {
  semantic_key: string;
  generic_family:
    | "focus"
    | "finding"
    | "reference"
    | "relationship"
    | "task"
    | "output"
    | "other";
  label: string;
  summary: string;
  lifecycle_state: string;
}
export interface UnavailableLocation {
  state: "missing" | "unauthorized" | "unsupported";
  requested_ref: RequestedObjectRef;
  failure: {
    code: string;
    message: string;
  };
}
export interface LocationContext {
  details_allowed: boolean;
  petra_allowed: boolean;
}
export interface AuthorityPosition1 {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
export interface ExactRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface CoverageItem {
  area:
    | "identity"
    | "execution"
    | "inputs"
    | "dependencies"
    | "stages"
    | "resources"
    | "outputs"
    | "controls"
    | "inquiries"
    | "review"
    | "recovery";
  state: "complete" | "partial" | "unavailable";
  limitation?: string;
}
