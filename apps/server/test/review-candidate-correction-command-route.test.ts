import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraClaim,
  PetraReviewCandidateCorrectionReceipt,
  PetraReviewSessionV110,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import {
  ReviewCandidateCorrectionAuthorityError,
  type AuthenticatedCommandPrincipalResolver,
  type ReviewCandidateCorrectionAuthorityErrorCode,
  type ReviewCandidateCorrectionAuthorityRepository,
  type ReviewCandidateCorrectionCommandEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "review-candidate-correction-command-token";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
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
const priorCandidate = readFixture<PetraWorkingCandidate>("working-candidate");
const priorRelationship = readFixture<PetraWorkingRelationship>(
  "working-relationship",
);
const candidate = readFixture<PetraWorkingCandidate>(
  "working-candidate-correction",
);
const profileRecord = readFixture<PetraClaim>("claim-working-correction");
const member = session.content.members[0];
const memberRelationship = member.working_state.relationship_refs[0];

const body = {
  command_id: "command_01K4D000000000000000000121",
  idempotency_key: "review-session:001:candidate-correction:route:v1",
  expected_review_session_ref: {
    review_session_id: session.review_session_id,
    revision: session.revision,
    content_hash: session.content_hash,
    lifecycle: "open",
  },
  review_member_id: member.review_member_id,
  expected_working_candidate_ref: structuredClone(
    member.working_state.candidate_ref,
  ),
  expected_working_relationship_ref: structuredClone(memberRelationship),
  corrected_candidate: structuredClone(candidate),
  corrected_profile_record: structuredClone(profileRecord),
} as const;

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
  reason: "Rebind the relationship to the corrected candidate.",
};
const relationshipProjection = structuredClone(
  relationship,
) as unknown as Record<string, unknown>;
delete relationshipProjection.content_hash;
relationship.content_hash = canonicalHash(relationshipProjection);

