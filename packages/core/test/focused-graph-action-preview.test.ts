import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraFocusedGraphView,
  PetraProjectReviewView,
  PetraProjectReviewViewV120,
  PetraReviewSessionV110,
  PetraSuggestedActionViewV11,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import { focusedGraphFixture } from "../../contracts/test/fixtures/focused-graph-view.js";
import {
  FocusedGraphActionPreviewQueryError,
  FocusedGraphActionPreviewViewComposer,
  parseFocusedGraphActionPreviewViewRequest,
  type FocusedGraphActionPreviewViewRequest,
  type FocusedGraphCorrectionKind,
} from "../src/focused-graph-action-preview.js";
import type {
  FocusedGraphViewReader,
  FocusedGraphViewRequest,
} from "../src/focused-graph-view.js";
import type { ProjectReviewViewReader } from "../src/review-session.js";
import type { SuggestedActionViewReader } from "../src/suggested-action-view.js";

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

const graphRequest = (
  graph: PetraFocusedGraphView,
): FocusedGraphViewRequest => ({
  request_id: graph.content.task.request_id,
  task_kind: "neighborhood",
  task_semantic_key: graph.content.task.task_semantic_key,
  question: graph.content.task.question,
  focus_ref: structuredClone(graph.content.task.focus_refs[0]),
  origin: structuredClone(graph.content.task.origin),
  project_definition_ref: structuredClone(
    graph.content.profile.project_definition_ref,
  ),
  semantic_layer: graph.content.semantic_layer,
  temporal_position: {
    position_kind: "current",
    dimension: "project_snapshot",
  },
  object_semantic_key: graph.content.nodes[0]!.semantic_key,
  relationship_semantic_key:
    graph.content.scope.included_relationship_semantics[0],
  return_action_semantic_key: graph.content.actions[0].semantic_key,
  return_destination: structuredClone(graph.content.destinations[0]),
  limits: structuredClone(graph.content.scope.limits),
  expected_snapshot: structuredClone(graph.content.requested_snapshot),
});

const reviewFor = (
  graph: PetraFocusedGraphView,
): PetraProjectReviewViewV120 => {
  const legacy = accepted<PetraProjectReviewView>("project-review-view");
  const session = accepted<PetraReviewSessionV110>(
    "review-session-working-candidate",
  );
  const candidate = accepted<PetraWorkingCandidate>("working-candidate");
  const relationship = accepted<PetraWorkingRelationship>(
    "working-relationship",
  );
  const selected = graph.content.relationships[0]!;
  candidate.project_id = graph.project_id;
  relationship.project_id = graph.project_id;
  relationship.profile_relationship.registration.semantic_key =
    selected.semantic_key;
  relationship.profile_relationship.candidate_operation = "revise";
  relationship.profile_relationship.current_authoritative_ref = {
    schema_name: "petra.assertion",
    schema_version: "1.0.0",
    record_id: selected.relationship_ref.element_id,
    revision: selected.relationship_ref.revision,
    record_hash: selected.relationship_ref.record_hash,
  };
  const member = legacy.content.members[0];
  const content: PetraProjectReviewViewV120["content"] = {
    ...structuredClone(legacy.content),
    session: {
      ...structuredClone(legacy.content.session),
      revision: session.revision,
      content_hash: session.content_hash,
      lifecycle: "open",
    },
    members: [
      {
        ...structuredClone(member),
        review_member_id: session.content.members[0].review_member_id,
        working_state: {
          candidate,
          relationships: [relationship],
          selection_basis: "exact_review_session_working_bindings",
          authority_effect: "none",
        },
        change_sets: member.change_sets.map((changeSet) => ({
          ...structuredClone(changeSet),
          commands: [],
          events: [],
        })),
      },
    ],
    projection: {
      state: "unavailable",
      reason: "No authoritative projection is required for this preview.",
    },
  };
  return {
    schema_name: "petra.project-review-view",
    schema_version: "1.2.0",
    project_id: graph.project_id,
    review_session_id: session.review_session_id,
    content,
    content_hash: digest(content),
    read_at: "2026-09-16T02:00:00.000Z",
  };
};

