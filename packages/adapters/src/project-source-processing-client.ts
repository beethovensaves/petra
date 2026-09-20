import type {
  PetraProjectSourceProcessingReceipt,
  PetraProjectSourceProcessingRecoveryView,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceProcessingView,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectSourceProcessingClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceProcessingClientError";
  }
}

export interface ProjectSourceProcessingClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export interface ProjectSourceProcessingClientResult {
  readonly receipt: PetraProjectSourceProcessingReceipt;
  readonly workUnit: PetraWorkUnit;
  readonly inputManifest: PetraWorkerInputManifest;
  readonly processing: PetraProjectSourceProcessingView;
  readonly applied: boolean;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;

/** Renderer-neutral client for exact source processing and reconciliation. */
export class ProjectSourceProcessingClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectSourceProcessingClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async get(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceProcessingView> {
    this.#assertRoute(projectId, projectSourceId);
    const body = await this.#json(
      "GET",
      `/api/queries/projects/${projectId}/sources/${projectSourceId}/processing`,
    );
    this.#contracts.assertValid(
      "project-source-processing-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectSourceProcessingView;
    if (
      view.project_id !== projectId ||
      view.project_source_id !== projectSourceId ||
      view.return.project_id !== projectId ||
      view.return.project_source_id !== projectSourceId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(view);
  }

  async start(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
  ): Promise<ProjectSourceProcessingClientResult> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body = await this.#json(
      "POST",
      `/api/commands/projects/${projectId}/sources/${projectSourceId}/processing`,
      request,
    );
    if (typeof body !== "object" || body === null) {
      throw this.#invalidResponse();
    }
    const result = body as Partial<ProjectSourceProcessingClientResult>;
    this.#contracts.assertValid(
      "project-source-processing-receipt",
      "1.0.0",
      result.receipt,
    );
    this.#contracts.assertValid("work-unit", "1.0.0", result.workUnit);
    this.#contracts.assertValid(
      "worker-input-manifest",
      "1.0.0",
      result.inputManifest,
    );
    this.#contracts.assertValid(
      "project-source-processing-view",
      "1.0.0",
      result.processing,
    );
    if (
      typeof result.applied !== "boolean" ||
      result.receipt?.project_id !== projectId ||
      result.receipt.command_id !== request.command_id ||
      result.receipt.idempotency_key !== request.idempotency_key ||
      result.receipt.destination.project_source_id !== projectSourceId ||
      result.receipt.work_unit_ref.work_unit_id !==
        result.workUnit?.work_unit_id ||
      result.receipt.input_manifest_ref.worker_input_manifest_id !==
        result.inputManifest?.worker_input_manifest_id ||
      result.processing?.project_source_id !== projectSourceId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(result as ProjectSourceProcessingClientResult);
  }

  async assessRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
  ): Promise<PetraProjectSourceProcessingRecoveryView> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body = await this.#json(
      "POST",
      `/api/queries/projects/${projectId}/sources/${projectSourceId}/processing-recovery`,
      request,
    );
    this.#contracts.assertValid(
      "project-source-processing-recovery-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectSourceProcessingRecoveryView;
    if (
      view.project_id !== projectId ||
      view.project_source_id !== projectSourceId ||
      view.subject.command_id !== request.command_id ||
      view.subject.idempotency_key !== request.idempotency_key ||
      view.return.destination.project_id !== projectId ||
      view.return.destination.project_source_id !== projectSourceId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(view);
  }

  #assertRequest(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceProcessingRequest,
  ): void {
    this.#assertRoute(projectId, projectSourceId);
    this.#contracts.assertValid(
      "project-source-processing-request",
      "1.0.0",
      request,
    );
    if (
      request.expected.project_ref.project_id !== projectId ||
      request.expected.project_source_ref.project_source_id !== projectSourceId
    ) {
      throw new TypeError(
        "The source-processing request must bind the exact route Project and ProjectSource.",
      );
    }
  }

  #assertRoute(projectId: string, projectSourceId: string): void {
    if (!PROJECT_ID.test(projectId) || !SOURCE_ID.test(projectSourceId)) {
      throw new TypeError(
        "Source processing requires canonical Project and ProjectSource identities.",
      );
    }
  }

  async #json(
    method: "GET" | "POST",
    path: string,
    body?: PetraProjectSourceProcessingRequest,
  ): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      method,
      headers: {
        authorization: `Bearer ${this.options.token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.ok) return response.json();
    let code = "PROJECT_SOURCE_PROCESSING_REQUEST_FAILED";
    let message = `Source-processing request failed with status ${response.status}.`;
    try {
      const payload = (await response.json()) as {
        error?: { code?: unknown; message?: unknown };
      };
      if (typeof payload.error?.code === "string") code = payload.error.code;
      if (typeof payload.error?.message === "string")
        message = payload.error.message;
    } catch {
      // Retain the bounded status fallback for non-JSON responses.
    }
    throw new ProjectSourceProcessingClientError(
      response.status,
      code,
      message,
    );
  }

  #invalidResponse(): ProjectSourceProcessingClientError {
    return new ProjectSourceProcessingClientError(
      503,
      "PROJECT_SOURCE_PROCESSING_RESPONSE_INVALID",
      "The source-processing response crossed its exact command, source, Work, or return boundary.",
    );
  }
}
