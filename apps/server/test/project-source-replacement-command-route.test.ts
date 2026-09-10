import { readFileSync } from "node:fs";

import type {
  PetraProjectSourceReplacement,
  PetraProjectSourceReplacementReceipt,
  PetraProjectSourceReplacementRetraction,
} from "@petra/contracts";
import {
  ProjectSourceReplacementCommandError,
  type AuthenticatedCommandPrincipalResolver,
  type ProjectSourceReplacementCommandAuthorityRepository,
  type ProjectSourceReplacementCommandEnvelope,
  type ProjectSourceReplacementCommandErrorCode,
} from "@petra/core";
import { describe, expect, it } from "vitest";

import { createPetraApp } from "../src/app.js";

const TOKEN = "project-source-replacement-command-token";

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

const createEnvelope = readFixture<ProjectSourceReplacementCommandEnvelope>(
  "command-create-project-source-replacement",
);
if (createEnvelope.command.command_name !== "CreateProjectSourceReplacement") {
  throw new Error("Expected replacement creation fixture.");
}
const retractEnvelope = readFixture<ProjectSourceReplacementCommandEnvelope>(
  "command-retract-project-source-replacement",
);
if (
  retractEnvelope.command.command_name !== "RetractProjectSourceReplacement"
) {
  throw new Error("Expected replacement retraction fixture.");
}
const replacement = readFixture<PetraProjectSourceReplacement>(
  "project-source-replacement",
);
const createReceipt = readFixture<PetraProjectSourceReplacementReceipt>(
  "project-source-replacement-receipt-created",
);
const retraction = readFixture<PetraProjectSourceReplacementRetraction>(
  "project-source-replacement-retraction",
);
const retractReceipt = readFixture<PetraProjectSourceReplacementReceipt>(
  "project-source-replacement-receipt-retracted",
);
if (retractReceipt.content.result.effect !== "replacement_retracted") {
  throw new Error("Expected replacement retraction receipt fixture.");
}
retractReceipt.content.result.replacement_ref.record_hash =
  retractEnvelope.command.expected_replacement_ref.record_hash;

const createPath = `/api/commands/projects/${createEnvelope.project_id}/source-replacements`;
const retractPath =
  `/api/commands/projects/${retractEnvelope.project_id}` +
  `/source-replacements/${retractEnvelope.command.expected_replacement_ref.project_source_replacement_id}/retraction`;

const createBody = {
  command_id: createEnvelope.command_id,
  idempotency_key: createEnvelope.idempotency_key,
  replacement_kind: createEnvelope.command.replacement_kind,
  replaced_source_ref: createEnvelope.command.replaced_source_ref,
  replacement_source_ref: createEnvelope.command.replacement_source_ref,
  exclusion_receipt_ref: createEnvelope.command.exclusion_receipt_ref,
  rationale: replacement.content.rationale,
};
const retractBody = {
  command_id: retractEnvelope.command_id,
  idempotency_key: retractEnvelope.idempotency_key,
  expected_replacement_ref: retractEnvelope.command.expected_replacement_ref,
  reason: retractEnvelope.command.reason,
};

