import type { PetraProjectWorkReadView } from "@petra/contracts";

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
  ): Promise<PetraProjectWorkReadView | undefined>;
  getProjectWorkView(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkReadView | undefined>;
}
