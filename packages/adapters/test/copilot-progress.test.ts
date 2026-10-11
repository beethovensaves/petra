import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { IntakeCopilotTurn } from "@petra/core";
import {
  ProgressiveProjectCopilotClient,
  readCopilotPresentation,
  subscribeCopilotPresentation,
} from "../src/copilot-progress-client.js";
import { encodeProgressiveCopilotDelivery } from "../src/copilot-progress-server.js";
import {
  assertAnswerActivity,
  COPILOT_ANSWER_ACTIVITY,
} from "../src/copilot-progress-profile.js";
import { presentRetainedBlock } from "@petra/core/copilot-presentation";

import { setup } from "./copilot-progress-fixture.js";
describe("owned progressive copilot SDK delivery", () => {
  it("preserves empty-project intake delivery without assigning Project owners or disclosure", async () => {
    const turn = JSON.parse(
      readFileSync(
        new URL(
          "../../contracts/fixtures/accepted/intake-copilot-turn.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as IntakeCopilotTurn;
    const final = {
      ...turn,
      terminal: {
        state: "failed" as const,
        finished_at: turn.started_at,
        error: "Controlled intake outcome",
      },
    };
    const delivery = encodeProgressiveCopilotDelivery(turn, () =>
      Promise.resolve(final),
    );
    const text = await new Response(delivery.stream).text();
    expect(text).toContain('"phase":"failed"');
    expect(text).not.toContain("ACTIVITY_SNAPSHOT");
    expect(text).not.toContain("work_unit_ref");
  });
  it("uses one official SDK request and discloses retained blocks in order before the exact terminal", async () => {
    const { turn, input, owner } = setup(),
      wait = vi.fn(() => Promise.resolve(turn));
    const initial = structuredClone(turn);
    delete initial.terminal;
    const body = encodeProgressiveCopilotDelivery(initial, wait);
    const fetch = vi.fn(() =>
      Promise.resolve(
        new Response(body.stream, {
          headers: { "content-type": body.contentType },
        }),
      ),
    );
    class OwnerRead extends ProgressiveProjectCopilotClient {
      override read: ProgressiveProjectCopilotClient["read"] = () =>
        Promise.resolve({
          thread_id: turn.thread_id,
          context: turn.context,
          turns: [turn],
          owners: { [turn.run_id]: owner },
          availability: { state: "ready", model: "controlled-sdk-port" },
        });
    }
    const client = new OwnerRead({
      baseUrl: "http://petra.test",
      token: "controlled-owner-port",
      fetch,
    });
    const observed: number[] = [];
    const unsubscribe = subscribeCopilotPresentation(() => {
      const v = readCopilotPresentation(
        turn.project_id,
        "controlled-owner-port",
      );
      if (v?.phase === "disclosing") observed.push(v.blocks.length);
    });
    try {
      await client.run(input, () => undefined);
    } finally {
      unsubscribe();
    }
    expect(observed).toEqual([1, 2]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledTimes(1);
    expect(
      readCopilotPresentation(turn.project_id, "controlled-owner-port"),
    ).toMatchObject({
      phase: "completed",
      authority: "none",
      blocks: [
        { text: "First retained advisory block." },
        { text: "Second retained question?" },
      ],
      work: { outcome: "completed", ref: owner.work_unit_ref },
    });
    expect(
      readCopilotPresentation(turn.project_id, "another-session"),
    ).toBeUndefined();
  });
  it("rejects an unsupported activity version, authority claim, extra fields and malformed block index", () => {
    const { turn } = setup();
    const good = {
      presentation_version: "1.0.0",
      project_id: turn.project_id,
      thread_id: turn.thread_id,
      run_id: turn.run_id,
      request_hash: turn.request_hash,
      context_hash: turn.context.content_hash,
      authority_effect: "none",
      phase: "running",
    };
    expect(() => assertAnswerActivity(good)).not.toThrow();
    for (const extra of [
      { presentation_version: "9.0.0" },
      { authority_effect: "applied" },
      { command_id: "unauthorized" },
      { phase: "answer_block", turn_hash: turn.request_hash, block_index: -1 },
    ])
      expect(() => assertAnswerActivity({ ...good, ...extra })).toThrow();
    expect(COPILOT_ANSWER_ACTIVITY).toBe("petra.copilot.answer@1.0.0");
  });
  it("cannot disclose a foreign actor, foreign run, unresolved citation or missing output", () => {
    const { turn, owner } = setup();
    expect(() =>
      presentRetainedBlock(
        turn,
        { ...owner, actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAX" },
        0,
      ),
    ).toThrow();
    expect(() =>
      presentRetainedBlock(
        turn,
        { ...owner, protocol_run_id: "run_01ARZ3NDEKTSV4RRFFQ69G5FAX" },
        0,
      ),
    ).toThrow();
    const bad = structuredClone(turn);
    bad.terminal!.output!.blocks[0].citations = ["absent"];
    expect(() => presentRetainedBlock(bad, owner, 0)).toThrow();
    const initial = structuredClone(turn);
    delete initial.terminal;
    expect(() => presentRetainedBlock(initial, owner, 0)).toThrow();
  });
});
