import { readFileSync } from "node:fs";

import type {
  FocusedGraphNode,
  FocusedGraphPath,
  FocusedGraphRegisteredAction,
  FocusedGraphRelationship,
  FocusedGraphSemanticDestination,
  FocusedGraphTerm,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FocusedGraphResult } from "./FocusedGraphResult.js";
import type {
  FocusedGraphEvidenceRow,
  FocusedGraphRegions,
  FocusedGraphResolvedPath,
} from "./focused-graph-regions.js";

const hash = `sha256:${"a".repeat(64)}`;
const exactRef = (record_id: string) => ({
  record_id,
  revision: 1,
  record_hash: hash,
});
const term = (
  semantic_key: string,
  generic_family: FocusedGraphTerm["generic_family"],
  singular: string,
): FocusedGraphTerm => ({
  semantic_key,
  singular,
  plural: `${singular}s`,
  definition: `${singular} resolved by the active profile.`,
  generic_family,
});

const resultRegions = (): FocusedGraphRegions => {
  const objectTerm = term("controlled-writing.requirement", "finding", "Rule");
  const relationshipTerm = term(
    "controlled-writing.recorded-link",
    "relationship",
    "Profile-owned recorded link",
  );
  const source: FocusedGraphNode = {
    node_key: "node:rule-a",
    record_ref: exactRef("requirement_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
    semantic_key: objectTerm.semantic_key,
    term: objectTerm,
    label: "Rule A",
    summary: "The selected governing rule.",
    layer: "current",
    authority_position: "current_authority",
    lifecycle: "represented",
    basis: {
      summary: "Accepted rule record.",
      record_refs: [],
      limitations: [],
    },
    destination_keys: ["destination:details"],
  };
  const target: FocusedGraphNode = {
    node_key: "node:rule-b",
    record_ref: exactRef("requirement_01ARZ3NDEKTSV4RRFFQ69G5FAC"),
    semantic_key: objectTerm.semantic_key,
    term: objectTerm,
    label: "Rule B",
    summary: "The bounded related rule.",
    layer: "current",
    authority_position: "current_authority",
    lifecycle: "represented",
    basis: {
      summary: "Accepted rule record without an exact source location.",
      record_refs: [],
      limitations: ["No direct source location is attached."],
    },
    destination_keys: ["destination:source-unavailable"],
  };
  const meanings = [
    ["CITES", "citation"],
    ["SUPPORTS", "support"],
    ["CONTRADICTS", "contradiction"],
    ["QUALIFIES", "qualification"],
    ["ADOPTS", "inference"],
  ] as const;
  const relationships: FocusedGraphRelationship[] = meanings.map(
    ([predicate, meaning_kind], index) => ({
      relationship_key: `relationship:recorded-${index + 1}`,
      relationship_ref: {
        element_id: `assertion_01ARZ3NDEKTSV4RRFFQ69G5F${String(index + 1).padStart(2, "0")}`,
        revision: 2,
        record_hash: hash,
      },
      semantic_key: relationshipTerm.semantic_key,
      term: relationshipTerm,
      predicate,
      meaning_kind,
      source_node_key: source.node_key,
      target_node_key: target.node_key,
      direction: "outgoing",
      origin:
        meaning_kind === "inference" ? "model_inference" : "canonical_record",
      layer: "current",
      authority_position: "current_authority",
      summary: `${predicate} remains a distinct registered meaning.`,
      basis: {
        summary: `Exact ${predicate} basis with human-accepted validation state.`,
        record_refs: [exactRef("source_span_01ARZ3NDEKTSV4RRFFQ69G5FAD")],
        limitations: [`${predicate} applies only to the represented scope.`],
      },
      destination_keys:
        index === 0
          ? ["destination:source"]
          : index === 1
            ? ["destination:source-unavailable"]
            : [],
    }),
  );
  const paths: FocusedGraphPath[] = relationships.map(
    (relationship, index) => ({
      path_key: `path:recorded-${index + 1}`,
      state: "complete",
      ordering_rationale: `Recorded endpoint order for ${relationship.predicate}; not a strength ranking.`,
      steps: [
        {
          position: 1,
          from_node_key: source.node_key,
          relationship_key: relationship.relationship_key,
          to_node_key: target.node_key,
          traversal_direction: "outgoing",
          repeated_member: false,
        },
      ],
      limitations: ["One bounded step is represented."],
    }),
  );
  const destinations: FocusedGraphSemanticDestination[] = [
    {
      destination_key: "destination:return",
      destination_kind: "evidence",
      state: "available",
      owner: "project_relationship_view",
      label: "Return to exact evidence",
      target_ref: source.record_ref,
    },
    {
      destination_key: "destination:details",
      destination_kind: "details",
      state: "available",
      owner: "project_object_location_view",
      label: "Inspect exact rule",
      target_ref: source.record_ref,
    },
    {
      destination_key: "destination:source",
      destination_kind: "source_inspection",
      state: "available",
      owner: "project_source_view",
      label: "Open exact source passage",
      target_ref: exactRef("source_span_01ARZ3NDEKTSV4RRFFQ69G5FAD"),
    },
    {
      destination_key: "destination:source-unavailable",
      destination_kind: "source_inspection",
      state: "unavailable",
      owner: "project_source_view",
      label: "Exact source unavailable",
      reason: "No direct SourceSpan location is recorded for this endpoint.",
    },
  ];
  const actions: FocusedGraphRegisteredAction[] = [
    {
      action_key: "action:return",
      action_kind: "return_to_origin",
      semantic_key: "controlled-writing.graph.return",
      label: "Return to exact evidence",
      consequence: "read_only_navigation",
      target_keys: [source.node_key],
      availability: {
        state: "available",
        destination_key: "destination:return",
      },
    },
    {
      action_key: "action:inspect-path",
      action_kind: "inspect_path",
      semantic_key: "controlled-writing.graph.inspect-path",
      label: "Inspect recorded path",
      consequence: "read_only_navigation",
      target_keys: [paths[0]!.path_key],
      availability: { state: "available" },
    },
  ];
  const resolvedPaths: FocusedGraphResolvedPath[] = paths.map(
    (path, index) => ({
      path,
      steps: [
        {
          step: path.steps[0]!,
          source,
          relationship: relationships[index]!,
          target,
        },
      ],
    }),
  );
  const destinationMap = new Map(
    destinations.map((destination) => [
      destination.destination_key,
      destination,
    ]),
  );
  const rows: FocusedGraphEvidenceRow[] = relationships.map(
    (relationship, index) => ({
      relationship,
      source,
      target,
      paths: [paths[index]!],
      destinations: relationship.destination_keys.map((key) =>
        destinationMap.get(key)!,
      ),
      actions: [],
    }),
  );
  const scope = {
    description: "Five distinct registered meanings in one bounded result.",
    included_relationship_semantics: [relationshipTerm.semantic_key],
    directions: ["outgoing"],
    included_layers: ["current"],
    limits: {
      maximum_depth: 1,
      maximum_nodes: 2,
      maximum_relationships: 5,
      maximum_paths: 5,
    },
    coverage: "complete_for_scope",
    omissions: [
      {
        omission_kind: "out_of_scope",
        description: "Unrequested relationship families remain out of scope.",
        count: { state: "unknown" },
      },
    ],
  } as const;
  const selection = {
    state: "selected",
    selection_kind: "path",
    selected_keys: [paths[0]!.path_key],
  } as const;
  const limitations = [
    "The result supplies semantic membership and no renderer authority.",
  ];

  return {
    graph: {
      scope,
      nodes: [source, target],
      relationships,
      paths,
      resolvedPaths,
      selection,
      limitations,
    },
    textualPeer: {
      scope,
      nodes: [source, target],
      relationships,
      paths,
      resolvedPaths,
      selection,
      destinations,
      actions,
      limitations,
    },
    evidenceMatrix: {
      rows,
      omissions: scope.omissions,
      coverage: scope.coverage,
      limitations,
    },
    destinations: destinationMap,
    actions,
  } as unknown as FocusedGraphRegions;
};

describe("focused graph relation semantics and textual parity", () => {
  it("renders every material relationship fact, source state, destination, and action in both peers", () => {
    const regions = resultRegions();
    const graph = renderToStaticMarkup(
      <FocusedGraphResult regions={regions} />,
    );
    const text = renderToStaticMarkup(
      <FocusedGraphResult regions={regions} initialRepresentation="text" />,
    );
    const sharedFacts = [
      "Profile-owned recorded link",
      "citation",
      "support",
      "contradiction",
      "qualification",
      "inference",
      "outgoing",
      "canonical record",
      "model inference",
      "current authority",
      "Exact CITES basis with human-accepted validation state.",
      "source_span_01ARZ3NDEKTSV4RRFFQ69G5FAD",
      "Open exact source passage",
      "Exact source unavailable",
      "No direct SourceSpan location is recorded for this endpoint.",
      "CITES applies only to the represented scope.",
      "Recorded endpoint order for CITES; not a strength ranking.",
      "Return to exact evidence",
      "Inspect recorded path",
      "Unrequested relationship families remain out of scope.",
    ];

    for (const fact of sharedFacts) {
      expect(graph).toContain(fact);
      expect(text).toContain(fact);
    }
    expect(graph).toContain('data-focused-peer="graph"');
    expect(graph).toContain('data-renderer="cytoscape"');
    expect(text).toContain('data-focused-peer="text"');
    expect(graph).toContain("selected path");
    expect(text).toContain("selected path");
    expect(text).toContain("Relationship evidence matrix");
    expect(text).toContain("Step 1");
    expect(graph).not.toContain("scientific support");
  });

  it("exposes redundant non-color relationship and selection treatments", () => {
    const markup = renderToStaticMarkup(
      <FocusedGraphResult regions={resultRegions()} />,
    );
    const css = readFileSync(
      new URL("./review-graph.css", import.meta.url),
      "utf8",
    );

    expect(markup).toContain(
      "Labels, direction words, symbols, and line patterns",
    );
    expect(markup).toContain('data-meaning="citation"');
    expect(markup).toContain('data-meaning="contradiction"');
    expect(markup).toContain('data-meaning="qualification"');
    expect(markup).toContain('aria-pressed="true"');
    expect(css).toContain('[data-meaning="citation"]');
    expect(css).toContain("border-left-style: dashed");
    expect(css).toContain("border-left-style: dotted");
    expect(css).toContain("@media (forced-colors: active)");
  });
});
