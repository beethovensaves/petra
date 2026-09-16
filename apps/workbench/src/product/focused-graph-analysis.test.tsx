import { readFileSync } from "node:fs";

import type {
  PetraFocusedGraphAnalysisView,
  PetraProjectHistoryImpactViewV14,
  PetraFocusedGraphView,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FocusedGraphAnalysisSurface } from "./FocusedGraphAnalysis.js";

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

const graphFixture = (): PetraFocusedGraphView => ({
  schema_name: "petra.focused-graph-view",
  schema_version: "1.0.0",
  project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  content: {
    task: {
      request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      request_hash: hash,
      task_kind: "neighborhood",
      task_semantic_key: "scientific.research-question",
      question: "Which exact records differ?",
      question_hash: hash,
      focus_refs: [record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB")],
      origin: {
        origin_kind: "brief",
        origin_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
      },
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
        destination_keys: [],
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
        action_key: "action:trace-sources",
        action_kind: "expand_recorded",
        semantic_key: "scientific.graph.trace-sources",
        label: "Trace sources",
        consequence: "read_only_expansion",
        target_keys: ["node:claim-a"],
        availability: { state: "available" },
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

const focusedGraphAnalysisFixture = (): PetraFocusedGraphAnalysisView => {
  const before = graphFixture();
  const after = structuredClone(before);
  after.content.task.request_id =
    "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAZ";
  after.content.semantic_layer = "working";
  after.content.scope.included_layers = ["current", "working"];
  after.content.nodes[0]!.layer = "working";
  after.content.nodes[0]!.authority_position = "working_non_authority";
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
            difference_kind: "changed",
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
              member_key: after.content.nodes[0]!.node_key,
              record_ref: structuredClone(after.content.nodes[0]!.record_ref),
              semantic_key: after.content.nodes[0]!.semantic_key,
              label: after.content.nodes[0]!.label,
              layer: after.content.nodes[0]!.layer,
              authority_position: after.content.nodes[0]!.authority_position,
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

const impactSource = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-impact-view-v1-4.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryImpactViewV14;

const impactFixture = (): PetraFocusedGraphAnalysisView => {
  const view = focusedGraphAnalysisFixture();
  const position = structuredClone(view.content.positions[0]);
  position.role = "context";
  const member = position.graph_view.content.nodes[0]!;
  view.content.task.task_kind = "impact";
  view.content.task.question =
    "What recorded dependencies and assessed consequences concern this exact Claim?";
  view.content.task.position_keys = [position.position_key];
  view.content.positions = [position];
  view.content.analysis = {
    analysis_kind: "impact",
    position_key: position.position_key,
    dependency_source: impactSource as unknown as Extract<
      PetraFocusedGraphAnalysisView["content"]["analysis"],
      { analysis_kind: "impact" }
    >["dependency_source"],
    assessed_consequences: {
      state: "supplied",
      items: [
        {
          consequence_key: "consequence:review:claim-a:1",
          source: {
            schema_name: "petra.project-review-view",
            schema_version: "1.3.0",
            review_session_id: "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAW",
            content_hash: `sha256:${"b".repeat(64)}`,
            read_at: "2026-09-15T20:02:00.000Z",
          },
          review_member_id: "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAX",
          source_kind: "review_member",
          summary:
            "The supplied Review member identifies one exact affected Claim relationship.",
          target_refs: [structuredClone(member.record_ref)],
          coverage: "exact_requested_review_member",
          limitations: [
            "This supplied consequence is not inferred from graph topology.",
          ],
        },
      ],
      coverage: "exact_requested_review_members",
      limitations: ["Only the exact requested Review member is represented."],
    },
    coverage: "complete",
    limitations: [
      "Recorded dependencies and assessed consequences remain separate facts.",
    ],
  };
  return view;
};

const timeFixture = (): PetraFocusedGraphAnalysisView => {
  const view = focusedGraphAnalysisFixture();
  const position = structuredClone(view.content.positions[0]);
  position.role = "time_position";
  const member = position.graph_view.content.nodes[0]!;
  view.content.task.task_kind = "time";
  view.content.task.question =
    "What publication-time facts are supplied for this exact position?";
  view.content.task.position_keys = [position.position_key];
  view.content.positions = [position];
  view.content.analysis = {
    analysis_kind: "time",
    position_key: position.position_key,
    temporal_dimension: "publication_time",
    position_date: {
      state: "unknown",
      reason: "The selected Project snapshot supplies no publication date.",
    },
    entries: [
      {
        position: 1,
        member: {
          state: "exact",
          member_kind: "node",
          member_key: member.node_key,
          record_ref: structuredClone(member.record_ref),
          semantic_key: member.semantic_key,
          label: member.label,
          layer: member.layer,
          authority_position: member.authority_position,
        },
        date: {
          state: "unknown",
          reason: "The exact Claim record supplies no publication date.",
        },
        date_basis: "focused_graph_member_fact",
        limitations: [
          "Unknown dates are not replaced by read time or layout order.",
        ],
      },
    ],
    ordering_rationale:
      "Unknown dates use stable member-key order; this ordering is not chronology.",
    coverage: "complete_for_scope",
    limitations: ["The position and member dates remain separate facts."],
  };
  return view;
};

describe("focused graph dedicated comparison, impact, and time views", () => {
  it("presents exact server differences with profile terms and graph/text parity", () => {
    const view = focusedGraphAnalysisFixture();
    const graph = renderToStaticMarkup(
      <FocusedGraphAnalysisSurface view={view} />,
    );
    const text = renderToStaticMarkup(
      <FocusedGraphAnalysisSurface view={view} initialRepresentation="text" />,
    );

    for (const markup of [graph, text]) {
      expect(markup).toContain("Exact comparison");
      expect(markup).toContain("Supplied differences");
      expect(markup).toContain("Claim");
      expect(markup).toContain("changed");
      expect(markup).toContain("position:before");
      expect(markup).toContain("position:after");
      expect(markup).toContain("node:claim-a");
      expect(markup).toContain("renderer calculates no domain fact");
      expect(markup).not.toContain("importance score");
    }
    expect(graph).toContain('data-focused-analysis-peer="graph"');
    expect(graph).toContain('data-focused-peer="graph"');
    expect(text).toContain('data-focused-analysis-peer="text"');
    expect(text).toContain('data-focused-peer="text"');
  });

  it("keeps recorded dependencies separate from supplied Review consequences", () => {
    const markup = renderToStaticMarkup(
      <FocusedGraphAnalysisSurface view={impactFixture()} />,
    );

    expect(markup).toContain("Impact and assessed consequences");
    expect(markup).toContain("Direct event and command dependencies");
    expect(markup).toContain("Semantic-target dependencies");
    expect(markup).toContain("Operational dependencies");
    expect(markup).toContain("Exact dependency records");
    expect(markup).toContain(
      "project_source_lifecycle_receipt_01K4C000000000000000000022",
    );
    expect(markup).toContain("records exact source resulting revision");
    expect(markup).toContain("work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2");
    expect(markup).toContain("destination available");
    expect(markup).toContain("worker_output_manifest_route_not_registered");
    expect(markup).toContain(
      "The supplied Review member identifies one exact affected Claim relationship.",
    );
    expect(markup).toContain(
      "Recorded dependencies and assessed consequences remain separate facts.",
    );
    expect(markup).toContain("repeatable read");
  });

  it("shows position and member dates as explicit unknowns without inventing chronology", () => {
    const markup = renderToStaticMarkup(
      <FocusedGraphAnalysisSurface view={timeFixture()} />,
    );

    expect(markup).toContain("Time · publication time");
    expect(markup).toContain("Unknown date");
    expect(markup).toContain(
      "The selected Project snapshot supplies no publication date.",
    );
    expect(markup).toContain(
      "The exact Claim record supplies no publication date.",
    );
    expect(markup).toContain("this ordering is not chronology");
    expect(markup).toContain("Claim:");
  });

  it("retains responsive and non-color structure for every task-specific fact", () => {
    const css = readFileSync(
      new URL("./review-graph.css", import.meta.url),
      "utf8",
    );
    expect(css).toContain("focused-graph-analysis__positions");
    expect(css).toContain('data-difference-kind="changed"');
    expect(css).toContain("border-left-style: dotted");
    expect(css).toContain("@media (max-width: 42rem)");
  });
});
