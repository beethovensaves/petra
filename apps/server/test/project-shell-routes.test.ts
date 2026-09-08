import { readFileSync } from "node:fs";

import type {
  PetraProjectObjectLocationView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectSourceView,
} from "@petra/contracts";
import type {
  ProjectObjectLocationViewReader,
  ProjectRelationshipViewReader,
  ProjectReviewViewReader,
  ProjectShellViewReader,
  ProjectSourceViewReader,
} from "@petra/core";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-shell-route-token";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

const sourceFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

const reviewFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-review-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectReviewView;

const relationshipFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-relationship-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectRelationshipView;

const locationFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-object-location-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectObjectLocationView;

const reader: ProjectShellViewReader = {
  listProjectShellViews: () => Promise.resolve([structuredClone(fixture)]),
  getProjectShellView: (projectId) =>
    Promise.resolve(
      projectId === fixture.project_id ? structuredClone(fixture) : undefined,
    ),
};

const sourceReader: ProjectSourceViewReader = {
  listProjectSourceViews: (projectId) =>
    Promise.resolve(
      projectId === sourceFixture.project_id
        ? [structuredClone(sourceFixture)]
        : [],
    ),
  getProjectSourceView: (projectId, sourceId) =>
    Promise.resolve(
      projectId === sourceFixture.project_id &&
        sourceId === sourceFixture.project_source_id
        ? structuredClone(sourceFixture)
        : undefined,
    ),
};

const reviewReader: ProjectReviewViewReader = {
  listProjectReviewViews: (projectId) =>
    Promise.resolve(
      projectId === reviewFixture.project_id
        ? [structuredClone(reviewFixture)]
        : [],
    ),
  getProjectReviewView: (projectId, reviewSessionId) =>
    Promise.resolve(
      projectId === reviewFixture.project_id &&
        reviewSessionId === reviewFixture.review_session_id
        ? structuredClone(reviewFixture)
        : undefined,
    ),
};

const relationshipReader: ProjectRelationshipViewReader = {
  getProjectRelationshipView: (projectId) =>
    Promise.resolve(
      projectId === relationshipFixture.project_id
        ? structuredClone(relationshipFixture)
        : undefined,
    ),
};

const locationReader: ProjectObjectLocationViewReader = {
  locateProjectObject: (request) =>
    Promise.resolve(
      request.project_id === locationFixture.project_id
        ? structuredClone(locationFixture)
        : undefined,
    ),
};

const authorized = (path: string): Request =>
  new Request(`http://petra.local${path}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

describe("authorized Project shell query routes", () => {
  it("returns the contract view for collections and exact Project identity", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: reader,
    });
    const collection = await petra.app.request(
      authorized("/api/queries/projects"),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual({ projects: [fixture] });

    const detail = await petra.app.request(
      authorized(`/api/queries/projects/${fixture.project_id}/shell`),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(fixture);
  });

  it("does not substitute another Project and preserves the API auth boundary", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: reader,
    });
    const missing = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/shell",
      ),
    );
    expect(missing.status).toBe(404);
    const missingBody = JSON.parse(await missing.text()) as unknown;
    expect(isRecord(missingBody)).toBe(true);
    if (!isRecord(missingBody) || !isRecord(missingBody.error)) {
      throw new Error("Expected Petra's structured missing-Project error.");
    }
    expect(missingBody.error.code).toBe("PROJECT_NOT_FOUND");

    const unauthorized = await petra.app.request("/api/queries/projects");
    expect(unauthorized.status).toBe(401);
  });

  it("fails visibly when the read boundary is absent or unavailable", async () => {
    const absent = createPetraApp({ authToken: TOKEN });
    const absentResponse = await absent.app.request(
      authorized("/api/queries/projects"),
    );
    expect(absentResponse.status).toBe(503);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectShellViews: {
        listProjectShellViews: () =>
          Promise.reject(new Error("repeatable-read snapshot unavailable")),
        getProjectShellView: () => Promise.resolve(undefined),
      },
    });
    const unavailableResponse = await unavailable.app.request(
      authorized("/api/queries/projects"),
    );
    expect(unavailableResponse.status).toBe(503);
    const unavailableBody = JSON.parse(
      await unavailableResponse.text(),
    ) as unknown;
    if (!isRecord(unavailableBody) || !isRecord(unavailableBody.error)) {
      throw new Error("Expected Petra's structured shell-read error.");
    }
    expect(unavailableBody.error.code).toBe("PROJECT_SHELL_READ_FAILED");
    expect(unavailableBody.error.message).toBe(
      "repeatable-read snapshot unavailable",
    );
  });

  it("returns only sources authorized for the exact Project", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectSourceViews: sourceReader,
    });
    const collection = await petra.app.request(
      authorized(`/api/queries/projects/${sourceFixture.project_id}/sources`),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual({
      sources: [sourceFixture],
    });

    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${sourceFixture.project_id}/sources/${sourceFixture.project_source_id}`,
      ),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(sourceFixture);

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/sources/${sourceFixture.project_source_id}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_SOURCE_NOT_FOUND");
  });

  it("returns only Review sessions authorized for the exact Project", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectReviewViews: reviewReader,
    });
    const collection = await petra.app.request(
      authorized(`/api/queries/projects/${reviewFixture.project_id}/reviews`),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual({
      reviews: [reviewFixture],
    });

    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${reviewFixture.project_id}/reviews/${reviewFixture.review_session_id}`,
      ),
    );
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toEqual(reviewFixture);

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/reviews/${reviewFixture.review_session_id}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_REVIEW_NOT_FOUND");
  });

  it("returns only the bounded relationship view authorized for the exact Project", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectRelationshipViews: relationshipReader,
    });
    const current = await petra.app.request(
      authorized(
        `/api/queries/projects/${relationshipFixture.project_id}/relationship-view`,
      ),
    );
    expect(current.status).toBe(200);
    await expect(current.json()).resolves.toEqual(relationshipFixture);

    const crossProject = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/relationship-view",
      ),
    );
    expect(crossProject.status).toBe(404);
    const body = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("PROJECT_RELATIONSHIP_NOT_FOUND");
  });

  it("returns semantic roles without client routes and validates bounded query input", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectObjectLocations: locationReader,
    });
    const parameters = new URLSearchParams({
      semanticKey: "petra.project-source",
      objectId: "project_source_01K4C000000000000000000007",
      taskIntent: "inspect",
    });
    const current = await petra.app.request(
      authorized(
        `/api/queries/projects/${locationFixture.project_id}/object-location?${parameters}`,
      ),
    );
    expect(current.status).toBe(200);
    const body = (await current.json()) as PetraProjectObjectLocationView;
    expect(body).toEqual(locationFixture);
    expect(body.content.primary_destination.role).toBe("sources");
    expect(JSON.stringify(body)).not.toContain("/projects/");

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${locationFixture.project_id}/object-location?${parameters}&ambientSelection=claim_01ARZ3NDEKTSV4RRFFQ69G5FBB`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_OBJECT_LOCATION_INVALID");

    const missingProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/object-location?${parameters}`,
      ),
    );
    expect(missingProject.status).toBe(404);
    const missingBody = JSON.parse(await missingProject.text()) as {
      error: { code: string };
    };
    expect(missingBody.error.code).toBe("PROJECT_NOT_FOUND");
  });
});
