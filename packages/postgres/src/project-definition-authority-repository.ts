import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraProjectDefinition,
  PetraProjectObjective,
  ProjectObjectiveRef,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  ProjectDefinitionAuthorityRepository,
  ProjectObjectiveFocusChange,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import type { Pool, PoolClient } from "pg";

export type PostgresProjectDefinitionErrorCode =
  | "PROJECT_DEFINITION_CONTENT_HASH_MISMATCH"
  | "PROJECT_DEFINITION_REFERENCE_MISSING"
  | "PROJECT_DEFINITION_ID_CONFLICT"
  | "PROJECT_DEFINITION_REVISION_CONFLICT"
  | "PROJECT_DEFINITION_REVISION_GAP"
  | "PROJECT_DEFINITION_FAMILY_CONFLICT"
  | "PROJECT_DEFINITION_SEMANTICS_DUPLICATE"
  | "PROJECT_OBJECTIVE_CONTENT_HASH_MISMATCH"
  | "PROJECT_OBJECTIVE_REFERENCE_MISSING"
  | "PROJECT_OBJECTIVE_DEFINITION_MISMATCH"
  | "PROJECT_OBJECTIVE_KIND_UNREGISTERED"
  | "PROJECT_OBJECTIVE_ID_CONFLICT"
  | "PROJECT_OBJECTIVE_REVISION_CONFLICT"
  | "PROJECT_OBJECTIVE_REVISION_GAP"
  | "PROJECT_OBJECTIVE_DEPENDENCY_INVALID"
  | "PROJECT_OBJECTIVE_FOCUS_INVALID";

export class PostgresProjectDefinitionError extends Error {
  readonly code: PostgresProjectDefinitionErrorCode;

  constructor(code: PostgresProjectDefinitionErrorCode, message: string) {
    super(message);
    this.name = "PostgresProjectDefinitionError";
    this.code = code;
  }
}

interface PayloadRow {
  payload: unknown;
}

interface StoredRow extends PayloadRow {
  record_hash: string;
}

interface DefinitionHeadRow {
  project_definition_id: string;
  project_id: string;
  definition_family: string;
  current_revision: string;
}

interface ObjectiveHeadRow {
  objective_id: string;
  project_id: string;
  current_revision: string;
  created_by_actor_id: string;
  created_by_actor_kind: ActorRef["actor_kind"];
  created_at: Date;
}

const clone = <Value>(value: Value): Value => structuredClone(value);

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const exactRefKey = (ref: ProjectObjectiveRef): string =>
  `${ref.objective_id}:${ref.revision}:${ref.content_hash}`;

const timestampIsNormalized = (value: string): boolean => {
  const milliseconds = Date.parse(value);
  return (
    Number.isFinite(milliseconds) &&
    new Date(milliseconds).toISOString() === value
  );
};

export class PostgresProjectDefinitionAuthorityRepository implements ProjectDefinitionAuthorityRepository {
  readonly #pool: Pool;
  readonly #contracts: PetraContractRegistry;

  constructor(pool: Pool, contracts = new PetraContractRegistry()) {
    this.#pool = pool;
    this.#contracts = contracts;
  }

