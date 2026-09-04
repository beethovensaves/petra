import { createHash } from "node:crypto";

import type {
  PetraArtifact,
  PetraDomainEventRecord,
  PetraEvidencePacket,
  PetraGroundedResponse,
  PetraInteractionRun,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraWorkUnit,
} from "@petra/contracts";
import { PetraContractRegistry } from "@petra/contracts/validator";
import { canonicalize } from "json-canonicalize";

import type {
  DeepReadonly,
  InMemoryContextPacketRegistry,
} from "./context-packet-registry.js";

export type GroundedResponseErrorCode =
  | "GROUNDED_RESPONSE_CONTENT_HASH_MISMATCH"
  | "GROUNDED_RESPONSE_ID_ALREADY_REGISTERED"
  | "GROUNDED_RESPONSE_INITIAL_REVISION_INVALID"
  | "GROUNDED_RESPONSE_PROJECT_MISMATCH"
  | "GROUNDED_RESPONSE_ARTIFACT_MISMATCH"
  | "GROUNDED_RESPONSE_ARTIFACT_BYTES_MISMATCH"
  | "GROUNDED_RESPONSE_CONTEXT_MISSING"
  | "GROUNDED_RESPONSE_CONTEXT_MISMATCH"
  | "GROUNDED_RESPONSE_EVIDENCE_MISSING"
  | "GROUNDED_RESPONSE_EVIDENCE_MISMATCH"
  | "GROUNDED_RESPONSE_SNAPSHOT_MISMATCH"
  | "GROUNDED_RESPONSE_DEPENDENCY_MISMATCH"
  | "GROUNDED_RESPONSE_MODEL_REQUEST_MISMATCH"
  | "GROUNDED_RESPONSE_MODEL_CALL_MISMATCH"
  | "GROUNDED_RESPONSE_MODEL_OUTCOME_INVALID"
  | "GROUNDED_RESPONSE_INTERACTION_MISMATCH"
  | "GROUNDED_RESPONSE_WORK_UNIT_MISMATCH"
  | "GROUNDED_RESPONSE_TERMINAL_ORDER_INVALID"
  | "GROUNDED_RESPONSE_CACHE_KEY_MISMATCH"
  | "GROUNDED_RESPONSE_CACHE_KEY_REUSED"
  | "GROUNDED_RESPONSE_AUTHORITY_EVENT_CONFLICT";

export class GroundedResponseError extends Error {
  readonly code: GroundedResponseErrorCode;

  constructor(code: GroundedResponseErrorCode, message: string) {
    super(message);
    this.name = "GroundedResponseError";
    this.code = code;
  }
}

export interface RegisterGroundedResponseInput {
  readonly response: PetraGroundedResponse;
  readonly responseArtifact: PetraArtifact;
  readonly responseBytes: Uint8Array;
  readonly modelRequest: PetraSynthesistModelRequest;
  readonly modelCall: PetraSynthesistModelCall;
  readonly interactionRun: PetraInteractionRun;
  readonly workUnit: PetraWorkUnit;
}

export interface GroundedResponseAuthorityRepository {
  register(
    input: RegisterGroundedResponseInput,
  ): Promise<PetraGroundedResponse>;
  get(groundedResponseId: string): Promise<PetraGroundedResponse | undefined>;
  getRevision(
    groundedResponseId: string,
    revision: number,
  ): Promise<PetraGroundedResponse | undefined>;
  getReusableByCacheKey(
    cacheKey: string,
  ): Promise<PetraGroundedResponse | undefined>;
  invalidateByAuthorityEvent(
    event: PetraDomainEventRecord,
  ): Promise<readonly PetraGroundedResponse[]>;
}

export const GROUNDED_RESPONSE_WORKFLOW = {
  name: "petra.synthesis.grounded",
  version: "1.0.0",
} as const;

interface StoredResponse {
  readonly fingerprint: string;
  readonly value: DeepReadonly<PetraGroundedResponse>;
}

interface RecordedAuthorityEvent {
  readonly fingerprint: string;
  readonly revisions: readonly DeepReadonly<PetraGroundedResponse>[];
}

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const byteHash = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

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

