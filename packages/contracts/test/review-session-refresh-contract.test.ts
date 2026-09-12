import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import type {
  PetraCapabilityGrantV140,
  PetraCommandEnvelopeV150,
  PetraReviewSessionRefreshReceipt,
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

describe("ReviewSession refresh contracts", () => {
  const contracts = new PetraContractRegistry();
  const session = readFixture<PetraReviewSessionV110>(
    "review-session-working-candidate",
  );
  const envelope = {
    schema_name: "petra.command-envelope",
    schema_version: "1.5.0",
    command_id: "command_01K4D000000000000000000081",
    idempotency_key: "review-session:001:refresh:v1",
    project_id: session.project_id,
    actor: structuredClone(session.created_by),
    capability_grant_id: "capability_grant_01K4D000000000000000000082",
    correlation_id: "trace_01K4D000000000000000000083",
    submitted_at: "2026-09-12T20:00:00.000Z",
    command: {
      command_name: "RefreshReviewSession",
      expected_review_session_ref: {
        review_session_id: session.review_session_id,
        revision: session.revision,
        content_hash: session.content_hash,
        lifecycle: "open",
      },
    },
  } as const satisfies PetraCommandEnvelopeV150;
  const governed = structuredClone(envelope) as unknown as Record<
    string,
    unknown
  >;
  delete governed.correlation_id;
  delete governed.submitted_at;
  const fingerprint = canonicalHash(governed);
  const resultingContent = structuredClone(session.content);
  resultingContent.snapshot = {
    event_position: resultingContent.snapshot.event_position + 1,
    stream_revision: resultingContent.snapshot.stream_revision + 1,
    captured_at: "2026-09-12T20:00:00.100Z",
  };
  const receiptContent: PetraReviewSessionRefreshReceipt["content"] = {
    command_ref: {
      command_id: envelope.command_id,
      idempotency_key: envelope.idempotency_key,
      command_name: "RefreshReviewSession",
      command_fingerprint: fingerprint,
      actor: structuredClone(envelope.actor),
      capability_grant_id: envelope.capability_grant_id,
      correlation_id: envelope.correlation_id,
    },
    prior_review_session_ref: {
      review_session_id: session.review_session_id,
      revision: session.revision,
      content_hash: session.content_hash,
      record_hash: canonicalHash(session),
      lifecycle: "open",
    },
    resulting_review_session_ref: {
      review_session_id: session.review_session_id,
      revision: session.revision + 1,
      content_hash: canonicalHash(resultingContent),
      record_hash: `sha256:${"1".repeat(64)}`,
      lifecycle: "open",
    },
    transition: "refreshed",
    refresh_basis: {
      selection_basis: "same_review_members_current_working_heads",
      prior_snapshot: structuredClone(session.content.snapshot),
      resulting_snapshot: structuredClone(resultingContent.snapshot),
      members: session.content.members.map((member) => ({
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
      "review_session_refresh_receipt_01K4D000000000000000000084",
    revision: 1,
    project_id: session.project_id,
    content: receiptContent,
    content_hash: canonicalHash(receiptContent),
    recorded_at: "2026-09-12T20:00:00.100Z",
  };

  it("accepts an exact refresh command and explicit no-authority result", () => {
    contracts.assertValid("command-envelope", "1.5.0", envelope);
    const validateReceipt = contracts.validator(
      "review-session-refresh-receipt",
      "1.0.0",
    );
    expect(
      validateReceipt(receipt),
      JSON.stringify(validateReceipt.errors),
    ).toBe(true);
    expect(receipt.content.authority_boundary).toEqual({
      review_decision: "none",
      domain_authority: "unchanged",
      candidate_authority: "none",
      validation_authority: "none",
      change_set_authority: "none",
      approval_authority: "none",
      domain_event_effect: "none",
      projection_effect: "none",
    });
  });

  it("rejects conversational authority, a deferred source, and client-selected members", () => {
    for (const candidate of [
      {
        ...structuredClone(envelope),
        conversation_approved: true,
      },
      {
        ...structuredClone(envelope),
        command: {
          ...structuredClone(envelope.command),
          expected_review_session_ref: {
            ...structuredClone(envelope.command.expected_review_session_ref),
            lifecycle: "deferred",
          },
        },
      },
      {
        ...structuredClone(envelope),
        command: {
          ...structuredClone(envelope.command),
          member_ids: [session.content.members[0].review_member_id],
        },
      },
    ]) {
      expect(contracts.isValid("command-envelope", "1.5.0", candidate)).toBe(
        false,
      );
    }
  });

  it("registers only explicit additive refresh capability", () => {
    const content: PetraCapabilityGrantV140["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["RefreshReviewSession"],
      valid_from: "2026-09-12T19:59:00.000Z",
      reason: "Allow the responsible human to refresh an exact open Review.",
    };
    const grant: PetraCapabilityGrantV140 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.4.0",
      capability_grant_id: envelope.capability_grant_id,
      revision: 1,
      project_id: session.project_id,
      grantee: structuredClone(envelope.actor),
      content,
      content_hash: canonicalHash(content),
      issued_by: structuredClone(session.created_by),
      issued_at: "2026-09-12T19:58:00.000Z",
    };
    contracts.assertValid("capability-grant", "1.4.0", grant);
    const arbitrary = structuredClone(grant) as unknown as {
      content: { allowed_commands: string[] };
    };
    arbitrary.content.allowed_commands.push("ReplaceReviewSession");
    expect(contracts.isValid("capability-grant", "1.4.0", arbitrary)).toBe(
      false,
    );
  });
});
