import { describe, expect, it, vi } from "vitest";

import {
  ProjectBriefClient,
  type ProjectBriefClientError,
} from "../src/project-brief-client.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";

describe("ProjectBriefClient", () => {
  it("preserves typed stale and unavailable recovery failures", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              code: "PROJECT_BRIEF_STALE",
              message:
                "The requested Brief content is no longer the current observation.",
            },
          },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    const client = new ProjectBriefClient({
      baseUrl: "http://petra.local",
      token: "project-brief-token",
      registeredProfileSchemaHash: `sha256:${"a".repeat(64)}`,
      fetch: fetchMock,
    });

    await expect(
      client.read(projectId, {
        expected_snapshot_hash: `sha256:${"f".repeat(64)}`,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectBriefClientError>>({
        code: "PROJECT_BRIEF_STALE",
        status: 409,
        message:
          "The requested Brief content is no longer the current observation.",
      }),
    );
    await expect(client.read(projectId)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectBriefClientError>>({
        code: "PROJECT_BRIEF_READ_FAILED",
        status: 503,
        message: "Project Brief read failed (503).",
      }),
    );
  });
});
