import type { PetraProjectEffectiveControlsView } from "@petra/contracts";

export interface ProjectEffectiveControlsViewReader {
  getProjectEffectiveControlsView(
    projectId: string,
  ): Promise<PetraProjectEffectiveControlsView | undefined>;
}
