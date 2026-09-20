import { createHash } from "node:crypto";

import type {
  ArtifactStore,
  AvailableArtifact,
  StagedArtifact,
} from "@petra/core";

export const availableArtifactStore: Pick<ArtifactStore, "inspectByHash"> = {
  inspectByHash: (contentHash, expected) => {
    if (expected === undefined) {
      throw new Error(
        "The PostgreSQL boundary must inspect an exact identity.",
      );
    }
    const hex = contentHash.slice("sha256:".length);
    return Promise.resolve({
      storeName: "petra-local",
      objectKey: `sha256/${hex.slice(0, 2)}/${hex.slice(2)}`,
      contentHash,
      byteSize: expected.byteSize,
      mediaType: expected.mediaType,
      availableAt: "2026-08-28T18:10:00.000Z",
      verification: {
        status: "verified",
        declaredMediaType: expected.mediaType,
        observedMediaType: expected.mediaType,
        method: "test-fixture",
        problems: [],
      },
    });
  },
};

export const createMemoryArtifactStore = (): ArtifactStore => {
  const staged = new Map<
    string,
    { bytes: Uint8Array; value: StagedArtifact }
  >();
  const available = new Map<
    string,
    { bytes: Uint8Array; value: AvailableArtifact }
  >();
  let sequence = 0;
  return {
    async stage(request) {
      const parts: Uint8Array[] = [];
      let byteSize = 0;
      for await (const part of request.bytes) {
        const copy = part.slice();
        parts.push(copy);
        byteSize += copy.byteLength;
      }
      const bytes = new Uint8Array(byteSize);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      const contentHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      if (
        byteSize !== request.declaredByteSize ||
        (request.expectedContentHash !== undefined &&
          request.expectedContentHash !== contentHash)
      ) {
        throw new Error(
          "The in-memory ArtifactStore received mismatched bytes.",
        );
      }
      sequence += 1;
      const value: StagedArtifact = {
        stageId: `stage-${sequence}`,
        stagingKey: `staging/stage-${sequence}`,
        stagedAt: "2026-09-04T02:30:00.000Z",
        contentHash,
        byteSize,
        mediaType: request.declaredMediaType,
        verification: {
          status: "verified",
          declaredMediaType: request.declaredMediaType,
          observedMediaType: request.declaredMediaType,
          method: "test-fixture",
          problems: [],
        },
      };
      staged.set(value.stageId, { bytes, value });
      return structuredClone(value);
    },
    makeAvailable(input) {
      const pending = staged.get(input.stageId);
      if (pending === undefined) throw new Error("Unknown staged artifact.");
      const prior = available.get(input.contentHash);
      if (prior !== undefined) {
        return Promise.resolve(structuredClone(prior.value));
      }
      const hex = input.contentHash.slice("sha256:".length);
      const value: AvailableArtifact = {
        storeName: "petra-memory",
        objectKey: `sha256/${hex.slice(0, 2)}/${hex.slice(2)}`,
        contentHash: input.contentHash,
        byteSize: input.byteSize,
        mediaType: input.mediaType,
        availableAt: "2026-09-04T02:30:01.000Z",
        verification: structuredClone(input.verification),
      };
      available.set(value.contentHash, { bytes: pending.bytes, value });
      staged.delete(input.stageId);
      return Promise.resolve(structuredClone(value));
    },
    inspectByHash(contentHash, expected) {
      const entry = available.get(contentHash);
      if (
        entry === undefined ||
        (expected !== undefined &&
          (expected.byteSize !== entry.value.byteSize ||
            expected.mediaType !== entry.value.mediaType))
      ) {
        return Promise.resolve(undefined);
      }
      return Promise.resolve(structuredClone(entry.value));
    },
    async readByHash(contentHash, expected) {
      const value = await this.inspectByHash(contentHash, expected);
      const entry = available.get(contentHash);
      if (value === undefined || entry === undefined) {
        throw new Error("Unknown available artifact.");
      }
      const bytes = entry.bytes.slice();
      return {
        artifact: value,
        bytes: (async function* () {
          await Promise.resolve();
          yield bytes;
        })(),
      };
    },
    deleteByHash(contentHash, expected) {
      const entry = available.get(contentHash);
      if (
        entry === undefined ||
        expected.byteSize !== entry.value.byteSize ||
        expected.mediaType !== entry.value.mediaType
      ) {
        return Promise.resolve({ state: "not_found" as const });
      }
      available.delete(contentHash);
      return Promise.resolve({
        state: "deleted" as const,
        artifact: structuredClone(entry.value),
      });
    },
    cleanupAbandonedStaging() {
      const deletedStageIds = [...staged.keys()];
      staged.clear();
      return Promise.resolve({
        inspected: deletedStageIds.length,
        deletedStageIds,
        retainedStageIds: [],
      });
    },
  };
};
