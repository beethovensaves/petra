import { createHash } from "node:crypto";

import type {
  ContextDependency,
  ContextInclusion,
  ContextObjectRef,
  ContextOmission,
  ContextRecipeRef,
  ContextSelectionTrace,
  EvidenceContextExclusion,
  EvidencePacketFreshness,
  EvidenceSelection,
  EvidenceTemporalPerspective,
  PetraContextPacket,
  PetraEvidencePacket,
  SnapshotRef,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type {
  DeepReadonly,
  InMemoryContextPacketRegistry,
  PacketRecord,
} from "./context-packet-registry.js";
import { derivePetraId } from "./identity.js";

export type ContextEvidenceRole = ContextInclusion["evidence_roles"][number];
export type ContextSourceAccess = ContextInclusion["source_access"];
export type EvidenceBearing = EvidenceSelection["bearing"];

export type PacketCompilationErrorCode =
  | "CONTEXT_COMPILATION_INPUT_INVALID"
  | "CONTEXT_COMPILATION_CANDIDATE_DUPLICATE"
  | "CONTEXT_COMPILATION_TARGET_MISSING"
  | "CONTEXT_COMPILATION_PROVENANCE_MISSING"
  | "CONTEXT_COMPILATION_REQUIRED_OBJECT_EXCEEDS_BUDGET"
  | "EVIDENCE_COMPILATION_CONTEXT_MISSING"
  | "EVIDENCE_COMPILATION_DECISION_DUPLICATE"
  | "EVIDENCE_COMPILATION_DECISION_MISSING"
  | "EVIDENCE_COMPILATION_DECISION_UNKNOWN"
  | "EVIDENCE_COMPILATION_EMPTY"
  | "EVIDENCE_COMPILATION_SOURCE_SPAN_EXCLUDED"
  | "EVIDENCE_COMPILATION_COVERAGE_INVALID";

export class PacketCompilationError extends Error {
  readonly code: PacketCompilationErrorCode;

  constructor(code: PacketCompilationErrorCode, message: string) {
    super(message);
    this.name = "PacketCompilationError";
    this.code = code;
  }
}

export interface ContextCompilationCandidate {
  record: PacketRecord;
  evidenceRoles: readonly [ContextEvidenceRole, ...ContextEvidenceRole[]];
  sourceAccess: ContextSourceAccess;
  selection: ContextSelectionTrace;
  material: boolean;
}

export interface CompileContextPacketInput {
  projectId: string;
  snapshotRef: SnapshotRef;
  recipeRef: ContextRecipeRef;
  objective: {
    kind: PetraContextPacket["content"]["objective"]["objective_kind"];
    statement: string;
    targetObjectIds: readonly string[];
  };
  candidates: readonly [
    ContextCompilationCandidate,
    ...ContextCompilationCandidate[],
  ];
  omissions: readonly ContextOmission[];
  coverageStatement: string;
  contraryEvidenceChecked: boolean;
  budget: {
    maxInputTokens: number;
    maxObjects: number;
    maxSourceSpans: number;
  };
  dependencies: readonly [ContextDependency, ...ContextDependency[]];
  compiledBy: PetraContextPacket["compiled_by"];
  compiledAt: string;
}

export type EvidenceCompilationDecision =
  | {
      decision: "select";
      objectId: string;
      bearing: EvidenceBearing;
      inclusionReason: string;
      useLimitations: readonly string[];
    }
  | {
      decision: "exclude";
      objectId: string;
      reason: EvidenceContextExclusion["reason"];
      detail: string;
    };

export interface CompileEvidencePacketInput {
  contextPacketId: string;
  compositionObjective: string;
  temporalPerspective: EvidenceTemporalPerspective;
  decisions: readonly EvidenceCompilationDecision[];
  coverageStatement: string;
  contraryEvidenceChecked: boolean;
  qualifyingEvidenceChecked: boolean;
  excludedCoverageState?: "bounded" | "partial";
  freshness: EvidencePacketFreshness;
  compiledBy: PetraEvidencePacket["compiled_by"];
  compiledAt: string;
}

interface CandidateView {
  candidate: ContextCompilationCandidate;
  key: string;
  id: string;
  ref: ContextObjectRef;
  sourceSpanIds: readonly string[];
  estimatedTokens: number;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

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

const sourceSpanIds = (record: PacketRecord): readonly string[] => {
  if (record.schema_name === "petra.claim") {
    return record.basis.basis_kind === "source"
      ? [...record.basis.source_span_ids]
      : [];
  }
  if (record.schema_name === "petra.assertion") {
    return record.provenance_refs
      .filter((ref) => ref.provenance_kind === "source_span")
      .map((ref) => ref.source_span_id);
  }
  return [];
};

export const estimatePacketRecordTokens = (record: PacketRecord): number =>
  Math.max(1, Math.ceil(Buffer.byteLength(canonicalize(record), "utf8") / 4));

const candidateView = (
  candidate: ContextCompilationCandidate,
): CandidateView => {
  const identity = recordIdentity(candidate.record);
  return {
    candidate: structuredClone(candidate),
    key: `${identity.kind}:${identity.id}`,
    id: identity.id,
    ref: {
      object_kind: identity.kind,
      object_id: identity.id,
      object_revision: identity.revision,
      object_hash: canonicalHash(candidate.record),
    },
    sourceSpanIds: sourceSpanIds(candidate.record),
    estimatedTokens: estimatePacketRecordTokens(candidate.record),
  };
};

const validatePositiveLimit = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new PacketCompilationError(
      "CONTEXT_COMPILATION_INPUT_INVALID",
      `${name} must be a positive safe integer.`,
    );
  }
};

