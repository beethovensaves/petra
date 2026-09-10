import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraCapabilityGrant,
  PetraCapabilityGrantRecord,
  PetraCapabilityGrantRevocation,
  PetraCapabilityGrantV110,
  PetraProject,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type {
  PostgresCapabilityGrantError,
  PostgresCapabilityGrantErrorCode,
} from "../src/capability-grant-authority-repository.js";
import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
} from "../src/capability-grant-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresSingleUserCommandPrincipalResolver } from "../src/single-user-command-principal-resolver.js";

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
  code: PostgresCapabilityGrantErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresCapabilityGrantError>>({ code }),
  );
};

describePostgres("PostgreSQL CapabilityGrant authority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const repository = new PostgresCapabilityGrantAuthorityRepository(pool);
  const authorizer = new PostgresCapabilityGrantCommandAuthorizer();

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.capability_grant_revocations,
                petra.capability_grants,
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

  const evaluate = async (
    grant: PetraCapabilityGrantRecord,
    overrides: Partial<{
      actor: PetraCapabilityGrant["grantee"];
      capabilityGrantId: string;
      commandName:
        | "SubmitChangeSet"
        | "RecordApproval"
        | "ApplyChangeSet"
        | "ExcludeProjectSource"
        | "RestoreProjectSource"
        | "CreateProjectSourceReplacement"
        | "RetractProjectSourceReplacement";
      projectId: string;
    }> = {},
  ): Promise<boolean> => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const result = await authorizer.authorize(
        {
          actor: overrides.actor ?? grant.grantee,
          capabilityGrantId:
            overrides.capabilityGrantId ?? grant.capability_grant_id,
          commandName: overrides.commandName ?? "ExcludeProjectSource",
          projectId: overrides.projectId ?? grant.project_id,
        },
        client,
      );
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };

  it("authorizes the governed replacement commands through a v1.1 grant", async () => {
    await registerScope();
    const grant = readFixture<PetraCapabilityGrantV110>(
      "capability-grant-v1-1",
    );

    await expect(repository.registerCapabilityGrant(grant)).resolves.toEqual(
      grant,
    );
    await expect(
      evaluate(grant, { commandName: "CreateProjectSourceReplacement" }),
    ).resolves.toBe(true);
    await expect(
      evaluate(grant, { commandName: "RetractProjectSourceReplacement" }),
    ).resolves.toBe(true);
    await expect(
      evaluate(grant, { commandName: "RestoreProjectSource" }),
    ).resolves.toBe(false);
  });

  it("registers one immutable exact command grant and fails closed outside its scope", async () => {
    await registerScope();
    const grant = readFixture<PetraCapabilityGrant>("capability-grant");

    await expect(repository.registerCapabilityGrant(grant)).resolves.toEqual(
      grant,
    );
    await expect(
      repository.registerCapabilityGrant(structuredClone(grant)),
    ).resolves.toEqual(grant);
    await expect(
      repository.getCapabilityGrant(grant.capability_grant_id),
    ).resolves.toEqual(grant);
    await expect(
      repository.listProjectCapabilityGrants(grant.project_id),
    ).resolves.toEqual([grant]);

    await expect(evaluate(grant)).resolves.toBe(true);
    await expect(
      evaluate(grant, { commandName: "RestoreProjectSource" }),
    ).resolves.toBe(true);
    await expect(
      evaluate(grant, {
        actor: {
          actor_id: "actor_01K4C000000000000000000051",
          actor_kind: "human",
        },
      }),
    ).resolves.toBe(false);
    await expect(
      evaluate(grant, {
        projectId: "project_01K4C000000000000000000052",
      }),
    ).resolves.toBe(false);
    await expect(
      evaluate(grant, {
        capabilityGrantId: "capability_grant_01K4C000000000000000000053",
      }),
    ).resolves.toBe(false);

    const stored = await pool.query<{ record_hash: string }>(
      `SELECT record_hash
         FROM petra.capability_grants
        WHERE capability_grant_id = $1`,
      [grant.capability_grant_id],
    );
    expect(stored.rows[0]?.record_hash).toBe(canonicalHash(grant));
    await expect(
      pool.query(
        `UPDATE petra.capability_grants
            SET allowed_commands = ARRAY['ExcludeProjectSource']::text[]
          WHERE capability_grant_id = $1`,
        [grant.capability_grant_id],
      ),
    ).rejects.toThrow(/immutable/u);
  });

  it("resolves only one active grant for the configured local human", async () => {
    const { actor, project } = await registerScope();
    const resolver = new PostgresSingleUserCommandPrincipalResolver(pool, {
      actor_id: actor.actor_id,
      actor_kind: "human",
    });
    const request = {
      projectId: project.project_id,
      commandName: "ExcludeProjectSource" as const,
    };

    await expect(resolver.resolveCommandPrincipal(request)).resolves.toEqual({
      state: "denied",
      reason: "active_grant_not_found",
    });

    const grant = readFixture<PetraCapabilityGrant>("capability-grant");
    await repository.registerCapabilityGrant(grant);
    await expect(resolver.resolveCommandPrincipal(request)).resolves.toEqual({
      state: "resolved",
      actor: {
        actor_id: actor.actor_id,
        actor_kind: "human",
      },
      capabilityGrantId: grant.capability_grant_id,
    });
    await expect(
      resolver.resolveCommandPrincipal({
        ...request,
        commandName: "ApplyChangeSet",
      }),
    ).resolves.toEqual({
      state: "resolved",
      actor: {
        actor_id: actor.actor_id,
        actor_kind: "human",
      },
      capabilityGrantId: grant.capability_grant_id,
    });

    const overlappingGrant = structuredClone(grant);
    overlappingGrant.capability_grant_id =
      "capability_grant_01K4C000000000000000000056";
    await repository.registerCapabilityGrant(overlappingGrant);
    await expect(resolver.resolveCommandPrincipal(request)).resolves.toEqual({
      state: "denied",
      reason: "active_grant_ambiguous",
    });

    const revocation = readFixture<PetraCapabilityGrantRevocation>(
      "capability-grant-revocation",
    );
    await repository.registerCapabilityGrantRevocation(revocation);
    await expect(resolver.resolveCommandPrincipal(request)).resolves.toEqual({
      state: "resolved",
      actor: {
        actor_id: actor.actor_id,
        actor_kind: "human",
      },
      capabilityGrantId: overlappingGrant.capability_grant_id,
    });
  });

  it("does not resolve a configured human absent from canonical Actor authority", async () => {
    const { project } = await registerScope();
    const resolver = new PostgresSingleUserCommandPrincipalResolver(pool, {
      actor_id: "actor_01K4C000000000000000000057",
      actor_kind: "human",
    });

    await expect(
      resolver.resolveCommandPrincipal({
        projectId: project.project_id,
        commandName: "ExcludeProjectSource",
      }),
    ).resolves.toEqual({
      state: "denied",
      reason: "actor_not_registered",
    });
  });

  it("rejects invalid time, content rebinding, absent grantees, and non-owner issuers", async () => {
    await registerScope();
    const grant = readFixture<PetraCapabilityGrant>("capability-grant");

    const badHash = structuredClone(grant);
    badHash.content.reason = "Changed without changing the content hash.";
    await expectCode(
      () => repository.registerCapabilityGrant(badHash),
      "CAPABILITY_GRANT_CONTENT_HASH_MISMATCH",
    );

    const invalidTime = structuredClone(grant);
    invalidTime.content.expires_at = invalidTime.content.valid_from;
    invalidTime.content_hash = canonicalHash(invalidTime.content);
    await expectCode(
      () => repository.registerCapabilityGrant(invalidTime),
      "CAPABILITY_GRANT_TIME_INVALID",
    );

    const futureIssuance = structuredClone(grant);
    futureIssuance.issued_at = "2999-01-01T00:00:00.000Z";
    futureIssuance.content.valid_from = futureIssuance.issued_at;
    futureIssuance.content_hash = canonicalHash(futureIssuance.content);
    await expectCode(
      () => repository.registerCapabilityGrant(futureIssuance),
      "CAPABILITY_GRANT_TIME_INVALID",
    );

    const absentGrantee = structuredClone(grant);
    absentGrantee.grantee.actor_id = "actor_01K4C000000000000000000054";
    await expectCode(
      () => repository.registerCapabilityGrant(absentGrantee),
      "CAPABILITY_GRANT_REFERENCE_MISSING",
    );

    const otherHuman: PetraActor = {
      ...readFixture<PetraActor>("actor"),
      actor_id: "actor_01K4C000000000000000000055",
      display_name: "Another local human",
    };
    await scopes.registerActor(otherHuman);
    const nonOwner = structuredClone(grant);
    nonOwner.issued_by = {
      actor_id: otherHuman.actor_id,
      actor_kind: "human",
    };
    await expectCode(
      () => repository.registerCapabilityGrant(nonOwner),
      "CAPABILITY_GRANT_ISSUER_NOT_PROJECT_OWNER",
    );

    await repository.registerCapabilityGrant(grant);
    const rebound = structuredClone(grant);
    rebound.content.reason = "Attempt to broaden an existing grant identity.";
    rebound.content_hash = canonicalHash(rebound.content);
    await expectCode(
      () => repository.registerCapabilityGrant(rebound),
      "CAPABILITY_GRANT_ID_CONFLICT",
    );
  });

  it("retains exact revocation and serializes it after an authorized command transaction", async () => {
    await registerScope();
    const grant = readFixture<PetraCapabilityGrant>("capability-grant");
    const revocation = readFixture<PetraCapabilityGrantRevocation>(
      "capability-grant-revocation",
    );
    await repository.registerCapabilityGrant(grant);

    const commandClient = await pool.connect();
    await commandClient.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    await expect(
      authorizer.authorize(
        {
          actor: grant.grantee,
          capabilityGrantId: grant.capability_grant_id,
          commandName: "ExcludeProjectSource",
          projectId: grant.project_id,
        },
        commandClient,
      ),
    ).resolves.toBe(true);

    let revocationCommitted = false;
    const pendingRevocation = repository
      .registerCapabilityGrantRevocation(revocation)
      .then((value) => {
        revocationCommitted = true;
        return value;
      });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(revocationCommitted).toBe(false);
    await commandClient.query("COMMIT");
    commandClient.release();

    await expect(pendingRevocation).resolves.toEqual(revocation);
    await expect(
      repository.registerCapabilityGrantRevocation(structuredClone(revocation)),
    ).resolves.toEqual(revocation);
    await expect(
      repository.getCapabilityGrantRevocation(
        revocation.capability_grant_revocation_id,
      ),
    ).resolves.toEqual(revocation);
    await expect(
      repository.getRevocationForCapabilityGrant(grant.capability_grant_id),
    ).resolves.toEqual(revocation);
    await expect(evaluate(grant)).resolves.toBe(false);

    const rebound = structuredClone(revocation);
    rebound.capability_grant_revocation_id =
      "capability_grant_revocation_01K4C000000000000000000056";
    rebound.content.reason = "Try to replace the retained revocation.";
    rebound.content_hash = canonicalHash(rebound.content);
    await expectCode(
      () => repository.registerCapabilityGrantRevocation(rebound),
      "CAPABILITY_GRANT_REVOCATION_ID_CONFLICT",
    );
    await expect(
      pool.query(
        `DELETE FROM petra.capability_grant_revocations
          WHERE capability_grant_id = $1`,
        [grant.capability_grant_id],
      ),
    ).rejects.toThrow(/immutable/u);
  });

  it("rejects revocation without exact grant provenance or owner authority", async () => {
    const { actor } = await registerScope();
    const grant = readFixture<PetraCapabilityGrant>("capability-grant");
    const revocation = readFixture<PetraCapabilityGrantRevocation>(
      "capability-grant-revocation",
    );
    await repository.registerCapabilityGrant(grant);

    const stale = structuredClone(revocation);
    stale.grant_ref.record_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    await expectCode(
      () => repository.registerCapabilityGrantRevocation(stale),
      "CAPABILITY_GRANT_REVOCATION_GRANT_MISMATCH",
    );

    const otherHuman: PetraActor = {
      ...actor,
      actor_id: "actor_01K4C000000000000000000057",
      display_name: "Non-owner revoker",
    };
    await scopes.registerActor(otherHuman);
    const nonOwner = structuredClone(revocation);
    nonOwner.revoked_by = {
      actor_id: otherHuman.actor_id,
      actor_kind: "human",
    };
    await expectCode(
      () => repository.registerCapabilityGrantRevocation(nonOwner),
      "CAPABILITY_GRANT_ISSUER_NOT_PROJECT_OWNER",
    );

    const beforeIssuance = structuredClone(revocation);
    beforeIssuance.revoked_at = "2026-09-07T23:59:59.999Z";
    await expectCode(
      () => repository.registerCapabilityGrantRevocation(beforeIssuance),
      "CAPABILITY_GRANT_REVOCATION_TIME_INVALID",
    );

    const futureRevocation = structuredClone(revocation);
    futureRevocation.revoked_at = "2999-01-01T00:00:00.000Z";
    await expectCode(
      () => repository.registerCapabilityGrantRevocation(futureRevocation),
      "CAPABILITY_GRANT_REVOCATION_TIME_INVALID",
    );
  });
});
