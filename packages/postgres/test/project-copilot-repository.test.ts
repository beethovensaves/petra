import { readFileSync } from "node:fs";
import pg from "pg";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import {
  assertConversationOwnerBinding,
  conversationResultRecord,
  derivePetraId,
  COPILOT_PROFILE,
  copilotModelPayload,
  copilotHash,
  type CopilotTurn,
  type CopilotTerminal,
} from "@petra/core";
import type {
  PetraProjectDefinition,
  PetraCapabilityGrantV1160,
  PetraActor,
  PetraProject,
  PetraProjectSemanticGraphView,
  PetraCopilotInputManifest,
} from "@petra/contracts";
import { PostgresCopilotTurnRepository } from "../src/project-copilot-repository.js";
import { PostgresProjectThreadAuthorityRepository } from "../src/project-thread-authority-repository.js";
import { PostgresProjectThreadViewReader } from "../src/project-thread-view-reader.js";
import { PostgresProjectWorkViewReader } from "../src/project-work-view-reader.js";
import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresCapabilityGrantAuthorityRepository } from "../src/capability-grant-authority-repository.js";
import { createMemoryArtifactStore } from "./artifact-store-fixture.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";

const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
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
const input = fixture<CopilotTurn>("copilot-turn");
const actor = fixture<PetraActor>("actor");
const project = fixture<PetraProject>("project");
const completed: CopilotTerminal = {
  state: "completed",
  finished_at: "2026-10-07T14:00:10.000Z",
  output: fixture("copilot-output"),
  model: "test-only-model",
  provider_thread_id: "test-only-thread",
  provider_turn_id: "test-only-turn",
};

