/* eslint-disable */
// Generated from the canonical Petra JSON Schema. Do not edit by hand.

export type ChangeSetContent = {
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  origin: "direct_edit" | "agent_proposal" | "worker_proposal";
  proposed_by: ActorRef;
  reason: string;
  /**
   * @minItems 1
   * @maxItems 100
   */
  operations: [
    (
      | PromoteClaimOperation
      | PromoteAssertionOperation
      | RetractClaimOperation
      | RetractAssertionOperation
    ),
    ...(
      | PromoteClaimOperation
      | PromoteAssertionOperation
      | RetractClaimOperation
      | RetractAssertionOperation
    )[],
  ];
  impact: ImpactPreview;
  risk_tier: "R0" | "R1" | "R2" | "R3" | "R4";
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensates_change_set_id?: string;
} & (
  | {
      operations?: unknown[];
      /**
       * A Petra identifier whose kind is change_set.
       */
      compensates_change_set_id: string;
      [k: string]: unknown;
    }
  | {
      operations?: unknown[];
      compensates_change_set_id?: never;
      [k: string]: unknown;
    }
);

/**
 * An immutable ordered projection delivery carrying a version-1.2 Project authority event.
 */
export interface PetraOutboxRecordV120 {
  schema_name: "petra.outbox-record";
  schema_version: "1.2.0";
  outbox_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  outbox_position: number;
  target: "neo4j_graph" | "interface_authority";
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  target_sequence: number;
  /**
   * A Petra identifier whose kind is project.
   */
  partition_key: string;
  deduplication_key: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  enqueued_at: string;
  message: {
    message_kind: "domain_event";
    event: PetraDomainEventV120;
  };
}
/**
 * An immutable Project-stream fact extended with governed ProjectSource status transitions.
 */
export interface PetraDomainEventV120 {
  schema_name: "petra.domain-event";
  schema_version: "1.2.0";
  event_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  event_position: number;
  stream_type: "project";
  /**
   * A Petra identifier whose kind is project.
   */
  stream_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  stream_revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  actor: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  occurred_at: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  recorded_at: string;
  correlation_id: string;
  causation_id: string;
  command_id: string;
  idempotency_key: string;
  capability_grant_id: string;
  event:
    | ChangeSetSubmitted
    | ApprovalRecorded
    | ChangeSetApplied
    | ChangeSetConflicted
    | ChangeSetReverted
    | ReversalConflicted
    | ProjectSourceExcluded
    | ProjectSourceRestored;
}
export interface ActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human" | "service" | "model";
}
export interface ChangeSetSubmitted {
  event_type: "change_set.submitted";
  payload: {
    change_set: PetraChangeSetV110;
  };
}
/**
 * An immutable, content-bound scientific authority change supporting both initial promotion and explicit compensating reversal.
 */
