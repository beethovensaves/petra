import {
  InteractionInputError,
  PetraInteractionClient,
  type PetraInteractionResult,
} from "@petra/adapters/ag-ui";
import type { PetraReviewInterruptResponse } from "@petra/contracts";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const RETAINED_RESPONSE_PREFIX = "petra.review-interrupt-response.";
const HASH = /^sha256:[0-9a-f]{64}$/u;
const INTERACTION_RUN_ID = /^interaction_run_[0-9A-HJKMNP-TV-Z]{26}$/u;
const INTERACTION_INTERRUPT_ID =
  /^interaction_interrupt_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CHANGE_SET_ID = /^change_set_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_THREAD_ID = /^project_thread_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_SESSION_ID = /^review_session_[0-9A-HJKMNP-TV-Z]{26}$/u;
const REVIEW_MEMBER_ID = /^review_member_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORK_UNIT_ID = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;
const ACTOR_ID = /^actor_[0-9A-HJKMNP-TV-Z]{26}$/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const positiveRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const stringField = (
  value: Record<string, unknown>,
  key: string,
): string | undefined =>
  typeof value[key] === "string" ? value[key] : undefined;

export interface ProjectReviewInterruptPresentation {
  readonly projectId: string;
  readonly interactionRunId: string;
  readonly interruptRef: PetraReviewInterruptResponse["interrupt_ref"];
  readonly changeSetRef: PetraReviewInterruptResponse["change_set_ref"];
  readonly reason: "changeset_review";
  readonly message: string;
}

export interface ProjectReviewInterruptReturnContext {
  readonly projectThreadRef: {
    readonly projectThreadId: string;
    readonly revision: number;
    readonly contentHash: string;
    readonly recordHash: string;
  };
  readonly reviewSessionRef: {
    readonly reviewSessionId: string;
    readonly revision: number;
    readonly contentHash: string;
  };
  readonly reviewMemberId: string;
  readonly workUnitRef: {
    readonly workUnitId: string;
    readonly revision: number;
    readonly specHash: string;
    readonly recordHash: string;
  };
  readonly destination: {
    readonly place: string;
    readonly label: string;
    readonly objectRef?: string;
  };
  readonly paths: {
    readonly projectThread: string;
    readonly review: string;
    readonly work: string;
    readonly return: string;
  };
}

export interface ProjectReviewInterruptResolution {
  readonly replayed: boolean;
  readonly responseRecorded: boolean;
  readonly interactionInterruptId: string;
  readonly interactionInterruptRevision: number;
  readonly commandId: string;
  readonly decision: PetraReviewInterruptResponse["decision"];
  readonly actorId: string;
  readonly outcome: "applied" | "rejected" | "reconciliation_required";
  readonly assessmentId: string;
  readonly coverageState: "complete";
  readonly memberOutcome: string;
  readonly snapshotState: string;
  readonly returnContext: ProjectReviewInterruptReturnContext;
}

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

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const randomUlidPayload = (): string => {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  let timestamp = BigInt(Date.now());
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 255n);
    timestamp >>= 8n;
  }
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = CROCKFORD_BASE32[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return payload;
};

export const createProjectReviewInterruptResponse = (
  presentation: ProjectReviewInterruptPresentation,
  input: {
    readonly decision: PetraReviewInterruptResponse["decision"];
    readonly rationale: string;
    readonly decidedAt?: string;
    readonly clientResponseId?: string;
  },
): PetraReviewInterruptResponse => ({
  schema_name: "petra.review-interrupt-response",
  schema_version: "1.0.0",
  client_response_id:
    input.clientResponseId ?? `review-response-${randomUlidPayload()}`,
  project_id: presentation.projectId,
  interaction_run_id: presentation.interactionRunId,
  interrupt_ref: structuredClone(presentation.interruptRef),
  change_set_ref: structuredClone(presentation.changeSetRef),
  decision: input.decision,
  rationale: input.rationale.trim(),
  decided_at: input.decidedAt ?? new Date().toISOString(),
});

export const projectReviewInterruptResponseStorageKey = (
  presentation: ProjectReviewInterruptPresentation,
): string =>
  `${RETAINED_RESPONSE_PREFIX}${presentation.projectId}.${presentation.interruptRef.interaction_interrupt_id}`;

