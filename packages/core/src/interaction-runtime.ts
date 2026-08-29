import { createHash } from "node:crypto";

export type PetraFixtureMode = "success" | "review" | "terminal_error";

export type WorkUnitStatus =
  | "queued"
  | "running"
  | "awaiting_review"
  | "completed"
  | "failed"
  | "cancelled";

export interface InteractionIdentity {
  threadId: string;
  runId: string;
  workUnitId: string;
  modelRequestId: string;
  requestId: string;
  traceId: string;
}

interface EventEnvelope extends InteractionIdentity {
  sequence: number;
  timestamp: number;
}

export type PetraInteractionEvent =
  | (EventEnvelope & { kind: "run.started" })
  | (EventEnvelope & {
      kind: "state.snapshot";
      state: {
        activeHypothesis: { reference: string; descriptor: string };
        posture: "collaborative_research_assistant";
        workUnitStatus: WorkUnitStatus;
      };
    })
  | (EventEnvelope & {
      kind: "activity.snapshot";
      activityType: "petra.work_unit.status";
      content: {
        label: string;
        status: WorkUnitStatus;
        workUnitRevision: number;
      };
    })
  | (EventEnvelope & {
      kind: "tool.proposal";
      toolCallId: string;
      toolName: "petra.inspect_evidence" | "petra.review_changeset";
      arguments: Record<string, unknown>;
    })
  | (EventEnvelope & { kind: "text.start"; messageId: string })
  | (EventEnvelope & { kind: "text.delta"; messageId: string; delta: string })
  | (EventEnvelope & { kind: "text.end"; messageId: string })
  | (EventEnvelope & {
      kind: "review.interrupt";
      interruptId: string;
      changeSetId: string;
      changeSetRevision: number;
      changeSetContentHash: string;
      toolCallId: string;
    })
  | (EventEnvelope & { kind: "run.finished"; result: Record<string, unknown> })
  | (EventEnvelope & { kind: "run.error"; code: string; message: string });

type PetraInteractionEventInput = PetraInteractionEvent extends infer Event
  ? Event extends EventEnvelope
    ? Omit<Event, keyof EventEnvelope>
    : never
  : never;

type ReviewInterruptEvent = Extract<
  PetraInteractionEvent,
  { kind: "review.interrupt" }
>;

export interface StartInteractionRequest {
  threadId: string;
  runId: string;
  prompt: string;
  requestId: string;
  traceId: string;
  fixtureMode?: PetraFixtureMode;
}

export interface ReviewCommand {
  commandId: string;
  interruptId: string;
  runId: string;
  decision: "accept" | "reject" | "revise";
}

export interface CancellationCommand {
  commandId: string;
  runId: string;
}

export interface CommandResult {
  applied: boolean;
  commandId: string;
  effectId: string;
  runId: string;
}

export interface InteractionRunSnapshot extends InteractionIdentity {
  status: WorkUnitStatus;
  eventCount: number;
  delivery: {
    completed: number;
    aborted: number;
    writeErrors: number;
  };
}

interface RunRecord {
  identity: InteractionIdentity;
  status: WorkUnitStatus;
  events: PetraInteractionEvent[];
  terminal: boolean;
  cancellationRequested: boolean;
  listeners: Set<() => void>;
  delivery: InteractionRunSnapshot["delivery"];
  task: Promise<void>;
}

export interface InteractionRuntimeOptions {
  stepDelayMs?: number;
  now?: () => number;
}

