import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraAssertion,
  PetraClaim,
  PetraCommandEnvelope,
  PetraParsedDocument,
  PetraProjectHistoryCompensationPreviewView,
  PetraSourceSpan,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  buildCompensatingReversalCommandPlan,
  buildPreviewBoundCompensatingReversalCommandPlan,
  executeCompensatingReversalPlan,
} from "../src/evidence-review.js";
import {
  InMemoryEvidenceRegistry,
  type EvidenceSourceResolver,
} from "../src/evidence-registry.js";
import { replayScientificAuthority } from "../src/authority-event-replay.js";

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

const setupPromotedPair = () => {
  const claim = readFixture<PetraClaim>("claim");
  const assertion = readFixture<PetraAssertion>("assertion");
  const span = readFixture<PetraSourceSpan>("source-span");
  const document = readFixture<PetraParsedDocument>("parsed-document");
  const submit = readFixture<PetraCommandEnvelope>("command-submit-change-set");
  const review = readFixture<PetraCommandEnvelope>("command-record-approval");
  const apply = readFixture<PetraCommandEnvelope>("command-apply-change-set");
  const resolver: EvidenceSourceResolver = {
    getSourceSpan: (id) => (id === span.source_span_id ? span : undefined),
    getParsedDocument: (id) =>
      id === document.parsed_document_id ? document : undefined,
  };
  const registry = new InMemoryEvidenceRegistry(resolver, {
    authorize: () => true,
  });
  registry.proposeEvidencePair({ claim, assertion });
  registry.executeCommand(submit);
  registry.executeCommand(review);
  const promoted = registry.executeCommand(apply);
  if (
    promoted.outcome !== "applied" ||
    submit.command.command_name !== "SubmitChangeSet" ||
    review.command.command_name !== "RecordApproval"
  ) {
    throw new Error("Expected the accepted promotion fixture pipeline.");
  }
  const trustedClaim = registry.getClaim(claim.claim_id);
  const trustedAssertion = registry.getAssertion(assertion.assertion_id);
  if (trustedClaim === undefined || trustedAssertion === undefined) {
    throw new Error("Expected promoted evidence.");
  }
  const plan = buildCompensatingReversalCommandPlan({
    project_id: submit.project_id,
    claim: structuredClone(trustedClaim) as PetraClaim,
    assertion: structuredClone(trustedAssertion) as PetraAssertion,
    compensates_change_set_id: submit.command.change_set.change_set_id,
    proposed_by: review.command.approval.decided_by,
    reviewer: review.command.approval.decided_by,
    capability_grant_id: submit.capability_grant_id,
    reason: "The direct evidence review was corrected by the researcher.",
    rationale:
      "Remove the pair from active scientific authority while retaining its history.",
    impact_summary: "The Claim and its ASSERTS edge leave active authority.",
    timing: {
      proposed_at: "2026-08-30T10:00:00.000Z",
      decided_at: "2026-08-30T10:01:00.000Z",
      applied_at: "2026-08-30T10:02:00.000Z",
    },
  });
  return { registry, claim, assertion, promoted, plan };
};

