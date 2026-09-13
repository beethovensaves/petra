import type {
  CorrectReviewCandidate,
  CorrectReviewCandidateFromHumanEdit,
  DeferReviewSession,
  PetraCommandEnvelopeV140,
  PetraCommandEnvelopeV150,
  PetraCommandEnvelopeV160,
  PetraCommandEnvelopeV170,
  PetraCommandEnvelopeV180,
  PetraReviewCandidateBasisRevisionReceipt,
  PetraReviewCandidateCorrectionReceipt,
  PetraProjectReviewViewRecord,
  PetraClaim,
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRefreshReceipt,
  PetraReviewSessionRecord,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  RefreshReviewSession,
  ReviseReviewCandidateBasis,
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

export type ReviewSessionRefreshCommandEnvelope = Omit<
  PetraCommandEnvelopeV150,
  "command"
> & {
  command: RefreshReviewSession;
};

export interface ReviewSessionRefreshCommandResult {
  readonly receipt: PetraReviewSessionRefreshReceipt;
  readonly reviewSession: PetraReviewSessionRecord;
  /** False only when the exact command was replayed idempotently. */
  readonly applied: boolean;
}

export type ReviewSessionRefreshAuthorityErrorCode =
  | "REVIEW_SESSION_REFRESH_COMMAND_NOT_AUTHORIZED"
  | "REVIEW_SESSION_REFRESH_COMMAND_ID_REUSED"
  | "REVIEW_SESSION_REFRESH_IDEMPOTENCY_KEY_REUSED"
  | "REVIEW_SESSION_REFRESH_PROJECT_MISMATCH"
  | "REVIEW_SESSION_REFRESH_SESSION_NOT_FOUND"
  | "REVIEW_SESSION_REFRESH_STALE_SESSION"
  | "REVIEW_SESSION_REFRESH_LIFECYCLE_INVALID"
  | "REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED"
  | "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION"
  | "REVIEW_SESSION_REFRESH_NOT_REQUIRED"
  | "REVIEW_SESSION_REFRESH_STORED_RECORD_CORRUPT";

export class ReviewSessionRefreshAuthorityError extends Error {
  readonly code: ReviewSessionRefreshAuthorityErrorCode;

  constructor(code: ReviewSessionRefreshAuthorityErrorCode, message: string) {
    super(message);
    this.name = "ReviewSessionRefreshAuthorityError";
    this.code = code;
  }
}

/**
 * Refreshes one exact open ReviewSession in place by appending a revision bound
 * to current authority and the current heads of its existing working members.
 * The operation reuses the canonical command ledger and creates no decision,
 * ChangeSet, Approval, domain event, outbox record, or projection instruction.
 */
export interface ReviewSessionRefreshAuthorityRepository {
  executeReviewSessionRefreshCommand(
    envelope: ReviewSessionRefreshCommandEnvelope,
  ): Promise<ReviewSessionRefreshCommandResult>;
}

export type ReviewCandidateCorrectionCommandEnvelope = Omit<
  PetraCommandEnvelopeV160,
  "command"
> & {
  command: CorrectReviewCandidate;
};

export type ReviewCandidateCorrectionFromHumanEditCommandEnvelope = Omit<
  PetraCommandEnvelopeV170,
  "command"
> & {
  command: CorrectReviewCandidateFromHumanEdit;
};

export type ReviewCandidateCorrectionAuthorityCommandEnvelope =
  | ReviewCandidateCorrectionCommandEnvelope
  | ReviewCandidateCorrectionFromHumanEditCommandEnvelope;

export interface ReviewCandidateCorrectionCommandResult {
  readonly receipt: PetraReviewCandidateCorrectionReceipt;
  readonly candidate: PetraWorkingCandidate;
  readonly profileRecord: PetraClaim;
  readonly relationship: PetraWorkingRelationship;
  readonly reviewSession: PetraReviewSessionRecord;
  /** False only when the exact command was replayed idempotently. */
  readonly applied: boolean;
}

export type ReviewCandidateCorrectionAuthorityErrorCode =
  | "REVIEW_CANDIDATE_CORRECTION_COMMAND_NOT_AUTHORIZED"
  | "REVIEW_CANDIDATE_CORRECTION_COMMAND_ID_REUSED"
  | "REVIEW_CANDIDATE_CORRECTION_IDEMPOTENCY_KEY_REUSED"
  | "REVIEW_CANDIDATE_CORRECTION_PROJECT_MISMATCH"
  | "REVIEW_CANDIDATE_CORRECTION_SESSION_NOT_FOUND"
  | "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE"
  | "REVIEW_CANDIDATE_CORRECTION_LIFECYCLE_INVALID"
  | "REVIEW_CANDIDATE_CORRECTION_MEMBER_MISMATCH"
  | "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED"
  | "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID"
  | "REVIEW_CANDIDATE_CORRECTION_BASIS_INCOMPATIBLE"
  | "REVIEW_CANDIDATE_CORRECTION_PROVENANCE_INVALID"
  | "REVIEW_CANDIDATE_CORRECTION_STORED_RECORD_CORRUPT";

export class ReviewCandidateCorrectionAuthorityError extends Error {
  readonly code: ReviewCandidateCorrectionAuthorityErrorCode;

  constructor(
    code: ReviewCandidateCorrectionAuthorityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReviewCandidateCorrectionAuthorityError";
    this.code = code;
  }
}

/**
 * Appends one correction to the existing WorkingCandidate, mechanically
 * rebinds its existing scientific working relationship, and advances the same
 * open single-member ReviewSession. It grants no Review or domain authority.
 */
export interface ReviewCandidateCorrectionAuthorityRepository {
  executeReviewCandidateCorrectionCommand(
    envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope,
  ): Promise<ReviewCandidateCorrectionCommandResult>;
}

export type ReviewCandidateBasisRevisionCommandEnvelope = Omit<
  PetraCommandEnvelopeV180,
  "command"
> & {
  command: ReviseReviewCandidateBasis;
};

export interface ReviewCandidateBasisRevisionCommandResult {
  readonly receipt: PetraReviewCandidateBasisRevisionReceipt;
  readonly candidate: PetraWorkingCandidate;
  readonly profileRecord: PetraClaim;
  readonly relationship: PetraWorkingRelationship;
  readonly reviewSession: PetraReviewSessionRecord;
  /** False only when the exact command was replayed idempotently. */
  readonly applied: boolean;
}

export type ReviewCandidateBasisRevisionAuthorityErrorCode =
  | "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_NOT_AUTHORIZED"
  | "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_ID_REUSED"
  | "REVIEW_CANDIDATE_BASIS_REVISION_IDEMPOTENCY_KEY_REUSED"
  | "REVIEW_CANDIDATE_BASIS_REVISION_PROJECT_MISMATCH"
  | "REVIEW_CANDIDATE_BASIS_REVISION_SESSION_NOT_FOUND"
  | "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE"
  | "REVIEW_CANDIDATE_BASIS_REVISION_LIFECYCLE_INVALID"
  | "REVIEW_CANDIDATE_BASIS_REVISION_MEMBER_MISMATCH"
  | "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED"
  | "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE"
  | "REVIEW_CANDIDATE_BASIS_REVISION_NO_MATERIAL_CHANGE"
  | "REVIEW_CANDIDATE_BASIS_REVISION_PROVENANCE_INVALID"
  | "REVIEW_CANDIDATE_BASIS_REVISION_STORED_RECORD_CORRUPT";

export class ReviewCandidateBasisRevisionAuthorityError extends Error {
  readonly code: ReviewCandidateBasisRevisionAuthorityErrorCode;

  constructor(
    code: ReviewCandidateBasisRevisionAuthorityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ReviewCandidateBasisRevisionAuthorityError";
    this.code = code;
  }
}

/**
 * Appends one material source-basis revision to an exact scientific Review
 * member. The operation retains all identities and prior revisions, resets
 * validation, and grants no Review decision or domain authority.
 */
export interface ReviewCandidateBasisRevisionAuthorityRepository {
  executeReviewCandidateBasisRevisionCommand(
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
  ): Promise<ReviewCandidateBasisRevisionCommandResult>;
}
