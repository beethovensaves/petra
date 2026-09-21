import type { PetraProjectSourceView } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

export interface ProjectSourceDiscoveryClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export class ProjectSourceDiscoveryClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceDiscoveryClientError";
  }
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;

const digest = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

const exactKeys = (value: object, expected: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
};

/**
 * Renderer-neutral client for the authenticated ProjectSource collection and
 * exact source read. Human-facing filtering remains presentation state over
 * this server-owned Project-scoped collection.
 */
export class ProjectSourceDiscoveryClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectSourceDiscoveryClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async list(projectId: string): Promise<PetraProjectSourceView[]> {
    this.#assertProjectId(projectId);
    const body = await this.#json(
      `/api/queries/projects/${encodeURIComponent(projectId)}/sources`,
      "Project source discovery failed",
    );
    if (
      typeof body !== "object" ||
      body === null ||
      !exactKeys(body, ["sources"]) ||
      !("sources" in body) ||
      !Array.isArray(body.sources)
    ) {
      throw this.#invalidResponse(
        "Petra returned an invalid Project source collection.",
      );
    }
    const sources: PetraProjectSourceView[] = [];
    const sourceIds = new Set<string>();
    for (const value of body.sources) {
      const source = await this.#source(value, projectId);
      if (sourceIds.has(source.project_source_id)) {
        throw this.#invalidResponse(
          "Petra returned the same Project source identity more than once.",
        );
      }
      sourceIds.add(source.project_source_id);
      sources.push(source);
    }
    return sources;
  }

  async open(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceView> {
    this.#assertProjectId(projectId);
    if (!PROJECT_SOURCE_ID.test(projectSourceId)) {
      throw new TypeError(
        "Exact source inspection requires one canonical ProjectSource ID.",
      );
    }
    const body = await this.#json(
      `/api/queries/projects/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(projectSourceId)}`,
      "Exact Project source inspection failed",
    );
    return this.#source(body, projectId, projectSourceId);
  }

  #assertProjectId(projectId: string): void {
    if (!PROJECT_ID.test(projectId)) {
      throw new TypeError(
        "Project source discovery requires one canonical Project ID.",
      );
    }
  }

  async #source(
    value: unknown,
    projectId: string,
    projectSourceId?: string,
  ): Promise<PetraProjectSourceView> {
    this.#contracts.assertValid("project-source-view", "1.0.0", value);
    const source = value as PetraProjectSourceView;
    if (
      source.project_id !== projectId ||
      (projectSourceId !== undefined &&
        source.project_source_id !== projectSourceId) ||
      source.content_hash !== (await digest(source.content))
    ) {
      throw this.#invalidResponse(
        "Petra returned a Project source for another identity or with an invalid content hash.",
      );
    }
    return structuredClone(source);
  }

  async #json(path: string, fallbackMessage: string): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      method: "GET",
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (response.ok) return response.json();
    let code = "PROJECT_SOURCE_READ_FAILED";
    let message = `${fallbackMessage} (${response.status}).`;
    try {
      const body = (await response.json()) as {
        readonly error?: {
          readonly code?: unknown;
          readonly message?: unknown;
        };
      };
      if (typeof body.error?.code === "string") code = body.error.code;
      if (typeof body.error?.message === "string") {
        message = body.error.message;
      }
    } catch {
      // Retain the bounded status fallback for non-JSON failures.
    }
    throw new ProjectSourceDiscoveryClientError(code, response.status, message);
  }

  #invalidResponse(message: string): ProjectSourceDiscoveryClientError {
    return new ProjectSourceDiscoveryClientError(
      "PROJECT_SOURCE_RESPONSE_INVALID",
      502,
      message,
    );
  }
}