const exact = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const objectRefKey = (ref: {
  readonly object_kind: string;
  readonly object_id: string;
  readonly object_revision: number;
  readonly object_hash: string;
}): string =>
  `${ref.object_kind}:${ref.object_id}:${ref.object_revision}:${ref.object_hash}`;

/**
 * Identifies the exact pre-execution synthesis need. The logical request ID and
 * terminal outcome are deliberately excluded so equivalent retries can reuse a
 * valid result, while packet, prompt, policy, parameter, and route changes miss.
 */
export const groundedResponseCacheKey = (
  request: PetraSynthesistModelRequest,
  evidencePacket: PetraEvidencePacket,
): string => {
  const boundedRequest = structuredClone(request.content) as unknown as Record<
    string,
    unknown
  >;
  delete boundedRequest.terminal;
  const digest = canonicalHash({
    contract: "petra.grounded-response-cache-key@1.0.0",
    request_schema_version: request.schema_version,
    bounded_request: boundedRequest,
    snapshot_ref: evidencePacket.snapshot_ref,
  }).slice("sha256:".length);
  return `grounded-response:v1:${digest}`;
};

const exactPacketRef = (packet: {
  readonly revision: 1;
  readonly content_hash: string;
  readonly context_packet_id?: string;
  readonly evidence_packet_id?: string;
}) => ({
  ...(packet.context_packet_id === undefined
    ? { evidence_packet_id: packet.evidence_packet_id }
    : { context_packet_id: packet.context_packet_id }),
  revision: packet.revision,
  content_hash: packet.content_hash,
});

const eventAffectedObjectIds = (
  event: PetraDomainEventRecord,
): readonly string[] => {
  if (
    event.event.event_type !== "change_set.applied" &&
    event.event.event_type !== "change_set.reverted"
  ) {
    return [];
  }
  return [
    event.event.payload.claim.claim_id,
    event.event.payload.assertion.assertion_id,
  ];
};

const eventChangeSetId = (event: PetraDomainEventRecord): string | undefined =>
  event.event.event_type === "change_set.applied" ||
  event.event.event_type === "change_set.reverted"
    ? event.event.payload.change_set_id
    : undefined;

export const deriveGroundedResponseInvalidation = (
  current: PetraGroundedResponse | DeepReadonly<PetraGroundedResponse>,
  event: PetraDomainEventRecord,
): PetraGroundedResponse | undefined => {
  const changeSetId = eventChangeSetId(event);
  if (
    changeSetId === undefined ||
    current.project_id !== event.project_id ||
    event.event_position <= current.content.snapshot_ref.event_position
  ) {
    return undefined;
  }
  const affectedObjectIds = new Set(eventAffectedObjectIds(event));
  const affectedDependencies = current.content.dependencies
    .map((dependency) => dependency.object_ref.object_id)
    .filter((objectId) => affectedObjectIds.has(objectId));
  if (affectedDependencies.length === 0) return undefined;

  const next = structuredClone(current) as PetraGroundedResponse;
  next.revision = current.revision + 1;
  next.lineage = {
    lineage_kind: "revision",
    parent_revision: current.revision,
    parent_hash: current.content_hash,
  };
  const priorCauses =
    current.content.cache.state === "invalidated"
      ? [...current.content.cache.invalidated_by]
      : [];
  const priorIds =
    current.content.cache.state === "invalidated"
      ? [...current.content.cache.affected_dependency_ids]
      : [];
  const allAffectedIds = [
    ...new Set([...priorIds, ...affectedDependencies]),
  ].sort();
  next.content.cache = {
    state: "invalidated",
    cache_key: current.content.cache.cache_key,
    checked_at: event.recorded_at,
    invalidated_by: [
      {
        event_id: event.event_id,
        event_type: event.event.event_type as
          "change_set.applied" | "change_set.reverted",
        change_set_id: changeSetId,
      },
      ...priorCauses,
    ],
    affected_dependency_ids: [allAffectedIds[0]!, ...allAffectedIds.slice(1)],
  };
  next.content_hash = canonicalHash(next.content);
  next.recorded_at = event.recorded_at;
  next.recorded_by = structuredClone(current.recorded_by);
  return next;
};

