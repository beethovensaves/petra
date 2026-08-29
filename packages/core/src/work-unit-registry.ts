import { createHash } from "node:crypto";

import type {
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWorkUnit,
  WorkerDescriptor,
  WorkerExpectedOutput,
  WorkerFailure,
  WorkerProducedOutput,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

export type WorkUnitErrorCode =
  | "INPUT_MANIFEST_HASH_MISMATCH"
  | "WORK_UNIT_SPEC_HASH_MISMATCH"
  | "WORK_UNIT_MANIFEST_MISMATCH"
  | "WORK_UNIT_ID_ALREADY_REGISTERED"
  | "INPUT_MANIFEST_ID_ALREADY_REGISTERED"
  | "WORK_UNIT_IDEMPOTENCY_REUSED"
  | "WORK_UNIT_NOT_REGISTERED"
  | "STALE_WORK_UNIT_REVISION"
  | "WORK_UNIT_STATE_INVALID"
  | "WORK_UNIT_ATTEMPT_INVALID"
  | "WORK_UNIT_ATTEMPT_LIMIT_EXCEEDED"
  | "WORK_UNIT_DEPENDENCY_NOT_READY"
  | "WORK_UNIT_NOT_CANCELLABLE"
  | "INPUT_BINDING_DUPLICATE"
  | "OUTPUT_DECLARATION_DUPLICATE"
  | "OUTPUT_LIMIT_INVALID"
  | "OUTPUT_MANIFEST_HASH_MISMATCH"
  | "OUTPUT_MANIFEST_ID_ALREADY_REGISTERED"
  | "OUTPUT_MANIFEST_MISMATCH"
  | "OUTPUT_WORKER_MISMATCH"
  | "OUTPUT_SLOT_UNDECLARED"
  | "OUTPUT_SLOT_DUPLICATE"
  | "REQUIRED_OUTPUT_MISSING"
  | "OUTPUT_DECLARATION_MISMATCH"
  | "OUTPUT_SIZE_LIMIT_EXCEEDED"
  | "TOTAL_OUTPUT_LIMIT_EXCEEDED"
  | "PARTIAL_OUTPUT_NOT_PERMITTED"
  | "RESOURCE_LIMIT_EXCEEDED"
  | "NETWORK_POLICY_VIOLATED"
  | "NETWORK_USAGE_MISMATCH"
  | "WORK_UNIT_TIMESTAMP_INVALID";

export class WorkUnitError extends Error {
  readonly code: WorkUnitErrorCode;

  constructor(code: WorkUnitErrorCode, message: string) {
    super(message);
    this.name = "WorkUnitError";
    this.code = code;
  }
}

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

type StoredRegistration = {
  readonly fingerprint: string;
  readonly workUnitId: string;
};

type StoredOutput = {
  readonly fingerprint: string;
  readonly manifest: DeepReadonly<PetraWorkerOutputManifest>;
};

const immutableCopy = <Value>(value: Value): DeepReadonly<Value> => {
  const copy = structuredClone(value);
  const freeze = (member: unknown): void => {
    if (
      typeof member !== "object" ||
      member === null ||
      Object.isFrozen(member)
    ) {
      return;
    }
    for (const child of Object.values(member)) freeze(child);
    Object.freeze(member);
  };
  freeze(copy);
  return copy as DeepReadonly<Value>;
};

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const actorMatches = (
  left: PetraWorkUnit["created_by"],
  right: PetraWorkerInputManifest["issued_by"],
): boolean =>
  left.actor_id === right.actor_id && left.actor_kind === right.actor_kind;

const workerMatches = (
  expected: WorkerDescriptor,
  actual: WorkerDescriptor,
): boolean => canonicalize(expected) === canonicalize(actual);

const contractMatches = (
  expected: WorkerExpectedOutput["contract"],
  actual: WorkerProducedOutput["contract"],
): boolean => canonicalize(expected) === canonicalize(actual);

const assertTimestampOrder = (
  earlier: string,
  later: string,
  description: string,
): void => {
  if (later < earlier) {
    throw new WorkUnitError(
      "WORK_UNIT_TIMESTAMP_INVALID",
      `${description} cannot precede ${earlier}.`,
    );
  }
};

const uniqueNames = (
  values: readonly { readonly name?: string; readonly output_name?: string }[],
  code: "INPUT_BINDING_DUPLICATE" | "OUTPUT_DECLARATION_DUPLICATE",
  label: string,
): void => {
  const names = values.map((value) => value.name ?? value.output_name ?? "");
  if (new Set(names).size !== names.length) {
    throw new WorkUnitError(code, `${label} names must be unique.`);
  }
};

export interface RegisterWorkUnitInput {
  workUnit: PetraWorkUnit;
  inputManifest: PetraWorkerInputManifest;
}

export class InMemoryWorkUnitRegistry {
  readonly #workUnits = new Map<string, DeepReadonly<PetraWorkUnit>>();
  readonly #history = new Map<
    string,
    Map<number, DeepReadonly<PetraWorkUnit>>
  >();
  readonly #inputManifests = new Map<
    string,
    DeepReadonly<PetraWorkerInputManifest>
  >();
  readonly #outputs = new Map<string, StoredOutput>();
  readonly #registrationsByIdempotencyKey = new Map<
    string,
    StoredRegistration
  >();

  get size(): number {
    return this.#workUnits.size;
  }

  get outputManifestCount(): number {
    return this.#outputs.size;
  }

  getWorkUnit(workUnitId: string): DeepReadonly<PetraWorkUnit> | undefined {
    return this.#workUnits.get(workUnitId);
  }

  getWorkUnitRevision(
    workUnitId: string,
    revision: number,
  ): DeepReadonly<PetraWorkUnit> | undefined {
    return this.#history.get(workUnitId)?.get(revision);
  }

  getInputManifest(
    manifestId: string,
  ): DeepReadonly<PetraWorkerInputManifest> | undefined {
    return this.#inputManifests.get(manifestId);
  }

  getOutputManifest(
    manifestId: string,
  ): DeepReadonly<PetraWorkerOutputManifest> | undefined {
    return this.#outputs.get(manifestId)?.manifest;
  }

  register(input: RegisterWorkUnitInput): DeepReadonly<PetraWorkUnit> {
    const { workUnit, inputManifest } = input;
    const fingerprint = canonicalHash(input);
    const existingRegistration = this.#registrationsByIdempotencyKey.get(
      workUnit.spec.idempotency_key,
    );
    if (existingRegistration !== undefined) {
      if (existingRegistration.fingerprint !== fingerprint) {
        throw new WorkUnitError(
          "WORK_UNIT_IDEMPOTENCY_REUSED",
          "The WorkUnit idempotency key is already bound to different work.",
        );
      }
      const existing = this.#workUnits.get(existingRegistration.workUnitId);
      if (existing === undefined) {
        throw new Error("A WorkUnit idempotency record lost its WorkUnit.");
      }
      return existing;
    }
    if (this.#workUnits.has(workUnit.work_unit_id)) {
      throw new WorkUnitError(
        "WORK_UNIT_ID_ALREADY_REGISTERED",
        `WorkUnit ${workUnit.work_unit_id} is already registered.`,
      );
    }
    if (this.#inputManifests.has(inputManifest.worker_input_manifest_id)) {
      throw new WorkUnitError(
        "INPUT_MANIFEST_ID_ALREADY_REGISTERED",
        `Worker input manifest ${inputManifest.worker_input_manifest_id} is already registered.`,
      );
    }

    this.#validateInitialPair(workUnit, inputManifest);
    const storedManifest = immutableCopy(inputManifest);
    const storedWorkUnit = immutableCopy(workUnit);
    this.#inputManifests.set(
      inputManifest.worker_input_manifest_id,
      storedManifest,
    );
    this.#workUnits.set(workUnit.work_unit_id, storedWorkUnit);
    this.#history.set(
      workUnit.work_unit_id,
      new Map([[workUnit.revision, storedWorkUnit]]),
    );
    this.#registrationsByIdempotencyKey.set(workUnit.spec.idempotency_key, {
      fingerprint,
      workUnitId: workUnit.work_unit_id,
    });
    return storedWorkUnit;
  }

  queue(
    workUnitId: string,
    expectedRevision: number,
    queuedAt: string,
  ): DeepReadonly<PetraWorkUnit> {
    const current = this.#requireCurrent(workUnitId, expectedRevision);
    const status = current.status;
    if (status.state === "requested") {
      this.#assertDependenciesReady(current);
      assertTimestampOrder(status.requested_at, queuedAt, "Queue time");
      return this.#advance(
        current,
        {
          state: "queued",
          requested_at: status.requested_at,
          queued_at: queuedAt,
        },
        queuedAt,
      );
    }
    if (
      status.state === "completed" &&
      status.terminal_outcome !== "succeeded" &&
      status.failure.retryable
    ) {
      const input = this.#inputManifestFor(current);
      if (status.attempt >= input.content.resource_limits.max_attempts) {
        throw new WorkUnitError(
          "WORK_UNIT_ATTEMPT_LIMIT_EXCEEDED",
          `WorkUnit ${workUnitId} exhausted its attempt limit.`,
        );
      }
      this.#assertDependenciesReady(current);
      assertTimestampOrder(status.completed_at, queuedAt, "Retry queue time");
      return this.#advance(
        current,
        {
          state: "queued",
          requested_at: status.requested_at,
          queued_at: queuedAt,
        },
        queuedAt,
      );
    }
    throw new WorkUnitError(
      "WORK_UNIT_STATE_INVALID",
      `WorkUnit ${workUnitId} cannot be queued from ${status.state}.`,
    );
  }

  start(
    workUnitId: string,
    expectedRevision: number,
    attempt: number,
    startedAt: string,
  ): DeepReadonly<PetraWorkUnit> {
    const current = this.#requireCurrent(workUnitId, expectedRevision);
    if (current.status.state !== "queued") {
      throw new WorkUnitError(
        "WORK_UNIT_STATE_INVALID",
        `WorkUnit ${workUnitId} must be queued before it starts.`,
      );
    }
    const expectedAttempt = this.#lastAttempt(workUnitId) + 1;
    if (attempt !== expectedAttempt) {
      throw new WorkUnitError(
        "WORK_UNIT_ATTEMPT_INVALID",
        `WorkUnit ${workUnitId} expected attempt ${expectedAttempt}, not ${attempt}.`,
      );
    }
    const input = this.#inputManifestFor(current);
    if (attempt > input.content.resource_limits.max_attempts) {
      throw new WorkUnitError(
        "WORK_UNIT_ATTEMPT_LIMIT_EXCEEDED",
        `WorkUnit ${workUnitId} permits at most ${input.content.resource_limits.max_attempts} attempts.`,
      );
    }
    assertTimestampOrder(current.status.queued_at, startedAt, "Start time");
    return this.#advance(
      current,
      {
        state: "running",
        requested_at: current.status.requested_at,
        queued_at: current.status.queued_at,
        started_at: startedAt,
        attempt,
      },
      startedAt,
    );
  }

  complete(
    manifest: PetraWorkerOutputManifest,
    expectedRevision: number,
  ): DeepReadonly<PetraWorkUnit> {
    const existingOutput = this.#outputs.get(
      manifest.worker_output_manifest_id,
    );
    const fingerprint = canonicalHash(manifest);
    if (existingOutput !== undefined) {
      if (existingOutput.fingerprint !== fingerprint) {
        throw new WorkUnitError(
          "OUTPUT_MANIFEST_ID_ALREADY_REGISTERED",
          `Worker output manifest ${manifest.worker_output_manifest_id} is already bound to different content.`,
        );
      }
      const existingWorkUnit = this.#workUnits.get(manifest.work_unit_id);
      if (existingWorkUnit === undefined) {
        throw new Error("A worker output manifest lost its WorkUnit.");
      }
      return existingWorkUnit;
    }

    const current = this.#requireCurrent(
      manifest.work_unit_id,
      expectedRevision,
    );
    if (current.status.state !== "running") {
      throw new WorkUnitError(
        "WORK_UNIT_STATE_INVALID",
        `WorkUnit ${manifest.work_unit_id} must be running before completion.`,
      );
    }
    this.#validateOutput(current, manifest);
    const outputRef = {
      worker_output_manifest_id: manifest.worker_output_manifest_id,
      content_hash: manifest.content_hash,
    };
    const outcome = manifest.content.outcome;
    let nextStatus: PetraWorkUnit["status"];
    if (outcome.outcome_kind === "succeeded") {
      nextStatus = {
        state: "completed",
        terminal_outcome: "succeeded",
        requested_at: current.status.requested_at,
        queued_at: current.status.queued_at,
        started_at: current.status.started_at,
        completed_at: manifest.content.completed_at,
        attempt: current.status.attempt,
        output_manifest_ref: outputRef,
      };
    } else if (outcome.outcome_kind === "cancelled") {
      nextStatus = {
        state: "cancelled",
        terminal_outcome: "cancelled",
        requested_at: current.status.requested_at,
        queued_at: current.status.queued_at,
        started_at: current.status.started_at,
        cancelled_at: manifest.content.completed_at,
        attempt: current.status.attempt,
        reason: outcome.failure.message,
        output_manifest_ref: outputRef,
      };
    } else {
      nextStatus = {
        state: "completed",
        terminal_outcome: outcome.outcome_kind,
        requested_at: current.status.requested_at,
        queued_at: current.status.queued_at,
        started_at: current.status.started_at,
        completed_at: manifest.content.completed_at,
        attempt: current.status.attempt,
        failure: structuredClone(outcome.failure),
        output_manifest_ref: outputRef,
      };
    }

    const storedOutput = immutableCopy(manifest);
    const updated = this.#advance(current, nextStatus, manifest.reported_at);
    this.#outputs.set(manifest.worker_output_manifest_id, {
      fingerprint,
      manifest: storedOutput,
    });
    return updated;
  }

  failValidation(
    workUnitId: string,
    expectedRevision: number,
    attempt: number,
    failure: WorkerFailure,
    completedAt: string,
  ): DeepReadonly<PetraWorkUnit> {
    const current = this.#requireCurrent(workUnitId, expectedRevision);
    if (current.status.state !== "running") {
      throw new WorkUnitError(
        "WORK_UNIT_STATE_INVALID",
        `WorkUnit ${workUnitId} must be running before validation failure.`,
      );
    }
    if (attempt !== current.status.attempt) {
      throw new WorkUnitError(
        "WORK_UNIT_ATTEMPT_INVALID",
        `Validation failure belongs to attempt ${attempt}, not ${current.status.attempt}.`,
      );
    }
    assertTimestampOrder(
      current.status.started_at,
      completedAt,
      "Validation failure time",
    );
    return this.#advance(
      current,
      {
        state: "completed",
        terminal_outcome: "validation_failed",
        requested_at: current.status.requested_at,
        queued_at: current.status.queued_at,
        started_at: current.status.started_at,
        completed_at: completedAt,
        attempt,
        failure: structuredClone(failure),
      },
      completedAt,
    );
  }

  cancel(
    workUnitId: string,
    expectedRevision: number,
    reason: string,
    cancelledAt: string,
  ): DeepReadonly<PetraWorkUnit> {
    const current = this.#requireCurrent(workUnitId, expectedRevision);
    if (current.spec.cancellation_policy === "atomic") {
      throw new WorkUnitError(
        "WORK_UNIT_NOT_CANCELLABLE",
        `WorkUnit ${workUnitId} is an atomic operation.`,
      );
    }
    if (
      current.spec.cancellation_policy === "checkpoint_then_cancel" &&
      current.status.state === "running"
    ) {
      throw new WorkUnitError(
        "WORK_UNIT_NOT_CANCELLABLE",
        `WorkUnit ${workUnitId} requires a valid checkpoint before cancellation.`,
      );
    }
    if (
      current.status.state === "completed" ||
      current.status.state === "cancelled"
    ) {
      throw new WorkUnitError(
        "WORK_UNIT_STATE_INVALID",
        `Terminal WorkUnit ${workUnitId} cannot be cancelled again.`,
      );
    }
    assertTimestampOrder(current.updated_at, cancelledAt, "Cancellation time");
    const status: PetraWorkUnit["status"] = {
      state: "cancelled",
      terminal_outcome: "cancelled",
      requested_at: current.status.requested_at,
      cancelled_at: cancelledAt,
      attempt:
        current.status.state === "running" ||
        current.status.state === "checkpointed"
          ? current.status.attempt
          : this.#lastAttempt(workUnitId),
      reason,
      ...(current.status.state === "queued" ||
      current.status.state === "running" ||
      current.status.state === "checkpointed"
        ? { queued_at: current.status.queued_at }
        : {}),
      ...(current.status.state === "running" ||
      current.status.state === "checkpointed"
        ? { started_at: current.status.started_at }
        : {}),
    };
    return this.#advance(current, status, cancelledAt);
  }

  #validateInitialPair(
    workUnit: PetraWorkUnit,
    input: PetraWorkerInputManifest,
  ): void {
    if (workUnit.revision !== 1 || workUnit.status.state !== "requested") {
      throw new WorkUnitError(
        "WORK_UNIT_STATE_INVALID",
        "A WorkUnit must enter the registry as requested revision 1.",
      );
    }
    if (canonicalHash(input.content) !== input.content_hash) {
      throw new WorkUnitError(
        "INPUT_MANIFEST_HASH_MISMATCH",
        "The worker input manifest content changed beneath its hash.",
      );
    }
    if (canonicalHash(workUnit.spec) !== workUnit.spec_hash) {
      throw new WorkUnitError(
        "WORK_UNIT_SPEC_HASH_MISMATCH",
        "The WorkUnit specification changed beneath its hash.",
      );
    }
    if (
      input.work_unit_id !== workUnit.work_unit_id ||
      input.project_id !== workUnit.project_id ||
      workUnit.spec.input_manifest_ref.worker_input_manifest_id !==
        input.worker_input_manifest_id ||
      workUnit.spec.input_manifest_ref.content_hash !== input.content_hash ||
      !actorMatches(workUnit.created_by, input.issued_by)
    ) {
      throw new WorkUnitError(
        "WORK_UNIT_MANIFEST_MISMATCH",
        "The WorkUnit and worker input manifest do not describe the same bounded work.",
      );
    }
    if (
      workUnit.created_at !== workUnit.updated_at ||
      workUnit.created_at !== workUnit.status.requested_at ||
      workUnit.created_at !== input.issued_at
    ) {
      throw new WorkUnitError(
        "WORK_UNIT_TIMESTAMP_INVALID",
        "Initial WorkUnit, request, and input-manifest times must agree.",
      );
    }
    if (
      workUnit.spec.dependency_work_unit_ids.includes(workUnit.work_unit_id)
    ) {
      throw new WorkUnitError(
        "WORK_UNIT_DEPENDENCY_NOT_READY",
        "A WorkUnit cannot depend on itself.",
      );
    }
    uniqueNames(
      input.content.inputs,
      "INPUT_BINDING_DUPLICATE",
      "Input binding",
    );
    uniqueNames(
      input.content.expected_outputs,
      "OUTPUT_DECLARATION_DUPLICATE",
      "Expected output",
    );
    const requiredBytes = input.content.expected_outputs
      .filter((output) => output.required)
      .reduce((sum, output) => sum + output.max_bytes, 0);
    if (requiredBytes > input.content.resource_limits.max_output_bytes) {
      throw new WorkUnitError(
        "OUTPUT_LIMIT_INVALID",
        "Required output slots exceed the WorkUnit's total output limit.",
      );
    }
  }

  #validateOutput(
    workUnit: DeepReadonly<PetraWorkUnit>,
    manifest: PetraWorkerOutputManifest,
  ): void {
    if (workUnit.status.state !== "running") {
      throw new Error("Output validation requires a running WorkUnit.");
    }
    const input = this.#inputManifestFor(workUnit);
    if (canonicalHash(manifest.content) !== manifest.content_hash) {
      throw new WorkUnitError(
        "OUTPUT_MANIFEST_HASH_MISMATCH",
        "The worker output manifest content changed beneath its hash.",
      );
    }
    if (
      manifest.project_id !== workUnit.project_id ||
      manifest.worker_input_manifest_id !== input.worker_input_manifest_id ||
      manifest.worker_input_manifest_hash !== input.content_hash ||
      manifest.attempt !== workUnit.status.attempt
    ) {
      throw new WorkUnitError(
        "OUTPUT_MANIFEST_MISMATCH",
        "The worker output manifest does not belong to the running WorkUnit attempt.",
      );
    }
    if (!workerMatches(input.content.worker, manifest.content.worker)) {
      throw new WorkUnitError(
        "OUTPUT_WORKER_MISMATCH",
        "The output was not reported by the worker named in the input manifest.",
      );
    }
    if (manifest.content.started_at !== workUnit.status.started_at) {
      throw new WorkUnitError(
        "WORK_UNIT_TIMESTAMP_INVALID",
        "The output manifest must report the WorkUnit's exact start time.",
      );
    }
    assertTimestampOrder(
      manifest.content.started_at,
      manifest.content.completed_at,
      "Worker completion time",
    );
    assertTimestampOrder(
      manifest.content.completed_at,
      manifest.reported_at,
      "Worker report time",
    );

    const produced = manifest.content.outcome.produced_outputs;
    const outputNames = produced.map((output) => output.output_name);
    const handles = produced.map((output) => output.output_handle);
    if (
      new Set(outputNames).size !== outputNames.length ||
      new Set(handles).size !== handles.length
    ) {
      throw new WorkUnitError(
        "OUTPUT_SLOT_DUPLICATE",
        "Each produced output name and handle must be unique.",
      );
    }
    const declarations = new Map(
      input.content.expected_outputs.map((output) => [
        output.output_name,
        output,
      ]),
    );
    for (const output of produced) {
      const declaration = declarations.get(output.output_name);
      if (declaration === undefined) {
        throw new WorkUnitError(
          "OUTPUT_SLOT_UNDECLARED",
          `Worker produced undeclared output ${output.output_name}.`,
        );
      }
      if (
        output.output_role !== declaration.output_role ||
        output.media_type !== declaration.media_type ||
        !contractMatches(declaration.contract, output.contract)
      ) {
        throw new WorkUnitError(
          "OUTPUT_DECLARATION_MISMATCH",
          `Worker output ${output.output_name} does not match its declared role, media type, or contract.`,
        );
      }
      if (output.byte_size > declaration.max_bytes) {
        throw new WorkUnitError(
          "OUTPUT_SIZE_LIMIT_EXCEEDED",
          `Worker output ${output.output_name} exceeds its declared size limit.`,
        );
      }
    }

    const outcome = manifest.content.outcome;
    if (outcome.outcome_kind === "succeeded") {
      for (const declaration of input.content.expected_outputs) {
        if (
          declaration.required &&
          !outputNames.includes(declaration.output_name)
        ) {
          throw new WorkUnitError(
            "REQUIRED_OUTPUT_MISSING",
            `Successful output omitted required slot ${declaration.output_name}.`,
          );
        }
      }
    } else if (
      input.content.partial_result_policy === "discard" &&
      produced.length > 0
    ) {
      throw new WorkUnitError(
        "PARTIAL_OUTPUT_NOT_PERMITTED",
        "This WorkUnit discards every partial output after an unsuccessful attempt.",
      );
    } else if (
      input.content.partial_result_policy === "retain_diagnostics" &&
      produced.some(
        (output) =>
          output.output_role !== "diagnostic" &&
          output.output_role !== "log" &&
          output.output_role !== "metrics",
      )
    ) {
      throw new WorkUnitError(
        "PARTIAL_OUTPUT_NOT_PERMITTED",
        "This WorkUnit may retain only diagnostics, logs, and metrics after an unsuccessful attempt.",
      );
    }

    const limits = input.content.resource_limits;
    const usage = manifest.content.resource_usage;
    const producedBytes = produced.reduce(
      (sum, output) => sum + output.byte_size,
      0,
    );
    if (
      producedBytes > limits.max_output_bytes ||
      usage.output_bytes > limits.max_output_bytes ||
      usage.output_bytes < producedBytes
    ) {
      throw new WorkUnitError(
        "TOTAL_OUTPUT_LIMIT_EXCEEDED",
        "Worker output bytes violate the WorkUnit's total output envelope.",
      );
    }
    const measuredLimits: [number, number | undefined, string][] = [
      [usage.wall_time_ms, limits.max_wall_time_ms, "wall time"],
      [usage.cpu_time_ms, limits.max_cpu_time_ms, "CPU time"],
      [usage.peak_memory_bytes, limits.max_memory_bytes, "memory"],
      [usage.network_bytes, limits.max_network_bytes, "network bytes"],
      [usage.gpu_time_ms ?? 0, limits.max_gpu_time_ms, "GPU time"],
      [usage.input_tokens ?? 0, limits.max_input_tokens, "input tokens"],
      [usage.output_tokens ?? 0, limits.max_output_tokens, "output tokens"],
      [
        usage.cost?.microunits ?? 0,
        limits.monetary_limit?.max_microunits,
        "monetary cost",
      ],
    ];
    for (const [actual, limit, label] of measuredLimits) {
      if (limit !== undefined && actual > limit) {
        throw new WorkUnitError(
          "RESOURCE_LIMIT_EXCEEDED",
          `Worker ${label} exceeded its hard limit.`,
        );
      }
    }
    if (
      usage.cost !== undefined &&
      limits.monetary_limit !== undefined &&
      usage.cost.currency !== limits.monetary_limit.currency
    ) {
      throw new WorkUnitError(
        "RESOURCE_LIMIT_EXCEEDED",
        "Worker cost currency does not match the authorized monetary limit.",
      );
    }

    const networkBytes = manifest.content.network_activity.reduce(
      (sum, activity) => sum + activity.bytes_sent + activity.bytes_received,
      0,
    );
    if (networkBytes !== usage.network_bytes) {
      throw new WorkUnitError(
        "NETWORK_USAGE_MISMATCH",
        "Network activity must account for the worker's measured network bytes.",
      );
    }
    const networkPolicy = input.content.network_policy;
    if (
      networkPolicy.network_mode === "blocked" &&
      (manifest.content.network_activity.length > 0 || usage.network_bytes > 0)
    ) {
      throw new WorkUnitError(
        "NETWORK_POLICY_VIOLATED",
        "A network-blocked WorkUnit reported outbound activity.",
      );
    }
    if (
      networkPolicy.network_mode === "allowlist" &&
      manifest.content.network_activity.some(
        (activity) =>
          !networkPolicy.destinations.includes(activity.destination),
      )
    ) {
      throw new WorkUnitError(
        "NETWORK_POLICY_VIOLATED",
        "Worker network activity included a destination outside the allowlist.",
      );
    }
  }

  #requireCurrent(
    workUnitId: string,
    expectedRevision: number,
  ): DeepReadonly<PetraWorkUnit> {
    const current = this.#workUnits.get(workUnitId);
    if (current === undefined) {
      throw new WorkUnitError(
        "WORK_UNIT_NOT_REGISTERED",
        `WorkUnit ${workUnitId} is not registered.`,
      );
    }
    if (current.revision !== expectedRevision) {
      throw new WorkUnitError(
        "STALE_WORK_UNIT_REVISION",
        `WorkUnit ${workUnitId} is at revision ${current.revision}, not ${expectedRevision}.`,
      );
    }
    return current;
  }

  #inputManifestFor(
    workUnit: DeepReadonly<PetraWorkUnit>,
  ): DeepReadonly<PetraWorkerInputManifest> {
    const input = this.#inputManifests.get(
      workUnit.spec.input_manifest_ref.worker_input_manifest_id,
    );
    if (input === undefined) {
      throw new Error("A registered WorkUnit lost its input manifest.");
    }
    return input;
  }

  #assertDependenciesReady(workUnit: DeepReadonly<PetraWorkUnit>): void {
    for (const dependencyId of workUnit.spec.dependency_work_unit_ids) {
      const dependency = this.#workUnits.get(dependencyId);
      if (
        dependency?.status.state !== "completed" ||
        dependency.status.terminal_outcome !== "succeeded"
      ) {
        throw new WorkUnitError(
          "WORK_UNIT_DEPENDENCY_NOT_READY",
          `Dependency WorkUnit ${dependencyId} has not succeeded.`,
        );
      }
    }
  }

  #lastAttempt(workUnitId: string): number {
    const history = this.#history.get(workUnitId);
    if (history === undefined) return 0;
    let lastAttempt = 0;
    for (const workUnit of history.values()) {
      if (
        workUnit.status.state === "running" ||
        workUnit.status.state === "checkpointed" ||
        workUnit.status.state === "completed" ||
        workUnit.status.state === "cancelled"
      ) {
        lastAttempt = Math.max(lastAttempt, workUnit.status.attempt);
      }
    }
    return lastAttempt;
  }

  #advance(
    current: DeepReadonly<PetraWorkUnit>,
    status: PetraWorkUnit["status"],
    updatedAt: string,
  ): DeepReadonly<PetraWorkUnit> {
    const next = structuredClone(current) as PetraWorkUnit;
    next.revision += 1;
    next.status = structuredClone(status);
    next.updated_at = updatedAt;
    const stored = immutableCopy(next);
    this.#workUnits.set(next.work_unit_id, stored);
    this.#history.get(next.work_unit_id)?.set(next.revision, stored);
    return stored;
  }
}
