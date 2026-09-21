import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { ProjectBriefClient, ProjectShellClient } from "@petra/adapters";
import type {
  PetraActor,
  PetraCapabilityGrantV190,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectInquiryLink,
  PetraProjectInquiryRole,
  PetraProjectObjective,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresProjectBriefViewReader,
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectInquiryAuthorityRepository,
  PostgresProjectShellViewReader,
  PostgresResearchScopeRepository,
  PostgresWorkUnitAuthorityRepository,
  projectInquiryRoleRef,
} from "@petra/postgres";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { format as formatText } from "prettier";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { startPetraServer, type PetraServer } from "../src/server.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const evidenceOutput = process.env.PETRA_WAVE6_SHELL_BRIEF_EVIDENCE_OUTPUT;
const describePostgres =
  connectionString === undefined || evidenceOutput === undefined
    ? describe.skip
    : describe;
const TOKEN = "wave6-shell-brief-token";

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

const contracts = new PetraContractRegistry();
const contractHash = (name: string, version = "1.0.0"): string => {
  const entry = contracts.entries.find(
    (candidate) => candidate.name === name && candidate.version === version,
  );
  if (entry === undefined) {
    throw new Error(`Missing registered contract ${name}@${version}.`);
  }
  return entry.canonical_sha256;
};

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service",
  display_name: "Petra worker control plane",
  created_at: "2026-09-20T23:50:00.000Z",
});

