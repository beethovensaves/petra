import type {
  PetraCopilotAuthorityRequest,
  PetraCopilotAuthorityReceipt,
} from "@petra/contracts";
import type { ConversationPermissionRead } from "@petra/core";
import { HttpAgent } from "@ag-ui/client";
import { EventType, RunAgentInputSchema, type BaseEvent } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  graphPresentationPeer,
  type GraphPresentationBinding,
} from "@petra/core/graph-presentation";
import type { PetraGraphPresentationContext } from "@petra/contracts";
import type { CopilotRequest } from "@petra/core";
import type {
  ConversationHistoryPage,
  ConversationOwnerBinding,
  CopilotTurn,
  CopilotContext,
  CopilotTerminal,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";

const contracts = new PetraContractRegistry();
const id = (value: string, kind: string): boolean =>
  new RegExp(`^${kind}_[0-9A-HJKMNP-TV-Z]{26}$`, "u").test(value);

export const parseCopilotAgUiInput = (
  value: unknown,
): {
  threadId: string;
  runId: string;
  question: string;
  request: CopilotRequest;
} => {
  const input = RunAgentInputSchema.parse(value);
  if (
    !id(input.threadId, "thread") ||
    !id(input.runId, "run") ||
    input.messages.length !== 1 ||
    input.messages[0]?.role !== "user" ||
    typeof input.messages[0].content !== "string" ||
    input.tools.length !== 0 ||
    input.context.length !== 0 ||
    typeof input.state !== "object" ||
    input.state === null ||
    Array.isArray(input.state) ||
    Object.keys(input.state as Record<string, unknown>).length !== 0
  ) {
    throw new Error(
      "The copilot input requires one new user message and no client-supplied tools, context, state, or history.",
    );
  }
  const forwarded: unknown = input.forwardedProps;
  if (
    typeof forwarded !== "object" ||
    forwarded === null ||
    Array.isArray(forwarded) ||
    Object.keys(forwarded).length !== 1 ||
    !("petra" in forwarded)
  )
    throw new Error("The copilot request envelope is malformed.");
  const requestVersion = (forwarded.petra as { schema_version?: string } | null)
    ?.schema_version;
  if (requestVersion !== "1.0.0" && requestVersion !== "1.1.0")
    throw new Error("The copilot request version is unsupported.");
  contracts.assertValid("copilot-request", requestVersion, forwarded.petra);
  return {
    threadId: input.threadId,
    runId: input.runId,
    question: input.messages[0].content,
    request: forwarded.petra as CopilotRequest,
  };
};

export interface CopilotDeliveryTurn {
  request_hash: string;
  run_id: string;
  thread_id: string;
  question: string;
  context: { content_hash: string };
  terminal?: CopilotTerminal;
}
export const encodeCopilotAgUiDelivery = <T extends CopilotDeliveryTurn>(
  turn: T,
  wait: () => Promise<T>,
  accept?: string,
): { contentType: string; stream: ReadableStream<Uint8Array> } => {
  const encoder = new EventEncoder(accept === undefined ? {} : { accept });
  const textEncoder = new TextEncoder();
  let connected = true;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: BaseEvent): void => {
        if (!connected) return;
        const chunk = encoder.encode(event);
        controller.enqueue(
          typeof chunk === "string" ? textEncoder.encode(chunk) : chunk,
        );
      };
      try {
        send({
          type: EventType.RUN_STARTED,
          threadId: turn.thread_id,
          runId: turn.run_id,
        });
        send({
          type: EventType.STATE_SNAPSHOT,
          snapshot: {
            phase: turn.terminal === undefined ? "answering" : "restoring",
            run_id: turn.run_id,
            context_hash: turn.context.content_hash,
          },
        });
        const final = await wait();
        if (final.terminal === undefined) {
          send({
            type: EventType.RUN_ERROR,
            code: "DELIVERY_PENDING",
            message:
              "This retained answer is still running. Reconnect to the same run; do not send it again.",
          });
        } else if (
          final.terminal.state === "completed" &&
          final.terminal.output !== undefined
        ) {
          send({
            type: EventType.TEXT_MESSAGE_START,
            messageId: `answer-${final.run_id}`,
            role: "assistant",
          });
          send({
            type: EventType.TEXT_MESSAGE_CONTENT,
            messageId: `answer-${final.run_id}`,
            delta: final.terminal.output.blocks
              .map((block) => block.text)
              .join("\n\n"),
          });
          send({
            type: EventType.TEXT_MESSAGE_END,
            messageId: `answer-${final.run_id}`,
          });
          send({
            type: EventType.STATE_SNAPSHOT,
            snapshot: { phase: "completed", turn: final },
          });
          send({
            type: EventType.RUN_FINISHED,
            threadId: final.thread_id,
            runId: final.run_id,
          });
        } else {
          send({
            type: EventType.STATE_SNAPSHOT,
            snapshot: { phase: final.terminal.state, turn: final },
          });
          send({
            type: EventType.RUN_ERROR,
            code: final.terminal.state.toUpperCase(),
            message:
              final.terminal.error ??
              "Petra could not deliver a validated answer.",
          });
        }
      } catch {
        send({
          type: EventType.RUN_ERROR,
          code: "DELIVERY_FAILED",
          message:
            "The delivery was interrupted. Reconnect using the same retained run identity.",
        });
      } finally {
        if (connected) controller.close();
      }
    },
    // Closing an HTTP connection stops delivery, never the provider execution.
    cancel() {
      connected = false;
    },
  });
  return { contentType: encoder.getContentType(), stream };
};

