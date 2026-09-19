import type { PetraProjectModelReadinessView } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

import {
  PetraInteractionClient,
  type PetraInteractionResult,
} from "./ag-ui.js";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;

export class ProjectModelClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProjectModelClientError";
    this.status = status;
    this.code = code;
  }
}

export interface ProjectModelClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
  readonly traceId?: string;
}

/** Renderer-neutral Project readiness and exact interaction binding. */
export class ProjectModelClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectModelClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async readReadiness(
    projectId: string,
  ): Promise<PetraProjectModelReadinessView> {
    if (!PROJECT_ID.test(projectId)) {
      throw new TypeError(
        "A model readiness read requires a canonical Project ID.",
      );
    }
    const response = await this.#request(
      `/api/queries/projects/${projectId}/model-readiness`,
    );
    const body: unknown = await response.json();
    this.#contracts.assertValid("project-model-readiness-view", "1.0.0", body);
    const readiness = body as PetraProjectModelReadinessView;
    if (readiness.project_id !== projectId) {
      throw new ProjectModelClientError(
        503,
        "PROJECT_MODEL_READINESS_RESPONSE_INVALID",
        "The model readiness response crossed the requested Project boundary.",
      );
    }
    return structuredClone(readiness);
  }

  async run(parameters: {
    readonly readiness: PetraProjectModelReadinessView;
    readonly threadId: string;
    readonly runId: string;
    readonly prompt: string;
    readonly connectionId?: string;
    readonly abortController?: AbortController;
  }): Promise<PetraInteractionResult> {
    this.#contracts.assertValid(
      "project-model-readiness-view",
      "1.0.0",
      parameters.readiness,
    );
    if (parameters.readiness.readiness.state !== "ready") {
      throw new ProjectModelClientError(
        409,
        "PROJECT_MODEL_INTERACTION_UNAVAILABLE",
        "The selected Project model role is not ready.",
      );
    }
    const command = parameters.readiness.readiness.command;
    if (parameters.prompt !== command.registered_prompt) {
      throw new ProjectModelClientError(
        422,
        "PROJECT_MODEL_PROMPT_UNREGISTERED",
        "The certified role accepts only the prompt registered by readiness.",
      );
    }
    const client = new PetraInteractionClient({
      endpoint: new URL(command.endpoint, this.options.baseUrl).toString(),
      token: this.options.token,
      fetch: this.#fetch,
      ...(this.options.traceId === undefined
        ? {}
        : { traceId: this.options.traceId }),
    });
    return client.run({
      threadId: parameters.threadId,
      runId: parameters.runId,
      prompt: parameters.prompt,
      workflow: command.workflow,
      modelContext: command.request_context,
      ...(parameters.connectionId === undefined
        ? {}
        : { connectionId: parameters.connectionId }),
      ...(parameters.abortController === undefined
        ? {}
        : { abortController: parameters.abortController }),
    });
  }

  async #request(path: string): Promise<Response> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      headers: { authorization: `Bearer ${this.options.token}` },
    });
    if (response.ok) return response;
    let code = "PROJECT_MODEL_READINESS_REQUEST_FAILED";
    let message = `Project model readiness request failed (${response.status}).`;
    try {
      const body = (await response.json()) as {
        error?: { code?: unknown; message?: unknown };
      };
      if (typeof body.error?.code === "string") code = body.error.code;
      if (typeof body.error?.message === "string") message = body.error.message;
    } catch {
      // Stable HTTP status remains available if the body cannot be decoded.
    }
    throw new ProjectModelClientError(response.status, code, message);
  }
}
