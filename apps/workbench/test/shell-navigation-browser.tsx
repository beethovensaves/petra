import type { PetraProjectBriefReadView } from "@petra/contracts";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router";

import {
  ProductFrame,
  ProjectShell,
  InspectRoute,
  RouteError,
  useProjectRecord,
} from "../src/product/ReferenceWorkbench.js";
import { loadProjectRecord } from "../src/product/project-data.js";
import { shouldRevalidateProjectShell } from "../src/product/WorkspaceHost.js";
import { useWorkspaceDraftState } from "../src/product/workspace-drafts.js";
import type { ProjectPlace } from "../src/product/model.js";
import { AgentControlPortal } from "../src/product/AgentControlPlane.js";
import briefFixture from "../src/product/project-brief.fixture.json";
import reviewFixture from "../../../packages/contracts/fixtures/accepted/project-review-view.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/work-petra.css";
import "../src/product/agent-control-plane.css";

type RecordedCall = {
  readonly method: string;
  readonly path: string;
  readonly authorization: string | null;
};

type NavigationTarget = {
  readonly place: Exclude<ProjectPlace, "settings" | "profile_tool">;
  readonly route: string;
  readonly label: string;
};

declare global {
  interface Window {
    shellNavigationCalls: RecordedCall[];
    shellNavigationExpected: {
      readonly projectId: string;
      readonly projectTitle: string;
      readonly definitionId: string;
      readonly profileLabel: string;
      readonly objectiveId: string;
      readonly objective: string;
      readonly snapshotLabel: string;
      readonly projectionLabel: string;
      readonly selectedSourceId: string;
      readonly reviewSessionId: string;
      readonly navigation: readonly NavigationTarget[];
    };
    shellNavigationRouter: ReturnType<typeof createMemoryRouter>;
  }
}

const brief = structuredClone(
  briefFixture,
) as unknown as PetraProjectBriefReadView;
const shell = structuredClone(brief.content.shell);
const objective = shell.content.current_objective;
const selectedSource = shell.content.selection?.resolution.requested_ref;
const reviewSessionId = reviewFixture.review_session_id;
const selectedResolution = shell.content.selection?.resolution;
if (objective === undefined) {
  throw new Error("The shell navigation trace requires a current Objective.");
}
if (
  selectedSource?.semantic_key !== "petra.project-source" ||
  selectedResolution === undefined ||
  !("resolved_ref" in selectedResolution)
) {
  throw new Error(
    "The shell navigation trace requires an exact selected Source.",
  );
}

const navigation: readonly NavigationTarget[] = [
  { place: "work", route: "work", label: "Work" },
  { place: "sources", route: "sources", label: "Sources" },
  { place: "graph", route: "graph", label: "Graph" },
  { place: "review", route: "review", label: "Review" },
  { place: "history", route: "history", label: "History" },
  { place: "composition", route: "composition", label: "Outputs" },
  { place: "brief", route: "brief", label: "Overview" },
];

window.shellNavigationCalls = [];
window.shellNavigationExpected = {
  projectId: shell.project_id,
  projectTitle: shell.content.project.name,
  definitionId: shell.content.definition.project_definition_id,
  profileLabel: shell.content.definition.label,
  objectiveId: objective.objective_id,
  objective: objective.statement,
  snapshotLabel: `Authority event ${shell.content.authority.event_position}`,
  projectionLabel: shell.content.projection.label,
  selectedSourceId: selectedSource.object_id,
  reviewSessionId,
  navigation,
};
window.sessionStorage.setItem(
  "petra.auth.token",
  "browser-shell-navigation-token",
);

const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

window.fetch = (input, init): Promise<Response> => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    window.location.origin,
  );
  const headers = new Headers(input instanceof Request ? input.headers : {});
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  window.shellNavigationCalls.push({
    method: init?.method ?? (input instanceof Request ? input.method : "GET"),
    path: `${url.pathname}${url.search}`,
    authorization: headers.get("authorization"),
  });

  if (
    url.pathname ===
      `/api/queries/projects/${encodeURIComponent(shell.project_id)}/shell` &&
    (url.search === "" ||
      (url.searchParams.get("semanticKey") === "petra.project-source" &&
        url.searchParams.get("objectId") === selectedSource.object_id &&
        url.searchParams.get("taskIntent") === "inspect" &&
        (url.searchParams.size === 3 ||
          (url.searchParams.size === 4 &&
            url.searchParams.get("revision") ===
              String(selectedResolution.resolved_ref.revision)))))
  ) {
    return Promise.resolve(json(shell));
  }
  if (
    url.pathname ===
    `/api/queries/projects/${encodeURIComponent(shell.project_id)}/reviews/${encodeURIComponent(reviewSessionId)}`
  ) {
    return Promise.resolve(json(reviewFixture));
  }
  return Promise.resolve(
    json(
      {
        error: {
          code: "UNEXPECTED_TEST_ROUTE",
          message: `${url.pathname}${url.search}`,
        },
      },
      500,
    ),
  );
};

