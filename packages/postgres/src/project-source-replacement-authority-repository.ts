import { createHash } from "node:crypto";

import type {
  PetraProjectSource,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceReplacement,
  ProjectSourceReplacementSourceRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ProjectSourceReplacementAuthorityRepository } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectSourceReplacementErrorCode =
  | "PROJECT_SOURCE_REPLACEMENT_CONTENT_HASH_MISMATCH"
  | "PROJECT_SOURCE_REPLACEMENT_ID_CONFLICT"
  | "PROJECT_SOURCE_REPLACEMENT_ALREADY_LINKED"
  | "PROJECT_SOURCE_REPLACEMENT_PROJECT_MISMATCH"
  | "PROJECT_SOURCE_REPLACEMENT_SOURCE_MISSING"
  | "PROJECT_SOURCE_REPLACEMENT_SOURCE_STALE"
  | "PROJECT_SOURCE_REPLACEMENT_STATUS_MISMATCH"
  | "PROJECT_SOURCE_REPLACEMENT_EXCLUSION_RECEIPT_MISSING"
  | "PROJECT_SOURCE_REPLACEMENT_EXCLUSION_RECEIPT_STALE"
  | "PROJECT_SOURCE_REPLACEMENT_CYCLE"
  | "PROJECT_SOURCE_REPLACEMENT_CHAIN_TOO_LONG"
  | "PROJECT_SOURCE_REPLACEMENT_STORED_RECORD_CORRUPT";

export class PostgresProjectSourceReplacementError extends Error {
  readonly code: PostgresProjectSourceReplacementErrorCode;

