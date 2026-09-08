import type { PetraProjectThread } from "@petra/contracts";

/**
 * Durable Project-owned product history. A thread organizes exact authority
 * references; it does not replace the domain ledger, WorkUnit authority, or
 * protocol-level InteractionRun replay.
 */
export interface ProjectThreadAuthorityRepository {
  registerProjectThreadRevision(
    thread: PetraProjectThread,
  ): Promise<PetraProjectThread>;
  getProjectThread(
    projectId: string,
    projectThreadId: string,
    revision?: number,
  ): Promise<PetraProjectThread | undefined>;
  listProjectThreads(projectId: string): Promise<PetraProjectThread[]>;
}
