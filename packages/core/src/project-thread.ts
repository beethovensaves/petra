import type {
  PetraProjectThread,
  PetraProjectThreadView,
} from "@petra/contracts";

export type ProjectThreadLifecycleFilter = "open" | "archived";

export interface ProjectThreadCollectionRequest {
  readonly limit?: number;
  readonly cursor?: string;
  readonly lifecycle?: ProjectThreadLifecycleFilter;
}

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

/** Authorized, snapshot-consistent Project thread collection and detail reads. */
export interface ProjectThreadViewReader {
  listProjectThreadView(
    projectId: string,
    request?: ProjectThreadCollectionRequest,
  ): Promise<PetraProjectThreadView | undefined>;
  getProjectThreadView(
    projectId: string,
    projectThreadId: string,
  ): Promise<PetraProjectThreadView | undefined>;
}
