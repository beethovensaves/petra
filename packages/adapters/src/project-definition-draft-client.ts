import type {
  PetraProjectDefinitionDraftCommandReceipt,
  PetraProjectDefinitionDraftCommandRequest,
  PetraProjectDefinitionDraftRequest,
  PetraProjectDefinitionDraftView,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";

export class ProjectDefinitionDraftClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProjectDefinitionDraftClientError";
    this.status = status;
    this.code = code;
  }
}

export interface ProjectDefinitionDraftClientOptions {
  readonly baseUrl: string;
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly contracts?: PetraContractRegistry;
}

export class ProjectDefinitionDraftClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectDefinitionDraftClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async draft(
    request: PetraProjectDefinitionDraftRequest,
  ): Promise<PetraProjectDefinitionDraftView> {
    this.#contracts.assertValid(
      "project-definition-draft-request",
      "1.0.0",
      request,
    );
    const body = await this.#post(
      "/api/queries/project-definition-drafts",
      request,
    );
    this.#contracts.assertValid("project-definition-draft-view", "1.0.0", body);
    const draft = body as PetraProjectDefinitionDraftView;
    if (
      draft.content.request.request_id !== request.request_id ||
      draft.content.request.outcome !== request.outcome
    ) {
      throw new ProjectDefinitionDraftClientError(
        503,
        "PROJECT_DEFINITION_DRAFT_RESPONSE_INVALID",
        "The Project definition draft crossed the exact request identity or outcome.",
      );
    }
    return structuredClone(draft);
  }

  async create(
    request: PetraProjectDefinitionDraftCommandRequest,
  ): Promise<PetraProjectDefinitionDraftCommandReceipt> {
    this.#contracts.assertValid(
      "project-definition-draft-command-request",
      request.schema_version,
      request,
    );
    const body = await this.#post(
      "/api/commands/projects/from-definition-draft",
      request,
    );
    this.#contracts.assertValid(
      "project-definition-draft-command-receipt",
      "1.0.0",
      body,
    );
    const receipt = body as PetraProjectDefinitionDraftCommandReceipt;
    if (
      receipt.command_id !== request.command_id ||
      receipt.idempotency_key !== request.idempotency_key ||
      receipt.draft_ref.draft_id !== request.draft.draft_id ||
      receipt.draft_ref.content_hash !== request.draft.content_hash ||
      receipt.destination.project_id !== receipt.project_ref.project_id
    ) {
      throw new ProjectDefinitionDraftClientError(
        503,
        "PROJECT_DEFINITION_DRAFT_RESPONSE_INVALID",
        "The Project creation receipt crossed the exact command, draft, or resulting Project.",
      );
    }
    return structuredClone(receipt);
  }

  async #post(path: string, request: unknown): Promise<unknown> {
    const response = await this.#fetch(new URL(path, this.options.baseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    if (!response.ok) {
      throw new ProjectDefinitionDraftClientError(
        response.status,
        body.error?.code ?? "PROJECT_DEFINITION_DRAFT_REQUEST_FAILED",
        body.error?.message ?? "The Project definition request failed.",
      );
    }
    return body;
  }
}
