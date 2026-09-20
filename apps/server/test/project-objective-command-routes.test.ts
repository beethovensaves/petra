import type {
  PetraProjectObjective,
  PetraProjectObjectiveCommandReceipt,
  PetraProjectObjectiveCommandRecoveryView,
  PetraProjectObjectiveCommandRequest,
} from "@petra/contracts";
import type {
  AuthenticatedCommandPrincipalResolver,
  ProjectObjectiveCommandAuthority,
} from "@petra/core";
import { describe, expect, it, vi } from "vitest";

import { createPetraApp } from "../src/app.js";

const token = "project-objective-command-token";
const hash = (character: string): string => `sha256:${character.repeat(64)}`;
const projectId = "project_01K6P000000000000000001001";
const actor = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actor_kind: "human" as const,
};
const capabilityGrantId = "capability_grant_01K6P000000000000000001001";
const priorRef = {
  objective_id: "objective_01K6P000000000000000001001",
  revision: 2,
  content_hash: hash("a"),
  record_hash: hash("b"),
};
const resultRef = {
  objective_id: priorRef.objective_id,
  revision: 3,
  content_hash: hash("c"),
  record_hash: hash("d"),
};
const definitionRef = {
  project_definition_id: "project_definition_01K6P000000000000000001001",
  revision: 1,
  content_hash: hash("e"),
  record_hash: hash("f"),
};
const request: PetraProjectObjectiveCommandRequest = {
  schema_name: "petra.project-objective-command-request",
  schema_version: "1.0.0",
  command_id: "command_01K6P000000000000000001001",
  idempotency_key: "wave6:objective:route",
  operation: "revise",
  expected: {
    project_ref: { project_id: projectId, revision: 4, record_hash: hash("1") },
    project_definition_ref: definitionRef,
    focus: { state: "focused", objective_ref: priorRef },
  },
  review: {
    decision: "apply",
    rough_statement: "Which outcome matters?",
    proposed_content: {
      objective_kind: "scientific.research-question",
      statement: "Which exact population, task, and outcome matter?",
      status: "active",
      dependency_refs: [],
    },
    reviewed_at: "2026-09-19T12:00:00.000Z",
  },
};
const objective: PetraProjectObjective = {
  schema_name: "petra.project-objective",
  schema_version: "1.0.0",
  objective_id: resultRef.objective_id,
  revision: resultRef.revision,
  project_id: projectId,
  project_definition_ref: {
    project_definition_id: definitionRef.project_definition_id,
    revision: definitionRef.revision,
    content_hash: definitionRef.content_hash,
  },
  content: structuredClone(request.review.proposed_content),
  content_hash: resultRef.content_hash,
  created_by: actor,
  created_at: "2026-09-18T12:00:00.000Z",
  updated_at: "2026-09-19T12:01:00.000Z",
};
const receipt: PetraProjectObjectiveCommandReceipt = {
  schema_name: "petra.project-objective-command-receipt",
  schema_version: "1.0.0",
  receipt_id: "project_objective_receipt_01K6P000000000000000001001",
  command_id: request.command_id,
  idempotency_key: request.idempotency_key,
  request_hash: hash("2"),
  operation: "revise",
  project_id: projectId,
  actor,
  capability_grant_id: capabilityGrantId,
  project_definition_ref: definitionRef,
  prior_focus: { state: "focused", objective_ref: priorRef },
  objective_ref: resultRef,
  review: {
    decision: "applied",
    rough_statement: request.review.rough_statement,
    proposed_statement: request.review.proposed_content.statement,
    reviewed_by: actor,
    reviewed_at: request.review.reviewed_at,
  },
  effect: {
    kind: "objective_revised",
    summary: "The reviewed Objective revision is retained and focused.",
    current_focus_updated: true,
  },
  destination: {
    place_role: "brief",
    project_id: projectId,
    objective_ref: resultRef,
  },
  recovery: {
    command_path: `/api/commands/projects/${projectId}/objective`,
    assessment_path: `/api/queries/projects/${projectId}/objective-command-recovery`,
    retry_reuses_command_identity: true,
    missing_receipt_means_unknown: true,
  },
  recorded_at: objective.updated_at,
  record_hash: hash("3"),
};
const recovery: PetraProjectObjectiveCommandRecoveryView = {
  schema_name: "petra.project-objective-command-recovery-view",
  schema_version: "1.0.0",
  assessment_id: "project_objective_recovery_01K6P000000000000000001001",
  project_id: projectId,
  subject: {
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: receipt.request_hash,
  },
  effect: { state: "effect_confirmed", receipt },
  return: { state: "exact", destination: receipt.destination },
  observed_at: "2026-09-19T12:02:00.000Z",
  content_hash: hash("4"),
};

