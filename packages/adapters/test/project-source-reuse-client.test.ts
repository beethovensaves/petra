import type {
  PetraProjectSource,
  PetraProjectSourceReuseReceipt,
  PetraProjectSourceReuseRecoveryView,
  PetraProjectSourceReuseRequest,
} from "@petra/contracts";
import type { PetraContractRegistry } from "@petra/contracts/validator";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectSourceReuseClient,
  type ProjectSourceReuseClientError,
} from "../src/project-source-reuse-client.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const request = {
  schema_name: "petra.project-source-reuse-request",
  schema_version: "1.0.0",
  command_id: "command_01K6T000000000000000000001",
  idempotency_key: "wave6:client:source-reuse",
  expected: { project_ref: { project_id: projectId } },
} as unknown as PetraProjectSourceReuseRequest;
const projectSource = {
  project_source_id: "project_source_01K6T000000000000000000001",
  revision: 1,
} as PetraProjectSource;
const receipt = {
  project_id: projectId,
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  project_source_ref: {
    project_source_id: projectSource.project_source_id,
    revision: projectSource.revision,
  },
  destination: {
    project_id: projectId,
    project_source_id: projectSource.project_source_id,
  },
} as PetraProjectSourceReuseReceipt;
const recovery = {
  project_id: projectId,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
  },
  return: { destination: { project_id: projectId } },
} as PetraProjectSourceReuseRecoveryView;

const contracts = {
  assertValid: vi.fn(),
} as unknown as PetraContractRegistry;

describe("ProjectSourceReuseClient", () => {
  it("submits only the exact authenticated request and validates reuse and recovery bindings", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      calls.push({ url, init });
      return Promise.resolve(
        calls.length === 1
          ? Response.json({ receipt, projectSource, applied: true })
          : Response.json(recovery),
      );
    });
    const client = new ProjectSourceReuseClient({
      baseUrl: "http://petra.local",
      token: "source-token",
      fetch,
      contracts,
    });

    await expect(client.reuse(projectId, request)).resolves.toStrictEqual({
      receipt,
      projectSource,
      applied: true,
    });
    await expect(
      client.assessRecovery(projectId, request),
    ).resolves.toStrictEqual(recovery);
    expect(calls.map((call) => call.url)).toStrictEqual([
      `http://petra.local/api/commands/projects/${projectId}/sources/reuse`,
      `http://petra.local/api/queries/projects/${projectId}/source-reuse-recovery`,
    ]);
    expect(
      calls.every(
        (call) =>
          new Headers(call.init?.headers).get("authorization") ===
            "Bearer source-token" &&
          call.init?.body === JSON.stringify(request),
      ),
    ).toBe(true);
  });

  it("rejects crossed result identity and propagates typed server failures", async () => {
    let call = 0;
    const client = new ProjectSourceReuseClient({
      baseUrl: "http://petra.local",
      token: "source-token",
      contracts,
      fetch: vi.fn(() => {
        call += 1;
        return Promise.resolve(
          call === 1
            ? Response.json({
                receipt: {
                  ...receipt,
                  command_id: "command_01K6T000000000000000000099",
                },
                projectSource,
                applied: true,
              })
            : Response.json(
                {
                  error: {
                    code: "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
                    message: "Denied.",
                  },
                },
                { status: 403 },
              ),
        );
      }),
    });

    await expect(client.reuse(projectId, request)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectSourceReuseClientError>>({
        code: "PROJECT_SOURCE_REUSE_RESPONSE_INVALID",
      }),
    );
    await expect(client.reuse(projectId, request)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectSourceReuseClientError>>({
        status: 403,
        code: "PROJECT_SOURCE_REUSE_NOT_AUTHORIZED",
        message: "Denied.",
      }),
    );
  });
});
