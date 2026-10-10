import type { PetraCopilotInputManifest } from "@petra/contracts";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  copilotHash,
  copilotModelPayload,
  type CopilotModelPort,
  validateCopilotContext,
  validateCopilotOutput,
  ProjectCopilotRuntime,
  copilotHistoryForContext,
  type CopilotContext,
  type CopilotTurn,
  type CopilotTerminal,
  type CopilotTurnRepository,
} from "../src/project-copilot.js";

const context = (): CopilotContext => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/copilot-context.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as CopilotContext;
  const { content_hash: priorHash, ...content } = fixture;
  void priorHash;
  return { ...content, content_hash: copilotHash(content) };
};
const answer = () => ({
  schema_name: "petra.copilot-output",
  schema_version: "1.0.0",
  authority: "advisory_only",
  blocks: [
    {
      kind: "question",
      text: "Which evidence should we examine?",
      citations: [],
    },
  ],
  focus_keys: [],
});
const turn = (): CopilotTurn => ({
  schema_name: "petra.copilot-turn",
  schema_version: "1.0.0",
  run_id: "run_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  thread_id: "thread_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  parent_run_id: null,
  question: "What should we examine?",
  context: context(),
  focus_keys: [],
  request_hash: `sha256:${"2".repeat(64)}`,
  started_at: "2026-10-07T14:00:00.000Z",
  instance_id: "copilot_instance_01ARZ3NDEKTSV4RRFFQ69G5FAW",
});
class Repository implements CopilotTurnRepository {
  turns = new Map<string, CopilotTurn>();
  list(): Promise<CopilotTurn[]> {
    return Promise.resolve([...this.turns.values()]);
  }
  get(
    project: string,
    actor: string,
    run: string,
  ): Promise<CopilotTurn | undefined> {
    const value = this.turns.get(run);
    return Promise.resolve(
      value?.project_id === project && value.actor_id === actor
        ? value
        : undefined,
    );
  }
  begin(input: CopilotTurn): Promise<{ turn: CopilotTurn; claimed: boolean }> {
    const previous = this.turns.get(input.run_id);
    if (previous !== undefined) {
      if (previous.request_hash !== input.request_hash)
        throw new Error("Run identity conflict");
      return Promise.resolve({ turn: previous, claimed: false });
    }
    this.turns.set(input.run_id, input);
    return Promise.resolve({ turn: input, claimed: true });
  }
  putInputManifest(
    input: CopilotTurn,
    manifest: PetraCopilotInputManifest,
  ): Promise<void> {
    this.turns.set(input.run_id, { ...input, input_manifest: manifest });
    return Promise.resolve();
  }
  finish(input: CopilotTurn, terminal: CopilotTerminal): Promise<CopilotTurn> {
    const next = { ...input, terminal };
    this.turns.set(input.run_id, next);
    return Promise.resolve(next);
  }
  recover(): Promise<void> {
    return Promise.resolve();
  }
}

