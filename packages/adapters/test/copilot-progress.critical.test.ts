import { describe, it, expect } from "vitest";
import { EventType, type BaseEvent } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import {
  ProgressiveProjectCopilotClient,
  readCopilotPresentation,
} from "../src/copilot-progress-client.js";
import { encodeProgressiveCopilotDelivery } from "../src/copilot-progress-server.js";
import {
  InteractionPresenter,
  assertInteractionCustomEvent,
} from "../src/interaction-presentation.js";
import { PetraInteractionClient } from "../src/ag-ui.js";
import { setup } from "./copilot-progress-fixture.js";
import { readFileSync } from "node:fs";

const encode = (events: BaseEvent[]) => {
  const encoder = new EventEncoder();
  return new Response(events.map((event) => encoder.encode(event)).join(""), {
    headers: { "content-type": encoder.getContentType() },
  });
};
async function delivery(
  mutate: (events: Record<string, unknown>[]) => void,
  wrongOwner = false,
  abortRead = false,
) {
  const { turn, input, owner } = setup();
  const initial = structuredClone(turn);
  delete initial.terminal;
  const body = await new Response(
    encodeProgressiveCopilotDelivery(initial, () => Promise.resolve(turn))
      .stream,
  ).text();
  const events = body
    .split("\n\n")
    .filter(Boolean)
    .map(
      (chunk) =>
        JSON.parse(chunk.replace(/^data: /u, "")) as Record<string, unknown>,
    );
  mutate(events);
  const abort = new AbortController();
  class OwnerPort extends ProgressiveProjectCopilotClient {
    override read: ProgressiveProjectCopilotClient["read"] = () => {
      if (abortRead) abort.abort();
      return Promise.resolve({
        thread_id: turn.thread_id,
        context: turn.context,
        turns: [turn],
        owners: {
          [turn.run_id]: wrongOwner
            ? { ...owner, actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAX" }
            : owner,
        },
        availability: { state: "ready", model: "controlled-sdk-port" },
      });
    };
  }
  const client = new OwnerPort({
    baseUrl: "http://petra.test",
    token: "controlled-owner-port",
    fetch: () => Promise.resolve(encode(events as unknown as BaseEvent[])),
  });
  return {
    turn,
    execute: () => client.run(input, () => undefined, abort.signal),
  };
}

describe("critical disclosure review", () => {
  it("rejects hostile version scope hash sequence and missing block without displaying a completed answer", async () => {
    for (const field of ["version", "scope", "hash", "sequence", "missing"]) {
      const { turn, execute } = await delivery((events) => {
        const packet = events.find(
          (event) =>
            event.type === "ACTIVITY_SNAPSHOT" &&
            (event.content as { phase: string }).phase === "answer_block",
        )!;
        const content = packet.content as Record<string, unknown>;
        if (field === "version") content.presentation_version = "9.0.0";
        if (field === "scope")
          content.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FAX";
        if (field === "hash") content.turn_hash = `sha256:${"0".repeat(64)}`;
        if (field === "sequence") content.block_index = 1;
        if (field === "missing") events.splice(events.indexOf(packet), 1);
      });
      await expect(execute()).rejects.toThrow();
      expect(
        readCopilotPresentation(turn.project_id, "controlled-owner-port"),
      ).toMatchObject({
        phase: "disconnected",
        blocks: [],
        authority: "none",
      });
    }
  });
  it("withholds disclosure for foreign owner and abortion during the retained read", async () => {
    for (const abortRead of [false, true]) {
      const { turn, execute } = await delivery(
        () => undefined,
        !abortRead,
        abortRead,
      );
      await expect(execute()).rejects.toThrow();
      expect(
        readCopilotPresentation(turn.project_id, "controlled-owner-port")
          ?.blocks,
      ).toEqual([]);
      expect(
        readCopilotPresentation(turn.project_id, "controlled-owner-port")
          ?.phase,
      ).toBe("disconnected");
    }
  });
  it("refuses unsolicited tools custom decisions and interrupt outcomes in the advisory role", async () => {
    for (const type of ["TOOL_CALL_START", "CUSTOM", "RUN_FINISHED"]) {
      const { turn, execute } = await delivery((events) => {
        if (type === "RUN_FINISHED")
          events.at(-1)!.outcome = { type: "interrupt", interrupts: [] };
        else
          events.splice(
            1,
            0,
            type === "CUSTOM"
              ? { type, name: "petra.apply_claim", value: { applied: true } }
              : {
                  type,
                  toolCallId: "unauthorized",
                  toolCallName: "apply_claim",
                },
          );
      });
      await expect(execute()).rejects.toThrow();
      expect(
        readCopilotPresentation(turn.project_id, "controlled-owner-port")
          ?.phase,
      ).toBe("disconnected");
    }
  });
  it("keeps genuine retained failure and cancellation distinct from connection loss", async () => {
    for (const state of ["failed", "cancelled"] as const) {
      const { turn, input, owner } = setup();
      turn.terminal = {
        state,
        finished_at: turn.started_at,
        error: "Controlled provider outcome",
      };
      class OwnerPort extends ProgressiveProjectCopilotClient {
        override read: ProgressiveProjectCopilotClient["read"] = () =>
          Promise.resolve({
            thread_id: turn.thread_id,
            context: turn.context,
            turns: [turn],
            owners: { [turn.run_id]: owner },
            availability: { state: "ready", model: "controlled-sdk-port" },
          });
      }
      const client = new OwnerPort({
        baseUrl: "http://petra.test",
        token: "controlled-owner-port",
        fetch: () => {
          const initial = structuredClone(turn);
          delete initial.terminal;
          const delivery = encodeProgressiveCopilotDelivery(initial, () =>
            Promise.resolve(turn),
          );
          return Promise.resolve(
            new Response(delivery.stream, {
              headers: { "content-type": delivery.contentType },
            }),
          );
        },
      });
      await client.run(input, () => undefined);
      expect(
        readCopilotPresentation(turn.project_id, "controlled-owner-port"),
      ).toMatchObject({
        phase: state,
        blocks: [],
        work: { outcome: state },
        authority: "none",
      });
    }
  });
  it("rejects unregistered native custom versions names fields and authority even when the SDK swallows subscriber errors", async () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          "../../contracts/fixtures/accepted/interaction-custom-event.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    for (const corrupt of [
      { schema_version: "9.0.0" },
      { event_name: "petra.apply" },
      { unregistered: true },
      {
        payload: {
          ...(fixture.payload as object),
          authority_effect: "applied",
        },
      },
    ]) {
      expect(() =>
        assertInteractionCustomEvent(String(fixture.event_name), {
          ...fixture,
          ...corrupt,
        }),
      ).toThrow();
    }
    const client = new PetraInteractionClient({
      endpoint: "http://petra.test/run",
      token: "controlled-sdk-port",
      fetch: () =>
        Promise.resolve(
          encode([
            {
              type: EventType.RUN_STARTED,
              threadId: "thread-critical",
              runId: "run-critical",
            },
            { type: EventType.CUSTOM, name: "petra.apply", value: fixture },
            {
              type: EventType.RUN_FINISHED,
              threadId: "thread-critical",
              runId: "run-critical",
              outcome: { type: "success" },
            },
          ]),
        ),
    });
    await expect(
      client.run({
        threadId: "thread-critical",
        runId: "run-critical",
        prompt: "Controlled SDK boundary",
      }),
    ).rejects.toThrow("name differs");
  });
  it("maps native Work tool and review models without turning a proposal into applied authority", () => {
    const presenter = new InteractionPresenter("thread-native", "run-native");
    const workId = "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FAW";
    presenter.apply({
      type: EventType.CUSTOM,
      name: "petra.work_unit.status",
      value: {
        schema_name: "petra.interaction-custom-event",
        schema_version: "1.0.0",
        event_name: "petra.work_unit.status",
        payload: {
          work_unit_id: workId,
          work_unit_revision: 4,
          status: "checkpointed",
          label: "Ready for review",
          authority_effect: "none",
        },
      },
      metadata: { petra: { workUnitId: workId } },
    });
    presenter.apply({
      type: EventType.TOOL_CALL_START,
      toolCallId: "proposal",
      toolCallName: "petra.review_changeset",
    });
    presenter.apply({
      type: EventType.TOOL_CALL_ARGS,
      toolCallId: "proposal",
      delta: '{"bounded":true}',
    });
    presenter.apply({ type: EventType.TOOL_CALL_END, toolCallId: "proposal" });
    const interruptId = "interaction_interrupt_01ARZ3NDEKTSV4RRFFQ69G5FAW";
    presenter.apply({
      type: EventType.CUSTOM,
      name: "petra.review.interrupt",
      value: {
        schema_name: "petra.interaction-custom-event",
        schema_version: "1.0.0",
        event_name: "petra.review.interrupt",
        payload: {
          interaction_interrupt_id: interruptId,
          change_set_ref: {
            change_set_id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FAW",
            revision: 2,
            content_hash: `sha256:${"1".repeat(64)}`,
          },
          authority_effect: "none",
        },
      },
    });
    presenter.apply({
      type: EventType.RUN_FINISHED,
      threadId: "thread-native",
      runId: "run-native",
      outcome: { type: "interrupt", interrupts: [{ id: interruptId }] },
    });
    expect(presenter.view).toMatchObject({
      phase: "awaiting_review",
      authority: "none",
      work: { revision: 4 },
      proposal: {
        tool: "petra.review_changeset",
        arguments: { bounded: true },
      },
      review: { interruptId },
    });
    expect(() =>
      presenter.apply({
        type: EventType.CUSTOM,
        name: "petra.work_unit.status",
        value: {
          schema_name: "petra.interaction-custom-event",
          schema_version: "1.0.0",
          event_name: "petra.work_unit.status",
          payload: {
            work_unit_id: workId,
            work_unit_revision: 5,
            status: "succeeded",
            label: "Foreign Work",
            authority_effect: "none",
          },
        },
        metadata: { petra: { workUnitId: "another" } },
      }),
    ).toThrow("substituted");
  });
});
