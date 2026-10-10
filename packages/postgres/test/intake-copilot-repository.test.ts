import { readFileSync } from "node:fs";
import pg from "pg";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import {
  copilotHash,
  derivePetraId,
  intakeCopilotPolicy,
  IntakeCopilotRuntime,
  type IntakeCopilotTurn,
  type CopilotTerminal,
} from "@petra/core";
import type {
  PetraActor,
  PetraIntakeCopilotSession,
  PetraRegisteredProjectProfile,
  PetraProjectDefinitionDraftView,
  PetraProjectDefinitionDraftCommandRequestV11,
} from "@petra/contracts";
import { PostgresIntakeCopilotRepository } from "../src/intake-copilot-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresProjectProfileRuntime } from "../src/project-profile-runtime.js";
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
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const actor = fixture<PetraActor>("actor");
const terminal: CopilotTerminal = {
  state: "completed",
  finished_at: "2026-10-07T22:01:00.000Z",
  model: "test-only-intake",
  provider_thread_id: "test-only-thread",
  provider_turn_id: "test-only-turn",
  output: {
    schema_name: "petra.copilot-output",
    schema_version: "1.0.0",
    authority: "advisory_only",
    blocks: [
      {
        kind: "question",
        text: "Who is the intended audience?",
        citations: [],
      },
    ],
    focus_keys: [],
  },
};
(connectionString === undefined ? describe.skip : describe)(
  "pre-Project intake and atomic creation binding",
  () => {
    const pool = new pg.Pool({ connectionString });
    const repo = new PostgresIntakeCopilotRepository(pool);
    const scopes = new PostgresResearchScopeRepository(pool);
    const profiles = new PostgresProjectProfileRuntime(pool, {
      actor_id: actor.actor_id,
      actor_kind: "human",
    });
    beforeAll(async () => {
      await scopes.registerActor(actor);
      await profiles.registerProfile(
        fixture<PetraRegisteredProjectProfile>(
          "registered-project-profile-scientific-v1-5",
        ),
      );
      await profiles.registerProfile(
        fixture<PetraRegisteredProjectProfile>(
          "registered-project-profile-controlled-writing",
        ),
      );
    });
    beforeEach(async () => {
      await pool.query("TRUNCATE petra.intake_copilot_sessions CASCADE");
    });
    afterAll(async () => {
      await pool.end();
    });
    const session = async (
      seed = "first",
    ): Promise<PetraIntakeCopilotSession> => {
      const id = derivePetraId("intake_session", seed);
      const policy = intakeCopilotPolicy("test-only-intake");
      const policy_hash = copilotHash(policy);
      const now = new Date().toISOString();
      const content: PetraIntakeCopilotSession["content"] = {
        intake_session_id: id,
        actor_id: actor.actor_id,
        thread_id: derivePetraId("thread", `intake:${id}:${actor.actor_id}`),
        policy,
        policy_hash,
        consent: {
          accepted_policy_hash: policy_hash,
          accepted_at: now,
          accepted_by: actor.actor_id,
        },
        opened_at: now,
      };
      return repo.createSession({
        schema_name: "petra.intake-copilot-session",
        schema_version: "1.0.0",
        content,
        content_hash: copilotHash(content),
      });
    };
    const turn = (
      s: PetraIntakeCopilotSession,
      seed = "first",
      parent: string | null = null,
      draft?: PetraProjectDefinitionDraftView,
    ): IntakeCopilotTurn => {
      const content: IntakeCopilotTurn["context"]["content"] = {
        intake_session_id: s.content.intake_session_id,
        actor_id: s.content.actor_id,
        session_record_hash: copilotHash(s),
        policy_hash: s.content.policy_hash,
        outcome_wording: draft?.content.request.outcome ?? null,
        definition_draft_ref:
          draft === undefined
            ? null
            : {
                record_id: draft.draft_id,
                revision: 1,
                record_hash: copilotHash(draft),
              },
        records: [],
        limitations: ["Pre-creation discussion only."],
        authority: "pre_project_advice_only",
      };
      return {
        schema_name: "petra.intake-copilot-turn",
        schema_version: "1.0.0",
        run_id: derivePetraId("run", seed),
        intake_session_id: s.content.intake_session_id,
        actor_id: s.content.actor_id,
        thread_id: s.content.thread_id,
        parent_run_id: parent,
        question: "Help me clarify the intended outcome.",
        context: {
          schema_name: "petra.intake-copilot-context",
          schema_version: "1.0.0",
          content,
          content_hash: copilotHash(content),
        },
        request_hash: copilotHash({ seed, parent, content }),
        started_at: new Date().toISOString(),
        instance_id: derivePetraId("copilot_instance", "test"),
      };
    };
    const draft = async (
      outcome = "Plan a neighborhood block party with a budget, volunteer shifts, and a rain date.",
    ) =>
      profiles.draftProjectDefinition({
        schema_name: "petra.project-definition-draft-request",
        schema_version: "1.0.0",
        request_id: derivePetraId("definition_draft_request", outcome),
        outcome,
      });
    const command = (
      s: PetraIntakeCopilotSession,
      d: PetraProjectDefinitionDraftView,
      last: string | null,
      seed: string,
    ): PetraProjectDefinitionDraftCommandRequestV11 => ({
      schema_name: "petra.project-definition-draft-command-request",
      schema_version: "1.1.0",
      command_id: derivePetraId("command", seed),
      idempotency_key: `intake-create:${seed}`,
      draft: d,
      accepted_assumption_codes: d.content.assumptions.map(
        (a) => a.code,
      ) as PetraProjectDefinitionDraftCommandRequestV11["accepted_assumption_codes"],
      intake_ref: {
        intake_session_id: s.content.intake_session_id,
        session_record_hash: copilotHash(s),
        definition_draft_hash: copilotHash(d),
        last_run_id: last,
      },
    });
    it("retains explicit owner consent without a Project and rejects changed ownership or policy", async () => {
      const s = await session();
      expect(await repo.listSessions(actor.actor_id)).toEqual([s]);
      expect(
        await repo.getSession(
          s.content.intake_session_id,
          derivePetraId("actor", "other"),
        ),
      ).toBeUndefined();
      const altered = structuredClone(s);
      altered.content.policy.max_turns = 20;
      altered.content.policy.provider_model = "other-model";
      altered.content.policy_hash = copilotHash(altered.content.policy);
      altered.content.consent.accepted_policy_hash =
        altered.content.policy_hash;
      altered.content_hash = copilotHash(altered.content);
      await expect(repo.createSession(altered)).rejects.toThrow(
        "different ownership",
      );
      expect(s.content).not.toHaveProperty("project_id");
    });
    it("claims a question once, persists its exact input before invocation and restores its original answer after restart", async () => {
      const s = await session();
      const input = turn(s);
      let calls = 0;
      const runtime = new IntakeCopilotRuntime(
        repo,
        {
          invokeIntake: async (request) => {
            calls++;
            expect(request.context.content.records).toEqual([]);
            expect(
              (
                await repo.get(
                  input.intake_session_id,
                  actor.actor_id,
                  input.run_id,
                )
              )?.input_manifest,
            ).toBeDefined();
            return {
              output: terminal.output,
              model: "test-only-intake",
              provider_thread_id: "test-only-thread",
              provider_turn_id: "test-only-turn",
            };
          },
        },
        input.instance_id,
      );
      const started = await runtime.start(input);
      await runtime.wait(started);
      await runtime.start(input);
      expect(calls).toBe(1);
      const restarted = new PostgresIntakeCopilotRepository(pool);
      const restored = await restarted.get(
        input.intake_session_id,
        actor.actor_id,
        input.run_id,
      );
      expect(restored?.terminal?.output).toEqual(terminal.output);
      expect(restored?.input_manifest?.content.included_history_count).toBe(0);
      await expect(
        pool.query(
          "UPDATE petra.intake_copilot_turns SET payload=payload WHERE run_id=$1",
          [input.run_id],
        ),
      ).rejects.toThrow();
    });
    it("rejects a stale selected draft and does not let a draft change during an active answer", async () => {
      const s = await session();
      const old = turn(s);
      const d = await draft();
      await repo.retainDraft(s.content.intake_session_id, actor.actor_id, d);
      await expect(repo.begin(old)).rejects.toThrow("draft changed");
      expect(
        await repo.list(s.content.intake_session_id, actor.actor_id),
      ).toHaveLength(0);
      const current = turn(s, "current", null, d);
      await repo.begin(current);
      await expect(
        repo.retainDraft(
          s.content.intake_session_id,
          actor.actor_id,
          await draft("Plan a neighborhood garden."),
        ),
      ).rejects.toThrow("retained answer");
    });
    it("enforces the acknowledged question limit without hiding retained turns", async () => {
      const s = await session();
      let parent: string | null = null;
      for (let index = 0; index < 20; index++) {
        const input = turn(s, `budget:${index}`, parent);
        await repo.begin(input);
        await repo.finish(input, terminal);
        parent = input.run_id;
      }
      await expect(repo.begin(turn(s, "budget:21", parent))).rejects.toThrow(
        "20-turn limit",
      );
      expect(
        await repo.list(s.content.intake_session_id, actor.actor_id),
      ).toHaveLength(20);
    });
    it("binds scientific, writing and unrelated creation atomically to the exact retained discussion", async () => {
      const outcomes = [
        "Assess scientific evidence concerning an intervention's effect on sleep.",
        "Prepare a controlled writing procedure governed by auditable requirements.",
        "Plan a neighborhood block party with a budget, volunteer shifts, and a rain date.",
      ];
      for (const [index, outcome] of outcomes.entries()) {
        const s = await session(`binding:${index}`);
        const input = turn(s, `binding:${index}`);
        await repo.begin(input);
        await repo.finish(input, terminal);
        const d = await draft(outcome);
        await repo.retainDraft(s.content.intake_session_id, actor.actor_id, d);
        const request = command(s, d, input.run_id, `binding:${index}`);
        const receipt =
          await profiles.executeProjectDefinitionDraftCommand(request);
        const binding = await new PostgresIntakeCopilotRepository(pool).binding(
          s.content.intake_session_id,
          actor.actor_id,
        );
        expect(binding?.content.project_id).toBe(
          receipt.project_ref.project_id,
        );
        expect(binding?.content.creation_receipt_hash).toBe(
          copilotHash(receipt),
        );
        expect(binding?.content.definition_draft_hash).toBe(copilotHash(d));
        expect(binding?.content.original_turns).toEqual([
          {
            run_id: input.run_id,
            record_hash: copilotHash(input),
            terminal_hash: copilotHash(terminal),
          },
        ]);
        await expect(
          profiles.executeProjectDefinitionDraftCommand(request),
        ).resolves.toEqual(receipt);
        await expect(
          repo.begin(turn(s, `after-binding:${index}`, input.run_id, d)),
        ).rejects.toThrow("created Project");
        expect(
          (
            await repo.get(
              s.content.intake_session_id,
              actor.actor_id,
              input.run_id,
            )
          )?.context.content.outcome_wording,
        ).toBeNull();
      }
    });
    it("rejects creation against a changed or unsettled discussion before creating any Project", async () => {
      const s = await session();
      const d = await draft();
      await repo.retainDraft(s.content.intake_session_id, actor.actor_id, d);
      const reviewed = command(s, d, null, "stale-review");
      const input = turn(s, "later-question", null, d);
      await repo.begin(input);
      const before = await pool.query<{ count: string }>(
        "SELECT count(*) FROM petra.projects",
      );
      await expect(
        profiles.executeProjectDefinitionDraftCommand(reviewed),
      ).rejects.toThrow("discussion changed");
      const after = await pool.query<{ count: string }>(
        "SELECT count(*) FROM petra.projects",
      );
      expect(after.rows).toEqual(before.rows);
      expect(
        await repo.binding(s.content.intake_session_id, actor.actor_id),
      ).toBeUndefined();
    });
  },
);
