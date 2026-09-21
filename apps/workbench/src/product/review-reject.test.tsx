import type {
  PetraReviewSessionApplyCheckpoint,
  PetraReviewSessionApplyResult,
  PetraReviewSessionRejectCheckpoint,
  PetraReviewSessionRejectRequest,
  PetraReviewSessionRejectResult,
} from "@petra/contracts";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import applyCheckpointJson from "./review-apply-checkpoint.fixture.json";
import applyResultJson from "./review-apply-result.fixture.json";
import type { ReviewSession } from "./model.js";
import { PetraContractRegistry } from "./browser-contract-registry.js";
import { prepareReviewReject } from "./project-data.js";
import {
  ReviewRejectNotice,
  ReviewRejectPreview,
  createReviewRejectController,
  type ReviewRejectState,
} from "./ReviewReject.js";

const applyCheckpoint =
  applyCheckpointJson as unknown as PetraReviewSessionApplyCheckpoint;
const review: ReviewSession = {
  id: applyCheckpoint.binding.review_session.review_session_id,
  projectId: applyCheckpoint.binding.project_id,
  reviewMemberId: applyCheckpoint.binding.selected_review_member_id,
  exactRef: {
    revision: applyCheckpoint.binding.review_session.revision,
    contentHash: applyCheckpoint.binding.review_session.content_hash,
  },
  title: "Review the source-grounded working candidate",
  objective: "Decide the exact candidate.",
  status: "needs_decision",
  statusLabel: "Needs your decision",
  lifecycle: "open",
  responsible: "Project author",
  snapshot: "Snapshot 42",
  snapshotState: "current",
  returnLabel: "Extract supported claims",
  returnPath:
    "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
  candidate: {
    id: "candidate",
    revision: "Candidate revision 1",
    kind: "Claim candidate",
    current: "No accepted Claim",
    proposed: "The exact working Claim.",
    difference: "Creates the Claim.",
    origin: "Work result",
    originDetail: "Exact retained Work result.",
  },
  basis: [],
  qualifications: [],
  validation: {
    state: "passed",
    label: "Applicable checks passed",
    detail: "The exact working records passed the applicable checks.",
  },
  consequences: [],
  commitment: { available: true },
};

