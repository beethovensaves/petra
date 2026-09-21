import type {
  PetraProjectShellCollectionView,
  PetraProjectShellViewV11,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";

import { ProjectsSurface } from "../src/product/ReferenceWorkbench.js";
import { projectRecordFromShellView } from "../src/product/project-data.js";
import shellFixture from "../../../packages/contracts/fixtures/accepted/project-shell-view-v1-1.json";
import scientificProfileFixture from "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json";
import writingProfileFixture from "../../../packages/contracts/fixtures/accepted/registered-project-profile-controlled-writing.json";
import "../src/design-system/tokens.css";
import "../src/design-system/primitives.css";
import "../src/styles.css";
import "../src/product/reference-workbench.css";
import "../src/product/project-profile.css";

type RecordedCall = {
  readonly path: string;
  readonly authorization: string | null;
};

declare global {
  interface Window {
    projectSearchCalls: RecordedCall[];
    projectSearchUnavailable: boolean;
    projectSearchDelay: boolean;
  }
}

const shell = (
  projectId: string,
  name: string,
  objective: string,
  status: "active" | "archived",
  definitionFamily: string,
  profileLabel: string,
): PetraProjectShellViewV11 => {
  const value = structuredClone(
    shellFixture,
  ) as unknown as PetraProjectShellViewV11;
  value.project_id = projectId;
  value.content.project.project_id = projectId;
  value.content.project.name = name;
  value.content.project.status = status;
  value.content.definition.definition_family = definitionFamily;
  value.content.definition.label = profileLabel;
  if (value.content.current_objective !== undefined) {
    value.content.current_objective.statement = objective;
  }
  return value;
};

const projects = [
  shell(
    "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
    "Arctic evidence review",
    "Compare safety evidence for winter inlet operations.",
    "active",
    "petra.scientific-evidence",
    "Scientific evidence inquiry",
  ),
  shell(
    "project_01ARZ3NDEKTSV4RRFFQ69G5FAX",
    "Field procedure revision",
    "Publish a controlled emergency response procedure.",
    "active",
    "petra.controlled-writing",
    "Controlled writing",
  ),
  shell(
    "project_01ARZ3NDEKTSV4RRFFQ69G5FAY",
    "Retired turbine study",
    "Retain archived vibration findings for inspection.",
    "archived",
    "petra.scientific-evidence",
    "Scientific evidence inquiry",
  ),
];

const digest = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

const collection = async (
  query: PetraProjectShellCollectionView["content"]["query"],
): Promise<PetraProjectShellCollectionView> => {
  const search = query.search?.toLocaleLowerCase();
  const matches = projects.filter((project) => {
    if (
      search !== undefined &&
      !`${project.content.project.name} ${project.content.current_objective?.statement ?? ""} ${project.content.definition.label}`
        .toLocaleLowerCase()
        .includes(search)
    ) {
      return false;
    }
    if (
      query.status !== undefined &&
      project.content.project.status !== query.status
    ) {
      return false;
    }
    return (
      query.profile === undefined ||
      project.content.definition.definition_family === query.profile
    );
  });
  const offset = Number(query.cursor?.slice("offset:".length) ?? 0);
  const pageProjects = matches.slice(offset, offset + query.limit);
  const hasMore = offset + pageProjects.length < matches.length;
  const content: PetraProjectShellCollectionView["content"] = {
    query,
    projects: pageProjects,
    page: {
      returned_count: pageProjects.length,
      total_count: matches.length,
      has_more: hasMore,
      ...(hasMore
        ? { next_cursor: `offset:${offset + pageProjects.length}` }
        : {}),
    },
  };
  return {
    schema_name: "petra.project-shell-collection-view",
    schema_version: "1.0.0",
    content,
    content_hash: await digest(content),
    read_at: "2026-09-20T18:00:00.000Z",
  };
};

window.projectSearchCalls = [];
window.projectSearchUnavailable = false;
window.projectSearchDelay = false;
window.sessionStorage.setItem(
  "petra.auth.token",
  "browser-project-search-token",
);

window.fetch = async (input, init): Promise<Response> => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    window.location.origin,
  );
  const headers = new Headers(init?.headers);
  window.projectSearchCalls.push({
    path: `${url.pathname}${url.search}`,
    authorization: headers.get("authorization"),
  });
  if (url.pathname !== "/api/queries/projects") {
    return Response.json(
      { error: { code: "UNEXPECTED_TEST_ROUTE", message: url.pathname } },
      { status: 500 },
    );
  }
  const delayed = window.projectSearchDelay;
  if (delayed) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 180));
  }
  if (window.projectSearchUnavailable) {
    return Response.json(
      {
        error: {
          code: "PROJECT_COLLECTION_READ_FAILED",
          message: "The authorized Project list could not be read.",
        },
      },
      { status: 503 },
    );
  }
  const query: PetraProjectShellCollectionView["content"]["query"] = {
    ...(url.searchParams.has("search")
      ? { search: url.searchParams.get("search")! }
      : {}),
    ...(url.searchParams.has("status")
      ? {
          status: url.searchParams.get("status") as "active" | "archived",
        }
      : {}),
    ...(url.searchParams.has("profile")
      ? { profile: url.searchParams.get("profile")! }
      : {}),
    limit: Number(url.searchParams.get("limit")),
    ...(url.searchParams.has("cursor")
      ? { cursor: url.searchParams.get("cursor")! }
      : {}),
  };
  return Response.json(await collection(query));
};

const initial = await collection({ limit: 2 });
const profiles = [
  structuredClone(
    scientificProfileFixture,
  ) as unknown as PetraRegisteredProjectProfile,
  structuredClone(
    writingProfileFixture,
  ) as unknown as PetraRegisteredProjectProfile,
];

createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <ProjectsSurface
      projects={initial.content.projects.map((project) =>
        projectRecordFromShellView(project),
      )}
      profiles={profiles}
      query={initial.content.query}
      page={initial.content.page}
    />
  </MemoryRouter>,
);
