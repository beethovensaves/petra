import { readFileSync } from "node:fs";

import type {
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { getReferenceProject } from "./fixtures.js";
import {
  ProfileTaxonomyPresentation,
  ProjectCreationPanel,
  ProjectProfileSurface,
  ProjectResetPanel,
} from "./ProjectProfileSurface.js";

const scientific = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;

const writing = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/registered-project-profile-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;

const project = getReferenceProject("inlet-cycle");
if (project === undefined)
  throw new Error("The profile test Project is missing.");

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

const taxonomyView = (
  resolution: PetraProjectProfileTaxonomyView["resolution"],
): PetraProjectProfileTaxonomyView => ({
  schema_name: "petra.project-profile-taxonomy-view",
  schema_version: "1.0.0",
  project_id: "project_01K6P000000000000000000301",
  project_revision: 4,
  project_definition_ref: {
    project_definition_id: "project_definition_01K6P000000000000000000301",
    revision: 2,
    content_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  resolution,
  read_at: "2026-09-19T12:00:00.000Z",
});

describe("usable Project profile UI", () => {
  it("distinguishes both registered profile families using exact supplied terms and availability", () => {
    const markup = render(
      <ProjectCreationPanel
        profiles={[scientific, writing]}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain('data-family="petra.scientific-evidence"');
    expect(markup).toContain('data-family="petra.controlled-writing"');
    expect(markup).toContain("Scientific evidence inquiry");
    expect(markup).toContain("Research questions · Claims · Sources");
    expect(markup).toContain("Grounded synthesist");
    expect(markup).toContain("Controlled writing");
    expect(markup).toContain(
      "Document purposes · Requirements · Authority sources",
    );
    expect(markup).toContain("Ask a controlled-writing model");
    expect(markup).toContain("Start controlled-writing Work");
    expect(markup).toContain("Choose one registered profile first");
  });

  it("presents every taxonomy category and supplied operation limitation", () => {
    const markup = render(
      <ProfileTaxonomyPresentation
        idPrefix="scientific-profile"
        label={scientific.content.label}
        purpose={scientific.content.purpose}
        taxonomy={scientific.content.taxonomy}
      />,
    );

    for (const heading of [
      "Terms used in this Project",
      "Object kinds",
      "Relationship meanings",
      "Source roles",
      "Validators",
      "Work families",
      "Model roles",
      "Review destinations",
      "Supported places",
      "Unavailable operations",
    ]) {
      expect(markup).toContain(heading);
    }
    expect(markup).toContain("Retry Work");
    expect(markup).toContain("Delete local copy");
  });

  it("keeps registered, Project-authored, and unsupported resolutions distinct", () => {
    const registered = render(
      <ProjectProfileSurface
        project={project}
        view={taxonomyView({
          state: "registered",
          profile_ref: {
            profile_id: scientific.profile_id,
            profile_version: scientific.profile_version,
            content_hash: scientific.content_hash,
          },
          label: scientific.content.label,
          purpose: scientific.content.purpose,
          taxonomy: scientific.content.taxonomy,
        })}
      />,
    );
    const projectAuthored = render(
      <ProjectProfileSurface
        project={project}
        view={taxonomyView({
          state: "project_authored",
          label: writing.content.label,
          purpose: writing.content.purpose,
          taxonomy: writing.content.taxonomy,
          limitation:
            "This definition belongs to the Project and has no registered template origin.",
        })}
      />,
    );
    const unsupported = render(
      <ProjectProfileSurface
        project={project}
        view={taxonomyView({
          state: "unsupported_profile",
          profile_ref: {
            profile_id: scientific.profile_id,
            profile_version: "0.9.0",
            content_hash: scientific.content_hash,
          },
          reason: "profile_version_unavailable",
          message: "The exact registered profile version is unavailable.",
          safe_destination: "projects",
        })}
      />,
    );

    expect(registered).toContain("Registered profile · version 1.0.0");
    expect(projectAuthored).toContain("Project-authored definition");
    expect(projectAuthored).toContain("has no registered template origin");
    expect(unsupported).toContain("Project profile unsupported");
    expect(unsupported).toContain(
      "No substitute terms, actions, or profile defaults were applied",
    );
    expect(unsupported).not.toContain("Terms used in this Project");
  });

  it("states the additive reset consequence before enabling its command", () => {
    const markup = render(
      <ProjectResetPanel
        project={{ ...project, revision: 7 }}
        profiles={[scientific, writing]}
      />,
    );

    expect(markup).toContain("Reset archives this exact Project revision");
    expect(markup).toContain("It does not delete this Project");
    expect(markup).toContain("Choose replacement profile");
  });
});
