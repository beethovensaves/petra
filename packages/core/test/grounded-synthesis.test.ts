import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraContextPacket,
  PetraDomainEvent,
  PetraEvidencePacket,
  PetraModelSynthesistOutput,
  PetraSourceSpan,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import {
  GroundedSynthesisValidator,
  InMemoryContextPacketRegistry,
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

const packetRecords = (): PacketRecord[] => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected applied event fixture.");
  }
  return [
    event.event.payload.claim,
    event.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ];
};

const setup = () => {
  const registry = new InMemoryContextPacketRegistry();
  const context = readFixture<PetraContextPacket>("context-packet");
  const evidence = readFixture<PetraEvidencePacket>("evidence-packet");
  registry.registerContextPacket(context, packetRecords());
  registry.registerEvidencePacket(evidence);
  return {
    context,
    evidence,
    validator: new GroundedSynthesisValidator(registry),
  };
};

const synthesis = (): PetraModelSynthesistOutput =>
  readFixture<PetraModelSynthesistOutput>("model-synthesist-output");

const validId = (kind: "claim" | "assertion") =>
  `${kind}_01ARZ3NDEKTSV4RRFFQ69G5FD0`;

describe("GroundedSynthesisValidator", () => {
  it("accepts and freezes source report, Petra synthesis, and unresolved inference", () => {
    const { context, evidence, validator } = setup();
    const result = validator.validate(
      synthesis(),
      context.context_packet_id,
      evidence.evidence_packet_id,
    );

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.statements)).toBe(true);
    expect(result.statements.map(({ origin }) => origin)).toEqual([
      "source_report",
      "petra_synthesis",
      "unresolved_inference",
    ]);
  });

  it("rejects an exact-looking reference outside the EvidencePacket", () => {
    const { context, evidence, validator } = setup();
    const output = synthesis();
    const first = output.statements[0];
    if (first?.origin !== "source_report") throw new Error("Expected report.");
    first.evidence_refs[0].object_id = validId("assertion");

    expect(() =>
      validator.validate(
        output,
        context.context_packet_id,
        evidence.evidence_packet_id,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SYNTHESIS_EVIDENCE_REF_MISMATCH" }),
    );
  });

  it("requires a source report to resolve through trusted ASSERTS provenance", () => {
    const { context, evidence, validator } = setup();
    const output = synthesis();
    const report = output.statements[0];
    const composition = output.statements[1];
    if (
      report?.origin !== "source_report" ||
      composition?.origin !== "petra_synthesis"
    ) {
      throw new Error("Expected report and synthesis statements.");
    }
    const claimRef = composition.evidence_refs.find(
      (ref) => ref.object_kind === "claim",
    );
    if (claimRef === undefined) throw new Error("Expected Claim ref.");
    report.evidence_refs = [structuredClone(claimRef)];

    expect(() =>
      validator.validate(
        output,
        context.context_packet_id,
        evidence.evidence_packet_id,
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "SYNTHESIS_SOURCE_REPORT_ASSERTION_REQUIRED",
      }),
    );
  });

  it("rejects changed SourceSpan selection or hidden packet coverage", () => {
    const sourceMismatch = setup();
    const firstOutput = synthesis();
    const report = firstOutput.statements[0];
    if (report?.origin !== "source_report") throw new Error("Expected report.");
    report.evidence_refs[0].source_span_selection_orders = [2];
    expect(() =>
      sourceMismatch.validator.validate(
        firstOutput,
        sourceMismatch.context.context_packet_id,
        sourceMismatch.evidence.evidence_packet_id,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SYNTHESIS_SOURCE_SPAN_MISMATCH" }),
    );

    const coverageMismatch = setup();
    const secondOutput = synthesis();
    secondOutput.coverage.material_omissions_acknowledged = false;
    expect(() =>
      coverageMismatch.validator.validate(
        secondOutput,
        coverageMismatch.context.context_packet_id,
        coverageMismatch.evidence.evidence_packet_id,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SYNTHESIS_COVERAGE_MISMATCH" }),
    );
  });

  it("rejects duplicate statement identities after schema validation", () => {
    const { context, evidence, validator } = setup();
    const output = synthesis();
    const second = output.statements[1];
    if (second === undefined) throw new Error("Expected a second statement.");
    second.statement_key = output.statements[0].statement_key;

    expect(() =>
      validator.validate(
        output,
        context.context_packet_id,
        evidence.evidence_packet_id,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SYNTHESIS_STATEMENT_KEY_DUPLICATE" }),
    );
  });

  it("rejects a well-formed but untrusted scientific reference", () => {
    const registry = new InMemoryContextPacketRegistry();
    const context = readFixture<PetraContextPacket>("context-packet");
    const evidence = readFixture<PetraEvidencePacket>("evidence-packet");
    const records = packetRecords().map((record) => structuredClone(record));
    for (const record of records) {
      if (
        record.schema_name === "petra.claim" ||
        record.schema_name === "petra.assertion"
      ) {
        record.revision = 1;
        record.authority = {
          zone: "quarantine",
          review_state: "machine_checked",
        };
      }
    }
    for (const inclusion of context.content.included_objects) {
      const record = records.find((candidate) => {
        if (candidate.schema_name === "petra.claim") {
          return candidate.claim_id === inclusion.object_ref.object_id;
        }
        if (candidate.schema_name === "petra.assertion") {
          return candidate.assertion_id === inclusion.object_ref.object_id;
        }
        if (candidate.schema_name === "petra.source-span") {
          return candidate.source_span_id === inclusion.object_ref.object_id;
        }
        return candidate.work_version_id === inclusion.object_ref.object_id;
      });
      if (
        record?.schema_name === "petra.claim" ||
        record?.schema_name === "petra.assertion"
      ) {
        inclusion.object_ref.object_revision = 1;
        inclusion.object_ref.object_hash = `sha256:${createHash("sha256")
          .update(canonicalize(record))
          .digest("hex")}`;
        inclusion.authority = {
          zone: "quarantine",
          review_state: "machine_checked",
        };
      }
    }
    context.content.objective.target_refs[0] = structuredClone(
      context.content.included_objects[0].object_ref,
    );
    context.content_hash = `sha256:${createHash("sha256")
      .update(canonicalize(context.content))
      .digest("hex")}`;
    evidence.content.context_packet_ref.content_hash = context.content_hash;
    evidence.content.selected_evidence = evidence.content.selected_evidence.map(
      (selection) => {
        const inclusion = context.content.included_objects.find(
          (candidate) =>
            candidate.selection_order === selection.context_selection_order,
        );
        return inclusion === undefined
          ? selection
          : { ...selection, object_ref: structuredClone(inclusion.object_ref) };
      },
    ) as PetraEvidencePacket["content"]["selected_evidence"];
    evidence.content_hash = `sha256:${createHash("sha256")
      .update(canonicalize(evidence.content))
      .digest("hex")}`;
    registry.registerContextPacket(context, records);
    registry.registerEvidencePacket(evidence);

    const output = synthesis();
    for (const statement of output.statements) {
      statement.evidence_refs = statement.evidence_refs.map((ref) => {
        const selected = evidence.content.selected_evidence.find(
          (selection) =>
            selection.context_selection_order === ref.context_selection_order,
        );
        return selected === undefined
          ? ref
          : {
              ...ref,
              object_revision: selected.object_ref.object_revision,
              object_hash: selected.object_ref.object_hash,
            };
      }) as typeof statement.evidence_refs;
    }
    const validator = new GroundedSynthesisValidator(registry);
    expect(() =>
      validator.validate(
        output,
        context.context_packet_id,
        evidence.evidence_packet_id,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SYNTHESIS_UNTRUSTED_EVIDENCE" }),
    );
  });
});
