import type { PetraProjectRelationshipView } from "@petra/contracts";

/**
 * Authorized, renderer-neutral bounded relationship result. Implementations
 * must guard the cross-store projection position before returning semantics.
 */
export interface ProjectRelationshipViewReader {
  getProjectRelationshipView(
    projectId: string,
  ): Promise<PetraProjectRelationshipView | undefined>;
}
