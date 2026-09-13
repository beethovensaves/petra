import type {
  HumanScientificSourceBasisRevision,
  PetraClaim,
  PetraReviewCandidateBasisRevisionReceipt,
  PetraReviewSessionV110,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  ReviewCandidateBasisRevisionProjectDefinitionRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_CANDIDATE_ID = /^working_candidate_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_RELATIONSHIP_ID =
  /^working_relationship_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CLAIM_ID = /^claim_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;
const SOURCE_SPAN_ID = /^source_span_[0-9A-HJKMNP-TV-Z]{26}$/u;
const COMMAND_ID = /^command_[0-9A-HJKMNP-TV-Z]{26}$/u;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,511}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;

export interface ReviewCandidateBasisRevisionRequest {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly expected_review_session_ref: {
    readonly review_session_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly lifecycle: "open";
  };
  readonly review_member_id: string;
  readonly expected_project_definition_ref: ReviewCandidateBasisRevisionProjectDefinitionRef;
  readonly expected_working_candidate_ref: {
    readonly working_candidate_id: string;
    readonly revision: number;
    readonly content_hash: string;
  };
  readonly expected_working_relationship_ref: {
    readonly working_relationship_id: string;
    readonly revision: number;
    readonly content_hash: string;
  };
  readonly expected_claim_ref: {
    readonly schema_name: "petra.claim";
    readonly schema_version: "1.0.0";
    readonly record_id: string;
    readonly revision: number;
    readonly record_hash: string;
  };
  readonly basis_revision_input: HumanScientificSourceBasisRevision;
}

export interface ReviewCandidateBasisRevisionResult {
  readonly receipt: PetraReviewCandidateBasisRevisionReceipt;
  readonly candidate: PetraWorkingCandidate;
  readonly profile_record: PetraClaim;
  readonly relationship: PetraWorkingRelationship;
  readonly review_session: PetraReviewSessionV110;
  readonly applied: boolean;
}

export class ReviewCandidateBasisRevisionClientError extends Error {
  readonly status: number;
  readonly response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "ReviewCandidateBasisRevisionClientError";
    this.status = status;
    this.response = response;
  }
}

export interface ReviewCandidateBasisRevisionClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly traceId?: string;
  readonly contracts?: PetraContractRegistry;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasExactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index])
  );
};

const validRevision = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 1;

