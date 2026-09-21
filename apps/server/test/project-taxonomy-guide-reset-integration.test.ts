import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  ProjectProfileClient,
  ProjectShellClient,
  type ProjectProfileClientError,
} from "@petra/adapters";
import type {
  PetraActor,
  PetraProjectProfileCommandRequest,
  PetraRegisteredProjectProfile,
  RegisteredProjectTaxonomy,
} from "@petra/contracts";
import {
  PostgresProjectProfileRuntime,
  PostgresProjectShellViewReader,
  PostgresResearchScopeRepository,
} from "@petra/postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startPetraServer, type PetraServer } from "../src/server.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const evidenceOutput =
  process.env.PETRA_WAVE6_TAXONOMY_GUIDE_RESET_EVIDENCE_OUTPUT;
const describePostgres =
  connectionString === undefined || evidenceOutput === undefined
    ? describe.skip
    : describe;
const TOKEN = "wave6-taxonomy-guide-reset-token";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const profileRef = (profile: PetraRegisteredProjectProfile) => ({
  profile_id: profile.profile_id,
  profile_version: profile.profile_version,
  content_hash: profile.content_hash,
});

const commandRequest = (
  operation: "create" | "reset",
  profile: PetraRegisteredProjectProfile,
  commandId: string,
  expectedProject?: { project_id: string; revision: number },
): PetraProjectProfileCommandRequest => ({
  schema_name: "petra.project-profile-command-request",
  schema_version: "1.0.0",
  command_id: commandId,
  idempotency_key: `wave6:taxonomy-guide-reset:${commandId}`,
  operation,
  profile_ref: profileRef(profile),
  project: {
    name:
      operation === "create"
        ? "Wave 6 representative evidence Project"
        : "Wave 6 representative writing Project",
    description:
      operation === "create"
        ? "A resettable Project for the registered-taxonomy guide workflow."
        : "The additive replacement created by the supported reset command.",
  },
  objective: {
    statement:
      operation === "create"
        ? "Determine which exact sources distinguish the candidate explanations."
        : "Prepare a controlled draft whose claims remain traceable to reviewed requirements.",
  },
  ...(expectedProject === undefined
    ? {}
    : { expected_project: expectedProject }),
});

const taxonomySummary = (taxonomy: RegisteredProjectTaxonomy) => ({
  sections: {
    object_kinds: taxonomy.object_kinds.state,
    relationship_meanings: taxonomy.relationship_meanings.state,
    source_roles: taxonomy.source_roles.state,
    validators: taxonomy.validators.state,
    work_families: taxonomy.work_families.state,
    model_roles: taxonomy.model_roles.state,
    review_destinations: taxonomy.review_destinations.state,
  },
  terminology: taxonomy.terminology.map((term) => ({
    semantic_key: term.semantic_key,
    singular: term.singular,
    generic_family: term.generic_family,
  })),
  supported_places: taxonomy.supported_places,
  unavailable_operations: taxonomy.unavailable_operations,
});

