import type { PetraActor, PetraProject } from "@petra/contracts";

/**
 * The smallest persistence port for Petra's explicit authorship and Project
 * boundary. Implementations must preserve immutable actor records and every
 * Project revision; callers never receive a mutable database-owned object.
 */
export interface ResearchScopeRepository {
  registerActor(actor: PetraActor): Promise<PetraActor>;
  getActor(actorId: string): Promise<PetraActor | undefined>;
  registerProjectRevision(project: PetraProject): Promise<PetraProject>;
  getProject(
    projectId: string,
    revision?: number,
  ): Promise<PetraProject | undefined>;
}
