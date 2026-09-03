import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraModelSynthesistOutput,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type {
  DeepReadonly,
  InMemoryContextPacketRegistry,
} from "./context-packet-registry.js";
import {
  GroundedSynthesisError,
  GroundedSynthesisValidator,
} from "./grounded-synthesis.js";
import { derivePetraId } from "./identity.js";
import type {
  SynthesistAdapterResponse,
  SynthesistModelAdapter,
} from "./synthesist-model-adapter.js";

type EgressClass =
  PetraSynthesistModelRequest["content"]["outbound_context"]["egress_class"];
type DataClass =
  PetraSynthesistModelRequest["content"]["outbound_context"]["data_classes"][number];
type ModelBudget = PetraSynthesistModelRequest["content"]["budget"];
type PromptProfile = PetraSynthesistModelRequest["content"]["prompt_profile"];
type ModelMessage =
  PetraSynthesistModelCall["content"]["input"]["messages"][number];
type ModelValidation =
  PetraSynthesistModelCall["content"]["validation"][number];

export type SynthesistGatewayErrorCode =
  | "SYNTHESIST_DEPLOYMENT_ID_REUSED"
  | "SYNTHESIST_DEPLOYMENT_ADAPTER_MISSING"
  | "SYNTHESIST_CERTIFICATION_HASH_MISMATCH"
  | "SYNTHESIST_CERTIFICATION_ID_REUSED"
  | "SYNTHESIST_CERTIFICATION_DEPLOYMENT_MISMATCH"
  | "SYNTHESIST_CERTIFICATION_CONTRACT_MISMATCH"
  | "SYNTHESIST_ROUTING_POLICY_HASH_MISMATCH"
  | "SYNTHESIST_PROMPT_PROFILE_HASH_MISMATCH"
  | "SYNTHESIST_PACKET_MISSING"
  | "SYNTHESIST_PACKET_MISMATCH"
  | "SYNTHESIST_REQUEST_ID_REUSED"
  | "SYNTHESIST_CALL_ID_REUSED";

export class SynthesistGatewayError extends Error {
  readonly code: SynthesistGatewayErrorCode;

  constructor(code: SynthesistGatewayErrorCode, message: string) {
    super(message);
    this.name = "SynthesistGatewayError";
    this.code = code;
  }
}

export interface SynthesistModelDeployment {
  readonly deployment: PetraSynthesistRoleCertification["deployment"];
  readonly adapter_id: string;
  readonly active: boolean;
  readonly health: "healthy" | "degraded" | "unavailable";
  readonly provider_policy_verified: boolean;
  readonly accepted_egress_classes: readonly EgressClass[];
  readonly accepted_data_classes: readonly DataClass[];
  readonly expected_validated_cost_usd: string;
  readonly expected_latency_ms: number;
  readonly endpoint_fingerprint: string;
}

export interface SynthesistRoutingPolicy {
  readonly routing_policy_id: string;
  readonly revision: 1;
  readonly project_id: string;
  readonly role: "synthesist";
  readonly active: boolean;
  readonly permitted_deployment_ids: readonly string[];
  readonly max_egress_class: EgressClass;
  readonly selection: "validated_cost_then_latency_then_identity";
  readonly content_hash: string;
}

export interface SynthesistGatewayRequest {
  readonly project_id: string;
  readonly workflow_id: string;
  readonly objective: string;
  readonly impact_class: PetraSynthesistModelRequest["content"]["impact_class"];
  readonly context_packet_id: string;
  readonly evidence_packet_id: string;
  readonly egress_class: EgressClass;
  readonly visibility: PetraSynthesistModelRequest["content"]["outbound_context"]["visibility"];
  readonly data_classes: readonly [DataClass, ...DataClass[]];
  readonly rights_decision_ids: readonly [string, ...string[]];
  readonly selected_fields: readonly [string, ...string[]];
  readonly redactions: PetraSynthesistModelRequest["content"]["outbound_context"]["redactions"];
  readonly capability_grant_id: string;
  readonly purpose: string;
  readonly prompt_profile: PromptProfile;
  readonly base_messages: readonly [ModelMessage, ...ModelMessage[]];
  readonly parameters: Omit<
    PetraSynthesistModelRequest["content"]["parameters"],
    "content_hash"
  >;
  readonly budget: ModelBudget;
  readonly estimated_input_tokens: number;
  readonly certification_scope: PetraSynthesistRoleCertification["scope"];
  readonly routing_policy: SynthesistRoutingPolicy;
  readonly requested_by: ActorRef;
  readonly requested_at: string;
}

