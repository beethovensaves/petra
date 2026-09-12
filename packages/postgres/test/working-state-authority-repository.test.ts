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
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectRelationshipView,
  PetraProjectSource,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWorkerInputManifest,
  PetraWork,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  PetraWorkUnit,
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
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import type { PostgresProjectRelationshipOverlayViewError } from "../src/project-relationship-overlay-view-reader.js";
import { PostgresProjectRelationshipOverlayViewReader } from "../src/project-relationship-overlay-view-reader.js";
import { PostgresProjectSourceAuthorityRepository } from "../src/project-source-authority-repository.js";
import { PostgresProjectWorkingStateSnapshotReader } from "../src/project-working-state-snapshot-reader.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
import type {
  PostgresWorkingStateError,
  PostgresWorkingStateErrorCode,
} from "../src/working-state-authority-repository.js";
import { PostgresWorkingStateAuthorityRepository } from "../src/working-state-authority-repository.js";
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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const workingContentHash = (value: { content_hash: string }): string => {
  const projection = structuredClone(value) as Record<string, unknown>;
  delete projection.content_hash;
  return canonicalHash(projection);
};

const expectWorkingCode = async (
  operation: () => Promise<unknown>,
  code: PostgresWorkingStateErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresWorkingStateError>>({ code }),
  );
};

const expectOverlayCode = async (
  operation: () => Promise<unknown>,
  code: PostgresProjectRelationshipOverlayViewError["code"],
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<
      Partial<PostgresProjectRelationshipOverlayViewError>
    >({ code }),
  );
};

