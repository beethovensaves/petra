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
import { GraphRoute } from "./product/GraphSurface.js";
import {
  ReviewCollectionRoute,
  ReviewSessionRoute,
} from "./product/ReviewSurface.js";
import {
  PetraRoute,
  WorkCollectionRoute,
  WorkDetailRoute,
} from "./product/WorkPetraSurface.js";
import {
  CompositionArtifactRoute,
  CompositionCollectionRoute,
  HistoryRoute,
  ProfileToolRoute,
  SettingsRoute,
} from "./product/RemainingSurfaces.js";
import type { EngineState } from "./product/model.js";
import {
  loadProjectCollection,
  loadProjectBrief,
  loadProjectObjectLocationRedirect,
  loadProjectPetraThread,
  loadProjectRelationshipView,
  loadProjectRecord,
  loadProjectReviewCollection,
  loadProjectReviewSession,
  loadProjectSettings,
  loadProjectSourceCollection,
  loadProjectSourceRecord,
  loadProjectWorkCollection,
  loadProjectWorkDetail,
} from "./product/project-data.js";

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
      {
        index: true,
        loader: loadProjectCollection,
        element: <ProjectsRoute />,
      },
      {
        path: "projects/:projectId",
        loader: loadProjectRecord,
        element: <ProjectShell />,
        children: [
          { index: true, element: <Navigate to="brief" replace /> },
          {
            path: "brief",
            loader: loadProjectBrief,
            element: <BriefRoute />,
          },
          {
            path: "locate",
            loader: loadProjectObjectLocationRedirect,
          },
          {
            path: "sources",
            loader: loadProjectSourceCollection,
            element: <SourcesRoute />,
          },
          {
            path: "sources/:sourceId",
            loader: loadProjectSourceRecord,
            element: <SourceReaderRoute />,
          },
          {
            path: "review",
            loader: loadProjectReviewCollection,
            element: <ReviewCollectionRoute />,
          },
          {
            path: "review/:reviewId",
            loader: loadProjectReviewSession,
            element: <ReviewSessionRoute />,
          },
          {
            path: "graph",
            loader: loadProjectRelationshipView,
            element: <GraphRoute />,
          },
          {
            path: "work",
            loader: loadProjectWorkCollection,
            element: <WorkCollectionRoute />,
          },
          {
            path: "work/:workId",
            loader: loadProjectWorkDetail,
            element: <WorkDetailRoute />,
          },
          {
            path: "petra",
            loader: loadProjectPetraThread,
            element: <PetraRoute />,
          },
          { path: "composition", element: <CompositionCollectionRoute /> },
          {
            path: "composition/:artifactId",
            element: <CompositionArtifactRoute />,
          },
          { path: "history", element: <HistoryRoute /> },
          { path: "history/:episodeId", element: <HistoryRoute /> },
          { path: "tools/:toolId", element: <ProfileToolRoute /> },
        ],
      },
      {
        path: "settings",
        loader: loadProjectSettings,
        element: <SettingsRoute />,
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
