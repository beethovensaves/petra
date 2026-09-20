import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraArtifact,
  PetraArtifactManifest,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionReceipt,
  PetraProjectSourceLocalCopyDeletionRecoveryView,
  PetraProjectSourceLocalCopyDeletionRequest,
} from "@petra/contracts";
import type {
  AuthenticatedCommandPrincipalResolver,
  ProjectSourceLocalCopyDeletionAuthority,
  ProjectSourceLocalCopyDeletionPreviewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "source-local-copy-deletion-token";
const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;
const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const project = readFixture<PetraProject>("project");
const definition = readFixture<PetraProjectDefinition>(
  "project-definition-scientific",
);
const source = readFixture<PetraProjectSource>("project-source");
const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
const artifact = readFixture<PetraArtifact>("artifact");
const actor = {
  actor_id: source.added_by.actor_id,
  actor_kind: "human" as const,
};
const expected = {
  project_ref: {
    project_id: project.project_id,
    revision: project.revision,
    record_hash: hash(project),
  },
  project_definition_ref: {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    record_hash: hash(definition),
  },
  current_source_ref: {
    project_source_id: source.project_source_id,
    revision: source.revision,
    content_hash: source.content_hash,
    record_hash: hash(source),
    status: source.content.status,
  },
  copy_ref: {
    artifact_manifest_id: manifest.artifact_manifest_id,
    manifest_revision: 1 as const,
    manifest_record_hash: hash(manifest),
    artifact_id: artifact.artifact_id,
    store_name: manifest.storage_ref.store_name,
    object_key: manifest.storage_ref.object_key,
    content_hash: manifest.storage_ref.content_hash,
    byte_size: artifact.byte_size,
    media_type: artifact.media_type,
  },
};
const request: PetraProjectSourceLocalCopyDeletionRequest = {
  schema_name: "petra.project-source-local-copy-deletion-request",
  schema_version: "1.0.0",
  command_id: "command_01K6X000000000000000000001",
  idempotency_key: "wave6:routes:source-local-copy-deletion",
  expected,
  reason: "Remove these exact eligible local bytes after retention review.",
};
const retention = [
  { area: "project_link", state: "retained", reason: "Project link retained." },
  {
    area: "canonical_identity",
    state: "retained",
    reason: "Identity retained.",
  },
  {
    area: "artifact_manifest",
    state: "retained",
    reason: "Manifest retained.",
  },
  { area: "rights_history", state: "retained", reason: "Rights retained." },
  { area: "selectors", state: "retained", reason: "Selectors retained." },
  { area: "provenance", state: "retained", reason: "Provenance retained." },
  {
    area: "local_bytes",
    state: "deleted_if_confirmed",
    reason: "Only bytes are deleted.",
  },
] as PetraProjectSourceLocalCopyDeletionPreview["retention"];
const basePath = `/api/commands/projects/${project.project_id}/sources/${source.project_source_id}/local-copy-deletion`;
const recoveryPath = `/api/queries/projects/${project.project_id}/sources/${source.project_source_id}/local-copy-deletion-recovery`;
const previewHashed = {
  project_id: project.project_id,
  project_source_id: source.project_source_id,
  expected,
  eligibility: {
    state: "eligible" as const,
    policy_version: "petra-local-copy-retention-v1" as const,
    blockers: [] as [],
  },
  retention,
  consequences: {
    project_link_unchanged: true as const,
    representations_may_stop_resolving: true as const,
    recovery: "reacquire_from_registered_origin" as const,
  },
  operation: {
    state: "ready" as const,
    command_name: "DeleteLocalSourceCopy" as const,
    method: "POST" as const,
    path: basePath,
    recovery_path: recoveryPath,
  },
  read_at: "2026-09-20T14:00:00.000Z",
};
const preview: PetraProjectSourceLocalCopyDeletionPreview = {
  schema_name: "petra.project-source-local-copy-deletion-preview",
  schema_version: "1.0.0",
  ...previewHashed,
  content_hash: hash(previewHashed),
};
const receiptBase = {
  schema_name: "petra.project-source-local-copy-deletion-receipt" as const,
  schema_version: "1.0.0" as const,
  receipt_id: "source_copy_deletion_receipt_01K6X000000000000000000001",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash(request),
  project_id: project.project_id,
  actor,
  capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
  project_ref: expected.project_ref,
  project_definition_ref: expected.project_definition_ref,
  source_ref: expected.current_source_ref,
  copy_ref: expected.copy_ref,
  effect: {
    kind: "local_source_copy_deleted" as const,
    local_copy_state: "absent" as const,
    observation: "deleted_now" as const,
    summary: "Exact local bytes are absent; retained authority remains.",
  },
  preservation: {
    project_link: "retained" as const,
    canonical_identity: "retained" as const,
    artifact_manifest: "retained_as_tombstoned_copy_identity" as const,
    rights_history: "retained" as const,
    selectors: "retained" as const,
    provenance: "retained" as const,
    history: "retained" as const,
  },
  destination: {
    place_role: "source_details" as const,
    project_id: project.project_id,
    project_source_id: source.project_source_id,
  },
  recovery: {
    command_path: basePath,
    assessment_path: recoveryPath,
    retry_reuses_command_identity: true as const,
    missing_receipt_means_unknown: true as const,
  },
  recorded_at: "2026-09-20T14:00:01.000Z",
};
const receipt: PetraProjectSourceLocalCopyDeletionReceipt = {
  ...receiptBase,
  record_hash: hash(receiptBase),
};
const recoveryHashed = {
  project_id: project.project_id,
  project_source_id: source.project_source_id,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash(request),
  },
  effect: { state: "effect_confirmed" as const, receipt },
  return: { state: "exact" as const, destination: receipt.destination },
  observed_at: "2026-09-20T14:00:02.000Z",
};
const recovery: PetraProjectSourceLocalCopyDeletionRecoveryView = {
  schema_name: "petra.project-source-local-copy-deletion-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "source_copy_deletion_recovery_01K6X000000000000000000001",
  ...recoveryHashed,
  content_hash: hash(recoveryHashed),
};
const principal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: (input) => {
    expect(input.commandName).toBe("DeleteLocalSourceCopy");
    return Promise.resolve({
      state: "resolved",
      actor,
      capabilityGrantId: receipt.capability_grant_id,
    });
  },
};

