import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  getProjectArtifacts,
  getProjectHistory,
  getProjectProfileTool,
  getReferenceArtifact,
  getReferenceProject,
} from "./fixtures.js";
import {
  CompositionArtifactSurface,
  CompositionCollectionSurface,
  HistorySurface,
  ProfileToolSurface,
  SettingsSurface,
} from "./RemainingSurfaces.js";

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe("remaining neutral reference packets", () => {
  const writingProject = getReferenceProject("field-guide");
  const artifact = getReferenceArtifact(
    "field-guide",
    "artifact-emergency-sequence",
  );
  const inquiryProject = getReferenceProject("inlet-cycle");
  const decisionProject = getReferenceProject("north-loop");
  const profileTool = getProjectProfileTool(
    "north-loop",
    "tool-constraint-coverage",
  );

  if (
    writingProject === undefined ||
    artifact === undefined ||
    inquiryProject === undefined ||
    decisionProject === undefined ||
    profileTool === undefined
  ) {
    throw new Error("Remaining packet conformance fixtures are incomplete.");
  }

  it("keeps Composition revisions, persistence, validation, and delivery separate", () => {
    const markup = render(
      <CompositionCollectionSurface
        project={writingProject}
        artifacts={getProjectArtifacts(writingProject.id)}
      />,
    );

    expect(markup).toContain("Accepted revision 10");
    expect(markup).toContain("Working revision 12");
    expect(markup).toContain("One governing check passed");
    expect(markup).toContain("Open artifact");
  });

  it("provides a local editor without claiming a durable save", () => {
    const markup = render(
      <CompositionArtifactSurface
        project={writingProject}
        artifact={artifact}
      />,
    );

    expect(markup).toContain("Durably saved as Working revision 12");
    expect(markup).toContain("Local edits do not create a durable revision");
    expect(markup).toContain("Save is unavailable");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain("Accessible HTML preview");
    expect(markup).toContain("Stored locally · not delivered");
  });

  it("compares exact Composition positions and exposes statement provenance", () => {
    const comparison = render(
      <CompositionArtifactSurface
        project={writingProject}
        artifact={artifact}
        initialMode="compare"
      />,
    );
    const checks = render(
      <CompositionArtifactSurface
        project={writingProject}
        artifact={artifact}
        initialMode="checks"
      />,
    );

    expect(comparison).toContain("Current · authoritative");
    expect(comparison).toContain("Working · non-authoritative");
    expect(comparison).toContain("Material difference");
    expect(checks).toContain("Checks and provenance");
    expect(checks).toContain("exactly matches Clause 2.4");
    expect(checks).toContain("Author-authored working text");
    expect(checks).toContain("Inspect exact source");
  });

  it("previews output consequence in a subordinate dialog", () => {
    const markup = render(
      <CompositionArtifactSurface
        project={writingProject}
        artifact={artifact}
      />,
    );

    expect(markup).toContain("Export Working revision 12?");
    expect(markup).toContain("Accessible HTML package");
    expect(markup).toContain("no external delivery");
    expect(markup).toContain("a new receipt would be additive");
    expect(markup).toContain("The export command is unavailable");
  });

  it("presents History as causal episodes with separate authority and projection effects", () => {
    const episodes = getProjectHistory(inquiryProject.id);
    const markup = render(
      <HistorySurface
        project={inquiryProject}
        episodes={episodes}
        selected={episodes[0]}
      />,
    );

    expect(markup).toContain("Causal episodes");
    expect(markup).toContain("Authority effect");
    expect(markup).toContain("Projection effect");
    expect(markup).toContain("Snapshot 17 to Snapshot 18");
    expect(markup).toContain(
      "Projection retry cannot repeat the Apply command",
    );
    expect(markup).toContain(
      "The original action, decision, and events remain",
    );
  });

  it("separates personal Settings from governed Project controls", () => {
    const markup = render(<SettingsSurface selectedProject={inquiryProject} />);

    expect(markup).toContain("Personal presentation choices remain separate");
    expect(markup).toContain("Petra Stone");
    expect(markup).toContain("Petra Graphite");
    expect(markup).toContain("High Contrast");
    expect(markup).toContain("These choices reset when this page reloads");
    expect(markup).toContain("Governed Project scope");
    expect(markup).toContain("No Project setting command is connected");
  });

  it("uses a profile-owned tool inside Petra's shared task and recovery grammar", () => {
    const markup = render(
      <ProfileToolSurface project={decisionProject} tool={profileTool} />,
    );

    expect(markup).toContain("Profile tool · Decision analysis");
    expect(markup).toContain("Constraint coverage check");
    expect(markup).toContain(
      "profile.decision-analysis/constraint-coverage@1.0",
    );
    expect(markup).toContain("No registered alternatives yet");
    expect(markup).toContain("will not invent alternatives or a result");
    expect(markup).toContain("Petra owns Work, recovery, and return");
  });
});
