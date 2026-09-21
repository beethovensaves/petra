import type {
  PetraProjectBriefReadView,
  PetraProjectShellCollectionView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryRouter } from "react-router";

import {
  BriefRoute,
  ProductFrame,
  ProjectShell,
  ProjectsRoute,
  RouteError,
} from "../src/product/ReferenceWorkbench.js";
import {
  loadProjectBrief,
  loadProjectRecord,
  loadProjectsHome,
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
    projectOpenCalls: RecordedCall[];
    projectOpenRouter: ReturnType<typeof createMemoryRouter>;
    projectOpenExpected: {
      readonly projectId: string;
      readonly title: string;
      readonly objective: string;
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

const brief = structuredClone(
  briefFixture,
) as unknown as PetraProjectBriefReadView;
const representativeShell = structuredClone(brief.content.shell);
const projectId = representativeShell.project_id;
const title = representativeShell.content.project.name;
const currentObjective = representativeShell.content.current_objective;
if (currentObjective === undefined) {
  throw new Error("The representative Project requires a current Objective.");
}
const objective = currentObjective.statement;

const decoyShell = structuredClone(representativeShell);
decoyShell.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FAX";
decoyShell.content.project.project_id = decoyShell.project_id;
decoyShell.content.project.name = "Nearby but different Project";
if (decoyShell.content.current_objective !== undefined) {
  decoyShell.content.current_objective.objective_id =
    "objective_01K4C000000000000000000015";
  decoyShell.content.current_objective.statement =
    "Keep this neighboring Project out of the selected Brief.";
}
decoyShell.content_hash = await digest(decoyShell.content);

const collection = async (
  limit: number,
): Promise<PetraProjectShellCollectionView> => {
  const content: PetraProjectShellCollectionView["content"] = {
    query: { limit },
    projects: [decoyShell, representativeShell],
    page: {
      returned_count: 2,
      total_count: 2,
      has_more: false,
    },
  };
  return {
    schema_name: "petra.project-shell-collection-view",
    schema_version: "1.0.0",
    content,
    content_hash: await digest(content),
    read_at: "2026-09-20T22:40:00.000Z",
  };
};

const controls = structuredClone(controlsFixture);
controls.content.project_definition_ref.content_hash =
  brief.content.definition.content_hash;
controls.content.project_definition_ref.record_hash = await digest(
  brief.content.definition,
);
controls.content_hash = await digest(controls.content);
const profile = structuredClone(
  scientificProfileFixture,
) as unknown as PetraRegisteredProjectProfile;

window.projectOpenCalls = [];
window.projectOpenExpected = { projectId, title, objective };
window.sessionStorage.setItem("petra.auth.token", "browser-project-open-token");

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
  window.projectOpenCalls.push({
    method: init?.method ?? (input instanceof Request ? input.method : "GET"),
    path: `${url.pathname}${url.search}`,
    authorization: headers.get("authorization"),
  });

  if (url.pathname === "/api/queries/projects") {
    return json(await collection(Number(url.searchParams.get("limit") ?? 50)));
  }
  if (url.pathname === "/api/queries/project-profiles") {
    return json({ profiles: [profile] });
  }
  if (url.pathname === `/api/queries/projects/${projectId}/shell`) {
    return json(representativeShell);
  }
  if (url.pathname === `/api/queries/projects/${projectId}/brief`) {
    return json(brief);
  }
  if (
    url.pathname === `/api/queries/projects/${projectId}/effective-controls`
  ) {
    return json(controls);
  }
  if (url.pathname.includes(decoyShell.project_id)) {
    return json(
      {
        error: {
          code: "WRONG_PROJECT_OPEN",
          message: "The neighboring Project must not be opened by this trace.",
        },
      },
      500,
    );
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
          loader: loadProjectsHome,
          element: <ProjectsRoute />,
        },
        {
          path: "projects/:projectId",
          loader: loadProjectRecord,
          element: <ProjectShell />,
          children: [
            {
              path: "brief",
              loader: loadProjectBrief,
              element: <BriefRoute />,
            },
          ],
        },
      ],
    },
  ],
  { initialEntries: ["/"] },
);
window.projectOpenRouter = router;

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
