import type { PetraProjectModelReadinessView } from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectModelClient,
  type ProjectModelClientError,
} from "../src/project-model-client.js";

const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const readiness: PetraProjectModelReadinessView = {
  schema_name: "petra.project-model-readiness-view",
  schema_version: "1.0.0",
  project_id: projectId,
  project_revision: 1,
  project_definition_ref: {
    project_definition_id: "project_definition_01K4C000000000000000000001",
    revision: 3,
    content_hash:
      "sha256:2f184efe9610fc19e8e42e7e9a1a8765b47999929a6331fb0cf5bb0bd50c366c",
    record_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    definition_family: "petra.scientific-evidence",
  },
  readiness: {
    state: "unavailable",
    reason: "context_unavailable",
    role: {
      state: "unavailable",
      reason: "runtime_not_configured",
      message: "The exact certified runtime is unavailable.",
    },
    provider: {
      state: "unavailable",
      provider_kind: "codex_app_server",
      message: "The provider is unavailable.",
    },
    context: {
      state: "unavailable",
      reason: "project_context_not_compiled",
      message: "Exact Project context is unavailable.",
    },
    command: {
      state: "unavailable",
      reason: "context_unavailable",
      message: "No prompt will be submitted.",
    },
  },
  limitations: ["The model has no authority effect."],
  read_at: "2026-09-19T05:30:00.000Z",
};

describe("ProjectModelClient", () => {
  it("authenticates and validates an exact Project readiness read", async () => {
    const fetchMock = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      expect(url).toBe(
        `http://petra.local/api/queries/projects/${projectId}/model-readiness`,
      );
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer model-token",
      );
      return Promise.resolve(Response.json(readiness));
    });
    const client = new ProjectModelClient({
      baseUrl: "http://petra.local",
      token: "model-token",
      fetch: fetchMock,
    });

    await expect(client.readReadiness(projectId)).resolves.toStrictEqual(
      readiness,
    );
  });

  it("does not submit a prompt from an unavailable readiness result", async () => {
    const fetchMock = vi.fn();
    const client = new ProjectModelClient({
      baseUrl: "http://petra.local",
      token: "model-token",
      fetch: fetchMock,
    });

    await expect(
      client.run({
        readiness,
        threadId: "thread_unavailable",
        runId: "run_unavailable",
        prompt: "Do not send this.",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ProjectModelClientError>>({
        code: "PROJECT_MODEL_INTERACTION_UNAVAILABLE",
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
