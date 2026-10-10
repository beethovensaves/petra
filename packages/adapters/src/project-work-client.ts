import type {
  PetraProjectWorkReadView,
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkResumeRequest,
  PetraProjectWorkStartAgainReceipt,
  PetraProjectWorkStartAgainRequest,
  PetraWorkerOutputManifest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

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

export type ProjectWorkReceipt =
  | PetraProjectWorkOperationReceipt
  | PetraProjectWorkResumeReceipt
  | PetraProjectWorkStartAgainReceipt;

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORK_UNIT_ID = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;
const WORKER_OUTPUT_MANIFEST_ID =
  /^worker_output_manifest_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HASH = /^sha256:[0-9a-f]{64}$/u;
const CURSOR = /^offset:[0-9]{1,9}$/u;
const WORK_STATES = new Set([
  "requested",
  "queued",
  "running",
  "checkpointed",
  "completed",
  "cancelled",
]);

export interface ProjectWorkCollectionRequest {
  readonly limit?: number;
  readonly cursor?: string;
  readonly state?:
    | "requested"
    | "queued"
    | "running"
    | "checkpointed"
    | "completed"
    | "cancelled";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const canonicalHash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

export interface ProjectWorkerOutputManifestBinding {
  readonly producing_work_unit_id: string;
  readonly revision: number;
  readonly content_hash: string;
  readonly record_hash: string;
}

/** Renderer-neutral client for the server-owned Work operation assessment and command. */
export class ProjectWorkClient {
  readonly #fetch: typeof fetch;
  readonly #contracts: PetraContractRegistry;

  constructor(readonly options: ProjectWorkClientOptions) {
    this.#fetch = options.fetch ?? fetch;
    this.#contracts = options.contracts ?? new PetraContractRegistry();
  }

  async list(
    projectId: string,
    request: ProjectWorkCollectionRequest = {},
  ): Promise<PetraProjectWorkReadView> {
    this.#assertProject(projectId);
    if (
      (request.limit !== undefined &&
        (!Number.isSafeInteger(request.limit) ||
          request.limit < 1 ||
          request.limit > 100)) ||
      (request.cursor !== undefined && !CURSOR.test(request.cursor)) ||
      (request.state !== undefined && !WORK_STATES.has(request.state))
    ) {
      throw new TypeError(
        "A Work collection read requires a registered limit, cursor, and execution state.",
      );
    }
    const query = new URLSearchParams();
    if (request.limit !== undefined) query.set("limit", String(request.limit));
    if (request.cursor !== undefined) query.set("cursor", request.cursor);
    if (request.state !== undefined) query.set("state", request.state);
    const suffix = query.size === 0 ? "" : `?${query}`;
    const response = await this.#request(
      `/api/queries/projects/${projectId}/work${suffix}`,
      { method: "GET" },
    );
    const view = this.#workReadView(await response.json());
    if (
      view.project_id !== projectId ||
      view.content.view_kind !== "collection" ||
      view.content.query.limit !== (request.limit ?? 50) ||
      view.content.query.cursor !== request.cursor ||
      view.content.query.state !== request.state
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The Work collection response crossed the requested Project or exact query boundary.",
      );
    }
    return structuredClone(view);
  }

  async read(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkReadView> {
    this.#assertTarget(projectId, workUnitId);
    const response = await this.#request(
      `/api/queries/projects/${projectId}/work/${workUnitId}`,
      { method: "GET" },
    );
    const view = this.#workReadView(await response.json());
    if (
      view.project_id !== projectId ||
      view.content.view_kind !== "detail" ||
      view.content.summary.work_unit_ref.work_unit_id !== workUnitId
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The Work detail response crossed the requested Project or WorkUnit boundary.",
      );
    }
    return structuredClone(view);
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
    const resumeAvailable = view.controls.some(
      (control) =>
        control.operation === "resume" && control.state === "available",
    );
    const startAgainAvailable = view.controls.some(
      (control) =>
        control.operation === "start_again" && control.state === "available",
    );
    if (
      view.project_id !== projectId ||
      view.work_unit_ref.work_unit_id !== workUnitId ||
      resumeAvailable !== (view.resume_binding !== undefined) ||
      startAgainAvailable !== (view.start_again_binding !== undefined) ||
      (view.resume_binding !== undefined &&
        (view.resume_binding.project_id !== projectId ||
          canonicalize(view.resume_binding.expected_work_unit_ref) !==
            canonicalize(view.work_unit_ref))) ||
      (view.start_again_binding !== undefined &&
        (view.start_again_binding.project_id !== projectId ||
          canonicalize(
            view.start_again_binding.expected_prior_work_unit_ref,
          ) !== canonicalize(view.work_unit_ref) ||
          view.start_again_binding.fresh_work_unit_ref.work_unit_id ===
            workUnitId ||
          view.start_again_binding.input_transition.prior_input_manifest_ref
            .content_hash ===
            view.start_again_binding.input_transition.fresh_input_manifest_ref
              .content_hash))
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The Work operation assessment crossed the requested Project, WorkUnit, or exact checkpoint-resume boundary.",
      );
    }
    return structuredClone(view);
  }

  async readReceipts(
    projectId: string,
    workUnitId: string,
  ): Promise<readonly ProjectWorkReceipt[]> {
    this.#assertTarget(projectId, workUnitId);
    const response = await this.#request(
      `/api/queries/projects/${projectId}/work/${workUnitId}/receipts`,
      { method: "GET" },
    );
    const body: unknown = await response.json();
    if (!Array.isArray(body) || body.length > 20) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The retained Work receipt response is not a bounded list.",
      );
    }
    const receipts: ProjectWorkReceipt[] = [];
    const seen = new Set<string>();
    for (const candidate of body as unknown[]) {
      if (!isRecord(candidate)) {
        throw new ProjectWorkClientError(
          503,
          "PROJECT_WORK_RESPONSE_INVALID",
          "A retained Work receipt is not a record.",
        );
      }
      const schemaName =
        candidate.schema_name === "petra.project-work-operation-receipt"
          ? "project-work-operation-receipt"
          : candidate.schema_name === "petra.project-work-resume-receipt"
            ? "project-work-resume-receipt"
            : candidate.schema_name === "petra.project-work-start-again-receipt"
              ? "project-work-start-again-receipt"
              : undefined;
      if (schemaName === undefined) {
        throw new ProjectWorkClientError(
          503,
          "PROJECT_WORK_RESPONSE_INVALID",
          "A retained Work receipt has an unknown schema.",
        );
      }
      this.#contracts.assertValid(schemaName, "1.0.0", candidate);
      const receipt = candidate as unknown as ProjectWorkReceipt;
      const { record_hash: recordHash, ...base } = receipt;
      const requestedId =
        "requested_prior_work_unit_ref" in receipt
          ? receipt.requested_prior_work_unit_ref.work_unit_id
          : receipt.requested_work_unit_ref.work_unit_id;
      if (
        receipt.project_id !== projectId ||
        requestedId !== workUnitId ||
        seen.has(receipt.receipt_id) ||
        recordHash !== (await canonicalHash(base))
      ) {
        throw new ProjectWorkClientError(
          503,
          "PROJECT_WORK_RESPONSE_INVALID",
          "A retained Work receipt crossed its Project, task, identity, or record-hash boundary.",
        );
      }
      seen.add(receipt.receipt_id);
      receipts.push(structuredClone(receipt));
    }
    return receipts;
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

  async resume(
    projectId: string,
    workUnitId: string,
    request: PetraProjectWorkResumeRequest,
  ): Promise<PetraProjectWorkResumeReceipt> {
    this.#assertTarget(projectId, workUnitId);
    this.#contracts.assertValid(
      "project-work-resume-request",
      "1.0.0",
      request,
    );
    if (request.expected_work_unit_ref.work_unit_id !== workUnitId) {
      throw new TypeError(
        "The checkpoint resume request must bind the exact route WorkUnit.",
      );
    }
    const response = await this.#request(
      `/api/commands/projects/${projectId}/work/${workUnitId}/resume`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
    );
    const body: unknown = await response.json();
    this.#contracts.assertValid("project-work-resume-receipt", "1.0.0", body);
    const receipt = body as PetraProjectWorkResumeReceipt;
    if (
      receipt.project_id !== projectId ||
      receipt.requested_work_unit_ref.work_unit_id !== workUnitId ||
      receipt.resulting_work_unit_ref.work_unit_id !== workUnitId ||
      receipt.command_id !== request.command_id ||
      receipt.idempotency_key !== request.idempotency_key ||
      canonicalize(receipt.checkpoint) !==
        canonicalize(request.expected_checkpoint)
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The checkpoint resume receipt does not match the exact command, checkpoint, or retained Work identity.",
      );
    }
    return structuredClone(receipt);
  }

  async startAgain(
    projectId: string,
    priorWorkUnitId: string,
    request: PetraProjectWorkStartAgainRequest,
  ): Promise<PetraProjectWorkStartAgainReceipt> {
    this.#assertTarget(projectId, priorWorkUnitId);
    this.#contracts.assertValid(
      "project-work-start-again-request",
      "1.0.0",
      request,
    );
    if (request.expected_prior_work_unit_ref.work_unit_id !== priorWorkUnitId) {
      throw new TypeError(
        "The Start again request must bind the exact route prior WorkUnit.",
      );
    }
    const response = await this.#request(
      `/api/commands/projects/${projectId}/work/${priorWorkUnitId}/start-again`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      },
    );
    const body: unknown = await response.json();
    this.#contracts.assertValid(
      "project-work-start-again-receipt",
      "1.0.0",
      body,
    );
    const receipt = body as PetraProjectWorkStartAgainReceipt;
    if (
      receipt.project_id !== projectId ||
      receipt.requested_prior_work_unit_ref.work_unit_id !== priorWorkUnitId ||
      receipt.prior_attempt.work_unit_ref.work_unit_id !== priorWorkUnitId ||
      receipt.new_attempt.work_unit_ref.work_unit_id === priorWorkUnitId ||
      receipt.destination.work_unit_ref.work_unit_id !==
        receipt.new_attempt.work_unit_ref.work_unit_id ||
      receipt.command_id !== request.command_id ||
      receipt.idempotency_key !== request.idempotency_key ||
      canonicalize(receipt.start_again_registration) !==
        canonicalize(request.start_again_registration_ref) ||
      receipt.fresh_input.prior_input_manifest_ref.content_hash ===
        receipt.fresh_input.fresh_input_manifest_ref.content_hash ||
      receipt.new_attempt.lineage_attempt !==
        receipt.prior_attempt.lineage_attempt + 1 ||
      receipt.new_attempt.work_attempt !== 1
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The Start again receipt crossed its exact command, fresh-input, prior-attempt, or linked fresh Work boundary.",
      );
    }
    return structuredClone(receipt);
  }

  async readWorkerOutputManifest(
    projectId: string,
    workerOutputManifestId: string,
    binding: ProjectWorkerOutputManifestBinding,
  ): Promise<PetraWorkerOutputManifest> {
    if (
      !PROJECT_ID.test(projectId) ||
      !WORKER_OUTPUT_MANIFEST_ID.test(workerOutputManifestId) ||
      !WORK_UNIT_ID.test(binding.producing_work_unit_id) ||
      !Number.isSafeInteger(binding.revision) ||
      binding.revision < 1 ||
      !HASH.test(binding.content_hash) ||
      !HASH.test(binding.record_hash)
    ) {
      throw new TypeError(
        "An exact WorkerOutputManifest read requires canonical result and producing-Work identities.",
      );
    }
    const query = new URLSearchParams({
      revision: String(binding.revision),
      content_hash: binding.content_hash,
      record_hash: binding.record_hash,
    });
    const response = await this.#request(
      `/api/queries/projects/${projectId}/worker-output-manifests/${workerOutputManifestId}?${query}`,
      { method: "GET" },
    );
    const body: unknown = await response.json();
    this.#contracts.assertValid("worker-output-manifest", "1.0.0", body);
    const manifest = body as PetraWorkerOutputManifest;
    if (
      manifest.project_id !== projectId ||
      manifest.worker_output_manifest_id !== workerOutputManifestId ||
      manifest.work_unit_id !== binding.producing_work_unit_id ||
      manifest.revision !== binding.revision ||
      manifest.content_hash !== binding.content_hash ||
      (await canonicalHash(manifest.content)) !== binding.content_hash ||
      (await canonicalHash(manifest)) !== binding.record_hash
    ) {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The WorkerOutputManifest response crossed its exact Project, result, or producing-Work identity.",
      );
    }
    return structuredClone(manifest);
  }

  #assertTarget(projectId: string, workUnitId: string): void {
    this.#assertProject(projectId);
    if (!WORK_UNIT_ID.test(workUnitId)) {
      throw new TypeError(
        "A Work operation requires canonical Project and WorkUnit identities.",
      );
    }
  }

  #assertProject(projectId: string): void {
    if (!PROJECT_ID.test(projectId)) {
      throw new TypeError("A Work read requires a canonical Project identity.");
    }
  }

  #workReadView(body: unknown): PetraProjectWorkReadView {
    const version = isRecord(body) ? body.schema_version : undefined;
    if (version !== "1.0.0" && version !== "1.1.0") {
      throw new ProjectWorkClientError(
        503,
        "PROJECT_WORK_RESPONSE_INVALID",
        "The Work response did not use a registered contract version.",
      );
    }
    this.#contracts.assertValid("project-work-view", version, body);
    return body as PetraProjectWorkReadView;
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
