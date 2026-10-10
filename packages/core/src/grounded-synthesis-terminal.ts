import { createHash } from "node:crypto";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraEvidencePacket,
  PetraGroundedResponse,
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionRun,
  PetraProject,
  PetraRightsDecision,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWorkUnit,
  WorkUnitCancellationCommand,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type { ArtifactAuthorityRepository } from "./artifact-registry.js";
import type { ArtifactStore, AvailableArtifact } from "./artifact-store.js";
import type { InMemoryContextPacketRegistry } from "./context-packet-registry.js";
import type { GroundedResponseAuthorityRepository } from "./grounded-response-registry.js";
import { groundedResponseCacheKey } from "./grounded-response-registry.js";
import type {
  GroundedSynthesisCancellationBinding,
  GroundedSynthesisCancellationPresentationRequest,
  GroundedSynthesisCancellationRequest,
  GroundedSynthesisTerminalBinding,
  GroundedSynthesisTerminalPort,
  GroundedSynthesisTerminalRequest,
  GroundedSynthesisWorkBinding,
  GroundedSynthesisWorkStartRequest,
} from "./grounded-synthesis-interaction.js";
import { derivePetraId } from "./identity.js";
import {
  DurableInteractionHistory,
  type InteractionHistoryPort,
} from "./interaction-history.js";
import type { InteractionAuthorityRepository } from "./interaction-authority-repository.js";
import type { PetraInteractionEvent } from "./interaction-runtime.js";
import type { ResearchScopeRepository } from "./research-scope-repository.js";
import type { SynthesistExecutionRepository } from "./synthesist-execution-repository.js";
import type { WorkUnitAuthorityRepository } from "./work-unit-authority-repository.js";

const RESPONSE_MEDIA_TYPE = "text/markdown; charset=utf-8" as const;
const PROMPT_MEDIA_TYPE = "text/plain; charset=utf-8" as const;
const WORKER_MEDIA_TYPE = "text/markdown" as const;
const MAX_RESPONSE_BYTES = 4_000_000;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const byteHash = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const laterTimestamp = (left: string, right: string): string =>
  new Date(left).getTime() >= new Date(right).getTime() ? left : right;

const clone = <Value>(value: Value): Value => structuredClone(value);

const petraCorrelationId = (
  kind: "request" | "trace",
  value: string,
): string =>
  new RegExp(`^${kind}_[0-9A-HJKMNP-TV-Z]{26}$`).test(value)
    ? value
    : derivePetraId(kind, value);

const mutableModelRequest = (
  value: GroundedSynthesisTerminalRequest["result"]["model_request"],
): PetraSynthesistModelRequest =>
  structuredClone(value) as PetraSynthesistModelRequest;

const mutableModelCall = (
  value: GroundedSynthesisTerminalRequest["result"]["model_call"],
): PetraSynthesistModelCall =>
  structuredClone(value) as PetraSynthesistModelCall;

const mutableEvidencePacket = (
  value: NonNullable<
    ReturnType<InMemoryContextPacketRegistry["getEvidencePacket"]>
  >,
): PetraEvidencePacket => structuredClone(value) as PetraEvidencePacket;

export interface GroundedSynthesisTerminalRecorderOptions {
  readonly actors: readonly PetraActor[];
  readonly serviceActor: PetraActor;
  readonly project: PetraProject;
  readonly featureManifest: PetraInteractionFeatureManifest;
  readonly roleCertification: PetraSynthesistRoleCertification;
  readonly packets: InMemoryContextPacketRegistry;
  readonly scopes: ResearchScopeRepository;
  readonly artifactStore: ArtifactStore;
  readonly artifacts: ArtifactAuthorityRepository;
  readonly executions: SynthesistExecutionRepository;
  readonly workUnits: WorkUnitAuthorityRepository;
  readonly interactions: InteractionAuthorityRepository;
  readonly groundedResponses: GroundedResponseAuthorityRepository;
  readonly interactionHistory?: InteractionHistoryPort;
  readonly runtimeVersion?: string;
}

export type GroundedSynthesisTerminalErrorCode =
  | "GROUNDED_TERMINAL_CONFIGURATION_INVALID"
  | "GROUNDED_TERMINAL_EXECUTION_MISMATCH"
  | "GROUNDED_TERMINAL_ARTIFACT_CONFLICT"
  | "GROUNDED_TERMINAL_CACHE_CONFLICT"
  | "GROUNDED_TERMINAL_PACKET_MISSING"
  | "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT";

export class GroundedSynthesisTerminalError extends Error {
  readonly code: GroundedSynthesisTerminalErrorCode;

  constructor(code: GroundedSynthesisTerminalErrorCode, message: string) {
    super(message);
    this.name = "GroundedSynthesisTerminalError";
    this.code = code;
  }
}

const serviceRef = (actor: PetraActor) => ({
  actor_id: actor.actor_id,
  actor_kind: "service" as const,
});

const ensureServiceConfiguration = (
  options: GroundedSynthesisTerminalRecorderOptions,
): void => {
  if (
    options.serviceActor.actor_kind !== "service" ||
    options.featureManifest.compiled_by.actor_id !==
      options.serviceActor.actor_id ||
    options.featureManifest.compiled_by.actor_kind !== "service" ||
    options.roleCertification.certified_by.actor_id !==
      options.serviceActor.actor_id ||
    options.roleCertification.certified_by.actor_kind !== "service" ||
    options.project.project_id.trim() === "" ||
    !options.actors.some(
      (actor) => actor.actor_id === options.serviceActor.actor_id,
    )
  ) {
    throw new GroundedSynthesisTerminalError(
      "GROUNDED_TERMINAL_CONFIGURATION_INVALID",
      "The terminal recorder requires one exact service-owned feature and certification configuration.",
    );
  }
};

const artifactIntegrity = (
  verification: Awaited<
    ReturnType<ArtifactStore["makeAvailable"]>
  >["verification"],
  checkedAt: string,
): PetraArtifactManifest["integrity"] => {
  if (verification.status === "verified") {
    return { status: "verified", checked_at: checkedAt, problems: [] };
  }
  const problems = verification.problems.map((message, index) => ({
    code: `STORE_WARNING_${String(index + 1).padStart(2, "0")}`,
    severity: "warning" as const,
    message,
  }));
  const first = problems[0] ?? {
    code: "STORE_WARNING_01",
    severity: "warning" as const,
    message: "The ArtifactStore reported verification with warnings.",
  };
  return {
    status: "verified_with_warnings",
    checked_at: checkedAt,
    problems: [first, ...problems.slice(1)],
  };
};

