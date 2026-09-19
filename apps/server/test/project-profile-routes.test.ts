import { readFileSync } from "node:fs";

import type {
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import {
  ProjectProfileRuntimeError,
  type ProjectProfileCommandAuthority,
  type ProjectProfileCommandRecoveryReader,
  type ProjectProfileRuntimeReader,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const token = "wave6-profile-route";
const profile = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;
const projectId = "project_01K6P000000000000000000201";
const commandId = "command_01K6P000000000000000000201";

const request: PetraProjectProfileCommandRequest = {
  schema_name: "petra.project-profile-command-request",
  schema_version: "1.0.0",
  command_id: commandId,
  idempotency_key: "wave6:route:create",
  operation: "create",
  profile_ref: {
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    content_hash: profile.content_hash,
  },
  project: { name: "Registered Project" },
  objective: { statement: "Test exact registered profile behavior." },
};

const receipt: PetraProjectProfileCommandReceipt = {
  schema_name: "petra.project-profile-command-receipt",
  schema_version: "1.0.0",
  receipt_id: "project_profile_receipt_01K6P000000000000000000201",
  command_id: commandId,
  idempotency_key: request.idempotency_key,
  operation: "create",
  actor: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  profile_ref: structuredClone(request.profile_ref),
  project_ref: { project_id: projectId, revision: 1 },
  project_definition_ref: {
    project_definition_id: "project_definition_01K6P000000000000000000201",
    revision: 1,
    content_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  objective_ref: {
    objective_id: "objective_01K6P000000000000000000201",
    revision: 1,
    content_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  destination: { place_role: "brief", project_id: projectId },
  recorded_at: "2026-09-18T17:30:00.000Z",
};

const taxonomy: PetraProjectProfileTaxonomyView = {
  schema_name: "petra.project-profile-taxonomy-view",
  schema_version: "1.0.0",
  project_id: projectId,
  project_revision: 1,
  project_definition_ref: structuredClone(receipt.project_definition_ref),
  resolution: {
    state: "registered",
    profile_ref: structuredClone(receipt.profile_ref),
    label: profile.content.label,
    purpose: profile.content.purpose,
    taxonomy: structuredClone(profile.content.taxonomy),
  },
  read_at: "2026-09-18T17:30:01.000Z",
};

const recoveryView = JSON.parse(
  readFileSync(
    new URL(
      "../../../packages/contracts/fixtures/accepted/project-profile-command-recovery-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectProfileCommandRecoveryView;

const readers = (): ProjectProfileRuntimeReader => ({
  listRegisteredProfiles: vi.fn(() =>
    Promise.resolve([structuredClone(profile)]),
  ),
  getRegisteredProfile: vi.fn(() => Promise.resolve(structuredClone(profile))),
  getProjectProfileTaxonomy: vi.fn(() =>
    Promise.resolve(structuredClone(taxonomy)),
  ),
});

const authority = () => {
  const execute = vi.fn(() => Promise.resolve(structuredClone(receipt)));
  const boundary: ProjectProfileCommandAuthority = {
    executeProjectProfileCommand: execute,
  };
  return { boundary, execute };
};

const authorized = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://petra.local${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

describe("registered Project profile routes", () => {
  it("lists and reads exact registered profile versions", async () => {
    const app = createPetraApp({
      authToken: token,
      projectProfileReads: readers(),
    });

    const collection = await app.app.fetch(
      authorized("/api/queries/project-profiles"),
    );
    const detail = await app.app.fetch(
      authorized(
        `/api/queries/project-profiles/${profile.profile_id}?version=${profile.profile_version}`,
      ),
    );

    expect(collection.status).toBe(200);
    expect(await collection.json()).toStrictEqual({ profiles: [profile] });
    expect(detail.status).toBe(200);
    expect(await detail.json()).toStrictEqual(profile);
  });

  it("returns exact Project taxonomy and rejects unregistered query overrides", async () => {
    const app = createPetraApp({
      authToken: token,
      projectProfileReads: readers(),
    });

    const response = await app.app.fetch(
      authorized(
        `/api/queries/projects/${projectId}/taxonomy?definition_revision=1`,
      ),
    );
    const invalid = await app.app.fetch(
      authorized(
        `/api/queries/projects/${projectId}/taxonomy?profile=scientific`,
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual(taxonomy);
    expect(invalid.status).toBe(422);
  });

  it("creates through the authenticated command owner and preserves exact receipt identity", async () => {
    const commands = authority();
    const app = createPetraApp({
      authToken: token,
      projectProfileCommands: commands.boundary,
    });

    const response = await app.app.fetch(
      authorized("/api/commands/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toStrictEqual(receipt);
    expect(commands.execute).toHaveBeenCalledWith(request);
  });

  it("reconciles an exact Project command without executing its recovery action", async () => {
    const assess = vi.fn(() => Promise.resolve(structuredClone(recoveryView)));
    const recovery: ProjectProfileCommandRecoveryReader = {
      assessProjectProfileCommandRecovery: assess,
    };
    const app = createPetraApp({
      authToken: token,
      projectProfileRecovery: recovery,
    });

    const response = await app.app.fetch(
      authorized("/api/queries/project-profile-command-recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toStrictEqual(recoveryView);
    expect(assess).toHaveBeenCalledWith(request);
  });

  it("maps unknown profiles to a safe typed client error without invoking fallback semantics", async () => {
    const commands: ProjectProfileCommandAuthority = {
      executeProjectProfileCommand: vi.fn(() =>
        Promise.reject(
          new ProjectProfileRuntimeError(
            "PROJECT_PROFILE_NOT_REGISTERED",
            "The selected Project profile is not registered. No Project was created or reset.",
          ),
        ),
      ),
    };
    const app = createPetraApp({
      authToken: token,
      projectProfileCommands: commands,
    });

    const response = await app.app.fetch(
      authorized("/api/commands/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }),
    );

    expect(response.status).toBe(422);
    const body: unknown = await response.json();
    expect(typeof body).toBe("object");
    if (body === null || typeof body !== "object") {
      throw new Error("Expected a typed profile error body.");
    }
    const error: unknown = Reflect.get(body, "error");
    expect(typeof error).toBe("object");
    if (error === null || typeof error !== "object") {
      throw new Error("Expected a typed profile error payload.");
    }
    expect(Reflect.get(error, "code")).toBe("PROJECT_PROFILE_NOT_REGISTERED");
  });

  it("requires bearer authentication for registry, taxonomy, create, and reset", async () => {
    const app = createPetraApp({
      authToken: token,
      projectProfileReads: readers(),
      projectProfileCommands: authority().boundary,
    });
    for (const [path, method] of [
      ["/api/queries/project-profiles", "GET"],
      [`/api/queries/projects/${projectId}/taxonomy`, "GET"],
      ["/api/queries/project-profile-command-recovery", "POST"],
      ["/api/commands/projects", "POST"],
      [`/api/commands/projects/${projectId}/reset`, "POST"],
    ] as const) {
      const response = await app.app.fetch(
        new Request(`http://petra.local${path}`, { method }),
      );
      expect(response.status).toBe(401);
    }
  });
});
