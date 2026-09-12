import type {
  PetraProjectReviewViewRecord,
  PetraReviewSessionRecord,
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
