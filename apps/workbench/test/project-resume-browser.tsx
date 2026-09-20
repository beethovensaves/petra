// Synthetic transport around production collection, shell, resume, Graph, and recovery UI.
import type {
  PetraFocusedGraphView,
  PetraProjectBriefReadView,
  PetraProjectShellViewV11,
  PetraProjectShellViewV12,
  ProjectShellResumeContext,
  ProjectShellRetainedTask,
} from "@petra/contracts";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter, useLocation } from "react-router";

import { GraphRoute } from "../src/product/GraphSurface.js";
import {
  ProjectResumeOutcome,
  ProjectShell,
  ProjectsRoute,
  RouteError,
  useProjectRecord,
} from "../src/product/ReferenceWorkbench.js";
import {
  loadProjectCollection,
  loadProjectRecord,
  loadProjectResume,
} from "../src/product/project-data.js";
import briefFixture from "../src/product/project-brief.fixture.json";
import shellFixture from "../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/project-brief.css";
import "../src/product/review-graph.css";

type ResumeMode = "available" | "stale" | "not_found" | "unavailable";
type RecordedCall = {
  readonly method: string;
  readonly path: string;
  readonly body?: unknown;
};

declare global {
  interface Window {
    resumeCalls: RecordedCall[];
    resumeExpectedRequest: unknown;
    resumeRouter: ReturnType<typeof createMemoryRouter>;
    setResumeMode: (mode: ResumeMode) => void;
  }
}

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const shellV11 = structuredClone(
  shellFixture,
) as unknown as PetraProjectShellViewV11;
const brief = structuredClone(
  briefFixture,
) as unknown as PetraProjectBriefReadView;
const graph = (await fetch("/__project-resume-graph-fixture").then((response) =>
  response.json(),
)) as PetraFocusedGraphView;
const focus = structuredClone(graph.content.nodes[0]!.record_ref);
const objectiveRef = {
  record_id: shellV11.content.current_objective!.objective_id,
  revision: shellV11.content.current_objective!.revision,
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
const request: ProjectShellRetainedTask["request"] = {
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
const retainedTask: ProjectShellRetainedTask = {
  task_kind: "focused_graph",
  objective_ref: {
    objective_id: shellV11.content.current_objective!.objective_id,
    revision: 1,
    content_hash: shellV11.content.current_objective!.content_hash,
    record_hash: objectiveRef.record_hash,
  },
  label: request.question,
  request,
  expected_graph: {
    schema_name: "petra.focused-graph-view",
    schema_version: graph.schema_version,
    content_hash: graph.content_hash,
  },
  selection: {
    state: "selected",
    selection_kind: "relationship",
    selected_keys: ["relationship:assertion-a"],
  },
  origin: structuredClone(request.origin),
  focus_refs: [structuredClone(focus)],
  return_destination: structuredClone(returnDestination),
  retained_at: "2026-09-20T05:30:00.000Z",
};

graph.content.task.task_kind = "neighborhood";
graph.content.task.question = request.question;
graph.content.task.focus_refs = [structuredClone(focus)];
graph.content.task.origin = structuredClone(request.origin);
graph.content.task.return_destination_key = returnDestination.destination_key;
graph.content.profile.project_definition_ref = structuredClone(definitionRef);
graph.content.destinations[0] = structuredClone(returnDestination);

const recovery = (
  mode: Exclude<ResumeMode, "available">,
): ProjectShellResumeContext => {
  if (mode === "stale") {
    return {
      state: "stale",
      retained_task: structuredClone(retainedTask),
      failure: {
        code: "PROJECT_RESUME_PROJECT_ARCHIVED",
        message: "The retained task belongs to an archived Project.",
      },
      recovery: {
        action: "open_brief",
        destination: {
          role: "brief",
          purpose: "Open the current Project Brief before starting a new task.",
        },
        reason:
          "The retained task remains inspectable context but is not a safe current destination.",
      },
    };
  }
  if (mode === "not_found") {
    return {
      state: "not_found",
      failure: {
        code: "PROJECT_RESUME_TASK_NOT_FOUND",
        message: "This Project has no retained task to resume.",
      },
      recovery: {
        action: "open_brief",
        destination: {
          role: "brief",
          purpose: "Open the current Project Brief.",
        },
        reason:
          "Brief is the safe Project entry when no more specific retained task exists.",
      },
    };
  }
  return {
    state: "unavailable",
    failure: {
      code: "PROJECT_RESUME_TASK_UNAVAILABLE",
      message:
        "The retained task could not be verified from its immutable Project records.",
    },
    recovery: {
      action: "retry_read",
      destination: {
        role: "brief",
        purpose: "Keep the current Project Brief available while retrying.",
      },
      reason:
        "Retry the authorized Project read; do not reconstruct task identity in the client.",
    },
  };
};

let mode: ResumeMode = "available";
const shellForMode = (): PetraProjectShellViewV12 => {
  const content: PetraProjectShellViewV12["content"] = {
    ...structuredClone(shellV11.content),
    ...(mode === "stale"
      ? {
          project: {
            ...structuredClone(shellV11.content.project),
            status: "archived" as const,
          },
        }
      : {}),
    resume:
      mode === "available"
        ? {
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
          }
        : recovery(mode),
  };
  return {
    ...structuredClone(shellV11),
    schema_version: "1.2.0",
    content,
    content_hash: `sha256:${"d".repeat(64)}`,
  };
};

window.resumeCalls = [];
window.resumeExpectedRequest = structuredClone(request);
window.setResumeMode = (nextMode) => {
  mode = nextMode;
  window.resumeCalls.length = 0;
};

const json = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });

window.fetch = (input, init): Promise<Response> => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    window.location.origin,
  );
  const body =
    typeof init?.body === "string"
      ? (JSON.parse(init.body) as unknown)
      : undefined;
  window.resumeCalls.push({
    method: init?.method ?? "GET",
    path: `${url.pathname}${url.search}`,
    ...(body === undefined ? {} : { body }),
  });
  if (url.pathname === "/api/queries/projects") {
    return Promise.resolve(json({ projects: [shellForMode()] }));
  }
  if (url.pathname.endsWith(`/projects/${projectId}/shell`)) {
    return Promise.resolve(json(shellForMode()));
  }
  if (url.pathname.endsWith(`/projects/${projectId}/brief`)) {
    return Promise.resolve(json(brief));
  }
  if (url.pathname.endsWith(`/projects/${projectId}/focused-graph`)) {
    return Promise.resolve(json(graph));
  }
  return Promise.resolve(
    json({ error: { code: "UNEXPECTED_TEST_ROUTE", path: url.pathname } }, 500),
  );
};

const ResumeBrief = (): React.JSX.Element => {
  const project = useProjectRecord();
  const location = useLocation();
  const outcome = new URLSearchParams(location.search).get("projectResume");
  return (
    <main className="reference-surface live-project-brief" id="reference-main">
      {outcome === null ? (
        <h1>Current Brief</h1>
      ) : (
        <ProjectResumeOutcome project={project} outcome={outcome} />
      )}
    </main>
  );
};

const router = createMemoryRouter(
  [
    {
      path: "/",
      loader: async () => ({
        projects: await loadProjectCollection(),
        profiles: [],
      }),
      element: <ProjectsRoute />,
      errorElement: <RouteError />,
    },
    {
      path: "/projects/:projectId",
      loader: loadProjectRecord,
      element: <ProjectShell />,
      errorElement: <RouteError />,
      children: [
        { path: "resume", loader: loadProjectResume, element: <GraphRoute /> },
        { path: "brief", element: <ResumeBrief /> },
      ],
    },
  ],
  { initialEntries: ["/"] },
);
window.resumeRouter = router;

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
