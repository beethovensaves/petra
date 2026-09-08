import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type {
  PostgresProjectDefinitionError,
  PostgresProjectDefinitionErrorCode,
} from "../src/project-definition-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const expectCode = async (
  operation: () => Promise<unknown>,
  code: PostgresProjectDefinitionErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresProjectDefinitionError>>({ code }),
  );
};

describePostgres("PostgreSQL ProjectDefinition authority repository", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const repository = new PostgresProjectDefinitionAuthorityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.project_objective_focus_history,
                petra.project_objective_focus,
                petra.project_objective_dependencies,
                petra.project_objective_revisions,
                petra.project_objectives,
                petra.project_definition_revisions,
                petra.project_definitions,
                petra.project_revisions,
                petra.projects,
                petra.actors CASCADE`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const registerScope = async (): Promise<{
    actor: PetraActor;
    project: PetraProject;
  }> => {
    const actor = readFixture<PetraActor>("actor");
    const project = readFixture<PetraProject>("project");
    await scopes.registerActor(actor);
    await scopes.registerProjectRevision(project);
    return { actor, project };
  };

  it("retains definition and objective revisions while moving one exact current focus", async () => {
    const { actor, project } = await registerScope();
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const objective = readFixture<PetraProjectObjective>("project-objective");

    await repository.registerDefinitionRevision(definition);
    await repository.registerDefinitionRevision(structuredClone(definition));
    await repository.registerObjectiveRevision(objective);
    await repository.registerObjectiveRevision(structuredClone(objective));
    await repository.setCurrentObjectiveFocus({
      project_id: project.project_id,
      objective_ref: {
        objective_id: objective.objective_id,
        revision: objective.revision,
        content_hash: objective.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-08T14:11:00.000Z",
    });

    const child = structuredClone(objective);
    child.objective_id = "objective_01K4C000000000000000000006";
    child.content.statement = "Review the exact supporting passages.";
    child.content.parent_ref = {
      objective_id: objective.objective_id,
      revision: objective.revision,
      content_hash: objective.content_hash,
    };
    child.content.dependency_refs = [child.content.parent_ref];
    child.content_hash = canonicalHash(child.content);
    child.created_at = "2026-09-08T14:12:00.000Z";
    child.updated_at = child.created_at;

    // A parent is already a dependency relation; duplicate identity across the
    // two roles would make ordering ambiguous and is rejected.
    await expectCode(
      () => repository.registerObjectiveRevision(child),
      "PROJECT_OBJECTIVE_DEPENDENCY_INVALID",
    );
    child.content.dependency_refs = [];
    child.content_hash = canonicalHash(child.content);
    await repository.registerObjectiveRevision(child);

    const definitionTwo = structuredClone(definition);
    definitionTwo.revision = 2;
    definitionTwo.content.label = "Scientific evidence inquiry, revised";
    definitionTwo.content_hash = canonicalHash(definitionTwo.content);
    definitionTwo.created_at = "2026-09-08T14:20:00.000Z";
    await repository.registerDefinitionRevision(definitionTwo);

    const objectiveTwo = structuredClone(objective);
    objectiveTwo.revision = 2;
    objectiveTwo.project_definition_ref = {
      project_definition_id: definitionTwo.project_definition_id,
      revision: definitionTwo.revision,
      content_hash: definitionTwo.content_hash,
    };
    objectiveTwo.content.statement =
      "Determine which selected claims remain supported after the definition revision.";
    objectiveTwo.content_hash = canonicalHash(objectiveTwo.content);
    objectiveTwo.updated_at = "2026-09-08T14:21:00.000Z";
    await repository.registerObjectiveRevision(objectiveTwo);
    await repository.setCurrentObjectiveFocus({
      project_id: project.project_id,
      objective_ref: {
        objective_id: objectiveTwo.objective_id,
        revision: objectiveTwo.revision,
        content_hash: objectiveTwo.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-08T14:22:00.000Z",
    });

    expect(
      await repository.getDefinition(definition.project_definition_id, 1),
    ).toEqual(definition);
    expect(await repository.getProjectDefinition(project.project_id)).toEqual(
      definitionTwo,
    );
    expect(await repository.getObjective(objective.objective_id, 1)).toEqual(
      objective,
    );
    expect(
      await repository.getCurrentObjectiveFocus(project.project_id),
    ).toEqual(objectiveTwo);
    expect(await repository.listProjectObjectives(project.project_id)).toEqual([
      objectiveTwo,
      child,
    ]);

    const counts = await pool.query<{
      definition_revisions: string;
      objective_revisions: string;
      dependency_rows: string;
      focus_history: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.project_definition_revisions)::text
           AS definition_revisions,
         (SELECT count(*) FROM petra.project_objective_revisions)::text
           AS objective_revisions,
         (SELECT count(*) FROM petra.project_objective_dependencies)::text
           AS dependency_rows,
         (SELECT count(*) FROM petra.project_objective_focus_history)::text
           AS focus_history`,
    );
    expect(counts.rows[0]).toEqual({
      definition_revisions: "2",
      objective_revisions: "3",
      dependency_rows: "1",
      focus_history: "2",
    });

    const returned = await repository.getProjectDefinition(project.project_id);
    if (returned === undefined)
      throw new Error("Expected a ProjectDefinition.");
    returned.content.label = "caller mutation";
    expect(
      (await repository.getProjectDefinition(project.project_id))?.content
        .label,
    ).toBe(definitionTwo.content.label);
  });

  it("fails closed on rebound revisions, gaps, unknown Objective kinds, and definition substitution", async () => {
    await registerScope();
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const objective = readFixture<PetraProjectObjective>("project-objective");

    const badHash = structuredClone(definition);
    badHash.content.label = "Changed without a new hash";
    await expectCode(
      () => repository.registerDefinitionRevision(badHash),
      "PROJECT_DEFINITION_CONTENT_HASH_MISMATCH",
    );
    await repository.registerDefinitionRevision(definition);

    const rebound = structuredClone(definition);
    rebound.content.label = "Different revision-one content";
    rebound.content_hash = canonicalHash(rebound.content);
    await expectCode(
      () => repository.registerDefinitionRevision(rebound),
      "PROJECT_DEFINITION_REVISION_CONFLICT",
    );

    const gap = structuredClone(definition);
    gap.revision = 3;
    gap.created_at = "2026-09-08T14:30:00.000Z";
    await expectCode(
      () => repository.registerDefinitionRevision(gap),
      "PROJECT_DEFINITION_REVISION_GAP",
    );

    const duplicate = structuredClone(definition);
    duplicate.revision = 2;
    duplicate.content.registrations.push(
      structuredClone(duplicate.content.registrations[0]),
    );
    duplicate.content_hash = canonicalHash(duplicate.content);
    duplicate.created_at = "2026-09-08T14:31:00.000Z";
    await expectCode(
      () => repository.registerDefinitionRevision(duplicate),
      "PROJECT_DEFINITION_SEMANTICS_DUPLICATE",
    );

    const substituted = structuredClone(objective);
    substituted.project_definition_ref.content_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    await expectCode(
      () => repository.registerObjectiveRevision(substituted),
      "PROJECT_OBJECTIVE_DEFINITION_MISMATCH",
    );

    const unknownKind = structuredClone(objective);
    unknownKind.content.objective_kind = "scientific.unregistered";
    unknownKind.content_hash = canonicalHash(unknownKind.content);
    await expectCode(
      () => repository.registerObjectiveRevision(unknownKind),
      "PROJECT_OBJECTIVE_KIND_UNREGISTERED",
    );

    const missingDependency = structuredClone(objective);
    missingDependency.content.dependency_refs = [
      {
        objective_id: "objective_01K4C000000000000000000009",
        revision: 1,
        content_hash:
          "sha256:9999999999999999999999999999999999999999999999999999999999999999",
      },
    ];
    missingDependency.content_hash = canonicalHash(missingDependency.content);
    await expectCode(
      () => repository.registerObjectiveRevision(missingDependency),
      "PROJECT_OBJECTIVE_REFERENCE_MISSING",
    );

    await repository.registerObjectiveRevision(objective);
    const objectiveGap = structuredClone(objective);
    objectiveGap.revision = 3;
    objectiveGap.updated_at = "2026-09-08T14:32:00.000Z";
    await expectCode(
      () => repository.registerObjectiveRevision(objectiveGap),
      "PROJECT_OBJECTIVE_REVISION_GAP",
    );
    expect(
      (await repository.getObjective(objective.objective_id))?.revision,
    ).toBe(1);
  });

  it("enforces append-only semantic history and exact active focus in PostgreSQL", async () => {
    const { actor, project } = await registerScope();
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const objective = readFixture<PetraProjectObjective>("project-objective");
    await repository.registerDefinitionRevision(definition);
    await repository.registerObjectiveRevision(objective);

    await expect(
      pool.query(
        `UPDATE petra.project_definition_revisions
            SET definition_family = 'rewritten.family'
          WHERE project_definition_id = $1`,
        [definition.project_definition_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        `UPDATE petra.project_objective_revisions
            SET status = 'satisfied'
          WHERE objective_id = $1`,
        [objective.objective_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));

    const inactive = structuredClone(objective);
    inactive.revision = 2;
    inactive.content.status = "satisfied";
    inactive.content_hash = canonicalHash(inactive.content);
    inactive.updated_at = "2026-09-08T14:40:00.000Z";
    await repository.registerObjectiveRevision(inactive);
    await expectCode(
      () =>
        repository.setCurrentObjectiveFocus({
          project_id: project.project_id,
          objective_ref: {
            objective_id: inactive.objective_id,
            revision: inactive.revision,
            content_hash: inactive.content_hash,
          },
          changed_by: actor,
          changed_at: "2026-09-08T14:41:00.000Z",
        }),
      "PROJECT_OBJECTIVE_FOCUS_INVALID",
    );
    expect(
      await repository.getCurrentObjectiveFocus(project.project_id),
    ).toBeUndefined();
  });
});
