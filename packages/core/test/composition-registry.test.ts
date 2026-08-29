import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraAuthor,
  PetraCitationBundle,
  PetraContextPacket,
  PetraDomainEvent,
  PetraDraftArtifact,
  PetraDraftSpan,
  PetraEvidencePacket,
  PetraExternalIdentifier,
  PetraProvenanceMap,
  ProvenanceSpanMapping,
  PetraSourceSpan,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  InMemoryCompositionRegistry,
  type RegisterCompositionInput,
} from "../src/composition-registry.js";
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

const makePacketRecords = (): PacketRecord[] => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected the applied event fixture.");
  }
  return [
    event.event.payload.claim,
    event.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ];
};

const makeInput = (): RegisterCompositionInput => ({
  draft: readFixture<PetraDraftArtifact>("draft-artifact"),
  spans: [
    readFixture<PetraDraftSpan>("draft-span-report"),
    readFixture<PetraDraftSpan>("draft-span-qualification"),
  ],
  provenanceMap: readFixture<PetraProvenanceMap>("provenance-map"),
  citationBundle: readFixture<PetraCitationBundle>("citation-bundle"),
  scholarlyRecords: {
    works: [readFixture<PetraWork>("work")],
    workVersions: [readFixture<PetraWorkVersion>("work-version")],
    authors: [readFixture<PetraAuthor>("author")],
    externalIdentifiers: [
      readFixture<PetraExternalIdentifier>("external-identifier"),
    ],
  },
});

const makeRegistry = (): InMemoryCompositionRegistry => {
  const packetRegistry = new InMemoryContextPacketRegistry();
  packetRegistry.registerContextPacket(
    readFixture<PetraContextPacket>("context-packet"),
    makePacketRecords(),
  );
  packetRegistry.registerEvidencePacket(
    readFixture<PetraEvidencePacket>("evidence-packet"),
  );
  return new InMemoryCompositionRegistry(packetRegistry);
};

const rehashDraft = (draft: PetraDraftArtifact): void => {
  draft.content_hash = canonicalHash(draft.content);
};

const rehashSpan = (span: PetraDraftSpan): void => {
  span.content_hash = canonicalHash(span.content);
};

const rehashMap = (map: PetraProvenanceMap): void => {
  map.content_hash = canonicalHash(map.content);
};

const rehashBundle = (bundle: PetraCitationBundle): void => {
  bundle.content_hash = canonicalHash(bundle.content);
};

const expectCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

