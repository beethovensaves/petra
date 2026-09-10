import type {
  PetraProjectHistoryCompensationPlanRequest,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryCompensationPreviewView,
  PetraProjectHistoryEpisodeView,
  PetraProjectHistoryImpactViewV12,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedViewV11,
  PetraProjectHistoryView,
  ProjectHistoryRetainedCollectionFiltersV11,
} from "@petra/contracts";

export interface ProjectHistoryRetainedCollectionRequest {
  readonly limit?: number;
  readonly cursor?: string;
  readonly filters?: ProjectHistoryRetainedCollectionFiltersV11;
}

export class ProjectHistoryViewRequestError extends Error {
  readonly code = "PROJECT_HISTORY_VIEW_REQUEST_INVALID" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProjectHistoryViewRequestError";
  }
}

export class ProjectHistoryRecoveryPreviewUnavailableError extends Error {
  readonly code = "PROJECT_HISTORY_RECOVERY_PREVIEW_UNAVAILABLE" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProjectHistoryRecoveryPreviewUnavailableError";
  }
}

export class ProjectHistoryCompensationPlanUnavailableError extends Error {
  readonly code = "PROJECT_HISTORY_COMPENSATION_PLAN_UNAVAILABLE" as const;

  constructor(message: string) {
    super(message);
    this.name = "ProjectHistoryCompensationPlanUnavailableError";
  }
}

/**
 * Authorized Project History composition. Implementations read existing
 * immutable command/event authority and current recovery authority; they do
 * not persist a parallel history ledger.
 */
export interface ProjectHistoryViewReader {
  getRecentProjectHistoryView(
    projectId: string,
  ): Promise<PetraProjectHistoryView | undefined>;
  getProjectHistoryEpisodeView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryEpisodeView | undefined>;
  getProjectHistoryImpactView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryImpactViewV12 | undefined>;
  getProjectHistoryRecoveryAssessmentView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryRecoveryAssessmentView | undefined>;
  getProjectHistoryCompensationPreviewView(
    projectId: string,
    eventId: string,
  ): Promise<PetraProjectHistoryCompensationPreviewView | undefined>;
  composeProjectHistoryCompensationPlan(
    request: PetraProjectHistoryCompensationPlanRequest,
  ): Promise<PetraProjectHistoryCompensationPlanView | undefined>;
  listRetainedProjectHistoryView(
    projectId: string,
    request?: ProjectHistoryRetainedCollectionRequest,
  ): Promise<PetraProjectHistoryRetainedViewV11 | undefined>;
}
