import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  FocusedGraphResolvedSemantic,
  PetraFocusedGraphView,
  PetraProjectDefinition,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { focusedGraphFixture } from "../../contracts/test/fixtures/focused-graph-view.js";
import {
  FocusedGraphViewContractError,
  FocusedGraphViewContractResolver,
  parseFocusedGraphDetailsViewRequest,
  parseFocusedGraphViewRequest,
} from "../src/focused-graph-view.js";

const contracts = new PetraContractRegistry();
const resolver = new FocusedGraphViewContractResolver(contracts);
const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const registryContract = (name: string) => {
  const entry = contracts.entries.find((candidate) => candidate.name === name);
  if (entry === undefined) throw new Error(`Missing test contract ${name}.`);
  return {
    name: `petra.${entry.name}`,
    version: entry.version,
    content_hash: entry.canonical_sha256,
  };
};
const readDefinition = (): PetraProjectDefinition =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../contracts/fixtures/accepted/project-definition-scientific.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraProjectDefinition;
const sealDefinition = (
  definition: PetraProjectDefinition,
): PetraProjectDefinition => {
  definition.content_hash = digest(definition.content);
  return definition;
};
const sealView = (view: PetraFocusedGraphView): PetraFocusedGraphView => {
  view.content.task.question_hash = digest(view.content.task.question);
  const requestIdentity: Partial<typeof view.content.task> = structuredClone(
    view.content.task,
  );
  delete requestIdentity.request_hash;
  view.content.task.request_hash = digest(requestIdentity);
  view.content_hash = digest(view.content);
  return view;
};
const exactTerm = (definition: PetraProjectDefinition, semanticKey: string) => {
  const term = definition.content.terms.find(
    (candidate) => candidate.semantic_key === semanticKey,
  );
  if (term === undefined) throw new Error(`Missing test term ${semanticKey}.`);
  return structuredClone(term);
};
const fixture = (): {
  definition: PetraProjectDefinition;
  view: PetraFocusedGraphView;
} => {
  const definition = readDefinition();
  const focusedContract = registryContract("focused-graph-view");
  const registrations = [
    {
      registration_kind: "objective_schema" as const,
      semantic_key: "scientific.research-question",
      contract: registryContract("project-objective"),
    },
    {
      registration_kind: "object_schema" as const,
      semantic_key: "scientific.claim",
      contract: registryContract("claim"),
    },
    {
      registration_kind: "relationship_schema" as const,
      semantic_key: "scientific.assertion",
      contract: registryContract("assertion"),
    },
    {
      registration_kind: "extension" as const,
      semantic_key: "petra.focused-graph",
      contract: focusedContract,
    },
    {
      registration_kind: "extension" as const,
      semantic_key: "scientific.graph.trace-sources",
      contract: focusedContract,
    },
  ];
  definition.content.registrations = [
    registrations[0]!,
    ...registrations.slice(1),
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
      semantic_key: "scientific.graph.trace-sources",
      singular: "Trace sources",
      plural: "Trace sources",
      definition: "A bounded expansion over registered graph evidence.",
      generic_family: "task",
    },
  );
  sealDefinition(definition);

  const view = focusedGraphFixture();
  view.project_id = definition.project_id;
  view.content.profile.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    record_hash: digest(definition),
    definition_family: definition.definition_family,
  };
  view.content.profile.kernel_compatibility =
    definition.content.kernel_compatibility;
  view.content.profile.label = definition.content.label;
  view.content.profile.focused_graph_registration.contract = focusedContract;
  const semantics = view.content.profile.resolved_semantics;
  const bindSemantic = (
    semanticKey: string,
    contractName: string,
  ): FocusedGraphResolvedSemantic => {
    const semantic = semantics.find(
      (candidate) => candidate.semantic_key === semanticKey,
    );
    if (semantic === undefined)
      throw new Error(`Missing view semantic ${semanticKey}.`);
    semantic.contract = registryContract(contractName);
    semantic.term = exactTerm(definition, semanticKey);
    return semantic;
  };
  bindSemantic("scientific.research-question", "project-objective");
  bindSemantic("scientific.claim", "claim");
  bindSemantic("scientific.assertion", "assertion");
  bindSemantic("scientific.graph.trace-sources", "focused-graph-view");
  for (const node of view.content.nodes)
    node.term = exactTerm(definition, node.semantic_key);
  for (const relationship of view.content.relationships)
    relationship.term = exactTerm(definition, relationship.semantic_key);
  return { definition, view: sealView(view) };
};
const expectCode = (
  action: () => unknown,
  code: FocusedGraphViewContractError["code"],
) => {
  try {
    action();
    throw new Error("Expected focused graph resolution to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(FocusedGraphViewContractError);
    expect((error as FocusedGraphViewContractError).code).toBe(code);
  }
};

describe("FocusedGraphViewContractResolver", () => {
  it("resolves one exact profile and preserves caller-owned values", () => {
    const { definition, view } = fixture();
    const beforeDefinition = structuredClone(definition);
    const beforeView = structuredClone(view);
    const result = resolver.resolve(definition, view);

    expect(result).toEqual({
      state: "resolved",
      definition_family: "petra.scientific-evidence",
      view,
    });
    expect(result.view).not.toBe(view);
    expect(definition).toEqual(beforeDefinition);
    expect(view).toEqual(beforeView);
  });

  it("rejects a borrowed or altered ProjectDefinition revision", () => {
    const { definition, view } = fixture();
    view.content.profile.project_definition_ref.definition_family =
      "petra.controlled-writing";
    sealView(view);
    expectCode(
      () => resolver.resolve(definition, view),
      "FOCUSED_GRAPH_DEFINITION_MISMATCH",
    );

    const second = fixture();
    second.definition.content.label += " altered";
    expectCode(
      () => resolver.resolve(second.definition, second.view),
      "FOCUSED_GRAPH_DEFINITION_MISMATCH",
    );
  });

  it("rejects ambiguous and profile-incompatible semantic meaning", () => {
    const ambiguous = fixture();
    ambiguous.view.content.profile.resolved_semantics.push(
      structuredClone(ambiguous.view.content.profile.resolved_semantics[0]),
    );
    sealView(ambiguous.view);
    expectCode(
      () => resolver.resolve(ambiguous.definition, ambiguous.view),
      "FOCUSED_GRAPH_SEMANTIC_AMBIGUOUS",
    );

    const incompatible = fixture();
    incompatible.view.content.nodes[0]!.term.singular = "Requirement";
    sealView(incompatible.view);
    expectCode(
      () => resolver.resolve(incompatible.definition, incompatible.view),
      "FOCUSED_GRAPH_SEMANTIC_INCOMPATIBLE",
    );
  });

  it("rejects incompatible layer and temporal positions", () => {
    const layer = fixture();
    layer.view.content.semantic_layer = "working";
    sealView(layer.view);
    expectCode(
      () => resolver.resolve(layer.definition, layer.view),
      "FOCUSED_GRAPH_LAYER_INCOMPATIBLE",
    );

    const temporal = fixture();
    temporal.view.content.temporal_position = {
      position_kind: "historical",
      dimension: "recorded_time",
      at: { state: "exact", value: "2026-09-15T20:00:00.000Z" },
    };
    sealView(temporal.view);
    expectCode(
      () => resolver.resolve(temporal.definition, temporal.view),
      "FOCUSED_GRAPH_TEMPORAL_POSITION_INCOMPATIBLE",
    );
  });

  it("rejects dangling graph, selection, destination, and action references", () => {
    const endpoint = fixture();
    endpoint.view.content.relationships[0]!.target_node_key = "node:missing";
    sealView(endpoint.view);
    expectCode(
      () => resolver.resolve(endpoint.definition, endpoint.view),
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
    );

    const selection = fixture();
    if (selection.view.content.selection.state !== "selected")
      throw new Error("Expected selected fixture state.");
    selection.view.content.selection.selected_keys = ["node:missing"];
    sealView(selection.view);
    expectCode(
      () => resolver.resolve(selection.definition, selection.view),
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
    );

    const destination = fixture();
    destination.view.content.task.return_destination_key =
      "destination:missing";
    sealView(destination.view);
    expectCode(
      () => resolver.resolve(destination.definition, destination.view),
      "FOCUSED_GRAPH_REFERENCE_INCOMPATIBLE",
    );

    const action = fixture();
    action.view.content.actions[0].consequence = "read_only_navigation";
    sealView(action.view);
    expectCode(
      () => resolver.resolve(action.definition, action.view),
      "FOCUSED_GRAPH_ACTION_INCOMPATIBLE",
    );
  });
});

describe("focused graph query request boundary", () => {
  it("accepts distinct current, working, and exact historical one-hop requests and rejects renderer controls", () => {
    const { definition, view } = fixture();
    const request = {
      request_id: view.content.task.request_id,
      task_kind: "neighborhood",
      task_semantic_key: view.content.task.task_semantic_key,
      question: view.content.task.question,
      focus_ref: view.content.task.focus_refs[0],
      origin: view.content.task.origin,
      project_definition_ref: view.content.profile.project_definition_ref,
      semantic_layer: "current",
      temporal_position: {
        position_kind: "current",
        dimension: "project_snapshot",
      },
      object_semantic_key: "scientific.claim",
      relationship_semantic_key: "scientific.assertion",
      return_action_semantic_key: "scientific.graph.trace-sources",
      return_destination: view.content.destinations[0],
      limits: {
        maximum_depth: 1,
        maximum_nodes: 20,
        maximum_relationships: 19,
        maximum_paths: 19,
      },
    };
    expect(parseFocusedGraphViewRequest(request)).toEqual(request);
    expect(
      parseFocusedGraphViewRequest({
        ...request,
        semantic_layer: "working",
      }),
    ).toEqual({ ...request, semantic_layer: "working" });
    const historical = {
      ...request,
      semantic_layer: "historical",
      temporal_position: {
        position_kind: "historical",
        dimension: "recorded_time",
        at: { state: "exact", value: "2026-09-15T20:00:00.000Z" },
      },
      expected_snapshot: view.content.requested_snapshot,
    };
    expect(parseFocusedGraphViewRequest(historical)).toEqual(historical);
    expect(definition.content.supported_places).toContain("graph");

    expect(() =>
      parseFocusedGraphViewRequest({ ...request, layout: "force" }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );
    expect(() =>
      parseFocusedGraphViewRequest({
        ...request,
        limits: { ...request.limits, maximum_depth: 2 },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );
    expect(() =>
      parseFocusedGraphViewRequest({
        ...historical,
        expected_snapshot: undefined,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );
    expect(() =>
      parseFocusedGraphViewRequest({
        ...request,
        semantic_layer: "current",
        temporal_position: historical.temporal_position,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );

    const details = {
      details_request_id:
        "focused_graph_details_request_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      focused_graph_request: request,
      expected_graph: {
        schema_name: "petra.focused-graph-view",
        schema_version: "1.0.0",
        content_hash: view.content_hash,
      },
      selection: {
        selection_kind: "node",
        selected_keys: [view.content.nodes[0]!.node_key],
      },
    };
    expect(parseFocusedGraphDetailsViewRequest(details)).toEqual(details);
    expect(() =>
      parseFocusedGraphDetailsViewRequest({
        ...details,
        selection: { ...details.selection, selected_keys: ["node:missing"] },
        layout: "radial",
      }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );
  });

  it("accepts one exact snapshot-bound named expansion and rejects widened or renderer-authored input", () => {
    const { view } = fixture();
    const request = {
      request_id: view.content.task.request_id,
      task_kind: "neighborhood",
      task_semantic_key: view.content.task.task_semantic_key,
      question: view.content.task.question,
      focus_ref: view.content.task.focus_refs[0],
      origin: { origin_kind: "direct" },
      project_definition_ref: view.content.profile.project_definition_ref,
      semantic_layer: "current",
      temporal_position: {
        position_kind: "current",
        dimension: "project_snapshot",
      },
      object_semantic_key: "scientific.claim",
      relationship_semantic_key: "scientific.assertion",
      return_action_semantic_key: "scientific.graph.trace-sources",
      return_destination: view.content.destinations[1],
      limits: {
        maximum_depth: 2,
        maximum_nodes: 20,
        maximum_relationships: 19,
        maximum_paths: 19,
      },
      expected_snapshot: view.content.requested_snapshot,
      exploration: {
        mode: "named_expansion",
        expansion_key: "expansion:show-contrary:claim-a",
        recipe_semantic_key: "scientific.graph.show-contrary",
        target_ref: view.content.nodes[0]!.record_ref,
        maximum_depth: 2,
        filters: {
          meaning_kinds: ["contradiction"],
          directions: ["outgoing", "incoming"],
          origins: ["canonical_record", "model_inference"],
        },
      },
    };
    expect(parseFocusedGraphViewRequest(request)).toEqual(request);
    expect(() =>
      parseFocusedGraphViewRequest({
        ...request,
        expected_snapshot: undefined,
      }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );
    expect(() =>
      parseFocusedGraphViewRequest({
        ...request,
        limits: { ...request.limits, maximum_depth: 3 },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );
    expect(() =>
      parseFocusedGraphViewRequest({
        ...request,
        exploration: { ...request.exploration, cypher: "MATCH (n)" },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "FOCUSED_GRAPH_QUERY_INVALID" }),
    );
  });
});
