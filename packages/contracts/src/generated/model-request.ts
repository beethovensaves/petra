/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ModelRequestId = string;
export type ModelDeploymentId = string;
export type RoleCertificationId = string;
export type DecimalAmount = string;
export type ModelCallId = string & string;
export type EvidenceProposalBundleId = string;

/**
 * One completed logical need for bounded model work, including policy-first eligibility, the selected route, budgets, validation outcome, and result references.
 */
export interface PetraModelRequest {
  schema_name: "petra.model-request";
  schema_version: "1.0.0";
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
  role: "extractor";
  objective: string;
  impact_class: "routine" | "difficult" | "adversarial" | "high_impact";
  context_packet_ref: ContextPacketRef;
  outbound_context: OutboundContextManifest;
  prompt_profile: PromptProfile;
  parameters: Parameters;
  output_contract: ContractRef;
  routing_policy_ref: RoutingPolicyRef;
  routing: RoutingDecision;
  budget: Budget;
  terminal: TerminalResult;
}
export interface WorkflowRef {
  workflow_kind: "evidence_extraction";
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
export interface OutboundContextManifest {
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
      | "scientific_proposals"
      | "private_notes"
    ),
    ...(
      | "bibliographic_metadata"
      | "licensed_full_text"
      | "open_full_text"
      | "source_spans"
      | "scientific_proposals"
      | "private_notes"
    )[],
  ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  source_artifact_refs: [ArtifactRef, ...ArtifactRef[]];
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_ids: [string & string, ...(string & string)[]];
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
  capability_grant_id: string;
  purpose: string;
}
export interface ArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
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
export interface ContractRef {
  schema_name: "model-extractor-output";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface RoutingPolicyRef {
  routing_policy_id: string;
  revision: 1;
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
  fallback_chain: ModelDeploymentId[];
}
export interface EligibleRoute {
  model_deployment_id: ModelDeploymentId;
  role_certification_id: RoleCertificationId;
  expected_validated_cost_usd: DecimalAmount;
  expected_latency_ms: number;
}
export interface ExcludedRoute {
  model_deployment_id: ModelDeploymentId;
  code: string;
  reason: string;
}
export interface SelectedRoute {
  model_deployment_id: ModelDeploymentId;
  role_certification_id: RoleCertificationId;
  reason: string;
}
export interface Budget {
  max_attempts: number;
  max_input_tokens: number;
  max_output_tokens: number;
  max_latency_ms: number;
  max_cost_usd: DecimalAmount;
}
export interface TerminalResult {
  state:
    | "completed"
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
   * @maxItems 1000
   */
  validator_results: ValidatorResult[];
  /**
   * @maxItems 100
   */
  proposal_bundle_ids: EvidenceProposalBundleId[];
  failure_code?: string;
  failure_message?: string;
}
export interface ValidatorResult {
  validator_name: string;
  validator_version: string;
  outcome: "pass" | "warning" | "fail";
  code: string;
  message?: string;
}
