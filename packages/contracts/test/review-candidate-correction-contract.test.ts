import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraCapabilityGrantV150,
  PetraClaim,
  PetraCommandEnvelopeV160,
  PetraCommandEnvelopeV170,
  PetraReviewCandidateCorrectionReceipt,
  PetraReviewSessionV110,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  ContractRegistryError,
  PetraContractRegistry,
} from "../src/validator.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const review = readFixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);
const priorCandidate = readFixture<PetraWorkingCandidate>("working-candidate");
const priorRelationship = readFixture<PetraWorkingRelationship>(
  "working-relationship",
);
const correctedCandidate = readFixture<PetraWorkingCandidate>(
  "working-candidate-correction",
);
const correctedClaim = readFixture<PetraClaim>("claim-working-correction");
const member = review.content.members[0];

const command: PetraCommandEnvelopeV160 = {
  schema_name: "petra.command-envelope",
  schema_version: "1.6.0",
  command_id: "command_01K4D000000000000000000101",
  idempotency_key: "review-session:001:candidate-correction:contract:v1",
  project_id: review.project_id,
  actor: structuredClone(review.content.responsible),
  capability_grant_id: "capability_grant_01K4D000000000000000000102",
  correlation_id: "trace_01K4D000000000000000000103",
  submitted_at: "2026-09-12T21:00:00.000Z",
  command: {
    command_name: "CorrectReviewCandidate",
    expected_review_session_ref: {
      review_session_id: review.review_session_id,
      revision: review.revision,
      content_hash: review.content_hash,
      lifecycle: "open",
    },
    review_member_id: member.review_member_id,
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
    corrected_candidate: structuredClone(correctedCandidate),
    corrected_profile_record: structuredClone(correctedClaim),
  },
};

const humanEditCommand: PetraCommandEnvelopeV170 = {
  schema_name: "petra.command-envelope",
  schema_version: "1.7.0",
  command_id: "command_01K4D000000000000000000105",
  idempotency_key: "review-session:001:candidate-correction:human-edit:v1",
  project_id: review.project_id,
  actor: structuredClone(review.content.responsible),
  capability_grant_id: "capability_grant_01K4D000000000000000000102",
  correlation_id: "trace_01K4D000000000000000000103",
  submitted_at: "2026-09-12T21:00:00.000Z",
  command: {
    command_name: "CorrectReviewCandidate",
    expected_review_session_ref: {
      review_session_id: review.review_session_id,
      revision: review.revision,
      content_hash: review.content_hash,
      lifecycle: "open",
    },
    review_member_id: member.review_member_id,
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
    correction_input: {
      input_kind: "human_scientific_claim_text_edit",
      canonical_text:
        "The study reports a measurable improvement on its defined evaluation task.",
    },
  },
};

const grantContent: PetraCapabilityGrantV150["content"] = {
  scope_kind: "project_commands",
  allowed_commands: ["CorrectReviewCandidate"],
  valid_from: "2026-09-01T00:00:00.000Z",
  reason: "Permit an exact non-authoritative correction in the active Review.",
};
const grant: PetraCapabilityGrantV150 = {
  schema_name: "petra.capability-grant",
  schema_version: "1.5.0",
  capability_grant_id: command.capability_grant_id,
  revision: 1,
  project_id: command.project_id,
  grantee: structuredClone(command.actor),
  content: grantContent,
  content_hash: canonicalHash(grantContent),
  issued_by: { ...command.actor, actor_kind: "human" },
  issued_at: "2026-09-01T00:00:00.000Z",
};

