import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraClaim,
  PetraContextPacket,
  PetraControlledWritingGoverningRelationship,
  PetraControlledWritingRequirement,
  PetraEvidenceProposalBundle,
  PetraModelCall,
  PetraModelRequest,
  PetraModelRoleCertification,
  PetraParsedDocument,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectRelationshipView,
  PetraProjectSource,
  PetraRightsDecision,
  PetraReviewSessionV110,
  PetraCapabilityGrantV1160,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWorkerInputManifest,
  PetraWork,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  PetraWorkUnit,
  PetraWorkVersion,
  PetraHypothesis,
  PetraRegisteredProjectProfile,
  PetraAssessmentProfile,
  PetraAssessmentPolicy,
  PetraProjectExaminationRequest,
  PetraHypothesisAssessment,
  PetraPostureDecision,
  PetraCycleDisposition,
} from "@petra/contracts";
import {
  derivePetraId,
  assertConversationOwnerBinding,
  copilotHash,
  type CopilotTurn,
  HypothesisExaminationKernel,
  examinationRecordRef,
  examinationAuthorityProposal,
  type PersistDocumentBundleInput,
  type PersistVerifiedArtifactInput,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresModelExecutionRepository } from "../src/model-execution-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import type { PostgresProjectRelationshipOverlayViewError } from "../src/project-relationship-overlay-view-reader.js";
import { PostgresProjectRelationshipOverlayViewReader } from "../src/project-relationship-overlay-view-reader.js";
import { PostgresProjectSourceAuthorityRepository } from "../src/project-source-authority-repository.js";
import { PostgresProjectWorkingStateSnapshotReader } from "../src/project-working-state-snapshot-reader.js";
import { PostgresProjectSemanticGraphReader } from "../src/project-semantic-graph-reader.js";
import { PostgresProjectExaminationOwnerAuthority } from "../src/project-examination-owner-authority.js";
import { PostgresProjectExaminationRegistry } from "../src/project-examination-registry.js";
import { PostgresProjectExaminationCommandAuthority } from "../src/project-examination-command-authority.js";
import { PostgresCapabilityGrantCommandAuthorizer } from "../src/capability-grant-authority-repository.js";
import { PostgresProjectExaminationRepository } from "../src/project-examination-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresReviewSessionAuthorityRepository } from "../src/review-session-authority-repository.js";
import { PostgresProjectReviewViewReader } from "../src/project-review-view-reader.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
import type {
  PostgresWorkingStateError,
  PostgresWorkingStateErrorCode,
} from "../src/working-state-authority-repository.js";
import { PostgresWorkingStateAuthorityRepository } from "../src/working-state-authority-repository.js";
import { PostgresCopilotTurnRepository } from "../src/project-copilot-repository.js";
import { PostgresCapabilityGrantAuthorityRepository } from "../src/capability-grant-authority-repository.js";
import { createMemoryArtifactStore } from "./artifact-store-fixture.js";
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

