import type {
  PetraProjectImportCommandReceipt,
  PetraProjectImportCommandRecoveryView,
  PetraProjectImportCommandRequest,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type { ProjectRecord } from "./model.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const contracts = new PetraContractRegistry();

export type ProjectImportSourceBinding = NonNullable<
  ProjectRecord["importBinding"]
>;

export interface ProjectImportCommandInput {
  readonly source: ProjectImportSourceBinding;
  readonly project: {
    readonly name: string;
    readonly description?: string;
  };
  readonly reviewedAt: string;
  readonly commandId?: string;
  readonly idempotencyKey?: string;
}

export interface ProjectImportCommandIdentity {
  readonly commandId: string;
  readonly idempotencyKey: string;
}

export class ProjectImportClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ProjectImportClientError";
    this.status = status;
    this.code = code;
  }
}

const apiToken = (): string => {
  if (typeof window === "undefined") return DEVELOPMENT_TOKEN;
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN;
};

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

const randomUlidPayload = (): string => {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  let timestamp = BigInt(Date.now());
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 255n);
    timestamp >>= 8n;
  }
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = CROCKFORD_BASE32[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return payload;
};

export const createProjectImportCommandIdentity =
  (): ProjectImportCommandIdentity => {
    const identity = randomUlidPayload();
    return {
      commandId: `command_${identity}`,
      idempotencyKey: `project-import:${identity}`,
    };
  };

export const createProjectImportCommandRequest = (
  input: ProjectImportCommandInput,
): PetraProjectImportCommandRequest => {
  const identity = createProjectImportCommandIdentity();
  return {
    schema_name: "petra.project-import-command-request",
    schema_version: "1.0.0",
    command_id: input.commandId ?? identity.commandId,
    idempotency_key: input.idempotencyKey ?? identity.idempotencyKey,
    source: {
      source_kind: input.source.sourceKind,
      project_id: input.source.projectId,
      project_revision: input.source.projectRevision,
      project_definition_ref: {
        project_definition_id:
          input.source.projectDefinitionRef.projectDefinitionId,
        revision: input.source.projectDefinitionRef.revision,
        content_hash: input.source.projectDefinitionRef.contentHash,
      },
      focused_objective_ref: {
        objective_id: input.source.focusedObjectiveRef.objectiveId,
        revision: input.source.focusedObjectiveRef.revision,
        content_hash: input.source.focusedObjectiveRef.contentHash,
      },
    },
    admission: {
      decision: "create_derived_project",
      copy_scope: "definition_and_focused_objective",
      source_effect: "preserve_without_modification",
      reviewed_at: input.reviewedAt,
    },
    project: {
      name: input.project.name,
      ...(input.project.description === undefined ||
      input.project.description.length === 0
        ? {}
        : { description: input.project.description }),
    },
  };
};

export const hashProjectImportValue = async (
  value: unknown,
): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

