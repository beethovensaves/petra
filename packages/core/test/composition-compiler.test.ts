import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  ContextObjectRef,
  PetraAuthor,
  PetraCompositionPlan,
  PetraCompositionRequest,
  PetraContextPacket,
  PetraDomainEvent,
  PetraEvidencePacket,
  PetraExternalIdentifier,
  PetraGroundedResponse,
  PetraSourceSpan,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  type CompileGroundedCompositionInput,
  type CompositionCompilerError,
  type CompositionCompilerErrorCode,
  GroundedCompositionCompiler,
} from "../src/composition-compiler.js";
import {
  type CompositionRendererError,
  type CompositionRendererErrorCode,
  DeterministicCompositionRenderer,
} from "../src/composition-renderer.js";
import {
  InMemoryContextPacketRegistry,
  type PacketRecord,
} from "../src/context-packet-registry.js";
import { InMemoryCompositionRegistry } from "../src/composition-registry.js";
import {
  type DraftRevisionError,
  type DraftRevisionErrorCode,
  DraftRevisionEngine,
  type ResearcherDraftEditInput,
} from "../src/draft-revision.js";
import {
  type DraftSupportAssessmentError,
  type DraftSupportAssessmentErrorCode,
  InMemoryDraftSupportAssessmentRegistry,
} from "../src/draft-support-assessment-registry.js";

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

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

interface MutableHarness {
  context: PetraContextPacket;
  evidence: PetraEvidencePacket;
  request: PetraCompositionRequest;
  plan: PetraCompositionPlan;
  groundedResponse: PetraGroundedResponse;
  records: PacketRecord[];
}

const packetRecords = (): PacketRecord[] => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected the applied authority fixture.");
  }
  return [
    event.event.payload.claim,
    event.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ];
};

const recordRef = (record: PacketRecord): ContextObjectRef => {
  if (record.schema_name === "petra.claim") {
    return {
      object_kind: "claim",
      object_id: record.claim_id,
      object_revision: record.revision,
      object_hash: canonicalHash(record),
    };
  }
  if (record.schema_name === "petra.assertion") {
    return {
      object_kind: "assertion",
      object_id: record.assertion_id,
      object_revision: record.revision,
      object_hash: canonicalHash(record),
    };
  }
  if (record.schema_name === "petra.source-span") {
    return {
      object_kind: "source_span",
      object_id: record.source_span_id,
      object_revision: record.revision,
      object_hash: canonicalHash(record),
    };
  }
  return {
    object_kind: "work_version",
    object_id: record.work_version_id,
    object_revision: record.revision,
    object_hash: canonicalHash(record),
  };
};

