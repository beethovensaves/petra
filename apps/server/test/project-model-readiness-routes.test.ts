import type {
  PetraProjectModelReadinessView,
  ProjectModelContextBinding,
} from "@petra/contracts";
import {
  ProjectModelReadinessError,
  type ProjectModelInteractionAuthorization,
  type ProjectModelReadinessReader,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";
import { M1_GROUNDED_SYNTHESIS_QUESTION } from "../src/m1-grounded-synthesis.js";

const TOKEN = "wave6-model-readiness";
const PROJECT_ID = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";

const context: ProjectModelContextBinding = {
  project_id: PROJECT_ID,
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
  objective_ref: {
    objective_id: "objective_01K4C000000000000000000005",
    revision: 3,
    content_hash:
      "sha256:335ccee3cdd67d50a07b0e3acef369fb57ee6b2d83b0397a4bdddd48b97358f7",
    record_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  snapshot_ref: {
    snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
    snapshot_revision: 1,
    event_position: 3,
    content_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  context_packet_ref: {
    record_id: "context_packet_01ARZ3NDEKTSV4RRFFQ69G5FCD",
    revision: 1,
    content_hash:
      "sha256:d78e5ebed5060507812eeeede6154f82e8f9bbfb19897bd8ade82909088432df",
  },
  evidence_packet_ref: {
    record_id: "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FCG",
    revision: 1,
    content_hash:
      "sha256:e3d7679bec56bc80f2bbb9702398526ca69edac1c10836132efc365c36393d64",
  },
  role_certification_ref: {
    role_certification_id: "role_certification_2QNNWEG32XSDY4HWQW209N9T86",
    revision: 1,
    content_hash:
      "sha256:129da2f34cb87fef177783726a730b0f263a7c9c41ea8b8dbd634a259f240c45",
  },
};

const readiness: PetraProjectModelReadinessView = {
  schema_name: "petra.project-model-readiness-view",
  schema_version: "1.0.0",
  project_id: PROJECT_ID,
  project_revision: 1,
  project_definition_ref: context.project_definition_ref,
  objective_ref: context.objective_ref,
  readiness: {
    state: "ready",
    role: {
      state: "selected",
      semantic_key: "scientific.grounded-synthesist",
      label: "Grounded synthesist",
      meaning:
        "A certified advisory model role bound to exact Project context.",
      certification_ref: context.role_certification_ref,
      deployment: {
        model_deployment_id: "model_deployment_1WKCAZEM2G2CQ4NZAAB2G68XGW",
        provider_kind: "codex_app_server",
        provider_model: "gpt-5.6-terra",
        execution_location: "remote",
      },
      authority_effect: "none",
    },
    provider: {
      state: "ready",
      provider_kind: "codex_app_server",
      auth_state: "authenticated",
      auth_mode: "chatgpt",
      model: "gpt-5.6-terra",
      message: "The certified model is available.",
    },
    context: { state: "bound", binding: context },
    command: {
      state: "ready",
      method: "POST",
      endpoint: "/api/interactions/run",
      workflow: "grounded_synthesis",
      prompt_policy: "exact_registered_prompt",
      registered_prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
      request_context: context,
      delivery: "streaming_and_replay",
      authority_effect: "none",
    },
  },
  limitations: ["The response has no authority effect."],
  read_at: "2026-09-19T05:30:00.000Z",
};

const input = (
  runId: string,
  modelContext?: ProjectModelContextBinding,
): Record<string, unknown> => ({
  threadId: `thread_${runId}`,
  runId,
  state: {},
  messages: [
    {
      id: `user_${runId}`,
      role: "user",
      content: M1_GROUNDED_SYNTHESIS_QUESTION,
    },
  ],
  tools: [],
  context: [],
  forwardedProps: {
    petra: {
      workflow: "grounded_synthesis",
      afterSequence: 0,
      ...(modelContext === undefined ? {} : { modelContext }),
    },
  },
});

const authorized = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://petra.local${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

describe("Project certified model readiness routes", () => {
  it("returns the exact Project-scoped readiness view with no-store semantics", async () => {
    const boundary: ProjectModelReadinessReader = {
      getProjectModelReadiness: vi.fn(() =>
        Promise.resolve(structuredClone(readiness)),
      ),
      authorizeProjectModelInteraction: vi.fn(() =>
        Promise.resolve(structuredClone(readiness)),
      ),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectModelReadiness: boundary,
    });

    const response = await petra.app.fetch(
      authorized(`/api/queries/projects/${PROJECT_ID}/model-readiness`),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toStrictEqual(readiness);
  });

  it("requires exact readiness context before admitting grounded synthesis", async () => {
    const authorize = vi.fn((request: ProjectModelInteractionAuthorization) => {
      expect(request).toStrictEqual({
        project_id: PROJECT_ID,
        prompt: M1_GROUNDED_SYNTHESIS_QUESTION,
        request_context: context,
      });
      return Promise.resolve(structuredClone(readiness));
    });
    const petra = createPetraApp({
      authToken: TOKEN,
      projectModelReadiness: {
        getProjectModelReadiness: () =>
          Promise.resolve(structuredClone(readiness)),
        authorizeProjectModelInteraction: authorize,
      },
    });

    const missing = await petra.app.fetch(
      authorized("/api/interactions/run", {
        method: "POST",
        body: JSON.stringify(input("run_readiness_missing")),
      }),
    );
    const admitted = await petra.app.fetch(
      authorized("/api/interactions/run", {
        method: "POST",
        headers: { accept: "text/event-stream" },
        body: JSON.stringify(input("run_readiness_bound", context)),
      }),
    );

    expect(missing.status).toBe(422);
    expect(admitted.status).toBe(200);
    await admitted.text();
    expect(authorize).toHaveBeenCalledOnce();
  });

  it("returns a stable stale-context command error before work starts", async () => {
    const petra = createPetraApp({
      authToken: TOKEN,
      projectModelReadiness: {
        getProjectModelReadiness: () =>
          Promise.resolve(structuredClone(readiness)),
        authorizeProjectModelInteraction: () =>
          Promise.reject(
            new ProjectModelReadinessError(
              "PROJECT_MODEL_INTERACTION_STALE",
              "The exact Project model context is stale.",
            ),
          ),
      },
    });

    const response = await petra.app.fetch(
      authorized("/api/interactions/run", {
        method: "POST",
        body: JSON.stringify(input("run_readiness_stale", context)),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "PROJECT_MODEL_INTERACTION_STALE" },
    });
  });
});
