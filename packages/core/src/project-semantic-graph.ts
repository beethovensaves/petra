import type { PetraProjectSemanticGraphView } from "@petra/contracts";

/** One authorized, bounded snapshot of registered current working heads.
 * Native material retains its exact schema and hash; endpoint references do
 * not imply trusted projection, review approval, or scientific support.
 */
export interface ProjectSemanticGraphReader {
  getProjectSemanticGraph(
    projectId: string,
  ): Promise<PetraProjectSemanticGraphView | undefined>;
}