describePostgres("Wave 6 Project shell and Brief authority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool, contracts);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(
    pool,
    contracts,
  );
  const inquiries = new PostgresProjectInquiryAuthorityRepository(
    pool,
    contracts,
  );
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool, contracts);
  const grants = new PostgresCapabilityGrantAuthorityRepository(
    pool,
    contracts,
  );
  const actor = readFixture<PetraActor>("actor");
  const project = readFixture<PetraProject>("project");
  const definition = readFixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  const objective = readFixture<PetraProjectObjective>("project-objective");
  let registeredWork!: PetraWorkUnit;
  let server: PetraServer | undefined;

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await scopes.registerActor(actor);
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(project);

    const objectiveRegistration = definition.content.registrations.find(
      (registration) =>
        registration.registration_kind === "objective_schema" &&
        registration.semantic_key === "scientific.research-question",
    );
    if (objectiveRegistration === undefined) {
      throw new Error("The scientific Objective registration is unavailable.");
    }
    objectiveRegistration.contract = {
      name: "petra.project-objective",
      version: "1.0.0",
      content_hash: contractHash("project-objective"),
    };
    definition.content.registrations.push({
      registration_kind: "extension",
      semantic_key: "scientific.research-brief",
      contract: {
        name: "petra.research-brief-payload",
        version: "1.1.0",
        content_hash: contractHash("research-brief-payload", "1.1.0"),
      },
    });
    definition.content_hash = hash(definition.content);
    objective.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
    };
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
      changed_at: "2026-09-20T23:51:00.000Z",
    });

    const grantContent: PetraCapabilityGrantV190["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["SaveProjectInquiry"],
      valid_from: "2026-09-20T00:00:00.000Z",
      reason:
        "Bind the representative Project Work registration to retained server authority.",
    };
    const grant: PetraCapabilityGrantV190 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.9.0",
      capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
      revision: 1,
      project_id: project.project_id,
      grantee: { actor_id: actor.actor_id, actor_kind: "human" },
      content: grantContent,
      content_hash: hash(grantContent),
      issued_by: { actor_id: actor.actor_id, actor_kind: "human" },
      issued_at: "2026-09-20T00:00:00.000Z",
    };
    await grants.registerCapabilityGrant(grant);

    const inputManifest = readFixture<PetraWorkerInputManifest>(
      "worker-input-manifest",
    );
    const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
    inputManifest.content.inputs = [
      {
        binding_kind: "record",
        name: "project_context",
        record_id: project.project_id,
        record_revision: project.revision,
        snapshot_hash: hash(project),
      },
    ];
    inputManifest.content_hash = hash(inputManifest.content);
    inputManifest.issued_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    workUnit.capability_grant_id = grant.capability_grant_id;
    workUnit.created_by = structuredClone(inputManifest.issued_by);
    workUnit.spec.input_manifest_ref.content_hash = inputManifest.content_hash;
    workUnit.spec_hash = hash(workUnit.spec);
    registeredWork = await workUnits.register({ workUnit, inputManifest });

    const role = readFixture<PetraProjectInquiryRole>("project-inquiry-role");
    role.content.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
    };
    role.content.representation.contract = {
      name: "petra.project-objective",
      version: "1.0.0",
      content_hash: contractHash("project-objective"),
    };
    role.content_hash = hash(role.content);
    await inquiries.registerProjectInquiryRoleRevision(role);

    const link = readFixture<PetraProjectInquiryLink>(
      "project-inquiry-work-link",
    );
    link.content.project_definition_ref = structuredClone(
      role.content.project_definition_ref,
    );
    link.content.inquiry_role_ref = projectInquiryRoleRef(role);
    link.content.inquiry_anchor = {
      anchor_kind: "project_objective",
      semantic_key: objective.content.objective_kind,
      objective_ref: {
        objective_id: objective.objective_id,
        revision: objective.revision,
        content_hash: objective.content_hash,
        record_hash: hash(objective),
      },
    };
    link.content.target = {
      target_kind: "work",
      relationship: "addresses",
      work_unit_ref: {
        work_unit_id: registeredWork.work_unit_id,
        revision: registeredWork.revision,
        spec_hash: registeredWork.spec_hash,
        record_hash: hash(registeredWork),
      },
    };
    link.content_hash = hash(link.content);
    await inquiries.registerProjectInquiryLink(link);

    server = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      projectShellViews: new PostgresProjectShellViewReader(pool, contracts),
      projectBriefViews: new PostgresProjectBriefViewReader(pool, contracts),
    });
  });

  afterAll(async () => {
    await server?.shutdown();
    await pool.end();
  });

  it("composes authenticated shell context, exact Work attention, Brief orientation, attention, and recovery", async () => {
    if (server === undefined || evidenceOutput === undefined) {
      throw new Error("The shell and Brief evidence boundary is unavailable.");
    }
    const calls: Array<{ method: string; path: string; status: number }> = [];
    const observedFetch: typeof fetch = async (input, init) => {
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
        path: `${url.pathname}${url.search}`,
        status: response.status,
      });
      return response;
    };
    const shellClient = new ProjectShellClient({
      baseUrl: server.url,
      token: TOKEN,
      fetch: observedFetch,
      contracts,
    });
    const briefClient = new ProjectBriefClient({
      registeredProfileSchemaHash: contractHash(
        "research-brief-payload",
        "1.1.0",
      ),
      baseUrl: server.url,
      token: TOKEN,
      fetch: observedFetch,
      contracts,
    });
    const counts = () =>
      pool.query<{ commands: string; events: string }>(
        "SELECT (SELECT count(*) FROM petra.command_executions)::text AS commands, (SELECT count(*) FROM petra.domain_events)::text AS events",
      );
    const beforeReads = (await counts()).rows;

    const shell = await shellClient.open(project.project_id);
    if (
      shell.schema_version !== "1.3.0" ||
      shell.content.attention_work.state !== "available"
    ) {
      throw new Error("Expected canonical shell Work attention.");
    }
    expect(shell.content.project.project_id).toBe(project.project_id);
    expect(shell.content.definition).toEqual(
      expect.objectContaining({
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      }),
    );
    expect(shell.content.current_objective).toEqual(
      expect.objectContaining({
        objective_id: objective.objective_id,
        revision: objective.revision,
        content_hash: objective.content_hash,
      }),
    );
    expect(shell.content.attention_work).toEqual(
      expect.objectContaining({
        coverage: "complete",
        returned_count: 1,
        total_count: 1,
      }),
    );
    const attentionTask = shell.content.attention_work.tasks[0];
    expect(attentionTask?.work_unit_ref).toEqual(
      expect.objectContaining({
        work_unit_id: registeredWork.work_unit_id,
        revision: registeredWork.revision,
        spec_hash: registeredWork.spec_hash,
        record_hash: hash(registeredWork),
      }),
    );
    expect(attentionTask?.attention).toEqual(
      expect.objectContaining({
        state: "needs_attention",
        reason_code: "requested",
      }),
    );
    expect(attentionTask?.destination).toEqual(
      expect.objectContaining({ role: "work" }),
    );
    expect(attentionTask?.destination.target_ref).toStrictEqual(
      attentionTask?.work_unit_ref,
    );
    expect(
      shell.content.place_summaries.find((place) => place.role === "work"),
    ).toEqual(expect.objectContaining({ item_count: 1, attention_count: 1 }));
    const shellReplay = await shellClient.open(project.project_id);
    expect(shellReplay.content_hash).toBe(shell.content_hash);

    const brief = await briefClient.read(project.project_id);
    expect(brief.content.orientation).toStrictEqual({
      statement: objective.content.statement,
      basis: "exact_current_objective",
    });
    expect(brief.content.work).toHaveLength(1);
    expect(brief.content.attention).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_id: registeredWork.work_unit_id,
          owner: "work",
          owner_content_hash: brief.content.work[0]?.content_hash,
          consequence_class: "work_interruption",
          resolution: "inspect_canonical_owner",
          deferral: "preserves_underlying_condition",
          acknowledgment: "client_local",
        }),
      ]),
    );
    expect(brief.content.comparison).toEqual({
      state: "current_only",
      reason:
        "No comparison baseline was requested. This view records current observations only.",
    });
    const briefReplay = await briefClient.read(project.project_id, {
      expected_snapshot_hash: brief.snapshot_hash,
    });
    expect(briefReplay.snapshot_hash).toBe(brief.snapshot_hash);

    const unauthorizedShell = await fetch(
      `${server.url}/api/queries/projects/${project.project_id}/shell`,
    );
    const unauthorizedBrief = await fetch(
      `${server.url}/api/queries/projects/${project.project_id}/brief`,
    );
    const unregisteredShellControl = await fetch(
      `${server.url}/api/queries/projects/${project.project_id}/shell?work_unit_id=${registeredWork.work_unit_id}`,
      { headers: { authorization: `Bearer ${TOKEN}` } },
    );
    const unavailableBaseline = await fetch(
      `${server.url}/api/queries/projects/${project.project_id}/brief?baseline_event_id=event_01ARZ3NDEKTSV4RRFFQ69G5FBH&baseline_record_hash=sha256:${"a".repeat(64)}`,
      { headers: { authorization: `Bearer ${TOKEN}` } },
    );
    expect(unauthorizedShell.status).toBe(401);
    expect(unauthorizedBrief.status).toBe(401);
    expect(unregisteredShellControl.status).toBe(422);
    expect(unavailableBaseline.status).toBe(422);
    await expect(
      briefClient.read(project.project_id, {
        expected_snapshot_hash: `sha256:${"f".repeat(64)}`,
      }),
    ).rejects.toMatchObject({ code: "PROJECT_BRIEF_STALE", status: 409 });
    expect((await counts()).rows).toEqual(beforeReads);

    const artifact = {
      schema_name: "petra.wave6-shell-brief-authority-evidence",
      schema_version: "1.0.0",
      status: "passed",
      operation_ids: [
        "shell.inspect-context",
        "shell.attention-work",
        "brief.orient",
        "brief.attention",
        "brief.change",
      ],
      executed_at: new Date().toISOString(),
      command: "npm run test:wave6:shell-brief",
      database: "fresh disposable PostgreSQL 18.6 with Flyway V001-V058",
      runtime_owners: {
        shell:
          "GET /api/queries/projects/:projectId/shell -> ProjectShellViewReader.getProjectShellView -> PostgresProjectShellViewReader -> PostgresProjectWorkViewReader",
        brief:
          "GET /api/queries/projects/:projectId/brief -> ProjectBriefViewReader.getProjectBriefView -> PostgresProjectBriefViewReader",
      },
      production_boundary: {
        server: "startPetraServer over an ephemeral TCP port",
        clients: ["ProjectShellClient.open", "ProjectBriefClient.read"],
        authentication: "Bearer middleware at /api/*",
        persistence:
          "Project, ProjectDefinition, Objective, exact Work summary/destination, inquiry link, shell context, Brief attention, and current-only comparison composed in PostgreSQL REPEATABLE READ READ ONLY transactions",
        companion_comparison_test:
          "The same command executes the existing PostgreSQL test that applies canonical changes and reads an exact successful recent-History baseline interval.",
      },
      observations: {
        project_id: project.project_id,
        definition_ref: shell.content.definition,
        objective_ref: shell.content.current_objective,
        shell_content_hash: shell.content_hash,
        shell_replay_content_hash: shellReplay.content_hash,
        attention_work: shell.content.attention_work,
        brief_snapshot_hash: brief.snapshot_hash,
        brief_replay_snapshot_hash: briefReplay.snapshot_hash,
        brief_orientation: brief.content.orientation,
        brief_attention: brief.content.attention,
        brief_comparison: brief.content.comparison,
        unauthorized_shell_status: unauthorizedShell.status,
        unauthorized_brief_status: unauthorizedBrief.status,
        unregistered_shell_control_status: unregisteredShellControl.status,
        unavailable_baseline_status: unavailableBaseline.status,
        read_only_cardinality_preserved: true,
        calls,
      },
      boundary:
        "Real disposable PostgreSQL, the production HTTP server, bearer authentication, renderer-neutral typed clients, canonical Work view composition, and exact Project inquiry linkage prove the server-owned shell context, bounded active/attention Work identities and destinations, Brief orientation, one exact Work attention observation, current-only comparison, repeatable recovery, and fail-closed unauthorized, unregistered, stale, and unavailable-baseline outcomes. The same command separately executes the existing successful canonical event-interval comparison test. This evidence does not invoke visible shell or Brief controls, choose a browser baseline, preserve browser focus or return, or claim a named Wave 6 evidence-plan scenario; those boundaries remain design-owned.",
    };
    mkdirSync(dirname(evidenceOutput), { recursive: true });
    writeFileSync(
      evidenceOutput,
      await formatText(JSON.stringify(artifact), { parser: "json" }),
    );
  });
});
