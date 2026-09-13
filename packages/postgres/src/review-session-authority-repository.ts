import { createHash } from "node:crypto";

import type {
  PetraAssertion,
  PetraChangeSetRecord,
  PetraClaim,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraReviewCandidateBasisRevisionReceipt,
  PetraReviewCandidateCorrectionReceipt,
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRefreshReceipt,
  PetraReviewSessionSeparationReceipt,
  PetraReviewSessionRecord,
  PetraReviewSessionV110,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  ReviewSessionLifecycleExactRef,
  ReviewSessionMemberV110,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ReviewCandidateCorrectionAuthorityError,
  ReviewCandidateBasisRevisionAuthorityError,
  ReviewSessionLifecycleAuthorityError,
  ReviewSessionRefreshAuthorityError,
  ReviewSessionSeparationAuthorityError,
  derivePetraId,
  type ReviewCandidateBasisRevisionAuthorityRepository,
  type ReviewCandidateBasisRevisionCommandEnvelope,
  type ReviewCandidateBasisRevisionCommandResult,
  type ReviewCandidateCorrectionAuthorityCommandEnvelope,
  type ReviewCandidateCorrectionAuthorityRepository,
  type ReviewCandidateCorrectionCommandResult,
  type ReviewSessionAuthorityRepository,
  type ReviewSessionLifecycleAuthorityRepository,
  type ReviewSessionLifecycleCommandEnvelope,
  type ReviewSessionLifecycleCommandResult,
  type ReviewSessionRefreshAuthorityRepository,
  type ReviewSessionRefreshCommandEnvelope,
  type ReviewSessionRefreshCommandResult,
  type ReviewSessionSeparationAuthorityRepository,
  type ReviewSessionSeparationCommandEnvelope,
  type ReviewSessionSeparationCommandResult,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";
import {
  PostgresWorkingStateAuthorityRepository,
  PostgresWorkingStateError,
} from "./working-state-authority-repository.js";

export type PostgresReviewSessionErrorCode =
  | "REVIEW_SESSION_CONTENT_HASH_MISMATCH"
  | "REVIEW_SESSION_ID_CONFLICT"
  | "REVIEW_SESSION_REVISION_CONFLICT"
  | "REVIEW_SESSION_REVISION_GAP"
  | "REVIEW_SESSION_BINDING_UNSUPPORTED"
  | "REVIEW_SESSION_RELATION_INVALID"
  | "REVIEW_SESSION_LIFECYCLE_COMMAND_REQUIRED"
  | "REVIEW_SESSION_MEMBERSHIP_COMMAND_REQUIRED"
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

interface AuthorityPositionRow {
  event_position: string;
  stream_revision: string | null;
}

interface CurrentDefinitionRow extends StoredRow {
  definition_family: string;
}

interface ProjectSourceRow extends StoredRow {
  content_hash: string;
  work_version_id: string;
  artifact_manifest_id: string;
  status: string;
}

interface SourceSpanRow extends StoredRow {
  source_span_id: string;
  work_version_id: string;
  artifact_id: string;
  structural_kind: string;
  structural_payload: unknown;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const workingContentHash = (value: {
  readonly content_hash: string;
}): string => {
  const projection = clone(value) as unknown as Record<string, unknown>;
  delete projection.content_hash;
  return canonicalHash(projection);
};

const clone = <Value>(value: Value): Value => structuredClone(value);

const commandFingerprint = (
  envelope:
    | ReviewSessionLifecycleCommandEnvelope
    | ReviewSessionRefreshCommandEnvelope
    | ReviewCandidateCorrectionAuthorityCommandEnvelope
    | ReviewCandidateBasisRevisionCommandEnvelope
    | ReviewSessionSeparationCommandEnvelope,
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

const openSessionRef = (
  session: PetraReviewSessionV110,
  recordHash: string,
): PetraReviewSessionSeparationReceipt["content"]["source_prior_review_session_ref"] => {
  if (session.content.lifecycle !== "open") {
    throw new PostgresReviewSessionError(
      "REVIEW_SESSION_STORED_RECORD_CORRUPT",
      "An explicit separation result must reference only open ReviewSessions.",
    );
  }
  return {
    review_session_id: session.review_session_id,
    revision: session.revision,
    content_hash: session.content_hash,
    record_hash: recordHash,
    lifecycle: "open",
  };
};

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
    ReviewSessionLifecycleAuthorityRepository,
    ReviewSessionRefreshAuthorityRepository,
    ReviewCandidateCorrectionAuthorityRepository,
    ReviewCandidateBasisRevisionAuthorityRepository,
    ReviewSessionSeparationAuthorityRepository
{
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #commandAuthorizer: PostgresCommandAuthorizer | undefined;
  readonly #now: () => string;
  readonly #workingState: PostgresWorkingStateAuthorityRepository;

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
    this.#workingState = new PostgresWorkingStateAuthorityRepository(
      pool,
      contracts,
    );
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
        if (
          canonicalize(
            session.content.members.map((member) => member.review_member_id),
          ) !==
          canonicalize(
            current.content.members.map((member) => member.review_member_id),
          )
        ) {
          throw new PostgresReviewSessionError(
            "REVIEW_SESSION_MEMBERSHIP_COMMAND_REQUIRED",
            "ReviewSession member partitions and ordering require the authenticated separation command boundary.",
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
      await this.#requireReviewCommandContext(client, envelope, "lifecycle");

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

  async executeReviewSessionRefreshCommand(
    envelope: ReviewSessionRefreshCommandEnvelope,
  ): Promise<ReviewSessionRefreshCommandResult> {
    this.#contracts.assertValid("command-envelope", "1.5.0", envelope);
    if (envelope.command.command_name !== "RefreshReviewSession") {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
        "The ReviewSession refresh boundary accepts only RefreshReviewSession.",
      );
    }
    const fingerprint = commandFingerprint(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lockRefreshCommand(client, envelope);
      if (
        this.#commandAuthorizer === undefined ||
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName: "RefreshReviewSession",
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize RefreshReviewSession.`,
        );
      }
      const replay = await this.#replayRefreshCommand(
        client,
        envelope,
        fingerprint,
      );
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireReviewCommandContext(client, envelope, "refresh");

      const currentRow = await this.#currentSessionForLifecycle(
        client,
        envelope.command.expected_review_session_ref.review_session_id,
      );
      if (currentRow === undefined) {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_SESSION_NOT_FOUND",
          "The requested ReviewSession is not registered.",
        );
      }
      const current = this.#stored(currentRow);
      if (current.project_id !== envelope.project_id) {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_PROJECT_MISMATCH",
          "The ReviewSession and refresh command must belong to the same Project.",
        );
      }
      const expected = envelope.command.expected_review_session_ref;
      if (
        current.review_session_id !== expected.review_session_id ||
        current.revision !== expected.revision ||
        current.content_hash !== expected.content_hash ||
        current.content.lifecycle !== expected.lifecycle
      ) {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_STALE_SESSION",
          "Refresh must name the exact current ReviewSession identity, revision, content hash, and lifecycle.",
        );
      }
      if (current.content.lifecycle !== "open") {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_LIFECYCLE_INVALID",
          "Refresh requires an open ReviewSession; deferred Reviews must be reopened first and completed Reviews cannot be refreshed.",
        );
      }
      if (current.schema_version !== "1.1.0") {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED",
          "Refresh currently supports only ReviewSession 1.1 working-state membership.",
        );
      }

      const authority = await this.#refreshAuthorityPosition(
        client,
        current.project_id,
      );
      const definition = await this.#requireRefreshDefinition(client, current);
      await this.#requireRefreshObjective(client, current);
      const members: ReviewSessionMemberV110[] = [];
      for (const member of current.content.members) {
        members.push(
          await this.#refreshMember(client, current, definition, member),
        );
      }
      const unchangedMembers = members.every(
        (member, index) =>
          canonicalize(member) === canonicalize(current.content.members[index]),
      );
      if (
        unchangedMembers &&
        current.content.snapshot.event_position === authority.event_position &&
        current.content.snapshot.stream_revision === authority.stream_revision
      ) {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_NOT_REQUIRED",
          "The exact ReviewSession already binds the current Project authority and current working heads.",
        );
      }

      const recordedAt = this.#now();
      const next = clone(current);
      next.revision += 1;
      next.content.snapshot = {
        ...clone(authority),
        captured_at: recordedAt,
      };
      next.content.members =
        members as PetraReviewSessionV110["content"]["members"];
      next.content_hash = canonicalHash(next.content);
      next.updated_at = recordedAt;
      this.#contracts.assertValid("review-session", "1.1.0", next);
      this.#assertBindings(next);
      const nextRecordHash = canonicalHash(next);
      const receipt = this.#refreshReceipt(
        envelope,
        fingerprint,
        current,
        currentRow.record_hash,
        next,
        nextRecordHash,
        recordedAt,
      );

      await this.#insertRefreshCommandExecution(
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
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_STALE_SESSION",
          "The ReviewSession head changed before refresh could commit.",
        );
      }
      await client.query("COMMIT");
      return {
        receipt: clone(receipt),
        reviewSession: clone(next),
        applied: true,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ReviewSessionRefreshAuthorityError) throw error;
      const pgError = error as PgError;
      if (pgError.code === "23514" || pgError.code === "23503") {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
          pgError.message ??
            "The refreshed ReviewSession no longer satisfies its exact registered bindings.",
        );
      }
      if (pgError.code === "40001" || pgError.code === "23505") {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_STALE_SESSION",
          pgError.message ??
            "The ReviewSession refresh conflicted with current state.",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async executeReviewSessionSeparationCommand(
    envelope: ReviewSessionSeparationCommandEnvelope,
  ): Promise<ReviewSessionSeparationCommandResult> {
    this.#contracts.assertValid("command-envelope", "1.9.0", envelope);
    if (envelope.command.command_name !== "SeparateReviewSessionMember") {
      throw this.#separationError(
        "REVIEW_SESSION_SEPARATION_INCOMPATIBLE_REVISION",
        "The ReviewSession separation boundary accepts only SeparateReviewSessionMember.",
      );
    }
    const fingerprint = commandFingerprint(envelope);
    const separatedReviewSessionId = this.#separatedReviewSessionId(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lockSeparationCommand(
        client,
        envelope,
        separatedReviewSessionId,
      );
      if (
        envelope.actor.actor_kind !== "human" ||
        this.#commandAuthorizer === undefined ||
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName: "SeparateReviewSessionMember",
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize human ReviewSession separation.`,
        );
      }
      const replay = await this.#replaySeparationCommand(
        client,
        envelope,
        fingerprint,
      );
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireSeparationCommandContext(client, envelope);

      const currentRow = await this.#currentSessionForLifecycle(
        client,
        envelope.command.expected_review_session_ref.review_session_id,
      );
      if (currentRow === undefined) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_SESSION_NOT_FOUND",
          "The requested ReviewSession is not registered.",
        );
      }
      const current = this.#stored(currentRow);
      if (current.project_id !== envelope.project_id) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_PROJECT_MISMATCH",
          "The ReviewSession and separation command must belong to the same Project.",
        );
      }
      const expected = envelope.command.expected_review_session_ref;
      if (
        current.review_session_id !== expected.review_session_id ||
        current.revision !== expected.revision ||
        current.content_hash !== expected.content_hash ||
        current.content.lifecycle !== expected.lifecycle
      ) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_STALE_SESSION",
          "Separation must name the exact current ReviewSession identity, revision, content hash, and lifecycle.",
        );
      }
      if (current.content.lifecycle !== "open") {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_LIFECYCLE_INVALID",
          "Separation requires an open ReviewSession.",
        );
      }
      if (current.schema_version !== "1.1.0") {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_PROFILE_UNSUPPORTED",
          "Separation currently supports only ReviewSession 1.1 canonical working-state membership.",
        );
      }
      if (current.content.members.length < 2) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_MEMBER_NOT_SEPARABLE",
          "An independently reviewable partition requires at least two members in the source ReviewSession.",
        );
      }
      const memberIndex = current.content.members.findIndex(
        (member) =>
          member.review_member_id === envelope.command.review_member_id,
      );
      if (memberIndex < 0) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_MEMBER_NOT_FOUND",
          "The requested Review member does not belong to the exact ReviewSession revision.",
        );
      }

      const authority = await this.#separationAuthorityPosition(
        client,
        current.project_id,
      );
      if (
        current.content.snapshot.event_position !== authority.event_position ||
        current.content.snapshot.stream_revision !== authority.stream_revision
      ) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_STALE_SESSION",
          "Separation requires a ReviewSession bound to the current Project authority; refresh it first.",
        );
      }
      await this.#requireSeparationDefinition(client, current);
      await this.#requireSeparationObjective(client, current);
      this.#assertUnambiguousSeparationMembership(current);
      await this.#assertSeparableChangeSets(client, current, memberIndex);

      const existingDestination = await client.query(
        `SELECT true
           FROM petra.review_sessions
          WHERE review_session_id = $1`,
        [separatedReviewSessionId],
      );
      if (existingDestination.rowCount !== 0) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_DESTINATION_CONFLICT",
          "The deterministic separated ReviewSession identity is already registered without this exact command result.",
        );
      }

      const recordedAt = this.#now();
      const selectedMember = clone(current.content.members[memberIndex]!);
      const retainedMembers = current.content.members
        .filter((_, index) => index !== memberIndex)
        .map((member) => clone(member));

      const source = clone(current);
      source.revision += 1;
      source.content.members =
        retainedMembers as PetraReviewSessionV110["content"]["members"];
      source.content_hash = canonicalHash(source.content);
      source.updated_at = recordedAt;

      const separated = clone(current);
      separated.review_session_id = separatedReviewSessionId;
      separated.revision = 1;
      separated.content.members = [selectedMember];
      separated.content_hash = canonicalHash(separated.content);
      separated.created_by = {
        actor_id: envelope.actor.actor_id,
        actor_kind: "human",
      };
      separated.created_at = recordedAt;
      separated.updated_at = recordedAt;

      this.#contracts.assertValid("review-session", "1.1.0", separated);
      this.#contracts.assertValid("review-session", "1.1.0", source);
      this.#assertBindings(source);
      this.#assertBindings(separated);
      const sourceRecordHash = canonicalHash(source);
      const separatedRecordHash = canonicalHash(separated);
      const receipt = this.#separationReceipt(
        envelope,
        fingerprint,
        current,
        currentRow.record_hash,
        source,
        sourceRecordHash,
        separated,
        separatedRecordHash,
        retainedMembers.map((member) => member.review_member_id),
        recordedAt,
      );

      await this.#insertSeparationCommandExecution(
        client,
        envelope,
        fingerprint,
        receipt,
        recordedAt,
      );
      await this.#insertRevision(client, source, sourceRecordHash);
      await client.query(
        `INSERT INTO petra.review_sessions (
           review_session_id, project_id, current_revision,
           created_by_actor_id, created_by_actor_kind, created_at
         ) VALUES ($1, $2, 1, $3, $4, $5::timestamptz)`,
        [
          separated.review_session_id,
          separated.project_id,
          separated.created_by.actor_id,
          separated.created_by.actor_kind,
          separated.created_at,
        ],
      );
      await this.#insertRevision(client, separated, separatedRecordHash);
      const advanced = await client.query(
        `UPDATE petra.review_sessions
            SET current_revision = $2
          WHERE review_session_id = $1
            AND project_id = $3
            AND current_revision = $4`,
        [
          source.review_session_id,
          source.revision,
          source.project_id,
          current.revision,
        ],
      );
      if (advanced.rowCount !== 1) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_STALE_SESSION",
          "The source ReviewSession head changed before separation could commit.",
        );
      }
      await client.query("COMMIT");
      return {
        receipt: clone(receipt),
        sourceReviewSession: clone(source),
        separatedReviewSession: clone(separated),
        applied: true,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ReviewSessionSeparationAuthorityError) throw error;
      if (error instanceof PostgresReviewSessionError) {
        throw this.#separationCorrupt(error.message);
      }
      const pgError = error as PgError;
      if (pgError.code === "23514" || pgError.code === "23503") {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_INCOMPATIBLE_REVISION",
          pgError.message ??
            "The separated ReviewSessions no longer satisfy their exact retained bindings.",
        );
      }
      if (pgError.code === "40001" || pgError.code === "23505") {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_STALE_SESSION",
          pgError.message ??
            "ReviewSession separation conflicted with current state.",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async executeReviewCandidateCorrectionCommand(
    envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope,
  ): Promise<ReviewCandidateCorrectionCommandResult> {
    this.#contracts.assertValid(
      "command-envelope",
      envelope.schema_version,
      envelope,
    );
    if (envelope.command.command_name !== "CorrectReviewCandidate") {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID",
        "The Review candidate-correction boundary accepts only CorrectReviewCandidate.",
      );
    }
    const fingerprint = commandFingerprint(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lockCorrectionCommand(client, envelope);
      if (
        this.#commandAuthorizer === undefined ||
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName: "CorrectReviewCandidate",
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize CorrectReviewCandidate.`,
        );
      }
      const replay = await this.#replayCorrectionCommand(
        client,
        envelope,
        fingerprint,
      );
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireReviewCommandContext(client, envelope, "correction");

      const currentRow = await this.#currentSessionForLifecycle(
        client,
        envelope.command.expected_review_session_ref.review_session_id,
      );
      if (currentRow === undefined) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_SESSION_NOT_FOUND",
          "The requested ReviewSession is not registered.",
        );
      }
      const current = this.#stored(currentRow);
      if (current.project_id !== envelope.project_id) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_PROJECT_MISMATCH",
          "The ReviewSession and candidate-correction command must belong to the same Project.",
        );
      }
      const expectedSession = envelope.command.expected_review_session_ref;
      if (
        current.review_session_id !== expectedSession.review_session_id ||
        current.revision !== expectedSession.revision ||
        current.content_hash !== expectedSession.content_hash ||
        current.content.lifecycle !== expectedSession.lifecycle
      ) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
          "Candidate correction must name the exact current ReviewSession identity, revision, content hash, and lifecycle.",
        );
      }
      if (current.content.lifecycle !== "open") {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_LIFECYCLE_INVALID",
          "Candidate correction requires an open ReviewSession.",
        );
      }
      if (
        current.schema_version !== "1.1.0" ||
        current.content.members.length !== 1
      ) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
          "The first candidate-correction adapter supports one working-state member in ReviewSession 1.1 only.",
        );
      }
      const member = current.content.members[0];
      if (
        member === undefined ||
        member.review_member_id !== envelope.command.review_member_id ||
        member.working_state.relationship_refs.length !== 1 ||
        member.candidate_bindings.length !== 2
      ) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_MEMBER_MISMATCH",
          "Candidate correction must name the one exact scientific Review member.",
        );
      }
      const memberCandidate = member.working_state.candidate_ref;
      const memberRelationship = member.working_state.relationship_refs[0];
      const expectedCandidate = envelope.command.expected_working_candidate_ref;
      const expectedRelationship =
        envelope.command.expected_working_relationship_ref;
      if (
        memberRelationship === undefined ||
        canonicalize(memberCandidate) !== canonicalize(expectedCandidate) ||
        canonicalize(memberRelationship) !== canonicalize(expectedRelationship)
      ) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
          "Candidate correction must bind the Review member's exact current WorkingCandidate and WorkingRelationship revisions.",
        );
      }

      const priorCandidateRow = await this.#correctionWorkingRecord(
        client,
        "candidate",
        current.project_id,
        expectedCandidate.working_candidate_id,
        expectedCandidate.revision,
      );
      const priorRelationshipRow = await this.#correctionWorkingRecord(
        client,
        "relationship",
        current.project_id,
        expectedRelationship.working_relationship_id,
        expectedRelationship.revision,
      );
      const priorCandidate = this.#storedCorrectionCandidate(priorCandidateRow);
      const priorRelationship =
        this.#storedCorrectionRelationship(priorRelationshipRow);
      if (
        priorCandidate.content_hash !== expectedCandidate.content_hash ||
        priorRelationship.content_hash !== expectedRelationship.content_hash
      ) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
          "The expected working references do not match their exact retained content.",
        );
      }

      const priorProfile = await this.#correctionClaim(
        client,
        current.project_id,
        priorCandidate.profile_object.object_record_ref,
      );
      const assertion = await this.#correctionAssertion(
        client,
        current.project_id,
        priorRelationship.profile_relationship.relationship_record_ref,
      );
      const prepared = this.#prepareCorrectionRecords(
        envelope,
        priorCandidate,
        priorCandidateRow.record_hash,
        priorProfile,
      );
      this.#assertCorrectionInput(
        prepared.candidate,
        prepared.profileRecord,
        current,
        member,
        priorCandidate,
        priorCandidateRow.record_hash,
        priorRelationship,
        priorProfile,
      );

      const candidate =
        await this.#workingState.admitWorkingCandidateRevisionInTransaction(
          client,
          {
            candidate: prepared.candidate,
            profileRecord: prepared.profileRecord,
          },
        );
      const recordedAt = this.#now();
      const relationship = this.#correctedRelationship(
        candidate,
        priorRelationship,
        priorRelationshipRow.record_hash,
        recordedAt,
      );
      await this.#workingState.admitWorkingRelationshipRevisionInTransaction(
        client,
        { relationship, profileRecord: assertion },
      );

      const authority = await this.#correctionAuthorityPosition(
        client,
        current.project_id,
      );
      const next = clone(current);
      next.revision += 1;
      next.content.snapshot = {
        ...clone(authority),
        captured_at: recordedAt,
      };
      const nextMember = next.content.members[0];
      if (nextMember === undefined) {
        throw this.#correctionCorrupt(
          "The retained single-member ReviewSession lost its member.",
        );
      }
      nextMember.working_state = {
        candidate_ref: {
          working_candidate_id: candidate.working_candidate_id,
          revision: candidate.revision,
          content_hash: candidate.content_hash,
        },
        relationship_refs: [
          {
            working_relationship_id: relationship.working_relationship_id,
            revision: relationship.revision,
            content_hash: relationship.content_hash,
          },
        ],
      };
      nextMember.candidate_bindings = nextMember.candidate_bindings.map(
        (binding) =>
          binding.binding_role === "candidate"
            ? {
                ...clone(binding),
                record_ref: {
                  record_id:
                    candidate.profile_object.object_record_ref.record_id,
                  revision: candidate.profile_object.object_record_ref.revision,
                  record_hash:
                    candidate.profile_object.object_record_ref.record_hash,
                },
              }
            : clone(binding),
      ) as ReviewSessionMemberV110["candidate_bindings"];
      next.content_hash = canonicalHash(next.content);
      next.updated_at = recordedAt;
      this.#contracts.assertValid("review-session", "1.1.0", next);
      this.#assertBindings(next);
      const nextRecordHash = canonicalHash(next);
      const receipt = this.#correctionReceipt(
        envelope,
        fingerprint,
        current,
        currentRow.record_hash,
        priorCandidate,
        priorCandidateRow.record_hash,
        candidate,
        priorRelationship,
        priorRelationshipRow.record_hash,
        relationship,
        priorProfile,
        next,
        nextRecordHash,
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
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
          "The ReviewSession head changed before candidate correction could commit.",
        );
      }
      await this.#insertCorrectionCommandExecution(
        client,
        envelope,
        fingerprint,
        receipt,
        recordedAt,
      );
      await client.query("COMMIT");
      return {
        receipt: clone(receipt),
        candidate: clone(candidate),
        profileRecord: clone(prepared.profileRecord),
        relationship: clone(relationship),
        reviewSession: clone(next),
        applied: true,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ReviewCandidateCorrectionAuthorityError) throw error;
      if (error instanceof PostgresWorkingStateError) {
        throw this.#mappedWorkingCorrectionError(error);
      }
      const pgError = error as PgError;
      if (pgError.code === "23514" || pgError.code === "23503") {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID",
          pgError.message ??
            "The corrected records do not satisfy their exact registered bindings.",
        );
      }
      if (pgError.code === "40001" || pgError.code === "23505") {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
          pgError.message ??
            "Candidate correction conflicted with current state.",
        );
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async executeReviewCandidateBasisRevisionCommand(
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
  ): Promise<ReviewCandidateBasisRevisionCommandResult> {
    this.#contracts.assertValid("command-envelope", "1.8.0", envelope);
    if (envelope.command.command_name !== "ReviseReviewCandidateBasis") {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
        "The Review candidate basis-revision boundary accepts only ReviseReviewCandidateBasis.",
      );
    }
    const fingerprint = commandFingerprint(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await this.#lockBasisRevisionCommand(client, envelope);
      if (
        this.#commandAuthorizer === undefined ||
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName: "ReviseReviewCandidateBasis",
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize ReviseReviewCandidateBasis.`,
        );
      }
      const replay = await this.#replayBasisRevisionCommand(
        client,
        envelope,
        fingerprint,
      );
      if (replay !== undefined) {
        await client.query("COMMIT");
        return replay;
      }
      await this.#requireReviewCommandContext(
        client,
        envelope,
        "basis_revision",
      );

      const currentRow = await this.#currentSessionForLifecycle(
        client,
        envelope.command.expected_review_session_ref.review_session_id,
      );
      if (currentRow === undefined) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_SESSION_NOT_FOUND",
          "The requested ReviewSession is not registered.",
        );
      }
      const current = this.#stored(currentRow);
      if (current.project_id !== envelope.project_id) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROJECT_MISMATCH",
          "The ReviewSession and basis-revision command must belong to the same Project.",
        );
      }
      const expectedSession = envelope.command.expected_review_session_ref;
      if (
        current.review_session_id !== expectedSession.review_session_id ||
        current.revision !== expectedSession.revision ||
        current.content_hash !== expectedSession.content_hash ||
        current.content.lifecycle !== expectedSession.lifecycle
      ) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
          "Basis revision must name the exact current ReviewSession identity, revision, content hash, and lifecycle.",
        );
      }
      if (current.content.lifecycle !== "open") {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_LIFECYCLE_INVALID",
          "Basis revision requires an open ReviewSession.",
        );
      }
      if (
        current.schema_version !== "1.1.0" ||
        current.content.members.length !== 1
      ) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
          "The first basis-revision adapter supports one working-state member in ReviewSession 1.1 only.",
        );
      }
      const member = current.content.members[0];
      if (
        member === undefined ||
        member.review_member_id !== envelope.command.review_member_id ||
        member.working_state.relationship_refs.length !== 1 ||
        member.candidate_bindings.length !== 2
      ) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_MEMBER_MISMATCH",
          "Basis revision must name the one exact scientific Review member.",
        );
      }
      const expectedCandidate = envelope.command.expected_working_candidate_ref;
      const expectedRelationship =
        envelope.command.expected_working_relationship_ref;
      const memberRelationship = member.working_state.relationship_refs[0];
      if (
        memberRelationship === undefined ||
        canonicalize(member.working_state.candidate_ref) !==
          canonicalize(expectedCandidate) ||
        canonicalize(memberRelationship) !== canonicalize(expectedRelationship)
      ) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
          "Basis revision must bind the Review member's exact current WorkingCandidate and WorkingRelationship revisions.",
        );
      }

      const priorCandidateRow = await this.#correctionWorkingRecord(
        client,
        "candidate",
        current.project_id,
        expectedCandidate.working_candidate_id,
        expectedCandidate.revision,
      );
      const priorRelationshipRow = await this.#correctionWorkingRecord(
        client,
        "relationship",
        current.project_id,
        expectedRelationship.working_relationship_id,
        expectedRelationship.revision,
      );
      const priorCandidate = this.#storedCorrectionCandidate(priorCandidateRow);
      const priorRelationship =
        this.#storedCorrectionRelationship(priorRelationshipRow);
      if (
        priorCandidate.content_hash !== expectedCandidate.content_hash ||
        priorRelationship.content_hash !== expectedRelationship.content_hash
      ) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
          "The expected working references do not match their exact retained content.",
        );
      }

      const priorProfile = await this.#correctionClaim(
        client,
        current.project_id,
        priorCandidate.profile_object.object_record_ref,
      );
      const assertion = await this.#correctionAssertion(
        client,
        current.project_id,
        priorRelationship.profile_relationship.relationship_record_ref,
      );
      const definition = await this.#basisRevisionDefinition(
        client,
        current,
        envelope,
      );
      const source = await this.#basisRevisionSource(client, current, envelope);
      const priorSpanRefs = this.#priorBasisSpanRefs(
        priorCandidate,
        priorProfile,
      );
      await this.#basisRevisionSourceSpans(
        client,
        source,
        priorSpanRefs,
        priorProfile.basis.basis_kind === "source"
          ? priorProfile.basis.source_scope
          : "full_text",
      );
      await this.#basisRevisionSourceSpans(
        client,
        source,
        envelope.command.basis_revision_input.source_span_refs,
        envelope.command.basis_revision_input.source_scope,
      );
      const prepared = this.#prepareBasisRevisionRecords(
        envelope,
        definition,
        source,
        priorCandidate,
        priorCandidateRow.record_hash,
        priorProfile,
      );
      this.#assertBasisRevisionInput(
        envelope,
        prepared.candidate,
        prepared.profileRecord,
        current,
        member,
        priorCandidate,
        priorCandidateRow.record_hash,
        priorRelationship,
        priorProfile,
        assertion,
        source,
        definition,
      );

      const candidate =
        await this.#workingState.admitWorkingCandidateRevisionInTransaction(
          client,
          {
            candidate: prepared.candidate,
            profileRecord: prepared.profileRecord,
          },
        );
      const recordedAt = this.#now();
      const relationship = this.#correctedRelationship(
        candidate,
        priorRelationship,
        priorRelationshipRow.record_hash,
        recordedAt,
        "basis_revision",
      );
      await this.#workingState.admitWorkingRelationshipRevisionInTransaction(
        client,
        { relationship, profileRecord: assertion },
      );

      const authority = await this.#correctionAuthorityPosition(
        client,
        current.project_id,
      );
      const next = clone(current);
      next.revision += 1;
      next.content.snapshot = { ...clone(authority), captured_at: recordedAt };
      const nextMember = next.content.members[0];
      if (nextMember === undefined) {
        throw this.#basisRevisionCorrupt(
          "The retained single-member ReviewSession lost its member.",
        );
      }
      nextMember.working_state = {
        candidate_ref: {
          working_candidate_id: candidate.working_candidate_id,
          revision: candidate.revision,
          content_hash: candidate.content_hash,
        },
        relationship_refs: [
          {
            working_relationship_id: relationship.working_relationship_id,
            revision: relationship.revision,
            content_hash: relationship.content_hash,
          },
        ],
      };
      nextMember.candidate_bindings = nextMember.candidate_bindings.map(
        (binding) =>
          binding.binding_role === "candidate"
            ? {
                ...clone(binding),
                record_ref: {
                  record_id:
                    candidate.profile_object.object_record_ref.record_id,
                  revision: candidate.profile_object.object_record_ref.revision,
                  record_hash:
                    candidate.profile_object.object_record_ref.record_hash,
                },
              }
            : clone(binding),
      ) as ReviewSessionMemberV110["candidate_bindings"];
      next.content_hash = canonicalHash(next.content);
      next.updated_at = recordedAt;
      this.#contracts.assertValid("review-session", "1.1.0", next);
      this.#assertBindings(next);
      const nextRecordHash = canonicalHash(next);
      const receipt = this.#basisRevisionReceipt(
        envelope,
        fingerprint,
        current,
        currentRow.record_hash,
        priorCandidate,
        priorCandidateRow.record_hash,
        candidate,
        priorRelationship,
        priorRelationshipRow.record_hash,
        relationship,
        priorProfile,
        prepared.profileRecord,
        definition,
        source,
        priorSpanRefs,
        next,
        nextRecordHash,
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
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
          "The ReviewSession head changed before basis revision could commit.",
        );
      }
      await this.#insertBasisRevisionCommandExecution(
        client,
        envelope,
        fingerprint,
        receipt,
        recordedAt,
      );
      await client.query("COMMIT");
      return {
        receipt: clone(receipt),
        candidate: clone(candidate),
        profileRecord: clone(prepared.profileRecord),
        relationship: clone(relationship),
        reviewSession: clone(next),
        applied: true,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof ReviewCandidateBasisRevisionAuthorityError)
        throw error;
      if (error instanceof ReviewCandidateCorrectionAuthorityError) {
        throw this.#mappedCorrectionBasisRevisionError(error);
      }
      if (error instanceof PostgresWorkingStateError) {
        throw this.#mappedWorkingBasisRevisionError(error);
      }
      const pgError = error as PgError;
      if (pgError.code === "23514" || pgError.code === "23503") {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
          pgError.message ??
            "The basis revision does not satisfy its exact registered source bindings.",
        );
      }
      if (pgError.code === "40001" || pgError.code === "23505") {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
          pgError.message ?? "Basis revision conflicted with current state.",
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

  async #requireSeparationCommandContext(
    client: PoolClient,
    envelope: ReviewSessionSeparationCommandEnvelope,
  ): Promise<void> {
    const result = await client.query<{ actor_kind: string }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [envelope.project_id, envelope.actor.actor_id],
    );
    if (
      result.rows[0]?.actor_kind !== "human" ||
      envelope.actor.actor_kind !== "human"
    ) {
      throw this.#separationError(
        "REVIEW_SESSION_SEPARATION_PROJECT_MISMATCH",
        "The separation Project and human Actor must resolve exactly in local authority.",
      );
    }
  }

  async #separationAuthorityPosition(
    client: PoolClient,
    projectId: string,
  ): Promise<{ event_position: number; stream_revision: number }> {
    const result = await client.query<AuthorityPositionRow>(
      `SELECT authority.event_position,
              stream.current_stream_revision AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton
        FOR SHARE OF authority`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#separationCorrupt(
        "The PostgreSQL authority position is unavailable for Review separation.",
      );
    }
    return {
      event_position: Number(row.event_position),
      stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  async #requireSeparationDefinition(
    client: PoolClient,
    session: PetraReviewSessionV110,
  ): Promise<void> {
    const ref = session.project_definition_ref;
    const result = await client.query<CurrentDefinitionRow>(
      `SELECT revision.payload, revision.record_hash,
              head.definition_family
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.project_definition_id = $2
          AND head.current_revision = $3
          AND revision.content_hash = $4
        FOR SHARE OF head`,
      [
        session.project_id,
        ref.project_definition_id,
        ref.revision,
        ref.content_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#separationError(
        "REVIEW_SESSION_SEPARATION_INCOMPATIBLE_REVISION",
        "Separation requires the ReviewSession's exact ProjectDefinition to remain current.",
      );
    }
    if (row.definition_family !== "petra.scientific-evidence") {
      throw this.#separationError(
        "REVIEW_SESSION_SEPARATION_PROFILE_UNSUPPORTED",
        "The first persisted Review separation adapter supports only the registered scientific-evidence profile.",
      );
    }
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = clone(row.payload as PetraProjectDefinition);
    if (
      row.record_hash !== canonicalHash(definition) ||
      definition.content_hash !== canonicalHash(definition.content) ||
      definition.project_id !== session.project_id ||
      definition.project_definition_id !== ref.project_definition_id ||
      definition.revision !== ref.revision ||
      definition.content_hash !== ref.content_hash ||
      definition.definition_family !== row.definition_family
    ) {
      throw this.#separationCorrupt(
        "The current ProjectDefinition does not match its exact ReviewSession binding.",
      );
    }
  }

  async #requireSeparationObjective(
    client: PoolClient,
    session: PetraReviewSessionV110,
  ): Promise<void> {
    const ref = session.content.objective_ref;
    const result = await client.query(
      `SELECT true
         FROM petra.project_objectives AS head
         JOIN petra.project_objective_revisions AS revision
           ON revision.objective_id = head.objective_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.objective_id = $2
          AND head.current_revision = $3
          AND revision.content_hash = $4
        FOR SHARE OF head`,
      [session.project_id, ref.objective_id, ref.revision, ref.content_hash],
    );
    if (result.rowCount !== 1) {
      throw this.#separationError(
        "REVIEW_SESSION_SEPARATION_INCOMPATIBLE_REVISION",
        "Separation requires the ReviewSession's exact Objective to remain current.",
      );
    }
  }

  #assertUnambiguousSeparationMembership(
    session: PetraReviewSessionV110,
  ): void {
    const profileOwners = new Map<string, string>();
    for (const member of session.content.members) {
      for (const binding of member.candidate_bindings) {
        const existing = profileOwners.get(binding.record_ref.record_id);
        if (existing !== undefined && existing !== member.review_member_id) {
          throw this.#separationError(
            "REVIEW_SESSION_SEPARATION_AMBIGUOUS_MEMBERSHIP",
            "One profile record is owned by more than one Review member, so Petra cannot separate an exact semantic unit.",
          );
        }
        profileOwners.set(
          binding.record_ref.record_id,
          member.review_member_id,
        );
      }
    }
  }

  async #assertSeparableChangeSets(
    client: PoolClient,
    session: PetraReviewSessionV110,
    selectedMemberIndex: number,
  ): Promise<void> {
    const recordOwners = new Map<string, string>();
    for (const member of session.content.members) {
      for (const binding of member.candidate_bindings) {
        recordOwners.set(binding.record_ref.record_id, member.review_member_id);
      }
    }
    const selectedMemberId =
      session.content.members[selectedMemberIndex]!.review_member_id;
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.change_sets
        WHERE project_id = $1
        FOR SHARE`,
      [session.project_id],
    );
    for (const row of result.rows) {
      const version = (row.payload as { schema_version?: unknown })
        .schema_version;
      if (version !== "1.0.0" && version !== "1.1.0") {
        throw this.#separationCorrupt(
          "A stored ChangeSet has an unsupported schema version during Review separation.",
        );
      }
      this.#contracts.assertValid("change-set", version, row.payload);
      const changeSet = clone(row.payload as PetraChangeSetRecord);
      if (
        row.record_hash !== canonicalHash(changeSet) ||
        changeSet.content_hash !== canonicalHash(changeSet.content)
      ) {
        throw this.#separationCorrupt(
          "A stored ChangeSet has invalid canonical hashes during Review separation.",
        );
      }
      const targetOwners = changeSet.content.operations.map((operation) =>
        recordOwners.get(operation.target_id),
      );
      const representedOwners = new Set(
        targetOwners.filter((owner): owner is string => owner !== undefined),
      );
      if (representedOwners.size === 0) continue;
      if (
        representedOwners.size > 1 ||
        targetOwners.some((owner) => owner === undefined)
      ) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_ATOMICITY_INCOMPATIBLE",
          "An existing atomic ChangeSet crosses or extends beyond the requested Review-member partition.",
        );
      }
      const owner = [...representedOwners][0]!;
      const owningMember = session.content.members.find(
        (member) => member.review_member_id === owner,
      );
      if (owningMember === undefined) {
        throw this.#separationCorrupt(
          "A ChangeSet owner disappeared from the exact ReviewSession membership.",
        );
      }
      const ownedTargets = new Set(
        owningMember.candidate_bindings.map(
          (binding) => binding.record_ref.record_id,
        ),
      );
      if (
        changeSet.content.operations.length !== ownedTargets.size ||
        changeSet.content.operations.some(
          (operation) => !ownedTargets.has(operation.target_id),
        )
      ) {
        const partition = owner === selectedMemberId ? "selected" : "retained";
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_ATOMICITY_INCOMPATIBLE",
          `The ${partition} Review member does not own the complete existing ChangeSet semantic unit.`,
        );
      }
    }
  }

  async #lockRefreshCommand(
    client: PoolClient,
    envelope: ReviewSessionRefreshCommandEnvelope,
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

  async #replayRefreshCommand(
    client: PoolClient,
    envelope: ReviewSessionRefreshCommandEnvelope,
    fingerprint: string,
  ): Promise<ReviewSessionRefreshCommandResult | undefined> {
    const byIdempotency = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE idempotency_key = $1`,
      [envelope.idempotency_key],
    );
    const idempotent = byIdempotency.rows[0];
    if (idempotent !== undefined) {
      if (idempotent.command_fingerprint !== fingerprint) {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different command content.",
        );
      }
      return this.#replayedRefreshResult(client, idempotent);
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
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_COMMAND_ID_REUSED",
        "The command identity is already bound to different command content.",
      );
    }
    return this.#replayedRefreshResult(client, command);
  }

  async #replayedRefreshResult(
    client: PoolClient,
    row: CommandExecutionRow,
  ): Promise<ReviewSessionRefreshCommandResult> {
    const receipt = this.#storedRefreshReceipt(row.result);
    if (receipt.content.command_ref.command_id !== row.command_id) {
      throw this.#refreshCorrupt(
        "A retained ReviewSession refresh result has a different command identity.",
      );
    }
    const expected = receipt.content.resulting_review_session_ref;
    const sessionRow = await this.#sessionRevision(
      client,
      expected.review_session_id,
      expected.revision,
    );
    if (sessionRow === undefined) {
      throw this.#refreshCorrupt(
        "A persisted ReviewSession refresh command lost its resulting revision.",
      );
    }
    const reviewSession = this.#stored(sessionRow);
    if (
      reviewSession.schema_version !== "1.1.0" ||
      reviewSession.project_id !== receipt.project_id ||
      reviewSession.content_hash !== expected.content_hash ||
      reviewSession.content.lifecycle !== "open" ||
      sessionRow.record_hash !== expected.record_hash
    ) {
      throw this.#refreshCorrupt(
        "The retained refresh result no longer resolves its exact ReviewSession revision.",
      );
    }
    return { receipt, reviewSession, applied: false };
  }

  #separatedReviewSessionId(
    envelope: ReviewSessionSeparationCommandEnvelope,
  ): string {
    const expected = envelope.command.expected_review_session_ref;
    return derivePetraId(
      "review_session",
      `${expected.review_session_id}|${expected.revision}|${expected.content_hash}|${envelope.command.review_member_id}|separated`,
    );
  }

  async #lockSeparationCommand(
    client: PoolClient,
    envelope: ReviewSessionSeparationCommandEnvelope,
    separatedReviewSessionId: string,
  ): Promise<void> {
    const keys = [
      `command:${envelope.command_id}`,
      `idempotency:${envelope.idempotency_key}`,
      `project:${envelope.project_id}`,
      `review-session:${envelope.command.expected_review_session_ref.review_session_id}`,
      `review-session:${separatedReviewSessionId}`,
    ].sort();
    for (const key of keys) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #replaySeparationCommand(
    client: PoolClient,
    envelope: ReviewSessionSeparationCommandEnvelope,
    fingerprint: string,
  ): Promise<ReviewSessionSeparationCommandResult | undefined> {
    const byIdempotency = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE idempotency_key = $1`,
      [envelope.idempotency_key],
    );
    const idempotent = byIdempotency.rows[0];
    if (idempotent !== undefined) {
      if (idempotent.command_fingerprint !== fingerprint) {
        throw this.#separationError(
          "REVIEW_SESSION_SEPARATION_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different separation content.",
        );
      }
      return this.#replayedSeparationResult(client, idempotent);
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
      throw this.#separationError(
        "REVIEW_SESSION_SEPARATION_COMMAND_ID_REUSED",
        "The command identity is already bound to different separation content.",
      );
    }
    return this.#replayedSeparationResult(client, command);
  }

  async #replayedSeparationResult(
    client: PoolClient,
    row: CommandExecutionRow,
  ): Promise<ReviewSessionSeparationCommandResult> {
    const receipt = this.#storedSeparationReceipt(row.result);
    if (receipt.content.command_ref.command_id !== row.command_id) {
      throw this.#separationCorrupt(
        "A retained ReviewSession separation result has a different command identity.",
      );
    }
    const sourceRef = receipt.content.source_resulting_review_session_ref;
    const separatedRef = receipt.content.separated_review_session_ref;
    const sourceRow = await this.#sessionRevision(
      client,
      sourceRef.review_session_id,
      sourceRef.revision,
    );
    const separatedRow = await this.#sessionRevision(
      client,
      separatedRef.review_session_id,
      separatedRef.revision,
    );
    if (sourceRow === undefined || separatedRow === undefined) {
      throw this.#separationCorrupt(
        "A persisted separation command lost one of its resulting ReviewSession revisions.",
      );
    }
    const sourceReviewSession = this.#stored(sourceRow);
    const separatedReviewSession = this.#stored(separatedRow);
    if (
      sourceReviewSession.schema_version !== "1.1.0" ||
      separatedReviewSession.schema_version !== "1.1.0" ||
      sourceReviewSession.project_id !== receipt.project_id ||
      separatedReviewSession.project_id !== receipt.project_id ||
      sourceReviewSession.content_hash !== sourceRef.content_hash ||
      separatedReviewSession.content_hash !== separatedRef.content_hash ||
      sourceReviewSession.content.lifecycle !== "open" ||
      separatedReviewSession.content.lifecycle !== "open" ||
      sourceRow.record_hash !== sourceRef.record_hash ||
      separatedRow.record_hash !== separatedRef.record_hash
    ) {
      throw this.#separationCorrupt(
        "The retained separation result no longer resolves its exact ReviewSession revisions.",
      );
    }
    const separatedMemberId =
      receipt.content.partition.separated_review_member_id;
    if (
      separatedReviewSession.content.members.length !== 1 ||
      separatedReviewSession.content.members[0]?.review_member_id !==
        separatedMemberId ||
      canonicalize(
        sourceReviewSession.content.members.map(
          (member) => member.review_member_id,
        ),
      ) !== canonicalize(receipt.content.partition.retained_review_member_ids)
    ) {
      throw this.#separationCorrupt(
        "The retained separation partition no longer matches its exact Review members.",
      );
    }
    return {
      receipt,
      sourceReviewSession,
      separatedReviewSession,
      applied: false,
    };
  }

  async #lockCorrectionCommand(
    client: PoolClient,
    envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope,
  ): Promise<void> {
    const keys = [
      `command:${envelope.command_id}`,
      `idempotency:${envelope.idempotency_key}`,
      `project:${envelope.project_id}`,
      `review-session:${envelope.command.expected_review_session_ref.review_session_id}`,
      envelope.command.expected_working_candidate_ref.working_candidate_id,
      envelope.command.expected_working_relationship_ref
        .working_relationship_id,
    ].sort();
    for (const key of keys) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #lockBasisRevisionCommand(
    client: PoolClient,
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
  ): Promise<void> {
    const keys = [
      `command:${envelope.command_id}`,
      `idempotency:${envelope.idempotency_key}`,
      `project:${envelope.project_id}`,
      `review-session:${envelope.command.expected_review_session_ref.review_session_id}`,
      envelope.command.expected_working_candidate_ref.working_candidate_id,
      envelope.command.expected_working_relationship_ref
        .working_relationship_id,
      envelope.command.expected_claim_ref.record_id,
      envelope.command.basis_revision_input.project_source_ref
        .project_source_id,
      ...envelope.command.basis_revision_input.source_span_refs.map(
        (ref) => ref.record_id,
      ),
    ].sort();
    for (const key of keys) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #replayBasisRevisionCommand(
    client: PoolClient,
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
    fingerprint: string,
  ): Promise<ReviewCandidateBasisRevisionCommandResult | undefined> {
    const byIdempotency = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE idempotency_key = $1`,
      [envelope.idempotency_key],
    );
    const idempotent = byIdempotency.rows[0];
    if (idempotent !== undefined) {
      if (idempotent.command_fingerprint !== fingerprint) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different basis-revision content.",
        );
      }
      return this.#replayedBasisRevisionResult(client, idempotent);
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
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_ID_REUSED",
        "The command identity is already bound to different basis-revision content.",
      );
    }
    return this.#replayedBasisRevisionResult(client, command);
  }

  async #replayedBasisRevisionResult(
    client: PoolClient,
    row: CommandExecutionRow,
  ): Promise<ReviewCandidateBasisRevisionCommandResult> {
    const receipt = this.#storedBasisRevisionReceipt(row.result);
    if (receipt.content.command_ref.command_id !== row.command_id) {
      throw this.#basisRevisionCorrupt(
        "A retained candidate basis-revision result has a different command identity.",
      );
    }
    const sessionRef = receipt.content.resulting_review_session_ref;
    const sessionRow = await this.#sessionRevision(
      client,
      sessionRef.review_session_id,
      sessionRef.revision,
    );
    const candidateRef = receipt.content.resulting_candidate_ref;
    const candidateRow = await this.#correctionWorkingRecord(
      client,
      "candidate",
      receipt.project_id,
      candidateRef.record_id,
      candidateRef.revision,
      false,
    );
    const relationshipRef = receipt.content.resulting_relationship_ref;
    const relationshipRow = await this.#correctionWorkingRecord(
      client,
      "relationship",
      receipt.project_id,
      relationshipRef.record_id,
      relationshipRef.revision,
      false,
    );
    const profileRecord = await this.#correctionClaim(
      client,
      receipt.project_id,
      receipt.content.resulting_profile_record_ref,
      false,
    );
    if (sessionRow === undefined) {
      throw this.#basisRevisionCorrupt(
        "A persisted candidate basis revision lost its resulting ReviewSession revision.",
      );
    }
    const reviewSession = this.#stored(sessionRow);
    const candidate = this.#storedCorrectionCandidate(candidateRow);
    const relationship = this.#storedCorrectionRelationship(relationshipRow);
    if (
      reviewSession.schema_version !== "1.1.0" ||
      reviewSession.project_id !== receipt.project_id ||
      reviewSession.content_hash !== sessionRef.content_hash ||
      sessionRow.record_hash !== sessionRef.record_hash ||
      candidate.content_hash !== candidateRef.content_hash ||
      candidateRow.record_hash !== candidateRef.record_hash ||
      relationship.content_hash !== relationshipRef.content_hash ||
      relationshipRow.record_hash !== relationshipRef.record_hash ||
      canonicalHash(profileRecord) !==
        receipt.content.resulting_profile_record_ref.record_hash
    ) {
      throw this.#basisRevisionCorrupt(
        "The retained basis-revision result no longer resolves its exact working and Review revisions.",
      );
    }
    return {
      receipt,
      candidate,
      profileRecord,
      relationship,
      reviewSession,
      applied: false,
    };
  }

  async #replayCorrectionCommand(
    client: PoolClient,
    envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope,
    fingerprint: string,
  ): Promise<ReviewCandidateCorrectionCommandResult | undefined> {
    const byIdempotency = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, result
         FROM petra.command_executions
        WHERE idempotency_key = $1`,
      [envelope.idempotency_key],
    );
    const idempotent = byIdempotency.rows[0];
    if (idempotent !== undefined) {
      if (idempotent.command_fingerprint !== fingerprint) {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different correction content.",
        );
      }
      return this.#replayedCorrectionResult(client, idempotent);
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
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_COMMAND_ID_REUSED",
        "The command identity is already bound to different correction content.",
      );
    }
    return this.#replayedCorrectionResult(client, command);
  }

  async #replayedCorrectionResult(
    client: PoolClient,
    row: CommandExecutionRow,
  ): Promise<ReviewCandidateCorrectionCommandResult> {
    const receipt = this.#storedCorrectionReceipt(row.result);
    if (receipt.content.command_ref.command_id !== row.command_id) {
      throw this.#correctionCorrupt(
        "A retained candidate-correction result has a different command identity.",
      );
    }
    const sessionRef = receipt.content.resulting_review_session_ref;
    const sessionRow = await this.#sessionRevision(
      client,
      sessionRef.review_session_id,
      sessionRef.revision,
    );
    const candidateRef = receipt.content.resulting_candidate_ref;
    const candidateRow = await this.#correctionWorkingRecord(
      client,
      "candidate",
      receipt.project_id,
      candidateRef.record_id,
      candidateRef.revision,
      false,
    );
    const relationshipRef = receipt.content.resulting_relationship_ref;
    const relationshipRow = await this.#correctionWorkingRecord(
      client,
      "relationship",
      receipt.project_id,
      relationshipRef.record_id,
      relationshipRef.revision,
      false,
    );
    const profileRecord = await this.#correctionClaim(
      client,
      receipt.project_id,
      receipt.content.resulting_profile_record_ref,
      false,
    );
    if (sessionRow === undefined) {
      throw this.#correctionCorrupt(
        "A persisted candidate correction lost its resulting ReviewSession revision.",
      );
    }
    const reviewSession = this.#stored(sessionRow);
    const candidate = this.#storedCorrectionCandidate(candidateRow);
    const relationship = this.#storedCorrectionRelationship(relationshipRow);
    if (
      reviewSession.schema_version !== "1.1.0" ||
      reviewSession.project_id !== receipt.project_id ||
      reviewSession.content_hash !== sessionRef.content_hash ||
      sessionRow.record_hash !== sessionRef.record_hash ||
      candidate.content_hash !== candidateRef.content_hash ||
      candidateRow.record_hash !== candidateRef.record_hash ||
      relationship.content_hash !== relationshipRef.content_hash ||
      relationshipRow.record_hash !== relationshipRef.record_hash ||
      canonicalHash(profileRecord) !==
        receipt.content.resulting_profile_record_ref.record_hash
    ) {
      throw this.#correctionCorrupt(
        "The retained correction result no longer resolves its exact working and Review revisions.",
      );
    }
    return {
      receipt,
      candidate,
      profileRecord,
      relationship,
      reviewSession,
      applied: false,
    };
  }

  async #correctionWorkingRecord(
    client: PoolClient,
    kind: "candidate" | "relationship",
    projectId: string,
    id: string,
    revision: number,
    requireCurrent = true,
  ): Promise<StoredRow> {
    const headTable =
      kind === "candidate" ? "working_candidates" : "working_relationships";
    const revisionTable =
      kind === "candidate"
        ? "working_candidate_revisions"
        : "working_relationship_revisions";
    const idColumn =
      kind === "candidate" ? "working_candidate_id" : "working_relationship_id";
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.${headTable} AS head
         JOIN petra.${revisionTable} AS revision
           ON revision.${idColumn} = head.${idColumn}
          AND revision.revision = $3
        WHERE head.project_id = $1
          AND head.${idColumn} = $2
          AND ($4::boolean = false OR head.current_revision = $3)
        FOR UPDATE OF head`,
      [projectId, id, revision, requireCurrent],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
        `The expected Working${kind === "candidate" ? "Candidate" : "Relationship"} revision is missing or no longer current.`,
      );
    }
    return row;
  }

  #storedCorrectionCandidate(row: StoredRow): PetraWorkingCandidate {
    this.#contracts.assertValid("working-candidate", "1.0.0", row.payload);
    const candidate = clone(row.payload as PetraWorkingCandidate);
    if (
      row.record_hash !== canonicalHash(candidate) ||
      candidate.content_hash !== workingContentHash(candidate)
    ) {
      throw this.#correctionCorrupt(
        "A stored WorkingCandidate does not match its canonical hashes.",
      );
    }
    return candidate;
  }

  #storedCorrectionRelationship(row: StoredRow): PetraWorkingRelationship {
    this.#contracts.assertValid("working-relationship", "1.0.0", row.payload);
    const relationship = clone(row.payload as PetraWorkingRelationship);
    if (
      row.record_hash !== canonicalHash(relationship) ||
      relationship.content_hash !== workingContentHash(relationship)
    ) {
      throw this.#correctionCorrupt(
        "A stored WorkingRelationship does not match its canonical hashes.",
      );
    }
    return relationship;
  }

  async #correctionClaim(
    client: PoolClient,
    projectId: string,
    ref: {
      schema_name: string;
      schema_version: string;
      record_id: string;
      revision: number;
      record_hash: string;
    },
    requireCurrent = true,
  ): Promise<PetraClaim> {
    if (ref.schema_name !== "petra.claim" || ref.schema_version !== "1.0.0") {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
        "The first candidate-correction adapter accepts a registered scientific Claim only.",
      );
    }
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.evidence_entities AS head
         JOIN petra.evidence_entity_revisions AS revision
           ON revision.evidence_id = head.evidence_id
          AND revision.evidence_kind = head.evidence_kind
          AND revision.revision = $3
        WHERE head.evidence_id = $1
          AND revision.evidence_kind = 'claim'
          AND revision.record_hash = $2
          AND ($4::boolean = false OR head.current_revision = $3)
          AND EXISTS (
            SELECT 1
              FROM petra.claim_revisions AS claim
              JOIN petra.project_source_revisions AS source
                ON source.work_version_id = claim.source_work_version_id
             WHERE claim.claim_id = revision.evidence_id
               AND claim.revision = revision.revision
               AND source.project_id = $5
          )
        FOR SHARE OF head`,
      [ref.record_id, ref.record_hash, ref.revision, requireCurrent, projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
        "The exact Project-scoped scientific Claim is missing, mismatched, or no longer current.",
      );
    }
    this.#contracts.assertValid("claim", "1.0.0", row.payload);
    const claim = clone(row.payload as PetraClaim);
    if (row.record_hash !== canonicalHash(claim)) {
      throw this.#correctionCorrupt(
        "A stored scientific Claim does not match its canonical record hash.",
      );
    }
    return claim;
  }

  async #correctionAssertion(
    client: PoolClient,
    projectId: string,
    ref: PetraWorkingRelationship["profile_relationship"]["relationship_record_ref"],
  ): Promise<PetraAssertion> {
    if (
      ref.schema_name !== "petra.assertion" ||
      ref.schema_version !== "1.0.0"
    ) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
        "The first candidate-correction adapter requires the registered scientific ASSERTS record.",
      );
    }
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.evidence_entities AS head
         JOIN petra.evidence_entity_revisions AS revision
           ON revision.evidence_id = head.evidence_id
          AND revision.evidence_kind = head.evidence_kind
          AND revision.revision = head.current_revision
        WHERE head.evidence_id = $1
          AND revision.evidence_kind = 'assertion'
          AND revision.revision = $2
          AND revision.record_hash = $3
          AND EXISTS (
            SELECT 1
              FROM petra.assertion_revisions AS assertion
              JOIN petra.project_source_revisions AS source
                ON source.work_version_id = assertion.subject_id
             WHERE assertion.assertion_id = revision.evidence_id
               AND assertion.revision = revision.revision
               AND assertion.predicate = 'ASSERTS'
               AND source.project_id = $4
          )
        FOR SHARE OF head`,
      [ref.record_id, ref.revision, ref.record_hash, projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
        "The Review member's exact Project-scoped ASSERTS record is missing, mismatched, or no longer current.",
      );
    }
    this.#contracts.assertValid("assertion", "1.0.0", row.payload);
    const assertion = clone(row.payload as PetraAssertion);
    if (row.record_hash !== canonicalHash(assertion)) {
      throw this.#correctionCorrupt(
        "A stored scientific Assertion does not match its canonical record hash.",
      );
    }
    return assertion;
  }

  async #basisRevisionDefinition(
    client: PoolClient,
    session: PetraReviewSessionV110,
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
  ): Promise<PetraProjectDefinition> {
    const ref = envelope.command.expected_project_definition_ref;
    const result = await client.query<CurrentDefinitionRow>(
      `SELECT revision.payload, revision.record_hash,
              head.definition_family
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.project_definition_id = $2
          AND head.current_revision = $3
          AND revision.content_hash = $4
        FOR SHARE OF head`,
      [
        session.project_id,
        ref.project_definition_id,
        ref.revision,
        ref.content_hash,
      ],
    );
    const row = result.rows[0];
    if (
      row === undefined ||
      row.definition_family !== ref.definition_family ||
      ref.project_definition_id !==
        session.project_definition_ref.project_definition_id ||
      ref.revision !== session.project_definition_ref.revision ||
      ref.content_hash !== session.project_definition_ref.content_hash
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
        "Basis revision requires the ReviewSession's exact current ProjectDefinition revision, family, and content hash.",
      );
    }
    if (row.definition_family !== "petra.scientific-evidence") {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
        "The first basis-revision adapter supports only the registered scientific-evidence profile.",
      );
    }
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = clone(row.payload as PetraProjectDefinition);
    if (
      row.record_hash !== canonicalHash(definition) ||
      definition.content_hash !== canonicalHash(definition.content) ||
      definition.project_id !== session.project_id ||
      definition.project_definition_id !== ref.project_definition_id ||
      definition.revision !== ref.revision ||
      definition.content_hash !== ref.content_hash ||
      definition.definition_family !== ref.definition_family
    ) {
      throw this.#basisRevisionCorrupt(
        "The current ProjectDefinition does not match its exact basis-revision binding.",
      );
    }
    return definition;
  }

  async #basisRevisionSource(
    client: PoolClient,
    session: PetraReviewSessionV110,
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
  ): Promise<{ record: PetraProjectSource; row: ProjectSourceRow }> {
    const ref = envelope.command.basis_revision_input.project_source_ref;
    const result = await client.query<ProjectSourceRow>(
      `SELECT revision.payload, revision.record_hash,
              revision.content_hash, revision.work_version_id,
              revision.artifact_manifest_id, revision.status
         FROM petra.project_sources AS head
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = head.project_source_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.project_source_id = $2
          AND head.current_revision = $3
          AND revision.content_hash = $4
          AND revision.record_hash = $5
          AND revision.status = 'active'
        FOR SHARE OF head`,
      [
        session.project_id,
        ref.project_source_id,
        ref.revision,
        ref.content_hash,
        ref.record_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined || row.status !== ref.status) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
        "The replacement basis must name one exact current active ProjectSource under the Review's ProjectDefinition.",
      );
    }
    this.#contracts.assertValid("project-source", "1.0.0", row.payload);
    const record = clone(row.payload as PetraProjectSource);
    if (
      row.record_hash !== canonicalHash(record) ||
      record.content_hash !== canonicalHash(record.content) ||
      record.project_id !== session.project_id ||
      record.project_source_id !== ref.project_source_id ||
      record.revision !== ref.revision ||
      record.content_hash !== ref.content_hash ||
      record.content.status !== "active"
    ) {
      throw this.#basisRevisionCorrupt(
        "The current ProjectSource does not match its exact basis-revision hashes and identity.",
      );
    }
    return { record, row };
  }

  async #basisRevisionSourceSpans(
    client: PoolClient,
    source: { record: PetraProjectSource; row: ProjectSourceRow },
    refs: readonly [
      {
        schema_name: "petra.source-span";
        schema_version: "1.0.0";
        record_id: string;
        revision: 1;
        record_hash: string;
      },
      ...Array<{
        schema_name: "petra.source-span";
        schema_version: "1.0.0";
        record_id: string;
        revision: 1;
        record_hash: string;
      }>,
    ],
    sourceScope: "full_text" | "abstract_only",
  ): Promise<void> {
    const seen = new Set<string>();
    for (const ref of refs) {
      if (seen.has(ref.record_id)) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
          "A scientific basis revision cannot repeat a SourceSpan identity.",
        );
      }
      seen.add(ref.record_id);
      const result = await client.query<SourceSpanRow>(
        `SELECT span.source_span_id, span.payload, span.record_hash,
                document.work_version_id, span.artifact_id,
                block.block_kind AS structural_kind,
                block.payload AS structural_payload
           FROM petra.source_spans AS span
           JOIN petra.parsed_documents AS document
             ON document.parsed_document_id = span.parsed_document_id
           JOIN petra.structural_blocks AS block
             ON block.parsed_document_id = span.parsed_document_id
            AND block.structural_block_id = span.structural_block_id
           JOIN petra.artifact_manifests AS manifest
             ON manifest.artifact_manifest_id = $4
            AND manifest.artifact_id = span.artifact_id
          WHERE span.source_span_id = $1
            AND span.revision = $2
            AND span.record_hash = $3
            AND document.work_version_id = $5`,
        [
          ref.record_id,
          ref.revision,
          ref.record_hash,
          source.row.artifact_manifest_id,
          source.row.work_version_id,
        ],
      );
      const row = result.rows[0];
      if (
        row === undefined ||
        row.source_span_id !== ref.record_id ||
        row.work_version_id !== source.row.work_version_id
      ) {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
          "Every replacement SourceSpan must resolve exactly inside the selected ProjectSource artifact and WorkVersion.",
        );
      }
      this.#contracts.assertValid("source-span", "1.0.0", row.payload);
      if (row.record_hash !== canonicalHash(row.payload)) {
        throw this.#basisRevisionCorrupt(
          "A selected SourceSpan no longer matches its canonical record hash.",
        );
      }
      if (sourceScope === "abstract_only") {
        const payload = row.structural_payload as { structural_path?: unknown };
        const path = Array.isArray(payload.structural_path)
          ? payload.structural_path
          : [];
        if (
          !path.some(
            (segment) =>
              typeof segment === "string" &&
              segment.toLocaleLowerCase("en-US").includes("abstract"),
          )
        ) {
          throw this.#basisRevisionError(
            "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
            "An abstract-only basis may contain only SourceSpans whose retained structural path identifies the abstract.",
          );
        }
      }
    }
  }

  #priorBasisSpanRefs(
    candidate: PetraWorkingCandidate,
    profile: PetraClaim,
  ): [
    {
      schema_name: "petra.source-span";
      schema_version: "1.0.0";
      record_id: string;
      revision: 1;
      record_hash: string;
    },
    ...Array<{
      schema_name: "petra.source-span";
      schema_version: "1.0.0";
      record_id: string;
      revision: 1;
      record_hash: string;
    }>,
  ] {
    if (profile.basis.basis_kind !== "source") {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
        "Material basis revision supports source-grounded scientific Claims only.",
      );
    }
    const refs = candidate.basis
      .filter(
        (item) =>
          item.basis_role === "source" &&
          item.record_ref.schema_name === "petra.source-span" &&
          item.record_ref.schema_version === "1.0.0" &&
          item.record_ref.revision === 1,
      )
      .map((item) => ({
        schema_name: "petra.source-span" as const,
        schema_version: "1.0.0" as const,
        record_id: item.record_ref.record_id,
        revision: 1 as const,
        record_hash: item.record_ref.record_hash,
      }));
    if (
      canonicalize(refs.map((ref) => ref.record_id)) !==
        canonicalize(profile.basis.source_span_ids) ||
      new Set(refs.map((ref) => ref.record_id)).size !== refs.length
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
        "The current WorkingCandidate must retain the Claim's exact ordered SourceSpan basis before it can be revised.",
      );
    }
    const first = refs[0];
    if (first === undefined) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
        "The current source-grounded Claim has no exact WorkingCandidate SourceSpan basis.",
      );
    }
    return [first, ...refs.slice(1)];
  }

  #prepareBasisRevisionRecords(
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
    definition: PetraProjectDefinition,
    source: { record: PetraProjectSource; row: ProjectSourceRow },
    priorCandidate: PetraWorkingCandidate,
    priorCandidateRecordHash: string,
    priorProfile: PetraClaim,
  ): { candidate: PetraWorkingCandidate; profileRecord: PetraClaim } {
    if (envelope.actor.actor_kind !== "human") {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROVENANCE_INVALID",
        "Server-composed scientific basis revision requires an authenticated human Actor.",
      );
    }
    if (priorProfile.basis.basis_kind !== "source") {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
        "Server-composed basis revision supports source-grounded scientific Claims only.",
      );
    }
    const input = envelope.command.basis_revision_input;
    const validators = definition.content.registrations.filter(
      (registration) => registration.registration_kind === "validator",
    );
    if (validators.length === 0) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
        "The exact ProjectDefinition must register at least one validator for basis revision.",
      );
    }
    const firstValidator = validators[0];
    const firstSourceSpan = input.source_span_refs[0];
    if (firstValidator === undefined || firstSourceSpan === undefined) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
        "Basis revision requires at least one registered validator and one exact SourceSpan.",
      );
    }
    const sourceSpanIds = [
      firstSourceSpan.record_id,
      ...input.source_span_refs.slice(1).map((ref) => ref.record_id),
    ] as [string, ...string[]];
    const pendingValidatorResult = (registration: typeof firstValidator) => ({
      validator_name: registration.contract.name,
      validator_version: registration.contract.version,
      outcome: "warning" as const,
      code: "REVALIDATION_REQUIRED",
      message:
        "This registered validator has not evaluated the revised source basis.",
    });

    const profileRecord = clone(priorProfile);
    profileRecord.revision += 1;
    profileRecord.basis = {
      basis_kind: "source",
      work_version_id: source.row.work_version_id,
      source_scope: input.source_scope,
      detail_level: input.detail_level,
      source_span_ids: sourceSpanIds,
      source_stance: input.source_stance,
      attribution: input.attribution,
      modality: input.modality,
      negated: input.negated,
      ...(input.uncertainty === undefined
        ? {}
        : { uncertainty: input.uncertainty }),
      derivation: {
        derivation_kind: "human_extraction",
        derivation_ref: envelope.command_id,
      },
      validator_results: [
        pendingValidatorResult(firstValidator),
        ...validators.slice(1).map(pendingValidatorResult),
      ],
      proposed_by: {
        actor_id: envelope.actor.actor_id,
        actor_kind: "human",
      },
      proposed_at: envelope.submitted_at,
    };
    profileRecord.authority = {
      zone: "quarantine",
      review_state: "unreviewed",
    };
    profileRecord.supersedes_claim_id = priorProfile.claim_id;
    profileRecord.created_by = clone(envelope.actor);
    profileRecord.created_at = envelope.submitted_at;
    this.#contracts.assertValid("claim", "1.0.0", profileRecord);

    const exactPriorCandidate = {
      schema_name: "petra.working-candidate" as const,
      schema_version: "1.0.0" as const,
      record_id: priorCandidate.working_candidate_id,
      revision: priorCandidate.revision,
      record_hash: priorCandidateRecordHash,
    };
    const exactProjectSource = {
      schema_name: "petra.project-source" as const,
      schema_version: "1.0.0" as const,
      record_id: source.record.project_source_id,
      revision: source.record.revision,
      record_hash: source.row.record_hash,
    };
    const sourceSpanRefs = input.source_span_refs.map((ref) => clone(ref));
    const profileRecordHash = canonicalHash(profileRecord);
    const candidate = clone(priorCandidate);
    candidate.revision += 1;
    candidate.profile_object.object_record_ref = {
      schema_name: profileRecord.schema_name,
      schema_version: profileRecord.schema_version,
      record_id: profileRecord.claim_id,
      revision: profileRecord.revision,
      record_hash: profileRecordHash,
    };
    candidate.producer = {
      producer_kind: "human",
      actor: {
        actor_id: envelope.actor.actor_id,
        actor_kind: "human",
      },
      contribution_kind: "direct_edit",
    };
    candidate.input_snapshot.input_record_refs = [
      ...clone(priorCandidate.input_snapshot.input_record_refs),
      exactPriorCandidate,
      exactProjectSource,
      ...sourceSpanRefs,
    ];
    candidate.origin = {
      origin_kind: "direct_edit",
      source_record_refs: [
        exactPriorCandidate,
        exactProjectSource,
        ...sourceSpanRefs,
      ],
      summary:
        "The authenticated human author revised the candidate's exact scientific source basis during Review.",
    };
    candidate.basis = [
      {
        basis_role: "source",
        record_ref: exactProjectSource,
        summary: "The exact current ProjectSource bounds the revised basis.",
      },
      ...sourceSpanRefs.map((ref) => ({
        basis_role: "source" as const,
        record_ref: ref,
        summary: "This exact SourceSpan is material to the revised basis.",
      })),
    ];
    candidate.provenance = [
      {
        provenance_role: "prior_revision",
        record_ref: exactPriorCandidate,
        statement:
          "This basis revision retains the exact prior WorkingCandidate and its provenance chain.",
      },
      {
        provenance_role: "input",
        record_ref: exactProjectSource,
        statement:
          "The revised basis resolves inside this exact current ProjectSource.",
      },
      ...sourceSpanRefs.map((ref) => ({
        provenance_role: "input" as const,
        record_ref: ref,
        statement:
          "This exact SourceSpan was supplied as material for the revised basis.",
      })),
    ];
    candidate.qualifications =
      input.uncertainty === undefined
        ? { assessment_state: "none_recorded", statements: [] }
        : {
            assessment_state: "stated",
            statements: [
              {
                qualification_kind: "uncertainty",
                statement: input.uncertainty,
                basis_ref: firstSourceSpan,
              },
            ],
          };
    candidate.validation = {
      state: "pending",
      target_record_hash: profileRecordHash,
      results: [],
    };
    candidate.lineage = {
      lineage_kind: "supersession",
      supersedes: {
        working_candidate_id: priorCandidate.working_candidate_id,
        revision: priorCandidate.revision,
        content_hash: priorCandidate.content_hash,
      },
      change_kind: "basis_revision",
      reason: input.reason,
    };
    candidate.recorded_at = envelope.submitted_at;
    candidate.content_hash = workingContentHash(candidate);
    this.#contracts.assertValid("working-candidate", "1.0.0", candidate);
    return { candidate, profileRecord };
  }

  #assertBasisRevisionInput(
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
    candidate: PetraWorkingCandidate,
    profile: PetraClaim,
    session: PetraReviewSessionV110,
    member: ReviewSessionMemberV110,
    priorCandidate: PetraWorkingCandidate,
    priorCandidateRecordHash: string,
    priorRelationship: PetraWorkingRelationship,
    priorProfile: PetraClaim,
    assertion: PetraAssertion,
    source: { record: PetraProjectSource; row: ProjectSourceRow },
    definition: PetraProjectDefinition,
  ): void {
    const input = envelope.command.basis_revision_input;
    const expectedClaim = envelope.command.expected_claim_ref;
    const exactPriorCandidate = {
      schema_name: "petra.working-candidate",
      schema_version: "1.0.0",
      record_id: priorCandidate.working_candidate_id,
      revision: priorCandidate.revision,
      record_hash: priorCandidateRecordHash,
    };
    const expectedDefinition = envelope.command.expected_project_definition_ref;
    const candidateBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "candidate",
    );
    const relationshipBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "relationship",
    );
    const relationshipEndpoint = priorRelationship.endpoints.object;
    if (
      envelope.actor.actor_kind !== "human" ||
      candidate.project_id !== session.project_id ||
      canonicalize(candidate.project_definition_ref) !==
        canonicalize(expectedDefinition) ||
      candidate.project_definition_ref.project_definition_id !==
        session.project_definition_ref.project_definition_id ||
      candidate.project_definition_ref.revision !==
        session.project_definition_ref.revision ||
      candidate.project_definition_ref.content_hash !==
        session.project_definition_ref.content_hash ||
      candidate.project_definition_ref.definition_family !==
        "petra.scientific-evidence" ||
      candidate.working_candidate_id !== priorCandidate.working_candidate_id ||
      candidate.revision !== priorCandidate.revision + 1 ||
      candidate.lineage.lineage_kind !== "supersession" ||
      candidate.lineage.change_kind !== "basis_revision" ||
      candidate.lineage.supersedes.working_candidate_id !==
        priorCandidate.working_candidate_id ||
      candidate.lineage.supersedes.revision !== priorCandidate.revision ||
      candidate.lineage.supersedes.content_hash !==
        priorCandidate.content_hash ||
      candidate.disposition !== "available" ||
      candidate.task_context.objective_ref.record_id !==
        session.content.objective_ref.objective_id ||
      candidate.task_context.objective_ref.revision !==
        session.content.objective_ref.revision ||
      canonicalize(candidate.profile_object.registration) !==
        canonicalize(priorCandidate.profile_object.registration) ||
      candidate.profile_object.candidate_operation !==
        priorCandidate.profile_object.candidate_operation ||
      canonicalize(candidate.profile_object.current_authoritative_ref) !==
        canonicalize(priorCandidate.profile_object.current_authoritative_ref) ||
      canonicalize(candidate.authority_boundary) !==
        canonicalize(priorCandidate.authority_boundary) ||
      canonicalize(candidate.task_context) !==
        canonicalize(priorCandidate.task_context) ||
      canonicalize(candidate.input_snapshot.snapshot_ref) !==
        canonicalize(priorCandidate.input_snapshot.snapshot_ref) ||
      profile.claim_id !== priorProfile.claim_id ||
      profile.revision !== priorProfile.revision + 1 ||
      profile.supersedes_claim_id !== priorProfile.claim_id ||
      profile.authority.zone !== "quarantine" ||
      profile.authority.review_state !== "unreviewed" ||
      candidate.profile_object.object_record_ref.record_id !==
        profile.claim_id ||
      candidate.profile_object.object_record_ref.revision !==
        profile.revision ||
      candidate.profile_object.object_record_ref.record_hash !==
        canonicalHash(profile) ||
      candidate.validation.state !== "pending" ||
      candidate.validation.results.length !== 0 ||
      candidate.validation.target_record_hash !== canonicalHash(profile) ||
      candidate.created_by.actor_id !== priorCandidate.created_by.actor_id ||
      candidate.created_by.actor_kind !==
        priorCandidate.created_by.actor_kind ||
      candidate.created_at !== priorCandidate.created_at
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROVENANCE_INVALID",
        "The basis revision must advance the same Claim and WorkingCandidate once without changing ProjectDefinition, profile, Objective, authority boundary, or immutable working identity fields.",
      );
    }
    if (
      expectedClaim.schema_name !== "petra.claim" ||
      expectedClaim.schema_version !== "1.0.0" ||
      expectedClaim.record_id !== priorProfile.claim_id ||
      expectedClaim.revision !== priorProfile.revision ||
      expectedClaim.record_hash !== canonicalHash(priorProfile) ||
      canonicalize(priorCandidate.profile_object.object_record_ref) !==
        canonicalize(expectedClaim)
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
        "Basis revision must name the exact current Claim retained by the WorkingCandidate.",
      );
    }
    if (
      candidateBinding === undefined ||
      relationshipBinding === undefined ||
      candidateBinding.semantic_key !==
        priorCandidate.profile_object.registration.semantic_key ||
      candidateBinding.record_ref.record_id !== priorProfile.claim_id ||
      candidateBinding.record_ref.revision !== priorProfile.revision ||
      candidateBinding.record_ref.record_hash !== canonicalHash(priorProfile) ||
      relationshipBinding.semantic_key !==
        priorRelationship.profile_relationship.registration.semantic_key ||
      relationshipBinding.record_ref.record_id !==
        priorRelationship.profile_relationship.relationship_record_ref
          .record_id ||
      relationshipBinding.record_ref.revision !==
        priorRelationship.profile_relationship.relationship_record_ref
          .revision ||
      relationshipBinding.record_ref.record_hash !==
        priorRelationship.profile_relationship.relationship_record_ref
          .record_hash ||
      relationshipEndpoint.endpoint_kind !== "working_candidate" ||
      relationshipEndpoint.candidate_ref.working_candidate_id !==
        priorCandidate.working_candidate_id ||
      relationshipEndpoint.candidate_ref.revision !== priorCandidate.revision ||
      relationshipEndpoint.candidate_ref.content_hash !==
        priorCandidate.content_hash ||
      priorRelationship.profile_relationship.predicate !== "ASSERTS"
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_MEMBER_MISMATCH",
        "The Review member must retain the exact registered Claim, ASSERTS, WorkingCandidate, and WorkingRelationship composition.",
      );
    }
    if (
      priorProfile.basis.basis_kind !== "source" ||
      profile.basis.basis_kind !== "source"
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
        "The first basis-revision adapter supports source-grounded scientific Claims only.",
      );
    }
    const sourceRef = input.project_source_ref;
    const currentSourceRole = definition.content.registrations.find(
      (registration) =>
        registration.registration_kind === "source_role" &&
        registration.semantic_key === source.record.content.source_role,
    );
    if (
      sourceRef.project_source_id !== source.record.project_source_id ||
      sourceRef.revision !== source.record.revision ||
      sourceRef.content_hash !== source.record.content_hash ||
      sourceRef.record_hash !== source.row.record_hash ||
      sourceRef.status !== source.record.content.status ||
      source.record.content.project_definition_ref.project_definition_id !==
        expectedDefinition.project_definition_id ||
      source.record.content.project_definition_ref.revision >
        expectedDefinition.revision ||
      currentSourceRole === undefined ||
      source.row.work_version_id !== priorProfile.basis.work_version_id ||
      source.record.content.work_version_ref.work_version_id !==
        priorProfile.basis.work_version_id ||
      assertion.predicate !== "ASSERTS"
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
        "The selected ProjectSource must belong to the Review's ProjectDefinition lineage, retain a currently registered source role, and preserve the current Claim and ASSERTS WorkVersion.",
      );
    }
    if (assertion.subject_id !== priorProfile.basis.work_version_id) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
        "A source WorkVersion change requires a broader relationship revision and is not supported by this bounded operation.",
      );
    }
    if (input.source_scope !== priorProfile.basis.source_scope) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
        "This bounded operation cannot change full-text versus abstract-only source semantics.",
      );
    }
    const materialBasis = (basis: {
      source_scope: string;
      detail_level: string;
      source_span_ids: readonly string[];
      source_stance: string;
      attribution: string;
      modality: string;
      negated: boolean;
      uncertainty?: string;
    }) => ({
      source_scope: basis.source_scope,
      detail_level: basis.detail_level,
      source_span_ids: basis.source_span_ids,
      source_stance: basis.source_stance,
      attribution: basis.attribution,
      modality: basis.modality,
      negated: basis.negated,
      uncertainty: basis.uncertainty,
    });
    if (
      canonicalize(materialBasis(profile.basis)) ===
      canonicalize(materialBasis(priorProfile.basis))
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_NO_MATERIAL_CHANGE",
        "Basis revision must change at least one exact SourceSpan or scientific source-semantic field.",
      );
    }
    const expectedBasisRefs = [
      {
        schema_name: "petra.project-source",
        schema_version: "1.0.0",
        record_id: source.record.project_source_id,
        revision: source.record.revision,
        record_hash: source.row.record_hash,
      },
      ...input.source_span_refs,
    ];
    const candidateBasisRefs = candidate.basis.map((item) => item.record_ref);
    const hasPriorInput = candidate.input_snapshot.input_record_refs.some(
      (ref) => canonicalize(ref) === canonicalize(exactPriorCandidate),
    );
    const hasPriorProvenance = candidate.provenance.some(
      (item) =>
        item.provenance_role === "prior_revision" &&
        canonicalize(item.record_ref) === canonicalize(exactPriorCandidate),
    );
    if (
      canonicalize(candidateBasisRefs) !== canonicalize(expectedBasisRefs) ||
      !hasPriorInput ||
      !hasPriorProvenance ||
      candidate.producer.producer_kind !== "human" ||
      candidate.producer.actor.actor_id !== envelope.actor.actor_id ||
      candidate.producer.actor.actor_kind !== envelope.actor.actor_kind ||
      candidate.origin.origin_kind !== "direct_edit" ||
      profile.created_by.actor_id !== envelope.actor.actor_id ||
      profile.created_by.actor_kind !== envelope.actor.actor_kind ||
      profile.basis.proposed_by.actor_id !== envelope.actor.actor_id ||
      profile.basis.proposed_by.actor_kind !== envelope.actor.actor_kind ||
      profile.basis.validator_results.some(
        (result) =>
          result.outcome !== "warning" ||
          result.code !== "REVALIDATION_REQUIRED",
      )
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_PROVENANCE_INVALID",
        "The revised basis must retain prior-revision provenance, exact source records, human authorship, and an explicit pending-validation boundary.",
      );
    }
    const unchangedProfile = (claim: PetraClaim): unknown => {
      const copy = clone(claim) as unknown as Record<string, unknown>;
      delete copy.revision;
      delete copy.basis;
      delete copy.authority;
      delete copy.supersedes_claim_id;
      delete copy.created_by;
      delete copy.created_at;
      return copy;
    };
    if (
      canonicalize(unchangedProfile(profile)) !==
      canonicalize(unchangedProfile(priorProfile))
    ) {
      throw this.#basisRevisionError(
        "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
        "Material basis revision cannot also change Claim text, kind, normalization, or scientific scope.",
      );
    }
  }

  #prepareCorrectionRecords(
    envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope,
    priorCandidate: PetraWorkingCandidate,
    priorCandidateRecordHash: string,
    priorProfile: PetraClaim,
  ): {
    candidate: PetraWorkingCandidate;
    profileRecord: PetraClaim;
  } {
    if ("corrected_candidate" in envelope.command) {
      return {
        candidate: clone(envelope.command.corrected_candidate),
        profileRecord: clone(envelope.command.corrected_profile_record),
      };
    }
    if (envelope.actor.actor_kind !== "human") {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROVENANCE_INVALID",
        "Server-composed candidate text correction requires an authenticated human Actor.",
      );
    }
    if (priorProfile.basis.basis_kind !== "source") {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
        "Server-composed candidate text correction supports source-grounded scientific Claims only.",
      );
    }
    const canonicalText = envelope.command.correction_input.canonical_text;
    if (canonicalText === priorProfile.canonical_text) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID",
        "Candidate text correction must change the exact current Claim text.",
      );
    }

    const profileRecord = clone(priorProfile);
    profileRecord.revision += 1;
    profileRecord.canonical_text = canonicalText;
    profileRecord.basis = {
      ...clone(priorProfile.basis),
      derivation: {
        derivation_kind: "human_extraction",
        derivation_ref: envelope.command_id,
      },
      proposed_by: clone(envelope.actor),
      proposed_at: envelope.submitted_at,
    };
    delete profileRecord.basis.extraction_confidence;
    profileRecord.authority = {
      zone: "quarantine",
      review_state: "unreviewed",
    };
    profileRecord.supersedes_claim_id = priorProfile.claim_id;
    profileRecord.created_by = clone(envelope.actor);
    profileRecord.created_at = envelope.submitted_at;
    this.#contracts.assertValid("claim", "1.0.0", profileRecord);

    const exactPriorCandidateRecord = {
      schema_name: "petra.working-candidate" as const,
      schema_version: "1.0.0" as const,
      record_id: priorCandidate.working_candidate_id,
      revision: priorCandidate.revision,
      record_hash: priorCandidateRecordHash,
    };
    const profileRecordHash = canonicalHash(profileRecord);
    const candidate = clone(priorCandidate);
    candidate.revision += 1;
    candidate.profile_object.object_record_ref = {
      schema_name: profileRecord.schema_name,
      schema_version: profileRecord.schema_version,
      record_id: profileRecord.claim_id,
      revision: profileRecord.revision,
      record_hash: profileRecordHash,
    };
    candidate.producer = {
      producer_kind: "human",
      actor: {
        actor_id: envelope.actor.actor_id,
        actor_kind: "human",
      },
      contribution_kind: "direct_edit",
    };
    candidate.input_snapshot.input_record_refs = [
      ...clone(priorCandidate.input_snapshot.input_record_refs),
      exactPriorCandidateRecord,
    ];
    candidate.origin = {
      origin_kind: "direct_edit",
      source_record_refs: [exactPriorCandidateRecord],
      summary:
        "The authenticated human author corrected the candidate text while Petra retained its exact scientific source basis.",
    };
    candidate.provenance = [
      {
        provenance_role: "prior_revision",
        record_ref: exactPriorCandidateRecord,
        statement:
          "This revision retains the exact prior WorkingCandidate as its correction input and provenance.",
      },
    ];
    candidate.validation = {
      state: "pending",
      target_record_hash: profileRecordHash,
      results: [],
    };
    candidate.lineage = {
      lineage_kind: "supersession",
      supersedes: {
        working_candidate_id: priorCandidate.working_candidate_id,
        revision: priorCandidate.revision,
        content_hash: priorCandidate.content_hash,
      },
      change_kind: "material_revision",
      reason:
        "The authenticated human author corrected the candidate text during Review.",
    };
    candidate.recorded_at = envelope.submitted_at;
    candidate.content_hash = workingContentHash(candidate);
    this.#contracts.assertValid("working-candidate", "1.0.0", candidate);
    return { candidate, profileRecord };
  }

  #assertCorrectionInput(
    candidate: PetraWorkingCandidate,
    profile: PetraClaim,
    session: PetraReviewSessionV110,
    member: ReviewSessionMemberV110,
    priorCandidate: PetraWorkingCandidate,
    priorCandidateRecordHash: string,
    priorRelationship: PetraWorkingRelationship,
    priorProfile: PetraClaim,
  ): void {
    const sameActor = (
      left: { actor_id: string; actor_kind: string },
      right: { actor_id: string; actor_kind: string },
    ): boolean =>
      left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;
    const exactPriorCandidateRecord = {
      schema_name: "petra.working-candidate",
      schema_version: "1.0.0",
      record_id: priorCandidate.working_candidate_id,
      revision: priorCandidate.revision,
      record_hash: priorCandidateRecordHash,
    };
    const hasPriorInput = candidate.input_snapshot.input_record_refs.some(
      (ref) => canonicalize(ref) === canonicalize(exactPriorCandidateRecord),
    );
    const hasPriorProvenance = candidate.provenance.some(
      (item) =>
        item.provenance_role === "prior_revision" &&
        canonicalize(item.record_ref) ===
          canonicalize(exactPriorCandidateRecord),
    );
    const candidateBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "candidate",
    );
    const relationshipBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "relationship",
    );
    const relationshipEndpoint = priorRelationship.endpoints.object;
    if (
      candidate.project_id !== session.project_id ||
      candidate.project_definition_ref.project_definition_id !==
        session.project_definition_ref.project_definition_id ||
      candidate.project_definition_ref.revision !==
        session.project_definition_ref.revision ||
      candidate.project_definition_ref.content_hash !==
        session.project_definition_ref.content_hash ||
      candidate.project_definition_ref.definition_family !==
        "petra.scientific-evidence" ||
      candidate.working_candidate_id !== priorCandidate.working_candidate_id ||
      candidate.revision !== priorCandidate.revision + 1 ||
      candidate.lineage.lineage_kind !== "supersession" ||
      candidate.lineage.supersedes.working_candidate_id !==
        priorCandidate.working_candidate_id ||
      candidate.lineage.supersedes.revision !== priorCandidate.revision ||
      candidate.lineage.supersedes.content_hash !==
        priorCandidate.content_hash ||
      !["mechanical_correction", "material_revision"].includes(
        candidate.lineage.change_kind,
      ) ||
      candidate.disposition !== "available" ||
      candidate.task_context.objective_ref.record_id !==
        session.content.objective_ref.objective_id ||
      candidate.task_context.objective_ref.revision !==
        session.content.objective_ref.revision ||
      candidate.profile_object.registration.semantic_key !==
        priorCandidate.profile_object.registration.semantic_key ||
      canonicalize(candidate.profile_object.registration.contract) !==
        canonicalize(priorCandidate.profile_object.registration.contract) ||
      candidate.profile_object.candidate_operation !==
        priorCandidate.profile_object.candidate_operation ||
      canonicalize(candidate.profile_object.current_authoritative_ref) !==
        canonicalize(priorCandidate.profile_object.current_authoritative_ref) ||
      profile.claim_id !== priorProfile.claim_id ||
      profile.revision !== priorProfile.revision + 1 ||
      profile.supersedes_claim_id !== priorProfile.claim_id ||
      profile.authority.zone !== "quarantine" ||
      candidate.profile_object.object_record_ref.record_id !==
        profile.claim_id ||
      candidate.profile_object.object_record_ref.revision !==
        profile.revision ||
      candidate.profile_object.object_record_ref.record_hash !==
        canonicalHash(profile) ||
      candidate.validation.target_record_hash !== canonicalHash(profile)
    ) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID",
        "The correction must advance the same exact scientific WorkingCandidate and Claim once without changing its ProjectDefinition, profile registration, operation, authority boundary, or Objective.",
      );
    }
    if (
      candidateBinding === undefined ||
      relationshipBinding === undefined ||
      candidateBinding.semantic_key !==
        priorCandidate.profile_object.registration.semantic_key ||
      candidateBinding.record_ref.record_id !== priorProfile.claim_id ||
      candidateBinding.record_ref.revision !== priorProfile.revision ||
      candidateBinding.record_ref.record_hash !== canonicalHash(priorProfile) ||
      relationshipBinding.semantic_key !==
        priorRelationship.profile_relationship.registration.semantic_key ||
      relationshipBinding.record_ref.record_id !==
        priorRelationship.profile_relationship.relationship_record_ref
          .record_id ||
      relationshipBinding.record_ref.revision !==
        priorRelationship.profile_relationship.relationship_record_ref
          .revision ||
      relationshipBinding.record_ref.record_hash !==
        priorRelationship.profile_relationship.relationship_record_ref
          .record_hash ||
      relationshipEndpoint.endpoint_kind !== "working_candidate" ||
      relationshipEndpoint.candidate_ref.working_candidate_id !==
        priorCandidate.working_candidate_id ||
      relationshipEndpoint.candidate_ref.revision !== priorCandidate.revision ||
      relationshipEndpoint.candidate_ref.content_hash !==
        priorCandidate.content_hash
    ) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_MEMBER_MISMATCH",
        "The Review member does not retain the exact registered Claim, ASSERTS, WorkingCandidate, and WorkingRelationship composition required for correction.",
      );
    }
    if (!hasPriorInput || !hasPriorProvenance) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROVENANCE_INVALID",
        "The corrected candidate must retain the exact prior WorkingCandidate record as input and prior-revision provenance.",
      );
    }
    if (
      profile.basis.basis_kind !== "source" ||
      priorProfile.basis.basis_kind !== "source"
    ) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
        "The first candidate-correction adapter supports source-grounded scientific Claims only.",
      );
    }
    const basisIdentity = (claim: PetraClaim) => {
      if (claim.basis.basis_kind !== "source") return undefined;
      return {
        work_version_id: claim.basis.work_version_id,
        source_scope: claim.basis.source_scope,
        detail_level: claim.basis.detail_level,
        source_span_ids: claim.basis.source_span_ids,
        source_stance: claim.basis.source_stance,
        attribution: claim.basis.attribution,
        modality: claim.basis.modality,
        negated: claim.basis.negated,
      };
    };
    const workingBasisIdentity = (working: PetraWorkingCandidate) =>
      working.basis.map(({ basis_role, record_ref }) => ({
        basis_role,
        record_ref,
      }));
    const candidateSourceSpanIds = candidate.basis
      .filter(
        ({ basis_role, record_ref }) =>
          basis_role === "source" &&
          record_ref.schema_name === "petra.source-span",
      )
      .map(({ record_ref }) => record_ref.record_id);
    if (
      canonicalize(basisIdentity(profile)) !==
        canonicalize(basisIdentity(priorProfile)) ||
      canonicalize(workingBasisIdentity(candidate)) !==
        canonicalize(workingBasisIdentity(priorCandidate)) ||
      canonicalize(candidateSourceSpanIds) !==
        canonicalize(profile.basis.source_span_ids)
    ) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_BASIS_INCOMPATIBLE",
        "Candidate correction must retain the exact scientific source, span, stance, and working-basis identities; material basis change uses a separate operation.",
      );
    }
    const proposedBy = profile.basis.proposed_by;
    if (
      !sameActor(candidate.producer.actor, profile.created_by) ||
      !sameActor(candidate.producer.actor, proposedBy) ||
      (candidate.producer.producer_kind === "human" &&
        candidate.origin.origin_kind !== "direct_edit") ||
      (candidate.producer.producer_kind === "model" &&
        candidate.origin.origin_kind !== "model_output")
    ) {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROVENANCE_INVALID",
        "The corrected Claim authorship, producer, source proposal, and origin must identify the same exact human or model contribution.",
      );
    }
  }

  #correctedRelationship(
    candidate: PetraWorkingCandidate,
    prior: PetraWorkingRelationship,
    priorRecordHash: string,
    recordedAt: string,
    operation: "correction" | "basis_revision" = "correction",
  ): PetraWorkingRelationship {
    const next = clone(prior);
    next.revision += 1;
    next.producer = clone(candidate.producer);
    next.task_context = clone(candidate.task_context);
    next.input_snapshot = clone(candidate.input_snapshot);
    next.input_snapshot.input_record_refs.push({
      schema_name: "petra.working-relationship",
      schema_version: "1.0.0",
      record_id: prior.working_relationship_id,
      revision: prior.revision,
      record_hash: priorRecordHash,
    });
    next.origin = clone(candidate.origin);
    next.basis = clone(candidate.basis);
    next.provenance = [
      ...clone(candidate.provenance),
      {
        provenance_role: "prior_revision",
        record_ref: {
          schema_name: "petra.working-relationship",
          schema_version: "1.0.0",
          record_id: prior.working_relationship_id,
          revision: prior.revision,
          record_hash: priorRecordHash,
        },
        statement:
          operation === "basis_revision"
            ? "The relationship revision retains the exact prior working relationship while rebinding its object endpoint to the basis-revised candidate."
            : "The relationship revision retains the exact prior working relationship while rebinding its object endpoint to the corrected candidate.",
      },
    ];
    next.qualifications = clone(candidate.qualifications);
    next.validation = {
      state: "pending",
      target_record_hash:
        prior.profile_relationship.relationship_record_ref.record_hash,
      results: [],
    };
    if (next.endpoints.object.endpoint_kind !== "working_candidate") {
      throw this.#correctionError(
        "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
        "The scientific ASSERTS working relationship must target a WorkingCandidate.",
      );
    }
    next.endpoints.object.candidate_ref = {
      working_candidate_id: candidate.working_candidate_id,
      revision: candidate.revision,
      content_hash: candidate.content_hash,
    };
    next.lineage = {
      lineage_kind: "supersession",
      supersedes: {
        working_relationship_id: prior.working_relationship_id,
        revision: prior.revision,
        content_hash: prior.content_hash,
      },
      change_kind:
        operation === "basis_revision"
          ? "basis_revision"
          : "mechanical_correction",
      reason:
        operation === "basis_revision"
          ? "Rebind the existing scientific working relationship to the basis-revised WorkingCandidate revision."
          : "Rebind the existing scientific working relationship to the corrected WorkingCandidate revision.",
    };
    next.recorded_at = recordedAt;
    next.content_hash = workingContentHash(next);
    this.#contracts.assertValid("working-relationship", "1.0.0", next);
    return next;
  }

  async #correctionAuthorityPosition(
    client: PoolClient,
    projectId: string,
  ): Promise<{ event_position: number; stream_revision: number }> {
    const result = await client.query<AuthorityPositionRow>(
      `SELECT authority.event_position::text,
              stream.current_stream_revision::text AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton
        FOR SHARE OF authority`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#correctionCorrupt(
        "The PostgreSQL authority position is unavailable for candidate correction.",
      );
    }
    return {
      event_position: Number(row.event_position),
      stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  async #refreshAuthorityPosition(
    client: PoolClient,
    projectId: string,
  ): Promise<{ event_position: number; stream_revision: number }> {
    const result = await client.query<AuthorityPositionRow>(
      `SELECT authority.event_position::text,
              stream.current_stream_revision::text AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton
        FOR SHARE OF authority`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#refreshCorrupt(
        "The PostgreSQL authority position is unavailable for Review refresh.",
      );
    }
    return {
      event_position: Number(row.event_position),
      stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  async #requireRefreshDefinition(
    client: PoolClient,
    session: PetraReviewSessionV110,
  ): Promise<PetraProjectDefinition> {
    const ref = session.project_definition_ref;
    const result = await client.query<CurrentDefinitionRow>(
      `SELECT revision.payload, revision.record_hash,
              head.definition_family
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.project_definition_id = $2
          AND head.current_revision = $3
          AND revision.content_hash = $4
        FOR SHARE OF head`,
      [
        session.project_id,
        ref.project_definition_id,
        ref.revision,
        ref.content_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
        "Refresh requires the ReviewSession's exact ProjectDefinition to remain current.",
      );
    }
    if (row.definition_family !== "petra.scientific-evidence") {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED",
        "The first Review refresh adapter supports only the registered scientific-evidence profile.",
      );
    }
    this.#contracts.assertValid("project-definition", "1.0.0", row.payload);
    const definition = clone(row.payload as PetraProjectDefinition);
    if (
      row.record_hash !== canonicalHash(definition) ||
      definition.content_hash !== canonicalHash(definition.content) ||
      definition.project_id !== session.project_id ||
      definition.project_definition_id !== ref.project_definition_id ||
      definition.revision !== ref.revision ||
      definition.content_hash !== ref.content_hash ||
      definition.definition_family !== row.definition_family
    ) {
      throw this.#refreshCorrupt(
        "The current ProjectDefinition does not match its exact ReviewSession binding.",
      );
    }
    return definition;
  }

  async #requireRefreshObjective(
    client: PoolClient,
    session: PetraReviewSessionV110,
  ): Promise<void> {
    const ref = session.content.objective_ref;
    const result = await client.query(
      `SELECT true
         FROM petra.project_objectives AS head
         JOIN petra.project_objective_revisions AS revision
           ON revision.objective_id = head.objective_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.objective_id = $2
          AND head.current_revision = $3
          AND revision.content_hash = $4
        FOR SHARE OF head`,
      [session.project_id, ref.objective_id, ref.revision, ref.content_hash],
    );
    if (result.rowCount !== 1) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
        "Refresh requires the ReviewSession's exact Objective to remain current.",
      );
    }
  }

  async #refreshMember(
    client: PoolClient,
    session: PetraReviewSessionV110,
    definition: PetraProjectDefinition,
    member: ReviewSessionMemberV110,
  ): Promise<ReviewSessionMemberV110> {
    if (
      member.working_state.relationship_refs.length !== 1 ||
      member.candidate_bindings.length !== 2
    ) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED",
        "The first Review refresh adapter requires one WorkingCandidate and one ASSERTS relationship per member.",
      );
    }
    const candidate = await this.#currentWorkingCandidate(
      client,
      session.project_id,
      member.working_state.candidate_ref.working_candidate_id,
    );
    const relationship = await this.#currentWorkingRelationship(
      client,
      session.project_id,
      member.working_state.relationship_refs[0].working_relationship_id,
    );
    this.#requireRefreshMemberCompatibility(
      session,
      definition,
      member,
      candidate,
      relationship,
    );
    await this.#requireCurrentProfileRecord(
      client,
      candidate.profile_object.object_record_ref,
      "claim",
    );
    await this.#requireCurrentProfileRecord(
      client,
      relationship.profile_relationship.relationship_record_ref,
      "assertion",
    );

    const candidateBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "candidate",
    );
    const relationshipBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "relationship",
    );
    if (candidateBinding === undefined || relationshipBinding === undefined) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED",
        "The registered scientific refresh adapter requires exact candidate and relationship bindings.",
      );
    }
    const refreshed = clone(member);
    refreshed.working_state = {
      candidate_ref: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
      relationship_refs: [
        {
          working_relationship_id: relationship.working_relationship_id,
          revision: relationship.revision,
          content_hash: relationship.content_hash,
        },
      ],
    };
    refreshed.candidate_bindings = member.candidate_bindings.map((binding) =>
      binding.binding_role === "candidate"
        ? {
            ...clone(binding),
            record_ref: {
              record_id: candidate.profile_object.object_record_ref.record_id,
              revision: candidate.profile_object.object_record_ref.revision,
              record_hash:
                candidate.profile_object.object_record_ref.record_hash,
            },
          }
        : {
            ...clone(binding),
            record_ref: {
              record_id:
                relationship.profile_relationship.relationship_record_ref
                  .record_id,
              revision:
                relationship.profile_relationship.relationship_record_ref
                  .revision,
              record_hash:
                relationship.profile_relationship.relationship_record_ref
                  .record_hash,
            },
          },
    ) as ReviewSessionMemberV110["candidate_bindings"];
    return refreshed;
  }

  async #currentWorkingCandidate(
    client: PoolClient,
    projectId: string,
    workingCandidateId: string,
  ): Promise<PetraWorkingCandidate> {
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.working_candidates AS head
         JOIN petra.working_candidate_revisions AS revision
           ON revision.working_candidate_id = head.working_candidate_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.working_candidate_id = $2
        FOR SHARE OF head`,
      [projectId, workingCandidateId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
        "A retained Review member no longer resolves to a current WorkingCandidate head.",
      );
    }
    return this.#storedWorking<PetraWorkingCandidate>("working-candidate", row);
  }

  async #currentWorkingRelationship(
    client: PoolClient,
    projectId: string,
    workingRelationshipId: string,
  ): Promise<PetraWorkingRelationship> {
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.working_relationships AS head
         JOIN petra.working_relationship_revisions AS revision
           ON revision.working_relationship_id = head.working_relationship_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.working_relationship_id = $2
        FOR SHARE OF head`,
      [projectId, workingRelationshipId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
        "A retained Review member no longer resolves to a current WorkingRelationship head.",
      );
    }
    return this.#storedWorking<PetraWorkingRelationship>(
      "working-relationship",
      row,
    );
  }

  #storedWorking<
    Value extends PetraWorkingCandidate | PetraWorkingRelationship,
  >(
    schemaName: "working-candidate" | "working-relationship",
    row: StoredRow,
  ): Value {
    this.#contracts.assertValid(schemaName, "1.0.0", row.payload);
    const record = clone(row.payload as Value);
    if (
      row.record_hash !== canonicalHash(record) ||
      record.content_hash !== workingContentHash(record)
    ) {
      throw this.#refreshCorrupt(
        `A current ${schemaName} record does not match its canonical hashes.`,
      );
    }
    return record;
  }

  #requireRefreshMemberCompatibility(
    session: PetraReviewSessionV110,
    definition: PetraProjectDefinition,
    member: ReviewSessionMemberV110,
    candidate: PetraWorkingCandidate,
    relationship: PetraWorkingRelationship,
  ): void {
    const candidateBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "candidate",
    );
    const relationshipBinding = member.candidate_bindings.find(
      ({ binding_role }) => binding_role === "relationship",
    );
    const sameDefinition = (
      ref: PetraWorkingCandidate["project_definition_ref"],
    ): boolean =>
      ref.project_definition_id ===
        session.project_definition_ref.project_definition_id &&
      ref.revision === session.project_definition_ref.revision &&
      ref.content_hash === session.project_definition_ref.content_hash &&
      ref.definition_family === definition.definition_family;
    const registered = (
      registration:
        | PetraWorkingCandidate["profile_object"]["registration"]
        | PetraWorkingRelationship["profile_relationship"]["registration"],
    ): boolean =>
      definition.content.registrations.some(
        (entry) =>
          entry.registration_kind === registration.registration_kind &&
          entry.semantic_key === registration.semantic_key &&
          entry.contract.name === registration.contract.name &&
          entry.contract.version === registration.contract.version &&
          entry.contract.content_hash === registration.contract.content_hash,
      );
    if (
      candidateBinding === undefined ||
      relationshipBinding === undefined ||
      candidate.project_id !== session.project_id ||
      relationship.project_id !== session.project_id ||
      !sameDefinition(candidate.project_definition_ref) ||
      !sameDefinition(relationship.project_definition_ref) ||
      candidate.profile_object.registration.registration_kind !==
        "object_schema" ||
      candidate.profile_object.registration.semantic_key !==
        candidateBinding.semantic_key ||
      candidate.profile_object.registration.contract.name !== "petra.claim" ||
      candidate.profile_object.registration.contract.version !== "1.0.0" ||
      candidate.profile_object.object_record_ref.schema_name !==
        "petra.claim" ||
      candidate.profile_object.object_record_ref.schema_version !== "1.0.0" ||
      candidate.validation.target_record_hash !==
        candidate.profile_object.object_record_ref.record_hash ||
      relationship.profile_relationship.registration.registration_kind !==
        "relationship_schema" ||
      relationship.profile_relationship.registration.semantic_key !==
        relationshipBinding.semantic_key ||
      relationship.profile_relationship.registration.contract.name !==
        "petra.assertion" ||
      relationship.profile_relationship.registration.contract.version !==
        "1.0.0" ||
      relationship.profile_relationship.predicate !== "ASSERTS" ||
      relationship.profile_relationship.relationship_record_ref.schema_name !==
        "petra.assertion" ||
      relationship.profile_relationship.relationship_record_ref
        .schema_version !== "1.0.0" ||
      relationship.validation.target_record_hash !==
        relationship.profile_relationship.relationship_record_ref.record_hash ||
      !registered(candidate.profile_object.registration) ||
      !registered(relationship.profile_relationship.registration) ||
      relationship.endpoints.object.endpoint_kind !== "working_candidate" ||
      relationship.endpoints.object.candidate_ref.working_candidate_id !==
        candidate.working_candidate_id ||
      relationship.endpoints.object.candidate_ref.revision !==
        candidate.revision ||
      relationship.endpoints.object.candidate_ref.content_hash !==
        candidate.content_hash ||
      canonicalize(relationship.task_context) !==
        canonicalize(candidate.task_context) ||
      canonicalize(relationship.input_snapshot.snapshot_ref) !==
        canonicalize(candidate.input_snapshot.snapshot_ref)
    ) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
        "The current working heads cannot recompose the same registered Review member without changing its identity or profile meaning.",
      );
    }
  }

  async #requireCurrentProfileRecord(
    client: PoolClient,
    ref: {
      readonly record_id: string;
      readonly revision: number;
      readonly record_hash: string;
    },
    evidenceKind: "claim" | "assertion",
  ): Promise<void> {
    const result = await client.query(
      `SELECT true
         FROM petra.evidence_entities AS head
         JOIN petra.evidence_entity_revisions AS revision
           ON revision.evidence_id = head.evidence_id
          AND revision.evidence_kind = head.evidence_kind
          AND revision.revision = head.current_revision
        WHERE head.evidence_id = $1
          AND head.evidence_kind = $2
          AND head.current_revision = $3
          AND revision.record_hash = $4
        FOR SHARE OF head`,
      [ref.record_id, evidenceKind, ref.revision, ref.record_hash],
    );
    if (result.rowCount !== 1) {
      throw this.#refreshError(
        "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
        "A current working head does not bind the exact current registered profile record.",
      );
    }
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

  async #requireReviewCommandContext(
    client: PoolClient,
    envelope:
      | ReviewSessionLifecycleCommandEnvelope
      | ReviewSessionRefreshCommandEnvelope
      | ReviewCandidateCorrectionAuthorityCommandEnvelope
      | ReviewCandidateBasisRevisionCommandEnvelope,
    boundary: "lifecycle" | "refresh" | "correction" | "basis_revision",
  ): Promise<void> {
    const result = await client.query<{ actor_kind: string }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [envelope.project_id, envelope.actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== envelope.actor.actor_kind) {
      if (boundary === "basis_revision") {
        throw this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROJECT_MISMATCH",
          "The basis-revision Project and Actor must resolve exactly in local authority.",
        );
      }
      if (boundary === "correction") {
        throw this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_PROJECT_MISMATCH",
          "The correction Project and Actor must resolve exactly in local authority.",
        );
      }
      if (boundary === "refresh") {
        throw this.#refreshError(
          "REVIEW_SESSION_REFRESH_PROJECT_MISMATCH",
          "The refresh Project and Actor must resolve exactly in local authority.",
        );
      }
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

  #basisRevisionReceipt(
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
    fingerprint: string,
    priorSession: PetraReviewSessionV110,
    priorSessionRecordHash: string,
    priorCandidate: PetraWorkingCandidate,
    priorCandidateRecordHash: string,
    candidate: PetraWorkingCandidate,
    priorRelationship: PetraWorkingRelationship,
    priorRelationshipRecordHash: string,
    relationship: PetraWorkingRelationship,
    priorProfile: PetraClaim,
    resultingProfile: PetraClaim,
    definition: PetraProjectDefinition,
    source: { record: PetraProjectSource; row: ProjectSourceRow },
    priorSpanRefs: [
      {
        schema_name: "petra.source-span";
        schema_version: "1.0.0";
        record_id: string;
        revision: 1;
        record_hash: string;
      },
      ...Array<{
        schema_name: "petra.source-span";
        schema_version: "1.0.0";
        record_id: string;
        revision: 1;
        record_hash: string;
      }>,
    ],
    resultingSession: PetraReviewSessionV110,
    resultingSessionRecordHash: string,
    recordedAt: string,
  ): PetraReviewCandidateBasisRevisionReceipt {
    if (
      priorProfile.basis.basis_kind !== "source" ||
      resultingProfile.basis.basis_kind !== "source"
    ) {
      throw this.#basisRevisionCorrupt(
        "The admitted basis revision lost its scientific source basis.",
      );
    }
    const projectSourceRef = clone(
      envelope.command.basis_revision_input.project_source_ref,
    );
    const basisSnapshot = (
      profile: PetraClaim & { basis: { basis_kind: "source" } },
      spanRefs: typeof priorSpanRefs,
    ): PetraReviewCandidateBasisRevisionReceipt["content"]["prior_basis"] => ({
      basis_kind: "source",
      project_source_ref: projectSourceRef,
      work_version_id: profile.basis.work_version_id,
      source_span_refs: clone(spanRefs),
      source_scope: profile.basis.source_scope,
      detail_level: profile.basis.detail_level,
      source_stance: profile.basis.source_stance,
      attribution: profile.basis.attribution,
      modality: profile.basis.modality,
      negated: profile.basis.negated,
      ...(profile.basis.uncertainty === undefined
        ? {}
        : { uncertainty: profile.basis.uncertainty }),
    });
    const validatorRefs = definition.content.registrations
      .filter((registration) => registration.registration_kind === "validator")
      .map((registration) => clone(registration.contract));
    const firstValidatorRef = validatorRefs[0];
    if (firstValidatorRef === undefined) {
      throw this.#basisRevisionCorrupt(
        "The admitted basis revision lost its required validator registrations.",
      );
    }
    const requiredValidatorRefs = [
      firstValidatorRef,
      ...validatorRefs.slice(1),
    ] as [typeof firstValidatorRef, ...typeof validatorRefs];
    const content: PetraReviewCandidateBasisRevisionReceipt["content"] = {
      command_ref: {
        command_id: envelope.command_id,
        idempotency_key: envelope.idempotency_key,
        command_name: "ReviseReviewCandidateBasis",
        command_fingerprint: fingerprint,
        actor: clone(envelope.actor),
        capability_grant_id: envelope.capability_grant_id,
        correlation_id: envelope.correlation_id,
      },
      review_member_id: envelope.command.review_member_id,
      project_definition_ref: clone(
        envelope.command.expected_project_definition_ref,
      ),
      prior_review_session_ref: {
        ...sessionRef(priorSession, priorSessionRecordHash),
        lifecycle: "open",
      },
      resulting_review_session_ref: {
        ...sessionRef(resultingSession, resultingSessionRecordHash),
        lifecycle: "open",
      },
      prior_candidate_ref: {
        schema_name: "petra.working-candidate",
        schema_version: "1.0.0",
        record_id: priorCandidate.working_candidate_id,
        revision: priorCandidate.revision,
        content_hash: priorCandidate.content_hash,
        record_hash: priorCandidateRecordHash,
      },
      resulting_candidate_ref: {
        schema_name: "petra.working-candidate",
        schema_version: "1.0.0",
        record_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
        record_hash: canonicalHash(candidate),
      },
      prior_relationship_ref: {
        schema_name: "petra.working-relationship",
        schema_version: "1.0.0",
        record_id: priorRelationship.working_relationship_id,
        revision: priorRelationship.revision,
        content_hash: priorRelationship.content_hash,
        record_hash: priorRelationshipRecordHash,
      },
      resulting_relationship_ref: {
        schema_name: "petra.working-relationship",
        schema_version: "1.0.0",
        record_id: relationship.working_relationship_id,
        revision: relationship.revision,
        content_hash: relationship.content_hash,
        record_hash: canonicalHash(relationship),
      },
      prior_profile_record_ref: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: priorProfile.claim_id,
        revision: priorProfile.revision,
        record_hash: canonicalHash(priorProfile),
      },
      resulting_profile_record_ref: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: resultingProfile.claim_id,
        revision: resultingProfile.revision,
        record_hash: canonicalHash(resultingProfile),
      },
      prior_basis: basisSnapshot(
        priorProfile as PetraClaim & { basis: { basis_kind: "source" } },
        priorSpanRefs,
      ),
      resulting_basis: basisSnapshot(
        resultingProfile as PetraClaim & { basis: { basis_kind: "source" } },
        clone(envelope.command.basis_revision_input.source_span_refs),
      ),
      basis_transition: "material_revision_within_exact_scientific_source",
      validation_reset: {
        state: "pending",
        target_record_hash: candidate.validation.target_record_hash,
        required_validator_refs: requiredValidatorRefs,
        completed_validator_refs: [],
      },
      preservation: {
        candidate_identity: "retained",
        prior_candidate_revision: "retained",
        relationship_identity: "retained",
        prior_relationship_revision: "retained",
        review_session_identity: "retained",
        review_member_identity: "retained",
        review_decision: "none",
        change_sets: "unchanged",
        approvals: "unchanged",
        domain_events: "none",
        projection: "unchanged",
        history: "unchanged",
      },
      authority_boundary: {
        candidate_authority: "working_only",
        review_decision: "none",
        domain_authority: "unchanged",
        validation_authority: "none",
        mutation_authority: "capability_command_only",
        conversation_authority: "none",
        model_output_authority: "none",
      },
    };
    const receipt: PetraReviewCandidateBasisRevisionReceipt = {
      schema_name: "petra.review-candidate-basis-revision-receipt",
      schema_version: "1.0.0",
      review_candidate_basis_revision_receipt_id: derivePetraId(
        "review_basis_revision_receipt",
        envelope.command_id,
      ),
      revision: 1,
      project_id: envelope.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: recordedAt,
    };
    this.#contracts.assertValid(
      "review-candidate-basis-revision-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  async #insertBasisRevisionCommandExecution(
    client: PoolClient,
    envelope: ReviewCandidateBasisRevisionCommandEnvelope,
    fingerprint: string,
    receipt: PetraReviewCandidateBasisRevisionReceipt,
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

  #storedBasisRevisionReceipt(
    value: unknown,
  ): PetraReviewCandidateBasisRevisionReceipt {
    this.#contracts.assertValid(
      "review-candidate-basis-revision-receipt",
      "1.0.0",
      value,
    );
    const receipt = clone(value as PetraReviewCandidateBasisRevisionReceipt);
    if (receipt.content_hash !== canonicalHash(receipt.content)) {
      throw this.#basisRevisionCorrupt(
        "A stored candidate basis-revision receipt does not match its canonical content hash.",
      );
    }
    return receipt;
  }

  #correctionReceipt(
    envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope,
    fingerprint: string,
    priorSession: PetraReviewSessionV110,
    priorSessionRecordHash: string,
    priorCandidate: PetraWorkingCandidate,
    priorCandidateRecordHash: string,
    candidate: PetraWorkingCandidate,
    priorRelationship: PetraWorkingRelationship,
    priorRelationshipRecordHash: string,
    relationship: PetraWorkingRelationship,
    priorProfile: PetraClaim,
    resultingSession: PetraReviewSessionV110,
    resultingSessionRecordHash: string,
    recordedAt: string,
  ): PetraReviewCandidateCorrectionReceipt {
    if (candidate.lineage.lineage_kind !== "supersession") {
      throw this.#correctionCorrupt(
        "The admitted correction lost its supersession lineage.",
      );
    }
    const content: PetraReviewCandidateCorrectionReceipt["content"] = {
      command_ref: {
        command_id: envelope.command_id,
        idempotency_key: envelope.idempotency_key,
        command_name: "CorrectReviewCandidate",
        command_fingerprint: fingerprint,
        actor: clone(envelope.actor),
        capability_grant_id: envelope.capability_grant_id,
        correlation_id: envelope.correlation_id,
      },
      review_member_id: envelope.command.review_member_id,
      prior_review_session_ref: {
        ...sessionRef(priorSession, priorSessionRecordHash),
        lifecycle: "open",
      },
      resulting_review_session_ref: {
        ...sessionRef(resultingSession, resultingSessionRecordHash),
        lifecycle: "open",
      },
      prior_candidate_ref: {
        schema_name: "petra.working-candidate",
        schema_version: "1.0.0",
        record_id: priorCandidate.working_candidate_id,
        revision: priorCandidate.revision,
        content_hash: priorCandidate.content_hash,
        record_hash: priorCandidateRecordHash,
      },
      resulting_candidate_ref: {
        schema_name: "petra.working-candidate",
        schema_version: "1.0.0",
        record_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
        record_hash: canonicalHash(candidate),
      },
      prior_relationship_ref: {
        schema_name: "petra.working-relationship",
        schema_version: "1.0.0",
        record_id: priorRelationship.working_relationship_id,
        revision: priorRelationship.revision,
        content_hash: priorRelationship.content_hash,
        record_hash: priorRelationshipRecordHash,
      },
      resulting_relationship_ref: {
        schema_name: "petra.working-relationship",
        schema_version: "1.0.0",
        record_id: relationship.working_relationship_id,
        revision: relationship.revision,
        content_hash: relationship.content_hash,
        record_hash: canonicalHash(relationship),
      },
      prior_profile_record_ref: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: priorProfile.claim_id,
        revision: priorProfile.revision,
        record_hash: canonicalHash(priorProfile),
      },
      resulting_profile_record_ref: {
        schema_name: "petra.claim",
        schema_version: "1.0.0",
        record_id: candidate.profile_object.object_record_ref.record_id,
        revision: candidate.profile_object.object_record_ref.revision,
        record_hash: candidate.profile_object.object_record_ref.record_hash,
      },
      correction_kind: candidate.lineage.change_kind as
        "mechanical_correction" | "material_revision",
      basis_transition: "retained_exact_scientific_source",
      validation: {
        state: candidate.validation.state,
        target_record_hash: candidate.validation.target_record_hash,
        validator_refs: candidate.validation.results.map((result) =>
          clone(result.validator_ref),
        ),
      },
      preservation: {
        candidate_identity: "retained",
        prior_candidate_revision: "retained",
        relationship_identity: "retained",
        prior_relationship_revision: "retained",
        review_session_identity: "retained",
        review_member_identity: "retained",
        review_decision: "none",
        change_sets: "unchanged",
        approvals: "unchanged",
        domain_events: "none",
        projection: "unchanged",
        history: "unchanged",
      },
      authority_boundary: {
        candidate_authority: "working_only",
        review_decision: "none",
        domain_authority: "unchanged",
        validation_authority: "none",
        mutation_authority: "capability_command_only",
        conversation_authority: "none",
        model_output_authority: "none",
      },
    };
    const receipt: PetraReviewCandidateCorrectionReceipt = {
      schema_name: "petra.review-candidate-correction-receipt",
      schema_version: "1.0.0",
      review_candidate_correction_receipt_id: derivePetraId(
        "review_correction_receipt",
        envelope.command_id,
      ),
      revision: 1,
      project_id: envelope.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: recordedAt,
    };
    this.#contracts.assertValid(
      "review-candidate-correction-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  async #insertCorrectionCommandExecution(
    client: PoolClient,
    envelope: ReviewCandidateCorrectionAuthorityCommandEnvelope,
    fingerprint: string,
    receipt: PetraReviewCandidateCorrectionReceipt,
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

  #storedCorrectionReceipt(
    value: unknown,
  ): PetraReviewCandidateCorrectionReceipt {
    this.#contracts.assertValid(
      "review-candidate-correction-receipt",
      "1.0.0",
      value,
    );
    const receipt = clone(value as PetraReviewCandidateCorrectionReceipt);
    if (receipt.content_hash !== canonicalHash(receipt.content)) {
      throw this.#correctionCorrupt(
        "A stored candidate-correction receipt does not match its canonical content hash.",
      );
    }
    return receipt;
  }

  #mappedWorkingCorrectionError(
    error: PostgresWorkingStateError,
  ): ReviewCandidateCorrectionAuthorityError {
    switch (error.code) {
      case "WORKING_STATE_PROFILE_UNSUPPORTED":
        return this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
          error.message,
        );
      case "WORKING_STATE_STALE":
      case "WORKING_STATE_CONFLICT":
        return this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE",
          error.message,
        );
      case "WORKING_STATE_REFERENCE_MISSING":
        return this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_PROVENANCE_INVALID",
          error.message,
        );
      case "WORKING_STATE_RELATION_INVALID":
        return this.#correctionError(
          "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID",
          error.message,
        );
    }
  }

  #mappedCorrectionBasisRevisionError(
    error: ReviewCandidateCorrectionAuthorityError,
  ): ReviewCandidateBasisRevisionAuthorityError {
    switch (error.code) {
      case "REVIEW_CANDIDATE_CORRECTION_COMMAND_NOT_AUTHORIZED":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_NOT_AUTHORIZED",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_COMMAND_ID_REUSED":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_ID_REUSED",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_IDEMPOTENCY_KEY_REUSED":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_IDEMPOTENCY_KEY_REUSED",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_PROJECT_MISMATCH":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROJECT_MISMATCH",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_SESSION_NOT_FOUND":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_SESSION_NOT_FOUND",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_LIFECYCLE_INVALID":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_LIFECYCLE_INVALID",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_MEMBER_MISMATCH":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_MEMBER_MISMATCH",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_BASIS_INCOMPATIBLE":
      case "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_PROVENANCE_INVALID":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROVENANCE_INVALID",
          error.message,
        );
      case "REVIEW_CANDIDATE_CORRECTION_STORED_RECORD_CORRUPT":
        return this.#basisRevisionCorrupt(error.message);
    }
  }

  #mappedWorkingBasisRevisionError(
    error: PostgresWorkingStateError,
  ): ReviewCandidateBasisRevisionAuthorityError {
    switch (error.code) {
      case "WORKING_STATE_PROFILE_UNSUPPORTED":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROFILE_UNSUPPORTED",
          error.message,
        );
      case "WORKING_STATE_STALE":
      case "WORKING_STATE_CONFLICT":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
          error.message,
        );
      case "WORKING_STATE_REFERENCE_MISSING":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_PROVENANCE_INVALID",
          error.message,
        );
      case "WORKING_STATE_RELATION_INVALID":
        return this.#basisRevisionError(
          "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
          error.message,
        );
    }
  }

  #separationReceipt(
    envelope: ReviewSessionSeparationCommandEnvelope,
    fingerprint: string,
    prior: PetraReviewSessionV110,
    priorRecordHash: string,
    source: PetraReviewSessionV110,
    sourceRecordHash: string,
    separated: PetraReviewSessionV110,
    separatedRecordHash: string,
    retainedMemberIds: string[],
    recordedAt: string,
  ): PetraReviewSessionSeparationReceipt {
    const content: PetraReviewSessionSeparationReceipt["content"] = {
      command_ref: {
        command_id: envelope.command_id,
        idempotency_key: envelope.idempotency_key,
        command_name: "SeparateReviewSessionMember",
        command_fingerprint: fingerprint,
        actor: clone(envelope.actor),
        capability_grant_id: envelope.capability_grant_id,
        correlation_id: envelope.correlation_id,
      },
      source_prior_review_session_ref: openSessionRef(prior, priorRecordHash),
      source_resulting_review_session_ref: openSessionRef(
        source,
        sourceRecordHash,
      ),
      separated_review_session_ref: openSessionRef(
        separated,
        separatedRecordHash,
      ),
      partition: {
        separated_review_member_id: envelope.command.review_member_id,
        retained_review_member_ids:
          retainedMemberIds as PetraReviewSessionSeparationReceipt["content"]["partition"]["retained_review_member_ids"],
        semantic_unit: "exact_review_member_unchanged",
        atomicity: "existing_change_sets_retained_without_cross_partition_unit",
      },
      preservation: {
        prior_review_revision: "retained",
        review_member_identities: "retained_exactly_once",
        working_candidates: "retained_unchanged",
        working_relationships: "retained_unchanged",
        profile_records: "retained_unchanged",
        basis_and_provenance: "retained_unchanged",
        validation_records: "retained_unchanged",
        change_sets: "retained_unchanged_atomic_boundaries",
        approvals: "retained_unchanged",
        command_events: "retained_unchanged",
        projection_receipts: "retained_unchanged",
        member_outcomes: "retained_derived_from_existing_authority",
      },
      authority_boundary: {
        review_membership: "separated_explicitly",
        review_decision: "none",
        candidate_authority: "none",
        validation_authority: "none",
        change_set_authority: "none",
        approval_authority: "none",
        domain_authority: "unchanged",
        domain_event_effect: "none",
        projection_effect: "none",
        recovery_effect: "none",
      },
    };
    const receipt: PetraReviewSessionSeparationReceipt = {
      schema_name: "petra.review-session-separation-receipt",
      schema_version: "1.0.0",
      review_session_separation_receipt_id: derivePetraId(
        "review_separation_receipt",
        envelope.command_id,
      ),
      revision: 1,
      project_id: envelope.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: recordedAt,
    };
    this.#contracts.assertValid(
      "review-session-separation-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  async #insertSeparationCommandExecution(
    client: PoolClient,
    envelope: ReviewSessionSeparationCommandEnvelope,
    fingerprint: string,
    receipt: PetraReviewSessionSeparationReceipt,
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

  #storedSeparationReceipt(
    value: unknown,
  ): PetraReviewSessionSeparationReceipt {
    this.#contracts.assertValid(
      "review-session-separation-receipt",
      "1.0.0",
      value,
    );
    const receipt = clone(value as PetraReviewSessionSeparationReceipt);
    if (receipt.content_hash !== canonicalHash(receipt.content)) {
      throw this.#separationCorrupt(
        "A retained ReviewSession separation result does not match its canonical content hash.",
      );
    }
    return receipt;
  }

  #refreshReceipt(
    envelope: ReviewSessionRefreshCommandEnvelope,
    fingerprint: string,
    prior: PetraReviewSessionV110,
    priorRecordHash: string,
    resulting: PetraReviewSessionV110,
    resultingRecordHash: string,
    recordedAt: string,
  ): PetraReviewSessionRefreshReceipt {
    const content: PetraReviewSessionRefreshReceipt["content"] = {
      command_ref: {
        command_id: envelope.command_id,
        idempotency_key: envelope.idempotency_key,
        command_name: "RefreshReviewSession",
        command_fingerprint: fingerprint,
        actor: clone(envelope.actor),
        capability_grant_id: envelope.capability_grant_id,
        correlation_id: envelope.correlation_id,
      },
      prior_review_session_ref: {
        review_session_id: prior.review_session_id,
        revision: prior.revision,
        content_hash: prior.content_hash,
        record_hash: priorRecordHash,
        lifecycle: "open",
      },
      resulting_review_session_ref: {
        review_session_id: resulting.review_session_id,
        revision: resulting.revision,
        content_hash: resulting.content_hash,
        record_hash: resultingRecordHash,
        lifecycle: "open",
      },
      transition: "refreshed",
      refresh_basis: {
        selection_basis: "same_review_members_current_working_heads",
        prior_snapshot: {
          event_position: prior.content.snapshot.event_position,
          stream_revision: prior.content.snapshot.stream_revision,
          captured_at: prior.content.snapshot.captured_at,
        },
        resulting_snapshot: {
          event_position: resulting.content.snapshot.event_position,
          stream_revision: resulting.content.snapshot.stream_revision,
          captured_at: resulting.content.snapshot.captured_at,
        },
        members: resulting.content.members.map((member) => ({
          review_member_id: member.review_member_id,
          candidate_ref: clone(member.working_state.candidate_ref),
          relationship_refs: clone(member.working_state.relationship_refs),
        })) as PetraReviewSessionRefreshReceipt["content"]["refresh_basis"]["members"],
      },
      preservation: {
        stale_review_revision: "retained",
        review_members: "retained_same_identity",
        working_candidates: "retained",
        working_relationships: "retained",
        validation_records: "retained_unchanged",
        change_sets: "retained_unchanged",
        approvals: "retained_unchanged",
        command_events: "retained_unchanged",
        projection_receipts: "retained_unchanged",
      },
      authority_boundary: {
        review_decision: "none",
        domain_authority: "unchanged",
        candidate_authority: "none",
        validation_authority: "none",
        change_set_authority: "none",
        approval_authority: "none",
        domain_event_effect: "none",
        projection_effect: "none",
      },
    };
    const receipt: PetraReviewSessionRefreshReceipt = {
      schema_name: "petra.review-session-refresh-receipt",
      schema_version: "1.0.0",
      review_session_refresh_receipt_id: derivePetraId(
        "review_session_refresh_receipt",
        envelope.command_id,
      ),
      revision: 1,
      project_id: envelope.project_id,
      content,
      content_hash: canonicalHash(content),
      recorded_at: recordedAt,
    };
    this.#contracts.assertValid(
      "review-session-refresh-receipt",
      "1.0.0",
      receipt,
    );
    return receipt;
  }

  async #insertRefreshCommandExecution(
    client: PoolClient,
    envelope: ReviewSessionRefreshCommandEnvelope,
    fingerprint: string,
    receipt: PetraReviewSessionRefreshReceipt,
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

  #storedRefreshReceipt(value: unknown): PetraReviewSessionRefreshReceipt {
    this.#contracts.assertValid(
      "review-session-refresh-receipt",
      "1.0.0",
      value,
    );
    const receipt = clone(value as PetraReviewSessionRefreshReceipt);
    if (receipt.content_hash !== canonicalHash(receipt.content)) {
      throw this.#refreshCorrupt(
        "A retained ReviewSession refresh result does not match its canonical content hash.",
      );
    }
    return receipt;
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

  #refreshError(
    code: ConstructorParameters<typeof ReviewSessionRefreshAuthorityError>[0],
    message: string,
  ): ReviewSessionRefreshAuthorityError {
    return new ReviewSessionRefreshAuthorityError(code, message);
  }

  #refreshCorrupt(message: string): ReviewSessionRefreshAuthorityError {
    return this.#refreshError(
      "REVIEW_SESSION_REFRESH_STORED_RECORD_CORRUPT",
      message,
    );
  }

  #separationError(
    code: ConstructorParameters<
      typeof ReviewSessionSeparationAuthorityError
    >[0],
    message: string,
  ): ReviewSessionSeparationAuthorityError {
    return new ReviewSessionSeparationAuthorityError(code, message);
  }

  #separationCorrupt(message: string): ReviewSessionSeparationAuthorityError {
    return this.#separationError(
      "REVIEW_SESSION_SEPARATION_STORED_RECORD_CORRUPT",
      message,
    );
  }

  #correctionError(
    code: ConstructorParameters<
      typeof ReviewCandidateCorrectionAuthorityError
    >[0],
    message: string,
  ): ReviewCandidateCorrectionAuthorityError {
    return new ReviewCandidateCorrectionAuthorityError(code, message);
  }

  #correctionCorrupt(message: string): ReviewCandidateCorrectionAuthorityError {
    return this.#correctionError(
      "REVIEW_CANDIDATE_CORRECTION_STORED_RECORD_CORRUPT",
      message,
    );
  }

  #basisRevisionError(
    code: ConstructorParameters<
      typeof ReviewCandidateBasisRevisionAuthorityError
    >[0],
    message: string,
  ): ReviewCandidateBasisRevisionAuthorityError {
    return new ReviewCandidateBasisRevisionAuthorityError(code, message);
  }

  #basisRevisionCorrupt(
    message: string,
  ): ReviewCandidateBasisRevisionAuthorityError {
    return this.#basisRevisionError(
      "REVIEW_CANDIDATE_BASIS_REVISION_STORED_RECORD_CORRUPT",
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
