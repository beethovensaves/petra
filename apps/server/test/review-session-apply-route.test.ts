import { describe, expect, it } from "vitest";
import type { ReviewSessionApplyBoundary } from "@petra/core";
import { createPetraApp } from "../src/app.js";

const project = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const session = "review_session_01K4D000000000000000000004";
const query = `/api/queries/projects/${project}/reviews/${session}/apply-checkpoint?expected_revision=1&expected_content_hash=sha256:${"a".repeat(64)}&selected_review_member_id=review_member_01K4D000000000000000000005`;
const boundary: ReviewSessionApplyBoundary = {
  prepareReviewApply: () => {
    throw new Error("Denied input reached checkpoint preparation.");
  },
  executeReviewApply: () => {
    throw new Error("Denied input reached checkpoint execution.");
  },
};

describe("manual ReviewSession Apply transport boundary", () => {
  const petra = createPetraApp({
    authToken: "apply-route-test",
    reviewSessionApply: boundary,
    commandPrincipalResolver: {
      resolveCommandPrincipal: () =>
        Promise.resolve({ state: "denied", reason: "active_grant_not_found" }),
    },
  });
  it("requires authentication and current authority before preparing a checkpoint", async () => {
    expect((await petra.app.request(query)).status).toBe(401);
    expect(
      (
        await petra.app.request(query, {
          headers: { authorization: "Bearer apply-route-test" },
        })
      ).status,
    ).toBe(403);
  });
  it("rejects client-supplied authority and duplicate or malformed selection controls", async () => {
    for (const suffix of [
      "&actor=human",
      "&policy=automatic",
      "&member_subset=one",
      "&expected_revision=2",
    ]) {
      expect(
        (
          await petra.app.request(query + suffix, {
            headers: { authorization: "Bearer apply-route-test" },
          })
        ).status,
      ).toBe(422);
    }
  });
  it("accepts only the complete versioned Apply request and keeps interrupt resolution distinct", async () => {
    for (const payload of [
      { decision: "accept", review_session_id: session },
      { approval: true },
      {
        schema_name: "petra.review-session-apply-request",
        schema_version: "1.0.0",
        checkpoint: { review_policy: { policy_id: "invented" } },
      },
    ]) {
      const response = await petra.app.request(
        `/api/commands/projects/${project}/reviews/${session}/apply`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer apply-route-test",
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      expect(response.status).toBe(422);
    }
  });
});
