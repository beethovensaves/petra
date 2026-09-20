import { readFileSync } from "node:fs";

import type { PetraRegisteredProjectProfile } from "@petra/contracts";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { getReferenceProject } from "./fixtures.js";
import {
  CheckpointGuideSurface,
  selectRepresentativeProject,
} from "./CheckpointGuide.js";

const registeredScientificProfile = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;

describe("Wave 6 in-product checkpoint guide", () => {
  const scientific = getReferenceProject("inlet-cycle");
  const writing = getReferenceProject("field-guide");
  const productionScientific =
    scientific === undefined
      ? undefined
      : {
          ...scientific,
          profile: {
            ...scientific.profile,
            definitionFamily: "petra.scientific-evidence",
          },
        };

  it("keeps the complete task, reset, outcomes, and limits in the product", () => {
    if (productionScientific === undefined)
      throw new Error("Scientific Project missing.");
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <CheckpointGuideSurface
          projects={[productionScientific]}
          profiles={[registeredScientificProfile]}
          query={{ limit: 12 }}
          page={{ returned_count: 1, total_count: 1, has_more: false }}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("First user-testable checkpoint");
    expect(markup).toContain("Starting state");
    expect(markup).toContain("Inspect Project profile");
    expect(markup).toContain("Ask Petra from exact context");
    expect(markup).toContain("Manage durable Work");
    expect(markup).toContain("Decide a Review member");
    expect(markup).toContain("Inspect effect and recovery");
    expect(markup).toContain("Expected outcomes");
    expect(markup).toContain("Safe optional mutations");
    expect(markup).toContain("Open the reset control");
    expect(markup).toContain("Resume and Start again remain unavailable");
    expect(markup).toContain("not Wave 6 acceptance");
    expect(markup).toContain("/guide");
    expect(markup).toContain("ProjectDefinition revision");
    expect(markup).toContain(
      "Scientific evidence inquiry 1.0.0 is registered for petra.scientific-evidence",
    );
  });

  it("fails closed on a clean empty Project store", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <CheckpointGuideSurface
          projects={[]}
          profiles={[]}
          query={{ limit: 12 }}
          page={{ returned_count: 0, total_count: 0, has_more: false }}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Create the representative Project first");
    expect(markup).toContain("will not substitute fixture data");
    expect(markup).toContain("Choose a profile and create a Project");
  });

  it("prefers the scientific Project with represented task places", () => {
    if (productionScientific === undefined || writing === undefined) {
      throw new Error("Representative Projects missing.");
    }
    expect(
      selectRepresentativeProject([writing, productionScientific])?.id,
    ).toBe(productionScientific.id);
  });
});
