export type ArtifactByteStream =
  AsyncIterable<Uint8Array> | Iterable<Uint8Array>;

export interface ArtifactByteIdentity {
  contentHash: string;
  byteSize: number;
  mediaType: string;
}

export interface ArtifactMediaTypeVerification {
  status: "verified" | "verified_with_warnings";
  declaredMediaType: string;
  observedMediaType?: string;
  method: string;
  problems: string[];
}

export interface StageArtifactRequest {
  bytes: ArtifactByteStream;
  declaredByteSize: number;
  declaredMediaType: string;
  expectedContentHash?: string;
}

export interface StagedArtifact extends ArtifactByteIdentity {
  stageId: string;
  stagingKey: string;
  stagedAt: string;
  verification: ArtifactMediaTypeVerification;
}

export interface AvailableArtifact extends ArtifactByteIdentity {
  storeName: string;
  objectKey: string;
  availableAt: string;
  verification: ArtifactMediaTypeVerification;
}

export interface ArtifactRead {
  artifact: AvailableArtifact;
  /** The iterator verifies byte count and SHA-256 before completing. */
  bytes: AsyncIterable<Uint8Array>;
}

export interface ArtifactStagingCleanupResult {
  inspected: number;
  deletedStageIds: string[];
  retainedStageIds: string[];
}

export type ArtifactStoreErrorCode =
  | "ARTIFACT_STORE_HASH_INVALID"
  | "ARTIFACT_STORE_SIZE_INVALID"
  | "ARTIFACT_STORE_MEDIA_TYPE_INVALID"
  | "ARTIFACT_STORE_MEDIA_TYPE_MISMATCH"
  | "ARTIFACT_STORE_HASH_MISMATCH"
  | "ARTIFACT_STORE_SIZE_MISMATCH"
  | "ARTIFACT_STORE_STAGE_NOT_FOUND"
  | "ARTIFACT_STORE_OBJECT_NOT_FOUND"
  | "ARTIFACT_STORE_OBJECT_INTEGRITY_INVALID"
  | "ARTIFACT_STORE_STREAM_INVALID";

export class ArtifactStoreError extends Error {
  readonly code: ArtifactStoreErrorCode;

  constructor(code: ArtifactStoreErrorCode, message: string) {
    super(message);
    this.name = "ArtifactStoreError";
    this.code = code;
  }
}

/**
 * Immutable byte-store boundary. A caller may persist Artifact authority only
 * after `makeAvailable` returns an exact content-addressed identity.
 */
export interface ArtifactStore {
  stage(request: StageArtifactRequest): Promise<StagedArtifact>;
  makeAvailable(staged: StagedArtifact): Promise<AvailableArtifact>;
  inspectByHash(
    contentHash: string,
    expected?: Omit<ArtifactByteIdentity, "contentHash">,
  ): Promise<AvailableArtifact | undefined>;
  readByHash(
    contentHash: string,
    expected?: Omit<ArtifactByteIdentity, "contentHash">,
  ): Promise<ArtifactRead>;
  cleanupAbandonedStaging(
    olderThan: string,
    limit?: number,
  ): Promise<ArtifactStagingCleanupResult>;
}