const principal: AuthenticatedCommandPrincipalResolver = {
  resolveCommandPrincipal: () =>
    Promise.resolve({ state: "resolved", actor, capabilityGrantId }),
};

const authorized = (path: string, body: unknown): Request =>
  new Request(`http://petra.local${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("Project Objective command routes", () => {
  it("resolves server-owned authority and returns the exact reviewed Brief destination", async () => {
    const executeProjectObjectiveCommand = vi.fn<
      ProjectObjectiveCommandAuthority["executeProjectObjectiveCommand"]
    >(() =>
      Promise.resolve({
        receipt: structuredClone(receipt),
        objective: structuredClone(objective),
        applied: true,
      }),
    );
    const resolveCommandPrincipal = vi.fn(
      principal.resolveCommandPrincipal.bind(principal),
    );
    const petra = createPetraApp({
      authToken: token,
      commandPrincipalResolver: { resolveCommandPrincipal },
      projectObjectiveCommands: {
        executeProjectObjectiveCommand,
        assessProjectObjectiveCommandRecovery: vi.fn(),
      },
    });

    const response = await petra.app.fetch(
      authorized(`/api/commands/projects/${projectId}/objective`, request),
    );

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(
      201,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toStrictEqual({
      receipt,
      objective,
      applied: true,
    });
    expect(resolveCommandPrincipal).toHaveBeenCalledWith({
      projectId,
      commandName: "FrameProjectObjective",
    });
    expect(executeProjectObjectiveCommand).toHaveBeenCalledWith(
      projectId,
      request,
      { actor, capabilityGrantId },
    );
  });

  it("rejects client authority and cross-Project bindings before execution", async () => {
    const executeProjectObjectiveCommand = vi.fn();
    const petra = createPetraApp({
      authToken: token,
      commandPrincipalResolver: principal,
      projectObjectiveCommands: {
        executeProjectObjectiveCommand,
        assessProjectObjectiveCommandRecovery: vi.fn(),
      },
    });
    const withAuthority = await petra.app.fetch(
      authorized(`/api/commands/projects/${projectId}/objective`, {
        ...request,
        actor,
        capability_grant_id: capabilityGrantId,
      }),
    );
    const wrongProject = await petra.app.fetch(
      authorized(
        `/api/commands/projects/${projectId.slice(0, -1)}9/objective`,
        request,
      ),
    );

    expect(
      withAuthority.status,
      JSON.stringify(await withAuthority.clone().json()),
    ).toBe(422);
    expect(
      wrongProject.status,
      JSON.stringify(await wrongProject.clone().json()),
    ).toBe(409);
    expect(executeProjectObjectiveCommand).not.toHaveBeenCalled();
  });

  it("exposes no-store recovery with the exact retained Brief return", async () => {
    const assessProjectObjectiveCommandRecovery = vi.fn<
      ProjectObjectiveCommandAuthority["assessProjectObjectiveCommandRecovery"]
    >(() => Promise.resolve(structuredClone(recovery)));
    const petra = createPetraApp({
      authToken: token,
      commandPrincipalResolver: principal,
      projectObjectiveCommands: {
        executeProjectObjectiveCommand: vi.fn(),
        assessProjectObjectiveCommandRecovery,
      },
    });

    const response = await petra.app.fetch(
      authorized(
        `/api/queries/projects/${projectId}/objective-command-recovery`,
        request,
      ),
    );

    expect(response.status, JSON.stringify(await response.clone().json())).toBe(
      200,
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toStrictEqual(recovery);
    expect(assessProjectObjectiveCommandRecovery).toHaveBeenCalledWith(
      projectId,
      request,
      { actor, capabilityGrantId },
    );
  });

  it("requires bearer authentication for command and recovery", async () => {
    const petra = createPetraApp({
      authToken: token,
      commandPrincipalResolver: principal,
      projectObjectiveCommands: {
        executeProjectObjectiveCommand: vi.fn(),
        assessProjectObjectiveCommandRecovery: vi.fn(),
      },
    });
    for (const path of [
      `/api/commands/projects/${projectId}/objective`,
      `/api/queries/projects/${projectId}/objective-command-recovery`,
    ]) {
      const response = await petra.app.fetch(
        new Request(`http://petra.local${path}`, { method: "POST" }),
      );
      expect(response.status).toBe(401);
    }
  });
});