describe("compensating scientific-authority reversal", () => {
  it("composes a preview-bound plan with each exact command grant and no execution", () => {
    const preview = readFixture<PetraProjectHistoryCompensationPreviewView>(
      "project-history-compensation-preview-view",
    );
    preview.content.command_sequence[1].grant_ref.capability_grant_id =
      "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBK";
    preview.content.command_sequence[2].grant_ref.capability_grant_id =
      "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBM";

    const plan = buildPreviewBoundCompensatingReversalCommandPlan({
      preview,
      reason: "Retract the exact pair after explicit confirmation.",
      rationale: "The exact authority and impact basis were reviewed.",
      composed_at: "2026-09-10T18:31:00.000Z",
    });

    expect(plan.change_set.content.operations).toEqual(
      preview.content.operation_preview.map((operation) => ({
        operation_kind: operation.operation_kind,
        target_id: operation.target_id,
        base_revision: operation.base_revision,
        before: operation.before,
        after: operation.after,
      })),
    );
    expect(
      [plan.submit, plan.review, plan.apply].map(
        ({ capability_grant_id }) => capability_grant_id,
      ),
    ).toEqual(
      preview.content.command_sequence.map(
        ({ grant_ref }) => grant_ref.capability_grant_id,
      ),
    );
    expect(plan.change_set.content.compensates_change_set_id).toBe(
      preview.content.compensates_change_set.change_set_id,
    );
  });

  it("retracts a trusted pair without erasing its promotion history", async () => {
    const { registry, claim, assertion, promoted, plan } = setupPromotedPair();

    const result = await executeCompensatingReversalPlan(registry, plan);

    const contracts = new PetraContractRegistry();
    contracts.assertValid("change-set", "1.1.0", plan.change_set);
    for (const command of [plan.submit, plan.review, plan.apply]) {
      contracts.assertValid("command-envelope", "1.1.0", command);
    }
    for (const event of registry.getEvents().slice(-3)) {
      contracts.assertValid("domain-event", "1.1.0", event);
    }
    for (const outbox of registry.getOutboxRecords().slice(-4)) {
      contracts.assertValid("outbox-record", "1.1.0", outbox);
    }

    expect(result).toEqual(
      expect.objectContaining({
        outcome: "reverted",
        compensates_change_set_id: promoted.change_set_id,
        claim_revision: 3,
        assertion_revision: 3,
      }),
    );
    expect(registry.getChangeSetState(promoted.change_set_id)).toBe("reverted");
    expect(registry.getChangeSetState(plan.change_set.change_set_id)).toBe(
      "applied",
    );
    expect(registry.getClaim(claim.claim_id)?.authority).toEqual({
      zone: "quarantine",
      review_state: "human_rejected",
    });
    expect(registry.getAssertion(assertion.assertion_id)?.authority).toEqual({
      zone: "quarantine",
      review_state: "human_rejected",
    });
    expect(registry.getClaimRevision(claim.claim_id, 2)?.authority.zone).toBe(
      "trusted",
    );
    expect(
      registry.getAssertionRevision(assertion.assertion_id, 2)?.authority.zone,
    ).toBe("trusted");

    const reversalEvent = registry.getEvents().at(-1);
    expect(reversalEvent?.schema_version).toBe("1.1.0");
    expect(reversalEvent?.event.event_type).toBe("change_set.reverted");
    if (reversalEvent?.event.event_type !== "change_set.reverted") {
      throw new Error("Expected a reversal event.");
    }
    expect(reversalEvent.event.payload.prior_claim_revision).toBe(2);
    expect(reversalEvent.event.payload.claim.revision).toBe(3);
    expect(
      registry.getOutboxRecords("neo4j_graph").at(-1)?.message.event.event
        .event_type,
    ).toBe("change_set.reverted");

    const replay = replayScientificAuthority(
      plan.submit.project_id,
      registry.getEvents(),
    );
    expect(replay.claims[0]?.authority).toEqual({
      zone: "quarantine",
      review_state: "human_rejected",
    });
    expect(replay.assertions[0]?.authority).toEqual({
      zone: "quarantine",
      review_state: "human_rejected",
    });
    expect(replay.revertedChangeSetIds).toEqual([
      result.compensates_change_set_id,
    ]);
  });

  it("returns the same result for an exact reversal retry", async () => {
    const { registry, plan } = setupPromotedPair();
    const first = await executeCompensatingReversalPlan(registry, plan);
    const replay = registry.executeCommand(structuredClone(plan.apply));

    expect(replay).toBe(first);
    expect(registry.getClaim(first.claim_id)?.revision).toBe(3);
  });

  it("rejects compensation that does not name the original promotion", () => {
    const { registry, plan } = setupPromotedPair();
    const invalid = structuredClone(plan.submit);
    if (invalid.command.command_name !== "SubmitChangeSet") {
      throw new Error("Expected reversal submission.");
    }
    invalid.command.change_set.content.compensates_change_set_id =
      "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBP";
    invalid.command.change_set.content_hash = `sha256:${createHash("sha256")
      .update(canonicalize(invalid.command.change_set.content))
      .digest("hex")}`;

    expect(() => registry.executeCommand(invalid)).toThrow(
      expect.objectContaining({ code: "CHANGE_SET_COMPENSATION_INVALID" }),
    );
  });
});
