import { readFileSync } from "node:fs";

import type {
  PetraProjectEffectiveControlsView,
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationExecutionView,
  PetraProjectHistoryCompensationPlanRequest,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryCompensationPreviewView,
  PetraProjectHistoryView,
  PetraProjectHistoryEpisodeViewV12,
  PetraProjectHistoryImpactViewV14,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedContinuationFailure,
  PetraProjectHistoryRetainedViewV12,
  PetraProjectInquiryView,
  PetraProjectObjectLocationView,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectSourceLifecycleView,
  PetraProjectSourceView,
  PetraProjectThreadView,
  PetraProjectWorkView,
} from "@petra/contracts";
import type {
  ProjectEffectiveControlsViewReader,
  ProjectHistoryViewReader,
  ProjectInquiryViewReader,
  ProjectObjectLocationViewReader,
  ProjectRelationshipViewReader,
  ProjectReviewViewReader,
  ProjectShellSelectionRequest,
  ProjectShellViewReader,
  ProjectSourceLifecycleViewReader,
  ProjectSourceViewReader,
  ProjectThreadViewReader,
  ProjectWorkViewReader,
} from "@petra/core";
import {
  ProjectHistoryCompensationExecutionUnavailableError,
  ProjectHistoryCompensationPlanUnavailableError,
  ProjectHistoryRetainedContinuationError,
  ProjectHistoryRecoveryPreviewUnavailableError,
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

const sourceLifecycleFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-source-lifecycle-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceLifecycleView;

const controlsFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectEffectiveControlsView;

const historyFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryView;

const historyEpisodeFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-episode-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryEpisodeViewV12;

const historyRetainedFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-retained-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedViewV12;

const historyContinuationFailureFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-retained-continuation-failure.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedContinuationFailure;

const historyImpactFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-impact-view-v1-4.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryImpactViewV14;

const historyRecoveryFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-recovery-assessment-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRecoveryAssessmentView;

const historyCompensationPreviewFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-preview-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPreviewView;

const historyCompensationPlanRequestFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-plan-request.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPlanRequest;

const historyCompensationPlanFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-plan-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPlanView;

const historyCompensationExecutionRequestFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-execution-request.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationExecutionRequest;

const historyCompensationExecutionFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-history-compensation-execution-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationExecutionView;

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

const sourceLifecycleReader: ProjectSourceLifecycleViewReader = {
  getProjectSourceLifecycleView: (projectId, projectSourceId, action) =>
    Promise.resolve(
      projectId === sourceLifecycleFixture.project_id &&
        projectSourceId === sourceLifecycleFixture.project_source_id &&
        action === sourceLifecycleFixture.content.requested_action
        ? structuredClone(sourceLifecycleFixture)
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

const historyReader: ProjectHistoryViewReader = {
  getRecentProjectHistoryView: (projectId) =>
    Promise.resolve(
      projectId === historyFixture.project_id
        ? structuredClone(historyFixture)
        : undefined,
    ),
  getProjectHistoryEpisodeView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyEpisodeFixture.project_id &&
        eventId === historyEpisodeFixture.event_id
        ? structuredClone(historyEpisodeFixture)
        : undefined,
    ),
  getProjectHistoryImpactView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyImpactFixture.project_id &&
        eventId === historyImpactFixture.event_id
        ? structuredClone(historyImpactFixture)
        : undefined,
    ),
  getProjectHistoryRecoveryAssessmentView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyRecoveryFixture.project_id &&
        eventId === historyRecoveryFixture.event_id
        ? structuredClone(historyRecoveryFixture)
        : undefined,
    ),
  getProjectHistoryCompensationPreviewView: (projectId, eventId) =>
    Promise.resolve(
      projectId === historyCompensationPreviewFixture.project_id &&
        eventId === historyCompensationPreviewFixture.event_id
        ? structuredClone(historyCompensationPreviewFixture)
        : undefined,
    ),
  composeProjectHistoryCompensationPlan: (request) =>
    Promise.resolve(
      request.project_id === historyCompensationPlanFixture.project_id &&
        request.event_id === historyCompensationPlanFixture.event_id &&
        request.preview_ref.content_hash ===
          historyCompensationPlanFixture.content.preview_ref.content_hash &&
        request.preview_ref.binding_hash ===
          historyCompensationPlanFixture.content.preview_ref.binding_hash
        ? structuredClone(historyCompensationPlanFixture)
        : undefined,
    ),
  listRetainedProjectHistoryView: (projectId, request = {}) => {
    if (projectId !== historyRetainedFixture.project_id) {
      return Promise.resolve(undefined);
    }
    const view = structuredClone(historyRetainedFixture);
    view.content.query = {
      limit: request.limit ?? 50,
      filters: request.filters ?? {},
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
    };
    return Promise.resolve(view);
  },
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

const authorizedJson = (path: string, body: unknown): Request =>
  new Request(`http://petra.local${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
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

  it("returns authenticated bounded Recent changes without accepting client history state", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyFixture.project_id}/history/recent`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyFixture);

    const override = await petra.app.request(
      authorized(`${path}?limit=20&graphSnapshot=local`),
    );
    expect(override.status).toBe(422);
    const overrideBody = (await override.json()) as {
      error: { code: string };
    };
    expect(overrideBody.error.code).toBe("PROJECT_HISTORY_QUERY_INVALID");

    const crossProject = await petra.app.request(
      authorized(
        "/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/recent",
      ),
    );
    expect(crossProject.status).toBe(404);

    const unauthorized = await petra.app.request(path);
    expect(unauthorized.status).toBe(401);
  });

  it("returns one authenticated event-selected causal History episode", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyEpisodeFixture.project_id}/history/events/${historyEpisodeFixture.event_id}`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyEpisodeFixture);

    const invalid = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyEpisodeFixture.project_id}/history/events/not-an-event?order=global`,
      ),
    );
    expect(invalid.status).toBe(422);
    const invalidBody = (await invalid.json()) as {
      error: { code: string };
    };
    expect(invalidBody.error.code).toBe("PROJECT_HISTORY_EVENT_INVALID");

    const missing = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyEpisodeFixture.project_id}/history/events/event_01ARZ3NDEKTSV4RRFFQ69G5FZZ`,
      ),
    );
    expect(missing.status).toBe(404);
  });

  it("returns authenticated bounded dependency impact for one exact History event", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyImpactFixture.project_id}/history/events/${historyImpactFixture.event_id}/impact`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyImpactFixture);

    const filtered = await petra.app.request(
      authorized(`${path}?kind=projection`),
    );
    expect(filtered.status).toBe(422);
    const filteredBody = (await filtered.json()) as {
      error: { code: string };
    };
    expect(filteredBody.error.code).toBe(
      "PROJECT_HISTORY_IMPACT_TARGET_INVALID",
    );

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/events/${historyImpactFixture.event_id}/impact`,
      ),
    );
    expect(crossProject.status).toBe(404);

    const unauthorized = await petra.app.request(path);
    expect(unauthorized.status).toBe(401);
  });

  it("returns one authenticated read-only ChangeSet recovery assessment", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyRecoveryFixture.project_id}/history/events/${historyRecoveryFixture.event_id}/recovery`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyRecoveryFixture);

    const override = await petra.app.request(
      authorized(`${path}?execute=true`),
    );
    expect(override.status).toBe(422);
    const overrideBody = (await override.json()) as {
      error: { code: string };
    };
    expect(overrideBody.error.code).toBe(
      "PROJECT_HISTORY_RECOVERY_TARGET_INVALID",
    );

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/events/${historyRecoveryFixture.event_id}/recovery`,
      ),
    );
    expect(crossProject.status).toBe(404);
    expect((await petra.app.request(path)).status).toBe(401);
  });

  it("returns one authenticated read-only revision-bound compensation preview", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyCompensationPreviewFixture.project_id}/history/events/${historyCompensationPreviewFixture.event_id}/recovery/preview`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      historyCompensationPreviewFixture,
    );

    const execute = await petra.app.request(authorized(`${path}?execute=true`));
    expect(execute.status).toBe(422);
    const executeBody = (await execute.json()) as {
      error: { code: string };
    };
    expect(executeBody.error.code).toBe(
      "PROJECT_HISTORY_COMPENSATION_PREVIEW_TARGET_INVALID",
    );

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/history/events/${historyCompensationPreviewFixture.event_id}/recovery/preview`,
      ),
    );
    expect(crossProject.status).toBe(404);
    expect((await petra.app.request(path)).status).toBe(401);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: {
        ...historyReader,
        getProjectHistoryCompensationPreviewView: () => {
          throw new ProjectHistoryRecoveryPreviewUnavailableError(
            "The exact recovery assessment is blocked.",
          );
        },
      },
    });
    const blocked = await unavailable.app.request(authorized(path));
    expect(blocked.status).toBe(409);
    const blockedBody = (await blocked.json()) as {
      error: { code: string };
    };
    expect(blockedBody.error.code).toBe(
      "PROJECT_HISTORY_RECOVERY_PREVIEW_UNAVAILABLE",
    );
  });

  it("composes a confirmed compensation command plan without submitting it", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyCompensationPlanRequestFixture.project_id}/history/events/${historyCompensationPlanRequestFixture.event_id}/recovery/plan`;
    const response = await petra.app.request(
      authorizedJson(path, historyCompensationPlanRequestFixture),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      historyCompensationPlanFixture,
    );

    const unconfirmed = structuredClone(
      historyCompensationPlanRequestFixture,
    ) as
      | PetraProjectHistoryCompensationPlanRequest
      | { confirmation: { confirmed: boolean } };
    unconfirmed.confirmation.confirmed = false;
    const rejected = await petra.app.request(authorizedJson(path, unconfirmed));
    expect(rejected.status).toBe(422);

    const queryOverride = await petra.app.request(
      authorizedJson(
        `${path}?execute=true`,
        historyCompensationPlanRequestFixture,
      ),
    );
    expect(queryOverride.status).toBe(422);

    const unauthenticated = await petra.app.request(
      new Request(`http://petra.local${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(historyCompensationPlanRequestFixture),
      }),
    );
    expect(unauthenticated.status).toBe(401);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: {
        ...historyReader,
        composeProjectHistoryCompensationPlan: () => {
          throw new ProjectHistoryCompensationPlanUnavailableError(
            "The exact preview is stale.",
          );
        },
      },
    });
    const stale = await unavailable.app.request(
      authorizedJson(path, historyCompensationPlanRequestFixture),
    );
    expect(stale.status).toBe(409);
    const staleBody = (await stale.json()) as { error: { code: string } };
    expect(staleBody.error.code).toBe(
      "PROJECT_HISTORY_COMPENSATION_PLAN_UNAVAILABLE",
    );
  });

  it("executes one exact confirmed compensation plan with retained per-command outcomes", async () => {
    const execution = {
      executeProjectHistoryCompensationPlan: (
        request: PetraProjectHistoryCompensationExecutionRequest,
      ) =>
        Promise.resolve(
          request.project_id ===
            historyCompensationExecutionFixture.project_id &&
            request.event_id === historyCompensationExecutionFixture.event_id &&
            request.plan.content_hash ===
              historyCompensationExecutionFixture.content.plan_ref.content_hash
            ? structuredClone(historyCompensationExecutionFixture)
            : undefined,
        ),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryCompensationExecution: execution,
    });
    const path = `/api/commands/projects/${historyCompensationExecutionRequestFixture.project_id}/history/events/${historyCompensationExecutionRequestFixture.event_id}/recovery/execute`;
    const response = await petra.app.request(
      authorizedJson(path, historyCompensationExecutionRequestFixture),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      historyCompensationExecutionFixture,
    );

    const unconfirmed = structuredClone(
      historyCompensationExecutionRequestFixture,
    ) as
      | PetraProjectHistoryCompensationExecutionRequest
      | { execution_confirmation: { confirmed: boolean } };
    unconfirmed.execution_confirmation.confirmed = false;
    expect(
      (await petra.app.request(authorizedJson(path, unconfirmed))).status,
    ).toBe(422);
    expect(
      (
        await petra.app.request(
          authorizedJson(
            `${path}?atomic=true`,
            historyCompensationExecutionRequestFixture,
          ),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await petra.app.request(
          new Request(`http://petra.local${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(historyCompensationExecutionRequestFixture),
          }),
        )
      ).status,
    ).toBe(401);

    const unavailable = createPetraApp({
      authToken: TOKEN,
      projectHistoryCompensationExecution: {
        executeProjectHistoryCompensationPlan: () => {
          throw new ProjectHistoryCompensationExecutionUnavailableError(
            "The exact plan is stale or altered.",
          );
        },
      },
    });
    const stale = await unavailable.app.request(
      authorizedJson(path, historyCompensationExecutionRequestFixture),
    );
    expect(stale.status).toBe(409);
    const staleBody = (await stale.json()) as { error: { code: string } };
    expect(staleBody.error.code).toBe(
      "PROJECT_HISTORY_COMPENSATION_EXECUTION_UNAVAILABLE",
    );
  });

  it("returns authenticated retained History pages and rejects unsafe query state", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectHistoryViews: historyReader,
    });
    const path = `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&family=project_source_replacement&command_name=CreateProjectSourceReplacement&event_type=project_source.replacement_created&actor_id=actor_01ARZ3NDEKTSV4RRFFQ69G5FAV&outcome=completed&effect=source_replacement_created&target_semantic_key=petra.project-source&target_object_id=project_source_01K4C000000000000000000041&recorded_from=2026-09-10T00%3A00%3A00.000Z&recorded_through=2026-09-10T23%3A59%3A59.999Z`;
    const response = await petra.app.request(authorized(path));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(historyRetainedFixture);

    const firstPage = historyRetainedFixture.content.page;
    if (!firstPage.has_more) throw new Error("Expected a retained cursor.");
    const cursor = firstPage.next_cursor;
    const continued = await petra.app.request(
      authorized(`${path}&cursor=${encodeURIComponent(cursor)}`),
    );
    expect(continued.status).toBe(200);
    const continuedBody =
      (await continued.json()) as PetraProjectHistoryRetainedViewV12;
    expect(continuedBody.content.query.cursor).toBe(cursor);

    const oldOffset = await petra.app.request(
      authorized(`${path}&cursor=offset%3A1`),
    );
    expect(oldOffset.status).toBe(422);
    const oldOffsetBody =
      (await oldOffset.json()) as PetraProjectHistoryRetainedContinuationFailure;
    expect(oldOffsetBody).toMatchObject({
      schema_name: "petra.project-history-retained-continuation-failure",
      schema_version: "1.0.0",
      error: {
        code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID",
        subcode: "CURSOR_INVALID",
        message: historyContinuationFailureFixture.error.message,
        restart: historyContinuationFailureFixture.error.restart,
      },
    });

    const unboundCursor = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&cursor=phc1.eyJ2IjoxLCJwcm9qZWN0Ijoib3BhcXVlIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
      ),
    );
    expect(unboundCursor.status).toBe(422);

    const incompleteTarget = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&target_semantic_key=petra.change-set`,
      ),
    );
    expect(incompleteTarget.status).toBe(422);
    const incompleteTargetBody = (await incompleteTarget.json()) as {
      error: { subcode?: string };
    };
    expect(incompleteTargetBody.error.subcode).toBeUndefined();
    const reversedTime = await petra.app.request(
      authorized(
        `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?recorded_from=2026-09-11T00%3A00%3A00.000Z&recorded_through=2026-09-10T00%3A00%3A00.000Z`,
      ),
    );
    expect(reversedTime.status).toBe(422);
    expect(await petra.app.request(path)).toEqual(
      expect.objectContaining({ status: 401 }),
    );
  });

  it("returns stable non-disclosing retained History continuation subcodes", async () => {
    const page = historyRetainedFixture.content.page;
    if (!page.has_more) throw new Error("Expected a retained cursor fixture.");
    const subcodes = [
      "CURSOR_INVALID",
      "CURSOR_BINDING_MISMATCH",
      "SNAPSHOT_UNAVAILABLE",
    ] as const;
    for (const subcode of subcodes) {
      const failingReader: ProjectHistoryViewReader = {
        ...historyReader,
        listRetainedProjectHistoryView: () =>
          Promise.reject(
            new ProjectHistoryRetainedContinuationError(
              subcode,
              `Internal continuation detail for ${subcode}`,
            ),
          ),
      };
      const petra = createPetraApp({
        authToken: TOKEN,
        projectHistoryViews: failingReader,
      });
      const response = await petra.app.request(
        authorized(
          `/api/queries/projects/${historyRetainedFixture.project_id}/history/events?limit=1&cursor=${encodeURIComponent(page.next_cursor)}`,
        ),
      );
      expect(response.status).toBe(422);
      const body =
        (await response.json()) as PetraProjectHistoryRetainedContinuationFailure;
      expect(body).toMatchObject({
        schema_name: "petra.project-history-retained-continuation-failure",
        schema_version: "1.0.0",
        error: {
          code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID",
          subcode,
          message: historyContinuationFailureFixture.error.message,
          restart: historyContinuationFailureFixture.error.restart,
        },
      });
      expect(JSON.stringify(body)).not.toContain(
        "Internal continuation detail",
      );
      expect(JSON.stringify(body)).not.toContain(page.next_cursor);
    }
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

  it("returns the exact read-only source lifecycle preview", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectSourceLifecycleViews: sourceLifecycleReader,
    });
    const path = `/api/queries/projects/${sourceLifecycleFixture.project_id}/sources/${sourceLifecycleFixture.project_source_id}/lifecycle`;
    const response = await petra.app.request(
      authorized(`${path}?requested_action=exclude_project_source`),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as PetraProjectSourceLifecycleView;
    expect(body).toEqual(sourceLifecycleFixture);
    expect(body.content.operation.state).toBe("unavailable");
    expect(
      body.content.retention.find((item) => item.area === "local_artifact")
        ?.state,
    ).toBe("deletion_unavailable");

    for (const query of [
      "",
      "?requested_action=unknown",
      "?requested_action=exclude_project_source&requested_action=restore_project_source",
      "?requested_action=exclude_project_source&execute=true",
    ]) {
      const malformed = await petra.app.request(authorized(`${path}${query}`));
      expect(malformed.status).toBe(422);
      const malformedBody = (await malformed.json()) as {
        error: { code: string };
      };
      expect(malformedBody.error.code).toBe(
        "PROJECT_SOURCE_LIFECYCLE_QUERY_INVALID",
      );
    }

    const crossProject = await petra.app.request(
      authorized(
        `/api/queries/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FZZ/sources/${sourceLifecycleFixture.project_source_id}/lifecycle?requested_action=exclude_project_source`,
      ),
    );
    expect(crossProject.status).toBe(404);
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
