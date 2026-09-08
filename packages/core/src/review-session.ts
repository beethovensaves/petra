import type {
  PetraProjectReviewView,
  PetraReviewSession,
} from "@petra/contracts";

/**
 * Durable, profile-neutral Review context. Domain meaning remains in the
 * exact ProjectDefinition registrations named by each candidate binding.
 */
export interface ReviewSessionAuthorityRepository {
  registerReviewSessionRevision(
    session: PetraReviewSession,
  ): Promise<PetraReviewSession>;
  getReviewSession(
    projectId: string,
    reviewSessionId: string,
    revision?: number,
  ): Promise<PetraReviewSession | undefined>;
  listReviewSessions(projectId: string): Promise<PetraReviewSession[]>;
}

/** Snapshot-consistent, authorized Review collection and detail reads. */
export interface ProjectReviewViewReader {
  listProjectReviewViews(projectId: string): Promise<PetraProjectReviewView[]>;
  getProjectReviewView(
    projectId: string,
    reviewSessionId: string,
  ): Promise<PetraProjectReviewView | undefined>;
}
