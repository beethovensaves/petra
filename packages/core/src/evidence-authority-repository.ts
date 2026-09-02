import type { PetraAssertion, PetraClaim } from "@petra/contracts";

/**
 * Storage-neutral authority boundary for scientific evidence records.
 *
 * W05 admits only initial quarantine proposals. Later revisions remain part of
 * the read shape so W06 can append reviewed state without replacing stable IDs.
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
