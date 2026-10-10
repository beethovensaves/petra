import { readFileSync } from "node:fs";
import pg from "pg";
import { beforeEach, afterAll, describe, it, expect } from "vitest";
import type {
  PetraProject,
  PetraActor,
  PetraProjectDefinition,
  PetraCopilotAuthorityRequest,
} from "@petra/contracts";
import { copilotHash, derivePetraId, type CopilotTurn } from "@petra/core";
import { PostgresCopilotPermissionAuthority } from "../src/copilot-permission-authority.js";
import { PostgresCopilotTurnRepository } from "../src/project-copilot-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresCapabilityGrantCommandAuthorizer } from "../src/capability-grant-authority-repository.js";
import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { createMemoryArtifactStore } from "./artifact-store-fixture.js";
const url = process.env.PETRA_TEST_POSTGRES_URL;
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
(url === undefined ? describe.skip : describe)(
  "Explicit native conversation permission",
  () => {
    const pool = new pg.Pool({ connectionString: url }),
      actor = fixture<PetraActor>("actor"),
      project = fixture<PetraProject>("project"),
      definition = fixture<PetraProjectDefinition>(
        "project-definition-scientific",
      );
    const permission = new PostgresCopilotPermissionAuthority(
        pool,
        actor.actor_id,
      ),
      scopes = new PostgresResearchScopeRepository(pool);
    beforeEach(async () => {
      await pool.query("TRUNCATE petra.actors CASCADE");
      await scopes.registerActor(actor);
      await scopes.registerProjectRevision(project);
      await new PostgresProjectDefinitionAuthorityRepository(
        pool,
      ).registerDefinitionRevision(definition);
    });
    afterAll(() => pool.end());
    const request = async () => {
      const current = await permission.read(project.project_id);
      if (current.state !== "required")
        throw new Error("The new Project must require actual permission.");
      return {
        schema_name: "petra.copilot-authority-request",
        schema_version: "1.0.0",
        project_id: project.project_id,
        command_id: derivePetraId(
          "command",
          "reviewed-conversation-permission",
        ),
        idempotency_key: "reviewed-conversation-permission",
        proposal: current.proposal,
        review: {
          proposed_content_hash: copilotHash(current.proposal),
          reviewed_at: new Date().toISOString(),
        },
      } satisfies PetraCopilotAuthorityRequest;
    };
    const count = async (
      table: "capability_grants" | "copilot_authority_receipts" | "work_units",
    ) =>
      (
        await pool.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM petra.${table}`,
        )
      ).rows[0]!.count;
    it("requires explicit reviewed owner permission before bounded native Work and preserves exact retry receipts", async () => {
      const proposed = await request();
      expect(await count("capability_grants")).toBe(0);
      const receipt = await permission.execute(project.project_id, proposed);
      expect(receipt.content.grant.content.allowed_commands).toEqual([
        "RunProjectCopilot",
      ]);
      expect(
        await permission.execute(project.project_id, structuredClone(proposed)),
      ).toEqual(receipt);
      expect(await count("capability_grants")).toBe(1);
      expect(await count("copilot_authority_receipts")).toBe(1);
      expect(await count("work_units")).toBe(0);
      expect((await permission.read(project.project_id)).state).toBe("ready");
      const client = await pool.connect();
      try {
        const authorizer = new PostgresCapabilityGrantCommandAuthorizer();
        for (const commandName of [
          "ManageProjectWork",
          "ConductProjectExamination",
          "ApplyChangeSet",
        ] as const)
          expect(
            await authorizer.authorize(
              {
                actor: { actor_id: actor.actor_id, actor_kind: "human" },
                capabilityGrantId: receipt.content.grant.capability_grant_id,
                commandName,
                projectId: project.project_id,
              },
              client,
            ),
          ).toBe(false);
      } finally {
        client.release();
      }
      const store = createMemoryArtifactStore(),
        turns = new PostgresCopilotTurnRepository(pool, {
          actorId: actor.actor_id,
          artifactStore: store,
          artifacts: new PostgresArtifactAuthorityRepository(pool, store),
        }),
        turn = fixture<CopilotTurn>("copilot-turn");
      turn.actor_id = actor.actor_id;
      turn.project_id = project.project_id;
      turn.context.project_id = project.project_id;
      turn.started_at = new Date().toISOString();
      turn.focus_keys = [];
      turn.context.basis.objective = null;
      turn.context.basis.definition = {
        record_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      };
      turn.context.definition_family = definition.definition_family;
      const { content_hash: ignored, ...context } = turn.context;
      void ignored;
      turn.context.content_hash = copilotHash(context);
      await turns.begin(turn);
      await turns.finish(turn, {
        state: "failed",
        finished_at: new Date().toISOString(),
        error: "Synthetic narrow permission test; no provider invoked.",
      });
      expect(await count("work_units")).toBe(1);
      const owned = (await turns.ownership!.read(
        project.project_id,
        actor.actor_id,
        turn.run_id,
      ))!;
      expect(owned.records.work.capability_grant_id).toBe(
        receipt.content.grant.capability_grant_id,
      );
      expect(
        owned.records.run.content.authority_context.capability_grant_id,
      ).toBe(receipt.content.grant.capability_grant_id);
    });
    it("converges concurrent identical consent on one actual grant and immutable receipt", async () => {
      const proposed = await request(),
        result = await Promise.all([
          permission.execute(project.project_id, proposed),
          permission.execute(project.project_id, structuredClone(proposed)),
        ]);
      expect(result[0]).toEqual(result[1]);
      expect(await count("capability_grants")).toBe(1);
      expect(await count("copilot_authority_receipts")).toBe(1);
      await expect(
        pool.query(
          "UPDATE petra.copilot_authority_receipts SET receipt_payload=receipt_payload",
        ),
      ).rejects.toThrow();
    });
    it("denies widened capabilities stale owner references future review and receipt identity substitution before writes", async () => {
      const proposed = await request();
      for (const change of [
        (value: PetraCopilotAuthorityRequest) => {
          value.proposal.allowed_commands = [
            "ManageProjectWork",
          ] as unknown as ["RunProjectCopilot"];
        },
        (value: PetraCopilotAuthorityRequest) => {
          value.proposal.project_record_hash = copilotHash("wrong Project");
          value.review.proposed_content_hash = copilotHash(value.proposal);
        },
        (value: PetraCopilotAuthorityRequest) => {
          value.proposal.actor_id = derivePetraId(
            "actor",
            "foreign permission",
          );
          value.review.proposed_content_hash = copilotHash(value.proposal);
        },
        (value: PetraCopilotAuthorityRequest) => {
          value.review.proposed_content_hash = copilotHash("wrong review");
        },
        (value: PetraCopilotAuthorityRequest) => {
          value.review.reviewed_at = new Date(Date.now() + 60000).toISOString();
        },
      ]) {
        const mutated = structuredClone(proposed);
        change(mutated);
        await expect(
          permission.execute(project.project_id, mutated),
        ).rejects.toThrow();
        expect(await count("capability_grants")).toBe(0);
        expect(await count("copilot_authority_receipts")).toBe(0);
      }
      await permission.execute(project.project_id, proposed);
      await expect(
        permission.execute(project.project_id, {
          ...proposed,
          idempotency_key: "substituted-receipt-key",
        }),
      ).rejects.toMatchObject({ code: "CONVERSATION_PERMISSION_CONFLICT" });
      expect(await count("capability_grants")).toBe(1);
    });
    it("denies another actor or Project and rolls back a grant when receipt retention fails", async () => {
      const proposed = await request(),
        foreign = new PostgresCopilotPermissionAuthority(
          pool,
          derivePetraId("actor", "not registered owner"),
        );
      expect((await foreign.read(project.project_id)).state).toBe(
        "unavailable",
      );
      await expect(
        foreign.execute(project.project_id, proposed),
      ).rejects.toThrow();
      await expect(
        permission.execute(
          derivePetraId("project", "foreign permission"),
          proposed,
        ),
      ).rejects.toThrow();
      await pool.query(
        "CREATE FUNCTION petra.force_permission_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic late permission receipt failure'; END $$",
      );
      await pool.query(
        "CREATE TRIGGER force_permission_failure BEFORE INSERT ON petra.copilot_authority_receipts FOR EACH ROW EXECUTE FUNCTION petra.force_permission_failure()",
      );
      try {
        await expect(
          permission.execute(project.project_id, proposed),
        ).rejects.toThrow(/late permission receipt failure/u);
        expect(await count("capability_grants")).toBe(0);
        expect(await count("copilot_authority_receipts")).toBe(0);
      } finally {
        await pool.query(
          "DROP TRIGGER force_permission_failure ON petra.copilot_authority_receipts",
        );
        await pool.query("DROP FUNCTION petra.force_permission_failure()");
      }
      await permission.execute(project.project_id, proposed);
      expect(await count("capability_grants")).toBe(1);
    });
  },
);