const modelProposal = (
  claim: PetraClaim,
  contextPacketHash: string,
): PetraEvidenceProposalBundle => {
  const proposal = readFixture<PetraEvidenceProposalBundle>(
    "evidence-proposal-bundle",
  );
  proposal.evidence_proposal_bundle_id =
    "evidence_proposal_bundle_01ARZ3NDEKTSV4RRFFQ69G5FD9";
  proposal.content.extraction = {
    extraction_kind: "model_extraction",
    extraction_run_id: "extraction_run_01ARZ3NDEKTSV4RRFFQ69G5FD7",
    extractor: {
      name: "petra-source-grounded-extractor",
      version: "1.0.0",
    },
    recipe_hash: `sha256:${"a".repeat(64)}`,
    model_request_id: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FD4",
    model_call_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD5",
    model_deployment: "model_deployment_01ARZ3NDEKTSV4RRFFQ69G5FD1",
    prompt_profile: {
      name: "petra-source-grounded-extractor",
      version: "1.0.0",
    },
    prompt_hash: `sha256:${"e".repeat(64)}`,
    parameters_hash:
      "sha256:440b3886b2eb3fb543f46ad712e2108b83e753774300260ca165f5cbb0f295a9",
    context_packet_ref: {
      context_packet_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
      content_hash: contextPacketHash,
    },
    started_at: "2026-09-02T18:31:00.000Z",
    completed_at: "2026-09-02T18:31:00.004Z",
  };
  const candidate = proposal.content.candidates[0];
  if (candidate === undefined) {
    throw new Error("Expected one evidence proposal candidate.");
  }
  candidate.candidate_id = "evidence_candidate_01K4D000000000000000000014";
  candidate.claim = structuredClone(claim);
  candidate.assertion.assertion_id = "assertion_01K4D000000000000000000015";
  candidate.assertion.object = {
    object_kind: "entity",
    entity_id: claim.claim_id,
  };
  candidate.assertion.provenance_refs = [
    {
      provenance_kind: "source_span",
      source_span_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FB7",
    },
    {
      provenance_kind: "record",
      record_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD5",
      role: "model_call",
    },
  ];
  candidate.assertion.created_by = {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
    actor_kind: "service",
  };
  proposal.created_by = structuredClone(candidate.assertion.created_by);
  proposal.created_at = "2026-09-02T18:31:00.004Z";
  proposal.content_hash = canonicalHash(proposal.content);
  return proposal;
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
  const modelExecutions = new PostgresModelExecutionRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const projectSources = new PostgresProjectSourceAuthorityRepository(pool);
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const working = new PostgresWorkingStateAuthorityRepository(pool);
  const snapshots = new PostgresProjectWorkingStateSnapshotReader(pool);
  const semanticGraphs = new PostgresProjectSemanticGraphReader(pool);
  const reviewSessions = new PostgresReviewSessionAuthorityRepository(pool);
  const reviewViews = new PostgresProjectReviewViewReader(pool);

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

  // Adversarial storage fixtures deliberately bypass append-only triggers in the disposable test database.
  const corruptStoredRecord = async (sql: string, values: unknown[] = []) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL session_replication_role = replica");
      await client.query(sql, values);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };

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

  const setupAuthority = async (
    examination = false,
  ): Promise<AuthorityFixture> => {
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
    if (examination) {
      const registered = readFixture<PetraRegisteredProjectProfile>(
        "registered-project-profile-scientific-v1-4",
      );
      definition.content.registrations.push(
        ...registered.content.definition.registrations.filter((r) =>
          [
            "petra.hypothesis",
            "petra.hypothesis-assessment",
            "petra.posture-decision",
            "petra.cycle-disposition",
            "petra.assessment-profile",
            "petra.assessment-policy",
          ].includes(r.contract.name),
        ),
      );
      definition.content_hash = canonicalHash(definition.content);
      objective.project_definition_ref.content_hash = definition.content_hash;
    }
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
    const queued = await workUnits.queue(
      fixture.workUnit.work_unit_id,
      fixture.workUnit.revision,
      "2026-09-12T20:58:00.000Z",
    );
    expect(queued.revision).toBe(fixture.workUnit.revision + 1);

    const staleRoot = structuredClone(root);
    staleRoot.working_candidate_id =
      "working_candidate_01K4D000000000000000000097";
    staleRoot.content_hash = workingContentHash(staleRoot);
    await expectWorkingCode(
      () =>
        working.admitWorkingCandidateRevision({
          candidate: staleRoot,
          profileRecord: fixture.claim,
        }),
      "WORKING_STATE_STALE",
    );
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

  it("resolves exact native material and Project-bound passages while preserving remote egress restrictions", async () => {
    const fixture = await setupAuthority();
    const empty = await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    );
    expect(empty?.content.nodes).toEqual([]);
    expect(
      await semanticGraphs.getProjectSemanticGraph(
        "project_01K4E000000000000000000099",
      ),
    ).toBeUndefined();
    const root = candidate(fixture);
    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });
    const view = await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    );
    const native = view?.content.nodes[0];
    expect(native?.native_record).toEqual(fixture.claim);
    expect(native?.source_passages?.[0]?.span).toEqual(fixture.span);
    expect(native?.remote_context?.permitted).toBe(false);
    expect(native?.source_passages?.[0]?.remote_permitted).toBe(false);
    expect(view?.content_hash).toBe(canonicalHash(view?.content));
    expect(view?.content.query.authority_effect).toBe("none");
    const revised = correction(fixture, root);
    await working.admitWorkingCandidateRevision({
      candidate: revised.candidate,
      profileRecord: revised.claim,
    });
    const current = await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    );
    expect(current?.content.nodes[0]?.record_ref.revision).toBe(2);
    expect(current?.content.nodes[0]?.native_record).toEqual(revised.claim);
    expect(current?.content_hash).not.toBe(view?.content_hash);
    await corruptStoredRecord(
      "UPDATE petra.evidence_entity_revisions SET record_hash=$1 WHERE evidence_id=$2 AND revision=2",
      [`sha256:${"0".repeat(64)}`, revised.claim.claim_id],
    );
    await expect(
      semanticGraphs.getProjectSemanticGraph(fixture.project.project_id),
    ).rejects.toThrow("unavailable");
  });

  if (process.env.PETRA_TEST_A1_BROWSER === "1")
    it("executes examination functions through production browser controls and actual retained HTTP command owners", async () => {
      const fixture = await setupAuthority(true);
      const root = candidate(fixture);
      await working.admitWorkingCandidateRevision({
        candidate: root,
        profileRecord: fixture.claim,
      });
      const registry = new PostgresProjectExaminationRegistry(pool);
      await registry.register(
        readFixture<PetraAssessmentProfile>("assessment-profile"),
      );
      await registry.register(
        readFixture<PetraAssessmentPolicy>("assessment-policy"),
      );
      const directory = await mkdtemp(
        join(tmpdir(), "petra-a1-examination-functions-"),
      );
      try {
        const path = join(directory, "fixture.json");
        await writeFile(
          path,
          JSON.stringify({
            projectId: fixture.project.project_id,
            actor: { ...fixture.project.created_by, actor_kind: "human" },
            correction: correction(fixture, root),
          }),
        );
        const result = await promisify(execFile)(
          process.execPath,
          [
            "--import",
            "tsx",
            new URL(
              "../../../scripts/verify-a1-examination-browser.mjs",
              import.meta.url,
            ).pathname,
          ],
          {
            env: { ...process.env, PETRA_A1_EXAMINATION_FIXTURE: path },
            timeout: 110000,
            maxBuffer: 2 * 1024 * 1024,
          },
        );
        expect(result.stdout).toContain(
          "Examination browser functions passed.",
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }, 120000);

  it("authorizes two connected reviewed cycles through exact grants and atomic retained receipts", async () => {
    const fixture = await setupAuthority(true);
    const root = candidate(fixture);
    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });
    const registry = new PostgresProjectExaminationRegistry(pool);
    await registry.register(
      readFixture<PetraAssessmentProfile>("assessment-profile"),
    );
    await registry.register(
      readFixture<PetraAssessmentPolicy>("assessment-policy"),
    );
    const records = new PostgresProjectExaminationRepository(
      pool,
      semanticGraphs,
      async (projectId, graph, transaction) =>
        (await registry.resolve(projectId, graph, transaction))?.kernel,
    );
    const commands = new PostgresProjectExaminationCommandAuthority(
      pool,
      records,
      semanticGraphs,
      registry,
      new PostgresCapabilityGrantCommandAuthorizer(),
    );
    const ownerAuthority = new PostgresProjectExaminationOwnerAuthority(
      pool,
      semanticGraphs,
      registry,
    );
    const owner = {
      ...fixture.project.created_by,
      actor_kind: "human" as const,
    };
    const authorityGraph = (await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    ))!;
    const authorityRequest = {
      schema_name: "petra.project-examination-authority-request" as const,
      schema_version: "1.0.0" as const,
      project_id: fixture.project.project_id,
      command_id: derivePetraId("command", "reviewed-owner-authority"),
      idempotency_key: "reviewed-owner-authority-01",
      graph_content_hash: authorityGraph.content_hash,
      operation: "authorize_own_examination" as const,
      review: {
        proposed_content_hash: canonicalHash(
          examinationAuthorityProposal(
            fixture.project.project_id,
            authorityGraph.content_hash,
          ),
        ),
        rationale:
          "Authorize only my own bounded examinations on this exact registered Project basis.",
        reviewed_at: "2026-09-08T00:00:00.000Z",
      },
    };
    expect(
      (await ownerAuthority.availability(fixture.project.project_id, owner))
        .state,
    ).toBe("available");
    const nonOwner = {
      actor_id: "actor_01K4D000000000000000000012",
      actor_kind: "human" as const,
    };
    await expect(
      ownerAuthority.execute(
        fixture.project.project_id,
        authorityRequest,
        nonOwner,
      ),
    ).rejects.toMatchObject({ code: "EXAMINATION_NOT_AUTHORIZED" });
    const staleAuthority = {
      ...authorityRequest,
      graph_content_hash: "sha256:" + "a".repeat(64),
      review: {
        ...authorityRequest.review,
        proposed_content_hash: canonicalHash(
          examinationAuthorityProposal(
            fixture.project.project_id,
            "sha256:" + "a".repeat(64),
          ),
        ),
      },
    };
    await expect(
      ownerAuthority.execute(fixture.project.project_id, staleAuthority, owner),
    ).rejects.toMatchObject({ code: "EXAMINATION_BASIS_CHANGED" });
    const authorityReceipt = await ownerAuthority.execute(
      fixture.project.project_id,
      authorityRequest,
      owner,
    );
    expect(
      await ownerAuthority.execute(
        fixture.project.project_id,
        authorityRequest,
        owner,
      ),
    ).toEqual(authorityReceipt);
    expect(
      await ownerAuthority.recover(
        fixture.project.project_id,
        authorityRequest.command_id,
        nonOwner,
      ),
    ).toBeUndefined();
    await expect(
      ownerAuthority.execute(
        fixture.project.project_id,
        {
          ...authorityRequest,
          review: { ...authorityRequest.review, rationale: "Changed review" },
        },
        owner,
      ),
    ).rejects.toMatchObject({ code: "EXAMINATION_AUTHORITY_COMMAND_CONFLICT" });
    const grant = authorityReceipt.content.grant;
    expect(grant.content.allowed_commands).toEqual([
      "ConductProjectExamination",
    ]);
    expect(
      (
        await pool.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM petra.project_examination_records",
        )
      ).rows[0]!.count,
    ).toBe(0);
    await expect(
      pool.query(
        "UPDATE petra.project_examination_authority_receipts SET receipt_payload=receipt_payload WHERE command_id=$1",
        [authorityRequest.command_id],
      ),
    ).rejects.toBeDefined();
    const principal = {
      actor: { ...grant.grantee, actor_kind: "human" as const },
      capabilityGrantId: grant.capability_grant_id,
    };
    let graph = (await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    ))!;
    let sequence = 0;
    const request = (
      operation: PetraProjectExaminationRequest["operation"],
      content: PetraProjectExaminationRequest["proposed_content"],
      prior: PetraProjectExaminationRequest["expected_prior_ref"] = null,
    ): PetraProjectExaminationRequest => ({
      schema_name: "petra.project-examination-request",
      schema_version: "1.0.0",
      project_id: fixture.project.project_id,
      command_id: derivePetraId("command", `a1-scoped-command-${++sequence}`),
      idempotency_key: `a1-scoped-command-${sequence}`,
      operation,
      expected_graph_hash: graph.content_hash,
      expected_prior_ref: prior,
      proposed_content: content,
      review: {
        content_hash: canonicalHash(content),
        reviewed_at: "2026-10-07T12:00:00.000Z",
        rationale:
          "Disposable integration fixture: explicit authenticated human review of this exact scoped content and source basis.",
      },
    });
    const hypContent = readFixture<PetraHypothesis>("hypothesis").content;
    hypContent.target_claim_ref = graph.content.nodes[0]!.record_ref;
    const initial = request("register_hypothesis", hypContent);
    await expect(
      commands.execute(fixture.project.project_id, initial, {
        actor: principal.actor,
      }),
    ).rejects.toThrow("grant");
    const admitted = await commands.execute(
      fixture.project.project_id,
      initial,
      principal,
    );
    expect(admitted.outcome).toBe("recorded");
    const firstHypothesis = admitted.record as PetraHypothesis;
    const replay = await commands.execute(fixture.project.project_id, initial, {
      actor: principal.actor,
    });
    expect(replay.receipt).toEqual(admitted.receipt);
    expect(replay.outcome).toBe("replayed");
    const conflict = structuredClone(initial);
    (conflict.proposed_content as PetraHypothesis["content"]).descriptor =
      "Conflicting immutable request";
    conflict.review.content_hash = canonicalHash(conflict.proposed_content);
    await expect(
      commands.execute(fixture.project.project_id, conflict, principal),
    ).rejects.toThrow("different immutable");
    const configuration = (await registry.resolve(
      fixture.project.project_id,
      graph,
    ))!;
    const content = readFixture<PetraHypothesisAssessment>(
      "hypothesis-assessment",
    ).content;
    content.subject_ref = examinationRecordRef(firstHypothesis);
    content.target_claim_ref = firstHypothesis.content.target_claim_ref;
    content.profile_ref = configuration.kernel.semantics.profile_ref;
    content.policy_ref = configuration.kernel.semantics.policy_ref;
    content.basis = {
      definition_ref: graph.content.definition_ref,
      objective_ref: graph.content.objective_ref ?? null,
      graph_content_hash: graph.content_hash,
      event_position: graph.content.authority.event_position,
      stream_revision: graph.content.authority.stream_revision,
      query_kind: "current_registered_working_heads",
    };
    content.as_of = "2026-10-07T12:00:00.000Z";
    content.review_state = "reviewed";
    content.criteria = configuration.profile.content.criteria.map(
      (criterion) => ({
        criterion_key: criterion.key,
        method: criterion.method,
        result: "unknown",
        origin: "human_judgment",
        evidence_refs: [],
        explanation:
          "The named check remains unexamined in this initial cycle.",
        limitations: ["No satisfaction follows from task success."],
      }),
    );
    content.findings = [
      {
        finding_key: "reviewed-gap",
        type_key: "scientific.scoped_insufficiency",
        axis: "warrant",
        explanation:
          "The exact basis is retained, but the named checks have not passed.",
        evidence_refs: [firstHypothesis.content.target_claim_ref],
        criterion_keys: content.criteria.map((c) => c.criterion_key),
        origin: "human_judgment",
        review_state: "reviewed",
        material_unknowns: ["Required checks remain open."],
        limitations: ["Partial represented evidence only."],
      },
    ];
    content.axes = [
      {
        axis: "warrant",
        summary: "insufficient",
        finding_keys: ["reviewed-gap"],
        material_unknowns: ["Required checks remain open."],
        dependency_refs: [firstHypothesis.content.target_claim_ref],
      },
    ];
    const firstAssessment = (
      await commands.execute(
        fixture.project.project_id,
        request("assess_hypothesis", content),
        principal,
      )
    ).record as PetraHypothesisAssessment;
    const postureContent =
      readFixture<PetraPostureDecision>("posture-decision").content;
    postureContent.assessment_ref = examinationRecordRef(firstAssessment);
    postureContent.profile_ref = content.profile_ref;
    postureContent.policy_ref = content.policy_ref;
    postureContent.state = "active";
    postureContent.determining_finding_keys = ["reviewed-gap"];
    postureContent.obligations =
      configuration.policy.content.obligation_types.map((registered) => ({
        obligation_id: derivePetraId("obligation", registered.key),
        revision: 1,
        type_key: registered.key,
        creating_finding_key: "reviewed-gap",
        rationale:
          "Complete this named scoped check before a satisfied disposition.",
        enforcement: registered.enforcement,
        criterion_keys: registered.criterion_keys as [string, ...string[]],
        state: "open",
        satisfaction_evidence_refs: [],
        waiver_ref: null,
        work_refs: [],
      }));
    const firstPosture = (
      await commands.execute(
        fixture.project.project_id,
        request("decide_posture", postureContent),
        principal,
      )
    ).record as PetraPostureDecision;
    const dispositionContent =
      readFixture<PetraCycleDisposition>("cycle-disposition").content;
    dispositionContent.assessment_ref = examinationRecordRef(firstAssessment);
    dispositionContent.posture_ref = examinationRecordRef(firstPosture);
    dispositionContent.basis = content.basis;
    dispositionContent.disposition = "insufficient";
    dispositionContent.unresolved_questions = [
      ...new Set([
        ...firstAssessment.content.material_unknowns,
        "Required checks remain open.",
      ]),
    ];
    const firstDisposition = (
      await commands.execute(
        fixture.project.project_id,
        request("conclude_cycle", dispositionContent),
        principal,
      )
    ).record as PetraCycleDisposition;
    const revised = correction(fixture, root);
    await working.admitWorkingCandidateRevision({
      candidate: revised.candidate,
      profileRecord: revised.claim,
    });
    const stale = request("assess_hypothesis", content);
    await expect(
      commands.execute(fixture.project.project_id, stale, principal),
    ).rejects.toThrow("changed Project graph");
    graph = (await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    ))!;
    expect(configuration.kernel.freshness(firstAssessment, graph).state).toBe(
      "invalidated",
    );
    const nextHypContent = structuredClone(firstHypothesis.content);
    nextHypContent.target_claim_ref = graph.content.nodes[0]!.record_ref;
    const secondHypothesis = (
      await commands.execute(
        fixture.project.project_id,
        request(
          "revise_hypothesis",
          nextHypContent,
          examinationRecordRef(firstHypothesis),
        ),
        principal,
      )
    ).record as PetraHypothesis;
    const next = structuredClone(content);
    next.subject_ref = examinationRecordRef(secondHypothesis);
    next.target_claim_ref = secondHypothesis.content.target_claim_ref;
    next.basis.graph_content_hash = graph.content_hash;
    next.scope = revised.claim.scope;
    next.prior_assessment_ref = examinationRecordRef(firstAssessment);
    const spanRef = exactRef(
      "petra.source-span",
      fixture.span.source_span_id,
      fixture.span.revision,
      fixture.span,
    );
    const examined = [next.target_claim_ref, spanRef];
    for (const criterion of next.criteria) {
      criterion.result = "passed";
      criterion.evidence_refs = examined;
      criterion.explanation =
        "This disposable fixture represents explicit human examination of the exact native Claim, retained passage, narrowed scope and bounded contrary-basis protocol.";
    }
    next.coverage = {
      state: "bounded_search",
      protocol:
        "Review the exact retained passage and represented Project source set for this narrowed scope; unrepresented literature remains outside coverage.",
      source_set_refs: [
        graph.content.nodes[0]!.source_passages![0]!.project_source_ref,
      ],
      limitations: [
        "A bounded reviewed source set cannot establish universal absence of contrary evidence.",
      ],
    };
    next.findings[0]!.finding_key = "scoped-support";
    next.findings[0]!.type_key = "scientific.scoped_support";
    next.findings[0]!.evidence_refs = examined;
    next.axes = [
      {
        axis: "warrant",
        summary: "supporting_within_scope",
        finding_keys: ["scoped-support"],
        material_unknowns: ["Independent repetition remains unknown."],
        dependency_refs: examined,
      },
    ];
    next.material_unknowns = [
      "Independent repetition and unrepresented sources remain unknown.",
    ];
    const secondAssessment = (
      await commands.execute(
        fixture.project.project_id,
        request(
          "assess_hypothesis",
          next,
          examinationRecordRef(firstAssessment),
        ),
        principal,
      )
    ).record as PetraHypothesisAssessment;
    const nextPosture = structuredClone(postureContent);
    nextPosture.assessment_ref = examinationRecordRef(secondAssessment);
    nextPosture.determining_finding_keys = ["scoped-support"];
    for (const obligation of nextPosture.obligations) {
      obligation.state = "satisfied";
      obligation.revision += 1;
      obligation.creating_finding_key = "scoped-support";
      obligation.satisfaction_evidence_refs = examined;
    }
    const secondPosture = (
      await commands.execute(
        fixture.project.project_id,
        request(
          "decide_posture",
          nextPosture,
          examinationRecordRef(firstPosture),
        ),
        principal,
      )
    ).record as PetraPostureDecision;
    const nextDisposition = structuredClone(dispositionContent);
    nextDisposition.assessment_ref = examinationRecordRef(secondAssessment);
    nextDisposition.posture_ref = examinationRecordRef(secondPosture);
    nextDisposition.basis = next.basis;
    nextDisposition.disposition = "supporting_within_scope";
    nextDisposition.criterion_keys = next.criteria.map((c) => c.criterion_key);
    nextDisposition.finding_keys = ["scoped-support"];
    nextDisposition.unresolved_questions = next.material_unknowns;
    nextDisposition.prior_disposition_ref =
      examinationRecordRef(firstDisposition);
    const concluded = await commands.execute(
      fixture.project.project_id,
      request(
        "conclude_cycle",
        nextDisposition,
        examinationRecordRef(firstDisposition),
      ),
      principal,
    );
    expect(concluded.record.revision).toBe(2);
    expect(
      (await records.list(fixture.project.project_id)).records,
    ).toHaveLength(8);
    expect(
      (
        await pool.query<{ count: string }>(
          "SELECT count(*) FROM petra.project_examination_command_receipts",
        )
      ).rows[0]!.count,
    ).toBe("8");
    expect(
      (
        await records.getSnapshot(
          fixture.project.project_id,
          firstAssessment.content.basis.graph_content_hash,
        )
      )?.content.nodes[0]?.record_ref.revision,
    ).toBe(1);
    expect(
      await commands.recover(
        fixture.project.project_id,
        initial.command_id,
        principal.actor,
      ),
    ).toMatchObject({ receipt: admitted.receipt });
    await expect(
      commands.recover(fixture.project.project_id, initial.command_id, {
        actor_id: "actor_01K4D000000000000000000012",
        actor_kind: "human",
      }),
    ).rejects.toThrow("unavailable");
    await expect(
      pool.query(
        "UPDATE petra.project_examination_command_receipts SET receipt_payload=receipt_payload",
      ),
    ).rejects.toThrow();
    expect(
      (
        await pool.query<{ count: string }>(
          "SELECT count(*) FROM petra.domain_events",
        )
      ).rows[0]!.count,
    ).toBe("0");
  });

  it("retains canonical conversation lineage across actual inquiry Work Review and hypothesis cycle records", async () => {
    const fixture = await setupAuthority(true),
      root = candidate(fixture);
    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });
    const relation = relationship(fixture, root);
    await working.admitWorkingRelationshipRevision({
      relationship: relation,
      profileRecord: fixture.assertion,
    });
    const session = readFixture<PetraReviewSessionV110>(
      "review-session-working-candidate",
    );
    session.project_id = fixture.project.project_id;
    session.project_definition_ref = {
      project_definition_id: fixture.definition.project_definition_id,
      revision: fixture.definition.revision,
      content_hash: fixture.definition.content_hash,
    };
    session.content.objective_ref = {
      objective_id: fixture.objective.objective_id,
      revision: fixture.objective.revision,
      content_hash: fixture.objective.content_hash,
    };
    const position = (
      await pool.query<{ event_position: string; stream_revision: string }>(
        "SELECT authority.event_position::text,COALESCE(stream.current_stream_revision,0)::text AS stream_revision FROM petra.authority_positions authority LEFT JOIN petra.project_event_stream_heads stream ON stream.project_id=$1 WHERE authority.singleton",
        [fixture.project.project_id],
      )
    ).rows[0]!;
    session.content.snapshot = {
      event_position: Number(position.event_position),
      stream_revision: Number(position.stream_revision),
      captured_at: new Date().toISOString(),
    };
    session.content.members = [
      {
        review_member_id: derivePetraId("review_member", "copilot-lineage"),
        member_role: "ordinary",
        working_state: {
          candidate_ref: {
            working_candidate_id: root.working_candidate_id,
            revision: root.revision,
            content_hash: root.content_hash,
          },
          relationship_refs: [
            {
              working_relationship_id: relation.working_relationship_id,
              revision: relation.revision,
              content_hash: relation.content_hash,
            },
          ],
        },
        candidate_bindings: [
          {
            semantic_key: root.profile_object.registration.semantic_key,
            binding_role: "candidate",
            record_ref: {
              record_id: fixture.claim.claim_id,
              revision: fixture.claim.revision,
              record_hash: canonicalHash(fixture.claim),
            },
          },
          {
            semantic_key:
              relation.profile_relationship.registration.semantic_key,
            binding_role: "relationship",
            record_ref: {
              record_id: fixture.assertion.assertion_id,
              revision: fixture.assertion.revision,
              record_hash: canonicalHash(fixture.assertion),
            },
          },
        ],
      },
    ];
    session.content_hash = canonicalHash(session.content);
    await reviewSessions.registerReviewSessionRevision(session);
    const graph = (await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    ))!;
    const hypothesis = readFixture<PetraHypothesis>("hypothesis");
    hypothesis.content.target_claim_ref = graph.content.nodes[0]!.record_ref;
    hypothesis.content_hash = canonicalHash(hypothesis.content);
    const assessment = readFixture<PetraHypothesisAssessment>(
      "hypothesis-assessment",
    );
    assessment.content.subject_ref = examinationRecordRef(hypothesis);
    assessment.content.target_claim_ref = hypothesis.content.target_claim_ref;
    assessment.content.basis = {
      definition_ref: graph.content.definition_ref,
      objective_ref: graph.content.objective_ref ?? null,
      graph_content_hash: graph.content_hash,
      event_position: graph.content.authority.event_position,
      stream_revision: graph.content.authority.stream_revision,
      query_kind: "current_registered_working_heads",
    };
    assessment.content.review_state = "reviewed";
    assessment.content_hash = canonicalHash(assessment.content);
    const kernel = new HypothesisExaminationKernel({
      profile_ref: assessment.content.profile_ref,
      policy_ref: assessment.content.policy_ref,
      criteria: new Map(),
      finding_types: new Map(),
      obligation_types: new Map(),
      allowed_dispositions: ["insufficient", "deferred", "further_cycle"],
    });
    const examinations = new PostgresProjectExaminationRepository(
      pool,
      semanticGraphs,
      () => kernel,
    );
    await examinations.append(hypothesis);
    await examinations.append(assessment);
    const posture = readFixture<PetraPostureDecision>("posture-decision");
    posture.content.assessment_ref = examinationRecordRef(assessment);
    posture.content_hash = canonicalHash(posture.content);
    await examinations.append(posture);
    const disposition = readFixture<PetraCycleDisposition>("cycle-disposition");
    disposition.content.assessment_ref = examinationRecordRef(assessment);
    disposition.content.posture_ref = examinationRecordRef(posture);
    disposition.content.basis = assessment.content.basis;
    disposition.content.unresolved_questions =
      assessment.content.material_unknowns;
    disposition.content_hash = canonicalHash(disposition.content);
    await examinations.append(disposition);
    const grant = readFixture<PetraCapabilityGrantV1160>(
      "capability-grant-v1-16",
    );
    grant.content.allowed_commands = ["ManageProjectWork"];
    grant.content_hash = copilotHash(grant.content);
    await new PostgresCapabilityGrantAuthorityRepository(
      pool,
    ).registerCapabilityGrant(grant);
    const store = createMemoryArtifactStore(),
      options = {
        actorId: fixture.project.created_by.actor_id,
        artifactStore: store,
        artifacts: new PostgresArtifactAuthorityRepository(pool, store),
      };
    const repository = new PostgresCopilotTurnRepository(pool, options),
      turn = readFixture<CopilotTurn>("copilot-turn");
    turn.actor_id = options.actorId;
    turn.project_id = fixture.project.project_id;
    turn.context.project_id = fixture.project.project_id;
    turn.thread_id = derivePetraId(
      "thread",
      `copilot:${turn.project_id}:${turn.actor_id}`,
    );
    turn.run_id = derivePetraId("run", "complete-native-lineage");
    turn.focus_keys = [];
    turn.started_at = new Date().toISOString();
    turn.context.basis.definition = {
      record_id: fixture.definition.project_definition_id,
      revision: fixture.definition.revision,
      content_hash: fixture.definition.content_hash,
    };
    turn.context.definition_family = fixture.definition.definition_family;
    turn.context.basis.objective = {
      record_id: fixture.objective.objective_id,
      revision: fixture.objective.revision,
      content_hash: fixture.objective.content_hash,
    };
    const records = [
      { record: fixture.workUnit, id: fixture.workUnit.work_unit_id },
      { record: session, id: session.review_session_id },
      { record: hypothesis, id: hypothesis.hypothesis_id },
      { record: assessment, id: assessment.hypothesis_assessment_id },
      { record: posture, id: posture.posture_decision_id },
      { record: disposition, id: disposition.cycle_disposition_id },
    ];
    turn.context.records = records.map(({ record, id }, index) => ({
      key: `owned-${index}`,
      ref: {
        record_id: id,
        revision: record.revision,
        record_hash: copilotHash(record),
      },
      kind: record.schema_name.replace(/^petra\./u, ""),
      label: `Exact native ${record.schema_name}`,
      destination: `/projects/${fixture.project.project_id}/work`,
      text: "Known synthetic fixture record retained through its actual owner.",
    }));
    const { content_hash: ignored, ...context } = turn.context;
    void ignored;
    turn.context.content_hash = copilotHash(context);
    await repository.begin(turn);
    await repository.finish(turn, {
      state: "failed",
      finished_at: new Date().toISOString(),
      error: "Synthetic lineage test; no provider was invoked.",
    });
    const restarted = new PostgresCopilotTurnRepository(pool, options),
      retained = (await restarted.get(
        turn.project_id,
        turn.actor_id,
        turn.run_id,
      ))!,
      owned = (await restarted.ownership!.read(
        turn.project_id,
        turn.actor_id,
        turn.run_id,
      ))!;
    assertConversationOwnerBinding(retained, owned.binding, owned.records);
    expect(
      owned.binding.lineage.inquiries.map((ref) => ref.record_id),
    ).toContain(fixture.objective.objective_id);
    expect(owned.binding.lineage.work).toHaveLength(2);
    expect(owned.binding.lineage.reviews.map((ref) => ref.record_id)).toEqual([
      session.review_session_id,
    ]);
    expect(owned.binding.lineage.cycles.map((ref) => ref.record_id)).toEqual(
      records.slice(2).map((item) => item.id),
    );
    await restarted.get(turn.project_id, turn.actor_id, turn.run_id);
    expect(
      (
        await pool.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM petra.work_units",
        )
      ).rows[0]!.count,
    ).toBe(2);
  });

  it("persists two exact scoped examination revisions, preserves earlier cycle records, and forbids immutable mutation", async () => {
    const fixture = await setupAuthority();
    const root = candidate(fixture);
    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });
    const seal = <T extends { content: unknown; content_hash: string }>(
      record: T,
    ): T => {
      record.content_hash = canonicalHash(record.content);
      return record;
    };
    const graph = (await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    ))!;
    const hypothesis = readFixture<PetraHypothesis>("hypothesis");
    hypothesis.content.target_claim_ref = graph.content.nodes[0]!.record_ref;
    seal(hypothesis);
    const assessment = readFixture<PetraHypothesisAssessment>(
      "hypothesis-assessment",
    );
    assessment.content.subject_ref = examinationRecordRef(hypothesis);
    assessment.content.target_claim_ref = hypothesis.content.target_claim_ref;
    assessment.content.basis = {
      definition_ref: graph.content.definition_ref,
      objective_ref: graph.content.objective_ref ?? null,
      graph_content_hash: graph.content_hash,
      event_position: graph.content.authority.event_position,
      stream_revision: graph.content.authority.stream_revision,
      query_kind: "current_registered_working_heads",
    };
    assessment.content.review_state = "reviewed";
    seal(assessment);
    const kernel = new HypothesisExaminationKernel({
      profile_ref: assessment.content.profile_ref,
      policy_ref: assessment.content.policy_ref,
      criteria: new Map(),
      finding_types: new Map(),
      obligation_types: new Map(),
      allowed_dispositions: ["insufficient", "deferred", "further_cycle"],
    });
    const repository = new PostgresProjectExaminationRepository(
      pool,
      semanticGraphs,
      () => kernel,
    );
    const concurrent = await Promise.all([
      repository.append(hypothesis),
      repository.append(structuredClone(hypothesis)),
    ]);
    expect(concurrent).toEqual([hypothesis, hypothesis]);
    await repository.append(assessment);
    const posture = readFixture<PetraPostureDecision>("posture-decision");
    posture.content.assessment_ref = examinationRecordRef(assessment);
    seal(posture);
    await repository.append(posture);
    const disposition = readFixture<PetraCycleDisposition>("cycle-disposition");
    disposition.content.assessment_ref = examinationRecordRef(assessment);
    disposition.content.posture_ref = examinationRecordRef(posture);
    disposition.content.basis = assessment.content.basis;
    disposition.content.unresolved_questions =
      assessment.content.material_unknowns;
    seal(disposition);
    await repository.append(disposition);
    expect(await repository.append(structuredClone(disposition))).toEqual(
      disposition,
    );
    expect(
      await repository.get(
        "project_01K4E000000000000000000099",
        hypothesis.hypothesis_id,
      ),
    ).toBeUndefined();
    await expect(
      pool.query(
        "UPDATE petra.project_examination_records SET payload=payload WHERE record_id=$1",
        [hypothesis.hypothesis_id],
      ),
    ).rejects.toThrow();
    await expect(
      repository.append(
        seal({
          ...hypothesis,
          content: {
            ...hypothesis.content,
            descriptor: "Changed immutable revision",
          },
        }),
      ),
    ).rejects.toThrow("immutable");
    const revised = correction(fixture, root);
    await working.admitWorkingCandidateRevision({
      candidate: revised.candidate,
      profileRecord: revised.claim,
    });
    const changed = (await semanticGraphs.getProjectSemanticGraph(
      fixture.project.project_id,
    ))!;
    expect(kernel.freshness(assessment, changed).state).toBe("invalidated");
    const nextHypothesis = structuredClone(hypothesis);
    nextHypothesis.revision = 2;
    nextHypothesis.content.target_claim_ref =
      changed.content.nodes[0]!.record_ref;
    seal(nextHypothesis);
    await repository.append(nextHypothesis);
    const next = structuredClone(assessment);
    next.revision = 2;
    next.content.subject_ref = examinationRecordRef(nextHypothesis);
    next.content.target_claim_ref = nextHypothesis.content.target_claim_ref;
    next.content.prior_assessment_ref = examinationRecordRef(assessment);
    next.content.basis.graph_content_hash = changed.content_hash;
    next.content.scope = revised.claim.scope;
    seal(next);
    await repository.append(next);
    const nextPosture = structuredClone(posture);
    nextPosture.revision = 2;
    nextPosture.content.assessment_ref = examinationRecordRef(next);
    seal(nextPosture);
    await repository.append(nextPosture);
    const nextDisposition = structuredClone(disposition);
    nextDisposition.revision = 2;
    nextDisposition.content.assessment_ref = examinationRecordRef(next);
    nextDisposition.content.posture_ref = examinationRecordRef(nextPosture);
    nextDisposition.content.basis = next.content.basis;
    nextDisposition.content.prior_disposition_ref =
      examinationRecordRef(disposition);
    seal(nextDisposition);
    await repository.append(nextDisposition);
    expect(
      (await repository.list(fixture.project.project_id)).records,
    ).toHaveLength(8);
    expect(
      await repository.get(
        fixture.project.project_id,
        assessment.hypothesis_assessment_id,
        1,
      ),
    ).toEqual(assessment);
    expect(
      (
        await repository.getSnapshot(
          fixture.project.project_id,
          graph.content_hash,
        )
      )?.content,
    ).toEqual(graph.content);
    expect(
      (
        await repository.getSnapshot(
          fixture.project.project_id,
          changed.content_hash,
        )
      )?.content.nodes[0]?.record_ref.revision,
    ).toBe(2);
    expect(
      await repository.getSnapshot(
        "project_01K4E000000000000000000099",
        graph.content_hash,
      ),
    ).toBeUndefined();
    expect(
      (
        await repository.get(
          fixture.project.project_id,
          assessment.hypothesis_assessment_id,
        )
      )?.revision,
    ).toBe(2);
    const unavailable = new PostgresProjectExaminationRepository(
      pool,
      semanticGraphs,
      () => undefined,
    );
    const unregistered = structuredClone(nextHypothesis);
    unregistered.revision = 3;
    seal(unregistered);
    await expect(unavailable.append(unregistered)).rejects.toThrow(
      "registered executable",
    );
  });

  it("admits the five registered scientific relationship meanings without promoting working state", async () => {
    const fixture = await setupAuthority();
    const root = candidate(fixture);
    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });

    const predicates = [
      "CITES",
      "SUPPORTS",
      "CONTRADICTS",
      "QUALIFIES",
      "ADOPTS",
    ] as const;
    for (const predicate of predicates) {
      const assertion = structuredClone(fixture.assertion);
      assertion.assertion_id = derivePetraId(
        "assertion",
        `working-relationship-meaning:${predicate}`,
      );
      assertion.subject_id = fixture.claim.claim_id;
      assertion.predicate = predicate;
      assertion.object = {
        object_kind: "entity",
        entity_id: fixture.claim.claim_id,
      };
      assertion.assertion_kind =
        predicate === "ADOPTS" ? "model_inference" : "source_stated";
      assertion.rationale = `The exact working fixture retains ${predicate} as its own registered meaning.`;
      if (predicate !== "CITES") {
        assertion.scope_comparison = {
          relation: "aligned",
          rationale:
            "Both endpoints use the same exact bounded scientific scope.",
        };
      }
      await evidence.proposeAssertion(assertion);

      const edge = relationship({ ...fixture, assertion }, root);
      edge.working_relationship_id = derivePetraId(
        "working_relationship",
        `working-relationship-meaning:${predicate}`,
      );
      edge.profile_relationship.predicate = predicate;
      edge.profile_relationship.relationship_record_ref = exactRef(
        assertion.schema_name,
        assertion.assertion_id,
        assertion.revision,
        assertion,
      );
      edge.endpoints.subject = {
        endpoint_kind: "profile_record",
        record_ref: exactRef(
          fixture.claim.schema_name,
          fixture.claim.claim_id,
          fixture.claim.revision,
          fixture.claim,
        ),
      };
      edge.validation.target_record_hash = canonicalHash(assertion);
      edge.content_hash = workingContentHash(edge);
      await expect(
        working.admitWorkingRelationshipRevision({
          relationship: edge,
          profileRecord: assertion,
        }),
      ).resolves.toEqual(edge);
    }

    const snapshot = await snapshots.getProjectWorkingStateSnapshot(
      fixture.project.project_id,
    );
    expect(
      snapshot?.content.relationships
        .map((entry) => entry.profile_relationship.predicate)
        .sort(),
    ).toEqual([...predicates].sort());
    expect(
      snapshot?.content.relationships.every(
        (entry) => entry.authority_boundary.domain_authority === false,
      ),
    ).toBe(true);
    expect(
      await pool.query("SELECT 1 FROM petra.domain_events"),
    ).toHaveProperty("rowCount", 0);
  });

  it("rejects a resealed stored working record whose nested provenance self-hash is stale", async () => {
    const fixture = await setupAuthority();
    const root = candidate(fixture);
    await working.admitWorkingCandidateRevision({
      candidate: root,
      profileRecord: fixture.claim,
    });
    const tampered = structuredClone(root);
    tampered.provenance[0].statement =
      "Tampered provenance that was not included in the retained content hash.";
    await corruptStoredRecord(
      `UPDATE petra.working_candidate_revisions
          SET payload = $1::jsonb, record_hash = $2
        WHERE working_candidate_id = $3 AND revision = $4`,
      [
        JSON.stringify(tampered),
        canonicalHash(tampered),
        root.working_candidate_id,
        root.revision,
      ],
    );

    await expect(
      snapshots.getProjectWorkingStateSnapshot(fixture.project.project_id),
    ).rejects.toMatchObject({
      code: "PROJECT_WORKING_STATE_STORED_RECORD_CORRUPT",
    });
  });

  it("admits exact controlled-writing Requirement and GOVERNS records without adding authority or reusing evidence semantics", async () => {
    const scientific = await setupAuthority();
    const modelActor = actor(
      "actor_01K4D000000000000000000010",
      "model",
      "Registered evidence model",
    );
    await scopes.registerActor(modelActor);

    const modelClaim = structuredClone(scientific.claim);
    modelClaim.claim_id = "claim_01K4D000000000000000000016";
    modelClaim.canonical_text =
      "The model extracted the study's reported measurable improvement.";
    if (modelClaim.basis.basis_kind !== "source") {
      throw new Error("Expected a source-derived Claim fixture.");
    }
    modelClaim.basis.derivation = {
      derivation_kind: "model_extraction",
      derivation_ref: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD5",
    };
    modelClaim.basis.proposed_by = {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
    };
    modelClaim.basis.proposed_at = "2026-09-02T18:31:00.004Z";
    modelClaim.created_by = structuredClone(modelClaim.basis.proposed_by);
    modelClaim.created_at = "2026-09-02T18:31:00.004Z";
    await evidence.proposeClaim(modelClaim);

    const context = readFixture<PetraContextPacket>("context-packet");
    context.snapshot_ref.event_position = 1;
    context.compiled_by = {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
    };
    const contextClaimRef = {
      object_kind: "claim" as const,
      object_id: modelClaim.claim_id,
      object_revision: modelClaim.revision,
      object_hash: canonicalHash(modelClaim),
    };
    context.content.objective.target_refs = [contextClaimRef];
    const includedClaim = context.content.included_objects[0];
    if (includedClaim === undefined) {
      throw new Error("Expected one ContextPacket included object.");
    }
    includedClaim.object_ref = contextClaimRef;
    includedClaim.authority = structuredClone(modelClaim.authority);
    context.content.included_objects = [includedClaim];
    context.content.budget.included_object_count = 1;
    context.content.budget.included_source_span_count = 1;
    context.content_hash = canonicalHash(context.content);
    await pool.query(
      "UPDATE petra.authority_positions SET event_position = 1 WHERE singleton",
    );
    await pool.query(
      `INSERT INTO petra.context_packets (
         context_packet_id, revision, project_id, snapshot_id,
         snapshot_revision, snapshot_event_position, snapshot_hash,
         content_hash, compiled_by_actor_id, compiled_by_actor_kind,
         compiled_at, record_hash, payload
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11::timestamptz, $12, $13::jsonb
       )`,
      [
        context.context_packet_id,
        context.revision,
        context.project_id,
        context.snapshot_ref.snapshot_id,
        context.snapshot_ref.snapshot_revision,
        context.snapshot_ref.event_position,
        context.snapshot_ref.content_hash,
        context.content_hash,
        context.compiled_by.actor_id,
        context.compiled_by.actor_kind,
        context.compiled_at,
        canonicalHash(context),
        JSON.stringify(context),
      ],
    );

    const modelRequest = readFixture<PetraModelRequest>("model-request");
    modelRequest.content.context_packet_ref.content_hash = context.content_hash;
    modelRequest.content_hash = canonicalHash(modelRequest.content);
    const modelCall = readFixture<PetraModelCall>("model-call");
    modelCall.content.input.context_packet_ref.content_hash =
      context.content_hash;
    modelCall.content_hash = canonicalHash(modelCall.content);
    const proposal = modelProposal(modelClaim, context.content_hash);
    await modelExecutions.registerCertification(
      readFixture<PetraModelRoleCertification>("model-role-certification"),
    );
    await modelExecutions.persistExecution({
      request: modelRequest,
      calls: [modelCall],
      proposal_bundle: proposal,
    });

    const modelCandidate = candidate(scientific);
    modelCandidate.working_candidate_id =
      "working_candidate_01K4D000000000000000000017";
    modelCandidate.profile_object.object_record_ref = exactRef(
      modelClaim.schema_name,
      modelClaim.claim_id,
      modelClaim.revision,
      modelClaim,
    );
    const modelRole = scientific.definition.content.registrations.find(
      (entry) => entry.registration_kind === "model_role",
    );
    if (modelRole === undefined) {
      throw new Error("Expected the scientific model-role registration.");
    }
    modelCandidate.producer = {
      producer_kind: "model",
      actor: {
        actor_id: modelActor.actor_id,
        actor_kind: "model",
      },
      contribution_kind: "model_output",
      model_role_ref: structuredClone(modelRole.contract),
      model_call_ref: exactRef(
        modelCall.schema_name,
        modelCall.model_call_id,
        modelCall.revision,
        modelCall,
      ),
    };
    modelCandidate.input_snapshot = {
      snapshot_ref: {
        snapshot_id: context.snapshot_ref.snapshot_id,
        revision: context.snapshot_ref.snapshot_revision,
        event_position: context.snapshot_ref.event_position,
        content_hash: context.snapshot_ref.content_hash,
      },
      context_packet_ref: exactRef(
        context.schema_name,
        context.context_packet_id,
        context.revision,
        context,
      ),
      input_record_refs: [
        exactRef(
          proposal.schema_name,
          proposal.evidence_proposal_bundle_id,
          proposal.revision,
          proposal,
        ),
      ],
    };
    modelCandidate.origin = {
      origin_kind: "extraction",
      source_record_refs: structuredClone(
        modelCandidate.input_snapshot.input_record_refs,
      ),
      summary:
        "The registered evidence model produced this exact scientific candidate.",
    };
    modelCandidate.basis = [
      {
        basis_role: "source",
        record_ref: exactRef(
          scientific.span.schema_name,
          scientific.span.source_span_id,
          scientific.span.revision,
          scientific.span,
        ),
        summary: "The exact SourceSpan is the model candidate's basis.",
      },
    ];
    modelCandidate.provenance = [
      {
        provenance_role: "model_call",
        record_ref: structuredClone(modelCandidate.producer.model_call_ref),
        statement: "The exact ModelCall remains producer provenance.",
      },
    ];
    modelCandidate.validation.target_record_hash = canonicalHash(modelClaim);
    modelCandidate.created_by = {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
    };
    modelCandidate.created_at = "2026-09-02T18:31:00.004Z";
    modelCandidate.recorded_at = "2026-09-13T14:01:00.000Z";
    modelCandidate.content_hash = workingContentHash(modelCandidate);
    await working.admitWorkingCandidateRevision({
      candidate: modelCandidate,
      profileRecord: modelClaim,
    });

    const project = readFixture<PetraProject>("project-controlled-writing");
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-controlled-writing",
    );
    const objective = readFixture<PetraProjectObjective>(
      "project-objective-controlled-writing",
    );
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);
    await definitions.registerObjectiveRevision(objective);

    const projectSource = readFixture<PetraProjectSource>("project-source");
    projectSource.project_source_id =
      "project_source_01K4E000000000000000000006";
    projectSource.project_id = project.project_id;
    projectSource.content.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
    };
    projectSource.content.source_role = "writing.authority-source";
    projectSource.content.artifact_manifest_ref.record_hash = canonicalHash(
      sourceArtifactInput().manifest,
    );
    projectSource.content_hash = canonicalHash(projectSource.content);
    await projectSources.registerProjectSourceRevision(projectSource);

    const inputManifest = readFixture<PetraWorkerInputManifest>(
      "worker-input-manifest",
    );
    inputManifest.worker_input_manifest_id =
      "worker_input_manifest_01K4E000000000000000000009";
    inputManifest.work_unit_id = "work_unit_01K4E000000000000000000010";
    inputManifest.project_id = project.project_id;
    inputManifest.issued_by = {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
    };
    inputManifest.content.task = {
      task_family: "reasoning",
      task_name: "petra.writing.requirement-proposal",
      task_version: "1.0.0",
    };
    inputManifest.content.worker = {
      executor_kind: "typescript_worker",
      worker_name: "petra.writing",
      worker_version: "1.0.0",
      runtime_name: "node",
      runtime_version: "24.20.0",
      entrypoint: "petra.writing.propose-requirement",
    };
    inputManifest.content.inputs = [
      {
        binding_kind: "record",
        name: "authority_source",
        record_id: projectSource.project_source_id,
        record_revision: projectSource.revision,
        snapshot_hash: canonicalHash(projectSource),
      },
    ];
    inputManifest.content.expected_outputs = [
      {
        output_name: "requirement_proposal",
        output_role: "proposal",
        required: true,
        media_type: "application/json",
        max_bytes: 100_000,
        contract: {
          schema_name: "petra.controlled-writing-requirement",
          schema_version: "1.0.0",
          schema_hash:
            "sha256:5a6d449b44078f2df1c2f29fe15164d22b0c4151a05c6f35dd8718964c3c3f1e",
        },
      },
    ];
    inputManifest.content_hash = canonicalHash(inputManifest.content);
    const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
    workUnit.work_unit_id = inputManifest.work_unit_id;
    workUnit.project_id = project.project_id;
    workUnit.spec.workflow_name = "petra.writing.requirement-proposal";
    workUnit.spec.workflow_version = "1.0.0";
    workUnit.spec.objective =
      "Propose one non-authoritative Requirement from the exact registered authority source.";
    workUnit.spec.input_manifest_ref.worker_input_manifest_id =
      inputManifest.worker_input_manifest_id;
    workUnit.spec.input_manifest_ref.content_hash = inputManifest.content_hash;
    workUnit.spec.idempotency_key =
      "writing:requirement-proposal:authority-source-006:v1";
    if (workUnit.spec.cache.cache_mode === "disabled") {
      throw new Error("Expected a reusable WorkUnit cache fixture.");
    }
    workUnit.spec.cache.cache_key =
      "writing:requirement-proposal:authority-source-006:v1";
    workUnit.spec_hash = canonicalHash(workUnit.spec);
    workUnit.created_by = structuredClone(inputManifest.issued_by);
    const registeredWorkUnit = await workUnits.register({
      workUnit,
      inputManifest,
    });

    const requirement = readFixture<PetraControlledWritingRequirement>(
      "controlled-writing-requirement",
    );
    const sourceRef = exactRef(
      projectSource.schema_name,
      projectSource.project_source_id,
      projectSource.revision,
      projectSource,
    );
    const requirementRef = exactRef(
      requirement.schema_name,
      requirement.requirement_id,
      requirement.revision,
      requirement,
    );
    const governing = readFixture<PetraControlledWritingGoverningRelationship>(
      "controlled-writing-governing-relationship",
    );
    governing.content.authority_source_ref = structuredClone(sourceRef);
    governing.content.requirement_ref = structuredClone(requirementRef);
    governing.content_hash = canonicalHash(governing.content);

    const candidateRecord =
      readFixture<PetraWorkingCandidate>("working-candidate");
    candidateRecord.working_candidate_id =
      "working_candidate_01K4E000000000000000000007";
    candidateRecord.project_id = project.project_id;
    candidateRecord.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    };
    candidateRecord.profile_object = {
      registration: structuredClone(
        definition.content.registrations.find(
          (entry) => entry.semantic_key === "writing.requirement",
        )!,
      ) as PetraWorkingCandidate["profile_object"]["registration"],
      object_record_ref: structuredClone(requirementRef),
      candidate_operation: "create",
    };
    candidateRecord.producer = {
      producer_kind: "human",
      actor: {
        actor_id: requirement.created_by.actor_id,
        actor_kind: "human",
      },
      contribution_kind: "direct_edit",
    };
    candidateRecord.task_context = {
      task_kind: "work_unit",
      objective_ref: exactRef(
        objective.schema_name,
        objective.objective_id,
        objective.revision,
        objective,
      ),
      work_unit_ref: exactRef(
        registeredWorkUnit.schema_name,
        registeredWorkUnit.work_unit_id,
        registeredWorkUnit.revision,
        registeredWorkUnit,
      ),
    };
    candidateRecord.input_snapshot = {
      snapshot_ref: {
        snapshot_id: "snapshot_01K4E000000000000000000011",
        revision: 1,
        event_position: 0,
        content_hash: `sha256:${"1".repeat(64)}`,
      },
      input_record_refs: [sourceRef],
    };
    candidateRecord.origin = {
      origin_kind: "direct_edit",
      source_record_refs: [sourceRef],
      summary:
        "The human author proposed this Requirement from the exact authority source.",
    };
    candidateRecord.basis = [
      {
        basis_role: "source",
        record_ref: sourceRef,
        summary: "The exact ProjectSource is the Requirement basis.",
      },
    ];
    candidateRecord.provenance = [
      {
        provenance_role: "input",
        record_ref: sourceRef,
        statement: "The authority-source revision remains exact provenance.",
      },
    ];
    candidateRecord.qualifications = {
      assessment_state: "none_recorded",
      statements: [],
    };
    candidateRecord.validation = {
      state: "pending",
      target_record_hash: canonicalHash(requirement),
      results: [],
    };
    candidateRecord.lineage = { lineage_kind: "root" };
    candidateRecord.created_by = structuredClone(requirement.created_by);
    candidateRecord.created_at = requirement.created_at;
    candidateRecord.recorded_at = "2026-09-13T14:02:00.000Z";
    candidateRecord.content_hash = workingContentHash(candidateRecord);

    const governingRef = exactRef(
      governing.schema_name,
      governing.governing_relationship_id,
      governing.revision,
      governing,
    );
    const relationshipRecord = readFixture<PetraWorkingRelationship>(
      "working-relationship",
    );
    relationshipRecord.working_relationship_id =
      "working_relationship_01K4E000000000000000000008";
    relationshipRecord.project_id = project.project_id;
    relationshipRecord.project_definition_ref = structuredClone(
      candidateRecord.project_definition_ref,
    );
    relationshipRecord.profile_relationship = {
      registration: structuredClone(
        definition.content.registrations.find(
          (entry) => entry.semantic_key === "writing.governs",
        )!,
      ) as PetraWorkingRelationship["profile_relationship"]["registration"],
      predicate: "GOVERNS",
      relationship_record_ref: governingRef,
      candidate_operation: "create",
    };
    relationshipRecord.endpoints = {
      subject: {
        endpoint_kind: "profile_record",
        record_ref: sourceRef,
      },
      object: {
        endpoint_kind: "working_candidate",
        candidate_ref: {
          working_candidate_id: candidateRecord.working_candidate_id,
          revision: candidateRecord.revision,
          content_hash: candidateRecord.content_hash,
        },
      },
    };
    relationshipRecord.producer = structuredClone(candidateRecord.producer);
    relationshipRecord.task_context = structuredClone(
      candidateRecord.task_context,
    );
    relationshipRecord.input_snapshot = structuredClone(
      candidateRecord.input_snapshot,
    );
    relationshipRecord.origin = structuredClone(candidateRecord.origin);
    relationshipRecord.basis = structuredClone(candidateRecord.basis);
    relationshipRecord.provenance = structuredClone(candidateRecord.provenance);
    relationshipRecord.qualifications = structuredClone(
      candidateRecord.qualifications,
    );
    relationshipRecord.validation = {
      state: "pending",
      target_record_hash: canonicalHash(governing),
      results: [],
    };
    relationshipRecord.lineage = { lineage_kind: "root" };
    relationshipRecord.created_by = structuredClone(governing.created_by);
    relationshipRecord.created_at = governing.created_at;
    relationshipRecord.recorded_at = "2026-09-13T14:03:00.000Z";
    relationshipRecord.content_hash = workingContentHash(relationshipRecord);

    expect(
      await working.admitWorkingCandidateRevision({
        candidate: candidateRecord,
        profileRecord: requirement,
      }),
    ).toEqual(candidateRecord);
    expect(
      await working.admitWorkingCandidateRevision({
        candidate: structuredClone(candidateRecord),
        profileRecord: structuredClone(requirement),
      }),
    ).toEqual(candidateRecord);
    expect(
      await working.admitWorkingRelationshipRevision({
        relationship: relationshipRecord,
        profileRecord: governing,
      }),
    ).toEqual(relationshipRecord);

    const nativeGraph = await semanticGraphs.getProjectSemanticGraph(
      project.project_id,
    );
    expect(nativeGraph?.content.definition_family).toBe(
      "petra.controlled-writing",
    );
    expect(
      nativeGraph?.content.nodes.find((node) => node.layer === "working")
        ?.native_record,
    ).toEqual(requirement);
    expect(nativeGraph?.content.relationships[0]?.predicate).toBe("GOVERNS");
    expect(
      nativeGraph?.content.nodes.find((node) => node.layer === "working")
        ?.remote_context?.permitted,
    ).toBe(false);

    const authoritySnapshot = async (projectId: string) => {
      const result = await pool.query<{
        event_position: string;
        stream_revision: string;
      }>(
        `SELECT authority.event_position::text,
                COALESCE(stream.current_stream_revision, 0)::text AS stream_revision
           FROM petra.authority_positions AS authority
           LEFT JOIN petra.project_event_stream_heads AS stream
             ON stream.project_id = $1
          WHERE authority.singleton`,
        [projectId],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error("Expected authority position.");
      return {
        event_position: Number(row.event_position),
        stream_revision: Number(row.stream_revision),
        captured_at: "2026-09-13T14:04:00.000Z",
      };
    };
    const controlledSession = readFixture<PetraReviewSessionV110>(
      "review-session-working-candidate",
    );
    controlledSession.review_session_id =
      "review_session_01K4E000000000000000000023";
    controlledSession.project_id = project.project_id;
    controlledSession.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
    };
    controlledSession.content.title =
      "Review the controlled-writing Requirement";
    controlledSession.content.objective_summary =
      "Inspect the exact Requirement and governing relationship without implying a writing Apply path.";
    controlledSession.content.objective_ref = {
      objective_id: objective.objective_id,
      revision: objective.revision,
      content_hash: objective.content_hash,
    };
    controlledSession.content.snapshot = await authoritySnapshot(
      project.project_id,
    );
    controlledSession.content.origin = {
      origin_kind: "direct_edit",
      record_refs: [registeredWorkUnit.work_unit_id],
      summary:
        "Opened from the exact human-authored controlled-writing working records.",
    };
    controlledSession.content.return_context = {
      place: "work",
      object_ref: registeredWorkUnit.work_unit_id,
      label: "Requirement proposal work",
    };
    controlledSession.content.members = [
      {
        review_member_id: "review_member_01K4E000000000000000000024",
        member_role: "ordinary",
        working_state: {
          candidate_ref: {
            working_candidate_id: candidateRecord.working_candidate_id,
            revision: candidateRecord.revision,
            content_hash: candidateRecord.content_hash,
          },
          relationship_refs: [
            {
              working_relationship_id:
                relationshipRecord.working_relationship_id,
              revision: relationshipRecord.revision,
              content_hash: relationshipRecord.content_hash,
            },
          ],
        },
        candidate_bindings: [
          {
            semantic_key:
              candidateRecord.profile_object.registration.semantic_key,
            binding_role: "candidate",
            record_ref: {
              record_id: requirement.requirement_id,
              revision: requirement.revision,
              record_hash: canonicalHash(requirement),
            },
          },
          {
            semantic_key:
              relationshipRecord.profile_relationship.registration.semantic_key,
            binding_role: "relationship",
            record_ref: {
              record_id: governing.governing_relationship_id,
              revision: governing.revision,
              record_hash: canonicalHash(governing),
            },
          },
        ],
      },
    ];
    controlledSession.content_hash = canonicalHash(controlledSession.content);
    controlledSession.created_at = "2026-09-13T14:05:00.000Z";
    controlledSession.updated_at = controlledSession.created_at;

    await reviewSessions.registerReviewSessionRevision(controlledSession);
    await reviewSessions.registerReviewSessionRevision(
      structuredClone(controlledSession),
    );
    const controlledDirectReview = await reviewViews.getProjectReviewView(
      project.project_id,
      controlledSession.review_session_id,
    );
    const controlledModelMediatedReview =
      await new PostgresProjectReviewViewReader(pool).getProjectReviewView(
        project.project_id,
        controlledSession.review_session_id,
      );
    expect(controlledDirectReview?.schema_version).toBe("1.3.0");
    if (controlledDirectReview?.schema_version !== "1.3.0") {
      throw new Error("Expected the controlled-writing Review view contract.");
    }
    expect(controlledDirectReview.content.members[0]).toMatchObject({
      outcome: "awaiting_decision",
      candidate: {
        kind_label: "Requirement and governing link",
        current:
          "No authoritative controlled-writing representation is installed",
        proposed: requirement.content.statement,
        profile_payload: {
          payload_kind: "controlled_writing_requirement",
          requirement_ref: requirementRef,
          governing_relationship_ref: governingRef,
          authority_source_ref: sourceRef,
          requirement_kind: "constraint",
          relationship_predicate: "GOVERNS",
          apply_available: false,
        },
      },
      validation: { state: "needs_judgment" },
      working_state: {
        candidate: candidateRecord,
        relationships: [relationshipRecord],
        selection_basis: "exact_review_session_working_bindings",
        authority_effect: "none",
      },
      change_sets: [],
    });
    expect(controlledDirectReview.content.members[0]?.consequences).toContain(
      "No controlled-writing ChangeSet operation, Approval, or Apply path is installed.",
    );
    expect(controlledDirectReview.content).toEqual(
      controlledModelMediatedReview?.content,
    );
    expect(controlledDirectReview.content_hash).toBe(
      controlledModelMediatedReview?.content_hash,
    );
    expect(
      controlledDirectReview.content.members[0]?.candidate.profile_payload
        .payload_kind,
    ).not.toBe("scientific_evidence_pair");

    const mismatchedRecord = structuredClone(controlledSession);
    mismatchedRecord.review_session_id =
      "review_session_01K4E000000000000000000025";
    mismatchedRecord.content.members[0].review_member_id =
      "review_member_01K4E000000000000000000026";
    const mismatchedGoverningBinding =
      mismatchedRecord.content.members[0].candidate_bindings[1];
    if (mismatchedGoverningBinding === undefined) {
      throw new Error("Expected the controlled-writing relationship binding.");
    }
    mismatchedGoverningBinding.record_ref.record_hash = `sha256:${"f".repeat(64)}`;
    mismatchedRecord.content_hash = canonicalHash(mismatchedRecord.content);
    await expect(
      reviewSessions.registerReviewSessionRevision(mismatchedRecord),
    ).rejects.toMatchObject({ code: "REVIEW_SESSION_RELATION_INVALID" });
    expect(
      await reviewSessions.getReviewSession(
        project.project_id,
        mismatchedRecord.review_session_id,
      ),
    ).toBeUndefined();

    const crossProfile = structuredClone(controlledSession);
    crossProfile.review_session_id =
      "review_session_01K4E000000000000000000027";
    crossProfile.content.members[0].review_member_id =
      "review_member_01K4E000000000000000000028";
    crossProfile.content.members[0].candidate_bindings[0] = {
      semantic_key: "scientific.claim",
      binding_role: "candidate",
      record_ref: {
        record_id: modelClaim.claim_id,
        revision: modelClaim.revision,
        record_hash: canonicalHash(modelClaim),
      },
    };
    crossProfile.content_hash = canonicalHash(crossProfile.content);
    await expect(
      reviewSessions.registerReviewSessionRevision(crossProfile),
    ).rejects.toMatchObject({ code: "REVIEW_SESSION_RELATION_INVALID" });
    expect(
      await reviewSessions.getReviewSession(
        project.project_id,
        crossProfile.review_session_id,
      ),
    ).toBeUndefined();

    const unsupportedProfile = structuredClone(controlledSession);
    unsupportedProfile.review_session_id =
      "review_session_01K4E000000000000000000029";
    unsupportedProfile.content.members[0].review_member_id =
      "review_member_01K4E000000000000000000030";
    unsupportedProfile.content.members[0].candidate_bindings[0].record_ref.record_id =
      "draft_01K4E000000000000000000031";
    unsupportedProfile.content_hash = canonicalHash(unsupportedProfile.content);
    await expect(
      reviewSessions.registerReviewSessionRevision(unsupportedProfile),
    ).rejects.toMatchObject({ code: "REVIEW_SESSION_BINDING_UNSUPPORTED" });
    expect(
      await reviewSessions.getReviewSession(
        project.project_id,
        unsupportedProfile.review_session_id,
      ),
    ).toBeUndefined();
    expect(
      await working.getWorkingCandidate(
        project.project_id,
        candidateRecord.working_candidate_id,
      ),
    ).toEqual(candidateRecord);
    expect(
      await working.getWorkingRelationship(
        project.project_id,
        relationshipRecord.working_relationship_id,
      ),
    ).toEqual(relationshipRecord);

    const controlledPayloads = await pool.query<{ payload: unknown }>(
      `SELECT payload
         FROM (
           SELECT 1 AS position, payload
             FROM petra.controlled_writing_requirement_records
            WHERE requirement_id = $1 AND revision = $2
           UNION ALL
           SELECT 2 AS position, payload
             FROM petra.controlled_writing_governing_relationship_records
            WHERE governing_relationship_id = $3 AND revision = $4
         ) AS controlled
        ORDER BY position`,
      [
        requirement.requirement_id,
        requirement.revision,
        governing.governing_relationship_id,
        governing.revision,
      ],
    );
    expect(controlledPayloads.rows.map((row) => row.payload)).toEqual([
      requirement,
      governing,
    ]);

    const directRead = await snapshots.getProjectWorkingStateSnapshot(
      project.project_id,
    );
    const modelMediatedRead = await snapshots.getProjectWorkingStateSnapshot(
      project.project_id,
    );
    expect(directRead?.content).toEqual(modelMediatedRead?.content);
    expect(directRead?.content_hash).toBe(modelMediatedRead?.content_hash);
    expect(directRead?.content.candidates).toEqual([candidateRecord]);
    expect(directRead?.content.relationships).toEqual([relationshipRecord]);
    expect(directRead?.content.candidates[0]?.producer.producer_kind).toBe(
      "human",
    );
    const scientificDirect = await snapshots.getProjectWorkingStateSnapshot(
      scientific.project.project_id,
    );
    const scientificModelMediated =
      await snapshots.getProjectWorkingStateSnapshot(
        scientific.project.project_id,
      );
    expect(scientificDirect?.content).toEqual(scientificModelMediated?.content);
    expect(scientificDirect?.content_hash).toBe(
      scientificModelMediated?.content_hash,
    );
    expect(scientificDirect?.content.candidates).toEqual([modelCandidate]);
    expect(scientificDirect?.content.candidates[0]?.producer).toEqual(
      modelCandidate.producer,
    );
    expect(
      scientificDirect?.content.candidates[0]?.producer.actor.actor_id,
    ).not.toBe(directRead?.content.candidates[0]?.producer.actor.actor_id);
    expect(directRead?.content.selection_boundary).toEqual({
      selection_kind: "current_working_heads",
      historical_working_revisions_included: false,
      authoritative_records_included: false,
      graph_overlay_composed: false,
    });

    const unsupported = structuredClone(candidateRecord);
    unsupported.working_candidate_id =
      "working_candidate_01K4E000000000000000000012";
    unsupported.profile_object.registration.contract.content_hash = `sha256:${"0".repeat(64)}`;
    unsupported.content_hash = workingContentHash(unsupported);
    await expectWorkingCode(
      () =>
        working.admitWorkingCandidateRevision({
          candidate: unsupported,
          profileRecord: requirement,
        }),
      "WORKING_STATE_PROFILE_UNSUPPORTED",
    );

    const staleDefinition = structuredClone(candidateRecord);
    staleDefinition.working_candidate_id =
      "working_candidate_01K4E000000000000000000018";
    staleDefinition.project_definition_ref.content_hash = `sha256:${"0".repeat(64)}`;
    staleDefinition.content_hash = workingContentHash(staleDefinition);
    await expectWorkingCode(
      () =>
        working.admitWorkingCandidateRevision({
          candidate: staleDefinition,
          profileRecord: requirement,
        }),
      "WORKING_STATE_STALE",
    );

    const unknownProducer = structuredClone(candidateRecord);
    unknownProducer.working_candidate_id =
      "working_candidate_01K4E000000000000000000019";
    unknownProducer.producer.actor.actor_id =
      "actor_01K4E000000000000000000099";
    unknownProducer.content_hash = workingContentHash(unknownProducer);
    await expectWorkingCode(
      () =>
        working.admitWorkingCandidateRevision({
          candidate: unknownProducer,
          profileRecord: requirement,
        }),
      "WORKING_STATE_REFERENCE_MISSING",
    );

    const mismatchedGoverning = structuredClone(governing);
    mismatchedGoverning.governing_relationship_id =
      "governing_relationship_01K4E000000000000000000013";
    mismatchedGoverning.content.authority_source_ref.record_hash = `sha256:${"9".repeat(64)}`;
    mismatchedGoverning.content_hash = canonicalHash(
      mismatchedGoverning.content,
    );
    const mismatchedRelationship = structuredClone(relationshipRecord);
    mismatchedRelationship.working_relationship_id =
      "working_relationship_01K4E000000000000000000013";
    mismatchedRelationship.profile_relationship.relationship_record_ref =
      exactRef(
        mismatchedGoverning.schema_name,
        mismatchedGoverning.governing_relationship_id,
        mismatchedGoverning.revision,
        mismatchedGoverning,
      );
    mismatchedRelationship.validation.target_record_hash =
      canonicalHash(mismatchedGoverning);
    mismatchedRelationship.content_hash = workingContentHash(
      mismatchedRelationship,
    );
    await expectWorkingCode(
      () =>
        working.admitWorkingRelationshipRevision({
          relationship: mismatchedRelationship,
          profileRecord: mismatchedGoverning,
        }),
      "WORKING_STATE_REFERENCE_MISSING",
    );

    const wrongSourceType = structuredClone(governing);
    wrongSourceType.governing_relationship_id =
      "governing_relationship_01K4E000000000000000000020";
    wrongSourceType.content.authority_source_ref = structuredClone(
      wrongSourceType.content.requirement_ref,
    );
    wrongSourceType.content_hash = canonicalHash(wrongSourceType.content);
    const wrongSourceRelationship = structuredClone(relationshipRecord);
    wrongSourceRelationship.working_relationship_id =
      "working_relationship_01K4E000000000000000000020";
    wrongSourceRelationship.profile_relationship.relationship_record_ref =
      exactRef(
        wrongSourceType.schema_name,
        wrongSourceType.governing_relationship_id,
        wrongSourceType.revision,
        wrongSourceType,
      );
    wrongSourceRelationship.endpoints.subject = {
      endpoint_kind: "profile_record",
      record_ref: structuredClone(wrongSourceType.content.requirement_ref),
    };
    wrongSourceRelationship.validation.target_record_hash =
      canonicalHash(wrongSourceType);
    wrongSourceRelationship.content_hash = workingContentHash(
      wrongSourceRelationship,
    );
    await expectWorkingCode(
      () =>
        working.admitWorkingRelationshipRevision({
          relationship: wrongSourceRelationship,
          profileRecord: wrongSourceType,
        }),
      "WORKING_STATE_PROFILE_UNSUPPORTED",
    );

    const counts = await pool.query<{
      requirements: string;
      governing_relationships: string;
      working_candidates: string;
      working_relationships: string;
      evidence_rows: string;
      reviews: string;
      change_sets: string;
      approvals: string;
      commands: string;
      domain_events: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.controlled_writing_requirement_records)::text AS requirements,
         (SELECT count(*) FROM petra.controlled_writing_governing_relationship_records)::text AS governing_relationships,
         (SELECT count(*) FROM petra.working_candidate_revisions
           WHERE profile_record_schema_name = 'petra.controlled-writing-requirement')::text AS working_candidates,
         (SELECT count(*) FROM petra.working_relationship_revisions
           WHERE profile_record_schema_name = 'petra.controlled-writing-governing-relationship')::text AS working_relationships,
         (SELECT count(*) FROM petra.evidence_entity_revisions
           WHERE evidence_id IN ($1, $2))::text AS evidence_rows,
         (SELECT count(*) FROM petra.review_sessions
           WHERE project_id = $3)::text AS reviews,
         (SELECT count(*) FROM petra.change_sets
           WHERE project_id = $3)::text AS change_sets,
         (SELECT count(*) FROM petra.approvals
           WHERE change_set_id IN (
             SELECT change_set_id FROM petra.change_sets WHERE project_id = $3
           ))::text AS approvals,
         (SELECT count(*) FROM petra.command_executions
           WHERE project_id = $3)::text AS commands,
         (SELECT count(*) FROM petra.domain_events
           WHERE project_id = $3)::text AS domain_events`,
      [
        requirement.requirement_id,
        governing.governing_relationship_id,
        project.project_id,
      ],
    );
    expect(counts.rows[0]).toEqual({
      requirements: "1",
      governing_relationships: "1",
      working_candidates: "1",
      working_relationships: "1",
      evidence_rows: "0",
      reviews: "1",
      change_sets: "0",
      approvals: "0",
      commands: "0",
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
