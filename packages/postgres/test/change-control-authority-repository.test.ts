import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraCapabilityGrantRecord,
  PetraClaim,
  PetraCommandEnvelope,
  PetraEvidenceProposalBundle,
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionRun,
  PetraParsedDocument,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectHistoryCompensationExecutionRequest,
  PetraProjectHistoryCompensationPlanRequest,
  PetraReviewInterruptResponse,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraInteractionReplayRecord,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWorkUnit,
  PetraWorkVersion,
} from "@petra/contracts";
import type {
  DomainRecordFactory,
  PersistDocumentBundleInput,
  PersistVerifiedArtifactInput,
} from "@petra/core";
import {
  buildCompensatingReversalCommandPlan,
  buildReviewDecisionCommandPlan,
  ChangeControlError,
  DurableReviewInterruptCoordinator,
  executeCompensatingReversalPlan,
  executeReviewDecisionPlan,
  replayScientificAuthority,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresCapabilityGrantAuthorityRepository } from "../src/capability-grant-authority-repository.js";
import { PostgresChangeControlAuthorityRepository } from "../src/change-control-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresInteractionAuthorityRepository } from "../src/interaction-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresProjectHistoryViewReader } from "../src/project-history-view-reader.js";
import { PostgresProjectHistoryCompensationExecutor } from "../src/project-history-compensation-executor.js";
import { PostgresProjectObjectLocationViewReader } from "../src/project-object-location-view-reader.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
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

const expectChangeCode = async (
  operation: () => Promise<unknown>,
  code: string,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(expect.objectContaining({ code }));
};

interface CommandFixtureSet {
  submit: PetraCommandEnvelope;
  approve: PetraCommandEnvelope;
  apply: PetraCommandEnvelope;
}

