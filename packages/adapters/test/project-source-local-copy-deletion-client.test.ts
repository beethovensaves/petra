import type {
  PetraProjectSourceLocalCopyDeletionPreview,
  PetraProjectSourceLocalCopyDeletionReceipt,
  PetraProjectSourceLocalCopyDeletionRecoveryView,
  PetraProjectSourceLocalCopyDeletionRequest,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectSourceLocalCopyDeletionClient,
  type ProjectSourceLocalCopyDeletionClientError,
} from "../src/project-source-local-copy-deletion-client.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const sourceId = "project_source_01K5F000000000000000000001";
const manifestId = "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB2";
const request = {
  schema_name: "petra.project-source-local-copy-deletion-request",
  schema_version: "1.0.0",
  command_id: "command_01K6X000000000000000000001",
  idempotency_key: "wave6:client:source-local-copy-deletion",
  expected: {
    project_ref: { project_id: projectId },
    current_source_ref: { project_source_id: sourceId },
    copy_ref: { artifact_manifest_id: manifestId },
  },
} as PetraProjectSourceLocalCopyDeletionRequest;
const preview = {
  project_id: projectId,
  project_source_id: sourceId,
  expected: request.expected,
  operation: { command_name: "DeleteLocalSourceCopy" },
} as PetraProjectSourceLocalCopyDeletionPreview;
const receipt = {
  project_id: projectId,
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  source_ref: { project_source_id: sourceId },
  copy_ref: { artifact_manifest_id: manifestId },
  effect: { local_copy_state: "absent" },
  preservation: { project_link: "retained" },
} as PetraProjectSourceLocalCopyDeletionReceipt;
const recovery = {
  project_id: projectId,
  project_source_id: sourceId,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
  },
  return: { destination: { project_id: projectId } },
} as PetraProjectSourceLocalCopyDeletionRecoveryView;
const contracts = { assertValid: vi.fn() } as unknown as PetraContractRegistry;

describe("ProjectSourceLocalCopyDeletionClient", () => {
  it("uses authenticated exact preview, deletion, and recovery routes", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const bodies = [preview, { receipt, applied: true }, recovery];
    const fetch = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      calls.push({
        url:
          input instanceof Request
            ? input.url
            : input instanceof URL
              ? input.href
              : input,
        init,
      });
      return Promise.resolve(Response.json(bodies[calls.length - 1]));
    });
    const client = new ProjectSourceLocalCopyDeletionClient({
      baseUrl: "http://petra.local",
      token: "copy-deletion-token",
      fetch,
      contracts,
    });

    await expect(client.preview(projectId, sourceId)).resolves.toStrictEqual(
      preview,
    );
    await expect(
      client.delete(projectId, sourceId, request),
    ).resolves.toStrictEqual({ receipt, applied: true });
    await expect(
      client.assessRecovery(projectId, sourceId, request),
    ).resolves.toStrictEqual(recovery);
    expect(calls.map(({ url }) => url)).toStrictEqual([
      `http://petra.local/api/queries/projects/${projectId}/sources/${sourceId}/local-copy-deletion`,
      `http://petra.local/api/commands/projects/${projectId}/sources/${sourceId}/local-copy-deletion`,
      `http://petra.local/api/queries/projects/${projectId}/sources/${sourceId}/local-copy-deletion-recovery`,
    ]);
    expect(
      calls.every(
        ({ init }) =>
          new Headers(init?.headers).get("authorization") ===
          "Bearer copy-deletion-token",
      ),
    ).toBe(true);
  });

  it("rejects a crossed copy receipt and preserves typed server failures", async () => {
    let call = 0;
    const client = new ProjectSourceLocalCopyDeletionClient({
      baseUrl: "http://petra.local",
      token: "copy-deletion-token",
      contracts,
      fetch: vi.fn(() => {
        call += 1;
        return Promise.resolve(
          call === 1
            ? Response.json({
                receipt: {
                  ...receipt,
                  copy_ref: {
                    artifact_manifest_id:
                      "artifact_manifest_01K6X000000000000000000099",
                  },
                },
                applied: true,
              })
            : Response.json(
                {
                  error: {
                    code: "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_ELIGIBLE",
                    message: "Protected shared use remains.",
                  },
                },
                { status: 409 },
              ),
        );
      }),
    });

    await expect(client.delete(projectId, sourceId, request)).rejects.toEqual(
      expect.objectContaining<
        Partial<ProjectSourceLocalCopyDeletionClientError>
      >({ code: "PROJECT_SOURCE_LOCAL_COPY_DELETION_RESPONSE_INVALID" }),
    );
    await expect(client.delete(projectId, sourceId, request)).rejects.toEqual(
      expect.objectContaining<
        Partial<ProjectSourceLocalCopyDeletionClientError>
      >({
        status: 409,
        code: "PROJECT_SOURCE_LOCAL_COPY_DELETION_NOT_ELIGIBLE",
        message: "Protected shared use remains.",
      }),
    );
  });
});