const validateNonNegativeLimit = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PacketCompilationError(
      "CONTEXT_COMPILATION_INPUT_INVALID",
      `${name} must be a non-negative safe integer.`,
    );
  }
};

const inclusionAuthority = (
  record: PacketRecord,
): ContextInclusion["authority"] => {
  if (
    record.schema_name === "petra.claim" ||
    record.schema_name === "petra.assertion"
  ) {
    return structuredClone(record.authority);
  }
  return { zone: "source_record", review_state: "not_applicable" };
};

const selectionTrace = (
  selection: ContextSelectionTrace,
): ContextSelectionTrace =>
  selection.score === undefined
    ? {
        route: selection.route,
        rank: selection.rank,
        reason: selection.reason,
      }
    : structuredClone(selection);

const evidenceStatus = (
  selected: boolean,
  available: boolean,
  checked: boolean,
): "included" | "checked_none_in_context" | "not_checked" => {
  if (selected) return "included";
  if (!available && checked) return "checked_none_in_context";
  return "not_checked";
};

/**
 * Compiles and registers immutable packet records. Retrieval may nominate
 * candidates, but only exact authority records supplied here enter a packet.
 */
export class ContextPacketCompiler {
  readonly #registry: InMemoryContextPacketRegistry;

  constructor(registry: InMemoryContextPacketRegistry) {
    this.#registry = registry;
  }

