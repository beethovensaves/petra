import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraCapabilityGrantV1120,
  PetraProject,
  PetraProjectDefinition,
  PetraRegisteredProjectProfile,
  PetraProjectSourceReuseRequest,
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
  PostgresProjectProfileRuntime,
  PostgresProjectSourceRegistrationAuthority,
  PostgresProjectSourceReuseAuthority,
  PostgresProjectSourceReuseOptionsReader,
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

const bytes = new TextEncoder().encode("Petra source reuse\n");
const bytesHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sourceProject = readFixture<PetraProject>("project");
const sourceDefinitionFixture = readFixture<PetraProjectDefinition>(
  "project-definition-scientific",
);
const targetProject = readFixture<PetraProject>("project-controlled-writing");
const targetDefinitionFixture = readFixture<PetraProjectDefinition>(
  "project-definition-controlled-writing",
);
const scientificProfile = readFixture<PetraRegisteredProjectProfile>(
  "registered-project-profile-scientific-v1-2",
);
const writingProfile = readFixture<PetraRegisteredProjectProfile>(
  "registered-project-profile-controlled-writing",
);
const sourceDefinition: PetraProjectDefinition = {
  ...sourceDefinitionFixture,
  origin: {
    origin_kind: "template_seed",
    template_id: scientificProfile.profile_id,
    template_version: scientificProfile.profile_version,
    template_hash: scientificProfile.content_hash,
  },
  content: structuredClone(scientificProfile.content.definition),
  content_hash: canonicalHash(scientificProfile.content.definition),
};
const targetDefinition: PetraProjectDefinition = {
  ...targetDefinitionFixture,
  origin: {
    origin_kind: "template_seed",
    template_id: writingProfile.profile_id,
    template_version: writingProfile.profile_version,
    template_hash: writingProfile.content_hash,
  },
  content: structuredClone(writingProfile.content.definition),
  content_hash: canonicalHash(writingProfile.content.definition),
};
const human = readFixture<PetraActor>("actor");
const otherHuman: PetraActor = {
  ...human,
  actor_id: "actor_01K6T000000000000000000052",
  display_name: "Other Project owner",
};
const otherTargetProject: PetraProject = {
  ...targetProject,
  project_id: "project_01K6T000000000000000000050",
  name: "Other controlled writing Project",
  created_by: { actor_id: otherHuman.actor_id, actor_kind: "human" },
};
const otherTargetDefinition: PetraProjectDefinition = {
  ...targetDefinition,
  project_definition_id: "project_definition_01K6T000000000000000000051",
  project_id: otherTargetProject.project_id,
  created_by: { actor_id: otherHuman.actor_id, actor_kind: "human" },
};
const unsupportedTargetProject: PetraProject = {
  ...targetProject,
  project_id: "project_01K6T000000000000000000053",
  name: "Unsupported profile Project",
};
const unsupportedTargetDefinition: PetraProjectDefinition = {
  ...structuredClone(targetDefinition),
  project_definition_id: "project_definition_01K6T000000000000000000054",
  project_id: unsupportedTargetProject.project_id,
  origin: {
    origin_kind: "template_seed",
    template_id: "project_template_01K6T000000000000000000055",
    template_version: "9.9.9",
    template_hash: canonicalHash({ unsupported: "profile" }),
  },
};

