import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { copilotHash, type CopilotContext } from "../src/project-copilot.js";
import {
  validateWorkingPlan,
  validateWorkingPlanInput,
  type WorkingPlanInput,
  type WorkingPlanPreview,
} from "../src/copilot-working-plan.js";

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
const initial = fixture("copilot-context") as CopilotContext;
const { content_hash: ignoredContextHash, ...initialContent } = initial;
void ignoredContextHash;
const content = {
  ...initialContent,
  records: [
    {
      key: "study-limits",
      ref: {
        record_id: "source_span_01ARZ3NDEKTSV4RRFFQ69G5FB7",
        revision: 1,
        record_hash: `sha256:${"1".repeat(64)}`,
      },
      kind: "source_span",
      label: "Synthetic study limitations",
      text: "Reported improvement does not establish causation.",
      reportable_text: "Reported improvement does not establish causation.",
      destination: `/projects/${initial.project_id}/sources`,
    },
  ],
};
const context: CopilotContext = {
  ...content,
  content_hash: copilotHash(content),
};
function preview(): WorkingPlanPreview {
  const entry = new PetraContractRegistry().entries.find(
    (entry) => entry.name === "claim" && entry.version === "1.0.0",
  )!;
  const content = {
    key: "revise-current-claim",
    kind: "candidate_revision" as const,
    operation_id: "review.correct-candidate",
    project_id: context.project_id,
    context_hash: context.content_hash,
    contract: {
      name: entry.name,
      version: entry.version,
      hash: entry.canonical_sha256,
    },
    payload: fixture("claim") as Record<string, unknown>,
    editable_paths: ["canonical_text"],
  };
  return { ...content, preview_hash: copilotHash(content) };
}
const input = (): WorkingPlanInput => ({
  project_id: context.project_id,
  context: structuredClone(context),
  question: "Propose wording that preserves the study's limits.",
  previews: [preview()],
});
const output = () => ({
  schema_name: "petra.copilot-working-plan",
  schema_version: "1.0.0",
  authority: "proposed_only",
  explanation: "This is a proposed wording change for review.",
  proposals: [
    {
      preview_key: "revise-current-claim",
      changes: [
        {
          path: "canonical_text",
          value_json: JSON.stringify(
            "The study reports improvement; this does not establish causation.",
          ),
        },
      ],
      reason: "Preserve the reported scope and unresolved limitations.",
      basis_keys: [context.records[0]!.key],
    },
  ],
});
describe("typed working-structure role", () => {
  it("validates a native proposal against its exact preview without mutating retained input", () => {
    const selected = input();
    const original = structuredClone(selected);
    const result = validateWorkingPlan(output(), selected);
    expect(result.proposals[0]!.payload.canonical_text).toContain(
      "does not establish causation",
    );
    expect(selected).toEqual(original);
    expect(result.plan.authority).toBe("proposed_only");
    expect(result.proposals[0]!.preview.operation_id).toBe(
      "review.correct-candidate",
    );
  });
  it("preserves controlled-writing native requirements and admits an explicit empty catalogue", () => {
    const selected = input();
    const native = fixture("controlled-writing-requirement") as Record<
      string,
      unknown
    >;
    const entry = new PetraContractRegistry().entries.find(
      (entry) =>
        entry.name === "controlled-writing-requirement" &&
        entry.version === "1.0.0",
    )!;
    const content = {
      ...preview(),
      project_id: native.project_id as string,
      payload: native,
      contract: {
        name: entry.name,
        version: entry.version,
        hash: entry.canonical_sha256,
      },
      editable_paths: ["content.statement"],
    };
    selected.project_id = content.project_id;
    const { content_hash: ignored, ...ctx } = selected.context;
    void ignored;
    const definition = native.project_definition_ref as {
      project_definition_id: string;
      revision: number;
      content_hash: string;
      definition_family: string;
    };
    const exactContext = {
      ...ctx,
      project_id: selected.project_id,
      definition_family: definition.definition_family,
      basis: {
        ...ctx.basis,
        definition: {
          record_id: definition.project_definition_id,
          revision: definition.revision,
          content_hash: definition.content_hash,
        },
      },
      records: ctx.records.map((record) => ({
        ...record,
        destination: `/projects/${selected.project_id}/sources`,
      })),
    };
    selected.context = {
      ...exactContext,
      content_hash: copilotHash(exactContext),
    };
    const { preview_hash: omitted, ...bound } = {
      ...content,
      context_hash: selected.context.content_hash,
    };
    void omitted;
    selected.previews = [{ ...bound, preview_hash: copilotHash(bound) }];
    const response = output();
    response.proposals[0]!.changes[0]!.path = "content.statement";
    response.proposals[0]!.changes[0]!.value_json = JSON.stringify(
      "Each mandatory step must identify its exact authority source.",
    );
    expect(
      validateWorkingPlan(response, selected).proposals[0]!.payload.schema_name,
    ).toBe("petra.controlled-writing-requirement");
    selected.previews = [];
    expect(
      validateWorkingPlan({ ...response, proposals: [] }, selected).proposals,
    ).toEqual([]);
  });
  it("rejects fabricated preview keys and evidence before any command boundary", () => {
    const response = output();
    response.proposals[0]!.preview_key = "invented-command";
    expect(() => validateWorkingPlan(response, input())).toThrow(
      /supplied preview/u,
    );
    response.proposals[0]!.preview_key = "revise-current-claim";
    response.proposals[0]!.basis_keys = ["invented-source"];
    expect(() => validateWorkingPlan(response, input())).toThrow(
      /outside the exact/u,
    );
  });
  it("rejects protected authority fields unsafe paths stale hashes and foreign Project previews", () => {
    const response = output();
    response.proposals[0]!.changes[0]!.path = "authority.zone";
    expect(() => validateWorkingPlan(response, input())).toThrow(
      /editable fields/u,
    );
    const selected = input();
    selected.previews[0]!.editable_paths = ["__proto__.polluted"];
    expect(() => validateWorkingPlanInput(selected)).toThrow();
    selected.previews = [preview()];
    selected.previews[0]!.payload.canonical_text = "changed after preview";
    expect(() => validateWorkingPlanInput(selected)).toThrow(/identity/u);
    selected.previews = [
      { ...preview(), project_id: "project_01ARZ3NDEKTSV4RRFFQ69G5FAX" },
    ];
    expect(() => validateWorkingPlanInput(selected)).toThrow(
      /exact current Project/u,
    );
  });
  it("rejects partial JSON wrong native types duplicate edits and unregistered contract hashes", () => {
    const response = output();
    response.proposals[0]!.changes[0]!.value_json = '"partial';
    expect(() => validateWorkingPlan(response, input())).toThrow(
      /complete JSON/u,
    );
    response.proposals[0]!.changes[0]!.value_json = "false";
    expect(() => validateWorkingPlan(response, input())).toThrow();
    response.proposals[0]!.changes[0]!.value_json =
      JSON.stringify("new wording");
    response.proposals[0]!.changes.push(response.proposals[0]!.changes[0]!);
    expect(() => validateWorkingPlan(response, input())).toThrow(/duplicated/u);
    const selected = input();
    const { preview_hash: ignored, ...content } = preview();
    void ignored;
    content.contract.hash = `sha256:${"a".repeat(64)}`;
    selected.previews = [{ ...content, preview_hash: copilotHash(content) }];
    expect(() => validateWorkingPlanInput(selected)).toThrow(
      /registered contract/u,
    );
  });
});
