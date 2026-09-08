import { readFileSync } from "node:fs";

import type {
  PetraProjectObjectLocationView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectSourceView,
} from "@petra/contracts";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  graphQuestionFromView,
  loadProjectObjectLocationRedirect,
  projectRecordFromShellView,
  reviewSessionFromView,
  sourceRecordFromView,
  semanticDestinationPath,
} from "./project-data.js";

const view = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

const sourceView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

const reviewView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-review-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectReviewView;

const relationshipView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-relationship-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectRelationshipView;

const locationView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-object-location-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectObjectLocationView;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Project shell workbench adapter", () => {
  it("maps exact definition terminology and projection attention without mutating the view", () => {
    const before = structuredClone(view);
    const project = projectRecordFromShellView(view);

    expect(project.id).toBe(view.project_id);
    expect(project.title).toBe("Competing explanations");
    expect(project.objective).toContain("exact inspectable passages");
    expect(project.profile.id).toBe(
      "project_definition_01K4C000000000000000000001",
    );
    expect(project.profile.terms).toEqual({
      focus: "Research question",
      focusPlural: "Research questions",
      finding: "Claim",
      findingPlural: "Claims",
      reference: "Source",
      referencePlural: "Sources",
    });
    expect(project.projection.state).toBe("catching_up");
    expect(project.attention).toEqual([
      expect.objectContaining({
        id: "attention_01K4C000000000000000000008",
        title: "Graph projection is catching up",
      }),
    ]);
    expect(project.snapshot.label).toBe("Authority event 3");
    expect(view).toEqual(before);
  });

  it("keeps a Project with no selected Objective explicit and usable", () => {
    const early = structuredClone(view);
    delete early.content.current_objective;
    early.content.attention = [];
    early.content.projection = {
      state: "unavailable",
      label: "Projection unavailable",
      detail: "No graph checkpoint is registered.",
      represented_event_position: 0,
      observed_event_position: 0,
      pending_records: 0,
    };

    const project = projectRecordFromShellView(early);
    expect(project.state).toBe("early");
    expect(project.objective).toBe(
      "No current Project focus has been selected.",
    );
    expect(project.projection.state).toBe("unavailable");
    expect(project.sources).toEqual([]);
    expect(project.recentDecisions).toEqual([]);
  });

  it("maps one exact ProjectSource authority chain into the frozen source surfaces", () => {
    const before = structuredClone(sourceView);
    const source = sourceRecordFromView(sourceView);

    expect(source.id).toBe("project_source_01K4C000000000000000000007");
    expect(source.title).toBe("A testable account of competing explanations");
    expect(source.creator).toBe("Ada Researcher");
    expect(source.extent).toBe("complete");
    expect(source.rights).toBe("CC-BY-4.0 · verified");
    expect(source.excerpt).toEqual(
      expect.objectContaining({
        heading: "Results / Paragraph 1",
        locator: "Page 1 · Results / Paragraph 1",
        text: "The study reports a measurable improvement.",
      }),
    );
    expect(sourceView).toEqual(before);
  });

  it("maps one exact Review-session composition without treating validation as approval", () => {
    const before = structuredClone(reviewView);
    const review = reviewSessionFromView(reviewView);

    expect(review.id).toBe("review_session_01K4D000000000000000000001");
    expect(review.status).toBe("needs_decision");
    expect(review.candidate.proposed).toBe(
      "The study reports a measurable improvement.",
    );
    expect(review.validation).toEqual(
      expect.objectContaining({
        state: "passed",
        label: "Applicable checks passed",
      }),
    );
    expect(review.changeSet).toEqual(
      expect.objectContaining({
        id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF",
      }),
    );
    expect(review.changeSet?.changes.join(" ")).toContain(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
    );
    expect(review.basis[0]?.sourceId).toBe(
      "project_source_01K4C000000000000000000007",
    );
    expect(reviewView).toEqual(before);
  });

  it("maps one bounded current provenance path without inventing unavailable graph layers", () => {
    const before = structuredClone(relationshipView);
    const graph = graphQuestionFromView(relationshipView);

    expect(graph.focusNodeId).toBe("claim_01ARZ3NDEKTSV4RRFFQ69G5FBB");
    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges).toHaveLength(4);
    expect(graph.nodes.every((node) => node.layers.join() === "current")).toBe(
      true,
    );
    expect(graph.layerAvailability).toEqual({
      current: { available: true, label: "Current" },
      working: {
        available: false,
        label: "Unavailable in the current M1 relationship view",
      },
      historical: {
        available: false,
        label: "Unavailable in the current M1 relationship view",
      },
    });
    expect(graph.recommendation).toBeUndefined();
    expect(
      graph.nodes.find((node) => node.kind === "Source Span")?.sourceId,
    ).toBe("project_source_01K4C000000000000000000007");
    expect(relationshipView).toEqual(before);
  });

  it("maps semantic roles to client routes while retaining exact identity", () => {
    const currentPath = semanticDestinationPath(locationView);
    expect(currentPath).toContain(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/sources/project_source_01K4C000000000000000000007",
    );
    expect(currentPath).toContain("semanticKey=petra.project-source");
    expect(currentPath).toContain("revision=1");
    expect(currentPath).toContain(
      "recordHash=sha256%3Afa6206f9dd4c3a574d7afb9df2c77a3b4522f18be88d7dca01143534590f7b5c",
    );

    const historical = structuredClone(locationView);
    historical.content.resolution.state = "historical";
    historical.content.primary_destination =
      historical.content.alternate_destinations[1]!;
    expect(semanticDestinationPath(historical)).toContain(
      "/history?selected=project_source_01K4C000000000000000000007",
    );

    const missing = structuredClone(locationView);
    missing.content.resolution = {
      state: "missing",
      requested_ref: missing.content.request.object_ref,
      failure: {
        code: "OBJECT_UNAVAILABLE",
        message: "The requested object is unavailable.",
      },
    };
    missing.content.primary_destination = {
      role: "brief",
      purpose: "Return to the current Project orientation.",
    };
    expect(semanticDestinationPath(missing)).toBe(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief",
    );
  });

  it("resolves a deep link through the authorized semantic query without ambient selection", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      void input;
      return Promise.resolve(Response.json(locationView));
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      "http://petra.test/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/locate?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&taskIntent=inspect",
    );
    const args: LoaderFunctionArgs = {
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/locate",
      params: {
        projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      },
      context: new RouterContextProvider(),
    };

    const response = await loadProjectObjectLocationRedirect(args);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      semanticDestinationPath(locationView),
    );
    expect(fetch).toHaveBeenCalledOnce();
    const requestPath = fetch.mock.calls[0]?.[0];
    expect(typeof requestPath).toBe("string");
    if (typeof requestPath !== "string") {
      throw new TypeError(
        "Expected the location loader to request a URL string.",
      );
    }
    expect(requestPath).toContain(
      "/object-location?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&taskIntent=inspect",
    );
    expect(requestPath).not.toContain("selected=");
  });
});
