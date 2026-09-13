import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraReviewSessionSeparationReceipt,
  PetraReviewSessionV110,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  ReviewSessionSeparationClient,
  ReviewSessionSeparationClientError,
  type ReviewSessionSeparationRequest,
  type ReviewSessionSeparationResult,
} from "../src/review-session-separation-client.js";

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

const request: ReviewSessionSeparationRequest = {
  command_id: "command_01K4F000000000000000000301",
  idempotency_key: "review-session:client:separation:301",
  expected_review_session_ref: {
    review_session_id: "review_session_01K4D000000000000000000004",
    revision: 1,
    content_hash: `sha256:${"a".repeat(64)}`,
    lifecycle: "open",
  },
  review_member_id: "review_member_01K4F000000000000000000302",
};

const separationResult = (): ReviewSessionSeparationResult => {
  const source = readFixture<PetraReviewSessionV110>(
    "review-session-working-candidate",
  );
  source.revision = 2;
  source.content_hash = canonicalHash(source.content);
  source.updated_at = "2026-09-12T23:30:00.000Z";

  const separated = structuredClone(source);
  separated.review_session_id = "review_session_01K4F000000000000000000303";
  separated.revision = 1;
  separated.content.members[0].review_member_id = request.review_member_id;
  separated.content.members[0].working_state.candidate_ref = {
    working_candidate_id: "working_candidate_01K4F000000000000000000304",
    revision: 1,
    content_hash: `sha256:${"b".repeat(64)}`,
  };
  separated.content.members[0].working_state.relationship_refs = [
    {
      working_relationship_id:
        "working_relationship_01K4F000000000000000000305",
      revision: 1,
      content_hash: `sha256:${"c".repeat(64)}`,
    },
  ];
  separated.content.members[0].candidate_bindings[0].record_ref = {
    record_id: "claim_01K4F000000000000000000306",
    revision: 1,
    record_hash: `sha256:${"d".repeat(64)}`,
  };
  separated.content.members[0].candidate_bindings[1]!.record_ref = {
    record_id: "assertion_01K4F000000000000000000307",
    revision: 1,
    record_hash: `sha256:${"e".repeat(64)}`,
  };
  separated.content_hash = canonicalHash(separated.content);
  separated.created_at = "2026-09-12T23:30:00.000Z";
  separated.updated_at = "2026-09-12T23:30:00.000Z";

  const receiptContent: PetraReviewSessionSeparationReceipt["content"] = {
    command_ref: {
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      command_name: "SeparateReviewSessionMember",
      command_fingerprint: `sha256:${"f".repeat(64)}`,
      actor: structuredClone(source.created_by),
      capability_grant_id: "capability_grant_01K4F000000000000000000308",
      correlation_id: "trace_01K4F000000000000000000309",
    },
    source_prior_review_session_ref: {
      review_session_id: request.expected_review_session_ref.review_session_id,
      revision: request.expected_review_session_ref.revision,
      content_hash: request.expected_review_session_ref.content_hash,
      record_hash: `sha256:${"0".repeat(64)}`,
      lifecycle: "open",
    },
    source_resulting_review_session_ref: {
      review_session_id: source.review_session_id,
      revision: source.revision,
      content_hash: source.content_hash,
      record_hash: canonicalHash(source),
      lifecycle: "open",
    },
    separated_review_session_ref: {
      review_session_id: separated.review_session_id,
      revision: separated.revision,
      content_hash: separated.content_hash,
      record_hash: canonicalHash(separated),
      lifecycle: "open",
    },
    partition: {
      separated_review_member_id: request.review_member_id,
      retained_review_member_ids: [source.content.members[0].review_member_id],
      semantic_unit: "exact_review_member_unchanged",
      atomicity: "existing_change_sets_retained_without_cross_partition_unit",
    },
    preservation: {
      prior_review_revision: "retained",
      review_member_identities: "retained_exactly_once",
      working_candidates: "retained_unchanged",
      working_relationships: "retained_unchanged",
      profile_records: "retained_unchanged",
      basis_and_provenance: "retained_unchanged",
      validation_records: "retained_unchanged",
      change_sets: "retained_unchanged_atomic_boundaries",
      approvals: "retained_unchanged",
      command_events: "retained_unchanged",
      projection_receipts: "retained_unchanged",
      member_outcomes: "retained_derived_from_existing_authority",
    },
    authority_boundary: {
      review_membership: "separated_explicitly",
      review_decision: "none",
      candidate_authority: "none",
      validation_authority: "none",
      change_set_authority: "none",
      approval_authority: "none",
      domain_authority: "unchanged",
      domain_event_effect: "none",
      projection_effect: "none",
      recovery_effect: "none",
    },
  };
  const receipt: PetraReviewSessionSeparationReceipt = {
    schema_name: "petra.review-session-separation-receipt",
    schema_version: "1.0.0",
    review_session_separation_receipt_id:
      "review_separation_receipt_01K4F000000000000000000310",
    revision: 1,
    project_id: source.project_id,
    content: receiptContent,
    content_hash: canonicalHash(receiptContent),
    recorded_at: "2026-09-12T23:30:00.000Z",
  };
  return {
    receipt,
    source_review_session: source,
    separated_review_session: separated,
    applied: true,
  };
};

