import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraAuthor,
  PetraExternalIdentifier,
  PetraProject,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type {
  PostgresResearchScopeError,
  PostgresResearchScopeErrorCode,
} from "../src/research-scope-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import type {
  PostgresScholarlyIdentityError,
  PostgresScholarlyIdentityErrorCode,
} from "../src/scholarly-identity-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";

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

const expectPersistenceCode = async (
  operation: () => Promise<unknown>,
  code: PostgresResearchScopeErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresResearchScopeError>>({ code }),
  );
};

const expectScholarlyCode = async (
  operation: () => Promise<unknown>,
  code: PostgresScholarlyIdentityErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresScholarlyIdentityError>>({ code }),
  );
};

describePostgres("PostgreSQL research scope repository", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresResearchScopeRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      "TRUNCATE petra.project_revisions, petra.projects, petra.actors CASCADE",
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("persists immutable Actor identity and contiguous Project history with exact replay", async () => {
    const actor = readFixture<PetraActor>("actor");
    const project = readFixture<PetraProject>("project");

    await repository.registerActor(actor);
    await repository.registerActor(structuredClone(actor));
    await repository.registerProjectRevision(project);
    await repository.registerProjectRevision(structuredClone(project));

    const revisionTwo = structuredClone(project);
    revisionTwo.revision = 2;
    revisionTwo.status = "archived";
    revisionTwo.updated_at = "2026-08-29T19:00:00.000Z";
    await repository.registerProjectRevision(revisionTwo);

    expect(await repository.getActor(actor.actor_id)).toEqual(actor);
    expect(await repository.getProject(project.project_id, 1)).toEqual(project);
    expect(await repository.getProject(project.project_id)).toEqual(
      revisionTwo,
    );
    const counts = await pool.query<{ actors: string; revisions: string }>(
      `SELECT
         (SELECT count(*) FROM petra.actors)::text AS actors,
         (SELECT count(*) FROM petra.project_revisions)::text AS revisions`,
    );
    expect(counts.rows[0]).toEqual({ actors: "1", revisions: "2" });

    const returned = await repository.getProject(project.project_id);
    if (returned === undefined) throw new Error("Expected the stored Project.");
    returned.name = "A caller-side mutation";
    expect((await repository.getProject(project.project_id))?.name).toBe(
      revisionTwo.name,
    );
  });

  it("rejects rebound IDs, missing exact actors, stale revisions, and revision gaps atomically", async () => {
    const actor = readFixture<PetraActor>("actor");
    const project = readFixture<PetraProject>("project");
    await repository.registerActor(actor);
    await repository.registerProjectRevision(project);

    const reboundActor = structuredClone(actor);
    reboundActor.display_name = "Different researcher";
    await expectPersistenceCode(
      () => repository.registerActor(reboundActor),
      "ACTOR_ID_CONFLICT",
    );

    const reboundRevision = structuredClone(project);
    reboundRevision.name = "Different content at revision one";
    await expectPersistenceCode(
      () => repository.registerProjectRevision(reboundRevision),
      "PROJECT_REVISION_CONFLICT",
    );

    const gap = structuredClone(project);
    gap.revision = 3;
    gap.updated_at = "2026-08-29T19:00:00.000Z";
    await expectPersistenceCode(
      () => repository.registerProjectRevision(gap),
      "PROJECT_REVISION_GAP",
    );

    const missingActor = structuredClone(project);
    missingActor.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FDP";
    missingActor.created_by.actor_id = "actor_01ARZ3NDEKTSV4RRFFQ69G5FDQ";
    await expectPersistenceCode(
      () => repository.registerProjectRevision(missingActor),
      "ACTOR_REFERENCE_MISSING",
    );

    expect((await repository.getProject(project.project_id))?.revision).toBe(1);
    expect(
      await repository.getProject(missingActor.project_id),
    ).toBeUndefined();
  });

  it("enforces immutable history and queryable scope constraints in PostgreSQL itself", async () => {
    const actor = readFixture<PetraActor>("actor");
    const project = readFixture<PetraProject>("project");
    await repository.registerActor(actor);
    await repository.registerProjectRevision(project);

    await expect(
      pool.query(
        "UPDATE petra.project_revisions SET name = 'rewritten' WHERE project_id = $1",
        [project.project_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query("DELETE FROM petra.actors WHERE actor_id = $1", [
        actor.actor_id,
      ]),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        `INSERT INTO petra.project_revisions (
           project_id, revision, schema_name, schema_version, name, status,
           visibility, enabled_evidence_namespaces, created_by_actor_id,
           created_by_actor_kind, record_hash, payload, created_at, updated_at
         ) SELECT project_id, 2, schema_name, schema_version, name, status,
                  visibility, ARRAY['scholarly', 'scholarly'],
                  created_by_actor_id, created_by_actor_kind, record_hash,
                  jsonb_set(payload, '{revision}', '2'), created_at, updated_at
             FROM petra.project_revisions
            WHERE project_id = $1 AND revision = 1`,
        [project.project_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "23514" }));
  });
});

