import type {
  PetraProjectSource,
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLinkRemovalReceipt,
  PetraProjectSourceLinkRemovalRecoveryView,
  PetraProjectSourceLinkRemovalRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectSourceLinkRemovalClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceLinkRemovalClientError";
  }
}

export interface ProjectSourceLinkRemovalClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export interface ProjectSourceLinkRemovalClientResult {
  readonly receipt: PetraProjectSourceLinkRemovalReceipt;
  readonly projectSource: PetraProjectSource;
  readonly applied: boolean;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;

/** Renderer-neutral client for exact ProjectSource link removal and recovery. */
export class ProjectSourceLinkRemovalClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectSourceLinkRemovalClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async preview(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceLinkRemovalPreview> {
    this.#assertRoute(projectId, projectSourceId);
    const response = await this.#fetch(
      new URL(
        `/api/queries/projects/${projectId}/sources/${projectSourceId}/link-removal`,
        this.options.baseUrl,
      ),
      { headers: { authorization: `Bearer ${this.options.token}` } },
    );
    const body = await this.#body(response);
    if (!response.ok) throw this.#failure(response.status, body);
    this.#contracts.assertValid(
      "project-source-link-removal-preview",
      "1.0.0",
      body,
    );
    const preview = body as PetraProjectSourceLinkRemovalPreview;
    if (
      preview.project_id !== projectId ||
      preview.project_source_id !== projectSourceId ||
      preview.expected.project_ref.project_id !== projectId ||
      preview.expected.current_source_ref.project_source_id !==
        projectSourceId ||
      preview.operation.command_name !== "ExcludeProjectSource"
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(preview);
  }

  async remove(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLinkRemovalRequest,
  ): Promise<ProjectSourceLinkRemovalClientResult> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body = await this.#json(
      `/api/commands/projects/${projectId}/sources/${projectSourceId}/link-removal`,
      request,
    );
    if (typeof body !== "object" || body === null) {
      throw this.#invalidResponse();
    }
    const result = body as Partial<ProjectSourceLinkRemovalClientResult>;
    this.#contracts.assertValid(
      "project-source-link-removal-receipt",
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
      result.receipt.prior_source_ref.project_source_id !== projectSourceId ||
      result.receipt.resulting_source_ref.project_source_id !==
        projectSourceId ||
      result.receipt.resulting_source_ref.revision !==
        result.projectSource?.revision ||
      result.receipt.resulting_source_ref.content_hash !==
        result.projectSource.content_hash ||
      result.projectSource.content.status !== "excluded" ||
      result.receipt.effect.local_copy_deleted !== false ||
      result.receipt.destination.project_id !== projectId ||
      result.receipt.destination.project_source_id !== projectSourceId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(result as ProjectSourceLinkRemovalClientResult);
  }

  async assessRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLinkRemovalRequest,
  ): Promise<PetraProjectSourceLinkRemovalRecoveryView> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body = await this.#json(
      `/api/queries/projects/${projectId}/sources/${projectSourceId}/link-removal-recovery`,
      request,
    );
    this.#contracts.assertValid(
      "project-source-link-removal-recovery-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectSourceLinkRemovalRecoveryView;
    if (
      view.project_id !== projectId ||
      view.project_source_id !== projectSourceId ||
      view.subject.command_id !== request.command_id ||
      view.subject.idempotency_key !== request.idempotency_key ||
      view.return.destination.project_id !== projectId
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(view);
  }

  #assertRoute(projectId: string, projectSourceId: string): void {
    if (
      !PROJECT_ID.test(projectId) ||
      !PROJECT_SOURCE_ID.test(projectSourceId)
    ) {
      throw new TypeError(
        "Project-link removal requires canonical Project and ProjectSource identities.",
      );
    }
  }

  #assertRequest(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLinkRemovalRequest,
  ): void {
    this.#assertRoute(projectId, projectSourceId);
    this.#contracts.assertValid(
      "project-source-link-removal-request",
      "1.0.0",
      request,
    );
    if (
      request.expected.project_ref.project_id !== projectId ||
      request.expected.current_source_ref.project_source_id !== projectSourceId
    ) {
      throw new TypeError(
        "The Project-link removal request must bind the exact route Project and ProjectSource.",
      );
    }
  }

  async #json(
    path: string,
    body: PetraProjectSourceLinkRemovalRequest,
  ): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await this.#body(response);
    if (!response.ok) throw this.#failure(response.status, payload);
    return payload;
  }

  async #body(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  #failure(status: number, body: unknown): ProjectSourceLinkRemovalClientError {
    let code = "PROJECT_SOURCE_LINK_REMOVAL_REQUEST_FAILED";
    let message = `Project-link removal request failed with status ${status}.`;
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = (body as { error?: { code?: unknown; message?: unknown } })
        .error;
      if (typeof error?.code === "string") code = error.code;
      if (typeof error?.message === "string") message = error.message;
    }
    return new ProjectSourceLinkRemovalClientError(status, code, message);
  }

  #invalidResponse(): ProjectSourceLinkRemovalClientError {
    return new ProjectSourceLinkRemovalClientError(
      503,
      "PROJECT_SOURCE_LINK_REMOVAL_RESPONSE_INVALID",
      "The Project-link removal response crossed its exact Project, definition, source, preservation, or return boundary.",
    );
  }
}
