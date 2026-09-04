import type {
  ModelSynthesisEvidenceRef,
  PetraAssertion,
  PetraModelSynthesistOutput,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

import type {
  DeepReadonly,
  InMemoryContextPacketRegistry,
  PacketRecord,
} from "./context-packet-registry.js";

export type GroundedSynthesisErrorCode =
  | "SYNTHESIS_CONTEXT_MISSING"
  | "SYNTHESIS_EVIDENCE_MISSING"
  | "SYNTHESIS_PACKET_MISMATCH"
  | "SYNTHESIS_EVIDENCE_STALE"
  | "SYNTHESIS_STATEMENT_KEY_DUPLICATE"
  | "SYNTHESIS_EVIDENCE_OUTSIDE_PACKET"
  | "SYNTHESIS_EVIDENCE_REF_MISMATCH"
  | "SYNTHESIS_SOURCE_SPAN_MISMATCH"
  | "SYNTHESIS_UNTRUSTED_EVIDENCE"
  | "SYNTHESIS_SOURCE_REPORT_ASSERTION_REQUIRED"
  | "SYNTHESIS_COMPOSITION_EVIDENCE_INSUFFICIENT"
  | "SYNTHESIS_COVERAGE_MISMATCH";

export class GroundedSynthesisError extends Error {
  readonly code: GroundedSynthesisErrorCode;

  constructor(code: GroundedSynthesisErrorCode, message: string) {
    super(message);
    this.name = "GroundedSynthesisError";
    this.code = code;
  }
}

const sameNumbers = (left: readonly number[], right: readonly number[]) =>
  left.length === right.length &&
  left.every((value) => new Set(right).has(value));

const immutableCopy = <Value>(value: Value): DeepReadonly<Value> => {
  const copy = structuredClone(value);
  const freeze = (member: unknown): void => {
    if (
      typeof member !== "object" ||
      member === null ||
      Object.isFrozen(member)
    ) {
      return;
    }
    for (const child of Object.values(member)) freeze(child);
    Object.freeze(member);
  };
  freeze(copy);
  return copy as DeepReadonly<Value>;
};

const isAsserts = (record: PacketRecord): record is PetraAssertion =>
  record.schema_name === "petra.assertion" && record.predicate === "ASSERTS";

/**
 * Validates structured synthesis after provider schema validation and before
 * any response is rendered, streamed, cached, or promoted to a DraftArtifact.
 */
export class GroundedSynthesisValidator {
  readonly #packets: InMemoryContextPacketRegistry;
  readonly #contracts: PetraContractRegistry;

  constructor(
    packets: InMemoryContextPacketRegistry,
    contracts: PetraContractRegistry = new PetraContractRegistry(),
  ) {
    this.#packets = packets;
    this.#contracts = contracts;
  }

  validate(
    output: unknown,
    contextPacketId: string,
    evidencePacketId: string,
  ): DeepReadonly<PetraModelSynthesistOutput> {
    this.#contracts.assertValid("model-synthesist-output", "1.0.0", output);
    const synthesis = output as PetraModelSynthesistOutput;
    const context = this.#packets.getContextPacket(contextPacketId);
    if (context === undefined) {
      throw new GroundedSynthesisError(
        "SYNTHESIS_CONTEXT_MISSING",
        `ContextPacket is not registered: ${contextPacketId}.`,
      );
    }
    const evidence = this.#packets.getEvidencePacket(evidencePacketId);
    if (evidence === undefined) {
      throw new GroundedSynthesisError(
        "SYNTHESIS_EVIDENCE_MISSING",
        `EvidencePacket is not registered: ${evidencePacketId}.`,
      );
    }
    if (
      evidence.project_id !== context.project_id ||
      evidence.content.context_packet_ref.context_packet_id !==
        context.context_packet_id ||
      evidence.content.context_packet_ref.content_hash !==
        context.content_hash ||
      evidence.snapshot_ref.snapshot_id !== context.snapshot_ref.snapshot_id ||
      evidence.snapshot_ref.snapshot_revision !==
        context.snapshot_ref.snapshot_revision ||
      evidence.snapshot_ref.event_position !==
        context.snapshot_ref.event_position ||
      evidence.snapshot_ref.content_hash !== context.snapshot_ref.content_hash
    ) {
      throw new GroundedSynthesisError(
        "SYNTHESIS_PACKET_MISMATCH",
        "Synthesis packets do not identify the same exact Project snapshot and context content.",
      );
    }
    if (evidence.content.freshness.state !== "current_for_snapshot") {
      throw new GroundedSynthesisError(
        "SYNTHESIS_EVIDENCE_STALE",
        "A user-facing scientific response requires evidence current for its named snapshot.",
      );
    }

    const statementKeys = synthesis.statements.map(
      (statement) => statement.statement_key,
    );
    if (new Set(statementKeys).size !== statementKeys.length) {
      throw new GroundedSynthesisError(
        "SYNTHESIS_STATEMENT_KEY_DUPLICATE",
        "A synthesist response cannot repeat a statement key.",
      );
    }
    const selectedByOrder = new Map(
      evidence.content.selected_evidence.map((selection) => [
        selection.context_selection_order,
        selection,
      ]),
    );
    const contextByOrder = new Map(
      context.content.included_objects.map((inclusion) => [
        inclusion.selection_order,
        inclusion,
      ]),
    );

    const resolveRef = (ref: ModelSynthesisEvidenceRef): PacketRecord => {
      const selection = selectedByOrder.get(ref.context_selection_order);
      if (selection === undefined) {
        throw new GroundedSynthesisError(
          "SYNTHESIS_EVIDENCE_OUTSIDE_PACKET",
          `Statement reference order ${ref.context_selection_order} is not selected evidence.`,
        );
      }
      if (
        selection.object_ref.object_kind !== ref.object_kind ||
        selection.object_ref.object_id !== ref.object_id ||
        selection.object_ref.object_revision !== ref.object_revision ||
        selection.object_ref.object_hash !== ref.object_hash
      ) {
        throw new GroundedSynthesisError(
          "SYNTHESIS_EVIDENCE_REF_MISMATCH",
          `Statement reference ${ref.object_id} does not reproduce the exact EvidencePacket object.`,
        );
      }
      if (
        !sameNumbers(
          ref.source_span_selection_orders,
          selection.source_span_selection_orders,
        )
      ) {
        throw new GroundedSynthesisError(
          "SYNTHESIS_SOURCE_SPAN_MISMATCH",
          `Statement reference ${ref.object_id} does not reproduce its exact selected SourceSpans.`,
        );
      }
      for (const sourceOrder of ref.source_span_selection_orders) {
        const sourceSelection = selectedByOrder.get(sourceOrder);
        const sourceContext = contextByOrder.get(sourceOrder);
        if (
          sourceSelection?.object_ref.object_kind !== "source_span" ||
          sourceContext?.object_ref.object_kind !== "source_span"
        ) {
          throw new GroundedSynthesisError(
            "SYNTHESIS_SOURCE_SPAN_MISMATCH",
            `Statement reference ${ref.object_id} names a non-SourceSpan selection as grounding.`,
          );
        }
      }
      const inclusion = contextByOrder.get(ref.context_selection_order);
      if (
        inclusion === undefined ||
        inclusion.object_ref.object_id !== ref.object_id ||
        inclusion.authority.zone !== "trusted"
      ) {
        throw new GroundedSynthesisError(
          "SYNTHESIS_UNTRUSTED_EVIDENCE",
          `Material statement evidence ${ref.object_id} is not trusted in the exact ContextPacket.`,
        );
      }
      const record = this.#packets.getContextRecord(
        context.context_packet_id,
        ref.object_id,
        ref.object_revision,
      );
      if (
        record === undefined ||
        (record.schema_name !== "petra.claim" &&
          record.schema_name !== "petra.assertion")
      ) {
        throw new GroundedSynthesisError(
          "SYNTHESIS_EVIDENCE_REF_MISMATCH",
          `Exact scientific record is unavailable for ${ref.object_id}.`,
        );
      }
      return record as PacketRecord;
    };

    for (const statement of synthesis.statements) {
      const resolved = statement.evidence_refs.map(resolveRef);
      if (statement.origin === "source_report" && !resolved.some(isAsserts)) {
        throw new GroundedSynthesisError(
          "SYNTHESIS_SOURCE_REPORT_ASSERTION_REQUIRED",
          `Source-report statement ${statement.statement_key} requires a trusted ASSERTS record.`,
        );
      }
      if (
        statement.origin === "petra_synthesis" &&
        (resolved.length < 2 ||
          !resolved.some((record) => record.schema_name === "petra.assertion"))
      ) {
        throw new GroundedSynthesisError(
          "SYNTHESIS_COMPOSITION_EVIDENCE_INSUFFICIENT",
          `Petra synthesis ${statement.statement_key} requires at least two exact records including an Assertion.`,
        );
      }
    }

    const materialOmissions = context.content.omissions.some(
      (omission) => omission.material,
    );
    const selectedContext = evidence.content.selected_evidence
      .map((selection) => contextByOrder.get(selection.context_selection_order))
      .filter((inclusion) => inclusion !== undefined);
    const abstractOnlySources = selectedContext.some(
      (inclusion) => inclusion.source_access === "abstract_only",
    );
    if (
      synthesis.coverage.state !== evidence.content.coverage.state ||
      synthesis.coverage.contrary_evidence_status !==
        evidence.content.coverage.contrary_evidence_status ||
      synthesis.coverage.qualifying_evidence_status !==
        evidence.content.coverage.qualifying_evidence_status ||
      synthesis.coverage.material_omissions_acknowledged !==
        materialOmissions ||
      synthesis.coverage.abstract_only_sources_used !== abstractOnlySources
    ) {
      throw new GroundedSynthesisError(
        "SYNTHESIS_COVERAGE_MISMATCH",
        "Synthesist coverage must reproduce packet coverage, material omissions, and abstract-only use exactly.",
      );
    }
    return immutableCopy(synthesis);
  }
}
