import type {
  PetraAssertion,
  PetraClaim,
  PetraProjectWorkingStateSnapshot,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";

export interface ScientificWorkingCandidateAdmission {
  readonly candidate: PetraWorkingCandidate;
  readonly profileRecord: PetraClaim;
}

export interface ScientificWorkingRelationshipAdmission {
  readonly relationship: PetraWorkingRelationship;
  readonly profileRecord: PetraAssertion;
}

/**
 * Canonical durable working-state persistence. The supplied scientific profile
 * records continue to live in the existing evidence ledger; these methods add
 * only the shared, non-authoritative working revision and lineage boundary.
 */
export interface WorkingStateAuthorityRepository {
  admitWorkingCandidateRevision(
    input: ScientificWorkingCandidateAdmission,
  ): Promise<PetraWorkingCandidate>;
  admitWorkingRelationshipRevision(
    input: ScientificWorkingRelationshipAdmission,
  ): Promise<PetraWorkingRelationship>;
  getWorkingCandidate(
    projectId: string,
    workingCandidateId: string,
    revision?: number,
  ): Promise<PetraWorkingCandidate | undefined>;
  getWorkingRelationship(
    projectId: string,
    workingRelationshipId: string,
    revision?: number,
  ): Promise<PetraWorkingRelationship | undefined>;
}

/** Snapshot-consistent Project-scoped read; HTTP authentication stays server-owned. */
export interface ProjectWorkingStateSnapshotReader {
  getProjectWorkingStateSnapshot(
    projectId: string,
  ): Promise<PetraProjectWorkingStateSnapshot | undefined>;
}
