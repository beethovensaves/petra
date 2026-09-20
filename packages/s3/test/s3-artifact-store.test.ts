import { createHash } from "node:crypto";

import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  S3ArtifactStore,
  contentAddressedArtifactKey,
  verifyArtifactMediaType,
} from "../src/s3-artifact-store.js";

const hash = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const chunks = function* (bytes: Uint8Array): Generator<Uint8Array> {
  yield bytes.subarray(0, 3);
  yield bytes.subarray(3);
};

const consume = async (stream: AsyncIterable<Uint8Array>) => {
  const parts: Uint8Array[] = [];
  let size = 0;
  for await (const part of stream) {
    parts.push(part);
    size += part.byteLength;
  }
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.byteLength;
  }
  return combined;
};

describe("ArtifactStore deterministic validation", () => {
  it("derives stable content-addressed keys", () => {
    expect(contentAddressedArtifactKey(`sha256:${"a".repeat(64)}`)).toBe(
      `sha256/aa/${"a".repeat(62)}`,
    );
    expect(() => contentAddressedArtifactKey("sha256:not-a-hash")).toThrowError(
      expect.objectContaining({ code: "ARTIFACT_STORE_HASH_INVALID" }),
    );
  });

  it("verifies registered signatures and refuses a conflicting declaration", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\nfixture");
    expect(verifyArtifactMediaType("application/pdf", pdf)).toEqual(
      expect.objectContaining({
        status: "verified",
        observedMediaType: "application/pdf",
      }),
    );
    expect(
      verifyArtifactMediaType(
        "application/json",
        new TextEncoder().encode('  {"petra":true}'),
      ),
    ).toEqual(
      expect.objectContaining({
        status: "verified",
        method: "structured-prefix",
      }),
    );
    expect(() => verifyArtifactMediaType("image/png", pdf)).toThrowError(
      expect.objectContaining({
        code: "ARTIFACT_STORE_MEDIA_TYPE_MISMATCH",
      }),
    );
  });

  it("preserves the exact UTF-8 Markdown media type used by grounded responses", () => {
    const markdown = new TextEncoder().encode(
      "H01 — A bounded scientific response.\n",
    );
    expect(
      verifyArtifactMediaType("text/markdown; charset=utf-8", markdown),
    ).toEqual({
      status: "verified",
      declaredMediaType: "text/markdown; charset=utf-8",
      observedMediaType: "text/markdown; charset=utf-8",
      method: "utf-8-sample",
      problems: [],
    });
    expect(() =>
      verifyArtifactMediaType("text/markdown; charset=us-ascii", markdown),
    ).toThrowError(
      expect.objectContaining({ code: "ARTIFACT_STORE_MEDIA_TYPE_INVALID" }),
    );
  });
});

const endpoint = process.env.PETRA_TEST_S3_ENDPOINT;
const describeS3 = endpoint === undefined ? describe.skip : describe;

