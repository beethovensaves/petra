import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import type {
  PetraActor,
  PetraCapabilityGrant,
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
import { PostgresCapabilityGrantAuthorityRepository } from "../src/capability-grant-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import type { PostgresProjectEffectiveControlsViewError } from "../src/project-effective-controls-view-reader.js";
import { PostgresProjectEffectiveControlsViewReader } from "../src/project-effective-controls-view-reader.js";
import { PostgresProjectObjectLocationViewReader } from "../src/project-object-location-view-reader.js";
import type { PostgresProjectShellViewError } from "../src/project-shell-view-reader.js";
import { PostgresProjectShellViewReader } from "../src/project-shell-view-reader.js";
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
  const capabilityGrants = new PostgresCapabilityGrantAuthorityRepository(pool);
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
      history_bindings: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.project_definition_revisions)::text
           AS definition_revisions,
         (SELECT count(*) FROM petra.project_objective_revisions)::text
           AS objective_revisions,
         (SELECT count(*) FROM petra.project_objective_dependencies)::text
           AS dependency_rows,
         (SELECT count(*) FROM petra.project_objective_focus_history)::text
           AS focus_history,
         (SELECT count(*) FROM petra.project_definition_history_bindings)::text
           AS history_bindings`,
    );
    expect(counts.rows[0]).toEqual({
      definition_revisions: "2",
      objective_revisions: "3",
      dependency_rows: "1",
      focus_history: "2",
      history_bindings: "2",
    });

    const bindings = await pool.query<{
      project_definition_revision: string;
      effective_after_stream_revision: string;
      project_definition_record_hash: string;
    }>(
      `SELECT project_definition_revision,
              effective_after_stream_revision,
              project_definition_record_hash
         FROM petra.project_definition_history_bindings
        ORDER BY project_definition_revision`,
    );
    expect(bindings.rows).toEqual([
      {
        project_definition_revision: "1",
        effective_after_stream_revision: "0",
        project_definition_record_hash: canonicalHash(definition),
      },
      {
        project_definition_revision: "2",
        effective_after_stream_revision: "0",
        project_definition_record_hash: canonicalHash(definitionTwo),
      },
    ]);
    await expect(
      pool.query(
        `UPDATE petra.project_definition_history_bindings
            SET effective_after_stream_revision = 1
          WHERE project_definition_id = $1
            AND project_definition_revision = 1`,
        [definition.project_definition_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));

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

  it("composes list and detail shell reads from one exact repeatable-read snapshot", async () => {
    const { actor, project } = await registerScope();
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const objective = readFixture<PetraProjectObjective>("project-objective");
    const capabilityGrant =
      readFixture<PetraCapabilityGrant>("capability-grant");
    await repository.registerDefinitionRevision(definition);
    await repository.registerObjectiveRevision(objective);
    await capabilityGrants.registerCapabilityGrant(capabilityGrant);
    await repository.setCurrentObjectiveFocus({
      project_id: project.project_id,
      objective_ref: {
        objective_id: objective.objective_id,
        revision: objective.revision,
        content_hash: objective.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-08T14:50:00.000Z",
    });

    const reader = new PostgresProjectShellViewReader(pool);
    const view = await reader.getProjectShellView(project.project_id);
    if (view === undefined) throw new Error("Expected a Project shell view.");
    expect(view.schema_name).toBe("petra.project-shell-view");
    expect(view.schema_version).toBe("1.2.0");
    expect(view.project_id).toBe(project.project_id);
    expect(view.content.project.revision).toBe(project.revision);
    expect(view.content.definition.project_definition_id).toBe(
      definition.project_definition_id,
    );
    expect(view.content.definition.revision).toBe(definition.revision);
    expect(view.content.definition.content_hash).toBe(definition.content_hash);
    expect(view.content.current_objective?.objective_id).toBe(
      objective.objective_id,
    );
    expect(view.content.current_objective?.revision).toBe(objective.revision);
    expect(view.content.current_objective?.content_hash).toBe(
      objective.content_hash,
    );
    expect(view.content.authority.isolation).toBe("repeatable_read");
    expect(view.content.projection.state).toBe("unavailable");
    expect(view.content.resume).toEqual({
      state: "not_found",
      failure: {
        code: "PROJECT_RESUME_TASK_NOT_FOUND",
        message: "This Project has no retained task to resume.",
      },
      recovery: {
        action: "open_brief",
        destination: {
          role: "brief",
          purpose: "Open the current Project Brief.",
        },
        reason:
          "Brief is the safe Project entry when no more specific retained task exists.",
      },
    });
    expect(view.content.place_summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "work",
          coverage: "complete",
          item_count: 0,
          attention_count: 0,
        }),
        expect.objectContaining({
          role: "graph",
          coverage: "unavailable",
          attention_count: 0,
        }),
      ]),
    );
    const views = await reader.listProjectShellViews();
    expect(views).toHaveLength(1);
    expect(views[0]?.project_id).toBe(project.project_id);

    const controlsReader = new PostgresProjectEffectiveControlsViewReader(pool);
    const controls = await controlsReader.getProjectEffectiveControlsView(
      project.project_id,
    );
    if (controls === undefined) {
      throw new Error("Expected effective Project controls.");
    }
    expect(controls.content.authority.isolation).toBe("repeatable_read");
    expect(controls.content.project_ref).toEqual(
      expect.objectContaining({
        record_id: project.project_id,
        revision: project.revision,
      }),
    );
    expect(controls.content.project_definition_ref).toEqual(
      expect.objectContaining({
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
      }),
    );
    expect(controls.content.sections.privacy.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "petra.project.visibility",
          state: "effective",
          value: "private",
        }),
        expect.objectContaining({
          key: "petra.project.enabled-evidence-namespaces",
          state: "effective",
          value: project.enabled_evidence_namespaces,
        }),
      ]),
    );
    expect(controls.content.sections.capability.state).toBe("effective");
    const capabilityValue = controls.content.sections.capability.values[0];
    expect(controls.content.sections.capability.values).toHaveLength(1);
    expect(capabilityValue?.state).toBe("effective");
    expect(capabilityValue?.value).toEqual(
      capabilityGrant.content.allowed_commands,
    );
    expect(capabilityValue?.origin.owner_kind).toBe("capability_authority");
    expect(capabilityValue?.origin.record_ref.record_id).toBe(
      capabilityGrant.capability_grant_id,
    );
    expect(capabilityValue?.origin.record_ref.revision).toBe(
      capabilityGrant.revision,
    );
    expect(controls.content.sections.capability.history.state).toBe("retained");
    expect(controls.content.sections.model_routing.state).toBe("unsupported");
    expect(controls.content.sections.work_budget.state).toBe("unsupported");
    expect(controls.content.sections.review_policy.state).toBe("unsupported");

    view.content.project.name = "caller mutation";
    expect(
      (await reader.getProjectShellView(project.project_id))?.content.project
        .name,
    ).toBe(project.name);
  });

  it("executes bounded server-owned Project search across paired project-authored definitions", async () => {
    const { actor, project: scientificProject } = await registerScope();
    const scientificDefinition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const scientificObjective =
      readFixture<PetraProjectObjective>("project-objective");
    const writingProject = readFixture<PetraProject>(
      "project-controlled-writing",
    );
    const writingDefinition = readFixture<PetraProjectDefinition>(
      "project-definition-controlled-writing",
    );
    const writingObjective = readFixture<PetraProjectObjective>(
      "project-objective-controlled-writing",
    );

    await scopes.registerProjectRevision(writingProject);
    await repository.registerDefinitionRevision(scientificDefinition);
    await repository.registerDefinitionRevision(writingDefinition);
    await repository.registerObjectiveRevision(scientificObjective);
    await repository.registerObjectiveRevision(writingObjective);
    await repository.setCurrentObjectiveFocus({
      project_id: scientificProject.project_id,
      objective_ref: {
        objective_id: scientificObjective.objective_id,
        revision: scientificObjective.revision,
        content_hash: scientificObjective.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-08T15:10:00.000Z",
    });
    await repository.setCurrentObjectiveFocus({
      project_id: writingProject.project_id,
      objective_ref: {
        objective_id: writingObjective.objective_id,
        revision: writingObjective.revision,
        content_hash: writingObjective.content_hash,
      },
      changed_by: actor,
      changed_at: "2026-09-08T15:11:00.000Z",
    });

    const shellReader = new PostgresProjectShellViewReader(pool);
    const shells = await shellReader.listProjectShellViews();
    expect(shells).toHaveLength(2);
    const scientificShell = shells.find(
      (candidate) => candidate.project_id === scientificProject.project_id,
    );
    const writingShell = shells.find(
      (candidate) => candidate.project_id === writingProject.project_id,
    );
    if (scientificShell === undefined || writingShell === undefined) {
      throw new Error("Expected both paired Project shell views.");
    }
    expect(scientificShell.content.definition).toEqual(
      expect.objectContaining({
        project_definition_id: scientificDefinition.project_definition_id,
        definition_family: "petra.scientific-evidence",
      }),
    );
    expect(scientificShell.content.current_objective?.objective_kind).toBe(
      "scientific.research-question",
    );
    expect(
      scientificShell.content.definition.terms.find(
        (term) => term.generic_family === "reference",
      )?.plural,
    ).toBe("Sources");
    expect(
      scientificShell.content.place_summaries.find(
        (place) => place.role === "sources",
      )?.label,
    ).toBe("Sources");

    expect(writingShell.content.definition).toEqual(
      expect.objectContaining({
        project_definition_id: writingDefinition.project_definition_id,
        definition_family: "petra.controlled-writing",
        supported_places: scientificDefinition.content.supported_places,
      }),
    );
    expect(writingShell.content.current_objective?.objective_kind).toBe(
      "writing.document-purpose",
    );
    expect(
      writingShell.content.definition.terms.find(
        (term) => term.generic_family === "finding",
      )?.plural,
    ).toBe("Requirements");
    expect(
      writingShell.content.place_summaries.find(
        (place) => place.role === "sources",
      )?.label,
    ).toBe("Authority sources");

    const firstPage = await shellReader.searchProjectShellViews({ limit: 1 });
    expect(firstPage.content.query).toEqual({ limit: 1 });
    expect(firstPage.content.projects.map((view) => view.project_id)).toEqual([
      scientificProject.project_id,
    ]);
    expect(firstPage.content.page).toEqual({
      returned_count: 1,
      total_count: 2,
      has_more: true,
      next_cursor: "offset:1",
    });
    const nextCursor = firstPage.content.page.next_cursor;
    if (nextCursor === undefined) {
      throw new Error("Expected a Project collection continuation cursor.");
    }
    const secondPage = await shellReader.searchProjectShellViews({
      limit: 1,
      cursor: nextCursor,
    });
    expect(secondPage.content.projects.map((view) => view.project_id)).toEqual([
      writingProject.project_id,
    ]);
    expect(secondPage.content.page).toEqual({
      returned_count: 1,
      total_count: 2,
      has_more: false,
    });

    const objectiveMatch = await shellReader.searchProjectShellViews({
      search: "inspectable passages",
    });
    expect(
      objectiveMatch.content.projects.map((view) => view.project_id),
    ).toEqual([scientificProject.project_id]);
    const profileLabelMatch = await shellReader.searchProjectShellViews({
      search: "controlled writing",
    });
    expect(
      profileLabelMatch.content.projects.map((view) => view.project_id),
    ).toEqual([writingProject.project_id]);
    const profileFilter = await shellReader.searchProjectShellViews({
      profile: "petra.scientific-evidence",
      status: "active",
    });
    expect(
      profileFilter.content.projects.map((view) => view.project_id),
    ).toEqual([scientificProject.project_id]);
    const archived = await shellReader.searchProjectShellViews({
      status: "archived",
    });
    expect(archived.content.projects).toEqual([]);
    expect(archived.content.page.total_count).toBe(0);
    await expect(
      shellReader.searchProjectShellViews({ cursor: "offset:-1" }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PostgresProjectShellViewError>>({
        code: "PROJECT_SHELL_COLLECTION_REQUEST_INVALID",
      }),
    );

    const evidenceOutput =
      process.env.PETRA_WAVE6_PROJECT_SEARCH_EVIDENCE_OUTPUT;
    if (evidenceOutput !== undefined) {
      writeFileSync(
        evidenceOutput,
        `${JSON.stringify(
          {
            schema_name: "petra.wave6-project-search-authority-evidence",
            schema_version: "1.0.0",
            status: "passed",
            operation_id: "project.search",
            executed_at: new Date().toISOString(),
            runtime_owner:
              "GET /api/queries/projects -> ProjectShellViewReader.searchProjectShellViews -> PostgresProjectShellViewReader",
            authority: {
              authentication: "Bearer middleware at /api/*",
              persistence:
                "Current Project, ProjectDefinition, and Objective authority in one PostgreSQL REPEATABLE READ READ ONLY transaction",
              result_membership:
                "Server SQL over current Project name, current Objective statement, and current registered profile label",
            },
            verified: {
              bounded_limit: [1, 100],
              filters: ["search", "status", "profile"],
              pagination: "validated offset continuation with exact query echo",
              failures: [
                "unauthenticated route rejected",
                "unknown, repeated, or invalid controls rejected",
                "reader failure returned without client fallback",
              ],
              paired_profiles: [
                scientificDefinition.definition_family,
                writingDefinition.definition_family,
              ],
              first_page: firstPage.content.page,
              second_page: secondPage.content.page,
            },
            boundary:
              "Real disposable PostgreSQL proves server-owned filtering and pagination over retained current authority. Focused route and typed-client tests separately prove bearer enforcement, parameter rejection, exact query/result binding, and surfaced failures. The frozen React Find control still filters its loaded page locally and requires design-owned binding to this query before browser evidence can claim end-to-end server search.",
          },
          null,
          2,
        )}\n`,
      );
    }

    const controlsReader = new PostgresProjectEffectiveControlsViewReader(pool);
    const scientificControls =
      await controlsReader.getProjectEffectiveControlsView(
        scientificProject.project_id,
      );
    const writingControls =
      await controlsReader.getProjectEffectiveControlsView(
        writingProject.project_id,
      );
    if (scientificControls === undefined || writingControls === undefined) {
      throw new Error("Expected both paired effective-controls views.");
    }
    expect(
      scientificControls.content.sections.privacy.values.find(
        (value) => value.key === "petra.project.enabled-evidence-namespaces",
      )?.value,
    ).toEqual(["scholarly", "personal"]);
    expect(
      writingControls.content.sections.privacy.values.find(
        (value) => value.key === "petra.project.enabled-evidence-namespaces",
      )?.value,
    ).toEqual(["operational", "personal"]);
    expect(
      writingControls.content.project_definition_ref.project_definition_id,
    ).toBe(writingDefinition.project_definition_id);
    expect(writingControls.content.sections.model_routing.state).toBe(
      scientificControls.content.sections.model_routing.state,
    );
    expect(writingControls.content.sections.review_policy.state).toBe(
      scientificControls.content.sections.review_policy.state,
    );
    expect(scientificControls.content.sections.capability.state).toBe(
      "unavailable",
    );
    expect(writingControls.content.sections.capability.state).toBe(
      "unavailable",
    );

    const locationReader = new PostgresProjectObjectLocationViewReader(pool);
    const unsupportedWritingLocation = await locationReader.locateProjectObject(
      {
        project_id: writingProject.project_id,
        object_ref: {
          semantic_key: "writing.requirement",
          object_id: "requirement_01K4E000000000000000000004",
        },
        task_intent: "inspect",
      },
    );
    if (unsupportedWritingLocation === undefined) {
      throw new Error("Expected a controlled-writing location result.");
    }
    expect(unsupportedWritingLocation.content.definition_ref).toEqual(
      expect.objectContaining({
        project_definition_id: writingDefinition.project_definition_id,
        definition_family: "petra.controlled-writing",
      }),
    );
    const writingResolution = unsupportedWritingLocation.content.resolution;
    expect(writingResolution.state).toBe("unsupported");
    if (writingResolution.state !== "unsupported") {
      throw new Error("Expected an unsupported controlled-writing location.");
    }
    expect(writingResolution.failure.code).toBe("OBJECT_KIND_UNSUPPORTED");
    expect(unsupportedWritingLocation.content.primary_destination.role).toBe(
      "brief",
    );
    expect(unsupportedWritingLocation.content.context.details_allowed).toBe(
      false,
    );

    const origins = await pool.query<{
      definition_family: string;
      origin_kind: string;
    }>(
      `SELECT definition_family, origin_kind
         FROM petra.project_definition_revisions
        ORDER BY definition_family`,
    );
    expect(origins.rows).toEqual([
      {
        definition_family: "petra.controlled-writing",
        origin_kind: "project_authored",
      },
      {
        definition_family: "petra.scientific-evidence",
        origin_kind: "project_authored",
      },
    ]);
  });

  it("refuses to interpret a Project that has no ProjectDefinition", async () => {
    const { project } = await registerScope();
    const reader = new PostgresProjectShellViewReader(pool);
    await expect(
      reader.getProjectShellView(project.project_id),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PostgresProjectShellViewError>>({
        code: "PROJECT_SHELL_DEFINITION_MISSING",
      }),
    );
    const controlsReader = new PostgresProjectEffectiveControlsViewReader(pool);
    await expect(
      controlsReader.getProjectEffectiveControlsView(project.project_id),
    ).rejects.toEqual(
      expect.objectContaining<
        Partial<PostgresProjectEffectiveControlsViewError>
      >({
        code: "PROJECT_EFFECTIVE_CONTROLS_DEFINITION_MISSING",
      }),
    );
  });
});
