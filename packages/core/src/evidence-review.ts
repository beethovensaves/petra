import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraApproval,
  PetraAssertion,
  PetraChangeSet,
  PetraChangeSetV110,
  PetraClaim,
  PetraCommandEnvelope,
  PetraCommandEnvelopeRecord,
  PetraCommandEnvelopeV110,
  PetraDocumentParseBundle,
  PetraEvidenceProposalBundle,
  PetraProjectHistoryCompensationPreviewView,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import {
  buildDeterministicEvidenceProposalBundle,
  type DeterministicClaimCandidateRecipe,
} from "./deterministic-evidence-extraction.js";
import type {
  EvidenceBundleAdmissionResult,
  EvidenceCandidateAdmissionResult,
} from "./evidence-proposal-admission.js";
import type { ChangeControlCommandResult } from "./evidence-registry.js";
import { derivePetraId } from "./identity.js";

export type EvidenceReviewPreparationErrorCode =
  | "REVIEW_BUNDLE_MISMATCH"
  | "REVIEW_CANDIDATE_NOT_QUARANTINED"
  | "REVIEW_PAIR_MISMATCH"
  | "CORRECTION_TARGET_MISMATCH";

export class EvidenceReviewPreparationError extends Error {
  readonly code: EvidenceReviewPreparationErrorCode;

  constructor(code: EvidenceReviewPreparationErrorCode, message: string) {
    super(message);
    this.name = "EvidenceReviewPreparationError";
    this.code = code;
  }
}

export interface EvidenceReviewSourceSpanView {
  readonly source_span_id: string;
  readonly structural_block_id: string;
  readonly block_kind: string;
  readonly content_layer: string;
  readonly surrounding_text: string;
  readonly structural_path: readonly string[];
  readonly page_numbers: readonly number[];
  readonly verification_status: string;
}

export interface EvidenceReviewItem {
  readonly candidate_id: string;
  readonly proposal_role: PetraEvidenceProposalBundle["content"]["candidates"][number]["proposal_role"];
  readonly proposed_action: "review_promotion" | "blocked";
  readonly admission: EvidenceCandidateAdmissionResult;
  readonly source: {
    readonly document_parse_bundle_id: string;
    readonly parsed_document_id: string;
    readonly work_version_id: string;
    readonly source_artifact_id: string;
    readonly source_artifact_content_hash: string;
    readonly source_scope: "full_text" | "abstract_only";
    readonly exact_quote: string;
    readonly selected_text_hash: string;
    readonly spans: readonly EvidenceReviewSourceSpanView[];
  };
  readonly claim: PetraEvidenceProposalBundle["content"]["candidates"][number]["claim"];
  readonly assertion: PetraEvidenceProposalBundle["content"]["candidates"][number]["assertion"];
  readonly origin: PetraEvidenceProposalBundle["content"]["extraction"];
  readonly extractor_validation: readonly unknown[];
  readonly warnings: PetraEvidenceProposalBundle["content"]["candidates"][number]["warnings"];
}

export interface EvidenceReviewBatchView {
  readonly evidence_proposal_bundle_id: string;
  readonly project_id: string;
  readonly source_quality_state: string;
  readonly reviewable_count: number;
  readonly blocked_count: number;
  readonly items: readonly EvidenceReviewItem[];
}

export interface ReviewDecisionTiming {
  readonly proposed_at: string;
  readonly decided_at: string;
  readonly applied_at: string;
}

export interface ReviewDecisionCommandPlan {
  readonly decision: "accepted" | "rejected";
  readonly candidate_id: string;
  readonly change_set: PetraChangeSet;
  readonly submit: PetraCommandEnvelope;
  readonly review: PetraCommandEnvelope;
  readonly apply?: PetraCommandEnvelope;
}

export interface ReviewCommandExecutor {
  executeCommand(
    envelope: PetraCommandEnvelopeRecord,
  ): ChangeControlCommandResult | Promise<ChangeControlCommandResult>;
}

export interface CompensatingReversalCommandPlan {
  readonly change_set: PetraChangeSetV110;
  readonly submit: PetraCommandEnvelopeV110;
  readonly review: PetraCommandEnvelopeV110;
  readonly apply: PetraCommandEnvelopeV110;
}

