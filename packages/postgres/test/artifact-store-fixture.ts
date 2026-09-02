import type { ArtifactStore } from "@petra/core";

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
