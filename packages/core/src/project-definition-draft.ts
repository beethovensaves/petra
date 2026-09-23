import type {
  PetraProjectDefinitionDraftCommandReceipt,
  PetraProjectDefinitionDraftCommandRequest,
  PetraProjectDefinitionDraftRequest,
  PetraProjectDefinitionDraftView,
} from "@petra/contracts";

export type ProjectDefinitionDraftErrorCode =
  | "PROJECT_DEFINITION_DRAFT_INVALID"
  | "PROJECT_DEFINITION_DRAFT_EXAMPLE_UNAVAILABLE"
  | "PROJECT_DEFINITION_DRAFT_STALE"
  | "PROJECT_DEFINITION_DRAFT_ASSUMPTIONS_UNACCEPTED"
  | "PROJECT_DEFINITION_DRAFT_COMMAND_CONFLICT"
  | "PROJECT_DEFINITION_DRAFT_COMMAND_DENIED"
  | "PROJECT_DEFINITION_DRAFT_RUNTIME_CORRUPT";

export class ProjectDefinitionDraftError extends Error {
  readonly code: ProjectDefinitionDraftErrorCode;

  constructor(code: ProjectDefinitionDraftErrorCode, message: string) {
    super(message);
    this.name = "ProjectDefinitionDraftError";
    this.code = code;
  }
}

/** Server-owned use-agnostic definition proposal over registered capabilities. */
export interface ProjectDefinitionDraftReader {
  draftProjectDefinition(
    request: PetraProjectDefinitionDraftRequest,
  ): Promise<PetraProjectDefinitionDraftView>;
}

/** Atomic Project, definition, objective, focus, and receipt command owner. */
export interface ProjectDefinitionDraftCommandAuthority {
  executeProjectDefinitionDraftCommand(
    request: PetraProjectDefinitionDraftCommandRequest,
  ): Promise<PetraProjectDefinitionDraftCommandReceipt>;
}
