import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraReviewCandidateBasisRevisionReceipt,
  PetraReviewSessionV110,
  PetraSourceSpan,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  ReviewCandidateBasisRevisionClient,
  ReviewCandidateBasisRevisionClientError,
  type ReviewCandidateBasisRevisionRequest,
  type ReviewCandidateBasisRevisionResult,
} from "../src/review-candidate-basis-revision-client.js";

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

const workingHash = (value: { content_hash: string }): string => {
  const projection = structuredClone(value) as unknown as Record<
    string,
    unknown
  >;
  delete projection.content_hash;
  return canonicalHash(projection);
};

const priorReview = readFixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);
const definition = readFixture<PetraProjectDefinition>(
  "project-definition-working-scientific",
);
const priorCandidate = readFixture<PetraWorkingCandidate>("working-candidate");
const priorRelationship = readFixture<PetraWorkingRelationship>(
  "working-relationship",
);
const priorProfile = readFixture<PetraClaim>("claim");
const projectSource = readFixture<PetraProjectSource>("project-source");
const sourceSpan = readFixture<PetraSourceSpan>("source-span");
const priorMember = priorReview.content.members[0];
const projectSourceRef = {
  project_source_id: projectSource.project_source_id,
  revision: projectSource.revision,
  content_hash: projectSource.content_hash,
  record_hash: canonicalHash(projectSource),
  status: "active" as const,
};
const sourceSpanRef = {
  schema_name: "petra.source-span" as const,
  schema_version: "1.0.0" as const,
  record_id: sourceSpan.source_span_id,
  revision: 1 as const,
  record_hash: canonicalHash(sourceSpan),
};

const request: ReviewCandidateBasisRevisionRequest = {
  command_id: "command_01K4E000000000000000000111",
  idempotency_key: "review-session:001:basis-revision:client:v1",
  expected_review_session_ref: {
    review_session_id: priorReview.review_session_id,
    revision: priorReview.revision,
    content_hash: priorReview.content_hash,
    lifecycle: "open",
  },
  review_member_id: priorMember.review_member_id,
  expected_project_definition_ref: {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    definition_family: definition.definition_family,
  },
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
  expected_claim_ref: {
    schema_name: "petra.claim",
    schema_version: "1.0.0",
    record_id: priorProfile.claim_id,
    revision: priorProfile.revision,
    record_hash: canonicalHash(priorProfile),
  },
  basis_revision_input: {
    input_kind: "human_scientific_source_basis_revision",
    project_source_ref: projectSourceRef,
    source_span_refs: [sourceSpanRef],
    source_scope: "full_text",
    detail_level: "broad",
    source_stance: "qualifies",
    attribution: "The study authors",
    modality: "hedged",
    negated: false,
    uncertainty: "The selected span narrows the reported effect.",
    reason: "The previous basis omitted a material qualification.",
  },
};

const profileRecord = structuredClone(priorProfile);
if (profileRecord.basis.basis_kind !== "source") {
  throw new Error("Expected a source-grounded Claim fixture.");
}
profileRecord.revision += 1;
profileRecord.basis = {
  ...profileRecord.basis,
  source_scope: request.basis_revision_input.source_scope,
  detail_level: request.basis_revision_input.detail_level,
  source_span_ids: request.basis_revision_input.source_span_refs.map(
    (ref) => ref.record_id,
  ) as [string, ...string[]],
  source_stance: request.basis_revision_input.source_stance,
  attribution: request.basis_revision_input.attribution,
  modality: request.basis_revision_input.modality,
  negated: request.basis_revision_input.negated,
  ...(request.basis_revision_input.uncertainty === undefined
    ? {}
    : { uncertainty: request.basis_revision_input.uncertainty }),
  derivation: {
    derivation_kind: "human_extraction",
    derivation_ref: request.command_id,
  },
  validator_results: [
    {
      validator_name: "petra.validator.source-span-resolution",
      validator_version: "1.0.0",
      outcome: "warning",
      code: "REVALIDATION_REQUIRED",
      message: "This validator has not evaluated the revised source basis.",
    },
  ],
  proposed_by: structuredClone(priorReview.content.responsible),
  proposed_at: "2026-09-12T22:00:00.000Z",
};
profileRecord.authority = { zone: "quarantine", review_state: "unreviewed" };
profileRecord.supersedes_claim_id = priorProfile.claim_id;
profileRecord.created_by = structuredClone(priorReview.content.responsible);
profileRecord.created_at = "2026-09-12T22:00:00.000Z";

