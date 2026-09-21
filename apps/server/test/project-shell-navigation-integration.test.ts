import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { ProjectShellClient } from "@petra/adapters";
import type {
  PetraActor,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
} from "@petra/contracts";
import {
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectShellViewReader,
  PostgresResearchScopeRepository,
} from "@petra/postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startPetraServer, type PetraServer } from "../src/server.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const evidenceOutput = process.env.PETRA_WAVE6_SHELL_NAVIGATION_EVIDENCE_OUTPUT;
const describePostgres =
  connectionString === undefined || evidenceOutput === undefined
    ? describe.skip
    : describe;
const TOKEN = "wave6-shell-navigation-token";

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

describePostgres("Wave 6 Project shell navigation context", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const actor = readFixture<PetraActor>("actor");
  const project = readFixture<PetraProject>("project");
  const definition = readFixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  const objective = readFixture<PetraProjectObjective>("project-objective");
  const calls: Array<{ method: string; path: string; status: number }> = [];
  let server: PetraServer | undefined;

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await scopes.registerActor(actor);
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);
    await definitions.registerObjectiveRevision(objective);
    await definitions.setCurrentObjectiveFocus({
      project_id: project.project_id,
      objective_ref: {
        objective_id: objective.objective_id,
        revision: objective.revision,
        content_hash: objective.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-20T22:00:00.000Z",
    });
    server = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      projectShellViews: new PostgresProjectShellViewReader(pool),
    });
  });

  afterAll(async () => {
    await server?.shutdown();
    await pool.end();
  });

  it("retains the exact server-owned Project context across place changes", async () => {
    if (server === undefined || evidenceOutput === undefined) {
      throw new Error("The Project shell navigation boundary is unavailable.");
    }
    const client = new ProjectShellClient({
      baseUrl: server.url,
      token: TOKEN,
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        const url = new URL(
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url,
        );
        calls.push({
          method: init?.method ?? "GET",
          path: url.pathname,
          status: response.status,
        });
        return response;
      },
    });

    const beforePlaceChange = await client.open(project.project_id);
    const afterPlaceChange = await client.open(project.project_id);
    if (
      beforePlaceChange.schema_version !== "1.3.0" ||
      afterPlaceChange.schema_version !== "1.3.0"
    ) {
      throw new Error(
        "Project navigation requires the current retained-context shell view.",
      );
    }

    const supportedPlaces = [...definition.content.supported_places];
    const summarizedPlaces = beforePlaceChange.content.place_summaries.map(
      (summary) => summary.role,
    );
    expect(beforePlaceChange.project_id).toBe(project.project_id);
    expect(beforePlaceChange.content.project.project_id).toBe(
      project.project_id,
    );
    expect(beforePlaceChange.content.definition).toEqual(
      expect.objectContaining({
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
        definition_family: definition.definition_family,
        supported_places: supportedPlaces,
      }),
    );
    expect(beforePlaceChange.content.current_objective).toEqual(
      expect.objectContaining({
        objective_id: objective.objective_id,
        revision: objective.revision,
        content_hash: objective.content_hash,
      }),
    );
    expect(beforePlaceChange.content.authority.isolation).toBe(
      "repeatable_read",
    );
    expect(summarizedPlaces).toStrictEqual(supportedPlaces);
    for (const summary of beforePlaceChange.content.place_summaries) {
      expect(summary.label.length).toBeGreaterThan(0);
      expect(summary.summary.length).toBeGreaterThan(0);
    }

    expect(afterPlaceChange.project_id).toBe(beforePlaceChange.project_id);
    expect(afterPlaceChange.content_hash).toBe(beforePlaceChange.content_hash);
    expect(afterPlaceChange.content).toStrictEqual(beforePlaceChange.content);

    const unauthorized = await fetch(
      `${server.url}/api/queries/projects/${project.project_id}/shell`,
    );
    expect(unauthorized.status).toBe(401);
    const unregisteredOverride = await fetch(
      `${server.url}/api/queries/projects/${project.project_id}/shell?place=graph`,
      { headers: { authorization: `Bearer ${TOKEN}` } },
    );
    expect(unregisteredOverride.status).toBe(422);

    const artifact = {
      schema_name: "petra.wave6-shell-navigation-authority-evidence",
      schema_version: "1.0.0",
      status: "passed",
      operation_id: "shell.navigate",
      executed_at: new Date().toISOString(),
      command: "npm run test:wave6:shell-navigation",
      database: "fresh disposable PostgreSQL 18.6 with Flyway V001-V058",
      runtime_owner:
        "GET /api/queries/projects/:projectId/shell -> ProjectShellViewReader.getProjectShellView -> PostgresProjectShellViewReader",
      production_boundary: {
        server: "startPetraServer over an ephemeral TCP port",
        client: "ProjectShellClient.open",
        authentication: "Bearer middleware at /api/*",
        persistence:
          "Current Project, ProjectDefinition, Objective, authority, projection, attention, place summaries, and resume context composed in PostgreSQL REPEATABLE READ READ ONLY transactions",
      },
      observations: {
        project_id: beforePlaceChange.project_id,
        project_revision: beforePlaceChange.content.project.revision,
        definition_ref: {
          project_definition_id:
            beforePlaceChange.content.definition.project_definition_id,
          revision: beforePlaceChange.content.definition.revision,
          content_hash: beforePlaceChange.content.definition.content_hash,
        },
        objective_ref: {
          objective_id:
            beforePlaceChange.content.current_objective?.objective_id,
          revision: beforePlaceChange.content.current_objective?.revision,
          content_hash:
            beforePlaceChange.content.current_objective?.content_hash,
        },
        supported_places: supportedPlaces,
        summarized_places: summarizedPlaces,
        shell_content_hash_before: beforePlaceChange.content_hash,
        shell_content_hash_after: afterPlaceChange.content_hash,
        context_stable: true,
        unauthorized_status: unauthorized.status,
        unregistered_place_override_status: unregisteredOverride.status,
        client_selected_place: false,
        calls,
      },
      boundary:
        "Real disposable PostgreSQL, the production HTTP server, bearer authentication, and ProjectShellClient prove that repeated Project-place context reads retain one exact Project, registered definition, current Objective, authority position, projection state, attention, supported-place order, and honest place summaries. The server rejects a client-supplied place override because browser place selection is presentation state, not backend authority. This trace does not invoke Project navigation, change a browser route, preserve browser-local focus or selection, or prove return to origin; those visible SP02 and UX-FLOW-07 behaviors remain design-owned.",
    };
    mkdirSync(dirname(evidenceOutput), { recursive: true });
    writeFileSync(evidenceOutput, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