const makeHarness = (
  mutate?: (value: MutableHarness) => void,
): {
  compiler: GroundedCompositionCompiler;
  input: CompileGroundedCompositionInput;
  packets: InMemoryContextPacketRegistry;
} => {
  const records = packetRecords();
  const value: MutableHarness = {
    context: readFixture<PetraContextPacket>("context-packet"),
    evidence: readFixture<PetraEvidencePacket>("evidence-packet"),
    request: readFixture<PetraCompositionRequest>("composition-request"),
    plan: readFixture<PetraCompositionPlan>("composition-plan"),
    groundedResponse: readFixture<PetraGroundedResponse>("grounded-response"),
    records,
  };
  mutate?.(value);
  const refs = value.records.map(recordRef);
  for (const [
    index,
    inclusion,
  ] of value.context.content.included_objects.entries()) {
    const ref = refs[index];
    if (ref === undefined) throw new Error("Missing fixture record reference.");
    inclusion.object_ref = structuredClone(ref);
  }
  for (const [
    index,
    selection,
  ] of value.evidence.content.selected_evidence.entries()) {
    const ref = refs[index];
    if (ref === undefined) throw new Error("Missing fixture record reference.");
    selection.object_ref = structuredClone(ref);
  }
  const subject = refs[0];
  if (subject === undefined)
    throw new Error("Missing fixture subject reference.");
  value.context.content.objective.target_refs = [structuredClone(subject)];
  value.request.content.subject_refs[0] = structuredClone(subject);
  for (const section of value.plan.content.sections) {
    for (const move of section.moves) {
      for (const reference of move.evidence_refs) {
        const selection =
          value.evidence.content.selected_evidence[
            reference.context_selection_order - 1
          ];
        if (selection === undefined) {
          throw new Error("Missing fixture EvidencePacket selection.");
        }
        reference.object_ref = structuredClone(selection.object_ref);
      }
    }
  }
  for (const [
    index,
    dependency,
  ] of value.groundedResponse.content.dependencies.entries()) {
    const ref = refs[index];
    if (ref === undefined)
      throw new Error("Missing fixture dependency reference.");
    dependency.object_ref = structuredClone(ref);
  }
  value.context.content_hash = canonicalHash(value.context.content);
  value.evidence.content.context_packet_ref.content_hash =
    value.context.content_hash;
  value.evidence.content_hash = canonicalHash(value.evidence.content);
  value.request.content_hash = canonicalHash(value.request.content);
  value.plan.composition_request_ref.content_hash = value.request.content_hash;
  value.plan.evidence_packet_ref = {
    evidence_packet_id: value.evidence.evidence_packet_id,
    revision: value.evidence.revision,
    content_hash: value.evidence.content_hash,
  };
  value.plan.content_hash = canonicalHash(value.plan.content);
  value.groundedResponse.content.context_packet_ref.content_hash =
    value.context.content_hash;
  value.groundedResponse.content.evidence_packet_ref = {
    evidence_packet_id: value.evidence.evidence_packet_id,
    revision: value.evidence.revision,
    content_hash: value.evidence.content_hash,
  };
  value.groundedResponse.content_hash = canonicalHash(
    value.groundedResponse.content,
  );

  const packets = new InMemoryContextPacketRegistry();
  packets.registerContextPacket(value.context, value.records);
  packets.registerEvidencePacket(value.evidence);
  return {
    compiler: new GroundedCompositionCompiler(packets),
    packets,
    input: {
      request: value.request,
      plan: value.plan,
      evidence: value.evidence,
      groundedResponse: value.groundedResponse,
      modelActor: {
        actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FF1",
        actor_kind: "model",
      },
      serviceActor: {
        actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
        actor_kind: "service",
      },
      promptProfile: {
        name: "petra-grounded-synthesist",
        version: "1.0.0",
      },
      promptHash:
        "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      scholarlyRecords: {
        works: [readFixture<PetraWork>("work")],
        workVersions: [readFixture<PetraWorkVersion>("work-version")],
        authors: [readFixture<PetraAuthor>("author")],
        externalIdentifiers: [
          readFixture<PetraExternalIdentifier>("external-identifier"),
        ],
      },
    },
  };
};

const expectCompilerCode = (
  operation: () => unknown,
  code: CompositionCompilerErrorCode,
): void => {
  expect(operation).toThrowError(
    expect.objectContaining<Partial<CompositionCompilerError>>({ code }),
  );
};

const expectRendererCode = (
  operation: () => unknown,
  code: CompositionRendererErrorCode,
): void => {
  expect(operation).toThrowError(
    expect.objectContaining<Partial<CompositionRendererError>>({ code }),
  );
};

const expectDraftRevisionCode = (
  operation: () => unknown,
  code: DraftRevisionErrorCode,
): void => {
  expect(operation).toThrowError(
    expect.objectContaining<Partial<DraftRevisionError>>({ code }),
  );
};

const expectAssessmentCode = (
  operation: () => unknown,
  code: DraftSupportAssessmentErrorCode,
): void => {
  expect(operation).toThrowError(
    expect.objectContaining<Partial<DraftSupportAssessmentError>>({ code }),
  );
};

