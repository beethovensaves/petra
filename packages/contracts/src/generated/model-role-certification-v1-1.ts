/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

/**
 * An immutable decision about one model deployment's eligibility for Petra's bounded synthesist role; it never certifies scientific truth.
 */
export interface PetraSynthesistRoleCertification {
  schema_name: "petra.model-role-certification";
  schema_version: "1.1.0";
  role_certification_id: string;
  revision: 1;
  deployment: DeploymentSnapshot;
  role_profile: RoleProfile;
  scope: CertificationScope;
  evaluation: Evaluation;
  decision: Decision;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  certified_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  certified_at: string;
}
export interface DeploymentSnapshot {
  model_deployment_id: string;
  provider_id: string;
  provider_kind: string;
  provider_model: string;
  observed_revision: string;
  replayability: "exact" | "best_effort" | "unavailable";
  execution_location: "local" | "remote";
  structured_output: boolean;
  max_context_tokens: number;
}
export interface RoleProfile {
  role_profile_id: string;
  role: "synthesist";
  version: string;
  input_contract: InputContract;
  output_contract: OutputContract;
  /**
   * @minItems 1
   * @maxItems 100
   */
  required_validators: [string, ...string[]];
}
export interface InputContract {
  schema_name: "evidence-packet";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface OutputContract {
  schema_name: "model-synthesist-output";
  schema_version: "1.0.0";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  schema_hash: string;
}
export interface CertificationScope {
  domain: string;
  language: string;
  modality: "text";
  document_class: "peer_reviewed" | "preprint" | "scholarly";
}
export interface Evaluation {
  suite: VersionedComponent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  dataset_snapshot_hash: string;
  prompt_profile: PromptProfile;
  cases_total: number;
  cases_passed: number;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  metrics: [Metric, ...Metric[]];
  /**
   * @maxItems 1000
   */
  observed_errors: ObservedError[];
}
export interface VersionedComponent {
  name: string;
  version: string;
}
export interface PromptProfile {
  name: string;
  version: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Metric {
  name: string;
  value: number;
  unit: "count" | "ratio" | "milliseconds" | "usd";
  direction: "higher_is_better" | "lower_is_better" | "descriptive";
}
export interface ObservedError {
  code: string;
  count: number;
}
export interface Decision {
  status: "active" | "failed" | "invalidated" | "expired";
  reason: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_from: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  expires_at?: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  invalidation_conditions: [string, ...string[]];
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
