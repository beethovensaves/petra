import type {
  PetraProjectInquirySaveReceipt,
  PetraProjectInquirySaveRecoveryView,
  PetraProjectInquirySaveRequest,
  PetraProjectInquiryLink,
  PetraProjectInquiryRole,
  PetraProjectInquiryView,
  PetraProjectObjective,
} from "@petra/contracts";

export type ProjectInquiryAuthoredStatus =
  "active" | "satisfied" | "superseded" | "abandoned";

export interface ProjectInquiryCollectionRequest {
  readonly limit?: number;
  readonly cursor?: string;
  readonly authored_status?: ProjectInquiryAuthoredStatus;
  readonly work_unit_id?: string;
}

export interface ProjectInquiryViewReader {
  listProjectInquiryView(
    projectId: string,
    request?: ProjectInquiryCollectionRequest,
  ): Promise<PetraProjectInquiryView | undefined>;
  getProjectInquiryView(
    projectId: string,
    objectiveId: string,
  ): Promise<PetraProjectInquiryView | undefined>;
}

/**
 * Definition-owned inquiry-role mappings and exact many-to-many links. The
 * inquiry identity remains the mapped domain record; Work and result lifecycle
 * never supplies inquiry resolution or authority.
 */
export interface ProjectInquiryAuthorityRepository {
  registerProjectInquiryRoleRevision(
    role: PetraProjectInquiryRole,
  ): Promise<PetraProjectInquiryRole>;
  getProjectInquiryRole(
    projectId: string,
    projectInquiryRoleId: string,
    revision?: number,
  ): Promise<PetraProjectInquiryRole | undefined>;
  listProjectInquiryRoles(
    projectId: string,
  ): Promise<PetraProjectInquiryRole[]>;
  registerProjectInquiryLink(
    link: PetraProjectInquiryLink,
  ): Promise<PetraProjectInquiryLink>;
  getProjectInquiryLink(
    projectId: string,
    projectInquiryLinkId: string,
  ): Promise<PetraProjectInquiryLink | undefined>;
  listProjectInquiryLinks(
    projectId: string,
    objectiveId?: string,
  ): Promise<PetraProjectInquiryLink[]>;
  listProjectInquiryLinksForWork(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectInquiryLink[]>;
}

export type ProjectInquirySaveErrorCode =
  | "PROJECT_INQUIRY_SAVE_CONFLICT"
  | "PROJECT_INQUIRY_SAVE_NOT_AUTHORIZED"
  | "PROJECT_INQUIRY_SAVE_GRAPH_NOT_FOUND"
  | "PROJECT_INQUIRY_SAVE_GRAPH_STALE"
  | "PROJECT_INQUIRY_SAVE_DEFINITION_STALE"
  | "PROJECT_INQUIRY_SAVE_ROLE_UNAVAILABLE"
  | "PROJECT_INQUIRY_SAVE_SELECTION_INVALID"
  | "PROJECT_INQUIRY_SAVE_STORED_RECORD_CORRUPT";

export class ProjectInquirySaveError extends Error {
  constructor(
    readonly code: ProjectInquirySaveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ProjectInquirySaveError";
  }
}

export interface ProjectInquirySavePrincipal {
  readonly actor: PetraProjectInquirySaveReceipt["actor"];
  readonly capabilityGrantId: string;
}

export interface ProjectInquirySaveResult {
  readonly receipt: PetraProjectInquirySaveReceipt;
  readonly inquiry: PetraProjectObjective;
  /** False only when the exact command was replayed idempotently. */
  readonly applied: boolean;
}

/**
 * Authenticated command owner for a server-verified Graph question. The
 * renderer supplies no Actor, grant, ProjectInquiry identity, or Objective
 * content beyond the exact bounded question request.
 */
export interface ProjectInquirySaveAuthority {
  saveProjectInquiry(
    projectId: string,
    request: PetraProjectInquirySaveRequest,
    principal: ProjectInquirySavePrincipal,
  ): Promise<ProjectInquirySaveResult>;
  assessProjectInquirySaveRecovery(
    projectId: string,
    request: PetraProjectInquirySaveRequest,
    principal: ProjectInquirySavePrincipal,
  ): Promise<PetraProjectInquirySaveRecoveryView>;
}
