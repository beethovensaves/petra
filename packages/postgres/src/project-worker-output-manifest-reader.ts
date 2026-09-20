import { createHash } from "node:crypto";

import type { PetraWorkerOutputManifest } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ProjectWorkerOutputManifestReader,
  ProjectWorkerOutputManifestRequest,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool } from "pg";

const PROJECT_ID = /^project_[0-9A-HJKMNP-TV-Z]{26}$/u;
const MANIFEST_ID = /^worker_output_manifest_[0-9A-HJKMNP-TV-Z]{26}$/u;
const HASH = /^sha256:[0-9a-f]{64}$/u;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

export class PostgresProjectWorkerOutputManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostgresProjectWorkerOutputManifestError";
  }
}

/**
 * Reads one immutable WorkerOutputManifest by its complete stored identity.
 * The route owner supplies Project authorization; this reader neither promotes
 * staged outputs nor treats the manifest identity as a WorkUnit identity.
 */
export class PostgresProjectWorkerOutputManifestReader implements ProjectWorkerOutputManifestReader {
  constructor(
    private readonly pool: Pool,
    private readonly contracts = new PetraContractRegistry(),
  ) {}

  async getProjectWorkerOutputManifest(
    projectId: string,
    workerOutputManifestId: string,
    request: ProjectWorkerOutputManifestRequest,
  ): Promise<PetraWorkerOutputManifest | undefined> {
    if (
      !PROJECT_ID.test(projectId) ||
      !MANIFEST_ID.test(workerOutputManifestId) ||
      !Number.isSafeInteger(request.revision) ||
      request.revision < 1 ||
      !HASH.test(request.content_hash) ||
      !HASH.test(request.record_hash)
    ) {
      throw new PostgresProjectWorkerOutputManifestError(
        "An exact WorkerOutputManifest read requires canonical Project, manifest, revision, and hash identities.",
      );
    }
    const result = await this.pool.query<{
      payload: unknown;
      record_hash: string;
    }>(
      `SELECT payload, record_hash
         FROM petra.worker_output_manifests
        WHERE project_id = $1
          AND worker_output_manifest_id = $2
          AND revision = $3
          AND content_hash = $4
          AND record_hash = $5`,
      [
        projectId,
        workerOutputManifestId,
        request.revision,
        request.content_hash,
        request.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    this.contracts.assertValid("worker-output-manifest", "1.0.0", row.payload);
    const manifest = row.payload as PetraWorkerOutputManifest;
    if (
      manifest.project_id !== projectId ||
      manifest.worker_output_manifest_id !== workerOutputManifestId ||
      manifest.revision !== request.revision ||
      manifest.content_hash !== request.content_hash ||
      canonicalHash(manifest.content) !== manifest.content_hash ||
      row.record_hash !== request.record_hash ||
      canonicalHash(manifest) !== row.record_hash
    ) {
      throw new PostgresProjectWorkerOutputManifestError(
        "The retained WorkerOutputManifest failed its exact Project or hash authority checks.",
      );
    }
    return structuredClone(manifest);
  }
}
