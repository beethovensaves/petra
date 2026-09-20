import {
  ProjectSourceReuseClient,
  ProjectSourceReuseClientError,
  type ProjectSourceReuseClientResult,
} from "@petra/adapters";
import type {
  PetraProjectSourceReuseOptionsView,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
} from "@petra/contracts";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface SourceReuseCommandIdentity {
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

export const createSourceReuseCommandIdentity =
  (): SourceReuseCommandIdentity => {
    const identity = randomUlidPayload();
    return {
      commandId: `command_${identity}`,
      idempotencyKey: `source.reuse:${identity}`,
    };
  };

export const sourceReuseCandidateKey = (
  candidate: PetraProjectSourceReuseOptionsView["candidates"][number],
): string =>
  candidate.existing_source.artifact_manifest_ref.artifact_manifest_id;

export const createSourceReuseRequest = (input: {
  readonly view: PetraProjectSourceReuseOptionsView;
  readonly candidateKey: string;
  readonly sourceRole: string;
  readonly identity?: SourceReuseCommandIdentity;
}): PetraProjectSourceReuseRequest => {
  const candidate = input.view.candidates.find(
    (option) => sourceReuseCandidateKey(option) === input.candidateKey,
  );
  if (candidate === undefined) {
    throw new TypeError(
      "Choose an existing source returned for this exact Project.",
    );
  }
  const role = input.view.source_roles.find(
    ({ semantic_key: semanticKey }) => semanticKey === input.sourceRole,
  );
  if (role === undefined) {
    throw new TypeError(
      "Choose a source role registered by this exact Project profile.",
    );
  }
  const identity = input.identity ?? createSourceReuseCommandIdentity();
  return {
    schema_name: "petra.project-source-reuse-request",
    schema_version: "1.0.0",
    command_id: identity.commandId,
    idempotency_key: identity.idempotencyKey,
    expected: structuredClone(input.view.expected),
    existing_source: structuredClone(candidate.existing_source),
    project_membership: {
      decision: "reuse_and_link",
      source_role: role.semantic_key,
    },
  };
};

const apiToken = (): string =>
  typeof window === "undefined"
    ? DEVELOPMENT_TOKEN
    : (window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN);

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

export const projectSourceReuseClient = (): ProjectSourceReuseClient =>
  new ProjectSourceReuseClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  });

export const loadSourceReuseOptions = (
  projectId: string,
  client = projectSourceReuseClient(),
): Promise<PetraProjectSourceReuseOptionsView> => client.getOptions(projectId);

export const executeSourceReuse = (
  projectId: string,
  request: PetraProjectSourceReuseRequest,
  client = projectSourceReuseClient(),
): Promise<ProjectSourceReuseClientResult> => client.reuse(projectId, request);

export const assessSourceReuseRecovery = (
  projectId: string,
  request: PetraProjectSourceReuseRequest,
  client = projectSourceReuseClient(),
): Promise<PetraProjectSourceReuseRecoveryView> =>
  client.assessRecovery(projectId, request);

export const sourceReuseOutcomeUnknown = (error: unknown): boolean =>
  !(error instanceof ProjectSourceReuseClientError) ||
  error.status === 0 ||
  error.status >= 500;

const OPTIONS_STALE_CODES = new Set([
  "PROJECT_SOURCE_REUSE_PROJECT_STALE",
  "PROJECT_SOURCE_REUSE_DEFINITION_STALE",
  "PROJECT_SOURCE_REUSE_SOURCE_NOT_FOUND",
  "PROJECT_SOURCE_REUSE_SOURCE_STALE",
  "PROJECT_SOURCE_REUSE_ROLE_UNREGISTERED",
  "PROJECT_SOURCE_REUSE_COPY_NOT_AUTHORIZED",
]);

export const sourceReuseOptionsChanged = (error: unknown): boolean =>
  error instanceof ProjectSourceReuseClientError &&
  OPTIONS_STALE_CODES.has(error.code);

export const sourceReuseMembershipDuplicate = (error: unknown): boolean =>
  error instanceof ProjectSourceReuseClientError &&
  error.code === "PROJECT_SOURCE_REUSE_MEMBERSHIP_DUPLICATE";

export const sourceReusePermissionLost = (error: unknown): boolean =>
  error instanceof ProjectSourceReuseClientError &&
  (error.status === 401 || error.status === 403);
