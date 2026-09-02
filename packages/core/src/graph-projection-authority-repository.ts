import type {
  PetraGraphProjectionRecord,
  PetraOutboxRecord,
  PetraProjectionCheckpoint,
} from "@petra/contracts";

/**
 * PostgreSQL-authoritative projection history and freshness boundary.
 * Neo4j receipts may advance a checkpoint only after their graph transaction
 * commits; failed attempts remain visible without moving contiguous position.
 */
export interface GraphProjectionAuthorityRepository {
  register(
    checkpoint: PetraProjectionCheckpoint,
  ): Promise<PetraProjectionCheckpoint>;
  getCheckpoint(
    checkpointId: string,
  ): Promise<PetraProjectionCheckpoint | undefined>;
  getCheckpointRevision(
    checkpointId: string,
    revision: number,
  ): Promise<PetraProjectionCheckpoint | undefined>;
  getProjectionRecords(
    checkpointId: string,
  ): Promise<PetraGraphProjectionRecord[]>;
  getRepairQueue(checkpointId: string): Promise<PetraGraphProjectionRecord[]>;
  observeHead(
    checkpointId: string,
    outbox: PetraOutboxRecord,
    expectedRevision: number,
    observedAt: string,
  ): Promise<PetraProjectionCheckpoint>;
  record(
    checkpointId: string,
    outbox: PetraOutboxRecord,
    record: PetraGraphProjectionRecord,
    expectedRevision: number,
  ): Promise<PetraProjectionCheckpoint>;
}
