import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  ProjectShellClient,
  type ProjectShellClientError,
} from "@petra/adapters";
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
const evidenceOutput = process.env.PETRA_WAVE6_PROJECT_OPEN_EVIDENCE_OUTPUT;
const describePostgres =
  connectionString === undefined || evidenceOutput === undefined
    ? describe.skip
    : describe;
const TOKEN = "wave6-project-open-token";

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

describePostgres("Wave 6 Project open production read", () => {
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

  it("resolves the representative Project from collection to exact shell", async () => {
    if (server === undefined || evidenceOutput === undefined) {
      throw new Error("The Project open production boundary is unavailable.");
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

    const collection = await client.search({ status: "active", limit: 50 });
    const listed = collection.content.projects.find(
      (candidate) => candidate.project_id === project.project_id,
    );
    if (listed === undefined) {
      throw new Error(
        "The representative Project was absent from the collection.",
      );
    }
    const opened = await client.open(listed.project_id);
    expect(opened.project_id).toBe(project.project_id);
    expect(opened.content.project).toEqual(listed.content.project);
    expect(opened.content.definition).toEqual(listed.content.definition);
    expect(opened.content.current_objective).toEqual(
      listed.content.current_objective,
    );
    expect(opened.content.authority.isolation).toBe("repeatable_read");

    const unauthorized = await fetch(
      `${server.url}/api/queries/projects/${project.project_id}/shell`,
    );
    expect(unauthorized.status).toBe(401);
    const missingProjectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    await expect(client.open(missingProjectId)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectShellClientError>>({
        code: "PROJECT_NOT_FOUND",
        status: 404,
      }),
    );

    const destination = `/projects/${opened.project_id}/brief`;
    const artifact = {
      schema_name: "petra.wave6-project-open-authority-evidence",
      schema_version: "1.0.0",
      status: "passed",
      operation_id: "project.open",
      executed_at: new Date().toISOString(),
      command: "npm run test:wave6:project-open",
      database: "fresh disposable PostgreSQL 18.6 with Flyway V001-V058",
      runtime_owner:
        "GET /api/queries/projects -> ProjectShellViewReader.searchProjectShellViews -> PostgresProjectShellViewReader; GET /api/queries/projects/:projectId/shell -> ProjectShellViewReader.getProjectShellView -> PostgresProjectShellViewReader",
      production_boundary: {
        server: "startPetraServer over an ephemeral TCP port",
        client: "ProjectShellClient.search and ProjectShellClient.open",
        authentication: "Bearer middleware at /api/*",
        persistence:
          "Current Project, ProjectDefinition, and Objective authority in PostgreSQL REPEATABLE READ READ ONLY transactions",
      },
      observations: {
        collection_project_id: listed.project_id,
        opened_project_id: opened.project_id,
        project_revision: opened.content.project.revision,
        definition_ref: {
          project_definition_id:
            opened.content.definition.project_definition_id,
          revision: opened.content.definition.revision,
          content_hash: opened.content.definition.content_hash,
        },
        objective_ref:
          opened.content.current_objective === undefined
            ? null
            : {
                objective_id: opened.content.current_objective.objective_id,
                revision: opened.content.current_objective.revision,
                content_hash: opened.content.current_objective.content_hash,
              },
        destination,
        unauthorized_status: unauthorized.status,
        missing_project_status: 404,
        substituted_project: false,
        calls,
      },
      boundary:
        "Real disposable PostgreSQL, the production HTTP server, bearer authentication, and the renderer-neutral typed client prove that the representative collection member resolves to the exact Project shell required by the Open Brief destination. This backend trace does not invoke the visible Open Brief control and therefore makes no browser-navigation claim.",
    };
    mkdirSync(dirname(evidenceOutput), { recursive: true });
    writeFileSync(evidenceOutput, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
