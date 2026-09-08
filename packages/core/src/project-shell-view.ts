import type { PetraProjectShellView } from "@petra/contracts";

/**
 * Authorized read composition for the Project list and shared Project shell.
 * Implementations must compose each result from one coherent authority
 * snapshot; clients must not join independent records into Project meaning.
 */
export interface ProjectShellViewReader {
  listProjectShellViews(): Promise<PetraProjectShellView[]>;
  getProjectShellView(
    projectId: string,
  ): Promise<PetraProjectShellView | undefined>;
}
