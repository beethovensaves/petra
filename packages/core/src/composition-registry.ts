import { createHash } from "node:crypto";

import type {
  CitationEntry,
  CompositionMove,
  ContextInclusion,
  PetraAuthor,
  PetraCitationBundle,
  PetraCompositionPlan,
  PetraCompositionRequest,
  PetraDraftArtifact,
  PetraDraftSpan,
  PetraEvidencePacket,
  PetraExternalIdentifier,
  PetraProvenanceMap,
  PetraWork,
  PetraWorkVersion,
  ProvenanceSpanMapping,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type { InMemoryContextPacketRegistry } from "./context-packet-registry.js";
import { type PacketRecord } from "./context-packet-registry.js";

export type CompositionErrorCode =
  | "COMPOSITION_ALREADY_REGISTERED"
  | "COMPOSITION_REQUEST_ALREADY_REGISTERED"
  | "COMPOSITION_REQUEST_CONTENT_HASH_MISMATCH"
  | "COMPOSITION_PLAN_ALREADY_REGISTERED"
  | "COMPOSITION_PLAN_CONTENT_HASH_MISMATCH"
  | "COMPOSITION_PLAN_REFERENCE_MISMATCH"
  | "COMPOSITION_PLAN_ORDER_INVALID"
  | "COMPOSITION_PLAN_EVIDENCE_MISMATCH"
  | "COMPOSITION_PLAN_POLICY_MISMATCH"
  | "COMPOSITION_PLAN_FORCE_MISMATCH"
  | "COMPOSITION_PLAN_UNRESOLVED_MISMATCH"
  | "DRAFT_CONTENT_HASH_MISMATCH"
  | "DRAFT_CONTROL_MISMATCH"
  | "DRAFT_LINEAGE_INVALID"
  | "DRAFT_PRODUCTION_ACTOR_MISMATCH"
  | "DRAFT_EVIDENCE_MISMATCH"
  | "DRAFT_SPAN_SET_MISMATCH"
  | "DRAFT_SPAN_ID_ALREADY_REGISTERED"
  | "DRAFT_SPAN_CONTENT_HASH_MISMATCH"
  | "DRAFT_SPAN_REFERENCE_MISMATCH"
  | "DRAFT_SPAN_RANGE_INVALID"
  | "DRAFT_SPAN_TEXT_MISMATCH"
  | "DRAFT_SPAN_OVERLAP"
  | "DRAFT_SPAN_SEMANTICS_INVALID"
  | "PROVENANCE_MAP_ID_ALREADY_REGISTERED"
  | "PROVENANCE_CONTENT_HASH_MISMATCH"
  | "PROVENANCE_REFERENCE_MISMATCH"
  | "PROVENANCE_MAPPING_INVALID"
  | "PROVENANCE_BASIS_MISMATCH"
  | "PROVENANCE_STATE_MISMATCH"
  | "DRAFT_VALIDATION_MISMATCH"
  | "CITATION_BUNDLE_ID_ALREADY_REGISTERED"
  | "CITATION_CONTENT_HASH_MISMATCH"
  | "CITATION_REFERENCE_MISMATCH"
  | "CITATION_ID_DUPLICATE"
  | "CITATION_SPAN_MISMATCH"
  | "CITATION_EVIDENCE_MISMATCH"
  | "CITATION_WORK_MISMATCH"
  | "CITATION_VERSION_MISMATCH"
  | "CITATION_AUTHOR_MISMATCH"
  | "CITATION_IDENTIFIER_MISMATCH"
  | "CITATION_METADATA_MISMATCH"
  | "CITATION_IDENTITY_WARNING_MISSING"
  | "CITATION_SOURCE_ACCESS_MISMATCH"
  | "COMPOSITION_TIMESTAMP_INVALID";

export class CompositionError extends Error {
  readonly code: CompositionErrorCode;

  constructor(code: CompositionErrorCode, message: string) {
    super(message);
    this.name = "CompositionError";
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

export interface ScholarlyCitationRecords {
  works: readonly PetraWork[];
  workVersions: readonly PetraWorkVersion[];
  authors: readonly PetraAuthor[];
  externalIdentifiers: readonly PetraExternalIdentifier[];
}

export interface RegisterCompositionInput {
  draft: PetraDraftArtifact;
  spans: readonly PetraDraftSpan[];
  provenanceMap: PetraProvenanceMap;
  citationBundle: PetraCitationBundle;
  scholarlyRecords: ScholarlyCitationRecords;
}

export interface CompositionControlAuthorityRepository {
  registerRequest(
    request: PetraCompositionRequest,
  ): Promise<PetraCompositionRequest>;
  registerPlan(plan: PetraCompositionPlan): Promise<PetraCompositionPlan>;
  getRequest(
    compositionRequestId: string,
  ): Promise<PetraCompositionRequest | undefined>;
  getPlan(compositionPlanId: string): Promise<PetraCompositionPlan | undefined>;
}

interface StoredComposition {
  readonly fingerprint: string;
  readonly draft: DeepReadonly<PetraDraftArtifact>;
  readonly spans: readonly DeepReadonly<PetraDraftSpan>[];
  readonly provenanceMap: DeepReadonly<PetraProvenanceMap>;
  readonly citationBundle: DeepReadonly<PetraCitationBundle>;
}

interface StoredControl<Value> {
  readonly fingerprint: string;
  readonly value: DeepReadonly<Value>;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;

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

const draftKey = (draftId: string, revision: number): string =>
  `${draftId}:${revision}`;

const exactDraftRef = (draft: PetraDraftArtifact) => ({
  draft_artifact_id: draft.draft_artifact_id,
  revision: draft.revision,
  content_hash: draft.content_hash,
});

const exactEvidenceRef = (evidence: DeepReadonly<PetraEvidencePacket>) => ({
  evidence_packet_id: evidence.evidence_packet_id,
  revision: evidence.revision,
  content_hash: evidence.content_hash,
});

const exactRequestRef = (request: DeepReadonly<PetraCompositionRequest>) => ({
  composition_request_id: request.composition_request_id,
  revision: request.revision,
  content_hash: request.content_hash,
});

const exactDraftControlRef = (
  recordId: string,
  revision: number,
  contentHash: string,
) => ({ record_id: recordId, revision, content_hash: contentHash });

const objectRefKey = (ref: {
  object_kind: string;
  object_id: string;
  object_revision: number;
  object_hash: string;
}): string =>
  `${ref.object_kind}:${ref.object_id}:${ref.object_revision}:${ref.object_hash}`;

const positionsAreContiguous = (
  values: readonly { readonly position: number }[],
): boolean => values.every((value, index) => value.position === index + 1);

const sameSet = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length &&
  left.every((value) => new Set(right).has(value));

const sourceAccessRank = (
  value:
    | ContextInclusion["source_access"]
    | CitationEntry["source_access"]["processing_depth"],
): number => {
  switch (value) {
    case "not_applicable":
      return -1;
    case "metadata_only":
      return 0;
    case "abstract_only":
      return 1;
    case "full_text_structured":
      return 2;
    case "full_text_analyzed":
      return 3;
  }
};

const recordWorkVersionIds = (
  record: DeepReadonly<PacketRecord> | undefined,
): readonly string[] => {
  if (record?.schema_name === "petra.claim") {
    return record.basis.basis_kind === "source"
      ? [record.basis.work_version_id]
      : [];
  }
  if (record?.schema_name === "petra.assertion") {
    const ids: string[] = [];
    if (record.subject_id.startsWith("work_version_")) {
      ids.push(record.subject_id);
    }
    if (
      record.object.object_kind === "entity" &&
      record.object.entity_id.startsWith("work_version_")
    ) {
      ids.push(record.object.entity_id);
    }
    return ids;
  }
  if (record?.schema_name === "petra.work-version") {
    return [record.work_version_id];
  }
  return [];
};

export class InMemoryCompositionRegistry {
  readonly #packetRegistry: InMemoryContextPacketRegistry;
  readonly #requests = new Map<
    string,
    StoredControl<PetraCompositionRequest>
  >();
  readonly #plans = new Map<string, StoredControl<PetraCompositionPlan>>();
  readonly #compositions = new Map<string, StoredComposition>();
  readonly #currentDraftRevision = new Map<string, number>();
  readonly #spanIds = new Set<string>();
  readonly #provenanceMapIds = new Set<string>();
  readonly #citationBundleIds = new Set<string>();

  constructor(packetRegistry: InMemoryContextPacketRegistry) {
    this.#packetRegistry = packetRegistry;
  }

  get size(): number {
    return this.#compositions.size;
  }

  get requestCount(): number {
    return this.#requests.size;
  }

  get planCount(): number {
    return this.#plans.size;
  }

  getRequest(
    compositionRequestId: string,
  ): DeepReadonly<PetraCompositionRequest> | undefined {
    return this.#requests.get(compositionRequestId)?.value;
  }

  getPlan(
    compositionPlanId: string,
  ): DeepReadonly<PetraCompositionPlan> | undefined {
    return this.#plans.get(compositionPlanId)?.value;
  }

  registerRequest(
    request: PetraCompositionRequest,
  ): DeepReadonly<PetraCompositionRequest> {
    const fingerprint = canonicalHash(request);
    const existing = this.#requests.get(request.composition_request_id);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new CompositionError(
          "COMPOSITION_REQUEST_ALREADY_REGISTERED",
          "The CompositionRequest ID is already bound to different content.",
        );
      }
      return existing.value;
    }
    if (request.content_hash !== canonicalHash(request.content)) {
      throw new CompositionError(
        "COMPOSITION_REQUEST_CONTENT_HASH_MISMATCH",
        "The CompositionRequest hash does not identify its exact semantic content.",
      );
    }
    const stored: StoredControl<PetraCompositionRequest> = {
      fingerprint,
      value: immutableCopy(request),
    };
    this.#requests.set(request.composition_request_id, stored);
    return stored.value;
  }

  registerPlan(plan: PetraCompositionPlan): DeepReadonly<PetraCompositionPlan> {
    const fingerprint = canonicalHash(plan);
    const existing = this.#plans.get(plan.composition_plan_id);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new CompositionError(
          "COMPOSITION_PLAN_ALREADY_REGISTERED",
          "The CompositionPlan ID is already bound to different content.",
        );
      }
      return existing.value;
    }
    if (plan.content_hash !== canonicalHash(plan.content)) {
      throw new CompositionError(
        "COMPOSITION_PLAN_CONTENT_HASH_MISMATCH",
        "The CompositionPlan hash does not identify its exact semantic content.",
      );
    }
    const request = this.#requests.get(
      plan.composition_request_ref.composition_request_id,
    )?.value;
    const evidence = this.#packetRegistry.getEvidencePacket(
      plan.evidence_packet_ref.evidence_packet_id,
    );
    if (
      request === undefined ||
      evidence === undefined ||
      canonicalize(plan.composition_request_ref) !==
        canonicalize(exactRequestRef(request)) ||
      canonicalize(plan.evidence_packet_ref) !==
        canonicalize(exactEvidenceRef(evidence)) ||
      plan.project_id !== request.project_id ||
      plan.project_id !== evidence.project_id ||
      canonicalize(plan.snapshot_ref) !== canonicalize(request.snapshot_ref) ||
      canonicalize(plan.snapshot_ref) !== canonicalize(evidence.snapshot_ref)
    ) {
      throw new CompositionError(
        "COMPOSITION_PLAN_REFERENCE_MISMATCH",
        "The CompositionPlan must bind the exact registered request, EvidencePacket, Project, and snapshot.",
      );
    }
    if (
      plan.compiled_at < request.requested_at ||
      plan.compiled_at < evidence.compiled_at
    ) {
      throw new CompositionError(
        "COMPOSITION_TIMESTAMP_INVALID",
        "A CompositionPlan cannot precede its request or EvidencePacket.",
      );
    }
    if (evidence.content.composition_objective !== request.content.objective) {
      throw new CompositionError(
        "COMPOSITION_PLAN_REFERENCE_MISMATCH",
        "The CompositionPlan EvidencePacket must have been compiled for the request's exact objective.",
      );
    }
    this.#validatePlanStructure(plan, request, evidence);
    const stored: StoredControl<PetraCompositionPlan> = {
      fingerprint,
      value: immutableCopy(plan),
    };
    this.#plans.set(plan.composition_plan_id, stored);
    return stored.value;
  }

  getDraft(
    draftArtifactId: string,
    revision: number,
  ): DeepReadonly<PetraDraftArtifact> | undefined {
    return this.#compositions.get(draftKey(draftArtifactId, revision))?.draft;
  }

  getSpans(
    draftArtifactId: string,
    revision: number,
  ): readonly DeepReadonly<PetraDraftSpan>[] | undefined {
    return this.#compositions.get(draftKey(draftArtifactId, revision))?.spans;
  }

  getProvenanceMap(
    draftArtifactId: string,
    revision: number,
  ): DeepReadonly<PetraProvenanceMap> | undefined {
    return this.#compositions.get(draftKey(draftArtifactId, revision))
      ?.provenanceMap;
  }

  getCitationBundle(
    draftArtifactId: string,
    revision: number,
  ): DeepReadonly<PetraCitationBundle> | undefined {
    return this.#compositions.get(draftKey(draftArtifactId, revision))
      ?.citationBundle;
  }

  register(input: RegisterCompositionInput): StoredComposition {
    const { draft, spans, provenanceMap, citationBundle } = input;
    const key = draftKey(draft.draft_artifact_id, draft.revision);
    const fingerprint = canonicalHash({
      draft,
      spans,
      provenanceMap,
      citationBundle,
    });
    const existing = this.#compositions.get(key);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new CompositionError(
          "COMPOSITION_ALREADY_REGISTERED",
          "The DraftArtifact revision is already bound to a different composition aggregate.",
        );
      }
      return existing;
    }

    const evidence = this.#requireEvidence(draft);
    const controls = this.#requireCompositionControls(draft, evidence);
    this.#validateDraft(draft, evidence, controls.request, controls.plan);
    this.#validateNewComponentIds(spans, provenanceMap, citationBundle);
    const spansById = this.#validateSpans(draft, spans);
    this.#validateProvenance(draft, spansById, provenanceMap, evidence);
    this.#validateCitationBundle(
      draft,
      spansById,
      provenanceMap,
      citationBundle,
      evidence,
      input.scholarlyRecords,
    );
    this.#validateDraftOutcome(draft, provenanceMap);

    const stored: StoredComposition = {
      fingerprint,
      draft: immutableCopy(draft),
      spans: immutableCopy(spans),
      provenanceMap: immutableCopy(provenanceMap),
      citationBundle: immutableCopy(citationBundle),
    };
    this.#compositions.set(key, stored);
    this.#currentDraftRevision.set(draft.draft_artifact_id, draft.revision);
    for (const span of spans) this.#spanIds.add(span.draft_span_id);
    this.#provenanceMapIds.add(provenanceMap.provenance_map_id);
    this.#citationBundleIds.add(citationBundle.citation_bundle_id);
    return stored;
  }

  #requireEvidence(
    draft: PetraDraftArtifact,
  ): DeepReadonly<PetraEvidencePacket> {
    const evidence = this.#packetRegistry.getEvidencePacket(
      draft.evidence_packet_ref.evidence_packet_id,
    );
    if (
      evidence === undefined ||
      canonicalize(draft.evidence_packet_ref) !==
        canonicalize(exactEvidenceRef(evidence)) ||
      evidence.project_id !== draft.project_id ||
      canonicalize(evidence.snapshot_ref) !== canonicalize(draft.snapshot_ref)
    ) {
      throw new CompositionError(
        "DRAFT_EVIDENCE_MISMATCH",
        "The DraftArtifact must bind a registered EvidencePacket at the same exact Project and snapshot.",
      );
    }
    return evidence;
  }

  #requireCompositionControls(
    draft: PetraDraftArtifact,
    evidence: DeepReadonly<PetraEvidencePacket>,
  ): {
    request: DeepReadonly<PetraCompositionRequest>;
    plan: DeepReadonly<PetraCompositionPlan>;
  } {
    const request = this.#requests.get(
      draft.composition_request_ref.record_id,
    )?.value;
    const plan = this.#plans.get(draft.composition_plan_ref.record_id)?.value;
    if (
      request === undefined ||
      plan === undefined ||
      canonicalize(draft.composition_request_ref) !==
        canonicalize(
          exactDraftControlRef(
            request.composition_request_id,
            request.revision,
            request.content_hash,
          ),
        ) ||
      canonicalize(draft.composition_plan_ref) !==
        canonicalize(
          exactDraftControlRef(
            plan.composition_plan_id,
            plan.revision,
            plan.content_hash,
          ),
        ) ||
      plan.composition_request_ref.composition_request_id !==
        request.composition_request_id ||
      canonicalize(plan.evidence_packet_ref) !==
        canonicalize(exactEvidenceRef(evidence))
    ) {
      throw new CompositionError(
        "DRAFT_CONTROL_MISMATCH",
        "The DraftArtifact must bind the exact registered CompositionRequest and ready CompositionPlan for its EvidencePacket.",
      );
    }
    return { request, plan };
  }

  #validatePlanStructure(
    plan: PetraCompositionPlan,
    request: DeepReadonly<PetraCompositionRequest>,
    evidence: DeepReadonly<PetraEvidencePacket>,
  ): void {
    const sections = plan.content.sections;
    const allMoves = sections.flatMap((section) => section.moves);
    if (
      !positionsAreContiguous(sections) ||
      sections.some((section) => !positionsAreContiguous(section.moves)) ||
      new Set(sections.map((section) => section.section_id)).size !==
        sections.length ||
      new Set(allMoves.map((move) => move.move_id)).size !== allMoves.length
    ) {
      throw new CompositionError(
        "COMPOSITION_PLAN_ORDER_INVALID",
        "CompositionPlan sections and moves must have unique IDs and contiguous positions matching their array order.",
      );
    }
    const selectedByOrder = new Map(
      evidence.content.selected_evidence.map((selection) => [
        selection.context_selection_order,
        selection,
      ]),
    );
    for (const move of allMoves) {
      this.#validatePlanMoveEvidence(move, selectedByOrder);
    }
    const selectedKeys = new Set(
      evidence.content.selected_evidence.map((selection) =>
        objectRefKey(selection.object_ref),
      ),
    );
    if (
      plan.content.state === "ready" &&
      request.content.subject_refs.some(
        (subject) => !selectedKeys.has(objectRefKey(subject)),
      )
    ) {
      throw new CompositionError(
        "COMPOSITION_PLAN_EVIDENCE_MISMATCH",
        "A ready CompositionPlan must include every requested subject in its exact EvidencePacket.",
      );
    }
    const allowedOrigins =
      request.content.evidence_policy.inference_policy === "source_reports_only"
        ? new Set(["source_report", "structural_language"])
        : request.content.evidence_policy.inference_policy ===
            "bounded_synthesis_allowed"
          ? new Set(["source_report", "petra_inference", "structural_language"])
          : new Set([
              "source_report",
              "petra_inference",
              "researcher_statement",
              "structural_language",
            ]);
    if (allMoves.some((move) => !allowedOrigins.has(move.semantic_origin))) {
      throw new CompositionError(
        "COMPOSITION_PLAN_POLICY_MISMATCH",
        "A CompositionPlan move exceeds the request's inference and researcher-material policy.",
      );
    }
    const permittedForces = new Set(
      request.content.requested_output.permitted_scientific_forces,
    );
    if (
      allMoves.some(
        (move) =>
          move.semantic_origin !== "structural_language" &&
          !permittedForces.has(move.scientific_force),
      )
    ) {
      throw new CompositionError(
        "COMPOSITION_PLAN_FORCE_MISMATCH",
        "A CompositionPlan move exceeds the request's permitted scientific-force set.",
      );
    }
    const moveIds = new Set(allMoves.map((move) => move.move_id));
    if (
      plan.content.unresolved_support.some(
        (problem) =>
          new Set(problem.affected_move_ids).size !==
            problem.affected_move_ids.length ||
          problem.affected_move_ids.some((moveId) => !moveIds.has(moveId)),
      ) ||
      (plan.content.state === "ready" &&
        plan.content.unresolved_support.length !== 0) ||
      (plan.content.state === "blocked" &&
        plan.content.unresolved_support.length === 0) ||
      (plan.content.state === "ready" &&
        plan.content.coverage.state === "insufficient")
    ) {
      throw new CompositionError(
        "COMPOSITION_PLAN_UNRESOLVED_MISMATCH",
        "Unresolved support must name existing moves, and a ready plan cannot declare insufficient coverage.",
      );
    }
  }

  #validatePlanMoveEvidence(
    move: CompositionMove,
    selectedByOrder: ReadonlyMap<
      number,
      DeepReadonly<PetraEvidencePacket>["content"]["selected_evidence"][number]
    >,
  ): void {
    const keys = move.evidence_refs.map(
      (ref) => `${ref.context_selection_order}:${objectRefKey(ref.object_ref)}`,
    );
    const mismatched = move.evidence_refs.some((ref) => {
      const selected = selectedByOrder.get(ref.context_selection_order);
      return (
        selected === undefined ||
        canonicalize(selected.object_ref) !== canonicalize(ref.object_ref)
      );
    });
    const relationMismatch =
      (move.semantic_origin === "source_report" &&
        move.evidence_refs.some(
          (ref) =>
            ref.relation !== "direct_report" &&
            ref.relation !== "qualification",
        )) ||
      (move.semantic_origin === "petra_inference" &&
        move.evidence_refs.some(
          (ref) => ref.relation !== "supports_inference",
        ));
    const originBoundaryMismatch =
      (move.semantic_origin === "source_report" &&
        (move.evidence_refs.length === 0 ||
          !move.citation_required ||
          move.scientific_force === "none")) ||
      (move.semantic_origin === "petra_inference" &&
        (move.evidence_refs.length === 0 ||
          !move.citation_required ||
          move.scientific_force === "none" ||
          move.scientific_force === "direct_report")) ||
      (move.semantic_origin === "structural_language" &&
        (move.evidence_refs.length !== 0 ||
          move.citation_required ||
          move.scientific_force !== "none"));
    if (
      mismatched ||
      relationMismatch ||
      originBoundaryMismatch ||
      new Set(keys).size !== keys.length
    ) {
      throw new CompositionError(
        "COMPOSITION_PLAN_EVIDENCE_MISMATCH",
        "Every planned evidence reference must reproduce one unique exact EvidencePacket selection with an origin-compatible relation.",
      );
    }
  }

  #validateDraft(
    draft: PetraDraftArtifact,
    evidence: DeepReadonly<PetraEvidencePacket>,
    request: DeepReadonly<PetraCompositionRequest>,
    plan: DeepReadonly<PetraCompositionPlan>,
  ): void {
    if (draft.content_hash !== canonicalHash(draft.content)) {
      throw new CompositionError(
        "DRAFT_CONTENT_HASH_MISMATCH",
        "The DraftArtifact content hash does not identify its exact semantic content.",
      );
    }
    const currentRevision = this.#currentDraftRevision.get(
      draft.draft_artifact_id,
    );
    if (draft.revision === 1) {
      if (
        draft.lineage.lineage_kind !== "root" ||
        currentRevision !== undefined
      ) {
        throw new CompositionError(
          "DRAFT_LINEAGE_INVALID",
          "Draft revision 1 must be the unique root revision.",
        );
      }
    } else if (
      draft.lineage.lineage_kind !== "revision" ||
      currentRevision !== draft.revision - 1 ||
      draft.lineage.parent_draft_artifact_id !== draft.draft_artifact_id ||
      draft.lineage.parent_revision !== draft.revision - 1
    ) {
      throw new CompositionError(
        "DRAFT_LINEAGE_INVALID",
        "A draft revision must name the immediately preceding revision of the same DraftArtifact.",
      );
    }
    const actor = draft.created_by;
    const origin = draft.production;
    const actorMatches =
      (origin.origin_kind === "model_generated" &&
        actor.actor_kind === "model") ||
      (origin.origin_kind === "deterministic" &&
        actor.actor_kind === "service") ||
      (origin.origin_kind === "researcher_authored" &&
        actor.actor_kind === "human" &&
        actor.actor_id === origin.researcher_id);
    if (!actorMatches) {
      throw new CompositionError(
        "DRAFT_PRODUCTION_ACTOR_MISMATCH",
        "Draft production origin must agree with the recorded producing actor.",
      );
    }
    if (
      plan.content.state !== "ready" ||
      draft.content.artifact_kind !==
        request.content.requested_output.artifact_kind ||
      draft.content.semantic_format !==
        request.content.requested_output.semantic_format ||
      draft.content.language !== request.content.requested_output.language ||
      canonicalize(draft.controls.output_profile) !==
        canonicalize(request.content.control_context.output_profile) ||
      canonicalize(draft.controls.language_contract) !==
        canonicalize(request.content.control_context.language_contract)
    ) {
      throw new CompositionError(
        "DRAFT_CONTROL_MISMATCH",
        "The DraftArtifact output shape and controls must reproduce its exact ready request and plan.",
      );
    }
    if (
      draft.created_at < evidence.compiled_at ||
      draft.created_at < plan.compiled_at ||
      draft.controls.language_contract.name !== "petra.felicity"
    ) {
      throw new CompositionError(
        draft.created_at < evidence.compiled_at
          ? "COMPOSITION_TIMESTAMP_INVALID"
          : "DRAFT_VALIDATION_MISMATCH",
        draft.created_at < evidence.compiled_at
          ? "A DraftArtifact cannot precede its EvidencePacket."
          : "Material Petra prose must name the Felicity language contract.",
      );
    }
  }

  #validateNewComponentIds(
    spans: readonly PetraDraftSpan[],
    provenanceMap: PetraProvenanceMap,
    citationBundle: PetraCitationBundle,
  ): void {
    for (const span of spans) {
      if (this.#spanIds.has(span.draft_span_id)) {
        throw new CompositionError(
          "DRAFT_SPAN_ID_ALREADY_REGISTERED",
          `DraftSpan ${span.draft_span_id} is already registered.`,
        );
      }
    }
    if (this.#provenanceMapIds.has(provenanceMap.provenance_map_id)) {
      throw new CompositionError(
        "PROVENANCE_MAP_ID_ALREADY_REGISTERED",
        `ProvenanceMap ${provenanceMap.provenance_map_id} is already registered.`,
      );
    }
    if (this.#citationBundleIds.has(citationBundle.citation_bundle_id)) {
      throw new CompositionError(
        "CITATION_BUNDLE_ID_ALREADY_REGISTERED",
        `CitationBundle ${citationBundle.citation_bundle_id} is already registered.`,
      );
    }
  }

  #validateSpans(
    draft: PetraDraftArtifact,
    spans: readonly PetraDraftSpan[],
  ): Map<string, PetraDraftSpan> {
    const ids = spans.map((span) => span.draft_span_id);
    if (
      new Set(ids).size !== ids.length ||
      !sameSet(ids, draft.content.draft_span_ids)
    ) {
      throw new CompositionError(
        "DRAFT_SPAN_SET_MISMATCH",
        "The supplied DraftSpans must exactly match the DraftArtifact span ledger.",
      );
    }
    const codePoints = Array.from(draft.content.text);
    const sorted = [...spans].sort(
      (left, right) => left.content.start - right.content.start,
    );
    let priorEnd = 0;
    for (const span of sorted) {
      if (span.content_hash !== canonicalHash(span.content)) {
        throw new CompositionError(
          "DRAFT_SPAN_CONTENT_HASH_MISMATCH",
          `DraftSpan ${span.draft_span_id} has an invalid content hash.`,
        );
      }
      if (
        span.project_id !== draft.project_id ||
        canonicalize(span.draft_ref) !== canonicalize(exactDraftRef(draft))
      ) {
        throw new CompositionError(
          "DRAFT_SPAN_REFERENCE_MISMATCH",
          "Every DraftSpan must bind the exact DraftArtifact Project, revision, and content hash.",
        );
      }
      if (
        span.content.start < 0 ||
        span.content.end <= span.content.start ||
        span.content.end > codePoints.length
      ) {
        throw new CompositionError(
          "DRAFT_SPAN_RANGE_INVALID",
          `DraftSpan ${span.draft_span_id} has an invalid Unicode code-point range.`,
        );
      }
      if (span.content.start < priorEnd) {
        throw new CompositionError(
          "DRAFT_SPAN_OVERLAP",
          "Initial DraftSpans must be non-overlapping semantic ranges.",
        );
      }
      priorEnd = span.content.end;
      const exact = codePoints
        .slice(span.content.start, span.content.end)
        .join("");
      if (
        exact !== span.content.exact_text ||
        textHash(exact) !== span.content.exact_text_hash
      ) {
        throw new CompositionError(
          "DRAFT_SPAN_TEXT_MISMATCH",
          `DraftSpan ${span.draft_span_id} does not resolve to its exact draft text.`,
        );
      }
      const structural = span.content.semantic_origin === "structural_language";
      if (
        (structural &&
          (span.content.materiality !== "nonmaterial" ||
            span.content.scientific_force !== "none")) ||
        (!structural &&
          span.content.materiality === "material" &&
          span.content.scientific_force === "none")
      ) {
        throw new CompositionError(
          "DRAFT_SPAN_SEMANTICS_INVALID",
          "Structural language must be nonmaterial with no scientific force; material language must declare force.",
        );
      }
    }
    return new Map(spans.map((span) => [span.draft_span_id, span]));
  }

  #validateProvenance(
    draft: PetraDraftArtifact,
    spans: ReadonlyMap<string, PetraDraftSpan>,
    provenanceMap: PetraProvenanceMap,
    evidence: DeepReadonly<PetraEvidencePacket>,
  ): void {
    if (provenanceMap.content_hash !== canonicalHash(provenanceMap.content)) {
      throw new CompositionError(
        "PROVENANCE_CONTENT_HASH_MISMATCH",
        "The ProvenanceMap hash does not identify its exact mappings.",
      );
    }
    if (
      provenanceMap.project_id !== draft.project_id ||
      canonicalize(provenanceMap.draft_ref) !==
        canonicalize(exactDraftRef(draft)) ||
      canonicalize(provenanceMap.evidence_packet_ref) !==
        canonicalize(exactEvidenceRef(evidence)) ||
      draft.provenance_map_ref.provenance_map_id !==
        provenanceMap.provenance_map_id ||
      provenanceMap.compiled_at < draft.created_at
    ) {
      throw new CompositionError(
        provenanceMap.compiled_at < draft.created_at
          ? "COMPOSITION_TIMESTAMP_INVALID"
          : "PROVENANCE_REFERENCE_MISMATCH",
        "The ProvenanceMap must bind the exact draft, EvidencePacket, Project, and declared map identity after draft creation.",
      );
    }
    const mappings = provenanceMap.content.mappings;
    const mappedIds = mappings.map((mapping) => mapping.draft_span_id);
    if (
      new Set(mappedIds).size !== mappedIds.length ||
      !sameSet(mappedIds, [...spans.keys()])
    ) {
      throw new CompositionError(
        "PROVENANCE_MAPPING_INVALID",
        "Every DraftSpan must have exactly one visible ProvenanceMap entry.",
      );
    }
    const evidenceByOrder = new Map(
      evidence.content.selected_evidence.map((selection) => [
        selection.context_selection_order,
        selection,
      ]),
    );
    for (const mapping of mappings) {
      const span = spans.get(mapping.draft_span_id);
      if (span === undefined) {
        throw new CompositionError(
          "PROVENANCE_MAPPING_INVALID",
          "A ProvenanceMap entry names an unknown DraftSpan.",
        );
      }
      for (const basis of mapping.bases) {
        if (basis.basis_kind === "evidence") {
          const selected = evidenceByOrder.get(basis.evidence_selection_order);
          if (
            selected === undefined ||
            canonicalize(selected.object_ref) !== canonicalize(basis.object_ref)
          ) {
            throw new CompositionError(
              "PROVENANCE_BASIS_MISMATCH",
              "Evidence provenance must reproduce one exact EvidencePacket selection.",
            );
          }
        }
        if (
          basis.basis_kind === "petra_inference" &&
          basis.evidence_selection_orders.some(
            (order) => !evidenceByOrder.has(order),
          )
        ) {
          throw new CompositionError(
            "PROVENANCE_BASIS_MISMATCH",
            "Petra inference may depend only on named EvidencePacket selections.",
          );
        }
      }
      const basisKinds = new Set(
        mapping.bases.map((basis) => basis.basis_kind),
      );
      const relationSet = new Set(mapping.bases.map((basis) => basis.relation));
      const explicitlyUnsupported = basisKinds.has("unsupported");
      const originValid =
        explicitlyUnsupported ||
        (span.content.semantic_origin === "source_report" &&
          basisKinds.has("evidence")) ||
        (span.content.semantic_origin === "petra_inference" &&
          basisKinds.has("petra_inference")) ||
        (span.content.semantic_origin === "researcher_statement" &&
          basisKinds.has("researcher")) ||
        (span.content.semantic_origin === "structural_language" &&
          basisKinds.has("structural"));
      const forceValid =
        explicitlyUnsupported ||
        ((span.content.scientific_force !== "direct_report" ||
          relationSet.has("direct_report")) &&
          (span.content.scientific_force !== "qualification" ||
            relationSet.has("qualification")));
      if (!originValid || !forceValid) {
        throw new CompositionError(
          "PROVENANCE_BASIS_MISMATCH",
          "DraftSpan origin and scientific force must agree with its provenance basis and relation.",
        );
      }
      if (
        span.content.materiality === "material" &&
        basisKinds.size === 1 &&
        basisKinds.has("structural")
      ) {
        throw new CompositionError(
          "PROVENANCE_BASIS_MISMATCH",
          "Material scientific language cannot be grounded only as structural prose.",
        );
      }
    }
    const anyStale = mappings.some(
      (mapping) => mapping.mapping_state === "stale",
    );
    if ((provenanceMap.content.state === "stale") !== anyStale) {
      throw new CompositionError(
        "PROVENANCE_STATE_MISMATCH",
        "ProvenanceMap state must be stale exactly when at least one span mapping is stale.",
      );
    }
  }

  #validateCitationBundle(
    draft: PetraDraftArtifact,
    spans: ReadonlyMap<string, PetraDraftSpan>,
    provenanceMap: PetraProvenanceMap,
    bundle: PetraCitationBundle,
    evidence: DeepReadonly<PetraEvidencePacket>,
    scholarly: ScholarlyCitationRecords,
  ): void {
    if (bundle.content_hash !== canonicalHash(bundle.content)) {
      throw new CompositionError(
        "CITATION_CONTENT_HASH_MISMATCH",
        "The CitationBundle hash does not identify its exact citation manifest.",
      );
    }
    if (
      bundle.project_id !== draft.project_id ||
      canonicalize(bundle.draft_ref) !== canonicalize(exactDraftRef(draft)) ||
      canonicalize(bundle.evidence_packet_ref) !==
        canonicalize(exactEvidenceRef(evidence)) ||
      draft.citation_bundle_ref.citation_bundle_id !==
        bundle.citation_bundle_id ||
      bundle.compiled_at < draft.created_at
    ) {
      throw new CompositionError(
        bundle.compiled_at < draft.created_at
          ? "COMPOSITION_TIMESTAMP_INVALID"
          : "CITATION_REFERENCE_MISMATCH",
        "The CitationBundle must bind the exact draft, EvidencePacket, Project, and declared bundle identity after draft creation.",
      );
    }
    const citationIds = bundle.content.citations.map(
      (citation) => citation.citation_id,
    );
    const bibliographyKeys = bundle.content.citations.map(
      (citation) => citation.bibliography_key,
    );
    if (
      new Set(citationIds).size !== citationIds.length ||
      new Set(bibliographyKeys).size !== bibliographyKeys.length
    ) {
      throw new CompositionError(
        "CITATION_ID_DUPLICATE",
        "Citation IDs and bibliography keys must be unique within a bundle.",
      );
    }

    const works = new Map(
      scholarly.works.map((value) => [value.work_id, value]),
    );
    const versions = new Map(
      scholarly.workVersions.map((value) => [value.work_version_id, value]),
    );
    const authors = new Map(
      scholarly.authors.map((value) => [value.author_id, value]),
    );
    const identifiers = new Map(
      scholarly.externalIdentifiers.map((value) => [
        value.external_identifier_id,
        value,
      ]),
    );
    const context = this.#packetRegistry.getContextPacket(
      evidence.content.context_packet_ref.context_packet_id,
    );
    if (context === undefined) {
      throw new CompositionError(
        "CITATION_EVIDENCE_MISMATCH",
        "The CitationBundle's ContextPacket is unavailable.",
      );
    }
    const contextByOrder = new Map(
      context.content.included_objects.map((value) => [
        value.selection_order,
        value,
      ]),
    );
    const evidenceByOrder = new Map(
      evidence.content.selected_evidence.map((value) => [
        value.context_selection_order,
        value,
      ]),
    );
    const mappings = new Map(
      provenanceMap.content.mappings.map((value) => [
        value.draft_span_id,
        value,
      ]),
    );
    const citedSpanIds = new Set<string>();
    for (const citation of bundle.content.citations) {
      this.#validateCitationScholarly(
        citation,
        works,
        versions,
        authors,
        identifiers,
      );
      for (const spanId of citation.linked_draft_span_ids) {
        if (!spans.has(spanId)) {
          throw new CompositionError(
            "CITATION_SPAN_MISMATCH",
            `Citation ${citation.citation_id} names an unknown DraftSpan.`,
          );
        }
        citedSpanIds.add(spanId);
      }
      this.#validateCitationEvidence(
        citation,
        mappings,
        evidenceByOrder,
        contextByOrder,
        evidence.content.context_packet_ref.context_packet_id,
      );
    }
    for (const span of spans.values()) {
      if (
        span.content.materiality === "material" &&
        span.content.semantic_origin === "source_report" &&
        !citedSpanIds.has(span.draft_span_id)
      ) {
        throw new CompositionError(
          "CITATION_SPAN_MISMATCH",
          "Every material source-report span must be linked to a canonical citation.",
        );
      }
    }
  }

  #validateCitationScholarly(
    citation: CitationEntry,
    works: ReadonlyMap<string, PetraWork>,
    versions: ReadonlyMap<string, PetraWorkVersion>,
    authors: ReadonlyMap<string, PetraAuthor>,
    identifiers: ReadonlyMap<string, PetraExternalIdentifier>,
  ): void {
    const work = works.get(citation.work_ref.work_id);
    if (
      work === undefined ||
      work.revision !== citation.work_ref.revision ||
      canonicalHash(work) !== citation.work_ref.content_hash
    ) {
      throw new CompositionError(
        "CITATION_WORK_MISMATCH",
        "A citation must bind one exact canonical Work revision and hash.",
      );
    }
    const version = versions.get(citation.work_version_ref.work_version_id);
    if (
      version === undefined ||
      version.work_id !== work.work_id ||
      version.revision !== citation.work_version_ref.revision ||
      canonicalHash(version) !== citation.work_version_ref.content_hash
    ) {
      throw new CompositionError(
        "CITATION_VERSION_MISMATCH",
        "A citation must bind one exact WorkVersion belonging to its Work.",
      );
    }
    if (citation.author_refs.length !== work.author_credits.length) {
      throw new CompositionError(
        "CITATION_AUTHOR_MISMATCH",
        "Citation authors must exhaustively reproduce the canonical Work credits.",
      );
    }
    for (const authorRef of citation.author_refs) {
      const credit = work.author_credits.find(
        (value) => value.position === authorRef.position,
      );
      const author = authors.get(authorRef.author_id);
      if (
        credit?.author_id !== authorRef.author_id ||
        author === undefined ||
        author.revision !== authorRef.revision ||
        author.display_name !== authorRef.display_name ||
        canonicalHash(author) !== authorRef.content_hash
      ) {
        throw new CompositionError(
          "CITATION_AUTHOR_MISMATCH",
          "Citation author order, identity, display name, revision, and hash must reproduce canonical records.",
        );
      }
    }
    for (const identifierRef of citation.external_identifier_refs) {
      const identifier = identifiers.get(identifierRef.external_identifier_id);
      const subjectMatches =
        identifier?.subject.subject_kind === "work"
          ? identifier.subject.work_id === work.work_id
          : identifier?.subject.subject_kind === "work_version"
            ? identifier.subject.work_version_id === version.work_version_id
            : false;
      if (
        identifier === undefined ||
        !subjectMatches ||
        identifier.revision !== identifierRef.revision ||
        identifier.namespace !== identifierRef.namespace ||
        identifier.normalized_value !== identifierRef.normalized_value ||
        identifier.verification_status !== identifierRef.verification_status ||
        canonicalHash(identifier) !== identifierRef.content_hash
      ) {
        throw new CompositionError(
          "CITATION_IDENTIFIER_MISMATCH",
          "Citation external identifiers must exactly reproduce canonical Work or WorkVersion identifiers.",
        );
      }
    }
    const expectedMetadata = {
      title: work.title,
      work_kind: work.work_kind,
      version_label: version.version_label,
      publication_status: version.publication_status,
      published_date: version.published_date ?? null,
    };
    if (
      citation.identity_status !== work.identity_status ||
      canonicalize(citation.metadata) !== canonicalize(expectedMetadata)
    ) {
      throw new CompositionError(
        "CITATION_METADATA_MISMATCH",
        "Citation metadata and identity status must reproduce canonical Work and WorkVersion records without invention.",
      );
    }
    const warningCodes = new Set(
      citation.identity_warnings.map((warning) => warning.code),
    );
    if (
      (work.identity_status === "provisional" &&
        (!warningCodes.has("PROVISIONAL_WORK_IDENTITY") ||
          citation.metadata_completeness === "complete")) ||
      (work.identity_status === "disputed" &&
        (!warningCodes.has("DISPUTED_WORK_IDENTITY") ||
          citation.metadata_completeness !== "conflicted"))
    ) {
      throw new CompositionError(
        "CITATION_IDENTITY_WARNING_MISSING",
        "Provisional or disputed identity must remain visibly incomplete or conflicted in the citation.",
      );
    }
  }

  #validateCitationEvidence(
    citation: CitationEntry,
    mappings: ReadonlyMap<string, ProvenanceSpanMapping>,
    evidenceByOrder: ReadonlyMap<
      number,
      DeepReadonly<PetraEvidencePacket>["content"]["selected_evidence"][number]
    >,
    contextByOrder: ReadonlyMap<number, DeepReadonly<ContextInclusion>>,
    contextPacketId: string,
  ): void {
    const evidenceOrders = new Set<number>();
    for (const spanId of citation.linked_draft_span_ids) {
      const mapping = mappings.get(spanId);
      for (const basis of mapping?.bases ?? []) {
        if (basis.basis_kind === "evidence") {
          evidenceOrders.add(basis.evidence_selection_order);
        } else if (basis.basis_kind === "petra_inference") {
          for (const order of basis.evidence_selection_orders) {
            evidenceOrders.add(order);
          }
        }
      }
    }
    const citedVersionId = citation.work_version_ref.work_version_id;
    const sourceSpanIds = new Set<string>();
    let maxDepth = -1;
    let versionGrounded = false;
    for (const order of evidenceOrders) {
      const selected = evidenceByOrder.get(order);
      const inclusion = contextByOrder.get(order);
      if (selected === undefined || inclusion === undefined) continue;
      maxDepth = Math.max(maxDepth, sourceAccessRank(inclusion.source_access));
      for (const spanId of inclusion.source_span_refs)
        sourceSpanIds.add(spanId);
      const record = this.#packetRegistry.getContextRecord(
        contextPacketId,
        selected.object_ref.object_id,
        selected.object_ref.object_revision,
      );
      if (recordWorkVersionIds(record).includes(citedVersionId)) {
        versionGrounded = true;
      }
    }
    if (!versionGrounded) {
      throw new CompositionError(
        "CITATION_EVIDENCE_MISMATCH",
        "A citation must resolve from the linked DraftSpans through their EvidencePacket bases to the cited WorkVersion.",
      );
    }
    if (
      sourceAccessRank(citation.source_access.processing_depth) > maxDepth ||
      citation.source_access.source_span_ids.some(
        (sourceSpanId) => !sourceSpanIds.has(sourceSpanId),
      ) ||
      (citation.locator.locator_kind === "source_span" &&
        !citation.source_access.source_span_ids.includes(
          citation.locator.source_span_id,
        ))
    ) {
      throw new CompositionError(
        "CITATION_SOURCE_ACCESS_MISMATCH",
        "Citation source depth and locators cannot exceed the linked EvidencePacket records.",
      );
    }
  }

  #validateDraftOutcome(
    draft: PetraDraftArtifact,
    provenanceMap: PetraProvenanceMap,
  ): void {
    const mappings = provenanceMap.content.mappings;
    const unsupported = mappings
      .filter((mapping) =>
        mapping.bases.some((basis) => basis.basis_kind === "unsupported"),
      )
      .map((mapping) => mapping.draft_span_id);
    const stale = provenanceMap.content.state === "stale";
    if (
      (stale && draft.validation.state !== "stale") ||
      (draft.validation.state === "passed" &&
        (stale ||
          unsupported.length > 0 ||
          draft.validation.unresolved_support_span_ids.length > 0 ||
          draft.validation.validator_results.length === 0 ||
          draft.validation.validator_results.some(
            (result) => result.outcome === "fail",
          ))) ||
      !sameSet(unsupported, draft.validation.unresolved_support_span_ids)
    ) {
      throw new CompositionError(
        "DRAFT_VALIDATION_MISMATCH",
        "Draft validation must expose stale provenance, unsupported material spans, and validator failures.",
      );
    }
  }
}
