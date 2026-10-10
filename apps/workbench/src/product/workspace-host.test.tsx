import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { getReferenceProject } from "./fixtures.js";
import { WorkspaceHost } from "./WorkspaceHost.js";

const project = getReferenceProject("inlet-cycle");
if (project === undefined) throw new Error("The reference Project is missing.");

describe("Workspace host", () => {
  it("keeps the exact selected object and snapshot with its server destination", () => {
    const selectedProject = {
      ...project,
      selection: {
        state: "current" as const,
        semanticKey: "petra.project-source",
        objectId: "project_source_01K4C000000000000000000007",
        resolvedRevision: 2,
        label: "Current source",
        destination: "sources" as const,
      },
    };
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          `/projects/${project.id}/sources/project_source_01K4C000000000000000000007`,
        ]}
      >
        <WorkspaceHost project={selectedProject} place="sources">
          <p>Exact source content</p>
        </WorkspaceHost>
      </MemoryRouter>,
    );

    expect(markup).toContain('data-workspace-role="source"');
    expect(markup).toContain(
      'data-workspace-object-ref="project_source_01K4C000000000000000000007"',
    );
    expect(markup).toContain(
      `data-workspace-snapshot="${project.snapshot.id}"`,
    );
    expect(markup).toContain("Current source");
    expect(markup).toContain("Exact source content");
  });

  it("does not render a route whose place conflicts with the server destination", () => {
    const selectedProject = {
      ...project,
      selection: {
        state: "current" as const,
        semanticKey: "petra.project-source",
        objectId: "project_source_01K4C000000000000000000007",
        destination: "sources" as const,
      },
    };
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          `/projects/${project.id}/work/work_unit_01K4C000000000000000000007`,
        ]}
      >
        <WorkspaceHost project={selectedProject} place="work">
          <p>Wrong task content</p>
        </WorkspaceHost>
      </MemoryRouter>,
    );

    expect(markup).toContain("The selected object belongs in sources");
    expect(markup).not.toContain("Wrong task content");
    expect(markup).toContain("Return to outcome");
  });

  it("does not invent a Workspace place absent from the server's Project read", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <WorkspaceHost
          project={{
            ...project,
            placeSummaries: [
              {
                role: "brief",
                coverage: "complete",
                label: "Outcome",
                summary: "Current outcome",
                attentionCount: 0,
              },
            ],
          }}
          place="review"
        >
          <p>Unregistered review</p>
        </WorkspaceHost>
      </MemoryRouter>,
    );

    expect(markup).toContain("destination is not registered");
    expect(markup).not.toContain("Unregistered review");
  });
});
