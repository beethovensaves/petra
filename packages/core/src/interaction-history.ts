import { createHash } from "node:crypto";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraInteractionEventRecord,
  PetraInteractionReplayRecord,
  PetraInteractionRun,
  PetraRightsDecision,
  PetraWorkUnit,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import type { ArtifactAuthorityRepository } from "./artifact-registry.js";
import type { ArtifactStore, AvailableArtifact } from "./artifact-store.js";
import { derivePetraId } from "./identity.js";
import type { InteractionAuthorityRepository } from "./interaction-authority-repository.js";
import { InteractionRecordError } from "./interaction-record-registry.js";
import type {
  PetraInteractionEvent,
  WorkUnitStatus,
} from "./interaction-runtime.js";
import type { WorkUnitAuthorityRepository } from "./work-unit-authority-repository.js";

const EVENT_MEDIA_TYPE = "application/json" as const;
const MAX_EVENT_BYTES = 4_000_000;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const byteHash = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const clone = <Value>(value: Value): Value => structuredClone(value);

const same = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const laterTimestamp = (...values: readonly string[]): string =>
  values.reduce((latest, value) =>
    new Date(value).getTime() > new Date(latest).getTime() ? value : latest,
  );

const serviceRef = (actor: PetraActor) => ({
  actor_id: actor.actor_id,
  actor_kind: "service" as const,
});

const artifactIntegrity = (
  available: AvailableArtifact,
): PetraArtifactManifest["integrity"] => {
  if (available.verification.status === "verified") {
    return {
      status: "verified",
      checked_at: available.availableAt,
      problems: [],
    };
  }
  const problems = available.verification.problems.map((message, index) => ({
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
    checked_at: available.availableAt,
    problems: [first, ...problems.slice(1)],
  };
};

const eventArtifactRecords = (
  event: PetraInteractionEvent,
  available: AvailableArtifact,
  serviceActor: PetraActor,
): {
  artifact: PetraArtifact;
  manifest: PetraArtifactManifest;
  rightsDecision: PetraRightsDecision;
} => {
  const actor = serviceRef(serviceActor);
  const eventSeed = `${event.threadId}|${event.runId}|${event.sequence}|${available.contentHash}`;
  const artifactId = derivePetraId("artifact", available.contentHash);
  const manifestId = derivePetraId("artifact_manifest", eventSeed);
  const rightsId = derivePetraId("rights_decision", eventSeed);
  const artifact: PetraArtifact = {
    schema_name: "petra.artifact",
    schema_version: "1.0.0",
    artifact_id: artifactId,
    revision: 1,
    artifact_kind: "structured_text",
    media_type: EVENT_MEDIA_TYPE,
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
      generator_name: "petra-interaction-history",
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
    integrity: artifactIntegrity(available),
    recorded_by: actor,
    recorded_at: available.availableAt,
  };
  const rightsDecision: PetraRightsDecision = {
    schema_name: "petra.rights-decision",
    schema_version: "1.0.0",
    rights_decision_id: rightsId,
    revision: 1,
    artifact_manifest_id: manifestId,
    source_location: `urn:petra:interaction:${event.runId}:${event.sequence}`,
    license_status: "known",
    observed_license: {
      statement: "Petra-generated private interaction history.",
      source: "artifact",
    },
    access_basis: "permission",
    decision_status: "verified",
    permissions: {
      store_raw_bytes: true,
      parse: true,
      index: false,
      embed: false,
      send_selected_text_remotely: false,
      quote_publicly: false,
      redistribute_artifact: false,
    },
    conditions: [],
    required_notices: [],
    authorization_reference: "petra-private-interaction-history/1.0.0",
    decision_maker: actor,
    rationale:
      "The payload records a private presentation event and is not scientific authority.",
    observed_at: available.availableAt,
    policy_version: "petra-rights/1.0.0",
    created_at: available.availableAt,
  };
  return { artifact, manifest, rightsDecision };
};

const persistArtifact = async (
  repository: ArtifactAuthorityRepository,
  records: ReturnType<typeof eventArtifactRecords>,
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
      if (concurrent === undefined || !same(concurrent, records.artifact)) {
        throw error;
      }
    }
  } else if (!same(existing, records.artifact)) {
    throw new Error(
      "The interaction payload hash is already bound to a different Artifact.",
    );
  }
  await repository.attachVerifiedManifest({
    artifactId: records.artifact.artifact_id,
    manifest: records.manifest,
    rightsDecision: records.rightsDecision,
  });
};