describePostgres(
  "Wave 6 registered taxonomy, Project map, guide, and reset production owners",
  () => {
    const pool = new Pool({ connectionString });
    const scopes = new PostgresResearchScopeRepository(pool);
    const actor = readFixture<PetraActor>("actor");
    const scientific = readFixture<PetraRegisteredProjectProfile>(
      "registered-project-profile-scientific-v1-3",
    );
    const writing = readFixture<PetraRegisteredProjectProfile>(
      "registered-project-profile-controlled-writing",
    );
    let recordedAt = "2026-09-21T18:00:00.000Z";
    const runtime = () =>
      new PostgresProjectProfileRuntime(
        pool,
        { actor_id: actor.actor_id, actor_kind: "human" },
        undefined,
        { now: () => recordedAt },
      );
    const firstRuntime = runtime();
    const calls: Array<{
      phase: "before_restart" | "after_restart";
      method: string;
      path: string;
      status: number;
    }> = [];
    let phase: "before_restart" | "after_restart" = "before_restart";
    let server: PetraServer | undefined;

    const startServer = (profileRuntime: PostgresProjectProfileRuntime) =>
      startPetraServer({
        port: 0,
        authToken: TOKEN,
        projectProfileReads: profileRuntime,
        projectProfileCommands: profileRuntime,
        projectProfileRecovery: profileRuntime,
        projectShellViews: new PostgresProjectShellViewReader(pool),
      });

    const tracedFetch: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      calls.push({
        phase,
        method: init?.method ?? "GET",
        path: url.pathname,
        status: response.status,
      });
      return response;
    };

    const clients = () => {
      if (server === undefined) {
        throw new Error("The production HTTP server is unavailable.");
      }
      return {
        profiles: new ProjectProfileClient({
          baseUrl: server.url,
          token: TOKEN,
          fetch: tracedFetch,
        }),
        shell: new ProjectShellClient({
          baseUrl: server.url,
          token: TOKEN,
          fetch: tracedFetch,
        }),
      };
    };

    beforeAll(async () => {
      await pool.query("SELECT 1");
      await scopes.registerActor(actor);
      await firstRuntime.registerProfile(scientific);
      await firstRuntime.registerProfile(writing);
      server = await startServer(firstRuntime);
    });

    afterAll(async () => {
      await server?.shutdown();
      await pool.end();
    });

    it("executes every server prerequisite as one restart-safe workflow", async () => {
      if (server === undefined || evidenceOutput === undefined) {
        throw new Error(
          "The taxonomy, guide, and reset production boundary is unavailable.",
        );
      }

      let client = clients();
      const catalogue = await client.profiles.listProfiles();
      expect(catalogue.map(profileRef)).toEqual(
        expect.arrayContaining([profileRef(scientific), profileRef(writing)]),
      );

      const createRequest = commandRequest(
        "create",
        scientific,
        "command_01K6P000000000000000000601",
      );
      const createUnknown =
        await client.profiles.assessProjectRecovery(createRequest);
      expect(createUnknown.content.effect.state).toBe("outcome_unknown");
      const created = await client.profiles.createProject(createRequest);
      expect(await client.profiles.createProject(createRequest)).toStrictEqual(
        created,
      );

      const createdShell = await client.shell.open(
        created.project_ref.project_id,
      );
      const activeBeforeReset = await client.shell.search({
        status: "active",
        limit: 50,
      });
      expect(
        activeBeforeReset.content.projects.map((project) => project.project_id),
      ).toContain(created.project_ref.project_id);
      const scientificTaxonomy = await client.profiles.readProjectTaxonomy(
        created.project_ref.project_id,
        created.project_definition_ref.revision,
      );
      expect(scientificTaxonomy.project_revision).toBe(1);
      expect(scientificTaxonomy.project_definition_ref).toStrictEqual(
        created.project_definition_ref,
      );
      expect(scientificTaxonomy.resolution.state).toBe("registered");
      if (scientificTaxonomy.resolution.state !== "registered") {
        throw new Error("The scientific Project lost its registered profile.");
      }
      expect(scientificTaxonomy.resolution.profile_ref).toStrictEqual(
        profileRef(scientific),
      );
      expect(scientificTaxonomy.resolution.taxonomy).toStrictEqual(
        scientific.content.taxonomy,
      );

      recordedAt = "2026-09-21T18:05:00.000Z";
      const resetRequest = commandRequest(
        "reset",
        writing,
        "command_01K6P000000000000000000602",
        created.project_ref,
      );
      const resetUnknown =
        await client.profiles.assessProjectRecovery(resetRequest);
      expect(resetUnknown.content.effect.state).toBe("outcome_unknown");
      const reset = await client.profiles.resetProject(
        created.project_ref.project_id,
        resetRequest,
      );
      const resetReplay = await client.profiles.resetProject(
        created.project_ref.project_id,
        structuredClone(resetRequest),
      );
      expect(resetReplay).toStrictEqual(reset);
      expect(reset.prior_project_ref).toStrictEqual({
        project_id: created.project_ref.project_id,
        revision: 2,
        resulting_status: "archived",
      });
      expect(reset.destination).toStrictEqual({
        place_role: "brief",
        project_id: reset.project_ref.project_id,
      });
      const resetConfirmed =
        await client.profiles.assessProjectRecovery(resetRequest);
      expect(resetConfirmed.content.effect.state).toBe("effect_confirmed");
      expect(resetConfirmed.content.return).toEqual(
        expect.objectContaining({
          state: "exact",
          destination: reset.destination,
        }),
      );

      const writingTaxonomy = await client.profiles.readProjectTaxonomy(
        reset.project_ref.project_id,
        reset.project_definition_ref.revision,
      );
      expect(writingTaxonomy.resolution.state).toBe("registered");
      if (writingTaxonomy.resolution.state !== "registered") {
        throw new Error("The replacement Project lost its registered profile.");
      }
      expect(writingTaxonomy.resolution.profile_ref).toStrictEqual(
        profileRef(writing),
      );
      expect(writingTaxonomy.resolution.taxonomy).toStrictEqual(
        writing.content.taxonomy,
      );
      const scientificFinding =
        scientificTaxonomy.resolution.taxonomy.terminology.find(
          (term) => term.generic_family === "finding",
        );
      const writingFinding =
        writingTaxonomy.resolution.taxonomy.terminology.find(
          (term) => term.generic_family === "finding",
        );
      expect(scientificFinding?.singular).not.toBe(writingFinding?.singular);

      const activeAfterReset = await client.shell.search({
        status: "active",
        limit: 50,
      });
      const archivedAfterReset = await client.shell.search({
        status: "archived",
        limit: 50,
      });
      expect(
        activeAfterReset.content.projects.map((project) => project.project_id),
      ).toContain(reset.project_ref.project_id);
      expect(
        archivedAfterReset.content.projects.map(
          (project) => project.project_id,
        ),
      ).toContain(created.project_ref.project_id);
      expect(
        activeAfterReset.content.projects.map((project) => project.project_id),
      ).not.toContain(created.project_ref.project_id);

      const unknownProfileRequest = commandRequest(
        "create",
        scientific,
        "command_01K6P000000000000000000603",
      );
      unknownProfileRequest.profile_ref.profile_id =
        "project_template_01K6P000000000000000000099";
      await expect(
        client.profiles.createProject(unknownProfileRequest),
      ).rejects.toEqual(
        expect.objectContaining<Partial<ProjectProfileClientError>>({
          status: 422,
          code: "PROJECT_PROFILE_NOT_REGISTERED",
        }),
      );

      const beforeRestartUrl = server.url;
      const unauthorized = await Promise.all([
        fetch(`${beforeRestartUrl}/api/queries/project-profiles`),
        fetch(
          `${beforeRestartUrl}/api/queries/projects/${reset.project_ref.project_id}/taxonomy`,
        ),
        fetch(
          `${beforeRestartUrl}/api/commands/projects/${created.project_ref.project_id}/reset`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(resetRequest),
          },
        ),
      ]);
      expect(unauthorized.map((response) => response.status)).toStrictEqual([
        401, 401, 401,
      ]);

      await server.shutdown();
      recordedAt = "2026-09-21T18:10:00.000Z";
      phase = "after_restart";
      server = await startServer(runtime());
      client = clients();

      const catalogueAfterRestart = await client.profiles.listProfiles();
      const replacementAfterRestart = await client.shell.open(
        reset.project_ref.project_id,
      );
      const taxonomyAfterRestart = await client.profiles.readProjectTaxonomy(
        reset.project_ref.project_id,
        reset.project_definition_ref.revision,
      );
      const replayAfterRestart = await client.profiles.resetProject(
        created.project_ref.project_id,
        structuredClone(resetRequest),
      );
      const recoveryAfterRestart =
        await client.profiles.assessProjectRecovery(resetRequest);
      expect(catalogueAfterRestart.map(profileRef)).toEqual(
        expect.arrayContaining([profileRef(scientific), profileRef(writing)]),
      );
      expect(replacementAfterRestart.content.project.project_id).toBe(
        reset.project_ref.project_id,
      );
      expect(taxonomyAfterRestart).toMatchObject({
        project_id: reset.project_ref.project_id,
        project_revision: 1,
        project_definition_ref: reset.project_definition_ref,
        resolution: {
          state: "registered",
          profile_ref: profileRef(writing),
        },
      });
      expect(replayAfterRestart).toStrictEqual(reset);
      expect(recoveryAfterRestart.content.effect.state).toBe(
        "effect_confirmed",
      );

      const stored = await pool.query<{
        project_count: string;
        receipt_count: string;
        profile_count: string;
        archived_revision: string;
      }>(
        `SELECT
           (SELECT count(*)::text FROM petra.projects) AS project_count,
           (SELECT count(*)::text FROM petra.project_profile_command_receipts) AS receipt_count,
           (SELECT count(*)::text FROM petra.registered_project_profiles) AS profile_count,
           (SELECT current_revision::text FROM petra.projects WHERE project_id = $1) AS archived_revision`,
        [created.project_ref.project_id],
      );
      expect(stored.rows[0]).toStrictEqual({
        project_count: "2",
        receipt_count: "2",
        profile_count: "2",
        archived_revision: "2",
      });

      const artifact = {
        schema_name: "petra.wave6-taxonomy-guide-reset-authority-evidence",
        schema_version: "1.0.0",
        status: "passed",
        operation_ids: [
          "shell.project-map",
          "taxonomy.inspect-profile",
          "taxonomy.bind-project",
          "application.guide",
          "application.reset",
        ],
        executed_at: new Date().toISOString(),
        command: "npm run test:wave6:taxonomy-guide-reset",
        database:
          "fresh disposable PostgreSQL 18.6 with current Flyway migrations",
        runtime_owners: [
          "GET /api/queries/projects -> PostgresProjectShellViewReader",
          "GET /api/queries/project-profiles and GET /api/queries/projects/:projectId/taxonomy -> PostgresProjectProfileRuntime",
          "POST /api/commands/projects and POST /api/commands/projects/:projectId/reset -> PostgresProjectProfileRuntime",
          "POST /api/queries/project-profile-command-recovery -> PostgresProjectProfileRuntime",
        ],
        production_boundary: {
          server:
            "startPetraServer over ephemeral TCP ports before and after restart",
          clients: "ProjectProfileClient and ProjectShellClient",
          authentication: "Bearer middleware at /api/*",
          persistence:
            "Registered profile versions, Project-owned definitions/objectives, additive archive/replacement, and immutable idempotent receipts in PostgreSQL",
        },
        observations: {
          guide_prerequisites: {
            registered_profile_refs: catalogueAfterRestart.map(profileRef),
            active_project_id: reset.project_ref.project_id,
            active_project_name: replacementAfterRestart.content.project.name,
            stable_destination: reset.destination,
          },
          project_map: {
            project_id: createdShell.project_id,
            shell_definition: createdShell.content.definition,
            taxonomy_definition_ref: scientificTaxonomy.project_definition_ref,
            exact_binding: true,
          },
          paired_taxonomy: {
            scientific: {
              profile_ref: scientificTaxonomy.resolution.profile_ref,
              label: scientificTaxonomy.resolution.label,
              finding_term: scientificFinding?.singular,
              taxonomy: taxonomySummary(scientificTaxonomy.resolution.taxonomy),
            },
            controlled_writing: {
              profile_ref: writingTaxonomy.resolution.profile_ref,
              label: writingTaxonomy.resolution.label,
              finding_term: writingFinding?.singular,
              taxonomy: taxonomySummary(writingTaxonomy.resolution.taxonomy),
            },
          },
          reset: {
            request: {
              command_id: resetRequest.command_id,
              idempotency_key: resetRequest.idempotency_key,
              expected_project: resetRequest.expected_project,
              selected_profile_ref: resetRequest.profile_ref,
            },
            prior_project_ref: reset.prior_project_ref,
            resulting_project_ref: reset.project_ref,
            resulting_definition_ref: reset.project_definition_ref,
            destination: reset.destination,
            before_effect: resetUnknown.content.effect.state,
            after_effect: recoveryAfterRestart.content.effect.state,
            replay_equal_before_restart:
              resetReplay.receipt_id === reset.receipt_id,
            replay_equal_after_restart:
              replayAfterRestart.receipt_id === reset.receipt_id,
            project_count: Number(stored.rows[0]?.project_count ?? "0"),
            receipt_count: Number(stored.rows[0]?.receipt_count ?? "0"),
          },
          unsupported_selection: {
            result_code: "PROJECT_PROFILE_NOT_REGISTERED",
            fallback_profile_used: false,
          },
          unauthorized_statuses: unauthorized.map(
            (response) => response.status,
          ),
          calls,
        },
        boundary:
          "Fresh PostgreSQL, production HTTP routes, bearer authentication, and renderer-neutral typed clients execute the server-owned prerequisites for the registered-taxonomy, Project-map, guide, and reset workflow: paired profile catalogue reads, exact shell/taxonomy binding, explicit profile creation, additive replacement, unknown-effect and confirmed recovery, unauthorized denial, unsupported-profile rejection without fallback, idempotent replay, and restart retention. This trace does not open the React guide or profile surfaces, invoke browser navigation, or claim USER-TESTABLE-01/stable-url-clean-start-reset or UX1.6-TAXONOMY/usable-profile-ui.",
      };
      mkdirSync(dirname(evidenceOutput), { recursive: true });
      writeFileSync(evidenceOutput, `${JSON.stringify(artifact, null, 2)}\n`);
    });
  },
);
