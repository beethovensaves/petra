import { createHash } from "node:crypto";

import type {
  CitationEntry,
  PetraCitationBundle,
  PetraDraftArtifact,
  PetraDraftSpan,
  PetraFelicityRevisionRecord,
  PetraProvenanceMap,
  ProvenanceSpanMapping,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type { RegisterCompositionInput } from "./composition-registry.js";
import { derivePetraId } from "./identity.js";

export type FelicityRevisionErrorCode =
  | "FELICITY_REVISION_ACTOR_INVALID"
  | "FELICITY_REVISION_BASE_INVALID"
  | "FELICITY_REVISION_COMMAND_INVALID"
  | "FELICITY_REVISION_LANGUAGE_RISK"
  | "FELICITY_REVISION_RECORD_CONFLICT"
  | "FELICITY_REVISION_RECORD_MISMATCH";

export class FelicityRevisionError extends Error {
  readonly code: FelicityRevisionErrorCode;

  constructor(code: FelicityRevisionErrorCode, message: string) {
    super(message);
    this.name = "FelicityRevisionError";
    this.code = code;
  }
}

export interface ApplyFelicityRevisionInput {
  readonly previous: RegisterCompositionInput;
  readonly commandId: string;
  readonly serviceActor: {
    readonly actor_id: string;
    readonly actor_kind: "service";
  };
  readonly revisedAt: string;
}

export interface FelicityRevisionResult {
  readonly composition: RegisterCompositionInput;
  readonly record: PetraFelicityRevisionRecord;
}

type TransformationKind =
  PetraFelicityRevisionRecord["content"]["transformations"][number]["transformation_kind"];

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const immutableCopy = <Value>(value: Value): Value => {
  const copy = clone(value);
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
  return copy;
};

const commandPattern = /^[a-z][a-z0-9_]*_[0-9A-HJKMNP-TV-Z]{26}$/u;

const highRiskLanguage =
  /\b(?:clearly|certainly|definitively|proves?|proven|confirms?|confirmed|disproves?|disproved)\b/iu;

const sourceAttribution =
  /\b(?:authors?|researchers?|study|paper|source)\b.*\b(?:reports?|reported|finds?|found|states?|observed)\b/iu;

const inferenceMarker =
  /\b(?:suggests?|may|might|could|indicates?|within the current (?:graph|evidence))\b/iu;

const exactDraftRef = (draft: PetraDraftArtifact) => ({
  draft_artifact_id: draft.draft_artifact_id,
  revision: draft.revision,
  content_hash: draft.content_hash,
});

const exactProvenanceRef = (map: PetraProvenanceMap) => ({
  provenance_map_id: map.provenance_map_id,
  revision: map.revision,
  content_hash: map.content_hash,
});

const exactCitationRef = (bundle: PetraCitationBundle) => ({
  citation_bundle_id: bundle.citation_bundle_id,
  revision: bundle.revision,
  content_hash: bundle.content_hash,
});

const reduceFiller = (value: string): { text: string; removed: boolean } => {
  const prefixes = [
    "It is important to note that ",
    "It should be noted that ",
    "Importantly, ",
  ];
  const prefix = prefixes.find((candidate) => value.startsWith(candidate));
  if (prefix === undefined) return { text: value, removed: false };
  const remainder = value.slice(prefix.length);
  const first = Array.from(remainder)[0];
  return {
    text:
      first === undefined
        ? remainder
        : first.toLocaleUpperCase("en") + remainder.slice(first.length),
    removed: true,
  };
};

const normalizeSpanText = (
  value: string,
): { text: string; kind: TransformationKind } => {
  const normalized = value.replace(/[\t ]+/gu, " ").trim();
  const whitespaceChanged = normalized !== value;
  const reduced = reduceFiller(normalized);
  if (reduced.text.length === 0) {
    throw new FelicityRevisionError(
      "FELICITY_REVISION_LANGUAGE_RISK",
      "A bounded Felicity transformation cannot remove a complete DraftSpan.",
    );
  }
  return {
    text: reduced.text,
    kind:
      reduced.removed && whitespaceChanged
        ? "filler_and_whitespace"
        : reduced.removed
          ? "filler_reduction"
          : whitespaceChanged
            ? "whitespace_normalization"
            : "unchanged",
  };
};

const assertLanguage = (span: PetraDraftSpan, text: string): void => {
  if (span.content.materiality === "nonmaterial") return;
  if (highRiskLanguage.test(text)) {
    throw new FelicityRevisionError(
      "FELICITY_REVISION_LANGUAGE_RISK",
      "Felicity cannot certify language that carries an unlicensed certainty or proof marker.",
    );
  }
  if (
    span.content.semantic_origin === "source_report" &&
    span.content.scientific_force === "direct_report" &&
    !sourceAttribution.test(text)
  ) {
    throw new FelicityRevisionError(
      "FELICITY_REVISION_LANGUAGE_RISK",
      "A direct source report must retain visible attribution to its source or study.",
    );
  }
  if (
    span.content.semantic_origin === "petra_inference" &&
    !inferenceMarker.test(text)
  ) {
    throw new FelicityRevisionError(
      "FELICITY_REVISION_LANGUAGE_RISK",
      "A Petra inference must retain an explicit inference or uncertainty marker.",
    );
  }
};

const citationIdsBySpan = (
  bundle: PetraCitationBundle,
): ReadonlyMap<string, readonly string[]> => {
  const values = new Map<string, string[]>();
  for (const citation of bundle.content.citations) {
    for (const spanId of citation.linked_draft_span_ids) {
      const citations = values.get(spanId) ?? [];
      citations.push(citation.citation_id);
      values.set(spanId, citations);
    }
  }
  return values;
};

export class FelicityRevisionEngine {
  readonly #contracts: PetraContractRegistry;

  constructor(contracts = new PetraContractRegistry()) {
    this.#contracts = contracts;
  }

  revise(input: ApplyFelicityRevisionInput): FelicityRevisionResult {
    if (input.serviceActor.actor_kind !== "service") {
      throw new FelicityRevisionError(
        "FELICITY_REVISION_ACTOR_INVALID",
        "A bounded Felicity revision must be executed and recorded by a service Actor.",
      );
    }
    if (!commandPattern.test(input.commandId)) {
      throw new FelicityRevisionError(
        "FELICITY_REVISION_COMMAND_INVALID",
        "A Felicity revision requires one canonical command identity.",
      );
    }
    this.#assertBase(input.previous, input.revisedAt);

    const priorSpans = [...input.previous.spans].sort(
      (left, right) => left.content.start - right.content.start,
    );
    const priorMappingBySpan = new Map(
      input.previous.provenanceMap.content.mappings.map((mapping) => [
        mapping.draft_span_id,
        mapping,
      ]),
    );
    const priorCitationIds = citationIdsBySpan(input.previous.citationBundle);
    const nextRevision = input.previous.draft.revision + 1;
    const mapId = derivePetraId(
      "provenance_map",
      `${input.commandId}|felicity-provenance|${nextRevision}`,
    );
    const bundleId = derivePetraId(
      "citation_bundle",
      `${input.commandId}|felicity-citations|${nextRevision}`,
    );
    const recordId = derivePetraId(
      "felicity_revision_record",
      `${input.commandId}|${input.previous.draft.draft_artifact_id}|${nextRevision}`,
    );
    const sourceCodePoints = Array.from(input.previous.draft.content.text);
    const fragments: string[] = [];
    const spanDrafts: Array<{
      prior: PetraDraftSpan;
      mapping: ProvenanceSpanMapping;
      id: string;
      text: string;
      start: number;
      end: number;
      kind: TransformationKind;
    }> = [];
    let sourceCursor = 0;
    let outputCursor = 0;
    for (const prior of priorSpans) {
      const mapping = priorMappingBySpan.get(prior.draft_span_id);
      if (mapping === undefined || mapping.mapping_state !== "current") {
        throw new FelicityRevisionError(
          "FELICITY_REVISION_BASE_INVALID",
          "Every input DraftSpan must have one current provenance mapping before language revision.",
        );
      }
      const gap = sourceCodePoints
        .slice(sourceCursor, prior.content.start)
        .join("");
      fragments.push(gap);
      outputCursor += Array.from(gap).length;
      const normalized = normalizeSpanText(prior.content.exact_text);
      assertLanguage(prior, normalized.text);
      const start = outputCursor;
      const end = start + Array.from(normalized.text).length;
      const id = derivePetraId(
        "draft_span",
        `${input.commandId}|${prior.draft_span_id}|${textHash(normalized.text)}`,
      );
      spanDrafts.push({
        prior,
        mapping,
        id,
        text: normalized.text,
        start,
        end,
        kind: normalized.kind,
      });
      fragments.push(normalized.text);
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
    const revisedDraftRef = {
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
      };
      return {
        schema_name: "petra.draft-span",
        schema_version: "1.0.0",
        draft_span_id: span.id,
        revision: 1,
        project_id: input.previous.draft.project_id,
        draft_ref: revisedDraftRef,
        content: spanContent,
        content_hash: canonicalHash(spanContent),
        created_by: clone(input.serviceActor),
        created_at: input.revisedAt,
      };
    });
    const newIdByOld = new Map(
      spanDrafts.map((span) => [span.prior.draft_span_id, span.id]),
    );
    const mappings = spanDrafts.map((span): ProvenanceSpanMapping => ({
      draft_span_id: span.id,
      draft_span_revision: 1,
      mapping_state: "current",
      bases: clone(span.mapping.bases),
    }));
    const provenanceContent: PetraProvenanceMap["content"] = {
      state: "current",
      mappings: [mappings[0]!, ...mappings.slice(1)],
    };
    const provenanceMap: PetraProvenanceMap = {
      schema_name: "petra.provenance-map",
      schema_version: "1.0.0",
      provenance_map_id: mapId,
      revision: 1,
      project_id: input.previous.draft.project_id,
      draft_ref: revisedDraftRef,
      evidence_packet_ref: clone(input.previous.draft.evidence_packet_ref),
      content: provenanceContent,
      content_hash: canonicalHash(provenanceContent),
      compiled_by: clone(input.serviceActor),
      compiled_at: input.revisedAt,
    };
    const citations = input.previous.citationBundle.content.citations.map(
      (prior): CitationEntry => {
        const revisedId = derivePetraId(
          "citation",
          `${bundleId}|${prior.citation_id}`,
        );
        const linkedIds = prior.linked_draft_span_ids.map((id) => {
          const revisedSpanId = newIdByOld.get(id);
          if (revisedSpanId === undefined) {
            throw new FelicityRevisionError(
              "FELICITY_REVISION_BASE_INVALID",
              "Every prior citation link must resolve to one revised DraftSpan.",
            );
          }
          return revisedSpanId;
        });
        return {
          ...clone(prior),
          citation_id: revisedId,
          linked_draft_span_ids: [linkedIds[0]!, ...linkedIds.slice(1)],
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
      draft_ref: revisedDraftRef,
      evidence_packet_ref: clone(input.previous.draft.evidence_packet_ref),
      content: citationContent,
      content_hash: canonicalHash(citationContent),
      compiled_by: clone(input.serviceActor),
      compiled_at: input.revisedAt,
    };
    const validatorResults: PetraDraftArtifact["validation"]["validator_results"] =
      [
        {
          validator: "felicity-language-contract",
          version: input.previous.draft.controls.language_contract.version,
          outcome: "pass",
          code: "FELICITY_LANGUAGE_PASSED",
        },
        {
          validator: "scientific-force-preservation",
          version: "1.0.0",
          outcome: "pass",
          code: "SCIENTIFIC_FORCE_PRESERVED",
        },
        {
          validator: "epistemic-origin-preservation",
          version: "1.0.0",
          outcome: "pass",
          code: "EPISTEMIC_ORIGIN_PRESERVED",
        },
        {
          validator: "provenance-basis-preservation",
          version: "1.0.0",
          outcome: "pass",
          code: "PROVENANCE_BASES_PRESERVED",
        },
        {
          validator: "citation-scope-preservation",
          version: "1.0.0",
          outcome: "pass",
          code: "CITATION_SCOPE_PRESERVED",
        },
      ];
    const retainedValidators =
      input.previous.draft.validation.validator_results.filter(
        (result) => result.code !== "FELICITY_REVALIDATION_PENDING",
      );
    const draft: PetraDraftArtifact = {
      ...clone(input.previous.draft),
      revision: nextRevision,
      provenance_map_ref: { provenance_map_id: mapId, revision: 1 },
      citation_bundle_ref: { citation_bundle_id: bundleId, revision: 1 },
      lineage: {
        lineage_kind: "revision",
        parent_draft_artifact_id: input.previous.draft.draft_artifact_id,
        parent_revision: input.previous.draft.revision,
        edit_origin: "felicity_revision",
      },
      production: {
        origin_kind: "deterministic",
        producer: { name: "petra.felicity-rewriter", version: "1.0.0" },
      },
      content,
      content_hash: contentHash,
      validation: {
        state: "passed",
        validator_results: [...retainedValidators, ...validatorResults],
        limitations: clone(input.previous.draft.validation.limitations),
        unresolved_support_span_ids: [],
      },
      created_by: clone(input.serviceActor),
      created_at: input.revisedAt,
    };
    const revisedCitationIds = citationIdsBySpan(citationBundle);
    const transformations = spanDrafts.map((span, index) => ({
      position: index + 1,
      previous_draft_span_id: span.prior.draft_span_id,
      previous_exact_text_hash: span.prior.content.exact_text_hash,
      revised_draft_span_id: span.id,
      revised_exact_text_hash: textHash(span.text),
      transformation_kind: span.kind,
      basis_snapshot_hash: canonicalHash(span.mapping.bases),
      previous_citation_ids: [
        ...(priorCitationIds.get(span.prior.draft_span_id) ?? []),
      ],
      revised_citation_ids: [...(revisedCitationIds.get(span.id) ?? [])],
    }));
    const recordContent: PetraFelicityRevisionRecord["content"] = {
      state: "passed",
      transformations: [transformations[0]!, ...transformations.slice(1)],
      validator_results: [
        validatorResults[0]!,
        validatorResults[1]!,
        validatorResults[2]!,
        validatorResults[3]!,
        validatorResults[4]!,
      ],
      preservation: {
        scientific_force_preserved: true,
        epistemic_origin_preserved: true,
        provenance_bases_preserved: true,
        citation_scope_preserved: true,
      },
      authority_boundary: {
        record_is_scientific_evidence: false,
        content_changes_require_new_draft_revision: true,
      },
    };
    const record: PetraFelicityRevisionRecord = {
      schema_name: "petra.felicity-revision-record",
      schema_version: "1.0.0",
      felicity_revision_record_id: recordId,
      revision: 1,
      project_id: draft.project_id,
      command_id: input.commandId,
      previous_draft_ref: exactDraftRef(input.previous.draft),
      revised_draft_ref: exactDraftRef(draft),
      provenance_map_ref: exactProvenanceRef(provenanceMap),
      citation_bundle_ref: exactCitationRef(citationBundle),
      language_contract: clone(draft.controls.language_contract),
      content: recordContent,
      content_hash: canonicalHash(recordContent),
      recorded_by: clone(input.serviceActor),
      recorded_at: input.revisedAt,
    };
    const composition: RegisterCompositionInput = {
      draft,
      spans,
      provenanceMap,
      citationBundle,
      scholarlyRecords: clone(input.previous.scholarlyRecords),
    };
    this.#assertContracts(composition, record);
    new InMemoryFelicityRevisionRegistry(this.#contracts).register(
      record,
      input.previous,
      composition,
    );
    return { composition, record };
  }

  #assertBase(previous: RegisterCompositionInput, revisedAt: string): void {
    if (
      previous.spans.length === 0 ||
      previous.provenanceMap.content.state !== "current" ||
      previous.draft.validation.state === "stale" ||
      previous.draft.validation.state === "failed" ||
      previous.draft.controls.language_contract.name !== "petra.felicity" ||
      revisedAt < previous.draft.created_at ||
      revisedAt < previous.provenanceMap.compiled_at ||
      revisedAt < previous.citationBundle.compiled_at
    ) {
      throw new FelicityRevisionError(
        "FELICITY_REVISION_BASE_INVALID",
        "Felicity requires a non-failed draft, current provenance, its pinned language contract, and a non-antecedent revision time.",
      );
    }
  }

  #assertContracts(
    composition: RegisterCompositionInput,
    record: PetraFelicityRevisionRecord,
  ): void {
    this.#contracts.assertValid("draft-artifact", "1.0.0", composition.draft);
    for (const span of composition.spans) {
      this.#contracts.assertValid("draft-span", "1.0.0", span);
    }
    this.#contracts.assertValid(
      "provenance-map",
      "1.0.0",
      composition.provenanceMap,
    );
    this.#contracts.assertValid(
      "citation-bundle",
      "1.0.0",
      composition.citationBundle,
    );
    this.#contracts.assertValid("felicity-revision-record", "1.0.0", record);
  }
}

