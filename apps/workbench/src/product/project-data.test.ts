import { readFileSync } from "node:fs";

import type {
  PetraProject,
  PetraProjectDefinition,
  PetraProjectEffectiveControlsView,
  PetraProjectHistoryCompensationExecutionView,
  PetraProjectHistoryCompensationPlanView,
  PetraProjectHistoryView,
  PetraProjectHistoryEpisodeViewV12,
  PetraProjectHistoryCompensationPreviewView,
  PetraProjectHistoryImpactViewV14,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedContinuationFailure,
  PetraProjectHistoryRetainedViewV12,
  PetraProjectInquiryView,
  PetraProjectObjectLocationView,
  PetraProjectObjective,
  PetraProjectRelationshipView,
  PetraProjectReviewView,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectSource,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceReplacementRetraction,
  PetraProjectSourceView,
  PetraProjectThreadView,
  PetraProjectWorkView,
} from "@petra/contracts";
import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  composeProjectHistoryCompensationPlan,
  createProjectSourceReplacement,
  executeProjectSourceLifecycleCommand,
  executeProjectHistoryCompensationPlan,
  getRecentProjectHistory,
  getProjectHistoryEpisode,
  getProjectHistoryCompensationPreview,
  getProjectHistoryImpact,
  getProjectHistoryRecoveryAssessment,
  getRetainedProjectHistory,
  graphQuestionFromView,
  loadProjectObjectLocationRedirect,
  loadProjectPetraThread,
  loadProjectRecord,
  loadProjectSettings,
  loadProjectWorkCollection,
  loadProjectWorkDetail,
  projectRecordFromShellView,
  retractProjectSourceReplacement,
  petraThreadFromView,
  reviewSessionFromView,
  sourceRecordFromView,
  semanticDestinationPath,
  workProjectFromView,
  workUnitFromView,
} from "./project-data.js";

const view = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

const shellV11View = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellViewV11;

const controlledWritingProject = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProject;

const controlledWritingDefinition = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-definition-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectDefinition;

const controlledWritingObjective = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-objective-controlled-writing.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectObjective;

const sourceView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

const sourceRecord = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSource;

const sourceLifecycleReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-lifecycle-receipt.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceLifecycleReceipt;

const sourceReplacement = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacement;

const sourceReplacementCreatedReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement-receipt-created.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacementReceipt;

const sourceReplacementRetractedReceipt = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement-receipt-retracted.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacementReceipt;

const sourceReplacementRetraction = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-source-replacement-retraction.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceReplacementRetraction;

const controlsView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectEffectiveControlsView;

const historyView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryView;

const historyEpisodeView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-episode-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryEpisodeViewV12;

const historyRetainedView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-retained-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedViewV12;

const historyContinuationFailure = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-retained-continuation-failure.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedContinuationFailure;

const historyImpactView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-impact-view-v1-4.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryImpactViewV14;

const historyRecoveryView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-recovery-assessment-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRecoveryAssessmentView;

const historyCompensationPreviewView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-compensation-preview-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPreviewView;

const historyCompensationPlanView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-compensation-plan-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationPlanView;

const historyCompensationExecutionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-compensation-execution-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryCompensationExecutionView;

const reviewView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-review-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectReviewView;

const relationshipView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-relationship-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectRelationshipView;

const locationView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-object-location-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectObjectLocationView;

const workCollectionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-work-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const workDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-work-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectWorkView;

const inquiryCollectionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-inquiry-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const inquiryDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-inquiry-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectInquiryView;

const threadCollectionView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-thread-view-collection.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

