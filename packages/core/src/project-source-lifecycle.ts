import type {
  ExcludeProjectSource,
  PetraCommandEnvelopeV120,
  PetraProjectSource,
  PetraProjectSourceLifecycleView,
  PetraProjectSourceLifecycleReceipt,
  RestoreProjectSource,
} from "@petra/contracts";

export type ProjectSourceLifecycleAction =
  "exclude_project_source" | "restore_project_source" | "delete_local_copy";

/**
 * Read-only lifecycle impact preview. Mutation remains a separate governed
 * command boundary and physical copy deletion remains policy-gated.
 */
export interface ProjectSourceLifecycleViewReader {
  getProjectSourceLifecycleView(
    projectId: string,
    projectSourceId: string,
    requestedAction: ProjectSourceLifecycleAction,
  ): Promise<PetraProjectSourceLifecycleView | undefined>;
}

export type ProjectSourceLifecycleCommandEnvelope = Omit<
  PetraCommandEnvelopeV120,
  "command"
> & {
  command: ExcludeProjectSource | RestoreProjectSource;
};

export interface ProjectSourceLifecycleCommandResult {
  readonly receipt: PetraProjectSourceLifecycleReceipt;
  readonly projectSource: PetraProjectSource;
  /** False only when the exact command was replayed idempotently. */
  readonly applied: boolean;
}

export type ProjectSourceLifecycleAuthorityErrorCode =
  | "PROJECT_SOURCE_LIFECYCLE_COMMAND_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_LIFECYCLE_COMMAND_ID_REUSED"
  | "PROJECT_SOURCE_LIFECYCLE_IDEMPOTENCY_KEY_REUSED"
  | "PROJECT_SOURCE_LIFECYCLE_PROJECT_MISMATCH"
  | "PROJECT_SOURCE_LIFECYCLE_SOURCE_NOT_FOUND"
  | "PROJECT_SOURCE_LIFECYCLE_STALE_SOURCE"
  | "PROJECT_SOURCE_LIFECYCLE_STATUS_MISMATCH"
  | "PROJECT_SOURCE_LIFECYCLE_ACTIVE_REPLACEMENT"
  | "PROJECT_SOURCE_LIFECYCLE_STORED_RECORD_CORRUPT";

export class ProjectSourceLifecycleAuthorityError extends Error {
  readonly code: ProjectSourceLifecycleAuthorityErrorCode;

  constructor(code: ProjectSourceLifecycleAuthorityErrorCode, message: string) {
    super(message);
    this.name = "ProjectSourceLifecycleAuthorityError";
    this.code = code;
  }
}

/**
 * Governed ProjectSource status transitions. Implementations atomically commit
 * the new source revision, command execution, Project event, projection intent,
 * and immutable recovery receipt.
 */
export interface ProjectSourceLifecycleAuthorityRepository {
  executeProjectSourceLifecycleCommand(
    envelope: ProjectSourceLifecycleCommandEnvelope,
  ): Promise<ProjectSourceLifecycleCommandResult>;
  getProjectSourceLifecycleReceipt(
    commandId: string,
  ): Promise<PetraProjectSourceLifecycleReceipt | undefined>;
}