export interface CopilotDeliveryState<
  T extends CopilotDeliveryTurn = CopilotTurn,
> {
  phase:
    | "connecting"
    | "answering"
    | "completed"
    | "failed"
    | "cancelled"
    | "disconnected";
  turn?: T;
}

export class CopilotRequestRejected extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CopilotRequestRejected";
  }
}

const browserHash = async (value: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};
const checkContext = async (
  value: CopilotContext,
  projectId: string,
): Promise<void> => {
  contracts.assertValid("copilot-context", "1.0.0", value);
  const { content_hash, ...content } = value;
  if (
    value.project_id !== projectId ||
    (await browserHash(content)) !== content_hash ||
    new Set(value.records.map((record) => record.key)).size !==
      value.records.length ||
    value.records.some(
      (record) => !record.destination.startsWith(`/projects/${projectId}/`),
    )
  )
    throw new Error(
      "The conversation context has an incoherent Project, hash, or record binding.",
    );
};
const checkScene = async (
  scene: PetraGraphPresentationContext,
  projectId: string,
): Promise<void> => {
  contracts.assertValid("graph-presentation-context", "1.0.0", scene);
  if (
    scene.content.project_id !== projectId ||
    (await browserHash(scene.content)) !== scene.content_hash ||
    (await browserHash(graphPresentationPeer(scene.content))) !==
      scene.content.peer_content_hash
  )
    throw new Error(
      "The shared graph scene or its complete semantic peer has an incoherent binding.",
    );
};
const checkTurn = async (
  turn: CopilotTurn,
  projectId: string,
  threadId: string,
): Promise<void> => {
  contracts.assertValid("copilot-turn", turn.schema_version, turn);
  if (turn.project_id !== projectId || turn.thread_id !== threadId)
    throw new Error("A retained turn belongs to another conversation.");
  await checkContext(turn.context, projectId);
  if (turn.shared_scene !== undefined) {
    await checkScene(turn.shared_scene, projectId);
    const key = `scene:${turn.shared_scene.content_hash.slice(7, 23)}`;
    if (
      turn.context.records.find((record) => record.key === key)?.ref
        .record_hash !== (await browserHash(turn.shared_scene))
    )
      throw new Error(
        "The retained scene does not belong to this answer context.",
      );
  }
  const keys = new Set(turn.context.records.map((record) => record.key));
  const output = turn.terminal?.output;
  if (
    [
      ...turn.focus_keys,
      ...(output?.focus_keys ?? []),
      ...(output?.blocks.flatMap((block) => block.citations) ?? []),
    ].some((key) => !keys.has(key))
  )
    throw new Error(
      "A conversation turn cites material outside its retained context.",
    );
};

