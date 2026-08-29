import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraRightsDecision,
} from "@petra/contracts";

export type ArtifactRegistrationErrorCode =
  | "ARTIFACT_HASH_MISMATCH"
  | "ARTIFACT_SIZE_MISMATCH"
  | "MANIFEST_ARTIFACT_MISMATCH"
  | "MANIFEST_HASH_MISMATCH"
  | "RIGHTS_MANIFEST_MISMATCH"
  | "RIGHTS_SOURCE_MISMATCH"
  | "STORAGE_NOT_PERMITTED"
  | "ARTIFACT_NOT_REGISTERED"
  | "ARTIFACT_ID_ALREADY_REGISTERED"
  | "ARTIFACT_MANIFEST_ID_ALREADY_REGISTERED"
  | "RIGHTS_DECISION_ID_ALREADY_REGISTERED"
  | "CONTENT_HASH_ALREADY_REGISTERED";

export class ArtifactRegistrationError extends Error {
  readonly code: ArtifactRegistrationErrorCode;

  constructor(code: ArtifactRegistrationErrorCode, message: string) {
    super(message);
    this.name = "ArtifactRegistrationError";
    this.code = code;
  }
}

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

export interface RegisterVerifiedArtifactInput {
  artifact: PetraArtifact;
  manifest: PetraArtifactManifest;
  rightsDecision: PetraRightsDecision;
  bytes: Uint8Array;
}

export interface AttachArtifactManifestInput {
  artifactId: string;
  manifest: PetraArtifactManifest;
  rightsDecision: PetraRightsDecision;
}

export interface RegisteredArtifact {
  artifact: DeepReadonly<PetraArtifact>;
  manifest: DeepReadonly<PetraArtifactManifest>;
  rightsDecision: DeepReadonly<PetraRightsDecision>;
}

const sha256 = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const member of Object.values(value)) deepFreeze(member);
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

const immutableCopy = <Value>(value: Value): DeepReadonly<Value> =>
  deepFreeze(structuredClone(value));

const validateManifestAndRights = (
  artifact: { artifact_id: string; content_hash: string },
  manifest: PetraArtifactManifest,
  rightsDecision: PetraRightsDecision,
): void => {
  if (manifest.artifact_id !== artifact.artifact_id) {
    throw new ArtifactRegistrationError(
      "MANIFEST_ARTIFACT_MISMATCH",
      "The ArtifactManifest does not identify the supplied Artifact.",
    );
  }
  if (manifest.storage_ref.content_hash !== artifact.content_hash) {
    throw new ArtifactRegistrationError(
      "MANIFEST_HASH_MISMATCH",
      "The content-addressed storage reference does not identify the supplied Artifact bytes.",
    );
  }
  if (
    rightsDecision.artifact_manifest_id !== manifest.artifact_manifest_id ||
    manifest.rights_decision_id !== rightsDecision.rights_decision_id
  ) {
    throw new ArtifactRegistrationError(
      "RIGHTS_MANIFEST_MISMATCH",
      "The ArtifactManifest and RightsDecision do not link to each other.",
    );
  }
  if (
    manifest.origin.origin_kind === "acquired" &&
    rightsDecision.source_location !== manifest.origin.retrieval_url
  ) {
    throw new ArtifactRegistrationError(
      "RIGHTS_SOURCE_MISMATCH",
      "The RightsDecision is not scoped to the exact acquired source location.",
    );
  }
  if (!rightsDecision.permissions.store_raw_bytes) {
    throw new ArtifactRegistrationError(
      "STORAGE_NOT_PERMITTED",
      "The copy-specific RightsDecision does not permit Petra to store the raw bytes.",
    );
  }
};

export class InMemoryArtifactRegistry {
  readonly #byArtifactId = new Map<string, RegisteredArtifact>();
  readonly #artifactIdByContentHash = new Map<string, string>();
  readonly #byManifestId = new Map<string, RegisteredArtifact>();
  readonly #manifestIdsByArtifactId = new Map<string, string[]>();
  readonly #rightsDecisionIds = new Set<string>();

  get size(): number {
    return this.#byArtifactId.size;
  }

  get acquisitionCount(): number {
    return this.#byManifestId.size;
  }

  getByArtifactId(artifactId: string): RegisteredArtifact | undefined {
    return this.#byArtifactId.get(artifactId);
  }

  getByManifestId(manifestId: string): RegisteredArtifact | undefined {
    return this.#byManifestId.get(manifestId);
  }

  getAcquisitionsForArtifact(
    artifactId: string,
  ): readonly RegisteredArtifact[] {
    const manifestIds = this.#manifestIdsByArtifactId.get(artifactId) ?? [];
    return manifestIds.flatMap((manifestId) => {
      const registration = this.#byManifestId.get(manifestId);
      return registration === undefined ? [] : [registration];
    });
  }

