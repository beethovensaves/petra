import type { PetraProjectRelationshipOverlayView } from "@petra/contracts";

export interface ProjectRelationshipOverlayViewReader {
  getProjectRelationshipOverlayView(
    projectId: string,
  ): Promise<PetraProjectRelationshipOverlayView | undefined>;
}
