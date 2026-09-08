import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraClaim,
  PetraCommandEnvelope,
  PetraParsedDocument,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectSource,
  PetraReviewSession,
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
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresChangeControlAuthorityRepository } from "../src/change-control-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresProjectReviewViewReader } from "../src/project-review-view-reader.js";
import { PostgresProjectSourceAuthorityRepository } from "../src/project-source-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import {
  PostgresReviewSessionAuthorityRepository,
  type PostgresReviewSessionError,
} from "../src/review-session-authority-repository.js";
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

const canonicalHash = (value: unknown): string =>
  sha256(new TextEncoder().encode(canonicalize(value)));

describePostgres("PostgreSQL ReviewSession authority and Project view", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const projectSources = new PostgresProjectSourceAuthorityRepository(pool);
  const sessions = new PostgresReviewSessionAuthorityRepository(pool);
  const views = new PostgresProjectReviewViewReader(pool);
  const changes = new PostgresChangeControlAuthorityRepository(pool, {
    authorize: () => true,
  });

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await pool.query(
      `UPDATE petra.authority_positions
          SET event_position = 0, outbox_position = 0
        WHERE singleton`,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

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
      generator_name: "petra-review-test-parser",
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
      "urn:petra:review-test-parser:01ARZ3NDEKTSV4RRFFQ69G5FB8";
    rightsDecision.observed_license = {
      statement: "Generated parser output retained under source-copy terms.",
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

  const setupAuthority = async (): Promise<{
    project: PetraProject;
    session: PetraReviewSession;
  }> => {
    const actor = readFixture<PetraActor>("actor");
    const project = readFixture<PetraProject>("project");
    await scopes.registerActor(actor);
    await scopes.registerProjectRevision(project);
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    await definitions.registerDefinitionRevision(definition);
    await definitions.registerObjectiveRevision(
      readFixture<PetraProjectObjective>("project-objective"),
    );

    const source = sourceArtifactInput();
    await artifacts.registerVerifiedAcquisition(source);
    await artifacts.registerVerifiedAcquisition(parserArtifactInput(source));
    await documents.registerDocumentBundle(
      documentBundle(source.manifest.artifact_manifest_id),
    );
    const projectSource = readFixture<PetraProjectSource>("project-source");
    projectSource.content.artifact_manifest_ref.record_hash = canonicalHash(
      source.manifest,
    );
    projectSource.content_hash = canonicalHash(projectSource.content);
    await projectSources.registerProjectSourceRevision(projectSource);

    const claim = readFixture<PetraClaim>("claim");
    claim.created_by = { actor_id: actor.actor_id, actor_kind: "human" };
    if (claim.basis.basis_kind !== "source") {
      throw new Error("Expected source-grounded Claim fixture.");
    }
    claim.basis.proposed_by = structuredClone(claim.created_by);
    const assertion = readFixture<PetraAssertion>("assertion");
    assertion.created_by = structuredClone(claim.created_by);
    await evidence.proposeClaim(claim);
    await evidence.proposeAssertion(assertion);

    const session = readFixture<PetraReviewSession>("review-session");
    const claimBinding = session.content.members[0]?.candidate_bindings[0];
    const assertionBinding = session.content.members[0]?.candidate_bindings[1];
    if (claimBinding === undefined || assertionBinding === undefined) {
      throw new Error("Expected exact ReviewSession bindings.");
    }
    claimBinding.record_ref.record_hash = canonicalHash(claim);
    assertionBinding.record_ref.record_hash = canonicalHash(assertion);
    session.content_hash = canonicalHash(session.content);
    return { project, session };
  };

  const submitChangeSet = async (): Promise<PetraCommandEnvelope> => {
    const submit = readFixture<PetraCommandEnvelope>(
      "command-submit-change-set",
    );
    if (submit.command.command_name !== "SubmitChangeSet") {
      throw new Error("Expected SubmitChangeSet fixture.");
    }
    submit.actor.actor_kind = "human";
    submit.command.change_set.content.proposed_by = structuredClone(
      submit.actor,
    );
    submit.command.change_set.content_hash = canonicalHash(
      submit.command.change_set.content,
    );
    await changes.executeCommand(submit);
    return submit;
  };

  const bindCurrentSnapshot = async (
    session: PetraReviewSession,
  ): Promise<void> => {
    const position = await pool.query<{
      event_position: string;
      stream_revision: string | null;
    }>(
      `SELECT authority.event_position::text,
              stream.current_stream_revision::text AS stream_revision
         FROM petra.authority_positions AS authority
         LEFT JOIN petra.project_event_stream_heads AS stream
           ON stream.project_id = $1
        WHERE authority.singleton`,
      [session.project_id],
    );
    session.content.snapshot.event_position = Number(
      position.rows[0]?.event_position ?? 0,
    );
    session.content.snapshot.stream_revision = Number(
      position.rows[0]?.stream_revision ?? 0,
    );
    session.content_hash = canonicalHash(session.content);
  };

  it("persists a durable session before any ChangeSet and reads exact source basis", async () => {
    const { project, session } = await setupAuthority();

    await sessions.registerReviewSessionRevision(session);
    await sessions.registerReviewSessionRevision(structuredClone(session));

    const view = await views.getProjectReviewView(
      project.project_id,
      session.review_session_id,
    );
    expect(view).toMatchObject({
      project_id: project.project_id,
      review_session_id: session.review_session_id,
      content: {
        session: {
          status: "needs_decision",
          snapshot_state: "current",
          responsible: { display_name: "Researcher" },
        },
        members: [
          {
            outcome: "awaiting_decision",
            candidate: {
              proposed: "The study reports a measurable improvement.",
              origin_label: "Researcher",
            },
            validation: { state: "passed" },
            change_sets: [],
          },
        ],
      },
    });
    expect(view?.content.members[0]?.basis[0]).toMatchObject({
      project_source_id: "project_source_01K4C000000000000000000007",
      project_source_status: "active",
      detail: "The study reports a measurable improvement.",
    });
    expect(await sessions.listReviewSessions(project.project_id)).toHaveLength(
      1,
    );
    expect(
      await views.getProjectReviewView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        session.review_session_id,
      ),
    ).toBeUndefined();
  });

  it("composes exact ChangeSet state and blocks a stale pending decision", async () => {
    const { session } = await setupAuthority();
    const submit = await submitChangeSet();
    await bindCurrentSnapshot(session);
    await sessions.registerReviewSessionRevision(session);

    const submitted = await views.getProjectReviewView(
      session.project_id,
      session.review_session_id,
    );
    expect(submitted?.content.members[0]).toMatchObject({
      outcome: "awaiting_decision",
      validation: { state: "passed" },
      change_sets: [
        {
          state: "submitted",
          change_set_ref: {
            record_id: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF",
          },
        },
      ],
    });

    const approve = readFixture<PetraCommandEnvelope>(
      "command-record-approval",
    );
    if (
      submit.command.command_name !== "SubmitChangeSet" ||
      approve.command.command_name !== "RecordApproval"
    ) {
      throw new Error("Expected review command fixtures.");
    }
    approve.command.approval.subject.change_set_content_hash =
      submit.command.change_set.content_hash;
    await changes.executeCommand(approve);

    const stale = await views.getProjectReviewView(
      session.project_id,
      session.review_session_id,
    );
    expect(stale?.content.session).toMatchObject({
      status: "waiting",
      snapshot_state: "stale",
    });
    expect(stale?.content.members[0]).toMatchObject({
      outcome: "waiting",
      validation: {
        state: "blocked",
        label: "Review snapshot is stale",
      },
      change_sets: [
        {
          state: "approved",
          approval_ref: {
            record_id: "approval_01ARZ3NDEKTSV4RRFFQ69G5FBG",
          },
        },
      ],
    });
  });

  it("rejects unregistered candidate semantics without partial session state", async () => {
    const { session } = await setupAuthority();
    const binding = session.content.members[0]?.candidate_bindings[0];
    if (binding === undefined) throw new Error("Expected Review binding.");
    binding.semantic_key = "scientific.unregistered";
    session.content_hash = canonicalHash(session.content);

    await expect(
      sessions.registerReviewSessionRevision(session),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PostgresReviewSessionError>>({
        code: "REVIEW_SESSION_RELATION_INVALID",
      }),
    );
    expect(
      await sessions.getReviewSession(
        session.project_id,
        session.review_session_id,
      ),
    ).toBeUndefined();
  });
});
