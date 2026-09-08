import type {
  PetraProjectInquiryLink,
  PetraProjectInquiryRole,
} from "@petra/contracts";

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
