import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraCapabilityGrantV130,
  PetraClaim,
  PetraCommandEnvelope,
  PetraCommandEnvelopeV140,
  PetraParsedDocument,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectObjective,
  PetraProjectSource,
  PetraProjectionCheckpoint,
  PetraReviewSession,
  PetraReviewSessionV110,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraWorkingCandidate,
  PetraWorkingRelationship,
  PetraWorkerInputManifest,
  PetraWorkUnit,
  PetraWorkVersion,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  PersistDocumentBundleInput,
  PersistVerifiedArtifactInput,
} from "@petra/core";
import type {
  ReviewSessionLifecycleAuthorityError,
  ReviewSessionLifecycleCommandEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
} from "../src/capability-grant-authority-repository.js";
import { PostgresChangeControlAuthorityRepository } from "../src/change-control-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresGraphProjectionAuthorityRepository } from "../src/graph-projection-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresProjectHistoryViewReader } from "../src/project-history-view-reader.js";
import { PostgresProjectReviewViewReader } from "../src/project-review-view-reader.js";
import { PostgresProjectSourceAuthorityRepository } from "../src/project-source-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import {
  PostgresReviewSessionAuthorityRepository,
  type PostgresReviewSessionError,
} from "../src/review-session-authority-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { PostgresWorkingStateAuthorityRepository } from "../src/working-state-authority-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
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