describePostgres("PostgreSQL working-state authority", () => {
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
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const working = new PostgresWorkingStateAuthorityRepository(pool);
  const snapshots = new PostgresProjectWorkingStateSnapshotReader(pool);

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

  const actor = (
    actorId: string,
    actorKind: PetraActor["actor_kind"],
    displayName: string,
  ): PetraActor => ({
    ...readFixture<PetraActor>("actor"),
    actor_id: actorId,
    actor_kind: actorKind,
    display_name: displayName,
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
    const bytes = new TextEncoder().encode('{"working":"state"}');
    const hash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const artifact = structuredClone(source.artifact);
    artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB8";
    artifact.artifact_kind = "structured_text";
    artifact.media_type = "application/json";
    artifact.content_hash = hash;
    artifact.byte_size = bytes.byteLength;
    artifact.created_at = "2026-08-28T18:11:02.000Z";
    const manifest = structuredClone(source.manifest);
    manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB9";
    manifest.artifact_id = artifact.artifact_id;
    manifest.rights_decision_id = "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FBA";
    manifest.origin = {
      origin_kind: "generated",
      generator_name: "petra-working-state-test-parser",
      generator_version: "1.0.0",
      generated_at: artifact.created_at,
      input_artifact_ids: [source.artifact.artifact_id],
    };
    manifest.storage_ref.object_key = `sha256/${hash.slice(7, 9)}/${hash.slice(9)}`;
    manifest.storage_ref.content_hash = hash;
    manifest.storage_ref.verified_at = artifact.created_at;
    manifest.integrity.checked_at = artifact.created_at;
    manifest.recorded_at = artifact.created_at;
    const rightsDecision = structuredClone(source.rightsDecision);
    rightsDecision.rights_decision_id = manifest.rights_decision_id;
    rightsDecision.artifact_manifest_id = manifest.artifact_manifest_id;
    rightsDecision.source_location =
      "urn:petra:working-state-test:01ARZ3NDEKTSV4RRFFQ69G5FB8";
    rightsDecision.observed_license = {
      statement: "Generated parser output retained under source-copy terms.",
      source: "artifact",
    };
    rightsDecision.access_basis = "permission";
    rightsDecision.authorization_reference = "petra-local-processing/1.0.0";
    rightsDecision.observed_at = artifact.created_at;
    rightsDecision.created_at = artifact.created_at;
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

  interface AuthorityFixture {
    project: PetraProject;
    definition: PetraProjectDefinition;
    objective: PetraProjectObjective;
    workUnit: PetraWorkUnit;
    span: PetraSourceSpan;
    claim: PetraClaim;
    correctedClaim: PetraClaim;
    assertion: PetraAssertion;
  }

  const setupAuthority = async (): Promise<AuthorityFixture> => {
    const researcher = readFixture<PetraActor>("actor");
    const worker = actor(
      "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      "service",
      "Petra worker",
    );
    const validator = actor(
      "actor_01K4D000000000000000000011",
      "service",
      "Petra validator",
    );
    const correctingAuthor = actor(
      "actor_01K4D000000000000000000012",
      "human",
      "Correcting author",
    );
    for (const record of [researcher, worker, validator, correctingAuthor]) {
      await scopes.registerActor(record);
    }
    const project = readFixture<PetraProject>("project");
    await scopes.registerProjectRevision(project);
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    const workVersion = readFixture<PetraWorkVersion>("work-version");
    await identities.registerWorkVersionRevision(workVersion);

    const definitionOne = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    await definitions.registerDefinitionRevision(definitionOne);
    await definitions.registerObjectiveRevision(
      readFixture<PetraProjectObjective>("project-objective"),
    );

    const source = sourceArtifactInput();
    await artifacts.registerVerifiedAcquisition(source);
    await artifacts.registerVerifiedAcquisition(parserArtifactInput(source));
    const bundle = documentBundle(source.manifest.artifact_manifest_id);
    await documents.registerDocumentBundle(bundle);
    const projectSource = readFixture<PetraProjectSource>("project-source");
    projectSource.content.artifact_manifest_ref.record_hash = canonicalHash(
      source.manifest,
    );
    projectSource.content_hash = canonicalHash(projectSource.content);
    await projectSources.registerProjectSourceRevision(projectSource);

    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-working-scientific",
    );
    const objective = readFixture<PetraProjectObjective>(
      "project-objective-working-scientific",
    );
    await definitions.registerDefinitionRevision(definition);
    await definitions.registerObjectiveRevision(objective);

    const inputManifest = readFixture<PetraWorkerInputManifest>(
      "worker-input-manifest",
    );
    inputManifest.issued_by = {
      actor_id: worker.actor_id,
      actor_kind: "service",
    };
    const requested = readFixture<PetraWorkUnit>("work-unit-requested");
    requested.created_by = structuredClone(inputManifest.issued_by);
    const workUnit = await workUnits.register({
      workUnit: requested,
      inputManifest,
    });

    const claim = readFixture<PetraClaim>("claim");
    claim.created_by = {
      actor_id: researcher.actor_id,
      actor_kind: "human",
    };
    if (claim.basis.basis_kind !== "source") {
      throw new Error("Expected a source-derived Claim fixture.");
    }
    claim.basis.proposed_by = structuredClone(claim.created_by);
    const assertion = readFixture<PetraAssertion>("assertion");
    assertion.created_by = structuredClone(claim.created_by);
    await evidence.proposeClaim(claim);
    await evidence.proposeAssertion(assertion);

    return {
      project,
      definition,
      objective,
      workUnit,
      span: bundle.spans[0]!,
      claim,
      correctedClaim: readFixture<PetraClaim>("claim-working-correction"),
      assertion,
    };
  };

  const exactRef = (
    schemaName: string,
    recordId: string,
    revision: number,
    value: unknown,
  ) => ({
    schema_name: schemaName,
    schema_version: "1.0.0",
    record_id: recordId,
    revision,
    record_hash: canonicalHash(value),
  });

  const bindSharedContext = <
    RecordType extends PetraWorkingCandidate | PetraWorkingRelationship,
  >(
    record: RecordType,
    fixture: AuthorityFixture,
  ): RecordType => {
    const workVersion = readFixture<PetraWorkVersion>("work-version");
    const sourceRef = exactRef(
      workVersion.schema_name,
      workVersion.work_version_id,
      workVersion.revision,
      workVersion,
    );
    record.project_id = fixture.project.project_id;
    record.project_definition_ref = {
      project_definition_id: fixture.definition.project_definition_id,
      revision: fixture.definition.revision,
      content_hash: fixture.definition.content_hash,
      definition_family: fixture.definition.definition_family,
    };
    record.producer = {
      producer_kind: "human",
      actor: {
        actor_id: readFixture<PetraActor>("actor").actor_id,
        actor_kind: "human",
      },
      contribution_kind: "direct_edit",
    };
    record.task_context = {
      task_kind: "work_unit",
      objective_ref: exactRef(
        fixture.objective.schema_name,
        fixture.objective.objective_id,
        fixture.objective.revision,
        fixture.objective,
      ),
      work_unit_ref: exactRef(
        fixture.workUnit.schema_name,
        fixture.workUnit.work_unit_id,
        fixture.workUnit.revision,
        fixture.workUnit,
      ),
    };
    record.input_snapshot = {
      snapshot_ref: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
        revision: 1,
        event_position: 0,
        content_hash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      input_record_refs: [sourceRef],
    };
    record.origin = {
      origin_kind: "direct_edit",
      source_record_refs: [sourceRef],
      summary:
        "A human-authored working record grounded in the exact source span.",
    };
    record.basis = [
      {
        basis_role: "source",
        record_ref: sourceRef,
        summary: "The exact source span is the working basis.",
      },
    ];
    record.provenance = [
      {
        provenance_role: "input",
        record_ref: sourceRef,
        statement: "The exact source span was retained as input provenance.",
      },
    ];
    record.qualifications = {
      assessment_state: "none_recorded",
      statements: [],
    };
    return record;
  };

  const candidate = (fixture: AuthorityFixture): PetraWorkingCandidate => {
    const record = bindSharedContext(
      readFixture<PetraWorkingCandidate>("working-candidate"),
      fixture,
    );
    record.profile_object.object_record_ref = exactRef(
      fixture.claim.schema_name,
      fixture.claim.claim_id,
      fixture.claim.revision,
      fixture.claim,
    );
    record.validation.target_record_hash = canonicalHash(fixture.claim);
    record.content_hash = workingContentHash(record);
    return record;
  };

  const relationship = (
    fixture: AuthorityFixture,
    root: PetraWorkingCandidate,
  ): PetraWorkingRelationship => {
    const record = bindSharedContext(
      readFixture<PetraWorkingRelationship>("working-relationship"),
      fixture,
    );
    record.profile_relationship.relationship_record_ref = exactRef(
      fixture.assertion.schema_name,
      fixture.assertion.assertion_id,
      fixture.assertion.revision,
      fixture.assertion,
    );
    record.validation.target_record_hash = canonicalHash(fixture.assertion);
    record.endpoints = {
      subject: {
        endpoint_kind: "profile_record",
        record_ref: exactRef(
          "petra.work-version",
          fixture.assertion.subject_id,
          1,
          readFixture<PetraWorkVersion>("work-version"),
        ),
      },
      object: {
        endpoint_kind: "working_candidate",
        candidate_ref: {
          working_candidate_id: root.working_candidate_id,
          revision: root.revision,
          content_hash: root.content_hash,
        },
      },
    };
    record.content_hash = workingContentHash(record);
    return record;
  };

  const correction = (
    fixture: AuthorityFixture,
    root: PetraWorkingCandidate,
  ): { candidate: PetraWorkingCandidate; claim: PetraClaim } => {
    const claim = fixture.correctedClaim;
    const record = bindSharedContext(
      readFixture<PetraWorkingCandidate>("working-candidate-correction"),
      fixture,
    );
    record.profile_object.object_record_ref = exactRef(
      claim.schema_name,
      claim.claim_id,
      claim.revision,
      claim,
    );
    record.validation.target_record_hash = canonicalHash(claim);
    record.lineage = {
      lineage_kind: "supersession",
      supersedes: {
        working_candidate_id: root.working_candidate_id,
        revision: root.revision,
        content_hash: root.content_hash,
      },
      change_kind: "material_revision",
      reason:
        "The human author narrowed the candidate without granting authority.",
    };
    record.content_hash = workingContentHash(record);
    return { candidate: record, claim };
  };

  const authoritativeView = (
    fixture: AuthorityFixture,
  ): PetraProjectRelationshipView => {
    const view = readFixture<PetraProjectRelationshipView>(
      "project-relationship-view",
    );
    view.project_id = fixture.project.project_id;
    view.content.profile.project_definition_ref = {
      record_id: fixture.definition.project_definition_id,
      revision: fixture.definition.revision,
      content_hash: fixture.definition.content_hash,
    };
    view.content.position.authority = {
      event_position: 3,
      stream_revision: 3,
    };
    view.content_hash = canonicalHash(view.content);
    return view;
  };

  it("atomically admits and corrects current scientific working state with stable retries and a repeatable-read query", async () => {
    const fixture = await setupAuthority();
    const root = candidate(fixture);
    const edge = relationship(fixture, root);
    const revised = correction(fixture, root);

    expect(
      await working.admitWorkingCandidateRevision({
        candidate: root,
        profileRecord: fixture.claim,
      }),
    ).toEqual(root);
    expect(
      await working.admitWorkingCandidateRevision({
        candidate: structuredClone(root),
        profileRecord: structuredClone(fixture.claim),
      }),
    ).toEqual(root);
    expect(
      await working.admitWorkingRelationshipRevision({
        relationship: edge,
        profileRecord: fixture.assertion,
      }),
    ).toEqual(edge);
    expect(
      await working.admitWorkingCandidateRevision({
        candidate: revised.candidate,
        profileRecord: revised.claim,
      }),
    ).toEqual(revised.candidate);
    expect(
      await working.admitWorkingCandidateRevision({
        candidate: structuredClone(revised.candidate),
        profileRecord: structuredClone(revised.claim),
      }),
    ).toEqual(revised.candidate);
    expect(
      await working.admitWorkingCandidateRevision({
        candidate: structuredClone(root),
        profileRecord: structuredClone(fixture.claim),
      }),
    ).toEqual(root);

    expect(
      await working.getWorkingCandidate(
        fixture.project.project_id,
        root.working_candidate_id,
      ),
    ).toEqual(revised.candidate);
    expect(
      await working.getWorkingCandidate(
        fixture.project.project_id,
        root.working_candidate_id,
        1,
      ),
    ).toEqual(root);

    const snapshot = await snapshots.getProjectWorkingStateSnapshot(
      fixture.project.project_id,
    );
    expect(snapshot).toMatchObject({
      project_id: fixture.project.project_id,
      content: {
        project_definition_ref: revised.candidate.project_definition_ref,
        authority: {
          isolation: "repeatable_read",
          event_position: 0,
          stream_revision: 0,
        },
        selection_boundary: {
          selection_kind: "current_working_heads",
          historical_working_revisions_included: false,
          authoritative_records_included: false,
          graph_overlay_composed: false,
        },
        candidates: [revised.candidate],
        relationships: [edge],
      },
    });
    expect(snapshot?.content_hash).toBe(canonicalHash(snapshot?.content));

    const counts = await pool.query<{
      candidates: string;
      candidate_revisions: string;
      relationships: string;
      relationship_revisions: string;
      correction_admissions: string;
      domain_events: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.working_candidates)::text AS candidates,
         (SELECT count(*) FROM petra.working_candidate_revisions)::text
           AS candidate_revisions,
         (SELECT count(*) FROM petra.working_relationships)::text
           AS relationships,
         (SELECT count(*) FROM petra.working_relationship_revisions)::text
           AS relationship_revisions,
         (SELECT count(*) FROM petra.evidence_entity_revisions
           WHERE admission_kind = 'working_correction')::text
           AS correction_admissions,
         (SELECT count(*) FROM petra.domain_events)::text AS domain_events`,
    );
    expect(counts.rows[0]).toEqual({
      candidates: "1",
      candidate_revisions: "2",
      relationships: "1",
      relationship_revisions: "1",
      correction_admissions: "1",
      domain_events: "0",
    });
  });

  it("composes the authoritative path with an exact superseded working endpoint and its distinct current head", async () => {
    const fixture = await setupAuthority();
    const root = candidate(fixture);
    const edge = relationship(fixture, root);
    const revised = correction(fixture, root);
    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });
    await working.admitWorkingRelationshipRevision({
      relationship: edge,
      profileRecord: fixture.assertion,
    });
    await working.admitWorkingCandidateRevision({
      candidate: revised.candidate,
      profileRecord: revised.claim,
    });
    await pool.query(
      "UPDATE petra.authority_positions SET event_position = 3 WHERE singleton",
    );
    await pool.query(
      `INSERT INTO petra.project_event_stream_heads (
         project_id, current_stream_revision
       ) VALUES ($1, 3)`,
      [fixture.project.project_id],
    );

    const authoritative = authoritativeView(fixture);
    const overlays = new PostgresProjectRelationshipOverlayViewReader(pool, {
      getProjectRelationshipView: (projectId) =>
        Promise.resolve(
          projectId === fixture.project.project_id
            ? structuredClone(authoritative)
            : undefined,
        ),
    });
    const overlay = await overlays.getProjectRelationshipOverlayView(
      fixture.project.project_id,
    );
    expect(overlay).toBeDefined();
    expect(overlay?.content.positions.authoritative.authority).toEqual({
      event_position: 3,
      stream_revision: 3,
    });
    expect(overlay?.content.positions.working.base_authority).toEqual({
      event_position: 3,
      stream_revision: 3,
    });
    expect(overlay?.content.completeness).toMatchObject({
      current_working_candidate_heads: 1,
      current_working_relationship_heads: 1,
      returned_working_candidate_revisions: 2,
      returned_working_relationships: 1,
      referenced_non_current_working_candidate_revisions: 1,
      exclusions: [
        {
          member_kind: "working_candidate",
          reason: "not_referenced_by_selected_relationship",
          count: 0,
        },
        {
          member_kind: "working_relationship",
          reason: "outside_authoritative_path",
          count: 0,
        },
      ],
    });
    const workingNodes = overlay?.content.nodes.filter(
      (node) => node.layer === "working",
    );
    expect(workingNodes).toHaveLength(2);
    expect(
      workingNodes?.map((node) => ({
        revision: node.owner.working_candidate_ref.revision,
        posture: node.endpoint_posture,
        label: node.label,
      })),
    ).toEqual([
      {
        revision: 1,
        posture: "non_current_working_endpoint",
        label: fixture.claim.canonical_text,
      },
      {
        revision: 2,
        posture: "current_working_head",
        label: revised.claim.canonical_text,
      },
    ]);
    const workingEdge = overlay?.content.relationships.find(
      (item) => item.layer === "working",
    );
    expect(workingEdge).toMatchObject({
      target_endpoint_posture: "non_current_working_endpoint",
      working_record: {
        working_relationship_id: edge.working_relationship_id,
        endpoints: {
          object: {
            candidate_ref: {
              revision: 1,
              content_hash: root.content_hash,
            },
          },
        },
      },
    });
    expect(workingEdge?.target_node_key).toContain(
      `${root.working_candidate_id}:1:`,
    );
    expect(workingEdge?.target_node_key).not.toContain(
      `${root.working_candidate_id}:2:`,
    );
    expect(overlay?.content.textual_peer.nodes).toHaveLength(
      overlay?.content.nodes.length ?? 0,
    );
    expect(overlay?.content.textual_peer.relationships).toHaveLength(
      overlay?.content.relationships.length ?? 0,
    );
    expect(overlay?.content_hash).toBe(canonicalHash(overlay?.content));
  });

  it("fails closed on definition, authority, projection, and source-view hash mismatches", async () => {
    const fixture = await setupAuthority();
    await pool.query(
      "UPDATE petra.authority_positions SET event_position = 3 WHERE singleton",
    );
    await pool.query(
      `INSERT INTO petra.project_event_stream_heads (
         project_id, current_stream_revision
       ) VALUES ($1, 3)`,
      [fixture.project.project_id],
    );
    const source = authoritativeView(fixture);
    let supplied = structuredClone(source);
    const overlays = new PostgresProjectRelationshipOverlayViewReader(pool, {
      getProjectRelationshipView: () => Promise.resolve(supplied),
    });

    supplied.content.profile.project_definition_ref.content_hash = `sha256:${"0".repeat(64)}`;
    supplied.content_hash = canonicalHash(supplied.content);
    await expectOverlayCode(
      () =>
        overlays.getProjectRelationshipOverlayView(fixture.project.project_id),
      "PROJECT_RELATIONSHIP_OVERLAY_DEFINITION_MISMATCH",
    );

    supplied = structuredClone(source);
    supplied.content.position.authority.event_position = 4;
    supplied.content_hash = canonicalHash(supplied.content);
    await expectOverlayCode(
      () =>
        overlays.getProjectRelationshipOverlayView(fixture.project.project_id),
      "PROJECT_RELATIONSHIP_OVERLAY_AUTHORITY_MISMATCH",
    );

    supplied = structuredClone(source);
    supplied.content.position.projection.pending_records = 1;
    supplied.content_hash = canonicalHash(supplied.content);
    await expectOverlayCode(
      () =>
        overlays.getProjectRelationshipOverlayView(fixture.project.project_id),
      "PROJECT_RELATIONSHIP_OVERLAY_PROJECTION_MISMATCH",
    );

    supplied = structuredClone(source);
    supplied.content_hash = `sha256:${"9".repeat(64)}`;
    await expectOverlayCode(
      () =>
        overlays.getProjectRelationshipOverlayView(fixture.project.project_id),
      "PROJECT_RELATIONSHIP_OVERLAY_CORRUPT",
    );
  });

  it("fails closed for stale, mismatched, unknown-profile, and unknown-validator inputs without partial working rows", async () => {
    const fixture = await setupAuthority();
    const root = candidate(fixture);

    await expect(
      pool.query(
        `INSERT INTO petra.evidence_entity_revisions (
           evidence_id, evidence_kind, revision, authority_zone, review_state,
           admission_kind, schema_name, schema_version, record_hash, payload,
           recorded_at
         ) VALUES ($1, 'claim', 2, 'quarantine', 'unreviewed',
                   'working_correction', 'petra.claim', '1.0.0', $2,
                   $3::jsonb, $4::timestamptz)`,
        [
          fixture.correctedClaim.claim_id,
          canonicalHash(fixture.correctedClaim),
          JSON.stringify(fixture.correctedClaim),
          fixture.correctedClaim.created_at,
        ],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    const stale = structuredClone(root);
    stale.task_context.objective_ref.revision = 1;
    stale.task_context.objective_ref.record_hash = canonicalHash(
      readFixture<PetraProjectObjective>("project-objective"),
    );
    stale.content_hash = workingContentHash(stale);
    await expectWorkingCode(
      () =>
        working.admitWorkingCandidateRevision({
          candidate: stale,
          profileRecord: fixture.claim,
        }),
      "WORKING_STATE_STALE",
    );

    const unsupported = structuredClone(root);
    unsupported.working_candidate_id =
      "working_candidate_01K4D000000000000000000099";
    unsupported.profile_object.registration.semantic_key =
      "scientific.unregistered";
    unsupported.content_hash = workingContentHash(unsupported);
    await expectWorkingCode(
      () =>
        working.admitWorkingCandidateRevision({
          candidate: unsupported,
          profileRecord: fixture.claim,
        }),
      "WORKING_STATE_PROFILE_UNSUPPORTED",
    );

    const validator = structuredClone(root);
    validator.working_candidate_id =
      "working_candidate_01K4D000000000000000000098";
    validator.validation.results[0]!.validator_ref.content_hash = `sha256:${"0".repeat(64)}`;
    validator.content_hash = workingContentHash(validator);
    await expectWorkingCode(
      () =>
        working.admitWorkingCandidateRevision({
          candidate: validator,
          profileRecord: fixture.claim,
        }),
      "WORKING_STATE_PROFILE_UNSUPPORTED",
    );

    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });
    const mismatched = relationship(fixture, root);
    if (mismatched.endpoints.object.endpoint_kind !== "working_candidate") {
      throw new Error("Expected a WorkingCandidate relationship endpoint.");
    }
    mismatched.endpoints.object.candidate_ref.content_hash = `sha256:${"9".repeat(64)}`;
    mismatched.content_hash = workingContentHash(mismatched);
    await expectWorkingCode(
      () =>
        working.admitWorkingRelationshipRevision({
          relationship: mismatched,
          profileRecord: fixture.assertion,
        }),
      "WORKING_STATE_RELATION_INVALID",
    );

    const counts = await pool.query<{
      candidates: string;
      relationships: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.working_candidates)::text AS candidates,
         (SELECT count(*) FROM petra.working_relationships)::text
           AS relationships`,
    );
    expect(counts.rows[0]).toEqual({
      candidates: "1",
      relationships: "0",
    });
  });
});