  register(input: RegisterVerifiedArtifactInput): RegisteredArtifact {
    const { artifact, manifest, rightsDecision, bytes } = input;
    const computedHash = sha256(bytes);

    if (computedHash !== artifact.content_hash) {
      throw new ArtifactRegistrationError(
        "ARTIFACT_HASH_MISMATCH",
        `Artifact ${artifact.artifact_id} declares ${artifact.content_hash}, but the verified bytes hash to ${computedHash}.`,
      );
    }
    if (bytes.byteLength !== artifact.byte_size) {
      throw new ArtifactRegistrationError(
        "ARTIFACT_SIZE_MISMATCH",
        `Artifact ${artifact.artifact_id} declares ${artifact.byte_size} bytes, but ${bytes.byteLength} bytes were supplied.`,
      );
    }
    validateManifestAndRights(artifact, manifest, rightsDecision);
    if (this.#byArtifactId.has(artifact.artifact_id)) {
      throw new ArtifactRegistrationError(
        "ARTIFACT_ID_ALREADY_REGISTERED",
        `Artifact ID ${artifact.artifact_id} is already registered.`,
      );
    }
    if (this.#byManifestId.has(manifest.artifact_manifest_id)) {
      throw new ArtifactRegistrationError(
        "ARTIFACT_MANIFEST_ID_ALREADY_REGISTERED",
        `ArtifactManifest ID ${manifest.artifact_manifest_id} is already registered.`,
      );
    }
    if (this.#rightsDecisionIds.has(rightsDecision.rights_decision_id)) {
      throw new ArtifactRegistrationError(
        "RIGHTS_DECISION_ID_ALREADY_REGISTERED",
        `RightsDecision ID ${rightsDecision.rights_decision_id} is already registered.`,
      );
    }
    const existingArtifactId = this.#artifactIdByContentHash.get(
      artifact.content_hash,
    );
    if (existingArtifactId !== undefined) {
      throw new ArtifactRegistrationError(
        "CONTENT_HASH_ALREADY_REGISTERED",
        `The exact bytes are already registered as ${existingArtifactId}; attach another acquisition manifest to that Artifact instead of duplicating its content identity.`,
      );
    }

    const registered = deepFreeze({
      artifact: immutableCopy(artifact),
      manifest: immutableCopy(manifest),
      rightsDecision: immutableCopy(rightsDecision),
    });

    this.#byArtifactId.set(artifact.artifact_id, registered);
    this.#artifactIdByContentHash.set(
      artifact.content_hash,
      artifact.artifact_id,
    );
    this.#byManifestId.set(manifest.artifact_manifest_id, registered);
    this.#manifestIdsByArtifactId.set(artifact.artifact_id, [
      manifest.artifact_manifest_id,
    ]);
    this.#rightsDecisionIds.add(rightsDecision.rights_decision_id);
    return registered;
  }

  attachManifest(input: AttachArtifactManifestInput): RegisteredArtifact {
    const { artifactId, manifest, rightsDecision } = input;
    const existing = this.#byArtifactId.get(artifactId);
    if (existing === undefined) {
      throw new ArtifactRegistrationError(
        "ARTIFACT_NOT_REGISTERED",
        `Artifact ${artifactId} must be registered from verified bytes before another acquisition manifest can be attached.`,
      );
    }

    validateManifestAndRights(existing.artifact, manifest, rightsDecision);
    if (this.#byManifestId.has(manifest.artifact_manifest_id)) {
      throw new ArtifactRegistrationError(
        "ARTIFACT_MANIFEST_ID_ALREADY_REGISTERED",
        `ArtifactManifest ID ${manifest.artifact_manifest_id} is already registered.`,
      );
    }
    if (this.#rightsDecisionIds.has(rightsDecision.rights_decision_id)) {
      throw new ArtifactRegistrationError(
        "RIGHTS_DECISION_ID_ALREADY_REGISTERED",
        `RightsDecision ID ${rightsDecision.rights_decision_id} is already registered.`,
      );
    }

    const registered = deepFreeze({
      artifact: existing.artifact,
      manifest: immutableCopy(manifest),
      rightsDecision: immutableCopy(rightsDecision),
    });
    this.#byManifestId.set(manifest.artifact_manifest_id, registered);
    this.#manifestIdsByArtifactId
      .get(artifactId)
      ?.push(manifest.artifact_manifest_id);
    this.#rightsDecisionIds.add(rightsDecision.rights_decision_id);
    return registered;
  }
}