describe("Project source local-copy deletion routes", () => {
  it("authenticates preview, exact deletion, and recovery through one authority", async () => {
    const calls: string[] = [];
    const previews: ProjectSourceLocalCopyDeletionPreviewReader = {
      getProjectSourceLocalCopyDeletionPreview: (
        projectId,
        projectSourceId,
      ) => {
        calls.push(`preview:${projectId}:${projectSourceId}`);
        return Promise.resolve(structuredClone(preview));
      },
    };
    const authority: ProjectSourceLocalCopyDeletionAuthority = {
      executeProjectSourceLocalCopyDeletion: (
        projectId,
        projectSourceId,
        exactRequest,
        resolved,
      ) => {
        calls.push(`command:${projectId}:${projectSourceId}`);
        expect(exactRequest).toStrictEqual(request);
        expect(resolved.actor).toStrictEqual(actor);
        return Promise.resolve({
          receipt: structuredClone(receipt),
          applied: true,
        });
      },
      assessProjectSourceLocalCopyDeletionRecovery: (
        projectId,
        projectSourceId,
        exactRequest,
      ) => {
        calls.push(`recovery:${projectId}:${projectSourceId}`);
        expect(exactRequest).toStrictEqual(request);
        return Promise.resolve(structuredClone(recovery));
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: principal,
      projectSourceLocalCopyDeletionPreviews: previews,
      projectSourceLocalCopyDeletions: authority,
    });
    const headers = { authorization: `Bearer ${TOKEN}` };
    const queryUrl = `http://petra.local/api/queries/projects/${project.project_id}/sources/${source.project_source_id}/local-copy-deletion`;
    const commandUrl = `http://petra.local${basePath}`;

    const unauthenticated = await petra.app.request(new Request(queryUrl));
    expect(unauthenticated.status).toBe(401);
    const previewResponse = await petra.app.request(
      new Request(queryUrl, { headers }),
    );
    expect(previewResponse.status).toBe(200);
    await expect(previewResponse.json()).resolves.toStrictEqual(preview);
    const commandResponse = await petra.app.request(
      new Request(commandUrl, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );
    expect(commandResponse.status).toBe(201);
    await expect(commandResponse.json()).resolves.toStrictEqual({
      receipt,
      applied: true,
    });
    const recoveryResponse = await petra.app.request(
      new Request(`http://petra.local${recoveryPath}`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );
    expect(recoveryResponse.status).toBe(200);
    await expect(recoveryResponse.json()).resolves.toStrictEqual(recovery);
    expect(calls).toStrictEqual([
      `preview:${project.project_id}:${source.project_source_id}`,
      `command:${project.project_id}:${source.project_source_id}`,
      `recovery:${project.project_id}:${source.project_source_id}`,
    ]);
  });
});
