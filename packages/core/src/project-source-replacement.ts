import type { PetraProjectSourceReplacement } from "@petra/contracts";

/**
 * Immutable ProjectSource supersession lineage. Registration does not mutate,
 * delete, or rebind either ProjectSource identity.
 */
export interface ProjectSourceReplacementAuthorityRepository {
  registerProjectSourceReplacement(
    replacement: PetraProjectSourceReplacement,
  ): Promise<PetraProjectSourceReplacement>;
  getProjectSourceReplacement(
    projectId: string,
    projectSourceReplacementId: string,
  ): Promise<PetraProjectSourceReplacement | undefined>;
  getProjectSourceSuccessor(
    projectId: string,
    replacedProjectSourceId: string,
  ): Promise<PetraProjectSourceReplacement | undefined>;
  listProjectSourceReplacementChain(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceReplacement[]>;
}