  compileContextPacket(
    input: CompileContextPacketInput,
  ): DeepReadonly<PetraContextPacket> {
    validatePositiveLimit(input.budget.maxInputTokens, "maxInputTokens");
    validatePositiveLimit(input.budget.maxObjects, "maxObjects");
    validateNonNegativeLimit(input.budget.maxSourceSpans, "maxSourceSpans");
    if (
      input.projectId.trim().length === 0 ||
      input.objective.statement.trim().length === 0 ||
      input.coverageStatement.trim().length === 0
    ) {
      throw new PacketCompilationError(
        "CONTEXT_COMPILATION_INPUT_INVALID",
        "Project, objective, and coverage statements must not be empty.",
      );
    }

    const candidates = input.candidates.map(candidateView);
    if (
      new Set(input.objective.targetObjectIds).size !==
      input.objective.targetObjectIds.length
    ) {
      throw new PacketCompilationError(
        "CONTEXT_COMPILATION_INPUT_INVALID",
        "Objective target identities must be unique.",
      );
    }
    const needsSourceAccessPolicy = candidates.some(
      ({ candidate }) => candidate.sourceAccess !== "not_applicable",
    );
    if (
      needsSourceAccessPolicy &&
      !input.dependencies.some(
        (dependency) =>
          dependency.dependency_kind === "policy" &&
          dependency.name.startsWith("rights-decision:"),
      )
    ) {
      throw new PacketCompilationError(
        "CONTEXT_COMPILATION_INPUT_INVALID",
        "Source-backed context requires a content-hashed rights-decision policy dependency.",
      );
    }
    const byKey = new Map<string, CandidateView>();
    const byId = new Map<string, CandidateView>();
    for (const candidate of candidates) {
      if (byKey.has(candidate.key) || byId.has(candidate.id)) {
        throw new PacketCompilationError(
          "CONTEXT_COMPILATION_CANDIDATE_DUPLICATE",
          `Context candidate identity occurs more than once: ${candidate.id}.`,
        );
      }
      byKey.set(candidate.key, candidate);
      byId.set(candidate.id, candidate);
    }

    const targetCandidates = input.objective.targetObjectIds.map((objectId) => {
      const target = byId.get(objectId);
      if (target === undefined) {
        throw new PacketCompilationError(
          "CONTEXT_COMPILATION_TARGET_MISSING",
          `Objective target is not an exact candidate: ${objectId}.`,
        );
      }
      return target;
    });
    const targetIds = new Set(targetCandidates.map(({ id }) => id));
    const queue = [
      ...targetCandidates,
      ...candidates.filter(({ id }) => !targetIds.has(id)),
    ];
    const included = new Map<string, CandidateView>();
    const budgetOmissions: ContextOmission[] = [];
    let estimatedInputTokens = 0;
    let includedSourceSpans = 0;

    for (const root of queue) {
      if (included.has(root.key)) continue;
      const required = [root];
      for (const spanId of root.sourceSpanIds) {
        const span = byId.get(spanId);
        if (span?.ref.object_kind !== "source_span") {
          throw new PacketCompilationError(
            "CONTEXT_COMPILATION_PROVENANCE_MISSING",
            `Candidate ${root.id} requires missing SourceSpan ${spanId}.`,
          );
        }
        required.push(span);
      }
      const additions = required.filter(({ key }) => !included.has(key));
      const additionalTokens = additions.reduce(
        (total, candidate) => total + candidate.estimatedTokens,
        0,
      );
      const additionalSpans = additions.filter(
        ({ ref }) => ref.object_kind === "source_span",
      ).length;
      const fits =
        included.size + additions.length <= input.budget.maxObjects &&
        includedSourceSpans + additionalSpans <= input.budget.maxSourceSpans &&
        estimatedInputTokens + additionalTokens <= input.budget.maxInputTokens;
      if (!fits) {
        if (targetIds.has(root.id)) {
          throw new PacketCompilationError(
            "CONTEXT_COMPILATION_REQUIRED_OBJECT_EXCEEDS_BUDGET",
            `Objective target ${root.id} and its provenance closure exceed the packet budget.`,
          );
        }
        budgetOmissions.push({
          omission_kind: "known_object",
          object_ref: structuredClone(root.ref),
          reason: "budget",
          material: root.candidate.material,
          detail:
            "The candidate and its required SourceSpan closure did not fit the declared packet budget.",
        });
        continue;
      }
      for (const addition of additions) {
        included.set(addition.key, addition);
        estimatedInputTokens += addition.estimatedTokens;
        if (addition.ref.object_kind === "source_span") {
          includedSourceSpans += 1;
        }
      }
    }

    if (included.size === 0) {
      throw new PacketCompilationError(
        "CONTEXT_COMPILATION_REQUIRED_OBJECT_EXCEEDS_BUDGET",
        "The declared packet budget did not admit any exact record.",
      );
    }
    const includedObjects = [...included.values()].map(
      (candidate, index): ContextInclusion => ({
        selection_order: index + 1,
        object_ref: structuredClone(candidate.ref),
        evidence_roles: [...candidate.candidate.evidenceRoles],
        authority: inclusionAuthority(candidate.candidate.record),
        source_access: candidate.candidate.sourceAccess,
        source_span_refs: [...candidate.sourceSpanIds],
        selection: selectionTrace(candidate.candidate.selection),
        estimated_tokens: candidate.estimatedTokens,
      }),
    );
    const omissions = [...structuredClone(input.omissions), ...budgetOmissions];
    const content: PetraContextPacket["content"] = {
      objective: {
        objective_kind: input.objective.kind,
        statement: input.objective.statement,
        target_refs: targetCandidates.map(({ ref }) => structuredClone(ref)),
      },
      included_objects: includedObjects as [
        ContextInclusion,
        ...ContextInclusion[],
      ],
      omissions,
      coverage: {
        state: omissions.some(({ material }) => material)
          ? "bounded"
          : "complete_for_recipe",
        statement: input.coverageStatement,
        contrary_evidence_checked: input.contraryEvidenceChecked,
      },
      budget: {
        max_input_tokens: input.budget.maxInputTokens,
        max_objects: input.budget.maxObjects,
        max_source_spans: input.budget.maxSourceSpans,
        estimated_input_tokens: estimatedInputTokens,
        included_object_count: included.size,
        included_source_span_count: includedSourceSpans,
        truncated: budgetOmissions.length > 0,
      },
      dependencies: structuredClone(input.dependencies) as [
        ContextDependency,
        ...ContextDependency[],
      ],
    };
    const contentHash = canonicalHash(content);
    const packetWithoutId = {
      schema_name: "petra.context-packet" as const,
      schema_version: "1.0.0" as const,
      revision: 1 as const,
      project_id: input.projectId,
      snapshot_ref: structuredClone(input.snapshotRef),
      recipe_ref: structuredClone(input.recipeRef),
      content,
      content_hash: contentHash,
      compiled_by: structuredClone(input.compiledBy),
      compiled_at: input.compiledAt,
    };
    const packet: PetraContextPacket = {
      ...packetWithoutId,
      context_packet_id: derivePetraId(
        "context_packet",
        canonicalize(packetWithoutId),
      ),
    };
    return this.#registry.registerContextPacket(
      packet,
      [...included.values()].map(({ candidate }) => candidate.record),
    );
  }

  compileEvidencePacket(
    input: CompileEvidencePacketInput,
  ): DeepReadonly<PetraEvidencePacket> {
    const context = this.#registry.getContextPacket(input.contextPacketId);
    if (context === undefined) {
      throw new PacketCompilationError(
        "EVIDENCE_COMPILATION_CONTEXT_MISSING",
        `ContextPacket is not registered: ${input.contextPacketId}.`,
      );
    }
    if (
      input.compositionObjective.trim().length === 0 ||
      input.coverageStatement.trim().length === 0
    ) {
      throw new PacketCompilationError(
        "CONTEXT_COMPILATION_INPUT_INVALID",
        "Composition objective and coverage statement must not be empty.",
      );
    }
    if (
      input.contraryEvidenceChecked &&
      !context.content.coverage.contrary_evidence_checked
    ) {
      throw new PacketCompilationError(
        "EVIDENCE_COMPILATION_COVERAGE_INVALID",
        "Evidence compilation cannot claim a contrary-evidence check absent from the ContextPacket.",
      );
    }

    const inclusionsById = new Map(
      context.content.included_objects.map((inclusion) => [
        inclusion.object_ref.object_id,
        inclusion,
      ]),
    );
    const decisionsById = new Map<string, EvidenceCompilationDecision>();
    for (const decision of input.decisions) {
      if (decisionsById.has(decision.objectId)) {
        throw new PacketCompilationError(
          "EVIDENCE_COMPILATION_DECISION_DUPLICATE",
          `Evidence decision occurs more than once: ${decision.objectId}.`,
        );
      }
      if (!inclusionsById.has(decision.objectId)) {
        throw new PacketCompilationError(
          "EVIDENCE_COMPILATION_DECISION_UNKNOWN",
          `Evidence decision names an object outside the ContextPacket: ${decision.objectId}.`,
        );
      }
      decisionsById.set(decision.objectId, decision);
    }
    if (decisionsById.size !== inclusionsById.size) {
      throw new PacketCompilationError(
        "EVIDENCE_COMPILATION_DECISION_MISSING",
        "Every ContextPacket inclusion requires one explicit evidence decision.",
      );
    }

    const selectedOrders = new Map<string, number>();
    for (const inclusion of context.content.included_objects) {
      if (
        decisionsById.get(inclusion.object_ref.object_id)?.decision === "select"
      ) {
        selectedOrders.set(
          inclusion.object_ref.object_id,
          inclusion.selection_order,
        );
      }
    }
    const selectedEvidence: EvidenceSelection[] = [];
    const exclusions: EvidenceContextExclusion[] = [];
    for (const inclusion of context.content.included_objects) {
      const decision = decisionsById.get(inclusion.object_ref.object_id);
      if (decision === undefined) {
        throw new PacketCompilationError(
          "EVIDENCE_COMPILATION_DECISION_MISSING",
          `Missing evidence decision for ${inclusion.object_ref.object_id}.`,
        );
      }
      if (decision.decision === "exclude") {
        exclusions.push({
          context_selection_order: inclusion.selection_order,
          reason: decision.reason,
          detail: decision.detail,
        });
        continue;
      }
      const requiredSpanIds =
        inclusion.object_ref.object_kind === "source_span"
          ? [inclusion.object_ref.object_id]
          : inclusion.source_span_refs;
      const requiredSpanOrders = requiredSpanIds.map((spanId) => {
        const order = selectedOrders.get(spanId);
        if (order === undefined) {
          throw new PacketCompilationError(
            "EVIDENCE_COMPILATION_SOURCE_SPAN_EXCLUDED",
            `Selected evidence ${inclusion.object_ref.object_id} requires selected SourceSpan ${spanId}.`,
          );
        }
        return order;
      });
      selectedEvidence.push({
        context_selection_order: inclusion.selection_order,
        object_ref: structuredClone(inclusion.object_ref),
        bearing: decision.bearing,
        source_span_selection_orders: requiredSpanOrders,
        inclusion_reason: decision.inclusionReason,
        use_limitations: [...decision.useLimitations],
      });
    }
    if (selectedEvidence.length === 0) {
      throw new PacketCompilationError(
        "EVIDENCE_COMPILATION_EMPTY",
        "An EvidencePacket must select at least one exact context record.",
      );
    }

    const roles = new Set(
      context.content.included_objects.flatMap(
        (inclusion) => inclusion.evidence_roles,
      ),
    );
    const bearings = new Set(
      selectedEvidence.map((selection) => selection.bearing),
    );
    const content: PetraEvidencePacket["content"] = {
      context_packet_ref: {
        context_packet_id: context.context_packet_id,
        content_hash: context.content_hash,
      },
      composition_objective: input.compositionObjective,
      temporal_perspective: structuredClone(input.temporalPerspective),
      selected_evidence: selectedEvidence as [
        EvidenceSelection,
        ...EvidenceSelection[],
      ],
      exclusions,
      coverage: {
        state:
          exclusions.length === 0
            ? "complete_for_context"
            : (input.excludedCoverageState ?? "bounded"),
        statement: input.coverageStatement,
        contrary_evidence_status: evidenceStatus(
          bearings.has("contrary"),
          roles.has("contrary"),
          input.contraryEvidenceChecked,
        ),
        qualifying_evidence_status: evidenceStatus(
          bearings.has("qualifying"),
          roles.has("qualifying"),
          input.qualifyingEvidenceChecked,
        ),
      },
      freshness: structuredClone(input.freshness),
    };
    const contentHash = canonicalHash(content);
    const packetWithoutId = {
      schema_name: "petra.evidence-packet" as const,
      schema_version: "1.0.0" as const,
      revision: 1 as const,
      project_id: context.project_id,
      snapshot_ref: structuredClone(context.snapshot_ref),
      content,
      content_hash: contentHash,
      compiled_by: structuredClone(input.compiledBy),
      compiled_at: input.compiledAt,
    };
    const packet: PetraEvidencePacket = {
      ...packetWithoutId,
      evidence_packet_id: derivePetraId(
        "evidence_packet",
        canonicalize(packetWithoutId),
      ),
    };
    return this.#registry.registerEvidencePacket(packet);
  }
}
