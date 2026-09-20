import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraProjectShellCollectionView,
  PetraProjectShellView,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectShellClient,
  type ProjectShellClientError,
} from "../src/project-shell-client.js";

const fixture = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/project-shell-collection-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellCollectionView;

const shellFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/project-shell-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectShellView;

const withQuery = (
  query: PetraProjectShellCollectionView["content"]["query"],
): PetraProjectShellCollectionView => {
  const content = {
    ...structuredClone(fixture.content),
    query,
  };
  return {
    ...structuredClone(fixture),
    content,
    content_hash: `sha256:${createHash("sha256")
      .update(canonicalize(content))
      .digest("hex")}`,
  };
};

describe("ProjectShellClient", () => {
  it("authenticates one exact bounded server-owned Project search", async () => {
    const expected = withQuery({
      search: "evidence",
      status: "active",
      profile: "petra.scientific-evidence",
      limit: 25,
      cursor: "offset:25",
    });
    const fetchMock = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input,
      );
      expect(url.pathname).toBe("/api/queries/projects");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        search: "evidence",
        status: "active",
        profile: "petra.scientific-evidence",
        limit: "25",
        cursor: "offset:25",
      });
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer project-search-token",
      );
      return Promise.resolve(Response.json(expected));
    });
    const client = new ProjectShellClient({
      baseUrl: "http://petra.local",
      token: "project-search-token",
      fetch: fetchMock,
    });

    await expect(
      client.search({
        search: "evidence",
        status: "active",
        profile: "petra.scientific-evidence",
        limit: 25,
        cursor: "offset:25",
      }),
    ).resolves.toStrictEqual(expected);
  });

  it("rejects invalid controls before transport and preserves server failure", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        Response.json(
          {
            error: {
              code: "PROJECT_COLLECTION_QUERY_INVALID",
              message: "The collection cursor is no longer valid.",
            },
          },
          { status: 422 },
        ),
      ),
    );
    const client = new ProjectShellClient({
      baseUrl: "http://petra.local",
      token: "project-search-token",
      fetch: fetchMock,
    });

    await expect(client.search({ search: " evidence" })).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(client.search()).rejects.toEqual(
      expect.objectContaining<Partial<ProjectShellClientError>>({
        code: "PROJECT_COLLECTION_QUERY_INVALID",
        status: 422,
        message: "The collection cursor is no longer valid.",
      }),
    );
  });

  it("rejects a valid-shaped collection with a substituted query", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json(fixture)));
    const client = new ProjectShellClient({
      baseUrl: "http://petra.local",
      token: "project-search-token",
      fetch: fetchMock,
    });

    await expect(client.search({ search: "evidence" })).rejects.toEqual(
      expect.objectContaining<Partial<ProjectShellClientError>>({
        code: "PROJECT_COLLECTION_RESPONSE_INVALID",
        status: 502,
      }),
    );
  });

  it("authenticates and validates one exact Project shell for open", async () => {
    const fetchMock = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input,
      );
      expect(url.pathname).toBe(
        `/api/queries/projects/${shellFixture.project_id}/shell`,
      );
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer project-open-token",
      );
      return Promise.resolve(Response.json(shellFixture));
    });
    const client = new ProjectShellClient({
      baseUrl: "http://petra.local",
      token: "project-open-token",
      fetch: fetchMock,
    });

    await expect(client.open(shellFixture.project_id)).resolves.toStrictEqual(
      shellFixture,
    );
  });

  it("rejects invalid and substituted Project identities and preserves not-found", async () => {
    const substituted = structuredClone(shellFixture);
    substituted.project_id = "project_01ARZ3NDEKTSV4RRFFQ69G5FAX";
    substituted.content.project.project_id = substituted.project_id;
    substituted.content_hash = `sha256:${createHash("sha256")
      .update(canonicalize(substituted.content))
      .digest("hex")}`;
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(Response.json(substituted))
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: "PROJECT_NOT_FOUND",
              message: "The requested Project does not exist.",
            },
          },
          { status: 404 },
        ),
      );
    const client = new ProjectShellClient({
      baseUrl: "http://petra.local",
      token: "project-open-token",
      fetch: fetchMock,
    });

    await expect(client.open("project-invalid")).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(client.open(shellFixture.project_id)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectShellClientError>>({
        code: "PROJECT_SHELL_RESPONSE_INVALID",
        status: 502,
      }),
    );
    await expect(client.open(shellFixture.project_id)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectShellClientError>>({
        code: "PROJECT_NOT_FOUND",
        status: 404,
      }),
    );
  });
});
