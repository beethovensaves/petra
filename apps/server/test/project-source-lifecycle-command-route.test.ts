import { readFileSync } from "node:fs";

import type {
  PetraProjectSource,
  PetraProjectSourceLifecycleReceipt,
} from "@petra/contracts";
import {
  ProjectSourceLifecycleAuthorityError,
  type AuthenticatedCommandPrincipalDenialReason,
  type AuthenticatedCommandPrincipalResolver,
  type ProjectSourceLifecycleAuthorityErrorCode,
  type ProjectSourceLifecycleAuthorityRepository,
  type ProjectSourceLifecycleCommandEnvelope,
} from "@petra/core";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-source-lifecycle-command-token";

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

const receiptFixture = readFixture<PetraProjectSourceLifecycleReceipt>(
  "project-source-lifecycle-receipt",
);
const sourceFixture = readFixture<PetraProjectSource>("project-source");
const resultingSource: PetraProjectSource = {
  ...structuredClone(sourceFixture),
  revision: receiptFixture.content.resulting_source_ref.revision,
  content: {
    ...structuredClone(sourceFixture.content),
    status: receiptFixture.content.resulting_source_ref.status,
  },
  content_hash: receiptFixture.content.resulting_source_ref.content_hash,
  added_at: receiptFixture.recorded_at,
};

const path = `/api/commands/projects/${receiptFixture.project_id}/sources/${sourceFixture.project_source_id}/lifecycle`;
const body = {
  command_id: receiptFixture.content.command_ref.command_id,
  idempotency_key: receiptFixture.content.command_ref.idempotency_key,
  requested_action: "exclude_project_source",
  expected_source_ref: receiptFixture.content.prior_source_ref,
  reason: "Exclude this source from ordinary new use while retaining history.",
} as const;

