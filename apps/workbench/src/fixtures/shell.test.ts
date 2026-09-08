import { describe, expect, it } from "vitest";

import { SELECTED_CLAIM_SHELL_FIXTURE } from "./shell.js";

describe("UX1.1 selected-Claim shell fixture", () => {
  it("maps authoritative objects and labels the missing composite query", () => {
    const mappings = SELECTED_CLAIM_SHELL_FIXTURE.contractMappings;

    expect(mappings.some((mapping) => mapping.status === "mapped")).toBe(true);
    expect(
      mappings.some(
        (mapping) =>
          mapping.status === "provisional" &&
          mapping.source.includes("UX-REQ-001"),
      ),
    ).toBe(true);
    expect(SELECTED_CLAIM_SHELL_FIXTURE.contractRefs).toContain(
      "UX-REQ-001 provisional ProjectShellView",
    );
  });

  it("keeps the main surface evidence-first for this inspection fixture", () => {
    const model = SELECTED_CLAIM_SHELL_FIXTURE.viewModel;

    expect(model.initialView).toBe("evidence");
    expect(model.selectedObject.kind).toBe("claim");
    expect(model.evidenceRows[0]?.object.id).toBe(model.selectedObject.id);
    expect(model.assistant.selectedContext.id).toBe(model.selectedObject.id);
  });

  it("classifies workspace preferences as presentation-only", () => {
    const preferenceMapping =
      SELECTED_CLAIM_SHELL_FIXTURE.contractMappings.find((mapping) =>
        mapping.field.startsWith("theme, panel widths"),
      );

    expect(preferenceMapping?.status).toBe("presentation_only");
    expect(preferenceMapping?.source).toContain(
      "never project or scientific state",
    );
  });

  it("bounds the Details relationship view to mapped provenance objects", () => {
    const relationship =
      SELECTED_CLAIM_SHELL_FIXTURE.viewModel.details.relationshipView;
    const nodeIds = new Set(relationship.nodes.map((node) => node.id));

    expect(relationship.nodes.map((node) => node.kind)).toEqual([
      "work_version",
      "source_span",
      "assertion",
      "claim",
    ]);
    for (const edge of relationship.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
    expect(relationship.textualPaths).toHaveLength(2);
    expect(relationship.textualPaths.join(" ")).toContain("SourceSpan");
    expect(relationship.textualPaths.join(" ")).not.toContain("Hypothesis");
  });

  it("provides a bounded focused graph with inspectable disagreement and provenance", () => {
    const graph = SELECTED_CLAIM_SHELL_FIXTURE.viewModel.focusedGraph;
    const nodeIds = new Set(graph.nodes.map((node) => node.object.id));

    expect(graph.maximumDepth).toBe(2);
    expect(graph.hasNamedZDimension).toBe(false);
    expect(nodeIds.has(graph.homeNodeId)).toBe(true);
    expect(nodeIds.has(graph.selectedNodeId)).toBe(true);
    expect(graph.edges.map((edge) => edge.relation)).toEqual(
      expect.arrayContaining([
        "supports",
        "contradicts",
        "qualifies",
        "asserts",
        "provenance_for",
      ]),
    );
    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it("keeps unimplemented main views visibly unavailable", () => {
    const pending = SELECTED_CLAIM_SHELL_FIXTURE.viewModel.views.filter(
      (view) => view.availability === "module_pending",
    );

    expect(pending.map((view) => view.id)).toEqual([
      "brief",
      "papers",
      "experiments",
    ]);
    for (const view of pending) {
      expect(view.unavailableReason?.length).toBeGreaterThan(0);
    }
  });
});
