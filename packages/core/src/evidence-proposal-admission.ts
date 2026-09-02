import { createHash } from "node:crypto";

import type {
  PetraDocumentParseBundle,
  PetraEvidenceProposalBundle,
  PetraSourceSpan,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import { evidenceRecipeHasSameSources } from "./deterministic-evidence-extraction.js";
import type { InMemoryEvidenceRegistry } from "./evidence-registry.js";

export type EvidenceBundleAdmissionErrorCode =
  | "BUNDLE_CONTENT_HASH_MISMATCH"
  | "BUNDLE_SOURCE_IDENTITY_MISMATCH"
  | "DUPLICATE_CANDIDATE_ID"
  | "DUPLICATE_CLAIM_ID"
  | "DUPLICATE_ASSERTION_ID";

export type EvidenceCandidateAdmissionErrorCode =
  | "CLAIM_SOURCE_BASIS_REQUIRED"
  | "CLAIM_SOURCE_IDENTITY_MISMATCH"
  | "ASSERTS_ENDPOINT_MISMATCH"
  | "SOURCE_REFERENCE_MISMATCH"
  | "SOURCE_QUOTE_HASH_MISMATCH"
  | "SOURCE_SPAN_NOT_IN_BUNDLE"
  | "SOURCE_SPAN_IDENTITY_MISMATCH"
  | "SOURCE_SPAN_UNRESOLVED"
  | "SOURCE_BLOCK_NOT_IN_BUNDLE"
  | "SOURCE_BLOCK_REFERENCE_MISMATCH"
  | "SOURCE_PAGE_NOT_IN_BUNDLE"
  | "SOURCE_PAGE_FAILED"
  | "SOURCE_QUOTE_NOT_IN_BLOCK";

export class EvidenceBundleAdmissionError extends Error {
  readonly code: EvidenceBundleAdmissionErrorCode;

  constructor(code: EvidenceBundleAdmissionErrorCode, message: string) {
    super(message);
    this.name = "EvidenceBundleAdmissionError";
    this.code = code;
  }
}

class EvidenceCandidateAdmissionError extends Error {
  readonly code: EvidenceCandidateAdmissionErrorCode;

  constructor(code: EvidenceCandidateAdmissionErrorCode, message: string) {
    super(message);
    this.name = "EvidenceCandidateAdmissionError";
    this.code = code;
  }
}

export type EvidenceCandidateAdmissionResult =
  | {
      readonly outcome: "admitted";
      readonly candidate_id: string;
      readonly claim_id: string;
      readonly assertion_id: string;
    }
  | {
      readonly outcome: "rejected";
      readonly candidate_id: string;
      readonly claim_id: string;
      readonly assertion_id: string;
      readonly error_code: string;
      readonly message: string;
    };

export interface EvidenceBundleAdmissionResult {
  readonly evidence_proposal_bundle_id: string;
  readonly admitted_count: number;
  readonly rejected_count: number;
  readonly candidates: readonly EvidenceCandidateAdmissionResult[];
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const textHash = (value: string): string =>
  `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;

const sameUniqueMembers = (
  left: readonly string[],
  right: readonly string[],
): boolean => {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return (
    leftSet.size === left.length &&
    rightSet.size === right.length &&
    leftSet.size === rightSet.size &&
    [...leftSet].every((value) => rightSet.has(value))
  );
};

const pageNumbers = (span: PetraSourceSpan): readonly number[] => {
  if (span.selector.selector_type === "page_region") {
    return [span.selector.page_region.page_number];
  }
  if (span.selector.selector_type !== "compound") return [];
  return span.selector.components.flatMap((component) =>
    component.component_kind === "page_region"
      ? [component.page_region.page_number]
      : [],
  );
};

const assertUniqueIds = (
  bundle: PetraEvidenceProposalBundle,
  select: (
    candidate: PetraEvidenceProposalBundle["content"]["candidates"][number],
  ) => string,
  code: EvidenceBundleAdmissionErrorCode,
): void => {
  const values = bundle.content.candidates.map(select);
  if (new Set(values).size !== values.length) {
    throw new EvidenceBundleAdmissionError(
      code,
      `Evidence proposal bundle ${bundle.evidence_proposal_bundle_id} repeats an immutable identity.`,
    );
  }
};

const validateBundleEnvelope = (
  bundle: PetraEvidenceProposalBundle,
  sourceBundle: PetraDocumentParseBundle,
): void => {
  if (canonicalHash(bundle.content) !== bundle.content_hash) {
    throw new EvidenceBundleAdmissionError(
      "BUNDLE_CONTENT_HASH_MISMATCH",
      "The evidence proposal content does not match its declared content hash.",
    );
  }
  const source = bundle.content.source;
  const document = sourceBundle.document;
  if (
    source.document_parse_bundle_id !== sourceBundle.document_parse_bundle_id ||
    source.parsed_document_id !== document.parsed_document_id ||
    source.source_artifact_id !== document.source_artifact_id ||
    source.source_artifact_content_hash !==
      document.source_artifact_content_hash ||
    source.work_version_id !== document.work_version_id ||
    source.source_scope !== sourceBundle.source_scope
  ) {
    throw new EvidenceBundleAdmissionError(
      "BUNDLE_SOURCE_IDENTITY_MISMATCH",
      "The evidence proposal does not identify the supplied immutable parse bundle exactly.",
    );
  }
  assertUniqueIds(
    bundle,
    (candidate) => candidate.candidate_id,
    "DUPLICATE_CANDIDATE_ID",
  );
  assertUniqueIds(
    bundle,
    (candidate) => candidate.claim.claim_id,
    "DUPLICATE_CLAIM_ID",
  );
  assertUniqueIds(
    bundle,
    (candidate) => candidate.assertion.assertion_id,
    "DUPLICATE_ASSERTION_ID",
  );
};

const validateCandidate = (
  candidate: PetraEvidenceProposalBundle["content"]["candidates"][number],
  sourceBundle: PetraDocumentParseBundle,
): void => {
  const basis = candidate.claim.basis;
  if (basis.basis_kind !== "source") {
    throw new EvidenceCandidateAdmissionError(
      "CLAIM_SOURCE_BASIS_REQUIRED",
      "An extracted Claim must have a source basis.",
    );
  }
  if (
    basis.work_version_id !== sourceBundle.document.work_version_id ||
    basis.source_scope !== sourceBundle.source_scope
  ) {
    throw new EvidenceCandidateAdmissionError(
      "CLAIM_SOURCE_IDENTITY_MISMATCH",
      "The Claim basis does not match the supplied source document.",
    );
  }
  if (
    candidate.assertion.predicate !== "ASSERTS" ||
    candidate.assertion.subject_id !== sourceBundle.document.work_version_id ||
    candidate.assertion.object.object_kind !== "entity" ||
    candidate.assertion.object.entity_id !== candidate.claim.claim_id
  ) {
    throw new EvidenceCandidateAdmissionError(
      "ASSERTS_ENDPOINT_MISMATCH",
      "The candidate Assertion must connect the source WorkVersion to its paired Claim.",
    );
  }
  if (!evidenceRecipeHasSameSources(candidate)) {
    throw new EvidenceCandidateAdmissionError(
      "SOURCE_REFERENCE_MISMATCH",
      "The quote, Claim basis, and Assertion do not cite the same unique SourceSpans.",
    );
  }
  if (
    !sameUniqueMembers(
      basis.source_span_ids,
      candidate.source_quote.source_span_ids,
    )
  ) {
    throw new EvidenceCandidateAdmissionError(
      "SOURCE_REFERENCE_MISMATCH",
      "The candidate repeats a SourceSpan or cites inconsistent sources.",
    );
  }
  if (
    textHash(candidate.source_quote.exact_text) !==
    candidate.source_quote.selected_text_hash
  ) {
    throw new EvidenceCandidateAdmissionError(
      "SOURCE_QUOTE_HASH_MISMATCH",
      "The exact source quote does not match its declared text hash.",
    );
  }

  const referencedBlockTexts: string[] = [];
  for (const sourceSpanId of candidate.source_quote.source_span_ids) {
    const span = sourceBundle.spans.find(
      (value) => value.source_span_id === sourceSpanId,
    );
    if (span === undefined) {
      throw new EvidenceCandidateAdmissionError(
        "SOURCE_SPAN_NOT_IN_BUNDLE",
        `SourceSpan ${sourceSpanId} is not present in the immutable parse bundle.`,
      );
    }
    if (
      span.parsed_document_id !== sourceBundle.document.parsed_document_id ||
      span.parser_run_id !== sourceBundle.document.parser_run_id ||
      span.artifact_id !== sourceBundle.document.source_artifact_id ||
      span.artifact_content_hash !==
        sourceBundle.document.source_artifact_content_hash
    ) {
      throw new EvidenceCandidateAdmissionError(
        "SOURCE_SPAN_IDENTITY_MISMATCH",
        `SourceSpan ${sourceSpanId} does not belong to the supplied source bytes and parser run.`,
      );
    }
    if (span.verification.status === "unresolved") {
      throw new EvidenceCandidateAdmissionError(
        "SOURCE_SPAN_UNRESOLVED",
        `SourceSpan ${sourceSpanId} is unresolved.`,
      );
    }
    const block = sourceBundle.blocks.find(
      (value) => value.structural_block_id === span.structural_block_id,
    );
    if (block === undefined) {
      throw new EvidenceCandidateAdmissionError(
        "SOURCE_BLOCK_NOT_IN_BUNDLE",
        `SourceSpan ${sourceSpanId} points to a missing StructuralBlock.`,
      );
    }
    if (
      block.parsed_document_id !== sourceBundle.document.parsed_document_id ||
      !block.source_span_ids.includes(sourceSpanId)
    ) {
      throw new EvidenceCandidateAdmissionError(
        "SOURCE_BLOCK_REFERENCE_MISMATCH",
        `StructuralBlock ${block.structural_block_id} does not reciprocally declare SourceSpan ${sourceSpanId}.`,
      );
    }
    if (block.content.content_kind !== "text") {
      throw new EvidenceCandidateAdmissionError(
        "SOURCE_QUOTE_NOT_IN_BLOCK",
        `StructuralBlock ${block.structural_block_id} does not contain text evidence.`,
      );
    }
    referencedBlockTexts.push(block.content.text);
    for (const pageNumber of pageNumbers(span)) {
      const page = sourceBundle.document.pages.find(
        (value) => value.page_number === pageNumber,
      );
      if (page === undefined) {
        throw new EvidenceCandidateAdmissionError(
          "SOURCE_PAGE_NOT_IN_BUNDLE",
          `SourceSpan ${sourceSpanId} points to undeclared page ${pageNumber}.`,
        );
      }
      if (page.parse_state === "failed") {
        throw new EvidenceCandidateAdmissionError(
          "SOURCE_PAGE_FAILED",
          `SourceSpan ${sourceSpanId} points to failed page ${pageNumber}.`,
        );
      }
    }
  }
  const joinedWithSpaces = referencedBlockTexts.join(" ");
  const joinedWithNewlines = referencedBlockTexts.join("\n");
  if (
    !referencedBlockTexts.some((text) =>
      text.includes(candidate.source_quote.exact_text),
    ) &&
    !joinedWithSpaces.includes(candidate.source_quote.exact_text) &&
    !joinedWithNewlines.includes(candidate.source_quote.exact_text)
  ) {
    throw new EvidenceCandidateAdmissionError(
      "SOURCE_QUOTE_NOT_IN_BLOCK",
      "The exact quote is not present in the text of the referenced StructuralBlocks.",
    );
  }
};

const rejectionFrom = (
  candidate: PetraEvidenceProposalBundle["content"]["candidates"][number],
  error: unknown,
): EvidenceCandidateAdmissionResult => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !== "string" ||
    !("message" in error) ||
    typeof error.message !== "string"
  ) {
    throw error;
  }
  return Object.freeze({
    outcome: "rejected",
    candidate_id: candidate.candidate_id,
    claim_id: candidate.claim.claim_id,
    assertion_id: candidate.assertion.assertion_id,
    error_code: error.code,
    message: error.message,
  });
};

export const admitEvidenceProposalBundle = (
  bundle: PetraEvidenceProposalBundle,
  sourceBundle: PetraDocumentParseBundle,
  registry: Pick<InMemoryEvidenceRegistry, "proposeEvidencePair">,
): EvidenceBundleAdmissionResult => {
  validateBundleEnvelope(bundle, sourceBundle);
  const candidates = bundle.content.candidates.map((candidate) => {
    try {
      validateCandidate(candidate, sourceBundle);
      registry.proposeEvidencePair({
        claim: candidate.claim,
        assertion: candidate.assertion,
      });
      return Object.freeze({
        outcome: "admitted" as const,
        candidate_id: candidate.candidate_id,
        claim_id: candidate.claim.claim_id,
        assertion_id: candidate.assertion.assertion_id,
      });
    } catch (error) {
      return rejectionFrom(candidate, error);
    }
  });
  const admittedCount = candidates.filter(
    (candidate) => candidate.outcome === "admitted",
  ).length;
  return Object.freeze({
    evidence_proposal_bundle_id: bundle.evidence_proposal_bundle_id,
    admitted_count: admittedCount,
    rejected_count: candidates.length - admittedCount,
    candidates: Object.freeze(candidates),
  });
};
