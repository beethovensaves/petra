import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { focusedGraphFixture } from "../../contracts/test/fixtures/focused-graph-view.js";
import type {
  PetraActor,
  PetraCapabilityGrantV190,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectInquiryRole,
  PetraProjectInquirySaveRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ProjectInquirySaveError,
  FocusedGraphViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { PostgresCapabilityGrantAuthorityRepository } from "../src/capability-grant-authority-repository.js";
import { PostgresCapabilityGrantCommandAuthorizer } from "../src/capability-grant-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresProjectInquiryAuthorityRepository } from "../src/project-inquiry-authority-repository.js";
import { PostgresProjectInquirySaveAuthority } from "../src/project-inquiry-save-authority.js";
import { PostgresProjectShellViewReader } from "../src/project-shell-view-reader.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

const fixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
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

const projectDefinition = (): PetraProjectDefinition => {
  const definition = fixture<PetraProjectDefinition>(
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

const graphFor = (definition: PetraProjectDefinition) => {
  const graph = focusedGraphFixture();
  const definitionRecordHash = hash(definition);
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
    record_hash: definitionRecordHash,
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

describePostgres("PostgreSQL ProjectInquiry save authority", () => {
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

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
  });

  afterAll(async () => {
    await pool.end();
  });

  const setup = async () => {
    const actor = fixture<PetraActor>("actor");
    const project = fixture<PetraProject>("project");
    const definition = projectDefinition();
    await scopes.registerActor(actor);
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);

    const role = fixture<PetraProjectInquiryRole>("project-inquiry-role");
    role.content.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
    };
    role.content.representation.contract = {
      name: "petra.project-objective",
      version: "1.0.0",
      content_hash: contract("project-objective").content_hash,
    };
    role.content_hash = hash(role.content);
    await inquiries.registerProjectInquiryRoleRevision(role);

    const grantContent: PetraCapabilityGrantV190["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["SaveProjectInquiry"],
      valid_from: "2026-09-19T00:00:00.000Z",
      reason:
        "Allow the Project author to retain an exact server-verified Graph question.",
    };
    const grant: PetraCapabilityGrantV190 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.9.0",
      capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FB2",
      revision: 1,
      project_id: project.project_id,
      grantee: { actor_id: actor.actor_id, actor_kind: "human" },
      content: grantContent,
      content_hash: hash(grantContent),
      issued_by: { actor_id: actor.actor_id, actor_kind: "human" },
      issued_at: "2026-09-19T00:00:00.000Z",
    };
    await grants.registerCapabilityGrant(grant);

    const graph = graphFor(definition);
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
    const request: PetraProjectInquirySaveRequest = {
      schema_name: "petra.project-inquiry-save-request",
      schema_version: "1.0.0",
      command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FB3",
      idempotency_key: "graph.save-question:postgres-integration",
      graph_request: graphRequest,
      expected_graph: {
        schema_name: graph.schema_name,
        schema_version: graph.schema_version,
        content_hash: graph.content_hash,
      },
      selection: graph.content.selection,
      submitted_at: "2026-09-19T22:45:00.000Z",
    };
    const queryFocusedGraph = vi.fn<
      FocusedGraphViewReader["queryFocusedGraph"]
    >(() => Promise.resolve(structuredClone(graph)));
    const authority = new PostgresProjectInquirySaveAuthority(
      pool,
      { queryFocusedGraph },
      new PostgresCapabilityGrantCommandAuthorizer(contracts),
      contracts,
    );
    return {
      actor,
      project,
      definition,
      role,
      grant,
      graph,
      request,
      authority,
      queryFocusedGraph,
    };
  };

  it("atomically saves, replays, recovers, and protects one exact Graph question", async () => {
    const {
      actor,
      project,
      definition,
      grant,
      request,
      authority,
      queryFocusedGraph,
    } = await setup();
    const principal = {
      actor: { actor_id: actor.actor_id, actor_kind: "human" as const },
      capabilityGrantId: grant.capability_grant_id,
    };

    const created = await authority.saveProjectInquiry(
      project.project_id,
      request,
      principal,
    );
    const replayed = await authority.saveProjectInquiry(
      project.project_id,
      structuredClone(request),
      principal,
    );

    expect(created.applied).toBe(true);
    expect(replayed).toStrictEqual({ ...created, applied: false });
    expect(queryFocusedGraph).toHaveBeenCalledTimes(1);
    expect(created.inquiry.content).toStrictEqual({
      objective_kind: "scientific.research-question",
      statement: request.graph_request.question,
      status: "active",
      dependency_refs: [],
    });
    expect(created.receipt.graph_binding.selection).toStrictEqual(
      request.selection,
    );
    expect(created.receipt.graph_binding.return_destination).toStrictEqual(
      request.graph_request.return_destination,
    );
    expect(created.receipt.effect).toStrictEqual({
      kind: "project_inquiry_created",
      summary:
        "The exact question is retained as an active ProjectInquiry; its graph snapshot and selection remain provenance rather than authority.",
      graph_authority_changed: false,
      selection_granted_authority: false,
    });

    const shellReader = new PostgresProjectShellViewReader(pool, contracts);
    const shell = await shellReader.getProjectShellView(project.project_id);
    if (shell === undefined) throw new Error("Expected a Project shell view.");
    expect(shell.schema_version).toBe("1.2.0");
    expect(shell.content.resume).toStrictEqual({
      state: "available",
      retained_task: {
        task_kind: "focused_graph",
        objective_ref: created.receipt.objective_ref,
        label: request.graph_request.question,
        request: request.graph_request,
        expected_graph: request.expected_graph,
        selection: created.receipt.graph_binding.selection,
        origin: created.receipt.graph_binding.origin,
        focus_refs: created.receipt.graph_binding.focus_refs,
        return_destination: created.receipt.graph_binding.return_destination,
        retained_at: created.receipt.recorded_at,
      },
      recovery: {
        action: "open_retained_task",
        destination: {
          role: "graph",
          purpose: "Resume the exact retained relationship question.",
        },
        reason:
          "The server verified the retained task, origin, focus, definition, and active ProjectInquiry revision in one Project snapshot.",
      },
    });
    const listedShells = await shellReader.listProjectShellViews();
    expect(listedShells).toHaveLength(1);
    expect(listedShells[0]?.content.resume).toStrictEqual(shell.content.resume);

    const confirmed = await authority.assessProjectInquirySaveRecovery(
      project.project_id,
      request,
      principal,
    );
    expect(confirmed.effect).toStrictEqual({
      state: "effect_confirmed",
      receipt: created.receipt,
    });

    const unknownRequest = structuredClone(request);
    unknownRequest.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FB4";
    unknownRequest.idempotency_key =
      "graph.save-question:postgres-integration:unknown";
    const unknown = await authority.assessProjectInquirySaveRecovery(
      project.project_id,
      unknownRequest,
      principal,
    );
    expect(unknown.effect).toStrictEqual({
      state: "outcome_unknown",
      reason: "receipt_not_observed_at_cutoff",
      retry: {
        method: "POST",
        path: `/api/commands/projects/${project.project_id}/inquiries`,
        reuse_exact_request: true,
      },
    });

    const counts = await pool.query<{
      objectives: string;
      receipts: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.project_objectives)::text AS objectives,
         (SELECT count(*) FROM petra.project_inquiry_save_receipts)::text AS receipts`,
    );
    expect(counts.rows[0]).toStrictEqual({ objectives: "1", receipts: "1" });
    await expect(
      pool.query(
        `UPDATE petra.project_inquiry_save_receipts
            SET semantic_layer = 'working'
          WHERE command_id = $1`,
        [request.command_id],
      ),
    ).rejects.toMatchObject({ code: "55000" });

    const revisedDefinition = structuredClone(definition);
    revisedDefinition.revision = 2;
    revisedDefinition.content.label = "Revised scientific inquiry";
    revisedDefinition.content_hash = hash(revisedDefinition.content);
    revisedDefinition.created_at = "2026-09-20T00:00:00.000Z";
    await definitions.registerDefinitionRevision(revisedDefinition);
    const staleShell = await shellReader.getProjectShellView(
      project.project_id,
    );
    if (staleShell === undefined) {
      throw new Error("Expected a stale Project resume result.");
    }
    expect(staleShell.content.resume.state).toBe("stale");
    expect(staleShell.content.resume.retained_task).toStrictEqual(
      shell.content.resume.retained_task,
    );
    expect(staleShell.content.resume.failure).toStrictEqual({
      code: "PROJECT_RESUME_DEFINITION_STALE",
      message:
        "The ProjectDefinition has changed since this task was retained.",
    });
    expect(staleShell.content.resume.recovery.action).toBe("open_brief");
    expect(staleShell.content.resume.recovery.destination.role).toBe("brief");

    const conflict = structuredClone(request);
    conflict.graph_request.question = "A different exact question.";
    await expect(
      authority.saveProjectInquiry(project.project_id, conflict, principal),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectInquirySaveError>>({
        code: "PROJECT_INQUIRY_SAVE_CONFLICT",
      }),
    );
  });

  it("rejects a selection outside the server-verified Graph result", async () => {
    const { actor, project, grant, request, authority } = await setup();
    request.selection = {
      state: "selected",
      selection_kind: "node",
      selected_keys: ["node:not-returned"],
    };

    await expect(
      authority.saveProjectInquiry(project.project_id, request, {
        actor: { actor_id: actor.actor_id, actor_kind: "human" },
        capabilityGrantId: grant.capability_grant_id,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectInquirySaveError>>({
        code: "PROJECT_INQUIRY_SAVE_SELECTION_INVALID",
      }),
    );
    const count = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM petra.project_inquiry_save_receipts",
    );
    expect(count.rows[0]?.count).toBe("0");
  });
});