const editHarness = () => {
  const { compiler, input, packets } = makeHarness();
  const initial = compiler.compile(input);
  const compositions = new InMemoryCompositionRegistry(packets);
  compositions.registerRequest(input.request);
  compositions.registerPlan(input.plan);
  compositions.register(initial);
  const engine = new DraftRevisionEngine();
  const researcher = {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAX",
    actor_kind: "human" as const,
  };
  const serviceActor = {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
    actor_kind: "service" as const,
  };
  const firstSpan = initial.spans[0];
  if (firstSpan === undefined) throw new Error("Expected a DraftSpan fixture.");
  const editInput = {
    previous: initial,
    commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FCY",
    researcher,
    serviceActor,
    replacements: [
      {
        draftSpanId: firstSpan.draft_span_id,
        expectedExactTextHash: firstSpan.content.exact_text_hash,
        replacementText:
          "The selected study reports a modest measurable improvement.",
      },
    ] as const,
    editedAt: "2026-09-04T05:00:00.000Z",
  };
  const edited = engine.edit(editInput);
  return {
    engine,
    initial,
    edited,
    editInput,
    compositions,
    researcher,
    serviceActor,
  };
};

const renderHarness = () => {
  const { compiler, input } = makeHarness();
  const compiled = compiler.compile(input);
  return {
    renderer: new DeterministicCompositionRenderer(),
    renderInput: {
      aggregate: {
        draft: compiled.draft,
        spans: compiled.spans,
        provenanceMap: compiled.provenanceMap,
        citationBundle: compiled.citationBundle,
      },
      renderedBy: {
        actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
        actor_kind: "service" as const,
      },
      renderedAt: "2026-09-04T04:00:00.000Z",
    },
  };
};

