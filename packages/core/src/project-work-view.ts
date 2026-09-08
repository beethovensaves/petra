import type { PetraProjectWorkView } from "@petra/contracts";

export type ProjectWorkStateFilter =
  | "requested"
  | "queued"
  | "running"
  | "checkpointed"
  | "completed"
  | "cancelled";

export interface ProjectWorkCollectionRequest {
  readonly limit?: number;
  readonly cursor?: string;
  readonly state?: ProjectWorkStateFilter;
}

/** Authorized, snapshot-consistent Project Work collection and detail reads. */
export interface ProjectWorkViewReader {
  listProjectWorkView(
    projectId: string,
    request?: ProjectWorkCollectionRequest,
  ): Promise<PetraProjectWorkView | undefined>;
  getProjectWorkView(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkView | undefined>;
}
