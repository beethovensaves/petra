import type { PetraProjectSourceLifecycleView } from "@petra/contracts";

export type ProjectSourceLifecycleAction =
  "exclude_project_source" | "restore_project_source" | "delete_local_copy";

/**
 * Read-only lifecycle impact preview. Mutation remains a separate governed
 * command boundary and physical copy deletion remains policy-gated.
 */
export interface ProjectSourceLifecycleViewReader {
  getProjectSourceLifecycleView(
    projectId: string,
    projectSourceId: string,
    requestedAction: ProjectSourceLifecycleAction,
  ): Promise<PetraProjectSourceLifecycleView | undefined>;
}
