import { HttpAgent } from "@ag-ui/client";
import { EventType } from "@ag-ui/core";
import { canonicalize } from "json-canonicalize";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CopilotRequest,
  CopilotTurn,
  ConversationOwnerBinding,
} from "@petra/core";
import {
  presentRetainedBlock,
  type CopilotPresentation,
} from "@petra/core/copilot-presentation";
import {
  ProjectCopilotClient as RetainedClient,
  CopilotRequestRejected,
  type CopilotDeliveryState,
} from "./project-copilot-ag-ui.js";
import {
  COPILOT_ANSWER_ACTIVITY,
  assertAnswerActivity,
  answerDisclosureRecord,
} from "./copilot-progress-profile.js";

const contracts = new PetraContractRegistry();
const hash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("")}`;
};
const views = new Map<string, CopilotPresentation>();
const listeners = new Set<() => void>();
export const readCopilotPresentation = (
  projectId: string,
  token: string,
): CopilotPresentation | undefined => views.get(`${projectId}\u0000${token}`);
export const subscribeCopilotPresentation = (
  listener: () => void,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const publish = (view: CopilotPresentation, token: string): void => {
  views.set(`${view.projectId}\u0000${token}`, structuredClone(view));
  for (const listener of listeners) listener();
};

/** One official SDK consumer; readable blocks resolve through the retained owner read. */
export class ProgressiveProjectCopilotClient extends RetainedClient {
  override async run(
    input: {
      threadId: string;
      runId: string;
      question: string;
      request: CopilotRequest;
    },
    onState: (state: CopilotDeliveryState) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted)
      throw new DOMException("Delivery stopped.", "AbortError");
    const projectId = input.request.project_id;
    const requestHash = await hash({
      threadId: input.threadId,
      runId: input.runId,
      question: input.question,
      request: input.request,
    });
    let view: CopilotPresentation = {
      projectId,
      threadId: input.threadId,
      runId: input.runId,
      phase: "connecting",
      authority: "none",
      activity: "Connecting to the retained conversation",
      blocks: [],
    };
    publish(view, this.options.token);
    onState({ phase: "connecting" });
    let rejected: CopilotRequestRejected | undefined;
    let chain = Promise.resolve(),
      completed = false,
      started = false,
      retainedFailure = false,
      owned: { turn: CopilotTurn; owner: ConversationOwnerBinding } | undefined;
    const retain = async (): Promise<{
      turn: CopilotTurn;
      owner: ConversationOwnerBinding;
    }> => {
      if (owned !== undefined) return owned;
      let page = await this.read(projectId);
      for (let count = 0; count < 32; count++) {
        const turn = page.turns.find((turn) => turn.run_id === input.runId);
        if (turn !== undefined) {
          const owner = page.owners?.[turn.run_id];
          if (
            owner === undefined ||
            owner.actor_id !== turn.actor_id ||
            owner.protocol_thread_id !== input.threadId ||
            turn.project_id !== projectId ||
            turn.thread_id !== input.threadId ||
            turn.question !== input.question ||
            turn.request_hash !== requestHash ||
            turn.context.content_hash !== input.request.context_hash ||
            owner.protocol_run_id !== input.runId
          )
            throw new Error(
              "Disclosure does not resolve to the exact retained owner.",
            );
          owned = { turn, owner };
          return owned;
        }
        if (
          !page.history_page?.has_more ||
          page.history_page.next_cursor === undefined
        )
          break;
        page = await this.read(projectId, [], undefined, {
          cursor: page.history_page.next_cursor,
        });
      }
      throw new Error(
        "The retained answer is unavailable; delivery cannot substitute model text.",
      );
    };
    const agent = new HttpAgent({
      url: new URL(
        `/api/projects/${encodeURIComponent(projectId)}/copilot/run`,
        this.options.baseUrl,
      ).toString(),
      headers: { authorization: `Bearer ${this.options.token}` },
      threadId: input.threadId,
      initialMessages: [
        {
          id: `question-${input.runId}`,
          role: "user",
          content: input.question,
        },
      ],
      fetch: async (url, init) => {
        const response = await (this.options.fetch ?? fetch)(url, init);
        if (!response.ok) {
          const body: unknown = await response
            .clone()
            .json()
            .catch(() => undefined);
          if (typeof body === "object" && body !== null && "error" in body) {
            const e = body.error as { code?: unknown; message?: unknown };
            if (typeof e.code === "string" && typeof e.message === "string")
              rejected = new CopilotRequestRejected(e.code, e.message);
          }
        }
        return response;
      },
    });
    const abort = () => agent.abortRun();
    signal?.addEventListener("abort", abort, { once: true });
    try {
      await agent.runAgent(
        { runId: input.runId, forwardedProps: { petra: input.request } },
        {
          onEvent: ({ event }) => {
            chain = chain.then(async () => {
              if (signal?.aborted)
                throw new DOMException("Delivery stopped.", "AbortError");
              if (event.type === EventType.RUN_STARTED) {
                if (
                  started ||
                  event.runId !== input.runId ||
                  event.threadId !== input.threadId
                )
                  throw new Error("Foreign run started in this conversation.");
                started = true;
                view = {
                  ...view,
                  phase: "running",
                  activity: "Waiting for a validated retained answer",
                };
                publish(view, this.options.token);
                onState({ phase: "answering" });
              } else if (event.type === EventType.ACTIVITY_SNAPSHOT) {
                if (!started || completed)
                  throw new Error("Activity outside its open run.");
                if (event.activityType !== COPILOT_ANSWER_ACTIVITY)
                  throw new Error("Unregistered conversation activity.");
                assertAnswerActivity(event.content);
                const activity = event.content;
                if (
                  activity.project_id !== projectId ||
                  activity.thread_id !== input.threadId ||
                  activity.run_id !== input.runId ||
                  activity.request_hash !== requestHash ||
                  activity.context_hash !== input.request.context_hash
                )
                  throw new Error("Foreign or stale disclosure activity.");
                if (activity.phase === "answer_block") {
                  const current = await retain();
                  if (signal?.aborted)
                    throw new DOMException("Delivery stopped.", "AbortError");
                  if (
                    activity.turn_hash !==
                      (await hash(answerDisclosureRecord(current.turn))) ||
                    activity.block_index !== view.blocks.length
                  )
                    throw new Error(
                      "Disclosure hash or block sequence does not match retained content.",
                    );
                  const block = presentRetainedBlock(
                    current.turn,
                    current.owner,
                    activity.block_index,
                  );
                  view = {
                    ...view,
                    phase: "disclosing",
                    activity: "Reading the retained answer",
                    blocks: [...view.blocks, block],
                  };
                  publish(view, this.options.token);
                  // Let the browser paint each validated block before consuming
                  // the next one. No provider bytes or authority are introduced.
                  if (typeof requestAnimationFrame === "function")
                    await new Promise<void>((resolve) =>
                      requestAnimationFrame(() => resolve()),
                    );
                }
              } else if (event.type === EventType.STATE_SNAPSHOT) {
                const snapshot = event.snapshot as {
                  phase?: unknown;
                  turn?: CopilotTurn;
                };
                if (
                  ["completed", "failed", "cancelled"].includes(
                    String(snapshot.phase),
                  )
                ) {
                  if (!started || completed)
                    throw new Error(
                      "Duplicate or unstarted terminal delivery.",
                    );
                  const turn = snapshot.turn;
                  if (turn === undefined)
                    throw new Error(
                      "Terminal delivery omitted its retained turn.",
                    );
                  contracts.assertValid(
                    "copilot-turn",
                    turn.schema_version,
                    turn,
                  );
                  const current = await retain();
                  if (signal?.aborted)
                    throw new DOMException("Delivery stopped.", "AbortError");
                  if (
                    (await hash(answerDisclosureRecord(turn))) !==
                      (await hash(answerDisclosureRecord(current.turn))) ||
                    turn.terminal?.state !== snapshot.phase ||
                    (snapshot.phase === "completed" &&
                      view.blocks.length !==
                        turn.terminal?.output?.blocks.length)
                  )
                    throw new Error(
                      "Terminal delivery differs from the canonical retained answer.",
                    );
                  completed = true;
                  const phase = turn.terminal!.state;
                  view = {
                    ...view,
                    phase,
                    activity:
                      phase === "completed"
                        ? "Advisory answer retained"
                        : phase === "failed"
                          ? "Conversation task failed"
                          : "Conversation task cancelled",
                    work: {
                      ref: current.owner.work_unit_ref,
                      destination: `/projects/${projectId}/work/${current.owner.work_unit_ref.work_unit_id}`,
                      outcome: phase,
                    },
                  };
                  publish(view, this.options.token);
                  onState({ phase, turn });
                } else if (
                  !["answering", "restoring"].includes(
                    String(snapshot.phase),
                  ) ||
                  (event.snapshot as Record<string, unknown>).run_id !==
                    input.runId ||
                  (event.snapshot as Record<string, unknown>).context_hash !==
                    input.request.context_hash
                )
                  throw new Error("Unsupported or foreign conversation state.");
              } else if (event.type === EventType.RUN_ERROR) {
                if (
                  completed &&
                  ["failed", "cancelled"].includes(view.phase) &&
                  event.code === view.phase.toUpperCase()
                )
                  retainedFailure = true;
                else throw new Error(String(event.message));
              } else if (
                event.type === EventType.TOOL_CALL_START ||
                event.type === EventType.TOOL_CALL_ARGS ||
                event.type === EventType.TOOL_CALL_END ||
                event.type === EventType.TOOL_CALL_RESULT ||
                event.type === EventType.CUSTOM
              ) {
                throw new Error(
                  "This advisory role cannot issue tools, custom commands or decisions.",
                );
              } else if (
                event.type === EventType.RUN_FINISHED &&
                (event.runId !== input.runId ||
                  event.threadId !== input.threadId ||
                  event.outcome !== undefined)
              )
                throw new Error("Foreign or unsupported terminal outcome.");
            });
            void chain.catch(() => undefined);
          },
        },
      );
      await chain;
      if (!completed)
        throw new Error(
          "Delivery ended without the exact retained terminal outcome.",
        );
    } catch (error) {
      let validationFailure: unknown;
      await chain.catch((failure: unknown) => {
        validationFailure = failure;
      });
      if (
        retainedFailure &&
        validationFailure === undefined &&
        !signal?.aborted
      )
        return;
      const problem = rejected ?? validationFailure ?? error;
      view = {
        ...view,
        phase: "disconnected",
        activity: "Retained delivery needs inspection",
        blocks: [],
        limitation:
          problem instanceof Error ? problem.message : "Delivery unavailable",
      };
      publish(view, this.options.token);
      throw problem;
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }
}
