import type {
  PetraProjectShellCollectionView,
  PetraProjectShellView,
  PetraProjectShellViewV11,
  PetraProjectShellViewV12,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectShellCollectionRequest } from "@petra/core";
import { canonicalize } from "json-canonicalize";

export interface ProjectShellClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export class ProjectShellClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProjectShellClientError";
  }
}

export type ProjectShellReadView =
  PetraProjectShellView | PetraProjectShellViewV11 | PetraProjectShellViewV12;

const digest = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const expectedQuery = (
  request: ProjectShellCollectionRequest,
): PetraProjectShellCollectionView["content"]["query"] => {
  const allowed = new Set(["search", "status", "profile", "limit", "cursor"]);
  if (Object.keys(request).some((key) => !allowed.has(key))) {
    throw new TypeError(
      "Project search accepts only registered collection controls.",
    );
  }
  if (
    request.search !== undefined &&
    (request.search.length < 1 ||
      request.search.length > 240 ||
      request.search !== request.search.trim())
  ) {
    throw new TypeError(
      "Project search must be a trimmed string from 1 through 240 characters.",
    );
  }
  if (
    request.status !== undefined &&
    request.status !== "active" &&
    request.status !== "archived"
  ) {
    throw new TypeError("Project status must be active or archived.");
  }
  if (
    request.profile !== undefined &&
    !/^[a-z][a-z0-9.-]{2,127}$/u.test(request.profile)
  ) {
    throw new TypeError(
      "Project profile must be a registered definition family.",
    );
  }
  const limit = request.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError("Project search limit must be from 1 through 100.");
  }
  if (
    request.cursor !== undefined &&
    !/^offset:[0-9]{1,9}$/u.test(request.cursor)
  ) {
    throw new TypeError("Project search cursor is invalid.");
  }
  return {
    ...(request.search === undefined ? {} : { search: request.search }),
    ...(request.status === undefined ? {} : { status: request.status }),
    ...(request.profile === undefined ? {} : { profile: request.profile }),
    limit,
    ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
  };
};

const responseFailure = async (
  response: Response,
  fallbackMessage: string,
): Promise<never> => {
  let code = "PROJECT_SHELL_READ_FAILED";
  let message = `${fallbackMessage} (${response.status}).`;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null
    ) {
      if ("code" in body.error && typeof body.error.code === "string") {
        code = body.error.code;
      }
      if ("message" in body.error && typeof body.error.message === "string") {
        message = body.error.message;
      }
    }
  } catch {
    // Keep the stable status-based fallback for non-JSON failures.
  }
  throw new ProjectShellClientError(code, response.status, message);
};

/** Renderer-neutral authenticated Project search. It performs no client filtering. */
export class ProjectShellClient {
  constructor(readonly options: ProjectShellClientOptions) {}

  async search(
    request: ProjectShellCollectionRequest = {},
  ): Promise<PetraProjectShellCollectionView> {
    const query = expectedQuery(request);
    const url = new URL("/api/queries/projects", this.options.baseUrl);
    for (const key of [
      "search",
      "status",
      "profile",
      "limit",
      "cursor",
    ] as const) {
      const value = query[key];
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const response = await (this.options.fetch ?? fetch)(url, {
      method: "GET",
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (!response.ok) return responseFailure(response, "Project search failed");
    const body: unknown = await response.json();
    const contracts = this.options.contracts ?? new PetraContractRegistry();
    contracts.assertValid("project-shell-collection-view", "1.0.0", body);
    const view = body as PetraProjectShellCollectionView;
    if (
      canonicalize(view.content.query) !== canonicalize(query) ||
      view.content.page.returned_count !== view.content.projects.length ||
      view.content_hash !== (await digest(view.content))
    ) {
      throw new ProjectShellClientError(
        "PROJECT_COLLECTION_RESPONSE_INVALID",
        502,
        "Petra returned a Project collection for a different query or with an invalid result identity.",
      );
    }
    return view;
  }

  /**
   * Resolves one exact Project through the authenticated shell read used by a
   * Project destination. The caller may choose a browser route, but it cannot
   * substitute Project identity or shell content.
   */
  async open(projectId: string): Promise<ProjectShellReadView> {
    if (!/^project_[0-9A-HJKMNP-TV-Z]{26}$/u.test(projectId)) {
      throw new TypeError("Project open requires one exact Petra Project ID.");
    }
    const url = new URL(
      `/api/queries/projects/${encodeURIComponent(projectId)}/shell`,
      this.options.baseUrl,
    );
    const response = await (this.options.fetch ?? fetch)(url, {
      method: "GET",
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (!response.ok) return responseFailure(response, "Project open failed");
    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("schema_name" in body) ||
      body.schema_name !== "petra.project-shell-view" ||
      !("schema_version" in body) ||
      (body.schema_version !== "1.0.0" &&
        body.schema_version !== "1.1.0" &&
        body.schema_version !== "1.2.0")
    ) {
      throw new ProjectShellClientError(
        "PROJECT_SHELL_RESPONSE_INVALID",
        502,
        "Petra returned an invalid Project shell response.",
      );
    }
    const contracts = this.options.contracts ?? new PetraContractRegistry();
    contracts.assertValid("project-shell-view", body.schema_version, body);
    const view = body as ProjectShellReadView;
    if (
      view.project_id !== projectId ||
      view.content.project.project_id !== projectId ||
      view.content_hash !== (await digest(view.content))
    ) {
      throw new ProjectShellClientError(
        "PROJECT_SHELL_RESPONSE_INVALID",
        502,
        "Petra returned a Project shell for another Project or with an invalid result identity.",
      );
    }
    return view;
  }
}
