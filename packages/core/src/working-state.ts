import type {
  PetraAssertion,
  PetraClaim,
  PetraControlledWritingGoverningRelationship,
  PetraControlledWritingRequirement,
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

export interface ControlledWritingWorkingCandidateAdmission {
  readonly candidate: PetraWorkingCandidate;
  readonly profileRecord: PetraControlledWritingRequirement;
}

export interface ControlledWritingWorkingRelationshipAdmission {
  readonly relationship: PetraWorkingRelationship;
  readonly profileRecord: PetraControlledWritingGoverningRelationship;
}

export type WorkingCandidateAdmission =
  | ScientificWorkingCandidateAdmission
  | ControlledWritingWorkingCandidateAdmission;

export type WorkingRelationshipAdmission =
  | ScientificWorkingRelationshipAdmission
  | ControlledWritingWorkingRelationshipAdmission;

/**
 * Canonical durable working-state persistence. Supplied profile records remain
 * in their installed profile-owned storage; these methods add only the shared,
 * non-authoritative working revision and lineage boundary.
 */
export interface WorkingStateAuthorityRepository {
  admitWorkingCandidateRevision(
    input: WorkingCandidateAdmission,
  ): Promise<PetraWorkingCandidate>;
  admitWorkingRelationshipRevision(
    input: WorkingRelationshipAdmission,
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