const terminalArtifactRecords = (
  request: GroundedSynthesisTerminalRequest,
  available: Awaited<ReturnType<ArtifactStore["makeAvailable"]>>,
  serviceActor: PetraActor,
): {
  artifact: PetraArtifact;
  manifest: PetraArtifactManifest;
  rightsDecision: PetraRightsDecision;
} => {
  const acquisitionSeed = `${request.result.model_request_id}|${available.contentHash}`;
  const artifactId = derivePetraId("artifact", available.contentHash);
  const manifestId = derivePetraId("artifact_manifest", acquisitionSeed);
  const rightsId = derivePetraId("rights_decision", acquisitionSeed);
  const actor = serviceRef(serviceActor);
  const artifact: PetraArtifact = {
    schema_name: "petra.artifact",
    schema_version: "1.0.0",
    artifact_id: artifactId,
    revision: 1,
    artifact_kind: "run_output",
    media_type: RESPONSE_MEDIA_TYPE,
    content_hash: available.contentHash,
    byte_size: available.byteSize,
    created_by: actor,
    created_at: available.availableAt,
  };
  const manifest: PetraArtifactManifest = {
    schema_name: "petra.artifact-manifest",
    schema_version: "1.0.0",
    artifact_manifest_id: manifestId,
    revision: 1,
    artifact_id: artifactId,
    rights_decision_id: rightsId,
    origin: {
      origin_kind: "generated",
      generator_name: "petra-grounded-terminal",
      generator_version: "1.0.0",
      generated_at: available.availableAt,
      input_artifact_ids: [],
    },
    storage_ref: {
      storage_kind: "content_addressed_object",
      store_name: available.storeName,
      object_key: available.objectKey,
      content_hash: available.contentHash,
      availability: "available",
      verified_at: available.availableAt,
    },
    integrity: artifactIntegrity(available.verification, available.availableAt),
    recorded_by: actor,
    recorded_at: available.availableAt,
  };
  const rightsDecision: PetraRightsDecision = {
    schema_name: "petra.rights-decision",
    schema_version: "1.0.0",
    rights_decision_id: rightsId,
    revision: 1,
    artifact_manifest_id: manifestId,
    source_location: `urn:petra:grounded-response:${request.result.model_request_id}`,
    license_status: "known",
    observed_license: {
      statement: "Petra-generated private research output.",
      source: "artifact",
    },
    access_basis: "permission",
    decision_status: "verified",
    permissions: {
      store_raw_bytes: true,
      parse: true,
      index: true,
      embed: true,
      send_selected_text_remotely: false,
      quote_publicly: false,
      redistribute_artifact: false,
    },
    conditions: [],
    required_notices: [],
    authorization_reference: "petra-private-generated-output/1.0.0",
    decision_maker: actor,
    rationale:
      "The response was generated inside the researcher's private Petra workspace and remains private by default.",
    observed_at: available.availableAt,
    policy_version: "petra-rights/1.0.0",
    created_at: available.availableAt,
  };
  return { artifact, manifest, rightsDecision };
};

const promptArtifactRecords = (
  request: GroundedSynthesisWorkStartRequest,
  available: AvailableArtifact,
  serviceActor: PetraActor,
): {
  artifact: PetraArtifact;
  manifest: PetraArtifactManifest;
  rightsDecision: PetraRightsDecision;
} => {
  const actor = serviceRef(serviceActor);
  const seed = `${request.interaction.protocol_thread_id}|${request.interaction.protocol_run_id}|${available.contentHash}`;
  const artifactId = derivePetraId("artifact", available.contentHash);
  const manifestId = derivePetraId("artifact_manifest", seed);
  const rightsId = derivePetraId("rights_decision", seed);
  const artifact: PetraArtifact = {
    schema_name: "petra.artifact",
    schema_version: "1.0.0",
    artifact_id: artifactId,
    revision: 1,
    artifact_kind: "structured_text",
    media_type: PROMPT_MEDIA_TYPE,
    content_hash: available.contentHash,
    byte_size: available.byteSize,
    created_by: actor,
    created_at: available.availableAt,
  };
  const manifest: PetraArtifactManifest = {
    schema_name: "petra.artifact-manifest",
    schema_version: "1.0.0",
    artifact_manifest_id: manifestId,
    revision: 1,
    artifact_id: artifactId,
    rights_decision_id: rightsId,
    origin: {
      origin_kind: "generated",
      generator_name: "petra-interaction-input",
      generator_version: "1.0.0",
      generated_at: available.availableAt,
      input_artifact_ids: [],
    },
    storage_ref: {
      storage_kind: "content_addressed_object",
      store_name: available.storeName,
      object_key: available.objectKey,
      content_hash: available.contentHash,
      availability: "available",
      verified_at: available.availableAt,
    },
    integrity: artifactIntegrity(available.verification, available.availableAt),
    recorded_by: actor,
    recorded_at: available.availableAt,
  };
  const rightsDecision: PetraRightsDecision = {
    schema_name: "petra.rights-decision",
    schema_version: "1.0.0",
    rights_decision_id: rightsId,
    revision: 1,
    artifact_manifest_id: manifestId,
    source_location: `urn:petra:interaction-input:${request.interaction.protocol_run_id}`,
    license_status: "known",
    observed_license: {
      statement: "Private authenticated interaction input.",
      source: "artifact",
    },
    access_basis: "permission",
    decision_status: "verified",
    permissions: {
      store_raw_bytes: true,
      parse: true,
      index: false,
      embed: false,
      send_selected_text_remotely: true,
      quote_publicly: false,
      redistribute_artifact: false,
    },
    conditions: [],
    required_notices: [],
    authorization_reference: "petra-private-interaction-input/1.0.0",
    decision_maker: actor,
    rationale:
      "The authenticated researcher supplied this private prompt for the requested model-assisted workflow.",
    observed_at: available.availableAt,
    policy_version: "petra-rights/1.0.0",
    created_at: available.availableAt,
  };
  return { artifact, manifest, rightsDecision };
};

const persistArtifactAcquisition = async (
  repository: ArtifactAuthorityRepository,
  records: {
    artifact: PetraArtifact;
    manifest: PetraArtifactManifest;
    rightsDecision: PetraRightsDecision;
  },
): Promise<void> => {
  const existing = await repository.getArtifact(records.artifact.artifact_id);
  if (existing === undefined) {
    try {
      await repository.registerVerifiedAcquisition(records);
      return;
    } catch (error) {
      const concurrent = await repository.getArtifact(
        records.artifact.artifact_id,
      );
      if (
        concurrent === undefined ||
        canonicalize(concurrent) !== canonicalize(records.artifact)
      ) {
        throw error;
      }
    }
  } else if (canonicalize(existing) !== canonicalize(records.artifact)) {
    throw new GroundedSynthesisTerminalError(
      "GROUNDED_TERMINAL_ARTIFACT_CONFLICT",
      "The byte identity is already bound to a different Artifact record.",
    );
  }
  await repository.attachVerifiedManifest({
    artifactId: records.artifact.artifact_id,
    manifest: records.manifest,
    rightsDecision: records.rightsDecision,
  });
};

