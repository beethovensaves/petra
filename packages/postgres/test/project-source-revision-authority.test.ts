import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraCapabilityGrantV1140,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSourceRegistrationRequest,
  PetraProjectSourceRevisionRequest,
} from "@petra/contracts";
import type { ArtifactStore } from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectSourceRegistrationAuthority,
  PostgresProjectSourceRevisionAuthority,
  PostgresResearchScopeRepository,
} from "../src/index.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe.sequential;

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
const contentHash = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const originalBytes = new TextEncoder().encode("Petra original source\n");
const revisionBytes = new TextEncoder().encode("Petra corrected source\n");
const project = readFixture<PetraProject>("project");
const definition = readFixture<PetraProjectDefinition>(
  "project-definition-scientific",
);
const human = readFixture<PetraActor>("actor");
const grantId = "capability_grant_01K6V000000000000000000001";

const registrationRequest = (): PetraProjectSourceRegistrationRequest => ({
  schema_name: "petra.project-source-registration-request",
  schema_version: "1.0.0",
  command_id: "command_01K6V000000000000000000001",
  idempotency_key: "wave6:postgres:source-revision:predecessor",
  expected: {
    project_ref: {
      project_id: project.project_id,
      revision: project.revision,
      record_hash: canonicalHash(project),
    },
    project_definition_ref: {
      project_definition_id: definition.project_definition_id,
      revision: definition.revision,
      content_hash: definition.content_hash,
      record_hash: canonicalHash(definition),
    },
  },
  source_identity: {
    title: "Versioned source",
    work_kind: "journal_article",
    identity_status: "provisional",
    authors: [
      {
        display_name: "Ada Version",
        author_kind: "person",
        identity_status: "provisional",
      },
    ],
    version_label: "original manuscript",
    publication_status: "unknown",
    metadata_source_name: "Project author",
    metadata_retrieved_at: "2026-09-01T12:00:00.000Z",
  },
  material: {
    encoding: "base64",
    content_base64: Buffer.from(originalBytes).toString("base64"),
    expected_content_hash: contentHash(originalBytes),
    artifact_kind: "structured_text",
    media_type: "text/plain; charset=utf-8",
    original_filename: "original.txt",
  },
  rights: {
    source_location: "https://example.test/original.txt",
    license_status: "unknown",
    access_basis: "user_supplied",
    decision_status: "unknown",
    permissions: {
      store_raw_bytes: true,
      parse: true,
      index: true,
      embed: false,
      send_selected_text_remotely: false,
      quote_publicly: false,
      redistribute_artifact: false,
    },
    conditions: [],
    required_notices: [],
    rationale: "The author supplied this exact private copy.",
    observed_at: "2026-09-01T12:00:00.000Z",
    policy_version: "petra-local-rights-v1",
  },
  project_membership: {
    decision: "register_and_link",
    source_role: "scientific.literature",
    reviewed_at: "2026-09-01T12:00:00.000Z",
  },
});

