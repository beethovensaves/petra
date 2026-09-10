import type {
  CreateProjectSourceReplacement,
  PetraCommandEnvelopeV130,
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceReplacementRetraction,
  RetractProjectSourceReplacement,
} from "@petra/contracts";

export type ProjectSourceReplacementCommandEnvelope = Omit<
  PetraCommandEnvelopeV130,
  "command"
> & {
  command: CreateProjectSourceReplacement | RetractProjectSourceReplacement;
};

export type ProjectSourceReplacementCommandResult =
  | {
      readonly outcome: "replacement_created";
      readonly receipt: PetraProjectSourceReplacementReceipt;
      readonly replacement: PetraProjectSourceReplacement;
      readonly applied: boolean;
    }
  | {
      readonly outcome: "replacement_retracted";
      readonly receipt: PetraProjectSourceReplacementReceipt;
      readonly replacement: PetraProjectSourceReplacement;
      readonly retraction: PetraProjectSourceReplacementRetraction;
      readonly applied: boolean;
    };

export type ProjectSourceReplacementCommandErrorCode =
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_AUTHORIZED"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_ID_REUSED"
  | "PROJECT_SOURCE_REPLACEMENT_IDEMPOTENCY_KEY_REUSED"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_PROJECT_MISMATCH"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_MISSING"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_STALE"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_STATUS_MISMATCH"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_RECEIPT_MISSING"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_RECEIPT_STALE"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_ALREADY_ACTIVE"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_MISSING"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_STALE"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_ACTIVE"
  | "PROJECT_SOURCE_REPLACEMENT_COMMAND_STORED_RECORD_CORRUPT";

export class ProjectSourceReplacementCommandError extends Error {
  readonly code: ProjectSourceReplacementCommandErrorCode;

  constructor(code: ProjectSourceReplacementCommandErrorCode, message: string) {
    super(message);
    this.name = "ProjectSourceReplacementCommandError";
    this.code = code;
  }
}

/**
 * Governed replacement creation and command-granular compensation. One
 * transaction commits the immutable relation/retraction, command execution,
 * Project event, graph/interface outbox intent, and recovery receipt.
 */
export interface ProjectSourceReplacementCommandAuthorityRepository {
  executeProjectSourceReplacementCommand(
    envelope: ProjectSourceReplacementCommandEnvelope,
  ): Promise<ProjectSourceReplacementCommandResult>;
  getProjectSourceReplacementCommandReceipt(
    commandId: string,
  ): Promise<PetraProjectSourceReplacementReceipt | undefined>;
}
