import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { ReviewRecoveryAssessmentClientError } from "@petra/adapters";
import type {
  PetraChangeSetRecord,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraReviewRecoveryAssessment,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PetraContractRegistry } from "./browser-contract-registry.js";
import { getReferenceReview } from "./fixtures.js";
import { getReviewRecoveryAssessment } from "./project-data.js";
import {
  createReviewRecoveryRead,
  ReviewRecovery,
  ReviewRecoveryAssessment,
  reviewRecoveryFailure,
  type ReviewRecoveryReadState,
} from "./ReviewRecovery.js";

const load = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
const fixture = load(
  "review-recovery-assessment",
) as PetraReviewRecoveryAssessment;
const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const rehash = (value: PetraReviewRecoveryAssessment): void => {
  value.content.review_session.content_hash = hash(
    value.content.review_session.content,
  );
  value.content.review.session.content_hash =
    value.content.review_session.content_hash;
  value.content_hash = hash(value.content);
  value.assessment_id = `review_recovery_sha256_${value.content_hash.slice(7)}`;
};
const reviewFor = (value = fixture) => ({
  ...getReferenceReview("inlet-cycle", "review-service-link")!,
  id: value.content.review_session.review_session_id,
  projectId: value.project_id,
  exactRef: {
    revision: value.content.review_session.revision,
    contentHash: value.content.review_session.content_hash,
  },
});

// Synthetic presentation evidence only; all production reads use the typed client.
const grouped = (): PetraReviewRecoveryAssessment => {
  const value = structuredClone(fixture);
  const { content } = value;
  const changeSet = load("change-set") as PetraChangeSetRecord;
  const first = content.review_session.content.members[0];
  const peer = structuredClone(first);
  peer.review_member_id = "review_member_01K4F000000000000000000998";
  peer.member_role = "exception";
  content.review_session.content.members.push(peer);
  const peerView = structuredClone(content.review.members[0]);
  peerView.review_member_id = peer.review_member_id;
  peerView.member_role = "exception";
  content.review.members.push(peerView);
  content.freshness.members.push({
    review_member_id: peer.review_member_id,
    working_heads: "current",
  });
  for (const member of content.review.members) {
    member.change_sets = [
      {
        change_set_ref: {
          record_id: changeSet.change_set_id,
          revision: changeSet.revision,
          content_hash: changeSet.content_hash,
        },
        state: "submitted",
        atomicity: "One complete ChangeSet",
        changes: ["Complete pair"],
        protected: ["Retained provenance"],
        impact_summary: changeSet.content.impact.summary,
        commands: [],
        events: [],
      },
    ];
  }
  content.groups = [
    {
      change_set: changeSet,
      record_hash: hash(changeSet),
      state: "submitted",
      member_ids: [first.review_member_id, peer.review_member_id],
      operation_count: 2,
      coverage: "complete",
      member_outcomes: content.review.members.map((member) => ({
        review_member_id: member.review_member_id,
        review_outcome: member.outcome,
      })) as PetraReviewRecoveryAssessment["content"]["groups"][number]["member_outcomes"],
      effect: "unknown",
      effect_basis: "No application observation is available.",
      next_step: "reconcile_status",
      approvals: [],
      commands: [],
      events: [],
    },
  ];
  content.unbound_member_ids = [];
  content.coverage = {
    state: "complete",
    review_members: 2,
    assessed_members: 2,
    atomic_change_sets: 1,
    operations: 2,
  };
  rehash(value);
  return value;
};
const fetchValue = (value: unknown, status = 200) => {
  const transport = vi
    .fn<typeof fetch>()
    .mockImplementation(() =>
      Promise.resolve(Response.json(value, { status })),
    );
  vi.stubGlobal("fetch", transport);
  return transport;
};
afterEach(() => vi.unstubAllGlobals());

