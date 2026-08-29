import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraContextPacket,
  PetraDomainEvent,
  PetraEvidencePacket,
  PetraSourceSpan,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

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

const makeContext = (): PetraContextPacket =>
  readFixture<PetraContextPacket>("context-packet");

const makeEvidence = (): PetraEvidencePacket =>
  readFixture<PetraEvidencePacket>("evidence-packet");

const makeRecords = (): PacketRecord[] => {
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

const rehashContext = (packet: PetraContextPacket): void => {
  packet.content_hash = canonicalHash(packet.content);
};

const rehashEvidence = (packet: PetraEvidencePacket): void => {
  packet.content_hash = canonicalHash(packet.content);
};

const expectCode = (operation: () => unknown, code: string): void => {
  expect(operation).toThrowError(expect.objectContaining({ code }));
};

const registerContext = (
  registry: InMemoryContextPacketRegistry,
  packet: PetraContextPacket = makeContext(),
): PetraContextPacket =>
  registry.registerContextPacket(packet, makeRecords()) as PetraContextPacket;

describe("bounded ContextPacket and EvidencePacket registration", () => {
  it("registers an exact ContextPacket immutably and idempotently", () => {
    const registry = new InMemoryContextPacketRegistry();
    const input = makeContext();
    const first = registry.registerContextPacket(input, makeRecords());
    const replay = registry.registerContextPacket(
      structuredClone(input),
      makeRecords(),
    );

    expect(replay).toBe(first);
    expect(registry.contextPacketCount).toBe(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.content.included_objects)).toBe(true);
    input.content.objective.statement = "Mutated caller objective";
    expect(first.content.objective.statement).not.toBe(
      "Mutated caller objective",
    );
  });

  it("rejects changed content, object hashes, and missing records atomically", () => {
    const changedContent = makeContext();
    changedContent.content.objective.statement = "Changed beneath old hash";
    const first = new InMemoryContextPacketRegistry();
    expectCode(
      () => first.registerContextPacket(changedContent, makeRecords()),
      "CONTEXT_PACKET_CONTENT_HASH_MISMATCH",
    );
    expect(first.contextPacketCount).toBe(0);

    const changedObject = makeContext();
    changedObject.content.included_objects[0].object_ref.object_hash =
      "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    changedObject.content.objective.target_refs[0] = structuredClone(
      changedObject.content.included_objects[0].object_ref,
    );
    rehashContext(changedObject);
    const second = new InMemoryContextPacketRegistry();
    expectCode(
      () => second.registerContextPacket(changedObject, makeRecords()),
      "CONTEXT_PACKET_OBJECT_MISMATCH",
    );
    expect(second.contextPacketCount).toBe(0);

    const third = new InMemoryContextPacketRegistry();
    expectCode(
      () => third.registerContextPacket(makeContext(), makeRecords().slice(1)),
      "CONTEXT_PACKET_OBJECT_MISSING",
    );
    expect(third.contextPacketCount).toBe(0);
  });

  it("requires exact budget accounting and contiguous visible selection order", () => {
    const badBudget = makeContext();
    badBudget.content.budget.estimated_input_tokens += 1;
    rehashContext(badBudget);
    const first = new InMemoryContextPacketRegistry();
    expectCode(
      () => first.registerContextPacket(badBudget, makeRecords()),
      "CONTEXT_PACKET_BUDGET_MISMATCH",
    );

    const badOrder = makeContext();
    badOrder.content.included_objects[1]!.selection_order = 4;
    rehashContext(badOrder);
    const second = new InMemoryContextPacketRegistry();
    expectCode(
      () => second.registerContextPacket(badOrder, makeRecords()),
      "CONTEXT_PACKET_ORDER_INVALID",
    );

    const hiddenTruncation = makeContext();
    hiddenTruncation.content.budget.truncated = true;
    rehashContext(hiddenTruncation);
    const third = new InMemoryContextPacketRegistry();
    expectCode(
      () => third.registerContextPacket(hiddenTruncation, makeRecords()),
      "CONTEXT_PACKET_OMISSION_MISMATCH",
    );

    const duplicateDependency = makeContext();
    duplicateDependency.content.dependencies.push(
      structuredClone(duplicateDependency.content.dependencies[0]),
    );
    rehashContext(duplicateDependency);
    const fourth = new InMemoryContextPacketRegistry();
    expectCode(
      () => fourth.registerContextPacket(duplicateDependency, makeRecords()),
      "CONTEXT_PACKET_DEPENDENCY_DUPLICATE",
    );
  });

  it("preserves full-text depth and requires every provenance span in the packet", () => {
    const abstractMismatch = makeContext();
    abstractMismatch.content.included_objects[0].source_access =
      "abstract_only";
    rehashContext(abstractMismatch);
    const first = new InMemoryContextPacketRegistry();
    expectCode(
      () => first.registerContextPacket(abstractMismatch, makeRecords()),
      "CONTEXT_PACKET_SOURCE_ACCESS_MISMATCH",
    );

    const missingSpan = makeContext();
    missingSpan.content.included_objects.splice(2, 1);
    missingSpan.content.budget.included_object_count = 2;
    missingSpan.content.budget.included_source_span_count = 0;
    missingSpan.content.budget.estimated_input_tokens = 200;
    rehashContext(missingSpan);
    const second = new InMemoryContextPacketRegistry();
    expectCode(
      () => second.registerContextPacket(missingSpan, makeRecords()),
      "CONTEXT_PACKET_SOURCE_SPAN_MISMATCH",
    );
  });

  it("registers an exhaustive immutable EvidencePacket over the exact context", () => {
    const registry = new InMemoryContextPacketRegistry();
    registerContext(registry);
    const input = makeEvidence();
    const first = registry.registerEvidencePacket(input);
    const replay = registry.registerEvidencePacket(structuredClone(input));

    expect(replay).toBe(first);
    expect(registry.evidencePacketCount).toBe(1);
    expect(Object.isFrozen(first.content.selected_evidence)).toBe(true);
    expect(first.content.coverage.state).toBe("complete_for_context");
    expect(first.content.freshness.state).toBe("current_for_snapshot");
  });

  it("rejects hidden EvidencePacket omissions and unselected source spans", () => {
    const incomplete = makeEvidence();
    incomplete.content.selected_evidence.pop();
    rehashEvidence(incomplete);
    const first = new InMemoryContextPacketRegistry();
    registerContext(first);
    expectCode(
      () => first.registerEvidencePacket(incomplete),
      "EVIDENCE_PACKET_PARTITION_INVALID",
    );
    expect(first.evidencePacketCount).toBe(0);

    const hiddenSpan = makeEvidence();
    hiddenSpan.content.selected_evidence.pop();
    hiddenSpan.content.exclusions.push({
      context_selection_order: 3,
      reason: "not_relevant",
      detail: "The source location was excluded.",
    });
    hiddenSpan.content.coverage.state = "bounded";
    rehashEvidence(hiddenSpan);
    const second = new InMemoryContextPacketRegistry();
    registerContext(second);
    expectCode(
      () => second.registerEvidencePacket(hiddenSpan),
      "EVIDENCE_PACKET_SOURCE_SPAN_MISMATCH",
    );
    expect(second.evidencePacketCount).toBe(0);
  });

  it("binds EvidencePacket Project, snapshot, context hash, and compile order", () => {
    const cases: Array<{
      code: string;
      mutate: (packet: PetraEvidencePacket) => void;
    }> = [
      {
        code: "EVIDENCE_PACKET_CONTEXT_MISMATCH",
        mutate: (packet) => {
          packet.content.context_packet_ref.content_hash =
            "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        },
      },
      {
        code: "EVIDENCE_PACKET_CONTEXT_MISMATCH",
        mutate: (packet) => {
          packet.snapshot_ref.event_position = 2;
        },
      },
      {
        code: "EVIDENCE_PACKET_TIMESTAMP_INVALID",
        mutate: (packet) => {
          packet.compiled_at = "2026-08-29T14:59:59.000Z";
        },
      },
    ];
    for (const testCase of cases) {
      const registry = new InMemoryContextPacketRegistry();
      registerContext(registry);
      const evidence = makeEvidence();
      testCase.mutate(evidence);
      rehashEvidence(evidence);
      expectCode(
        () => registry.registerEvidencePacket(evidence),
        testCase.code,
      );
      expect(registry.evidencePacketCount).toBe(0);
    }
  });

  it("requires contrary and qualifying coverage labels to match selected roles", () => {
    const registry = new InMemoryContextPacketRegistry();
    const context = makeContext();
    context.content.included_objects[0].evidence_roles.push("contrary");
    rehashContext(context);
    registerContext(registry, context);

    const evidence = makeEvidence();
    evidence.content.context_packet_ref.content_hash = context.content_hash;
    rehashEvidence(evidence);
    expectCode(
      () => registry.registerEvidencePacket(evidence),
      "EVIDENCE_PACKET_COVERAGE_MISMATCH",
    );
    expect(registry.evidencePacketCount).toBe(0);
  });
});
