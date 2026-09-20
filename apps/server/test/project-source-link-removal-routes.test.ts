import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraProject,
  PetraProjectDefinition,
  PetraProjectSource,
  PetraProjectSourceLifecycleReceipt,
  PetraProjectSourceLifecycleView,
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLinkRemovalReceipt,
  PetraProjectSourceLinkRemovalRecoveryView,
  PetraProjectSourceLinkRemovalRequest,
} from "@petra/contracts";
import type {
  AuthenticatedCommandPrincipalResolver,
  ProjectSourceLinkRemovalAuthority,
  ProjectSourceLinkRemovalPreviewReader,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-source-link-removal-token";
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
const lifecycleView = readFixture<PetraProjectSourceLifecycleView>(
  "project-source-lifecycle-view",
);
const lifecycleReceipt = readFixture<PetraProjectSourceLifecycleReceipt>(
  "project-source-lifecycle-receipt",
);
const actor = {
  actor_id: source.added_by.actor_id,
  actor_kind: "human" as const,
};
const request: PetraProjectSourceLinkRemovalRequest = {
  schema_name: "petra.project-source-link-removal-request",
  schema_version: "1.0.0",
  command_id: lifecycleReceipt.content.command_ref.command_id,
  idempotency_key: lifecycleReceipt.content.command_ref.idempotency_key,
  expected: {
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
      ...lifecycleReceipt.content.prior_source_ref,
      status: "active",
    },
  },
  reason: "Remove this exact source link while retaining its authority.",
};
const resultSource: PetraProjectSource = {
  ...structuredClone(source),
  revision: lifecycleReceipt.content.resulting_source_ref.revision,
  content: { ...structuredClone(source.content), status: "excluded" },
  content_hash: lifecycleReceipt.content.resulting_source_ref.content_hash,
  added_at: lifecycleReceipt.recorded_at,
};
const receiptBase = {
  schema_name: "petra.project-source-link-removal-receipt" as const,
  schema_version: "1.0.0" as const,
  receipt_id: "source_link_removal_receipt_01K6W000000000000000000001",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash(request),
  project_id: project.project_id,
  actor,
  capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
  project_ref: request.expected.project_ref,
  project_definition_ref: request.expected.project_definition_ref,
  prior_source_ref: request.expected.current_source_ref,
  resulting_source_ref: {
    ...lifecycleReceipt.content.resulting_source_ref,
    status: "excluded" as const,
  },
  lifecycle_receipt: lifecycleReceipt,
  effect: {
    kind: "project_source_link_removed" as const,
    summary:
      "Ordinary new Project use is disabled; retained authority remains.",
    ordinary_new_project_use: "disabled" as const,
    preservation: lifecycleReceipt.content.preservation,
    local_copy_deleted: false as const,
  },
  destination: {
    place_role: "sources" as const,
    project_id: project.project_id,
    project_source_id: source.project_source_id,
  },
  recovery: {
    command_path: `/api/commands/projects/${project.project_id}/sources/${source.project_source_id}/link-removal`,
    assessment_path: `/api/queries/projects/${project.project_id}/sources/${source.project_source_id}/link-removal-recovery`,
    inverse_command_name: "RestoreProjectSource" as const,
    retry_reuses_command_identity: true as const,
    missing_receipt_means_unknown: true as const,
  },
  recorded_at: lifecycleReceipt.recorded_at,
};
const receipt: PetraProjectSourceLinkRemovalReceipt = {
  ...receiptBase,
  record_hash: hash(receiptBase),
};
const previewBase = {
  project_id: project.project_id,
  project_source_id: source.project_source_id,
  expected: request.expected,
  transition: lifecycleView.content.transition as Extract<
    typeof lifecycleView.content.transition,
    { state: "preview_available" }
  >,
  impact: lifecycleView.content.impact,
  retention: lifecycleView.content.retention,
  operation: {
    state: "ready" as const,
    command_name: "ExcludeProjectSource" as const,
    method: "POST" as const,
    path: receipt.recovery.command_path,
    recovery_path: receipt.recovery.assessment_path,
    separate_local_copy_deletion: true as const,
  },
  read_at: lifecycleView.read_at,
};
const preview: PetraProjectSourceLinkRemovalPreview = {
  schema_name: "petra.project-source-link-removal-preview",
  schema_version: "1.0.0",
  ...previewBase,
  content_hash: hash(previewBase),
};
const recoveryBase = {
  project_id: project.project_id,
  project_source_id: source.project_source_id,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash(request),
  },
  effect: { state: "effect_confirmed" as const, receipt },
  return: { state: "exact" as const, destination: receipt.destination },
  observed_at: lifecycleReceipt.recorded_at,
};
const recovery: PetraProjectSourceLinkRemovalRecoveryView = {
  schema_name: "petra.project-source-link-removal-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "source_link_removal_recovery_01K6W000000000000000000001",
  ...recoveryBase,
  content_hash: hash(recoveryBase),
};
const principal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({
      state: "resolved",
      actor,
      capabilityGrantId: receipt.capability_grant_id,
    }),
};
const url = (suffix: string): string =>
  `http://petra.local/api/${suffix}/projects/${project.project_id}/sources/${source.project_source_id}/link-removal`;

describe("Project source link-removal routes", () => {
  it("authenticates the preview and composes command and recovery through one authority", async () => {
    const calls: string[] = [];
    const previews: ProjectSourceLinkRemovalPreviewReader = {
      getProjectSourceLinkRemovalPreview: (projectId, projectSourceId) => {
        calls.push(`preview:${projectId}:${projectSourceId}`);
        return Promise.resolve(structuredClone(preview));
      },
    };
    const authority: ProjectSourceLinkRemovalAuthority = {
      executeProjectSourceLinkRemoval: (
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
          projectSource: structuredClone(resultSource),
          applied: true,
        });
      },
      assessProjectSourceLinkRemovalRecovery: (
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
      projectSourceLinkRemovalPreviews: previews,
      projectSourceLinkRemovals: authority,
    });
    const headers = { authorization: `Bearer ${TOKEN}` };

    const previewResponse = await petra.app.request(
      new Request(url("queries"), { headers }),
    );
    expect(previewResponse.status).toBe(200);
    await expect(previewResponse.json()).resolves.toStrictEqual(preview);
    const commandResponse = await petra.app.request(
      new Request(url("commands"), {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );
    expect(commandResponse.status).toBe(201);
    await expect(commandResponse.json()).resolves.toStrictEqual({
      receipt,
      projectSource: resultSource,
      applied: true,
    });
    const recoveryResponse = await petra.app.request(
      new Request(`${url("queries")}-recovery`, {
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

  it("rejects client-carried deletion and authority before principal resolution", async () => {
    let resolved = false;
    let executed = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () => {
          resolved = true;
          return principal.resolveCommandPrincipal({
            projectId: project.project_id,
            commandName: "ExcludeProjectSource",
          });
        },
      },
      projectSourceLinkRemovals: {
        executeProjectSourceLinkRemoval: () => {
          executed = true;
          throw new Error("Invalid request executed.");
        },
        assessProjectSourceLinkRemovalRecovery: () => {
          throw new Error("Invalid request assessed.");
        },
      },
    });
    const response = await petra.app.request(
      new Request(url("commands"), {
        method: "POST",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          delete_local_copy: true,
          capability_grant_id: receipt.capability_grant_id,
        }),
      }),
    );
    expect(response.status).toBe(422);
    expect(resolved).toBe(false);
    expect(executed).toBe(false);
  });
});
