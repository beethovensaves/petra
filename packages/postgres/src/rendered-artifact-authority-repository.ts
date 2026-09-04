import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraArtifact,
  PetraRenderedArtifact,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { RenderedArtifactAuthorityRepository } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type RenderedArtifactPersistenceErrorCode =
  | "RENDERED_ARTIFACT_ID_CONFLICT"
  | "RENDERED_ARTIFACT_SLOT_CONFLICT"
  | "RENDERED_ARTIFACT_REFERENCE_MISSING"
  | "RENDERED_ARTIFACT_REFERENCE_MISMATCH"
  | "RENDERED_ARTIFACT_STORED_RECORD_CORRUPT";

export class RenderedArtifactPersistenceError extends Error {
  readonly code: RenderedArtifactPersistenceErrorCode;

  constructor(code: RenderedArtifactPersistenceErrorCode, message: string) {
    super(message);
    this.name = "RenderedArtifactPersistenceError";
    this.code = code;
  }
}

interface StoredRecordRow {
  record_hash: string;
  payload: unknown;
}

interface ReferenceRow extends StoredRecordRow {
  project_id?: string;
  draft_artifact_id?: string;
  draft_artifact_revision?: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

export class PostgresRenderedArtifactAuthorityRepository implements RenderedArtifactAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async register(
    record: PetraRenderedArtifact,
  ): Promise<PetraRenderedArtifact> {
    this.#assertCandidate(record);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `rendered-artifact:${record.rendered_artifact_id}`,
        [
          "rendered-slot",
          record.draft_ref.draft_artifact_id,
          record.draft_ref.revision,
          record.content.format,
          record.content.renderer.name,
          record.content.renderer.version,
          record.content.renderer.content_hash,
        ].join(":"),
      ]);

      const existing = await this.#select(
        client,
        record.rendered_artifact_id,
        record.revision,
      );
      if (existing !== undefined) {
        const stored = this.#storedRecord(existing);
        if (!same(stored, record)) {
          throw new RenderedArtifactPersistenceError(
            "RENDERED_ARTIFACT_ID_CONFLICT",
            "The RenderedArtifact identity is already bound to different canonical content.",
          );
        }
        return stored;
      }

      const slot = await client.query<{ rendered_artifact_id: string }>(
        `SELECT rendered_artifact_id
           FROM petra.rendered_artifacts
          WHERE draft_artifact_id = $1
            AND draft_artifact_revision = $2
            AND render_format = $3
            AND renderer_name = $4
            AND renderer_version = $5
            AND renderer_hash = $6`,
        [
          record.draft_ref.draft_artifact_id,
          record.draft_ref.revision,
          record.content.format,
          record.content.renderer.name,
          record.content.renderer.version,
          record.content.renderer.content_hash,
        ],
      );
      if (slot.rows[0] !== undefined) {
        throw new RenderedArtifactPersistenceError(
          "RENDERED_ARTIFACT_SLOT_CONFLICT",
          `The exact draft, format, and renderer profile are already represented by ${slot.rows[0].rendered_artifact_id}.`,
        );
      }

      await this.#requireReferences(client, record);
      await client.query(
        `INSERT INTO petra.rendered_artifacts (
           rendered_artifact_id, revision, project_id,
           draft_artifact_id, draft_artifact_revision, draft_content_hash,
           citation_bundle_id, citation_bundle_revision, citation_bundle_hash,
           render_format, content_scope,
           renderer_name, renderer_version, renderer_hash,
           output_artifact_id, output_artifact_revision, output_artifact_hash,
           output_byte_size, output_media_type, semantic_content_hash,
           warning_count, transformation_count,
           rendered_by_actor_id, rendered_by_actor_kind, rendered_at,
           content_hash, record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
           $21, $22, $23, $24, $25, $26, $27, $28::jsonb
         )`,
        [
          record.rendered_artifact_id,
          record.revision,
          record.project_id,
          record.draft_ref.draft_artifact_id,
          record.draft_ref.revision,
          record.draft_ref.content_hash,
          record.citation_bundle_ref.citation_bundle_id,
          record.citation_bundle_ref.revision,
          record.citation_bundle_ref.content_hash,
          record.content.format,
          record.content.content_scope,
          record.content.renderer.name,
          record.content.renderer.version,
          record.content.renderer.content_hash,
          record.content.output_artifact_ref.artifact_id,
          record.content.output_artifact_ref.revision,
          record.content.output_artifact_ref.content_hash,
          record.content.output_artifact_ref.byte_size,
          record.content.output_artifact_ref.media_type,
          record.content.semantic_content_hash,
          record.content.warnings.length,
          record.content.transformations.length,
          record.rendered_by.actor_id,
          record.rendered_by.actor_kind,
          record.rendered_at,
          record.content_hash,
          canonicalHash(record),
          JSON.stringify(record),
        ],
      );
      return clone(record);
    });
  }

  async get(
    renderedArtifactId: string,
    revision = 1,
  ): Promise<PetraRenderedArtifact | undefined> {
    const client = await this.#pool.connect();
    try {
      const row = await this.#select(client, renderedArtifactId, revision);
      return row === undefined ? undefined : this.#storedRecord(row);
    } finally {
      client.release();
    }
  }

  async getForDraft(
    draftArtifactId: string,
    draftRevision: number,
  ): Promise<readonly PetraRenderedArtifact[]> {
    const result = await this.#pool.query<StoredRecordRow>(
      `SELECT record_hash, payload
         FROM petra.rendered_artifacts
        WHERE draft_artifact_id = $1 AND draft_artifact_revision = $2
        ORDER BY CASE render_format
                   WHEN 'markdown' THEN 1
                   WHEN 'latex' THEN 2
                   WHEN 'bibtex' THEN 3
                 END,
                 rendered_artifact_id`,
      [draftArtifactId, draftRevision],
    );
    return result.rows.map((row) => this.#storedRecord(row));
  }

  #assertCandidate(record: PetraRenderedArtifact): void {
    this.#contracts.assertValid(
      "rendered-artifact",
      record.schema_version,
      record,
    );
    if (
      record.content_hash !== canonicalHash(record.content) ||
      record.content.semantic_content_hash !== record.draft_ref.content_hash
    ) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_REFERENCE_MISMATCH",
        "The RenderedArtifact content or semantic hash does not match its exact draft lineage.",
      );
    }
  }

  async #requireReferences(
    client: PoolClient,
    record: PetraRenderedArtifact,
  ): Promise<void> {
    const draft = await client.query<ReferenceRow>(
      `SELECT project_id, record_hash, payload
         FROM petra.draft_artifact_revisions
        WHERE draft_artifact_id = $1
          AND revision = $2
          AND project_id = $3
          AND content_hash = $4`,
      [
        record.draft_ref.draft_artifact_id,
        record.draft_ref.revision,
        record.project_id,
        record.draft_ref.content_hash,
      ],
    );
    if (draft.rows[0] === undefined) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_REFERENCE_MISSING",
        "The exact durable DraftArtifact revision is not available.",
      );
    }
    this.#assertStoredReference(draft.rows[0], "DraftArtifact");

    const citation = await client.query<ReferenceRow>(
      `SELECT project_id, draft_artifact_id,
              draft_artifact_revision::text, record_hash, payload
         FROM petra.citation_bundles
        WHERE citation_bundle_id = $1
          AND revision = $2
          AND project_id = $3
          AND draft_artifact_id = $4
          AND draft_artifact_revision = $5
          AND draft_content_hash = $6
          AND content_hash = $7`,
      [
        record.citation_bundle_ref.citation_bundle_id,
        record.citation_bundle_ref.revision,
        record.project_id,
        record.draft_ref.draft_artifact_id,
        record.draft_ref.revision,
        record.draft_ref.content_hash,
        record.citation_bundle_ref.content_hash,
      ],
    );
    if (citation.rows[0] === undefined) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_REFERENCE_MISSING",
        "The exact durable CitationBundle is not available for this draft.",
      );
    }
    this.#assertStoredReference(citation.rows[0], "CitationBundle");

    const output = record.content.output_artifact_ref;
    const artifact = await client.query<StoredRecordRow>(
      `SELECT record_hash, payload
         FROM petra.artifacts
        WHERE artifact_id = $1
          AND revision = $2
          AND content_hash = $3
          AND byte_size = $4
          AND media_type = $5`,
      [
        output.artifact_id,
        output.revision,
        output.content_hash,
        output.byte_size,
        output.media_type,
      ],
    );
    if (artifact.rows[0] === undefined) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_REFERENCE_MISSING",
        "RenderedArtifact authority requires its exact verified output Artifact first.",
      );
    }
    const artifactRecord = this.#storedArtifact(artifact.rows[0]);
    if (
      artifactRecord.artifact_kind !== "export" ||
      !same(artifactRecord.created_by, record.rendered_by)
    ) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_REFERENCE_MISMATCH",
        "The output must be an export Artifact created by the exact rendering service.",
      );
    }

    const actor = await client.query<{ actor_kind: ActorRef["actor_kind"] }>(
      "SELECT actor_kind FROM petra.actors WHERE actor_id = $1",
      [record.rendered_by.actor_id],
    );
    if (actor.rows[0]?.actor_kind !== record.rendered_by.actor_kind) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_REFERENCE_MISSING",
        "The exact rendering service Actor is not registered.",
      );
    }
  }

  #assertStoredReference(row: StoredRecordRow, label: string): void {
    if (canonicalHash(row.payload) !== row.record_hash) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_STORED_RECORD_CORRUPT",
        `${label} no longer matches its canonical stored hash.`,
      );
    }
  }

  #storedArtifact(row: StoredRecordRow): PetraArtifact {
    this.#assertStoredReference(row, "Artifact");
    this.#contracts.assertValid("artifact", "1.0.0", row.payload);
    return clone(row.payload as PetraArtifact);
  }

  #storedRecord(row: StoredRecordRow): PetraRenderedArtifact {
    if (canonicalHash(row.payload) !== row.record_hash) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_STORED_RECORD_CORRUPT",
        "The stored RenderedArtifact no longer matches its canonical hash.",
      );
    }
    this.#contracts.assertValid("rendered-artifact", "1.0.0", row.payload);
    const record = row.payload as PetraRenderedArtifact;
    if (record.content_hash !== canonicalHash(record.content)) {
      throw new RenderedArtifactPersistenceError(
        "RENDERED_ARTIFACT_STORED_RECORD_CORRUPT",
        "The stored RenderedArtifact content hash is invalid.",
      );
    }
    return clone(record);
  }

  async #select(
    client: PoolClient,
    renderedArtifactId: string,
    revision: number,
  ): Promise<StoredRecordRow | undefined> {
    const result = await client.query<StoredRecordRow>(
      `SELECT record_hash, payload
         FROM petra.rendered_artifacts
        WHERE rendered_artifact_id = $1 AND revision = $2`,
      [renderedArtifactId, revision],
    );
    return result.rows[0];
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
