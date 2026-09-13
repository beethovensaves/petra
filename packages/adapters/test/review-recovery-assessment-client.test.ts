import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type {
  PetraChangeSetRecord,
  PetraReviewRecoveryAssessment,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";
import { ReviewRecoveryAssessmentClient } from "../src/review-recovery-assessment-client.js";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/review-recovery-assessment.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraReviewRecoveryAssessment;
const request = {
  project_id: fixture.project_id,
  review_session_id: fixture.content.review_session.review_session_id,
  expected_revision: fixture.content.review_session.revision,
  expected_content_hash: fixture.content.review_session.content_hash,
};
const rehash = (value: PetraReviewRecoveryAssessment) => {
  value.content_hash = `sha256:${createHash("sha256").update(canonicalize(value.content)).digest("hex")}`;
  value.assessment_id = `review_recovery_sha256_${value.content_hash.slice(7)}`;
};
describe("Review recovery query client", () => {
  it("uses the same authenticated exact GET for direct and model-mediated callers", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(fixture)));
    const client = new ReviewRecoveryAssessmentClient({
      baseUrl: "http://petra.local",
      token: "token",
      fetch: transport,
    });
    expect(await client.assess(request)).toEqual(await client.assess(request));
    expect(transport.mock.calls[0]?.[1]).toEqual({
      method: "GET",
      headers: { authorization: "Bearer token" },
    });
    expect((transport.mock.calls[0]?.[0] as URL).href).toContain(
      "/recovery-assessment?expected_revision=1&expected_content_hash=sha256%3A",
    );
  });
  it.each(["project", "hash", "counts", "coverage", "action", "member"])(
    "rejects %s mismatch even when content is rehashed",
    async (kind) => {
      const value = structuredClone(fixture);
      if (kind === "project")
        value.project_id = "project_01K4F000000000000000000999";
      if (kind === "counts") value.content.coverage.assessed_members = 0;
      if (kind === "coverage") value.content.unbound_member_ids = [];
      if (kind === "member")
        value.content.review.members[0].review_member_id =
          "review_member_01K4F000000000000000000999";
      if (kind === "action")
        Object.assign(value.content, {
          actions: [{ command_name: "ApplyChangeSet" }],
        });
      rehash(value);
      if (kind === "hash") value.content_hash = `sha256:${"f".repeat(64)}`;
      const client = new ReviewRecoveryAssessmentClient({
        baseUrl: "http://petra.local",
        token: "token",
        fetch: () => Promise.resolve(Response.json(value)),
      });
      await expect(client.assess(request)).rejects.toThrow();
    },
  );
  it("rejects an omitted ChangeSet and a truncated atomic operation list even with matching hashes and counts", async () => {
    const value = structuredClone(fixture);
    const changeSet = JSON.parse(
      readFileSync(
        new URL(
          "../../contracts/fixtures/accepted/change-set.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraChangeSetRecord;
    const canonicalHash = (v: unknown) =>
      `sha256:${createHash("sha256").update(canonicalize(v)).digest("hex")}`;
    const id = value.content.review_session.content.members[0].review_member_id;
    value.content.review.members[0].change_sets = [
      {
        change_set_ref: {
          record_id: changeSet.change_set_id,
          revision: changeSet.revision,
          content_hash: changeSet.content_hash,
        },
        state: "submitted",
        atomicity: "One complete ChangeSet",
        changes: ["Claim and ASSERTS pair"],
        protected: ["Retained provenance"],
        impact_summary: changeSet.content.impact.summary,
        commands: [],
        events: [],
      },
    ];
    value.content.groups = [
      {
        change_set: changeSet,
        record_hash: canonicalHash(changeSet),
        state: "submitted",
        member_ids: [id],
        operation_count: 2,
        coverage: "complete",
        member_outcomes: [
          {
            review_member_id: id,
            review_outcome: value.content.review.members[0].outcome,
          },
        ],
        effect: "unknown",
        effect_basis: "No application observation in this client fixture.",
        next_step: "reconcile_status",
        approvals: [],
        commands: [],
        events: [],
      },
    ];
    value.content.unbound_member_ids = [];
    value.content.coverage.atomic_change_sets = 1;
    value.content.coverage.operations = 2;
    rehash(value);
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(value)));
    const client = new ReviewRecoveryAssessmentClient({
      baseUrl: "http://petra.local",
      token: "token",
      fetch: transport,
    });
    await expect(client.assess(request)).resolves.toMatchObject({
      content: { coverage: { operations: 2 } },
    });
    const omitted = structuredClone(value);
    omitted.content.groups = [];
    omitted.content.unbound_member_ids = [id];
    omitted.content.coverage.atomic_change_sets = 0;
    omitted.content.coverage.operations = 0;
    rehash(omitted);
    transport.mockImplementationOnce(() =>
      Promise.resolve(Response.json(omitted)),
    );
    await expect(client.assess(request)).rejects.toThrow();
    const group = value.content.groups[0]!;
    group.change_set.content.operations.splice(1, 1);
    group.change_set.content_hash = canonicalHash(group.change_set.content);
    group.record_hash = canonicalHash(group.change_set);
    group.operation_count = 1;
    value.content.coverage.operations = 1;
    value.content.review.members[0].change_sets[0]!.change_set_ref.content_hash =
      group.change_set.content_hash;
    rehash(value);
    await expect(client.assess(request)).rejects.toThrow();
  });

  it("rejects member subsets and propagates stale or unauthorized read failures without retry", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(Response.json({ error: "stale" }, { status: 409 })),
      );
    const client = new ReviewRecoveryAssessmentClient({
      baseUrl: "http://petra.local",
      token: "token",
      fetch: transport,
    });
    await expect(
      client.assess({ ...request, member_ids: [] } as typeof request),
    ).rejects.toThrow(TypeError);
    expect(transport).not.toHaveBeenCalled();
    await expect(client.assess(request)).rejects.toMatchObject({ status: 409 });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
