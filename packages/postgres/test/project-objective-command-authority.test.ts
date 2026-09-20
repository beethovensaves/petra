import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraCapabilityGrantV1100,
  PetraProjectObjectiveCommandRequest,
  PetraProjectProfileCommandRequest,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
} from "../src/capability-grant-authority-repository.js";
import { PostgresProjectObjectiveCommandAuthority } from "../src/project-objective-command-authority.js";
import { PostgresProjectProfileRuntime } from "../src/project-profile-runtime.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

const fixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

interface ExactRows {
  readonly project_id: string;
  readonly project_revision: string;
  readonly project_record_hash: string;
  readonly project_definition_id: string;
  readonly project_definition_revision: string;
  readonly project_definition_content_hash: string;
  readonly project_definition_record_hash: string;
  readonly objective_id: string | null;
  readonly objective_revision: string | null;
  readonly objective_content_hash: string | null;
  readonly objective_record_hash: string | null;
  readonly objective_statement: string | null;
  readonly objective_kind: string | null;
}

describePostgres("PostgreSQL Project Objective command authority", () => {
  const pool = new Pool({ connectionString });
  const actor = fixture<PetraActor>("actor");
  const profile = fixture<PetraRegisteredProjectProfile>(
    "registered-project-profile-scientific-v1-2",
  );
  const principal = {
    actor: { actor_id: actor.actor_id, actor_kind: "human" as const },
    capabilityGrantId: "capability_grant_01K6P000000000000000000901",
  };
  const scopes = new PostgresResearchScopeRepository(pool);
  const profiles = new PostgresProjectProfileRuntime(
    pool,
    principal.actor,
    undefined,
    { now: () => "2026-09-19T12:00:00.000Z" },
  );
  const grants = new PostgresCapabilityGrantAuthorityRepository(pool);
  const commands = new PostgresProjectObjectiveCommandAuthority(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(),
  );

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.project_objective_command_receipts,
                petra.capability_grant_revocations,
                petra.capability_grants,
                petra.project_profile_command_receipts,
                petra.registered_project_profiles,
                petra.project_objective_focus_history,
                petra.project_objective_focus,
                petra.project_objective_dependencies,
                petra.project_objective_revisions,
                petra.project_objectives,
                petra.project_definition_history_bindings,
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

  const setup = async () => {
    const createRequest: PetraProjectProfileCommandRequest = {
      schema_name: "petra.project-profile-command-request",
      schema_version: "1.0.0",
      command_id: "command_01K6P000000000000000000902",
      idempotency_key: "wave6:objective:create-project",
      operation: "create",
      profile_ref: {
        profile_id: profile.profile_id,
        profile_version: profile.profile_version,
        content_hash: profile.content_hash,
      },
      project: { name: "Objective command Project" },
      objective: { statement: "Which original question should be refined?" },
    };
    const created = await profiles.executeProjectProfileCommand(createRequest);
    const grantContent: PetraCapabilityGrantV1100["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["FrameProjectObjective"],
      valid_from: "2026-09-19T00:00:00.000Z",
      reason:
        "Permit the Project author to apply one reviewed Objective revision.",
    };
    const grant: PetraCapabilityGrantV1100 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.10.0",
      capability_grant_id: principal.capabilityGrantId,
      revision: 1,
      project_id: created.project_ref.project_id,
      grantee: principal.actor,
      content: grantContent,
      content_hash: hash(grantContent),
      issued_by: principal.actor,
      issued_at: "2026-09-19T00:00:00.000Z",
    };
    await grants.registerCapabilityGrant(grant);
    return created.project_ref.project_id;
  };

  const exactRows = async (projectId: string): Promise<ExactRows> => {
    const result = await pool.query<ExactRows>(
      `SELECT project.project_id,
              project_revision.revision AS project_revision,
              project_revision.record_hash AS project_record_hash,
              definition.project_definition_id,
              definition_revision.revision AS project_definition_revision,
              definition_revision.content_hash AS project_definition_content_hash,
              definition_revision.record_hash AS project_definition_record_hash,
              objective_revision.objective_id,
              objective_revision.revision AS objective_revision,
              objective_revision.content_hash AS objective_content_hash,
              objective_revision.record_hash AS objective_record_hash,
              objective_revision.payload #>> '{content,statement}' AS objective_statement,
              objective_revision.payload #>> '{content,objective_kind}' AS objective_kind
         FROM petra.projects AS project
         JOIN petra.project_revisions AS project_revision
           ON project_revision.project_id = project.project_id
          AND project_revision.revision = project.current_revision
         JOIN petra.project_definitions AS definition
           ON definition.project_id = project.project_id
         JOIN petra.project_definition_revisions AS definition_revision
           ON definition_revision.project_definition_id = definition.project_definition_id
          AND definition_revision.revision = definition.current_revision
         LEFT JOIN petra.project_objective_focus AS focus
           ON focus.project_id = project.project_id
         LEFT JOIN petra.project_objective_revisions AS objective_revision
           ON objective_revision.project_id = focus.project_id
          AND objective_revision.objective_id = focus.objective_id
          AND objective_revision.revision = focus.objective_revision
          AND objective_revision.content_hash = focus.objective_content_hash
        WHERE project.project_id = $1`,
      [projectId],
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error("Missing exact Project setup rows.");
    return row;
  };

  const request = (
    row: ExactRows,
    overrides: Partial<
      Pick<
        PetraProjectObjectiveCommandRequest,
        "command_id" | "idempotency_key"
      >
    > = {},
  ): PetraProjectObjectiveCommandRequest => {
    if (
      row.objective_id === null ||
      row.objective_revision === null ||
      row.objective_content_hash === null ||
      row.objective_record_hash === null ||
      row.objective_statement === null ||
      row.objective_kind === null
    ) {
      throw new Error("Expected one exact focused Objective.");
    }
    return {
      schema_name: "petra.project-objective-command-request",
      schema_version: "1.0.0",
      command_id: overrides.command_id ?? "command_01K6P000000000000000000903",
      idempotency_key: overrides.idempotency_key ?? "wave6:objective:revise",
      operation: "revise",
      expected: {
        project_ref: {
          project_id: row.project_id,
          revision: Number(row.project_revision),
          record_hash: row.project_record_hash,
        },
        project_definition_ref: {
          project_definition_id: row.project_definition_id,
          revision: Number(row.project_definition_revision),
          content_hash: row.project_definition_content_hash,
          record_hash: row.project_definition_record_hash,
        },
        focus: {
          state: "focused",
          objective_ref: {
            objective_id: row.objective_id,
            revision: Number(row.objective_revision),
            content_hash: row.objective_content_hash,
            record_hash: row.objective_record_hash,
          },
        },
      },
      review: {
        decision: "apply",
        rough_statement: row.objective_statement,
        proposed_content: {
          objective_kind: row.objective_kind,
          statement:
            "Which exact population, task, and outcome bound the refined question?",
          status: "active",
          dependency_refs: [],
        },
        reviewed_at: "2026-09-19T12:10:00.000Z",
      },
    };
  };

  it("revises once, replays idempotently, reconciles recovery, and returns the exact Brief focus", async () => {
    const projectId = await setup();
    const revisionRequest = request(await exactRows(projectId));

    const unknown = await commands.assessProjectObjectiveCommandRecovery(
      projectId,
      revisionRequest,
      principal,
    );
    const [result, replay] = await Promise.all([
      commands.executeProjectObjectiveCommand(
        projectId,
        revisionRequest,
        principal,
      ),
      commands.executeProjectObjectiveCommand(
        projectId,
        structuredClone(revisionRequest),
        principal,
      ),
    ]);
    const confirmed = await commands.assessProjectObjectiveCommandRecovery(
      projectId,
      revisionRequest,
      principal,
    );

    expect(unknown.effect.state).toBe("outcome_unknown");
    expect(replay.receipt).toStrictEqual(result.receipt);
    expect([result.applied, replay.applied].sort()).toStrictEqual([
      false,
      true,
    ]);
    expect(result.objective.revision).toBe(2);
    expect(result.receipt.review.rough_statement).toBe(
      revisionRequest.review.rough_statement,
    );
    expect(result.receipt.destination).toStrictEqual({
      place_role: "brief",
      project_id: projectId,
      objective_ref: result.receipt.objective_ref,
    });
    expect(confirmed.effect.state).toBe("effect_confirmed");
    expect(confirmed.return).toStrictEqual({
      state: "exact",
      destination: result.receipt.destination,
    });

    const retained = await pool.query<{
      focus_revision: string;
      receipt_count: string;
      objective_revision_count: string;
    }>(
      `SELECT
         (SELECT objective_revision::text
            FROM petra.project_objective_focus
           WHERE project_id = $1) AS focus_revision,
         (SELECT count(*)::text
            FROM petra.project_objective_command_receipts) AS receipt_count,
         (SELECT count(*)::text
            FROM petra.project_objective_revisions
           WHERE objective_id = $2) AS objective_revision_count`,
      [projectId, result.objective.objective_id],
    );
    expect(retained.rows[0]).toStrictEqual({
      focus_revision: "2",
      receipt_count: "1",
      objective_revision_count: "2",
    });
  });

  it("frames after reviewed absence and fails closed for stale focus, identity conflict, and denied authority", async () => {
    const projectId = await setup();
    const staleRequest = request(await exactRows(projectId), {
      command_id: "command_01K6P000000000000000000904",
      idempotency_key: "wave6:objective:stale",
    });
    await commands.executeProjectObjectiveCommand(
      projectId,
      request(await exactRows(projectId)),
      principal,
    );
    await expect(
      commands.executeProjectObjectiveCommand(
        projectId,
        staleRequest,
        principal,
      ),
    ).rejects.toMatchObject({ code: "PROJECT_OBJECTIVE_COMMAND_FOCUS_STALE" });

    const current = await exactRows(projectId);
    const conflicting = request(current, {
      command_id: "command_01K6P000000000000000000905",
      idempotency_key: "wave6:objective:conflict",
    });
    await commands.executeProjectObjectiveCommand(
      projectId,
      conflicting,
      principal,
    );
    const changed = structuredClone(conflicting);
    changed.review.proposed_content.statement =
      "A conflicting reviewed statement.";
    await expect(
      commands.executeProjectObjectiveCommand(projectId, changed, principal),
    ).rejects.toMatchObject({ code: "PROJECT_OBJECTIVE_COMMAND_CONFLICT" });

    await pool.query(
      "DELETE FROM petra.project_objective_focus WHERE project_id = $1",
      [projectId],
    );
    const withoutFocus = await exactRows(projectId);
    const frameRequest: PetraProjectObjectiveCommandRequest = {
      schema_name: "petra.project-objective-command-request",
      schema_version: "1.0.0",
      command_id: "command_01K6P000000000000000000906",
      idempotency_key: "wave6:objective:frame",
      operation: "frame",
      expected: {
        project_ref: {
          project_id: projectId,
          revision: Number(withoutFocus.project_revision),
          record_hash: withoutFocus.project_record_hash,
        },
        project_definition_ref: {
          project_definition_id: withoutFocus.project_definition_id,
          revision: Number(withoutFocus.project_definition_revision),
          content_hash: withoutFocus.project_definition_content_hash,
          record_hash: withoutFocus.project_definition_record_hash,
        },
        focus: { state: "none" },
      },
      review: {
        decision: "apply",
        rough_statement: "A rough new question",
        proposed_content: {
          objective_kind: profile.content.objective_kind,
          statement: "What exact outcome should this new inquiry explain?",
          status: "active",
          dependency_refs: [],
        },
        reviewed_at: "2026-09-19T12:20:00.000Z",
      },
    };
    const framed = await commands.executeProjectObjectiveCommand(
      projectId,
      frameRequest,
      principal,
    );
    expect(framed.receipt.effect.kind).toBe("objective_framed");
    expect(framed.objective.revision).toBe(1);

    const denied = request(await exactRows(projectId), {
      command_id: "command_01K6P000000000000000000907",
      idempotency_key: "wave6:objective:denied",
    });
    await expect(
      commands.executeProjectObjectiveCommand(projectId, denied, {
        actor: principal.actor,
        capabilityGrantId: "capability_grant_01K6P000000000000000000999",
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_OBJECTIVE_COMMAND_NOT_AUTHORIZED",
    });
  });
});
