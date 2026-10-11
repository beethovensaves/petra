import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  PetraActor,
  PetraCapabilityGrantV1160,
  PetraProject,
  PetraProjectDefinition,
  PetraWorkUnit,
} from "@petra/contracts";
import {
  CopilotCommandBridge,
  copilotCommandPreview,
  copilotHash,
  derivePetraId,
  type CopilotTurn,
  type CopilotTerminal,
  type CopilotCommandBridgePorts,
} from "@petra/core";
import { PostgresCopilotCommandProposalRepository } from "../src/copilot-command-proposal-repository.js";
import { PostgresCopilotTurnRepository } from "../src/project-copilot-repository.js";
import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresCapabilityGrantAuthorityRepository } from "../src/capability-grant-authority-repository.js";
import { PostgresCapabilityGrantCommandAuthorizer } from "../src/capability-grant-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
import { PostgresProjectWorkOperations } from "../src/project-work-operations.js";
import { createMemoryArtifactStore } from "./artifact-store-fixture.js";

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
// Each case traverses verified private Artifacts and multiple real canonical
// owners. Keep a bounded integration deadline independent of unit-test timing.
const ownerTest = (name: string, activity: () => Promise<void>) =>
  it(name, activity, 30_000);
(connectionString === undefined ? describe.skip : describe)(
  "PostgreSQL canonical command proposal activities",
  () => {
    const pool = new pg.Pool({ connectionString });
    const store = createMemoryArtifactStore();
    const actor = fixture<PetraActor>("actor");
    const project = fixture<PetraProject>("project");
    const definition = fixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const options = {
      actorId: actor.actor_id,
      artifactStore: store,
      artifacts: new PostgresArtifactAuthorityRepository(pool, store),
    };
    const turns = new PostgresCopilotTurnRepository(pool, options);
    const repository = new PostgresCopilotCommandProposalRepository(
      pool,
      options,
    );
    const work = new PostgresWorkUnitAuthorityRepository(pool);
    const operations = new PostgresProjectWorkOperations(
      pool,
      new PostgresCapabilityGrantCommandAuthorizer(),
    );
    let origin: CopilotTurn;
    let target: PetraWorkUnit;
    let ports: CopilotCommandBridgePorts;
    let commands = 0;
    let providers = 0;
    beforeEach(async () => {
      // This suite runs only against the disposable isolated owner-test database.
      await pool.query("TRUNCATE petra.actors CASCADE");
      const scopes = new PostgresResearchScopeRepository(pool);
      await scopes.registerActor(actor);
      await scopes.registerProjectRevision(project);
      await new PostgresProjectDefinitionAuthorityRepository(
        pool,
      ).registerDefinitionRevision(definition);
      const grant = fixture<PetraCapabilityGrantV1160>(
        "capability-grant-v1-16",
      );
      grant.content.allowed_commands = ["ManageProjectWork"];
      grant.content_hash = copilotHash(grant.content);
      await new PostgresCapabilityGrantAuthorityRepository(
        pool,
      ).registerCapabilityGrant(grant);
      origin = fixture<CopilotTurn>("copilot-turn");
      origin.actor_id = actor.actor_id;
      origin.project_id = project.project_id;
      origin.started_at = new Date().toISOString();
      origin.context.basis.definition = {
        record_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      };
      origin.context.basis.objective = null;
      origin.context.definition_family = definition.definition_family;
      const { content_hash: ignored, ...context } = origin.context;
      void ignored;
      origin.context.content_hash = copilotHash(context);
      await turns.begin(origin);
      const terminal: CopilotTerminal = {
        state: "completed",
        finished_at: new Date().toISOString(),
        output: fixture("copilot-output"),
        model: "test-only-conversation-role",
        provider_thread_id: "test-only-thread",
        provider_turn_id: "test-only-turn",
      };
      await turns.finish(origin, terminal);
      const owners = await repository.ownership.read(
        project.project_id,
        actor.actor_id,
        origin.run_id,
      );
      const priorInput = (await work.getInputManifest(
        owners!.records.work.spec.input_manifest_ref.worker_input_manifest_id,
      ))!;
      const workId = derivePetraId("work_unit", "A1 command owner test target");
      const inputContent = {
        ...priorInput.content,
        task: {
          ...priorInput.content.task,
          task_name: "a1.command-owner.fixture",
        },
      };
      const input = {
        ...priorInput,
        worker_input_manifest_id: derivePetraId(
          "worker_input_manifest",
          workId,
        ),
        work_unit_id: workId,
        content: inputContent,
        content_hash: copilotHash(inputContent),
        issued_at: new Date().toISOString(),
      };
      const at = input.issued_at;
      const spec = {
        ...owners!.records.work.spec,
        workflow_name: "a1.command-owner.fixture",
        input_manifest_ref: {
          worker_input_manifest_id: input.worker_input_manifest_id,
          content_hash: input.content_hash,
        },
        idempotency_key: "a1:command-owner:target",
      };
      target = await work.register({
        inputManifest: input,
        workUnit: {
          ...owners!.records.work,
          work_unit_id: workId,
          revision: 1,
          spec,
          spec_hash: copilotHash(spec),
          status: { state: "requested", requested_at: at },
          created_at: at,
          updated_at: at,
        },
      });
      commands = 0;
      providers = 0;
      const nativeRequest = {
        schema_name: "petra.project-work-operation-request",
        schema_version: "1.0.0",
        command_id: derivePetraId("command", "A1 exact conversation command"),
        idempotency_key: "a1:exact-conversation-command",
        expected_work_unit_ref: {
          work_unit_id: target.work_unit_id,
          revision: target.revision,
          spec_hash: target.spec_hash,
        },
        operation: "start",
        submitted_at: at,
      };
      ports = {
        repository,
        context: () => Promise.resolve(structuredClone(origin.context)),
        catalogue: () =>
          Promise.resolve([
            {
              operation_id: "work.start",
              target_id: target.work_unit_id,
              request: nativeRequest,
            },
          ]),
        model: {
          invokeWorkingPlan: (input) => {
            providers++;
            return Promise.resolve({
              model: "test-only-working-plan-role",
              provider_thread_id: "test-only-proposal-thread",
              provider_turn_id: "test-only-proposal-turn",
              output: {
                schema_name: "petra.copilot-working-plan",
                schema_version: "1.0.0",
                authority: "proposed_only",
                explanation: "Review the exact bounded Work before deciding.",
                proposals: [
                  {
                    preview_key: input.previews[0]!.key,
                    changes: [],
                    reason: "Starting this Work remains a human decision.",
                    basis_keys: [],
                  },
                ],
              },
            });
          },
        },
        revalidate: async (command) => {
          const current = await operations.getProjectWorkOperationsView(
            project.project_id,
            target.work_unit_id,
          );
          if (
            current === undefined ||
            copilotHash(current.work_unit_ref) !==
              copilotHash(command.preview.payload.expected_work_unit_ref)
          )
            throw new Error("Exact ordinary Work preview is stale.");
        },
        execute: async (_command, request) => {
          commands++;
          const result = await operations.executeProjectWorkOperation(
            project.project_id,
            request as Parameters<
              typeof operations.executeProjectWorkOperation
            >[1],
            {
              actor: { actor_id: actor.actor_id, actor_kind: "human" },
              capabilityGrantId: grant.capability_grant_id,
            },
          );
          return result;
        },
        now: () => new Date().toISOString(),
      };
    });
    afterAll(async () => {
      await pool.end();
    });
    const propose = () =>
      new CopilotCommandBridge(ports).propose({
        project_id: project.project_id,
        actor_id: actor.actor_id,
        origin_run_id: origin.run_id,
        proposal_id: derivePetraId(
          "proposal",
          "A1 canonical proposal activity",
        ),
        expected_context_hash: origin.context.content_hash,
      });
    const decide = async (choice: "accept" | "reject" = "accept") => {
      const proposal = await repository.read(
        project.project_id,
        actor.actor_id,
        derivePetraId("proposal", "A1 canonical proposal activity"),
      );
      return new CopilotCommandBridge(ports).decide({
        project_id: project.project_id,
        actor_id: actor.actor_id,
        proposal_id: proposal.proposal_id,
        proposal_output_hash: proposal.output_hash!,
        preview_key: proposal.commands[0]!.preview.key,
        preview_hash: proposal.commands[0]!.preview.preview_hash,
        decision_id: derivePetraId("decision", "A1 canonical human decision"),
        decision: choice,
      });
    };
    ownerTest(
      "retains typed proposal Artifacts and real canonical Work Run and origin turn without executing a command",
      async () => {
        const original = await repository.readOrigin(
          project.project_id,
          actor.actor_id,
          origin.run_id,
        );
        const proposal = await propose();
        expect(proposal.state).toBe("completed");
        expect(proposal.output?.authority).toBe("proposed_only");
        expect(commands).toBe(0);
        expect(providers).toBe(1);
        expect(
          (await work.getWorkUnit(proposal.work_unit_ref.work_unit_id))?.status,
        ).toMatchObject({ state: "completed", terminal_outcome: "succeeded" });
        const restarted = new PostgresCopilotCommandProposalRepository(
          pool,
          options,
        );
        expect(
          await restarted.read(
            project.project_id,
            actor.actor_id,
            proposal.proposal_id,
          ),
        ).toEqual(proposal);
        expect(
          await restarted.readOrigin(
            project.project_id,
            actor.actor_id,
            origin.run_id,
          ),
        ).toEqual(original);
        await propose();
        expect(providers).toBe(1);
      },
    );
    ownerTest(
      "retains a human acceptance before the real ordinary Work command and restores the exact receipt after restart and direct replay",
      async () => {
        const proposal = await propose();
        const decision = await decide();
        expect(decision.state).toBe("observed");
        expect(commands).toBe(1);
        expect(
          (await work.getWorkUnit(target.work_unit_id))?.status.state,
        ).toBe("running");
        const count = (
          await pool.query<{ count: string }>(
            "SELECT count(*)::text AS count FROM petra.copilot_command_decision_claims",
          )
        ).rows[0];
        expect(count?.count).toBe("1");
        expect(
          await new PostgresCopilotCommandProposalRepository(
            pool,
            options,
          ).readDecision(decision.decision.decision_id, actor.actor_id),
        ).toEqual(decision);
        const direct = await ports.execute(
          proposal.commands[0]!,
          proposal.commands[0]!.preview.payload,
          actor.actor_id,
        );
        expect(direct).toEqual(decision.receipt);
        await decide();
        expect(commands).toBe(2); // One bridge call plus this explicit ordinary-owner replay.
      },
    );
    ownerTest(
      "retains rejection without command authority and rejects immutable decision replacement and foreign reads",
      async () => {
        const proposal = await propose();
        const rejected = await decide("reject");
        expect(rejected.state).toBe("rejected");
        expect(commands).toBe(0);
        await expect(decide("accept")).rejects.toThrow(/rebound/u);
        await expect(
          repository.claimDecision(
            rejected.decision.decision_id,
            actor.actor_id,
          ),
        ).rejects.toThrow(/acceptance/u);
        await expect(
          repository.read(
            project.project_id,
            derivePetraId("actor", "foreign"),
            proposal.proposal_id,
          ),
        ).rejects.toThrow(/authenticated/u);
        await expect(
          pool.query(
            "UPDATE petra.copilot_command_decisions SET decision='accept' WHERE decision_id=$1",
            [rejected.decision.decision_id],
          ),
        ).rejects.toThrow(/immutable/u);
      },
    );
    ownerTest(
      "records model validation failure as failed canonical Work and cannot attach partial arbitrary output",
      async () => {
        ports = {
          ...ports,
          model: {
            invokeWorkingPlan: () =>
              Promise.resolve({
                model: "test-only-role",
                provider_thread_id: "thread",
                provider_turn_id: "turn",
                output: { authority: "applied" },
              }),
          },
        };
        await expect(propose()).rejects.toThrow();
        const failed = await repository.read(
          project.project_id,
          actor.actor_id,
          derivePetraId("proposal", "A1 canonical proposal activity"),
        );
        expect(failed.state).toBe("failed");
        expect(failed.output).toBeUndefined();
        expect(
          (await work.getWorkUnit(failed.work_unit_ref.work_unit_id))?.status,
        ).toMatchObject({
          state: "completed",
          terminal_outcome: "worker_failed",
        });
        expect(commands).toBe(0);
      },
    );
    ownerTest(
      "rejects stale native revisions before an acceptance or command claim",
      async () => {
        const proposal = await propose();
        const command = copilotCommandPreview({
          operation_id: "work.start",
          target_id: target.work_unit_id,
          context: origin.context,
          request: proposal.commands[0]!.preview.payload,
        });
        await ports.execute(command, command.preview.payload, actor.actor_id);
        await expect(decide()).rejects.toThrow(/stale/u);
        expect(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*)::text AS count FROM petra.copilot_command_decisions",
            )
          ).rows[0]?.count,
        ).toBe("0");
      },
    );
    ownerTest(
      "critical: concurrent proposal requests invoke the role once and concurrent decisions produce one real ordinary effect",
      async () => {
        const proposals = await Promise.all([propose(), propose()]);
        expect(providers).toBe(1);
        expect(
          proposals.some((proposal) => proposal.state === "completed"),
        ).toBe(true);
        const decisions = await Promise.all([decide(), decide()]);
        expect(commands).toBe(1);
        expect(
          decisions.some((decision) => decision.state === "observed"),
        ).toBe(true);
        expect((await decide()).state).toBe("observed");
      },
    );
    ownerTest(
      "critical: the durable owner rejects rehashed foreign context and fabricated native definition identity before starting Work",
      async () => {
        const ownedOrigin = await repository.readOrigin(
          project.project_id,
          actor.actor_id,
          origin.run_id,
        );
        const native = (await ports.catalogue(ownedOrigin, origin.context))[0]!;
        for (const variant of ["project", "definition"] as const) {
          const context = structuredClone(origin.context);
          if (variant === "project")
            context.project_id = derivePetraId("project", "foreign Project");
          else
            context.basis.definition.record_id = derivePetraId(
              "project_definition",
              "fabricated definition",
            );
          const { content_hash: ignored, ...content } = context;
          void ignored;
          context.content_hash = copilotHash(content);
          const command = copilotCommandPreview({ ...native, context });
          await expect(
            repository.begin({
              proposal_id: derivePetraId("proposal", `invalid-${variant}`),
              actor_id: actor.actor_id,
              origin: ownedOrigin,
              input: {
                project_id: context.project_id,
                question: origin.question,
                context,
                previews: [command.preview],
              },
              commands: [command],
            }),
          ).rejects.toThrow(
            variant === "project" ? /foreign Project/u : /ProjectDefinition/u,
          );
        }
        expect(
          (
            await pool.query<{ count: string }>(
              "SELECT count(*)::text AS count FROM petra.copilot_command_proposals",
            )
          ).rows[0]?.count,
        ).toBe("0");
        expect(providers).toBe(0);
        expect(commands).toBe(0);
      },
    );
    ownerTest(
      "critical: a schema-valid rehashed foreign receipt cannot replace the observed command outcome",
      async () => {
        await propose();
        const observed = await decide();
        const receipt: Record<string, unknown> = {
          ...observed.receipt!,
          project_id: derivePetraId("project", "foreign receipt Project"),
        };
        const { record_hash: ignored, ...body } = receipt;
        void ignored;
        await expect(
          repository.observeDecision(
            observed.decision.decision_id,
            actor.actor_id,
            { receipt: { ...body, record_hash: copilotHash(body) } },
          ),
        ).rejects.toThrow(/differs/u);
        expect(
          await repository.readDecision(
            observed.decision.decision_id,
            actor.actor_id,
          ),
        ).toEqual(observed);
        expect(commands).toBe(1);
      },
    );
    ownerTest(
      "critical: restart recovers expired proposal delivery and rejects a late successful replacement",
      async () => {
        let deliver!: (
          value: Awaited<ReturnType<typeof ports.model.invokeWorkingPlan>>,
        ) => void;
        const model = ports.model;
        const originRead = await repository.readOrigin(
          project.project_id,
          actor.actor_id,
          origin.run_id,
        );
        const native = (await ports.catalogue(originRead, origin.context))[0]!;
        const command = copilotCommandPreview({
          ...native,
          context: origin.context,
        });
        const late = await model.invokeWorkingPlan({
          signal: new AbortController().signal,
          project_id: project.project_id,
          context: origin.context,
          question: origin.question,
          previews: [command.preview],
        });
        ports = {
          ...ports,
          model: {
            invokeWorkingPlan: () =>
              new Promise((resolve) => {
                deliver = resolve;
              }),
          },
        };
        const pending = propose();
        // Wait on actual retained owner creation, with a bounded fixture deadline.
        let started = false;
        for (let count = 0; count < 100 && !started; count++) {
          started =
            (await pool.query("SELECT 1 FROM petra.copilot_command_proposals"))
              .rowCount === 1;
          if (!started) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(started).toBe(true);
        const future = Date.now() + 120001;
        vi.useFakeTimers({ toFake: ["Date"] });
        try {
          vi.setSystemTime(future);
          const recovered = await new PostgresCopilotCommandProposalRepository(
            pool,
            options,
          ).read(
            project.project_id,
            actor.actor_id,
            derivePetraId("proposal", "A1 canonical proposal activity"),
          );
          expect(recovered.state).toBe("failed");
          expect(
            (await work.getWorkUnit(recovered.work_unit_ref.work_unit_id))
              ?.status,
          ).toMatchObject({
            state: "completed",
            terminal_outcome: "timed_out",
          });
          const denied = expect(pending).rejects.toThrow(/immutable/u);
          deliver(late);
          await denied;
          expect(
            (
              await repository.read(
                project.project_id,
                actor.actor_id,
                recovered.proposal_id,
              )
            ).state,
          ).toBe("failed");
          expect(commands).toBe(0);
        } finally {
          vi.useRealTimers();
        }
      },
    );
    ownerTest(
      "critical: direct owner calls cannot substitute the selected command or complete ordinary body",
      async () => {
        await propose();
        const rejected = await decide("reject");
        for (const field of ["preview_key", "request", "command"] as const) {
          const candidate = structuredClone(rejected.decision);
          if (field === "preview_key")
            Object.assign(candidate, { preview_key: "unselected" });
          if (field === "request")
            Object.assign(candidate, {
              request: {
                ...candidate.request,
                idempotency_key: "different-owner-body",
              },
            });
          if (field === "command")
            Object.assign(candidate, {
              command: {
                ...candidate.command,
                ordinary_command: {
                  ...candidate.command.ordinary_command,
                  command_name: "ApplyChangeSet",
                },
              },
            });
          await expect(repository.retainDecision(candidate)).rejects.toThrow(
            /exact model-proposed/u,
          );
        }
        expect(commands).toBe(0);
      },
    );
    ownerTest(
      "critical: restart exposes a claimed but unobserved command without executing it again",
      async () => {
        const proposal = await propose();
        const command = proposal.commands[0]!;
        const decision = await repository.retainDecision({
          decision_id: derivePetraId("decision", "crashed command claim"),
          proposal_id: proposal.proposal_id,
          actor_id: actor.actor_id,
          proposal_output_hash: proposal.output_hash!,
          preview_key: command.preview.key,
          preview_hash: command.preview.preview_hash,
          decision: "accept",
          decided_at: new Date().toISOString(),
          command,
          request: command.preview.payload,
        });
        expect(
          await repository.claimDecision(
            decision.decision.decision_id,
            actor.actor_id,
          ),
        ).toBe(true);
        const restarted = new PostgresCopilotCommandProposalRepository(
          pool,
          options,
        );
        expect(
          await restarted.readDecision(
            decision.decision.decision_id,
            actor.actor_id,
          ),
        ).toMatchObject({ state: "pending", command_claimed: true });
        const replay = await new CopilotCommandBridge({
          ...ports,
          repository: restarted,
        }).decide({
          project_id: project.project_id,
          actor_id: actor.actor_id,
          proposal_id: proposal.proposal_id,
          proposal_output_hash: proposal.output_hash!,
          preview_key: command.preview.key,
          preview_hash: command.preview.preview_hash,
          decision_id: decision.decision.decision_id,
          decision: "accept",
        });
        expect(replay.command_claimed).toBe(true);
        expect(replay.receipt).toBeUndefined();
        expect(commands).toBe(0);
        expect(
          await restarted.claimDecision(
            decision.decision.decision_id,
            actor.actor_id,
          ),
        ).toBe(false);
      },
    );
  },
);
