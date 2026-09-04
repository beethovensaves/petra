import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraAssertion,
  PetraClaim,
  PetraDocumentParseBundle,
  PetraEvidenceProposalBundle,
  PetraModelExtractorOutput,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import { derivePetraId } from "./identity.js";

export type ModelEvidenceExtractionErrorCode =
  | "MODEL_OUTPUT_CANDIDATE_DUPLICATE"
  | "MODEL_OUTPUT_SOURCE_NOT_AUTHORIZED"
  | "MODEL_OUTPUT_SOURCE_NOT_FOUND"
  | "MODEL_OUTPUT_QUOTE_NOT_GROUNDED"
  | "MODEL_OUTPUT_ABSTRACT_SCOPE_VIOLATION";

export class ModelEvidenceExtractionError extends Error {
  readonly code: ModelEvidenceExtractionErrorCode;

  constructor(code: ModelEvidenceExtractionErrorCode, message: string) {
    super(message);
    this.name = "ModelEvidenceExtractionError";
    this.code = code;
  }
}

export interface ModelSourceSelection {
  readonly source_span_id: string;
  readonly exact_text: string;
  readonly structural_path: string;
  readonly page_numbers: readonly [number, ...number[]];
}

export interface ModelExtractionProvenance {
  readonly project_id: string;
  readonly model_request_id: string;
  readonly model_call_id: string;
  readonly model_deployment: string;
  readonly prompt_profile: {
    readonly name: string;
    readonly version: string;
    readonly content_hash: string;
  };
  readonly parameters_hash: string;
  readonly context_packet_ref: {
    readonly context_packet_id: string;
    readonly content_hash: string;
  };
  readonly role_profile: {
    readonly name: string;
    readonly version: string;
    readonly content_hash: string;
  };
  readonly source_selections: readonly [
    ModelSourceSelection,
    ...ModelSourceSelection[],
  ];
  readonly created_by: ActorRef;
  readonly started_at: string;
  readonly completed_at: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const blockTextForSpan = (
  sourceBundle: PetraDocumentParseBundle,
  sourceSpanId: string,
): string => {
  const span = sourceBundle.spans.find(
    (candidate) => candidate.source_span_id === sourceSpanId,
  );
  if (span === undefined) {
    throw new ModelEvidenceExtractionError(
      "MODEL_OUTPUT_SOURCE_NOT_FOUND",
      `The model cited SourceSpan ${sourceSpanId}, which is absent from the immutable parse bundle.`,
    );
  }
  const block = sourceBundle.blocks.find(
    (candidate) => candidate.structural_block_id === span.structural_block_id,
  );
  if (block === undefined || block.content.content_kind !== "text") {
    throw new ModelEvidenceExtractionError(
      "MODEL_OUTPUT_SOURCE_NOT_FOUND",
      `The model cited SourceSpan ${sourceSpanId}, but its text block is unavailable.`,
    );
  }
  return block.content.text;
};

const validateAbstractScope = (
  sourceBundle: PetraDocumentParseBundle,
  candidate: PetraModelExtractorOutput["candidates"][number],
): void => {
  if (sourceBundle.source_scope !== "abstract_only") return;
  if (
    candidate.detail_level !== "broad" ||
    !["descriptive", "comparative", "theoretical"].includes(
      candidate.claim_kind,
    )
  ) {
    throw new ModelEvidenceExtractionError(
      "MODEL_OUTPUT_ABSTRACT_SCOPE_VIOLATION",
      "Abstract-only extraction may propose only broad descriptive, comparative, or theoretical Claims.",
    );
  }
};

export const validateModelExtractorGrounding = (
  output: PetraModelExtractorOutput,
  sourceBundle: PetraDocumentParseBundle,
  selections: readonly ModelSourceSelection[],
): void => {
  const keys = output.candidates.map((candidate) => candidate.candidate_key);
  if (new Set(keys).size !== keys.length) {
    throw new ModelEvidenceExtractionError(
      "MODEL_OUTPUT_CANDIDATE_DUPLICATE",
      "A model extractor response may not repeat a candidate key.",
    );
  }
  const authorized = new Map(
    selections.map((selection) => [selection.source_span_id, selection]),
  );
  for (const candidate of output.candidates) {
    validateAbstractScope(sourceBundle, candidate);
    const selectedTexts: string[] = [];
    const blockTexts: string[] = [];
    for (const sourceSpanId of candidate.source_quote.source_span_ids) {
      const selection = authorized.get(sourceSpanId);
      if (selection === undefined) {
        throw new ModelEvidenceExtractionError(
          "MODEL_OUTPUT_SOURCE_NOT_AUTHORIZED",
          `The model cited SourceSpan ${sourceSpanId}, which was not included in its outbound context.`,
        );
      }
      selectedTexts.push(selection.exact_text);
      blockTexts.push(blockTextForSpan(sourceBundle, sourceSpanId));
    }
    const quote = candidate.source_quote.exact_text;
    if (
      !selectedTexts.join(" ").includes(quote) ||
      !blockTexts.join(" ").includes(quote)
    ) {
      throw new ModelEvidenceExtractionError(
        "MODEL_OUTPUT_QUOTE_NOT_GROUNDED",
        "The model's exact quote is not present in both the authorized selection and immutable source block.",
      );
    }
  }
};

export const buildModelEvidenceProposalBundle = (
  sourceBundle: PetraDocumentParseBundle,
  output: PetraModelExtractorOutput,
  provenance: ModelExtractionProvenance,
): PetraEvidenceProposalBundle => {
  validateModelExtractorGrounding(
    output,
    sourceBundle,
    provenance.source_selections,
  );
  const recipeHash = canonicalHash({
    role_profile: provenance.role_profile,
    source_scope: sourceBundle.source_scope,
    source_selections: provenance.source_selections.map((selection) => ({
      source_span_id: selection.source_span_id,
      exact_text_hash: textHash(selection.exact_text),
    })),
  });
  const extractionRunId = derivePetraId(
    "extraction_run",
    `${provenance.model_request_id}|${provenance.model_call_id}|${canonicalHash(output)}`,
  );
  const candidateIds = new Map<string, string>();
  const candidates = output.candidates.map((modelCandidate) => {
    const identity = `${extractionRunId}|${modelCandidate.candidate_key}`;
    const candidateId = derivePetraId("evidence_candidate", identity);
    const claimId = derivePetraId("claim", identity);
    const assertionId = derivePetraId("assertion", identity);
    candidateIds.set(modelCandidate.candidate_key, candidateId);
    const [firstSourceSpanId, ...remainingSourceSpanIds] =
      modelCandidate.source_quote.source_span_ids;
    if (firstSourceSpanId === undefined) {
      throw new ModelEvidenceExtractionError(
        "MODEL_OUTPUT_SOURCE_NOT_FOUND",
        "A model candidate must cite at least one SourceSpan.",
      );
    }
    const claim: PetraClaim = {
      schema_name: "petra.claim",
      schema_version: "1.0.0",
      claim_id: claimId,
      revision: 1,
      canonical_text: modelCandidate.canonical_text,
      claim_kind: modelCandidate.claim_kind,
      normalization_status: "normalized",
      scope: structuredClone(modelCandidate.scope),
      basis: {
        basis_kind: "source",
        work_version_id: sourceBundle.document.work_version_id,
        source_scope: sourceBundle.source_scope,
        detail_level: modelCandidate.detail_level,
        source_span_ids: [...modelCandidate.source_quote.source_span_ids],
        source_stance: modelCandidate.source_stance,
        attribution: modelCandidate.attribution,
        modality: modelCandidate.modality,
        negated: modelCandidate.negated,
        ...(modelCandidate.uncertainty === undefined
          ? {}
          : { uncertainty: modelCandidate.uncertainty }),
        derivation: {
          derivation_kind: "model_extraction",
          derivation_ref: provenance.model_call_id,
        },
        validator_results: [
          {
            validator_name: "model-output-schema",
            validator_version: "1.0.0",
            outcome: "pass",
            code: "SCHEMA_VALID",
          },
          {
            validator_name: "source-span-grounding",
            validator_version: "1.0.0",
            outcome: "pass",
            code: "SOURCE_SELECTIONS_RESOLVED",
          },
        ],
        ...(modelCandidate.extraction_confidence === undefined
          ? {}
          : { extraction_confidence: modelCandidate.extraction_confidence }),
        proposed_by: provenance.created_by,
        proposed_at: provenance.completed_at,
      },
      authority: { zone: "quarantine", review_state: "machine_checked" },
      created_by: provenance.created_by,
      created_at: provenance.completed_at,
    };
    const assertion: PetraAssertion = {
      schema_name: "petra.assertion",
      schema_version: "1.0.0",
      assertion_id: assertionId,
      revision: 1,
      subject_id: sourceBundle.document.work_version_id,
      predicate: "ASSERTS",
      object: { object_kind: "entity", entity_id: claimId },
      assertion_kind: "source_stated",
      authority: { zone: "quarantine", review_state: "machine_checked" },
      provenance_refs: [
        {
          provenance_kind: "source_span",
          source_span_id: firstSourceSpanId,
        },
        ...remainingSourceSpanIds.map((sourceSpanId) => ({
          provenance_kind: "source_span" as const,
          source_span_id: sourceSpanId,
        })),
        {
          provenance_kind: "record",
          record_id: provenance.model_call_id,
          role: "model_call",
        },
      ],
      scope: structuredClone(modelCandidate.scope),
      rationale:
        "The model proposed this source-stated relation from the cited passage; admission and scientific review remain independent decisions.",
      recorded_at: provenance.completed_at,
      created_by: provenance.created_by,
    };
    return {
      candidate_id: candidateId,
      proposal_role: modelCandidate.proposal_role,
      source_quote: {
        exact_text: modelCandidate.source_quote.exact_text,
        selected_text_hash: textHash(modelCandidate.source_quote.exact_text),
        source_span_ids: [firstSourceSpanId, ...remainingSourceSpanIds] as [
          string,
          ...string[],
        ],
      },
      claim,
      assertion,
      warnings: modelCandidate.warnings.map((warning) => ({
        code: warning.code,
        severity: warning.severity,
        message: warning.message,
        candidate_id: candidateId,
      })),
    };
  }) as unknown as PetraEvidenceProposalBundle["content"]["candidates"];
  const diagnostics: PetraEvidenceProposalBundle["content"]["diagnostics"] =
    output.diagnostics.map((diagnostic) => {
      const candidateId =
        diagnostic.candidate_key === undefined
          ? undefined
          : candidateIds.get(diagnostic.candidate_key);
      return {
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.message,
        ...(candidateId === undefined ? {} : { candidate_id: candidateId }),
      };
    });
  const content: PetraEvidenceProposalBundle["content"] = {
    project_id: provenance.project_id,
    source: {
      document_parse_bundle_id: sourceBundle.document_parse_bundle_id,
      parsed_document_id: sourceBundle.document.parsed_document_id,
      source_artifact_id: sourceBundle.document.source_artifact_id,
      source_artifact_content_hash:
        sourceBundle.document.source_artifact_content_hash,
      work_version_id: sourceBundle.document.work_version_id,
      source_scope: sourceBundle.source_scope,
    },
    extraction: {
      extraction_kind: "model_extraction",
      extraction_run_id: extractionRunId,
      extractor: {
        name: provenance.role_profile.name,
        version: provenance.role_profile.version,
      },
      recipe_hash: recipeHash,
      model_request_id: provenance.model_request_id,
      model_call_id: provenance.model_call_id,
      model_deployment: provenance.model_deployment,
      prompt_profile: {
        name: provenance.prompt_profile.name,
        version: provenance.prompt_profile.version,
      },
      prompt_hash: provenance.prompt_profile.content_hash,
      parameters_hash: provenance.parameters_hash,
      context_packet_ref: provenance.context_packet_ref,
      started_at: provenance.started_at,
      completed_at: provenance.completed_at,
    },
    candidates,
    diagnostics,
  };
  return {
    schema_name: "petra.evidence-proposal-bundle",
    schema_version: "1.0.0",
    evidence_proposal_bundle_id: derivePetraId(
      "evidence_proposal_bundle",
      `${extractionRunId}|${canonicalHash(candidates)}`,
    ),
    revision: 1,
    content,
    content_hash: canonicalHash(content),
    created_by: provenance.created_by,
    created_at: provenance.completed_at,
  };
};
