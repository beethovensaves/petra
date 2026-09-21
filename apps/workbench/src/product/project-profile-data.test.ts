import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraProjectProfileCommandReceipt,
  PetraProjectProfileCommandRecoveryView,
  PetraProjectProfileCommandRequest,
  PetraProjectProfileTaxonomyView,
  PetraRegisteredProjectProfile,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { RouterContextProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assessProjectProfileCommandRecovery,
  createProjectProfileCommandRequest,
  createProjectWithProfile,
  createProjectProfileCommandIdentity,
  executeProjectProfileCommandRequest,
  loadProjectProfiles,
  loadProjectTaxonomy,
  resetProjectWithProfile,
} from "./project-data.js";

const profile = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/registered-project-profile-scientific.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraRegisteredProjectProfile;

const currentProjectId = "project_01K6P000000000000000000301";
const resultingProjectId = "project_01K6P000000000000000000302";

const recoveryFixture = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/contracts/fixtures/accepted/project-profile-command-recovery-view.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as PetraProjectProfileCommandRecoveryView;

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const derive = (kind: string, immutableIdentity: string): string => {
  const digest = createHash("sha256")
    .update(`${kind}:${immutableIdentity}`)
    .digest()
    .subarray(0, 16);
  let value = BigInt(`0x${digest.toString("hex")}`);
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let payload = "";
  for (let index = 0; index < 26; index += 1) {
    payload = alphabet[Number(value & 31n)] + payload;
    value >>= 5n;
  }
  return `${kind}_${payload}`;
};

const recoveryFor = (
  request: PetraProjectProfileCommandRequest,
): PetraProjectProfileCommandRecoveryView => {
  const value = structuredClone(recoveryFixture);
  value.content.subject = {
    operation: request.operation,
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash(request),
    ...(request.expected_project === undefined
      ? {}
      : { expected_project: structuredClone(request.expected_project) }),
  };
  const action = value.content.eligible_actions[0];
  if (action === undefined)
    throw new Error("The unknown-effect recovery fixture has no action.");
  action.path =
    request.operation === "create"
      ? "/api/commands/projects"
      : `/api/commands/projects/${request.expected_project?.project_id}/reset`;
  action.success_destination.project_id = derive("project", request.command_id);
  value.content_hash = hash(value.content);
  value.assessment_id = derive("project_profile_recovery", value.content_hash);
  return value;
};

const requestUrl = (input: RequestInfo | URL): string =>
  input instanceof Request
    ? input.url
    : input instanceof URL
      ? input.href
      : input;

