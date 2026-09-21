import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraParsedDocument,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceReplacementRetraction,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraWork,
  PetraWorkVersion,
} from "@petra/contracts";
import type {
  PersistDocumentBundleInput,
  PersistVerifiedArtifactInput,
  ProjectSourceLifecycleCommandEnvelope,
  ProjectSourceReplacementCommandEnvelope,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import type {
  PostgresDocumentAuthorityError,
  PostgresDocumentAuthorityErrorCode,
} from "../src/document-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import { PostgresProjectHistoryViewReader } from "../src/project-history-view-reader.js";
import { PostgresProjectObjectLocationViewReader } from "../src/project-object-location-view-reader.js";
import { PostgresProjectShellViewReader } from "../src/project-shell-view-reader.js";
import { PostgresProjectSourceAuthorityRepository } from "../src/project-source-authority-repository.js";
import { PostgresProjectSourceLifecycleAuthorityRepository } from "../src/project-source-lifecycle-authority-repository.js";
import { PostgresProjectSourceLifecycleViewReader } from "../src/project-source-lifecycle-view-reader.js";
import { PostgresProjectSourceReplacementAuthorityRepository } from "../src/project-source-replacement-authority-repository.js";
import { PostgresProjectSourceReplacementCommandAuthorityRepository } from "../src/project-source-replacement-command-authority-repository.js";
import { PostgresProjectSourceViewReader } from "../src/project-source-view-reader.js";
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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const expectDocumentCode = async (
  operation: () => Promise<unknown>,
  code: PostgresDocumentAuthorityErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresDocumentAuthorityError>>({ code }),
  );
};

