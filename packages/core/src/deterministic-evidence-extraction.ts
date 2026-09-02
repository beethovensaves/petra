import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraAssertion,
  PetraClaim,
  PetraDocumentParseBundle,
  PetraEvidenceProposalBundle,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import { derivePetraId } from "./identity.js";

export type DeterministicExtractionErrorCode =
  | "EXTRACTION_RECIPE_EMPTY"
  | "SOURCE_TARGET_NOT_UNIQUE"
  | "SOURCE_TARGET_SPAN_MISSING";

export class DeterministicExtractionError extends Error {
  readonly code: DeterministicExtractionErrorCode;

  constructor(code: DeterministicExtractionErrorCode, message: string) {
    super(message);
    this.name = "DeterministicExtractionError";
    this.code = code;
  }
}

export type DeterministicSourceSelection =
  | {
      readonly selection_kind: "exact_text";
      readonly exact_text: string;
      readonly page_number: number;
    }
  | {
      readonly selection_kind: "explicit_span";
      readonly exact_text: string;
      readonly source_span_ids: readonly [string, ...string[]];
    };

export interface DeterministicClaimCandidateRecipe {
  readonly candidate_key: string;
  readonly proposal_role: PetraEvidenceProposalBundle["content"]["candidates"][number]["proposal_role"];
  readonly source: DeterministicSourceSelection;
  readonly canonical_text: string;
  readonly claim_kind: PetraClaim["claim_kind"];
  readonly scope: PetraClaim["scope"];
  readonly detail_level: "broad" | "detailed";
  readonly source_stance:
    "states" | "hypothesizes" | "reports" | "qualifies" | "rejects";
  readonly attribution: string;
  readonly modality: "asserted" | "hedged" | "conditional" | "speculative";
  readonly negated: boolean;
}

