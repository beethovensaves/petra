import { readFileSync } from "node:fs";
import pg from "pg";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import {
  COPILOT_PROFILE,
  copilotModelPayload,
  copilotHash,
  type CopilotTurn,
  type CopilotTerminal,
} from "@petra/core";
import type {
  PetraActor,
  PetraProject,
  PetraProjectSemanticGraphView,
  PetraCopilotInputManifest,
} from "@petra/contracts";
import { PostgresCopilotTurnRepository } from "../src/project-copilot-repository.js";
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
    const repository = new PostgresCopilotTurnRepository(pool);
    const scopes = new PostgresResearchScopeRepository(pool);
    beforeAll(async () => {
      await scopes.registerActor(actor);
      await scopes.registerProjectRevision(project);
    });
    beforeEach(async () => {
      await pool.query(
        "TRUNCATE petra.project_copilot_terminals, petra.project_copilot_turns CASCADE",
      );
    });
    afterAll(async () => {
      await pool.end();
    });
    const turn = (): CopilotTurn => ({
      ...structuredClone(input),
      actor_id: actor.actor_id,
      project_id: project.project_id,
      started_at: new Date().toISOString(),
    });

    it("claims a concurrent identity exactly once and restores readable terminal text after repository restart", async () => {
      const request = turn();
      const results = await Promise.all([
        repository.begin(request),
        repository.begin(request),
      ]);
      expect(results.filter((result) => result.claimed)).toHaveLength(1);
      await repository.finish(request, completed);
      const restarted = new PostgresCopilotTurnRepository(pool);
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
      const restarted = new PostgresCopilotTurnRepository(pool);
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
      const restarted = new PostgresCopilotTurnRepository(pool);
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
  },
);
