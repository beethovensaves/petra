import { createHash } from "node:crypto";

import type {
  ContextInclusion,
  ContextObjectRef,
  PetraAssertion,
  PetraClaim,
  PetraContextPacket,
  PetraEvidencePacket,
  PetraSourceSpan,
  PetraWorkVersion,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

export type PacketRecord =
  PetraClaim | PetraAssertion | PetraSourceSpan | PetraWorkVersion;

export type ContextPacketErrorCode =
  | "CONTEXT_PACKET_CONTENT_HASH_MISMATCH"
  | "CONTEXT_PACKET_ID_ALREADY_REGISTERED"
  | "CONTEXT_PACKET_ORDER_INVALID"
  | "CONTEXT_PACKET_OBJECT_DUPLICATE"
  | "CONTEXT_PACKET_OBJECT_MISSING"
  | "CONTEXT_PACKET_OBJECT_MISMATCH"
  | "CONTEXT_PACKET_AUTHORITY_MISMATCH"
  | "CONTEXT_PACKET_SOURCE_ACCESS_MISMATCH"
  | "CONTEXT_PACKET_SOURCE_SPAN_MISMATCH"
  | "CONTEXT_PACKET_TARGET_MISMATCH"
  | "CONTEXT_PACKET_BUDGET_MISMATCH"
  | "CONTEXT_PACKET_OMISSION_MISMATCH"
  | "CONTEXT_PACKET_DEPENDENCY_DUPLICATE"
  | "EVIDENCE_PACKET_CONTENT_HASH_MISMATCH"
  | "EVIDENCE_PACKET_ID_ALREADY_REGISTERED"
  | "EVIDENCE_PACKET_CONTEXT_MISSING"
  | "EVIDENCE_PACKET_CONTEXT_MISMATCH"
  | "EVIDENCE_PACKET_PARTITION_INVALID"
  | "EVIDENCE_PACKET_OBJECT_MISMATCH"
  | "EVIDENCE_PACKET_SOURCE_SPAN_MISMATCH"
  | "EVIDENCE_PACKET_BEARING_MISMATCH"
  | "EVIDENCE_PACKET_COVERAGE_MISMATCH"
  | "EVIDENCE_PACKET_TIMESTAMP_INVALID";

export class ContextPacketError extends Error {
  readonly code: ContextPacketErrorCode;

  constructor(code: ContextPacketErrorCode, message: string) {
    super(message);
    this.name = "ContextPacketError";
    this.code = code;
  }
}

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

interface Stored<Value> {
  readonly fingerprint: string;
  readonly value: DeepReadonly<Value>;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

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

const refKey = (ref: ContextObjectRef): string =>
  `${ref.object_kind}:${ref.object_id}:${ref.object_revision}:${ref.object_hash}`;

const recordIdentity = (
  record: PacketRecord,
): { kind: ContextObjectRef["object_kind"]; id: string; revision: number } => {
  switch (record.schema_name) {
    case "petra.claim":
      return { kind: "claim", id: record.claim_id, revision: record.revision };
    case "petra.assertion":
      return {
        kind: "assertion",
        id: record.assertion_id,
        revision: record.revision,
      };
    case "petra.source-span":
      return {
        kind: "source_span",
        id: record.source_span_id,
        revision: record.revision,
      };
    case "petra.work-version":
      return {
        kind: "work_version",
        id: record.work_version_id,
        revision: record.revision,
      };
  }
};

const sameSet = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length &&
  left.every((value) => new Set(right).has(value));

const expectedSourceSpans = (record: PacketRecord): readonly string[] => {
  if (record.schema_name === "petra.claim") {
    return record.basis.basis_kind === "source"
      ? record.basis.source_span_ids
      : [];
  }
  if (record.schema_name === "petra.assertion") {
    return record.provenance_refs
      .filter((ref) => ref.provenance_kind === "source_span")
      .map((ref) => ref.source_span_id);
  }
  return [];
};

const bearingCompatible = (
  inclusion: ContextInclusion,
  bearing: PetraEvidencePacket["content"]["selected_evidence"][number]["bearing"],
): boolean => {
  const roles = new Set(inclusion.evidence_roles);
  switch (bearing) {
    case "supporting":
      return roles.has("supporting") || roles.has("relevant");
    case "contrary":
      return roles.has("contrary");
    case "qualifying":
      return roles.has("qualifying");
    case "conflicting":
      return roles.has("conflicting");
    case "background":
      return roles.has("source_location") || roles.has("relevant");
    case "unresolved":
      return roles.has("conflicting") || roles.has("relevant");
  }
};

export class InMemoryContextPacketRegistry {
  readonly #contexts = new Map<string, Stored<PetraContextPacket>>();
  readonly #contextRecords = new Map<
    string,
    Map<string, DeepReadonly<PacketRecord>>
  >();
  readonly #evidence = new Map<string, Stored<PetraEvidencePacket>>();

  get contextPacketCount(): number {
    return this.#contexts.size;
  }

  get evidencePacketCount(): number {
    return this.#evidence.size;
  }

  getContextPacket(
    contextPacketId: string,
  ): DeepReadonly<PetraContextPacket> | undefined {
    return this.#contexts.get(contextPacketId)?.value;
  }

  getEvidencePacket(
    evidencePacketId: string,
  ): DeepReadonly<PetraEvidencePacket> | undefined {
    return this.#evidence.get(evidencePacketId)?.value;
  }

  getContextRecord(
    contextPacketId: string,
    objectId: string,
    revision: number,
  ): DeepReadonly<PacketRecord> | undefined {
    return this.#contextRecords
      .get(contextPacketId)
      ?.get(`${objectId}:${revision}`);
  }

  registerContextPacket(
    packet: PetraContextPacket,
    records: readonly PacketRecord[],
  ): DeepReadonly<PetraContextPacket> {
    const fingerprint = canonicalHash(packet);
    const existing = this.#contexts.get(packet.context_packet_id);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new ContextPacketError(
          "CONTEXT_PACKET_ID_ALREADY_REGISTERED",
          "The ContextPacket ID is already bound to different content.",
        );
      }
      return existing.value;
    }
    if (packet.content_hash !== canonicalHash(packet.content)) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_CONTENT_HASH_MISMATCH",
        "The ContextPacket hash does not identify its exact canonical content.",
      );
    }
    this.#validateContextStructure(packet);
    this.#validateContextRecords(packet, records);
    const stored: Stored<PetraContextPacket> = {
      fingerprint,
      value: immutableCopy(packet),
    };
    this.#contexts.set(packet.context_packet_id, stored);
    this.#contextRecords.set(
      packet.context_packet_id,
      new Map(
        records.map((record) => {
          const identity = recordIdentity(record);
          return [`${identity.id}:${identity.revision}`, immutableCopy(record)];
        }),
      ),
    );
    return stored.value;
  }

  registerEvidencePacket(
    packet: PetraEvidencePacket,
  ): DeepReadonly<PetraEvidencePacket> {
    const fingerprint = canonicalHash(packet);
    const existing = this.#evidence.get(packet.evidence_packet_id);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new ContextPacketError(
          "EVIDENCE_PACKET_ID_ALREADY_REGISTERED",
          "The EvidencePacket ID is already bound to different content.",
        );
      }
      return existing.value;
    }
    if (packet.content_hash !== canonicalHash(packet.content)) {
      throw new ContextPacketError(
        "EVIDENCE_PACKET_CONTENT_HASH_MISMATCH",
        "The EvidencePacket hash does not identify its exact canonical content.",
      );
    }
    const context = this.#contexts.get(
      packet.content.context_packet_ref.context_packet_id,
    )?.value;
    if (context === undefined) {
      throw new ContextPacketError(
        "EVIDENCE_PACKET_CONTEXT_MISSING",
        "The exact ContextPacket must be registered before its EvidencePacket.",
      );
    }
    this.#validateEvidencePacket(packet, context);
    const stored: Stored<PetraEvidencePacket> = {
      fingerprint,
      value: immutableCopy(packet),
    };
    this.#evidence.set(packet.evidence_packet_id, stored);
    return stored.value;
  }

  #validateContextStructure(packet: PetraContextPacket): void {
    const inclusions = packet.content.included_objects;
    const expectedOrders = inclusions.map((_, index) => index + 1);
    if (
      canonicalize(inclusions.map((value) => value.selection_order)) !==
      canonicalize(expectedOrders)
    ) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_ORDER_INVALID",
        "Context selection_order values must be contiguous and match packet order.",
      );
    }
    const objectKeys = inclusions.map((value) => refKey(value.object_ref));
    if (new Set(objectKeys).size !== objectKeys.length) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_OBJECT_DUPLICATE",
        "A ContextPacket cannot include the same exact record twice.",
      );
    }
    const includedRefs = new Set(objectKeys);
    if (
      packet.content.objective.target_refs.some(
        (target) => !includedRefs.has(refKey(target)),
      )
    ) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_TARGET_MISMATCH",
        "Every objective target must be one of the packet's exact included records.",
      );
    }

    const budget = packet.content.budget;
    const tokenTotal = inclusions.reduce(
      (total, value) => total + value.estimated_tokens,
      0,
    );
    const sourceSpanCount = inclusions.filter(
      (value) => value.object_ref.object_kind === "source_span",
    ).length;
    if (
      budget.included_object_count !== inclusions.length ||
      budget.included_source_span_count !== sourceSpanCount ||
      budget.estimated_input_tokens !== tokenTotal ||
      inclusions.length > budget.max_objects ||
      sourceSpanCount > budget.max_source_spans ||
      tokenTotal > budget.max_input_tokens
    ) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_BUDGET_MISMATCH",
        "ContextPacket budget accounting must exactly match included records and remain within every limit.",
      );
    }
    if (
      budget.truncated &&
      !packet.content.omissions.some(
        (omission) =>
          omission.reason === "budget" || omission.reason === "truncation",
      )
    ) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_OMISSION_MISMATCH",
        "A truncated ContextPacket must record a budget or truncation omission.",
      );
    }
    if (
      packet.content.coverage.state === "complete_for_recipe" &&
      packet.content.omissions.some((omission) => omission.material)
    ) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_OMISSION_MISMATCH",
        "A packet with material omissions cannot claim recipe-complete coverage.",
      );
    }
    const dependencies = packet.content.dependencies.map(
      (value) => `${value.dependency_kind}:${value.name}:${value.version}`,
    );
    if (new Set(dependencies).size !== dependencies.length) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_DEPENDENCY_DUPLICATE",
        "ContextPacket dependencies must have unique kind, name, and version identities.",
      );
    }
  }

  #validateContextRecords(
    packet: PetraContextPacket,
    records: readonly PacketRecord[],
  ): void {
    const recordsByIdentity = new Map<string, PacketRecord>();
    for (const record of records) {
      const identity = recordIdentity(record);
      recordsByIdentity.set(
        `${identity.kind}:${identity.id}:${identity.revision}`,
        record,
      );
    }
    const spanIds = new Set(
      packet.content.included_objects
        .filter((value) => value.object_ref.object_kind === "source_span")
        .map((value) => value.object_ref.object_id),
    );
    for (const inclusion of packet.content.included_objects) {
      const ref = inclusion.object_ref;
      const record = recordsByIdentity.get(
        `${ref.object_kind}:${ref.object_id}:${ref.object_revision}`,
      );
      if (record === undefined) {
        throw new ContextPacketError(
          "CONTEXT_PACKET_OBJECT_MISSING",
          `Context record ${ref.object_id}@${ref.object_revision} was not supplied.`,
        );
      }
      const identity = recordIdentity(record);
      if (
        identity.kind !== ref.object_kind ||
        identity.id !== ref.object_id ||
        identity.revision !== ref.object_revision ||
        canonicalHash(record) !== ref.object_hash
      ) {
        throw new ContextPacketError(
          "CONTEXT_PACKET_OBJECT_MISMATCH",
          `Context record ${ref.object_id} does not match its exact kind, revision, and hash.`,
        );
      }
      this.#validateInclusionAuthority(inclusion, record);
      this.#validateInclusionSource(inclusion, record, spanIds);
    }
  }

  #validateInclusionAuthority(
    inclusion: ContextInclusion,
    record: PacketRecord,
  ): void {
    if (
      record.schema_name === "petra.claim" ||
      record.schema_name === "petra.assertion"
    ) {
      if (
        inclusion.authority.zone !== record.authority.zone ||
        inclusion.authority.review_state !== record.authority.review_state
      ) {
        throw new ContextPacketError(
          "CONTEXT_PACKET_AUTHORITY_MISMATCH",
          "Packet trust and review metadata must reproduce the included scientific record.",
        );
      }
      return;
    }
    if (
      inclusion.authority.zone !== "source_record" ||
      inclusion.authority.review_state !== "not_applicable"
    ) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_AUTHORITY_MISMATCH",
        "Source and scholarly identity records must be labeled source_record, not scientifically trusted.",
      );
    }
  }

  #validateInclusionSource(
    inclusion: ContextInclusion,
    record: PacketRecord,
    includedSpanIds: ReadonlySet<string>,
  ): void {
    const expectedSpans = expectedSourceSpans(record);
    if (!sameSet(inclusion.source_span_refs, expectedSpans)) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_SOURCE_SPAN_MISMATCH",
        "Packet source-span references must exactly reproduce the scientific record's source provenance.",
      );
    }
    if (inclusion.source_span_refs.some((id) => !includedSpanIds.has(id))) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_SOURCE_SPAN_MISMATCH",
        "Every named SourceSpan must be included as an exact packet record.",
      );
    }
    if (
      record.schema_name === "petra.claim" &&
      record.basis.basis_kind === "source"
    ) {
      const compatible =
        record.basis.source_scope === "abstract_only"
          ? inclusion.source_access === "abstract_only"
          : inclusion.source_access === "full_text_structured" ||
            inclusion.source_access === "full_text_analyzed";
      if (!compatible) {
        throw new ContextPacketError(
          "CONTEXT_PACKET_SOURCE_ACCESS_MISMATCH",
          "A source-backed Claim must preserve abstract-only or full-text processing depth.",
        );
      }
    }
    if (
      record.schema_name === "petra.source-span" &&
      inclusion.source_access !== "full_text_structured" &&
      inclusion.source_access !== "full_text_analyzed"
    ) {
      throw new ContextPacketError(
        "CONTEXT_PACKET_SOURCE_ACCESS_MISMATCH",
        "An included SourceSpan must be labeled as structured or analyzed full text.",
      );
    }
  }

  #validateEvidencePacket(
    packet: PetraEvidencePacket,
    context: DeepReadonly<PetraContextPacket>,
  ): void {
    if (
      packet.project_id !== context.project_id ||
      canonicalize(packet.snapshot_ref) !==
        canonicalize(context.snapshot_ref) ||
      packet.content.context_packet_ref.content_hash !== context.content_hash
    ) {
      throw new ContextPacketError(
        "EVIDENCE_PACKET_CONTEXT_MISMATCH",
        "An EvidencePacket must bind the exact ContextPacket Project, snapshot, and content hash.",
      );
    }
    if (packet.compiled_at < context.compiled_at) {
      throw new ContextPacketError(
        "EVIDENCE_PACKET_TIMESTAMP_INVALID",
        "An EvidencePacket cannot be compiled before its ContextPacket.",
      );
    }
    const inclusions = new Map(
      context.content.included_objects.map((value) => [
        value.selection_order,
        value,
      ]),
    );
    const selectedOrders = packet.content.selected_evidence.map(
      (value) => value.context_selection_order,
    );
    const excludedOrders = packet.content.exclusions.map(
      (value) => value.context_selection_order,
    );
    const allOrders = [...selectedOrders, ...excludedOrders];
    if (
      new Set(selectedOrders).size !== selectedOrders.length ||
      new Set(excludedOrders).size !== excludedOrders.length ||
      new Set(allOrders).size !== allOrders.length ||
      allOrders.length !== inclusions.size ||
      allOrders.some((order) => !inclusions.has(order))
    ) {
      throw new ContextPacketError(
        "EVIDENCE_PACKET_PARTITION_INVALID",
        "Evidence selections and exclusions must form an exhaustive, disjoint partition of ContextPacket records.",
      );
    }
    const selectedOrderSet = new Set(selectedOrders);
    for (const selection of packet.content.selected_evidence) {
      const inclusion = inclusions.get(selection.context_selection_order);
      if (
        inclusion === undefined ||
        refKey(selection.object_ref) !== refKey(inclusion.object_ref)
      ) {
        throw new ContextPacketError(
          "EVIDENCE_PACKET_OBJECT_MISMATCH",
          "Every EvidencePacket selection must reproduce its exact ContextPacket object reference.",
        );
      }
      if (
        !bearingCompatible(inclusion as ContextInclusion, selection.bearing)
      ) {
        throw new ContextPacketError(
          "EVIDENCE_PACKET_BEARING_MISMATCH",
          "Evidence bearing must be compatible with the ContextPacket evidence role.",
        );
      }
      for (const sourceOrder of selection.source_span_selection_orders) {
        const sourceInclusion = inclusions.get(sourceOrder);
        if (
          sourceInclusion?.object_ref.object_kind !== "source_span" ||
          !selectedOrderSet.has(sourceOrder)
        ) {
          throw new ContextPacketError(
            "EVIDENCE_PACKET_SOURCE_SPAN_MISMATCH",
            "Evidence may cite only SourceSpan records selected from the same ContextPacket.",
          );
        }
      }
    }
    const bearings = new Set(
      packet.content.selected_evidence.map((value) => value.bearing),
    );
    const contextRoles = new Set(
      context.content.included_objects.flatMap((value) => value.evidence_roles),
    );
    this.#validateCoverageStatus(
      "contrary",
      bearings.has("contrary"),
      contextRoles.has("contrary"),
      packet.content.coverage.contrary_evidence_status,
    );
    this.#validateCoverageStatus(
      "qualifying",
      bearings.has("qualifying"),
      contextRoles.has("qualifying"),
      packet.content.coverage.qualifying_evidence_status,
    );
    if (
      packet.content.coverage.state === "complete_for_context" &&
      excludedOrders.length > 0
    ) {
      throw new ContextPacketError(
        "EVIDENCE_PACKET_COVERAGE_MISMATCH",
        "An EvidencePacket with exclusions cannot claim context-complete coverage.",
      );
    }
  }

  #validateCoverageStatus(
    role: "contrary" | "qualifying",
    selected: boolean,
    available: boolean,
    status: "included" | "checked_none_in_context" | "not_checked",
  ): void {
    if (
      (selected && status !== "included") ||
      (!selected && available && status === "checked_none_in_context") ||
      (!available && status === "included")
    ) {
      throw new ContextPacketError(
        "EVIDENCE_PACKET_COVERAGE_MISMATCH",
        `The ${role} evidence status must match what the ContextPacket offered and the EvidencePacket selected.`,
      );
    }
  }
}