const ShellPlaceTrace = ({
  place,
  label,
}: {
  place: NavigationTarget["place"];
  label: string;
}): React.JSX.Element => {
  const project = useProjectRecord();
  const [draft, setDraft] = useWorkspaceDraftState(
    `source-draft:${project.id}`,
    "",
  );
  const contextualControl =
    place === "work"
      ? {
          title: "Control this Work",
          operationIds: [
            "work.answer-input",
            "work.steer",
            "work.prioritize",
            "work.cancel",
            "work.reconnect",
            "work.replay",
            "work.retry",
            "work.resume",
            "work.start-again",
            "work.open-result",
          ],
          button: "Steer work",
          objectRef: "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
        }
      : place === "review"
        ? {
            title: "Decide this Review",
            operationIds: [
              "review.apply",
              "review.reject",
              "review.defer",
              "review.reopen",
            ],
            button: "Apply displayed ChangeSet",
            objectRef: reviewSessionId,
          }
        : place === "history"
          ? {
              title: "Request a governed Revert",
              operationIds: [
                "history.preview-revert",
                "history.execute-revert",
              ],
              button: "Read governed Revert preview",
              objectRef: "event_01ARZ3NDEKTSV4RRFFQ69G5FC4",
            }
          : place === "brief"
            ? {
                title: "Proposed next action",
                operationIds: [
                  "brief.frame-objective",
                  "brief.suggested-preview",
                  "brief.suggested-invoke",
                  "work.start",
                ],
                button: "Start proposed Work",
                objectRef: objective.objective_id,
              }
            : undefined;
  return (
    <>
      <main
        className="reference-surface shell-navigation-trace"
        id="reference-main"
        data-trace-place={place}
        data-project-id={project.id}
        data-definition-id={project.profile.id}
      >
        <p className="reference-eyebrow">{project.title}</p>
        <h1>{label}</h1>
        {place === "sources" ? (
          <label>
            Workspace draft probe
            <input
              aria-label="Workspace draft probe"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
            />
          </label>
        ) : null}
        <dl>
          <div>
            <dt>Registered profile</dt>
            <dd>{project.profile.label}</dd>
          </div>
          <div>
            <dt>Current objective</dt>
            <dd
              data-objective-id={
                project.importBinding?.focusedObjectiveRef.objectiveId
              }
            >
              {project.objective}
            </dd>
          </div>
        </dl>
      </main>
      {contextualControl === undefined ? null : (
        <AgentControlPortal
          title={contextualControl.title}
          description="The route-owned typed controller remains mounted while the Agent presents its action."
          operationIds={contextualControl.operationIds}
          objectRef={contextualControl.objectRef}
        >
          <button type="button">{contextualControl.button}</button>
        </AgentControlPortal>
      )}
    </>
  );
};

const router = createMemoryRouter(
  [
    {
      path: "/",
      loader: () => ({ ok: true, accepting: true }),
      element: <ProductFrame />,
      errorElement: <RouteError />,
      children: [
        {
          path: "projects/:projectId",
          loader: loadProjectRecord,
          shouldRevalidate: shouldRevalidateProjectShell,
          element: <ProjectShell />,
          children: [
            { path: "inspect", element: <InspectRoute /> },
            ...navigation.map(({ place, route, label }) => ({
              path: route,
              element: <ShellPlaceTrace place={place} label={label} />,
            })),
            {
              path: "sources/:sourceId",
              element: <ShellPlaceTrace place="sources" label="Source" />,
            },
          ],
        },
      ],
    },
  ],
  { initialEntries: [`/projects/${shell.project_id}/brief`] },
);
window.shellNavigationRouter = router;

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