export interface SynthesistGatewayExecution {
  readonly request: DeepReadonly<PetraSynthesistModelRequest>;
  readonly calls: readonly DeepReadonly<PetraSynthesistModelCall>[];
  readonly output?: DeepReadonly<PetraModelSynthesistOutput>;
}

interface EligibleRoute {
  deployment: SynthesistModelDeployment;
  certification: PetraSynthesistRoleCertification;
}

interface RoutingResult {
  eligible: EligibleRoute[];
  excluded: PetraSynthesistModelRequest["content"]["routing"]["excluded"];
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const asNumber = (value: string): number => Number.parseFloat(value);

const egressRank: Record<EgressClass, number> = {
  E0: 0,
  E1: 1,
  E2: 2,
  E3: 3,
};

const immutableCopy = <Value>(value: Value): DeepReadonly<Value> => {
  const copy = structuredClone(value);
  const freeze = (member: unknown): void => {
    if (
      typeof member !== "object" ||
      member === null ||
      Object.isFrozen(member)
    ) {
      return;
    }
    for (const child of Object.values(member)) freeze(child);
    Object.freeze(member);
  };
  freeze(copy);
  return copy as DeepReadonly<Value>;
};

const timestampPlus = (timestamp: string, milliseconds: number): string =>
  new Date(new Date(timestamp).getTime() + milliseconds).toISOString();

export const synthesistCertificationHash = (
  certification: Omit<
    PetraSynthesistRoleCertification,
    | "schema_name"
    | "schema_version"
    | "role_certification_id"
    | "revision"
    | "content_hash"
    | "certified_by"
    | "certified_at"
  >,
): string => canonicalHash(certification);

export const synthesistRoutingPolicyHash = (
  policy: Omit<SynthesistRoutingPolicy, "content_hash">,
): string => canonicalHash(policy);

export const buildSynthesistPromptMessages = (
  input: Pick<SynthesistGatewayRequest, "objective" | "base_messages">,
  packets: InMemoryContextPacketRegistry,
  contextPacketId: string,
  evidencePacketId: string,
): PetraSynthesistModelCall["content"]["input"]["messages"] => {
  const context = packets.getContextPacket(contextPacketId);
  const evidence = packets.getEvidencePacket(evidencePacketId);
  if (context === undefined || evidence === undefined) {
    throw new SynthesistGatewayError(
      "SYNTHESIST_PACKET_MISSING",
      "The exact ContextPacket and EvidencePacket must be registered before prompt compilation.",
    );
  }
  return [
    ...structuredClone(input.base_messages),
    {
      role: "user",
      content: [
        "Petra packet controls for this exact synthesis:",
        canonicalize({
          objective: input.objective,
          context_coverage: context.content.coverage,
          context_omissions: context.content.omissions,
          evidence_coverage: evidence.content.coverage,
          evidence_exclusions: evidence.content.exclusions,
          evidence_freshness: evidence.content.freshness,
          temporal_perspective: evidence.content.temporal_perspective,
        }),
      ].join("\n"),
    },
  ] as PetraSynthesistModelCall["content"]["input"]["messages"];
};

const deploymentMatches = (
  left: PetraSynthesistRoleCertification["deployment"],
  right: PetraSynthesistRoleCertification["deployment"],
): boolean => canonicalize(left) === canonicalize(right);

const scopeMatches = (
  certification: PetraSynthesistRoleCertification,
  requested: PetraSynthesistRoleCertification["scope"],
): boolean =>
  (certification.scope.domain === requested.domain ||
    certification.scope.domain === "cross-domain scientific synthesis") &&
  certification.scope.language === requested.language &&
  certification.scope.modality === requested.modality &&
  (certification.scope.document_class === requested.document_class ||
    certification.scope.document_class === "scholarly");

const failureValidation = (code: string, message: string): ModelValidation => ({
  validator_name: "petra-synthesist-gateway",
  validator_version: "1.0.0",
  outcome: "fail",
  code,
  message,
});

const successValidations =
  (): PetraSynthesistModelCall["content"]["validation"] => [
    {
      validator_name: "model-output-schema",
      validator_version: "1.0.0",
      outcome: "pass",
      code: "SCHEMA_VALID",
    },
    {
      validator_name: "grounded-synthesis",
      validator_version: "1.0.0",
      outcome: "pass",
      code: "EVIDENCE_REFS_RESOLVED",
    },
    {
      validator_name: "statement-origin-separation",
      validator_version: "1.0.0",
      outcome: "pass",
      code: "ORIGINS_EXPLICIT",
    },
  ];

export class SynthesistGateway {
  readonly #contracts: PetraContractRegistry;
  readonly #packets: InMemoryContextPacketRegistry;
  readonly #grounded: GroundedSynthesisValidator;
  readonly #deployments = new Map<string, SynthesistModelDeployment>();
  readonly #adapters = new Map<string, SynthesistModelAdapter>();
  readonly #certifications = new Map<
    string,
    PetraSynthesistRoleCertification
  >();
  readonly #requests = new Map<
    string,
    DeepReadonly<PetraSynthesistModelRequest>
  >();
  readonly #calls = new Map<string, DeepReadonly<PetraSynthesistModelCall>>();
  readonly #outputs = new Map<
    string,
    DeepReadonly<PetraModelSynthesistOutput>
  >();

