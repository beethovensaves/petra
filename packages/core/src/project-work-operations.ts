import type {
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkResumeRequest,
  PetraWorkUnit,
} from "@petra/contracts";

export type ProjectWorkOperationErrorCode =
  | "PROJECT_WORK_OPERATION_CONFLICT"
  | "PROJECT_WORK_OPERATION_NOT_AUTHORIZED"
  | "PROJECT_WORK_OPERATION_NOT_FOUND"
  | "PROJECT_WORK_OPERATION_STALE"
  | "PROJECT_WORK_OPERATION_UNAVAILABLE"
  | "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT";

export class ProjectWorkOperationError extends Error {
  readonly code: ProjectWorkOperationErrorCode;

  constructor(code: ProjectWorkOperationErrorCode, message: string) {
    super(message);
    this.name = "ProjectWorkOperationError";
    this.code = code;
  }
}

export interface ProjectWorkCommandPrincipal {
  readonly actor: PetraProjectWorkOperationReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface RegisterProjectWorkRequiredInput {
  readonly inputRequestId: string;
  readonly projectId: string;
  readonly workUnitId: string;
  readonly expectedWorkUnitRevision: number;
  readonly kind:
    "clarification" | "capability" | "budget" | "validation_judgment";
  readonly question: string;
  readonly responseOptions: readonly string[];
  readonly consequence: string;
  readonly registeredAt: string;
}

export type ProjectWorkStageBoundary =
  "required_input" | "execution" | "completion";

export interface RegisterProjectWorkStage {
  readonly stageId: string;
  readonly label: string;
  readonly purpose: string;
  readonly boundary: ProjectWorkStageBoundary;
  readonly prerequisiteStageIds: readonly string[];
  readonly accountableRole: string;
  readonly input: string;
  readonly output: string;
}

export interface RegisterProjectWorkStagePlan {
  readonly stagePlanId: string;
  readonly projectId: string;
  readonly workUnitId: string;
  readonly expectedWorkUnitSpecHash: string;
  readonly stages: readonly RegisterProjectWorkStage[];
  readonly registeredAt: string;
}

export interface RegisterProjectWorkCheckpointResume {
  readonly resumeRegistrationId: string;
  readonly projectId: string;
  readonly workUnitRef: {
    readonly work_unit_id: string;
    readonly revision: number;
    readonly spec_hash: string;
  };
  readonly checkpoint: Extract<
    PetraWorkUnit["status"],
    { state: "checkpointed" }
  >["checkpoint"];
  readonly registeredBy: {
    readonly actor_id: string;
    readonly actor_kind: "service";
  };
  readonly registeredAt: string;
}

/** Server-owned command and trusted worker-input boundary for exact Project Work. */
export interface ProjectWorkOperationAuthority {
  executeProjectWorkOperation(
    projectId: string,
    request: PetraProjectWorkOperationRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<PetraProjectWorkOperationReceipt>;
  registerRequiredInput(input: RegisterProjectWorkRequiredInput): Promise<void>;
  registerStagePlan(input: RegisterProjectWorkStagePlan): Promise<void>;
}

/** Snapshot-consistent Work controls, delivery, required input, and result composition. */
export interface ProjectWorkOperationsViewReader {
  getProjectWorkOperationsView(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkOperationsView | undefined>;
}

/** Authenticated human command over a trusted exact-checkpoint registration. */
export interface ProjectWorkResumeAuthority {
  executeProjectWorkResume(
    projectId: string,
    request: PetraProjectWorkResumeRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<PetraProjectWorkResumeReceipt>;
}

/** Trusted workflow boundary that attests exact checkpoint compatibility. */
export interface ProjectWorkCheckpointResumeRegistry {
  registerCheckpointResume(
    input: RegisterProjectWorkCheckpointResume,
  ): Promise<void>;
}
