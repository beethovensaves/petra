import { createHash } from "node:crypto";

import type {
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRecord,
  ReviewSessionLifecycleExactRef,
  ReviewSessionMemberV110,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ReviewSessionLifecycleAuthorityError,
  derivePetraId,
  type ReviewSessionAuthorityRepository,
  type ReviewSessionLifecycleAuthorityRepository,
  type ReviewSessionLifecycleCommandEnvelope,
  type ReviewSessionLifecycleCommandResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

export type PostgresReviewSessionErrorCode =
  | "REVIEW_SESSION_CONTENT_HASH_MISMATCH"
  | "REVIEW_SESSION_ID_CONFLICT"
  | "REVIEW_SESSION_REVISION_CONFLICT"
  | "REVIEW_SESSION_REVISION_GAP"
  | "REVIEW_SESSION_BINDING_UNSUPPORTED"
  | "REVIEW_SESSION_RELATION_INVALID"
  | "REVIEW_SESSION_LIFECYCLE_COMMAND_REQUIRED"
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
  current_payload: unknown;
  current_record_hash: string;
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface CommandExecutionRow {
  command_id: string;
  command_fingerprint: string;
  result: unknown;
}

interface PgError {
  code?: string;
  constraint?: string;
  message?: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const commandFingerprint = (
  envelope: ReviewSessionLifecycleCommandEnvelope,
): string => {
  const { correlation_id, submitted_at, ...governedCommand } = envelope;
  void correlation_id;
  void submitted_at;
  return canonicalHash(governedCommand);
};

const sessionRef = (
  session: PetraReviewSessionRecord,
  recordHash: string,
): ReviewSessionLifecycleExactRef => ({
  review_session_id: session.review_session_id,
  revision: session.revision,
  content_hash: session.content_hash,
  record_hash: recordHash,
  lifecycle: session.content.lifecycle,
});

const evidenceKind = (recordId: string): "claim" | "assertion" => {
  if (recordId.startsWith("claim_")) return "claim";
  if (recordId.startsWith("assertion_")) return "assertion";
  throw new PostgresReviewSessionError(
    "REVIEW_SESSION_BINDING_UNSUPPORTED",
    "V021 Review persistence supports exact Claim and Assertion bindings only; another profile record needs an additive authority resolver.",
  );
};

export class PostgresReviewSessionAuthorityRepository
  implements
    ReviewSessionAuthorityRepository,
    ReviewSessionLifecycleAuthorityRepository
{
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #commandAuthorizer: PostgresCommandAuthorizer | undefined;
  readonly #now: () => string;

  constructor(
    pool: Pool,
    contracts = new PetraContractRegistry(),
    commandAuthorizer?: PostgresCommandAuthorizer,
    now: () => string = () => new Date().toISOString(),
  ) {
    this.#pool = pool;
    this.#contracts = contracts;
    this.#commandAuthorizer = commandAuthorizer;
    this.#now = now;
  }

  async registerReviewSessionRevision(
    session: PetraReviewSessionRecord,
  ): Promise<PetraReviewSessionRecord> {
    this.#contracts.assertValid(
      "review-session",
      session.schema_version,
      session,
    );
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
        `SELECT session.project_id,
                session.current_revision::text,
                session.created_by_actor_id,
                session.created_at,
                current.payload AS current_payload,
                current.record_hash AS current_record_hash
           FROM petra.review_sessions AS session
           JOIN petra.review_session_revisions AS current
             ON current.review_session_id = session.review_session_id
            AND current.revision = session.current_revision
          WHERE session.review_session_id = $1
          FOR UPDATE OF session`,
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
        const current = this.#stored({
          payload: head.current_payload,
          record_hash: head.current_record_hash,
        });
        if (session.content.lifecycle !== current.content.lifecycle) {
          throw new PostgresReviewSessionError(
            "REVIEW_SESSION_LIFECYCLE_COMMAND_REQUIRED",
            "ReviewSession lifecycle changes require the authenticated defer or reopen command boundary.",
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

  async executeReviewSessionLifecycleCommand(
    envelope: ReviewSessionLifecycleCommandEnvelope,
  ): Promise<ReviewSessionLifecycleCommandResult> {
    this.#contracts.assertValid("command-envelope", "1.4.0", envelope);
    const commandName = envelope.command.command_name;
    if (
      commandName !== "DeferReviewSession" &&
      commandName !== "ReopenReviewSession"
    ) {
      throw this.#lifecycleError(
        "REVIEW_SESSION_LIFECYCLE_TRANSITION_INVALID",
        "The ReviewSession lifecycle boundary accepts only defer or reopen commands.",
      );
    }
    const fingerprint = commandFingerprint(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lockLifecycleCommand(client, envelope);
      if (
        this.#commandAuthorizer === undefined ||
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName,
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize ${commandName}.`,
        );
      }
      const replay = await this.#replayLifecycleCommand(
        client,
        envelope,
        fingerprint,
      );
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireLifecycleContext(client, envelope);

      const currentRow = await this.#currentSessionForLifecycle(
        client,
        envelope.command.expected_review_session_ref.review_session_id,
      );
      if (currentRow === undefined) {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_SESSION_NOT_FOUND",
          "The requested ReviewSession is not registered.",
        );
      }
      const current = this.#stored(currentRow);
      if (current.project_id !== envelope.project_id) {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_PROJECT_MISMATCH",
          "The ReviewSession and command must belong to the same Project.",
        );
      }
      const expected = envelope.command.expected_review_session_ref;
      if (
        current.review_session_id !== expected.review_session_id ||
        current.revision !== expected.revision ||
        current.content_hash !== expected.content_hash ||
        current.content.lifecycle !== expected.lifecycle
      ) {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_STALE_SESSION",
          "The command must name the exact current ReviewSession revision, content hash, and lifecycle.",
        );
      }
      const expectedLifecycle =
        commandName === "DeferReviewSession" ? "open" : "deferred";
      const resultingLifecycle =
        commandName === "DeferReviewSession" ? "deferred" : "open";
      if (current.content.lifecycle !== expectedLifecycle) {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_TRANSITION_INVALID",
          `${commandName} requires a current ${expectedLifecycle} ReviewSession.`,
        );
      }

      const recordedAt = this.#now();
      const next = clone(current);
      next.revision += 1;
      next.content.lifecycle = resultingLifecycle;
      next.content_hash = canonicalHash(next.content);
      next.updated_at = recordedAt;
      this.#contracts.assertValid("review-session", next.schema_version, next);
      const nextRecordHash = canonicalHash(next);
      const receipt = this.#lifecycleReceipt(
        envelope,
        fingerprint,
        current,
        currentRow.record_hash,
        next,
        nextRecordHash,
        recordedAt,
      );

      await this.#insertLifecycleCommandExecution(
        client,
        envelope,
        fingerprint,
        receipt,
        recordedAt,
      );
      await this.#insertRevision(client, next, nextRecordHash);
      const advanced = await client.query(
        `UPDATE petra.review_sessions
            SET current_revision = $2
          WHERE review_session_id = $1
            AND project_id = $3
            AND current_revision = $4`,
        [
          next.review_session_id,
          next.revision,
          next.project_id,
          current.revision,
        ],
      );
      if (advanced.rowCount !== 1) {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_STALE_SESSION",
          "The ReviewSession head changed before the lifecycle command could commit.",
        );
      }
      await this.#insertLifecycleReceipt(
        client,
        receipt,
        currentRow.record_hash,
        nextRecordHash,
      );
      await client.query("COMMIT");
      return {
        receipt: clone(receipt),
        reviewSession: clone(next),
        applied: true,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ReviewSessionLifecycleAuthorityError) throw error;
      const pgError = error as PgError;
      if (pgError.code === "23514" || pgError.code === "23503") {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_TRANSITION_INVALID",
          pgError.message ??
            "The ReviewSession lifecycle transition no longer satisfies its exact retained bindings.",
        );
      }
      if (pgError.code === "40001" || pgError.code === "23505") {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_STALE_SESSION",
          pgError.message ??
            "The ReviewSession lifecycle command conflicted with current state.",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getReviewSessionLifecycleReceipt(
    commandId: string,
  ): Promise<PetraReviewSessionLifecycleReceipt | undefined> {
    const result = await this.#pool.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.review_session_lifecycle_receipts
        WHERE command_id = $1`,
      [commandId],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#storedLifecycleReceipt(result.rows[0]);
  }

  async getReviewSession(
    projectId: string,
    reviewSessionId: string,
    revision?: number,
  ): Promise<PetraReviewSessionRecord | undefined> {
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

  async listReviewSessions(
    projectId: string,
  ): Promise<PetraReviewSessionRecord[]> {
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

  async #lockLifecycleCommand(
    client: PoolClient,
    envelope: ReviewSessionLifecycleCommandEnvelope,
  ): Promise<void> {
    const keys = [
      `command:${envelope.command_id}`,
      `idempotency:${envelope.idempotency_key}`,
      `project:${envelope.project_id}`,
      `review-session:${envelope.command.expected_review_session_ref.review_session_id}`,
    ].sort();
    for (const key of keys) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #replayLifecycleCommand(
    client: PoolClient,
    envelope: ReviewSessionLifecycleCommandEnvelope,
    fingerprint: string,
  ): Promise<ReviewSessionLifecycleCommandResult | undefined> {
    const byIdempotency = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE idempotency_key = $1`,
      [envelope.idempotency_key],
    );
    const idempotent = byIdempotency.rows[0];
    if (idempotent !== undefined) {
      if (idempotent.command_fingerprint !== fingerprint) {
        throw this.#lifecycleError(
          "REVIEW_SESSION_LIFECYCLE_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different command content.",
        );
      }
      return this.#replayedLifecycleResult(client, idempotent);
    }
    const byCommand = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE command_id = $1`,
      [envelope.command_id],
    );
    const command = byCommand.rows[0];
    if (command === undefined) return undefined;
    if (command.command_fingerprint !== fingerprint) {
      throw this.#lifecycleError(
        "REVIEW_SESSION_LIFECYCLE_COMMAND_ID_REUSED",
        "The command identity is already bound to different command content.",
      );
    }
    return this.#replayedLifecycleResult(client, command);
  }

  async #replayedLifecycleResult(
    client: PoolClient,
    row: CommandExecutionRow,
  ): Promise<ReviewSessionLifecycleCommandResult> {
    const receiptResult = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.review_session_lifecycle_receipts
        WHERE command_id = $1`,
      [row.command_id],
    );
    const receiptRow = receiptResult.rows[0];
    if (receiptRow === undefined) {
      throw this.#lifecycleCorrupt(
        "A persisted ReviewSession lifecycle command lost its immutable receipt.",
      );
    }
    if (canonicalize(receiptRow.payload) !== canonicalize(row.result)) {
      throw this.#lifecycleCorrupt(
        "The ReviewSession lifecycle command result differs from its immutable receipt.",
      );
    }
    const receipt = this.#storedLifecycleReceipt(receiptRow);
    const expected = receipt.content.resulting_review_session_ref;
    const sessionRow = await this.#sessionRevision(
      client,
      expected.review_session_id,
      expected.revision,
    );
    if (sessionRow === undefined) {
      throw this.#lifecycleCorrupt(
        "A persisted ReviewSession lifecycle command lost its resulting revision.",
      );
    }
    const reviewSession = this.#stored(sessionRow);
    if (
      reviewSession.project_id !== receipt.project_id ||
      reviewSession.content_hash !== expected.content_hash ||
      reviewSession.content.lifecycle !== expected.lifecycle ||
      sessionRow.record_hash !== expected.record_hash
    ) {
      throw this.#lifecycleCorrupt(
        "The lifecycle receipt no longer resolves its exact ReviewSession revision.",
      );
    }
    return { receipt, reviewSession, applied: false };
  }

  async #requireLifecycleContext(
    client: PoolClient,
    envelope: ReviewSessionLifecycleCommandEnvelope,
  ): Promise<void> {
    const result = await client.query<{ actor_kind: string }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [envelope.project_id, envelope.actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== envelope.actor.actor_kind) {
      throw this.#lifecycleError(
        "REVIEW_SESSION_LIFECYCLE_PROJECT_MISMATCH",
        "The command Project and Actor must resolve exactly in local authority.",
      );
    }
  }

  async #currentSessionForLifecycle(
    client: PoolClient,
    reviewSessionId: string,
  ): Promise<StoredRow | undefined> {
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.review_sessions AS session
         JOIN petra.review_session_revisions AS revision
           ON revision.review_session_id = session.review_session_id
          AND revision.revision = session.current_revision
        WHERE session.review_session_id = $1
        FOR UPDATE OF session`,
      [reviewSessionId],
    );
    return result.rows[0];
  }

  async #sessionRevision(
    client: PoolClient,
    reviewSessionId: string,
    revision: number,
  ): Promise<StoredRow | undefined> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.review_session_revisions
        WHERE review_session_id = $1 AND revision = $2`,
      [reviewSessionId, revision],
    );
    return result.rows[0];
  }

  #lifecycleReceipt(
    envelope: ReviewSessionLifecycleCommandEnvelope,
    fingerprint: string,
    prior: PetraReviewSessionRecord,
    priorRecordHash: string,
    resulting: PetraReviewSessionRecord,
    resultingRecordHash: string,
    recordedAt: string,
  ): PetraReviewSessionLifecycleReceipt {
    const commandName = envelope.command.command_name;
    const resultingRef = sessionRef(resulting, resultingRecordHash);
    const content: PetraReviewSessionLifecycleReceipt["content"] = {
      command_ref: {
        command_id: envelope.command_id,
        idempotency_key: envelope.idempotency_key,
        command_name: commandName,
        command_fingerprint: fingerprint,
        actor: clone(envelope.actor),
        capability_grant_id: envelope.capability_grant_id,
        correlation_id: envelope.correlation_id,
      },
      prior_review_session_ref: sessionRef(prior, priorRecordHash),
      resulting_review_session_ref: resultingRef,
      transition:
        commandName === "DeferReviewSession" ? "deferred" : "reopened",
      ...(envelope.command.rationale === undefined
        ? {}
        : { rationale: envelope.command.rationale }),
      preservation: {
        review_history: "retained",
        working_candidates: "retained",
        working_relationships: "retained",
        change_sets: "retained",
        approvals: "retained",
        command_events: "retained_unchanged",
        projection_receipts: "retained_unchanged",
      },
      authority_boundary: {
        review_decision: "none",
        domain_authority: "unchanged",
        change_set_authority: "none",
        validation_authority: "none",
        domain_event_effect: "none",
        projection_effect: "none",
      },
      recovery: {
        state: "available",
        inverse_command_name:
          commandName === "DeferReviewSession"
            ? "ReopenReviewSession"
            : "DeferReviewSession",
        expected_review_session_ref: clone(resultingRef),
      },
    };
    const receipt: PetraReviewSessionLifecycleReceipt = {
      schema_name: "petra.review-session-lifecycle-receipt",
      schema_version: "1.0.0",
      review_session_lifecycle_receipt_id: derivePetraId(
        "review_session_lifecycle_receipt",
        envelope.command_id,
      ),
      revision: 1,
      project_id: envelope.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: recordedAt,
    };
    this.#contracts.assertValid(
      "review-session-lifecycle-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  async #insertLifecycleCommandExecution(
    client: PoolClient,
    envelope: ReviewSessionLifecycleCommandEnvelope,
    fingerprint: string,
    receipt: PetraReviewSessionLifecycleReceipt,
    completedAt: string,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.command_executions (
         command_id, idempotency_key, project_id, actor_id, actor_kind,
         capability_grant_id, correlation_id, submitted_at, command_name,
         command_fingerprint, envelope, outcome_kind, result, error_code,
         error_message, completed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10,
                 $11::jsonb, 'success', $12::jsonb, NULL, NULL,
                 $13::timestamptz)`,
      [
        envelope.command_id,
        envelope.idempotency_key,
        envelope.project_id,
        envelope.actor.actor_id,
        envelope.actor.actor_kind,
        envelope.capability_grant_id,
        envelope.correlation_id,
        envelope.submitted_at,
        envelope.command.command_name,
        fingerprint,
        JSON.stringify(envelope),
        JSON.stringify(receipt),
        completedAt,
      ],
    );
  }

  async #insertLifecycleReceipt(
    client: PoolClient,
    receipt: PetraReviewSessionLifecycleReceipt,
    priorRecordHash: string,
    resultingRecordHash: string,
  ): Promise<void> {
    const content = receipt.content;
    await client.query(
      `INSERT INTO petra.review_session_lifecycle_receipts (
         review_session_lifecycle_receipt_id, revision, project_id,
         command_id, idempotency_key, command_name, command_fingerprint,
         review_session_id, prior_revision, prior_content_hash,
         prior_record_hash, prior_lifecycle, resulting_revision,
         resulting_content_hash, resulting_record_hash,
         resulting_lifecycle, transition, rationale, content_hash,
         recorded_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19, $20::timestamptz, $21, $22::jsonb
       )`,
      [
        receipt.review_session_lifecycle_receipt_id,
        receipt.revision,
        receipt.project_id,
        content.command_ref.command_id,
        content.command_ref.idempotency_key,
        content.command_ref.command_name,
        content.command_ref.command_fingerprint,
        content.prior_review_session_ref.review_session_id,
        content.prior_review_session_ref.revision,
        content.prior_review_session_ref.content_hash,
        priorRecordHash,
        content.prior_review_session_ref.lifecycle,
        content.resulting_review_session_ref.revision,
        content.resulting_review_session_ref.content_hash,
        resultingRecordHash,
        content.resulting_review_session_ref.lifecycle,
        content.transition,
        content.rationale ?? null,
        receipt.content_hash,
        receipt.recorded_at,
        canonicalHash(receipt),
        JSON.stringify(receipt),
      ],
    );
  }

  #storedLifecycleReceipt(row: StoredRow): PetraReviewSessionLifecycleReceipt {
    this.#contracts.assertValid(
      "review-session-lifecycle-receipt",
      "1.0.0",
      row.payload,
    );
    const receipt = clone(row.payload as PetraReviewSessionLifecycleReceipt);
    if (
      receipt.content_hash !== canonicalHash(receipt.content) ||
      row.record_hash !== canonicalHash(receipt)
    ) {
      throw this.#lifecycleCorrupt(
        "A stored ReviewSession lifecycle receipt does not match its canonical hashes.",
      );
    }
    return receipt;
  }

  #lifecycleError(
    code: ConstructorParameters<typeof ReviewSessionLifecycleAuthorityError>[0],
    message: string,
  ): ReviewSessionLifecycleAuthorityError {
    return new ReviewSessionLifecycleAuthorityError(code, message);
  }

  #lifecycleCorrupt(message: string): ReviewSessionLifecycleAuthorityError {
    return this.#lifecycleError(
      "REVIEW_SESSION_LIFECYCLE_STORED_RECORD_CORRUPT",
      message,
    );
  }

  #assertBindings(session: PetraReviewSessionRecord): void {
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
    if (session.schema_version === "1.1.0") {
      const candidateRefs = session.content.members.map(
        (member) => member.working_state.candidate_ref.working_candidate_id,
      );
      if (new Set(candidateRefs).size !== candidateRefs.length) {
        throw new PostgresReviewSessionError(
          "REVIEW_SESSION_RELATION_INVALID",
          "A WorkingCandidate revision can belong to only one Review member in a session revision.",
        );
      }
      const relationshipRefs = session.content.members.flatMap((member) =>
        member.working_state.relationship_refs.map(
          (relationship) =>
            `${relationship.working_relationship_id}:${relationship.revision}`,
        ),
      );
      if (new Set(relationshipRefs).size !== relationshipRefs.length) {
        throw new PostgresReviewSessionError(
          "REVIEW_SESSION_RELATION_INVALID",
          "A WorkingRelationship revision can belong to only one Review member in a session revision.",
        );
      }
    }
  }

  async #insertRevision(
    client: PoolClient,
    session: PetraReviewSessionRecord,
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
      if (session.schema_version === "1.1.0") {
        await this.#insertWorkingBindings(
          client,
          session,
          memberIndex,
          member as ReviewSessionMemberV110,
        );
      }
    }
  }

  async #insertWorkingBindings(
    client: PoolClient,
    session: PetraReviewSessionRecord & { schema_version: "1.1.0" },
    memberIndex: number,
    member: ReviewSessionMemberV110,
  ): Promise<void> {
    const candidate = member.working_state.candidate_ref;
    await client.query(
      `INSERT INTO petra.review_session_working_candidate_bindings (
         review_session_id, review_session_revision, member_position,
         review_member_id, working_candidate_id,
         working_candidate_revision, working_candidate_content_hash
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        session.review_session_id,
        session.revision,
        memberIndex + 1,
        member.review_member_id,
        candidate.working_candidate_id,
        candidate.revision,
        candidate.content_hash,
      ],
    );
    for (const [
      relationshipIndex,
      relationship,
    ] of member.working_state.relationship_refs.entries()) {
      await client.query(
        `INSERT INTO petra.review_session_working_relationship_bindings (
           review_session_id, review_session_revision, member_position,
           relationship_position, working_relationship_id,
           working_relationship_revision, working_relationship_content_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          session.review_session_id,
          session.revision,
          memberIndex + 1,
          relationshipIndex + 1,
          relationship.working_relationship_id,
          relationship.revision,
          relationship.content_hash,
        ],
      );
    }
  }

  #stored(row: StoredRow): PetraReviewSessionRecord {
    const version = (row.payload as { schema_version?: unknown })
      .schema_version;
    if (version !== "1.0.0" && version !== "1.1.0") {
      throw new PostgresReviewSessionError(
        "REVIEW_SESSION_STORED_RECORD_CORRUPT",
        "Stored ReviewSession schema version is unsupported.",
      );
    }
    this.#contracts.assertValid("review-session", version, row.payload);
    const session = row.payload as PetraReviewSessionRecord;
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
