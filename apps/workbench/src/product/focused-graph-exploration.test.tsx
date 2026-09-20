import { readFileSync } from "node:fs";

import type {
  FocusedGraphExplorationFiltersV11,
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectDefinition,
} from "@petra/contracts";
import type { FocusedGraphReadRequest } from "@petra/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { FocusedGraphEntry } from "./focused-graph-entry.js";
import { PetraContractRegistry as BrowserContractRegistry } from "./browser-contract-registry.js";
import {
  FocusedGraphExploration,
  FocusedGraphExplorationError,
  appendFocusedGraphPresentationState,
  createFocusedGraphExplorationRequest,
  createFocusedGraphPresentationTimeline,
  defaultFocusedGraphFilters,
  focusedGraphViewPreservesSelection,
  matchesActiveFocusedGraphExploration,
  moveFocusedGraphPresentationHistory,
  normalizeFocusedGraphFilters,
  registeredFocusedGraphRecipes,
  type FocusedGraphPresentationState,
} from "./FocusedGraphExploration.js";

const hash = `sha256:${"a".repeat(64)}`;
const record = (record_id: string) => ({
  record_id,
  revision: 1,
  record_hash: hash,
});
const term = (
  semantic_key: string,
  generic_family: "focus" | "finding" | "relationship" | "task",
  singular: string,
) => ({
  semantic_key,
  singular,
  plural: `${singular}s`,
  definition: `${singular} meaning resolved by the exact profile.`,
  generic_family,
});

