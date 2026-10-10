import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type {
  PetraProjectShellView,
  PetraProject,
  PetraProjectSemanticGraphView,
  PetraCopilotRequest,
  PetraProjectExaminationView,
  PetraHypothesis,
} from "@petra/contracts";
import {
  copilotHash,
  conversationAuthorityProposal,
  type CopilotTurn,
  type ProjectCopilotRuntime,
} from "@petra/core";
import { ProjectCopilotService } from "../src/project-copilot.js";
import type { ProjectShellPersistence } from "../src/project-shell-persistence.js";
const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as T;
const shell = (): PetraProjectShellView => fixture("project-shell-view");
const actor = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
const ports = (
  read: PetraProjectShellView,
  graph?: PetraProjectSemanticGraphView,
): ProjectShellPersistence =>
  ({
    views: { getProjectShellView: () => Promise.resolve(read) },
    semanticGraphs: { getProjectSemanticGraph: () => Promise.resolve(graph) },
    workingStateSnapshots: {
      getProjectWorkingStateSnapshot: () => Promise.resolve(undefined),
    },
    copilotTurns: { list: () => Promise.resolve([]) },
  }) as unknown as ProjectShellPersistence;

describe("Project copilot's current basis and retained recovery", () => {
  it("allows clarification for a Project with no selected outcome without inventing one", async () => {
    const read = shell();
    delete read.content.current_objective;
    const service = new ProjectCopilotService(ports(read), actor);
    const context = await service.context(read.project_id);
    expect(context.basis.objective).toBeNull();
    expect(context.records).toEqual([]);
    expect(context.objective_statement).toContain("No current outcome");
    expect(
      context.limitations.some((limit) => limit.includes("does not set")),
    ).toBe(true);
  });
  it("withholds restricted native source text while retaining registered relationship semantics", async () => {
    const read = shell();
    const graph = fixture<PetraProjectSemanticGraphView>(
      "project-semantic-graph-view",
    );
    graph.project_id = read.project_id;
    graph.content.authority = read.content.authority;
    graph.content.definition_ref = {
      record_id: read.content.definition.project_definition_id,
      revision: read.content.definition.revision,
      content_hash: read.content.definition.content_hash,
    };
    graph.content.nodes.push({
      key: "working-test",
      semantic_key: "scientific.claim",
      label: "Claim",
      summary: "A source statement.",
      layer: "working",
      record_ref: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAW",
        revision: 1,
        record_hash: `sha256:${"4".repeat(64)}`,
      },
      material_state: "available",
    });
    graph.content.relationships.push({
      key: "working-link",
      semantic_key: "scientific.qualifies",
      predicate: "QUALIFIES",
      subject_key: "working-test",
      object_key: "working-test",
      record_ref: {
        schema_name: "petra.working-relationship",
        schema_version: "1.0.0",
        record_id: "working_relationship_01ARZ3NDEKTSV4RRFFQ69G5FAW",
        revision: 1,
        record_hash: `sha256:${"5".repeat(64)}`,
      },
    });
    const node = graph.content.nodes[0]!;
    node.layer = "working";
    node.native_record = { canonical_text: "RESTRICTED_SOURCE_TEXT" };
    node.remote_context = {
      permitted: false,
      reason: "Remote use is disabled.",
      rights_refs: [],
    };
    node.material_state = "available";
    const service = new ProjectCopilotService(ports(read, graph), actor);
    const context = await service.context(read.project_id);
    expect(JSON.stringify(context)).not.toContain("RESTRICTED_SOURCE_TEXT");
    expect(context.records.some((record) => record.key === node.key)).toBe(
      true,
    );
    expect(
      context.records.some(
        (record) =>
          record.kind === graph.content.relationships[0]?.semantic_key,
      ),
    ).toBe(true);
  });
  it("admits an examination record only through its exact current target and remote permission", async () => {
    const read = shell();
    const graph = fixture<PetraProjectSemanticGraphView>(
      "project-semantic-graph-view",
    );
    graph.project_id = read.project_id;
    graph.content.authority = read.content.authority;
    graph.content.definition_ref = {
      record_id: read.content.definition.project_definition_id,
      revision: read.content.definition.revision,
      content_hash: read.content.definition.content_hash,
    };
    const hypothesis = fixture<PetraHypothesis>("hypothesis");
    hypothesis.content.descriptor = "PRIVATE_EXAMINATION_DESCRIPTOR";
    graph.content.nodes.push({
      key: "target",
      semantic_key: "scientific.claim",
      label: "Claim",
      summary: "Native statement",
      layer: "working",
      record_ref: hypothesis.content.target_claim_ref,
      native_record: { canonical_text: "EXACT_ADMITTED_WORDING" },
      material_state: "available",
      remote_context: {
        permitted: false,
        reason: "Remote use restricted.",
        rights_refs: [],
      },
    });
    graph.content_hash = copilotHash(graph.content);
    const examination = fixture<PetraProjectExaminationView>(
      "project-examination-view",
    );
    examination.graph = graph;
    examination.records = [hypothesis];
    const persistence = ports(read, graph);
    Object.assign(persistence, {
      examinations: { read: () => Promise.resolve(examination) },
    });
    const service = new ProjectCopilotService(persistence, actor);
    const withheld = await service.context(read.project_id);
    expect(JSON.stringify(withheld)).not.toContain(
      "PRIVATE_EXAMINATION_DESCRIPTOR",
    );
    expect(
      withheld.records.some((record) => record.kind === "hypothesis"),
    ).toBe(true);
    graph.content.nodes[0]!.remote_context!.permitted = true;
    graph.content_hash = copilotHash(graph.content);
    const admitted = await service.context(read.project_id);
    expect(JSON.stringify(admitted)).toContain(
      "PRIVATE_EXAMINATION_DESCRIPTOR",
    );
    expect(
      admitted.records.find((record) => record.key === "target")
        ?.reportable_text,
    ).toBe("EXACT_ADMITTED_WORDING");
    examination.graph = { ...graph, content_hash: `sha256:${"f".repeat(64)}` };
    await expect(service.context(read.project_id)).rejects.toThrow(
      "examination and native graph basis",
    );
  });
  it("restores an exact retained retry without requiring its old evidence projection to remain current", async () => {
    const read = shell();
    const prior = fixture<CopilotTurn>("copilot-turn");
    const request: PetraCopilotRequest = {
      schema_name: "petra.copilot-request",
      schema_version: "1.0.0",
      project_id: read.project_id,
      context_hash: prior.context.content_hash,
      parent_run_id: prior.parent_run_id,
      focus_keys: [],
    };
    const input = {
      threadId: prior.thread_id,
      runId: prior.run_id,
      question: prior.question,
      request,
    };
    prior.request_hash = copilotHash(input);
    const get = vi.fn(() => Promise.resolve(prior));
    const start = vi.fn();
    const persistence = ports(read);
    persistence.semanticGraphs!.getProjectSemanticGraph = () =>
      Promise.reject(new Error("Projection changed"));
    const runtime = {
      repository: { get },
      start,
    } as unknown as ProjectCopilotRuntime;
    const service = new ProjectCopilotService(persistence, actor, runtime);
    expect(await service.start(input)).toBe(prior);
    expect(start).not.toHaveBeenCalled();
    await expect(
      service.start({ ...input, question: "Substituted question" }),
    ).rejects.toThrow("different retained");
  });
});

