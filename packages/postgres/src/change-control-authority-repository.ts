import type {
  PetraReviewSessionApplyRequest,
  PetraReviewSessionRejectRequest,
} from "@petra/contracts";
import { createHash, randomBytes } from "node:crypto";

import type {
  ActorRef,
  PetraApproval,
  PetraAssertion,
  PetraChangeSetRecord,
  PetraCommandEnvelopeRecord,
  PetraDomainEventRecord,
  PetraOutboxRecordRecord,
  PetraClaim,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ChangeControlError,
  buildReviewRejectPlan,
  createPetraId,
  petraIdKind,
  buildReviewApplyPlan,
} from "@petra/core";
import type {
  ChangeControlAuthorityRepository,
  ChangeControlCommandResult,
  ChangeControlErrorCode,
  ChangeSetDerivedState,
  DomainEventQuery,
  DomainRecordFactory,
  OutboxQuery,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";
import { insertEvidenceRecordRevision } from "./evidence-record-persistence.js";

type ChangeOperation<
  ChangeSet extends PetraChangeSetRecord = PetraChangeSetRecord,
> = ChangeSet extends PetraChangeSetRecord
  ? ChangeSet["content"]["operations"][number]
  : never;
type PromoteClaimChange = Extract<
  ChangeOperation,
  { operation_kind: "promote_claim" }
>;
type PromoteAssertionChange = Extract<
  ChangeOperation,
  { operation_kind: "promote_assertion" }
>;
type RetractClaimChange = Extract<
  ChangeOperation,
  { operation_kind: "retract_claim" }
>;
type RetractAssertionChange = Extract<
  ChangeOperation,
  { operation_kind: "retract_assertion" }
>;
type CommandRecord = PetraCommandEnvelopeRecord["command"];

interface CommandExecutionRow {
  command_id: string;
  command_fingerprint: string;
  outcome_kind: "success" | "failure";
  result: unknown;
  error_code: ChangeControlErrorCode | null;
  error_message: string | null;
}

interface ChangeSetRow {
  payload: unknown;
  current_state: ChangeSetDerivedState;
}

interface ApprovalRow {
  payload: unknown;
}

interface EvidenceRow {
  evidence_id: string;
  evidence_kind: "claim" | "assertion";
  current_revision: string;
  authority_zone: PetraClaim["authority"]["zone"];
  review_state: string;
  payload: unknown;
}

interface PositionRow {
  event_position: string;
  outbox_position: string;
}

interface RevisionRow {
  current_stream_revision: string;
}

interface TargetSequenceRow {
  current_target_sequence: string;
}

interface PayloadRow {
  payload: unknown;
}

interface StateRow {
  current_state: ChangeSetDerivedState;
}

type CommandPlan =
  | {
      result: ChangeControlCommandResult;
      event: PetraDomainEventRecord["event"];
      targets: readonly PetraOutboxRecordRecord["target"][];
      schemaVersion: PetraDomainEventRecord["schema_version"];
    }
  | {
      failure: ChangeControlError;
      event: PetraDomainEventRecord["event"];
      targets: readonly ["interface_authority"];
      schemaVersion: PetraDomainEventRecord["schema_version"];
    };

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const actorMatches = (left: ActorRef, right: ActorRef): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const encodeBase32 = (value: bigint, length: number): string => {
  let remaining = value;
  let encoded = "";
  for (let index = 0; index < length; index += 1) {
    encoded = ULID_ALPHABET[Number(remaining & 31n)] + encoded;
    remaining >>= 5n;
  }
  return encoded;
};

const systemUlid = (): string => {
  const timestamp = encodeBase32(BigInt(Date.now()), 10);
  const random = BigInt(`0x${randomBytes(10).toString("hex")}`);
  return `${timestamp}${encodeBase32(random, 16)}`;
};

const SYSTEM_DOMAIN_RECORD_FACTORY: DomainRecordFactory = {
  nextId: (kind) => createPetraId(kind, systemUlid()),
  now: () => new Date().toISOString(),
};

const boundedLimit = (limit: number | undefined): number => {
  const resolved = limit ?? 100;
  if (!Number.isInteger(resolved) || resolved < 1 || resolved > 1000) {
    throw new RangeError(
      "Authority query limit must be an integer from 1 to 1000.",
    );
  }
  return resolved;
};

export class PostgresChangeControlAuthorityRepository implements ChangeControlAuthorityRepository {
  readonly #pool: Pool;
  readonly #commandAuthorizer: PostgresCommandAuthorizer;
  readonly #domainRecordFactory: DomainRecordFactory;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    commandAuthorizer: PostgresCommandAuthorizer,
    domainRecordFactory: DomainRecordFactory = SYSTEM_DOMAIN_RECORD_FACTORY,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#commandAuthorizer = commandAuthorizer;
    this.#domainRecordFactory = domainRecordFactory;
    this.#contracts = contracts;
  }

  async executeCommand(
    envelope: PetraCommandEnvelopeRecord,
    checkpointGuard?: {
      readonly request:
        PetraReviewSessionApplyRequest | PetraReviewSessionRejectRequest;
      readonly lockKeys: readonly string[];
      readonly recheck: (client: PoolClient) => Promise<void>;
      readonly onReplay?: () => void;
    },
  ): Promise<ChangeControlCommandResult> {
    this.#contracts.assertValid(
      "command-envelope",
      envelope.schema_version,
      envelope,
    );
    if (checkpointGuard !== undefined) {
      const reject =
        checkpointGuard.request.schema_name ===
        "petra.review-session-reject-request";
      this.#contracts.assertValid(
        reject
          ? "review-session-reject-request"
          : "review-session-apply-request",
        "1.0.0",
        checkpointGuard.request,
      );
      const plan = reject
        ? buildReviewRejectPlan(checkpointGuard.request)
        : buildReviewApplyPlan(checkpointGuard.request);
      if (
        ![plan.submit, plan.review, plan.apply].some(
          (step) =>
            step !== undefined &&
            canonicalHash(step) === canonicalHash(envelope),
        )
      ) {
        throw new ChangeControlError(
          "COMMAND_NOT_AUTHORIZED",
          "The command does not bind the exact authenticated human checkpoint.",
        );
      }
    }
    const fingerprint = canonicalHash(envelope);
    const client = await this.#pool.connect();
    let transactionOpen = false;
    try {
      await client.query("BEGIN");
      transactionOpen = true;
      await this.#lockCommandScope(client, envelope, checkpointGuard?.lockKeys);
      if (
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capability_grant_id,
            commandName: envelope.command.command_name,
            projectId: envelope.project_id,
          },
          client,
        ))
      ) {
        throw new ChangeControlError(
          "COMMAND_NOT_AUTHORIZED",
          `Capability ${envelope.capability_grant_id} does not authorize ${envelope.command.command_name}.`,
        );
      }

      const replay = await this.#findReplay(client, envelope, fingerprint);
      if (replay !== undefined) {
        await client.query("COMMIT");
        transactionOpen = false;
        checkpointGuard?.onReplay?.();
        return this.#replay(replay);
      }

      await this.#requireCommandContext(client, envelope);
      if (
        (envelope.idempotency_key.startsWith("review-checkpoint:") ||
          envelope.idempotency_key.startsWith("review-reject:")) &&
        checkpointGuard === undefined
      ) {
        throw new ChangeControlError(
          "COMMAND_NOT_AUTHORIZED",
          "New Review checkpoint commands require the registered checkpoint owner's current-state guards.",
        );
      }
      // A server-composed checkpoint adds guards to this owner's transaction;
      // it never replaces current authorization or the owner's replay rules.
      await checkpointGuard?.recheck(client);
      const plan = await this.#executeUnseenCommand(client, envelope);
      const recordedAt = this.#domainRecordFactory.now();
      await this.#appendEventAndOutbox(
        client,
        envelope,
        plan.event,
        plan.targets,
        recordedAt,
        plan.schemaVersion,
      );
      await this.#insertCommandExecution(
        client,
        envelope,
        fingerprint,
        plan,
        recordedAt,
        checkpointGuard?.request,
      );
      await client.query("COMMIT");
      transactionOpen = false;

      if ("failure" in plan) {
        throw new ChangeControlError(plan.failure.code, plan.failure.message);
      }
      return clone(plan.result);
    } catch (error) {
      if (transactionOpen) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getChangeSet(
    changeSetId: string,
  ): Promise<PetraChangeSetRecord | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      "SELECT payload FROM petra.change_sets WHERE change_set_id = $1",
      [changeSetId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    return this.#readChangeSet(payload);
  }

  async getChangeSetState(
    changeSetId: string,
  ): Promise<ChangeSetDerivedState | undefined> {
    const result = await this.#pool.query<StateRow>(
      "SELECT current_state FROM petra.change_sets WHERE change_set_id = $1",
      [changeSetId],
    );
    return result.rows[0]?.current_state;
  }

  async getApproval(approvalId: string): Promise<PetraApproval | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      "SELECT payload FROM petra.approvals WHERE approval_id = $1",
      [approvalId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("approval", "1.0.0", payload);
    return clone(payload as PetraApproval);
  }

  async getDomainEvents(
    query: DomainEventQuery,
  ): Promise<PetraDomainEventRecord[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.domain_events
        WHERE project_id = $1 AND stream_revision > $2
        ORDER BY stream_revision
        LIMIT $3`,
      [
        query.projectId,
        query.afterStreamRevision ?? 0,
        boundedLimit(query.limit),
      ],
    );
    return result.rows.map(({ payload }) => {
      return this.#readDomainEvent(payload);
    });
  }

  async getOutboxRecords(
    query: OutboxQuery,
  ): Promise<PetraOutboxRecordRecord[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload
         FROM petra.outbox_records
        WHERE partition_key = $1
          AND target = $2
          AND target_sequence > $3
        ORDER BY target_sequence
        LIMIT $4`,
      [
        query.projectId,
        query.target,
        query.afterTargetSequence ?? 0,
        boundedLimit(query.limit),
      ],
    );
    return result.rows.map(({ payload }) => {
      return this.#readOutboxRecord(payload);
    });
  }

  async #lockCommandScope(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    checkpointLockKeys: readonly string[] = [],
  ): Promise<void> {
    const keys = new Set<string>([
      ...checkpointLockKeys,
      "authority:positions",
      `command:${envelope.command_id}`,
      `idempotency:${envelope.idempotency_key}`,
      `project:${envelope.project_id}`,
    ]);
    switch (envelope.command.command_name) {
      case "SubmitChangeSet":
        keys.add(`change-set:${envelope.command.change_set.change_set_id}`);
        for (const operation of envelope.command.change_set.content
          .operations) {
          keys.add(`evidence:${operation.target_id}`);
        }
        break;
      case "RecordApproval":
        keys.add(`approval:${envelope.command.approval.approval_id}`);
        keys.add(
          `change-set:${envelope.command.approval.subject.change_set_id}`,
        );
        break;
      case "ApplyChangeSet":
        keys.add(`change-set:${envelope.command.change_set_id}`);
        keys.add(`approval:${envelope.command.approval_id}`);
        break;
    }
    for (const key of [...keys].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #findReplay(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    fingerprint: string,
  ): Promise<CommandExecutionRow | undefined> {
    const byIdempotency = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, outcome_kind, result,
              error_code, error_message
         FROM petra.command_executions
        WHERE idempotency_key = $1`,
      [envelope.idempotency_key],
    );
    const idempotent = byIdempotency.rows[0];
    if (idempotent !== undefined) {
      if (idempotent.command_fingerprint !== fingerprint) {
        throw new ChangeControlError(
          "IDEMPOTENCY_KEY_REUSED",
          "The idempotency key is already bound to different command content.",
        );
      }
      return idempotent;
    }

    const byCommandId = await client.query<CommandExecutionRow>(
      `SELECT command_id, command_fingerprint, outcome_kind, result,
              error_code, error_message
         FROM petra.command_executions
        WHERE command_id = $1`,
      [envelope.command_id],
    );
    const command = byCommandId.rows[0];
    if (command !== undefined && command.command_fingerprint !== fingerprint) {
      throw new ChangeControlError(
        "COMMAND_ID_REUSED",
        `Command ID ${envelope.command_id} is already bound to different content.`,
      );
    }
    return command;
  }

  #replay(row: CommandExecutionRow): ChangeControlCommandResult {
    if (row.outcome_kind === "failure") {
      if (row.error_code === null || row.error_message === null) {
        throw new Error("Stored failed command is incomplete.");
      }
      throw new ChangeControlError(row.error_code, row.error_message);
    }
    if (row.result === null) {
      throw new Error("Stored successful command has no result.");
    }
    return clone(row.result as ChangeControlCommandResult);
  }

  async #requireCommandContext(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
  ): Promise<void> {
    const context = await client.query<{ actor_kind: ActorRef["actor_kind"] }>(
      `SELECT actor.actor_kind
         FROM petra.projects AS project
         JOIN petra.actors AS actor ON actor.actor_id = $2
        WHERE project.project_id = $1`,
      [envelope.project_id, envelope.actor.actor_id],
    );
    if (context.rows[0] === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_PROJECT_MISMATCH",
        "The command Project and Actor must both be registered.",
      );
    }
    if (context.rows[0].actor_kind !== envelope.actor.actor_kind) {
      throw new ChangeControlError(
        "APPROVAL_ACTOR_MISMATCH",
        "The command Actor kind differs from the registered Actor identity.",
      );
    }
  }

  #executeUnseenCommand(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
  ): Promise<CommandPlan> {
    switch (envelope.command.command_name) {
      case "SubmitChangeSet":
        return this.#submitChangeSet(client, envelope, envelope.command);
      case "RecordApproval":
        return this.#recordApproval(client, envelope, envelope.command);
      case "ApplyChangeSet":
        return this.#applyChangeSet(client, envelope, envelope.command);
    }
  }

  async #submitChangeSet(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    command: Extract<CommandRecord, { command_name: "SubmitChangeSet" }>,
  ): Promise<CommandPlan> {
    const changeSet = command.change_set;
    if (changeSet.revision !== 1 || changeSet.state !== "submitted") {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_SUBMITTED",
        "The first ChangeSet contract accepts only submitted revision 1 proposals.",
      );
    }
    const existing = await client.query(
      "SELECT 1 FROM petra.change_sets WHERE change_set_id = $1",
      [changeSet.change_set_id],
    );
    if (existing.rowCount !== 0) {
      throw new ChangeControlError(
        "CHANGE_SET_ID_REUSED",
        `ChangeSet ID ${changeSet.change_set_id} is already registered.`,
      );
    }
    if (changeSet.content.project_id !== envelope.project_id) {
      throw new ChangeControlError(
        "CHANGE_SET_PROJECT_MISMATCH",
        "The command and ChangeSet must name the same Project.",
      );
    }
    if (!actorMatches(changeSet.content.proposed_by, envelope.actor)) {
      throw new ChangeControlError(
        "CHANGE_SET_PROPOSER_MISMATCH",
        "The submitting command actor must be the recorded ChangeSet proposer.",
      );
    }
    if (canonicalHash(changeSet.content) !== changeSet.content_hash) {
      throw new ChangeControlError(
        "CHANGE_SET_HASH_MISMATCH",
        "The ChangeSet content does not match its RFC 8785 content hash.",
      );
    }
    if (changeSet.content.risk_tier !== "R2") {
      throw new ChangeControlError(
        "CHANGE_SET_RISK_TIER_INVALID",
        "Scientific authority promotion must be classified as R2.",
      );
    }

    if (this.#isReversalChangeSet(changeSet)) {
      if (
        changeSet.schema_version !== "1.1.0" ||
        changeSet.content.compensates_change_set_id === undefined
      ) {
        throw new ChangeControlError(
          "CHANGE_SET_COMPENSATION_REQUIRED",
          "A reversal must use ChangeSet 1.1 and name the applied ChangeSet it compensates.",
        );
      }
      const pair = this.#reversalPair(changeSet);
      const targets = await this.#loadEvidenceTargets(client, pair);
      await this.#validateReversalTargets(client, changeSet, pair, targets);
    } else {
      if (
        "compensates_change_set_id" in changeSet.content &&
        changeSet.content.compensates_change_set_id !== undefined
      ) {
        throw new ChangeControlError(
          "CHANGE_SET_COMPENSATION_INVALID",
          "A promotion cannot name a compensated ChangeSet.",
        );
      }
      const pair = this.#promotionPair(changeSet);
      const targets = await this.#loadEvidenceTargets(client, pair);
      this.#validatePromotionTargets(changeSet, pair, targets);
    }
    await this.#insertChangeSet(client, changeSet);

    const result: ChangeControlCommandResult = {
      outcome: "submitted",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: "submitted",
    };
    return {
      result,
      event: {
        event_type: "change_set.submitted",
        payload: { change_set: clone(changeSet) },
      } as PetraDomainEventRecord["event"],
      targets: ["interface_authority"],
      schemaVersion: changeSet.schema_version,
    };
  }

  async #recordApproval(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    command: Extract<CommandRecord, { command_name: "RecordApproval" }>,
  ): Promise<CommandPlan> {
    const approval = command.approval;
    if (approval.revision !== 1) {
      throw new ChangeControlError(
        "APPROVAL_SUBJECT_MISMATCH",
        "The first Approval contract accepts only revision 1 decisions.",
      );
    }
    const existing = await client.query(
      "SELECT 1 FROM petra.approvals WHERE approval_id = $1",
      [approval.approval_id],
    );
    if (existing.rowCount !== 0) {
      throw new ChangeControlError(
        "APPROVAL_ID_REUSED",
        `Approval ID ${approval.approval_id} is already registered.`,
      );
    }
    if (
      approval.decided_by.actor_kind !== "human" ||
      envelope.actor.actor_kind !== "human" ||
      !actorMatches(approval.decided_by, envelope.actor)
    ) {
      throw new ChangeControlError(
        "APPROVAL_ACTOR_MISMATCH",
        "The command actor must be the human who made the Approval decision.",
      );
    }

    const row = await this.#loadChangeSet(
      client,
      approval.subject.change_set_id,
    );
    if (row === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_REGISTERED",
        `ChangeSet ${approval.subject.change_set_id} is not registered.`,
      );
    }
    const changeSet = this.#readChangeSet(row.payload);
    if (row.current_state !== "submitted") {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_SUBMITTED",
        "Only a submitted ChangeSet without a prior decision may receive an Approval.",
      );
    }
    if (
      envelope.project_id !== changeSet.content.project_id ||
      approval.subject.change_set_revision !== changeSet.revision ||
      approval.subject.change_set_content_hash !== changeSet.content_hash
    ) {
      throw new ChangeControlError(
        "APPROVAL_SUBJECT_MISMATCH",
        "Approval must bind the exact registered ChangeSet project, revision, and content hash.",
      );
    }

    await this.#insertApproval(client, approval);
    const state = approval.decision === "approved" ? "approved" : "rejected";
    await client.query(
      `UPDATE petra.change_sets
          SET current_state = $2, state_updated_at = $3::timestamptz
        WHERE change_set_id = $1`,
      [changeSet.change_set_id, state, envelope.submitted_at],
    );

    const result: ChangeControlCommandResult = {
      outcome: "approval_recorded",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: state,
      approval_id: approval.approval_id,
    };
    return {
      result,
      event: {
        event_type: "approval.recorded",
        payload: {
          approval: clone(approval),
          derived_change_set_state: state,
        },
      },
      targets: ["interface_authority"],
      schemaVersion: changeSet.schema_version,
    };
  }

  async #applyChangeSet(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    command: Extract<CommandRecord, { command_name: "ApplyChangeSet" }>,
  ): Promise<CommandPlan> {
    const row = await this.#loadChangeSet(client, command.change_set_id);
    if (row === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_NOT_REGISTERED",
        `ChangeSet ${command.change_set_id} is not registered.`,
      );
    }
    const changeSet = this.#readChangeSet(row.payload);
    if (row.current_state === "applied") {
      throw new ChangeControlError(
        "CHANGE_SET_ALREADY_APPLIED",
        `ChangeSet ${changeSet.change_set_id} has already been applied.`,
      );
    }
    if (
      envelope.project_id !== changeSet.content.project_id ||
      command.change_set_revision !== changeSet.revision ||
      command.change_set_content_hash !== changeSet.content_hash ||
      canonicalHash(changeSet.content) !== changeSet.content_hash
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_HASH_MISMATCH",
        "ApplyChangeSet must name the exact registered ChangeSet revision and content hash.",
      );
    }

    const approvalRow = await client.query<ApprovalRow>(
      `SELECT payload FROM petra.approvals
        WHERE approval_id = $1 AND revision = $2`,
      [command.approval_id, command.approval_revision],
    );
    const approvalPayload = approvalRow.rows[0]?.payload;
    if (approvalPayload === undefined) {
      throw new ChangeControlError(
        "APPROVAL_NOT_REGISTERED",
        "ApplyChangeSet must name an exact registered Approval revision.",
      );
    }
    const approval = this.#readApproval(approvalPayload);
    if (
      approval.subject.change_set_id !== changeSet.change_set_id ||
      approval.subject.change_set_revision !== changeSet.revision ||
      approval.subject.change_set_content_hash !== changeSet.content_hash
    ) {
      throw new ChangeControlError(
        "APPROVAL_SUBJECT_MISMATCH",
        "The Approval does not bind the ChangeSet being applied.",
      );
    }
    if (approval.decision !== "approved") {
      throw new ChangeControlError(
        "APPROVAL_NOT_GRANTED",
        "A rejected ChangeSet cannot be applied.",
      );
    }
    if (approval.conditions.length > 0) {
      throw new ChangeControlError(
        "APPROVAL_CONDITIONS_UNSATISFIED",
        "Conditional approvals require explicit condition-satisfaction evidence before application.",
      );
    }
    if (row.current_state !== "approved") {
      throw new ChangeControlError(
        "CHANGE_SET_STATE_INVALID",
        "ApplyChangeSet requires the ChangeSet to be in its derived approved state.",
      );
    }
    if (
      envelope.actor.actor_kind !== "human" ||
      !actorMatches(approval.decided_by, envelope.actor)
    ) {
      throw new ChangeControlError(
        "APPROVAL_ACTOR_MISMATCH",
        "The applying actor must be the human bound to this initial Approval path.",
      );
    }

    if (this.#isReversalChangeSet(changeSet)) {
      return this.#applyReversal(client, envelope, changeSet, approval);
    }

    const pair = this.#promotionPair(changeSet);
    const targets = await this.#loadEvidenceTargets(client, pair);
    try {
      this.#validatePromotionTargets(changeSet, pair, targets);
    } catch (error) {
      if (
        error instanceof ChangeControlError &&
        (error.code === "STALE_TARGET_REVISION" ||
          error.code === "TARGET_AUTHORITY_MISMATCH")
      ) {
        await client.query(
          `UPDATE petra.change_sets
              SET current_state = 'conflicted', state_updated_at = $2::timestamptz
            WHERE change_set_id = $1`,
          [changeSet.change_set_id, envelope.submitted_at],
        );
        return {
          failure: error,
          event: this.#conflictEvent(changeSet, pair, targets, error.code),
          targets: ["interface_authority"],
          schemaVersion: changeSet.schema_version,
        };
      }
      throw error;
    }

    const promotion = {
      zone: "trusted" as const,
      review_state: "human_accepted" as const,
      promotion: {
        change_set_id: changeSet.change_set_id,
        approval_basis: {
          approval_kind: "human" as const,
          approval_id: approval.approval_id,
          approved_by: clone(approval.decided_by),
        },
        applied_at: envelope.submitted_at,
      },
    };
    const promotedClaim = clone(targets.claim);
    promotedClaim.revision += 1;
    promotedClaim.authority = clone(promotion);
    const promotedAssertion = clone(targets.assertion);
    promotedAssertion.revision += 1;
    promotedAssertion.authority = clone(promotion);
    this.#contracts.assertValid("claim", "1.0.0", promotedClaim);
    this.#contracts.assertValid("assertion", "1.0.0", promotedAssertion);

    await insertEvidenceRecordRevision(client, promotedClaim, {
      admissionKind: "promotion",
      recordedAt: envelope.submitted_at,
      createIdentity: false,
    });
    await insertEvidenceRecordRevision(client, promotedAssertion, {
      admissionKind: "promotion",
      recordedAt: envelope.submitted_at,
      createIdentity: false,
    });
    await this.#insertEvidenceAuthorization(
      client,
      promotedClaim,
      changeSet,
      approval,
      envelope.submitted_at,
      "promotion",
    );
    await this.#insertEvidenceAuthorization(
      client,
      promotedAssertion,
      changeSet,
      approval,
      envelope.submitted_at,
      "promotion",
    );
    await client.query(
      `UPDATE petra.evidence_entities
          SET current_revision = current_revision + 1
        WHERE evidence_id = ANY($1::text[])`,
      [[promotedClaim.claim_id, promotedAssertion.assertion_id]],
    );
    await client.query(
      `UPDATE petra.change_sets
          SET current_state = 'applied', state_updated_at = $2::timestamptz,
              applied_approval_id = $3
        WHERE change_set_id = $1`,
      [changeSet.change_set_id, envelope.submitted_at, approval.approval_id],
    );

    const result: ChangeControlCommandResult = {
      outcome: "applied",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: "applied",
      approval_id: approval.approval_id,
      claim_id: promotedClaim.claim_id,
      claim_revision: promotedClaim.revision,
      assertion_id: promotedAssertion.assertion_id,
      assertion_revision: promotedAssertion.revision,
      applied_at: envelope.submitted_at,
    };
    return {
      result,
      event: {
        event_type: "change_set.applied",
        payload: {
          change_set_id: changeSet.change_set_id,
          change_set_revision: changeSet.revision,
          change_set_content_hash: changeSet.content_hash,
          approval_id: approval.approval_id,
          approval_revision: approval.revision,
          prior_claim_revision: promotedClaim.revision - 1,
          claim: clone(promotedClaim),
          prior_assertion_revision: promotedAssertion.revision - 1,
          assertion: clone(promotedAssertion),
        },
      },
      targets: ["neo4j_graph", "interface_authority"],
      schemaVersion: changeSet.schema_version,
    };
  }

  async #applyReversal(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    changeSet: PetraChangeSetRecord,
    approval: PetraApproval,
  ): Promise<CommandPlan> {
    if (
      changeSet.schema_version !== "1.1.0" ||
      changeSet.content.compensates_change_set_id === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_REQUIRED",
        "A reversal must name the applied ChangeSet it compensates.",
      );
    }
    const pair = this.#reversalPair(changeSet);
    const targets = await this.#loadEvidenceTargets(client, pair);
    try {
      await this.#validateReversalTargets(client, changeSet, pair, targets);
    } catch (error) {
      if (
        error instanceof ChangeControlError &&
        (error.code === "STALE_TARGET_REVISION" ||
          error.code === "TARGET_AUTHORITY_MISMATCH")
      ) {
        await client.query(
          `UPDATE petra.change_sets
              SET current_state = 'conflicted', state_updated_at = $2::timestamptz
            WHERE change_set_id = $1`,
          [changeSet.change_set_id, envelope.submitted_at],
        );
        return {
          failure: error,
          event: this.#reversalConflictEvent(
            changeSet,
            pair,
            targets,
            error.code,
          ),
          targets: ["interface_authority"],
          schemaVersion: "1.1.0",
        };
      }
      throw error;
    }

    const rejectedAuthority = {
      zone: "quarantine" as const,
      review_state: "human_rejected" as const,
    };
    const rejectedClaim = clone(targets.claim);
    rejectedClaim.revision += 1;
    rejectedClaim.authority = clone(rejectedAuthority);
    const rejectedAssertion = clone(targets.assertion);
    rejectedAssertion.revision += 1;
    rejectedAssertion.authority = clone(rejectedAuthority);
    this.#contracts.assertValid("claim", "1.0.0", rejectedClaim);
    this.#contracts.assertValid("assertion", "1.0.0", rejectedAssertion);

    await insertEvidenceRecordRevision(client, rejectedClaim, {
      admissionKind: "reversal",
      recordedAt: envelope.submitted_at,
      createIdentity: false,
    });
    await insertEvidenceRecordRevision(client, rejectedAssertion, {
      admissionKind: "reversal",
      recordedAt: envelope.submitted_at,
      createIdentity: false,
    });
    await this.#insertEvidenceAuthorization(
      client,
      rejectedClaim,
      changeSet,
      approval,
      envelope.submitted_at,
      "reversal",
    );
    await this.#insertEvidenceAuthorization(
      client,
      rejectedAssertion,
      changeSet,
      approval,
      envelope.submitted_at,
      "reversal",
    );
    await client.query(
      `UPDATE petra.evidence_entities
          SET current_revision = current_revision + 1
        WHERE evidence_id = ANY($1::text[])`,
      [[rejectedClaim.claim_id, rejectedAssertion.assertion_id]],
    );
    await client.query(
      `UPDATE petra.change_sets
          SET current_state = 'applied', state_updated_at = $2::timestamptz,
              applied_approval_id = $3
        WHERE change_set_id = $1`,
      [changeSet.change_set_id, envelope.submitted_at, approval.approval_id],
    );
    await client.query(
      `UPDATE petra.change_sets
          SET current_state = 'reverted', state_updated_at = $2::timestamptz
        WHERE change_set_id = $1`,
      [changeSet.content.compensates_change_set_id, envelope.submitted_at],
    );

    const result: ChangeControlCommandResult = {
      outcome: "reverted",
      command_id: envelope.command_id,
      change_set_id: changeSet.change_set_id,
      change_set_state: "applied",
      compensates_change_set_id: changeSet.content.compensates_change_set_id,
      approval_id: approval.approval_id,
      claim_id: rejectedClaim.claim_id,
      claim_revision: rejectedClaim.revision,
      assertion_id: rejectedAssertion.assertion_id,
      assertion_revision: rejectedAssertion.revision,
      applied_at: envelope.submitted_at,
    };
    return {
      result,
      event: {
        event_type: "change_set.reverted",
        payload: {
          change_set_id: changeSet.change_set_id,
          change_set_revision: 1,
          change_set_content_hash: changeSet.content_hash,
          compensates_change_set_id:
            changeSet.content.compensates_change_set_id,
          approval_id: approval.approval_id,
          approval_revision: 1,
          prior_claim_revision: rejectedClaim.revision - 1,
          claim: clone(rejectedClaim),
          prior_assertion_revision: rejectedAssertion.revision - 1,
          assertion: clone(rejectedAssertion),
        },
      },
      targets: ["neo4j_graph", "interface_authority"],
      schemaVersion: "1.1.0",
    };
  }

  #isReversalChangeSet(changeSet: PetraChangeSetRecord): boolean {
    return changeSet.content.operations.some(
      (operation) =>
        operation.operation_kind === "retract_claim" ||
        operation.operation_kind === "retract_assertion",
    );
  }

  #promotionPair(changeSet: PetraChangeSetRecord): {
    claim: PromoteClaimChange;
    assertion: PromoteAssertionChange;
  } {
    const claims = changeSet.content.operations.filter(
      (operation): operation is PromoteClaimChange =>
        operation.operation_kind === "promote_claim",
    );
    const assertions = changeSet.content.operations.filter(
      (operation): operation is PromoteAssertionChange =>
        operation.operation_kind === "promote_assertion",
    );
    if (
      changeSet.content.operations.length !== 2 ||
      claims.length !== 1 ||
      assertions.length !== 1 ||
      claims[0] === undefined ||
      assertions[0] === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_OPERATION_SET_INVALID",
        "The first scientific promotion ChangeSet must contain exactly one Claim and one Assertion operation.",
      );
    }
    return {
      claim: claims[0] as PromoteClaimChange,
      assertion: assertions[0] as PromoteAssertionChange,
    };
  }

  #reversalPair(changeSet: PetraChangeSetRecord): {
    claim: RetractClaimChange;
    assertion: RetractAssertionChange;
  } {
    const claims = changeSet.content.operations.filter(
      (operation) => operation.operation_kind === "retract_claim",
    );
    const assertions = changeSet.content.operations.filter(
      (operation) => operation.operation_kind === "retract_assertion",
    );
    if (
      changeSet.content.operations.length !== 2 ||
      claims.length !== 1 ||
      assertions.length !== 1 ||
      claims[0] === undefined ||
      assertions[0] === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_OPERATION_SET_INVALID",
        "A scientific authority reversal must contain exactly one Claim and one Assertion retraction.",
      );
    }
    return {
      claim: claims[0] as RetractClaimChange,
      assertion: assertions[0] as RetractAssertionChange,
    };
  }

  async #loadEvidenceTargets(
    client: PoolClient,
    pair: {
      claim: PromoteClaimChange | RetractClaimChange;
      assertion: PromoteAssertionChange | RetractAssertionChange;
    },
  ): Promise<{ claim: PetraClaim; assertion: PetraAssertion }> {
    const ids = [pair.claim.target_id, pair.assertion.target_id].sort();
    const result = await client.query<EvidenceRow>(
      `SELECT entity.evidence_id, entity.evidence_kind,
              entity.current_revision, revision.authority_zone,
              revision.review_state, revision.payload
         FROM petra.evidence_entities AS entity
         JOIN petra.evidence_entity_revisions AS revision
           ON revision.evidence_id = entity.evidence_id
          AND revision.evidence_kind = entity.evidence_kind
          AND revision.revision = entity.current_revision
        WHERE entity.evidence_id = ANY($1::text[])
        ORDER BY entity.evidence_id
        FOR UPDATE OF entity`,
      [ids],
    );
    const byId = new Map(result.rows.map((row) => [row.evidence_id, row]));
    const claimRow = byId.get(pair.claim.target_id);
    const assertionRow = byId.get(pair.assertion.target_id);
    if (
      claimRow?.evidence_kind !== "claim" ||
      assertionRow?.evidence_kind !== "assertion"
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "Every ChangeSet promotion target must already exist in quarantine.",
      );
    }
    this.#contracts.assertValid("claim", "1.0.0", claimRow.payload);
    this.#contracts.assertValid("assertion", "1.0.0", assertionRow.payload);
    return {
      claim: clone(claimRow.payload as PetraClaim),
      assertion: clone(assertionRow.payload as PetraAssertion),
    };
  }

  #validatePromotionTargets(
    changeSet: PetraChangeSetRecord,
    pair: { claim: PromoteClaimChange; assertion: PromoteAssertionChange },
    targets: { claim: PetraClaim; assertion: PetraAssertion },
  ): void {
    if (
      targets.claim.revision !== pair.claim.base_revision ||
      targets.assertion.revision !== pair.assertion.base_revision
    ) {
      throw new ChangeControlError(
        "STALE_TARGET_REVISION",
        "At least one ChangeSet target has changed since the impact preview.",
      );
    }
    if (
      targets.claim.authority.zone !== "quarantine" ||
      targets.assertion.authority.zone !== "quarantine" ||
      targets.claim.authority.review_state !== pair.claim.before.review_state ||
      targets.assertion.authority.review_state !==
        pair.assertion.before.review_state
    ) {
      throw new ChangeControlError(
        "TARGET_AUTHORITY_MISMATCH",
        "The target authority state no longer matches the ChangeSet before-state.",
      );
    }
    if (
      targets.assertion.predicate !== "ASSERTS" ||
      targets.assertion.object.object_kind !== "entity" ||
      targets.assertion.object.entity_id !== targets.claim.claim_id
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The promotion pair must contain a Claim and its corresponding ASSERTS Assertion.",
      );
    }
    const affected = new Set(changeSet.content.impact.affected_object_ids);
    if (
      affected.size !== 2 ||
      !affected.has(targets.claim.claim_id) ||
      !affected.has(targets.assertion.assertion_id)
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The impact preview must name exactly the Claim and Assertion changed by this ChangeSet.",
      );
    }
  }

  async #validateReversalTargets(
    client: PoolClient,
    changeSet: PetraChangeSetRecord,
    pair: { claim: RetractClaimChange; assertion: RetractAssertionChange },
    targets: { claim: PetraClaim; assertion: PetraAssertion },
  ): Promise<void> {
    if (
      changeSet.schema_version !== "1.1.0" ||
      changeSet.content.compensates_change_set_id === undefined
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_REQUIRED",
        "A reversal must name the promotion ChangeSet it compensates.",
      );
    }
    const compensatedRow = await this.#loadChangeSet(
      client,
      changeSet.content.compensates_change_set_id,
    );
    if (compensatedRow === undefined) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_INVALID",
        "The compensated ChangeSet must be a registered promotion.",
      );
    }
    const compensated = this.#readChangeSet(compensatedRow.payload);
    if (this.#isReversalChangeSet(compensated)) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_INVALID",
        "A reversal cannot compensate another reversal.",
      );
    }
    if (compensatedRow.current_state === "reverted") {
      throw new ChangeControlError(
        "CHANGE_SET_ALREADY_REVERTED",
        `ChangeSet ${compensated.change_set_id} has already been reversed.`,
      );
    }
    if (compensatedRow.current_state !== "applied") {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_INVALID",
        "Only an applied promotion ChangeSet may be reversed.",
      );
    }
    const promoted = this.#promotionPair(compensated);
    if (
      promoted.claim.target_id !== pair.claim.target_id ||
      promoted.assertion.target_id !== pair.assertion.target_id
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_COMPENSATION_INVALID",
        "A reversal must target the exact pair created by the compensated promotion.",
      );
    }
    if (
      targets.claim.revision !== pair.claim.base_revision ||
      targets.assertion.revision !== pair.assertion.base_revision
    ) {
      throw new ChangeControlError(
        "STALE_TARGET_REVISION",
        "At least one reversal target has changed since the impact preview.",
      );
    }
    const compensatedId = compensated.change_set_id;
    if (
      targets.claim.authority.zone !== "trusted" ||
      targets.assertion.authority.zone !== "trusted" ||
      targets.claim.authority.review_state !== "human_accepted" ||
      targets.assertion.authority.review_state !== "human_accepted" ||
      targets.claim.authority.promotion.change_set_id !== compensatedId ||
      targets.assertion.authority.promotion.change_set_id !== compensatedId ||
      pair.claim.before.zone !== "trusted" ||
      pair.claim.before.review_state !== "human_accepted" ||
      pair.assertion.before.zone !== "trusted" ||
      pair.assertion.before.review_state !== "human_accepted" ||
      pair.claim.after.zone !== "quarantine" ||
      pair.claim.after.review_state !== "human_rejected" ||
      pair.assertion.after.zone !== "quarantine" ||
      pair.assertion.after.review_state !== "human_rejected"
    ) {
      throw new ChangeControlError(
        "TARGET_AUTHORITY_MISMATCH",
        "The targets are no longer the trusted pair created by the compensated promotion.",
      );
    }
    if (
      targets.assertion.predicate !== "ASSERTS" ||
      targets.assertion.object.object_kind !== "entity" ||
      targets.assertion.object.entity_id !== targets.claim.claim_id
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The reversal pair must contain a Claim and its corresponding ASSERTS Assertion.",
      );
    }
    const affected = new Set(changeSet.content.impact.affected_object_ids);
    if (
      affected.size !== 2 ||
      !affected.has(targets.claim.claim_id) ||
      !affected.has(targets.assertion.assertion_id)
    ) {
      throw new ChangeControlError(
        "CHANGE_SET_TARGET_MISMATCH",
        "The reversal impact preview must name exactly the Claim and Assertion being retracted.",
      );
    }
  }

  #conflictEvent(
    changeSet: PetraChangeSetRecord,
    pair: { claim: PromoteClaimChange; assertion: PromoteAssertionChange },
    targets: { claim: PetraClaim; assertion: PetraAssertion },
    code: "STALE_TARGET_REVISION" | "TARGET_AUTHORITY_MISMATCH",
  ): PetraDomainEventRecord["event"] {
    return {
      event_type: "change_set.conflicted",
      payload: {
        change_set_id: changeSet.change_set_id,
        change_set_revision: changeSet.revision,
        change_set_content_hash: changeSet.content_hash,
        conflict_code: code,
        targets: [
          {
            target_kind: "claim",
            target_id: targets.claim.claim_id,
            expected_revision: pair.claim.base_revision,
            actual_revision: targets.claim.revision,
            expected_zone: "quarantine",
            actual_zone: targets.claim.authority.zone,
          },
          {
            target_kind: "assertion",
            target_id: targets.assertion.assertion_id,
            expected_revision: pair.assertion.base_revision,
            actual_revision: targets.assertion.revision,
            expected_zone: "quarantine",
            actual_zone: targets.assertion.authority.zone,
          },
        ],
      },
    };
  }

  #reversalConflictEvent(
    changeSet: PetraChangeSetRecord,
    pair: { claim: RetractClaimChange; assertion: RetractAssertionChange },
    targets: { claim: PetraClaim; assertion: PetraAssertion },
    code: "STALE_TARGET_REVISION" | "TARGET_AUTHORITY_MISMATCH",
  ): PetraDomainEventRecord["event"] {
    if (
      changeSet.schema_version !== "1.1.0" ||
      changeSet.content.compensates_change_set_id === undefined
    ) {
      throw new Error(
        "A reversal conflict requires its compensated ChangeSet.",
      );
    }
    return {
      event_type: "change_set.reversal_conflicted",
      payload: {
        change_set_id: changeSet.change_set_id,
        change_set_revision: 1,
        change_set_content_hash: changeSet.content_hash,
        compensates_change_set_id: changeSet.content.compensates_change_set_id,
        conflict_code: code,
        targets: [
          {
            target_kind: "claim",
            target_id: targets.claim.claim_id,
            expected_revision: pair.claim.base_revision,
            actual_revision: targets.claim.revision,
            expected_zone: "trusted",
            actual_zone: targets.claim.authority.zone,
          },
          {
            target_kind: "assertion",
            target_id: targets.assertion.assertion_id,
            expected_revision: pair.assertion.base_revision,
            actual_revision: targets.assertion.revision,
            expected_zone: "trusted",
            actual_zone: targets.assertion.authority.zone,
          },
        ],
      },
    };
  }

  async #loadChangeSet(
    client: PoolClient,
    changeSetId: string,
  ): Promise<ChangeSetRow | undefined> {
    const result = await client.query<ChangeSetRow>(
      `SELECT payload, current_state
         FROM petra.change_sets
        WHERE change_set_id = $1
        FOR UPDATE`,
      [changeSetId],
    );
    return result.rows[0];
  }

  async #insertChangeSet(
    client: PoolClient,
    changeSet: PetraChangeSetRecord,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.change_sets (
         change_set_id, revision, project_id, origin, proposed_by_actor_id,
         proposed_by_actor_kind, reason, impact, risk_tier, content_hash,
         current_state, state_updated_at, record_hash, payload, proposed_at,
         compensates_change_set_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10,
                 'submitted', $11::timestamptz, $12, $13::jsonb,
                 $14::timestamptz, $15)`,
      [
        changeSet.change_set_id,
        changeSet.revision,
        changeSet.content.project_id,
        changeSet.content.origin,
        changeSet.content.proposed_by.actor_id,
        changeSet.content.proposed_by.actor_kind,
        changeSet.content.reason,
        JSON.stringify(changeSet.content.impact),
        changeSet.content.risk_tier,
        changeSet.content_hash,
        changeSet.proposed_at,
        canonicalHash(changeSet),
        JSON.stringify(changeSet),
        changeSet.proposed_at,
        changeSet.schema_version === "1.1.0"
          ? (changeSet.content.compensates_change_set_id ?? null)
          : null,
      ],
    );
    for (const [index, operation] of changeSet.content.operations.entries()) {
      await client.query(
        `INSERT INTO petra.change_set_operations (
           change_set_id, change_set_revision, position, operation_kind,
           target_id, target_evidence_kind, base_revision, before_zone,
           before_review_state, after_zone, after_review_state, operation
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                   $12::jsonb)`,
        [
          changeSet.change_set_id,
          changeSet.revision,
          index + 1,
          operation.operation_kind,
          operation.target_id,
          operation.operation_kind.endsWith("_claim") ? "claim" : "assertion",
          operation.base_revision,
          operation.before.zone,
          operation.before.review_state,
          operation.after.zone,
          operation.after.review_state,
          JSON.stringify(operation),
        ],
      );
    }
  }

  async #insertApproval(
    client: PoolClient,
    approval: PetraApproval,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.approvals (
         approval_id, revision, change_set_id, change_set_revision,
         change_set_content_hash, decision, decision_scope,
         decided_by_actor_id, decided_by_actor_kind, rationale, conditions,
         decided_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::text[],
                 $12::timestamptz, $13, $14::jsonb)`,
      [
        approval.approval_id,
        approval.revision,
        approval.subject.change_set_id,
        approval.subject.change_set_revision,
        approval.subject.change_set_content_hash,
        approval.decision,
        approval.decision_scope,
        approval.decided_by.actor_id,
        approval.decided_by.actor_kind,
        approval.rationale,
        approval.conditions,
        approval.decided_at,
        canonicalHash(approval),
        JSON.stringify(approval),
      ],
    );
  }

  async #insertEvidenceAuthorization(
    client: PoolClient,
    evidence: PetraClaim | PetraAssertion,
    changeSet: PetraChangeSetRecord,
    approval: PetraApproval,
    appliedAt: string,
    admissionKind: "promotion" | "reversal",
  ): Promise<void> {
    const evidenceId =
      evidence.schema_name === "petra.claim"
        ? evidence.claim_id
        : evidence.assertion_id;
    const evidenceKind =
      evidence.schema_name === "petra.claim" ? "claim" : "assertion";
    await client.query(
      `INSERT INTO petra.evidence_revision_authorizations (
         evidence_id, evidence_kind, evidence_revision, admission_kind,
         change_set_id, change_set_revision, change_set_content_hash,
         approval_id, approval_revision, approved_by_actor_id,
         approved_by_actor_kind, applied_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                 $12::timestamptz)`,
      [
        evidenceId,
        evidenceKind,
        evidence.revision,
        admissionKind,
        changeSet.change_set_id,
        changeSet.revision,
        changeSet.content_hash,
        approval.approval_id,
        approval.revision,
        approval.decided_by.actor_id,
        approval.decided_by.actor_kind,
        appliedAt,
      ],
    );
  }

  async #appendEventAndOutbox(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    event: PetraDomainEventRecord["event"],
    targets: readonly PetraOutboxRecordRecord["target"][],
    recordedAt: string,
    schemaVersion: PetraDomainEventRecord["schema_version"],
  ): Promise<void> {
    const positionResult = await client.query<PositionRow>(
      `UPDATE petra.authority_positions
          SET event_position = event_position + 1,
              outbox_position = outbox_position + $1
        WHERE singleton
      RETURNING event_position, outbox_position`,
      [targets.length],
    );
    const positions = positionResult.rows[0];
    if (positions === undefined)
      throw new Error("Authority position row is missing.");
    const eventPosition = Number(positions.event_position);
    const finalOutboxPosition = Number(positions.outbox_position);
    const firstOutboxPosition = finalOutboxPosition - targets.length + 1;

    const streamResult = await client.query<RevisionRow>(
      `INSERT INTO petra.project_event_stream_heads (
         project_id, current_stream_revision
       ) VALUES ($1, 1)
       ON CONFLICT (project_id) DO UPDATE
         SET current_stream_revision =
           petra.project_event_stream_heads.current_stream_revision + 1
       RETURNING current_stream_revision`,
      [envelope.project_id],
    );
    const streamRevision = Number(
      streamResult.rows[0]?.current_stream_revision,
    );
    const eventId = this.#domainRecordFactory.nextId("event");
    if (petraIdKind(eventId) !== "event") {
      throw new Error("DomainRecordFactory returned a non-event ID.");
    }
    const domainEvent = {
      schema_name: "petra.domain-event",
      schema_version: schemaVersion,
      event_id: eventId,
      event_position: eventPosition,
      stream_type: "project",
      stream_id: envelope.project_id,
      stream_revision: streamRevision,
      project_id: envelope.project_id,
      actor: clone(envelope.actor),
      occurred_at: envelope.submitted_at,
      recorded_at: recordedAt,
      correlation_id: envelope.correlation_id,
      causation_id: envelope.command_id,
      command_id: envelope.command_id,
      idempotency_key: envelope.idempotency_key,
      capability_grant_id: envelope.capability_grant_id,
      event: clone(event),
    } as PetraDomainEventRecord;
    this.#contracts.assertValid("domain-event", schemaVersion, domainEvent);
    await client.query(
      `INSERT INTO petra.domain_events (
         event_id, event_position, project_id, stream_revision, actor_id,
         actor_kind, occurred_at, recorded_at, correlation_id, command_id,
         idempotency_key, capability_grant_id, event_type, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz,
                 $8::timestamptz, $9, $10, $11, $12, $13, $14, $15::jsonb)`,
      [
        domainEvent.event_id,
        domainEvent.event_position,
        domainEvent.project_id,
        domainEvent.stream_revision,
        domainEvent.actor.actor_id,
        domainEvent.actor.actor_kind,
        domainEvent.occurred_at,
        domainEvent.recorded_at,
        domainEvent.correlation_id,
        domainEvent.command_id,
        domainEvent.idempotency_key,
        domainEvent.capability_grant_id,
        domainEvent.event.event_type,
        canonicalHash(domainEvent),
        JSON.stringify(domainEvent),
      ],
    );

    for (const [index, target] of targets.entries()) {
      const sequenceResult = await client.query<TargetSequenceRow>(
        `INSERT INTO petra.outbox_target_heads (
           target, project_id, current_target_sequence
         ) VALUES ($1, $2, 1)
         ON CONFLICT (target, project_id) DO UPDATE
           SET current_target_sequence =
             petra.outbox_target_heads.current_target_sequence + 1
         RETURNING current_target_sequence`,
        [target, envelope.project_id],
      );
      const targetSequence = Number(
        sequenceResult.rows[0]?.current_target_sequence,
      );
      const outboxId = this.#domainRecordFactory.nextId("outbox");
      if (petraIdKind(outboxId) !== "outbox") {
        throw new Error("DomainRecordFactory returned a non-outbox ID.");
      }
      const outbox = {
        schema_name: "petra.outbox-record",
        schema_version: schemaVersion,
        outbox_id: outboxId,
        outbox_position: firstOutboxPosition + index,
        target,
        target_sequence: targetSequence,
        partition_key: envelope.project_id,
        deduplication_key: `${target}:${eventId}`,
        enqueued_at: recordedAt,
        message: { message_kind: "domain_event", event: clone(domainEvent) },
      } as PetraOutboxRecordRecord;
      this.#contracts.assertValid("outbox-record", schemaVersion, outbox);
      await client.query(
        `INSERT INTO petra.outbox_records (
           outbox_id, outbox_position, target, target_sequence,
           partition_key, deduplication_key, event_id, enqueued_at,
           record_hash, payload
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz,
                   $9, $10::jsonb)`,
        [
          outbox.outbox_id,
          outbox.outbox_position,
          outbox.target,
          outbox.target_sequence,
          outbox.partition_key,
          outbox.deduplication_key,
          domainEvent.event_id,
          outbox.enqueued_at,
          canonicalHash(outbox),
          JSON.stringify(outbox),
        ],
      );
    }
  }

  async #insertCommandExecution(
    client: PoolClient,
    envelope: PetraCommandEnvelopeRecord,
    fingerprint: string,
    plan: CommandPlan,
    completedAt: string,
    checkpointRequest?:
      PetraReviewSessionApplyRequest | PetraReviewSessionRejectRequest,
  ): Promise<void> {
    const failed = "failure" in plan;
    await client.query(
      `INSERT INTO petra.command_executions (
         command_id, idempotency_key, project_id, actor_id, actor_kind,
         capability_grant_id, correlation_id, submitted_at, command_name,
         command_fingerprint, envelope, outcome_kind, result, error_code,
         error_message, completed_at, review_apply_request,
         review_reject_request
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10,
                 $11::jsonb, $12, $13::jsonb, $14, $15,
                 $16::timestamptz, $17::jsonb, $18::jsonb)`,
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
        failed ? "failure" : "success",
        failed ? null : JSON.stringify(plan.result),
        failed ? plan.failure.code : null,
        failed ? plan.failure.message : null,
        completedAt,
        checkpointRequest?.schema_name === "petra.review-session-apply-request"
          ? JSON.stringify(checkpointRequest)
          : null,
        checkpointRequest?.schema_name === "petra.review-session-reject-request"
          ? JSON.stringify(checkpointRequest)
          : null,
      ],
    );
  }

  #readChangeSet(payload: unknown): PetraChangeSetRecord {
    const schemaVersion = this.#schemaVersion(payload, "change-set");
    this.#contracts.assertValid("change-set", schemaVersion, payload);
    return clone(payload as PetraChangeSetRecord);
  }

  #readDomainEvent(payload: unknown): PetraDomainEventRecord {
    const schemaVersion = this.#schemaVersion(payload, "domain-event");
    this.#contracts.assertValid("domain-event", schemaVersion, payload);
    return clone(payload as PetraDomainEventRecord);
  }

  #readOutboxRecord(payload: unknown): PetraOutboxRecordRecord {
    const schemaVersion = this.#schemaVersion(payload, "outbox-record");
    this.#contracts.assertValid("outbox-record", schemaVersion, payload);
    return clone(payload as PetraOutboxRecordRecord);
  }

  #schemaVersion(
    payload: unknown,
    recordName: "change-set" | "domain-event" | "outbox-record",
  ): "1.0.0" | "1.1.0" {
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("schema_version" in payload) ||
      (payload.schema_version !== "1.0.0" && payload.schema_version !== "1.1.0")
    ) {
      throw new Error(`Stored ${recordName} has no supported schema version.`);
    }
    return payload.schema_version;
  }

  #readApproval(payload: unknown): PetraApproval {
    this.#contracts.assertValid("approval", "1.0.0", payload);
    return clone(payload as PetraApproval);
  }
}