describe("immutable evidence-bound composition registration", () => {
  it("registers one exact aggregate immutably and replays it idempotently", () => {
    const registry = makeRegistry();
    const input = makeInput();
    const first = registry.register(input);
    const replay = registry.register(structuredClone(input));

    expect(replay).toBe(first);
    expect(registry.size).toBe(1);
    expect(Object.isFrozen(first.draft)).toBe(true);
    expect(Object.isFrozen(first.spans)).toBe(true);
    expect(Object.isFrozen(first.provenanceMap.content.mappings)).toBe(true);
    expect(Object.isFrozen(first.citationBundle.content.citations)).toBe(true);

    input.draft.content.text = "Mutated caller draft.";
    expect(
      registry.getDraft(first.draft.draft_artifact_id, 1)?.content.text,
    ).toBe(
      "The selected study reports a measurable improvement. The claim is limited to its study-defined evaluation task.",
    );
  });

  it("rejects changed draft content and non-replaying spans atomically", () => {
    const changedDraft = makeInput();
    changedDraft.draft.content.text = "Changed beneath the old hash.";
    const first = makeRegistry();
    expectCode(
      () => first.register(changedDraft),
      "DRAFT_CONTENT_HASH_MISMATCH",
    );
    expect(first.size).toBe(0);

    const changedSpan = makeInput();
    changedSpan.spans[0]!.content.exact_text =
      "The selected study reports no improvement.";
    rehashSpan(changedSpan.spans[0]!);
    const second = makeRegistry();
    expectCode(() => second.register(changedSpan), "DRAFT_SPAN_TEXT_MISMATCH");
    expect(second.size).toBe(0);
  });

  it("rejects overlapping spans and an incomplete span ledger", () => {
    const overlap = makeInput();
    overlap.spans[1]!.content.start = 40;
    overlap.spans[1]!.content.exact_text = Array.from(
      overlap.draft.content.text,
    )
      .slice(40, overlap.spans[1]!.content.end)
      .join("");
    overlap.spans[1]!.content.exact_text_hash = canonicalHash(
      overlap.spans[1]!.content.exact_text,
    );
    rehashSpan(overlap.spans[1]!);
    const first = makeRegistry();
    expectCode(() => first.register(overlap), "DRAFT_SPAN_OVERLAP");

    const incomplete = makeInput();
    incomplete.spans = incomplete.spans.slice(0, 1);
    const second = makeRegistry();
    expectCode(() => second.register(incomplete), "DRAFT_SPAN_SET_MISMATCH");
  });

  it("requires exhaustive provenance over exact EvidencePacket selections", () => {
    const incomplete = makeInput();
    incomplete.provenanceMap.content.mappings.pop();
    rehashMap(incomplete.provenanceMap);
    const first = makeRegistry();
    expectCode(() => first.register(incomplete), "PROVENANCE_MAPPING_INVALID");

    const invented = makeInput();
    const basis = invented.provenanceMap.content.mappings[0].bases[0];
    if (basis?.basis_kind !== "evidence") {
      throw new Error("Expected evidence provenance in the fixture.");
    }
    basis.object_ref.object_hash =
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    rehashMap(invented.provenanceMap);
    const second = makeRegistry();
    expectCode(() => second.register(invented), "PROVENANCE_BASIS_MISMATCH");
  });

  it("keeps unsupported language visible and prevents a false passed state", () => {
    const input = makeInput();
    const firstMapping = input.provenanceMap.content.mappings[0];
    firstMapping.bases = [
      {
        basis_kind: "unsupported",
        relation: "unsupported",
        reason: "No selected EvidencePacket record supports this span.",
      },
    ];
    rehashMap(input.provenanceMap);

    const registry = makeRegistry();
    expectCode(() => registry.register(input), "DRAFT_VALIDATION_MISMATCH");
    expect(registry.size).toBe(0);

    input.draft.validation.state = "failed";
    input.draft.validation.unresolved_support_span_ids = [
      firstMapping.draft_span_id,
    ];
    input.draft.validation.validator_results[0]!.outcome = "fail";
    const stored = registry.register(input);
    expect(stored.draft.validation.state).toBe("failed");
    expect(stored.provenanceMap.content.mappings[0]!.bases[0]!.basis_kind).toBe(
      "unsupported",
    );
  });

  it("rejects invented citation identity, metadata, and author records", () => {
    const badMetadata = makeInput();
    badMetadata.citationBundle.content.citations[0].metadata.title =
      "An invented title";
    rehashBundle(badMetadata.citationBundle);
    const first = makeRegistry();
    expectCode(() => first.register(badMetadata), "CITATION_METADATA_MISMATCH");

    const badAuthor = makeInput();
    badAuthor.citationBundle.content.citations[0].author_refs[0].display_name =
      "Invented Author";
    rehashBundle(badAuthor.citationBundle);
    const second = makeRegistry();
    expectCode(() => second.register(badAuthor), "CITATION_AUTHOR_MISMATCH");
  });

  it("limits citations to evidence-grounded WorkVersions, spans, and access depth", () => {
    const uncitedSpan = makeInput();
    uncitedSpan.citationBundle.content.citations[0].linked_draft_span_ids = [
      uncitedSpan.spans[0]!.draft_span_id,
    ];
    rehashBundle(uncitedSpan.citationBundle);
    const first = makeRegistry();
    expectCode(() => first.register(uncitedSpan), "CITATION_SPAN_MISMATCH");

    const unknownSourceSpan = makeInput();
    unknownSourceSpan.citationBundle.content.citations[0].source_access.source_span_ids =
      ["source_span_01ARZ3NDEKTSV4RRFFQ69G5FD9"];
    rehashBundle(unknownSourceSpan.citationBundle);
    const second = makeRegistry();
    expectCode(
      () => second.register(unknownSourceSpan),
      "CITATION_SOURCE_ACCESS_MISMATCH",
    );

    const ungrounded = makeInput();
    ungrounded.provenanceMap.content.mappings[0].bases = [
      {
        basis_kind: "evidence",
        evidence_selection_order: 3,
        object_ref: structuredClone(
          readFixture<PetraEvidencePacket>("evidence-packet").content
            .selected_evidence[2]!.object_ref,
        ),
        relation: "direct_report",
      },
    ];
    ungrounded.provenanceMap.content.mappings[1]!.bases = [
      {
        basis_kind: "evidence",
        evidence_selection_order: 3,
        object_ref: structuredClone(
          readFixture<PetraEvidencePacket>("evidence-packet").content
            .selected_evidence[2]!.object_ref,
        ),
        relation: "qualification",
      },
    ];
    rehashMap(ungrounded.provenanceMap);
    const third = makeRegistry();
    expectCode(() => third.register(ungrounded), "CITATION_EVIDENCE_MISMATCH");
  });

  it("preserves the root while accepting a stale, researcher-authored revision", () => {
    const registry = makeRegistry();
    const root = makeInput();
    registry.register(root);

    const revision = makeInput();
    const draftId = revision.draft.draft_artifact_id;
    const newSpanIds = [
      "draft_span_01ARZ3NDEKTSV4RRFFQ69G5FD0",
      "draft_span_01ARZ3NDEKTSV4RRFFQ69G5FD1",
    ] as const;
    revision.draft.revision = 2;
    revision.draft.lineage = {
      lineage_kind: "revision",
      parent_draft_artifact_id: draftId,
      parent_revision: 1,
      edit_origin: "researcher_edit",
    };
    revision.draft.production = {
      origin_kind: "researcher_authored",
      researcher_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAX",
    };
    revision.draft.created_by = {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAX",
      actor_kind: "human",
    };
    revision.draft.created_at = "2026-08-29T15:11:00.000Z";
    revision.draft.content.draft_span_ids = [...newSpanIds];
    revision.draft.provenance_map_ref.provenance_map_id =
      "provenance_map_01ARZ3NDEKTSV4RRFFQ69G5FD2";
    revision.draft.citation_bundle_ref.citation_bundle_id =
      "citation_bundle_01ARZ3NDEKTSV4RRFFQ69G5FD3";
    revision.draft.validation.state = "stale";
    rehashDraft(revision.draft);

    revision.spans.forEach((span, index) => {
      span.draft_span_id = newSpanIds[index]!;
      span.draft_ref = {
        draft_artifact_id: draftId,
        revision: 2,
        content_hash: revision.draft.content_hash,
      };
      span.created_by = structuredClone(revision.draft.created_by);
      span.created_at = revision.draft.created_at;
    });

    revision.provenanceMap.provenance_map_id =
      revision.draft.provenance_map_ref.provenance_map_id;
    revision.provenanceMap.draft_ref = {
      draft_artifact_id: draftId,
      revision: 2,
      content_hash: revision.draft.content_hash,
    };
    revision.provenanceMap.compiled_at = "2026-08-29T15:11:01.000Z";
    revision.provenanceMap.content.state = "stale";
    revision.provenanceMap.content.mappings =
      revision.provenanceMap.content.mappings.map((mapping, index) => ({
        ...mapping,
        draft_span_id: newSpanIds[index]!,
        mapping_state: "stale",
        invalidated_by: [draftId],
      })) as unknown as [ProvenanceSpanMapping, ...ProvenanceSpanMapping[]];
    rehashMap(revision.provenanceMap);

    revision.citationBundle.citation_bundle_id =
      revision.draft.citation_bundle_ref.citation_bundle_id;
    revision.citationBundle.draft_ref = {
      draft_artifact_id: draftId,
      revision: 2,
      content_hash: revision.draft.content_hash,
    };
    revision.citationBundle.compiled_at = "2026-08-29T15:11:01.000Z";
    revision.citationBundle.content.citations[0].citation_id =
      "citation_01ARZ3NDEKTSV4RRFFQ69G5FD4";
    revision.citationBundle.content.citations[0].linked_draft_span_ids = [
      ...newSpanIds,
    ];
    rehashBundle(revision.citationBundle);

    registry.register(revision);

    expect(registry.size).toBe(2);
    expect(registry.getDraft(draftId, 1)?.validation.state).toBe("passed");
    expect(registry.getDraft(draftId, 2)?.validation.state).toBe("stale");
    expect(registry.getProvenanceMap(draftId, 2)?.content.state).toBe("stale");
  });
});
