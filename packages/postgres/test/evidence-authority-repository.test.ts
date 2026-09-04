import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraClaim,
  PetraParsedDocument,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import type {
  PersistDocumentBundleInput,
  PersistVerifiedArtifactInput,
} from "@petra/core";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import type {
  PostgresEvidenceAuthorityError,
  PostgresEvidenceAuthorityErrorCode,
} from "../src/evidence-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { availableArtifactStore } from "./artifact-store-fixture.js";

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

const sha256 = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const expectEvidenceCode = async (
  operation: () => Promise<unknown>,
  code: PostgresEvidenceAuthorityErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresEvidenceAuthorityError>>({ code }),
  );
};

describePostgres("PostgreSQL evidence authority repository", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE petra.evidence_entities,
                petra.artifacts,
                petra.canonical_entities,
                petra.project_revisions,
                petra.projects,
                petra.actors CASCADE`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const modelActor = (): PetraActor => ({
    ...readFixture<PetraActor>("actor"),
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
    actor_kind: "model",
    display_name: "Petra extraction model",
    created_at: "2026-08-28T18:00:01.000Z",
  });

  const registerResearchIdentities = async (): Promise<void> => {
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(modelActor());
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );
  };

  const sourceArtifactInput = (): PersistVerifiedArtifactInput => {
    const artifact = readFixture<PetraArtifact>("artifact");
    const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
    const rightsDecision = readFixture<PetraRightsDecision>("rights-decision");
    artifact.created_by.actor_kind = "human";
    manifest.recorded_by.actor_kind = "human";
    rightsDecision.decision_maker.actor_kind = "human";
    return { artifact, manifest, rightsDecision };
  };

  const parserArtifactInput = (
    source: PersistVerifiedArtifactInput,
  ): PersistVerifiedArtifactInput => {
    const parserBytes = new TextEncoder().encode('{"parser":"output"}');
    const parserHash = sha256(parserBytes);
    const artifact = structuredClone(source.artifact);
    artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB8";
    artifact.artifact_kind = "structured_text";
    artifact.media_type = "application/json";
    artifact.content_hash = parserHash;
    artifact.byte_size = parserBytes.byteLength;
    artifact.created_at = "2026-08-28T18:11:02.000Z";

    const manifest = structuredClone(source.manifest);
    manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB9";
    manifest.artifact_id = artifact.artifact_id;
    manifest.rights_decision_id = "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FBA";
    manifest.origin = {
      origin_kind: "generated",
      generator_name: "petra-docling-adapter",
      generator_version: "1.0.0",
      generated_at: "2026-08-28T18:11:02.000Z",
      input_artifact_ids: [source.artifact.artifact_id],
    };
    manifest.storage_ref.object_key = `sha256/${parserHash.slice(7, 9)}/${parserHash.slice(9)}`;
    manifest.storage_ref.content_hash = parserHash;
    manifest.storage_ref.verified_at = "2026-08-28T18:11:02.000Z";
    manifest.integrity.checked_at = "2026-08-28T18:11:02.000Z";
    manifest.recorded_at = "2026-08-28T18:11:02.000Z";

    const rightsDecision = structuredClone(source.rightsDecision);
    rightsDecision.rights_decision_id = manifest.rights_decision_id;
    rightsDecision.artifact_manifest_id = manifest.artifact_manifest_id;
    rightsDecision.source_location =
      "urn:petra:parser-output:01ARZ3NDEKTSV4RRFFQ69G5FB8";
    rightsDecision.observed_license = {
      statement:
        "Petra-generated parser output retained under source-copy terms.",
      source: "artifact",
    };
    rightsDecision.access_basis = "permission";
    rightsDecision.authorization_reference = "petra-local-processing/1.0.0";
    rightsDecision.observed_at = "2026-08-28T18:11:02.000Z";
    rightsDecision.created_at = "2026-08-28T18:11:02.000Z";
    return { artifact, manifest, rightsDecision };
  };

  const documentBundle = (
    sourceManifestId: string,
  ): PersistDocumentBundleInput => {
    const document = readFixture<PetraParsedDocument>("parsed-document");
    const block = readFixture<PetraStructuralBlock>("structural-block");
    const span = readFixture<PetraSourceSpan>("source-span");
    document.created_by.actor_kind = "human";
    span.created_by.actor_kind = "human";
    return {
      sourceArtifactManifestId: sourceManifestId,
      document,
      blocks: [block],
      spans: [span],
    };
  };

  const registerSourceChain = async (): Promise<void> => {
    await registerResearchIdentities();
    const source = sourceArtifactInput();
    await artifacts.registerVerifiedAcquisition(source);
    await artifacts.registerVerifiedAcquisition(parserArtifactInput(source));
    await documents.registerDocumentBundle(
      documentBundle(source.manifest.artifact_manifest_id),
    );
  };

  const claimFixture = (): PetraClaim => {
    const claim = readFixture<PetraClaim>("claim");
    claim.created_by = {
      actor_id: modelActor().actor_id,
      actor_kind: "model",
    };
    if (claim.basis.basis_kind !== "source") {
      throw new Error("Expected source-derived Claim fixture.");
    }
    claim.basis.proposed_by = structuredClone(claim.created_by);
    return claim;
  };

  const assertionFixture = (): PetraAssertion => {
    const assertion = readFixture<PetraAssertion>("assertion");
    assertion.created_by = {
      actor_id: modelActor().actor_id,
      actor_kind: "model",
    };
    return assertion;
  };

  it("persists separate quarantine Claims and Assertions with typed evidence traversal", async () => {
    await registerSourceChain();
    const claim = claimFixture();
    const assertion = assertionFixture();
    if (claim.basis.basis_kind !== "source") {
      throw new Error("Expected source-derived Claim fixture.");
    }

    await evidence.proposeClaim(claim);
    await evidence.proposeAssertion(assertion);
    await evidence.proposeClaim(structuredClone(claim));
    await evidence.proposeAssertion(structuredClone(assertion));

    expect(await evidence.getClaim(claim.claim_id)).toEqual(claim);
    expect(await evidence.getClaim(claim.claim_id, 1)).toEqual(claim);
    expect(await evidence.getAssertion(assertion.assertion_id)).toEqual(
      assertion,
    );
    expect(
      await evidence.getClaimsForWorkVersion(assertion.subject_id),
    ).toEqual([claim]);
    expect(await evidence.getAssertionsForEntity(claim.claim_id)).toEqual([
      assertion,
    ]);

    const path = await pool.query<{
      authority_zone: string;
      review_state: string;
      source_work_version_id: string;
      source_span_id: string;
      predicate: string;
      assertion_source_span_id: string;
    }>(
      `SELECT claim_revision.authority_zone,
              claim_revision.review_state,
              claim.source_work_version_id,
              claim_span.source_span_id,
              assertion.predicate,
              assertion_span.source_span_id AS assertion_source_span_id
         FROM petra.evidence_entity_revisions AS claim_revision
         JOIN petra.claim_revisions AS claim
           ON claim.claim_id = claim_revision.evidence_id
          AND claim.revision = claim_revision.revision
         JOIN petra.claim_source_spans AS claim_span
           ON claim_span.claim_id = claim.claim_id
          AND claim_span.claim_revision = claim.revision
         JOIN petra.assertion_revisions AS assertion
           ON assertion.object_entity_id = claim.claim_id
         JOIN petra.assertion_provenance AS assertion_span
           ON assertion_span.assertion_id = assertion.assertion_id
          AND assertion_span.assertion_revision = assertion.revision
          AND assertion_span.provenance_kind = 'source_span'
        WHERE claim.claim_id = $1`,
      [claim.claim_id],
    );
    expect(path.rows).toEqual([
      {
        authority_zone: "quarantine",
        review_state: "machine_checked",
        source_work_version_id: assertion.subject_id,
        source_span_id: claim.basis.source_span_ids[0],
        predicate: "ASSERTS",
        assertion_source_span_id: claim.basis.source_span_ids[0],
      },
    ]);

    const returned = await evidence.getClaim(claim.claim_id);
    if (returned === undefined) throw new Error("Expected Claim.");
    returned.canonical_text = "caller mutation";
    expect((await evidence.getClaim(claim.claim_id))?.canonical_text).toBe(
      claim.canonical_text,
    );
  });

  it("rejects missing or misaligned source grounding without partial evidence", async () => {
    await registerSourceChain();
    const missing = claimFixture();
    if (missing.basis.basis_kind !== "source") {
      throw new Error("Expected source-derived Claim fixture.");
    }
    missing.basis.source_span_ids = ["source_span_01ARZ3NDEKTSV4RRFFQ69G5FBE"];
    await expectEvidenceCode(
      () => evidence.proposeClaim(missing),
      "EVIDENCE_REFERENCE_MISSING",
    );

    const misaligned = claimFixture();
    if (misaligned.basis.basis_kind !== "source") {
      throw new Error("Expected source-derived Claim fixture.");
    }
    misaligned.basis.work_version_id =
      "work_version_01ARZ3NDEKTSV4RRFFQ69G5FBE";
    await expectEvidenceCode(
      () => evidence.proposeClaim(misaligned),
      "EVIDENCE_RELATION_INVALID",
    );

    const count = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM petra.evidence_entities",
    );
    expect(count.rows[0]?.count).toBe("0");
  });

  it("keeps reviewed revisions behind the future ChangeSet authority path", async () => {
    await registerSourceChain();
    const trusted = readFixture<PetraAssertion>("assertion-trusted");
    await expectEvidenceCode(
      () => evidence.proposeAssertion(trusted),
      "EVIDENCE_PROPOSAL_ONLY",
    );
    expect(await evidence.getAssertion(trusted.assertion_id)).toBe(undefined);
  });

  it("rejects evidence ID rebound and an ASSERTS relation outside Claim grounding", async () => {
    await registerSourceChain();
    const claim = claimFixture();
    await evidence.proposeClaim(claim);

    const rebound = structuredClone(claim);
    rebound.canonical_text = "Different meaning under a reused Claim ID.";
    await expectEvidenceCode(
      () => evidence.proposeClaim(rebound),
      "EVIDENCE_ID_CONFLICT",
    );

    const assertion = assertionFixture();
    assertion.subject_id = "work_version_01ARZ3NDEKTSV4RRFFQ69G5FBE";
    await expectEvidenceCode(
      () => evidence.proposeAssertion(assertion),
      "EVIDENCE_RELATION_INVALID",
    );
  });

  it("enforces append-only quarantine evidence inside PostgreSQL", async () => {
    await registerSourceChain();
    const claim = claimFixture();
    const assertion = assertionFixture();
    await evidence.proposeClaim(claim);
    await evidence.proposeAssertion(assertion);

    await expect(
      pool.query(
        "UPDATE petra.evidence_entity_revisions SET review_state = 'disputed' WHERE evidence_id = $1",
        [claim.claim_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        "DELETE FROM petra.assertion_provenance WHERE assertion_id = $1",
        [assertion.assertion_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        `INSERT INTO petra.evidence_entity_revisions (
           evidence_id, evidence_kind, revision, authority_zone, review_state,
           admission_kind, schema_name, schema_version, record_hash, payload,
           recorded_at
         ) VALUES ($1, 'claim', 2, 'trusted', 'human_accepted', 'proposal',
                   'petra.claim', '1.0.0', $2, $3::jsonb, now())`,
        [
          claim.claim_id,
          `sha256:${"0".repeat(64)}`,
          JSON.stringify({ ...claim, revision: 2 }),
        ],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "23514" }));

    expect(await evidence.getClaim(claim.claim_id)).toEqual(claim);
    expect(await evidence.getAssertion(assertion.assertion_id)).toEqual(
      assertion,
    );
  });
});
