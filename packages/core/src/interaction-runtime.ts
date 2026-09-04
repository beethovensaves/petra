import { createHash } from "node:crypto";

import type { PetraReviewInterruptResponse } from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type {
  GroundedSynthesisInteractionExecutorPort,
  GroundedSynthesisInteractionResult,
  GroundedSynthesisProgress,
  GroundedSynthesisTerminalBinding,
  GroundedSynthesisTerminalPort,
} from "./grounded-synthesis-interaction.js";
import type {
  ReviewInterruptBoundary,
  ReviewInterruptResolutionResult,
  ReviewResolutionContext,
} from "./durable-review-interrupt.js";
import type {
  InteractionDeliveryRecord,
  InteractionHistoryPort,
} from "./interaction-history.js";

export type PetraFixtureMode = "success" | "review" | "terminal_error";
export type PetraInteractionWorkflow = "fixture" | "grounded_synthesis";

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
      activityType:
        | "petra.work_unit.status"
        | "petra.retrieval.status"
        | "petra.evidence_packet.status"
        | "petra.model.status"
        | "petra.validation.status";
      content: {
        label: string;
        status: WorkUnitStatus;
        workUnitRevision: number;
        stage?: GroundedSynthesisProgress["stage"];
        detail?: GroundedSynthesisProgress["detail"];
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
      interruptRevision: number;
      interruptContentHash: string;
      interactionRunId: string;
      projectId: string;
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
type ActivitySnapshotEvent = Extract<
  PetraInteractionEvent,
  { kind: "activity.snapshot" }
>;

export interface StartInteractionRequest {
  threadId: string;
  runId: string;
  prompt: string;
  requestId: string;
  traceId: string;
  workflow?: PetraInteractionWorkflow;
  fixtureMode?: PetraFixtureMode;
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
  inputHash: string;
  status: WorkUnitStatus;
  events: PetraInteractionEvent[];
  terminal: boolean;
  cancellationRequested: boolean;
  listeners: Set<() => void>;
  delivery: InteractionRunSnapshot["delivery"];
  abortController: AbortController;
  task: Promise<void>;
}

export interface InteractionRuntimeOptions {
  stepDelayMs?: number;
  now?: () => number;
  reviewBoundary?: ReviewInterruptBoundary;
  groundedSynthesisExecutor?: GroundedSynthesisInteractionExecutorPort;
  groundedSynthesisTerminal?: GroundedSynthesisTerminalPort;
  interactionHistory?: InteractionHistoryPort;
}

export interface InteractionDeliveryContext {
  readonly connectionId: string;
  readonly deliveryKind: "initial" | "resume" | "replay";
  readonly afterSequence: number;
  readonly lastDeliveredSequence: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly error?: { readonly code: string; readonly message: string };
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

const promptHash = (prompt: string): string =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify({ prompt }))
    .digest("hex")}`;

const canonicalClone = <Value>(value: Value): Value =>
  JSON.parse(canonicalize(value)) as Value;

export class PetraInteractionRuntime {
  readonly #runs = new Map<string, RunRecord>();
  readonly #commandEffects = new Map<string, CommandResult>();
  readonly #stepDelayMs: number;
  readonly #now: () => number;
  readonly #reviewBoundary: ReviewInterruptBoundary | undefined;
  readonly #groundedSynthesisExecutor:
    GroundedSynthesisInteractionExecutorPort | undefined;
  readonly #groundedSynthesisTerminal:
    GroundedSynthesisTerminalPort | undefined;
  readonly #interactionHistory: InteractionHistoryPort | undefined;
  readonly #deliveryTasks = new Set<Promise<void>>();
  #accepting = true;

  constructor(options: InteractionRuntimeOptions = {}) {
    this.#stepDelayMs = options.stepDelayMs ?? 2;
    this.#now = options.now ?? Date.now;
    this.#reviewBoundary = options.reviewBoundary;
    this.#groundedSynthesisExecutor = options.groundedSynthesisExecutor;
    this.#groundedSynthesisTerminal = options.groundedSynthesisTerminal;
    this.#interactionHistory = options.interactionHistory;
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
        existing.inputHash !== promptHash(request.prompt)
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
      inputHash: promptHash(request.prompt),
      status: "queued",
      events: [],
      terminal: false,
      cancellationRequested: false,
      listeners: new Set(),
      delivery: { completed: 0, aborted: 0, writeErrors: 0 },
      abortController: new AbortController(),
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

      if (record.events.some((event) => event.sequence > cursor)) continue;
      if (record.terminal || signal?.aborted === true) return;
      await new Promise<void>((resolve) => {
        const wake = (): void => {
          signal?.removeEventListener("abort", wake);
          record.listeners.delete(wake);
          resolve();
        };
        record.listeners.add(wake);
        signal?.addEventListener("abort", wake, { once: true });
        if (
          record.terminal ||
          signal?.aborted === true ||
          record.events.some((event) => event.sequence > cursor)
        ) {
          wake();
        }
      });
    }
  }

  async restoreInteraction(
    threadId: string,
    runId: string,
    prompt?: string,
  ): Promise<InteractionRunSnapshot | undefined> {
    const existing = this.#runs.get(runId);
    if (existing !== undefined) {
      if (existing.identity.threadId !== threadId) {
        throw new Error("Run identity conflicts with an existing interaction.");
      }
      if (prompt !== undefined && existing.inputHash !== promptHash(prompt)) {
        throw new Error("Run input conflicts with an existing interaction.");
      }
      return this.snapshot(runId);
    }
    const restored = await this.#interactionHistory?.restore(threadId, runId);
    if (restored === undefined) return undefined;
    if (
      prompt !== undefined &&
      restored.run.content.input.input_hash !== promptHash(prompt)
    ) {
      throw new Error("Run input conflicts with durable interaction history.");
    }
    const first = restored.events[0];
    const last = restored.events.at(-1);
    const correlation = restored.run.content.correlation;
    const identity: InteractionIdentity = {
      threadId,
      runId,
      workUnitId: correlation.work_unit_ref.work_unit_id,
      modelRequestId:
        last?.modelRequestId ?? correlation.model_request_id ?? "unavailable",
      requestId: first?.requestId ?? correlation.request_id,
      traceId: first?.traceId ?? correlation.trace_id,
    };
    const active = ["queued", "running"].includes(
      restored.run.content.lifecycle.state,
    );
    const record: RunRecord = {
      identity,
      inputHash: restored.run.content.input.input_hash,
      status: restored.status,
      events: structuredClone(restored.events) as PetraInteractionEvent[],
      terminal: !active,
      cancellationRequested: false,
      listeners: new Set(),
      delivery: { completed: 0, aborted: 0, writeErrors: 0 },
      abortController: new AbortController(),
      task: Promise.resolve(),
    };
    this.#runs.set(runId, record);
    return this.snapshot(runId);
  }

  cancel(command: CancellationCommand): CommandResult {
    const prior = this.#commandEffects.get(command.commandId);
    if (prior !== undefined) return { ...prior, applied: false };

    const record = this.#requireRun(command.runId);
    record.cancellationRequested = true;
    record.abortController.abort();
    const result = {
      applied: true,
      commandId: command.commandId,
      effectId: `cancellation_${normalizedIdPart(command.runId)}`,
      runId: command.runId,
    } satisfies CommandResult;
    this.#commandEffects.set(command.commandId, result);
    return result;
  }

  async resolveReview(
    response: PetraReviewInterruptResponse,
    context: ReviewResolutionContext,
  ): Promise<ReviewInterruptResolutionResult> {
    if (this.#reviewBoundary === undefined) {
      throw new Error(
        "No durable review command boundary is configured for this runtime.",
      );
    }
    const record = this.#requireRunByInteractionId(response.interaction_run_id);
    const interrupt = record.events.find(
      (event): event is ReviewInterruptEvent =>
        event.kind === "review.interrupt" &&
        event.interruptId === response.interrupt_ref.interaction_interrupt_id,
    );
    if (
      interrupt === undefined ||
      interrupt.interruptRevision !== response.interrupt_ref.revision ||
      interrupt.interruptContentHash !== response.interrupt_ref.content_hash
    ) {
      throw new Error(
        "The response does not match a presented review interrupt.",
      );
    }
    return this.#reviewBoundary.resolveReview(response, context);
  }

  recordDelivery(
    runId: string,
    outcome: "completed" | "aborted" | "write_error",
    context?: InteractionDeliveryContext,
  ): Promise<void> {
    const record = this.#requireRun(runId);
    if (outcome === "completed") record.delivery.completed += 1;
    if (outcome === "aborted") record.delivery.aborted += 1;
    if (outcome === "write_error") record.delivery.writeErrors += 1;
    if (context === undefined || this.#interactionHistory === undefined) {
      return Promise.resolve();
    }
    const delivery: InteractionDeliveryRecord = {
      ...context,
      threadId: record.identity.threadId,
      runId,
      outcome,
    };
    const task = (async (): Promise<void> => {
      await record.task;
      await this.#interactionHistory?.recordDelivery(delivery);
    })();
    this.#deliveryTasks.add(task);
    void task.then(
      () => this.#deliveryTasks.delete(task),
      () => this.#deliveryTasks.delete(task),
    );
    return task;
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
    await Promise.all([...this.#deliveryTasks]);
  }

  #requireRun(runId: string): RunRecord {
    const record = this.#runs.get(runId);
    if (record === undefined)
      throw new Error(`Unknown interaction run: ${runId}`);
    return record;
  }

  #requireRunByInteractionId(interactionRunId: string): RunRecord {
    const record = [...this.#runs.values()].find((candidate) =>
      candidate.events.some(
        (event) =>
          event.kind === "review.interrupt" &&
          event.interactionRunId === interactionRunId,
      ),
    );
    if (record === undefined) {
      throw new Error(`Unknown interaction run identity: ${interactionRunId}`);
    }
    return record;
  }

  #wake(record: RunRecord): void {
    for (const listener of [...record.listeners]) listener();
  }

  #append(record: RunRecord, event: PetraInteractionEventInput): void {
    this.#publish(record, this.#prepare(record, [event]));
  }

  #prepare(
    record: RunRecord,
    events: readonly PetraInteractionEventInput[],
  ): PetraInteractionEvent[] {
    return events.map((event, index) =>
      canonicalClone({
        ...record.identity,
        sequence: record.events.length + index + 1,
        timestamp: this.#now(),
        ...event,
      }),
    );
  }

  #publish(record: RunRecord, events: readonly PetraInteractionEvent[]): void {
    for (const event of events) {
      if (event.sequence !== record.events.length + 1) {
        throw new Error("Interaction events must be published contiguously.");
      }
      record.events.push(event);
    }
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
    if (request.workflow === "grounded_synthesis") {
      await this.#executeGroundedSynthesis(record, request);
      return;
    }
    const messageId = `message_${normalizedIdPart(request.runId)}`;
    const toolCallId = `tool_${normalizedIdPart(request.runId)}`;
    let changeSetId = fixturePetraId("change_set", request.runId);
    let changeSetRevision = 1;
    let changeSetContentHash = fixtureContentHash(
      `change-set:${request.runId}`,
    );
    let interruptId = fixturePetraId("interaction_interrupt", request.runId);
    let interruptRevision = 1;
    let interruptContentHash = fixtureContentHash(
      `interaction-interrupt:${request.runId}`,
    );
    let interactionRunId = fixturePetraId("interaction_run", request.runId);
    let projectId = fixturePetraId("project", request.runId);

    if (
      request.fixtureMode === "review" &&
      this.#reviewBoundary !== undefined
    ) {
      const presentation = await this.#reviewBoundary.presentReview(
        request.runId,
      );
      changeSetId = presentation.change_set_ref.change_set_id;
      changeSetRevision = presentation.change_set_ref.revision;
      changeSetContentHash = presentation.change_set_ref.content_hash;
      interruptId = presentation.interrupt_ref.interaction_interrupt_id;
      interruptRevision = presentation.interrupt_ref.revision;
      interruptContentHash = presentation.interrupt_ref.content_hash;
      interactionRunId = presentation.interaction_run_id;
      projectId = presentation.project_id;
    }

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
        interruptRevision,
        interruptContentHash,
        interactionRunId,
        projectId,
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

  #appendGroundedProgress(
    record: RunRecord,
    progress: GroundedSynthesisProgress,
  ): void {
    if (progress.detail.model_request_id !== undefined) {
      record.identity.modelRequestId = progress.detail.model_request_id;
    }
    const activityType = {
      retrieval: "petra.retrieval.status",
      packet_compilation: "petra.evidence_packet.status",
      model_execution: "petra.model.status",
      validation: "petra.validation.status",
      persistence: "petra.work_unit.status",
    }[progress.stage] as ActivitySnapshotEvent["activityType"];
    this.#append(record, {
      kind: "activity.snapshot",
      activityType,
      content: {
        label: progress.label,
        status: progress.status === "running" ? "running" : "completed",
        workUnitRevision: record.events.length + 1,
        stage: progress.stage,
        detail: structuredClone(progress.detail),
      },
    });
  }

  async #executeGroundedSynthesis(
    record: RunRecord,
    request: StartInteractionRequest,
  ): Promise<void> {
    const messageId = `message_${normalizedIdPart(request.runId)}`;
    this.#append(record, { kind: "run.started" });
    record.status = "running";
    this.#append(record, {
      kind: "state.snapshot",
      state: {
        activeHypothesis: {
          reference: "H01",
          descriptor: "The current working explanation under evidence review",
        },
        posture: "collaborative_research_assistant",
        workUnitStatus: "running",
      },
    });
    if (this.#groundedSynthesisExecutor === undefined) {
      record.status = "failed";
      this.#append(record, {
        kind: "run.error",
        code: "GROUNDED_SYNTHESIS_UNAVAILABLE",
        message:
          "No certified grounded-synthesis executor is configured for this Petra server.",
      });
      record.terminal = true;
      this.#wake(record);
      return;
    }

    let result: GroundedSynthesisInteractionResult;
    try {
      result = await this.#groundedSynthesisExecutor.execute({
        prompt: request.prompt,
        signal: record.abortController.signal,
        onProgress: (progress) =>
          this.#appendGroundedProgress(record, progress),
      });
    } catch (error) {
      const cancelled =
        record.cancellationRequested || record.abortController.signal.aborted;
      record.status = cancelled ? "cancelled" : "failed";
      this.#append(record, {
        kind: "run.error",
        code: cancelled ? "WORK_UNIT_CANCELLED" : "GROUNDED_SYNTHESIS_FAILED",
        message: cancelled
          ? "The WorkUnit was cancelled by an explicit Petra command."
          : error instanceof Error
            ? error.message
            : "The grounded synthesis failed without an accepted response.",
      });
      record.terminal = true;
      this.#wake(record);
      return;
    }
    if (record.cancellationRequested) {
      record.status = "cancelled";
      this.#append(record, {
        kind: "run.error",
        code: "WORK_UNIT_CANCELLED",
        message: "The WorkUnit was cancelled by an explicit Petra command.",
      });
      record.terminal = true;
      this.#wake(record);
      return;
    }

    record.identity.modelRequestId = result.model_request_id;
    let terminalBinding: GroundedSynthesisTerminalBinding | undefined;
    if (this.#groundedSynthesisTerminal !== undefined) {
      this.#appendGroundedProgress(record, {
        stage: "persistence",
        status: "running",
        label: "Persisting exact grounded-response authority",
        detail: { authority_effect: "none" },
      });
      try {
        terminalBinding = await this.#groundedSynthesisTerminal.persist({
          interaction: {
            protocol_thread_id: record.identity.threadId,
            protocol_run_id: record.identity.runId,
            request_id: record.identity.requestId,
            trace_id: record.identity.traceId,
            work_unit_id: record.identity.workUnitId,
            started_at: new Date(
              record.events[0]?.timestamp ?? this.#now(),
            ).toISOString(),
          },
          prompt: request.prompt,
          result,
          presentation_events: structuredClone(record.events),
        });
      } catch (error) {
        record.status = "failed";
        this.#append(record, {
          kind: "run.error",
          code: "GROUNDED_TERMINAL_PERSISTENCE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "The grounded response terminal could not be persisted.",
        });
        record.terminal = true;
        this.#wake(record);
        return;
      }
    }

    const tail = this.#prepare(record, [
      ...(terminalBinding === undefined
        ? []
        : [
            {
              kind: "activity.snapshot" as const,
              activityType: "petra.work_unit.status" as const,
              content: {
                label: "Exact grounded-response authority persisted",
                status: "completed" as const,
                workUnitRevision: terminalBinding.work_unit_revision,
                stage: "persistence" as const,
                detail: { authority_effect: "none" as const },
              },
            },
          ]),
      {
        kind: "state.snapshot",
        state: {
          activeHypothesis: structuredClone(result.hypothesis),
          posture: "collaborative_research_assistant",
          workUnitStatus: "running",
        },
      },
      { kind: "text.start", messageId },
      { kind: "text.delta", messageId, delta: result.rendered_text },
      { kind: "text.end", messageId },
      {
        kind: "activity.snapshot",
        activityType: "petra.work_unit.status",
        content: {
          label: "Grounded response ready",
          status: "completed",
          workUnitRevision: terminalBinding?.work_unit_revision ?? 1,
        },
      },
      {
        kind: "run.finished",
        result: {
          hypothesisReference: result.hypothesis.reference,
          contextPacketRef: result.context_packet_ref,
          evidencePacketRef: result.evidence_packet_ref,
          snapshotId: result.snapshot_id,
          modelRequestId: result.model_request_id,
          modelCallId: result.model_call_id,
          modelDeploymentId: result.model_deployment_id,
          roleCertificationId: result.role_certification_id,
          outputHash: result.output_hash,
          executionSource: result.execution_source,
          statementOrigins: result.output.statements.map(
            (statement) => statement.origin,
          ),
          coverage: structuredClone(result.output.coverage),
          trace: structuredClone(result.trace),
          cost: structuredClone(result.cost),
          authorityEffect: "none",
          ...(terminalBinding === undefined
            ? {}
            : { terminalBinding: structuredClone(terminalBinding) }),
        },
      },
    ]);
    if (
      terminalBinding !== undefined &&
      this.#groundedSynthesisTerminal?.persistPresentation !== undefined
    ) {
      try {
        await this.#groundedSynthesisTerminal.persistPresentation({
          binding: terminalBinding,
          events: tail,
        });
      } catch (error) {
        record.status = "failed";
        this.#append(record, {
          kind: "run.error",
          code: "GROUNDED_PRESENTATION_PERSISTENCE_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "The answer-bearing presentation could not be persisted.",
        });
        record.terminal = true;
        this.#wake(record);
        return;
      }
    }
    record.status = "completed";
    this.#publish(record, tail);
    record.terminal = true;
    this.#wake(record);
  }
}
