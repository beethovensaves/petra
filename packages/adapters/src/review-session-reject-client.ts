import type {
  PetraReviewSessionRejectCheckpoint,
  PetraReviewSessionRejectRequest,
  PetraReviewSessionRejectResult,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ReviewApplySelection } from "@petra/core";
import { canonicalize } from "json-canonicalize";

import { validateReviewRecoveryAssessment } from "./review-recovery-assessment-client.js";

const hash = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
const expectedId = async (kind: string, identity: string): Promise<string> => {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${kind}:${identity}`),
    ),
  ).slice(0, 16);
  let value = BigInt(
    `0x${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
  );
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return `${kind}_${payload}`;
};
const equal = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);
const mismatch = (): never => {
  throw new Error(
    "The exact Review rejection observation is inconsistent. Effects may exist; reconcile canonical Review status before another attempt.",
  );
};

/** Verifies an owning checkpoint without choosing rejection eligibility. */
export async function validateReviewRejectCheckpoint(
  body: unknown,
  expected?: ReviewApplySelection,
  contracts = new PetraContractRegistry(),
): Promise<PetraReviewSessionRejectCheckpoint> {
  contracts.assertValid("review-session-reject-checkpoint", "1.0.0", body);
  const checkpoint = body as PetraReviewSessionRejectCheckpoint;
  const binding = checkpoint.binding;
  const session = binding.review_session;
  const member = binding.selected_review_member;
  const changeSet = binding.change_set;
  if (
    checkpoint.displayed_commitment_hash !== (await hash(binding)) ||
    session.content_hash !== (await hash(session.content)) ||
    binding.project_id !== session.project_id ||
    session.content.lifecycle !== "open" ||
    changeSet.content.project_id !== binding.project_id ||
    changeSet.content_hash !== (await hash(changeSet.content)) ||
    !equal(changeSet.content.proposed_by, binding.authorization_basis.actor) ||
    !session.content.members.some(
      (entry) => entry.review_member_id === member.review_member_id,
    ) ||
    !binding.atomic_member_ids.includes(member.review_member_id)
  )
    mismatch();
  if (
    expected !== undefined &&
    (binding.project_id !== expected.project_id ||
      session.review_session_id !== expected.review_session_id ||
      session.revision !== expected.expected_revision ||
      session.content_hash !== expected.expected_content_hash ||
      member.review_member_id !== expected.selected_review_member_id)
  )
    mismatch();
  const selected = session.content.members.find(
    (entry) => entry.review_member_id === member.review_member_id,
  );
  const targets = changeSet.content.operations.map(
    (operation) => operation.target_id,
  );
  const atomicMemberIds = session.content.members
    .filter((entry) =>
      entry.candidate_bindings.some((candidate) =>
        targets.includes(candidate.record_ref.record_id),
      ),
    )
    .map((entry) => entry.review_member_id);
  if (
    selected === undefined ||
    !equal(atomicMemberIds, binding.atomic_member_ids) ||
    !binding.atomic_member_ids.includes(member.review_member_id) ||
    new Set(targets).size !== targets.length ||
    !equal(selected.working_state.candidate_ref, {
      working_candidate_id: member.working_state.candidate.working_candidate_id,
      revision: member.working_state.candidate.revision,
      content_hash: member.working_state.candidate.content_hash,
    }) ||
    !equal(
      selected.working_state.relationship_refs,
      member.working_state.relationships.map((relationship) => ({
        working_relationship_id: relationship.working_relationship_id,
        revision: relationship.revision,
        content_hash: relationship.content_hash,
      })),
    ) ||
    targets.some(
      (target) =>
        !session.content.members.some(
          (entry) =>
            binding.atomic_member_ids.includes(entry.review_member_id) &&
            entry.candidate_bindings.some(
              (candidate) => candidate.record_ref.record_id === target,
            ),
        ),
    )
  )
    mismatch();
  for (const record of [
    member.working_state.candidate,
    ...member.working_state.relationships,
  ]) {
    const { content_hash: contentHash, ...projection } = record;
    if (
      record.project_id !== binding.project_id ||
      contentHash !== (await hash(projection))
    )
      mismatch();
  }
  for (const entry of session.content.members.filter((candidate) =>
    binding.atomic_member_ids.includes(candidate.review_member_id),
  )) {
    if (
      entry.candidate_bindings.some(
        (candidate) =>
          !changeSet.content.operations.some(
            (operation) =>
              operation.target_id === candidate.record_ref.record_id &&
              operation.base_revision === candidate.record_ref.revision,
          ),
      )
    )
      mismatch();
  }
  return structuredClone(checkpoint);
}

