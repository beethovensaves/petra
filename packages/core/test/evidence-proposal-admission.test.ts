import { readFileSync } from "node:fs";

import type { PetraClaim, PetraDocumentParseBundle } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { describe, expect, it } from "vitest";

import {
  buildDeterministicEvidenceProposalBundle,
  type DeterministicEvidenceRecipe,
} from "../src/deterministic-evidence-extraction.js";
import { admitEvidenceProposalBundle } from "../src/evidence-proposal-admission.js";
import { InMemoryEvidenceRegistry } from "../src/evidence-registry.js";

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

const sourceBundle = (): PetraDocumentParseBundle =>
  readFixture<PetraDocumentParseBundle>("document-parse-bundle");

const recipe = (): DeterministicEvidenceRecipe => {
  const claim = readFixture<PetraClaim>("claim");
  return {
    recipe_name: "petra-deterministic-source-mapper",
    recipe_version: "1.0.0",
    project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    created_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      actor_kind: "service",
    },
    created_at: "2026-08-28T18:12:00.000Z",
    candidates: [
      {
        candidate_key: "reported-improvement",
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
        candidate_key: "invented-negative-control",
        proposal_role: "negative_control",
        source: {
          selection_kind: "explicit_span",
          exact_text: "The study guarantees universal improvement.",
          source_span_ids: ["source_span_00000000000000000000000000"],
        },
        canonical_text: "The study guarantees universal improvement.",
        claim_kind: "causal",
        scope: claim.scope,
        detail_level: "detailed",
        source_stance: "reports",
        attribution: "The study authors",
        modality: "asserted",
        negated: false,
      },
    ],
  };
};

const evidenceRegistry = (bundle: PetraDocumentParseBundle) =>
  new InMemoryEvidenceRegistry({
    getSourceSpan: (sourceSpanId) =>
      bundle.spans.find((span) => span.source_span_id === sourceSpanId),
    getParsedDocument: (parsedDocumentId) =>
      bundle.document.parsed_document_id === parsedDocumentId
        ? bundle.document
        : undefined,
  });

describe("deterministic evidence proposal admission", () => {
  it("builds stable, contract-valid quarantine proposals", () => {
    const source = sourceBundle();
    const first = buildDeterministicEvidenceProposalBundle(source, recipe());
    const second = buildDeterministicEvidenceProposalBundle(source, recipe());

    new PetraContractRegistry().assertValid(
      "evidence-proposal-bundle",
      "1.0.0",
      first,
    );
    expect(first).toEqual(second);
    expect(first.content.candidates[0].claim.authority).toEqual({
      zone: "quarantine",
      review_state: "machine_checked",
    });
    expect(first.content.candidates[0].source_quote.source_span_ids).toEqual([
      source.spans[0]?.source_span_id,
    ]);
  });

  it("admits an independently grounded pair and rejects a fabricated span", () => {
    const source = sourceBundle();
    const registry = evidenceRegistry(source);
    const proposal = buildDeterministicEvidenceProposalBundle(source, recipe());
    const negativeControl = proposal.content.candidates[1];
    if (negativeControl === undefined) throw new Error("Bad test recipe");

    const result = admitEvidenceProposalBundle(proposal, source, registry);

    expect(result.admitted_count).toBe(1);
    expect(result.rejected_count).toBe(1);
    expect(result.candidates[0]).toMatchObject({ outcome: "admitted" });
    expect(result.candidates[1]).toMatchObject({
      outcome: "rejected",
      error_code: "SOURCE_SPAN_NOT_IN_BUNDLE",
    });
    expect(registry.claimCount).toBe(1);
    expect(registry.assertionCount).toBe(1);
    expect(registry.getClaim(negativeControl.claim.claim_id)).toBeUndefined();
  });

  it("rejects a mutated bundle before evaluating individual candidates", () => {
    const source = sourceBundle();
    const proposal = buildDeterministicEvidenceProposalBundle(source, recipe());
    proposal.content.candidates[0].source_quote.exact_text =
      "Mutated after hashing.";

    expect(() =>
      admitEvidenceProposalBundle(proposal, source, evidenceRegistry(source)),
    ).toThrowError(
      expect.objectContaining({ code: "BUNDLE_CONTENT_HASH_MISMATCH" }),
    );
  });
});
