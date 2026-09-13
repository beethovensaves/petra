import { readFileSync } from "node:fs";
import type { PetraReviewRecoveryAssessment } from "@petra/contracts";
import { ReviewRecoveryAssessmentError } from "@petra/core";
import { describe, expect, it, vi } from "vitest";
import { createPetraApp } from "../src/app.js";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/review-recovery-assessment.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraReviewRecoveryAssessment;
const session = fixture.content.review_session;
const path = `/api/queries/projects/${fixture.project_id}/reviews/${session.review_session_id}/recovery-assessment`;
const query = `?expected_revision=${session.revision}&expected_content_hash=${session.content_hash}`;
const request = (suffix = query, token = "token") =>
  new Request(`http://petra.local${path}${suffix}`, {
    headers: { authorization: `Bearer ${token}` },
  });
describe("authenticated read-only Review recovery route", () => {
  it("returns the exact same canonical assessment for both entry paths", async () => {
    const read = vi.fn().mockResolvedValue(fixture);
    const { app } = createPetraApp({
      authToken: "token",
      reviewRecoveryAssessments: { getReviewRecoveryAssessment: read },
    });
    const direct = await app.request(request());
    const model = await app.request(request());
    expect(direct.status).toBe(200);
    expect(direct.headers.get("cache-control")).toBe("no-store");
    expect(await direct.json()).toEqual(await model.json());
    expect(read).toHaveBeenCalledWith({
      project_id: fixture.project_id,
      review_session_id: session.review_session_id,
      expected_revision: session.revision,
      expected_content_hash: session.content_hash,
    });
  });
  it("fails authentication before reading and rejects subsets or authority inputs", async () => {
    const read = vi.fn().mockResolvedValue(fixture);
    const { app } = createPetraApp({
      authToken: "token",
      reviewRecoveryAssessments: { getReviewRecoveryAssessment: read },
    });
    expect((await app.request(request(query, "wrong"))).status).toBe(401);
    for (const suffix of [
      "",
      `${query}&member_id=anything`,
      `${query}&retry=true`,
      `${query}&expected_revision=1`,
      `${query}&actor_id=anything`,
      query.replace("revision=1", "revision=0"),
    ])
      expect((await app.request(request(suffix))).status).toBe(400);
    expect(read).not.toHaveBeenCalled();
    expect(
      (
        await app.request(
          new Request(`http://petra.local${path}${query}`, {
            method: "POST",
            headers: { authorization: "Bearer token" },
          }),
        )
      ).status,
    ).toBe(404);
  });
  it.each([
    ["REVIEW_RECOVERY_STALE", 409],
    ["REVIEW_RECOVERY_UNSUPPORTED", 422],
    ["REVIEW_RECOVERY_INCOMPLETE", 503],
    ["REVIEW_RECOVERY_CORRUPT", 503],
  ] as const)("fails closed for %s", async (code, status) => {
    const { app } = createPetraApp({
      authToken: "token",
      reviewRecoveryAssessments: {
        getReviewRecoveryAssessment: () =>
          Promise.reject(
            new ReviewRecoveryAssessmentError(
              code,
              "Canonical evidence is unavailable.",
            ),
          ),
      },
    });
    expect((await app.request(request())).status).toBe(status);
  });
  it("rejects missing, mismatched, and corrupt canonical responses", async () => {
    const read = vi.fn();
    const { app } = createPetraApp({
      authToken: "token",
      reviewRecoveryAssessments: { getReviewRecoveryAssessment: read },
    });
    read.mockResolvedValueOnce(undefined);
    expect((await app.request(request())).status).toBe(404);
    read.mockResolvedValueOnce({
      ...fixture,
      project_id: "project_01K4F000000000000000000999",
    });
    expect((await app.request(request())).status).toBe(503);
    const corrupt = structuredClone(fixture);
    corrupt.content.coverage.assessed_members = 0;
    read.mockResolvedValueOnce(corrupt);
    expect((await app.request(request())).status).toBe(503);
  });
});
