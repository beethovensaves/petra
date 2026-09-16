import type { PetraFocusedGraphViewV11 } from "../../src/index.js";

import { focusedGraphFixture } from "./focused-graph-view.js";

export const focusedGraphV11Fixture = (): PetraFocusedGraphViewV11 => {
  const base = focusedGraphFixture();
  const target = base.content.nodes[0]!;
  base.content.scope.limits.maximum_depth = 2;
  base.content.profile.resolved_semantics[3]!.contract.version = "1.1.0";
  return {
    ...base,
    schema_version: "1.1.0",
    content: {
      ...base.content,
      scope: {
        ...base.content.scope,
        directions: ["outgoing"],
      },
      exploration: {
        mode: "named_expansion",
        expansion_key: "expansion:trace-sources:claim-a",
        recipe_semantic_key: "scientific.graph.trace-sources",
        recipe_label: "Trace sources",
        target_ref: structuredClone(target.record_ref),
        target_node_key: target.node_key,
        maximum_depth: 2,
        filters: {
          meaning_kinds: ["support"],
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
          group_key: "group:relationship-meaning:current:support",
          facet: "relationship_meaning",
          label: "Support — Current",
          membership_rule:
            "Exact returned Current relationships with support meaning.",
          count_unit: "relationships",
          layer: "current",
          meaning_kind: "support",
          member_relationship_keys: [
            base.content.relationships[0]!.relationship_key,
          ],
          returned_count: 1,
          total_count: { state: "exact", value: 1 },
          filtered_count: { state: "exact", value: 0 },
          hidden_count: { state: "exact", value: 0 },
          coverage: "complete_for_scope",
          overlap: false,
        },
      ],
    },
  };
};
