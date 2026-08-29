import { createHash } from "node:crypto";

import type {
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionReplayRecord,
  PetraInteractionRun,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

export type InteractionRecordErrorCode =
  | "INTERACTION_CONTENT_HASH_MISMATCH"
  | "INTERACTION_ID_ALREADY_REGISTERED"
  | "INTERACTION_FEATURE_DUPLICATE"
  | "INTERACTION_FEATURE_UNREGISTERED"
  | "INTERACTION_FEATURE_REFERENCE_MISMATCH"
  | "INTERACTION_RUN_LINEAGE_INVALID"
  | "INTERACTION_RUN_CORRELATION_CONFLICT"
  | "INTERACTION_RUN_STATE_INVALID"
  | "INTERACTION_RUN_HEAD_MISMATCH"
  | "INTERACTION_EVENT_SEQUENCE_INVALID"
  | "INTERACTION_EVENT_LINEAGE_INVALID"
  | "INTERACTION_EVENT_REFERENCE_MISMATCH"
  | "INTERACTION_EVENT_PROTOCOL_INVALID"
  | "INTERACTION_EVENT_AUTHORITY_INVALID"
  | "INTERACTION_INTERRUPT_LINEAGE_INVALID"
  | "INTERACTION_INTERRUPT_REFERENCE_MISMATCH"
  | "INTERACTION_INTERRUPT_TRANSITION_INVALID"
  | "INTERACTION_INTERRUPT_COMMAND_CONFLICT"
  | "INTERACTION_REPLAY_REFERENCE_MISMATCH"
  | "INTERACTION_REPLAY_SEQUENCE_INVALID"
  | "INTERACTION_REPLAY_ATTEMPT_INVALID"
  | "INTERACTION_REPLAY_OUTCOME_INVALID"
  | "INTERACTION_TIMESTAMP_INVALID";

export class InteractionRecordError extends Error {
  readonly code: InteractionRecordErrorCode;

  constructor(code: InteractionRecordErrorCode, message: string) {
    super(message);
    this.name = "InteractionRecordError";
    this.code = code;
  }
}

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

const CUSTOM_EVENT_SCHEMA = {
  name: "interaction-custom-event",
  version: "1.0.0",
  hash: "sha256:0da3334a20c01b659b7a3ea5c6ec102ac76bda4fc0113eb6cdb21f8a980c8721",
  pointers: new Map([
    ["petra.work_unit.status", "#/$defs/WorkUnitStatusEvent"],
    ["petra.review.interrupt", "#/$defs/ReviewInterruptEvent"],
  ]),
} as const;

const canonicalHash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

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

const runKey = (interactionRunId: string, revision: number): string =>
  `${interactionRunId}:${revision}`;

const interruptKey = (interruptId: string, revision: number): string =>
  `${interruptId}:${revision}`;

const exactFeatureRef = (
  feature: DeepReadonly<PetraInteractionFeatureManifest>,
) => ({
  interaction_feature_manifest_id: feature.interaction_feature_manifest_id,
  revision: feature.revision,
  content_hash: feature.content_hash,
});

const exactRunRef = (run: DeepReadonly<PetraInteractionRun>) => ({
  interaction_run_id: run.interaction_run_id,
  revision: run.revision,
  content_hash: run.content_hash,
});

const exactEventRef = (event: DeepReadonly<PetraInteractionEventRecord>) => ({
  interaction_event_record_id: event.interaction_event_record_id,
  sequence: event.sequence,
  content_hash: event.content_hash,
});

const equal = (left: unknown, right: unknown): boolean =>
  canonicalize(left) === canonicalize(right);

const terminalStates = new Set(["completed", "failed", "cancelled"]);

export class InMemoryInteractionRecordRegistry {
  readonly #featureManifests = new Map<
    string,
    DeepReadonly<PetraInteractionFeatureManifest>
  >();
  readonly #runs = new Map<string, DeepReadonly<PetraInteractionRun>>();
  readonly #currentRunRevision = new Map<string, number>();
  readonly #protocolRunKeys = new Map<string, string>();
  readonly #eventsById = new Map<
    string,
    DeepReadonly<PetraInteractionEventRecord>
  >();
  readonly #eventsByRun = new Map<
    string,
    DeepReadonly<PetraInteractionEventRecord>[]
  >();
  readonly #interrupts = new Map<
    string,
    DeepReadonly<PetraInteractionInterrupt>
  >();
  readonly #currentInterruptRevision = new Map<string, number>();
  readonly #interruptByCommand = new Map<string, string>();
  readonly #replays = new Map<
    string,
    DeepReadonly<PetraInteractionReplayRecord>
  >();
  readonly #connectionAttempt = new Map<string, number>();

  get featureManifestCount(): number {
    return this.#featureManifests.size;
  }

  get runRevisionCount(): number {
    return this.#runs.size;
  }

  get eventCount(): number {
    return this.#eventsById.size;
  }

  get interruptRevisionCount(): number {
    return this.#interrupts.size;
  }

  get replayCount(): number {
    return this.#replays.size;
  }

  registerFeatureManifest(
    manifest: PetraInteractionFeatureManifest,
  ): DeepReadonly<PetraInteractionFeatureManifest> {
    this.#assertContentHash(manifest.content_hash, manifest.content);
    const existing = this.#featureManifests.get(
      manifest.interaction_feature_manifest_id,
    );
    if (existing !== undefined) {
      if (!equal(existing, manifest)) {
        throw new InteractionRecordError(
          "INTERACTION_ID_ALREADY_REGISTERED",
          "The InteractionFeatureManifest ID is already bound to different content.",
        );
      }
      return existing;
    }
    const standard = manifest.content.standard_events;
    const custom = manifest.content.custom_events;
    const features = manifest.content.features.map((value) => value.feature);
    if (
      new Set(standard).size !== standard.length ||
      new Set(custom.map((value) => value.event_name)).size !== custom.length ||
      new Set(features).size !== features.length
    ) {
      throw new InteractionRecordError(
        "INTERACTION_FEATURE_DUPLICATE",
        "Standard events, custom events, and feature declarations must be unique.",
      );
    }
    for (const registration of custom) {
      const expectedPointer = CUSTOM_EVENT_SCHEMA.pointers.get(
        registration.event_name,
      );
      if (
        expectedPointer === undefined ||
        registration.payload_schema_ref.schema_name !==
          CUSTOM_EVENT_SCHEMA.name ||
        registration.payload_schema_ref.schema_version !==
          CUSTOM_EVENT_SCHEMA.version ||
        registration.payload_schema_ref.content_hash !==
          CUSTOM_EVENT_SCHEMA.hash ||
        registration.payload_schema_ref.json_pointer !== expectedPointer
      ) {
        throw new InteractionRecordError(
          "INTERACTION_FEATURE_UNREGISTERED",
          `Custom event ${registration.event_name} is not bound to the accepted Petra payload schema variant.`,
        );
      }
    }
    const stored = immutableCopy(manifest);
    this.#featureManifests.set(
      manifest.interaction_feature_manifest_id,
      stored,
    );
    return stored;
  }

  registerRun(run: PetraInteractionRun): DeepReadonly<PetraInteractionRun> {
    this.#assertContentHash(run.content_hash, run.content);
    const key = runKey(run.interaction_run_id, run.revision);
    const existing = this.#runs.get(key);
    if (existing !== undefined) {
      if (!equal(existing, run)) {
        throw new InteractionRecordError(
          "INTERACTION_ID_ALREADY_REGISTERED",
          "The InteractionRun revision is already bound to different content.",
        );
      }
      return existing;
    }
    const feature = this.#featureManifests.get(
      run.feature_manifest_ref.interaction_feature_manifest_id,
    );
    if (
      feature === undefined ||
      !equal(run.feature_manifest_ref, exactFeatureRef(feature))
    ) {
      throw new InteractionRecordError(
        "INTERACTION_FEATURE_REFERENCE_MISMATCH",
        "The InteractionRun must bind one exact registered feature manifest.",
      );
    }
    const currentRevision = this.#currentRunRevision.get(
      run.interaction_run_id,
    );
    if (run.revision === 1) {
      if (
        run.lineage.lineage_kind !== "root" ||
        currentRevision !== undefined
      ) {
        throw new InteractionRecordError(
          "INTERACTION_RUN_LINEAGE_INVALID",
          "InteractionRun revision 1 must be the unique root.",
        );
      }
    } else {
      const prior = this.#runs.get(
        runKey(run.interaction_run_id, run.revision - 1),
      );
      if (
        run.lineage.lineage_kind !== "revision" ||
        currentRevision !== run.revision - 1 ||
        prior === undefined ||
        run.lineage.parent_revision !== prior.revision ||
        run.lineage.parent_hash !== prior.content_hash
      ) {
        throw new InteractionRecordError(
          "INTERACTION_RUN_LINEAGE_INVALID",
          "An InteractionRun revision must bind its exact immediate predecessor.",
        );
      }
      this.#validateRunTransition(prior, run);
    }
    const protocolKey = `${run.content.correlation.protocol_thread_id}:${run.content.correlation.protocol_run_id}`;
    const boundRunId = this.#protocolRunKeys.get(protocolKey);
    if (boundRunId !== undefined && boundRunId !== run.interaction_run_id) {
      throw new InteractionRecordError(
        "INTERACTION_RUN_CORRELATION_CONFLICT",
        "A protocol thread and run pair cannot identify two Petra interaction runs.",
      );
    }
    this.#validateRunHead(run);
    if (run.updated_at < run.created_at) {
      throw new InteractionRecordError(
        "INTERACTION_TIMESTAMP_INVALID",
        "InteractionRun updated_at cannot precede created_at.",
      );
    }
    const stored = immutableCopy(run);
    this.#runs.set(key, stored);
    this.#currentRunRevision.set(run.interaction_run_id, run.revision);
    this.#protocolRunKeys.set(protocolKey, run.interaction_run_id);
    return stored;
  }

  appendEvent(
    event: PetraInteractionEventRecord,
  ): DeepReadonly<PetraInteractionEventRecord> {
    this.#assertContentHash(event.content_hash, event.content);
    const existing = this.#eventsById.get(event.interaction_event_record_id);
    if (existing !== undefined) {
      if (!equal(existing, event)) {
        throw new InteractionRecordError(
          "INTERACTION_ID_ALREADY_REGISTERED",
          "The InteractionEventRecord ID is already bound to different content.",
        );
      }
      return existing;
    }
    const run = this.#requireRun(event.interaction_run_ref);
    if (event.project_id !== run.project_id) {
      throw new InteractionRecordError(
        "INTERACTION_EVENT_REFERENCE_MISMATCH",
        "An interaction event must remain in its run's Project.",
      );
    }
    const events = this.#eventsByRun.get(run.interaction_run_id) ?? [];
    const prior = events.at(-1);
    if (event.sequence !== events.length + 1) {
      throw new InteractionRecordError(
        "INTERACTION_EVENT_SEQUENCE_INVALID",
        "Interaction event sequence must be contiguous within the run.",
      );
    }
    if (
      (event.sequence === 1 && event.lineage.lineage_kind !== "start") ||
      (event.sequence > 1 &&
        (event.lineage.lineage_kind !== "continuation" ||
          prior === undefined ||
          event.lineage.previous_event_record_id !==
            prior.interaction_event_record_id ||
          event.lineage.previous_sequence !== prior.sequence ||
          event.lineage.previous_content_hash !== prior.content_hash))
    ) {
      throw new InteractionRecordError(
        "INTERACTION_EVENT_LINEAGE_INVALID",
        "Interaction events must form one exact hash chain.",
      );
    }
    this.#validateProtocolEvent(run, event);
    this.#validateEventAuthority(event);
    if (event.recorded_at < run.created_at) {
      throw new InteractionRecordError(
        "INTERACTION_TIMESTAMP_INVALID",
        "An interaction event cannot precede its run.",
      );
    }
    const stored = immutableCopy(event);
    this.#eventsById.set(event.interaction_event_record_id, stored);
    this.#eventsByRun.set(run.interaction_run_id, [...events, stored]);
    return stored;
  }

  registerInterrupt(
    interrupt: PetraInteractionInterrupt,
  ): DeepReadonly<PetraInteractionInterrupt> {
    this.#assertContentHash(interrupt.content_hash, interrupt.content);
    const key = interruptKey(
      interrupt.interaction_interrupt_id,
      interrupt.revision,
    );
    const existing = this.#interrupts.get(key);
    if (existing !== undefined) {
      if (!equal(existing, interrupt)) {
        throw new InteractionRecordError(
          "INTERACTION_ID_ALREADY_REGISTERED",
          "The InteractionInterrupt revision is already bound to different content.",
        );
      }
      return existing;
    }
    const run = this.#requireRun(interrupt.interaction_run_ref);
    const requestEvent = this.#eventsById.get(
      interrupt.content.request_event_ref.interaction_event_record_id,
    );
    if (
      interrupt.project_id !== run.project_id ||
      requestEvent === undefined ||
      !equal(
        interrupt.content.request_event_ref,
        exactEventRef(requestEvent),
      ) ||
      requestEvent.interaction_run_ref.interaction_run_id !==
        run.interaction_run_id ||
      requestEvent.content.semantic_kind !== "interrupt"
    ) {
      throw new InteractionRecordError(
        "INTERACTION_INTERRUPT_REFERENCE_MISMATCH",
        "An interrupt must bind an exact interrupt event from the same run and Project.",
      );
    }
    const currentRevision = this.#currentInterruptRevision.get(
      interrupt.interaction_interrupt_id,
    );
    if (interrupt.revision === 1) {
      if (
        interrupt.lineage.lineage_kind !== "root" ||
        interrupt.content.state !== "pending" ||
        currentRevision !== undefined
      ) {
        throw new InteractionRecordError(
          "INTERACTION_INTERRUPT_LINEAGE_INVALID",
          "InteractionInterrupt revision 1 must be one pending root request.",
        );
      }
    } else {
      const prior = this.#interrupts.get(
        interruptKey(
          interrupt.interaction_interrupt_id,
          interrupt.revision - 1,
        ),
      );
      if (
        interrupt.lineage.lineage_kind !== "revision" ||
        currentRevision !== interrupt.revision - 1 ||
        prior === undefined ||
        interrupt.lineage.parent_revision !== prior.revision ||
        interrupt.lineage.parent_hash !== prior.content_hash
      ) {
        throw new InteractionRecordError(
          "INTERACTION_INTERRUPT_LINEAGE_INVALID",
          "An interrupt revision must bind its exact immediate predecessor.",
        );
      }
      if (
        prior.content.state !== "pending" ||
        interrupt.content.state === "pending" ||
        prior.content.interrupt_kind !== interrupt.content.interrupt_kind ||
        !equal(
          prior.content.request_event_ref,
          interrupt.content.request_event_ref,
        ) ||
        !equal(prior.content.subject_refs, interrupt.content.subject_refs)
      ) {
        throw new InteractionRecordError(
          "INTERACTION_INTERRUPT_TRANSITION_INVALID",
          "A pending interrupt may close once without changing its request, kind, or subjects.",
        );
      }
    }
    if (interrupt.content.state === "responded") {
      const commandId = interrupt.content.resulting_command_ref.command_id;
      const boundInterrupt = this.#interruptByCommand.get(commandId);
      if (
        boundInterrupt !== undefined &&
        boundInterrupt !== interrupt.interaction_interrupt_id
      ) {
        throw new InteractionRecordError(
          "INTERACTION_INTERRUPT_COMMAND_CONFLICT",
          "One Petra command cannot be attributed to two interrupt responses.",
        );
      }
    }
    if (
      interrupt.created_at < requestEvent.recorded_at ||
      interrupt.updated_at < interrupt.created_at
    ) {
      throw new InteractionRecordError(
        "INTERACTION_TIMESTAMP_INVALID",
        "Interrupt timestamps must follow the request event and remain monotonic.",
      );
    }
    const stored = immutableCopy(interrupt);
    this.#interrupts.set(key, stored);
    this.#currentInterruptRevision.set(
      interrupt.interaction_interrupt_id,
      interrupt.revision,
    );
    if (interrupt.content.state === "responded") {
      this.#interruptByCommand.set(
        interrupt.content.resulting_command_ref.command_id,
        interrupt.interaction_interrupt_id,
      );
    }
    return stored;
  }

  registerReplay(
    replay: PetraInteractionReplayRecord,
  ): DeepReadonly<PetraInteractionReplayRecord> {
    this.#assertContentHash(replay.content_hash, replay.content);
    const existing = this.#replays.get(replay.interaction_replay_record_id);
    if (existing !== undefined) {
      if (!equal(existing, replay)) {
        throw new InteractionRecordError(
          "INTERACTION_ID_ALREADY_REGISTERED",
          "The InteractionReplayRecord ID is already bound to different content.",
        );
      }
      return existing;
    }
    const run = this.#requireRun(replay.interaction_run_ref);
    if (
      replay.project_id !== run.project_id ||
      replay.content.work_unit_observation.work_unit_id !==
        run.content.correlation.work_unit_ref.work_unit_id
    ) {
      throw new InteractionRecordError(
        "INTERACTION_REPLAY_REFERENCE_MISMATCH",
        "Replay must remain bound to the exact run Project and durable WorkUnit.",
      );
    }
    const expectedAttempt =
      (this.#connectionAttempt.get(replay.content.connection_id) ?? 0) + 1;
    if (replay.content.attempt !== expectedAttempt) {
      throw new InteractionRecordError(
        "INTERACTION_REPLAY_ATTEMPT_INVALID",
        "Replay attempts must be contiguous per connection identity.",
      );
    }
    const after = replay.content.request.after_sequence;
    const runEvents = this.#eventsByRun.get(run.interaction_run_id) ?? [];
    if (after > runEvents.length) {
      throw new InteractionRecordError(
        "INTERACTION_REPLAY_SEQUENCE_INVALID",
        "Replay cannot resume beyond the recorded interaction event head.",
      );
    }
    let expectedSequence = after + 1;
    for (const reference of replay.content.delivered_event_refs) {
      const event = this.#eventsById.get(reference.interaction_event_record_id);
      if (
        event === undefined ||
        event.interaction_run_ref.interaction_run_id !==
          run.interaction_run_id ||
        !equal(reference, exactEventRef(event)) ||
        reference.sequence !== expectedSequence
      ) {
        throw new InteractionRecordError(
          "INTERACTION_REPLAY_SEQUENCE_INVALID",
          "Replay may deliver only the exact contiguous event suffix after its requested sequence.",
        );
      }
      expectedSequence += 1;
    }
    const lastDelivered = expectedSequence - 1;
    if (
      (replay.content.outcome.outcome_kind === "completed" &&
        lastDelivered !== runEvents.length) ||
      (replay.content.outcome.outcome_kind !== "completed" &&
        replay.content.outcome.last_delivered_sequence !== lastDelivered)
    ) {
      throw new InteractionRecordError(
        "INTERACTION_REPLAY_OUTCOME_INVALID",
        "An interrupted delivery must report its exact last delivered sequence.",
      );
    }
    if (
      replay.content.completed_at < replay.content.started_at ||
      replay.recorded_at < replay.content.completed_at
    ) {
      throw new InteractionRecordError(
        "INTERACTION_TIMESTAMP_INVALID",
        "Replay timestamps must be monotonic through durable recording.",
      );
    }
    const stored = immutableCopy(replay);
    this.#replays.set(replay.interaction_replay_record_id, stored);
    this.#connectionAttempt.set(
      replay.content.connection_id,
      replay.content.attempt,
    );
    return stored;
  }

  getRun(
    interactionRunId: string,
    revision: number,
  ): DeepReadonly<PetraInteractionRun> | undefined {
    return this.#runs.get(runKey(interactionRunId, revision));
  }

  getEvents(
    interactionRunId: string,
  ): readonly DeepReadonly<PetraInteractionEventRecord>[] {
    return this.#eventsByRun.get(interactionRunId) ?? [];
  }

  #assertContentHash(actual: string, content: unknown): void {
    if (actual !== canonicalHash(content)) {
      throw new InteractionRecordError(
        "INTERACTION_CONTENT_HASH_MISMATCH",
        "The interaction record content hash does not identify its exact content.",
      );
    }
  }

  #requireRun(
    reference: PetraInteractionEventRecord["interaction_run_ref"],
  ): DeepReadonly<PetraInteractionRun> {
    const run = this.#runs.get(
      runKey(reference.interaction_run_id, reference.revision),
    );
    if (run === undefined || !equal(reference, exactRunRef(run))) {
      throw new InteractionRecordError(
        "INTERACTION_EVENT_REFERENCE_MISMATCH",
        "The interaction record must bind one exact registered run revision.",
      );
    }
    return run;
  }

  #validateRunTransition(
    prior: DeepReadonly<PetraInteractionRun>,
    next: PetraInteractionRun,
  ): void {
    if (
      prior.project_id !== next.project_id ||
      !equal(prior.feature_manifest_ref, next.feature_manifest_ref) ||
      !equal(prior.content.correlation, next.content.correlation) ||
      !equal(prior.content.authority_context, next.content.authority_context) ||
      !equal(prior.content.input, next.content.input) ||
      !equal(
        prior.content.authority_boundary,
        next.content.authority_boundary,
      ) ||
      prior.created_at !== next.created_at ||
      terminalStates.has(prior.content.lifecycle.state)
    ) {
      throw new InteractionRecordError(
        "INTERACTION_RUN_STATE_INVALID",
        "Run revisions may advance lifecycle and stream head without rewriting identity, input, authority context, or a terminal state.",
      );
    }
  }

  #validateRunHead(run: PetraInteractionRun): void {
    const events = this.#eventsByRun.get(run.interaction_run_id) ?? [];
    const head = run.content.stream_head;
    if (
      (events.length === 0 && head.state !== "empty") ||
      (events.length > 0 &&
        (head.state !== "advanced" ||
          head.event_count !== events.length ||
          head.latest_sequence !== events.length ||
          head.head_hash !== events.at(-1)?.content_hash))
    ) {
      throw new InteractionRecordError(
        "INTERACTION_RUN_HEAD_MISMATCH",
        "The InteractionRun stream head must reproduce the exact registered event chain.",
      );
    }
  }

  #validateProtocolEvent(
    run: DeepReadonly<PetraInteractionRun>,
    event: PetraInteractionEventRecord,
  ): void {
    const feature = this.#featureManifests.get(
      run.feature_manifest_ref.interaction_feature_manifest_id,
    );
    if (feature === undefined) {
      throw new InteractionRecordError(
        "INTERACTION_FEATURE_REFERENCE_MISMATCH",
        "The run's feature manifest is unavailable.",
      );
    }
    const protocol = event.content.protocol;
    if (protocol.event_type === "CUSTOM") {
      const registration = feature.content.custom_events.find(
        (value) =>
          value.event_name === protocol.custom_event.event_name &&
          value.payload_schema_ref.schema_name ===
            protocol.custom_event.schema_name &&
          value.payload_schema_ref.schema_version ===
            protocol.custom_event.schema_version &&
          value.payload_schema_ref.content_hash ===
            protocol.custom_event.schema_hash,
      );
      if (registration === undefined) {
        throw new InteractionRecordError(
          "INTERACTION_EVENT_PROTOCOL_INVALID",
          "A custom interaction event must match one exact feature-manifest registration.",
        );
      }
    } else if (!feature.content.standard_events.includes(protocol.event_type)) {
      throw new InteractionRecordError(
        "INTERACTION_EVENT_PROTOCOL_INVALID",
        `Standard event ${protocol.event_type} is not enabled by the run's feature manifest.`,
      );
    }
  }

  #validateEventAuthority(event: PetraInteractionEventRecord): void {
    const effect = event.content.authority_effect;
    if (
      effect.effect_kind !== "none" &&
      !["tool_proposal", "interrupt", "run_lifecycle"].includes(
        event.content.semantic_kind,
      )
    ) {
      throw new InteractionRecordError(
        "INTERACTION_EVENT_AUTHORITY_INVALID",
        "Only command-related semantic events may reference a separate Petra command.",
      );
    }
  }
}