const focusedGraphFixture = (): PetraFocusedGraphView => ({
  schema_name: "petra.focused-graph-view",
  schema_version: "1.0.0",
  project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  content: {
    task: {
      request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      request_hash: hash,
      task_kind: "neighborhood",
      task_semantic_key: "scientific.research-question",
      question: "Which exact relationships concern this Claim?",
      question_hash: hash,
      focus_refs: [record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB")],
      origin: { origin_kind: "direct" },
      return_destination_key: "destination:brief",
    },
    profile: {
      project_definition_ref: {
        project_definition_id: "project_definition_01K4C000000000000000000001",
        revision: 2,
        content_hash: hash,
        record_hash: hash,
        definition_family: "petra.scientific-evidence",
      },
      kernel_compatibility: "petra.project-kernel@1.0.0",
      label: "Scientific evidence inquiry",
      focused_graph_registration: {
        semantic_key: "petra.focused-graph",
        registration_kind: "extension",
        contract: {
          name: "petra.focused-graph-view",
          version: "1.0.0",
          content_hash: hash,
        },
      },
      resolved_semantics: [
        {
          semantic_key: "scientific.research-question",
          role: "task",
          registration_kind: "objective_schema",
          contract: {
            name: "petra.project-objective",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term(
            "scientific.research-question",
            "focus",
            "Research question",
          ),
        },
        {
          semantic_key: "scientific.claim",
          role: "object",
          registration_kind: "object_schema",
          contract: {
            name: "petra.claim",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term("scientific.claim", "finding", "Claim"),
        },
        {
          semantic_key: "scientific.assertion",
          role: "relationship",
          registration_kind: "relationship_schema",
          contract: {
            name: "petra.assertion",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term(
            "scientific.assertion",
            "relationship",
            "Evidence relationship",
          ),
        },
        {
          semantic_key: "scientific.graph.return",
          role: "action",
          registration_kind: "extension",
          contract: {
            name: "petra.focused-graph-view",
            version: "1.0.0",
            content_hash: hash,
          },
          term: term("scientific.graph.return", "task", "Return"),
        },
      ],
    },
    source_views: [],
    requested_snapshot: {
      snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD",
      revision: 1,
      event_position: 12,
      content_hash: hash,
    },
    represented_snapshot: {
      snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD",
      revision: 1,
      event_position: 12,
      content_hash: hash,
    },
    semantic_layer: "current",
    temporal_position: {
      position_kind: "current",
      dimension: "project_snapshot",
    },
    projection_position: {
      authority_source: "postgresql",
      projection_source: "neo4j_rebuildable_projection",
      state: "current",
      checkpoint_ref: record(
        "projection_checkpoint_01ARZ3NDEKTSV4RRFFQ69G5FAE",
      ),
      represented_event_position: 12,
      observed_event_position: 12,
      pending_records: 0,
      detail: "The bounded projection represents the requested snapshot.",
    },
    scope: {
      description: "One exact Claim at depth one.",
      included_relationship_semantics: ["scientific.assertion"],
      directions: ["outgoing"],
      included_layers: ["current"],
      limits: {
        maximum_depth: 1,
        maximum_nodes: 20,
        maximum_relationships: 20,
        maximum_paths: 10,
      },
      coverage: "complete_for_scope",
      omissions: [
        {
          omission_kind: "out_of_scope",
          description: "Whole-Project traversal is outside this result.",
          count: { state: "unknown" },
        },
      ],
    },
    nodes: [
      {
        node_key: "node:claim-a",
        record_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
        semantic_key: "scientific.claim",
        term: term("scientific.claim", "finding", "Claim"),
        label: "Claim A",
        summary: "The selected Claim.",
        layer: "current",
        authority_position: "current_authority",
        lifecycle: "represented",
        basis: {
          summary: "Canonical Project record.",
          record_refs: [],
          limitations: [],
        },
        destination_keys: ["destination:brief"],
      },
    ],
    relationships: [],
    paths: [],
    selection: {
      state: "selected",
      selection_kind: "node",
      selected_keys: ["node:claim-a"],
    },
    destinations: [
      {
        destination_key: "destination:brief",
        destination_kind: "brief",
        state: "available",
        owner: "project_brief_view",
        label: "Return to Brief",
        target_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
      },
    ],
    actions: [
      {
        action_key: "action:return",
        action_kind: "return_to_origin",
        semantic_key: "scientific.graph.return",
        label: "Return to Brief",
        consequence: "read_only_navigation",
        target_keys: ["node:claim-a"],
        availability: {
          state: "available",
          destination_key: "destination:brief",
        },
      },
    ],
    authority_boundary: {
      postgresql_authoritative: true,
      neo4j_rebuildable_projection: true,
      renderer_neutral: true,
      renderer_queries_projection: false,
      layout_grants_authority: false,
      selection_grants_authority: false,
      actions_issue_domain_mutation: false,
      correction_requires_canonical_owner: true,
      work_requires_typed_preview: true,
    },
    limitations: [
      "This contract supplies semantic membership and no renderer geometry.",
    ],
  },
  content_hash: hash,
  read_at: "2026-09-15T20:00:00.000Z",
});

const focusedGraphV11Fixture = (): PetraFocusedGraphViewV11 => {
  const base = focusedGraphFixture();
  const target = base.content.nodes[0]!;
  return {
    ...base,
    schema_version: "1.1.0",
    content: {
      ...base.content,
      scope: {
        ...base.content.scope,
        limits: { ...base.content.scope.limits, maximum_depth: 2 },
      },
      exploration: {
        mode: "named_expansion",
        expansion_key: "expansion:trace-sources:claim-a",
        recipe_semantic_key: "scientific.graph.trace-sources",
        recipe_label: "Trace recorded sources",
        target_ref: structuredClone(target.record_ref),
        target_node_key: target.node_key,
        maximum_depth: 2,
        filters: {
          meaning_kinds: ["citation"],
          directions: ["outgoing"],
          origins: ["canonical_record"],
        },
        accounting: {
          result_state: "complete_for_scope",
          capped_members: { state: "exact", value: 0 },
          hidden_relationships: { state: "exact", value: 0 },
          restricted_paths: { state: "not_disclosed" },
          cycle_paths: { state: "exact", value: 0 },
          incomplete_paths: { state: "exact", value: 0 },
          unknown_paths: { state: "unknown" },
        },
      },
      groups: [
        {
          group_key: "group:relationship-meaning:current:citation",
          facet: "relationship_meaning",
          label: "Citation — Current",
          membership_rule: "Exact returned Current citation relationships.",
          count_unit: "relationships",
          layer: "current",
          meaning_kind: "citation",
          member_relationship_keys: [],
          returned_count: 0,
          total_count: { state: "exact", value: 0 },
          filtered_count: { state: "exact", value: 0 },
          hidden_count: { state: "exact", value: 0 },
          coverage: "complete_for_scope",
          overlap: false,
        },
      ],
    },
  };
};

const definitionFixture = (): PetraProjectDefinition => {
  const definition = JSON.parse(
    readFileSync(
      new URL(
        "../../../../packages/contracts/fixtures/accepted/project-definition-scientific.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraProjectDefinition;
  definition.content.registrations.push({
    registration_kind: "extension",
    semantic_key: "scientific.graph.trace-sources",
    contract: {
      name: "petra.focused-graph-view",
      version: "1.1.0",
      content_hash: hash,
    },
  });
  definition.content.terms.push({
    semantic_key: "scientific.graph.trace-sources",
    singular: "Trace recorded sources",
    plural: "Trace recorded sources",
    definition:
      "Reveal recorded citation and provenance relationships within exact bounds.",
    generic_family: "task",
  });
  return definition;
};

const entryFixture = (): FocusedGraphEntry => {
  const view = focusedGraphFixture();
  const returnDestination = view.content.destinations[0];
  if (returnDestination?.state !== "available") {
    throw new Error("Expected an available return destination fixture.");
  }
  const definitionRef = view.content.profile.project_definition_ref;
  return {
    project_id: view.project_id,
    request_id: view.content.task.request_id,
    question: view.content.task.question,
    focus_ref: view.content.nodes[0]!.record_ref,
    origin: { origin_kind: "direct" },
    project_definition_ref: {
      project_definition_id: definitionRef.project_definition_id,
      revision: definitionRef.revision,
      content_hash: definitionRef.content_hash,
      record_hash: definitionRef.record_hash,
      definition_family: definitionRef.definition_family,
    },
    task_semantic_key: "scientific.research-question",
    object_semantic_key: "scientific.claim",
    relationship_semantic_key: "scientific.assertion",
    return_action_semantic_key: "scientific.graph.trace-sources",
    return_destination: returnDestination,
    limits: structuredClone(view.content.scope.limits),
    semantic_layer: "current",
    presentation: "position",
    expected_snapshot: structuredClone(view.content.requested_snapshot),
    return_context: {
      path: `/projects/${view.project_id}/brief`,
      label: "Brief",
    },
  };
};

const baseRequestFixture = (): FocusedGraphReadRequest => {
  const entry = entryFixture();
  return {
    request_id: entry.request_id,
    task_kind: "neighborhood",
    task_semantic_key: entry.task_semantic_key,
    question: entry.question,
    focus_ref: structuredClone(entry.focus_ref),
    origin: structuredClone(entry.origin),
    project_definition_ref: {
      ...structuredClone(entry.project_definition_ref),
      record_hash: entry.project_definition_ref.record_hash!,
    },
    semantic_layer: entry.semantic_layer,
    temporal_position: {
      position_kind: "current",
      dimension: "project_snapshot",
    },
    object_semantic_key: entry.object_semantic_key,
    relationship_semantic_key: entry.relationship_semantic_key,
    return_action_semantic_key: entry.return_action_semantic_key,
    return_destination: structuredClone(entry.return_destination),
    limits: structuredClone(entry.limits),
    expected_snapshot: structuredClone(entry.expected_snapshot!),
  };
};

const alignedExpansionResponse = (
  request: ReturnType<typeof createFocusedGraphExplorationRequest>,
  projectId: string,
): PetraFocusedGraphViewV11 => {
  const response = focusedGraphV11Fixture();
  response.project_id = projectId;
  response.content.task.request_id = request.request_id;
  response.content.task.task_kind = request.task_kind;
  response.content.task.task_semantic_key = request.task_semantic_key;
  response.content.task.question = request.question;
  response.content.task.focus_refs = [structuredClone(request.focus_ref)];
  response.content.task.origin = structuredClone(request.origin);
  response.content.task.return_destination_key =
    request.return_destination.destination_key;
  response.content.profile.project_definition_ref = structuredClone(
    request.project_definition_ref,
  );
  response.content.requested_snapshot = structuredClone(
    request.expected_snapshot,
  );
  response.content.semantic_layer = request.semantic_layer;
  response.content.temporal_position = structuredClone(
    request.temporal_position,
  );
  response.content.scope.limits = structuredClone(request.limits);
  response.content.scope.included_relationship_semantics = [
    request.relationship_semantic_key,
  ];
  response.content.scope.included_layers = [request.semantic_layer];
  response.content.scope.directions = structuredClone(
    request.exploration.filters.directions,
  );
  response.content.exploration = {
    ...response.content.exploration,
    expansion_key: request.exploration.expansion_key,
    recipe_semantic_key: request.exploration.recipe_semantic_key,
    target_ref: structuredClone(request.exploration.target_ref),
    maximum_depth: request.exploration.maximum_depth,
    filters: structuredClone(request.exploration.filters),
  };
  return response;
};

describe("focused graph exploration state", () => {
  it("registers both focused graph response versions in the browser validator", () => {
    const contracts = new BrowserContractRegistry();
    expect(() =>
      contracts.assertValid(
        "focused-graph-view",
        "1.0.0",
        focusedGraphFixture(),
      ),
    ).not.toThrow();
    expect(() =>
      contracts.assertValid(
        "focused-graph-view",
        "1.1.0",
        focusedGraphV11Fixture(),
      ),
    ).not.toThrow();
  });

  it("fails closed to exact registered profile recipes and normalizes filters", () => {
    const definition = definitionFixture();
    definition.content.registrations.push({
      registration_kind: "extension",
      semantic_key: "unknown.graph.guess",
      contract: {
        name: "petra.focused-graph-view",
        version: "1.1.0",
        content_hash: hash,
      },
    });
    definition.content.terms.push({
      semantic_key: "unknown.graph.guess",
      singular: "Guess links",
      plural: "Guess links",
      definition: "Must remain unavailable.",
      generic_family: "task",
    });

    const recipes = registeredFocusedGraphRecipes(definition, "current");
    expect(recipes).toHaveLength(1);
    expect(recipes[0]).toMatchObject({
      semanticKey: "scientific.graph.trace-sources",
      label: "Trace recorded sources",
      allowedMeanings: ["citation", "provenance"],
      allowedDirections: ["outgoing", "incoming"],
    });
    expect(registeredFocusedGraphRecipes(definition, "historical")).toEqual([]);

    const normalized = normalizeFocusedGraphFilters(recipes[0]!, {
      meaning_kinds: ["provenance", "citation"],
      directions: ["incoming", "outgoing"],
      origins: ["model_inference", "canonical_record"],
    });
    expect(normalized).toEqual({
      meaning_kinds: ["citation", "provenance"],
      directions: ["outgoing", "incoming"],
      origins: ["canonical_record", "model_inference"],
    });
    expect(() =>
      normalizeFocusedGraphFilters(recipes[0]!, {
        meaning_kinds: ["support"],
        directions: ["outgoing"],
        origins: ["canonical_record"],
      }),
    ).toThrowError(FocusedGraphExplorationError);
  });

  it("builds a renderer-neutral snapshot-bound request and rejects late or mismatched responses", () => {
    const entry = entryFixture();
    const view = focusedGraphFixture();
    const recipe = registeredFocusedGraphRecipes(
      definitionFixture(),
      "current",
    )[0]!;
    const request = createFocusedGraphExplorationRequest({
      entry,
      view,
      recipe,
      targetRef: view.content.nodes[0]!.record_ref,
      filters: defaultFocusedGraphFilters(recipe),
      maximumDepth: 2,
      requestId: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAZ",
    });
    expect(request).toMatchObject({
      expected_snapshot: view.content.requested_snapshot,
      limits: { maximum_depth: 2 },
      exploration: {
        mode: "named_expansion",
        recipe_semantic_key: "scientific.graph.trace-sources",
        target_ref: view.content.nodes[0]!.record_ref,
      },
    });
    expect(request).not.toHaveProperty("layout");
    expect(request).not.toHaveProperty("pinnedNodeKeys");
    expect(request).not.toHaveProperty("command");

    const response = alignedExpansionResponse(request, entry.project_id);
    const active = { stateId: 7, projectId: entry.project_id, request };
    expect(matchesActiveFocusedGraphExploration(response, active, 7)).toBe(
      true,
    );
    expect(matchesActiveFocusedGraphExploration(response, active, 8)).toBe(
      false,
    );

    const newer = structuredClone(response);
    newer.content.task.request_id =
      "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAY";
    expect(matchesActiveFocusedGraphExploration(newer, active, 7)).toBe(false);

    const changedScope = structuredClone(response);
    changedScope.content.exploration.filters.meaning_kinds = ["provenance"];
    expect(matchesActiveFocusedGraphExploration(changedScope, active, 7)).toBe(
      false,
    );
    expect(focusedGraphViewPreservesSelection(response, "node:claim-a")).toBe(
      true,
    );
    response.content.nodes = response.content.nodes.filter(
      (node) => node.node_key !== "node:claim-a",
    );
    expect(focusedGraphViewPreservesSelection(response, "node:claim-a")).toBe(
      false,
    );
  });

  it("caps Back and Forward presentation history at ten states and branches safely", () => {
    const view = focusedGraphFixture();
    const state = (stateId: number): FocusedGraphPresentationState => ({
      stateId,
      request: baseRequestFixture(),
      view,
      selectedKey: stateId % 2 === 0 ? "node:claim-b" : "node:claim-a",
      pinnedNodeKeys: stateId % 2 === 0 ? ["node:claim-b"] : [],
      collapsedNodeKeys: stateId % 3 === 0 ? ["node:claim-a"] : [],
      layout: stateId % 2 === 0 ? "radial" : "relationship",
      representation: stateId % 2 === 0 ? "text" : "graph",
    });
    let timeline = createFocusedGraphPresentationTimeline(state(1));
    for (let id = 2; id <= 12; id += 1) {
      timeline = appendFocusedGraphPresentationState(timeline, state(id));
    }
    expect(timeline.states.map((item) => item.stateId)).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(timeline.index).toBe(9);
    timeline = moveFocusedGraphPresentationHistory(timeline, "back");
    timeline = moveFocusedGraphPresentationHistory(timeline, "back");
    expect(timeline.states[timeline.index]?.stateId).toBe(10);
    timeline = appendFocusedGraphPresentationState(timeline, state(13));
    expect(timeline.states.map((item) => item.stateId)).toEqual([
      3, 4, 5, 6, 7, 8, 9, 10, 13,
    ]);
    expect(moveFocusedGraphPresentationHistory(timeline, "forward")).toEqual(
      timeline,
    );
  });

  it("renders keyboard-operable local exploration, disclosure, saved-question, and history controls", () => {
    const view = focusedGraphFixture();
    const definition = definitionFixture();
    const filters: FocusedGraphExplorationFiltersV11 = {
      meaning_kinds: ["citation"],
      directions: ["outgoing"],
      origins: ["canonical_record"],
    };
    expect(filters.meaning_kinds).toEqual(["citation"]);
    const markup = renderToStaticMarkup(
      <FocusedGraphExploration
        entry={entryFixture()}
        definition={definition}
        initialRequest={baseRequestFixture()}
        initialView={view}
        read={() => Promise.reject(new Error("not invoked by static render"))}
      />,
    );

    for (const text of [
      "Explore the exact bounded result",
      "Back",
      "Forward",
      "Home",
      "Reset",
      "Pin",
      "Collapse neighbors",
      "Active selection",
      "Registered recipe",
      "Relationship meaning",
      "Direction",
      "Recorded origin",
      "Finite depth",
      "Views bookmarked in this tab",
      "Bookmark this view",
      "Save exact question to Project",
      "does not yet provide an authenticated command",
      "server-owned ProjectInquiry save command",
      "10-state limit",
      "grant no Project authority",
      "Inspect selected Details",
      "authenticated read retains this task, scope, snapshot, selection",
    ]) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('data-history-count="1"');
    expect(markup).toContain('aria-label="Exploration history"');
    expect(markup).toContain('aria-label="Selected object presentation"');
    expect(markup).toContain('aria-controls="focused-graph-details-region"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain("Prepare correction");
    expect(markup).not.toContain("Start new Work");
  });
});
