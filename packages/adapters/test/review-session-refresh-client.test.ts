import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraReviewSessionRefreshReceipt,
  PetraReviewSessionV110,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  ReviewSessionRefreshClient,
  ReviewSessionRefreshClientError,
  type ReviewSessionRefreshRequest,
} from "../src/review-session-refresh-client.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const session = readFixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);
const request: ReviewSessionRefreshRequest = {
  command_id: "command_01K4D000000000000000000095",
  idempotency_key: "review-session:001:refresh:client:v1",
  expected_review_session_ref: {
    review_session_id: session.review_session_id,
    revision: session.revision,
    content_hash: session.content_hash,
    lifecycle: "open",
  },
};
const refreshed = structuredClone(session);
refreshed.revision += 1;
refreshed.content.snapshot.event_position += 1;
refreshed.content.snapshot.stream_revision += 1;
refreshed.content.snapshot.captured_at = "2026-09-12T20:01:00.000Z";
refreshed.content_hash = canonicalHash(refreshed.content);
refreshed.updated_at = "2026-09-12T20:01:00.000Z";
const receiptContent: PetraReviewSessionRefreshReceipt["content"] = {
  command_ref: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    command_name: "RefreshReviewSession",
    command_fingerprint: `sha256:${"1".repeat(64)}`,
    actor: structuredClone(session.created_by),
    capability_grant_id: "capability_grant_01K4D000000000000000000096",
    correlation_id: "trace_01K4D000000000000000000097",
  },
  prior_review_session_ref: {
    ...request.expected_review_session_ref,
    record_hash: canonicalHash(session),
  },
  resulting_review_session_ref: {
    review_session_id: refreshed.review_session_id,
    revision: refreshed.revision,
    content_hash: refreshed.content_hash,
    record_hash: canonicalHash(refreshed),
    lifecycle: "open",
  },
  transition: "refreshed",
  refresh_basis: {
    selection_basis: "same_review_members_current_working_heads",
    prior_snapshot: {
      event_position: session.content.snapshot.event_position,
      stream_revision: session.content.snapshot.stream_revision,
      captured_at: session.content.snapshot.captured_at,
    },
    resulting_snapshot: {
      event_position: refreshed.content.snapshot.event_position,
      stream_revision: refreshed.content.snapshot.stream_revision,
      captured_at: refreshed.content.snapshot.captured_at,
    },
    members: refreshed.content.members.map((member) => ({
      review_member_id: member.review_member_id,
      candidate_ref: structuredClone(member.working_state.candidate_ref),
      relationship_refs: structuredClone(
        member.working_state.relationship_refs,
      ),
    })) as PetraReviewSessionRefreshReceipt["content"]["refresh_basis"]["members"],
  },
  preservation: {
    stale_review_revision: "retained",
    review_members: "retained_same_identity",
    working_candidates: "retained",
    working_relationships: "retained",
    validation_records: "retained_unchanged",
    change_sets: "retained_unchanged",
    approvals: "retained_unchanged",
    command_events: "retained_unchanged",
    projection_receipts: "retained_unchanged",
  },
  authority_boundary: {
    review_decision: "none",
    domain_authority: "unchanged",
    candidate_authority: "none",
    validation_authority: "none",
    change_set_authority: "none",
    approval_authority: "none",
    domain_event_effect: "none",
    projection_effect: "none",
  },
};
const receipt: PetraReviewSessionRefreshReceipt = {
  schema_name: "petra.review-session-refresh-receipt",
  schema_version: "1.0.0",
  review_session_refresh_receipt_id:
    "review_session_refresh_receipt_01K4D000000000000000000098",
  revision: 1,
  project_id: session.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: refreshed.updated_at,
};

describe("ReviewSessionRefreshClient", () => {
  it("sends only exact caller-owned command identity and validates the result", async () => {
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        Response.json({
          receipt,
          review_session: refreshed,
          applied: true,
        }),
      );
    });
    const client = new ReviewSessionRefreshClient({
      baseUrl: "http://petra.local",
      token: "secret",
      traceId: "trace-client",
      fetch,
    });

    await expect(client.refresh(session.project_id, request)).resolves.toEqual({
      receipt,
      review_session: refreshed,
      applied: true,
    });
    const [url, init] = fetch.mock.calls[0]!;
    if (!(url instanceof URL)) throw new Error("Expected a URL request.");
    expect(url.toString()).toBe(
      `http://petra.local/api/commands/projects/${session.project_id}/reviews/${session.review_session_id}/refresh`,
    );
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        authorization: "Bearer secret",
        "content-type": "application/json",
        "x-petra-trace-id": "trace-client",
      },
      body: JSON.stringify(request),
    });
    if (typeof init?.body !== "string") {
      throw new Error("Expected a JSON string request body.");
    }
    expect(JSON.parse(init.body)).toEqual(request);
  });

  it("rejects malformed request identity before transport", async () => {
    const fetch = vi.fn();
    const client = new ReviewSessionRefreshClient({
      baseUrl: "http://petra.local",
      token: "secret",
      fetch,
    });
    await expect(
      client.refresh(session.project_id, {
        ...request,
        expected_review_session_ref: {
          ...request.expected_review_session_ref,
          revision: 0,
        },
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves server failure and rejects a mismatched successful result", async () => {
    const rejected = new ReviewSessionRefreshClient({
      baseUrl: "http://petra.local",
      token: "secret",
      fetch: () =>
        Promise.resolve(
          Response.json(
            { error: { code: "REVIEW_SESSION_REFRESH_STALE_SESSION" } },
            { status: 409 },
          ),
        ),
    });
    await expect(
      rejected.refresh(session.project_id, request),
    ).rejects.toMatchObject({ status: 409 });

    const mismatchedReceipt = structuredClone(receipt);
    mismatchedReceipt.content.prior_review_session_ref.revision += 1;
    mismatchedReceipt.content_hash = canonicalHash(mismatchedReceipt.content);
    const mismatched = new ReviewSessionRefreshClient({
      baseUrl: "http://petra.local",
      token: "secret",
      fetch: () =>
        Promise.resolve(
          Response.json({
            receipt: mismatchedReceipt,
            review_session: refreshed,
            applied: true,
          }),
        ),
    });
    await expect(
      mismatched.refresh(session.project_id, request),
    ).rejects.toBeInstanceOf(ReviewSessionRefreshClientError);
  });
});
