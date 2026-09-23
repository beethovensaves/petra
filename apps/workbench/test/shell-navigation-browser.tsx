import type { PetraProjectBriefReadView } from "@petra/contracts";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router";

import {
  ProductFrame,
  ProjectShell,
  RouteError,
  useProjectRecord,
} from "../src/product/ReferenceWorkbench.js";
import { loadProjectRecord } from "../src/product/project-data.js";
import type { ProjectPlace } from "../src/product/model.js";
import briefFixture from "../src/product/project-brief.fixture.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

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
if (objective === undefined) {
  throw new Error("The shell navigation trace requires a current Objective.");
}

const navigation: readonly NavigationTarget[] = [
  { place: "petra", route: "petra", label: "Work with Petra" },
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
    url.search === ""
  ) {
    return Promise.resolve(json(shell));
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
  return (
    <main
      className="reference-surface shell-navigation-trace"
      id="reference-main"
      data-trace-place={place}
      data-project-id={project.id}
      data-definition-id={project.profile.id}
    >
      <p className="reference-eyebrow">{project.title}</p>
      <h1>{label}</h1>
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
          element: <ProjectShell />,
          children: navigation.map(({ place, route, label }) => ({
            path: route,
            element: <ShellPlaceTrace place={place} label={label} />,
          })),
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