  constructor(
    code: PostgresProjectSourceReplacementErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PostgresProjectSourceReplacementError";
    this.code = code;
  }
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface SourceRow extends StoredRow {
  project_source_id: string;
}

interface PgError {
  code?: string;
  constraint?: string;
  message?: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

export class PostgresProjectSourceReplacementAuthorityRepository implements ProjectSourceReplacementAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerProjectSourceReplacement(
    replacement: PetraProjectSourceReplacement,
  ): Promise<PetraProjectSourceReplacement> {
    this.#contracts.assertValid(
      "project-source-replacement",
      "1.0.0",
      replacement,
    );
    if (replacement.content_hash !== canonicalHash(replacement.content)) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_CONTENT_HASH_MISMATCH",
        "ProjectSource replacement content_hash does not identify its exact content.",
      );
    }
    const replaced = replacement.content.replaced_source_ref;
    const successor = replacement.content.replacement_source_ref;
    if (replaced.project_source_id === successor.project_source_id) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_CYCLE",
        "A ProjectSource cannot replace itself.",
      );
    }

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lock(client, [
        `project-source-replacement:${replacement.project_source_replacement_id}`,
        `project-source-replacement-outgoing:${replacement.project_id}:${replaced.project_source_id}`,
        `project-source:${replaced.project_source_id}`,
        `project-source:${successor.project_source_id}`,
      ]);
      await this.#requireProjectAndActor(client, replacement);

      const existing = await client.query<StoredRow & { identity: string }>(
        `SELECT project_source_replacement_id AS identity, payload, record_hash
           FROM petra.project_source_replacements
          WHERE project_source_replacement_id = $1
             OR (project_id = $2 AND replaced_project_source_id = $3)
          FOR UPDATE`,
        [
          replacement.project_source_replacement_id,
          replacement.project_id,
          replaced.project_source_id,
        ],
      );
      const recordHash = canonicalHash(replacement);
      const exact = existing.rows.find(
        (row) => row.identity === replacement.project_source_replacement_id,
      );
      if (exact !== undefined && exact.record_hash === recordHash) {
        await client.query("COMMIT");
        return this.#stored(exact);
      }
      if (exact !== undefined) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_ID_CONFLICT",
          "The ProjectSource replacement identity is already bound to different content.",
        );
      }
      if (existing.rows[0] !== undefined) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_ALREADY_LINKED",
          "The replaced ProjectSource already has a registered successor.",
        );
      }

      await this.#requireExactSources(client, replacement.project_id, [
        replaced,
        successor,
      ]);
      await this.#requireExclusionReceipt(client, replacement);
      const exclusionReceipt = replacement.content.exclusion_receipt_ref;
      await client.query(
        `INSERT INTO petra.project_source_replacements (
           project_source_replacement_id, revision, project_id,
           relationship, replacement_kind, replaced_project_source_id,
           replaced_revision, replaced_content_hash, replaced_record_hash,
           replacement_project_source_id, replacement_revision,
           replacement_content_hash, replacement_record_hash, content_hash,
           exclusion_receipt_id, exclusion_receipt_revision,
           exclusion_receipt_content_hash, exclusion_receipt_record_hash,
           recorded_by_actor_id, recorded_by_actor_kind, recorded_at,
           record_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19,
           $20, $21::timestamptz, $22, $23::jsonb
         )`,
        [
          replacement.project_source_replacement_id,
          replacement.revision,
          replacement.project_id,
          replacement.content.relationship,
          replacement.content.replacement_kind,
          replaced.project_source_id,
          replaced.revision,
          replaced.content_hash,
          replaced.record_hash,
          successor.project_source_id,
          successor.revision,
          successor.content_hash,
          successor.record_hash,
          replacement.content_hash,
          exclusionReceipt.project_source_lifecycle_receipt_id,
          exclusionReceipt.revision,
          exclusionReceipt.content_hash,
          exclusionReceipt.record_hash,
          replacement.recorded_by.actor_id,
          replacement.recorded_by.actor_kind,
          replacement.recorded_at,
          recordHash,
          JSON.stringify(replacement),
        ],
      );
      await client.query("COMMIT");
      return clone(replacement);
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof PostgresProjectSourceReplacementError) throw error;
      throw this.#translate(error as PgError);
    } finally {
      client.release();
    }
  }

  async getProjectSourceReplacement(
    projectId: string,
    projectSourceReplacementId: string,
  ): Promise<PetraProjectSourceReplacement | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_replacements
        WHERE project_id = $1 AND project_source_replacement_id = $2`,
      [projectId, projectSourceReplacementId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#stored(result.rows[0]);
  }

  async getProjectSourceSuccessor(
    projectId: string,
    replacedProjectSourceId: string,
  ): Promise<PetraProjectSourceReplacement | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_replacements
        WHERE project_id = $1 AND replaced_project_source_id = $2`,
      [projectId, replacedProjectSourceId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#stored(result.rows[0]);
  }

  async listProjectSourceReplacementChain(
    projectId: string,
    projectSourceId: string,
  ): Promise<PetraProjectSourceReplacement[]> {
    const result = await this.#pool.query<StoredRow & { depth: string }>(
      `WITH RECURSIVE chain AS (
         SELECT replacement.payload, replacement.record_hash,
                replacement.replacement_project_source_id, 1::bigint AS depth,
                ARRAY[
                  replacement.replaced_project_source_id,
                  replacement.replacement_project_source_id
                ] AS path
           FROM petra.project_source_replacements AS replacement
          WHERE replacement.project_id = $1
            AND replacement.replaced_project_source_id = $2
         UNION ALL
         SELECT replacement.payload, replacement.record_hash,
                replacement.replacement_project_source_id, chain.depth + 1,
                chain.path || replacement.replacement_project_source_id
           FROM chain
           JOIN petra.project_source_replacements AS replacement
             ON replacement.project_id = $1
            AND replacement.replaced_project_source_id =
                chain.replacement_project_source_id
          WHERE chain.depth < 33
            AND NOT replacement.replacement_project_source_id = ANY(chain.path)
       )
       SELECT payload, record_hash, depth::text
         FROM chain
        ORDER BY depth`,
      [projectId, projectSourceId],
    );
    if (result.rows.some((row) => Number(row.depth) > 32)) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_CHAIN_TOO_LONG",
        "ProjectSource replacement lineage exceeds the supported 32-edge bound.",
      );
    }
    return result.rows.map((row) => this.#stored(row));
  }

  async #requireProjectAndActor(
    client: PoolClient,
    replacement: PetraProjectSourceReplacement,
  ): Promise<void> {
    const result = await client.query<{ actor_kind: string }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [replacement.project_id, replacement.recorded_by.actor_id],
    );
    const row = result.rows[0];
    if (
      row === undefined ||
      row.actor_kind !== replacement.recorded_by.actor_kind
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_PROJECT_MISMATCH",
        "The ProjectSource replacement Project and Actor must resolve exactly in local authority.",
      );
    }
  }

  async #requireExactSources(
    client: PoolClient,
    projectId: string,
    refs: readonly ProjectSourceReplacementSourceRef[],
  ): Promise<void> {
    const ids = refs.map((ref) => ref.project_source_id);
    const result = await client.query<SourceRow>(
      `SELECT head.project_source_id, revision.payload, revision.record_hash
         FROM petra.project_sources AS head
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = head.project_source_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.project_source_id = ANY($2::text[])
        FOR UPDATE OF head`,
      [projectId, ids],
    );
    if (result.rows.length !== 2) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_SOURCE_MISSING",
        "Both ProjectSource identities must exist in the same Project.",
      );
    }
    for (const ref of refs) {
      const row = result.rows.find(
        (candidate) => candidate.project_source_id === ref.project_source_id,
      );
      if (row === undefined) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_SOURCE_MISSING",
          "A referenced ProjectSource is unavailable in this Project.",
        );
      }
      const source = this.#source(row);
      if (
        source.revision !== ref.revision ||
        source.content_hash !== ref.content_hash ||
        row.record_hash !== ref.record_hash
      ) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_SOURCE_STALE",
          "Replacement lineage must name both exact current ProjectSource revisions and hashes.",
        );
      }
      if (source.content.status !== ref.status) {
        throw this.#error(
          "PROJECT_SOURCE_REPLACEMENT_STATUS_MISMATCH",
          "Replacement lineage requires an excluded predecessor and an active successor.",
        );
      }
    }
  }

  async #requireExclusionReceipt(
    client: PoolClient,
    replacement: PetraProjectSourceReplacement,
  ): Promise<void> {
    const ref = replacement.content.exclusion_receipt_ref;
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.project_source_lifecycle_receipts
        WHERE project_id = $1
          AND project_source_lifecycle_receipt_id = $2`,
      [replacement.project_id, ref.project_source_lifecycle_receipt_id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_EXCLUSION_RECEIPT_MISSING",
        "The predecessor exclusion receipt is unavailable in this Project.",
      );
    }
    this.#contracts.assertValid(
      "project-source-lifecycle-receipt",
      "1.0.0",
      row.payload,
    );
    const receipt = clone(row.payload as PetraProjectSourceLifecycleReceipt);
    if (
      receipt.content_hash !== canonicalHash(receipt.content) ||
      row.record_hash !== canonicalHash(receipt)
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_STORED_RECORD_CORRUPT",
        "The predecessor exclusion receipt does not reproduce its canonical hashes.",
      );
    }
    const resulting = receipt.content.resulting_source_ref;
    const replaced = replacement.content.replaced_source_ref;
    if (
      receipt.revision !== ref.revision ||
      receipt.content_hash !== ref.content_hash ||
      row.record_hash !== ref.record_hash ||
      receipt.content.command_ref.command_name !== "ExcludeProjectSource" ||
      resulting.project_source_id !== replaced.project_source_id ||
      resulting.revision !== replaced.revision ||
      resulting.content_hash !== replaced.content_hash ||
      resulting.record_hash !== replaced.record_hash ||
      resulting.status !== "excluded"
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_EXCLUSION_RECEIPT_STALE",
        "The supplied receipt does not establish the exact predecessor exclusion.",
      );
    }
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...keys].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  #source(row: StoredRow): PetraProjectSource {
    this.#contracts.assertValid("project-source", "1.0.0", row.payload);
    const source = clone(row.payload as PetraProjectSource);
    if (
      source.content_hash !== canonicalHash(source.content) ||
      row.record_hash !== canonicalHash(source)
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_STORED_RECORD_CORRUPT",
        "A replacement source revision does not reproduce its canonical hashes.",
      );
    }
    return source;
  }

  #stored(row: StoredRow): PetraProjectSourceReplacement {
    this.#contracts.assertValid(
      "project-source-replacement",
      "1.0.0",
      row.payload,
    );
    const replacement = clone(row.payload as PetraProjectSourceReplacement);
    if (
      replacement.content_hash !== canonicalHash(replacement.content) ||
      row.record_hash !== canonicalHash(replacement)
    ) {
      throw this.#error(
        "PROJECT_SOURCE_REPLACEMENT_STORED_RECORD_CORRUPT",
        "A stored ProjectSource replacement does not reproduce its canonical hashes.",
      );
    }
    return replacement;
  }

  #translate(error: PgError): PostgresProjectSourceReplacementError {
    if (error.code === "23505") {
      return this.#error(
        error.constraint ===
          "project_source_replacements_project_id_replaced_project_source_id_key"
          ? "PROJECT_SOURCE_REPLACEMENT_ALREADY_LINKED"
          : "PROJECT_SOURCE_REPLACEMENT_ID_CONFLICT",
        error.message ?? "ProjectSource replacement identity conflicts.",
      );
    }
    if (error.code === "23514" || error.code === "23503") {
      const message = error.message ?? "ProjectSource replacement is invalid.";
      if (message.includes("cycle")) {
        return this.#error("PROJECT_SOURCE_REPLACEMENT_CYCLE", message);
      }
      if (message.includes("32 edges")) {
        return this.#error(
          "PROJECT_SOURCE_REPLACEMENT_CHAIN_TOO_LONG",
          message,
        );
      }
      if (message.includes("exclusion receipt")) {
        return this.#error(
          "PROJECT_SOURCE_REPLACEMENT_EXCLUSION_RECEIPT_STALE",
          message,
        );
      }
      return this.#error("PROJECT_SOURCE_REPLACEMENT_SOURCE_STALE", message);
    }
    return this.#error(
      "PROJECT_SOURCE_REPLACEMENT_STORED_RECORD_CORRUPT",
      error.message ?? "ProjectSource replacement persistence failed.",
    );
  }

  #error(
    code: PostgresProjectSourceReplacementErrorCode,
    message: string,
  ): PostgresProjectSourceReplacementError {
    return new PostgresProjectSourceReplacementError(code, message);
  }
}
