import { readFileSync } from "node:fs";

import type {
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
} from "@petra/contracts";
import type {
  AuthenticatedCommandPrincipalResolver,
  ProjectWorkOperationAuthority,
  ProjectWorkOperationsViewReader,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-work-operation-token";
const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../../packages/contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const request = readFixture<PetraProjectWorkOperationRequest>(
  "project-work-operation-request",
);
const receipt = readFixture<PetraProjectWorkOperationReceipt>(
  "project-work-operation-receipt",
);
const view = readFixture<PetraProjectWorkOperationsView>(
  "project-work-operations-view",
);
const commandPath = `/api/commands/projects/${view.project_id}/work/${view.work_unit_ref.work_unit_id}`;
const queryPath = `/api/queries/projects/${view.project_id}/work/${view.work_unit_ref.work_unit_id}/operations`;

const authorized = (path: string, init: RequestInit = {}): Request =>
  new Request(`http://petra.local${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

const resolvedPrincipal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({
      state: "resolved",
      actor: structuredClone(receipt.actor),
      capabilityGrantId: receipt.capability_grant_id,
    }),
};

describe("Project Work operation routes", () => {
  it("returns the exact no-store operation assessment", async () => {
    const reader: ProjectWorkOperationsViewReader = {
      getProjectWorkOperationsView: vi.fn(() =>
        Promise.resolve(structuredClone(view)),
      ),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectWorkOperations: reader,
    });

    const response = await petra.app.fetch(authorized(queryPath));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toStrictEqual(view);
  });

  it("resolves server-owned ManageProjectWork authority before execution", async () => {
    let resolution: { projectId: string; commandName: string } | undefined;
    let execution:
      | {
          projectId: string;
          body: PetraProjectWorkOperationRequest;
          principal: { actor: typeof receipt.actor; capabilityGrantId: string };
        }
      | undefined;
    const authority: ProjectWorkOperationAuthority = {
      registerRequiredInput: () => Promise.resolve(),
      executeProjectWorkOperation: (projectId, body, principal) => {
        execution = {
          projectId,
          body: structuredClone(body),
          principal: structuredClone(principal),
        };
        return Promise.resolve(structuredClone(receipt));
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolution = input;
          return resolvedPrincipal.resolveCommandPrincipal(input);
        },
      },
      projectWorkOperationAuthority: authority,
    });

    const response = await petra.app.fetch(
      authorized(commandPath, {
        method: "POST",
        body: JSON.stringify(request),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual(receipt);
    expect(resolution).toStrictEqual({
      projectId: view.project_id,
      commandName: "ManageProjectWork",
    });
    expect(execution).toStrictEqual({
      projectId: view.project_id,
      body: request,
      principal: {
        actor: receipt.actor,
        capabilityGrantId: receipt.capability_grant_id,
      },
    });
  });

  it("rejects client authority and crossed Work identities before execution", async () => {
    const execute = vi.fn();
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolvedPrincipal,
      projectWorkOperationAuthority: {
        registerRequiredInput: () => Promise.resolve(),
        executeProjectWorkOperation: execute,
      },
    });
    const clientAuthority = await petra.app.fetch(
      authorized(commandPath, {
        method: "POST",
        body: JSON.stringify({ ...request, actor: receipt.actor }),
      }),
    );
    const crossed = await petra.app.fetch(
      authorized(commandPath, {
        method: "POST",
        body: JSON.stringify({
          ...request,
          expected_work_unit_ref: {
            ...request.expected_work_unit_ref,
            work_unit_id: "work_unit_01K6P000000000000000000799",
          },
        }),
      }),
    );

    expect(clientAuthority.status).toBe(422);
    expect(crossed.status).toBe(422);
    expect(execute).not.toHaveBeenCalled();

    const servicePrincipal = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () =>
          Promise.resolve({
            state: "resolved",
            actor: {
              actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
              actor_kind: "service",
            },
            capabilityGrantId: receipt.capability_grant_id,
          }),
      },
      projectWorkOperationAuthority: {
        registerRequiredInput: () => Promise.resolve(),
        executeProjectWorkOperation: execute,
      },
    });
    const serviceDenied = await servicePrincipal.app.fetch(
      authorized(commandPath, {
        method: "POST",
        body: JSON.stringify(request),
      }),
    );
    expect(serviceDenied.status).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
});
