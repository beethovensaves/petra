import { createHash } from "node:crypto";

import type {
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkResumeRequest,
  PetraProjectWorkStartAgainReceipt,
  PetraProjectWorkStartAgainRequest,
  PetraWorkerInputManifest,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  ProjectWorkOperationError,
  type ProjectWorkCommandPrincipal,
  type ProjectWorkCheckpointResumeRegistry,
  type ProjectWorkOperationAuthority,
  type ProjectWorkOperationsViewReader,
  type ProjectWorkResumeAuthority,
  type ProjectWorkStartAgainAuthority,
  type ProjectWorkStartAgainRegistry,
  type RegisterProjectWorkCheckpointResume,
  type RegisterProjectWorkRequiredInput,
  type RegisterProjectWorkStagePlan,
  type RegisterProjectWorkStartAgain,
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

interface StagePlanRow {
  readonly content_hash: string;
  readonly plan_payload: unknown;
}

interface StoredResumeRegistrationRow {
  readonly resume_registration_id: string;
  readonly content_hash: string;
  readonly payload: unknown;
}

interface StoredResumeReceiptRow extends StoredReceiptRow {
  readonly resume_registration_id: string;
}

interface StoredResumeRegistration {
  readonly resume_registration_id: string;
  readonly project_id: string;
  readonly work_unit_ref: {
    readonly work_unit_id: string;
    readonly revision: number;
    readonly spec_hash: string;
  };
  readonly input_manifest_ref: {
    readonly worker_input_manifest_id: string;
    readonly content_hash: string;
  };
  readonly checkpoint: Extract<
    PetraWorkUnit["status"],
    { state: "checkpointed" }
  >["checkpoint"];
  readonly workflow: {
    readonly workflow_name: string;
    readonly workflow_version: string;
  };
  readonly attempt: number;
  readonly compatibility: {
    readonly boundary: "same_work_spec_input_workflow_and_capability";
    readonly preserves_work_identity: true;
    readonly preserves_attempt: true;
    readonly domain_authority_changed: false;
  };
  readonly registered_by: {
    readonly actor_id: string;
    readonly actor_kind: "service";
  };
  readonly registered_at: string;
}

interface ResolvedResumeRegistration {
  readonly payload: StoredResumeRegistration;
  readonly contentHash: string;
}

interface StoredResumeTransitionRow {
  readonly record_hash: string;
  readonly transition_payload: unknown;
}

interface StoredStartAgainRegistrationRow {
  readonly start_again_registration_id: string;
  readonly content_hash: string;
  readonly payload: unknown;
}

interface StoredStartAgainReceiptRow extends StoredReceiptRow {
  readonly start_again_registration_id: string;
}

interface StoredStartAgainRegistration {
  readonly start_again_registration_id: string;
  readonly project_id: string;
  readonly prior_work_unit_ref: {
    readonly work_unit_id: string;
    readonly revision: number;
    readonly spec_hash: string;
  };
  readonly prior_input_manifest_ref: PetraWorkUnit["spec"]["input_manifest_ref"];
  readonly prior_work_attempt: number;
  readonly prior_lineage_attempt: number;
  readonly fresh_work_unit_ref: {
    readonly work_unit_id: string;
    readonly revision: number;
    readonly spec_hash: string;
  };
  readonly fresh_input_manifest_ref: PetraWorkUnit["spec"]["input_manifest_ref"];
  readonly new_lineage_attempt: number;
  readonly workflow: {
    readonly workflow_name: string;
    readonly workflow_version: string;
    readonly task_family: string;
    readonly task_name: string;
    readonly task_version: string;
  };
  readonly input_transition: {
    readonly strategy: "fresh_input";
    readonly retained_output_reuse: "none";
    readonly summary: string;
  };
  readonly registered_by: {
    readonly actor_id: string;
    readonly actor_kind: "service";
  };
  readonly registered_at: string;
}

interface ResolvedStartAgainRegistration {
  readonly payload: StoredStartAgainRegistration;
  readonly contentHash: string;
}

interface StoredStartAgainTransitionRow {
  readonly record_hash: string;
  readonly transition_payload: unknown;
}

interface StoredStagePlan {
  readonly stage_plan_id: string;
  readonly revision: 1;
  readonly project_id: string;
  readonly work_unit_id: string;
  readonly work_unit_spec_hash: string;
  readonly workflow: {
    readonly workflow_name: string;
    readonly workflow_version: string;
    readonly task_family: string;
    readonly task_name: string;
    readonly task_version: string;
  };
  readonly stages: readonly {
    readonly stage_id: string;
    readonly label: string;
    readonly purpose: string;
    readonly boundary: "required_input" | "execution" | "completion";
    readonly prerequisite_stage_ids: readonly string[];
    readonly accountable_role: string;
    readonly input: string;
    readonly output: string;
  }[];
  readonly registered_at: string;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const STAGE_PLAN_ID = /^work_stage_plan_[0-9A-HJKMNP-TV-Z]{26}$/u;
const RESUME_REGISTRATION_ID =
  /^work_resume_registration_[0-9A-HJKMNP-TV-Z]{26}$/u;
const START_AGAIN_REGISTRATION_ID =
  /^work_start_again_registration_[0-9A-HJKMNP-TV-Z]{26}$/u;
const STAGE_ID = /^[a-z][a-z0-9_-]{0,79}$/u;
const CONTENT_HASH = /^sha256:[0-9a-f]{64}$/u;

const validDateTime = (value: string): boolean => {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
};

const validText = (value: string, maximum: number): boolean =>
  value.length >= 1 && value.length <= maximum;

const assertStagePlanRegistration = (
  input: RegisterProjectWorkStagePlan,
): void => {
  if (
    !STAGE_PLAN_ID.test(input.stagePlanId) ||
    !CONTENT_HASH.test(input.expectedWorkUnitSpecHash) ||
    !validDateTime(input.registeredAt) ||
    input.stages.length < 2 ||
    input.stages.length > 20
  ) {
    throw new ProjectWorkOperationError(
      "PROJECT_WORK_OPERATION_UNAVAILABLE",
      "A Work stage plan requires an exact plan identity, Work specification, registration time, and two through twenty stages.",
    );
  }
  const seen = new Set<string>();
  const boundaryOrder = { required_input: 0, execution: 1, completion: 2 };
  let priorBoundary = 0;
  let executionStages = 0;
  let requiredInputStages = 0;
  for (const stage of input.stages) {
    const prerequisites = new Set(stage.prerequisiteStageIds);
    if (
      !STAGE_ID.test(stage.stageId) ||
      seen.has(stage.stageId) ||
      !validText(stage.label, 120) ||
      !validText(stage.purpose, 1000) ||
      !validText(stage.accountableRole, 120) ||
      !validText(stage.input, 1000) ||
      !validText(stage.output, 1000) ||
      stage.prerequisiteStageIds.length > 20 ||
      prerequisites.size !== stage.prerequisiteStageIds.length ||
      stage.prerequisiteStageIds.some((stageId) => !seen.has(stageId)) ||
      boundaryOrder[stage.boundary] < priorBoundary
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_UNAVAILABLE",
        "Work stages require unique stable identities, bounded meaningful text, prior-stage prerequisites, and ordered input, execution, then completion boundaries.",
      );
    }
    seen.add(stage.stageId);
    priorBoundary = boundaryOrder[stage.boundary];
    if (stage.boundary === "execution") executionStages += 1;
    if (stage.boundary === "required_input") requiredInputStages += 1;
  }
  if (executionStages !== 1 || requiredInputStages > 1) {
    throw new ProjectWorkOperationError(
      "PROJECT_WORK_OPERATION_UNAVAILABLE",
      "A Work stage plan requires exactly one canonical execution boundary and at most one required-input boundary.",
    );
  }
};

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
  implements
    ProjectWorkOperationAuthority,
    ProjectWorkOperationsViewReader,
    ProjectWorkResumeAuthority,
    ProjectWorkCheckpointResumeRegistry,
    ProjectWorkStartAgainAuthority,
    ProjectWorkStartAgainRegistry
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

  async executeProjectWorkResume(
    projectId: string,
    request: PetraProjectWorkResumeRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<PetraProjectWorkResumeReceipt> {
    this.#contracts.assertValid(
      "project-work-resume-request",
      "1.0.0",
      request,
    );
    const reservation = await this.#reserveResume(
      projectId,
      request,
      principal,
    );
    if ("schema_name" in reservation) return reservation;

    let resultingWork: PetraWorkUnit;
    try {
      resultingWork = await this.#resume(request);
    } catch (error) {
      await this.#releaseUnappliedResumeReservation(request).catch(
        () => undefined,
      );
      throw error;
    }
    if (resultingWork.status.state !== "running") {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "A registered checkpoint resume did not produce running Work.",
      );
    }
    const base = {
      schema_name: "petra.project-work-resume-receipt" as const,
      schema_version: "1.0.0" as const,
      receipt_id: derivePetraId(
        "project_work_resume_receipt",
        request.command_id,
      ),
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      project_id: projectId,
      outcome: "resumed" as const,
      actor: clone(principal.actor),
      capability_grant_id: principal.capabilityGrantId,
      requested_work_unit_ref: clone(request.expected_work_unit_ref),
      checkpoint: clone(request.expected_checkpoint),
      resume_registration: {
        resume_registration_id: reservation.payload.resume_registration_id,
        content_hash: reservation.contentHash,
      },
      resumed_attempt: resultingWork.status.attempt,
      resulting_work_unit_ref: exactWorkRef(resultingWork),
      effect: {
        kind: "operational_only" as const,
        summary:
          "The exact checkpointed Work continued through its registered compatible transition.",
        prior_attempts_preserved: true as const,
        checkpoint_preserved: true as const,
        domain_authority_changed: false as const,
      },
      destination: {
        place_role: "work" as const,
        work_unit_ref: exactWorkRef(resultingWork),
      },
      recorded_at: request.submitted_at,
    };
    const receipt: PetraProjectWorkResumeReceipt = {
      ...base,
      record_hash: canonicalHash(base),
    };
    this.#contracts.assertValid(
      "project-work-resume-receipt",
      "1.0.0",
      receipt,
    );
    return this.#completeResumeReceipt(
      request,
      receipt,
      reservation.payload,
      reservation.contentHash,
    );
  }

  async registerCheckpointResume(
    input: RegisterProjectWorkCheckpointResume,
  ): Promise<void> {
    if (
      !RESUME_REGISTRATION_ID.test(input.resumeRegistrationId) ||
      !CONTENT_HASH.test(input.workUnitRef.spec_hash) ||
      !CONTENT_HASH.test(input.checkpoint.content_hash) ||
      !validDateTime(input.checkpoint.recorded_at) ||
      !validDateTime(input.registeredAt) ||
      Date.parse(input.registeredAt) < Date.parse(input.checkpoint.recorded_at)
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_UNAVAILABLE",
        "Checkpoint resume registration requires exact canonical Work, checkpoint, and registration identities and ordered times.",
      );
    }
    await this.#transaction("SERIALIZABLE", async (client) => {
      const work = await this.#work(
        client,
        input.projectId,
        input.workUnitRef.work_unit_id,
        true,
      );
      if (work === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_NOT_FOUND",
          "The checkpoint resume target is not bound to this Project.",
        );
      }
      if (
        work.revision !== input.workUnitRef.revision ||
        work.spec_hash !== input.workUnitRef.spec_hash ||
        work.status.state !== "checkpointed" ||
        canonicalize(work.status.checkpoint) !==
          canonicalize(input.checkpoint) ||
        work.spec.checkpoint_policy === "disabled" ||
        work.created_by.actor_kind !== "service" ||
        work.created_by.actor_id !== input.registeredBy.actor_id
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "Resume compatibility must be registered by the owning service for the exact current retained checkpoint and immutable Work specification.",
        );
      }
      const artifact = await client.query(
        `SELECT 1 FROM petra.artifacts
          WHERE artifact_id = $1 AND content_hash = $2`,
        [input.checkpoint.artifact_id, input.checkpoint.content_hash],
      );
      if ((artifact.rowCount ?? 0) !== 1) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "The checkpoint bytes are not retained under the exact registered Artifact identity.",
        );
      }
      const payload: StoredResumeRegistration = {
        resume_registration_id: input.resumeRegistrationId,
        project_id: input.projectId,
        work_unit_ref: clone(input.workUnitRef),
        input_manifest_ref: clone(work.spec.input_manifest_ref),
        checkpoint: clone(input.checkpoint),
        workflow: {
          workflow_name: work.spec.workflow_name,
          workflow_version: work.spec.workflow_version,
        },
        attempt: work.status.attempt,
        compatibility: {
          boundary: "same_work_spec_input_workflow_and_capability",
          preserves_work_identity: true,
          preserves_attempt: true,
          domain_authority_changed: false,
        },
        registered_by: clone(input.registeredBy),
        registered_at: input.registeredAt,
      };
      const contentHash = canonicalHash(payload);
      const existing = await client.query<StoredResumeRegistrationRow>(
        `SELECT resume_registration_id, content_hash, payload
           FROM petra.project_work_resume_registrations
          WHERE resume_registration_id = $1
             OR (work_unit_id = $2 AND source_work_unit_revision = $3)
          ORDER BY resume_registration_id
          FOR UPDATE`,
        [
          input.resumeRegistrationId,
          input.workUnitRef.work_unit_id,
          input.workUnitRef.revision,
        ],
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (
          existing.rows.length === 1 &&
          row !== undefined &&
          row.resume_registration_id === input.resumeRegistrationId &&
          row.content_hash === contentHash &&
          canonicalize(row.payload) === canonicalize(payload)
        ) {
          return;
        }
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "The resume registration identity or checkpoint revision is already bound to different compatibility input.",
        );
      }
      await client.query(
        `INSERT INTO petra.project_work_resume_registrations (
           resume_registration_id, project_id, work_unit_id,
           source_work_unit_revision, work_unit_spec_hash, input_manifest_id,
           input_manifest_hash, checkpoint_artifact_id,
           checkpoint_content_hash, checkpoint_recorded_at, workflow_name,
           workflow_version, attempt, registered_by_actor_id,
           registered_by_actor_kind, registered_at, content_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz,
           $11, $12, $13, $14, $15, $16::timestamptz, $17, $18::jsonb
         )`,
        [
          payload.resume_registration_id,
          payload.project_id,
          payload.work_unit_ref.work_unit_id,
          payload.work_unit_ref.revision,
          payload.work_unit_ref.spec_hash,
          payload.input_manifest_ref.worker_input_manifest_id,
          payload.input_manifest_ref.content_hash,
          payload.checkpoint.artifact_id,
          payload.checkpoint.content_hash,
          payload.checkpoint.recorded_at,
          payload.workflow.workflow_name,
          payload.workflow.workflow_version,
          payload.attempt,
          payload.registered_by.actor_id,
          payload.registered_by.actor_kind,
          payload.registered_at,
          contentHash,
          JSON.stringify(payload),
        ],
      );
    });
  }

  async executeProjectWorkStartAgain(
    projectId: string,
    request: PetraProjectWorkStartAgainRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<PetraProjectWorkStartAgainReceipt> {
    this.#contracts.assertValid(
      "project-work-start-again-request",
      "1.0.0",
      request,
    );
    const reservation = await this.#reserveStartAgain(
      projectId,
      request,
      principal,
    );
    if ("schema_name" in reservation) return reservation;

    let resultingWork: PetraWorkUnit;
    try {
      resultingWork = await this.#startAgain(request, reservation.payload);
    } catch (error) {
      await this.#releaseUnappliedStartAgainReservation(request).catch(
        () => undefined,
      );
      throw error;
    }
    if (
      resultingWork.status.state !== "running" ||
      resultingWork.status.attempt !== 1
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "A registered Start again transition did not produce the first running attempt of fresh Work.",
      );
    }
    const base = {
      schema_name: "petra.project-work-start-again-receipt" as const,
      schema_version: "1.0.0" as const,
      receipt_id: derivePetraId(
        "project_work_start_again_receipt",
        request.command_id,
      ),
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      project_id: projectId,
      outcome: "started_again" as const,
      actor: clone(principal.actor),
      capability_grant_id: principal.capabilityGrantId,
      requested_prior_work_unit_ref: clone(
        request.expected_prior_work_unit_ref,
      ),
      start_again_registration: clone(request.start_again_registration_ref),
      prior_attempt: {
        work_unit_ref: clone(reservation.payload.prior_work_unit_ref),
        work_attempt: reservation.payload.prior_work_attempt,
        lineage_attempt: reservation.payload.prior_lineage_attempt,
        input_manifest_ref: clone(reservation.payload.prior_input_manifest_ref),
      },
      fresh_input: {
        strategy: "fresh_input" as const,
        prior_input_manifest_ref: clone(
          reservation.payload.prior_input_manifest_ref,
        ),
        fresh_input_manifest_ref: clone(
          reservation.payload.fresh_input_manifest_ref,
        ),
        retained_output_reuse: "none" as const,
        summary: reservation.payload.input_transition.summary,
      },
      new_attempt: {
        lineage_attempt: reservation.payload.new_lineage_attempt,
        work_attempt: 1 as const,
        work_unit_ref: exactWorkRef(resultingWork),
      },
      effect: {
        kind: "operational_only" as const,
        summary:
          "A distinct linked Work task began with registered fresh input; prior Work, attempts, outputs, and cost remain retained.",
        prior_work_preserved: true as const,
        prior_attempts_preserved: true as const,
        fresh_work_identity: true as const,
        domain_authority_changed: false as const,
      },
      destination: {
        place_role: "work" as const,
        work_unit_ref: exactWorkRef(resultingWork),
      },
      recorded_at: request.submitted_at,
    };
    const receipt: PetraProjectWorkStartAgainReceipt = {
      ...base,
      record_hash: canonicalHash(base),
    };
    this.#contracts.assertValid(
      "project-work-start-again-receipt",
      "1.0.0",
      receipt,
    );
    return this.#completeStartAgainReceipt(
      request,
      receipt,
      reservation.payload,
      reservation.contentHash,
    );
  }

  async registerStartAgain(
    input: RegisterProjectWorkStartAgain,
  ): Promise<void> {
    if (
      !START_AGAIN_REGISTRATION_ID.test(input.startAgainRegistrationId) ||
      !CONTENT_HASH.test(input.priorWorkUnitRef.spec_hash) ||
      !CONTENT_HASH.test(input.freshWorkUnitRef.spec_hash) ||
      input.priorWorkUnitRef.work_unit_id ===
        input.freshWorkUnitRef.work_unit_id ||
      input.inputTransition.strategy !== "fresh_input" ||
      input.inputTransition.retainedOutputReuse !== "none" ||
      !validText(input.inputTransition.summary, 1000) ||
      !validDateTime(input.registeredAt)
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_UNAVAILABLE",
        "Start again registration requires distinct exact Work identities, a bounded fresh-input explanation, no implicit output reuse, and a canonical registration time.",
      );
    }
    await this.#transaction("SERIALIZABLE", async (client) => {
      const prior = await this.#work(
        client,
        input.projectId,
        input.priorWorkUnitRef.work_unit_id,
        true,
      );
      const fresh = await this.#work(
        client,
        input.projectId,
        input.freshWorkUnitRef.work_unit_id,
        true,
      );
      if (prior === undefined || fresh === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_NOT_FOUND",
          "Start again requires both exact prior and fresh Work to be registered in this Project.",
        );
      }
      const priorInput = await this.#inputManifest(client, prior);
      const freshInput = await this.#inputManifest(client, fresh);
      const sameTask =
        canonicalize(priorInput.content.task) ===
        canonicalize(freshInput.content.task);
      const sameWorker =
        canonicalize(priorInput.content.worker) ===
        canonicalize(freshInput.content.worker);
      if (
        prior.revision !== input.priorWorkUnitRef.revision ||
        prior.spec_hash !== input.priorWorkUnitRef.spec_hash ||
        (prior.status.state !== "completed" &&
          prior.status.state !== "cancelled") ||
        fresh.revision !== input.freshWorkUnitRef.revision ||
        fresh.spec_hash !== input.freshWorkUnitRef.spec_hash ||
        fresh.status.state !== "requested" ||
        prior.project_id !== fresh.project_id ||
        prior.spec.workflow_name !== fresh.spec.workflow_name ||
        prior.spec.workflow_version !== fresh.spec.workflow_version ||
        !sameTask ||
        !sameWorker ||
        prior.capability_grant_id !== fresh.capability_grant_id ||
        prior.created_by.actor_kind !== "service" ||
        fresh.created_by.actor_kind !== "service" ||
        prior.created_by.actor_id !== input.registeredBy.actor_id ||
        fresh.created_by.actor_id !== input.registeredBy.actor_id ||
        priorInput.issued_by.actor_id !== input.registeredBy.actor_id ||
        freshInput.issued_by.actor_id !== input.registeredBy.actor_id ||
        priorInput.worker_input_manifest_id ===
          freshInput.worker_input_manifest_id ||
        priorInput.content_hash === freshInput.content_hash ||
        Date.parse(input.registeredAt) < Date.parse(prior.updated_at) ||
        Date.parse(input.registeredAt) < Date.parse(fresh.updated_at)
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "The owning workflow may register Start again only from exact terminal prior Work to distinct requested Work with a genuinely fresh immutable input manifest under the same task, worker, workflow, service, and capability boundary.",
        );
      }
      const lineage = await client.query<{
        start_again_registration_id: string;
        new_lineage_attempt: string | null;
      }>(
        `SELECT registration.start_again_registration_id,
                transition.new_lineage_attempt::text
           FROM petra.project_work_start_again_registrations AS registration
           LEFT JOIN petra.project_work_start_again_transitions AS transition
             USING (start_again_registration_id)
          WHERE registration.fresh_work_unit_id = $1`,
        [prior.work_unit_id],
      );
      if (
        lineage.rows[0] !== undefined &&
        lineage.rows[0].new_lineage_attempt === null
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "The prior Work is itself a fresh execution whose Start again effect must be reconciled before another linked attempt is registered.",
        );
      }
      const priorLineageAttempt = Number(
        lineage.rows[0]?.new_lineage_attempt ?? prior.status.attempt,
      );
      if (
        !Number.isSafeInteger(priorLineageAttempt) ||
        priorLineageAttempt < 1 ||
        priorLineageAttempt >= 100
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "The retained Work lineage cannot admit another bounded attempt.",
        );
      }
      const payload: StoredStartAgainRegistration = {
        start_again_registration_id: input.startAgainRegistrationId,
        project_id: input.projectId,
        prior_work_unit_ref: clone(input.priorWorkUnitRef),
        prior_input_manifest_ref: clone(prior.spec.input_manifest_ref),
        prior_work_attempt: prior.status.attempt,
        prior_lineage_attempt: priorLineageAttempt,
        fresh_work_unit_ref: clone(input.freshWorkUnitRef),
        fresh_input_manifest_ref: clone(fresh.spec.input_manifest_ref),
        new_lineage_attempt: priorLineageAttempt + 1,
        workflow: {
          workflow_name: prior.spec.workflow_name,
          workflow_version: prior.spec.workflow_version,
          task_family: priorInput.content.task.task_family,
          task_name: priorInput.content.task.task_name,
          task_version: priorInput.content.task.task_version,
        },
        input_transition: {
          strategy: "fresh_input",
          retained_output_reuse: "none",
          summary: input.inputTransition.summary,
        },
        registered_by: clone(input.registeredBy),
        registered_at: input.registeredAt,
      };
      const contentHash = canonicalHash(payload);
      const existing = await client.query<StoredStartAgainRegistrationRow>(
        `SELECT start_again_registration_id, content_hash, payload
           FROM petra.project_work_start_again_registrations
          WHERE start_again_registration_id = $1
             OR (prior_work_unit_id = $2 AND prior_work_unit_revision = $3)
             OR fresh_work_unit_id = $4
          ORDER BY start_again_registration_id
          FOR UPDATE`,
        [
          input.startAgainRegistrationId,
          prior.work_unit_id,
          prior.revision,
          fresh.work_unit_id,
        ],
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (
          existing.rows.length === 1 &&
          row !== undefined &&
          row.start_again_registration_id === input.startAgainRegistrationId &&
          row.content_hash === contentHash &&
          canonicalize(row.payload) === canonicalize(payload)
        ) {
          return;
        }
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "The Start again registration, prior Work, or fresh Work identity is already bound to a different transition.",
        );
      }
      await client.query(
        `INSERT INTO petra.project_work_start_again_registrations (
           start_again_registration_id, project_id, prior_work_unit_id,
           prior_work_unit_revision, prior_work_unit_spec_hash,
           prior_input_manifest_id, prior_input_manifest_hash,
           prior_work_attempt, prior_lineage_attempt, fresh_work_unit_id,
           fresh_work_unit_revision, fresh_work_unit_spec_hash,
           fresh_input_manifest_id, fresh_input_manifest_hash,
           new_lineage_attempt, workflow_name, workflow_version, task_family,
           task_name, task_version, transition_summary,
           registered_by_actor_id, registered_by_actor_kind, registered_at,
           content_hash, payload
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
           $24::timestamptz, $25, $26::jsonb
         )`,
        [
          payload.start_again_registration_id,
          payload.project_id,
          payload.prior_work_unit_ref.work_unit_id,
          payload.prior_work_unit_ref.revision,
          payload.prior_work_unit_ref.spec_hash,
          payload.prior_input_manifest_ref.worker_input_manifest_id,
          payload.prior_input_manifest_ref.content_hash,
          payload.prior_work_attempt,
          payload.prior_lineage_attempt,
          payload.fresh_work_unit_ref.work_unit_id,
          payload.fresh_work_unit_ref.revision,
          payload.fresh_work_unit_ref.spec_hash,
          payload.fresh_input_manifest_ref.worker_input_manifest_id,
          payload.fresh_input_manifest_ref.content_hash,
          payload.new_lineage_attempt,
          payload.workflow.workflow_name,
          payload.workflow.workflow_version,
          payload.workflow.task_family,
          payload.workflow.task_name,
          payload.workflow.task_version,
          payload.input_transition.summary,
          payload.registered_by.actor_id,
          payload.registered_by.actor_kind,
          payload.registered_at,
          contentHash,
          JSON.stringify(payload),
        ],
      );
    });
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

  async registerStagePlan(input: RegisterProjectWorkStagePlan): Promise<void> {
    assertStagePlanRegistration(input);
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
          "The stage-plan target is not bound to this Project.",
        );
      }
      if (work.spec_hash !== input.expectedWorkUnitSpecHash) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "The stage plan must bind the exact immutable Work specification.",
        );
      }
      const manifest = await this.#inputManifest(client, work);
      const payload: StoredStagePlan = {
        stage_plan_id: input.stagePlanId,
        revision: 1,
        project_id: input.projectId,
        work_unit_id: input.workUnitId,
        work_unit_spec_hash: input.expectedWorkUnitSpecHash,
        workflow: {
          workflow_name: work.spec.workflow_name,
          workflow_version: work.spec.workflow_version,
          task_family: manifest.content.task.task_family,
          task_name: manifest.content.task.task_name,
          task_version: manifest.content.task.task_version,
        },
        stages: input.stages.map((stage) => ({
          stage_id: stage.stageId,
          label: stage.label,
          purpose: stage.purpose,
          boundary: stage.boundary,
          prerequisite_stage_ids: [...stage.prerequisiteStageIds],
          accountable_role: stage.accountableRole,
          input: stage.input,
          output: stage.output,
        })),
        registered_at: input.registeredAt,
      };
      const contentHash = canonicalHash(payload);
      const existing = await client.query<StagePlanRow>(
        `SELECT content_hash, plan_payload
           FROM petra.project_work_stage_plans
          WHERE stage_plan_id = $1 OR work_unit_id = $2
          FOR UPDATE`,
        [input.stagePlanId, input.workUnitId],
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        if (
          existing.rows.length === 1 &&
          row !== undefined &&
          row.content_hash === contentHash &&
          canonicalize(row.plan_payload) === canonicalize(payload)
        ) {
          return;
        }
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "The stage-plan or Work identity is already bound to different content.",
        );
      }
      await client.query(
        `INSERT INTO petra.project_work_stage_plans (
           stage_plan_id, revision, project_id, work_unit_id,
           work_unit_spec_hash, workflow_name, workflow_version, task_family,
           task_name, task_version, stages, content_hash, plan_payload,
           registered_at
         ) VALUES (
           $1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11,
           $12::jsonb, $13::timestamptz
         )`,
        [
          payload.stage_plan_id,
          payload.project_id,
          payload.work_unit_id,
          payload.work_unit_spec_hash,
          payload.workflow.workflow_name,
          payload.workflow.workflow_version,
          payload.workflow.task_family,
          payload.workflow.task_name,
          payload.workflow.task_version,
          JSON.stringify(payload.stages),
          contentHash,
          JSON.stringify(payload),
          payload.registered_at,
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
      const resumeRegistration = await this.#resumeRegistration(client, work);
      const startAgainRegistration = await this.#startAgainRegistration(
        client,
        work,
      );
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
      const resumable =
        work.status.state === "checkpointed" &&
        resumeRegistration !== undefined &&
        pendingInputs.length === 0;
      const startAgainAvailable = startAgainRegistration !== undefined;
      const workUnitRef = exactWorkRef(work);
      const resumeBinding =
        resumable && work.status.state === "checkpointed"
          ? {
              project_id: projectId,
              expected_work_unit_ref: workUnitRef,
              expected_checkpoint: clone(work.status.checkpoint),
            }
          : undefined;
      const startAgainBinding =
        startAgainRegistration === undefined
          ? undefined
          : {
              project_id: projectId,
              expected_prior_work_unit_ref: workUnitRef,
              start_again_registration_ref: {
                start_again_registration_id:
                  startAgainRegistration.payload.start_again_registration_id,
                content_hash: startAgainRegistration.contentHash,
              },
              fresh_work_unit_ref: clone(
                startAgainRegistration.payload.fresh_work_unit_ref,
              ),
              prior_work_attempt:
                startAgainRegistration.payload.prior_work_attempt,
              prior_lineage_attempt:
                startAgainRegistration.payload.prior_lineage_attempt,
              new_lineage_attempt:
                startAgainRegistration.payload.new_lineage_attempt,
              input_transition: {
                strategy: "fresh_input" as const,
                prior_input_manifest_ref: clone(
                  startAgainRegistration.payload.prior_input_manifest_ref,
                ),
                fresh_input_manifest_ref: clone(
                  startAgainRegistration.payload.fresh_input_manifest_ref,
                ),
                retained_output_reuse: "none" as const,
                summary:
                  startAgainRegistration.payload.input_transition.summary,
              },
            };
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
          state: resumable ? "available" : "unavailable",
          reason: resumable
            ? "The owning workflow registered this exact retained checkpoint as compatible with the immutable Work boundary."
            : pendingInputs.length > 0
              ? "Required input must be resolved before checkpointed Work resumes."
              : work.status.state === "checkpointed"
                ? "The checkpoint is visible, but no trusted registered transition validates its compatibility."
                : "Resume requires exact checkpointed Work and a trusted compatible-transition registration.",
          ...(resumable ? { command_path: `${commandPath}/resume` } : {}),
        },
        {
          operation: "start_again",
          state: startAgainAvailable ? "available" : "unavailable",
          reason: startAgainAvailable
            ? "The owning workflow registered distinct requested Work with fresh immutable input and retained prior-attempt lineage."
            : "Fresh execution requires distinct requested Work and a registered workflow-specific fresh-input transition; Petra does not clone Work implicitly.",
          ...(startAgainAvailable
            ? { command_path: `${commandPath}/start-again` }
            : {}),
        },
      ];
      const content = {
        project_id: projectId,
        work_unit_ref: workUnitRef,
        execution_state: work.status.state,
        plan,
        required_inputs: inputs,
        delivery,
        ...(resumeBinding === undefined
          ? {}
          : { resume_binding: resumeBinding }),
        ...(startAgainBinding === undefined
          ? {}
          : { start_again_binding: startAgainBinding }),
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

  async #reserveResume(
    projectId: string,
    request: PetraProjectWorkResumeRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<PetraProjectWorkResumeReceipt | ResolvedResumeRegistration> {
    return this.#transaction("SERIALIZABLE", async (client) => {
      const requestHash = canonicalHash(request);
      const existing = await client.query<StoredResumeReceiptRow>(
        `SELECT state, request_hash, request_payload, actor_id, actor_kind,
                capability_grant_id, receipt_payload, resume_registration_id
           FROM petra.project_work_resume_receipts
          WHERE command_id = $1 OR idempotency_key = $2
          ORDER BY command_id
          FOR UPDATE`,
        [request.command_id, request.idempotency_key],
      );
      if (existing.rows.length > 0) {
        if (existing.rows.length !== 1) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The resume command identity and idempotency key identify different operations.",
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
            "The resume command identity or idempotency key is bound to different input or authority.",
          );
        }
        if (row.state === "completed") {
          this.#contracts.assertValid(
            "project-work-resume-receipt",
            "1.0.0",
            row.receipt_payload,
          );
          return clone(row.receipt_payload) as PetraProjectWorkResumeReceipt;
        }
        const registration = await this.#resumeRegistrationById(
          client,
          row.resume_registration_id,
        );
        if (registration === undefined) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
            "The pending resume command lost its compatibility registration.",
          );
        }
        return registration;
      }

      const crossingIdentity = await client.query(
        `SELECT 1
           FROM (
             SELECT command_id, idempotency_key
               FROM petra.project_work_operation_receipts
             UNION ALL
             SELECT command_id, idempotency_key
               FROM petra.project_work_start_again_receipts
           ) AS existing_command
          WHERE command_id = $1 OR idempotency_key = $2
          LIMIT 1`,
        [request.command_id, request.idempotency_key],
      );
      if ((crossingIdentity.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "The resume command identity or idempotency key already names another Work operation.",
        );
      }
      const pending = await client.query(
        `SELECT 1
           FROM (
             SELECT command_id FROM petra.project_work_operation_receipts
              WHERE project_id = $1 AND work_unit_id = $2 AND state = 'pending'
             UNION ALL
             SELECT command_id FROM petra.project_work_resume_receipts
              WHERE project_id = $1 AND work_unit_id = $2 AND state = 'pending'
             UNION ALL
             SELECT command_id FROM petra.project_work_start_again_receipts
              WHERE project_id = $1
                AND (prior_work_unit_id = $2 OR fresh_work_unit_id = $2)
                AND state = 'pending'
           ) AS pending_work_operation
          LIMIT 1`,
        [projectId, request.expected_work_unit_ref.work_unit_id],
      );
      if ((pending.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "Another Work operation has an unresolved delivery effect; reconcile it before resuming.",
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
          "The checkpointed WorkUnit is not bound to this Project.",
        );
      }
      if (
        work.revision !== request.expected_work_unit_ref.revision ||
        work.spec_hash !== request.expected_work_unit_ref.spec_hash ||
        work.status.state !== "checkpointed" ||
        canonicalize(work.status.checkpoint) !==
          canonicalize(request.expected_checkpoint)
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "Resume must name the exact current checkpointed Work revision, specification, and retained checkpoint.",
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
      const pendingInputs = await client.query(
        `SELECT 1 FROM petra.project_work_input_requests
          WHERE project_id = $1 AND work_unit_id = $2 AND state = 'pending'
          LIMIT 1`,
        [projectId, work.work_unit_id],
      );
      if ((pendingInputs.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "Required input must be resolved before checkpointed Work resumes.",
        );
      }
      const registration = await this.#resumeRegistration(client, work);
      if (registration === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "No trusted registered transition validates this exact checkpoint within the immutable Work boundary.",
        );
      }
      await client.query(
        `INSERT INTO petra.project_work_resume_receipts (
           receipt_id, command_id, idempotency_key, project_id, work_unit_id,
           source_work_unit_revision, resume_registration_id, request_hash,
           request_payload, actor_id, actor_kind, capability_grant_id, state,
           recorded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12,
           'pending', $13::timestamptz
         )`,
        [
          derivePetraId("project_work_resume_receipt", request.command_id),
          request.command_id,
          request.idempotency_key,
          projectId,
          work.work_unit_id,
          work.revision,
          registration.payload.resume_registration_id,
          requestHash,
          JSON.stringify(request),
          principal.actor.actor_id,
          principal.actor.actor_kind,
          principal.capabilityGrantId,
          request.submitted_at,
        ],
      );
      return registration;
    });
  }

  async #resume(
    request: PetraProjectWorkResumeRequest,
  ): Promise<PetraWorkUnit> {
    const expected = request.expected_work_unit_ref;
    let current = await this.#workUnits.getWorkUnit(expected.work_unit_id);
    if (current?.revision === expected.revision) {
      current = await this.#workUnits.resume(
        expected.work_unit_id,
        expected.revision,
        request.submitted_at,
      );
    }
    const source = await this.#workUnits.getWorkUnitRevision(
      expected.work_unit_id,
      expected.revision,
    );
    if (
      source?.status.state !== "checkpointed" ||
      current?.revision !== expected.revision + 1 ||
      current.status.state !== "running" ||
      current.status.attempt !== source.status.attempt ||
      current.updated_at !== request.submitted_at
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STALE",
        "The reserved checkpoint resume could not reconcile its exact Work effect.",
      );
    }
    return current;
  }

  async #releaseUnappliedResumeReservation(
    request: PetraProjectWorkResumeRequest,
  ): Promise<void> {
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
      `DELETE FROM petra.project_work_resume_receipts
        WHERE command_id = $1 AND state = 'pending'`,
      [request.command_id],
    );
  }

  async #completeResumeReceipt(
    request: PetraProjectWorkResumeRequest,
    receipt: PetraProjectWorkResumeReceipt,
    registration: StoredResumeRegistration,
    registrationContentHash: string,
  ): Promise<PetraProjectWorkResumeReceipt> {
    return this.#transaction("SERIALIZABLE", async (client) => {
      const row = await client.query<StoredResumeReceiptRow>(
        `SELECT state, request_hash, request_payload, actor_id, actor_kind,
                capability_grant_id, receipt_payload, resume_registration_id
           FROM petra.project_work_resume_receipts
          WHERE command_id = $1 FOR UPDATE`,
        [request.command_id],
      );
      const existingReceipt = row.rows[0];
      if (existingReceipt === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
          "The checkpoint resume lost its command reservation.",
        );
      }
      if (existingReceipt.state === "completed") {
        this.#contracts.assertValid(
          "project-work-resume-receipt",
          "1.0.0",
          existingReceipt.receipt_payload,
        );
        return clone(
          existingReceipt.receipt_payload,
        ) as PetraProjectWorkResumeReceipt;
      }
      const transitionPayload = {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        registration_ref: {
          resume_registration_id: registration.resume_registration_id,
          content_hash: registrationContentHash,
        },
        project_id: receipt.project_id,
        source_work_unit_ref: clone(receipt.requested_work_unit_ref),
        checkpoint: clone(receipt.checkpoint),
        resulting_work_unit_ref: clone(receipt.resulting_work_unit_ref),
        attempt: receipt.resumed_attempt,
        resumed_at: request.submitted_at,
        requested_by: clone(receipt.actor),
        capability_grant_id: receipt.capability_grant_id,
        authority_boundary: {
          effect_kind: "operational_only" as const,
          work_identity_preserved: true as const,
          attempt_preserved: true as const,
          domain_authority_changed: false as const,
        },
      };
      const transitionHash = canonicalHash(transitionPayload);
      const existingTransition = await client.query<StoredResumeTransitionRow>(
        `SELECT record_hash, transition_payload
           FROM petra.project_work_resume_transitions
          WHERE command_id = $1 OR idempotency_key = $2
             OR resume_registration_id = $3
          ORDER BY command_id
          FOR UPDATE`,
        [
          request.command_id,
          request.idempotency_key,
          registration.resume_registration_id,
        ],
      );
      if (existingTransition.rows.length > 0) {
        const transition = existingTransition.rows[0];
        if (
          existingTransition.rows.length !== 1 ||
          transition === undefined ||
          transition.record_hash !== transitionHash ||
          canonicalize(transition.transition_payload) !==
            canonicalize(transitionPayload)
        ) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The resume transition identity is already bound to different checkpoint lineage.",
          );
        }
      } else {
        await client.query(
          `INSERT INTO petra.project_work_resume_transitions (
             command_id, idempotency_key, resume_registration_id, project_id,
             work_unit_id, source_work_unit_revision,
             resulting_work_unit_revision, work_unit_spec_hash,
             checkpoint_artifact_id, checkpoint_content_hash, attempt,
             resumed_at, actor_id, actor_kind, capability_grant_id,
             record_hash, transition_payload
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             $12::timestamptz, $13, $14, $15, $16, $17::jsonb
           )`,
          [
            request.command_id,
            request.idempotency_key,
            registration.resume_registration_id,
            receipt.project_id,
            receipt.requested_work_unit_ref.work_unit_id,
            receipt.requested_work_unit_ref.revision,
            receipt.resulting_work_unit_ref.revision,
            receipt.requested_work_unit_ref.spec_hash,
            receipt.checkpoint.artifact_id,
            receipt.checkpoint.content_hash,
            receipt.resumed_attempt,
            request.submitted_at,
            receipt.actor.actor_id,
            receipt.actor.actor_kind,
            receipt.capability_grant_id,
            transitionHash,
            JSON.stringify(transitionPayload),
          ],
        );
      }
      await client.query(
        `UPDATE petra.project_work_resume_receipts
            SET state = 'completed', receipt_payload = $2::jsonb,
                completed_at = $3::timestamptz
          WHERE command_id = $1 AND state = 'pending'`,
        [request.command_id, JSON.stringify(receipt), request.submitted_at],
      );
      return clone(receipt);
    });
  }

  async #reserveStartAgain(
    projectId: string,
    request: PetraProjectWorkStartAgainRequest,
    principal: ProjectWorkCommandPrincipal,
  ): Promise<
    PetraProjectWorkStartAgainReceipt | ResolvedStartAgainRegistration
  > {
    return this.#transaction("SERIALIZABLE", async (client) => {
      const requestHash = canonicalHash(request);
      const existing = await client.query<StoredStartAgainReceiptRow>(
        `SELECT state, request_hash, request_payload, actor_id, actor_kind,
                capability_grant_id, receipt_payload,
                start_again_registration_id
           FROM petra.project_work_start_again_receipts
          WHERE command_id = $1 OR idempotency_key = $2
          ORDER BY command_id
          FOR UPDATE`,
        [request.command_id, request.idempotency_key],
      );
      if (existing.rows.length > 0) {
        if (existing.rows.length !== 1) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The Start again command identity and idempotency key identify different operations.",
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
            "The Start again command identity or idempotency key is bound to different input or authority.",
          );
        }
        if (row.state === "completed") {
          this.#contracts.assertValid(
            "project-work-start-again-receipt",
            "1.0.0",
            row.receipt_payload,
          );
          return clone(
            row.receipt_payload,
          ) as PetraProjectWorkStartAgainReceipt;
        }
        const registration = await this.#startAgainRegistrationById(
          client,
          row.start_again_registration_id,
        );
        if (registration === undefined) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
            "The pending Start again command lost its fresh-input registration.",
          );
        }
        return registration;
      }

      const crossingIdentity = await client.query(
        `SELECT 1
           FROM (
             SELECT command_id, idempotency_key
               FROM petra.project_work_operation_receipts
             UNION ALL
             SELECT command_id, idempotency_key
               FROM petra.project_work_resume_receipts
           ) AS existing_command
          WHERE command_id = $1 OR idempotency_key = $2
          LIMIT 1`,
        [request.command_id, request.idempotency_key],
      );
      if ((crossingIdentity.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "The Start again command identity or idempotency key already names another Work operation.",
        );
      }
      const prior = await this.#work(
        client,
        projectId,
        request.expected_prior_work_unit_ref.work_unit_id,
        true,
      );
      if (prior === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_NOT_FOUND",
          "The prior WorkUnit is not bound to this Project.",
        );
      }
      if (
        prior.revision !== request.expected_prior_work_unit_ref.revision ||
        prior.spec_hash !== request.expected_prior_work_unit_ref.spec_hash ||
        (prior.status.state !== "completed" &&
          prior.status.state !== "cancelled")
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "Start again must name the exact current terminal prior Work revision and specification.",
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
      const registration = await this.#startAgainRegistration(client, prior);
      if (
        registration === undefined ||
        registration.payload.start_again_registration_id !==
          request.start_again_registration_ref.start_again_registration_id ||
        registration.contentHash !==
          request.start_again_registration_ref.content_hash
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_UNAVAILABLE",
          "No trusted registered fresh-input transition matches this exact terminal Work and request.",
        );
      }
      if (
        Date.parse(request.submitted_at) <
        Date.parse(registration.payload.registered_at)
      ) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STALE",
          "Start again cannot precede its trusted fresh-input registration.",
        );
      }
      const pending = await client.query(
        `SELECT 1
           FROM (
             SELECT work_unit_id
               FROM petra.project_work_operation_receipts
              WHERE state = 'pending'
             UNION ALL
             SELECT work_unit_id
               FROM petra.project_work_resume_receipts
              WHERE state = 'pending'
             UNION ALL
             SELECT prior_work_unit_id AS work_unit_id
               FROM petra.project_work_start_again_receipts
              WHERE state = 'pending'
             UNION ALL
             SELECT fresh_work_unit_id AS work_unit_id
               FROM petra.project_work_start_again_receipts
              WHERE state = 'pending'
           ) AS pending_work_operation
          WHERE work_unit_id = ANY($1::text[])
          LIMIT 1`,
        [
          [
            prior.work_unit_id,
            registration.payload.fresh_work_unit_ref.work_unit_id,
          ],
        ],
      );
      if ((pending.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "Prior or fresh Work has an unresolved delivery effect; reconcile it before starting again.",
        );
      }
      await client.query(
        `INSERT INTO petra.project_work_start_again_receipts (
           receipt_id, command_id, idempotency_key, project_id,
           prior_work_unit_id, prior_work_unit_revision,
           start_again_registration_id, fresh_work_unit_id, request_hash,
           request_payload, actor_id, actor_kind, capability_grant_id, state,
           recorded_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12,
           $13, 'pending', $14::timestamptz
         )`,
        [
          derivePetraId("project_work_start_again_receipt", request.command_id),
          request.command_id,
          request.idempotency_key,
          projectId,
          prior.work_unit_id,
          prior.revision,
          registration.payload.start_again_registration_id,
          registration.payload.fresh_work_unit_ref.work_unit_id,
          requestHash,
          JSON.stringify(request),
          principal.actor.actor_id,
          principal.actor.actor_kind,
          principal.capabilityGrantId,
          request.submitted_at,
        ],
      );
      return registration;
    });
  }

  async #startAgain(
    request: PetraProjectWorkStartAgainRequest,
    registration: StoredStartAgainRegistration,
  ): Promise<PetraWorkUnit> {
    const fresh = registration.fresh_work_unit_ref;
    let current = await this.#workUnits.getWorkUnit(fresh.work_unit_id);
    if (
      current?.revision === fresh.revision &&
      current.status.state === "requested"
    ) {
      current = await this.#workUnits.queue(
        fresh.work_unit_id,
        fresh.revision,
        request.submitted_at,
      );
    }
    if (
      current?.revision === fresh.revision + 1 &&
      current.status.state === "queued" &&
      current.status.queued_at === request.submitted_at
    ) {
      current = await this.#workUnits.start(
        fresh.work_unit_id,
        fresh.revision + 1,
        1,
        request.submitted_at,
      );
    }
    const started =
      current?.revision === fresh.revision + 2
        ? current
        : await this.#workUnits.getWorkUnitRevision(
            fresh.work_unit_id,
            fresh.revision + 2,
          );
    if (
      started?.spec_hash !== fresh.spec_hash ||
      started.status.state !== "running" ||
      started.status.attempt !== 1 ||
      started.status.queued_at !== request.submitted_at ||
      started.status.started_at !== request.submitted_at
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STALE",
        "The reserved Start again command could not reconcile its exact fresh Work attempt.",
      );
    }
    return started;
  }

  async #releaseUnappliedStartAgainReservation(
    request: PetraProjectWorkStartAgainRequest,
  ): Promise<void> {
    const row = await this.#pool.query<{ fresh_work_unit_id: string }>(
      `SELECT fresh_work_unit_id
         FROM petra.project_work_start_again_receipts
        WHERE command_id = $1 AND state = 'pending'`,
      [request.command_id],
    );
    const freshWorkUnitId = row.rows[0]?.fresh_work_unit_id;
    if (freshWorkUnitId === undefined) return;
    const current = await this.#workUnits.getWorkUnit(freshWorkUnitId);
    if (current?.revision !== 1 || current.status.state !== "requested") return;
    await this.#pool.query(
      `DELETE FROM petra.project_work_start_again_receipts
        WHERE command_id = $1 AND state = 'pending'`,
      [request.command_id],
    );
  }

  async #completeStartAgainReceipt(
    request: PetraProjectWorkStartAgainRequest,
    receipt: PetraProjectWorkStartAgainReceipt,
    registration: StoredStartAgainRegistration,
    registrationContentHash: string,
  ): Promise<PetraProjectWorkStartAgainReceipt> {
    return this.#transaction("SERIALIZABLE", async (client) => {
      const row = await client.query<StoredStartAgainReceiptRow>(
        `SELECT state, request_hash, request_payload, actor_id, actor_kind,
                capability_grant_id, receipt_payload,
                start_again_registration_id
           FROM petra.project_work_start_again_receipts
          WHERE command_id = $1 FOR UPDATE`,
        [request.command_id],
      );
      const existingReceipt = row.rows[0];
      if (existingReceipt === undefined) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
          "The Start again command lost its reservation.",
        );
      }
      if (existingReceipt.state === "completed") {
        this.#contracts.assertValid(
          "project-work-start-again-receipt",
          "1.0.0",
          existingReceipt.receipt_payload,
        );
        return clone(
          existingReceipt.receipt_payload,
        ) as PetraProjectWorkStartAgainReceipt;
      }
      const transitionPayload = {
        command_id: request.command_id,
        idempotency_key: request.idempotency_key,
        registration_ref: {
          start_again_registration_id: registration.start_again_registration_id,
          content_hash: registrationContentHash,
        },
        project_id: receipt.project_id,
        prior_attempt: clone(receipt.prior_attempt),
        fresh_input: clone(receipt.fresh_input),
        new_attempt: clone(receipt.new_attempt),
        started_at: request.submitted_at,
        requested_by: clone(receipt.actor),
        capability_grant_id: receipt.capability_grant_id,
        authority_boundary: {
          effect_kind: "operational_only" as const,
          prior_work_preserved: true as const,
          fresh_work_identity: true as const,
          domain_authority_changed: false as const,
        },
      };
      const transitionHash = canonicalHash(transitionPayload);
      const existingTransition =
        await client.query<StoredStartAgainTransitionRow>(
          `SELECT record_hash, transition_payload
             FROM petra.project_work_start_again_transitions
            WHERE command_id = $1 OR idempotency_key = $2
               OR start_again_registration_id = $3
               OR fresh_work_unit_id = $4
            ORDER BY command_id
            FOR UPDATE`,
          [
            request.command_id,
            request.idempotency_key,
            registration.start_again_registration_id,
            registration.fresh_work_unit_ref.work_unit_id,
          ],
        );
      if (existingTransition.rows.length > 0) {
        const transition = existingTransition.rows[0];
        if (
          existingTransition.rows.length !== 1 ||
          transition === undefined ||
          transition.record_hash !== transitionHash ||
          canonicalize(transition.transition_payload) !==
            canonicalize(transitionPayload)
        ) {
          throw new ProjectWorkOperationError(
            "PROJECT_WORK_OPERATION_CONFLICT",
            "The Start again transition identity is already bound to different retained-attempt lineage.",
          );
        }
      } else {
        await client.query(
          `INSERT INTO petra.project_work_start_again_transitions (
             command_id, idempotency_key, start_again_registration_id,
             project_id, prior_work_unit_id, prior_work_unit_revision,
             prior_work_attempt, prior_lineage_attempt, fresh_work_unit_id,
             fresh_registered_revision, fresh_resulting_revision,
             fresh_work_attempt, new_lineage_attempt, started_at, actor_id,
             actor_kind, capability_grant_id, record_hash,
             transition_payload
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
             $14::timestamptz, $15, $16, $17, $18, $19::jsonb
           )`,
          [
            request.command_id,
            request.idempotency_key,
            registration.start_again_registration_id,
            receipt.project_id,
            registration.prior_work_unit_ref.work_unit_id,
            registration.prior_work_unit_ref.revision,
            registration.prior_work_attempt,
            registration.prior_lineage_attempt,
            registration.fresh_work_unit_ref.work_unit_id,
            registration.fresh_work_unit_ref.revision,
            receipt.new_attempt.work_unit_ref.revision,
            receipt.new_attempt.work_attempt,
            receipt.new_attempt.lineage_attempt,
            request.submitted_at,
            receipt.actor.actor_id,
            receipt.actor.actor_kind,
            receipt.capability_grant_id,
            transitionHash,
            JSON.stringify(transitionPayload),
          ],
        );
      }
      await client.query(
        `UPDATE petra.project_work_start_again_receipts
            SET state = 'completed', receipt_payload = $2::jsonb,
                completed_at = $3::timestamptz
          WHERE command_id = $1 AND state = 'pending'`,
        [request.command_id, JSON.stringify(receipt), request.submitted_at],
      );
      return clone(receipt);
    });
  }

  async #startAgainRegistration(
    client: PoolClient,
    prior: PetraWorkUnit,
  ): Promise<ResolvedStartAgainRegistration | undefined> {
    if (
      prior.status.state !== "completed" &&
      prior.status.state !== "cancelled"
    ) {
      return undefined;
    }
    const result = await client.query<StoredStartAgainRegistrationRow>(
      `SELECT start_again_registration_id, content_hash, payload
         FROM petra.project_work_start_again_registrations
        WHERE project_id = $1 AND prior_work_unit_id = $2
          AND prior_work_unit_revision = $3
          AND prior_work_unit_spec_hash = $4`,
      [prior.project_id, prior.work_unit_id, prior.revision, prior.spec_hash],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const registration = this.#readStartAgainRegistration(row);
    const fresh = await this.#work(
      client,
      prior.project_id,
      registration.payload.fresh_work_unit_ref.work_unit_id,
      false,
    );
    if (
      fresh === undefined ||
      fresh.revision !== registration.payload.fresh_work_unit_ref.revision ||
      fresh.status.state !== "requested"
    ) {
      return undefined;
    }
    if (
      registration.payload.project_id !== prior.project_id ||
      canonicalize(registration.payload.prior_work_unit_ref) !==
        canonicalize(exactWorkRef(prior)) ||
      canonicalize(registration.payload.prior_input_manifest_ref) !==
        canonicalize(prior.spec.input_manifest_ref) ||
      registration.payload.prior_work_attempt !== prior.status.attempt ||
      fresh.spec_hash !== registration.payload.fresh_work_unit_ref.spec_hash ||
      canonicalize(registration.payload.fresh_input_manifest_ref) !==
        canonicalize(fresh.spec.input_manifest_ref) ||
      registration.payload.registered_by.actor_id !==
        prior.created_by.actor_id ||
      fresh.created_by.actor_id !== prior.created_by.actor_id ||
      fresh.capability_grant_id !== prior.capability_grant_id
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "The retained Start again registration crossed its exact prior/fresh Work boundary.",
      );
    }
    const pendingInputs = await client.query(
      `SELECT 1 FROM petra.project_work_input_requests
        WHERE project_id = $1 AND work_unit_id = $2 AND state = 'pending'
        LIMIT 1`,
      [prior.project_id, fresh.work_unit_id],
    );
    return (pendingInputs.rowCount ?? 0) > 0 ? undefined : registration;
  }

  async #startAgainRegistrationById(
    client: PoolClient,
    registrationId: string,
  ): Promise<ResolvedStartAgainRegistration | undefined> {
    const result = await client.query<StoredStartAgainRegistrationRow>(
      `SELECT start_again_registration_id, content_hash, payload
         FROM petra.project_work_start_again_registrations
        WHERE start_again_registration_id = $1`,
      [registrationId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : this.#readStartAgainRegistration(row);
  }

  #readStartAgainRegistration(
    row: StoredStartAgainRegistrationRow,
  ): ResolvedStartAgainRegistration {
    const payload = row.payload as Partial<StoredStartAgainRegistration>;
    if (
      typeof payload !== "object" ||
      payload === null ||
      payload.start_again_registration_id !== row.start_again_registration_id ||
      canonicalHash(row.payload) !== row.content_hash
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "A retained Start again registration failed its exact content identity.",
      );
    }
    return {
      payload: clone(row.payload) as StoredStartAgainRegistration,
      contentHash: row.content_hash,
    };
  }

  async #resumeRegistration(
    client: PoolClient,
    work: PetraWorkUnit,
  ): Promise<ResolvedResumeRegistration | undefined> {
    if (work.status.state !== "checkpointed") return undefined;
    const result = await client.query<StoredResumeRegistrationRow>(
      `SELECT resume_registration_id, content_hash, payload
         FROM petra.project_work_resume_registrations
        WHERE project_id = $1 AND work_unit_id = $2
          AND source_work_unit_revision = $3
          AND work_unit_spec_hash = $4
          AND checkpoint_artifact_id = $5
          AND checkpoint_content_hash = $6`,
      [
        work.project_id,
        work.work_unit_id,
        work.revision,
        work.spec_hash,
        work.status.checkpoint.artifact_id,
        work.status.checkpoint.content_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const registration = this.#readResumeRegistration(row);
    if (
      registration.payload.project_id !== work.project_id ||
      registration.payload.work_unit_ref.work_unit_id !== work.work_unit_id ||
      registration.payload.work_unit_ref.revision !== work.revision ||
      registration.payload.work_unit_ref.spec_hash !== work.spec_hash ||
      canonicalize(registration.payload.input_manifest_ref) !==
        canonicalize(work.spec.input_manifest_ref) ||
      canonicalize(registration.payload.checkpoint) !==
        canonicalize(work.status.checkpoint) ||
      registration.payload.workflow.workflow_name !== work.spec.workflow_name ||
      registration.payload.workflow.workflow_version !==
        work.spec.workflow_version ||
      registration.payload.attempt !== work.status.attempt ||
      registration.payload.registered_by.actor_id !== work.created_by.actor_id
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "The retained resume registration crossed its immutable Work boundary.",
      );
    }
    return registration;
  }

  async #resumeRegistrationById(
    client: PoolClient,
    registrationId: string,
  ): Promise<ResolvedResumeRegistration | undefined> {
    const result = await client.query<StoredResumeRegistrationRow>(
      `SELECT resume_registration_id, content_hash, payload
         FROM petra.project_work_resume_registrations
        WHERE resume_registration_id = $1`,
      [registrationId],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : this.#readResumeRegistration(row);
  }

  #readResumeRegistration(
    row: StoredResumeRegistrationRow,
  ): ResolvedResumeRegistration {
    const payload = row.payload as Partial<StoredResumeRegistration>;
    if (
      typeof payload !== "object" ||
      payload === null ||
      payload.resume_registration_id !== row.resume_registration_id ||
      canonicalHash(row.payload) !== row.content_hash
    ) {
      throw new ProjectWorkOperationError(
        "PROJECT_WORK_OPERATION_STORED_RECORD_CORRUPT",
        "A retained resume registration failed its exact content identity.",
      );
    }
    return {
      payload: clone(row.payload) as StoredResumeRegistration,
      contentHash: row.content_hash,
    };
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

      const crossingResumeIdentity = await client.query(
        `SELECT 1
           FROM (
             SELECT command_id, idempotency_key
               FROM petra.project_work_resume_receipts
             UNION ALL
             SELECT command_id, idempotency_key
               FROM petra.project_work_start_again_receipts
           ) AS existing_command
          WHERE command_id = $1 OR idempotency_key = $2
          LIMIT 1`,
        [request.command_id, request.idempotency_key],
      );
      if ((crossingResumeIdentity.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "The Work command identity or idempotency key already names a checkpoint resume.",
        );
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
      const pendingResume = await client.query(
        `SELECT 1 FROM petra.project_work_resume_receipts
          WHERE project_id = $1 AND work_unit_id = $2 AND state = 'pending'
          LIMIT 1`,
        [projectId, request.expected_work_unit_ref.work_unit_id],
      );
      if ((pendingResume.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "A checkpoint resume has an unresolved delivery effect; reconcile it before a new Work command.",
        );
      }
      const pendingStartAgain = await client.query(
        `SELECT 1 FROM petra.project_work_start_again_receipts
          WHERE project_id = $1
            AND (prior_work_unit_id = $2 OR fresh_work_unit_id = $2)
            AND state = 'pending'
          LIMIT 1`,
        [projectId, request.expected_work_unit_ref.work_unit_id],
      );
      if ((pendingStartAgain.rowCount ?? 0) > 0) {
        throw new ProjectWorkOperationError(
          "PROJECT_WORK_OPERATION_CONFLICT",
          "Start again has an unresolved delivery effect; reconcile it before a new Work command.",
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
