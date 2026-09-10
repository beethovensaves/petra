import type {
  PetraCapabilityGrantRecord,
  PetraCapabilityGrantRevocation,
} from "@petra/contracts";

/**
 * Owns immutable Project-scoped command grants and their retained revocations.
 * Permission changes issue another grant identity rather than revising a grant.
 */
export interface CapabilityGrantAuthorityRepository {
  registerCapabilityGrant(
    grant: PetraCapabilityGrantRecord,
  ): Promise<PetraCapabilityGrantRecord>;
  registerCapabilityGrantRevocation(
    revocation: PetraCapabilityGrantRevocation,
  ): Promise<PetraCapabilityGrantRevocation>;
  getCapabilityGrant(
    capabilityGrantId: string,
  ): Promise<PetraCapabilityGrantRecord | undefined>;
  listProjectCapabilityGrants(
    projectId: string,
  ): Promise<readonly PetraCapabilityGrantRecord[]>;
  getCapabilityGrantRevocation(
    capabilityGrantRevocationId: string,
  ): Promise<PetraCapabilityGrantRevocation | undefined>;
  getRevocationForCapabilityGrant(
    capabilityGrantId: string,
  ): Promise<PetraCapabilityGrantRevocation | undefined>;
}
