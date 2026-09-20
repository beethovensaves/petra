import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { ProjectShellClient } from "@petra/adapters";
import type {
  PetraActor,
  PetraCapabilityGrantV190,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectInquiryRole,
  PetraProjectInquirySaveRequest,
  PetraProjectObjective,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { FocusedGraphViewReader } from "@petra/core";
import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectInquiryAuthorityRepository,
  PostgresProjectInquirySaveAuthority,
  PostgresProjectShellViewReader,
  PostgresResearchScopeRepository,
  PostgresWorkUnitAuthorityRepository,
} from "@petra/postgres";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { focusedGraphFixture } from "../../../packages/contracts/test/fixtures/focused-graph-view.js";
import { startPetraServer, type PetraServer } from "../src/server.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const evidenceOutput = process.env.PETRA_WAVE6_PROJECT_SWITCH_EVIDENCE_OUTPUT;
const describePostgres =
  connectionString === undefined || evidenceOutput === undefined
    ? describe.skip
    : describe;
const TOKEN = "wave6-project-switch-token";

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
const contract = (name: string) => {
  const entry = contracts.entries.find(
    (candidate) => candidate.name === name && candidate.version === "1.0.0",
  );
  if (entry === undefined) throw new Error(`Missing contract ${name}.`);
  return {
    name: `petra.${name}`,
    version: entry.version,
    content_hash: entry.canonical_sha256,
  };
};

const retainedTaskDefinition = (): PetraProjectDefinition => {
  const definition = readFixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  definition.content.registrations = [
    {
      registration_kind: "objective_schema",
      semantic_key: "scientific.research-question",
      contract: contract("project-objective"),
    },
    {
      registration_kind: "object_schema",
      semantic_key: "scientific.claim",
      contract: contract("claim"),
    },
    {
      registration_kind: "relationship_schema",
      semantic_key: "scientific.assertion",
      contract: contract("assertion"),
    },
    {
      registration_kind: "extension",
      semantic_key: "petra.focused-graph",
      contract: contract("focused-graph-view"),
    },
    {
      registration_kind: "extension",
      semantic_key: "scientific.graph.return",
      contract: contract("focused-graph-view"),
    },
  ];
  definition.content.terms.push(
    {
      semantic_key: "scientific.assertion",
      singular: "Evidence relationship",
      plural: "Evidence relationships",
      definition: "A registered scientific relationship with exact basis.",
      generic_family: "relationship",
    },
    {
      semantic_key: "scientific.graph.return",
      singular: "Return to Brief",
      plural: "Return to Brief",
      definition: "Return to the exact originating Brief context.",
      generic_family: "task",
    },
  );
  definition.content_hash = hash(definition.content);
  return definition;
};

const retainedTaskGraph = (definition: PetraProjectDefinition) => {
  const graph = focusedGraphFixture();
  graph.content.task.task_kind = "neighborhood";
  graph.content.task.question_hash = hash(graph.content.task.question);
  graph.content.task.request_hash = hash(
    Object.fromEntries(
      Object.entries(graph.content.task).filter(
        ([key]) => key !== "request_hash",
      ),
    ),
  );
  graph.content.profile.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    record_hash: hash(definition),
    definition_family: definition.definition_family,
  };
  graph.content.profile.kernel_compatibility =
    definition.content.kernel_compatibility;
  graph.content.profile.label = definition.content.label;
  graph.content.profile.focused_graph_registration = {
    semantic_key: "petra.focused-graph",
    registration_kind: "extension",
    contract: contract("focused-graph-view"),
  };
  graph.content.profile.resolved_semantics = [
    {
      semantic_key: "scientific.research-question",
      role: "task",
      registration_kind: "objective_schema",
      contract: contract("project-objective"),
      term: definition.content.terms.find(
        (term) => term.semantic_key === "scientific.research-question",
      )!,
    },
    {
      semantic_key: "scientific.claim",
      role: "object",
      registration_kind: "object_schema",
      contract: contract("claim"),
      term: definition.content.terms.find(
        (term) => term.semantic_key === "scientific.claim",
      )!,
    },
    {
      semantic_key: "scientific.assertion",
      role: "relationship",
      registration_kind: "relationship_schema",
      contract: contract("assertion"),
      term: definition.content.terms.find(
        (term) => term.semantic_key === "scientific.assertion",
      )!,
    },
    {
      semantic_key: "scientific.graph.return",
      role: "action",
      registration_kind: "extension",
      contract: contract("focused-graph-view"),
      term: definition.content.terms.find(
        (term) => term.semantic_key === "scientific.graph.return",
      )!,
    },
  ];
  for (const node of graph.content.nodes) {
    node.term = graph.content.profile.resolved_semantics[1].term;
  }
  for (const relationship of graph.content.relationships) {
    relationship.term = graph.content.profile.resolved_semantics[2].term;
  }
  graph.content.actions[0].semantic_key = "scientific.graph.return";
  graph.content.actions[0].action_kind = "return_to_origin";
  graph.content.actions[0].consequence = "read_only_navigation";
  graph.content_hash = hash(graph.content);
  return graph;
};

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service",
  display_name: "Petra worker control plane",
  created_at: "2026-08-28T18:00:01.000Z",
});