describe("ReviewSession separation client", () => {
  it("sends only compact caller-owned separation intent and verifies the exact partition", async () => {
    const result = separationResult();
    const fetchMock = vi.fn<typeof fetch>((input, init) => {
      const requestedUrl =
        input instanceof URL
          ? input.href
          : typeof input === "string"
            ? input
            : input.url;
      expect(requestedUrl).toBe(
        `http://petra.local/api/commands/projects/${result.receipt.project_id}/reviews/${request.expected_review_session_ref.review_session_id}/separation`,
      );
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        authorization: "Bearer secret",
        "content-type": "application/json",
        "x-petra-trace-id": "trace-client",
      });
      if (typeof init?.body !== "string") {
        throw new TypeError("Expected a serialized JSON request body.");
      }
      expect(JSON.parse(init.body)).toEqual(request);
      return Promise.resolve(
        new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });
    const client = new ReviewSessionSeparationClient({
      baseUrl: "http://petra.local",
      token: "secret",
      traceId: "trace-client",
      fetch: fetchMock,
    });

    await expect(
      client.separate(result.receipt.project_id, request),
    ).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid input before transport", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const client = new ReviewSessionSeparationClient({
      baseUrl: "http://petra.local",
      token: "secret",
      fetch: fetchMock,
    });
    const invalid = {
      ...structuredClone(request),
      approved: true,
    } as unknown as ReviewSessionSeparationRequest;

    await expect(
      client.separate("project_01ARZ3NDEKTSV4RRFFQ69G5FAW", invalid),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a mismatched separated member or result context", async () => {
    const mismatched = separationResult();
    mismatched.separated_review_session.content.members[0].review_member_id =
      "review_member_01K4F000000000000000000311";
    mismatched.separated_review_session.content_hash = canonicalHash(
      mismatched.separated_review_session.content,
    );
    mismatched.receipt.content.separated_review_session_ref.content_hash =
      mismatched.separated_review_session.content_hash;
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify(mismatched), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const client = new ReviewSessionSeparationClient({
      baseUrl: "http://petra.local",
      token: "secret",
      fetch: fetchMock,
    });

    await expect(
      client.separate(mismatched.receipt.project_id, request),
    ).rejects.toBeInstanceOf(ReviewSessionSeparationClientError);
  });

  it("preserves typed server failures for exact retry handling", async () => {
    const failure = {
      error: "REVIEW_SESSION_SEPARATION_STALE_SESSION",
      message: "Refresh the Review first.",
    };
    const client = new ReviewSessionSeparationClient({
      baseUrl: "http://petra.local",
      token: "secret",
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify(failure), {
            status: 409,
            headers: { "content-type": "application/json" },
          }),
        ),
    });

    await expect(
      client.separate("project_01ARZ3NDEKTSV4RRFFQ69G5FAW", request),
    ).rejects.toMatchObject({
      status: 409,
      response: failure,
    } satisfies Partial<ReviewSessionSeparationClientError>);
  });
});
