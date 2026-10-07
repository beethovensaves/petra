import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { getReferenceProject } from "./fixtures.js";
import { InspectWorkspace, safeInspectionReturn } from "./InspectWorkspace.js";
import { projectInspectPath, WorkspaceHost } from "./WorkspaceHost.js";

const project = getReferenceProject("inlet-cycle");
if (project === undefined) throw new Error("The reference Project is missing.");

describe("Inspect workspace", () => {
  it("carries an exact source identity and the return route into Inspect", () => {
    const selection = {
      state: "current" as const,
      semanticKey: "petra.project-source",
      objectId: "project_source_01K4C000000000000000000007",
      resolvedRevision: 2,
      recordHash: "sha256:example",
      label: "Current source",
      summary: "Source basis",
      destination: "sources" as const,
    };
    const from = `/projects/${project.id}/sources/${selection.objectId}#source-heading`;
    const path = projectInspectPath(project.id, from, selection, [
      "source.open",
    ]);
    const url = new URL(path, "http://localhost");
    expect(url.searchParams.get("from")).toBe(from);
    expect(url.searchParams.get("semanticKey")).toBe(selection.semanticKey);
    expect(url.searchParams.get("selected")).toBe(selection.objectId);
    expect(url.searchParams.get("revision")).toBe("2");
    expect(url.searchParams.get("recordHash")).toBe(selection.recordHash);

    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={[path]}>
        <WorkspaceHost project={{ ...project, selection }} place="inspect">
          <InspectWorkspace project={{ ...project, selection }} />
        </WorkspaceHost>
      </MemoryRouter>,
    );
    expect(markup).toContain('data-workspace-role="inspect"');
    expect(markup).toContain(
      'data-workspace-object-ref="project_source_01K4C000000000000000000007"',
    );
    expect(markup).toContain("Source basis");
    expect(markup).toContain("Return to task");
    expect(markup).toContain("source.open");
    expect(markup).toContain("Open current object");
  });

  it("does not assert an unrelated requested object as resolved", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[`/projects/${project.id}/inspect?object=unknown`]}
      >
        <InspectWorkspace project={project} />
      </MemoryRouter>,
    );
    expect(markup).toContain("was not resolved in this Project shell read");
    expect(markup).not.toContain("Open current object");
  });

  it("recognizes the shell's Project identity when an agent card inspects it", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          `/projects/${project.id}/inspect?object=${project.id}`,
        ]}
      >
        <InspectWorkspace project={project} />
      </MemoryRouter>,
    );
    expect(markup).toContain(project.title);
    expect(markup).not.toContain("was not resolved in this Project shell read");
  });

  it("returns only to this Project's task routes", () => {
    expect(safeInspectionReturn(project.id, "/projects/other/brief")).toBe(
      `/projects/${project.id}/brief`,
    );
    expect(safeInspectionReturn(project.id, "//example.org")).toBe(
      `/projects/${project.id}/brief`,
    );
    expect(
      safeInspectionReturn(
        project.id,
        `/projects/${project.id}/../other/brief`,
      ),
    ).toBe(`/projects/${project.id}/brief`);
    expect(
      safeInspectionReturn(
        project.id,
        `/projects/${project.id}/%2e%2e/other/brief`,
      ),
    ).toBe(`/projects/${project.id}/brief`);
  });

  it("does not offer destinations absent from the Project's server place map", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <InspectWorkspace
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
        />
      </MemoryRouter>,
    );
    expect(markup).not.toContain("Open sources");
    expect(markup).not.toContain("Open focused Graph");
    expect(markup).not.toContain("Open full History");
  });
});
