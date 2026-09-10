import type {
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationExecutionView,
} from "@petra/contracts";

export class ProjectHistoryCompensationExecutionUnavailableError extends Error {
  readonly code = "PROJECT_HISTORY_COMPENSATION_EXECUTION_UNAVAILABLE" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProjectHistoryCompensationExecutionUnavailableError";
  }
}

/**
 * Executes or resumes one exact compensation command plan. Implementations
 * derive their result from the existing command/event authority and must not
 * create an aggregate History or undo ledger.
 */
export interface ProjectHistoryCompensationExecutionBoundary {
  executeProjectHistoryCompensationPlan(
    request: PetraProjectHistoryCompensationExecutionRequest,
  ): Promise<PetraProjectHistoryCompensationExecutionView | undefined>;
}
