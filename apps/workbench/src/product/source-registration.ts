import {
  ProjectSourceRegistrationClient,
  ProjectSourceRegistrationClientError,
  type ProjectSourceRegistrationClientResult,
} from "@petra/adapters";
import type {
  PetraProjectSourceRegistrationRecoveryView,
  PetraProjectSourceRegistrationRequest,
} from "@petra/contracts";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface SourceRegistrationRole {
  readonly semanticKey: string;
  readonly label: string;
  readonly meaning: string;
}

export interface SourceRegistrationContext {
  readonly projectId: string;
  readonly projectRef: PetraProjectSourceRegistrationRequest["expected"]["project_ref"];
  readonly projectDefinitionRef: PetraProjectSourceRegistrationRequest["expected"]["project_definition_ref"];
  readonly sourceRoles: readonly SourceRegistrationRole[];
}

export interface SourceRegistrationMaterial {
  readonly contentBase64: string;
  readonly contentHash: string;
  readonly originalFilename: string;
  readonly mediaType: string;
  readonly artifactKind: PetraProjectSourceRegistrationRequest["material"]["artifact_kind"];
}

export interface SourceRegistrationDraft {
  readonly title: string;
  readonly workKind: PetraProjectSourceRegistrationRequest["source_identity"]["work_kind"];
  readonly identityStatus: PetraProjectSourceRegistrationRequest["source_identity"]["identity_status"];
  readonly authorNames: readonly string[];
  readonly authorKind: PetraProjectSourceRegistrationRequest["source_identity"]["authors"][number]["author_kind"];
  readonly versionLabel: string;
  readonly publicationStatus: PetraProjectSourceRegistrationRequest["source_identity"]["publication_status"];
  readonly metadataSourceName: string;
  readonly metadataSourceRecordId?: string;
  readonly metadataRetrievedAt: string;
  readonly sourceLocation: string;
  readonly licenseStatus: PetraProjectSourceRegistrationRequest["rights"]["license_status"];
  readonly observedLicense?: PetraProjectSourceRegistrationRequest["rights"]["observed_license"];
  readonly accessBasis: PetraProjectSourceRegistrationRequest["rights"]["access_basis"];
  readonly decisionStatus: PetraProjectSourceRegistrationRequest["rights"]["decision_status"];
  readonly permissions: PetraProjectSourceRegistrationRequest["rights"]["permissions"];
  readonly conditions: readonly (
    | "attribution"
    | "notice"
    | "noncommercial"
    | "share_alike"
    | "no_derivatives"
  )[];
  readonly requiredNotices: readonly string[];
  readonly authorizationReference?: string;
  readonly rightsRationale: string;
  readonly rightsObservedAt: string;
  readonly policyVersion: string;
  readonly sourceRole: string;
  readonly reviewedAt: string;
}

export interface SourceRegistrationCommandIdentity {
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

export const createSourceRegistrationCommandIdentity =
  (): SourceRegistrationCommandIdentity => {
    const identity = randomUlidPayload();
    return {
      commandId: `command_${identity}`,
      idempotencyKey: `source.register:${identity}`,
    };
  };

const reviewedTimestamp = (value: string, label: string): string => {
  if (value.length === 0) throw new TypeError(`${label} is required.`);
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.valueOf())) {
    throw new TypeError(`${label} must be a valid reviewed date and time.`);
  }
  return timestamp.toISOString();
};

