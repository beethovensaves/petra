import { readFileSync } from "node:fs";

import type {
  PetraProjectEffectiveControlsView,
  PetraProjectInquiryView,
  PetraProjectObjectLocationView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectSourceView,
  PetraProjectThreadView,
  PetraProjectWorkView,
} from "@petra/contracts";
import type {
  ProjectEffectiveControlsViewReader,
  ProjectInquiryViewReader,
  ProjectObjectLocationViewReader,
  ProjectRelationshipViewReader,
  ProjectReviewViewReader,
  ProjectShellSelectionRequest,
  ProjectShellViewReader,
  ProjectSourceViewReader,
  ProjectThreadViewReader,
  ProjectWorkViewReader,
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

const shellV11Fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellViewV11;

const sourceFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

const controlsFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectEffectiveControlsView;

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

const workCollectionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-work-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const workDetailFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-work-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const threadCollectionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-thread-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

const threadDetailFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-thread-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

const inquiryCollectionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-inquiry-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const inquiryDetailFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-inquiry-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

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

const controlsReader: ProjectEffectiveControlsViewReader = {
  getProjectEffectiveControlsView: (projectId) =>
    Promise.resolve(
      projectId === controlsFixture.project_id
        ? structuredClone(controlsFixture)
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

const workReader: ProjectWorkViewReader = {
  listProjectWorkView: (projectId) =>
    Promise.resolve(
      projectId === workCollectionFixture.project_id
        ? structuredClone(workCollectionFixture)
        : undefined,
    ),
  getProjectWorkView: (projectId, workUnitId) => {
    const expectedWorkUnitId =
      workDetailFixture.content.view_kind === "detail"
        ? workDetailFixture.content.summary.work_unit_ref.work_unit_id
        : undefined;
    return Promise.resolve(
      projectId === workDetailFixture.project_id &&
        workUnitId === expectedWorkUnitId
        ? structuredClone(workDetailFixture)
        : undefined,
    );
  },
};

const threadReader: ProjectThreadViewReader = {
  listProjectThreadView: (projectId) =>
    Promise.resolve(
      projectId === threadCollectionFixture.project_id
        ? structuredClone(threadCollectionFixture)
        : undefined,
    ),
  getProjectThreadView: (projectId, projectThreadId) => {
    const expectedThreadId =
      threadDetailFixture.content.view_kind === "detail"
        ? threadDetailFixture.content.summary.thread_ref.project_thread_id
        : undefined;
    return Promise.resolve(
      projectId === threadDetailFixture.project_id &&
        projectThreadId === expectedThreadId
        ? structuredClone(threadDetailFixture)
        : undefined,
    );
  },
};

const inquiryReader: ProjectInquiryViewReader = {
  listProjectInquiryView: (projectId) =>
    Promise.resolve(
      projectId === inquiryCollectionFixture.project_id
        ? structuredClone(inquiryCollectionFixture)
        : undefined,
    ),
  getProjectInquiryView: (projectId, objectiveId) => {
    const expectedObjectiveId =
      inquiryDetailFixture.content.view_kind === "detail"
        ? inquiryDetailFixture.content.summary.inquiry_anchor_ref.objective_id
        : undefined;
    return Promise.resolve(
      projectId === inquiryDetailFixture.project_id &&
        objectiveId === expectedObjectiveId
        ? structuredClone(inquiryDetailFixture)
        : undefined,
    );
  },
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

  it("composes an exact optional selection into the 1.1 shell view", async () => {
    let observedSelection: ProjectShellSelectionRequest | undefined;
    const v11Reader: ProjectShellViewReader = {
      listProjectShellViews: () =>
        Promise.resolve([structuredClone(shellV11Fixture)]),
      getProjectShellView: (projectId, selection) => {
        observedSelection = selection;
        return Promise.resolve(
          projectId === shellV11Fixture.project_id
            ? structuredClone(shellV11Fixture)
            : undefined,
        );
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectShellViews: v11Reader,
    });
    const response = await petra.app.request(
      authorized(
        `/api/queries/projects/${shellV11Fixture.project_id}/shell?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&revision=1&taskIntent=inspect`,
      ),
    );

    expect(response.status).toBe(200);
    expect(observedSelection).toEqual({
      object_ref: {
        semantic_key: "petra.project-source",
        object_id: "project_source_01K4C000000000000000000007",
        revision: 1,
      },
      task_intent: "inspect",
    });
    await expect(response.json()).resolves.toEqual(shellV11Fixture);

    const invalid = await petra.app.request(
      authorized(
        `/api/queries/projects/${shellV11Fixture.project_id}/shell?semanticKey=petra.project-source`,
      ),
    );
    expect(invalid.status).toBe(422);
  });

  it("returns exact read-only effective controls and rejects client overrides", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectEffectiveControls: controlsReader,
    });
    const response = await petra.app.request(
      authorized(
        `/api/queries/projects/${controlsFixture.project_id}/effective-controls`,
      ),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(controlsFixture);

    const override = await petra.app.request(
      authorized(
        `/api/queries/projects/${controlsFixture.project_id}/effective-controls?profile=personal`,
      ),
    );
    expect(override.status).toBe(422);
    const overrideBody = JSON.parse(await override.text()) as unknown;
    expect(isRecord(overrideBody)).toBe(true);
    if (!isRecord(overrideBody) || !isRecord(overrideBody.error)) {
      throw new Error("Expected Petra's structured invalid-target error.");
    }
    expect(overrideBody.error.code).toBe(
      "PROJECT_EFFECTIVE_CONTROLS_TARGET_INVALID",
    );
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

  it("returns bounded Work collection and exact detail without promoting output authority", async () => {
    if (
      workCollectionFixture.content.view_kind !== "collection" ||
      workDetailFixture.content.view_kind !== "detail"
    ) {
      throw new Error("Expected collection and detail Work fixtures.");
    }
    const petra = createPetraApp({
      authToken: TOKEN,
      projectWorkViews: workReader,
    });
    const collection = await petra.app.request(
      authorized(
        `/api/queries/projects/${workCollectionFixture.project_id}/work?limit=50`,
      ),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual(workCollectionFixture);

    const workUnitId =
      workDetailFixture.content.summary.work_unit_ref.work_unit_id;
    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${workDetailFixture.project_id}/work/${workUnitId}`,
      ),
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as PetraProjectWorkView;
    expect(detailBody).toEqual(workDetailFixture);
    if (detailBody.content.view_kind !== "detail") {
      throw new Error("Expected Work detail response.");
    }
    expect(detailBody.content.outputs[0]?.availability.state).toBe(
      "staged_handle_only",
    );
    expect(
      detailBody.content.controls.every(
        (control) => control.operation_state === "unavailable",
      ),
    ).toBe(true);

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${workDetailFixture.project_id}/work?limit=0&sort=urgency`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_WORK_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/work/${workUnitId}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const crossProjectBody = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(crossProjectBody.error.code).toBe("PROJECT_WORK_NOT_FOUND");
  });

  it("returns bounded Project threads and exact metadata-only turn detail", async () => {
    if (
      threadCollectionFixture.content.view_kind !== "collection" ||
      threadDetailFixture.content.view_kind !== "detail"
    ) {
      throw new Error(
        "Expected collection and detail Project thread fixtures.",
      );
    }
    const petra = createPetraApp({
      authToken: TOKEN,
      projectThreadViews: threadReader,
    });
    const collection = await petra.app.request(
      authorized(
        `/api/queries/projects/${threadCollectionFixture.project_id}/threads?limit=50`,
      ),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual(threadCollectionFixture);

    const threadId =
      threadDetailFixture.content.summary.thread_ref.project_thread_id;
    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${threadDetailFixture.project_id}/threads/${threadId}`,
      ),
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as PetraProjectThreadView;
    expect(detailBody).toEqual(threadDetailFixture);
    if (detailBody.content.view_kind !== "detail") {
      throw new Error("Expected Project thread detail response.");
    }
    expect(detailBody.content.turns[0]?.input_representation.state).toBe(
      "hash_only",
    );
    expect(detailBody.content.turns[0]?.response_representation.state).toBe(
      "metadata_only",
    );
    expect(
      detailBody.content.operations.every(
        (operation) => operation.state === "unavailable",
      ),
    ).toBe(true);

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${threadDetailFixture.project_id}/threads?limit=0&sort=recent`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_THREAD_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/threads/${threadId}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const crossProjectBody = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(crossProjectBody.error.code).toBe("PROJECT_THREAD_NOT_FOUND");
  });

  it("returns mapped inquiries with exact Work/result authority boundaries", async () => {
    if (
      inquiryCollectionFixture.content.view_kind !== "collection" ||
      inquiryDetailFixture.content.view_kind !== "detail"
    ) {
      throw new Error("Expected collection and detail inquiry fixtures.");
    }
    const petra = createPetraApp({
      authToken: TOKEN,
      projectInquiryViews: inquiryReader,
    });
    const collection = await petra.app.request(
      authorized(
        `/api/queries/projects/${inquiryCollectionFixture.project_id}/inquiries?limit=50`,
      ),
    );
    expect(collection.status).toBe(200);
    await expect(collection.json()).resolves.toEqual(inquiryCollectionFixture);

    const objectiveId =
      inquiryDetailFixture.content.summary.inquiry_anchor_ref.objective_id;
    const detail = await petra.app.request(
      authorized(
        `/api/queries/projects/${inquiryDetailFixture.project_id}/inquiries/${objectiveId}`,
      ),
    );
    expect(detail.status).toBe(200);
    const body = (await detail.json()) as PetraProjectInquiryView;
    expect(body).toEqual(inquiryDetailFixture);
    if (body.content.view_kind !== "detail") {
      throw new Error("Expected inquiry detail response.");
    }
    expect(body.content.summary.resolution_boundary).toBe(
      "authored_status_only",
    );
    expect(body.content.basis.state).toBe("unavailable");
    expect(body.content.result_links[0]?.bearing).toBe("addresses");
    expect(
      body.content.operations.every(
        (operation) => operation.state === "unavailable",
      ),
    ).toBe(true);

    const malformed = await petra.app.request(
      authorized(
        `/api/queries/projects/${inquiryDetailFixture.project_id}/inquiries?limit=0&authored_status=unknown&sort=recent`,
      ),
    );
    expect(malformed.status).toBe(422);
    const malformedBody = JSON.parse(await malformed.text()) as {
      error: { code: string };
    };
    expect(malformedBody.error.code).toBe("PROJECT_INQUIRY_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/inquiries/${objectiveId}`,
      ),
    );
    expect(crossProject.status).toBe(404);
    const crossProjectBody = JSON.parse(await crossProject.text()) as {
      error: { code: string };
    };
    expect(crossProjectBody.error.code).toBe("PROJECT_INQUIRY_NOT_FOUND");
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
