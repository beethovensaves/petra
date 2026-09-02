import type {
  PetraApproval,
  PetraChangeSet,
  PetraCommandEnvelope,
  PetraDomainEvent,
  PetraOutboxRecord,
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
  target: PetraOutboxRecord["target"];
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
    envelope: PetraCommandEnvelope,
  ): Promise<ChangeControlCommandResult>;
  getChangeSet(changeSetId: string): Promise<PetraChangeSet | undefined>;
  getChangeSetState(
    changeSetId: string,
  ): Promise<ChangeSetDerivedState | undefined>;
  getApproval(approvalId: string): Promise<PetraApproval | undefined>;
  getDomainEvents(query: DomainEventQuery): Promise<PetraDomainEvent[]>;
  getOutboxRecords(query: OutboxQuery): Promise<PetraOutboxRecord[]>;
}
