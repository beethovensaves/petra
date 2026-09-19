import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type {
  PetraActor,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectProfileCommandRequest,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { ProjectProfileRuntimeError } from "@petra/core";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresProjectProfileRuntime } from "../src/project-profile-runtime.js";
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

const commandRequest = (
  profile: PetraRegisteredProjectProfile,
  commandId: string,
  operation: "create" | "reset" = "create",
  expectedProject?: { project_id: string; revision: number },
): PetraProjectProfileCommandRequest => ({
  schema_name: "petra.project-profile-command-request",
  schema_version: "1.0.0",
  command_id: commandId,
  idempotency_key: `wave6:profile:${commandId}`,
  operation,
  profile_ref: {
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    content_hash: profile.content_hash,
  },
  ...(expectedProject === undefined
    ? {}
    : { expected_project: expectedProject }),
  project: {
    name:
      profile.definition_family === "petra.controlled-writing"
        ? "Controlled procedure"
        : "Competing explanations",
    description: "A bounded Wave 6 registered-profile runtime Project.",
  },
  objective: {
    statement:
      profile.definition_family === "petra.controlled-writing"
        ? "Prepare an auditable operating procedure."
        : "Compare the retained explanations against their exact basis.",
  },
});

describePostgres("PostgreSQL registered Project profile runtime", () => {
  const pool = new Pool({ connectionString });
  const actor = readFixture<PetraActor>("actor");
  const scientificV1 = readFixture<PetraRegisteredProjectProfile>(
    "registered-project-profile-scientific",
  );
  const scientific = readFixture<PetraRegisteredProjectProfile>(
    "registered-project-profile-scientific-v1-1",
  );
  const writing = readFixture<PetraRegisteredProjectProfile>(
    "registered-project-profile-controlled-writing",
  );
  const project = readFixture<PetraProject>("project");
  const scientificDefinition = readFixture<PetraProjectDefinition>(
    "project-definition-scientific",
  );
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const runtime = new PostgresProjectProfileRuntime(
    pool,
    { actor_id: actor.actor_id, actor_kind: "human" },
    undefined,
    { now: () => "2026-09-18T17:00:00.000Z" },
  );

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.project_profile_command_receipts,
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
    await runtime.registerProfile(scientificV1);
    await runtime.registerProfile(scientific);
    await runtime.registerProfile(writing);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates paired profile Projects and returns their exact versioned taxonomies", async () => {
    const listed = await runtime.listRegisteredProfiles();
    expect(listed).toHaveLength(2);
    expect(
      listed.find((profile) => profile.profile_id === scientific.profile_id)
        ?.profile_version,
    ).toBe("1.1.0");
    await expect(
      runtime.getRegisteredProfile(scientificV1.profile_id, "1.0.0"),
    ).resolves.toStrictEqual(scientificV1);
    await expect(
      runtime.getRegisteredProfile(scientific.profile_id),
    ).resolves.toStrictEqual(scientific);
    const scientificRequest = commandRequest(
      scientific,
      "command_01K6P000000000000000000101",
    );
    const writingRequest = commandRequest(
      writing,
      "command_01K6P000000000000000000102",
    );

    const scientificReceipt =
      await runtime.executeProjectProfileCommand(scientificRequest);
    const replay = await runtime.executeProjectProfileCommand(
      structuredClone(scientificRequest),
    );
    const writingReceipt =
      await runtime.executeProjectProfileCommand(writingRequest);
    const scientificTaxonomy = await runtime.getProjectProfileTaxonomy(
      scientificReceipt.project_ref.project_id,
      1,
    );
    const writingTaxonomy = await runtime.getProjectProfileTaxonomy(
      writingReceipt.project_ref.project_id,
    );

    expect(replay).toStrictEqual(scientificReceipt);
    expect(scientificTaxonomy?.resolution.state).toBe("registered");
    expect(writingTaxonomy?.resolution.state).toBe("registered");
    if (
      scientificTaxonomy?.resolution.state !== "registered" ||
      writingTaxonomy?.resolution.state !== "registered"
    ) {
      throw new Error("Expected both exact registered profile taxonomies.");
    }
    expect(
      scientificTaxonomy.resolution.taxonomy.terminology.map(
        (term) => term.singular,
      ),
    ).toContain("Claim");
    expect(
      writingTaxonomy.resolution.taxonomy.terminology.map(
        (term) => term.singular,
      ),
    ).toContain("Requirement");
    expect(scientificTaxonomy.resolution.taxonomy.model_roles.state).toBe(
      "available",
    );
    expect(writingTaxonomy.resolution.taxonomy.model_roles.state).toBe(
      "unavailable",
    );
  });

  it("fails closed for unknown profile selection without creating a Project", async () => {
    const request = commandRequest(
      scientific,
      "command_01K6P000000000000000000103",
    );
    request.profile_ref.profile_id =
      "project_template_01K6P000000000000000000099";

    await expect(runtime.executeProjectProfileCommand(request)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectProfileRuntimeError>>({
        code: "PROJECT_PROFILE_NOT_REGISTERED",
      }),
    );
    const count = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM petra.projects",
    );
    expect(count.rows[0]?.count).toBe("0");
  });

  it("returns a safe unsupported taxonomy when a retained Project names an unregistered profile", async () => {
    const definition = structuredClone(scientificDefinition);
    definition.origin = {
      origin_kind: "template_seed",
      template_id: "project_template_01K6P000000000000000000099",
      template_version: "9.9.9",
      template_hash:
        "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    };

    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);

    const taxonomy = await runtime.getProjectProfileTaxonomy(
      project.project_id,
    );

    expect(taxonomy?.resolution).toStrictEqual({
      state: "unsupported_profile",
      reason: "profile_not_registered",
      profile_ref: {
        profile_id: definition.origin.template_id,
        profile_version: definition.origin.template_version,
        content_hash: definition.origin.template_hash,
      },
      message:
        "The exact profile version for this Project is unavailable. Petra will not borrow labels, operations, or meaning from another profile.",
      safe_destination: "projects",
    });
  });

  it("resets additively by archiving the exact prior Project and creating the selected paired profile", async () => {
    const created = await runtime.executeProjectProfileCommand(
      commandRequest(scientific, "command_01K6P000000000000000000104"),
    );
    const resetRequest = commandRequest(
      writing,
      "command_01K6P000000000000000000105",
      "reset",
      { project_id: created.project_ref.project_id, revision: 1 },
    );

    const unknownReset =
      await runtime.assessProjectProfileCommandRecovery(resetRequest);
    expect(unknownReset.content.eligible_actions[0]).toMatchObject({
      operation: "retry_exact_command",
      path: `/api/commands/projects/${created.project_ref.project_id}/reset`,
      identity_behavior: "reuse_command_and_idempotency",
    });
    const reset = await runtime.executeProjectProfileCommand(resetRequest);
    const recoveredReset =
      await runtime.assessProjectProfileCommandRecovery(resetRequest);
    const prior = await scopes.getProject(created.project_ref.project_id);
    const replacement = await scopes.getProject(reset.project_ref.project_id);
    const taxonomy = await runtime.getProjectProfileTaxonomy(
      reset.project_ref.project_id,
    );

    expect(reset.prior_project_ref).toStrictEqual({
      project_id: created.project_ref.project_id,
      revision: 2,
      resulting_status: "archived",
    });
    expect(recoveredReset.content.effect.state).toBe("effect_confirmed");
    expect(recoveredReset.content.preservation).toContainEqual({
      item: "prior_project",
      identity: created.project_ref.project_id,
      revision: 2,
      durability: "postgresql",
      state: "archived",
    });
    expect(prior?.status).toBe("archived");
    expect(replacement?.status).toBe("active");
    expect(taxonomy?.resolution.state).toBe("registered");
    if (taxonomy?.resolution.state === "registered") {
      expect(taxonomy.resolution.profile_ref.profile_id).toBe(
        writing.profile_id,
      );
    }

    const staleReset = structuredClone(resetRequest);
    staleReset.command_id = "command_01K6P000000000000000000106";
    staleReset.idempotency_key = "wave6:profile:stale-reset";
    await expect(
      runtime.executeProjectProfileCommand(staleReset),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectProfileRuntimeError>>({
        code: "PROJECT_PROFILE_RESET_STALE",
      }),
    );
  });

  it("reconciles unknown, confirmed, and conflicting Project command effects without a second mutation", async () => {
    const request = commandRequest(
      scientific,
      "command_01K6P000000000000000000107",
    );

    const unknown = await runtime.assessProjectProfileCommandRecovery(request);
    expect(unknown.content.effect.state).toBe("outcome_unknown");
    expect(unknown.content.eligible_actions).toHaveLength(1);
    expect(unknown.content.eligible_actions[0]).toMatchObject({
      operation: "retry_exact_command",
      owner: "project_profile_command",
      path: "/api/commands/projects",
      identity_behavior: "reuse_command_and_idempotency",
      execution_recheck: true,
    });
    expect(unknown.content.return).toStrictEqual({
      state: "safe_fallback",
      destination: { place_role: "projects" },
      reason:
        "No retained receipt supplies an exact resulting Project yet. Return to Projects without implying command success.",
    });

    const receipt = await runtime.executeProjectProfileCommand(request);
    const confirmed =
      await runtime.assessProjectProfileCommandRecovery(request);
    expect(confirmed.content.effect).toStrictEqual({
      state: "effect_confirmed",
      meaning:
        "The exact Project-profile command receipt is retained. Repeating the same request returns this receipt without another effect.",
      receipt,
    });
    expect(confirmed.content.eligible_actions[0]).toMatchObject({
      operation: "open_resulting_project",
      owner: "browser_navigation",
      path: `/projects/${receipt.project_ref.project_id}`,
      authority_effect:
        "Navigation has no authority effect and uses the exact resulting Project identity from the retained receipt.",
    });
    expect(confirmed.content.return).toStrictEqual({
      state: "exact",
      destination: receipt.destination,
      reason:
        "The retained receipt supplies the resulting Project Brief destination.",
    });

    const conflicting = structuredClone(request);
    conflicting.project.name = "A different request under reused identity";
    const conflict =
      await runtime.assessProjectProfileCommandRecovery(conflicting);
    expect(conflict.content.effect).toMatchObject({
      state: "unavailable_to_verify",
      reason: "command_identity_conflict",
    });
    expect(conflict.content.eligible_actions).toStrictEqual([]);

    const counts = await pool.query<{ projects: string; receipts: string }>(
      `SELECT
         (SELECT count(*)::text FROM petra.projects) AS projects,
         (SELECT count(*)::text FROM petra.project_profile_command_receipts)
           AS receipts`,
    );
    expect(counts.rows[0]).toStrictEqual({ projects: "1", receipts: "1" });
  });

  it("executes UX1.6-TAXONOMY/registered-profile-runtime through production owners", async () => {
    const scientificReceipt = await runtime.executeProjectProfileCommand(
      commandRequest(scientific, "command_01K6P000000000000000000111"),
    );
    const writingReceipt = await runtime.executeProjectProfileCommand(
      commandRequest(writing, "command_01K6P000000000000000000112"),
    );
    const scientificTaxonomy = await runtime.getProjectProfileTaxonomy(
      scientificReceipt.project_ref.project_id,
      1,
    );
    const writingTaxonomy = await runtime.getProjectProfileTaxonomy(
      writingReceipt.project_ref.project_id,
      1,
    );
    const resetReceipt = await runtime.executeProjectProfileCommand(
      commandRequest(writing, "command_01K6P000000000000000000113", "reset", {
        project_id: scientificReceipt.project_ref.project_id,
        revision: 1,
      }),
    );
    const resetTaxonomy = await runtime.getProjectProfileTaxonomy(
      resetReceipt.project_ref.project_id,
    );
    const unknownRequest = commandRequest(
      scientific,
      "command_01K6P000000000000000000114",
    );
    unknownRequest.profile_ref.profile_id =
      "project_template_01K6P000000000000000000099";
    let unknownCode: string | undefined;
    try {
      await runtime.executeProjectProfileCommand(unknownRequest);
    } catch (error) {
      if (error instanceof ProjectProfileRuntimeError) {
        unknownCode = error.code;
      } else {
        throw error;
      }
    }

    expect(scientificTaxonomy?.resolution.state).toBe("registered");
    expect(writingTaxonomy?.resolution.state).toBe("registered");
    expect(resetTaxonomy?.resolution.state).toBe("registered");
    expect(unknownCode).toBe("PROJECT_PROFILE_NOT_REGISTERED");
    const projectCount = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM petra.projects",
    );
    expect(projectCount.rows[0]?.count).toBe("3");

    const evidenceOutput = process.env.PETRA_WAVE6_EVIDENCE_OUTPUT;
    if (evidenceOutput !== undefined) {
      if (
        process.env.PETRA_WAVE6_EVIDENCE_SCENARIO !==
        "UX1.6-TAXONOMY/registered-profile-runtime"
      ) {
        throw new Error(
          "A Wave 6 evidence output requires the exact registered-profile-runtime scenario identity.",
        );
      }
      const artifact = {
        scenario_id: "UX1.6-TAXONOMY/registered-profile-runtime",
        status: "passed",
        executed_at: "2026-09-18T17:00:00.000Z",
        production_owners: [
          "PostgresProjectProfileRuntime.executeProjectProfileCommand",
          "PostgresProjectProfileRuntime.getProjectProfileTaxonomy",
        ],
        database: "fresh PostgreSQL 18.6 with Flyway V001-V044",
        observations: {
          registered_profiles: [
            {
              profile_id: scientific.profile_id,
              profile_version: scientific.profile_version,
              definition_family: scientific.definition_family,
              project_id: scientificReceipt.project_ref.project_id,
              definition_revision:
                scientificTaxonomy?.project_definition_ref.revision,
              finding_term:
                scientificTaxonomy?.resolution.state === "registered"
                  ? scientificTaxonomy.resolution.taxonomy.terminology.find(
                      (term) => term.generic_family === "finding",
                    )?.singular
                  : undefined,
              model_roles:
                scientificTaxonomy?.resolution.state === "registered"
                  ? scientificTaxonomy.resolution.taxonomy.model_roles.state
                  : undefined,
            },
            {
              profile_id: writing.profile_id,
              profile_version: writing.profile_version,
              definition_family: writing.definition_family,
              project_id: writingReceipt.project_ref.project_id,
              definition_revision:
                writingTaxonomy?.project_definition_ref.revision,
              finding_term:
                writingTaxonomy?.resolution.state === "registered"
                  ? writingTaxonomy.resolution.taxonomy.terminology.find(
                      (term) => term.generic_family === "finding",
                    )?.singular
                  : undefined,
              model_roles:
                writingTaxonomy?.resolution.state === "registered"
                  ? writingTaxonomy.resolution.taxonomy.model_roles.state
                  : undefined,
            },
          ],
          reset: {
            prior_project: resetReceipt.prior_project_ref,
            resulting_project: resetReceipt.project_ref,
            resulting_profile:
              resetTaxonomy?.resolution.state === "registered"
                ? resetTaxonomy.resolution.profile_ref
                : undefined,
          },
          unsupported_profile: {
            result_code: unknownCode,
            project_count_after_rejection: Number(
              projectCount.rows[0]?.count ?? "0",
            ),
            fallback_profile_used: false,
          },
        },
        boundary:
          "Exercises registered selection, atomic Project-owned definition/objective creation, exact versioned taxonomy reads, paired scientific/controlled-writing semantics, additive reset, and unknown-profile rejection through PostgreSQL production owners. It does not exercise the design-owned profile UI.",
      };
      mkdirSync(dirname(evidenceOutput), { recursive: true });
      writeFileSync(evidenceOutput, `${JSON.stringify(artifact, null, 2)}\n`);
    }
  });
});
