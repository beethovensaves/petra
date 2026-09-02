import { createHash } from "node:crypto";

import type {
  ActorRef,
  PetraDocumentParseBundle,
  PetraEvidenceProposalBundle,
  PetraModelCall,
  PetraModelExtractorOutput,
  PetraModelRequest,
  PetraModelRoleCertification,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import { derivePetraId } from "./identity.js";
import {
  buildModelEvidenceProposalBundle,
  ModelEvidenceExtractionError,
  type ModelSourceSelection,
  validateModelExtractorGrounding,
} from "./model-evidence-extraction.js";

type EgressClass =
  PetraModelRequest["content"]["outbound_context"]["egress_class"];
type ModelDataClass =
  PetraModelRequest["content"]["outbound_context"]["data_classes"][number];
type ModelBudget = PetraModelRequest["content"]["budget"];
type ModelValidation = PetraModelCall["content"]["validation"][number];
type ModelCost = PetraModelCall["content"]["cost"];
type ModelUsage = PetraModelCall["content"]["usage"];
type ModelTiming = PetraModelCall["content"]["timing"];
type PromptProfile = PetraModelRequest["content"]["prompt_profile"];
type ContextPacketRef = PetraModelRequest["content"]["context_packet_ref"];

export type ModelGatewayErrorCode =
  | "MODEL_DEPLOYMENT_ID_REUSED"
  | "MODEL_DEPLOYMENT_ADAPTER_MISSING"
  | "ROLE_CERTIFICATION_HASH_MISMATCH"
  | "ROLE_CERTIFICATION_ID_REUSED"
  | "ROLE_CERTIFICATION_DEPLOYMENT_MISMATCH"
  | "ROLE_CERTIFICATION_CONTRACT_MISMATCH"
  | "ROUTING_POLICY_HASH_MISMATCH"
  | "PROMPT_PROFILE_HASH_MISMATCH"
  | "MODEL_REQUEST_ID_REUSED"
  | "MODEL_CALL_ID_REUSED";

export class ModelGatewayError extends Error {
  readonly code: ModelGatewayErrorCode;

  constructor(code: ModelGatewayErrorCode, message: string) {
    super(message);
    this.name = "ModelGatewayError";
    this.code = code;
  }
}

export interface ExtractorModelDeployment {
  readonly deployment: PetraModelRoleCertification["deployment"];
  readonly adapter_id: string;
  readonly active: boolean;
  readonly health: "healthy" | "degraded" | "unavailable";
  readonly provider_policy_verified: boolean;
  readonly accepted_egress_classes: readonly EgressClass[];
  readonly accepted_data_classes: readonly ModelDataClass[];
  readonly expected_validated_cost_usd: string;
  readonly expected_latency_ms: number;
  readonly endpoint_fingerprint: string;
}

export interface ExtractorRoutingPolicy {
  readonly routing_policy_id: string;
  readonly revision: 1;
  readonly project_id: string;
  readonly role: "extractor";
  readonly active: boolean;
  readonly permitted_deployment_ids: readonly string[];
  readonly max_egress_class: EgressClass;
  readonly selection: "validated_cost_then_latency_then_identity";
  readonly content_hash: string;
}

export interface ExtractorAdapterRequest {
  readonly model_request_id: string;
  readonly model_call_id: string;
  readonly deployment: PetraModelRoleCertification["deployment"];
  readonly input: PetraModelCall["content"]["input"];
  readonly parameters: Omit<
    PetraModelRequest["content"]["parameters"],
    "content_hash"
  >;
  readonly output_contract: PetraModelRequest["content"]["output_contract"];
}

interface ExtractorAdapterObservation {
  readonly provider_request_id?: string;
  readonly observed_revision: string;
  readonly timing: ModelTiming;
  readonly usage: ModelUsage;
  readonly cost: ModelCost;
}

export type ExtractorAdapterResponse =
  | (ExtractorAdapterObservation & {
      readonly outcome: "success";
      readonly output: unknown;
    })
  | (ExtractorAdapterObservation & {
      readonly outcome: "provider_error" | "refusal" | "timeout";
      readonly output?: unknown;
      readonly failure: {
        readonly code: string;
        readonly message: string;
        readonly retryable: boolean;
      };
    });

export interface ExtractorModelAdapter {
  readonly invoke: (
    request: ExtractorAdapterRequest,
  ) => Promise<ExtractorAdapterResponse>;
}

export interface ExtractorGatewayRequest {
  readonly project_id: string;
  readonly workflow_id: string;
  readonly objective: string;
  readonly impact_class: PetraModelRequest["content"]["impact_class"];
  readonly context_packet_ref: ContextPacketRef;
  readonly source_bundle: PetraDocumentParseBundle;
  readonly source_selections: readonly [
    ModelSourceSelection,
    ...ModelSourceSelection[],
  ];
  readonly egress_class: EgressClass;
  readonly visibility: PetraModelRequest["content"]["outbound_context"]["visibility"];
  readonly data_classes: readonly [ModelDataClass, ...ModelDataClass[]];
  readonly rights_decision_ids: readonly [string, ...string[]];
  readonly selected_fields: readonly [string, ...string[]];
  readonly redactions: PetraModelRequest["content"]["outbound_context"]["redactions"];
  readonly capability_grant_id: string;
  readonly purpose: string;
  readonly prompt_profile: PromptProfile;
  readonly messages: PetraModelCall["content"]["input"]["messages"];
  readonly parameters: Omit<
    PetraModelRequest["content"]["parameters"],
    "content_hash"
  >;
  readonly budget: ModelBudget;
  readonly estimated_input_tokens: number;
  readonly certification_scope: PetraModelRoleCertification["scope"];
  readonly routing_policy: ExtractorRoutingPolicy;
  readonly created_by: ActorRef;
  readonly requested_at: string;
}

export interface ModelGatewayExecution {
  readonly request: PetraModelRequest;
  readonly calls: readonly PetraModelCall[];
  readonly proposal_bundle?: PetraEvidenceProposalBundle;
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

const timestampPlus = (timestamp: string, milliseconds: number): string =>
  new Date(new Date(timestamp).getTime() + milliseconds).toISOString();

const certificationHash = (
  certification: PetraModelRoleCertification,
): string =>
  canonicalHash({
    deployment: certification.deployment,
    role_profile: certification.role_profile,
    scope: certification.scope,
    evaluation: certification.evaluation,
    decision: certification.decision,
  });

export const extractorRoutingPolicyHash = (
  policy: Omit<ExtractorRoutingPolicy, "content_hash">,
): string => canonicalHash(policy);

const deploymentMatches = (
  left: PetraModelRoleCertification["deployment"],
  right: PetraModelRoleCertification["deployment"],
): boolean => canonicalize(left) === canonicalize(right);

const certificationScopeMatches = (
  certification: PetraModelRoleCertification,
  requested: PetraModelRoleCertification["scope"],
): boolean =>
  (certification.scope.domain === requested.domain ||
    certification.scope.domain === "cross-domain scientific text") &&
  certification.scope.language === requested.language &&
  certification.scope.modality === requested.modality &&
  (certification.scope.document_class === requested.document_class ||
    certification.scope.document_class === "scholarly");

const failureValidation = (code: string, message: string): ModelValidation => ({
  validator_name: "petra-model-gateway",
  validator_version: "1.0.0",
  outcome: "fail",
  code,
  message,
});

const successValidations = (): PetraModelCall["content"]["validation"] => [
  {
    validator_name: "model-output-schema",
    validator_version: "1.0.0",
    outcome: "pass",
    code: "SCHEMA_VALID",
  },
  {
    validator_name: "source-span-grounding",
    validator_version: "1.0.0",
    outcome: "pass",
    code: "SOURCE_SELECTIONS_RESOLVED",
  },
];

const immutableCopy = <Value>(value: Value): Value => structuredClone(value);

interface EligibleRoute {
  deployment: ExtractorModelDeployment;
  certification: PetraModelRoleCertification;
}

interface RoutingResult {
  eligible: EligibleRoute[];
  excluded: PetraModelRequest["content"]["routing"]["excluded"];
}

export class ModelGateway {
  readonly #contracts: PetraContractRegistry;
  readonly #deployments = new Map<string, ExtractorModelDeployment>();
  readonly #adapters = new Map<string, ExtractorModelAdapter>();
  readonly #certifications = new Map<string, PetraModelRoleCertification>();
  readonly #requests = new Map<string, PetraModelRequest>();
  readonly #calls = new Map<string, PetraModelCall>();
  readonly #proposalBundles = new Map<string, PetraEvidenceProposalBundle>();

  constructor(contracts: PetraContractRegistry = new PetraContractRegistry()) {
    this.#contracts = contracts;
  }

  registerDeployment(
    deployment: ExtractorModelDeployment,
    adapter: ExtractorModelAdapter,
  ): void {
    const id = deployment.deployment.model_deployment_id;
    const existing = this.#deployments.get(id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(deployment)
    ) {
      throw new ModelGatewayError(
        "MODEL_DEPLOYMENT_ID_REUSED",
        `ModelDeployment ${id} is already bound to different configuration.`,
      );
    }
    this.#deployments.set(id, immutableCopy(deployment));
    this.#adapters.set(deployment.adapter_id, adapter);
  }

  registerCertification(certification: PetraModelRoleCertification): void {
    this.#contracts.assertValid(
      "model-role-certification",
      "1.0.0",
      certification,
    );
    if (certification.content_hash !== certificationHash(certification)) {
      throw new ModelGatewayError(
        "ROLE_CERTIFICATION_HASH_MISMATCH",
        "The RoleCertification hash does not bind its exact deployment, role, scope, evaluation, and decision.",
      );
    }
    const deployment = this.#deployments.get(
      certification.deployment.model_deployment_id,
    );
    if (
      deployment === undefined ||
      !deploymentMatches(deployment.deployment, certification.deployment)
    ) {
      throw new ModelGatewayError(
        "ROLE_CERTIFICATION_DEPLOYMENT_MISMATCH",
        "The RoleCertification does not identify an exactly registered deployment snapshot.",
      );
    }
    const outputEntry = this.#contracts.entries.find(
      (entry) =>
        entry.name === "model-extractor-output" && entry.version === "1.0.0",
    );
    if (
      outputEntry === undefined ||
      certification.role_profile.output_contract.schema_name !==
        "model-extractor-output" ||
      certification.role_profile.output_contract.schema_version !== "1.0.0" ||
      certification.role_profile.output_contract.schema_hash !==
        outputEntry.canonical_sha256
    ) {
      throw new ModelGatewayError(
        "ROLE_CERTIFICATION_CONTRACT_MISMATCH",
        "The RoleCertification is not bound to Petra's active extractor output contract.",
      );
    }
    const id = certification.role_certification_id;
    const existing = this.#certifications.get(id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(certification)
    ) {
      throw new ModelGatewayError(
        "ROLE_CERTIFICATION_ID_REUSED",
        `RoleCertification ${id} is already bound to different evidence.`,
      );
    }
    this.#certifications.set(id, immutableCopy(certification));
  }

  getRequest(modelRequestId: string): PetraModelRequest | undefined {
    const value = this.#requests.get(modelRequestId);
    return value === undefined ? undefined : immutableCopy(value);
  }

  getCall(modelCallId: string): PetraModelCall | undefined {
    const value = this.#calls.get(modelCallId);
    return value === undefined ? undefined : immutableCopy(value);
  }

  getProposalBundle(
    evidenceProposalBundleId: string,
  ): PetraEvidenceProposalBundle | undefined {
    const value = this.#proposalBundles.get(evidenceProposalBundleId);
    return value === undefined ? undefined : immutableCopy(value);
  }

  async executeExtractor(
    input: ExtractorGatewayRequest,
  ): Promise<ModelGatewayExecution> {
    this.#validateInputHashes(input);
    const outputEntry = this.#contracts.entries.find(
      (entry) =>
        entry.name === "model-extractor-output" && entry.version === "1.0.0",
    );
    if (outputEntry === undefined) {
      throw new ModelGatewayError(
        "ROLE_CERTIFICATION_CONTRACT_MISMATCH",
        "The extractor output contract is not registered.",
      );
    }
    const outputContract = {
      schema_name: "model-extractor-output" as const,
      schema_version: "1.0.0" as const,
      schema_hash: outputEntry.canonical_sha256,
    };
    const parameters = {
      ...input.parameters,
      content_hash: canonicalHash(input.parameters),
    };
    const exactInputWithoutHash = {
      context_packet_ref: input.context_packet_ref,
      source_artifact_ref: {
        artifact_id: input.source_bundle.document.source_artifact_id,
        content_hash: input.source_bundle.document.source_artifact_content_hash,
      },
      messages: input.messages,
      source_selections: input.source_selections.map((selection) => ({
        source_span_id: selection.source_span_id,
        exact_text: selection.exact_text,
        structural_path: selection.structural_path,
        page_numbers: [...selection.page_numbers] as [number, ...number[]],
      })) as PetraModelCall["content"]["input"]["source_selections"],
    };
    const exactInput: PetraModelCall["content"]["input"] = {
      ...exactInputWithoutHash,
      content_hash: canonicalHash(exactInputWithoutHash),
    };
    const outboundContext: PetraModelRequest["content"]["outbound_context"] = {
      egress_class: input.egress_class,
      visibility: input.visibility,
      data_classes: [...input.data_classes],
      source_artifact_refs: [exactInput.source_artifact_ref],
      source_span_ids: input.source_selections.map(
        (selection) => selection.source_span_id,
      ) as [string, ...string[]],
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
      context_packet_ref: input.context_packet_ref,
      outbound_context: outboundContext,
      prompt_profile: input.prompt_profile,
      parameters,
      budget: input.budget,
      certification_scope: input.certification_scope,
      routing_policy: input.routing_policy,
    });
    const modelRequestId = derivePetraId("model_request", requestIdentity);
    const priorExecution = this.#existingExecution(modelRequestId);
    if (priorExecution !== undefined) return priorExecution;
    const routing = this.#route(input, outputContract);

    if (routing.eligible.length === 0) {
      const validation = [
        failureValidation(
          "NO_ELIGIBLE_MODEL_ROUTE",
          "No registered deployment satisfied permission, certification, scope, budget, health, and runtime constraints.",
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
          proposal_bundle_ids: [],
          failure_code: "NO_ELIGIBLE_MODEL_ROUTE",
          failure_message:
            "No registered deployment satisfied the request's hard constraints.",
        },
        completedAt: input.requested_at,
      });
      this.#storeRequest(request);
      return { request, calls: [] };
    }

    const selected = routing.eligible[0];
    if (selected === undefined) {
      throw new Error("Routing declared an eligible deployment without one.");
    }
    const adapter = this.#adapters.get(selected.deployment.adapter_id);
    if (adapter === undefined) {
      throw new ModelGatewayError(
        "MODEL_DEPLOYMENT_ADAPTER_MISSING",
        `No adapter is registered for ${selected.deployment.adapter_id}.`,
      );
    }
    const modelCallId = derivePetraId(
      "model_call",
      `${modelRequestId}|1|${selected.deployment.deployment.model_deployment_id}`,
    );
    let response: ExtractorAdapterResponse;
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
    return this.#completeInvocation({
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

  #validateInputHashes(input: ExtractorGatewayRequest): void {
    const { content_hash: ignored, ...policyContent } = input.routing_policy;
    void ignored;
    if (
      input.routing_policy.content_hash !==
      extractorRoutingPolicyHash(policyContent)
    ) {
      throw new ModelGatewayError(
        "ROUTING_POLICY_HASH_MISMATCH",
        "The routing policy hash does not bind its exact policy content.",
      );
    }
    if (input.prompt_profile.content_hash !== canonicalHash(input.messages)) {
      throw new ModelGatewayError(
        "PROMPT_PROFILE_HASH_MISMATCH",
        "The prompt profile hash does not bind the exact message stack sent to the adapter.",
      );
    }
  }

  #route(
    input: ExtractorGatewayRequest,
    outputContract: PetraModelRequest["content"]["output_contract"],
  ): RoutingResult {
    const eligible: EligibleRoute[] = [];
    const excluded: PetraModelRequest["content"]["routing"]["excluded"] = [];
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
        egressRank[input.routing_policy.max_egress_class]
      ) {
        exclusion = {
          code: "ROUTING_EGRESS_EXCEEDED",
          reason: "The request exceeds the routing policy's egress ceiling.",
        };
      } else if (
        deployment.deployment.execution_location === "remote" &&
        input.egress_class === "E0"
      ) {
        exclusion = {
          code: "EGRESS_LOCAL_ONLY",
          reason: "E0 context may be processed only by a local deployment.",
        };
      } else if (
        !deployment.accepted_egress_classes.includes(input.egress_class) ||
        input.data_classes.some(
          (dataClass) => !deployment.accepted_data_classes.includes(dataClass),
        )
      ) {
        exclusion = {
          code: "PROVIDER_CONTEXT_POLICY_MISMATCH",
          reason:
            "The provider does not accept this egress class or data class.",
        };
      } else if (!deployment.deployment.structured_output) {
        exclusion = {
          code: "STRUCTURED_OUTPUT_REQUIRED",
          reason: "The extractor role requires structured output.",
        };
      } else if (
        input.estimated_input_tokens >
          deployment.deployment.max_context_tokens ||
        input.estimated_input_tokens > input.budget.max_input_tokens
      ) {
        exclusion = {
          code: "CONTEXT_BUDGET_EXCEEDED",
          reason:
            "The bounded context exceeds the deployment or request input limit.",
        };
      } else if (
        asNumber(deployment.expected_validated_cost_usd) >
          asNumber(input.budget.max_cost_usd) ||
        deployment.expected_latency_ms > input.budget.max_latency_ms
      ) {
        exclusion = {
          code: "REQUEST_BUDGET_EXCEEDED",
          reason:
            "Expected validated cost or latency exceeds the hard request budget.",
        };
      }
      let certification: PetraModelRoleCertification | undefined;
      if (exclusion === undefined) {
        certification = [...this.#certifications.values()]
          .filter(
            (candidate) =>
              candidate.deployment.model_deployment_id ===
                deployment.deployment.model_deployment_id &&
              candidate.decision.status === "active" &&
              candidate.decision.valid_from <= input.requested_at &&
              (candidate.decision.expires_at === undefined ||
                new Date(candidate.decision.expires_at).getTime() > now) &&
              candidate.role_profile.role === "extractor" &&
              candidate.role_profile.output_contract.schema_name ===
                outputContract.schema_name &&
              candidate.role_profile.output_contract.schema_version ===
                outputContract.schema_version &&
              candidate.role_profile.output_contract.schema_hash ===
                outputContract.schema_hash &&
              candidate.evaluation.prompt_profile.name ===
                input.prompt_profile.name &&
              candidate.evaluation.prompt_profile.version ===
                input.prompt_profile.version &&
              candidate.evaluation.prompt_profile.content_hash ===
                input.prompt_profile.content_hash &&
              certificationScopeMatches(candidate, input.certification_scope),
          )
          .sort((left, right) =>
            left.role_certification_id.localeCompare(
              right.role_certification_id,
            ),
          )[0];
        if (certification === undefined) {
          exclusion = {
            code: "ROLE_CERTIFICATION_MISSING",
            reason:
              "No active certification matches this deployment, role, prompt, contract, and scientific scope.",
          };
        }
      }
      if (exclusion !== undefined || certification === undefined) {
        excluded.push({
          model_deployment_id: deployment.deployment.model_deployment_id,
          code: exclusion?.code ?? "ROLE_CERTIFICATION_MISSING",
          reason:
            exclusion?.reason ?? "No active matching certification exists.",
        });
        continue;
      }
      eligible.push({ deployment, certification });
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

  #completeInvocation(args: {
    input: ExtractorGatewayRequest;
    modelRequestId: string;
    modelCallId: string;
    outboundContext: PetraModelRequest["content"]["outbound_context"];
    parameters: PetraModelRequest["content"]["parameters"];
    exactInput: PetraModelCall["content"]["input"];
    outputContract: PetraModelRequest["content"]["output_contract"];
    routing: RoutingResult;
    selected: EligibleRoute;
    response: ExtractorAdapterResponse;
  }): ModelGatewayExecution {
    const completedAt = timestampPlus(
      args.input.requested_at,
      args.response.timing.total_ms,
    );
    if (args.response.outcome !== "success") {
      const validation: PetraModelCall["content"]["validation"] = [
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
      this.#storeCall(call);
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
          proposal_bundle_ids: [],
          failure_code: args.response.failure.code,
          failure_message: args.response.failure.message,
        },
        completedAt,
      });
      this.#storeRequest(request);
      return { request, calls: [call] };
    }

    let output: PetraModelExtractorOutput | undefined;
    let validation: PetraModelCall["content"]["validation"];
    if (
      args.response.observed_revision !==
      args.selected.deployment.deployment.observed_revision
    ) {
      validation = [
        failureValidation(
          "DEPLOYMENT_REVISION_DRIFT",
          "The provider reported a model revision different from the certified deployment revision.",
        ),
      ];
    } else {
      try {
        this.#contracts.assertValid(
          "model-extractor-output",
          "1.0.0",
          args.response.output,
        );
        output = structuredClone(
          args.response.output,
        ) as PetraModelExtractorOutput;
        validateModelExtractorGrounding(
          output,
          args.input.source_bundle,
          args.input.source_selections,
        );
        validation = successValidations();
      } catch (error) {
        const code =
          error instanceof ModelEvidenceExtractionError
            ? error.code
            : "MODEL_OUTPUT_SCHEMA_INVALID";
        const message = error instanceof Error ? error.message : String(error);
        validation = [failureValidation(code, message)];
      }
    }
    if (
      output === undefined ||
      validation.some((item) => item.outcome === "fail")
    ) {
      const call = this.#buildCall({
        ...args,
        completedAt,
        outcome: "validation_failed",
        validation,
        failure: {
          code: validation[0]?.code ?? "MODEL_OUTPUT_VALIDATION_FAILED",
          message:
            validation[0]?.message ?? "The model output failed validation.",
          retryable: false,
        },
      });
      this.#storeCall(call);
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
          proposal_bundle_ids: [],
          failure_code: validation[0]?.code ?? "MODEL_OUTPUT_VALIDATION_FAILED",
          failure_message:
            validation[0]?.message ?? "The model output failed validation.",
        },
        completedAt,
      });
      this.#storeRequest(request);
      return { request, calls: [call] };
    }

    const observedBudgetExceeded =
      args.response.timing.total_ms > args.input.budget.max_latency_ms ||
      args.response.usage.input_tokens > args.input.budget.max_input_tokens ||
      args.response.usage.output_tokens > args.input.budget.max_output_tokens ||
      asNumber(args.response.cost.amount) >
        asNumber(args.input.budget.max_cost_usd);
    if (observedBudgetExceeded) {
      const budgetValidation: PetraModelCall["content"]["validation"] = [
        ...validation,
        failureValidation(
          "OBSERVED_BUDGET_EXCEEDED",
          "The completed call exceeded at least one hard token, latency, or monetary budget and was not converted into a proposal.",
        ),
      ];
      const call = this.#buildCall({
        ...args,
        completedAt,
        outcome: "success",
        output,
        validation: budgetValidation,
      });
      this.#storeCall(call);
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
          proposal_bundle_ids: [],
          failure_code: "OBSERVED_BUDGET_EXCEEDED",
          failure_message:
            "The call completed outside the request's hard budget.",
        },
        completedAt,
      });
      this.#storeRequest(request);
      return { request, calls: [call] };
    }

    const proposalBundle = buildModelEvidenceProposalBundle(
      args.input.source_bundle,
      output,
      {
        project_id: args.input.project_id,
        model_request_id: args.modelRequestId,
        model_call_id: args.modelCallId,
        model_deployment:
          args.selected.deployment.deployment.model_deployment_id,
        prompt_profile: args.input.prompt_profile,
        parameters_hash: args.parameters.content_hash,
        context_packet_ref: args.input.context_packet_ref,
        role_profile: {
          name: "petra-source-grounded-extractor",
          version: args.selected.certification.role_profile.version,
          content_hash: canonicalHash(args.selected.certification.role_profile),
        },
        source_selections: args.input.source_selections,
        created_by: args.input.created_by,
        started_at: args.input.requested_at,
        completed_at: completedAt,
      },
    );
    this.#contracts.assertValid(
      "evidence-proposal-bundle",
      "1.0.0",
      proposalBundle,
    );
    const call = this.#buildCall({
      ...args,
      completedAt,
      outcome: "success",
      output,
      validation,
    });
    this.#storeCall(call);
    this.#proposalBundles.set(
      proposalBundle.evidence_proposal_bundle_id,
      immutableCopy(proposalBundle),
    );
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
        proposal_bundle_ids: [proposalBundle.evidence_proposal_bundle_id],
      },
      completedAt,
    });
    this.#storeRequest(request);
    return { request, calls: [call], proposal_bundle: proposalBundle };
  }

  #buildCall(args: {
    input: ExtractorGatewayRequest;
    modelRequestId: string;
    modelCallId: string;
    exactInput: PetraModelCall["content"]["input"];
    outputContract: PetraModelRequest["content"]["output_contract"];
    selected: EligibleRoute;
    response: ExtractorAdapterResponse;
    completedAt: string;
    outcome: PetraModelCall["content"]["outcome"];
    validation: PetraModelCall["content"]["validation"];
    output?: PetraModelExtractorOutput;
    failure?: PetraModelCall["content"]["failure"];
  }): PetraModelCall {
    const content: PetraModelCall["content"] = {
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
      prompt_profile: args.input.prompt_profile,
      parameters_hash: canonicalHash(args.input.parameters),
      output_contract: args.outputContract,
      input: args.exactInput,
      ...(args.response.provider_request_id === undefined
        ? {}
        : { provider_request_id: args.response.provider_request_id }),
      outcome: args.outcome,
      ...(args.response.output === undefined
        ? {}
        : { raw_output: { payload: structuredClone(args.response.output) } }),
      ...(args.output === undefined ? {} : { output: args.output }),
      ...(args.failure === undefined ? {} : { failure: args.failure }),
      validation: args.validation,
      timing: args.response.timing,
      usage: args.response.usage,
      cost: args.response.cost,
    };
    const call: PetraModelCall = {
      schema_name: "petra.model-call",
      schema_version: "1.0.0",
      model_call_id: args.modelCallId,
      revision: 1,
      content,
      content_hash: canonicalHash(content),
      started_at: args.input.requested_at,
      completed_at: args.completedAt,
    };
    this.#contracts.assertValid("model-call", "1.0.0", call);
    return call;
  }

  #buildRequest(args: {
    input: ExtractorGatewayRequest;
    modelRequestId: string;
    outboundContext: PetraModelRequest["content"]["outbound_context"];
    parameters: PetraModelRequest["content"]["parameters"];
    outputContract: PetraModelRequest["content"]["output_contract"];
    routing: RoutingResult;
    terminal: PetraModelRequest["content"]["terminal"];
    completedAt: string;
  }): PetraModelRequest {
    const selected = args.routing.eligible[0];
    const content: PetraModelRequest["content"] = {
      project_id: args.input.project_id,
      workflow: {
        workflow_kind: "evidence_extraction",
        workflow_id: args.input.workflow_id,
      },
      role: "extractor",
      objective: args.input.objective,
      impact_class: args.input.impact_class,
      context_packet_ref: args.input.context_packet_ref,
      outbound_context: args.outboundContext,
      prompt_profile: args.input.prompt_profile,
      parameters: args.parameters,
      output_contract: args.outputContract,
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
        excluded: args.routing.excluded,
        ...(selected === undefined
          ? {}
          : {
              selected: {
                model_deployment_id:
                  selected.deployment.deployment.model_deployment_id,
                role_certification_id:
                  selected.certification.role_certification_id,
                reason:
                  "Selected deterministically by lowest expected validated cost, then latency, then stable deployment identity.",
              },
            }),
        fallback_chain: args.routing.eligible
          .slice(1)
          .map((route) => route.deployment.deployment.model_deployment_id),
      },
      budget: args.input.budget,
      terminal: args.terminal,
    };
    const request: PetraModelRequest = {
      schema_name: "petra.model-request",
      schema_version: "1.0.0",
      model_request_id: args.modelRequestId,
      revision: 1,
      content,
      content_hash: canonicalHash(content),
      created_at: args.input.requested_at,
      completed_at: args.completedAt,
    };
    this.#contracts.assertValid("model-request", "1.0.0", request);
    return request;
  }

  #storeCall(call: PetraModelCall): void {
    const existing = this.#calls.get(call.model_call_id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(call)
    ) {
      throw new ModelGatewayError(
        "MODEL_CALL_ID_REUSED",
        `ModelCall ${call.model_call_id} is already bound to different content.`,
      );
    }
    this.#calls.set(call.model_call_id, immutableCopy(call));
  }

  #storeRequest(request: PetraModelRequest): void {
    const existing = this.#requests.get(request.model_request_id);
    if (
      existing !== undefined &&
      canonicalize(existing) !== canonicalize(request)
    ) {
      throw new ModelGatewayError(
        "MODEL_REQUEST_ID_REUSED",
        `ModelRequest ${request.model_request_id} is already bound to different content.`,
      );
    }
    this.#requests.set(request.model_request_id, immutableCopy(request));
  }

  #existingExecution(
    modelRequestId: string,
  ): ModelGatewayExecution | undefined {
    const request = this.#requests.get(modelRequestId);
    if (request === undefined) return undefined;
    const calls = request.content.terminal.model_call_ids.map((modelCallId) => {
      const call = this.#calls.get(modelCallId);
      if (call === undefined) {
        throw new Error(
          `Stored ModelRequest ${modelRequestId} references missing ModelCall ${modelCallId}.`,
        );
      }
      return immutableCopy(call);
    });
    const proposalId = request.content.terminal.proposal_bundle_ids[0];
    const proposal =
      proposalId === undefined
        ? undefined
        : this.#proposalBundles.get(proposalId);
    if (proposalId !== undefined && proposal === undefined) {
      throw new Error(
        `Stored ModelRequest ${modelRequestId} references missing proposal ${proposalId}.`,
      );
    }
    return {
      request: immutableCopy(request),
      calls,
      ...(proposal === undefined
        ? {}
        : { proposal_bundle: immutableCopy(proposal) }),
    };
  }
}
