import { readFileSync } from "node:fs";

import type {
  PetraProjectSource,
  PetraProjectSourceRegistrationReceipt,
  PetraProjectSourceRegistrationRecoveryView,
  PetraProjectSourceRegistrationRequest,
} from "@petra/contracts";
import type {
  ProjectSourceRegistrationAuthority,
  ProjectSourceRegistrationPrincipal,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "source-registration-route-token";
const PROJECT_ID = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const COMMAND_ID = "command_01K6S000000000000000000001";
const ACTOR_ID = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
const GRANT_ID = "capability_grant_01K6S000000000000000000001";
const hash = (character: string): string => `sha256:${character.repeat(64)}`;

const projectSource = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-source.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSource;

const request: PetraProjectSourceRegistrationRequest = {
  schema_name: "petra.project-source-registration-request",
  schema_version: "1.0.0",
  command_id: COMMAND_ID,
  idempotency_key: "wave6:route:source-registration",
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
  source_identity: {
    title: "A reviewed source",
    work_kind: "journal_article",
    identity_status: "provisional",
    authors: [
      {
        display_name: "Ada Example",
        author_kind: "person",
        identity_status: "provisional",
      },
    ],
    version_label: "submitted copy",
    publication_status: "unknown",
    metadata_source_name: "Project author",
    metadata_retrieved_at: "2026-09-19T12:00:00.000Z",
  },
  material: {
    encoding: "base64",
    content_base64: "UGV0cmEgc291cmNlIHJlZ2lzdHJhdGlvbgo=",
    expected_content_hash:
      "sha256:740848ac8984cf03157c420dcfbdf66c592d96d0901d29d9993b006dc7bae02d",
    artifact_kind: "structured_text",
    media_type: "text/plain; charset=utf-8",
    original_filename: "reviewed-source.txt",
  },
  rights: {
    source_location: "https://example.test/reviewed-source.txt",
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
};

const receipt: PetraProjectSourceRegistrationReceipt = {
  schema_name: "petra.project-source-registration-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_registration_receipt_01K6S000000000000000000001",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("3"),
  project_id: PROJECT_ID,
  actor: { actor_id: ACTOR_ID, actor_kind: "human" },
  capability_grant_id: GRANT_ID,
  project_ref: request.expected.project_ref,
  project_definition_ref: request.expected.project_definition_ref,
  source_identity: {
    work_ref: {
      record_id: projectSource.content.work_ref.work_id,
      revision: 1,
      record_hash: projectSource.content.work_ref.record_hash,
    },
    work_version_ref: {
      record_id: projectSource.content.work_version_ref.work_version_id,
      revision: 1,
      record_hash: projectSource.content.work_version_ref.record_hash,
    },
    author_refs: [
      {
        record_id: projectSource.content.author_refs[0].author_id,
        revision: 1,
        record_hash: projectSource.content.author_refs[0].record_hash,
      },
    ],
  },
  material: {
    artifact_ref: {
      artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1",
      revision: 1,
      content_hash: request.material.expected_content_hash,
      record_hash: hash("4"),
      byte_size: 26,
      media_type: request.material.media_type,
    },
    artifact_manifest_ref: {
      record_id:
        projectSource.content.artifact_manifest_ref.artifact_manifest_id,
      revision: 1,
      record_hash: projectSource.content.artifact_manifest_ref.record_hash,
    },
    rights_decision_ref: {
      record_id: "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB3",
      revision: 1,
      record_hash: hash("5"),
    },
    storage: {
      store_name: "petra-artifacts",
      object_key: "sha256/74/0848ac",
      availability: "available",
    },
    origin: {
      origin_kind: "user_supplied",
      original_filename: request.material.original_filename,
      source_location: request.rights.source_location,
    },
  },
  membership: {
    decision: "registered_and_linked",
    source_role: request.project_membership.source_role,
    reviewed_by: { actor_id: ACTOR_ID, actor_kind: "human" },
    reviewed_at: request.project_membership.reviewed_at,
  },
  project_source_ref: {
    project_source_id: projectSource.project_source_id,
    revision: 1,
    content_hash: projectSource.content_hash,
    record_hash: hash("6"),
    status: "active",
  },
  effect: {
    kind: "source_registered_and_linked",
    summary: "The reviewed source is retained.",
    meaning_authority_unchanged: true,
  },
  destination: {
    place_role: "sources",
    project_id: PROJECT_ID,
    project_source_id: projectSource.project_source_id,
  },
  recovery: {
    command_path: `/api/commands/projects/${PROJECT_ID}/sources/register`,
    assessment_path: `/api/queries/projects/${PROJECT_ID}/source-registration-recovery`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-19T12:06:00.000Z",
  record_hash: hash("7"),
};

const recovery: PetraProjectSourceRegistrationRecoveryView = {
  schema_name: "petra.project-source-registration-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "source_registration_recovery_01K6S000000000000000000001",
  project_id: PROJECT_ID,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash("3"),
  },
  effect: { state: "effect_confirmed", receipt },
  return: { state: "exact", destination: receipt.destination },
  observed_at: "2026-09-19T12:07:00.000Z",
  content_hash: hash("8"),
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

describe("project source registration routes", () => {
  it("authenticates, resolves server authority, registers, and reconciles exact return", async () => {
    const authority: ProjectSourceRegistrationAuthority = {
      executeProjectSourceRegistration: vi.fn(
        (
          projectId: string,
          submitted: PetraProjectSourceRegistrationRequest,
          resolved: ProjectSourceRegistrationPrincipal,
        ) => {
          expect(projectId).toBe(PROJECT_ID);
          expect(submitted).toStrictEqual(request);
          expect(resolved).toStrictEqual(principal);
          return Promise.resolve({ receipt, projectSource, applied: true });
        },
      ),
      assessProjectSourceRegistrationRecovery: vi.fn(() =>
        Promise.resolve(recovery),
      ),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolver,
      projectSourceRegistrationAuthority: authority,
    });
    const headers = {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    };
    const commandResponse = await petra.app.request(
      `/api/commands/projects/${PROJECT_ID}/sources/register`,
      { method: "POST", headers, body: JSON.stringify(request) },
    );
    expect(commandResponse.status).toBe(201);
    expect(await commandResponse.json()).toStrictEqual({
      receipt,
      projectSource,
      applied: true,
    });
    const recoveryResponse = await petra.app.request(
      `/api/queries/projects/${PROJECT_ID}/source-registration-recovery`,
      { method: "POST", headers, body: JSON.stringify(request) },
    );
    expect(recoveryResponse.status).toBe(200);
    expect(await recoveryResponse.json()).toStrictEqual(recovery);
    expect(resolver.resolveCommandPrincipal).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      commandName: "RegisterProjectSource",
    });
  });

  it("fails closed for crossed Project bindings and missing authentication", async () => {
    const executeProjectSourceRegistration = vi.fn();
    const authority: ProjectSourceRegistrationAuthority = {
      executeProjectSourceRegistration,
      assessProjectSourceRegistrationRecovery: vi.fn(),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolver,
      projectSourceRegistrationAuthority: authority,
    });
    const crossed = {
      ...request,
      expected: {
        ...request.expected,
        project_ref: {
          ...request.expected.project_ref,
          project_id: "project_01K6S000000000000000000099",
        },
      },
    };
    const response = await petra.app.request(
      `/api/commands/projects/${PROJECT_ID}/sources/register`,
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
    expect(executeProjectSourceRegistration).not.toHaveBeenCalled();

    for (const path of [
      `/api/commands/projects/${PROJECT_ID}/sources/register`,
      `/api/queries/projects/${PROJECT_ID}/source-registration-recovery`,
    ]) {
      const unauthorized = await petra.app.request(path, { method: "POST" });
      expect(unauthorized.status).toBe(401);
    }
  });
});
