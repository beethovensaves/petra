import type {
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionReceipt,
  PetraProjectSourceLocalCopyDeletionRecoveryView,
  PetraProjectSourceLocalCopyDeletionRequest,
} from "@petra/contracts";

export type ProjectSourceLocalCopyDeletionErrorCode =
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_COMMAND_CONFLICT"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_ELIGIBLE"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_PROJECT_NOT_FOUND"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_PROJECT_STALE"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_DEFINITION_STALE"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_SOURCE_NOT_FOUND"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_SOURCE_STALE"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_COPY_STALE"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_OUTCOME_UNKNOWN"
  | "PROJECT_SOURCE_LOCAL_COPY_DELETION_STORED_RECORD_CORRUPT";

export class ProjectSourceLocalCopyDeletionError extends Error {
  constructor(
    readonly code: ProjectSourceLocalCopyDeletionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceLocalCopyDeletionError";
  }
}

export interface ProjectSourceLocalCopyDeletionPrincipal {
  readonly actor: PetraProjectSourceLocalCopyDeletionReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectSourceLocalCopyDeletionResult {
  readonly receipt: PetraProjectSourceLocalCopyDeletionReceipt;
  /** False only when the immutable receipt was replayed. */
  readonly applied: boolean;
}

export interface ProjectSourceLocalCopyDeletionAuthority {
  executeProjectSourceLocalCopyDeletion(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
    principal: ProjectSourceLocalCopyDeletionPrincipal,
  ): Promise<ProjectSourceLocalCopyDeletionResult>;
  assessProjectSourceLocalCopyDeletionRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
    principal: ProjectSourceLocalCopyDeletionPrincipal,
  ): Promise<PetraProjectSourceLocalCopyDeletionRecoveryView>;
}

export interface ProjectSourceLocalCopyDeletionPreviewReader {
  getProjectSourceLocalCopyDeletionPreview(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceLocalCopyDeletionPreview | undefined>;
}
