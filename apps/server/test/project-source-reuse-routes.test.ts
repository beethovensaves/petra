import { readFileSync } from "node:fs";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraProjectSource,
  PetraProjectSourceReuseOptionsView,
  PetraProjectSourceReuseReceipt,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
  PetraRightsDecision,
} from "@petra/contracts";
import type {
  ProjectSourceReuseAuthority,
  ProjectSourceReuseOptionsReader,
  ProjectSourceReusePrincipal,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "source-reuse-route-token";
const PROJECT_ID = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const COMMAND_ID = "command_01K6T000000000000000000001";
const ACTOR_ID = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
const GRANT_ID = "capability_grant_01K6T000000000000000000001";
const hash = (character: string): string => `sha256:${character.repeat(64)}`;

const fixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const projectSource = fixture<PetraProjectSource>("project-source");
const artifact = fixture<PetraArtifact>("artifact");
const manifest = fixture<PetraArtifactManifest>("artifact-manifest");
const rights = fixture<PetraRightsDecision>("rights-decision");

const request: PetraProjectSourceReuseRequest = {
  schema_name: "petra.project-source-reuse-request",
  schema_version: "1.0.0",
  command_id: COMMAND_ID,
  idempotency_key: "wave6:route:source-reuse",
  expected: {
    project_ref: {
      project_id: PROJECT_ID,
      revision: 1,
      record_hash: hash("1"),
    },
    project_definition_ref: {
      ...projectSource.content.project_definition_ref,
      record_hash: hash("2"),
    },
  },
  existing_source: {
    origin_project_source_ref: {
      project_id: projectSource.project_id,
      project_source_id: projectSource.project_source_id,
      revision: projectSource.revision,
      content_hash: projectSource.content_hash,
      record_hash: hash("3"),
      status: projectSource.content.status,
    },
    work_ref: projectSource.content.work_ref,
    work_version_ref: projectSource.content.work_version_ref,
    artifact_ref: {
      artifact_id: artifact.artifact_id,
      revision: 1,
      content_hash: artifact.content_hash,
      record_hash: hash("4"),
    },
    artifact_manifest_ref: projectSource.content.artifact_manifest_ref,
    rights_decision_ref: {
      record_id: rights.rights_decision_id,
      revision: 1,
      record_hash: hash("5"),
    },
  },
  project_membership: {
    decision: "reuse_and_link",
    source_role: "scientific.literature",
  },
};

const resultSource: PetraProjectSource = {
  ...projectSource,
  project_source_id: "project_source_01K6T000000000000000000001",
  added_at: "2026-09-20T10:00:00.000Z",
};

const receipt: PetraProjectSourceReuseReceipt = {
  schema_name: "petra.project-source-reuse-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_reuse_receipt_01K6T000000000000000000001",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("6"),
  project_id: PROJECT_ID,
  actor: { actor_id: ACTOR_ID, actor_kind: "human" },
  capability_grant_id: GRANT_ID,
  project_ref: request.expected.project_ref,
  project_definition_ref: request.expected.project_definition_ref,
  existing_source: request.existing_source,
  material_outcome: {
    kind: "existing_permitted_copy_reused",
    canonical_identity_cloned: false,
    artifact_cloned: false,
    bytes_cloned: false,
    storage_unchanged: true,
    availability: "available",
  },
  membership: {
    decision: "reused_and_linked",
    source_role: request.project_membership.source_role,
    linked_by: { actor_id: ACTOR_ID, actor_kind: "human" },
    linked_at: "2026-09-20T10:00:00.000Z",
  },
  project_source_ref: {
    project_source_id: resultSource.project_source_id,
    revision: 1,
    content_hash: resultSource.content_hash,
    record_hash: hash("7"),
    status: "active",
  },
  effect: {
    kind: "source_reused_and_linked",
    summary: "The exact retained copy is linked without cloning its bytes.",
    meaning_authority_unchanged: true,
  },
  destination: {
    place_role: "sources",
    project_id: PROJECT_ID,
    project_source_id: resultSource.project_source_id,
  },
  recovery: {
    command_path: `/api/commands/projects/${PROJECT_ID}/sources/reuse`,
    assessment_path: `/api/queries/projects/${PROJECT_ID}/source-reuse-recovery`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-20T10:00:00.000Z",
  record_hash: hash("8"),
};

const recovery: PetraProjectSourceReuseRecoveryView = {
  schema_name: "petra.project-source-reuse-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "source_reuse_recovery_01K6T000000000000000000001",
  project_id: PROJECT_ID,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash("6"),
  },
  effect: { state: "effect_confirmed", receipt },
  return: { state: "exact", destination: receipt.destination },
  observed_at: "2026-09-20T10:01:00.000Z",
  content_hash: hash("9"),
};

const optionsView: PetraProjectSourceReuseOptionsView = {
  schema_name: "petra.project-source-reuse-options-view",
  schema_version: "1.0.0",
  project_id: PROJECT_ID,
  expected: request.expected,
  profile: {
    resolution: "project_authored",
    definition_family: "petra.scientific-evidence",
    label: "Scientific evidence inquiry",
    purpose: "Compare evidence without changing source authority.",
  },
  source_roles: [
    {
      semantic_key: "scientific.literature",
      label: "Source",
      meaning: "A versioned and rights-governed basis.",
    },
  ],
  availability: {
    state: "available",
    reason: "permitted_sources_found",
    message: "Choose a retained source copy.",
  },
  counts: { permitted: 1, already_linked: 0 },
  candidates: [
    {
      display: {
        title: "Reusable source",
        contributors: ["Ada Source"],
        version_label: "accepted manuscript",
        publication_status: "accepted",
        origin_project_name: "Source Project",
        origin_source_role: {
          semantic_key: "scientific.literature",
          label: "Source",
          meaning: "A versioned and rights-governed basis.",
        },
        origin_membership_status: "active",
        copy_status: "available_for_reuse",
      },
      existing_source: request.existing_source,
    },
  ],
};

const principal = {
  actor: { actor_id: ACTOR_ID, actor_kind: "human" as const },
  capabilityGrantId: GRANT_ID,
};

const resolver = {
  resolveCommandPrincipal: vi.fn(() =>
    Promise.resolve({
      state: "resolved" as const,
      actor: principal.actor,
      capabilityGrantId: GRANT_ID,
    }),
  ),
};

describe("project source reuse routes", () => {
  it("authenticates, resolves server authority, reuses, and reconciles exact return", async () => {
    expect(manifest.artifact_manifest_id).toBe(
      request.existing_source.artifact_manifest_ref.artifact_manifest_id,
    );
    const authority: ProjectSourceReuseAuthority = {
      executeProjectSourceReuse: vi.fn(
        (
          projectId: string,
          submitted: PetraProjectSourceReuseRequest,
          resolved: ProjectSourceReusePrincipal,
        ) => {
          expect(projectId).toBe(PROJECT_ID);
          expect(submitted).toStrictEqual(request);
          expect(resolved).toStrictEqual(principal);
          return Promise.resolve({
            receipt,
            projectSource: resultSource,
            applied: true,
          });
        },
      ),
      assessProjectSourceReuseRecovery: vi.fn(() => Promise.resolve(recovery)),
    };
    const options: ProjectSourceReuseOptionsReader = {
      readProjectSourceReuseOptions: vi.fn((projectId, resolved) => {
        expect(projectId).toBe(PROJECT_ID);
        expect(resolved).toStrictEqual(principal);
        return Promise.resolve(optionsView);
      }),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolver,
      projectSourceReuseAuthority: authority,
      projectSourceReuseOptions: options,
    });
    const headers = {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    };
    const commandResponse = await petra.app.request(
      `/api/commands/projects/${PROJECT_ID}/sources/reuse`,
      { method: "POST", headers, body: JSON.stringify(request) },
    );
    expect(commandResponse.status).toBe(201);
    expect(await commandResponse.json()).toStrictEqual({
      receipt,
      projectSource: resultSource,
      applied: true,
    });
    const optionsResponse = await petra.app.request(
      `/api/queries/projects/${PROJECT_ID}/source-reuse-options`,
      { headers: { authorization: `Bearer ${TOKEN}` } },
    );
    expect(optionsResponse.status).toBe(200);
    expect(optionsResponse.headers.get("cache-control")).toBe("no-store");
    expect(await optionsResponse.json()).toStrictEqual(optionsView);
    const recoveryResponse = await petra.app.request(
      `/api/queries/projects/${PROJECT_ID}/source-reuse-recovery`,
      { method: "POST", headers, body: JSON.stringify(request) },
    );
    expect(recoveryResponse.status).toBe(200);
    expect(await recoveryResponse.json()).toStrictEqual(recovery);
    expect(resolver.resolveCommandPrincipal).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      commandName: "ReuseProjectSource",
    });
  });

  it("fails closed for crossed Project bindings and missing authentication", async () => {
    const executeProjectSourceReuse = vi.fn();
    const authority: ProjectSourceReuseAuthority = {
      executeProjectSourceReuse,
      assessProjectSourceReuseRecovery: vi.fn(),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolver,
      projectSourceReuseAuthority: authority,
    });
    const crossed = {
      ...request,
      expected: {
        ...request.expected,
        project_ref: {
          ...request.expected.project_ref,
          project_id: "project_01K4E000000000000000000001",
        },
      },
    };
    const response = await petra.app.request(
      `/api/commands/projects/${PROJECT_ID}/sources/reuse`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(crossed),
      },
    );
    expect(response.status).toBe(409);
    expect(executeProjectSourceReuse).not.toHaveBeenCalled();

    for (const path of [
      `/api/commands/projects/${PROJECT_ID}/sources/reuse`,
      `/api/queries/projects/${PROJECT_ID}/source-reuse-recovery`,
    ]) {
      const unauthorized = await petra.app.request(path, { method: "POST" });
      expect(unauthorized.status).toBe(401);
    }
    const unauthorizedOptions = await petra.app.request(
      `/api/queries/projects/${PROJECT_ID}/source-reuse-options`,
    );
    expect(unauthorizedOptions.status).toBe(401);
  });

  it("fails closed when the selector crosses its target Project", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolver,
      projectSourceReuseOptions: {
        readProjectSourceReuseOptions: vi.fn(() =>
          Promise.resolve({
            ...optionsView,
            project_id: "project_01K4E000000000000000000001",
          }),
        ),
      },
    });
    const response = await petra.app.request(
      `/api/queries/projects/${PROJECT_ID}/source-reuse-options`,
      { headers: { authorization: `Bearer ${TOKEN}` } },
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PROJECT_SOURCE_REUSE_FAILED" },
    });
  });
});
