import { createHash } from "node:crypto";

import type { PetraActor, PetraProject } from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type { ResearchScopeRepository } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresResearchScopeErrorCode =
  | "ACTOR_ID_CONFLICT"
  | "ACTOR_REFERENCE_MISSING"
  | "PROJECT_ID_CONFLICT"
  | "PROJECT_REVISION_CONFLICT"
  | "PROJECT_REVISION_GAP";

export class PostgresResearchScopeError extends Error {
  readonly code: PostgresResearchScopeErrorCode;

  constructor(code: PostgresResearchScopeErrorCode, message: string) {
    super(message);
    this.name = "PostgresResearchScopeError";
    this.code = code;
  }
}

interface HashRow {
  record_hash: string;
}

interface CurrentProjectRow {
  current_revision: string;
  created_by_actor_id: string;
  created_by_actor_kind: PetraActor["actor_kind"];
  created_at: Date;
}

interface PayloadRow {
  payload: unknown;
}

const recordHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const actorIdentityEquals = (
  project: PetraProject,
  current: CurrentProjectRow,
): boolean =>
  project.created_by.actor_id === current.created_by_actor_id &&
  project.created_by.actor_kind === current.created_by_actor_kind &&
  project.created_at === current.created_at.toISOString();

export class PostgresResearchScopeRepository implements ResearchScopeRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerActor(actor: PetraActor): Promise<PetraActor> {
    this.#contracts.assertValid("actor", "1.0.0", actor);
    const hash = recordHash(actor);
    const result = await this.#pool.query<HashRow>(
      `INSERT INTO petra.actors (
         actor_id, actor_kind, display_name, schema_name, schema_version,
         record_hash, payload, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
       ON CONFLICT (actor_id) DO NOTHING
       RETURNING record_hash`,
      [
        actor.actor_id,
        actor.actor_kind,
        actor.display_name,
        actor.schema_name,
        actor.schema_version,
        hash,
        JSON.stringify(actor),
        actor.created_at,
      ],
    );
    if (result.rowCount === 0) {
      const existing = await this.#pool.query<HashRow>(
        "SELECT record_hash FROM petra.actors WHERE actor_id = $1",
        [actor.actor_id],
      );
      if (existing.rows[0]?.record_hash !== hash) {
        throw new PostgresResearchScopeError(
          "ACTOR_ID_CONFLICT",
          "The Actor ID is already bound to different canonical content.",
        );
      }
    }
    return clone(actor);
  }

  async getActor(actorId: string): Promise<PetraActor | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      "SELECT payload FROM petra.actors WHERE actor_id = $1",
      [actorId],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("actor", "1.0.0", payload);
    return clone(payload as PetraActor);
  }

  async registerProjectRevision(project: PetraProject): Promise<PetraProject> {
    this.#contracts.assertValid("project", "1.0.0", project);
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
      await this.#registerProjectRevision(client, project);
      await client.query("COMMIT");
      return clone(project);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getProject(
    projectId: string,
    revision?: number,
  ): Promise<PetraProject | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      revision === undefined
        ? `SELECT revision.payload
             FROM petra.projects AS project
             JOIN petra.project_revisions AS revision
               ON revision.project_id = project.project_id
              AND revision.revision = project.current_revision
            WHERE project.project_id = $1`
        : `SELECT payload
             FROM petra.project_revisions
            WHERE project_id = $1 AND revision = $2`,
      revision === undefined ? [projectId] : [projectId, revision],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) return undefined;
    this.#contracts.assertValid("project", "1.0.0", payload);
    return clone(payload as PetraProject);
  }

  async #registerProjectRevision(
    client: PoolClient,
    project: PetraProject,
  ): Promise<void> {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [project.project_id],
    );
    const actor = await client.query<{ actor_kind: PetraActor["actor_kind"] }>(
      "SELECT actor_kind FROM petra.actors WHERE actor_id = $1",
      [project.created_by.actor_id],
    );
    if (actor.rows[0]?.actor_kind !== project.created_by.actor_kind) {
      throw new PostgresResearchScopeError(
        "ACTOR_REFERENCE_MISSING",
        "The Project creator must resolve to the exact registered Actor kind.",
      );
    }

    const currentResult = await client.query<CurrentProjectRow>(
      `SELECT current_revision, created_by_actor_id, created_by_actor_kind,
              created_at
         FROM petra.projects
        WHERE project_id = $1
        FOR UPDATE`,
      [project.project_id],
    );
    const current = currentResult.rows[0];
    const hash = recordHash(project);

    if (current === undefined) {
      if (project.revision !== 1) {
        throw new PostgresResearchScopeError(
          "PROJECT_REVISION_GAP",
          "A new Project must begin at revision one.",
        );
      }
      await client.query(
        `INSERT INTO petra.projects (
           project_id, current_revision, created_by_actor_id,
           created_by_actor_kind, created_at
         ) VALUES ($1, $2, $3, $4, $5::timestamptz)`,
        [
          project.project_id,
          project.revision,
          project.created_by.actor_id,
          project.created_by.actor_kind,
          project.created_at,
        ],
      );
    } else {
      if (!actorIdentityEquals(project, current)) {
        throw new PostgresResearchScopeError(
          "PROJECT_ID_CONFLICT",
          "A Project revision cannot change its creator or creation time.",
        );
      }
      const currentRevision = Number(current.current_revision);
      if (project.revision <= currentRevision) {
        const existing = await client.query<HashRow>(
          `SELECT record_hash
             FROM petra.project_revisions
            WHERE project_id = $1 AND revision = $2`,
          [project.project_id, project.revision],
        );
        if (existing.rows[0]?.record_hash === hash) return;
        throw new PostgresResearchScopeError(
          "PROJECT_REVISION_CONFLICT",
          "The Project revision is already bound to different canonical content.",
        );
      }
      if (project.revision !== currentRevision + 1) {
        throw new PostgresResearchScopeError(
          "PROJECT_REVISION_GAP",
          "Project revisions must advance exactly once from the current revision.",
        );
      }
    }

    await client.query(
      `INSERT INTO petra.project_revisions (
         project_id, revision, schema_name, schema_version, name, description,
         status, visibility, enabled_evidence_namespaces, created_by_actor_id,
         created_by_actor_kind, record_hash, payload, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12,
         $13::jsonb, $14::timestamptz, $15::timestamptz
       )`,
      [
        project.project_id,
        project.revision,
        project.schema_name,
        project.schema_version,
        project.name,
        project.description ?? null,
        project.status,
        project.visibility,
        project.enabled_evidence_namespaces,
        project.created_by.actor_id,
        project.created_by.actor_kind,
        hash,
        JSON.stringify(project),
        project.created_at,
        project.updated_at,
      ],
    );

    if (current !== undefined) {
      await client.query(
        `UPDATE petra.projects
            SET current_revision = $2
          WHERE project_id = $1`,
        [project.project_id, project.revision],
      );
    }
  }
}
