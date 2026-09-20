import { readFileSync } from "node:fs";

import type {
  FocusedGraphGovernedCorrectionPreview,
  PetraFocusedGraphActionPreviewView,
  PetraFocusedGraphView,
  PetraSuggestedActionViewV11,
} from "@petra/contracts";
import type { FocusedGraphActionPreviewViewRequest } from "@petra/core";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import type { FocusedGraphActionPreviewTarget } from "./focused-graph-entry.js";
import { PetraContractRegistry as BrowserContractRegistry } from "./browser-contract-registry.js";
import {
  FocusedGraphActionPreviewPanel,
  createFocusedGraphActionPreviewRequest,
  matchesActiveFocusedGraphActionPreview,
} from "./FocusedGraphActions.js";

const hash = `sha256:${"a".repeat(64)}`;
const record = (record_id: string) => ({
  record_id,
  revision: 1,
  record_hash: hash,
});

const focusedGraphFixture = (): PetraFocusedGraphView =>
  ({
    schema_name: "petra.focused-graph-view",
    schema_version: "1.0.0",
    project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    content_hash: hash,
    read_at: "2026-09-16T12:00:00.000Z",
    content: {
      task: {
        request_id: "focused_graph_request_01ARZ3NDEKTSV4RRFFQ69G5FAA",
        task_semantic_key: "scientific.research-question",
        question: "Which exact relationships concern this Claim?",
        focus_refs: [record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB")],
        origin: { origin_kind: "direct" },
      },
      profile: {
        project_definition_ref: {
          project_definition_id:
            "project_definition_01K4C000000000000000000001",
          revision: 2,
          content_hash: hash,
          record_hash: hash,
          definition_family: "petra.scientific-evidence",
        },
      },
      requested_snapshot: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FAC",
        revision: 1,
        event_position: 12,
        content_hash: hash,
      },
      semantic_layer: "current",
      scope: {
        included_relationship_semantics: ["scientific.assertion"],
        limits: {
          maximum_depth: 1,
          maximum_nodes: 20,
          maximum_relationships: 20,
          maximum_paths: 10,
        },
      },
      nodes: [
        {
          node_key: "node:claim-a",
          record_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAB"),
          semantic_key: "scientific.claim",
        },
        {
          node_key: "node:claim-b",
          record_ref: record("claim_01ARZ3NDEKTSV4RRFFQ69G5FAD"),
          semantic_key: "scientific.claim",
        },
      ],
      relationships: [
        {
          relationship_key: "relationship:assertion-a",
          relationship_ref: {
            element_id: "assertion_01ARZ3NDEKTSV4RRFFQ69G5FAE",
            revision: 1,
            record_hash: hash,
          },
          semantic_key: "scientific.assertion",
          term: { singular: "Evidence relationship" },
          predicate: "SUPPORTS",
        },
      ],
      paths: [],
      actions: [
        {
          semantic_key: "scientific.graph.return",
        },
      ],
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
    },
  }) as unknown as PetraFocusedGraphView;