const eventProtocol = (
  event: PetraInteractionEvent,
): {
  protocol: PetraInteractionEventRecord["content"]["protocol"];
  semanticKind: PetraInteractionEventRecord["content"]["semantic_kind"];
} => {
  switch (event.kind) {
    case "run.started":
      return {
        protocol: { protocol: "ag-ui", event_type: "RUN_STARTED" },
        semanticKind: "run_lifecycle",
      };
    case "state.snapshot":
      return {
        protocol: { protocol: "ag-ui", event_type: "STATE_SNAPSHOT" },
        semanticKind: "state_projection",
      };
    case "activity.snapshot":
      return {
        protocol: { protocol: "ag-ui", event_type: "ACTIVITY_SNAPSHOT" },
        semanticKind: "activity",
      };
    case "tool.proposal":
      return {
        protocol: { protocol: "ag-ui", event_type: "TOOL_CALL_START" },
        semanticKind: "tool_proposal",
      };
    case "text.start":
      return {
        protocol: { protocol: "ag-ui", event_type: "TEXT_MESSAGE_START" },
        semanticKind: "assistant_text",
      };
    case "text.delta":
      return {
        protocol: { protocol: "ag-ui", event_type: "TEXT_MESSAGE_CONTENT" },
        semanticKind: "assistant_text",
      };
    case "text.end":
      return {
        protocol: { protocol: "ag-ui", event_type: "TEXT_MESSAGE_END" },
        semanticKind: "assistant_text",
      };
    case "review.interrupt":
      return {
        protocol: {
          protocol: "ag-ui",
          event_type: "CUSTOM",
          custom_event: {
            event_name: "petra.review.interrupt",
            schema_name: "interaction-custom-event",
            schema_version: "1.0.0",
            schema_hash:
              "sha256:0da3334a20c01b659b7a3ea5c6ec102ac76bda4fc0113eb6cdb21f8a980c8721",
          },
        },
        semanticKind: "interrupt",
      };
    case "run.finished":
      return {
        protocol: { protocol: "ag-ui", event_type: "RUN_FINISHED" },
        semanticKind: "run_lifecycle",
      };
    case "run.error":
      return {
        protocol: { protocol: "ag-ui", event_type: "RUN_ERROR" },
        semanticKind: "error",
      };
  }
};

const eventReference = (event: PetraInteractionEventRecord) => ({
  interaction_event_record_id: event.interaction_event_record_id,
  sequence: event.sequence,
  content_hash: event.content_hash,
});

const workUnitStatus = (
  workUnit: PetraWorkUnit,
): PetraInteractionReplayRecord["content"]["work_unit_observation"]["status"] => {
  if (workUnit.status.state !== "completed") return workUnit.status.state;
  return workUnit.status.terminal_outcome === "succeeded"
    ? "succeeded"
    : "failed";
};

const interactionStatus = (run: PetraInteractionRun): WorkUnitStatus => {
  const state = run.content.lifecycle.state;
  if (state === "awaiting_interrupt") return "awaiting_review";
  return state;
};

const readAll = async (
  stream: AsyncIterable<Uint8Array>,
): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of stream) {
    chunks.push(chunk);
    size += chunk.byteLength;
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const asPersistedEvent = (
  value: unknown,
  record: PetraInteractionEventRecord,
  run: PetraInteractionRun,
): PetraInteractionEvent => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("An interaction payload Artifact is not a JSON object.");
  }
  const event = value as Partial<PetraInteractionEvent>;
  if (
    event.sequence !== record.sequence ||
    event.threadId !== run.content.correlation.protocol_thread_id ||
    event.runId !== run.content.correlation.protocol_run_id ||
    event.workUnitId !== run.content.correlation.work_unit_ref.work_unit_id ||
    typeof event.kind !== "string" ||
    typeof event.timestamp !== "number" ||
    !Number.isSafeInteger(event.timestamp) ||
    typeof event.requestId !== "string" ||
    typeof event.traceId !== "string" ||
    typeof event.modelRequestId !== "string"
  ) {
    throw new Error(
      "An interaction payload Artifact does not match its durable run and sequence.",
    );
  }
  return clone(value) as PetraInteractionEvent;
};

