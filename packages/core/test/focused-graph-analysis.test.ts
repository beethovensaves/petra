import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraFocusedGraphView,
  PetraProjectHistoryImpactViewV14,
  PetraProjectReviewViewRecord,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import { focusedGraphFixture } from "../../contracts/test/fixtures/focused-graph-view.js";
import {
  FocusedGraphAnalysisQueryError,
  FocusedGraphAnalysisViewComposer,
  parseFocusedGraphAnalysisViewRequest,
  type FocusedGraphComparisonViewRequest,
  type FocusedGraphImpactViewRequest,
  type FocusedGraphTimeViewRequest,
} from "../src/focused-graph-analysis.js";
import type {
  FocusedGraphViewReader,
  FocusedGraphViewRequest,
} from "../src/focused-graph-view.js";
import type { ProjectHistoryViewReader } from "../src/project-history-view.js";
import type { ProjectReviewViewReader } from "../src/review-session.js";

const digest = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const accepted = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const sealGraph = (view: PetraFocusedGraphView): PetraFocusedGraphView => {
  view.content.task.question_hash = digest(view.content.task.question);
  const task = structuredClone(view.content.task) as Partial<
    typeof view.content.task
  >;
  delete task.request_hash;
  view.content.task.request_hash = digest(task);
  view.content_hash = digest(view.content);
  return view;
};

const graph = (
  requestId: string,
  layer: "current" | "working" | "historical" = "current",
): PetraFocusedGraphView => {
  const value = focusedGraphFixture();
  value.content.task.request_id = requestId;
  value.content.task.task_kind = "neighborhood";
  value.content.task.question = "Which exact records differ?";
  value.content.semantic_layer = layer;
  if (layer === "historical") {
    value.content.temporal_position = {
      position_kind: "historical",
      dimension: "recorded_time",
      at: { state: "exact", value: "2026-09-14T20:00:00.000Z" },
    };
    value.content.scope.included_layers = ["historical"];
    value.content.nodes.forEach((node) => {
      node.layer = "historical";
      node.authority_position = "historical_authority";
    });
    value.content.relationships.forEach((relationship) => {
      relationship.layer = "historical";
      relationship.authority_position = "historical_authority";
      relationship.origin = "historical_record";
    });
    value.content.projection_position = {
      authority_source: "postgresql",
      projection_source: "neo4j_rebuildable_projection",
      state: "unavailable",
      represented_event_position:
        value.content.represented_snapshot.event_position,
      observed_event_position: 12,
      pending_records: 0,
      detail: "Historical membership is reconstructed from PostgreSQL.",
    };
  } else {
    value.content.temporal_position = {
      position_kind: "current",
      dimension: "project_snapshot",
    };
    value.content.scope.included_layers =
      layer === "working" ? ["current", "working"] : ["current"];
  }
  return sealGraph(value);
};

const requestFor = (view: PetraFocusedGraphView): FocusedGraphViewRequest => {
  let temporalPosition: FocusedGraphViewRequest["temporal_position"];
  if (view.content.semantic_layer === "historical") {
    const supplied = view.content.temporal_position;
    if (
      supplied.position_kind !== "historical" ||
      supplied.dimension !== "recorded_time" ||
      supplied.at.state !== "exact"
    ) {
      throw new Error(
        "The historical test graph lost its exact recorded time.",
      );
    }
    temporalPosition = {
      position_kind: "historical",
      dimension: "recorded_time",
      at: { state: "exact", value: supplied.at.value },
    };
  } else {
    temporalPosition = {
      position_kind: "current",
      dimension: "project_snapshot",
    };
  }
  return {
    request_id: view.content.task.request_id,
    task_kind: "neighborhood",
    task_semantic_key: view.content.task.task_semantic_key,
    question: view.content.task.question,
    focus_ref: structuredClone(view.content.task.focus_refs[0]),
    origin: structuredClone(view.content.task.origin),
    project_definition_ref: structuredClone(
      view.content.profile.project_definition_ref,
    ),
    semantic_layer: view.content.semantic_layer,
    temporal_position: temporalPosition,
    object_semantic_key: view.content.nodes[0]!.semantic_key,
    relationship_semantic_key:
      view.content.scope.included_relationship_semantics[0],
    return_action_semantic_key: view.content.actions[0].semantic_key,
    return_destination: structuredClone(
      view.content.destinations.find(
        (destination) =>
          destination.destination_key ===
          view.content.task.return_destination_key,
      )!,
    ),
    limits: structuredClone(view.content.scope.limits),
    expected_snapshot: structuredClone(view.content.requested_snapshot),
  };
};

