import { readFileSync } from "node:fs";

import type { FocusedGraphNode } from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import type { FocusedGraphRegions } from "./focused-graph-regions.js";
import {
  FocusedGraphComparison,
  FocusedGraphPositionNavigation,
} from "./FocusedGraphPositions.js";

const hash = `sha256:${"a".repeat(64)}`;
const snapshot = {
  snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAD",
  revision: 1,
  event_position: 12,
  content_hash: hash,
};

const regionsFor = (layer: "current" | "working"): FocusedGraphRegions => {
  const node: FocusedGraphNode = {
    node_key: "node:claim-a",
    record_ref: {
      record_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAB",
      revision: 1,
      record_hash: hash,
    },
    semantic_key: "scientific.claim",
    term: {
      semantic_key: "scientific.claim",
      singular: "Claim",
      plural: "Claims",
      definition: "A registered scientific Claim.",
      generic_family: "finding",
    },
    label: layer === "current" ? "Accepted claim" : "Candidate claim",
    summary: `${layer} exact member supplied by the server.`,
    layer,
    authority_position:
      layer === "current" ? "current_authority" : "working_non_authority",
    lifecycle: "represented",
    basis: {
      summary: "Exact profile-valid basis.",
      record_refs: [],
      limitations: ["One bounded position only."],
    },
    destination_keys: [],
  };
  const scope = {
    description: `${layer} bounded one-hop scope.`,
    included_relationship_semantics: ["scientific.assertion"],
    directions: ["outgoing"],
    included_layers: [layer],
    limits: {
      maximum_depth: 1,
      maximum_nodes: 25,
      maximum_relationships: 24,
      maximum_paths: 24,
    },
    coverage: "complete_for_scope",
    omissions: [
      {
        omission_kind: "out_of_scope",
        description: "Other semantic layers remain outside this exact read.",
        count: { state: "unknown" },
      },
    ],
  } as const;
  const selection = {
    state: "selected",
    selection_kind: "node",
    selected_keys: [node.node_key],
  } as const;
  const task = {
    request_id: `focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5F${layer === "current" ? "AA" : "AB"}`,
    request_hash: hash,
    task_kind: "neighborhood",
    task_semantic_key: "scientific.research-question",
    question: "Which recorded relationships concern this Claim?",
    question_hash: hash,
    focus_refs: [node.record_ref],
    origin: {
      origin_kind: "brief",
      origin_ref: node.record_ref,
    },
    return_destination_key: "destination:brief",
  } as const;
  const profile = {
    project_definition_ref: {
      project_definition_id: "project_definition_01K4C000000000000000000001",
      revision: 2,
      content_hash: hash,
      record_hash: hash,
      definition_family: "petra.scientific-evidence",
    },
  };
  const projection = {
    authority_source: "postgresql",
    projection_source: "neo4j_rebuildable_projection",
    state: layer === "current" ? "current" : "catching_up",
    represented_event_position: 12,
    observed_event_position: layer === "current" ? 12 : 13,
    pending_records: layer === "current" ? 0 : 1,
    detail:
      layer === "current"
        ? "The graph projection represents Current."
        : "Working changes remain non-authoritative while the projection catches up.",
  } as const;
  const limitations = [
    "This exact position supplies no renderer-owned difference fact.",
  ];
  return {
    contract: {
      schemaName: "petra.focused-graph-view",
      schemaVersion: "1.0.0",
      projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      contentHash: hash,
      readAt: "2026-09-15T20:00:00.000Z",
    },
    orientation: {
      task,
      profile,
      requestedSnapshot: snapshot,
      representedSnapshot: snapshot,
      semanticLayer: layer,
      temporalPosition: {
        position_kind: "current",
        dimension: "project_snapshot",
      },
      projectionPosition: projection,
    },
    authority: {
      semanticLayer: layer,
      requestedSnapshot: snapshot,
      representedSnapshot: snapshot,
      temporalPosition: {
        position_kind: "current",
        dimension: "project_snapshot",
      },
      projectionPosition: projection,
      boundary: {},
    },
    graph: {
      scope,
      nodes: [node],
      relationships: [],
      paths: [],
      resolvedPaths: [],
      selection,
      limitations,
    },
    textualPeer: {
      scope,
      nodes: [node],
      relationships: [],
      paths: [],
      resolvedPaths: [],
      selection,
      destinations: [],
      actions: [],
      limitations,
    },
    evidenceMatrix: {
      rows: [],
      omissions: scope.omissions,
      coverage: scope.coverage,
      limitations,
    },
    details: {
      selection,
      selectedMembers: [{ selectionKind: "node", member: node }],
      nodeTargets: new Map(),
      relationshipTargets: new Map(),
    },
    origin: task.origin,
    returnRegion: {},
    destinations: new Map(),
    actions: [],
  } as unknown as FocusedGraphRegions;
};

describe("focused graph layer and comparison presentation", () => {
  it("presents Current, Working changes, bounded Historical availability, and Return to current as route reads", () => {
    const current = renderToStaticMarkup(
      <MemoryRouter>
        <FocusedGraphPositionNavigation
          activeLayer="current"
          comparisonActive={false}
          paths={{
            current: "/graph?layer=current",
            working: "/graph?layer=working",
            comparison: "/graph?presentation=comparison",
          }}
        />
      </MemoryRouter>,
    );
    const historical = renderToStaticMarkup(
      <MemoryRouter>
        <FocusedGraphPositionNavigation
          activeLayer="historical"
          comparisonActive={false}
          paths={{
            current: "/graph?layer=current",
            working: "/graph?layer=working",
            historical: "/graph?layer=historical",
            comparison: "/graph?presentation=comparison",
          }}
        />
      </MemoryRouter>,
    );

    expect(current).toContain("Current");
    expect(current).toContain("Working changes");
    expect(current).toContain("Historical");
    expect(current).toContain('aria-disabled="true"');
    expect(current).toContain("Compare Current / Working changes");
    expect(historical).toContain("Return to current");
    expect(historical).toContain('aria-current="page"');
  });

  it("renders separate compatible server positions without inventing a difference", () => {
    const markup = renderToStaticMarkup(
      <FocusedGraphComparison
        before={regionsFor("current")}
        after={regionsFor("working")}
      />,
    );
    const css = readFileSync(
      new URL("./review-graph.css", import.meta.url),
      "utf8",
    );

    expect(markup).toContain("Before · Current");
    expect(markup).toContain("After · Working changes");
    expect(markup).toContain("current authority");
    expect(markup).toContain("working non authority");
    expect(markup).toContain("catching up");
    expect(markup).toContain("node:claim-a");
    expect(markup).toContain("renderer geometry supplies no authority");
    expect(markup).toContain("No added, removed, changed, unchanged");
    expect(markup).toContain("focused-graph-before-result-title");
    expect(markup).toContain("focused-graph-after-result-title");
    expect(css).toContain("focused-graph-comparison__positions");
    expect(css).toContain('data-layer="working"');
  });

  it("fails closed when the positions differ in task, snapshot, or layer", () => {
    const current = regionsFor("current");
    expect(() =>
      renderToStaticMarkup(
        <FocusedGraphComparison before={current} after={current} />,
      ),
    ).toThrow(/exact compatible Current and Working changes/u);
  });
});