const assertRequest = (
  projectId: string,
  request: ReviewCandidateBasisRevisionRequest,
): void => {
  const session = request.expected_review_session_ref;
  const definition = request.expected_project_definition_ref;
  const candidate = request.expected_working_candidate_ref;
  const relationship = request.expected_working_relationship_ref;
  const claim = request.expected_claim_ref;
  const input = request.basis_revision_input;
  const source = input.project_source_ref;
  const inputKeys = [
    "input_kind",
    "project_source_ref",
    "source_span_refs",
    "source_scope",
    "detail_level",
    "source_stance",
    "attribution",
    "modality",
    "negated",
    "reason",
    ...(input.uncertainty === undefined ? [] : ["uncertainty"]),
  ];
  const spansValid =
    input.source_span_refs.length >= 1 &&
    new Set(input.source_span_refs.map((ref) => ref.record_id)).size ===
      input.source_span_refs.length &&
    input.source_span_refs.every(
      (ref) =>
        ref.schema_name === "petra.source-span" &&
        ref.schema_version === "1.0.0" &&
        SOURCE_SPAN_ID.test(ref.record_id) &&
        ref.revision === 1 &&
        CONTENT_HASH.test(ref.record_hash),
    );
  if (
    !hasExactKeys(request as unknown as Record<string, unknown>, [
      "command_id",
      "idempotency_key",
      "expected_review_session_ref",
      "review_member_id",
      "expected_project_definition_ref",
      "expected_working_candidate_ref",
      "expected_working_relationship_ref",
      "expected_claim_ref",
      "basis_revision_input",
    ]) ||
    !hasExactKeys(input as unknown as Record<string, unknown>, inputKeys) ||
    !PROJECT_ID.test(projectId) ||
    !COMMAND_ID.test(request.command_id) ||
    !IDEMPOTENCY_KEY.test(request.idempotency_key) ||
    !REVIEW_SESSION_ID.test(session.review_session_id) ||
    !validRevision(session.revision) ||
    !CONTENT_HASH.test(session.content_hash) ||
    session.lifecycle !== "open" ||
    !REVIEW_MEMBER_ID.test(request.review_member_id) ||
    !validRevision(definition.revision) ||
    !CONTENT_HASH.test(definition.content_hash) ||
    definition.definition_family !== "petra.scientific-evidence" ||
    !WORKING_CANDIDATE_ID.test(candidate.working_candidate_id) ||
    !validRevision(candidate.revision) ||
    !CONTENT_HASH.test(candidate.content_hash) ||
    !WORKING_RELATIONSHIP_ID.test(relationship.working_relationship_id) ||
    !validRevision(relationship.revision) ||
    !CONTENT_HASH.test(relationship.content_hash) ||
    claim.schema_name !== "petra.claim" ||
    claim.schema_version !== "1.0.0" ||
    !CLAIM_ID.test(claim.record_id) ||
    !validRevision(claim.revision) ||
    !CONTENT_HASH.test(claim.record_hash) ||
    input.input_kind !== "human_scientific_source_basis_revision" ||
    !PROJECT_SOURCE_ID.test(source.project_source_id) ||
    !validRevision(source.revision) ||
    !CONTENT_HASH.test(source.content_hash) ||
    !CONTENT_HASH.test(source.record_hash) ||
    source.status !== "active" ||
    !spansValid ||
    input.attribution.trim().length === 0 ||
    input.reason.trim().length === 0 ||
    (input.uncertainty !== undefined && input.uncertainty.trim().length === 0)
  ) {
    throw new TypeError(
      "Review candidate basis revision requires one exact open scientific Review member, ProjectDefinition, Claim, active ProjectSource, unique SourceSpans, and non-empty source semantics.",
    );
  }
};

export class ReviewCandidateBasisRevisionClient {
  readonly #options: ReviewCandidateBasisRevisionClientOptions;
  readonly #contracts: PetraContractRegistry;

