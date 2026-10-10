import { createHash } from "node:crypto";

import type {
  PetraProjectDefinition,
  RegisteredProjectThreadView as PetraProjectThreadView,
  ProjectThreadViewAuthorityPosition,
  ProjectThreadViewCollectionContentV11 as ProjectThreadViewCollectionContent,
  ProjectThreadViewDetailContentV11 as ProjectThreadViewDetailContent,
  ProjectThreadViewThreadSummaryV11 as ProjectThreadViewThreadSummary,
  ProjectThreadViewTurnV11 as ProjectThreadViewTurn,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CanonicalProjectThread,
  ProjectThreadCollectionRequest,
  ProjectThreadLifecycleFilter,
  ProjectThreadViewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectThreadViewErrorCode =
  | "PROJECT_THREAD_VIEW_REQUEST_INVALID"
  | "PROJECT_THREAD_VIEW_DEFINITION_MISSING"
  | "PROJECT_THREAD_VIEW_DESTINATION_UNSUPPORTED"
  | "PROJECT_THREAD_VIEW_STORED_RECORD_CORRUPT";

export class PostgresProjectThreadViewError extends Error {
  readonly code: PostgresProjectThreadViewErrorCode;

  constructor(code: PostgresProjectThreadViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectThreadViewError";
    this.code = code;
  }
}

interface ThreadRow {
  payload: unknown;
  record_hash: string;
  definition_payload: unknown;
}

interface DefinitionRow {
  definition_payload: unknown;
}

interface CountRow {
  total_count: string;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

const THREAD_ID = /^project_thread_[0-9A-HJKMNP-TV-Z]{26}$/u;
const CURSOR = /^offset:([0-9]{1,9})$/u;
const LIFECYCLES: readonly ProjectThreadLifecycleFilter[] = [
  "open",
  "archived",
];

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

export class PostgresProjectThreadViewReader implements ProjectThreadViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async listProjectThreadView(
    projectId: string,
    request: ProjectThreadCollectionRequest = {},
  ): Promise<PetraProjectThreadView | undefined> {
    const query = this.#query(request);
    const offset = this.#offset(query.cursor);
    return this.#readTransaction(async (client, readAt) => {
      const currentDefinition = await this.#currentDefinition(
        client,
        projectId,
      );
      if (currentDefinition === undefined) return undefined;
      this.#assertPetraPlace(currentDefinition);
      const result = await client.query<ThreadRow>(
        `SELECT revision.payload, revision.record_hash,
                definition.payload AS definition_payload
           FROM petra.project_threads AS head
           JOIN petra.project_thread_revisions AS revision
             ON revision.project_thread_id = head.project_thread_id
            AND revision.revision = head.current_revision
           JOIN petra.project_definition_revisions AS definition
             ON definition.project_id = revision.project_id
            AND definition.project_definition_id = revision.project_definition_id
            AND definition.revision = revision.project_definition_revision
            AND definition.content_hash = revision.project_definition_content_hash
          WHERE head.project_id = $1
            AND ($2::text IS NULL OR revision.lifecycle = $2)
          ORDER BY revision.updated_at DESC, head.project_thread_id
          LIMIT $3 OFFSET $4`,
        [projectId, query.lifecycle ?? null, query.limit + 1, offset],
      );
      const hasMore = result.rows.length > query.limit;
      const selected = result.rows.slice(0, query.limit);
      const threads = selected.map((row) => this.#summary(row, projectId));
      const totalCount = await this.#totalCount(
        client,
        projectId,
        query.lifecycle,
      );
      const content: ProjectThreadViewCollectionContent = {
        view_kind: "collection",
        project_definition_ref: this.#definitionRef(currentDefinition),
        query,
        threads,
        page: {
          returned_count: threads.length,
          total_count: totalCount,
          has_more: hasMore,
          ...(hasMore
            ? { next_cursor: `offset:${offset + threads.length}` }
            : {}),
        },
        operations: [
          {
            operation: "create",
            state: "unavailable",
            reason:
              "ProjectThread creation has no registered command in this read-only slice.",
          },
        ],
        authority: await this.#authority(client, projectId),
      };
      return this.#view(projectId, content, readAt);
    });
  }

  async getProjectThreadView(
    projectId: string,
    projectThreadId: string,
  ): Promise<PetraProjectThreadView | undefined> {
    if (!THREAD_ID.test(projectThreadId)) {
      throw new PostgresProjectThreadViewError(
        "PROJECT_THREAD_VIEW_REQUEST_INVALID",
        "A Project thread detail request requires a canonical ProjectThread identity.",
      );
    }
    return this.#readTransaction(async (client, readAt) => {
      const result = await client.query<ThreadRow>(
        `SELECT revision.payload, revision.record_hash,
                definition.payload AS definition_payload
           FROM petra.project_threads AS head
           JOIN petra.project_thread_revisions AS revision
             ON revision.project_thread_id = head.project_thread_id
            AND revision.revision = head.current_revision
           JOIN petra.project_definition_revisions AS definition
             ON definition.project_id = revision.project_id
            AND definition.project_definition_id = revision.project_definition_id
            AND definition.revision = revision.project_definition_revision
            AND definition.content_hash = revision.project_definition_content_hash
          WHERE head.project_id = $1 AND head.project_thread_id = $2`,
        [projectId, projectThreadId],
      );
      const row = result.rows[0];
      if (row === undefined) return undefined;
      const { thread } = this.#record(row, projectId);
      const content: ProjectThreadViewDetailContent = {
        view_kind: "detail",
        summary: this.#summary(row, projectId),
        turns: thread.content.turns.map((turn): ProjectThreadViewTurn => ({
          turn: clone(turn),
          input_representation:
            turn.input.retention_state === "hash_only"
              ? {
                  state: "hash_only",
                  reason: turn.input.limitation,
                  input_hash: turn.input.input_hash,
                }
              : {
                  state: "metadata_only",
                  reason:
                    "The exact input Artifact is retained, but its bytes are not exposed by this metadata-only Project read.",
                  artifact_ref: clone(turn.input.artifact_ref),
                },
          response_representation: {
            state: "metadata_only",
            reason:
              "The exact response Artifact is retained, but its bytes are not exposed by this metadata-only Project read.",
            artifact_ref: clone(turn.response.response_artifact_ref),
          },
          work_destination: {
            role: "work",
            work_unit_ref: clone(turn.execution.work_unit_ref),
          },
        })),
        operations: [
          {
            operation: "append_turn",
            state: "unavailable",
            reason:
              "Appending a turn has no registered command in this read-only slice.",
          },
          {
            operation: "branch",
            state: "unavailable",
            reason:
              "Branch creation has no registered command in this read-only slice.",
          },
          {
            operation: "archive",
            state: "unavailable",
            reason:
              "Archiving has no registered command in this read-only slice.",
          },
          {
            operation: "reopen",
            state: "unavailable",
            reason:
              "Reopening has no registered command in this read-only slice.",
          },
        ],
        authority: await this.#authority(client, projectId),
      };
      return this.#view(projectId, content, readAt);
    });
  }

  #query(request: ProjectThreadCollectionRequest) {
    const limit = request.limit ?? 50;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new PostgresProjectThreadViewError(
        "PROJECT_THREAD_VIEW_REQUEST_INVALID",
        "Project thread collection limit must be an integer from 1 through 100.",
      );
    }
    if (request.cursor !== undefined && !CURSOR.test(request.cursor)) {
      throw new PostgresProjectThreadViewError(
        "PROJECT_THREAD_VIEW_REQUEST_INVALID",
        "Project thread collection cursor is invalid.",
      );
    }
    if (
      request.lifecycle !== undefined &&
      !LIFECYCLES.includes(request.lifecycle)
    ) {
      throw new PostgresProjectThreadViewError(
        "PROJECT_THREAD_VIEW_REQUEST_INVALID",
        "Project thread collection lifecycle is invalid.",
      );
    }
    return {
      limit,
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      ...(request.lifecycle === undefined
        ? {}
        : { lifecycle: request.lifecycle }),
    };
  }

  #offset(cursor: string | undefined): number {
    if (cursor === undefined) return 0;
    const parsed = Number(CURSOR.exec(cursor)?.[1]);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new PostgresProjectThreadViewError(
        "PROJECT_THREAD_VIEW_REQUEST_INVALID",
        "Project thread collection cursor is outside Petra's safe range.",
      );
    }
    return parsed;
  }

  async #currentDefinition(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectDefinition | undefined> {
    const result = await client.query<DefinitionRow>(
      `SELECT revision.payload AS definition_payload
         FROM petra.projects AS project
         JOIN petra.project_definitions AS head
           ON head.project_id = project.project_id
         JOIN petra.project_definition_revisions AS revision
           ON revision.project_definition_id = head.project_definition_id
          AND revision.revision = head.current_revision
        WHERE project.project_id = $1`,
      [projectId],
    );
    const payload = result.rows[0]?.definition_payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("project-definition", "1.0.0", payload);
    const definition = payload as PetraProjectDefinition;
    if (
      definition.project_id !== projectId ||
      definition.content_hash !== canonicalHash(definition.content)
    ) {
      throw this.#corrupt(
        "The current ProjectDefinition cannot be reproduced exactly.",
      );
    }
    return clone(definition);
  }

  #assertPetraPlace(definition: PetraProjectDefinition): void {
    if (!definition.content.supported_places.includes("petra")) {
      throw new PostgresProjectThreadViewError(
        "PROJECT_THREAD_VIEW_DESTINATION_UNSUPPORTED",
        `ProjectDefinition ${definition.project_definition_id} does not register the Petra place.`,
      );
    }
  }

  #record(
    row: ThreadRow,
    projectId: string,
  ): { thread: CanonicalProjectThread; definition: PetraProjectDefinition } {
    this.#contracts.assertValid(
      "project-thread",
      (row.payload as { schema_version: string }).schema_version,
      row.payload,
    );
    this.#contracts.assertValid(
      "project-definition",
      "1.0.0",
      row.definition_payload,
    );
    const thread = row.payload as CanonicalProjectThread;
    const definition = row.definition_payload as PetraProjectDefinition;
    if (
      thread.project_id !== projectId ||
      thread.content_hash !== canonicalHash(thread.content) ||
      row.record_hash !== canonicalHash(thread) ||
      definition.project_id !== projectId ||
      definition.content_hash !== canonicalHash(definition.content) ||
      thread.project_definition_ref.project_definition_id !==
        definition.project_definition_id ||
      thread.project_definition_ref.revision !== definition.revision ||
      thread.project_definition_ref.content_hash !== definition.content_hash ||
      thread.project_definition_ref.definition_family !==
        definition.definition_family
    ) {
      throw this.#corrupt(
        "A ProjectThread or its exact ProjectDefinition failed stored-record validation.",
      );
    }
    this.#assertPetraPlace(definition);
    return { thread: clone(thread), definition: clone(definition) };
  }

  #summary(row: ThreadRow, projectId: string): ProjectThreadViewThreadSummary {
    const { thread } = this.#record(row, projectId);
    const latest = thread.content.turns.at(-1);
    return {
      thread_ref: {
        project_thread_id: thread.project_thread_id,
        revision: thread.revision,
        content_hash: thread.content_hash,
        record_hash: row.record_hash,
      },
      project_definition_ref: clone(thread.project_definition_ref),
      title: thread.content.title,
      task: thread.content.task,
      lifecycle: thread.content.lifecycle,
      origin: clone(thread.content.origin),
      turn_count: thread.content.turns.length,
      latest_turn:
        latest === undefined
          ? {
              state: "unavailable",
              reason: "This thread has no recorded material turn.",
            }
          : {
              state: "available",
              project_turn_id: latest.project_turn_id,
              sequence: latest.sequence,
              ...("snapshot_ref" in latest.context
                ? { snapshot_ref: clone(latest.context.snapshot_ref) }
                : { basis: clone(latest.context.basis) }),
              force: latest.response.force,
              recorded_at: latest.recorded_at,
            },
      retention: clone(thread.content.retention),
      updated_at: thread.updated_at,
    };
  }

  async #totalCount(
    client: PoolClient,
    projectId: string,
    lifecycle: ProjectThreadLifecycleFilter | undefined,
  ): Promise<number> {
    const result = await client.query<CountRow>(
      `SELECT count(*)::text AS total_count
         FROM petra.project_threads AS head
         JOIN petra.project_thread_revisions AS revision
           ON revision.project_thread_id = head.project_thread_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND ($2::text IS NULL OR revision.lifecycle = $2)`,
      [projectId, lifecycle ?? null],
    );
    return this.#safePosition(result.rows[0]?.total_count, "thread total");
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
  ): Promise<ProjectThreadViewAuthorityPosition> {
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
    content: PetraProjectThreadView["content"],
    readAt: string,
  ): PetraProjectThreadView {
    const view: PetraProjectThreadView = {
      schema_name: "petra.project-thread-view",
      schema_version: "1.1.0",
      project_id: projectId,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid(
      "project-thread-view",
      view.schema_version,
      view,
    );
    return view;
  }

  #corrupt(message: string): PostgresProjectThreadViewError {
    return new PostgresProjectThreadViewError(
      "PROJECT_THREAD_VIEW_STORED_RECORD_CORRUPT",
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
