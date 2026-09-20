import type {
  PetraProjectObjective,
  PetraProjectObjectiveCommandReceipt,
  PetraProjectObjectiveCommandRecoveryView,
  PetraProjectObjectiveCommandRequest,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import { PetraContractRegistry } from "./browser-contract-registry.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const contracts = new PetraContractRegistry();

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const canonicalHash = async (value: unknown): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
};

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

const apiToken = (): string =>
  typeof window === "undefined"
    ? DEVELOPMENT_TOKEN
    : (window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN);

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
};

export interface ProjectObjectiveCommandContext {
  readonly projectId: string;
  readonly projectName: string;
  readonly definitionLabel: string;
  readonly projectRef: PetraProjectObjectiveCommandRequest["expected"]["project_ref"];
  readonly projectDefinitionRef: PetraProjectObjectiveCommandRequest["expected"]["project_definition_ref"];
  readonly focus:
    | {
        readonly state: "none";
        readonly objectiveKind: string;
        readonly term: string;
      }
    | {
        readonly state: "focused";
        readonly objective: PetraProjectObjective;
        readonly objectiveRecordHash: string;
        readonly term: string;
      };
}

export interface ProjectObjectiveCommandIdentity {
  readonly commandId: string;
  readonly idempotencyKey: string;
}

export const createProjectObjectiveCommandIdentity = (
  operation: "frame" | "revise",
): ProjectObjectiveCommandIdentity => {
  const identity = randomUlidPayload();
  return {
    commandId: `command_${identity}`,
    idempotencyKey: `brief.${operation}-objective:${identity}`,
  };
};

export const createProjectObjectiveCommandRequest = (input: {
  readonly context: ProjectObjectiveCommandContext;
  readonly roughStatement: string;
  readonly proposedStatement: string;
  readonly identity?: ProjectObjectiveCommandIdentity;
  readonly reviewedAt?: string;
}): PetraProjectObjectiveCommandRequest => {
  const operation = input.context.focus.state === "none" ? "frame" : "revise";
  const focus = input.context.focus;
  const identity =
    input.identity ?? createProjectObjectiveCommandIdentity(operation);
  const prior = focus.state === "focused" ? focus.objective : undefined;
  if (prior !== undefined && input.roughStatement !== prior.content.statement) {
    throw new Error(
      "Revising an Objective must preserve its exact current wording as the reviewed rough statement.",
    );
  }
  const request: PetraProjectObjectiveCommandRequest = {
    schema_name: "petra.project-objective-command-request",
    schema_version: "1.0.0",
    command_id: identity.commandId,
    idempotency_key: identity.idempotencyKey,
    operation,
    expected: {
      project_ref: structuredClone(input.context.projectRef),
      project_definition_ref: structuredClone(
        input.context.projectDefinitionRef,
      ),
      focus:
        input.context.focus.state === "none"
          ? { state: "none" }
          : {
              state: "focused",
              objective_ref: {
                objective_id: prior!.objective_id,
                revision: prior!.revision,
                content_hash: prior!.content_hash,
                record_hash: input.context.focus.objectiveRecordHash,
              },
            },
    },
    review: {
      decision: "apply",
      rough_statement: input.roughStatement,
      proposed_content:
        prior === undefined
          ? {
              objective_kind:
                focus.state === "none"
                  ? focus.objectiveKind
                  : prior!.content.objective_kind,
              statement: input.proposedStatement,
              status: "active",
              dependency_refs: [],
            }
          : {
              ...structuredClone(prior.content),
              statement: input.proposedStatement,
              status: "active",
            },
      reviewed_at: input.reviewedAt ?? new Date().toISOString(),
    },
  };
  contracts.assertValid("project-objective-command-request", "1.0.0", request);
  return request;
};

export class ProjectObjectiveCommandClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ProjectObjectiveCommandClientError";
  }
}

export type ProjectObjectiveCommandFailureKind =
  "conflict" | "stale" | "permission_lost" | "invalid" | "outcome_unknown";

export const projectObjectiveCommandFailureKind = (
  error: unknown,
): ProjectObjectiveCommandFailureKind => {
  if (!(error instanceof ProjectObjectiveCommandClientError)) {
    return "outcome_unknown";
  }
  if (error.status === 403) return "permission_lost";
  if (
    error.code?.includes("_STALE") === true ||
    /stale|no longer matches|changed after/iu.test(error.message)
  ) {
    return "stale";
  }
  if (
    error.code?.includes("_CONFLICT") === true ||
    /conflict|already bound/iu.test(error.message)
  ) {
    return "conflict";
  }
  if (error.status >= 400 && error.status < 500) return "invalid";
  return "outcome_unknown";
};

const requestJson = async (
  path: string,
  request: PetraProjectObjectiveCommandRequest,
  fetcher: typeof fetch,
): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetcher(new URL(path, apiBaseUrl()), {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
    });
  } catch (error) {
    throw new ProjectObjectiveCommandClientError(
      error instanceof Error
        ? error.message
        : "The reviewed Objective outcome is unknown.",
      0,
    );
  }
  if (!response.ok) {
    let message = `Petra could not apply this reviewed Objective (${response.status}).`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as unknown;
      if (isRecord(body) && isRecord(body.error)) {
        if (typeof body.error.message === "string")
          message = body.error.message;
        if (typeof body.error.code === "string") code = body.error.code;
      }
    } catch {
      // The HTTP status remains authoritative without a structured error body.
    }
    throw new ProjectObjectiveCommandClientError(
      message,
      response.status,
      code,
    );
  }
  return response.json() as Promise<unknown>;
};