describePostgres("PostgreSQL scholarly identity repository", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.canonical_entity_revisions,
                petra.canonical_entities,
                petra.project_revisions,
                petra.projects,
                petra.actors CASCADE`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const registerFixturePath = async (): Promise<{
    actor: PetraActor;
    author: PetraAuthor;
    work: PetraWork;
    workVersion: PetraWorkVersion;
    externalIdentifier: PetraExternalIdentifier;
  }> => {
    const actor = readFixture<PetraActor>("actor");
    const author = readFixture<PetraAuthor>("author");
    const work = readFixture<PetraWork>("work");
    const workVersion = readFixture<PetraWorkVersion>("work-version");
    const externalIdentifier = readFixture<PetraExternalIdentifier>(
      "external-identifier",
    );
    await scopes.registerActor(actor);
    await identities.registerAuthorRevision(author);
    await identities.registerWorkRevision(work);
    await identities.registerWorkVersionRevision(workVersion);
    await identities.registerExternalIdentifierRevision(externalIdentifier);
    return { actor, author, work, workVersion, externalIdentifier };
  };

  it("persists typed scholarly identity links and immutable current-plus-historical revisions", async () => {
    const { author, work, workVersion, externalIdentifier } =
      await registerFixturePath();

    await identities.registerAuthorRevision(structuredClone(author));
    await identities.registerWorkRevision(structuredClone(work));
    await identities.registerWorkVersionRevision(structuredClone(workVersion));
    await identities.registerExternalIdentifierRevision(
      structuredClone(externalIdentifier),
    );

    const authorTwo = structuredClone(author);
    authorTwo.revision = 2;
    authorTwo.identity_status = "resolved";
    authorTwo.display_name = "Ada Researcher (resolved identity)";
    authorTwo.updated_at = "2026-08-29T20:00:00.000Z";
    await identities.registerAuthorRevision(authorTwo);

    expect(await identities.getAuthor(author.author_id, 1)).toEqual(author);
    expect(await identities.getAuthor(author.author_id)).toEqual(authorTwo);
    expect(await identities.getWork(work.work_id)).toEqual(work);
    expect(
      await identities.getWorkVersion(workVersion.work_version_id),
    ).toEqual(workVersion);
    expect(
      await identities.getExternalIdentifier(
        externalIdentifier.external_identifier_id,
      ),
    ).toEqual(externalIdentifier);

    const path = await pool.query<{
      work_id: string;
      author_id: string;
      work_version_id: string;
      subject_kind: string;
      subject_id: string;
    }>(
      `SELECT work.work_id, credit.author_id, version.work_version_id,
              identifier.subject_kind, identifier.subject_id
         FROM petra.work_revisions AS work
         JOIN petra.work_author_credits AS credit
           ON credit.work_id = work.work_id
          AND credit.work_revision = work.revision
         JOIN petra.work_version_revisions AS version
           ON version.work_id = work.work_id
         JOIN petra.external_identifier_revisions AS identifier
           ON identifier.subject_id = version.work_version_id
        WHERE work.work_id = $1`,
      [work.work_id],
    );
    expect(path.rows).toEqual([
      {
        work_id: work.work_id,
        author_id: author.author_id,
        work_version_id: workVersion.work_version_id,
        subject_kind: "work_version",
        subject_id: workVersion.work_version_id,
      },
    ]);
  });

  it("rejects missing and ambiguous identity links, rebound revisions, and gaps atomically", async () => {
    const actor = readFixture<PetraActor>("actor");
    const author = readFixture<PetraAuthor>("author");
    const work = readFixture<PetraWork>("work");
    await scopes.registerActor(actor);

    await expectScholarlyCode(
      () => identities.registerWorkRevision(work),
      "SCHOLARLY_REFERENCE_MISSING",
    );
    expect(await identities.getWork(work.work_id)).toBeUndefined();

    await identities.registerAuthorRevision(author);
    const ambiguousWork = structuredClone(work);
    ambiguousWork.work_id = "work_01ARZ3NDEKTSV4RRFFQ69G5FDR";
    ambiguousWork.author_credits.push({
      author_id: author.author_id,
      position: 1,
      credit_role: "editor",
    });
    await expectScholarlyCode(
      () => identities.registerWorkRevision(ambiguousWork),
      "SCHOLARLY_RELATION_INVALID",
    );
    expect(await identities.getWork(ambiguousWork.work_id)).toBeUndefined();

    const reboundAuthor = structuredClone(author);
    reboundAuthor.display_name = "Different content at revision one";
    await expectScholarlyCode(
      () => identities.registerAuthorRevision(reboundAuthor),
      "SCHOLARLY_ENTITY_REVISION_CONFLICT",
    );

    const authorGap = structuredClone(author);
    authorGap.revision = 3;
    authorGap.updated_at = "2026-08-29T20:00:00.000Z";
    await expectScholarlyCode(
      () => identities.registerAuthorRevision(authorGap),
      "SCHOLARLY_ENTITY_REVISION_GAP",
    );
    expect((await identities.getAuthor(author.author_id))?.revision).toBe(1);
  });

  it("enforces typed identity kinds and append-only rows inside PostgreSQL", async () => {
    const { author, workVersion, externalIdentifier } =
      await registerFixturePath();

    await expect(
      pool.query(
        `UPDATE petra.author_revisions
            SET display_name = 'rewritten'
          WHERE author_id = $1 AND revision = 1`,
        [author.author_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));

    await expect(
      pool.query(
        `INSERT INTO petra.external_identifier_revisions (
           external_identifier_id, revision, subject_kind, subject_id,
           namespace, normalized_value, source_name, verification_status,
           observed_at
         ) VALUES ($1, 2, 'author', $2, 'doi', '10.5555/wrong-level',
                   'fixture', 'unverified', now())`,
        [
          externalIdentifier.external_identifier_id,
          workVersion.work_version_id,
        ],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "23503" }));
  });
});