export const runTypedCopilotDelivery = async <T extends CopilotDeliveryTurn>(
  input: {
    url: string;
    token: string;
    fetch?: typeof fetch;
    threadId: string;
    runId: string;
    question: string;
    request: unknown;
    contextHash: string;
    rejectedCodes: readonly string[];
    verifyTurn: (turn: T) => Promise<void>;
  },
  onState: (state: CopilotDeliveryState<T>) => void,
  signal?: AbortSignal,
): Promise<void> => {
  if (signal?.aborted)
    throw new DOMException("Delivery stopped.", "AbortError");
  const requestHash = await browserHash({
    threadId: input.threadId,
    runId: input.runId,
    question: input.question,
    request: input.request,
  });
  let rejected: CopilotRequestRejected | undefined;
  let delivered = false;
  let validation = Promise.resolve();
  const agent = new HttpAgent({
    fetch: async (url, init) => {
      const response = await (input.fetch ?? fetch)(url, init);
      if (!response.ok) {
        const body: unknown = await response
          .clone()
          .json()
          .catch(() => undefined);
        if (typeof body === "object" && body !== null && "error" in body) {
          const error = body.error as { code?: string; message?: string };
          if (
            typeof error?.code === "string" &&
            typeof error.message === "string" &&
            input.rejectedCodes.includes(error.code)
          )
            rejected = new CopilotRequestRejected(error.code, error.message);
        }
      }
      return response;
    },
    url: input.url,
    headers: { authorization: `Bearer ${input.token}` },
    threadId: input.threadId,
    initialMessages: [
      {
        id: `question-${input.runId}`,
        role: "user",
        content: input.question,
      },
    ],
  });
  onState({ phase: "connecting" });
  const onAbort = (): void => agent.abortRun();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    await agent.runAgent(
      { runId: input.runId, forwardedProps: { petra: input.request } },
      {
        onEvent: ({ event }) => {
          if (event.type === EventType.STATE_SNAPSHOT) {
            const snapshot = event.snapshot as {
              phase?: string;
              turn?: T;
            };
            if (
              snapshot.phase === "completed" ||
              snapshot.phase === "failed" ||
              snapshot.phase === "cancelled"
            ) {
              const terminalPhase = snapshot.phase;
              validation = validation.then(async () => {
                if (snapshot.turn === undefined)
                  throw new Error(
                    "A terminal delivery omitted its retained turn.",
                  );
                await input.verifyTurn(snapshot.turn);
                if (
                  snapshot.turn.request_hash !== requestHash ||
                  snapshot.turn.thread_id !== input.threadId ||
                  snapshot.turn.run_id !== input.runId ||
                  snapshot.turn.question !== input.question ||
                  snapshot.turn.context.content_hash !== input.contextHash ||
                  snapshot.turn.terminal?.state !== snapshot.phase
                )
                  throw new Error(
                    "The delivered answer does not match the exact requested run.",
                  );
                delivered = true;
                onState({
                  phase: terminalPhase,
                  ...(snapshot.turn === undefined
                    ? {}
                    : { turn: snapshot.turn }),
                });
              });
              void validation.catch(() => undefined);
            } else onState({ phase: "answering" });
          }
        },
      },
    );
    await validation;
    if (!delivered)
      throw new Error(
        "Delivery ended without a validated terminal answer. Reconnect to the same retained run.",
      );
  } catch (error) {
    await validation;
    if (delivered) return;
    throw rejected ?? error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
};

/** Official AG-UI transport stays behind typed product view models. */
export class ProjectCopilotClient {
  constructor(
    readonly options: { baseUrl: string; token: string; fetch?: typeof fetch },
  ) {}

