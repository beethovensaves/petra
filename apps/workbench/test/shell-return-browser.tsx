import type {
  PetraFocusedGraphView,
  PetraProjectBriefReadView,
  PetraProjectEffectiveControlsView,
} from "@petra/contracts";
import type { FocusedGraphReadRequest } from "@petra/core";
import { FocusedGraphClient } from "@petra/adapters";
import { canonicalize } from "json-canonicalize";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router";

import { GraphRoute } from "../src/product/GraphSurface.js";
import { focusedGraphEntryFromSearch } from "../src/product/focused-graph-entry.js";
import {
  BriefRoute,
  ProductFrame,
  ProjectShell,
  RouteError,
} from "../src/product/ReferenceWorkbench.js";
import {
  loadProjectBrief,
  loadProjectRecord,
  focusedGraphRequestFromEntry,
} from "../src/product/project-data.js";
import briefFixture from "../src/product/project-brief.fixture.json";
import controlsFixture from "../../../packages/contracts/fixtures/accepted/project-effective-controls-view.json";
import scientificProfileFixture from "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific-v1-2.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/project-brief.css";
import "../src/product/review-graph.css";

type RecordedCall = {
  readonly method: string;
  readonly path: string;
  readonly authorization: string | null;
  readonly body?: unknown;
};

declare global {
  interface Window {
    shellReturnCalls: RecordedCall[];
    shellReturnRouter: ReturnType<typeof createMemoryRouter>;
    shellReturnServerBinding?: {
      readonly project_id: string;
      readonly task: PetraFocusedGraphView["content"]["task"];
      readonly return_destination: PetraFocusedGraphView["content"]["destinations"][number];
      readonly return_action: PetraFocusedGraphView["content"]["actions"][number];
    };
  }
}

const digest = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const brief = structuredClone(
  briefFixture,
) as unknown as PetraProjectBriefReadView;
const renderedBrief = structuredClone(brief);
const registeredFocusedGraphDefinition =
  scientificProfileFixture.content.definition;
renderedBrief.content.definition.content = {
  ...renderedBrief.content.definition.content,
  registrations: [
    ...renderedBrief.content.definition.content.registrations,
    ...registeredFocusedGraphDefinition.registrations.filter(
      (registration) =>
        registration.semantic_key === "petra.focused-graph" ||
        registration.semantic_key === "scientific.graph.return",
    ),
  ],
  terms: [
    ...renderedBrief.content.definition.content.terms,
    ...registeredFocusedGraphDefinition.terms.filter(
      (term) =>
        term.semantic_key === "scientific.assertion" ||
        term.semantic_key === "scientific.graph.return",
    ),
  ],
} as unknown as typeof renderedBrief.content.definition.content;
renderedBrief.content.definition.content_hash = await digest(
  renderedBrief.content.definition.content,
);
const projectId = brief.project_id;
const shell = structuredClone(brief.content.shell);
const graphFixture = (await fetch("/__shell-return-graph-fixture").then(
  (response) => response.json(),
)) as PetraFocusedGraphView;
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

window.shellReturnCalls = [];
const browserToken = "browser-shell-return-token";
window.sessionStorage.setItem("petra.auth.token", browserToken);

const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

const graphForRequest = (
  request: FocusedGraphReadRequest,
): PetraFocusedGraphView => {
  const graph = structuredClone(graphFixture);
  graph.project_id = projectId;
  graph.content.task = {
    ...graph.content.task,
    request_id: request.request_id,
    task_kind: request.task_kind,
    task_semantic_key: request.task_semantic_key,
    question: request.question,
    focus_refs: [structuredClone(request.focus_ref)],
    origin: structuredClone(request.origin),
    return_destination_key: request.return_destination.destination_key,
  };
  graph.content.profile.project_definition_ref = structuredClone(
    request.project_definition_ref,
  );
  graph.content.semantic_layer = request.semantic_layer;
  graph.content.temporal_position = structuredClone(request.temporal_position);
  graph.content.scope.limits = structuredClone(request.limits);
  graph.content.nodes[0]!.record_ref = structuredClone(request.focus_ref);
  graph.content.selection = {
    state: "selected",
    selection_kind: "node",
    selected_keys: [graph.content.nodes[0]!.node_key],
  };
  graph.content.destinations = [
    structuredClone(request.return_destination),
    ...graph.content.destinations.filter(
      (destination) =>
        destination.destination_key !==
        request.return_destination.destination_key,
    ),
  ];
  const returnAction: PetraFocusedGraphView["content"]["actions"][number] = {
    action_key: "action:return-to-origin",
    action_kind: "return_to_origin",
    semantic_key: request.return_action_semantic_key,
    label: "Return to origin",
    consequence: "read_only_navigation",
    target_keys: [graph.content.nodes[0]!.node_key],
    availability: {
      state: "available",
      destination_key: request.return_destination.destination_key,
    },
  };
  graph.content.actions = [
    returnAction,
    ...graph.content.actions.filter(
      (action) => action.action_kind !== "return_to_origin",
    ),
  ];
  window.shellReturnServerBinding = {
    project_id: graph.project_id,
    task: structuredClone(graph.content.task),
    return_destination: structuredClone(graph.content.destinations[0]),
    return_action: structuredClone(returnAction),
  };
  return graph;
};

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
  const body =
    typeof init?.body === "string"
      ? (JSON.parse(init.body) as unknown)
      : undefined;
  window.shellReturnCalls.push({
    method: init?.method ?? (input instanceof Request ? input.method : "GET"),
    path: `${url.pathname}${url.search}`,
    authorization: headers.get("authorization"),
    ...(body === undefined ? {} : { body }),
  });

  if (url.pathname === `/api/queries/projects/${projectId}/shell`) {
    return Promise.resolve(json(shell));
  }
  if (url.pathname === `/api/queries/projects/${projectId}/brief`) {
    return Promise.resolve(json(brief));
  }
  if (
    url.pathname === `/api/queries/projects/${projectId}/effective-controls`
  ) {
    return Promise.resolve(json(controls));
  }
  if (url.pathname === `/api/queries/projects/${projectId}/focused-graph`) {
    return Promise.resolve(
      json(graphForRequest(body as FocusedGraphReadRequest)),
    );
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
          children: [
            {
              path: "brief",
              loader: async (args) => {
                const data = await loadProjectBrief(args);
                if (data.briefView === undefined) return data;
                return { ...data, briefView: renderedBrief };
              },
              element: <BriefRoute />,
            },
            {
              path: "graph",
              loader: async (args) => {
                const routeProjectId = args.params.projectId;
                if (routeProjectId === undefined)
                  throw new Error("The shell-return Project ID is missing.");
                const entry = focusedGraphEntryFromSearch(
                  routeProjectId,
                  new URL(args.request.url).searchParams,
                );
                if (entry === undefined)
                  throw new Error("The shell-return Graph entry is missing.");
                const definition = renderedBrief.content.definition;
                const request = await focusedGraphRequestFromEntry(
                  entry,
                  definition,
                );
                const view = await new FocusedGraphClient({
                  baseUrl: window.location.origin,
                  token: browserToken,
                  projectDefinition: definition,
                }).read(routeProjectId, request);
                return {
                  kind: "focused_graph" as const,
                  entry,
                  definition,
                  request,
                  view,
                };
              },
              element: <GraphRoute />,
            },
          ],
        },
      ],
    },
  ],
  { initialEntries: [`/projects/${projectId}/brief`] },
);
window.shellReturnRouter = router;

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
