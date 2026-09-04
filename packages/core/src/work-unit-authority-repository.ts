import type {
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWorkUnit,
  PetraWorkUnitCancellation,
  WorkUnitCancellationCommand,
  WorkerFailure,
} from "@petra/contracts";

import type { RegisterWorkUnitInput } from "./work-unit-registry.js";

export interface WorkUnitCancellationResult {
  readonly cancellation: PetraWorkUnitCancellation;
  readonly workUnit: PetraWorkUnit;
  readonly applied: boolean;
}

/**
 * Durable control-plane boundary for bounded worker execution.
 *
 * Implementations preserve every WorkUnit revision and immutable manifest;
 * terminal worker outcomes remain operational records, never scientific
 * authority.
 */
export interface WorkUnitAuthorityRepository {
  register(input: RegisterWorkUnitInput): Promise<PetraWorkUnit>;
  getWorkUnit(workUnitId: string): Promise<PetraWorkUnit | undefined>;
  getWorkUnitRevision(
    workUnitId: string,
    revision: number,
  ): Promise<PetraWorkUnit | undefined>;
  getInputManifest(
    manifestId: string,
  ): Promise<PetraWorkerInputManifest | undefined>;
  getOutputManifest(
    manifestId: string,
  ): Promise<PetraWorkerOutputManifest | undefined>;
  queue(
    workUnitId: string,
    expectedRevision: number,
    queuedAt: string,
  ): Promise<PetraWorkUnit>;
  start(
    workUnitId: string,
    expectedRevision: number,
    attempt: number,
    startedAt: string,
  ): Promise<PetraWorkUnit>;
  complete(
    manifest: PetraWorkerOutputManifest,
    expectedRevision: number,
  ): Promise<PetraWorkUnit>;
  failValidation(
    workUnitId: string,
    expectedRevision: number,
    attempt: number,
    failure: WorkerFailure,
    completedAt: string,
  ): Promise<PetraWorkUnit>;
  cancel(
    workUnitId: string,
    expectedRevision: number,
    reason: string,
    cancelledAt: string,
  ): Promise<PetraWorkUnit>;
  cancelByCommand(
    command: WorkUnitCancellationCommand,
  ): Promise<WorkUnitCancellationResult>;
  getCancellationByCommand(
    commandId: string,
  ): Promise<PetraWorkUnitCancellation | undefined>;
}
