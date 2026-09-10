import type {
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementRetraction,
} from "@petra/contracts";

/**
 * Immutable ProjectSource supersession and compensation lineage. Registration
 * does not mutate, delete, or rebind either ProjectSource identity. Current
 * traversal follows only the effective replacement head.
 */
export interface ProjectSourceReplacementAuthorityRepository {
  registerProjectSourceReplacement(
    replacement: PetraProjectSourceReplacement,
  ): Promise<PetraProjectSourceReplacement>;
  getProjectSourceReplacement(
    projectId: string,
    projectSourceReplacementId: string,
  ): Promise<PetraProjectSourceReplacement | undefined>;
  registerProjectSourceReplacementRetraction(
    retraction: PetraProjectSourceReplacementRetraction,
  ): Promise<PetraProjectSourceReplacementRetraction>;
  getProjectSourceReplacementRetraction(
    projectId: string,
    projectSourceReplacementRetractionId: string,
  ): Promise<PetraProjectSourceReplacementRetraction | undefined>;
  getProjectSourceSuccessor(
    projectId: string,
    replacedProjectSourceId: string,
  ): Promise<PetraProjectSourceReplacement | undefined>;
  listProjectSourceReplacementChain(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceReplacement[]>;
}