export type ReviewDecisionExecutionResult =
  | {
      readonly outcome: "applied";
      readonly candidate_id: string;
      readonly change_set_id: string;
      readonly claim_id: string;
      readonly claim_revision: number;
      readonly assertion_id: string;
      readonly assertion_revision: number;
    }
  | {
      readonly outcome: "rejected";
      readonly candidate_id: string;
      readonly change_set_id: string;
      readonly approval_id: string;
    };

export type ReviewBatchMemberResult =
  | ReviewDecisionExecutionResult
  | {
      readonly outcome: "failed";
      readonly candidate_id: string;
      readonly change_set_id: string;
      readonly error_code: string;
      readonly message: string;
    };

export interface ReviewBatchExecutionResult {
  readonly member_count: number;
  readonly applied_count: number;
  readonly rejected_count: number;
  readonly failed_count: number;
  readonly members: readonly ReviewBatchMemberResult[];
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const immutableCopy = <Value>(value: Value): Readonly<Value> => {
  const copy = structuredClone(value);
  const freeze = (member: unknown): void => {
    if (
      typeof member !== "object" ||
      member === null ||
      Object.isFrozen(member)
    ) {
      return;
    }
    for (const child of Object.values(member)) freeze(child);
    Object.freeze(member);
  };
  freeze(copy);
  return copy;
};

const sourcePageNumbers = (
  span: PetraDocumentParseBundle["spans"][number],
): readonly number[] => {
  if (span.selector.selector_type === "page_region") {
    return [span.selector.page_region.page_number];
  }
  if (span.selector.selector_type !== "compound") return [];
  return span.selector.components.flatMap((component) =>
    component.component_kind === "page_region"
      ? [component.page_region.page_number]
      : [],
  );
};

export const buildEvidenceReviewBatchView = (
  bundle: PetraEvidenceProposalBundle,
  sourceBundle: PetraDocumentParseBundle,
  admission: EvidenceBundleAdmissionResult,
): EvidenceReviewBatchView => {
  if (
    bundle.evidence_proposal_bundle_id !==
      admission.evidence_proposal_bundle_id ||
    bundle.content.source.document_parse_bundle_id !==
      sourceBundle.document_parse_bundle_id
  ) {
    throw new EvidenceReviewPreparationError(
      "REVIEW_BUNDLE_MISMATCH",
      "Review inputs must refer to the same evidence proposal and parse bundle.",
    );
  }
  const admissionByCandidate = new Map(
    admission.candidates.map((candidate) => [
      candidate.candidate_id,
      candidate,
    ]),
  );
  const items = bundle.content.candidates.map((candidate) => {
    const candidateAdmission = admissionByCandidate.get(candidate.candidate_id);
    if (candidateAdmission === undefined) {
      throw new EvidenceReviewPreparationError(
        "REVIEW_BUNDLE_MISMATCH",
        `Admission result for candidate ${candidate.candidate_id} is absent.`,
      );
    }
    const spans = candidate.source_quote.source_span_ids.flatMap(
      (sourceSpanId) => {
        const span = sourceBundle.spans.find(
          (value) => value.source_span_id === sourceSpanId,
        );
        if (span === undefined) return [];
        const block = sourceBundle.blocks.find(
          (value) => value.structural_block_id === span.structural_block_id,
        );
        if (block === undefined || block.content.content_kind !== "text") {
          return [];
        }
        return [
          {
            source_span_id: span.source_span_id,
            structural_block_id: block.structural_block_id,
            block_kind: block.block_kind,
            content_layer: block.content_layer,
            surrounding_text: block.content.text,
            structural_path: [...block.structural_path],
            page_numbers: sourcePageNumbers(span),
            verification_status: span.verification.status,
          },
        ];
      },
    );
    const basis = candidate.claim.basis;
    return {
      candidate_id: candidate.candidate_id,
      proposal_role: candidate.proposal_role,
      proposed_action:
        candidateAdmission.outcome === "admitted"
          ? ("review_promotion" as const)
          : ("blocked" as const),
      admission: structuredClone(candidateAdmission),
      source: {
        document_parse_bundle_id: sourceBundle.document_parse_bundle_id,
        parsed_document_id: sourceBundle.document.parsed_document_id,
        work_version_id: sourceBundle.document.work_version_id,
        source_artifact_id: sourceBundle.document.source_artifact_id,
        source_artifact_content_hash:
          sourceBundle.document.source_artifact_content_hash,
        source_scope: sourceBundle.source_scope,
        exact_quote: candidate.source_quote.exact_text,
        selected_text_hash: candidate.source_quote.selected_text_hash,
        spans,
      },
      claim: structuredClone(candidate.claim),
      assertion: structuredClone(candidate.assertion),
      origin: structuredClone(bundle.content.extraction),
      extractor_validation:
        basis.basis_kind === "source"
          ? structuredClone(basis.validator_results)
          : [],
      warnings: structuredClone(candidate.warnings),
    };
  });
  const reviewableCount = items.filter(
    (item) => item.proposed_action === "review_promotion",
  ).length;
  return immutableCopy({
    evidence_proposal_bundle_id: bundle.evidence_proposal_bundle_id,
    project_id: bundle.content.project_id,
    source_quality_state: sourceBundle.document.quality_state,
    reviewable_count: reviewableCount,
    blocked_count: items.length - reviewableCount,
    items,
  });
};

const assertPromotionCandidate = (
  candidate: PetraEvidenceProposalBundle["content"]["candidates"][number],
): void => {
  if (
    candidate.claim.authority.zone !== "quarantine" ||
    candidate.assertion.authority.zone !== "quarantine"
  ) {
    throw new EvidenceReviewPreparationError(
      "REVIEW_CANDIDATE_NOT_QUARANTINED",
      "Only a quarantine Claim–Assertion candidate can enter promotion review.",
    );
  }
  if (
    candidate.assertion.predicate !== "ASSERTS" ||
    candidate.assertion.object.object_kind !== "entity" ||
    candidate.assertion.object.entity_id !== candidate.claim.claim_id
  ) {
    throw new EvidenceReviewPreparationError(
      "REVIEW_PAIR_MISMATCH",
      "Promotion review requires one endpoint-consistent Claim–ASSERTS pair.",
    );
  }
};

const reviewableQuarantineState = (
  authority: PetraEvidenceProposalBundle["content"]["candidates"][number]["claim"]["authority"],
): { zone: "quarantine"; review_state: "unreviewed" | "machine_checked" } => {
  if (
    authority.zone !== "quarantine" ||
    (authority.review_state !== "unreviewed" &&
      authority.review_state !== "machine_checked")
  ) {
    throw new EvidenceReviewPreparationError(
      "REVIEW_CANDIDATE_NOT_QUARANTINED",
      "Promotion review accepts only unreviewed or machine-checked quarantine state.",
    );
  }
  return { zone: "quarantine", review_state: authority.review_state };
};

export const buildReviewDecisionCommandPlan = (input: {
  readonly project_id: string;
  readonly candidate: PetraEvidenceProposalBundle["content"]["candidates"][number];
  readonly origin: "direct_edit" | "agent_proposal" | "worker_proposal";
  readonly proposed_by: ActorRef;
  readonly reviewer: PetraApproval["decided_by"];
  readonly capability_grant_id: string;
  readonly decision: "accepted" | "rejected";
  readonly reason: string;
  readonly rationale: string;
  readonly impact_summary: string;
  readonly downstream_object_ids?: readonly string[];
  readonly timing: ReviewDecisionTiming;
}): ReviewDecisionCommandPlan => {
  assertPromotionCandidate(input.candidate);
  const content: PetraChangeSet["content"] = {
    project_id: input.project_id,
    origin: input.origin,
    proposed_by: structuredClone(input.proposed_by),
    reason: input.reason,
    operations: [
      {
        operation_kind: "promote_claim",
        target_id: input.candidate.claim.claim_id,
        base_revision: input.candidate.claim.revision,
        before: reviewableQuarantineState(input.candidate.claim.authority),
        after: { zone: "trusted", review_state: "human_accepted" },
      },
      {
        operation_kind: "promote_assertion",
        target_id: input.candidate.assertion.assertion_id,
        base_revision: input.candidate.assertion.revision,
        before: reviewableQuarantineState(input.candidate.assertion.authority),
        after: { zone: "trusted", review_state: "human_accepted" },
      },
    ],
    impact: {
      affected_object_ids: [
        input.candidate.claim.claim_id,
        input.candidate.assertion.assertion_id,
      ],
      downstream_object_ids: [...(input.downstream_object_ids ?? [])],
      summary: input.impact_summary,
      generated_at: input.timing.proposed_at,
    },
    risk_tier: "R2",
  };
  const contentHash = canonicalHash(content);
  const changeSetId = derivePetraId(
    "change_set",
    `${contentHash}|${input.timing.proposed_at}`,
  );
  const changeSet: PetraChangeSet = {
    schema_name: "petra.change-set",
    schema_version: "1.0.0",
    change_set_id: changeSetId,
    revision: 1,
    state: "submitted",
    content,
    content_hash: contentHash,
    proposed_at: input.timing.proposed_at,
  };
  const traceId = derivePetraId("trace", changeSetId);
  const submitCommandId = derivePetraId("command", `${changeSetId}|submit`);
  const approvalId = derivePetraId(
    "approval",
    canonicalize({
      change_set_id: changeSetId,
      decision: input.decision,
      reviewer: input.reviewer,
      rationale: input.rationale,
      decided_at: input.timing.decided_at,
    }),
  );
  const approval: PetraApproval = {
    schema_name: "petra.approval",
    schema_version: "1.0.0",
    approval_id: approvalId,
    revision: 1,
    subject: {
      subject_kind: "change_set",
      change_set_id: changeSetId,
      change_set_revision: 1,
      change_set_content_hash: contentHash,
    },
    decision: input.decision === "accepted" ? "approved" : "rejected",
    decision_scope: "exact_change_set",
    decided_by: structuredClone(input.reviewer),
    rationale: input.rationale,
    conditions: [],
    decided_at: input.timing.decided_at,
  };
  const reviewCommandId = derivePetraId("command", `${approvalId}|record`);
  const submit: PetraCommandEnvelope = {
    schema_name: "petra.command-envelope",
    schema_version: "1.0.0",
    command_id: submitCommandId,
    idempotency_key: `review:${changeSetId}:submit`,
    project_id: input.project_id,
    actor: structuredClone(input.proposed_by),
    capability_grant_id: input.capability_grant_id,
    correlation_id: traceId,
    submitted_at: input.timing.proposed_at,
    command: {
      command_name: "SubmitChangeSet",
      change_set: structuredClone(changeSet),
    },
  };
  const review: PetraCommandEnvelope = {
    schema_name: "petra.command-envelope",
    schema_version: "1.0.0",
    command_id: reviewCommandId,
    idempotency_key: `review:${changeSetId}:${input.decision}`,
    project_id: input.project_id,
    actor: structuredClone(input.reviewer),
    capability_grant_id: input.capability_grant_id,
    correlation_id: traceId,
    causation_id: submitCommandId,
    submitted_at: input.timing.decided_at,
    command: { command_name: "RecordApproval", approval },
  };
  const apply =
    input.decision === "rejected"
      ? undefined
      : ({
          schema_name: "petra.command-envelope",
          schema_version: "1.0.0",
          command_id: derivePetraId("command", `${changeSetId}|apply`),
          idempotency_key: `review:${changeSetId}:apply`,
          project_id: input.project_id,
          actor: structuredClone(input.reviewer),
          capability_grant_id: input.capability_grant_id,
          correlation_id: traceId,
          causation_id: reviewCommandId,
          submitted_at: input.timing.applied_at,
          command: {
            command_name: "ApplyChangeSet",
            change_set_id: changeSetId,
            change_set_revision: 1,
            change_set_content_hash: contentHash,
            approval_id: approvalId,
            approval_revision: 1,
          },
        } satisfies PetraCommandEnvelope);
  return immutableCopy({
    decision: input.decision,
    candidate_id: input.candidate.candidate_id,
    change_set: changeSet,
    submit,
    review,
    ...(apply === undefined ? {} : { apply }),
  });
};

export const buildCompensatingReversalCommandPlan = (input: {
  readonly project_id: string;
  readonly claim: PetraClaim;
  readonly assertion: PetraAssertion;
  readonly compensates_change_set_id: string;
  readonly proposed_by: ActorRef;
  readonly reviewer: PetraApproval["decided_by"];
  readonly capability_grant_id: string;
  readonly reason: string;
  readonly rationale: string;
  readonly impact_summary: string;
  readonly downstream_object_ids?: readonly string[];
  readonly timing: ReviewDecisionTiming;
}): CompensatingReversalCommandPlan => {
  if (
    input.claim.authority.zone !== "trusted" ||
    input.assertion.authority.zone !== "trusted" ||
    input.claim.authority.review_state !== "human_accepted" ||
    input.assertion.authority.review_state !== "human_accepted" ||
    input.claim.authority.promotion.change_set_id !==
      input.compensates_change_set_id ||
    input.assertion.authority.promotion.change_set_id !==
      input.compensates_change_set_id ||
    input.assertion.predicate !== "ASSERTS" ||
    input.assertion.object.object_kind !== "entity" ||
    input.assertion.object.entity_id !== input.claim.claim_id
  ) {
    throw new EvidenceReviewPreparationError(
      "REVIEW_PAIR_MISMATCH",
      "A reversal must target the trusted Claim–ASSERTS pair created by the compensated promotion.",
    );
  }
  const content: PetraChangeSetV110["content"] = {
    project_id: input.project_id,
    origin: "direct_edit",
    proposed_by: structuredClone(input.proposed_by),
    reason: input.reason,
    operations: [
      {
        operation_kind: "retract_claim",
        target_id: input.claim.claim_id,
        base_revision: input.claim.revision,
        before: { zone: "trusted", review_state: "human_accepted" },
        after: { zone: "quarantine", review_state: "human_rejected" },
      },
      {
        operation_kind: "retract_assertion",
        target_id: input.assertion.assertion_id,
        base_revision: input.assertion.revision,
        before: { zone: "trusted", review_state: "human_accepted" },
        after: { zone: "quarantine", review_state: "human_rejected" },
      },
    ],
    impact: {
      affected_object_ids: [input.claim.claim_id, input.assertion.assertion_id],
      downstream_object_ids: [...(input.downstream_object_ids ?? [])],
      summary: input.impact_summary,
      generated_at: input.timing.proposed_at,
    },
    risk_tier: "R2",
    compensates_change_set_id: input.compensates_change_set_id,
  };
  const contentHash = canonicalHash(content);
  const changeSetId = derivePetraId(
    "change_set",
    `${contentHash}|${input.timing.proposed_at}`,
  );
  const changeSet: PetraChangeSetV110 = {
    schema_name: "petra.change-set",
    schema_version: "1.1.0",
    change_set_id: changeSetId,
    revision: 1,
    state: "submitted",
    content,
    content_hash: contentHash,
    proposed_at: input.timing.proposed_at,
  };
  const traceId = derivePetraId("trace", changeSetId);
  const submitCommandId = derivePetraId("command", `${changeSetId}|submit`);
  const approvalId = derivePetraId(
    "approval",
    canonicalize({
      change_set_id: changeSetId,
      decision: "approved",
      reviewer: input.reviewer,
      rationale: input.rationale,
      decided_at: input.timing.decided_at,
    }),
  );
  const approval: PetraApproval = {
    schema_name: "petra.approval",
    schema_version: "1.0.0",
    approval_id: approvalId,
    revision: 1,
    subject: {
      subject_kind: "change_set",
      change_set_id: changeSetId,
      change_set_revision: 1,
      change_set_content_hash: contentHash,
    },
    decision: "approved",
    decision_scope: "exact_change_set",
    decided_by: structuredClone(input.reviewer),
    rationale: input.rationale,
    conditions: [],
    decided_at: input.timing.decided_at,
  };
  const reviewCommandId = derivePetraId("command", `${approvalId}|record`);
  const submit: PetraCommandEnvelopeV110 = {
    schema_name: "petra.command-envelope",
    schema_version: "1.1.0",
    command_id: submitCommandId,
    idempotency_key: `reversal:${changeSetId}:submit`,
    project_id: input.project_id,
    actor: structuredClone(input.proposed_by),
    capability_grant_id: input.capability_grant_id,
    correlation_id: traceId,
    submitted_at: input.timing.proposed_at,
    command: {
      command_name: "SubmitChangeSet",
      change_set: structuredClone(changeSet),
    },
  };
  const review: PetraCommandEnvelopeV110 = {
    schema_name: "petra.command-envelope",
    schema_version: "1.1.0",
    command_id: reviewCommandId,
    idempotency_key: `reversal:${changeSetId}:approved`,
    project_id: input.project_id,
    actor: structuredClone(input.reviewer),
    capability_grant_id: input.capability_grant_id,
    correlation_id: traceId,
    causation_id: submitCommandId,
    submitted_at: input.timing.decided_at,
    command: { command_name: "RecordApproval", approval },
  };
  const apply: PetraCommandEnvelopeV110 = {
    schema_name: "petra.command-envelope",
    schema_version: "1.1.0",
    command_id: derivePetraId("command", `${changeSetId}|apply`),
    idempotency_key: `reversal:${changeSetId}:apply`,
    project_id: input.project_id,
    actor: structuredClone(input.reviewer),
    capability_grant_id: input.capability_grant_id,
    correlation_id: traceId,
    causation_id: reviewCommandId,
    submitted_at: input.timing.applied_at,
    command: {
      command_name: "ApplyChangeSet",
      change_set_id: changeSetId,
      change_set_revision: 1,
      change_set_content_hash: contentHash,
      approval_id: approvalId,
      approval_revision: 1,
    },
  };
  return immutableCopy({ change_set: changeSet, submit, review, apply });
};

export const buildPreviewBoundCompensatingReversalCommandPlan = (input: {
  readonly preview: PetraProjectHistoryCompensationPreviewView;
  readonly reason: string;
  readonly rationale: string;
  readonly composed_at: string;
}): CompensatingReversalCommandPlan => {
  const [claimOperation, assertionOperation] =
    input.preview.content.operation_preview;
  const [claimResult, assertionResult] = input.preview.content.result_preview;
  const [submitAuthority, approvalAuthority, applyAuthority] =
    input.preview.content.command_sequence;
  const actor = submitAuthority.actor;
  if (actor.actor_kind !== "human") {
    throw new EvidenceReviewPreparationError(
      "REVIEW_PAIR_MISMATCH",
      "A preview-bound reversal plan requires the configured human principal.",
    );
  }
  const humanActor = {
    actor_id: actor.actor_id,
    actor_kind: "human" as const,
  };
  if (
    claimOperation.operation_kind !== "retract_claim" ||
    assertionOperation.operation_kind !== "retract_assertion" ||
    claimResult.semantic_key !== "scientific.claim" ||
    assertionResult.semantic_key !== "scientific.assertion" ||
    claimResult.object_id !== claimOperation.target_id ||
    assertionResult.object_id !== assertionOperation.target_id ||
    claimResult.prior_revision !== claimOperation.base_revision ||
    assertionResult.prior_revision !== assertionOperation.base_revision ||
    claimResult.resulting_revision !== claimOperation.base_revision + 1 ||
    assertionResult.resulting_revision !==
      assertionOperation.base_revision + 1 ||
    submitAuthority.position !== 1 ||
    submitAuthority.command_name !== "SubmitChangeSet" ||
    approvalAuthority.position !== 2 ||
    approvalAuthority.command_name !== "RecordApproval" ||
    applyAuthority.position !== 3 ||
    applyAuthority.command_name !== "ApplyChangeSet" ||
    approvalAuthority.actor.actor_id !== actor.actor_id ||
    approvalAuthority.actor.actor_kind !== actor.actor_kind ||
    applyAuthority.actor.actor_id !== actor.actor_id ||
    applyAuthority.actor.actor_kind !== actor.actor_kind ||
    input.preview.content.compensates_change_set.current_state !== "applied"
  ) {
    throw new EvidenceReviewPreparationError(
      "REVIEW_PAIR_MISMATCH",
      "A preview-bound reversal plan requires the exact eligible Claim–Assertion pair and governed command sequence.",
    );
  }
  const content: PetraChangeSetV110["content"] = {
    project_id: input.preview.project_id,
    origin: "direct_edit",
    proposed_by: structuredClone(actor),
    reason: input.reason,
    operations: [
      {
        operation_kind: "retract_claim",
        target_id: claimOperation.target_id,
        base_revision: claimOperation.base_revision,
        before: structuredClone(claimOperation.before),
        after: structuredClone(claimOperation.after),
      },
      {
        operation_kind: "retract_assertion",
        target_id: assertionOperation.target_id,
        base_revision: assertionOperation.base_revision,
        before: structuredClone(assertionOperation.before),
        after: structuredClone(assertionOperation.after),
      },
    ],
    impact: {
      affected_object_ids: [
        claimOperation.target_id,
        assertionOperation.target_id,
      ],
      downstream_object_ids: [],
      summary:
        "Retract the exact promoted Claim–Assertion pair while retaining dependent records and without inferring or automatically reversing dependent effects.",
      generated_at: input.composed_at,
    },
    risk_tier: "R2",
    compensates_change_set_id:
      input.preview.content.compensates_change_set.change_set_id,
  };
  const contentHash = canonicalHash(content);
  const changeSetId = derivePetraId(
    "change_set",
    `${contentHash}|${input.composed_at}`,
  );
  const changeSet: PetraChangeSetV110 = {
    schema_name: "petra.change-set",
    schema_version: "1.1.0",
    change_set_id: changeSetId,
    revision: 1,
    state: "submitted",
    content,
    content_hash: contentHash,
    proposed_at: input.composed_at,
  };
  const traceId = derivePetraId("trace", changeSetId);
  const submitCommandId = derivePetraId("command", `${changeSetId}|submit`);
  const approvalId = derivePetraId(
    "approval",
    canonicalize({
      change_set_id: changeSetId,
      decision: "approved",
      reviewer: humanActor,
      rationale: input.rationale,
      decided_at: input.composed_at,
    }),
  );
  const approval: PetraApproval = {
    schema_name: "petra.approval",
    schema_version: "1.0.0",
    approval_id: approvalId,
    revision: 1,
    subject: {
      subject_kind: "change_set",
      change_set_id: changeSetId,
      change_set_revision: 1,
      change_set_content_hash: contentHash,
    },
    decision: "approved",
    decision_scope: "exact_change_set",
    decided_by: structuredClone(humanActor),
    rationale: input.rationale,
    conditions: [],
    decided_at: input.composed_at,
  };
  const reviewCommandId = derivePetraId("command", `${approvalId}|record`);
  const submit: PetraCommandEnvelopeV110 = {
    schema_name: "petra.command-envelope",
    schema_version: "1.1.0",
    command_id: submitCommandId,
    idempotency_key: `reversal:${changeSetId}:submit`,
    project_id: input.preview.project_id,
    actor: structuredClone(actor),
    capability_grant_id: submitAuthority.grant_ref.capability_grant_id,
    correlation_id: traceId,
    submitted_at: input.composed_at,
    command: {
      command_name: "SubmitChangeSet",
      change_set: structuredClone(changeSet),
    },
  };
  const review: PetraCommandEnvelopeV110 = {
    schema_name: "petra.command-envelope",
    schema_version: "1.1.0",
    command_id: reviewCommandId,
    idempotency_key: `reversal:${changeSetId}:approved`,
    project_id: input.preview.project_id,
    actor: structuredClone(actor),
    capability_grant_id: approvalAuthority.grant_ref.capability_grant_id,
    correlation_id: traceId,
    causation_id: submitCommandId,
    submitted_at: input.composed_at,
    command: { command_name: "RecordApproval", approval },
  };
  const apply: PetraCommandEnvelopeV110 = {
    schema_name: "petra.command-envelope",
    schema_version: "1.1.0",
    command_id: derivePetraId("command", `${changeSetId}|apply`),
    idempotency_key: `reversal:${changeSetId}:apply`,
    project_id: input.preview.project_id,
    actor: structuredClone(actor),
    capability_grant_id: applyAuthority.grant_ref.capability_grant_id,
    correlation_id: traceId,
    causation_id: reviewCommandId,
    submitted_at: input.composed_at,
    command: {
      command_name: "ApplyChangeSet",
      change_set_id: changeSetId,
      change_set_revision: 1,
      change_set_content_hash: contentHash,
      approval_id: approvalId,
      approval_revision: 1,
    },
  };
  return immutableCopy({ change_set: changeSet, submit, review, apply });
};

export const executeCompensatingReversalPlan = async (
  executor: ReviewCommandExecutor,
  plan: CompensatingReversalCommandPlan,
): Promise<Extract<ChangeControlCommandResult, { outcome: "reverted" }>> => {
  await executor.executeCommand(plan.submit);
  await executor.executeCommand(plan.review);
  const result = await executor.executeCommand(plan.apply);
  if (result.outcome !== "reverted") {
    throw new Error("Compensating ApplyChangeSet did not return a reversal.");
  }
  return result;
};

export const executeReviewDecisionPlan = async (
  executor: ReviewCommandExecutor,
  plan: ReviewDecisionCommandPlan,
): Promise<ReviewDecisionExecutionResult> => {
  await executor.executeCommand(plan.submit);
  const review = await executor.executeCommand(plan.review);
  if (plan.decision === "rejected") {
    if (review.outcome !== "approval_recorded") {
      throw new Error("Review command did not record its rejection.");
    }
    return immutableCopy({
      outcome: "rejected",
      candidate_id: plan.candidate_id,
      change_set_id: plan.change_set.change_set_id,
      approval_id: review.approval_id,
    });
  }
  if (plan.apply === undefined) {
    throw new Error("An accepted review plan is missing ApplyChangeSet.");
  }
  const applied = await executor.executeCommand(plan.apply);
  if (applied.outcome !== "applied") {
    throw new Error("ApplyChangeSet did not return an applied result.");
  }
  return immutableCopy({
    outcome: "applied",
    candidate_id: plan.candidate_id,
    change_set_id: applied.change_set_id,
    claim_id: applied.claim_id,
    claim_revision: applied.claim_revision,
    assertion_id: applied.assertion_id,
    assertion_revision: applied.assertion_revision,
  });
};

const failedMember = (
  plan: ReviewDecisionCommandPlan,
  error: unknown,
): ReviewBatchMemberResult => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string" ||
    !("message" in error) ||
    typeof error.message !== "string"
  ) {
    throw error;
  }
  return immutableCopy({
    outcome: "failed",
    candidate_id: plan.candidate_id,
    change_set_id: plan.change_set.change_set_id,
    error_code: error.code,
    message: error.message,
  });
};

