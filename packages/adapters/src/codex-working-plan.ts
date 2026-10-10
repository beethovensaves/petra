import { canonicalize } from "json-canonicalize";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CopilotBoundaryError,
  copilotHash,
  WORKING_PLAN_PROFILE,
  validateWorkingPlanInput,
  validateWorkingPlan,
  type WorkingPlanInput,
  type WorkingPlanModelPort,
} from "@petra/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CodexProviderEvent,
  CodexSubscriptionProviderPort,
} from "./codex-app-server.js";
import { projectExtractorOutputSchemaForProvider } from "./model-adapter-common.js";
const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const forbiddenItems = new Set([
  "commandExecution",
  "fileChange",
  "mcpToolCall",
  "dynamicToolCall",
  "collabToolCall",
  "collabAgentToolCall",
  "webSearch",
  "imageView",
  "imageGeneration",
]);
export const workingPlanOutputSchemaForProvider = (
  schema: Readonly<Record<string, unknown>>,
): Record<string, unknown> =>
  projectExtractorOutputSchemaForProvider(
    { ...structuredClone(schema), $defs: {} },
    { $defs: {} },
    {
      strictObjectProperties: true,
      commonDefinitionNames: [],
      arrayItemLimit: 24,
      requiredRootProperties: [
        "schema_name",
        "schema_version",
        "authority",
        "explanation",
        "proposals",
      ],
    },
  );