export interface PetraChangeSetV110 {
  schema_name: "petra.change-set";
  schema_version: "1.1.0";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  revision: 1;
  state: "submitted";
  content: ChangeSetContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface PromoteClaimOperation {
  operation_kind: "promote_claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: QuarantineState;
  after: HumanTrustedState;
}
export interface QuarantineState {
  zone: "quarantine";
  review_state: "unreviewed" | "machine_checked";
}
export interface HumanTrustedState {
  zone: "trusted";
  review_state: "human_accepted";
}
export interface PromoteAssertionOperation {
  operation_kind: "promote_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: QuarantineState;
  after: HumanTrustedState;
}
export interface RetractClaimOperation {
  operation_kind: "retract_claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: HumanTrustedState1;
  after: HumanRejectedState;
}
export interface HumanTrustedState1 {
  zone: "trusted";
  review_state: "human_accepted";
}
export interface HumanRejectedState {
  zone: "quarantine";
  review_state: "human_rejected";
}
export interface RetractAssertionOperation {
  operation_kind: "retract_assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  base_revision: number;
  before: HumanTrustedState1;
  after: HumanRejectedState;
}
export interface ImpactPreview {
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  affected_object_ids: [string, ...string[]];
  /**
   * @maxItems 10000
   *
   * Items: A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  downstream_object_ids: string[];
  summary: string;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  generated_at: string;
}
export interface ApprovalRecorded {
  event_type: "approval.recorded";
  payload: ApprovalRecordedPayload;
}
export interface ApprovalRecordedPayload {
  approval: PetraApproval;
  derived_change_set_state: "approved" | "rejected";
}
/**
 * A human decision bound to one exact ChangeSet revision and canonical content hash.
 */
export interface PetraApproval {
  schema_name: "petra.approval";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  subject: ChangeSetSubject;
  decision: "approved" | "rejected";
  decision_scope: "exact_change_set";
  decided_by: HumanActorRef;
  rationale: string;
  /**
   * @maxItems 100
   */
  conditions: string[];
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  decided_at: string;
}
export interface ChangeSetSubject {
  subject_kind: "change_set";
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  change_set_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
}
export interface HumanActorRef {
  /**
   * A Petra identifier whose kind is actor.
   */
  actor_id: string;
  actor_kind: "human";
}
export interface ChangeSetApplied {
  event_type: "change_set.applied";
  payload: ChangeSetAppliedPayload;
}
export interface ChangeSetAppliedPayload {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  change_set_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  approval_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  prior_claim_revision: number;
  claim: PetraClaim;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  prior_assertion_revision: number;
  assertion: PetraAssertion;
}
/**
 * A proposition with explicit scientific scope, epistemic basis, and authority state; existence does not imply truth.
 */
export interface PetraClaim {
  schema_name: "petra.claim";
  schema_version: "1.0.0";
  /**
   * A Petra identifier whose kind is claim.
   */
  claim_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  canonical_text: string;
  claim_kind:
    | "descriptive"
    | "comparative"
    | "causal"
    | "mechanistic"
    | "methodological"
    | "theoretical"
    | "measurement";
  normalization_status: "verbatim" | "normalized" | "composed";
  scope: ScientificScope;
  basis: SourceBasis | SynthesisBasis | ResearcherBasis;
  authority: QuarantineAuthority | TrustedAuthority | PersonalAuthority;
  /**
   * A Petra identifier whose kind is claim.
   */
  supersedes_claim_id?: string;
  created_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  created_at: string;
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
export interface SourceBasis {
  basis_kind: "source";
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  source_scope: "full_text" | "abstract_only";
  detail_level: "broad" | "detailed";
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is source_span.
   */
  source_span_ids: [string & string, ...(string & string)[]];
  source_stance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  attribution: string;
  modality: "asserted" | "hedged" | "conditional" | "speculative";
  negated: boolean;
  uncertainty?: string;
  derivation: Derivation;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  validator_results: [ValidatorResult, ...ValidatorResult[]];
  extraction_confidence?: number;
  proposed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
}
export interface Derivation {
  derivation_kind:
    "deterministic_mapping" | "model_extraction" | "human_extraction";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  derivation_ref: string;
}
export interface ValidatorResult {
  validator_name: string;
  validator_version: string;
  outcome: "pass" | "warning" | "fail";
  code: string;
  message?: string;
}
export interface SynthesisBasis {
  basis_kind: "synthesis";
  /**
   * @minItems 1
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is claim.
   */
  basis_claim_ids: [string, ...string[]];
  /**
   * @maxItems 10000
   *
   * Items: A Petra identifier whose kind is assertion.
   */
  basis_assertion_ids: string[];
  composition_kind: "human" | "model_assisted" | "deterministic";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  composition_ref: string;
  composed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  composed_at: string;
}
export interface ResearcherBasis {
  basis_kind: "researcher";
  rationale: string;
  proposed_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  proposed_at: string;
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
  predicate:
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
  object:
    | EntityObject
    | StringLiteral
    | BooleanLiteral
    | IntegerLiteral
    | DecimalLiteral
    | TimestampLiteral;
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
  provenance_refs: [
    (
      | SourceSpanProvenance
      | StructuredFieldProvenance
      | AssertionProvenance
      | ActorProvenance
      | RecordProvenance
    ),
    ...(
      | SourceSpanProvenance
      | StructuredFieldProvenance
      | AssertionProvenance
      | ActorProvenance
      | RecordProvenance
    )[],
  ];
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
export interface ChangeSetConflicted {
  event_type: "change_set.conflicted";
  payload: ChangeSetConflictedPayload;
}
export interface ChangeSetConflictedPayload {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  change_set_revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
  conflict_code: "STALE_TARGET_REVISION" | "TARGET_AUTHORITY_MISMATCH";
  /**
   * @minItems 2
   * @maxItems 2
   */
  targets: [
    ClaimConflictTarget | AssertionConflictTarget,
    ClaimConflictTarget | AssertionConflictTarget,
  ];
}
export interface ClaimConflictTarget {
  target_kind: "claim";
  /**
   * A Petra identifier whose kind is claim.
   */
  target_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  expected_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  actual_revision: number;
  expected_zone: "quarantine";
  actual_zone: "quarantine" | "trusted" | "personal";
}
export interface AssertionConflictTarget {
  target_kind: "assertion";
  /**
   * A Petra identifier whose kind is assertion.
   */
  target_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  expected_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  actual_revision: number;
  expected_zone: "quarantine";
  actual_zone: "quarantine" | "trusted" | "personal";
}
export interface ChangeSetReverted {
  event_type: "change_set.reverted";
  payload: ChangeSetRevertedPayload;
}
export interface ChangeSetRevertedPayload {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  change_set_revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensates_change_set_id: string;
  /**
   * A Petra identifier whose kind is approval.
   */
  approval_id: string;
  approval_revision: 1;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  prior_claim_revision: number;
  claim: PetraClaim;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  prior_assertion_revision: number;
  assertion: PetraAssertion;
}
export interface ReversalConflicted {
  event_type: "change_set.reversal_conflicted";
  payload: ReversalConflictedPayload;
}
export interface ReversalConflictedPayload {
  /**
   * A Petra identifier whose kind is change_set.
   */
  change_set_id: string;
  change_set_revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  change_set_content_hash: string;
  /**
   * A Petra identifier whose kind is change_set.
   */
  compensates_change_set_id: string;
  conflict_code: "STALE_TARGET_REVISION" | "TARGET_AUTHORITY_MISMATCH";
  /**
   * @minItems 2
   * @maxItems 2
   */
  targets: [ReversalConflictTarget, ReversalConflictTarget];
}
export interface ReversalConflictTarget {
  target_kind: "claim" | "assertion";
  /**
   * A kind-prefixed Petra identifier with a canonical uppercase ULID payload.
   */
  target_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  expected_revision: number;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  actual_revision: number;
  expected_zone: "trusted";
  actual_zone: "quarantine" | "trusted" | "personal";
}
export interface ProjectSourceExcluded {
  event_type: "project_source.excluded";
  payload: ProjectSourceTransitionPayload;
}
export interface ProjectSourceTransitionPayload {
  prior_source_ref: ExactProjectSourceRef;
  project_source: PetraProjectSource;
}
export interface ExactProjectSourceRef {
  project_source_id: string;
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
  status: "active" | "excluded";
}
/**
 * The M1 scholarly specialization: an immutable revision binding one Project to an exact scientific WorkVersion and copy under one ProjectDefinition source role.
 */
export interface PetraProjectSource {
  schema_name: "petra.project-source";
  schema_version: "1.0.0";
  project_source_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A Petra identifier whose kind is project.
   */
  project_id: string;
  content: ProjectSourceContent;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  content_hash: string;
  added_by: ActorRef;
  /**
   * An RFC 3339 timestamp normalized to UTC with millisecond precision.
   */
  added_at: string;
}
export interface ProjectSourceContent {
  binding_kind: "scientific_work_version";
  project_definition_ref: DefinitionRef;
  source_role: string;
  work_ref: WorkRef;
  work_version_ref: WorkVersionRef;
  /**
   * @minItems 1
   * @maxItems 1000
   */
  author_refs: [AuthorRef, ...AuthorRef[]];
  artifact_manifest_ref: ArtifactManifestRef;
  status: "active" | "excluded";
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
}
export interface WorkRef {
  /**
   * A Petra identifier whose kind is work.
   */
  work_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface WorkVersionRef {
  /**
   * A Petra identifier whose kind is work_version.
   */
  work_version_id: string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface AuthorRef {
  /**
   * A Petra identifier whose kind is author.
   */
  author_id: string & string;
  /**
   * A one-based optimistic revision within JavaScript's safe-integer range.
   */
  revision: number;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ArtifactManifestRef {
  /**
   * A Petra identifier whose kind is artifact_manifest.
   */
  artifact_manifest_id: string;
  revision: 1;
  /**
   * A SHA-256 content identity over the exact bytes or canonical JSON projection defined by the enclosing contract.
   */
  record_hash: string;
}
export interface ProjectSourceRestored {
  event_type: "project_source.restored";
  payload: ProjectSourceTransitionPayload;
}
