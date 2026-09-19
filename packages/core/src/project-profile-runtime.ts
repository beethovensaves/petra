import type {
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";

export type ProjectProfileRuntimeErrorCode =
  | "PROJECT_PROFILE_NOT_REGISTERED"
  | "PROJECT_PROFILE_VERSION_UNAVAILABLE"
  | "PROJECT_PROFILE_HASH_MISMATCH"
  | "PROJECT_PROFILE_COMMAND_CONFLICT"
  | "PROJECT_PROFILE_COMMAND_DENIED"
  | "PROJECT_PROFILE_RESET_STALE"
  | "PROJECT_PROFILE_PROJECT_NOT_FOUND"
  | "PROJECT_PROFILE_RUNTIME_CORRUPT";

export class ProjectProfileRuntimeError extends Error {
  readonly code: ProjectProfileRuntimeErrorCode;

  constructor(code: ProjectProfileRuntimeErrorCode, message: string) {
    super(message);
    this.name = "ProjectProfileRuntimeError";
    this.code = code;
  }
}

/**
 * Production read ownership for the optional profile registry and exact
 * ProjectDefinition-bound taxonomy. Unknown template bindings remain typed,
 * closed read results rather than client-selected fallbacks.
 */
export interface ProjectProfileRuntimeReader {
  listRegisteredProfiles(): Promise<PetraRegisteredProjectProfile[]>;
  getRegisteredProfile(
    profileId: string,
    profileVersion?: string,
  ): Promise<PetraRegisteredProjectProfile | undefined>;
  getProjectProfileTaxonomy(
    projectId: string,
    definitionRevision?: number,
  ): Promise<PetraProjectProfileTaxonomyView | undefined>;
}

/**
 * Authenticated local-product command owner. Implementations resolve the human
 * Actor from server configuration; requests never carry Actor or grant IDs.
 */
export interface ProjectProfileCommandAuthority {
  executeProjectProfileCommand(
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandReceipt>;
}

/**
 * Read-only recovery composition for one exact create/reset request. The
 * implementation may describe an idempotent retry through the existing command
 * owner, but this boundary never executes that retry itself.
 */
export interface ProjectProfileCommandRecoveryReader {
  assessProjectProfileCommandRecovery(
    request: PetraProjectProfileCommandRequest,
  ): Promise<PetraProjectProfileCommandRecoveryView>;
}
