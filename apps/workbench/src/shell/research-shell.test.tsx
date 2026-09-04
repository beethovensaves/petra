import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SELECTED_CLAIM_SHELL_FIXTURE } from "../fixtures/shell.js";
import { ResearchShell } from "./ResearchShell.js";

describe("Petra research shell", () => {
  const renderShell = (): string =>
    renderToStaticMarkup(
      <ResearchShell
        model={SELECTED_CLAIM_SHELL_FIXTURE.viewModel}
        initialAssistantCollapsed={false}
      />,
    );

  it("keeps interpretation context ahead of the research surface", () => {
    const markup = renderShell();

    expect(markup.indexOf("Competing explanations")).toBeLessThan(
      markup.indexOf("Current view"),
    );
    expect(markup).toContain("Active question");
    expect(markup).toContain("Revision 18");
    expect(markup).toContain("Graph revision 17");
    expect(markup).toContain("Graph status");
    expect(markup).toContain("Catching up");
    expect(markup).toContain("Guide");
    expect(markup).toContain("Review requested work (1)");
  });

  it("presents the selected object as Details rather than a developer inspector", () => {
    const markup = renderShell();

    expect(markup).toContain('id="shell-details-title"');
    expect(markup).toContain(">Details<");
    expect(markup).toContain("Selected object");
    expect(markup).toContain("claim_01ARZ3NDEKTSV4RRFFQ69G5FBB@1");
    expect(markup).not.toContain(">Inspector<");
  });

  it("keeps unavailable modules out of product navigation", () => {
    const markup = renderShell();

    expect(markup).not.toContain("Module pending");
    expect(markup).not.toContain(">Brief<");
    expect(markup).not.toContain(">Papers<");
    expect(markup).not.toContain(">Experiments<");
  });

  it("preserves the selected Claim in the surface and agent context", () => {
    const markup = renderShell();

    expect(
      markup.match(/The study reports a measurable improvement\./g)?.length,
    ).toBeGreaterThanOrEqual(3);
    expect(markup).toContain("Agent activity");
    expect(markup).toContain(">Explanation<");
    expect(markup).toContain("has not been applied to the trusted graph");
  });

  it("provides a skip path and named coordinated regions", () => {
    const markup = renderShell();

    expect(markup).toContain('href="#shell-main-view"');
    expect(markup).toContain('aria-label="Research map"');
    expect(markup).toContain('aria-label="Petra agent activity"');
    expect(markup).toContain('aria-label="Research views"');
  });

  it("exposes theme, editor, accessibility, and layout settings", () => {
    const markup = renderShell();

    expect(markup).toContain('data-petra-theme="stone"');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain("Workspace settings");
    expect(markup).toContain(">Appearance<");
    expect(markup).toContain(">Layout<");
    expect(markup).toContain(">Editor<");
    expect(markup).toContain(">Accessibility<");
    expect(markup).toContain("Petra Graphite");
    expect(markup).toContain("High Contrast");
  });

  it("gives each wide-layout pane divider keyboard-operable separator semantics", () => {
    const markup = renderShell();

    expect(markup.match(/role="separator"/g)).toHaveLength(3);
    expect(markup).toContain('aria-label="Resize Research map"');
    expect(markup).toContain('aria-label="Resize Details panel"');
    expect(markup).toContain('aria-label="Resize Petra panel"');
    expect(markup).toContain('aria-orientation="vertical"');
    expect(markup).toContain('aria-valuetext="216 pixels"');
    expect(markup).toContain('aria-valuetext="376 pixels"');
    expect(markup).toContain('aria-valuetext="272 pixels"');
  });

  it("renders the accepted focused graph controls and text alternative", () => {
    const markup = renderToStaticMarkup(
      <ResearchShell
        model={{
          ...SELECTED_CLAIM_SHELL_FIXTURE.viewModel,
          initialView: "graph",
        }}
        initialAssistantCollapsed={false}
      />,
    );

    expect(markup).toContain("Evidence around H12");
    expect(markup).toContain('aria-label="Graph navigation"');
    expect(markup).toContain("Visible relationships");
    expect(markup).toContain("Inspect node");
    expect(markup).toContain("Text view of the visible graph");
    expect(markup).toContain("does not define a scientific z-axis");
  });
});