const groundedWorkStartRecords = (
  request: GroundedSynthesisWorkStartRequest,
  promptArtifact: PetraArtifact,
  serviceActor: PetraActor,
  projectId: string,
  runtimeVersion: string,
  startedAt: string,
): { root: PetraWorkUnit; input: PetraWorkerInputManifest } => {
  const invocation = request.suggestedActionInvocation;
  const actor =
    invocation?.content.command_ref.actor ?? serviceRef(serviceActor);
  const inputId = derivePetraId(
    "worker_input_manifest",
    `${request.interaction.work_unit_id}|${promptArtifact.content_hash}|${invocation?.suggested_action_invocation_id ?? "direct"}`,
  );
  const worker = {
    executor_kind: "typescript_worker" as const,
    worker_name: "petra.grounded_synthesis",
    worker_version: "1.0.0",
    runtime_name: "node",
    runtime_version: runtimeVersion,
    entrypoint: "petra.grounded_synthesis.execute",
  };
  const inputContent: PetraWorkerInputManifest["content"] = {
    task: {
      task_family: "reasoning",
      task_name: "petra.synthesis.grounded",
      task_version: "1.0.0",
    },
    worker,
    inputs: [
      {
        binding_kind: "artifact",
        name: "research_prompt",
        artifact_id: promptArtifact.artifact_id,
        content_hash: promptArtifact.content_hash,
        byte_size: promptArtifact.byte_size,
      },
      ...(invocation === undefined
        ? []
        : [
            {
              binding_kind: "record" as const,
              name: "project_definition",
              record_id:
                invocation.content.exact_inputs.project_definition_ref
                  .project_definition_id,
              record_revision:
                invocation.content.exact_inputs.project_definition_ref.revision,
              snapshot_hash:
                invocation.content.exact_inputs.project_definition_ref
                  .record_hash,
            },
            {
              binding_kind: "record" as const,
              name: "objective",
              record_id:
                invocation.content.exact_inputs.objective_ref.objective_id,
              record_revision:
                invocation.content.exact_inputs.objective_ref.revision,
              snapshot_hash:
                invocation.content.exact_inputs.objective_ref.record_hash,
            },
            {
              binding_kind: "record" as const,
              name: "inquiry_result_link",
              record_id:
                invocation.content.exact_inputs.inquiry_result_link_ref
                  .project_inquiry_link_id,
              record_revision: 1,
              snapshot_hash:
                invocation.content.exact_inputs.inquiry_result_link_ref
                  .record_hash,
            },
            {
              binding_kind: "record" as const,
              name: "source_result",
              record_id:
                invocation.content.exact_inputs.source_result_ref.record_id,
              record_revision:
                invocation.content.exact_inputs.source_result_ref.revision,
              snapshot_hash:
                invocation.content.exact_inputs.source_result_ref.record_hash,
            },
            {
              binding_kind: "record" as const,
              name: "authority_snapshot",
              record_id:
                invocation.content.exact_inputs.snapshot_ref.snapshot_id,
              record_revision:
                invocation.content.exact_inputs.snapshot_ref.snapshot_revision,
              snapshot_hash:
                invocation.content.exact_inputs.snapshot_ref.content_hash,
            },
            {
              binding_kind: "record" as const,
              name: "context_packet",
              record_id:
                invocation.content.exact_inputs.context_packet_ref.record_id,
              record_revision:
                invocation.content.exact_inputs.context_packet_ref.revision,
              snapshot_hash:
                invocation.content.exact_inputs.context_packet_ref.content_hash,
            },
            {
              binding_kind: "record" as const,
              name: "evidence_packet",
              record_id:
                invocation.content.exact_inputs.evidence_packet_ref.record_id,
              record_revision:
                invocation.content.exact_inputs.evidence_packet_ref.revision,
              snapshot_hash:
                invocation.content.exact_inputs.evidence_packet_ref
                  .content_hash,
            },
          ]),
    ],
    expected_outputs: [
      {
        output_name: "grounded_response",
        output_role: "result",
        required: true,
        media_type: WORKER_MEDIA_TYPE,
        max_bytes: MAX_RESPONSE_BYTES,
      },
    ],
    resource_limits: {
      max_wall_time_ms: 120_000,
      max_output_bytes: MAX_RESPONSE_BYTES,
      max_attempts: 1,
      max_parallelism: 1,
      max_input_tokens: 4096,
      max_output_tokens: 1600,
    },
    network_policy: {
      network_mode: "allowlist",
      destinations: ["https://chatgpt.com/"],
    },
    partial_result_policy: "discard",
  };
  const input: PetraWorkerInputManifest = {
    schema_name: "petra.worker-input-manifest",
    schema_version: "1.0.0",
    worker_input_manifest_id: inputId,
    revision: 1,
    work_unit_id: request.interaction.work_unit_id,
    project_id: projectId,
    content: inputContent,
    content_hash: canonicalHash(inputContent),
    issued_by: actor,
    issued_at: startedAt,
  };
  const spec: PetraWorkUnit["spec"] = {
    workflow_name: "petra.synthesis.grounded",
    workflow_version: "1.0.0",
    objective:
      "Answer the exact authenticated research prompt through Petra's bounded grounded-synthesis workflow.",
    work_mode: "interactive",
    priority: "user_blocking",
    dependency_work_unit_ids: [],
    input_manifest_ref: {
      worker_input_manifest_id: inputId,
      content_hash: input.content_hash,
    },
    idempotency_key: `work:${derivePetraId(
      "operation",
      `${request.interaction.protocol_thread_id}|${request.interaction.protocol_run_id}|${promptArtifact.content_hash}`,
    )}`,
    cache: { cache_mode: "disabled" },
    cancellation_policy: "cancellable",
    checkpoint_policy: "disabled",
  };
  const root: PetraWorkUnit = {
    schema_name: "petra.work-unit",
    schema_version: "1.0.0",
    work_unit_id: request.interaction.work_unit_id,
    revision: 1,
    project_id: projectId,
    spec,
    spec_hash: canonicalHash(spec),
    status: { state: "requested", requested_at: startedAt },
    capability_grant_id:
      invocation?.content.command_ref.capability_grant_id ??
      derivePetraId(
        "capability_grant",
        `${request.interaction.work_unit_id}|grounded-synthesis`,
      ),
    trace_id: petraCorrelationId("trace", request.interaction.trace_id),
    created_by: actor,
    created_at: startedAt,
    updated_at: startedAt,
  };
  return { root, input };
};

const groundedWorkOutput = (
  request: GroundedSynthesisTerminalRequest,
  workUnit: PetraWorkUnit,
  input: PetraWorkerInputManifest,
  responseHash: string,
  responseBytes: number,
  completedAt: string,
): PetraWorkerOutputManifest => {
  const startedAt =
    workUnit.status.state === "running" ||
    workUnit.status.state === "checkpointed" ||
    workUnit.status.state === "completed" ||
    workUnit.status.state === "cancelled"
      ? workUnit.status.started_at
      : undefined;
  if (startedAt === undefined) {
    throw new GroundedSynthesisTerminalError(
      "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
      "The grounded WorkUnit must be running before it can produce a response.",
    );
  }
  const content: PetraWorkerOutputManifest["content"] = {
    worker: clone(input.content.worker),
    started_at: startedAt,
    completed_at: completedAt,
    outcome: {
      outcome_kind: "succeeded",
      produced_outputs: [
        {
          output_name: "grounded_response",
          output_role: "result",
          output_handle: `output:${derivePetraId("result", responseHash).slice("result_".length)}`,
          content_hash: responseHash,
          byte_size: responseBytes,
          media_type: WORKER_MEDIA_TYPE,
        },
      ],
    },
    diagnostics: [],
    network_activity: [],
    resource_usage: {
      wall_time_ms: Math.max(
        new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        0,
      ),
      cpu_time_ms: 0,
      peak_memory_bytes: 0,
      input_bytes: input.content.inputs.reduce(
        (total, binding) =>
          total + (binding.binding_kind === "artifact" ? binding.byte_size : 0),
        0,
      ),
      output_bytes: responseBytes,
      network_bytes: 0,
      ...(request.result.model_call.content.usage.input_tokens === undefined
        ? {}
        : {
            input_tokens: request.result.model_call.content.usage.input_tokens,
          }),
      ...(request.result.model_call.content.usage.output_tokens === undefined
        ? {}
        : {
            output_tokens:
              request.result.model_call.content.usage.output_tokens,
          }),
    },
  };
  return {
    schema_name: "petra.worker-output-manifest",
    schema_version: "1.0.0",
    worker_output_manifest_id: derivePetraId(
      "worker_output_manifest",
      `${request.interaction.work_unit_id}|${responseHash}`,
    ),
    revision: 1,
    work_unit_id: request.interaction.work_unit_id,
    project_id: workUnit.project_id,
    attempt: 1,
    worker_input_manifest_id: input.worker_input_manifest_id,
    worker_input_manifest_hash: input.content_hash,
    content,
    content_hash: canonicalHash(content),
    reported_at: completedAt,
  };
};

