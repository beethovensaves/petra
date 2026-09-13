import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import type {
  PetraCapabilityGrantV170,
  PetraCommandEnvelopeV190,
  PetraReviewSessionSeparationReceipt,
  PetraReviewSessionV110,
} from "../src/index.js";
import { PetraContractRegistry } from "../src/validator.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

describe("ReviewSession member-separation contracts", () => {
  const contracts = new PetraContractRegistry();
  const session = readFixture<PetraReviewSessionV110>(
    "review-session-working-candidate",
  );
  const envelope = {
    schema_name: "petra.command-envelope",
    schema_version: "1.9.0",
    command_id: "command_01K4F000000000000000000001",
    idempotency_key: "review-session:001:separate-member:contract:v1",
    project_id: session.project_id,
    actor: structuredClone(session.content.responsible),
    capability_grant_id: "capability_grant_01K4F000000000000000000002",
    correlation_id: "trace_01K4F000000000000000000003",
    submitted_at: "2026-09-12T23:00:00.000Z",
    command: {
      command_name: "SeparateReviewSessionMember",
      expected_review_session_ref: {
        review_session_id: session.review_session_id,
        revision: session.revision,
        content_hash: session.content_hash,
        lifecycle: "open",
      },
      review_member_id: session.content.members[0].review_member_id,
    },
  } as const satisfies PetraCommandEnvelopeV190;

  it("accepts only an exact explicit separation command and capability", () => {
    const grantContent: PetraCapabilityGrantV170["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["SeparateReviewSessionMember"],
      valid_from: "2026-09-12T22:59:00.000Z",
      reason: "Permit explicit Review membership separation.",
    };
    const grant: PetraCapabilityGrantV170 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.7.0",
      capability_grant_id: envelope.capability_grant_id,
      revision: 1,
      project_id: session.project_id,
      grantee: structuredClone(envelope.actor),
      content: grantContent,
      content_hash: canonicalHash(grantContent),
      issued_by: structuredClone(session.content.responsible),
      issued_at: "2026-09-12T22:58:00.000Z",
    };

    expect(() =>
      contracts.assertValid("command-envelope", "1.9.0", envelope),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid("capability-grant", "1.7.0", grant),
    ).not.toThrow();
  });

  it("accepts a receipt that declares the exact partition and no authority effect", () => {
    const governed = structuredClone(envelope) as unknown as Record<
      string,
      unknown
    >;
    delete governed.correlation_id;
    delete governed.submitted_at;
    const content: PetraReviewSessionSeparationReceipt["content"] = {
      command_ref: {
        command_id: envelope.command_id,
        idempotency_key: envelope.idempotency_key,
        command_name: "SeparateReviewSessionMember",
        command_fingerprint: canonicalHash(governed),
        actor: structuredClone(envelope.actor),
        capability_grant_id: envelope.capability_grant_id,
        correlation_id: envelope.correlation_id,
      },
      source_prior_review_session_ref: {
        ...structuredClone(envelope.command.expected_review_session_ref),
        record_hash: canonicalHash(session),
      },
      source_resulting_review_session_ref: {
        review_session_id: session.review_session_id,
        revision: 2,
        content_hash: `sha256:${"1".repeat(64)}`,
        record_hash: `sha256:${"2".repeat(64)}`,
        lifecycle: "open",
      },
      separated_review_session_ref: {
        review_session_id: "review_session_01K4F000000000000000000004",
        revision: 1,
        content_hash: `sha256:${"3".repeat(64)}`,
        record_hash: `sha256:${"4".repeat(64)}`,
        lifecycle: "open",
      },
      partition: {
        separated_review_member_id: envelope.command.review_member_id,
        retained_review_member_ids: [
          "review_member_01K4F000000000000000000005",
        ],
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
        "review_separation_receipt_01K4F000000000000000000006",
      revision: 1,
      project_id: session.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: "2026-09-12T23:00:00.100Z",
    };

    expect(() =>
      contracts.assertValid(
        "review-session-separation-receipt",
        "1.0.0",
        receipt,
      ),
    ).not.toThrow();
  });

  it("rejects implicit authority, client-selected destination identity, and incomplete exact input", () => {
    const implicit = structuredClone(envelope) as unknown as {
      command: Record<string, unknown>;
    };
    implicit.command.approved = true;
    expect(contracts.isValid("command-envelope", "1.9.0", implicit)).toBe(
      false,
    );

    const destination = structuredClone(envelope) as unknown as {
      command: Record<string, unknown>;
    };
    destination.command.separated_review_session_id =
      "review_session_01K4F000000000000000000007";
    expect(contracts.isValid("command-envelope", "1.9.0", destination)).toBe(
      false,
    );

    const incomplete = structuredClone(envelope) as unknown as {
      command: { expected_review_session_ref: Record<string, unknown> };
    };
    delete incomplete.command.expected_review_session_ref.content_hash;
    expect(contracts.isValid("command-envelope", "1.9.0", incomplete)).toBe(
      false,
    );
  });
});
