import { readFileSync } from "node:fs";

import type {
  PetraAssertion,
  PetraClaim,
  PetraParsedDocument,
  PetraSourceSpan,
} from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  InMemoryEvidenceRegistry,
  type EvidenceSourceResolver,
} from "../src/evidence-registry.js";

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

interface Setup {
  registry: InMemoryEvidenceRegistry;
  claim: PetraClaim;
  assertion: PetraAssertion;
  span: PetraSourceSpan;
  document: PetraParsedDocument;
}

const setup = (): Setup => {
  const claim = readFixture<PetraClaim>("claim");
  const assertion = readFixture<PetraAssertion>("assertion");
  const span = readFixture<PetraSourceSpan>("source-span");
  const document = readFixture<PetraParsedDocument>("parsed-document");
  const resolver: EvidenceSourceResolver = {
    getSourceSpan: (sourceSpanId) =>
      sourceSpanId === span.source_span_id ? span : undefined,
    getParsedDocument: (parsedDocumentId) =>
      parsedDocumentId === document.parsed_document_id ? document : undefined,
  };
  return {
    registry: new InMemoryEvidenceRegistry(resolver),
    claim,
    assertion,
    span,
    document,
  };
};

const expectProposalCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

describe("Claim and Assertion quarantine proposals", () => {
  it("registers a Claim and Assertion pair atomically", () => {
    const { registry, claim, assertion } = setup();

    const stored = registry.proposeEvidencePair({ claim, assertion });

    expect(stored.claim.claim_id).toBe(claim.claim_id);
    expect(stored.assertion.assertion_id).toBe(assertion.assertion_id);
    expect(registry.claimCount).toBe(1);
    expect(registry.assertionCount).toBe(1);
  });

  it("rolls back the Claim when its paired Assertion is invalid", () => {
    const { registry, claim, assertion } = setup();
    const provenance = assertion.provenance_refs.find(
      (value) => value.provenance_kind === "source_span",
    );
    if (provenance?.provenance_kind !== "source_span") {
      throw new Error("Bad fixture");
    }
    provenance.source_span_id = "source_span_00000000000000000000000000";

    expectProposalCode(
      () => registry.proposeEvidencePair({ claim, assertion }),
      "SOURCE_SPAN_NOT_REGISTERED",
    );
    expect(registry.claimCount).toBe(0);
    expect(registry.assertionCount).toBe(0);
  });

  it("registers immutable source evidence in quarantine", () => {
    const { registry, claim, assertion } = setup();

    const storedClaim = registry.proposeClaim(claim);
    const storedAssertion = registry.proposeAssertion(assertion);
    claim.canonical_text = "Mutated after registration.";
    assertion.rationale = "Mutated after registration.";

    expect(registry.claimCount).toBe(1);
    expect(registry.assertionCount).toBe(1);
    expect(storedClaim.authority.zone).toBe("quarantine");
    expect(storedAssertion.authority.zone).toBe("quarantine");
    expect(storedClaim.canonical_text).toBe(
      "The study reports a measurable improvement.",
    );
    expect(storedAssertion.rationale).toContain("exact full-text passage");
    expect(Object.isFrozen(storedClaim.scope)).toBe(true);
    expect(Object.isFrozen(storedAssertion.provenance_refs)).toBe(true);
  });

  it("refuses direct Claim and Assertion insertion into the trusted zone", () => {
    const { registry, claim } = setup();
    const trustedAssertion = readFixture<PetraAssertion>("assertion-trusted");
    claim.authority = structuredClone(trustedAssertion.authority);

    expectProposalCode(
      () => registry.proposeClaim(claim),
      "CLAIM_PROPOSAL_NOT_QUARANTINED",
    );
    expectProposalCode(
      () => registry.proposeAssertion(trustedAssertion),
      "ASSERTION_PROPOSAL_NOT_QUARANTINED",
    );
    expect(registry.claimCount).toBe(0);
    expect(registry.assertionCount).toBe(0);
  });

  it("requires every scientific scope dimension to be explicit", () => {
    const { registry, claim } = setup();
    claim.scope.unreported_dimensions =
      claim.scope.unreported_dimensions.filter(
        (dimension) => dimension !== "population",
      ) as typeof claim.scope.unreported_dimensions;

    expectProposalCode(
      () => registry.proposeClaim(claim),
      "SCOPE_ACCOUNTING_INVALID",
    );
  });

  it("rejects a dimension marked both reported and unreported", () => {
    const { registry, claim } = setup();
    claim.scope.unreported_dimensions = [
      ...claim.scope.unreported_dimensions,
      "task",
    ] as typeof claim.scope.unreported_dimensions;

    expectProposalCode(
      () => registry.proposeClaim(claim),
      "SCOPE_ACCOUNTING_INVALID",
    );
  });

  it.each([
    {
      name: "an unregistered SourceSpan",
      mutate: (claim: PetraClaim) => {
        if (claim.basis.basis_kind !== "source") throw new Error("Bad fixture");
        claim.basis.source_span_ids = [
          "source_span_01ARZ3NDEKTSV4RRFFQ69G5FAA",
        ];
      },
      code: "SOURCE_SPAN_NOT_REGISTERED",
    },
    {
      name: "a failed extraction validator",
      mutate: (claim: PetraClaim) => {
        if (claim.basis.basis_kind !== "source") throw new Error("Bad fixture");
        const result = claim.basis.validator_results[0];
        if (result === undefined) throw new Error("Bad fixture");
        result.outcome = "fail";
      },
      code: "VALIDATOR_FAILED",
    },
    {
      name: "a composed normalization status",
      mutate: (claim: PetraClaim) => {
        claim.normalization_status = "composed";
      },
      code: "CLAIM_BASIS_MISMATCH",
    },
  ])("rejects a source Claim grounded by $name", ({ mutate, code }) => {
    const { registry, claim } = setup();
    mutate(claim);

    expectProposalCode(() => registry.proposeClaim(claim), code);
    expect(registry.claimCount).toBe(0);
  });

  it("rejects unresolved source evidence", () => {
    const { registry, claim, span } = setup();
    span.verification.status = "unresolved";

    expectProposalCode(
      () => registry.proposeClaim(claim),
      "SOURCE_SPAN_UNRESOLVED",
    );
  });

  it("requires source evidence to belong to the named WorkVersion", () => {
    const { registry, claim, document } = setup();
    document.work_version_id = "work_version_01ARZ3NDEKTSV4RRFFQ69G5FAA";

    expectProposalCode(
      () => registry.proposeClaim(claim),
      "SOURCE_WORK_VERSION_MISMATCH",
    );
  });

  it.each([
    {
      name: "detailed interpretation",
      mutate: (claim: PetraClaim) => {
        if (claim.basis.basis_kind !== "source") throw new Error("Bad fixture");
        claim.basis.detail_level = "detailed";
      },
    },
    {
      name: "a causal Claim",
      mutate: (claim: PetraClaim) => {
        claim.claim_kind = "causal";
      },
    },
  ])("blocks abstract-only evidence from grounding $name", ({ mutate }) => {
    const { registry, claim } = setup();
    if (claim.basis.basis_kind !== "source") throw new Error("Bad fixture");
    claim.basis.source_scope = "abstract_only";
    claim.basis.detail_level = "broad";
    mutate(claim);

    expectProposalCode(
      () => registry.proposeClaim(claim),
      "ABSTRACT_SCOPE_VIOLATION",
    );
  });

  it("accepts a broad descriptive Claim grounded by an abstract", () => {
    const { registry, claim } = setup();
    if (claim.basis.basis_kind !== "source") throw new Error("Bad fixture");
    claim.basis.source_scope = "abstract_only";
    claim.basis.detail_level = "broad";

    expect(registry.proposeClaim(claim).claim_kind).toBe("descriptive");
  });

  it("requires a composed synthesis to cite registered basis evidence", () => {
    const { registry, claim } = setup();
    claim.normalization_status = "composed";
    claim.basis = {
      basis_kind: "synthesis",
      basis_claim_ids: ["claim_01ARZ3NDEKTSV4RRFFQ69G5FAA"],
      basis_assertion_ids: [],
      composition_kind: "model_assisted",
      composition_ref: "synthesis_run_01ARZ3NDEKTSV4RRFFQ69G5FAB",
      composed_by: claim.created_by,
      composed_at: claim.created_at,
    };

    expectProposalCode(
      () => registry.proposeClaim(claim),
      "BASIS_CLAIM_NOT_REGISTERED",
    );
  });

  it("requires source-stated Assertions to cite a SourceSpan", () => {
    const { registry, claim, assertion } = setup();
    registry.proposeClaim(claim);
    assertion.provenance_refs = assertion.provenance_refs.filter(
      (provenance) => provenance.provenance_kind !== "source_span",
    ) as typeof assertion.provenance_refs;

    expectProposalCode(
      () => registry.proposeAssertion(assertion),
      "ASSERTION_SOURCE_SPAN_REQUIRED",
    );
  });

  it("enforces the WorkVersion ASSERTS Claim endpoint contract", () => {
    const { registry, claim, assertion } = setup();
    registry.proposeClaim(claim);
    assertion.subject_id = claim.claim_id;

    expectProposalCode(
      () => registry.proposeAssertion(assertion),
      "ASSERTS_ENDPOINT_MISMATCH",
    );
  });

  it("requires ASSERTS provenance to be one of the Claim's exact spans", () => {
    const { claim, assertion, span, document } = setup();
    const extraSpan = structuredClone(span);
    extraSpan.source_span_id = "source_span_01ARZ3NDEKTSV4RRFFQ69G5FAA";
    const resolver: EvidenceSourceResolver = {
      getSourceSpan: (id) =>
        id === span.source_span_id
          ? span
          : id === extraSpan.source_span_id
            ? extraSpan
            : undefined,
      getParsedDocument: (id) =>
        id === document.parsed_document_id ? document : undefined,
    };
    const isolated = new InMemoryEvidenceRegistry(resolver);
    isolated.proposeClaim(claim);
    assertion.provenance_refs = [
      {
        provenance_kind: "source_span",
        source_span_id: extraSpan.source_span_id,
      },
    ];

    expectProposalCode(
      () => isolated.proposeAssertion(assertion),
      "ASSERTION_SOURCE_SPAN_NOT_IN_CLAIM",
    );
  });

  it("requires explicit scope comparison for scientific evidence relations", () => {
    const { registry, claim, assertion } = setup();
    registry.proposeClaim(claim);
    assertion.predicate = "SUPPORTS";
    assertion.subject_id = claim.claim_id;
    assertion.object = { object_kind: "entity", entity_id: claim.claim_id };
    assertion.assertion_kind = "model_inference";

    expectProposalCode(
      () => registry.proposeAssertion(assertion),
      "SCIENTIFIC_RELATION_SCOPE_REQUIRED",
    );

    assertion.scope_comparison = {
      relation: "aligned",
      rationale: "The relation compares the same task and outcome scope.",
    };
    expect(registry.proposeAssertion(assertion).predicate).toBe("SUPPORTS");
  });

  it("requires scientific evidence relations to carry exact evidence provenance", () => {
    const { registry, claim, assertion } = setup();
    registry.proposeClaim(claim);
    assertion.predicate = "CONTRADICTS";
    assertion.subject_id = claim.claim_id;
    assertion.object = { object_kind: "entity", entity_id: claim.claim_id };
    assertion.assertion_kind = "model_inference";
    assertion.scope_comparison = {
      relation: "aligned",
      rationale: "The relation compares the same task and outcome scope.",
    };
    assertion.provenance_refs = [
      {
        provenance_kind: "record",
        record_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FAA",
        role: "model_call",
      },
    ];

    expectProposalCode(
      () => registry.proposeAssertion(assertion),
      "SCIENTIFIC_RELATION_PROVENANCE_REQUIRED",
    );
  });
});