describePostgres("PostgreSQL ChangeSet authority, event, and outbox", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);
  const interactions = new PostgresInteractionAuthorityRepository(pool);
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const objectLocations = new PostgresProjectObjectLocationViewReader(pool);
  const historyViews = new PostgresProjectHistoryViewReader(pool);
  const authorizedHistoryViews = new PostgresProjectHistoryViewReader(
    pool,
    undefined,
    {
      recoveryPrincipal: {
        actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        actor_kind: "human",
      },
    },
  );
  const capabilityGrants = new PostgresCapabilityGrantAuthorityRepository(pool);

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

  const modelActor = (): PetraActor => ({
    ...readFixture<PetraActor>("actor"),
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
    actor_kind: "model",
    display_name: "Petra extraction model",
    created_at: "2026-08-28T18:00:01.000Z",
  });

  const serviceActor = (): PetraActor => ({
    ...readFixture<PetraActor>("actor"),
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FF0",
    actor_kind: "service",
    display_name: "Petra interaction service",
    created_at: "2026-08-28T18:00:02.000Z",
  });

  const registerResearchIdentities = async (): Promise<void> => {
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(modelActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
    await definitions.registerDefinitionRevision(
      readFixture<PetraProjectDefinition>("project-definition-scientific"),
    );
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

  const responseArtifactInput = (
    source: PersistVerifiedArtifactInput,
    response: PetraReviewInterruptResponse,
  ): PersistVerifiedArtifactInput => {
    const value = parserArtifactInput(source);
    const bytes = new TextEncoder().encode(canonicalize(response));
    const contentHash = sha256(bytes);
    value.artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FDK";
    value.artifact.content_hash = contentHash;
    value.artifact.byte_size = bytes.byteLength;
    value.artifact.created_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    value.manifest.artifact_manifest_id =
      "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FDK";
    value.manifest.artifact_id = value.artifact.artifact_id;
    value.manifest.rights_decision_id =
      "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FDK";
    value.manifest.storage_ref.object_key = `sha256/${contentHash.slice(7, 9)}/${contentHash.slice(9)}`;
    value.manifest.storage_ref.content_hash = contentHash;
    value.manifest.recorded_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    value.rightsDecision.rights_decision_id = value.manifest.rights_decision_id;
    value.rightsDecision.artifact_manifest_id =
      value.manifest.artifact_manifest_id;
    value.rightsDecision.source_location =
      "urn:petra:review-response:01ARZ3NDEKTSV4RRFFQ69G5FDK";
    value.rightsDecision.decision_maker = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    return value;
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

  const registerEvidenceChain = async (): Promise<void> => {
    await registerResearchIdentities();
    const source = sourceArtifactInput();
    await artifacts.registerVerifiedAcquisition(source);
    await artifacts.registerVerifiedAcquisition(parserArtifactInput(source));
    await documents.registerDocumentBundle(
      documentBundle(source.manifest.artifact_manifest_id),
    );
    await evidence.proposeClaim(claimFixture());
    await evidence.proposeAssertion(assertionFixture());
  };

  const commandFixtures = (): CommandFixtureSet => {
    const submit = readFixture<PetraCommandEnvelope>(
      "command-submit-change-set",
    );
    if (submit.command.command_name !== "SubmitChangeSet") {
      throw new Error("Expected SubmitChangeSet fixture.");
    }
    submit.actor = {
      actor_id: modelActor().actor_id,
      actor_kind: "model",
    };
    submit.command.change_set.content.proposed_by = structuredClone(
      submit.actor,
    );
    submit.command.change_set.content_hash = canonicalHash(
      submit.command.change_set.content,
    );

    const approve = readFixture<PetraCommandEnvelope>(
      "command-record-approval",
    );
    if (approve.command.command_name !== "RecordApproval") {
      throw new Error("Expected RecordApproval fixture.");
    }
    approve.command.approval.subject.change_set_content_hash =
      submit.command.change_set.content_hash;

    const apply = readFixture<PetraCommandEnvelope>("command-apply-change-set");
    if (apply.command.command_name !== "ApplyChangeSet") {
      throw new Error("Expected ApplyChangeSet fixture.");
    }
    apply.command.change_set_content_hash =
      submit.command.change_set.content_hash;
    return { submit, approve, apply };
  };

  const secondCommandFixtures = (): CommandFixtureSet => {
    const fixtures = commandFixtures();
    if (
      fixtures.submit.command.command_name !== "SubmitChangeSet" ||
      fixtures.approve.command.command_name !== "RecordApproval" ||
      fixtures.apply.command.command_name !== "ApplyChangeSet"
    ) {
      throw new Error("Expected command fixture discriminators.");
    }
    const changeSetId = "change_set_01ARZ3NDEKTSV4RRFFQ69G5FC1";
    const approvalId = "approval_01ARZ3NDEKTSV4RRFFQ69G5FC2";
    fixtures.submit.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FC3";
    fixtures.submit.idempotency_key = "review:claim-fbb:submit:competitor";
    fixtures.submit.command.change_set.change_set_id = changeSetId;
    fixtures.submit.command.change_set.content_hash = canonicalHash(
      fixtures.submit.command.change_set.content,
    );

    fixtures.approve.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FC4";
    fixtures.approve.idempotency_key = "review:claim-fbb:approve:competitor";
    fixtures.approve.causation_id = fixtures.submit.command_id;
    fixtures.approve.command.approval.approval_id = approvalId;
    fixtures.approve.command.approval.subject.change_set_id = changeSetId;
    fixtures.approve.command.approval.subject.change_set_content_hash =
      fixtures.submit.command.change_set.content_hash;

    fixtures.apply.command_id = "command_01ARZ3NDEKTSV4RRFFQ69G5FC5";
    fixtures.apply.idempotency_key = "review:claim-fbb:apply:competitor";
    fixtures.apply.causation_id = fixtures.approve.command_id;
    fixtures.apply.command.change_set_id = changeSetId;
    fixtures.apply.command.change_set_content_hash =
      fixtures.submit.command.change_set.content_hash;
    fixtures.apply.command.approval_id = approvalId;
    return fixtures;
  };

  const deterministicFactory = (
    options: { invalidFirstEvent?: boolean } = {},
  ): DomainRecordFactory => {
    let eventIndex = 0;
    let outboxIndex = 0;
    return {
      nextId: (kind) => {
        if (kind === "event") {
          eventIndex += 1;
          if (options.invalidFirstEvent && eventIndex === 1) {
            return "outbox_01ARZ3NDEKTSV4RRFFQ69G5FE0";
          }
          return `event_01ARZ3NDEKTSV4RRFFQ69G5F${String(eventIndex).padStart(2, "0")}`;
        }
        outboxIndex += 1;
        return `outbox_01ARZ3NDEKTSV4RRFFQ69G5F${String(outboxIndex + 20).padStart(2, "0")}`;
      },
      now: () => "2026-08-28T18:14:00.000Z",
    };
  };

  const authority = (
    factory = deterministicFactory(),
    authorized = true,
  ): PostgresChangeControlAuthorityRepository =>
    new PostgresChangeControlAuthorityRepository(
      pool,
      {
        authorize: async (_request, transaction) => {
          await transaction.query("SELECT 1");
          return authorized;
        },
      },
      factory,
    );

  const preparedCompensationPlan = async () => {
    await registerEvidenceChain();
    await capabilityGrants.registerCapabilityGrant(
      readFixture<PetraCapabilityGrantRecord>("capability-grant"),
    );
    const commands = commandFixtures();
    const repository = authority();
    await repository.executeCommand(commands.submit);
    await repository.executeCommand(commands.approve);
    const promotion = await repository.executeCommand(commands.apply);
    if (promotion.outcome !== "applied") {
      throw new Error("Expected an applied promotion pipeline.");
    }
    const events = await repository.getDomainEvents({
      projectId: commands.submit.project_id,
    });
    const appliedEvent = events.find(
      ({ event }) => event.event_type === "change_set.applied",
    );
    if (appliedEvent === undefined) {
      throw new Error("Expected the promotion's exact applied event.");
    }
    const preview =
      await authorizedHistoryViews.getProjectHistoryCompensationPreviewView(
        commands.submit.project_id,
        appliedEvent.event_id,
      );
    if (preview === undefined) {
      throw new Error("Expected an eligible compensation preview.");
    }
    const plan =
      await authorizedHistoryViews.composeProjectHistoryCompensationPlan({
        schema_name: "petra.project-history-compensation-plan-request",
        schema_version: "1.0.0",
        project_id: commands.submit.project_id,
        event_id: appliedEvent.event_id,
        preview_ref: {
          schema_name: preview.schema_name,
          schema_version: preview.schema_version,
          content_hash: preview.content_hash,
          binding_hash: preview.content.freshness.binding_hash,
          issued_at: preview.content.freshness.issued_at,
          valid_through: preview.content.freshness.valid_through,
        },
        confirmation: {
          confirmed: true,
          reason: "Retract the exact accepted pair through Project History.",
          approval_rationale:
            "The exact current authority supports this bounded compensation.",
        },
      });
    if (plan === undefined) {
      throw new Error("Expected one exact compensation command plan.");
    }
    const request: PetraProjectHistoryCompensationExecutionRequest = {
      schema_name: "petra.project-history-compensation-execution-request",
      schema_version: "1.0.0",
      project_id: plan.project_id,
      event_id: plan.event_id,
      plan: structuredClone(plan),
      execution_confirmation: {
        confirmed: true,
        acknowledged_atomicity:
          "per_command_transaction_not_three_command_atomic",
      },
    };
    return { commands, repository, promotion, appliedEvent, plan, request };
  };

  it("atomically promotes a Claim and ASSERTS edge with events and target-ordered outbox", async () => {
    await registerEvidenceChain();
    await scopes.registerActor(serviceActor());
    const commands = commandFixtures();
    if (
      commands.submit.command.command_name !== "SubmitChangeSet" ||
      commands.approve.command.command_name !== "RecordApproval" ||
      commands.apply.command.command_name !== "ApplyChangeSet"
    ) {
      throw new Error("Expected change-control command fixtures.");
    }
    const repository = authority();

    const emptyHistory = await historyViews.listRetainedProjectHistoryView(
      commands.submit.project_id,
    );
    expect(emptyHistory?.content.changes).toEqual([]);
    expect(emptyHistory?.content.page).toEqual({
      returned_count: 0,
      snapshot_total_count: 0,
      has_more: false,
    });
    expect(emptyHistory?.content.retention_snapshot).toEqual({
      through_event_position: 0,
      through_stream_revision: 0,
    });
    expect(emptyHistory?.schema_version).toBe("1.2.0");
    expect(emptyHistory?.content.filter_options).toMatchObject({
      dimension_semantics: "replace_same_dimension_preserve_other_filters",
      actor_catalogue: {
        returned_count: 0,
        total_count: 0,
        coverage: "complete",
      },
      target_catalogue: {
        returned_count: 0,
        total_count: 0,
        coverage: "complete",
      },
    });

    await expect(repository.executeCommand(commands.submit)).resolves.toEqual(
      expect.objectContaining({ outcome: "submitted" }),
    );
    await expect(repository.executeCommand(commands.approve)).resolves.toEqual(
      expect.objectContaining({
        outcome: "approval_recorded",
        change_set_state: "approved",
      }),
    );
    const retainedBeforeApply =
      await historyViews.listRetainedProjectHistoryView(
        commands.submit.project_id,
        { limit: 1 },
      );
    expect(retainedBeforeApply?.content.changes[0]?.event_ref.event_type).toBe(
      "approval.recorded",
    );
    expect(retainedBeforeApply?.content.page.snapshot_total_count).toBe(2);
    expect(retainedBeforeApply?.schema_version).toBe("1.2.0");
    expect(
      retainedBeforeApply?.content.filter_options.actor_catalogue.options.map(
        ({ actor_ref, display_descriptor, matching_event_count }) => ({
          actor_ref,
          display_name: display_descriptor.display_name,
          matching_event_count,
        }),
      ),
    ).toEqual([
      {
        actor_ref: {
          actor_id: commands.approve.actor.actor_id,
          actor_kind: "human",
        },
        display_name: "Researcher",
        matching_event_count: 1,
      },
      {
        actor_ref: {
          actor_id: commands.submit.actor.actor_id,
          actor_kind: "model",
        },
        display_name: "Petra extraction model",
        matching_event_count: 1,
      },
    ]);
    expect(
      retainedBeforeApply?.content.filter_options.target_catalogue.options.map(
        ({ target_ref, display_descriptor, matching_event_count }) => ({
          target_ref,
          descriptor_state: display_descriptor.state,
          matching_event_count,
        }),
      ),
    ).toEqual([
      {
        target_ref: {
          semantic_key: "petra.change-set",
          object_id: commands.submit.command.change_set.change_set_id,
        },
        descriptor_state: "exact_identity_only",
        matching_event_count: 2,
      },
      {
        target_ref: {
          semantic_key: "petra.approval",
          object_id: commands.approve.command.approval.approval_id,
        },
        descriptor_state: "exact_identity_only",
        matching_event_count: 1,
      },
    ]);
    expect(
      retainedBeforeApply?.content.retention_snapshot.through_stream_revision,
    ).toBe(2);
    const retainedFirstPage = retainedBeforeApply?.content.page;
    if (retainedFirstPage === undefined || !retainedFirstPage.has_more) {
      throw new Error("Expected retained History continuation.");
    }
    const retainedCursor = retainedFirstPage.next_cursor;
    const finalCursorCharacter = retainedCursor.at(-1);
    if (finalCursorCharacter === undefined) {
      throw new Error("Expected non-empty retained History cursor.");
    }
    const tamperedCursor = `${retainedCursor.slice(0, -1)}${finalCursorCharacter === "A" ? "B" : "A"}`;
    await expect(
      historyViews.listRetainedProjectHistoryView(commands.submit.project_id, {
        limit: 1,
        cursor: tamperedCursor,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_HISTORY_VIEW_REQUEST_INVALID",
      }),
    );
    await expect(
      historyViews.listRetainedProjectHistoryView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        { limit: 1, cursor: retainedCursor },
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_HISTORY_VIEW_REQUEST_INVALID",
      }),
    );
    await expect(
      historyViews.listRetainedProjectHistoryView(commands.submit.project_id, {
        limit: 2,
        cursor: retainedCursor,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_HISTORY_VIEW_REQUEST_INVALID",
      }),
    );
    await expect(
      historyViews.listRetainedProjectHistoryView(commands.submit.project_id, {
        limit: 1,
        cursor: retainedCursor,
        filters: { family: "change_control" },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_HISTORY_VIEW_REQUEST_INVALID",
      }),
    );
    const applied = await repository.executeCommand(commands.apply);
    if (applied.outcome !== "applied") {
      throw new Error("Expected applied ChangeSet result.");
    }
    expect(applied).toEqual(
      expect.objectContaining({
        outcome: "applied",
        claim_revision: 2,
        assertion_revision: 2,
      }),
    );
    const retainedAfterApply =
      await historyViews.listRetainedProjectHistoryView(
        commands.submit.project_id,
        { limit: 1, cursor: retainedCursor },
      );
    expect(
      retainedAfterApply?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual(["change_set.submitted"]);
    expect(retainedAfterApply?.content.page).toEqual({
      returned_count: 1,
      snapshot_total_count: 2,
      has_more: false,
    });
    expect(
      retainedAfterApply?.content.retention_snapshot.through_stream_revision,
    ).toBe(2);
    expect(
      retainedAfterApply?.content.current_authority.through_stream_revision,
    ).toBe(3);
    expect(retainedAfterApply?.content.filter_options).toEqual(
      retainedBeforeApply?.content.filter_options,
    );
    const filteredApplied = await historyViews.listRetainedProjectHistoryView(
      commands.submit.project_id,
      {
        limit: 10,
        filters: {
          family: "change_control",
          command_name: "ApplyChangeSet",
          event_type: "change_set.applied",
          actor_id: commands.apply.actor.actor_id,
          outcome: "completed",
          effect: "authority_change_applied",
          target: {
            semantic_key: "petra.change-set",
            object_id: commands.apply.command.change_set_id,
          },
          recorded_at: {
            from_inclusive: "2026-08-28T18:14:00.000Z",
            through_inclusive: "2026-08-28T18:14:00.000Z",
          },
        },
      },
    );
    expect(
      filteredApplied?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual(["change_set.applied"]);
    expect(filteredApplied?.content.page).toEqual({
      returned_count: 1,
      snapshot_total_count: 1,
      has_more: false,
    });
    expect(filteredApplied?.content.cursor_binding).toBe(
      "project_snapshot_and_complete_query",
    );
    expect(
      filteredApplied?.content.filter_options.actor_catalogue.options.map(
        ({ actor_ref, matching_event_count }) => [
          actor_ref.actor_id,
          matching_event_count,
        ],
      ),
    ).toEqual([[commands.apply.actor.actor_id, 1]]);
    const claimOperation =
      commands.submit.command.change_set.content.operations.find(
        ({ operation_kind }) => operation_kind === "promote_claim",
      );
    const assertionOperation =
      commands.submit.command.change_set.content.operations.find(
        ({ operation_kind }) => operation_kind === "promote_assertion",
      );
    if (claimOperation === undefined || assertionOperation === undefined) {
      throw new Error("Expected exact Claim and Assertion operations.");
    }
    expect(
      filteredApplied?.content.filter_options.target_catalogue.options.map(
        ({ target_ref, matching_event_count }) => [
          target_ref.semantic_key,
          target_ref.object_id,
          matching_event_count,
        ],
      ),
    ).toEqual([
      ["petra.change-set", commands.apply.command.change_set_id, 1],
      ["scientific.assertion", assertionOperation.target_id, 1],
      ["scientific.claim", claimOperation.target_id, 1],
    ]);
    const approvalFiltered = await historyViews.listRetainedProjectHistoryView(
      commands.submit.project_id,
      {
        filters: {
          target: {
            semantic_key: "petra.approval",
            object_id: commands.approve.command.approval.approval_id,
          },
        },
      },
    );
    expect(
      approvalFiltered?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual(["approval.recorded"]);
    for (const target of [
      {
        semantic_key: "scientific.claim" as const,
        object_id: claimOperation.target_id,
      },
      {
        semantic_key: "scientific.assertion" as const,
        object_id: assertionOperation.target_id,
      },
    ]) {
      const targetFiltered = await historyViews.listRetainedProjectHistoryView(
        commands.submit.project_id,
        { filters: { target } },
      );
      expect(
        targetFiltered?.content.changes.map(
          ({ event_ref }) => event_ref.event_type,
        ),
      ).toEqual(["change_set.applied"]);
    }
    const emptyFiltered = await historyViews.listRetainedProjectHistoryView(
      commands.submit.project_id,
      {
        filters: {
          actor_id: serviceActor().actor_id,
        },
      },
    );
    expect(emptyFiltered?.content.changes).toEqual([]);
    expect(emptyFiltered?.content.page).toEqual({
      returned_count: 0,
      snapshot_total_count: 0,
      has_more: false,
    });
    expect(
      emptyFiltered?.content.retention_snapshot.through_stream_revision,
    ).toBe(3);
    expect(
      emptyFiltered?.content.filter_options.actor_catalogue.options.map(
        ({ actor_ref, matching_event_count }) => [
          actor_ref.actor_id,
          matching_event_count,
        ],
      ),
    ).toEqual([
      [commands.apply.actor.actor_id, 2],
      [commands.submit.actor.actor_id, 1],
    ]);
    expect(
      emptyFiltered?.content.filter_options.target_catalogue.options,
    ).toEqual([]);
    await expect(repository.executeCommand(commands.apply)).resolves.toEqual(
      applied,
    );

    expect(await repository.getChangeSetState(applied.change_set_id)).toBe(
      "applied",
    );
    expect(await repository.getChangeSet(applied.change_set_id)).toEqual(
      (commands.submit.command as { change_set: unknown }).change_set,
    );
    expect(await repository.getApproval(applied.approval_id)).toEqual(
      (commands.approve.command as { approval: unknown }).approval,
    );

    const trustedClaim = await evidence.getClaim(applied.claim_id);
    const trustedAssertion = await evidence.getAssertion(applied.assertion_id);
    expect(trustedClaim?.revision).toBe(2);
    expect(trustedClaim?.authority.zone).toBe("trusted");
    expect(trustedClaim?.authority.review_state).toBe("human_accepted");
    expect(trustedAssertion?.revision).toBe(2);
    expect((await evidence.getClaim(applied.claim_id, 1))?.authority.zone).toBe(
      "quarantine",
    );
    const changeLocation = await objectLocations.locateProjectObject({
      project_id: commands.submit.project_id,
      object_ref: {
        semantic_key: "petra.change-set",
        object_id: applied.change_set_id,
      },
      task_intent: "review",
    });
    expect(changeLocation?.content.resolution.state).toBe("current");
    expect(changeLocation?.content.primary_destination.role).toBe("review");
    const assertionLocation = await objectLocations.locateProjectObject({
      project_id: commands.submit.project_id,
      object_ref: {
        semantic_key: "scientific.assertion",
        object_id: applied.assertion_id,
      },
      task_intent: "trace",
    });
    expect(assertionLocation?.content.resolution.state).toBe("current");
    expect(assertionLocation?.content.primary_destination.role).toBe("graph");

    const events = await repository.getDomainEvents({
      projectId: commands.submit.project_id,
    });
    expect(events.map((event) => event.event.event_type)).toEqual([
      "change_set.submitted",
      "approval.recorded",
      "change_set.applied",
    ]);
    expect(events.map((event) => event.event_position)).toEqual([1, 2, 3]);
    expect(events.map((event) => event.stream_revision)).toEqual([1, 2, 3]);
    const recentHistory = await historyViews.getRecentProjectHistoryView(
      commands.submit.project_id,
    );
    expect(
      recentHistory?.content.changes.map(({ event_ref }) => [
        event_ref.schema_version,
        event_ref.event_type,
      ]),
    ).toEqual([
      ["1.0.0", "change_set.applied"],
      ["1.0.0", "approval.recorded"],
      ["1.0.0", "change_set.submitted"],
    ]);
    expect(
      recentHistory?.content.changes.every(
        ({ recovery }) => recovery.eligibility === "ineligible",
      ),
    ).toBe(true);
    const approvalEvent = events[1];
    if (approvalEvent === undefined) {
      throw new Error("Expected the approval event.");
    }
    const approvalEpisode = await historyViews.getProjectHistoryEpisodeView(
      commands.submit.project_id,
      approvalEvent.event_id,
    );
    expect(approvalEpisode?.content.causality.parent_command).toEqual(
      expect.objectContaining({
        command_id: commands.submit.command_id,
        event_state: "recorded",
      }),
    );
    expect(approvalEpisode?.content.causality.following_commands).toEqual([
      expect.objectContaining({
        command_id: commands.apply.command_id,
        event_state: "recorded",
      }),
    ]);
    expect(
      approvalEpisode?.content.stream_order.previous_event_ref?.event_id,
    ).toBe(events[0]?.event_id);
    expect(approvalEpisode?.content.stream_order.next_event_ref?.event_id).toBe(
      events[2]?.event_id,
    );
    expect(approvalEpisode?.content.receipt_ref).toBeUndefined();

    const submittedEvent = events[0];
    if (submittedEvent === undefined) {
      throw new Error("Expected the submitted ChangeSet event.");
    }
    const submittedImpact = await historyViews.getProjectHistoryImpactView(
      commands.submit.project_id,
      submittedEvent.event_id,
    );
    expect(submittedImpact?.content.selected_event).toMatchObject({
      command_ref: { command_id: commands.submit.command_id },
      event_ref: { event_id: submittedEvent.event_id },
    });
    const submittedCausalCommands =
      submittedImpact?.content.impact.causal_commands.refs;
    expect(submittedCausalCommands).toHaveLength(1);
    const submittedCausalCommand = submittedCausalCommands?.[0];
    expect(submittedCausalCommand?.command_ref.command_id).toBe(
      commands.approve.command_id,
    );
    expect(submittedCausalCommand?.outcome).toBe("success");
    expect(submittedCausalCommand?.event_state).toBe("recorded");
    if (submittedCausalCommand?.event_state !== "recorded") {
      throw new Error(
        "Expected the approval command to have a recorded event.",
      );
    }
    expect(submittedCausalCommand.event_ref.event_id).toBe(
      approvalEvent.event_id,
    );
    expect(submittedImpact?.content.impact.outbox_records).toMatchObject({
      authority_source: "immutable_event_outbox_binding",
      total_count: 1,
      returned_count: 1,
      coverage: "complete",
    });
    expect(submittedImpact?.content.authority).toEqual({
      isolation: "repeatable_read",
      through_event_position: 3,
      through_stream_revision: 3,
    });
    expect(submittedImpact?.content.decision_boundary).toEqual({
      reversibility: "not_assessed",
      compensation: "not_composed",
      dependent_effect: "not_inferred_from_reference",
    });
    expect(submittedImpact?.schema_version).toBe("1.4.0");
    expect(submittedImpact?.content.semantic_target_impact).toMatchObject({
      target_total_count: 1,
      target_returned_count: 1,
      target_coverage: "complete",
      summary: {
        registered_adapter_count: 9,
        assessed_target_count: 1,
        supported_target_count: 1,
        total_count: 3,
        coverage: "complete",
      },
    });
    const submittedTargetAssessment =
      submittedImpact?.content.semantic_target_impact.target_assessments[0];
    expect(submittedTargetAssessment?.adapter_state).toBe("registered");
    expect(submittedTargetAssessment?.groups).toHaveLength(1);
    expect(submittedTargetAssessment?.groups[0]).toMatchObject({
      adapter_kind: "change_control",
      authority_source: "immutable_change_control_target_bindings",
      total_count: 3,
      returned_count: 3,
      coverage: "complete",
    });
    expect(
      submittedTargetAssessment?.groups[0]?.refs.map(
        ({ relation }) => relation,
      ),
    ).toEqual([
      "approves_exact_change_set",
      "authorized_by_exact_change_set",
      "authorized_by_exact_change_set",
    ]);
    expect(
      submittedImpact?.content.operational_dependency_impact,
    ).toMatchObject({
      target_total_count: 1,
      target_returned_count: 1,
      summary: {
        registered_adapter_count: 3,
        assessed_target_count: 1,
        supported_target_count: 1,
        total_count: 0,
        coverage: "complete",
      },
    });
    expect(
      await historyViews.getProjectHistoryImpactView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        submittedEvent.event_id,
      ),
    ).toBeUndefined();

    const appliedEvent = events[2];
    if (appliedEvent === undefined) {
      throw new Error("Expected the applied ChangeSet event.");
    }
    const appliedImpact = await historyViews.getProjectHistoryImpactView(
      commands.submit.project_id,
      appliedEvent.event_id,
    );
    expect(appliedImpact?.content.impact.outbox_records.refs).toHaveLength(2);
    expect(
      appliedImpact?.content.impact.outbox_records.refs.map(
        ({ target }) => target,
      ),
    ).toEqual(["neo4j_graph", "interface_authority"]);
    expect(appliedImpact?.content.impact.summary.total_count).toBe(2);
    expect(
      appliedImpact?.content.semantic_target_impact.target_assessments,
    ).toHaveLength(3);
    expect(
      appliedImpact?.content.semantic_target_impact.target_assessments.map(
        ({ adapter_state, groups }) => [adapter_state, groups.length],
      ),
    ).toEqual([
      ["registered", 1],
      ["registered", 4],
      ["registered", 4],
    ]);

    const replayedAuthority = replayScientificAuthority(
      commands.submit.project_id,
      events,
    );
    expect(replayedAuthority.claims).toEqual([trustedClaim]);
    expect(replayedAuthority.assertions).toEqual([trustedAssertion]);
    expect(replayedAuthority.appliedChangeSetIds).toEqual([
      applied.change_set_id,
    ]);

    const interfaceOutbox = await repository.getOutboxRecords({
      projectId: commands.submit.project_id,
      target: "interface_authority",
    });
    const graphOutbox = await repository.getOutboxRecords({
      projectId: commands.submit.project_id,
      target: "neo4j_graph",
    });
    expect(interfaceOutbox.map((record) => record.target_sequence)).toEqual([
      1, 2, 3,
    ]);
    expect(graphOutbox.map((record) => record.target_sequence)).toEqual([1]);
    expect(graphOutbox[0]?.message.event).toEqual(events[2]);

    const authorization = await pool.query<{
      evidence_kind: string;
      evidence_revision: string;
      admission_kind: string;
      change_set_id: string;
      approval_id: string;
    }>(
      `SELECT evidence_kind, evidence_revision::text, admission_kind,
              change_set_id, approval_id
         FROM petra.evidence_revision_authorizations
        ORDER BY evidence_kind`,
    );
    expect(authorization.rows).toEqual([
      {
        evidence_kind: "assertion",
        evidence_revision: "2",
        admission_kind: "promotion",
        change_set_id: applied.change_set_id,
        approval_id: applied.approval_id,
      },
      {
        evidence_kind: "claim",
        evidence_revision: "2",
        admission_kind: "promotion",
        change_set_id: applied.change_set_id,
        approval_id: applied.approval_id,
      },
    ]);
  });

  it("enumerates exact record-bound Work, output, and delivery dependencies without cross-Project leakage", async () => {
    await registerEvidenceChain();
    await scopes.registerActor(serviceActor());
    const commands = commandFixtures();
    if (commands.submit.command.command_name !== "SubmitChangeSet") {
      throw new Error("Expected the submitted ChangeSet fixture.");
    }
    const submittedChangeSet = commands.submit.command.change_set;
    const repository = authority();
    await repository.executeCommand(commands.submit);
    const submittedEvent = (
      await repository.getDomainEvents({
        projectId: commands.submit.project_id,
      })
    )[0];
    if (submittedEvent === undefined) {
      throw new Error("Expected the submitted ChangeSet event.");
    }
    const targetRecordHash = canonicalHash(submittedChangeSet);

    const boundWorkRegistration = (
      projectId: string,
      workUnitId: string,
      inputManifestId: string,
      idempotencyKey: string,
    ) => {
      const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
      const inputManifest = readFixture<PetraWorkerInputManifest>(
        "worker-input-manifest",
      );
      const creator = {
        actor_id: serviceActor().actor_id,
        actor_kind: "service" as const,
      };
      inputManifest.worker_input_manifest_id = inputManifestId;
      inputManifest.work_unit_id = workUnitId;
      inputManifest.project_id = projectId;
      inputManifest.issued_by = creator;
      inputManifest.content.inputs = [
        {
          binding_kind: "record",
          name: "history_target",
          record_id: submittedChangeSet.change_set_id,
          record_revision: submittedChangeSet.revision,
          snapshot_hash: targetRecordHash,
        },
      ];
      inputManifest.content_hash = canonicalHash(inputManifest.content);

      workUnit.work_unit_id = workUnitId;
      workUnit.project_id = projectId;
      workUnit.created_by = creator;
      workUnit.spec.idempotency_key = idempotencyKey;
      workUnit.spec.cache = {
        cache_mode: "reuse_exact",
        cache_key: idempotencyKey,
      };
      workUnit.spec.input_manifest_ref = {
        worker_input_manifest_id: inputManifestId,
        content_hash: inputManifest.content_hash,
      };
      workUnit.spec_hash = canonicalHash(workUnit.spec);
      return { workUnit, inputManifest };
    };

    const registration = boundWorkRegistration(
      commands.submit.project_id,
      "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
      "worker_input_manifest_01ARZ3NDEKTSV4RRFFQ69G5FC3",
      "history-impact:work:primary",
    );
    await workUnits.register(registration);
    const queued = await workUnits.queue(
      registration.workUnit.work_unit_id,
      1,
      "2026-09-10T18:00:01.000Z",
    );
    const running = await workUnits.start(
      registration.workUnit.work_unit_id,
      queued.revision,
      1,
      "2026-09-10T18:00:02.000Z",
    );
    const output = readFixture<PetraWorkerOutputManifest>(
      "worker-output-manifest",
    );
    output.work_unit_id = registration.workUnit.work_unit_id;
    output.project_id = registration.workUnit.project_id;
    output.worker_input_manifest_id =
      registration.inputManifest.worker_input_manifest_id;
    output.worker_input_manifest_hash = registration.inputManifest.content_hash;
    output.content.started_at = "2026-09-10T18:00:02.000Z";
    output.content.completed_at = "2026-09-10T18:00:03.000Z";
    output.reported_at = "2026-09-10T18:00:03.000Z";
    output.content_hash = canonicalHash(output.content);
    const completed = await workUnits.complete(output, running.revision);

    const feature = readFixture<PetraInteractionFeatureManifest>(
      "interaction-feature-manifest",
    );
    feature.compiled_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    await interactions.registerFeatureManifest(feature);
    const run = readFixture<PetraInteractionRun>("interaction-run");
    run.content.correlation.work_unit_ref = {
      work_unit_id: completed.work_unit_id,
      revision: completed.revision,
      spec_hash: completed.spec_hash,
    };
    run.content_hash = canonicalHash(run.content);
    await interactions.registerRun(run);
    const interactionEvent = readFixture<PetraInteractionEventRecord>(
      "interaction-event-record",
    );
    interactionEvent.interaction_run_ref = {
      interaction_run_id: run.interaction_run_id,
      revision: run.revision,
      content_hash: run.content_hash,
    };
    interactionEvent.recorded_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    const interactionPayloadArtifact = parserArtifactInput(
      sourceArtifactInput(),
    ).artifact;
    interactionEvent.content.payload_artifact_ref = {
      artifact_id: interactionPayloadArtifact.artifact_id,
      content_sha256: interactionPayloadArtifact.content_hash,
      byte_size: interactionPayloadArtifact.byte_size,
      media_type: interactionPayloadArtifact.media_type,
    };
    interactionEvent.content_hash = canonicalHash(interactionEvent.content);
    await interactions.appendEvent(interactionEvent);
    const replay = readFixture<PetraInteractionReplayRecord>(
      "interaction-replay-record",
    );
    replay.interaction_run_ref = structuredClone(
      interactionEvent.interaction_run_ref,
    );
    replay.content.delivered_event_refs = [
      {
        interaction_event_record_id:
          interactionEvent.interaction_event_record_id,
        sequence: interactionEvent.sequence,
        content_hash: interactionEvent.content_hash,
      },
    ];
    replay.content.work_unit_observation = {
      work_unit_id: completed.work_unit_id,
      revision: completed.revision,
      status: "succeeded",
    };
    replay.recorded_by = {
      actor_id: serviceActor().actor_id,
      actor_kind: "service",
    };
    replay.content_hash = canonicalHash(replay.content);
    await interactions.registerReplay(replay);

    const otherProject = readFixture<PetraProject>("project");
    otherProject.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    otherProject.name = "Operational dependency isolation";
    await scopes.registerProjectRevision(otherProject);
    await workUnits.register(
      boundWorkRegistration(
        otherProject.project_id,
        "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FE2",
        "worker_input_manifest_01ARZ3NDEKTSV4RRFFQ69G5FE3",
        "history-impact:work:other-project",
      ),
    );

    const impact = await historyViews.getProjectHistoryImpactView(
      commands.submit.project_id,
      submittedEvent.event_id,
    );
    expect(impact?.schema_version).toBe("1.4.0");
    expect(impact?.content.operational_dependency_impact).toMatchObject({
      scope: "registered_exact_operational_dependents",
      target_total_count: 1,
      target_returned_count: 1,
      summary: {
        registered_adapter_count: 3,
        assessed_target_count: 1,
        supported_target_count: 1,
        total_count: 3,
        coverage: "complete",
      },
    });
    const assessment =
      impact?.content.operational_dependency_impact.target_assessments[0];
    expect(assessment?.adapter_state).toBe("registered");
    if (assessment?.adapter_state !== "registered") {
      throw new Error("Expected exact operational target authority.");
    }
    expect(assessment.resolved_target_record).toEqual({
      semantic_key: "petra.change-set",
      object_id: submittedChangeSet.change_set_id,
      revision: 1,
      content_hash: submittedChangeSet.content_hash,
      record_hash: targetRecordHash,
      authority_source: "resolved_immutable_semantic_authority",
    });
    expect(
      assessment.groups.map(({ adapter_kind, total_count }) => [
        adapter_kind,
        total_count,
      ]),
    ).toEqual([
      ["work_input_binding", 1],
      ["work_output", 1],
      ["interaction_delivery", 1],
    ]);
    expect(assessment.groups[0].refs[0]).toMatchObject({
      object_id: completed.work_unit_id,
      revision: completed.revision,
      posture: "current",
      input_binding_ref: {
        record_id: submittedChangeSet.change_set_id,
        record_revision: 1,
        snapshot_hash: targetRecordHash,
      },
      destination: {
        state: "available",
        place_role: "work",
        task_intent: "inspect",
        object_ref: {
          semantic_key: "petra.work-unit",
          object_id: completed.work_unit_id,
          revision: completed.revision,
        },
        route_authority: {
          schema_name: "petra.project-work-view",
          schema_version: "1.0.0",
          view_kind: "detail",
          authority_source: "current_project_definition_and_project_work_view",
        },
      },
    });
    expect(assessment.groups[1].refs[0]).toMatchObject({
      object_id: output.worker_output_manifest_id,
      relation: "reports_output_for_work_using_exact_history_target",
      destination: {
        state: "unavailable",
        reason_code: "worker_output_manifest_route_not_registered",
      },
    });
    expect(assessment.groups[2].refs[0]).toMatchObject({
      object_id: replay.interaction_replay_record_id,
      relation: "delivers_interaction_for_work_using_exact_history_target",
      interaction_run_ref: {
        interaction_run_id: run.interaction_run_id,
        revision: run.revision,
        content_hash: run.content_hash,
      },
      destination: {
        state: "unavailable",
        reason_code: "interaction_replay_record_route_not_registered",
      },
    });
    expect(
      assessment.groups.flatMap(({ refs }) =>
        refs.map(({ work_unit_ref }) => work_unit_ref.work_unit_id),
      ),
    ).not.toContain("work_unit_01ARZ3NDEKTSV4RRFFQ69G5FE2");
    expect(impact?.content.decision_boundary.dependent_effect).toBe(
      "not_inferred_from_reference",
    );
    expect(impact?.content.omissions).toContain(
      "cross_family_total_order_not_asserted",
    );

    const definitionWithoutWork = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    definitionWithoutWork.revision = 2;
    definitionWithoutWork.content.supported_places = [
      "brief",
      "sources",
      "review",
      "graph",
      "petra",
      "composition",
      "history",
      "settings",
    ];
    definitionWithoutWork.content_hash = canonicalHash(
      definitionWithoutWork.content,
    );
    definitionWithoutWork.created_at = "2026-09-10T18:00:04.000Z";
    await definitions.registerDefinitionRevision(definitionWithoutWork);
    const impactWithoutWork = await historyViews.getProjectHistoryImpactView(
      commands.submit.project_id,
      submittedEvent.event_id,
    );
    const assessmentWithoutWork =
      impactWithoutWork?.content.operational_dependency_impact
        .target_assessments[0];
    if (assessmentWithoutWork?.adapter_state !== "registered") {
      throw new Error("Expected operational impact without a Work place.");
    }
    expect(assessmentWithoutWork.groups[0].refs[0]?.destination).toEqual({
      state: "unavailable",
      reason_code: "project_work_route_authority_unavailable",
      reason:
        "The current ProjectDefinition does not authorize the exact Project Work detail destination.",
    });
  });

  it("executes a generated review plan through the durable command boundary", async () => {
    await registerEvidenceChain();
    const repository = authority();
    const candidate = readFixture<PetraEvidenceProposalBundle>(
      "evidence-proposal-bundle",
    ).content.candidates[0];
    candidate.claim = claimFixture();
    candidate.assertion = assertionFixture();
    const reviewer = readFixture<PetraActor>("actor");
    const plan = buildReviewDecisionCommandPlan({
      project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
      candidate,
      origin: "agent_proposal",
      proposed_by: candidate.claim.created_by,
      reviewer: {
        actor_id: reviewer.actor_id,
        actor_kind: "human",
      },
      capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
      decision: "accepted",
      reason: "Promote the independently reviewed evidence pair.",
      rationale: "The exact source and scoped representation agree.",
      impact_summary:
        "The Claim and ASSERTS edge become trusted representations.",
      timing: {
        proposed_at: "2026-08-28T18:12:30.000Z",
        decided_at: "2026-08-28T18:13:00.000Z",
        applied_at: "2026-08-28T18:13:01.000Z",
      },
    });

    const result = await executeReviewDecisionPlan(repository, plan);

    expect(result).toMatchObject({
      outcome: "applied",
      candidate_id: candidate.candidate_id,
      claim_revision: 2,
      assertion_revision: 2,
    });
    expect(
      await repository.getChangeSet(plan.change_set.change_set_id),
    ).toEqual(plan.change_set);
    expect(
      (await evidence.getClaim(candidate.claim.claim_id))?.authority.zone,
    ).toBe("trusted");
  });

  it("resolves one durable interaction interrupt through the same PostgreSQL review commands", async () => {
    await registerEvidenceChain();
    const service = serviceActor();
    await scopes.registerActor(service);
    const serviceRef = {
      actor_id: service.actor_id,
      actor_kind: "service" as const,
    };
    const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
    const inputManifest = readFixture<PetraWorkerInputManifest>(
      "worker-input-manifest",
    );
    workUnit.created_by = serviceRef;
    inputManifest.issued_by = serviceRef;
    await workUnits.register({ workUnit, inputManifest });

    const candidate = readFixture<PetraEvidenceProposalBundle>(
      "evidence-proposal-bundle",
    ).content.candidates[0];
    candidate.claim = claimFixture();
    candidate.assertion = assertionFixture();
    const reviewer = readFixture<PetraActor>("actor");
    const actor = {
      actor_id: reviewer.actor_id,
      actor_kind: "human" as const,
    };
    const capabilityGrantId = "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FDF";
    const response = readFixture<PetraReviewInterruptResponse>(
      "review-interrupt-response",
    );
    const buildPlan = (input: {
      decision: "accepted" | "rejected";
      rationale: string;
      decided_at: string;
      actor: typeof actor;
      capability_grant_id: string;
    }) =>
      buildReviewDecisionCommandPlan({
        project_id: response.project_id,
        candidate,
        origin: "agent_proposal",
        proposed_by: candidate.claim.created_by,
        reviewer: input.actor,
        capability_grant_id: input.capability_grant_id,
        decision: input.decision,
        reason: "Review the exact source-grounded Claim and ASSERTS pair.",
        rationale: input.rationale,
        impact_summary:
          "This decision changes representation authority, not the proposition's truth value.",
        timing: {
          proposed_at: "2026-08-29T16:00:02.000Z",
          decided_at: input.decided_at,
          applied_at: input.decided_at,
        },
      });
    const plan = buildPlan({
      decision: "accepted",
      rationale: response.rationale,
      decided_at: response.decided_at,
      actor,
      capability_grant_id: capabilityGrantId,
    });

    const feature = readFixture<PetraInteractionFeatureManifest>(
      "interaction-feature-manifest",
    );
    feature.compiled_by = serviceRef;
    const run = readFixture<PetraInteractionRun>("interaction-run");
    const parserArtifact = parserArtifactInput(sourceArtifactInput()).artifact;
    const event = readFixture<PetraInteractionEventRecord>(
      "interaction-event-record",
    );
    event.recorded_by = serviceRef;
    event.content.payload_artifact_ref = {
      artifact_id: parserArtifact.artifact_id,
      content_sha256: parserArtifact.content_hash,
      byte_size: parserArtifact.byte_size,
      media_type: parserArtifact.media_type,
    };
    event.content_hash = canonicalHash(event.content);
    const pending = readFixture<PetraInteractionInterrupt>(
      "interaction-interrupt-pending",
    );
    if (pending.content.state !== "pending") {
      throw new Error("Expected a pending interaction fixture.");
    }
    pending.recorded_by = serviceRef;
    pending.content.request_event_ref.content_hash = event.content_hash;
    pending.content.prompt_artifact_ref = structuredClone(
      event.content.payload_artifact_ref,
    );
    pending.content.subject_refs = [plan.change_set.change_set_id];
    pending.content.response_schema_ref = {
      schema_name: "review-interrupt-response",
      schema_version: "1.0.0",
      content_hash:
        "sha256:81a8a6771e1e7155681741b024f94862bf0e4c1cb7b8ff737b2fcf14f2a20306",
    };
    pending.content_hash = canonicalHash(pending.content);
    response.interrupt_ref = {
      interaction_interrupt_id: pending.interaction_interrupt_id,
      revision: pending.revision,
      content_hash: pending.content_hash,
    };
    response.change_set_ref = {
      change_set_id: plan.change_set.change_set_id,
      revision: plan.change_set.revision,
      content_hash: plan.change_set.content_hash,
    };

    await interactions.registerFeatureManifest(feature);
    await interactions.registerRun(run);
    await interactions.appendEvent(event);
    await interactions.registerInterrupt(pending);
    const responseArtifact = responseArtifactInput(
      sourceArtifactInput(),
      response,
    );
    await artifacts.registerVerifiedAcquisition(responseArtifact);

    const commands = authority();
    const coordinator = new DurableReviewInterruptCoordinator({
      repository: interactions,
      executor: commands,
      payloads: {
        recordResponse: () => ({
          artifact_id: responseArtifact.artifact.artifact_id,
          content_sha256: responseArtifact.artifact.content_hash,
          byte_size: responseArtifact.artifact.byte_size,
          media_type: responseArtifact.artifact.media_type,
        }),
      },
      authorizer: { authorize: () => true },
      serviceActor: serviceRef,
    });
    coordinator.registerBinding({
      presentation: {
        protocol_run_id: run.content.correlation.protocol_run_id,
        project_id: pending.project_id,
        interaction_run_id: pending.interaction_run_ref.interaction_run_id,
        interrupt_ref: structuredClone(response.interrupt_ref),
        change_set_ref: structuredClone(response.change_set_ref),
      },
      authority_context: {
        actor,
        capability_grant_id: capabilityGrantId,
      },
      buildPlan,
    });

    await expect(
      coordinator.presentReview(run.content.correlation.protocol_run_id),
    ).resolves.toMatchObject({ change_set_ref: response.change_set_ref });
    const first = await coordinator.resolveReview(response, {
      actor,
      capability_grant_id: capabilityGrantId,
    });
    const replay = await coordinator.resolveReview(response, {
      actor,
      capability_grant_id: capabilityGrantId,
    });

    expect(first).toMatchObject({
      replayed: false,
      result: { outcome: "applied", claim_revision: 2 },
    });
    expect(replay).toMatchObject({
      replayed: true,
      result: { outcome: "applied", claim_revision: 2 },
    });
    expect(
      (await evidence.getClaim(candidate.claim.claim_id))?.authority.zone,
    ).toBe("trusted");
    const durableCounts = await pool.query<{
      interrupt_revisions: string;
      command_executions: string;
      applied_events: string;
    }>(
      `SELECT
         (SELECT count(*)::text
            FROM petra.interaction_interrupt_revisions
           WHERE interaction_interrupt_id = $1) AS interrupt_revisions,
         (SELECT count(*)::text FROM petra.command_executions) AS command_executions,
         (SELECT count(*)::text
            FROM petra.domain_events
           WHERE event_type = 'change_set.applied') AS applied_events`,
      [pending.interaction_interrupt_id],
    );
    expect(durableCounts.rows[0]).toEqual({
      interrupt_revisions: "2",
      command_executions: "3",
      applied_events: "1",
    });
  });

  it("durably reverses a trusted pair while preserving every prior revision", async () => {
    await registerEvidenceChain();
    await capabilityGrants.registerCapabilityGrant(
      readFixture<PetraCapabilityGrantRecord>("capability-grant"),
    );
    const commands = commandFixtures();
    const repository = authority();
    await repository.executeCommand(commands.submit);
    await repository.executeCommand(commands.approve);
    const promoted = await repository.executeCommand(commands.apply);
    if (
      promoted.outcome !== "applied" ||
      commands.submit.command.command_name !== "SubmitChangeSet" ||
      commands.approve.command.command_name !== "RecordApproval"
    ) {
      throw new Error("Expected an applied promotion pipeline.");
    }
    const trustedClaim = await evidence.getClaim(promoted.claim_id);
    const trustedAssertion = await evidence.getAssertion(promoted.assertion_id);
    if (trustedClaim === undefined || trustedAssertion === undefined) {
      throw new Error("Expected current trusted evidence.");
    }
    const promotionEvents = await repository.getDomainEvents({
      projectId: commands.submit.project_id,
    });
    const appliedEvent = promotionEvents.find(
      ({ event }) => event.event_type === "change_set.applied",
    );
    if (appliedEvent === undefined) {
      throw new Error("Expected the exact promotion event.");
    }
    const unavailablePrincipalAssessment =
      await historyViews.getProjectHistoryRecoveryAssessmentView(
        commands.submit.project_id,
        appliedEvent.event_id,
      );
    expect(unavailablePrincipalAssessment?.content.assessment).toMatchObject({
      state: "blocked",
      blockers: [
        { code: "command_authority_missing" },
        { code: "command_authority_missing" },
        { code: "command_authority_missing" },
      ],
    });
    const eligibleAssessment =
      await authorizedHistoryViews.getProjectHistoryRecoveryAssessmentView(
        commands.submit.project_id,
        appliedEvent.event_id,
      );
    expect(eligibleAssessment?.content.assessment).toMatchObject({
      state: "eligible_for_preview",
      blockers: [],
    });
    expect(
      eligibleAssessment?.content.command_authority.required_commands.map(
        ({ state }) => state,
      ),
    ).toEqual(["granted", "granted", "granted"]);
    expect(eligibleAssessment?.content.decision_boundary).toEqual({
      reversibility: "assessed_for_exact_change_set",
      compensation_preview: "not_composed",
      compensation_execution: "not_performed",
      multi_step_compensation: "not_assessed",
    });
    const beforePreview = await pool.query<{
      change_sets: string;
      approvals: string;
      commands: string;
      events: string;
      evidence_revisions: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.change_sets) AS change_sets,
         (SELECT count(*)::text FROM petra.approvals) AS approvals,
         (SELECT count(*)::text FROM petra.command_executions) AS commands,
         (SELECT count(*)::text FROM petra.domain_events) AS events,
         (SELECT count(*)::text FROM petra.evidence_entity_revisions)
           AS evidence_revisions`,
    );
    const preview =
      await authorizedHistoryViews.getProjectHistoryCompensationPreviewView(
        commands.submit.project_id,
        appliedEvent.event_id,
      );
    expect(preview?.content).toMatchObject({
      compensates_change_set: {
        change_set_id: promoted.change_set_id,
        current_state: "applied",
      },
      operation_preview: [
        {
          operation_kind: "retract_claim",
          target_id: promoted.claim_id,
          base_revision: 2,
        },
        {
          operation_kind: "retract_assertion",
          target_id: promoted.assertion_id,
          base_revision: 2,
        },
      ],
      result_preview: [
        { object_id: promoted.claim_id, resulting_revision: 3 },
        { object_id: promoted.assertion_id, resulting_revision: 3 },
      ],
      change_set_composition: "deferred_until_confirmed_input",
      decision_boundary: {
        preview: "read_only",
        change_set: "not_created",
        approval: "not_recorded",
        commands: "not_composed_or_executed",
      },
    });
    expect(
      Date.parse(preview?.content.freshness.valid_through ?? "") -
        Date.parse(preview?.content.freshness.issued_at ?? ""),
    ).toBe(300_000);
    expect(preview?.content.freshness.binding_hash).toMatch(
      /^sha256:[0-9a-f]{64}$/u,
    );
    const afterPreview = await pool.query<{
      change_sets: string;
      approvals: string;
      commands: string;
      events: string;
      evidence_revisions: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.change_sets) AS change_sets,
         (SELECT count(*)::text FROM petra.approvals) AS approvals,
         (SELECT count(*)::text FROM petra.command_executions) AS commands,
         (SELECT count(*)::text FROM petra.domain_events) AS events,
         (SELECT count(*)::text FROM petra.evidence_entity_revisions)
           AS evidence_revisions`,
    );
    expect(afterPreview.rows[0]).toEqual(beforePreview.rows[0]);
    if (preview === undefined) {
      throw new Error("Expected an eligible compensation preview.");
    }
    const planRequest: PetraProjectHistoryCompensationPlanRequest = {
      schema_name: "petra.project-history-compensation-plan-request",
      schema_version: "1.0.0",
      project_id: commands.submit.project_id,
      event_id: appliedEvent.event_id,
      preview_ref: {
        schema_name: preview.schema_name,
        schema_version: preview.schema_version,
        content_hash: preview.content_hash,
        binding_hash: preview.content.freshness.binding_hash,
        issued_at: preview.content.freshness.issued_at,
        valid_through: preview.content.freshness.valid_through,
      },
      confirmation: {
        confirmed: true,
        reason: "Retract the exact accepted pair after explicit confirmation.",
        approval_rationale:
          "The exact current authority and retained impact basis support this bounded compensation.",
      },
    };
    const commandPlan =
      await authorizedHistoryViews.composeProjectHistoryCompensationPlan(
        planRequest,
      );
    expect(commandPlan?.content).toMatchObject({
      preview_ref: planRequest.preview_ref,
      confirmation: { state: "explicitly_confirmed" },
      revalidation: { state: "passed", preview_expiry: "unexpired" },
      change_set: {
        schema_version: "1.1.0",
        content: {
          compensates_change_set_id: promoted.change_set_id,
          reason: planRequest.confirmation.reason,
        },
      },
      approval: {
        decision: "approved",
        rationale: planRequest.confirmation.approval_rationale,
      },
      persistence: {
        change_set: "not_persisted",
        approval: "not_persisted",
        commands: "not_persisted",
      },
      execution: {
        state: "not_performed",
        requires_separate_request: true,
        authority_recheck: "required_at_each_command",
      },
    });
    expect(
      commandPlan?.content.commands.map(
        ({ command_name, envelope, state }) => ({
          command_name,
          envelope_command: envelope.command.command_name,
          state,
        }),
      ),
    ).toEqual([
      {
        command_name: "SubmitChangeSet",
        envelope_command: "SubmitChangeSet",
        state: "composed_not_submitted",
      },
      {
        command_name: "RecordApproval",
        envelope_command: "RecordApproval",
        state: "composed_not_submitted",
      },
      {
        command_name: "ApplyChangeSet",
        envelope_command: "ApplyChangeSet",
        state: "composed_not_submitted",
      },
    ]);
    const afterPlan = await pool.query<{
      change_sets: string;
      approvals: string;
      commands: string;
      events: string;
      evidence_revisions: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.change_sets) AS change_sets,
         (SELECT count(*)::text FROM petra.approvals) AS approvals,
         (SELECT count(*)::text FROM petra.command_executions) AS commands,
         (SELECT count(*)::text FROM petra.domain_events) AS events,
         (SELECT count(*)::text FROM petra.evidence_entity_revisions)
           AS evidence_revisions`,
    );
    expect(afterPlan.rows[0]).toEqual(beforePreview.rows[0]);
    const tamperedPlanRequest = structuredClone(planRequest);
    tamperedPlanRequest.preview_ref.binding_hash =
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    await expect(
      authorizedHistoryViews.composeProjectHistoryCompensationPlan(
        tamperedPlanRequest,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_HISTORY_COMPENSATION_PLAN_UNAVAILABLE",
    });
    await expect(
      authorizedHistoryViews.composeProjectHistoryCompensationPlan({
        ...planRequest,
        project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
      }),
    ).resolves.toBeUndefined();
    const overlappingGrant =
      readFixture<PetraCapabilityGrantRecord>("capability-grant");
    overlappingGrant.capability_grant_id =
      "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBH";
    overlappingGrant.content.reason =
      "Deliberately overlap the exact recovery commands for ambiguity coverage.";
    overlappingGrant.content_hash = canonicalHash(overlappingGrant.content);
    await capabilityGrants.registerCapabilityGrant(overlappingGrant);
    const ambiguousAssessment =
      await authorizedHistoryViews.getProjectHistoryRecoveryAssessmentView(
        commands.submit.project_id,
        appliedEvent.event_id,
      );
    expect(
      ambiguousAssessment?.content.assessment.state === "blocked"
        ? ambiguousAssessment.content.assessment.blockers.map(
            ({ code }) => code,
          )
        : [],
    ).toEqual([
      "command_authority_ambiguous",
      "command_authority_ambiguous",
      "command_authority_ambiguous",
    ]);
    await expect(
      authorizedHistoryViews.getProjectHistoryCompensationPreviewView(
        commands.submit.project_id,
        appliedEvent.event_id,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_HISTORY_RECOVERY_PREVIEW_UNAVAILABLE",
    });
    await expect(
      authorizedHistoryViews.composeProjectHistoryCompensationPlan(planRequest),
    ).rejects.toMatchObject({
      code: "PROJECT_HISTORY_RECOVERY_PREVIEW_UNAVAILABLE",
    });
    await expect(
      authorizedHistoryViews.getProjectHistoryRecoveryAssessmentView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        appliedEvent.event_id,
      ),
    ).resolves.toBeUndefined();
    const reviewer = commands.approve.command.approval.decided_by;
    const reversal = buildCompensatingReversalCommandPlan({
      project_id: commands.submit.project_id,
      claim: trustedClaim,
      assertion: trustedAssertion,
      compensates_change_set_id: promoted.change_set_id,
      proposed_by: reviewer,
      reviewer,
      capability_grant_id: commands.submit.capability_grant_id,
      reason: "Correct the direct evidence review.",
      rationale:
        "The accepted representation does not survive exact-source review.",
      impact_summary:
        "Remove the Claim and ASSERTS edge from active authority.",
      timing: {
        proposed_at: "2026-08-30T10:00:00.000Z",
        decided_at: "2026-08-30T10:01:00.000Z",
        applied_at: "2026-08-30T10:02:00.000Z",
      },
    });

    const result = await executeCompensatingReversalPlan(repository, reversal);

    expect(result).toMatchObject({
      outcome: "reverted",
      compensates_change_set_id: promoted.change_set_id,
      claim_revision: 3,
      assertion_revision: 3,
    });
    expect(await repository.getChangeSetState(promoted.change_set_id)).toBe(
      "reverted",
    );
    expect(
      await repository.getChangeSetState(reversal.change_set.change_set_id),
    ).toBe("applied");
    expect((await evidence.getClaim(promoted.claim_id))?.authority).toEqual({
      zone: "quarantine",
      review_state: "human_rejected",
    });
    expect(
      (await evidence.getAssertion(promoted.assertion_id))?.authority,
    ).toEqual({ zone: "quarantine", review_state: "human_rejected" });
    expect(
      (await evidence.getClaim(promoted.claim_id, 2))?.authority.zone,
    ).toBe("trusted");

    const events = await repository.getDomainEvents({
      projectId: commands.submit.project_id,
    });
    expect(events.map((event) => event.event.event_type)).toEqual([
      "change_set.submitted",
      "approval.recorded",
      "change_set.applied",
      "change_set.submitted",
      "approval.recorded",
      "change_set.reverted",
    ]);
    expect(events.slice(-3).map((event) => event.schema_version)).toEqual([
      "1.1.0",
      "1.1.0",
      "1.1.0",
    ]);
    const recentHistory = await historyViews.getRecentProjectHistoryView(
      commands.submit.project_id,
    );
    expect(recentHistory?.content.changes[0]?.event_ref).toEqual(
      expect.objectContaining({
        schema_version: "1.1.0",
        event_type: "change_set.reverted",
      }),
    );
    expect(recentHistory?.content.changes[0]?.observed_effect.effect).toBe(
      "authority_change_reverted",
    );
    const reversalEvent = recentHistory?.content.changes[0]?.event_ref;
    if (reversalEvent === undefined) {
      throw new Error("Expected the compensating-reversal History event.");
    }
    const reversalImpact = await historyViews.getProjectHistoryImpactView(
      commands.submit.project_id,
      reversalEvent.event_id,
    );
    expect(
      reversalImpact?.content.selected_event.event_ref.schema_version,
    ).toBe("1.1.0");
    expect(
      reversalImpact?.content.impact.outbox_records.refs.every(
        ({ schema_version }) => schema_version === "1.1.0",
      ),
    ).toBe(true);
    expect(reversalImpact?.content.decision_boundary.reversibility).toBe(
      "not_assessed",
    );
    const compensatedAssessment =
      await authorizedHistoryViews.getProjectHistoryRecoveryAssessmentView(
        commands.submit.project_id,
        appliedEvent.event_id,
      );
    expect(compensatedAssessment?.content.assessment).toMatchObject({
      state: "already_compensated",
      compensation_change_set: {
        change_set_id: reversal.change_set.change_set_id,
        current_state: "applied",
      },
      compensation_event_ref: {
        event_id: reversalEvent.event_id,
        event_type: "change_set.reverted",
      },
    });
    await expect(
      authorizedHistoryViews.getProjectHistoryCompensationPreviewView(
        commands.submit.project_id,
        appliedEvent.event_id,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_HISTORY_RECOVERY_PREVIEW_UNAVAILABLE",
    });
    const reversalAssessment =
      await authorizedHistoryViews.getProjectHistoryRecoveryAssessmentView(
        commands.submit.project_id,
        reversalEvent.event_id,
      );
    expect(reversalAssessment?.content).toMatchObject({
      recovery_subject: { selected_event_role: "compensation" },
      assessment: { state: "already_compensated" },
    });
    const retainedHistory = await historyViews.listRetainedProjectHistoryView(
      commands.submit.project_id,
      { limit: 6 },
    );
    expect(
      retainedHistory?.content.changes.map(
        ({ event_ref }) => event_ref.schema_version,
      ),
    ).toEqual(["1.1.0", "1.1.0", "1.1.0", "1.0.0", "1.0.0", "1.0.0"]);
    expect(retainedHistory?.content.page.has_more).toBe(false);
    const authorizations = await pool.query<{
      admission_kind: string;
      evidence_revision: string;
    }>(
      `SELECT admission_kind, evidence_revision::text
         FROM petra.evidence_revision_authorizations
        WHERE evidence_revision = 3
        ORDER BY evidence_kind`,
    );
    expect(authorizations.rows).toEqual([
      { admission_kind: "reversal", evidence_revision: "3" },
      { admission_kind: "reversal", evidence_revision: "3" },
    ]);
  });

  it("executes and idempotently recovers one exact Project History compensation plan", async () => {
    const prepared = await preparedCompensationPlan();
    const executor = new PostgresProjectHistoryCompensationExecutor(
      pool,
      authorizedHistoryViews,
      prepared.repository,
    );

    const first = await executor.executeProjectHistoryCompensationPlan(
      prepared.request,
    );
    expect(first?.content).toMatchObject({
      preflight: { state: "fresh_plan_revalidated" },
      outcome: "completed",
      completed_prefix: 3,
      authoritative_effect: {
        state: "compensation_applied",
        compensated_change_set_id: prepared.promotion.change_set_id,
        claim_ref: { resulting_revision: 3 },
        assertion_ref: { resulting_revision: 3 },
      },
      recovery: {
        state: "complete",
        same_request: "returns_exact_retained_result",
      },
      atomicity: "per_command_transaction_not_three_command_atomic",
      derivation: { aggregate_ledger: "not_created" },
    });
    expect(first?.content.steps.map(({ state }) => state)).toEqual([
      "retained_success",
      "retained_success",
      "retained_success",
    ]);
    expect(
      first?.content.steps.map((step) =>
        step.state === "retained_success" || step.state === "retained_failure"
          ? step.event_ref.event_type
          : undefined,
      ),
    ).toEqual([
      "change_set.submitted",
      "approval.recorded",
      "change_set.reverted",
    ]);
    const countsAfterFirst = await pool.query<{
      commands: string;
      events: string;
      evidence_revisions: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.command_executions) AS commands,
         (SELECT count(*)::text FROM petra.domain_events) AS events,
         (SELECT count(*)::text FROM petra.evidence_entity_revisions)
           AS evidence_revisions`,
    );
    expect(countsAfterFirst.rows[0]).toEqual({
      commands: "6",
      events: "6",
      evidence_revisions: "6",
    });

    const replay = await executor.executeProjectHistoryCompensationPlan(
      prepared.request,
    );
    expect(replay?.content.preflight.state).toBe(
      "retained_completion_replayed",
    );
    expect(replay?.content.plan_ref).toEqual(first?.content.plan_ref);
    const countsAfterReplay = await pool.query<{
      commands: string;
      events: string;
      evidence_revisions: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.command_executions) AS commands,
         (SELECT count(*)::text FROM petra.domain_events) AS events,
         (SELECT count(*)::text FROM petra.evidence_entity_revisions)
           AS evidence_revisions`,
    );
    expect(countsAfterReplay.rows[0]).toEqual(countsAfterFirst.rows[0]);

    const tampered = structuredClone(prepared.request);
    tampered.plan.content.change_set.content.reason =
      "Altered after composition.";
    await expect(
      executor.executeProjectHistoryCompensationPlan(tampered),
    ).rejects.toMatchObject({
      code: "PROJECT_HISTORY_COMPENSATION_EXECUTION_UNAVAILABLE",
    });
    const crossProject = structuredClone(prepared.request);
    crossProject.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ";
    await expect(
      executor.executeProjectHistoryCompensationPlan(crossProject),
    ).rejects.toMatchObject({
      code: "PROJECT_HISTORY_COMPENSATION_EXECUTION_UNAVAILABLE",
    });
  });

  it("reports and resumes an exact retained prefix after an unretained command interruption", async () => {
    const prepared = await preparedCompensationPlan();
    let interruptApproval = true;
    const interrupted = new PostgresProjectHistoryCompensationExecutor(
      pool,
      authorizedHistoryViews,
      {
        executeCommand: (envelope) => {
          if (
            interruptApproval &&
            envelope.command.command_name === "RecordApproval"
          ) {
            interruptApproval = false;
            throw new ChangeControlError(
              "COMMAND_NOT_AUTHORIZED",
              "The simulated approval authority changed before submission.",
            );
          }
          return prepared.repository.executeCommand(envelope);
        },
      },
    );
    const stopped = await interrupted.executeProjectHistoryCompensationPlan(
      prepared.request,
    );
    expect(stopped?.content).toMatchObject({
      outcome: "stopped",
      completed_prefix: 1,
      authoritative_effect: { state: "not_completed" },
      recovery: {
        state: "retry_exact_plan",
        completed_prefix: 1,
        same_request_is_idempotent: true,
        next_position: 2,
      },
    });
    expect(stopped?.content.steps.map(({ state }) => state)).toEqual([
      "retained_success",
      "attempt_failed_not_retained",
      "not_attempted",
    ]);

    const resumed = new PostgresProjectHistoryCompensationExecutor(
      pool,
      authorizedHistoryViews,
      prepared.repository,
    );
    const completed = await resumed.executeProjectHistoryCompensationPlan(
      prepared.request,
    );
    expect(completed?.content).toMatchObject({
      preflight: { state: "retained_prefix_validated" },
      outcome: "completed",
      completed_prefix: 3,
      authoritative_effect: { state: "compensation_applied" },
    });
    expect(
      await prepared.repository.getChangeSetState(
        prepared.promotion.change_set_id,
      ),
    ).toBe("reverted");
  });

  it("deduplicates concurrent exact retries and rejects key or command rebound", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority();

    const results = await Promise.all([
      repository.executeCommand(structuredClone(commands.submit)),
      repository.executeCommand(structuredClone(commands.submit)),
    ]);
    expect(results[0]).toEqual(results[1]);

    const reboundKey = structuredClone(commands.submit);
    reboundKey.submitted_at = "2026-08-28T18:12:31.000Z";
    await expectChangeCode(
      () => repository.executeCommand(reboundKey),
      "IDEMPOTENCY_KEY_REUSED",
    );

    const reboundCommand = structuredClone(commands.submit);
    reboundCommand.idempotency_key = "review:claim-fbb:submit:rebound";
    await expectChangeCode(
      () => repository.executeCommand(reboundCommand),
      "COMMAND_ID_REUSED",
    );

    const counts = await pool.query<{
      commands: string;
      events: string;
      outbox: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.command_executions)::text AS commands,
         (SELECT count(*) FROM petra.domain_events)::text AS events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox`,
    );
    expect(counts.rows[0]).toEqual({
      commands: "1",
      events: "1",
      outbox: "1",
    });
  });

  it("records rejection but never records an unauthorized or rejected application", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const denied = authority(deterministicFactory(), false);
    await expectChangeCode(
      () => denied.executeCommand(commands.submit),
      "COMMAND_NOT_AUTHORIZED",
    );
    expect(
      await denied.getDomainEvents({ projectId: commands.submit.project_id }),
    ).toEqual([]);

    const repository = authority();
    await repository.executeCommand(commands.submit);
    if (commands.approve.command.command_name !== "RecordApproval") {
      throw new Error("Expected RecordApproval fixture.");
    }
    commands.approve.command.approval.decision = "rejected";
    await repository.executeCommand(commands.approve);
    await expectChangeCode(
      () => repository.executeCommand(commands.apply),
      "APPROVAL_NOT_GRANTED",
    );
    expect(
      await repository.getChangeSetState(
        (commands.apply.command as { change_set_id: string }).change_set_id,
      ),
    ).toBe("rejected");
    expect((await evidence.getClaim(claimFixture().claim_id))?.revision).toBe(
      1,
    );
    expect(
      (
        await repository.getDomainEvents({
          projectId: commands.submit.project_id,
        })
      ).map((event) => event.event.event_type),
    ).toEqual(["change_set.submitted", "approval.recorded"]);
  });

  it("commits one durable conflict event when a reviewed competitor becomes stale", async () => {
    await registerEvidenceChain();
    const first = commandFixtures();
    const second = secondCommandFixtures();
    const repository = authority();

    await repository.executeCommand(first.submit);
    await repository.executeCommand(second.submit);
    await repository.executeCommand(first.approve);
    await repository.executeCommand(second.approve);
    await repository.executeCommand(first.apply);
    await expectChangeCode(
      () => repository.executeCommand(second.apply),
      "STALE_TARGET_REVISION",
    );
    await expectChangeCode(
      () => repository.executeCommand(second.apply),
      "STALE_TARGET_REVISION",
    );

    if (second.apply.command.command_name !== "ApplyChangeSet") {
      throw new Error("Expected ApplyChangeSet fixture.");
    }
    expect(
      await repository.getChangeSetState(second.apply.command.change_set_id),
    ).toBe("conflicted");
    expect((await evidence.getClaim(claimFixture().claim_id))?.revision).toBe(
      2,
    );
    const events = await repository.getDomainEvents({
      projectId: first.submit.project_id,
    });
    expect(events).toHaveLength(6);
    expect(events.at(-1)?.event).toEqual(
      expect.objectContaining({ event_type: "change_set.conflicted" }),
    );
    const durable = await pool.query<{
      outcome_kind: string;
      error_code: string;
    }>(
      "SELECT outcome_kind, error_code FROM petra.command_executions WHERE command_id = $1",
      [second.apply.command_id],
    );
    expect(durable.rows[0]).toEqual({
      outcome_kind: "failure",
      error_code: "STALE_TARGET_REVISION",
    });
  });

  it("rolls back domain state when event construction fails", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority(
      deterministicFactory({ invalidFirstEvent: true }),
    );

    await expect(repository.executeCommand(commands.submit)).rejects.toThrow(
      "non-event ID",
    );
    if (commands.submit.command.command_name !== "SubmitChangeSet") {
      throw new Error("Expected SubmitChangeSet fixture.");
    }
    expect(
      await repository.getChangeSet(
        commands.submit.command.change_set.change_set_id,
      ),
    ).toBe(undefined);
    const counts = await pool.query<{
      commands: string;
      events: string;
      outbox: string;
      event_position: string;
      outbox_position: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.command_executions)::text AS commands,
         (SELECT count(*) FROM petra.domain_events)::text AS events,
         (SELECT count(*) FROM petra.outbox_records)::text AS outbox,
         event_position::text,
         outbox_position::text
       FROM petra.authority_positions`,
    );
    expect(counts.rows[0]).toEqual({
      commands: "0",
      events: "0",
      outbox: "0",
      event_position: "0",
      outbox_position: "0",
    });
  });

  it("keeps commands, events, outbox records, and approvals append-only in PostgreSQL", async () => {
    await registerEvidenceChain();
    const commands = commandFixtures();
    const repository = authority();
    await repository.executeCommand(commands.submit);
    await repository.executeCommand(commands.approve);

    await expect(pool.query("DELETE FROM petra.approvals")).rejects.toEqual(
      expect.objectContaining({ code: "55000" }),
    );
    await expect(
      pool.query("UPDATE petra.domain_events SET stream_revision = 99"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query("UPDATE petra.outbox_records SET target_sequence = 99"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query("DELETE FROM petra.command_executions"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
  });
});
