import type { PetraProjectSourceView } from "@petra/contracts";

/** Authorized, snapshot-consistent source collection and detail reads. */
export interface ProjectSourceViewReader {
  listProjectSourceViews(projectId: string): Promise<PetraProjectSourceView[]>;
  getProjectSourceView(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceView | undefined>;
}
