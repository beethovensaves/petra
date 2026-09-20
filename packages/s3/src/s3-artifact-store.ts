import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import {
  ArtifactStoreError,
  type ArtifactByteIdentity,
  type ArtifactByteStream,
  type ArtifactMediaTypeVerification,
  type ArtifactDeletionResult,
  type ArtifactRead,
  type ArtifactStagingCleanupResult,
  type ArtifactStore,
  type AvailableArtifact,
  type StageArtifactRequest,
  type StagedArtifact,
} from "@petra/core";

const HASH_PATTERN = /^sha256:([0-9a-f]{64})$/;
const MEDIA_TYPE_PATTERN =
  /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+(?:; charset=utf-8)?$/;
const SAMPLE_LIMIT = 8192;

export interface S3ArtifactStoreOptions {
  client: S3Client;
  bucket: string;
  storeName: string;
  namespace?: string;
  now?: () => Date;
  createStageId?: () => string;
}

interface StoredMetadata {
  contentHash: string;
  byteSize: number;
  mediaType: string;
  availableAt: string;
  verification: ArtifactMediaTypeVerification;
}

const error = (
  code: ConstructorParameters<typeof ArtifactStoreError>[0],
  message: string,
): ArtifactStoreError => new ArtifactStoreError(code, message);

const normalizeHash = (contentHash: string): string => {
  if (!HASH_PATTERN.test(contentHash)) {
    throw error(
      "ARTIFACT_STORE_HASH_INVALID",
      "Artifact content hashes must be lowercase SHA-256 identifiers.",
    );
  }
  return contentHash;
};

const normalizeSize = (byteSize: number): number => {
  if (!Number.isSafeInteger(byteSize) || byteSize < 0) {
    throw error(
      "ARTIFACT_STORE_SIZE_INVALID",
      "Artifact byte size must be a non-negative safe integer.",
    );
  }
  return byteSize;
};

const normalizeMediaType = (mediaType: string): string => {
  const normalized = mediaType.trim().toLowerCase();
  if (normalized !== mediaType || !MEDIA_TYPE_PATTERN.test(normalized)) {
    throw error(
      "ARTIFACT_STORE_MEDIA_TYPE_INVALID",
      "Artifact media type must be one normalized type/subtype; UTF-8 text may include the exact charset=utf-8 parameter.",
    );
  }
  return normalized;
};

export const contentAddressedArtifactKey = (contentHash: string): string => {
  const normalized = normalizeHash(contentHash);
  const hex = HASH_PATTERN.exec(normalized)?.[1];
  if (hex === undefined)
    throw new Error("Validated SHA-256 hash did not parse.");
  return `sha256/${hex.slice(0, 2)}/${hex.slice(2)}`;
};

const startsWith = (
  sample: Uint8Array,
  signature: readonly number[],
): boolean => signature.every((value, index) => sample[index] === value);

const isUtf8Text = (sample: Uint8Array): boolean => {
  if (sample.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return true;
  } catch {
    return false;
  }
};

const firstNonWhitespaceAscii = (sample: Uint8Array): number | undefined => {
  for (const value of sample) {
    if (![9, 10, 13, 32].includes(value)) return value;
  }
  return undefined;
};

