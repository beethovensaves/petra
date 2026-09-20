import type {
  PetraProjectSource,
  PetraProjectSourceReuseReceipt,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectSourceReuseClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceReuseClientError";
  }
}

export interface ProjectSourceReuseClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export interface ProjectSourceReuseClientResult {
  readonly receipt: PetraProjectSourceReuseReceipt;
  readonly projectSource: PetraProjectSource;
  readonly applied: boolean;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;

/** Renderer-neutral client for the authenticated exact-source reuse owner. */
export class ProjectSourceReuseClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectSourceReuseClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async reuse(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
  ): Promise<ProjectSourceReuseClientResult> {
    this.#assertRequest(projectId, request);
    const body: unknown = await this.#json(
      `/api/commands/projects/${projectId}/sources/reuse`,
      request,
    );
    if (typeof body !== "object" || body === null) {
      throw this.#invalidResponse();
    }
    const result = body as Partial<ProjectSourceReuseClientResult>;
    this.#contracts.assertValid(
      "project-source-reuse-receipt",
      "1.0.0",
      result.receipt,
    );
    this.#contracts.assertValid(
      "project-source",
      "1.0.0",
      result.projectSource,
    );
    if (
      typeof result.applied !== "boolean" ||
      result.receipt?.project_id !== projectId ||
      result.receipt.command_id !== request.command_id ||
      result.receipt.idempotency_key !== request.idempotency_key ||
      result.receipt.project_source_ref.project_source_id !==
        result.projectSource?.project_source_id ||
      result.receipt.project_source_ref.revision !==
        result.projectSource.revision ||
      result.receipt.destination.project_id !== projectId ||
      result.receipt.destination.project_source_id !==
        result.projectSource.project_source_id
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(result as ProjectSourceReuseClientResult);
  }

  async assessRecovery(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
  ): Promise<PetraProjectSourceReuseRecoveryView> {
    this.#assertRequest(projectId, request);
    const body: unknown = await this.#json(
      `/api/queries/projects/${projectId}/source-reuse-recovery`,
      request,
    );
    this.#contracts.assertValid(
      "project-source-reuse-recovery-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectSourceReuseRecoveryView;
    if (
      view.project_id !== projectId ||
      view.subject.command_id !== request.command_id ||
      view.subject.idempotency_key !== request.idempotency_key ||
      view.return.destination.project_id !== projectId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(view);
  }

  #assertRequest(
    projectId: string,
    request: PetraProjectSourceReuseRequest,
  ): void {
    if (!PROJECT_ID.test(projectId)) {
      throw new TypeError("Source reuse requires a canonical Project.");
    }
    this.#contracts.assertValid(
      "project-source-reuse-request",
      "1.0.0",
      request,
    );
    if (request.expected.project_ref.project_id !== projectId) {
      throw new TypeError(
        "The source reuse request must bind the exact route Project.",
      );
    }
  }

  async #json(
    path: string,
    body: PetraProjectSourceReuseRequest,
  ): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (response.ok) return response.json();
    let code = "PROJECT_SOURCE_REUSE_REQUEST_FAILED";
    let message = `Source reuse request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as {
        error?: { code?: unknown; message?: unknown };
      };
      if (typeof payload.error?.code === "string") code = payload.error.code;
      if (typeof payload.error?.message === "string") {
        message = payload.error.message;
      }
    } catch {
      // Retain the bounded status fallback for non-JSON responses.
    }
    throw new ProjectSourceReuseClientError(response.status, code, message);
  }

  #invalidResponse(): ProjectSourceReuseClientError {
    return new ProjectSourceReuseClientError(
      503,
      "PROJECT_SOURCE_REUSE_RESPONSE_INVALID",
      "The source reuse response crossed its exact command, Project, membership, or return boundary.",
    );
  }
}
