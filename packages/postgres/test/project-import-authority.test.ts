import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraProjectImportCommandRequest,
  PetraProjectProfileCommandRequest,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import type { ProjectImportError } from "@petra/core";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresProjectImportAuthority } from "../src/project-import-authority.js";
import { PostgresProjectProfileRuntime } from "../src/project-profile-runtime.js";
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

describePostgres("PostgreSQL retained Project import authority", () => {
  const pool = new Pool({ connectionString });
  const actor = readFixture<PetraActor>("actor");
  const profile = readFixture<PetraRegisteredProjectProfile>(
    "registered-project-profile-scientific-v1-2",
  );
  const principal = {
    actor_id: actor.actor_id,
    actor_kind: "human" as const,
  };
  const scopes = new PostgresResearchScopeRepository(pool);
  const profiles = new PostgresProjectProfileRuntime(
    pool,
    principal,
    undefined,
    { now: () => "2026-09-20T12:00:00.000Z" },
  );
  const imports = new PostgresProjectImportAuthority(
    pool,
    principal,
    undefined,
    { now: () => "2026-09-20T12:30:00.000Z" },
  );

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.project_import_command_receipts,
                petra.project_profile_command_receipts,
                petra.registered_project_profiles,
                petra.project_objective_focus_history,
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
    await scopes.registerActor(actor);
    await profiles.registerProfile(profile);
  });

  afterAll(async () => {
    await pool.end();
  });

  const createSource = async () => {
    const request: PetraProjectProfileCommandRequest = {
      schema_name: "petra.project-profile-command-request",
      schema_version: "1.0.0",
      command_id: "command_01K6P000000000000000000701",
      idempotency_key: "wave6:project-import:source",
      operation: "create",
      profile_ref: {
        profile_id: profile.profile_id,
        profile_version: profile.profile_version,
        content_hash: profile.content_hash,
      },
      project: {
        name: "Retained source Project",
        description: "The exact source for a reviewed derived Project.",
      },
      objective: {
        statement:
          "Retain the exact definition and focused objective ancestry.",
      },
    };
    return profiles.executeProjectProfileCommand(request);
  };

  const importRequest = async (): Promise<PetraProjectImportCommandRequest> => {
    const source = await createSource();
    return {
      schema_name: "petra.project-import-command-request",
      schema_version: "1.0.0",
      command_id: "command_01K6P000000000000000000702",
      idempotency_key: "wave6:project-import:derive",
      source: {
        source_kind: "retained_project",
        project_id: source.project_ref.project_id,
        project_revision: source.project_ref.revision,
        project_definition_ref: structuredClone(source.project_definition_ref),
        focused_objective_ref: structuredClone(source.objective_ref),
      },
      admission: {
        decision: "create_derived_project",
        copy_scope: "definition_and_focused_objective",
        source_effect: "preserve_without_modification",
        reviewed_at: "2026-09-20T12:20:00.000Z",
      },
      project: {
        name: "Derived Project",
        description: "A reviewed reuse with retained ancestry.",
      },
    };
  };

  it("creates one idempotent derived Project, preserves exact ancestry, and reconciles recovery", async () => {
    const request = await importRequest();
    const unknown = await imports.assessProjectImportCommandRecovery(request);
    const [receipt, replay] = await Promise.all([
      imports.executeProjectImportCommand(request),
      imports.executeProjectImportCommand(structuredClone(request)),
    ]);
    const ancestry = await imports.getProjectImportAncestry(
      receipt.result.project_ref.project_id,
    );
    const confirmed = await imports.assessProjectImportCommandRecovery(request);

    expect(unknown.content.effect.state).toBe("outcome_unknown");
    expect(unknown.content.eligible_actions[0]).toMatchObject({
      operation: "retry_exact_command",
      path: "/api/commands/projects/import",
      identity_behavior: "reuse_command_and_idempotency",
    });
    expect(replay).toStrictEqual(receipt);
    expect(ancestry).toStrictEqual(receipt);
    expect(confirmed.content.effect.state).toBe("effect_confirmed");
    expect(receipt.source.project_ref.project_id).toBe(
      request.source.project_id,
    );
    expect(receipt.result.project_ref.project_id).not.toBe(
      receipt.source.project_ref.project_id,
    );
    expect(receipt.source.project_definition_ref.content_hash).toBe(
      receipt.result.project_definition_ref.content_hash,
    );
    expect(receipt.source.focused_objective_ref.content_hash).toBe(
      receipt.result.focused_objective_ref.content_hash,
    );
    expect(receipt.material.retained_only).toContain("source_history");

    const rows = await pool.query<{
      project_count: string;
      receipt_count: string;
      source_status: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.projects) AS project_count,
         (SELECT count(*)::text FROM petra.project_import_command_receipts)
           AS receipt_count,
         (SELECT payload ->> 'status'
            FROM petra.project_revisions
           WHERE project_id = $1 AND revision = 1) AS source_status`,
      [request.source.project_id],
    );
    expect(rows.rows[0]).toStrictEqual({
      project_count: "2",
      receipt_count: "1",
      source_status: "active",
    });
  });

  it("fails closed for stale source review, conflicting identity, and missing authenticated authority", async () => {
    const stale = await importRequest();
    stale.source.project_revision += 1;
    await expect(imports.executeProjectImportCommand(stale)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectImportError>>({
        code: "PROJECT_IMPORT_SOURCE_STALE",
      }),
    );

    const request = await importRequest();
    await imports.executeProjectImportCommand(request);
    const conflicting = structuredClone(request);
    conflicting.project.name = "Conflicting derived name";
    await expect(
      imports.executeProjectImportCommand(conflicting),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectImportError>>({
        code: "PROJECT_IMPORT_COMMAND_CONFLICT",
      }),
    );
    const conflict =
      await imports.assessProjectImportCommandRecovery(conflicting);
    expect(conflict.content.effect).toMatchObject({
      state: "unavailable_to_verify",
      reason: "command_identity_conflict",
    });
    expect(conflict.content.eligible_actions).toStrictEqual([]);

    const unavailable = new PostgresProjectImportAuthority(pool);
    const fresh = structuredClone(request);
    fresh.command_id = "command_01K6P000000000000000000703";
    fresh.idempotency_key = "wave6:project-import:denied";
    await expect(
      unavailable.executeProjectImportCommand(fresh),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectImportError>>({
        code: "PROJECT_IMPORT_COMMAND_DENIED",
      }),
    );
  });
});
