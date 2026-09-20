import { readFileSync } from "node:fs";

import type {
  PetraProjectSource,
  PetraProjectSourceRevisionReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
} from "@petra/contracts";
import type {
  ProjectSourceRevisionAuthority,
  ProjectSourceRevisionPrincipal,
} from "@petra/core";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "source-revision-route-token";
const PROJECT_ID = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const PREDECESSOR_ID = "project_source_01K5F000000000000000000001";
const ACTOR_ID = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
const GRANT_ID = "capability_grant_01K6V000000000000000000001";
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

const request: PetraProjectSourceRevisionRequest = {
  schema_name: "petra.project-source-revision-request",
  schema_version: "1.0.0",
  command_id: "command_01K6V000000000000000000001",
  idempotency_key: "wave6:route:source-revision",
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
    current_source_ref: {
      project_source_id: PREDECESSOR_ID,
      revision: 1,
      content_hash: hash("3"),
      record_hash: hash("4"),
      status: "active",
    },
  },
  version: {
    version_label: "corrected manuscript",
    publication_status: "corrected",
    metadata_source_name: "Project author",
    metadata_retrieved_at: "2026-09-20T12:00:00.000Z",
  },
  material: {
    encoding: "base64",
    content_base64: "UGV0cmE=",
    expected_content_hash: hash("5"),
    artifact_kind: "structured_text",
    media_type: "text/plain",
    original_filename: "revision.txt",
  },
  rights: {
    source_location: "https://example.test/revision.txt",
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
    rationale: "The author supplied the exact private copy.",
    observed_at: "2026-09-20T12:00:00.000Z",
    policy_version: "petra-local-rights-v1",
  },
  replacement: {
    replacement_kind: "newer_version",
    rationale: "Use the corrected source after governed replacement.",
    reviewed_at: "2026-09-20T12:00:00.000Z",
  },
};

const successorRef = {
  project_source_id: projectSource.project_source_id,
  revision: 1 as const,
  content_hash: projectSource.content_hash,
  record_hash: hash("6"),
  status: "active" as const,
};

const receipt: PetraProjectSourceRevisionReceipt = {
  schema_name: "petra.project-source-revision-receipt",
  schema_version: "1.0.0",
  receipt_id: "source_revision_receipt_01K6V000000000000000000001",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("7"),
  project_id: PROJECT_ID,
  actor: { actor_id: ACTOR_ID, actor_kind: "human" },
  capability_grant_id: GRANT_ID,
  project_ref: request.expected.project_ref,
  project_definition_ref: request.expected.project_definition_ref,
  predecessor_source_ref: request.expected.current_source_ref,
  work_ref: {
    record_id: projectSource.content.work_ref.work_id,
    revision: projectSource.content.work_ref.revision,
    record_hash: projectSource.content.work_ref.record_hash,
  },
  work_version_ref: {
    record_id: projectSource.content.work_version_ref.work_version_id,
    revision: projectSource.content.work_version_ref.revision,
    record_hash: projectSource.content.work_version_ref.record_hash,
  },
  material: {
    artifact_ref: {
      artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1",
      revision: 1,
      content_hash: request.material.expected_content_hash,
      record_hash: hash("8"),
      byte_size: 5,
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
      record_hash: hash("9"),
    },
    storage: {
      store_name: "petra-artifacts",
      object_key: "sha256/example",
      availability: "available",
    },
    origin: {
      origin_kind: "user_supplied",
      original_filename: request.material.original_filename,
      source_location: request.rights.source_location,
    },
  },
  successor_source_ref: successorRef,
  effect: {
    kind: "source_revision_intake_retained",
    summary: "The new immutable version is retained.",
    predecessor_unchanged: true,
  },
  replacement_handoff: {
    state: "governed_replacement_required",
    exclude_predecessor: {
      command_name: "ExcludeProjectSource",
      method: "POST",
      path: `/api/commands/projects/${PROJECT_ID}/sources/${PREDECESSOR_ID}/lifecycle`,
      requested_action: "exclude_project_source",
      expected_source_ref: request.expected.current_source_ref,
      reason: request.replacement.rationale,
    },
    create_replacement: {
      command_name: "CreateProjectSourceReplacement",
      method: "POST",
      path: `/api/commands/projects/${PROJECT_ID}/source-replacements`,
      replacement_kind: "newer_version",
      replaced_source_from: "exclude_result.resulting_source_ref",
      replacement_source_ref: successorRef,
      exclusion_receipt_from: "exclude_result.receipt",
      rationale: request.replacement.rationale,
    },
  },
  destination: {
    place_role: "sources",
    project_id: PROJECT_ID,
    project_source_id: projectSource.project_source_id,
  },
  recovery: {
    command_path: `/api/commands/projects/${PROJECT_ID}/sources/${PREDECESSOR_ID}/revisions`,
    assessment_path: `/api/queries/projects/${PROJECT_ID}/source-revision-recovery`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: "2026-09-20T12:01:00.000Z",
  record_hash: hash("a"),
};

const recovery: PetraProjectSourceRevisionRecoveryView = {
  schema_name: "petra.project-source-revision-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "source_revision_recovery_01K6V000000000000000000001",
  project_id: PROJECT_ID,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash("7"),
  },
  effect: { state: "effect_confirmed", receipt },
  return: { state: "exact", destination: receipt.destination },
  observed_at: "2026-09-20T12:02:00.000Z",
  content_hash: hash("b"),
};

