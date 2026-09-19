import { createHash } from "node:crypto";

import type {
  PetraApproval,
  PetraCommandEnvelope,
  PetraReviewSessionRejectCheckpoint,
  PetraReviewSessionRejectRequest,
  PetraReviewSessionRejectResult,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type { ReviewDecisionCommandPlan } from "./evidence-review.js";
import { derivePetraId } from "./identity.js";
import type { ReviewApplySelection } from "./review-session-apply.js";

export type ReviewRejectAuthority = Pick<
  PetraReviewSessionRejectCheckpoint["binding"],
  "authorization_basis" | "capability_grants"
>;

export class ReviewSessionRejectError extends Error {
  constructor(
    readonly code:
      | "REVIEW_REJECT_STALE"
      | "REVIEW_REJECT_MISMATCH"
      | "REVIEW_REJECT_UNSUPPORTED"
      | "REVIEW_REJECT_DENIED"
      | "REVIEW_REJECT_RECONCILE"
      | "REVIEW_REJECT_CORRUPT",
    message: string,
  ) {
    super(message);
    this.name = "ReviewSessionRejectError";
  }
}

export interface ReviewSessionRejectBoundary {
  prepareReviewReject(
    selection: ReviewApplySelection,
    authority: ReviewRejectAuthority,
  ): Promise<PetraReviewSessionRejectCheckpoint>;
  executeReviewReject(
    request: PetraReviewSessionRejectRequest,
    authority: ReviewRejectAuthority,
  ): Promise<PetraReviewSessionRejectResult>;
}

export const reviewRejectHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

/** Builds the two existing canonical commands; rejection never sends Apply. */
export const buildReviewRejectPlan = (
  request: PetraReviewSessionRejectRequest,
): ReviewDecisionCommandPlan => {
  const checkpoint = request.checkpoint;
  const binding = checkpoint.binding;
  const commitmentHash = checkpoint.displayed_commitment_hash;
  if (commitmentHash !== reviewRejectHash(binding)) {
    throw new ReviewSessionRejectError(
      "REVIEW_REJECT_MISMATCH",
      "The displayed rejection commitment does not match its exact checkpoint bindings.",
    );
  }
  const actor = binding.authorization_basis.actor;
  const changeSet = binding.change_set;
  const submitCommandId = derivePetraId(
    "command",
    `${commitmentHash}|reject-submit`,
  );
  const approval: PetraApproval = {
    schema_name: "petra.approval",
    schema_version: "1.0.0",
    approval_id: derivePetraId("approval", `${commitmentHash}|reject`),
    revision: 1,
    subject: {
      subject_kind: "change_set",
      change_set_id: changeSet.change_set_id,
      change_set_revision: changeSet.revision,
      change_set_content_hash: changeSet.content_hash,
    },
    decision: "rejected",
    decision_scope: "exact_change_set",
    decided_by: structuredClone(actor),
    rationale: request.rationale,
    conditions: [],
    decided_at: request.decided_at,
  };
  const approvalCommandId = derivePetraId(
    "command",
    `${commitmentHash}|reject-approval`,
  );
  const traceId = derivePetraId("trace", `${commitmentHash}|reject`);
  const submit: PetraCommandEnvelope = {
    schema_name: "petra.command-envelope",
    schema_version: "1.0.0",
    command_id: submitCommandId,
    idempotency_key: `review-reject:${commitmentHash}:submit`,
    project_id: binding.project_id,
    actor: structuredClone(actor),
    capability_grant_id: binding.capability_grants.SubmitChangeSet,
    correlation_id: traceId,
    submitted_at: request.decided_at,
    command: {
      command_name: "SubmitChangeSet",
      change_set: structuredClone(changeSet),
    },
  };
  const review: PetraCommandEnvelope = {
    schema_name: "petra.command-envelope",
    schema_version: "1.0.0",
    command_id: approvalCommandId,
    idempotency_key: `review-reject:${commitmentHash}:approval`,
    project_id: binding.project_id,
    actor: structuredClone(actor),
    capability_grant_id: binding.capability_grants.RecordApproval,
    correlation_id: traceId,
    causation_id: submitCommandId,
    submitted_at: request.decided_at,
    command: { command_name: "RecordApproval", approval },
  };
  return {
    decision: "rejected",
    candidate_id: binding.selected_review_member.review_member_id,
    change_set: structuredClone(changeSet),
    submit,
    review,
  };
};
