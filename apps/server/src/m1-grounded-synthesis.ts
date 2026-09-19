import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { projectSynthesistOutputSchemaForProvider } from "@petra/adapters";
import {
  CodexSubscriptionSynthesistAdapter,
  type CodexModelSummary,
  type CodexSubscriptionProviderPort,
} from "@petra/adapters/server";
import type {
  PetraActor,
  PetraContextPacket,
  PetraDomainEvent,
  PetraEvidencePacket,
  PetraInteractionFeatureManifest,
  PetraProject,
  ProjectModelReadyProvider,
  ProjectModelUnavailableProvider,
  PetraSourceSpan,
  PetraSynthesistRoleCertification,
} from "@petra/contracts";
import {
  buildSynthesistExactInput,
  type CertifiedProjectModelBinding,
  derivePetraId,
  GroundedSynthesisInteractionExecutor,
  InMemoryContextPacketRegistry,
  PETRA_GROUNDED_SYNTHESIST_PROFILE_V1_1,
  SynthesistGateway,
  synthesistRoutingPolicyHash,
  type GroundedSynthesisInteractionExecutorPort,
  type GroundedSynthesisPlan,
  type SynthesistExecutionRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";

const execFileAsync = promisify(execFile);

export const M1_GROUNDED_SYNTHESIS_QUESTION =
  PETRA_GROUNDED_SYNTHESIST_PROFILE_V1_1.publicQuestion;

/**
 * Builds the one canonical service Actor owned by the certified grounded
 * synthesist runtime. Fresh-store setup must use this exact content instead of
 * assigning a second display identity to the certification Actor ID.
 */
export const createM1GroundedSynthesisServiceActor = (certification: {
  readonly certified_by: PetraSynthesistRoleCertification["certified_by"];
  readonly certified_at: string;
}): PetraActor => ({
  schema_name: "petra.actor",
  schema_version: "1.0.0",
  actor_id: certification.certified_by.actor_id,
  actor_kind: "service",
  display_name: "Petra grounded synthesis service",
  created_at: certification.certified_at,
});

interface RecordedCodexSynthesistCertification {
  readonly schema_name: "petra.recorded-codex-synthesist-certification";
  readonly schema_version: "1.0.0";
  readonly runtime: {
    readonly name: "codex-app-server";
    readonly codex_version: string;
    readonly auth_mode: "chatgpt";
    readonly api_key_used: false;
    readonly api_key_configuration_supported: false;
    readonly model: string;
    readonly model_catalog_entry: CodexModelSummary;
    readonly effort: "low";
    readonly context_ceiling: number;
    readonly provider_schema_hash: string;
  };
  readonly certification: PetraSynthesistRoleCertification;
  readonly cases: readonly { readonly passed: boolean }[];
  readonly recorded_execution: {
    readonly endpoint_fingerprint: string;
    readonly gateway_latency_ms: number;
  };
  readonly gate: { readonly passed: boolean };
}

export interface M1GroundedSynthesisOptions {
  readonly provider: CodexSubscriptionProviderPort;
  readonly workspaceRoot: string;
  readonly codexCommand?: string;
  readonly codexRuntimeVersion?: string;
  readonly certificationPath?: string;
  readonly timeoutMs?: number;
  readonly now?: () => string;
  readonly executionRepository?: SynthesistExecutionRepository;
}

export interface M1GroundedSynthesisRuntime {
  readonly executor: GroundedSynthesisInteractionExecutorPort;
  readonly question: typeof M1_GROUNDED_SYNTHESIS_QUESTION;
  readonly model: string;
  readonly roleCertificationId: string;
  readonly contextPacketId: string;
  readonly evidencePacketId: string;
  readonly snapshotId: string;
  readonly projectModelBinding: CertifiedProjectModelBinding;
  readonly inspectProviderReadiness: (
    signal?: AbortSignal,
  ) => Promise<ProjectModelReadyProvider | ProjectModelUnavailableProvider>;
  readonly terminalContext: {
    readonly actors: readonly PetraActor[];
    readonly serviceActor: PetraActor;
    readonly project: PetraProject;
    readonly featureManifest: PetraInteractionFeatureManifest;
    readonly roleCertification: PetraSynthesistRoleCertification;
    readonly packets: InMemoryContextPacketRegistry;
  };
}

export class M1GroundedSynthesisConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "M1GroundedSynthesisConfigurationError";
  }
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const serviceRef = (actor: PetraActor) => ({
  actor_id: actor.actor_id,
  actor_kind: "service" as const,
});