export const verifyArtifactMediaType = (
  declaredMediaType: string,
  sample: Uint8Array,
): ArtifactMediaTypeVerification => {
  const declared = normalizeMediaType(declaredMediaType);
  let observed: string | undefined;
  let method = "signature";
  if (startsWith(sample, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    observed = "application/pdf";
  } else if (
    startsWith(sample, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    observed = "image/png";
  } else if (startsWith(sample, [0xff, 0xd8, 0xff])) {
    observed = "image/jpeg";
  } else if (
    startsWith(sample, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWith(sample, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    observed = "image/gif";
  } else if (startsWith(sample, [0x1f, 0x8b])) {
    observed = "application/gzip";
  } else if (
    startsWith(sample, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(sample, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(sample, [0x50, 0x4b, 0x07, 0x08])
  ) {
    observed = "application/zip";
  } else if ([0x7b, 0x5b].includes(firstNonWhitespaceAscii(sample) ?? -1)) {
    observed = "application/json";
    method = "structured-prefix";
  } else if (declared === "text/html" && isUtf8Text(sample)) {
    const prefix = new TextDecoder().decode(sample).trimStart().toLowerCase();
    if (prefix.startsWith("<!doctype html") || prefix.startsWith("<html")) {
      observed = "text/html";
      method = "structured-prefix";
    }
  } else if (declared.startsWith("text/") && isUtf8Text(sample)) {
    observed = declared;
    method = "utf-8-sample";
  }

  const zipContainer =
    observed === "application/zip" &&
    (declared.startsWith("application/vnd.") ||
      declared === "application/epub+zip");
  if (observed !== undefined && observed !== declared && !zipContainer) {
    throw error(
      "ARTIFACT_STORE_MEDIA_TYPE_MISMATCH",
      `Artifact bytes identify as ${observed}, not the declared ${declared}.`,
    );
  }
  if (observed === undefined || zipContainer) {
    return {
      status: "verified_with_warnings",
      declaredMediaType: declared,
      ...(observed === undefined ? {} : { observedMediaType: observed }),
      method: observed === undefined ? "no-deterministic-signature" : method,
      problems: [
        observed === undefined
          ? `No deterministic signature rule is registered for ${declared}.`
          : `${declared} is verified only to its ZIP container signature.`,
      ],
    };
  }
  return {
    status: "verified",
    declaredMediaType: declared,
    observedMediaType: observed,
    method,
    problems: [],
  };
};

const copySource = (bucket: string, key: string): string =>
  `${encodeURIComponent(bucket)}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;

const asAsyncBytes = async function* (
  stream: ArtifactByteStream,
): AsyncGenerator<Uint8Array> {
  for await (const value of stream) {
    if (!(value instanceof Uint8Array)) {
      throw error(
        "ARTIFACT_STORE_STREAM_INVALID",
        "Artifact streams may contain only Uint8Array chunks.",
      );
    }
    yield value;
  }
};

const isNotFound = (caught: unknown): boolean => {
  if (typeof caught !== "object" || caught === null) return false;
  const value = caught as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  return (
    value.name === "NotFound" ||
    value.name === "NoSuchKey" ||
    value.$metadata?.httpStatusCode === 404
  );
};

const bodyAsBytes = (body: unknown): AsyncIterable<Uint8Array> => {
  if (
    typeof body !== "object" ||
    body === null ||
    !(Symbol.asyncIterator in body)
  ) {
    throw error(
      "ARTIFACT_STORE_STREAM_INVALID",
      "The object store did not return an asynchronous byte stream.",
    );
  }
  return body as AsyncIterable<Uint8Array>;
};

const sampleBytes = (
  parts: readonly Uint8Array[],
  length: number,
): Uint8Array => {
  const sample = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    const remaining = length - offset;
    if (remaining <= 0) break;
    const selected = part.subarray(0, remaining);
    sample.set(selected, offset);
    offset += selected.byteLength;
  }
  return sample;
};

export class S3ArtifactStore implements ArtifactStore {
  readonly #client: S3Client;
  readonly #bucket: string;
  readonly #storeName: string;
  readonly #namespace: string;
  readonly #now: () => Date;
  readonly #createStageId: () => string;

  constructor(options: S3ArtifactStoreOptions) {
    if (options.bucket.trim() === "" || options.storeName.trim() === "") {
      throw new TypeError(
        "ArtifactStore bucket and storeName cannot be empty.",
      );
    }
    this.#client = options.client;
    this.#bucket = options.bucket;
    this.#storeName = options.storeName;
    this.#namespace = (options.namespace ?? "petra").replace(/^\/+|\/+$/g, "");
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(this.#namespace)) {
      throw new TypeError(
        "ArtifactStore namespace is not a safe object-key prefix.",
      );
    }
    this.#now = options.now ?? (() => new Date());
    this.#createStageId = options.createStageId ?? randomUUID;
  }

  async stage(request: StageArtifactRequest): Promise<StagedArtifact> {
    const declaredByteSize = normalizeSize(request.declaredByteSize);
    const declaredMediaType = normalizeMediaType(request.declaredMediaType);
    const expectedContentHash =
      request.expectedContentHash === undefined
        ? undefined
        : normalizeHash(request.expectedContentHash);
    const stageId = this.#createStageId();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(stageId)) {
      throw new TypeError("The generated artifact stage ID is unsafe.");
    }
    const stagingKey = this.#stagingKey(stageId);
    const hash = createHash("sha256");
    const sampleParts: Uint8Array[] = [];
    let sampled = 0;
    let byteSize = 0;
    const monitored = async function* (): AsyncGenerator<Uint8Array> {
      for await (const chunk of asAsyncBytes(request.bytes)) {
        const priorByteSize = byteSize;
        byteSize += chunk.byteLength;
        if (byteSize > declaredByteSize) {
          const remaining = declaredByteSize - priorByteSize;
          if (remaining > 0) yield chunk.subarray(0, remaining);
          return;
        }
        hash.update(chunk);
        if (sampled < SAMPLE_LIMIT) {
          const selected = chunk.slice(0, SAMPLE_LIMIT - sampled);
          sampleParts.push(selected);
          sampled += selected.byteLength;
        }
        yield chunk;
      }
    };

    let putEtag: string | undefined;
    try {
      const result = await this.#client.send(
        new PutObjectCommand({
          Bucket: this.#bucket,
          Key: stagingKey,
          Body: Readable.from(monitored()),
          ContentLength: declaredByteSize,
          ContentType: declaredMediaType,
          Metadata: { "petra-stage-id": stageId, "petra-state": "staging" },
        }),
      );
      putEtag = result.ETag;
    } catch (caught) {
      await this.#bestEffortDelete(stagingKey);
      throw caught;
    }

    const contentHash = `sha256:${hash.digest("hex")}`;
    if (byteSize !== declaredByteSize) {
      await this.#bestEffortDelete(stagingKey);
      throw error(
        "ARTIFACT_STORE_SIZE_MISMATCH",
        `Artifact stream produced ${byteSize} bytes, not its declared ${declaredByteSize}.`,
      );
    }
    if (
      expectedContentHash !== undefined &&
      contentHash !== expectedContentHash
    ) {
      await this.#bestEffortDelete(stagingKey);
      throw error(
        "ARTIFACT_STORE_HASH_MISMATCH",
        `Artifact stream hashes to ${contentHash}, not ${expectedContentHash}.`,
      );
    }
    let verification: ArtifactMediaTypeVerification;
    try {
      verification = verifyArtifactMediaType(
        declaredMediaType,
        sampleBytes(sampleParts, sampled),
      );
    } catch (caught) {
      await this.#bestEffortDelete(stagingKey);
      throw caught;
    }
    const stagedAt = this.#now().toISOString();
    const metadata = this.#objectMetadata({
      contentHash,
      byteSize,
      mediaType: declaredMediaType,
      availableAt: stagedAt,
      verification,
    });
    await this.#client.send(
      new CopyObjectCommand({
        Bucket: this.#bucket,
        Key: stagingKey,
        CopySource: copySource(this.#bucket, stagingKey),
        ...(putEtag === undefined ? {} : { CopySourceIfMatch: putEtag }),
        MetadataDirective: "REPLACE",
        ContentType: declaredMediaType,
        Metadata: {
          ...metadata,
          "petra-stage-id": stageId,
          "petra-state": "staging-verified",
        },
      }),
    );
    return {
      stageId,
      stagingKey,
      contentHash,
      byteSize,
      mediaType: declaredMediaType,
      stagedAt,
      verification,
    };
  }

  async makeAvailable(staged: StagedArtifact): Promise<AvailableArtifact> {
    const contentHash = normalizeHash(staged.contentHash);
    const byteSize = normalizeSize(staged.byteSize);
    const mediaType = normalizeMediaType(staged.mediaType);
    if (staged.stagingKey !== this.#stagingKey(staged.stageId)) {
      throw error(
        "ARTIFACT_STORE_OBJECT_INTEGRITY_INVALID",
        "The staged Artifact key is outside its exact Petra staging identity.",
      );
    }
    const finalKey = contentAddressedArtifactKey(contentHash);
    const existing = await this.inspectByHash(contentHash, {
      byteSize,
      mediaType,
    });
    if (existing !== undefined) {
      await this.#client.send(
        new DeleteObjectCommand({
          Bucket: this.#bucket,
          Key: staged.stagingKey,
        }),
      );
      return existing;
    }

    let stageHead;
    try {
      stageHead = await this.#client.send(
        new HeadObjectCommand({
          Bucket: this.#bucket,
          Key: staged.stagingKey,
        }),
      );
    } catch (caught) {
      if (isNotFound(caught)) {
        throw error(
          "ARTIFACT_STORE_STAGE_NOT_FOUND",
          `Artifact stage ${staged.stageId} is unavailable.`,
        );
      }
      throw caught;
    }
    const verifiedStage = this.#assertObjectMetadata(
      stageHead,
      { contentHash, byteSize, mediaType },
      "staging-verified",
    );
    const availableAt = this.#now().toISOString();
    await this.#client.send(
      new CopyObjectCommand({
        Bucket: this.#bucket,
        Key: finalKey,
        CopySource: copySource(this.#bucket, staged.stagingKey),
        ...(stageHead.ETag === undefined
          ? {}
          : { CopySourceIfMatch: stageHead.ETag }),
        MetadataDirective: "REPLACE",
        ContentType: mediaType,
        Metadata: {
          ...this.#objectMetadata({
            contentHash,
            byteSize,
            mediaType,
            availableAt,
            verification: verifiedStage.verification,
          }),
          "petra-state": "available",
        },
      }),
    );
    const available = await this.inspectByHash(contentHash, {
      byteSize,
      mediaType,
    });
    if (available === undefined) {
      throw error(
        "ARTIFACT_STORE_OBJECT_INTEGRITY_INVALID",
        "The content-addressed Artifact was not visible after publication.",
      );
    }
    await this.#client.send(
      new DeleteObjectCommand({ Bucket: this.#bucket, Key: staged.stagingKey }),
    );
    return available;
  }

  async inspectByHash(
    contentHash: string,
    expected?: Omit<ArtifactByteIdentity, "contentHash">,
  ): Promise<AvailableArtifact | undefined> {
    const normalizedHash = normalizeHash(contentHash);
    const key = contentAddressedArtifactKey(normalizedHash);
    let head;
    try {
      head = await this.#client.send(
        new HeadObjectCommand({ Bucket: this.#bucket, Key: key }),
      );
    } catch (caught) {
      if (isNotFound(caught)) return undefined;
      throw caught;
    }
    const metadata = this.#assertObjectMetadata(
      head,
      {
        contentHash: normalizedHash,
        ...(expected === undefined
          ? {
              byteSize: head.ContentLength ?? -1,
              mediaType: head.ContentType ?? "",
            }
          : {
              byteSize: normalizeSize(expected.byteSize),
              mediaType: normalizeMediaType(expected.mediaType),
            }),
      },
      "available",
    );
    return this.#available(key, metadata);
  }

  async readByHash(
    contentHash: string,
    expected?: Omit<ArtifactByteIdentity, "contentHash">,
  ): Promise<ArtifactRead> {
    const normalizedHash = normalizeHash(contentHash);
    const key = contentAddressedArtifactKey(normalizedHash);
    let result;
    try {
      result = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
      );
    } catch (caught) {
      if (isNotFound(caught)) {
        throw error(
          "ARTIFACT_STORE_OBJECT_NOT_FOUND",
          `No available Artifact has content hash ${normalizedHash}.`,
        );
      }
      throw caught;
    }
    const metadata = this.#assertObjectMetadata(
      result,
      {
        contentHash: normalizedHash,
        ...(expected === undefined
          ? {
              byteSize: result.ContentLength ?? -1,
              mediaType: result.ContentType ?? "",
            }
          : {
              byteSize: normalizeSize(expected.byteSize),
              mediaType: normalizeMediaType(expected.mediaType),
            }),
      },
      "available",
    );
    const source = bodyAsBytes(result.Body);
    const verified = async function* (): AsyncGenerator<Uint8Array> {
      const hash = createHash("sha256");
      let byteSize = 0;
      for await (const chunk of source) {
        if (!(chunk instanceof Uint8Array)) {
          throw error(
            "ARTIFACT_STORE_STREAM_INVALID",
            "The object store returned a non-byte stream chunk.",
          );
        }
        hash.update(chunk);
        byteSize += chunk.byteLength;
        yield chunk;
      }
      const observedHash = `sha256:${hash.digest("hex")}`;
      if (
        observedHash !== metadata.contentHash ||
        byteSize !== metadata.byteSize
      ) {
        throw error(
          "ARTIFACT_STORE_OBJECT_INTEGRITY_INVALID",
          `Read Artifact produced ${observedHash}/${byteSize}, expected ${metadata.contentHash}/${metadata.byteSize}.`,
        );
      }
    };
    return { artifact: this.#available(key, metadata), bytes: verified() };
  }

  async deleteByHash(
    contentHash: string,
    expected: Omit<ArtifactByteIdentity, "contentHash">,
  ): Promise<ArtifactDeletionResult> {
    const normalizedHash = normalizeHash(contentHash);
    const exact = {
      byteSize: normalizeSize(expected.byteSize),
      mediaType: normalizeMediaType(expected.mediaType),
    };
    const artifact = await this.inspectByHash(normalizedHash, exact);
    if (artifact === undefined) return { state: "not_found" };
    await this.#client.send(
      new DeleteObjectCommand({
        Bucket: this.#bucket,
        Key: artifact.objectKey,
      }),
    );
    if ((await this.inspectByHash(normalizedHash, exact)) !== undefined) {
      throw error(
        "ARTIFACT_STORE_OBJECT_INTEGRITY_INVALID",
        "The exact content-addressed Artifact remained visible after deletion.",
      );
    }
    return { state: "deleted", artifact };
  }

  async cleanupAbandonedStaging(
    olderThan: string,
    limit = 1000,
  ): Promise<ArtifactStagingCleanupResult> {
    const cutoff = new Date(olderThan);
    if (Number.isNaN(cutoff.getTime())) {
      throw new TypeError(
        "Artifact staging cleanup requires an ISO timestamp.",
      );
    }
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new RangeError("Artifact staging cleanup limit must be 1 to 1000.");
    }
    const prefix = `${this.#namespace}/staging/`;
    const listed = await this.#client.send(
      new ListObjectsV2Command({
        Bucket: this.#bucket,
        Prefix: prefix,
        MaxKeys: limit,
      }),
    );
    const deletedStageIds: string[] = [];
    const retainedStageIds: string[] = [];
    for (const object of listed.Contents ?? []) {
      const key = object.Key;
      if (key === undefined || !key.startsWith(prefix)) continue;
      const stageId = key.slice(prefix.length);
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(stageId)) continue;
      if (object.LastModified !== undefined && object.LastModified < cutoff) {
        await this.#client.send(
          new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }),
        );
        deletedStageIds.push(stageId);
      } else {
        retainedStageIds.push(stageId);
      }
    }
    return {
      inspected: deletedStageIds.length + retainedStageIds.length,
      deletedStageIds,
      retainedStageIds,
    };
  }

  #stagingKey(stageId: string): string {
    return `${this.#namespace}/staging/${stageId}`;
  }

  #objectMetadata(metadata: StoredMetadata): Record<string, string> {
    return {
      "petra-content-sha256": metadata.contentHash.slice("sha256:".length),
      "petra-byte-size": String(metadata.byteSize),
      "petra-media-type": metadata.mediaType,
      "petra-available-at": metadata.availableAt,
      "petra-verification-status": metadata.verification.status,
      "petra-verification-method": metadata.verification.method,
      ...(metadata.verification.observedMediaType === undefined
        ? {}
        : {
            "petra-observed-media-type":
              metadata.verification.observedMediaType,
          }),
    };
  }

  #assertObjectMetadata(
    object: {
      ContentLength?: number | undefined;
      ContentType?: string | undefined;
      Metadata?: Record<string, string> | undefined;
    },
    expected: ArtifactByteIdentity,
    state: "staging-verified" | "available",
  ): StoredMetadata {
    const metadata = object.Metadata ?? {};
    const actualHash = `sha256:${metadata["petra-content-sha256"] ?? ""}`;
    const actualSize = Number(metadata["petra-byte-size"]);
    const actualMediaType = metadata["petra-media-type"] ?? "";
    const availableAt = metadata["petra-available-at"] ?? "";
    const status = metadata["petra-verification-status"];
    const method = metadata["petra-verification-method"];
    if (
      metadata["petra-state"] !== state ||
      actualHash !== expected.contentHash ||
      actualSize !== expected.byteSize ||
      actualMediaType !== expected.mediaType ||
      object.ContentLength !== expected.byteSize ||
      object.ContentType !== expected.mediaType ||
      Number.isNaN(new Date(availableAt).getTime()) ||
      !["verified", "verified_with_warnings"].includes(status ?? "") ||
      method === undefined
    ) {
      throw error(
        "ARTIFACT_STORE_OBJECT_INTEGRITY_INVALID",
        `Object metadata does not reproduce ${expected.contentHash}/${expected.byteSize}/${expected.mediaType}.`,
      );
    }
    return {
      contentHash: actualHash,
      byteSize: actualSize,
      mediaType: actualMediaType,
      availableAt,
      verification: {
        status: status as ArtifactMediaTypeVerification["status"],
        declaredMediaType: actualMediaType,
        ...(metadata["petra-observed-media-type"] === undefined
          ? {}
          : { observedMediaType: metadata["petra-observed-media-type"] }),
        method,
        problems:
          status === "verified_with_warnings"
            ? ["The stored object retained a media-verification warning."]
            : [],
      },
    };
  }

  #available(key: string, metadata: StoredMetadata): AvailableArtifact {
    return {
      storeName: this.#storeName,
      objectKey: key,
      contentHash: metadata.contentHash,
      byteSize: metadata.byteSize,
      mediaType: metadata.mediaType,
      availableAt: metadata.availableAt,
      verification: metadata.verification,
    };
  }

  async #bestEffortDelete(key: string): Promise<void> {
    try {
      await this.#client.send(
        new DeleteObjectCommand({ Bucket: this.#bucket, Key: key }),
      );
    } catch {
      // A bounded cleanup pass owns residue that cannot be removed here.
    }
  }
}
