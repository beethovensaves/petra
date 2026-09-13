import { createHash } from "node:crypto";

import type {
  PetraApproval,
  PetraChangeSetRecord,
  PetraCommandEnvelopeRecord,
  PetraDomainEventRecord,
  PetraReviewRecoveryAssessment,
  ProjectReviewChangeSetSummaryV110,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ReviewRecoveryAssessmentError,
  type ReviewRecoveryAssessmentReader,
  type ReviewRecoveryAssessmentRequest,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import { PostgresProjectHistoryViewReader } from "./project-history-view-reader.js";
import { PostgresProjectReviewViewReader } from "./project-review-view-reader.js";

type Content = PetraReviewRecoveryAssessment["content"];
type Group = Content["groups"][number];
type Inventory = Content["preservation"][number];
const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const corrupt = (message: string): never => {
  throw new ReviewRecoveryAssessmentError("REVIEW_RECOVERY_CORRUPT", message);
};
interface Stored {
  payload: unknown;
  record_hash: string;
}
interface Execution {
  command_id: string;
  envelope: PetraCommandEnvelopeRecord;
  command_fingerprint: string;
  outcome_kind: "success" | "failure";
  result: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  completed_at: Date;
}

/** D020 query adapter. No writes, command dispatch, recovery ledger, or eligibility rules. */
export class PostgresReviewRecoveryAssessmentReader implements ReviewRecoveryAssessmentReader {
  readonly #reviews: PostgresProjectReviewViewReader;
  constructor(
    readonly pool: Pool,
    readonly contracts = new PetraContractRegistry(),
    readonly history = new PostgresProjectHistoryViewReader(pool, contracts),
  ) {
    this.#reviews = new PostgresProjectReviewViewReader(pool, contracts);
  }

  async getReviewRecoveryAssessment(
    request: ReviewRecoveryAssessmentRequest,
  ): Promise<PetraReviewRecoveryAssessment | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const clock = await client.query<{ read_at: Date }>(
        "SELECT transaction_timestamp() AS read_at",
      );
      const readAt = clock.rows[0]?.read_at.toISOString();
      if (readAt === undefined)
        corrupt("The snapshot observation time is unavailable.");
      const result = await this.#compose(client, readAt!, request);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async #compose(
    client: PoolClient,
    readAt: string,
    request: ReviewRecoveryAssessmentRequest,
  ): Promise<PetraReviewRecoveryAssessment | undefined> {
    const source = await this.#reviews.readReviewInSnapshot(
      client,
      readAt,
      request.project_id,
      request.review_session_id,
    );
    if (source === undefined) return undefined;
    const { session, view } = source;
    if (
      session.review_session_id !== request.review_session_id ||
      session.project_id !== request.project_id
    )
      corrupt("Review identity does not match the requested Project.");
    if (
      session.revision !== request.expected_revision ||
      session.content_hash !== request.expected_content_hash
    ) {
      throw new ReviewRecoveryAssessmentError(
        "REVIEW_RECOVERY_STALE",
        "Reload the exact current ReviewSession before assessing recovery.",
      );
    }
    if (session.schema_version !== "1.1.0" || view.schema_version !== "1.2.0") {
      throw new ReviewRecoveryAssessmentError(
        "REVIEW_RECOVERY_UNSUPPORTED",
        "This assessment requires the registered scientific working Review profile.",
      );
    }
    const memberIds = session.content.members.map((m) => m.review_member_id);
    if (
      new Set(memberIds).size !== memberIds.length ||
      view.content.members.length !== memberIds.length
    )
      corrupt("Review membership is ambiguous.");
    const bindings = session.content.members.flatMap((m) =>
      m.candidate_bindings.map((b) => ({
        member: m.review_member_id,
        ...b.record_ref,
      })),
    );
    const candidateHeads = await client.query<{
      working_candidate_id: string;
      current_revision: string;
    }>(
      "SELECT working_candidate_id, current_revision::text FROM petra.working_candidates WHERE project_id = $1 AND working_candidate_id = ANY($2::text[])",
      [
        request.project_id,
        session.content.members.map(
          (m) => m.working_state.candidate_ref.working_candidate_id,
        ),
      ],
    );
    const relationshipHeads = await client.query<{
      working_relationship_id: string;
      current_revision: string;
    }>(
      "SELECT working_relationship_id, current_revision::text FROM petra.working_relationships WHERE project_id = $1 AND working_relationship_id = ANY($2::text[])",
      [
        request.project_id,
        session.content.members.flatMap((m) =>
          m.working_state.relationship_refs.map(
            (r) => r.working_relationship_id,
          ),
        ),
      ],
    );
    if (
      candidateHeads.rows.length !== memberIds.length ||
      relationshipHeads.rows.length !==
        session.content.members.reduce(
          (n, m) => n + m.working_state.relationship_refs.length,
          0,
        )
    )
      corrupt("Working head coverage is missing or ambiguous.");
    const freshness: Content["freshness"] = {
      expected_review_identity: "current",
      authority_snapshot: view.content.session.snapshot_state,
      members: session.content.members.map((m) => ({
        review_member_id: m.review_member_id,
        working_heads:
          candidateHeads.rows.find(
            (h) =>
              h.working_candidate_id ===
              m.working_state.candidate_ref.working_candidate_id,
          )?.current_revision ===
            String(m.working_state.candidate_ref.revision) &&
          m.working_state.relationship_refs.every(
            (r) =>
              relationshipHeads.rows.find(
                (h) => h.working_relationship_id === r.working_relationship_id,
              )?.current_revision === String(r.revision),
          )
            ? "current"
            : "superseded",
      })) as Content["freshness"]["members"],
    };
    // Scan canonical ChangeSets, including larger units omitted by the scientific pair preview.
    const rows = await client.query<Stored & { current_state: Group["state"] }>(
      "SELECT payload, record_hash, current_state FROM petra.change_sets WHERE project_id = $1 ORDER BY change_set_id",
      [request.project_id],
    );
    const groups: Group[] = [];
    for (const row of rows.rows) {
      const changeSet = this.#record<PetraChangeSetRecord>("change-set", row);
      if (
        changeSet.content.project_id !== request.project_id ||
        hash(changeSet.content) !== changeSet.content_hash
      )
        corrupt("ChangeSet Project or content hash is inconsistent.");
      const operations = changeSet.content.operations;
      const touches = (b: (typeof bindings)[number]) =>
        operations.some(
          (o) => o.target_id === b.record_id && o.base_revision === b.revision,
        );
      const touched = bindings.filter(touches);
      if (touched.length === 0) continue;
      const members = memberIds.filter((id) =>
        touched.some((b) => b.member === id),
      );
      if (
        operations.some(
          (o) =>
            !touched.some(
              (b) =>
                b.record_id === o.target_id && b.revision === o.base_revision,
            ),
        ) ||
        bindings
          .filter((b) => members.includes(b.member))
          .some((b) => !touches(b))
      ) {
        throw new ReviewRecoveryAssessmentError(
          "REVIEW_RECOVERY_INCOMPLETE",
          "The Review does not cover the complete exact ChangeSet. No partial atomic manifest is available.",
        );
      }
      // The existing scientific execution and History owners accept one Claim-ASSERTS pair.
      if (
        operations.length !== 2 ||
        operations.some(
          (o) =>
            o.operation_kind !== "promote_claim" &&
            o.operation_kind !== "promote_assertion",
        )
      ) {
        throw new ReviewRecoveryAssessmentError(
          "REVIEW_RECOVERY_UNSUPPORTED",
          "This ChangeSet is outside the current scientific pair execution profile.",
        );
      }
      const storedOperations = await client.query<{ operation: unknown }>(
        "SELECT operation FROM petra.change_set_operations WHERE change_set_id = $1 ORDER BY position",
        [changeSet.change_set_id],
      );
      if (
        canonicalize(storedOperations.rows.map((r) => r.operation)) !==
        canonicalize(operations)
      )
        corrupt(
          "The normalized atomic operation manifest differs from its canonical ChangeSet.",
        );
      const summaries = members.map((id) =>
        view.content.members
          .find((m) => m.review_member_id === id)
          ?.change_sets.find(
            (c) => c.change_set_ref.record_id === changeSet.change_set_id,
          ),
      );
      const summary = summaries[0];
      if (
        summary === undefined ||
        summaries.some((s) => canonicalize(s) !== canonicalize(summary)) ||
        summary.change_set_ref.content_hash !== changeSet.content_hash ||
        summary.state !== row.current_state
      )
        corrupt(
          "The complete atomic ChangeSet does not reconcile with every member preview.",
        );
      const approvals = await client.query<Stored>(
        "SELECT payload, record_hash FROM petra.approvals WHERE change_set_id = $1 ORDER BY decided_at, approval_id",
        [changeSet.change_set_id],
      );
      const approvalRecords = approvals.rows.map((r) =>
        this.#record<PetraApproval>("approval", r),
      );
      for (const approval of approvalRecords) {
        if (
          approval.subject.change_set_id !== changeSet.change_set_id ||
          approval.subject.change_set_content_hash !== changeSet.content_hash ||
          approval.subject.change_set_revision !== changeSet.revision
        )
          corrupt("Approval does not bind this exact ChangeSet.");
      }
      const commands = await this.#commands(
        client,
        request.project_id,
        changeSet,
        summary!,
        approvalRecords,
      );
      const applied = summary!.events.filter(
        (e) => e.event_type === "change_set.applied",
      );
      const conflicted = summary!.events.filter(
        (e) => e.event_type === "change_set.conflicted",
      );
      if (
        applied.length > 1 ||
        (row.current_state === "applied") !== (applied.length === 1) ||
        (row.current_state === "conflicted") !== (conflicted.length === 1)
      )
        corrupt("ChangeSet state and canonical effect events disagree.");
      let historyAssessment: Group["history_assessment"];
      if (applied[0] !== undefined) {
        const history = await this.history.readRecoveryAssessmentInSnapshot(
          client,
          readAt,
          request.project_id,
          applied[0].event_id,
        );
        if (
          history === undefined ||
          history.content.recovery_subject.promotion_change_set.record_hash !==
            row.record_hash ||
          history.content.authority.through_event_position !==
            view.content.authority.event_position ||
          history.content.authority.through_stream_revision !==
            view.content.authority.stream_revision
        )
          corrupt(
            "History recovery evidence does not share this exact authority snapshot.",
          );
        historyAssessment = {
          event_id: history!.event_id,
          content_hash: history!.content_hash,
          content: history!.content,
        };
      }
      const terminal = summary!.events.at(-1);
      const lastApprovalCommand = commands
        .filter((c) => c.trace.command_name === "RecordApproval")
        .at(-1);
      const terminalState =
        terminal?.event_type === "change_set.applied"
          ? "applied"
          : terminal?.event_type === "change_set.conflicted"
            ? "conflicted"
            : terminal?.event_type === "change_set.submitted"
              ? "submitted"
              : undefined;
      if (terminalState !== undefined && terminalState !== row.current_state)
        corrupt(
          "The latest canonical event disagrees with current ChangeSet state.",
        );
      if (terminal?.event_type === "approval.recorded") {
        if (
          lastApprovalCommand === undefined ||
          (row.current_state !== "approved" &&
            row.current_state !== "rejected") ||
          approvalRecords.at(-1)?.decision !== row.current_state
        )
          corrupt(
            "The current decision does not reconcile with retained Approval evidence.",
          );
      }
      const failed = commands.some((c) => c.receipt_state === "failure");
      const effect: Group["effect"] =
        applied.length === 1
          ? "applied"
          : conflicted.length === 1
            ? "no_effect"
            : "unknown";
      // Failure alone is not no-effect proof. Only the owning canonical conflict event proves atomic non-application here.
      const nextStep: Group["next_step"] =
        row.current_state === "applied" || row.current_state === "rejected"
          ? "inspect"
          : row.current_state === "conflicted" ||
              view.content.session.snapshot_state === "stale" ||
              members.some(
                (id) =>
                  freshness.members.find((m) => m.review_member_id === id)
                    ?.working_heads === "superseded",
              )
            ? "refresh_or_revise"
            : failed || effect === "unknown"
              ? "reconcile_status"
              : "return_to_review";
      groups.push({
        change_set: changeSet,
        record_hash: row.record_hash,
        state: row.current_state,
        member_ids: members as Group["member_ids"],
        operation_count: operations.length,
        coverage: "complete",
        member_outcomes: members.map((id) => ({
          review_member_id: id,
          review_outcome: view.content.members.find(
            (m) => m.review_member_id === id,
          )!.outcome,
        })) as Group["member_outcomes"],
        effect,
        effect_basis:
          effect === "applied"
            ? "The exact committed application event establishes the whole ChangeSet effect; current compensation facts belong to History."
            : effect === "no_effect"
              ? "The owning conflict event records atomic non-application. Replaying its failed command retains the same failure and is not a new attempt."
              : "No canonical application or atomic conflict event establishes an effect classification; absence alone is not no-effect proof.",
        next_step: nextStep,
        approvals: approvalRecords,
        commands,
        events: summary!.events,
        ...(historyAssessment === undefined
          ? {}
          : { history_assessment: historyAssessment }),
      });
    }
    const unbound = memberIds.filter(
      (id) => !groups.some((g) => g.member_ids.includes(id)),
    );
    const inventory = (
      kind: Inventory["kind"],
      state: Inventory["state"],
      ids: string[],
      hashes: string[],
      detail: string,
    ): Inventory => ({
      kind,
      state,
      record_ids: ids,
      record_hashes: hashes,
      detail,
    });
    const working = view.content.members.map((m) => m.working_state);
    const preservation: Inventory[] = [
      inventory(
        "review",
        "verified",
        [session.review_session_id],
        [hash(session)],
        "Exact canonical Review revision, membership, task origin, and return context are retained.",
      ),
      inventory(
        "working_candidate",
        "verified",
        working.map((w) => w.candidate.working_candidate_id),
        working.map((w) => hash(w.candidate)),
        "Exact working revisions, producer, task references, basis, provenance, limitations, and validation are retained in the Review composition.",
      ),
      inventory(
        "working_relationship",
        "verified",
        working.flatMap((w) =>
          w.relationships.map((r) => r.working_relationship_id),
        ),
        working.flatMap((w) => w.relationships.map(hash)),
        "Exact relationship revisions and provenance are retained.",
      ),
      inventory(
        "candidate",
        "verified",
        bindings.map((b) => b.record_id),
        bindings.map((b) => b.record_hash),
        "Every exact profile candidate binding was resolved and its record hash checked.",
      ),
      inventory(
        "basis",
        "verified",
        view.content.members.flatMap((m) =>
          m.basis.flatMap((b) =>
            b.source_span_ref === undefined
              ? []
              : [b.source_span_ref.record_id],
          ),
        ),
        view.content.members.flatMap((m) =>
          m.basis.flatMap((b) =>
            b.source_span_ref === undefined
              ? []
              : [b.source_span_ref.record_hash],
          ),
        ),
        "Retained source-span and structural-block records were reconciled; source availability remains as reported in Review.",
      ),
      inventory(
        "validation",
        "verified",
        working.map((w) => w.candidate.working_candidate_id),
        working.map((w) => hash(w.candidate.validation)),
        "Recorded validation was read, never rerun or transferred.",
      ),
      inventory(
        "approval",
        "verified",
        groups.flatMap((g) => g.approvals.map((a) => a.approval_id)),
        groups.flatMap((g) => g.approvals.map(hash)),
        "All retained Approvals for assessed ChangeSets were reconciled; an empty inventory means none recorded.",
      ),
      inventory(
        "command",
        "verified",
        groups.flatMap((g) => g.commands.map((c) => c.trace.command_id)),
        groups.flatMap((g) =>
          g.commands.map((c) => c.trace.command_fingerprint),
        ),
        "Exact ChangeSet command envelopes were reconciled with their events and results.",
      ),
      inventory(
        "receipt",
        "verified",
        groups.flatMap((g) => g.commands.map((c) => c.trace.command_id)),
        groups.flatMap((g) => g.commands.map((c) => c.receipt_hash)),
        "Results and failures belong to the canonical command execution ledger; no recovery receipt is created.",
      ),
      inventory(
        "prior_authority",
        "unverified",
        [],
        [],
        "Candidate and History evidence is retained; this read does not certify an exhaustive inventory of all prior Project revisions.",
      ),
      inventory(
        "projection",
        view.content.projection.state === "unavailable"
          ? "unavailable"
          : "verified",
        view.content.projection.state === "unavailable"
          ? []
          : [view.content.projection.checkpoint_ref.record_id],
        [hash(view.content.projection)],
        "Projection observation is separate from ChangeSet effect; a missing checkpoint does not establish application failure.",
      ),
      inventory(
        "task",
        "unverified",
        session.content.origin.record_refs,
        working.map((w) => hash(w.candidate.task_context)),
        "Exact originating task references are retained in working state; their external availability is not reassessed.",
      ),
      inventory(
        "return_context",
        "verified",
        session.content.return_context.object_ref === undefined
          ? []
          : [session.content.return_context.object_ref],
        [hash(session.content.return_context)],
        "The canonical return context is retained. Navigation, unsent edits, and other client assertions are not inventoried.",
      ),
    ];
    const content: Content = {
      freshness,
      producer: "petra.postgres.review-recovery",
      producer_version: "1.0.0",
      rule_version: "d020.scientific.v1",
      privacy: "authenticated_single_user_project",
      review_session: session,
      review: view.content,
      groups,
      unbound_member_ids: unbound,
      coverage: {
        state: "complete",
        review_members: memberIds.length,
        assessed_members: memberIds.length,
        atomic_change_sets: groups.length,
        operations: groups.reduce((n, g) => n + g.operation_count, 0),
      },
      preservation: preservation as Content["preservation"],
      limitations: [
        "Scientific working Review and existing atomic Claim-ASSERTS promotion pairs only; no second-profile conformance is claimed.",
        "The command ledger records terminal outcomes only. Unobserved or pending attempts cannot be inferred from absence, timeout, or projection lag.",
        "No action descriptors are registered in this assessment version. Applied and rejected members cannot be retried; stale or conflicted members require their existing refresh or revision owner.",
        "A retained failed command is not a safe new attempt. No retry, identity reuse, input reuse, or execution eligibility is inferred.",
        "Coverage counts exact Review members and complete associated ChangeSets, not all Project work. Task availability, client state, and exhaustive prior authority remain unverified.",
        "Direct and model-mediated callers use this same read; neither presentation path supplies effect or authority.",
      ],
      actions: [],
      authority_effect: "none",
    };
    const contentHash = hash(content);
    const assessment: PetraReviewRecoveryAssessment = {
      schema_name: "petra.review-recovery-assessment",
      schema_version: "1.0.0",
      assessment_id: `review_recovery_sha256_${contentHash.slice(7)}`,
      project_id: request.project_id,
      content,
      content_hash: contentHash,
      read_at: readAt,
      reconciled_at: readAt,
    };
    this.contracts.assertValid(
      "review-recovery-assessment",
      "1.0.0",
      assessment,
    );
    return assessment;
  }

  #record<T>(name: string, row: Stored): T {
    const version = (row.payload as { schema_version?: string })
      ?.schema_version;
    if (version === undefined || hash(row.payload) !== row.record_hash)
      corrupt(`The canonical ${name} record hash is inconsistent.`);
    this.contracts.assertValid(name, version!, row.payload);
    return structuredClone(row.payload) as T;
  }

  async #commands(
    client: PoolClient,
    projectId: string,
    changeSet: PetraChangeSetRecord,
    summary: ProjectReviewChangeSetSummaryV110,
    approvals: PetraApproval[],
  ): Promise<Group["commands"]> {
    const rows = await client.query<Execution>(
      `SELECT command_id, envelope, command_fingerprint, outcome_kind, result, error_code, error_message, completed_at FROM petra.command_executions WHERE project_id = $1 AND ((command_name = 'SubmitChangeSet' AND envelope #>> '{command,change_set,change_set_id}' = $2) OR (command_name = 'RecordApproval' AND envelope #>> '{command,approval,subject,change_set_id}' = $2) OR (command_name = 'ApplyChangeSet' AND envelope #>> '{command,change_set_id}' = $2)) ORDER BY submitted_at, command_id`,
      [projectId, changeSet.change_set_id],
    );
    if (rows.rows.length !== summary.commands.length)
      corrupt("Command coverage does not match the Review.");
    const observations: Group["commands"] = [];
    for (const row of rows.rows) {
      const envelope = row.envelope;
      this.contracts.assertValid(
        "command-envelope",
        envelope.schema_version,
        envelope,
      );
      const trace = summary.commands.find(
        (c) => c.command_id === row.command_id,
      );
      if (
        trace === undefined ||
        envelope.command_id !== row.command_id ||
        envelope.project_id !== projectId ||
        hash(envelope) !== row.command_fingerprint ||
        trace.command_fingerprint !== row.command_fingerprint ||
        trace.outcome !== row.outcome_kind
      )
        corrupt(
          "Command identity, fingerprint, or terminal outcome is inconsistent.",
        );
      const command = envelope.command;
      if (
        command.command_name === "SubmitChangeSet" &&
        hash(command.change_set) !== hash(changeSet)
      )
        corrupt("Submitted ChangeSet differs from its retained record.");
      if (
        command.command_name === "RecordApproval" &&
        !approvals.some((a) => hash(a) === hash(command.approval))
      )
        corrupt("Approval command differs from its retained Approval.");
      if (
        command.command_name === "ApplyChangeSet" &&
        (command.change_set_revision !== changeSet.revision ||
          command.change_set_content_hash !== changeSet.content_hash ||
          !approvals.some(
            (a) =>
              a.approval_id === command.approval_id &&
              a.decision === "approved",
          ))
      )
        corrupt(
          "Apply command does not bind the exact ChangeSet and approved decision.",
        );
      const events = await client.query<Stored>(
        "SELECT payload, record_hash FROM petra.domain_events WHERE project_id = $1 AND command_id = $2 ORDER BY event_position",
        [projectId, row.command_id],
      );
      if (events.rows.length !== 1)
        corrupt(
          "A retained ChangeSet command requires its exact single canonical event.",
        );
      const event = this.#record<PetraDomainEventRecord>(
        "domain-event",
        events.rows[0]!,
      );
      if (
        event.command_id !== row.command_id ||
        event.project_id !== projectId ||
        event.idempotency_key !== envelope.idempotency_key ||
        canonicalize(event.actor) !== canonicalize(envelope.actor) ||
        event.capability_grant_id !== envelope.capability_grant_id ||
        !summary.events.some(
          (e) => e.event_id === event.event_id && e.record_hash === hash(event),
        )
      )
        corrupt("Command and event identities disagree.");
      const fact = event.event;
      let expected: Record<string, unknown> | null;
      if (
        fact.event_type === "change_set.submitted" &&
        command.command_name === "SubmitChangeSet"
      ) {
        if (hash(fact.payload.change_set) !== hash(changeSet))
          corrupt("Submission event does not preserve the exact ChangeSet.");
        expected = {
          outcome: "submitted",
          command_id: row.command_id,
          change_set_id: changeSet.change_set_id,
          change_set_state: "submitted",
        };
      } else if (
        fact.event_type === "approval.recorded" &&
        command.command_name === "RecordApproval"
      ) {
        if (hash(fact.payload.approval) !== hash(command.approval))
          corrupt("Approval event does not preserve the exact decision.");
        expected = {
          outcome: "approval_recorded",
          command_id: row.command_id,
          change_set_id: changeSet.change_set_id,
          change_set_state:
            command.approval.decision === "approved" ? "approved" : "rejected",
          approval_id: command.approval.approval_id,
        };
      } else if (
        fact.event_type === "change_set.applied" &&
        command.command_name === "ApplyChangeSet"
      ) {
        const p = fact.payload;
        if (
          p.change_set_id !== changeSet.change_set_id ||
          p.change_set_content_hash !== changeSet.content_hash ||
          p.approval_id !== command.approval_id
        )
          corrupt(
            "Application event does not bind this exact ChangeSet and Approval.",
          );
        expected = {
          outcome: "applied",
          command_id: row.command_id,
          change_set_id: changeSet.change_set_id,
          change_set_state: "applied",
          approval_id: command.approval_id,
          claim_id: p.claim.claim_id,
          claim_revision: p.claim.revision,
          assertion_id: p.assertion.assertion_id,
          assertion_revision: p.assertion.revision,
          applied_at: envelope.submitted_at,
        };
      } else if (
        fact.event_type === "change_set.conflicted" &&
        command.command_name === "ApplyChangeSet"
      ) {
        if (
          fact.payload.change_set_id !== changeSet.change_set_id ||
          fact.payload.change_set_content_hash !== changeSet.content_hash ||
          fact.payload.change_set_revision !== changeSet.revision ||
          fact.payload.targets.length !== changeSet.content.operations.length ||
          fact.payload.targets.some(
            (t) =>
              !changeSet.content.operations.some(
                (o) =>
                  o.target_id === t.target_id &&
                  o.base_revision === t.expected_revision,
              ),
          ) ||
          row.error_code !== fact.payload.conflict_code
        )
          corrupt(
            "Failure does not match its owning atomic conflict evidence.",
          );
        expected = null;
      } else corrupt("Unsupported or ambiguous command/event outcome.");
      if (
        canonicalize(row.result) !== canonicalize(expected!) ||
        (expected! === null
          ? row.outcome_kind !== "failure" || row.error_message === null
          : row.outcome_kind !== "success" ||
            row.error_code !== null ||
            row.error_message !== null)
      )
        corrupt(
          "The terminal command receipt does not match its canonical event.",
        );
      observations.push({
        trace: trace!,
        receipt_owner: "petra.command_executions",
        receipt_hash: hash({
          command_id: row.command_id,
          command_fingerprint: row.command_fingerprint,
          outcome_kind: row.outcome_kind,
          result: row.result,
          error_code: row.error_code,
          error_message: row.error_message,
          completed_at: row.completed_at.toISOString(),
        }),
        receipt_state: row.outcome_kind,
        idempotency_key: envelope.idempotency_key,
      });
    }
    if (
      observations.filter((c) => c.trace.command_name === "SubmitChangeSet")
        .length !== 1
    )
      corrupt(
        "A canonical ChangeSet requires one retained submission command.",
      );
    if (
      observations.filter((c) => c.trace.command_name === "RecordApproval")
        .length !== approvals.length
    )
      corrupt("Approval receipt coverage is incomplete.");
    return observations;
  }
}