describePostgres("PostgreSQL Document authority repository", () => {
  let eventIndex = 0;
  let outboxIndex = 0;
  let replacementEventIndex = 0;
  let replacementOutboxIndex = 0;
  const eventIds = [
    "event_01K4C000000000000000000031",
    "event_01K4C000000000000000000034",
  ];
  const outboxIds = [
    "outbox_01K4C000000000000000000032",
    "outbox_01K4C000000000000000000033",
  ];
  const replacementEventIds = [
    "event_01K4C000000000000000000057",
    "event_01K4C000000000000000000060",
  ];
  const replacementOutboxIds = [
    "outbox_01K4C000000000000000000058",
    "outbox_01K4C000000000000000000059",
    "outbox_01K4C000000000000000000061",
    "outbox_01K4C000000000000000000062",
  ];
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const projectSources = new PostgresProjectSourceAuthorityRepository(pool);
  const sourceLifecycleAuthority =
    new PostgresProjectSourceLifecycleAuthorityRepository(
      pool,
      {
        authorize: (request) =>
          request.actor.actor_kind === "human" &&
          request.capabilityGrantId ===
            "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ" &&
          (request.commandName === "ExcludeProjectSource" ||
            request.commandName === "RestoreProjectSource"),
      },
      {
        nextId: (kind) => {
          const id =
            kind === "event"
              ? eventIds[eventIndex++]
              : outboxIds[outboxIndex++];
          if (id === undefined) throw new Error(`Missing ${kind} test id.`);
          return id;
        },
        now: () => "2026-09-09T00:05:00.000Z",
      },
    );
  const sourceLifecycleViews = new PostgresProjectSourceLifecycleViewReader(
    pool,
  );
  const sourceReplacements =
    new PostgresProjectSourceReplacementAuthorityRepository(pool);
  const sourceReplacementCommands =
    new PostgresProjectSourceReplacementCommandAuthorityRepository(
      pool,
      {
        authorize: (request) =>
          request.actor.actor_kind === "human" &&
          request.capabilityGrantId ===
            "capability_grant_01K4C000000000000000000051" &&
          (request.commandName === "CreateProjectSourceReplacement" ||
            request.commandName === "RetractProjectSourceReplacement"),
      },
      {
        nextId: (kind) => {
          const id =
            kind === "event"
              ? replacementEventIds[replacementEventIndex++]
              : replacementOutboxIds[replacementOutboxIndex++];
          if (id === undefined) throw new Error(`Missing ${kind} test id.`);
          return id;
        },
        now: () => "2026-09-10T00:03:00.000Z",
      },
    );
  const sourceViews = new PostgresProjectSourceViewReader(pool);
  const historyViews = new PostgresProjectHistoryViewReader(pool);
  const objectLocations = new PostgresProjectObjectLocationViewReader(pool);
  const shellViews = new PostgresProjectShellViewReader(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    eventIndex = 0;
    outboxIndex = 0;
    replacementEventIndex = 0;
    replacementOutboxIndex = 0;
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

  const registerResearchIdentities = async (): Promise<void> => {
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );
  };

  const sourceArtifactInput = (
    parsePermitted: boolean,
  ): PersistVerifiedArtifactInput => {
    const artifact = readFixture<PetraArtifact>("artifact");
    const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
    const rightsDecision = readFixture<PetraRightsDecision>("rights-decision");
    artifact.created_by.actor_kind = "human";
    manifest.recorded_by.actor_kind = "human";
    rightsDecision.decision_maker.actor_kind = "human";
    rightsDecision.permissions.parse = parsePermitted;
    return { artifact, manifest, rightsDecision };
  };

  const parserArtifactInput = (
    source: PersistVerifiedArtifactInput,
    retainSourceLineage: boolean,
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
      input_artifact_ids: retainSourceLineage
        ? [source.artifact.artifact_id]
        : [],
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

  const registerArtifactChain = async (
    options: {
      parsePermitted?: boolean;
      retainSourceLineage?: boolean;
    } = {},
  ): Promise<PersistVerifiedArtifactInput> => {
    await registerResearchIdentities();
    const source = sourceArtifactInput(options.parsePermitted ?? true);
    await artifacts.registerVerifiedAcquisition(source);
    await artifacts.registerVerifiedAcquisition(
      parserArtifactInput(source, options.retainSourceLineage ?? true),
    );
    return source;
  };

  const documentBundle = (
    sourceManifestId = readFixture<PetraArtifactManifest>("artifact-manifest")
      .artifact_manifest_id,
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

  it("persists and exactly replays an immutable Artifact-to-SourceSpan chain", async () => {
    const source = await registerArtifactChain();
    const input = documentBundle(source.manifest.artifact_manifest_id);

    await documents.registerDocumentBundle(input);
    await documents.registerDocumentBundle(structuredClone(input));

    expect(
      await documents.getDocumentBundle(input.document.parsed_document_id),
    ).toEqual(input);
    expect(
      await documents.getParsedDocument(input.document.parsed_document_id),
    ).toEqual(input.document);
    expect(
      await documents.getStructuralBlock(
        input.blocks[0]?.structural_block_id ?? "",
      ),
    ).toEqual(input.blocks[0]);
    expect(
      await documents.getSourceSpan(input.spans[0]?.source_span_id ?? ""),
    ).toEqual(input.spans[0]);
    expect(
      await documents.getSourceSpansForArtifact(source.artifact.artifact_id),
    ).toEqual(input.spans);

    const path = await pool.query<{
      source_artifact_manifest_id: string;
      work_version_id: string;
      parser_run_id: string;
      reading_order: string;
      selector_type: string;
      selected_text_hash: string;
      page_number: string;
      verification_status: string;
    }>(
      `SELECT document.source_artifact_manifest_id,
              document.work_version_id,
              document.parser_run_id,
              block.reading_order::text,
              span.selector_type,
              span.selected_text_hash,
              span.page_number::text,
              span.verification_status
         FROM petra.parsed_documents AS document
         JOIN petra.structural_blocks AS block
           ON block.parsed_document_id = document.parsed_document_id
         JOIN petra.source_spans AS span
           ON span.parsed_document_id = document.parsed_document_id
          AND span.structural_block_id = block.structural_block_id
        WHERE document.parsed_document_id = $1`,
      [input.document.parsed_document_id],
    );
    expect(path.rows).toEqual([
      {
        source_artifact_manifest_id: input.sourceArtifactManifestId,
        work_version_id: input.document.work_version_id,
        parser_run_id: input.document.parser_run_id,
        reading_order: "0",
        selector_type: "compound",
        selected_text_hash:
          "sha256:11dbfa18f25f2587c4e96225884e2d6d1c9e4362210ebf34b3197c03bd05cda6",
        page_number: "1",
        verification_status: "exact_text_and_geometry",
      },
    ]);

    const returned = await documents.getDocumentBundle(
      input.document.parsed_document_id,
    );
    if (returned === undefined) throw new Error("Expected DocumentBundle.");
    returned.document.quality_state = "failed";
    returned.spans[0]!.verification.status = "unresolved";
    expect(
      (await documents.getDocumentBundle(input.document.parsed_document_id))
        ?.document.quality_state,
    ).toBe("complete");
  });

  it("binds and reads the exact source chain only inside its Project", async () => {
    const acquired = await registerArtifactChain();
    const project = readFixture<PetraProject>("project");
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);

    const bundle = documentBundle(acquired.manifest.artifact_manifest_id);
    await documents.registerDocumentBundle(bundle);
    const projectSource = readFixture<PetraProjectSource>("project-source");
    projectSource.content.artifact_manifest_ref.record_hash = canonicalHash(
      acquired.manifest,
    );
    projectSource.content_hash = canonicalHash(projectSource.content);
    await projectSources.registerProjectSourceRevision(projectSource);
    await projectSources.registerProjectSourceRevision(
      structuredClone(projectSource),
    );

    const view = await sourceViews.getProjectSourceView(
      project.project_id,
      projectSource.project_source_id,
    );
    if (view === undefined) throw new Error("Expected Project source view.");
    expect(view.project_id).toBe(project.project_id);
    expect(view.project_source_id).toBe(projectSource.project_source_id);
    expect(view.content.binding.source_role).toBe("scientific.literature");
    expect(view.content.binding.project_definition_ref).toEqual({
      record_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
    });
    expect(view.content.identity.title).toBe(
      "A testable account of competing explanations",
    );
    expect(view.content.copy.manifest_ref.record_id).toBe(
      acquired.manifest.artifact_manifest_id,
    );
    expect(view.content.rights.permissions.parse).toBe(true);
    expect(view.content.representation.extent).toBe("complete");
    expect(view.content.representation.preview?.text).toBe(
      "The study reports a measurable improvement.",
    );
    const snapshotClient = await pool.connect();
    try {
      await snapshotClient.query(
        "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      const exactSourceSpanView = await sourceViews.readSourceInSnapshot(
        snapshotClient,
        view.read_at,
        project.project_id,
        projectSource.project_source_id,
        bundle.spans[0]!.source_span_id,
      );
      await snapshotClient.query("COMMIT");
      expect(
        exactSourceSpanView?.content.representation.preview?.span_ref.record_id,
      ).toBe(bundle.spans[0]!.source_span_id);
    } catch (error) {
      await snapshotClient.query("ROLLBACK");
      throw error;
    } finally {
      snapshotClient.release();
    }
    expect(view.content.authority.isolation).toBe("repeatable_read");
    const location = await objectLocations.locateProjectObject({
      project_id: project.project_id,
      object_ref: {
        semantic_key: "petra.project-source",
        object_id: projectSource.project_source_id,
      },
      task_intent: "inspect",
    });
    expect(location?.content.resolution.state).toBe("current");
    expect(location?.content.primary_destination.role).toBe("sources");
    expect(location?.content.primary_destination).not.toHaveProperty("path");
    const shell = await shellViews.getProjectShellView(project.project_id, {
      object_ref: {
        semantic_key: "petra.project-source",
        object_id: projectSource.project_source_id,
      },
      task_intent: "inspect",
    });
    expect(shell?.schema_version).toBe("1.3.0");
    if (shell?.schema_version !== "1.3.0") {
      throw new Error("Expected the Project shell 1.3 view.");
    }
    expect(shell.content.selection?.resolution.state).toBe("current");
    expect(shell.content.selection?.primary_destination.role).toBe("sources");
    expect(shell.content.place_summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "sources",
          coverage: "complete",
          item_count: 1,
        }),
        expect.objectContaining({
          role: "history",
          coverage: "partial",
        }),
      ]),
    );
    expect(
      await sourceViews.listProjectSourceViews(project.project_id),
    ).toHaveLength(1);
    expect(
      await sourceViews.getProjectSourceView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        projectSource.project_source_id,
      ),
    ).toBeUndefined();

    const lifecycle = await sourceLifecycleViews.getProjectSourceLifecycleView(
      project.project_id,
      projectSource.project_source_id,
      "exclude_project_source",
    );
    if (lifecycle === undefined) {
      throw new Error("Expected Project source lifecycle preview.");
    }
    expect(lifecycle.content.transition).toEqual(
      expect.objectContaining({
        state: "preview_available",
        from_status: "active",
        to_status: "excluded",
        effect: "ordinary_new_use_disabled",
      }),
    );
    expect(
      lifecycle.content.impact.groups.map((group) => [
        group.group_kind,
        group.total_count,
      ]),
    ).toEqual([
      ["parsed_documents", 1],
      ["structural_blocks", 1],
      ["source_spans", 1],
      ["claims", 0],
      ["assertions", 0],
      ["active_work", 0],
      ["open_reviews", 0],
      ["grounded_responses", 0],
    ]);
    expect(lifecycle.content.impact.groups[0]?.refs[0]).toEqual({
      record_kind: "parsed_document",
      record_id: bundle.document.parsed_document_id,
      revision: 1,
      record_hash: canonicalHash(bundle.document),
      posture: "current",
      effect: "retained",
    });
    expect(lifecycle.content.operation.state).toBe("unavailable");
    expect(lifecycle.content.authority.isolation).toBe("repeatable_read");

    const deletion = await sourceLifecycleViews.getProjectSourceLifecycleView(
      project.project_id,
      projectSource.project_source_id,
      "delete_local_copy",
    );
    expect(deletion?.content.transition.state).toBe("unavailable");
    expect(
      deletion?.content.retention.find((item) => item.area === "local_artifact")
        ?.state,
    ).toBe("deletion_unavailable");
    expect(
      await sourceLifecycleViews.getProjectSourceLifecycleView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        projectSource.project_source_id,
        "exclude_project_source",
      ),
    ).toBeUndefined();
    await expect(
      sourceLifecycleViews.getProjectSourceLifecycleView(
        project.project_id,
        projectSource.project_source_id,
        "invalid_action" as "exclude_project_source",
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_LIFECYCLE_VIEW_REQUEST_INVALID",
      }),
    );

    const excludeCommand = readFixture<ProjectSourceLifecycleCommandEnvelope>(
      "command-exclude-project-source",
    );
    excludeCommand.command.expected_source_ref.content_hash =
      projectSource.content_hash;
    excludeCommand.command.expected_source_ref.record_hash =
      canonicalHash(projectSource);
    let authorizationObservedSerializableTransaction = false;
    const denied = new PostgresProjectSourceLifecycleAuthorityRepository(pool, {
      authorize: async (_request, transaction) => {
        const isolation = await transaction.query<{
          transaction_isolation: string;
        }>("SHOW transaction_isolation");
        authorizationObservedSerializableTransaction =
          isolation.rows[0]?.transaction_isolation === "serializable";
        return false;
      },
    });
    await expect(
      denied.executeProjectSourceLifecycleCommand(
        structuredClone(excludeCommand),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_LIFECYCLE_COMMAND_NOT_AUTHORIZED",
      }),
    );
    expect(authorizationObservedSerializableTransaction).toBe(true);
    const exclusion =
      await sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        excludeCommand,
      );
    expect(exclusion.applied).toBe(true);
    expect(exclusion.projectSource.revision).toBe(2);
    expect(exclusion.projectSource.content.status).toBe("excluded");
    expect(exclusion.receipt.content.preservation).toEqual({
      project_source_history: "retained",
      canonical_identity: "retained",
      selected_work_version: "retained",
      artifact_manifest: "retained",
      local_artifact: "retained",
      parsed_representation: "retained",
      provenance: "retained",
    });
    expect(exclusion.receipt.content.recovery).toEqual(
      expect.objectContaining({
        state: "available",
        inverse_command_name: "RestoreProjectSource",
        expected_source_ref: exclusion.receipt.content.resulting_source_ref,
      }),
    );
    expect(
      await sourceLifecycleAuthority.getProjectSourceLifecycleReceipt(
        excludeCommand.command_id,
      ),
    ).toEqual(exclusion.receipt);
    const exclusionImpact = await historyViews.getProjectHistoryImpactView(
      project.project_id,
      exclusion.receipt.content.event_ref.event_id,
    );
    const sourceAssessment =
      exclusionImpact?.content.semantic_target_impact.target_assessments[0];
    expect(exclusionImpact?.schema_version).toBe("1.4.0");
    expect(sourceAssessment?.adapter_state).toBe("registered");
    expect(
      sourceAssessment?.groups.map(({ adapter_kind }) => adapter_kind),
    ).toEqual([
      "project_source_lifecycle",
      "project_source_dependency",
      "project_source_replacement_lineage",
      "project_source_effective_head",
    ]);
    expect(sourceAssessment?.groups[0]?.refs).toEqual([
      expect.objectContaining({
        object_id: exclusion.receipt.project_source_lifecycle_receipt_id,
        posture: "immutable_revision",
        relation: "records_exact_source_resulting_revision",
      }),
    ]);
    expect(sourceAssessment?.groups[1]).toMatchObject({
      authority_source: "immutable_project_source_dependency_bindings",
      total_count: 3,
      returned_count: 3,
      coverage: "complete",
    });
    expect(
      sourceAssessment?.groups[1]?.refs.map(({ semantic_key, relation }) => [
        semantic_key,
        relation,
      ]),
    ).toEqual([
      ["petra.parsed-document", "parses_exact_source_artifact"],
      ["petra.source-span", "locates_span_in_exact_source_artifact"],
      ["petra.structural-block", "structures_exact_source_artifact"],
    ]);
    expect(sourceAssessment?.groups[2]?.refs).toEqual([]);
    expect(sourceAssessment?.groups[3]?.refs).toEqual([]);
    expect(
      await historyViews.getProjectHistoryImpactView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        exclusion.receipt.content.event_ref.event_id,
      ),
    ).toBeUndefined();
    const replay =
      await sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        structuredClone(excludeCommand),
      );
    expect(replay.applied).toBe(false);
    expect(replay.receipt).toEqual(exclusion.receipt);

    const redelivery = structuredClone(excludeCommand);
    redelivery.correlation_id = "trace_01K4C000000000000000000036";
    redelivery.submitted_at = "2026-09-09T00:05:00.000Z";
    const redelivered =
      await sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        redelivery,
      );
    expect(redelivered.applied).toBe(false);
    expect(redelivered.receipt).toEqual(exclusion.receipt);

    const reusedIdempotency = structuredClone(excludeCommand);
    reusedIdempotency.command_id = "command_01K4C000000000000000000039";
    reusedIdempotency.command.reason = "Different command content.";
    await expect(
      sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        reusedIdempotency,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_LIFECYCLE_IDEMPOTENCY_KEY_REUSED",
      }),
    );
    const reusedCommandId = structuredClone(excludeCommand);
    reusedCommandId.idempotency_key = "project-source:007:exclude:other";
    reusedCommandId.command.reason = "Different command content.";
    await expect(
      sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        reusedCommandId,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_LIFECYCLE_COMMAND_ID_REUSED",
      }),
    );

    const stale = structuredClone(excludeCommand);
    stale.command_id = "command_01K4C000000000000000000037";
    stale.idempotency_key = "project-source:007:exclude:stale";
    await expect(
      sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(stale),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_LIFECYCLE_STALE_SOURCE",
      }),
    );

    const restoreCommand: ProjectSourceLifecycleCommandEnvelope = {
      ...structuredClone(excludeCommand),
      command_id: "command_01K4C000000000000000000038",
      idempotency_key: "project-source:007:restore:v1",
      submitted_at: "2026-09-09T00:06:00.000Z",
      command: {
        command_name: "RestoreProjectSource",
        expected_source_ref: structuredClone(
          exclusion.receipt.content.resulting_source_ref,
        ) as Extract<
          ProjectSourceLifecycleCommandEnvelope["command"],
          { command_name: "RestoreProjectSource" }
        >["expected_source_ref"],
        reason:
          "Restore ordinary new use through the explicit compensating transition.",
      },
    };
    const restoration =
      await sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        restoreCommand,
      );
    expect(restoration.applied).toBe(true);
    expect(restoration.projectSource.revision).toBe(3);
    expect(restoration.projectSource.content.status).toBe("active");
    expect(restoration.receipt.content.recovery.inverse_command_name).toBe(
      "ExcludeProjectSource",
    );
    const durable = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM petra.project_source_revisions
        WHERE project_source_id = $1`,
      [projectSource.project_source_id],
    );
    expect(durable.rows[0]?.count).toBe("3");
    const events = await pool.query<{ event_type: string }>(
      `SELECT event_type
         FROM petra.domain_events
        WHERE project_id = $1
        ORDER BY stream_revision`,
      [project.project_id],
    );
    expect(events.rows).toEqual([
      { event_type: "project_source.excluded" },
      { event_type: "project_source.restored" },
    ]);
    const outbox = await pool.query<{ target: string }>(
      `SELECT target
         FROM petra.outbox_records
        WHERE partition_key = $1
        ORDER BY outbox_position`,
      [project.project_id],
    );
    expect(outbox.rows).toEqual([
      { target: "interface_authority" },
      { target: "interface_authority" },
    ]);

    const restore = await sourceLifecycleViews.getProjectSourceLifecycleView(
      project.project_id,
      projectSource.project_source_id,
      "exclude_project_source",
    );
    expect(restore?.content.source_ref.status).toBe("active");
    expect(restore?.content.transition).toEqual(
      expect.objectContaining({
        state: "preview_available",
        from_status: "active",
        to_status: "excluded",
        effect: "ordinary_new_use_disabled",
      }),
    );

    const wrongRole = structuredClone(projectSource);
    wrongRole.revision = 4;
    wrongRole.content.source_role = "scientific.unregistered";
    wrongRole.content_hash = canonicalHash(wrongRole.content);
    await expect(
      projectSources.registerProjectSourceRevision(wrongRole),
    ).rejects.toEqual(
      expect.objectContaining({ code: "PROJECT_SOURCE_RELATION_INVALID" }),
    );
  });

  it("retains exact ProjectSource supersession and resolves its bounded successor chain", async () => {
    const acquired = await registerArtifactChain();
    const project = readFixture<PetraProject>("project");
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);

    const initial = readFixture<PetraProjectSource>("project-source");
    initial.content.artifact_manifest_ref.record_hash = canonicalHash(
      acquired.manifest,
    );
    initial.content_hash = canonicalHash(initial.content);
    await projectSources.registerProjectSourceRevision(initial);
    const excludeCommand = readFixture<ProjectSourceLifecycleCommandEnvelope>(
      "command-exclude-project-source",
    );
    excludeCommand.command.expected_source_ref.content_hash =
      initial.content_hash;
    excludeCommand.command.expected_source_ref.record_hash =
      canonicalHash(initial);
    const exclusion =
      await sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        excludeCommand,
      );
    const replaced = exclusion.projectSource;

    const preferredManifest = structuredClone(acquired.manifest);
    preferredManifest.artifact_manifest_id =
      "artifact_manifest_01K4C000000000000000000043";
    preferredManifest.rights_decision_id =
      "rights_decision_01K4C000000000000000000044";
    preferredManifest.recorded_at = "2026-09-09T00:08:00.000Z";
    const preferredRights = structuredClone(acquired.rightsDecision);
    preferredRights.rights_decision_id = preferredManifest.rights_decision_id;
    preferredRights.artifact_manifest_id =
      preferredManifest.artifact_manifest_id;
    preferredRights.authorization_reference =
      "petra-local-preferred-copy/1.0.0";
    preferredRights.created_at = "2026-09-09T00:08:00.000Z";
    const preferred = await artifacts.attachVerifiedManifest({
      artifactId: acquired.artifact.artifact_id,
      manifest: preferredManifest,
      rightsDecision: preferredRights,
    });

    const successor = structuredClone(replaced);
    successor.project_source_id = "project_source_01K4C000000000000000000040";
    successor.revision = 1;
    successor.content.artifact_manifest_ref = {
      artifact_manifest_id: preferred.manifest.artifact_manifest_id,
      revision: preferred.manifest.revision,
      record_hash: canonicalHash(preferred.manifest),
    };
    successor.content.status = "active";
    successor.content_hash = canonicalHash(successor.content);
    successor.added_at = "2026-09-09T00:09:00.000Z";
    await projectSources.registerProjectSourceRevision(successor);

    const createReplacement =
      readFixture<ProjectSourceReplacementCommandEnvelope>(
        "command-create-project-source-replacement",
      );
    if (
      createReplacement.command.command_name !==
      "CreateProjectSourceReplacement"
    ) {
      throw new Error("Expected replacement creation fixture.");
    }
    createReplacement.command.replaced_source_ref = {
      project_source_id: replaced.project_source_id,
      revision: replaced.revision,
      content_hash: replaced.content_hash,
      record_hash: canonicalHash(replaced),
      status: "excluded",
    };
    createReplacement.command.replacement_source_ref = {
      project_source_id: successor.project_source_id,
      revision: successor.revision,
      content_hash: successor.content_hash,
      record_hash: canonicalHash(successor),
      status: "active",
    };
    createReplacement.command.exclusion_receipt_ref = {
      project_source_lifecycle_receipt_id:
        exclusion.receipt.project_source_lifecycle_receipt_id,
      revision: exclusion.receipt.revision,
      content_hash: exclusion.receipt.content_hash,
      record_hash: canonicalHash(exclusion.receipt),
    };
    const creation =
      await sourceReplacementCommands.executeProjectSourceReplacementCommand(
        createReplacement,
      );
    if (creation.outcome !== "replacement_created") {
      throw new Error("Expected replacement creation result.");
    }
    expect(creation.applied).toBe(true);
    expect(creation.receipt.content.recovery).toEqual(
      expect.objectContaining({
        inverse_command_name: "RetractProjectSourceReplacement",
        effect: "relationship_retracted_without_source_restore",
      }),
    );
    const replacement = creation.replacement;
    const activeImpact = await historyViews.getProjectHistoryImpactView(
      project.project_id,
      creation.receipt.content.event_ref.event_id,
    );
    expect(activeImpact?.schema_version).toBe("1.4.0");
    const activeReplacementAssessment =
      activeImpact?.content.semantic_target_impact.target_assessments[0];
    expect(activeReplacementAssessment?.adapter_state).toBe("registered");
    expect(activeReplacementAssessment?.groups[0]).toMatchObject({
      adapter_kind: "project_source_replacement_lineage",
      total_count: 0,
      returned_count: 0,
    });
    expect(activeReplacementAssessment?.groups[1]?.refs).toEqual([
      expect.objectContaining({
        object_id: creation.receipt.project_source_replacement_receipt_id,
        relation: "records_exact_source_replacement_command",
      }),
    ]);
    expect(activeReplacementAssessment?.groups[2]?.refs).toEqual([
      expect.objectContaining({
        object_id: replacement.project_source_replacement_id,
        posture: "current",
        relation: "is_current_active_replacement_head",
      }),
    ]);

    const createReplay =
      await sourceReplacementCommands.executeProjectSourceReplacementCommand(
        structuredClone(createReplacement),
      );
    expect(createReplay.applied).toBe(false);
    expect(createReplay.receipt).toEqual(creation.receipt);
    expect(
      await sourceReplacementCommands.getProjectSourceReplacementCommandReceipt(
        createReplacement.command_id,
      ),
    ).toEqual(creation.receipt);
    const unauthorizedReplacement = structuredClone(createReplacement);
    unauthorizedReplacement.command_id = "command_01K4C000000000000000000063";
    unauthorizedReplacement.idempotency_key =
      "project-source:007:replacement:create:unauthorized";
    unauthorizedReplacement.capability_grant_id =
      "capability_grant_01K4C000000000000000000064";
    await expect(
      sourceReplacementCommands.executeProjectSourceReplacementCommand(
        unauthorizedReplacement,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_AUTHORIZED",
      }),
    );
    const reusedReplacementKey = structuredClone(createReplacement);
    if (
      reusedReplacementKey.command.command_name !==
      "CreateProjectSourceReplacement"
    ) {
      throw new Error("Expected cloned replacement creation command.");
    }
    reusedReplacementKey.command_id = "command_01K4C000000000000000000065";
    reusedReplacementKey.command.rationale = "Different replacement intent.";
    await expect(
      sourceReplacementCommands.executeProjectSourceReplacementCommand(
        reusedReplacementKey,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_REPLACEMENT_IDEMPOTENCY_KEY_REUSED",
      }),
    );

    expect(
      await sourceReplacements.registerProjectSourceReplacement(
        structuredClone(replacement),
      ),
    ).toEqual(replacement);
    expect(
      await sourceReplacements.getProjectSourceReplacement(
        project.project_id,
        replacement.project_source_replacement_id,
      ),
    ).toEqual(replacement);
    expect(
      await sourceReplacements.getProjectSourceSuccessor(
        project.project_id,
        replaced.project_source_id,
      ),
    ).toEqual(replacement);
    expect(
      await sourceReplacements.listProjectSourceReplacementChain(
        project.project_id,
        replaced.project_source_id,
      ),
    ).toEqual([replacement]);

    const location = await objectLocations.locateProjectObject({
      project_id: project.project_id,
      object_ref: {
        semantic_key: "petra.project-source",
        object_id: replaced.project_source_id,
      },
      task_intent: "inspect",
    });
    expect(location?.content.resolution).toEqual(
      expect.objectContaining({
        state: "superseded",
        replacement_chain: [
          {
            semantic_key: "petra.project-source",
            object_id: successor.project_source_id,
            revision: successor.revision,
            record_hash: canonicalHash(successor),
          },
        ],
      }),
    );
    expect(location?.content.primary_destination.role).toBe("sources");
    await expect(
      pool.query(
        `UPDATE petra.project_source_replacements
            SET replacement_kind = 'identity_resolution'
          WHERE project_source_replacement_id = $1`,
        [replacement.project_source_replacement_id],
      ),
    ).rejects.toBeDefined();

    const duplicate = structuredClone(replacement);
    duplicate.project_source_replacement_id =
      "project_source_replacement_01K4C000000000000000000042";
    duplicate.content.rationale = "Attempt a second successor.";
    duplicate.content_hash = canonicalHash(duplicate.content);
    await expect(
      sourceReplacements.registerProjectSourceReplacement(duplicate),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_REPLACEMENT_ALREADY_LINKED",
      }),
    );

    const selfReplacement = structuredClone(replacement);
    selfReplacement.project_source_replacement_id =
      "project_source_replacement_01K4C000000000000000000045";
    selfReplacement.content.replaced_source_ref = {
      ...structuredClone(replacement.content.replacement_source_ref),
      status: "excluded",
    };
    selfReplacement.content.replacement_source_ref = structuredClone(
      replacement.content.replacement_source_ref,
    );
    selfReplacement.content_hash = canonicalHash(selfReplacement.content);
    await expect(
      sourceReplacements.registerProjectSourceReplacement(selfReplacement),
    ).rejects.toEqual(
      expect.objectContaining({ code: "PROJECT_SOURCE_REPLACEMENT_CYCLE" }),
    );

    const restoreWhileReplaced = structuredClone(excludeCommand);
    restoreWhileReplaced.command_id = "command_01K4C000000000000000000066";
    restoreWhileReplaced.idempotency_key =
      "project-source:007:restore:while-replaced";
    restoreWhileReplaced.command = {
      command_name: "RestoreProjectSource",
      expected_source_ref: {
        project_source_id: replaced.project_source_id,
        revision: replaced.revision,
        content_hash: replaced.content_hash,
        record_hash: canonicalHash(replaced),
        status: "excluded",
      },
      reason: "Verify that replacement undo must precede source restoration.",
    };
    await expect(
      sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        restoreWhileReplaced,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_LIFECYCLE_ACTIVE_REPLACEMENT",
      }),
    );

    const retractionTemplate =
      readFixture<PetraProjectSourceReplacementRetraction>(
        "project-source-replacement-retraction",
      );
    retractionTemplate.content.replacement_ref = {
      project_source_replacement_id: replacement.project_source_replacement_id,
      revision: replacement.revision,
      content_hash: replacement.content_hash,
      record_hash: canonicalHash(replacement),
    };
    retractionTemplate.content_hash = canonicalHash(retractionTemplate.content);

    const staleRetraction = structuredClone(retractionTemplate);
    staleRetraction.project_source_replacement_retraction_id =
      "project_source_retraction_01K4C000000000000000000049";
    staleRetraction.content.replacement_ref.record_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    staleRetraction.content_hash = canonicalHash(staleRetraction.content);
    await expect(
      sourceReplacements.registerProjectSourceReplacementRetraction(
        staleRetraction,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_REPLACEMENT_RETRACTION_REPLACEMENT_STALE",
      }),
    );

    const retractReplacement =
      readFixture<ProjectSourceReplacementCommandEnvelope>(
        "command-retract-project-source-replacement",
      );
    if (
      retractReplacement.command.command_name !==
      "RetractProjectSourceReplacement"
    ) {
      throw new Error("Expected replacement retraction fixture.");
    }
    retractReplacement.command.expected_replacement_ref = {
      project_source_replacement_id: replacement.project_source_replacement_id,
      revision: replacement.revision,
      content_hash: replacement.content_hash,
      record_hash: canonicalHash(replacement),
      state: "active",
    };
    const retracted =
      await sourceReplacementCommands.executeProjectSourceReplacementCommand(
        retractReplacement,
      );
    if (retracted.outcome !== "replacement_retracted") {
      throw new Error("Expected replacement retraction result.");
    }
    const retraction = retracted.retraction;
    expect(retracted.applied).toBe(true);
    expect(retracted.receipt.content.recovery).toEqual({
      recovery_kind: "separate_source_status_transition",
      source_status: "unchanged",
      separate_command_name: "RestoreProjectSource",
      effect: "relationship_inactive_predecessor_not_restored",
    });
    const retractReplay =
      await sourceReplacementCommands.executeProjectSourceReplacementCommand(
        structuredClone(retractReplacement),
      );
    expect(retractReplay.applied).toBe(false);
    expect(retractReplay.receipt).toEqual(retracted.receipt);
    expect(
      await sourceReplacements.registerProjectSourceReplacementRetraction(
        structuredClone(retraction),
      ),
    ).toEqual(retraction);
    expect(
      await sourceReplacements.getProjectSourceReplacementRetraction(
        project.project_id,
        retraction.project_source_replacement_retraction_id,
      ),
    ).toEqual(retraction);
    expect(
      await sourceReplacements.getProjectSourceReplacement(
        project.project_id,
        replacement.project_source_replacement_id,
      ),
    ).toEqual(replacement);
    expect(
      await sourceReplacements.getProjectSourceSuccessor(
        project.project_id,
        replaced.project_source_id,
      ),
    ).toBeUndefined();
    expect(
      await sourceReplacements.listProjectSourceReplacementChain(
        project.project_id,
        replaced.project_source_id,
      ),
    ).toEqual([]);
    expect(
      await projectSources.getProjectSource(
        project.project_id,
        replaced.project_source_id,
      ),
    ).toEqual(replaced);
    const recentHistory = await historyViews.getRecentProjectHistoryView(
      project.project_id,
    );
    expect(recentHistory?.content.changes).toHaveLength(3);
    expect(
      recentHistory?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual([
      "project_source.replacement_retracted",
      "project_source.replacement_created",
      "project_source.excluded",
    ]);
    expect(
      recentHistory?.content.changes.map(
        ({ event_ref }) => event_ref.schema_version,
      ),
    ).toEqual(["1.3.0", "1.3.0", "1.2.0"]);
    expect(recentHistory?.content.changes[0]?.recovery).toEqual(
      expect.objectContaining({
        eligibility: "eligible",
        command_name: "RestoreProjectSource",
      }),
    );
    expect(recentHistory?.content.changes[1]?.recovery).toEqual(
      expect.objectContaining({ eligibility: "ineligible" }),
    );
    expect(recentHistory?.content.graph_navigation_history).toBe(
      "client_local_separate",
    );
    expect(recentHistory?.content.quick_window_limit).toBe(10);
    const retainedFirst = await historyViews.listRetainedProjectHistoryView(
      project.project_id,
      { limit: 2 },
    );
    expect(
      retainedFirst?.content.changes.map(
        ({ event_ref }) => event_ref.schema_version,
      ),
    ).toEqual(["1.3.0", "1.3.0"]);
    const retainedFirstPage = retainedFirst?.content.page;
    if (retainedFirstPage === undefined || !retainedFirstPage.has_more) {
      throw new Error("Expected retained ProjectSource History continuation.");
    }
    const retainedSecond = await historyViews.listRetainedProjectHistoryView(
      project.project_id,
      { limit: 2, cursor: retainedFirstPage.next_cursor },
    );
    expect(
      retainedSecond?.content.changes.map(({ event_ref }) => [
        event_ref.schema_version,
        event_ref.event_type,
      ]),
    ).toEqual([["1.2.0", "project_source.excluded"]]);
    expect(retainedSecond?.content.page.has_more).toBe(false);
    expect(retainedSecond?.content.retention_snapshot).toEqual(
      retainedFirst?.content.retention_snapshot,
    );
    const predecessorHistory =
      await historyViews.listRetainedProjectHistoryView(project.project_id, {
        limit: 10,
        filters: {
          target: {
            semantic_key: "petra.project-source",
            object_id: replaced.project_source_id,
          },
        },
      });
    expect(
      predecessorHistory?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual([
      "project_source.replacement_retracted",
      "project_source.replacement_created",
      "project_source.excluded",
    ]);
    expect(predecessorHistory?.content.page.snapshot_total_count).toBe(3);
    const successorHistory = await historyViews.listRetainedProjectHistoryView(
      project.project_id,
      {
        filters: {
          target: {
            semantic_key: "petra.project-source",
            object_id: successor.project_source_id,
          },
        },
      },
    );
    expect(
      successorHistory?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual([
      "project_source.replacement_retracted",
      "project_source.replacement_created",
    ]);
    const replacementFilters = {
      family: "project_source_replacement" as const,
      target: {
        semantic_key: "petra.project-source-replacement" as const,
        object_id: replacement.project_source_replacement_id,
      },
    };
    const replacementHistoryFirst =
      await historyViews.listRetainedProjectHistoryView(project.project_id, {
        limit: 1,
        filters: replacementFilters,
      });
    expect(
      replacementHistoryFirst?.content.changes[0]?.event_ref.event_type,
    ).toBe("project_source.replacement_retracted");
    expect(replacementHistoryFirst?.content.page.snapshot_total_count).toBe(2);
    const replacementHistoryFirstPage = replacementHistoryFirst?.content.page;
    if (
      replacementHistoryFirstPage === undefined ||
      !replacementHistoryFirstPage.has_more
    ) {
      throw new Error("Expected filtered replacement History continuation.");
    }
    const replacementHistorySecond =
      await historyViews.listRetainedProjectHistoryView(project.project_id, {
        limit: 1,
        cursor: replacementHistoryFirstPage.next_cursor,
        filters: replacementFilters,
      });
    expect(
      replacementHistorySecond?.content.changes[0]?.event_ref.event_type,
    ).toBe("project_source.replacement_created");
    await expect(
      historyViews.listRetainedProjectHistoryView(project.project_id, {
        limit: 1,
        cursor: replacementHistoryFirstPage.next_cursor,
        filters: {
          ...replacementFilters,
          target: {
            semantic_key: "petra.project-source",
            object_id: replaced.project_source_id,
          },
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_HISTORY_VIEW_REQUEST_INVALID",
      }),
    );
    const retractionHistory = await historyViews.listRetainedProjectHistoryView(
      project.project_id,
      {
        filters: {
          target: {
            semantic_key: "petra.project-source-replacement-retraction",
            object_id: retraction.project_source_replacement_retraction_id,
          },
        },
      },
    );
    expect(
      retractionHistory?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual(["project_source.replacement_retracted"]);
    const lifecycleHistory = await historyViews.listRetainedProjectHistoryView(
      project.project_id,
      {
        filters: { family: "project_source_lifecycle" },
      },
    );
    expect(
      lifecycleHistory?.content.changes.map(
        ({ event_ref }) => event_ref.event_type,
      ),
    ).toEqual(["project_source.excluded"]);
    const retractionEvent = recentHistory?.content.changes[0]?.event_ref;
    if (retractionEvent === undefined) {
      throw new Error("Expected replacement-retraction History.");
    }
    const retractionEpisode = await historyViews.getProjectHistoryEpisodeView(
      project.project_id,
      retractionEvent.event_id,
    );
    expect(retractionEpisode?.content.receipt_ref).toEqual(
      expect.objectContaining({
        schema_name: "petra.project-source-replacement-receipt",
        record_id: retracted.receipt.project_source_replacement_receipt_id,
      }),
    );
    expect(
      retractionEpisode?.content.stream_order.previous_event_ref?.event_type,
    ).toBe("project_source.replacement_created");
    expect(
      retractionEpisode?.content.stream_order.next_event_ref,
    ).toBeUndefined();
    expect(retractionEpisode?.content.omissions).toEqual([
      "dependency_impact_not_composed",
      "generic_reversal_assessment_not_composed",
      "historical_project_definition_content_not_returned",
      "cross_family_total_order_not_asserted",
    ]);
    const retractionImpact = await historyViews.getProjectHistoryImpactView(
      project.project_id,
      retractionEvent.event_id,
    );
    expect(retractionImpact?.content.selected_event.event_ref).toMatchObject({
      schema_version: "1.3.0",
      event_type: "project_source.replacement_retracted",
    });
    expect(
      retractionImpact?.content.impact.outbox_records.refs.every(
        ({ schema_version }) => schema_version === "1.3.0",
      ),
    ).toBe(true);
    expect(retractionImpact?.content.decision_boundary.compensation).toBe(
      "not_composed",
    );
    expect(retractionImpact?.schema_version).toBe("1.4.0");
    const replacementAssessment =
      retractionImpact?.content.semantic_target_impact.target_assessments[0];
    expect(replacementAssessment?.adapter_state).toBe("registered");
    expect(
      replacementAssessment?.groups.map(({ adapter_kind }) => adapter_kind),
    ).toEqual([
      "project_source_replacement_lineage",
      "project_source_replacement_receipt",
      "project_source_effective_head",
    ]);
    expect(replacementAssessment?.groups[0]?.refs).toEqual([
      expect.objectContaining({
        semantic_key: "petra.project-source-replacement-retraction",
        object_id: retraction.project_source_replacement_retraction_id,
        posture: "immutable_revision",
        relation: "retracts_exact_source_replacement",
      }),
    ]);
    expect(replacementAssessment?.groups[1]).toMatchObject({
      authority_source: "immutable_project_source_replacement_receipts",
      total_count: 2,
      returned_count: 2,
      coverage: "complete",
    });
    expect(replacementAssessment?.groups[2]?.refs).toEqual([
      expect.objectContaining({
        object_id: replacement.project_source_replacement_id,
        posture: "current",
        relation: "is_current_retracted_replacement_head",
      }),
    ]);
    const predecessorAssessment =
      retractionImpact?.content.semantic_target_impact.target_assessments[1];
    expect(predecessorAssessment?.adapter_state).toBe("registered");
    expect(predecessorAssessment?.groups[2]?.refs).toEqual([
      expect.objectContaining({
        object_id: replacement.project_source_replacement_id,
        posture: "immutable_revision",
        relation: "retains_exact_replaced_source",
      }),
    ]);
    expect(predecessorAssessment?.groups[3]?.refs).toEqual([
      expect.objectContaining({
        object_id: replacement.project_source_replacement_id,
        posture: "current",
        relation: "is_current_retracted_replacement_head",
      }),
    ]);
    const retractionAssessment =
      retractionImpact?.content.semantic_target_impact.target_assessments[3];
    expect(retractionAssessment).toMatchObject({
      adapter_state: "no_registered_exact_adapter",
      reason:
        "No exact semantic-target adapter is registered for this semantic key.",
      groups: [],
    });
    expect(
      await historyViews.getProjectHistoryImpactView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        retractionEvent.event_id,
      ),
    ).toBeUndefined();

    const exclusionEvent = recentHistory?.content.changes[2]?.event_ref;
    if (exclusionEvent === undefined) {
      throw new Error("Expected ProjectSource exclusion History.");
    }
    const exclusionImpact = await historyViews.getProjectHistoryImpactView(
      project.project_id,
      exclusionEvent.event_id,
    );
    expect(exclusionImpact?.content.selected_event.event_ref).toMatchObject({
      schema_version: "1.2.0",
      event_type: "project_source.excluded",
    });
    expect(exclusionImpact?.content.impact.summary.coverage).toBe("complete");
    expect(exclusionImpact?.content.omissions).toContain(
      "unregistered_semantic_target_adapters_not_composed",
    );
    const exclusionSourceAssessment =
      exclusionImpact?.content.semantic_target_impact.target_assessments[0];
    expect(exclusionSourceAssessment?.adapter_state).toBe("registered");
    expect(
      exclusionSourceAssessment?.groups.map(({ adapter_kind }) => adapter_kind),
    ).toEqual([
      "project_source_lifecycle",
      "project_source_dependency",
      "project_source_replacement_lineage",
      "project_source_effective_head",
    ]);
    expect(exclusionSourceAssessment?.groups[0]?.refs).toEqual([
      expect.objectContaining({
        object_id: exclusion.receipt.project_source_lifecycle_receipt_id,
        relation: "records_exact_source_resulting_revision",
      }),
    ]);
    expect(exclusionSourceAssessment?.groups[1]).toMatchObject({
      total_count: 0,
      returned_count: 0,
      coverage: "complete",
    });
    expect(exclusionSourceAssessment?.groups[2]?.refs).toEqual([
      expect.objectContaining({
        object_id: replacement.project_source_replacement_id,
        posture: "immutable_revision",
        relation: "retains_exact_replaced_source",
      }),
    ]);
    expect(exclusionSourceAssessment?.groups[3]?.refs).toEqual([
      expect.objectContaining({
        object_id: replacement.project_source_replacement_id,
        posture: "current",
        relation: "is_current_retracted_replacement_head",
      }),
    ]);
    const staleReceipt = structuredClone(replacement);
    staleReceipt.project_source_replacement_id =
      "project_source_replacement_01K4C000000000000000000046";
    staleReceipt.content.exclusion_receipt_ref.record_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    staleReceipt.content_hash = canonicalHash(staleReceipt.content);
    await expect(
      sourceReplacements.registerProjectSourceReplacement(staleReceipt),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_REPLACEMENT_EXCLUSION_RECEIPT_STALE",
      }),
    );
    const governedEvents = await pool.query<{ event_type: string }>(
      `SELECT event_type
         FROM petra.domain_events
        WHERE project_id = $1
          AND event_type IN (
            'project_source.replacement_created',
            'project_source.replacement_retracted'
          )
        ORDER BY stream_revision`,
      [project.project_id],
    );
    expect(governedEvents.rows).toEqual([
      { event_type: "project_source.replacement_created" },
      { event_type: "project_source.replacement_retracted" },
    ]);
    const governedOutbox = await pool.query<{ target: string }>(
      `SELECT outbox.target
         FROM petra.outbox_records AS outbox
         JOIN petra.domain_events AS event ON event.event_id = outbox.event_id
        WHERE event.project_id = $1
          AND event.event_type IN (
            'project_source.replacement_created',
            'project_source.replacement_retracted'
          )
        ORDER BY outbox.outbox_position`,
      [project.project_id],
    );
    expect(governedOutbox.rows).toEqual([
      { target: "neo4j_graph" },
      { target: "interface_authority" },
      { target: "neo4j_graph" },
      { target: "interface_authority" },
    ]);
    await expect(
      pool.query(
        `UPDATE petra.project_source_replacement_receipts
            SET recorded_at = recorded_at + interval '1 second'
          WHERE command_id = $1`,
        [createReplacement.command_id],
      ),
    ).rejects.toBeDefined();

    const locationAfterRetraction = await objectLocations.locateProjectObject({
      project_id: project.project_id,
      object_ref: {
        semantic_key: "petra.project-source",
        object_id: replaced.project_source_id,
      },
      task_intent: "inspect",
    });
    const resolutionAfterRetraction =
      locationAfterRetraction?.content.resolution;
    expect(resolutionAfterRetraction).toEqual(
      expect.objectContaining({
        state: "current",
        replacement_chain: [],
      }),
    );
    if (resolutionAfterRetraction?.state !== "current") {
      throw new Error("Expected current source after replacement retraction.");
    }
    expect(resolutionAfterRetraction.descriptor.lifecycle_state).toBe(
      "excluded",
    );
    await expect(
      pool.query(
        `UPDATE petra.project_source_replacement_retractions
            SET reason = 'mutated'
          WHERE project_source_replacement_retraction_id = $1`,
        [retraction.project_source_replacement_retraction_id],
      ),
    ).rejects.toBeDefined();

    const repeatedRetraction = structuredClone(retraction);
    repeatedRetraction.project_source_replacement_retraction_id =
      "project_source_retraction_01K4C000000000000000000050";
    repeatedRetraction.content.reason = "Attempt a second retraction.";
    repeatedRetraction.content_hash = canonicalHash(repeatedRetraction.content);
    await expect(
      sourceReplacements.registerProjectSourceReplacementRetraction(
        repeatedRetraction,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        code: "PROJECT_SOURCE_REPLACEMENT_RETRACTION_NOT_ACTIVE",
      }),
    );

    expect(
      await sourceReplacements.registerProjectSourceReplacement(duplicate),
    ).toEqual(duplicate);
    expect(
      await sourceReplacements.getProjectSourceSuccessor(
        project.project_id,
        replaced.project_source_id,
      ),
    ).toEqual(duplicate);
    const head = await pool.query<{
      head_revision: string;
      state: string;
    }>(
      `SELECT head_revision::text, state
         FROM petra.project_source_replacement_heads
        WHERE project_id = $1 AND replaced_project_source_id = $2`,
      [project.project_id, replaced.project_source_id],
    );
    expect(head.rows).toEqual([{ head_revision: "3", state: "active" }]);
    await expect(
      pool.query(
        `UPDATE petra.project_source_replacement_heads
            SET state = 'retracted'
          WHERE project_id = $1 AND replaced_project_source_id = $2`,
        [project.project_id, replaced.project_source_id],
      ),
    ).rejects.toBeDefined();
  });

  it("rejects incomplete and internally misaligned bundles atomically", async () => {
    const source = await registerArtifactChain();
    const incomplete = documentBundle(source.manifest.artifact_manifest_id);
    incomplete.blocks = [];
    await expectDocumentCode(
      () => documents.registerDocumentBundle(incomplete),
      "DOCUMENT_BUNDLE_INCOMPLETE",
    );

    const misaligned = documentBundle(source.manifest.artifact_manifest_id);
    const span = misaligned.spans[0];
    if (span === undefined) throw new Error("Expected SourceSpan fixture.");
    span.parser_run_id = "parser_run_01ARZ3NDEKTSV4RRFFQ69G5FBC";
    await expectDocumentCode(
      () => documents.registerDocumentBundle(misaligned),
      "DOCUMENT_RELATION_INVALID",
    );

    const count = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM petra.parsed_documents",
    );
    expect(count.rows[0]?.count).toBe("0");
  });

  it("requires the exact source acquisition to permit parsing", async () => {
    const source = await registerArtifactChain({ parsePermitted: false });
    await expectDocumentCode(
      () =>
        documents.registerDocumentBundle(
          documentBundle(source.manifest.artifact_manifest_id),
        ),
      "DOCUMENT_PARSE_NOT_PERMITTED",
    );
    expect(
      await documents.getParsedDocument(
        readFixture<PetraParsedDocument>("parsed-document").parsed_document_id,
      ),
    ).toBe(undefined);
  });

  it("requires parser-output lineage back to the exact source Artifact", async () => {
    const source = await registerArtifactChain({
      retainSourceLineage: false,
    });
    await expectDocumentCode(
      () =>
        documents.registerDocumentBundle(
          documentBundle(source.manifest.artifact_manifest_id),
        ),
      "DOCUMENT_RELATION_INVALID",
    );
  });

  it("allows exact retry but rejects ParsedDocument and parser-run rebound", async () => {
    const source = await registerArtifactChain();
    const input = documentBundle(source.manifest.artifact_manifest_id);
    await documents.registerDocumentBundle(input);

    const changed = structuredClone(input);
    changed.document.quality_state = "partial";
    await expectDocumentCode(
      () => documents.registerDocumentBundle(changed),
      "DOCUMENT_ID_CONFLICT",
    );

    const rebound = structuredClone(input);
    rebound.document.parsed_document_id =
      "parsed_document_01ARZ3NDEKTSV4RRFFQ69G5FBC";
    for (const block of rebound.blocks) {
      block.parsed_document_id = rebound.document.parsed_document_id;
    }
    for (const span of rebound.spans) {
      span.parsed_document_id = rebound.document.parsed_document_id;
    }
    await expectDocumentCode(
      () => documents.registerDocumentBundle(rebound),
      "PARSER_RUN_ID_CONFLICT",
    );
  });

  it("enforces append-only document authority inside PostgreSQL", async () => {
    const source = await registerArtifactChain();
    const input = documentBundle(source.manifest.artifact_manifest_id);
    await documents.registerDocumentBundle(input);

    await expect(
      pool.query(
        "UPDATE petra.source_spans SET verification_status = 'unresolved' WHERE source_span_id = $1",
        [input.spans[0]?.source_span_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        "DELETE FROM petra.parsed_documents WHERE parsed_document_id = $1",
        [input.document.parsed_document_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        `INSERT INTO petra.parsed_document_block_declarations (
           parsed_document_id, reading_order, structural_block_id
         ) VALUES ($1, 1, 'structural_block_01ARZ3NDEKTSV4RRFFQ69G5FBC')`,
        [input.document.parsed_document_id],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "23514" }));

    const counts = await pool.query<{
      documents: string;
      blocks: string;
      spans: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.parsed_documents)::text AS documents,
         (SELECT count(*) FROM petra.structural_blocks)::text AS blocks,
         (SELECT count(*) FROM petra.source_spans)::text AS spans`,
    );
    expect(counts.rows[0]).toEqual({
      documents: "1",
      blocks: "1",
      spans: "1",
    });
  });
});
