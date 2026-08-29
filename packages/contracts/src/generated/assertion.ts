/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type Predicate =
  | "VERSION_OF"
  | "REPRESENTED_BY"
  | "LOCATED_IN"
  | "CITES"
  | "CITES_AS_BACKGROUND"
  | "ASSERTS"
  | "ADDRESSES"
  | "SUPPORTS"
  | "CONTRADICTS"
  | "QUALIFIES"
  | "ADOPTS"
  | "DIRECTLY_TESTS"
  | "EXTENDS"
  | "REFRAMES"
  | "CHALLENGES"
  | "CRITIQUES_METHOD"
  | "ASSUMES"
  | "PREDICTS"
  | "RIVAL_OF"
  | "TESTS"
  | "IMPLEMENTS"
  | "USES"
  | "PRODUCED"
  | "ANALYZES"
  | "EVALUATES"
  | "GOVERNS"
  | "INTERPRETS"
  | "COMPOSED_FROM"
  | "GROUNDS"
  | "RENDERS"
  | "REPLICATES"
  | "FAILS_TO_REPLICATE"
  | "INVESTIGATES"
  | "TESTS_CAUSE"
  | "CORRECTS"
  | "DEPENDS_ON"
  | "SUPERSEDES";
export type AssertionObject =
  | EntityObject
  | StringLiteral
  | BooleanLiteral
  | IntegerLiteral
  | DecimalLiteral
  | TimestampLiteral;
export type ProvenanceRef =
  | SourceSpanProvenance
  | StructuredFieldProvenance
  | AssertionProvenance
  | ActorProvenance
  | RecordProvenance;

/**
 * A provenance-bearing typed relation whose authority records representation review rather than scientific truth.
 */
export interface PetraAssertion {
  schema_name: "petra.assertion";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is assertion.
   */
  assertion_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  subject_id: string;
  predicate: Predicate;
  object: AssertionObject;
  assertion_kind:
    | "source_native"
    | "source_stated"
    | "deterministic_derivation"
    | "model_inference"
    | "human_judgment"
    | "experimental_observation"
    | "synthesis";
  authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority;
  /**
   * @minItems 1
   * @maxItems 10000
   */
  provenance_refs: [ProvenanceRef, ...ProvenanceRef[]];
  scope: ScientificScope;
  scope_comparison?: ScopeComparison;
  rationale: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  valid_time?: ValidTime;
  /**
   * A Petra identifier whose kind is assertion.
   */
  supersedes_assertion_id?: string;
  created_by: ActorRef;
}
export interface EntityObject {
  object_kind: "entity";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  entity_id: string;
}
export interface StringLiteral {
  object_kind: "string";
  value: string;
}
export interface BooleanLiteral {
  object_kind: "boolean";
  value: boolean;
}
export interface IntegerLiteral {
  object_kind: "integer";
  value: number;
}
export interface DecimalLiteral {
  object_kind: "decimal";
  value: string;
}
export interface TimestampLiteral {
  object_kind: "timestamp";
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  value: string;
}
export interface QuarantineAuthority {
  zone: "quarantine";
  review_state:
    "unreviewed" | "machine_checked" | "human_rejected" | "disputed";
}
export interface TrustedAuthority {
  zone: "trusted";
  review_state: "machine_checked" | "human_accepted" | "disputed";
  promotion: PromotionBasis;
}
export interface PromotionBasis {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  approval_basis: HumanApprovalBasis | PolicyApprovalBasis;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  applied_at: string;
}
export interface HumanApprovalBasis {
  approval_kind: "human";
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  approved_by: ActorRef;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface PolicyApprovalBasis {
  approval_kind: "review_policy";
  /**
   * A Petra identifier whose kind is review_policy.
   */
  review_policy_id: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  calibration_ref: string;
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  audit_ref?: string;
}
export interface PersonalAuthority {
  zone: "personal";
  review_state: "unreviewed" | "human_accepted" | "disputed";
  recorded_by: ActorRef;
}
export interface SourceSpanProvenance {
  provenance_kind: "source_span";
  /**
   * A Petra identifier whose kind is source_span.
   */
  source_span_id: string & string;
}
export interface StructuredFieldProvenance {
  provenance_kind: "structured_field";
  /**
   * A Petra identifier whose kind is artifact.
   */
  artifact_id: string & string;
  json_pointer: string;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  field_hash: string;
}
export interface AssertionProvenance {
  provenance_kind: "basis_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  assertion_id: string;
}
export interface ActorProvenance {
  provenance_kind: "actor";
  actor: ActorRef;
}
export interface RecordProvenance {
  provenance_kind: "record";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  record_id: string;
  role:
    | "derivation"
    | "input"
    | "output"
    | "model_call"
    | "run"
    | "result"
    | "analysis";
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
export interface ScopeComparison {
  relation:
    "aligned" | "overlapping" | "narrower" | "broader" | "disjoint" | "unknown";
  rationale: string;
}
export interface ValidTime {
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_from?: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  valid_to?: string;
}