export const executeReviewBatch = async (
  executor: ReviewCommandExecutor,
  plans: readonly ReviewDecisionCommandPlan[],
): Promise<ReviewBatchExecutionResult> => {
  const members: ReviewBatchMemberResult[] = [];
  for (const plan of plans) {
    try {
      members.push(await executeReviewDecisionPlan(executor, plan));
    } catch (error) {
      members.push(failedMember(plan, error));
    }
  }
  return immutableCopy({
    member_count: members.length,
    applied_count: members.filter((member) => member.outcome === "applied")
      .length,
    rejected_count: members.filter((member) => member.outcome === "rejected")
      .length,
    failed_count: members.filter((member) => member.outcome === "failed")
      .length,
    members,
  });
};

export const buildHumanCorrectionProposal = (input: {
  readonly source_bundle: PetraDocumentParseBundle;
  readonly original: PetraEvidenceProposalBundle["content"]["candidates"][number];
  readonly project_id: string;
  readonly corrected_by: PetraApproval["decided_by"];
  readonly corrected_at: string;
  readonly candidate_key: string;
  readonly canonical_text: string;
  readonly claim_kind?: DeterministicClaimCandidateRecipe["claim_kind"];
  readonly scope?: DeterministicClaimCandidateRecipe["scope"];
  readonly detail_level?: DeterministicClaimCandidateRecipe["detail_level"];
  readonly source_stance?: DeterministicClaimCandidateRecipe["source_stance"];
  readonly attribution?: string;
  readonly modality?: DeterministicClaimCandidateRecipe["modality"];
  readonly negated?: boolean;
}): PetraEvidenceProposalBundle => {
  const basis = input.original.claim.basis;
  if (
    basis.basis_kind !== "source" ||
    input.original.assertion.object.object_kind !== "entity" ||
    input.original.assertion.object.entity_id !==
      input.original.claim.claim_id ||
    basis.work_version_id !== input.source_bundle.document.work_version_id
  ) {
    throw new EvidenceReviewPreparationError(
      "CORRECTION_TARGET_MISMATCH",
      "A human correction must preserve one source-grounded Claim–ASSERTS lineage.",
    );
  }
  return buildDeterministicEvidenceProposalBundle(input.source_bundle, {
    recipe_name: "petra-human-evidence-correction",
    recipe_version: "1.0.0",
    project_id: input.project_id,
    created_by: input.corrected_by,
    created_at: input.corrected_at,
    candidates: [
      {
        candidate_key: input.candidate_key,
        proposal_role: input.original.proposal_role,
        source: {
          selection_kind: "explicit_span",
          exact_text: input.original.source_quote.exact_text,
          source_span_ids: [...input.original.source_quote.source_span_ids],
        },
        canonical_text: input.canonical_text,
        claim_kind: input.claim_kind ?? input.original.claim.claim_kind,
        scope: structuredClone(input.scope ?? input.original.claim.scope),
        detail_level: input.detail_level ?? basis.detail_level,
        source_stance: input.source_stance ?? basis.source_stance,
        attribution: input.attribution ?? basis.attribution,
        modality: input.modality ?? basis.modality,
        negated: input.negated ?? basis.negated,
        derivation_kind: "human_extraction",
        supersedes_claim_id: input.original.claim.claim_id,
        supersedes_assertion_id: input.original.assertion.assertion_id,
      },
    ],
  });
};
