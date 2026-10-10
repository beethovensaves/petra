import type {
  PetraProjectSource,
  PetraProjectSourceRegistrationReceipt,
  PetraProjectSourceRegistrationRecoveryView,
  PetraProjectSourceRegistrationRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectSourceRegistrationClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceRegistrationClientError";
  }
}

export interface ProjectSourceRegistrationClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export interface ProjectSourceRegistrationClientResult {
  readonly receipt: PetraProjectSourceRegistrationReceipt;
  readonly projectSource: PetraProjectSource;
  readonly applied: boolean;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;

/** Renderer-neutral client for the authenticated source registration owner. */
export class ProjectSourceRegistrationClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectSourceRegistrationClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async readReceipt(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceRegistrationReceipt | undefined> {
    if (
      !PROJECT_ID.test(projectId) ||
      !PROJECT_SOURCE_ID.test(projectSourceId)
    ) {
      throw new TypeError(
        "A registration receipt requires an exact Project source.",
      );
    }
    let body: unknown;
    try {
      body = await this.#json(
        `/api/queries/projects/${projectId}/sources/${projectSourceId}/registration-receipt`,
      );
    } catch (error) {
      if (
        error instanceof ProjectSourceRegistrationClientError &&
        error.status === 404 &&
        error.code === "PROJECT_SOURCE_REGISTRATION_RECEIPT_NOT_FOUND"
      ) {
        return undefined;
      }
      throw error;
    }
    this.#contracts.assertValid(
      "project-source-registration-receipt",
      "1.0.0",
      body,
    );
    const receipt = body as PetraProjectSourceRegistrationReceipt;
    if (
      receipt.project_id !== projectId ||
      receipt.project_source_ref.project_source_id !== projectSourceId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(receipt);
  }

  async register(
    projectId: string,
    request: PetraProjectSourceRegistrationRequest,
  ): Promise<ProjectSourceRegistrationClientResult> {
    this.#assertRequest(projectId, request);
    const body: unknown = await this.#json(
      `/api/commands/projects/${projectId}/sources/register`,
      request,
    );
    if (typeof body !== "object" || body === null) {
      throw this.#invalidResponse();
    }
    const result = body as Partial<ProjectSourceRegistrationClientResult>;
    this.#contracts.assertValid(
      "project-source-registration-receipt",
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
      result.receipt.destination.project_id !== projectId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(result as ProjectSourceRegistrationClientResult);
  }

  async assessRecovery(
    projectId: string,
    request: PetraProjectSourceRegistrationRequest,
  ): Promise<PetraProjectSourceRegistrationRecoveryView> {
    this.#assertRequest(projectId, request);
    const body: unknown = await this.#json(
      `/api/queries/projects/${projectId}/source-registration-recovery`,
      request,
    );
    this.#contracts.assertValid(
      "project-source-registration-recovery-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectSourceRegistrationRecoveryView;
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
    request: PetraProjectSourceRegistrationRequest,
  ): void {
    if (!PROJECT_ID.test(projectId)) {
      throw new TypeError("Source registration requires a canonical Project.");
    }
    this.#contracts.assertValid(
      "project-source-registration-request",
      "1.0.0",
      request,
    );
    if (request.expected.project_ref.project_id !== projectId) {
      throw new TypeError(
        "The source registration request must bind the exact route Project.",
      );
    }
  }

  async #json(
    path: string,
    body?: PetraProjectSourceRegistrationRequest,
  ): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.ok) return response.json();
    let code = "PROJECT_SOURCE_REGISTRATION_REQUEST_FAILED";
    let message = `Source registration request failed with status ${response.status}.`;
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
    throw new ProjectSourceRegistrationClientError(
      response.status,
      code,
      message,
    );
  }

  #invalidResponse(): ProjectSourceRegistrationClientError {
    return new ProjectSourceRegistrationClientError(
      503,
      "PROJECT_SOURCE_REGISTRATION_RESPONSE_INVALID",
      "The source registration response crossed its exact command, Project, membership, or return boundary.",
    );
  }
}
