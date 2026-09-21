import type {
  PetraFocusedGraphView,
  PetraProjectBriefReadView,
  PetraProjectEffectiveControlsView,
  PetraProjectShellCollectionView,
  PetraProjectShellViewV12,
  PetraRegisteredProjectProfile,
  ProjectShellRetainedTask,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router";

import {
  ProductFrame,
  ProjectShell,
  ProjectsRoute,
  RouteError,
  useProjectRecord,
} from "../src/product/ReferenceWorkbench.js";
import { GraphRoute } from "../src/product/GraphSurface.js";
import {
  loadProjectRecord,
  loadProjectResume,
  searchProjectCollection,
} from "../src/product/project-data.js";
import briefFixture from "../src/product/project-brief.fixture.json";
import controlsFixture from "../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json";
import scientificProfileFixture from "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/project-brief.css";

type RecordedCall = {
  readonly method: string;
  readonly path: string;
  readonly authorization: string | null;
};

declare global {
  interface Window {
    projectSwitchCalls: RecordedCall[];
    projectSwitchRouter: ReturnType<typeof createMemoryRouter>;
    projectSwitchExpected: {
      readonly priorProjectId: string;
      readonly priorTitle: string;
      readonly targetProjectId: string;
      readonly targetTitle: string;
      readonly priorRoute: string;
      readonly retainedSelection: string;
      readonly alternateSelection: string;
    };
  }
}

const digest = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

const priorBrief = structuredClone(
  briefFixture,
) as unknown as PetraProjectBriefReadView;
const shellV11 = structuredClone(priorBrief.content.shell);
const priorProjectId = shellV11.project_id;
const priorTitle = shellV11.content.project.name;
const graph = (await fetch("/__project-switch-graph-fixture").then((response) =>
  response.json(),
)) as PetraFocusedGraphView;
const currentObjective = shellV11.content.current_objective;
if (currentObjective === undefined) {
  throw new Error("The Project switch trace requires a current Objective.");
}
const focus = structuredClone(graph.content.nodes[0]!.record_ref);
const objectiveRef = {
  record_id: currentObjective.objective_id,
  revision: currentObjective.revision,
  record_hash: `sha256:${"b".repeat(64)}`,
};
const definitionRef = {
  project_definition_id: shellV11.content.definition.project_definition_id,
  revision: shellV11.content.definition.revision,
  content_hash: shellV11.content.definition.content_hash,
  record_hash: `sha256:${"c".repeat(64)}`,
  definition_family: shellV11.content.definition.definition_family,
};
const returnDestination = {
  destination_key: "destination:brief",
  destination_kind: "brief" as const,
  state: "available" as const,
  owner: "project_brief_view" as const,
  label: "Return to Brief",
  target_ref: objectiveRef,
};
const retainedRequest: ProjectShellRetainedTask["request"] = {
  request_id: graph.content.task.request_id,
  task_kind: "neighborhood",
  task_semantic_key: graph.content.task.task_semantic_key,
  question: "Which retained relationship should I inspect next?",
  focus_ref: focus,
  origin: { origin_kind: "brief", origin_ref: objectiveRef },
  project_definition_ref: definitionRef,
  semantic_layer: "current",
  temporal_position: {
    position_kind: "current",
    dimension: "project_snapshot",
  },
  object_semantic_key: "scientific.claim",
  relationship_semantic_key: "scientific.assertion",
  return_action_semantic_key: "scientific.graph.trace-sources",
  return_destination: returnDestination,
  limits: structuredClone(graph.content.scope.limits),
  expected_snapshot: structuredClone(graph.content.requested_snapshot),
};
const retainedSelection = "relationship:assertion-a";
const alternateSelection =
  graph.content.nodes.find((node) => node.node_key !== retainedSelection)
    ?.node_key ?? graph.content.nodes[0]!.node_key;
const retainedTask: ProjectShellRetainedTask = {
  task_kind: "focused_graph",
  objective_ref: {
    objective_id: currentObjective.objective_id,
    revision: 1,
    content_hash: currentObjective.content_hash,
    record_hash: objectiveRef.record_hash,
  },
  label: retainedRequest.question,
  request: retainedRequest,
  expected_graph: {
    schema_name: "petra.focused-graph-view",
    schema_version: graph.schema_version,
    content_hash: graph.content_hash,
  },
  selection: {
    state: "selected",
    selection_kind: "relationship",
    selected_keys: [retainedSelection],
  },
  origin: structuredClone(retainedRequest.origin),
  focus_refs: [structuredClone(focus)],
  return_destination: structuredClone(returnDestination),
  retained_at: "2026-09-20T22:45:00.000Z",
};
graph.content.task.task_kind = "neighborhood";
graph.content.task.question = retainedRequest.question;
graph.content.task.focus_refs = [structuredClone(focus)];
graph.content.task.origin = structuredClone(retainedRequest.origin);
graph.content.task.return_destination_key = returnDestination.destination_key;
graph.content.profile.project_definition_ref = structuredClone(definitionRef);
graph.content.destinations[0] = structuredClone(returnDestination);
const priorShellContent: PetraProjectShellViewV12["content"] = {
  ...structuredClone(shellV11.content),
  resume: {
    state: "available",
    retained_task: structuredClone(retainedTask),
    recovery: {
      action: "open_retained_task",
      destination: {
        role: "graph",
        purpose: "Resume the exact retained relationship question.",
      },
      reason:
        "The server verified the retained task, origin, focus, definition, and active ProjectInquiry revision in one Project snapshot.",
    },
  },
};
const priorShell: PetraProjectShellViewV12 = {
  ...structuredClone(shellV11),
  schema_version: "1.2.0",
  content: priorShellContent,
  content_hash: await digest(priorShellContent),
};
const targetProjectId = "project_01K4E000000000000000000001";
const targetTitle = "Controlled publication review";

const targetBrief = JSON.parse(
  JSON.stringify(priorBrief).replaceAll(priorProjectId, targetProjectId),
) as PetraProjectBriefReadView;
targetBrief.content.shell.content.project.name = targetTitle;
targetBrief.content.shell.content_hash = await digest(
  targetBrief.content.shell.content,
);
targetBrief.content_hash = await digest(targetBrief.content);
const targetShell = structuredClone(targetBrief.content.shell);

const controlsFor = async (
  projectId: string,
  brief: PetraProjectBriefReadView,
): Promise<PetraProjectEffectiveControlsView> => {
  const controls = structuredClone(
    controlsFixture,
  ) as PetraProjectEffectiveControlsView;
  controls.content.project_ref.record_id = projectId;
  controls.content.project_definition_ref.content_hash =
    brief.content.definition.content_hash;
  controls.content.project_definition_ref.record_hash = await digest(
    brief.content.definition,
  );
  controls.content_hash = await digest(controls.content);
  return controls;
};

const priorControls = await controlsFor(priorProjectId, priorBrief);
const targetControls = await controlsFor(targetProjectId, targetBrief);
const profile = structuredClone(
  scientificProfileFixture,
) as unknown as PetraRegisteredProjectProfile;

const collection = async (): Promise<PetraProjectShellCollectionView> => {
  const content: PetraProjectShellCollectionView["content"] = {
    query: { limit: 12 },
    projects: [priorShell, targetShell],
    page: { returned_count: 2, total_count: 2, has_more: false },
  };
  return {
    schema_name: "petra.project-shell-collection-view",
    schema_version: "1.0.0",
    content,
    content_hash: await digest(content),
    read_at: "2026-09-20T23:30:00.000Z",
  };
};

window.projectSwitchCalls = [];
window.projectSwitchExpected = {
  priorProjectId,
  priorTitle,
  targetProjectId,
  targetTitle,
  priorRoute: `/projects/${priorProjectId}/resume#focused-graph-active-selection`,
  retainedSelection,
  alternateSelection,
};
window.sessionStorage.setItem(
  "petra.auth.token",
  "browser-project-switch-token",
);

const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

window.fetch = async (input, init): Promise<Response> => {
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
  window.projectSwitchCalls.push({
    method: init?.method ?? (input instanceof Request ? input.method : "GET"),
    path: `${url.pathname}${url.search}`,
    authorization: headers.get("authorization"),
  });

  if (url.pathname === "/api/queries/projects") {
    return json(await collection());
  }
  if (url.pathname === "/api/queries/project-profiles") {
    return json({ profiles: [profile] });
  }
  for (const [projectId, shell, brief, controls] of [
    [priorProjectId, priorShell, priorBrief, priorControls],
    [targetProjectId, targetShell, targetBrief, targetControls],
  ] as const) {
    if (url.pathname === `/api/queries/projects/${projectId}/shell`) {
      return json(shell);
    }
    if (url.pathname === `/api/queries/projects/${projectId}/brief`) {
      return json(brief);
    }
    if (
      url.pathname === `/api/queries/projects/${projectId}/effective-controls`
    ) {
      return json(controls);
    }
  }
  if (
    url.pathname === `/api/queries/projects/${priorProjectId}/focused-graph`
  ) {
    return json(graph);
  }
  return json(
    {
      error: {
        code: "UNEXPECTED_TEST_ROUTE",
        message: `${url.pathname}${url.search}`,
      },
    },
    500,
  );
};

const SwitchBriefDestination = (): React.JSX.Element => {
  const project = useProjectRecord();
  return (
    <main className="reference-surface live-project-brief" id="reference-main">
      <p className="reference-eyebrow">{project.title}</p>
      <h1>Brief</h1>
      <p>{project.objective}</p>
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
          index: true,
          loader: async () => ({
            ...(await searchProjectCollection({ limit: 12 })),
            profiles: [],
          }),
          element: <ProjectsRoute />,
        },
        {
          path: "projects/:projectId",
          loader: loadProjectRecord,
          element: <ProjectShell />,
          children: [
            {
              path: "resume",
              loader: loadProjectResume,
              element: <GraphRoute />,
            },
            {
              path: "brief",
              element: <SwitchBriefDestination />,
            },
          ],
        },
      ],
    },
  ],
  { initialEntries: [window.projectSwitchExpected.priorRoute] },
);
window.projectSwitchRouter = router;

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
