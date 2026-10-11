import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PetraContractRegistry } from "../src/validator.js";
import type { PetraCopilotHumanCommandDecision } from "../src/generated/copilot-human-command-decision.js";

const registry = new PetraContractRegistry();
const decision = (): PetraCopilotHumanCommandDecision =>
  JSON.parse(
    readFileSync(
      new URL(
        "../fixtures/accepted/copilot-human-command-decision.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PetraCopilotHumanCommandDecision;

describe("explicit human command decision contract", () => {
  it("execution: proposal decision and attached activity transport retain their exact registered identities", () => {
    for (const name of [
      "copilot-command-proposal-request",
      "copilot-command-decision-request",
      "copilot-command-activity",
    ]) {
      const value: unknown = JSON.parse(
        readFileSync(
          new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
          "utf8",
        ),
      );
      expect(() => registry.assertValid(name, "1.0.0", value)).not.toThrow();
    }
  });
  it("critical: transport cannot override Actor authority or release completed output under failed delivery", () => {
    for (const name of [
      "copilot-command-proposal-request",
      "copilot-command-decision-request",
      "copilot-command-activity",
    ]) {
      const value = JSON.parse(
        readFileSync(
          new URL(`../fixtures/accepted/${name}.json`, import.meta.url),
          "utf8",
        ),
      ) as Record<string, unknown>;
      expect(() =>
        registry.assertValid(name, "1.0.0", {
          ...value,
          actor_override: decision().actor_id,
        }),
      ).toThrow();
      if (name === "copilot-command-activity")
        expect(() =>
          registry.assertValid(name, "1.0.0", {
            ...value,
            state: "failed",
            error: "No observed result.",
          }),
        ).toThrow();
    }
  });
  it("execution: accepts an exact complete native command with separate accept and reject choices", () => {
    for (const choice of ["accept", "reject"] as const) {
      const record = { ...decision(), decision: choice };
      expect(() =>
        registry.assertValid("copilot-human-command-decision", "1.0.0", record),
      ).not.toThrow();
      expect(() =>
        registry.assertValid(
          "project-work-operation-request",
          "1.0.0",
          record.request,
        ),
      ).not.toThrow();
      expect(() =>
        registry.assertValid(
          "project-work-operation-request",
          "1.0.0",
          record.command.preview.payload,
        ),
      ).not.toThrow();
    }
  });
  it("critical: refuses partial ordinary bodies editable command arguments and arbitrary model tools", () => {
    const partial = decision();
    Object.assign(partial, { request: { operation: "start" } });
    const editable = decision();
    Object.assign(editable.command.preview, {
      editable_paths: ["/expected_work_unit_ref/revision"],
    });
    const tool = decision();
    Object.assign(tool.command.ordinary_command, {
      operation_id: "shell.execute",
      path: "/api/tools/shell",
    });
    for (const record of [partial, editable, tool])
      expect(() =>
        registry.assertValid("copilot-human-command-decision", "1.0.0", record),
      ).toThrow();
  });
  it("critical: neither an acceptance nor rejection can carry fabricated approval permission or an applied receipt", () => {
    for (const choice of ["accept", "reject"] as const)
      for (const field of [
        "capability_grant",
        "approval",
        "authority_effect",
        "receipt",
      ])
        expect(() =>
          registry.assertValid("copilot-human-command-decision", "1.0.0", {
            ...decision(),
            decision: choice,
            [field]: { state: "applied" },
          }),
        ).toThrow();
  });
});
