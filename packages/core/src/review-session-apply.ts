import { createHash } from "node:crypto";
import type {
  PetraApproval,
  PetraCommandEnvelope,
  PetraReviewSessionApplyCheckpoint,
  PetraReviewSessionApplyResult,
  PetraReviewSessionApplyRequest,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { derivePetraId } from "./identity.js";
import type { ReviewDecisionCommandPlan } from "./evidence-review.js";

export type ReviewApplyAuthority = Pick<
  PetraReviewSessionApplyCheckpoint["binding"],
  "authorization_basis" | "capability_grants"
>;

export interface ReviewApplySelection {
  readonly project_id: string;
  readonly review_session_id: string;
  readonly expected_revision: number;
  readonly expected_content_hash: string;
  readonly selected_review_member_id: string;
}

export class ReviewSessionApplyError extends Error {
  constructor(
    readonly code:
      | "REVIEW_APPLY_STALE"
      | "REVIEW_APPLY_MISMATCH"
      | "REVIEW_APPLY_UNSUPPORTED"
      | "REVIEW_APPLY_DENIED"
      | "REVIEW_APPLY_RECONCILE"
      | "REVIEW_APPLY_CORRUPT",
    message: string,
  ) {
    super(message);
    this.name = "ReviewSessionApplyError";
  }
}

export interface ReviewSessionApplyBoundary {
  prepareReviewApply(
    selection: ReviewApplySelection,
    authority: ReviewApplyAuthority,
  ): Promise<PetraReviewSessionApplyCheckpoint>;
  executeReviewApply(
    request: PetraReviewSessionApplyRequest,
    authority: ReviewApplyAuthority,
  ): Promise<PetraReviewSessionApplyResult>;
}

export const reviewApplyHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

/** The single manual checkpoint supplies the exact existing human Approval. */
export function buildReviewApplyPlan(
  request: PetraReviewSessionApplyRequest,
): ReviewDecisionCommandPlan {
  const checkpoint = request.checkpoint;
  const binding = checkpoint.binding;
  const hash = checkpoint.displayed_commitment_hash;
  if (hash !== reviewApplyHash(binding)) {
    throw new ReviewSessionApplyError(
      "REVIEW_APPLY_MISMATCH",
      "The displayed commitment does not match the exact checkpoint bindings.",
    );
  }
  const actor = binding.authorization_basis.actor;
  const changeSet = binding.change_set;
  const ids = ["submit", "approval", "apply"].map((step) =>
    derivePetraId("command", `${hash}|${step}`),
  );
  const approval: PetraApproval = {
    schema_name: "petra.approval",
    schema_version: "1.0.0",
    approval_id: derivePetraId("approval", hash),
    revision: 1,
    subject: {
      subject_kind: "change_set",
      change_set_id: changeSet.change_set_id,
      change_set_revision: changeSet.revision,
      change_set_content_hash: changeSet.content_hash,
    },
    decision: "approved",
    decision_scope: "exact_change_set",
    decided_by: structuredClone(actor),
    rationale: `Authenticated human Apply checkpoint ${hash} for ReviewSession ${binding.review_session.review_session_id} revision ${binding.review_session.revision}. ReviewPolicy: not applicable.`,
    conditions: [],
    decided_at: request.decided_at,
  };
  const commands: PetraCommandEnvelope["command"][] = [
    { command_name: "SubmitChangeSet", change_set: structuredClone(changeSet) },
    { command_name: "RecordApproval", approval },
    {
      command_name: "ApplyChangeSet",
      change_set_id: changeSet.change_set_id,
      change_set_revision: changeSet.revision,
      change_set_content_hash: changeSet.content_hash,
      approval_id: approval.approval_id,
      approval_revision: 1,
    },
  ];
  const envelopes = commands.map((command, index): PetraCommandEnvelope => ({
    schema_name: "petra.command-envelope",
    schema_version: "1.0.0",
    command_id: ids[index]!,
    idempotency_key: `review-checkpoint:${hash}:${index}`,
    project_id: binding.project_id,
    actor: structuredClone(actor),
    capability_grant_id: binding.capability_grants[command.command_name],
    correlation_id: derivePetraId("trace", hash),
    ...(index === 0 ? {} : { causation_id: ids[index - 1]! }),
    submitted_at: request.decided_at,
    command,
  }));
  return {
    decision: "accepted",
    candidate_id: binding.selected_review_member_id,
    change_set: structuredClone(changeSet),
    submit: envelopes[0]!,
    review: envelopes[1]!,
    apply: envelopes[2]!,
  };
}