it("retains the exact filtered shared graph and refuses stale or mismatched peers before model execution", async () => {
  const read = shell();
  const graph = fixture<PetraProjectSemanticGraphView>(
    "project-semantic-graph-view",
  );
  graph.project_id = read.project_id;
  graph.content.authority = read.content.authority;
  graph.content.definition_ref = {
    record_id: read.content.definition.project_definition_id,
    revision: read.content.definition.revision,
    content_hash: read.content.definition.content_hash,
  };
  graph.content_hash = copilotHash(graph.content);
  const { graphPresentationContent, graphPresentationPeer } =
    await import("@petra/core");
  const parameters = {
    renderer: "native_working" as const,
    mode: "graph" as const,
    semantic_content_hash: graph.content_hash,
    selected_keys: [],
    excluded_kinds: [],
  };
  const content = graphPresentationContent(graph, parameters),
    peer_content_hash = copilotHash(graphPresentationPeer(content));
  const binding = {
    parameters,
    peer_content_hash,
    content_hash: copilotHash({ ...content, peer_content_hash }),
  };
  const start = vi.fn((turn: CopilotTurn) => Promise.resolve(turn));
  const runtime = {
    repository: {
      get: () => Promise.resolve(undefined),
      recover: () => Promise.resolve(),
      list: () => Promise.resolve([]),
    },
    start,
  } as unknown as ProjectCopilotRuntime;
  const service = new ProjectCopilotService(ports(read, graph), actor, runtime);
  const result = await service.read(read.project_id, [], binding);
  expect(result.shared_scene?.content_hash).toBe(binding.content_hash);
  expect(
    result.context.records.find(
      (record) => record.kind === "graph-presentation-context",
    )?.text,
  ).toContain(binding.peer_content_hash);
  await expect(
    service.read(read.project_id, [], {
      ...binding,
      peer_content_hash: `sha256:${"f".repeat(64)}`,
    }),
  ).rejects.toThrow("semantic peer");
  const request = {
    schema_name: "petra.copilot-request" as const,
    schema_version: "1.1.0" as const,
    project_id: read.project_id,
    context_hash: result.context.content_hash,
    parent_run_id: null,
    focus_keys: [],
    shared_scene: binding,
  };
  const input = {
    threadId: result.thread_id,
    runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    question: "Explain this displayed graph",
    request,
  };
  const turn = await service.start(input);
  expect(turn.schema_version).toBe("1.1.0");
  expect(turn.shared_scene?.content_hash).toBe(binding.content_hash);
  start.mockClear();
  graph.content.omitted_candidates++;
  graph.content_hash = copilotHash(graph.content);
  await expect(
    service.start({ ...input, runId: "run_01ARZ3NDEKTSV4RRFFQ69G5FAX" }),
  ).rejects.toThrow("displayed graph");
  expect(start).not.toHaveBeenCalled();
});