const registrationRequest = (): PetraProjectSourceRegistrationRequest => ({
  schema_name: "petra.project-source-registration-request",
  schema_version: "1.0.0",
  command_id: "command_01K6T000000000000000000001",
  idempotency_key: "wave6:postgres:source-reuse:origin",
  expected: {
    project_ref: {
      project_id: sourceProject.project_id,
      revision: sourceProject.revision,
      record_hash: canonicalHash(sourceProject),
    },
    project_definition_ref: {
      project_definition_id: sourceDefinition.project_definition_id,
      revision: sourceDefinition.revision,
      content_hash: sourceDefinition.content_hash,
      record_hash: canonicalHash(sourceDefinition),
    },
  },
  source_identity: {
    title: "Exact source reused across Projects",
    work_kind: "journal_article",
    identity_status: "provisional",
    authors: [
      {
        display_name: "Ada Source",
        author_kind: "person",
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
    original_filename: "reused-source.txt",
  },
  rights: {
    source_location: "https://example.test/reused-source.txt",
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

describePostgres("PostgresProjectSourceReuseAuthority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const profiles = new PostgresProjectProfileRuntime(pool);
  const capabilities = new PostgresCapabilityGrantAuthorityRepository(pool);
  const sourceGrantId = "capability_grant_01K6T000000000000000000001";
  const targetGrantId = "capability_grant_01K6T000000000000000000002";
  const otherTargetGrantId = "capability_grant_01K6T000000000000000000003";
  const unsupportedTargetGrantId =
    "capability_grant_01K6T000000000000000000004";
  const stage = vi.fn<ArtifactStore["stage"]>(async (input) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of input.bytes) chunks.push(chunk);
    const stagedBytes = Buffer.concat(chunks);
    expect(stagedBytes.equals(bytes)).toBe(true);
    return {
      stageId: "wave6-source-reuse-stage",
      stagingKey: "staging/wave6-source-reuse-stage",
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
      objectKey: `sha256/${bytesHash.slice(7, 9)}/${bytesHash.slice(9)}`,
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
    deleteByHash: vi.fn(),
    cleanupAbandonedStaging: vi.fn(),
  };
  const authorizer = new PostgresCapabilityGrantCommandAuthorizer();
  const registrations = new PostgresProjectSourceRegistrationAuthority(
    pool,
    store,
    authorizer,
  );
  const reuses = new PostgresProjectSourceReuseAuthority(pool, authorizer);
  const reuseOptions = new PostgresProjectSourceReuseOptionsReader(
    pool,
    authorizer,
  );
  const sourcePrincipal = {
    actor: { actor_id: human.actor_id, actor_kind: "human" as const },
    capabilityGrantId: sourceGrantId,
  };
  const targetPrincipal = {
    actor: sourcePrincipal.actor,
    capabilityGrantId: targetGrantId,
  };
  const otherTargetPrincipal = {
    actor: { actor_id: otherHuman.actor_id, actor_kind: "human" as const },
    capabilityGrantId: otherTargetGrantId,
  };
  const unsupportedTargetPrincipal = {
    actor: sourcePrincipal.actor,
    capabilityGrantId: unsupportedTargetGrantId,
  };
  let request: PetraProjectSourceReuseRequest;

  beforeAll(async () => {
    await pool.query("SELECT 1");
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(human);
    await scopes.registerActor(otherHuman);
    await profiles.registerProfile(scientificProfile);
    await profiles.registerProfile(writingProfile);
    await scopes.registerProjectRevision(sourceProject);
    await scopes.registerProjectRevision(targetProject);
    await scopes.registerProjectRevision(otherTargetProject);
    await scopes.registerProjectRevision(unsupportedTargetProject);
    await definitions.registerDefinitionRevision(sourceDefinition);
    await definitions.registerDefinitionRevision(targetDefinition);
    await definitions.registerDefinitionRevision(otherTargetDefinition);
    await definitions.registerDefinitionRevision(unsupportedTargetDefinition);

    const sourceContent: PetraCapabilityGrantV1120["content"] = {
      scope_kind: "project_commands",
      allowed_commands: ["RegisterProjectSource", "ReuseProjectSource"],
      valid_from: "2026-09-01T00:00:00.000Z",
      reason: "Allow exact new-source registration and reuse selection.",
    };
    await capabilities.registerCapabilityGrant({
      schema_name: "petra.capability-grant",
      schema_version: "1.12.0",
      capability_grant_id: sourceGrantId,
      revision: 1,
      project_id: sourceProject.project_id,
      grantee: sourcePrincipal.actor,
      content: sourceContent,
      content_hash: canonicalHash(sourceContent),
      issued_by: sourcePrincipal.actor,
      issued_at: "2026-09-01T00:00:00.000Z",
    });

    const reuseGrant = async (
      capabilityGrantId: string,
      project: PetraProject,
      actor: typeof targetPrincipal.actor,
    ) => {
      const content: PetraCapabilityGrantV1120["content"] = {
        scope_kind: "project_commands",
        allowed_commands: ["ReuseProjectSource"],
        valid_from: "2026-09-01T00:00:00.000Z",
        reason: "Allow exact existing-source reuse.",
      };
      await capabilities.registerCapabilityGrant({
        schema_name: "petra.capability-grant",
        schema_version: "1.12.0",
        capability_grant_id: capabilityGrantId,
        revision: 1,
        project_id: project.project_id,
        grantee: actor,
        content,
        content_hash: canonicalHash(content),
        issued_by: actor,
        issued_at: "2026-09-01T00:00:00.000Z",
      });
    };
    await reuseGrant(targetGrantId, targetProject, targetPrincipal.actor);
    await reuseGrant(
      otherTargetGrantId,
      otherTargetProject,
      otherTargetPrincipal.actor,
    );
    await reuseGrant(
      unsupportedTargetGrantId,
      unsupportedTargetProject,
      unsupportedTargetPrincipal.actor,
    );

    const registered = await registrations.executeProjectSourceRegistration(
      sourceProject.project_id,
      registrationRequest(),
      sourcePrincipal,
    );
    request = {
      schema_name: "petra.project-source-reuse-request",
      schema_version: "1.0.0",
      command_id: "command_01K6T000000000000000000002",
      idempotency_key: "wave6:postgres:source-reuse",
      expected: {
        project_ref: {
          project_id: targetProject.project_id,
          revision: targetProject.revision,
          record_hash: canonicalHash(targetProject),
        },
        project_definition_ref: {
          project_definition_id: targetDefinition.project_definition_id,
          revision: targetDefinition.revision,
          content_hash: targetDefinition.content_hash,
          record_hash: canonicalHash(targetDefinition),
        },
      },
      existing_source: {
        origin_project_source_ref: {
          project_id: sourceProject.project_id,
          ...registered.receipt.project_source_ref,
        },
        work_ref: registered.projectSource.content.work_ref,
        work_version_ref: registered.projectSource.content.work_version_ref,
        artifact_ref: {
          artifact_id: registered.receipt.material.artifact_ref.artifact_id,
          revision: 1,
          content_hash: registered.receipt.material.artifact_ref.content_hash,
          record_hash: registered.receipt.material.artifact_ref.record_hash,
        },
        artifact_manifest_ref:
          registered.projectSource.content.artifact_manifest_ref,
        rights_decision_ref: {
          record_id: registered.receipt.material.rights_decision_ref.record_id,
          revision: 1,
          record_hash:
            registered.receipt.material.rights_decision_ref.record_hash,
        },
      },
      project_membership: {
        decision: "reuse_and_link",
        source_role: "writing.authority-source",
      },
    };
  });

  afterAll(async () => {
    await pool.end();
  });

  it("lists exact owned copies for paired profiles and fails closed for authorization and unsupported profiles", async () => {
    const writing = await reuseOptions.readProjectSourceReuseOptions(
      targetProject.project_id,
      targetPrincipal,
    );
    expect(writing.profile).toMatchObject({
      resolution: "registered",
      definition_family: "petra.controlled-writing",
      label: "Controlled writing",
    });
    expect(writing.source_roles).toStrictEqual([
      {
        semantic_key: "writing.authority-source",
        label: "Authority source",
        meaning:
          "A versioned basis that governs or informs the controlled document.",
      },
    ]);
    expect(writing.availability).toMatchObject({
      state: "available",
      reason: "permitted_sources_found",
    });
    expect(writing.counts).toStrictEqual({
      permitted: 1,
      already_linked: 0,
    });
    expect(writing.candidates[0]).toMatchObject({
      display: {
        title: "Exact source reused across Projects",
        contributors: ["Ada Source"],
        origin_project_name: sourceProject.name,
        origin_source_role: {
          semantic_key: "scientific.literature",
          label: "Source",
        },
        copy_status: "available_for_reuse",
      },
      existing_source: request.existing_source,
    });
    expect(writing.expected).toStrictEqual(request.expected);
    const serialized = JSON.stringify(writing);
    expect(serialized).not.toContain("capability_grant");
    expect(serialized).not.toContain("actor_id");
    expect(serialized).not.toContain("storage_ref");
    expect(serialized).not.toContain("object_key");
    expect(serialized).not.toContain("recorded_at");

    const scientific = await reuseOptions.readProjectSourceReuseOptions(
      sourceProject.project_id,
      sourcePrincipal,
    );
    expect(scientific.profile.definition_family).toBe(
      "petra.scientific-evidence",
    );
    expect(scientific.source_roles[0]?.semantic_key).toBe(
      "scientific.literature",
    );
    expect(scientific).toMatchObject({
      availability: {
        state: "empty",
        reason: "all_permitted_sources_already_linked",
      },
      counts: { permitted: 0, already_linked: 1 },
      candidates: [],
    });

    const notOwned = await reuseOptions.readProjectSourceReuseOptions(
      otherTargetProject.project_id,
      otherTargetPrincipal,
    );
    expect(notOwned).toMatchObject({
      availability: { state: "empty", reason: "no_permitted_sources" },
      counts: { permitted: 0, already_linked: 0 },
      candidates: [],
    });

    const unsupported = await reuseOptions.readProjectSourceReuseOptions(
      unsupportedTargetProject.project_id,
      unsupportedTargetPrincipal,
    );
    expect(unsupported).toMatchObject({
      profile: { resolution: "unsupported" },
      source_roles: [],
      availability: { state: "unsupported", reason: "profile_unsupported" },
      counts: { permitted: 0, already_linked: 0 },
      candidates: [],
    });

    await expect(
      reuseOptions.readProjectSourceReuseOptions(
        targetProject.project_id,
        sourcePrincipal,
      ),
    ).rejects.toMatchObject({ code: "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED" });
  });

  it("links only a new Project membership, replays idempotently, and reconciles exact return", async () => {
    const first = await reuses.executeProjectSourceReuse(
      targetProject.project_id,
      request,
      targetPrincipal,
    );
    expect(first.applied).toBe(true);
    expect(first.projectSource.project_id).toBe(targetProject.project_id);
    expect(first.projectSource.content).toMatchObject({
      source_role: "writing.authority-source",
      work_ref: request.existing_source.work_ref,
      work_version_ref: request.existing_source.work_version_ref,
      artifact_manifest_ref: request.existing_source.artifact_manifest_ref,
      status: "active",
    });
    expect(first.receipt.material_outcome).toStrictEqual({
      kind: "existing_permitted_copy_reused",
      canonical_identity_cloned: false,
      artifact_cloned: false,
      bytes_cloned: false,
      storage_unchanged: true,
      availability: "available",
    });
    expect(first.receipt.destination).toStrictEqual({
      place_role: "sources",
      project_id: targetProject.project_id,
      project_source_id: first.projectSource.project_source_id,
    });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        request,
        targetPrincipal,
      ),
    ).resolves.toStrictEqual({ ...first, applied: false });
    expect(stage).toHaveBeenCalledTimes(1);
    expect(makeAvailable).toHaveBeenCalledTimes(1);

    const recovery = await reuses.assessProjectSourceReuseRecovery(
      targetProject.project_id,
      request,
      targetPrincipal,
    );
    expect(recovery.effect).toMatchObject({
      state: "effect_confirmed",
      receipt: first.receipt,
    });
    expect(recovery.return).toStrictEqual({
      state: "exact",
      destination: first.receipt.destination,
    });

    const unknownRequest = {
      ...request,
      command_id: "command_01K6T000000000000000000011",
      idempotency_key: "wave6:postgres:source-reuse:unknown",
    };
    const unknown = await reuses.assessProjectSourceReuseRecovery(
      targetProject.project_id,
      unknownRequest,
      targetPrincipal,
    );
    expect(unknown.effect).toMatchObject({
      state: "outcome_unknown",
      reason: "receipt_not_observed_at_cutoff",
      retry: { reuse_exact_request: true },
    });
    expect(unknown.return).toMatchObject({
      state: "safe_fallback",
      destination: {
        place_role: "sources",
        project_id: targetProject.project_id,
      },
    });

    const counts = await pool.query<{
      works: string;
      versions: string;
      artifacts: string;
      rights: string;
      sources: string;
      registrations: string;
      reuses: string;
    }>(
      `SELECT
         (SELECT count(*) FROM petra.work_revisions)::text AS works,
         (SELECT count(*) FROM petra.work_version_revisions)::text AS versions,
         (SELECT count(*) FROM petra.artifacts)::text AS artifacts,
         (SELECT count(*) FROM petra.rights_decisions)::text AS rights,
         (SELECT count(*) FROM petra.project_source_revisions)::text AS sources,
         (SELECT count(*) FROM petra.project_source_registration_receipts)::text AS registrations,
         (SELECT count(*) FROM petra.project_source_reuse_receipts)::text AS reuses`,
    );
    expect(counts.rows[0]).toStrictEqual({
      works: "1",
      versions: "1",
      artifacts: "1",
      rights: "1",
      sources: "2",
      registrations: "1",
      reuses: "1",
    });
  });

  it("rejects stale/crossed identities, duplicate membership, and a copy owned by another human", async () => {
    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          command_id: "command_01K6T000000000000000000006",
          idempotency_key: "wave6:postgres:source-reuse:project-stale",
          expected: {
            ...request.expected,
            project_ref: {
              ...request.expected.project_ref,
              record_hash: canonicalHash({ stale: "project" }),
            },
          },
        },
        targetPrincipal,
      ),
    ).rejects.toMatchObject({ code: "PROJECT_SOURCE_REUSE_PROJECT_STALE" });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          command_id: "command_01K6T000000000000000000007",
          idempotency_key: "wave6:postgres:source-reuse:definition-stale",
          expected: {
            ...request.expected,
            project_definition_ref: {
              ...request.expected.project_definition_ref,
              record_hash: canonicalHash({ stale: "definition" }),
            },
          },
        },
        targetPrincipal,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_REUSE_DEFINITION_STALE",
    });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          command_id: "command_01K6T000000000000000000008",
          idempotency_key: "wave6:postgres:source-reuse:role-unregistered",
          project_membership: {
            decision: "reuse_and_link",
            source_role: "writing.unregistered-source",
          },
        },
        targetPrincipal,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_REUSE_ROLE_UNREGISTERED",
    });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          command_id: "command_01K6T000000000000000000003",
          idempotency_key: "wave6:postgres:source-reuse:duplicate",
        },
        targetPrincipal,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_REUSE_MEMBERSHIP_DUPLICATE",
    });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          command_id: "command_01K6T000000000000000000004",
          idempotency_key: "wave6:postgres:source-reuse:crossed",
          existing_source: {
            ...request.existing_source,
            work_ref: {
              ...request.existing_source.work_ref,
              work_id: "work_01K6T000000000000000000099",
            },
          },
        },
        targetPrincipal,
      ),
    ).rejects.toMatchObject({ code: "PROJECT_SOURCE_REUSE_IDENTITY_CROSSED" });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          command_id: "command_01K6T000000000000000000009",
          idempotency_key: "wave6:postgres:source-reuse:origin-stale",
          existing_source: {
            ...request.existing_source,
            origin_project_source_ref: {
              ...request.existing_source.origin_project_source_ref,
              revision: 2,
            },
          },
        },
        targetPrincipal,
      ),
    ).rejects.toMatchObject({ code: "PROJECT_SOURCE_REUSE_SOURCE_STALE" });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          idempotency_key: "wave6:postgres:source-reuse:crossed-command",
        },
        targetPrincipal,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_REUSE_COMMAND_CONFLICT",
    });

    await expect(
      reuses.executeProjectSourceReuse(
        targetProject.project_id,
        {
          ...request,
          command_id: "command_01K6T000000000000000000010",
          idempotency_key: "wave6:postgres:source-reuse:not-authorized",
        },
        sourcePrincipal,
      ),
    ).rejects.toMatchObject({ code: "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED" });

    const unauthorizedRequest: PetraProjectSourceReuseRequest = {
      ...request,
      command_id: "command_01K6T000000000000000000005",
      idempotency_key: "wave6:postgres:source-reuse:copy-denied",
      expected: {
        project_ref: {
          project_id: otherTargetProject.project_id,
          revision: otherTargetProject.revision,
          record_hash: canonicalHash(otherTargetProject),
        },
        project_definition_ref: {
          project_definition_id: otherTargetDefinition.project_definition_id,
          revision: otherTargetDefinition.revision,
          content_hash: otherTargetDefinition.content_hash,
          record_hash: canonicalHash(otherTargetDefinition),
        },
      },
    };
    await expect(
      reuses.executeProjectSourceReuse(
        otherTargetProject.project_id,
        unauthorizedRequest,
        otherTargetPrincipal,
      ),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_REUSE_COPY_NOT_AUTHORIZED",
    });
  });
});
