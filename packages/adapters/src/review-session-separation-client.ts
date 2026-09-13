import type {
  PetraReviewSessionSeparationReceipt,
  PetraReviewSessionV110,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const COMMAND_ID = /^command_[0-9A-HJKMNP-TV-Z]{26}$/u;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,511}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;

export interface ReviewSessionSeparationRequest {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly expected_review_session_ref: {
    readonly review_session_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly lifecycle: "open";
  };
  readonly review_member_id: string;
}

export interface ReviewSessionSeparationResult {
  readonly receipt: PetraReviewSessionSeparationReceipt;
  readonly source_review_session: PetraReviewSessionV110;
  readonly separated_review_session: PetraReviewSessionV110;
  readonly applied: boolean;
}

export class ReviewSessionSeparationClientError extends Error {
  readonly status: number;
  readonly response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "ReviewSessionSeparationClientError";
    this.status = status;
    this.response = response;
  }
}

export interface ReviewSessionSeparationClientOptions {
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
  request: ReviewSessionSeparationRequest,
): void => {
  const expected = request.expected_review_session_ref;
  if (
    !hasExactKeys(request as unknown as Record<string, unknown>, [
      "command_id",
      "idempotency_key",
      "expected_review_session_ref",
      "review_member_id",
    ]) ||
    !PROJECT_ID.test(projectId) ||
    !COMMAND_ID.test(request.command_id) ||
    !IDEMPOTENCY_KEY.test(request.idempotency_key) ||
    !REVIEW_SESSION_ID.test(expected.review_session_id) ||
    !validRevision(expected.revision) ||
    !CONTENT_HASH.test(expected.content_hash) ||
    expected.lifecycle !== "open" ||
    !REVIEW_MEMBER_ID.test(request.review_member_id)
  ) {
    throw new TypeError(
      "ReviewSession separation requires one exact open ReviewSession, one exact member, and canonical command identities.",
    );
  }
};

const sessionContext = (session: PetraReviewSessionV110): string => {
  const content = structuredClone(session.content) as unknown as Record<
    string,
    unknown
  >;
  delete content.members;
  return canonicalize(content);
};

export class ReviewSessionSeparationClient {
  readonly #options: ReviewSessionSeparationClientOptions;
  readonly #contracts: PetraContractRegistry;

  constructor(options: ReviewSessionSeparationClientOptions) {
    this.#options = options;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async separate(
    projectId: string,
    request: ReviewSessionSeparationRequest,
  ): Promise<ReviewSessionSeparationResult> {
    assertRequest(projectId, request);
    const endpoint = new URL(
      `/api/commands/projects/${encodeURIComponent(projectId)}/reviews/${encodeURIComponent(request.expected_review_session_ref.review_session_id)}/separation`,
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
      throw new ReviewSessionSeparationClientError(
        "Petra rejected the ReviewSession separation command.",
        response.status,
        body,
      );
    }
    if (
      !isRecord(body) ||
      !hasExactKeys(body, [
        "receipt",
        "source_review_session",
        "separated_review_session",
        "applied",
      ]) ||
      typeof body.applied !== "boolean"
    ) {
      throw new ReviewSessionSeparationClientError(
        "Petra returned an invalid ReviewSession separation result.",
        response.status,
        body,
      );
    }
    this.#contracts.assertValid(
      "review-session-separation-receipt",
      "1.0.0",
      body.receipt,
    );
    this.#contracts.assertValid(
      "review-session",
      "1.1.0",
      body.source_review_session,
    );
    this.#contracts.assertValid(
      "review-session",
      "1.1.0",
      body.separated_review_session,
    );
    const result = body as unknown as ReviewSessionSeparationResult;
    const receipt = result.receipt.content;
    const sourceRef = receipt.source_resulting_review_session_ref;
    const separatedRef = receipt.separated_review_session_ref;
    const sourceMemberIds = result.source_review_session.content.members.map(
      (member) => member.review_member_id,
    );
    const separatedMember = result.separated_review_session.content.members[0];
    if (
      result.receipt.project_id !== projectId ||
      receipt.command_ref.command_id !== request.command_id ||
      receipt.command_ref.idempotency_key !== request.idempotency_key ||
      receipt.command_ref.command_name !== "SeparateReviewSessionMember" ||
      receipt.source_prior_review_session_ref.review_session_id !==
        request.expected_review_session_ref.review_session_id ||
      receipt.source_prior_review_session_ref.revision !==
        request.expected_review_session_ref.revision ||
      receipt.source_prior_review_session_ref.content_hash !==
        request.expected_review_session_ref.content_hash ||
      receipt.partition.separated_review_member_id !==
        request.review_member_id ||
      receipt.partition.semantic_unit !== "exact_review_member_unchanged" ||
      receipt.partition.atomicity !==
        "existing_change_sets_retained_without_cross_partition_unit" ||
      result.source_review_session.project_id !== projectId ||
      result.source_review_session.review_session_id !==
        sourceRef.review_session_id ||
      result.source_review_session.revision !== sourceRef.revision ||
      result.source_review_session.content_hash !== sourceRef.content_hash ||
      result.source_review_session.content.lifecycle !== "open" ||
      canonicalize(sourceMemberIds) !==
        canonicalize(receipt.partition.retained_review_member_ids) ||
      result.separated_review_session.project_id !== projectId ||
      result.separated_review_session.review_session_id !==
        separatedRef.review_session_id ||
      result.separated_review_session.revision !== separatedRef.revision ||
      result.separated_review_session.content_hash !==
        separatedRef.content_hash ||
      result.separated_review_session.content.lifecycle !== "open" ||
      result.separated_review_session.content.members.length !== 1 ||
      separatedMember === undefined ||
      separatedMember.review_member_id !== request.review_member_id ||
      sessionContext(result.source_review_session) !==
        sessionContext(result.separated_review_session)
    ) {
      throw new ReviewSessionSeparationClientError(
        "Petra returned a mismatched ReviewSession separation result.",
        response.status,
        body,
      );
    }
    return result;
  }
}
