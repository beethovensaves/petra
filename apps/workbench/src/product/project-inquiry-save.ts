import type {
  PetraFocusedGraphView,
  PetraFocusedGraphViewV11,
  PetraProjectInquirySaveReceipt,
  PetraProjectInquirySaveRecoveryView,
  PetraProjectInquirySaveRequest,
  PetraProjectObjective,
  ProjectInquirySaveSelection,
} from "@petra/contracts";
import type { FocusedGraphReadRequest } from "@petra/core";
import { canonicalize } from "json-canonicalize";

import { PetraContractRegistry } from "./browser-contract-registry.js";

type FocusedGraphReadView = PetraFocusedGraphView | PetraFocusedGraphViewV11;

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

export class ProjectInquirySaveClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ProjectInquirySaveClientError";
  }
}

export type ProjectInquirySaveFailureKind =
  "conflict" | "stale" | "permission_lost" | "invalid" | "outcome_unknown";

export const projectInquirySaveFailureKind = (
  error: unknown,
): ProjectInquirySaveFailureKind => {
  if (!(error instanceof ProjectInquirySaveClientError)) {
    return "outcome_unknown";
  }
  if (error.status === 403) return "permission_lost";
  if (
    error.code?.includes("_STALE") === true ||
    /stale|no longer matches|changed since/iu.test(error.message)
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

export interface ProjectInquirySaveIdentity {
  readonly commandId: string;
  readonly idempotencyKey: string;
}

export const createProjectInquirySaveIdentity =
  (): ProjectInquirySaveIdentity => {
    const identity = randomUlidPayload();
    return {
      commandId: `command_${identity}`,
      idempotencyKey: `graph.save-question:${identity}`,
    };
  };

const selectionForKey = (
  view: FocusedGraphReadView,
  selectedKey: string,
): ProjectInquirySaveSelection => {
  const selectionKind = view.content.nodes.some(
    (node) => node.node_key === selectedKey,
  )
    ? "node"
    : view.content.relationships.some(
          (relationship) => relationship.relationship_key === selectedKey,
        )
      ? "relationship"
      : view.content.paths.some((path) => path.path_key === selectedKey)
        ? "path"
        : undefined;
  if (selectionKind === undefined) {
    throw new ProjectInquirySaveClientError(
      "The selected Graph member is not part of this exact bounded result.",
      400,
      "PROJECT_INQUIRY_SAVE_SELECTION_INVALID",
    );
  }
  return {
    state: "selected",
    selection_kind: selectionKind,
    selected_keys: [selectedKey],
  };
};

const exactReturnDestination = (
  request: FocusedGraphReadRequest,
  view: FocusedGraphReadView,
): boolean =>
  view.content.destinations.some(
    (destination) =>
      destination.destination_key ===
        view.content.task.return_destination_key &&
      same(destination, request.return_destination),
  );

export const createProjectInquirySaveRequest = (input: {
  readonly projectId: string;
  readonly graphRequest: FocusedGraphReadRequest;
  readonly graph: FocusedGraphReadView;
  readonly selectedKey: string;
  readonly identity?: ProjectInquirySaveIdentity;
  readonly submittedAt?: string;
}): PetraProjectInquirySaveRequest => {
  const { projectId, graphRequest, graph, selectedKey } = input;
  if (
    graph.project_id !== projectId ||
    graph.content.semantic_layer === "historical" ||
    graphRequest.semantic_layer === "historical" ||
    graph.content.task.request_id !== graphRequest.request_id ||
    graph.content.task.question !== graphRequest.question ||
    graph.content.task.task_semantic_key !== graphRequest.task_semantic_key ||
    !same(graph.content.task.focus_refs, [graphRequest.focus_ref]) ||
    !same(graph.content.task.origin, graphRequest.origin) ||
    !same(
      graph.content.profile.project_definition_ref,
      graphRequest.project_definition_ref,
    ) ||
    graph.content.semantic_layer !== graphRequest.semantic_layer ||
    !same(graph.content.temporal_position, graphRequest.temporal_position) ||
    graph.content.task.return_destination_key !==
      graphRequest.return_destination.destination_key ||
    !exactReturnDestination(graphRequest, graph) ||
    (graphRequest.expected_snapshot !== undefined &&
      !same(graph.content.requested_snapshot, graphRequest.expected_snapshot))
  ) {
    throw new ProjectInquirySaveClientError(
      "The displayed Graph result no longer matches its exact request, snapshot, origin, or return destination.",
      409,
      "PROJECT_INQUIRY_SAVE_GRAPH_STALE",
    );
  }
  const identity = input.identity ?? createProjectInquirySaveIdentity();
  const request: PetraProjectInquirySaveRequest = {
    schema_name: "petra.project-inquiry-save-request",
    schema_version: "1.0.0",
    command_id: identity.commandId,
    idempotency_key: identity.idempotencyKey,
    graph_request: structuredClone(graphRequest),
    expected_graph: {
      schema_name: "petra.focused-graph-view",
      schema_version: graph.schema_version,
      content_hash: graph.content_hash,
    },
    selection: selectionForKey(graph, selectedKey),
    submitted_at: input.submittedAt ?? new Date().toISOString(),
  };
  contracts.assertValid("project-inquiry-save-request", "1.0.0", request);
  return request;
};

export interface ProjectInquirySaveResult {
  readonly receipt: PetraProjectInquirySaveReceipt;
  readonly inquiry: PetraProjectObjective;
  readonly applied: boolean;
}

export type ProjectInquirySaveCommand = (
  projectId: string,
  request: PetraProjectInquirySaveRequest,
) => Promise<ProjectInquirySaveResult>;

export type ProjectInquirySaveRecoveryRead = (
  projectId: string,
  request: PetraProjectInquirySaveRequest,
) => Promise<PetraProjectInquirySaveRecoveryView>;

const requestJson = async (
  path: string,
  request: PetraProjectInquirySaveRequest,
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
    throw new ProjectInquirySaveClientError(
      error instanceof Error
        ? error.message
        : "The Project question save outcome is unknown.",
      0,
    );
  }
  if (!response.ok) {
    let message = `Petra could not save this Project question (${response.status}).`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as unknown;
      if (isRecord(body) && isRecord(body.error)) {
        if (typeof body.error.message === "string")
          message = body.error.message;
        if (typeof body.error.code === "string") code = body.error.code;
      }
    } catch {
      // HTTP status remains authoritative when no structured error is available.
    }
    throw new ProjectInquirySaveClientError(message, response.status, code);
  }
  return response.json() as Promise<unknown>;
};