const request = (payload: unknown, suffix = ""): Request =>
  new Request(`http://petra.local${path}${suffix}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

const resolvedPrincipal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({
      state: "resolved",
      actor: {
        actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        actor_kind: "human",
      },
      capabilityGrantId: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
    }),
};

describe("ProjectSource lifecycle command route", () => {
  it("builds the governed envelope from server identity and the exact source request", async () => {
    let resolvedInput: { projectId: string; commandName: string } | undefined;
    let executedEnvelope: ProjectSourceLifecycleCommandEnvelope | undefined;
    const principal: AuthenticatedCommandPrincipalResolver = {
      resolveCommandPrincipal: (input) => {
        resolvedInput = input;
        return resolvedPrincipal.resolveCommandPrincipal(input);
      },
    };
    const authority: ProjectSourceLifecycleAuthorityRepository = {
      executeProjectSourceLifecycleCommand: (envelope) => {
        executedEnvelope = structuredClone(envelope);
        return Promise.resolve({
          receipt: structuredClone(receiptFixture),
          projectSource: structuredClone(resultingSource),
          applied: true,
        });
      },
      getProjectSourceLifecycleReceipt: () => Promise.resolve(undefined),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: principal,
      projectSourceLifecycleAuthority: authority,
    });

    const response = await petra.app.request(request(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      receipt: receiptFixture,
      project_source: resultingSource,
      applied: true,
    });
    expect(resolvedInput).toEqual({
      projectId: receiptFixture.project_id,
      commandName: "ExcludeProjectSource",
    });
    expect(executedEnvelope).toEqual(
      expect.objectContaining({
        schema_name: "petra.command-envelope",
        schema_version: "1.2.0",
        command_id: body.command_id,
        idempotency_key: body.idempotency_key,
        project_id: receiptFixture.project_id,
        actor: {
          actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
          actor_kind: "human",
        },
        capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
        command: {
          command_name: "ExcludeProjectSource",
          expected_source_ref: body.expected_source_ref,
          reason: body.reason,
        },
      }),
    );
    expect(executedEnvelope?.correlation_id).toMatch(
      /^trace_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
    expect(executedEnvelope?.submitted_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u,
    );
  });

  it("rejects request-carried identity and query controls before resolution", async () => {
    let resolutionAttempted = false;
    const principal: AuthenticatedCommandPrincipalResolver = {
      resolveCommandPrincipal: () => {
        resolutionAttempted = true;
        return resolvedPrincipal.resolveCommandPrincipal({
          projectId: receiptFixture.project_id,
          commandName: "ExcludeProjectSource",
        });
      },
    };
    const authority: ProjectSourceLifecycleAuthorityRepository = {
      executeProjectSourceLifecycleCommand: () => {
        throw new Error("The invalid request reached command execution.");
      },
      getProjectSourceLifecycleReceipt: () => Promise.resolve(undefined),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: principal,
      projectSourceLifecycleAuthority: authority,
    });

    for (const candidate of [
      { ...body, actor: sourceFixture.added_by },
      { ...body, capability_grant_id: "request-selected-grant" },
    ]) {
      const response = await petra.app.request(request(candidate));
      expect(response.status).toBe(422);
      const responseBody = (await response.json()) as {
        error: { code: string };
      };
      expect(responseBody.error.code).toBe(
        "PROJECT_SOURCE_LIFECYCLE_COMMAND_INVALID",
      );
    }
    const queryResponse = await petra.app.request(
      request(body, "?actor=request-selected-user"),
    );
    expect(queryResponse.status).toBe(422);
    expect(resolutionAttempted).toBe(false);
  });

  it("fails closed for every unresolved authenticated principal state", async () => {
    const cases: readonly [
      AuthenticatedCommandPrincipalDenialReason,
      number,
      string,
    ][] = [
      [
        "active_grant_not_found",
        403,
        "PROJECT_SOURCE_LIFECYCLE_COMMAND_FORBIDDEN",
      ],
      ["actor_not_registered", 503, "AUTHENTICATED_ACTOR_UNAVAILABLE"],
      ["active_grant_ambiguous", 503, "PROJECT_COMMAND_AUTHORITY_AMBIGUOUS"],
    ];
    for (const [reason, expectedStatus, expectedCode] of cases) {
      let executed = false;
      const authority: ProjectSourceLifecycleAuthorityRepository = {
        executeProjectSourceLifecycleCommand: () => {
          executed = true;
          throw new Error("Denied authority executed.");
        },
        getProjectSourceLifecycleReceipt: () => Promise.resolve(undefined),
      };
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: {
          resolveCommandPrincipal: () =>
            Promise.resolve({ state: "denied", reason }),
        },
        projectSourceLifecycleAuthority: authority,
      });

      const response = await petra.app.request(request(body));
      expect(response.status).toBe(expectedStatus);
      const responseBody = (await response.json()) as {
        error: { code: string };
      };
      expect(responseBody.error.code).toBe(expectedCode);
      expect(executed).toBe(false);
    }
  });

  it("resolves restoration as its own exact command without executing on denial", async () => {
    let resolvedCommandName: string | undefined;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedCommandName = input.commandName;
          return Promise.resolve({
            state: "denied",
            reason: "active_grant_not_found",
          });
        },
      },
      projectSourceLifecycleAuthority: {
        executeProjectSourceLifecycleCommand: () => {
          throw new Error("Denied restoration executed.");
        },
        getProjectSourceLifecycleReceipt: () => Promise.resolve(undefined),
      },
    });
    const restoreBody = {
      ...body,
      command_id: "command_01K4C000000000000000000038",
      idempotency_key: "project-source:007:restore:v1",
      requested_action: "restore_project_source",
      expected_source_ref: receiptFixture.content.resulting_source_ref,
      reason: "Restore this retained source to ordinary new use.",
    } as const;

    const response = await petra.app.request(request(restoreBody));

    expect(response.status).toBe(403);
    expect(resolvedCommandName).toBe("RestoreProjectSource");
  });

  it("preserves domain authorization, target, conflict, and corruption semantics", async () => {
    const cases: readonly [ProjectSourceLifecycleAuthorityErrorCode, number][] =
      [
        ["PROJECT_SOURCE_LIFECYCLE_COMMAND_NOT_AUTHORIZED", 403],
        ["PROJECT_SOURCE_LIFECYCLE_SOURCE_NOT_FOUND", 404],
        ["PROJECT_SOURCE_LIFECYCLE_STALE_SOURCE", 409],
        ["PROJECT_SOURCE_LIFECYCLE_STORED_RECORD_CORRUPT", 503],
      ];
    for (const [code, expectedStatus] of cases) {
      const authority: ProjectSourceLifecycleAuthorityRepository = {
        executeProjectSourceLifecycleCommand: () =>
          Promise.reject(new ProjectSourceLifecycleAuthorityError(code, code)),
        getProjectSourceLifecycleReceipt: () => Promise.resolve(undefined),
      };
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: resolvedPrincipal,
        projectSourceLifecycleAuthority: authority,
      });

      const response = await petra.app.request(request(body));
      expect(response.status).toBe(expectedStatus);
      const responseBody = (await response.json()) as {
        error: { code: string };
      };
      expect(responseBody.error.code).toBe(code);
    }
  });
});
