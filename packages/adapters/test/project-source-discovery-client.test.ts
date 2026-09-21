import { readFileSync } from "node:fs";

import type { PetraProjectSourceView } from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectSourceDiscoveryClient,
  type ProjectSourceDiscoveryClientError,
} from "../src/project-source-discovery-client.js";

const source = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/project-source-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectSourceView;

describe("ProjectSourceDiscoveryClient", () => {
  it("reads one authenticated Project collection and opens its exact source", async () => {
    const calls: Array<{ method: string; url: string; token: string | null }> =
      [];
    const fetchMock = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      calls.push({
        method: init?.method ?? "GET",
        url,
        token: new Headers(init?.headers).get("authorization"),
      });
      return Promise.resolve(
        Response.json(calls.length === 1 ? { sources: [source] } : source),
      );
    });
    const client = new ProjectSourceDiscoveryClient({
      baseUrl: "http://petra.local",
      token: "source-discovery-token",
      fetch: fetchMock,
    });

    await expect(client.list(source.project_id)).resolves.toStrictEqual([
      source,
    ]);
    await expect(
      client.open(source.project_id, source.project_source_id),
    ).resolves.toStrictEqual(source);
    expect(calls).toStrictEqual([
      {
        method: "GET",
        url: `http://petra.local/api/queries/projects/${source.project_id}/sources`,
        token: "Bearer source-discovery-token",
      },
      {
        method: "GET",
        url: `http://petra.local/api/queries/projects/${source.project_id}/sources/${source.project_source_id}`,
        token: "Bearer source-discovery-token",
      },
    ]);
  });

  it("rejects invalid identities before transport and preserves typed failures", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json(
          {
            error: {
              code: "PROJECT_SOURCE_NOT_FOUND",
              message: "The requested source is not bound to this Project.",
            },
          },
          { status: 404 },
        ),
      ),
    );
    const client = new ProjectSourceDiscoveryClient({
      baseUrl: "http://petra.local",
      token: "source-discovery-token",
      fetch: fetchMock,
    });

    await expect(client.list("project_invalid")).rejects.toBeInstanceOf(
      TypeError,
    );
    await expect(
      client.open(source.project_id, "project_source_invalid"),
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(
      client.open(source.project_id, source.project_source_id),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectSourceDiscoveryClientError>>({
        code: "PROJECT_SOURCE_NOT_FOUND",
        status: 404,
        message: "The requested source is not bound to this Project.",
      }),
    );
  });

  it("fails closed for duplicated, crossed, or invalid-hash source authority", async () => {
    const responses: unknown[] = [
      { sources: [source, source] },
      {
        ...structuredClone(source),
        project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
      },
      {
        ...structuredClone(source),
        content_hash:
          "sha256:0000000000000000000000000000000000000000000000000000000000000000",
      },
    ];
    const client = new ProjectSourceDiscoveryClient({
      baseUrl: "http://petra.local",
      token: "source-discovery-token",
      fetch: vi.fn(() => Promise.resolve(Response.json(responses.shift()))),
    });

    await expect(client.list(source.project_id)).rejects.toMatchObject({
      code: "PROJECT_SOURCE_RESPONSE_INVALID",
      status: 502,
    });
    await expect(
      client.open(source.project_id, source.project_source_id),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_RESPONSE_INVALID",
      status: 502,
    });
    await expect(
      client.open(source.project_id, source.project_source_id),
    ).rejects.toMatchObject({
      code: "PROJECT_SOURCE_RESPONSE_INVALID",
      status: 502,
    });
  });
});