  constructor(
    packets: InMemoryContextPacketRegistry,
    contracts: PetraContractRegistry = new PetraContractRegistry(),
  ) {
    this.#packets = packets;
    this.#contracts = contracts;
    this.#grounded = new GroundedSynthesisValidator(packets, contracts);
  }

  registerDeployment(
    deployment: SynthesistModelDeployment,
    adapter: SynthesistModelAdapter,
  ): void {
    const id = deployment.deployment.model_deployment_id;
    const existing = this.#deployments.get(id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(deployment)
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_DEPLOYMENT_ID_REUSED",
        `ModelDeployment ${id} is already bound to different synthesist configuration.`,
      );
    }
    this.#deployments.set(id, structuredClone(deployment));
    this.#adapters.set(deployment.adapter_id, adapter);
  }

  registerCertification(certification: PetraSynthesistRoleCertification): void {
    this.#contracts.assertValid(
      "model-role-certification",
      "1.1.0",
      certification,
    );
    const actualHash = synthesistCertificationHash({
      deployment: certification.deployment,
      role_profile: certification.role_profile,
      scope: certification.scope,
      evaluation: certification.evaluation,
      decision: certification.decision,
    });
    if (certification.content_hash !== actualHash) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_CERTIFICATION_HASH_MISMATCH",
        "The synthesist RoleCertification hash does not bind its exact deployment, role, scope, evaluation, and decision.",
      );
    }
    const registered = this.#deployments.get(
      certification.deployment.model_deployment_id,
    );
    if (
      registered === undefined ||
      !deploymentMatches(registered.deployment, certification.deployment)
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_CERTIFICATION_DEPLOYMENT_MISMATCH",
        "The synthesist RoleCertification does not identify an exactly registered deployment snapshot.",
      );
    }
    const evidenceEntry = this.#contracts.entries.find(
      (entry) => entry.name === "evidence-packet" && entry.version === "1.0.0",
    );
    const outputEntry = this.#contracts.entries.find(
      (entry) =>
        entry.name === "model-synthesist-output" && entry.version === "1.0.0",
    );
    if (
      evidenceEntry === undefined ||
      outputEntry === undefined ||
      certification.role_profile.input_contract.schema_hash !==
        evidenceEntry.canonical_sha256 ||
      certification.role_profile.output_contract.schema_hash !==
        outputEntry.canonical_sha256
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_CERTIFICATION_CONTRACT_MISMATCH",
        "The RoleCertification is not bound to Petra's active EvidencePacket and synthesist output contracts.",
      );
    }
    const id = certification.role_certification_id;
    const existing = this.#certifications.get(id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(certification)
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_CERTIFICATION_ID_REUSED",
        `RoleCertification ${id} is already bound to different evidence.`,
      );
    }
    this.#certifications.set(id, structuredClone(certification));
  }

  getRequest(
    modelRequestId: string,
  ): DeepReadonly<PetraSynthesistModelRequest> | undefined {
    return this.#requests.get(modelRequestId);
  }

  getCall(
    modelCallId: string,
  ): DeepReadonly<PetraSynthesistModelCall> | undefined {
    return this.#calls.get(modelCallId);
  }

  async execute(
    input: SynthesistGatewayRequest,
  ): Promise<SynthesistGatewayExecution> {
    const context = this.#packets.getContextPacket(input.context_packet_id);
    const evidence = this.#packets.getEvidencePacket(input.evidence_packet_id);
    if (context === undefined || evidence === undefined) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_PACKET_MISSING",
        "The exact ContextPacket and EvidencePacket must be registered before synthesis.",
      );
    }
    if (
      context.project_id !== input.project_id ||
      evidence.project_id !== input.project_id ||
      evidence.content.context_packet_ref.context_packet_id !==
        context.context_packet_id ||
      evidence.content.context_packet_ref.content_hash !== context.content_hash
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_PACKET_MISMATCH",
        "The requested packets do not identify the same exact Project context.",
      );
    }
    const messages = buildSynthesistPromptMessages(
      input,
      this.#packets,
      context.context_packet_id,
      evidence.evidence_packet_id,
    );
    const { content_hash: ignoredPolicyHash, ...policyContent } =
      input.routing_policy;
    void ignoredPolicyHash;
    if (
      input.routing_policy.content_hash !==
      synthesistRoutingPolicyHash(policyContent)
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_ROUTING_POLICY_HASH_MISMATCH",
        "The synthesist routing policy hash does not bind its exact policy content.",
      );
    }
    if (input.prompt_profile.content_hash !== canonicalHash(messages)) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_PROMPT_PROFILE_HASH_MISMATCH",
        "The synthesist prompt profile hash does not bind the exact message stack sent to the adapter.",
      );
    }

    const outputEntry = this.#contracts.entries.find(
      (entry) =>
        entry.name === "model-synthesist-output" && entry.version === "1.0.0",
    );
    if (outputEntry === undefined) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_CERTIFICATION_CONTRACT_MISMATCH",
        "The synthesist output contract is not registered.",
      );
    }
    const outputContract = {
      schema_name: "model-synthesist-output" as const,
      schema_version: "1.0.0" as const,
      schema_hash: outputEntry.canonical_sha256,
    };
    const parameters = {
      ...input.parameters,
      content_hash: canonicalHash(input.parameters),
    };
    const contextSelections = evidence.content.selected_evidence.map(
      (selection) => {
        const inclusion = context.content.included_objects.find(
          (candidate) =>
            candidate.selection_order === selection.context_selection_order,
        );
        const record = this.#packets.getContextRecord(
          context.context_packet_id,
          selection.object_ref.object_id,
          selection.object_ref.object_revision,
        );
        if (inclusion === undefined || record === undefined) {
          throw new SynthesistGatewayError(
            "SYNTHESIST_PACKET_MISMATCH",
            `Evidence selection ${selection.context_selection_order} has no exact context record.`,
          );
        }
        return {
          context_selection_order: selection.context_selection_order,
          object_ref: structuredClone(selection.object_ref),
          rendered_content: canonicalize({ inclusion, selection, record }),
          source_span_selection_orders: [
            ...selection.source_span_selection_orders,
          ],
        };
      },
    ) as PetraSynthesistModelCall["content"]["input"]["context_selections"];
    const exactInputWithoutHash = {
      context_packet_ref: {
        context_packet_id: context.context_packet_id,
        content_hash: context.content_hash,
      },
      evidence_packet_ref: {
        evidence_packet_id: evidence.evidence_packet_id,
        content_hash: evidence.content_hash,
      },
      messages,
      context_selections: contextSelections,
    };
    const exactInput: PetraSynthesistModelCall["content"]["input"] = {
      ...exactInputWithoutHash,
      content_hash: canonicalHash(exactInputWithoutHash),
    };
    const outboundContext: PetraSynthesistModelRequest["content"]["outbound_context"] =
      {
        egress_class: input.egress_class,
        visibility: input.visibility,
        data_classes: [...input.data_classes],
        context_object_refs: contextSelections.map((item) =>
          structuredClone(item.object_ref),
        ) as PetraSynthesistModelRequest["content"]["outbound_context"]["context_object_refs"],
        rights_decision_ids: [...input.rights_decision_ids],
        selected_fields: [...input.selected_fields],
        redactions: structuredClone(input.redactions),
        context_content_hash: exactInput.content_hash,
        capability_grant_id: input.capability_grant_id,
        purpose: input.purpose,
      };
    const requestIdentity = canonicalHash({
      project_id: input.project_id,
      workflow_id: input.workflow_id,
      objective: input.objective,
      impact_class: input.impact_class,
      context_packet_ref: exactInput.context_packet_ref,
      evidence_packet_ref: exactInput.evidence_packet_ref,
      outbound_context: outboundContext,
      prompt_profile: input.prompt_profile,
      parameters,
      budget: input.budget,
      certification_scope: input.certification_scope,
      routing_policy: input.routing_policy,
    });
    const modelRequestId = derivePetraId("model_request", requestIdentity);
    const existing = this.#requests.get(modelRequestId);
    if (existing !== undefined) {
      const existingOutput = this.#outputs.get(modelRequestId);
      return {
        request: existing,
        calls: [...this.#calls.values()].filter(
          (call) => call.content.model_request_id === modelRequestId,
        ),
        ...(existingOutput === undefined ? {} : { output: existingOutput }),
      };
    }

    const routing = this.#route(input, outputContract);
    if (routing.eligible.length === 0) {
      const validation: PetraSynthesistModelCall["content"]["validation"] = [
        failureValidation(
          "NO_ELIGIBLE_SYNTHESIST_ROUTE",
          "No registered deployment satisfied permission, certification, packet, budget, health, and runtime constraints.",
        ),
      ];
      const request = this.#buildRequest({
        input,
        modelRequestId,
        outboundContext,
        parameters,
        outputContract,
        routing,
        terminal: {
          state: "blocked_policy",
          model_call_ids: [],
          validator_results: validation,
          failure: {
            code: "NO_ELIGIBLE_SYNTHESIST_ROUTE",
            message: "No certified synthesist route satisfied the request.",
            retryable: false,
          },
        },
        completedAt: input.requested_at,
      });
      return { request: this.#storeRequest(request), calls: [] };
    }

    const selected = routing.eligible[0];
    if (selected === undefined) throw new Error("Missing selected route.");
    const adapter = this.#adapters.get(selected.deployment.adapter_id);
    if (adapter === undefined) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_DEPLOYMENT_ADAPTER_MISSING",
        `No synthesist adapter is registered for ${selected.deployment.adapter_id}.`,
      );
    }
    const modelCallId = derivePetraId(
      "model_call",
      `${modelRequestId}|1|${selected.deployment.deployment.model_deployment_id}`,
    );
    let response: SynthesistAdapterResponse;
    try {
      response = await adapter.invoke({
        model_request_id: modelRequestId,
        model_call_id: modelCallId,
        deployment: selected.deployment.deployment,
        input: exactInput,
        parameters: input.parameters,
        output_contract: outputContract,
      });
    } catch (error) {
      response = {
        outcome: "provider_error",
        observed_revision: selected.deployment.deployment.observed_revision,
        timing: { queue_ms: 0, total_ms: 0, validation_ms: 0 },
        usage: {
          accounting: "unavailable",
          input_tokens: 0,
          output_tokens: 0,
        },
        cost: {
          amount: "0",
          currency: "USD",
          accounting: "unavailable",
          pricing_source: "The provider call did not return usage or cost.",
        },
        failure: {
          code: "PROVIDER_INVOCATION_FAILED",
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
      };
    }
    return this.#complete({
      input,
      modelRequestId,
      modelCallId,
      outboundContext,
      parameters,
      exactInput,
      outputContract,
      routing,
      selected,
      response,
    });
  }

  #route(
    input: SynthesistGatewayRequest,
    outputContract: PetraSynthesistModelRequest["content"]["output_contract"],
  ): RoutingResult {
    const eligible: EligibleRoute[] = [];
    const excluded: RoutingResult["excluded"] = [];
    const now = new Date(input.requested_at).getTime();
    for (const deployment of this.#deployments.values()) {
      let exclusion: { code: string; reason: string } | undefined;
      if (!input.routing_policy.active) {
        exclusion = {
          code: "ROUTING_POLICY_PAUSED",
          reason: "The routing policy is paused.",
        };
      } else if (input.routing_policy.project_id !== input.project_id) {
        exclusion = {
          code: "ROUTING_POLICY_PROJECT_MISMATCH",
          reason: "The routing policy belongs to another Project.",
        };
      } else if (
        !input.routing_policy.permitted_deployment_ids.includes(
          deployment.deployment.model_deployment_id,
        )
      ) {
        exclusion = {
          code: "DEPLOYMENT_NOT_PERMITTED",
          reason: "The routing policy does not permit this deployment.",
        };
      } else if (!deployment.active || deployment.health === "unavailable") {
        exclusion = {
          code: "DEPLOYMENT_UNAVAILABLE",
          reason: "The deployment is inactive or unavailable.",
        };
      } else if (!deployment.provider_policy_verified) {
        exclusion = {
          code: "PROVIDER_POLICY_UNVERIFIED",
          reason: "The provider policy has not been verified.",
        };
      } else if (
        egressRank[input.egress_class] >
          egressRank[input.routing_policy.max_egress_class] ||
        !deployment.accepted_egress_classes.includes(input.egress_class)
      ) {
        exclusion = {
          code: "EGRESS_CLASS_REFUSED",
          reason: "The route does not permit the request's egress class.",
        };
      } else if (
        input.data_classes.some(
          (dataClass) => !deployment.accepted_data_classes.includes(dataClass),
        )
      ) {
        exclusion = {
          code: "DATA_CLASS_REFUSED",
          reason: "The route does not permit every outbound data class.",
        };
      } else if (!deployment.deployment.structured_output) {
        exclusion = {
          code: "STRUCTURED_OUTPUT_REQUIRED",
          reason: "The synthesist requires structured output.",
        };
      } else if (
        input.estimated_input_tokens >
          deployment.deployment.max_context_tokens ||
        input.estimated_input_tokens > input.budget.max_input_tokens
      ) {
        exclusion = {
          code: "CONTEXT_BUDGET_EXCEEDED",
          reason:
            "The estimated input exceeds the deployment or request bound.",
        };
      } else if (
        asNumber(deployment.expected_validated_cost_usd) >
        asNumber(input.budget.max_cost_usd)
      ) {
        exclusion = {
          code: "COST_BUDGET_EXCEEDED",
          reason: "The expected validated cost exceeds the request budget.",
        };
      }

      const certification = [...this.#certifications.values()].find(
        (candidate) =>
          candidate.deployment.model_deployment_id ===
            deployment.deployment.model_deployment_id &&
          candidate.decision.status === "active" &&
          (candidate.decision.expires_at === undefined ||
            new Date(candidate.decision.expires_at).getTime() > now) &&
          candidate.role_profile.output_contract.schema_hash ===
            outputContract.schema_hash &&
          scopeMatches(candidate, input.certification_scope),
      );
      if (exclusion === undefined && certification === undefined) {
        exclusion = {
          code: "ACTIVE_SYNTHESIST_CERTIFICATION_REQUIRED",
          reason: "No current exact-scope synthesist certification exists.",
        };
      }
      if (exclusion !== undefined) {
        excluded.push({
          model_deployment_id: deployment.deployment.model_deployment_id,
          ...exclusion,
        });
      } else if (certification !== undefined) {
        eligible.push({ deployment, certification });
      }
    }
    eligible.sort(
      (left, right) =>
        asNumber(left.deployment.expected_validated_cost_usd) -
          asNumber(right.deployment.expected_validated_cost_usd) ||
        left.deployment.expected_latency_ms -
          right.deployment.expected_latency_ms ||
        left.deployment.deployment.model_deployment_id.localeCompare(
          right.deployment.deployment.model_deployment_id,
        ),
    );
    excluded.sort((left, right) =>
      left.model_deployment_id.localeCompare(right.model_deployment_id),
    );
    return { eligible, excluded };
  }

  #complete(args: {
    input: SynthesistGatewayRequest;
    modelRequestId: string;
    modelCallId: string;
    outboundContext: PetraSynthesistModelRequest["content"]["outbound_context"];
    parameters: PetraSynthesistModelRequest["content"]["parameters"];
    exactInput: PetraSynthesistModelCall["content"]["input"];
    outputContract: PetraSynthesistModelRequest["content"]["output_contract"];
    routing: RoutingResult;
    selected: EligibleRoute;
    response: SynthesistAdapterResponse;
  }): SynthesistGatewayExecution {
    const completedAt = timestampPlus(
      args.input.requested_at,
      args.response.timing.total_ms,
    );
    if (args.response.outcome !== "success") {
      const validation: PetraSynthesistModelCall["content"]["validation"] = [
        failureValidation(
          args.response.failure.code,
          args.response.failure.message,
        ),
      ];
      const call = this.#buildCall({
        ...args,
        completedAt,
        outcome: args.response.outcome,
        validation,
        failure: args.response.failure,
      });
      const storedCall = this.#storeCall(call);
      const request = this.#buildRequest({
        input: args.input,
        modelRequestId: args.modelRequestId,
        outboundContext: args.outboundContext,
        parameters: args.parameters,
        outputContract: args.outputContract,
        routing: args.routing,
        terminal: {
          state: "provider_unavailable",
          model_call_ids: [args.modelCallId],
          validator_results: validation,
          failure: args.response.failure,
        },
        completedAt,
      });
      return {
        request: this.#storeRequest(request),
        calls: [storedCall],
      };
    }

    let output: DeepReadonly<PetraModelSynthesistOutput> | undefined;
    let validation: PetraSynthesistModelCall["content"]["validation"];
    try {
      output = this.#grounded.validate(
        args.response.output,
        args.exactInput.context_packet_ref.context_packet_id,
        args.exactInput.evidence_packet_ref.evidence_packet_id,
      );
      validation = successValidations();
    } catch (error) {
      const code =
        error instanceof GroundedSynthesisError
          ? error.code
          : "SYNTHESIST_OUTPUT_SCHEMA_INVALID";
      const message = error instanceof Error ? error.message : String(error);
      validation = [failureValidation(code, message)];
    }
    if (output === undefined) {
      const failure = {
        code: validation[0]?.code ?? "SYNTHESIST_OUTPUT_VALIDATION_FAILED",
        message:
          validation[0]?.message ?? "The synthesist output failed validation.",
        retryable: false,
      };
      const call = this.#buildCall({
        ...args,
        completedAt,
        outcome: "validation_failed",
        validation,
        failure,
      });
      const storedCall = this.#storeCall(call);
      const request = this.#buildRequest({
        input: args.input,
        modelRequestId: args.modelRequestId,
        outboundContext: args.outboundContext,
        parameters: args.parameters,
        outputContract: args.outputContract,
        routing: args.routing,
        terminal: {
          state: "validation_failed",
          model_call_ids: [args.modelCallId],
          validator_results: validation,
          failure,
        },
        completedAt,
      });
      return {
        request: this.#storeRequest(request),
        calls: [storedCall],
      };
    }

    const budgetExceeded =
      args.response.timing.total_ms > args.input.budget.max_latency_ms ||
      (args.response.usage.accounting !== "unavailable" &&
        (args.response.usage.input_tokens >
          args.input.budget.max_input_tokens ||
          args.response.usage.output_tokens >
            args.input.budget.max_output_tokens)) ||
      (args.response.cost.accounting !== "unavailable" &&
        asNumber(args.response.cost.amount) >
          asNumber(args.input.budget.max_cost_usd));
    const call = this.#buildCall({
      ...args,
      completedAt,
      outcome: "success",
      validation,
      output: output as PetraModelSynthesistOutput,
    });
    const storedCall = this.#storeCall(call);
    if (budgetExceeded) {
      const budgetValidation: PetraSynthesistModelCall["content"]["validation"] =
        [
          ...validation,
          failureValidation(
            "OBSERVED_SYNTHESIST_BUDGET_EXCEEDED",
            "The validated call exceeded at least one observable request budget.",
          ),
        ];
      const request = this.#buildRequest({
        input: args.input,
        modelRequestId: args.modelRequestId,
        outboundContext: args.outboundContext,
        parameters: args.parameters,
        outputContract: args.outputContract,
        routing: args.routing,
        terminal: {
          state: "budget_exhausted",
          model_call_ids: [args.modelCallId],
          validator_results: budgetValidation,
          failure: {
            code: "OBSERVED_SYNTHESIST_BUDGET_EXCEEDED",
            message:
              "The validated output was withheld because its observable budget was exceeded.",
            retryable: false,
          },
        },
        completedAt,
      });
      return {
        request: this.#storeRequest(request),
        calls: [storedCall],
      };
    }

    const outputHash = canonicalHash(output);
    const request = this.#buildRequest({
      input: args.input,
      modelRequestId: args.modelRequestId,
      outboundContext: args.outboundContext,
      parameters: args.parameters,
      outputContract: args.outputContract,
      routing: args.routing,
      terminal: {
        state: "completed",
        model_call_ids: [args.modelCallId],
        validator_results: validation,
        output_hash: outputHash,
      },
      completedAt,
    });
    const storedRequest = this.#storeRequest(request);
    this.#outputs.set(args.modelRequestId, output);
    return { request: storedRequest, calls: [storedCall], output };
  }

  #buildCall(args: {
    input: SynthesistGatewayRequest;
    modelRequestId: string;
    modelCallId: string;
    parameters: PetraSynthesistModelRequest["content"]["parameters"];
    exactInput: PetraSynthesistModelCall["content"]["input"];
    outputContract: PetraSynthesistModelRequest["content"]["output_contract"];
    selected: EligibleRoute;
    response: SynthesistAdapterResponse;
    completedAt: string;
    outcome: PetraSynthesistModelCall["content"]["outcome"];
    validation: PetraSynthesistModelCall["content"]["validation"];
    output?: PetraModelSynthesistOutput;
    failure?: PetraSynthesistModelCall["content"]["failure"];
  }): PetraSynthesistModelCall {
    const content: PetraSynthesistModelCall["content"] = {
      model_request_id: args.modelRequestId,
      attempt: 1,
      attempt_kind: "initial",
      deployment: {
        model_deployment_id:
          args.selected.deployment.deployment.model_deployment_id,
        provider_id: args.selected.deployment.deployment.provider_id,
        provider_kind: args.selected.deployment.deployment.provider_kind,
        provider_model: args.selected.deployment.deployment.provider_model,
        observed_revision: args.response.observed_revision,
        replayability: args.selected.deployment.deployment.replayability,
        endpoint_fingerprint: args.selected.deployment.endpoint_fingerprint,
      },
      prompt_profile: structuredClone(args.input.prompt_profile),
      parameters_hash: args.parameters.content_hash,
      output_contract: structuredClone(args.outputContract),
      input: structuredClone(args.exactInput),
      ...(args.response.provider_request_id === undefined
        ? {}
        : { provider_request_id: args.response.provider_request_id }),
      outcome: args.outcome,
      ...(args.response.output === undefined
        ? {}
        : { raw_output: structuredClone(args.response.output) }),
      ...(args.output === undefined
        ? {}
        : { output: structuredClone(args.output) }),
      ...(args.failure === undefined
        ? {}
        : { failure: structuredClone(args.failure) }),
      validation: structuredClone(args.validation),
      timing: structuredClone(args.response.timing),
      usage: structuredClone(args.response.usage),
      cost: structuredClone(args.response.cost),
    };
    const call: PetraSynthesistModelCall = {
      schema_name: "petra.model-call",
      schema_version: "1.1.0",
      model_call_id: args.modelCallId,
      revision: 1,
      content,
      content_hash: canonicalHash(content),
      started_at: args.input.requested_at,
      completed_at: args.completedAt,
    };
    this.#contracts.assertValid("model-call", "1.1.0", call);
    return call;
  }

  #buildRequest(args: {
    input: SynthesistGatewayRequest;
    modelRequestId: string;
    outboundContext: PetraSynthesistModelRequest["content"]["outbound_context"];
    parameters: PetraSynthesistModelRequest["content"]["parameters"];
    outputContract: PetraSynthesistModelRequest["content"]["output_contract"];
    routing: RoutingResult;
    terminal: PetraSynthesistModelRequest["content"]["terminal"];
    completedAt: string;
  }): PetraSynthesistModelRequest {
    const selected = args.routing.eligible[0];
    const content: PetraSynthesistModelRequest["content"] = {
      project_id: args.input.project_id,
      workflow: {
        workflow_kind: "grounded_synthesis",
        workflow_id: args.input.workflow_id,
      },
      role: "synthesist",
      objective: args.input.objective,
      impact_class: args.input.impact_class,
      context_packet_ref: {
        context_packet_id: args.input.context_packet_id,
        content_hash:
          this.#packets.getContextPacket(args.input.context_packet_id)
            ?.content_hash ?? "",
      },
      evidence_packet_ref: {
        evidence_packet_id: args.input.evidence_packet_id,
        content_hash:
          this.#packets.getEvidencePacket(args.input.evidence_packet_id)
            ?.content_hash ?? "",
      },
      outbound_context: structuredClone(args.outboundContext),
      prompt_profile: structuredClone(args.input.prompt_profile),
      parameters: structuredClone(args.parameters),
      output_contract: structuredClone(args.outputContract),
      routing_policy_ref: {
        routing_policy_id: args.input.routing_policy.routing_policy_id,
        revision: args.input.routing_policy.revision,
        content_hash: args.input.routing_policy.content_hash,
      },
      routing: {
        eligible: args.routing.eligible.map((route) => ({
          model_deployment_id: route.deployment.deployment.model_deployment_id,
          role_certification_id: route.certification.role_certification_id,
          expected_validated_cost_usd:
            route.deployment.expected_validated_cost_usd,
          expected_latency_ms: route.deployment.expected_latency_ms,
        })),
        excluded: structuredClone(args.routing.excluded),
        ...(selected === undefined
          ? {}
          : {
              selected: {
                model_deployment_id:
                  selected.deployment.deployment.model_deployment_id,
                role_certification_id:
                  selected.certification.role_certification_id,
                reason:
                  "Selected by validated cost, expected latency, and stable deployment identity after hard policy checks.",
              },
            }),
        fallback_chain: args.routing.eligible
          .slice(1)
          .map((route) => route.deployment.deployment.model_deployment_id),
      },
      budget: structuredClone(args.input.budget),
      terminal: structuredClone(args.terminal),
    };
    const request: PetraSynthesistModelRequest = {
      schema_name: "petra.model-request",
      schema_version: "1.1.0",
      model_request_id: args.modelRequestId,
      revision: 1,
      content,
      content_hash: canonicalHash(content),
      created_at: args.input.requested_at,
      completed_at: args.completedAt,
    };
    this.#contracts.assertValid("model-request", "1.1.0", request);
    return request;
  }

  #storeRequest(
    request: PetraSynthesistModelRequest,
  ): DeepReadonly<PetraSynthesistModelRequest> {
    const existing = this.#requests.get(request.model_request_id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(request)
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_REQUEST_ID_REUSED",
        `ModelRequest ${request.model_request_id} is already bound to different content.`,
      );
    }
    const stored = existing ?? immutableCopy(request);
    this.#requests.set(request.model_request_id, stored);
    return stored;
  }

  #storeCall(
    call: PetraSynthesistModelCall,
  ): DeepReadonly<PetraSynthesistModelCall> {
    const existing = this.#calls.get(call.model_call_id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(call)
    ) {
      throw new SynthesistGatewayError(
        "SYNTHESIST_CALL_ID_REUSED",
        `ModelCall ${call.model_call_id} is already bound to different content.`,
      );
    }
    const stored = existing ?? immutableCopy(call);
    this.#calls.set(call.model_call_id, stored);
    return stored;
  }
}
