import type {
  PetraModelSynthesistOutput,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
} from "@petra/contracts";

import type { DeepReadonly } from "./context-packet-registry.js";
import type {
  SynthesistGatewayExecution,
  SynthesistGatewayRequest,
} from "./synthesist-gateway.js";

export type GroundedSynthesisStage =
  "retrieval" | "packet_compilation" | "model_execution" | "validation";

export interface GroundedSynthesisProgress {
  readonly stage: GroundedSynthesisStage;
  readonly status: "running" | "completed";
  readonly label: string;
  readonly detail: {
    readonly route?: string;
    readonly context_packet_id?: string;
    readonly evidence_packet_id?: string;
    readonly snapshot_id?: string;
    readonly model_request_id?: string;
    readonly model_call_id?: string;
    readonly model_deployment_id?: string;
    readonly role_certification_id?: string;
    readonly terminal_state?: PetraSynthesistModelRequest["content"]["terminal"]["state"];
    readonly elapsed_ms?: number;
    readonly authority_effect: "none";
  };
}

export interface GroundedSynthesisPlan {
  readonly hypothesis: {
    readonly reference: string;
    readonly descriptor: string;
  };
  readonly gateway_request: SynthesistGatewayRequest;
  readonly snapshot_id: string;
  readonly retrieval: {
    readonly route: string;
    readonly lexical_ms: number;
    readonly graph_ms: number;
    readonly total_ms: number;
  };
  readonly packet_compilation: {
    readonly context_ms: number;
    readonly evidence_ms: number;
    readonly total_ms: number;
  };
  readonly projection_ms: number;
}

export interface GroundedSynthesisPlanner {
  readonly plan: (request: {
    readonly prompt: string;
    readonly signal?: AbortSignal;
  }) => Promise<GroundedSynthesisPlan>;
}

export interface GroundedSynthesisGatewayPort {
  readonly execute: (
    input: SynthesistGatewayRequest,
  ) => Promise<SynthesistGatewayExecution>;
}

export interface GroundedSynthesisInteractionRequest {
  readonly prompt: string;
  readonly signal?: AbortSignal;
  readonly onProgress: (progress: GroundedSynthesisProgress) => void;
}

export interface GroundedSynthesisInteractionResult {
  readonly hypothesis: GroundedSynthesisPlan["hypothesis"];
  readonly rendered_text: string;
  readonly output: DeepReadonly<PetraModelSynthesistOutput>;
  readonly context_packet_ref: {
    readonly context_packet_id: string;
    readonly content_hash: string;
  };
  readonly evidence_packet_ref: {
    readonly evidence_packet_id: string;
    readonly content_hash: string;
  };
  readonly snapshot_id: string;
  readonly model_request_id: string;
  readonly model_call_id: string;
  readonly model_deployment_id: string;
  readonly role_certification_id: string;
  readonly output_hash: string;
  readonly trace: {
    readonly retrieval_ms: number;
    readonly lexical_ms: number;
    readonly graph_ms: number;
    readonly context_compilation_ms: number;
    readonly evidence_compilation_ms: number;
    readonly packet_compilation_ms: number;
    readonly model_ms: number;
    readonly validation_ms: number;
    readonly projection_ms: number;
    readonly total_ms: number;
  };
  readonly cost: PetraSynthesistModelCall["content"]["cost"];
}

export interface GroundedSynthesisInteractionExecutorPort {
  readonly execute: (
    request: GroundedSynthesisInteractionRequest,
  ) => Promise<GroundedSynthesisInteractionResult>;
}

export type GroundedSynthesisInteractionErrorCode =
  | "GROUNDED_SYNTHESIS_CANCELLED"
  | "GROUNDED_SYNTHESIS_NO_CALL"
  | "GROUNDED_SYNTHESIS_REJECTED";

export class GroundedSynthesisInteractionError extends Error {
  readonly code: GroundedSynthesisInteractionErrorCode;

  constructor(code: GroundedSynthesisInteractionErrorCode, message: string) {
    super(message);
    this.name = "GroundedSynthesisInteractionError";
    this.code = code;
  }
}

const assertNotCancelled = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted !== true) return;
  throw new GroundedSynthesisInteractionError(
    "GROUNDED_SYNTHESIS_CANCELLED",
    "The grounded synthesis was cancelled by an explicit Petra command.",
  );
};

const evidenceLabel = (
  statement: PetraModelSynthesistOutput["statements"][number],
): string => {
  const orders = [
    ...new Set(
      statement.evidence_refs.map(
        (reference) => reference.context_selection_order,
      ),
    ),
  ].sort((left, right) => left - right);
  return orders.length === 0
    ? ""
    : ` [Evidence ${orders.map(String).join(", ")}]`;
};

const originHeading = (
  origin: PetraModelSynthesistOutput["statements"][number]["origin"],
): string =>
  ({
    source_report: "What the source reports",
    petra_synthesis: "Petra’s bounded synthesis",
    unresolved_inference: "What remains unresolved",
  })[origin];

export const renderGroundedSynthesisForInteraction = (
  hypothesis: GroundedSynthesisPlan["hypothesis"],
  output: PetraModelSynthesistOutput,
): string => {
  const lines = [`${hypothesis.reference} — ${hypothesis.descriptor}`];
  for (const statement of output.statements) {
    lines.push(
      "",
      originHeading(statement.origin),
      `${statement.text}${evidenceLabel(statement)}`,
    );
    if (statement.limitations.length > 0) {
      lines.push(`Limits: ${statement.limitations.join(" ")}`);
    }
    if (statement.origin === "unresolved_inference") {
      lines.push(`To resolve it: ${statement.resolution_requirement}`);
    }
  }
  lines.push(
    "",
    "Evidence boundary",
    `${output.coverage.statement} Coverage: ${output.coverage.state}.`,
  );
  return lines.join("\n");
};

