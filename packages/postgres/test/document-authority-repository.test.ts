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
import { PostgresProjectObjectLocationViewReader } from "../src/project-object-location-view-reader.js";
import { PostgresProjectShellViewReader } from "../src/project-shell-view-reader.js";
import { PostgresProjectSourceAuthorityRepository } from "../src/project-source-authority-repository.js";
import { PostgresProjectSourceLifecycleAuthorityRepository } from "../src/project-source-lifecycle-authority-repository.js";
import { PostgresProjectSourceLifecycleViewReader } from "../src/project-source-lifecycle-view-reader.js";
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
  const eventIds = [
    "event_01K4C000000000000000000031",
    "event_01K4C000000000000000000034",
  ];
  const outboxIds = [
    "outbox_01K4C000000000000000000032",
    "outbox_01K4C000000000000000000033",
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
  const sourceViews = new PostgresProjectSourceViewReader(pool);
  const objectLocations = new PostgresProjectObjectLocationViewReader(pool);
  const shellViews = new PostgresProjectShellViewReader(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    eventIndex = 0;
    outboxIndex = 0;
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
    expect(shell?.schema_version).toBe("1.1.0");
    if (shell?.schema_version !== "1.1.0") {
      throw new Error("Expected the Project shell 1.1 view.");
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
    const denied = new PostgresProjectSourceLifecycleAuthorityRepository(pool, {
      authorize: () => false,
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
    const replay =
      await sourceLifecycleAuthority.executeProjectSourceLifecycleCommand(
        structuredClone(excludeCommand),
      );
    expect(replay.applied).toBe(false);
    expect(replay.receipt).toEqual(exclusion.receipt);

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
