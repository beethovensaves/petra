import type {
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionReceipt,
  PetraProjectSourceLocalCopyDeletionRecoveryView,
  PetraProjectSourceLocalCopyDeletionRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectSourceLocalCopyDeletionClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectSourceLocalCopyDeletionClientError";
  }
}

export interface ProjectSourceLocalCopyDeletionClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export interface ProjectSourceLocalCopyDeletionClientResult {
  readonly receipt: PetraProjectSourceLocalCopyDeletionReceipt;
  readonly applied: boolean;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const PROJECT_SOURCE_ID = /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u;

/** Renderer-neutral client for exact local-copy deletion and reconciliation. */
export class ProjectSourceLocalCopyDeletionClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectSourceLocalCopyDeletionClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async preview(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceLocalCopyDeletionPreview> {
    this.#assertRoute(projectId, projectSourceId);
    const response = await this.#fetch(
      new URL(
        this.#path("queries", projectId, projectSourceId),
        this.options.baseUrl,
      ),
      { headers: { authorization: `Bearer ${this.options.token}` } },
    );
    const body = await this.#body(response);
    if (!response.ok) throw this.#failure(response.status, body);
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-preview",
      "1.0.0",
      body,
    );
    const preview = body as PetraProjectSourceLocalCopyDeletionPreview;
    if (
      preview.project_id !== projectId ||
      preview.project_source_id !== projectSourceId ||
      preview.expected.project_ref.project_id !== projectId ||
      preview.expected.current_source_ref.project_source_id !==
        projectSourceId ||
      preview.operation.command_name !== "DeleteLocalSourceCopy"
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(preview);
  }

  async delete(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
  ): Promise<ProjectSourceLocalCopyDeletionClientResult> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body = await this.#json(
      this.#path("commands", projectId, projectSourceId),
      request,
    );
    if (typeof body !== "object" || body === null)
      throw this.#invalidResponse();
    const result = body as Partial<ProjectSourceLocalCopyDeletionClientResult>;
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-receipt",
      "1.0.0",
      result.receipt,
    );
    if (
      typeof result.applied !== "boolean" ||
      result.receipt?.project_id !== projectId ||
      result.receipt.source_ref.project_source_id !== projectSourceId ||
      result.receipt.command_id !== request.command_id ||
      result.receipt.idempotency_key !== request.idempotency_key ||
      result.receipt.copy_ref.artifact_manifest_id !==
        request.expected.copy_ref.artifact_manifest_id ||
      result.receipt.effect.local_copy_state !== "absent" ||
      result.receipt.preservation.project_link !== "retained"
    ) {
      throw this.#invalidResponse();
    }
    return structuredClone(
      result as ProjectSourceLocalCopyDeletionClientResult,
    );
  }

  async assessRecovery(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
  ): Promise<PetraProjectSourceLocalCopyDeletionRecoveryView> {
    this.#assertRequest(projectId, projectSourceId, request);
    const body = await this.#json(
      `${this.#path("queries", projectId, projectSourceId)}-recovery`,
      request,
    );
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-recovery-view",
      "1.0.0",
      body,
    );
    const view = body as PetraProjectSourceLocalCopyDeletionRecoveryView;
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

  #path(
    kind: "commands" | "queries",
    projectId: string,
    projectSourceId: string,
  ): string {
    return `/api/${kind}/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion`;
  }

  #assertRoute(projectId: string, projectSourceId: string): void {
    if (
      !PROJECT_ID.test(projectId) ||
      !PROJECT_SOURCE_ID.test(projectSourceId)
    ) {
      throw new TypeError(
        "Local-copy deletion requires canonical Project and ProjectSource identities.",
      );
    }
  }

  #assertRequest(
    projectId: string,
    projectSourceId: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
  ): void {
    this.#assertRoute(projectId, projectSourceId);
    this.#contracts.assertValid(
      "project-source-local-copy-deletion-request",
      "1.0.0",
      request,
    );
    if (
      request.expected.project_ref.project_id !== projectId ||
      request.expected.current_source_ref.project_source_id !== projectSourceId
    ) {
      throw new TypeError(
        "The local-copy deletion request must bind the exact route Project and ProjectSource.",
      );
    }
  }

  async #json(
    path: string,
    request: PetraProjectSourceLocalCopyDeletionRequest,
  ): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const body = await this.#body(response);
    if (!response.ok) throw this.#failure(response.status, body);
    return body;
  }

  async #body(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  #failure(
    status: number,
    body: unknown,
  ): ProjectSourceLocalCopyDeletionClientError {
    let code = "PROJECT_SOURCE_LOCAL_COPY_DELETION_REQUEST_FAILED";
    let message = `Local-copy deletion request failed with status ${status}.`;
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = (body as { error?: { code?: unknown; message?: unknown } })
        .error;
      if (typeof error?.code === "string") code = error.code;
      if (typeof error?.message === "string") message = error.message;
    }
    return new ProjectSourceLocalCopyDeletionClientError(status, code, message);
  }

  #invalidResponse(): ProjectSourceLocalCopyDeletionClientError {
    return new ProjectSourceLocalCopyDeletionClientError(
      503,
      "PROJECT_SOURCE_LOCAL_COPY_DELETION_RESPONSE_INVALID",
      "The local-copy deletion response crossed its exact Project, source, copy, preservation, or return boundary.",
    );
  }
}
