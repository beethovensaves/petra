import { readFileSync } from "node:fs";

import type {
  PetraProjectEffectiveControlsView,
  PetraProjectHistoryEpisodeViewV12,
  PetraProjectHistoryImpactViewV14,
  PetraProjectHistoryRecoveryAssessmentView,
  PetraProjectHistoryRetainedViewV12,
  PetraSuggestedActionInvocationView,
} from "@petra/contracts";
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
  HistoryEventSurface,
  HistoryCollectionSurface,
  HistorySurface,
  ProfileToolSurface,
  SettingsSurface,
  SuggestedActionWorkHistorySurface,
} from "./RemainingSurfaces.js";

const render = (node: React.ReactNode): string =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

const controls = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectEffectiveControlsView;

const suggestedActionInvocationView = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/suggested-action-invocation-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraSuggestedActionInvocationView;

const historyEpisode = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-episode-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryEpisodeViewV12;

const historyImpact = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-impact-view-v1-4.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryImpactViewV14;

const historyRecovery = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-recovery-assessment-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRecoveryAssessmentView;

const retainedHistory = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-history-retained-view-v1-2.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectHistoryRetainedViewV12;

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

  it("presents authenticated retained History with exact filters and event navigation", () => {
    const markup = render(
      <HistoryCollectionSurface
        project={{ ...inquiryProject, id: retainedHistory.project_id }}
        initialHistory={retainedHistory}
      />,
    );

    expect(markup).toContain('data-runtime-history="authenticated-retained"');
    expect(markup).toContain("Filter Project History");
    expect(markup).toContain("Apply exact filters");
    expect(markup).toContain("Exact target");
    expect(markup).toContain("Researcher · 3");
    expect(markup).toContain("Authority change applied");
    expect(markup).toContain(
      retainedHistory.content.changes[0]!.event_ref.event_id,
    );
    expect(markup).not.toContain("No permitted History episodes");
  });

  it("maps an authenticated History event into a staged governed Revert boundary", () => {
    const markup = render(
      <HistoryEventSurface
        project={inquiryProject}
        data={{
          episode: historyEpisode,
          impact: historyImpact,
          recovery: historyRecovery,
        }}
      />,
    );

    expect(markup).toContain('data-runtime-history="authenticated"');
    expect(markup).toContain("Event and consequence");
    expect(markup).toContain("Impact and recovery boundary");
    expect(markup).toContain(
      "Eligible for a revision-bound compensation preview",
    );
    expect(markup).toContain("Read governed Revert preview");
    expect(markup).toContain("Compare recorded state");
    expect(markup).toContain("Inspect impact and recovery");
    expect(markup).toContain("No compensation preview, plan, or execution");
    expect(markup).toContain("does not erase this event");
    expect(markup).not.toContain("Execute governed Revert");
  });

  it("offers exact impact and time graph tasks only for an exact Claim event target", () => {
    const claimEpisode = structuredClone(historyEpisode);
    claimEpisode.content.change.targets[0] = {
      role: "primary",
      semantic_key: "scientific.claim",
      object_id: "claim_01ARZ3NDEKTSV4RRFFQ69G5FAB",
      revision: 1,
      content_hash: `sha256:${"a".repeat(64)}`,
      record_hash: `sha256:${"b".repeat(64)}`,
      authority_state: "current",
    };
    const markup = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[
          `/projects/${claimEpisode.project_id}/history/${claimEpisode.event_id}`,
        ]}
      >
        <HistoryEventSurface
          project={{
            ...inquiryProject,
            id: claimEpisode.project_id,
            profile: {
              ...inquiryProject.profile,
              definitionFamily: "petra.scientific-evidence",
            },
          }}
          data={{
            episode: claimEpisode,
            impact: historyImpact,
            recovery: historyRecovery,
          }}
        />
      </MemoryRouter>,
    );

    expect(markup).toContain("Inspect exact impact in Graph");
    expect(markup).toContain("Inspect supplied recorded-time facts in Graph");
    expect(markup).toContain("presentation=impact");
    expect(markup).toContain("presentation=time");
    expect(markup).toContain(`historyEventId=${claimEpisode.event_id}`);
    expect(markup).not.toContain("layout=");
  });

  it("keeps an ineligible governed Revert keyboard-discoverable without an execution control", () => {
    const blocked = structuredClone(historyRecovery);
    blocked.content.assessment.state = "already_compensated";
    const markup = render(
      <HistoryEventSurface
        project={inquiryProject}
        data={{
          episode: historyEpisode,
          impact: historyImpact,
          recovery: blocked,
        }}
      />,
    );

    expect(markup).toContain("already compensated");
    expect(markup).toContain("Revert unavailable");
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain("Read governed Revert preview");
    expect(markup).not.toContain("Execute governed Revert");
  });

  it("maps authenticated SuggestedAction Work History without fixture fallback or recovery calculation", () => {
    const runtime = structuredClone(suggestedActionInvocationView);
    const workId = runtime.content.invocation.content.expected_work_unit_id;
    if (runtime.content.work.state !== "pending_registration") {
      throw new Error("Expected the accepted pending invocation fixture.");
    }
    runtime.content.operation_state = "running";
    runtime.content.work = {
      state: "available",
      work_unit_ref: {
        work_unit_id: workId,
        revision: 2,
        spec_hash:
          "sha256:1616161616161616161616161616161616161616161616161616161616161616",
        record_hash:
          "sha256:1717171717171717171717171717171717171717171717171717171717171717",
      },
      input_manifest_ref: {
        record_id: "worker_input_manifest_01K4C000000000000000000062",
        revision: 1,
        content_hash:
          "sha256:1818181818181818181818181818181818181818181818181818181818181818",
        record_hash:
          "sha256:1919191919191919191919191919191919191919191919191919191919191919",
      },
      execution_state: "running",
    };
    runtime.content.history.work_revisions = [
      {
        work_unit_ref: { ...runtime.content.work.work_unit_ref, revision: 1 },
        state: "requested",
        recorded_at: "2026-09-11T18:40:01.000Z",
      },
      {
        work_unit_ref: runtime.content.work.work_unit_ref,
        state: "running",
        recorded_at: "2026-09-11T18:40:02.000Z",
      },
    ];
    runtime.content.recovery.actions = runtime.content.recovery.actions.map(
      (action) =>
        action.operation === "reconnect_delivery"
          ? { ...action, eligibility: "eligible" }
          : action.operation === "cancel_work"
            ? {
                ...action,
                eligibility: "eligible",
                command_name: "CancelWorkUnit" as const,
              }
            : action,
    ) as typeof runtime.content.recovery.actions;
    const historyDestination = runtime.content.history.destinations.find(
      (destination) => destination.place_role === "history",
    );
    const workDestination = runtime.content.history.destinations.find(
      (destination) => destination.place_role === "work",
    );
    if (historyDestination === undefined || workDestination === undefined) {
      throw new Error("Expected exact Work and History destinations.");
    }

    const markup = render(
      <SuggestedActionWorkHistorySurface
        project={inquiryProject}
        data={{
          invocation: runtime,
          historyDestination,
          workDestination,
        }}
      />,
    );

    expect(markup).toContain('data-runtime-history="authenticated"');
    expect(markup).toContain("Canonical Work revisions");
    expect(markup).toContain("Revision 1");
    expect(markup).toContain("Revision 2");
    expect(markup).toContain(workId);
    expect(markup).toContain(
      runtime.content.invocation.content.command_ref.command_id,
    );
    expect(markup).toContain("Exact interaction replay");
    expect(markup).toContain('data-operation="cancel_work"');
    expect(markup).toContain('data-eligibility="eligible"');
    expect(markup).toContain("CancelWorkUnit");
    expect(markup).toContain(
      "This route reread the authenticated invocation and matched its supplied History destination",
    );
    expect(markup).not.toContain("Snapshot 17 to Snapshot 18");
    expect(markup).not.toContain("Prepare reversal");
  });

  it("separates personal Settings from governed Project controls", () => {
    const markup = render(
      <SettingsSurface selectedProject={inquiryProject} controls={controls} />,
    );

    expect(markup).toContain("Personal presentation choices remain separate");
    expect(markup).toContain("Petra Stone");
    expect(markup).toContain("Petra Graphite");
    expect(markup).toContain("High Contrast");
    expect(markup).toContain("Personal · this device");
    expect(markup).toContain("Reset theme");
    expect(markup).toContain("Reset all personal settings");
    expect(markup).toContain(
      "Applied for this session; could not save on this device.",
    );
    expect(markup).toContain(
      "Project controls, Project content, drafts, and Work are unchanged.",
    );
    expect(markup).not.toContain("reset when this page reloads");
    expect(markup).toContain("Governed Project scope");
    expect(markup).toContain("Visibility: private");
    expect(markup).toContain("scholarly, personal");
    expect(markup).toContain(
      "The CapabilityGrant registry is available, but this Project has no registered command grant.",
    );
    expect(markup).toContain("No typed Project control operation is connected");
    expect(markup).not.toContain("settings-project-reset");
  });

  it("uses a profile-owned tool inside Petra's shared task and recovery grammar", () => {
    const markup = render(
      <ProfileToolSurface project={decisionProject} tool={profileTool} />,
    );

    expect(markup).toContain("Project capability · Decision analysis");
    expect(markup).toContain("Constraint coverage check");
    expect(markup).toContain(
      "profile.decision-analysis/constraint-coverage@1.0",
    );
    expect(markup).toContain("No registered alternatives yet");
    expect(markup).toContain("will not invent alternatives or a result");
    expect(markup).toContain("Petra owns Work, recovery, and return");
  });
});
