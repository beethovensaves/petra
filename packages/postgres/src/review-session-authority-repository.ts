import { createHash } from "node:crypto";

import type {
  PetraAssertion,
  PetraClaim,
  PetraProjectDefinition,
  PetraReviewCandidateCorrectionReceipt,
  PetraReviewSessionLifecycleReceipt,
  PetraReviewSessionRefreshReceipt,
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
  ReviewSessionLifecycleAuthorityError,
  ReviewSessionRefreshAuthorityError,
  derivePetraId,
  type ReviewCandidateCorrectionAuthorityRepository,
  type ReviewCandidateCorrectionCommandEnvelope,
  type ReviewCandidateCorrectionCommandResult,
  type ReviewSessionAuthorityRepository,
  type ReviewSessionLifecycleAuthorityRepository,
  type ReviewSessionLifecycleCommandEnvelope,
  type ReviewSessionLifecycleCommandResult,
  type ReviewSessionRefreshAuthorityRepository,
  type ReviewSessionRefreshCommandEnvelope,
  type ReviewSessionRefreshCommandResult,
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
    | ReviewCandidateCorrectionCommandEnvelope,
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
    ReviewSessionLifecycleAuthorityRepository,
    ReviewSessionRefreshAuthorityRepository,
    ReviewCandidateCorrectionAuthorityRepository
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

  async executeReviewCandidateCorrectionCommand(
    envelope: ReviewCandidateCorrectionCommandEnvelope,
  ): Promise<ReviewCandidateCorrectionCommandResult> {
    this.#contracts.assertValid("command-envelope", "1.6.0", envelope);
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
      this.#assertCorrectionInput(
        envelope,
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
            candidate: envelope.command.corrected_candidate,
            profileRecord: envelope.command.corrected_profile_record,
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
        profileRecord: clone(envelope.command.corrected_profile_record),
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

  async #lockCorrectionCommand(
    client: PoolClient,
    envelope: ReviewCandidateCorrectionCommandEnvelope,
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

  async #replayCorrectionCommand(
    client: PoolClient,
    envelope: ReviewCandidateCorrectionCommandEnvelope,
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

  #assertCorrectionInput(
    envelope: ReviewCandidateCorrectionCommandEnvelope,
    session: PetraReviewSessionV110,
    member: ReviewSessionMemberV110,
    priorCandidate: PetraWorkingCandidate,
    priorCandidateRecordHash: string,
    priorRelationship: PetraWorkingRelationship,
    priorProfile: PetraClaim,
  ): void {
    const candidate = envelope.command.corrected_candidate;
    const profile = envelope.command.corrected_profile_record;
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
          "The relationship revision retains the exact prior working relationship while rebinding its object endpoint to the corrected candidate.",
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
      change_kind: "mechanical_correction",
      reason:
        "Rebind the existing scientific working relationship to the corrected WorkingCandidate revision.",
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
      | ReviewCandidateCorrectionCommandEnvelope,
    boundary: "lifecycle" | "refresh" | "correction",
  ): Promise<void> {
    const result = await client.query<{ actor_kind: string }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [envelope.project_id, envelope.actor.actor_id],
    );
    if (result.rows[0]?.actor_kind !== envelope.actor.actor_kind) {
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

  #correctionReceipt(
    envelope: ReviewCandidateCorrectionCommandEnvelope,
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
    envelope: ReviewCandidateCorrectionCommandEnvelope,
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