export interface RestoredInteractionHistory {
  readonly run: PetraInteractionRun;
  readonly workUnit: PetraWorkUnit;
  readonly events: readonly PetraInteractionEvent[];
  readonly status: WorkUnitStatus;
}

export interface InteractionDeliveryRecord {
  readonly connectionId: string;
  readonly threadId: string;
  readonly runId: string;
  readonly deliveryKind: "initial" | "resume" | "replay";
  readonly afterSequence: number;
  readonly lastDeliveredSequence: number;
  readonly outcome: "completed" | "aborted" | "write_error";
  readonly startedAt: string;
  readonly completedAt: string;
  readonly error?: { readonly code: string; readonly message: string };
}

export interface InteractionHistoryPort {
  persistEvents(
    run: PetraInteractionRun,
    events: readonly PetraInteractionEvent[],
  ): Promise<readonly PetraInteractionEventRecord[]>;
  listEventRecords(
    interactionRunId: string,
  ): Promise<readonly PetraInteractionEventRecord[]>;
  advanceRun(
    run: PetraInteractionRun,
    events: readonly PetraInteractionEventRecord[],
    lifecycle: PetraInteractionRun["content"]["lifecycle"],
    updatedAt: string,
  ): Promise<PetraInteractionRun>;
  restore(
    protocolThreadId: string,
    protocolRunId: string,
  ): Promise<RestoredInteractionHistory | undefined>;
  recordDelivery(
    delivery: InteractionDeliveryRecord,
  ): Promise<PetraInteractionReplayRecord | undefined>;
}

export interface DurableInteractionHistoryOptions {
  readonly serviceActor: PetraActor;
  readonly artifactStore: ArtifactStore;
  readonly artifacts: ArtifactAuthorityRepository;
  readonly interactions: InteractionAuthorityRepository;
  readonly workUnits: WorkUnitAuthorityRepository;
}

export class DurableInteractionHistory implements InteractionHistoryPort {
  readonly #options: DurableInteractionHistoryOptions;

  constructor(options: DurableInteractionHistoryOptions) {
    if (options.serviceActor.actor_kind !== "service") {
      throw new Error("Durable interaction history requires a service actor.");
    }
    this.#options = options;
  }

