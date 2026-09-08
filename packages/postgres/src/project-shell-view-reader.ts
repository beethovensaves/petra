import { createHash } from "node:crypto";

import type {
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectShellView,
  PetraProjectionCheckpoint,
  ProjectShellContent,
  ProjectShellProjectionSummary,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { derivePetraId, type ProjectShellViewReader } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectShellViewErrorCode =
  "PROJECT_SHELL_DEFINITION_MISSING" | "PROJECT_SHELL_STORED_RECORD_CORRUPT";

export class PostgresProjectShellViewError extends Error {
  readonly code: PostgresProjectShellViewErrorCode;

  constructor(code: PostgresProjectShellViewErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectShellViewError";
    this.code = code;
  }
}

interface ShellRow {
  project_id: string;
  project_payload: unknown;
  definition_payload: unknown;
  objective_payload: unknown;
}

interface AuthorityRow {
  event_position: string;
  stream_revision: string | null;
}

interface PayloadRow {
  payload: unknown;
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

export class PostgresProjectShellViewReader implements ProjectShellViewReader {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async listProjectShellViews(): Promise<PetraProjectShellView[]> {
    return this.#readTransaction(async (client, readAt) => {
      const rows = await this.#selectShellRows(client);
      const views: PetraProjectShellView[] = [];
      for (const row of rows) {
        views.push(await this.#compose(client, row, readAt));
      }
      return views;
    });
  }

  async getProjectShellView(
    projectId: string,
  ): Promise<PetraProjectShellView | undefined> {
    return this.#readTransaction(async (client, readAt) => {
      const rows = await this.#selectShellRows(client, projectId);
      const row = rows[0];
      return row === undefined
        ? undefined
        : await this.#compose(client, row, readAt);
    });
  }

  async #selectShellRows(
    client: PoolClient,
    projectId?: string,
  ): Promise<ShellRow[]> {
    const result = await client.query<ShellRow>(
      `SELECT project.project_id,
              project_revision.payload AS project_payload,
              definition_revision.payload AS definition_payload,
              objective_revision.payload AS objective_payload
         FROM petra.projects AS project
         JOIN petra.project_revisions AS project_revision
           ON project_revision.project_id = project.project_id
          AND project_revision.revision = project.current_revision
         LEFT JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         LEFT JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id =
                definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
         LEFT JOIN petra.project_objective_focus AS focus
           ON focus.project_id = project.project_id
         LEFT JOIN petra.project_objective_revisions AS objective_revision
           ON objective_revision.project_id = focus.project_id
          AND objective_revision.objective_id = focus.objective_id
          AND objective_revision.revision = focus.objective_revision
          AND objective_revision.content_hash = focus.objective_content_hash
        WHERE ($1::text IS NULL OR project.project_id = $1)
        ORDER BY lower(project_revision.name), project.project_id`,
      [projectId ?? null],
    );
    return result.rows;
  }

  async #compose(
    client: PoolClient,
    row: ShellRow,
    readAt: string,
  ): Promise<PetraProjectShellView> {
    const project = this.#project(row.project_payload);
    if (row.definition_payload === null) {
      throw new PostgresProjectShellViewError(
        "PROJECT_SHELL_DEFINITION_MISSING",
        `Project ${project.project_id} has no current ProjectDefinition and cannot be interpreted by the shell.`,
      );
    }
    const definition = this.#definition(row.definition_payload);
    const objective =
      row.objective_payload === null
        ? undefined
        : this.#objective(row.objective_payload);
    if (
      project.project_id !== row.project_id ||
      definition.project_id !== project.project_id ||
      (objective !== undefined && objective.project_id !== project.project_id)
    ) {
      throw new PostgresProjectShellViewError(
        "PROJECT_SHELL_STORED_RECORD_CORRUPT",
        "The Project shell composition crossed a Project authority boundary.",
      );
    }

    const authority = await this.#authorityPosition(client, project.project_id);
    const checkpoint = await this.#projectionCheckpoint(
      client,
      project.project_id,
    );
    const projection = this.#projectionSummary(checkpoint);
    const attention = this.#projectionAttention(project.project_id, projection);
    const content: ProjectShellContent = {
      project: {
        project_id: project.project_id,
        revision: project.revision,
        name: project.name,
        ...(project.description === undefined
          ? {}
          : { description: project.description }),
        status: project.status,
        updated_at: project.updated_at,
      },
      definition: {
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
        definition_family: definition.definition_family,
        label: definition.content.label,
        description: definition.content.description,
        kernel_compatibility: definition.content.kernel_compatibility,
        terms: clone(definition.content.terms),
        supported_places: clone(definition.content.supported_places),
      },
      ...(objective === undefined
        ? {}
        : {
            current_objective: {
              objective_id: objective.objective_id,
              revision: objective.revision,
              content_hash: objective.content_hash,
              objective_kind: objective.content.objective_kind,
              statement: objective.content.statement,
              status: objective.content.status,
            },
          }),
      authority,
      projection,
      attention,
    };
    const view: PetraProjectShellView = {
      schema_name: "petra.project-shell-view",
      schema_version: "1.0.0",
      project_id: project.project_id,
      content,
      content_hash: canonicalHash(content),
      read_at: readAt,
    };
    this.#contracts.assertValid("project-shell-view", "1.0.0", view);
    return view;
  }

  async #authorityPosition(
    client: PoolClient,
    projectId: string,
  ): Promise<ProjectShellContent["authority"]> {
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
      throw new PostgresProjectShellViewError(
        "PROJECT_SHELL_STORED_RECORD_CORRUPT",
        "The PostgreSQL authority position is unavailable.",
      );
    }
    return {
      isolation: "repeatable_read",
      event_position: Number(row.event_position),
      stream_revision: Number(row.stream_revision ?? 0),
    };
  }

  async #projectionCheckpoint(
    client: PoolClient,
    projectId: string,
  ): Promise<PetraProjectionCheckpoint | undefined> {
    const result = await client.query<PayloadRow>(
      `SELECT revision.payload
         FROM petra.projection_checkpoints AS head
         JOIN petra.projection_checkpoint_revisions AS revision
           ON revision.projection_checkpoint_id = head.projection_checkpoint_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1
          AND head.target = 'neo4j_graph'
          AND head.projection_name = 'petra.authority_graph'
        ORDER BY revision.recorded_at DESC
        LIMIT 1`,
      [projectId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("projection-checkpoint", "1.0.0", payload);
    return clone(payload as PetraProjectionCheckpoint);
  }

  #projectionSummary(
    checkpoint: PetraProjectionCheckpoint | undefined,
  ): ProjectShellProjectionSummary {
    if (checkpoint === undefined) {
      return {
        state: "unavailable",
        label: "Projection unavailable",
        detail:
          "No authority-graph checkpoint is registered for this Project. Authoritative Project records remain available.",
        represented_event_position: 0,
        observed_event_position: 0,
        pending_records: 0,
      };
    }
    const represented =
      checkpoint.content.position.position_kind === "advanced"
        ? checkpoint.content.position.event_position
        : 0;
    const observed = checkpoint.content.observed_head.event_position;
    const freshness = checkpoint.content.freshness;
    const common = {
      checkpoint_ref: {
        record_id: checkpoint.projection_checkpoint_id,
        revision: checkpoint.revision,
        content_hash: checkpoint.content_hash,
      },
      represented_event_position: represented,
      observed_event_position: observed,
      pending_records: freshness.pending_records,
    };
    if (freshness.state === "current") {
      return {
        state: "current",
        label: "Projection current",
        detail: `The graph represents authoritative event ${represented}.`,
        ...common,
      };
    }
    if (freshness.state === "catching_up") {
      return {
        state: "catching_up",
        label: "Projection catching up",
        detail: `The authority ledger is at event ${observed}; the graph safely represents event ${represented} while ${freshness.pending_records} ${freshness.pending_records === 1 ? "record remains" : "records remain"} pending.`,
        ...common,
      };
    }
    return {
      state: "blocked",
      label: "Projection blocked",
      detail: freshness.message,
      failure_code: freshness.failure_code,
      ...common,
    };
  }

  #projectionAttention(
    projectId: string,
    projection: ProjectShellProjectionSummary,
  ): ProjectShellContent["attention"] {
    if (projection.state === "current" || projection.state === "unavailable") {
      return [];
    }
    const blocked = projection.state === "blocked";
    return [
      {
        attention_id: derivePetraId(
          "attention",
          `${projectId}:${projection.checkpoint_ref?.record_id}:${projection.checkpoint_ref?.revision}:${projection.state}`,
        ),
        attention_kind: blocked
          ? "projection_blocked"
          : "projection_catching_up",
        title: blocked
          ? "Graph projection needs recovery"
          : "Graph projection is catching up",
        summary: blocked
          ? projection.detail
          : `The authoritative Project state is current, while the graph has ${projection.pending_records} pending projection ${projection.pending_records === 1 ? "record" : "records"}.`,
        consequence:
          "Graph relationships may omit the latest accepted authority event until projection is current.",
        recommendation: blocked
          ? "Inspect the recorded projection failure before relying on graph relationships."
          : "Continue in Brief or Review, or wait for the graph projection to catch up.",
      },
    ];
  }

  #project(payload: unknown): PetraProject {
    this.#contracts.assertValid("project", "1.0.0", payload);
    return clone(payload as PetraProject);
  }

  #definition(payload: unknown): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", payload);
    const definition = payload as PetraProjectDefinition;
    if (definition.content_hash !== canonicalHash(definition.content)) {
      throw new PostgresProjectShellViewError(
        "PROJECT_SHELL_STORED_RECORD_CORRUPT",
        "The current ProjectDefinition content hash is invalid.",
      );
    }
    return clone(definition);
  }

  #objective(payload: unknown): PetraProjectObjective {
    this.#contracts.assertValid("project-objective", "1.0.0", payload);
    const objective = payload as PetraProjectObjective;
    if (objective.content_hash !== canonicalHash(objective.content)) {
      throw new PostgresProjectShellViewError(
        "PROJECT_SHELL_STORED_RECORD_CORRUPT",
        "The focused Project Objective content hash is invalid.",
      );
    }
    return clone(objective);
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
