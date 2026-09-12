import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import type {
  PetraCapabilityGrantV130,
  PetraCommandEnvelopeV140,
  PetraReviewSessionLifecycleReceipt,
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

describe("ReviewSession lifecycle command contracts", () => {
  const contracts = new PetraContractRegistry();
  const session = readFixture<PetraReviewSessionV110>(
    "review-session-working-candidate",
  );
  const deferEnvelope = {
    schema_name: "petra.command-envelope",
    schema_version: "1.4.0",
    command_id: "command_01K4D000000000000000000040",
    idempotency_key: "review-session:001:defer:v1",
    project_id: session.project_id,
    actor: structuredClone(session.created_by),
    capability_grant_id: "capability_grant_01K4D000000000000000000041",
    correlation_id: "trace_01K4D000000000000000000042",
    submitted_at: "2026-09-12T18:00:00.000Z",
    command: {
      command_name: "DeferReviewSession",
      expected_review_session_ref: {
        review_session_id: session.review_session_id,
        revision: session.revision,
        content_hash: session.content_hash,
        lifecycle: "open",
      },
      rationale: "Decide after checking the material limitation.",
    },
  } as const satisfies PetraCommandEnvelopeV140;
  const fingerprintInput = structuredClone(deferEnvelope) as unknown as Record<
    string,
    unknown
  >;
  delete fingerprintInput.correlation_id;
  delete fingerprintInput.submitted_at;
  const commandFingerprint = canonicalHash(fingerprintInput);
  const resultingContent = {
    ...structuredClone(session.content),
    lifecycle: "deferred" as const,
  };
  const receiptContent: PetraReviewSessionLifecycleReceipt["content"] = {
    command_ref: {
      command_id: deferEnvelope.command_id,
      idempotency_key: deferEnvelope.idempotency_key,
      command_name: "DeferReviewSession",
      command_fingerprint: commandFingerprint,
      actor: structuredClone(deferEnvelope.actor),
      capability_grant_id: deferEnvelope.capability_grant_id,
      correlation_id: deferEnvelope.correlation_id,
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
      lifecycle: "deferred",
    },
    transition: "deferred",
    rationale: deferEnvelope.command.rationale,
    preservation: {
      review_history: "retained",
      working_candidates: "retained",
      working_relationships: "retained",
      change_sets: "retained",
      approvals: "retained",
      command_events: "retained_unchanged",
      projection_receipts: "retained_unchanged",
    },
    authority_boundary: {
      review_decision: "none",
      domain_authority: "unchanged",
      change_set_authority: "none",
      validation_authority: "none",
      domain_event_effect: "none",
      projection_effect: "none",
    },
    recovery: {
      state: "available",
      inverse_command_name: "ReopenReviewSession",
      expected_review_session_ref: {
        review_session_id: session.review_session_id,
        revision: session.revision + 1,
        content_hash: canonicalHash(resultingContent),
        record_hash: `sha256:${"1".repeat(64)}`,
        lifecycle: "deferred",
      },
    },
  };
  const receipt: PetraReviewSessionLifecycleReceipt = {
    schema_name: "petra.review-session-lifecycle-receipt",
    schema_version: "1.0.0",
    review_session_lifecycle_receipt_id:
      "review_session_lifecycle_receipt_01K4D000000000000000000043",
    revision: 1,
    project_id: session.project_id,
    content: receiptContent,
    content_hash: canonicalHash(receiptContent),
    recorded_at: "2026-09-12T18:00:00.100Z",
  };

  it("accepts exact defer/reopen commands and an explicit no-authority receipt", () => {
    contracts.assertValid("command-envelope", "1.4.0", deferEnvelope);
    contracts.assertValid("review-session-lifecycle-receipt", "1.0.0", receipt);
    expect(receipt.content.authority_boundary).toEqual({
      review_decision: "none",
      domain_authority: "unchanged",
      change_set_authority: "none",
      validation_authority: "none",
      domain_event_effect: "none",
      projection_effect: "none",
    });

    const reopen = {
      ...deferEnvelope,
      command_id: "command_01K4D000000000000000000044",
      idempotency_key: "review-session:001:reopen:v1",
      command: {
        command_name: "ReopenReviewSession",
        expected_review_session_ref: {
          review_session_id: session.review_session_id,
          revision: session.revision + 1,
          content_hash:
            receiptContent.resulting_review_session_ref.content_hash,
          lifecycle: "deferred",
        },
      },
    } as const satisfies PetraCommandEnvelopeV140;
    contracts.assertValid("command-envelope", "1.4.0", reopen);
  });

  it("rejects conversation-carried authority and invalid lifecycle direction", () => {
    const conversational = structuredClone(deferEnvelope) as unknown as {
      command: Record<string, unknown>;
    };
    conversational.command.conversation_approved = true;
    expect(contracts.isValid("command-envelope", "1.4.0", conversational)).toBe(
      false,
    );

    const wrongLifecycle = structuredClone(deferEnvelope) as unknown as {
      command: { expected_review_session_ref: { lifecycle: string } };
    };
    wrongLifecycle.command.expected_review_session_ref.lifecycle = "deferred";
    expect(contracts.isValid("command-envelope", "1.4.0", wrongLifecycle)).toBe(
      false,
    );
  });

  it("registers only the additive exact Review lifecycle capabilities", () => {
    const content: PetraCapabilityGrantV130["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["DeferReviewSession", "ReopenReviewSession"],
      valid_from: "2026-09-12T17:59:00.000Z",
      reason: "Allow the responsible human to defer and reopen exact Reviews.",
    };
    const grant: PetraCapabilityGrantV130 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.3.0",
      capability_grant_id: deferEnvelope.capability_grant_id,
      revision: 1,
      project_id: session.project_id,
      grantee: structuredClone(deferEnvelope.actor),
      content,
      content_hash: canonicalHash(content),
      issued_by: structuredClone(session.created_by),
      issued_at: "2026-09-12T17:58:00.000Z",
    };
    contracts.assertValid("capability-grant", "1.3.0", grant);
    const arbitrary = structuredClone(grant) as unknown as {
      content: { allowed_commands: string[] };
    };
    arbitrary.content.allowed_commands.push("SetReviewState");
    expect(contracts.isValid("capability-grant", "1.3.0", arbitrary)).toBe(
      false,
    );
  });
});