const suggestedActionFor = (
  graph: PetraFocusedGraphView,
): PetraSuggestedActionViewV11 => {
  const action = accepted<PetraSuggestedActionViewV11>(
    "suggested-action-view-v1-1",
  );
  action.project_id = graph.project_id;
  action.content.action.basis.project_definition_ref = structuredClone(
    graph.content.profile.project_definition_ref,
  );
  action.content.action.objective.semantic_key =
    graph.content.task.task_semantic_key;
  action.content_hash = digest(action.content);
  return action;
};

const sources = (
  graph: PetraFocusedGraphView,
  review: PetraProjectReviewViewV120,
  action: PetraSuggestedActionViewV11,
): {
  graphs: FocusedGraphViewReader;
  reviews: ProjectReviewViewReader;
  suggested: SuggestedActionViewReader;
} => ({
  graphs: {
    queryFocusedGraph: vi.fn(() => Promise.resolve(structuredClone(graph))),
  },
  reviews: {
    listProjectReviewViews: vi.fn(() => Promise.resolve([review])),
    getProjectReviewView: vi.fn(() => Promise.resolve(review)),
  },
  suggested: {
    getSuggestedActionViewForInquiryResult: vi.fn(() =>
      Promise.resolve(undefined),
    ),
    getWorkStartingSuggestedActionViewForInquiryResult: vi.fn(() =>
      Promise.resolve(action),
    ),
  },
});

const requestBase = (
  graph: PetraFocusedGraphView,
): Omit<FocusedGraphActionPreviewViewRequest, "selection" | "target"> => ({
  action_request_id: "focused_graph_action_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
  focused_graph_request: graphRequest(graph),
  expected_graph: {
    schema_name: graph.schema_name,
    schema_version: graph.schema_version,
    content_hash: graph.content_hash,
  },
});