const threadDetailView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-thread-view-detail.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectThreadView;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Project shell workbench adapter", () => {
  it("maps exact definition terminology and projection attention without mutating the view", () => {
    const before = structuredClone(view);
    const project = projectRecordFromShellView(view);

    expect(project.id).toBe(view.project_id);
    expect(project.title).toBe("Competing explanations");
    expect(project.objective).toContain("exact inspectable passages");
    expect(project.profile.id).toBe(
      "project_definition_01K4C000000000000000000001",
    );
    expect(project.profile.terms).toEqual({
      focus: "Research question",
      focusPlural: "Research questions",
      finding: "Claim",
      findingPlural: "Claims",
      reference: "Source",
      referencePlural: "Sources",
    });
    expect(project.projection.state).toBe("catching_up");
    expect(project.attention).toEqual([
      expect.objectContaining({
        id: "attention_01K4C000000000000000000008",
        title: "Graph projection is catching up",
      }),
    ]);
    expect(project.snapshot.label).toBe("Authority event 3");
    expect(view).toEqual(before);
  });

  it("maps a project-authored controlled-writing definition without scientific assumptions", () => {
    const controlledWritingShell = structuredClone(shellV11View);
    controlledWritingShell.project_id = controlledWritingProject.project_id;
    controlledWritingShell.content.project = {
      project_id: controlledWritingProject.project_id,
      revision: controlledWritingProject.revision,
      name: controlledWritingProject.name,
      description:
        controlledWritingProject.description ??
        "A project-authored controlled-writing Project.",
      status: controlledWritingProject.status,
      updated_at: controlledWritingProject.updated_at,
    };
    controlledWritingShell.content.definition = {
      project_definition_id: controlledWritingDefinition.project_definition_id,
      revision: controlledWritingDefinition.revision,
      content_hash: controlledWritingDefinition.content_hash,
      definition_family: controlledWritingDefinition.definition_family,
      label: controlledWritingDefinition.content.label,
      description: controlledWritingDefinition.content.description,
      kernel_compatibility:
        controlledWritingDefinition.content.kernel_compatibility,
      terms: controlledWritingDefinition.content.terms,
      supported_places: controlledWritingDefinition.content.supported_places,
    };
    controlledWritingShell.content.current_objective = {
      objective_id: controlledWritingObjective.objective_id,
      revision: controlledWritingObjective.revision,
      content_hash: controlledWritingObjective.content_hash,
      objective_kind: controlledWritingObjective.content.objective_kind,
      statement: controlledWritingObjective.content.statement,
      status: controlledWritingObjective.content.status,
    };
    const sourceSummary = controlledWritingShell.content.place_summaries.find(
      (place) => place.role === "sources",
    );
    if (sourceSummary === undefined) {
      throw new Error("Expected a sources place summary.");
    }
    sourceSummary.label = "Authority sources";

    const project = projectRecordFromShellView(controlledWritingShell);

    expect(project.profile).toEqual(
      expect.objectContaining({
        id: controlledWritingDefinition.project_definition_id,
        label: "Controlled writing",
        terms: {
          focus: "Document purpose",
          focusPlural: "Document purposes",
          finding: "Requirement",
          findingPlural: "Requirements",
          reference: "Authority source",
          referencePlural: "Authority sources",
        },
      }),
    );
    expect(project.objective).toContain("controlled operating procedure");
    expect(
      project.placeSummaries?.find((place) => place.role === "sources")?.label,
    ).toBe("Authority sources");
  });

  it("keeps a Project with no selected Objective explicit and usable", () => {
    const early = structuredClone(view);
    delete early.content.current_objective;
    early.content.attention = [];
    early.content.projection = {
      state: "unavailable",
      label: "Projection unavailable",
      detail: "No graph checkpoint is registered.",
      represented_event_position: 0,
      observed_event_position: 0,
      pending_records: 0,
    };

    const project = projectRecordFromShellView(early);
    expect(project.state).toBe("early");
    expect(project.objective).toBe(
      "No current Project focus has been selected.",
    );
    expect(project.projection.state).toBe("unavailable");
    expect(project.sources).toEqual([]);
    expect(project.recentDecisions).toEqual([]);
  });

  it("retains honest place coverage and exact semantic selection from shell 1.1", () => {
    const before = structuredClone(shellV11View);
    const project = projectRecordFromShellView(shellV11View);

    expect(project.placeSummaries).toHaveLength(9);
    expect(project.placeSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "work",
          coverage: "complete",
          itemCount: 2,
          attentionCount: 1,
        }),
        expect.objectContaining({
          role: "history",
          coverage: "partial",
          limitation:
            "A composed causal Project History read is not implemented.",
        }),
      ]),
    );
    expect(project.selection).toEqual(
      expect.objectContaining({
        state: "current",
        semanticKey: "petra.project-source",
        objectId: "project_source_01K4C000000000000000000007",
        resolvedRevision: 1,
        destination: "sources",
      }),
    );
    expect(shellV11View).toEqual(before);
  });

  it("requests and verifies an exact route selection in the shell snapshot", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify(shellV11View), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      "http://petra.test/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/sources/project_source_01K4C000000000000000000007?semanticKey=petra.project-source&revision=1&recordHash=sha256%3Afa6206f9dd4c3a574d7afb9df2c77a3b4522f18be88d7dca01143534590f7b5c",
    );
    const args: LoaderFunctionArgs = {
      request: new Request(url),
      url,
      pattern: "/projects/:projectId",
      params: {
        projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      },
      context: new RouterContextProvider(),
    };

    const project = await loadProjectRecord(args);

    expect(project.selection?.recordHash).toBe(
      "sha256:fa6206f9dd4c3a574d7afb9df2c77a3b4522f18be88d7dca01143534590f7b5c",
    );
    const requestPath = fetch.mock.calls[0]?.[0];
    expect(typeof requestPath).toBe("string");
    if (typeof requestPath !== "string") {
      throw new TypeError("Expected the shell loader to request a URL string.");
    }
    expect(requestPath).toContain(
      "/shell?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&revision=1&taskIntent=inspect",
    );

    const incompleteUrl = new URL(url);
    incompleteUrl.searchParams.delete("recordHash");
    await expect(
      loadProjectRecord({
        ...args,
        request: new Request(incompleteUrl),
        url: incompleteUrl,
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("loads Settings from one exact Project and definition snapshot", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        Response.json(
          path.endsWith("/effective-controls") ? controlsView : shellV11View,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      `http://petra.test/settings?project=${controlsView.project_id}`,
    );
    const data = await loadProjectSettings({
      request: new Request(url),
      url,
      pattern: "/settings",
      params: {},
      context: new RouterContextProvider(),
    });

    expect(data.selectedProject?.id).toBe(controlsView.project_id);
    expect(data.controls?.content.sections.privacy.state).toBe("effective");
    expect(data.controls?.content.sections.capability.state).toBe(
      "unavailable",
    );
    expect(fetch).toHaveBeenCalledTimes(2);

    const noTarget = new URL("http://petra.test/settings");
    await expect(
      loadProjectSettings({
        request: new Request(noTarget),
        url: noTarget,
        pattern: "/settings",
        params: {},
        context: new RouterContextProvider(),
      }),
    ).resolves.toEqual({});
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reads the bounded causal Recent changes contract without mixing graph history", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyView));
    vi.stubGlobal("fetch", fetch);

    const result = await getRecentProjectHistory(historyView.project_id);

    expect(result).toEqual(historyView);
    expect(result.content.quick_window_limit).toBe(10);
    expect(result.content.graph_navigation_history).toBe(
      "client_local_separate",
    );
    expect(result.content.changes[0]?.recovery.eligibility).toBe("eligible");
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyView.project_id}/history/recent`,
    );
    expect(
      new Headers(fetch.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBe("Bearer petra-local-development");

    const wrongProject = structuredClone(historyView);
    wrongProject.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongProject));
    await expect(
      getRecentProjectHistory(historyView.project_id),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads an exact event-selected episode without asserting cross-family order", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyEpisodeView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryEpisode(
      historyEpisodeView.project_id,
      historyEpisodeView.event_id,
    );

    expect(result).toEqual(historyEpisodeView);
    expect(result.content.stream_order.order_kind).toBe("project_stream");
    expect(result.content.omissions).toContain(
      "cross_family_total_order_not_asserted",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyEpisodeView.project_id}/history/events/${historyEpisodeView.event_id}`,
    );

    const wrongEvent = structuredClone(historyEpisodeView);
    wrongEvent.event_id = "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const noAuthority = structuredClone(historyEpisodeView);
    noAuthority.content.project_definition_authority = {
      state: "unavailable",
      reason_code: "retained_project_definition_authority_not_available",
      reason:
        "No exact retained ProjectDefinition authority binding is available for this selected event.",
      historical_destination_interpretation: "not_performed",
    };
    fetch.mockResolvedValueOnce(Response.json(noAuthority));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const substitutedDefinition = structuredClone(historyEpisodeView);
    if (
      substitutedDefinition.content.historical_semantic_destination.state !==
      "available"
    ) {
      throw new Error("Expected the available destination fixture.");
    }
    substitutedDefinition.content.historical_semantic_destination.project_definition_ref.revision += 1;
    fetch.mockResolvedValueOnce(Response.json(substitutedDefinition));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const wrongRouteEvent = structuredClone(historyEpisodeView);
    if (
      wrongRouteEvent.content.historical_semantic_destination.state !==
      "available"
    ) {
      throw new Error("Expected the available destination fixture.");
    }
    wrongRouteEvent.content.historical_semantic_destination.route_authority.event_ref.event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongRouteEvent));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const lateBinding = structuredClone(historyEpisodeView);
    if (
      lateBinding.content.project_definition_authority.state !== "available"
    ) {
      throw new Error("Expected the available definition fixture.");
    }
    lateBinding.content.project_definition_authority.effective_after_stream_revision =
      historyEpisodeView.content.change.event_ref.stream_revision;
    fetch.mockResolvedValueOnce(Response.json(lateBinding));
    await expect(
      getProjectHistoryEpisode(
        historyEpisodeView.project_id,
        historyEpisodeView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads bounded semantic and operational impact without inferring effects or reversibility", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyImpactView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryImpact(
      historyImpactView.project_id,
      historyImpactView.event_id,
    );

    expect(result).toEqual(historyImpactView);
    expect(result.content.impact.summary.registered_group_count).toBe(4);
    expect(result.content.semantic_target_impact).toMatchObject({
      target_limit: 10,
      per_adapter_ref_limit: 25,
      target_total_count: 1,
      target_returned_count: 1,
      target_coverage: "complete",
      summary: {
        registered_adapter_count: 9,
        supported_target_count: 1,
        total_count: 4,
      },
    });
    expect(result.content.operational_dependency_impact).toMatchObject({
      target_limit: 10,
      per_adapter_ref_limit: 25,
      target_total_count: 1,
      target_returned_count: 1,
      target_coverage: "complete",
      summary: {
        registered_adapter_count: 3,
        supported_target_count: 1,
        total_count: 3,
      },
    });
    const destinationAssessment =
      result.content.operational_dependency_impact.target_assessments[0];
    if (destinationAssessment?.adapter_state !== "registered") {
      throw new Error("Expected a registered operational assessment.");
    }
    expect(destinationAssessment.groups[0].refs[0]?.destination).toMatchObject({
      state: "available",
      place_role: "work",
      task_intent: "inspect",
      route_authority: {
        schema_name: "petra.project-work-view",
        schema_version: "1.0.0",
        view_kind: "detail",
      },
    });
    expect(destinationAssessment.groups[1].refs[0]?.destination).toEqual({
      state: "unavailable",
      reason_code: "worker_output_manifest_route_not_registered",
      reason:
        "No exact Project-owned WorkerOutputManifest destination is registered.",
    });
    expect(destinationAssessment.groups[2].refs[0]?.destination).toEqual({
      state: "unavailable",
      reason_code: "interaction_replay_record_route_not_registered",
      reason:
        "No exact Project-owned InteractionReplayRecord destination is registered; replay is not a ProjectThread binding.",
    });
    expect(result.content.decision_boundary).toEqual({
      reversibility: "not_assessed",
      compensation: "not_composed",
      dependent_effect: "not_inferred_from_reference",
    });
    expect(result.content.omissions).toContain(
      "transitive_dependency_closure_not_composed",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyImpactView.project_id}/history/events/${historyImpactView.event_id}/impact`,
    );

    const wrongEvent = structuredClone(historyImpactView);
    wrongEvent.content.selected_event.event_ref.event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const wrongTarget = structuredClone(historyImpactView);
    wrongTarget.content.semantic_target_impact.target_assessments[0].target_ref.object_id =
      "change_set_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongTarget));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const collapsedReplacementState = structuredClone(historyImpactView);
    const effectiveGroup =
      collapsedReplacementState.content.semantic_target_impact
        .target_assessments[0].groups[3];
    if (effectiveGroup === undefined) {
      throw new Error("Expected the ProjectSource effective-head group.");
    }
    effectiveGroup.authority_source =
      "immutable_project_source_replacement_bindings";
    fetch.mockResolvedValueOnce(Response.json(collapsedReplacementState));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const reboundOperationalTarget = structuredClone(historyImpactView);
    const operationalAssessment =
      reboundOperationalTarget.content.operational_dependency_impact
        .target_assessments[0];
    if (operationalAssessment?.adapter_state !== "registered") {
      throw new Error("Expected a registered operational assessment.");
    }
    operationalAssessment.groups[1].refs[0]!.input_binding_ref.snapshot_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    fetch.mockResolvedValueOnce(Response.json(reboundOperationalTarget));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const fabricatedReplayDestination = structuredClone(historyImpactView);
    const fabricatedAssessment =
      fabricatedReplayDestination.content.operational_dependency_impact
        .target_assessments[0];
    if (fabricatedAssessment?.adapter_state !== "registered") {
      throw new Error("Expected a registered operational assessment.");
    }
    const replayDestination =
      fabricatedAssessment.groups[2].refs[0]?.destination;
    if (replayDestination === undefined) {
      throw new Error("Expected an interaction replay destination state.");
    }
    Object.assign(replayDestination, { state: "available" });
    fetch.mockResolvedValueOnce(Response.json(fabricatedReplayDestination));
    await expect(
      getProjectHistoryImpact(
        historyImpactView.project_id,
        historyImpactView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads an exact recovery assessment without composing compensation", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyRecoveryView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryRecoveryAssessment(
      historyRecoveryView.project_id,
      historyRecoveryView.event_id,
    );

    expect(result).toEqual(historyRecoveryView);
    expect(result.content.assessment.state).toBe("eligible_for_preview");
    expect(result.content.decision_boundary.compensation_preview).toBe(
      "not_composed",
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyRecoveryView.project_id}/history/events/${historyRecoveryView.event_id}/recovery`,
    );

    const wrongEvent = structuredClone(historyRecoveryView);
    wrongEvent.content.causal_impact_basis.source_event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryRecoveryAssessment(
        historyRecoveryView.project_id,
        historyRecoveryView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const reorderedCommands = structuredClone(historyRecoveryView);
    reorderedCommands.content.command_authority.required_commands.reverse();
    fetch.mockResolvedValueOnce(Response.json(reorderedCommands));
    await expect(
      getProjectHistoryRecoveryAssessment(
        historyRecoveryView.project_id,
        historyRecoveryView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads a revision-bound preview without treating it as execution authority", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyCompensationPreviewView));
    vi.stubGlobal("fetch", fetch);

    const result = await getProjectHistoryCompensationPreview(
      historyCompensationPreviewView.project_id,
      historyCompensationPreviewView.event_id,
    );

    expect(result).toEqual(historyCompensationPreviewView);
    expect(
      result.content.operation_preview.map(
        ({ operation_kind }) => operation_kind,
      ),
    ).toEqual(["retract_claim", "retract_assertion"]);
    expect(result.content.decision_boundary).toMatchObject({
      preview: "read_only",
      change_set: "not_created",
      approval: "not_recorded",
      commands: "not_composed_or_executed",
    });
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyCompensationPreviewView.project_id}/history/events/${historyCompensationPreviewView.event_id}/recovery/preview`,
    );

    const staleShape = structuredClone(historyCompensationPreviewView);
    staleShape.content.result_preview[0].resulting_revision =
      staleShape.content.result_preview[0].prior_revision;
    fetch.mockResolvedValueOnce(Response.json(staleShape));
    await expect(
      getProjectHistoryCompensationPreview(
        historyCompensationPreviewView.project_id,
        historyCompensationPreviewView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });

    const wrongEvent = structuredClone(historyCompensationPreviewView);
    wrongEvent.content.assessment_ref.event_id =
      "event_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    fetch.mockResolvedValueOnce(Response.json(wrongEvent));
    await expect(
      getProjectHistoryCompensationPreview(
        historyCompensationPreviewView.project_id,
        historyCompensationPreviewView.event_id,
      ),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("requests a confirmed command plan without client-supplied authority or execution", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyCompensationPlanView));
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: historyCompensationPreviewView.project_id,
      eventId: historyCompensationPreviewView.event_id,
      preview: historyCompensationPreviewView,
      reason:
        "Retract the accepted pair after confirmed review of its exact authority.",
      approvalRationale:
        "The exact promoted pair should leave current trusted authority while every prior revision and dependent record remains retained.",
      explicitConfirmation: true as const,
    };

    const result = await composeProjectHistoryCompensationPlan(input);
    expect(result).toEqual(historyCompensationPlanView);
    expect(result.content.persistence).toEqual({
      change_set: "not_persisted",
      approval: "not_persisted",
      commands: "not_persisted",
    });
    expect(result.content.execution).toMatchObject({
      state: "not_performed",
      requires_separate_request: true,
      authority_recheck: "required_at_each_command",
    });
    const requestBody = fetch.mock.calls[0]?.[1]?.body;
    if (typeof requestBody !== "string") {
      throw new Error("Expected a JSON compensation-plan request body.");
    }
    const request = JSON.parse(requestBody) as Record<string, unknown>;
    expect(request).toHaveProperty("preview_ref");
    expect(request).not.toHaveProperty("actor");
    expect(request).not.toHaveProperty("capability_grant_id");
    expect(request).not.toHaveProperty("execute");

    const wrongReason = structuredClone(historyCompensationPlanView);
    wrongReason.content.change_set.content.reason = "another reason";
    fetch.mockResolvedValueOnce(Response.json(wrongReason));
    await expect(
      composeProjectHistoryCompensationPlan(input),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("submits the exact composed plan and preserves per-command execution recovery", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyCompensationExecutionView));
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: historyCompensationPlanView.project_id,
      eventId: historyCompensationPlanView.event_id,
      plan: historyCompensationPlanView,
      explicitExecutionConfirmation: true as const,
    };

    const result = await executeProjectHistoryCompensationPlan(input);
    expect(result).toEqual(historyCompensationExecutionView);
    expect(result.content.atomicity).toBe(
      "per_command_transaction_not_three_command_atomic",
    );
    expect(result.content.steps.map(({ state }) => state)).toEqual([
      "retained_success",
      "retained_success",
      "retained_success",
    ]);
    const requestBody = fetch.mock.calls[0]?.[1]?.body;
    if (typeof requestBody !== "string") {
      throw new Error("Expected a JSON compensation-execution request body.");
    }
    const request = JSON.parse(requestBody) as {
      plan: PetraProjectHistoryCompensationPlanView;
      execution_confirmation: Record<string, unknown>;
    };
    expect(request.plan).toEqual(historyCompensationPlanView);
    expect(request.execution_confirmation).toEqual({
      confirmed: true,
      acknowledged_atomicity:
        "per_command_transaction_not_three_command_atomic",
    });

    const falseAtomicity = structuredClone(historyCompensationExecutionView);
    (falseAtomicity.content as { atomicity: string }).atomicity =
      "three_command_atomic";
    fetch.mockResolvedValueOnce(Response.json(falseAtomicity));
    await expect(
      executeProjectHistoryCompensationPlan(input),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("reads retained History pages without interpreting the opaque cursor", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(historyRetainedView));
    vi.stubGlobal("fetch", fetch);

    const first = await getRetainedProjectHistory(
      historyRetainedView.project_id,
      { limit: 1, filters: historyRetainedView.content.query.filters },
    );

    expect(first).toEqual(historyRetainedView);
    expect(first.content.order_kind).toBe("project_stream_newest_first");
    expect(first.content.recovery_authority).toBe("current_at_page_read");
    expect(first.content.cursor_binding).toBe(
      "project_snapshot_and_complete_query",
    );
    expect(first.content.graph_navigation_history).toBe(
      "client_local_separate",
    );
    expect(first.content.filter_options).toMatchObject({
      authorization_scope: "authenticated_project",
      snapshot_and_query_binding:
        "retention_snapshot_and_complete_normalized_query",
      dimension_semantics: "replace_same_dimension_preserve_other_filters",
      actor_catalogue: {
        total_count: 1,
        coverage: "complete",
      },
      target_catalogue: {
        total_count: 2,
        coverage: "complete",
      },
    });
    expect(
      first.content.filter_options.actor_catalogue.options[0]
        ?.display_descriptor,
    ).toEqual(
      expect.objectContaining({
        state: "available",
        display_name: "Researcher",
      }),
    );
    expect(
      first.content.filter_options.target_catalogue.options.every(
        ({ display_descriptor }) =>
          display_descriptor.state === "exact_identity_only",
      ),
    ).toBe(true);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      `/api/queries/projects/${historyRetainedView.project_id}/history/events?limit=1&family=project_source_replacement&command_name=CreateProjectSourceReplacement&event_type=project_source.replacement_created&actor_id=actor_01ARZ3NDEKTSV4RRFFQ69G5FAV&outcome=completed&effect=source_replacement_created&target_semantic_key=petra.project-source&target_object_id=project_source_01K4C000000000000000000041&recorded_from=2026-09-10T00%3A00%3A00.000Z&recorded_through=2026-09-10T23%3A59%3A59.999Z`,
    );

    const firstPage = first.content.page;
    if (!firstPage.has_more) throw new Error("Expected an opaque cursor.");
    const continued = structuredClone(historyRetainedView);
    continued.content.query.cursor = firstPage.next_cursor;
    fetch.mockResolvedValueOnce(Response.json(continued));
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        cursor: firstPage.next_cursor,
        filters: historyRetainedView.content.query.filters,
      }),
    ).resolves.toEqual(continued);
    expect(fetch.mock.calls[1]?.[0]).toBe(
      `/api/queries/projects/${historyRetainedView.project_id}/history/events?limit=1&cursor=${encodeURIComponent(firstPage.next_cursor)}&family=project_source_replacement&command_name=CreateProjectSourceReplacement&event_type=project_source.replacement_created&actor_id=actor_01ARZ3NDEKTSV4RRFFQ69G5FAV&outcome=completed&effect=source_replacement_created&target_semantic_key=petra.project-source&target_object_id=project_source_01K4C000000000000000000041&recorded_from=2026-09-10T00%3A00%3A00.000Z&recorded_through=2026-09-10T23%3A59%3A59.999Z`,
    );

    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, { limit: 101 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        cursor:
          "phc1.eyJ2IjoxLCJwcm9qZWN0Ijoib3BhcXVlIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        filters: {
          recorded_at: {
            from_inclusive: "2026-09-11T00:00:00.000Z",
            through_inclusive: "2026-09-10T00:00:00.000Z",
          },
        },
      }),
    ).rejects.toMatchObject({ status: 400 });

    const mismatched = structuredClone(historyRetainedView);
    mismatched.content.query.filters.family = "change_control";
    fetch.mockResolvedValueOnce(Response.json(mismatched));
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        filters: historyRetainedView.content.query.filters,
      }),
    ).rejects.toMatchObject({ status: 502 });

    const inferredTargetTitle = structuredClone(historyRetainedView);
    (
      inferredTargetTitle.content.filter_options.target_catalogue
        .options[0] as {
        display_descriptor: unknown;
      }
    ).display_descriptor = {
      state: "available",
      title: "A title inferred from a current object",
    };
    fetch.mockResolvedValueOnce(Response.json(inferredTargetTitle));
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        filters: historyRetainedView.content.query.filters,
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("preserves only validated retained History continuation failure subcodes", async () => {
    const page = historyRetainedView.content.page;
    if (!page.has_more) throw new Error("Expected an opaque cursor fixture.");
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);

    for (const subcode of [
      "CURSOR_INVALID",
      "CURSOR_BINDING_MISMATCH",
      "SNAPSHOT_UNAVAILABLE",
    ] as const) {
      const failure = structuredClone(historyContinuationFailure);
      failure.error.subcode = subcode;
      fetch.mockResolvedValueOnce(Response.json(failure, { status: 422 }));
      await expect(
        getRetainedProjectHistory(historyRetainedView.project_id, {
          limit: 1,
          cursor: page.next_cursor,
          filters: historyRetainedView.content.query.filters,
        }),
      ).rejects.toMatchObject({
        name: "ProjectDataError",
        status: 422,
        code: "PROJECT_HISTORY_RETAINED_QUERY_INVALID",
        subcode,
        message: historyContinuationFailure.error.message,
        restart: historyContinuationFailure.error.restart,
      });
    }

    const disclosingFailure = {
      ...structuredClone(historyContinuationFailure),
      error: {
        ...structuredClone(historyContinuationFailure.error),
        subcode: "PROJECT_MISMATCH",
        message: "The cursor belongs to another exact Project.",
      },
    };
    fetch.mockResolvedValueOnce(
      Response.json(disclosingFailure, { status: 422 }),
    );
    await expect(
      getRetainedProjectHistory(historyRetainedView.project_id, {
        limit: 1,
        cursor: page.next_cursor,
        filters: historyRetainedView.content.query.filters,
      }),
    ).rejects.toMatchObject({
      name: "ProjectDataError",
      status: 422,
      code: undefined,
      subcode: undefined,
      message: historyContinuationFailure.error.message,
      restart: undefined,
    });
  });

  it("maps one exact ProjectSource authority chain into the frozen source surfaces", () => {
    const before = structuredClone(sourceView);
    const source = sourceRecordFromView(sourceView);

    expect(source.id).toBe("project_source_01K4C000000000000000000007");
    expect(source.title).toBe("A testable account of competing explanations");
    expect(source.creator).toBe("Ada Researcher");
    expect(source.extent).toBe("complete");
    expect(source.rights).toBe("CC-BY-4.0 · verified");
    expect(source.excerpt).toEqual(
      expect.objectContaining({
        heading: "Results / Paragraph 1",
        locator: "Page 1 · Results / Paragraph 1",
        text: "The study reports a measurable improvement.",
      }),
    );
    expect(sourceView).toEqual(before);
  });

  it("sends only exact lifecycle command input and verifies the resulting authority", async () => {
    const resultingSource: PetraProjectSource = {
      ...structuredClone(sourceRecord),
      revision: sourceLifecycleReceipt.content.resulting_source_ref.revision,
      content: {
        ...structuredClone(sourceRecord.content),
        status: sourceLifecycleReceipt.content.resulting_source_ref.status,
      },
      content_hash:
        sourceLifecycleReceipt.content.resulting_source_ref.content_hash,
      added_at: sourceLifecycleReceipt.recorded_at,
    };
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        Response.json({
          receipt: sourceLifecycleReceipt,
          project_source: resultingSource,
          applied: true,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: sourceLifecycleReceipt.project_id,
      projectSourceId: sourceRecord.project_source_id,
      commandId: sourceLifecycleReceipt.content.command_ref.command_id,
      idempotencyKey:
        sourceLifecycleReceipt.content.command_ref.idempotency_key,
      requestedAction: "exclude_project_source" as const,
      expectedSourceRef: sourceLifecycleReceipt.content.prior_source_ref,
      reason: "Exclude ordinary new use while retaining exact history.",
    };

    await expect(executeProjectSourceLifecycleCommand(input)).resolves.toEqual({
      receipt: sourceLifecycleReceipt,
      projectSource: resultingSource,
      applied: true,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/sources/${input.projectSourceId}/lifecycle`,
    );
    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    const sent = JSON.parse(requestInit.body) as Record<string, unknown>;
    expect(sent).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      requested_action: input.requestedAction,
      expected_source_ref: input.expectedSourceRef,
      reason: input.reason,
    });
    expect(sent).not.toHaveProperty("actor");
    expect(sent).not.toHaveProperty("capability_grant_id");
    expect(sent).not.toHaveProperty("project_id");
    expect(sent).not.toHaveProperty("submitted_at");
  });

  it("rejects ineligible source state and mismatched lifecycle authority", async () => {
    const fetch = vi.fn(() => {
      const mismatchedReceipt = structuredClone(sourceLifecycleReceipt);
      mismatchedReceipt.content.prior_source_ref.revision += 1;
      return Promise.resolve(
        Response.json({
          receipt: mismatchedReceipt,
          project_source: sourceRecord,
          applied: false,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const base = {
      projectId: sourceLifecycleReceipt.project_id,
      projectSourceId: sourceRecord.project_source_id,
      commandId: sourceLifecycleReceipt.content.command_ref.command_id,
      idempotencyKey:
        sourceLifecycleReceipt.content.command_ref.idempotency_key,
      requestedAction: "exclude_project_source" as const,
      expectedSourceRef: sourceLifecycleReceipt.content.prior_source_ref,
      reason: "Exclude ordinary new use while retaining exact history.",
    };

    await expect(
      executeProjectSourceLifecycleCommand({
        ...base,
        expectedSourceRef: {
          ...base.expectedSourceRef,
          status: "excluded",
        },
      }),
    ).rejects.toThrow("exact eligible state");
    expect(fetch).not.toHaveBeenCalled();

    await expect(executeProjectSourceLifecycleCommand(base)).rejects.toThrow(
      "invalid Project source lifecycle command result",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("sends exact replacement creation input without client-selected authority", async () => {
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        Response.json({
          receipt: sourceReplacementCreatedReceipt,
          replacement: sourceReplacement,
          applied: true,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: sourceReplacement.project_id,
      commandId: sourceReplacementCreatedReceipt.content.command_ref.command_id,
      idempotencyKey:
        sourceReplacementCreatedReceipt.content.command_ref.idempotency_key,
      replacementKind: sourceReplacement.content.replacement_kind,
      replacedSourceRef: sourceReplacement.content.replaced_source_ref,
      replacementSourceRef: sourceReplacement.content.replacement_source_ref,
      exclusionReceiptRef: sourceReplacement.content.exclusion_receipt_ref,
      rationale: sourceReplacement.content.rationale,
    };

    await expect(createProjectSourceReplacement(input)).resolves.toEqual({
      receipt: sourceReplacementCreatedReceipt,
      replacement: sourceReplacement,
      applied: true,
    });
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/source-replacements`,
    );
    expect(requestInit?.method).toBe("POST");
    expect(new Headers(requestInit?.headers).get("authorization")).toBe(
      "Bearer petra-local-development",
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    const sent = JSON.parse(requestInit.body) as Record<string, unknown>;
    expect(sent).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      replacement_kind: input.replacementKind,
      replaced_source_ref: input.replacedSourceRef,
      replacement_source_ref: input.replacementSourceRef,
      exclusion_receipt_ref: input.exclusionReceiptRef,
      rationale: input.rationale,
    });
    expect(sent).not.toHaveProperty("actor");
    expect(sent).not.toHaveProperty("capability_grant_id");
    expect(sent).not.toHaveProperty("project_id");
    expect(sent).not.toHaveProperty("submitted_at");
  });

  it("sends exact replacement retraction input and verifies relation-only recovery", async () => {
    const receipt = structuredClone(sourceReplacementRetractedReceipt);
    if (receipt.content.result.effect !== "replacement_retracted") {
      throw new Error("Expected replacement retraction receipt.");
    }
    receipt.content.result.replacement_ref.record_hash =
      sourceReplacementRetraction.content.replacement_ref.record_hash;
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return Promise.resolve(
        Response.json({
          receipt,
          replacement: sourceReplacement,
          retraction: sourceReplacementRetraction,
          applied: true,
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const input = {
      projectId: sourceReplacement.project_id,
      projectSourceReplacementId:
        sourceReplacement.project_source_replacement_id,
      commandId: receipt.content.command_ref.command_id,
      idempotencyKey: receipt.content.command_ref.idempotency_key,
      expectedReplacementRef: {
        ...sourceReplacementRetraction.content.replacement_ref,
        state: "active" as const,
      },
      reason: sourceReplacementRetraction.content.reason,
    };

    await expect(retractProjectSourceReplacement(input)).resolves.toEqual({
      receipt,
      replacement: sourceReplacement,
      retraction: sourceReplacementRetraction,
      applied: true,
    });
    const [requestPath, requestInit] = fetch.mock.calls[0]!;
    expect(requestPath).toBe(
      `/api/commands/projects/${input.projectId}/source-replacements/${input.projectSourceReplacementId}/retraction`,
    );
    if (typeof requestInit?.body !== "string") {
      throw new Error("Expected a JSON request body.");
    }
    expect(JSON.parse(requestInit.body)).toEqual({
      command_id: input.commandId,
      idempotency_key: input.idempotencyKey,
      expected_replacement_ref: input.expectedReplacementRef,
      reason: input.reason,
    });
    expect(receipt.content.recovery).toEqual({
      recovery_kind: "separate_source_status_transition",
      source_status: "unchanged",
      separate_command_name: "RestoreProjectSource",
      effect: "relationship_inactive_predecessor_not_restored",
    });

    await expect(
      retractProjectSourceReplacement({
        ...input,
        projectSourceReplacementId:
          "project_source_replacement_01K4C000000000000000000099",
      }),
    ).rejects.toThrow("route relation's exact active state");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps one exact Review-session composition without treating validation as approval", () => {
    const before = structuredClone(reviewView);
    const review = reviewSessionFromView(reviewView);

    expect(review.id).toBe("review_session_01K4D000000000000000000001");
    expect(review.status).toBe("needs_decision");
    expect(review.candidate.proposed).toBe(
      "The study reports a measurable improvement.",
    );
    expect(review.validation).toEqual(
      expect.objectContaining({
        state: "passed",
        label: "Applicable checks passed",
      }),
    );
    expect(review.changeSet).toEqual(
      expect.objectContaining({
        id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF",
      }),
    );
    expect(review.changeSet?.changes.join(" ")).toContain(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
    );
    expect(review.basis[0]?.sourceId).toBe(
      "project_source_01K4C000000000000000000007",
    );
    expect(reviewView).toEqual(before);
  });

  it("maps one bounded current provenance path without inventing unavailable graph layers", () => {
    const before = structuredClone(relationshipView);
    const graph = graphQuestionFromView(relationshipView);

    expect(graph.focusNodeId).toBe("claim_01ARZ3NDEKTSV4RRFFQ69G5FBB");
    expect(graph.nodes).toHaveLength(5);
    expect(graph.edges).toHaveLength(4);
    expect(graph.nodes.every((node) => node.layers.join() === "current")).toBe(
      true,
    );
    expect(graph.layerAvailability).toEqual({
      current: { available: true, label: "Current" },
      working: {
        available: false,
        label: "Unavailable in the current M1 relationship view",
      },
      historical: {
        available: false,
        label: "Unavailable in the current M1 relationship view",
      },
    });
    expect(graph.recommendation).toBeUndefined();
    expect(
      graph.nodes.find((node) => node.kind === "Source Span")?.sourceId,
    ).toBe("project_source_01K4C000000000000000000007");
    expect(relationshipView).toEqual(before);
  });

  it("maps bounded Work collection and detail without inventing stages, inquiry links, or usable outputs", () => {
    const collectionBefore = structuredClone(workCollectionView);
    const collection = workProjectFromView(workCollectionView);
    expect(collection.projectId).toBe(workCollectionView.project_id);
    expect(collection.branches).toEqual([]);
    expect(collection.units).toHaveLength(1);
    expect(collection.units[0]).toEqual(
      expect.objectContaining({
        id: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        execution: "completed",
        executionLabel: "Completed operationally",
        stages: [],
        results: [],
      }),
    );
    expect(workCollectionView).toEqual(collectionBefore);

    const detailBefore = structuredClone(workDetailView);
    const detail = workUnitFromView(workDetailView);
    expect(detail.inputs?.[0]).toContain("artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1");
    expect(detail.dependencies).toEqual([]);
    expect(detail.stagePlanLimitation).toContain("does not reconstruct stages");
    expect(detail.inquiryLimitation).toContain("inquiry mapping");
    expect(detail.reviewState).toContain("Review linkage");
    expect(detail.results[0]).toEqual(
      expect.objectContaining({
        status: "Worker reported",
        validation: "Project usability unavailable",
      }),
    );
    expect(detail.results[0]?.limitation).toContain("does not infer");
    expect(workDetailView).toEqual(detailBefore);
  });

  it("composes exact inquiry links into Work without deriving inquiry resolution", () => {
    const before = structuredClone(inquiryDetailView);
    const collection = workProjectFromView(workCollectionView, [
      inquiryDetailView,
    ]);
    expect(collection.branches).toEqual([
      expect.objectContaining({
        id: "objective_01K4C000000000000000000005",
        kind: "Research question",
        state: "Active · authored",
        workIds: ["work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2"],
        recommended: false,
      }),
    ]);
    expect(collection.branches[0]?.consequence).toContain(
      "1 exact Work link (0 active, 1 completed, 0 cancelled)",
    );
    expect(collection.branches[0]?.consequence).toContain(
      "does not change the authored inquiry status",
    );
    expect(collection.units[0]?.branchIds).toEqual([
      "objective_01K4C000000000000000000005",
    ]);

    const detail = workProjectFromView(workDetailView, [inquiryDetailView]);
    expect(detail.units[0]?.inquiryLimitation).toContain(
      "Work completion does not resolve an inquiry",
    );
    expect(inquiryDetailView).toEqual(before);
  });

  it("loads exact Project Work identities from the authorized read routes", async () => {
    if (workDetailView.content.view_kind !== "detail") {
      throw new Error("Expected the Work detail fixture.");
    }
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (path.includes("/inquiries/")) {
        return Promise.resolve(Response.json(inquiryDetailView));
      }
      if (path.includes("/inquiries?")) {
        const inquiryCollection = structuredClone(inquiryCollectionView);
        if (
          inquiryCollection.content.view_kind === "collection" &&
          path.includes("work_unit_id=")
        ) {
          inquiryCollection.content.query.work_unit_id =
            "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2";
        }
        return Promise.resolve(Response.json(inquiryCollection));
      }
      return Promise.resolve(
        Response.json(
          path.includes("/work/") ? workDetailView : workCollectionView,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const projectId = workCollectionView.project_id;
    const workUnitId =
      workDetailView.content.summary.work_unit_ref.work_unit_id;
    const collectionUrl = new URL(
      `http://petra.test/projects/${projectId}/work`,
    );
    const collection = await loadProjectWorkCollection({
      request: new Request(collectionUrl),
      url: collectionUrl,
      pattern: "/projects/:projectId/work",
      params: { projectId },
      context: new RouterContextProvider(),
    });
    expect(collection.units[0]?.id).toBe(workUnitId);
    expect(collection.branches[0]?.id).toBe(
      "objective_01K4C000000000000000000005",
    );

    const detailUrl = new URL(
      `http://petra.test/projects/${projectId}/work/${workUnitId}`,
    );
    const detail = await loadProjectWorkDetail({
      request: new Request(detailUrl),
      url: detailUrl,
      pattern: "/projects/:projectId/work/:workId",
      params: { projectId, workId: workUnitId },
      context: new RouterContextProvider(),
    });
    expect(detail.unit.id).toBe(workUnitId);
    expect(detail.unit.branchIds).toEqual([
      "objective_01K4C000000000000000000005",
    ]);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `/api/queries/projects/${projectId}/work?limit=50`,
      `/api/queries/projects/${projectId}/inquiries?limit=100`,
      `/api/queries/projects/${projectId}/inquiries/objective_01K4C000000000000000000005`,
      `/api/queries/projects/${projectId}/work/${workUnitId}`,
      `/api/queries/projects/${projectId}/inquiries?limit=100&work_unit_id=${workUnitId}`,
    ]);
  });

  it("maps and loads one exact live Project thread without inventing message bytes", async () => {
    if (
      threadCollectionView.content.view_kind !== "collection" ||
      threadDetailView.content.view_kind !== "detail"
    ) {
      throw new Error(
        "Expected Project thread collection and detail fixtures.",
      );
    }
    const before = structuredClone(threadDetailView);
    const thread = petraThreadFromView(threadDetailView);
    expect(thread).toEqual(
      expect.objectContaining({
        id: "project_thread_01K4C000000000000000000101",
        snapshot: "Authority event 3 · snapshot revision 1",
        activeWorkId: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        activeWorkTitle: "Linked Work",
      }),
    );
    expect(thread.context).toContain("3 included Project records");
    expect(thread.omissions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("exact input bytes are unavailable"),
        expect.stringContaining("review-policy capture"),
      ]),
    );
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[0]?.force).toBe("author_instruction");
    expect(thread.messages[0]?.content).toContain(
      "exact input bytes are unavailable",
    );
    expect(thread.messages[1]?.force).toBe("explanation_only");
    expect(thread.messages[1]?.content).toContain("metadata-only Project read");
    expect(thread.messages[1]?.references[0]?.destination).toContain(
      "/work/work_unit_",
    );
    expect(threadDetailView).toEqual(before);

    const fetch = vi.fn((input: RequestInfo | URL) => {
      const path =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      return Promise.resolve(
        Response.json(
          path.includes("/threads/project_thread_")
            ? threadDetailView
            : threadCollectionView,
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const projectId = threadCollectionView.project_id;
    const url = new URL(`http://petra.test/projects/${projectId}/petra`);
    const loaded = await loadProjectPetraThread({
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/petra",
      params: { projectId },
      context: new RouterContextProvider(),
    });
    expect(loaded).toEqual(thread);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `/api/queries/projects/${projectId}/threads?limit=1&lifecycle=open`,
      `/api/queries/projects/${projectId}/threads/${thread.id}`,
    ]);
  });

  it("maps semantic roles to client routes while retaining exact identity", () => {
    const currentPath = semanticDestinationPath(locationView);
    expect(currentPath).toContain(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/sources/project_source_01K4C000000000000000000007",
    );
    expect(currentPath).toContain("semanticKey=petra.project-source");
    expect(currentPath).toContain("revision=1");
    expect(currentPath).toContain(
      "recordHash=sha256%3Afa6206f9dd4c3a574d7afb9df2c77a3b4522f18be88d7dca01143534590f7b5c",
    );

    const historical = structuredClone(locationView);
    historical.content.resolution.state = "historical";
    historical.content.primary_destination =
      historical.content.alternate_destinations[1]!;
    expect(semanticDestinationPath(historical)).toContain(
      "/history?selected=project_source_01K4C000000000000000000007",
    );

    const missing = structuredClone(locationView);
    missing.content.resolution = {
      state: "missing",
      requested_ref: missing.content.request.object_ref,
      failure: {
        code: "OBJECT_UNAVAILABLE",
        message: "The requested object is unavailable.",
      },
    };
    missing.content.primary_destination = {
      role: "brief",
      purpose: "Return to the current Project orientation.",
    };
    expect(semanticDestinationPath(missing)).toBe(
      "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief",
    );
  });

  it("resolves a deep link through the authorized semantic query without ambient selection", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      void input;
      return Promise.resolve(Response.json(locationView));
    });
    vi.stubGlobal("fetch", fetch);
    const url = new URL(
      "http://petra.test/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/locate?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&taskIntent=inspect",
    );
    const args: LoaderFunctionArgs = {
      request: new Request(url),
      url,
      pattern: "/projects/:projectId/locate",
      params: {
        projectId: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      },
      context: new RouterContextProvider(),
    };

    const response = await loadProjectObjectLocationRedirect(args);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      semanticDestinationPath(locationView),
    );
    expect(fetch).toHaveBeenCalledOnce();
    const requestPath = fetch.mock.calls[0]?.[0];
    expect(typeof requestPath).toBe("string");
    if (typeof requestPath !== "string") {
      throw new TypeError(
        "Expected the location loader to request a URL string.",
      );
    }
    expect(requestPath).toContain(
      "/object-location?semanticKey=petra.project-source&objectId=project_source_01K4C000000000000000000007&taskIntent=inspect",
    );
    expect(requestPath).not.toContain("selected=");
  });
});
