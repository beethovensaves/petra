import type {
  PetraApproval,
  PetraChangeSetRecord,
  PetraCommandEnvelopeRecord,
  PetraDomainEventRecord,
  PetraOutboxRecordRecord,
} from "@petra/contracts";

import type {
  ChangeControlCommandResult,
  ChangeSetDerivedState,
} from "./evidence-registry.js";

export interface DomainEventQuery {
  projectId: string;
  afterStreamRevision?: number;
  limit?: number;
}

export interface OutboxQuery {
  projectId: string;
  target: PetraOutboxRecordRecord["target"];
  afterTargetSequence?: number;
  limit?: number;
}

/**
 * One transactional command boundary for scientific authority changes.
 * Implementations must commit target revisions, audit event, idempotency
 * result, and projection intent together or commit none of them.
 */
export interface ChangeControlAuthorityRepository {
  executeCommand(
    envelope: PetraCommandEnvelopeRecord,
  ): Promise<ChangeControlCommandResult>;
  getChangeSet(changeSetId: string): Promise<PetraChangeSetRecord | undefined>;
  getChangeSetState(
    changeSetId: string,
  ): Promise<ChangeSetDerivedState | undefined>;
  getApproval(approvalId: string): Promise<PetraApproval | undefined>;
  getDomainEvents(query: DomainEventQuery): Promise<PetraDomainEventRecord[]>;
  getOutboxRecords(query: OutboxQuery): Promise<PetraOutboxRecordRecord[]>;
}