describe("grounded composition compiler", () => {
  it("deterministically compiles plan moves into a validated composition aggregate", () => {
    const { compiler, input } = makeHarness();
    const before = structuredClone(input);
    const first = compiler.compile(input);
    const replay = compiler.compile(structuredClone(input));

    expect(replay).toEqual(first);
    expect(input).toEqual(before);
    expect(first.draft.content.text).toBe(
      "The selected study reports a measurable improvement. The claim is limited to its study-defined evaluation task.",
    );
    expect(first.spans).toHaveLength(2);
    expect(first.spans[0]?.content).toMatchObject({
      start: 0,
      end: 52,
      semantic_origin: "source_report",
      scientific_force: "direct_report",
    });
    expect(first.spans[1]?.content).toMatchObject({
      start: 53,
      end: 111,
      scientific_force: "qualification",
    });
    expect(first.provenanceMap.content.mappings).toHaveLength(2);
    expect(first.citationBundle.content.citations).toHaveLength(1);
    expect(first.citationBundle.content).toMatchObject({
      style: {
        style_kind: "csl",
        style_name: "apa",
        style_version: "7th-edition",
      },
      export_formats: ["inline", "markdown", "latex", "bibtex"],
    });
    expect(first.citationBundle.content.citations[0]?.metadata).toEqual({
      title: "A testable account of competing explanations",
      work_kind: "journal_article",
      version_label: "Version of record",
      publication_status: "peer_reviewed",
      published_date: { precision: "month", value: "2025-06" },
    });
    expect(first.draft.validation.state).toBe("pending");
    expect(first.draft.validation.validator_results).toContainEqual(
      expect.objectContaining({ code: "FELICITY_REVALIDATION_PENDING" }),
    );
  });

  it("uses Unicode code points rather than UTF-16 code units for span offsets", () => {
    const { compiler, input } = makeHarness(({ plan }) => {
      plan.content.sections[0].moves[0].planned_text =
        "🪨 The selected study reports a measurable improvement.";
    });
    const result = compiler.compile(input);
    const firstText = input.plan.content.sections[0].moves[0].planned_text;

    expect(result.spans[0]?.content.end).toBe(Array.from(firstText).length);
    expect(result.spans[1]?.content.start).toBe(
      Array.from(firstText).length + 1,
    );
    expect(result.spans[0]?.content.exact_text).toBe(firstText);
  });

  it("rejects stale grounded bindings and hidden plan whitespace", () => {
    const stale = makeHarness(({ groundedResponse }) => {
      groundedResponse.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FD0";
    });
    expectCompilerCode(
      () => stale.compiler.compile(stale.input),
      "COMPOSITION_COMPILER_GROUNDED_RESPONSE_INVALID",
    );

    const whitespace = makeHarness(({ plan }) => {
      plan.content.sections[0].moves[0].planned_text =
        " The selected study reports a measurable improvement.";
    });
    expectCompilerCode(
      () => whitespace.compiler.compile(whitespace.input),
      "COMPOSITION_COMPILER_PLAN_TEXT_INVALID",
    );
  });

  it("refuses strong interpretation from abstract-only evidence", () => {
    const { compiler, input } = makeHarness(
      ({ context, request, plan, records }) => {
        const claim = records[0];
        if (
          claim?.schema_name !== "petra.claim" ||
          claim.basis.basis_kind !== "source"
        ) {
          throw new Error("Expected the source-backed Claim fixture.");
        }
        claim.basis.source_scope = "abstract_only";
        claim.basis.detail_level = "broad";
        context.content.included_objects[0].source_access = "abstract_only";
        const assertionInclusion = context.content.included_objects[1];
        if (assertionInclusion === undefined) {
          throw new Error("Expected the Assertion context inclusion.");
        }
        assertionInclusion.source_access = "abstract_only";
        request.content.requested_output.permitted_scientific_forces.push(
          "causal",
        );
        plan.content.sections[0].moves[0].scientific_force = "causal";
      },
    );

    expectCompilerCode(
      () => compiler.compile(input),
      "COMPOSITION_COMPILER_ABSTRACT_ONLY_FORCE_INVALID",
    );
  });

  it("labels broad abstract-only composition without pretending methods were inspected", () => {
    const { compiler, input } = makeHarness(({ context, records }) => {
      const claim = records[0];
      if (
        claim?.schema_name !== "petra.claim" ||
        claim.basis.basis_kind !== "source"
      ) {
        throw new Error("Expected the source-backed Claim fixture.");
      }
      claim.basis.source_scope = "abstract_only";
      claim.basis.detail_level = "broad";
      context.content.included_objects[0].source_access = "abstract_only";
      const assertionInclusion = context.content.included_objects[1];
      if (assertionInclusion === undefined) {
        throw new Error("Expected the Assertion context inclusion.");
      }
      assertionInclusion.source_access = "abstract_only";
    });

    const result = compiler.compile(input);
    expect(
      result.citationBundle.content.citations[0]?.source_access
        .processing_depth,
    ).toBe("abstract_only");
    expect(result.draft.validation.limitations).toContain(
      "Abstract-only evidence was used; the draft is limited to broad source-reported claims because methods and results were not available for detailed inspection.",
    );
  });
});

