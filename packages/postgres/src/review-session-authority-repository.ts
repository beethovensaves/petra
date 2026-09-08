import { createHash } from "node:crypto";

import type { PetraReviewSession } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ReviewSessionAuthorityRepository } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresReviewSessionErrorCode =
  | "REVIEW_SESSION_CONTENT_HASH_MISMATCH"
  | "REVIEW_SESSION_ID_CONFLICT"
  | "REVIEW_SESSION_REVISION_CONFLICT"
  | "REVIEW_SESSION_REVISION_GAP"
  | "REVIEW_SESSION_BINDING_UNSUPPORTED"
  | "REVIEW_SESSION_RELATION_INVALID"
  | "REVIEW_SESSION_STORED_RECORD_CORRUPT";

export class PostgresReviewSessionError extends Error {
  readonly code: PostgresReviewSessionErrorCode;

  constructor(code: PostgresReviewSessionErrorCode, message: string) {
    super(message);
    this.name = "PostgresReviewSessionError";
    this.code = code;
  }
}

interface HeadRow {
  project_id: string;
  current_revision: string;
  created_by_actor_id: string;
  created_at: Date;
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

const evidenceKind = (recordId: string): "claim" | "assertion" => {
  if (recordId.startsWith("claim_")) return "claim";
  if (recordId.startsWith("assertion_")) return "assertion";
  throw new PostgresReviewSessionError(
    "REVIEW_SESSION_BINDING_UNSUPPORTED",
    "V021 Review persistence supports exact Claim and Assertion bindings only; another profile record needs an additive authority resolver.",
  );
};

export class PostgresReviewSessionAuthorityRepository implements ReviewSessionAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerReviewSessionRevision(
    session: PetraReviewSession,
  ): Promise<PetraReviewSession> {
    this.#contracts.assertValid("review-session", "1.0.0", session);
    if (session.content_hash !== canonicalHash(session.content)) {
      throw new PostgresReviewSessionError(
        "REVIEW_SESSION_CONTENT_HASH_MISMATCH",
        "ReviewSession content_hash does not identify its exact content.",
      );
    }
    this.#assertBindings(session);

    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`review-session:${session.review_session_id}`],
      );
      const heads = await client.query<HeadRow>(
        `SELECT project_id, current_revision::text, created_by_actor_id,
                created_at
           FROM petra.review_sessions
          WHERE review_session_id = $1
          FOR UPDATE`,
        [session.review_session_id],
      );
      const head = heads.rows[0];
      const recordHash = canonicalHash(session);

      if (head === undefined) {
        if (session.revision !== 1) {
          throw new PostgresReviewSessionError(
            "REVIEW_SESSION_REVISION_GAP",
            "A new ReviewSession must begin at revision 1.",
          );
        }
        await client.query(
          `INSERT INTO petra.review_sessions (
             review_session_id, project_id, current_revision,
             created_by_actor_id, created_by_actor_kind, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            session.review_session_id,
            session.project_id,
            session.revision,
            session.created_by.actor_id,
            session.created_by.actor_kind,
            session.created_at,
          ],
        );
      } else {
        if (
          head.project_id !== session.project_id ||
          head.created_by_actor_id !== session.created_by.actor_id ||
          head.created_at.toISOString() !== session.created_at
        ) {
          throw new PostgresReviewSessionError(
            "REVIEW_SESSION_ID_CONFLICT",
            "ReviewSession identity cannot be rebound to another Project or creator.",
          );
        }
        const existing = await client.query<StoredRow>(
          `SELECT payload, record_hash
             FROM petra.review_session_revisions
            WHERE review_session_id = $1 AND revision = $2`,
          [session.review_session_id, session.revision],
        );
        if (existing.rows[0]?.record_hash === recordHash) {
          await client.query("COMMIT");
          return clone(session);
        }
        if (existing.rows[0] !== undefined) {
          throw new PostgresReviewSessionError(
            "REVIEW_SESSION_REVISION_CONFLICT",
            "The ReviewSession revision is already bound to different canonical content.",
          );
        }
        if (session.revision !== Number(head.current_revision) + 1) {
          throw new PostgresReviewSessionError(
            "REVIEW_SESSION_REVISION_GAP",
            "ReviewSession revisions must advance contiguously.",
          );
        }
      }

      await this.#insertRevision(client, session, recordHash);
      if (head !== undefined) {
        await client.query(
          `UPDATE petra.review_sessions
              SET current_revision = $2
            WHERE review_session_id = $1`,
          [session.review_session_id, session.revision],
        );
      }
      await client.query("COMMIT");
      return clone(session);
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof PostgresReviewSessionError) throw error;
      const pgError = error as PgError;
      if (pgError.code === "23505") {
        throw new PostgresReviewSessionError(
          "REVIEW_SESSION_REVISION_CONFLICT",
          pgError.message ?? "ReviewSession identity conflicts with authority.",
        );
      }
      if (pgError.code === "23503" || pgError.code === "23514") {
        throw new PostgresReviewSessionError(
          "REVIEW_SESSION_RELATION_INVALID",
          pgError.message ??
            "ReviewSession references do not resolve under the exact ProjectDefinition.",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getReviewSession(
    projectId: string,
    reviewSessionId: string,
    revision?: number,
  ): Promise<PetraReviewSession | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.review_sessions AS session
         JOIN petra.review_session_revisions AS record
           ON record.review_session_id = session.review_session_id
          AND record.revision = COALESCE($3::bigint, session.current_revision)
        WHERE session.project_id = $1 AND session.review_session_id = $2`,
      [projectId, reviewSessionId, revision ?? null],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#stored(result.rows[0]);
  }

  async listReviewSessions(projectId: string): Promise<PetraReviewSession[]> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.review_sessions AS session
         JOIN petra.review_session_revisions AS record
           ON record.review_session_id = session.review_session_id
          AND record.revision = session.current_revision
        WHERE session.project_id = $1
        ORDER BY record.updated_at DESC, session.review_session_id`,
      [projectId],
    );
    return result.rows.map((row) => this.#stored(row));
  }

  #assertBindings(session: PetraReviewSession): void {
    const memberIds = session.content.members.map(
      (member) => member.review_member_id,
    );
    if (new Set(memberIds).size !== memberIds.length) {
      throw new PostgresReviewSessionError(
        "REVIEW_SESSION_RELATION_INVALID",
        "ReviewSession member identities must be unique within a revision.",
      );
    }
    for (const member of session.content.members) {
      const keys = member.candidate_bindings.map(
        (binding) =>
          `${binding.semantic_key}:${binding.binding_role}:${binding.record_ref.record_id}:${binding.record_ref.revision}`,
      );
      if (new Set(keys).size !== keys.length) {
        throw new PostgresReviewSessionError(
          "REVIEW_SESSION_RELATION_INVALID",
          "ReviewSession candidate bindings must be unique and ordered.",
        );
      }
      for (const binding of member.candidate_bindings) {
        evidenceKind(binding.record_ref.record_id);
      }
    }
  }

  async #insertRevision(
    client: PoolClient,
    session: PetraReviewSession,
    recordHash: string,
  ): Promise<void> {
    const content = session.content;
    await client.query(
      `INSERT INTO petra.review_session_revisions (
         review_session_id, revision, project_id,
         project_definition_id, project_definition_revision,
         project_definition_content_hash,
         objective_id, objective_revision, objective_content_hash,
         lifecycle, responsible_actor_id, responsible_actor_kind,
         snapshot_event_position, snapshot_stream_revision,
         content_hash, schema_name, schema_version, record_hash, payload,
         updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, $20
       )`,
      [
        session.review_session_id,
        session.revision,
        session.project_id,
        session.project_definition_ref.project_definition_id,
        session.project_definition_ref.revision,
        session.project_definition_ref.content_hash,
        content.objective_ref?.objective_id ?? null,
        content.objective_ref?.revision ?? null,
        content.objective_ref?.content_hash ?? null,
        content.lifecycle,
        content.responsible.actor_id,
        content.responsible.actor_kind,
        content.snapshot.event_position,
        content.snapshot.stream_revision,
        session.content_hash,
        session.schema_name,
        session.schema_version,
        recordHash,
        JSON.stringify(session),
        session.updated_at,
      ],
    );
    for (const [memberIndex, member] of content.members.entries()) {
      for (const [
        bindingIndex,
        binding,
      ] of member.candidate_bindings.entries()) {
        await client.query(
          `INSERT INTO petra.review_session_candidate_bindings (
             review_session_id, review_session_revision, member_position,
             review_member_id, member_role, binding_position, semantic_key,
             binding_role, evidence_id, evidence_kind, evidence_revision,
             evidence_record_hash
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
           )`,
          [
            session.review_session_id,
            session.revision,
            memberIndex + 1,
            member.review_member_id,
            member.member_role,
            bindingIndex + 1,
            binding.semantic_key,
            binding.binding_role,
            binding.record_ref.record_id,
            evidenceKind(binding.record_ref.record_id),
            binding.record_ref.revision,
            binding.record_ref.record_hash,
          ],
        );
      }
    }
  }

  #stored(row: StoredRow): PetraReviewSession {
    this.#contracts.assertValid("review-session", "1.0.0", row.payload);
    const session = row.payload as PetraReviewSession;
    if (
      row.record_hash !== canonicalHash(session) ||
      session.content_hash !== canonicalHash(session.content)
    ) {
      throw new PostgresReviewSessionError(
        "REVIEW_SESSION_STORED_RECORD_CORRUPT",
        "Stored ReviewSession hashes do not identify the validated payload.",
      );
    }
    return clone(session);
  }
}
