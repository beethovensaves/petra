import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraCapabilityGrantV160,
  PetraClaim,
  PetraCommandEnvelopeV180,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraReviewSessionV110,
  PetraSourceSpan,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "../src/index.js";
import { PetraContractRegistry } from "../src/validator.js";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const contracts = new PetraContractRegistry();
const review = readFixture<PetraReviewSessionV110>(
  "review-session-working-candidate",
);
const definition = readFixture<PetraProjectDefinition>(
  "project-definition-working-scientific",
);
const candidate = readFixture<PetraWorkingCandidate>("working-candidate");
const relationship = readFixture<PetraWorkingRelationship>(
  "working-relationship",
);
const claim = readFixture<PetraClaim>("claim");
const source = readFixture<PetraProjectSource>("project-source");
const span = readFixture<PetraSourceSpan>("source-span");
const member = review.content.members[0];

const envelope: PetraCommandEnvelopeV180 = {
  schema_name: "petra.command-envelope",
  schema_version: "1.8.0",
  command_id: "command_01K4E000000000000000000001",
  idempotency_key: "review-session:001:basis-revision:contract:v1",
  project_id: review.project_id,
  actor: structuredClone(review.content.responsible),
  capability_grant_id: "capability_grant_01K4E000000000000000000002",
  correlation_id: "trace_01K4E000000000000000000003",
  submitted_at: "2026-09-12T22:00:00.000Z",
  command: {
    command_name: "ReviseReviewCandidateBasis",
    expected_review_session_ref: {
      review_session_id: review.review_session_id,
      revision: review.revision,
      content_hash: review.content_hash,
      lifecycle: "open",
    },
    review_member_id: member.review_member_id,
    expected_project_definition_ref: {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    },
    expected_working_candidate_ref: {
      working_candidate_id: candidate.working_candidate_id,
      revision: candidate.revision,
      content_hash: candidate.content_hash,
    },
    expected_working_relationship_ref: {
      working_relationship_id: relationship.working_relationship_id,
      revision: relationship.revision,
      content_hash: relationship.content_hash,
    },
    expected_claim_ref: {
      schema_name: "petra.claim",
      schema_version: "1.0.0",
      record_id: claim.claim_id,
      revision: claim.revision,
      record_hash: canonicalHash(claim),
    },
    basis_revision_input: {
      input_kind: "human_scientific_source_basis_revision",
      project_source_ref: {
        project_source_id: source.project_source_id,
        revision: source.revision,
        content_hash: source.content_hash,
        record_hash: canonicalHash(source),
        status: "active",
      },
      source_span_refs: [
        {
          schema_name: "petra.source-span",
          schema_version: "1.0.0",
          record_id: span.source_span_id,
          revision: 1,
          record_hash: canonicalHash(span),
        },
      ],
      source_scope: "full_text",
      detail_level: "broad",
      source_stance: "qualifies",
      attribution: "The study authors",
      modality: "hedged",
      negated: false,
      uncertainty: "The revised span narrows the reported effect.",
      reason: "The original span omitted a material qualification.",
    },
  },
};

describe("Review candidate material-basis revision contracts", () => {
  it("accepts one exact non-authoritative basis command and capability", () => {
    const grant: PetraCapabilityGrantV160 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.6.0",
      capability_grant_id: envelope.capability_grant_id,
      revision: 1,
      project_id: envelope.project_id,
      grantee: structuredClone(envelope.actor),
      content: {
        scope_kind: "project_commands",
        allowed_commands: ["ReviseReviewCandidateBasis"],
        valid_from: "2026-09-12T21:59:00.000Z",
        reason: "Permit one explicit working-state basis revision.",
      },
      content_hash: `sha256:${"a".repeat(64)}`,
      issued_by: structuredClone(review.content.responsible),
      issued_at: "2026-09-12T21:58:00.000Z",
    };
    grant.content_hash = canonicalHash(grant.content);

    expect(() =>
      contracts.assertValid("command-envelope", "1.8.0", envelope),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("capability-grant", "1.6.0", grant),
    ).not.toThrow();
  });

  it("rejects unsupported basis kinds, implicit authority, and incomplete exact references", () => {
    const unsupported = structuredClone(envelope) as unknown as {
      command: { basis_revision_input: Record<string, unknown> };
    };
    unsupported.command.basis_revision_input.input_kind =
      "human_scientific_synthesis_basis_revision";
    expect(contracts.isValid("command-envelope", "1.8.0", unsupported)).toBe(
      false,
    );

    const implicitAuthority = structuredClone(envelope) as unknown as {
      command: Record<string, unknown>;
    };
    implicitAuthority.command.approved = true;
    expect(
      contracts.isValid("command-envelope", "1.8.0", implicitAuthority),
    ).toBe(false);

    const incomplete = structuredClone(envelope) as unknown as {
      command: {
        basis_revision_input: {
          project_source_ref: Record<string, unknown>;
        };
      };
    };
    delete incomplete.command.basis_revision_input.project_source_ref
      .record_hash;
    expect(contracts.isValid("command-envelope", "1.8.0", incomplete)).toBe(
      false,
    );
  });
});
