import { HttpAgent } from "@ag-ui/client";
import {
  EventType,
  RunAgentInputSchema,
  type BaseEvent,
  type RunAgentInput,
} from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import type {
  PetraInteractionCustomEvent,
  PetraReviewInterruptResponse,
} from "@petra/contracts";
import type {
  PetraFixtureMode,
  PetraInteractionEvent,
  PetraInteractionWorkflow,
  StartInteractionRequest,
} from "@petra/core";

export const PETRA_AG_UI_PROFILE = {
  sdkVersion: "0.0.59",
  standardEvents: [
    "RUN_STARTED",
    "RUN_FINISHED",
    "RUN_ERROR",
    "TEXT_MESSAGE_START",
    "TEXT_MESSAGE_CONTENT",
    "TEXT_MESSAGE_END",
    "TOOL_CALL_START",
    "TOOL_CALL_ARGS",
    "TOOL_CALL_END",
    "STATE_SNAPSHOT",
    "ACTIVITY_SNAPSHOT",
    "CUSTOM",
  ],
  customEvents: {
    "petra.work_unit.status": "1.0.0",
    "petra.review.interrupt": "1.0.0",
  },
} as const;

export const toAgUiCustomEvent = (
  event: PetraInteractionCustomEvent,
  metadata: Record<string, unknown> = {},
): BaseEvent => ({
  type: EventType.CUSTOM,
  name: event.event_name,
  value: event,
  metadata,
});

export class InteractionInputError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "InteractionInputError";
    this.issues = issues;
  }
}

interface PetraForwardedProps {
  workflow: PetraInteractionWorkflow;
  fixtureMode: PetraFixtureMode;
  afterSequence: number;
  connectionId?: string;
}

export interface ParsedInteractionInput {
  input: RunAgentInput;
  request: StartInteractionRequest;
  afterSequence: number;
  connectionId?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertAllowedKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void => {
  const unknownKeys = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    throw new InteractionInputError(
      `${label} contains unregistered fields.`,
      unknownKeys,
    );
  }
};

const parseForwardedProps = (value: unknown): PetraForwardedProps => {
  if (value === undefined || value === null) {
    return { workflow: "fixture", fixtureMode: "success", afterSequence: 0 };
  }
  if (!isRecord(value))
    throw new InteractionInputError("forwardedProps must be an object.");
  assertAllowedKeys(value, new Set(["petra"]), "forwardedProps");

  const petra = value.petra;
  if (petra === undefined) {
    return { workflow: "fixture", fixtureMode: "success", afterSequence: 0 };
  }
  if (!isRecord(petra))
    throw new InteractionInputError("forwardedProps.petra must be an object.");
  assertAllowedKeys(
    petra,
    new Set(["workflow", "fixtureMode", "afterSequence", "connectionId"]),
    "forwardedProps.petra",
  );

  const workflow = petra.workflow ?? "fixture";
  if (!(workflow === "fixture" || workflow === "grounded_synthesis")) {
    throw new InteractionInputError(
      "workflow is not registered in the M1 profile.",
    );
  }
  const fixtureMode = petra.fixtureMode ?? "success";
  if (
    !(["success", "review", "terminal_error"] as unknown[]).includes(
      fixtureMode,
    )
  ) {
    throw new InteractionInputError(
      "fixtureMode is not registered in the M1 profile.",
    );
  }
  if (workflow === "grounded_synthesis" && petra.fixtureMode !== undefined) {
    throw new InteractionInputError(
      "fixtureMode cannot be combined with the grounded_synthesis workflow.",
    );
  }
  const afterSequence = petra.afterSequence ?? 0;
  if (!Number.isSafeInteger(afterSequence) || (afterSequence as number) < 0) {
    throw new InteractionInputError(
      "afterSequence must be a non-negative safe integer.",
    );
  }
  const connectionId = petra.connectionId;
  if (
    connectionId !== undefined &&
    (typeof connectionId !== "string" ||
      !/^interaction_connection_[0-9A-HJKMNP-TV-Z]{26}$/.test(connectionId))
  ) {
    throw new InteractionInputError(
      "connectionId must be a Petra InteractionConnection identifier.",
    );
  }
  return {
    workflow,
    fixtureMode: fixtureMode as PetraFixtureMode,
    afterSequence: afterSequence as number,
    ...(connectionId === undefined ? {} : { connectionId }),
  };
};

