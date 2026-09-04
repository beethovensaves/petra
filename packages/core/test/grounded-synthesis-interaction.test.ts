import { readFileSync } from "node:fs";

import type {
  PetraModelSynthesistOutput,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  GroundedSynthesisInteractionError,
  GroundedSynthesisInteractionExecutor,
  type GroundedSynthesisPlan,
  type GroundedSynthesisProgress,
  type SynthesistGatewayExecution,
  type SynthesistGatewayRequest,
} from "../src/index.js";

const readFixture = <Value>(name: string): Value =>
  JSON.parse(
    readFileSync(
      new URL(
        `../../contracts/fixtures/accepted/${name}.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as Value;

const gatewayRequest = (): SynthesistGatewayRequest => {
  const request = readFixture<PetraSynthesistModelRequest>(
    "model-request-synthesist",
  );
  const call = readFixture<PetraSynthesistModelCall>("model-call-synthesist");
  const certification = readFixture<PetraSynthesistRoleCertification>(
    "model-role-certification-synthesist",
  );
  return {
    project_id: request.content.project_id,
    workflow_id: request.content.workflow.workflow_id,
    objective: request.content.objective,
    impact_class: request.content.impact_class,
    context_packet_id: request.content.context_packet_ref.context_packet_id,
    evidence_packet_id: request.content.evidence_packet_ref.evidence_packet_id,
    egress_class: request.content.outbound_context.egress_class,
    visibility: request.content.outbound_context.visibility,
    data_classes: request.content.outbound_context.data_classes,
    rights_decision_ids: request.content.outbound_context.rights_decision_ids,
    selected_fields: request.content.outbound_context.selected_fields,
    redactions: request.content.outbound_context.redactions,
    capability_grant_id: request.content.outbound_context.capability_grant_id,
    purpose: request.content.outbound_context.purpose,
    prompt_profile: request.content.prompt_profile,
    base_messages: call.content.input.messages,
    parameters: {
      temperature: request.content.parameters.temperature,
      max_output_tokens: request.content.parameters.max_output_tokens,
    },
    budget: request.content.budget,
    estimated_input_tokens: 300,
    certification_scope: certification.scope,
    routing_policy: {
      routing_policy_id: request.content.routing_policy_ref.routing_policy_id,
      revision: 1,
      project_id: request.content.project_id,
      role: "synthesist",
      active: true,
      permitted_deployment_ids: [certification.deployment.model_deployment_id],
      max_egress_class: "E1",
      selection: "validated_cost_then_latency_then_identity",
      content_hash: request.content.routing_policy_ref.content_hash,
    },
    requested_by: certification.certified_by,
    requested_at: request.created_at,
  };
};

const plan = (): GroundedSynthesisPlan => ({
  hypothesis: {
    reference: "H12",
    descriptor: "The bounded study result generalizes beyond its reported task",
  },
  gateway_request: gatewayRequest(),
  snapshot_id: "snapshot_01ARZ3NDEKTSV4RRFFQ69G5FCE",
  retrieval: {
    route: "stable_identity",
    lexical_ms: 2,
    graph_ms: 3,
    total_ms: 5,
  },
  packet_compilation: { context_ms: 2, evidence_ms: 1, total_ms: 3 },
  projection_ms: 1,
});

const successfulExecution = (): SynthesistGatewayExecution => ({
  request: readFixture<PetraSynthesistModelRequest>("model-request-synthesist"),
  calls: [readFixture<PetraSynthesistModelCall>("model-call-synthesist")],
  output: readFixture<PetraModelSynthesistOutput>("model-synthesist-output"),
});

describe("GroundedSynthesisInteractionExecutor", () => {
  it("reports the inspectable run and renders only after gateway validation", async () => {
    const progress: GroundedSynthesisProgress[] = [];
    const planner = { plan: vi.fn(() => Promise.resolve(plan())) };
    const gateway = {
      execute: vi.fn(() => Promise.resolve(successfulExecution())),
    };
    const executor = new GroundedSynthesisInteractionExecutor(planner, gateway);

    const result = await executor.execute({
      prompt: "Does this result generalize?",
      onProgress: (item) => progress.push(item),
    });

    expect(progress.map(({ stage, status }) => `${stage}:${status}`)).toEqual([
      "retrieval:running",
      "retrieval:completed",
      "packet_compilation:completed",
      "model_execution:running",
      "model_execution:completed",
      "validation:completed",
    ]);
    expect(
      progress.every((item) => item.detail.authority_effect === "none"),
    ).toBe(true);
    expect(result).toMatchObject({
      model_request_id: "model_request_01ARZ3NDEKTSV4RRFFQ69G5FE4",
      model_call_id: "model_call_01ARZ3NDEKTSV4RRFFQ69G5FE5",
      trace: {
        retrieval_ms: 5,
        packet_compilation_ms: 3,
        model_ms: 4,
        validation_ms: 1,
        projection_ms: 1,
        total_ms: 13,
      },
      cost: { accounting: "computed" },
    });
    expect(result.rendered_text).toContain("H12 — The bounded study result");
    expect(
      result.rendered_text.match(
        /The bounded study result generalizes beyond its reported task/g,
      ),
    ).toHaveLength(1);
    expect(result.rendered_text).toContain("What the source reports");
    expect(result.rendered_text).toContain("Petra’s bounded synthesis");
    expect(result.rendered_text).toContain("What remains unresolved");
    expect(result.rendered_text).toContain("[Evidence 1, 2]");
  });

  it("does not render provider output when the gateway terminal is not completed", async () => {
    const execution = successfulExecution();
    const request = structuredClone(
      execution.request,
    ) as PetraSynthesistModelRequest;
    request.content.terminal = {
      state: "validation_failed",
      model_call_ids: ["model_call_01ARZ3NDEKTSV4RRFFQ69G5FE5"],
      validator_results: [
        {
          validator_name: "grounded-synthesis",
          validator_version: "1.0.0",
          outcome: "fail",
          code: "SYNTHESIS_EVIDENCE_REF_MISMATCH",
        },
      ],
      failure: {
        code: "SYNTHESIS_EVIDENCE_REF_MISMATCH",
        message: "The reference escaped the packet.",
        retryable: false,
      },
    };
    const executor = new GroundedSynthesisInteractionExecutor(
      { plan: () => Promise.resolve(plan()) },
      {
        execute: () =>
          Promise.resolve({
            request,
            calls: execution.calls,
          }),
      },
    );

    await expect(
      executor.execute({ prompt: "Explain it.", onProgress: () => undefined }),
    ).rejects.toMatchObject({
      code: "GROUNDED_SYNTHESIS_REJECTED",
      message: "The reference escaped the packet.",
    });
  });

  it("honors explicit cancellation before retrieval starts", async () => {
    const controller = new AbortController();
    controller.abort();
    const planner = { plan: vi.fn(() => Promise.resolve(plan())) };
    const executor = new GroundedSynthesisInteractionExecutor(planner, {
      execute: () => Promise.resolve(successfulExecution()),
    });

    await expect(
      executor.execute({
        prompt: "Explain it.",
        signal: controller.signal,
        onProgress: () => undefined,
      }),
    ).rejects.toBeInstanceOf(GroundedSynthesisInteractionError);
    expect(planner.plan).not.toHaveBeenCalled();
  });
});