  async registerDefinitionRevision(
    definition: PetraProjectDefinition,
  ): Promise<PetraProjectDefinition> {
    this.#contracts.assertValid("project-definition", "1.0.0", definition);
    if (definition.content_hash !== canonicalHash(definition.content)) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_DEFINITION_CONTENT_HASH_MISMATCH",
        "The ProjectDefinition content hash must identify its exact canonical content.",
      );
    }
    this.#assertDefinitionSemantics(definition);

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `project-definition:${definition.project_definition_id}`,
        `project-definition-project:${definition.project_id}`,
      ]);
      await this.#requireProjectAndActor(
        client,
        definition.project_id,
        definition.created_by,
      );

      const heads = await client.query<DefinitionHeadRow>(
        `SELECT project_definition_id, project_id, definition_family,
                current_revision
           FROM petra.project_definitions
          WHERE project_id = $1 OR project_definition_id = $2
          FOR UPDATE`,
        [definition.project_id, definition.project_definition_id],
      );
      const conflictingHead = heads.rows.find(
        (head) =>
          head.project_id !== definition.project_id ||
          head.project_definition_id !== definition.project_definition_id,
      );
      if (conflictingHead !== undefined) {
        throw new PostgresProjectDefinitionError(
          "PROJECT_DEFINITION_ID_CONFLICT",
          "A Project and ProjectDefinition ID form one stable one-to-one identity.",
        );
      }
      const head = heads.rows[0];
      const recordHash = canonicalHash(definition);

      if (head === undefined) {
        if (definition.revision !== 1) {
          throw new PostgresProjectDefinitionError(
            "PROJECT_DEFINITION_REVISION_GAP",
            "A new ProjectDefinition must begin at revision one.",
          );
        }
        await client.query(
          `INSERT INTO petra.project_definitions (
             project_definition_id, project_id, definition_family,
             current_revision
           ) VALUES ($1, $2, $3, $4)`,
          [
            definition.project_definition_id,
            definition.project_id,
            definition.definition_family,
            definition.revision,
          ],
        );
      } else {
        if (head.definition_family !== definition.definition_family) {
          throw new PostgresProjectDefinitionError(
            "PROJECT_DEFINITION_FAMILY_CONFLICT",
            "A materially different definition family requires a derived Project.",
          );
        }
        const currentRevision = Number(head.current_revision);
        if (definition.revision <= currentRevision) {
          const existing = await client.query<StoredRow>(
            `SELECT record_hash, payload
               FROM petra.project_definition_revisions
              WHERE project_definition_id = $1 AND revision = $2`,
            [definition.project_definition_id, definition.revision],
          );
          if (existing.rows[0]?.record_hash === recordHash) {
            return this.#definitionFrom(existing.rows[0].payload);
          }
          throw new PostgresProjectDefinitionError(
            "PROJECT_DEFINITION_REVISION_CONFLICT",
            "The ProjectDefinition revision is already bound to different canonical content.",
          );
        }
        if (definition.revision !== currentRevision + 1) {
          throw new PostgresProjectDefinitionError(
            "PROJECT_DEFINITION_REVISION_GAP",
            "ProjectDefinition revisions must advance exactly once from the current revision.",
          );
        }
      }

      await client.query(
        `INSERT INTO petra.project_definition_revisions (
           project_definition_id, revision, project_id, schema_name,
           schema_version, definition_family, origin_kind, content_hash,
           created_by_actor_id, created_by_actor_kind, record_hash, payload,
           created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb,
           $13::timestamptz
         )`,
        [
          definition.project_definition_id,
          definition.revision,
          definition.project_id,
          definition.schema_name,
          definition.schema_version,
          definition.definition_family,
          definition.origin.origin_kind,
          definition.content_hash,
          definition.created_by.actor_id,
          definition.created_by.actor_kind,
          recordHash,
          JSON.stringify(definition),
          definition.created_at,
        ],
      );
      if (head !== undefined) {
        await client.query(
          `UPDATE petra.project_definitions
              SET current_revision = $2
            WHERE project_definition_id = $1`,
          [definition.project_definition_id, definition.revision],
        );
      }
      return clone(definition);
    });
  }

  async getDefinition(
    projectDefinitionId: string,
    revision?: number,
  ): Promise<PetraProjectDefinition | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      revision === undefined
        ? `SELECT record.payload
             FROM petra.project_definitions AS head
             JOIN petra.project_definition_revisions AS record
               ON record.project_definition_id = head.project_definition_id
              AND record.revision = head.current_revision
            WHERE head.project_definition_id = $1`
        : `SELECT payload
             FROM petra.project_definition_revisions
            WHERE project_definition_id = $1 AND revision = $2`,
      revision === undefined
        ? [projectDefinitionId]
        : [projectDefinitionId, revision],
    );
    const payload = result.rows[0]?.payload;
    return payload === undefined ? undefined : this.#definitionFrom(payload);
  }

  async getProjectDefinition(
    projectId: string,
    revision?: number,
  ): Promise<PetraProjectDefinition | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      revision === undefined
        ? `SELECT record.payload
             FROM petra.project_definitions AS head
             JOIN petra.project_definition_revisions AS record
               ON record.project_definition_id = head.project_definition_id
              AND record.revision = head.current_revision
            WHERE head.project_id = $1`
        : `SELECT record.payload
             FROM petra.project_definitions AS head
             JOIN petra.project_definition_revisions AS record
               ON record.project_definition_id = head.project_definition_id
            WHERE head.project_id = $1 AND record.revision = $2`,
      revision === undefined ? [projectId] : [projectId, revision],
    );
    const payload = result.rows[0]?.payload;
    return payload === undefined ? undefined : this.#definitionFrom(payload);
  }

  async registerObjectiveRevision(
    objective: PetraProjectObjective,
  ): Promise<PetraProjectObjective> {
    this.#contracts.assertValid("project-objective", "1.0.0", objective);
    if (objective.content_hash !== canonicalHash(objective.content)) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_OBJECTIVE_CONTENT_HASH_MISMATCH",
        "The Project Objective content hash must identify its exact canonical content.",
      );
    }
    this.#assertObjectiveReferences(objective);

    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `project-objective:${objective.objective_id}`,
        `project-objective-project:${objective.project_id}`,
      ]);
      await this.#requireProjectAndActor(
        client,
        objective.project_id,
        objective.created_by,
      );
      const definition = await this.#requireCurrentDefinition(
        client,
        objective,
      );
      if (
        !definition.content.registrations.some(
          (registration) =>
            registration.registration_kind === "objective_schema" &&
            registration.semantic_key === objective.content.objective_kind,
        )
      ) {
        throw new PostgresProjectDefinitionError(
          "PROJECT_OBJECTIVE_KIND_UNREGISTERED",
          "The Objective kind is not registered by its exact ProjectDefinition revision.",
        );
      }
      await this.#requireObjectiveDependencies(client, objective);

      const headResult = await client.query<ObjectiveHeadRow>(
        `SELECT objective_id, project_id, current_revision,
                created_by_actor_id, created_by_actor_kind, created_at
           FROM petra.project_objectives
          WHERE objective_id = $1
          FOR UPDATE`,
        [objective.objective_id],
      );
      const head = headResult.rows[0];
      const recordHash = canonicalHash(objective);

      if (head === undefined) {
        if (objective.revision !== 1) {
          throw new PostgresProjectDefinitionError(
            "PROJECT_OBJECTIVE_REVISION_GAP",
            "A new Project Objective must begin at revision one.",
          );
        }
        await client.query(
          `INSERT INTO petra.project_objectives (
             objective_id, project_id, current_revision,
             created_by_actor_id, created_by_actor_kind, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
          [
            objective.objective_id,
            objective.project_id,
            objective.revision,
            objective.created_by.actor_id,
            objective.created_by.actor_kind,
            objective.created_at,
          ],
        );
      } else {
        if (
          head.project_id !== objective.project_id ||
          head.created_by_actor_id !== objective.created_by.actor_id ||
          head.created_by_actor_kind !== objective.created_by.actor_kind ||
          head.created_at.toISOString() !== objective.created_at
        ) {
          throw new PostgresProjectDefinitionError(
            "PROJECT_OBJECTIVE_ID_CONFLICT",
            "A Project Objective revision cannot change its Project, creator, or creation time.",
          );
        }
        const currentRevision = Number(head.current_revision);
        if (objective.revision <= currentRevision) {
          const existing = await client.query<StoredRow>(
            `SELECT record_hash, payload
               FROM petra.project_objective_revisions
              WHERE objective_id = $1 AND revision = $2`,
            [objective.objective_id, objective.revision],
          );
          if (existing.rows[0]?.record_hash === recordHash) {
            return this.#objectiveFrom(existing.rows[0].payload);
          }
          throw new PostgresProjectDefinitionError(
            "PROJECT_OBJECTIVE_REVISION_CONFLICT",
            "The Project Objective revision is already bound to different canonical content.",
          );
        }
        if (objective.revision !== currentRevision + 1) {
          throw new PostgresProjectDefinitionError(
            "PROJECT_OBJECTIVE_REVISION_GAP",
            "Project Objective revisions must advance exactly once from the current revision.",
          );
        }
      }

      await client.query(
        `INSERT INTO petra.project_objective_revisions (
           objective_id, revision, project_id, schema_name, schema_version,
           project_definition_id, project_definition_revision,
           project_definition_content_hash, objective_kind, status,
           content_hash, created_by_actor_id, created_by_actor_kind,
           record_hash, payload, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15::jsonb, $16::timestamptz, $17::timestamptz
         )`,
        [
          objective.objective_id,
          objective.revision,
          objective.project_id,
          objective.schema_name,
          objective.schema_version,
          objective.project_definition_ref.project_definition_id,
          objective.project_definition_ref.revision,
          objective.project_definition_ref.content_hash,
          objective.content.objective_kind,
          objective.content.status,
          objective.content_hash,
          objective.created_by.actor_id,
          objective.created_by.actor_kind,
          recordHash,
          JSON.stringify(objective),
          objective.created_at,
          objective.updated_at,
        ],
      );
      await this.#insertObjectiveDependencies(client, objective);
      if (head !== undefined) {
        await client.query(
          `UPDATE petra.project_objectives
              SET current_revision = $2
            WHERE objective_id = $1`,
          [objective.objective_id, objective.revision],
        );
      }
      return clone(objective);
    });
  }

  async getObjective(
    objectiveId: string,
    revision?: number,
  ): Promise<PetraProjectObjective | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      revision === undefined
        ? `SELECT record.payload
             FROM petra.project_objectives AS head
             JOIN petra.project_objective_revisions AS record
               ON record.objective_id = head.objective_id
              AND record.revision = head.current_revision
            WHERE head.objective_id = $1`
        : `SELECT payload
             FROM petra.project_objective_revisions
            WHERE objective_id = $1 AND revision = $2`,
      revision === undefined ? [objectiveId] : [objectiveId, revision],
    );
    const payload = result.rows[0]?.payload;
    return payload === undefined ? undefined : this.#objectiveFrom(payload);
  }

  async listProjectObjectives(
    projectId: string,
  ): Promise<PetraProjectObjective[]> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT record.payload
         FROM petra.project_objectives AS head
         JOIN petra.project_objective_revisions AS record
           ON record.objective_id = head.objective_id
          AND record.revision = head.current_revision
        WHERE head.project_id = $1
        ORDER BY record.created_at, record.objective_id`,
      [projectId],
    );
    return result.rows.map((row) => this.#objectiveFrom(row.payload));
  }

  async setCurrentObjectiveFocus(
    change: ProjectObjectiveFocusChange,
  ): Promise<PetraProjectObjective | undefined> {
    if (!timestampIsNormalized(change.changed_at)) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_OBJECTIVE_FOCUS_INVALID",
        "An Objective focus change needs a normalized UTC millisecond timestamp.",
      );
    }
    return this.#transaction(async (client) => {
      await this.#lock(client, [
        `project-objective-focus:${change.project_id}`,
      ]);
      await this.#requireProjectAndActor(
        client,
        change.project_id,
        change.changed_by,
      );
      const current = await client.query<{
        objective_id: string;
        objective_revision: string;
        objective_content_hash: string;
      }>(
        `SELECT objective_id, objective_revision, objective_content_hash
           FROM petra.project_objective_focus
          WHERE project_id = $1
          FOR UPDATE`,
        [change.project_id],
      );

      if (change.objective_ref === undefined) {
        if (current.rows[0] === undefined) return undefined;
        await client.query(
          "DELETE FROM petra.project_objective_focus WHERE project_id = $1",
          [change.project_id],
        );
        await this.#insertFocusHistory(client, change);
        return undefined;
      }

      const ref = change.objective_ref;
      const objectiveResult = await client.query<PayloadRow>(
        `SELECT record.payload
           FROM petra.project_objectives AS head
           JOIN petra.project_objective_revisions AS record
             ON record.objective_id = head.objective_id
            AND record.revision = head.current_revision
          WHERE head.project_id = $1
            AND record.objective_id = $2
            AND record.revision = $3
            AND record.content_hash = $4
            AND record.status = 'active'`,
        [change.project_id, ref.objective_id, ref.revision, ref.content_hash],
      );
      const payload = objectiveResult.rows[0]?.payload;
      if (payload === undefined) {
        throw new PostgresProjectDefinitionError(
          "PROJECT_OBJECTIVE_FOCUS_INVALID",
          "Current focus must select the exact current revision of an active Objective in the same Project.",
        );
      }

      const prior = current.rows[0];
      if (
        prior?.objective_id === ref.objective_id &&
        Number(prior.objective_revision) === ref.revision &&
        prior.objective_content_hash === ref.content_hash
      ) {
        return this.#objectiveFrom(payload);
      }

      await client.query(
        `INSERT INTO petra.project_objective_focus (
           project_id, objective_id, objective_revision,
           objective_content_hash, changed_by_actor_id,
           changed_by_actor_kind, changed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
         ON CONFLICT (project_id) DO UPDATE
           SET objective_id = EXCLUDED.objective_id,
               objective_revision = EXCLUDED.objective_revision,
               objective_content_hash = EXCLUDED.objective_content_hash,
               changed_by_actor_id = EXCLUDED.changed_by_actor_id,
               changed_by_actor_kind = EXCLUDED.changed_by_actor_kind,
               changed_at = EXCLUDED.changed_at`,
        [
          change.project_id,
          ref.objective_id,
          ref.revision,
          ref.content_hash,
          change.changed_by.actor_id,
          change.changed_by.actor_kind,
          change.changed_at,
        ],
      );
      await this.#insertFocusHistory(client, change);
      return this.#objectiveFrom(payload);
    });
  }

  async getCurrentObjectiveFocus(
    projectId: string,
  ): Promise<PetraProjectObjective | undefined> {
    const result = await this.#pool.query<PayloadRow>(
      `SELECT record.payload
         FROM petra.project_objective_focus AS focus
         JOIN petra.project_objective_revisions AS record
           ON record.objective_id = focus.objective_id
          AND record.revision = focus.objective_revision
          AND record.content_hash = focus.objective_content_hash
        WHERE focus.project_id = $1`,
      [projectId],
    );
    const payload = result.rows[0]?.payload;
    return payload === undefined ? undefined : this.#objectiveFrom(payload);
  }

  #assertDefinitionSemantics(definition: PetraProjectDefinition): void {
    const registrationKeys = definition.content.registrations.map(
      (registration) =>
        `${registration.registration_kind}:${registration.semantic_key}`,
    );
    const termKeys = definition.content.terms.map((term) => term.semantic_key);
    if (
      new Set(registrationKeys).size !== registrationKeys.length ||
      new Set(termKeys).size !== termKeys.length
    ) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_DEFINITION_SEMANTICS_DUPLICATE",
        "Registration kind/key pairs and terminology keys must be unique within a ProjectDefinition revision.",
      );
    }
  }

  #assertObjectiveReferences(objective: PetraProjectObjective): void {
    const references = [
      ...(objective.content.parent_ref === undefined
        ? []
        : [objective.content.parent_ref]),
      ...objective.content.dependency_refs,
    ];
    const keys = references.map(exactRefKey);
    const ids = references.map((reference) => reference.objective_id);
    if (
      keys.some((key) => key.startsWith(`${objective.objective_id}:`)) ||
      new Set(keys).size !== keys.length ||
      new Set(ids).size !== ids.length
    ) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_OBJECTIVE_DEPENDENCY_INVALID",
        "Objective parent and dependency references must be distinct exact revisions of other Objectives.",
      );
    }
  }

  async #requireProjectAndActor(
    client: PoolClient,
    projectId: string,
    actor: ActorRef,
  ): Promise<void> {
    const result = await client.query<{
      project_exists: boolean;
      actor_exists: boolean;
    }>(
      `SELECT
         EXISTS(SELECT 1 FROM petra.projects WHERE project_id = $1)
           AS project_exists,
         EXISTS(
           SELECT 1 FROM petra.actors
            WHERE actor_id = $2 AND actor_kind = $3
         ) AS actor_exists`,
      [projectId, actor.actor_id, actor.actor_kind],
    );
    if (!result.rows[0]?.project_exists || !result.rows[0]?.actor_exists) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_DEFINITION_REFERENCE_MISSING",
        "The exact Project and Actor must exist before registering Project semantics.",
      );
    }
  }

  async #requireCurrentDefinition(
    client: PoolClient,
    objective: PetraProjectObjective,
  ): Promise<PetraProjectDefinition> {
    const ref = objective.project_definition_ref;
    const result = await client.query<PayloadRow>(
      `SELECT record.payload
         FROM petra.project_definitions AS head
         JOIN petra.project_definition_revisions AS record
           ON record.project_definition_id = head.project_definition_id
          AND record.revision = head.current_revision
        WHERE head.project_id = $1
          AND record.project_definition_id = $2
          AND record.revision = $3
          AND record.content_hash = $4`,
      [
        objective.project_id,
        ref.project_definition_id,
        ref.revision,
        ref.content_hash,
      ],
    );
    const payload = result.rows[0]?.payload;
    if (payload === undefined) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_OBJECTIVE_DEFINITION_MISMATCH",
        "A new Objective revision must bind the exact current ProjectDefinition revision for its Project.",
      );
    }
    return this.#definitionFrom(payload);
  }

  async #requireObjectiveDependencies(
    client: PoolClient,
    objective: PetraProjectObjective,
  ): Promise<void> {
    const references = [
      ...(objective.content.parent_ref === undefined
        ? []
        : [objective.content.parent_ref]),
      ...objective.content.dependency_refs,
    ];
    for (const ref of references) {
      const result = await client.query(
        `SELECT 1
           FROM petra.project_objective_revisions
          WHERE project_id = $1
            AND objective_id = $2
            AND revision = $3
            AND content_hash = $4`,
        [
          objective.project_id,
          ref.objective_id,
          ref.revision,
          ref.content_hash,
        ],
      );
      if (result.rowCount !== 1) {
        throw new PostgresProjectDefinitionError(
          "PROJECT_OBJECTIVE_REFERENCE_MISSING",
          "Every Objective parent and dependency must resolve to an exact revision in the same Project.",
        );
      }
    }
  }

  async #insertObjectiveDependencies(
    client: PoolClient,
    objective: PetraProjectObjective,
  ): Promise<void> {
    const rows: Array<{
      relationKind: "parent" | "dependency";
      position: number;
      ref: ProjectObjectiveRef;
    }> = [];
    if (objective.content.parent_ref !== undefined) {
      rows.push({
        relationKind: "parent",
        position: 0,
        ref: objective.content.parent_ref,
      });
    }
    objective.content.dependency_refs.forEach((ref, position) => {
      rows.push({ relationKind: "dependency", position, ref });
    });
    for (const row of rows) {
      await client.query(
        `INSERT INTO petra.project_objective_dependencies (
           project_id, objective_id, objective_revision, objective_content_hash,
           relation_kind, position, related_objective_id,
           related_objective_revision, related_objective_content_hash
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          objective.project_id,
          objective.objective_id,
          objective.revision,
          objective.content_hash,
          row.relationKind,
          row.position,
          row.ref.objective_id,
          row.ref.revision,
          row.ref.content_hash,
        ],
      );
    }
  }

  async #insertFocusHistory(
    client: PoolClient,
    change: ProjectObjectiveFocusChange,
  ): Promise<void> {
    const ref = change.objective_ref;
    await client.query(
      `INSERT INTO petra.project_objective_focus_history (
         project_id, objective_id, objective_revision,
         objective_content_hash, changed_by_actor_id,
         changed_by_actor_kind, changed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)`,
      [
        change.project_id,
        ref?.objective_id ?? null,
        ref?.revision ?? null,
        ref?.content_hash ?? null,
        change.changed_by.actor_id,
        change.changed_by.actor_kind,
        change.changed_at,
      ],
    );
  }

  #definitionFrom(payload: unknown): PetraProjectDefinition {
    this.#contracts.assertValid("project-definition", "1.0.0", payload);
    const definition = payload as PetraProjectDefinition;
    if (definition.content_hash !== canonicalHash(definition.content)) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_DEFINITION_CONTENT_HASH_MISMATCH",
        "The stored ProjectDefinition content hash no longer matches its canonical content.",
      );
    }
    return clone(definition);
  }

  #objectiveFrom(payload: unknown): PetraProjectObjective {
    this.#contracts.assertValid("project-objective", "1.0.0", payload);
    const objective = payload as PetraProjectObjective;
    if (objective.content_hash !== canonicalHash(objective.content)) {
      throw new PostgresProjectDefinitionError(
        "PROJECT_OBJECTIVE_CONTENT_HASH_MISMATCH",
        "The stored Project Objective content hash no longer matches its canonical content.",
      );
    }
    return clone(objective);
  }

  async #lock(client: PoolClient, keys: readonly string[]): Promise<void> {
    for (const key of [...keys].sort()) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [key],
      );
    }
  }

  async #transaction<Value>(
    operation: (client: PoolClient) => Promise<Value>,
  ): Promise<Value> {
    const client = await this.#pool.connect();
    try {
      await client.query("BEGIN");
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
