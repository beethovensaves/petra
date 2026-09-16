import { focusedGraphFixture } from "../../../packages/contracts/test/fixtures/focused-graph-view.js";
import { focusedGraphDetailsFixture } from "../../../packages/contracts/test/fixtures/focused-graph-details-view.js";
import { focusedGraphV11Fixture } from "../../../packages/contracts/test/fixtures/focused-graph-view-v1-1.js";
import { focusedGraphAnalysisFixture } from "../../../packages/contracts/test/fixtures/focused-graph-analysis-view.js";
import { focusedGraphActionPreviewFixture } from "../../../packages/contracts/test/fixtures/focused-graph-action-preview-view.js";
import type { PetraFocusedGraphAnalysisView } from "@petra/contracts";
import {
  type FocusedGraphActionPreviewViewReader,
  type FocusedGraphActionPreviewViewRequest,
  type FocusedGraphAnalysisViewReader,
  type FocusedGraphComparisonViewRequest,
  FocusedGraphQueryError,
  type FocusedGraphViewReader,
  type FocusedGraphViewRequest,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const token = "focused-route-test";
const view = focusedGraphFixture();
const path = `/api/queries/projects/${view.project_id}/focused-graph`;
const request: FocusedGraphViewRequest = {
  request_id: view.content.task.request_id,
  task_kind: "neighborhood",
  task_semantic_key: view.content.task.task_semantic_key,
  question: view.content.task.question,
  focus_ref: view.content.task.focus_refs[0],
  origin: { origin_kind: "direct" },
  project_definition_ref: view.content.profile.project_definition_ref,
  semantic_layer: "current",
  temporal_position: {
    position_kind: "current",
    dimension: "project_snapshot",
  },
  object_semantic_key: "scientific.claim",
  relationship_semantic_key: "scientific.assertion",
  return_action_semantic_key: "scientific.graph.trace-sources",
  return_destination: view.content.destinations[1]!,
  limits: {
    maximum_depth: 1,
    maximum_nodes: 20,
    maximum_relationships: 19,
    maximum_paths: 10,
  },
};
const authorized = (body: unknown): RequestInit => ({
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(body),
});

describe("focused graph query route", () => {
  it("authenticates and forwards one exact structured query without route-owned graph meaning", async () => {
    const queryFocusedGraph = vi.fn<
      FocusedGraphViewReader["queryFocusedGraph"]
    >((projectId) =>
      Promise.resolve(
        projectId === view.project_id ? structuredClone(view) : undefined,
      ),
    );
    const app = createPetraApp({
      authToken: token,
      focusedGraphViews: { queryFocusedGraph },
    }).app;

    expect((await app.request(path, authorized(request))).status).toBe(200);
    expect(queryFocusedGraph).toHaveBeenCalledWith(view.project_id, request);

    expect(
      (
        await app.request(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
        })
      ).status,
    ).toBe(401);
    expect(queryFocusedGraph).toHaveBeenCalledTimes(1);

    expect(
      (
        await app.request(
          `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/focused-graph`,
          authorized(request),
        )
      ).status,
    ).toBe(404);
  });

  it("rejects renderer fields and maps exact stale snapshot failures", async () => {
    const queryFocusedGraph = vi.fn<
      FocusedGraphViewReader["queryFocusedGraph"]
    >(() =>
      Promise.reject(
        new FocusedGraphQueryError(
          "FOCUSED_GRAPH_SNAPSHOT_STALE",
          "The requested snapshot is stale.",
        ),
      ),
    );
    const app = createPetraApp({
      authToken: token,
      focusedGraphViews: { queryFocusedGraph },
    }).app;
    const rejected = await app.request(
      path,
      authorized({ ...request, layout: "force" }),
    );
    expect(rejected.status).toBe(422);
    expect(queryFocusedGraph).not.toHaveBeenCalled();

    const stale = await app.request(path, authorized(request));
    expect(stale.status).toBe(409);
    await expect(stale.json()).resolves.toMatchObject({
      error: { code: "FOCUSED_GRAPH_SNAPSHOT_STALE" },
    });

    const missingReader = vi.fn<FocusedGraphViewReader["queryFocusedGraph"]>(
      () =>
        Promise.reject(
          new FocusedGraphQueryError(
            "FOCUSED_GRAPH_FOCUS_NOT_FOUND",
            "The exact focused object is not represented.",
          ),
        ),
    );
    const missingApp = createPetraApp({
      authToken: token,
      focusedGraphViews: { queryFocusedGraph: missingReader },
    }).app;
    const missing = await missingApp.request(path, authorized(request));
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toMatchObject({
      error: { code: "FOCUSED_GRAPH_FOCUS_NOT_FOUND" },
    });
  });

  it("forwards and validates an additive snapshot-bound named expansion", async () => {
    const expansionView = focusedGraphV11Fixture();
    const expansionRequest = {
      ...request,
      project_definition_ref:
        expansionView.content.profile.project_definition_ref,
      limits: expansionView.content.scope.limits,
      expected_snapshot: expansionView.content.requested_snapshot,
      exploration: {
        mode: "named_expansion" as const,
        expansion_key: expansionView.content.exploration.expansion_key,
        recipe_semantic_key:
          expansionView.content.exploration.recipe_semantic_key,
        target_ref: expansionView.content.exploration.target_ref,
        maximum_depth: expansionView.content.exploration.maximum_depth,
        filters: expansionView.content.exploration.filters,
      },
    };
    const queryFocusedGraph = vi.fn<
      FocusedGraphViewReader["queryFocusedGraph"]
    >(() => Promise.resolve(expansionView));
    const app = createPetraApp({
      authToken: token,
      focusedGraphViews: { queryFocusedGraph },
    }).app;

    const response = await app.request(path, authorized(expansionRequest));
    expect(response.status).toBe(200);
    expect(queryFocusedGraph).toHaveBeenCalledWith(
      view.project_id,
      expansionRequest,
    );
    await expect(response.json()).resolves.toEqual(expansionView);
  });

  it("forwards one exact selected Details request without accepting renderer state", async () => {
    const detailsView = focusedGraphDetailsFixture();
    const detailsRequest = {
      details_request_id:
        "focused_graph_details_request_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      focused_graph_request: request,
      expected_graph: {
        schema_name: "petra.focused-graph-view" as const,
        schema_version: "1.0.0" as const,
        content_hash: detailsView.content.graph.content_hash,
      },
      selection: detailsView.content.selection,
    };
    const queryFocusedGraphDetails = vi.fn<
      NonNullable<FocusedGraphViewReader["queryFocusedGraphDetails"]>
    >(() => Promise.resolve(detailsView));
    const app = createPetraApp({
      authToken: token,
      focusedGraphViews: {
        queryFocusedGraph: () => Promise.resolve(view),
        queryFocusedGraphDetails,
      },
    }).app;
    const detailsPath = `${path}/details`;
    const response = await app.request(detailsPath, authorized(detailsRequest));
    expect(response.status).toBe(200);
    expect(queryFocusedGraphDetails).toHaveBeenCalledWith(
      view.project_id,
      detailsRequest,
    );
    await expect(response.json()).resolves.toEqual(detailsView);

    const rejected = await app.request(
      detailsPath,
      authorized({ ...detailsRequest, layout: "radial" }),
    );
    expect(rejected.status).toBe(422);
    expect(queryFocusedGraphDetails).toHaveBeenCalledTimes(1);
  });

  it("forwards one exact no-side-effect action preview and rejects coordinates or drag state", async () => {
    const actionPreview = focusedGraphActionPreviewFixture();
    if (actionPreview.content.preview.preview_kind !== "new_work") {
      throw new Error("Expected the new-Work action preview fixture.");
    }
    const actionRequest: FocusedGraphActionPreviewViewRequest = {
      action_request_id: actionPreview.content.action_request_id,
      focused_graph_request: {
        ...request,
        expected_snapshot:
          actionPreview.content.graph_view.content.requested_snapshot,
      },
      expected_graph: {
        schema_name: actionPreview.content.graph_view.schema_name,
        schema_version: actionPreview.content.graph_view.schema_version,
        content_hash: actionPreview.content.graph_view.content_hash,
      },
      selection: actionPreview.content.selection,
      target: {
        action_kind: "new_work",
        inquiry_result_link_ref:
          actionPreview.content.preview.inquiry_result_link_ref,
      },
    };
    const queryFocusedGraphActionPreview = vi.fn<
      FocusedGraphActionPreviewViewReader["queryFocusedGraphActionPreview"]
    >(() => Promise.resolve(actionPreview));
    const app = createPetraApp({
      authToken: token,
      focusedGraphActionPreviewViews: {
        queryFocusedGraphActionPreview,
      },
    }).app;
    const actionPath = `${path}/action-preview`;

    const response = await app.request(actionPath, authorized(actionRequest));
    expect(response.status).toBe(200);
    expect(queryFocusedGraphActionPreview).toHaveBeenCalledWith(
      view.project_id,
      actionRequest,
    );
    await expect(response.json()).resolves.toEqual(actionPreview);

    const rejected = await app.request(
      actionPath,
      authorized({
        ...actionRequest,
        coordinates: { x: 10, y: 20 },
        gesture: "drag",
      }),
    );
    expect(rejected.status).toBe(422);
    expect(queryFocusedGraphActionPreview).toHaveBeenCalledTimes(1);
  });

  it("forwards one exact comparison read and rejects renderer-owned analysis fields", async () => {
    const analysis = focusedGraphAnalysisFixture();
    const typedAnalysis = analysis as unknown as PetraFocusedGraphAnalysisView;
    const graphRequest = {
      ...request,
      expected_snapshot: view.content.requested_snapshot,
    };
    const analysisRequest: FocusedGraphComparisonViewRequest = {
      analysis_request_id:
        "focused_graph_analysis_request_01ARZ3NDEKTSV4RRFFQ69G5FAY",
      task_kind: "comparison",
      question: "What differs between these exact positions?",
      before: {
        position_key: "position:before",
        label: "Before",
        graph_request: graphRequest,
      },
      after: {
        position_key: "position:after",
        label: "After",
        graph_request: graphRequest,
      },
    };
    const queryFocusedGraphAnalysis = vi.fn<
      FocusedGraphAnalysisViewReader["queryFocusedGraphAnalysis"]
    >(() => Promise.resolve(typedAnalysis));
    const app = createPetraApp({
      authToken: token,
      focusedGraphAnalysisViews: { queryFocusedGraphAnalysis },
    }).app;
    const analysisPath = `${path}/analysis`;

    const response = await app.request(
      analysisPath,
      authorized(analysisRequest),
    );
    expect(response.status).toBe(200);
    expect(queryFocusedGraphAnalysis).toHaveBeenCalledWith(
      view.project_id,
      analysisRequest,
    );
    await expect(response.json()).resolves.toEqual(analysis);

    const rejected = await app.request(
      analysisPath,
      authorized({ ...analysisRequest, importance: 0.95 }),
    );
    expect(rejected.status).toBe(422);
    expect(queryFocusedGraphAnalysis).toHaveBeenCalledTimes(1);
  });
});
