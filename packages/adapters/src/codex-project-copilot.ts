import { canonicalize } from "json-canonicalize";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COPILOT_PROFILE,
  INTAKE_COPILOT_PROFILE,
  intakeCopilotModelPayload,
  type IntakeCopilotModelInput,
  type IntakeCopilotModelPort,
  CopilotBoundaryError,
  copilotHash,
  copilotModelPayload,
  type CopilotModelPort,
} from "@petra/core";
import { PetraContractRegistry } from "@petra/contracts/validator";
import type {
  CodexProviderEvent,
  CodexSubscriptionProviderPort,
} from "./codex-app-server.js";
import { projectExtractorOutputSchemaForProvider } from "./model-adapter-common.js";

export const projectCopilotOutputSchemaForProvider = (
  schema: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
  const structural = structuredClone(schema) as Record<string, unknown>;
  structural.$defs = {};
  const properties = record(structural.properties);
  const item = record(record(properties.blocks).items);
  delete item.allOf;
  return projectExtractorOutputSchemaForProvider(
    structural,
    { $defs: {} },
    {
      strictObjectProperties: true,
      commonDefinitionNames: [],
      arrayItemLimit: 24,
      requiredRootProperties: [
        "schema_name",
        "schema_version",
        "authority",
        "blocks",
        "focus_keys",
      ],
    },
  );
};

export interface CopilotRoleCertification {
  role: "petra.project-copilot@1.0.0";
  profile_hash: string;
  context_schema_hash: string;
  intake_profile_hash?: string;
  intake_context_schema_hash?: string;
  output_schema_hash: string;
  provider_model: string;
  evaluated_at: string;
  evaluation_artifact: string;
  evaluation_artifact_hash: string;
  status: "passed";
  runtime: {
    codex_version: string;
    adapter_hash: string;
    provider_adapter_hash: string;
    copilot_core_hash: string;
    intake_core_hash?: string;
  };
}

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

export const copilotCertificationBasis = (): Pick<
  CopilotRoleCertification,
  "role" | "profile_hash" | "context_schema_hash" | "output_schema_hash"
> => {
  const contracts = new PetraContractRegistry();
  const digest = (name: string): string => {
    const entry = contracts.entries.find(
      (entry) => entry.name === name && entry.version === "1.0.0",
    );
    if (entry === undefined)
      throw new Error(`The copilot ${name} contract is unregistered.`);
    return entry.canonical_sha256;
  };
  return {
    role: "petra.project-copilot@1.0.0",
    profile_hash: copilotHash(COPILOT_PROFILE),
    context_schema_hash: digest("copilot-context"),
    output_schema_hash: digest("copilot-output"),
  };
};

export const intakeCopilotCertificationBasis = (): {
  intake_profile_hash: string;
  intake_context_schema_hash: string;
} => {
  const entry = new PetraContractRegistry().entries.find(
    (entry) =>
      entry.name === "intake-copilot-context" && entry.version === "1.0.0",
  );
  if (entry === undefined)
    throw new Error("The intake role context is unregistered.");
  return {
    intake_profile_hash: copilotHash(INTAKE_COPILOT_PROFILE),
    intake_context_schema_hash: entry.canonical_sha256,
  };
};
type AdvisoryInvocation = {
  signal: AbortSignal;
  profile: Pick<
    typeof COPILOT_PROFILE,
    "instructions" | "timeout_ms" | "max_output_bytes"
  >;
  payload: unknown;
};

/** Uses the managed provider with an explicitly eligible, no-tool advisory role. */
export class CodexProjectCopilotAdapter
  implements CopilotModelPort, IntakeCopilotModelPort
{
  constructor(
    readonly options: {
      provider: CodexSubscriptionProviderPort;
      workspaceRoot: string;
      outputSchema: Readonly<Record<string, unknown>>;
      certification?: CopilotRoleCertification;
      evaluationDeployment?: string;
    },
  ) {
    if (options.certification === undefined) {
      if (options.evaluationDeployment?.trim()) return;
      throw new CopilotBoundaryError(
        "ROLE_INELIGIBLE",
        "The copilot role requires a certification or an explicit evaluation deployment.",
      );
    }
    if (options.evaluationDeployment !== undefined)
      throw new Error(
        "Evaluation and eligible deployment modes cannot be combined.",
      );
    const basis = copilotCertificationBasis();
    for (const key of Object.keys(basis) as (keyof typeof basis)[]) {
      if (options.certification[key] !== basis[key]) {
        throw new CopilotBoundaryError(
          "ROLE_CERTIFICATION_STALE",
          "The copilot certification does not match its registered contracts and instructions.",
        );
      }
    }
    if (
      options.certification.status !== "passed" ||
      options.certification.provider_model.trim() === ""
    ) {
      throw new CopilotBoundaryError(
        "ROLE_INELIGIBLE",
        "The copilot role has no eligible model deployment.",
      );
    }
  }

  async invoke(
    input: Parameters<CopilotModelPort["invoke"]>[0],
  ): ReturnType<CopilotModelPort["invoke"]> {
    return this.#invokeAdvisory({
      signal: input.signal,
      profile: COPILOT_PROFILE,
      payload: copilotModelPayload(input),
    });
  }

  invokeIntake(
    input: IntakeCopilotModelInput,
  ): ReturnType<IntakeCopilotModelPort["invokeIntake"]> {
    if (this.options.certification !== undefined) {
      const basis = intakeCopilotCertificationBasis();
      if (
        this.options.certification.intake_profile_hash !==
          basis.intake_profile_hash ||
        this.options.certification.intake_context_schema_hash !==
          basis.intake_context_schema_hash
      )
        throw new CopilotBoundaryError(
          "INTAKE_ROLE_INELIGIBLE",
          "Pre-Project intake requires its own exact role and context eligibility proof.",
        );
    }
    return this.#invokeAdvisory({
      signal: input.signal,
      profile: INTAKE_COPILOT_PROFILE,
      payload: intakeCopilotModelPayload(input),
    });
  }

  async #invokeAdvisory(
    input: AdvisoryInvocation,
  ): ReturnType<CopilotModelPort["invoke"]> {
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
  ): ReturnType<CopilotModelPort["invoke"]> {
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
        outputSchema: projectCopilotOutputSchemaForProvider(
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
