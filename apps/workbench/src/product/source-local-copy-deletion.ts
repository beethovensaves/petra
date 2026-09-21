import {
  ProjectSourceLocalCopyDeletionClient,
  ProjectSourceLocalCopyDeletionClientError,
} from "@petra/adapters";
import type {
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionRequest,
} from "@petra/contracts";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface SourceLocalCopyDeletionCommandIdentity {
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

export const createSourceLocalCopyDeletionCommandIdentity =
  (): SourceLocalCopyDeletionCommandIdentity => {
    const identity = randomUlidPayload();
    return {
      commandId: `command_${identity}`,
      idempotencyKey: `source.delete-local-copy:${identity}`,
    };
  };

export const createSourceLocalCopyDeletionRequest = (input: {
  readonly preview: PetraProjectSourceLocalCopyDeletionPreview;
  readonly reason: string;
  readonly identity?: SourceLocalCopyDeletionCommandIdentity;
}): PetraProjectSourceLocalCopyDeletionRequest => {
  const reason = input.reason.trim();
  if (reason.length === 0) {
    throw new TypeError("Explain why this exact local copy should be deleted.");
  }
  if (
    input.preview.eligibility.state !== "eligible" ||
    input.preview.operation.state !== "ready" ||
    input.preview.operation.command_name !== "DeleteLocalSourceCopy"
  ) {
    throw new TypeError(
      "Local-copy deletion requires Petra's current eligible preview for the exact copy.",
    );
  }
  const identity =
    input.identity ?? createSourceLocalCopyDeletionCommandIdentity();
  return {
    schema_name: "petra.project-source-local-copy-deletion-request",
    schema_version: "1.0.0",
    command_id: identity.commandId,
    idempotency_key: identity.idempotencyKey,
    expected: structuredClone(input.preview.expected),
    reason,
  };
};

const apiToken = (): string =>
  typeof window === "undefined"
    ? DEVELOPMENT_TOKEN
    : (window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN);

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

export const projectSourceLocalCopyDeletionClient =
  (): ProjectSourceLocalCopyDeletionClient =>
    new ProjectSourceLocalCopyDeletionClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
      fetch: (input, init) => fetch(input, init),
    });

export const sourceLocalCopyDeletionOutcomeUnknown = (
  error: unknown,
): boolean =>
  !(error instanceof ProjectSourceLocalCopyDeletionClientError) ||
  error.status === 0 ||
  error.status >= 500;

export const sourceLocalCopyDeletionPermissionLost = (
  error: unknown,
): boolean =>
  error instanceof ProjectSourceLocalCopyDeletionClientError &&
  (error.status === 401 || error.status === 403);

export const sourceLocalCopyDeletionConflict = (error: unknown): boolean =>
  error instanceof ProjectSourceLocalCopyDeletionClientError &&
  error.status === 409;

export const sourceLocalCopyDeletionErrorCode = (
  error: unknown,
): string | undefined =>
  error instanceof ProjectSourceLocalCopyDeletionClientError
    ? error.code
    : undefined;
