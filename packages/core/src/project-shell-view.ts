import type {
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectShellViewV12,
} from "@petra/contracts";

import type { ProjectObjectLocationRequest } from "./project-object-location-view.js";

export type ProjectShellView =
  PetraProjectShellView | PetraProjectShellViewV11 | PetraProjectShellViewV12;

export type ProjectShellSelectionRequest = Omit<
  ProjectObjectLocationRequest,
  "project_id"
>;

/**
 * Authorized read composition for the Project list and shared Project shell.
 * Implementations must compose each result from one coherent authority
 * snapshot; clients must not join independent records into Project meaning.
 */
export interface ProjectShellViewReader {
  listProjectShellViews(): Promise<ProjectShellView[]>;
  getProjectShellView(
    projectId: string,
    selection?: ProjectShellSelectionRequest,
  ): Promise<ProjectShellView | undefined>;
}
