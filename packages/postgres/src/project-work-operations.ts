import { createHash } from "node:crypto";

import type {
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  ProjectWorkOperationError,
  type ProjectWorkCommandPrincipal,
  type ProjectWorkOperationAuthority,
  type ProjectWorkOperationsViewReader,
  type RegisterProjectWorkRequiredInput,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";
import { PostgresWorkUnitAuthorityRepository } from "./work-unit-authority-repository.js";

interface StoredReceiptRow {
  readonly state: "pending" | "completed";
  readonly request_hash: string;
  readonly request_payload: unknown;
  readonly actor_id: string;
  readonly actor_kind: "human";
  readonly capability_grant_id: string;
  readonly receipt_payload: unknown;
}

interface StoredWorkRow {
  readonly payload: unknown;
  readonly record_hash: string;
}

interface InputRequestRow {
  readonly input_request_id: string;
  readonly revision: string;
  readonly request_kind:
    "clarification" | "capability" | "budget" | "validation_judgment";
  readonly question: string;
  readonly response_options: unknown;
  readonly consequence: string;
  readonly state: "pending" | "answered" | "superseded";
  readonly answer: string | null;
}

interface PlanRow {
  readonly current_revision: string;
  readonly selected_priority: PetraWorkUnit["spec"]["priority"];
  readonly latest_instruction: string | null;
}

interface DeliveryRow {
  readonly interaction_run_id: string;
  readonly protocol_thread_id: string;
  readonly protocol_run_id: string;
}

interface ResultRow {
  readonly result_kind: "grounded_response" | "worker_output_manifest";
  readonly record_id: string;
  readonly revision: string;
  readonly content_hash: string;
  readonly record_hash: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const exactWorkRef = (work: PetraWorkUnit) => ({
  work_unit_id: work.work_unit_id,
  revision: work.revision,
  spec_hash: work.spec_hash,
});

const sameActor = (
  left: ProjectWorkCommandPrincipal["actor"],
  right: ProjectWorkCommandPrincipal["actor"],
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const required = <Value>(value: Value | undefined, label: string): Value => {
  if (value === undefined) {
    throw new ProjectWorkOperationError(
      "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
      `${label} is required by this Work operation.`,
    );
  }
  return value;
};

/**
 * Durable Project Work command/read composition. Lifecycle changes reuse the
 * canonical WorkUnit registry; a pending command reservation makes disconnect
 * recovery idempotent without treating delivery loss as a second instruction.
 */
export class PostgresProjectWorkOperations
  implements ProjectWorkOperationAuthority, ProjectWorkOperationsViewReader
{
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #authorizer: PostgresCommandAuthorizer;
  readonly #workUnits: PostgresWorkUnitAuthorityRepository;

  constructor(
    pool: Pool,
    authorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#authorizer = authorizer;
    this.#contracts = contracts;
    this.#workUnits = new PostgresWorkUnitAuthorityRepository(pool, contracts);
  }

  async executeProjectWorkOperation(
    projectId: string,
    request: PetraProjectWorkOperationRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<PetraProjectWorkOperationReceipt> {
    this.#contracts.assertValid(
      "project-work-operation-request",
      "1.0.0",
      request,
    );
    const replay = await this.#reserve(projectId, request, principal);
    if (replay !== undefined) return replay;

    let resultingWork: PetraWorkUnit;
    let planRevision: number | undefined;
    try {
      switch (request.operation) {
        case "start":
        case "retry":
          resultingWork = await this.#startOrRetry(request);
          break;
        case "cancel":
          resultingWork = await this.#cancel(request);
          break;
        case "answer_input":
          await this.#answerInput(projectId, request, principal);
          resultingWork = await this.#requireCurrentWork(projectId, request);
          break;
        case "steer":
        case "prioritize":
          planRevision = await this.#revisePlan(projectId, request, principal);
          resultingWork = await this.#requireCurrentWork(projectId, request);
          break;
      }
    } catch (error) {
      await this.#releaseUnappliedReservation(request).catch(() => undefined);
      throw error;
    }

    const outcomeByOperation = {
      start: "started",
      answer_input: "input_answered",
      steer: "steered",
      prioritize: "prioritized",
      cancel: "cancelled",
      retry: "retried",
    } as const;
    const summaryByOperation = {
      start: "The exact requested Work entered its first running attempt.",
      answer_input:
        "The exact pending Work input was answered once; Review and domain authority were unchanged.",
      steer:
        "The Work instruction and selected scheduling priority were recorded for the next queue or successor boundary.",
      prioritize:
        "The selected Work scheduling priority was recorded without changing prerequisites or domain authority.",
      cancel:
        "The exact Work reached its canonical cancelled outcome; retained records and independent effects remain.",
      retry:
        "The eligible failed Work entered its next recorded attempt with the exact retained input.",
    } as const;
    const base = {
      schema_name: "petra.project-work-operation-receipt" as const,
      schema_version: "1.0.0" as const,
      receipt_id: derivePetraId("project_work_receipt", request.command_id),
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      project_id: projectId,
      operation: request.operation,
      outcome: outcomeByOperation[request.operation],
      actor: clone(principal.actor),
      capability_grant_id: principal.capabilityGrantId,
      requested_work_unit_ref: clone(request.expected_work_unit_ref),
      resulting_work_unit_ref: exactWorkRef(resultingWork),
      ...(request.input_request_ref === undefined
        ? {}
        : { input_request_ref: clone(request.input_request_ref) }),
      ...(planRevision === undefined ? {} : { plan_revision: planRevision }),
      effect: {
        kind: "operational_only" as const,
        summary: summaryByOperation[request.operation],
        prior_attempts_preserved: true as const,
        domain_authority_changed: false as const,
      },
      destination: {
        place_role: "work" as const,
        work_unit_ref: exactWorkRef(resultingWork),
      },
      recorded_at: request.submitted_at,
    };
    const receipt: PetraProjectWorkOperationReceipt = {
      ...base,
      record_hash: canonicalHash(base),
    };
    this.#contracts.assertValid(
      "project-work-operation-receipt",
      "1.0.0",
      receipt,
    );
    return this.#completeReceipt(request, receipt);
  }

  async registerRequiredInput(
    input: RegisterProjectWorkRequiredInput,
  ): Promise<void> {
    if (
      input.responseOptions.length < 1 ||
      input.responseOptions.length > 20 ||
      new Set(input.responseOptions).size !== input.responseOptions.length ||
      input.responseOptions.some(
        (option) => option.length < 1 || option.length > 400,
      )
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_UNAVAILABLE",
        "A required Work input needs one through twenty distinct response options.",
      );
    }
    await this.#transaction("SERIALIZABLE", async (client) => {
      const work = await this.#work(
        client,
        input.projectId,
        input.workUnitId,
        true,
      );
      if (work === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_NOT_FOUND",
          "The required input target is not bound to this Project.",
        );
      }
      if (
        work.revision !== input.expectedWorkUnitRevision ||
        work.status.state === "completed" ||
        work.status.state === "cancelled"
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "Required input must bind the exact current non-terminal Work revision.",
        );
      }
      const existing = await client.query<{
        project_id: string;
        work_unit_id: string;
        expected_work_unit_revision: string;
        request_kind: string;
        question: string;
        response_options: unknown;
        consequence: string;
        registered_at: Date;
      }>(
        `SELECT project_id, work_unit_id, expected_work_unit_revision::text,
                request_kind, question, response_options, consequence, registered_at
           FROM petra.project_work_input_requests
          WHERE input_request_id = $1`,
        [input.inputRequestId],
      );
      const row = existing.rows[0];
      if (row !== undefined) {
        const same =
          row.project_id === input.projectId &&
          row.work_unit_id === input.workUnitId &&
          Number(row.expected_work_unit_revision) ===
            input.expectedWorkUnitRevision &&
          row.request_kind === input.kind &&
          row.question === input.question &&
          canonicalize(row.response_options) ===
            canonicalize(input.responseOptions) &&
          row.consequence === input.consequence &&
          row.registered_at.toISOString() === input.registeredAt;
        if (!same) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The required-input identity is already bound to different content.",
          );
        }
        return;
      }
      await client.query(
        `INSERT INTO petra.project_work_input_requests (
           input_request_id, revision, project_id, work_unit_id,
           expected_work_unit_revision, request_kind, question, response_options,
           consequence, state, registered_at
         ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'pending', $9::timestamptz)`,
        [
          input.inputRequestId,
          input.projectId,
          input.workUnitId,
          input.expectedWorkUnitRevision,
          input.kind,
          input.question,
          JSON.stringify(input.responseOptions),
          input.consequence,
          input.registeredAt,
        ],
      );
    });
  }

  async getProjectWorkOperationsView(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkOperationsView | undefined> {
    return this.#transaction("REPEATABLE READ READ ONLY", async (client) => {
      const readAtResult = await client.query<{ read_at: Date }>(
        "SELECT CURRENT_TIMESTAMP AS read_at",
      );
      const readAt = readAtResult.rows[0]?.read_at.toISOString();
      if (readAt === undefined)
        throw new Error("PostgreSQL omitted read time.");
      const work = await this.#work(client, projectId, workUnitId, false);
      if (work === undefined) return undefined;
      const inputManifest = await this.#inputManifest(client, work);
      const inputs = await this.#inputs(client, projectId, workUnitId);
      const pendingInputs = inputs.filter((input) => input.state === "pending");
      const plan = await this.#plan(client, work);
      const delivery = await this.#delivery(client, projectId, workUnitId);
      const results = await this.#results(client, projectId, workUnitId);
      const commandPath = `/api/commands/projects/${projectId}/work/${workUnitId}`;
      const active = [
        "requested",
        "queued",
        "running",
        "checkpointed",
      ].includes(work.status.state);
      const cancellable =
        active &&
        work.spec.cancellation_policy !== "atomic" &&
        !(
          work.spec.cancellation_policy === "checkpoint_then_cancel" &&
          work.status.state === "running"
        );
      const retryable =
        work.status.state === "completed" &&
        work.status.terminal_outcome !== "succeeded" &&
        work.status.failure.retryable &&
        work.status.attempt <
          inputManifest.content.resource_limits.max_attempts;
      const controls: PetraProjectWorkOperationsView["controls"] = [
        {
          operation: "start",
          state:
            work.status.state === "requested" && pendingInputs.length === 0
              ? "available"
              : "unavailable",
          reason:
            work.status.state === "requested" && pendingInputs.length === 0
              ? "The exact requested Work can enter its first attempt."
              : pendingInputs.length > 0
                ? "Required input must be resolved before Work starts."
                : "Only requested Work can use the direct start operation.",
          ...(work.status.state === "requested" && pendingInputs.length === 0
            ? { command_path: commandPath }
            : {}),
        },
        {
          operation: "answer_input",
          state: pendingInputs.length > 0 ? "available" : "unavailable",
          reason:
            pendingInputs.length > 0
              ? "One or more exact Work input requests are pending."
              : "No exact pending Work input is available to answer.",
          ...(pendingInputs.length > 0 ? { command_path: commandPath } : {}),
        },
        {
          operation: "steer",
          state: active ? "available" : "unavailable",
          reason: active
            ? "A clear instruction can update the next queue or successor scheduling boundary."
            : "Terminal Work cannot revise its active scheduling plan.",
          ...(active ? { command_path: commandPath } : {}),
        },
        {
          operation: "prioritize",
          state: active ? "available" : "unavailable",
          reason: active
            ? "An eligible scheduling priority can be selected without changing prerequisites."
            : "Terminal Work has no active scheduling priority to change.",
          ...(active ? { command_path: commandPath } : {}),
        },
        {
          operation: "detach",
          state: active ? "client_owned" : "unavailable",
          reason: active
            ? "Leaving the presentation does not cancel or mutate durable Work."
            : "The Work is terminal; there is no live delivery to detach from.",
        },
        {
          operation: "reconnect",
          state: delivery.state === "durable" ? "query_only" : "unavailable",
          reason:
            delivery.state === "durable"
              ? "Reconnect resolves the same durable interaction run."
              : delivery.reason,
        },
        {
          operation: "replay",
          state: delivery.state === "durable" ? "query_only" : "unavailable",
          reason:
            delivery.state === "durable"
              ? "Replay resumes recorded delivery without another execution."
              : delivery.reason,
        },
        {
          operation: "cancel",
          state: cancellable ? "available" : "unavailable",
          reason: cancellable
            ? "The current cancellation policy permits an exact operational cancellation."
            : work.spec.cancellation_policy === "atomic"
              ? "This Work is atomic and cannot be cancelled."
              : work.spec.cancellation_policy === "checkpoint_then_cancel" &&
                  work.status.state === "running"
                ? "A valid checkpoint is required before cancellation."
                : "Terminal Work cannot be cancelled again.",
          ...(cancellable ? { command_path: commandPath } : {}),
        },
        {
          operation: "retry",
          state: retryable ? "available" : "unavailable",
          reason: retryable
            ? "The failed attempt is retryable with exact retained input and remaining attempts."
            : "Retry requires a retryable terminal failure and remaining attempt capacity.",
          ...(retryable ? { command_path: commandPath } : {}),
        },
        {
          operation: "resume",
          state: "unavailable",
          reason:
            work.status.state === "checkpointed"
              ? "The checkpoint is visible, but no registered resume transition validates compatibility."
              : "No exact compatible checkpoint is available for a registered resume transition.",
        },
        {
          operation: "start_again",
          state: "unavailable",
          reason:
            "Fresh execution requires a registered workflow-specific input-rebinding command; Petra does not clone Work implicitly.",
        },
      ];
      const content = {
        project_id: projectId,
        work_unit_ref: exactWorkRef(work),
        execution_state: work.status.state,
        plan,
        required_inputs: inputs,
        delivery,
        controls,
        results,
        read_at: readAt,
      };
      const view: PetraProjectWorkOperationsView = {
        schema_name: "petra.project-work-operations-view",
        schema_version: "1.0.0",
        ...content,
        content_hash: canonicalHash(content),
      };
      this.#contracts.assertValid(
        "project-work-operations-view",
        "1.0.0",
        view,
      );
      return view;
    });
  }

  async #reserve(
    projectId: string,
    request: PetraProjectWorkOperationRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<PetraProjectWorkOperationReceipt | undefined> {
    return this.#transaction("SERIALIZABLE", async (client) => {
      const requestHash = canonicalHash(request);
      const existing = await client.query<StoredReceiptRow>(
        `SELECT state, request_hash, request_payload, actor_id, actor_kind,
                capability_grant_id, receipt_payload
           FROM petra.project_work_operation_receipts
          WHERE command_id = $1 OR idempotency_key = $2
          ORDER BY command_id
          FOR UPDATE`,
        [request.command_id, request.idempotency_key],
      );
      if (existing.rows.length > 0) {
        if (existing.rows.length !== 1) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The Work command identity and idempotency key identify different operations.",
          );
        }
        const row = existing.rows[0]!;
        if (
          row.request_hash !== requestHash ||
          canonicalize(row.request_payload) !== canonicalize(request) ||
          !sameActor(
            { actor_id: row.actor_id, actor_kind: row.actor_kind },
            principal.actor,
          ) ||
          row.capability_grant_id !== principal.capabilityGrantId
        ) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The Work command identity or idempotency key is bound to different input or authority.",
          );
        }
        if (row.state === "completed") {
          this.#contracts.assertValid(
            "project-work-operation-receipt",
            "1.0.0",
            row.receipt_payload,
          );
          return clone(row.receipt_payload) as PetraProjectWorkOperationReceipt;
        }
        return undefined;
      }

      const pending = await client.query(
        `SELECT 1 FROM petra.project_work_operation_receipts
          WHERE project_id = $1 AND work_unit_id = $2 AND state = 'pending'
          FOR UPDATE`,
        [projectId, request.expected_work_unit_ref.work_unit_id],
      );
      if ((pending.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "Another Work operation has an unresolved delivery effect; reconcile it before a new command.",
        );
      }
      const work = await this.#work(
        client,
        projectId,
        request.expected_work_unit_ref.work_unit_id,
        true,
      );
      if (work === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_NOT_FOUND",
          "The requested WorkUnit is not bound to this Project.",
        );
      }
      if (
        work.revision !== request.expected_work_unit_ref.revision ||
        work.spec_hash !== request.expected_work_unit_ref.spec_hash
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "The Work command must name the exact current Work revision and specification.",
        );
      }
      if (
        !(await this.#authorizer.authorize(
          {
            actor: principal.actor,
            capabilityGrantId: principal.capabilityGrantId,
            commandName: "ManageProjectWork",
            projectId,
          },
          client,
        ))
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_NOT_AUTHORIZED",
          "The authenticated actor has no active exact Project Work grant.",
        );
      }
      await this.#assertEligible(client, request, work);
      await client.query(
        `INSERT INTO petra.project_work_operation_receipts (
           receipt_id, command_id, idempotency_key, project_id, work_unit_id,
           operation, request_hash, request_payload, actor_id, actor_kind,
           capability_grant_id, state, recorded_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11,
                   'pending', $12::timestamptz)`,
        [
          derivePetraId("project_work_receipt", request.command_id),
          request.command_id,
          request.idempotency_key,
          projectId,
          request.expected_work_unit_ref.work_unit_id,
          request.operation,
          requestHash,
          JSON.stringify(request),
          principal.actor.actor_id,
          principal.actor.actor_kind,
          principal.capabilityGrantId,
          request.submitted_at,
        ],
      );
      return undefined;
    });
  }

  async #assertEligible(
    client: PoolClient,
    request: PetraProjectWorkOperationRequest,
    work: PetraWorkUnit,
  ): Promise<void> {
    const pendingInputs = await client.query(
      `SELECT 1 FROM petra.project_work_input_requests
        WHERE project_id = $1 AND work_unit_id = $2 AND state = 'pending'
        LIMIT 1`,
      [work.project_id, work.work_unit_id],
    );
    if (request.operation === "start") {
      if (
        work.status.state !== "requested" ||
        (pendingInputs.rowCount ?? 0) > 0
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "Start requires exact requested Work with no pending required input.",
        );
      }
      return;
    }
    if (request.operation === "retry") {
      const input = await this.#inputManifest(client, work);
      if (
        work.status.state !== "completed" ||
        work.status.terminal_outcome === "succeeded" ||
        !work.status.failure.retryable ||
        work.status.attempt >= input.content.resource_limits.max_attempts ||
        (pendingInputs.rowCount ?? 0) > 0
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "Retry requires an exact retryable failure, retained input, no pending input, and remaining attempts.",
        );
      }
      return;
    }
    if (request.operation === "cancel") {
      if (
        work.status.state === "completed" ||
        work.status.state === "cancelled" ||
        work.spec.cancellation_policy === "atomic" ||
        (work.spec.cancellation_policy === "checkpoint_then_cancel" &&
          work.status.state === "running")
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "The exact Work state and cancellation policy do not permit cancellation.",
        );
      }
      return;
    }
    if (request.operation === "answer_input") {
      const ref = required(request.input_request_ref, "input_request_ref");
      const input = await client.query<{
        revision: string;
        state: string;
        expected_work_unit_revision: string;
        response_options: unknown;
      }>(
        `SELECT revision::text, state, expected_work_unit_revision::text,
                response_options
           FROM petra.project_work_input_requests
          WHERE project_id = $1 AND work_unit_id = $2 AND input_request_id = $3
          FOR UPDATE`,
        [work.project_id, work.work_unit_id, ref.input_request_id],
      );
      const row = input.rows[0];
      if (
        row === undefined ||
        Number(row.revision) !== ref.revision ||
        row.state !== "pending" ||
        Number(row.expected_work_unit_revision) !== work.revision ||
        !Array.isArray(row.response_options) ||
        !row.response_options.includes(request.response)
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "Required input is missing, already resolved, bound to another Work revision, or answered outside its registered options.",
        );
      }
      return;
    }
    if (
      work.status.state === "completed" ||
      work.status.state === "cancelled"
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_UNAVAILABLE",
        "Terminal Work cannot be steered or reprioritized.",
      );
    }
    const plan = await client.query<{ current_revision: string }>(
      `SELECT current_revision::text FROM petra.project_work_plan_heads
        WHERE work_unit_id = $1 FOR UPDATE`,
      [work.work_unit_id],
    );
    const currentRevision = Number(plan.rows[0]?.current_revision ?? 0);
    if (request.expected_plan_revision !== currentRevision) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STALE",
        "The Work plan changed before this instruction was applied.",
      );
    }
  }

  async #startOrRetry(
    request: PetraProjectWorkOperationRequest,
  ): Promise<PetraWorkUnit> {
    const expected = request.expected_work_unit_ref;
    let current = await this.#workUnits.getWorkUnit(expected.work_unit_id);
    if (current === undefined) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_NOT_FOUND",
        "The reserved Work operation lost its WorkUnit.",
      );
    }
    const initialAttempt =
      request.operation === "retry" &&
      current.revision === expected.revision &&
      current.status.state === "completed"
        ? current.status.attempt
        : request.operation === "retry" &&
            current.status.state === "queued" &&
            current.revision === expected.revision + 1
          ? await this.#attemptAtRevision(
              expected.work_unit_id,
              expected.revision,
            )
          : request.operation === "retry" &&
              current.status.state === "running" &&
              current.revision === expected.revision + 2
            ? current.status.attempt - 1
            : 0;
    if (current.revision === expected.revision) {
      current = await this.#workUnits.queue(
        expected.work_unit_id,
        expected.revision,
        request.submitted_at,
      );
    }
    if (
      current.revision === expected.revision + 1 &&
      current.status.state === "queued" &&
      current.updated_at === request.submitted_at
    ) {
      current = await this.#workUnits.start(
        expected.work_unit_id,
        current.revision,
        initialAttempt + 1,
        request.submitted_at,
      );
    }
    if (
      current.revision !== expected.revision + 2 ||
      current.status.state !== "running" ||
      current.status.started_at !== request.submitted_at
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STALE",
        "The reserved start or retry could not reconcile its exact Work effect.",
      );
    }
    return current;
  }

  async #attemptAtRevision(
    workUnitId: string,
    revision: number,
  ): Promise<number> {
    const prior = await this.#workUnits.getWorkUnitRevision(
      workUnitId,
      revision,
    );
    if (
      prior?.status.state !== "completed" ||
      prior.status.terminal_outcome === "succeeded"
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "The retry reservation lost its exact failed attempt.",
      );
    }
    return prior.status.attempt;
  }

  async #cancel(
    request: PetraProjectWorkOperationRequest,
  ): Promise<PetraWorkUnit> {
    const expected = request.expected_work_unit_ref;
    let current = await this.#workUnits.getWorkUnit(expected.work_unit_id);
    if (current?.revision === expected.revision) {
      current = await this.#workUnits.cancel(
        expected.work_unit_id,
        expected.revision,
        required(request.reason, "reason"),
        request.submitted_at,
      );
    }
    if (
      current?.revision !== expected.revision + 1 ||
      current.status.state !== "cancelled" ||
      current.status.cancelled_at !== request.submitted_at ||
      current.status.reason !== request.reason
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STALE",
        "The reserved cancellation could not reconcile its exact Work effect.",
      );
    }
    return current;
  }

  async #answerInput(
    projectId: string,
    request: PetraProjectWorkOperationRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<void> {
    const ref = required(request.input_request_ref, "input_request_ref");
    await this.#transaction("SERIALIZABLE", async (client) => {
      const existing = await client.query<{ response: string }>(
        `SELECT response FROM petra.project_work_input_responses
          WHERE command_id = $1`,
        [request.command_id],
      );
      if (existing.rows[0] !== undefined) {
        if (existing.rows[0].response !== request.response) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The input-response command is already bound to another answer.",
          );
        }
        return;
      }
      const updated = await client.query(
        `UPDATE petra.project_work_input_requests
            SET state = 'answered', answered_at = $1::timestamptz,
                answer_command_id = $2
          WHERE input_request_id = $3 AND revision = $4 AND project_id = $5
            AND work_unit_id = $6 AND state = 'pending'
            AND expected_work_unit_revision = $7`,
        [
          request.submitted_at,
          request.command_id,
          ref.input_request_id,
          ref.revision,
          projectId,
          request.expected_work_unit_ref.work_unit_id,
          request.expected_work_unit_ref.revision,
        ],
      );
      if (updated.rowCount !== 1) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "The required input was resolved or superseded before this answer committed.",
        );
      }
      await client.query(
        `INSERT INTO petra.project_work_input_responses (
           input_request_id, input_request_revision, command_id, response,
           actor_id, actor_kind, recorded_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
        [
          ref.input_request_id,
          ref.revision,
          request.command_id,
          required(request.response, "response"),
          principal.actor.actor_id,
          principal.actor.actor_kind,
          request.submitted_at,
        ],
      );
    });
  }

  async #revisePlan(
    projectId: string,
    request: PetraProjectWorkOperationRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<number> {
    return this.#transaction("SERIALIZABLE", async (client) => {
      const existing = await client.query<{ revision: string }>(
        `SELECT revision::text FROM petra.project_work_plan_revisions
          WHERE command_id = $1`,
        [request.command_id],
      );
      if (existing.rows[0] !== undefined) {
        return Number(existing.rows[0].revision);
      }
      const head = await client.query<PlanRow>(
        `SELECT current_revision::text, selected_priority, latest_instruction
           FROM petra.project_work_plan_heads
          WHERE work_unit_id = $1 FOR UPDATE`,
        [request.expected_work_unit_ref.work_unit_id],
      );
      const expectedRevision = required(
        request.expected_plan_revision,
        "expected_plan_revision",
      );
      const currentRevision = Number(head.rows[0]?.current_revision ?? 0);
      if (currentRevision !== expectedRevision) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "The Work plan changed before this instruction committed.",
        );
      }
      const revision = currentRevision + 1;
      const priority = required(request.priority, "priority");
      const instruction =
        request.operation === "steer"
          ? required(request.instruction, "instruction")
          : null;
      await client.query(
        `INSERT INTO petra.project_work_plan_revisions (
           work_unit_id, revision, project_id, command_id, operation,
           selected_priority, instruction, actor_id, actor_kind, recorded_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz)`,
        [
          request.expected_work_unit_ref.work_unit_id,
          revision,
          projectId,
          request.command_id,
          request.operation,
          priority,
          instruction,
          principal.actor.actor_id,
          principal.actor.actor_kind,
          request.submitted_at,
        ],
      );
      if (currentRevision === 0) {
        await client.query(
          `INSERT INTO petra.project_work_plan_heads (
             work_unit_id, project_id, current_revision, selected_priority,
             latest_instruction, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
          [
            request.expected_work_unit_ref.work_unit_id,
            projectId,
            revision,
            priority,
            instruction,
            request.submitted_at,
          ],
        );
      } else {
        await client.query(
          `UPDATE petra.project_work_plan_heads
              SET current_revision = $2, selected_priority = $3,
                  latest_instruction = COALESCE($4, latest_instruction),
                  updated_at = $5::timestamptz
            WHERE work_unit_id = $1 AND current_revision = $6`,
          [
            request.expected_work_unit_ref.work_unit_id,
            revision,
            priority,
            instruction,
            request.submitted_at,
            currentRevision,
          ],
        );
      }
      return revision;
    });
  }

  async #requireCurrentWork(
    projectId: string,
    request: PetraProjectWorkOperationRequest,
  ): Promise<PetraWorkUnit> {
    const work = await this.#workUnits.getWorkUnit(
      request.expected_work_unit_ref.work_unit_id,
    );
    if (work === undefined || work.project_id !== projectId) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_NOT_FOUND",
        "The reserved Work operation lost its Project WorkUnit.",
      );
    }
    return work;
  }

  async #releaseUnappliedReservation(
    request: PetraProjectWorkOperationRequest,
  ): Promise<void> {
    if (request.operation === "answer_input") {
      const effect = await this.#pool.query(
        `SELECT 1 FROM petra.project_work_input_responses
          WHERE command_id = $1`,
        [request.command_id],
      );
      if ((effect.rowCount ?? 0) > 0) return;
    }
    if (request.operation === "steer" || request.operation === "prioritize") {
      const effect = await this.#pool.query(
        `SELECT 1 FROM petra.project_work_plan_revisions
          WHERE command_id = $1`,
        [request.command_id],
      );
      if ((effect.rowCount ?? 0) > 0) return;
    }
    const current = await this.#workUnits.getWorkUnit(
      request.expected_work_unit_ref.work_unit_id,
    );
    if (
      current?.revision !== request.expected_work_unit_ref.revision ||
      current.spec_hash !== request.expected_work_unit_ref.spec_hash
    ) {
      return;
    }
    await this.#pool.query(
      `DELETE FROM petra.project_work_operation_receipts
        WHERE command_id = $1 AND state = 'pending'`,
      [request.command_id],
    );
  }

  async #completeReceipt(
    request: PetraProjectWorkOperationRequest,
    receipt: PetraProjectWorkOperationReceipt,
  ): Promise<PetraProjectWorkOperationReceipt> {
    return this.#transaction("SERIALIZABLE", async (client) => {
      const row = await client.query<StoredReceiptRow>(
        `SELECT state, request_hash, request_payload, actor_id, actor_kind,
                capability_grant_id, receipt_payload
           FROM petra.project_work_operation_receipts
          WHERE command_id = $1 FOR UPDATE`,
        [request.command_id],
      );
      const existing = row.rows[0];
      if (existing === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
          "The Work operation lost its command reservation.",
        );
      }
      if (existing.state === "completed") {
        this.#contracts.assertValid(
          "project-work-operation-receipt",
          "1.0.0",
          existing.receipt_payload,
        );
        return clone(
          existing.receipt_payload,
        ) as PetraProjectWorkOperationReceipt;
      }
      await client.query(
        `UPDATE petra.project_work_operation_receipts
            SET state = 'completed', receipt_payload = $2::jsonb,
                completed_at = $3::timestamptz
          WHERE command_id = $1 AND state = 'pending'`,
        [request.command_id, JSON.stringify(receipt), request.submitted_at],
      );
      return clone(receipt);
    });
  }

  async #work(
    client: PoolClient,
    projectId: string,
    workUnitId: string,
    lock: boolean,
  ): Promise<PetraWorkUnit | undefined> {
    const result = await client.query<StoredWorkRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.work_units AS head
         JOIN petra.work_unit_revisions AS revision
           ON revision.work_unit_id = head.work_unit_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1 AND head.work_unit_id = $2
        ${lock ? "FOR UPDATE OF head" : ""}`,
      [projectId, workUnitId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    this.#contracts.assertValid("work-unit", "1.0.0", row.payload);
    const work = row.payload as PetraWorkUnit;
    if (canonicalHash(work) !== row.record_hash) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "The stored WorkUnit record hash is invalid.",
      );
    }
    return clone(work);
  }

  async #inputManifest(
    client: PoolClient,
    work: PetraWorkUnit,
  ): Promise<PetraWorkerInputManifest> {
    const result = await client.query<StoredWorkRow>(
      `SELECT payload, record_hash FROM petra.worker_input_manifests
        WHERE project_id = $1 AND work_unit_id = $2
          AND worker_input_manifest_id = $3`,
      [
        work.project_id,
        work.work_unit_id,
        work.spec.input_manifest_ref.worker_input_manifest_id,
      ],
    );
    const row = result.rows[0];
    this.#contracts.assertValid("worker-input-manifest", "1.0.0", row?.payload);
    const input = row?.payload as PetraWorkerInputManifest;
    if (
      canonicalHash(input) !== row?.record_hash ||
      input.content_hash !== work.spec.input_manifest_ref.content_hash
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "The stored Work input manifest is invalid.",
      );
    }
    return clone(input);
  }

  async #inputs(
    client: PoolClient,
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkOperationsView["required_inputs"]> {
    const result = await client.query<InputRequestRow>(
      `SELECT request.input_request_id, request.revision::text,
              request.request_kind, request.question, request.response_options,
              request.consequence, request.state, response.response AS answer
         FROM petra.project_work_input_requests AS request
         LEFT JOIN petra.project_work_input_responses AS response
           ON response.command_id = request.answer_command_id
        WHERE request.project_id = $1 AND request.work_unit_id = $2
        ORDER BY request.registered_at, request.input_request_id`,
      [projectId, workUnitId],
    );
    return result.rows.map((row) => ({
      input_request_ref: {
        input_request_id: row.input_request_id,
        revision: Number(row.revision),
      },
      kind: row.request_kind,
      question: row.question,
      response_options: clone(
        row.response_options,
      ) as PetraProjectWorkOperationsView["required_inputs"][number]["response_options"],
      state: row.state,
      ...(row.answer === null ? {} : { answer: row.answer }),
      consequence: row.consequence,
    }));
  }

  async #plan(
    client: PoolClient,
    work: PetraWorkUnit,
  ): Promise<PetraProjectWorkOperationsView["plan"]> {
    const result = await client.query<PlanRow>(
      `SELECT current_revision::text, selected_priority, latest_instruction
         FROM petra.project_work_plan_heads WHERE work_unit_id = $1`,
      [work.work_unit_id],
    );
    const row = result.rows[0];
    return {
      revision: Number(row?.current_revision ?? 0),
      selected_priority: row?.selected_priority ?? work.spec.priority,
      ...(row?.latest_instruction === null ||
      row?.latest_instruction === undefined
        ? {}
        : { latest_instruction: row.latest_instruction }),
      effect_boundary: "next_queue_or_successor_schedule",
    };
  }

  async #delivery(
    client: PoolClient,
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkOperationsView["delivery"]> {
    const result = await client.query<DeliveryRow>(
      `SELECT interaction_run_id, protocol_thread_id, protocol_run_id
         FROM petra.interaction_runs
        WHERE project_id = $1 AND work_unit_id = $2
        ORDER BY created_at DESC, interaction_run_id
        LIMIT 1`,
      [projectId, workUnitId],
    );
    if (result.rows.length === 0) {
      return {
        state: "unavailable",
        reason:
          "This WorkUnit has no registered durable interaction run; its Work read remains available independently.",
      };
    }
    const row = result.rows[0]!;
    return {
      state: "durable",
      interaction_run_id: row.interaction_run_id,
      protocol_thread_id: row.protocol_thread_id,
      protocol_run_id: row.protocol_run_id,
      reconnect_path: `/api/queries/interactions/${encodeURIComponent(row.protocol_run_id)}?thread=${encodeURIComponent(row.protocol_thread_id)}`,
      replay_path: `/api/interactions/${encodeURIComponent(row.protocol_run_id)}?thread=${encodeURIComponent(row.protocol_thread_id)}&after=0`,
    };
  }

  async #results(
    client: PoolClient,
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkOperationsView["results"]> {
    const result = await client.query<ResultRow>(
      `SELECT 'grounded_response'::text AS result_kind,
              revision.grounded_response_id AS record_id,
              revision.revision::text, revision.content_hash,
              revision.record_hash
         FROM petra.grounded_responses AS head
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = head.grounded_response_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1 AND head.work_unit_id = $2
       UNION ALL
       SELECT 'worker_output_manifest'::text AS result_kind,
              worker_output_manifest_id AS record_id, revision::text,
              content_hash, record_hash
         FROM petra.worker_output_manifests
        WHERE project_id = $1 AND work_unit_id = $2
        ORDER BY result_kind, record_id`,
      [projectId, workUnitId],
    );
    return result.rows.map((row) => ({
      result_kind: row.result_kind,
      record_ref: {
        semantic_key:
          row.result_kind === "grounded_response"
            ? "petra.grounded-response"
            : "petra.worker-output-manifest",
        record_id: row.record_id,
        revision: Number(row.revision),
        content_hash: row.content_hash,
        record_hash: row.record_hash,
      },
      destination:
        row.result_kind === "grounded_response"
          ? {
              state: "available" as const,
              place_role: "petra" as const,
              target_ref: {
                semantic_key: "petra.grounded-response",
                object_id: row.record_id,
                revision: Number(row.revision),
              },
            }
          : {
              state: "available" as const,
              place_role: "work" as const,
              target_ref: {
                semantic_key: "petra.worker-output-manifest",
                object_id: row.record_id,
                revision: Number(row.revision),
              },
            },
    }));
  }

  async #transaction<Value>(
    isolation: "SERIALIZABLE" | "REPEATABLE READ READ ONLY",
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      const value = await operation(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
