import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraRightsDecision,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import type { PersistVerifiedArtifactInput } from "@petra/core";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type {
  PostgresArtifactAuthorityError,
  PostgresArtifactAuthorityErrorCode,
} from "../src/artifact-authority-repository.js";
import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
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

const expectArtifactCode = async (
  operation: () => Promise<unknown>,
  code: PostgresArtifactAuthorityErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresArtifactAuthorityError>>({ code }),
  );
};

describePostgres("PostgreSQL Artifact authority repository", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.artifacts,
                petra.canonical_entities,
                petra.project_revisions,
                petra.projects,
                petra.actors CASCADE`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const registerPrerequisites = async (): Promise<void> => {
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );
  };

  const makeInput = (): PersistVerifiedArtifactInput => {
    const artifact = readFixture<PetraArtifact>("artifact");
    const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
    const rightsDecision = readFixture<PetraRightsDecision>("rights-decision");
    artifact.created_by.actor_kind = "human";
    manifest.recorded_by.actor_kind = "human";
    rightsDecision.decision_maker.actor_kind = "human";
    return { artifact, manifest, rightsDecision };
  };

  const makeUserSuppliedCopy = (): PersistVerifiedArtifactInput => {
    const input = makeInput();
    input.manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB4";
    input.manifest.rights_decision_id =
      "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB5";
    input.manifest.origin = {
      origin_kind: "user_supplied",
      supplied_by: {
        actor_id: input.manifest.recorded_by.actor_id,
        actor_kind: input.manifest.recorded_by.actor_kind,
      },
      supplied_at: "2026-08-28T18:11:00.000Z",
      original_filename: "petra-copy.pdf",
    };
    input.manifest.recorded_at = "2026-08-28T18:12:00.000Z";
    input.rightsDecision.rights_decision_id = input.manifest.rights_decision_id;
    input.rightsDecision.artifact_manifest_id =
      input.manifest.artifact_manifest_id;
    input.rightsDecision.source_location = "petra://upload/petra-copy.pdf";
    input.rightsDecision.license_status = "unknown";
    delete input.rightsDecision.observed_license;
    input.rightsDecision.access_basis = "user_supplied";
    input.rightsDecision.decision_status = "unknown";
    input.rightsDecision.permissions.parse = false;
    input.rightsDecision.permissions.index = false;
    input.rightsDecision.permissions.embed = false;
    input.rightsDecision.permissions.quote_publicly = false;
    input.rightsDecision.permissions.redistribute_artifact = false;
    input.rightsDecision.conditions = [];
    input.rightsDecision.required_notices = [];
    input.rightsDecision.rationale =
      "The repository exposes the copy, but no reusable license was found.";
    input.rightsDecision.observed_at = "2026-08-28T18:11:00.000Z";
    input.rightsDecision.created_at = "2026-08-28T18:12:00.000Z";
    return input;
  };

  const makeGeneratedOutput = (
    inputArtifactId: string,
  ): PersistVerifiedArtifactInput => {
    const input = makeInput();
    input.artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FC1";
    input.artifact.artifact_kind = "structured_text";
    input.artifact.media_type = "application/json";
    input.artifact.content_hash = `sha256:${"a".repeat(64)}`;
    input.artifact.byte_size = 42;
    input.artifact.created_at = "2026-08-28T18:13:00.000Z";
    input.manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FC2";
    input.manifest.artifact_id = input.artifact.artifact_id;
    input.manifest.rights_decision_id =
      "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FC3";
    input.manifest.origin = {
      origin_kind: "generated",
      generator_name: "petra-test-parser",
      generator_version: "1.0.0",
      generated_at: "2026-08-28T18:13:00.000Z",
      input_artifact_ids: [inputArtifactId],
    };
    input.manifest.storage_ref.content_hash = input.artifact.content_hash;
    input.manifest.storage_ref.object_key =
      "sha256/aa/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    input.manifest.storage_ref.verified_at = "2026-08-28T18:13:00.000Z";
    input.manifest.integrity.checked_at = "2026-08-28T18:13:00.000Z";
    input.manifest.recorded_at = "2026-08-28T18:13:00.000Z";
    input.rightsDecision.rights_decision_id = input.manifest.rights_decision_id;
    input.rightsDecision.artifact_manifest_id =
      input.manifest.artifact_manifest_id;
    input.rightsDecision.source_location =
      "petra://generator/petra-test-parser/1.0.0";
    input.rightsDecision.observed_at = "2026-08-28T18:13:00.000Z";
    input.rightsDecision.created_at = "2026-08-28T18:13:00.000Z";
    return input;
  };

  it("persists one immutable byte identity with exact acquisition, storage, and rights records", async () => {
    await registerPrerequisites();
    const input = makeInput();

    await artifacts.registerVerifiedAcquisition(input);
    await artifacts.registerVerifiedAcquisition(structuredClone(input));

    expect(await artifacts.getArtifact(input.artifact.artifact_id)).toEqual(
      input.artifact,
    );
    expect(
      await artifacts.getByManifestId(input.manifest.artifact_manifest_id),
    ).toEqual({
      artifact: input.artifact,
      manifest: input.manifest,
      rightsDecision: input.rightsDecision,
    });
    expect(
      await artifacts.getRightsDecision(
        input.rightsDecision.rights_decision_id,
      ),
    ).toEqual(input.rightsDecision);

    const path = await pool.query<{
      artifact_id: string;
      content_hash: string;
      artifact_manifest_id: string;
      store_name: string;
      object_key: string;
      work_version_id: string;
      rights_decision_id: string;
      parse_permitted: boolean;
    }>(
      `SELECT artifact.artifact_id, artifact.content_hash,
              manifest.artifact_manifest_id, manifest.store_name,
              manifest.object_key,
              manifest.origin_work_version_id AS work_version_id,
              rights.rights_decision_id, rights.parse_permitted
         FROM petra.artifacts AS artifact
         JOIN petra.artifact_manifests AS manifest
           ON manifest.artifact_id = artifact.artifact_id
          AND manifest.storage_content_hash = artifact.content_hash
         JOIN petra.rights_decisions AS rights
           ON rights.rights_decision_id = manifest.rights_decision_id
          AND rights.artifact_manifest_id = manifest.artifact_manifest_id
        WHERE artifact.artifact_id = $1`,
      [input.artifact.artifact_id],
    );
    expect(path.rows).toEqual([
      {
        artifact_id: input.artifact.artifact_id,
        content_hash: input.artifact.content_hash,
        artifact_manifest_id: input.manifest.artifact_manifest_id,
        store_name: input.manifest.storage_ref.store_name,
        object_key: input.manifest.storage_ref.object_key,
        work_version_id:
          input.manifest.origin.origin_kind === "acquired"
            ? input.manifest.origin.work_version_id
            : "",
        rights_decision_id: input.rightsDecision.rights_decision_id,
        parse_permitted: true,
      },
    ]);

    const returned = await artifacts.getArtifact(input.artifact.artifact_id);
    if (returned === undefined) throw new Error("Expected the Artifact.");
    returned.media_type = "application/octet-stream";
    expect(
      (await artifacts.getArtifact(input.artifact.artifact_id))?.media_type,
    ).toBe("application/pdf");
  });

  it("reuses one Artifact across copy-specific manifests and rights decisions", async () => {
    await registerPrerequisites();
    const first = makeInput();
    const second = makeUserSuppliedCopy();
    await artifacts.registerVerifiedAcquisition(first);

    await artifacts.attachVerifiedManifest({
      artifactId: first.artifact.artifact_id,
      manifest: second.manifest,
      rightsDecision: second.rightsDecision,
    });
    await artifacts.attachVerifiedManifest({
      artifactId: first.artifact.artifact_id,
      manifest: structuredClone(second.manifest),
      rightsDecision: structuredClone(second.rightsDecision),
    });

    const acquisitions = await artifacts.getAcquisitionsForArtifact(
      first.artifact.artifact_id,
    );
    expect(acquisitions).toHaveLength(2);
    expect(acquisitions.map(({ artifact }) => artifact.artifact_id)).toEqual([
      first.artifact.artifact_id,
      first.artifact.artifact_id,
    ]);
    expect(
      acquisitions.map(({ rightsDecision }) => rightsDecision.license_status),
    ).toEqual(["known", "unknown"]);
    const counts = await pool.query<{
      artifacts: string;
      manifests: string;
      rights: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.artifacts)::text AS artifacts,
         (SELECT count(*) FROM petra.artifact_manifests)::text AS manifests,
         (SELECT count(*) FROM petra.rights_decisions)::text AS rights`,
    );
    expect(counts.rows[0]).toEqual({
      artifacts: "1",
      manifests: "2",
      rights: "2",
    });
  });

  it("retains generated-Artifact input provenance and rejects absent inputs atomically", async () => {
    await registerPrerequisites();
    const source = makeInput();
    await artifacts.registerVerifiedAcquisition(source);

    const missingInput = makeGeneratedOutput(
      "artifact_01ARZ3NDEKTSV4RRFFQ69G5FC0",
    );
    await expectArtifactCode(
      () => artifacts.registerVerifiedAcquisition(missingInput),
      "ARTIFACT_REFERENCE_MISSING",
    );
    expect(await artifacts.getArtifact(missingInput.artifact.artifact_id)).toBe(
      undefined,
    );

    const generated = makeGeneratedOutput(source.artifact.artifact_id);
    await artifacts.registerVerifiedAcquisition(generated);
    const inputs = await pool.query<{
      position: string;
      input_artifact_id: string;
    }>(
      `SELECT position::text, input_artifact_id
         FROM petra.artifact_manifest_inputs
        WHERE artifact_manifest_id = $1
        ORDER BY position`,
      [generated.manifest.artifact_manifest_id],
    );
    expect(inputs.rows).toEqual([
      { position: "1", input_artifact_id: source.artifact.artifact_id },
    ]);
  });

  it("rejects missing references, relation mismatch, and duplicate byte identities atomically", async () => {
    const missing = makeInput();
    await expectArtifactCode(
      () => artifacts.registerVerifiedAcquisition(missing),
      "ARTIFACT_REFERENCE_MISSING",
    );

    await registerPrerequisites();
    const mismatched = makeInput();
    mismatched.rightsDecision.source_location =
      "https://example.org/not-the-acquired-copy.pdf";
    await expectArtifactCode(
      () => artifacts.registerVerifiedAcquisition(mismatched),
      "ARTIFACT_RELATION_INVALID",
    );

    const first = makeInput();
    await artifacts.registerVerifiedAcquisition(first);
    const duplicate = makeInput();
    duplicate.artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB4";
    duplicate.manifest.artifact_id = duplicate.artifact.artifact_id;
    duplicate.manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB5";
    duplicate.manifest.rights_decision_id =
      "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB6";
    duplicate.rightsDecision.artifact_manifest_id =
      duplicate.manifest.artifact_manifest_id;
    duplicate.rightsDecision.rights_decision_id =
      duplicate.manifest.rights_decision_id;
    await expectArtifactCode(
      () => artifacts.registerVerifiedAcquisition(duplicate),
      "ARTIFACT_CONTENT_CONFLICT",
    );

    const counts = await pool.query<{
      artifacts: string;
      manifests: string;
      rights: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.artifacts)::text AS artifacts,
         (SELECT count(*) FROM petra.artifact_manifests)::text AS manifests,
         (SELECT count(*) FROM petra.rights_decisions)::text AS rights`,
    );
    expect(counts.rows[0]).toEqual({
      artifacts: "1",
      manifests: "1",
      rights: "1",
    });
  });

  it("enforces append-only Artifact authority and typed origin references inside PostgreSQL", async () => {
    await registerPrerequisites();
    const input = makeInput();
    await artifacts.registerVerifiedAcquisition(input);

    await expect(
      pool.query(
        "UPDATE petra.artifacts SET media_type = 'application/octet-stream' WHERE artifact_id = $1",
        [input.artifact.artifact_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        "DELETE FROM petra.rights_decisions WHERE rights_decision_id = $1",
        [input.rightsDecision.rights_decision_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));

    const rebound = makeUserSuppliedCopy();
    rebound.manifest.artifact_manifest_id = input.manifest.artifact_manifest_id;
    rebound.rightsDecision.artifact_manifest_id =
      rebound.manifest.artifact_manifest_id;
    await expectArtifactCode(
      () =>
        artifacts.attachVerifiedManifest({
          artifactId: input.artifact.artifact_id,
          manifest: rebound.manifest,
          rightsDecision: rebound.rightsDecision,
        }),
      "ARTIFACT_MANIFEST_ID_CONFLICT",
    );
    expect(
      await artifacts.getAcquisitionsForArtifact(input.artifact.artifact_id),
    ).toHaveLength(1);
  });
});
