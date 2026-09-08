import { readFileSync } from "node:fs";

import type {
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectSourceView,
} from "@petra/contracts";
import { describe, expect, it } from "vitest";

import {
  projectRecordFromShellView,
  reviewSessionFromView,
  sourceRecordFromView,
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
});
