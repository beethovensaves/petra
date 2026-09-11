import { createHash, timingSafeEqual } from "node:crypto";

import type {
  PetraCommandEnvelopeRecord,
  PetraDomainEventRecord,
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationExecutionView,
  PetraProjectHistoryCompensationPlanView,
  ProjectHistoryEventRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  ChangeControlError,
  ProjectHistoryCompensationExecutionUnavailableError,
  type ProjectHistoryCompensationExecutionBoundary,
  type ReviewCommandExecutor,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool } from "pg";

import type { PostgresProjectHistoryViewReader } from "./project-history-view-reader.js";

type PlanStep =
  PetraProjectHistoryCompensationPlanView["content"]["commands"][number];
type ExecutionStep =
  PetraProjectHistoryCompensationExecutionView["content"]["steps"][number];
type Command = PetraCommandEnvelopeRecord["command"];
type SubmitEnvelope = PetraCommandEnvelopeRecord & {
  readonly command: Extract<Command, { command_name: "SubmitChangeSet" }>;
};
type ApprovalEnvelope = PetraCommandEnvelopeRecord & {
  readonly command: Extract<Command, { command_name: "RecordApproval" }>;
};
type ApplyEnvelope = PetraCommandEnvelopeRecord & {
  readonly command: Extract<Command, { command_name: "ApplyChangeSet" }>;
};

interface ExecutionRow {
  readonly command_id: string;
  readonly command_fingerprint: string;
  readonly envelope: unknown;
  readonly outcome_kind: "success" | "failure";
  readonly result: unknown;
  readonly error_code: string | null;
  readonly error_message: string | null;
  readonly event_payload: unknown;
  readonly event_record_hash: string | null;
}

interface RetainedExecution {
  readonly position: number;
  readonly commandName: PlanStep["command_name"];
  readonly commandRef: ExecutionStep["command_ref"];
  readonly outcome: "success" | "failure";
  readonly result?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
  readonly completedAt: string;
  readonly eventRef: ProjectHistoryEventRef;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const sameCanonicalValue = (left: unknown, right: unknown): boolean => {
  const leftBytes = Buffer.from(canonicalize(left));
  const rightBytes = Buffer.from(canonicalize(right));
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
};

const unavailable = (message: string): never => {
  throw new ProjectHistoryCompensationExecutionUnavailableError(message);
};

const errorObservation = (
  error: ChangeControlError,
): { readonly code: string; readonly message: string } => ({
  code: error.code,
  message: error.message,
});

export class PostgresProjectHistoryCompensationExecutor implements ProjectHistoryCompensationExecutionBoundary {
  readonly #pool: Pool;
  readonly #historyViews: PostgresProjectHistoryViewReader;
  readonly #authority: ReviewCommandExecutor;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    historyViews: PostgresProjectHistoryViewReader,
    authority: ReviewCommandExecutor,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#historyViews = historyViews;
    this.#authority = authority;
    this.#contracts = contracts;
  }

  async executeProjectHistoryCompensationPlan(
    request: PetraProjectHistoryCompensationExecutionRequest,
  ): Promise<PetraProjectHistoryCompensationExecutionView | undefined> {
    this.#contracts.assertValid(
      "project-history-compensation-execution-request",
      "1.0.0",
      request,
    );
    const plan = request.plan;
    if (
      request.project_id !== plan.project_id ||
      request.event_id !== plan.event_id
    ) {
      unavailable(
        "The compensation execution request and exact plan must name the same Project event.",
      );
    }
    this.#assertPlanIntegrity(plan);

    let retained = await this.#retainedExecutions(plan);
    this.#assertRetainedPrefix(retained);
    let preflightState:
      | "fresh_plan_revalidated"
      | "retained_prefix_validated"
      | "retained_completion_replayed";
    if (
      retained.length === 3 &&
      retained.every(({ outcome }) => outcome === "success")
    ) {
      preflightState = "retained_completion_replayed";
      return this.#view(plan, retained, preflightState);
    }
    if (retained.some(({ outcome }) => outcome === "failure")) {
      preflightState = "retained_prefix_validated";
      return this.#view(plan, retained, preflightState);
    }
    if (retained.length === 0) {
      const exists =
        await this.#historyViews.revalidateProjectHistoryCompensationPlan(plan);
      if (!exists) return undefined;
      preflightState = "fresh_plan_revalidated";
    } else {
      preflightState = "retained_prefix_validated";
    }