const assertReceiptBinding = async (
  projectId: string,
  request: PetraProjectInquirySaveRequest,
  receipt: PetraProjectInquirySaveReceipt,
): Promise<void> => {
  contracts.assertValid("project-inquiry-save-receipt", "1.0.0", receipt);
  const [requestHash, graphRequestHash] = await Promise.all([
    canonicalHash(request),
    canonicalHash(request.graph_request),
  ]);
  if (
    receipt.project_id !== projectId ||
    receipt.command_id !== request.command_id ||
    receipt.idempotency_key !== request.idempotency_key ||
    receipt.request_hash !== requestHash ||
    receipt.graph_binding.graph_request_hash !== graphRequestHash ||
    receipt.graph_binding.task_request_id !==
      request.graph_request.request_id ||
    !same(receipt.graph_binding.focused_graph_ref, request.expected_graph) ||
    !same(receipt.graph_binding.focus_refs, [
      request.graph_request.focus_ref,
    ]) ||
    !same(
      receipt.graph_binding.project_definition_ref,
      request.graph_request.project_definition_ref,
    ) ||
    receipt.graph_binding.semantic_layer !==
      request.graph_request.semantic_layer ||
    (request.graph_request.expected_snapshot !== undefined &&
      !same(
        receipt.graph_binding.snapshot_ref,
        request.graph_request.expected_snapshot,
      )) ||
    !same(receipt.graph_binding.selection, request.selection) ||
    !same(receipt.graph_binding.origin, request.graph_request.origin) ||
    !same(
      receipt.graph_binding.return_destination,
      request.graph_request.return_destination,
    )
  ) {
    throw new ProjectInquirySaveClientError(
      "Petra returned a ProjectInquiry receipt for a different request, graph, selection, origin, or return destination.",
      502,
      "PROJECT_INQUIRY_SAVE_RESPONSE_MISMATCH",
    );
  }
};

