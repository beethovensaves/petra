import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { buildReviewApplyPlan } from "@petra/core";
import {
  validateReviewApplyCheckpoint,
  validateReviewApplyResult,
} from "@petra/adapters";
import type {
  PetraReviewSessionApplyCheckpoint,
  PetraReviewSessionApplyRequest,
  PetraReviewSessionApplyResult,
  PetraReviewRecoveryAssessment,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import resultJson from "./review-apply-result.fixture.json";
import checkpointJson from "./review-apply-checkpoint.fixture.json";
import { PetraContractRegistry } from "./browser-contract-registry.js";
import { getReferenceReview } from "./fixtures.js";
import { prepareReviewApply, executeReviewApply } from "./project-data.js";
import {
  createReviewApplyController,
  ReviewApplyNotice,
  ReviewApplyPreview,
  type ReviewApplyState,
} from "./ReviewApply.js";

const checkpoint =
  checkpointJson as unknown as PetraReviewSessionApplyCheckpoint;
const b = checkpoint.binding;
const review = {
  ...getReferenceReview("inlet-cycle", "review-service-link")!,
  projectId: b.project_id,
  id: b.review_session.review_session_id,
  reviewMemberId: b.selected_review_member_id,
  exactRef: {
    revision: b.review_session.revision,
    contentHash: b.review_session.content_hash,
  },
};
const request: PetraReviewSessionApplyRequest = {
  schema_name: "petra.review-session-apply-request",
  schema_version: "1.0.0",
  checkpoint,
  decided_at: "2026-09-13T05:00:00.000Z",
};
const hash = (v: unknown) =>
  `sha256:${createHash("sha256").update(canonicalize(v)).digest("hex")}`;
const retained = (): PetraReviewSessionApplyResult => {
  const assessment = JSON.parse(
    readFileSync(
      new URL(
        "../../../../packages/contracts/fixtures/accepted/review-recovery-assessment.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraReviewRecoveryAssessment;
  const plan = buildReviewApplyPlan(request);
  return {
    schema_name: "petra.review-session-apply-result",
    schema_version: "1.0.0",
    request: structuredClone(request),
    outcome: "reconciliation_required",
    steps: [plan.submit, plan.review, plan.apply!].map((envelope) => ({
      envelope,
      observation: "unattempted",
    })) as PetraReviewSessionApplyResult["steps"],
    assessment,
  };
};
afterEach(() => vi.unstubAllGlobals());

describe("manual frozen Apply checkpoint", () => {
  it("validates canonical success, retains its History and projection lag, and reports reload failure separately", async () => {
    const result = resultJson as unknown as PetraReviewSessionApplyResult;
    await validateReviewApplyResult(result, request);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(checkpoint))
      .mockResolvedValueOnce(Response.json(result));
    vi.stubGlobal("fetch", fetch);
    const states: ReviewApplyState[] = [];
    const reload = vi.fn().mockRejectedValue(new Error("reload denied"));
    const controller = createReviewApplyController(
      (s) => states.push(s),
      reload,
      undefined,
      () => request.decided_at,
    );
    await controller.prepare(review);
    await controller.apply(review);
    expect(states.at(-1)).toMatchObject({
      kind: "result",
      result,
      reloadFailed: true,
    });
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ReviewApplyNotice state={states.at(-1)!} />
      </MemoryRouter>,
    );
    expect(markup).toContain("Applied—updating views");
    expect(markup).toContain("This does not mean every Review member applied");
    expect(markup).toContain("authorized Review reload failed");
    for (const step of result.steps)
      expect(markup).toContain(`<code>${step.event!.event_id}</code>`);
    expect(markup).not.toContain("/history/");
    expect(markup).not.toContain("Retry");
  });
  it("retains every independent outcome without aggregate success or recovery execution", () => {
    const result = structuredClone(
      resultJson,
    ) as unknown as PetraReviewSessionApplyResult;
    // Presentation-only variants; authority validation is exercised on the exact fixture above.
    result.assessment.content.review.members = [
      "applied",
      "rejected",
      "conflicted",
      "awaiting_decision",
      "waiting",
    ].map((outcome, i) => ({
      ...result.assessment.content.review.members[0],
      review_member_id: `member-${i}`,
      outcome,
    })) as typeof result.assessment.content.review.members;
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ReviewApplyNotice
          state={{ kind: "result", result, reloadFailed: false }}
        />
      </MemoryRouter>,
    );
    for (const outcome of [
      "applied",
      "rejected",
      "conflicted",
      "awaiting decision",
      "waiting",
    ])
      expect(markup).toContain(`Review outcome: ${outcome}`);
    expect(markup).toContain("No recovery execution is offered");
  });
  it.each([401, 403, 409, 500, "network"])(
    "requires reconciliation after Apply observation failure %s",
    async (status) => {
      const transport = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(Response.json(checkpoint));
      if (status === "network")
        transport.mockRejectedValueOnce(new Error("lost response"));
      else
        transport.mockResolvedValueOnce(
          Response.json({}, { status: Number(status) }),
        );
      vi.stubGlobal("fetch", transport);
      const states: ReviewApplyState[] = [];
      const reload = vi.fn();
      const controller = createReviewApplyController(
        (s) => states.push(s),
        reload,
      );
      await controller.prepare(review);
      await controller.apply(review);
      await controller.apply(review);
      expect(states.at(-1)?.kind).toBe("uncertain");
      expect(transport).toHaveBeenCalledTimes(2);
      expect(reload).not.toHaveBeenCalled();
    },
  );
  it("requires every member sharing the complete ChangeSet", async () => {
    const value = structuredClone(checkpoint);
    const peerId = "review_member_01K4D000000000000000000099";
    const session = value.binding.review_session;
    session.content.members.push({
      ...structuredClone(session.content.members[0]),
      review_member_id: peerId,
      member_role: "exception",
    });
    value.binding.members.push({
      ...structuredClone(value.binding.members[0]),
      review_member_id: peerId,
    });
    value.binding.atomic_member_ids.push(peerId);
    session.content_hash = hash(session.content);
    value.displayed_commitment_hash = hash(value.binding);
    await validateReviewApplyCheckpoint(value);
    const markup = renderToStaticMarkup(
      <ReviewApplyPreview checkpoint={value} />,
    );
    expect(markup).toContain(peerId);
    expect(markup).toContain("2 members");
    value.binding.atomic_member_ids.pop();
    value.displayed_commitment_hash = hash(value.binding);
    await expect(validateReviewApplyCheckpoint(value)).rejects.toThrow();
  });
  it("preserves a verified retained prefix and each failed or uncertain step without retry", async () => {
    const result = structuredClone(
      resultJson,
    ) as unknown as PetraReviewSessionApplyResult;
    result.outcome = "reconciliation_required";
    result.steps[0].observation = "replayed";
    result.steps[1].observation = "failed";
    result.steps[1].error_code = "REVIEW_APPLY_DENIED";
    delete result.steps[1].event;
    result.steps[2].observation = "unattempted";
    delete result.steps[2].event;
    await validateReviewApplyResult(result, request);
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <ReviewApplyNotice
          state={{ kind: "result", result, reloadFailed: false }}
        />
      </MemoryRouter>,
    );
    for (const text of [
      "replayed",
      "failed",
      "unattempted",
      "REVIEW_APPLY_DENIED",
    ])
      expect(markup).toContain(text);
    result.steps[1].observation = "unverified";
    await validateReviewApplyResult(result, request);
    expect(
      renderToStaticMarkup(
        <MemoryRouter>
          <ReviewApplyNotice
            state={{ kind: "result", result, reloadFailed: false }}
          />
        </MemoryRouter>,
      ),
    ).toContain("unverified");
  });
  it("validates the complete browser checkpoint and sends exact authenticated preparation without a decision", async () => {
    new PetraContractRegistry().assertValid(
      "review-session-apply-checkpoint",
      "1.0.0",
      checkpoint,
    );
    await validateReviewApplyCheckpoint(checkpoint);
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(checkpoint));
    vi.stubGlobal("fetch", fetch);
    expect(await prepareReviewApply(review)).toEqual(checkpoint);
    const [url, options] = fetch.mock.calls[0]!;
    expect(url instanceof Request ? url.url : url.toString()).toContain(
      `/reviews/${review.id}/apply-checkpoint`,
    );
    expect(url instanceof Request ? url.url : url.toString()).toContain(
      `selected_review_member_id=${review.reviewMemberId}`,
    );
    expect(new Headers(options?.headers).get("authorization")).toContain(
      "Bearer ",
    );
    expect(options?.body).toBeUndefined();
  });
  it("submits the complete decision and validates a retained reconciliation result", async () => {
    const result = retained();
    await validateReviewApplyResult(result, request);
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(result));
    vi.stubGlobal("fetch", fetch);
    expect(await executeReviewApply(request)).toEqual(result);
    const body = fetch.mock.calls[0]![1]?.body;
    if (typeof body !== "string")
      throw new Error("Expected JSON request text.");
    expect(JSON.parse(body)).toEqual(request);
    expect(fetch.mock.calls[0]![1]?.method).toBe("POST");
  });
  it.each([401, 403, 409, 422, 500])(
    "leaves preparation unavailable on status %s without sending Apply",
    async (status) => {
      const fetch = vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "REVIEW_APPLY_UNSUPPORTED" } },
            { status },
          ),
        );
      vi.stubGlobal("fetch", fetch);
      const states: ReviewApplyState[] = [];
      const c = createReviewApplyController((s) => states.push(s), vi.fn());
      await c.prepare(review);
      await c.apply(review);
      expect(states.at(-1)?.kind).toBe("unavailable");
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["hash", "member", "policy", "manifest"])(
    "rejects a mismatched %s checkpoint",
    async (kind) => {
      const value = structuredClone(checkpoint);
      if (kind === "hash")
        value.displayed_commitment_hash = `sha256:${"0".repeat(64)}`;
      if (kind === "member")
        value.binding.selected_review_member_id =
          "review_member_01K4D000000000000000000099";
      if (kind === "policy")
        Object.assign(value.binding.review_policy, { policy_id: "invented" });
      if (kind === "manifest")
        value.binding.atomic_member_ids =
          [] as unknown as typeof value.binding.atomic_member_ids;
      if (kind !== "hash")
        value.displayed_commitment_hash = hash(value.binding);
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof globalThis.fetch>()
          .mockResolvedValue(Response.json(value)),
      );
      await expect(prepareReviewApply(review)).rejects.toThrow();
    },
  );
  it("does not substitute an altered result or turn transport failure into no effect", async () => {
    const result = retained();
    result.request.decided_at = "2026-09-13T06:00:00.000Z";
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(checkpoint))
      .mockResolvedValueOnce(Response.json(result));
    vi.stubGlobal("fetch", fetch);
    const states: ReviewApplyState[] = [];
    const reload = vi.fn();
    const c = createReviewApplyController(
      (s) => states.push(s),
      reload,
      undefined,
      () => request.decided_at,
    );
    await c.prepare(review);
    await c.apply(review);
    await c.apply(review);
    await c.prepare(review);
    expect(states.at(-1)?.kind).toBe("uncertain");
    expect(reload).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(2);
    const markup = renderToStaticMarkup(
      <ReviewApplyNotice state={states.at(-1)!} />,
    );
    expect(markup).toContain("Effects may exist");
    expect(markup).not.toContain("Retry");
  });
  it("captures one decision, suppresses double clicks, reloads after validation, and retains incomplete observations", async () => {
    const result = retained();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(checkpoint))
      .mockResolvedValueOnce(Response.json(result));
    vi.stubGlobal("fetch", fetch);
    const states: ReviewApplyState[] = [];
    const reload = vi.fn();
    const c = createReviewApplyController(
      (s) => states.push(s),
      reload,
      undefined,
      () => request.decided_at,
    );
    await c.prepare(review);
    expect(fetch).toHaveBeenCalledTimes(1);
    await Promise.all([c.apply(review), c.apply(review)]);
    c.invalidatePreparation();
    await c.apply(review);
    await c.prepare(review);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(states.at(-1)?.kind).toBe("result");
    const markup = renderToStaticMarkup(
      <ReviewApplyNotice state={states.at(-1)!} />,
    );
    expect(markup).toContain("Reconciliation required");
    expect(markup.match(/unattempted/g)).toHaveLength(3);
    expect(markup).not.toContain("Retry");
  });
  it("discards late preparation and refuses a changed inspection identity", async () => {
    let resolve!: (value: PetraReviewSessionApplyCheckpoint) => void;
    const prepare = vi.fn(
      () =>
        new Promise<PetraReviewSessionApplyCheckpoint>((done) => {
          resolve = done;
        }),
    );
    const apply = vi.fn();
    const states: ReviewApplyState[] = [];
    const c = createReviewApplyController((s) => states.push(s), vi.fn(), {
      prepare,
      apply,
    });
    const pending = c.prepare(review);
    c.invalidatePreparation();
    resolve(checkpoint);
    await pending;
    expect(states.at(-1)?.kind).toBe("idle");
    await c.apply(review);
    expect(apply).not.toHaveBeenCalled();
    const next = c.prepare(review);
    resolve(checkpoint);
    await next;
    await c.apply({ ...review, exactRef: { ...review.exactRef, revision: 2 } });
    expect(apply).not.toHaveBeenCalled();
  });
  it("exposes the complete textual manifest, exact commitment, validation and one human decision basis", () => {
    const markup = renderToStaticMarkup(
      <ReviewApplyPreview checkpoint={checkpoint} />,
    );
    for (const id of b.atomic_member_ids) expect(markup).toContain(id);
    for (const op of b.change_set.content.operations)
      expect(markup).toContain(op.target_id);
    expect(markup).toContain(checkpoint.displayed_commitment_hash);
    expect(markup).toContain("Before");
    expect(markup).toContain("After");
    expect(markup).toContain("ReviewPolicy: not applicable");
    expect(markup).toContain("Material validation");
    expect(markup).not.toContain("<button");
  });
});
