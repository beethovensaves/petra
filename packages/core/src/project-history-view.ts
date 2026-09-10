import type {
  PetraProjectHistoryEpisodeView,
  PetraProjectHistoryView,
} from "@petra/contracts";

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
}