const hash = (value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const checkpoint = (): PetraReviewSessionRejectCheckpoint => {
  const binding: PetraReviewSessionRejectCheckpoint["binding"] = {
    project_id: applyCheckpoint.binding.project_id,
    review_session: structuredClone(applyCheckpoint.binding.review_session),
    selected_review_member: structuredClone(applyCheckpoint.binding.members[0]),
    atomic_member_ids: structuredClone(
      applyCheckpoint.binding.atomic_member_ids,
    ),
    change_set: structuredClone(applyCheckpoint.binding.change_set),
    prepared_at: applyCheckpoint.binding.prepared_at,
    authorization_basis: {
      kind: "authenticated_human_checkpoint",
      decision: "reject",
      actor: structuredClone(applyCheckpoint.binding.authorization_basis.actor),
    },
    capability_grants: {
      SubmitChangeSet:
        applyCheckpoint.binding.capability_grants.SubmitChangeSet,
      RecordApproval: applyCheckpoint.binding.capability_grants.RecordApproval,
    },
    scope: "one_complete_change_set",
    consequences: structuredClone(applyCheckpoint.binding.consequences),
  };
  return {
    schema_name: "petra.review-session-reject-checkpoint",
    schema_version: "1.0.0",
    binding,
    displayed_commitment_hash: hash(binding),
  };
};

const result = (
  exactCheckpoint: PetraReviewSessionRejectCheckpoint,
): PetraReviewSessionRejectResult => {
  const source = structuredClone(
    applyResultJson,
  ) as unknown as PetraReviewSessionApplyResult;
  for (const member of source.assessment.content.review.members)
    member.outcome = "rejected";
  for (const group of source.assessment.content.groups) {
    group.state = "rejected";
    group.effect = "unknown";
    group.effect_basis =
      "D020 keeps a rejected Review outcome separate from command-effect knowledge.";
    group.next_step = "inspect";
    for (const member of group.member_outcomes)
      member.review_outcome = "rejected";
  }
  const request: PetraReviewSessionRejectRequest = {
    schema_name: "petra.review-session-reject-request",
    schema_version: "1.0.0",
    checkpoint: structuredClone(exactCheckpoint),
    rationale: "The source basis does not support the proposed scope.",
    decided_at: "2026-09-19T15:00:00.000Z",
  };
  return {
    schema_name: "petra.review-session-reject-result",
    schema_version: "1.0.0",
    request,
    outcome: "rejected",
    steps: structuredClone(
      source.steps.slice(0, 2),
    ) as unknown as PetraReviewSessionRejectResult["steps"],
    assessment: source.assessment,
  };
};

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

afterEach(() => vi.unstubAllGlobals());

describe("manual Review rejection", () => {
  it("bundles the exact rejection checkpoint and request contracts", () => {
    const exactCheckpoint = checkpoint();
    const registry = new PetraContractRegistry();
    registry.assertValid(
      "review-session-reject-checkpoint",
      "1.0.0",
      exactCheckpoint,
    );
    registry.assertValid("review-session-reject-request", "1.0.0", {
      schema_name: "petra.review-session-reject-request",
      schema_version: "1.0.0",
      checkpoint: exactCheckpoint,
      rationale: "The source basis does not support the proposed scope.",
      decided_at: "2026-09-19T15:00:00.000Z",
    });
  });

  it("prepares through the authenticated production rejection client without sending a decision", async () => {
    const exactCheckpoint = checkpoint();
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(exactCheckpoint));
    vi.stubGlobal("fetch", fetch);
    await expect(prepareReviewReject(review)).resolves.toEqual(exactCheckpoint);
    const [url, options] = fetch.mock.calls[0]!;
    const exactUrl =
      typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    expect(exactUrl).toContain(`/reviews/${review.id}/reject-checkpoint`);
    expect(exactUrl).toContain(
      `selected_review_member_id=${review.reviewMemberId}`,
    );
    expect(new Headers(options?.headers).get("authorization")).toContain(
      "Bearer ",
    );
    expect(options?.body).toBeUndefined();
  });

  it("presents the complete server-supplied boundary without inferring no effect", () => {
    const exactCheckpoint = checkpoint();
    const markup = render(<ReviewRejectPreview checkpoint={exactCheckpoint} />);
    expect(markup).toContain("One complete atomic ChangeSet");
    expect(markup).toContain(
      exactCheckpoint.binding.selected_review_member.review_member_id,
    );
    expect(markup).toContain(exactCheckpoint.binding.change_set.change_set_id);
    for (const consequence of exactCheckpoint.binding.consequences)
      expect(markup).toContain(consequence);
    expect(markup).toContain("does not apply the candidate");
    expect(markup).toContain("establish that no effect exists");
  });

  it("records one exact human rationale and suppresses duplicate decisions", async () => {
    const exactCheckpoint = checkpoint();
    const exactResult = result(exactCheckpoint);
    const prepare = vi.fn().mockResolvedValue(exactCheckpoint);
    const reject = vi.fn().mockResolvedValue(exactResult);
    const reload = vi.fn();
    const states: ReviewRejectState[] = [];
    const controller = createReviewRejectController(
      (state) => states.push(state),
      reload,
      { prepare, reject },
      () => exactResult.request.decided_at,
    );

    await controller.prepare(review);
    await Promise.all([
      controller.reject(
        review,
        "  The source basis does not support the proposed scope.  ",
      ),
      controller.reject(review, "A second decision must not be sent."),
    ]);

    expect(prepare).toHaveBeenCalledTimes(1);
    expect(reject).toHaveBeenCalledTimes(1);
    expect(reject.mock.calls[0]![0]).toEqual(exactResult.request);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(states.at(-1)).toMatchObject({
      kind: "result",
      result: exactResult,
      reloadFailed: false,
    });
  });

  it("renders rationale, progress, rejected members, unknown effect, and exact return", () => {
    const exactResult = result(checkpoint());
    const markup = render(
      <ReviewRejectNotice
        review={review}
        state={{ kind: "result", result: exactResult, reloadFailed: false }}
      />,
    );
    for (const text of [
      "The displayed ChangeSet was rejected",
      "The source basis does not support the proposed scope",
      "Retained rejection progress",
      "Review outcome: rejected",
      "Effect: Outcome unknown",
      "D020 keeps a rejected Review outcome separate",
      "Exact return",
      "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
      "Return to Extract supported claims",
    ])
      expect(markup).toContain(text);
    expect(markup).not.toContain("Effect: No effect confirmed");
  });

  it("keeps an unverified command locked for reconciliation without retry", async () => {
    const exactCheckpoint = checkpoint();
    const reject = vi.fn().mockRejectedValue(new Error("connection lost"));
    const states: ReviewRejectState[] = [];
    const controller = createReviewRejectController(
      (state) => states.push(state),
      vi.fn(),
      {
        prepare: vi.fn().mockResolvedValue(exactCheckpoint),
        reject,
      },
    );
    await controller.prepare(review);
    await controller.reject(review, "The exact basis is insufficient.");
    await controller.reject(review, "Do not retry an unknown outcome.");
    expect(states.at(-1)?.kind).toBe("uncertain");
    expect(reject).toHaveBeenCalledTimes(1);
    expect(
      render(<ReviewRejectNotice review={review} state={states.at(-1)!} />),
    ).toContain("Effects may exist");
  });
});