const terminalWorkRecords = (
  request: GroundedSynthesisTerminalRequest,
  cacheKey: string,
  responseHash: string,
  responseBytes: number,
  serviceActor: PetraActor,
  runtimeVersion: string,
  startedAt: string,
  completedAt: string,
): {
  root: PetraWorkUnit;
  input: PetraWorkerInputManifest;
  output: PetraWorkerOutputManifest;
} => {
  const modelRequest = request.result.model_request;
  const actor = serviceRef(serviceActor);
  const inputId = derivePetraId(
    "worker_input_manifest",
    `${request.interaction.work_unit_id}|${cacheKey}`,
  );
  const outputId = derivePetraId(
    "worker_output_manifest",
    `${request.interaction.work_unit_id}|${responseHash}`,
  );
  const worker = {
    executor_kind: "typescript_worker" as const,
    worker_name: "petra.grounded_terminal",
    worker_version: "1.0.0",
    runtime_name: "node",
    runtime_version: runtimeVersion,
    entrypoint: "petra.grounded_terminal.persist",
  };
  const inputContent: PetraWorkerInputManifest["content"] = {
    task: {
      task_family: "reasoning",
      task_name: "petra.synthesis.grounded",
      task_version: "1.0.0",
    },
    worker,
    inputs: [
      {
        binding_kind: "record",
        name: "context_packet",
        record_id: request.result.context_packet_ref.context_packet_id,
        record_revision: 1,
        snapshot_hash: request.result.context_packet_ref.content_hash,
      },
      {
        binding_kind: "record",
        name: "evidence_packet",
        record_id: request.result.evidence_packet_ref.evidence_packet_id,
        record_revision: 1,
        snapshot_hash: request.result.evidence_packet_ref.content_hash,
      },
      {
        binding_kind: "record",
        name: "model_request",
        record_id: request.result.model_request_id,
        record_revision: modelRequest.revision,
        snapshot_hash: modelRequest.content_hash,
      },
    ],
    expected_outputs: [
      {
        output_name: "grounded_response",
        output_role: "result",
        required: true,
        media_type: WORKER_MEDIA_TYPE,
        max_bytes: MAX_RESPONSE_BYTES,
      },
    ],
    resource_limits: {
      max_wall_time_ms: Math.max(
        new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        1,
      ),
      max_output_bytes: MAX_RESPONSE_BYTES,
      max_attempts: 1,
      max_parallelism: 1,
      max_input_tokens: modelRequest.content.budget.max_input_tokens,
      max_output_tokens: modelRequest.content.budget.max_output_tokens,
    },
    network_policy: { network_mode: "blocked" },
    partial_result_policy: "discard",
  };
  const input: PetraWorkerInputManifest = {
    schema_name: "petra.worker-input-manifest",
    schema_version: "1.0.0",
    worker_input_manifest_id: inputId,
    revision: 1,
    work_unit_id: request.interaction.work_unit_id,
    project_id: modelRequest.content.project_id,
    content: inputContent,
    content_hash: canonicalHash(inputContent),
    issued_by: actor,
    issued_at: startedAt,
  };
  const workSpec: PetraWorkUnit["spec"] = {
    workflow_name: "petra.synthesis.grounded",
    workflow_version: "1.0.0",
    objective: modelRequest.content.objective,
    work_mode: "interactive",
    priority: "user_blocking",
    dependency_work_unit_ids: [],
    input_manifest_ref: {
      worker_input_manifest_id: inputId,
      content_hash: input.content_hash,
    },
    idempotency_key: `work:${derivePetraId(
      "operation",
      `${request.interaction.protocol_thread_id}|${request.interaction.protocol_run_id}|${cacheKey}`,
    )}`,
    cache: { cache_mode: "reuse_exact", cache_key: cacheKey },
    cancellation_policy: "atomic",
    checkpoint_policy: "disabled",
  };
  const root: PetraWorkUnit = {
    schema_name: "petra.work-unit",
    schema_version: "1.0.0",
    work_unit_id: request.interaction.work_unit_id,
    revision: 1,
    project_id: modelRequest.content.project_id,
    spec: workSpec,
    spec_hash: canonicalHash(workSpec),
    status: { state: "requested", requested_at: startedAt },
    capability_grant_id: derivePetraId(
      "capability_grant",
      `${request.interaction.work_unit_id}|grounded-terminal`,
    ),
    trace_id: petraCorrelationId("trace", request.interaction.trace_id),
    created_by: actor,
    created_at: startedAt,
    updated_at: startedAt,
  };
  const outputContent: PetraWorkerOutputManifest["content"] = {
    worker,
    started_at: startedAt,
    completed_at: completedAt,
    outcome: {
      outcome_kind: "succeeded",
      produced_outputs: [
        {
          output_name: "grounded_response",
          output_role: "result",
          output_handle: `output:${derivePetraId("result", responseHash).slice("result_".length)}`,
          content_hash: responseHash,
          byte_size: responseBytes,
          media_type: WORKER_MEDIA_TYPE,
        },
      ],
    },
    diagnostics: [],
    network_activity: [],
    resource_usage: {
      wall_time_ms: Math.max(
        new Date(completedAt).getTime() - new Date(startedAt).getTime(),
        0,
      ),
      cpu_time_ms: 0,
      peak_memory_bytes: 0,
      input_bytes: 0,
      output_bytes: responseBytes,
      network_bytes: 0,
      ...(request.result.model_call.content.usage.input_tokens === undefined
        ? {}
        : {
            input_tokens: request.result.model_call.content.usage.input_tokens,
          }),
      ...(request.result.model_call.content.usage.output_tokens === undefined
        ? {}
        : {
            output_tokens:
              request.result.model_call.content.usage.output_tokens,
          }),
    },
  };
  const output: PetraWorkerOutputManifest = {
    schema_name: "petra.worker-output-manifest",
    schema_version: "1.0.0",
    worker_output_manifest_id: outputId,
    revision: 1,
    work_unit_id: request.interaction.work_unit_id,
    project_id: modelRequest.content.project_id,
    attempt: 1,
    worker_input_manifest_id: inputId,
    worker_input_manifest_hash: input.content_hash,
    content: outputContent,
    content_hash: canonicalHash(outputContent),
    reported_at: completedAt,
  };
  return { root, input, output };
};

