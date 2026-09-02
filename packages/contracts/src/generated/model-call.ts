/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ModelCallId = string;
export type ModelRequestId = string;
export type ModelDeploymentId = string;
export type ProviderId = string;
export type DecimalAmount = string;

/**
 * One physical model invocation with exact bounded input, observed deployment identity, structured output, validation, timing, token use, and cost. It contains no credentials or hidden reasoning.
 */
export interface PetraModelCall {
  schema_name: "petra.model-call";
  schema_version: "1.0.0";
  model_call_id: ModelCallId;
  revision: 1;
  content: CallContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  started_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  completed_at: string;
}
export interface CallContent {
  model_request_id: ModelRequestId;
  attempt: number;
  attempt_kind: "initial" | "retry" | "schema_repair" | "fallback";
  deployment: DeploymentObservation;
  prompt_profile: PromptProfile;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  parameters_hash: string;
  output_contract: ContractRef;
  input: ExactInput;
  provider_request_id?: string;
  outcome:
    "success" | "validation_failed" | "provider_error" | "refusal" | "timeout";
  /**
   * The exact provider response payload when one was returned. Petra validates and copies a conforming extractor result into output; invalid payloads remain inspectable only here.
   */
  raw_output?: {
    [k: string]: unknown;
  };
  output?: PetraModelExtractorOutput;
  failure?: Failure;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  validation: [ValidatorResult, ...ValidatorResult[]];
  timing: Timing;
  usage: Usage;
  cost: Cost;
}
export interface DeploymentObservation {
  model_deployment_id: ModelDeploymentId;
  provider_id: ProviderId;
  provider_kind: string;
  provider_model: string;
  observed_revision: string;
  replayability: "exact" | "best_effort" | "unavailable";
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  endpoint_fingerprint: string;
}
export interface PromptProfile {
  name: string;
  version: string;
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
export interface ExactInput {
  context_packet_ref: ContextPacketRef;
  source_artifact_ref: ArtifactRef;
  /**
   * @minItems 1
   * @maxItems 20
   */
  messages:
    | [Message]
    | [Message, Message]
    | [Message, Message, Message]
    | [Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message, Message, Message]
    | [Message, Message, Message, Message, Message, Message, Message, Message]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ]
    | [
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
        Message,
      ];
  /**
   * @minItems 1
   * @maxItems 1000
   */
  source_selections: [SourceSelection, ...SourceSelection[]];
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ContextPacketRef {
  context_packet_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface ArtifactRef {
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
}
export interface Message {
  role: "system" | "user";
  content: string;
}
export interface SourceSelection {
  /**
   * A Petra identifier whose kind is source_span.
   */
  source_span_id: string & string;
  exact_text: string;
  structural_path: string;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  page_numbers: [number, ...number[]];
}
/**
 * A provider-neutral structured extractor response. It contains proposed scientific fields and source selections, never authority state or Petra object identities.
 */
export interface PetraModelExtractorOutput {
  schema_name: "petra.model-extractor-output";
  schema_version: "1.0.0";
  /**
   * @minItems 1
   * @maxItems 100
   */
  candidates: [Candidate, ...Candidate[]];
  /**
   * @maxItems 1000
   */
  diagnostics: Diagnostic[];
}
export interface Candidate {
  candidate_key: string;
  proposal_role:
    | "primary"
    | "qualification"
    | "limitation"
    | "method"
    | "result"
    | "negative_control"
    | "other";
  source_quote: SourceQuote;
  canonical_text: string;
  claim_kind:
    | "descriptive"
    | "comparative"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "theoretical"
    | "measurement";
  scope: ScientificScope;
  detail_level: "broad" | "detailed";
  source_stance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  attribution: string;
  modality: "asserted" | "hedged" | "conditional" | "speculative";
  negated: boolean;
  uncertainty?: string;
  /**
   * An extractor-specific observation, not a probability that the scientific proposition is true and not an authority threshold.
   */
  extraction_confidence?: number;
  /**
   * @maxItems 100
   */
  warnings: Diagnostic[];
}
export interface SourceQuote {
  exact_text: string;
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_ids: [string & string, ...(string & string)[]];
}
export interface ScientificScope {
  population?: ScopeDimension;
  language?: ScopeDimension;
  task?: ScopeDimension;
  model_family?: ScopeDimension;
  dataset?: ScopeDimension;
  intervention_or_exposure?: ScopeDimension;
  comparator?: ScopeDimension;
  outcome?: ScopeDimension;
  setting?: ScopeDimension;
  temporal_boundary?: ScopeDimension;
  /**
   * @maxItems 10
   */
  unreported_dimensions:
    | []
    | [
        | "population"
        | "language"
        | "task"
        | "model_family"
        | "dataset"
        | "intervention_or_exposure"
        | "comparator"
        | "outcome"
        | "setting"
        | "temporal_boundary",
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ]
    | [
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
        (
          | "population"
          | "language"
          | "task"
          | "model_family"
          | "dataset"
          | "intervention_or_exposure"
          | "comparator"
          | "outcome"
          | "setting"
          | "temporal_boundary"
        ),
      ];
  notes?: string;
}
export interface ScopeDimension {
  description: string;
  /**
   * @maxItems 1000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  entity_refs: string[];
}
export interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  candidate_key?: string;
}
export interface Failure {
  code: string;
  message: string;
  retryable: boolean;
}
export interface ValidatorResult {
  validator_name: string;
  validator_version: string;
  outcome: "pass" | "warning" | "fail";
  code: string;
  message?: string;
}
export interface Timing {
  queue_ms: number;
  first_token_ms?: number;
  total_ms: number;
  validation_ms: number;
}
export interface Usage {
  accounting: "provider_reported" | "estimated" | "unavailable";
  input_tokens: number;
  output_tokens: number;
}
export interface Cost {
  amount: DecimalAmount;
  currency: "USD";
  accounting: "provider_reported" | "computed" | "unavailable";
  pricing_source: string;
}
