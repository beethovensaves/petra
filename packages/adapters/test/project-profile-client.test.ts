import { readFileSync } from "node:fs";

import type {
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRequest,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectProfileClient,
  type ProjectProfileClientError,
} from "../src/project-profile-client.js";

const profile = JSON.parse(
  readFileSync(
    new URL(
      "../../contracts/fixtures/accepted/registered-project-profile-scientific.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;
const request: PetraProjectProfileCommandRequest = {
  schema_name: "petra.project-profile-command-request",
  schema_version: "1.0.0",
  command_id: "command_01K6P000000000000000000301",
  idempotency_key: "wave6:client:create",
  operation: "create",
  profile_ref: {
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    content_hash: profile.content_hash,
  },
  project: { name: "Client-created Project" },
  objective: { statement: "Exercise the renderer-neutral profile client." },
};
const receipt: PetraProjectProfileCommandReceipt = {
  schema_name: "petra.project-profile-command-receipt",
  schema_version: "1.0.0",
  receipt_id: "project_profile_receipt_01K6P000000000000000000301",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  operation: request.operation,
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  profile_ref: structuredClone(request.profile_ref),
  project_ref: {
    project_id: "project_01K6P000000000000000000301",
    revision: 1,
  },
  project_definition_ref: {
    project_definition_id: "project_definition_01K6P000000000000000000301",
    revision: 1,
    content_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  objective_ref: {
    objective_id: "objective_01K6P000000000000000000301",
    revision: 1,
    content_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  destination: {
    place_role: "brief",
    project_id: "project_01K6P000000000000000000301",
  },
  recorded_at: "2026-09-18T18:00:00.000Z",
};

describe("ProjectProfileClient", () => {
  it("validates the registered profile collection and authenticates the request", async () => {
    const fetchMock = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url =
        input instanceof Request
          ? input.url
          : input instanceof URL
            ? input.href
            : input;
      expect(url).toBe("http://petra.local/api/queries/project-profiles");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer profile-token",
      );
      return Promise.resolve(Response.json({ profiles: [profile] }));
    });
    const client = new ProjectProfileClient({
      baseUrl: "http://petra.local",
      token: "profile-token",
      fetch: fetchMock,
    });

    await expect(client.listProfiles()).resolves.toStrictEqual([profile]);
  });

  it("submits exact create identity and rejects a mismatched receipt", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(receipt, { status: 201 }))
      .mockResolvedValueOnce(
        Response.json(
          { ...receipt, command_id: "command_01K6P000000000000000000399" },
          { status: 201 },
        ),
      );
    const client = new ProjectProfileClient({
      baseUrl: "http://petra.local",
      token: "profile-token",
      fetch: fetchMock,
    });

    await expect(client.createProject(request)).resolves.toStrictEqual(receipt);
    await expect(client.createProject(request)).rejects.toMatchObject({
      code: "PROJECT_PROFILE_RESPONSE_INVALID",
    });
  });

  it("preserves the safe unsupported-profile error code", async () => {
    const client = new ProjectProfileClient({
      baseUrl: "http://petra.local",
      token: "profile-token",
      fetch: vi.fn(() =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: "PROJECT_PROFILE_NOT_REGISTERED",
                message: "No Project was created or reset.",
              },
            },
            { status: 422 },
          ),
        ),
      ),
    });

    await expect(client.createProject(request)).rejects.toEqual(
      expect.objectContaining<Partial<ProjectProfileClientError>>({
        status: 422,
        code: "PROJECT_PROFILE_NOT_REGISTERED",
      }),
    );
  });
});
