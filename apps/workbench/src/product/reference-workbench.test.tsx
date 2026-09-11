import { readFileSync } from "node:fs";

import type {
  PetraProjectInquiryView,
  PetraSuggestedActionView,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  REFERENCE_PROJECTS,
  getReferenceProject,
  getReferenceSource,
} from "./fixtures.js";
import {
  BriefSurface,
  ProjectsSurface,
  SuggestedActionPreview,
  SourceReaderSurface,
  SourcesSurface,
} from "./ReferenceWorkbench.js";

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

const suggestedActionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionView;

const inquiryDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-inquiry-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

describe("neutral Petra reference workbench", () => {
  const inletProject = getReferenceProject("inlet-cycle");

  if (inletProject === undefined) {
    throw new Error("The inlet-cycle conformance Project is missing.");
  }

  it("renders three compatible taxonomies through one Projects surface", () => {
    const markup = render(<ProjectsSurface />);

    expect(markup).toContain("Evidence inquiry");
    expect(markup).toContain("Controlled publication");
    expect(markup).toContain("Decision analysis");
    expect(markup.match(/Open Brief/g)).toHaveLength(3);
    expect(markup).toContain(
      "Profiles supply compatible domain terms and tasks",
    );
    expect(markup).not.toContain("projects/demo");
  });

  it("keeps Petra's recommendation contextual and preserves valid alternatives", () => {
    const markup = render(<BriefSurface project={inletProject} />);

    expect(markup).toContain("One branch depends on an unprocessed source");
    expect(markup).toContain("Process the maintenance note first");
    expect(markup).toContain(
      "earliest unresolved dependency shared by two downstream questions",
    );
    expect(markup).toContain("Other valid next steps");
    expect(markup).toContain(
      "Choosing another branch does not change or dismiss this recommendation.",
    );
    expect(markup).toContain('id="attention-source-depth"');
    expect(markup).toContain("Projection catching up");
    expect(markup).toContain("The authoritative snapshot is current");
  });

  it("maps exact runtime SuggestedAction authority into the frozen Next steps region", () => {
    const markup = render(
      <SuggestedActionPreview
        actionView={suggestedActionView}
        invokedInquiry={inquiryDetailView}
      />,
    );

    expect(markup).toContain("Next steps");
    expect(markup).toContain("Inspect existing inquiry result");
    expect(markup).toContain("Exact existing result available");
    expect(markup).toContain("No new Work or Project authority change");
    expect(markup).toContain("Work not performed");
    expect(markup).toContain(
      suggestedActionView.content.action_ref.suggested_action_id,
    );
    expect(markup).toContain(
      suggestedActionView.content.action.basis.project_definition_ref
        .record_hash,
    );
    expect(markup).toContain(
      suggestedActionView.content.action.basis.snapshot_ref.snapshot_id,
    );
    expect(markup).toContain(
      suggestedActionView.content.action.basis.produced_by_work_ref
        ?.work_unit_id ?? "missing Work fixture",
    );
    expect(markup).toContain('data-contract-name="petra.project-inquiry-view"');
    expect(markup).toContain('data-operation="get_project_inquiry_detail"');
    expect(markup).toContain("This invokes an authenticated exact read");
    expect(markup).toContain("Exact inquiry detail");
    expect(markup).toContain(
      "This GroundedResponse addresses the inquiry with no authority effect",
    );
  });

  it("fails closed on a stale action and exposes server prerequisites", () => {
    const stale = structuredClone(suggestedActionView);
    stale.content.readiness = {
      state: "stale",
      reason_code: "result_invalidated",
      reason:
        "The exact GroundedResponse is no longer reusable under current authority.",
      missing_prerequisites: [
        "Regenerate a SuggestedAction from a current reusable result.",
      ],
    };

    const markup = render(<SuggestedActionPreview actionView={stale} />);

    expect(markup).toContain("Stale");
    expect(markup).toContain(
      "Regenerate a SuggestedAction from a current reusable result.",
    );
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain('data-operation="get_project_inquiry_detail"');
  });

  it("separates source identity, extent, rights, and downstream use", () => {
    const markup = render(<SourcesSurface project={inletProject} />);

    expect(markup).toContain("Inlet observation log");
    expect(markup).toContain("Complete for declared scope");
    expect(markup).toContain("Actuator maintenance note");
    expect(markup).toContain("Identity only");
    expect(markup).toContain("Permission status unresolved");
    expect(markup).toContain("Operating threshold table");
    expect(markup).toContain("Partial content");
  });

  it("does not invent source content when only identity is available", () => {
    const source = getReferenceSource(inletProject, "src-maintenance-note");
    if (source === undefined)
      throw new Error("Identity-only source is missing.");

    const markup = render(
      <SourceReaderSurface
        project={inletProject}
        source={source}
        returnTo={{
          path: "/projects/inlet-cycle/brief#attention-source-depth",
          label: "Return to Attention",
        }}
      />,
    );

    expect(markup).toContain("Only identity is available");
    expect(markup).toContain(
      "cannot inspect or cite content until a permitted copy is processed",
    );
    expect(markup).toContain(
      "Processing eligibility and permission are unresolved",
    );
    expect(markup).toContain(
      "/projects/inlet-cycle/brief#attention-source-depth",
    );
    expect(markup).not.toContain("<blockquote>");
  });

  it("provides the exact locator and Details as a semantic peer", () => {
    const source = getReferenceSource(inletProject, "src-observation-log");
    if (source === undefined) throw new Error("Complete source is missing.");

    const markup = render(
      <SourceReaderSurface project={inletProject} source={source} />,
    );

    expect(markup).toContain("Section 4 · entry 21");
    expect(markup).toContain("The closing interval shortened");
    expect(markup).toContain('id="source-details-title"');
    expect(markup).toContain(">Details<");
    expect(markup).toContain(
      "Basis for 3 findings and 1 unresolved comparison",
    );
    expect(markup).toContain("Return to Sources");
  });

  it("keeps the unrelated profile useful when its source collection is empty", () => {
    const project = REFERENCE_PROJECTS.find(({ id }) => id === "north-loop");
    if (project === undefined)
      throw new Error("Decision profile Project is missing.");

    const markup = render(<SourcesSurface project={project} />);

    expect(markup).toContain("No records yet");
    expect(markup).toContain("This early Project has no registered basis");
    expect(markup).toContain("Add Record");
  });
});