const correctedSession = structuredClone(session);
correctedSession.revision = 2;
const correctedMember = correctedSession.content.members[0];
correctedMember.working_state = {
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
correctedMember.candidate_bindings[0].record_ref = {
  record_id: profileRecord.claim_id,
  revision: profileRecord.revision,
  record_hash: canonicalHash(profileRecord),
};
correctedSession.content_hash = canonicalHash(correctedSession.content);

const receiptContent: PetraReviewCandidateCorrectionReceipt["content"] = {
  command_ref: {
    command_id: body.command_id,
    idempotency_key: body.idempotency_key,
    command_name: "CorrectReviewCandidate",
    command_fingerprint: `sha256:${"1".repeat(64)}`,
    actor: structuredClone(session.content.responsible),
    capability_grant_id: "capability_grant_01K4D000000000000000000122",
    correlation_id: "trace_01K4D000000000000000000123",
  },
  review_member_id: member.review_member_id,
  prior_review_session_ref: {
    ...body.expected_review_session_ref,
    record_hash: canonicalHash(session),
  },
  resulting_review_session_ref: {
    review_session_id: correctedSession.review_session_id,
    revision: correctedSession.revision,
    content_hash: correctedSession.content_hash,
    record_hash: canonicalHash(correctedSession),
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
    "review_correction_receipt_01K4D000000000000000000124",
  revision: 1,
  project_id: session.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: "2026-09-12T21:00:01.000Z",
};

const path = `/api/commands/projects/${session.project_id}/reviews/${session.review_session_id}/candidate-correction`;
const request = (payload: unknown, query = ""): Request =>
  new Request(`http://petra.local${path}${query}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

const resolvedPrincipal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({
      state: "resolved",
      actor: structuredClone(session.content.responsible),
      capabilityGrantId: receipt.content.command_ref.capability_grant_id,
    }),
};

const authorityResult = () => ({
  receipt: structuredClone(receipt),
  candidate: structuredClone(candidate),
  profileRecord: structuredClone(profileRecord),
  relationship: structuredClone(relationship),
  reviewSession: structuredClone(correctedSession),
  applied: true,
});

describe("Review candidate-correction command route", () => {
  it("builds authority from authentication and returns the exact composed result", async () => {
    let resolvedInput: { projectId: string; commandName: string } | undefined;
    let executedEnvelope: ReviewCandidateCorrectionCommandEnvelope | undefined;
    const authority: ReviewCandidateCorrectionAuthorityRepository = {
      executeReviewCandidateCorrectionCommand: (envelope) => {
        executedEnvelope = structuredClone(envelope);
        const result = authorityResult();
        result.receipt.content.command_ref.correlation_id =
          envelope.correlation_id;
        result.receipt.content.command_ref.actor = structuredClone(
          envelope.actor,
        );
        result.receipt.content_hash = canonicalHash(result.receipt.content);
        return Promise.resolve(result);
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedInput = input;
          return resolvedPrincipal.resolveCommandPrincipal(input);
        },
      },
      reviewCandidateCorrectionAuthority: authority,
    });

    const response = await petra.app.request(request(body));

    expect(response.status).toBe(200);
    expect(resolvedInput).toEqual({
      projectId: session.project_id,
      commandName: "CorrectReviewCandidate",
    });
    expect(executedEnvelope).toMatchObject({
      schema_name: "petra.command-envelope",
      schema_version: "1.6.0",
      command_id: body.command_id,
      idempotency_key: body.idempotency_key,
      project_id: session.project_id,
      actor: session.content.responsible,
      capability_grant_id: receipt.content.command_ref.capability_grant_id,
      command: {
        command_name: "CorrectReviewCandidate",
        review_member_id: member.review_member_id,
        corrected_candidate: candidate,
        corrected_profile_record: profileRecord,
      },
    });
    await expect(response.json()).resolves.toMatchObject({
      candidate,
      profile_record: profileRecord,
      relationship,
      review_session: correctedSession,
      applied: true,
    });
  });

  it("rejects request-carried authority, incomplete references, and query controls", async () => {
    let resolutionAttempted = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () => {
          resolutionAttempted = true;
          return resolvedPrincipal.resolveCommandPrincipal({
            projectId: session.project_id,
            commandName: "CorrectReviewCandidate",
          });
        },
      },
      reviewCandidateCorrectionAuthority: {
        executeReviewCandidateCorrectionCommand: () => {
          throw new Error("Invalid correction input reached authority.");
        },
      },
    });

    for (const invalid of [
      { ...body, actor: session.content.responsible },
      { ...body, capability_grant_id: "request-selected-grant" },
      {
        ...body,
        expected_review_session_ref: {
          ...body.expected_review_session_ref,
          lifecycle: "deferred",
        },
      },
      {
        ...body,
        expected_working_candidate_ref: {
          ...body.expected_working_candidate_ref,
          revision: 0,
        },
      },
    ]) {
      expect((await petra.app.request(request(invalid))).status).toBe(422);
    }
    expect(
      (await petra.app.request(request(body, "?approve=true"))).status,
    ).toBe(422);
    expect(resolutionAttempted).toBe(false);
  });

  it("fails closed without an active grant and preserves authority error status", async () => {
    const denied = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () =>
          Promise.resolve({
            state: "denied",
            reason: "active_grant_not_found",
          }),
      },
      reviewCandidateCorrectionAuthority: {
        executeReviewCandidateCorrectionCommand: () => {
          throw new Error("Denied correction executed.");
        },
      },
    });
    expect((await denied.app.request(request(body))).status).toBe(403);

    const cases: readonly [
      ReviewCandidateCorrectionAuthorityErrorCode,
      number,
    ][] = [
      ["REVIEW_CANDIDATE_CORRECTION_COMMAND_NOT_AUTHORIZED", 403],
      ["REVIEW_CANDIDATE_CORRECTION_SESSION_NOT_FOUND", 404],
      ["REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED", 422],
      ["REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE", 409],
      ["REVIEW_CANDIDATE_CORRECTION_MEMBER_MISMATCH", 409],
      ["REVIEW_CANDIDATE_CORRECTION_BASIS_INCOMPATIBLE", 409],
      ["REVIEW_CANDIDATE_CORRECTION_STORED_RECORD_CORRUPT", 503],
    ];
    for (const [code, status] of cases) {
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: resolvedPrincipal,
        reviewCandidateCorrectionAuthority: {
          executeReviewCandidateCorrectionCommand: () =>
            Promise.reject(
              new ReviewCandidateCorrectionAuthorityError(code, code),
            ),
        },
      });
      expect((await petra.app.request(request(body))).status).toBe(status);
    }
  });
});
