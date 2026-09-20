import type {
  PetraProjectSource,
  PetraProjectSourceRevisionReceipt,
  PetraProjectSourceRevisionRecoveryView,
  PetraProjectSourceRevisionRequest,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectSourceRevisionClient,
  type ProjectSourceRevisionClientError,
} from "../src/project-source-revision-client.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const predecessorId = "project_source_01K5F000000000000000000001";
const successorId = "project_source_01K6V000000000000000000001";
const request = {
  schema_name: "petra.project-source-revision-request",
  schema_version: "1.0.0",
  command_id: "command_01K6V000000000000000000001",
  idempotency_key: "wave6:client:source-revision",
  expected: {
    project_ref: { project_id: projectId },
    current_source_ref: { project_source_id: predecessorId },
  },
} as PetraProjectSourceRevisionRequest;
const projectSource = {
  project_source_id: successorId,
  revision: 1,
  content_hash: `sha256:${"1".repeat(64)}`,
} as PetraProjectSource;
const receipt = {
  project_id: projectId,
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  predecessor_source_ref: { project_source_id: predecessorId },
  successor_source_ref: {
    project_source_id: successorId,
    revision: 1,
    content_hash: projectSource.content_hash,
  },
  replacement_handoff: {
    exclude_predecessor: {
      expected_source_ref: { project_source_id: predecessorId },
    },
    create_replacement: {
      replacement_source_ref: { project_source_id: successorId },
    },
  },
  destination: { project_id: projectId, project_source_id: successorId },
} as PetraProjectSourceRevisionReceipt;
const recovery = {
  project_id: projectId,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
  },
  return: { destination: { project_id: projectId } },
} as PetraProjectSourceRevisionRecoveryView;
const contracts = { assertValid: vi.fn() } as unknown as PetraContractRegistry;

describe("ProjectSourceRevisionClient", () => {
  it("submits the exact predecessor-bound request and validates the governed replacement handoff", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
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
      return Promise.resolve(
        calls.length === 1
          ? Response.json({ receipt, projectSource, applied: true })
          : Response.json(recovery),
      );
    });
    const client = new ProjectSourceRevisionClient({
      baseUrl: "http://petra.local",
      token: "revision-token",
      fetch,
      contracts,
    });

    await expect(
      client.addRevision(projectId, predecessorId, request),
    ).resolves.toStrictEqual({ receipt, projectSource, applied: true });
    await expect(
      client.assessRecovery(projectId, predecessorId, request),
    ).resolves.toStrictEqual(recovery);
    expect(calls.map((call) => call.url)).toStrictEqual([
      `http://petra.local/api/commands/projects/${projectId}/sources/${predecessorId}/revisions`,
      `http://petra.local/api/queries/projects/${projectId}/source-revision-recovery`,
    ]);
    expect(
      calls.every(
        (call) =>
          new Headers(call.init?.headers).get("authorization") ===
            "Bearer revision-token" &&
          call.init?.body === JSON.stringify(request),
      ),
    ).toBe(true);
  });

  it("rejects crossed successor identity and preserves typed server failures", async () => {
    let call = 0;
    const client = new ProjectSourceRevisionClient({
      baseUrl: "http://petra.local",
      token: "revision-token",
      contracts,
      fetch: vi.fn(() => {
        call += 1;
        return Promise.resolve(
          call === 1
            ? Response.json({
                receipt: {
                  ...receipt,
                  successor_source_ref: {
                    ...receipt.successor_source_ref,
                    project_source_id:
                      "project_source_01K6V000000000000000000099",
                  },
                },
                projectSource,
                applied: true,
              })
            : Response.json(
                {
                  error: {
                    code: "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED",
                    message: "Denied.",
                  },
                },
                { status: 403 },
              ),
        );
      }),
    });

    await expect(
      client.addRevision(projectId, predecessorId, request),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectSourceRevisionClientError>>({
        code: "PROJECT_SOURCE_REVISION_RESPONSE_INVALID",
      }),
    );
    await expect(
      client.addRevision(projectId, predecessorId, request),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectSourceRevisionClientError>>({
        status: 403,
        code: "PROJECT_SOURCE_REVISION_NOT_AUTHORIZED",
        message: "Denied.",
      }),
    );
  });
});
