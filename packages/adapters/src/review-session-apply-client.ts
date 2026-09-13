import type {
  PetraReviewSessionApplyCheckpoint,
  PetraReviewSessionApplyRequest,
  PetraReviewSessionApplyResult,
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
// Check deterministic command identity; this does not choose an action or grant.
const expectedId = async (kind: string, identity: string): Promise<string> => {
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${kind}:${identity}`),
    ),
  ).slice(0, 16);
  let value = BigInt(
    `0x${Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("")}`,
  );
  let payload = "";
  for (let i = 0; i < 26; i += 1) {
    payload = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return `${kind}_${payload}`;
};
const equal = (a: unknown, b: unknown): boolean =>
  canonicalize(a) === canonicalize(b);
const mismatch = (): never => {
  throw new Error(
    "The exact Apply observation is inconsistent. Effects may exist; reconcile canonical status before another attempt.",
  );
};

/** Binding validation only: this client computes no eligibility or authority. */
export async function validateReviewApplyCheckpoint(
  body: unknown,
  expected?: ReviewApplySelection,
  contracts = new PetraContractRegistry(),
): Promise<PetraReviewSessionApplyCheckpoint> {
  contracts.assertValid("review-session-apply-checkpoint", "1.0.0", body);
  const checkpoint = body as PetraReviewSessionApplyCheckpoint;
  const b = checkpoint.binding;
  const s = b.review_session;
  const cs = b.change_set;
  if (
    checkpoint.displayed_commitment_hash !== (await hash(b)) ||
    s.content_hash !== (await hash(s.content)) ||
    b.project_id !== s.project_id ||
    cs.content.project_id !== b.project_id ||
    cs.content_hash !== (await hash(cs.content)) ||
    !equal(cs.content.proposed_by, b.authorization_basis.actor) ||
    s.content.lifecycle !== "open" ||
    b.project_definition.project_id !== b.project_id ||
    b.project_definition.content_hash !==
      (await hash(b.project_definition.content)) ||
    !equal(s.project_definition_ref, {
      project_definition_id: b.project_definition.project_definition_id,
      revision: b.project_definition.revision,
      content_hash: b.project_definition.content_hash,
    })
  )
    mismatch();
  if (
    expected !== undefined &&
    (b.project_id !== expected.project_id ||
      s.review_session_id !== expected.review_session_id ||
      s.revision !== expected.expected_revision ||
      s.content_hash !== expected.expected_content_hash ||
      b.selected_review_member_id !== expected.selected_review_member_id)
  )
    mismatch();
  const memberIds = s.content.members.map((m) => m.review_member_id);
  if (
    !equal(
      memberIds,
      b.members.map((m) => m.review_member_id),
    ) ||
    new Set(memberIds).size !== memberIds.length ||
    !memberIds.includes(b.selected_review_member_id)
  )
    mismatch();
  const targets = cs.content.operations.map((op) => op.target_id);
  const atomicIds = s.content.members
    .filter((m) =>
      m.candidate_bindings.some((r) =>
        targets.includes(r.record_ref.record_id),
      ),
    )
    .map((m) => m.review_member_id);
  if (
    !equal(atomicIds, b.atomic_member_ids) ||
    !atomicIds.includes(b.selected_review_member_id) ||
    new Set(targets).size !== targets.length ||
    targets.some(
      (id) =>
        !s.content.members.some(
          (m) =>
            atomicIds.includes(m.review_member_id) &&
            m.candidate_bindings.some((r) => r.record_ref.record_id === id),
        ),
    )
  )
    mismatch();
  for (const [index, member] of b.members.entries()) {
    const binding = s.content.members[index]!;
    const candidate = member.working_state.candidate;
    if (
      !equal(binding.working_state.candidate_ref, {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      }) ||
      !equal(
        binding.working_state.relationship_refs,
        member.working_state.relationships.map((r) => ({
          working_relationship_id: r.working_relationship_id,
          revision: r.revision,
          content_hash: r.content_hash,
        })),
      )
    )
      mismatch();
    for (const record of [candidate, ...member.working_state.relationships]) {
      const { content_hash, ...projection } = record;
      if (
        record.project_id !== b.project_id ||
        content_hash !== (await hash(projection)) ||
        !equal(record.project_definition_ref, {
          ...s.project_definition_ref,
          definition_family: b.project_definition.definition_family,
        })
      )
        mismatch();
    }
    if (
      atomicIds.includes(member.review_member_id) &&
      binding.candidate_bindings.some(
        (r) =>
          !cs.content.operations.some(
            (op) =>
              op.target_id === r.record_ref.record_id &&
              op.base_revision === r.record_ref.revision,
          ),
      )
    )
      mismatch();
  }
  for (const record of [b.claim, b.assertion]) {
    const id = "claim_id" in record ? record.claim_id : record.assertion_id;
    if (
      !s.content.members.some(
        (m) =>
          atomicIds.includes(m.review_member_id) &&
          m.candidate_bindings.some(
            (r) =>
              r.record_ref.record_id === id &&
              r.record_ref.revision === record.revision,
          ),
      ) ||
      !cs.content.operations.some(
        (op) => op.target_id === id && op.base_revision === record.revision,
      )
    )
      mismatch();
    const recordHash = await hash(record);
    if (
      s.content.members.some((m) =>
        m.candidate_bindings.some(
          (r) =>
            r.record_ref.record_id === id &&
            r.record_ref.record_hash !== recordHash,
        ),
      )
    )
      mismatch();
  }
  return structuredClone(checkpoint);
}

export async function validateReviewApplyResult(
  body: unknown,
  input: PetraReviewSessionApplyRequest,
  contracts = new PetraContractRegistry(),
): Promise<PetraReviewSessionApplyResult> {
  const request = structuredClone(input);
  contracts.assertValid("review-session-apply-result", "1.0.0", body);
  const result = body as PetraReviewSessionApplyResult;
  if (!equal(result.request, request)) mismatch();
  await validateReviewApplyCheckpoint(
    result.request.checkpoint,
    undefined,
    contracts,
  );
  const b = request.checkpoint.binding;
  const cs = b.change_set;
  const hashId = request.checkpoint.displayed_commitment_hash;
  const assessment = await validateReviewRecoveryAssessment(
    result.assessment,
    {
      project_id: b.project_id,
      review_session_id: b.review_session.review_session_id,
      expected_revision: b.review_session.revision,
      expected_content_hash: b.review_session.content_hash,
    },
    contracts,
  );
  const commands = [
    "SubmitChangeSet",
    "RecordApproval",
    "ApplyChangeSet",
  ] as const;
  const approvalCommand = result.steps[1].envelope.command;
  const applyCommand = result.steps[2].envelope.command;
  if (
    approvalCommand.command_name !== "RecordApproval" ||
    applyCommand.command_name !== "ApplyChangeSet"
  )
    return mismatch();
  const approval = approvalCommand.approval;
  if (approval.approval_id !== (await expectedId("approval", hashId)))
    mismatch();
  if (
    !equal(approval.subject, {
      subject_kind: "change_set",
      change_set_id: cs.change_set_id,
      change_set_revision: cs.revision,
      change_set_content_hash: cs.content_hash,
    }) ||
    approval.decision !== "approved" ||
    approval.conditions.length !== 0 ||
    !equal(approval.decided_by, b.authorization_basis.actor) ||
    approval.decided_at !== request.decided_at ||
    approval.rationale !==
      `Authenticated human Apply checkpoint ${hashId} for ReviewSession ${b.review_session.review_session_id} revision ${b.review_session.revision}. ReviewPolicy: not applicable.` ||
    applyCommand.approval_id !== approval.approval_id ||
    applyCommand.approval_revision !== approval.revision ||
    applyCommand.change_set_id !== cs.change_set_id ||
    applyCommand.change_set_revision !== cs.revision ||
    applyCommand.change_set_content_hash !== cs.content_hash
  )
    mismatch();
  let interrupted = false;
  for (const [index, step] of result.steps.entries()) {
    const envelope = step.envelope;
    if (
      envelope.command_id !==
        (await expectedId(
          "command",
          `${hashId}|${["submit", "approval", "apply"][index]}`,
        )) ||
      envelope.correlation_id !== (await expectedId("trace", hashId))
    )
      mismatch();
    if (
      envelope.command.command_name !== commands[index] ||
      envelope.project_id !== b.project_id ||
      !equal(envelope.actor, b.authorization_basis.actor) ||
      envelope.capability_grant_id !== b.capability_grants[commands[index]] ||
      envelope.idempotency_key !== `review-checkpoint:${hashId}:${index}` ||
      envelope.submitted_at !== request.decided_at ||
      (index > 0 &&
        (envelope.causation_id !==
          result.steps[index - 1]!.envelope.command_id ||
          envelope.correlation_id !== result.steps[0].envelope.correlation_id))
    )
      mismatch();
    if (
      envelope.command.command_name === "SubmitChangeSet" &&
      !equal(envelope.command.change_set, cs)
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
    if (
      event.command_id !== envelope.command_id ||
      event.project_id !== b.project_id ||
      event.idempotency_key !== envelope.idempotency_key ||
      event.capability_grant_id !== envelope.capability_grant_id ||
      event.occurred_at !== request.decided_at ||
      !equal(event.actor, envelope.actor)
    )
      mismatch();
    const trace = assessment.content.groups
      .flatMap((g) => g.events)
      .find((e) => e.event_id === event.event_id);
    if (
      trace === undefined ||
      trace.record_hash !== (await hash(event)) ||
      trace.command_id !== envelope.command_id
    )
      mismatch();
    if (success) {
      if (
        index === 0 &&
        (event.event.event_type !== "change_set.submitted" ||
          !equal(event.event.payload.change_set, cs))
      )
        mismatch();
      if (
        index === 1 &&
        (event.event.event_type !== "approval.recorded" ||
          !equal(event.event.payload.approval, approval) ||
          event.event.payload.derived_change_set_state !== "approved")
      )
        mismatch();
      if (index === 2) {
        if (event.event.event_type !== "change_set.applied") return mismatch();
        const p = event.event.payload;
        if (
          p.change_set_id !== cs.change_set_id ||
          p.change_set_revision !== cs.revision ||
          p.change_set_content_hash !== cs.content_hash ||
          p.approval_id !== approval.approval_id ||
          p.approval_revision !== approval.revision ||
          p.claim.claim_id !== b.claim.claim_id ||
          p.claim.revision !== b.claim.revision + 1 ||
          p.prior_claim_revision !== b.claim.revision ||
          p.assertion.assertion_id !== b.assertion.assertion_id ||
          p.assertion.revision !== b.assertion.revision + 1 ||
          p.prior_assertion_revision !== b.assertion.revision
        )
          mismatch();
      }
    }
  }
  if (new Set(result.steps.map((s) => s.envelope.command_id)).size !== 3)
    mismatch();
  const group = assessment.content.groups.find(
    (g) => g.change_set.change_set_id === cs.change_set_id,
  );
  if (
    group !== undefined &&
    (!equal(group.change_set, cs) ||
      !equal(group.member_ids, b.atomic_member_ids) ||
      group.operation_count !== cs.content.operations.length)
  )
    mismatch();
  if (
    result.outcome === "applied" &&
    (interrupted || group?.effect !== "applied" || group.state !== "applied")
  )
    mismatch();
  return structuredClone(result);
}

export class ReviewSessionApplyClientError extends Error {
  constructor(
    readonly status: number,
    readonly response: unknown,
    phase: "prepare" | "apply" = "apply",
  ) {
    super(
      phase === "prepare"
        ? "The exact Apply checkpoint could not be prepared or verified."
        : "The Apply request or observation could not be verified. Effects may exist; reconcile canonical Review status through D020 before another attempt.",
    );
    this.name = "ReviewSessionApplyClientError";
  }
}
export class ReviewSessionApplyClient {
  constructor(
    readonly options: {
      readonly baseUrl: string;
      readonly token: string;
      readonly fetch?: typeof fetch;
    },
  ) {}
  async prepare(
    selection: ReviewApplySelection,
  ): Promise<PetraReviewSessionApplyCheckpoint> {
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
        "Apply preparation requires an exact Project, Review revision and inspection member.",
      );
    selection = structuredClone(selection);
    const url = new URL(
      `/api/queries/projects/${selection.project_id}/reviews/${selection.review_session_id}/apply-checkpoint`,
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
      throw new ReviewSessionApplyClientError(response.status, body, "prepare");
    try {
      return await validateReviewApplyCheckpoint(body, selection);
    } catch {
      throw new ReviewSessionApplyClientError(response.status, body, "prepare");
    }
  }
  async apply(
    input: PetraReviewSessionApplyRequest,
  ): Promise<PetraReviewSessionApplyResult> {
    const request = structuredClone(input);
    new PetraContractRegistry().assertValid(
      "review-session-apply-request",
      "1.0.0",
      request,
    );
    await validateReviewApplyCheckpoint(request.checkpoint);
    const b = request.checkpoint.binding;
    const url = new URL(
      `/api/commands/projects/${b.project_id}/reviews/${b.review_session.review_session_id}/apply`,
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
      if (!response.ok) throw new ReviewSessionApplyClientError(status, body);
      return await validateReviewApplyResult(body, request);
    } catch {
      throw new ReviewSessionApplyClientError(status, body);
    }
  }
}
