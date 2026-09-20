import type {
  PetraProjectSource,
  PetraProjectSourceLinkRemovalPreview,
  PetraProjectSourceLinkRemovalReceipt,
  PetraProjectSourceLinkRemovalRecoveryView,
  PetraProjectSourceLinkRemovalRequest,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectSourceLinkRemovalClient,
  type ProjectSourceLinkRemovalClientError,
} from "../src/project-source-link-removal-client.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const sourceId = "project_source_01K5F000000000000000000001";
const request = {
  schema_name: "petra.project-source-link-removal-request",
  schema_version: "1.0.0",
  command_id: "command_01K6W000000000000000000001",
  idempotency_key: "wave6:client:source-link-removal",
  expected: {
    project_ref: { project_id: projectId },
    current_source_ref: { project_source_id: sourceId },
  },
} as PetraProjectSourceLinkRemovalRequest;
const preview = {
  project_id: projectId,
  project_source_id: sourceId,
  expected: request.expected,
  operation: { command_name: "ExcludeProjectSource" },
} as PetraProjectSourceLinkRemovalPreview;
const projectSource = {
  project_id: projectId,
  project_source_id: sourceId,
  revision: 2,
  content_hash: `sha256:${"1".repeat(64)}`,
  content: { status: "excluded" },
} as PetraProjectSource;
const receipt = {
  project_id: projectId,
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  prior_source_ref: { project_source_id: sourceId },
  resulting_source_ref: {
    project_source_id: sourceId,
    revision: projectSource.revision,
    content_hash: projectSource.content_hash,
  },
  effect: { local_copy_deleted: false },
  destination: { project_id: projectId, project_source_id: sourceId },
} as PetraProjectSourceLinkRemovalReceipt;
const recovery = {
  project_id: projectId,
  project_source_id: sourceId,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
  },
  return: { destination: { project_id: projectId } },
} as PetraProjectSourceLinkRemovalRecoveryView;
const contracts = { assertValid: vi.fn() } as unknown as PetraContractRegistry;

describe("ProjectSourceLinkRemovalClient", () => {
  it("uses one authenticated preview, command, and unknown-effect recovery boundary", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const bodies = [
      preview,
      { receipt, projectSource, applied: true },
      recovery,
    ];
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
    const client = new ProjectSourceLinkRemovalClient({
      baseUrl: "http://petra.local",
      token: "link-removal-token",
      fetch,
      contracts,
    });

    await expect(client.preview(projectId, sourceId)).resolves.toStrictEqual(
      preview,
    );
    await expect(
      client.remove(projectId, sourceId, request),
    ).resolves.toStrictEqual({ receipt, projectSource, applied: true });
    await expect(
      client.assessRecovery(projectId, sourceId, request),
    ).resolves.toStrictEqual(recovery);
    expect(calls.map(({ url }) => url)).toStrictEqual([
      `http://petra.local/api/queries/projects/${projectId}/sources/${sourceId}/link-removal`,
      `http://petra.local/api/commands/projects/${projectId}/sources/${sourceId}/link-removal`,
      `http://petra.local/api/queries/projects/${projectId}/sources/${sourceId}/link-removal-recovery`,
    ]);
    expect(
      calls.every(
        ({ init }) =>
          new Headers(init?.headers).get("authorization") ===
          "Bearer link-removal-token",
      ),
    ).toBe(true);
    expect(
      calls
        .slice(1)
        .every(({ init }) => init?.body === JSON.stringify(request)),
    ).toBe(true);
  });

  it("rejects crossed results and preserves typed server conflicts", async () => {
    let call = 0;
    const client = new ProjectSourceLinkRemovalClient({
      baseUrl: "http://petra.local",
      token: "link-removal-token",
      contracts,
      fetch: vi.fn(() => {
        call += 1;
        return Promise.resolve(
          call === 1
            ? Response.json({
                receipt: {
                  ...receipt,
                  effect: { local_copy_deleted: true },
                },
                projectSource,
                applied: true,
              })
            : Response.json(
                {
                  error: {
                    code: "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_STALE",
                    message: "Re-read the source.",
                  },
                },
                { status: 409 },
              ),
        );
      }),
    });

    await expect(client.remove(projectId, sourceId, request)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectSourceLinkRemovalClientError>>({
        code: "PROJECT_SOURCE_LINK_REMOVAL_RESPONSE_INVALID",
      }),
    );
    await expect(client.remove(projectId, sourceId, request)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectSourceLinkRemovalClientError>>({
        status: 409,
        code: "PROJECT_SOURCE_LINK_REMOVAL_SOURCE_STALE",
        message: "Re-read the source.",
      }),
    );
  });
});
