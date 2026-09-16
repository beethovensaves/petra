import { readFileSync } from "node:fs";

import type {
  PetraFocusedGraphDetailsView,
  PetraProjectObjectLocationView,
  PetraProjectSourceView,
} from "../src/index.js";
import { PetraContractRegistry } from "../src/validator.js";
import { describe, expect, it } from "vitest";

import { focusedGraphFixture } from "./fixtures/focused-graph-view.js";
import { focusedGraphV11Fixture } from "./fixtures/focused-graph-view-v1-1.js";
import { focusedGraphAnalysisFixture } from "./fixtures/focused-graph-analysis-view.js";

const registry = new PetraContractRegistry();
const accepted = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as Value;

describe("Focused graph view contract", () => {
  it("accepts server-owned comparison facts and rejects renderer-owned scores", () => {
    const value = focusedGraphAnalysisFixture();
    expect(() =>
      registry.assertValid("focused-graph-analysis-view", "1.0.0", value),
    ).not.toThrow();

    const rendererAuthority = focusedGraphAnalysisFixture() as unknown as {
      content: { importance: number };
    };
    rendererAuthority.content.importance = 0.92;
    expect(() =>
      registry.assertValid(
        "focused-graph-analysis-view",
        "1.0.0",
        rendererAuthority,
      ),
    ).toThrow();
  });

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

  it("accepts additive named-expansion accounting and rejects concealed group overlap", () => {
    const value = focusedGraphV11Fixture();
    expect(() =>
      registry.assertValid("focused-graph-view", "1.1.0", value),
    ).not.toThrow();
    expect(value.content.exploration.accounting).toMatchObject({
      result_state: "complete_for_scope",
      restricted_paths: { state: "not_disclosed" },
      unknown_paths: { state: "unknown" },
    });

    const overlap = focusedGraphV11Fixture();
    Reflect.set(overlap.content.groups[0], "overlap", true);
    expect(() =>
      registry.assertValid("focused-graph-view", "1.1.0", overlap),
    ).toThrow();
  });

  it("accepts exact selected Details composed from semantic-location and source owners", () => {
    const graph = focusedGraphFixture();
    const node = structuredClone(graph.content.nodes[0]!);
    const source = accepted<PetraProjectSourceView>("project-source-view");
    const location = accepted<PetraProjectObjectLocationView>(
      "project-object-location-view",
    ).content;
    const spanRef = {
      record_id: source.content.representation.preview!.span_ref.record_id,
      revision: source.content.representation.preview!.span_ref.revision,
      record_hash: source.content.representation.preview!.span_ref.content_hash,
    };
    node.basis.record_refs = [spanRef];
    const memberRef = node.record_ref;
    location.request.object_ref = {
      semantic_key: node.semantic_key,
      object_id: memberRef.record_id,
      revision: memberRef.revision,
    };
    if ("resolved_ref" in location.resolution) {
      location.resolution.requested_ref = structuredClone(
        location.request.object_ref,
      );
      location.resolution.resolved_ref = {
        semantic_key: node.semantic_key,
        object_id: memberRef.record_id,
        revision: memberRef.revision,
        record_hash: memberRef.record_hash,
      };
      location.resolution.current_ref = structuredClone(
        location.resolution.resolved_ref,
      );
      location.resolution.descriptor = {
        semantic_key: node.semantic_key,
        generic_family: "finding",
        label: "Claim",
        summary: node.summary,
        lifecycle_state: "represented",
      };
    }
    const details: PetraFocusedGraphDetailsView = {
      schema_name: "petra.focused-graph-details-view",
      schema_version: "1.0.0",
      project_id: graph.project_id,
      content: {
        details_request_id:
          "focused_graph_details_request_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        graph: {
          schema_name: graph.schema_name,
          schema_version: graph.schema_version,
          content_hash: graph.content_hash,
          task: graph.content.task,
          profile: graph.content.profile,
          requested_snapshot: graph.content.requested_snapshot,
          represented_snapshot: graph.content.represented_snapshot,
          semantic_layer: graph.content.semantic_layer,
          temporal_position: graph.content.temporal_position,
          projection_position: graph.content.projection_position,
          scope: graph.content.scope,
          return_destination: graph.content.destinations[0],
        },
        selection: {
          selection_kind: "node",
          selected_keys: [node.node_key],
        },
        nodes: [
          {
            member_kind: "node",
            member_key: node.node_key,
            member: node,
            semantic_location: location,
            source_inspections: [
              {
                state: "available",
                owner: "project_source_view",
                source_span_ref: spanRef,
                project_source_id: source.project_source_id,
                binding_revision: source.content.binding.revision,
                binding_content_hash: source.content.binding.content_hash,
                source_view_content_hash: source.content_hash,
                source_view: source.content,
              },
            ],
          },
        ],
        relationships: [],
        paths: [],
        limitations: ["Exact Details remain read-only."],
        authority_boundary: {
          postgresql_authoritative: true,
          neo4j_projection_only: true,
          selection_is_presentation_state: true,
          details_are_read_only: true,
          source_owner: "project_source_view",
          semantic_location_owner: "project_object_location_view",
          graph_specific_registry_added: false,
        },
      },
      content_hash: `sha256:${"b".repeat(64)}`,
      read_at: graph.read_at,
    };
    expect(() =>
      registry.assertValid("focused-graph-details-view", "1.0.0", details),
    ).not.toThrow();

    const rendererOwned = structuredClone(details) as unknown as {
      content: { nodes: Array<{ position?: unknown }> };
    };
    rendererOwned.content.nodes[0]!.position = { x: 1, y: 2 };
    expect(() =>
      registry.assertValid(
        "focused-graph-details-view",
        "1.0.0",
        rendererOwned,
      ),
    ).toThrow();
  });
});