const resultingRelationship = structuredClone(priorRelationship);
resultingRelationship.revision = 2;
resultingRelationship.content_hash = `sha256:${"8".repeat(64)}`;
const resultingReview = structuredClone(review);
resultingReview.revision = 2;
resultingReview.content_hash = `sha256:${"9".repeat(64)}`;
const receiptContent: PetraReviewCandidateCorrectionReceipt["content"] = {
  command_ref: {
    command_id: command.command_id,
    idempotency_key: command.idempotency_key,
    command_name: "CorrectReviewCandidate",
    command_fingerprint: `sha256:${"1".repeat(64)}`,
    actor: structuredClone(command.actor),
    capability_grant_id: command.capability_grant_id,
    correlation_id: command.correlation_id,
  },
  review_member_id: member.review_member_id,
  prior_review_session_ref: {
    review_session_id: review.review_session_id,
    revision: review.revision,
    content_hash: review.content_hash,
    record_hash: canonicalHash(review),
    lifecycle: "open",
  },
  resulting_review_session_ref: {
    review_session_id: resultingReview.review_session_id,
    revision: resultingReview.revision,
    content_hash: resultingReview.content_hash,
    record_hash: canonicalHash(resultingReview),
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
    record_id: correctedCandidate.working_candidate_id,
    revision: correctedCandidate.revision,
    content_hash: correctedCandidate.content_hash,
    record_hash: canonicalHash(correctedCandidate),
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
    record_id: resultingRelationship.working_relationship_id,
    revision: resultingRelationship.revision,
    content_hash: resultingRelationship.content_hash,
    record_hash: canonicalHash(resultingRelationship),
  },
  prior_profile_record_ref: {
    schema_name: "petra.claim",
    schema_version: "1.0.0",
    record_id: correctedClaim.claim_id,
    revision: correctedClaim.revision - 1,
    record_hash: `sha256:${"2".repeat(64)}`,
  },
  resulting_profile_record_ref: {
    schema_name: "petra.claim",
    schema_version: "1.0.0",
    record_id: correctedClaim.claim_id,
    revision: correctedClaim.revision,
    record_hash: canonicalHash(correctedClaim),
  },
  correction_kind: "material_revision",
  basis_transition: "retained_exact_scientific_source",
  validation: {
    state: correctedCandidate.validation.state,
    target_record_hash: correctedCandidate.validation.target_record_hash,
    validator_refs: correctedCandidate.validation.results.map((result) =>
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
    "review_correction_receipt_01K4D000000000000000000104",
  revision: 1,
  project_id: command.project_id,
  content: receiptContent,
  content_hash: canonicalHash(receiptContent),
  recorded_at: "2026-09-12T21:00:01.000Z",
};

describe("Review candidate-correction contracts", () => {
  const contracts = new PetraContractRegistry();

  it("accepts the exact command, capability, and non-authoritative receipt", () => {
    expect(() =>
      contracts.assertValid("command-envelope", "1.6.0", command),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("capability-grant", "1.5.0", grant),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid(
        "review-candidate-correction-receipt",
        "1.0.0",
        receipt,
      ),
    ).not.toThrow();
  });

  it("accepts only the registered human Claim text field for server composition", () => {
    expect(() =>
      contracts.assertValid("command-envelope", "1.7.0", humanEditCommand),
    ).not.toThrow();

    const extraField = structuredClone(humanEditCommand) as unknown as Record<
      string,
      unknown
    >;
    const extraCommand = extraField.command as Record<string, unknown>;
    (extraCommand.correction_input as Record<string, unknown>).scope =
      correctedClaim.scope;
    const blankText = structuredClone(humanEditCommand) as unknown as Record<
      string,
      unknown
    >;
    const blankCommand = blankText.command as Record<string, unknown>;
    blankCommand.correction_input = {
      input_kind: "human_scientific_claim_text_edit",
      canonical_text: "   ",
    };
    for (const invalid of [extraField, blankText]) {
      expect(() =>
        contracts.assertValid("command-envelope", "1.7.0", invalid),
      ).toThrow(ContractRegistryError);
    }
  });

  it("rejects implicit authority and incomplete exact references", () => {
    const implicit = structuredClone(receipt) as unknown as Record<
      string,
      unknown
    >;
    const content = implicit.content as Record<string, unknown>;
    (content.authority_boundary as Record<string, unknown>).review_decision =
      "accepted";
    expect(() =>
      contracts.assertValid(
        "review-candidate-correction-receipt",
        "1.0.0",
        implicit,
      ),
    ).toThrow(ContractRegistryError);

    const incomplete = structuredClone(command) as unknown as Record<
      string,
      unknown
    >;
    delete (
      (incomplete.command as Record<string, unknown>)
        .expected_working_candidate_ref as Record<string, unknown>
    ).content_hash;
    expect(() =>
      contracts.assertValid("command-envelope", "1.6.0", incomplete),
    ).toThrow(ContractRegistryError);
  });
});
