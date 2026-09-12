import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraClaim,
  PetraReviewCandidateCorrectionReceipt,
  PetraReviewSessionV110,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  ReviewCandidateCorrectionClient,
  ReviewCandidateCorrectionClientError,
  type ReviewCandidateCorrectionRequest,
  type ReviewCandidateCorrectionResult,
} from "../src/review-candidate-correction-client.js";

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

const priorReview = readFixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);
const priorCandidate = readFixture<PetraWorkingCandidate>("working-candidate");
const priorRelationship = readFixture<PetraWorkingRelationship>(
  "working-relationship",
);
const candidate = readFixture<PetraWorkingCandidate>(
  "working-candidate-correction",
);
const profileRecord = readFixture<PetraClaim>("claim-working-correction");
const priorMember = priorReview.content.members[0];

const request: ReviewCandidateCorrectionRequest = {
  command_id: "command_01K4D000000000000000000111",
  idempotency_key: "review-session:001:candidate-correction:client:v1",
  expected_review_session_ref: {
    review_session_id: priorReview.review_session_id,
    revision: priorReview.revision,
    content_hash: priorReview.content_hash,
    lifecycle: "open",
  },
  review_member_id: priorMember.review_member_id,
  expected_working_candidate_ref: {
    working_candidate_id: priorCandidate.working_candidate_id,
    revision: priorCandidate.revision,
    content_hash: priorCandidate.content_hash,
  },
  expected_working_relationship_ref: {
    working_relationship_id: priorRelationship.working_relationship_id,
    revision: priorRelationship.revision,
    content_hash: priorRelationship.content_hash,
  },
  corrected_candidate: structuredClone(candidate),
  corrected_profile_record: structuredClone(profileRecord),
};

const relationship = structuredClone(priorRelationship);
relationship.revision = 2;
relationship.endpoints.object = {
  endpoint_kind: "working_candidate",
  candidate_ref: {
    working_candidate_id: candidate.working_candidate_id,
    revision: candidate.revision,
    content_hash: candidate.content_hash,
  },
};
relationship.lineage = {
  lineage_kind: "supersession",
  supersedes: {
    working_relationship_id: priorRelationship.working_relationship_id,
    revision: priorRelationship.revision,
    content_hash: priorRelationship.content_hash,
  },
  change_kind: "mechanical_correction",
  reason: "Rebind the existing relationship to the corrected candidate.",
};
relationship.content_hash = (() => {
  const projection = structuredClone(relationship) as unknown as Record<
    string,
    unknown
  >;
  delete projection.content_hash;
  return canonicalHash(projection);
})();

const review = structuredClone(priorReview);
review.revision = 2;
const member = review.content.members[0];
member.working_state = {
  candidate_ref: {
    working_candidate_id: candidate.working_candidate_id,
    revision: candidate.revision,
    content_hash: candidate.content_hash,
  },
  relationship_refs: [
    {
      working_relationship_id: relationship.working_relationship_id,
      revision: relationship.revision,
      content_hash: relationship.content_hash,
    },
  ],
};
member.candidate_bindings[0].record_ref = {
  record_id: profileRecord.claim_id,
  revision: profileRecord.revision,
  record_hash: canonicalHash(profileRecord),
};
review.content_hash = canonicalHash(review.content);