describeS3("SeaweedFS S3-compatible ArtifactStore", () => {
  const bucket = process.env.PETRA_TEST_S3_BUCKET ?? "petra-m12-artifacts";
  const client = new S3Client({
    region: "us-east-1",
    endpoint: endpoint ?? "http://127.0.0.1:1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.PETRA_TEST_S3_ACCESS_KEY ?? "petra-m12-access",
      secretAccessKey:
        process.env.PETRA_TEST_S3_SECRET_KEY ?? "petra-m12-secret",
    },
  });
  let stageCounter = 0;
  const store = new S3ArtifactStore({
    client,
    bucket,
    storeName: "petra-test",
    namespace: "petra-test",
    now: () => new Date("2026-09-02T18:00:00.000Z"),
    createStageId: () => `stage-${++stageCounter}`,
  });

  beforeAll(async () => {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (caught) {
      if (
        typeof caught !== "object" ||
        caught === null ||
        !["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(
          String((caught as { name?: unknown }).name),
        )
      ) {
        throw caught;
      }
    }
  });

  afterAll(async () => {
    let continuationToken: string | undefined;
    do {
      const listed = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ...(continuationToken === undefined
            ? {}
            : { ContinuationToken: continuationToken }),
        }),
      );
      const objects = (listed.Contents ?? []).flatMap((object) =>
        object.Key === undefined ? [] : [{ Key: object.Key }],
      );
      if (objects.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objects, Quiet: true },
          }),
        );
      }
      continuationToken = listed.NextContinuationToken;
    } while (continuationToken !== undefined);
    await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    client.destroy();
  });

  it("streams, verifies, publishes, reads, and deduplicates exact bytes", async () => {
    const bytes = new TextEncoder().encode(
      "%PDF-1.7\nPetra artifact fixture\n",
    );
    const contentHash = hash(bytes);
    const staged = await store.stage({
      bytes: chunks(bytes),
      declaredByteSize: bytes.byteLength,
      declaredMediaType: "application/pdf",
      expectedContentHash: contentHash,
    });
    expect(staged).toEqual(
      expect.objectContaining({
        contentHash,
        byteSize: bytes.byteLength,
        mediaType: "application/pdf",
      }),
    );
    const available = await store.makeAvailable(staged);
    expect(available.objectKey).toBe(contentAddressedArtifactKey(contentHash));
    expect(
      await store.inspectByHash(contentHash, {
        byteSize: bytes.byteLength,
        mediaType: "application/pdf",
      }),
    ).toEqual(available);
    await expect(
      client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: staged.stagingKey }),
      ),
    ).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });

    const read = await store.readByHash(contentHash);
    expect(await consume(read.bytes)).toEqual(bytes);

    const duplicateStage = await store.stage({
      bytes: chunks(bytes),
      declaredByteSize: bytes.byteLength,
      declaredMediaType: "application/pdf",
    });
    expect(await store.makeAvailable(duplicateStage)).toEqual(available);
    await expect(
      client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: duplicateStage.stagingKey,
        }),
      ),
    ).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });

    await expect(
      store.deleteByHash(contentHash, {
        byteSize: bytes.byteLength,
        mediaType: "application/pdf",
      }),
    ).resolves.toEqual({ state: "deleted", artifact: available });
    await expect(
      store.inspectByHash(contentHash, {
        byteSize: bytes.byteLength,
        mediaType: "application/pdf",
      }),
    ).resolves.toBeUndefined();
    await expect(
      store.deleteByHash(contentHash, {
        byteSize: bytes.byteLength,
        mediaType: "application/pdf",
      }),
    ).resolves.toEqual({ state: "not_found" });
  });

  it("publishes grounded-response Markdown with its exact charset identity", async () => {
    const bytes = new TextEncoder().encode(
      "H01 — A bounded response backed by exact evidence references.\n",
    );
    const staged = await store.stage({
      bytes: chunks(bytes),
      declaredByteSize: bytes.byteLength,
      declaredMediaType: "text/markdown; charset=utf-8",
      expectedContentHash: hash(bytes),
    });
    const available = await store.makeAvailable(staged);
    expect(available.mediaType).toBe("text/markdown; charset=utf-8");
    expect(available.verification.status).toBe("verified");
    expect(available.verification.observedMediaType).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(
      await store.inspectByHash(available.contentHash, {
        byteSize: bytes.byteLength,
        mediaType: "text/markdown; charset=utf-8",
      }),
    ).toEqual(available);
  });

  it("removes failed staging writes and never publishes mismatched identity", async () => {
    const bytes = new TextEncoder().encode('{"candidate":true}');
    await expect(
      store.stage({
        bytes: chunks(bytes),
        declaredByteSize: bytes.byteLength,
        declaredMediaType: "application/json",
        expectedContentHash: `sha256:${"0".repeat(64)}`,
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "ARTIFACT_STORE_HASH_MISMATCH" }),
    );
    await expect(
      store.stage({
        bytes: chunks(bytes),
        declaredByteSize: bytes.byteLength - 1,
        declaredMediaType: "application/json",
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "ARTIFACT_STORE_SIZE_MISMATCH" }),
    );
    await expect(
      store.stage({
        bytes: chunks(bytes),
        declaredByteSize: bytes.byteLength + 1,
        declaredMediaType: "application/json",
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "ARTIFACT_STORE_SIZE_MISMATCH" }),
    );
    await expect(
      store.stage({
        bytes: chunks(bytes),
        declaredByteSize: bytes.byteLength,
        declaredMediaType: "application/pdf",
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: "ARTIFACT_STORE_MEDIA_TYPE_MISMATCH" }),
    );
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "petra-test/staging/",
      }),
    );
    expect(listed.Contents ?? []).toHaveLength(0);
    expect(await store.inspectByHash(hash(bytes))).toBe(undefined);
  });

  it("publishes only the verification state recovered from staged metadata", async () => {
    const bytes = new Uint8Array([0, 1, 2, 3]);
    const staged = await store.stage({
      bytes: chunks(bytes),
      declaredByteSize: bytes.byteLength,
      declaredMediaType: "application/octet-stream",
    });
    expect(staged.verification.status).toBe("verified_with_warnings");

    staged.verification = {
      status: "verified",
      declaredMediaType: "application/octet-stream",
      observedMediaType: "application/octet-stream",
      method: "caller-tampered",
      problems: [],
    };
    const available = await store.makeAvailable(staged);
    expect(available.verification).toEqual(
      expect.objectContaining({
        status: "verified_with_warnings",
        method: "no-deterministic-signature",
      }),
    );
  });

  it("bounds abandoned-stage cleanup and cannot delete final content addresses", async () => {
    const abandoned = "petra-test/staging/abandoned";
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: abandoned,
        Body: new Uint8Array([1]),
        ContentLength: 1,
      }),
    );
    const cleaned = await store.cleanupAbandonedStaging(
      "2099-01-01T00:00:00.000Z",
    );
    expect(cleaned.deletedStageIds).toContain("abandoned");

    const retained = "petra-test/staging/current";
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: retained,
        Body: new Uint8Array([2]),
        ContentLength: 1,
      }),
    );
    expect(
      await store.cleanupAbandonedStaging("2000-01-01T00:00:00.000Z"),
    ).toEqual({
      inspected: 1,
      deletedStageIds: [],
      retainedStageIds: ["current"],
    });
    expect(
      await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: retained }),
      ),
    ).toEqual(expect.objectContaining({ ContentLength: 1 }));
  });

  it("fails closed for missing or externally corrupted content addresses", async () => {
    await expect(store.readByHash(`sha256:${"1".repeat(64)}`)).rejects.toEqual(
      expect.objectContaining({ code: "ARTIFACT_STORE_OBJECT_NOT_FOUND" }),
    );
    const corruptHash = `sha256:${"2".repeat(64)}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: contentAddressedArtifactKey(corruptHash),
        Body: new Uint8Array([1, 2, 3]),
        ContentLength: 3,
        ContentType: "application/pdf",
      }),
    );
    await expect(store.inspectByHash(corruptHash)).rejects.toEqual(
      expect.objectContaining({
        code: "ARTIFACT_STORE_OBJECT_INTEGRITY_INVALID",
      }),
    );
  });
});