export const deriveProjectImportIdentity = async (
  kind: string,
  immutableIdentity: string,
): Promise<string> => {
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${kind}:${immutableIdentity}`),
    ),
  ).slice(0, 16);
  let value = BigInt(
    `0x${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
  );
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = CROCKFORD_BASE32[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return `${kind}_${payload}`;
};

const requestJson = async (
  path: string,
  init: RequestInit,
): Promise<unknown> => {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${apiToken()}`);
  const response = await fetch(new URL(path, apiBaseUrl()), {
    ...init,
    headers,
  });
  if (response.ok) return response.json() as Promise<unknown>;
  let code = "PROJECT_IMPORT_REQUEST_FAILED";
  let message = `Project import request failed (${response.status}).`;
  try {
    const body = (await response.json()) as {
      error?: { code?: unknown; message?: unknown };
    };
    if (typeof body.error?.code === "string") code = body.error.code;
    if (typeof body.error?.message === "string") message = body.error.message;
  } catch {
    // The response status remains available when no stable JSON body exists.
  }
  throw new ProjectImportClientError(response.status, code, message);
};

const receiptMatchesRequest = (
  receipt: PetraProjectImportCommandReceipt,
  request: PetraProjectImportCommandRequest,
): boolean =>
  receipt.command_id === request.command_id &&
  receipt.idempotency_key === request.idempotency_key &&
  receipt.source.project_ref.project_id === request.source.project_id &&
  receipt.source.project_ref.revision === request.source.project_revision &&
  receipt.source.project_definition_ref.project_definition_id ===
    request.source.project_definition_ref.project_definition_id &&
  receipt.source.project_definition_ref.revision ===
    request.source.project_definition_ref.revision &&
  receipt.source.project_definition_ref.content_hash ===
    request.source.project_definition_ref.content_hash &&
  receipt.source.focused_objective_ref.objective_id ===
    request.source.focused_objective_ref.objective_id &&
  receipt.source.focused_objective_ref.revision ===
    request.source.focused_objective_ref.revision &&
  receipt.source.focused_objective_ref.content_hash ===
    request.source.focused_objective_ref.content_hash &&
  receipt.admission.decision === request.admission.decision &&
  receipt.admission.copy_scope === request.admission.copy_scope &&
  receipt.admission.source_effect === request.admission.source_effect &&
  receipt.admission.reviewed_at === request.admission.reviewed_at &&
  receipt.result.project_definition_ref.content_hash ===
    request.source.project_definition_ref.content_hash &&
  receipt.result.focused_objective_ref.content_hash ===
    request.source.focused_objective_ref.content_hash &&
  receipt.destination.project_id === receipt.result.project_ref.project_id;

const validateReceipt = (
  value: unknown,
  request: PetraProjectImportCommandRequest,
): PetraProjectImportCommandReceipt => {
  contracts.assertValid("project-import-command-receipt", "1.0.0", value);
  const receipt = value as PetraProjectImportCommandReceipt;
  if (!receiptMatchesRequest(receipt, request)) {
    throw new ProjectImportClientError(
      503,
      "PROJECT_IMPORT_RESPONSE_INVALID",
      "The Project import result does not match the exact reviewed source and command.",
    );
  }
  return structuredClone(receipt);
};

export const executeProjectImportRequest = async (
  request: PetraProjectImportCommandRequest,
): Promise<PetraProjectImportCommandReceipt> => {
  contracts.assertValid("project-import-command-request", "1.0.0", request);
  const commandValue = await requestJson("/api/commands/projects/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const receipt = validateReceipt(commandValue, request);
  const ancestryValue = await requestJson(
    `/api/queries/projects/${encodeURIComponent(receipt.destination.project_id)}/import-ancestry`,
    { method: "GET" },
  );
  const ancestry = validateReceipt(ancestryValue, request);
  if (canonicalize(ancestry) !== canonicalize(receipt)) {
    throw new ProjectImportClientError(
      503,
      "PROJECT_IMPORT_ANCESTRY_INVALID",
      "The derived Project ancestry does not match the exact import result.",
    );
  }
  return ancestry;
};

export const assessProjectImportRecovery = async (
  request: PetraProjectImportCommandRequest,
): Promise<PetraProjectImportCommandRecoveryView> => {
  contracts.assertValid("project-import-command-request", "1.0.0", request);
  const value = await requestJson(
    "/api/queries/project-import-command-recovery",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  contracts.assertValid("project-import-command-recovery-view", "1.0.0", value);
  const view = value as PetraProjectImportCommandRecoveryView;
  const requestHash = await hashProjectImportValue(request);
  const contentHash = await hashProjectImportValue(view.content);
  const assessmentId = await deriveProjectImportIdentity(
    "project_import_recovery",
    contentHash,
  );
  const exactRequest = view.content.preservation.find(
    (item) => item.item === "exact_request",
  );
  if (
    view.content.subject.command_id !== request.command_id ||
    view.content.subject.idempotency_key !== request.idempotency_key ||
    view.content.subject.request_hash !== requestHash ||
    view.content.subject.source_project_id !== request.source.project_id ||
    view.content_hash !== contentHash ||
    view.assessment_id !== assessmentId ||
    view.read_at !== view.content.observation_cutoff ||
    exactRequest?.identity !== requestHash ||
    exactRequest.durability !== "client_session" ||
    exactRequest.state !== "client_copy_required"
  ) {
    throw new ProjectImportClientError(
      503,
      "PROJECT_IMPORT_RECOVERY_INVALID",
      "The Project import recovery result does not bind the exact retained request.",
    );
  }

  const effect = view.content.effect;
  const action = view.content.eligible_actions[0];
  if (effect.state === "effect_confirmed") {
    if (
      !receiptMatchesRequest(effect.receipt, request) ||
      view.content.eligible_actions.length !== 1 ||
      action?.operation !== "open_derived_project" ||
      action.owner !== "browser_navigation" ||
      action.method !== "GET" ||
      action.path !==
        `/projects/${effect.receipt.destination.project_id}/brief` ||
      action.input_behavior !== "none" ||
      action.identity_behavior !== "navigate_to_receipt_project" ||
      view.content.return.state !== "exact" ||
      view.content.return.destination.place_role !== "brief" ||
      view.content.return.destination.project_id !==
        effect.receipt.destination.project_id
    ) {
      throw new ProjectImportClientError(
        503,
        "PROJECT_IMPORT_RECOVERY_INVALID",
        "The confirmed import recovery result crossed its retained ancestry or destination.",
      );
    }
  } else if (effect.state === "outcome_unknown") {
    const expectedProjectId = await deriveProjectImportIdentity(
      "project",
      request.command_id,
    );
    if (
      view.content.eligible_actions.length !== 1 ||
      action?.operation !== "retry_exact_command" ||
      action.owner !== "project_import_command" ||
      action.method !== "POST" ||
      action.path !== "/api/commands/projects/import" ||
      action.input_behavior !== "reuse_exact_request" ||
      action.identity_behavior !== "reuse_command_and_idempotency" ||
      action.success_destination.place_role !== "brief" ||
      action.success_destination.project_id !== expectedProjectId ||
      view.content.return.state !== "safe_fallback" ||
      view.content.return.destination.place_role !== "projects"
    ) {
      throw new ProjectImportClientError(
        503,
        "PROJECT_IMPORT_RECOVERY_INVALID",
        "The unknown import outcome is missing its exact idempotent recovery boundary.",
      );
    }
  } else if (
    view.content.eligible_actions.length !== 0 ||
    view.content.return.state !== "safe_fallback" ||
    view.content.return.destination.place_role !== "projects"
  ) {
    throw new ProjectImportClientError(
      503,
      "PROJECT_IMPORT_RECOVERY_INVALID",
      "A conflicting import identity cannot expose a retry or derived Project.",
    );
  }
  return structuredClone(view);
};
