import {
  ProjectSourceRevisionClient,
  ProjectSourceRevisionClientError,
  type ProjectSourceRevisionClientResult,
} from "@petra/adapters";
import type {
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
  ProjectSourceReplacementExclusionReceiptRef,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type { SourceRegistrationMaterial } from "./source-registration.js";

const DEVELOPMENT_TOKEN = "petra-local-development";
const TOKEN_STORAGE_KEY = "petra.auth.token";
const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface SourceRevisionContext {
  readonly projectId: string;
  readonly projectRef: PetraProjectSourceRevisionRequest["expected"]["project_ref"];
  readonly projectDefinitionRef: PetraProjectSourceRevisionRequest["expected"]["project_definition_ref"];
  readonly currentSourceRef: PetraProjectSourceRevisionRequest["expected"]["current_source_ref"];
}

export interface SourceRevisionDraft {
  readonly versionLabel: string;
  readonly publicationStatus: PetraProjectSourceRevisionRequest["version"]["publication_status"];
  readonly metadataSourceName: string;
  readonly metadataSourceRecordId?: string;
  readonly metadataRetrievedAt: string;
  readonly sourceLocation: string;
  readonly licenseStatus: PetraProjectSourceRevisionRequest["rights"]["license_status"];
  readonly observedLicense?: PetraProjectSourceRevisionRequest["rights"]["observed_license"];
  readonly accessBasis: PetraProjectSourceRevisionRequest["rights"]["access_basis"];
  readonly decisionStatus: PetraProjectSourceRevisionRequest["rights"]["decision_status"];
  readonly permissions: PetraProjectSourceRevisionRequest["rights"]["permissions"];
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
  readonly replacementRationale: string;
  readonly reviewedAt: string;
}

export interface SourceRevisionCommandIdentity {
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

export const createSourceRevisionCommandIdentity = (
  operation: "intake" | "exclude" | "replace" = "intake",
): SourceRevisionCommandIdentity => {
  const identity = randomUlidPayload();
  return {
    commandId: `command_${identity}`,
    idempotencyKey: `source.revision:${operation}:${identity}`,
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

export const createSourceRevisionRequest = (input: {
  readonly context: SourceRevisionContext;
  readonly draft: SourceRevisionDraft;
  readonly material: SourceRegistrationMaterial;
  readonly identity?: SourceRevisionCommandIdentity;
}): PetraProjectSourceRevisionRequest => {
  const { context, draft, material } = input;
  if (context.currentSourceRef.status !== "active") {
    throw new TypeError(
      "A new version must bind the exact active predecessor returned by Petra.",
    );
  }
  if (!draft.permissions.store_raw_bytes) {
    throw new TypeError(
      "Adding this version requires explicit permission to store its bytes.",
    );
  }
  if (draft.licenseStatus === "known" && draft.observedLicense === undefined) {
    throw new TypeError("A known license requires its observed basis.");
  }
  const identity = input.identity ?? createSourceRevisionCommandIdentity();
  return {
    schema_name: "petra.project-source-revision-request",
    schema_version: "1.0.0",
    command_id: identity.commandId,
    idempotency_key: identity.idempotencyKey,
    expected: {
      project_ref: structuredClone(context.projectRef),
      project_definition_ref: structuredClone(context.projectDefinitionRef),
      current_source_ref: structuredClone(context.currentSourceRef),
    },
    version: {
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
      ] as PetraProjectSourceRevisionRequest["rights"]["conditions"],
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
    replacement: {
      replacement_kind: "newer_version",
      rationale: draft.replacementRationale.trim(),
      reviewed_at: reviewedTimestamp(
        draft.reviewedAt,
        "Replacement review time",
      ),
    },
  };
};

const apiToken = (): string =>
  typeof window === "undefined"
    ? DEVELOPMENT_TOKEN
    : (window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? DEVELOPMENT_TOKEN);

const apiBaseUrl = (): string =>
  typeof window === "undefined" ? "http://petra.local" : window.location.origin;

export const projectSourceRevisionClient = (): ProjectSourceRevisionClient =>
  new ProjectSourceRevisionClient({
    baseUrl: apiBaseUrl(),
    token: apiToken(),
  });

export const executeSourceRevision = (
  context: SourceRevisionContext,
  request: PetraProjectSourceRevisionRequest,
  client = projectSourceRevisionClient(),
): Promise<ProjectSourceRevisionClientResult> =>
  client.addRevision(
    context.projectId,
    context.currentSourceRef.project_source_id,
    request,
  );

export const assessSourceRevisionRecovery = (
  context: SourceRevisionContext,
  request: PetraProjectSourceRevisionRequest,
  client = projectSourceRevisionClient(),
): Promise<PetraProjectSourceRevisionRecoveryView> =>
  client.assessRecovery(
    context.projectId,
    context.currentSourceRef.project_source_id,
    request,
  );

export const sourceRevisionOutcomeUnknown = (error: unknown): boolean =>
  !(error instanceof ProjectSourceRevisionClientError) ||
  error.status === 0 ||
  error.status >= 500;

export const sourceRevisionPermissionLost = (error: unknown): boolean =>
  error instanceof ProjectSourceRevisionClientError &&
  (error.status === 401 || error.status === 403);

export const sourceRevisionConflict = (error: unknown): boolean =>
  error instanceof ProjectSourceRevisionClientError && error.status === 409;

export const sourceRevisionErrorCode = (error: unknown): string | undefined =>
  error instanceof ProjectSourceRevisionClientError ? error.code : undefined;

const canonicalHash = async (value: unknown): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalize(value)),
  );
  return `sha256:${Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")}`;
};

/** Builds the exact receipt reference required by the governed replacement owner. */
export const sourceLifecycleReceiptRef = async (
  receipt: PetraProjectSourceLifecycleReceipt,
): Promise<ProjectSourceReplacementExclusionReceiptRef> => ({
  project_source_lifecycle_receipt_id:
    receipt.project_source_lifecycle_receipt_id,
  revision: receipt.revision,
  content_hash: receipt.content_hash,
  record_hash: await canonicalHash(receipt),
});
