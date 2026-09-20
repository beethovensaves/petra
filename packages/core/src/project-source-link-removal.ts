import type {
  PetraProjectSource,
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLinkRemovalReceipt,
  PetraProjectSourceLinkRemovalRecoveryView,
  PetraProjectSourceLinkRemovalRequest,
} from "@petra/contracts";

export type ProjectSourceLinkRemovalErrorCode =
  | "PROJECT_SOURCE_LINK_REMOVAL_COMMAND_CONFLICT"
  | "PROJECT_SOURCE_LINK_REMOVAL_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_LINK_REMOVAL_PROJECT_NOT_FOUND"
  | "PROJECT_SOURCE_LINK_REMOVAL_PROJECT_STALE"
  | "PROJECT_SOURCE_LINK_REMOVAL_DEFINITION_STALE"
  | "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_NOT_FOUND"
  | "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_STALE"
  | "PROJECT_SOURCE_LINK_REMOVAL_STORED_RECORD_CORRUPT";

export class ProjectSourceLinkRemovalError extends Error {
  constructor(
    readonly code: ProjectSourceLinkRemovalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceLinkRemovalError";
  }
}

export interface ProjectSourceLinkRemovalPrincipal {
  readonly actor: PetraProjectSourceLinkRemovalReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectSourceLinkRemovalResult {
  readonly receipt: PetraProjectSourceLinkRemovalReceipt;
  readonly projectSource: PetraProjectSource;
  /** False only when the exact retained command was replayed. */
  readonly applied: boolean;
}

/**
 * Authenticated command composition for the accepted ExcludeProjectSource
 * identity. Project-link removal never authorizes physical copy deletion.
 */
export interface ProjectSourceLinkRemovalAuthority {
  executeProjectSourceLinkRemoval(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLinkRemovalRequest,
    principal: ProjectSourceLinkRemovalPrincipal,
  ): Promise<ProjectSourceLinkRemovalResult>;
  assessProjectSourceLinkRemovalRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLinkRemovalRequest,
    principal: ProjectSourceLinkRemovalPrincipal,
  ): Promise<PetraProjectSourceLinkRemovalRecoveryView>;
}

/** Server-owned exact preview; authentication and grant resolution occur first. */
export interface ProjectSourceLinkRemovalPreviewReader {
  getProjectSourceLinkRemovalPreview(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceLinkRemovalPreview | undefined>;
}
