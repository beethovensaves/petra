import type {
  PetraProjectSource,
  PetraProjectSourceReuseReceipt,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
} from "@petra/contracts";

export type ProjectSourceReuseErrorCode =
  | "PROJECT_SOURCE_REUSE_COMMAND_CONFLICT"
  | "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_REUSE_PROJECT_NOT_FOUND"
  | "PROJECT_SOURCE_REUSE_PROJECT_STALE"
  | "PROJECT_SOURCE_REUSE_DEFINITION_STALE"
  | "PROJECT_SOURCE_REUSE_ROLE_UNREGISTERED"
  | "PROJECT_SOURCE_REUSE_SOURCE_NOT_FOUND"
  | "PROJECT_SOURCE_REUSE_SOURCE_STALE"
  | "PROJECT_SOURCE_REUSE_COPY_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_REUSE_MEMBERSHIP_DUPLICATE"
  | "PROJECT_SOURCE_REUSE_IDENTITY_CROSSED"
  | "PROJECT_SOURCE_REUSE_STORED_RECORD_CORRUPT";

export class ProjectSourceReuseError extends Error {
  constructor(
    readonly code: ProjectSourceReuseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceReuseError";
  }
}

export interface ProjectSourceReusePrincipal {
  readonly actor: PetraProjectSourceReuseReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectSourceReuseResult {
  readonly receipt: PetraProjectSourceReuseReceipt;
  readonly projectSource: PetraProjectSource;
  /** False only when the exact idempotent reuse receipt was replayed. */
  readonly applied: boolean;
}

/**
 * Authenticated owner for linking an exact retained scholarly identity and
 * permitted copy into one current ProjectDefinition source role. The request
 * carries no Actor, grant, new ProjectSource identity, storage, or timestamps.
 */
export interface ProjectSourceReuseAuthority {
  executeProjectSourceReuse(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
    principal: ProjectSourceReusePrincipal,
  ): Promise<ProjectSourceReuseResult>;
  assessProjectSourceReuseRecovery(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
    principal: ProjectSourceReusePrincipal,
  ): Promise<PetraProjectSourceReuseRecoveryView>;
}
