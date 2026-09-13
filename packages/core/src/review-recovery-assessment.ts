import type { PetraReviewRecoveryAssessment } from "@petra/contracts";

export interface ReviewRecoveryAssessmentRequest {
  readonly project_id: string;
  readonly review_session_id: string;
  readonly expected_revision: number;
  readonly expected_content_hash: string;
}

export class ReviewRecoveryAssessmentError extends Error {
  constructor(
    readonly code:
      | "REVIEW_RECOVERY_STALE"
      | "REVIEW_RECOVERY_UNSUPPORTED"
      | "REVIEW_RECOVERY_INCOMPLETE"
      | "REVIEW_RECOVERY_CORRUPT",
    message: string,
  ) {
    super(message);
    this.name = "ReviewRecoveryAssessmentError";
  }
}

/** Authenticated query only. Implementations compose one read-only snapshot. */
export interface ReviewRecoveryAssessmentReader {
  getReviewRecoveryAssessment(
    request: ReviewRecoveryAssessmentRequest,
  ): Promise<PetraReviewRecoveryAssessment | undefined>;
}