const principal: ProjectSourceRevisionPrincipal = {
  actor: receipt.actor,
  capabilityGrantId: GRANT_ID,
};

const post = (path: string, body: unknown) =>
  new Request(`http://petra.local${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("ProjectSource revision routes", () => {
  it("resolves server authority and preserves exact intake, recovery, and handoff bindings", async () => {
    const principals: Array<{ projectId: string; commandName: string }> = [];
    let executed:
      | {
          projectId: string;
          request: PetraProjectSourceRevisionRequest;
          principal: ProjectSourceRevisionPrincipal;
        }
      | undefined;
    const authority: ProjectSourceRevisionAuthority = {
      executeProjectSourceRevision: (projectId, value, resolved) => {
        executed = {
          projectId,
          request: structuredClone(value),
          principal: structuredClone(resolved),
        };
        return Promise.resolve({
          receipt: structuredClone(receipt),
          projectSource: structuredClone(projectSource),
          applied: true,
        });
      },
      assessProjectSourceRevisionRecovery: () =>
        Promise.resolve(structuredClone(recovery)),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          principals.push(input);
          return Promise.resolve({ state: "resolved", ...principal });
        },
      },
      projectSourceRevisionAuthority: authority,
    });

    const created = await petra.app.request(
      post(
        `/api/commands/projects/${PROJECT_ID}/sources/${PREDECESSOR_ID}/revisions`,
        request,
      ),
    );
    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toEqual({
      receipt,
      projectSource,
      applied: true,
    });
    expect(executed).toStrictEqual({
      projectId: PROJECT_ID,
      request,
      principal,
    });

    const assessed = await petra.app.request(
      post(
        `/api/queries/projects/${PROJECT_ID}/source-revision-recovery`,
        request,
      ),
    );
    expect(assessed.status).toBe(200);
    await expect(assessed.json()).resolves.toEqual(recovery);
    expect(principals).toStrictEqual([
      { projectId: PROJECT_ID, commandName: "AddProjectSourceRevision" },
      { projectId: PROJECT_ID, commandName: "AddProjectSourceRevision" },
    ]);
  });

  it("rejects request-carried authority and crossed predecessor routes", async () => {
    let executed = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () =>
          Promise.resolve({ state: "resolved", ...principal }),
      },
      projectSourceRevisionAuthority: {
        executeProjectSourceRevision: () => {
          executed = true;
          throw new Error("Invalid request executed.");
        },
        assessProjectSourceRevisionRecovery: () => Promise.resolve(recovery),
      },
    });
    const forged = await petra.app.request(
      post(
        `/api/commands/projects/${PROJECT_ID}/sources/${PREDECESSOR_ID}/revisions`,
        { ...request, actor: principal.actor },
      ),
    );
    expect(forged.status).toBe(422);
    const crossed = await petra.app.request(
      post(
        `/api/commands/projects/${PROJECT_ID}/sources/project_source_01K5F000000000000000000099/revisions`,
        request,
      ),
    );
    expect(crossed.status).toBe(409);
    expect(executed).toBe(false);
  });
});