  async persistEvents(
    run: PetraInteractionRun,
    events: readonly PetraInteractionEvent[],
  ): Promise<readonly PetraInteractionEventRecord[]> {
    const existing = await this.listEventRecords(run.interaction_run_id);
    const records = [...existing];
    for (const event of events) {
      if (
        event.sequence < 1 ||
        event.sequence > records.length + 1 ||
        event.threadId !== run.content.correlation.protocol_thread_id ||
        event.runId !== run.content.correlation.protocol_run_id ||
        event.workUnitId !== run.content.correlation.work_unit_ref.work_unit_id
      ) {
        throw new Error(
          "Interaction events must be one contiguous sequence for the exact durable run.",
        );
      }
      const priorRecord = records[event.sequence - 1];
      if (priorRecord !== undefined) {
        const restored = await this.#readEvent(priorRecord, run);
        if (!same(restored, event)) {
          throw new Error(
            `Interaction event ${event.sequence} conflicts with durable history.`,
          );
        }
        continue;
      }

      const encoded = new TextEncoder().encode(canonicalize(event));
      if (encoded.byteLength > MAX_EVENT_BYTES) {
        throw new Error("An interaction event exceeds Petra's payload limit.");
      }
      const staged = await this.#options.artifactStore.stage({
        bytes: [encoded],
        declaredByteSize: encoded.byteLength,
        declaredMediaType: EVENT_MEDIA_TYPE,
        expectedContentHash: byteHash(encoded),
      });
      const available = await this.#options.artifactStore.makeAvailable(staged);
      const artifactRecords = eventArtifactRecords(
        event,
        available,
        this.#options.serviceActor,
      );
      await persistArtifact(this.#options.artifacts, artifactRecords);

      const mapping = eventProtocol(event);
      const previous = records.at(-1);
      const content: PetraInteractionEventRecord["content"] = {
        protocol: mapping.protocol,
        semantic_kind: mapping.semanticKind,
        payload_artifact_ref: {
          artifact_id: artifactRecords.artifact.artifact_id,
          content_sha256: artifactRecords.artifact.content_hash,
          byte_size: artifactRecords.artifact.byte_size,
          media_type: EVENT_MEDIA_TYPE,
        },
        visibility: { audience: "researcher", redaction: "none" },
        authority_effect: { effect_kind: "none" },
      };
      const recordedAt = laterTimestamp(
        run.created_at,
        new Date(event.timestamp).toISOString(),
        available.availableAt,
      );
      const record: PetraInteractionEventRecord = {
        schema_name: "petra.interaction-event-record",
        schema_version: "1.0.0",
        interaction_event_record_id: derivePetraId(
          "interaction_event_record",
          `${run.interaction_run_id}|${event.sequence}|${available.contentHash}`,
        ),
        revision: 1,
        project_id: run.project_id,
        interaction_run_ref: {
          interaction_run_id: run.interaction_run_id,
          revision: run.revision,
          content_hash: run.content_hash,
        },
        sequence: event.sequence,
        lineage:
          previous === undefined
            ? { lineage_kind: "start" }
            : {
                lineage_kind: "continuation",
                previous_event_record_id: previous.interaction_event_record_id,
                previous_sequence: previous.sequence,
                previous_content_hash: previous.content_hash,
              },
        content,
        content_hash: canonicalHash(content),
        recorded_by: serviceRef(this.#options.serviceActor),
        recorded_at: recordedAt,
      };
      records.push(await this.#options.interactions.appendEvent(record));
    }
    return records.map(clone);
  }

  async listEventRecords(
    interactionRunId: string,
  ): Promise<readonly PetraInteractionEventRecord[]> {
    const records: PetraInteractionEventRecord[] = [];
    while (true) {
      const page = await this.#options.interactions.listEvents(
        interactionRunId,
        records.at(-1)?.sequence ?? 0,
        10_000,
      );
      records.push(...page);
      if (page.length < 10_000) return records;
    }
  }

  async advanceRun(
    run: PetraInteractionRun,
    events: readonly PetraInteractionEventRecord[],
    lifecycle: PetraInteractionRun["content"]["lifecycle"],
    updatedAt: string,
  ): Promise<PetraInteractionRun> {
    const current =
      (await this.#options.interactions.getRun(run.interaction_run_id)) ?? run;
    const head: PetraInteractionRun["content"]["stream_head"] =
      events.length === 0
        ? { state: "empty", event_count: 0 }
        : {
            state: "advanced",
            event_count: events.length,
            latest_sequence: events.length,
            head_hash: events.at(-1)!.content_hash,
          };
    if (
      same(current.content.lifecycle, lifecycle) &&
      same(current.content.stream_head, head)
    ) {
      return current;
    }
    const content: PetraInteractionRun["content"] = {
      ...clone(current.content),
      lifecycle: clone(lifecycle),
      stream_head: head,
    };
    const next: PetraInteractionRun = {
      ...clone(current),
      revision: current.revision + 1,
      lineage: {
        lineage_kind: "revision",
        parent_revision: current.revision,
        parent_hash: current.content_hash,
      },
      content,
      content_hash: canonicalHash(content),
      updated_at: laterTimestamp(current.updated_at, updatedAt),
    };
    return this.#options.interactions.registerRun(next);
  }

  async restore(
    protocolThreadId: string,
    protocolRunId: string,
  ): Promise<RestoredInteractionHistory | undefined> {
    const run = await this.#options.interactions.getRunByProtocolCorrelation(
      protocolThreadId,
      protocolRunId,
    );
    if (run === undefined) return undefined;
    const workUnit = await this.#options.workUnits.getWorkUnit(
      run.content.correlation.work_unit_ref.work_unit_id,
    );
    if (workUnit === undefined) {
      throw new Error("A durable InteractionRun lost its linked WorkUnit.");
    }
    const records = await this.listEventRecords(run.interaction_run_id);
    const events: PetraInteractionEvent[] = [];
    for (const record of records)
      events.push(await this.#readEvent(record, run));
    return {
      run,
      workUnit,
      events,
      status: interactionStatus(run),
    };
  }

