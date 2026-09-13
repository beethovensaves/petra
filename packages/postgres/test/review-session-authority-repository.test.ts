import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraCapabilityGrantV130,
  PetraCapabilityGrantV140,
  PetraCapabilityGrantV150,
  PetraCapabilityGrantV160,
  PetraClaim,
  PetraCommandEnvelope,
  PetraCommandEnvelopeV140,
  PetraCommandEnvelopeV150,
  PetraCommandEnvelopeV160,
  PetraCommandEnvelopeV170,
  PetraCommandEnvelopeV180,
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
  ReviewCandidateCorrectionAuthorityError,
  ReviewCandidateBasisRevisionAuthorityError,
  ReviewCandidateBasisRevisionCommandEnvelope,
  ReviewCandidateCorrectionCommandEnvelope,
  ReviewCandidateCorrectionFromHumanEditCommandEnvelope,
  ReviewSessionLifecycleAuthorityError,
  ReviewSessionLifecycleCommandEnvelope,
  ReviewSessionRefreshAuthorityError,
  ReviewSessionRefreshCommandEnvelope,
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

  const registerRefreshGrant = async (
    project: PetraProject,
    actor: PetraActor,
  ): Promise<PetraCapabilityGrantV140> => {
    const content: PetraCapabilityGrantV140["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["RefreshReviewSession"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason: "Allow the Project author to refresh an exact open Review.",
    };
    const grant: PetraCapabilityGrantV140 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.4.0",
      capability_grant_id: "capability_grant_01K4D000000000000000000080",
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

  const refreshEnvelope = (
    session: PetraReviewSessionV110,
    grant: PetraCapabilityGrantV140,
    identity: string,
  ): ReviewSessionRefreshCommandEnvelope =>
    ({
      schema_name: "petra.command-envelope",
      schema_version: "1.5.0",
      command_id: `command_01K4D0000000000000000000${identity}`,
      idempotency_key: `review-session:001:refresh:${identity}`,
      project_id: session.project_id,
      actor: structuredClone(grant.grantee),
      capability_grant_id: grant.capability_grant_id,
      correlation_id: `trace_01K4D0000000000000000000${identity}`,
      submitted_at: "2026-09-12T18:59:59.000Z",
      command: {
        command_name: "RefreshReviewSession",
        expected_review_session_ref: {
          review_session_id: session.review_session_id,
          revision: session.revision,
          content_hash: session.content_hash,
          lifecycle: "open",
        },
      },
    }) satisfies PetraCommandEnvelopeV150;

  const registerCorrectionGrant = async (
    project: PetraProject,
    actor: PetraActor,
  ): Promise<PetraCapabilityGrantV150> => {
    const content: PetraCapabilityGrantV150["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["CorrectReviewCandidate"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason:
        "Allow the Project author to correct an exact non-authoritative Review candidate.",
    };
    const grant: PetraCapabilityGrantV150 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.5.0",
      capability_grant_id: "capability_grant_01K4D000000000000000000100",
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

  const correction = (
    candidate: PetraWorkingCandidate,
    actor: PetraActor,
  ): { candidate: PetraWorkingCandidate; profile: PetraClaim } => {
    const profile = readFixture<PetraClaim>("claim-working-correction");
    profile.created_by = { actor_id: actor.actor_id, actor_kind: "human" };
    if (profile.basis.basis_kind !== "source") {
      throw new Error("Expected a source-grounded corrected Claim fixture.");
    }
    profile.basis.proposed_by = structuredClone(profile.created_by);

    const next = structuredClone(candidate);
    const priorRef = {
      schema_name: "petra.working-candidate" as const,
      schema_version: "1.0.0" as const,
      record_id: candidate.working_candidate_id,
      revision: candidate.revision,
      record_hash: canonicalHash(candidate),
    };
    next.revision += 1;
    next.profile_object.object_record_ref = exactRef(
      profile.schema_name,
      profile.claim_id,
      profile.revision,
      profile,
    );
    next.input_snapshot.input_record_refs.push(priorRef);
    next.provenance.push({
      provenance_role: "prior_revision",
      record_ref: priorRef,
      statement:
        "The correction retains the exact prior WorkingCandidate revision.",
    });
    next.validation = {
      state: "pending",
      target_record_hash: canonicalHash(profile),
      results: [],
    };
    next.lineage = {
      lineage_kind: "supersession",
      supersedes: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
      change_kind: "material_revision",
      reason:
        "Narrow the Claim wording without changing its exact source basis.",
    };
    next.recorded_at = "2026-09-12T20:59:59.000Z";
    next.content_hash = workingContentHash(next);
    return { candidate: next, profile };
  };

  const correctionEnvelope = (
    session: PetraReviewSessionV110,
    grant: PetraCapabilityGrantV150,
    corrected: { candidate: PetraWorkingCandidate; profile: PetraClaim },
    identity: string,
  ): ReviewCandidateCorrectionCommandEnvelope => {
    const member = session.content.members[0];
    if (
      member === undefined ||
      member.working_state.relationship_refs[0] === undefined
    ) {
      throw new Error("Expected one exact working Review member.");
    }
    return {
      schema_name: "petra.command-envelope",
      schema_version: "1.6.0",
      command_id: `command_01K4D000000000000000000${identity}`,
      idempotency_key: `review-session:001:candidate-correction:${identity}`,
      project_id: session.project_id,
      actor: structuredClone(grant.grantee),
      capability_grant_id: grant.capability_grant_id,
      correlation_id: `trace_01K4D000000000000000000${identity}`,
      submitted_at: "2026-09-12T21:00:00.000Z",
      command: {
        command_name: "CorrectReviewCandidate",
        expected_review_session_ref: {
          review_session_id: session.review_session_id,
          revision: session.revision,
          content_hash: session.content_hash,
          lifecycle: "open",
        },
        review_member_id: member.review_member_id,
        expected_working_candidate_ref: structuredClone(
          member.working_state.candidate_ref,
        ),
        expected_working_relationship_ref: structuredClone(
          member.working_state.relationship_refs[0],
        ),
        corrected_candidate: structuredClone(corrected.candidate),
        corrected_profile_record: structuredClone(corrected.profile),
      },
    } satisfies PetraCommandEnvelopeV160;
  };

  const humanEditCorrectionEnvelope = (
    session: PetraReviewSessionV110,
    grant: PetraCapabilityGrantV150,
    canonicalText: string,
    identity: string,
  ): ReviewCandidateCorrectionFromHumanEditCommandEnvelope => {
    const member = session.content.members[0];
    if (
      member === undefined ||
      member.working_state.relationship_refs[0] === undefined
    ) {
      throw new Error("Expected one exact working Review member.");
    }
    return {
      schema_name: "petra.command-envelope",
      schema_version: "1.7.0",
      command_id: `command_01K4D000000000000000000${identity}`,
      idempotency_key: `review-session:001:candidate-human-edit:${identity}`,
      project_id: session.project_id,
      actor: structuredClone(grant.grantee),
      capability_grant_id: grant.capability_grant_id,
      correlation_id: `trace_01K4D000000000000000000${identity}`,
      submitted_at: "2026-09-12T21:30:00.000Z",
      command: {
        command_name: "CorrectReviewCandidate",
        expected_review_session_ref: {
          review_session_id: session.review_session_id,
          revision: session.revision,
          content_hash: session.content_hash,
          lifecycle: "open",
        },
        review_member_id: member.review_member_id,
        expected_working_candidate_ref: structuredClone(
          member.working_state.candidate_ref,
        ),
        expected_working_relationship_ref: structuredClone(
          member.working_state.relationship_refs[0],
        ),
        correction_input: {
          input_kind: "human_scientific_claim_text_edit",
          canonical_text: canonicalText,
        },
      },
    } satisfies PetraCommandEnvelopeV170;
  };

  const registerBasisRevisionGrant = async (
    project: PetraProject,
    actor: PetraActor,
  ): Promise<PetraCapabilityGrantV160> => {
    const content: PetraCapabilityGrantV160["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["ReviseReviewCandidateBasis"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason:
        "Allow the Project author to revise one exact non-authoritative Review candidate basis.",
    };
    const grant: PetraCapabilityGrantV160 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.6.0",
      capability_grant_id: "capability_grant_01K4E000000000000000000100",
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

  const basisRevisionEnvelope = async (
    session: PetraReviewSessionV110,
    candidate: PetraWorkingCandidate,
    grant: PetraCapabilityGrantV160,
    identity: string,
  ): Promise<ReviewCandidateBasisRevisionCommandEnvelope> => {
    const member = session.content.members[0];
    const relationshipRef = member?.working_state.relationship_refs[0];
    const sourceSpanRef = candidate.basis.find(
      (item) => item.record_ref.schema_name === "petra.source-span",
    )?.record_ref;
    if (
      member === undefined ||
      relationshipRef === undefined ||
      sourceSpanRef === undefined ||
      sourceSpanRef.schema_name !== "petra.source-span" ||
      sourceSpanRef.schema_version !== "1.0.0" ||
      sourceSpanRef.revision !== 1
    ) {
      throw new Error("Expected one exact source-grounded Review member.");
    }
    const sourceResult = await pool.query<{
      payload: PetraProjectSource;
      record_hash: string;
    }>(
      `SELECT revision.payload, revision.record_hash
         FROM petra.project_sources AS head
         JOIN petra.project_source_revisions AS revision
           ON revision.project_source_id = head.project_source_id
          AND revision.revision = head.current_revision
        WHERE head.project_id = $1`,
      [session.project_id],
    );
    const source = sourceResult.rows[0];
    if (source === undefined)
      throw new Error("Expected a current ProjectSource.");
    const claimRef = candidate.profile_object.object_record_ref;
    return {
      schema_name: "petra.command-envelope",
      schema_version: "1.8.0",
      command_id: `command_01K4E000000000000000000${identity}`,
      idempotency_key: `review-session:001:candidate-basis:${identity}`,
      project_id: session.project_id,
      actor: structuredClone(grant.grantee),
      capability_grant_id: grant.capability_grant_id,
      correlation_id: `trace_01K4E000000000000000000${identity}`,
      submitted_at: "2026-09-12T22:00:00.000Z",
      command: {
        command_name: "ReviseReviewCandidateBasis",
        expected_review_session_ref: {
          review_session_id: session.review_session_id,
          revision: session.revision,
          content_hash: session.content_hash,
          lifecycle: "open",
        },
        review_member_id: member.review_member_id,
        expected_project_definition_ref: structuredClone(
          candidate.project_definition_ref,
        ),
        expected_working_candidate_ref: structuredClone(
          member.working_state.candidate_ref,
        ),
        expected_working_relationship_ref: structuredClone(relationshipRef),
        expected_claim_ref: {
          schema_name: "petra.claim",
          schema_version: "1.0.0",
          record_id: claimRef.record_id,
          revision: claimRef.revision,
          record_hash: claimRef.record_hash,
        },
        basis_revision_input: {
          input_kind: "human_scientific_source_basis_revision",
          project_source_ref: {
            project_source_id: source.payload.project_source_id,
            revision: source.payload.revision,
            content_hash: source.payload.content_hash,
            record_hash: source.record_hash,
            status: "active",
          },
          source_span_refs: [
            {
              schema_name: "petra.source-span",
              schema_version: "1.0.0",
              record_id: sourceSpanRef.record_id,
              revision: 1,
              record_hash: sourceSpanRef.record_hash,
            },
          ],
          source_scope: "full_text",
          detail_level: "broad",
          source_stance: "qualifies",
          attribution: "The study authors",
          modality: "hedged",
          negated: false,
          uncertainty:
            "The exact source material qualifies the reported improvement.",
          reason: "Retain the material qualification in the scientific basis.",
        },
      },
    } satisfies PetraCommandEnvelopeV180;
  };

  it("atomically revises one exact scientific source basis and replays from the canonical command ledger", async () => {
    const { project, session, candidate, relationship, actor } =
      await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerBasisRevisionGrant(project, actor);
    const envelope = await basisRevisionEnvelope(
      session,
      candidate,
      grant,
      "201",
    );
    const priorProfile = readFixture<PetraClaim>("claim");

    const first =
      await sessions.executeReviewCandidateBasisRevisionCommand(envelope);

    expect(first.applied).toBe(true);
    expect(first.profileRecord).toMatchObject({
      claim_id: priorProfile.claim_id,
      revision: priorProfile.revision + 1,
      canonical_text: priorProfile.canonical_text,
      claim_kind: priorProfile.claim_kind,
      normalization_status: priorProfile.normalization_status,
      scope: priorProfile.scope,
      authority: { zone: "quarantine", review_state: "unreviewed" },
      supersedes_claim_id: priorProfile.claim_id,
      created_by: grant.grantee,
      created_at: envelope.submitted_at,
    });
    if (first.profileRecord.basis.basis_kind !== "source") {
      throw new Error("Expected a source-grounded revised Claim.");
    }
    expect(first.profileRecord.basis).toMatchObject({
      work_version_id: first.receipt.content.resulting_basis.work_version_id,
      source_scope: envelope.command.basis_revision_input.source_scope,
      detail_level: envelope.command.basis_revision_input.detail_level,
      source_span_ids:
        envelope.command.basis_revision_input.source_span_refs.map(
          (ref) => ref.record_id,
        ),
      source_stance: envelope.command.basis_revision_input.source_stance,
      attribution: envelope.command.basis_revision_input.attribution,
      modality: envelope.command.basis_revision_input.modality,
      negated: envelope.command.basis_revision_input.negated,
      uncertainty: envelope.command.basis_revision_input.uncertainty,
      derivation: {
        derivation_kind: "human_extraction",
        derivation_ref: envelope.command_id,
      },
      proposed_by: grant.grantee,
      proposed_at: envelope.submitted_at,
    });
    expect(first.profileRecord.basis.validator_results).toHaveLength(2);
    expect(first.profileRecord.basis.validator_results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          outcome: "warning",
          code: "REVALIDATION_REQUIRED",
        }),
      ]),
    );
    expect(first.candidate).toMatchObject({
      working_candidate_id: candidate.working_candidate_id,
      revision: candidate.revision + 1,
      validation: {
        state: "pending",
        target_record_hash: canonicalHash(first.profileRecord),
        results: [],
      },
      lineage: {
        lineage_kind: "supersession",
        change_kind: "basis_revision",
      },
      created_by: candidate.created_by,
      created_at: candidate.created_at,
    });
    expect(first.relationship).toMatchObject({
      working_relationship_id: relationship.working_relationship_id,
      revision: relationship.revision + 1,
      validation: { state: "pending", results: [] },
      lineage: {
        lineage_kind: "supersession",
        change_kind: "basis_revision",
      },
    });
    expect(first.reviewSession).toMatchObject({
      review_session_id: session.review_session_id,
      revision: session.revision + 1,
      content: { lifecycle: "open" },
    });
    expect(first.receipt.content).toMatchObject({
      review_member_id: session.content.members[0]?.review_member_id,
      project_definition_ref: envelope.command.expected_project_definition_ref,
      prior_basis: {
        basis_kind: "source",
        source_span_refs: [candidate.basis[0]?.record_ref],
      },
      resulting_basis: {
        basis_kind: "source",
        project_source_ref:
          envelope.command.basis_revision_input.project_source_ref,
        source_span_refs:
          envelope.command.basis_revision_input.source_span_refs,
      },
      basis_transition: "material_revision_within_exact_scientific_source",
      validation_reset: {
        state: "pending",
        completed_validator_refs: [],
      },
      preservation: {
        review_decision: "none",
        change_sets: "unchanged",
        approvals: "unchanged",
        domain_events: "none",
        projection: "unchanged",
        history: "unchanged",
      },
      authority_boundary: {
        candidate_authority: "working_only",
        review_decision: "none",
        domain_authority: "unchanged",
        validation_authority: "none",
        conversation_authority: "none",
        model_output_authority: "none",
      },
    });

    const replayEnvelope = structuredClone(envelope);
    replayEnvelope.correlation_id = "trace_01K4E000000000000000000202";
    replayEnvelope.submitted_at = "2026-09-12T22:00:05.000Z";
    const replay =
      await sessions.executeReviewCandidateBasisRevisionCommand(replayEnvelope);
    expect(replay).toEqual({ ...first, applied: false });

    const cardinality = await pool.query<{
      candidates: string;
      relationships: string;
      claims: string;
      reviews: string;
      commands: string;
      changes: string;
      approvals: string;
      events: string;
      outbox: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.working_candidate_revisions
           WHERE working_candidate_id = $1)::text AS candidates,
         (SELECT count(*) FROM petra.working_relationship_revisions
           WHERE working_relationship_id = $2)::text AS relationships,
         (SELECT count(*) FROM petra.claim_revisions
           WHERE claim_id = $3)::text AS claims,
         (SELECT count(*) FROM petra.review_session_revisions
           WHERE review_session_id = $4)::text AS reviews,
         (SELECT count(*) FROM petra.command_executions
           WHERE command_id = $5)::text AS commands,
         (SELECT count(*) FROM petra.change_sets)::text AS changes,
         (SELECT count(*) FROM petra.approvals)::text AS approvals,
         (SELECT count(*) FROM petra.domain_events)::text AS events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox`,
      [
        candidate.working_candidate_id,
        relationship.working_relationship_id,
        priorProfile.claim_id,
        session.review_session_id,
        envelope.command_id,
      ],
    );
    expect(cardinality.rows[0]).toEqual({
      candidates: "2",
      relationships: "2",
      claims: "2",
      reviews: "2",
      commands: "1",
      changes: "0",
      approvals: "0",
      events: "0",
      outbox: "0",
    });
  });

  it("fails closed on unauthorized, stale, unsupported, incompatible, and retry-mismatch basis revisions", async () => {
    const { project, session, candidate, actor } = await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerBasisRevisionGrant(project, actor);
    const envelope = await basisRevisionEnvelope(
      session,
      candidate,
      grant,
      "203",
    );

    const unauthorized = structuredClone(envelope);
    unauthorized.capability_grant_id =
      "capability_grant_01K4E000000000000000000204";
    await expect(
      sessions.executeReviewCandidateBasisRevisionCommand(unauthorized),
    ).rejects.toMatchObject({
      code: "REVIEW_CANDIDATE_BASIS_REVISION_COMMAND_NOT_AUTHORIZED",
    } satisfies Partial<ReviewCandidateBasisRevisionAuthorityError>);

    const stale = structuredClone(envelope);
    stale.command.expected_claim_ref.record_hash = `sha256:${"f".repeat(64)}`;
    await expect(
      sessions.executeReviewCandidateBasisRevisionCommand(stale),
    ).rejects.toMatchObject({
      code: "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
    } satisfies Partial<ReviewCandidateBasisRevisionAuthorityError>);

    const unsupported = structuredClone(envelope);
    unsupported.command.expected_project_definition_ref.definition_family =
      "petra.unsupported-profile";
    await expect(
      sessions.executeReviewCandidateBasisRevisionCommand(unsupported),
    ).rejects.toMatchObject({
      code: "REVIEW_CANDIDATE_BASIS_REVISION_STALE_REFERENCE",
    } satisfies Partial<ReviewCandidateBasisRevisionAuthorityError>);

    const incompatible = structuredClone(envelope);
    incompatible.command.basis_revision_input.source_scope = "abstract_only";
    await expect(
      sessions.executeReviewCandidateBasisRevisionCommand(incompatible),
    ).rejects.toMatchObject({
      code: "REVIEW_CANDIDATE_BASIS_REVISION_SOURCE_INCOMPATIBLE",
    } satisfies Partial<ReviewCandidateBasisRevisionAuthorityError>);

    const countsAfterFailure = await pool.query<{
      candidates: string;
      relationships: string;
      claims: string;
      reviews: string;
      commands: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.working_candidate_revisions
           WHERE working_candidate_id = $1)::text AS candidates,
         (SELECT count(*) FROM petra.working_relationship_revisions
           WHERE working_relationship_id = $2)::text AS relationships,
         (SELECT count(*) FROM petra.claim_revisions
           WHERE claim_id = $3)::text AS claims,
         (SELECT count(*) FROM petra.review_session_revisions
           WHERE review_session_id = $4)::text AS reviews,
         (SELECT count(*) FROM petra.command_executions
           WHERE command_id = $5)::text AS commands`,
      [
        candidate.working_candidate_id,
        session.content.members[0]?.working_state.relationship_refs[0]
          ?.working_relationship_id,
        candidate.profile_object.object_record_ref.record_id,
        session.review_session_id,
        envelope.command_id,
      ],
    );
    expect(countsAfterFailure.rows[0]).toEqual({
      candidates: "1",
      relationships: "1",
      claims: "1",
      reviews: "1",
      commands: "0",
    });

    await sessions.executeReviewCandidateBasisRevisionCommand(envelope);
    const mismatchedRetry = structuredClone(envelope);
    mismatchedRetry.command.basis_revision_input.reason =
      "A different material reason cannot reuse this retry identity.";
    await expect(
      sessions.executeReviewCandidateBasisRevisionCommand(mismatchedRetry),
    ).rejects.toMatchObject({
      code: "REVIEW_CANDIDATE_BASIS_REVISION_IDEMPOTENCY_KEY_REUSED",
    } satisfies Partial<ReviewCandidateBasisRevisionAuthorityError>);
  });

  it("composes an exact human Claim text edit inside idempotent correction authority", async () => {
    const { project, session, candidate, relationship, actor } =
      await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerCorrectionGrant(project, actor);
    const priorProfile = readFixture<PetraClaim>("claim");
    const canonicalText =
      "The study reports a measurable improvement on its defined evaluation task.";
    const envelope = humanEditCorrectionEnvelope(
      session,
      grant,
      canonicalText,
      "106",
    );

    const first =
      await sessions.executeReviewCandidateCorrectionCommand(envelope);

    expect(first.applied).toBe(true);
    expect(first.profileRecord).toMatchObject({
      claim_id: priorProfile.claim_id,
      revision: priorProfile.revision + 1,
      canonical_text: canonicalText,
      claim_kind: priorProfile.claim_kind,
      normalization_status: priorProfile.normalization_status,
      scope: priorProfile.scope,
      authority: { zone: "quarantine", review_state: "unreviewed" },
      supersedes_claim_id: priorProfile.claim_id,
      created_by: grant.grantee,
      created_at: envelope.submitted_at,
    });
    if (
      first.profileRecord.basis.basis_kind !== "source" ||
      priorProfile.basis.basis_kind !== "source"
    ) {
      throw new Error("Expected source-grounded correction records.");
    }
    expect(first.profileRecord.basis).toMatchObject({
      work_version_id: priorProfile.basis.work_version_id,
      source_scope: priorProfile.basis.source_scope,
      detail_level: priorProfile.basis.detail_level,
      source_span_ids: priorProfile.basis.source_span_ids,
      source_stance: priorProfile.basis.source_stance,
      attribution: priorProfile.basis.attribution,
      modality: priorProfile.basis.modality,
      negated: priorProfile.basis.negated,
      validator_results: priorProfile.basis.validator_results,
      derivation: {
        derivation_kind: "human_extraction",
        derivation_ref: envelope.command_id,
      },
      proposed_by: grant.grantee,
      proposed_at: envelope.submitted_at,
    });
    expect(first.profileRecord.basis.uncertainty).toBe(
      priorProfile.basis.uncertainty,
    );
    expect(first.profileRecord.basis).not.toHaveProperty(
      "extraction_confidence",
    );
    expect(first.candidate).toMatchObject({
      working_candidate_id: candidate.working_candidate_id,
      revision: candidate.revision + 1,
      producer: {
        producer_kind: "human",
        actor: grant.grantee,
        contribution_kind: "direct_edit",
      },
      task_context: candidate.task_context,
      basis: candidate.basis,
      qualifications: candidate.qualifications,
      validation: {
        state: "pending",
        target_record_hash: canonicalHash(first.profileRecord),
        results: [],
      },
      created_by: candidate.created_by,
      created_at: candidate.created_at,
      recorded_at: envelope.submitted_at,
    });
    expect(first.candidate.origin.source_record_refs).toEqual([
      {
        schema_name: "petra.working-candidate",
        schema_version: "1.0.0",
        record_id: candidate.working_candidate_id,
        revision: candidate.revision,
        record_hash: canonicalHash(candidate),
      },
    ]);
    expect(first.relationship).toMatchObject({
      working_relationship_id: relationship.working_relationship_id,
      revision: relationship.revision + 1,
    });
    expect(first.reviewSession).toMatchObject({
      review_session_id: session.review_session_id,
      revision: session.revision + 1,
      content: { lifecycle: "open" },
    });

    const uncertainRetry = structuredClone(envelope);
    uncertainRetry.submitted_at = "2026-09-12T21:31:00.000Z";
    uncertainRetry.correlation_id = "trace_01K4D000000000000000000107";
    await expect(
      sessions.executeReviewCandidateCorrectionCommand(uncertainRetry),
    ).resolves.toEqual({ ...first, applied: false });

    const retryMismatch = structuredClone(envelope);
    retryMismatch.command.correction_input.canonical_text +=
      " Different retry content.";
    await expect(
      sessions.executeReviewCandidateCorrectionCommand(retryMismatch),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewCandidateCorrectionAuthorityError>>(
        { code: "REVIEW_CANDIDATE_CORRECTION_IDEMPOTENCY_KEY_REUSED" },
      ),
    );
  });

  it("atomically corrects the same candidate, relationship, member, and Review with exact replay", async () => {
    const { project, session, candidate, relationship, actor } =
      await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerCorrectionGrant(project, actor);
    const corrected = correction(candidate, actor);
    const envelope = correctionEnvelope(session, grant, corrected, "101");

    const first =
      await sessions.executeReviewCandidateCorrectionCommand(envelope);
    expect(first).toMatchObject({
      applied: true,
      candidate: {
        working_candidate_id: candidate.working_candidate_id,
        revision: 2,
        authority_boundary: {
          domain_authority: false,
          review_decision: false,
          mutation_authority: false,
        },
      },
      relationship: {
        working_relationship_id: relationship.working_relationship_id,
        revision: 2,
      },
      reviewSession: {
        review_session_id: session.review_session_id,
        revision: 2,
        content: { lifecycle: "open" },
      },
      receipt: {
        content: {
          review_member_id: session.content.members[0]?.review_member_id,
          correction_kind: "material_revision",
          basis_transition: "retained_exact_scientific_source",
          preservation: {
            review_decision: "none",
            change_sets: "unchanged",
            approvals: "unchanged",
            domain_events: "none",
            projection: "unchanged",
            history: "unchanged",
          },
          authority_boundary: {
            candidate_authority: "working_only",
            review_decision: "none",
            domain_authority: "unchanged",
            conversation_authority: "none",
            model_output_authority: "none",
          },
        },
      },
    });
    expect(first.relationship.endpoints.object).toEqual({
      endpoint_kind: "working_candidate",
      candidate_ref: {
        working_candidate_id: first.candidate.working_candidate_id,
        revision: first.candidate.revision,
        content_hash: first.candidate.content_hash,
      },
    });
    const resultingMember = first.reviewSession.content.members[0];
    expect(resultingMember?.review_member_id).toBe(
      session.content.members[0]?.review_member_id,
    );
    expect(
      resultingMember && "working_state" in resultingMember
        ? resultingMember.working_state
        : undefined,
    ).toEqual({
      candidate_ref: {
        working_candidate_id: first.candidate.working_candidate_id,
        revision: first.candidate.revision,
        content_hash: first.candidate.content_hash,
      },
      relationship_refs: [
        {
          working_relationship_id: first.relationship.working_relationship_id,
          revision: first.relationship.revision,
          content_hash: first.relationship.content_hash,
        },
      ],
    });

    const replay = await sessions.executeReviewCandidateCorrectionCommand(
      structuredClone(envelope),
    );
    expect(replay).toEqual({ ...first, applied: false });
    await expect(
      working.getWorkingCandidate(
        project.project_id,
        candidate.working_candidate_id,
        1,
      ),
    ).resolves.toEqual(candidate);
    await expect(
      working.getWorkingRelationship(
        project.project_id,
        relationship.working_relationship_id,
        1,
      ),
    ).resolves.toEqual(relationship);

    const counts = await pool.query<{
      candidates: string;
      candidate_revisions: string;
      relationships: string;
      relationship_revisions: string;
      reviews: string;
      review_revisions: string;
      correction_commands: string;
      domain_events: string;
      outbox: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.working_candidates)::text AS candidates,
         (SELECT count(*) FROM petra.working_candidate_revisions)::text
           AS candidate_revisions,
         (SELECT count(*) FROM petra.working_relationships)::text
           AS relationships,
         (SELECT count(*) FROM petra.working_relationship_revisions)::text
           AS relationship_revisions,
         (SELECT count(*) FROM petra.review_sessions)::text AS reviews,
         (SELECT count(*) FROM petra.review_session_revisions)::text
           AS review_revisions,
         (SELECT count(*) FROM petra.command_executions
           WHERE command_name = 'CorrectReviewCandidate')::text
           AS correction_commands,
         (SELECT count(*) FROM petra.domain_events)::text AS domain_events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox`,
    );
    expect(counts.rows[0]).toEqual({
      candidates: "1",
      candidate_revisions: "2",
      relationships: "1",
      relationship_revisions: "2",
      reviews: "1",
      review_revisions: "2",
      correction_commands: "1",
      domain_events: "0",
      outbox: "0",
    });
  });

  it("fails closed for unauthorized, stale, mismatched, invalid lineage, basis, provenance, and retry content", async () => {
    const { project, session, candidate, actor } = await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerCorrectionGrant(project, actor);
    const corrected = correction(candidate, actor);
    const envelope = correctionEnvelope(session, grant, corrected, "102");
    const expectCode = async (
      input: ReviewCandidateCorrectionCommandEnvelope,
      code: ReviewCandidateCorrectionAuthorityError["code"],
    ) => {
      await expect(
        sessions.executeReviewCandidateCorrectionCommand(input),
      ).rejects.toEqual(expect.objectContaining({ code }));
    };

    await expectCode(
      {
        ...envelope,
        capability_grant_id: "capability_grant_01K4D000000000000000000199",
      },
      "REVIEW_CANDIDATE_CORRECTION_COMMAND_NOT_AUTHORIZED",
    );
    const stale = structuredClone(envelope);
    stale.command.expected_review_session_ref.content_hash = `sha256:${"0".repeat(64)}`;
    await expectCode(stale, "REVIEW_CANDIDATE_CORRECTION_STALE_REFERENCE");
    const memberMismatch = structuredClone(envelope);
    memberMismatch.command.review_member_id =
      "review_member_01K4D000000000000000000199";
    await expectCode(
      memberMismatch,
      "REVIEW_CANDIDATE_CORRECTION_MEMBER_MISMATCH",
    );
    const lineage = structuredClone(envelope);
    if (
      lineage.command.corrected_candidate.lineage.lineage_kind !==
      "supersession"
    ) {
      throw new Error("Expected correction lineage.");
    }
    lineage.command.corrected_candidate.lineage.supersedes.content_hash = `sha256:${"0".repeat(64)}`;
    lineage.command.corrected_candidate.content_hash = workingContentHash(
      lineage.command.corrected_candidate,
    );
    await expectCode(lineage, "REVIEW_CANDIDATE_CORRECTION_LINEAGE_INVALID");
    const basis = structuredClone(envelope);
    if (basis.command.corrected_profile_record.basis.basis_kind !== "source") {
      throw new Error("Expected source basis.");
    }
    basis.command.corrected_profile_record.basis.source_stance = "qualifies";
    basis.command.corrected_candidate.profile_object.object_record_ref.record_hash =
      canonicalHash(basis.command.corrected_profile_record);
    basis.command.corrected_candidate.validation.target_record_hash =
      canonicalHash(basis.command.corrected_profile_record);
    basis.command.corrected_candidate.content_hash = workingContentHash(
      basis.command.corrected_candidate,
    );
    await expectCode(basis, "REVIEW_CANDIDATE_CORRECTION_BASIS_INCOMPATIBLE");
    const provenance = structuredClone(envelope);
    provenance.command.corrected_candidate.provenance =
      provenance.command.corrected_candidate.provenance.filter(
        (item) => item.provenance_role !== "prior_revision",
      ) as PetraWorkingCandidate["provenance"];
    provenance.command.corrected_candidate.content_hash = workingContentHash(
      provenance.command.corrected_candidate,
    );
    await expectCode(
      provenance,
      "REVIEW_CANDIDATE_CORRECTION_PROVENANCE_INVALID",
    );

    const beforeSuccess = await pool.query<{
      candidate_revisions: string;
      relationship_revisions: string;
      review_revisions: string;
      correction_commands: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.working_candidate_revisions)::text
           AS candidate_revisions,
         (SELECT count(*) FROM petra.working_relationship_revisions)::text
           AS relationship_revisions,
         (SELECT count(*) FROM petra.review_session_revisions)::text
           AS review_revisions,
         (SELECT count(*) FROM petra.command_executions
           WHERE command_name = 'CorrectReviewCandidate')::text
           AS correction_commands`,
    );
    expect(beforeSuccess.rows[0]).toEqual({
      candidate_revisions: "1",
      relationship_revisions: "1",
      review_revisions: "1",
      correction_commands: "0",
    });

    await sessions.executeReviewCandidateCorrectionCommand(envelope);
    const retryMismatch = structuredClone(envelope);
    retryMismatch.command.corrected_profile_record.canonical_text +=
      " Different retry content.";
    retryMismatch.command.corrected_candidate.profile_object.object_record_ref.record_hash =
      canonicalHash(retryMismatch.command.corrected_profile_record);
    retryMismatch.command.corrected_candidate.validation.target_record_hash =
      canonicalHash(retryMismatch.command.corrected_profile_record);
    retryMismatch.command.corrected_candidate.content_hash = workingContentHash(
      retryMismatch.command.corrected_candidate,
    );
    await expectCode(
      retryMismatch,
      "REVIEW_CANDIDATE_CORRECTION_IDEMPOTENCY_KEY_REUSED",
    );
  });

  it("fails closed for a Review without registered working scientific membership", async () => {
    const unsupported = await setupAuthority();
    await sessions.registerReviewSessionRevision(unsupported.session);
    const actor = readFixture<PetraActor>("actor");
    const grant = await registerCorrectionGrant(unsupported.project, actor);
    const candidate = readFixture<PetraWorkingCandidate>(
      "working-candidate-correction",
    );
    const profile = readFixture<PetraClaim>("claim-working-correction");
    const member = unsupported.session.content.members[0];
    if (member === undefined) throw new Error("Expected one Review member.");
    const envelope: ReviewCandidateCorrectionCommandEnvelope = {
      schema_name: "petra.command-envelope",
      schema_version: "1.6.0",
      command_id: "command_01K4D000000000000000000103",
      idempotency_key:
        "review-session:001:candidate-correction:unsupported:103",
      project_id: unsupported.project.project_id,
      actor: structuredClone(grant.grantee),
      capability_grant_id: grant.capability_grant_id,
      correlation_id: "trace_01K4D000000000000000000103",
      submitted_at: "2026-09-12T21:00:00.000Z",
      command: {
        command_name: "CorrectReviewCandidate",
        expected_review_session_ref: {
          review_session_id: unsupported.session.review_session_id,
          revision: unsupported.session.revision,
          content_hash: unsupported.session.content_hash,
          lifecycle: "open",
        },
        review_member_id: member.review_member_id,
        expected_working_candidate_ref: {
          working_candidate_id: candidate.working_candidate_id,
          revision: 1,
          content_hash: `sha256:${"1".repeat(64)}`,
        },
        expected_working_relationship_ref: {
          working_relationship_id:
            "working_relationship_01K4D000000000000000000003",
          revision: 1,
          content_hash: `sha256:${"2".repeat(64)}`,
        },
        corrected_candidate: candidate,
        corrected_profile_record: profile,
      },
    };

    await expect(
      sessions.executeReviewCandidateCorrectionCommand(envelope),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewCandidateCorrectionAuthorityError>>(
        {
          code: "REVIEW_CANDIDATE_CORRECTION_PROFILE_UNSUPPORTED",
        },
      ),
    );
    expect(
      await sessions.getReviewSession(
        unsupported.project.project_id,
        unsupported.session.review_session_id,
      ),
    ).toEqual(unsupported.session);
  });

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
    if (view?.schema_version !== "1.2.0") {
      throw new Error("Expected the working Review view contract.");
    }
    expect(view).toMatchObject({
      project_id: project.project_id,
      content: {
        session: {
          lifecycle: "open",
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
    const deferredView = await views.getProjectReviewView(
      session.project_id,
      session.review_session_id,
    );
    expect(deferredView?.content.session).toMatchObject({
      revision: 2,
      lifecycle: "deferred",
      status: "waiting",
    });

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
      lifecycle: "open",
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

  it("refreshes one exact stale Review in place and retains every authority ledger", async () => {
    const { project, session, actor } = await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerRefreshGrant(project, actor);
    await submitChangeSet();

    const retainedCountSql = `SELECT
         (SELECT count(*) FROM petra.review_sessions)::text AS reviews,
         (SELECT count(*) FROM petra.working_candidate_revisions)::text
           AS candidates,
         (SELECT count(*) FROM petra.working_relationship_revisions)::text
           AS relationships,
         (SELECT count(*) FROM petra.change_sets)::text AS change_sets,
         (SELECT count(*) FROM petra.approvals)::text AS approvals,
         (SELECT count(*) FROM petra.domain_events)::text AS events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox,
         (SELECT count(*) FROM petra.projection_checkpoints)::text AS projections`;
    const before = await pool.query<{
      reviews: string;
      candidates: string;
      relationships: string;
      change_sets: string;
      approvals: string;
      events: string;
      outbox: string;
      projections: string;
    }>(retainedCountSql);
    const stale = await views.getProjectReviewView(
      session.project_id,
      session.review_session_id,
    );
    expect(stale?.content.session).toMatchObject({
      revision: 1,
      snapshot_state: "stale",
    });

    const unauthorized = refreshEnvelope(session, grant, "81");
    unauthorized.capability_grant_id =
      "capability_grant_01K4D000000000000000000099";
    await expect(
      sessions.executeReviewSessionRefreshCommand(unauthorized),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionRefreshAuthorityError>>({
        code: "REVIEW_SESSION_REFRESH_COMMAND_NOT_AUTHORIZED",
      }),
    );

    const refresh = refreshEnvelope(session, grant, "82");
    const refreshed =
      await sessions.executeReviewSessionRefreshCommand(refresh);
    expect(refreshed).toMatchObject({
      applied: true,
      reviewSession: {
        review_session_id: session.review_session_id,
        revision: 2,
        content: {
          lifecycle: "open",
          snapshot: { stream_revision: 1 },
          members: [
            {
              review_member_id: session.content.members[0]?.review_member_id,
              working_state: session.content.members[0]?.working_state,
            },
          ],
        },
      },
      receipt: {
        content: {
          transition: "refreshed",
          refresh_basis: {
            selection_basis: "same_review_members_current_working_heads",
            prior_snapshot: { stream_revision: 0 },
            resulting_snapshot: { stream_revision: 1 },
          },
          preservation: {
            stale_review_revision: "retained",
            review_members: "retained_same_identity",
            validation_records: "retained_unchanged",
            change_sets: "retained_unchanged",
            approvals: "retained_unchanged",
            command_events: "retained_unchanged",
            projection_receipts: "retained_unchanged",
          },
          authority_boundary: {
            review_decision: "none",
            domain_authority: "unchanged",
            candidate_authority: "none",
            validation_authority: "none",
            change_set_authority: "none",
            approval_authority: "none",
            domain_event_effect: "none",
            projection_effect: "none",
          },
        },
      },
    });
    expect(
      await sessions.getReviewSession(
        session.project_id,
        session.review_session_id,
        1,
      ),
    ).toEqual(session);
    const currentView = await views.getProjectReviewView(
      session.project_id,
      session.review_session_id,
    );
    expect(currentView?.content.session).toMatchObject({
      revision: 2,
      snapshot_state: "current",
    });

    const replay = structuredClone(refresh);
    replay.correlation_id = "trace_01K4D000000000000000000083";
    replay.submitted_at = "2026-09-12T19:00:01.000Z";
    await expect(
      sessions.executeReviewSessionRefreshCommand(replay),
    ).resolves.toEqual({ ...refreshed, applied: false });

    const reusedKey = refreshEnvelope(session, grant, "84");
    reusedKey.idempotency_key = refresh.idempotency_key;
    await expect(
      sessions.executeReviewSessionRefreshCommand(reusedKey),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionRefreshAuthorityError>>({
        code: "REVIEW_SESSION_REFRESH_IDEMPOTENCY_KEY_REUSED",
      }),
    );
    await expect(
      sessions.executeReviewSessionRefreshCommand(
        refreshEnvelope(session, grant, "85"),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionRefreshAuthorityError>>({
        code: "REVIEW_SESSION_REFRESH_STALE_SESSION",
      }),
    );
    await expect(
      sessions.executeReviewSessionRefreshCommand(
        refreshEnvelope(
          refreshed.reviewSession as PetraReviewSessionV110,
          grant,
          "86",
        ),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionRefreshAuthorityError>>({
        code: "REVIEW_SESSION_REFRESH_NOT_REQUIRED",
      }),
    );

    const after = await pool.query(retainedCountSql);
    expect(after.rows[0]).toEqual(before.rows[0]);
    const refreshCounts = await pool.query<{
      reviews: string;
      review_revisions: string;
      refresh_commands: string;
      lifecycle_receipts: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.review_sessions)::text AS reviews,
         (SELECT count(*) FROM petra.review_session_revisions)::text
           AS review_revisions,
         (SELECT count(*) FROM petra.command_executions
           WHERE command_name = 'RefreshReviewSession')::text
           AS refresh_commands,
         (SELECT count(*) FROM petra.review_session_lifecycle_receipts)::text
           AS lifecycle_receipts`,
    );
    expect(refreshCounts.rows[0]).toEqual({
      reviews: "1",
      review_revisions: "2",
      refresh_commands: "1",
      lifecycle_receipts: "0",
    });
  });

  it("rebinds the same Review member to compatible current working heads", async () => {
    const { project, session, candidate, relationship, actor } =
      await setupWorkingReview();
    await sessions.registerReviewSessionRevision(session);
    const grant = await registerRefreshGrant(project, actor);

    const correctedClaim = readFixture<PetraClaim>("claim-working-correction");
    correctedClaim.created_by = {
      actor_id: actor.actor_id,
      actor_kind: "human",
    };
    if (correctedClaim.basis.basis_kind !== "source") {
      throw new Error("Expected a source-grounded corrected Claim fixture.");
    }
    correctedClaim.basis.proposed_by = structuredClone(
      correctedClaim.created_by,
    );
    const correctedCandidate = structuredClone(candidate);
    correctedCandidate.revision = 2;
    correctedCandidate.profile_object.object_record_ref = exactRef(
      correctedClaim.schema_name,
      correctedClaim.claim_id,
      correctedClaim.revision,
      correctedClaim,
    );
    correctedCandidate.validation.target_record_hash =
      canonicalHash(correctedClaim);
    correctedCandidate.lineage = {
      lineage_kind: "supersession",
      supersedes: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
      change_kind: "material_revision",
      reason: "Narrow the candidate while preserving its exact material basis.",
    };
    correctedCandidate.recorded_at = "2026-09-12T18:50:00.000Z";
    correctedCandidate.content_hash = workingContentHash(correctedCandidate);
    await working.admitWorkingCandidateRevision({
      candidate: correctedCandidate,
      profileRecord: correctedClaim,
    });

    const assertion = readFixture<PetraAssertion>("assertion");
    assertion.created_by = {
      actor_id: actor.actor_id,
      actor_kind: "human",
    };
    const correctedRelationship = structuredClone(relationship);
    correctedRelationship.revision = 2;
    if (
      correctedRelationship.endpoints.object.endpoint_kind !==
      "working_candidate"
    ) {
      throw new Error("Expected a WorkingCandidate relationship endpoint.");
    }
    correctedRelationship.endpoints.object.candidate_ref = {
      working_candidate_id: correctedCandidate.working_candidate_id,
      revision: correctedCandidate.revision,
      content_hash: correctedCandidate.content_hash,
    };
    correctedRelationship.lineage = {
      lineage_kind: "supersession",
      supersedes: {
        working_relationship_id: relationship.working_relationship_id,
        revision: relationship.revision,
        content_hash: relationship.content_hash,
      },
      change_kind: "material_revision",
      reason: "Rebind the relationship to the corrected candidate head.",
    };
    correctedRelationship.recorded_at = "2026-09-12T18:51:00.000Z";
    correctedRelationship.content_hash = workingContentHash(
      correctedRelationship,
    );
    await working.admitWorkingRelationshipRevision({
      relationship: correctedRelationship,
      profileRecord: assertion,
    });

    const result = await sessions.executeReviewSessionRefreshCommand(
      refreshEnvelope(session, grant, "89"),
    );
    const member = result.reviewSession.content.members[0];
    if (member === undefined || !("working_state" in member)) {
      throw new Error("Expected refreshed working Review membership.");
    }
    expect(member.review_member_id).toBe(
      session.content.members[0]?.review_member_id,
    );
    expect(member.working_state).toEqual({
      candidate_ref: {
        working_candidate_id: correctedCandidate.working_candidate_id,
        revision: 2,
        content_hash: correctedCandidate.content_hash,
      },
      relationship_refs: [
        {
          working_relationship_id:
            correctedRelationship.working_relationship_id,
          revision: 2,
          content_hash: correctedRelationship.content_hash,
        },
      ],
    });
    expect(member.candidate_bindings).toEqual([
      {
        ...session.content.members[0]?.candidate_bindings[0],
        record_ref: {
          record_id: correctedClaim.claim_id,
          revision: correctedClaim.revision,
          record_hash: canonicalHash(correctedClaim),
        },
      },
      session.content.members[0]?.candidate_bindings[1],
    ]);
    await expect(
      working.getWorkingCandidate(
        project.project_id,
        candidate.working_candidate_id,
        1,
      ),
    ).resolves.toEqual(candidate);
    await expect(
      working.getWorkingRelationship(
        project.project_id,
        relationship.working_relationship_id,
        1,
      ),
    ).resolves.toEqual(relationship);
  });

  it("fails closed for unsupported Review profile and a changed ProjectDefinition", async () => {
    const unsupported = await setupAuthority();
    const actor = readFixture<PetraActor>("actor");
    await sessions.registerReviewSessionRevision(unsupported.session);
    const unsupportedGrant = await registerRefreshGrant(
      unsupported.project,
      actor,
    );
    await expect(
      sessions.executeReviewSessionRefreshCommand(
        refreshEnvelope(
          unsupported.session as unknown as PetraReviewSessionV110,
          unsupportedGrant,
          "87",
        ),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionRefreshAuthorityError>>({
        code: "REVIEW_SESSION_REFRESH_PROFILE_UNSUPPORTED",
      }),
    );

    await pool.query("TRUNCATE petra.actors CASCADE");
    await pool.query(
      `UPDATE petra.authority_positions
          SET event_position = 0, outbox_position = 0
        WHERE singleton`,
    );
    const current = await setupWorkingReview();
    await sessions.registerReviewSessionRevision(current.session);
    const grant = await registerRefreshGrant(current.project, current.actor);
    const changedDefinition = readFixture<PetraProjectDefinition>(
      "project-definition-working-scientific",
    );
    changedDefinition.revision += 1;
    changedDefinition.content.label = "Scientific evidence revised";
    changedDefinition.content_hash = canonicalHash(changedDefinition.content);
    await definitions.registerDefinitionRevision(changedDefinition);

    await expect(
      sessions.executeReviewSessionRefreshCommand(
        refreshEnvelope(current.session, grant, "88"),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewSessionRefreshAuthorityError>>({
        code: "REVIEW_SESSION_REFRESH_INCOMPATIBLE_REVISION",
      }),
    );
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
    if (view?.schema_version !== "1.2.0") {
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
