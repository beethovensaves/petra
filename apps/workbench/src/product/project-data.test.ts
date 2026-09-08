import { readFileSync } from "node:fs";

import type { PetraProjectShellView } from "@petra/contracts";
import { describe, expect, it } from "vitest";

import { projectRecordFromShellView } from "./project-data.js";

const view = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

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
});
