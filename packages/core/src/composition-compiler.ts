import { createHash } from "node:crypto";

import type {
  ActorRef,
  CitationEntry,
  ContextInclusion,
  DraftModelProduction,
  PetraCitationBundle,
  PetraCompositionPlan,
  PetraCompositionRequest,
  PetraDraftArtifact,
  PetraDraftSpan,
  PetraEvidencePacket,
  PetraExternalIdentifier,
  PetraGroundedResponse,
  PetraProvenanceMap,
  PetraWork,
  PetraWorkVersion,
  ProvenanceBasis,
  ProvenanceSpanMapping,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import {
  InMemoryCompositionRegistry,
  type RegisterCompositionInput,
  type ScholarlyCitationRecords,
} from "./composition-registry.js";
import type {
  DeepReadonly,
  InMemoryContextPacketRegistry,
  PacketRecord,
} from "./context-packet-registry.js";
import { derivePetraId } from "./identity.js";

export type CompositionCompilerErrorCode =
  | "COMPOSITION_COMPILER_ACTOR_INVALID"
  | "COMPOSITION_COMPILER_GROUNDED_RESPONSE_INVALID"
  | "COMPOSITION_COMPILER_PLAN_TEXT_INVALID"
  | "COMPOSITION_COMPILER_EVIDENCE_MISSING"
  | "COMPOSITION_COMPILER_SOURCE_DEPTH_INSUFFICIENT"
  | "COMPOSITION_COMPILER_ABSTRACT_ONLY_FORCE_INVALID"
  | "COMPOSITION_COMPILER_CITATION_UNRESOLVED";

export class CompositionCompilerError extends Error {
  readonly code: CompositionCompilerErrorCode;

  constructor(code: CompositionCompilerErrorCode, message: string) {
    super(message);
    this.name = "CompositionCompilerError";
    this.code = code;
  }
}

export interface CompileGroundedCompositionInput {
  request: PetraCompositionRequest;
  plan: PetraCompositionPlan;
  evidence: PetraEvidencePacket;
  groundedResponse: PetraGroundedResponse;
  modelActor: ActorRef;
  serviceActor: ActorRef;
  promptProfile: {
    name: string;
    version: string;
  };
  promptHash: string;
  scholarlyRecords: ScholarlyCitationRecords;
}

export interface CompiledGroundedComposition extends RegisterCompositionInput {
  request: PetraCompositionRequest;
  plan: PetraCompositionPlan;
}

interface SpanPlan {
  move: PetraCompositionPlan["content"]["sections"][number]["moves"][number];
  spanId: string;
  start: number;
  end: number;
}

interface CitationUse {
  readonly spanIds: Set<string>;
  readonly inclusions: Map<number, DeepReadonly<ContextInclusion>>;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const exactEvidenceRef = (evidence: PetraEvidencePacket) => ({
  evidence_packet_id: evidence.evidence_packet_id,
  revision: evidence.revision,
  content_hash: evidence.content_hash,
});

const sourceAccessRank = (value: ContextInclusion["source_access"]): number => {
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

const citationDepth = (
  inclusions: Iterable<DeepReadonly<ContextInclusion>>,
): CitationEntry["source_access"]["processing_depth"] => {
  const maxRank = Math.max(
    0,
    ...[...inclusions].map((inclusion) =>
      sourceAccessRank(inclusion.source_access),
    ),
  );
  if (maxRank >= 3) return "full_text_analyzed";
  if (maxRank === 2) return "full_text_structured";
  if (maxRank === 1) return "abstract_only";
  return "metadata_only";
};

const recordWorkVersionIds = (
  record: DeepReadonly<PacketRecord> | undefined,
): string[] => {
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

const unique = <Value>(values: Iterable<Value>): Value[] => [
  ...new Set(values),
];

const bibliographyToken = (value: string, fallback: string): string => {
  const tokens = value.match(/[A-Za-z0-9]+/g) ?? [];
  const token = tokens.at(-1) ?? fallback;
  return /^[A-Za-z]/.test(token) ? token : `Petra${token}`;
};

const publishedYear = (workVersion: PetraWorkVersion): string =>
  workVersion.published_date?.value.slice(0, 4) ?? "Undated";

export class GroundedCompositionCompiler {
  readonly #packets: InMemoryContextPacketRegistry;
  readonly #contracts: PetraContractRegistry;

  constructor(
    packets: InMemoryContextPacketRegistry,
    contracts = new PetraContractRegistry(),
  ) {
    this.#packets = packets;
    this.#contracts = contracts;
  }

  compile(input: CompileGroundedCompositionInput): CompiledGroundedComposition {
    this.#validateInputs(input);
    const controls = new InMemoryCompositionRegistry(this.#packets);
    controls.registerRequest(structuredClone(input.request));
    controls.registerPlan(structuredClone(input.plan));

    const moves = input.plan.content.sections.flatMap((section) =>
      section.moves.map((move) => ({ section, move })),
    );
    const draftArtifactId = derivePetraId(
      "draft_artifact",
      input.plan.composition_plan_id,
    );
    const provenanceMapId = derivePetraId(
      "provenance_map",
      input.plan.composition_plan_id,
    );
    const citationBundleId = derivePetraId(
      "citation_bundle",
      input.plan.composition_plan_id,
    );
    let offset = 0;
    const fragments: string[] = [];
    const spanPlans: SpanPlan[] = [];
    for (const { move } of moves) {
      if (
        move.planned_text.trim().length === 0 ||
        move.planned_text.trim() !== move.planned_text
      ) {
        throw new CompositionCompilerError(
          "COMPOSITION_COMPILER_PLAN_TEXT_INVALID",
          "Planned text must be non-blank and cannot hide leading or trailing whitespace in span offsets.",
        );
      }
      if (fragments.length > 0) offset += 1;
      const start = offset;
      const length = Array.from(move.planned_text).length;
      offset += length;
      fragments.push(move.planned_text);
      spanPlans.push({
        move,
        spanId: derivePetraId("draft_span", move.move_id),
        start,
        end: offset,
      });
    }
    const text = fragments.join(" ");
    const createdAt = input.groundedResponse.recorded_at;
    const draftContent: PetraDraftArtifact["content"] = {
      artifact_kind: input.request.content.requested_output.artifact_kind,
      semantic_format: input.request.content.requested_output.semantic_format,
      language: input.request.content.requested_output.language,
      text,
      draft_span_ids: spanPlans.map((span) => span.spanId) as [
        string,
        ...string[],
      ],
    };
    const draftContentHash = canonicalHash(draftContent);
    const draftRef = {
      draft_artifact_id: draftArtifactId,
      revision: 1,
      content_hash: draftContentHash,
    };
    const production: DraftModelProduction = {
      origin_kind: "model_generated",
      model_request_id:
        input.groundedResponse.content.execution_ref.model_request_id,
      model_call_id: input.groundedResponse.content.execution_ref.model_call_id,
      model_deployment:
        input.groundedResponse.content.execution_ref.model_deployment_id,
      prompt_profile: structuredClone(input.promptProfile),
      prompt_hash: input.promptHash,
    };
    const limitations = unique([
      `Coverage: ${input.plan.content.coverage.statement}`,
      ...input.plan.content.coverage.limitations,
      ...spanPlans.flatMap(({ move }) => move.limitations),
      ...input.evidence.content.selected_evidence.flatMap(
        (selection) => selection.use_limitations,
      ),
    ]);
    const draft: PetraDraftArtifact = {
      schema_name: "petra.draft-artifact",
      schema_version: "1.0.0",
      draft_artifact_id: draftArtifactId,
      revision: 1,
      project_id: input.request.project_id,
      snapshot_ref: structuredClone(input.request.snapshot_ref),
      composition_request_ref: {
        record_id: input.request.composition_request_id,
        revision: input.request.revision,
        content_hash: input.request.content_hash,
      },
      composition_plan_ref: {
        record_id: input.plan.composition_plan_id,
        revision: input.plan.revision,
        content_hash: input.plan.content_hash,
      },
      evidence_packet_ref: exactEvidenceRef(input.evidence),
      provenance_map_ref: {
        provenance_map_id: provenanceMapId,
        revision: 1,
      },
      citation_bundle_ref: {
        citation_bundle_id: citationBundleId,
        revision: 1,
      },
      lineage: { lineage_kind: "root" },
      production,
      controls: {
        output_profile: structuredClone(
          input.request.content.control_context.output_profile,
        ),
        language_contract: structuredClone(
          input.request.content.control_context.language_contract,
        ),
      },
      content: draftContent,
      content_hash: draftContentHash,
      validation: {
        state: "pending",
        validator_results: [
          {
            validator: "composition-plan-alignment",
            version: "1.0.0",
            outcome: "pass",
            code: "PLAN_MOVES_COMPILED_EXACTLY",
          },
          {
            validator: "material-span-provenance",
            version: "1.0.0",
            outcome: "pass",
            code: "ALL_MATERIAL_SPANS_MAPPED",
          },
          {
            validator: "felicity-language-contract",
            version:
              input.request.content.control_context.language_contract.version,
            outcome: "warning",
            code: "FELICITY_REVALIDATION_PENDING",
            message:
              "The language contract is pinned; its dedicated rewrite and force-preservation pass has not run yet.",
          },
        ],
        limitations,
        unresolved_support_span_ids: [],
      },
      created_by: structuredClone(input.modelActor),
      created_at: createdAt,
    };

    const spans = spanPlans.map(({ move, spanId, start, end }) => {
      const content: PetraDraftSpan["content"] = {
        offset_unit: "unicode_code_point",
        start,
        end,
        exact_text: move.planned_text,
        exact_text_hash: textHash(move.planned_text),
        materiality:
          move.semantic_origin === "structural_language"
            ? "nonmaterial"
            : "material",
        semantic_origin: move.semantic_origin,
        scientific_force: move.scientific_force,
      };
      return {
        schema_name: "petra.draft-span" as const,
        schema_version: "1.0.0" as const,
        draft_span_id: spanId,
        revision: 1 as const,
        project_id: input.request.project_id,
        draft_ref: structuredClone(draftRef),
        content,
        content_hash: canonicalHash(content),
        created_by: structuredClone(input.modelActor),
        created_at: createdAt,
      } satisfies PetraDraftSpan;
    });
    const mappings = spanPlans.map(({ move, spanId }) => ({
      draft_span_id: spanId,
      draft_span_revision: 1,
      mapping_state: "current",
      bases: this.#provenanceBases(move, input),
    })) as [ProvenanceSpanMapping, ...ProvenanceSpanMapping[]];
    const provenanceContent: PetraProvenanceMap["content"] = {
      state: "current",
      mappings,
    };
    const provenanceMap: PetraProvenanceMap = {
      schema_name: "petra.provenance-map",
      schema_version: "1.0.0",
      provenance_map_id: provenanceMapId,
      revision: 1,
      project_id: input.request.project_id,
      draft_ref: structuredClone(draftRef),
      evidence_packet_ref: exactEvidenceRef(input.evidence),
      content: provenanceContent,
      content_hash: canonicalHash(provenanceContent),
      compiled_by: structuredClone(input.serviceActor),
      compiled_at: createdAt,
    };

    const citations = this.#compileCitations(input, spanPlans);
    if (
      citations.some(
        (citation) =>
          citation.source_access.processing_depth === "abstract_only",
      )
    ) {
      draft.validation.limitations = unique([
        ...draft.validation.limitations,
        "Abstract-only evidence was used; the draft is limited to broad source-reported claims because methods and results were not available for detailed inspection.",
      ]);
    }
    const citationContent: PetraCitationBundle["content"] = {
      style: structuredClone(input.request.content.citation_preferences.style),
      export_formats: [
        ...input.request.content.citation_preferences.export_formats,
      ],
      citations: citations as [CitationEntry, ...CitationEntry[]],
      bibliography_artifacts: [],
    };
    const citationBundle: PetraCitationBundle = {
      schema_name: "petra.citation-bundle",
      schema_version: "1.0.0",
      citation_bundle_id: citationBundleId,
      revision: 1,
      project_id: input.request.project_id,
      draft_ref: structuredClone(draftRef),
      evidence_packet_ref: exactEvidenceRef(input.evidence),
      content: citationContent,
      content_hash: canonicalHash(citationContent),
      compiled_by: structuredClone(input.serviceActor),
      compiled_at: createdAt,
    };

    for (const [name, value] of [
      ["draft-artifact", draft],
      ...spans.map((span) => ["draft-span", span] as const),
      ["provenance-map", provenanceMap],
      ["citation-bundle", citationBundle],
    ] as const) {
      this.#contracts.assertValid(name, "1.0.0", value);
    }
    const aggregate: RegisterCompositionInput = {
      draft,
      spans,
      provenanceMap,
      citationBundle,
      scholarlyRecords: input.scholarlyRecords,
    };
    controls.register(aggregate);
    return {
      request: structuredClone(input.request),
      plan: structuredClone(input.plan),
      ...structuredClone(aggregate),
    };
  }

  #validateInputs(input: CompileGroundedCompositionInput): void {
    for (const [name, value] of [
      ["composition-request", input.request],
      ["composition-plan", input.plan],
      ["evidence-packet", input.evidence],
      ["grounded-response", input.groundedResponse],
    ] as const) {
      this.#contracts.assertValid(name, "1.0.0", value);
    }
    if (
      input.modelActor.actor_kind !== "model" ||
      input.serviceActor.actor_kind !== "service"
    ) {
      throw new CompositionCompilerError(
        "COMPOSITION_COMPILER_ACTOR_INVALID",
        "Grounded composition requires one model producer and one service compiler.",
      );
    }
    const grounded = input.groundedResponse;
    if (
      grounded.project_id !== input.request.project_id ||
      grounded.content.cache.state !== "reusable" ||
      grounded.content.terminal.state !== "completed" ||
      !same(grounded.content.snapshot_ref, input.request.snapshot_ref) ||
      !same(
        grounded.content.evidence_packet_ref,
        exactEvidenceRef(input.evidence),
      ) ||
      !same(input.evidence.snapshot_ref, input.request.snapshot_ref) ||
      grounded.content_hash !== canonicalHash(grounded.content) ||
      grounded.recorded_at < input.plan.compiled_at
    ) {
      throw new CompositionCompilerError(
        "COMPOSITION_COMPILER_GROUNDED_RESPONSE_INVALID",
        "Drafting requires one current completed GroundedResponse at the request's exact Project, EvidencePacket, and snapshot.",
      );
    }
    if (
      input.promptProfile.name.length === 0 ||
      input.promptProfile.version.length === 0 ||
      !/^sha256:[0-9a-f]{64}$/.test(input.promptHash)
    ) {
      throw new CompositionCompilerError(
        "COMPOSITION_COMPILER_GROUNDED_RESPONSE_INVALID",
        "Draft production must retain its exact prompt profile and hash.",
      );
    }
  }

  #provenanceBases(
    move: SpanPlan["move"],
    input: CompileGroundedCompositionInput,
  ): [ProvenanceBasis, ...ProvenanceBasis[]] {
    if (move.semantic_origin === "source_report") {
      return move.evidence_refs.map((reference) => ({
        basis_kind: "evidence" as const,
        evidence_selection_order: reference.context_selection_order,
        object_ref: structuredClone(reference.object_ref),
        relation: reference.relation,
      })) as [ProvenanceBasis, ...ProvenanceBasis[]];
    }
    if (move.semantic_origin === "petra_inference") {
      const orders = unique(
        move.evidence_refs.map(
          (reference) => reference.context_selection_order,
        ),
      );
      return [
        {
          basis_kind: "petra_inference",
          inference_kind:
            move.scientific_force === "comparison" ? "comparison" : "synthesis",
          evidence_selection_orders: orders as [number, ...number[]],
          model_request_id:
            input.groundedResponse.content.execution_ref.model_request_id,
          relation:
            move.scientific_force === "comparison" ? "comparison" : "synthesis",
          rationale: move.limitations.join(" ") || move.planned_text,
        },
      ];
    }
    if (move.semantic_origin === "researcher_statement") {
      return [
        {
          basis_kind: "researcher",
          researcher_id: input.request.requested_by.actor_id,
          statement_kind: "supplied_statement",
          relation: "support",
        },
      ];
    }
    return [
      {
        basis_kind: "structural",
        function: "organization",
        relation: "structural",
      },
    ];
  }

  #compileCitations(
    input: CompileGroundedCompositionInput,
    spanPlans: readonly SpanPlan[],
  ): CitationEntry[] {
    const context = this.#packets.getContextPacket(
      input.evidence.content.context_packet_ref.context_packet_id,
    );
    if (context === undefined) {
      throw new CompositionCompilerError(
        "COMPOSITION_COMPILER_EVIDENCE_MISSING",
        "The exact ContextPacket is unavailable for citation resolution.",
      );
    }
    const inclusions = new Map(
      context.content.included_objects.map((inclusion) => [
        inclusion.selection_order,
        inclusion,
      ]),
    );
    const uses = new Map<string, CitationUse>();
    for (const { move, spanId } of spanPlans) {
      if (!move.citation_required) continue;
      const versions = new Set<string>();
      for (const reference of move.evidence_refs) {
        const inclusion = inclusions.get(reference.context_selection_order);
        const record = this.#packets.getContextRecord(
          context.context_packet_id,
          reference.object_ref.object_id,
          reference.object_ref.object_revision,
        );
        if (inclusion === undefined || record === undefined) {
          throw new CompositionCompilerError(
            "COMPOSITION_COMPILER_EVIDENCE_MISSING",
            "A planned citation cannot resolve its exact ContextPacket record.",
          );
        }
        if (
          (move.semantic_origin === "source_report" ||
            move.semantic_origin === "petra_inference") &&
          (inclusion.source_access === "metadata_only" ||
            inclusion.source_access === "not_applicable")
        ) {
          throw new CompositionCompilerError(
            "COMPOSITION_COMPILER_SOURCE_DEPTH_INSUFFICIENT",
            "Material scientific language cannot be compiled from metadata-only or non-source context.",
          );
        }
        if (
          inclusion.source_access === "abstract_only" &&
          (move.scientific_force === "causal" ||
            move.scientific_force === "mechanistic" ||
            move.scientific_force === "methodological")
        ) {
          throw new CompositionCompilerError(
            "COMPOSITION_COMPILER_ABSTRACT_ONLY_FORCE_INVALID",
            "Abstract-only evidence cannot support causal, mechanistic, or methodological draft force.",
          );
        }
        for (const workVersionId of recordWorkVersionIds(record)) {
          versions.add(workVersionId);
          const use = uses.get(workVersionId) ?? {
            spanIds: new Set<string>(),
            inclusions: new Map<number, DeepReadonly<ContextInclusion>>(),
          };
          use.spanIds.add(spanId);
          use.inclusions.set(inclusion.selection_order, inclusion);
          uses.set(workVersionId, use);
        }
      }
      if (versions.size === 0) {
        throw new CompositionCompilerError(
          "COMPOSITION_COMPILER_CITATION_UNRESOLVED",
          `Citation-required move ${move.move_id} does not resolve to a canonical WorkVersion.`,
        );
      }
    }
    if (uses.size === 0) {
      throw new CompositionCompilerError(
        "COMPOSITION_COMPILER_CITATION_UNRESOLVED",
        "The first scientific DraftArtifact must resolve at least one canonical citation.",
      );
    }
    const spanOrder = new Map(
      spanPlans.map((span, index) => [span.spanId, index]),
    );
    return [...uses.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([workVersionId, use]) =>
        this.#citationForWorkVersion(
          input.scholarlyRecords,
          input.plan.composition_plan_id,
          workVersionId,
          [...use.spanIds].sort(
            (left, right) =>
              (spanOrder.get(left) ?? 0) - (spanOrder.get(right) ?? 0),
          ),
          [...use.inclusions.values()],
        ),
      );
  }

  #citationForWorkVersion(
    scholarly: ScholarlyCitationRecords,
    compositionPlanId: string,
    workVersionId: string,
    linkedSpanIds: string[],
    inclusions: DeepReadonly<ContextInclusion>[],
  ): CitationEntry {
    const workVersion = scholarly.workVersions.find(
      (value) => value.work_version_id === workVersionId,
    );
    const work = scholarly.works.find(
      (value) => value.work_id === workVersion?.work_id,
    );
    if (workVersion === undefined || work === undefined) {
      throw new CompositionCompilerError(
        "COMPOSITION_COMPILER_CITATION_UNRESOLVED",
        `WorkVersion ${workVersionId} does not resolve to canonical scholarly records.`,
      );
    }
    const authorRefs = [...work.author_credits]
      .sort((left, right) => left.position - right.position)
      .map((credit) => {
        const author = scholarly.authors.find(
          (value) => value.author_id === credit.author_id,
        );
        if (author === undefined) {
          throw new CompositionCompilerError(
            "COMPOSITION_COMPILER_CITATION_UNRESOLVED",
            `Author ${credit.author_id} is missing from canonical scholarly records.`,
          );
        }
        return {
          author_id: author.author_id,
          revision: author.revision,
          content_hash: canonicalHash(author),
          position: credit.position,
          display_name: author.display_name,
        };
      });
    const identifiers = scholarly.externalIdentifiers.filter((identifier) =>
      this.#identifierMatches(identifier, work, workVersion),
    );
    const sourceSpanIds = unique(
      inclusions.flatMap((inclusion) => inclusion.source_span_refs),
    ).sort();
    const leadAuthor = authorRefs[0];
    if (leadAuthor === undefined || linkedSpanIds[0] === undefined) {
      throw new CompositionCompilerError(
        "COMPOSITION_COMPILER_CITATION_UNRESOLVED",
        "A canonical citation requires at least one author and one linked DraftSpan.",
      );
    }
    const identityWarnings =
      work.identity_status === "provisional"
        ? [
            {
              code: "PROVISIONAL_WORK_IDENTITY",
              message: "The canonical Work identity remains provisional.",
            },
          ]
        : work.identity_status === "disputed"
          ? [
              {
                code: "DISPUTED_WORK_IDENTITY",
                message: "The canonical Work identity is disputed.",
              },
            ]
          : [];
    const identifierRefs: CitationEntry["external_identifier_refs"] =
      identifiers.flatMap((identifier) => {
        if (
          identifier.namespace === "orcid" ||
          identifier.namespace === "openalex_author"
        ) {
          return [];
        }
        return [
          {
            external_identifier_id: identifier.external_identifier_id,
            revision: identifier.revision,
            content_hash: canonicalHash(identifier),
            namespace: identifier.namespace,
            normalized_value: identifier.normalized_value,
            verification_status: identifier.verification_status,
          },
        ];
      });
    return {
      citation_id: derivePetraId(
        "citation",
        `${compositionPlanId}:${workVersionId}`,
      ),
      bibliography_key: `${bibliographyToken(leadAuthor.display_name, "Petra")}${publishedYear(workVersion)}${bibliographyToken(work.title, "Work")}`,
      work_ref: {
        work_id: work.work_id,
        revision: work.revision,
        content_hash: canonicalHash(work),
      },
      work_version_ref: {
        work_version_id: workVersion.work_version_id,
        revision: workVersion.revision,
        content_hash: canonicalHash(workVersion),
      },
      author_refs: authorRefs as CitationEntry["author_refs"],
      external_identifier_refs: identifierRefs,
      metadata: {
        title: work.title,
        work_kind: work.work_kind,
        version_label: workVersion.version_label,
        publication_status: workVersion.publication_status,
        published_date: workVersion.published_date ?? null,
      },
      identity_status: work.identity_status,
      metadata_completeness:
        work.identity_status === "disputed"
          ? "conflicted"
          : work.identity_status === "provisional" ||
              identifiers.length === 0 ||
              workVersion.published_date === undefined
            ? "partial"
            : "complete",
      identity_warnings: identityWarnings,
      purposes: ["evidence"],
      linked_draft_span_ids: linkedSpanIds as [string, ...string[]],
      locator:
        sourceSpanIds[0] === undefined
          ? {
              locator_kind: "section",
              value: "Canonical WorkVersion metadata",
            }
          : {
              locator_kind: "source_span",
              source_span_id: sourceSpanIds[0],
            },
      source_access: {
        processing_depth: citationDepth(inclusions),
        source_span_ids: sourceSpanIds,
      },
    };
  }

  #identifierMatches(
    identifier: PetraExternalIdentifier,
    work: PetraWork,
    workVersion: PetraWorkVersion,
  ): boolean {
    return identifier.subject.subject_kind === "work"
      ? identifier.subject.work_id === work.work_id
      : identifier.subject.subject_kind === "work_version"
        ? identifier.subject.work_version_id === workVersion.work_version_id
        : false;
  }
}