export class GroundedSynthesisInteractionExecutor implements GroundedSynthesisInteractionExecutorPort {
  readonly #planner: GroundedSynthesisPlanner;
  readonly #gateway: GroundedSynthesisGatewayPort;

  constructor(
    planner: GroundedSynthesisPlanner,
    gateway: GroundedSynthesisGatewayPort,
  ) {
    this.#planner = planner;
    this.#gateway = gateway;
  }

  async execute(
    request: GroundedSynthesisInteractionRequest,
  ): Promise<GroundedSynthesisInteractionResult> {
    assertNotCancelled(request.signal);
    request.onProgress({
      stage: "retrieval",
      status: "running",
      label: "Finding a bounded evidence path",
      detail: { authority_effect: "none" },
    });
    const plan = await this.#planner.plan({
      prompt: request.prompt,
      ...(request.signal === undefined ? {} : { signal: request.signal }),
    });
    assertNotCancelled(request.signal);
    request.onProgress({
      stage: "retrieval",
      status: "completed",
      label: "Bounded evidence path selected",
      detail: {
        route: plan.retrieval.route,
        elapsed_ms: plan.retrieval.total_ms,
        authority_effect: "none",
      },
    });
    request.onProgress({
      stage: "packet_compilation",
      status: "completed",
      label: "Immutable evidence packet ready",
      detail: {
        context_packet_id: plan.gateway_request.context_packet_id,
        evidence_packet_id: plan.gateway_request.evidence_packet_id,
        snapshot_id: plan.snapshot_id,
        elapsed_ms: plan.packet_compilation.total_ms,
        authority_effect: "none",
      },
    });
    request.onProgress({
      stage: "model_execution",
      status: "running",
      label: "Running the certified synthesist",
      detail: { authority_effect: "none" },
    });
    const execution = await this.#gateway.execute(plan.gateway_request);
    const call = execution.calls.at(-1);
    const selected = execution.request.content.routing.selected;
    request.onProgress({
      stage: "model_execution",
      status: "completed",
      label: "Certified synthesist call completed",
      detail: {
        model_request_id: execution.request.model_request_id,
        ...(call === undefined ? {} : { model_call_id: call.model_call_id }),
        ...(selected === undefined
          ? {}
          : {
              model_deployment_id: selected.model_deployment_id,
              role_certification_id: selected.role_certification_id,
            }),
        terminal_state: execution.request.content.terminal.state,
        elapsed_ms: call?.content.timing.total_ms ?? 0,
        authority_effect: "none",
      },
    });
    assertNotCancelled(request.signal);
    if (
      execution.output === undefined ||
      call === undefined ||
      selected === undefined ||
      execution.request.content.terminal.state !== "completed" ||
      call.content.outcome !== "success"
    ) {
      const terminal = execution.request.content.terminal;
      const failure = "failure" in terminal ? terminal.failure : undefined;
      throw new GroundedSynthesisInteractionError(
        call === undefined
          ? "GROUNDED_SYNTHESIS_NO_CALL"
          : "GROUNDED_SYNTHESIS_REJECTED",
        failure?.message ??
          "The grounded synthesis did not produce a validated response.",
      );
    }
    request.onProgress({
      stage: "validation",
      status: "completed",
      label: "Evidence references and epistemic origins validated",
      detail: {
        model_request_id: execution.request.model_request_id,
        model_call_id: call.model_call_id,
        model_deployment_id: selected.model_deployment_id,
        role_certification_id: selected.role_certification_id,
        terminal_state: execution.request.content.terminal.state,
        elapsed_ms: call.content.timing.validation_ms,
        authority_effect: "none",
      },
    });
    const outputHash = execution.request.content.terminal.output_hash;
    if (outputHash === undefined) {
      throw new GroundedSynthesisInteractionError(
        "GROUNDED_SYNTHESIS_REJECTED",
        "The validated synthesis has no recorded output hash.",
      );
    }
    const trace = {
      retrieval_ms: plan.retrieval.total_ms,
      lexical_ms: plan.retrieval.lexical_ms,
      graph_ms: plan.retrieval.graph_ms,
      context_compilation_ms: plan.packet_compilation.context_ms,
      evidence_compilation_ms: plan.packet_compilation.evidence_ms,
      packet_compilation_ms: plan.packet_compilation.total_ms,
      model_ms: call.content.timing.total_ms,
      validation_ms: call.content.timing.validation_ms,
      projection_ms: plan.projection_ms,
      total_ms:
        plan.retrieval.total_ms +
        plan.packet_compilation.total_ms +
        call.content.timing.total_ms +
        plan.projection_ms,
    };
    return {
      hypothesis: structuredClone(plan.hypothesis),
      rendered_text: renderGroundedSynthesisForInteraction(
        plan.hypothesis,
        execution.output as PetraModelSynthesistOutput,
      ),
      output: execution.output,
      context_packet_ref: structuredClone(
        execution.request.content.context_packet_ref,
      ),
      evidence_packet_ref: structuredClone(
        execution.request.content.evidence_packet_ref,
      ),
      snapshot_id: plan.snapshot_id,
      model_request_id: execution.request.model_request_id,
      model_call_id: call.model_call_id,
      model_deployment_id: selected.model_deployment_id,
      role_certification_id: selected.role_certification_id,
      output_hash: outputHash,
      trace,
      cost: structuredClone(call.content.cost),
    };
  }
}