interface StoredFelicityRevision {
  readonly fingerprint: string;
  readonly record: PetraFelicityRevisionRecord;
}

export class InMemoryFelicityRevisionRegistry {
  readonly #contracts: PetraContractRegistry;
  readonly #records = new Map<string, StoredFelicityRevision>();
  readonly #commands = new Map<string, string>();
  readonly #draftRevisions = new Map<string, string>();

  constructor(contracts = new PetraContractRegistry()) {
    this.#contracts = contracts;
  }

  get(recordId: string): Readonly<PetraFelicityRevisionRecord> | undefined {
    return this.#records.get(recordId)?.record;
  }

  register(
    record: PetraFelicityRevisionRecord,
    previous: RegisterCompositionInput,
    revised: RegisterCompositionInput,
  ): Readonly<PetraFelicityRevisionRecord> {
    this.#contracts.assertValid(
      "felicity-revision-record",
      record.schema_version,
      record,
    );
    const fingerprint = canonicalHash(record);
    const existing = this.#records.get(record.felicity_revision_record_id);
    if (existing !== undefined) {
      if (existing.fingerprint !== fingerprint) {
        throw new FelicityRevisionError(
          "FELICITY_REVISION_RECORD_CONFLICT",
          "The Felicity revision record ID is already bound to different content.",
        );
      }
      return existing.record;
    }
    const commandOwner = this.#commands.get(record.command_id);
    const draftKey = `${record.revised_draft_ref.draft_artifact_id}:${record.revised_draft_ref.revision}`;
    if (
      (commandOwner !== undefined &&
        commandOwner !== record.felicity_revision_record_id) ||
      this.#draftRevisions.has(draftKey)
    ) {
      throw new FelicityRevisionError(
        "FELICITY_REVISION_RECORD_CONFLICT",
        "A Felicity command and revised DraftArtifact revision each have exactly one record owner.",
      );
    }
    this.#validate(record, previous, revised);
    const stored = immutableCopy(record);
    this.#records.set(record.felicity_revision_record_id, {
      fingerprint,
      record: stored,
    });
    this.#commands.set(record.command_id, record.felicity_revision_record_id);
    this.#draftRevisions.set(draftKey, record.felicity_revision_record_id);
    return stored;
  }

  #validate(
    record: PetraFelicityRevisionRecord,
    previous: RegisterCompositionInput,
    revised: RegisterCompositionInput,
  ): void {
    const priorSpans = [...previous.spans].sort(
      (left, right) => left.content.start - right.content.start,
    );
    const revisedSpans = [...revised.spans].sort(
      (left, right) => left.content.start - right.content.start,
    );
    const requiredValidators = new Set([
      "felicity-language-contract",
      "scientific-force-preservation",
      "epistemic-origin-preservation",
      "provenance-basis-preservation",
      "citation-scope-preservation",
    ]);
    const validators = new Map(
      record.content.validator_results.map((result) => [
        result.validator,
        result,
      ]),
    );
    if (
      record.content_hash !== canonicalHash(record.content) ||
      record.project_id !== previous.draft.project_id ||
      record.project_id !== revised.draft.project_id ||
      !same(record.previous_draft_ref, exactDraftRef(previous.draft)) ||
      !same(record.revised_draft_ref, exactDraftRef(revised.draft)) ||
      !same(
        record.provenance_map_ref,
        exactProvenanceRef(revised.provenanceMap),
      ) ||
      !same(
        record.citation_bundle_ref,
        exactCitationRef(revised.citationBundle),
      ) ||
      !same(
        record.language_contract,
        previous.draft.controls.language_contract,
      ) ||
      !same(
        record.language_contract,
        revised.draft.controls.language_contract,
      ) ||
      revised.draft.revision !== previous.draft.revision + 1 ||
      revised.draft.lineage.lineage_kind !== "revision" ||
      revised.draft.lineage.edit_origin !== "felicity_revision" ||
      revised.draft.production.origin_kind !== "deterministic" ||
      revised.draft.validation.state !== "passed" ||
      revised.provenanceMap.content.state !== "current" ||
      !same(record.recorded_by, revised.draft.created_by) ||
      record.recorded_at !== revised.draft.created_at ||
      [...requiredValidators].some(
        (name) => validators.get(name)?.outcome !== "pass",
      )
    ) {
      throw new FelicityRevisionError(
        "FELICITY_REVISION_RECORD_MISMATCH",
        "A Felicity receipt must bind one contiguous passed revision, exact controls, current provenance, responsible service, and all preservation validators.",
      );
    }
    if (
      record.content.transformations.length !== priorSpans.length ||
      priorSpans.length !== revisedSpans.length
    ) {
      throw new FelicityRevisionError(
        "FELICITY_REVISION_RECORD_MISMATCH",
        "Felicity transformations must exhaust a one-to-one bounded DraftSpan revision.",
      );
    }
    const priorMappings = new Map(
      previous.provenanceMap.content.mappings.map((mapping) => [
        mapping.draft_span_id,
        mapping,
      ]),
    );
    const revisedMappings = new Map(
      revised.provenanceMap.content.mappings.map((mapping) => [
        mapping.draft_span_id,
        mapping,
      ]),
    );
    const priorCitations = citationIdsBySpan(previous.citationBundle);
    const revisedCitations = citationIdsBySpan(revised.citationBundle);
    for (const [
      index,
      transformation,
    ] of record.content.transformations.entries()) {
      const prior = priorSpans[index];
      const next = revisedSpans[index];
      if (prior === undefined || next === undefined) {
        throw new FelicityRevisionError(
          "FELICITY_REVISION_RECORD_MISMATCH",
          "A Felicity transformation position is missing its exact DraftSpan.",
        );
      }
      const priorMapping = priorMappings.get(prior.draft_span_id);
      const revisedMapping = revisedMappings.get(next.draft_span_id);
      const expectedKind = normalizeSpanText(prior.content.exact_text).kind;
      const expectedText = normalizeSpanText(prior.content.exact_text).text;
      if (
        transformation.position !== index + 1 ||
        transformation.previous_draft_span_id !== prior.draft_span_id ||
        transformation.previous_exact_text_hash !==
          prior.content.exact_text_hash ||
        transformation.revised_draft_span_id !== next.draft_span_id ||
        transformation.revised_exact_text_hash !==
          next.content.exact_text_hash ||
        transformation.transformation_kind !== expectedKind ||
        next.content.exact_text !== expectedText ||
        next.content.semantic_origin !== prior.content.semantic_origin ||
        next.content.scientific_force !== prior.content.scientific_force ||
        next.content.materiality !== prior.content.materiality ||
        priorMapping === undefined ||
        revisedMapping === undefined ||
        !same(priorMapping.bases, revisedMapping.bases) ||
        transformation.basis_snapshot_hash !==
          canonicalHash(priorMapping.bases) ||
        !same(
          transformation.previous_citation_ids,
          priorCitations.get(prior.draft_span_id) ?? [],
        ) ||
        !same(
          transformation.revised_citation_ids,
          revisedCitations.get(next.draft_span_id) ?? [],
        )
      ) {
        throw new FelicityRevisionError(
          "FELICITY_REVISION_RECORD_MISMATCH",
          "Each Felicity transformation must preserve exact span semantics, provenance bases, and citation scope under its declared deterministic rule.",
        );
      }
    }
    const priorCitationScopes = previous.citationBundle.content.citations.map(
      (citation) => ({
        work_ref: citation.work_ref,
        work_version_ref: citation.work_version_ref,
        source_access: citation.source_access,
        author_refs: citation.author_refs,
        external_identifier_refs: citation.external_identifier_refs,
      }),
    );
    const revisedCitationScopes = revised.citationBundle.content.citations.map(
      (citation) => ({
        work_ref: citation.work_ref,
        work_version_ref: citation.work_version_ref,
        source_access: citation.source_access,
        author_refs: citation.author_refs,
        external_identifier_refs: citation.external_identifier_refs,
      }),
    );
    if (!same(priorCitationScopes, revisedCitationScopes)) {
      throw new FelicityRevisionError(
        "FELICITY_REVISION_RECORD_MISMATCH",
        "A language revision cannot change canonical citation identity or source-access scope.",
      );
    }
  }
}
