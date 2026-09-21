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
import { ProjectProfileRoute } from "./product/ProjectProfileSurface.js";
import { CheckpointGuideRoute } from "./product/CheckpointGuide.js";
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
  HistoryEventRoute,
  HistoryRoute,
  ProfileToolRoute,
  SettingsRoute,
} from "./product/RemainingSurfaces.js";
import type { EngineState } from "./product/model.js";
import {
  loadProjectsHome,
  loadProjectBrief,
  loadProjectHistoryEvent,
  loadProjectObjectLocationRedirect,
  loadProjectPetra,
  loadProjectGraph,
  loadProjectRecord,
  loadProjectResume,
  loadProjectTaxonomy,
  loadProjectReviewCollection,
  loadProjectReviewSession,
  loadProjectSettings,
  loadProjectSuggestedActionHistory,
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
        loader: loadProjectsHome,
        element: <ProjectsRoute />,
      },
      {
        path: "guide",
        loader: loadProjectsHome,
        element: <CheckpointGuideRoute />,
      },
      {
        path: "projects/:projectId",
        loader: loadProjectRecord,
        element: <ProjectShell />,
        children: [
          { index: true, element: <Navigate to="brief" replace /> },
          {
            path: "resume",
            loader: loadProjectResume,
            element: <GraphRoute />,
          },
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
            loader: loadProjectGraph,
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
            loader: loadProjectPetra,
            element: <PetraRoute />,
          },
          {
            path: "petra/:threadId",
            loader: loadProjectPetra,
            element: <PetraRoute />,
          },
          {
            path: "profile",
            loader: loadProjectTaxonomy,
            element: <ProjectProfileRoute />,
          },
          { path: "composition", element: <CompositionCollectionRoute /> },
          {
            path: "composition/:artifactId",
            element: <CompositionArtifactRoute />,
          },
          {
            path: "history",
            loader: loadProjectSuggestedActionHistory,
            element: <HistoryRoute />,
          },
          {
            path: "history/:episodeId",
            loader: loadProjectHistoryEvent,
            element: <HistoryEventRoute />,
          },
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
