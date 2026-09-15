import { PetraContractRegistry } from "../src/validator.js";
import { describe, expect, it } from "vitest";

import { focusedGraphFixture } from "./fixtures/focused-graph-view.js";

const registry = new PetraContractRegistry();

describe("Focused graph view contract", () => {
  it("accepts exact source-view inputs and renderer-neutral semantic regions", () => {
    const value = focusedGraphFixture();
    expect(() =>
      registry.assertValid("focused-graph-view", "1.0.0", value),
    ).not.toThrow();
    expect(
      value.content.source_views.map((source) => source.schema_name),
    ).toEqual([
      "petra.project-relationship-view",
      "petra.project-relationship-overlay-view",
    ]);
  });

  it.each([
    ["semantic layer", "content.semantic_layer", "future"],
    ["relationship meaning", "content.relationships.0.meaning_kind", "similar"],
    ["action kind", "content.actions.0.action_kind", "run_cypher"],
    ["projection state", "content.projection_position.state", "maybe_current"],
  ])("rejects unknown %s values", (_label, path, replacement) => {
    const value = focusedGraphFixture() as unknown as Record<string, unknown>;
    const parts = path.split(".");
    let target = value;
    for (const part of parts.slice(0, -1))
      target = (
        Array.isArray(target) ? target[Number(part)] : target[part]
      ) as Record<string, unknown>;
    target[parts.at(-1)!] = replacement;
    expect(() =>
      registry.assertValid("focused-graph-view", "1.0.0", value),
    ).toThrow();
  });

  it("rejects renderer geometry and direct mutation authority", () => {
    const geometry = focusedGraphFixture() as unknown as {
      content: { nodes: Array<Record<string, unknown>> };
    };
    geometry.content.nodes[0]!.position = { x: 10, y: 20 };
    expect(() =>
      registry.assertValid("focused-graph-view", "1.0.0", geometry),
    ).toThrow();

    const authority = focusedGraphFixture() as unknown as {
      content: {
        authority_boundary: { actions_issue_domain_mutation: boolean };
      };
    };
    authority.content.authority_boundary.actions_issue_domain_mutation = true;
    expect(() =>
      registry.assertValid("focused-graph-view", "1.0.0", authority),
    ).toThrow();
  });
});