it("denies unavailable owner permission before context content reads or provider invocation", async () => {
  const view = vi.fn(() => Promise.resolve(shell()));
  const base = ports(shell()),
    start = vi.fn();
  const persistence = {
    ...base,
    views: { ...base.views, getProjectShellView: view },
    copilotPermission: {
      read: () =>
        Promise.resolve({
          state: "unavailable" as const,
          reason: "The exact owner is unavailable.",
        }),
      execute: () =>
        Promise.reject(new Error("No permission command is allowed.")),
    },
  };
  const service = new ProjectCopilotService(persistence, actor, {
    repository: { get: () => Promise.resolve(undefined) },
    start,
  } as unknown as ProjectCopilotRuntime);
  await expect(service.read(shell().project_id)).rejects.toMatchObject({
    code: "CONVERSATION_PERMISSION_UNAVAILABLE",
  });
  await expect(service.context(shell().project_id)).rejects.toMatchObject({
    code: "CONVERSATION_PERMISSION_UNAVAILABLE",
  });
  const request = fixture<PetraCopilotRequest>("copilot-request");
  await expect(
    service.start({
      threadId: "thread_test",
      runId: "run_test",
      question: "Forbidden question",
      request,
    }),
  ).rejects.toMatchObject({ code: "CONVERSATION_WORK_NOT_AUTHORIZED" });
  expect(view).not.toHaveBeenCalled();
  expect(start).not.toHaveBeenCalled();
});
it("exposes required owner consent without adopting history or starting conversation Work", async () => {
  const read = shell(),
    base = ports(read),
    history = vi.fn(),
    recover = vi.fn(),
    proposal = conversationAuthorityProposal(
      fixture<PetraProject>("project"),
      actor,
    );
  const persistence = {
    ...base,
    copilotPermission: {
      read: () =>
        Promise.resolve({
          state: "required" as const,
          reason: "Explicit owner review is required.",
          proposal,
        }),
      execute: () =>
        Promise.reject(new Error("No permission command was submitted.")),
    },
    copilotHistory: { listPage: history },
  };
  const runtime = {
    repository: { recover },
    start: vi.fn(),
  } as unknown as ProjectCopilotRuntime;
  const result = await new ProjectCopilotService(
    persistence,
    actor,
    runtime,
  ).read(read.project_id);
  expect(result.authorization?.state).toBe("required");
  expect(result.turns).toEqual([]);
  expect(result.availability.state).toBe("unavailable");
  expect(history).not.toHaveBeenCalled();
  expect(recover).not.toHaveBeenCalled();
});
