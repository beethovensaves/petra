import type {
  PetraProjectImportCommandReceipt,
  PetraProjectImportCommandRecoveryView,
  PetraProjectImportCommandRequest,
} from "@petra/contracts";

export type ProjectImportErrorCode =
  | "PROJECT_IMPORT_COMMAND_CONFLICT"
  | "PROJECT_IMPORT_COMMAND_DENIED"
  | "PROJECT_IMPORT_SOURCE_NOT_FOUND"
  | "PROJECT_IMPORT_SOURCE_STALE"
  | "PROJECT_IMPORT_SOURCE_INCOMPATIBLE"
  | "PROJECT_IMPORT_RUNTIME_CORRUPT";

export class ProjectImportError extends Error {
  readonly code: ProjectImportErrorCode;

  constructor(code: ProjectImportErrorCode, message: string) {
    super(message);
    this.name = "ProjectImportError";
    this.code = code;
  }
}

/**
 * Authenticated authority for the bounded retained-Project reuse operation.
 * Implementations re-read exact source authority and resolve the human actor
 * server-side; the request cannot transfer source authority or credentials.
 */
export interface ProjectImportCommandAuthority {
  executeProjectImportCommand(
    request: PetraProjectImportCommandRequest,
  ): Promise<PetraProjectImportCommandReceipt>;
}

/** Read-only reconciliation of one exact idempotent import request. */
export interface ProjectImportCommandRecoveryReader {
  assessProjectImportCommandRecovery(
    request: PetraProjectImportCommandRequest,
  ): Promise<PetraProjectImportCommandRecoveryView>;
}

/** Read owner for the immutable ancestry receipt of a derived Project. */
export interface ProjectImportAncestryReader {
  getProjectImportAncestry(
    projectId: string,
  ): Promise<PetraProjectImportCommandReceipt | undefined>;
}
