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
  InMemoryContextPacketRegistry,
  type PacketRecord,
} from "../src/context-packet-registry.js";

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
