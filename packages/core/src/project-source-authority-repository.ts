import type { PetraProjectSource } from "@petra/contracts";

/**
 * Project-owned source membership. Every revision pins the exact semantic
 * definition, scholarly identity revisions, and permission-bearing copy.
 */
export interface ProjectSourceAuthorityRepository {
  registerProjectSourceRevision(
    source: PetraProjectSource,
  ): Promise<PetraProjectSource>;
  getProjectSource(
    projectId: string,
    projectSourceId: string,
    revision?: number,
  ): Promise<PetraProjectSource | undefined>;
  listProjectSources(projectId: string): Promise<PetraProjectSource[]>;
}
