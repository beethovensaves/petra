import { Navigate, createBrowserRouter } from "react-router";

import { BrandGallery } from "./fixtures/BrandGallery.js";
import { FoundationGallery } from "./fixtures/FoundationGallery.js";
import { PrimitiveGallery } from "./fixtures/PrimitiveGallery.js";
import { ShellGallery } from "./fixtures/ShellGallery.js";
import {
  BriefRoute,
  ProductFrame,
  ProjectShell,
  ProjectsRoute,
  RouteError,
  SourceReaderRoute,
  SourcesRoute,
} from "./product/ReferenceWorkbench.js";
import type { EngineState } from "./product/model.js";

const loadHealth = async (): Promise<EngineState> => {
  try {
    const response = await fetch("/health");
    if (!response.ok) return { ok: false, accepting: false };
    return (await response.json()) as EngineState;
  } catch {
    return { ok: false, accepting: false };
  }
};

export const router = createBrowserRouter([
  {
    path: "/",
    loader: loadHealth,
    element: <ProductFrame />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <ProjectsRoute /> },
      {
        path: "projects/:projectId",
        element: <ProjectShell />,
        children: [
          { index: true, element: <Navigate to="brief" replace /> },
          { path: "brief", element: <BriefRoute /> },
          { path: "sources", element: <SourcesRoute /> },
          { path: "sources/:sourceId", element: <SourceReaderRoute /> },
        ],
      },
    ],
  },
  {
    path: "/__fixtures/foundation",
    element: <FoundationGallery />,
  },
  {
    path: "/__fixtures/foundation/:fixtureId",
    element: <FoundationGallery />,
  },
  {
    path: "/__fixtures/brand",
    element: <BrandGallery />,
  },
  {
    path: "/__fixtures/primitives",
    element: <PrimitiveGallery />,
  },
  {
    path: "/__fixtures/shell",
    element: <ShellGallery />,
  },
]);