describe("Project copilot contract and invocation boundary", () => {
  it("binds empty native Project context without inventing evidence", () => {
    expect(() => validateCopilotContext(context())).not.toThrow();
    expect(validateCopilotOutput(answer(), context()).blocks[0]?.kind).toBe(
      "question",
    );
  });
  it("rejects a context whose objective changed after hashing", () => {
    const input = context();
    input.objective_statement = "A different outcome";
    expect(() => validateCopilotContext(input)).toThrow("hash");
  });
  it("rejects cross-Project destinations even with a matching context hash", () => {
    const original = context();
    original.records.push({
      key: "a",
      ref: {
        record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAW",
        revision: 1,
        record_hash: `sha256:${"3".repeat(64)}`,
      },
      kind: "claim",
      label: "A",
      text: "A source summary",
      destination: "/projects/project_01K4E000000000000000000001/graph",
    });
    const { content_hash: priorHash, ...content } = original;
    void priorHash;
    expect(() =>
      validateCopilotContext({
        ...content,
        content_hash: copilotHash(content),
      }),
    ).toThrow("another Project");
  });
  it("rejects unsupported authoritative language force in structured output", () => {
    expect(() =>
      validateCopilotOutput({ ...answer(), authority: "approved" }, context()),
    ).toThrow();
  });
  it("rejects uncited source reports and citations outside the exact selection", () => {
    expect(() =>
      validateCopilotOutput(
        {
          ...answer(),
          blocks: [
            {
              kind: "source_report",
              text: "The study proves it.",
              citations: [],
            },
          ],
        },
        context(),
      ),
    ).toThrow();
    expect(() =>
      validateCopilotOutput(
        {
          ...answer(),
          blocks: [
            {
              kind: "inference",
              text: "Possible explanation",
              citations: ["invented"],
            },
          ],
        },
        context(),
      ),
    ).toThrow("outside");
  });
  it("allows exact admitted excerpts and rejects metadata citations or invented paraphrases", () => {
    const selected = context();
    selected.records.push({
      key: "passage",
      kind: "source_span",
      label: "Study passage",
      ref: {
        record_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FAW",
        revision: 1,
        record_hash: `sha256:${"3".repeat(64)}`,
      },
      text: "A bounded exact passage.",
      reportable_text: "No control group was included.",
      destination: `/projects/${selected.project_id}/graph`,
    });
    const report = {
      ...answer(),
      blocks: [
        {
          kind: "source_report",
          text: "No control group was included.",
          citations: ["passage"],
        },
      ],
    };
    expect(() => validateCopilotOutput(report, selected)).not.toThrow();
    expect(() =>
      validateCopilotOutput(
        {
          ...report,
          blocks: [
            {
              ...report.blocks[0]!,
              text: "The study establishes a causal effect.",
            },
          ],
        },
        selected,
      ),
    ).toThrow("exact admitted");
    delete selected.records[0]!.reportable_text;
    expect(() => validateCopilotOutput(report, selected)).toThrow("metadata");
  });
  it("withholds old questions and answers after rights or basis changes without changing retained history", () => {
    const prior = turn();
    prior.question = "PRIVATE_PASSAGE in the old source";
    prior.terminal = {
      state: "completed",
      finished_at: prior.started_at,
      output: {
        schema_name: "petra.copilot-output",
        schema_version: "1.0.0",
        authority: "advisory_only",
        blocks: [
          {
            kind: "inference",
            text: "PRIVATE_PASSAGE interpreted",
            citations: [],
          },
        ],
        focus_keys: [],
      },
    };
    prior.context.records.push({
      key: "passage",
      kind: "source_span",
      label: "Private study",
      ref: {
        record_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FAW",
        revision: 1,
        record_hash: `sha256:${"3".repeat(64)}`,
      },
      text: "PRIVATE_PASSAGE",
      reportable_text: "PRIVATE_PASSAGE",
      destination: `/projects/${prior.project_id}/graph`,
    });
    const unchanged = structuredClone(prior.context);
    expect(copilotHistoryForContext([prior], unchanged)[0]).toBe(prior);
    const revoked = structuredClone(unchanged);
    revoked.records[0]!.text = "Material withheld after current rights review.";
    delete revoked.records[0]!.reportable_text;
    const disclosed = copilotHistoryForContext([prior], revoked);
    expect(disclosed[0]?.question).not.toContain("PRIVATE_PASSAGE");
    expect(JSON.stringify(disclosed[0]?.terminal)).not.toContain(
      "PRIVATE_PASSAGE",
    );
    expect(prior.question).toContain("PRIVATE_PASSAGE");
    unchanged.basis.objective = null;
    expect(copilotHistoryForContext([prior], unchanged)[0]?.question).toContain(
      "withheld",
    );
  });
  it("invokes once across concurrent delivery retries and retained replay", async () => {
    const repository = new Repository();
    const invoke = vi.fn(() =>
      Promise.resolve({
        output: answer(),
        model: "certified-model",
        provider_thread_id: "provider-thread",
        provider_turn_id: "provider-turn",
      }),
    );
    const runtime = new ProjectCopilotRuntime(
      repository,
      { invoke },
      turn().instance_id,
    );
    const [first, retry] = await Promise.all([
      runtime.start(turn()),
      runtime.start(turn()),
    ]);
    const completed = await runtime.wait(first);
    expect(completed.terminal?.state).toBe("completed");
    expect((await runtime.start(turn())).terminal?.state).toBe("completed");
    expect(retry.run_id).toBe(first.run_id);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
  it("persists the exact disclosed history manifest before invoking the model and exposes withheld changed-basis history", async () => {
    const repository = new Repository();
    const invoke = vi.fn((input: Parameters<CopilotModelPort["invoke"]>[0]) => {
      const current = [...repository.turns.values()].at(-1)!;
      expect(current.input_manifest?.content.context_hash).toBe(
        input.context.content_hash,
      );
      expect(current.input_manifest?.content.input_payload_hash).toBe(
        copilotHash(copilotModelPayload(input)),
      );
      return Promise.resolve({
        output: answer(),
        model: "certified-model",
        provider_thread_id: "p",
        provider_turn_id: "t",
      });
    });
    const runtime = new ProjectCopilotRuntime(
      repository,
      { invoke },
      turn().instance_id,
    );
    const first = await runtime.wait(await runtime.start(turn()));
    expect(first.input_manifest?.content.history).toHaveLength(0);
    const next = {
      ...turn(),
      run_id: "run_01ARZ3NDEKTSV4RRFFQ69G5FAX",
      parent_run_id: first.run_id,
      context: context(),
    };
    next.context.basis.project_revision++;
    const { content_hash: previousHash, ...body } = next.context;
    next.context.content_hash = copilotHash(body);
    expect(next.context.content_hash).not.toBe(previousHash);
    const second = await runtime.wait(await runtime.start(next));
    expect(second.input_manifest?.content.history[0]?.disclosure).toBe(
      "withheld_changed_basis",
    );
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(repository.turns.get(first.run_id)?.question).toBe(first.question);
  });
  it("retains failure and never invokes the model if its disclosure manifest cannot be persisted", async () => {
    const repository = new Repository();
    repository.putInputManifest = () =>
      Promise.reject(new Error("Disclosure receipt unavailable"));
    const invoke = vi.fn();
    const runtime = new ProjectCopilotRuntime(
      repository,
      { invoke },
      turn().instance_id,
    );
    const result = await runtime.wait(await runtime.start(turn()));
    expect(result.terminal?.state).toBe("failed");
    expect(result.terminal?.error).toContain("Disclosure receipt unavailable");
    expect(invoke).not.toHaveBeenCalled();
  });
  it("retains invalid output as failure without publishing it", async () => {
    const repository = new Repository();
    const runtime = new ProjectCopilotRuntime(
      repository,
      {
        invoke: () =>
          Promise.resolve({
            output: { ...answer(), focus_keys: ["unknown-record"] },
            model: "certified-model",
            provider_thread_id: "p",
            provider_turn_id: "t",
          }),
      },
      turn().instance_id,
    );
    const result = await runtime.wait(await runtime.start(turn()));
    expect(result.terminal?.state).toBe("failed");
    expect(result.terminal?.output).toBeUndefined();
  });
  it("propagates explicit cancellation while leaving delivery wait harmless", async () => {
    const repository = new Repository();
    const runtime = new ProjectCopilotRuntime(
      repository,
      {
        invoke: ({ signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new Error("provider interrupted")),
              { once: true },
            );
          }),
      },
      turn().instance_id,
    );
    const input = await runtime.start(turn());
    const running = await repository.get(
      input.project_id,
      input.actor_id,
      input.run_id,
    );
    expect(running?.terminal).toBeUndefined();
    const cancelled = await runtime.cancel(
      input.project_id,
      input.actor_id,
      input.run_id,
    );
    expect(cancelled?.terminal?.state).toBe("cancelled");
  });
  it("does not cancel or reveal a run belonging to another actor", async () => {
    const repository = new Repository();
    repository.turns.set(turn().run_id, turn());
    const runtime = new ProjectCopilotRuntime(
      repository,
      { invoke: vi.fn() },
      turn().instance_id,
    );
    expect(
      await runtime.cancel(
        turn().project_id,
        "actor_01K4E000000000000000000001",
        turn().run_id,
      ),
    ).toBeUndefined();
  });
});
