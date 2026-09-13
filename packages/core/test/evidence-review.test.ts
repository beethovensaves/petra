import { readFileSync } from "node:fs";

import type {
  PetraClaim,
  PetraDocumentParseBundle,
  PetraEvidenceProposalBundle,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { describe, expect, it, vi } from "vitest";

import { buildDeterministicEvidenceProposalBundle } from "../src/deterministic-evidence-extraction.js";
import { admitEvidenceProposalBundle } from "../src/evidence-proposal-admission.js";
import { InMemoryEvidenceRegistry } from "../src/evidence-registry.js";
import {
  buildEvidenceReviewBatchView,
  buildHumanCorrectionProposal,
  buildReviewDecisionCommandPlan,
  executeReviewBatch,
  executeReviewDecisionPlan,
  type ReviewDecisionCommandPlan,
} from "../src/evidence-review.js";

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

const HUMAN = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FC0",
  actor_kind: "human" as const,
};
const CAPABILITY = "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ";
const PROJECT = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";

const timing = (minute = 13) => ({
  proposed_at: `2026-08-28T18:${String(minute).padStart(2, "0")}:00.000Z`,
  decided_at: `2026-08-28T18:${String(minute).padStart(2, "0")}:01.000Z`,
  applied_at: `2026-08-28T18:${String(minute).padStart(2, "0")}:02.000Z`,
});

const evidenceRegistry = (source: PetraDocumentParseBundle) =>
  new InMemoryEvidenceRegistry(
    {
      getSourceSpan: (sourceSpanId) =>
        source.spans.find((span) => span.source_span_id === sourceSpanId),
      getParsedDocument: (parsedDocumentId) =>
        source.document.parsed_document_id === parsedDocumentId
          ? source.document
          : undefined,
    },
    { authorize: () => true },
  );

const setup = () => {
  const source = readFixture<PetraDocumentParseBundle>("document-parse-bundle");
  const proposal = readFixture<PetraEvidenceProposalBundle>(
    "evidence-proposal-bundle",
  );
  const registry = evidenceRegistry(source);
  const admission = admitEvidenceProposalBundle(proposal, source, registry);
  const candidate = proposal.content.candidates[0];
  return { source, proposal, registry, admission, candidate };
};

const decisionPlan = (
  candidate: PetraEvidenceProposalBundle["content"]["candidates"][number],
  decision: "accepted" | "rejected",
  minute = 13,
  reason = "Review the exact source-grounded Claim and ASSERTS pair.",
): ReviewDecisionCommandPlan =>
  buildReviewDecisionCommandPlan({
    project_id: PROJECT,
    candidate,
    origin: "worker_proposal",
    proposed_by: candidate.claim.created_by,
    reviewer: HUMAN,
    capability_grant_id: CAPABILITY,
    decision,
    reason,
    rationale:
      decision === "accepted"
        ? "The scoped representation matches the exact source passage."
        : "The proposed representation is not suitable for trusted use.",
    impact_summary:
      "This decision changes representation authority, not the proposition's truth value.",
    timing: timing(minute),
  });

