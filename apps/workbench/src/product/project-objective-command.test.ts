import { createHash } from "node:crypto";

import type {
  PetraProjectObjective,
  PetraProjectObjectiveCommandReceipt,
  PetraProjectObjectiveCommandRecoveryView,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  ProjectObjectiveCommandClientError,
  assessProjectObjectiveCommandRecovery,
  createProjectObjectiveCommandRequest,
  executeProjectObjectiveCommand,
  projectObjectiveCommandFailureKind,
  type ProjectObjectiveCommandContext,
} from "./project-objective-command.js";

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const fixedHash = (character: string): string =>
  `sha256:${character.repeat(64)}`;
const fetchUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
};
const fetchBodyText = (body: BodyInit | null | undefined): string => {
  if (typeof body !== "string") {
    throw new TypeError("Expected the browser adapter to send a JSON string.");
  }
  return body;
};
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const definitionRef = {
  project_definition_id: "project_definition_01K4C000000000000000000001",
  revision: 2,
  content_hash: fixedHash("a"),
  record_hash: fixedHash("b"),
};
const currentObjective: PetraProjectObjective = {
  schema_name: "petra.project-objective",
  schema_version: "1.0.0",
  objective_id: "objective_01K4C000000000000000000005",
  revision: 3,
  project_id: projectId,
  project_definition_ref: {
    project_definition_id: definitionRef.project_definition_id,
    revision: definitionRef.revision,
    content_hash: definitionRef.content_hash,
  },
  content: {
    objective_kind: "scientific.research-question",
    statement: "Which outcome matters?",
    status: "active",
    parent_ref: {
      objective_id: "objective_01K4C000000000000000000003",
      revision: 1,
      content_hash: fixedHash("c"),
    },
    dependency_refs: [
      {
        objective_id: "objective_01K4C000000000000000000004",
        revision: 1,
        content_hash: fixedHash("d"),
      },
    ],
  },
  content_hash: fixedHash("e"),
  created_by: {
    actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
    actor_kind: "human",
  },
  created_at: "2026-09-18T12:00:00.000Z",
  updated_at: "2026-09-19T12:00:00.000Z",
};
const context: ProjectObjectiveCommandContext = {
  projectId,
  projectName: "Exact inquiry",
  definitionLabel: "Scientific evidence inquiry",
  projectRef: {
    project_id: projectId,
    revision: 4,
    record_hash: fixedHash("f"),
  },
  projectDefinitionRef: definitionRef,
  focus: {
    state: "focused",
    objective: currentObjective,
    objectiveRecordHash: hash(currentObjective),
    term: "Research question",
  },
};
const request = createProjectObjectiveCommandRequest({
  context,
  roughStatement: currentObjective.content.statement,
  proposedStatement: "Which exact population, task, and outcome matter?",
  identity: {
    commandId: "command_01K6P000000000000000001001",
    idempotencyKey: "brief.revise-objective:browser-test",
  },
  reviewedAt: "2026-09-19T12:30:00.000Z",
});
const actor = {
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  actor_kind: "human" as const,
};

const resultFixture = (applied: boolean) => {
  const content = structuredClone(request.review.proposed_content);
  const objective: PetraProjectObjective = {
    ...structuredClone(currentObjective),
    revision: currentObjective.revision + 1,
    content,
    content_hash: hash(content),
    updated_at: "2026-09-19T12:31:00.000Z",
  };
  const objectiveRef = {
    objective_id: objective.objective_id,
    revision: objective.revision,
    content_hash: objective.content_hash,
    record_hash: hash(objective),
  };
  const receiptBase = {
    schema_name: "petra.project-objective-command-receipt" as const,
    schema_version: "1.0.0" as const,
    receipt_id: "project_objective_receipt_01K6P000000000000000001001",
    command_id: request.command_id,
    idempotency_key: request.idempotency_key,
    request_hash: hash(request),
    operation: request.operation,
    project_id: projectId,
    actor,
    capability_grant_id: "capability_grant_01K6P000000000000000001001",
    project_definition_ref: definitionRef,
    prior_focus: structuredClone(request.expected.focus),
    objective_ref: objectiveRef,
    review: {
      decision: "applied" as const,
      rough_statement: request.review.rough_statement,
      proposed_statement: request.review.proposed_content.statement,
      reviewed_by: actor,
      reviewed_at: request.review.reviewed_at,
    },
    effect: {
      kind: "objective_revised" as const,
      summary:
        "The reviewed Objective revision is retained and is now the active Project focus.",
      current_focus_updated: true as const,
    },
    destination: {
      place_role: "brief" as const,
      project_id: projectId,
      objective_ref: objectiveRef,
    },
    recovery: {
      command_path: `/api/commands/projects/${projectId}/objective`,
      assessment_path: `/api/queries/projects/${projectId}/objective-command-recovery`,
      retry_reuses_command_identity: true as const,
      missing_receipt_means_unknown: true as const,
    },
    recorded_at: objective.updated_at,
  };
  const receipt: PetraProjectObjectiveCommandReceipt = {
    ...receiptBase,
    record_hash: hash(receiptBase),
  };
  return { receipt, objective, applied };
};

const recoveryFixture = (
  effect: PetraProjectObjectiveCommandRecoveryView["effect"],
): PetraProjectObjectiveCommandRecoveryView => {
  const returnValue: PetraProjectObjectiveCommandRecoveryView["return"] =
    effect.state === "effect_confirmed"
      ? { state: "exact", destination: effect.receipt.destination }
      : {
          state: "safe_fallback",
          destination: { place_role: "brief", project_id: projectId },
          reason: "Re-read the current Brief before another action.",
        };
  const content = {
    project_id: projectId,
    subject: {
      command_id: request.command_id,
      idempotency_key: request.idempotency_key,
      request_hash: hash(request),
    },
    effect,
    return: returnValue,
    observed_at: "2026-09-19T12:32:00.000Z",
  };
  return {
    schema_name: "petra.project-objective-command-recovery-view",
    schema_version: "1.0.0",
    assessment_id: "project_objective_recovery_01K6P000000000000000001001",
    ...content,
    content_hash: hash(content),
  };
};