export const workingPlanCertificationBasis = () => {
  const entry = new PetraContractRegistry().entries.find(
    (entry) =>
      entry.name === "copilot-working-plan" && entry.version === "1.0.0",
  );
  if (entry === undefined)
    throw new Error("The working-plan contract is unregistered.");
  return {
    role: "petra.copilot-working-plan@1.0.0" as const,
    profile_hash: copilotHash(WORKING_PLAN_PROFILE),
    output_schema_hash: entry.canonical_sha256,
  };
};
export interface WorkingPlanRoleCertification {
  role: "petra.copilot-working-plan@1.0.0";
  profile_hash: string;
  output_schema_hash: string;
  provider_model: string;
  status: "passed";
  evaluation_artifact: string;
  evaluation_artifact_hash: string;
  runtime: {
    codex_version: string;
    adapter_hash: string;
    provider_adapter_hash: string;
    core_hash: string;
  };
}
type AdvisoryInvocation = {
  signal: AbortSignal;
  profile: Pick<
    typeof WORKING_PLAN_PROFILE,
    "instructions" | "timeout_ms" | "max_output_bytes"
  >;
  payload: unknown;
};
/** Isolated managed proposal role; it has no command, approval or persistence port. */
export class CodexWorkingPlanAdapter implements WorkingPlanModelPort {
  constructor(
    readonly options: {
      provider: CodexSubscriptionProviderPort;
      workspaceRoot: string;
      outputSchema: Readonly<Record<string, unknown>>;
      certification?: WorkingPlanRoleCertification;
      evaluationDeployment?: string;
    },
  ) {
    if (options.certification === undefined) {
      if (options.evaluationDeployment?.trim()) return;
      throw new CopilotBoundaryError(
        "ROLE_INELIGIBLE",
        "The working-structure role requires its own certification.",
      );
    }
    if (options.evaluationDeployment !== undefined)
      throw new Error(
        "Evaluation and eligible deployment modes cannot be combined.",
      );
    const basis = workingPlanCertificationBasis();
    for (const key of Object.keys(basis) as (keyof typeof basis)[])
      if (options.certification[key] !== basis[key])
        throw new CopilotBoundaryError(
          "ROLE_CERTIFICATION_STALE",
          "The working-structure role certification does not match its exact instructions and output contract.",
        );
    if (
      options.certification.status !== "passed" ||
      options.certification.provider_model.trim() === ""
    )
      throw new CopilotBoundaryError(
        "ROLE_INELIGIBLE",
        "The working-structure role has no eligible deployment.",
      );
  }
  async invokeWorkingPlan(
    input: WorkingPlanInput & { signal: AbortSignal },
  ): ReturnType<WorkingPlanModelPort["invokeWorkingPlan"]> {
    validateWorkingPlanInput(input);
    const response = await this.#invokeAdvisory({
      signal: input.signal,
      profile: WORKING_PLAN_PROFILE,
      payload: {
        project_id: input.project_id,
        context: input.context,
        question: input.question,
        previews: input.previews,
      },
    });
    validateWorkingPlan(response.output, input);
    return response;
  }
  async #invokeAdvisory(
    input: AdvisoryInvocation,
  ): ReturnType<WorkingPlanModelPort["invokeWorkingPlan"]> {
    const directory = await mkdtemp(join(tmpdir(), "petra-copilot-"));
    try {
      return await this.#invokeIsolated(input, await realpath(directory));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async #invokeIsolated(
    input: AdvisoryInvocation,
    isolatedCwd: string,
  ): ReturnType<WorkingPlanModelPort["invokeWorkingPlan"]> {
    const provider = this.options.provider;
    const timeout = AbortSignal.timeout(input.profile.timeout_ms);
    const signal = AbortSignal.any([input.signal, timeout]);
    const assertActive = (): void => {
      if (signal.aborted)
        throw new CopilotBoundaryError(
          input.signal.aborted ? "CANCELLED" : "MODEL_TIMEOUT",
          input.signal.aborted
            ? "The answer was cancelled."
            : "The model did not answer within the registered time budget.",
        );
    };
    assertActive();
    const account = await provider.readAccount();
    assertActive();
    if (!account.authenticated || account.authMode !== "chatgpt") {
      throw new CopilotBoundaryError(
        "MODEL_LOGIN_REQUIRED",
        "Sign in to the registered managed model provider before asking Petra.",
      );
    }
    const deployment =
      this.options.certification?.provider_model ??
      this.options.evaluationDeployment!;
    const models = await provider.listModels();
    assertActive();
    if (!models.some((model) => model.model === deployment)) {
      throw new CopilotBoundaryError(
        "MODEL_UNAVAILABLE",
        "The certified copilot model is unavailable. Petra will not substitute another model.",
      );
    }
    const thread = await provider.startThread({
      model: deployment,
      cwd: isolatedCwd,
      approvalPolicy: "never",
      sandbox: "read-only",
      personality: "pragmatic",
      baseInstructions: input.profile.instructions,
      ephemeral: true,
      advisoryOnly: true,
    });
    assertActive();
    if (
      thread.cwd !== isolatedCwd ||
      thread.advisoryIsolation !== "petra.codex-no-tools@1.0.0"
    ) {
      throw new CopilotBoundaryError(
        "TOOL_POLICY_UNAVAILABLE",
        "The provider did not establish the copilot's isolated tool policy.",
      );
    }
    if (thread.model !== deployment)
      throw new CopilotBoundaryError(
        "MODEL_SUBSTITUTED",
        "The provider selected a model outside the registered deployment.",
      );
    let turnId: string | undefined;
    const texts = new Map<string, string>();
    const completions = new Map<string, Record<string, unknown>>();
    let resolveObservation: (() => void) | undefined;
    let rejectObservation: ((error: Error) => void) | undefined;
    const observation = new Promise<void>((resolve, reject) => {
      resolveObservation = resolve;
      rejectObservation = reject;
    });
    // Rejections can arrive while startTurn is still returning its identity.
    void observation.catch(() => undefined);
    const onAbort = (): void => {
      rejectObservation?.(
        new CopilotBoundaryError(
          input.signal.aborted ? "CANCELLED" : "MODEL_TIMEOUT",
          input.signal.aborted
            ? "The answer was cancelled."
            : "The model time budget was exceeded.",
        ),
      );
    };
    signal.addEventListener("abort", onAbort, { once: true });
    const unsubscribe = provider.onEvent((event: CodexProviderEvent) => {
      if (event.kind === "protocol_error") {
        rejectObservation?.(new Error("The model provider protocol failed."));
        return;
      }
      if (!("params" in event)) return;
      const params = record(event.params);
      if (params.threadId !== thread.threadId) return;
      const eventTurn =
        typeof params.turnId === "string"
          ? params.turnId
          : typeof record(params.turn).id === "string"
            ? String(record(params.turn).id)
            : undefined;
      if (
        turnId !== undefined &&
        eventTurn !== undefined &&
        eventTurn !== turnId
      )
        return;
      if (event.kind === "server_request") {
        void provider
          .resolveApproval(event.requestId, "decline")
          .catch(() => undefined);
        rejectObservation?.(
          new CopilotBoundaryError(
            "TOOL_ACTIVITY",
            "The advisory model requested an unregistered tool action.",
          ),
        );
        return;
      }
      if (event.kind !== "notification") return;
      const item = record(params.item);
      if (forbiddenItems.has(String(item.type))) {
        rejectObservation?.(
          new CopilotBoundaryError(
            "TOOL_ACTIVITY",
            "The advisory model attempted an unregistered tool action.",
          ),
        );
        return;
      }
      if (event.method === "model/rerouted") {
        rejectObservation?.(
          new CopilotBoundaryError(
            "MODEL_SUBSTITUTED",
            "The provider rerouted the registered model.",
          ),
        );
        return;
      }
      if (
        event.method === "item/completed" &&
        item.type === "agentMessage" &&
        (item.phase === undefined || item.phase === "final_answer") &&
        typeof item.text === "string" &&
        eventTurn !== undefined
      ) {
        if (
          Buffer.byteLength(item.text, "utf8") > input.profile.max_output_bytes
        ) {
          rejectObservation?.(
            new CopilotBoundaryError(
              "OUTPUT_LIMIT",
              "The model output exceeds its registered budget.",
            ),
          );
          return;
        }
        texts.set(eventTurn, item.text);
      }
      if (event.method === "turn/completed" && eventTurn !== undefined) {
        completions.set(eventTurn, record(params.turn));
        if (eventTurn === turnId) resolveObservation?.();
      }
    });
    try {
      const started = await provider.startTurn({
        threadId: thread.threadId,
        model: deployment,
        effort: "low",
        outputSchema: workingPlanOutputSchemaForProvider(
          this.options.outputSchema,
        ),
        prompt: canonicalize(input.payload),
      });
      turnId = started.turnId;
      assertActive();
      if (completions.has(turnId)) resolveObservation?.();
      await observation;
      assertActive();
      const completion = completions.get(turnId);
      const text = texts.get(turnId);
      if (completion?.status !== "completed" || text === undefined)
        throw new CopilotBoundaryError(
          "MODEL_DELIVERY_FAILED",
          "The provider did not deliver a completed structured answer.",
        );
      let output: unknown;
      try {
        output = JSON.parse(text);
      } catch {
        throw new CopilotBoundaryError(
          "INVALID_MODEL_OUTPUT",
          "The model did not return the registered answer format.",
        );
      }
      return {
        output,
        model: deployment,
        provider_thread_id: thread.threadId,
        provider_turn_id: turnId,
      };
    } catch (error) {
      if (turnId !== undefined)
        await provider
          .interruptTurn(thread.threadId, turnId)
          .catch(() => undefined);
      throw error;
    } finally {
      unsubscribe();
      signal.removeEventListener("abort", onAbort);
    }
  }
}