describe("evidence review projection and commands", () => {
  it.each([
    ["submitted", "command_id"],
    ["submitted", "change_set_id"],
    ["submitted", "change_set_state"],
    ["approval_recorded", "command_id"],
    ["approval_recorded", "change_set_id"],
    ["approval_recorded", "approval_id"],
    ["approval_recorded", "change_set_state"],
    ["applied", "command_id"],
    ["applied", "change_set_id"],
    ["applied", "approval_id"],
    ["applied", "change_set_state"],
    ["applied", "claim_id"],
    ["applied", "claim_revision"],
    ["applied", "assertion_id"],
    ["applied", "assertion_revision"],
    ["applied", "applied_at"],
  ])(
    "stops on a mismatched %s %s without claiming no effect",
    async (outcome, field) => {
      const { registry, candidate } = setup();
      const plan = decisionPlan(candidate, "accepted");
      const executeCommand = vi.fn(
        (envelope: Parameters<typeof registry.executeCommand>[0]) => {
          const result = registry.executeCommand(envelope);
          return result.outcome === outcome
            ? {
                ...result,
                [field]: field.endsWith("revision") ? 99 : "mismatched",
              }
            : result;
        },
      );
      await expect(
        executeReviewDecisionPlan({ executeCommand }, plan),
      ).rejects.toMatchObject({
        code: "REVIEW_COMMAND_RESULT_MISMATCH",
        message: expect.stringContaining("may have taken effect") as unknown,
      });
      expect(executeCommand).toHaveBeenCalledTimes(
        outcome === "submitted" ? 1 : outcome === "approval_recorded" ? 2 : 3,
      );
      expect(registry.getChangeSetState(plan.change_set.change_set_id)).toBe(
        outcome === "submitted"
          ? "submitted"
          : outcome === "approval_recorded"
            ? "approved"
            : "applied",
      );
      // Reconciliation through the same owning idempotency contract returns the
      // retained prefix and completes only the commands that did not run.
      const reconciled = await executeReviewDecisionPlan(registry, plan);
      expect(reconciled.outcome).toBe("applied");
      expect(registry.getEvents()).toHaveLength(3);
      expect(registry.getClaim(candidate.claim.claim_id)?.revision).toBe(2);
    },
  );

  it("never reports rejection from an approval result for another decision", async () => {
    const { registry, candidate } = setup();
    const plan = decisionPlan(candidate, "rejected");
    await expect(
      executeReviewDecisionPlan(
        {
          executeCommand: (envelope) => {
            const result = registry.executeCommand(envelope);
            return result.outcome === "approval_recorded"
              ? { ...result, change_set_state: "approved" }
              : result;
          },
        },
        plan,
      ),
    ).rejects.toMatchObject({ code: "REVIEW_COMMAND_RESULT_MISMATCH" });
    expect(registry.getClaim(candidate.claim.claim_id)?.authority.zone).toBe(
      "quarantine",
    );
  });

  it.each(["submit", "approval", "apply", "partial", "rejected_with_apply"])(
    "rejects a rebound or incomplete %s plan before sending any command",
    async (fault) => {
      const { registry, candidate } = setup();
      const plan = structuredClone(decisionPlan(candidate, "accepted"));
      if (fault === "submit") plan.submit.project_id = "project_mismatch";
      if (
        fault === "approval" &&
        plan.review.command.command_name === "RecordApproval"
      ) {
        plan.review.command.approval.subject.change_set_content_hash =
          "sha256:mismatch";
      }
      if (
        fault === "apply" &&
        plan.apply?.command.command_name === "ApplyChangeSet"
      ) {
        plan.apply.command.approval_id = "approval_mismatch";
      }
      if (fault === "partial") plan.change_set.content.operations.pop();
      const input =
        fault === "rejected_with_apply"
          ? { ...plan, decision: "rejected" as const }
          : plan;
      const executeCommand = vi.fn(registry.executeCommand.bind(registry));
      await expect(
        executeReviewDecisionPlan({ executeCommand }, input),
      ).rejects.toMatchObject({
        code: "REVIEW_COMMAND_PLAN_MISMATCH",
      });
      expect(executeCommand).not.toHaveBeenCalled();
      expect(registry.getEvents()).toHaveLength(0);
    },
  );

  it("captures the exact plan before an executor yields", async () => {
    const { registry, candidate } = setup();
    const plan = structuredClone(decisionPlan(candidate, "accepted"));
    const applyId = plan.apply?.command_id;
    const executeCommand = vi.fn(
      async (envelope: Parameters<typeof registry.executeCommand>[0]) => {
        await Promise.resolve();
        if (plan.apply !== undefined) plan.apply.command_id = "command_rebound";
        return registry.executeCommand(envelope);
      },
    );
    await expect(
      executeReviewDecisionPlan({ executeCommand }, plan),
    ).resolves.toMatchObject({ outcome: "applied" });
    expect(executeCommand.mock.calls[2]?.[0].command_id).toBe(applyId);
  });

  it("shows source, scope, origin, and validation in one immutable review item", () => {
    const { source, proposal, admission } = setup();

    const view = buildEvidenceReviewBatchView(proposal, source, admission);
    const item = view.items[0];

    expect(view).toMatchObject({
      reviewable_count: 1,
      blocked_count: 0,
      source_quality_state: "complete",
    });
    expect(item).toMatchObject({
      proposed_action: "review_promotion",
      admission: { outcome: "admitted" },
      source: {
        source_scope: "full_text",
        exact_quote: "The study reports a measurable improvement.",
        spans: [
          {
            page_numbers: [1],
            verification_status: "exact_text_and_geometry",
            structural_path: ["Results", "Paragraph 1"],
          },
        ],
      },
      origin: { extraction_kind: "deterministic_mapping" },
    });
    expect(item?.claim.scope).toHaveProperty("task");
    expect(item?.extractor_validation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          validator_name: "source-span-resolution",
          outcome: "pass",
        }),
      ]),
    );
    expect(Object.isFrozen(view.items)).toBe(true);
    expect(Object.isFrozen(item?.source.spans)).toBe(true);
  });

  it("builds contract-valid commands and promotes an accepted pair atomically", async () => {
    const { registry, candidate } = setup();
    const plan = decisionPlan(candidate, "accepted");
    const contracts = new PetraContractRegistry();

    contracts.assertValid("change-set", "1.0.0", plan.change_set);
    contracts.assertValid("command-envelope", "1.0.0", plan.submit);
    contracts.assertValid("command-envelope", "1.0.0", plan.review);
    contracts.assertValid("command-envelope", "1.0.0", plan.apply);
    const result = await executeReviewDecisionPlan(registry, plan);

    expect(result).toMatchObject({
      outcome: "applied",
      claim_revision: 2,
      assertion_revision: 2,
    });
    expect(registry.getClaim(candidate.claim.claim_id)?.authority.zone).toBe(
      "trusted",
    );
    expect(
      registry.getAssertion(candidate.assertion.assertion_id)?.authority.zone,
    ).toBe("trusted");
  });

  it("records rejection without mutating the quarantine proposal", async () => {
    const { registry, candidate } = setup();
    const plan = decisionPlan(candidate, "rejected");

    const result = await executeReviewDecisionPlan(registry, plan);

    expect(result.outcome).toBe("rejected");
    expect(registry.getChangeSetState(plan.change_set.change_set_id)).toBe(
      "rejected",
    );
    expect(registry.getClaim(candidate.claim.claim_id)).toEqual(
      candidate.claim,
    );
    expect(registry.getAssertion(candidate.assertion.assertion_id)).toEqual(
      candidate.assertion,
    );
    expect(
      registry
        .getOutboxRecords("neo4j_graph")
        .some(
          (record) =>
            record.message.event.event.event_type === "change_set.applied",
        ),
    ).toBe(false);
  });

  it("preserves a rejected original and promotes a human correction with lineage", async () => {
    const { source, registry, candidate } = setup();
    await executeReviewDecisionPlan(
      registry,
      decisionPlan(candidate, "rejected"),
    );
    const correction = buildHumanCorrectionProposal({
      source_bundle: source,
      original: candidate,
      project_id: PROJECT,
      corrected_by: HUMAN,
      corrected_at: "2026-08-28T18:14:00.000Z",
      candidate_key: "human-scope-correction",
      canonical_text:
        "For the study-defined task, the authors report a measurable improvement.",
    });
    new PetraContractRegistry().assertValid(
      "evidence-proposal-bundle",
      "1.0.0",
      correction,
    );
    const admission = admitEvidenceProposalBundle(correction, source, registry);
    expect(admission).toMatchObject({ admitted_count: 1, rejected_count: 0 });
    const corrected = correction.content.candidates[0];
    const correctedPlan = buildReviewDecisionCommandPlan({
      project_id: PROJECT,
      candidate: corrected,
      origin: "direct_edit",
      proposed_by: HUMAN,
      reviewer: HUMAN,
      capability_grant_id: CAPABILITY,
      decision: "accepted",
      reason: "Apply the researcher's source-grounded scope correction.",
      rationale:
        "The corrected wording narrows the proposition to the reported task.",
      impact_summary:
        "The corrected pair supersedes the rejected proposal while retaining both histories.",
      timing: timing(15),
    });

    await executeReviewDecisionPlan(registry, correctedPlan);

    expect(registry.getClaim(candidate.claim.claim_id)?.authority.zone).toBe(
      "quarantine",
    );
    expect(registry.getClaim(corrected.claim.claim_id)).toMatchObject({
      supersedes_claim_id: candidate.claim.claim_id,
      authority: { zone: "trusted" },
      basis: {
        derivation: { derivation_kind: "human_extraction" },
      },
    });
    expect(
      registry.getAssertion(corrected.assertion.assertion_id),
    ).toMatchObject({
      supersedes_assertion_id: candidate.assertion.assertion_id,
      authority: { zone: "trusted" },
    });
  });

  it.each(["stale", "mismatched_result"])(
    "retains independent batch outcomes after %s",
    async (failure) => {
      const source = readFixture<PetraDocumentParseBundle>(
        "document-parse-bundle",
      );
      const claim = readFixture<PetraClaim>("claim");
      const proposal = buildDeterministicEvidenceProposalBundle(source, {
        recipe_name: "petra-review-batch-test",
        recipe_version: "1.0.0",
        project_id: PROJECT,
        created_by: claim.created_by,
        created_at: "2026-08-28T18:12:00.000Z",
        candidates: [
          {
            candidate_key: "first",
            proposal_role: "primary",
            source: {
              selection_kind: "exact_text",
              exact_text: "The study reports a measurable improvement.",
              page_number: 1,
            },
            canonical_text: "The study reports a measurable improvement.",
            claim_kind: "descriptive",
            scope: claim.scope,
            detail_level: "detailed",
            source_stance: "reports",
            attribution: "The study authors",
            modality: "asserted",
            negated: false,
          },
          {
            candidate_key: "second",
            proposal_role: "qualification",
            source: {
              selection_kind: "exact_text",
              exact_text: "The study reports a measurable improvement.",
              page_number: 1,
            },
            canonical_text:
              "The reported improvement is scoped to the study-defined evaluation.",
            claim_kind: "descriptive",
            scope: claim.scope,
            detail_level: "detailed",
            source_stance: "qualifies",
            attribution: "The study authors",
            modality: "asserted",
            negated: false,
          },
        ],
      });
      const registry = evidenceRegistry(source);
      const admission = admitEvidenceProposalBundle(proposal, source, registry);
      expect(admission.admitted_count).toBe(2);
      const first = proposal.content.candidates[0];
      const second = proposal.content.candidates[1];
      if (second === undefined) throw new Error("Bad batch fixture");
      const stalePlan = decisionPlan(first, "accepted", 16);
      const independentPlan = decisionPlan(second, "accepted", 17);
      if (failure === "stale") {
        await executeReviewDecisionPlan(
          registry,
          decisionPlan(
            first,
            "accepted",
            18,
            "A competing decision promotes this pair first.",
          ),
        );
      }

      const result = await executeReviewBatch(
        {
          executeCommand: (envelope) => {
            const result = registry.executeCommand(envelope);
            return failure === "mismatched_result" &&
              result.outcome === "applied" &&
              result.change_set_id === stalePlan.change_set.change_set_id
              ? { ...result, assertion_revision: 999 }
              : result;
          },
        },
        [stalePlan, independentPlan],
      );

      expect(result).toMatchObject({
        member_count: 2,
        applied_count: 1,
        failed_count: 1,
      });
      expect(result.members).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            candidate_id: first.candidate_id,
            outcome: "failed",
            error_code:
              failure === "stale"
                ? "STALE_TARGET_REVISION"
                : "REVIEW_COMMAND_RESULT_MISMATCH",
          }),
          expect.objectContaining({
            candidate_id: second.candidate_id,
            outcome: "applied",
          }),
        ]),
      );
      expect(registry.getClaim(second.claim.claim_id)?.authority.zone).toBe(
        "trusted",
      );
      if (failure === "mismatched_result") {
        // A failed result check is not evidence of no effect. Both operations
        // remain committed, and the independent ChangeSet also completed.
        expect(result.members[0]).toMatchObject({
          message: expect.stringContaining("may have taken effect") as unknown,
        });
        expect(registry.getClaim(first.claim.claim_id)?.revision).toBe(2);
        expect(
          registry.getAssertion(first.assertion.assertion_id)?.revision,
        ).toBe(2);
      }
    },
  );
});