(connectionString === undefined ? describe.skip : describe)(
  "PostgreSQL immutable copilot conversation",
  () => {
    const pool = new pg.Pool({ connectionString });
    const store = createMemoryArtifactStore();
    const ownershipOptions = {
      actorId: actor.actor_id,
      artifactStore: store,
      artifacts: new PostgresArtifactAuthorityRepository(pool, store),
    };
    const repository = new PostgresCopilotTurnRepository(
      pool,
      ownershipOptions,
    );
    const definition = fixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const scopes = new PostgresResearchScopeRepository(pool);
    beforeAll(async () => {
      await pool.query("SELECT 1");
    });
    beforeEach(async () => {
      await pool.query("TRUNCATE petra.actors CASCADE");
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
      completed.finished_at = new Date(Date.now() + 1000).toISOString();
    });
    afterAll(async () => {
      await pool.end();
    });
    const turn = (): CopilotTurn => {
      const value: CopilotTurn = {
        ...structuredClone(input),
        actor_id: actor.actor_id,
        project_id: project.project_id,
        started_at: new Date().toISOString(),
      };
      value.context.basis.definition = {
        record_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      };
      value.context.basis.objective = null;
      value.context.definition_family = definition.definition_family;
      const { content_hash: ignored, ...context } = value.context;
      void ignored;
      value.context.content_hash = copilotHash(context);
      return value;
    };

    it("claims a concurrent identity exactly once and restores readable terminal text after repository restart", async () => {
      const request = turn();
      const results = await Promise.all([
        repository.begin(request),
        repository.begin(request),
      ]);
      expect(results.filter((result) => result.claimed)).toHaveLength(1);
      await repository.finish(request, completed);
      const restarted = new PostgresCopilotTurnRepository(
        pool,
        ownershipOptions,
      );
      const retained = await restarted.get(
        project.project_id,
        actor.actor_id,
        request.run_id,
      );
      expect(retained?.question).toBe(request.question);
      expect(retained?.terminal?.output?.blocks[0]?.text).toBe(
        completed.output?.blocks[0]?.text,
      );
      expect((await restarted.begin(request)).claimed).toBe(false);
      expect(
        (await restarted.list(project.project_id, actor.actor_id)).at(-1)
          ?.run_id,
      ).toBe(request.run_id);
    });
    it("rejects conflicting retries, stale parents, and continuation while a prior turn is active", async () => {
      const first = turn();
      await repository.begin(first);
      await expect(
        repository.begin({
          ...first,
          request_hash: copilotHash("another question"),
        }),
      ).rejects.toThrow("another request");
      const second = {
        ...turn(),
        run_id: "run_01K4C000000000000000000001",
        parent_run_id: first.run_id,
      };
      await expect(repository.begin(second)).rejects.toThrow("active answer");
      await repository.finish(first, completed);
      await expect(
        repository.begin({ ...second, parent_run_id: null }),
      ).rejects.toThrow("Refresh");
      expect((await repository.begin(second)).claimed).toBe(true);
    });
    it("restores the original graph presentation after restart and a later semantic result", async () => {
      const { graphPresentationContent, graphPresentationPeer, derivePetraId } =
        await import("@petra/core");
      const source = fixture<PetraProjectSemanticGraphView>(
        "project-semantic-graph-view",
      );
      source.project_id = project.project_id;
      source.content_hash = copilotHash(source.content);
      const content = graphPresentationContent(source, {
        renderer: "native_working",
        mode: "text",
        semantic_content_hash: source.content_hash,
        selected_keys: [],
        excluded_kinds: [],
      });
      const complete = {
        ...content,
        peer_content_hash: copilotHash(graphPresentationPeer(content)),
      };
      const scene = {
        schema_name: "petra.graph-presentation-context" as const,
        schema_version: "1.0.0" as const,
        content: complete,
        content_hash: copilotHash(complete),
      };
      const request = turn();
      request.schema_version = "1.1.0";
      request.shared_scene = scene;
      request.context.records.push({
        key: `scene:${scene.content_hash.slice(7, 23)}`,
        ref: {
          record_id: derivePetraId("graph_scene", scene.content_hash),
          revision: 1,
          record_hash: copilotHash(scene),
        },
        kind: "graph-presentation-context",
        label: "Shared graph",
        destination: `/projects/${project.project_id}/graph`,
        text: "Exact synthetic scene metadata.",
      });
      const { content_hash: previousHash, ...context } = request.context;
      expect(previousHash).toMatch(/^sha256:/u);
      request.context.content_hash = copilotHash(context);
      await repository.begin(request);
      await repository.finish(request, completed);
      source.content.omitted_candidates++;
      source.content_hash = copilotHash(source.content);
      const restarted = new PostgresCopilotTurnRepository(
        pool,
        ownershipOptions,
      );
      const retained = await restarted.get(
        project.project_id,
        actor.actor_id,
        request.run_id,
      );
      expect(retained?.schema_version).toBe("1.1.0");
      expect(retained?.shared_scene).toEqual(scene);
      expect(
        retained?.shared_scene?.content.parameters.semantic_content_hash,
      ).not.toBe(source.content_hash);
      await expect(
        pool.query(
          "UPDATE petra.project_copilot_turns SET payload=jsonb_set(payload,'{shared_scene,content_hash}','\"sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff\"') WHERE run_id=$1",
          [request.run_id],
        ),
      ).rejects.toThrow(/immutable/u);
    });
    it("isolates reads by authenticated actor and Project", async () => {
      const request = turn();
      await repository.begin(request);
      expect(
        await repository.get(
          project.project_id,
          "actor_01K4C000000000000000000001",
          request.run_id,
        ),
      ).toBeUndefined();
      expect(
        await repository.list(
          "project_01K4C000000000000000000001",
          actor.actor_id,
        ),
      ).toEqual([]);
    });
    it("prevents updates and records expired uncertain invocation as failure without another model call", async () => {
      const request = { ...turn(), started_at: "2026-01-01T00:00:00.000Z" };
      await repository.begin(request);
      await expect(
        pool.query(
          "UPDATE petra.project_copilot_turns SET payload = payload WHERE run_id = $1",
          [request.run_id],
        ),
      ).rejects.toThrow();
      await repository.recover();
      const recovered = await repository.get(
        project.project_id,
        actor.actor_id,
        request.run_id,
      );
      expect(recovered?.terminal?.state).toBe("failed");
      expect(recovered?.terminal?.error).toContain("unknown");
      await repository.finish(request, completed);
      expect(
        (
          await repository.get(
            project.project_id,
            actor.actor_id,
            request.run_id,
          )
        )?.terminal?.state,
      ).toBe("failed");
    });
    it("retains an immutable owner-bound input manifest across repository restart and rejects replacement or wrong actor", async () => {
      const request = turn();
      await repository.begin(request);
      const manifest = fixture<PetraCopilotInputManifest>(
        "copilot-input-manifest",
      );
      manifest.content.run_id = request.run_id;
      manifest.content.thread_id = request.thread_id;
      manifest.content.project_id = request.project_id;
      manifest.content.actor_id = request.actor_id;
      manifest.content.context_hash = request.context.content_hash;
      manifest.content.profile_hash = copilotHash(COPILOT_PROFILE);
      const payload = copilotModelPayload({
        context: request.context,
        question: request.question,
        focus_keys: request.focus_keys,
        history: [],
      });
      manifest.content.input_payload_hash = copilotHash(payload);
      manifest.content.input_bytes = Buffer.byteLength(JSON.stringify(payload));
      manifest.content.context_record_keys = request.context.records.map(
        (record) => record.key,
      );
      manifest.content_hash = copilotHash(manifest.content);
      await repository.putInputManifest(request, manifest);
      await repository.putInputManifest(request, structuredClone(manifest));
      const restarted = new PostgresCopilotTurnRepository(
        pool,
        ownershipOptions,
      );
      expect(
        (
          await restarted.get(
            request.project_id,
            request.actor_id,
            request.run_id,
          )
        )?.input_manifest,
      ).toEqual(manifest);
      const otherActor = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAX";
      const other = structuredClone(manifest);
      other.content.actor_id = otherActor;
      other.content_hash = copilotHash(other.content);
      await expect(
        repository.putInputManifest(
          { ...request, actor_id: otherActor },
          other,
        ),
      ).rejects.toMatchObject({ code: "INPUT_MANIFEST_MISMATCH" });
      const changed = structuredClone(manifest);
      changed.content.input_payload_hash = "sha256:" + "a".repeat(64);
      changed.content_hash = copilotHash(changed.content);
      await expect(
        repository.putInputManifest(request, changed),
      ).rejects.toMatchObject({ code: "INPUT_MANIFEST_CONFLICT" });
      await expect(
        pool.query(
          "UPDATE petra.project_copilot_input_manifests SET payload=payload WHERE run_id=$1",
          [request.run_id],
        ),
      ).rejects.toBeDefined();
      await repository.finish(request, completed);
      expect(
        (
          await restarted.get(
            request.project_id,
            request.actor_id,
            request.run_id,
          )
        )?.input_manifest,
      ).toEqual(manifest);
    });
    it("binds readable native question and result Artifacts to canonical Thread Run and Work owners", async () => {
      const request = turn();
      await repository.begin(request);
      const pending = await repository.ownership!.read(
        request.project_id,
        request.actor_id,
        request.run_id,
      );
      expect(pending?.records.run.content.lifecycle.state).toBe("running");
      expect(pending?.records.work.status.state).toBe("running");
      expect(pending?.records.thread.content.turns).toHaveLength(0);
      const retained = await repository.finish(request, {
        ...completed,
        finished_at: new Date().toISOString(),
      });
      const owner = await repository.ownership!.read(
        request.project_id,
        request.actor_id,
        request.run_id,
      );
      expect(owner).toBeDefined();
      assertConversationOwnerBinding(retained, owner!.binding, owner!.records);
      const material = owner!.records.thread.content.turns[0]!;
      expect(material.context.context_record_ref.schema_name).toBe(
        "petra.copilot-context",
      );
      expect(material.response.result_record_ref.schema_name).toBe(
        "petra.conversation-result",
      );
      expect(material.input.retention_state).toBe("retained_artifact");
      expect(owner!.records.run.content.input.input_hash).toBe(
        owner!.binding.turn_content_hash,
      );
      expect(owner!.records.work.status).toMatchObject({
        state: "completed",
        terminal_outcome: "succeeded",
      });
      const reader = await store.readByHash(
        material.response.response_artifact_ref.content_hash,
        {
          byteSize: material.response.response_artifact_ref.byte_size,
          mediaType: material.response.response_artifact_ref.media_type,
        },
      );
      let text = "";
      for await (const bytes of reader.bytes)
        text += new TextDecoder().decode(bytes);
      expect(JSON.parse(text)).toEqual(
        conversationResultRecord(request, retained.terminal!),
      );
      const view = await new PostgresProjectThreadViewReader(
        pool,
      ).getProjectThreadView(
        request.project_id,
        owner!.records.thread.project_thread_id,
      );
      expect(view?.schema_version).toBe("1.1.0");
      expect(view?.content.view_kind).toBe("detail");
      const work = await new PostgresProjectWorkViewReader(
        pool,
      ).getProjectWorkView(
        request.project_id,
        owner!.records.work.work_unit_id,
      );
      expect(work?.content.view_kind).toBe("detail");
      if (work?.content.view_kind !== "detail")
        throw new Error("Canonical Work detail must be readable.");
      expect(work.content.resources.usage.state).toBe("unavailable");
    });
    it("retains failed and cancelled native deliveries without successful scientific result aliases", async () => {
      const request = turn();
      await repository.begin(request);
      const failed = await repository.finish(request, {
        state: "failed",
        finished_at: new Date().toISOString(),
        error: "Synthetic provider was unavailable.",
      });
      const failure = await repository.ownership!.read(
        request.project_id,
        request.actor_id,
        request.run_id,
      );
      expect(failure!.records.run.content.lifecycle.state).toBe("failed");
      expect(failure!.records.thread.content.turns[0]?.response.state).toBe(
        "failed",
      );
      expect(failure!.records.work.status).toMatchObject({
        state: "completed",
        terminal_outcome: "worker_failed",
      });
      assertConversationOwnerBinding(
        failed,
        failure!.binding,
        failure!.records,
      );
      const next = {
        ...turn(),
        run_id: derivePetraId("run", "native-cancellation"),
        parent_run_id: request.run_id,
      };
      await repository.begin(next);
      const cancelled = await repository.finish(next, {
        state: "cancelled",
        finished_at: new Date().toISOString(),
        error: "Synthetic explicit cancellation.",
      });
      const owner = await repository.ownership!.read(
        next.project_id,
        next.actor_id,
        next.run_id,
      );
      expect(owner!.records.run.content.lifecycle.state).toBe("cancelled");
      expect(owner!.records.work.status.state).toBe("cancelled");
      expect(owner!.records.thread.content.turns.at(-1)?.response.state).toBe(
        "cancelled",
      );
      assertConversationOwnerBinding(cancelled, owner!.binding, owner!.records);
      expect(
        (
          await pool.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM petra.grounded_responses",
          )
        ).rows[0]!.count,
      ).toBe(0);
    });
    it("adopts immutable historical content as an explicit import without fabricating its original execution authority", async () => {
      const request = { ...turn(), started_at: "2026-10-07T14:00:00.000Z" };
      const terminal = {
        ...completed,
        finished_at: "2026-10-07T14:00:10.000Z",
      };
      await pool.query(
        "INSERT INTO petra.project_copilot_turns(run_id,thread_id,project_id,actor_id,parent_run_id,request_hash,payload,started_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)",
        [
          request.run_id,
          request.thread_id,
          request.project_id,
          request.actor_id,
          null,
          request.request_hash,
          JSON.stringify(request),
          request.started_at,
        ],
      );
      await pool.query(
        "INSERT INTO petra.project_copilot_terminals(run_id,state,payload,finished_at) VALUES($1,$2,$3::jsonb,$4)",
        [
          request.run_id,
          terminal.state,
          JSON.stringify(terminal),
          terminal.finished_at,
        ],
      );
      const retained = await repository.get(
        request.project_id,
        request.actor_id,
        request.run_id,
      );
      expect(retained?.question).toBe(request.question);
      expect(retained?.terminal).toEqual(terminal);
      const owner = await repository.ownership!.read(
        request.project_id,
        request.actor_id,
        request.run_id,
      );
      expect(owner!.binding.capture).toBe("historical_adoption");
      expect(owner!.records.work.spec.workflow_name).toBe(
        "petra.copilot.adopt-history",
      );
      expect(Date.parse(owner!.records.work.created_at)).toBeGreaterThan(
        Date.parse(terminal.finished_at),
      );
      expect(owner!.records.run.content.lifecycle).toMatchObject({
        state: "completed",
        outcome_code: "HISTORICAL_CONTENT_ADOPTED",
      });
      const before = (
        await pool.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM petra.work_units",
        )
      ).rows[0]!.count;
      await repository.get(
        request.project_id,
        request.actor_id,
        request.run_id,
      );
      expect(
        (
          await pool.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM petra.work_units",
          )
        ).rows[0]!.count,
      ).toBe(before);
    });
    it("rolls back terminal content and every canonical owner when a late binding write fails", async () => {
      const request = turn();
      await repository.begin(request);
      await pool.query(
        "CREATE FUNCTION petra.a1_force_binding_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.revision=2 THEN RAISE EXCEPTION 'synthetic late ownership failure'; END IF; RETURN NEW; END $$",
      );
      await pool.query(
        "CREATE TRIGGER a1_force_binding_failure BEFORE INSERT ON petra.project_copilot_owner_bindings FOR EACH ROW EXECUTE FUNCTION petra.a1_force_binding_failure()",
      );
      const terminal = { ...completed, finished_at: new Date().toISOString() };
      try {
        await expect(repository.finish(request, terminal)).rejects.toThrow(
          "late ownership failure",
        );
        const retained = await repository.get(
          request.project_id,
          request.actor_id,
          request.run_id,
        );
        expect(retained?.terminal).toBeUndefined();
        const owner = await repository.ownership!.read(
          request.project_id,
          request.actor_id,
          request.run_id,
        );
        expect(owner!.records.run.revision).toBe(1);
        expect(owner!.records.work.revision).toBe(3);
        expect(owner!.records.thread.revision).toBe(1);
        expect(
          (
            await pool.query<{ count: number }>(
              "SELECT count(*)::int AS count FROM petra.worker_output_manifests",
            )
          ).rows[0]!.count,
        ).toBe(0);
      } finally {
        await pool.query(
          "DROP TRIGGER a1_force_binding_failure ON petra.project_copilot_owner_bindings",
        );
        await pool.query("DROP FUNCTION petra.a1_force_binding_failure()");
      }
      const retained = await repository.finish(request, terminal);
      expect(retained.terminal).toEqual(terminal);
      await repository.finish(request, terminal);
      expect(
        (
          await pool.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM petra.work_units",
          )
        ).rows[0]!.count,
      ).toBe(1);
      expect(
        (
          await pool.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM petra.worker_output_manifests",
          )
        ).rows[0]!.count,
      ).toBe(1);
    });
    it("rejects validly rehashed foreign owners question substitution and hidden terminal state before releasing retained content", async () => {
      const request = turn();
      await repository.begin(request);
      const retained = await repository.finish(request, {
        ...completed,
        finished_at: new Date().toISOString(),
      });
      const owner = (await repository.ownership!.read(
        request.project_id,
        request.actor_id,
        request.run_id,
      ))!;
      const foreign = structuredClone(owner.records);
      foreign.run.project_id = derivePetraId("project", "another-owner");
      expect(() =>
        assertConversationOwnerBinding(retained, owner.binding, foreign),
      ).toThrow(/canonical InteractionRun/u);
      const changed = { ...retained, question: "Substituted private question" };
      expect(() =>
        assertConversationOwnerBinding(changed, owner.binding, owner.records),
      ).toThrow(/original context/u);
      const { terminal: ignored, ...pending } = retained;
      void ignored;
      expect(() =>
        assertConversationOwnerBinding(pending, owner.binding, owner.records),
      ).toThrow(/unanswered conversation/u);
      const lineage = structuredClone(owner.records);
      lineage.lineage[0]!.record_id = derivePetraId(
        "work_unit",
        "false-primary-key",
      );
      expect(() =>
        assertConversationOwnerBinding(retained, owner.binding, lineage),
      ).toThrow(/lineage/u);
    });
    it("pages exact retained questions and answers without duplicate effects and keeps its anchor across later turns", async () => {
      const original: CopilotTurn[] = [];
      for (let index = 0; index < 4; index++) {
        const request = {
          ...turn(),
          run_id: derivePetraId("run", `paged-history-${index}`),
          parent_run_id: original.at(-1)?.run_id ?? null,
          question: `Synthetic paged question ${index}`,
        };
        await repository.begin(request);
        original.push(
          await repository.finish(request, {
            ...completed,
            finished_at: new Date().toISOString(),
          }),
        );
      }
      const first = await repository.listPage(
        project.project_id,
        actor.actor_id,
        { thread_id: original[0]!.thread_id, limit: 2 },
      );
      expect(first.entries.map((entry) => entry.turn)).toEqual(
        original.slice(2),
      );
      expect(first.page).toMatchObject({ returned_count: 2, has_more: true });
      const next = {
        ...turn(),
        run_id: derivePetraId("run", "later-page-turn"),
        parent_run_id: original.at(-1)!.run_id,
      };
      await repository.begin(next);
      await repository.finish(next, {
        ...completed,
        finished_at: new Date().toISOString(),
      });
      const restarted = new PostgresCopilotTurnRepository(
        pool,
        ownershipOptions,
      );
      const second = await restarted.listPage(
        project.project_id,
        actor.actor_id,
        {
          thread_id: original[0]!.thread_id,
          limit: 2,
          cursor: first.page.next_cursor!,
        },
      );
      expect(second.entries.map((entry) => entry.turn)).toEqual(
        original.slice(0, 2),
      );
      expect(second.page).toMatchObject({
        returned_count: 2,
        has_more: false,
        anchor_sequence: first.page.anchor_sequence,
      });
      for (const entry of [...second.entries, ...first.entries]) {
        const actual = (await repository.ownership!.read(
          project.project_id,
          actor.actor_id,
          entry.turn.run_id,
        ))!;
        assertConversationOwnerBinding(
          entry.turn,
          entry.owners,
          actual.records,
        );
      }
      expect(
        (
          await pool.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM petra.work_units",
          )
        ).rows[0]!.count,
      ).toBe(5);
    });
    it("denies malformed foreign and invalid page positions without releasing retained content", async () => {
      const request = turn();
      await repository.begin(request);
      await repository.finish(request, {
        ...completed,
        finished_at: new Date().toISOString(),
      });
      const first = await repository.listPage(
        project.project_id,
        actor.actor_id,
        { thread_id: request.thread_id, limit: 1 },
      );
      for (const data of [
        null,
        [],
        false,
        {
          project_id: project.project_id,
          actor_id: actor.actor_id,
          thread_id: request.thread_id,
          anchor: first.page.anchor_sequence,
          before: 0,
        },
        {
          project_id: derivePetraId("project", "foreign-page"),
          actor_id: actor.actor_id,
          thread_id: request.thread_id,
          anchor: 1,
          before: 1,
        },
      ]) {
        const cursor = `history:${Buffer.from(JSON.stringify(data)).toString("base64url")}`;
        await expect(
          repository.listPage(project.project_id, actor.actor_id, {
            thread_id: request.thread_id,
            cursor,
          }),
        ).rejects.toMatchObject({ code: "INVALID_HISTORY_PAGE" });
      }
      await expect(
        repository.listPage(project.project_id, actor.actor_id, {
          thread_id: request.thread_id,
          limit: 51,
        }),
      ).rejects.toMatchObject({ code: "INVALID_HISTORY_PAGE" });
      const foreign = await repository.listPage(
        project.project_id,
        derivePetraId("actor", "foreign-page"),
        { thread_id: request.thread_id },
      );
      expect(foreign.entries).toEqual([]);
    });
    it("denies a copied material turn in a second canonical Thread even when every content hash is valid", async () => {
      const request = turn();
      await repository.begin(request);
      await repository.finish(request, {
        ...completed,
        finished_at: new Date().toISOString(),
      });
      const owner = (await repository.ownership!.read(
        project.project_id,
        actor.actor_id,
        request.run_id,
      ))!;
      const copied = {
        ...structuredClone(owner.records.thread),
        project_thread_id: derivePetraId(
          "project_thread",
          "duplicate-authority",
        ),
        revision: 1,
        lineage: { lineage_kind: "root" as const },
      };
      await expect(
        new PostgresProjectThreadAuthorityRepository(
          pool,
        ).registerProjectThreadRevision(copied),
      ).rejects.toThrow(/native turn/u);
      expect(
        (
          await pool.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM petra.project_threads",
          )
        ).rows[0]!.count,
      ).toBe(1);
    });
    it("denies substituted authority references false history imports missing material and a changed retry question", async () => {
      const request = turn();
      await repository.begin(request);
      await expect(
        repository.begin({
          ...request,
          question: "Changed question with reused request hash",
        }),
      ).rejects.toThrow(/another request/u);
      const retained = await repository.finish(request, {
        ...completed,
        finished_at: new Date().toISOString(),
      });
      const owner = (await repository.ownership!.read(
        project.project_id,
        actor.actor_id,
        request.run_id,
      ))!;
      for (const field of [
        "privacy_profile_ref",
        "budget_profile_ref",
      ] as const) {
        const records = structuredClone(owner.records),
          binding = structuredClone(owner.binding);
        records.thread.content.turns[0]!.authority_context[field].content_hash =
          copilotHash("substituted authority");
        records.thread.content_hash = copilotHash(records.thread.content);
        binding.project_thread_ref.content_hash = records.thread.content_hash;
        expect(() =>
          assertConversationOwnerBinding(retained, binding, records),
        ).toThrow(/authority boundary/u);
      }
      expect(() =>
        assertConversationOwnerBinding(
          retained,
          { ...owner.binding, capture: "historical_adoption" },
          owner.records,
        ),
      ).toThrow(/retention-import/u);
      const records = structuredClone(owner.records),
        binding = structuredClone(owner.binding);
      records.thread.content.turns = [];
      records.thread.content_hash = copilotHash(records.thread.content);
      binding.project_thread_ref.content_hash = records.thread.content_hash;
      expect(() =>
        assertConversationOwnerBinding(retained, binding, records),
      ).toThrow(/material turn/u);
    });
    it("preserves a controlled-writing native basis in canonical conversation owners without a scientific snapshot", async () => {
      const writing = fixture<PetraProjectDefinition>(
          "project-definition-controlled-writing",
        ),
        writingProject = {
          ...project,
          project_id: writing.project_id,
          name: "Synthetic controlled-writing conversation",
        };
      await scopes.registerProjectRevision(writingProject);
      await new PostgresProjectDefinitionAuthorityRepository(
        pool,
      ).registerDefinitionRevision(writing);
      const grant = fixture<PetraCapabilityGrantV1160>(
        "capability-grant-v1-16",
      );
      grant.capability_grant_id = derivePetraId(
        "capability_grant",
        "writing-conversation",
      );
      grant.project_id = writing.project_id;
      grant.content.allowed_commands = ["ManageProjectWork"];
      grant.content_hash = copilotHash(grant.content);
      await new PostgresCapabilityGrantAuthorityRepository(
        pool,
      ).registerCapabilityGrant(grant);
      const request = turn();
      request.project_id = writing.project_id;
      request.context.project_id = writing.project_id;
      request.thread_id = derivePetraId("thread", "writing-conversation");
      request.context.definition_family = writing.definition_family;
      request.context.basis.definition = {
        record_id: writing.project_definition_id,
        revision: writing.revision,
        content_hash: writing.content_hash,
      };
      const { content_hash: ignored, ...context } = request.context;
      void ignored;
      request.context.content_hash = copilotHash(context);
      await repository.begin(request);
      const retained = await repository.finish(request, {
        state: "failed",
        finished_at: new Date().toISOString(),
        error:
          "Synthetic writing lineage inspection; no model or examiner was invoked.",
      });
      const owned = (await repository.ownership!.read(
        request.project_id,
        request.actor_id,
        request.run_id,
      ))!;
      assertConversationOwnerBinding(retained, owned.binding, owned.records);
      const material = owned.records.thread.content.turns[0]!;
      expect(material.project_definition_ref.definition_family).toBe(
        "petra.controlled-writing",
      );
      expect("basis" in material.context).toBe(true);
      expect("snapshot_ref" in material.context).toBe(false);
    });
    it("requires canonical ownership and cannot silently fall back to a private parallel store", async () => {
      const unsafe = new PostgresCopilotTurnRepository(pool);
      await expect(unsafe.begin(turn())).rejects.toMatchObject({
        code: "CANONICAL_CONVERSATION_UNAVAILABLE",
      });
      expect(
        (
          await pool.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM petra.project_copilot_turns",
          )
        ).rows[0]!.count,
      ).toBe(0);
    });
  },
);
