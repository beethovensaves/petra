import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type {
  PetraIntakeCopilotSession,
  PetraCopilotOutput,
  PetraIntakeCopilotInputManifest,
} from "@petra/contracts";
import { copilotHash, type CopilotTerminal } from "../src/project-copilot.js";
import {
  INTAKE_COPILOT_PROFILE,
  IntakeCopilotRuntime,
  intakeCopilotHistory,
  intakeCopilotModelPayload,
  type IntakeCopilotTurn,
  type IntakeCopilotTurnRepository,
  type IntakeCopilotModelPort,
} from "../src/intake-copilot.js";
const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as T;
const answer: PetraCopilotOutput = {
  schema_name: "petra.copilot-output",
  schema_version: "1.0.0",
  authority: "advisory_only",
  focus_keys: [],
  blocks: [
    {
      kind: "question",
      text: "Who will use this result, and what decision should it help them make?",
      citations: [],
    },
  ],
};
class MemoryIntake implements IntakeCopilotTurnRepository {
  readonly turns = new Map<string, IntakeCopilotTurn>();
  readonly session = fixture<PetraIntakeCopilotSession>(
    "intake-copilot-session",
  );
  manifestFailure = false;
  getSession(): Promise<PetraIntakeCopilotSession> {
    return Promise.resolve(this.session);
  }
  createSession(
    session: PetraIntakeCopilotSession,
  ): Promise<PetraIntakeCopilotSession> {
    return Promise.resolve(session);
  }
  listSessions(): Promise<PetraIntakeCopilotSession[]> {
    return Promise.resolve([this.session]);
  }
  list(): Promise<IntakeCopilotTurn[]> {
    return Promise.resolve(
      [...this.turns.values()].map((turn) => structuredClone(turn)),
    );
  }
  get(
    _intake: string,
    _actor: string,
    run: string,
  ): Promise<IntakeCopilotTurn | undefined> {
    return Promise.resolve(this.turns.get(run));
  }
  begin(
    turn: IntakeCopilotTurn,
  ): Promise<{ turn: IntakeCopilotTurn; claimed: boolean }> {
    const old = this.turns.get(turn.run_id);
    if (old !== undefined)
      return Promise.resolve({ turn: old, claimed: false });
    this.turns.set(turn.run_id, structuredClone(turn));
    return Promise.resolve({ turn, claimed: true });
  }
  putInputManifest(
    turn: IntakeCopilotTurn,
    manifest: PetraIntakeCopilotInputManifest,
  ): Promise<void> {
    if (this.manifestFailure)
      return Promise.reject(new Error("Persistence unavailable"));
    this.turns.set(turn.run_id, { ...turn, input_manifest: manifest });
    return Promise.resolve();
  }
  finish(
    turn: IntakeCopilotTurn,
    terminal: CopilotTerminal,
  ): Promise<IntakeCopilotTurn> {
    const retained = this.turns.get(turn.run_id)!;
    if (retained.terminal === undefined) {
      retained.terminal = terminal;
      this.turns.set(turn.run_id, retained);
    }
    return Promise.resolve(structuredClone(retained));
  }
  recover(): Promise<void> {
    return Promise.resolve();
  }
}
const success = () => ({
  output: answer,
  model: "synthetic-test-model",
  provider_thread_id: "test-thread",
  provider_turn_id: "test-turn",
});
const newTurn = (): IntakeCopilotTurn => fixture("intake-copilot-turn");
describe("Owner-scoped advisory intake without a Project", () => {
  it("retains the exact prepared input before invocation and replays a run without another call", async () => {
    const repository = new MemoryIntake();
    let calls = 0;
    const model: IntakeCopilotModelPort = {
      invokeIntake: (input) => {
        calls++;
        const retained = repository.turns.get(newTurn().run_id)!;
        expect(retained.input_manifest?.content.input_payload_hash).toBe(
          copilotHash(intakeCopilotModelPayload(input)),
        );
        expect(retained.input_manifest?.content.profile_hash).toBe(
          copilotHash(INTAKE_COPILOT_PROFILE),
        );
        expect(JSON.stringify(input)).not.toContain('"project_id"');
        return Promise.resolve(success());
      },
    };
    const runtime = new IntakeCopilotRuntime(
      repository,
      model,
      newTurn().instance_id,
    );
    const started = await runtime.start(newTurn()),
      final = await runtime.wait(started);
    expect(final.terminal?.state).toBe("completed");
    expect(final.terminal?.output?.blocks[0]?.kind).toBe("question");
    expect((await runtime.start(newTurn())).terminal?.state).toBe("completed");
    expect(calls).toBe(1);
  });
  it("makes no model call if the input disclosure cannot be durably retained", async () => {
    const repository = new MemoryIntake();
    repository.manifestFailure = true;
    let calls = 0;
    const runtime = new IntakeCopilotRuntime(
      repository,
      {
        invokeIntake: () => {
          calls++;
          return Promise.resolve(success());
        },
      },
      newTurn().instance_id,
    );
    const final = await runtime.wait(await runtime.start(newTurn()));
    expect(final.terminal?.state).toBe("failed");
    expect(calls).toBe(0);
    expect(final.input_manifest).toBeUndefined();
  });
  it("rejects invented source reports and fabricated Project context without producing authority", async () => {
    const repository = new MemoryIntake();
    const runtime = new IntakeCopilotRuntime(
      repository,
      {
        invokeIntake: () =>
          Promise.resolve({
            ...success(),
            output: {
              ...answer,
              blocks: [
                {
                  kind: "source_report",
                  text: "Invented evidence",
                  citations: ["invented"],
                },
              ],
            },
          }),
      },
      newTurn().instance_id,
    );
    const final = await runtime.wait(await runtime.start(newTurn()));
    expect(final.terminal?.state).toBe("failed");
    expect(final.terminal?.output).toBeUndefined();
    const forged = newTurn();
    Object.assign(forged.context.content, {
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    });
    await expect(runtime.start(forged)).rejects.toThrow();
  });
  it("withholds prior bytes across owner, session or consent changes while preserving original discussion", () => {
    const old = newTurn();
    old.question = "PRIVATE_OLD_INTAKE";
    old.terminal = {
      state: "completed",
      finished_at: old.started_at,
      ...success(),
    };
    const context = structuredClone(old.context);
    context.content.policy_hash = `sha256:${"b".repeat(64)}`;
    context.content_hash = copilotHash(context.content);
    const disclosed = intakeCopilotHistory([old], context);
    expect(JSON.stringify(disclosed)).not.toContain("PRIVATE_OLD_INTAKE");
    expect(disclosed[0]?.terminal?.output).toBeUndefined();
    expect(old.question).toBe("PRIVATE_OLD_INTAKE");
  });
  it("retains cancellation as the only terminal outcome even when a provider delivers later", async () => {
    const repository = new MemoryIntake();
    let complete: (value: ReturnType<typeof success>) => void = () => undefined;
    let invoked: () => void = () => undefined;
    const invocation = new Promise<void>((resolve) => {
      invoked = resolve;
    });
    const runtime = new IntakeCopilotRuntime(
      repository,
      {
        invokeIntake: () => {
          invoked();
          return new Promise((resolve) => {
            complete = resolve;
          });
        },
      },
      newTurn().instance_id,
    );
    const turn = await runtime.start(newTurn());
    await invocation;
    await runtime.cancel(turn.intake_session_id, turn.actor_id, turn.run_id);
    complete(success());
    const final = await runtime.wait(turn);
    expect(final.terminal?.state).toBe("cancelled");
    expect(final.terminal?.output).toBeUndefined();
  });
});