const readers = (
  values: ReadonlyMap<string, PetraFocusedGraphView>,
  impact?: PetraProjectHistoryImpactViewV14,
  review?: PetraProjectReviewViewRecord,
): {
  graphs: FocusedGraphViewReader;
  history: ProjectHistoryViewReader;
  reviews: ProjectReviewViewReader;
} => ({
  graphs: {
    queryFocusedGraph: vi.fn<FocusedGraphViewReader["queryFocusedGraph"]>(
      (_projectId, request) =>
        Promise.resolve(structuredClone(values.get(request.request_id))),
    ),
  },
  history: {
    getProjectHistoryImpactView: vi.fn(() =>
      Promise.resolve(structuredClone(impact)),
    ),
  } as unknown as ProjectHistoryViewReader,
  reviews: {
    getProjectReviewView: vi.fn(() => Promise.resolve(structuredClone(review))),
  } as unknown as ProjectReviewViewReader,
});

const analysisId = "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY";

describe("focused graph comparison, impact, and time composition", () => {
  it("parses only exact snapshot-bound task requests and rejects renderer state", () => {
    const before = graph("focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA");
    const after = graph(
      "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAB",
      "working",
    );
    const request: FocusedGraphComparisonViewRequest = {
      analysis_request_id: analysisId,
      task_kind: "comparison",
      question: "What differs?",
      before: {
        position_key: "position:current",
        label: "Current",
        graph_request: requestFor(before),
      },
      after: {
        position_key: "position:working",
        label: "Working changes",
        graph_request: requestFor(after),
      },
    };
    expect(parseFocusedGraphAnalysisViewRequest(request)).toEqual(request);

    const geometry = structuredClone(request) as unknown as Record<
      string,
      unknown
    >;
    geometry.layout = "force";
    expect(() => parseFocusedGraphAnalysisViewRequest(geometry)).toThrowError(
      FocusedGraphAnalysisQueryError,
    );

    const unbound = structuredClone(request);
    delete (unbound.before.graph_request as { expected_snapshot?: unknown })
      .expected_snapshot;
    expect(() => parseFocusedGraphAnalysisViewRequest(unbound)).toThrowError(
      /exact requested Project snapshot/u,
    );
  });

  it("supplies exact server differences without treating incomplete absence as removal", async () => {
    const before = graph("focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA");
    const after = graph(
      "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAB",
      "working",
    );
    after.content.nodes[1]!.record_ref.revision = 2;
    after.content.nodes[1]!.record_ref.record_hash = `sha256:${"b".repeat(64)}`;
    sealGraph(after);
    const source = readers(
      new Map([
        [before.content.task.request_id, before],
        [after.content.task.request_id, after],
      ]),
    );
    const composer = new FocusedGraphAnalysisViewComposer(
      source.graphs,
      source.history,
      source.reviews,
    );
    const request: FocusedGraphComparisonViewRequest = {
      analysis_request_id: analysisId,
      task_kind: "comparison",
      question: "What differs between Current and Working changes?",
      before: {
        position_key: "position:current",
        label: "Current",
        graph_request: requestFor(before),
      },
      after: {
        position_key: "position:working",
        label: "Working changes",
        graph_request: requestFor(after),
      },
    };
    const result = await composer.queryFocusedGraphAnalysis(
      before.project_id,
      request,
    );
    expect(result?.content.analysis).toMatchObject({
      analysis_kind: "comparison",
      common_base: { state: "exact" },
      coverage: "complete_for_scope",
    });
    if (result?.content.analysis.analysis_kind !== "comparison")
      throw new Error("Expected a comparison analysis.");
    expect(
      result.content.analysis.differences.map(
        (difference) => difference.difference_kind,
      ),
    ).toContain("changed");
    expect(result.content.authority_boundary).toMatchObject({
      renderer_calculates_domain_facts: false,
      universal_scores_calculated: false,
    });

    after.content.scope.coverage = "partial";
    after.content.nodes.pop();
    sealGraph(after);
    const partial = await composer.queryFocusedGraphAnalysis(
      before.project_id,
      request,
    );
    if (partial?.content.analysis.analysis_kind !== "comparison")
      throw new Error("Expected a partial comparison analysis.");
    expect(
      partial.content.analysis.differences.find(
        (difference) => difference.after.state === "unavailable",
      ),
    ).toMatchObject({ difference_kind: "unavailable" });
  });

  it("keeps History dependencies separate from explicitly bound Review consequences", async () => {
    const view = graph("focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA");
    const focus = view.content.task.focus_refs[0];
    const impact = accepted<PetraProjectHistoryImpactViewV14>(
      "project-history-impact-view-v1-4",
    );
    impact.project_id = view.project_id;
    impact.event_id = "event_01ARZ3NDEKTSV4RRFFQ69G5FAZ";
    impact.content.selected_event.event_ref.event_id = impact.event_id;
    impact.content.selected_event.targets[0] = {
      role: "primary",
      semantic_key: view.content.nodes[0]!.semantic_key,
      object_id: focus.record_id,
      revision: focus.revision,
    };
    const targetAssessment =
      impact.content.semantic_target_impact.target_assessments[0];
    if (targetAssessment?.adapter_state !== "registered") {
      throw new Error("Expected a registered semantic target assessment.");
    }
    targetAssessment.target_ref = structuredClone(
      impact.content.selected_event.targets[0],
    );
    targetAssessment.resolved_target_ref = {
      semantic_key: "scientific.claim",
      object_id: focus.record_id,
      revision: focus.revision,
      schema_name: "petra.claim",
      schema_version: "1.0.0",
      record_hash: focus.record_hash,
    };
    const memberId = "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAX";
    const review = {
      schema_name: "petra.project-review-view",
      schema_version: "1.3.0",
      project_id: view.project_id,
      review_session_id: "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      content: {
        members: [
          {
            review_member_id: memberId,
            candidate: {
              profile_payload: {
                payload_kind: "scientific_evidence_pair",
                claim_ref: structuredClone(focus),
                assertion_ref: structuredClone(
                  view.content.relationships[0]!.relationship_ref,
                ),
              },
            },
            consequences: [
              "The exact candidate would change the selected Claim relationship.",
            ],
            change_sets: [
              {
                impact_summary:
                  "The exact ChangeSet affects only the bound Claim and Assertion.",
              },
            ],
          },
        ],
      },
      content_hash: `sha256:${"c".repeat(64)}`,
      read_at: "2026-09-15T20:02:00.000Z",
    } as unknown as PetraProjectReviewViewRecord;
    const source = readers(
      new Map([[view.content.task.request_id, view]]),
      impact,
      review,
    );
    const composer = new FocusedGraphAnalysisViewComposer(
      source.graphs,
      source.history,
      source.reviews,
    );
    const request: FocusedGraphImpactViewRequest = {
      analysis_request_id: analysisId,
      task_kind: "impact",
      question: "What depends on this exact Claim and what was assessed?",
      position: {
        position_key: "position:current",
        label: "Current",
        graph_request: requestFor(view),
      },
      history_event_id: impact.event_id,
      review_binding: {
        review_session_id: review.review_session_id,
        review_member_ids: [memberId],
      },
    };
    const result = await composer.queryFocusedGraphAnalysis(
      view.project_id,
      request,
    );
    if (result?.content.analysis.analysis_kind !== "impact")
      throw new Error("Expected an impact analysis.");
    expect(result.content.analysis.dependency_source.event_id).toBe(
      impact.event_id,
    );
    expect(result.content.analysis.assessed_consequences).toMatchObject({
      state: "supplied",
      coverage: "exact_requested_review_members",
    });
    if (result.content.analysis.assessed_consequences.state !== "supplied")
      throw new Error("Expected supplied Review consequences.");
    expect(
      result.content.analysis.assessed_consequences.items.map(
        (item) => item.source_kind,
      ),
    ).toEqual(["review_member", "change_set_impact"]);
    expect(result.content.analysis.limitations.join(" ")).toContain(
      "never inferred from graph topology",
    );

    targetAssessment.resolved_target_ref.record_hash = `sha256:${"d".repeat(64)}`;
    await expect(
      composer.queryFocusedGraphAnalysis(view.project_id, request),
    ).rejects.toMatchObject({
      code: "FOCUSED_GRAPH_ANALYSIS_SOURCE_INCOMPATIBLE",
    });
  });

  it("returns an exact historical position date and explicit unknown member dates", async () => {
    const view = graph(
      "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
      "historical",
    );
    const source = readers(new Map([[view.content.task.request_id, view]]));
    const composer = new FocusedGraphAnalysisViewComposer(
      source.graphs,
      source.history,
      source.reviews,
    );
    const request: FocusedGraphTimeViewRequest = {
      analysis_request_id: analysisId,
      task_kind: "time",
      question: "What was recorded at the selected retained position?",
      position: {
        position_key: "position:historical",
        label: "Historical",
        graph_request: requestFor(view),
      },
      temporal_dimension: "recorded_time",
    };
    const result = await composer.queryFocusedGraphAnalysis(
      view.project_id,
      request,
    );
    if (result?.content.analysis.analysis_kind !== "time")
      throw new Error("Expected a time analysis.");
    expect(result.content.analysis.position_date).toEqual({
      state: "exact_timestamp",
      value: "2026-09-14T20:00:00.000Z",
    });
    expect(
      result.content.analysis.entries.every(
        (entry) => entry.date.state === "unknown",
      ),
    ).toBe(true);
    expect(result.content.analysis.ordering_rationale).toContain(
      "not chronology",
    );
  });
});
