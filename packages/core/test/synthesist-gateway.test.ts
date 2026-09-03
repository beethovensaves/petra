import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraContextPacket,
  PetraDomainEvent,
  PetraEvidencePacket,
  PetraModelSynthesistOutput,
  PetraSourceSpan,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";
import { describe, expect, it, vi } from "vitest";

import {
  buildSynthesistPromptMessages,
  InMemoryContextPacketRegistry,
  type PacketRecord,
  SynthesistGateway,
  type SynthesistGatewayRequest,
  type SynthesistModelAdapter,
  type SynthesistModelDeployment,
  synthesistCertificationHash,
  synthesistRoutingPolicyHash,
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

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const packetRecords = (): PacketRecord[] => {
  const event = readFixture<PetraDomainEvent>(
    "domain-event-change-set-applied",
  );
  if (event.event.event_type !== "change_set.applied") {
    throw new Error("Expected applied event fixture.");
  }
  return [
    event.event.payload.claim,
    event.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ];
};

const setupPackets = () => {
  const packets = new InMemoryContextPacketRegistry();
  const context = readFixture<PetraContextPacket>("context-packet");
  const evidence = readFixture<PetraEvidencePacket>("evidence-packet");
  packets.registerContextPacket(context, packetRecords());
  packets.registerEvidencePacket(evidence);
  return { packets, context, evidence };
};

const certifiedDeployment = (): {
  deployment: SynthesistModelDeployment;
  certification: PetraSynthesistRoleCertification;
} => {
  const fixture = readFixture<PetraSynthesistRoleCertification>(
    "model-role-certification-synthesist",
  );
  const certification: PetraSynthesistRoleCertification = {
    ...fixture,
    content_hash: synthesistCertificationHash({
      deployment: fixture.deployment,
      role_profile: fixture.role_profile,
      scope: fixture.scope,
      evaluation: fixture.evaluation,
      decision: fixture.decision,
    }),
  };
  return {
    certification,
    deployment: {
      deployment: fixture.deployment,
      adapter_id: "fixture-synthesist",
      active: true,
      health: "healthy",
      provider_policy_verified: true,
      accepted_egress_classes: ["E0"],
      accepted_data_classes: [
        "open_full_text",
        "source_spans",
        "trusted_scientific_records",
      ],
      expected_validated_cost_usd: "0",
      expected_latency_ms: 5,
      endpoint_fingerprint:
        "sha256:abababababababababababababababababababababababababababababababab",
    },
  };
};

const successfulResponse = (output: unknown) => ({
  outcome: "success" as const,
  provider_request_id: "fixture-synthesis-1",
  observed_revision: "fixture-v1",
  output,
  timing: { queue_ms: 0, first_token_ms: 2, total_ms: 4, validation_ms: 1 },
  usage: {
    accounting: "unavailable" as const,
    input_tokens: 0,
    output_tokens: 0,
  },
  cost: {
    amount: "0",
    currency: "USD" as const,
    accounting: "unavailable" as const,
    pricing_source:
      "The ChatGPT subscription transport does not expose per-call cost.",
  },
});

const buildRequest = (
  packets: InMemoryContextPacketRegistry,
  context: PetraContextPacket,
  evidence: PetraEvidencePacket,
  deployment: SynthesistModelDeployment,
): SynthesistGatewayRequest => {
  const baseMessages = [
    {
      role: "system" as const,
      content:
        "Synthesize only from the immutable EvidencePacket and preserve epistemic boundaries.",
    },
    {
      role: "user" as const,
      content: "Explain the selected report and its recorded limits.",
    },
  ] as const;
  const objective =
    "Explain the selected study report while preserving its evidence boundary.";
  const messages = buildSynthesistPromptMessages(
    { objective, base_messages: baseMessages },
    packets,
    context.context_packet_id,
    evidence.evidence_packet_id,
  );
  const policyWithoutHash = {
    routing_policy_id: "routing_policy_01ARZ3NDEKTSV4RRFFQ69G5FE6",
    revision: 1 as const,
    project_id: context.project_id,
    role: "synthesist" as const,
    active: true,
    permitted_deployment_ids: [deployment.deployment.model_deployment_id],
    max_egress_class: "E0" as const,
    selection: "validated_cost_then_latency_then_identity" as const,
  };
  return {
    project_id: context.project_id,
    workflow_id: "synthesis_run_01ARZ3NDEKTSV4RRFFQ69G5FE7",
    objective,
    impact_class: "routine",
    context_packet_id: context.context_packet_id,
    evidence_packet_id: evidence.evidence_packet_id,
    egress_class: "E0",
    visibility: "private",
    data_classes: [
      "open_full_text",
      "source_spans",
      "trusted_scientific_records",
    ],
    rights_decision_ids: ["rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FB3"],
    selected_fields: [
      "canonical_text",
      "predicate",
      "exact_text",
      "limitations",
    ],
    redactions: [],
    capability_grant_id: "grant_01ARZ3NDEKTSV4RRFFQ69G5FE8",
    purpose: "Bounded scientific synthesis from an immutable EvidencePacket.",
    prompt_profile: {
      name: "petra-grounded-synthesist",
      version: "1.0.0",
      content_hash: canonicalHash(messages),
    },
    base_messages: baseMessages,
    parameters: { temperature: 0, max_output_tokens: 1600 },
    budget: {
      max_attempts: 1,
      max_input_tokens: 3000,
      max_output_tokens: 1600,
      max_latency_ms: 5000,
      max_cost_usd: "0",
    },
    estimated_input_tokens: 1000,
    certification_scope: {
      domain: "cross-domain scientific synthesis",
      language: "en",
      modality: "text",
      document_class: "scholarly",
    },
    routing_policy: {
      ...policyWithoutHash,
      content_hash: synthesistRoutingPolicyHash(policyWithoutHash),
    },
    requested_by: {
      actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
      actor_kind: "service",
    },
    requested_at: "2026-09-03T18:31:00.000Z",
  };
};

describe("SynthesistGateway", () => {
  it("routes exact packets through an independently certified synthesist and records the result", async () => {
    const { packets, context, evidence } = setupPackets();
    const { deployment, certification } = certifiedDeployment();
    const output = readFixture<PetraModelSynthesistOutput>(
      "model-synthesist-output",
    );
    const invoke = vi.fn(() => Promise.resolve(successfulResponse(output)));
    const adapter: SynthesistModelAdapter = { invoke };
    const gateway = new SynthesistGateway(packets);
    gateway.registerDeployment(deployment, adapter);
    gateway.registerCertification(certification);
    const request = buildRequest(packets, context, evidence, deployment);

    const result = await gateway.execute(request);

    expect(result.request.schema_version).toBe("1.1.0");
    expect(result.request.content.terminal.state).toBe("completed");
    expect(result.request.content.routing.selected).toMatchObject({
      model_deployment_id: deployment.deployment.model_deployment_id,
      role_certification_id: certification.role_certification_id,
    });
    expect(result.calls).toHaveLength(1);
    expect(result.calls[0]?.content).toMatchObject({
      outcome: "success",
      input: {
        context_packet_ref: {
          context_packet_id: context.context_packet_id,
          content_hash: context.content_hash,
        },
        evidence_packet_ref: {
          evidence_packet_id: evidence.evidence_packet_id,
          content_hash: evidence.content_hash,
        },
      },
      usage: { accounting: "unavailable" },
      cost: { accounting: "unavailable" },
    });
    expect(result.calls[0]?.content.input.context_selections).toHaveLength(3);
    expect(result.calls[0]?.content.input.messages.at(-1)?.content).toContain(
      "Petra packet controls",
    );
    expect(result.output).toEqual(output);
    expect(Object.isFrozen(result.request)).toBe(true);
    expect(Object.isFrozen(result.calls[0])).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);

    const replay = await gateway.execute(request);
    expect(replay.request).toBe(result.request);
    expect(replay.output).toBe(result.output);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("withholds a well-formed response whose evidence references escape the packet", async () => {
    const { packets, context, evidence } = setupPackets();
    const { deployment, certification } = certifiedDeployment();
    const output = readFixture<PetraModelSynthesistOutput>(
      "model-synthesist-output",
    );
    const first = output.statements[0];
    if (first === undefined) throw new Error("Expected a synthesis statement.");
    const firstReference = first.evidence_refs[0];
    if (firstReference === undefined) throw new Error("Expected evidence.");
    firstReference.object_id = "assertion_01ARZ3NDEKTSV4RRFFQ69G5FD0";
    const gateway = new SynthesistGateway(packets);
    gateway.registerDeployment(deployment, {
      invoke: () => Promise.resolve(successfulResponse(output)),
    });
    gateway.registerCertification(certification);

    const result = await gateway.execute(
      buildRequest(packets, context, evidence, deployment),
    );

    expect(result.request.content.terminal.state).toBe("validation_failed");
    expect(result.calls[0]?.content.outcome).toBe("validation_failed");
    expect(result.calls[0]?.content.validation[0]?.code).toBe(
      "SYNTHESIS_EVIDENCE_REF_MISMATCH",
    );
    expect(result.calls[0]?.content.raw_output).toEqual(output);
    expect(result.calls[0]?.content).not.toHaveProperty("output");
    expect(result).not.toHaveProperty("output");
  });

  it("blocks before invocation when no exact active synthesist certification exists", async () => {
    const { packets, context, evidence } = setupPackets();
    const { deployment } = certifiedDeployment();
    const invoke = vi.fn(() =>
      Promise.resolve(
        successfulResponse(
          readFixture<PetraModelSynthesistOutput>("model-synthesist-output"),
        ),
      ),
    );
    const gateway = new SynthesistGateway(packets);
    gateway.registerDeployment(deployment, { invoke });

    const result = await gateway.execute(
      buildRequest(packets, context, evidence, deployment),
    );

    expect(result.request.content.terminal.state).toBe("blocked_policy");
    expect(result.request.content.routing.excluded).toEqual([
      expect.objectContaining({
        model_deployment_id: deployment.deployment.model_deployment_id,
        code: "ACTIVE_SYNTHESIST_CERTIFICATION_REQUIRED",
      }),
    ]);
    expect(result.calls).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects a certification whose hash does not bind the registered deployment and evaluation", () => {
    const { packets } = setupPackets();
    const { deployment, certification } = certifiedDeployment();
    const gateway = new SynthesistGateway(packets);
    gateway.registerDeployment(deployment, {
      invoke: () => {
        throw new Error("Not invoked.");
      },
    });

    expect(() =>
      gateway.registerCertification({
        ...certification,
        content_hash:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "SYNTHESIST_CERTIFICATION_HASH_MISMATCH",
      }),
    );
  });
});
