import type { PetraFocusedGraphAnalysisView } from "../../src/index.js";

import { focusedGraphFixture } from "./focused-graph-view.js";

const hash = `sha256:${"a".repeat(64)}`;

export const focusedGraphAnalysisFixture =
  (): PetraFocusedGraphAnalysisView => {
    const before = focusedGraphFixture();
    const after = focusedGraphFixture();
    const member = before.content.nodes[0]!;
    return {
      schema_name: "petra.focused-graph-analysis-view",
      schema_version: "1.0.0",
      project_id: before.project_id,
      content: {
        task: {
          analysis_request_id:
            "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
          request_hash: hash,
          task_kind: "comparison",
          question: "What differs between these exact positions?",
          question_hash: hash,
          focus_refs: [structuredClone(member.record_ref)],
          position_keys: ["position:before", "position:after"],
        },
        positions: [
          {
            position_key: "position:before",
            label: "Before",
            role: "before",
            graph_view: before,
          },
          {
            position_key: "position:after",
            label: "After",
            role: "after",
            graph_view: after,
          },
        ],
        analysis: {
          analysis_kind: "comparison",
          before_position_key: "position:before",
          after_position_key: "position:after",
          common_base: {
            state: "exact",
            snapshot: structuredClone(before.content.requested_snapshot),
          },
          differences: [
            {
              difference_key: "difference:1:claim-a",
              difference_kind: "unchanged",
              before: {
                state: "exact",
                member_kind: "node",
                member_key: member.node_key,
                record_ref: structuredClone(member.record_ref),
                semantic_key: member.semantic_key,
                label: member.label,
                layer: member.layer,
                authority_position: member.authority_position,
              },
              after: {
                state: "exact",
                member_kind: "node",
                member_key: member.node_key,
                record_ref: structuredClone(member.record_ref),
                semantic_key: member.semantic_key,
                label: member.label,
                layer: member.layer,
                authority_position: member.authority_position,
              },
              basis: "exact_server_comparison_of_returned_record_identity",
              limitations: [],
            },
          ],
          coverage: "complete_for_scope",
          limitations: ["Only exact returned record identities are compared."],
        },
        authority_boundary: {
          postgresql_authoritative: true,
          neo4j_projection_only: true,
          focused_graph_owner_reused: true,
          history_owner_reused: true,
          review_owner_reused_when_bound: true,
          analysis_is_read_only: true,
          renderer_calculates_domain_facts: false,
          universal_scores_calculated: false,
        },
        limitations: ["The result is bounded to two exact graph positions."],
      },
      content_hash: hash,
      read_at: "2026-09-15T20:00:00.000Z",
    };
  };