const responseMatches = (
  value: unknown,
  presentation: ProjectReviewInterruptPresentation,
): value is PetraReviewInterruptResponse =>
  isRecord(value) &&
  value.schema_name === "petra.review-interrupt-response" &&
  value.schema_version === "1.0.0" &&
  typeof value.client_response_id === "string" &&
  value.project_id === presentation.projectId &&
  value.interaction_run_id === presentation.interactionRunId &&
  isRecord(value.interrupt_ref) &&
  value.interrupt_ref.interaction_interrupt_id ===
    presentation.interruptRef.interaction_interrupt_id &&
  value.interrupt_ref.revision === presentation.interruptRef.revision &&
  value.interrupt_ref.content_hash === presentation.interruptRef.content_hash &&
  isRecord(value.change_set_ref) &&
  value.change_set_ref.change_set_id ===
    presentation.changeSetRef.change_set_id &&
  value.change_set_ref.revision === presentation.changeSetRef.revision &&
  value.change_set_ref.content_hash ===
    presentation.changeSetRef.content_hash &&
  (value.decision === "accept" || value.decision === "reject") &&
  typeof value.rationale === "string" &&
  value.rationale.trim().length > 0 &&
  typeof value.decided_at === "string" &&
  !Number.isNaN(Date.parse(value.decided_at));