describePostgres("Wave 6 Project switch production read", () => {
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
  const grants = new PostgresCapabilityGrantAuthorityRepository(
    pool,
    contracts,
  );
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool, contracts);
  const priorProject = readFixture<PetraProject>("project");
  const targetProject = readFixture<PetraProject>("project-controlled-writing");
  const actor = readFixture<PetraActor>("actor");
  const priorDefinition = retainedTaskDefinition();
  const targetDefinition = readFixture<PetraProjectDefinition>(
    "project-definition-controlled-writing",
  );
  const targetObjective = readFixture<PetraProjectObjective>(
    "project-objective-controlled-writing",
  );
  const calls: Array<{ method: string; path: string; status: number }> = [];
  let retainedTaskRequest: PetraProjectInquirySaveRequest;
  let runningWork: PetraWorkUnit;
  let server: PetraServer | undefined;

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await scopes.registerActor(actor);
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(priorProject);
    await scopes.registerProjectRevision(targetProject);
    await definitions.registerDefinitionRevision(priorDefinition);
    await definitions.registerDefinitionRevision(targetDefinition);
    await definitions.registerObjectiveRevision(targetObjective);
    await definitions.setCurrentObjectiveFocus({
      project_id: targetProject.project_id,
      objective_ref: {
        objective_id: targetObjective.objective_id,
        revision: targetObjective.revision,
        content_hash: targetObjective.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-20T22:00:00.000Z",
    });

    const inquiryRole = readFixture<PetraProjectInquiryRole>(
      "project-inquiry-role",
    );
    inquiryRole.content.project_definition_ref = {
      project_definition_id: priorDefinition.project_definition_id,
      revision: priorDefinition.revision,
      content_hash: priorDefinition.content_hash,
    };
    inquiryRole.content.representation.contract = {
      name: "petra.project-objective",
      version: "1.0.0",
      content_hash: contract("project-objective").content_hash,
    };
    inquiryRole.content_hash = hash(inquiryRole.content);
    await inquiries.registerProjectInquiryRoleRevision(inquiryRole);

    const grantContent: PetraCapabilityGrantV190["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["SaveProjectInquiry"],
      valid_from: "2026-09-19T00:00:00.000Z",
      reason:
        "Allow the Project author to retain one exact server-verified Graph task.",
    };
    const grant: PetraCapabilityGrantV190 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.9.0",
      capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FB2",
      revision: 1,
      project_id: priorProject.project_id,
      grantee: { actor_id: actor.actor_id, actor_kind: "human" },
      content: grantContent,
      content_hash: hash(grantContent),
      issued_by: { actor_id: actor.actor_id, actor_kind: "human" },
      issued_at: "2026-09-19T00:00:00.000Z",
    };
    await grants.registerCapabilityGrant(grant);

    const graph = retainedTaskGraph(priorDefinition);
    const graphRequest: PetraProjectInquirySaveRequest["graph_request"] = {
      request_id: graph.content.task.request_id,
      task_kind: "neighborhood",
      task_semantic_key: graph.content.task.task_semantic_key,
      question: graph.content.task.question,
      focus_ref: graph.content.task.focus_refs[0],
      origin: graph.content.task.origin,
      project_definition_ref: graph.content.profile.project_definition_ref,
      semantic_layer: "current",
      temporal_position: graph.content.temporal_position,
      object_semantic_key: "scientific.claim",
      relationship_semantic_key: "scientific.assertion",
      return_action_semantic_key: "scientific.graph.return",
      return_destination: graph.content.destinations[0],
      limits: graph.content.scope.limits,
      expected_snapshot: graph.content.requested_snapshot,
    };
    retainedTaskRequest = {
      schema_name: "petra.project-inquiry-save-request",
      schema_version: "1.0.0",
      command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FB3",
      idempotency_key: "graph.save-question:project-switch",
      graph_request: graphRequest,
      expected_graph: {
        schema_name: graph.schema_name,
        schema_version: graph.schema_version,
        content_hash: graph.content_hash,
      },
      selection: graph.content.selection,
      submitted_at: "2026-09-20T22:00:00.000Z",
    };
    const graphReader: FocusedGraphViewReader = {
      queryFocusedGraph: () => Promise.resolve(structuredClone(graph)),
    };
    const saveAuthority = new PostgresProjectInquirySaveAuthority(
      pool,
      graphReader,
      new PostgresCapabilityGrantCommandAuthorizer(contracts),
      contracts,
    );
    await saveAuthority.saveProjectInquiry(
      priorProject.project_id,
      retainedTaskRequest,
      {
        actor: { actor_id: actor.actor_id, actor_kind: "human" },
        capabilityGrantId: grant.capability_grant_id,
      },
    );

    const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
    const inputManifest = readFixture<PetraWorkerInputManifest>(
      "worker-input-manifest",
    );
    workUnit.capability_grant_id = grant.capability_grant_id;
    workUnit.created_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    inputManifest.content.inputs = [
      {
        binding_kind: "record",
        name: "project_context",
        record_id: priorProject.project_id,
        record_revision: priorProject.revision,
        snapshot_hash: hash(priorProject),
      },
    ];
    inputManifest.content_hash = hash(inputManifest.content);
    inputManifest.issued_by = structuredClone(workUnit.created_by);
    workUnit.spec.input_manifest_ref.content_hash = inputManifest.content_hash;
    workUnit.spec_hash = hash(workUnit.spec);
    await workUnits.register({ workUnit, inputManifest });
    await workUnits.queue(
      workUnit.work_unit_id,
      workUnit.revision,
      "2026-09-20T22:01:00.000Z",
    );
    runningWork = await workUnits.start(
      workUnit.work_unit_id,
      2,
      1,
      "2026-09-20T22:02:00.000Z",
    );

    server = await startPetraServer({
      port: 0,
      authToken: TOKEN,
      projectShellViews: new PostgresProjectShellViewReader(pool, contracts),
    });
  });

  afterAll(async () => {
    await server?.shutdown();
    await pool.end();
  });

  it("resolves a different exact Project without changing the prior retained task or Work", async () => {
    if (server === undefined || evidenceOutput === undefined) {
      throw new Error("The Project switch production boundary is unavailable.");
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

    const priorBefore = await client.open(priorProject.project_id);
    if (priorBefore.schema_version !== "1.2.0") {
      throw new Error("Project switch requires the retained-task shell view.");
    }
    expect(priorBefore.content.resume.state).toBe("available");
    expect(priorBefore.content.resume.retained_task?.request).toStrictEqual(
      retainedTaskRequest.graph_request,
    );
    expect(runningWork.status.state).toBe("running");

    const collection = await client.search({ status: "active", limit: 50 });
    const targetListed = collection.content.projects.find(
      (candidate) => candidate.project_id === targetProject.project_id,
    );
    if (targetListed === undefined) {
      throw new Error(
        "The different exact Project was absent from the collection.",
      );
    }
    expect(targetListed.project_id).not.toBe(priorProject.project_id);
    const targetOpened = await client.open(targetListed.project_id);
    if (targetOpened.schema_version !== "1.2.0") {
      throw new Error(
        "Project switch requires the server-owned Brief fallback.",
      );
    }
    expect(targetOpened.project_id).toBe(targetProject.project_id);
    expect(targetOpened.content.project).toStrictEqual(
      targetListed.content.project,
    );
    expect(targetOpened.content.definition).toStrictEqual(
      targetListed.content.definition,
    );
    expect(targetOpened.content.current_objective).toStrictEqual(
      targetListed.content.current_objective,
    );
    expect(targetOpened.content.resume).toStrictEqual({
      state: "not_found",
      failure: {
        code: "PROJECT_RESUME_TASK_NOT_FOUND",
        message: "This Project has no retained task to resume.",
      },
      recovery: {
        action: "open_brief",
        destination: {
          role: "brief",
          purpose: "Open the current Project Brief.",
        },
        reason:
          "Brief is the safe Project entry when no more specific retained task exists.",
      },
    });
    const targetDestination = `/projects/${targetOpened.project_id}/${targetOpened.content.resume.recovery.destination.role}`;
    expect(targetDestination).toBe(
      `/projects/${targetProject.project_id}/brief`,
    );

    const priorAfter = await client.open(priorProject.project_id);
    if (priorAfter.schema_version !== "1.2.0") {
      throw new Error("The prior Project lost its retained-task shell view.");
    }
    expect(priorAfter.content.resume).toStrictEqual(priorBefore.content.resume);
    const workAfter = await workUnits.getWorkUnit(runningWork.work_unit_id);
    expect(workAfter).toStrictEqual(runningWork);
    expect(workAfter?.status.state).toBe("running");
    const priorWorkSummary = priorAfter.content.place_summaries.find(
      (place) => place.role === "work",
    );
    const targetWorkSummary = targetOpened.content.place_summaries.find(
      (place) => place.role === "work",
    );
    expect(priorWorkSummary).toEqual(
      expect.objectContaining({ item_count: 1, attention_count: 1 }),
    );
    expect(targetWorkSummary).toEqual(
      expect.objectContaining({ item_count: 0, attention_count: 0 }),
    );

    const preservation = await pool.query<{
      prior_receipts: string;
      target_receipts: string;
      cancellation_rows: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.project_inquiry_save_receipts
           WHERE project_id = $1)::text AS prior_receipts,
         (SELECT count(*) FROM petra.project_inquiry_save_receipts
           WHERE project_id = $2)::text AS target_receipts,
         (SELECT count(*) FROM petra.work_unit_cancellations
           WHERE work_unit_id = $3)::text AS cancellation_rows`,
      [
        priorProject.project_id,
        targetProject.project_id,
        runningWork.work_unit_id,
      ],
    );
    expect(preservation.rows[0]).toStrictEqual({
      prior_receipts: "1",
      target_receipts: "0",
      cancellation_rows: "0",
    });

    const artifact = {
      schema_name: "petra.wave6-project-switch-authority-evidence",
      schema_version: "1.0.0",
      status: "passed",
      operation_id: "project.switch",
      executed_at: new Date().toISOString(),
      command: "npm run test:wave6:project-switch",
      database: "fresh disposable PostgreSQL 18.6 with Flyway V001-V058",
      runtime_owner:
        "GET /api/queries/projects -> ProjectShellViewReader.searchProjectShellViews -> PostgresProjectShellViewReader; GET /api/queries/projects/:projectId/shell -> ProjectShellViewReader.getProjectShellView -> PostgresProjectShellViewReader",
      production_boundary: {
        server: "startPetraServer over an ephemeral TCP port",
        client: "ProjectShellClient.search and ProjectShellClient.open",
        authentication: "Bearer middleware at /api/*",
        persistence:
          "Current Project, ProjectDefinition, Objective, retained ProjectInquiry, and running Work authority in PostgreSQL REPEATABLE READ READ ONLY shell transactions",
      },
      observations: {
        prior_project_id: priorProject.project_id,
        target_project_id: targetProject.project_id,
        target_was_different:
          targetProject.project_id !== priorProject.project_id,
        target_destination: targetDestination,
        target_destination_owner:
          "project-shell-view@1.2.0 resume.recovery open_brief",
        prior_retained_task_state_before: priorBefore.content.resume.state,
        prior_retained_task_state_after: priorAfter.content.resume.state,
        prior_retained_task_request_hash: hash(
          priorBefore.content.resume.retained_task?.request,
        ),
        prior_work_unit_id: runningWork.work_unit_id,
        prior_work_state_before: runningWork.status.state,
        prior_work_state_after: workAfter?.status.state,
        prior_work_revision_before: runningWork.revision,
        prior_work_revision_after: workAfter?.revision,
        cancellation_rows: Number(preservation.rows[0]?.cancellation_rows),
        substituted_project: false,
        calls,
      },
      boundary:
        "Real disposable PostgreSQL, the production HTTP server, bearer authentication, and the renderer-neutral typed client prove that selecting a different exact collection member resolves that Project's server-owned shell and Brief fallback while the prior Project's immutable retained Graph task and running Work remain independently unchanged. This backend trace does not invoke the visible Project switcher or prove browser-local draft, selection, focus, history, or return-context preservation; that visible DB18-P11 execution remains design-owned.",
    };
    mkdirSync(dirname(evidenceOutput), { recursive: true });
    writeFileSync(evidenceOutput, `${JSON.stringify(artifact, null, 2)}\n`);
  });
});
