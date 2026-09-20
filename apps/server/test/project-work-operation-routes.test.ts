import { readFileSync } from "node:fs";

import type {
  PetraProjectWorkOperationReceipt,
  PetraProjectWorkOperationRequest,
  PetraProjectWorkOperationsView,
  PetraProjectWorkResumeReceipt,
  PetraProjectWorkResumeRequest,
  PetraProjectWorkStartAgainReceipt,
  PetraProjectWorkStartAgainRequest,
} from "@petra/contracts";
import type {
  AuthenticatedCommandPrincipalResolver,
  ProjectWorkOperationAuthority,
  ProjectWorkOperationsViewReader,
  ProjectWorkResumeAuthority,
  ProjectWorkStartAgainAuthority,
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
const resumableView = readFixture<PetraProjectWorkOperationsView>(
  "project-work-operations-view-resumable",
);
const resumeRequest = readFixture<PetraProjectWorkResumeRequest>(
  "project-work-resume-request",
);
const resumeReceipt = readFixture<PetraProjectWorkResumeReceipt>(
  "project-work-resume-receipt",
);
const startAgainRequest = readFixture<PetraProjectWorkStartAgainRequest>(
  "project-work-start-again-request",
);
const startAgainReceipt = readFixture<PetraProjectWorkStartAgainReceipt>(
  "project-work-start-again-receipt",
);
const commandPath = `/api/commands/projects/${view.project_id}/work/${view.work_unit_ref.work_unit_id}`;
const queryPath = `/api/queries/projects/${view.project_id}/work/${view.work_unit_ref.work_unit_id}/operations`;
const resumePath = `/api/commands/projects/${resumeReceipt.project_id}/work/${resumeRequest.expected_work_unit_ref.work_unit_id}/resume`;
const startAgainPath = `/api/commands/projects/${startAgainReceipt.project_id}/work/${startAgainRequest.expected_prior_work_unit_ref.work_unit_id}/start-again`;

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
        Promise.resolve(structuredClone(resumableView)),
      ),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectWorkOperations: reader,
    });

    const response = await petra.app.fetch(authorized(queryPath));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toStrictEqual(resumableView);
  });

  it("rejects a Work read whose resume binding crosses its exact revision", async () => {
    const reader: ProjectWorkOperationsViewReader = {
      getProjectWorkOperationsView: vi.fn(() =>
        Promise.resolve({
          ...structuredClone(resumableView),
          resume_binding: {
            ...structuredClone(resumableView.resume_binding!),
            expected_work_unit_ref: {
              ...structuredClone(
                resumableView.resume_binding!.expected_work_unit_ref,
              ),
              revision: resumableView.work_unit_ref.revision + 1,
            },
          },
        }),
      ),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      projectWorkOperations: reader,
    });

    const response = await petra.app.fetch(authorized(queryPath));

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PROJECT_WORK_OPERATIONS_READ_FAILED");
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
      registerStagePlan: () => Promise.resolve(),
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
        registerStagePlan: () => Promise.resolve(),
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
        registerStagePlan: () => Promise.resolve(),
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

  it("resolves server-owned authority for an exact checkpoint resume", async () => {
    let execution:
      | {
          projectId: string;
          body: PetraProjectWorkResumeRequest;
          principal: {
            actor: typeof resumeReceipt.actor;
            capabilityGrantId: string;
          };
        }
      | undefined;
    const authority: ProjectWorkResumeAuthority = {
      executeProjectWorkResume: (projectId, body, principal) => {
        execution = {
          projectId,
          body: structuredClone(body),
          principal: structuredClone(principal),
        };
        return Promise.resolve(structuredClone(resumeReceipt));
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolvedPrincipal,
      projectWorkResumeAuthority: authority,
    });

    const response = await petra.app.fetch(
      authorized(resumePath, {
        method: "POST",
        body: JSON.stringify(resumeRequest),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual(resumeReceipt);
    expect(execution).toStrictEqual({
      projectId: resumeReceipt.project_id,
      body: resumeRequest,
      principal: {
        actor: resumeReceipt.actor,
        capabilityGrantId: resumeReceipt.capability_grant_id,
      },
    });
  });

  it("resolves server-owned authority for an exact fresh-input Start again transition", async () => {
    let execution:
      | {
          projectId: string;
          body: PetraProjectWorkStartAgainRequest;
          principal: {
            actor: typeof startAgainReceipt.actor;
            capabilityGrantId: string;
          };
        }
      | undefined;
    const authority: ProjectWorkStartAgainAuthority = {
      executeProjectWorkStartAgain: (projectId, body, principal) => {
        execution = {
          projectId,
          body: structuredClone(body),
          principal: structuredClone(principal),
        };
        return Promise.resolve(structuredClone(startAgainReceipt));
      },
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: resolvedPrincipal,
      projectWorkStartAgainAuthority: authority,
    });

    const response = await petra.app.fetch(
      authorized(startAgainPath, {
        method: "POST",
        body: JSON.stringify(startAgainRequest),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual(startAgainReceipt);
    expect(execution).toStrictEqual({
      projectId: startAgainReceipt.project_id,
      body: startAgainRequest,
      principal: {
        actor: startAgainReceipt.actor,
        capabilityGrantId: startAgainReceipt.capability_grant_id,
      },
    });
  });
});
