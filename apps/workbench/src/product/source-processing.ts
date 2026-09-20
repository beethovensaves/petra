import {
  ProjectSourceProcessingClient,
  ProjectSourceProcessingClientError,
  type ProjectSourceProcessingClientResult,
} from "@petra/adapters";
import type {
  PetraProjectSourceProcessingRecoveryView,
  PetraProjectSourceProcessingRequest,
  PetraProjectSourceProcessingView,
} from "@petra/contracts";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface SourceProcessingCommandIdentity {
  readonly commandId: string;
  readonly idempotencyKey: string;
}

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

export const createSourceProcessingCommandIdentity =
  (): SourceProcessingCommandIdentity => {
    const identity = randomUlidPayload();
    return {
      commandId: `command_${identity}`,
      idempotencyKey: `source.process:${identity}`,
    };
  };

export const createSourceProcessingRequest = (input: {
  readonly view: PetraProjectSourceProcessingView;
  readonly identity?: SourceProcessingCommandIdentity;
}): PetraProjectSourceProcessingRequest => {
  if (input.view.processing.state !== "ready") {
    throw new TypeError(
      "Source processing can start only from the server-composed ready state.",
    );
  }
  const identity = input.identity ?? createSourceProcessingCommandIdentity();
  return {
    schema_name: "petra.project-source-processing-request",
    schema_version: "1.0.0",
    command_id: identity.commandId,
    idempotency_key: identity.idempotencyKey,
    expected: structuredClone(input.view.processing.request_template),
  };
};

const apiToken = (): string =>
  typeof window === "undefined"
    ? DEVELOPMENT_TOKEN
    : (window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN);

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

export const projectSourceProcessingClient =
  (): ProjectSourceProcessingClient =>
    new ProjectSourceProcessingClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
    });

export const loadSourceProcessing = (
  projectId: string,
  projectSourceId: string,
  client = projectSourceProcessingClient(),
): Promise<PetraProjectSourceProcessingView> =>
  client.get(projectId, projectSourceId);

export const executeSourceProcessing = (
  projectId: string,
  projectSourceId: string,
  request: PetraProjectSourceProcessingRequest,
  client = projectSourceProcessingClient(),
): Promise<ProjectSourceProcessingClientResult> =>
  client.start(projectId, projectSourceId, request);

export const assessSourceProcessingRecovery = (
  projectId: string,
  projectSourceId: string,
  request: PetraProjectSourceProcessingRequest,
  client = projectSourceProcessingClient(),
): Promise<PetraProjectSourceProcessingRecoveryView> =>
  client.assessRecovery(projectId, projectSourceId, request);

export const sourceProcessingOutcomeUnknown = (error: unknown): boolean =>
  !(error instanceof ProjectSourceProcessingClientError) ||
  error.status === 0 ||
  error.status >= 500;

const SOURCE_PROCESSING_CHANGED_CODES = new Set([
  "PROJECT_SOURCE_PROCESSING_ALREADY_EXISTS",
  "PROJECT_SOURCE_PROCESSING_DEFINITION_STALE",
  "PROJECT_SOURCE_PROCESSING_PROJECT_STALE",
  "PROJECT_SOURCE_PROCESSING_ROLE_UNREGISTERED",
  "PROJECT_SOURCE_PROCESSING_SOURCE_NOT_FOUND",
  "PROJECT_SOURCE_PROCESSING_SOURCE_STALE",
  "PROJECT_SOURCE_PROCESSING_SOURCE_UNAVAILABLE",
  "PROJECT_SOURCE_PROCESSING_COPY_UNAVAILABLE",
  "PROJECT_SOURCE_PROCESSING_PARSE_NOT_AUTHORIZED",
]);

export const sourceProcessingStateChanged = (error: unknown): boolean =>
  error instanceof ProjectSourceProcessingClientError &&
  SOURCE_PROCESSING_CHANGED_CODES.has(error.code);

export const sourceProcessingPermissionLost = (error: unknown): boolean =>
  error instanceof ProjectSourceProcessingClientError &&
  (error.status === 401 || error.status === 403);

export const sourceProcessingErrorCode = (
  error: unknown,
): string | undefined =>
  error instanceof ProjectSourceProcessingClientError ? error.code : undefined;
