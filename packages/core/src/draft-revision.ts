import { createHash } from "node:crypto";

import type {
  ActorRef,
  CitationEntry,
  DraftSupportValidatorResult,
  PetraCitationBundle,
  PetraDraftArtifact,
  PetraDraftSpan,
  PetraDraftSupportAssessment,
  PetraProvenanceMap,
  ProvenanceBasis,
  ProvenanceSpanMapping,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type { RegisterCompositionInput } from "./composition-registry.js";
import { derivePetraId } from "./identity.js";

export type DraftRevisionErrorCode =
  | "DRAFT_REVISION_ACTOR_INVALID"
  | "DRAFT_REVISION_BASE_INVALID"
  | "DRAFT_REVISION_COMMAND_INVALID"
  | "DRAFT_REVISION_REPLACEMENT_INVALID"
  | "DRAFT_REVISION_REVALIDATION_INVALID";

export class DraftRevisionError extends Error {
  readonly code: DraftRevisionErrorCode;

  constructor(code: DraftRevisionErrorCode, message: string) {
    super(message);
    this.name = "DraftRevisionError";
    this.code = code;
  }
}

export interface ResearcherSpanReplacement {
  readonly draftSpanId: string;
  readonly expectedExactTextHash: string;
  readonly replacementText: string;
}

export interface ResearcherDraftEditInput {
  readonly previous: RegisterCompositionInput;
  readonly commandId: string;
  readonly researcher: ActorRef;
  readonly serviceActor: ActorRef;
  readonly replacements: readonly [
    ResearcherSpanReplacement,
    ...ResearcherSpanReplacement[],
  ];
  readonly editedAt: string;
}

export interface ResearcherDraftEditResult {
  readonly composition: RegisterCompositionInput;
  readonly assessment: PetraDraftSupportAssessment;
}

export interface DraftSpanRevalidation {
  readonly draftSpanId: string;
  readonly outcome: "pass" | "fail";
  readonly validatorResults: readonly [
    DraftSupportValidatorResult,
    ...DraftSupportValidatorResult[],
  ];
  readonly reason: string;
}

export interface RevalidateDraftSupportInput {
  readonly composition: RegisterCompositionInput;
  readonly previousAssessment: PetraDraftSupportAssessment;
  readonly commandId: string;
  readonly requestedBy: ActorRef;
  readonly serviceActor: ActorRef;
  readonly spanResults: readonly [
    DraftSpanRevalidation,
    ...DraftSpanRevalidation[],
  ];
  readonly validatorResults: readonly [
    DraftSupportValidatorResult,
    ...DraftSupportValidatorResult[],
  ];
  readonly limitations: readonly string[];
  readonly assessedAt: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const draftRef = (draft: PetraDraftArtifact) => ({
  draft_artifact_id: draft.draft_artifact_id,
  revision: draft.revision,
  content_hash: draft.content_hash,
});

const provenanceRef = (provenanceMap: PetraProvenanceMap) => ({
  provenance_map_id: provenanceMap.provenance_map_id,
  revision: provenanceMap.revision,
  content_hash: provenanceMap.content_hash,
});

const citationRef = (citationBundle: PetraCitationBundle) => ({
  citation_bundle_id: citationBundle.citation_bundle_id,
  revision: citationBundle.revision,
  content_hash: citationBundle.content_hash,
});

const assertActor = (actor: ActorRef, expected: "human" | "service"): void => {
  if (actor.actor_kind !== expected) {
    throw new DraftRevisionError(
      "DRAFT_REVISION_ACTOR_INVALID",
      `Draft revision requires an exact ${expected} Actor.`,
    );
  }
};

const citationState = (
  citationIds: ReadonlySet<string>,
  stale: boolean,
): "current" | "stale" | "not_required" =>
  citationIds.size === 0 ? "not_required" : stale ? "stale" : "current";

export class DraftRevisionEngine {
  readonly #contracts: PetraContractRegistry;

  constructor(contracts = new PetraContractRegistry()) {
    this.#contracts = contracts;
  }

  edit(input: ResearcherDraftEditInput): ResearcherDraftEditResult {
    assertActor(input.researcher, "human");
    assertActor(input.serviceActor, "service");
    this.#assertCommand(input.commandId);
    this.#assertBase(input.previous);
    if (
      input.previous.draft.validation.state === "stale" ||
      input.previous.draft.validation.state === "failed" ||
      input.previous.provenanceMap.content.state !== "current"
    ) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_BASE_INVALID",
        "A new researcher edit must start from a non-failed draft with current provenance; resolve existing stale support before compounding edits.",
      );
    }

    const priorSpans = [...input.previous.spans].sort(
      (left, right) => left.content.start - right.content.start,
    );
    const replacements = new Map(
      input.replacements.map((replacement) => [
        replacement.draftSpanId,
        replacement,
      ]),
    );
    if (replacements.size !== input.replacements.length) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_REPLACEMENT_INVALID",
        "Each edit command may replace a DraftSpan at most once.",
      );
    }
    const priorById = new Map(
      priorSpans.map((span) => [span.draft_span_id, span]),
    );
    for (const replacement of input.replacements) {
      const prior = priorById.get(replacement.draftSpanId);
      if (
        prior === undefined ||
        prior.content.exact_text_hash !== replacement.expectedExactTextHash ||
        replacement.replacementText.trim().length === 0 ||
        replacement.replacementText === prior.content.exact_text
      ) {
        throw new DraftRevisionError(
          "DRAFT_REVISION_REPLACEMENT_INVALID",
          "Every replacement must name one exact current DraftSpan hash and supply changed, non-empty text.",
        );
      }
    }

    const nextRevision = input.previous.draft.revision + 1;
    const mapId = derivePetraId(
      "provenance_map",
      `${input.commandId}|${input.previous.draft.draft_artifact_id}|${nextRevision}`,
    );
    const bundleId = derivePetraId(
      "citation_bundle",
      `${input.commandId}|${input.previous.citationBundle.citation_bundle_id}|${nextRevision}`,
    );
    const sourceCodePoints = Array.from(input.previous.draft.content.text);
    const fragments: string[] = [];
    const spanDrafts: Array<{
      prior: PetraDraftSpan;
      id: string;
      text: string;
      start: number;
      end: number;
      changed: boolean;
    }> = [];
    let sourceCursor = 0;
    let outputCursor = 0;
    for (const prior of priorSpans) {
      const gap = sourceCodePoints
        .slice(sourceCursor, prior.content.start)
        .join("");
      fragments.push(gap);
      outputCursor += Array.from(gap).length;
      const replacement = replacements.get(prior.draft_span_id);
      const text = replacement?.replacementText ?? prior.content.exact_text;
      const start = outputCursor;
      const end = start + Array.from(text).length;
      const id = derivePetraId(
        "draft_span",
        `${input.commandId}|${prior.draft_span_id}|${textHash(text)}`,
      );
      spanDrafts.push({
        prior,
        id,
        text,
        start,
        end,
        changed: replacement !== undefined,
      });
      fragments.push(text);
      outputCursor = end;
      sourceCursor = prior.content.end;
    }
    fragments.push(sourceCodePoints.slice(sourceCursor).join(""));
    const text = fragments.join("");
    const content: PetraDraftArtifact["content"] = {
      ...clone(input.previous.draft.content),
      text,
      draft_span_ids: [
        spanDrafts[0]!.id,
        ...spanDrafts.slice(1).map((span) => span.id),
      ],
    };
    const contentHash = canonicalHash(content);
    const exactDraftRef = {
      draft_artifact_id: input.previous.draft.draft_artifact_id,
      revision: nextRevision,
      content_hash: contentHash,
    };
    const spans: PetraDraftSpan[] = spanDrafts.map((span) => {
      const spanContent: PetraDraftSpan["content"] = {
        ...clone(span.prior.content),
        start: span.start,
        end: span.end,
        exact_text: span.text,
        exact_text_hash: textHash(span.text),
        ...(span.changed
          ? { semantic_origin: "researcher_statement" as const }
          : {}),
      };
      return {
        schema_name: "petra.draft-span",
        schema_version: "1.0.0",
        draft_span_id: span.id,
        revision: 1,
        project_id: input.previous.draft.project_id,
        draft_ref: exactDraftRef,
        content: spanContent,
        content_hash: canonicalHash(spanContent),
        created_by: clone(input.researcher),
        created_at: input.editedAt,
      };
    });
    const newIdByOld = new Map(
      spanDrafts.map((span) => [span.prior.draft_span_id, span.id]),
    );
    const changedIds = new Set(
      spanDrafts.filter((span) => span.changed).map((span) => span.id),
    );
    const mappingByOld = new Map(
      input.previous.provenanceMap.content.mappings.map((mapping) => [
        mapping.draft_span_id,
        mapping,
      ]),
    );
    const mappingList = spanDrafts.map((span): ProvenanceSpanMapping => {
      const prior = mappingByOld.get(span.prior.draft_span_id);
      if (prior === undefined) {
        throw new DraftRevisionError(
          "DRAFT_REVISION_BASE_INVALID",
          "Every prior DraftSpan must resolve to one exact provenance mapping.",
        );
      }
      const bases = clone(prior.bases) as ProvenanceBasis[];
      if (span.changed) {
        bases.push({
          basis_kind: "researcher",
          researcher_id: input.researcher.actor_id,
          statement_kind: "supplied_statement",
          relation: "interpretation",
        });
        return {
          draft_span_id: span.id,
          draft_span_revision: 1 as const,
          mapping_state: "stale" as const,
          bases: [bases[0]!, ...bases.slice(1)],
          invalidated_by: [input.commandId],
        };
      }
      return {
        draft_span_id: span.id,
        draft_span_revision: 1 as const,
        mapping_state: "current" as const,
        bases: [bases[0]!, ...bases.slice(1)],
      };
    });
    const mappings: PetraProvenanceMap["content"]["mappings"] = [
      mappingList[0]!,
      ...mappingList.slice(1),
    ];
    const provenanceContent: PetraProvenanceMap["content"] = {
      state: "stale",
      mappings,
    };
    const provenanceMap: PetraProvenanceMap = {
      schema_name: "petra.provenance-map",
      schema_version: "1.0.0",
      provenance_map_id: mapId,
      revision: 1,
      project_id: input.previous.draft.project_id,
      draft_ref: exactDraftRef,
      evidence_packet_ref: clone(input.previous.draft.evidence_packet_ref),
      content: provenanceContent,
      content_hash: canonicalHash(provenanceContent),
      compiled_by: clone(input.serviceActor),
      compiled_at: input.editedAt,
    };
    const citations = input.previous.citationBundle.content.citations.map(
      (prior): CitationEntry => {
        const linkedDraftSpanIds = prior.linked_draft_span_ids.map((id) => {
          const next = newIdByOld.get(id);
          if (next === undefined) {
            throw new DraftRevisionError(
              "DRAFT_REVISION_BASE_INVALID",
              "Every prior citation link must resolve to a revised DraftSpan.",
            );
          }
          return next;
        });
        return {
          ...clone(prior),
          citation_id: derivePetraId(
            "citation",
            `${bundleId}|${prior.citation_id}`,
          ),
          linked_draft_span_ids: [
            linkedDraftSpanIds[0]!,
            ...linkedDraftSpanIds.slice(1),
          ],
        };
      },
    );
    const citationContent: PetraCitationBundle["content"] = {
      ...clone(input.previous.citationBundle.content),
      citations: [citations[0]!, ...citations.slice(1)],
      bibliography_artifacts: [],
    };
    const citationBundle: PetraCitationBundle = {
      schema_name: "petra.citation-bundle",
      schema_version: "1.0.0",
      citation_bundle_id: bundleId,
      revision: 1,
      project_id: input.previous.draft.project_id,
      draft_ref: exactDraftRef,
      evidence_packet_ref: clone(input.previous.draft.evidence_packet_ref),
      content: citationContent,
      content_hash: canonicalHash(citationContent),
      compiled_by: clone(input.serviceActor),
      compiled_at: input.editedAt,
    };
    const draft: PetraDraftArtifact = {
      ...clone(input.previous.draft),
      revision: nextRevision,
      provenance_map_ref: { provenance_map_id: mapId, revision: 1 },
      citation_bundle_ref: { citation_bundle_id: bundleId, revision: 1 },
      lineage: {
        lineage_kind: "revision",
        parent_draft_artifact_id: input.previous.draft.draft_artifact_id,
        parent_revision: input.previous.draft.revision,
        edit_origin: "researcher_edit",
      },
      production: {
        origin_kind: "researcher_authored",
        researcher_id: input.researcher.actor_id,
      },
      content,
      content_hash: contentHash,
      validation: {
        state: "stale",
        validator_results: [
          {
            validator: "petra.edit-staleness",
            version: "1.0.0",
            outcome: "warning",
            code: "EDITED_SUPPORT_REQUIRES_REVALIDATION",
            message:
              "Changed wording cannot inherit prior support without explicit revalidation.",
          },
        ],
        limitations: [
          "Researcher-edited spans require explicit support revalidation before reuse.",
        ],
        unresolved_support_span_ids: [],
      },
      created_by: clone(input.researcher),
      created_at: input.editedAt,
    };
    const citationIdsBySpan = new Map<string, Set<string>>();
    for (const citation of citations) {
      for (const spanId of citation.linked_draft_span_ids) {
        const ids = citationIdsBySpan.get(spanId) ?? new Set<string>();
        ids.add(citation.citation_id);
        citationIdsBySpan.set(spanId, ids);
      }
    }
    const spanAssessments = mappings.map((mapping) => {
      const stale = mapping.mapping_state === "stale";
      return {
        draft_span_id: mapping.draft_span_id,
        support_state: stale ? ("stale" as const) : ("current" as const),
        citation_state: citationState(
          citationIdsBySpan.get(mapping.draft_span_id) ?? new Set(),
          stale,
        ),
        basis_snapshot: clone(mapping.bases),
        validator_results: [],
        reasons: stale
          ? [
              "The researcher changed this span after its evidence mapping was compiled.",
            ]
          : [],
      };
    });
    const citationAssessments = citations.map((citation) => {
      const staleIds = citation.linked_draft_span_ids.filter((id) =>
        changedIds.has(id),
      );
      return {
        citation_id: citation.citation_id,
        link_state:
          staleIds.length === 0
            ? ("current" as const)
            : staleIds.length === citation.linked_draft_span_ids.length
              ? ("stale" as const)
              : ("partially_stale" as const),
        stale_draft_span_ids: staleIds,
      };
    });
    const assessmentContent: PetraDraftSupportAssessment["content"] = {
      state: "stale",
      span_assessments: [spanAssessments[0]!, ...spanAssessments.slice(1)],
      citation_assessments: [
        citationAssessments[0]!,
        ...citationAssessments.slice(1),
      ],
      validator_results: [
        {
          validator: "petra.edit-staleness",
          version: "1.0.0",
          outcome: "warning",
          code: "EDITED_SUPPORT_REQUIRES_REVALIDATION",
        },
      ],
      limitations: [
        "Changed spans and their citation links cannot be reused as supported until explicit revalidation passes.",
      ],
      reuse_policy: {
        reuse_allowed: false,
        reason:
          "At least one DraftSpan has stale support after researcher editing.",
      },
      authority_boundary: {
        assessment_is_scientific_evidence: false,
        assessment_controls_draft_reuse: true,
      },
    };
    const assessment: PetraDraftSupportAssessment = {
      schema_name: "petra.draft-support-assessment",
      schema_version: "1.0.0",
      draft_support_assessment_id: derivePetraId(
        "draft_support_assessment",
        `${draft.draft_artifact_id}|${draft.revision}|${draft.content_hash}`,
      ),
      revision: 1,
      project_id: draft.project_id,
      draft_ref: exactDraftRef,
      provenance_map_ref: provenanceRef(provenanceMap),
      citation_bundle_ref: citationRef(citationBundle),
      lineage: { lineage_kind: "root" },
      trigger: {
        trigger_kind: "researcher_edit",
        command_id: input.commandId,
        researcher: clone(input.researcher) as {
          actor_id: string;
          actor_kind: "human";
        },
      },
      content: assessmentContent,
      content_hash: canonicalHash(assessmentContent),
      assessed_by: clone(input.serviceActor),
      assessed_at: input.editedAt,
    };
    const composition: RegisterCompositionInput = {
      draft,
      spans,
      provenanceMap,
      citationBundle,
      scholarlyRecords: clone(input.previous.scholarlyRecords),
    };
    this.#assertOutput(composition, assessment);
    return { composition, assessment };
  }

  revalidate(input: RevalidateDraftSupportInput): PetraDraftSupportAssessment {
    assertActor(input.requestedBy, "human");
    assertActor(input.serviceActor, "service");
    this.#assertCommand(input.commandId);
    this.#assertOutput(input.composition, input.previousAssessment);
    if (
      input.previousAssessment.content.state !== "stale" ||
      input.previousAssessment.content.reuse_policy.reuse_allowed
    ) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_REVALIDATION_INVALID",
        "Support revalidation must start from the current non-reusable stale assessment.",
      );
    }
    const staleSpanIds = input.previousAssessment.content.span_assessments
      .filter((assessment) => assessment.support_state === "stale")
      .map((assessment) => assessment.draft_span_id);
    const resultBySpan = new Map(
      input.spanResults.map((result) => [result.draftSpanId, result]),
    );
    if (
      resultBySpan.size !== input.spanResults.length ||
      staleSpanIds.length !== input.spanResults.length ||
      staleSpanIds.some((id) => !resultBySpan.has(id)) ||
      input.spanResults.some(
        (result) =>
          result.reason.trim().length === 0 ||
          result.validatorResults.length === 0 ||
          result.validatorResults.some((validator) =>
            result.outcome === "pass"
              ? validator.outcome === "fail"
              : validator.outcome !== "fail",
          ),
      )
    ) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_REVALIDATION_INVALID",
        "Revalidation must provide one reasoned, validator-backed pass or fail result for every stale DraftSpan.",
      );
    }
    const globalFailure = input.validatorResults.some(
      (result) => result.outcome === "fail",
    );
    const passed =
      !globalFailure &&
      input.spanResults.every((result) => result.outcome === "pass");
    const failedSpanIds = new Set(
      passed
        ? []
        : staleSpanIds.filter(
            (id) => globalFailure || resultBySpan.get(id)?.outcome === "fail",
          ),
    );
    const citationIdsBySpan = new Map<string, Set<string>>();
    for (const citation of input.composition.citationBundle.content.citations) {
      for (const spanId of citation.linked_draft_span_ids) {
        const ids = citationIdsBySpan.get(spanId) ?? new Set<string>();
        ids.add(citation.citation_id);
        citationIdsBySpan.set(spanId, ids);
      }
    }
    const spanAssessments =
      input.previousAssessment.content.span_assessments.map((assessment) => {
        if (assessment.support_state !== "stale") return clone(assessment);
        const result = resultBySpan.get(assessment.draft_span_id)!;
        const failed = failedSpanIds.has(assessment.draft_span_id);
        return {
          ...clone(assessment),
          support_state: failed ? ("failed" as const) : ("passed" as const),
          citation_state: citationState(
            citationIdsBySpan.get(assessment.draft_span_id) ?? new Set(),
            failed,
          ),
          validator_results: result.validatorResults.map((validator) =>
            clone(validator),
          ),
          reasons: [result.reason],
        };
      });
    const citationAssessments =
      input.composition.citationBundle.content.citations.map((citation) => {
        const failedIds = citation.linked_draft_span_ids.filter((id) =>
          failedSpanIds.has(id),
        );
        return {
          citation_id: citation.citation_id,
          link_state:
            failedIds.length === 0
              ? ("current" as const)
              : failedIds.length === citation.linked_draft_span_ids.length
                ? ("stale" as const)
                : ("partially_stale" as const),
          stale_draft_span_ids: failedIds,
        };
      });
    const content: PetraDraftSupportAssessment["content"] = {
      state: passed ? "passed" : "failed",
      span_assessments: [spanAssessments[0]!, ...spanAssessments.slice(1)],
      citation_assessments: [
        citationAssessments[0]!,
        ...citationAssessments.slice(1),
      ],
      validator_results: input.validatorResults.map((validator) =>
        clone(validator),
      ),
      limitations: [...input.limitations],
      reuse_policy: {
        reuse_allowed: passed,
        reason: passed
          ? "Every changed span and citation link passed explicit support revalidation."
          : "At least one changed span or whole-draft validator failed revalidation.",
      },
      authority_boundary: {
        assessment_is_scientific_evidence: false,
        assessment_controls_draft_reuse: true,
      },
    };
    const assessment: PetraDraftSupportAssessment = {
      ...clone(input.previousAssessment),
      revision: input.previousAssessment.revision + 1,
      lineage: {
        lineage_kind: "revision",
        parent_revision: input.previousAssessment.revision,
        parent_content_hash: input.previousAssessment.content_hash,
      },
      trigger: {
        trigger_kind: "support_revalidation",
        command_id: input.commandId,
        requested_by: clone(input.requestedBy) as {
          actor_id: string;
          actor_kind: "human";
        },
        executed_by: clone(input.serviceActor) as {
          actor_id: string;
          actor_kind: "service";
        },
      },
      content,
      content_hash: canonicalHash(content),
      assessed_by: clone(input.serviceActor),
      assessed_at: input.assessedAt,
    };
    this.#contracts.assertValid(
      "draft-support-assessment",
      "1.0.0",
      assessment,
    );
    return assessment;
  }

  #assertCommand(commandId: string): void {
    if (!/^command_[0-9A-HJKMNP-TV-Z]{26}$/.test(commandId)) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_COMMAND_INVALID",
        "A draft revision operation requires one canonical command ID.",
      );
    }
  }

  #assertBase(previous: RegisterCompositionInput): void {
    try {
      this.#contracts.assertValid("draft-artifact", "1.0.0", previous.draft);
      for (const span of previous.spans) {
        this.#contracts.assertValid("draft-span", "1.0.0", span);
      }
      this.#contracts.assertValid(
        "provenance-map",
        "1.0.0",
        previous.provenanceMap,
      );
      this.#contracts.assertValid(
        "citation-bundle",
        "1.0.0",
        previous.citationBundle,
      );
    } catch (error) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_BASE_INVALID",
        `The prior composition failed contract validation: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    if (
      previous.draft.content_hash !== canonicalHash(previous.draft.content) ||
      previous.provenanceMap.content_hash !==
        canonicalHash(previous.provenanceMap.content) ||
      previous.citationBundle.content_hash !==
        canonicalHash(previous.citationBundle.content) ||
      !same(previous.provenanceMap.draft_ref, draftRef(previous.draft)) ||
      !same(previous.citationBundle.draft_ref, draftRef(previous.draft))
    ) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_BASE_INVALID",
        "The prior composition must retain exact draft, provenance, citation, and content hashes.",
      );
    }
  }

  #assertOutput(
    composition: RegisterCompositionInput,
    assessment: PetraDraftSupportAssessment,
  ): void {
    this.#assertBase(composition);
    try {
      this.#contracts.assertValid(
        "draft-support-assessment",
        "1.0.0",
        assessment,
      );
    } catch (error) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_BASE_INVALID",
        `The support assessment failed contract validation: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
    if (
      assessment.project_id !== composition.draft.project_id ||
      !same(assessment.draft_ref, draftRef(composition.draft)) ||
      !same(
        assessment.provenance_map_ref,
        provenanceRef(composition.provenanceMap),
      ) ||
      !same(
        assessment.citation_bundle_ref,
        citationRef(composition.citationBundle),
      ) ||
      assessment.content_hash !== canonicalHash(assessment.content)
    ) {
      throw new DraftRevisionError(
        "DRAFT_REVISION_BASE_INVALID",
        "The support assessment must bind the exact draft, provenance, citation, Project, and content hash.",
      );
    }
  }
}