const sessionStorageOrUndefined = (): Storage | undefined => {
  if (typeof window === "undefined") return undefined;
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

export const readRetainedProjectReviewInterruptResponse = (
  presentation: ProjectReviewInterruptPresentation,
  storage: Pick<Storage, "getItem"> | undefined = sessionStorageOrUndefined(),
): PetraReviewInterruptResponse | undefined => {
  if (storage === undefined) return undefined;
  try {
    const encoded = storage.getItem(
      projectReviewInterruptResponseStorageKey(presentation),
    );
    if (encoded === null) return undefined;
    const value: unknown = JSON.parse(encoded);
    return responseMatches(value, presentation) ? value : undefined;
  } catch {
    return undefined;
  }
};

export const retainProjectReviewInterruptResponse = (
  presentation: ProjectReviewInterruptPresentation,
  response: PetraReviewInterruptResponse,
  storage: Pick<Storage, "setItem"> | undefined = sessionStorageOrUndefined(),
): void => {
  if (storage === undefined || !responseMatches(response, presentation)) return;
  try {
    storage.setItem(
      projectReviewInterruptResponseStorageKey(presentation),
      JSON.stringify(response),
    );
  } catch {
    // The exact response remains retained in component memory.
  }
};

const apiToken = (): string => {
  if (typeof window === "undefined") return DEVELOPMENT_TOKEN;
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN;
};

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

const exactReturnPath = (value: unknown, expected: string): value is string =>
  typeof value === "string" && value === expected;

const reviewMemberOutcome = (
  members: unknown,
  reviewMemberId: string,
): string | undefined => {
  if (!Array.isArray(members)) return undefined;
  for (const candidate of members as unknown[]) {
    if (
      isRecord(candidate) &&
      candidate["review_member_id"] === reviewMemberId &&
      typeof candidate["outcome"] === "string"
    ) {
      return candidate["outcome"];
    }
  }
  return undefined;
};

const parseReturnContext = (
  value: unknown,
  projectId: string,
): ProjectReviewInterruptReturnContext => {
  if (
    !isRecord(value) ||
    !isRecord(value.project_thread_ref) ||
    !isRecord(value.review_session_ref) ||
    !isRecord(value.work_unit_ref) ||
    !isRecord(value.destination) ||
    !isRecord(value.paths)
  ) {
    throw new Error(
      "Petra returned no exact Project thread, Review, Work, and task return context.",
    );
  }
  const thread = exactRef(
    value.project_thread_ref,
    "project_thread_id",
    PROJECT_THREAD_ID,
  );
  const review = exactRef(
    value.review_session_ref,
    "review_session_id",
    REVIEW_SESSION_ID,
  );
  const workId = stringField(value.work_unit_ref, "work_unit_id");
  const workSpecHash = stringField(value.work_unit_ref, "spec_hash");
  const workRecordHash = stringField(value.work_unit_ref, "record_hash");
  const threadRecordHash = stringField(value.project_thread_ref, "record_hash");
  const reviewMemberId = stringField(value, "review_member_id");
  const destinationPlace = stringField(value.destination, "place");
  const destinationLabel = stringField(value.destination, "label");
  const destinationObjectRef = stringField(value.destination, "object_ref");
  if (
    thread === undefined ||
    review === undefined ||
    threadRecordHash === undefined ||
    !HASH.test(threadRecordHash) ||
    workId === undefined ||
    !WORK_UNIT_ID.test(workId) ||
    !positiveRevision(value.work_unit_ref.revision) ||
    workSpecHash === undefined ||
    !HASH.test(workSpecHash) ||
    workRecordHash === undefined ||
    !HASH.test(workRecordHash) ||
    reviewMemberId === undefined ||
    !REVIEW_MEMBER_ID.test(reviewMemberId) ||
    destinationPlace === undefined ||
    destinationLabel === undefined ||
    destinationLabel.trim().length === 0
  ) {
    throw new Error("Petra returned an invalid exact task return context.");
  }
  const projectRoot = `/projects/${encodeURIComponent(projectId)}`;
  const expectedThread = `${projectRoot}/petra/${encodeURIComponent(thread.id)}`;
  const expectedReview = `${projectRoot}/review/${encodeURIComponent(review.id)}`;
  const expectedWork = `${projectRoot}/work/${encodeURIComponent(workId)}`;
  if (
    !exactReturnPath(value.paths.project_thread, expectedThread) ||
    !exactReturnPath(value.paths.review, expectedReview) ||
    !exactReturnPath(value.paths.work, expectedWork) ||
    typeof value.paths.return !== "string" ||
    !value.paths.return.startsWith(`${projectRoot}/`)
  ) {
    throw new Error(
      "Petra returned a stale or cross-Project Review return destination.",
    );
  }
  return {
    projectThreadRef: {
      projectThreadId: thread.id,
      revision: thread.revision,
      contentHash: thread.contentHash,
      recordHash: threadRecordHash,
    },
    reviewSessionRef: {
      reviewSessionId: review.id,
      revision: review.revision,
      contentHash: review.contentHash,
    },
    reviewMemberId,
    workUnitRef: {
      workUnitId: workId,
      revision: value.work_unit_ref.revision,
      specHash: workSpecHash,
      recordHash: workRecordHash,
    },
    destination: {
      place: destinationPlace,
      label: destinationLabel,
      ...(destinationObjectRef === undefined
        ? {}
        : { objectRef: destinationObjectRef }),
    },
    paths: {
      projectThread: value.paths.project_thread,
      review: value.paths.review,
      work: value.paths.work,
      return: value.paths.return,
    },
  };
};

export const projectReviewInterruptResolution = (
  value: unknown,
  response: PetraReviewInterruptResponse,
): ProjectReviewInterruptResolution => {
  if (
    !isRecord(value) ||
    typeof value.replayed !== "boolean" ||
    typeof value.response_recorded !== "boolean" ||
    value.interaction_interrupt_id !==
      response.interrupt_ref.interaction_interrupt_id ||
    !positiveRevision(value.interaction_interrupt_revision) ||
    typeof value.command_id !== "string" ||
    !isRecord(value.result) ||
    !isRecord(value.return_context)
  ) {
    throw new Error(
      "Petra returned an invalid durable Review response receipt.",
    );
  }
  const result = value.result;
  if (
    result.outcome !== "applied" &&
    result.outcome !== "rejected" &&
    result.outcome !== "reconciliation_required"
  ) {
    throw new Error("Petra returned an unsupported Review outcome.");
  }
  const request: unknown = result["request"];
  if (!isRecord(request) || request["decided_at"] !== response.decided_at) {
    throw new Error(
      "Petra returned no authenticated human checkpoint for this decision.",
    );
  }
  const checkpoint: unknown = request["checkpoint"];
  if (!isRecord(checkpoint)) {
    throw new Error(
      "Petra returned no authenticated human checkpoint for this decision.",
    );
  }
  const bindingValue: unknown = checkpoint["binding"];
  if (!isRecord(bindingValue)) {
    throw new Error(
      "Petra returned no authenticated human checkpoint for this decision.",
    );
  }
  const authorizationBasisValue: unknown = bindingValue["authorization_basis"];
  const changeSetValue: unknown = bindingValue["change_set"];
  const expectedCheckpointDecision =
    response.decision === "accept" ? "apply" : "reject";
  if (
    !isRecord(authorizationBasisValue) ||
    !isRecord(changeSetValue) ||
    bindingValue["project_id"] !== response.project_id ||
    changeSetValue["change_set_id"] !== response.change_set_ref.change_set_id ||
    changeSetValue["revision"] !== response.change_set_ref.revision ||
    changeSetValue["content_hash"] !== response.change_set_ref.content_hash ||
    authorizationBasisValue["decision"] !== expectedCheckpointDecision
  ) {
    throw new Error(
      "Petra returned a Review outcome for a different Project, ChangeSet, or decision.",
    );
  }
  const actor: unknown = authorizationBasisValue["actor"];
  if (!isRecord(actor)) {
    throw new Error(
      "Petra returned a Review outcome without authenticated human authority.",
    );
  }
  const actorId = stringField(actor, "actor_id");
  if (
    actorId === undefined ||
    !ACTOR_ID.test(actorId) ||
    actor["actor_kind"] !== "human"
  ) {
    throw new Error(
      "Petra returned a Review outcome without authenticated human authority.",
    );
  }
  const assessmentValue: unknown = result["assessment"];
  if (!isRecord(assessmentValue)) {
    throw new Error("Petra returned no durable Review recovery assessment.");
  }
  const contentValue: unknown = assessmentValue["content"];
  if (!isRecord(contentValue)) {
    throw new Error("Petra returned no durable Review recovery assessment.");
  }
  const coverageValue: unknown = contentValue["coverage"];
  const reviewValue: unknown = contentValue["review"];
  if (!isRecord(reviewValue)) {
    throw new Error(
      "Petra returned an incomplete or cross-Project Review recovery assessment.",
    );
  }
  const reviewSessionValue: unknown = reviewValue["session"];
  const reviewMembersValue: unknown = reviewValue["members"];
  if (
    typeof assessmentValue["assessment_id"] !== "string" ||
    assessmentValue["project_id"] !== response.project_id ||
    !isRecord(coverageValue) ||
    coverageValue["state"] !== "complete" ||
    !isRecord(reviewSessionValue) ||
    !Array.isArray(reviewMembersValue)
  ) {
    throw new Error(
      "Petra returned an incomplete or cross-Project Review recovery assessment.",
    );
  }
  const returnContext = parseReturnContext(
    value.return_context,
    response.project_id,
  );
  const bindingReviewSessionValue: unknown = bindingValue["review_session"];
  if (
    bindingValue["selected_review_member_id"] !==
      returnContext.reviewMemberId ||
    !isRecord(bindingReviewSessionValue) ||
    bindingReviewSessionValue["review_session_id"] !==
      returnContext.reviewSessionRef.reviewSessionId ||
    bindingReviewSessionValue["revision"] !==
      returnContext.reviewSessionRef.revision ||
    bindingReviewSessionValue["content_hash"] !==
      returnContext.reviewSessionRef.contentHash
  ) {
    throw new Error(
      "Petra returned a Review outcome for a different exact Review member or session.",
    );
  }
  const memberOutcome = reviewMemberOutcome(
    reviewMembersValue,
    returnContext.reviewMemberId,
  );
  if (memberOutcome === undefined) {
    throw new Error(
      "Petra returned no durable outcome for the exact Review member.",
    );
  }
  const snapshotState = stringField(reviewSessionValue, "snapshot_state");
  if (snapshotState === undefined) {
    throw new Error("Petra returned no Review snapshot recovery state.");
  }
  return {
    replayed: value.replayed,
    responseRecorded: value.response_recorded,
    interactionInterruptId: value.interaction_interrupt_id,
    interactionInterruptRevision: value.interaction_interrupt_revision,
    commandId: value.command_id,
    decision: response.decision,
    actorId,
    outcome: result.outcome,
    assessmentId: assessmentValue["assessment_id"],
    coverageState: "complete",
    memberOutcome,
    snapshotState,
    returnContext,
  };
};

const serverMessage = (error: InteractionInputError): string | undefined => {
  for (const issue of error.issues) {
    try {
      const body: unknown = JSON.parse(issue);
      if (
        isRecord(body) &&
        isRecord(body.error) &&
        typeof body.error.message === "string"
      ) {
        return body.error.message;
      }
    } catch {
      // Preserve the typed client's stable error when an issue is not JSON.
    }
  }
  return undefined;
};

export const resolveProjectReviewInterrupt = async (
  response: PetraReviewInterruptResponse,
): Promise<ProjectReviewInterruptResolution> => {
  const client = new PetraInteractionClient({
    endpoint: new URL("/api/interactions/run", apiBaseUrl()).toString(),
    reviewCommandEndpoint: new URL(
      "/api/commands/reviews/resolve",
      apiBaseUrl(),
    ).toString(),
    token: apiToken(),
    fetch: (input, init) => fetch(input, init),
  });
  try {
    const result = await client.resolveReview(response);
    return projectReviewInterruptResolution(result, response);
  } catch (error) {
    if (error instanceof InteractionInputError) {
      throw new Error(
        serverMessage(error) ??
          "Petra rejected this exact Review response. Reconnect the run before deciding again.",
        { cause: error },
      );
    }
    throw error;
  }
};
