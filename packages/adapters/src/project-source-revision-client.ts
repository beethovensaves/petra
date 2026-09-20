import type {
  PetraProjectSource,
  PetraProjectSourceRevisionReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectSourceRevisionClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceRevisionClientError";
  }
}

export interface ProjectSourceRevisionClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export interface ProjectSourceRevisionClientResult {
  readonly receipt: PetraProjectSourceRevisionReceipt;
  readonly projectSource: PetraProjectSource;
  readonly applied: boolean;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;

/** Renderer-neutral client for authenticated immutable source-version intake. */
export class ProjectSourceRevisionClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectSourceRevisionClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async addRevision(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceRevisionRequest,
  ): Promise<ProjectSourceRevisionClientResult> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body: unknown = await this.#json(
      `/api/commands/projects/${projectId}/sources/${projectSourceId}/revisions`,
      request,
    );
    if (typeof body !== "object" || body === null) {
      throw this.#invalidResponse();
    }
    const result = body as Partial<ProjectSourceRevisionClientResult>;
    this.#contracts.assertValid(
      "project-source-revision-receipt",
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
      result.receipt.predecessor_source_ref.project_source_id !==
        projectSourceId ||
      result.receipt.successor_source_ref.project_source_id !==
        result.projectSource?.project_source_id ||
      result.receipt.successor_source_ref.revision !==
        result.projectSource.revision ||
      result.receipt.successor_source_ref.content_hash !==
        result.projectSource.content_hash ||
      result.receipt.replacement_handoff.exclude_predecessor.expected_source_ref
        .project_source_id !== projectSourceId ||
      result.receipt.replacement_handoff.create_replacement
        .replacement_source_ref.project_source_id !==
        result.projectSource.project_source_id ||
      result.receipt.destination.project_id !== projectId ||
      result.receipt.destination.project_source_id !==
        result.projectSource.project_source_id
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(result as ProjectSourceRevisionClientResult);
  }

  async assessRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceRevisionRequest,
  ): Promise<PetraProjectSourceRevisionRecoveryView> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body: unknown = await this.#json(
      `/api/queries/projects/${projectId}/source-revision-recovery`,
      request,
    );
    this.#contracts.assertValid(
      "project-source-revision-recovery-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectSourceRevisionRecoveryView;
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
    projectSourceId: string,
    request: PetraProjectSourceRevisionRequest,
  ): void {
    if (
      !PROJECT_ID.test(projectId) ||
      !PROJECT_SOURCE_ID.test(projectSourceId)
    ) {
      throw new TypeError(
        "Source-version intake requires canonical Project and ProjectSource identities.",
      );
    }
    this.#contracts.assertValid(
      "project-source-revision-request",
      "1.0.0",
      request,
    );
    if (
      request.expected.project_ref.project_id !== projectId ||
      request.expected.current_source_ref.project_source_id !== projectSourceId
    ) {
      throw new TypeError(
        "The source-version request must bind the exact route Project and predecessor.",
      );
    }
  }

  async #json(
    path: string,
    body: PetraProjectSourceRevisionRequest,
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
    let code = "PROJECT_SOURCE_REVISION_REQUEST_FAILED";
    let message = `Source-version request failed with status ${response.status}.`;
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
    throw new ProjectSourceRevisionClientError(response.status, code, message);
  }

  #invalidResponse(): ProjectSourceRevisionClientError {
    return new ProjectSourceRevisionClientError(
      503,
      "PROJECT_SOURCE_REVISION_RESPONSE_INVALID",
      "The source-version response crossed its exact command, predecessor, successor, replacement handoff, or return boundary.",
    );
  }
}
