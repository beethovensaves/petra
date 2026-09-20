import type {
  PetraProjectWorkReadView,
  PetraWorkerOutputManifest,
} from "@petra/contracts";

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

export interface ProjectWorkerOutputManifestRequest {
  readonly revision: number;
  readonly content_hash: string;
  readonly record_hash: string;
}

/** Exact, Project-scoped read of a retained worker report; the manifest remains non-authoritative. */
export interface ProjectWorkerOutputManifestReader {
  getProjectWorkerOutputManifest(
    projectId: string,
    workerOutputManifestId: string,
    request: ProjectWorkerOutputManifestRequest,
  ): Promise<PetraWorkerOutputManifest | undefined>;
}