const candidate = structuredClone(priorCandidate);
candidate.revision += 1;
candidate.profile_object.object_record_ref = {
  schema_name: "petra.claim",
  schema_version: "1.0.0",
  record_id: profileRecord.claim_id,
  revision: profileRecord.revision,
  record_hash: canonicalHash(profileRecord),
};
candidate.validation = {
  state: "pending",
  target_record_hash: canonicalHash(profileRecord),
  results: [],
};
candidate.lineage = {
  lineage_kind: "supersession",
  supersedes: {
    working_candidate_id: priorCandidate.working_candidate_id,
    revision: priorCandidate.revision,
    content_hash: priorCandidate.content_hash,
  },
  change_kind: "basis_revision",
  reason: request.basis_revision_input.reason,
};
candidate.content_hash = workingHash(candidate);

const relationship = structuredClone(priorRelationship);
relationship.revision += 1;
relationship.endpoints.object = {
  endpoint_kind: "working_candidate",
  candidate_ref: {
    working_candidate_id: candidate.working_candidate_id,
    revision: candidate.revision,
    content_hash: candidate.content_hash,
  },
};
relationship.validation = {
  state: "pending",
  target_record_hash:
    priorRelationship.profile_relationship.relationship_record_ref.record_hash,
  results: [],
};
relationship.lineage = {
  lineage_kind: "supersession",
  supersedes: {
    working_relationship_id: priorRelationship.working_relationship_id,
    revision: priorRelationship.revision,
    content_hash: priorRelationship.content_hash,
  },
  change_kind: "basis_revision",
  reason: "Rebind the relationship to the basis-revised candidate.",
};
relationship.content_hash = workingHash(relationship);

const review = structuredClone(priorReview);
review.revision += 1;
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

const validatorRegistrations = definition.content.registrations.filter(
  (registration) => registration.registration_kind === "validator",
);
const firstValidator = validatorRegistrations[0];
if (firstValidator === undefined) {
  throw new Error("Expected one registered validator.");
}
const requiredValidatorRefs = [
  structuredClone(firstValidator.contract),
  ...validatorRegistrations
    .slice(1)
    .map((registration) => structuredClone(registration.contract)),
] as [typeof firstValidator.contract, ...Array<typeof firstValidator.contract>];
const priorBasis = priorProfile.basis;
if (priorBasis.basis_kind !== "source") {
  throw new Error("Expected a source basis.");
}
const resultingProfileBasis = profileRecord.basis;
if (resultingProfileBasis.basis_kind !== "source") {
  throw new Error("Expected a resulting source basis.");
}

