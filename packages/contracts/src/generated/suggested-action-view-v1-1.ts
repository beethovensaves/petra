/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * A Project-scoped SuggestedAction preview that preserves the 1.0 exact read action and adds one exact, bounded grounded-synthesis Work action. It starts no Work while read.
 */
export interface PetraSuggestedActionViewV110 {
  schema_name: "petra.suggested-action-view";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: WorkPreviewContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  read_at: string;
}
export interface WorkPreviewContent {
  view_kind: "preview";
  action_ref: SuggestedActionRef;
  action: WorkAction;
  readiness: WorkReady | WorkStale | WorkUnavailable;
  operation: {
    state: "command_ready";
    work_start: "only_after_exact_invocation";
    authority_change: "none";
  };
  authority: AuthorityPosition;
  /**
   * @minItems 1
   * @maxItems 16
   */
  limitations:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
}
export interface SuggestedActionRef {
  suggested_action_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface WorkAction {
  action_kind: "run_grounded_synthesis";
  title: string;
  objective: Objective;
  reason: string;
  basis: WorkBasis;
  scope: {
    scope_kind: "exact_grounded_synthesis_rerun";
    included: string;
    /**
     * @minItems 1
     * @maxItems 8
     */
    excluded:
      | [string]
      | [string, string]
      | [string, string, string]
      | [string, string, string, string]
      | [string, string, string, string, string]
      | [string, string, string, string, string, string]
      | [string, string, string, string, string, string, string]
      | [string, string, string, string, string, string, string, string];
  };
  /**
   * @maxItems 16
   */
  missing_information:
    | []
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string, string]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ]
    | [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
  response_depth: {
    /**
     * @minItems 1
     * @maxItems 1
     */
    allowed: ["current_graph"];
    recommended: "current_graph";
    adjustable: false;
  };
  expected_result: {
    state: "new_work_result";
    result_kind: "grounded_response";
    authority_effect: "none";
    reusable: true;
  };
  resources: {
    estimate_state: "bounded_limits";
    duration: "unknown_with_hard_limit";
    cost: "zero_monetary_cost_expected";
    basis: "certified_grounded_synthesis_profile";
    limits: ResourceLimits;
  };
  execution: {
    workflow_name: "petra.synthesis.grounded";
    workflow_version: "1.0.0";
    task_name: "petra.synthesis.grounded";
    worker_name: "petra.grounded_synthesis";
    validator: "petra.grounded-synthesist-profile@1.1.0";
    prompt: string;
    /**
     * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
     */
    prompt_hash: string;
    network_policy: "managed_provider_allowlist";
  };
  capability: {
    command_name: "InvokeSuggestedAction";
    approval: "not_required_after_exact_invocation";
  };
  interrupt: {
    input_expectation: "none";
    delivery_abort: "does_not_cancel_work";
    reconnect: "exact_interaction_replay";
  };
  cancellation: {
    policy: "cancellable";
    command_name: "CancelWorkUnit";
    consequence: "explicit_command_cancels_work_and_preserves_recorded_history";
  };
  invocation: {
    kind: "authenticated_command";
    contract_name: "petra.suggested-action-invocation-request";
    contract_version: "1.0.0";
    command_name: "InvokeSuggestedAction";
    idempotency: "exact_command_and_work_convergence";
    path_convergence: "direct_and_conversational_same_command";
  };
}
export interface Objective {
  objective_ref: ObjectiveRef;
  semantic_key: string;
  statement: string;
}
export interface ObjectiveRef {
  objective_id: string;
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
export interface WorkBasis {
  derivation: "exact_immutable_inquiry_result_link";
  project_definition_ref: DefinitionRef;
  objective_ref: ObjectiveRef;
  inquiry_result_link_ref: InquiryLinkRef;
  source_result_ref: TypedRecordRef;
  snapshot_ref: SnapshotRef;
  context_packet_ref: PacketRef;
  evidence_packet_ref: PacketRef;
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
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
  definition_family: string;
}
export interface InquiryLinkRef {
  project_inquiry_link_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface TypedRecordRef {
  schema_name: "petra.grounded-response";
  schema_version: "1.0.0";
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
export interface SnapshotRef {
  snapshot_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  snapshot_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface PacketRef {
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
export interface WorkReady {
  state: "ready";
  reason_code: "exact_grounded_work_authorized";
  reason: string;
  /**
   * @maxItems 0
   */
  missing_prerequisites: [];
  grant_ref: GrantRef;
}
export interface GrantRef {
  capability_grant_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkStale {
  state: "stale";
  reason_code:
    | "project_definition_changed"
    | "objective_changed"
    | "objective_inactive"
    | "source_result_invalidated";
  reason: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  missing_prerequisites:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string];
  regeneration: {
    operation: "regenerate_suggested_action";
    basis: "current_project_authority";
  };
}
export interface WorkUnavailable {
  state: "unavailable";
  reason_code:
    | "authenticated_actor_unavailable"
    | "capability_grant_missing"
    | "capability_grant_ambiguous";
  reason: string;
  /**
   * @minItems 1
   * @maxItems 8
   */
  missing_prerequisites:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
    | [string, string, string, string, string]
    | [string, string, string, string, string, string]
    | [string, string, string, string, string, string, string]
    | [string, string, string, string, string, string, string, string];
}
export interface AuthorityPosition {
  isolation: "repeatable_read";
  event_position: number;
  stream_revision: number;
}