  async recordDelivery(
    delivery: InteractionDeliveryRecord,
  ): Promise<PetraInteractionReplayRecord | undefined> {
    return this.#recordDelivery(delivery, 3);
  }

  async #recordDelivery(
    delivery: InteractionDeliveryRecord,
    remainingAttempts: number,
  ): Promise<PetraInteractionReplayRecord | undefined> {
    const restored = await this.restore(delivery.threadId, delivery.runId);
    if (restored === undefined) return undefined;
    const records = await this.listEventRecords(
      restored.run.interaction_run_id,
    );
    if (
      delivery.afterSequence > records.length ||
      delivery.lastDeliveredSequence < delivery.afterSequence ||
      delivery.lastDeliveredSequence > records.length ||
      (delivery.outcome === "completed" &&
        delivery.lastDeliveredSequence !== records.length)
    ) {
      throw new Error(
        "The delivery checkpoint does not match durable interaction history.",
      );
    }
    const delivered = records.slice(
      delivery.afterSequence,
      delivery.lastDeliveredSequence,
    );
    const attempt =
      (await this.#options.interactions.getConnectionAttempt(
        delivery.connectionId,
      )) + 1;
    const completedAt = laterTimestamp(
      delivery.startedAt,
      delivery.completedAt,
    );
    const content: PetraInteractionReplayRecord["content"] = {
      connection_id: delivery.connectionId,
      attempt,
      request: {
        delivery_kind: delivery.deliveryKind,
        after_sequence: delivery.afterSequence,
      },
      started_at: delivery.startedAt,
      completed_at: completedAt,
      delivered_event_refs: delivered.map(eventReference),
      outcome:
        delivery.outcome === "completed"
          ? { outcome_kind: "completed" }
          : delivery.outcome === "aborted"
            ? {
                outcome_kind: "connection_aborted",
                last_delivered_sequence: delivery.lastDeliveredSequence,
              }
            : {
                outcome_kind: "write_error",
                last_delivered_sequence: delivery.lastDeliveredSequence,
                error: delivery.error ?? {
                  code: "INTERACTION_STREAM_WRITE_FAILED",
                  message:
                    "The interaction stream could not write its next event.",
                },
              },
      work_unit_observation: {
        work_unit_id: restored.workUnit.work_unit_id,
        revision: restored.workUnit.revision,
        status: workUnitStatus(restored.workUnit),
      },
      authority_boundary: {
        authority_reapplied: false,
        commands_reexecuted: false,
        durable_work_cancelled: false,
      },
    };
    const replay: PetraInteractionReplayRecord = {
      schema_name: "petra.interaction-replay-record",
      schema_version: "1.0.0",
      interaction_replay_record_id: derivePetraId(
        "interaction_replay_record",
        `${delivery.connectionId}|${attempt}`,
      ),
      revision: 1,
      project_id: restored.run.project_id,
      interaction_run_ref: {
        interaction_run_id: restored.run.interaction_run_id,
        revision: restored.run.revision,
        content_hash: restored.run.content_hash,
      },
      content,
      content_hash: canonicalHash(content),
      recorded_by: serviceRef(this.#options.serviceActor),
      recorded_at: completedAt,
    };
    try {
      return await this.#options.interactions.registerReplay(replay);
    } catch (error) {
      if (
        !(error instanceof InteractionRecordError) ||
        error.code !== "INTERACTION_REPLAY_ATTEMPT_INVALID" ||
        remainingAttempts <= 1
      ) {
        throw error;
      }
      return this.#recordDelivery(delivery, remainingAttempts - 1);
    }
  }

  async #readEvent(
    record: PetraInteractionEventRecord,
    run: PetraInteractionRun,
  ): Promise<PetraInteractionEvent> {
    const reference = record.content.payload_artifact_ref;
    const read = await this.#options.artifactStore.readByHash(
      reference.content_sha256,
      { byteSize: reference.byte_size, mediaType: reference.media_type },
    );
    const bytes = await readAll(read.bytes);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    let value: unknown;
    try {
      value = JSON.parse(text) as unknown;
    } catch {
      throw new Error("An interaction payload Artifact is not valid JSON.");
    }
    if (canonicalize(value) !== text) {
      throw new Error(
        "An interaction payload Artifact is not in canonical JSON form.",
      );
    }
    return asPersistedEvent(value, record, run);
  }
}
