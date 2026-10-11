import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { copilotHash, type CopilotContext } from "../src/project-copilot.js";
import { copilotCommandPreview } from "../src/copilot-command-preview.js";
import {
  validateWorkingPlan,
  validateWorkingPlanInput,
} from "../src/copilot-working-plan.js";
const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as T;
const context = (): CopilotContext => {
  const { content_hash, ...content } = fixture<CopilotContext>("copilot-context");
  void content_hash;
  return { ...content, content_hash: copilotHash(content) };
};
describe("ordinary command previews for the copilot", () => {
  it("retains the exact ordinary Work arguments without executing or exposing editable authority", () => {
    const request = fixture<Record<string, unknown>>(
      "project-work-operation-request",
    );
    const target = (request.expected_work_unit_ref as { work_unit_id: string })
      .work_unit_id;
    const result = copilotCommandPreview({
      operation_id: "work.start",
      target_id: target,
      context: context(),
      request,
    });
    expect(result.ordinary_command.path).toBe(
      `/api/commands/projects/${context().project_id}/work/${target}`,
    );
    expect(result.ordinary_command.requires_human_decision).toBe(true);
    expect(result.preview.payload).toEqual(request);
    expect(result.preview.editable_paths).toEqual([]);
    const input = {
      project_id: context().project_id,
      context: context(),
      question: "Which exact Work should start?",
      previews: [result.preview],
    };
    expect(() => validateWorkingPlanInput(input)).not.toThrow();
    expect(
      validateWorkingPlan(
        {
          schema_name: "petra.copilot-working-plan",
          schema_version: "1.0.0",
          authority: "proposed_only",
          explanation: "Proposed bounded Work, subject to review.",
          proposals: [
            {
              preview_key: result.preview.key,
              changes: [],
              reason: "Review the exact Work arguments before deciding.",
              basis_keys: [],
            },
          ],
        },
        input,
      ).proposals[0]?.payload,
    ).toEqual(request);
    expect(request).toEqual(fixture("project-work-operation-request"));
  });
  it("maps recovery and SuggestedAction to the existing owner routes and contracts", () => {
    for (const [name, operation, suffix, refName, idName] of [
      [
        "project-work-resume-request",
        "work.resume",
        "/resume",
        "expected_work_unit_ref",
        "work_unit_id",
      ],
      [
        "project-work-start-again-request",
        "work.start-again",
        "/start-again",
        "expected_prior_work_unit_ref",
        "work_unit_id",
      ],
      [
        "suggested-action-invocation-request",
        "brief.suggested-invoke",
        "/invoke",
        "expected_action_ref",
        "suggested_action_id",
      ],
    ] as const) {
      const request = fixture<Record<string, unknown>>(name),
        target = (request[refName] as Record<string, string>)[idName]!;
      const result = copilotCommandPreview({
        operation_id: operation,
        target_id: target,
        context: context(),
        request,
      });
      expect(result.ordinary_command.path.endsWith(suffix)).toBe(true);
      expect(result.preview.contract.name).toBe(name);
      expect(result.preview.payload).toEqual(request);
    }
  });
  it("rejects partial arguments arbitrary operations and target substitution before a proposal exists", () => {
    const request = fixture<Record<string, unknown>>(
        "project-work-operation-request",
      ),
      target = (request.expected_work_unit_ref as { work_unit_id: string })
        .work_unit_id;
    expect(() =>
      copilotCommandPreview({
        operation_id: "work.start",
        target_id: target,
        context: context(),
        request: { schema_name: request.schema_name, schema_version: "1.0.0" },
      }),
    ).toThrow();
    expect(() =>
      copilotCommandPreview({
        operation_id: "work.cancel",
        target_id: target,
        context: context(),
        request,
      }),
    ).toThrow(/differ from/u);
    expect(() =>
      copilotCommandPreview({
        operation_id: "work.start",
        target_id: target + "?actor=owner",
        context: context(),
        request,
      }),
    ).toThrow(/differ from/u);
    expect(() =>
      copilotCommandPreview({
        operation_id: "work.start",
        target_id: target,
        context: context(),
        request: {
          ...request,
          actor: { actor_kind: "human", actor_id: "owner" },
        },
      }),
    ).toThrow();
  });
});
