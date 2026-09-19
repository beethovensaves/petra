import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

import type {
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";
import { canonicalize } from "json-canonicalize";

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
const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const derive = (kind: string, identity: string): string => {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const digest = createHash("sha256")
    .update(`${kind}:${identity}`, "utf8")
    .digest()
    .subarray(0, 16);
  let value = BigInt(`0x${digest.toString("hex")}`);
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = alphabet[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return `${kind}_${payload}`;
};
const recoveryContent: PetraProjectProfileCommandRecoveryView["content"] = {
  subject: {
    operation: request.operation,
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash(request),
  },
  effect: {
    state: "outcome_unknown",
    reason: "receipt_not_observed_at_cutoff",
    meaning:
      "No exact receipt was visible at the observation cutoff. Absence does not prove that no effect occurred after the cutoff.",
  },
  preservation: [
    {
      item: "exact_request",
      identity: hash(request),
      durability: "client_session",
      state: "client_copy_required",
    },
  ],
  eligible_actions: [
    {
      operation: "retry_exact_command",
      eligibility: "eligible",
      owner: "project_profile_command",
      method: "POST",
      path: "/api/commands/projects",
      input_behavior: "reuse_exact_request",
      identity_behavior: "reuse_command_and_idempotency",
      authority_effect:
        "The owning command may create one Project after rechecking current authority.",
      history_effect:
        "The owning receipt remains the only durable command result.",
      reason: "Exact idempotent redelivery rechecks current authority.",
      success_destination: {
        place_role: "brief",
        project_id: derive("project", request.command_id),
      },
      failure_destination: { place_role: "projects" },
      execution_recheck: true,
    },
  ],
  return: {
    state: "safe_fallback",
    destination: { place_role: "projects" },
    reason: "No retained receipt supplies an exact resulting Project yet.",
  },
  observation_cutoff: "2026-09-19T18:00:00.000Z",
  limitations: ["A missing receipt is not proof of no later effect."],
};
const recoveryView: PetraProjectProfileCommandRecoveryView = {
  schema_name: "petra.project-profile-command-recovery-view",
  schema_version: "1.0.0",
  assessment_id: derive("project_profile_recovery", hash(recoveryContent)),
  content: recoveryContent,
  content_hash: hash(recoveryContent),
  read_at: recoveryContent.observation_cutoff,
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

  it("verifies exact recovery identity, content integrity, and idempotent retry ownership", async () => {
    const fetchMock = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      if (!(input instanceof URL) || typeof init?.body !== "string") {
        throw new TypeError("Expected one URL and a serialized request body.");
      }
      expect(input.href).toBe(
        "http://petra.local/api/queries/project-profile-command-recovery",
      );
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer profile-token",
      );
      expect(JSON.parse(init.body)).toStrictEqual(request);
      return Promise.resolve(Response.json(recoveryView));
    });
    const client = new ProjectProfileClient({
      baseUrl: "http://petra.local",
      token: "profile-token",
      fetch: fetchMock,
    });

    await expect(client.assessProjectRecovery(request)).resolves.toStrictEqual(
      recoveryView,
    );
  });

  it("rejects recovery content that is not bound to its verified hash", async () => {
    const client = new ProjectProfileClient({
      baseUrl: "http://petra.local",
      token: "profile-token",
      fetch: vi.fn(() =>
        Promise.resolve(
          Response.json({
            ...recoveryView,
            content_hash:
              "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          }),
        ),
      ),
    });

    await expect(client.assessProjectRecovery(request)).rejects.toMatchObject({
      code: "PROJECT_PROFILE_RESPONSE_INVALID",
    });
  });
});
