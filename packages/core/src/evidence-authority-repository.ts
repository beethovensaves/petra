import type { PetraAssertion, PetraClaim } from "@petra/contracts";

/**
 * Storage-neutral authority boundary for scientific evidence records.
 *
 * This port admits only initial quarantine proposals. Reviewed revisions are
 * appended through ChangeControlAuthorityRepository without replacing stable
 * evidence IDs, and remain visible through this read shape.
 */
export interface EvidenceAuthorityRepository {
  proposeClaim(claim: PetraClaim): Promise<PetraClaim>;
  proposeAssertion(assertion: PetraAssertion): Promise<PetraAssertion>;
  getClaim(claimId: string, revision?: number): Promise<PetraClaim | undefined>;
  getAssertion(
    assertionId: string,
    revision?: number,
  ): Promise<PetraAssertion | undefined>;
  getClaimsForWorkVersion(workVersionId: string): Promise<PetraClaim[]>;
  getAssertionsForEntity(entityId: string): Promise<PetraAssertion[]>;
}
