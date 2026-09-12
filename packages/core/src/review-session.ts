import type {
  DeferReviewSession,
  PetraCommandEnvelopeV140,
  PetraProjectReviewViewRecord,
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRecord,
  ReopenReviewSession,
} from "@petra/contracts";

/**
 * Durable, profile-neutral Review context. Domain meaning remains in the
 * exact ProjectDefinition registrations named by each candidate binding.
 */
export interface ReviewSessionAuthorityRepository {
  registerReviewSessionRevision(
    session: PetraReviewSessionRecord,
  ): Promise<PetraReviewSessionRecord>;
  getReviewSession(
    projectId: string,
    reviewSessionId: string,
    revision?: number,
  ): Promise<PetraReviewSessionRecord | undefined>;
  listReviewSessions(projectId: string): Promise<PetraReviewSessionRecord[]>;
}

/** Snapshot-consistent, authorized Review collection and detail reads. */
export interface ProjectReviewViewReader {
  listProjectReviewViews(
    projectId: string,
  ): Promise<PetraProjectReviewViewRecord[]>;
  getProjectReviewView(
    projectId: string,
    reviewSessionId: string,
  ): Promise<PetraProjectReviewViewRecord | undefined>;
}

export type ReviewSessionLifecycleAction = "defer" | "reopen";

export type ReviewSessionLifecycleCommandEnvelope = Omit<
  PetraCommandEnvelopeV140,
  "command"
> & {
  command: DeferReviewSession | ReopenReviewSession;
};

export interface ReviewSessionLifecycleCommandResult {
  readonly receipt: PetraReviewSessionLifecycleReceipt;
  readonly reviewSession: PetraReviewSessionRecord;
  /** False only when the exact command was replayed idempotently. */
  readonly applied: boolean;
}

export type ReviewSessionLifecycleAuthorityErrorCode =
  | "REVIEW_SESSION_LIFECYCLE_COMMAND_NOT_AUTHORIZED"
  | "REVIEW_SESSION_LIFECYCLE_COMMAND_ID_REUSED"
  | "REVIEW_SESSION_LIFECYCLE_IDEMPOTENCY_KEY_REUSED"
  | "REVIEW_SESSION_LIFECYCLE_PROJECT_MISMATCH"
  | "REVIEW_SESSION_LIFECYCLE_SESSION_NOT_FOUND"
  | "REVIEW_SESSION_LIFECYCLE_STALE_SESSION"
  | "REVIEW_SESSION_LIFECYCLE_TRANSITION_INVALID"
  | "REVIEW_SESSION_LIFECYCLE_STORED_RECORD_CORRUPT";

export class ReviewSessionLifecycleAuthorityError extends Error {
  readonly code: ReviewSessionLifecycleAuthorityErrorCode;

  constructor(code: ReviewSessionLifecycleAuthorityErrorCode, message: string) {
    super(message);
    this.name = "ReviewSessionLifecycleAuthorityError";
    this.code = code;
  }
}

/**
 * Governs ReviewSession deferral and reopen only. The operation appends a
 * ReviewSession revision and immutable receipt without creating an Approval,
 * ChangeSet, Project domain event, or projection instruction.
 */
export interface ReviewSessionLifecycleAuthorityRepository {
  executeReviewSessionLifecycleCommand(
    envelope: ReviewSessionLifecycleCommandEnvelope,
  ): Promise<ReviewSessionLifecycleCommandResult>;
  getReviewSessionLifecycleReceipt(
    commandId: string,
  ): Promise<PetraReviewSessionLifecycleReceipt | undefined>;
}