describe("Project Objective browser command", () => {
  it("builds a reviewed revision from exact Project, definition, and focus without client authority", () => {
    expect(request.operation).toBe("revise");
    expect(request.expected).toStrictEqual({
      project_ref: context.projectRef,
      project_definition_ref: definitionRef,
      focus: {
        state: "focused",
        objective_ref: {
          objective_id: currentObjective.objective_id,
          revision: currentObjective.revision,
          content_hash: currentObjective.content_hash,
          record_hash: hash(currentObjective),
        },
      },
    });
    expect(request.review.proposed_content).toStrictEqual({
      ...currentObjective.content,
      statement: "Which exact population, task, and outcome matter?",
    });
    expect(request).not.toHaveProperty("actor");
    expect(request).not.toHaveProperty("capability_grant_id");
    expect(request).not.toHaveProperty("objective_id");
    expect(request.review.rough_statement).toBe(
      currentObjective.content.statement,
    );
    expect(() =>
      createProjectObjectiveCommandRequest({
        context,
        roughStatement: "Client-substituted rough wording.",
        proposedStatement: "Which exact outcome matters?",
      }),
    ).toThrow("exact current wording");
  });

  it("frames from an exact reviewed absence with a registered focus kind", () => {
    const framed = createProjectObjectiveCommandRequest({
      context: {
        ...context,
        focus: {
          state: "none",
          objectiveKind: "controlled-writing.requirement",
          term: "Requirement",
        },
      },
      roughStatement: "State the obligation.",
      proposedStatement: "The operator must retain the audit record.",
      identity: {
        commandId: "command_01K6P000000000000000001002",
        idempotencyKey: "brief.frame-objective:browser-test",
      },
      reviewedAt: "2026-09-19T12:30:00.000Z",
    });
    expect(framed.operation).toBe("frame");
    expect(framed.expected.focus).toStrictEqual({ state: "none" });
    expect(framed.review.proposed_content).toStrictEqual({
      objective_kind: "controlled-writing.requirement",
      statement: "The operator must retain the audit record.",
      status: "active",
      dependency_refs: [],
    });
  });

  it.each([true, false])(
    "executes and validates the exact applied=%s result",
    async (applied) => {
      const result = resultFixture(applied);
      const fetch = vi.fn<typeof globalThis.fetch>(() =>
        Promise.resolve(Response.json(result)),
      );
      await expect(
        executeProjectObjectiveCommand(projectId, request, fetch),
      ).resolves.toStrictEqual(result);
      const [url, init] = fetch.mock.calls[0]!;
      expect(fetchUrl(url)).toBe(
        `http://petra.local/api/commands/projects/${projectId}/objective`,
      );
      expect(init?.method).toBe("POST");
      expect(JSON.parse(fetchBodyText(init?.body))).toStrictEqual(request);
    },
  );

  it("reconciles unknown, conflicting, and confirmed effects against one exact request", async () => {
    const confirmed = recoveryFixture({
      state: "effect_confirmed",
      receipt: resultFixture(true).receipt,
    });
    const unknown = recoveryFixture({
      state: "outcome_unknown",
      reason: "receipt_not_observed_at_cutoff",
      retry: {
        method: "POST",
        path: `/api/commands/projects/${projectId}/objective`,
        reuse_exact_request: true,
      },
    });
    const conflict = recoveryFixture({
      state: "unavailable_to_verify",
      reason: "command_identity_conflict",
    });
    for (const assessment of [confirmed, unknown, conflict]) {
      const fetch = vi.fn<typeof globalThis.fetch>(() =>
        Promise.resolve(Response.json(assessment)),
      );
      await expect(
        assessProjectObjectiveCommandRecovery(projectId, request, fetch),
      ).resolves.toStrictEqual(assessment);
      expect(fetchUrl(fetch.mock.calls[0]![0])).toContain(
        "/objective-command-recovery",
      );
      expect(
        JSON.parse(fetchBodyText(fetch.mock.calls[0]![1]?.body)),
      ).toStrictEqual(request);
    }
  });

  it("fails closed on a substituted Objective and classifies material failures", async () => {
    const result = resultFixture(true);
    result.objective.content.statement = "Substituted wording";
    const fetch = vi.fn<typeof globalThis.fetch>(() =>
      Promise.resolve(Response.json(result)),
    );
    await expect(
      executeProjectObjectiveCommand(projectId, request, fetch),
    ).rejects.toMatchObject({
      code: "PROJECT_OBJECTIVE_COMMAND_RESPONSE_MISMATCH",
    });
    expect(
      projectObjectiveCommandFailureKind(
        new ProjectObjectiveCommandClientError(
          "The current focus changed after review.",
          409,
          "PROJECT_OBJECTIVE_COMMAND_FOCUS_STALE",
        ),
      ),
    ).toBe("stale");
    expect(
      projectObjectiveCommandFailureKind(
        new ProjectObjectiveCommandClientError(
          "The command identity conflicts with retained material.",
          409,
          "PROJECT_OBJECTIVE_COMMAND_IDEMPOTENCY_CONFLICT",
        ),
      ),
    ).toBe("conflict");
    expect(
      projectObjectiveCommandFailureKind(new TypeError("Failed to fetch")),
    ).toBe("outcome_unknown");
  });
});
