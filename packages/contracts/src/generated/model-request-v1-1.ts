/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ModelRequestId = string;
export type TerminalResult = CompletedTerminal | FailedTerminal;
export type ModelCallId = string & string;

/**
 * One logical bounded synthesist need with exact context and evidence packets, policy-first routing, budget, validation, and terminal outcome.
 */
export interface PetraSynthesistModelRequest {
  schema_name: "petra.model-request";
  schema_version: "1.1.0";
  model_request_id: ModelRequestId;
  revision: 1;
  content: RequestContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
}
export interface RequestContent {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  workflow: WorkflowRef;
  role: "synthesist";
  objective: string;
  impact_class: "routine" | "difficult" | "adversarial" | "high_impact";
  context_packet_ref: ContextPacketRef;
  evidence_packet_ref: EvidencePacketRef;
  outbound_context: OutboundContext;
  prompt_profile: PromptProfile;
  parameters: Parameters;
  output_contract: OutputContract;
  routing_policy_ref: RoutingPolicyRef;
  routing: RoutingDecision;
  budget: Budget;
  terminal: TerminalResult;
}
export interface WorkflowRef {
  workflow_kind: "grounded_synthesis";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  workflow_id: string;
}
export interface ContextPacketRef {
  context_packet_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface EvidencePacketRef {
  evidence_packet_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface OutboundContext {
  egress_class: "E0" | "E1" | "E2" | "E3";
  visibility: "private" | "workspace" | "public";
  /**
   * @minItems 1
   * @maxItems 100
   */
  data_classes: [
    (
      | "bibliographic_metadata"
      | "licensed_full_text"
      | "open_full_text"
      | "source_spans"
      | "trusted_scientific_records"
      | "private_notes"
    ),
    ...(
      | "bibliographic_metadata"
      | "licensed_full_text"
      | "open_full_text"
      | "source_spans"
      | "trusted_scientific_records"
      | "private_notes"
    )[],
  ];
  /**
   * @minItems 1
   * @maxItems 10000
   */
  context_object_refs: [ContextObjectRef, ...ContextObjectRef[]];
  /**
   * @minItems 1
   * @maxItems 1000
   *
   * Items: A Petra identifier whose kind is rights_decision.
   */
  rights_decision_ids: [string & string, ...(string & string)[]];
  /**
   * @minItems 1
   * @maxItems 100
   */
  selected_fields: [string, ...string[]];
  /**
   * @maxItems 1000
   */
  redactions: Redaction[];
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  context_content_hash: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  capability_grant_id: string;
  purpose: string;
}
export interface ContextObjectRef {
  object_kind: "claim" | "assertion" | "source_span" | "work_version";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  object_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  object_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  object_hash: string;
}
export interface Redaction {
  field: string;
  reason: string;
}
export interface PromptProfile {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Parameters {
  temperature: number;
  seed?: number;
  max_output_tokens: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface OutputContract {
  schema_name: "model-synthesist-output";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface RoutingPolicyRef {
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  routing_policy_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface RoutingDecision {
  /**
   * @maxItems 100
   */
  eligible: EligibleRoute[];
  /**
   * @maxItems 100
   */
  excluded: ExcludedRoute[];
  selected?: SelectedRoute;
  /**
   * @maxItems 100
   */
  fallback_chain: string[];
}
export interface EligibleRoute {
  model_deployment_id: string;
  role_certification_id: string;
  expected_validated_cost_usd: string;
  expected_latency_ms: number;
}
export interface ExcludedRoute {
  model_deployment_id: string;
  code: string;
  reason: string;
}
export interface SelectedRoute {
  model_deployment_id: string;
  role_certification_id: string;
  reason: string;
}
export interface Budget {
  max_attempts: number;
  max_input_tokens: number;
  max_output_tokens: number;
  max_latency_ms: number;
  max_cost_usd: string;
}
export interface CompletedTerminal {
  state: "completed";
  /**
   * @minItems 1
   * @maxItems 20
   */
  model_call_ids:
    | [ModelCallId]
    | [ModelCallId, ModelCallId]
    | [ModelCallId, ModelCallId, ModelCallId]
    | [ModelCallId, ModelCallId, ModelCallId, ModelCallId]
    | [ModelCallId, ModelCallId, ModelCallId, ModelCallId, ModelCallId]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  validator_results: [ValidatorResult, ...ValidatorResult[]];
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  output_hash: string;
}
export interface ValidatorResult {
  validator_name: string;
  validator_version: string;
  outcome: "pass" | "warning" | "fail";
  code: string;
  message?: string;
}
export interface FailedTerminal {
  state:
    | "blocked_policy"
    | "budget_exhausted"
    | "provider_unavailable"
    | "validation_failed";
  /**
   * @maxItems 20
   */
  model_call_ids:
    | []
    | [ModelCallId]
    | [ModelCallId, ModelCallId]
    | [ModelCallId, ModelCallId, ModelCallId]
    | [ModelCallId, ModelCallId, ModelCallId, ModelCallId]
    | [ModelCallId, ModelCallId, ModelCallId, ModelCallId, ModelCallId]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ]
    | [
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
        ModelCallId,
      ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  validator_results: [ValidatorResult, ...ValidatorResult[]];
  failure: Failure;
}
export interface Failure {
  code: string;
  message: string;
  retryable: boolean;
}