const projectInquirySaveResult = async (
  projectId: string,
  request: PetraProjectInquirySaveRequest,
  value: unknown,
): Promise<ProjectInquirySaveResult> => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["receipt", "inquiry", "applied"]) ||
    typeof value.applied !== "boolean"
  ) {
    throw new ProjectInquirySaveClientError(
      "Petra returned an invalid ProjectInquiry save result.",
      502,
      "PROJECT_INQUIRY_SAVE_RESPONSE_INVALID",
    );
  }
  contracts.assertValid("project-objective", "1.0.0", value.inquiry);
  await assertReceiptBinding(
    projectId,
    request,
    value.receipt as PetraProjectInquirySaveReceipt,
  );
  const inquiry = value.inquiry as PetraProjectObjective;
  const receipt = value.receipt as PetraProjectInquirySaveReceipt;
  if (
    inquiry.project_id !== projectId ||
    inquiry.objective_id !== receipt.objective_ref.objective_id ||
    inquiry.revision !== receipt.objective_ref.revision ||
    inquiry.content_hash !== receipt.objective_ref.content_hash ||
    inquiry.content.statement !== request.graph_request.question ||
    (await canonicalHash(inquiry)) !== receipt.objective_ref.record_hash
  ) {
    throw new ProjectInquirySaveClientError(
      "Petra returned a different retained ProjectInquiry than the exact Graph question.",
      502,
      "PROJECT_INQUIRY_SAVE_RESPONSE_MISMATCH",
    );
  }
  return { receipt, inquiry, applied: value.applied };
};

export const executeProjectInquirySave = async (
  projectId: string,
  request: PetraProjectInquirySaveRequest,
  fetcher: typeof fetch = fetch,
): Promise<ProjectInquirySaveResult> => {
  contracts.assertValid("project-inquiry-save-request", "1.0.0", request);
  const value = await requestJson(
    `/api/commands/projects/${encodeURIComponent(projectId)}/inquiries`,
    request,
    fetcher,
  );
  return projectInquirySaveResult(projectId, request, value);
};

export const assessProjectInquirySaveRecovery = async (
  projectId: string,
  request: PetraProjectInquirySaveRequest,
  fetcher: typeof fetch = fetch,
): Promise<PetraProjectInquirySaveRecoveryView> => {
  contracts.assertValid("project-inquiry-save-request", "1.0.0", request);
  const value = await requestJson(
    `/api/queries/projects/${encodeURIComponent(projectId)}/inquiries/save-recovery`,
    request,
    fetcher,
  );
  contracts.assertValid("project-inquiry-save-recovery-view", "1.0.0", value);
  const recovery = value as PetraProjectInquirySaveRecoveryView;
  if (
    recovery.project_id !== projectId ||
    recovery.subject.command_id !== request.command_id ||
    recovery.subject.idempotency_key !== request.idempotency_key ||
    recovery.subject.request_hash !== (await canonicalHash(request))
  ) {
    throw new ProjectInquirySaveClientError(
      "Petra returned a recovery assessment for a different save request.",
      502,
      "PROJECT_INQUIRY_SAVE_RECOVERY_MISMATCH",
    );
  }
  if (recovery.effect.state === "effect_confirmed") {
    await assertReceiptBinding(projectId, request, recovery.effect.receipt);
  }
  return recovery;
};