  constructor(options: ReviewCandidateBasisRevisionClientOptions) {
    this.#options = options;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async revise(
    projectId: string,
    request: ReviewCandidateBasisRevisionRequest,
  ): Promise<ReviewCandidateBasisRevisionResult> {
    assertRequest(projectId, request);
    const endpoint = new URL(
      `/api/commands/projects/${encodeURIComponent(projectId)}/reviews/${encodeURIComponent(request.expected_review_session_ref.review_session_id)}/candidate-basis-revision`,
      this.#options.baseUrl,
    );
    const response = await (this.#options.fetch ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#options.token}`,
        "content-type": "application/json",
        ...(this.#options.traceId === undefined
          ? {}
          : { "x-petra-trace-id": this.#options.traceId }),
      },
      body: JSON.stringify(request),
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new ReviewCandidateBasisRevisionClientError(
        "Petra rejected the Review candidate basis-revision command.",
        response.status,
        body,
      );
    }
    if (
      !isRecord(body) ||
      !hasExactKeys(body, [
        "receipt",
        "candidate",
        "profile_record",
        "relationship",
        "review_session",
        "applied",
      ]) ||
      typeof body.applied !== "boolean"
    ) {
      throw new ReviewCandidateBasisRevisionClientError(
        "Petra returned an invalid Review candidate basis-revision result.",
        response.status,
        body,
      );
    }
    this.#contracts.assertValid(
      "review-candidate-basis-revision-receipt",
      "1.0.0",
      body.receipt,
    );
    this.#contracts.assertValid("working-candidate", "1.0.0", body.candidate);
    this.#contracts.assertValid("claim", "1.0.0", body.profile_record);
    this.#contracts.assertValid(
      "working-relationship",
      "1.0.0",
      body.relationship,
    );
    this.#contracts.assertValid("review-session", "1.1.0", body.review_session);
    const result = body as unknown as ReviewCandidateBasisRevisionResult;
    const receipt = result.receipt.content;
    const candidateRef = receipt.resulting_candidate_ref;
    const profileRef = receipt.resulting_profile_record_ref;
    const relationshipRef = receipt.resulting_relationship_ref;
    const reviewRef = receipt.resulting_review_session_ref;
    const member = result.review_session.content.members[0];
    if (
      result.receipt.project_id !== projectId ||
      receipt.command_ref.command_id !== request.command_id ||
      receipt.command_ref.idempotency_key !== request.idempotency_key ||
      receipt.command_ref.command_name !== "ReviseReviewCandidateBasis" ||
      receipt.review_member_id !== request.review_member_id ||
      canonicalize(receipt.project_definition_ref) !==
        canonicalize(request.expected_project_definition_ref) ||
      receipt.prior_review_session_ref.review_session_id !==
        request.expected_review_session_ref.review_session_id ||
      receipt.prior_review_session_ref.revision !==
        request.expected_review_session_ref.revision ||
      receipt.prior_review_session_ref.content_hash !==
        request.expected_review_session_ref.content_hash ||
      receipt.prior_candidate_ref.record_id !==
        request.expected_working_candidate_ref.working_candidate_id ||
      receipt.prior_candidate_ref.revision !==
        request.expected_working_candidate_ref.revision ||
      receipt.prior_candidate_ref.content_hash !==
        request.expected_working_candidate_ref.content_hash ||
      receipt.prior_relationship_ref.record_id !==
        request.expected_working_relationship_ref.working_relationship_id ||
      receipt.prior_relationship_ref.revision !==
        request.expected_working_relationship_ref.revision ||
      receipt.prior_relationship_ref.content_hash !==
        request.expected_working_relationship_ref.content_hash ||
      canonicalize(receipt.prior_profile_record_ref) !==
        canonicalize(request.expected_claim_ref) ||
      canonicalize(receipt.resulting_basis.project_source_ref) !==
        canonicalize(request.basis_revision_input.project_source_ref) ||
      canonicalize(receipt.resulting_basis.source_span_refs) !==
        canonicalize(request.basis_revision_input.source_span_refs) ||
      receipt.validation_reset.state !== "pending" ||
      receipt.validation_reset.completed_validator_refs.length !== 0 ||
      result.candidate.working_candidate_id !== candidateRef.record_id ||
      result.candidate.revision !== candidateRef.revision ||
      result.candidate.content_hash !== candidateRef.content_hash ||
      result.profile_record.claim_id !== profileRef.record_id ||
      result.profile_record.revision !== profileRef.revision ||
      result.candidate.profile_object.object_record_ref.record_hash !==
        profileRef.record_hash ||
      result.candidate.validation.state !== "pending" ||
      result.candidate.validation.target_record_hash !==
        profileRef.record_hash ||
      result.relationship.working_relationship_id !==
        relationshipRef.record_id ||
      result.relationship.revision !== relationshipRef.revision ||
      result.relationship.content_hash !== relationshipRef.content_hash ||
      result.review_session.project_id !== projectId ||
      result.review_session.review_session_id !== reviewRef.review_session_id ||
      result.review_session.revision !== reviewRef.revision ||
      result.review_session.content_hash !== reviewRef.content_hash ||
      result.review_session.content.lifecycle !== "open" ||
      result.review_session.content.members.length !== 1 ||
      member === undefined ||
      member.review_member_id !== request.review_member_id ||
      member.working_state.candidate_ref.working_candidate_id !==
        result.candidate.working_candidate_id ||
      member.working_state.candidate_ref.revision !==
        result.candidate.revision ||
      member.working_state.relationship_refs[0]?.working_relationship_id !==
        result.relationship.working_relationship_id ||
      member.working_state.relationship_refs[0]?.revision !==
        result.relationship.revision
    ) {
      throw new ReviewCandidateBasisRevisionClientError(
        "Petra returned a mismatched Review candidate basis-revision result.",
        response.status,
        body,
      );
    }
    return result;
  }
}