const focusedGraphActionPreviewFixture =
  (): PetraFocusedGraphActionPreviewView => {
    const graph = focusedGraphFixture();
    const suggestedAction = JSON.parse(
      readFileSync(
        new URL(
          "../../../../packages/contracts/fixtures/accepted/suggested-action-view-v1-1.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as PetraSuggestedActionViewV11;
    suggestedAction.project_id = graph.project_id;
    const selectedKey = graph.content.nodes[0]!.node_key;
    const selection = {
      selection_kind: "node" as const,
      selected_keys: [selectedKey] as [string],
    };
    return {
      schema_name: "petra.focused-graph-action-preview-view",
      schema_version: "1.0.0",
      project_id: graph.project_id,
      content_hash: hash,
      read_at: suggestedAction.read_at,
      content: {
        action_request_id:
          "focused_graph_action_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
        request_hash: hash,
        graph_view: graph,
        selection,
        preview: {
          preview_kind: "new_work",
          selected_member_keys: [selectedKey],
          inquiry_result_link_ref: structuredClone(
            suggestedAction.content.action.basis.inquiry_result_link_ref,
          ),
          suggested_action_view: suggestedAction,
          operation: {
            state: "preview_only",
            work_start: "only_after_exact_invocation",
            authority_change: "none",
            delivery_abort: "does_not_cancel_work",
            work_cancellation: "separate_authorized_command",
          },
        },
        return_context: {
          graph_request_id: graph.content.task.request_id,
          selection,
          origin: { origin_kind: "direct" },
          destination: graph.content.destinations[0],
        },
        authority_boundary: {
          postgresql_authoritative: true,
          neo4j_projection_only: true,
          focused_graph_owner_reused: true,
          working_candidate_owner: "not_applicable",
          review_owner: "not_applicable",
          suggested_action_owner: "reused",
          work_preview_owner: "reused",
          preview_is_read_only: true,
          selection_grants_authority: false,
          renderer_state_accepted: false,
          command_issued: false,
          work_started: false,
        },
        limitations: [
          "Graph coordinates, layout, and gestures are not accepted.",
        ],
      },
    };
  };

const graphRequest =
  (): FocusedGraphActionPreviewViewRequest["focused_graph_request"] => {
    const graph = focusedGraphFixture();
    return {
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
    };
  };

const correctionTarget = (): FocusedGraphActionPreviewTarget => ({
  action_kind: "governed_correction",
  requested_change: "edit_relationship",
  review_session_id: "review_session_01ARZ3NDEKTSV4RRFFQ69G5FAH",
  review_member_id: "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAJ",
});

const returnContext = {
  path: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief",
  label: "Brief result",
  focus_id: "brief-result-0",
};

describe("focused graph correction and Work previews", () => {
  it("registers the exact action-preview contract in the browser client", () => {
    const registry = new BrowserContractRegistry();
    expect(registry.entries).toContainEqual(
      expect.objectContaining({
        name: "focused-graph-action-preview-view",
        version: "1.0.0",
      }),
    );
  });

  it("converges pointer and non-drag selection on one renderer-neutral request", () => {
    const graph = focusedGraphFixture();
    const selectedKey = graph.content.relationships[0]!.relationship_key;
    const shared = {
      actionRequestId:
        "focused_graph_action_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
      request: graphRequest(),
      view: graph,
      selectedKey,
      target: correctionTarget(),
    };
    const pointerRequest = createFocusedGraphActionPreviewRequest(shared);
    const nonDragRequest = createFocusedGraphActionPreviewRequest(shared);

    expect(pointerRequest).toEqual(nonDragRequest);
    expect(pointerRequest.selection).toEqual({
      selection_kind: "relationship",
      selected_keys: [selectedKey],
    });
    expect(pointerRequest.focused_graph_request.expected_snapshot).toEqual(
      graph.content.requested_snapshot,
    );
    expect(pointerRequest).not.toHaveProperty("coordinates");
    expect(pointerRequest).not.toHaveProperty("layout");
    expect(pointerRequest).not.toHaveProperty("gesture");
    expect(Object.keys(pointerRequest)).toEqual([
      "action_request_id",
      "focused_graph_request",
      "expected_graph",
      "selection",
      "target",
    ]);
  });

  it("requires a relationship for correction and rejects an older preview", () => {
    const graph = focusedGraphFixture();
    expect(() =>
      createFocusedGraphActionPreviewRequest({
        actionRequestId:
          "focused_graph_action_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
        request: graphRequest(),
        view: graph,
        selectedKey: graph.content.nodes[0]!.node_key,
        target: correctionTarget(),
      }),
    ).toThrow(/exact relationship/u);

    const workView = focusedGraphActionPreviewFixture();
    const request: FocusedGraphActionPreviewViewRequest = {
      action_request_id: workView.content.action_request_id,
      focused_graph_request: graphRequest(),
      expected_graph: {
        schema_name: workView.content.graph_view.schema_name,
        schema_version: workView.content.graph_view.schema_version,
        content_hash: workView.content.graph_view.content_hash,
      },
      selection: structuredClone(workView.content.selection),
      target: {
        action_kind: "new_work",
        inquiry_result_link_ref: structuredClone(
          workView.content.preview.preview_kind === "new_work"
            ? workView.content.preview.inquiry_result_link_ref
            : (() => {
                throw new Error("Expected a Work preview fixture.");
              })(),
        ),
      },
    };
    const active = {
      stateId: 4,
      projectId: workView.project_id,
      request,
    };
    expect(matchesActiveFocusedGraphActionPreview(workView, active, 4)).toBe(
      true,
    );
    expect(matchesActiveFocusedGraphActionPreview(workView, active, 5)).toBe(
      false,
    );
  });

  it("presents the exact SuggestedAction, cancellation boundary, and return context", () => {
    const view = focusedGraphActionPreviewFixture();
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <FocusedGraphActionPreviewPanel
          projectId={view.project_id}
          view={view}
          returnContext={returnContext}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Review the exact Work action");
    expect(markup).toContain("Start exact Work");
    expect(markup).toContain("Delivery abort");
    expect(markup).toContain("Preserved return context");
    expect(markup).toContain(view.content.return_context.graph_request_id);
    expect(markup).toContain("brief-result-0");
    expect(markup).toContain("No command issued");
    expect(markup).toContain("renderer state was not accepted");
  });

  it("presents the exact candidate, affected scope, unchanged state, and Review route", () => {
    const base = focusedGraphActionPreviewFixture();
    const graph = focusedGraphFixture();
    const relationship = graph.content.relationships[0]!;
    const target = correctionTarget();
    if (target.action_kind !== "governed_correction") {
      throw new Error("Expected a correction target fixture.");
    }
    const preview: FocusedGraphGovernedCorrectionPreview = {
      preview_kind: "governed_correction",
      requested_change: "edit_relationship",
      selected_relationship: relationship,
      review_session_ref: {
        review_session_id: target.review_session_id,
        revision: 3,
        content_hash: `sha256:${"c".repeat(64)}`,
        lifecycle: "open",
      },
      review_member_id: target.review_member_id,
      working_candidate_ref: {
        working_candidate_id: "working_candidate_01ARZ3NDEKTSV4RRFFQ69G5FAK",
        revision: 2,
        content_hash: `sha256:${"d".repeat(64)}`,
      },
      working_relationship_refs: [
        {
          working_relationship_id:
            "working_relationship_01ARZ3NDEKTSV4RRFFQ69G5FAM",
          revision: 2,
          content_hash: `sha256:${"e".repeat(64)}`,
        },
      ],
      review_view: {
        content: {
          members: [
            {
              review_member_id: "review_member_01ARZ3NDEKTSV4RRFFQ69G5FAJ",
              candidate: {
                candidate_id: "candidate:claim-a",
                revision_label: "Working revision 2",
                kind_label: "Claim correction",
                current: "Current Claim text",
                proposed: "Corrected Claim text",
                difference: "Clarifies the exact scope.",
              },
            },
          ],
        },
      } as unknown as FocusedGraphGovernedCorrectionPreview["review_view"],
      affected_scope: ["The selected Evidence relationship is affected."],
      unchanged: ["Current Project authority remains unchanged."],
      operation: {
        state: "preview_only",
        working_revision: "only_after_canonical_correction_submission",
        review_decision: "not_performed",
        authority_change: "only_after_validated_review_apply",
        cancellation: "closing_preview_leaves_domain_state_unchanged",
      },
    };
    const view: PetraFocusedGraphActionPreviewView = {
      ...base,
      content: {
        ...base.content,
        graph_view: graph,
        selection: {
          selection_kind: "relationship",
          selected_keys: [relationship.relationship_key],
        },
        preview,
      },
    };
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <FocusedGraphActionPreviewPanel
          projectId={view.project_id}
          view={view}
          returnContext={returnContext}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Exact existing candidate");
    expect(markup).toContain("Corrected Claim text");
    expect(markup).toContain("Affected scope");
    expect(markup).toContain("Current Project authority remains unchanged");
    expect(markup).toContain("working_relationship_01ARZ3NDEKTSV4RRFFQ69G5FAM");
    expect(markup).toContain("revision 2");
    expect(markup).toContain("Open this exact candidate in Review");
    expect(markup).toContain("reviewMemberId=review_member_");
  });
});