export const createSourceRegistrationRequest = (input: {
  readonly context: SourceRegistrationContext;
  readonly draft: SourceRegistrationDraft;
  readonly material: SourceRegistrationMaterial;
  readonly identity?: SourceRegistrationCommandIdentity;
}): PetraProjectSourceRegistrationRequest => {
  const { context, draft, material } = input;
  const role = context.sourceRoles.find(
    ({ semanticKey }) => semanticKey === draft.sourceRole,
  );
  if (role === undefined) {
    throw new TypeError(
      "Choose a source role registered by this exact Project profile.",
    );
  }
  const authorNames = draft.authorNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (authorNames.length === 0) {
    throw new TypeError("At least one reviewed author is required.");
  }
  if (!draft.permissions.store_raw_bytes) {
    throw new TypeError(
      "Registering this copy requires explicit permission to store its bytes.",
    );
  }
  if (draft.licenseStatus === "known" && draft.observedLicense === undefined) {
    throw new TypeError("A known license requires its observed basis.");
  }
  const identity = input.identity ?? createSourceRegistrationCommandIdentity();
  return {
    schema_name: "petra.project-source-registration-request",
    schema_version: "1.0.0",
    command_id: identity.commandId,
    idempotency_key: identity.idempotencyKey,
    expected: {
      project_ref: structuredClone(context.projectRef),
      project_definition_ref: structuredClone(context.projectDefinitionRef),
    },
    source_identity: {
      title: draft.title.trim(),
      work_kind: draft.workKind,
      identity_status: draft.identityStatus,
      authors: authorNames.map((displayName) => ({
        display_name: displayName,
        author_kind: draft.authorKind,
        identity_status: draft.identityStatus,
      })) as PetraProjectSourceRegistrationRequest["source_identity"]["authors"],
      version_label: draft.versionLabel.trim(),
      publication_status: draft.publicationStatus,
      metadata_source_name: draft.metadataSourceName.trim(),
      ...(draft.metadataSourceRecordId === undefined ||
      draft.metadataSourceRecordId.trim().length === 0
        ? {}
        : { metadata_source_record_id: draft.metadataSourceRecordId.trim() }),
      metadata_retrieved_at: reviewedTimestamp(
        draft.metadataRetrievedAt,
        "Metadata observation time",
      ),
    },
    material: {
      encoding: "base64",
      content_base64: material.contentBase64,
      expected_content_hash: material.contentHash,
      artifact_kind: material.artifactKind,
      media_type: material.mediaType,
      original_filename: material.originalFilename,
    },
    rights: {
      source_location: draft.sourceLocation.trim(),
      license_status: draft.licenseStatus,
      ...(draft.observedLicense === undefined
        ? {}
        : { observed_license: structuredClone(draft.observedLicense) }),
      access_basis: draft.accessBasis,
      decision_status: draft.decisionStatus,
      permissions: structuredClone(draft.permissions),
      conditions: [
        ...draft.conditions,
      ] as PetraProjectSourceRegistrationRequest["rights"]["conditions"],
      required_notices: [...draft.requiredNotices],
      ...(draft.authorizationReference === undefined ||
      draft.authorizationReference.trim().length === 0
        ? {}
        : { authorization_reference: draft.authorizationReference.trim() }),
      rationale: draft.rightsRationale.trim(),
      observed_at: reviewedTimestamp(
        draft.rightsObservedAt,
        "Rights observation time",
      ),
      policy_version: draft.policyVersion.trim(),
    },
    project_membership: {
      decision: "register_and_link",
      source_role: role.semanticKey,
      reviewed_at: reviewedTimestamp(
        draft.reviewedAt,
        "Source review completion time",
      ),
    },
  };
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize),
    );
  }
  return btoa(binary);
};

export const sourceRegistrationMaterialFromFile = async (
  file: File,
  artifactKind: SourceRegistrationMaterial["artifactKind"],
): Promise<SourceRegistrationMaterial> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length === 0)
    throw new TypeError("Choose a non-empty source file.");
  if (bytes.length > 32 * 1024 * 1024) {
    throw new TypeError("Choose a source file no larger than 32 MiB.");
  }
  const digest = new Uint8Array(
    await globalThis.crypto.subtle.digest("SHA-256", bytes),
  );
  return {
    contentBase64: bytesToBase64(bytes),
    contentHash: `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
    originalFilename: file.name,
    mediaType: file.type || "application/octet-stream",
    artifactKind,
  };
};

const apiToken = (): string =>
  typeof window === "undefined"
    ? DEVELOPMENT_TOKEN
    : (window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN);

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

export const projectSourceRegistrationClient =
  (): ProjectSourceRegistrationClient =>
    new ProjectSourceRegistrationClient({
      baseUrl: apiBaseUrl(),
      token: apiToken(),
    });

export const executeSourceRegistration = (
  context: SourceRegistrationContext,
  request: PetraProjectSourceRegistrationRequest,
  client = projectSourceRegistrationClient(),
): Promise<ProjectSourceRegistrationClientResult> =>
  client.register(context.projectId, request);

export const assessSourceRegistrationRecovery = (
  context: SourceRegistrationContext,
  request: PetraProjectSourceRegistrationRequest,
  client = projectSourceRegistrationClient(),
): Promise<PetraProjectSourceRegistrationRecoveryView> =>
  client.assessRecovery(context.projectId, request);

export const sourceRegistrationOutcomeUnknown = (error: unknown): boolean =>
  !(error instanceof ProjectSourceRegistrationClientError) ||
  error.status === 0 ||
  error.status >= 500;