const readJson = async <Value>(path: string): Promise<Value> =>
  JSON.parse(await readFile(path, "utf8")) as Value;

export const readCodexRuntimeVersion = async (
  command = "codex",
): Promise<string> => {
  const result = await execFileAsync(command, ["--version"], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1_048_576,
  });
  return result.stdout.trim();
};

const assertRecordedCertification = (
  record: RecordedCodexSynthesistCertification,
): void => {
  if (
    record.schema_name !== "petra.recorded-codex-synthesist-certification" ||
    record.schema_version !== "1.0.0" ||
    record.runtime.name !== "codex-app-server" ||
    record.runtime.auth_mode !== "chatgpt" ||
    record.runtime.api_key_used !== false ||
    record.runtime.api_key_configuration_supported !== false ||
    record.gate.passed !== true ||
    record.cases.length === 0 ||
    record.cases.some((item) => item.passed !== true) ||
    record.certification.decision.status !== "active"
  ) {
    throw new M1GroundedSynthesisConfigurationError(
      "The recorded Codex synthesist certification is incomplete or inactive.",
    );
  }
};

const assertNotCancelled = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted !== true) return;
  throw new Error("The grounded synthesis was cancelled before planning.");
};

export const createM1GroundedSynthesisRuntime = async (
  options: M1GroundedSynthesisOptions,
): Promise<M1GroundedSynthesisRuntime> => {
  const contractsRoot = join(options.workspaceRoot, "packages", "contracts");
  const certificationPath =
    options.certificationPath ??
    join(
      options.workspaceRoot,
      "config",
      "model-certifications",
      "codex-terra-synthesist-1.1.0.json",
    );
  const [
    canonicalSchema,
    commonSchema,
    context,
    evidence,
    event,
    actor,
    project,
    featureManifest,
    span,
    record,
    codexRuntimeVersion,
  ] = await Promise.all([
    readJson<Record<string, unknown>>(
      join(
        contractsRoot,
        "schemas",
        "model-synthesist-output",
        "1.0.0",
        "schema.json",
      ),
    ),
    readJson<Record<string, unknown>>(
      join(contractsRoot, "schemas", "common", "1.0.0", "schema.json"),
    ),
    readJson<PetraContextPacket>(
      join(contractsRoot, "fixtures", "accepted", "context-packet.json"),
    ),
    readJson<PetraEvidencePacket>(
      join(contractsRoot, "fixtures", "accepted", "evidence-packet.json"),
    ),
    readJson<PetraDomainEvent>(
      join(
        contractsRoot,
        "fixtures",
        "accepted",
        "domain-event-change-set-applied.json",
      ),
    ),
    readJson<PetraActor>(
      join(contractsRoot, "fixtures", "accepted", "actor.json"),
    ),
    readJson<PetraProject>(
      join(contractsRoot, "fixtures", "accepted", "project.json"),
    ),
    readJson<PetraInteractionFeatureManifest>(
      join(
        contractsRoot,
        "fixtures",
        "accepted",
        "interaction-feature-manifest.json",
      ),
    ),
    readJson<PetraSourceSpan>(
      join(contractsRoot, "fixtures", "accepted", "source-span.json"),
    ),
    readJson<RecordedCodexSynthesistCertification>(certificationPath),
    options.codexRuntimeVersion === undefined
      ? readCodexRuntimeVersion(options.codexCommand)
      : Promise.resolve(options.codexRuntimeVersion),
  ]);
  assertRecordedCertification(record);
  if (event.event.event_type !== "change_set.applied") {
    throw new M1GroundedSynthesisConfigurationError(
      "The M1 packet requires the recorded applied ChangeSet.",
    );
  }
  const serviceActor = createM1GroundedSynthesisServiceActor(
    record.certification,
  );
  context.compiled_by = serviceRef(serviceActor);
  evidence.compiled_by = serviceRef(serviceActor);
  featureManifest.compiled_by = serviceRef(serviceActor);

  const providerSchema = projectSynthesistOutputSchemaForProvider(
    canonicalSchema,
    commonSchema,
    { strictObjectProperties: true },
  );
  const providerSchemaHash = canonicalHash(providerSchema);
  if (
    codexRuntimeVersion !== record.runtime.codex_version ||
    providerSchemaHash !== record.runtime.provider_schema_hash
  ) {
    throw new M1GroundedSynthesisConfigurationError(
      "The Codex runtime or structured-output schema has drifted from the active synthesist certification.",
    );
  }

  const packets = new InMemoryContextPacketRegistry();
  packets.registerContextPacket(context, [
    event.event.payload.claim,
    event.event.payload.assertion,
    span,
  ]);
  packets.registerEvidencePacket(evidence);
  const profile = PETRA_GROUNDED_SYNTHESIST_PROFILE_V1_1;
  const exactInput = buildSynthesistExactInput(
    { objective: profile.objective, base_messages: profile.baseMessages },
    packets,
    context.context_packet_id,
    evidence.evidence_packet_id,
  );
  const promptProfile = record.certification.evaluation.prompt_profile;
  if (
    promptProfile.name !== profile.name ||
    promptProfile.version !== profile.version ||
    promptProfile.content_hash !== canonicalHash(exactInput.messages)
  ) {
    throw new M1GroundedSynthesisConfigurationError(
      "The grounded synthesist prompt has drifted from the active certification.",
    );
  }
  if (
    record.certification.deployment.provider_model !== record.runtime.model ||
    record.certification.deployment.max_context_tokens !==
      record.runtime.context_ceiling
  ) {
    throw new M1GroundedSynthesisConfigurationError(
      "The certified deployment does not match its recorded runtime.",
    );
  }

  const adapter = new CodexSubscriptionSynthesistAdapter({
    provider: options.provider,
    workspaceRoot: options.workspaceRoot,
    timeoutMs: options.timeoutMs ?? 120_000,
    outputSchema: {
      name: "petra_model_synthesist_output",
      description:
        "A bounded scientific response with explicit epistemic origins and exact evidence references.",
      schema: providerSchema,
    },
    effort: record.runtime.effort,
  });
  const gateway = new SynthesistGateway(
    packets,
    undefined,
    options.executionRepository,
  );
  gateway.registerDeployment(
    {
      deployment: record.certification.deployment,
      adapter_id: `codex-subscription-synthesist-${record.runtime.model}`,
      active: true,
      health: "healthy",
      provider_policy_verified: true,
      accepted_egress_classes: ["E1"],
      accepted_data_classes: [
        "open_full_text",
        "source_spans",
        "trusted_scientific_records",
      ],
      expected_validated_cost_usd: "0",
      expected_latency_ms: record.recorded_execution.gateway_latency_ms,
      endpoint_fingerprint: record.recorded_execution.endpoint_fingerprint,
    },
    adapter,
  );
  gateway.registerCertification(record.certification);

  const now = options.now ?? (() => new Date().toISOString());
  const inspectProviderReadiness = async (
    signal: AbortSignal | undefined,
  ): Promise<ProjectModelReadyProvider | ProjectModelUnavailableProvider> => {
    let account;
    try {
      assertNotCancelled(signal);
      account = await options.provider.readAccount();
      assertNotCancelled(signal);
    } catch (error) {
      if (signal?.aborted === true) throw error;
      return {
        state: "unavailable",
        provider_kind: "codex_app_server",
        model: record.runtime.model,
        message:
          error instanceof Error
            ? error.message
            : "The Codex account status is unavailable.",
      };
    }
    if (!account.authenticated || account.authMode !== "chatgpt") {
      return {
        state: "login_required",
        provider_kind: "codex_app_server",
        model: record.runtime.model,
        message:
          "A Codex-managed ChatGPT OAuth session is required; Petra will not use an API key.",
      };
    }
    let catalog;
    try {
      catalog = await options.provider.listModels();
      assertNotCancelled(signal);
    } catch (error) {
      if (signal?.aborted === true) throw error;
      return {
        state: "unavailable",
        provider_kind: "codex_app_server",
        model: record.runtime.model,
        message:
          error instanceof Error
            ? error.message
            : "The Codex model catalogue is unavailable.",
      };
    }
    const catalogEntry = catalog.find(
      (candidate) => candidate.model === record.runtime.model,
    );
    if (catalogEntry === undefined) {
      return {
        state: "model_unavailable",
        provider_kind: "codex_app_server",
        model: record.runtime.model,
        message: `The managed ChatGPT entitlement does not expose ${record.runtime.model}.`,
      };
    }
    const deploymentId = derivePetraId(
      "model_deployment",
      `m1.6-codex-synthesist-certification|${canonicalize({
        provider: "codex_app_server",
        model: record.runtime.model,
        codexVersion: codexRuntimeVersion,
        effort: record.runtime.effort,
        contextCeiling: record.runtime.context_ceiling,
        providerSchemaHash,
        promptHash: promptProfile.content_hash,
      })}`,
    );
    const endpointFingerprint = canonicalHash({
      runtime: "codex-app-server",
      codex_version: codexRuntimeVersion,
      auth_mode: account.authMode,
      model_catalog_entry: catalogEntry,
      model: record.runtime.model,
      effort: record.runtime.effort,
      context_ceiling: record.runtime.context_ceiling,
      provider_schema_hash: providerSchemaHash,
    });
    if (
      canonicalize(catalogEntry) !==
      canonicalize(record.runtime.model_catalog_entry)
    ) {
      return {
        state: "configuration_drift",
        provider_kind: "codex_app_server",
        model: record.runtime.model,
        message:
          "The entitlement catalog has drifted from the active synthesist certification.",
      };
    }
    if (deploymentId !== record.certification.deployment.model_deployment_id) {
      return {
        state: "configuration_drift",
        provider_kind: "codex_app_server",
        model: record.runtime.model,
        message:
          "The model deployment identity has drifted from the active synthesist certification.",
      };
    }
    if (
      endpointFingerprint !== record.recorded_execution.endpoint_fingerprint
    ) {
      return {
        state: "configuration_drift",
        provider_kind: "codex_app_server",
        model: record.runtime.model,
        message:
          "The provider endpoint fingerprint has drifted from the active synthesist certification.",
      };
    }
    return {
      state: "ready",
      provider_kind: "codex_app_server",
      auth_state: "authenticated",
      auth_mode: "chatgpt",
      model: record.runtime.model,
      message:
        "The certified model is available through Petra's managed ChatGPT session.",
    };
  };
  const assertProviderCompatible = async (
    signal: AbortSignal | undefined,
  ): Promise<void> => {
    const readiness = await inspectProviderReadiness(signal);
    if (readiness.state !== "ready") {
      throw new M1GroundedSynthesisConfigurationError(readiness.message);
    }
  };

  const routingPolicyContent = {
    routing_policy_id: derivePetraId(
      "routing_policy",
      `${record.runtime.model}|m1-grounded-synthesis`,
    ),
    revision: 1 as const,
    project_id: context.project_id,
    role: "synthesist" as const,
    active: true,
    permitted_deployment_ids: [
      record.certification.deployment.model_deployment_id,
    ],
    max_egress_class: "E1" as const,
    selection: "validated_cost_then_latency_then_identity" as const,
  };
  const planner = {
    async plan(request: {
      readonly prompt: string;
      readonly signal?: AbortSignal;
    }): Promise<GroundedSynthesisPlan> {
      assertNotCancelled(request.signal);
      if (request.prompt.trim() !== M1_GROUNDED_SYNTHESIS_QUESTION) {
        throw new M1GroundedSynthesisConfigurationError(
          `M1 grounded synthesis currently supports only: ${M1_GROUNDED_SYNTHESIS_QUESTION}`,
        );
      }
      await assertProviderCompatible(request.signal);
      return {
        hypothesis: profile.hypothesis,
        gateway_request: {
          project_id: context.project_id,
          workflow_id: derivePetraId(
            "synthesis_run",
            `${context.context_packet_id}|${evidence.evidence_packet_id}|${profile.version}`,
          ),
          objective: profile.objective,
          impact_class: "routine",
          context_packet_id: context.context_packet_id,
          evidence_packet_id: evidence.evidence_packet_id,
          egress_class: "E1",
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
          capability_grant_id: derivePetraId(
            "grant",
            `${record.runtime.model}|m1-grounded-synthesis`,
          ),
          purpose:
            "Managed-subscription bounded scientific synthesis from the frozen M1 EvidencePacket.",
          prompt_profile: promptProfile,
          base_messages: profile.baseMessages,
          parameters: { temperature: 0, max_output_tokens: 1600 },
          budget: {
            max_attempts: 1,
            max_input_tokens: 4096,
            max_output_tokens: 1600,
            max_latency_ms: options.timeoutMs ?? 120_000,
            max_cost_usd: "0",
          },
          estimated_input_tokens: 2000,
          certification_scope: profile.certificationScope,
          routing_policy: {
            ...routingPolicyContent,
            content_hash: synthesistRoutingPolicyHash(routingPolicyContent),
          },
          requested_by: {
            actor_id: derivePetraId(
              "actor",
              "petra-m1-grounded-synthesis-runtime",
            ),
            actor_kind: "service",
          },
          requested_at: now(),
        },
        snapshot_id: context.snapshot_ref.snapshot_id,
        authority_binding: {
          project_id: context.project_id,
          context_packet_ref: {
            record_id: context.context_packet_id,
            revision: context.revision,
            content_hash: context.content_hash,
          },
          evidence_packet_ref: {
            record_id: evidence.evidence_packet_id,
            revision: evidence.revision,
            content_hash: evidence.content_hash,
          },
          snapshot_ref: structuredClone(context.snapshot_ref),
        },
        retrieval: {
          route: "m1_frozen_certified_packet",
          lexical_ms: 0,
          graph_ms: 0,
          total_ms: 0,
        },
        packet_compilation: {
          context_ms: 0,
          evidence_ms: 0,
          total_ms: 0,
        },
        projection_ms: 0,
      };
    },
  };

  return {
    executor: new GroundedSynthesisInteractionExecutor(planner, gateway),
    question: M1_GROUNDED_SYNTHESIS_QUESTION,
    model: record.runtime.model,
    roleCertificationId: record.certification.role_certification_id,
    contextPacketId: context.context_packet_id,
    evidencePacketId: evidence.evidence_packet_id,
    snapshotId: context.snapshot_ref.snapshot_id,
    projectModelBinding: {
      project_id: context.project_id,
      role_semantic_key: "scientific.grounded-synthesist",
      role_contract: {
        name: "petra.model-role-certification",
        version: "1.1.0",
        content_hash:
          "sha256:7bab65763e37fc2bec0b9fa64d178ae37e769882717a445bb2a5f0fb650a40f1",
      },
      role_certification_ref: {
        role_certification_id: record.certification.role_certification_id,
        revision: record.certification.revision,
        content_hash: record.certification.content_hash,
      },
      snapshot_ref: structuredClone(context.snapshot_ref),
      context_packet_ref: {
        record_id: context.context_packet_id,
        revision: context.revision,
        content_hash: context.content_hash,
      },
      evidence_packet_ref: {
        record_id: evidence.evidence_packet_id,
        revision: evidence.revision,
        content_hash: evidence.content_hash,
      },
    },
    inspectProviderReadiness,
    terminalContext: {
      actors: [actor, serviceActor],
      serviceActor,
      project,
      featureManifest,
      roleCertification: record.certification,
      packets,
    },
  };
};
