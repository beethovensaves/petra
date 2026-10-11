import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type {
  PetraProjectDefinition,
  PetraProjectShellView,
  PetraProjectWorkReadView,
  PetraProjectInquiryView,
  PetraProjectSemanticGraphView,
} from "@petra/contracts";
import {
  copilotHash,
  derivePetraId,
  type ProjectCopilotRuntime,
} from "@petra/core";
import { ProjectCopilotService } from "../src/project-copilot.js";
import type { ProjectShellPersistence } from "../src/project-shell-persistence.js";
import {
  exactDefinitionContext,
  projectActivityContext,
} from "../src/project-copilot-context.js";
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
const actor = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
function setup() {
  const shell = fixture<PetraProjectShellView>("project-shell-view");
  const definition = fixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  const inquiries = fixture<PetraProjectInquiryView>(
    "project-inquiry-view-collection",
  );
  const work = fixture<PetraProjectWorkReadView>(
    "project-work-view-collection",
  );
  for (const view of [inquiries, work]) {
    view.content.authority = {
      ...shell.content.authority,
    };
    view.content_hash = copilotHash(view.content);
  }
  const persistence = {
    views: {
      getProjectShellView: vi.fn(() => Promise.resolve(structuredClone(shell))),
    },
    definitions: {
      getProjectDefinition: vi.fn(() => Promise.resolve(definition)),
    },
    inquiryViews: {
      listProjectInquiryView: vi.fn(() => Promise.resolve(inquiries)),
    },
    workViews: { listProjectWorkView: vi.fn(() => Promise.resolve(work)) },
    workingStateSnapshots: {
      getProjectWorkingStateSnapshot: vi.fn(() => Promise.resolve(undefined)),
    },
    copilotTurns: { get: vi.fn(() => Promise.resolve(undefined)) },
  };
  const start = vi.fn(() => Promise.resolve({}));
  const runtime = {
    repository: {
      get: persistence.copilotTurns.get,
      recover: vi.fn(() => Promise.resolve(undefined)),
    },
    instanceId: "context-test",
    start,
  } as unknown as ProjectCopilotRuntime;
  const service = new ProjectCopilotService(
    persistence as unknown as ProjectShellPersistence,
    actor,
    runtime,
  );
  return {
    shell,
    definition,
    inquiries,
    work,
    persistence,
    service,
    runtime,
    start,
  };
}

