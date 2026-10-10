import { createHash } from "node:crypto";

import type {
  PetraContextPacket,
  PetraGroundedResponse,
  PetraInteractionRun,
  PetraProjectThreadV11,
  PetraWorkUnit,
  ProjectThreadTurn,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  conversationResultRecord,
  copilotHash,
  type CopilotTurn,
  type CopilotTerminal,
  type CanonicalProjectThread,
  type ProjectThreadAuthorityRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectThreadErrorCode =
  | "PROJECT_THREAD_CONTENT_HASH_MISMATCH"
  | "PROJECT_THREAD_ID_CONFLICT"
  | "PROJECT_THREAD_REVISION_CONFLICT"
  | "PROJECT_THREAD_REVISION_GAP"
  | "PROJECT_THREAD_BINDING_UNSUPPORTED"
  | "PROJECT_THREAD_RELATION_INVALID"
  | "PROJECT_THREAD_STORED_RECORD_CORRUPT";

export class PostgresProjectThreadError extends Error {
  readonly code: PostgresProjectThreadErrorCode;

  constructor(code: PostgresProjectThreadErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectThreadError";
    this.code = code;
  }
}

interface HeadRow {
  project_id: string;
  current_revision: string;
  created_by_actor_id: string;
  created_at: Date;
}

interface StoredRow {
  payload: unknown;
  record_hash: string;
}

interface PayloadRow {
  payload: unknown;
}

interface PgError {
  code?: string;
  message?: string;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

export class PostgresProjectThreadAuthorityRepository implements ProjectThreadAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;
  readonly #transactionClient: PoolClient | undefined;

  constructor(
    pool: Pool,
    contracts = new PetraContractRegistry(),
    transactionClient?: PoolClient,
  ) {
    this.#pool = pool;
    this.#contracts = contracts;
    this.#transactionClient = transactionClient;
  }

  inTransaction(client: PoolClient): PostgresProjectThreadAuthorityRepository {
    return new PostgresProjectThreadAuthorityRepository(
      this.#pool,
      this.#contracts,
      client,
    );
  }

  async registerProjectThreadRevision(
    thread: CanonicalProjectThread,
  ): Promise<CanonicalProjectThread> {
    this.#contracts.assertValid(
      "project-thread",
      thread.schema_version,
      thread,
    );
    if (thread.content_hash !== canonicalHash(thread.content)) {
      throw new PostgresProjectThreadError(
        "PROJECT_THREAD_CONTENT_HASH_MISMATCH",
        "ProjectThread content_hash does not identify its exact canonical content.",
      );
    }
    this.#assertLocalStructure(thread);

    const client = this.#transactionClient ?? (await this.#pool.connect());
    try {
      if (this.#transactionClient === undefined)
        await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`project-thread:${thread.project_thread_id}`],
      );
      const heads = await client.query<HeadRow>(
        `SELECT project_id, current_revision::text, created_by_actor_id,
                created_at
           FROM petra.project_threads
          WHERE project_thread_id = $1
          FOR UPDATE`,
        [thread.project_thread_id],
      );
      const head = heads.rows[0];
      const recordHash = canonicalHash(thread);

      if (head === undefined) {
        if (thread.revision !== 1 || thread.lineage.lineage_kind !== "root") {
          throw new PostgresProjectThreadError(
            "PROJECT_THREAD_REVISION_GAP",
            "A new ProjectThread must begin at revision 1 with root lineage.",
          );
        }
      } else {
        if (
          head.project_id !== thread.project_id ||
          head.created_by_actor_id !== thread.created_by.actor_id ||
          head.created_at.toISOString() !== thread.created_at
        ) {
          throw new PostgresProjectThreadError(
            "PROJECT_THREAD_ID_CONFLICT",
            "ProjectThread identity cannot be rebound to another Project or creator.",
          );
        }
        const existing = await client.query<StoredRow>(
          `SELECT payload, record_hash
             FROM petra.project_thread_revisions
            WHERE project_thread_id = $1 AND revision = $2`,
          [thread.project_thread_id, thread.revision],
        );
        if (existing.rows[0]?.record_hash === recordHash) {
          if (this.#transactionClient === undefined)
            await client.query("COMMIT");
          return clone(thread);
        }
        if (existing.rows[0] !== undefined) {
          throw new PostgresProjectThreadError(
            "PROJECT_THREAD_REVISION_CONFLICT",
            "The ProjectThread revision is already bound to different canonical content.",
          );
        }
        if (thread.revision !== Number(head.current_revision) + 1) {
          throw new PostgresProjectThreadError(
            "PROJECT_THREAD_REVISION_GAP",
            "ProjectThread revisions must advance contiguously.",
          );
        }
      }

      await this.#assertRevisionHistory(client, thread);
      await this.#assertExactBindings(client, thread);

      if (head === undefined) {
        await client.query(
          `INSERT INTO petra.project_threads (
             project_thread_id, project_id, current_revision,
             created_by_actor_id, created_by_actor_kind, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            thread.project_thread_id,
            thread.project_id,
            thread.revision,
            thread.created_by.actor_id,
            thread.created_by.actor_kind,
            thread.created_at,
          ],
        );
      }
      await this.#insertRevision(client, thread, recordHash);
      if (head !== undefined) {
        await client.query(
          `UPDATE petra.project_threads
              SET current_revision = $2
            WHERE project_thread_id = $1`,
          [thread.project_thread_id, thread.revision],
        );
      }
      if (this.#transactionClient === undefined) await client.query("COMMIT");
      return clone(thread);
    } catch (error) {
      if (this.#transactionClient === undefined) await client.query("ROLLBACK");
      if (error instanceof PostgresProjectThreadError) throw error;
      const pgError = error as PgError;
      if (pgError.code === "23505") {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_REVISION_CONFLICT",
          pgError.message ?? "ProjectThread identity conflicts with authority.",
        );
      }
      if (pgError.code === "23503" || pgError.code === "23514") {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_RELATION_INVALID",
          pgError.message ?? "ProjectThread exact references do not resolve.",
        );
      }
      throw error;
    } finally {
      if (this.#transactionClient === undefined) client.release();
    }
  }

  async getProjectThread(
    projectId: string,
    projectThreadId: string,
    revision?: number,
  ): Promise<CanonicalProjectThread | undefined> {
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.project_threads AS thread
         JOIN petra.project_thread_revisions AS record
           ON record.project_thread_id = thread.project_thread_id
          AND record.revision = COALESCE($3::bigint, thread.current_revision)
        WHERE thread.project_id = $1 AND thread.project_thread_id = $2`,
      [projectId, projectThreadId, revision ?? null],
    );
    return result.rows[0] === undefined
      ? undefined
      : this.#stored(result.rows[0]);
  }

  async listProjectThreads(
    projectId: string,
  ): Promise<CanonicalProjectThread[]> {
    const result = await (
      this.#transactionClient ?? this.#pool
    ).query<StoredRow>(
      `SELECT record.payload, record.record_hash
         FROM petra.project_threads AS thread
         JOIN petra.project_thread_revisions AS record
           ON record.project_thread_id = thread.project_thread_id
          AND record.revision = thread.current_revision
        WHERE thread.project_id = $1
        ORDER BY record.updated_at DESC, thread.project_thread_id`,
      [projectId],
    );
    return result.rows.map((row) => this.#stored(row));
  }

  #assertLocalStructure(thread: CanonicalProjectThread): void {
    const turns = thread.content.turns;
    const turnIds = new Set<string>();
    for (const [index, turn] of turns.entries()) {
      const expectedSequence = index + 1;
      if (
        turn.sequence !== expectedSequence ||
        (expectedSequence === 1 && turn.previous_turn_id !== undefined) ||
        (expectedSequence > 1 &&
          turn.previous_turn_id !== turns[index - 1]?.project_turn_id)
      ) {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_RELATION_INVALID",
          "ProjectThread turns must be contiguous and name the exact preceding turn.",
        );
      }
      if (turnIds.has(turn.project_turn_id)) {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_RELATION_INVALID",
          "ProjectThread turn identities must be unique within the thread.",
        );
      }
      turnIds.add(turn.project_turn_id);
      if (
        thread.schema_version === "1.1.0" &&
        turn.context.context_record_ref.schema_name ===
          "petra.copilot-context" &&
        turn.response.result_record_ref.schema_name ===
          "petra.conversation-result" &&
        "basis" in turn.context &&
        turn.compaction.state === "unmodified"
      )
        continue;
      if (
        turn.context.context_record_ref.schema_name !==
          "petra.context-packet" ||
        turn.context.context_record_ref.schema_version !== "1.0.0" ||
        turn.response.result_record_ref.schema_name !==
          "petra.grounded-response" ||
        turn.response.result_record_ref.schema_version !== "1.0.0" ||
        turn.compaction.state !== "unmodified"
      ) {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_BINDING_UNSUPPORTED",
          "V022 supports ContextPacket, GroundedResponse, and unmodified context bindings; other profile records need an additive authority resolver.",
        );
      }
    }
  }

  async #assertRevisionHistory(
    client: PoolClient,
    thread: CanonicalProjectThread,
  ): Promise<void> {
    if (thread.revision > 1) {
      const prior = await client.query<PayloadRow>(
        `SELECT payload
           FROM petra.project_thread_revisions
          WHERE project_thread_id = $1 AND revision = $2`,
        [thread.project_thread_id, thread.revision - 1],
      );
      const parent = prior.rows[0]?.payload as
        CanonicalProjectThread | undefined;
      if (
        parent === undefined ||
        thread.lineage.lineage_kind !== "revision" ||
        thread.lineage.parent_revision !== parent.revision ||
        thread.lineage.parent_hash !== parent.content_hash ||
        !same(thread.content.origin, parent.content.origin) ||
        thread.content.turns.length < parent.content.turns.length ||
        thread.content.turns.length > parent.content.turns.length + 1 ||
        !same(
          thread.content.turns.slice(0, parent.content.turns.length),
          parent.content.turns,
        )
      ) {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_REVISION_CONFLICT",
          "A ProjectThread revision must preserve its origin and immutable turn prefix, and may append at most one turn.",
        );
      }
    }

    const origin = thread.content.origin;
    if (origin.origin_kind === "branch") {
      if (
        origin.parent_thread_ref.project_thread_id === thread.project_thread_id
      ) {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_RELATION_INVALID",
          "A branch must have a different stable thread identity from its parent.",
        );
      }
      const parent = await client.query<PayloadRow>(
        `SELECT payload
           FROM petra.project_thread_revisions
          WHERE project_id = $1 AND project_thread_id = $2
            AND revision = $3 AND content_hash = $4`,
        [
          thread.project_id,
          origin.parent_thread_ref.project_thread_id,
          origin.parent_thread_ref.revision,
          origin.parent_thread_ref.content_hash,
        ],
      );
      const parentThread = parent.rows[0]?.payload as
        CanonicalProjectThread | undefined;
      if (
        parentThread === undefined ||
        !parentThread.content.turns.some(
          (turn) => turn.project_turn_id === origin.parent_turn_id,
        )
      ) {
        throw new PostgresProjectThreadError(
          "PROJECT_THREAD_RELATION_INVALID",
          "A branch must bind an exact parent revision and a turn retained by that revision.",
        );
      }
    }
  }

  async #assertExactBindings(
    client: PoolClient,
    thread: CanonicalProjectThread,
  ): Promise<void> {
    for (const turn of thread.content.turns) {
      await this.#assertTurnBindings(
        client,
        thread.project_id,
        turn,
        thread.project_thread_id,
      );
    }
  }

  async #assertTurnBindings(
    client: PoolClient,
    projectId: string,
    turn: ProjectThreadTurn | PetraProjectThreadV11["content"]["turns"][number],
    projectThreadId: string,
  ): Promise<void> {
    if ("basis" in turn.context) {
      await this.#assertNativeConversationBindings(
        client,
        projectId,
        projectThreadId,
        turn,
      );
      return;
    }
    const contextRef = turn.context.context_record_ref;
    const contextResult = await client.query<PayloadRow>(
      `SELECT payload FROM petra.context_packets
        WHERE context_packet_id = $1 AND revision = $2
          AND project_id = $3 AND content_hash = $4`,
      [
        contextRef.record_id,
        contextRef.revision,
        projectId,
        contextRef.content_hash,
      ],
    );
    const context = contextResult.rows[0]?.payload as
      PetraContextPacket | undefined;
    if (
      context === undefined ||
      !same(turn.context.snapshot_ref, context.snapshot_ref) ||
      turn.context.included_object_count !==
        context.content.included_objects.length ||
      turn.context.omission_count !== context.content.omissions.length ||
      turn.context.coverage_state !== context.content.coverage.state ||
      turn.context.coverage_statement !== context.content.coverage.statement
    ) {
      this.#invalid("The turn context does not match its exact ContextPacket.");
    }

    const runRef = turn.execution.interaction_run_ref;
    const runResult = await client.query<PayloadRow>(
      `SELECT record.payload
         FROM petra.interaction_runs AS head
         JOIN petra.interaction_run_revisions AS record
           ON record.interaction_run_id = head.interaction_run_id
        WHERE head.project_id = $1 AND record.interaction_run_id = $2
          AND record.revision = $3 AND record.content_hash = $4`,
      [
        projectId,
        runRef.interaction_run_id,
        runRef.revision,
        runRef.content_hash,
      ],
    );
    const run = runResult.rows[0]?.payload as PetraInteractionRun | undefined;
    if (
      run === undefined ||
      run.content.lifecycle.state !== "completed" ||
      turn.input.input_hash !== run.content.input.input_hash ||
      turn.input.source_message_id !== run.content.input.source_message_id ||
      !same(
        turn.execution.work_unit_ref,
        run.content.correlation.work_unit_ref,
      ) ||
      turn.authority_context.actor.actor_id !==
        run.content.authority_context.actor.actor_id ||
      turn.authority_context.actor.actor_kind !==
        run.content.authority_context.actor.actor_kind ||
      turn.authority_context.capability_grant_id !==
        run.content.authority_context.capability_grant_id ||
      !same(
        turn.authority_context.privacy_profile_ref,
        run.content.authority_context.privacy_profile_ref,
      ) ||
      !same(
        turn.authority_context.budget_profile_ref,
        run.content.authority_context.budget_profile_ref,
      )
    ) {
      this.#invalid(
        "The turn input or authority context does not match its exact completed InteractionRun.",
      );
    }

    const workRef = turn.execution.work_unit_ref;
    const workResult = await client.query<PayloadRow>(
      `SELECT payload FROM petra.work_unit_revisions
        WHERE work_unit_id = $1 AND revision = $2
          AND project_id = $3 AND spec_hash = $4`,
      [workRef.work_unit_id, workRef.revision, projectId, workRef.spec_hash],
    );
    const work = workResult.rows[0]?.payload as PetraWorkUnit | undefined;
    if (
      work === undefined ||
      work.status.state !== "completed" ||
      work.status.terminal_outcome !== "succeeded"
    ) {
      this.#invalid(
        "A completed turn requires its exact successful WorkUnit revision.",
      );
    }

    const resultRef = turn.response.result_record_ref;
    const responseResult = await client.query<PayloadRow>(
      `SELECT record.payload
         FROM petra.grounded_responses AS head
         JOIN petra.grounded_response_revisions AS record
           ON record.grounded_response_id = head.grounded_response_id
        WHERE head.project_id = $1 AND record.grounded_response_id = $2
          AND record.revision = $3 AND record.content_hash = $4`,
      [
        projectId,
        resultRef.record_id,
        resultRef.revision,
        resultRef.content_hash,
      ],
    );
    const response = responseResult.rows[0]?.payload as
      PetraGroundedResponse | undefined;
    if (
      response === undefined ||
      !same(response.content.context_packet_ref, {
        context_packet_id: contextRef.record_id,
        revision: contextRef.revision,
        content_hash: contextRef.content_hash,
      }) ||
      !same(response.content.snapshot_ref, turn.context.snapshot_ref) ||
      !same(
        response.content.interaction_ref.interaction_run_ref,
        turn.execution.interaction_run_ref,
      ) ||
      !same(
        response.content.interaction_ref.work_unit_ref,
        turn.execution.work_unit_ref,
      ) ||
      !same(
        response.content.response_artifact_ref,
        turn.response.response_artifact_ref,
      )
    ) {
      this.#invalid(
        "The completed response does not match the turn's exact context, execution, Work, and artifact bindings.",
      );
    }

    if (turn.input.retention_state === "retained_artifact") {
      await this.#requireArtifact(client, turn.input.artifact_ref);
    }
    await this.#requireArtifact(client, turn.response.response_artifact_ref);
  }

  async #requireArtifact(
    client: PoolClient,
    artifact: {
      artifact_id: string;
      content_hash: string;
      byte_size: number;
      media_type: string;
    },
  ): Promise<void> {
    const result = await client.query(
      `SELECT 1 FROM petra.artifacts
        WHERE artifact_id = $1 AND content_hash = $2
          AND byte_size = $3 AND media_type = $4`,
      [
        artifact.artifact_id,
        artifact.content_hash,
        artifact.byte_size,
        artifact.media_type,
      ],
    );
    if (result.rowCount !== 1) {
      this.#invalid(
        "A ProjectThread artifact reference does not resolve exactly.",
      );
    }
  }

  async #assertNativeConversationBindings(
    client: PoolClient,
    projectId: string,
    projectThreadId: string,
    turn: PetraProjectThreadV11["content"]["turns"][number],
  ): Promise<void> {
    if (!("basis" in turn.context))
      this.#invalid(
        "Native conversation context requires its exact native basis.",
      );
    const result = await client.query<{
      payload: CopilotTurn;
      terminal: CopilotTerminal;
      context_record_id: string;
      context_hash: string;
      turn_content_hash: string;
      result_record_id: string;
      result_hash: string;
      input_artifact_id: string;
      response_artifact_id: string;
      run_payload: PetraInteractionRun;
      work_payload: PetraWorkUnit;
      capture: string;
      owned_thread_id: string;
    }>(
      `SELECT t.payload,x.payload AS terminal,c.context_record_id,c.context_hash,
      c.turn_content_hash,c.input_artifact_id,r.result_record_id,r.result_hash,r.response_artifact_id,
      ir.payload AS run_payload,w.payload AS work_payload,b.payload->>'capture' AS capture,b.project_thread_id AS owned_thread_id
      FROM petra.project_copilot_turns t
      JOIN petra.project_copilot_terminals x USING(run_id)
      JOIN petra.project_copilot_context_refs c USING(run_id)
      JOIN petra.project_copilot_result_refs r USING(run_id)
      JOIN petra.project_copilot_owner_bindings b ON b.run_id=t.run_id AND b.revision=1
      JOIN petra.interaction_run_revisions ir ON ir.interaction_run_id=$3 AND ir.revision=$4 AND ir.content_hash=$5
      JOIN petra.work_unit_revisions w ON w.work_unit_id=$6 AND w.revision=$7 AND w.spec_hash=$8
      WHERE t.run_id=$1 AND t.project_id=$2 AND c.project_id=$2 AND ir.project_id=$2 AND w.project_id=$2`,
      [
        turn.input.source_message_id,
        projectId,
        turn.execution.interaction_run_ref.interaction_run_id,
        turn.execution.interaction_run_ref.revision,
        turn.execution.interaction_run_ref.content_hash,
        turn.execution.work_unit_ref.work_unit_id,
        turn.execution.work_unit_ref.revision,
        turn.execution.work_unit_ref.spec_hash,
      ],
    );
    const row = result.rows[0];
    if (row === undefined)
      this.#invalid(
        "A native conversation must resolve its retained content and canonical execution owners.",
      );
    const { payload, terminal, run_payload: run, work_payload: work } = row;
    this.#contracts.assertValid(
      "copilot-turn",
      payload.schema_version,
      payload,
    );
    this.#contracts.assertValid("interaction-run", "1.0.0", run);
    this.#contracts.assertValid("work-unit", "1.0.0", work);
    const {
      terminal: ignoredTerminal,
      input_manifest: ignoredManifest,
      ...original
    } = payload;
    void ignoredTerminal;
    void ignoredManifest;
    if (
      row.owned_thread_id !== projectThreadId ||
      payload.actor_id !== turn.authority_context.actor.actor_id ||
      turn.authority_context.actor.actor_kind !== "human" ||
      payload.context.project_id !== projectId ||
      row.turn_content_hash !== copilotHash(original) ||
      turn.input.input_hash !== row.turn_content_hash ||
      turn.input.retention_state !== "retained_artifact" ||
      turn.input.artifact_ref.artifact_id !== row.input_artifact_id ||
      turn.context.context_record_ref.schema_name !== "petra.copilot-context" ||
      turn.context.context_record_ref.schema_version !== "1.0.0" ||
      turn.context.context_record_ref.record_id !== row.context_record_id ||
      turn.context.context_record_ref.revision !== 1 ||
      turn.context.context_record_ref.content_hash !== row.context_hash ||
      row.context_hash !== payload.context.content_hash ||
      !same(turn.context.basis, payload.context.basis) ||
      turn.context.included_object_count !== payload.context.records.length ||
      turn.context.coverage_state !== "bounded" ||
      turn.response.result_record_ref.schema_name !==
        "petra.conversation-result" ||
      turn.response.result_record_ref.schema_version !== "1.0.0" ||
      turn.response.result_record_ref.record_id !== row.result_record_id ||
      turn.response.result_record_ref.revision !== 1 ||
      turn.response.result_record_ref.content_hash !== row.result_hash ||
      row.result_hash !==
        copilotHash(conversationResultRecord(payload, terminal)) ||
      turn.response.response_artifact_ref.artifact_id !==
        row.response_artifact_id ||
      turn.response.state !== terminal.state ||
      turn.project_definition_ref.project_definition_id !==
        payload.context.basis.definition.record_id ||
      turn.project_definition_ref.revision !==
        payload.context.basis.definition.revision ||
      turn.project_definition_ref.content_hash !==
        payload.context.basis.definition.content_hash ||
      turn.project_definition_ref.definition_family !==
        payload.context.definition_family ||
      run.content.correlation.protocol_thread_id !== payload.thread_id ||
      run.content.correlation.protocol_run_id !== payload.run_id ||
      run.content.input.input_hash !== turn.input.input_hash ||
      run.content.input.source_message_id !== turn.input.source_message_id ||
      run.content.correlation.work_unit_ref.work_unit_id !==
        work.work_unit_id ||
      run.content.correlation.work_unit_ref.spec_hash !== work.spec_hash ||
      run.content.authority_context.actor.actor_id !== payload.actor_id ||
      run.content.authority_context.actor.actor_kind !== "human" ||
      run.content.authority_context.capability_grant_id !==
        work.capability_grant_id ||
      turn.authority_context.capability_grant_id !== work.capability_grant_id ||
      !same(
        turn.authority_context.privacy_profile_ref,
        run.content.authority_context.privacy_profile_ref,
      ) ||
      !same(
        turn.authority_context.budget_profile_ref,
        run.content.authority_context.budget_profile_ref,
      ) ||
      (work.status.state !== "completed" &&
        work.status.state !== "cancelled") ||
      (row.capture !== "historical_adoption" &&
        (run.content.lifecycle.state !== terminal.state ||
          (terminal.state === "completed"
            ? work.status.state !== "completed" ||
              work.status.terminal_outcome !== "succeeded"
            : terminal.state === "cancelled"
              ? work.status.state !== "cancelled"
              : work.status.state !== "completed" ||
                ![
                  "worker_failed",
                  "validation_failed",
                  "timed_out",
                  "resource_exhausted",
                ].includes(work.status.terminal_outcome))))
    ) {
      this.#invalid(
        "The native turn's content, outcome, definition or authority differs from its exact owners.",
      );
    }
    await this.#requireArtifact(client, turn.input.artifact_ref);
    await this.#requireArtifact(client, turn.response.response_artifact_ref);
  }

  async #insertRevision(
    client: PoolClient,
    thread: CanonicalProjectThread,
    recordHash: string,
  ): Promise<void> {
    const origin = thread.content.origin;
    const lineage = thread.lineage;
    await client.query(
      `INSERT INTO petra.project_thread_revisions (
         project_thread_id, revision, project_id,
         project_definition_id, project_definition_revision,
         project_definition_content_hash, lineage_parent_revision,
         lineage_parent_hash, lifecycle, origin_kind,
         branch_parent_thread_id, branch_parent_revision, branch_parent_hash,
         branch_parent_turn_id, branch_continuation_mode, turn_count,
         content_hash, schema_name, schema_version, record_hash, payload,
         updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22
       )`,
      [
        thread.project_thread_id,
        thread.revision,
        thread.project_id,
        thread.project_definition_ref.project_definition_id,
        thread.project_definition_ref.revision,
        thread.project_definition_ref.content_hash,
        lineage.lineage_kind === "revision" ? lineage.parent_revision : null,
        lineage.lineage_kind === "revision" ? lineage.parent_hash : null,
        thread.content.lifecycle,
        origin.origin_kind,
        origin.origin_kind === "branch"
          ? origin.parent_thread_ref.project_thread_id
          : null,
        origin.origin_kind === "branch"
          ? origin.parent_thread_ref.revision
          : null,
        origin.origin_kind === "branch"
          ? origin.parent_thread_ref.content_hash
          : null,
        origin.origin_kind === "branch" ? origin.parent_turn_id : null,
        origin.origin_kind === "branch" ? origin.continuation_mode : null,
        thread.content.turns.length,
        thread.content_hash,
        thread.schema_name,
        thread.schema_version,
        recordHash,
        JSON.stringify(thread),
        thread.updated_at,
      ],
    );
    for (const turn of thread.content.turns) {
      await this.#insertTurn(client, thread, turn);
    }
  }

  async #insertTurn(
    client: PoolClient,
    thread: CanonicalProjectThread,
    turn: ProjectThreadTurn | PetraProjectThreadV11["content"]["turns"][number],
  ): Promise<void> {
    const inputArtifact =
      turn.input.retention_state === "retained_artifact"
        ? turn.input.artifact_ref
        : undefined;
    const context = turn.context.context_record_ref;
    const snapshot =
      "snapshot_ref" in turn.context ? turn.context.snapshot_ref : undefined;
    const run = turn.execution.interaction_run_ref;
    const work = turn.execution.work_unit_ref;
    const result = turn.response.result_record_ref;
    const artifact = turn.response.response_artifact_ref;
    await client.query(
      `INSERT INTO petra.project_thread_turn_bindings (
         project_thread_id, thread_revision, turn_position, project_turn_id,
         previous_project_turn_id, project_id, project_definition_id,
         project_definition_revision, project_definition_content_hash,
         objective_id, objective_revision, objective_content_hash,
         input_retention_state, input_hash, source_message_id,
         input_artifact_id, input_artifact_hash, input_artifact_byte_size,
         input_artifact_media_type, context_schema_name,
         context_schema_version, context_packet_id, context_packet_revision,
         context_packet_hash, snapshot_id, snapshot_revision,
         snapshot_event_position, snapshot_hash, interaction_run_id,
         interaction_run_revision, interaction_run_hash, work_unit_id,
         work_unit_revision, work_unit_spec_hash, result_schema_name,
         result_schema_version, grounded_response_id,
         grounded_response_revision, grounded_response_hash,
         response_artifact_id, response_artifact_hash,
         response_artifact_byte_size, response_artifact_media_type,
         authority_actor_id, authority_actor_kind, capability_grant_id,
         recorded_at, turn_payload, native_run_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23,
         $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34,
         $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45,
         $46, $47, $48::jsonb, $49
       )`,
      [
        thread.project_thread_id,
        thread.revision,
        turn.sequence,
        turn.project_turn_id,
        turn.previous_turn_id ?? null,
        thread.project_id,
        turn.project_definition_ref.project_definition_id,
        turn.project_definition_ref.revision,
        turn.project_definition_ref.content_hash,
        turn.objective_ref?.objective_id ?? null,
        turn.objective_ref?.revision ?? null,
        turn.objective_ref?.content_hash ?? null,
        turn.input.retention_state,
        turn.input.input_hash,
        turn.input.source_message_id,
        inputArtifact?.artifact_id ?? null,
        inputArtifact?.content_hash ?? null,
        inputArtifact?.byte_size ?? null,
        inputArtifact?.media_type ?? null,
        context.schema_name,
        context.schema_version,
        snapshot === undefined ? null : context.record_id,
        snapshot === undefined ? null : context.revision,
        snapshot === undefined ? null : context.content_hash,
        snapshot?.snapshot_id ?? null,
        snapshot?.snapshot_revision ?? null,
        snapshot?.event_position ?? null,
        snapshot?.content_hash ?? null,
        run.interaction_run_id,
        run.revision,
        run.content_hash,
        work.work_unit_id,
        work.revision,
        work.spec_hash,
        result.schema_name,
        result.schema_version,
        snapshot === undefined ? null : result.record_id,
        snapshot === undefined ? null : result.revision,
        snapshot === undefined ? null : result.content_hash,
        artifact.artifact_id,
        artifact.content_hash,
        artifact.byte_size,
        artifact.media_type,
        turn.authority_context.actor.actor_id,
        turn.authority_context.actor.actor_kind,
        turn.authority_context.capability_grant_id,
        turn.recorded_at,
        JSON.stringify(turn),
        snapshot === undefined ? turn.input.source_message_id : null,
      ],
    );
  }

  #stored(row: StoredRow): CanonicalProjectThread {
    const schemaVersion = (row.payload as { schema_version?: string })
      .schema_version;
    if (schemaVersion !== "1.0.0" && schemaVersion !== "1.1.0")
      this.#invalid("Unsupported retained ProjectThread version.");
    this.#contracts.assertValid("project-thread", schemaVersion, row.payload);
    const thread = row.payload as CanonicalProjectThread;
    if (
      row.record_hash !== canonicalHash(thread) ||
      thread.content_hash !== canonicalHash(thread.content)
    ) {
      throw new PostgresProjectThreadError(
        "PROJECT_THREAD_STORED_RECORD_CORRUPT",
        "Stored ProjectThread hashes do not identify the validated payload.",
      );
    }
    return clone(thread);
  }

  #invalid(message: string): never {
    throw new PostgresProjectThreadError(
      "PROJECT_THREAD_RELATION_INVALID",
      message,
    );
  }
}
