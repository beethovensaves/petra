import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PetraButton,
  PetraDialog,
  PetraEmptyState,
  PetraIconButton,
  PetraTabs,
  PetraTextField,
  PetraTooltip,
} from "./primitives.js";

describe("Petra shared primitives", () => {
  it("keeps an unavailable action focusable and visibly explains the boundary", () => {
    const markup = renderToStaticMarkup(
      <PetraButton
        variant="primary"
        unavailable={{
          reason: "Only an abstract is available.",
          prerequisite: "Attach a permitted full-text version.",
        }}
      >
        Generate method synthesis
      </PetraButton>,
    );

    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("Generate method synthesis");
    expect(markup).toContain("Unavailable:");
    expect(markup).toContain("Only an abstract is available.");
    expect(markup).toContain("Prerequisite:");
    expect(markup).toContain("Attach a permitted full-text version.");
    expect(markup).toMatch(/aria-describedby="[^"]+"/);
    expect(markup).not.toContain(" disabled");
  });

  it("announces busy actions without relying on animation", () => {
    const markup = renderToStaticMarkup(
      <PetraButton busy busyLabel="Checking sources…">
        Check sources
      </PetraButton>,
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("Checking sources…");
  });

  it("gives icon-only controls a required accessible name", () => {
    const markup = renderToStaticMarkup(
      <PetraIconButton label="Search evidence" icon={<span>icon</span>} />,
    );

    expect(markup).toContain('aria-label="Search evidence"');
    expect(markup).toContain("petra-icon-button");
    expect(markup).toContain('aria-hidden="true"');
  });

  it("associates field hints and correction text with an invalid field", () => {
    const markup = renderToStaticMarkup(
      <PetraTextField
        id="saved-view"
        label="Saved view name"
        hint="Between 4 and 60 characters."
        error="Enter at least 4 characters."
        defaultValue="H1"
      />,
    );

    expect(markup).toContain('id="saved-view"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain(
      'aria-describedby="saved-view-hint saved-view-error"',
    );
    expect(markup).toContain("Enter at least 4 characters.");
  });

  it("exposes tabs, selection, and the active panel as distinct semantics", () => {
    const markup = renderToStaticMarkup(
      <PetraTabs
        label="Claim details"
        selectedId="sources"
        onSelect={() => undefined}
        tabs={[
          { id: "summary", label: "Summary", panel: "Summary panel" },
          { id: "sources", label: "Sources", panel: "Source panel" },
        ]}
      />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-label="Claim details"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain("Source panel");
    expect(markup).not.toContain("Summary panel");
  });

  it("connects tooltip and dialog descriptions to their controls", () => {
    const tooltip = renderToStaticMarkup(
      <PetraTooltip label="About freshness">
        Freshness is not confidence.
      </PetraTooltip>,
    );
    const dialog = renderToStaticMarkup(
      <PetraDialog
        open
        title="Remove draft?"
        description="No command is issued by this fixture."
        onClose={() => undefined}
      >
        Review the impact before continuing.
      </PetraDialog>,
    );

    expect(tooltip).toContain('role="tooltip"');
    expect(tooltip).toContain('aria-label="About freshness"');
    expect(tooltip).toMatch(/aria-describedby="[^"]+"/);
    expect(dialog).toContain("<dialog");
    expect(dialog).toMatch(/aria-labelledby="[^"]+"/);
    expect(dialog).toMatch(/aria-describedby="[^"]+"/);
    expect(dialog).toContain("Review the impact before continuing.");
  });

  it("keeps empty and failure states explicit without color-only meaning", () => {
    const markup = renderToStaticMarkup(
      <PetraEmptyState
        tone="danger"
        title="This view cannot be restored"
        description="The referenced snapshot is unavailable."
        detail="Return to the current Research Brief."
      />,
    );

    expect(markup).toContain('data-tone="danger"');
    expect(markup).toContain("This view cannot be restored");
    expect(markup).toContain("The referenced snapshot is unavailable.");
    expect(markup).toContain("Return to the current Research Brief.");
    expect(markup).toContain("octicon-alert");
    expect(markup).toContain('aria-hidden="true"');
  });
});
