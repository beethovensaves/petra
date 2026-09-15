import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  FocusedGraphResolvedSemantic,
  PetraFocusedGraphView,
  PetraProjectDefinition,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { FocusedGraphViewRequest } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import { focusedGraphFixture } from "../../contracts/test/fixtures/focused-graph-view.js";
import {
  FocusedGraphClient,
  FocusedGraphClientError,
} from "../src/focused-graph-client.js";

const contracts = new PetraContractRegistry();
const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const contract = (name: string) => {
  const entry = contracts.entries.find((candidate) => candidate.name === name);
  if (entry === undefined) throw new Error(`Missing contract ${name}.`);
  return {
    name: `petra.${name}`,
    version: entry.version,
    content_hash: entry.canonical_sha256,
  };
};
const definitionFixture = (): PetraProjectDefinition => {
  const definition = JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/project-definition-scientific.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraProjectDefinition;
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
      definition: "A registered relationship with exact direction and basis.",
      generic_family: "relationship",
    },
    {
      semantic_key: "scientific.graph.return",
      singular: "Return to evidence",
      plural: "Return to evidence",
      definition: "Return to the exact originating evidence object.",
      generic_family: "task",
    },
  );
  definition.content_hash = hash(definition.content);
  return definition;
};

const exactTerm = (definition: PetraProjectDefinition, key: string) => {
  const term = definition.content.terms.find(
    (candidate) => candidate.semantic_key === key,
  );
  if (term === undefined) throw new Error(`Missing term ${key}.`);
  return structuredClone(term);
};

const setup = (): {
  definition: PetraProjectDefinition;
  view: PetraFocusedGraphView;
  request: FocusedGraphViewRequest;
} => {
  const definition = definitionFixture();
  const view = focusedGraphFixture();
  const definitionRef = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    record_hash: hash(definition),
    definition_family: definition.definition_family,
  };
  view.project_id = definition.project_id;
  view.content.profile.project_definition_ref = definitionRef;
  view.content.profile.kernel_compatibility =
    definition.content.kernel_compatibility;
  view.content.profile.label = definition.content.label;
  view.content.profile.focused_graph_registration.contract =
    contract("focused-graph-view");
  const bind = (
    index: number,
    key: string,
    role: FocusedGraphResolvedSemantic["role"],
    contractName: string,
  ) => {
    view.content.profile.resolved_semantics[index] = {
      semantic_key: key,
      role,
      registration_kind: definition.content.registrations.find(
        (candidate) => candidate.semantic_key === key,
      )!.registration_kind as FocusedGraphResolvedSemantic["registration_kind"],
      contract: contract(contractName),
      term: exactTerm(definition, key),
    };
  };
  bind(0, "scientific.research-question", "task", "project-objective");
  bind(1, "scientific.claim", "object", "claim");
  bind(2, "scientific.assertion", "relationship", "assertion");
  bind(3, "scientific.graph.return", "action", "focused-graph-view");
  for (const node of view.content.nodes)
    node.term = exactTerm(definition, "scientific.claim");
  for (const relationship of view.content.relationships)
    relationship.term = exactTerm(definition, "scientific.assertion");
  view.content.task.task_kind = "neighborhood";
  view.content.task.origin = { origin_kind: "direct" };
  const destination = view.content.destinations[1]!;
  view.content.task.return_destination_key = destination.destination_key;
  view.content.destinations = [
    destination,
    {
      destination_key: "destination:source-unavailable:node:claim-b",
      destination_kind: "source_inspection",
      state: "unavailable",
      owner: "project_object_location_view",
      label: "Source location unavailable",
      reason: "No direct SourceSpan location is recorded for this Claim.",
    },
  ];
  view.content.actions = [
    {
      action_key: "action:scientific:graph:return",
      action_kind: "return_to_origin",
      semantic_key: "scientific.graph.return",
      label: "Return to evidence",
      consequence: "read_only_navigation",
      target_keys: [view.content.nodes[0]!.node_key],
      availability: {
        state: "available",
        destination_key: destination.destination_key,
      },
    },
  ];
  view.content.task.question_hash = hash(view.content.task.question);
  const task = structuredClone(view.content.task) as Partial<
    typeof view.content.task
  >;
  delete task.request_hash;
  view.content.task.request_hash = hash(task);
  view.content_hash = hash(view.content);
  const request: FocusedGraphViewRequest = {
    request_id: view.content.task.request_id,
    task_kind: "neighborhood",
    task_semantic_key: "scientific.research-question",
    question: view.content.task.question,
    focus_ref: view.content.task.focus_refs[0],
    origin: view.content.task.origin,
    project_definition_ref: definitionRef,
    semantic_layer: "current",
    temporal_position: {
      position_kind: "current",
      dimension: "project_snapshot",
    },
    object_semantic_key: "scientific.claim",
    relationship_semantic_key: "scientific.assertion",
    return_action_semantic_key: "scientific.graph.return",
    return_destination: destination,
    limits: view.content.scope.limits,
  };
  return { definition, view, request };
};

describe("FocusedGraphClient", () => {
  it("posts one authenticated renderer-neutral request and preserves exact response identity", async () => {
    const { definition, view, request } = setup();
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(view)));
    const client = new FocusedGraphClient({
      baseUrl: "http://petra.local",
      token: "focused-token",
      projectDefinition: definition,
      fetch: transport,
      contracts,
    });

    await expect(client.read(definition.project_id, request)).resolves.toEqual(
      view,
    );
    const [url, init] = transport.mock.calls[0]!;
    expect((url as URL).pathname).toBe(
      `/api/queries/projects/${definition.project_id}/focused-graph`,
    );
    expect(init).toEqual({
      method: "POST",
      headers: {
        authorization: "Bearer focused-token",
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    expect(typeof init?.body).toBe("string");
    const sent = JSON.parse(init?.body as string) as unknown;
    expect(sent).not.toHaveProperty("layout");
    expect(sent).not.toHaveProperty("command");
  });

  it("rejects definition substitution, response corruption, and transport failure", async () => {
    const { definition, view, request } = setup();
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(Response.json(view)));
    const client = new FocusedGraphClient({
      baseUrl: "http://petra.local",
      token: "focused-token",
      projectDefinition: definition,
      fetch: transport,
      contracts,
    });
    const staleDefinition = structuredClone(request);
    staleDefinition.project_definition_ref.revision += 1;
    await expect(
      client.read(definition.project_id, staleDefinition),
    ).rejects.toBeInstanceOf(TypeError);
    expect(transport).not.toHaveBeenCalled();

    const corrupt = structuredClone(view);
    corrupt.content.nodes[0]!.label = "Changed outside the content hash";
    transport.mockImplementationOnce(() =>
      Promise.resolve(Response.json(corrupt)),
    );
    await expect(client.read(definition.project_id, request)).rejects.toEqual(
      expect.any(FocusedGraphClientError),
    );

    const duplicateReturn = structuredClone(view);
    duplicateReturn.content.destinations.push(
      structuredClone(request.return_destination),
    );
    duplicateReturn.content_hash = hash(duplicateReturn.content);
    transport.mockImplementationOnce(() =>
      Promise.resolve(Response.json(duplicateReturn)),
    );
    await expect(client.read(definition.project_id, request)).rejects.toEqual(
      expect.any(FocusedGraphClientError),
    );

    transport.mockImplementationOnce(() =>
      Promise.resolve(Response.json({ error: "stale" }, { status: 409 })),
    );
    await expect(client.read(definition.project_id, request)).rejects.toEqual(
      expect.objectContaining({ status: 409 }),
    );
  });
});
