import { readFileSync } from "node:fs";

import type {
  ContextDependency,
  PetraContextPacket,
  PetraDomainEvent,
  PetraSourceSpan,
} from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  ContextPacketCompiler,
  InMemoryContextPacketRegistry,
  estimatePacketRecordTokens,
  type CompileContextPacketInput,
  type ContextCompilationCandidate,
  type DeepReadonly,
  type EvidenceCompilationDecision,
  type PacketRecord,
} from "../src/index.js";

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

const records = (): PacketRecord[] => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected applied ChangeSet event fixture.");
  }
  return [
    event.event.payload.claim,
    event.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ];
};

const candidate = (
  record: PacketRecord,
  evidenceRoles: ContextCompilationCandidate["evidenceRoles"],
  rank: number,
): ContextCompilationCandidate => ({
  record,
  evidenceRoles,
  sourceAccess:
    record.schema_name === "petra.source-span"
      ? "full_text_structured"
      : "full_text_analyzed",
  selection: {
    route: rank === 1 ? "lexical" : "graph_expansion",
    rank,
    score: String(1 / rank),
    reason: "Selected by the bounded test retrieval recipe.",
  },
  material: true,
});

const dependencies = (): [ContextDependency, ...ContextDependency[]] => [
  {
    dependency_kind: "projection",
    name: "petra.authority_graph",
    version: "1.0.0",
    content_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  {
    dependency_kind: "ranking",
    name: "petra-bounded-lexical-graph",
    version: "1.0.0",
    content_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  {
    dependency_kind: "policy",
    name: "rights-decision:fair-guiding-principles",
    version: "1",
    content_hash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  },
];

const contextInput = (): CompileContextPacketInput => {
  const fixture = readFixture<PetraContextPacket>("context-packet");
  const [claim, assertion, span] = records();
  if (claim === undefined || assertion === undefined || span === undefined) {
    throw new Error("Expected three packet records.");
  }
  return {
    projectId: fixture.project_id,
    snapshotRef: fixture.snapshot_ref,
    recipeRef: fixture.recipe_ref,
    objective: {
      kind: "answer",
      statement: "What does the study report, and what qualifies it?",
      targetObjectIds: [
        claim.schema_name === "petra.claim" ? claim.claim_id : "",
      ],
    },
    candidates: [
      candidate(claim, ["relevant", "supporting"], 1),
      candidate(assertion, ["supporting"], 2),
      candidate(span, ["source_location"], 3),
    ],
    omissions: [
      {
        omission_kind: "search_boundary",
        boundary: "No new literature discovery was performed.",
        reason: "not_retrieved",
        material: true,
        detail: "Coverage is the named Project snapshot, not the literature.",
      },
    ],
    coverageStatement:
      "Coverage is bounded to the target and its recorded evidence path.",
    contraryEvidenceChecked: true,
    budget: {
      maxInputTokens: 10_000,
      maxObjects: 10,
      maxSourceSpans: 5,
    },
    dependencies: dependencies(),
    compiledBy: fixture.compiled_by,
    compiledAt: fixture.compiled_at,
  };
};

const selectedDecisions = (
  context: DeepReadonly<PetraContextPacket>,
): EvidenceCompilationDecision[] =>
  context.content.included_objects.map((inclusion) => ({
    decision: "select" as const,
    objectId: inclusion.object_ref.object_id,
    bearing:
      inclusion.object_ref.object_kind === "source_span"
        ? ("background" as const)
        : ("supporting" as const),
    inclusionReason: "Selected for the bounded composition.",
    useLimitations: ["Do not generalize beyond the recorded scope."],
  }));

describe("ContextPacketCompiler", () => {
  it("compiles, hashes, registers, and replays an exact bounded ContextPacket", () => {
    const registry = new InMemoryContextPacketRegistry();
    const compiler = new ContextPacketCompiler(registry);
    const input = contextInput();
    const first = compiler.compileContextPacket(input);
    const replay = compiler.compileContextPacket(structuredClone(input));

    expect(replay).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.context_packet_id).toMatch(/^context_packet_/);
    expect(
      first.content.included_objects.map(
        ({ object_ref }) => object_ref.object_kind,
      ),
    ).toEqual(["claim", "source_span", "assertion"]);
    expect(first.content.budget).toEqual(
      expect.objectContaining({
        included_object_count: 3,
        included_source_span_count: 1,
        truncated: false,
      }),
    );
    expect(
      first.content.dependencies.map(({ dependency_kind }) => dependency_kind),
    ).toContain("policy");
    const authority = first.content.included_objects[0]?.authority;
    expect(authority?.zone).toBe("trusted");
    expect(authority?.review_state).toBe("human_accepted");
    expect(authority).toHaveProperty("promotion");
  });

  it("preserves provenance closure and exposes budget omissions", () => {
    const compiler = new ContextPacketCompiler(
      new InMemoryContextPacketRegistry(),
    );
    const input = contextInput();
    const [claim, assertion, span] = records();
    if (claim === undefined || assertion === undefined || span === undefined) {
      throw new Error("Expected records.");
    }
    input.budget.maxObjects = 2;
    input.budget.maxInputTokens =
      estimatePacketRecordTokens(claim) + estimatePacketRecordTokens(span);
    const context = compiler.compileContextPacket(input);

    expect(
      context.content.included_objects.map(
        ({ object_ref }) => object_ref.object_kind,
      ),
    ).toEqual(["claim", "source_span"]);
    expect(context.content.budget.truncated).toBe(true);
    const assertionOmission = context.content.omissions.find(
      (omission) =>
        omission.omission_kind === "known_object" &&
        omission.object_ref.object_kind === "assertion",
    );
    expect(assertionOmission?.reason).toBe("budget");
    expect(assertionOmission?.material).toBe(true);
    expect(context.content.coverage.state).toBe("bounded");
  });

  it("fails rather than separating an objective target from its SourceSpan", () => {
    const compiler = new ContextPacketCompiler(
      new InMemoryContextPacketRegistry(),
    );
    const input = contextInput();
    input.budget.maxObjects = 1;
    expect(() => compiler.compileContextPacket(input)).toThrowError(
      expect.objectContaining({
        code: "CONTEXT_COMPILATION_REQUIRED_OBJECT_EXCEEDS_BUDGET",
      }),
    );

    const missingSpan = contextInput();
    const [firstWithoutSpan, ...restWithoutSpan] =
      missingSpan.candidates.filter(
        ({ record }) => record.schema_name !== "petra.source-span",
      );
    if (firstWithoutSpan === undefined) throw new Error("Expected candidates.");
    missingSpan.candidates = [firstWithoutSpan, ...restWithoutSpan];
    expect(() => compiler.compileContextPacket(missingSpan)).toThrowError(
      expect.objectContaining({
        code: "CONTEXT_COMPILATION_PROVENANCE_MISSING",
      }),
    );
  });

  it("requires a hashed rights decision for source-backed context", () => {
    const compiler = new ContextPacketCompiler(
      new InMemoryContextPacketRegistry(),
    );
    const input = contextInput();
    const [firstDependency, ...remainingDependencies] =
      input.dependencies.filter(
        ({ name }) => !name.startsWith("rights-decision:"),
      );
    if (firstDependency === undefined)
      throw new Error("Expected dependencies.");
    input.dependencies = [firstDependency, ...remainingDependencies];
    expect(() => compiler.compileContextPacket(input)).toThrowError(
      expect.objectContaining({ code: "CONTEXT_COMPILATION_INPUT_INVALID" }),
    );
  });

  it("compiles an exhaustive composition-specific EvidencePacket", () => {
    const registry = new InMemoryContextPacketRegistry();
    const compiler = new ContextPacketCompiler(registry);
    const context = compiler.compileContextPacket(contextInput());
    const packet = compiler.compileEvidencePacket({
      contextPacketId: context.context_packet_id,
      compositionObjective:
        "Explain the target without exceeding its evidence boundary.",
      temporalPerspective: {
        perspective: "current",
        as_of: "2026-08-29T15:00:01.000Z",
      },
      decisions: selectedDecisions(context),
      coverageStatement:
        "Every bounded context object is selected; literature coverage remains bounded.",
      contraryEvidenceChecked: true,
      qualifyingEvidenceChecked: true,
      freshness: {
        state: "current_for_snapshot",
        checked_at: "2026-08-29T15:00:01.000Z",
      },
      compiledBy: context.compiled_by,
      compiledAt: "2026-08-29T15:00:01.000Z",
    });

    expect(Object.isFrozen(packet)).toBe(true);
    expect(packet.evidence_packet_id).toMatch(/^evidence_packet_/);
    expect(packet.content.context_packet_ref).toEqual({
      context_packet_id: context.context_packet_id,
      content_hash: context.content_hash,
    });
    expect(packet.content.selected_evidence).toHaveLength(3);
    expect(packet.content.exclusions).toEqual([]);
    expect(packet.content.coverage).toEqual(
      expect.objectContaining({
        state: "complete_for_context",
        contrary_evidence_status: "checked_none_in_context",
        qualifying_evidence_status: "checked_none_in_context",
      }),
    );
  });

  it("carries contrary and qualifying bearings and rejects hidden span exclusion", () => {
    const registry = new InMemoryContextPacketRegistry();
    const compiler = new ContextPacketCompiler(registry);
    const input = contextInput();
    input.candidates[0].evidenceRoles = ["contrary"];
    input.candidates[1]!.evidenceRoles = ["qualifying"];
    const context = compiler.compileContextPacket(input);
    const decisions = selectedDecisions(context);
    const contraryDecision = decisions[0];
    const qualifyingDecision = decisions[2];
    if (
      contraryDecision?.decision !== "select" ||
      qualifyingDecision?.decision !== "select"
    ) {
      throw new Error("Expected selected Claim and Assertion decisions.");
    }
    decisions[0] = { ...contraryDecision, bearing: "contrary" };
    decisions[2] = { ...qualifyingDecision, bearing: "qualifying" };
    const evidence = compiler.compileEvidencePacket({
      contextPacketId: context.context_packet_id,
      compositionObjective: "Compare the contrary and qualifying evidence.",
      temporalPerspective: {
        perspective: "current",
        as_of: "2026-08-29T15:00:01.000Z",
      },
      decisions,
      coverageStatement: "Both available evidence bearings are selected.",
      contraryEvidenceChecked: true,
      qualifyingEvidenceChecked: true,
      freshness: {
        state: "current_for_snapshot",
        checked_at: "2026-08-29T15:00:01.000Z",
      },
      compiledBy: context.compiled_by,
      compiledAt: "2026-08-29T15:00:01.000Z",
    });
    expect(evidence.content.coverage.contrary_evidence_status).toBe("included");
    expect(evidence.content.coverage.qualifying_evidence_status).toBe(
      "included",
    );

    const hiddenSpan = selectedDecisions(context);
    const spanDecision = hiddenSpan.find((decision) =>
      decision.objectId.startsWith("source_span_"),
    );
    if (spanDecision === undefined)
      throw new Error("Expected SourceSpan decision.");
    hiddenSpan[hiddenSpan.indexOf(spanDecision)] = {
      decision: "exclude",
      objectId: spanDecision.objectId,
      reason: "budget",
      detail: "Test-only exclusion.",
    };
    expect(() =>
      compiler.compileEvidencePacket({
        contextPacketId: context.context_packet_id,
        compositionObjective: "Invalid hidden-source composition.",
        temporalPerspective: {
          perspective: "current",
          as_of: "2026-08-29T15:00:02.000Z",
        },
        decisions: hiddenSpan,
        coverageStatement: "Invalid fixture.",
        contraryEvidenceChecked: true,
        qualifyingEvidenceChecked: true,
        freshness: {
          state: "current_for_snapshot",
          checked_at: "2026-08-29T15:00:02.000Z",
        },
        compiledBy: context.compiled_by,
        compiledAt: "2026-08-29T15:00:02.000Z",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "EVIDENCE_COMPILATION_SOURCE_SPAN_EXCLUDED",
      }),
    );
  });
});