describe("complete read-only Review Recovery", () => {
  it("delegates the exact whole Review GET through the browser-validated typed client and repeats only that read", async () => {
    const value = grouped();
    const transport = fetchValue(value);
    const review = {
      ...reviewFor(value),
      reviewMemberId: value.content.groups[0]!.member_ids[1]!,
    };
    expect(await getReviewRecoveryAssessment(review)).toEqual(value);
    expect(await getReviewRecoveryAssessment(review)).toEqual(value);
    expect(transport).toHaveBeenCalledTimes(2);
    const [endpoint, init] = transport.mock.calls[0]!;
    const url = endpoint as URL;
    expect(url.pathname).toBe(
      `/api/queries/projects/${review.projectId}/reviews/${review.id}/recovery-assessment`,
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      expected_revision: String(review.exactRef.revision),
      expected_content_hash: review.exactRef.contentHash,
    });
    expect(init).toEqual({
      method: "GET",
      headers: { authorization: "Bearer petra-local-development" },
    });
    expect(transport.mock.calls[1]).toEqual(transport.mock.calls[0]);
  });

  it.each([401, 403, 409, 422, 503])(
    "fails closed for HTTP %s without automatic retry or fixture fallback",
    async (status) => {
      const transport = fetchValue({ error: "unavailable" }, status);
      await expect(
        getReviewRecoveryAssessment(reviewFor()),
      ).rejects.toMatchObject({ status });
      expect(transport).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    "project",
    "revision",
    "hash",
    "profile",
    "actions",
    "coverage",
    "inventory",
    "freshness",
    "omitted_group",
    "partial_member",
    "partial_operations",
  ])("rejects %s response before presenting an assessment", async (kind) => {
    const value = grouped();
    const review = reviewFor(value);
    const group = value.content.groups[0]!;
    if (kind === "project")
      value.project_id = "project_01K4F000000000000000000999";
    if (kind === "revision") value.content.review_session.revision += 1;
    if (kind === "profile")
      Object.assign(value.content.review.members[0].candidate.profile_payload, {
        profile_kind: "unsupported",
      });
    if (kind === "actions")
      Object.assign(value.content, { actions: [{ command_name: "Retry" }] });
    if (kind === "coverage") value.content.coverage.assessed_members = 1;
    if (kind === "inventory") value.content.preservation.pop();
    if (kind === "freshness") value.content.freshness.members.pop();
    if (kind === "omitted_group") {
      value.content.groups = [];
      value.content.unbound_member_ids = [...group.member_ids];
      value.content.coverage.atomic_change_sets = 0;
      value.content.coverage.operations = 0;
    }
    if (kind === "partial_member") {
      group.member_ids.pop();
      group.member_outcomes.pop();
      value.content.unbound_member_ids = [
        value.content.review.members[1]!.review_member_id,
      ];
    }
    if (kind === "partial_operations") {
      group.change_set.content.operations.pop();
      group.operation_count = 1;
      value.content.coverage.operations = 1;
      group.change_set.content_hash = hash(group.change_set.content);
      group.record_hash = hash(group.change_set);
      value.content.review.members.forEach((member) => {
        member.change_sets[0]!.change_set_ref.content_hash =
          group.change_set.content_hash;
      });
    }
    rehash(value);
    if (kind === "hash") value.content_hash = `sha256:${"f".repeat(64)}`;
    fetchValue(value);
    await expect(getReviewRecoveryAssessment(review)).rejects.toThrow();
  });

  it("compiles the exact recovery schema closure in the browser bundle", () => {
    const registry = new PetraContractRegistry();
    registry.assertValid("review-recovery-assessment", "1.0.0", grouped());
    expect(() =>
      registry.assertValid("review-recovery-assessment", "1.0.0", {
        ...fixture,
        actions: [],
      }),
    ).toThrow();
  });

  it("keeps every shared member, all operations, and all preservation categories in the textual peer", async () => {
    const value = grouped();
    fetchValue(value);
    const accepted = await getReviewRecoveryAssessment(reviewFor(value));
    const markup = renderToStaticMarkup(
      <ReviewRecoveryAssessment assessment={accepted} />,
    );
    expect(markup).toContain("1 complete atomic ChangeSets");
    for (const member of value.content.review.members)
      expect(markup).toContain(member.review_member_id);
    for (const operation of value.content.groups[0]!.change_set.content
      .operations)
      expect(markup).toContain(operation.target_id);
    for (const item of value.content.preservation)
      expect(markup).toContain(item.kind.replaceAll("_", " "));
    expect(markup).toContain("Outcome unknown");
    expect(markup).toContain("Review outcome:");
    expect(markup).toContain("No recovery execution is offered");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("data-operation");
  });

  it.each([
    ["applied", "applied", "inspect", "Application effect confirmed"],
    ["rejected", "unknown", "inspect", "Outcome unknown"],
    ["conflicted", "no_effect", "refresh_or_revise", "No effect confirmed"],
    ["waiting", "unknown", "reconcile_status", "Outcome unknown"],
  ] as const)(
    "presents %s separately from effect and never turns an explanation into retry",
    (outcome, effect, next, text) => {
      const value = grouped();
      const group = value.content.groups[0]!;
      group.effect = effect;
      group.next_step = next;
      group.member_outcomes.forEach((member) => {
        member.review_outcome = outcome;
      });
      value.content.review.members.forEach((member) => {
        member.outcome = outcome;
      });
      const markup = renderToStaticMarkup(
        <ReviewRecoveryAssessment assessment={value} />,
      );
      expect(markup).toContain(text);
      expect(markup).toContain(outcome);
      expect(markup).toContain("grants no execution permission");
      expect(markup).not.toContain("<button");
    },
  );

  it("retains independent outcomes alongside a complete shared ChangeSet and an unbound rejection", async () => {
    const value = grouped();
    const { content } = value;
    const independent = structuredClone(content.groups[0]!);
    independent.change_set.change_set_id =
      "change_set_01K4F000000000000000000991";
    independent.change_set.content.operations.forEach((operation) => {
      operation.target_id = operation.target_id.slice(0, -3) + "991";
    });
    independent.change_set.content_hash = hash(independent.change_set.content);
    independent.record_hash = hash(independent.change_set);
    independent.effect = "no_effect";
    independent.state = "conflicted";
    independent.next_step = "refresh_or_revise";
    independent.effect_basis =
      "The canonical owning conflict reports non-application for this attempt.";
    independent.member_ids = ["review_member_01K4F000000000000000000991"];
    independent.member_outcomes = [
      {
        review_member_id: independent.member_ids[0],
        review_outcome: "conflicted",
      },
    ];
    const member = structuredClone(content.review_session.content.members[0]);
    member.review_member_id = independent.member_ids[0]!;
    member.candidate_bindings.forEach((binding) => {
      binding.record_ref.record_id =
        binding.record_ref.record_id.slice(0, -3) + "991";
    });
    content.review_session.content.members.push(member);
    const view = structuredClone(content.review.members[0]);
    view.review_member_id = member.review_member_id;
    view.outcome = "conflicted";
    view.change_sets[0]!.change_set_ref.record_id =
      independent.change_set.change_set_id;
    view.change_sets[0]!.change_set_ref.content_hash =
      independent.change_set.content_hash;
    view.change_sets[0]!.state = "conflicted";
    content.review.members.push(view);
    content.groups.push(independent);
    content.freshness.members.push({
      review_member_id: member.review_member_id,
      working_heads: "superseded",
    });
    const unbound = structuredClone(member);
    unbound.review_member_id = "review_member_01K4F000000000000000000992";
    unbound.candidate_bindings.forEach((binding) => {
      binding.record_ref.record_id =
        binding.record_ref.record_id.slice(0, -3) + "992";
    });
    content.review_session.content.members.push(unbound);
    const unboundView = structuredClone(view);
    unboundView.review_member_id = unbound.review_member_id;
    unboundView.outcome = "rejected";
    unboundView.change_sets = [];
    content.review.members.push(unboundView);
    content.unbound_member_ids = [unbound.review_member_id];
    content.freshness.members.push({
      review_member_id: unbound.review_member_id,
      working_heads: "current",
    });
    content.coverage = {
      state: "complete",
      review_members: 4,
      assessed_members: 4,
      atomic_change_sets: 2,
      operations: 4,
    };
    rehash(value);
    fetchValue(value);
    const accepted = await getReviewRecoveryAssessment(reviewFor(value));
    const markup = renderToStaticMarkup(
      <ReviewRecoveryAssessment assessment={accepted} />,
    );
    expect(markup).toContain("4 of 4 Review members assessed");
    expect(markup).toContain("Outcome unknown");
    expect(markup).toContain("No effect confirmed");
    expect(markup).toContain("rejected");
    expect(markup).toContain("superseded");
    expect(markup).not.toContain("<button");
  });

  it("preserves History's compensation observations without offering execution", () => {
    const value = grouped();
    const history = load(
      "project-history-recovery-assessment-view",
    ) as PetraProjectHistoryRecoveryAssessmentView;
    value.content.groups[0]!.history_assessment = {
      event_id: history.event_id,
      content_hash: history.content_hash,
      content: history.content,
    };
    const markup = renderToStaticMarkup(
      <ReviewRecoveryAssessment assessment={value} />,
    );
    expect(markup).toContain(
      "History owns compensation eligibility and grant checks",
    );
    expect(markup).toContain(history.event_id);
    expect(markup).toContain(history.content_hash);
    expect(markup).toContain(
      "This read offers no Revert or compensation execution",
    );
    expect(markup).not.toContain("<button");
  });

  it("names unbound members without inferring an effect", () => {
    const markup = renderToStaticMarkup(
      <ReviewRecoveryAssessment assessment={fixture} />,
    );
    expect(markup).toContain("Members without a ChangeSet");
    expect(markup).toContain(fixture.content.unbound_member_ids[0]);
    expect(markup).toContain("no effect is inferred");
  });

  it("provides native keyboard disclosure, a named read button, textual state, and focusable live notice", () => {
    const markup = renderToStaticMarkup(
      <ReviewRecovery review={reviewFor()} disabled={false} />,
    );
    expect(markup).toContain("<summary>Recovery</summary>");
    expect(markup).toContain("Check status");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain(fixture.content.review_session.content_hash);
    expect(markup).not.toContain(fixture.assessment_id);
    const css = readFileSync(
      new URL("./review-graph.css", import.meta.url),
      "utf8",
    );
    expect(css).toContain(".review-recovery summary:focus-visible");
    expect(css).toContain("min-block-size: 44px");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("coalesces pending reads, clears prior results on reread, and drops late results after invalidation", async () => {
    let resolve!: (value: PetraReviewRecoveryAssessment) => void;
    const read = vi.fn(
      () =>
        new Promise<PetraReviewRecoveryAssessment>((done) => {
          resolve = done;
        }),
    );
    const states: ReviewRecoveryReadState[] = [];
    const reader = createReviewRecoveryRead(read, (state) =>
      states.push(state),
    );
    const first = reader.check();
    await reader.check();
    expect(read).toHaveBeenCalledTimes(1);
    resolve(fixture);
    await first;
    expect(states.at(-1)?.kind).toBe("ready");
    const second = reader.check();
    expect(states.at(-1)).toEqual({ kind: "pending" });
    reader.invalidate();
    resolve(fixture);
    await second;
    expect(states.at(-1)).toEqual({ kind: "pending" });
  });

  it("removes a successful assessment after authorization fails on another read", async () => {
    const read = vi
      .fn<() => Promise<PetraReviewRecoveryAssessment>>()
      .mockResolvedValueOnce(fixture)
      .mockRejectedValueOnce(new ReviewRecoveryAssessmentClientError(403, {}));
    const states: ReviewRecoveryReadState[] = [];
    const reader = createReviewRecoveryRead(read, (state) =>
      states.push(state),
    );
    await reader.check();
    await reader.check();
    expect(states.map((state) => state.kind)).toEqual([
      "pending",
      "ready",
      "pending",
      "failed",
    ]);
    expect(states.at(-1)).toEqual({
      kind: "failed",
      message:
        "Recovery assessment was not authorized. No assessment is shown.",
    });
    expect(
      reviewRecoveryFailure(new ReviewRecoveryAssessmentClientError(409, {})),
    ).toContain("Reload this Review");
    expect(reviewRecoveryFailure(new Error("network"))).toContain(
      "No effect or recovery permission",
    );
  });
});
