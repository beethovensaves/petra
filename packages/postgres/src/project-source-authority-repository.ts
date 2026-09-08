import { createHash } from "node:crypto";

import type { PetraProjectSource } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectSourceAuthorityRepository } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectSourceErrorCode =
  | "PROJECT_SOURCE_CONTENT_HASH_MISMATCH"
  | "PROJECT_SOURCE_ID_CONFLICT"
  | "PROJECT_SOURCE_REVISION_CONFLICT"
  | "PROJECT_SOURCE_REVISION_GAP"
  | "PROJECT_SOURCE_RELATION_INVALID"
  | "PROJECT_SOURCE_AUTHORS_INVALID"
  | "PROJECT_SOURCE_STORED_RECORD_CORRUPT";

export class PostgresProjectSourceError extends Error {
  readonly code: PostgresProjectSourceErrorCode;

  constructor(code: PostgresProjectSourceErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectSourceError";
    this.code = code;
  }
}

interface HeadRow {
  project_id: string;
  artifact_manifest_id: string;
  current_revision: string;
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface PgError {
  code?: string;
  constraint?: string;
  message?: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

export class PostgresProjectSourceAuthorityRepository implements ProjectSourceAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerProjectSourceRevision(
    source: PetraProjectSource,
  ): Promise<PetraProjectSource> {
    this.#contracts.assertValid("project-source", "1.0.0", source);
    if (source.content_hash !== canonicalHash(source.content)) {
      throw new PostgresProjectSourceError(
        "PROJECT_SOURCE_CONTENT_HASH_MISMATCH",
        "ProjectSource content_hash does not identify its exact content.",
      );
    }
    const authorIds = source.content.author_refs.map((ref) => ref.author_id);
    if (new Set(authorIds).size !== authorIds.length) {
      throw new PostgresProjectSourceError(
        "PROJECT_SOURCE_AUTHORS_INVALID",
        "ProjectSource author references must be unique and ordered.",
      );
    }

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const head = await client.query<HeadRow>(
        `SELECT project_id, artifact_manifest_id, current_revision::text
           FROM petra.project_sources
          WHERE project_source_id = $1
          FOR UPDATE`,
        [source.project_source_id],
      );
      const current = head.rows[0];
      const recordHash = canonicalHash(source);
      if (current === undefined) {
        if (source.revision !== 1) {
          throw new PostgresProjectSourceError(
            "PROJECT_SOURCE_REVISION_GAP",
            "A new ProjectSource must begin at revision 1.",
          );
        }
        await client.query(
          `INSERT INTO petra.project_sources (
             project_source_id, project_id, artifact_manifest_id, current_revision
           ) VALUES ($1, $2, $3, $4)`,
          [
            source.project_source_id,
            source.project_id,
            source.content.artifact_manifest_ref.artifact_manifest_id,
            source.revision,
          ],
        );
      } else {
        if (
          current.project_id !== source.project_id ||
          current.artifact_manifest_id !==
            source.content.artifact_manifest_ref.artifact_manifest_id
        ) {
          throw new PostgresProjectSourceError(
            "PROJECT_SOURCE_ID_CONFLICT",
            "ProjectSource identity cannot be rebound to another Project or copy.",
          );
        }
        const existing = await client.query<StoredRow>(
          `SELECT payload, record_hash
             FROM petra.project_source_revisions
            WHERE project_source_id = $1 AND revision = $2`,
          [source.project_source_id, source.revision],
        );
        if (existing.rows[0]?.record_hash === recordHash) {
          await client.query("COMMIT");
          return clone(source);
        }
        if (existing.rows[0] !== undefined) {
          throw new PostgresProjectSourceError(
            "PROJECT_SOURCE_REVISION_CONFLICT",
            "ProjectSource revision identity is already bound to different content.",
          );
        }
        if (source.revision !== Number(current.current_revision) + 1) {
          throw new PostgresProjectSourceError(
            "PROJECT_SOURCE_REVISION_GAP",
            "ProjectSource revisions must advance contiguously.",
          );
        }
      }

      await this.#insertRevision(client, source, recordHash);
      if (current !== undefined) {
        await client.query(
          `UPDATE petra.project_sources
              SET current_revision = $2
            WHERE project_source_id = $1`,
          [source.project_source_id, source.revision],
        );
      }
      await client.query("COMMIT");
      return clone(source);
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof PostgresProjectSourceError) throw error;
      const pgError = error as PgError;
      if (pgError.code === "23505") {
        throw new PostgresProjectSourceError(
          pgError.constraint ===
            "project_sources_project_id_artifact_manifest_id_key"
            ? "PROJECT_SOURCE_ID_CONFLICT"
            : "PROJECT_SOURCE_REVISION_CONFLICT",
          pgError.message ?? "ProjectSource identity conflicts with authority.",
        );
      }
      if (pgError.code === "23503" || pgError.code === "23514") {
        throw new PostgresProjectSourceError(
          "PROJECT_SOURCE_RELATION_INVALID",
          pgError.message ??
            "ProjectSource authority references do not resolve exactly.",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getProjectSource(
    projectId: string,
    projectSourceId: string,
    revision?: number,
  ): Promise<PetraProjectSource | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.project_sources AS source
         JOIN petra.project_source_revisions AS record
           ON record.project_source_id = source.project_source_id
          AND record.revision = COALESCE($3::bigint, source.current_revision)
        WHERE source.project_id = $1 AND source.project_source_id = $2`,
      [projectId, projectSourceId, revision ?? null],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#stored(result.rows[0]);
  }

  async listProjectSources(projectId: string): Promise<PetraProjectSource[]> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.project_sources AS source
         JOIN petra.project_source_revisions AS record
           ON record.project_source_id = source.project_source_id
          AND record.revision = source.current_revision
        WHERE source.project_id = $1
        ORDER BY record.added_at, source.project_source_id`,
      [projectId],
    );
    return result.rows.map((row) => this.#stored(row));
  }

  async #insertRevision(
    client: PoolClient,
    source: PetraProjectSource,
    recordHash: string,
  ): Promise<void> {
    const content = source.content;
    await client.query(
      `INSERT INTO petra.project_source_revisions (
         project_source_id, revision, project_id, binding_kind,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, source_role,
         work_id, work_revision, work_record_hash,
         work_version_id, work_version_revision, work_version_record_hash,
         artifact_manifest_id, artifact_manifest_revision,
         artifact_manifest_record_hash, status, content_hash,
         added_by_actor_id, added_by_actor_kind,
         schema_name, schema_version, record_hash, payload, added_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25::jsonb, $26
       )`,
      [
        source.project_source_id,
        source.revision,
        source.project_id,
        content.binding_kind,
        content.project_definition_ref.project_definition_id,
        content.project_definition_ref.revision,
        content.project_definition_ref.content_hash,
        content.source_role,
        content.work_ref.work_id,
        content.work_ref.revision,
        content.work_ref.record_hash,
        content.work_version_ref.work_version_id,
        content.work_version_ref.revision,
        content.work_version_ref.record_hash,
        content.artifact_manifest_ref.artifact_manifest_id,
        content.artifact_manifest_ref.revision,
        content.artifact_manifest_ref.record_hash,
        content.status,
        source.content_hash,
        source.added_by.actor_id,
        source.added_by.actor_kind,
        source.schema_name,
        source.schema_version,
        recordHash,
        JSON.stringify(source),
        source.added_at,
      ],
    );
    for (const [index, author] of content.author_refs.entries()) {
      await client.query(
        `INSERT INTO petra.project_source_author_refs (
           project_source_id, project_source_revision, position,
           author_id, author_revision, author_record_hash
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          source.project_source_id,
          source.revision,
          index + 1,
          author.author_id,
          author.revision,
          author.record_hash,
        ],
      );
    }
  }

  #stored(row: StoredRow): PetraProjectSource {
    this.#contracts.assertValid("project-source", "1.0.0", row.payload);
    const source = row.payload as PetraProjectSource;
    if (
      row.record_hash !== canonicalHash(source) ||
      source.content_hash !== canonicalHash(source.content)
    ) {
      throw new PostgresProjectSourceError(
        "PROJECT_SOURCE_STORED_RECORD_CORRUPT",
        "Stored ProjectSource hashes do not identify the validated payload.",
      );
    }
    return clone(source);
  }
}