const pause = async (milliseconds: number): Promise<void> => {
  if (milliseconds <= 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

const normalizedIdPart = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const deterministicFixtureUlid = (seed: string): string => {
  const bytes = createHash("sha256").update(seed).digest().subarray(0, 16);
  let value = BigInt(`0x${bytes.toString("hex")}`);
  let encoded = "";
  for (let index = 0; index < 26; index += 1) {
    encoded = CROCKFORD_BASE32[Number(value & 31n)] + encoded;
    value >>= 5n;
  }
  return encoded;
};

const fixturePetraId = (kind: string, runId: string): string =>
  `${kind}_${deterministicFixtureUlid(`${kind}:${runId}`)}`;

const fixtureContentHash = (subject: string): string =>
  `sha256:${createHash("sha256").update(subject).digest("hex")}`;

export class PetraInteractionRuntime {
  readonly #runs = new Map<string, RunRecord>();
  readonly #commandEffects = new Map<string, CommandResult>();
  readonly #stepDelayMs: number;
  readonly #now: () => number;
  #accepting = true;

  constructor(options: InteractionRuntimeOptions = {}) {
    this.#stepDelayMs = options.stepDelayMs ?? 2;
    this.#now = options.now ?? Date.now;
  }

  get accepting(): boolean {
    return this.#accepting;
  }

  startInteraction(request: StartInteractionRequest): InteractionRunSnapshot {
    if (!this.#accepting) {
      throw new Error("Petra is draining and is not accepting new work.");
    }

    const existing = this.#runs.get(request.runId);
    if (existing !== undefined) {
      if (
        existing.identity.threadId !== request.threadId ||
        existing.identity.traceId !== request.traceId
      ) {
        throw new Error("Run identity conflicts with an existing interaction.");
      }
      return this.snapshot(request.runId);
    }

    const safeRunId = normalizedIdPart(request.runId);
    const identity: InteractionIdentity = {
      threadId: request.threadId,
      runId: request.runId,
      workUnitId: fixturePetraId("work_unit", safeRunId),
      modelRequestId: fixturePetraId("model_request", safeRunId),
      requestId: request.requestId,
      traceId: request.traceId,
    };
    const record: RunRecord = {
      identity,
      status: "queued",
      events: [],
      terminal: false,
      cancellationRequested: false,
      listeners: new Set(),
      delivery: { completed: 0, aborted: 0, writeErrors: 0 },
      task: Promise.resolve(),
    };
    this.#runs.set(request.runId, record);
    record.task = this.#execute(record, request).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unknown fixture failure";
      this.#append(record, {
        kind: "run.error",
        code: "FIXTURE_FAILURE",
        message,
      });
      record.status = "failed";
      record.terminal = true;
      this.#wake(record);
    });
    return this.snapshot(request.runId);
  }

  async *streamInteraction(
    runId: string,
    afterSequence = 0,
    signal?: AbortSignal,
  ): AsyncGenerator<PetraInteractionEvent> {
    const record = this.#requireRun(runId);
    let cursor = afterSequence;

    while (true) {
      const available = record.events.filter(
        (event) => event.sequence > cursor,
      );
      for (const event of available) {
        cursor = event.sequence;
        yield event;
      }

      if (record.terminal || signal?.aborted === true) return;
      await new Promise<void>((resolve) => {
        const wake = (): void => {
          signal?.removeEventListener("abort", wake);
          record.listeners.delete(wake);
          resolve();
        };
        record.listeners.add(wake);
        signal?.addEventListener("abort", wake, { once: true });
      });
    }
  }

  cancel(command: CancellationCommand): CommandResult {
    const prior = this.#commandEffects.get(command.commandId);
    if (prior !== undefined) return { ...prior, applied: false };

    const record = this.#requireRun(command.runId);
    record.cancellationRequested = true;
    const result = {
      applied: true,
      commandId: command.commandId,
      effectId: `cancellation_${normalizedIdPart(command.runId)}`,
      runId: command.runId,
    } satisfies CommandResult;
    this.#commandEffects.set(command.commandId, result);
    return result;
  }

  resolveReview(command: ReviewCommand): CommandResult {
    const prior = this.#commandEffects.get(command.commandId);
    if (prior !== undefined) return { ...prior, applied: false };

    const record = this.#requireRun(command.runId);
    const interrupt = record.events.find(
      (event): event is ReviewInterruptEvent =>
        event.kind === "review.interrupt" &&
        event.interruptId === command.interruptId,
    );
    if (interrupt === undefined) throw new Error("Unknown review interrupt.");

    const result = {
      applied: true,
      commandId: command.commandId,
      effectId: interrupt.changeSetId,
      runId: command.runId,
    } satisfies CommandResult;
    this.#commandEffects.set(command.commandId, result);
    return result;
  }

  recordDelivery(
    runId: string,
    outcome: "completed" | "aborted" | "write_error",
  ): void {
    const record = this.#requireRun(runId);
    if (outcome === "completed") record.delivery.completed += 1;
    if (outcome === "aborted") record.delivery.aborted += 1;
    if (outcome === "write_error") record.delivery.writeErrors += 1;
  }

  snapshot(runId: string): InteractionRunSnapshot {
    const record = this.#requireRun(runId);
    return {
      ...record.identity,
      status: record.status,
      eventCount: record.events.length,
      delivery: { ...record.delivery },
    };
  }

  diagnostics(): {
    accepting: boolean;
    runs: number;
    activeRuns: number;
    commandEffects: number;
  } {
    return {
      accepting: this.#accepting,
      runs: this.#runs.size,
      activeRuns: [...this.#runs.values()].filter((record) => !record.terminal)
        .length,
      commandEffects: this.#commandEffects.size,
    };
  }

  stopAdmission(): void {
    this.#accepting = false;
  }

  async drain(): Promise<void> {
    await Promise.all([...this.#runs.values()].map((record) => record.task));
  }

  #requireRun(runId: string): RunRecord {
    const record = this.#runs.get(runId);
    if (record === undefined)
      throw new Error(`Unknown interaction run: ${runId}`);
    return record;
  }

  #wake(record: RunRecord): void {
    for (const listener of [...record.listeners]) listener();
  }

  #append(record: RunRecord, event: PetraInteractionEventInput): void {
    const envelope: PetraInteractionEvent = {
      ...record.identity,
      sequence: record.events.length + 1,
      timestamp: this.#now(),
      ...event,
    };
    record.events.push(envelope);
    this.#wake(record);
  }

  async #stage(record: RunRecord): Promise<boolean> {
    await pause(this.#stepDelayMs);
    if (!record.cancellationRequested) return true;

    record.status = "cancelled";
    this.#append(record, {
      kind: "run.error",
      code: "WORK_UNIT_CANCELLED",
      message: "The WorkUnit was cancelled by an explicit Petra command.",
    });
    record.terminal = true;
    this.#wake(record);
    return false;
  }

  async #execute(
    record: RunRecord,
    request: StartInteractionRequest,
  ): Promise<void> {
    const messageId = `message_${normalizedIdPart(request.runId)}`;
    const toolCallId = `tool_${normalizedIdPart(request.runId)}`;
    const changeSetId = fixturePetraId("change_set", request.runId);
    const changeSetRevision = 1;
    const changeSetContentHash = fixtureContentHash(
      `change-set:${request.runId}`,
    );
    const interruptId = fixturePetraId("interaction_interrupt", request.runId);

    this.#append(record, { kind: "run.started" });
    if (!(await this.#stage(record))) return;

    record.status = "running";
    this.#append(record, {
      kind: "state.snapshot",
      state: {
        activeHypothesis: {
          reference: "H01",
          descriptor:
            "The current working explanation for the research question",
        },
        posture: "collaborative_research_assistant",
        workUnitStatus: "running",
      },
    });
    this.#append(record, {
      kind: "activity.snapshot",
      activityType: "petra.work_unit.status",
      content: {
        label: "Inspecting the local evidence path",
        status: "running",
        workUnitRevision: 1,
      },
    });
    if (!(await this.#stage(record))) return;

    this.#append(record, {
      kind: "tool.proposal",
      toolCallId,
      toolName:
        request.fixtureMode === "review"
          ? "petra.review_changeset"
          : "petra.inspect_evidence",
      arguments:
        request.fixtureMode === "review"
          ? { changeSetId, hypothesisReference: "H01" }
          : { hypothesisReference: "H01", prompt: request.prompt },
    });

    if (request.fixtureMode === "terminal_error") {
      record.status = "failed";
      this.#append(record, {
        kind: "run.error",
        code: "DETERMINISTIC_TERMINAL_ERROR",
        message: "The deterministic fixture requested a terminal error.",
      });
      record.terminal = true;
      this.#wake(record);
      return;
    }

    if (request.fixtureMode === "review") {
      record.status = "awaiting_review";
      this.#append(record, {
        kind: "review.interrupt",
        interruptId,
        changeSetId,
        changeSetRevision,
        changeSetContentHash,
        toolCallId,
      });
      record.terminal = true;
      this.#wake(record);
      return;
    }

    if (!(await this.#stage(record))) return;
    this.#append(record, { kind: "text.start", messageId });
    this.#append(record, {
      kind: "text.delta",
      messageId,
      delta:
        "H01 — The current working explanation for the research question. I found a bounded evidence path; inspect its sources before treating the explanation as established.",
    });
    this.#append(record, { kind: "text.end", messageId });
    record.status = "completed";
    this.#append(record, {
      kind: "run.finished",
      result: {
        hypothesisReference: "H01",
        evidenceScope: "deterministic_m1_fixture",
        workUnitId: record.identity.workUnitId,
      },
    });
    record.terminal = true;
    this.#wake(record);
  }
}