const terminalInteractionRecords = (
  request: GroundedSynthesisTerminalRequest,
  workUnit: PetraWorkUnit,
  feature: PetraInteractionFeatureManifest,
  serviceActor: PetraActor,
  startedAt: string,
  persistedAt: string,
  events: readonly PetraInteractionEventRecord[],
): readonly [PetraInteractionRun, PetraInteractionRun] => {
  const actor = serviceRef(serviceActor);
  const interactionRunId = derivePetraId(
    "interaction_run",
    `${request.interaction.protocol_thread_id}|${request.interaction.protocol_run_id}`,
  );
  const workUnitRef = {
    work_unit_id: workUnit.work_unit_id,
    revision: workUnit.revision,
    spec_hash: workUnit.spec_hash,
  };
  const initialContent: PetraInteractionRun["content"] = {
    correlation: {
      protocol_thread_id: request.interaction.protocol_thread_id,
      protocol_run_id: request.interaction.protocol_run_id,
      request_id: petraCorrelationId("request", request.interaction.request_id),
      trace_id: petraCorrelationId("trace", request.interaction.trace_id),
      work_unit_ref: workUnitRef,
      model_request_id: request.result.model_request_id,
    },
    authority_context: {
      actor,
      capability_grant_id: workUnit.capability_grant_id,
      privacy_profile_ref: {
        record_id: derivePetraId("privacy_profile", interactionRunId),
        revision: 1,
        content_hash: canonicalHash({ profile: "private" }),
      },
      budget_profile_ref: {
        record_id: derivePetraId("budget_profile", interactionRunId),
        revision: 1,
        content_hash: canonicalHash(
          request.result.model_request.content.budget,
        ),
      },
    },
    input: {
      input_hash: canonicalHash({ prompt: request.prompt }),
      source_message_id: derivePetraId(
        "source_message",
        `${interactionRunId}|${request.prompt}`,
      ),
    },
    lifecycle: {
      state: "running",
      started_at: startedAt,
    },
    stream_head: { state: "empty", event_count: 0 },
    authority_boundary: {
      interaction_state_is_authoritative: false,
      events_are_domain_ledger: false,
      connection_abort_cancels_work: false,
    },
  };
  const initial: PetraInteractionRun = {
    schema_name: "petra.interaction-run",
    schema_version: "1.0.0",
    interaction_run_id: interactionRunId,
    revision: 1,
    project_id: request.result.model_request.content.project_id,
    feature_manifest_ref: {
      interaction_feature_manifest_id: feature.interaction_feature_manifest_id,
      revision: feature.revision,
      content_hash: feature.content_hash,
    },
    lineage: { lineage_kind: "root" },
    content: initialContent,
    content_hash: canonicalHash(initialContent),
    created_by: actor,
    created_at: startedAt,
    updated_at: startedAt,
  };
  const terminalContent: PetraInteractionRun["content"] = {
    ...clone(initialContent),
    lifecycle: {
      state: "completed",
      started_at: startedAt,
      ended_at: persistedAt,
      outcome_code: "GROUNDED_RESPONSE_READY",
    },
    stream_head:
      events.length === 0
        ? { state: "empty", event_count: 0 }
        : {
            state: "advanced",
            event_count: events.length,
            latest_sequence: events.length,
            head_hash: events.at(-1)!.content_hash,
          },
  };
  const terminal: PetraInteractionRun = {
    ...clone(initial),
    revision: 2,
    lineage: {
      lineage_kind: "revision",
      parent_revision: initial.revision,
      parent_hash: initial.content_hash,
    },
    content: terminalContent,
    content_hash: canonicalHash(terminalContent),
    updated_at: persistedAt,
  };
  return [initial, terminal];
};

const cancelledInteractionRoot = (
  request: GroundedSynthesisCancellationPresentationRequest,
  workUnit: PetraWorkUnit,
  feature: PetraInteractionFeatureManifest,
  serviceActor: PetraActor,
): PetraInteractionRun => {
  const actor = serviceRef(serviceActor);
  const interactionRunId = derivePetraId(
    "interaction_run",
    `${request.interaction.protocol_thread_id}|${request.interaction.protocol_run_id}`,
  );
  const content: PetraInteractionRun["content"] = {
    correlation: {
      protocol_thread_id: request.interaction.protocol_thread_id,
      protocol_run_id: request.interaction.protocol_run_id,
      request_id: petraCorrelationId("request", request.interaction.request_id),
      trace_id: petraCorrelationId("trace", request.interaction.trace_id),
      work_unit_ref: {
        work_unit_id: workUnit.work_unit_id,
        revision: workUnit.revision,
        spec_hash: workUnit.spec_hash,
      },
    },
    authority_context: {
      actor,
      capability_grant_id: workUnit.capability_grant_id,
      privacy_profile_ref: {
        record_id: derivePetraId("privacy_profile", interactionRunId),
        revision: 1,
        content_hash: canonicalHash({ profile: "private" }),
      },
      budget_profile_ref: {
        record_id: derivePetraId("budget_profile", interactionRunId),
        revision: 1,
        content_hash: canonicalHash({ workflow: "grounded_synthesis" }),
      },
    },
    input: {
      input_hash: canonicalHash({ prompt: request.prompt }),
      source_message_id: derivePetraId(
        "source_message",
        `${interactionRunId}|${request.prompt}`,
      ),
    },
    lifecycle: {
      state: "running",
      started_at: request.interaction.started_at,
    },
    stream_head: { state: "empty", event_count: 0 },
    authority_boundary: {
      interaction_state_is_authoritative: false,
      events_are_domain_ledger: false,
      connection_abort_cancels_work: false,
    },
  };
  return {
    schema_name: "petra.interaction-run",
    schema_version: "1.0.0",
    interaction_run_id: interactionRunId,
    revision: 1,
    project_id: workUnit.project_id,
    feature_manifest_ref: {
      interaction_feature_manifest_id: feature.interaction_feature_manifest_id,
      revision: feature.revision,
      content_hash: feature.content_hash,
    },
    lineage: { lineage_kind: "root" },
    content,
    content_hash: canonicalHash(content),
    created_by: actor,
    created_at: request.interaction.started_at,
    updated_at: request.interaction.started_at,
  };
};

const terminalGroundedResponse = (
  request: GroundedSynthesisTerminalRequest,
  artifact: PetraArtifact,
  workUnit: PetraWorkUnit,
  interaction: PetraInteractionRun,
  packets: InMemoryContextPacketRegistry,
  serviceActor: PetraActor,
  persistedAt: string,
): PetraGroundedResponse => {
  const context = packets.getContextPacket(
    request.result.context_packet_ref.context_packet_id,
  );
  const evidence = packets.getEvidencePacket(
    request.result.evidence_packet_ref.evidence_packet_id,
  );
  if (context === undefined || evidence === undefined) {
    throw new GroundedSynthesisTerminalError(
      "GROUNDED_TERMINAL_PACKET_MISSING",
      "The terminal cannot resolve the exact ContextPacket and EvidencePacket.",
    );
  }
  const dependencies = evidence.content.selected_evidence.map((selection) => ({
    dependency_role: "selected_evidence" as const,
    object_ref: clone(selection.object_ref),
  }));
  const cacheKey = groundedResponseCacheKey(
    mutableModelRequest(request.result.model_request),
    mutableEvidencePacket(evidence),
  );
  const content: PetraGroundedResponse["content"] = {
    response_artifact_ref: {
      artifact_id: artifact.artifact_id,
      content_hash: artifact.content_hash,
      byte_size: artifact.byte_size,
      media_type: RESPONSE_MEDIA_TYPE,
    },
    context_packet_ref: {
      context_packet_id: context.context_packet_id,
      revision: 1,
      content_hash: context.content_hash,
    },
    evidence_packet_ref: {
      evidence_packet_id: evidence.evidence_packet_id,
      revision: 1,
      content_hash: evidence.content_hash,
    },
    snapshot_ref: clone(evidence.snapshot_ref),
    execution_ref: {
      model_request_id: request.result.model_request_id,
      model_call_id: request.result.model_call_id,
      model_deployment_id: request.result.model_deployment_id,
      role_certification_id: request.result.role_certification_id,
    },
    interaction_ref: {
      interaction_run_ref: {
        interaction_run_id: interaction.interaction_run_id,
        revision: interaction.revision,
        content_hash: interaction.content_hash,
      },
      work_unit_ref: {
        work_unit_id: workUnit.work_unit_id,
        revision: workUnit.revision,
        spec_hash: workUnit.spec_hash,
      },
    },
    dependencies: [dependencies[0]!, ...dependencies.slice(1)],
    model_output_hash: request.result.output_hash,
    cache: { state: "reusable", cache_key: cacheKey, checked_at: persistedAt },
    terminal: {
      state: "completed",
      persisted_at: persistedAt,
      authority_effect: "none",
    },
  };
  return {
    schema_name: "petra.grounded-response",
    schema_version: "1.0.0",
    grounded_response_id: derivePetraId(
      "grounded_response",
      `${request.result.model_request_id}|${cacheKey}`,
    ),
    revision: 1,
    project_id: request.result.model_request.content.project_id,
    lineage: { lineage_kind: "root" },
    content,
    content_hash: canonicalHash(content),
    recorded_by: serviceRef(serviceActor),
    recorded_at: persistedAt,
  };
};

