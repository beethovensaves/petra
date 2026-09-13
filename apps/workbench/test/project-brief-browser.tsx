// Synthetic transport conformance harness; never imported by the production router.
import { createRoot } from "react-dom/client";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { BriefRoute } from "../src/product/ReferenceWorkbench.js";
import { loadProjectBrief } from "../src/product/project-data.js";
import fixture from "../src/product/project-brief.fixture.json";
import "../src/design-system/tokens.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";

const testWindow = window as unknown as {
  briefCalls: { url: string; method: string }[];
};
testWindow.briefCalls = [];
const realFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (!url.includes("/api/")) return realFetch(input, init);
  testWindow.briefCalls.push({ url, method: init?.method ?? "GET" });
  if (url.endsWith(`/projects/${fixture.project_id}/brief`)) {
    const status = Number(
      new URL(window.location.href).searchParams.get("status") ?? 200,
    );
    return Response.json(status === 200 ? fixture : {}, { status });
  }
  return Response.json({}, { status: 404 });
};
const router = createMemoryRouter(
  [
    {
      path: "/projects/:projectId/brief",
      loader: loadProjectBrief,
      Component: BriefRoute,
    },
  ],
  {
    initialEntries: [`/projects/${fixture.project_id}/brief`],
  },
);
createRoot(document.getElementById("root")!).render(
  <div className="reference-app">
    <RouterProvider router={router} />
  </div>,
);