const assertReceiptBinding = async (
  projectId: string,
  request: PetraProjectObjectiveCommandRequest,
  receipt: PetraProjectObjectiveCommandReceipt,
): Promise<void> => {
  contracts.assertValid("project-objective-command-receipt", "1.0.0", receipt);
  const receiptBase = Object.fromEntries(
    Object.entries(receipt).filter(([key]) => key !== "record_hash"),
  );
  if (
    receipt.project_id !== projectId ||
    receipt.command_id !== request.command_id ||
    receipt.idempotency_key !== request.idempotency_key ||
    receipt.request_hash !== (await canonicalHash(request)) ||
    receipt.operation !== request.operation ||
    !same(
      receipt.project_definition_ref,
      request.expected.project_definition_ref,
    ) ||
    !same(receipt.prior_focus, request.expected.focus) ||
    receipt.review.decision !== "applied" ||
    receipt.review.rough_statement !== request.review.rough_statement ||
    receipt.review.proposed_statement !==
      request.review.proposed_content.statement ||
    receipt.review.reviewed_at !== request.review.reviewed_at ||
    receipt.destination.project_id !== projectId ||
    !same(receipt.destination.objective_ref, receipt.objective_ref) ||
    receipt.record_hash !== (await canonicalHash(receiptBase))
  ) {
    throw new ProjectObjectiveCommandClientError(
      "Petra returned an Objective receipt for a different reviewed request or Brief destination.",
      502,
      "PROJECT_OBJECTIVE_COMMAND_RESPONSE_MISMATCH",
    );
  }
};

export interface ProjectObjectiveCommandResult {
  readonly receipt: PetraProjectObjectiveCommandReceipt;
  readonly objective: PetraProjectObjective;
  readonly applied: boolean;
}

const commandResult = async (
  projectId: string,
  request: PetraProjectObjectiveCommandRequest,
  value: unknown,
): Promise<ProjectObjectiveCommandResult> => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["receipt", "objective", "applied"]) ||
    typeof value.applied !== "boolean"
  ) {
    throw new ProjectObjectiveCommandClientError(
      "Petra returned an invalid reviewed Objective result.",
      502,
      "PROJECT_OBJECTIVE_COMMAND_RESPONSE_INVALID",
    );
  }
  contracts.assertValid("project-objective", "1.0.0", value.objective);
  const receipt = value.receipt as PetraProjectObjectiveCommandReceipt;
  const objective = value.objective as PetraProjectObjective;
  await assertReceiptBinding(projectId, request, receipt);
  if (
    objective.project_id !== projectId ||
    objective.objective_id !== receipt.objective_ref.objective_id ||
    objective.revision !== receipt.objective_ref.revision ||
    objective.content_hash !== receipt.objective_ref.content_hash ||
    !same(objective.content, request.review.proposed_content) ||
    (await canonicalHash(objective.content)) !== objective.content_hash ||
    (await canonicalHash(objective)) !== receipt.objective_ref.record_hash
  ) {
    throw new ProjectObjectiveCommandClientError(
      "Petra returned a different Objective than the exact reviewed proposal.",
      502,
      "PROJECT_OBJECTIVE_COMMAND_RESPONSE_MISMATCH",
    );
  }
  return { receipt, objective, applied: value.applied };
};

export const executeProjectObjectiveCommand = async (
  projectId: string,
  request: PetraProjectObjectiveCommandRequest,
  fetcher: typeof fetch = fetch,
): Promise<ProjectObjectiveCommandResult> => {
  contracts.assertValid("project-objective-command-request", "1.0.0", request);
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(projectId)}/objective`,
    request,
    fetcher,
  );
  return commandResult(projectId, request, value);
};

export const assessProjectObjectiveCommandRecovery = async (
  projectId: string,
  request: PetraProjectObjectiveCommandRequest,
  fetcher: typeof fetch = fetch,
): Promise<PetraProjectObjectiveCommandRecoveryView> => {
  contracts.assertValid("project-objective-command-request", "1.0.0", request);
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/objective-command-recovery`,
    request,
    fetcher,
  );
  contracts.assertValid(
    "project-objective-command-recovery-view",
    "1.0.0",
    value,
  );
  const recovery = value as PetraProjectObjectiveCommandRecoveryView;
  const recoveryContent = {
    project_id: recovery.project_id,
    subject: recovery.subject,
    effect: recovery.effect,
    return: recovery.return,
    observed_at: recovery.observed_at,
  };
  if (
    recovery.project_id !== projectId ||
    recovery.subject.command_id !== request.command_id ||
    recovery.subject.idempotency_key !== request.idempotency_key ||
    recovery.subject.request_hash !== (await canonicalHash(request)) ||
    recovery.return.destination.project_id !== projectId ||
    recovery.content_hash !== (await canonicalHash(recoveryContent))
  ) {
    throw new ProjectObjectiveCommandClientError(
      "Petra returned recovery for a different reviewed Objective request.",
      502,
      "PROJECT_OBJECTIVE_COMMAND_RECOVERY_MISMATCH",
    );
  }
  if (recovery.effect.state === "effect_confirmed") {
    await assertReceiptBinding(projectId, request, recovery.effect.receipt);
    if (
      recovery.return.state !== "exact" ||
      !same(recovery.return.destination, recovery.effect.receipt.destination)
    ) {
      throw new ProjectObjectiveCommandClientError(
        "Petra confirmed an Objective effect without its exact Brief return.",
        502,
        "PROJECT_OBJECTIVE_COMMAND_RECOVERY_MISMATCH",
      );
    }
  } else if (recovery.return.state !== "safe_fallback") {
    throw new ProjectObjectiveCommandClientError(
      "Petra returned an unconfirmed Objective effect with an exact destination.",
      502,
      "PROJECT_OBJECTIVE_COMMAND_RECOVERY_MISMATCH",
    );
  }
  return recovery;
};

export const projectObjectiveCanonicalHash = canonicalHash;
