import { createHash } from "node:crypto";

import type {
  PetraGroundedResponse,
  PetraInteractionRun,
  PetraSuggestedActionInvocation,
  PetraSuggestedActionInvocationView,
  PetraWorkUnit,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  SuggestedActionAuthorityPosition,
  SuggestedActionInvocationHistoryEntry,
  SuggestedActionInvocationRecoveryAction,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  derivePetraId,
  workUnitIdForInteractionRun,
  type SuggestedActionInvocationAcceptance,
  type SuggestedActionInvocationAuthorityRepository,
  type SuggestedActionInvocationEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

import type { PostgresCommandAuthorizer } from "./command-authorizer.js";

export type PostgresSuggestedActionInvocationErrorCode =
  | "SUGGESTED_ACTION_INVOCATION_REQUEST_INVALID"
  | "SUGGESTED_ACTION_INVOCATION_NOT_AUTHORIZED"
  | "SUGGESTED_ACTION_INVOCATION_STALE"
  | "SUGGESTED_ACTION_INVOCATION_IDEMPOTENCY_REUSED"
  | "SUGGESTED_ACTION_INVOCATION_STORED_RECORD_CORRUPT";

export class PostgresSuggestedActionInvocationError extends Error {
  readonly code: PostgresSuggestedActionInvocationErrorCode;

  constructor(
    code: PostgresSuggestedActionInvocationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PostgresSuggestedActionInvocationError";
    this.code = code;
  }
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface InvocationRow extends StoredRow {
  command_fingerprint: string;
  command_id: string;
  idempotency_key: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const commandFingerprint = (
  envelope: SuggestedActionInvocationEnvelope,
): string =>
  canonicalHash({
    project_id: envelope.projectId,
    command_id: envelope.request.command_id,
    idempotency_key: envelope.request.idempotency_key,
    inquiry_result_link_id: envelope.request.inquiry_result_link_id,
    expected_action_ref: envelope.request.expected_action_ref,
    response_depth: envelope.request.response_depth,
    actor: envelope.actor,
    capability_grant_id: envelope.capabilityGrantId,
    action_ref: envelope.action.content.action_ref,
    exact_inputs: envelope.action.content.action.basis,
    prompt_hash: envelope.action.content.action.execution.prompt_hash,
  });

const terminal = (work: PetraWorkUnit): boolean =>
  work.status.state === "completed" || work.status.state === "cancelled";

/**
 * Owns the immutable command receipt for one exact SuggestedAction invocation.
 * Work, result, InteractionRun, History, and recovery remain projections over
 * their existing authoritative records; this repository does not duplicate
 * those ledgers.
 */
export class PostgresSuggestedActionInvocationAuthorityRepository implements SuggestedActionInvocationAuthorityRepository {
  readonly #pool: Pool;
  readonly #commandAuthorizer: PostgresCommandAuthorizer;
  readonly #contracts: PetraContractRegistry;

  constructor(
    pool: Pool,
    commandAuthorizer: PostgresCommandAuthorizer,
    contracts = new PetraContractRegistry(),
  ) {
    this.#pool = pool;
    this.#commandAuthorizer = commandAuthorizer;
    this.#contracts = contracts;
  }

  async acceptSuggestedActionInvocation(
    envelope: SuggestedActionInvocationEnvelope,
  ): Promise<SuggestedActionInvocationAcceptance> {
    this.#contracts.assertValid(
      "suggested-action-invocation-request",
      "1.0.0",
      envelope.request,
    );
    this.#contracts.assertValid(
      "suggested-action-view",
      "1.1.0",
      envelope.action,
    );
    this.#validateEnvelope(envelope);
    const fingerprint = commandFingerprint(envelope);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [envelope.projectId],
      );
      if (
        !(await this.#commandAuthorizer.authorize(
          {
            actor: envelope.actor,
            capabilityGrantId: envelope.capabilityGrantId,
            commandName: "InvokeSuggestedAction",
            projectId: envelope.projectId,
          },
          client,
        ))
      ) {
        throw this.#error(
          "SUGGESTED_ACTION_INVOCATION_NOT_AUTHORIZED",
          "The exact capability grant does not authorize InvokeSuggestedAction for this actor and Project.",
        );
      }
      const replay = await this.#replay(client, envelope, fingerprint);
      if (replay !== undefined) {
        await client.query("COMMIT");
        return { invocation: replay, applied: false };
      }
      await this.#requireExactCurrentInputs(client, envelope);
      const protocolThreadId = `suggested-action:${envelope.action.content.action_ref.suggested_action_id}`;
      const protocolRunId = `suggested-action-command:${envelope.request.command_id}`;
      const content: PetraSuggestedActionInvocation["content"] = {
        command_ref: {
          command_id: envelope.request.command_id,
          command_name: "InvokeSuggestedAction",
          idempotency_key: envelope.request.idempotency_key,
          command_fingerprint: fingerprint,
          capability_grant_id: envelope.capabilityGrantId,
          actor: clone(envelope.actor),
          correlation_id: envelope.correlationId,
          submitted_at: envelope.request.submitted_at,
        },
        action_ref: clone(envelope.action.content.action_ref),
        response_depth: "current_graph",
        exact_inputs: {
          project_definition_ref: clone(
            envelope.action.content.action.basis.project_definition_ref,
          ),
          objective_ref: clone(
            envelope.action.content.action.basis.objective_ref,
          ),
          inquiry_result_link_ref: clone(
            envelope.action.content.action.basis.inquiry_result_link_ref,
          ),
          source_result_ref: clone(
            envelope.action.content.action.basis.source_result_ref,
          ),
          snapshot_ref: clone(
            envelope.action.content.action.basis.snapshot_ref,
          ),
          context_packet_ref: clone(
            envelope.action.content.action.basis.context_packet_ref,
          ),
          evidence_packet_ref: clone(
            envelope.action.content.action.basis.evidence_packet_ref,
          ),
          prompt_hash: envelope.action.content.action.execution.prompt_hash,
        },
        expected_work_unit_id: workUnitIdForInteractionRun(protocolRunId),
        interaction: {
          protocol_thread_id: protocolThreadId,
          protocol_run_id: protocolRunId,
        },
        path_convergence: "direct_and_conversational_same_command",
        authority_effect: "none",
      };
      const timestamp = await client.query<{ recorded_at: Date }>(
        "SELECT transaction_timestamp() AS recorded_at",
      );
      const recordedAt = timestamp.rows[0]?.recorded_at.toISOString();
      if (recordedAt === undefined) {
        throw new Error("PostgreSQL did not provide a transaction timestamp.");
      }
      const invocation: PetraSuggestedActionInvocation = {
        schema_name: "petra.suggested-action-invocation",
        schema_version: "1.0.0",
        suggested_action_invocation_id: derivePetraId(
          "suggested_action_invocation",
          envelope.request.command_id,
        ),
        revision: 1,
        project_id: envelope.projectId,
        content,
        content_hash: canonicalHash(content),
        recorded_at: recordedAt,
      };
      this.#contracts.assertValid(
        "suggested-action-invocation",
        "1.0.0",
        invocation,
      );
      const recordHash = canonicalHash(invocation);
      await client.query(
        `INSERT INTO petra.suggested_action_invocations (
           suggested_action_invocation_id, revision, project_id,
           command_id, idempotency_key, command_fingerprint,
           suggested_action_id, action_revision, action_content_hash,
           expected_work_unit_id, actor_id, actor_kind, capability_grant_id,
           correlation_id, protocol_thread_id, protocol_run_id,
           content_hash, recorded_at, record_hash, payload
         ) VALUES (
           $1, 1, $2, $3, $4, $5, $6, 1, $7, $8, $9, $10, $11,
           $12, $13, $14, $15, $16, $17, $18
         )`,
        [
          invocation.suggested_action_invocation_id,
          invocation.project_id,
          content.command_ref.command_id,
          content.command_ref.idempotency_key,
          content.command_ref.command_fingerprint,
          content.action_ref.suggested_action_id,
          content.action_ref.content_hash,
          content.expected_work_unit_id,
          content.command_ref.actor.actor_id,
          content.command_ref.actor.actor_kind,
          content.command_ref.capability_grant_id,
          content.command_ref.correlation_id,
          content.interaction.protocol_thread_id,
          content.interaction.protocol_run_id,
          invocation.content_hash,
          invocation.recorded_at,
          recordHash,
          invocation,
        ],
      );
      await client.query("COMMIT");
      return { invocation, applied: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getSuggestedActionInvocationView(
    projectId: string,
    commandId: string,
  ): Promise<PetraSuggestedActionInvocationView | undefined> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const view = await this.readSuggestedActionInvocationView(
        client,
        projectId,
        commandId,
      );

      await client.query("COMMIT");
      return view;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /** Compose in an existing repeatable-read, read-only transaction. Caller owns its lifecycle. */
  async readSuggestedActionInvocationView(
    client: PoolClient,
    projectId: string,
    commandId: string,
  ): Promise<PetraSuggestedActionInvocationView | undefined> {
    const timestamp = await client.query<{ read_at: Date }>(
      "SELECT transaction_timestamp() AS read_at",
    );
    const readAt = timestamp.rows[0]?.read_at.toISOString();
    if (readAt === undefined) {
      throw new Error("PostgreSQL did not provide a transaction timestamp.");
    }
    const receiptResult = await client.query<StoredRow>(
      `SELECT payload, record_hash
       FROM petra.suggested_action_invocations
      WHERE project_id = $1 AND command_id = $2`,
      [projectId, commandId],
    );
    const receiptRow = receiptResult.rows[0];
    if (receiptRow === undefined) {
      return undefined;
    }
    const invocation = this.#record<PetraSuggestedActionInvocation>(
      "suggested-action-invocation",
      receiptRow,
    );
    const workRows = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
       FROM petra.work_units AS head
       JOIN petra.work_unit_revisions AS revision
         ON revision.work_unit_id = head.work_unit_id
        AND revision.revision = head.current_revision
      WHERE head.project_id = $1 AND head.work_unit_id = $2`,
      [projectId, invocation.content.expected_work_unit_id],
    );
    const workRow = workRows.rows[0];
    const work =
      workRow === undefined
        ? undefined
        : this.#record<PetraWorkUnit>("work-unit", workRow);
    const input =
      work === undefined ? undefined : await this.#inputManifest(client, work);
    const result = await this.#result(client, projectId, invocation, work);
    const interaction = await this.#interaction(client, projectId, invocation);
    const history = await this.#history(
      client,
      projectId,
      invocation.content.expected_work_unit_id,
    );
    const invocationRef = {
      suggested_action_invocation_id: invocation.suggested_action_invocation_id,
      revision: 1 as const,
      content_hash: invocation.content_hash,
      record_hash: receiptRow.record_hash,
    };
    const operationState: PetraSuggestedActionInvocationView["content"]["operation_state"] =
      work === undefined
        ? "accepted"
        : work.status.state === "cancelled"
          ? "cancelled"
          : work.status.state !== "completed"
            ? "running"
            : work.status.terminal_outcome === "succeeded"
              ? "completed"
              : "failed";
    const content: PetraSuggestedActionInvocationView["content"] = {
      view_kind: "invocation",
      invocation_ref: invocationRef,
      invocation,
      operation_state: operationState,
      work:
        work === undefined || input === undefined || workRow === undefined
          ? {
              state: "pending_registration",
              expected_work_unit_id: invocation.content.expected_work_unit_id,
            }
          : {
              state: "available",
              work_unit_ref: {
                work_unit_id: work.work_unit_id,
                revision: work.revision,
                spec_hash: work.spec_hash,
                record_hash: workRow.record_hash,
              },
              input_manifest_ref: input.ref,
              execution_state: work.status.state,
              ...("terminal_outcome" in work.status
                ? { terminal_outcome: work.status.terminal_outcome }
                : {}),
            },
      result:
        result === undefined
          ? work !== undefined && terminal(work)
            ? {
                state: "unavailable",
                reason:
                  "The terminal Work did not produce a durable GroundedResponse.",
              }
            : {
                state: "pending",
                reason:
                  "The exact Work has not yet produced a durable GroundedResponse.",
              }
          : {
              state: "available",
              result_ref: result.ref,
              authority_effect: "none",
            },
      interaction:
        interaction === undefined
          ? {
              ...clone(invocation.content.interaction),
              durable_state: "pending_terminal",
            }
          : {
              ...clone(invocation.content.interaction),
              durable_state: "available",
              interaction_run_ref: interaction.ref,
            },
      interrupt: {
        state: "none_expected",
        delivery_abort_cancels_work: false,
        reconnect: "exact_interaction_replay",
      },
      history: {
        source: "canonical_command_receipt_and_work_unit_revisions",
        command_receipt_ref: clone(invocationRef),
        work_revisions: history,
        destinations: [
          {
            place_role: "work",
            task_intent: "continue_work",
            object_ref: {
              semantic_key: "petra.work-unit",
              object_id: invocation.content.expected_work_unit_id,
            },
          },
          {
            place_role: "history",
            task_intent: "view_history",
            object_ref: {
              semantic_key: "petra.work-unit",
              object_id: invocation.content.expected_work_unit_id,
            },
          },
        ],
      },
      recovery: {
        assessment: "current_server_owned",
        actions: this.#recovery(work, result !== undefined),
      },
      authority: await this.#authority(client, projectId),
      limitations: [
        "SuggestedAction invocation has no scientific or inquiry-resolution authority effect.",
        "Work activity is recorded in canonical WorkUnit revisions rather than duplicated in the Project domain-event stream.",
        "Generic resume is unavailable; recovery exposes only exact retry, replay, cancellation, and inspection operations that are currently eligible.",
      ],
    };
    const view: PetraSuggestedActionInvocationView = {
      schema_name: "petra.suggested-action-invocation-view",
      schema_version: "1.0.0",
      project_id: projectId,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid(
      "suggested-action-invocation-view",
      "1.0.0",
      view,
    );
    return view;
  }

  #validateEnvelope(envelope: SuggestedActionInvocationEnvelope): void {
    const action = envelope.action.content;
    if (
      envelope.action.project_id !== envelope.projectId ||
      action.action.action_kind !== "run_grounded_synthesis" ||
      action.action_ref.content_hash !== canonicalHash(action.action) ||
      envelope.action.content_hash !== canonicalHash(action) ||
      action.readiness.state !== "ready" ||
      action.readiness.grant_ref.capability_grant_id !==
        envelope.capabilityGrantId ||
      envelope.request.inquiry_result_link_id !==
        action.action.basis.inquiry_result_link_ref.project_inquiry_link_id ||
      canonicalize(envelope.request.expected_action_ref) !==
        canonicalize(action.action_ref)
    ) {
      throw this.#error(
        "SUGGESTED_ACTION_INVOCATION_STALE",
        "The command must name one exact, current, ready Work-starting SuggestedAction and its server-selected grant.",
      );
    }
  }

  async #replay(
    client: PoolClient,
    envelope: SuggestedActionInvocationEnvelope,
    fingerprint: string,
  ): Promise<PetraSuggestedActionInvocation | undefined> {
    const result = await client.query<InvocationRow>(
      `SELECT command_id, idempotency_key, command_fingerprint,
              payload, record_hash
         FROM petra.suggested_action_invocations
        WHERE command_id = $1 OR idempotency_key = $2
        FOR SHARE`,
      [envelope.request.command_id, envelope.request.idempotency_key],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    if (
      result.rows.length !== 1 ||
      row.command_id !== envelope.request.command_id ||
      row.idempotency_key !== envelope.request.idempotency_key ||
      row.command_fingerprint !== fingerprint
    ) {
      throw this.#error(
        "SUGGESTED_ACTION_INVOCATION_IDEMPOTENCY_REUSED",
        "The command identity or idempotency key is already bound to a different exact SuggestedAction command.",
      );
    }
    return this.#record<PetraSuggestedActionInvocation>(
      "suggested-action-invocation",
      row,
    );
  }

  async #requireExactCurrentInputs(
    client: PoolClient,
    envelope: SuggestedActionInvocationEnvelope,
  ): Promise<void> {
    const basis = envelope.action.content.action.basis;
    const checks: [string, unknown[]][] = [
      [
        `SELECT 1 FROM petra.project_definitions AS head
          JOIN petra.project_definition_revisions AS revision
            ON revision.project_definition_id = head.project_definition_id
           AND revision.revision = head.current_revision
         WHERE head.project_id = $1
           AND revision.project_definition_id = $2 AND revision.revision = $3
           AND revision.content_hash = $4 AND revision.record_hash = $5`,
        [
          envelope.projectId,
          basis.project_definition_ref.project_definition_id,
          basis.project_definition_ref.revision,
          basis.project_definition_ref.content_hash,
          basis.project_definition_ref.record_hash,
        ],
      ],
      [
        `SELECT 1 FROM petra.project_objectives AS head
          JOIN petra.project_objective_revisions AS revision
            ON revision.objective_id = head.objective_id
           AND revision.revision = head.current_revision
         WHERE head.project_id = $1 AND head.objective_id = $2
           AND revision.revision = $3 AND revision.content_hash = $4
           AND revision.record_hash = $5
           AND revision.payload #>> '{content,status}' = 'active'`,
        [
          envelope.projectId,
          basis.objective_ref.objective_id,
          basis.objective_ref.revision,
          basis.objective_ref.content_hash,
          basis.objective_ref.record_hash,
        ],
      ],
      [
        `SELECT 1 FROM petra.project_inquiry_links
         WHERE project_id = $1 AND project_inquiry_link_id = $2
           AND content_hash = $3 AND record_hash = $4`,
        [
          envelope.projectId,
          basis.inquiry_result_link_ref.project_inquiry_link_id,
          basis.inquiry_result_link_ref.content_hash,
          basis.inquiry_result_link_ref.record_hash,
        ],
      ],
      [
        `SELECT 1 FROM petra.grounded_responses AS head
          JOIN petra.grounded_response_revisions AS revision
            ON revision.grounded_response_id = head.grounded_response_id
           AND revision.revision = head.current_revision
         WHERE head.project_id = $1 AND revision.grounded_response_id = $2
           AND revision.revision = $3 AND revision.content_hash = $4
           AND revision.record_hash = $5 AND revision.cache_state = 'reusable'`,
        [
          envelope.projectId,
          basis.source_result_ref.record_id,
          basis.source_result_ref.revision,
          basis.source_result_ref.content_hash,
          basis.source_result_ref.record_hash,
        ],
      ],
      [
        `SELECT 1 FROM petra.context_packets
         WHERE project_id = $1 AND context_packet_id = $2
           AND revision = $3 AND content_hash = $4
           AND snapshot_id = $5 AND snapshot_revision = $6
           AND snapshot_event_position = $7 AND snapshot_hash = $8`,
        [
          envelope.projectId,
          basis.context_packet_ref.record_id,
          basis.context_packet_ref.revision,
          basis.context_packet_ref.content_hash,
          basis.snapshot_ref.snapshot_id,
          basis.snapshot_ref.snapshot_revision,
          basis.snapshot_ref.event_position,
          basis.snapshot_ref.content_hash,
        ],
      ],
      [
        `SELECT 1 FROM petra.evidence_packets
         WHERE project_id = $1 AND evidence_packet_id = $2
           AND revision = $3 AND content_hash = $4
           AND snapshot_id = $5 AND snapshot_revision = $6
           AND snapshot_event_position = $7 AND snapshot_hash = $8`,
        [
          envelope.projectId,
          basis.evidence_packet_ref.record_id,
          basis.evidence_packet_ref.revision,
          basis.evidence_packet_ref.content_hash,
          basis.snapshot_ref.snapshot_id,
          basis.snapshot_ref.snapshot_revision,
          basis.snapshot_ref.event_position,
          basis.snapshot_ref.content_hash,
        ],
      ],
    ];
    for (const [query, parameters] of checks) {
      const result = await client.query(query, parameters);
      if (result.rows[0] === undefined) {
        throw this.#error(
          "SUGGESTED_ACTION_INVOCATION_STALE",
          "At least one exact SuggestedAction input is no longer current and reusable; regenerate the action from current Project authority.",
        );
      }
    }
  }

  async #inputManifest(
    client: PoolClient,
    work: PetraWorkUnit,
  ): Promise<{
    record: PetraWorkerInputManifest;
    ref: {
      record_id: string;
      revision: number;
      content_hash: string;
      record_hash: string;
    };
  }> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash FROM petra.worker_input_manifests
        WHERE project_id = $1 AND worker_input_manifest_id = $2`,
      [work.project_id, work.spec.input_manifest_ref.worker_input_manifest_id],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw this.#corrupt("The registered Work lost its exact input manifest.");
    }
    const record = this.#record<PetraWorkerInputManifest>(
      "worker-input-manifest",
      row,
    );
    return {
      record,
      ref: {
        record_id: record.worker_input_manifest_id,
        revision: record.revision,
        content_hash: record.content_hash,
        record_hash: row.record_hash,
      },
    };
  }

  async #result(
    client: PoolClient,
    projectId: string,
    invocation: PetraSuggestedActionInvocation,
    work: PetraWorkUnit | undefined,
  ): Promise<
    | {
        record: PetraGroundedResponse;
        ref: {
          schema_name: "petra.grounded-response";
          schema_version: "1.0.0";
          record_id: string;
          revision: number;
          content_hash: string;
          record_hash: string;
        };
      }
    | undefined
  > {
    const direct = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.grounded_responses AS head
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = head.grounded_response_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1 AND head.work_unit_id = $2`,
      [projectId, invocation.content.expected_work_unit_id],
    );
    const directRow = direct.rows[0];
    if (directRow !== undefined) {
      return this.#groundedResponseResult(directRow);
    }
    if (
      work?.status.state !== "completed" ||
      work.status.terminal_outcome !== "succeeded" ||
      work.status.output_manifest_ref === undefined
    ) {
      return undefined;
    }
    const manifestResult = await client.query<StoredRow>(
      `SELECT payload, record_hash
         FROM petra.worker_output_manifests
        WHERE project_id = $1 AND work_unit_id = $2
          AND worker_output_manifest_id = $3`,
      [
        projectId,
        work.work_unit_id,
        work.status.output_manifest_ref.worker_output_manifest_id,
      ],
    );
    const manifestRow = manifestResult.rows[0];
    if (manifestRow === undefined) {
      throw this.#corrupt(
        "The completed SuggestedAction Work lost its exact output manifest.",
      );
    }
    const manifest = this.#record<PetraWorkerOutputManifest>(
      "worker-output-manifest",
      manifestRow,
    );
    if (
      manifest.work_unit_id !== work.work_unit_id ||
      manifest.project_id !== projectId ||
      manifest.content_hash !== work.status.output_manifest_ref.content_hash ||
      manifest.content.outcome.outcome_kind !== "succeeded"
    ) {
      throw this.#corrupt(
        "The completed SuggestedAction Work output manifest conflicts with its terminal revision.",
      );
    }
    const output = manifest.content.outcome.produced_outputs.find(
      (candidate) =>
        candidate.output_name === "grounded_response" &&
        candidate.output_role === "result",
    );
    if (output === undefined) {
      throw this.#corrupt(
        "The completed SuggestedAction Work has no exact grounded-response result output.",
      );
    }
    const exact = invocation.content.exact_inputs;
    const reused = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.grounded_responses AS head
         JOIN petra.grounded_response_revisions AS revision
           ON revision.grounded_response_id = head.grounded_response_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.response_artifact_hash = $2
          AND head.response_artifact_byte_size = $3
          AND head.context_packet_id = $4 AND head.context_packet_hash = $5
          AND head.evidence_packet_id = $6 AND head.evidence_packet_hash = $7
          AND head.snapshot_id = $8 AND head.snapshot_revision = $9
          AND head.snapshot_event_position = $10 AND head.snapshot_hash = $11
        ORDER BY head.grounded_response_id
        LIMIT 2`,
      [
        projectId,
        output.content_hash,
        output.byte_size,
        exact.context_packet_ref.record_id,
        exact.context_packet_ref.content_hash,
        exact.evidence_packet_ref.record_id,
        exact.evidence_packet_ref.content_hash,
        exact.snapshot_ref.snapshot_id,
        exact.snapshot_ref.snapshot_revision,
        exact.snapshot_ref.event_position,
        exact.snapshot_ref.content_hash,
      ],
    );
    if (reused.rows.length > 1) {
      throw this.#corrupt(
        "The completed SuggestedAction Work output resolves to more than one canonical GroundedResponse.",
      );
    }
    const row = reused.rows[0];
    return row === undefined ? undefined : this.#groundedResponseResult(row);
  }

  #groundedResponseResult(row: StoredRow): {
    record: PetraGroundedResponse;
    ref: {
      schema_name: "petra.grounded-response";
      schema_version: "1.0.0";
      record_id: string;
      revision: number;
      content_hash: string;
      record_hash: string;
    };
  } {
    const record = this.#record<PetraGroundedResponse>(
      "grounded-response",
      row,
    );
    return {
      record,
      ref: {
        schema_name: "petra.grounded-response",
        schema_version: "1.0.0",
        record_id: record.grounded_response_id,
        revision: record.revision,
        content_hash: record.content_hash,
        record_hash: row.record_hash,
      },
    };
  }

  async #interaction(
    client: PoolClient,
    projectId: string,
    invocation: PetraSuggestedActionInvocation,
  ): Promise<
    | {
        record: PetraInteractionRun;
        ref: {
          record_id: string;
          revision: number;
          content_hash: string;
          record_hash: string;
        };
      }
    | undefined
  > {
    const result = await client.query<StoredRow>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.interaction_runs AS head
         JOIN petra.interaction_run_revisions AS revision
           ON revision.interaction_run_id = head.interaction_run_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1 AND head.protocol_thread_id = $2
          AND head.protocol_run_id = $3`,
      [
        projectId,
        invocation.content.interaction.protocol_thread_id,
        invocation.content.interaction.protocol_run_id,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    const record = this.#record<PetraInteractionRun>("interaction-run", row);
    return {
      record,
      ref: {
        record_id: record.interaction_run_id,
        revision: record.revision,
        content_hash: record.content_hash,
        record_hash: row.record_hash,
      },
    };
  }

  async #history(
    client: PoolClient,
    projectId: string,
    workUnitId: string,
  ): Promise<SuggestedActionInvocationHistoryEntry[]> {
    const result = await client.query<StoredRow>(
      `SELECT payload, record_hash FROM petra.work_unit_revisions
        WHERE project_id = $1 AND work_unit_id = $2
        ORDER BY revision ASC LIMIT 100`,
      [projectId, workUnitId],
    );
    return result.rows.map((row) => {
      const work = this.#record<PetraWorkUnit>("work-unit", row);
      return {
        work_unit_ref: {
          work_unit_id: work.work_unit_id,
          revision: work.revision,
          spec_hash: work.spec_hash,
          record_hash: row.record_hash,
        },
        state: work.status.state,
        ...("terminal_outcome" in work.status
          ? { terminal_outcome: work.status.terminal_outcome }
          : {}),
        recorded_at: work.updated_at,
      };
    });
  }

  #recovery(
    work: PetraWorkUnit | undefined,
    resultAvailable: boolean,
  ): [
    SuggestedActionInvocationRecoveryAction,
    SuggestedActionInvocationRecoveryAction,
    SuggestedActionInvocationRecoveryAction,
    SuggestedActionInvocationRecoveryAction,
    SuggestedActionInvocationRecoveryAction,
  ] {
    const active =
      work !== undefined &&
      !terminal(work) &&
      work.spec.cancellation_policy === "cancellable";
    return [
      {
        operation: "retry_exact_start",
        eligibility: work === undefined ? "eligible" : "ineligible",
        command_name: "InvokeSuggestedAction",
        reason:
          work === undefined
            ? "Retrying the exact command converges on the same receipt and expected Work identity."
            : "The exact Work is already durably registered.",
      },
      {
        operation: "reconnect_delivery",
        eligibility: work === undefined ? "ineligible" : "eligible",
        reason:
          work === undefined
            ? "Delivery replay becomes available after durable Work registration."
            : "The exact interaction correlation can be replayed without reapplying authority.",
      },
      {
        operation: "cancel_work",
        eligibility: active ? "eligible" : "ineligible",
        ...(active ? { command_name: "CancelWorkUnit" as const } : {}),
        reason: active
          ? "The registered Work is active and explicitly cancellable."
          : "Cancellation is available only while the exact Work is active.",
      },
      {
        operation: "inspect_work",
        eligibility: work === undefined ? "ineligible" : "eligible",
        reason:
          work === undefined
            ? "The Work destination is pending durable registration."
            : "The canonical Work destination and revision History are available.",
      },
      {
        operation: "inspect_result",
        eligibility: resultAvailable ? "eligible" : "ineligible",
        reason: resultAvailable
          ? "The exact durable GroundedResponse is available."
          : "No durable GroundedResponse is available yet.",
      },
    ];
  }

  async #authority(
    client: PoolClient,
    projectId: string,
  ): Promise<SuggestedActionAuthorityPosition> {
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
      event_position: this.#safePosition(row.event_position),
      stream_revision: this.#safePosition(row.stream_revision ?? "0"),
    };
  }

  #record<Value>(schema: string, row: StoredRow): Value {
    const version = (row.payload as { schema_version?: unknown })
      .schema_version;
    if (typeof version !== "string") {
      throw this.#corrupt(`The retained ${schema} has no schema version.`);
    }
    this.#contracts.assertValid(schema, version, row.payload);
    if (row.record_hash !== canonicalHash(row.payload)) {
      throw this.#corrupt(
        `The retained ${schema} record hash does not match its payload.`,
      );
    }
    const record = row.payload as { content?: unknown; content_hash?: unknown };
    if (
      record.content !== undefined &&
      record.content_hash !== canonicalHash(record.content)
    ) {
      throw this.#corrupt(
        `The retained ${schema} content hash does not match its payload.`,
      );
    }
    return clone(row.payload as Value);
  }

  #safePosition(value: string): number {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw this.#corrupt(
        "A retained authority position is outside Petra's safe range.",
      );
    }
    return parsed;
  }

  #corrupt(message: string): PostgresSuggestedActionInvocationError {
    return this.#error(
      "SUGGESTED_ACTION_INVOCATION_STORED_RECORD_CORRUPT",
      message,
    );
  }

  #error(
    code: PostgresSuggestedActionInvocationErrorCode,
    message: string,
  ): PostgresSuggestedActionInvocationError {
    return new PostgresSuggestedActionInvocationError(code, message);
  }
}
