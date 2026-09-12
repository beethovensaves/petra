import type {
  PetraClaim,
  PetraReviewCandidateCorrectionReceipt,
  PetraReviewSessionV110,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_CANDIDATE_ID = /^working_candidate_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKING_RELATIONSHIP_ID =
  /^working_relationship_[0-9A-HJKMNP-TV-Z]{26}$/u;
const COMMAND_ID = /^command_[0-9A-HJKMNP-TV-Z]{26}$/u;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,511}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;

export interface ReviewCandidateCorrectionRequest {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly expected_review_session_ref: {
    readonly review_session_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly lifecycle: "open";
  };
  readonly review_member_id: string;
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
  readonly corrected_candidate: PetraWorkingCandidate;
  readonly corrected_profile_record: PetraClaim;
}

export interface ReviewCandidateCorrectionResult {
  readonly receipt: PetraReviewCandidateCorrectionReceipt;
  readonly candidate: PetraWorkingCandidate;
  readonly profile_record: PetraClaim;
  readonly relationship: PetraWorkingRelationship;
  readonly review_session: PetraReviewSessionV110;
  readonly applied: boolean;
}

export class ReviewCandidateCorrectionClientError extends Error {
  readonly status: number;
  readonly response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "ReviewCandidateCorrectionClientError";
    this.status = status;
    this.response = response;
  }
}

export interface ReviewCandidateCorrectionClientOptions {
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
  request: ReviewCandidateCorrectionRequest,
  contracts: PetraContractRegistry,
): void => {
  const session = request.expected_review_session_ref;
  const candidate = request.expected_working_candidate_ref;
  const relationship = request.expected_working_relationship_ref;
  if (
    !PROJECT_ID.test(projectId) ||
    !COMMAND_ID.test(request.command_id) ||
    !IDEMPOTENCY_KEY.test(request.idempotency_key) ||
    !REVIEW_SESSION_ID.test(session.review_session_id) ||
    !validRevision(session.revision) ||
    !CONTENT_HASH.test(session.content_hash) ||
    session.lifecycle !== "open" ||
    !REVIEW_MEMBER_ID.test(request.review_member_id) ||
    !WORKING_CANDIDATE_ID.test(candidate.working_candidate_id) ||
    !validRevision(candidate.revision) ||
    !CONTENT_HASH.test(candidate.content_hash) ||
    !WORKING_RELATIONSHIP_ID.test(relationship.working_relationship_id) ||
    !validRevision(relationship.revision) ||
    !CONTENT_HASH.test(relationship.content_hash)
  ) {
    throw new TypeError(
      "Review candidate correction requires canonical Project, command, Review, member, candidate, relationship, and idempotency identities.",
    );
  }
  contracts.assertValid(
    "working-candidate",
    "1.0.0",
    request.corrected_candidate,
  );
  contracts.assertValid("claim", "1.0.0", request.corrected_profile_record);
};

export class ReviewCandidateCorrectionClient {
  readonly #options: ReviewCandidateCorrectionClientOptions;
  readonly #contracts: PetraContractRegistry;

  constructor(options: ReviewCandidateCorrectionClientOptions) {
    this.#options = options;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async correct(
    projectId: string,
    request: ReviewCandidateCorrectionRequest,
  ): Promise<ReviewCandidateCorrectionResult> {
    assertRequest(projectId, request, this.#contracts);
    const endpoint = new URL(
      `/api/commands/projects/${encodeURIComponent(projectId)}/reviews/${encodeURIComponent(request.expected_review_session_ref.review_session_id)}/candidate-correction`,
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
      throw new ReviewCandidateCorrectionClientError(
        "Petra rejected the Review candidate-correction command.",
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
      throw new ReviewCandidateCorrectionClientError(
        "Petra returned an invalid Review candidate-correction result.",
        response.status,
        body,
      );
    }
    this.#contracts.assertValid(
      "review-candidate-correction-receipt",
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
    const result = body as unknown as ReviewCandidateCorrectionResult;
    const receipt = result.receipt.content;
    const candidateRef = receipt.resulting_candidate_ref;
    const relationshipRef = receipt.resulting_relationship_ref;
    const reviewRef = receipt.resulting_review_session_ref;
    const member = result.review_session.content.members[0];
    if (
      result.receipt.project_id !== projectId ||
      receipt.command_ref.command_id !== request.command_id ||
      receipt.command_ref.idempotency_key !== request.idempotency_key ||
      receipt.command_ref.command_name !== "CorrectReviewCandidate" ||
      receipt.review_member_id !== request.review_member_id ||
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
      canonicalize(result.candidate) !==
        canonicalize(request.corrected_candidate) ||
      canonicalize(result.profile_record) !==
        canonicalize(request.corrected_profile_record) ||
      result.candidate.working_candidate_id !== candidateRef.record_id ||
      result.candidate.revision !== candidateRef.revision ||
      result.candidate.content_hash !== candidateRef.content_hash ||
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
      member.working_state.candidate_ref.content_hash !==
        result.candidate.content_hash ||
      member.working_state.relationship_refs[0]?.working_relationship_id !==
        result.relationship.working_relationship_id ||
      member.working_state.relationship_refs[0]?.revision !==
        result.relationship.revision ||
      member.working_state.relationship_refs[0]?.content_hash !==
        result.relationship.content_hash
    ) {
      throw new ReviewCandidateCorrectionClientError(
        "Petra returned a mismatched Review candidate-correction result.",
        response.status,
        body,
      );
    }
    return structuredClone(result);
  }
}
