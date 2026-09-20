import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraCapabilityGrantV1110,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSourceRegistrationRequest,
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

const bytes = new TextEncoder().encode("Petra source registration\n");
const bytesHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const project = readFixture<PetraProject>("project");
const definition = readFixture<PetraProjectDefinition>(
  "project-definition-scientific",
);
const human = readFixture<PetraActor>("actor");
const grantId = "capability_grant_01K6S000000000000000000001";

const request = (): PetraProjectSourceRegistrationRequest => ({
  schema_name: "petra.project-source-registration-request",
  schema_version: "1.0.0",
  command_id: "command_01K6S000000000000000000001",
  idempotency_key: "wave6:postgres:source-registration",
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
    title: "New exact source registration",
    work_kind: "journal_article",
    identity_status: "provisional",
    authors: [
      {
        display_name: "Ada Source",
        author_kind: "person",
        identity_status: "provisional",
      },
      {
        display_name: "Petra Research Group",
        author_kind: "organization",
        identity_status: "provisional",
      },
    ],
    version_label: "author supplied manuscript",
    publication_status: "unknown",
    metadata_source_name: "Project author",
    metadata_retrieved_at: "2026-09-19T12:00:00.000Z",
  },
  material: {
    encoding: "base64",
    content_base64: Buffer.from(bytes).toString("base64"),
    expected_content_hash: bytesHash,
    artifact_kind: "structured_text",
    media_type: "text/plain; charset=utf-8",
    original_filename: "new-source.txt",
  },
  rights: {
    source_location: "https://example.test/new-source.txt",
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
    rationale: "The Project author supplied this exact copy for private use.",
    observed_at: "2026-09-19T12:00:00.000Z",
    policy_version: "petra-local-rights-v1",
  },
  project_membership: {
    decision: "register_and_link",
    source_role: "scientific.literature",
    reviewed_at: "2026-09-19T12:05:00.000Z",
  },
});

describePostgres("PostgresProjectSourceRegistrationAuthority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const capabilities = new PostgresCapabilityGrantAuthorityRepository(pool);
  const stage = vi.fn<ArtifactStore["stage"]>(async (input) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of input.bytes) chunks.push(chunk);
    const stagedBytes = Buffer.concat(chunks);
    expect(stagedBytes.equals(bytes)).toBe(true);
    expect(input.expectedContentHash).toBe(bytesHash);
    return {
      stageId: "wave6-source-registration-stage",
      stagingKey: "staging/wave6-source-registration-stage",
      stagedAt: "2026-09-19T12:05:30.000Z",
      contentHash: bytesHash,
      byteSize: bytes.byteLength,
      mediaType: "text/plain; charset=utf-8",
      verification: {
        status: "verified",
        declaredMediaType: "text/plain; charset=utf-8",
        observedMediaType: "text/plain; charset=utf-8",
        method: "utf-8-sample",
        problems: [],
      },
    };
  });
  const makeAvailable = vi.fn<ArtifactStore["makeAvailable"]>((staged) =>
    Promise.resolve({
      storeName: "petra-test-artifacts",
      objectKey: `sha256/74/${bytesHash.slice("sha256:".length + 2)}`,
      availableAt: "2026-09-19T12:05:31.000Z",
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
  const authority = new PostgresProjectSourceRegistrationAuthority(
    pool,
    store,
    new PostgresCapabilityGrantCommandAuthorizer(),
  );
  const principal = {
    actor: { actor_id: human.actor_id, actor_kind: "human" as const },
    capabilityGrantId: grantId,
  };

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(human);
    await scopes.registerProjectRevision(project);
    await definitions.registerDefinitionRevision(definition);
    const content: PetraCapabilityGrantV1110["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["RegisterProjectSource"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason: "Allow the Project owner to register reviewed new sources.",
    };
    const grant: PetraCapabilityGrantV1110 = {
      schema_name: "petra.capability-grant",
      schema_version: "1.11.0",
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
  });

  afterAll(async () => {
    await pool.end();
  });

  it("atomically retains identity, material, rights, membership, idempotent receipt, and recovery", async () => {
    const submitted = request();
    const first = await authority.executeProjectSourceRegistration(
      project.project_id,
      submitted,
      principal,
    );
    expect(first.applied).toBe(true);
    expect(first.receipt.project_definition_ref).toStrictEqual(
      submitted.expected.project_definition_ref,
    );
    expect(first.receipt.membership).toMatchObject({
      decision: "registered_and_linked",
      source_role: "scientific.literature",
      reviewed_by: principal.actor,
    });
    expect(first.receipt.material.artifact_ref).toMatchObject({
      content_hash: bytesHash,
      byte_size: bytes.byteLength,
      media_type: submitted.material.media_type,
    });
    expect(first.projectSource.content.author_refs).toHaveLength(2);
    expect(first.receipt.destination).toStrictEqual({
      place_role: "sources",
      project_id: project.project_id,
      project_source_id: first.projectSource.project_source_id,
    });

    const replay = await authority.executeProjectSourceRegistration(
      project.project_id,
      submitted,
      principal,
    );
    expect(replay).toStrictEqual({ ...first, applied: false });
    expect(stage).toHaveBeenCalledTimes(1);

    const confirmed = await authority.assessProjectSourceRegistrationRecovery(
      project.project_id,
      submitted,
      principal,
    );
    expect(confirmed.effect).toMatchObject({
      state: "effect_confirmed",
      receipt: first.receipt,
    });
    expect(confirmed.return).toStrictEqual({
      state: "exact",
      destination: first.receipt.destination,
    });

    const counts = await pool.query<{
      authors: string;
      works: string;
      versions: string;
      artifacts: string;
      rights: string;
      sources: string;
      receipts: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.author_revisions)::text AS authors,
         (SELECT count(*) FROM petra.work_revisions)::text AS works,
         (SELECT count(*) FROM petra.work_version_revisions)::text AS versions,
         (SELECT count(*) FROM petra.artifacts)::text AS artifacts,
         (SELECT count(*) FROM petra.rights_decisions)::text AS rights,
         (SELECT count(*) FROM petra.project_source_revisions)::text AS sources,
         (SELECT count(*) FROM petra.project_source_registration_receipts)::text AS receipts`,
    );
    expect(counts.rows[0]).toStrictEqual({
      authors: "2",
      works: "1",
      versions: "1",
      artifacts: "1",
      rights: "1",
      sources: "1",
      receipts: "1",
    });

    const unknownRequest = {
      ...submitted,
      command_id: "command_01K6S000000000000000000002",
      idempotency_key: "wave6:postgres:source-registration:unknown",
    };
    const unknown = await authority.assessProjectSourceRegistrationRecovery(
      project.project_id,
      unknownRequest,
      principal,
    );
    expect(unknown.effect).toMatchObject({
      state: "outcome_unknown",
      reason: "receipt_not_observed_at_cutoff",
      retry: { reuse_exact_request: true },
    });
    expect(unknown.return).toMatchObject({
      state: "safe_fallback",
      destination: { place_role: "sources", project_id: project.project_id },
    });
  });
});
