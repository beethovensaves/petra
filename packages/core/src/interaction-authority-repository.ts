import type {
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionReplayRecord,
  PetraInteractionRun,
} from "@petra/contracts";

/**
 * Durable presentation-protocol boundary.
 *
 * Interaction records are replayable operational history. They can reference
 * authoritative Petra commands and WorkUnits, but replaying them must never
 * create domain authority or cancel durable work.
 */
export interface InteractionAuthorityRepository {
  registerFeatureManifest(
    manifest: PetraInteractionFeatureManifest,
  ): Promise<PetraInteractionFeatureManifest>;
  getFeatureManifest(
    interactionFeatureManifestId: string,
  ): Promise<PetraInteractionFeatureManifest | undefined>;
  registerRun(run: PetraInteractionRun): Promise<PetraInteractionRun>;
  getRun(interactionRunId: string): Promise<PetraInteractionRun | undefined>;
  getRunRevision(
    interactionRunId: string,
    revision: number,
  ): Promise<PetraInteractionRun | undefined>;
  appendEvent(
    event: PetraInteractionEventRecord,
  ): Promise<PetraInteractionEventRecord>;
  getEvent(
    interactionEventRecordId: string,
  ): Promise<PetraInteractionEventRecord | undefined>;
  listEvents(
    interactionRunId: string,
    afterSequence?: number,
    limit?: number,
  ): Promise<PetraInteractionEventRecord[]>;
  registerInterrupt(
    interrupt: PetraInteractionInterrupt,
  ): Promise<PetraInteractionInterrupt>;
  getInterrupt(
    interactionInterruptId: string,
  ): Promise<PetraInteractionInterrupt | undefined>;
  getInterruptRevision(
    interactionInterruptId: string,
    revision: number,
  ): Promise<PetraInteractionInterrupt | undefined>;
  registerReplay(
    replay: PetraInteractionReplayRecord,
  ): Promise<PetraInteractionReplayRecord>;
  getReplay(
    interactionReplayRecordId: string,
  ): Promise<PetraInteractionReplayRecord | undefined>;
}