describe("exact bounded context compilation", () => {
  it("enforces the total context budget and preserves selected whole records while naming omissions", async () => {
    const { shell, persistence, service } = setup();
    const graph = fixture<PetraProjectSemanticGraphView>(
      "project-semantic-graph-view",
    );
    graph.project_id = shell.project_id;
    graph.content.authority = shell.content.authority;
    graph.content.definition_ref = {
      record_id: shell.content.definition.project_definition_id,
      revision: shell.content.definition.revision,
      content_hash: shell.content.definition.content_hash,
    };
    const statement = "Exact admitted wording " + "é".repeat(3000);
    graph.content.nodes = Array.from({ length: 40 }, (_, index) => ({
      key: `large-${index}`,
      semantic_key: "scientific.claim",
      label: `Claim ${index}`,
      summary: "Exact bounded native record",
      layer: "working",
      material_state: "available",
      record_ref: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: derivePetraId("claim", `budget-context-${index}`),
        revision: 1,
        record_hash: copilotHash({ statement, index }),
      },
      native_record: { canonical_text: statement },
      remote_context: {
        permitted: true,
        reason: "Synthetic permission",
        rights_refs: [],
      },
    }));
    Object.assign(persistence, {
      semanticGraphs: { getProjectSemanticGraph: () => Promise.resolve(graph) },
    });
    const context = await service.context(shell.project_id, ["large-39"]);
    expect(
      Buffer.byteLength(JSON.stringify(context), "utf8"),
    ).toBeLessThanOrEqual(96000);
    expect(
      context.records.find((record) => record.key === "large-39")
        ?.reportable_text,
    ).toBe(statement);
    expect(
      context.records.some(
        (record) => record.kind === "project-definition-context",
      ),
    ).toBe(true);
    expect(context.records.length).toBeLessThan(40);
    expect(context.limitations.join(" ")).toContain("records were omitted");
    await expect(
      service.context(shell.project_id, ["outside-this-authorized-page"]),
    ).rejects.toMatchObject({ code: "STALE_SELECTION" });
  });
  it("denies a revoked conversation permission after context assembly and recovery before invocation", async () => {
    const { shell, persistence, service, start } = setup();
    const context = await service.context(shell.project_id);
    const read = vi
      .fn<
        () => Promise<{ state: "ready" | "consent_required"; reason: string }>
      >()
      .mockResolvedValueOnce({ state: "ready", reason: "Ready" })
      .mockResolvedValueOnce({ state: "ready", reason: "Ready" })
      .mockResolvedValueOnce({
        state: "consent_required",
        reason: "Permission was revoked.",
      });
    Object.assign(persistence, { copilotPermission: { read } });
    await expect(
      service.start({
        threadId: derivePetraId(
          "thread",
          `copilot:${shell.project_id}:${actor}`,
        ),
        runId: derivePetraId("run", "revocation-context-test"),
        question: "Can I continue?",
        request: {
          schema_name: "petra.copilot-request",
          schema_version: "1.0.0",
          project_id: shell.project_id,
          context_hash: context.content_hash,
          parent_run_id: null,
          focus_keys: [],
        },
      }),
    ).rejects.toMatchObject({ code: "CONVERSATION_WORK_NOT_AUTHORIZED" });
    expect(start).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("composes exact declared semantics and inquiry Work metadata without raw outputs or ambient route state", async () => {
    const { shell, definition, inquiries, work, persistence, service } =
      setup();
    if (
      work.content.view_kind !== "collection" ||
      inquiries.content.view_kind !== "collection"
    )
      throw new Error("collection fixtures required");
    work.content.tasks[0]!.objective = "PRIVATE_WORK_PROMPT";
    work.content.tasks[0]!.execution.failure = {
      code: "TEST_FAILURE",
      message: "PRIVATE_FAILURE_BYTES",
      retryable: false,
    };
    work.content_hash = copilotHash(work.content);
    inquiries.content.inquiries[0]!.current_framing = "PRIVATE_INQUIRY_FRAMING";
    inquiries.content_hash = copilotHash(inquiries.content);
    const context = await service.context(shell.project_id);
    expect(persistence.definitions.getProjectDefinition).toHaveBeenCalledWith(
      shell.project_id,
      shell.content.definition.revision,
    );
    expect(
      persistence.inquiryViews.listProjectInquiryView,
    ).toHaveBeenCalledWith(shell.project_id, { limit: 20 });
    expect(context.records.map((record) => record.kind)).toEqual([
      "project-definition-context",
      "project-inquiry-context",
      "project-work-context",
    ]);
    const included = JSON.parse(context.records[0]!.text!) as {
      registrations: unknown;
      terms: unknown;
      omitted_registrations: number;
    };
    expect(included.registrations).toEqual(definition.content.registrations);
    expect(included.terms).toEqual(definition.content.terms);
    expect(included.omitted_registrations).toBe(0);
    expect(
      context.records.every((record) => record.reportable_text === undefined),
    ).toBe(true);
    expect(JSON.stringify(context)).not.toMatch(
      /PRIVATE_WORK_PROMPT|PRIVATE_FAILURE_BYTES|PRIVATE_INQUIRY_FRAMING/u,
    );
    expect(context.limitations.join(" ")).toContain("packet/output bytes");
  });
  it("preserves whole definition entries and explicit omission counts within the actual byte budget", () => {
    const { shell, definition } = setup();
    const largeTerm = (index: number) => ({
      ...definition.content.terms[0],
      semantic_key: `large.term.${index}`,
      definition: "é".repeat(300),
    });
    definition.content.terms = [
      largeTerm(0),
      largeTerm(1),
      largeTerm(2),
      ...Array.from({ length: 117 }, (_, index) => largeTerm(index + 3)),
    ];
    definition.content_hash = copilotHash(definition.content);
    shell.content.definition.content_hash = definition.content_hash;
    const record = exactDefinitionContext(shell, definition);
    const excerpt = JSON.parse(record.text!) as {
      omitted_terms: number;
      terms: { definition: string }[];
    };
    expect(Buffer.byteLength(record.text!, "utf8")).toBeLessThanOrEqual(7500);
    expect(excerpt.omitted_terms + excerpt.terms.length).toBe(120);
    expect(excerpt.omitted_terms).toBeGreaterThan(0);
    expect(
      excerpt.terms.every(
        (term: { definition: string }) => term.definition === "é".repeat(300),
      ),
    ).toBe(true);
    expect(record.ref.record_hash).toBe(copilotHash(definition));
  });
  it("rejects missing corrupted foreign or equal-content different-revision definitions", () => {
    const { shell, definition } = setup();
    expect(() => exactDefinitionContext(shell, undefined)).toThrow(
      /unavailable/u,
    );
    for (const changed of [
      { ...definition, revision: definition.revision + 1 },
      {
        ...definition,
        project_definition_id: derivePetraId(
          "project_definition",
          "foreign-definition",
        ),
      },
      {
        ...definition,
        project_id: derivePetraId("project", "foreign-project"),
      },
      {
        ...definition,
        content: {
          ...definition.content,
          description: "Changed without rehash",
        },
      },
    ])
      expect(() => exactDefinitionContext(shell, changed)).toThrow(
        /identity, revision or content/u,
      );
  });
  it("rejects validly rehashed foreign stale and mixed-snapshot activity views", () => {
    const { shell, inquiries, work } = setup();
    for (const mutate of [
      (view: PetraProjectInquiryView) => {
        view.project_id = derivePetraId("project", "foreign-inquiry");
      },
      (view: PetraProjectInquiryView) => {
        view.content.project_definition_ref.revision++;
      },
      (view: PetraProjectInquiryView) => {
        view.content.authority.event_position++;
      },
      (view: PetraProjectInquiryView) => {
        view.content.authority.stream_revision++;
      },
    ]) {
      const changed = structuredClone(inquiries);
      mutate(changed);
      changed.content_hash = copilotHash(changed.content);
      expect(() => projectActivityContext(shell, changed, work)).toThrow(
        /different Project or snapshot/u,
      );
    }
  });
  it("rechecks the final Project basis and denies drift before retaining or invoking a new turn", async () => {
    const { shell, persistence, service, start } = setup();
    const context = await service.context(shell.project_id);
    const changed = structuredClone(shell);
    changed.content.definition.revision++;
    persistence.views.getProjectShellView
      .mockResolvedValueOnce(shell)
      .mockResolvedValueOnce(changed);
    await expect(
      service.start({
        threadId: derivePetraId(
          "thread",
          `copilot:${shell.project_id}:${actor}`,
        ),
        runId: derivePetraId("run", "drift-test"),
        question: "What changed?",
        request: {
          schema_name: "petra.copilot-request",
          schema_version: "1.0.0",
          project_id: shell.project_id,
          context_hash: context.content_hash,
          parent_run_id: null,
          focus_keys: [],
        },
      }),
    ).rejects.toMatchObject({ code: "CONTEXT_CHANGED" });
    expect(start).not.toHaveBeenCalled();
  });
  it("rejects an equal-content stale native graph definition identity or revision", async () => {
    for (const change of ["id", "revision"]) {
      const { shell, persistence, service } = setup();
      const graph = fixture<PetraProjectSemanticGraphView>(
        "project-semantic-graph-view",
      );
      graph.project_id = shell.project_id;
      graph.content.authority = shell.content.authority;
      graph.content.definition_ref = {
        record_id: shell.content.definition.project_definition_id,
        revision: shell.content.definition.revision,
        content_hash: shell.content.definition.content_hash,
      };
      if (change === "id")
        graph.content.definition_ref.record_id = derivePetraId(
          "project_definition",
          "same-content-other-id",
        );
      else graph.content.definition_ref.revision++;
      graph.content_hash = copilotHash(graph.content);
      Object.assign(persistence, {
        semanticGraphs: {
          getProjectSemanticGraph: () => Promise.resolve(graph),
        },
      });
      await expect(service.context(shell.project_id)).rejects.toMatchObject({
        code: "CONTEXT_CHANGED",
      });
    }
  });
  it("preserves unavailable inquiry coverage and excludes conversation Work from metadata rather than duplicating private history", () => {
    const { shell, work } = setup();
    if (work.content.view_kind !== "collection")
      throw new Error("collection required");
    work.content.tasks[0]!.workflow.workflow_name = "petra.copilot.answer";
    work.content_hash = copilotHash(work.content);
    const context = projectActivityContext(shell, undefined, work);
    expect(context.records).toEqual([]);
    expect(context.limitations.join(" ")).toContain(
      "Inquiry metadata is unavailable",
    );
    expect(context.limitations.join(" ")).toContain(
      "1 conversational Work entries are excluded",
    );
  });
  it("withholds stale native bytes even when source egress is otherwise permitted", async () => {
    const { shell, persistence, service } = setup();
    const graph = fixture<PetraProjectSemanticGraphView>(
      "project-semantic-graph-view",
    );
    graph.project_id = shell.project_id;
    graph.content.authority = shell.content.authority;
    graph.content.definition_ref = {
      record_id: shell.content.definition.project_definition_id,
      revision: shell.content.definition.revision,
      content_hash: shell.content.definition.content_hash,
    };
    graph.content.nodes.push({
      key: "stale-native-test",
      semantic_key: "scientific.claim",
      label: "Claim",
      summary: "Exact retained working claim",
      layer: "working",
      material_state: "definition_stale",
      record_ref: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: derivePetraId("claim", "stale-context-test"),
        revision: 1,
        record_hash: copilotHash({ statement: "STALE_NATIVE_SOURCE_BYTES" }),
      },
      native_record: { canonical_text: "STALE_NATIVE_SOURCE_BYTES" },
      remote_context: {
        permitted: true,
        reason: "Synthetic permission",
        rights_refs: [],
      },
    });
    Object.assign(persistence, {
      semanticGraphs: { getProjectSemanticGraph: () => Promise.resolve(graph) },
    });
    const context = await service.context(shell.project_id);
    expect(JSON.stringify(context)).not.toContain("STALE_NATIVE_SOURCE_BYTES");
    expect(
      context.records.find(
        (record) => record.key === graph.content.nodes[0]!.key,
      )?.reportable_text,
    ).toBeUndefined();
  });
});
