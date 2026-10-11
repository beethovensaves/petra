import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { EventType, type BaseEvent } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { CopilotTurn, IntakeCopilotTurn } from "@petra/core";
import { encodeCopilotAgUiDelivery as encodeBase } from "./project-copilot-ag-ui.js";
import {
  COPILOT_ANSWER_ACTIVITY,
  assertAnswerActivity,
  answerDisclosureRecord,
  type CopilotAnswerActivity,
} from "./copilot-progress-profile.js";
const contracts = new PetraContractRegistry();

/** Preserve the existing validated terminal transport; add typed disclosure of retained blocks. */
export function encodeProgressiveCopilotDelivery<
  T extends CopilotTurn | IntakeCopilotTurn,
>(
  turn: T,
  wait: () => Promise<T>,
  accept?: string,
): ReturnType<typeof encodeBase> {
  if (turn.schema_name === "petra.intake-copilot-turn")
    return encodeBase(turn, wait, accept);
  return encodeOwnedCopilotDelivery(
    turn,
    wait as () => Promise<CopilotTurn>,
    accept,
  );
}

function encodeOwnedCopilotDelivery(
  turn: CopilotTurn,
  wait: () => Promise<CopilotTurn>,
  accept?: string,
): ReturnType<typeof encodeBase> {
  const encoder = new EventEncoder(accept === undefined ? {} : { accept });
  const bytes = new TextEncoder();
  const queue: BaseEvent[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let started = false,
    connected = true;
  const packet = (
    phase: CopilotAnswerActivity["phase"],
    extension: Partial<CopilotAnswerActivity> = {},
  ): BaseEvent => {
    const content: CopilotAnswerActivity = {
      presentation_version: "1.0.0",
      project_id: turn.project_id,
      thread_id: turn.thread_id,
      run_id: turn.run_id,
      request_hash: turn.request_hash,
      context_hash: turn.context.content_hash,
      authority_effect: "none",
      phase,
      ...extension,
    };
    assertAnswerActivity(content);
    return {
      type: EventType.ACTIVITY_SNAPSHOT,
      messageId: `copilot-${turn.run_id}-${content.block_index ?? "activity"}`,
      activityType: COPILOT_ANSWER_ACTIVITY,
      content,
      replace: true,
    };
  };
  const send = (event: BaseEvent) => {
    if (!connected) return;
    if (!started || controller === undefined) {
      queue.push(event);
      return;
    }
    const encoded = encoder.encode(event);
    controller.enqueue(
      typeof encoded === "string" ? bytes.encode(encoded) : encoded,
    );
  };
  const base = encodeBase(
    turn,
    async () => {
      const final = await wait();
      contracts.assertValid("copilot-turn", final.schema_version, final);
      if (
        final.project_id !== turn.project_id ||
        final.run_id !== turn.run_id ||
        final.thread_id !== turn.thread_id ||
        final.request_hash !== turn.request_hash ||
        final.context.content_hash !== turn.context.content_hash
      )
        throw new Error(
          "Progressive delivery cannot substitute a terminal turn.",
        );
      if (final.terminal?.state === "completed") {
        const turn_hash = `sha256:${createHash("sha256")
          .update(canonicalize(answerDisclosureRecord(final)))
          .digest("hex")}`;
        for (
          let index = 0;
          index < (final.terminal.output?.blocks.length ?? 0);
          index++
        )
          send(packet("answer_block", { turn_hash, block_index: index }));
      }
      return final;
    },
    accept,
  );
  const reader = base.stream.getReader();
  return {
    contentType: base.contentType,
    stream: new ReadableStream<Uint8Array>({
      async start(output) {
        controller = output;
        try {
          for (;;) {
            const item = await reader.read();
            if (item.done) break;
            if (!connected) break;
            output.enqueue(item.value);
            if (!started) {
              started = true;
              send(
                packet(turn.terminal === undefined ? "running" : "restoring"),
              );
              for (const event of queue.splice(0)) send(event);
            }
          }
          if (connected) output.close();
        } catch (error) {
          if (connected) output.error(error);
        } finally {
          reader.releaseLock();
        }
      },
      async cancel() {
        connected = false;
        await reader.cancel();
      },
    }),
  };
}