const receiptContent: PetraReviewCandidateBasisRevisionReceipt["content"] = {
  command_ref: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    command_name: "ReviseReviewCandidateBasis",
    command_fingerprint: `sha256:${"1".repeat(64)}`,
    actor: structuredClone(priorReview.content.responsible),
    capability_grant_id: "capability_grant_01K4E000000000000000000112",
    correlation_id: "trace_01K4E000000000000000000113",
  },
  review_member_id: request.review_member_id,
  project_definition_ref: structuredClone(
    request.expected_project_definition_ref,
  ),
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
  prior_profile_record_ref: structuredClone(request.expected_claim_ref),
  resulting_profile_record_ref: {
    schema_name: "petra.claim",
    schema_version: "1.0.0",
    record_id: profileRecord.claim_id,
    revision: profileRecord.revision,
    record_hash: canonicalHash(profileRecord),
  },
  prior_basis: {
    basis_kind: "source",
    project_source_ref: projectSourceRef,
    work_version_id: priorBasis.work_version_id,
    source_span_refs: [sourceSpanRef],
    source_scope: priorBasis.source_scope,
    detail_level: priorBasis.detail_level,
    source_stance: priorBasis.source_stance,
    attribution: priorBasis.attribution,
    modality: priorBasis.modality,
    negated: priorBasis.negated,
    ...(priorBasis.uncertainty === undefined
      ? {}
      : { uncertainty: priorBasis.uncertainty }),
  },
  resulting_basis: {
    basis_kind: "source",
    project_source_ref: projectSourceRef,
    work_version_id: resultingProfileBasis.work_version_id,
    source_span_refs: [sourceSpanRef],
    source_scope: request.basis_revision_input.source_scope,
    detail_level: request.basis_revision_input.detail_level,
    source_stance: request.basis_revision_input.source_stance,
    attribution: request.basis_revision_input.attribution,
    modality: request.basis_revision_input.modality,
    negated: request.basis_revision_input.negated,
    ...(request.basis_revision_input.uncertainty === undefined
      ? {}
      : { uncertainty: request.basis_revision_input.uncertainty }),
  },
  basis_transition: "material_revision_within_exact_scientific_source",
  validation_reset: {
    state: "pending",
    target_record_hash: canonicalHash(profileRecord),
    required_validator_refs: requiredValidatorRefs,
    completed_validator_refs: [],
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
const receipt: PetraReviewCandidateBasisRevisionReceipt = {
  schema_name: "petra.review-candidate-basis-revision-receipt",
  schema_version: "1.0.0",
  review_candidate_basis_revision_receipt_id:
    "review_basis_revision_receipt_01K4E000000000000000000114",
  revision: 1,
  project_id: priorReview.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: "2026-09-12T22:00:01.000Z",
};
const result: ReviewCandidateBasisRevisionResult = {
  receipt,
  candidate,
  profile_record: profileRecord,
  relationship,
  review_session: review,
  applied: true,
};

describe("ReviewCandidateBasisRevisionClient", () => {
  it("sends the exact basis revision and verifies every returned identity", async () => {
    let sentUrl: URL | undefined;
    let sentBody: unknown;
    const client = new ReviewCandidateBasisRevisionClient({
      baseUrl: "http://petra.local",
      token: "basis-token",
      traceId: "trace_01K4E000000000000000000115",
      fetch: (input, init) => {
        sentUrl = new URL(input instanceof Request ? input.url : input);
        if (typeof init?.body !== "string") {
          throw new Error("Expected a JSON request body.");
        }
        sentBody = JSON.parse(init.body);
        return Promise.resolve(Response.json(result));
      },
    });

    await expect(
      client.revise(priorReview.project_id, request),
    ).resolves.toEqual(result);
    expect(sentUrl?.pathname).toBe(
      `/api/commands/projects/${priorReview.project_id}/reviews/${priorReview.review_session_id}/candidate-basis-revision`,
    );
    expect(sentBody).toEqual(request);
  });

  it("rejects unsupported or duplicate source input locally and preserves server failures", async () => {
    const client = new ReviewCandidateBasisRevisionClient({
      baseUrl: "http://petra.local",
      token: "basis-token",
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
              },
            },
            { status: 409 },
          ),
        ),
    });
    const duplicate = structuredClone(request);
    duplicate.basis_revision_input.source_span_refs.push(sourceSpanRef);
    await expect(
      client.revise(priorReview.project_id, duplicate),
    ).rejects.toBeInstanceOf(TypeError);

    const unsupported = structuredClone(request) as unknown as {
      basis_revision_input: { input_kind: string };
    };
    unsupported.basis_revision_input.input_kind =
      "human_scientific_researcher_basis_revision";
    await expect(
      client.revise(priorReview.project_id, unsupported as never),
    ).rejects.toBeInstanceOf(TypeError);

    await expect(
      client.revise(priorReview.project_id, request),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects a contract-valid success with mismatched command identity", async () => {
    const mismatched = structuredClone(result);
    mismatched.receipt.content.command_ref.command_id =
      "command_01K4E000000000000000000116";
    mismatched.receipt.content_hash = canonicalHash(mismatched.receipt.content);
    const client = new ReviewCandidateBasisRevisionClient({
      baseUrl: "http://petra.local",
      token: "basis-token",
      fetch: () => Promise.resolve(Response.json(mismatched)),
    });

    await expect(
      client.revise(priorReview.project_id, request),
    ).rejects.toBeInstanceOf(ReviewCandidateBasisRevisionClientError);
  });
});
