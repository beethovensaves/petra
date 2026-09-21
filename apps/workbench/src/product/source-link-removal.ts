import {
  ProjectSourceLinkRemovalClient,
  ProjectSourceLinkRemovalClientError,
} from "@petra/adapters";
import type {
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLinkRemovalRequest,
} from "@petra/contracts";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface SourceLinkRemovalCommandIdentity {
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

export const createSourceLinkRemovalCommandIdentity =
  (): SourceLinkRemovalCommandIdentity => {
    const identity = randomUlidPayload();
    return {
      commandId: `command_${identity}`,
      idempotencyKey: `source.remove-project-link:${identity}`,
    };
  };

export const createSourceLinkRemovalRequest = (input: {
  readonly preview: PetraProjectSourceLinkRemovalPreview;
  readonly reason: string;
  readonly identity?: SourceLinkRemovalCommandIdentity;
}): PetraProjectSourceLinkRemovalRequest => {
  const reason = input.reason.trim();
  if (reason.length === 0) {
    throw new TypeError("Explain why this source link should be removed.");
  }
  if (
    input.preview.operation.state !== "ready" ||
    input.preview.operation.command_name !== "ExcludeProjectSource" ||
    input.preview.expected.current_source_ref.status !== "active"
  ) {
    throw new TypeError(
      "Project-link removal requires Petra's current ready preview for the exact active source.",
    );
  }
  const identity = input.identity ?? createSourceLinkRemovalCommandIdentity();
  return {
    schema_name: "petra.project-source-link-removal-request",
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

export const projectSourceLinkRemovalClient =
  (): ProjectSourceLinkRemovalClient =>
    new ProjectSourceLinkRemovalClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
      fetch: (input, init) => fetch(input, init),
    });

export const sourceLinkRemovalOutcomeUnknown = (error: unknown): boolean =>
  !(error instanceof ProjectSourceLinkRemovalClientError) ||
  error.status === 0 ||
  error.status >= 500;

export const sourceLinkRemovalPermissionLost = (error: unknown): boolean =>
  error instanceof ProjectSourceLinkRemovalClientError &&
  (error.status === 401 || error.status === 403);

export const sourceLinkRemovalConflict = (error: unknown): boolean =>
  error instanceof ProjectSourceLinkRemovalClientError && error.status === 409;

export const sourceLinkRemovalErrorCode = (
  error: unknown,
): string | undefined =>
  error instanceof ProjectSourceLinkRemovalClientError ? error.code : undefined;
