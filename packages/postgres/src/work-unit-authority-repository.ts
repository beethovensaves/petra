import { createHash } from "node:crypto";

import type {
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWorkUnit,
  WorkerFailure,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  InMemoryWorkUnitRegistry,
  WorkUnitError,
  type RegisterWorkUnitInput,
  type WorkUnitAuthorityRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

interface PayloadRow {
  payload: unknown;
}

interface RegistrationRow {
  work_unit_id: string;
  registration_hash: string;
}

interface IdRow {
  id: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const mutableWorkUnit = (value: unknown): PetraWorkUnit =>
  structuredClone(value) as PetraWorkUnit;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const statusAttempt = (status: PetraWorkUnit["status"]): number =>
  "attempt" in status ? status.attempt : 0;

const statusOutcome = (status: PetraWorkUnit["status"]): string | null =>
  "terminal_outcome" in status ? status.terminal_outcome : null;

const statusOutputManifestId = (
  status: PetraWorkUnit["status"],
): string | null =>
  "output_manifest_ref" in status
    ? (status.output_manifest_ref?.worker_output_manifest_id ?? null)
    : null;

const statusFailure = (status: PetraWorkUnit["status"]): unknown =>
  status.state === "completed" && status.terminal_outcome !== "succeeded"
    ? status.failure
    : null;

export class PostgresWorkUnitAuthorityRepository implements WorkUnitAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async register(input: RegisterWorkUnitInput): Promise<PetraWorkUnit> {
    this.#contracts.assertValid("work-unit", "1.0.0", input.workUnit);
    this.#contracts.assertValid(
      "worker-input-manifest",
      "1.0.0",
      input.inputManifest,
    );
    const validation = new InMemoryWorkUnitRegistry();
    validation.register(clone(input));
    const fingerprint = canonicalHash(input);

    return this.#transaction(async (client) => {
      const keys = [
        `work-unit:${input.workUnit.work_unit_id}`,
        `work-unit-idempotency:${input.workUnit.spec.idempotency_key}`,
        `worker-input:${input.inputManifest.worker_input_manifest_id}`,
        ...input.workUnit.spec.dependency_work_unit_ids.map(
          (id) => `work-unit:${id}`,
        ),
      ];
      await this.#lock(client, keys);

      const byKey = await client.query<RegistrationRow>(
        `SELECT work_unit_id, registration_hash
           FROM petra.work_units
          WHERE idempotency_key = $1`,
        [input.workUnit.spec.idempotency_key],
      );
      const existing = byKey.rows[0];
      if (existing !== undefined) {
        if (existing.registration_hash !== fingerprint) {
          throw new WorkUnitError(
            "WORK_UNIT_IDEMPOTENCY_REUSED",
            "The WorkUnit idempotency key is already bound to different work.",
          );
        }
        const current = await this.#getWorkUnit(client, existing.work_unit_id);
        if (current === undefined) {
          throw new Error("A persisted WorkUnit registration lost its head.");
        }
        return current;
      }

      const byId = await client.query<IdRow>(
        "SELECT work_unit_id AS id FROM petra.work_units WHERE work_unit_id = $1",
        [input.workUnit.work_unit_id],
      );
      if (byId.rows[0] !== undefined) {
        throw new WorkUnitError(
          "WORK_UNIT_ID_ALREADY_REGISTERED",
          `WorkUnit ${input.workUnit.work_unit_id} is already registered.`,
        );
      }
      const byManifest = await client.query<IdRow>(
        `SELECT worker_input_manifest_id AS id
           FROM petra.worker_input_manifests
          WHERE worker_input_manifest_id = $1`,
        [input.inputManifest.worker_input_manifest_id],
      );
      if (byManifest.rows[0] !== undefined) {
        throw new WorkUnitError(
          "INPUT_MANIFEST_ID_ALREADY_REGISTERED",
          `Worker input manifest ${input.inputManifest.worker_input_manifest_id} is already registered.`,
        );
      }

      await client.query(
        `INSERT INTO petra.work_units (
           work_unit_id, project_id, current_revision, idempotency_key,
           registration_hash, spec_hash, input_manifest_id,
           input_manifest_hash, workflow_name, workflow_version, objective,
           work_mode, priority, cache_mode, cache_key, cancellation_policy,
           checkpoint_policy, deadline_at, capability_grant_id, trace_id,
           created_by_actor_id, created_by_actor_kind, created_at
         ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                   $12, $13, $14, $15, $16, $17::timestamptz, $18, $19,
                   $20, $21, $22::timestamptz)`,
        [
          input.workUnit.work_unit_id,
          input.workUnit.project_id,
          input.workUnit.spec.idempotency_key,
          fingerprint,
          input.workUnit.spec_hash,
          input.inputManifest.worker_input_manifest_id,
          input.inputManifest.content_hash,
          input.workUnit.spec.workflow_name,
          input.workUnit.spec.workflow_version,
          input.workUnit.spec.objective,
          input.workUnit.spec.work_mode,
          input.workUnit.spec.priority,
          input.workUnit.spec.cache.cache_mode,
          input.workUnit.spec.cache.cache_mode === "disabled"
            ? null
            : input.workUnit.spec.cache.cache_key,
          input.workUnit.spec.cancellation_policy,
          input.workUnit.spec.checkpoint_policy,
          input.workUnit.spec.deadline_at ?? null,
          input.workUnit.capability_grant_id,
          input.workUnit.trace_id,
          input.workUnit.created_by.actor_id,
          input.workUnit.created_by.actor_kind,
          input.workUnit.created_at,
        ],
      );
      await this.#insertInputManifest(client, input.inputManifest);
      await this.#insertWorkUnitRevision(client, input.workUnit);
      await this.#insertRegistrationMembers(client, input);
      return clone(input.workUnit);
    });
  }

  getWorkUnit(workUnitId: string): Promise<PetraWorkUnit | undefined> {
    return this.#getWorkUnit(this.#pool, workUnitId);
  }

  async getWorkUnitRevision(
    workUnitId: string,
    revision: number,
  ): Promise<PetraWorkUnit | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload FROM petra.work_unit_revisions
        WHERE work_unit_id = $1 AND revision = $2`,
      [workUnitId, revision],
    );
    return this.#readWorkUnit(result.rows[0]?.payload);
  }

  async getInputManifest(
    manifestId: string,
  ): Promise<PetraWorkerInputManifest | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload FROM petra.worker_input_manifests
        WHERE worker_input_manifest_id = $1`,
      [manifestId],
    );
    return this.#readInputManifest(result.rows[0]?.payload);
  }

  async getOutputManifest(
    manifestId: string,
  ): Promise<PetraWorkerOutputManifest | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT payload FROM petra.worker_output_manifests
        WHERE worker_output_manifest_id = $1`,
      [manifestId],
    );
    return this.#readOutputManifest(result.rows[0]?.payload);
  }

  queue(
    workUnitId: string,
    expectedRevision: number,
    queuedAt: string,
  ): Promise<PetraWorkUnit> {
    return this.#transition(workUnitId, (registry) =>
      mutableWorkUnit(registry.queue(workUnitId, expectedRevision, queuedAt)),
    );
  }

  start(
    workUnitId: string,
    expectedRevision: number,
    attempt: number,
    startedAt: string,
  ): Promise<PetraWorkUnit> {
    return this.#transition(workUnitId, (registry) =>
      mutableWorkUnit(
        registry.start(workUnitId, expectedRevision, attempt, startedAt),
      ),
    );
  }

  async complete(
    manifest: PetraWorkerOutputManifest,
    expectedRevision: number,
  ): Promise<PetraWorkUnit> {
    this.#contracts.assertValid("worker-output-manifest", "1.0.0", manifest);
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `work-unit:${manifest.work_unit_id}`,
        `worker-output:${manifest.worker_output_manifest_id}`,
      ]);
      const existingResult = await client.query<{
        record_hash: string;
        work_unit_id: string;
      }>(
        `SELECT record_hash, work_unit_id
           FROM petra.worker_output_manifests
          WHERE worker_output_manifest_id = $1`,
        [manifest.worker_output_manifest_id],
      );
      const existing = existingResult.rows[0];
      if (existing !== undefined) {
        if (existing.record_hash !== canonicalHash(manifest)) {
          throw new WorkUnitError(
            "OUTPUT_MANIFEST_ID_ALREADY_REGISTERED",
            `Worker output manifest ${manifest.worker_output_manifest_id} is already bound to different content.`,
          );
        }
        const current = await this.#getWorkUnit(client, existing.work_unit_id);
        if (current === undefined) {
          throw new Error("A persisted output manifest lost its WorkUnit.");
        }
        return current;
      }

      await this.#requireHead(client, manifest.work_unit_id);
      const registry = await this.#rehydrate(client, manifest.work_unit_id);
      const next = mutableWorkUnit(
        registry.complete(clone(manifest), expectedRevision),
      );
      this.#contracts.assertValid("work-unit", "1.0.0", next);
      await this.#insertOutputManifest(client, manifest);
      await this.#insertWorkUnitRevision(client, next);
      await this.#advanceHead(client, next);
      return next;
    });
  }

  failValidation(
    workUnitId: string,
    expectedRevision: number,
    attempt: number,
    failure: WorkerFailure,
    completedAt: string,
  ): Promise<PetraWorkUnit> {
    return this.#transition(workUnitId, (registry) =>
      mutableWorkUnit(
        registry.failValidation(
          workUnitId,
          expectedRevision,
          attempt,
          clone(failure),
          completedAt,
        ),
      ),
    );
  }

  cancel(
    workUnitId: string,
    expectedRevision: number,
    reason: string,
    cancelledAt: string,
  ): Promise<PetraWorkUnit> {
    return this.#transition(workUnitId, (registry) =>
      mutableWorkUnit(
        registry.cancel(workUnitId, expectedRevision, reason, cancelledAt),
      ),
    );
  }

  async #transition(
    workUnitId: string,
    transition: (registry: InMemoryWorkUnitRegistry) => PetraWorkUnit,
  ): Promise<PetraWorkUnit> {
    return this.#transaction(async (client) => {
      await this.#lock(client, [`work-unit:${workUnitId}`]);
      await this.#requireHead(client, workUnitId);
      const registry = await this.#rehydrate(client, workUnitId);
      const next = transition(registry);
      this.#contracts.assertValid("work-unit", "1.0.0", next);
      await this.#insertWorkUnitRevision(client, next);
      await this.#advanceHead(client, next);
      return clone(next);
    });
  }

  async #rehydrate(
    client: PoolClient,
    targetWorkUnitId: string,
  ): Promise<InMemoryWorkUnitRegistry> {
    const historyResult = await client.query<{
      work_unit_id: string;
      revision: string;
      payload: unknown;
    }>(
      `WITH RECURSIVE closure(work_unit_id) AS (
         SELECT $1::text
         UNION
         SELECT dependency.dependency_work_unit_id
           FROM petra.work_unit_dependencies AS dependency
           JOIN closure ON closure.work_unit_id = dependency.work_unit_id
       )
       SELECT revision.work_unit_id, revision.revision::text, revision.payload
         FROM closure
         JOIN petra.work_unit_revisions AS revision USING (work_unit_id)
        ORDER BY revision.work_unit_id, revision.revision`,
      [targetWorkUnitId],
    );
    const ids = [...new Set(historyResult.rows.map((row) => row.work_unit_id))];
    const inputResult = await client.query<{
      work_unit_id: string;
      payload: unknown;
    }>(
      `SELECT work_unit_id, payload FROM petra.worker_input_manifests
        WHERE work_unit_id = ANY($1::text[])`,
      [ids],
    );
    const outputResult = await client.query<{
      worker_output_manifest_id: string;
      payload: unknown;
    }>(
      `SELECT worker_output_manifest_id, payload
         FROM petra.worker_output_manifests
        WHERE work_unit_id = ANY($1::text[])`,
      [ids],
    );

    const histories = new Map<string, PetraWorkUnit[]>();
    for (const row of historyResult.rows) {
      const workUnit = this.#readWorkUnit(row.payload);
      if (workUnit === undefined) continue;
      const history = histories.get(row.work_unit_id) ?? [];
      history.push(workUnit);
      histories.set(row.work_unit_id, history);
    }
    const inputs = new Map<string, PetraWorkerInputManifest>();
    for (const row of inputResult.rows) {
      const manifest = this.#readInputManifest(row.payload);
      if (manifest !== undefined) inputs.set(row.work_unit_id, manifest);
    }
    const outputs = new Map<string, PetraWorkerOutputManifest>();
    for (const row of outputResult.rows) {
      const manifest = this.#readOutputManifest(row.payload);
      if (manifest !== undefined) {
        outputs.set(row.worker_output_manifest_id, manifest);
      }
    }

    const registry = new InMemoryWorkUnitRegistry();
    const restored = new Set<string>();
    const restoring = new Set<string>();
    const restore = (workUnitId: string): void => {
      if (restored.has(workUnitId)) return;
      if (restoring.has(workUnitId)) {
        throw new WorkUnitError(
          "WORK_UNIT_DEPENDENCY_NOT_READY",
          "Persisted WorkUnit dependencies contain a cycle.",
        );
      }
      const history = histories.get(workUnitId);
      const input = inputs.get(workUnitId);
      if (history?.[0] === undefined || input === undefined) {
        throw new Error(`Persisted WorkUnit ${workUnitId} is incomplete.`);
      }
      restoring.add(workUnitId);
      for (const dependencyId of history[0].spec.dependency_work_unit_ids) {
        restore(dependencyId);
      }
      registry.register({
        workUnit: clone(history[0]),
        inputManifest: clone(input),
      });
      this.#assertReplay(history[0], registry.getWorkUnit(workUnitId));
      for (const expected of history.slice(1)) {
        const priorRevision = expected.revision - 1;
        const status = expected.status;
        let actual: unknown;
        switch (status.state) {
          case "queued":
            actual = registry.queue(
              workUnitId,
              priorRevision,
              status.queued_at,
            );
            break;
          case "running":
            actual = registry.start(
              workUnitId,
              priorRevision,
              status.attempt,
              status.started_at,
            );
            break;
          case "completed": {
            if (status.output_manifest_ref !== undefined) {
              const output = outputs.get(
                status.output_manifest_ref.worker_output_manifest_id,
              );
              if (output === undefined) {
                throw new Error(
                  "A WorkUnit revision lost its output manifest.",
                );
              }
              actual = registry.complete(clone(output), priorRevision);
            } else if (status.terminal_outcome === "validation_failed") {
              actual = registry.failValidation(
                workUnitId,
                priorRevision,
                status.attempt,
                clone(status.failure),
                status.completed_at,
              );
            } else {
              throw new Error(
                "A failed WorkUnit without an output manifest must be a validation failure.",
              );
            }
            break;
          }
          case "cancelled": {
            if (status.output_manifest_ref !== undefined) {
              const output = outputs.get(
                status.output_manifest_ref.worker_output_manifest_id,
              );
              if (output === undefined) {
                throw new Error(
                  "A cancelled WorkUnit lost its output manifest.",
                );
              }
              actual = registry.complete(clone(output), priorRevision);
            } else {
              actual = registry.cancel(
                workUnitId,
                priorRevision,
                status.reason,
                status.cancelled_at,
              );
            }
            break;
          }
          case "checkpointed":
            throw new Error(
              "Checkpoint transitions are closed until a checkpoint command is defined.",
            );
          case "requested":
            throw new Error("A WorkUnit cannot return to requested state.");
        }
        this.#assertReplay(expected, actual);
      }
      restoring.delete(workUnitId);
      restored.add(workUnitId);
    };
    restore(targetWorkUnitId);
    return registry;
  }

  #assertReplay(expected: PetraWorkUnit, actual: unknown): void {
    if (canonicalize(expected) !== canonicalize(actual)) {
      throw new Error(
        `Persisted WorkUnit ${expected.work_unit_id} revision ${expected.revision} does not replay deterministically.`,
      );
    }
  }

  async #insertInputManifest(
    client: PoolClient,
    manifest: PetraWorkerInputManifest,
  ): Promise<void> {
    const content = manifest.content;
    await client.query(
      `INSERT INTO petra.worker_input_manifests (
         worker_input_manifest_id, revision, work_unit_id, project_id,
         content_hash, task_family, task_name, task_version, executor_kind,
         worker_name, worker_version, runtime_name, runtime_version,
         entrypoint, max_wall_time_ms, max_output_bytes, max_attempts,
         max_parallelism, resource_limits, network_mode, network_policy,
         partial_result_policy, issued_by_actor_id, issued_by_actor_kind,
         issued_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                 $13, $14, $15, $16, $17, $18, $19::jsonb, $20,
                 $21::jsonb, $22, $23, $24, $25::timestamptz, $26,
                 $27::jsonb)`,
      [
        manifest.worker_input_manifest_id,
        manifest.revision,
        manifest.work_unit_id,
        manifest.project_id,
        manifest.content_hash,
        content.task.task_family,
        content.task.task_name,
        content.task.task_version,
        content.worker.executor_kind,
        content.worker.worker_name,
        content.worker.worker_version,
        content.worker.runtime_name,
        content.worker.runtime_version,
        content.worker.entrypoint,
        content.resource_limits.max_wall_time_ms,
        content.resource_limits.max_output_bytes,
        content.resource_limits.max_attempts,
        content.resource_limits.max_parallelism,
        JSON.stringify(content.resource_limits),
        content.network_policy.network_mode,
        JSON.stringify(content.network_policy),
        content.partial_result_policy,
        manifest.issued_by.actor_id,
        manifest.issued_by.actor_kind,
        manifest.issued_at,
        canonicalHash(manifest),
        JSON.stringify(manifest),
      ],
    );
  }

  async #insertRegistrationMembers(
    client: PoolClient,
    input: RegisterWorkUnitInput,
  ): Promise<void> {
    for (const [
      index,
      dependencyId,
    ] of input.workUnit.spec.dependency_work_unit_ids.entries()) {
      await client.query(
        `INSERT INTO petra.work_unit_dependencies (
           work_unit_id, position, dependency_work_unit_id
         ) VALUES ($1, $2, $3)`,
        [input.workUnit.work_unit_id, index + 1, dependencyId],
      );
    }
    for (const [
      index,
      binding,
    ] of input.inputManifest.content.inputs.entries()) {
      const artifact =
        binding.binding_kind === "artifact" ? binding : undefined;
      const record = binding.binding_kind === "record" ? binding : undefined;
      await client.query(
        `INSERT INTO petra.worker_input_bindings (
           worker_input_manifest_id, position, binding_kind, binding_name,
           artifact_id, artifact_content_hash, artifact_byte_size, record_id,
           record_revision, snapshot_hash, binding
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
        [
          input.inputManifest.worker_input_manifest_id,
          index + 1,
          binding.binding_kind,
          binding.name,
          artifact?.artifact_id ?? null,
          artifact?.content_hash ?? null,
          artifact?.byte_size ?? null,
          record?.record_id ?? null,
          record?.record_revision ?? null,
          record?.snapshot_hash ?? null,
          JSON.stringify(binding),
        ],
      );
    }
    for (const [
      index,
      output,
    ] of input.inputManifest.content.expected_outputs.entries()) {
      await client.query(
        `INSERT INTO petra.worker_expected_outputs (
           worker_input_manifest_id, position, output_name, output_role,
           required, media_type, max_bytes, contract, declaration
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)`,
        [
          input.inputManifest.worker_input_manifest_id,
          index + 1,
          output.output_name,
          output.output_role,
          output.required,
          output.media_type,
          output.max_bytes,
          output.contract === undefined
            ? null
            : JSON.stringify(output.contract),
          JSON.stringify(output),
        ],
      );
    }
  }

  async #insertOutputManifest(
    client: PoolClient,
    manifest: PetraWorkerOutputManifest,
  ): Promise<void> {
    const outcome = manifest.content.outcome;
    const failure =
      outcome.outcome_kind === "succeeded" ? null : outcome.failure;
    await client.query(
      `INSERT INTO petra.worker_output_manifests (
         worker_output_manifest_id, revision, work_unit_id, project_id,
         attempt, worker_input_manifest_id, worker_input_manifest_hash,
         content_hash, outcome_kind, started_at, completed_at, reported_at,
         failure, resource_usage, network_activity, diagnostics, record_hash,
         payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                 $10::timestamptz, $11::timestamptz, $12::timestamptz,
                 $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17,
                 $18::jsonb)`,
      [
        manifest.worker_output_manifest_id,
        manifest.revision,
        manifest.work_unit_id,
        manifest.project_id,
        manifest.attempt,
        manifest.worker_input_manifest_id,
        manifest.worker_input_manifest_hash,
        manifest.content_hash,
        outcome.outcome_kind,
        manifest.content.started_at,
        manifest.content.completed_at,
        manifest.reported_at,
        failure === null ? null : JSON.stringify(failure),
        JSON.stringify(manifest.content.resource_usage),
        JSON.stringify(manifest.content.network_activity),
        JSON.stringify(manifest.content.diagnostics),
        canonicalHash(manifest),
        JSON.stringify(manifest),
      ],
    );
    for (const [index, output] of outcome.produced_outputs.entries()) {
      await client.query(
        `INSERT INTO petra.worker_produced_outputs (
           worker_output_manifest_id, position, output_name, output_role,
           output_handle, content_hash, byte_size, media_type, contract,
           produced_output
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)`,
        [
          manifest.worker_output_manifest_id,
          index + 1,
          output.output_name,
          output.output_role,
          output.output_handle,
          output.content_hash,
          output.byte_size,
          output.media_type,
          output.contract === undefined
            ? null
            : JSON.stringify(output.contract),
          JSON.stringify(output),
        ],
      );
    }
  }

  async #insertWorkUnitRevision(
    client: PoolClient,
    workUnit: PetraWorkUnit,
  ): Promise<void> {
    await client.query(
      `INSERT INTO petra.work_unit_revisions (
         work_unit_id, revision, project_id, spec_hash, input_manifest_id,
         state, terminal_outcome, attempt, output_manifest_id, failure,
         status, updated_at, record_hash, payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb,
                 $11::jsonb, $12::timestamptz, $13, $14::jsonb)`,
      [
        workUnit.work_unit_id,
        workUnit.revision,
        workUnit.project_id,
        workUnit.spec_hash,
        workUnit.spec.input_manifest_ref.worker_input_manifest_id,
        workUnit.status.state,
        statusOutcome(workUnit.status),
        statusAttempt(workUnit.status),
        statusOutputManifestId(workUnit.status),
        statusFailure(workUnit.status) === null
          ? null
          : JSON.stringify(statusFailure(workUnit.status)),
        JSON.stringify(workUnit.status),
        workUnit.updated_at,
        canonicalHash(workUnit),
        JSON.stringify(workUnit),
      ],
    );
  }

  async #advanceHead(client: PoolClient, next: PetraWorkUnit): Promise<void> {
    const result = await client.query(
      `UPDATE petra.work_units
          SET current_revision = $2
        WHERE work_unit_id = $1 AND current_revision = $2 - 1`,
      [next.work_unit_id, next.revision],
    );
    if (result.rowCount !== 1) {
      throw new WorkUnitError(
        "STALE_WORK_UNIT_REVISION",
        "The WorkUnit head changed before its new revision could commit.",
      );
    }
  }

  async #requireHead(client: PoolClient, workUnitId: string): Promise<void> {
    const result = await client.query(
      "SELECT 1 FROM petra.work_units WHERE work_unit_id = $1 FOR UPDATE",
      [workUnitId],
    );
    if (result.rows[0] === undefined) {
      throw new WorkUnitError(
        "WORK_UNIT_NOT_REGISTERED",
        `WorkUnit ${workUnitId} is not registered.`,
      );
    }
  }

  async #getWorkUnit(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    workUnitId: string,
  ): Promise<PetraWorkUnit | undefined> {
    const result = await queryable.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.work_units AS head
         JOIN petra.work_unit_revisions AS revision
           ON revision.work_unit_id = head.work_unit_id
          AND revision.revision = head.current_revision
        WHERE head.work_unit_id = $1`,
      [workUnitId],
    );
    return this.#readWorkUnit(result.rows[0]?.payload);
  }

  #readWorkUnit(payload: unknown): PetraWorkUnit | undefined {
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("work-unit", "1.0.0", payload);
    return clone(payload as PetraWorkUnit);
  }

  #readInputManifest(payload: unknown): PetraWorkerInputManifest | undefined {
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("worker-input-manifest", "1.0.0", payload);
    return clone(payload as PetraWorkerInputManifest);
  }

  #readOutputManifest(payload: unknown): PetraWorkerOutputManifest | undefined {
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("worker-output-manifest", "1.0.0", payload);
    return clone(payload as PetraWorkerOutputManifest);
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...new Set(keys)].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Result>(
    operation: (client: PoolClient) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