const assertReusableResponseMatches = (
  response: PetraGroundedResponse,
  request: GroundedSynthesisTerminalRequest,
  artifact: PetraArtifact,
): void => {
  const content = response.content;
  if (
    response.project_id !== request.result.model_request.content.project_id ||
    content.response_artifact_ref.artifact_id !== artifact.artifact_id ||
    content.response_artifact_ref.content_hash !== artifact.content_hash ||
    content.response_artifact_ref.byte_size !== artifact.byte_size ||
    content.context_packet_ref.context_packet_id !==
      request.result.context_packet_ref.context_packet_id ||
    content.context_packet_ref.content_hash !==
      request.result.context_packet_ref.content_hash ||
    content.evidence_packet_ref.evidence_packet_id !==
      request.result.evidence_packet_ref.evidence_packet_id ||
    content.evidence_packet_ref.content_hash !==
      request.result.evidence_packet_ref.content_hash ||
    content.execution_ref.model_request_id !==
      request.result.model_request_id ||
    content.execution_ref.model_call_id !== request.result.model_call_id ||
    content.execution_ref.model_deployment_id !==
      request.result.model_deployment_id ||
    content.execution_ref.role_certification_id !==
      request.result.role_certification_id ||
    content.model_output_hash !== request.result.output_hash
  ) {
    throw new GroundedSynthesisTerminalError(
      "GROUNDED_TERMINAL_CACHE_CONFLICT",
      "The reusable grounded response does not match the exact execution, packets, and response bytes.",
    );
  }
};

const terminalBinding = (
  grounded: PetraGroundedResponse,
  artifact: PetraArtifact,
  interaction: PetraInteractionRun,
  workUnit: PetraWorkUnit,
): GroundedSynthesisTerminalBinding => ({
  grounded_response_id: grounded.grounded_response_id,
  grounded_response_revision: grounded.revision,
  grounded_response_hash: grounded.content_hash,
  response_artifact_id: artifact.artifact_id,
  response_artifact_hash: artifact.content_hash,
  interaction_run_id: interaction.interaction_run_id,
  interaction_run_revision: interaction.revision,
  interaction_run_hash: interaction.content_hash,
  work_unit_id: workUnit.work_unit_id,
  work_unit_revision: workUnit.revision,
  work_unit_spec_hash: workUnit.spec_hash,
  persisted_at: interaction.updated_at,
});

export class GroundedSynthesisTerminalRecorder implements GroundedSynthesisTerminalPort {
  readonly #options: GroundedSynthesisTerminalRecorderOptions;
  readonly #history: InteractionHistoryPort;

  constructor(options: GroundedSynthesisTerminalRecorderOptions) {
    ensureServiceConfiguration(options);
    this.#options = options;
    this.#history =
      options.interactionHistory ??
      new DurableInteractionHistory({
        serviceActor: options.serviceActor,
        artifactStore: options.artifactStore,
        artifacts: options.artifacts,
        interactions: options.interactions,
        workUnits: options.workUnits,
      });
  }

