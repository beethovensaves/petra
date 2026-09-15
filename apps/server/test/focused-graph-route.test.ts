import { focusedGraphFixture } from "../../../packages/contracts/test/fixtures/focused-graph-view.js";
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
});
