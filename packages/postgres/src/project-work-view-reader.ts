import { createHash } from "node:crypto";

import type {
  PetraProjectDefinition,
  PetraProjectWorkView,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWorkUnit,
  ProjectWorkAttentionSummary,
  ProjectWorkAuthorityPosition,
  ProjectWorkCollectionContent,
  ProjectWorkCollectionQuery,
  ProjectWorkControlSummary,
  ProjectWorkDependencySummary,
  ProjectWorkDetailContent,
  ProjectWorkElapsedSummary,
  ProjectWorkExecutionSummary,
  ProjectWorkOutputSummary,
  ProjectWorkTaskSummary,
  ProjectWorkUnitRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ProjectWorkCollectionRequest,
  ProjectWorkStateFilter,
  ProjectWorkViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import { PostgresProjectObjectLocationViewReader } from "./project-object-location-view-reader.js";

export type PostgresProjectWorkViewErrorCode =
  | "PROJECT_WORK_VIEW_REQUEST_INVALID"
  | "PROJECT_WORK_VIEW_DEFINITION_MISSING"
  | "PROJECT_WORK_VIEW_DESTINATION_UNSUPPORTED"
  | "PROJECT_WORK_VIEW_STORED_RECORD_CORRUPT";

export class PostgresProjectWorkViewError extends Error {
  readonly code: PostgresProjectWorkViewErrorCode;

  constructor(code: PostgresProjectWorkViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectWorkViewError";
    this.code = code;
  }
}

interface DefinitionRow {
  definition_payload: unknown;
}

interface WorkRow {
  work_unit_id: string;
  work_payload: unknown;
  work_record_hash: string;
  input_payload: unknown;
  input_record_hash: string;
  output_payload: unknown;
  output_record_hash: string | null;
}

interface CountRow {
  total_count: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface ComposedWork {
  workUnit: PetraWorkUnit;
  workUnitRef: ProjectWorkUnitRef;
  input: PetraWorkerInputManifest;
  inputRecordHash: string;
  output?: PetraWorkerOutputManifest;
  outputRecordHash?: string;
}

const WORK_UNIT_ID = /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CURSOR = /^offset:([0-9]{1,9})$/u;
const STATES: readonly ProjectWorkStateFilter[] = [
  "requested",
  "queued",
  "running",
  "checkpointed",
  "completed",
  "cancelled",
];

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

export class PostgresProjectWorkViewReader implements ProjectWorkViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #objectLocations: PostgresProjectObjectLocationViewReader;

  constructor(
    pool: Pool,
    contracts = new PetraContractRegistry(),
    objectLocations = new PostgresProjectObjectLocationViewReader(
      pool,
      contracts,
    ),
  ) {
    this.#pool = pool;
    this.#contracts = contracts;
    this.#objectLocations = objectLocations;
  }

  async listProjectWorkView(
    projectId: string,
    request: ProjectWorkCollectionRequest = {},
  ): Promise<PetraProjectWorkView | undefined> {
    const query = this.#collectionQuery(request);
    const offset = this.#offset(query.cursor);
    return this.#readTransaction(async (client, readAt) => {
      const definition = await this.#definition(client, projectId);
      if (definition === undefined) return undefined;
      this.#assertWorkPlace(definition);
      const rows = await this.#selectWorkRows(client, projectId, {
        limit: query.limit + 1,
        offset,
        ...(query.state === undefined ? {} : { state: query.state }),
      });
      const hasMore = rows.length > query.limit;
      const selectedRows = rows.slice(0, query.limit);
      const tasks = selectedRows.map((row) =>
        this.#taskSummary(this.#composeRow(row), definition, readAt),
      );
      const totalCount = await this.#totalCount(client, projectId, query.state);
      const authority = await this.#authority(client, projectId);
      const content: ProjectWorkCollectionContent = {
        view_kind: "collection",
        project_definition_ref: this.#definitionRef(definition),
        query,
        tasks,
        page: {
          returned_count: tasks.length,
          total_count: totalCount,
          has_more: hasMore,
          ...(hasMore
            ? { next_cursor: `offset:${offset + tasks.length}` }
            : {}),
        },
        authority,
      };
      return this.#view(projectId, content, readAt);
    });
  }

  async getProjectWorkView(
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkView | undefined> {
    if (!WORK_UNIT_ID.test(workUnitId)) {
      throw new PostgresProjectWorkViewError(
        "PROJECT_WORK_VIEW_REQUEST_INVALID",
        "A Work detail request requires a canonical WorkUnit identity.",
      );
    }
    return this.#readTransaction((client, readAt) =>
      this.readWorkInSnapshot(client, readAt, projectId, workUnitId),
    );
  }

  /** Internal composition seam; caller owns a REPEATABLE READ READ ONLY transaction. */
  async readWorkInSnapshot(
    client: PoolClient,
    readAt: string,
    projectId: string,
    workUnitId: string,
  ): Promise<PetraProjectWorkView | undefined> {
    const definition = await this.#definition(client, projectId);
    if (definition === undefined) return undefined;
    this.#assertWorkPlace(definition);
    const row = (
      await this.#selectWorkRows(client, projectId, {
        limit: 1,
        offset: 0,
        workUnitId,
      })
    )[0];
    if (row === undefined) return undefined;
    const composed = this.#composeRow(row);
    const authority = await this.#authority(client, projectId);
    const location = await this.#objectLocations.locateProjectObjectInSnapshot(
      client,
      {
        project_id: projectId,
        object_ref: {
          semantic_key: "petra.work-unit",
          object_id: workUnitId,
          revision: composed.workUnit.revision,
        },
        task_intent: "continue_work",
      },
      readAt,
    );
    if (
      location === undefined ||
      location.content.resolution.state !== "current" ||
      location.content.authority.event_position !== authority.event_position ||
      location.content.authority.stream_revision !== authority.stream_revision
    ) {
      throw this.#corrupt(
        "The exact WorkUnit semantic destination could not be reproduced in the Work snapshot.",
      );
    }
    const content: ProjectWorkDetailContent = {
      view_kind: "detail",
      project_definition_ref: this.#definitionRef(definition),
      summary: this.#taskSummary(composed, definition, readAt),
      specification: {
        input_manifest_ref: {
          record_id: composed.input.worker_input_manifest_id,
          revision: composed.input.revision,
          content_hash: composed.input.content_hash,
          record_hash: composed.inputRecordHash,
        },
        task: clone(composed.input.content.task),
        worker: clone(composed.input.content.worker),
        inputs: clone(composed.input.content.inputs),
        expected_outputs: clone(composed.input.content.expected_outputs),
        network_policy: clone(composed.input.content.network_policy),
        partial_result_policy: composed.input.content.partial_result_policy,
        cache_mode: composed.workUnit.spec.cache.cache_mode,
        cancellation_policy: composed.workUnit.spec.cancellation_policy,
        checkpoint_policy: composed.workUnit.spec.checkpoint_policy,
        ...(composed.workUnit.spec.deadline_at === undefined
          ? {}
          : { deadline_at: composed.workUnit.spec.deadline_at }),
      },
      dependencies: await this.#dependencies(client, composed.workUnit),
      stage_plan: {
        state: "unavailable",
        reason:
          "This workflow has no registered stage-plan record; Petra does not reconstruct stages from execution prose.",
      },
      resources: {
        limits: clone(composed.input.content.resource_limits),
        usage:
          composed.output === undefined ||
          composed.outputRecordHash === undefined
            ? {
                state: "unavailable",
                reason:
                  "No current WorkerOutputManifest supplies measured resource use.",
              }
            : {
                state: "measured",
                output_manifest_ref: {
                  record_id: composed.output.worker_output_manifest_id,
                  revision: composed.output.revision,
                  content_hash: composed.output.content_hash,
                  record_hash: composed.outputRecordHash,
                },
                resource_usage: clone(composed.output.content.resource_usage),
              },
      },
      outputs: this.#outputs(composed),
      controls: this.#controls(composed),
      inquiry_linkage: {
        state: "unavailable",
        reason:
          "No ProjectDefinition-valid inquiry mapping is registered for this WorkUnit.",
      },
      review: {
        state: "unavailable",
        reason:
          "No profile-neutral Review linkage is registered for this WorkUnit.",
      },
      semantic_location: clone(location.content),
      coverage: [
        { area: "identity", state: "complete" },
        { area: "execution", state: "complete" },
        { area: "inputs", state: "complete" },
        { area: "dependencies", state: "complete" },
        {
          area: "stages",
          state: "unavailable",
          limitation: "No registered workflow stage plan exists.",
        },
        {
          area: "resources",
          state: composed.output === undefined ? "partial" : "complete",
          ...(composed.output === undefined
            ? { limitation: "Only authorized resource limits are available." }
            : {}),
        },
        {
          area: "outputs",
          state: "partial",
          limitation:
            "Worker output handles are reported, but their Project-level usability and destination are not inferred.",
        },
        {
          area: "controls",
          state: "partial",
          limitation:
            "Policy eligibility is visible, but no actor-authorized Work command is exposed by this read.",
        },
        {
          area: "inquiries",
          state: "unavailable",
          limitation: "Project inquiry mapping is not implemented.",
        },
        {
          area: "review",
          state: "unavailable",
          limitation:
            "Profile-neutral Work-to-Review linkage is not implemented.",
        },
        {
          area: "recovery",
          state: "partial",
          limitation:
            "Current attempt, policies, limits, and retained manifests are visible; cross-module reconciliation is not implemented.",
        },
      ],
      authority,
    };
    return this.#view(projectId, content, readAt);
  }

  #collectionQuery(
    request: ProjectWorkCollectionRequest,
  ): ProjectWorkCollectionQuery {
    const limit = request.limit ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new PostgresProjectWorkViewError(
        "PROJECT_WORK_VIEW_REQUEST_INVALID",
        "Project Work collection limit must be an integer from 1 through 100.",
      );
    }
    if (
      request.cursor !== undefined &&
      (!CURSOR.test(request.cursor) ||
        this.#offset(request.cursor) > 999_999_999)
    ) {
      throw new PostgresProjectWorkViewError(
        "PROJECT_WORK_VIEW_REQUEST_INVALID",
        "Project Work cursor is invalid.",
      );
    }
    if (request.state !== undefined && !STATES.includes(request.state)) {
      throw new PostgresProjectWorkViewError(
        "PROJECT_WORK_VIEW_REQUEST_INVALID",
        "Project Work state filter is invalid.",
      );
    }
    return {
      limit,
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      ...(request.state === undefined ? {} : { state: request.state }),
    };
  }

  #offset(cursor: string | undefined): number {
    if (cursor === undefined) return 0;
    const match = CURSOR.exec(cursor);
    const parsed = match?.[1] === undefined ? Number.NaN : Number(match[1]);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new PostgresProjectWorkViewError(
        "PROJECT_WORK_VIEW_REQUEST_INVALID",
        "Project Work cursor is invalid.",
      );
    }
    return parsed;
  }

  async #definition(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectDefinition | undefined> {
    const result = await client.query<DefinitionRow>(
      `SELECT revision.payload AS definition_payload
         FROM petra.projects AS project
         LEFT JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         LEFT JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = definition.project_definition_id
          AND revision.revision = definition.current_revision
        WHERE project.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    if (row.definition_payload === null) {
      throw new PostgresProjectWorkViewError(
        "PROJECT_WORK_VIEW_DEFINITION_MISSING",
        `Project ${projectId} has no current ProjectDefinition and cannot interpret Work.`,
      );
    }
    this.#contracts.assertValid(
      "project-definition",
      "1.0.0",
      row.definition_payload,
    );
    const definition = row.definition_payload as PetraProjectDefinition;
    if (
      definition.project_id !== projectId ||
      definition.content_hash !== canonicalHash(definition.content)
    ) {
      throw this.#corrupt(
        "The current ProjectDefinition identity or content hash is invalid.",
      );
    }
    return clone(definition);
  }

  #assertWorkPlace(definition: PetraProjectDefinition): void {
    if (!definition.content.supported_places.includes("work")) {
      throw new PostgresProjectWorkViewError(
        "PROJECT_WORK_VIEW_DESTINATION_UNSUPPORTED",
        `ProjectDefinition ${definition.project_definition_id} does not register the Work place.`,
      );
    }
  }

  async #selectWorkRows(
    client: PoolClient,
    projectId: string,
    request: {
      limit: number;
      offset: number;
      state?: ProjectWorkStateFilter;
      workUnitId?: string;
    },
  ): Promise<WorkRow[]> {
    const result = await client.query<WorkRow>(
      `SELECT head.work_unit_id,
              revision.payload AS work_payload,
              revision.record_hash AS work_record_hash,
              input.payload AS input_payload,
              input.record_hash AS input_record_hash,
              output.payload AS output_payload,
              output.record_hash AS output_record_hash
         FROM petra.work_units AS head
         JOIN petra.work_unit_revisions AS revision
           ON revision.work_unit_id = head.work_unit_id
          AND revision.revision = head.current_revision
         JOIN petra.worker_input_manifests AS input
           ON input.worker_input_manifest_id = head.input_manifest_id
         LEFT JOIN petra.worker_output_manifests AS output
           ON output.worker_output_manifest_id = revision.output_manifest_id
        WHERE head.project_id = $1
          AND ($2::text IS NULL OR revision.state = $2)
          AND ($3::text IS NULL OR head.work_unit_id = $3)
        ORDER BY
          CASE
            WHEN revision.state IN ('requested', 'queued') THEN 0
            WHEN revision.state = 'completed'
             AND revision.terminal_outcome <> 'succeeded' THEN 0
            WHEN revision.state = 'running' THEN 1
            ELSE 2
          END,
          revision.updated_at DESC,
          head.work_unit_id
        LIMIT $4 OFFSET $5`,
      [
        projectId,
        request.state ?? null,
        request.workUnitId ?? null,
        request.limit,
        request.offset,
      ],
    );
    return result.rows;
  }

  async #totalCount(
    client: PoolClient,
    projectId: string,
    state: ProjectWorkStateFilter | undefined,
  ): Promise<number> {
    const result = await client.query<CountRow>(
      `SELECT count(*)::text AS total_count
         FROM petra.work_units AS head
         JOIN petra.work_unit_revisions AS revision
           ON revision.work_unit_id = head.work_unit_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND ($2::text IS NULL OR revision.state = $2)`,
      [projectId, state ?? null],
    );
    return this.#safePosition(result.rows[0]?.total_count, "Work total");
  }

  #composeRow(row: WorkRow): ComposedWork {
    this.#contracts.assertValid("work-unit", "1.0.0", row.work_payload);
    this.#contracts.assertValid(
      "worker-input-manifest",
      "1.0.0",
      row.input_payload,
    );
    const workUnit = row.work_payload as PetraWorkUnit;
    const input = row.input_payload as PetraWorkerInputManifest;
    if (
      canonicalHash(workUnit) !== row.work_record_hash ||
      workUnit.work_unit_id !== row.work_unit_id ||
      workUnit.spec_hash !== canonicalHash(workUnit.spec) ||
      canonicalHash(input) !== row.input_record_hash ||
      input.content_hash !== canonicalHash(input.content) ||
      input.work_unit_id !== workUnit.work_unit_id ||
      input.project_id !== workUnit.project_id ||
      input.content_hash !== workUnit.spec.input_manifest_ref.content_hash ||
      input.worker_input_manifest_id !==
        workUnit.spec.input_manifest_ref.worker_input_manifest_id
    ) {
      throw this.#corrupt(
        "A WorkUnit or its exact WorkerInputManifest has an invalid authority chain.",
      );
    }
    let output: PetraWorkerOutputManifest | undefined;
    const statusOutputRef =
      "output_manifest_ref" in workUnit.status
        ? workUnit.status.output_manifest_ref
        : undefined;
    if ((row.output_payload === null) !== (statusOutputRef === undefined)) {
      throw this.#corrupt(
        "A WorkUnit status and stored WorkerOutputManifest disagree.",
      );
    }
    if (row.output_payload !== null) {
      if (row.output_record_hash === null) {
        throw this.#corrupt(
          "A WorkUnit output payload has no immutable record hash.",
        );
      }
      this.#contracts.assertValid(
        "worker-output-manifest",
        "1.0.0",
        row.output_payload,
      );
      output = row.output_payload as PetraWorkerOutputManifest;
      if (
        canonicalHash(output) !== row.output_record_hash ||
        output.content_hash !== canonicalHash(output.content) ||
        output.work_unit_id !== workUnit.work_unit_id ||
        output.project_id !== workUnit.project_id ||
        output.attempt !==
          ("attempt" in workUnit.status ? workUnit.status.attempt : 0) ||
        output.worker_input_manifest_id !== input.worker_input_manifest_id ||
        output.worker_input_manifest_hash !== input.content_hash ||
        statusOutputRef?.worker_output_manifest_id !==
          output.worker_output_manifest_id ||
        statusOutputRef.content_hash !== output.content_hash
      ) {
        throw this.#corrupt(
          "A WorkerOutputManifest does not reproduce its WorkUnit input authority chain.",
        );
      }
    }
    return {
      workUnit: clone(workUnit),
      workUnitRef: {
        work_unit_id: workUnit.work_unit_id,
        revision: workUnit.revision,
        spec_hash: workUnit.spec_hash,
        record_hash: row.work_record_hash,
      },
      input: clone(input),
      inputRecordHash: row.input_record_hash,
      ...(output === undefined || row.output_record_hash === null
        ? {}
        : { output: clone(output), outputRecordHash: row.output_record_hash }),
    };
  }

  #taskSummary(
    work: ComposedWork,
    definition: PetraProjectDefinition,
    readAt: string,
  ): ProjectWorkTaskSummary {
    const outputCount =
      work.output?.content.outcome.produced_outputs.length ?? 0;
    const taskLabel =
      definition.content.terms.find((term) => term.generic_family === "task")
        ?.singular ?? "Work task";
    return {
      work_unit_ref: clone(work.workUnitRef),
      task_label: taskLabel,
      objective: work.workUnit.spec.objective,
      work_mode: work.workUnit.spec.work_mode,
      priority: work.workUnit.spec.priority,
      workflow: {
        workflow_name: work.workUnit.spec.workflow_name,
        workflow_version: work.workUnit.spec.workflow_version,
        task_family: work.input.content.task.task_family,
        task_name: work.input.content.task.task_name,
        task_version: work.input.content.task.task_version,
      },
      execution: this.#execution(work.workUnit),
      attention: this.#attention(work.workUnit),
      elapsed: this.#elapsed(work.workUnit, readAt),
      resource_coverage: work.output === undefined ? "limits_only" : "measured",
      reported_output_count: outputCount,
      stage_plan: {
        state: "unavailable",
        reason: "No registered workflow stage plan is available for this task.",
      },
      destination: {
        role: "work",
        target_ref: clone(work.workUnitRef),
      },
    };
  }

  #execution(workUnit: PetraWorkUnit): ProjectWorkExecutionSummary {
    const status = workUnit.status;
    const attempt = "attempt" in status ? status.attempt : 0;
    const terminalOutcome =
      "terminal_outcome" in status ? status.terminal_outcome : undefined;
    const finishedAt =
      "completed_at" in status
        ? status.completed_at
        : "cancelled_at" in status
          ? status.cancelled_at
          : undefined;
    return {
      state: status.state,
      ...(terminalOutcome === undefined
        ? {}
        : { terminal_outcome: terminalOutcome }),
      attempt,
      requested_at: status.requested_at,
      ...("queued_at" in status && status.queued_at !== undefined
        ? { queued_at: status.queued_at }
        : {}),
      ...("started_at" in status && status.started_at !== undefined
        ? { started_at: status.started_at }
        : {}),
      ...(finishedAt === undefined ? {} : { finished_at: finishedAt }),
      updated_at: workUnit.updated_at,
      ...(status.state === "completed" &&
      status.terminal_outcome !== "succeeded"
        ? { failure: clone(status.failure) }
        : {}),
    };
  }

  #attention(workUnit: PetraWorkUnit): ProjectWorkAttentionSummary {
    const status = workUnit.status;
    if (status.state === "requested") {
      return {
        state: "needs_attention",
        reason_code: "requested",
        reason: "The WorkUnit is registered but has not entered the queue.",
      };
    }
    if (status.state === "queued") {
      return {
        state: "needs_attention",
        reason_code: "queued",
        reason:
          "The WorkUnit is queued; no queue position or start time is inferred.",
      };
    }
    if (status.state === "running" || status.state === "checkpointed") {
      return {
        state: "active",
        reason_code: "running",
        reason:
          status.state === "running"
            ? "The current WorkUnit revision is running."
            : "The current WorkUnit revision records a checkpoint; resumability is not inferred.",
      };
    }
    if (status.state === "cancelled") {
      return {
        state: "settled",
        reason_code: "cancelled",
        reason: "The WorkUnit reached its explicit cancelled outcome.",
      };
    }
    if (status.terminal_outcome === "succeeded") {
      return {
        state: "settled",
        reason_code: "completed",
        reason:
          "The WorkUnit completed operationally; result authority is separate.",
      };
    }
    return {
      state: "needs_attention",
      reason_code: status.failure.retryable
        ? "retryable_failure"
        : "terminal_failure",
      reason: status.failure.retryable
        ? "The WorkUnit failed operationally and its failure is marked retryable."
        : "The WorkUnit failed operationally and is not marked retryable.",
    };
  }

  #elapsed(workUnit: PetraWorkUnit, readAt: string): ProjectWorkElapsedSummary {
    const status = workUnit.status;
    if (!("started_at" in status) || status.started_at === undefined) {
      return {
        state: "unavailable",
        reason: "The WorkUnit has no recorded start time.",
      };
    }
    const terminalAt =
      "completed_at" in status
        ? status.completed_at
        : "cancelled_at" in status
          ? status.cancelled_at
          : undefined;
    const start = Date.parse(status.started_at);
    const finish = Date.parse(terminalAt ?? readAt);
    const milliseconds = finish - start;
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
      throw this.#corrupt("A WorkUnit elapsed-time basis is invalid.");
    }
    return {
      state: "measured",
      milliseconds,
      basis:
        terminalAt === undefined ? "start_to_observation" : "start_to_terminal",
    };
  }

  async #dependencies(
    client: PoolClient,
    workUnit: PetraWorkUnit,
  ): Promise<ProjectWorkDependencySummary[]> {
    if (workUnit.spec.dependency_work_unit_ids.length === 0) return [];
    const result = await client.query<{
      work_unit_id: string;
      payload: unknown;
      record_hash: string;
    }>(
      `SELECT head.work_unit_id, revision.payload, revision.record_hash
         FROM petra.work_units AS head
         JOIN petra.work_unit_revisions AS revision
           ON revision.work_unit_id = head.work_unit_id
          AND revision.revision = head.current_revision
        WHERE head.work_unit_id = ANY($1::text[])`,
      [workUnit.spec.dependency_work_unit_ids],
    );
    const byId = new Map(
      result.rows.map((row) => [row.work_unit_id, row] as const),
    );
    return workUnit.spec.dependency_work_unit_ids.map((dependencyId) => {
      const row = byId.get(dependencyId);
      if (row === undefined) {
        throw this.#corrupt(
          `WorkUnit ${workUnit.work_unit_id} lost dependency ${dependencyId}.`,
        );
      }
      this.#contracts.assertValid("work-unit", "1.0.0", row.payload);
      const dependency = row.payload as PetraWorkUnit;
      if (
        canonicalHash(dependency) !== row.record_hash ||
        dependency.project_id !== workUnit.project_id
      ) {
        throw this.#corrupt(
          "A WorkUnit dependency crossed its Project or failed record-hash validation.",
        );
      }
      return {
        work_unit_ref: {
          work_unit_id: dependency.work_unit_id,
          revision: dependency.revision,
          spec_hash: dependency.spec_hash,
          record_hash: row.record_hash,
        },
        state: dependency.status.state,
        ...(dependency.status.state === "completed" ||
        dependency.status.state === "cancelled"
          ? { terminal_outcome: dependency.status.terminal_outcome }
          : {}),
      };
    });
  }

  #outputs(
    work: ComposedWork,
  ): [ProjectWorkOutputSummary, ...ProjectWorkOutputSummary[]] {
    const produced = new Map(
      (work.output?.content.outcome.produced_outputs ?? []).map((output) => [
        output.output_name,
        output,
      ]),
    );
    if (
      produced.size !==
        (work.output?.content.outcome.produced_outputs.length ?? 0) ||
      [...produced.keys()].some(
        (outputName) =>
          !work.input.content.expected_outputs.some(
            (declaration) => declaration.output_name === outputName,
          ),
      )
    ) {
      throw this.#corrupt(
        "A WorkerOutputManifest reports duplicate or undeclared output slots.",
      );
    }
    const outputs = work.input.content.expected_outputs.map((declaration) => {
      const output = produced.get(declaration.output_name);
      return output === undefined
        ? {
            declaration: clone(declaration),
            report_state: "not_reported" as const,
            availability: {
              state: "unavailable" as const,
              limitation:
                "No current WorkerOutputManifest reports this declared slot.",
            },
          }
        : {
            declaration: clone(declaration),
            report_state: "reported" as const,
            produced_output: clone(output),
            availability: {
              state: "staged_handle_only" as const,
              limitation:
                "The worker reported an immutable staged handle; this view does not infer Project-level registration, validation, or usability.",
            },
          };
    });
    const first = outputs[0];
    if (first === undefined) {
      throw this.#corrupt("A WorkerInputManifest has no declared output.");
    }
    return [first, ...outputs.slice(1)];
  }

  #controls(
    work: ComposedWork,
  ): [
    ProjectWorkControlSummary,
    ProjectWorkControlSummary,
    ProjectWorkControlSummary,
  ] {
    const status = work.workUnit.status;
    const terminal =
      status.state === "completed" || status.state === "cancelled";
    const cancellationState = terminal
      ? ("not_applicable" as const)
      : work.workUnit.spec.cancellation_policy === "atomic"
        ? ("forbidden" as const)
        : ("permitted" as const);
    const retryState =
      status.state === "completed" && status.terminal_outcome !== "succeeded"
        ? status.failure.retryable
          ? status.attempt < work.input.content.resource_limits.max_attempts
            ? ("permitted" as const)
            : ("forbidden" as const)
          : ("forbidden" as const)
        : ("not_applicable" as const);
    return [
      {
        control_name: "cancel",
        policy_state: cancellationState,
        operation_state: "unavailable",
        reason:
          cancellationState === "permitted"
            ? "The WorkUnit policy permits cancellation, but this read cannot establish actor capability or command context."
            : cancellationState === "forbidden"
              ? "The WorkUnit declares atomic cancellation policy."
              : "The WorkUnit is already terminal.",
        consequence:
          "No cancellation is executed or implied by opening this Work view.",
      },
      {
        control_name: "retry",
        policy_state: retryState,
        operation_state: "unavailable",
        reason:
          retryState === "permitted"
            ? "The failure is retryable and an attempt remains, but no actor-authorized retry command is exposed."
            : retryState === "forbidden"
              ? "The failure is not retryable or the declared attempt limit is exhausted."
              : "Retry applies only after a retryable operational failure.",
        consequence:
          "No new attempt is queued by reading or acknowledging this task.",
      },
      {
        control_name: "resume",
        policy_state:
          status.state === "checkpointed" ? "unresolved" : "not_applicable",
        operation_state: "unavailable",
        reason:
          "No registered checkpoint-resume operation or compatibility assessment exists.",
        consequence:
          "A checkpoint is not presented as paused or resumable Work.",
      },
    ];
  }

  #definitionRef(definition: PetraProjectDefinition) {
    return {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    };
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectWorkAuthorityPosition> {
    const result = await client.query<AuthorityRow>(
      `SELECT authority.event_position,
              stream.current_stream_revision AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt("The PostgreSQL authority position is unavailable.");
    }
    return {
      isolation: "repeatable_read",
      event_position: this.#safePosition(row.event_position, "event"),
      stream_revision: this.#safePosition(
        row.stream_revision ?? "0",
        "Project stream revision",
      ),
    };
  }

  #safePosition(value: string | undefined, label: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw this.#corrupt(`${label} is outside Petra's safe range.`);
    }
    return parsed;
  }

  #view(
    projectId: string,
    content: PetraProjectWorkView["content"],
    readAt: string,
  ): PetraProjectWorkView {
    const view: PetraProjectWorkView = {
      schema_name: "petra.project-work-view",
      schema_version: "1.0.0",
      project_id: projectId,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid("project-work-view", "1.0.0", view);
    return view;
  }

  #corrupt(message: string): PostgresProjectWorkViewError {
    return new PostgresProjectWorkViewError(
      "PROJECT_WORK_VIEW_STORED_RECORD_CORRUPT",
      message,
    );
  }

  async #readTransaction<Value>(
    operation: (client: PoolClient, readAt: string) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const timestamp = await client.query<{ read_at: Date }>(
        "SELECT transaction_timestamp() AS read_at",
      );
      const readAt = timestamp.rows[0]?.read_at.toISOString();
      if (readAt === undefined) {
        throw new Error("PostgreSQL did not provide a transaction timestamp.");
      }
      const result = await operation(client, readAt);
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
