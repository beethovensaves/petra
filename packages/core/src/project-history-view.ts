import type {
  PetraProjectHistoryEpisodeView,
  PetraProjectHistoryRetainedView,
  PetraProjectHistoryView,
} from "@petra/contracts";

export interface ProjectHistoryRetainedCollectionRequest {
  readonly limit?: number;
  readonly cursor?: string;
}

export class ProjectHistoryViewRequestError extends Error {
  readonly code = "PROJECT_HISTORY_VIEW_REQUEST_INVALID" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProjectHistoryViewRequestError";
  }
}

/**
 * Authorized Project History composition. Implementations read existing
 * immutable command/event authority and current recovery authority; they do
 * not persist a parallel history ledger.
 */
export interface ProjectHistoryViewReader {
  getRecentProjectHistoryView(
    projectId: string,
  ): Promise<PetraProjectHistoryView | undefined>;
  getProjectHistoryEpisodeView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryEpisodeView | undefined>;
  listRetainedProjectHistoryView(
    projectId: string,
    request?: ProjectHistoryRetainedCollectionRequest,
  ): Promise<PetraProjectHistoryRetainedView | undefined>;
}