const request = (path: string, body: unknown): Request =>
  new Request(`http://petra.local${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

const resolvedPrincipal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({
      state: "resolved",
      actor: {
        actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        actor_kind: "human",
      },
      capabilityGrantId: "capability_grant_01K4C000000000000000000051",
    }),
};

describe("ProjectSource replacement command routes", () => {
  it("builds an authorized creation envelope without request-carried authority", async () => {
    let resolvedInput: { projectId: string; commandName: string } | undefined;
    let executedEnvelope: ProjectSourceReplacementCommandEnvelope | undefined;
    const authority: ProjectSourceReplacementCommandAuthorityRepository = {
      executeProjectSourceReplacementCommand: (envelope) => {
        executedEnvelope = structuredClone(envelope);
        return Promise.resolve({
          outcome: "replacement_created",
          receipt: structuredClone(createReceipt),
          replacement: structuredClone(replacement),
          applied: true,
        });
      },
      getProjectSourceReplacementCommandReceipt: () =>
        Promise.resolve(undefined),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedInput = input;
          return resolvedPrincipal.resolveCommandPrincipal(input);
        },
      },
      projectSourceReplacementAuthority: authority,
    });

    const response = await petra.app.request(request(createPath, createBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      receipt: createReceipt,
      replacement,
      applied: true,
    });
    expect(resolvedInput).toEqual({
      projectId: createEnvelope.project_id,
      commandName: "CreateProjectSourceReplacement",
    });
    expect(executedEnvelope).toEqual(
      expect.objectContaining({
        schema_name: "petra.command-envelope",
        schema_version: "1.3.0",
        command_id: createEnvelope.command_id,
        idempotency_key: createEnvelope.idempotency_key,
        project_id: createEnvelope.project_id,
        actor: {
          actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
          actor_kind: "human",
        },
        capability_grant_id: "capability_grant_01K4C000000000000000000051",
        command: {
          ...createEnvelope.command,
          rationale: createBody.rationale,
        },
      }),
    );
    expect(executedEnvelope?.correlation_id).toMatch(
      /^trace_[0-9A-HJKMNP-TV-Z]{26}$/u,
    );
  });

  it("builds an independently authorized relation-retraction envelope", async () => {
    let resolvedCommandName: string | undefined;
    let executedEnvelope: ProjectSourceReplacementCommandEnvelope | undefined;
    const authority: ProjectSourceReplacementCommandAuthorityRepository = {
      executeProjectSourceReplacementCommand: (envelope) => {
        executedEnvelope = structuredClone(envelope);
        return Promise.resolve({
          outcome: "replacement_retracted",
          receipt: structuredClone(retractReceipt),
          replacement: structuredClone(replacement),
          retraction: structuredClone(retraction),
          applied: true,
        });
      },
      getProjectSourceReplacementCommandReceipt: () =>
        Promise.resolve(undefined),
    };
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: (input) => {
          resolvedCommandName = input.commandName;
          return resolvedPrincipal.resolveCommandPrincipal(input);
        },
      },
      projectSourceReplacementAuthority: authority,
    });

    const response = await petra.app.request(request(retractPath, retractBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      receipt: retractReceipt,
      replacement,
      retraction,
      applied: true,
    });
    expect(resolvedCommandName).toBe("RetractProjectSourceReplacement");
    expect(executedEnvelope).toEqual(
      expect.objectContaining({
        schema_name: "petra.command-envelope",
        schema_version: "1.3.0",
        command_id: retractEnvelope.command_id,
        idempotency_key: retractEnvelope.idempotency_key,
        project_id: retractEnvelope.project_id,
        command: retractEnvelope.command,
      }),
    );
  });

  it("rejects request-carried authority and route/ref mismatches before resolution", async () => {
    let resolutionAttempted = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () => {
          resolutionAttempted = true;
          return resolvedPrincipal.resolveCommandPrincipal({
            projectId: createEnvelope.project_id,
            commandName: "CreateProjectSourceReplacement",
          });
        },
      },
      projectSourceReplacementAuthority: {
        executeProjectSourceReplacementCommand: () => {
          throw new Error("Invalid request reached command execution.");
        },
        getProjectSourceReplacementCommandReceipt: () =>
          Promise.resolve(undefined),
      },
    });

    for (const candidate of [
      { ...createBody, actor: createEnvelope.actor },
      {
        ...createBody,
        capability_grant_id: createEnvelope.capability_grant_id,
      },
    ]) {
      const response = await petra.app.request(request(createPath, candidate));
      expect(response.status).toBe(422);
    }
    const mismatched = structuredClone(retractBody);
    mismatched.expected_replacement_ref.project_source_replacement_id =
      "project_source_replacement_01K4C000000000000000000099";
    const mismatchResponse = await petra.app.request(
      request(retractPath, mismatched),
    );
    expect(mismatchResponse.status).toBe(422);
    expect(resolutionAttempted).toBe(false);
  });

  it("fails closed when no active replacement-command grant resolves", async () => {
    let executed = false;
    const petra = createPetraApp({
      authToken: TOKEN,
      commandPrincipalResolver: {
        resolveCommandPrincipal: () =>
          Promise.resolve({
            state: "denied",
            reason: "active_grant_not_found",
          }),
      },
      projectSourceReplacementAuthority: {
        executeProjectSourceReplacementCommand: () => {
          executed = true;
          throw new Error("Denied command executed.");
        },
        getProjectSourceReplacementCommandReceipt: () =>
          Promise.resolve(undefined),
      },
    });

    const response = await petra.app.request(request(createPath, createBody));

    expect(response.status).toBe(403);
    expect(executed).toBe(false);
  });

  it("preserves replacement authority conflict and corruption semantics", async () => {
    const cases: readonly [ProjectSourceReplacementCommandErrorCode, number][] =
      [
        ["PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_AUTHORIZED", 403],
        ["PROJECT_SOURCE_REPLACEMENT_COMMAND_SOURCE_MISSING", 404],
        ["PROJECT_SOURCE_REPLACEMENT_COMMAND_REPLACEMENT_MISSING", 404],
        ["PROJECT_SOURCE_REPLACEMENT_COMMAND_NOT_ACTIVE", 409],
        ["PROJECT_SOURCE_REPLACEMENT_COMMAND_STORED_RECORD_CORRUPT", 503],
      ];
    for (const [code, expectedStatus] of cases) {
      const petra = createPetraApp({
        authToken: TOKEN,
        commandPrincipalResolver: resolvedPrincipal,
        projectSourceReplacementAuthority: {
          executeProjectSourceReplacementCommand: () =>
            Promise.reject(
              new ProjectSourceReplacementCommandError(code, code),
            ),
          getProjectSourceReplacementCommandReceipt: () =>
            Promise.resolve(undefined),
        },
      });

      const response = await petra.app.request(request(createPath, createBody));
      expect(response.status).toBe(expectedStatus);
      const body = (await response.json()) as { error: { code: string } };
      expect(body.error.code).toBe(code);
    }
  });
});
