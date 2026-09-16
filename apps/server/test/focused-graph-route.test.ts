import { focusedGraphFixture } from "../../../packages/contracts/test/fixtures/focused-graph-view.js";
import { focusedGraphV11Fixture } from "../../../packages/contracts/test/fixtures/focused-graph-view-v1-1.js";
import {
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
});
