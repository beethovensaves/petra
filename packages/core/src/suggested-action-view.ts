import type { PetraSuggestedActionView } from "@petra/contracts";

/**
 * Project-scoped SuggestedAction preview reads. Implementations derive the
 * action from retained authority and must never start Work while composing it.
 */
export interface SuggestedActionViewReader {
  getSuggestedActionViewForInquiryResult(
    projectId: string,
    projectInquiryLinkId: string,
  ): Promise<PetraSuggestedActionView | undefined>;
}
