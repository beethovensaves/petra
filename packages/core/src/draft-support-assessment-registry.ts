import { createHash } from "node:crypto";

import type {
  PetraDraftSupportAssessment,
  PetraProvenanceMap,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type { RegisterCompositionInput } from "./composition-registry.js";

export type DraftSupportAssessmentErrorCode =
  | "DRAFT_SUPPORT_ASSESSMENT_ID_CONFLICT"
  | "DRAFT_SUPPORT_ASSESSMENT_COMMAND_CONFLICT"
  | "DRAFT_SUPPORT_ASSESSMENT_REFERENCE_MISMATCH"
  | "DRAFT_SUPPORT_ASSESSMENT_LINEAGE_INVALID"
  | "DRAFT_SUPPORT_ASSESSMENT_SPAN_INVALID"
  | "DRAFT_SUPPORT_ASSESSMENT_CITATION_INVALID"
  | "DRAFT_SUPPORT_ASSESSMENT_STATE_INVALID";

export class DraftSupportAssessmentError extends Error {
  readonly code: DraftSupportAssessmentErrorCode;

  constructor(code: DraftSupportAssessmentErrorCode, message: string) {
    super(message);
    this.name = "DraftSupportAssessmentError";
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

interface StoredAssessment {
  readonly fingerprint: string;
  readonly value: DeepReadonly<PetraDraftSupportAssessment>;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

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

const draftRef = (composition: RegisterCompositionInput) => ({
  draft_artifact_id: composition.draft.draft_artifact_id,
  revision: composition.draft.revision,
  content_hash: composition.draft.content_hash,
});

const provenanceRef = (provenanceMap: PetraProvenanceMap) => ({
  provenance_map_id: provenanceMap.provenance_map_id,
  revision: provenanceMap.revision,
  content_hash: provenanceMap.content_hash,
});

const citationRef = (composition: RegisterCompositionInput) => ({
  citation_bundle_id: composition.citationBundle.citation_bundle_id,
  revision: composition.citationBundle.revision,
  content_hash: composition.citationBundle.content_hash,
});

const key = (assessmentId: string, revision: number): string =>
  `${assessmentId}:${revision}`;

export class InMemoryDraftSupportAssessmentRegistry {
  readonly #contracts: PetraContractRegistry;
  readonly #records = new Map<string, StoredAssessment>();
  readonly #currentRevision = new Map<string, number>();
  readonly #commandOwner = new Map<string, string>();

  constructor(contracts = new PetraContractRegistry()) {
    this.#contracts = contracts;
  }

  get size(): number {
    return this.#records.size;
  }

  get(
    assessmentId: string,
    revision: number,
  ): DeepReadonly<PetraDraftSupportAssessment> | undefined {
    return this.#records.get(key(assessmentId, revision))?.value;
  }

  getCurrent(
    assessmentId: string,
  ): DeepReadonly<PetraDraftSupportAssessment> | undefined {
    const revision = this.#currentRevision.get(assessmentId);
    return revision === undefined
      ? undefined
      : this.get(assessmentId, revision);
  }

  register(
    assessment: PetraDraftSupportAssessment,
    composition: RegisterCompositionInput,
  ): DeepReadonly<PetraDraftSupportAssessment> {
    this.#contracts.assertValid(
      "draft-support-assessment",
      assessment.schema_version,
      assessment,
    );
    const fingerprint = canonicalHash(assessment);
    const recordKey = key(
      assessment.draft_support_assessment_id,
      assessment.revision,
    );
    const existing = this.#records.get(recordKey);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new DraftSupportAssessmentError(
          "DRAFT_SUPPORT_ASSESSMENT_ID_CONFLICT",
          "The assessment revision is already bound to different canonical content.",
        );
      }
      return existing.value;
    }
    const commandOwner = this.#commandOwner.get(assessment.trigger.command_id);
    if (commandOwner !== undefined && commandOwner !== recordKey) {
      throw new DraftSupportAssessmentError(
        "DRAFT_SUPPORT_ASSESSMENT_COMMAND_CONFLICT",
        "The assessment command ID is already bound to a different revision.",
      );
    }
    this.#validateReferences(assessment, composition);
    this.#validateLineage(assessment);
    this.#validateContent(assessment, composition);
    const stored: StoredAssessment = {
      fingerprint,
      value: immutableCopy(assessment),
    };
    this.#records.set(recordKey, stored);
    this.#currentRevision.set(
      assessment.draft_support_assessment_id,
      assessment.revision,
    );
    this.#commandOwner.set(assessment.trigger.command_id, recordKey);
    return stored.value;
  }

  #validateReferences(
    assessment: PetraDraftSupportAssessment,
    composition: RegisterCompositionInput,
  ): void {
    if (
      assessment.content_hash !== canonicalHash(assessment.content) ||
      assessment.project_id !== composition.draft.project_id ||
      !same(assessment.draft_ref, draftRef(composition)) ||
      !same(
        assessment.provenance_map_ref,
        provenanceRef(composition.provenanceMap),
      ) ||
      !same(assessment.citation_bundle_ref, citationRef(composition)) ||
      assessment.assessed_by.actor_kind !== "service" ||
      assessment.assessed_at < composition.provenanceMap.compiled_at ||
      assessment.assessed_at < composition.citationBundle.compiled_at
    ) {
      throw new DraftSupportAssessmentError(
        "DRAFT_SUPPORT_ASSESSMENT_REFERENCE_MISMATCH",
        "An assessment must bind the exact draft, provenance map, citation bundle, Project, service, content hash, and a non-antecedent time.",
      );
    }
  }

  #validateLineage(assessment: PetraDraftSupportAssessment): void {
    const current = this.#currentRevision.get(
      assessment.draft_support_assessment_id,
    );
    if (assessment.revision === 1) {
      if (
        current !== undefined ||
        assessment.lineage.lineage_kind !== "root" ||
        assessment.trigger.trigger_kind !== "researcher_edit"
      ) {
        throw new DraftSupportAssessmentError(
          "DRAFT_SUPPORT_ASSESSMENT_LINEAGE_INVALID",
          "Assessment revision 1 must be one researcher-edit root.",
        );
      }
      return;
    }
    if (
      current !== assessment.revision - 1 ||
      assessment.lineage.lineage_kind !== "revision" ||
      assessment.lineage.parent_revision !== assessment.revision - 1 ||
      assessment.trigger.trigger_kind !== "support_revalidation"
    ) {
      throw new DraftSupportAssessmentError(
        "DRAFT_SUPPORT_ASSESSMENT_LINEAGE_INVALID",
        "A later assessment must be a contiguous explicit support-revalidation revision.",
      );
    }
    const parent = this.#records.get(
      key(assessment.draft_support_assessment_id, assessment.revision - 1),
    )?.value;
    if (
      parent === undefined ||
      assessment.lineage.parent_content_hash !== parent.content_hash ||
      !same(assessment.draft_ref, parent.draft_ref) ||
      !same(assessment.provenance_map_ref, parent.provenance_map_ref) ||
      !same(assessment.citation_bundle_ref, parent.citation_bundle_ref) ||
      assessment.assessed_at < parent.assessed_at
    ) {
      throw new DraftSupportAssessmentError(
        "DRAFT_SUPPORT_ASSESSMENT_LINEAGE_INVALID",
        "Assessment revision lineage must preserve exact subject references, parent hash, and time order.",
      );
    }
  }

  #validateContent(
    assessment: PetraDraftSupportAssessment,
    composition: RegisterCompositionInput,
  ): void {
    const spanIds = composition.spans.map((span) => span.draft_span_id);
    const assessedSpanIds = assessment.content.span_assessments.map(
      (value) => value.draft_span_id,
    );
    const mappingBySpan = new Map(
      composition.provenanceMap.content.mappings.map((mapping) => [
        mapping.draft_span_id,
        mapping,
      ]),
    );
    if (
      new Set(assessedSpanIds).size !== assessedSpanIds.length ||
      assessedSpanIds.length !== spanIds.length ||
      spanIds.some((id) => !assessedSpanIds.includes(id)) ||
      assessment.content.span_assessments.some((span) => {
        const mapping = mappingBySpan.get(span.draft_span_id);
        return (
          mapping === undefined || !same(span.basis_snapshot, mapping.bases)
        );
      })
    ) {
      throw new DraftSupportAssessmentError(
        "DRAFT_SUPPORT_ASSESSMENT_SPAN_INVALID",
        "Span assessments must exhaust the draft exactly and retain each provenance basis snapshot.",
      );
    }

    const citationIds = composition.citationBundle.content.citations.map(
      (citation) => citation.citation_id,
    );
    const assessedCitationIds = assessment.content.citation_assessments.map(
      (value) => value.citation_id,
    );
    const problematicSpans = new Set(
      assessment.content.span_assessments
        .filter(
          (span) =>
            span.support_state === "stale" || span.support_state === "failed",
        )
        .map((span) => span.draft_span_id),
    );
    const citationById = new Map(
      composition.citationBundle.content.citations.map((citation) => [
        citation.citation_id,
        citation,
      ]),
    );
    if (
      new Set(assessedCitationIds).size !== assessedCitationIds.length ||
      assessedCitationIds.length !== citationIds.length ||
      citationIds.some((id) => !assessedCitationIds.includes(id))
    ) {
      throw new DraftSupportAssessmentError(
        "DRAFT_SUPPORT_ASSESSMENT_CITATION_INVALID",
        "Citation assessments must exhaust the exact CitationBundle.",
      );
    }
    for (const citationAssessment of assessment.content.citation_assessments) {
      const citation = citationById.get(citationAssessment.citation_id);
      if (citation === undefined) {
        throw new DraftSupportAssessmentError(
          "DRAFT_SUPPORT_ASSESSMENT_CITATION_INVALID",
          "A citation assessment names an unknown citation.",
        );
      }
      const expectedStale = citation.linked_draft_span_ids.filter((id) =>
        problematicSpans.has(id),
      );
      const expectedState =
        expectedStale.length === 0
          ? "current"
          : expectedStale.length === citation.linked_draft_span_ids.length
            ? "stale"
            : "partially_stale";
      if (
        citationAssessment.link_state !== expectedState ||
        !same(
          [...citationAssessment.stale_draft_span_ids].sort(),
          [...expectedStale].sort(),
        )
      ) {
        throw new DraftSupportAssessmentError(
          "DRAFT_SUPPORT_ASSESSMENT_CITATION_INVALID",
          "Citation link state must be derived exactly from problematic linked DraftSpans.",
        );
      }
    }
    const citedSpanIds = new Set(
      composition.citationBundle.content.citations.flatMap(
        (citation) => citation.linked_draft_span_ids,
      ),
    );
    for (const span of assessment.content.span_assessments) {
      const expectedCitationState = citedSpanIds.has(span.draft_span_id)
        ? problematicSpans.has(span.draft_span_id)
          ? "stale"
          : "current"
        : "not_required";
      if (span.citation_state !== expectedCitationState) {
        throw new DraftSupportAssessmentError(
          "DRAFT_SUPPORT_ASSESSMENT_SPAN_INVALID",
          "Each span's citation state must reflect its exact citation links and support state.",
        );
      }
    }

    const hasStale = assessment.content.span_assessments.some(
      (span) => span.support_state === "stale",
    );
    const hasFailed =
      assessment.content.span_assessments.some(
        (span) => span.support_state === "failed",
      ) ||
      assessment.content.validator_results.some(
        (result) => result.outcome === "fail",
      );
    const allReusable = assessment.content.span_assessments.every(
      (span) =>
        span.support_state === "current" || span.support_state === "passed",
    );
    const validState =
      assessment.revision === 1
        ? assessment.content.state === "stale" && hasStale
        : assessment.content.state === "passed"
          ? allReusable && !hasFailed && !hasStale
          : assessment.content.state === "failed"
            ? hasFailed
            : false;
    if (
      !validState ||
      assessment.content.reuse_policy.reuse_allowed !==
        (assessment.content.state === "passed") ||
      (assessment.revision > 1 &&
        assessment.content.validator_results.length === 0) ||
      (assessment.content.state === "passed" &&
        assessment.content.span_assessments.some(
          (span) =>
            span.support_state === "passed" &&
            (span.validator_results.length === 0 ||
              span.validator_results.some(
                (result) => result.outcome === "fail",
              )),
        ))
    ) {
      throw new DraftSupportAssessmentError(
        "DRAFT_SUPPORT_ASSESSMENT_STATE_INVALID",
        "Assessment state, validators, span outcomes, citation links, and reuse permission must agree exactly.",
      );
    }
  }
}