export interface DeterministicEvidenceRecipe {
  readonly recipe_name: string;
  readonly recipe_version: string;
  readonly project_id: string;
  readonly created_by: ActorRef;
  readonly created_at: string;
  readonly candidates: readonly [
    DeterministicClaimCandidateRecipe,
    ...DeterministicClaimCandidateRecipe[],
  ];
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const sameMembers = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length && left.every((value) => right.includes(value));

const resolveSource = (
  bundle: PetraDocumentParseBundle,
  selection: DeterministicSourceSelection,
): {
  exactText: string;
  sourceSpanIds: [string, ...string[]];
  verified: boolean;
} => {
  if (selection.selection_kind === "explicit_span") {
    return {
      exactText: selection.exact_text,
      sourceSpanIds: [...selection.source_span_ids],
      verified: false,
    };
  }
  const matches = bundle.blocks.filter(
    (block) =>
      block.content.content_kind === "text" &&
      block.content.text.includes(selection.exact_text) &&
      block.page_locations.some(
        (location) => location.page_number === selection.page_number,
      ),
  );
  if (matches.length !== 1) {
    throw new DeterministicExtractionError(
      "SOURCE_TARGET_NOT_UNIQUE",
      `Source target on page ${selection.page_number} resolved ${matches.length} times.`,
    );
  }
  const block = matches[0];
  if (block === undefined || block.source_span_ids.length === 0) {
    throw new DeterministicExtractionError(
      "SOURCE_TARGET_SPAN_MISSING",
      "The selected source block does not declare a SourceSpan.",
    );
  }
  const sourceSpanIds = [...block.source_span_ids] as [string, ...string[]];
  if (
    sourceSpanIds.some(
      (spanId) =>
        !bundle.spans.some(
          (span) =>
            span.source_span_id === spanId &&
            span.structural_block_id === block.structural_block_id,
        ),
    )
  ) {
    throw new DeterministicExtractionError(
      "SOURCE_TARGET_SPAN_MISSING",
      "The selected block's SourceSpan is absent from the parse bundle.",
    );
  }
  return {
    exactText: selection.exact_text,
    sourceSpanIds,
    verified: true,
  };
};

export const buildDeterministicEvidenceProposalBundle = (
  sourceBundle: PetraDocumentParseBundle,
  recipe: DeterministicEvidenceRecipe,
): PetraEvidenceProposalBundle => {
  if (recipe.candidates.length === 0) {
    throw new DeterministicExtractionError(
      "EXTRACTION_RECIPE_EMPTY",
      "A deterministic extraction recipe needs at least one candidate.",
    );
  }
  const recipeIdentity = {
    recipe_name: recipe.recipe_name,
    recipe_version: recipe.recipe_version,
    project_id: recipe.project_id,
    candidates: recipe.candidates,
  };
  const recipeHash = canonicalHash(recipeIdentity);
  const extractionRunId = derivePetraId(
    "extraction_run",
    `${sourceBundle.document_parse_bundle_id}|${recipeHash}`,
  );
  const candidates = recipe.candidates.map((candidateRecipe) => {
    const source = resolveSource(sourceBundle, candidateRecipe.source);
    const identity = `${extractionRunId}|${candidateRecipe.candidate_key}`;
    const candidateId = derivePetraId("evidence_candidate", identity);
    const claimId = derivePetraId("claim", identity);
    const assertionId = derivePetraId("assertion", identity);
    const [firstSourceSpanId, ...remainingSourceSpanIds] = source.sourceSpanIds;
    const claim: PetraClaim = {
      schema_name: "petra.claim",
      schema_version: "1.0.0",
      claim_id: claimId,
      revision: 1,
      canonical_text: candidateRecipe.canonical_text,
      claim_kind: candidateRecipe.claim_kind,
      normalization_status: "normalized",
      scope: structuredClone(candidateRecipe.scope),
      basis: {
        basis_kind: "source",
        work_version_id: sourceBundle.document.work_version_id,
        source_scope: sourceBundle.source_scope,
        detail_level: candidateRecipe.detail_level,
        source_span_ids: source.sourceSpanIds,
        source_stance: candidateRecipe.source_stance,
        attribution: candidateRecipe.attribution,
        modality: candidateRecipe.modality,
        negated: candidateRecipe.negated,
        derivation: {
          derivation_kind: "deterministic_mapping",
          derivation_ref: extractionRunId,
        },
        validator_results: source.verified
          ? [
              {
                validator_name: "source-span-resolution",
                validator_version: "1.0.0",
                outcome: "pass",
                code: "SPAN_RESOLVED",
              },
              {
                validator_name: "exact-quote-selection",
                validator_version: "1.0.0",
                outcome: "pass",
                code: "QUOTE_RESOLVED",
              },
            ]
          : [
              {
                validator_name: "source-span-resolution",
                validator_version: "1.0.0",
                outcome: "warning",
                code: "SPAN_UNVERIFIED",
                message:
                  "The explicit source reference requires admission-time resolution.",
              },
            ],
        proposed_by: recipe.created_by,
        proposed_at: recipe.created_at,
      },
      authority: { zone: "quarantine", review_state: "machine_checked" },
      created_by: recipe.created_by,
      created_at: recipe.created_at,
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
          provenance_kind: "source_span" as const,
          source_span_id: firstSourceSpanId,
        },
        ...remainingSourceSpanIds.map((sourceSpanId) => ({
          provenance_kind: "source_span" as const,
          source_span_id: sourceSpanId,
        })),
        {
          provenance_kind: "record",
          record_id: extractionRunId,
          role: "derivation",
        },
      ],
      scope: structuredClone(candidateRecipe.scope),
      rationale:
        "The WorkVersion is proposed as asserting this source-grounded Claim; acceptance remains a separate review decision.",
      recorded_at: recipe.created_at,
      created_by: recipe.created_by,
    };
    return {
      candidate_id: candidateId,
      proposal_role: candidateRecipe.proposal_role,
      source_quote: {
        exact_text: source.exactText,
        selected_text_hash: textHash(source.exactText),
        source_span_ids: source.sourceSpanIds,
      },
      claim,
      assertion,
      warnings: source.verified
        ? []
        : [
            {
              code: "EXPLICIT_SPAN_UNVERIFIED",
              severity: "warning" as const,
              message:
                "This candidate uses an explicit span reference that admission must independently resolve.",
              candidate_id: candidateId,
            },
          ],
    };
  }) as unknown as PetraEvidenceProposalBundle["content"]["candidates"];
  const content: PetraEvidenceProposalBundle["content"] = {
    project_id: recipe.project_id,
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
      extraction_kind: "deterministic_mapping",
      extraction_run_id: extractionRunId,
      extractor: {
        name: recipe.recipe_name,
        version: recipe.recipe_version,
      },
      recipe_hash: recipeHash,
      started_at: recipe.created_at,
      completed_at: recipe.created_at,
    },
    candidates,
    diagnostics: [],
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
    created_by: recipe.created_by,
    created_at: recipe.created_at,
  };
};

export const evidenceRecipeHasSameSources = (
  candidate: PetraEvidenceProposalBundle["content"]["candidates"][number],
): boolean => {
  const basis = candidate.claim.basis;
  if (basis.basis_kind !== "source") return false;
  const assertionSpans = candidate.assertion.provenance_refs.flatMap((value) =>
    value.provenance_kind === "source_span" ? [value.source_span_id] : [],
  );
  return (
    sameMembers(
      basis.source_span_ids,
      candidate.source_quote.source_span_ids,
    ) && sameMembers(assertionSpans, candidate.source_quote.source_span_ids)
  );
};