  async startWork(
    request: GroundedSynthesisWorkStartRequest,
  ): Promise<GroundedSynthesisWorkBinding> {
    const options = this.#options;
    if (request.prompt.trim().length === 0) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_EXECUTION_MISMATCH",
        "A grounded WorkUnit requires a non-empty research prompt.",
      );
    }
    const invocation = request.suggestedActionInvocation;
    if (
      invocation !== undefined &&
      (invocation.project_id !== options.project.project_id ||
        invocation.content_hash !== canonicalHash(invocation.content) ||
        invocation.content.expected_work_unit_id !==
          request.interaction.work_unit_id ||
        invocation.content.interaction.protocol_thread_id !==
          request.interaction.protocol_thread_id ||
        invocation.content.interaction.protocol_run_id !==
          request.interaction.protocol_run_id ||
        invocation.content.command_ref.correlation_id !==
          request.interaction.trace_id ||
        invocation.content.exact_inputs.prompt_hash !==
          canonicalHash({ prompt: request.prompt }))
    ) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_EXECUTION_MISMATCH",
        "The SuggestedAction invocation does not match this exact Project, prompt, Work identity, and interaction correlation.",
      );
    }
    for (const actor of options.actors)
      await options.scopes.registerActor(actor);
    await options.scopes.registerProjectRevision(options.project);

    const promptBytes = new TextEncoder().encode(request.prompt);
    const promptHash = byteHash(promptBytes);
    const expectedArtifactId = derivePetraId("artifact", promptHash);
    const existing = await options.workUnits.getWorkUnit(
      request.interaction.work_unit_id,
    );
    if (existing !== undefined) {
      const input = await options.workUnits.getInputManifest(
        existing.spec.input_manifest_ref.worker_input_manifest_id,
      );
      const promptBinding = input?.content.inputs.find(
        (binding) => binding.name === "research_prompt",
      );
      const expectedRecords = groundedWorkStartRecords(
        request,
        {
          schema_name: "petra.artifact",
          schema_version: "1.0.0",
          artifact_id: expectedArtifactId,
          revision: 1,
          artifact_kind: "structured_text",
          media_type: PROMPT_MEDIA_TYPE,
          content_hash: promptHash,
          byte_size: promptBytes.byteLength,
          created_by:
            invocation?.content.command_ref.actor ??
            serviceRef(options.serviceActor),
          created_at: existing.created_at,
        },
        options.serviceActor,
        options.project.project_id,
        options.runtimeVersion ?? process.versions.node,
        existing.created_at,
      );
      if (
        existing.project_id !== options.project.project_id ||
        existing.spec_hash !== canonicalHash(existing.spec) ||
        input === undefined ||
        input.content_hash !== existing.spec.input_manifest_ref.content_hash ||
        promptBinding?.binding_kind !== "artifact" ||
        promptBinding.artifact_id !== expectedArtifactId ||
        promptBinding.content_hash !== promptHash ||
        canonicalize(input.content.inputs) !==
          canonicalize(expectedRecords.input.content.inputs) ||
        existing.capability_grant_id !==
          expectedRecords.root.capability_grant_id ||
        canonicalize(existing.created_by) !==
          canonicalize(expectedRecords.root.created_by) ||
        existing.spec.cancellation_policy !== "cancellable" ||
        existing.status.state === "checkpointed"
      ) {
        throw new GroundedSynthesisTerminalError(
          "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
          "The existing grounded WorkUnit does not match this exact prompt and cancellable workflow.",
        );
      }
      let recovered = existing;
      const resumedAt = laterTimestamp(
        existing.updated_at,
        request.interaction.started_at,
      );
      if (recovered.status.state === "requested") {
        recovered = await options.workUnits.queue(
          recovered.work_unit_id,
          recovered.revision,
          resumedAt,
        );
      }
      if (recovered.status.state === "queued") {
        recovered = await options.workUnits.start(
          recovered.work_unit_id,
          recovered.revision,
          1,
          resumedAt,
        );
      }
      const recoveredState = recovered.status.state;
      if (recoveredState === "checkpointed") {
        throw new GroundedSynthesisTerminalError(
          "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
          "Checkpointed grounded work cannot resume without an accepted checkpoint command.",
        );
      }
      return {
        work_unit_id: recovered.work_unit_id,
        work_unit_revision: recovered.revision,
        work_unit_spec_hash: recovered.spec_hash,
        state: recoveredState,
        started_at:
          "started_at" in recovered.status
            ? recovered.status.started_at
            : recovered.created_at,
      };
    }

    const staged = await options.artifactStore.stage({
      bytes: [promptBytes],
      declaredByteSize: promptBytes.byteLength,
      declaredMediaType: PROMPT_MEDIA_TYPE,
      expectedContentHash: promptHash,
    });
    const available = await options.artifactStore.makeAvailable(staged);
    const promptRecords = promptArtifactRecords(
      request,
      available,
      options.serviceActor,
    );
    await persistArtifactAcquisition(options.artifacts, promptRecords);
    const startedAt = laterTimestamp(
      request.interaction.started_at,
      available.availableAt,
    );
    const records = groundedWorkStartRecords(
      request,
      promptRecords.artifact,
      options.serviceActor,
      options.project.project_id,
      options.runtimeVersion ?? process.versions.node,
      startedAt,
    );
    let workUnit = await options.workUnits.register({
      workUnit: records.root,
      inputManifest: records.input,
    });
    if (workUnit.status.state === "requested") {
      workUnit = await options.workUnits.queue(
        workUnit.work_unit_id,
        workUnit.revision,
        startedAt,
      );
    }
    if (workUnit.status.state === "queued") {
      workUnit = await options.workUnits.start(
        workUnit.work_unit_id,
        workUnit.revision,
        1,
        startedAt,
      );
    }
    if (workUnit.status.state !== "running") {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
        "The grounded WorkUnit did not enter its running state.",
      );
    }
    return {
      work_unit_id: workUnit.work_unit_id,
      work_unit_revision: workUnit.revision,
      work_unit_spec_hash: workUnit.spec_hash,
      state: workUnit.status.state,
      started_at: workUnit.status.started_at,
    };
  }

  async cancelWork(
    request: GroundedSynthesisCancellationRequest,
  ): Promise<GroundedSynthesisCancellationBinding> {
    const workUnit = await this.#options.workUnits.getWorkUnit(
      request.work.work_unit_id,
    );
    if (
      workUnit === undefined ||
      workUnit.spec_hash !== request.work.work_unit_spec_hash ||
      request.work.state !== "running"
    ) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
        "Cancellation must target the exact running grounded WorkUnit.",
      );
    }
    const prior = await this.#options.workUnits.getCancellationByCommand(
      request.command_id,
    );
    const proposed: WorkUnitCancellationCommand = {
      command_name: "CancelWorkUnit",
      command_id: request.command_id,
      idempotency_key: `cancel:${request.interaction.protocol_run_id}:${request.command_id}`,
      expected_work_unit_ref: {
        work_unit_id: request.work.work_unit_id,
        revision: request.work.work_unit_revision,
        spec_hash: request.work.work_unit_spec_hash,
      },
      interaction: {
        protocol_thread_id: request.interaction.protocol_thread_id,
        protocol_run_id: request.interaction.protocol_run_id,
      },
      reason: request.reason,
      requested_by: serviceRef(this.#options.serviceActor),
      capability_grant_id: workUnit.capability_grant_id,
      trace_id: petraCorrelationId("trace", request.interaction.trace_id),
      requested_at: request.requested_at,
    };
    if (
      prior !== undefined &&
      (prior.content.command.command_id !== proposed.command_id ||
        prior.content.command.idempotency_key !== proposed.idempotency_key ||
        canonicalize(prior.content.command.expected_work_unit_ref) !==
          canonicalize(proposed.expected_work_unit_ref) ||
        canonicalize(prior.content.command.interaction) !==
          canonicalize(proposed.interaction) ||
        prior.content.command.reason !== proposed.reason ||
        canonicalize(prior.content.command.requested_by) !==
          canonicalize(proposed.requested_by) ||
        prior.content.command.capability_grant_id !==
          proposed.capability_grant_id ||
        prior.content.command.trace_id !== proposed.trace_id)
    ) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
        "The cancellation command identity is already bound to different input.",
      );
    }
    const command =
      prior === undefined ? proposed : clone(prior.content.command);
    const result = await this.#options.workUnits.cancelByCommand(command);
    return {
      work_unit_cancellation_id: result.cancellation.work_unit_cancellation_id,
      command_id: command.command_id,
      cancellation_hash: result.cancellation.content_hash,
      applied: result.applied,
      work_unit_id: result.workUnit.work_unit_id,
      work_unit_revision: result.workUnit.revision,
      work_unit_spec_hash: result.workUnit.spec_hash,
      cancelled_at: result.cancellation.content.outcome.cancelled_at,
    };
  }

  async persistCancellation(
    request: GroundedSynthesisCancellationPresentationRequest,
  ): Promise<void> {
    const cancellation = await this.#options.workUnits.getCancellationByCommand(
      request.cancellation.command_id,
    );
    const workUnit = await this.#options.workUnits.getWorkUnitRevision(
      request.cancellation.work_unit_id,
      request.cancellation.work_unit_revision,
    );
    if (
      cancellation === undefined ||
      cancellation.work_unit_cancellation_id !==
        request.cancellation.work_unit_cancellation_id ||
      cancellation.content_hash !== request.cancellation.cancellation_hash ||
      workUnit === undefined ||
      workUnit.spec_hash !== request.cancellation.work_unit_spec_hash ||
      workUnit.status.state !== "cancelled"
    ) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
        "Cancelled interaction history requires the exact durable cancellation and WorkUnit revision.",
      );
    }
    await this.#options.interactions.registerFeatureManifest(
      this.#options.featureManifest,
    );
    const root = cancelledInteractionRoot(
      request,
      workUnit,
      this.#options.featureManifest,
      this.#options.serviceActor,
    );
    const existing =
      await this.#options.interactions.getRunByProtocolCorrelation(
        request.interaction.protocol_thread_id,
        request.interaction.protocol_run_id,
      );
    if (existing?.content.lifecycle.state === "cancelled") return;
    if (existing !== undefined) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
        "The interaction correlation is already bound to a different terminal outcome.",
      );
    }
    const initial = await this.#options.interactions.registerRun(root);
    const events = await this.#history.persistEvents(
      initial,
      request.presentation_events,
    );
    await this.#history.advanceRun(
      initial,
      events,
      {
        state: "cancelled",
        started_at: request.interaction.started_at,
        ended_at: request.cancellation.cancelled_at,
        outcome_code: "WORK_UNIT_CANCELLED",
      },
      request.cancellation.cancelled_at,
    );
  }

  async persist(
    request: GroundedSynthesisTerminalRequest,
  ): Promise<GroundedSynthesisTerminalBinding> {
    const options = this.#options;
    const modelRequest = mutableModelRequest(request.result.model_request);
    const modelCall = mutableModelCall(request.result.model_call);
    if (
      request.result.model_request_id !== modelRequest.model_request_id ||
      request.result.model_call_id !== modelCall.model_call_id ||
      modelCall.content.model_request_id !== modelRequest.model_request_id ||
      modelRequest.content.project_id !== options.project.project_id
    ) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_EXECUTION_MISMATCH",
        "The terminal request does not identify one exact Project-scoped model execution.",
      );
    }

    for (const actor of options.actors)
      await options.scopes.registerActor(actor);
    await options.scopes.registerProjectRevision(options.project);
    await options.executions.registerCertification(options.roleCertification);
    await options.executions.persistExecution({
      request: modelRequest,
      calls: [modelCall],
    });

    const responseBytes = new TextEncoder().encode(
      request.result.rendered_text,
    );
    if (responseBytes.byteLength > MAX_RESPONSE_BYTES) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_EXECUTION_MISMATCH",
        "The rendered response exceeds Petra's grounded terminal limit.",
      );
    }
    const staged = await options.artifactStore.stage({
      bytes: [responseBytes],
      declaredByteSize: responseBytes.byteLength,
      declaredMediaType: RESPONSE_MEDIA_TYPE,
      expectedContentHash: byteHash(responseBytes),
    });
    const available = await options.artifactStore.makeAvailable(staged);
    const artifactRecords = terminalArtifactRecords(
      request,
      available,
      options.serviceActor,
    );
    await persistArtifactAcquisition(options.artifacts, artifactRecords);

    const evidence = options.packets.getEvidencePacket(
      request.result.evidence_packet_ref.evidence_packet_id,
    );
    if (evidence === undefined) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_PACKET_MISSING",
        "The terminal EvidencePacket is not registered.",
      );
    }
    const cacheKey = groundedResponseCacheKey(
      modelRequest,
      mutableEvidencePacket(evidence),
    );
    const priorWorkUnit = await options.workUnits.getWorkUnit(
      request.interaction.work_unit_id,
    );
    let startedAt: string;
    let persistedAt: string;
    let workUnit: PetraWorkUnit;
    if (
      priorWorkUnit === undefined ||
      priorWorkUnit.spec.cancellation_policy !== "cancellable"
    ) {
      startedAt = priorWorkUnit?.created_at ?? request.interaction.started_at;
      persistedAt =
        priorWorkUnit?.status.state === "completed"
          ? priorWorkUnit.updated_at
          : laterTimestamp(startedAt, available.availableAt);
      const workRecords = terminalWorkRecords(
        request,
        cacheKey,
        artifactRecords.artifact.content_hash,
        artifactRecords.artifact.byte_size,
        options.serviceActor,
        options.runtimeVersion ?? process.versions.node,
        startedAt,
        persistedAt,
      );
      workUnit = await options.workUnits.register({
        workUnit: workRecords.root,
        inputManifest: workRecords.input,
      });
      if (workUnit.status.state === "requested") {
        workUnit = await options.workUnits.queue(
          workUnit.work_unit_id,
          workUnit.revision,
          startedAt,
        );
      }
      if (workUnit.status.state === "queued") {
        workUnit = await options.workUnits.start(
          workUnit.work_unit_id,
          workUnit.revision,
          1,
          startedAt,
        );
      }
      if (workUnit.status.state === "running") {
        workUnit = await options.workUnits.complete(
          workRecords.output,
          workUnit.revision,
        );
      }
    } else {
      if (priorWorkUnit.project_id !== options.project.project_id) {
        throw new GroundedSynthesisTerminalError(
          "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
          "The cancellable grounded WorkUnit belongs to a different Project.",
        );
      }
      const input = await options.workUnits.getInputManifest(
        priorWorkUnit.spec.input_manifest_ref.worker_input_manifest_id,
      );
      if (
        input === undefined ||
        input.content_hash !==
          priorWorkUnit.spec.input_manifest_ref.content_hash ||
        input.work_unit_id !== priorWorkUnit.work_unit_id
      ) {
        throw new GroundedSynthesisTerminalError(
          "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
          "The cancellable grounded WorkUnit lost its exact input manifest.",
        );
      }
      startedAt =
        "started_at" in priorWorkUnit.status
          ? priorWorkUnit.status.started_at
          : priorWorkUnit.created_at;
      persistedAt =
        priorWorkUnit.status.state === "completed"
          ? priorWorkUnit.updated_at
          : laterTimestamp(startedAt, available.availableAt);
      workUnit = priorWorkUnit;
      if (workUnit.status.state === "running") {
        workUnit = await options.workUnits.complete(
          groundedWorkOutput(
            request,
            workUnit,
            input,
            artifactRecords.artifact.content_hash,
            artifactRecords.artifact.byte_size,
            persistedAt,
          ),
          workUnit.revision,
        );
      }
      if (workUnit.status.state === "completed") {
        const output =
          workUnit.status.output_manifest_ref === undefined
            ? undefined
            : await options.workUnits.getOutputManifest(
                workUnit.status.output_manifest_ref.worker_output_manifest_id,
              );
        const responseOutput =
          output?.content.outcome.outcome_kind === "succeeded"
            ? output.content.outcome.produced_outputs.find(
                (candidate) => candidate.output_name === "grounded_response",
              )
            : undefined;
        if (
          responseOutput?.content_hash !==
            artifactRecords.artifact.content_hash ||
          responseOutput.byte_size !== artifactRecords.artifact.byte_size
        ) {
          throw new GroundedSynthesisTerminalError(
            "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
            "The completed grounded WorkUnit does not identify this exact response Artifact.",
          );
        }
      }
    }
    if (
      workUnit.status.state !== "completed" ||
      workUnit.status.terminal_outcome !== "succeeded"
    ) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_WORK_UNIT_CONFLICT",
        "The grounded terminal WorkUnit did not converge on a successful terminal revision.",
      );
    }

    await options.interactions.registerFeatureManifest(options.featureManifest);
    const provisionalInteractionRecords = terminalInteractionRecords(
      request,
      workUnit,
      options.featureManifest,
      options.serviceActor,
      startedAt,
      persistedAt,
      [],
    );
    const initialInteraction = await options.interactions.registerRun(
      provisionalInteractionRecords[0],
    );
    const eventRecords = await this.#history.persistEvents(
      initialInteraction,
      request.presentation_events,
    );
    const interactionPersistedAt = laterTimestamp(
      persistedAt,
      eventRecords.at(-1)?.recorded_at ?? persistedAt,
    );
    const interactionRecords = terminalInteractionRecords(
      request,
      workUnit,
      options.featureManifest,
      options.serviceActor,
      startedAt,
      interactionPersistedAt,
      eventRecords,
    );
    const interaction = await options.interactions.registerRun(
      interactionRecords[1],
    );

    const reusable =
      await options.groundedResponses.getReusableByCacheKey(cacheKey);
    if (reusable !== undefined) {
      const mutableReusable = clone(reusable);
      assertReusableResponseMatches(
        mutableReusable,
        request,
        artifactRecords.artifact,
      );
      return terminalBinding(
        mutableReusable,
        artifactRecords.artifact,
        interaction,
        workUnit,
      );
    }

    const response = terminalGroundedResponse(
      request,
      artifactRecords.artifact,
      workUnit,
      interaction,
      options.packets,
      options.serviceActor,
      interactionPersistedAt,
    );
    const grounded = await options.groundedResponses.register({
      response,
      responseArtifact: artifactRecords.artifact,
      responseBytes,
      modelRequest,
      modelCall,
      interactionRun: interaction,
      workUnit,
    });
    return terminalBinding(
      grounded,
      artifactRecords.artifact,
      interaction,
      workUnit,
    );
  }

  async persistPresentation(request: {
    readonly binding: GroundedSynthesisTerminalBinding;
    readonly events: readonly PetraInteractionEvent[];
  }): Promise<void> {
    const boundRun = await this.#options.interactions.getRunRevision(
      request.binding.interaction_run_id,
      request.binding.interaction_run_revision,
    );
    if (
      boundRun === undefined ||
      boundRun.content_hash !== request.binding.interaction_run_hash ||
      boundRun.content.correlation.work_unit_ref.work_unit_id !==
        request.binding.work_unit_id ||
      boundRun.content.lifecycle.state !== "completed"
    ) {
      throw new GroundedSynthesisTerminalError(
        "GROUNDED_TERMINAL_EXECUTION_MISMATCH",
        "The answer-bearing presentation suffix does not match its grounded terminal.",
      );
    }
    const current =
      (await this.#options.interactions.getRun(boundRun.interaction_run_id)) ??
      boundRun;
    const eventRecords = await this.#history.persistEvents(
      current,
      request.events,
    );
    await this.#history.advanceRun(
      current,
      eventRecords,
      current.content.lifecycle,
      eventRecords.at(-1)?.recorded_at ?? current.updated_at,
    );
  }
}