const messageText = (message: RunAgentInput["messages"][number]): string => {
  if (!("content" in message)) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part: unknown) => {
        if (
          isRecord(part) &&
          part.type === "text" &&
          typeof part.text === "string"
        )
          return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

export const parseAgUiRunInput = (
  value: unknown,
  context: { requestId: string; traceId: string },
): ParsedInteractionInput => {
  const parsed = RunAgentInputSchema.safeParse(value);
  if (!parsed.success) {
    throw new InteractionInputError(
      "The AG-UI run input is malformed.",
      parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
  }

  const forwarded = parseForwardedProps(parsed.data.forwardedProps);
  const lastUserMessage = [...parsed.data.messages]
    .reverse()
    .find((message) => message.role === "user");
  const prompt =
    lastUserMessage === undefined ? "" : messageText(lastUserMessage);
  if (prompt.trim().length === 0) {
    throw new InteractionInputError(
      "A non-empty user research prompt is required.",
    );
  }

  return {
    input: parsed.data,
    request: {
      threadId: parsed.data.threadId,
      runId: parsed.data.runId,
      prompt,
      requestId: context.requestId,
      traceId: context.traceId,
      workflow: forwarded.workflow,
      fixtureMode: forwarded.fixtureMode,
    },
    afterSequence: forwarded.afterSequence,
    ...(forwarded.connectionId === undefined
      ? {}
      : { connectionId: forwarded.connectionId }),
  };
};

const metadataFor = (
  event: PetraInteractionEvent,
): Record<string, unknown> => ({
  petra: {
    sequence: event.sequence,
    requestId: event.requestId,
    traceId: event.traceId,
    workUnitId: event.workUnitId,
    modelRequestId: event.modelRequestId,
  },
});

export const toAgUiEvents = (event: PetraInteractionEvent): BaseEvent[] => {
  const common = { timestamp: event.timestamp, metadata: metadataFor(event) };
  switch (event.kind) {
    case "run.started":
      return [
        {
          ...common,
          type: EventType.RUN_STARTED,
          threadId: event.threadId,
          runId: event.runId,
        },
      ];
    case "state.snapshot":
      return [
        { ...common, type: EventType.STATE_SNAPSHOT, snapshot: event.state },
      ];
    case "activity.snapshot": {
      const status = {
        queued: "queued",
        running: "running",
        awaiting_review: "checkpointed",
        completed: "succeeded",
        failed: "failed",
        cancelled: "cancelled",
      }[event.content.status] as
        | "queued"
        | "running"
        | "checkpointed"
        | "succeeded"
        | "failed"
        | "cancelled";
      const statusEvent = {
        schema_name: "petra.interaction-custom-event",
        schema_version: "1.0.0",
        event_name: "petra.work_unit.status",
        payload: {
          work_unit_id: event.workUnitId,
          work_unit_revision: event.content.workUnitRevision,
          status,
          label: event.content.label,
          authority_effect: "none",
        },
      } satisfies PetraInteractionCustomEvent;
      return [
        {
          ...common,
          type: EventType.ACTIVITY_SNAPSHOT,
          messageId: `activity_${event.workUnitId}`,
          activityType: event.activityType,
          content: event.content,
          replace: true,
        },
        { ...common, ...toAgUiCustomEvent(statusEvent, common.metadata) },
      ];
    }
    case "tool.proposal":
      return [
        {
          ...common,
          type: EventType.TOOL_CALL_START,
          toolCallId: event.toolCallId,
          toolCallName: event.toolName,
        },
        {
          ...common,
          type: EventType.TOOL_CALL_ARGS,
          toolCallId: event.toolCallId,
          delta: JSON.stringify(event.arguments),
        },
        {
          ...common,
          type: EventType.TOOL_CALL_END,
          toolCallId: event.toolCallId,
        },
      ];
    case "text.start":
      return [
        {
          ...common,
          type: EventType.TEXT_MESSAGE_START,
          messageId: event.messageId,
          role: "assistant",
        },
      ];
    case "text.delta":
      return [
        {
          ...common,
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: event.messageId,
          delta: event.delta,
        },
      ];
    case "text.end":
      return [
        {
          ...common,
          type: EventType.TEXT_MESSAGE_END,
          messageId: event.messageId,
        },
      ];
    case "review.interrupt": {
      const interruptEvent = {
        schema_name: "petra.interaction-custom-event",
        schema_version: "1.0.0",
        event_name: "petra.review.interrupt",
        payload: {
          interaction_interrupt_id: event.interruptId,
          change_set_ref: {
            change_set_id: event.changeSetId,
            revision: event.changeSetRevision,
            content_hash: event.changeSetContentHash,
          },
          authority_effect: "none",
        },
      } satisfies PetraInteractionCustomEvent;
      const interrupt = {
        id: event.interruptId,
        reason: "changeset_review",
        message:
          "Review the proposed evidence ChangeSet before it becomes authoritative.",
        toolCallId: event.toolCallId,
        responseSchema: {
          type: "object",
          additionalProperties: false,
          required: [
            "schema_name",
            "schema_version",
            "client_response_id",
            "project_id",
            "interaction_run_id",
            "interrupt_ref",
            "change_set_ref",
            "decision",
            "rationale",
            "decided_at",
          ],
          properties: {
            schema_name: { const: "petra.review-interrupt-response" },
            schema_version: { const: "1.0.0" },
            client_response_id: { type: "string", minLength: 1 },
            project_id: { const: event.projectId },
            interaction_run_id: { const: event.interactionRunId },
            interrupt_ref: {
              const: {
                interaction_interrupt_id: event.interruptId,
                revision: event.interruptRevision,
                content_hash: event.interruptContentHash,
              },
            },
            change_set_ref: {
              const: {
                change_set_id: event.changeSetId,
                revision: event.changeSetRevision,
                content_hash: event.changeSetContentHash,
              },
            },
            decision: { enum: ["accept", "reject"] },
            rationale: { type: "string", minLength: 1, maxLength: 5000 },
            decided_at: { type: "string", format: "date-time" },
          },
        },
        metadata: {
          projectId: event.projectId,
          interactionRunId: event.interactionRunId,
          interactionInterruptRef: {
            interaction_interrupt_id: event.interruptId,
            revision: event.interruptRevision,
            content_hash: event.interruptContentHash,
          },
          changeSetRef: {
            change_set_id: event.changeSetId,
            revision: event.changeSetRevision,
            content_hash: event.changeSetContentHash,
          },
        },
      };
      return [
        { ...common, ...toAgUiCustomEvent(interruptEvent, common.metadata) },
        {
          ...common,
          type: EventType.RUN_FINISHED,
          threadId: event.threadId,
          runId: event.runId,
          outcome: { type: "interrupt", interrupts: [interrupt] },
        },
      ];
    }
    case "run.finished":
      return [
        {
          ...common,
          type: EventType.RUN_FINISHED,
          threadId: event.threadId,
          runId: event.runId,
          result: event.result,
          outcome: { type: "success" },
        },
      ];
    case "run.error":
      return [
        {
          ...common,
          type: EventType.RUN_ERROR,
          code: event.code,
          message: event.message,
        },
      ];
  }
  const unreachable: never = event;
  return unreachable;
};

export interface AgUiEncodedStream {
  contentType: string;
  chunks: AsyncGenerator<Uint8Array>;
}

export const encodeAgUiStream = (
  source: AsyncIterable<PetraInteractionEvent>,
  accept?: string,
  onEventEncoded?: (event: PetraInteractionEvent) => void,
): AgUiEncodedStream => {
  const encoder = new EventEncoder(accept === undefined ? {} : { accept });
  const textEncoder = new TextEncoder();
  const chunks = (async function* (): AsyncGenerator<Uint8Array> {
    for await (const petraEvent of source) {
      for (const event of toAgUiEvents(petraEvent)) {
        const encoded = encoder.encode(event);
        yield typeof encoded === "string"
          ? textEncoder.encode(encoded)
          : encoded;
      }
      onEventEncoded?.(petraEvent);
    }
  })();
  return { contentType: encoder.getContentType(), chunks };
};

export interface PetraClientEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface PetraInteractionResult {
  events: PetraClientEvent[];
  messages: Array<{ id: string; role: string; content?: string }>;
  state: unknown;
  pendingInterrupts: Array<{ id: string; reason: string; message?: string }>;
}

export interface PetraInteractionClientOptions {
  endpoint: string;
  reviewCommandEndpoint?: string;
  token: string;
  traceId?: string;
  fetch?: typeof fetch;
}

type PetraHttpAgentRunParameters = NonNullable<
  Parameters<HttpAgent["runAgent"]>[0]
>;

const collectInteractionResult = async (
  agent: HttpAgent,
  parameters: PetraHttpAgentRunParameters,
): Promise<PetraInteractionResult> => {
  const events: PetraClientEvent[] = [];
  await agent.runAgent(parameters, {
    onEvent: ({ event }) => {
      const { type, ...payload } = event;
      events.push({ type, payload });
    },
  });

  return {
    events,
    messages: agent.messages.map((message) => ({
      id: message.id,
      role: message.role,
      ...("content" in message && typeof message.content === "string"
        ? { content: message.content }
        : {}),
    })),
    state: agent.state,
    pendingInterrupts: agent.pendingInterrupts.map((interrupt) => ({
      id: interrupt.id,
      reason: interrupt.reason,
      ...(interrupt.message === undefined
        ? {}
        : { message: interrupt.message }),
    })),
  };
};

export class PetraInteractionClient {
  readonly #options: PetraInteractionClientOptions;

  constructor(options: PetraInteractionClientOptions) {
    this.#options = options;
  }

  async resolveReview(
    response: PetraReviewInterruptResponse,
  ): Promise<Record<string, unknown>> {
    const endpoint =
      this.#options.reviewCommandEndpoint ??
      new URL(
        "/api/commands/reviews/resolve",
        this.#options.endpoint,
      ).toString();
    const request = this.#options.fetch ?? fetch;
    const result = await request(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#options.token}`,
        "content-type": "application/json",
        ...(this.#options.traceId === undefined
          ? {}
          : { "x-petra-trace-id": this.#options.traceId }),
      },
      body: JSON.stringify(response),
    });
    const body = (await result.json()) as Record<string, unknown>;
    if (!result.ok) {
      throw new InteractionInputError("Petra rejected the review response.", [
        JSON.stringify(body),
      ]);
    }
    return body;
  }

  async run(parameters: {
    threadId: string;
    runId: string;
    prompt: string;
    workflow?: PetraInteractionWorkflow;
    fixtureMode?: PetraFixtureMode;
    afterSequence?: number;
    connectionId?: string;
    abortController?: AbortController;
  }): Promise<PetraInteractionResult> {
    const agent = new HttpAgent({
      url: this.#options.endpoint,
      agentId: "petra-research-assistant",
      threadId: parameters.threadId,
      initialState: {},
      initialMessages: [
        {
          id: `user_${parameters.runId}`,
          role: "user",
          content: parameters.prompt,
        },
      ],
      headers: {
        accept: "text/event-stream",
        authorization: `Bearer ${this.#options.token}`,
        "x-petra-trace-id":
          this.#options.traceId ?? `trace_${parameters.runId}`,
      },
      ...(this.#options.fetch === undefined
        ? {}
        : { fetch: this.#options.fetch }),
    });

    return collectInteractionResult(agent, {
      runId: parameters.runId,
      tools: [],
      context: [],
      forwardedProps: {
        petra: {
          workflow: parameters.workflow ?? "fixture",
          ...((parameters.workflow ?? "fixture") === "grounded_synthesis"
            ? {}
            : { fixtureMode: parameters.fixtureMode ?? "success" }),
          afterSequence: parameters.afterSequence ?? 0,
          ...(parameters.connectionId === undefined
            ? {}
            : { connectionId: parameters.connectionId }),
        },
      },
      ...(parameters.abortController === undefined
        ? {}
        : { abortController: parameters.abortController }),
    });
  }

  /**
   * Replays persisted events for one exact durable InteractionRun through the
   * authenticated read boundary. This creates only a delivery attempt; it
   * cannot submit interaction input, start Work, or reapply a Petra command.
   */
  async replay(parameters: {
    threadId: string;
    runId: string;
    connectionId: string;
    afterSequence?: number;
    abortController?: AbortController;
  }): Promise<PetraInteractionResult> {
    const afterSequence = parameters.afterSequence ?? 0;
    if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
      throw new InteractionInputError(
        "The replay checkpoint must be a non-negative safe integer.",
      );
    }
    const runEndpointSuffix = "run";
    if (!this.#options.endpoint.endsWith(`/${runEndpointSuffix}`)) {
      throw new InteractionInputError(
        "The Petra interaction endpoint must end with /run to derive its replay boundary.",
      );
    }
    const query = new URLSearchParams({
      thread: parameters.threadId,
      connection: parameters.connectionId,
      after: String(afterSequence),
    });
    const endpoint = `${this.#options.endpoint.slice(0, -runEndpointSuffix.length)}${encodeURIComponent(parameters.runId)}?${query}`;
    const request = this.#options.fetch ?? fetch;
    const agent = new HttpAgent({
      url: endpoint,
      agentId: "petra-research-assistant",
      threadId: parameters.threadId,
      initialState: {},
      initialMessages: [],
      headers: {
        accept: "text/event-stream",
        authorization: `Bearer ${this.#options.token}`,
        "x-petra-trace-id":
          this.#options.traceId ?? `trace_${parameters.runId}`,
      },
      fetch: async (url, init) => {
        const headers = new Headers(init.headers);
        headers.delete("content-type");
        return request(url, {
          method: "GET",
          headers,
          ...(init.signal === undefined || init.signal === null
            ? {}
            : { signal: init.signal }),
        });
      },
    });

    return collectInteractionResult(agent, {
      runId: parameters.runId,
      tools: [],
      context: [],
      ...(parameters.abortController === undefined
        ? {}
        : { abortController: parameters.abortController }),
    });
  }
}