describe("focused graph governed correction and new-Work composition", () => {
  it("rejects renderer coordinates, layouts, and drag gestures at the request boundary", () => {
    const graph = focusedGraphFixture();
    const request = {
      ...requestBase(graph),
      selection: {
        selection_kind: "relationship",
        selected_keys: [graph.content.relationships[0]!.relationship_key],
      },
      target: {
        action_kind: "governed_correction",
        requested_change: "relink",
        review_session_id: reviewFor(graph).review_session_id,
        review_member_id: reviewFor(graph).content.members[0].review_member_id,
      },
      coordinates: { x: 30, y: 60 },
      layout: "force",
      gesture: "drag",
    };
    expect(() =>
      parseFocusedGraphActionPreviewViewRequest(request),
    ).toThrowError(FocusedGraphActionPreviewQueryError);
  });

  it.each<FocusedGraphCorrectionKind>([
    "edit_relationship",
    "relink",
    "split",
    "change_scope",
  ])(
    "binds %s to the existing exact WorkingCandidate and open Review without issuing a command",
    async (requestedChange) => {
      const graph = focusedGraphFixture();
      const review = reviewFor(graph);
      const action = suggestedActionFor(graph);
      const readers = sources(graph, review, action);
      const composer = new FocusedGraphActionPreviewViewComposer(
        readers.graphs,
        readers.reviews,
        readers.suggested,
      );
      const request: FocusedGraphActionPreviewViewRequest = {
        ...requestBase(graph),
        selection: {
          selection_kind: "relationship",
          selected_keys: [graph.content.relationships[0]!.relationship_key],
        },
        target: {
          action_kind: "governed_correction",
          requested_change: requestedChange,
          review_session_id: review.review_session_id,
          review_member_id: review.content.members[0].review_member_id,
        },
      };
      const view = await composer.queryFocusedGraphActionPreview(
        graph.project_id,
        request,
      );
      expect(view?.content.preview).toMatchObject({
        preview_kind: "governed_correction",
        requested_change: requestedChange,
        review_session_ref: {
          review_session_id: review.review_session_id,
          lifecycle: "open",
        },
        review_member_id: review.content.members[0].review_member_id,
        operation: {
          state: "preview_only",
          review_decision: "not_performed",
          authority_change: "only_after_validated_review_apply",
        },
      });
      expect(view?.content.authority_boundary).toMatchObject({
        working_candidate_owner: "reused",
        review_owner: "reused",
        command_issued: false,
        work_started: false,
        renderer_state_accepted: false,
      });
    },
  );

  it("binds investigation entry to the existing SuggestedAction Work preview and exact graph return context", async () => {
    const graph = focusedGraphFixture();
    const review = reviewFor(graph);
    const action = suggestedActionFor(graph);
    const readers = sources(graph, review, action);
    const composer = new FocusedGraphActionPreviewViewComposer(
      readers.graphs,
      readers.reviews,
      readers.suggested,
    );
    const request: FocusedGraphActionPreviewViewRequest = {
      ...requestBase(graph),
      selection: {
        selection_kind: "node",
        selected_keys: [graph.content.nodes[0]!.node_key],
      },
      target: {
        action_kind: "new_work",
        inquiry_result_link_ref: structuredClone(
          action.content.action.basis.inquiry_result_link_ref,
        ),
      },
    };
    const view = await composer.queryFocusedGraphActionPreview(
      graph.project_id,
      request,
    );
    expect(view?.content.preview).toMatchObject({
      preview_kind: "new_work",
      inquiry_result_link_ref:
        action.content.action.basis.inquiry_result_link_ref,
      operation: {
        state: "preview_only",
        work_start: "only_after_exact_invocation",
        delivery_abort: "does_not_cancel_work",
        work_cancellation: "separate_authorized_command",
      },
    });
    expect(view?.content.return_context).toEqual({
      graph_request_id: graph.content.task.request_id,
      selection: request.selection,
      origin: graph.content.task.origin,
      destination: graph.content.destinations[0],
    });
    expect(view?.content.authority_boundary).toMatchObject({
      suggested_action_owner: "reused",
      work_preview_owner: "reused",
      command_issued: false,
      work_started: false,
    });
  });

  it("binds an exact Working-layer relationship by canonical record hash", async () => {
    const graph = focusedGraphFixture();
    const review = reviewFor(graph);
    const workingRelationship =
      review.content.members[0].working_state.relationships[0];
    const selected = graph.content.relationships[0]!;
    selected.relationship_key = `relationship:working:${workingRelationship.working_relationship_id.toLowerCase()}:${workingRelationship.revision}`;
    selected.relationship_ref = {
      element_id: workingRelationship.working_relationship_id,
      revision: workingRelationship.revision,
      record_hash: digest(workingRelationship),
    };
    selected.layer = "working";
    selected.authority_position = "working_non_authority";
    selected.origin = "working_candidate";
    graph.content.semantic_layer = "working";
    graph.content.scope.included_layers = ["current", "working"];
    graph.content_hash = digest(graph.content);
    const readers = sources(graph, review, suggestedActionFor(graph));
    const composer = new FocusedGraphActionPreviewViewComposer(
      readers.graphs,
      readers.reviews,
      readers.suggested,
    );
    const request: FocusedGraphActionPreviewViewRequest = {
      ...requestBase(graph),
      focused_graph_request: {
        ...graphRequest(graph),
        semantic_layer: "working",
      },
      selection: {
        selection_kind: "relationship",
        selected_keys: [selected.relationship_key],
      },
      target: {
        action_kind: "governed_correction",
        requested_change: "edit_relationship",
        review_session_id: review.review_session_id,
        review_member_id: review.content.members[0].review_member_id,
      },
    };

    const result = await composer.queryFocusedGraphActionPreview(
      graph.project_id,
      request,
    );
    expect(result?.content.preview).toMatchObject({
      preview_kind: "governed_correction",
      selected_relationship: {
        relationship_ref: {
          element_id: workingRelationship.working_relationship_id,
          record_hash: digest(workingRelationship),
        },
        layer: "working",
        authority_position: "working_non_authority",
      },
    });
  });
});
