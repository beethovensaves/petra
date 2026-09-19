import type {
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectWorkClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProjectWorkClientError";
    this.status = status;
    this.code = code;
  }
}

export interface ProjectWorkClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORK_UNIT_ID = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;

/** Renderer-neutral client for the server-owned Work operation assessment and command. */
export class ProjectWorkClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectWorkClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async readOperations(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkOperationsView> {
    this.#assertTarget(projectId, workUnitId);
    const response = await this.#request(
      `/api/queries/projects/${projectId}/work/${workUnitId}/operations`,
      { method: "GET" },
    );
    const body: unknown = await response.json();
    this.#contracts.assertValid("project-work-operations-view", "1.0.0", body);
    const view = body as PetraProjectWorkOperationsView;
    if (
      view.project_id !== projectId ||
      view.work_unit_ref.work_unit_id !== workUnitId
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The Work operation assessment crossed the requested Project or WorkUnit.",
      );
    }
    return structuredClone(view);
  }

  async execute(
    projectId: string,
    workUnitId: string,
    request: PetraProjectWorkOperationRequest,
  ): Promise<PetraProjectWorkOperationReceipt> {
    this.#assertTarget(projectId, workUnitId);
    this.#contracts.assertValid(
      "project-work-operation-request",
      "1.0.0",
      request,
    );
    if (request.expected_work_unit_ref.work_unit_id !== workUnitId) {
      throw new TypeError(
        "The Work operation request must bind the exact route WorkUnit.",
      );
    }
    const response = await this.#request(
      `/api/commands/projects/${projectId}/work/${workUnitId}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
    );
    const body: unknown = await response.json();
    this.#contracts.assertValid(
      "project-work-operation-receipt",
      "1.0.0",
      body,
    );
    const receipt = body as PetraProjectWorkOperationReceipt;
    if (
      receipt.project_id !== projectId ||
      receipt.requested_work_unit_ref.work_unit_id !== workUnitId ||
      receipt.command_id !== request.command_id ||
      receipt.idempotency_key !== request.idempotency_key ||
      receipt.operation !== request.operation
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The Work operation receipt does not match the exact command request.",
      );
    }
    return structuredClone(receipt);
  }

  #assertTarget(projectId: string, workUnitId: string): void {
    if (!PROJECT_ID.test(projectId) || !WORK_UNIT_ID.test(workUnitId)) {
      throw new TypeError(
        "A Work operation requires canonical Project and WorkUnit identities.",
      );
    }
  }

  async #request(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${this.options.token}`);
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      ...init,
      headers,
    });
    if (response.ok) return response;
    let code = "PROJECT_WORK_REQUEST_FAILED";
    let message = `Project Work request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as {
        error?: { code?: unknown; message?: unknown };
      };
      if (typeof body.error?.code === "string") code = body.error.code;
      if (typeof body.error?.message === "string") message = body.error.message;
    } catch {
      // Keep the bounded status fallback when the response is not JSON.
    }
    throw new ProjectWorkClientError(response.status, code, message);
  }
}