    const firstMissing = retained.length;
    for (
      let index = firstMissing;
      index < plan.content.commands.length;
      index += 1
    ) {
      const step = plan.content.commands[index];
      if (step === undefined) {
        return unavailable(
          "The exact compensation plan lost a required command step.",
        );
      }
      try {
        await this.#authority.executeCommand(step.envelope);
      } catch (error) {
        if (!(error instanceof ChangeControlError)) throw error;
        retained = await this.#retainedExecutions(plan);
        this.#assertRetainedPrefix(retained);
        if (retained.some(({ outcome }) => outcome === "failure")) {
          return this.#view(plan, retained, preflightState);
        }
        return this.#view(plan, retained, preflightState, {
          position: step.position,
          error: errorObservation(error),
        });
      }
      retained = await this.#retainedExecutions(plan);
      this.#assertRetainedPrefix(retained);
      const completed = retained[index];
      if (completed?.outcome !== "success") {
        unavailable(
          "A compensation command returned without an exact retained success record.",
        );
      }
    }
    return this.#view(plan, retained, preflightState);
  }

  #assertPlanIntegrity(plan: PetraProjectHistoryCompensationPlanView): void {
    this.#contracts.assertValid(
      "project-history-compensation-plan-view",
      "1.0.0",
      plan,
    );
    if (canonicalHash(plan.content) !== plan.content_hash) {
      unavailable("The compensation plan does not reproduce its content hash.");
    }
    const [submitStep, approvalStep, applyStep] = plan.content.commands;
    if (
      submitStep === undefined ||
      approvalStep === undefined ||
      applyStep === undefined ||
      submitStep.position !== 1 ||
      submitStep.command_name !== "SubmitChangeSet" ||
      submitStep.envelope.command.command_name !== "SubmitChangeSet" ||
      approvalStep.position !== 2 ||
      approvalStep.command_name !== "RecordApproval" ||
      approvalStep.envelope.command.command_name !== "RecordApproval" ||
      applyStep.position !== 3 ||
      applyStep.command_name !== "ApplyChangeSet" ||
      applyStep.envelope.command.command_name !== "ApplyChangeSet"
    ) {
      unavailable("The compensation plan command order is not exact.");
    }
    const submit = submitStep.envelope as SubmitEnvelope;
    const approval = approvalStep.envelope as ApprovalEnvelope;
    const apply = applyStep.envelope as ApplyEnvelope;
    const commandApproval = approval.command.approval;
    if (
      !sameCanonicalValue(submit.command.change_set, plan.content.change_set) ||
      !sameCanonicalValue(commandApproval, plan.content.approval) ||
      submit.project_id !== plan.project_id ||
      approval.project_id !== plan.project_id ||
      apply.project_id !== plan.project_id ||
      submit.correlation_id !== approval.correlation_id ||
      submit.correlation_id !== apply.correlation_id ||
      approval.causation_id !== submit.command_id ||
      apply.causation_id !== approval.command_id ||
      submit.submitted_at !== plan.read_at ||
      approval.submitted_at !== plan.read_at ||
      apply.submitted_at !== plan.read_at ||
      plan.content.confirmation.confirmed_at !== plan.read_at ||
      plan.content.revalidation.checked_at !== plan.read_at ||
      plan.content.confirmation.confirmed_by.actor_id !==
        submit.actor.actor_id ||
      plan.content.confirmation.confirmed_by.actor_kind !==
        submit.actor.actor_kind ||
      approval.actor.actor_id !== submit.actor.actor_id ||
      approval.actor.actor_kind !== submit.actor.actor_kind ||
      apply.actor.actor_id !== submit.actor.actor_id ||
      apply.actor.actor_kind !== submit.actor.actor_kind ||
      commandApproval.subject.change_set_id !==
        plan.content.change_set.change_set_id ||
      commandApproval.subject.change_set_content_hash !==
        plan.content.change_set.content_hash ||
      apply.command.change_set_id !== plan.content.change_set.change_set_id ||
      apply.command.change_set_content_hash !==
        plan.content.change_set.content_hash ||
      apply.command.approval_id !== commandApproval.approval_id
    ) {
      unavailable(
        "The compensation plan does not preserve its exact ChangeSet, Approval, Actor, timing, or causal envelope identities.",
      );
    }
    for (let index = 0; index < plan.content.commands.length; index += 1) {
      const step = plan.content.commands[index];
      const binding = plan.content.revalidation.preview_command_bindings[index];
      if (
        step === undefined ||
        binding === undefined ||
        step.position !== binding.position ||
        step.command_name !== binding.command_name ||
        step.envelope.actor.actor_id !== binding.actor.actor_id ||
        step.envelope.actor.actor_kind !== binding.actor.actor_kind ||
        step.envelope.capability_grant_id !==
          binding.grant_ref.capability_grant_id
      ) {
        unavailable(
          "The compensation plan command envelopes differ from their revalidated preview bindings.",
        );
      }
    }
    const operations = plan.content.change_set.content.operations;
    if (
      operations.length !== plan.content.revalidation.target_bindings.length ||
      operations.some((operation, index) => {
        const binding = plan.content.revalidation.target_bindings[index];
        return (
          binding === undefined ||
          operation.operation_kind !== binding.operation_kind ||
          operation.target_id !== binding.target_id ||
          operation.base_revision !== binding.base_revision ||
          !sameCanonicalValue(operation.before, binding.before) ||
          !sameCanonicalValue(operation.after, binding.after)
        );
      })
    ) {
      unavailable(
        "The compensation plan operations differ from their exact target bindings.",
      );
    }
  }

  async #retainedExecutions(
    plan: PetraProjectHistoryCompensationPlanView,
  ): Promise<RetainedExecution[]> {
    const commandIds = plan.content.commands.map(
      ({ envelope }) => envelope.command_id,
    );
    const result = await this.#pool.query<ExecutionRow>(
      `SELECT execution.command_id, execution.command_fingerprint,
              execution.envelope, execution.outcome_kind, execution.result,
              execution.error_code, execution.error_message,
              event.payload AS event_payload,
              event.record_hash AS event_record_hash
         FROM petra.command_executions AS execution
         LEFT JOIN petra.domain_events AS event
           ON event.command_id = execution.command_id
          AND event.project_id = execution.project_id
        WHERE execution.project_id = $1
          AND execution.command_id = ANY($2::text[])`,
      [plan.project_id, commandIds],
    );
    const rows = new Map(result.rows.map((row) => [row.command_id, row]));
    const retained: RetainedExecution[] = [];
    for (const step of plan.content.commands) {
      const row = rows.get(step.envelope.command_id);
      if (row === undefined) continue;
      if (
        canonicalHash(step.envelope) !== row.command_fingerprint ||
        !sameCanonicalValue(step.envelope, row.envelope)
      ) {
        unavailable(
          "A retained command identity is bound to different immutable envelope content.",
        );
      }
      const eventPayload = row.event_payload;
      const eventRecordHash = row.event_record_hash;
      if (eventPayload === null || eventRecordHash === null) {
        return unavailable(
          "A retained compensation command lost its immutable Project event.",
        );
      }
      const event = eventPayload as PetraDomainEventRecord;
      this.#contracts.assertValid("domain-event", event.schema_version, event);
      if (
        event.project_id !== plan.project_id ||
        event.command_id !== step.envelope.command_id ||
        event.correlation_id !== step.envelope.correlation_id ||
        canonicalHash(event) !== eventRecordHash
      ) {
        unavailable(
          "A retained compensation command and Project event do not reproduce the same causal authority fact.",
        );
      }
      if (
        (row.outcome_kind === "success" && row.result === null) ||
        (row.outcome_kind === "failure" &&
          (row.result !== null ||
            row.error_code === null ||
            row.error_message === null))
      ) {
        unavailable(
          "A retained compensation command has an incomplete outcome.",
        );
      }
      const expectedEventType = [
        "change_set.submitted",
        "approval.recorded",
        "change_set.reverted",
      ][step.position - 1];
      const expectedOutcome = ["submitted", "approval_recorded", "reverted"][
        step.position - 1
      ];
      if (row.outcome_kind === "success") {
        const commandResult = row.result;
        if (
          typeof commandResult !== "object" ||
          commandResult === null ||
          !("outcome" in commandResult) ||
          commandResult.outcome !== expectedOutcome ||
          !("command_id" in commandResult) ||
          commandResult.command_id !== step.envelope.command_id ||
          event.event.event_type !== expectedEventType
        ) {
          unavailable(
            "A retained compensation success does not match its exact command or event outcome.",
          );
        }
      } else if (
        step.position !== 3 ||
        event.event.event_type !== "change_set.reversal_conflicted" ||
        (row.error_code !== "STALE_TARGET_REVISION" &&
          row.error_code !== "TARGET_AUTHORITY_MISMATCH")
      ) {
        unavailable(
          "A retained compensation failure is not the exact terminal reversal conflict.",
        );
      }
      retained.push({
        position: step.position,
        commandName: step.command_name,
        commandRef: this.#commandRef(step),
        outcome: row.outcome_kind,
        ...(row.result === null ? {} : { result: structuredClone(row.result) }),
        ...(row.error_code === null || row.error_message === null
          ? {}
          : { error: { code: row.error_code, message: row.error_message } }),
        completedAt: event.recorded_at,
        eventRef: {
          event_id: event.event_id,
          schema_version: event.schema_version,
          event_type: event.event.event_type,
          event_position: event.event_position,
          stream_revision: event.stream_revision,
          record_hash: eventRecordHash,
        },
      });
    }
    return retained.sort((left, right) => left.position - right.position);
  }

  #assertRetainedPrefix(retained: readonly RetainedExecution[]): void {
    for (let index = 0; index < retained.length; index += 1) {
      const member = retained[index];
      if (member?.position !== index + 1) {
        unavailable(
          "Retained compensation commands do not form one exact causal prefix.",
        );
      }
      if (member === undefined) {
        return unavailable(
          "Retained compensation command inspection returned an incomplete prefix.",
        );
      }
      if (member.outcome === "failure" && index !== retained.length - 1) {
        unavailable(
          "A command was retained after an earlier terminal compensation failure.",
        );
      }
    }
  }

  #commandRef(step: PlanStep): ExecutionStep["command_ref"] {
    return {
      command_id: step.envelope.command_id,
      schema_version: step.envelope.schema_version,
      command_name: step.command_name,
      idempotency_key: step.envelope.idempotency_key,
      command_fingerprint: canonicalHash(step.envelope),
      capability_grant_id: step.envelope.capability_grant_id,
      correlation_id: step.envelope.correlation_id,
    };
  }

  async #view(
    plan: PetraProjectHistoryCompensationPlanView,
    retained: readonly RetainedExecution[],
    preflightState:
      | "fresh_plan_revalidated"
      | "retained_prefix_validated"
      | "retained_completion_replayed",
    transientFailure?: {
      readonly position: number;
      readonly error: { readonly code: string; readonly message: string };
    },
  ): Promise<PetraProjectHistoryCompensationExecutionView> {
    const timestamp = await this.#pool.query<{ read_at: Date }>(
      "SELECT transaction_timestamp() AS read_at",
    );
    const readAt = timestamp.rows[0]?.read_at.toISOString();
    if (readAt === undefined) {
      return unavailable(
        "PostgreSQL did not provide an execution-result timestamp.",
      );
    }
    const byPosition = new Map(
      retained.map((member) => [member.position, member]),
    );
    const steps = plan.content.commands.map((step) => {
      const member = byPosition.get(step.position);
      if (member?.outcome === "success") {
        return {
          position: step.position,
          command_name: step.command_name,
          command_ref: member.commandRef,
          state: "retained_success",
          completed_at: member.completedAt,
          result: structuredClone(member.result) as never,
          event_ref: structuredClone(member.eventRef),
        };
      }
      if (member?.outcome === "failure") {
        return {
          position: step.position,
          command_name: step.command_name,
          command_ref: member.commandRef,
          state: "retained_failure",
          completed_at: member.completedAt,
          error: structuredClone(member.error) as never,
          event_ref: structuredClone(member.eventRef),
        };
      }
      if (transientFailure?.position === step.position) {
        return {
          position: step.position,
          command_name: step.command_name,
          command_ref: this.#commandRef(step),
          state: "attempt_failed_not_retained",
          error: structuredClone(transientFailure.error),
          retention: "not_in_immutable_command_executions",
        };
      }
      return {
        position: step.position,
        command_name: step.command_name,
        command_ref: this.#commandRef(step),
        state: "not_attempted",
        reason: "prior_command_did_not_complete",
      };
    }) as [ExecutionStep, ExecutionStep, ExecutionStep];
    const completedPrefix = steps.findIndex(
      ({ state }) => state !== "retained_success",
    );
    const completedCount = completedPrefix === -1 ? 3 : completedPrefix;
    const completed = completedCount === 3;
    const retainedFailure = retained.find(
      ({ outcome }) => outcome === "failure",
    );
    const applyResult = completed ? retained[2]?.result : undefined;
    const applyEvent = completed ? retained[2]?.eventRef : undefined;
    if (
      completed &&
      (typeof applyResult !== "object" ||
        applyResult === null ||
        !("outcome" in applyResult) ||
        applyResult.outcome !== "reverted" ||
        applyEvent === undefined)
    ) {
      unavailable(
        "The completed compensation plan does not resolve to one exact retained reversal.",
      );
    }
    const result = applyResult as
      | undefined
      | {
          readonly change_set_id: string;
          readonly compensates_change_set_id: string;
          readonly approval_id: string;
          readonly claim_id: string;
          readonly claim_revision: number;
          readonly assertion_id: string;
          readonly assertion_revision: number;
        };
    const content: PetraProjectHistoryCompensationExecutionView["content"] = {
      execution_kind: "single_change_set_compensation_execution",
      authorization_scope: "authenticated_project",
      plan_ref: {
        schema_name: plan.schema_name,
        schema_version: plan.schema_version,
        content_hash: plan.content_hash,
        composed_at: plan.read_at,
        change_set_id: plan.content.change_set.change_set_id,
        change_set_content_hash: plan.content.change_set.content_hash,
        approval_id: plan.content.approval.approval_id,
        correlation_id: plan.content.commands[0].envelope.correlation_id,
      },
      preflight: { state: preflightState, checked_at: readAt },
      outcome: completed ? "completed" : "stopped",
      completed_prefix: completedCount,
      steps,
      authoritative_effect:
        completed && result !== undefined && applyEvent !== undefined
          ? {
              state: "compensation_applied",
              compensation_change_set_id: result.change_set_id,
              compensated_change_set_id: result.compensates_change_set_id,
              approval_id: result.approval_id,
              claim_ref: {
                semantic_key: "scientific.claim",
                object_id: result.claim_id,
                prior_revision: result.claim_revision - 1,
                resulting_revision: result.claim_revision,
                resulting_authority: {
                  zone: "quarantine",
                  review_state: "human_rejected",
                },
              },
              assertion_ref: {
                semantic_key: "scientific.assertion",
                object_id: result.assertion_id,
                prior_revision: result.assertion_revision - 1,
                resulting_revision: result.assertion_revision,
                resulting_authority: {
                  zone: "quarantine",
                  review_state: "human_rejected",
                },
              },
              reversal_event_ref: structuredClone(applyEvent),
            }
          : { state: "not_completed", reason: "command_sequence_stopped" },
      recovery: completed
        ? { state: "complete", same_request: "returns_exact_retained_result" }
        : retainedFailure === undefined
          ? {
              state: "retry_exact_plan",
              completed_prefix: completedCount,
              same_request_is_idempotent: true,
              next_position: Math.min(completedCount + 1, 3),
              reason:
                "The failed attempt was not retained; retrying the exact request replays its retained prefix before the next command.",
            }
          : {
              state: "review_retained_failure",
              completed_prefix: completedCount,
              same_request_is_idempotent: true,
              reason:
                "The failed command and conflict event are immutable; the same exact request returns that retained failure for review.",
            },
      atomicity: "per_command_transaction_not_three_command_atomic",
      derivation: {
        aggregate_ledger: "not_created",
        sources: [
          "immutable_command_executions",
          "immutable_domain_events",
          "current_change_control_authority",
        ],
      },
      decision_boundary: {
        single_plan_execution: "performed_or_stopped_exactly",
        generic_undo: "not_available",
        multi_step_compensation: "not_assessed",
        reversal_of_reversal: "not_available",
      },
      omissions: [
        "dependent_effect_not_inferred_or_reversed",
        "historical_project_definition_not_interpreted",
        "cross_family_global_order_not_asserted",
      ],
      graph_navigation_history: "client_local_separate",
    };
    const view: PetraProjectHistoryCompensationExecutionView = {
      schema_name: "petra.project-history-compensation-execution-view",
      schema_version: "1.0.0",
      project_id: plan.project_id,
      event_id: plan.event_id,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid(
      "project-history-compensation-execution-view",
      "1.0.0",
      view,
    );
    return structuredClone(view);
  }
}