const taxonomy: PetraProjectProfileTaxonomyView = {
  schema_name: "petra.project-profile-taxonomy-view",
  schema_version: "1.0.0",
  project_id: currentProjectId,
  project_revision: 7,
  project_definition_ref: {
    project_definition_id: "project_definition_01K6P000000000000000000301",
    revision: 2,
    content_hash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  resolution: {
    state: "registered",
    profile_ref: {
      profile_id: profile.profile_id,
      profile_version: profile.profile_version,
      content_hash: profile.content_hash,
    },
    label: profile.content.label,
    purpose: profile.content.purpose,
    taxonomy: profile.content.taxonomy,
  },
  read_at: "2026-09-19T12:00:00.000Z",
};

const receiptFor = (
  request: PetraProjectProfileCommandRequest,
): PetraProjectProfileCommandReceipt => ({
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
  ...(request.operation === "reset"
    ? {
        prior_project_ref: {
          project_id: currentProjectId,
          revision: 7,
          resulting_status: "archived" as const,
        },
      }
    : {}),
  project_ref: {
    project_id:
      request.operation === "reset" ? resultingProjectId : currentProjectId,
    revision: 1,
  },
  project_definition_ref: {
    project_definition_id: "project_definition_01K6P000000000000000000302",
    revision: 1,
    content_hash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  objective_ref: {
    objective_id: "objective_01K6P000000000000000000302",
    revision: 1,
    content_hash:
      "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  },
  destination: {
    place_role: "brief",
    project_id:
      request.operation === "reset" ? resultingProjectId : currentProjectId,
  },
  recorded_at: "2026-09-19T12:00:01.000Z",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Project profile production data bindings", () => {
  it("creates paired command and idempotency identities for safe exact replay", () => {
    const identity = createProjectProfileCommandIdentity("create");

    expect(identity.commandId).toMatch(/^command_[0-9A-HJKMNP-TV-Z]{26}$/u);
    expect(identity.idempotencyKey).toBe(
      `project-profile:create:${identity.commandId.slice("command_".length)}`,
    );
  });

  it("loads the registered collection and exact Project taxonomy", async () => {
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(requestUrl(input));
      return Promise.resolve(
        Response.json(
          url.pathname.endsWith("/taxonomy")
            ? taxonomy
            : { profiles: [profile] },
        ),
      );
    });
    vi.stubGlobal("fetch", fetch);

    await expect(loadProjectProfiles()).resolves.toEqual([profile]);
    await expect(
      loadProjectTaxonomy({
        params: { projectId: currentProjectId },
        request: new Request(
          `http://petra.test/projects/${currentProjectId}/profile`,
        ),
        url: new URL(`http://petra.test/projects/${currentProjectId}/profile`),
        pattern: "/projects/:projectId/profile",
        context: new RouterContextProvider(),
      }),
    ).resolves.toEqual(taxonomy);

    expect(
      fetch.mock.calls.map(([input]) =>
        input instanceof URL ? input.pathname : requestUrl(input),
      ),
    ).toEqual([
      "/api/queries/project-profiles",
      `/api/queries/projects/${currentProjectId}/taxonomy`,
    ]);
  });

  it("binds create and reset to exact profiles without client actor authority", async () => {
    const requests: PetraProjectProfileCommandRequest[] = [];
    const fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(
        typeof init?.body === "string" ? init.body : "{}",
      ) as PetraProjectProfileCommandRequest;
      requests.push(request);
      return Promise.resolve(
        Response.json(receiptFor(request), { status: 201 }),
      );
    });
    vi.stubGlobal("fetch", fetch);

    await createProjectWithProfile({
      profile,
      project: {
        name: "Exact scientific Project",
        description: "Created from one immutable profile reference.",
      },
      objective: "Compare the exact registered evidence.",
    });
    await resetProjectWithProfile(currentProjectId, 7, {
      profile,
      project: { name: "Replacement scientific Project" },
      objective: "Continue from a deliberate additive reset.",
    });

    expect(requests).toHaveLength(2);
    expect(requests[0]).toEqual(
      expect.objectContaining({
        operation: "create",
        profile_ref: {
          profile_id: profile.profile_id,
          profile_version: profile.profile_version,
          content_hash: profile.content_hash,
        },
        project: {
          name: "Exact scientific Project",
          description: "Created from one immutable profile reference.",
        },
        objective: { statement: "Compare the exact registered evidence." },
      }),
    );
    expect(requests[0]).not.toHaveProperty("actor");
    expect(requests[1]?.expected_project).toEqual({
      project_id: currentProjectId,
      revision: 7,
    });
    expect(requests[1]).not.toHaveProperty("actor");
    expect(fetch.mock.calls.map(([input]) => requestUrl(input))).toEqual([
      "http://petra.local/api/commands/projects",
      `http://petra.local/api/commands/projects/${currentProjectId}/reset`,
    ]);
  });

  it("assesses without replay, then sends only the retained exact request to the eligible owner", async () => {
    const request = createProjectProfileCommandRequest("create", {
      profile,
      project: {
        name: "Recover exact scientific Project",
        description: "The browser retains this exact request.",
      },
      objective: "Reconcile before any idempotent redelivery.",
      commandId: "command_01K6P000000000000000000401",
      idempotencyKey: "project-profile:create:01K6P000000000000000000401",
    });
    const assessment = recoveryFor(request);
    const calls: Array<{ path: string; body: unknown }> = [];
    const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(requestUrl(input)).pathname;
      const body = JSON.parse(
        typeof init?.body === "string" ? init.body : "{}",
      ) as unknown;
      calls.push({ path, body });
      return Promise.resolve(
        path.endsWith("project-profile-command-recovery")
          ? Response.json(assessment)
          : Response.json(receiptFor(request), { status: 201 }),
      );
    });
    vi.stubGlobal("fetch", fetch);

    await expect(assessProjectProfileCommandRecovery(request)).resolves.toEqual(
      assessment,
    );
    expect(calls).toEqual([
      {
        path: "/api/queries/project-profile-command-recovery",
        body: request,
      },
    ]);

    await expect(executeProjectProfileCommandRequest(request)).resolves.toEqual(
      receiptFor(request),
    );
    expect(calls).toEqual([
      {
        path: "/api/queries/project-profile-command-recovery",
        body: request,
      },
      { path: "/api/commands/projects", body: request },
    ]);
  });
});
