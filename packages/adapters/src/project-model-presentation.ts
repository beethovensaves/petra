import type { PetraInteractionResult } from "./ag-ui.js";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readable = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/^./u, (character) => character.toLocaleUpperCase());

export interface ProjectModelProgressItem {
  readonly label: string;
  readonly status: string;
  readonly stage?: string;
}

export interface ProjectModelResultPresentation {
  readonly state: "completed" | "failed" | "disconnected" | "awaiting_response";
  readonly message: string;
  readonly answer?: string;
  readonly progress: readonly ProjectModelProgressItem[];
  readonly origins: readonly string[];
  readonly contextPacketId?: string;
  readonly evidencePacketId?: string;
  readonly snapshotId?: string;
  readonly modelDeploymentId?: string;
  readonly roleCertificationId?: string;
  readonly workUnitId?: string;
  readonly groundedResponseId?: string;
  readonly coverage?: string;
  readonly executionSource?: string;
  readonly reviewInterrupts: number;
}

const nestedString = (value: unknown, key: string): string | undefined =>
  isRecord(value) && typeof value[key] === "string" ? value[key] : undefined;

export const projectModelResultPresentation = (
  result: PetraInteractionResult,
): ProjectModelResultPresentation => {
  const reviewInterruptCount = result.pendingInterrupts.filter(
    (interrupt) => interrupt.reason === "changeset_review",
  ).length;
  const progress = result.events.flatMap((event) => {
    if (event.type !== "ACTIVITY_SNAPSHOT") return [];
    const content = event.payload.content;
    if (!isRecord(content) || typeof content.label !== "string") return [];
    return [
      {
        label: content.label,
        status:
          typeof content.status === "string" ? readable(content.status) : "",
        ...(typeof content.stage === "string"
          ? { stage: readable(content.stage) }
          : {}),
      },
    ];
  });
  const failure = result.events.find((event) => event.type === "RUN_ERROR");
  if (failure !== undefined) {
    return {
      state: "failed",
      message:
        typeof failure.payload.message === "string"
          ? failure.payload.message
          : "The certified response failed before Petra could present it.",
      progress,
      origins: [],
      reviewInterrupts: reviewInterruptCount,
    };
  }
  const terminalEvent = result.events.find(
    (event) => event.type === "RUN_FINISHED",
  );
  const terminal = terminalEvent?.payload.result;
  const answer = [...result.messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        typeof message.content === "string" &&
        message.content.length > 0,
    )?.content;
  if (!isRecord(terminal)) {
    if (reviewInterruptCount > 0) {
      return {
        state: "awaiting_response",
        message:
          "The certified run is durably paused for an authenticated response. No Review or Work authority changed when the model requested it.",
        progress,
        origins: [],
        reviewInterrupts: reviewInterruptCount,
      };
    }
    return {
      state: "disconnected",
      message:
        "This browser did not receive a terminal response. The exact run can be reconnected and replayed without starting another model call.",
      progress,
      origins: [],
      reviewInterrupts: reviewInterruptCount,
    };
  }
  if (terminal.authorityEffect !== "none" || answer === undefined) {
    return {
      state: "failed",
      message:
        "Petra withheld a response whose terminal authority or answer shape did not match the certified advisory boundary.",
      progress,
      origins: [],
      reviewInterrupts: reviewInterruptCount,
    };
  }
  const contextPacket = terminal.contextPacketRef;
  const evidencePacket = terminal.evidencePacketRef;
  const terminalBinding = terminal.terminalBinding;
  const coverage = terminal.coverage;
  return {
    state: "completed",
    message:
      "The grounded response is complete and has no Project authority effect.",
    answer,
    progress,
    origins: Array.isArray(terminal.statementOrigins)
      ? terminal.statementOrigins.filter(
          (origin): origin is string => typeof origin === "string",
        )
      : [],
    ...(nestedString(contextPacket, "context_packet_id") === undefined
      ? {}
      : {
          contextPacketId: nestedString(contextPacket, "context_packet_id")!,
        }),
    ...(nestedString(evidencePacket, "evidence_packet_id") === undefined
      ? {}
      : {
          evidencePacketId: nestedString(evidencePacket, "evidence_packet_id")!,
        }),
    ...(typeof terminal.snapshotId === "string"
      ? { snapshotId: terminal.snapshotId }
      : {}),
    ...(typeof terminal.modelDeploymentId === "string"
      ? { modelDeploymentId: terminal.modelDeploymentId }
      : {}),
    ...(typeof terminal.roleCertificationId === "string"
      ? { roleCertificationId: terminal.roleCertificationId }
      : {}),
    ...(nestedString(terminalBinding, "work_unit_id") === undefined
      ? {}
      : { workUnitId: nestedString(terminalBinding, "work_unit_id")! }),
    ...(nestedString(terminalBinding, "grounded_response_id") === undefined
      ? {}
      : {
          groundedResponseId: nestedString(
            terminalBinding,
            "grounded_response_id",
          )!,
        }),
    ...(isRecord(coverage) && typeof coverage.statement === "string"
      ? {
          coverage: `${coverage.statement}${
            typeof coverage.state === "string"
              ? ` Coverage: ${readable(coverage.state)}.`
              : ""
          }`,
        }
      : {}),
    ...(typeof terminal.executionSource === "string"
      ? { executionSource: readable(terminal.executionSource) }
      : {}),
    reviewInterrupts: reviewInterruptCount,
  };
};