  async read(
    projectId: string,
    focusKeys: readonly string[] = [],
    binding?: GraphPresentationBinding,
    history?: { limit?: number; cursor?: string },
  ): Promise<{
    authorization?: ConversationPermissionRead;
    history_page?: ConversationHistoryPage["page"];
    owners?: Record<string, ConversationOwnerBinding>;
    shared_scene?: PetraGraphPresentationContext;
    thread_id: string;
    context: CopilotContext;
    turns: CopilotTurn[];
    availability: { state: "ready" | "unavailable"; reason?: string };
  }> {
    const endpoint = new URL(
      `/api/projects/${encodeURIComponent(projectId)}/copilot`,
      this.options.baseUrl,
    );
    if (focusKeys.length > 0)
      endpoint.searchParams.set("focus", JSON.stringify(focusKeys));
    if (binding !== undefined)
      endpoint.searchParams.set("scene", JSON.stringify(binding));
    if (history?.cursor !== undefined)
      endpoint.searchParams.set("cursor", history.cursor);
    if (history?.limit !== undefined)
      endpoint.searchParams.set("limit", String(history.limit));
    const response = await (this.options.fetch ?? fetch)(endpoint, {
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (!response.ok) {
      const failure: unknown = await response.json().catch(() => undefined);
      const message =
        typeof failure === "object" &&
        failure !== null &&
        "error" in failure &&
        typeof failure.error === "object" &&
        failure.error !== null &&
        "message" in failure.error &&
        typeof failure.error.message === "string"
          ? failure.error.message
          : "Petra could not read this Project's conversation.";
      throw new Error(message);
    }
    const result = (await response.json()) as Awaited<
      ReturnType<ProjectCopilotClient["read"]>
    >;
    await checkContext(result.context, projectId);
    const permission = result.authorization;
    if (permission !== undefined) {
      if (permission.state === "required") {
        const proposal = permission.proposal;
        if (
          proposal.project_id !== projectId ||
          !id(proposal.actor_id, "actor") ||
          !Number.isSafeInteger(proposal.project_revision) ||
          proposal.project_revision < 1 ||
          !/^sha256:[0-9a-f]{64}$/u.test(proposal.project_record_hash) ||
          proposal.domain_authority !== false ||
          JSON.stringify(proposal.allowed_commands) !==
            JSON.stringify(["RunProjectCopilot"]) ||
          (await browserHash(proposal.limits)) !==
            (await browserHash({
              max_wall_time_ms: 120000,
              max_output_bytes: 256000,
              max_attempts: 1,
              max_parallelism: 1,
            }))
        )
          throw new Error(
            "The conversation permission preview does not match this bounded Project scope.",
          );
      } else if (permission.state === "ready") {
        if (!id(permission.grant_id, "capability_grant"))
          throw new Error(
            "The retained conversation permission has no valid grant identity.",
          );
      } else if (permission.state !== "unavailable") {
        throw new Error("Conversation permission readiness is malformed.");
      }
    }
    if (binding !== undefined) {
      if (result.shared_scene === undefined)
        throw new Error("The requested shared graph scene is missing.");
      await checkScene(result.shared_scene, projectId);
      if (
        result.shared_scene.content_hash !== binding.content_hash ||
        result.shared_scene.content.peer_content_hash !==
          binding.peer_content_hash
      )
        throw new Error(
          "The returned scene differs from the displayed graph and semantic peer.",
        );
    }
    if (
      result.context.project_id !== projectId ||
      !id(result.thread_id, "thread") ||
      !Array.isArray(result.turns) ||
      !["ready", "unavailable"].includes(result.availability.state)
    )
      throw new Error("The conversation read does not match this Project.");
    if (
      result.history_page !== undefined &&
      (result.history_page.returned_count !== result.turns.length ||
        !Number.isSafeInteger(result.history_page.anchor_sequence) ||
        result.history_page.anchor_sequence < 0 ||
        typeof result.history_page.has_more !== "boolean" ||
        (result.history_page.has_more &&
          typeof result.history_page.next_cursor !== "string"))
    )
      throw new Error(
        "The retained conversation page is incomplete or malformed.",
      );
    for (const turn of result.turns) {
      await checkTurn(turn, projectId, result.thread_id);
      if (result.history_page !== undefined) {
        const owner = result.owners?.[turn.run_id];
        const {
          terminal: ignoredTerminal,
          input_manifest: ignoredManifest,
          ...content
        } = turn;
        void ignoredTerminal;
        void ignoredManifest;
        if (
          owner === undefined ||
          owner.project_id !== projectId ||
          owner.actor_id !== turn.actor_id ||
          owner.protocol_thread_id !== turn.thread_id ||
          owner.protocol_run_id !== turn.run_id ||
          !id(owner.project_thread_ref.project_thread_id, "project_thread") ||
          !id(owner.project_turn_id, "project_turn") ||
          !id(
            owner.interaction_run_ref.interaction_run_id,
            "interaction_run",
          ) ||
          !id(owner.work_unit_ref.work_unit_id, "work_unit") ||
          owner.turn_content_hash !== (await browserHash(content))
        )
          throw new Error(
            "Retained conversation content does not match its exact canonical owners.",
          );
      }
    }
    return result;
  }

  async authorize(
    projectId: string,
    request: PetraCopilotAuthorityRequest,
  ): Promise<PetraCopilotAuthorityReceipt> {
    const response = await (this.options.fetch ?? fetch)(
      new URL(
        `/api/projects/${encodeURIComponent(projectId)}/copilot/authorize`,
        this.options.baseUrl,
      ),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      },
    );
    const result = (await response.json()) as PetraCopilotAuthorityReceipt & {
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(
        result.error?.message ??
          "Conversation permission could not be confirmed.",
      );
    if (
      result.schema_name !== "petra.copilot-authority-receipt" ||
      result.schema_version !== "1.0.0" ||
      result.project_id !== projectId ||
      result.content.command_id !== request.command_id ||
      result.content.idempotency_key !== request.idempotency_key ||
      result.content.request_hash !== (await browserHash(request)) ||
      result.content_hash !== (await browserHash(result.content)) ||
      (await browserHash(result.content.proposal)) !==
        (await browserHash(request.proposal)) ||
      (await browserHash(result.content.review)) !==
        (await browserHash(request.review)) ||
      result.content.grant.schema_version !== "1.17.0" ||
      result.content.grant.project_id !== projectId ||
      result.content.grant.grantee.actor_id !== request.proposal.actor_id ||
      result.content.grant.issued_by.actor_id !== request.proposal.actor_id ||
      (await browserHash(result.content.grant.content.allowed_commands)) !==
        (await browserHash(["RunProjectCopilot"])) ||
      result.content.grant.content_hash !==
        (await browserHash(result.content.grant.content))
    )
      throw new Error(
        "Conversation permission receipt does not match the reviewed owner proposal.",
      );
    return result;
  }

  run(
    input: {
      threadId: string;
      runId: string;
      question: string;
      request: CopilotRequest;
    },
    onState: (state: CopilotDeliveryState) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    return runTypedCopilotDelivery(
      {
        ...input,
        token: this.options.token,
        ...(this.options.fetch === undefined
          ? {}
          : { fetch: this.options.fetch }),
        url: new URL(
          `/api/projects/${encodeURIComponent(input.request.project_id)}/copilot/run`,
          this.options.baseUrl,
        ).toString(),
        contextHash: input.request.context_hash,
        rejectedCodes: [
          "STALE_CONTEXT",
          "THREAD_SCOPE",
          "RUN_ID_CONFLICT",
          "ROLE_UNAVAILABLE",
          "PROJECT_NOT_FOUND",
          "STALE_SELECTION",
          "QUESTION_LIMIT",
          "INPUT_LIMIT",
          "SHARED_SCENE_CHANGED",
          "SHARED_SCENE_MISMATCH",
          "SHARED_SCENE_UNAVAILABLE",
          "SHARED_SELECTION_MISMATCH",
          "SHARED_SCENE_LIMIT",
          "CONTEXT_CHANGED",
          "PROJECT_ROLE_UNSUPPORTED",
        ],
        verifyTurn: (turn) =>
          checkTurn(turn, input.request.project_id, input.threadId),
      },
      onState,
      signal,
    );
  }

  async cancel(projectId: string, runId: string): Promise<void> {
    const response = await (this.options.fetch ?? fetch)(
      new URL(
        `/api/projects/${encodeURIComponent(projectId)}/copilot/${encodeURIComponent(runId)}/cancel`,
        this.options.baseUrl,
      ),
      {
        method: "POST",
        headers: { authorization: `Bearer ${this.options.token}` },
      },
    );
    if (!response.ok)
      throw new Error(
        "Petra could not confirm cancellation. Refresh the retained run before trying again.",
      );
  }
}