const receiptContent: PetraReviewCandidateCorrectionReceipt["content"] = {
  command_ref: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    command_name: "CorrectReviewCandidate",
    command_fingerprint: `sha256:${"1".repeat(64)}`,
    actor: structuredClone(review.content.responsible),
    capability_grant_id: "capability_grant_01K4D000000000000000000112",
    correlation_id: "trace_01K4D000000000000000000113",
  },
  review_member_id: request.review_member_id,
  prior_review_session_ref: {
    ...request.expected_review_session_ref,
    record_hash: canonicalHash(priorReview),
  },
  resulting_review_session_ref: {
    review_session_id: review.review_session_id,
    revision: review.revision,
    content_hash: review.content_hash,
    record_hash: canonicalHash(review),
    lifecycle: "open",
  },
  prior_candidate_ref: {
    schema_name: "petra.working-candidate",
    schema_version: "1.0.0",
    record_id: priorCandidate.working_candidate_id,
    revision: priorCandidate.revision,
    content_hash: priorCandidate.content_hash,
    record_hash: canonicalHash(priorCandidate),
  },
  resulting_candidate_ref: {
    schema_name: "petra.working-candidate",
    schema_version: "1.0.0",
    record_id: candidate.working_candidate_id,
    revision: candidate.revision,
    content_hash: candidate.content_hash,
    record_hash: canonicalHash(candidate),
  },
  prior_relationship_ref: {
    schema_name: "petra.working-relationship",
    schema_version: "1.0.0",
    record_id: priorRelationship.working_relationship_id,
    revision: priorRelationship.revision,
    content_hash: priorRelationship.content_hash,
    record_hash: canonicalHash(priorRelationship),
  },
  resulting_relationship_ref: {
    schema_name: "petra.working-relationship",
    schema_version: "1.0.0",
    record_id: relationship.working_relationship_id,
    revision: relationship.revision,
    content_hash: relationship.content_hash,
    record_hash: canonicalHash(relationship),
  },
  prior_profile_record_ref: {
    schema_name: "petra.claim",
    schema_version: "1.0.0",
    record_id: profileRecord.claim_id,
    revision: profileRecord.revision - 1,
    record_hash: `sha256:${"2".repeat(64)}`,
  },
  resulting_profile_record_ref: {
    schema_name: "petra.claim",
    schema_version: "1.0.0",
    record_id: profileRecord.claim_id,
    revision: profileRecord.revision,
    record_hash: canonicalHash(profileRecord),
  },
  correction_kind: "material_revision",
  basis_transition: "retained_exact_scientific_source",
  validation: {
    state: candidate.validation.state,
    target_record_hash: candidate.validation.target_record_hash,
    validator_refs: candidate.validation.results.map((result) =>
      structuredClone(result.validator_ref),
    ),
  },
  preservation: {
    candidate_identity: "retained",
    prior_candidate_revision: "retained",
    relationship_identity: "retained",
    prior_relationship_revision: "retained",
    review_session_identity: "retained",
    review_member_identity: "retained",
    review_decision: "none",
    change_sets: "unchanged",
    approvals: "unchanged",
    domain_events: "none",
    projection: "unchanged",
    history: "unchanged",
  },
  authority_boundary: {
    candidate_authority: "working_only",
    review_decision: "none",
    domain_authority: "unchanged",
    validation_authority: "none",
    mutation_authority: "capability_command_only",
    conversation_authority: "none",
    model_output_authority: "none",
  },
};
const receipt: PetraReviewCandidateCorrectionReceipt = {
  schema_name: "petra.review-candidate-correction-receipt",
  schema_version: "1.0.0",
  review_candidate_correction_receipt_id:
    "review_correction_receipt_01K4D000000000000000000114",
  revision: 1,
  project_id: priorReview.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: "2026-09-12T21:00:01.000Z",
};
const result: ReviewCandidateCorrectionResult = {
  receipt,
  candidate,
  profile_record: profileRecord,
  relationship,
  review_session: review,
  applied: true,
};

describe("ReviewCandidateCorrectionClient", () => {
  it("sends the exact correction and verifies every resulting identity", async () => {
    let sentUrl: URL | undefined;
    let sentBody: unknown;
    const client = new ReviewCandidateCorrectionClient({
      baseUrl: "http://petra.local",
      token: "correction-token",
      traceId: "trace_01K4D000000000000000000115",
      fetch: (input, init) => {
        sentUrl = new URL(input instanceof Request ? input.url : input);
        if (typeof init?.body !== "string") {
          throw new Error("Expected a JSON string request body.");
        }
        sentBody = JSON.parse(init.body);
        return Promise.resolve(
          new Response(JSON.stringify(result), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      },
    });

    await expect(
      client.correct(priorReview.project_id, request),
    ).resolves.toEqual(result);
    expect(sentUrl?.pathname).toBe(
      `/api/commands/projects/${priorReview.project_id}/reviews/${priorReview.review_session_id}/candidate-correction`,
    );
    expect(sentBody).toEqual(request);
  });

  it("fails locally on incomplete exact input", async () => {
    const client = new ReviewCandidateCorrectionClient({
      baseUrl: "http://petra.local",
      token: "correction-token",
      fetch: () => {
        throw new Error("Invalid request reached transport.");
      },
    });
    await expect(
      client.correct(priorReview.project_id, {
        ...request,
        expected_working_candidate_ref: {
          ...request.expected_working_candidate_ref,
          revision: 0,
        },
      }),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it("rejects server errors and mismatched success responses", async () => {
    const rejected = new ReviewCandidateCorrectionClient({
      baseUrl: "http://petra.local",
      token: "correction-token",
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ error: { code: "STALE" } }), {
            status: 409,
            headers: { "content-type": "application/json" },
          }),
        ),
    });
    await expect(
      rejected.correct(priorReview.project_id, request),
    ).rejects.toBeInstanceOf(ReviewCandidateCorrectionClientError);

    const mismatched = structuredClone(result);
    mismatched.review_session.content.members[0].review_member_id =
      "review_member_01K4D000000000000000000199";
    mismatched.review_session.content_hash = canonicalHash(
      mismatched.review_session.content,
    );
    mismatched.receipt.content.resulting_review_session_ref.content_hash =
      mismatched.review_session.content_hash;
    const client = new ReviewCandidateCorrectionClient({
      baseUrl: "http://petra.local",
      token: "correction-token",
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify(mismatched), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        ),
    });
    await expect(
      client.correct(priorReview.project_id, request),
    ).rejects.toBeInstanceOf(ReviewCandidateCorrectionClientError);
  });
});
