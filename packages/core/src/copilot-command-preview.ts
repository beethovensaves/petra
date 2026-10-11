import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  CopilotBoundaryError,
  copilotHash,
  validateCopilotContext,
  type CopilotContext,
} from "./project-copilot.js";
import type { WorkingPlanPreview } from "./copilot-working-plan.js";

// These are the existing product operation identities and ordinary command
// owners. A model never supplies a URL, command name, Actor or grant.
const workOperations = {
  "work.start": "start",
  "work.answer-input": "answer_input",
  "work.steer": "steer",
  "work.prioritize": "prioritize",
  "work.cancel": "cancel",
  "work.retry": "retry",
} as const;
export type CopilotCommandOperation =
  | keyof typeof workOperations
  | "work.resume"
  | "work.start-again"
  | "brief.suggested-invoke"
  | "source.start-processing";
type Owner = {
  request: string;
  command:
    | "ManageProjectWork"
    | "InvokeSuggestedAction"
    | "StartProjectSourceProcessing";
  route:
    | "work"
    | "work/resume"
    | "work/start-again"
    | "suggested-actions"
    | "sources/processing";
};
const owners: Record<CopilotCommandOperation, Owner> = {
  "work.start": {
    request: "project-work-operation-request",
    command: "ManageProjectWork",
    route: "work",
  },
  "work.answer-input": {
    request: "project-work-operation-request",
    command: "ManageProjectWork",
    route: "work",
  },
  "work.steer": {
    request: "project-work-operation-request",
    command: "ManageProjectWork",
    route: "work",
  },
  "work.prioritize": {
    request: "project-work-operation-request",
    command: "ManageProjectWork",
    route: "work",
  },
  "work.cancel": {
    request: "project-work-operation-request",
    command: "ManageProjectWork",
    route: "work",
  },
  "work.retry": {
    request: "project-work-operation-request",
    command: "ManageProjectWork",
    route: "work",
  },
  "work.resume": {
    request: "project-work-resume-request",
    command: "ManageProjectWork",
    route: "work/resume",
  },
  "work.start-again": {
    request: "project-work-start-again-request",
    command: "ManageProjectWork",
    route: "work/start-again",
  },
  "brief.suggested-invoke": {
    request: "suggested-action-invocation-request",
    command: "InvokeSuggestedAction",
    route: "suggested-actions",
  },
  "source.start-processing": {
    request: "project-source-processing-request",
    command: "StartProjectSourceProcessing",
    route: "sources/processing",
  },
};
const object = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new CopilotBoundaryError(
      "INVALID_COMMAND_PREVIEW",
      "A command preview requires complete registered arguments.",
    );
  return value as Record<string, unknown>;
};
const requireBinding = (condition: boolean): void => {
  if (!condition)
    throw new CopilotBoundaryError(
      "COMMAND_PREVIEW_SCOPE",
      "The ordinary command arguments differ from the exact Project, definition, operation or target.",
    );
};
export interface CopilotCommandPreview {
  readonly preview: WorkingPlanPreview;
  readonly ordinary_command: {
    readonly operation_id: CopilotCommandOperation;
    readonly command_name: Owner["command"];
    readonly method: "POST";
    readonly path: string;
    readonly requires_human_decision: true;
  };
}

/**
 * Compose model-selectable arguments from an already authorized native owner
 * read. This pure function grants no eligibility or command authority: the
 * retained proposal owner must re-read its preview and human decision, and the
 * ordinary command endpoint must resolve Actor/grant/policy/revisions again.
 */
export function copilotCommandPreview(
  input: {
    operation_id: CopilotCommandOperation;
    target_id: string;
    context: CopilotContext;
    request: unknown;
  },
  contracts = new PetraContractRegistry(),
): CopilotCommandPreview {
  validateCopilotContext(input.context);
  if (!Object.hasOwn(owners, input.operation_id))
    throw new CopilotBoundaryError(
      "UNREGISTERED_COMMAND_PREVIEW",
      "No ordinary command owner is registered for that operation.",
    );
  const owner = owners[input.operation_id];
  const payload = object(input.request);
  contracts.assertValid(owner.request, "1.0.0", payload);
  const entry = contracts.entries.find(
    (item) => item.name === owner.request && item.version === "1.0.0",
  )!;
  let path: string;
  const projectPath = `/api/commands/projects/${input.context.project_id}`;
  if (owner.route.startsWith("work")) {
    const ref = object(
      payload[
        owner.route === "work/start-again"
          ? "expected_prior_work_unit_ref"
          : "expected_work_unit_ref"
      ],
    );
    requireBinding(
      ref.work_unit_id === input.target_id &&
        /^work_unit_[0-9A-HJKMNP-TV-Z]{26}$/u.test(input.target_id),
    );
    if (Object.hasOwn(workOperations, input.operation_id))
      requireBinding(
        payload.operation ===
          workOperations[input.operation_id as keyof typeof workOperations],
      );
    path = `${projectPath}/work/${input.target_id}${owner.route === "work" ? "" : owner.route === "work/resume" ? "/resume" : "/start-again"}`;
  } else if (owner.route === "suggested-actions") {
    requireBinding(
      object(payload.expected_action_ref).suggested_action_id ===
        input.target_id &&
        /^suggested_action_[0-9A-HJKMNP-TV-Z]{26}$/u.test(input.target_id),
    );
    path = `${projectPath}/suggested-actions/${input.target_id}/invoke`;
  } else {
    const expected = object(payload.expected),
      definition = object(expected.project_definition_ref),
      project = object(expected.project_ref);
    requireBinding(
      object(expected.project_source_ref).project_source_id ===
        input.target_id &&
        /^project_source_[0-9A-HJKMNP-TV-Z]{26}$/u.test(input.target_id) &&
        project.project_id === input.context.project_id &&
        project.revision === input.context.basis.project_revision &&
        definition.project_definition_id ===
          input.context.basis.definition.record_id &&
        definition.revision === input.context.basis.definition.revision &&
        definition.content_hash === input.context.basis.definition.content_hash,
    );
    path = `${projectPath}/sources/${input.target_id}/processing`;
  }
  const content = {
    key: `${input.operation_id}:${String(payload.command_id)}`,
    kind: "command" as const,
    operation_id: input.operation_id,
    project_id: input.context.project_id,
    context_hash: input.context.content_hash,
    contract: {
      name: entry.name,
      version: entry.version,
      hash: entry.canonical_sha256,
    },
    payload: structuredClone(payload),
    editable_paths: [],
  };
  return {
    preview: { ...content, preview_hash: copilotHash(content) },
    ordinary_command: {
      operation_id: input.operation_id,
      command_name: owner.command,
      method: "POST",
      path,
      requires_human_decision: true,
    },
  };
}
