import type {
  PetraProjectSource,
  PetraProjectSourceRegistrationReceipt,
  PetraProjectSourceRegistrationRecoveryView,
  PetraProjectSourceRegistrationRequest,
} from "@petra/contracts";

export type ProjectSourceRegistrationErrorCode =
  | "PROJECT_SOURCE_REGISTRATION_COMMAND_CONFLICT"
  | "PROJECT_SOURCE_REGISTRATION_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_REGISTRATION_PROJECT_NOT_FOUND"
  | "PROJECT_SOURCE_REGISTRATION_PROJECT_STALE"
  | "PROJECT_SOURCE_REGISTRATION_DEFINITION_STALE"
  | "PROJECT_SOURCE_REGISTRATION_ROLE_UNREGISTERED"
  | "PROJECT_SOURCE_REGISTRATION_RIGHTS_INVALID"
  | "PROJECT_SOURCE_REGISTRATION_MATERIAL_INVALID"
  | "PROJECT_SOURCE_REGISTRATION_IDENTITY_CONFLICT"
  | "PROJECT_SOURCE_REGISTRATION_STORED_RECORD_CORRUPT";

export class ProjectSourceRegistrationError extends Error {
  constructor(
    readonly code: ProjectSourceRegistrationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceRegistrationError";
  }
}

export interface ProjectSourceRegistrationPrincipal {
  readonly actor: PetraProjectSourceRegistrationReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectSourceRegistrationReadPrincipal {
  readonly actor: PetraProjectSourceRegistrationReceipt["actor"];
}

export interface ProjectSourceRegistrationResult {
  readonly receipt: PetraProjectSourceRegistrationReceipt;
  readonly projectSource: PetraProjectSource;
  /** False only when the exact idempotent registration receipt was replayed. */
  readonly applied: boolean;
}

/**
 * Authenticated owner for a new source identity, exact bytes, copy-specific
 * rights decision, and Project membership. Reuse of an existing global source
 * identity is intentionally a separate command boundary.
 */
export interface ProjectSourceRegistrationAuthority {
  readProjectSourceRegistrationReceipt(
    projectId: string,
    projectSourceId: string,
    principal: ProjectSourceRegistrationReadPrincipal,
  ): Promise<PetraProjectSourceRegistrationReceipt | undefined>;
  executeProjectSourceRegistration(
    projectId: string,
    request: PetraProjectSourceRegistrationRequest,
    principal: ProjectSourceRegistrationPrincipal,
  ): Promise<ProjectSourceRegistrationResult>;
  assessProjectSourceRegistrationRecovery(
    projectId: string,
    request: PetraProjectSourceRegistrationRequest,
    principal: ProjectSourceRegistrationPrincipal,
  ): Promise<PetraProjectSourceRegistrationRecoveryView>;
}