export async function validateReviewRejectResult(
  body: unknown,
  input: PetraReviewSessionRejectRequest,
  contracts = new PetraContractRegistry(),
): Promise<PetraReviewSessionRejectResult> {
  const request = structuredClone(input);
  contracts.assertValid("review-session-reject-result", "1.0.0", body);
  const result = body as PetraReviewSessionRejectResult;
  if (!equal(result.request, request)) mismatch();
  const checkpoint = await validateReviewRejectCheckpoint(
    request.checkpoint,
    undefined,
    contracts,
  );
  const binding = checkpoint.binding;
  const commitmentHash = checkpoint.displayed_commitment_hash;
  const assessment = await validateReviewRecoveryAssessment(
    result.assessment,
    {
      project_id: binding.project_id,
      review_session_id: binding.review_session.review_session_id,
      expected_revision: binding.review_session.revision,
      expected_content_hash: binding.review_session.content_hash,
    },
    contracts,
  );
  const approvalCommand = result.steps[1].envelope.command;
  const approval =
    "approval" in approvalCommand ? approvalCommand.approval : mismatch();
  if (
    approval.approval_id !==
      (await expectedId("approval", `${commitmentHash}|reject`)) ||
    approval.decision !== "rejected" ||
    approval.rationale !== request.rationale ||
    approval.decided_at !== request.decided_at ||
    !equal(approval.decided_by, binding.authorization_basis.actor) ||
    !equal(approval.subject, {
      subject_kind: "change_set",
      change_set_id: binding.change_set.change_set_id,
      change_set_revision: binding.change_set.revision,
      change_set_content_hash: binding.change_set.content_hash,
    })
  )
    mismatch();
  const expectedCommands = ["SubmitChangeSet", "RecordApproval"] as const;
  const expectedSuffixes = ["reject-submit", "reject-approval"] as const;
  let interrupted = false;
  for (const [index, step] of result.steps.entries()) {
    const envelope = step.envelope;
    if (
      envelope.command_id !==
        (await expectedId(
          "command",
          `${commitmentHash}|${expectedSuffixes[index]}`,
        )) ||
      envelope.correlation_id !==
        (await expectedId("trace", `${commitmentHash}|reject`)) ||
      envelope.command.command_name !== expectedCommands[index] ||
      envelope.project_id !== binding.project_id ||
      envelope.idempotency_key !==
        `review-reject:${commitmentHash}:${index === 0 ? "submit" : "approval"}` ||
      envelope.submitted_at !== request.decided_at ||
      !equal(envelope.actor, binding.authorization_basis.actor) ||
      envelope.capability_grant_id !==
        binding.capability_grants[expectedCommands[index]] ||
      (index === 1 &&
        envelope.causation_id !== result.steps[0].envelope.command_id)
    )
      mismatch();
    if (
      index === 0 &&
      (envelope.command.command_name !== "SubmitChangeSet" ||
        !equal(envelope.command.change_set, binding.change_set))
    )
      mismatch();
    const success =
      step.observation === "executed" || step.observation === "replayed";
    if (
      success &&
      (interrupted || step.event === undefined || step.error_code !== undefined)
    )
      mismatch();
    if (!success) interrupted = true;
    if (step.observation === "unattempted" && step.event !== undefined)
      mismatch();
    const event = step.event;
    if (event === undefined) continue;
    const trace = assessment.content.groups
      .flatMap((group) => group.events)
      .find((entry) => entry.event_id === event.event_id);
    if (
      event.command_id !== envelope.command_id ||
      event.idempotency_key !== envelope.idempotency_key ||
      event.capability_grant_id !== envelope.capability_grant_id ||
      event.project_id !== binding.project_id ||
      event.occurred_at !== request.decided_at ||
      !equal(event.actor, envelope.actor) ||
      trace?.record_hash !== (await hash(event)) ||
      trace.command_id !== envelope.command_id
    )
      mismatch();
    if (
      success &&
      index === 0 &&
      (event.event.event_type !== "change_set.submitted" ||
        !equal(event.event.payload.change_set, binding.change_set))
    )
      mismatch();
    if (
      success &&
      index === 1 &&
      (event.event.event_type !== "approval.recorded" ||
        !equal(event.event.payload.approval, approval) ||
        event.event.payload.derived_change_set_state !== "rejected")
    )
      mismatch();
  }
  if (new Set(result.steps.map((step) => step.envelope.command_id)).size !== 2)
    mismatch();
  const group = assessment.content.groups.find(
    (entry) =>
      entry.change_set.change_set_id === binding.change_set.change_set_id,
  );
  if (
    group !== undefined &&
    (!equal(group.change_set, binding.change_set) ||
      group.operation_count !== binding.change_set.content.operations.length)
  )
    mismatch();
  if (
    result.outcome === "rejected" &&
    (interrupted ||
      group?.state !== "rejected" ||
      group.effect !== "unknown" ||
      group.next_step !== "inspect" ||
      !equal(group.member_ids, binding.atomic_member_ids) ||
      group.member_outcomes.some(
        (member) => member.review_outcome !== "rejected",
      ))
  )
    mismatch();
  if (result.outcome === "reconciliation_required" && !interrupted) mismatch();
  return structuredClone(result);
}

