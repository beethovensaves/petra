import type {
  PetraProjectSource,
  PetraProjectSourceRevisionReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
} from "@petra/contracts";

export type ProjectSourceRevisionErrorCode =
  | "PROJECT_SOURCE_REVISION_COMMAND_CONFLICT"
  | "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_REVISION_PROJECT_NOT_FOUND"
  | "PROJECT_SOURCE_REVISION_PROJECT_STALE"
  | "PROJECT_SOURCE_REVISION_DEFINITION_STALE"
  | "PROJECT_SOURCE_REVISION_SOURCE_NOT_FOUND"
  | "PROJECT_SOURCE_REVISION_SOURCE_STALE"
  | "PROJECT_SOURCE_REVISION_SOURCE_INELIGIBLE"
  | "PROJECT_SOURCE_REVISION_ROLE_UNREGISTERED"
  | "PROJECT_SOURCE_REVISION_RIGHTS_INVALID"
  | "PROJECT_SOURCE_REVISION_MATERIAL_INVALID"
  | "PROJECT_SOURCE_REVISION_IDENTITY_CONFLICT"
  | "PROJECT_SOURCE_REVISION_STORED_RECORD_CORRUPT";

export class ProjectSourceRevisionError extends Error {
  constructor(
    readonly code: ProjectSourceRevisionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceRevisionError";
  }
}

export interface ProjectSourceRevisionPrincipal {
  readonly actor: PetraProjectSourceRevisionReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectSourceRevisionResult {
  readonly receipt: PetraProjectSourceRevisionReceipt;
  readonly projectSource: PetraProjectSource;
  /** False only when the exact retained intake command was replayed. */
  readonly applied: boolean;
}

/**
 * Authenticated intake owner for a new immutable version of the Work bound by
 * one exact current ProjectSource. The result preserves both ProjectSource
 * identities and hands predecessor exclusion and supersession to their
 * existing governed command owners.
 */
export interface ProjectSourceRevisionAuthority {
  executeProjectSourceRevision(
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
    principal: ProjectSourceRevisionPrincipal,
  ): Promise<ProjectSourceRevisionResult>;
  assessProjectSourceRevisionRecovery(
    projectId: string,
    request: PetraProjectSourceRevisionRequest,
    principal: ProjectSourceRevisionPrincipal,
  ): Promise<PetraProjectSourceRevisionRecoveryView>;
}
