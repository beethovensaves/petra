import type {
  PetraProjectObjective,
  PetraProjectObjectiveCommandReceipt,
  PetraProjectObjectiveCommandRecoveryView,
  PetraProjectObjectiveCommandRequest,
} from "@petra/contracts";

export type ProjectObjectiveCommandErrorCode =
  | "PROJECT_OBJECTIVE_COMMAND_CONFLICT"
  | "PROJECT_OBJECTIVE_COMMAND_NOT_AUTHORIZED"
  | "PROJECT_OBJECTIVE_COMMAND_PROJECT_NOT_FOUND"
  | "PROJECT_OBJECTIVE_COMMAND_PROJECT_STALE"
  | "PROJECT_OBJECTIVE_COMMAND_DEFINITION_STALE"
  | "PROJECT_OBJECTIVE_COMMAND_FOCUS_STALE"
  | "PROJECT_OBJECTIVE_COMMAND_KIND_UNREGISTERED"
  | "PROJECT_OBJECTIVE_COMMAND_DEPENDENCY_INVALID"
  | "PROJECT_OBJECTIVE_COMMAND_REVIEW_INVALID"
  | "PROJECT_OBJECTIVE_COMMAND_STORED_RECORD_CORRUPT";

export class ProjectObjectiveCommandError extends Error {
  constructor(
    readonly code: ProjectObjectiveCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectObjectiveCommandError";
  }
}

export interface ProjectObjectiveCommandPrincipal {
  readonly actor: PetraProjectObjectiveCommandReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectObjectiveCommandResult {
  readonly receipt: PetraProjectObjectiveCommandReceipt;
  readonly objective: PetraProjectObjective;
  /** False only when the exact idempotent command receipt was replayed. */
  readonly applied: boolean;
}

/**
 * Authenticated owner for reviewed Objective framing and revision. The request
 * carries optimistic record bindings and reviewed content, never Actor, grant,
 * Objective identity, revision, or timestamps.
 */
export interface ProjectObjectiveCommandAuthority {
  executeProjectObjectiveCommand(
    projectId: string,
    request: PetraProjectObjectiveCommandRequest,
    principal: ProjectObjectiveCommandPrincipal,
  ): Promise<ProjectObjectiveCommandResult>;
  assessProjectObjectiveCommandRecovery(
    projectId: string,
    request: PetraProjectObjectiveCommandRequest,
    principal: ProjectObjectiveCommandPrincipal,
  ): Promise<PetraProjectObjectiveCommandRecoveryView>;
}