export class ReviewSessionRejectClientError extends Error {
  constructor(
    readonly status: number,
    readonly response: unknown,
    phase: "prepare" | "reject" = "reject",
  ) {
    super(
      phase === "prepare"
        ? "The exact Review rejection checkpoint could not be prepared or verified."
        : "The rejection request or observation could not be verified. Effects may exist; reconcile canonical Review status before another attempt.",
    );
    this.name = "ReviewSessionRejectClientError";
  }
}

export class ReviewSessionRejectClient {
  constructor(
    readonly options: {
      readonly baseUrl: string;
      readonly token: string;
      readonly fetch?: typeof fetch;
    },
  ) {}

  async prepare(
    selection: ReviewApplySelection,
  ): Promise<PetraReviewSessionRejectCheckpoint> {
    if (
      Object.keys(selection).sort().join(",") !==
        "expected_content_hash,expected_revision,project_id,review_session_id,selected_review_member_id" ||
      !/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(selection.project_id) ||
      !/^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u.test(
        selection.review_session_id,
      ) ||
      !Number.isSafeInteger(selection.expected_revision) ||
      selection.expected_revision < 1 ||
      !/^sha256:[0-9a-f]{64}$/u.test(selection.expected_content_hash) ||
      !/^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u.test(
        selection.selected_review_member_id,
      )
    )
      throw new TypeError(
        "Review rejection preparation requires an exact Project, Review revision and inspection member.",
      );
    selection = structuredClone(selection);
    const url = new URL(
      `/api/queries/projects/${selection.project_id}/reviews/${selection.review_session_id}/reject-checkpoint`,
      this.options.baseUrl,
    );
    url.searchParams.set(
      "expected_revision",
      String(selection.expected_revision),
    );
    url.searchParams.set(
      "expected_content_hash",
      selection.expected_content_hash,
    );
    url.searchParams.set(
      "selected_review_member_id",
      selection.selected_review_member_id,
    );
    const response = await (this.options.fetch ?? fetch)(url, {
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    const body: unknown = await response.json();
    if (!response.ok)
      throw new ReviewSessionRejectClientError(
        response.status,
        body,
        "prepare",
      );
    try {
      return await validateReviewRejectCheckpoint(body, selection);
    } catch {
      throw new ReviewSessionRejectClientError(
        response.status,
        body,
        "prepare",
      );
    }
  }

  async reject(
    input: PetraReviewSessionRejectRequest,
  ): Promise<PetraReviewSessionRejectResult> {
    const request = structuredClone(input);
    new PetraContractRegistry().assertValid(
      "review-session-reject-request",
      "1.0.0",
      request,
    );
    await validateReviewRejectCheckpoint(request.checkpoint);
    const binding = request.checkpoint.binding;
    const url = new URL(
      `/api/commands/projects/${binding.project_id}/reviews/${binding.review_session.review_session_id}/reject`,
      this.options.baseUrl,
    );
    let body: unknown;
    let status = 0;
    try {
      const response = await (this.options.fetch ?? fetch)(url, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      });
      status = response.status;
      body = await response.json();
      if (!response.ok) throw new ReviewSessionRejectClientError(status, body);
      return await validateReviewRejectResult(body, request);
    } catch {
      throw new ReviewSessionRejectClientError(status, body);
    }
  }
}