/**
 * In-memory semantic reference implementation. Durable adapters must preserve
 * these atomicity, idempotency, lineage, and invalidation rules.
 */
export class InMemoryGroundedResponseRegistry {
  readonly #packets: InMemoryContextPacketRegistry;
  readonly #contracts: PetraContractRegistry;
  readonly #heads = new Map<string, StoredResponse>();
  readonly #history = new Map<string, Map<number, StoredResponse>>();
  readonly #cacheOwners = new Map<string, string>();
  readonly #authorityEvents = new Map<string, RecordedAuthorityEvent>();

  constructor(
    packets: InMemoryContextPacketRegistry,
    contracts: PetraContractRegistry = new PetraContractRegistry(),
  ) {
    this.#packets = packets;
    this.#contracts = contracts;
  }

  get size(): number {
    return this.#heads.size;
  }

  get revisionCount(): number {
    let count = 0;
    for (const revisions of this.#history.values()) count += revisions.size;
    return count;
  }

  get(
    groundedResponseId: string,
  ): DeepReadonly<PetraGroundedResponse> | undefined {
    return this.#heads.get(groundedResponseId)?.value;
  }

  getRevision(
    groundedResponseId: string,
    revision: number,
  ): DeepReadonly<PetraGroundedResponse> | undefined {
    return this.#history.get(groundedResponseId)?.get(revision)?.value;
  }

  getReusableByCacheKey(
    cacheKey: string,
  ): DeepReadonly<PetraGroundedResponse> | undefined {
    const responseId = this.#cacheOwners.get(cacheKey);
    if (responseId === undefined) return undefined;
    const head = this.#heads.get(responseId)?.value;
    return head?.content.cache.state === "reusable" ? head : undefined;
  }

  register(
    input: RegisterGroundedResponseInput,
  ): DeepReadonly<PetraGroundedResponse> {
    const { response } = input;
    this.#contracts.assertValid(
      "grounded-response",
      response.schema_version,
      response,
    );
    const fingerprint = canonicalHash(response);
    const existingRoot = this.#history
      .get(response.grounded_response_id)
      ?.get(1);
    if (existingRoot !== undefined) {
      if (existingRoot.fingerprint !== fingerprint) {
        throw new GroundedResponseError(
          "GROUNDED_RESPONSE_ID_ALREADY_REGISTERED",
          "The GroundedResponse ID is already bound to different content.",
        );
      }
      return existingRoot.value;
    }

    if (
      response.revision !== 1 ||
      response.lineage.lineage_kind !== "root" ||
      response.content.cache.state !== "reusable"
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_INITIAL_REVISION_INVALID",
        "A registered GroundedResponse must begin as reusable root revision 1.",
      );
    }
    if (response.content_hash !== canonicalHash(response.content)) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_CONTENT_HASH_MISMATCH",
        "The GroundedResponse hash does not identify its exact canonical content.",
      );
    }

    this.#validateArtifact(input);
    const evidencePacket = this.#validatePackets(response);
    this.#validateDependencies(response, evidencePacket);
    this.#validateExecution(input, evidencePacket);
    this.#validateInteraction(input);
    this.#validateTerminalOrder(input);

    const expectedCacheKey = groundedResponseCacheKey(
      input.modelRequest,
      evidencePacket,
    );
    if (response.content.cache.cache_key !== expectedCacheKey) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_CACHE_KEY_MISMATCH",
        "The cache key does not identify the exact bounded synthesis need.",
      );
    }
    const cacheOwner = this.#cacheOwners.get(expectedCacheKey);
    if (
      cacheOwner !== undefined &&
      cacheOwner !== response.grounded_response_id
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_CACHE_KEY_REUSED",
        "The exact cache key is already owned by another GroundedResponse.",
      );
    }

    const stored: StoredResponse = {
      fingerprint,
      value: immutableCopy(response),
    };
    this.#heads.set(response.grounded_response_id, stored);
    this.#history.set(
      response.grounded_response_id,
      new Map([[response.revision, stored]]),
    );
    this.#cacheOwners.set(expectedCacheKey, response.grounded_response_id);
    return stored.value;
  }

  invalidateByAuthorityEvent(
    event: PetraDomainEventRecord,
  ): readonly DeepReadonly<PetraGroundedResponse>[] {
    this.#contracts.assertValid("domain-event", event.schema_version, event);
    const fingerprint = canonicalHash(event);
    const replay = this.#authorityEvents.get(event.event_id);
    if (replay !== undefined) {
      if (replay.fingerprint !== fingerprint) {
        throw new GroundedResponseError(
          "GROUNDED_RESPONSE_AUTHORITY_EVENT_CONFLICT",
          "The authority event ID is already bound to different content.",
        );
      }
      return replay.revisions;
    }

    const changeSetId = eventChangeSetId(event);
    const pending: StoredResponse[] = [];
    if (changeSetId !== undefined) {
      for (const stored of [...this.#heads.values()]) {
        const current = stored.value;
        const next = deriveGroundedResponseInvalidation(current, event);
        if (next === undefined) continue;
        this.#contracts.assertValid(
          "grounded-response",
          next.schema_version,
          next,
        );

        const nextStored: StoredResponse = {
          fingerprint: canonicalHash(next),
          value: immutableCopy(next),
        };
        pending.push(nextStored);
      }
    }

    for (const nextStored of pending) {
      const next = nextStored.value;
      this.#heads.set(next.grounded_response_id, nextStored);
      this.#history
        .get(next.grounded_response_id)
        ?.set(next.revision, nextStored);
    }

    const frozenRevisions = Object.freeze(
      pending.map((stored) => stored.value),
    );
    this.#authorityEvents.set(event.event_id, {
      fingerprint,
      revisions: frozenRevisions,
    });
    return frozenRevisions;
  }

  #validateArtifact(input: RegisterGroundedResponseInput): void {
    const { response, responseArtifact, responseBytes } = input;
    this.#contracts.assertValid(
      "artifact",
      responseArtifact.schema_version,
      responseArtifact,
    );
    const ref = response.content.response_artifact_ref;
    if (
      responseArtifact.artifact_id !== ref.artifact_id ||
      responseArtifact.revision !== 1 ||
      responseArtifact.artifact_kind !== "run_output" ||
      responseArtifact.content_hash !== ref.content_hash ||
      responseArtifact.byte_size !== ref.byte_size ||
      responseArtifact.media_type !== ref.media_type ||
      !exact(responseArtifact.created_by, response.recorded_by)
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_ARTIFACT_MISMATCH",
        "The response Artifact does not exactly match its immutable reference.",
      );
    }
    if (
      responseBytes.byteLength !== responseArtifact.byte_size ||
      byteHash(responseBytes) !== responseArtifact.content_hash
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_ARTIFACT_BYTES_MISMATCH",
        "The supplied response bytes do not match the immutable Artifact identity.",
      );
    }
  }

  #validatePackets(response: PetraGroundedResponse): PetraEvidencePacket {
    const contextRef = response.content.context_packet_ref;
    const context = this.#packets.getContextPacket(
      contextRef.context_packet_id,
    );
    if (context === undefined) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_CONTEXT_MISSING",
        "The GroundedResponse ContextPacket is not registered.",
      );
    }
    if (
      response.project_id !== context.project_id ||
      !exact(contextRef, exactPacketRef(context))
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_CONTEXT_MISMATCH",
        "The GroundedResponse does not bind the exact registered ContextPacket.",
      );
    }

    const evidenceRef = response.content.evidence_packet_ref;
    const evidence = this.#packets.getEvidencePacket(
      evidenceRef.evidence_packet_id,
    );
    if (evidence === undefined) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_EVIDENCE_MISSING",
        "The GroundedResponse EvidencePacket is not registered.",
      );
    }
    if (
      response.project_id !== evidence.project_id ||
      !exact(evidenceRef, exactPacketRef(evidence)) ||
      evidence.content.context_packet_ref.context_packet_id !==
        context.context_packet_id ||
      evidence.content.context_packet_ref.content_hash !== context.content_hash
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_EVIDENCE_MISMATCH",
        "The GroundedResponse does not bind the exact registered EvidencePacket.",
      );
    }
    if (
      !exact(response.content.snapshot_ref, context.snapshot_ref) ||
      !exact(response.content.snapshot_ref, evidence.snapshot_ref)
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_SNAPSHOT_MISMATCH",
        "Context, evidence, and response must share one exact authority snapshot.",
      );
    }
    return structuredClone(evidence) as PetraEvidencePacket;
  }

  #validateDependencies(
    response: PetraGroundedResponse,
    evidence: PetraEvidencePacket,
  ): void {
    const expected = evidence.content.selected_evidence
      .map((selection) => objectRefKey(selection.object_ref))
      .sort();
    const actualDependencies = response.content.dependencies;
    if (
      actualDependencies.some(
        (dependency) => dependency.dependency_role !== "selected_evidence",
      )
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_DEPENDENCY_MISMATCH",
        "Initial dependencies must exhaustively identify selected evidence.",
      );
    }
    const actual = actualDependencies
      .map((dependency) => objectRefKey(dependency.object_ref))
      .sort();
    if (
      expected.length !== actual.length ||
      new Set(actual).size !== actual.length ||
      !expected.every((value, index) => value === actual[index])
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_DEPENDENCY_MISMATCH",
        "GroundedResponse dependencies must exactly equal EvidencePacket selections.",
      );
    }
  }

  #validateExecution(
    input: RegisterGroundedResponseInput,
    evidence: PetraEvidencePacket,
  ): void {
    const { response, modelRequest: request, modelCall: call } = input;
    this.#contracts.assertValid(
      "model-request",
      request.schema_version,
      request,
    );
    this.#contracts.assertValid("model-call", call.schema_version, call);
    const execution = response.content.execution_ref;
    const selected = request.content.routing.selected;
    const evidenceRefs = evidence.content.selected_evidence
      .map((selection) => objectRefKey(selection.object_ref))
      .sort();
    const outboundRefs = request.content.outbound_context.context_object_refs
      .map(objectRefKey)
      .sort();
    if (
      request.content_hash !== canonicalHash(request.content) ||
      outboundRefs.length !== evidenceRefs.length ||
      !outboundRefs.every((value, index) => value === evidenceRefs[index])
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_MODEL_REQUEST_MISMATCH",
        "The synthesist request hash and outbound selection must identify exact evidence.",
      );
    }
    if (
      request.content.role !== "synthesist" ||
      request.content.project_id !== response.project_id ||
      execution.model_request_id !== request.model_request_id ||
      request.content.context_packet_ref.context_packet_id !==
        response.content.context_packet_ref.context_packet_id ||
      request.content.context_packet_ref.content_hash !==
        response.content.context_packet_ref.content_hash ||
      request.content.evidence_packet_ref.evidence_packet_id !==
        evidence.evidence_packet_id ||
      request.content.evidence_packet_ref.content_hash !==
        evidence.content_hash ||
      selected?.model_deployment_id !== execution.model_deployment_id ||
      selected.role_certification_id !== execution.role_certification_id
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_MODEL_REQUEST_MISMATCH",
        "The GroundedResponse is not bound to the exact selected synthesist request.",
      );
    }
    if (
      request.content.terminal.state !== "completed" ||
      !request.content.terminal.model_call_ids.includes(call.model_call_id) ||
      request.content.terminal.output_hash !==
        response.content.model_output_hash ||
      call.content.output === undefined ||
      request.content.terminal.output_hash !==
        canonicalHash(call.content.output) ||
      request.content.terminal.validator_results.some(
        (result) => result.outcome !== "pass",
      )
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_MODEL_OUTCOME_INVALID",
        "Only a successfully validated synthesist request may ground a response.",
      );
    }
    const callSelectionRefs = call.content.input.context_selections
      .map((selection) => objectRefKey(selection.object_ref))
      .sort();
    if (
      call.content_hash !== canonicalHash(call.content) ||
      execution.model_call_id !== call.model_call_id ||
      call.content.model_request_id !== request.model_request_id ||
      call.content.outcome !== "success" ||
      call.content.output === undefined ||
      call.content.deployment.model_deployment_id !==
        execution.model_deployment_id ||
      call.content.input.context_packet_ref.context_packet_id !==
        response.content.context_packet_ref.context_packet_id ||
      call.content.input.context_packet_ref.content_hash !==
        response.content.context_packet_ref.content_hash ||
      call.content.input.evidence_packet_ref.evidence_packet_id !==
        evidence.evidence_packet_id ||
      call.content.input.evidence_packet_ref.content_hash !==
        evidence.content_hash ||
      call.content.input.content_hash !==
        request.content.outbound_context.context_content_hash ||
      !exact(call.content.prompt_profile, request.content.prompt_profile) ||
      call.content.parameters_hash !==
        request.content.parameters.content_hash ||
      !exact(call.content.output_contract, request.content.output_contract) ||
      callSelectionRefs.length !== evidenceRefs.length ||
      !callSelectionRefs.every(
        (value, index) => value === evidenceRefs[index],
      ) ||
      call.content.validation.some((result) => result.outcome !== "pass")
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_MODEL_CALL_MISMATCH",
        "The GroundedResponse is not bound to the successful exact model call.",
      );
    }
  }

  #validateInteraction(input: RegisterGroundedResponseInput): void {
    const { response, interactionRun, workUnit } = input;
    this.#contracts.assertValid(
      "interaction-run",
      interactionRun.schema_version,
      interactionRun,
    );
    this.#contracts.assertValid("work-unit", workUnit.schema_version, workUnit);
    const interactionRef = response.content.interaction_ref;
    if (
      response.project_id !== interactionRun.project_id ||
      interactionRun.content_hash !== canonicalHash(interactionRun.content) ||
      interactionRun.interaction_run_id !==
        interactionRef.interaction_run_ref.interaction_run_id ||
      interactionRun.revision !== interactionRef.interaction_run_ref.revision ||
      interactionRun.content_hash !==
        interactionRef.interaction_run_ref.content_hash ||
      interactionRun.content.lifecycle.state !== "completed" ||
      interactionRun.content.correlation.model_request_id !==
        response.content.execution_ref.model_request_id ||
      !exact(
        interactionRun.content.correlation.work_unit_ref,
        interactionRef.work_unit_ref,
      )
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_INTERACTION_MISMATCH",
        "The GroundedResponse must bind an exact completed InteractionRun.",
      );
    }
    if (
      response.project_id !== workUnit.project_id ||
      workUnit.spec_hash !== canonicalHash(workUnit.spec) ||
      workUnit.work_unit_id !== interactionRef.work_unit_ref.work_unit_id ||
      workUnit.revision !== interactionRef.work_unit_ref.revision ||
      workUnit.spec_hash !== interactionRef.work_unit_ref.spec_hash ||
      workUnit.spec.workflow_name !== GROUNDED_RESPONSE_WORKFLOW.name ||
      workUnit.spec.workflow_version !== GROUNDED_RESPONSE_WORKFLOW.version ||
      (workUnit.spec.cache.cache_mode !== "disabled" &&
        workUnit.spec.cache.cache_key !== response.content.cache.cache_key) ||
      workUnit.status.state !== "completed" ||
      workUnit.status.terminal_outcome !== "succeeded"
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_WORK_UNIT_MISMATCH",
        "The GroundedResponse must bind an exact successfully completed WorkUnit.",
      );
    }
  }

  #validateTerminalOrder(input: RegisterGroundedResponseInput): void {
    const {
      response,
      responseArtifact,
      modelRequest,
      modelCall,
      interactionRun,
      workUnit,
    } = input;
    const persistedAt = response.content.terminal.persisted_at;
    if (
      response.recorded_at !== persistedAt ||
      responseArtifact.created_at > persistedAt ||
      modelRequest.completed_at > persistedAt ||
      modelCall.completed_at > persistedAt ||
      interactionRun.updated_at > persistedAt ||
      workUnit.updated_at > persistedAt
    ) {
      throw new GroundedResponseError(
        "GROUNDED_RESPONSE_TERMINAL_ORDER_INVALID",
        "The terminal record must be written after every bound execution record.",
      );
    }
  }
}