describe("additive researcher draft revision", () => {
  it("creates one immutable revision and makes changed support and citation links stale", () => {
    const harness = editHarness();
    const before = structuredClone(harness.editInput);
    const replay = harness.engine.edit(structuredClone(harness.editInput));

    expect(replay).toEqual(harness.edited);
    expect(harness.editInput).toEqual(before);
    expect(harness.edited.composition.draft).toMatchObject({
      draft_artifact_id: harness.initial.draft.draft_artifact_id,
      revision: 2,
      lineage: {
        lineage_kind: "revision",
        parent_draft_artifact_id: harness.initial.draft.draft_artifact_id,
        parent_revision: 1,
        edit_origin: "researcher_edit",
      },
      production: {
        origin_kind: "researcher_authored",
        researcher_id: harness.researcher.actor_id,
      },
      validation: { state: "stale" },
    });
    expect(harness.edited.composition.draft.content.text).toBe(
      "The selected study reports a modest measurable improvement. The claim is limited to its study-defined evaluation task.",
    );
    expect(harness.edited.composition.spans).toHaveLength(2);
    expect(harness.edited.composition.spans[0]?.content).toMatchObject({
      start: 0,
      end: 59,
      semantic_origin: "researcher_statement",
    });
    expect(harness.edited.composition.spans[1]?.content.start).toBe(60);
    expect(
      harness.edited.composition.provenanceMap.content.mappings.map(
        (mapping) => mapping.mapping_state,
      ),
    ).toEqual(["stale", "current"]);
    expect(
      harness.edited.composition.provenanceMap.content.mappings[0]?.bases.map(
        (basis) => basis.basis_kind,
      ),
    ).toEqual(["evidence", "evidence", "researcher"]);
    expect(
      harness.edited.composition.citationBundle.content.citations[0]
        ?.linked_draft_span_ids,
    ).toEqual(harness.edited.composition.draft.content.draft_span_ids);
    expect(harness.edited.assessment.content).toMatchObject({
      state: "stale",
      reuse_policy: { reuse_allowed: false },
      authority_boundary: {
        assessment_is_scientific_evidence: false,
        assessment_controls_draft_reuse: true,
      },
      citation_assessments: [{ link_state: "partially_stale" }],
    });
    expect(() =>
      harness.compositions.register(harness.edited.composition),
    ).not.toThrow();
    expect(
      harness.compositions.getDraft(harness.initial.draft.draft_artifact_id, 1),
    ).toEqual(harness.initial.draft);
  });

  it("rejects imprecise, duplicate, no-op, and compounded stale replacements", () => {
    const harness = editHarness();
    const replacement = harness.editInput.replacements[0];
    const wrongHash: ResearcherDraftEditInput = {
      ...harness.editInput,
      replacements: [
        {
          ...replacement,
          expectedExactTextHash:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      ],
    };
    expectDraftRevisionCode(
      () => harness.engine.edit(wrongHash),
      "DRAFT_REVISION_REPLACEMENT_INVALID",
    );

    const noOp: ResearcherDraftEditInput = {
      ...harness.editInput,
      replacements: [
        {
          ...replacement,
          replacementText: harness.initial.spans[0]!.content.exact_text,
        },
      ],
    };
    expectDraftRevisionCode(
      () => harness.engine.edit(noOp),
      "DRAFT_REVISION_REPLACEMENT_INVALID",
    );

    const duplicate: ResearcherDraftEditInput = {
      ...harness.editInput,
      replacements: [
        structuredClone(replacement),
        structuredClone(replacement),
      ],
    };
    expectDraftRevisionCode(
      () => harness.engine.edit(duplicate),
      "DRAFT_REVISION_REPLACEMENT_INVALID",
    );

    const compounded: ResearcherDraftEditInput = {
      ...harness.editInput,
      previous: structuredClone(harness.edited.composition),
      replacements: [
        {
          draftSpanId: harness.edited.composition.spans[0]!.draft_span_id,
          expectedExactTextHash:
            harness.edited.composition.spans[0]!.content.exact_text_hash,
          replacementText: "A second unreviewed change.",
        },
      ],
    };
    expectDraftRevisionCode(
      () => harness.engine.edit(compounded),
      "DRAFT_REVISION_BASE_INVALID",
    );
  });

  it("registers exact assessment replay while preserving caller and prior state", () => {
    const harness = editHarness();
    const registry = new InMemoryDraftSupportAssessmentRegistry();
    const before = structuredClone(harness.edited.assessment);
    const stored = registry.register(
      harness.edited.assessment,
      harness.edited.composition,
    );
    expect(
      registry.register(
        structuredClone(harness.edited.assessment),
        structuredClone(harness.edited.composition),
      ),
    ).toBe(stored);
    expect(harness.edited.assessment).toEqual(before);
    expect(Object.isFrozen(stored)).toBe(true);
    expect(registry.getCurrent(stored.draft_support_assessment_id)).toBe(
      stored,
    );

    const changed = structuredClone(harness.edited.assessment);
    changed.content.limitations.push("Conflicting limitation.");
    changed.content_hash = canonicalHash(changed.content);
    expectAssessmentCode(
      () => registry.register(changed, harness.edited.composition),
      "DRAFT_SUPPORT_ASSESSMENT_ID_CONFLICT",
    );
    expect(registry.get(stored.draft_support_assessment_id, 1)).toEqual(before);
  });

  it("records explicit passing revalidation without rewriting the edited draft", () => {
    const harness = editHarness();
    const registry = new InMemoryDraftSupportAssessmentRegistry();
    const stale = registry.register(
      harness.edited.assessment,
      harness.edited.composition,
    );
    const staleSpan = stale.content.span_assessments.find(
      (assessment) => assessment.support_state === "stale",
    );
    if (staleSpan === undefined) throw new Error("Expected one stale span.");
    const passed = harness.engine.revalidate({
      composition: harness.edited.composition,
      previousAssessment: harness.edited.assessment,
      commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FCZ",
      requestedBy: harness.researcher,
      serviceActor: harness.serviceActor,
      spanResults: [
        {
          draftSpanId: staleSpan.draft_span_id,
          outcome: "pass",
          validatorResults: [
            {
              validator: "petra.span-support",
              version: "1.0.0",
              outcome: "pass",
              code: "EDITED_SPAN_SUPPORT_PRESERVED",
            },
          ],
          reason:
            "The revised wording remains within the exact evidence and force boundary.",
        },
      ],
      validatorResults: [
        {
          validator: "petra.felicity-force-preservation",
          version: "1.0.0",
          outcome: "pass",
          code: "SCIENTIFIC_FORCE_PRESERVED",
        },
      ],
      limitations: [
        "Revalidation covers the existing EvidencePacket, not a new literature search.",
      ],
      assessedAt: "2026-09-04T05:01:00.000Z",
    });
    const stored = registry.register(passed, harness.edited.composition);

    expect(stored).toMatchObject({
      revision: 2,
      lineage: {
        lineage_kind: "revision",
        parent_revision: 1,
        parent_content_hash: stale.content_hash,
      },
      content: {
        state: "passed",
        reuse_policy: { reuse_allowed: true },
        citation_assessments: [{ link_state: "current" }],
      },
    });
    expect(
      stored.content.span_assessments.map((span) => span.support_state),
    ).toEqual(["passed", "current"]);
    expect(registry.get(stored.draft_support_assessment_id, 1)).toBe(stale);
    expect(harness.edited.composition.draft.validation.state).toBe("stale");
  });

  it("keeps a failed revalidation and its affected citation non-reusable", () => {
    const harness = editHarness();
    const staleSpan = harness.edited.assessment.content.span_assessments.find(
      (assessment) => assessment.support_state === "stale",
    );
    if (staleSpan === undefined) throw new Error("Expected one stale span.");
    const failed = harness.engine.revalidate({
      composition: harness.edited.composition,
      previousAssessment: harness.edited.assessment,
      commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FD0",
      requestedBy: harness.researcher,
      serviceActor: harness.serviceActor,
      spanResults: [
        {
          draftSpanId: staleSpan.draft_span_id,
          outcome: "fail",
          validatorResults: [
            {
              validator: "petra.span-support",
              version: "1.0.0",
              outcome: "fail",
              code: "EDITED_SPAN_STRENGTHENS_CLAIM",
            },
          ],
          reason: "The edit increases claim strength beyond the source report.",
        },
      ],
      validatorResults: [
        {
          validator: "petra.felicity-force-preservation",
          version: "1.0.0",
          outcome: "fail",
          code: "SCIENTIFIC_FORCE_STRENGTHENED",
        },
      ],
      limitations: ["The strengthened wording is not supported."],
      assessedAt: "2026-09-04T05:01:00.000Z",
    });
    const registry = new InMemoryDraftSupportAssessmentRegistry();
    registry.register(harness.edited.assessment, harness.edited.composition);
    expect(() =>
      registry.register(failed, harness.edited.composition),
    ).not.toThrow();
    expect(failed.content).toMatchObject({
      state: "failed",
      reuse_policy: { reuse_allowed: false },
      citation_assessments: [{ link_state: "partially_stale" }],
    });
    expect(failed.content.span_assessments[0]?.support_state).toBe("failed");
  });

  it("rejects incomplete revalidation and internally inconsistent support state", () => {
    const harness = editHarness();
    const staleSpan = harness.edited.assessment.content.span_assessments.find(
      (assessment) => assessment.support_state === "stale",
    );
    if (staleSpan === undefined) throw new Error("Expected one stale span.");
    expectDraftRevisionCode(
      () =>
        harness.engine.revalidate({
          composition: harness.edited.composition,
          previousAssessment: harness.edited.assessment,
          commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FD1",
          requestedBy: harness.researcher,
          serviceActor: harness.serviceActor,
          spanResults: [
            {
              draftSpanId: staleSpan.draft_span_id,
              outcome: "pass",
              validatorResults: [
                {
                  validator: "petra.span-support",
                  version: "1.0.0",
                  outcome: "fail",
                  code: "CONTRADICTORY_RESULT",
                },
              ],
              reason: "The declared outcome contradicts the validator.",
            },
          ],
          validatorResults: [
            {
              validator: "petra.whole-draft",
              version: "1.0.0",
              outcome: "pass",
              code: "WHOLE_DRAFT_CHECKED",
            },
          ],
          limitations: [],
          assessedAt: "2026-09-04T05:01:00.000Z",
        }),
      "DRAFT_REVISION_REVALIDATION_INVALID",
    );

    const registry = new InMemoryDraftSupportAssessmentRegistry();
    const inconsistent = structuredClone(harness.edited.assessment);
    inconsistent.content.span_assessments[0].support_state = "current";
    inconsistent.content.span_assessments[0].citation_state = "current";
    inconsistent.content.citation_assessments[0].link_state = "current";
    inconsistent.content.citation_assessments[0].stale_draft_span_ids = [];
    inconsistent.content_hash = canonicalHash(inconsistent.content);
    expectAssessmentCode(
      () => registry.register(inconsistent, harness.edited.composition),
      "DRAFT_SUPPORT_ASSESSMENT_STATE_INVALID",
    );
  });
});

describe("deterministic composition renderer", () => {
  it("renders the requested formats as stable content-addressed Artifact candidates", () => {
    const { renderer, renderInput } = renderHarness();
    const first = renderer.renderRequested(renderInput);
    const replay = renderer.renderRequested(structuredClone(renderInput));

    expect(first).toEqual(replay);
    expect(first.map((value) => value.format)).toEqual([
      "markdown",
      "latex",
      "bibtex",
    ]);
    expect(new Set(first.map((value) => value.artifact.artifact_id)).size).toBe(
      3,
    );
    for (const rendered of first) {
      expect(rendered.artifact).toMatchObject({
        artifact_kind: "export",
        byte_size: rendered.bytes.byteLength,
        content_hash: textHash(rendered.text),
      });
      expect(new TextDecoder().decode(rendered.bytes)).toBe(rendered.text);
      expect(rendered.semanticContentHash).toBe(
        renderInput.aggregate.draft.content_hash,
      );
      expect(rendered.record.content.output_artifact_ref).toEqual({
        artifact_id: rendered.artifact.artifact_id,
        revision: 1,
        content_hash: rendered.artifact.content_hash,
        byte_size: rendered.artifact.byte_size,
        media_type: rendered.artifact.media_type,
      });
      expect(rendered.record.content.authority_boundary).toEqual({
        rendered_artifact_is_scientific_authority: false,
        renderer_may_change_support: false,
      });
      expect(rendered.record.content_hash).toBe(
        canonicalHash(rendered.record.content),
      );
    }
  });

  it("renders citations and warnings without inventing unavailable publication fields", () => {
    const { renderer, renderInput } = renderHarness();
    const markdown = renderer.renderOne(renderInput, "markdown").text;
    const latex = renderer.renderOne(renderInput, "latex").text;
    const bibtex = renderer.renderOne(renderInput, "bibtex").text;

    expect(markdown.match(/\[@Researcher2025explanations\]/g)).toHaveLength(3);
    expect(markdown).toContain("## References");
    expect(markdown).toContain("DOI: 10\\.5555/petra\\.example");
    expect(markdown).toContain(
      "The canonical Work identity remains provisional",
    );
    expect(markdown).toContain("Source access: full text analyzed");

    expect(latex.match(/\\cite\{Researcher2025explanations\}/g)).toHaveLength(
      2,
    );
    expect(latex).toContain("\\begin{thebibliography}{99}");
    expect(latex).toContain(
      "\\bibitem{Researcher2025explanations} Ada Researcher (2025).",
    );

    expect(bibtex).toContain("@article{Researcher2025explanations,");
    expect(bibtex).toContain("author = {{Ada Researcher}},");
    expect(bibtex).toContain("year = {2025},");
    expect(bibtex).toContain("date = {2025-06},");
    expect(bibtex).toContain("doi = {10.5555/petra.example},");
    expect(bibtex).not.toMatch(/\n\s*(journal|volume|number|pages)\s*=/);
  });

  it("escapes LaTeX syntax while retaining Unicode draft content", () => {
    const { compiler, input } = makeHarness(({ plan }) => {
      plan.content.sections[0].moves[0].planned_text =
        "🪨 Evidence uses 50% A&B_1.";
    });
    const compiled = compiler.compile(input);
    const renderer = new DeterministicCompositionRenderer();
    const latex = renderer.renderOne(
      {
        aggregate: compiled,
        renderedBy: {
          actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
          actor_kind: "service",
        },
        renderedAt: "2026-09-04T04:00:00.000Z",
      },
      "latex",
    );

    expect(latex.text).toContain("🪨 Evidence uses 50\\% A\\&B\\_1.");
    expect(latex.semanticContentHash).toBe(compiled.draft.content_hash);
  });

  it("fails closed on aggregate drift or an unrequested format", () => {
    const drifted = renderHarness();
    const firstSpan = drifted.renderInput.aggregate.spans[0];
    if (firstSpan === undefined)
      throw new Error("Expected a DraftSpan fixture.");
    firstSpan.content.exact_text = "Changed";
    expectRendererCode(
      () => drifted.renderer.renderRequested(drifted.renderInput),
      "COMPOSITION_RENDERER_AGGREGATE_INVALID",
    );

    const unrequested = renderHarness();
    unrequested.renderInput.aggregate.citationBundle.content.export_formats = [
      "inline",
      "markdown",
      "bibtex",
    ];
    unrequested.renderInput.aggregate.citationBundle.content_hash =
      canonicalHash(unrequested.renderInput.aggregate.citationBundle.content);
    expectRendererCode(
      () => unrequested.renderer.renderOne(unrequested.renderInput, "latex"),
      "COMPOSITION_RENDERER_FORMAT_NOT_REQUESTED",
    );
  });

  it("keeps missing dates and identifiers visibly absent from BibTeX", () => {
    const { compiler, input } = makeHarness();
    input.scholarlyRecords.externalIdentifiers = [];
    const version = input.scholarlyRecords.workVersions[0];
    if (version === undefined) {
      throw new Error("Expected one WorkVersion fixture.");
    }
    delete version.published_date;
    const compiled = compiler.compile(input);
    const bibtex = new DeterministicCompositionRenderer().renderOne(
      {
        aggregate: compiled,
        renderedBy: {
          actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
          actor_kind: "service",
        },
        renderedAt: "2026-09-04T04:00:00.000Z",
      },
      "bibtex",
    ).text;

    expect(bibtex).not.toMatch(/\n\s*(year|date|doi|url|eprint)\s*=/);
    expect(bibtex).toContain("Metadata is partial.");
  });
});