describePostgres("PostgresProjectSourceRevisionAuthority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const capabilities = new PostgresCapabilityGrantAuthorityRepository(pool);
  const stagedHashes: string[] = [];
  const stage = vi.fn<ArtifactStore["stage"]>(async (input) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of input.bytes) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    const hash = contentHash(bytes);
    stagedHashes.push(hash);
    expect(hash).toBe(input.expectedContentHash);
    return {
      stageId: `stage-${stagedHashes.length}`,
      stagingKey: `staging/stage-${stagedHashes.length}`,
      stagedAt: "2026-09-01T12:01:00.000Z",
      contentHash: hash,
      byteSize: bytes.byteLength,
      mediaType: input.declaredMediaType,
      verification: {
        status: "verified",
        declaredMediaType: input.declaredMediaType,
        observedMediaType: input.declaredMediaType,
        method: "test-exact-bytes",
        problems: [],
      },
    };
  });
  const makeAvailable = vi.fn<ArtifactStore["makeAvailable"]>((staged) =>
    Promise.resolve({
      storeName: "petra-test-artifacts",
      objectKey: `sha256/${staged.contentHash.slice("sha256:".length)}`,
      availableAt: "2026-09-01T12:01:01.000Z",
      contentHash: staged.contentHash,
      byteSize: staged.byteSize,
      mediaType: staged.mediaType,
      verification: staged.verification,
    }),
  );
  const store: ArtifactStore = {
    stage,
    makeAvailable,
    inspectByHash: vi.fn(),
    readByHash: vi.fn(),
    cleanupAbandonedStaging: vi.fn(),
  };
  const authorizer = new PostgresCapabilityGrantCommandAuthorizer();
  const registrations = new PostgresProjectSourceRegistrationAuthority(
    pool,
    store,
    authorizer,
  );
  const revisions = new PostgresProjectSourceRevisionAuthority(
    pool,
    store,
    authorizer,
  );
  const principal = {
    actor: { actor_id: human.actor_id, actor_kind: "human" as const },
    capabilityGrantId: grantId,
  };
  let request: PetraProjectSourceRevisionRequest;

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(human);
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);
    const content: PetraCapabilityGrantV1140["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["RegisterProjectSource", "AddProjectSourceRevision"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason: "Allow exact source registration and immutable version intake.",
    };
    const grant: PetraCapabilityGrantV1140 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.14.0",
      capability_grant_id: grantId,
      revision: 1,
      project_id: project.project_id,
      grantee: principal.actor,
      content,
      content_hash: canonicalHash(content),
      issued_by: principal.actor,
      issued_at: "2026-09-01T00:00:00.000Z",
    };
    await capabilities.registerCapabilityGrant(grant);
    const predecessor = await registrations.executeProjectSourceRegistration(
      project.project_id,
      registrationRequest(),
      principal,
    );
    request = {
      schema_name: "petra.project-source-revision-request",
      schema_version: "1.0.0",
      command_id: "command_01K6V000000000000000000002",
      idempotency_key: "wave6:postgres:source-revision:intake",
      expected: {
        project_ref: registrationRequest().expected.project_ref,
        project_definition_ref:
          registrationRequest().expected.project_definition_ref,
        current_source_ref: {
          project_source_id: predecessor.projectSource.project_source_id,
          revision: predecessor.projectSource.revision,
          content_hash: predecessor.projectSource.content_hash,
          record_hash: canonicalHash(predecessor.projectSource),
          status: "active",
        },
      },
      version: {
        version_label: "corrected manuscript",
        publication_status: "corrected",
        metadata_source_name: "Project author",
        metadata_retrieved_at: "2026-09-01T13:00:00.000Z",
      },
      material: {
        encoding: "base64",
        content_base64: Buffer.from(revisionBytes).toString("base64"),
        expected_content_hash: contentHash(revisionBytes),
        artifact_kind: "structured_text",
        media_type: "text/plain; charset=utf-8",
        original_filename: "corrected.txt",
      },
      rights: {
        ...registrationRequest().rights,
        source_location: "https://example.test/corrected.txt",
        observed_at: "2026-09-01T13:00:00.000Z",
      },
      replacement: {
        replacement_kind: "newer_version",
        rationale: "Use the corrected manuscript after governed replacement.",
        reviewed_at: "2026-09-01T13:00:00.000Z",
      },
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  it("retains exact new bytes and ancestry, replays idempotently, and hands off governed replacement", async () => {
    const first = await revisions.executeProjectSourceRevision(
      project.project_id,
      request,
      principal,
    );
    expect(first.applied).toBe(true);
    expect(first.receipt.predecessor_source_ref).toStrictEqual(
      request.expected.current_source_ref,
    );
    expect(first.receipt.work_ref.record_id).toBe(
      first.projectSource.content.work_ref.work_id,
    );
    expect(first.receipt.work_version_ref.record_id).toBe(
      first.projectSource.content.work_version_ref.work_version_id,
    );
    expect(first.receipt.material.artifact_ref.content_hash).toBe(
      contentHash(revisionBytes),
    );
    expect(first.receipt.replacement_handoff).toMatchObject({
      state: "governed_replacement_required",
      exclude_predecessor: {
        command_name: "ExcludeProjectSource",
        expected_source_ref: request.expected.current_source_ref,
      },
      create_replacement: {
        command_name: "CreateProjectSourceReplacement",
        replacement_kind: "newer_version",
        replacement_source_ref: first.receipt.successor_source_ref,
        replaced_source_from: "exclude_result.resulting_source_ref",
        exclusion_receipt_from: "exclude_result.receipt",
      },
    });

    const replay = await revisions.executeProjectSourceRevision(
      project.project_id,
      request,
      principal,
    );
    expect(replay).toStrictEqual({ ...first, applied: false });
    expect(stage).toHaveBeenCalledTimes(2);

    const recovery = await revisions.assessProjectSourceRevisionRecovery(
      project.project_id,
      request,
      principal,
    );
    expect(recovery.effect).toStrictEqual({
      state: "effect_confirmed",
      receipt: first.receipt,
    });
    expect(recovery.return).toStrictEqual({
      state: "exact",
      destination: first.receipt.destination,
    });

    const state = await pool.query<{
      predecessor_status: string;
      versions: string;
      sources: string;
      receipts: string;
    }>(
      `SELECT
         (SELECT status FROM petra.project_source_revisions
           WHERE project_source_id = $1 AND revision = 1) AS predecessor_status,
         (SELECT count(*) FROM petra.work_version_revisions)::text AS versions,
         (SELECT count(*) FROM petra.project_source_revisions)::text AS sources,
         (SELECT count(*) FROM petra.project_source_revision_receipts)::text AS receipts`,
      [request.expected.current_source_ref.project_source_id],
    );
    expect(state.rows[0]).toStrictEqual({
      predecessor_status: "active",
      versions: "2",
      sources: "2",
      receipts: "1",
    });
  });
});
