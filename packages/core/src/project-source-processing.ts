import type {
  PetraProjectSourceProcessingReceipt,
  PetraProjectSourceProcessingRecoveryView,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceProcessingView,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";

export type ProjectSourceProcessingErrorCode =
  | "PROJECT_SOURCE_PROCESSING_COMMAND_CONFLICT"
  | "PROJECT_SOURCE_PROCESSING_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_PROCESSING_PROJECT_NOT_FOUND"
  | "PROJECT_SOURCE_PROCESSING_PROJECT_STALE"
  | "PROJECT_SOURCE_PROCESSING_DEFINITION_STALE"
  | "PROJECT_SOURCE_PROCESSING_SOURCE_NOT_FOUND"
  | "PROJECT_SOURCE_PROCESSING_SOURCE_STALE"
  | "PROJECT_SOURCE_PROCESSING_SOURCE_UNAVAILABLE"
  | "PROJECT_SOURCE_PROCESSING_ROLE_UNREGISTERED"
  | "PROJECT_SOURCE_PROCESSING_COPY_UNAVAILABLE"
  | "PROJECT_SOURCE_PROCESSING_PARSE_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_PROCESSING_ALREADY_EXISTS"
  | "PROJECT_SOURCE_PROCESSING_STORED_RECORD_CORRUPT";

export class ProjectSourceProcessingError extends Error {
  constructor(
    readonly code: ProjectSourceProcessingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceProcessingError";
  }
}

export interface ProjectSourceProcessingPrincipal {
  readonly actor: PetraProjectSourceProcessingReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectSourceProcessingResult {
  readonly receipt: PetraProjectSourceProcessingReceipt;
  readonly workUnit: PetraWorkUnit;
  readonly inputManifest: PetraWorkerInputManifest;
  readonly processing: PetraProjectSourceProcessingView;
  /** False only when the exact completed command receipt was replayed. */
  readonly applied: boolean;
}

/**
 * ProjectSource-scoped authority for one bounded parser Work family. The
 * request carries reviewed exact refs; worker identity, limits, Work IDs, and
 * time remain server-owned.
 */
export interface ProjectSourceProcessingAuthority {
  executeProjectSourceProcessing(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
    principal: ProjectSourceProcessingPrincipal,
  ): Promise<ProjectSourceProcessingResult>;
  assessProjectSourceProcessingRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
    principal: ProjectSourceProcessingPrincipal,
  ): Promise<PetraProjectSourceProcessingRecoveryView>;
}

/** Exact source Details composition; it never creates or starts Work. */
export interface ProjectSourceProcessingViewReader {
  getProjectSourceProcessingView(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceProcessingView | undefined>;
}
