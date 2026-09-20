import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { ProjectProfileClient, ProjectShellClient } from "@petra/adapters";
import type {
  PetraActor,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectProfileCommandRequest,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import {
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectProfileRuntime,
  PostgresProjectShellViewReader,
  PostgresResearchScopeRepository,
} from "@petra/postgres";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startPetraServer, type PetraServer } from "../src/server.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const evidenceOutput = process.env.PETRA_WAVE6_PROJECT_CREATE_EVIDENCE_OUTPUT;
const describePostgres =
  connectionString === undefined || evidenceOutput === undefined
    ? describe.skip
    : describe;
const TOKEN = "wave6-project-create-token";

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

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

describePostgres("Wave 6 Project creation production command", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const actor = readFixture<PetraActor>("actor");
  const unrelatedProject = readFixture<PetraProject>("project");
  const unrelatedDefinition = readFixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  const unrelatedObjective =
    readFixture<PetraProjectObjective>("project-objective");
  const profile = readFixture<PetraRegisteredProjectProfile>(
    "registered-project-profile-scientific-v1-3",
  );
  const request: PetraProjectProfileCommandRequest = {
    schema_name: "petra.project-profile-command-request",
    schema_version: "1.0.0",
    command_id: "command_01K6P000000000000000000501",
    idempotency_key: "wave6:project-create:production-trace",
    operation: "create",
    profile_ref: {
      profile_id: profile.profile_id,
      profile_version: profile.profile_version,
      content_hash: profile.content_hash,
    },
    project: {
      name: "Wave 6 registered-profile Project",
      description:
        "A production Project creation trace with exact profile authority.",
    },
    objective: {
      statement:
        "Determine which retained evidence most strongly separates the candidate explanations.",
    },
  };
  const runtime = new PostgresProjectProfileRuntime(
    pool,
    { actor_id: actor.actor_id, actor_kind: "human" },
    undefined,
    { now: () => "2026-09-20T23:30:00.000Z" },
  );
  const calls: Array<{ method: string; path: string; status: number }> = [];
  let server: PetraServer | undefined;

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await scopes.registerActor(actor);
    await scopes.registerProjectRevision(unrelatedProject);
    await definitions.registerDefinitionRevision(unrelatedDefinition);
    await definitions.registerObjectiveRevision(unrelatedObjective);
    await definitions.setCurrentObjectiveFocus({
      project_id: unrelatedProject.project_id,
      objective_ref: {
        objective_id: unrelatedObjective.objective_id,
        revision: unrelatedObjective.revision,
        content_hash: unrelatedObjective.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-20T23:00:00.000Z",
    });
    await runtime.registerProfile(profile);
    server = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      projectProfileReads: runtime,
      projectProfileCommands: runtime,
      projectProfileRecovery: runtime,
      projectShellViews: new PostgresProjectShellViewReader(pool),
    });
  });

  afterAll(async () => {
    await server?.shutdown();
    await pool.end();
  });

  it("creates one exactly bound Project and safely reconciles replay", async () => {
    if (server === undefined || evidenceOutput === undefined) {
      throw new Error(
        "The Project creation production boundary is unavailable.",
      );
    }
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
        method: init?.method ?? "GET",
        path: url.pathname,
        status: response.status,
      });
      return response;
    };
    const profileClient = new ProjectProfileClient({
      baseUrl: server.url,
      token: TOKEN,
      fetch: tracedFetch,
    });
    const shellClient = new ProjectShellClient({
      baseUrl: server.url,
      token: TOKEN,
      fetch: tracedFetch,
    });
    const unrelatedBefore = {
      project: await scopes.getProject(unrelatedProject.project_id),
      definition: await definitions.getDefinition(
        unrelatedDefinition.project_definition_id,
      ),
      objective: await definitions.getObjective(
        unrelatedObjective.objective_id,
      ),
    };

    const profiles = await profileClient.listProfiles();
    expect(profiles).toContainEqual(profile);
    const unresolved = await profileClient.assessProjectRecovery(request);
    expect(unresolved.content.effect.state).toBe("outcome_unknown");
    expect(unresolved.content.eligible_actions).toHaveLength(1);
    const unresolvedAction = unresolved.content.eligible_actions[0];
    expect(unresolvedAction?.operation).toBe("retry_exact_command");
    expect(unresolvedAction?.owner).toBe("project_profile_command");
    expect(unresolvedAction?.method).toBe("POST");
    expect(unresolvedAction?.path).toBe("/api/commands/projects");
    expect(unresolvedAction?.input_behavior).toBe("reuse_exact_request");
    expect(unresolvedAction?.identity_behavior).toBe(
      "reuse_command_and_idempotency",
    );
    expect(unresolvedAction?.success_destination.place_role).toBe("brief");
    expect(unresolvedAction?.success_destination.project_id).toMatch(
      /^project_/u,
    );
    expect(unresolved.content.return).toEqual(
      expect.objectContaining({
        state: "safe_fallback",
        destination: { place_role: "projects" },
      }),
    );

    const receipt = await profileClient.createProject(request);
    const replay = await profileClient.createProject(structuredClone(request));
    expect(replay).toStrictEqual(receipt);
    expect(receipt.destination).toStrictEqual({
      place_role: "brief",
      project_id: receipt.project_ref.project_id,
    });
    const confirmed = await profileClient.assessProjectRecovery(request);
    expect(confirmed.content.effect).toStrictEqual({
      state: "effect_confirmed",
      meaning:
        "The exact Project-profile command receipt is retained. Repeating the same request returns this receipt without another effect.",
      receipt,
    });
    expect(confirmed.content.eligible_actions[0]).toEqual(
      expect.objectContaining({
        operation: "open_resulting_project",
        path: `/projects/${receipt.project_ref.project_id}`,
        identity_behavior: "no_command",
        success_destination: receipt.destination,
      }),
    );
    expect(confirmed.content.return).toEqual(
      expect.objectContaining({
        state: "exact",
        destination: receipt.destination,
      }),
    );

    const createdProject = await scopes.getProject(
      receipt.project_ref.project_id,
      receipt.project_ref.revision,
    );
    const createdDefinition = await definitions.getDefinition(
      receipt.project_definition_ref.project_definition_id,
      receipt.project_definition_ref.revision,
    );
    const createdObjective = await definitions.getObjective(
      receipt.objective_ref.objective_id,
      receipt.objective_ref.revision,
    );
    expect(createdProject).toEqual(
      expect.objectContaining({
        project_id: receipt.project_ref.project_id,
        revision: 1,
        name: request.project.name,
        description: request.project.description,
        status: "active",
        enabled_evidence_namespaces:
          profile.content.enabled_evidence_namespaces,
        created_by: receipt.actor,
      }),
    );
    expect(createdDefinition).toEqual(
      expect.objectContaining({
        project_definition_id:
          receipt.project_definition_ref.project_definition_id,
        project_id: receipt.project_ref.project_id,
        revision: 1,
        definition_family: profile.definition_family,
        origin: {
          origin_kind: "template_seed",
          template_id: profile.profile_id,
          template_version: profile.profile_version,
          template_hash: profile.content_hash,
        },
        content: profile.content.definition,
        content_hash: receipt.project_definition_ref.content_hash,
      }),
    );
    expect(createdObjective).toEqual(
      expect.objectContaining({
        objective_id: receipt.objective_ref.objective_id,
        project_id: receipt.project_ref.project_id,
        revision: 1,
        project_definition_ref: receipt.project_definition_ref,
        content: {
          objective_kind: profile.content.objective_kind,
          statement: request.objective.statement,
          status: "active",
          dependency_refs: [],
        },
        content_hash: receipt.objective_ref.content_hash,
      }),
    );

    const opened = await shellClient.open(receipt.project_ref.project_id);
    if (opened.schema_version !== "1.2.0") {
      throw new Error(
        "Project creation requires the production retained-task shell view.",
      );
    }
    expect(opened.content.project).toStrictEqual({
      project_id: createdProject?.project_id,
      revision: createdProject?.revision,
      name: createdProject?.name,
      description: createdProject?.description,
      status: createdProject?.status,
      updated_at: createdProject?.updated_at,
    });
    expect(opened.content.definition).toStrictEqual({
      project_definition_id: createdDefinition?.project_definition_id,
      revision: createdDefinition?.revision,
      content_hash: createdDefinition?.content_hash,
      definition_family: createdDefinition?.definition_family,
      label: createdDefinition?.content.label,
      description: createdDefinition?.content.description,
      kernel_compatibility: createdDefinition?.content.kernel_compatibility,
      terms: createdDefinition?.content.terms,
      supported_places: createdDefinition?.content.supported_places,
    });
    expect(opened.content.current_objective).toStrictEqual({
      objective_id: createdObjective?.objective_id,
      revision: createdObjective?.revision,
      content_hash: createdObjective?.content_hash,
      objective_kind: createdObjective?.content.objective_kind,
      statement: createdObjective?.content.statement,
      status: createdObjective?.content.status,
    });
    expect(opened.content.resume.state).toBe("not_found");
    expect(opened.content.resume.recovery.action).toBe("open_brief");
    expect(opened.content.resume.recovery.destination.role).toBe("brief");
    const briefDestination = `/projects/${receipt.destination.project_id}/brief`;

    const stored = await pool.query<{
      record_hash: string;
      request_hash: string;
      payload: unknown;
      project_count: string;
      receipt_count: string;
      focus_objective_id: string;
    }>(
      `SELECT receipt.record_hash,
              receipt.request_hash,
              receipt.payload,
              (SELECT count(*) FROM petra.projects)::text AS project_count,
              (SELECT count(*) FROM petra.project_profile_command_receipts
                WHERE command_id = $1)::text AS receipt_count,
              focus.objective_id AS focus_objective_id
         FROM petra.project_profile_command_receipts AS receipt
         JOIN petra.project_objective_focus AS focus
           ON focus.project_id = receipt.resulting_project_id
        WHERE receipt.command_id = $1`,
      [request.command_id],
    );
    expect(stored.rows[0]).toEqual(
      expect.objectContaining({
        record_hash: hash(receipt),
        request_hash: hash(request),
        payload: receipt,
        project_count: "2",
        receipt_count: "1",
        focus_objective_id: receipt.objective_ref.objective_id,
      }),
    );

    const unrelatedAfter = {
      project: await scopes.getProject(unrelatedProject.project_id),
      definition: await definitions.getDefinition(
        unrelatedDefinition.project_definition_id,
      ),
      objective: await definitions.getObjective(
        unrelatedObjective.objective_id,
      ),
    };
    expect(unrelatedAfter).toStrictEqual(unrelatedBefore);

    const unauthorized = await fetch(`${server.url}/api/commands/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    expect(unauthorized.status).toBe(401);

    const artifact = {
      schema_name: "petra.wave6-project-create-authority-evidence",
      schema_version: "1.0.0",
      status: "passed",
      operation_ids: ["project.create", "project.recover"],
      executed_at: new Date().toISOString(),
      command: "npm run test:wave6:project-create",
      database: "fresh disposable PostgreSQL 18.6 with Flyway V001-V058",
      runtime_owner:
        "POST /api/commands/projects and POST /api/queries/project-profile-command-recovery -> PostgresProjectProfileRuntime",
      production_boundary: {
        server: "startPetraServer over an ephemeral TCP port",
        clients:
          "ProjectProfileClient list/create/recovery and ProjectShellClient open",
        authentication: "Bearer middleware at /api/*",
        persistence:
          "Atomic Project, ProjectDefinition, Objective/focus, and immutable command receipt authority in PostgreSQL",
      },
      observations: {
        selected_profile_ref: request.profile_ref,
        unresolved_effect: {
          state: unresolved.content.effect.state,
          safe_return: unresolved.content.return,
          eligible_action: unresolved.content.eligible_actions[0],
        },
        receipt: {
          receipt_id: receipt.receipt_id,
          command_id: receipt.command_id,
          idempotency_key: receipt.idempotency_key,
          record_hash: stored.rows[0]?.record_hash,
          request_hash: stored.rows[0]?.request_hash,
          project_ref: receipt.project_ref,
          project_definition_ref: receipt.project_definition_ref,
          objective_ref: receipt.objective_ref,
          destination: receipt.destination,
        },
        exact_binding: {
          project_name: createdProject?.name,
          definition_family: createdDefinition?.definition_family,
          definition_origin: createdDefinition?.origin,
          objective_kind: createdObjective?.content.objective_kind,
          objective_statement: createdObjective?.content.statement,
          current_focus_objective_id: stored.rows[0]?.focus_objective_id,
          brief_destination: briefDestination,
        },
        replay: {
          receipt_equal: replay.receipt_id === receipt.receipt_id,
          resulting_project_count: 1,
          retained_receipt_count: Number(stored.rows[0]?.receipt_count ?? "0"),
          confirmed_effect: confirmed.content.effect.state,
        },
        unrelated_project: {
          project_id: unrelatedProject.project_id,
          preserved_exactly: true,
          total_project_count: Number(stored.rows[0]?.project_count ?? "0"),
        },
        unauthorized_status: unauthorized.status,
        calls,
      },
      boundary:
        "Real disposable PostgreSQL, the production HTTP server, bearer authentication, and renderer-neutral typed clients prove exact registered-profile Project creation, Project/definition/objective/focus binding, canonical receipt persistence, Brief destination, idempotent replay, unknown-effect assessment, confirmed recovery, and preservation of an unrelated Project. This backend trace does not invoke the visible New Project or Recover Project controls and does not claim a named Wave 6 evidence-plan scenario.",
    };
    mkdirSync(dirname(evidenceOutput), { recursive: true });
    writeFileSync(evidenceOutput, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
