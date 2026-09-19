import type {
  PetraAssertion,
  PetraChangeSet,
  PetraClaim,
  PetraCommandEnvelopeRecord,
  PetraCommandEnvelope,
  PetraDomainEvent,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraReviewSessionApplyCheckpoint,
  PetraReviewSessionApplyRequest,
  PetraReviewSessionApplyResult,
  PetraReviewSessionRejectCheckpoint,
  PetraReviewSessionRejectRequest,
  PetraReviewSessionRejectResult,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  buildReviewApplyPlan,
  buildReviewRejectPlan,
  derivePetraId,
  executeReviewDecisionPlan,
  reviewApplyHash as hash,
  reviewRejectHash,
  ReviewSessionApplyError,
  ReviewSessionRejectError,
  type ReviewApplyAuthority,
  type ReviewApplySelection,
  type ReviewRejectAuthority,
  type ReviewSessionApplyBoundary,
  type ReviewSessionRejectBoundary,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";
import type { PostgresCommandAuthorizer } from "./command-authorizer.js";
import { PostgresChangeControlAuthorityRepository } from "./change-control-authority-repository.js";
import { PostgresProjectReviewViewReader } from "./project-review-view-reader.js";
import { PostgresReviewRecoveryAssessmentReader } from "./review-recovery-assessment-reader.js";

type Binding = PetraReviewSessionApplyCheckpoint["binding"];
type Step = PetraReviewSessionApplyResult["steps"][number];
interface Stored {
  payload: unknown;
  record_hash: string;
}
interface Retained {
  envelope: unknown;
  review_apply_request: unknown;
  review_reject_request: unknown;
  command_fingerprint: string;
  outcome_kind: "success" | "failure";
  result: unknown;
  error_code: string | null;
  event_payload: unknown;
  event_hash: string;
}
const equal = (a: unknown, b: unknown): boolean =>
  canonicalize(a) === canonicalize(b);
const fail = (
  code: ReviewSessionApplyError["code"],
  message: string,
): never => {
  throw new ReviewSessionApplyError(code, message);
};
const rejectFail = (
  code: ReviewSessionRejectError["code"],
  message: string,
): never => {
  throw new ReviewSessionRejectError(code, message);
};
const rejectError = (error: unknown): unknown => {
  if (!(error instanceof ReviewSessionApplyError)) return error;
  const code = error.code.replace(
    "REVIEW_APPLY_",
    "REVIEW_REJECT_",
  ) as ReviewSessionRejectError["code"];
  return new ReviewSessionRejectError(
    code,
    error.message
      .replaceAll("Apply", "rejection")
      .replaceAll("apply", "reject"),
  );
};

/** Composes existing authority records and commands. It stores no checkpoint ledger. */
export class PostgresReviewSessionApplyBoundary
  implements ReviewSessionApplyBoundary, ReviewSessionRejectBoundary
{
  readonly reviews: PostgresProjectReviewViewReader;
  readonly recovery: PostgresReviewRecoveryAssessmentReader;
  constructor(
    readonly pool: Pool,
    readonly authorizer: PostgresCommandAuthorizer,
    readonly changes = new PostgresChangeControlAuthorityRepository(
      pool,
      authorizer,
    ),
    readonly contracts = new PetraContractRegistry(),
    recovery?: PostgresReviewRecoveryAssessmentReader,
    readonly now: () => string = () => new Date().toISOString(),
  ) {
    this.reviews = new PostgresProjectReviewViewReader(pool, contracts);
    this.recovery =
      recovery ?? new PostgresReviewRecoveryAssessmentReader(pool, contracts);
  }

  async prepareReviewApply(
    selection: ReviewApplySelection,
    authority: ReviewApplyAuthority,
  ): Promise<PetraReviewSessionApplyCheckpoint> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
      await this.#authorize(client, selection.project_id, authority);
      const binding = await this.#binding(
        client,
        selection,
        authority,
        this.now(),
      );
      const checkpoint: PetraReviewSessionApplyCheckpoint = {
        schema_name: "petra.review-session-apply-checkpoint",
        schema_version: "1.0.0",
        binding,
        displayed_commitment_hash: hash(binding),
      };
      this.contracts.assertValid(
        "review-session-apply-checkpoint",
        "1.0.0",
        checkpoint,
      );
      await client.query("COMMIT");
      return checkpoint;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async executeReviewApply(
    input: PetraReviewSessionApplyRequest,
    authority: ReviewApplyAuthority,
  ): Promise<PetraReviewSessionApplyResult> {
    const request = structuredClone(input);
    this.contracts.assertValid(
      "review-session-apply-request",
      "1.0.0",
      request,
    );
    const checkpoint = request.checkpoint;
    const binding = checkpoint.binding;
    if (
      !equal(authority.authorization_basis, binding.authorization_basis) ||
      !equal(authority.capability_grants, binding.capability_grants)
    ) {
      fail(
        "REVIEW_APPLY_DENIED",
        "The checkpoint does not bind the current authenticated human and exact command grants.",
      );
    }
    if (
      Date.parse(request.decided_at) < Date.parse(binding.prepared_at) ||
      Date.parse(request.decided_at) > Date.parse(this.now())
    ) {
      fail(
        "REVIEW_APPLY_MISMATCH",
        "The human decision time must follow preparation and cannot be in the future.",
      );
    }
    const plan = buildReviewApplyPlan(request);
    const envelopes = [
      plan.submit,
      plan.review,
      plan.apply!,
    ] as PetraCommandEnvelope[];
    const steps: Step[] = envelopes.map((envelope) => ({
      envelope,
      observation: "unattempted",
    }));
    const selection: ReviewApplySelection = {
      project_id: binding.project_id,
      review_session_id: binding.review_session.review_session_id,
      expected_revision: binding.review_session.revision,
      expected_content_hash: binding.review_session.content_hash,
      selected_review_member_id: binding.selected_review_member_id,
    };
    const client = await this.pool.connect();
    let prior: (Retained | undefined)[];
    try {
      await client.query("BEGIN");
      await this.#authorize(client, binding.project_id, authority);
      prior = await this.#retained(client, envelopes, request);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    let completed = false;
    if (prior.some((row) => row !== undefined)) {
      // A retained prefix is evidence, not permission to send its missing suffix.
      this.#observe(steps, prior, "replayed");
      if (prior.every((row) => row?.outcome_kind === "success")) {
        await executeReviewDecisionPlan(
          {
            executeCommand: (envelope) => this.changes.executeCommand(envelope),
          },
          plan,
        );
        completed = true;
      }
    } else {
      let index = 0;
      try {
        await executeReviewDecisionPlan(
          {
            executeCommand: async (envelope) => {
              const position = index++;
              let replayed = false;
              const result = await this.changes.executeCommand(envelope, {
                onReplay: () => {
                  replayed = true;
                },
                lockKeys: this.#lockKeys(binding),
                request,
                recheck: async (transaction) => {
                  await this.#authorize(
                    transaction,
                    binding.project_id,
                    authority,
                  );
                  const retained = await this.#retained(
                    transaction,
                    envelopes,
                    request,
                  );
                  if (
                    retained
                      .slice(0, position)
                      .some((row) => row?.outcome_kind !== "success") ||
                    retained.slice(position).some((row) => row !== undefined)
                  ) {
                    fail(
                      "REVIEW_APPLY_RECONCILE",
                      "The exact command prefix changed; reconcile canonical status before another attempt.",
                    );
                  }
                  const rebuilt = await this.#binding(
                    transaction,
                    selection,
                    authority,
                    binding.prepared_at,
                    {
                      changeSetId: binding.change_set.change_set_id,
                      priorCommands: envelopes
                        .slice(0, position)
                        .map((e) => e.command_id),
                    },
                  );
                  if (!equal(rebuilt, binding))
                    fail(
                      "REVIEW_APPLY_STALE",
                      "The displayed Review commitment is no longer exact current state.",
                    );
                },
              });
              steps[position]!.observation = replayed ? "replayed" : "executed";
              return result;
            },
          },
          plan,
        );
        completed = true;
      } catch (error) {
        const position = Math.max(0, index - 1);
        steps[position]!.observation = "unverified";
        steps[position]!.error_code =
          error instanceof Error &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "REVIEW_APPLY_OBSERVATION_UNAVAILABLE";
      }
      const observation = await this.pool.connect();
      try {
        const retained = await this.#retained(observation, envelopes, request);
        this.#observe(steps, retained, "executed");
        if (!retained.every((row) => row?.outcome_kind === "success"))
          completed = false;
      } finally {
        observation.release();
      }
    }
    const assessment = await this.recovery.getReviewRecoveryAssessment({
      project_id: selection.project_id,
      review_session_id: selection.review_session_id,
      expected_revision: selection.expected_revision,
      expected_content_hash: selection.expected_content_hash,
    });
    if (assessment === undefined)
      fail(
        "REVIEW_APPLY_RECONCILE",
        "Command effects may exist; reload canonical Review and reconcile through D020.",
      );
    const result: PetraReviewSessionApplyResult = {
      schema_name: "petra.review-session-apply-result",
      schema_version: "1.0.0",
      request,
      outcome: completed ? "applied" : "reconciliation_required",
      steps: steps as PetraReviewSessionApplyResult["steps"],
      assessment: assessment!,
    };
    this.contracts.assertValid("review-session-apply-result", "1.0.0", result);
    return result;
  }

  async prepareReviewReject(
    selection: ReviewApplySelection,
    authority: ReviewRejectAuthority,
  ): Promise<PetraReviewSessionRejectCheckpoint> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
      await this.#authorizeReject(client, selection.project_id, authority);
      const binding = await this.#binding(
        client,
        selection,
        this.#applyAuthorityForReject(authority),
        this.now(),
        undefined,
        "reject",
      );
      const checkpoint = this.#rejectCheckpoint(binding, authority);
      this.contracts.assertValid(
        "review-session-reject-checkpoint",
        "1.0.0",
        checkpoint,
      );
      await client.query("COMMIT");
      return checkpoint;
    } catch (error) {
      await client.query("ROLLBACK");
      throw rejectError(error);
    } finally {
      client.release();
    }
  }

  async executeReviewReject(
    input: PetraReviewSessionRejectRequest,
    authority: ReviewRejectAuthority,
  ): Promise<PetraReviewSessionRejectResult> {
    const request = structuredClone(input);
    this.contracts.assertValid(
      "review-session-reject-request",
      "1.0.0",
      request,
    );
    const checkpoint = request.checkpoint;
    const binding = checkpoint.binding;
    if (
      !equal(authority.authorization_basis, binding.authorization_basis) ||
      !equal(authority.capability_grants, binding.capability_grants)
    )
      rejectFail(
        "REVIEW_REJECT_DENIED",
        "The rejection checkpoint does not bind the current authenticated human and exact command grants.",
      );
    if (
      Date.parse(request.decided_at) < Date.parse(binding.prepared_at) ||
      Date.parse(request.decided_at) > Date.parse(this.now())
    )
      rejectFail(
        "REVIEW_REJECT_MISMATCH",
        "The human rejection time must follow preparation and cannot be in the future.",
      );
    const plan = buildReviewRejectPlan(request);
    const envelopes = [plan.submit, plan.review] as PetraCommandEnvelope[];
    const steps: PetraReviewSessionRejectResult["steps"] = envelopes.map(
      (envelope) => ({ envelope, observation: "unattempted" as const }),
    ) as PetraReviewSessionRejectResult["steps"];
    const selection: ReviewApplySelection = {
      project_id: binding.project_id,
      review_session_id: binding.review_session.review_session_id,
      expected_revision: binding.review_session.revision,
      expected_content_hash: binding.review_session.content_hash,
      selected_review_member_id:
        binding.selected_review_member.review_member_id,
    };
    const client = await this.pool.connect();
    let prior: (Retained | undefined)[];
    try {
      await client.query("BEGIN");
      await this.#authorizeReject(client, binding.project_id, authority);
      prior = await this.#retainedReject(client, envelopes, request);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw rejectError(error);
    } finally {
      client.release();
    }
    let completed = false;
    if (prior.some((row) => row !== undefined)) {
      this.#observe(steps, prior, "replayed");
      if (prior.every((row) => row?.outcome_kind === "success")) {
        await executeReviewDecisionPlan(
          {
            executeCommand: (envelope) => this.changes.executeCommand(envelope),
          },
          plan,
        );
        completed = true;
      }
    } else {
      let index = 0;
      try {
        await executeReviewDecisionPlan(
          {
            executeCommand: async (envelope) => {
              const position = index++;
              let replayed = false;
              const result = await this.changes.executeCommand(envelope, {
                onReplay: () => {
                  replayed = true;
                },
                lockKeys: this.#rejectLockKeys(binding),
                request,
                recheck: async (transaction) => {
                  await this.#authorizeReject(
                    transaction,
                    binding.project_id,
                    authority,
                  );
                  const retained = await this.#retainedReject(
                    transaction,
                    envelopes,
                    request,
                  );
                  if (
                    retained
                      .slice(0, position)
                      .some((row) => row?.outcome_kind !== "success") ||
                    retained.slice(position).some((row) => row !== undefined)
                  )
                    rejectFail(
                      "REVIEW_REJECT_RECONCILE",
                      "The exact rejection command prefix changed; reconcile canonical status before another attempt.",
                    );
                  const rebuilt = await this.#binding(
                    transaction,
                    selection,
                    this.#applyAuthorityForReject(authority),
                    binding.prepared_at,
                    {
                      changeSetId: binding.change_set.change_set_id,
                      priorCommands: envelopes
                        .slice(0, position)
                        .map((entry) => entry.command_id),
                    },
                    "reject",
                  );
                  const rebuiltCheckpoint = this.#rejectCheckpoint(
                    rebuilt,
                    authority,
                  );
                  if (!equal(rebuiltCheckpoint.binding, binding))
                    rejectFail(
                      "REVIEW_REJECT_STALE",
                      "The displayed rejection commitment is no longer exact current state.",
                    );
                },
              });
              steps[position]!.observation = replayed ? "replayed" : "executed";
              return result;
            },
          },
          plan,
        );
        completed = true;
      } catch (error) {
        const position = Math.max(0, index - 1);
        steps[position]!.observation = "unverified";
        steps[position]!.error_code =
          error instanceof Error &&
          "code" in error &&
          typeof error.code === "string"
            ? error.code
            : "REVIEW_REJECT_OBSERVATION_UNAVAILABLE";
      }
      const observation = await this.pool.connect();
      try {
        const retained = await this.#retainedReject(
          observation,
          envelopes,
          request,
        );
        this.#observe(steps, retained, "executed");
        if (!retained.every((row) => row?.outcome_kind === "success"))
          completed = false;
      } finally {
        observation.release();
      }
    }
    const assessment = await this.recovery.getReviewRecoveryAssessment({
      project_id: selection.project_id,
      review_session_id: selection.review_session_id,
      expected_revision: selection.expected_revision,
      expected_content_hash: selection.expected_content_hash,
    });
    if (assessment === undefined)
      rejectFail(
        "REVIEW_REJECT_RECONCILE",
        "Rejection effects may exist; reload canonical Review and reconcile through D020.",
      );
    const result: PetraReviewSessionRejectResult = {
      schema_name: "petra.review-session-reject-result",
      schema_version: "1.0.0",
      request,
      outcome: completed ? "rejected" : "reconciliation_required",
      steps,
      assessment: assessment!,
    };
    this.contracts.assertValid("review-session-reject-result", "1.0.0", result);
    return result;
  }

  #lockKeys(binding: Binding): string[] {
    return [
      `review-session:${binding.review_session.review_session_id}`,
      `project-definition-project:${binding.project_id}`,
      `project-definition:${binding.project_definition.project_definition_id}`,
      ...binding.members.flatMap((m) => [
        m.working_state.candidate.working_candidate_id,
        ...m.working_state.relationships.map((r) => r.working_relationship_id),
      ]),
    ];
  }

  #rejectLockKeys(
    binding: PetraReviewSessionRejectCheckpoint["binding"],
  ): string[] {
    return [
      `review-session:${binding.review_session.review_session_id}`,
      `project-definition-project:${binding.project_id}`,
      binding.selected_review_member.working_state.candidate
        .working_candidate_id,
      ...binding.selected_review_member.working_state.relationships.map(
        (relationship) => relationship.working_relationship_id,
      ),
    ];
  }

  async #authorize(
    client: PoolClient,
    projectId: string,
    authority: ReviewApplyAuthority,
  ): Promise<void> {
    if (
      authority.authorization_basis.kind !== "authenticated_human_checkpoint" ||
      authority.authorization_basis.decision !== "apply" ||
      authority.authorization_basis.actor.actor_kind !== "human"
    ) {
      fail(
        "REVIEW_APPLY_DENIED",
        "Only an authenticated human checkpoint can authorize this Apply path.",
      );
    }
    for (const commandName of [
      "SubmitChangeSet",
      "RecordApproval",
      "ApplyChangeSet",
    ] as const) {
      if (
        !(await this.authorizer.authorize(
          {
            projectId,
            commandName,
            actor: authority.authorization_basis.actor,
            capabilityGrantId: authority.capability_grants[commandName],
          },
          client,
        ))
      ) {
        fail(
          "REVIEW_APPLY_DENIED",
          `Current authority does not grant ${commandName} to the checkpoint's human Actor.`,
        );
      }
    }
  }

  async #authorizeReject(
    client: PoolClient,
    projectId: string,
    authority: ReviewRejectAuthority,
  ): Promise<void> {
    if (
      authority.authorization_basis.kind !== "authenticated_human_checkpoint" ||
      authority.authorization_basis.decision !== "reject" ||
      authority.authorization_basis.actor.actor_kind !== "human"
    )
      rejectFail(
        "REVIEW_REJECT_DENIED",
        "Only an authenticated human checkpoint can authorize this rejection path.",
      );
    for (const commandName of ["SubmitChangeSet", "RecordApproval"] as const) {
      if (
        !(await this.authorizer.authorize(
          {
            projectId,
            commandName,
            actor: authority.authorization_basis.actor,
            capabilityGrantId: authority.capability_grants[commandName],
          },
          client,
        ))
      )
        rejectFail(
          "REVIEW_REJECT_DENIED",
          `Current authority does not grant ${commandName} to the checkpoint's human Actor.`,
        );
    }
  }

  #applyAuthorityForReject(
    authority: ReviewRejectAuthority,
  ): ReviewApplyAuthority {
    return {
      authorization_basis: {
        kind: "authenticated_human_checkpoint",
        decision: "apply",
        actor: structuredClone(authority.authorization_basis.actor),
      },
      capability_grants: {
        SubmitChangeSet: authority.capability_grants.SubmitChangeSet,
        RecordApproval: authority.capability_grants.RecordApproval,
        ApplyChangeSet: authority.capability_grants.RecordApproval,
      },
    };
  }

  #rejectCheckpoint(
    binding: Binding,
    authority: ReviewRejectAuthority,
  ): PetraReviewSessionRejectCheckpoint {
    const selected = binding.members.find(
      (member) => member.review_member_id === binding.selected_review_member_id,
    );
    if (selected === undefined)
      rejectFail(
        "REVIEW_REJECT_CORRUPT",
        "The exact selected Review member is missing from its composed rejection binding.",
      );
    const rejectionBinding: PetraReviewSessionRejectCheckpoint["binding"] = {
      project_id: binding.project_id,
      review_session: structuredClone(binding.review_session),
      selected_review_member: structuredClone(selected!),
      atomic_member_ids: structuredClone(binding.atomic_member_ids),
      change_set: structuredClone(binding.change_set),
      prepared_at: binding.prepared_at,
      authorization_basis: structuredClone(authority.authorization_basis),
      capability_grants: structuredClone(authority.capability_grants),
      scope: "one_complete_change_set",
      consequences: [
        "Petra will record a rejected human Approval for this exact complete ChangeSet and will not send ApplyChangeSet.",
        "The candidate, working records, source bytes, basis, and prior Review history remain retained and inspectable.",
        "Other independent Review members keep their own outcomes; shared atomic members reject together.",
      ],
    };
    return {
      schema_name: "petra.review-session-reject-checkpoint",
      schema_version: "1.0.0",
      binding: rejectionBinding,
      displayed_commitment_hash: reviewRejectHash(rejectionBinding),
    };
  }

  async #binding(
    client: PoolClient,
    selection: ReviewApplySelection,
    authority: ReviewApplyAuthority,
    preparedAt: string,
    own?: { changeSetId: string; priorCommands: string[] },
    intent: "apply" | "reject" = "apply",
  ): Promise<Binding> {
    const source = await this.reviews.readReviewInSnapshot(
      client,
      preparedAt,
      selection.project_id,
      selection.review_session_id,
    );
    if (source === undefined)
      return fail(
        "REVIEW_APPLY_STALE",
        "The exact ReviewSession is unavailable.",
      );
    const { session, view } = source;
    if (session.schema_version !== "1.1.0" || view.schema_version !== "1.2.0")
      return fail(
        "REVIEW_APPLY_UNSUPPORTED",
        "Apply requires the registered scientific working Review profile.",
      );
    if (
      session.revision !== selection.expected_revision ||
      session.content_hash !== selection.expected_content_hash ||
      session.content.lifecycle !== "open"
    ) {
      fail(
        "REVIEW_APPLY_STALE",
        "Apply requires the exact current open ReviewSession.",
      );
    }
    const extra = await client.query<{ command_id: string }>(
      "SELECT command_id FROM petra.domain_events WHERE project_id = $1 AND stream_revision > $2 ORDER BY stream_revision",
      [selection.project_id, session.content.snapshot.stream_revision],
    );
    if (
      !equal(
        extra.rows.map((r) => r.command_id),
        own?.priorCommands ?? [],
      )
    )
      fail(
        "REVIEW_APPLY_STALE",
        "The Review snapshot changed outside this exact command prefix.",
      );
    const definitionRows = await client.query<Stored>(
      `SELECT revision.payload, revision.record_hash FROM petra.project_definitions AS head JOIN petra.project_definition_revisions AS revision ON revision.project_definition_id = head.project_definition_id AND revision.revision = head.current_revision WHERE head.project_id = $1 AND head.project_definition_id = $2`,
      [
        selection.project_id,
        session.project_definition_ref.project_definition_id,
      ],
    );
    const definition = this.#record<PetraProjectDefinition>(
      "project-definition",
      definitionRows.rows[0],
    );
    if (
      definition.revision !== session.project_definition_ref.revision ||
      definition.content_hash !== session.project_definition_ref.content_hash
    )
      fail(
        "REVIEW_APPLY_STALE",
        "The ProjectDefinition changed after this Review was composed.",
      );
    const member = view.content.members.find(
      (m) => m.review_member_id === selection.selected_review_member_id,
    );
    if (member === undefined)
      return fail(
        "REVIEW_APPLY_MISMATCH",
        "The selected inspection member is not in this Review.",
      );
    const pair = member.candidate.profile_payload;
    const targets: [string, string] = [
      pair.claim_ref.record_id,
      pair.assertion_ref.record_id,
    ];
    const atomicIds = session.content.members
      .filter((m) =>
        m.candidate_bindings.some((b) =>
          targets.includes(b.record_ref.record_id),
        ),
      )
      .map((m) => {
        if (
          m.candidate_bindings.length !== 2 ||
          !m.candidate_bindings.every((b) =>
            targets.includes(b.record_ref.record_id),
          )
        )
          fail(
            "REVIEW_APPLY_UNSUPPORTED",
            "The scientific owner cannot split a shared atomic member or operation manifest.",
          );
        return m.review_member_id;
      });
    for (const m of view.content.members.filter((m) =>
      atomicIds.includes(m.review_member_id),
    )) {
      for (const record of [
        m.working_state.candidate,
        ...m.working_state.relationships,
      ]) {
        if (
          record.disposition !== "available" ||
          record.validation.state !== "completed" ||
          record.validation.results.length === 0 ||
          record.validation.results.some(
            (r) => !["pass", "passed", "warning"].includes(r.outcome),
          )
        )
          fail(
            "REVIEW_APPLY_STALE",
            "Every exact atomic working record requires completed applicable validation.",
          );
      }
    }
    // Serialize with canonical working revision writers, including those outside Review.
    for (const m of view.content.members) {
      const candidate = m.working_state.candidate;
      const heads = await client.query<{ current_revision: string }>(
        "SELECT current_revision::text FROM petra.working_candidates WHERE project_id = $1 AND working_candidate_id = $2 FOR SHARE",
        [selection.project_id, candidate.working_candidate_id],
      );
      if (heads.rows[0]?.current_revision !== String(candidate.revision))
        fail(
          "REVIEW_APPLY_STALE",
          "A working candidate revision superseded the displayed Review.",
        );
      for (const r of m.working_state.relationships) {
        const heads = await client.query<{ current_revision: string }>(
          "SELECT current_revision::text FROM petra.working_relationships WHERE project_id = $1 AND working_relationship_id = $2 FOR SHARE",
          [selection.project_id, r.working_relationship_id],
        );
        if (heads.rows[0]?.current_revision !== String(r.revision))
          fail(
            "REVIEW_APPLY_STALE",
            "A working relationship revision superseded the displayed Review.",
          );
      }
    }
    const claim = await this.#evidence<PetraClaim>(
      client,
      "claim",
      pair.claim_ref,
    );
    const assertion = await this.#evidence<PetraAssertion>(
      client,
      "assertion",
      pair.assertion_ref,
    );
    for (const record of [claim, assertion]) {
      if (
        record.authority.zone !== "quarantine" ||
        !["unreviewed", "machine_checked"].includes(
          record.authority.review_state,
        )
      )
        fail(
          "REVIEW_APPLY_STALE",
          "Promotion requires current unreviewed or machine-checked quarantine targets.",
        );
    }
    const existing = await client.query<Stored>(
      "SELECT payload, record_hash FROM petra.change_sets WHERE project_id = $1",
      [selection.project_id],
    );
    for (const row of existing.rows) {
      const cs = row.payload as PetraChangeSet;
      this.contracts.assertValid("change-set", cs.schema_version, cs);
      if (hash(cs) !== row.record_hash)
        fail(
          "REVIEW_APPLY_CORRUPT",
          "A canonical ChangeSet record is corrupt.",
        );
      if (
        cs.change_set_id !== own?.changeSetId &&
        cs.content.operations.some((op) => targets.includes(op.target_id))
      ) {
        fail(
          "REVIEW_APPLY_RECONCILE",
          "An existing ChangeSet already binds these targets. Reconcile its complete atomic outcome before preparing another attempt.",
        );
      }
    }
    const sourceIds = [
      ...new Set(
        view.content.members.flatMap((m) =>
          m.basis.map((b) => b.project_source_id),
        ),
      ),
    ].sort();
    const sources: PetraProjectSource[] = [];
    for (const id of sourceIds) {
      const rows = await client.query<Stored>(
        `SELECT revision.payload, revision.record_hash FROM petra.project_sources AS head JOIN petra.project_source_revisions AS revision ON revision.project_source_id = head.project_source_id AND revision.revision = head.current_revision WHERE head.project_id = $1 AND head.project_source_id = $2 FOR SHARE OF head`,
        [selection.project_id, id],
      );
      const record = this.#record<PetraProjectSource>(
        "project-source",
        rows.rows[0],
      );
      if (record.content.status !== "active")
        fail(
          "REVIEW_APPLY_STALE",
          "The displayed source basis is no longer active.",
        );
      sources.push(record);
    }
    const content: PetraChangeSet["content"] = {
      project_id: selection.project_id,
      origin: "direct_edit",
      proposed_by: structuredClone(authority.authorization_basis.actor),
      reason:
        intent === "apply"
          ? `Manual Apply from ReviewSession ${session.review_session_id} revision ${session.revision}.`
          : `Manual rejection decision for ReviewSession ${session.review_session_id} revision ${session.revision}.`,
      operations: [
        {
          operation_kind: "promote_claim",
          target_id: claim.claim_id,
          base_revision: claim.revision,
          before: {
            zone: "quarantine",
            review_state: claim.authority.review_state as
              "unreviewed" | "machine_checked",
          },
          after: { zone: "trusted", review_state: "human_accepted" },
        },
        {
          operation_kind: "promote_assertion",
          target_id: assertion.assertion_id,
          base_revision: assertion.revision,
          before: {
            zone: "quarantine",
            review_state: assertion.authority.review_state as
              "unreviewed" | "machine_checked",
          },
          after: { zone: "trusted", review_state: "human_accepted" },
        },
      ],
      impact: {
        affected_object_ids: targets,
        downstream_object_ids: [],
        summary:
          "Promote the exact Claim and ASSERTS pair into trusted Project state through one atomic ChangeSet.",
        generated_at: preparedAt,
      },
      risk_tier: "R2",
    };
    const contentHash = hash(content);
    return {
      project_id: selection.project_id,
      review_session: session,
      project_definition: definition,
      selected_review_member_id: selection.selected_review_member_id,
      atomic_member_ids: atomicIds as Binding["atomic_member_ids"],
      members: view.content.members.map((m) => ({
        review_member_id: m.review_member_id,
        candidate: m.candidate,
        working_state: m.working_state,
        basis: m.basis,
      })) as Binding["members"],
      claim,
      assertion,
      sources: sources as Binding["sources"],
      change_set: {
        schema_name: "petra.change-set",
        schema_version: "1.0.0",
        change_set_id: derivePetraId(
          "change_set",
          `${contentHash}|${preparedAt}`,
        ),
        revision: 1,
        state: "submitted",
        content,
        content_hash: contentHash,
        proposed_at: preparedAt,
      },
      consequences: [
        content.impact.summary,
        "Source bytes, ProjectSource membership, working revisions, and provenance remain retained. Other Review members retain their independent outcomes.",
        "Downstream effects are not inferred. Command effects and projection progress are observed separately.",
      ],
      prepared_at: preparedAt,
      ...structuredClone(authority),
      review_policy: { applicability: "not_applicable" },
      scope: "one_complete_change_set",
    };
  }

  #record<T>(name: string, row: Stored | undefined): T {
    if (row === undefined || hash(row.payload) !== row.record_hash)
      return fail(
        "REVIEW_APPLY_CORRUPT",
        "An exact canonical checkpoint record is missing or corrupt.",
      );
    this.contracts.assertValid(name, "1.0.0", row.payload);
    const contentRecord = row.payload as {
      content?: unknown;
      content_hash?: string;
    };
    if (
      contentRecord.content !== undefined &&
      contentRecord.content_hash !== hash(contentRecord.content)
    )
      fail(
        "REVIEW_APPLY_CORRUPT",
        "A canonical checkpoint content hash is inconsistent.",
      );
    return structuredClone(row.payload as T);
  }

  async #evidence<T>(
    client: PoolClient,
    kind: string,
    ref: { record_id: string; revision: number; record_hash: string },
  ): Promise<T> {
    const rows = await client.query<Stored & { current_revision: string }>(
      `SELECT revision.payload, revision.record_hash, head.current_revision::text FROM petra.evidence_entities AS head JOIN petra.evidence_entity_revisions AS revision ON revision.evidence_id = head.evidence_id AND revision.revision = head.current_revision WHERE head.evidence_id = $1 AND head.evidence_kind = $2 FOR SHARE OF head`,
      [ref.record_id, kind],
    );
    const row = rows.rows[0];
    if (
      row?.current_revision !== String(ref.revision) ||
      row.record_hash !== ref.record_hash
    )
      return fail(
        "REVIEW_APPLY_STALE",
        "The exact scientific target revision changed.",
      );
    return this.#record<T>(kind, row);
  }

  async #retained(
    client: PoolClient,
    envelopes: readonly PetraCommandEnvelopeRecord[],
    request: PetraReviewSessionApplyRequest,
  ): Promise<(Retained | undefined)[]> {
    const result: (Retained | undefined)[] = [];
    for (const envelope of envelopes) {
      const rows = await client.query<Retained>(
        `SELECT command.envelope, command.review_apply_request, command.command_fingerprint, command.outcome_kind, command.result, command.error_code, event.payload AS event_payload, event.record_hash AS event_hash FROM petra.command_executions AS command LEFT JOIN petra.domain_events AS event ON event.command_id = command.command_id WHERE command.command_id = $1 OR command.idempotency_key = $2`,
        [envelope.command_id, envelope.idempotency_key],
      );
      if (rows.rows.length > 1)
        fail(
          "REVIEW_APPLY_RECONCILE",
          "Canonical command identity coverage is ambiguous.",
        );
      const row = rows.rows[0];
      if (row !== undefined) {
        if (
          !equal(row.review_apply_request, request) ||
          !equal(row.envelope, envelope) ||
          row.command_fingerprint !== hash(envelope) ||
          hash(row.event_payload) !== row.event_hash
        )
          fail(
            "REVIEW_APPLY_RECONCILE",
            "A retained command or event does not match this exact checkpoint. Effects remain uncertain.",
          );
        this.contracts.assertValid("domain-event", "1.0.0", row.event_payload);
        const event = row.event_payload as PetraDomainEvent;
        if (
          event.command_id !== envelope.command_id ||
          event.project_id !== envelope.project_id ||
          !equal(event.actor, envelope.actor) ||
          event.idempotency_key !== envelope.idempotency_key
        )
          fail(
            "REVIEW_APPLY_RECONCILE",
            "A retained event does not bind its exact checkpoint command.",
          );
      }
      result.push(row);
    }
    let missing = false;
    for (const row of result) {
      if (row === undefined || row.outcome_kind === "failure") missing = true;
      else if (missing)
        fail(
          "REVIEW_APPLY_RECONCILE",
          "Retained commands do not form a complete ordered prefix.",
        );
    }
    return result;
  }

  async #retainedReject(
    client: PoolClient,
    envelopes: readonly PetraCommandEnvelopeRecord[],
    request: PetraReviewSessionRejectRequest,
  ): Promise<(Retained | undefined)[]> {
    const result: (Retained | undefined)[] = [];
    for (const envelope of envelopes) {
      const rows = await client.query<Retained>(
        `SELECT command.envelope, command.review_apply_request,
                command.review_reject_request, command.command_fingerprint,
                command.outcome_kind, command.result, command.error_code,
                event.payload AS event_payload, event.record_hash AS event_hash
           FROM petra.command_executions AS command
           LEFT JOIN petra.domain_events AS event
             ON event.command_id = command.command_id
          WHERE command.command_id = $1 OR command.idempotency_key = $2`,
        [envelope.command_id, envelope.idempotency_key],
      );
      if (rows.rows.length > 1)
        rejectFail(
          "REVIEW_REJECT_RECONCILE",
          "Canonical rejection command identity coverage is ambiguous.",
        );
      const row = rows.rows[0];
      if (row !== undefined) {
        if (
          !equal(row.review_reject_request, request) ||
          row.review_apply_request !== null ||
          !equal(row.envelope, envelope) ||
          row.command_fingerprint !== hash(envelope) ||
          hash(row.event_payload) !== row.event_hash
        )
          rejectFail(
            "REVIEW_REJECT_RECONCILE",
            "A retained rejection command or event does not match this exact checkpoint. Effects remain uncertain.",
          );
        this.contracts.assertValid("domain-event", "1.0.0", row.event_payload);
        const event = row.event_payload as PetraDomainEvent;
        if (
          event.command_id !== envelope.command_id ||
          event.project_id !== envelope.project_id ||
          !equal(event.actor, envelope.actor) ||
          event.idempotency_key !== envelope.idempotency_key
        )
          rejectFail(
            "REVIEW_REJECT_RECONCILE",
            "A retained rejection event does not bind its exact checkpoint command.",
          );
      }
      result.push(row);
    }
    let missing = false;
    for (const row of result) {
      if (row === undefined || row.outcome_kind === "failure") missing = true;
      else if (missing)
        rejectFail(
          "REVIEW_REJECT_RECONCILE",
          "Retained rejection commands do not form a complete ordered prefix.",
        );
    }
    return result;
  }

  #observe(
    steps: Step[],
    rows: (Retained | undefined)[],
    success: "executed" | "replayed",
  ): void {
    rows.forEach((row, index) => {
      if (row === undefined) return;
      steps[index]!.event = row.event_payload as PetraDomainEvent;
      if (
        steps[index]!.observation !== "unverified" &&
        steps[index]!.observation !== "replayed"
      )
        steps[index]!.observation =
          row.outcome_kind === "success" ? success : "failed";
      if (row.error_code !== null) steps[index]!.error_code = row.error_code;
    });
  }
}
