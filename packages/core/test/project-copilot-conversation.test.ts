import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PetraCopilotInputManifest } from "@petra/contracts";
import {
  copilotHash,
  ProjectCopilotRuntime,
  type CopilotContext,
  type CopilotModelPort,
  type CopilotTerminal,
  type CopilotTurn,
  type CopilotTurnRepository,
} from "../src/project-copilot.js";

const makeContext = (): CopilotContext =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/copilot-context.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as CopilotContext;
class OwnedTurns implements CopilotTurnRepository {
  readonly records = new Map<string, CopilotTurn>();
  list(
    project: string,
    actor: string,
    thread?: string,
  ): Promise<CopilotTurn[]> {
    return Promise.resolve(
      [...this.records.values()].filter(
        (turn) =>
          turn.project_id === project &&
          turn.actor_id === actor &&
          (thread === undefined || turn.thread_id === thread),
      ),
    );
  }
  async get(
    project: string,
    actor: string,
    run: string,
  ): Promise<CopilotTurn | undefined> {
    return (await this.list(project, actor)).find(
      (turn) => turn.run_id === run,
    );
  }
  begin(turn: CopilotTurn): Promise<{ turn: CopilotTurn; claimed: boolean }> {
    this.records.set(turn.run_id, structuredClone(turn));
    return Promise.resolve({ turn, claimed: true });
  }
  putInputManifest(
    turn: CopilotTurn,
    input_manifest: PetraCopilotInputManifest,
  ): Promise<void> {
    this.records.set(turn.run_id, { ...turn, input_manifest });
    return Promise.resolve();
  }
  finish(turn: CopilotTurn, terminal: CopilotTerminal): Promise<CopilotTurn> {
    const retained = { ...this.records.get(turn.run_id)!, terminal };
    this.records.set(turn.run_id, retained);
    return Promise.resolve(retained);
  }
  async recover(): Promise<void> {}
}
const makeTurn = (question: string): CopilotTurn => {
  const original = makeContext();
  const { content_hash: ignored, ...content } = original;
  void ignored;
  const context = { ...content, content_hash: copilotHash(content) };
  return {
    schema_name: "petra.copilot-turn",
    schema_version: "1.0.0",
    run_id: "run_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    thread_id: "thread_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    project_id: context.project_id,
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    parent_run_id: null,
    question,
    context,
    focus_keys: [],
    request_hash: copilotHash({ question, context }),
    started_at: "2026-10-10T20:00:00.000Z",
    instance_id: "copilot_instance_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  };
};
const reply = (text: string) => ({
  schema_name: "petra.copilot-output",
  schema_version: "1.0.0",
  authority: "advisory_only",
  blocks: [{ kind: "question", text, citations: [] }],
  focus_keys: [],
});

describe("registered ordinary conversation and exact Project boundary", () => {
  it("answers a normal question and a distinct follow-up with exact retained same-basis history", async () => {
    const repository = new OwnedTurns();
    const inputs: Parameters<CopilotModelPort["invoke"]>[0][] = [];
    const invoke = vi.fn((input: Parameters<CopilotModelPort["invoke"]>[0]) => {
      inputs.push(structuredClone(input));
      return Promise.resolve({
        output: reply(
          inputs.length === 1
            ? "What material should we examine first?"
            : "Which question should guide the next examination?",
        ),
        model: "bounded-contract-fixture",
        provider_thread_id: "contract-provider-thread",
        provider_turn_id: `contract-provider-turn-${inputs.length}`,
      });
    });
    const runtime = new ProjectCopilotRuntime(
      repository,
      { invoke },
      makeTurn("").instance_id,
    );
    const first = await runtime.wait(
      await runtime.start(
        makeTurn("What evidence is available for this Project?"),
      ),
    );
    const next = {
      ...makeTurn("Which uncertainty should we examine next, and why?"),
      run_id: "run_01ARZ3NDEKTSV4RRFFQ69G5FAX",
      parent_run_id: first.run_id,
    };
    const followup = await runtime.wait(await runtime.start(next));
    expect(inputs).toHaveLength(2);
    expect(inputs[1]?.question).toBe(next.question);
    expect(inputs[1]?.history[0]?.question).toBe(first.question);
    expect(inputs[1]?.history[0]?.terminal?.output).toEqual(
      first.terminal?.output,
    );
    expect(followup.terminal?.state).toBe("completed");
    expect(followup.parent_run_id).toBe(first.run_id);
    expect(followup.input_manifest?.content.history[0]?.disclosure).toBe(
      "included_current_basis",
    );
  });
  it("rejects another Project's validly hashed context before retaining bytes or invoking a model", async () => {
    const repository = new OwnedTurns();
    const invoke = vi.fn();
    const runtime = new ProjectCopilotRuntime(
      repository,
      { invoke },
      makeTurn("").instance_id,
    );
    const mismatched = {
      ...makeTurn("What is the supplied evidence?"),
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAX",
    };
    await expect(runtime.start(mismatched)).rejects.toMatchObject({
      code: "CONTEXT_PROJECT_MISMATCH",
    });
    expect(repository.records.size).toBe(0);
    expect(invoke).not.toHaveBeenCalled();
  });
});