const workingContentHash = (value: { content_hash: string }): string => {
  const projection = structuredClone(value) as Record<string, unknown>;
  delete projection.content_hash;
  return canonicalHash(projection);
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
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const working = new PostgresWorkingStateAuthorityRepository(pool);
  const contracts = new PetraContractRegistry();
  const capabilities = new PostgresCapabilityGrantAuthorityRepository(
    pool,
    contracts,
  );
  const sessions = new PostgresReviewSessionAuthorityRepository(
    pool,
    contracts,
    new PostgresCapabilityGrantCommandAuthorizer(contracts),
    () => "2026-09-12T19:00:00.000Z",
  );
  const views = new PostgresProjectReviewViewReader(pool);
  const projections = new PostgresGraphProjectionAuthorityRepository(pool);
  const historyViews = new PostgresProjectHistoryViewReader(pool);
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

  const setupWorkingReview = async (): Promise<{
    project: PetraProject;
    session: PetraReviewSessionV110;
    candidate: PetraWorkingCandidate;
    relationship: PetraWorkingRelationship;
    actor: PetraActor;
  }> => {
    const { project } = await setupAuthority();
    const actor = readFixture<PetraActor>("actor");
    const serviceActor: PetraActor = {
      ...actor,
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
      display_name: "Petra worker",
    };
    await scopes.registerActor(serviceActor);

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
      actor_id: serviceActor.actor_id,
      actor_kind: "service",
    };
    const requested = readFixture<PetraWorkUnit>("work-unit-requested");
    requested.created_by = structuredClone(inputManifest.issued_by);
    const workUnit = await workUnits.register({
      workUnit: requested,
      inputManifest,
    });

    const claim = readFixture<PetraClaim>("claim");
    claim.created_by = { actor_id: actor.actor_id, actor_kind: "human" };
    if (claim.basis.basis_kind !== "source") {
      throw new Error("Expected source-grounded Claim fixture.");
    }
    claim.basis.proposed_by = structuredClone(claim.created_by);
    const assertion = readFixture<PetraAssertion>("assertion");
    assertion.created_by = structuredClone(claim.created_by);
    const sourceSpan = readFixture<PetraSourceSpan>("source-span");
    sourceSpan.created_by.actor_kind = "human";
    const sourceRef = exactRef(
      sourceSpan.schema_name,
      sourceSpan.source_span_id,
      sourceSpan.revision,
      sourceSpan,
    );
    const objectiveRef = exactRef(
      objective.schema_name,
      objective.objective_id,
      objective.revision,
      objective,
    );
    const workUnitRef = exactRef(
      workUnit.schema_name,
      workUnit.work_unit_id,
      workUnit.revision,
      workUnit,
    );

    const candidate = readFixture<PetraWorkingCandidate>("working-candidate");
    candidate.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      definition_family: definition.definition_family,
    };
    candidate.profile_object.object_record_ref = exactRef(
      claim.schema_name,
      claim.claim_id,
      claim.revision,
      claim,
    );
    candidate.producer = {
      producer_kind: "human",
      actor: { actor_id: actor.actor_id, actor_kind: "human" },
      contribution_kind: "direct_edit",
    };
    candidate.task_context = {
      task_kind: "work_unit",
      objective_ref: objectiveRef,
      work_unit_ref: workUnitRef,
    };
    candidate.input_snapshot = {
      snapshot_ref: {
        snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
        revision: 1,
        event_position: 0,
        content_hash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
      input_record_refs: [sourceRef],
    };
    candidate.origin = {
      origin_kind: "direct_edit",
      source_record_refs: [sourceRef],
      summary:
        "The Project author retained this task-sized working candidate for Review.",
    };
    candidate.basis = [
      {
        basis_role: "source",
        record_ref: sourceRef,
        summary: "The exact source span is the working basis.",
      },
    ];
    candidate.provenance = [
      {
        provenance_role: "input",
        record_ref: sourceRef,
        statement: "The exact source span remains input provenance.",
      },
    ];
    candidate.qualifications = {
      assessment_state: "none_recorded",
      statements: [],
    };
    candidate.validation.target_record_hash = canonicalHash(claim);
    for (const result of candidate.validation.results) {
      result.validated_by = { actor_id: actor.actor_id, actor_kind: "human" };
    }
    candidate.created_by = {
      actor_id: actor.actor_id,
      actor_kind: "human",
    };
    candidate.content_hash = workingContentHash(candidate);

    const relationship = readFixture<PetraWorkingRelationship>(
      "working-relationship",
    );
    relationship.project_definition_ref = structuredClone(
      candidate.project_definition_ref,
    );
    relationship.profile_relationship.relationship_record_ref = exactRef(
      assertion.schema_name,
      assertion.assertion_id,
      assertion.revision,
      assertion,
    );
    relationship.endpoints = {
      subject: {
        endpoint_kind: "profile_record",
        record_ref: exactRef(
          "petra.work-version",
          assertion.subject_id,
          1,
          readFixture<PetraWorkVersion>("work-version"),
        ),
      },
      object: {
        endpoint_kind: "working_candidate",
        candidate_ref: {
          working_candidate_id: candidate.working_candidate_id,
          revision: candidate.revision,
          content_hash: candidate.content_hash,
        },
      },
    };
    relationship.producer = structuredClone(candidate.producer);
    relationship.task_context = structuredClone(candidate.task_context);
    relationship.input_snapshot = structuredClone(candidate.input_snapshot);
    relationship.origin = {
      origin_kind: "direct_edit",
      source_record_refs: [sourceRef],
      summary:
        "The Project author retained the exact task-aligned ASSERTS relationship.",
    };
    relationship.basis = structuredClone(candidate.basis);
    relationship.provenance = structuredClone(candidate.provenance);
    relationship.qualifications = structuredClone(candidate.qualifications);
    relationship.validation.target_record_hash = canonicalHash(assertion);
    for (const result of relationship.validation.results) {
      result.validated_by = { actor_id: actor.actor_id, actor_kind: "human" };
    }
    relationship.created_by = structuredClone(candidate.created_by);
    relationship.content_hash = workingContentHash(relationship);

    await working.admitWorkingCandidateRevision({
      candidate,
      profileRecord: claim,
    });
    await working.admitWorkingRelationshipRevision({
      relationship,
      profileRecord: assertion,
    });

    const session = readFixture<PetraReviewSessionV110>(
      "review-session-working-candidate",
    );
    session.project_definition_ref = {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
    };
    session.content.objective_ref = {
      objective_id: objective.objective_id,
      revision: objective.revision,
      content_hash: objective.content_hash,
    };
    session.content.snapshot.event_position = 0;
    session.content.snapshot.stream_revision = 0;
    session.content.origin.record_refs = [workUnit.work_unit_id];
    session.content.return_context.object_ref = workUnit.work_unit_id;
    const member = session.content.members[0];
    if (member === undefined) throw new Error("Expected one Review member.");
    member.working_state = {
      candidate_ref: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
      relationship_refs: [
        {
          working_relationship_id: relationship.working_relationship_id,
          revision: relationship.revision,
          content_hash: relationship.content_hash,
        },
      ],
    };
    member.candidate_bindings[0].record_ref.record_hash = canonicalHash(claim);
    member.candidate_bindings[1]!.record_ref.record_hash =
      canonicalHash(assertion);
    session.content_hash = canonicalHash(session.content);
    return { project, session, candidate, relationship, actor };
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

  const registerLifecycleGrant = async (
    project: PetraProject,
    actor: PetraActor,
  ): Promise<PetraCapabilityGrantV130> => {
    const content: PetraCapabilityGrantV130["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["DeferReviewSession", "ReopenReviewSession"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason: "Allow the Project author to defer and reopen exact Reviews.",
    };
    const grant: PetraCapabilityGrantV130 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.3.0",
      capability_grant_id: "capability_grant_01K4D000000000000000000070",
      revision: 1,
      project_id: project.project_id,
      grantee: { actor_id: actor.actor_id, actor_kind: "human" },
      content,
      content_hash: canonicalHash(content),
      issued_by: { actor_id: actor.actor_id, actor_kind: "human" },
      issued_at: "2026-09-01T00:00:00.000Z",
    };
    await capabilities.registerCapabilityGrant(grant);
    return grant;
  };

  const lifecycleEnvelope = (
    session: PetraReviewSessionV110,
    grant: PetraCapabilityGrantV130,
    action: "defer" | "reopen",
    identity: string,
  ): ReviewSessionLifecycleCommandEnvelope => {
    const expectedLifecycle = action === "defer" ? "open" : "deferred";
    if (session.content.lifecycle !== expectedLifecycle) {
      throw new Error(
        `Expected ${expectedLifecycle} ReviewSession for ${action}.`,
      );
    }
    const base = {
      schema_name: "petra.command-envelope" as const,
      schema_version: "1.4.0" as const,
      command_id: `command_01K4D0000000000000000000${identity}`,
      idempotency_key: `review-session:001:${action}:${identity}`,
      project_id: session.project_id,
      actor: structuredClone(grant.grantee),
      capability_grant_id: grant.capability_grant_id,
      correlation_id: `trace_01K4D0000000000000000000${identity}`,
      submitted_at: "2026-09-12T18:59:59.000Z",
    };
    return (
      action === "defer"
        ? {
            ...base,
            command: {
              command_name: "DeferReviewSession" as const,
              expected_review_session_ref: {
                review_session_id: session.review_session_id,
                revision: session.revision,
                content_hash: session.content_hash,
                lifecycle: "open" as const,
              },
              rationale: "Decide after checking the material limitation.",
            },
          }
        : {
            ...base,
            command: {
              command_name: "ReopenReviewSession" as const,
              expected_review_session_ref: {
                review_session_id: session.review_session_id,
                revision: session.revision,
                content_hash: session.content_hash,
                lifecycle: "deferred" as const,
              },
            },
          }
    ) satisfies PetraCommandEnvelopeV140;
  };

  it("persists exact task-sized working membership and composes its non-authoritative Review roles", async () => {
    const { project, session, candidate, relationship } =
      await setupWorkingReview();

    expect(await sessions.registerReviewSessionRevision(session)).toEqual(
      session,
    );
    expect(
      await sessions.registerReviewSessionRevision(structuredClone(session)),
    ).toEqual(session);

    const view = await views.getProjectReviewView(
      project.project_id,
      session.review_session_id,
    );
    if (view?.schema_version !== "1.1.0") {
      throw new Error("Expected the working Review view contract.");
    }
    expect(view).toMatchObject({
      project_id: project.project_id,
      content: {
        session: {
          status: "needs_decision",
          snapshot_state: "current",
          return_context: {
            place: "work",
          },
        },
        members: [
          {
            member_role: "ordinary",
            outcome: "awaiting_decision",
            candidate: {
              current: "No accepted representation",
              proposed: "The study reports a measurable improvement.",
              origin_label: "Researcher",
            },
            working_state: {
              candidate: {
                working_candidate_id: candidate.working_candidate_id,
                authority_boundary: { domain_authority: false },
              },
              relationships: [
                {
                  working_relationship_id: relationship.working_relationship_id,
                  authority_boundary: { mutation_authority: false },
                },
              ],
              selection_basis: "exact_review_session_working_bindings",
              authority_effect: "none",
            },
            validation: { state: "passed" },
            change_sets: [],
          },
        ],
        projection: { state: "unavailable" },
      },
    });
    expect(view.content.members[0]?.validation.detail).toContain(
      "3 exact working checks passed",
    );
    expect(view.content.members[0]?.basis[0]).toMatchObject({
      project_source_status: "active",
      detail: "The study reports a measurable improvement.",
    });

    const counts = await pool.query<{
      sessions: string;
      candidate_bindings: string;
      relationship_bindings: string;
      domain_events: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.review_sessions)::text AS sessions,
         (SELECT count(*) FROM petra.review_session_working_candidate_bindings)::text
           AS candidate_bindings,
         (SELECT count(*) FROM petra.review_session_working_relationship_bindings)::text
           AS relationship_bindings,
         (SELECT count(*) FROM petra.domain_events)::text AS domain_events`,
    );
    expect(counts.rows[0]).toEqual({
      sessions: "1",
      candidate_bindings: "1",
      relationship_bindings: "1",
      domain_events: "0",
    });
  });

  it("defers and reopens one exact Review through authenticated idempotent commands without authority effects", async () => {
    const { project, session, actor } = await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerLifecycleGrant(project, actor);

    const directRevision = structuredClone(session);
    directRevision.revision = 2;
    directRevision.content.lifecycle = "deferred";
    directRevision.content_hash = canonicalHash(directRevision.content);
    directRevision.updated_at = "2026-09-12T18:30:00.000Z";
    await expect(
      sessions.registerReviewSessionRevision(directRevision),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PostgresReviewSessionError>>({
        code: "REVIEW_SESSION_LIFECYCLE_COMMAND_REQUIRED",
      }),
    );

    const defer = lifecycleEnvelope(session, grant, "defer", "71");
    const deferred = await sessions.executeReviewSessionLifecycleCommand(defer);
    expect(deferred).toMatchObject({
      applied: true,
      reviewSession: { revision: 2, content: { lifecycle: "deferred" } },
      receipt: {
        content: {
          transition: "deferred",
          rationale: "Decide after checking the material limitation.",
          authority_boundary: {
            review_decision: "none",
            domain_authority: "unchanged",
            change_set_authority: "none",
            validation_authority: "none",
            domain_event_effect: "none",
            projection_effect: "none",
          },
          recovery: { inverse_command_name: "ReopenReviewSession" },
        },
      },
    });
    expect(
      await sessions.getReviewSessionLifecycleReceipt(defer.command_id),
    ).toEqual(deferred.receipt);

    const replayEnvelope = structuredClone(defer);
    replayEnvelope.correlation_id = "trace_01K4D000000000000000000073";
    replayEnvelope.submitted_at = "2026-09-12T19:00:01.000Z";
    await expect(
      sessions.executeReviewSessionLifecycleCommand(replayEnvelope),
    ).resolves.toEqual({
      ...deferred,
      applied: false,
    });

    const reusedIdempotencyKey = lifecycleEnvelope(
      session,
      grant,
      "defer",
      "72",
    );
    reusedIdempotencyKey.idempotency_key = defer.idempotency_key;
    await expect(
      sessions.executeReviewSessionLifecycleCommand(reusedIdempotencyKey),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionLifecycleAuthorityError>>({
        code: "REVIEW_SESSION_LIFECYCLE_IDEMPOTENCY_KEY_REUSED",
      }),
    );

    const reusedCommandId = lifecycleEnvelope(session, grant, "defer", "73");
    reusedCommandId.command_id = defer.command_id;
    await expect(
      sessions.executeReviewSessionLifecycleCommand(reusedCommandId),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionLifecycleAuthorityError>>({
        code: "REVIEW_SESSION_LIFECYCLE_COMMAND_ID_REUSED",
      }),
    );

    const unauthorized = lifecycleEnvelope(
      deferred.reviewSession as PetraReviewSessionV110,
      grant,
      "reopen",
      "74",
    );
    unauthorized.capability_grant_id =
      "capability_grant_01K4D000000000000000000099";
    await expect(
      sessions.executeReviewSessionLifecycleCommand(unauthorized),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionLifecycleAuthorityError>>({
        code: "REVIEW_SESSION_LIFECYCLE_COMMAND_NOT_AUTHORIZED",
      }),
    );

    const staleDefer = lifecycleEnvelope(session, grant, "defer", "75");
    await expect(
      sessions.executeReviewSessionLifecycleCommand(staleDefer),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionLifecycleAuthorityError>>({
        code: "REVIEW_SESSION_LIFECYCLE_STALE_SESSION",
      }),
    );

    const reopen = lifecycleEnvelope(
      deferred.reviewSession as PetraReviewSessionV110,
      grant,
      "reopen",
      "76",
    );
    const reopened =
      await sessions.executeReviewSessionLifecycleCommand(reopen);
    expect(reopened).toMatchObject({
      applied: true,
      reviewSession: { revision: 3, content: { lifecycle: "open" } },
      receipt: {
        content: {
          transition: "reopened",
          recovery: { inverse_command_name: "DeferReviewSession" },
        },
      },
    });
    const view = await views.getProjectReviewView(
      session.project_id,
      session.review_session_id,
    );
    expect(view?.content.session).toMatchObject({
      revision: 3,
      status: "needs_decision",
      snapshot_state: "current",
    });

    const counts = await pool.query<{
      revisions: string;
      receipts: string;
      commands: string;
      candidate_bindings: string;
      relationship_bindings: string;
      domain_events: string;
      outbox_records: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.review_session_revisions)::text
           AS revisions,
         (SELECT count(*) FROM petra.review_session_lifecycle_receipts)::text
           AS receipts,
         (SELECT count(*) FROM petra.command_executions)::text AS commands,
         (SELECT count(*) FROM petra.review_session_working_candidate_bindings)::text
           AS candidate_bindings,
         (SELECT count(*) FROM petra.review_session_working_relationship_bindings)::text
           AS relationship_bindings,
         (SELECT count(*) FROM petra.domain_events)::text AS domain_events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox_records`,
    );
    expect(counts.rows[0]).toEqual({
      revisions: "3",
      receipts: "2",
      commands: "2",
      candidate_bindings: "3",
      relationship_bindings: "3",
      domain_events: "0",
      outbox_records: "0",
    });
  });

  it("preserves exception membership and rejects a stale root snapshot without partial Review state", async () => {
    const { session } = await setupWorkingReview();
    const exception = structuredClone(session);
    exception.review_session_id = "review_session_01K4D000000000000000000006";
    exception.content.members[0].review_member_id =
      "review_member_01K4D000000000000000000007";
    exception.content.members[0].member_role = "exception";
    exception.content_hash = canonicalHash(exception.content);
    await sessions.registerReviewSessionRevision(exception);

    const exceptionView = await views.getProjectReviewView(
      exception.project_id,
      exception.review_session_id,
    );
    expect(exceptionView?.content.members[0]?.member_role).toBe("exception");

    const mismatchedWorkingRef = structuredClone(session);
    mismatchedWorkingRef.review_session_id =
      "review_session_01K4D000000000000000000008";
    mismatchedWorkingRef.content.members[0].review_member_id =
      "review_member_01K4D000000000000000000009";
    mismatchedWorkingRef.content.members[0].working_state.candidate_ref.content_hash =
      session.content.members[0].working_state.relationship_refs[0].content_hash;
    mismatchedWorkingRef.content_hash = canonicalHash(
      mismatchedWorkingRef.content,
    );
    await expect(
      sessions.registerReviewSessionRevision(mismatchedWorkingRef),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PostgresReviewSessionError>>({
        code: "REVIEW_SESSION_RELATION_INVALID",
      }),
    );
    expect(
      await sessions.getReviewSession(
        mismatchedWorkingRef.project_id,
        mismatchedWorkingRef.review_session_id,
      ),
    ).toBeUndefined();

    const stale = structuredClone(session);
    stale.review_session_id = "review_session_01K4D000000000000000000010";
    stale.content.members[0].review_member_id =
      "review_member_01K4D000000000000000000011";
    stale.content_hash = canonicalHash(stale.content);
    await submitChangeSet();

    await expect(sessions.registerReviewSessionRevision(stale)).rejects.toEqual(
      expect.objectContaining<Partial<PostgresReviewSessionError>>({
        code: "REVIEW_SESSION_RELATION_INVALID",
      }),
    );
    expect(
      await sessions.getReviewSession(
        stale.project_id,
        stale.review_session_id,
      ),
    ).toBeUndefined();
  });

  it("composes exact ChangeSet, Approval, command, event, outcome, and projection receipts", async () => {
    const { session } = await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const submit = await submitChangeSet();

    const approve = readFixture<PetraCommandEnvelope>(
      "command-record-approval",
    );
    if (
      submit.command.command_name !== "SubmitChangeSet" ||
      approve.command.command_name !== "RecordApproval"
    ) {
      throw new Error("Expected exact scientific Review commands.");
    }
    approve.command.approval.subject.change_set_content_hash =
      submit.command.change_set.content_hash;
    await changes.executeCommand(approve);

    const apply = readFixture<PetraCommandEnvelope>("command-apply-change-set");
    if (apply.command.command_name !== "ApplyChangeSet") {
      throw new Error("Expected ApplyChangeSet fixture.");
    }
    apply.command.change_set_content_hash =
      submit.command.change_set.content_hash;
    await changes.executeCommand(apply);

    const checkpoint = readFixture<PetraProjectionCheckpoint>(
      "projection-checkpoint-catching-up",
    );
    const graphOutbox = (
      await changes.getOutboxRecords({
        projectId: session.project_id,
        target: "neo4j_graph",
      })
    )[0];
    if (graphOutbox === undefined) {
      throw new Error("Expected the applied ChangeSet graph outbox record.");
    }
    const projectedEvent = graphOutbox.message.event;
    checkpoint.content.observed_head = {
      target_sequence: graphOutbox.target_sequence,
      outbox_id: graphOutbox.outbox_id,
      outbox_position: graphOutbox.outbox_position,
      event_id: projectedEvent.event_id,
      event_position: projectedEvent.event_position,
      stream_revision: projectedEvent.stream_revision,
      observed_at: projectedEvent.recorded_at,
    };
    checkpoint.content.freshness = {
      state: "catching_up",
      pending_records: graphOutbox.target_sequence,
    };
    checkpoint.content_hash = canonicalHash(checkpoint.content);
    checkpoint.recorded_at = projectedEvent.recorded_at;
    checkpoint.recorded_by = {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
    };
    await projections.register(checkpoint);

    const view = await views.getProjectReviewView(
      session.project_id,
      session.review_session_id,
    );
    if (view?.schema_version !== "1.1.0") {
      throw new Error("Expected the working Review view contract.");
    }
    const changeSet = view.content.members[0]?.change_sets[0];
    expect(view.content.members[0]).toMatchObject({
      outcome: "applied",
      validation: { state: "passed" },
    });
    expect(changeSet).toMatchObject({
      state: "applied",
      approval_ref: {
        record_id: "approval_01ARZ3NDEKTSV4RRFFQ69G5FBG",
      },
    });
    expect(changeSet?.commands.map(({ command_name }) => command_name)).toEqual(
      ["SubmitChangeSet", "RecordApproval", "ApplyChangeSet"],
    );
    expect(changeSet?.events.map(({ event_type }) => event_type)).toEqual([
      "change_set.submitted",
      "approval.recorded",
      "change_set.applied",
    ]);
    expect(view.content.projection).toMatchObject({
      state: "catching_up",
      represented_target_sequence: 0,
      observed_target_sequence: 1,
      pending_records: 1,
    });
  });

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

    const apply = readFixture<PetraCommandEnvelope>("command-apply-change-set");
    if (apply.command.command_name !== "ApplyChangeSet") {
      throw new Error("Expected ApplyChangeSet fixture.");
    }
    apply.command.change_set_content_hash =
      submit.command.change_set.content_hash;
    await changes.executeCommand(apply);

    const trustedClaim = await evidence.getClaim(
      "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
    );
    const trustedAssertion = await evidence.getAssertion(
      "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
    );
    if (trustedClaim === undefined || trustedAssertion === undefined) {
      throw new Error(
        "Expected trusted evidence after applying the ChangeSet.",
      );
    }
    const currentSession = structuredClone(session);
    currentSession.revision = 2;
    currentSession.updated_at = "2026-09-08T16:03:00.000Z";
    const currentClaimBinding =
      currentSession.content.members[0]?.candidate_bindings[0];
    const currentAssertionBinding =
      currentSession.content.members[0]?.candidate_bindings[1];
    if (
      currentClaimBinding === undefined ||
      currentAssertionBinding === undefined
    ) {
      throw new Error("Expected exact ReviewSession bindings.");
    }
    currentClaimBinding.record_ref.revision = trustedClaim.revision;
    currentClaimBinding.record_ref.record_hash = canonicalHash(trustedClaim);
    currentAssertionBinding.record_ref.revision = trustedAssertion.revision;
    currentAssertionBinding.record_ref.record_hash =
      canonicalHash(trustedAssertion);
    await bindCurrentSnapshot(currentSession);
    await sessions.registerReviewSessionRevision(currentSession);

    const otherProject = structuredClone(readFixture<PetraProject>("project"));
    otherProject.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    otherProject.name = "Other Project with shared retained evidence";
    await scopes.registerProjectRevision(otherProject);
    const otherDefinition = structuredClone(
      readFixture<PetraProjectDefinition>("project-definition-scientific"),
    );
    otherDefinition.project_definition_id =
      "project_definition_01K4D000000000000000000090";
    otherDefinition.project_id = otherProject.project_id;
    await definitions.registerDefinitionRevision(otherDefinition);
    const otherObjective = structuredClone(
      readFixture<PetraProjectObjective>("project-objective"),
    );
    otherObjective.objective_id = "objective_01K4D000000000000000000090";
    otherObjective.project_id = otherProject.project_id;
    otherObjective.project_definition_ref = {
      project_definition_id: otherDefinition.project_definition_id,
      revision: otherDefinition.revision,
      content_hash: otherDefinition.content_hash,
    };
    await definitions.registerObjectiveRevision(otherObjective);
    const retainedSource = await projectSources.getProjectSource(
      session.project_id,
      "project_source_01K4C000000000000000000007",
    );
    if (retainedSource === undefined) {
      throw new Error("Expected the retained scientific ProjectSource.");
    }
    const otherSource = structuredClone(retainedSource);
    otherSource.project_source_id = "project_source_01K4D000000000000000000090";
    otherSource.project_id = otherProject.project_id;
    otherSource.content.project_definition_ref = {
      project_definition_id: otherDefinition.project_definition_id,
      revision: otherDefinition.revision,
      content_hash: otherDefinition.content_hash,
    };
    otherSource.content_hash = canonicalHash(otherSource.content);
    await projectSources.registerProjectSourceRevision(otherSource);
    const otherSession = structuredClone(currentSession);
    otherSession.review_session_id =
      "review_session_01K4D000000000000000000090";
    otherSession.revision = 1;
    otherSession.project_id = otherProject.project_id;
    otherSession.project_definition_ref = {
      project_definition_id: otherDefinition.project_definition_id,
      revision: otherDefinition.revision,
      content_hash: otherDefinition.content_hash,
    };
    otherSession.content.objective_ref = {
      objective_id: otherObjective.objective_id,
      revision: otherObjective.revision,
      content_hash: otherObjective.content_hash,
    };
    otherSession.content.snapshot.event_position = 0;
    otherSession.content.snapshot.stream_revision = 0;
    otherSession.content_hash = canonicalHash(otherSession.content);
    await sessions.registerReviewSessionRevision(otherSession);

    const appliedEvent = (
      await changes.getDomainEvents({ projectId: session.project_id })
    ).find(({ event }) => event.event_type === "change_set.applied");
    if (appliedEvent === undefined) {
      throw new Error("Expected the applied ChangeSet event.");
    }
    const impact = await historyViews.getProjectHistoryImpactView(
      session.project_id,
      appliedEvent.event_id,
    );
    const claimAssessment =
      impact?.content.semantic_target_impact.target_assessments.find(
        ({ target_ref }) => target_ref.object_id === trustedClaim.claim_id,
      );
    const reviewGroup = claimAssessment?.groups.find(
      ({ adapter_kind }) => adapter_kind === "review_membership",
    );
    expect(reviewGroup).toMatchObject({
      authority_source: "immutable_review_candidate_bindings",
      relation_scope: "exact_target_revision",
      total_count: 1,
      returned_count: 1,
      coverage: "complete",
    });
    expect(reviewGroup?.refs).toEqual([
      expect.objectContaining({
        object_id: currentSession.review_session_id,
        revision: currentSession.revision,
        posture: "current",
        relation: "contains_exact_review_candidate",
        relation_identity: "member:1/binding:1",
      }),
    ]);
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
