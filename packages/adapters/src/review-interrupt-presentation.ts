import type { PetraInteractionResult } from "./ag-ui.js";
import type { PetraReviewInterruptResponse } from "@petra/contracts";
const HASH = /^sha256:[0-9a-f]{64}$/u;
const INTERACTION_RUN_ID = /^interaction_run_[0-9A-HJKMNP-TV-Z]{26}$/u;
const INTERACTION_INTERRUPT_ID =
  /^interaction_interrupt_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CHANGE_SET_ID = /^change_set_[0-9A-HJKMNP-TV-Z]{26}$/u;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const positiveRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const stringField = (
  value: Record<string, unknown>,
  key: string,
): string | undefined =>
  typeof value[key] === "string" ? value[key] : undefined;

const exactRef = (
  value: unknown,
  idKey: string,
  idPattern: RegExp,
): { id: string; revision: number; contentHash: string } | undefined => {
  if (!isRecord(value)) return undefined;
  const id = stringField(value, idKey);
  const contentHash = stringField(value, "content_hash");
  if (
    id === undefined ||
    !idPattern.test(id) ||
    !positiveRevision(value.revision) ||
    contentHash === undefined ||
    !HASH.test(contentHash)
  ) {
    return undefined;
  }
  return { id, revision: value.revision, contentHash };
};

export interface ProjectReviewInterruptPresentation {
  readonly projectId: string;
  readonly interactionRunId: string;
  readonly interruptRef: PetraReviewInterruptResponse["interrupt_ref"];
  readonly changeSetRef: PetraReviewInterruptResponse["change_set_ref"];
  readonly reason: "changeset_review";
  readonly message: string;
}

const pendingReviewMetadata = (
  value: unknown,
  projectId: string,
): ProjectReviewInterruptPresentation | undefined => {
  if (
    !isRecord(value) ||
    value.reason !== "changeset_review" ||
    typeof value.id !== "string" ||
    !isRecord(value.metadata)
  ) {
    return undefined;
  }
  const metadata = value.metadata;
  const interruptRef = exactRef(
    metadata.interactionInterruptRef,
    "interaction_interrupt_id",
    INTERACTION_INTERRUPT_ID,
  );
  const changeSetRef = exactRef(
    metadata.changeSetRef,
    "change_set_id",
    CHANGE_SET_ID,
  );
  if (
    metadata.projectId !== projectId ||
    typeof metadata.interactionRunId !== "string" ||
    !INTERACTION_RUN_ID.test(metadata.interactionRunId) ||
    interruptRef === undefined ||
    changeSetRef === undefined ||
    value.id !== interruptRef.id
  ) {
    return undefined;
  }
  return {
    projectId,
    interactionRunId: metadata.interactionRunId,
    interruptRef: {
      interaction_interrupt_id: interruptRef.id,
      revision: interruptRef.revision,
      content_hash: interruptRef.contentHash,
    },
    changeSetRef: {
      change_set_id: changeSetRef.id,
      revision: changeSetRef.revision,
      content_hash: changeSetRef.contentHash,
    },
    reason: "changeset_review",
    message:
      typeof value.message === "string" && value.message.trim().length > 0
        ? value.message
        : "Review the exact proposed ChangeSet before it becomes authoritative.",
  };
};

/**
 * Reads only the exact server event metadata that the AG-UI adapter paired with
 * the pending interrupt. A pending SDK label without those identities is not a
 * command surface.
 */
export const projectReviewInterruptsFromInteraction = (
  result: PetraInteractionResult,
  projectId: string,
): ProjectReviewInterruptPresentation[] => {
  const pendingIds = new Set(
    result.pendingInterrupts
      .filter((interrupt) => interrupt.reason === "changeset_review")
      .map((interrupt) => interrupt.id),
  );
  const presentations = result.events.flatMap((event) => {
    if (event.type !== "RUN_FINISHED") return [];
    const outcome = event.payload.outcome;
    if (!isRecord(outcome) || !Array.isArray(outcome.interrupts)) return [];
    return outcome.interrupts.flatMap((interrupt) => {
      const presentation = pendingReviewMetadata(interrupt, projectId);
      return presentation === undefined ||
        !pendingIds.has(presentation.interruptRef.interaction_interrupt_id)
        ? []
        : [presentation];
    });
  });
  const unique = new Map(
    presentations.map((presentation) => [
      presentation.interruptRef.interaction_interrupt_id,
      presentation,
    ]),
  );
  if (unique.size !== pendingIds.size) {
    throw new Error(
      "Petra withheld a pending Review response because its exact server-owned interrupt identity was unavailable or inconsistent.",
    );
  }
  return [...unique.values()];
};
