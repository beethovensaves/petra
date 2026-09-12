import type {
  PetraReviewSessionRefreshReceipt,
  PetraReviewSessionV110,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const COMMAND_ID = /^command_[0-9A-HJKMNP-TV-Z]{26}$/u;
const IDEMPOTENCY_KEY = /^[\x21-\x7e]{1,512}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;

export interface ReviewSessionRefreshRequest {
  readonly command_id: string;
  readonly idempotency_key: string;
  readonly expected_review_session_ref: {
    readonly review_session_id: string;
    readonly revision: number;
    readonly content_hash: string;
    readonly lifecycle: "open";
  };
}

export interface ReviewSessionRefreshResult {
  readonly receipt: PetraReviewSessionRefreshReceipt;
  readonly review_session: PetraReviewSessionV110;
  readonly applied: boolean;
}

export class ReviewSessionRefreshClientError extends Error {
  readonly status: number;
  readonly response: unknown;

  constructor(message: string, status: number, response: unknown) {
    super(message);
    this.name = "ReviewSessionRefreshClientError";
    this.status = status;
    this.response = response;
  }
}

export interface ReviewSessionRefreshClientOptions {
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

const assertRequest = (
  projectId: string,
  request: ReviewSessionRefreshRequest,
): void => {
  const ref = request.expected_review_session_ref;
  if (
    !PROJECT_ID.test(projectId) ||
    !COMMAND_ID.test(request.command_id) ||
    !IDEMPOTENCY_KEY.test(request.idempotency_key) ||
    !REVIEW_SESSION_ID.test(ref.review_session_id) ||
    !Number.isSafeInteger(ref.revision) ||
    ref.revision < 1 ||
    !CONTENT_HASH.test(ref.content_hash) ||
    ref.lifecycle !== "open"
  ) {
    throw new TypeError(
      "Review refresh requires canonical Project, command, idempotency, and exact open ReviewSession identities.",
    );
  }
};

export class ReviewSessionRefreshClient {
  readonly #options: ReviewSessionRefreshClientOptions;
  readonly #contracts: PetraContractRegistry;

  constructor(options: ReviewSessionRefreshClientOptions) {
    this.#options = options;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async refresh(
    projectId: string,
    request: ReviewSessionRefreshRequest,
  ): Promise<ReviewSessionRefreshResult> {
    assertRequest(projectId, request);
    const endpoint = new URL(
      `/api/commands/projects/${encodeURIComponent(projectId)}/reviews/${encodeURIComponent(request.expected_review_session_ref.review_session_id)}/refresh`,
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
      throw new ReviewSessionRefreshClientError(
        "Petra rejected the ReviewSession refresh command.",
        response.status,
        body,
      );
    }
    if (
      !isRecord(body) ||
      !hasExactKeys(body, ["receipt", "review_session", "applied"]) ||
      typeof body.applied !== "boolean"
    ) {
      throw new ReviewSessionRefreshClientError(
        "Petra returned an invalid ReviewSession refresh result.",
        response.status,
        body,
      );
    }
    this.#contracts.assertValid(
      "review-session-refresh-receipt",
      "1.0.0",
      body.receipt,
    );
    this.#contracts.assertValid("review-session", "1.1.0", body.review_session);
    const result = body as unknown as ReviewSessionRefreshResult;
    const receipt = result.receipt.content;
    const review = result.review_session;
    const expected = request.expected_review_session_ref;
    const resulting = receipt.resulting_review_session_ref;
    if (
      result.receipt.project_id !== projectId ||
      receipt.command_ref.command_id !== request.command_id ||
      receipt.command_ref.idempotency_key !== request.idempotency_key ||
      receipt.command_ref.command_name !== "RefreshReviewSession" ||
      receipt.prior_review_session_ref.review_session_id !==
        expected.review_session_id ||
      receipt.prior_review_session_ref.revision !== expected.revision ||
      receipt.prior_review_session_ref.content_hash !== expected.content_hash ||
      receipt.prior_review_session_ref.lifecycle !== "open" ||
      review.project_id !== projectId ||
      review.review_session_id !== expected.review_session_id ||
      review.revision !== resulting.revision ||
      review.content_hash !== resulting.content_hash ||
      review.content.lifecycle !== "open" ||
      receipt.refresh_basis.resulting_snapshot.event_position !==
        review.content.snapshot.event_position ||
      receipt.refresh_basis.resulting_snapshot.stream_revision !==
        review.content.snapshot.stream_revision ||
      receipt.refresh_basis.resulting_snapshot.captured_at !==
        review.content.snapshot.captured_at ||
      receipt.refresh_basis.members.length !== review.content.members.length ||
      receipt.refresh_basis.members.some((member, index) => {
        const reviewMember = review.content.members[index];
        return (
          reviewMember === undefined ||
          member.review_member_id !== reviewMember.review_member_id ||
          canonicalize(member.candidate_ref) !==
            canonicalize(reviewMember.working_state.candidate_ref) ||
          canonicalize(member.relationship_refs) !==
            canonicalize(reviewMember.working_state.relationship_refs)
        );
      })
    ) {
      throw new ReviewSessionRefreshClientError(
        "Petra returned a mismatched ReviewSession refresh result.",
        response.status,
        body,
      );
    }
    return structuredClone(result);
  }
}
