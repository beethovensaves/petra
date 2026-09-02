import { createHash } from "node:crypto";

import type {
  PetraGraphProjectionRecord,
  PetraOutboxRecord,
  PetraProjectionCheckpoint,
  ProjectionCheckpointContent,
  ProjectionEffect,
  ProjectionIdentity,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

export type GraphProjectionErrorCode =
  | "CHECKPOINT_CONTENT_HASH_MISMATCH"
  | "CHECKPOINT_ID_ALREADY_REGISTERED"
  | "CHECKPOINT_IDENTITY_ALREADY_REGISTERED"
  | "CHECKPOINT_NOT_REGISTERED"
  | "CHECKPOINT_SEMANTICS_INVALID"
  | "STALE_CHECKPOINT_REVISION"
  | "PROJECTION_RECORD_CONTENT_HASH_MISMATCH"
  | "PROJECTION_RECORD_ID_ALREADY_REGISTERED"
  | "PROJECTION_EFFECT_HASH_MISMATCH"
  | "PROJECTION_EFFECT_MISMATCH"
  | "PROJECTION_IDENTITY_MISMATCH"
  | "PROJECTION_OUTBOX_TARGET_INVALID"
  | "PROJECTION_OUTBOX_PROJECT_MISMATCH"
  | "PROJECTION_OUTBOX_REFERENCE_MISMATCH"
  | "PROJECTION_OUTBOX_NOT_OBSERVED"
  | "PROJECTION_ATTEMPT_INVALID"
  | "PROJECTION_SEQUENCE_GAP"
  | "PROJECTION_RECORD_STALE"
  | "PROJECTION_TIMESTAMP_INVALID"
  | "PROJECTION_FAILURE_INVALID";

export class GraphProjectionError extends Error {
  readonly code: GraphProjectionErrorCode;

  constructor(code: GraphProjectionErrorCode, message: string) {
    super(message);
    this.name = "GraphProjectionError";
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

interface StoredProjectionRecord {
  readonly fingerprint: string;
  readonly record: DeepReadonly<PetraGraphProjectionRecord>;
}

interface ProjectionState {
  checkpoint: DeepReadonly<PetraProjectionCheckpoint>;
  readonly history: Map<number, DeepReadonly<PetraProjectionCheckpoint>>;
  readonly records: StoredProjectionRecord[];
  readonly recordsById: Map<string, StoredProjectionRecord>;
  readonly recordsByOutbox: Map<string, StoredProjectionRecord[]>;
  readonly appliedOutboxIds: Set<string>;
}

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

const identityKey = (
  projectId: string,
  projection: ProjectionIdentity,
): string => `${projectId}:${canonicalize(projection)}`;

const identitiesMatch = (
  left: ProjectionIdentity,
  right: ProjectionIdentity,
): boolean => canonicalize(left) === canonicalize(right);

export const graphProjectionOutboxReference = (
  outbox: PetraOutboxRecord,
): PetraGraphProjectionRecord["content"]["outbox_ref"] => ({
  outbox_id: outbox.outbox_id,
  outbox_position: outbox.outbox_position,
  target_sequence: outbox.target_sequence,
  event_id: outbox.message.event.event_id,
  event_position: outbox.message.event.event_position,
  stream_revision: outbox.message.event.stream_revision,
});

const observedHead = (
  outbox: PetraOutboxRecord,
  observedAt: string,
): PetraProjectionCheckpoint["content"]["observed_head"] => ({
  ...graphProjectionOutboxReference(outbox),
  observed_at: observedAt,
});

const positionSequence = (
  checkpoint:
    PetraProjectionCheckpoint | DeepReadonly<PetraProjectionCheckpoint>,
): number => checkpoint.content.position.target_sequence;

export const graphProjectionEffectForOutbox = (
  outbox: PetraOutboxRecord,
): ProjectionEffect => {
  const event = outbox.message.event;
  if (event.event.event_type !== "change_set.applied") {
    throw new GraphProjectionError(
      "PROJECTION_EFFECT_MISMATCH",
      "Only a self-contained change_set.applied event can enter the authority graph projection.",
    );
  }
  return {
    source_event_id: event.event_id,
    objects: [
      {
        graph_element_kind: "node",
        object_id: event.event.payload.claim.claim_id,
        object_revision: event.event.payload.claim.revision,
        operation: "upsert",
      },
      {
        graph_element_kind: "relationship",
        object_id: event.event.payload.assertion.assertion_id,
        object_revision: event.event.payload.assertion.revision,
        operation: "upsert",
      },
    ],
  };
};

const assertOutboxForCheckpoint = (
  checkpoint: DeepReadonly<PetraProjectionCheckpoint>,
  outbox: PetraOutboxRecord,
): void => {
  if (outbox.target !== "neo4j_graph") {
    throw new GraphProjectionError(
      "PROJECTION_OUTBOX_TARGET_INVALID",
      "The graph projector accepts only neo4j_graph outbox records.",
    );
  }
  if (
    outbox.partition_key !== checkpoint.project_id ||
    outbox.message.event.project_id !== checkpoint.project_id
  ) {
    throw new GraphProjectionError(
      "PROJECTION_OUTBOX_PROJECT_MISMATCH",
      "The outbox record and embedded event must belong to the checkpoint Project.",
    );
  }
};

const assertCheckpointSemantics = (
  checkpoint: PetraProjectionCheckpoint,
): void => {
  if (checkpoint.content_hash !== canonicalHash(checkpoint.content)) {
    throw new GraphProjectionError(
      "CHECKPOINT_CONTENT_HASH_MISMATCH",
      "The checkpoint content hash does not identify its exact canonical content.",
    );
  }
  if (checkpoint.projection.target !== "neo4j_graph") {
    throw new GraphProjectionError(
      "CHECKPOINT_SEMANTICS_INVALID",
      "A graph checkpoint must identify the neo4j_graph projection.",
    );
  }
  const position = checkpoint.content.position.target_sequence;
  const head = checkpoint.content.observed_head.target_sequence;
  const pending = head - position;
  if (pending < 0 || checkpoint.content.freshness.pending_records !== pending) {
    throw new GraphProjectionError(
      "CHECKPOINT_SEMANTICS_INVALID",
      "Checkpoint pending_records must equal observed head minus contiguous position.",
    );
  }
  const state = checkpoint.content.freshness.state;
  if (
    (pending === 0 && state !== "current") ||
    (pending > 0 && state === "current")
  ) {
    throw new GraphProjectionError(
      "CHECKPOINT_SEMANTICS_INVALID",
      "Checkpoint freshness must be current exactly when no records are pending.",
    );
  }
};

export class InMemoryGraphProjectionRegistry {
  readonly #states = new Map<string, ProjectionState>();
  readonly #checkpointByIdentity = new Map<string, string>();

  get size(): number {
    return this.#states.size;
  }

  register(
    checkpoint: PetraProjectionCheckpoint,
  ): DeepReadonly<PetraProjectionCheckpoint> {
    const fingerprint = canonicalHash(checkpoint);
    const existing = this.#states.get(checkpoint.projection_checkpoint_id);
    if (existing !== undefined) {
      if (canonicalHash(existing.checkpoint) !== fingerprint) {
        throw new GraphProjectionError(
          "CHECKPOINT_ID_ALREADY_REGISTERED",
          "The checkpoint ID is already bound to different content.",
        );
      }
      return existing.checkpoint;
    }
    if (checkpoint.revision !== 1) {
      throw new GraphProjectionError(
        "CHECKPOINT_SEMANTICS_INVALID",
        "A newly registered checkpoint must begin at revision 1.",
      );
    }
    assertCheckpointSemantics(checkpoint);
    const key = identityKey(checkpoint.project_id, checkpoint.projection);
    if (this.#checkpointByIdentity.has(key)) {
      throw new GraphProjectionError(
        "CHECKPOINT_IDENTITY_ALREADY_REGISTERED",
        "This Project and projection identity already have a checkpoint.",
      );
    }
    const stored = immutableCopy(checkpoint);
    this.#states.set(checkpoint.projection_checkpoint_id, {
      checkpoint: stored,
      history: new Map([[1, stored]]),
      records: [],
      recordsById: new Map(),
      recordsByOutbox: new Map(),
      appliedOutboxIds: new Set(),
    });
    this.#checkpointByIdentity.set(key, checkpoint.projection_checkpoint_id);
    return stored;
  }

  getCheckpoint(
    checkpointId: string,
  ): DeepReadonly<PetraProjectionCheckpoint> | undefined {
    return this.#states.get(checkpointId)?.checkpoint;
  }

  getCheckpointRevision(
    checkpointId: string,
    revision: number,
  ): DeepReadonly<PetraProjectionCheckpoint> | undefined {
    return this.#states.get(checkpointId)?.history.get(revision);
  }

  getProjectionRecords(
    checkpointId: string,
  ): readonly DeepReadonly<PetraGraphProjectionRecord>[] {
    const state = this.#requireState(checkpointId);
    return immutableCopy(state.records.map((entry) => entry.record));
  }

  getRepairQueue(
    checkpointId: string,
  ): readonly DeepReadonly<PetraGraphProjectionRecord>[] {
    const state = this.#requireState(checkpointId);
    return immutableCopy(
      state.records
        .map((entry) => entry.record)
        .filter(
          (record) =>
            record.content.outcome.outcome_kind === "failed" &&
            !state.appliedOutboxIds.has(record.content.outbox_ref.outbox_id),
        ),
    );
  }

  observeHead(
    checkpointId: string,
    outbox: PetraOutboxRecord,
    expectedRevision: number,
    observedAt: string,
  ): DeepReadonly<PetraProjectionCheckpoint> {
    const state = this.#requireState(checkpointId);
    assertOutboxForCheckpoint(state.checkpoint, outbox);
    const currentHead = state.checkpoint.content.observed_head;
    if (outbox.target_sequence === currentHead.target_sequence) {
      const comparableHead = {
        outbox_id: currentHead.outbox_id,
        outbox_position: currentHead.outbox_position,
        target_sequence: currentHead.target_sequence,
        event_id: currentHead.event_id,
        event_position: currentHead.event_position,
        stream_revision: currentHead.stream_revision,
      };
      if (
        canonicalize(graphProjectionOutboxReference(outbox)) !==
        canonicalize(comparableHead)
      ) {
        throw new GraphProjectionError(
          "PROJECTION_OUTBOX_REFERENCE_MISMATCH",
          "One target sequence cannot identify two different outbox records.",
        );
      }
      return state.checkpoint;
    }
    this.#assertExpectedRevision(state, expectedRevision);
    if (outbox.target_sequence < currentHead.target_sequence) {
      throw new GraphProjectionError(
        "PROJECTION_RECORD_STALE",
        "An observed outbox head cannot move backward.",
      );
    }
    const position = positionSequence(state.checkpoint);
    const pending = outbox.target_sequence - position;
    if (pending < 1) {
      throw new GraphProjectionError(
        "CHECKPOINT_SEMANTICS_INVALID",
        "An observed head cannot precede the contiguous checkpoint position.",
      );
    }
    const freshness =
      state.checkpoint.content.freshness.state === "blocked"
        ? {
            ...state.checkpoint.content.freshness,
            pending_records: pending,
          }
        : { state: "catching_up" as const, pending_records: pending };
    return this.#advanceCheckpoint(
      state,
      {
        position: structuredClone(state.checkpoint.content.position),
        observed_head: observedHead(outbox, observedAt),
        freshness,
      },
      state.checkpoint.recorded_by,
      observedAt,
    );
  }

  record(
    checkpointId: string,
    outbox: PetraOutboxRecord,
    record: PetraGraphProjectionRecord,
    expectedRevision: number,
  ): DeepReadonly<PetraProjectionCheckpoint> {
    const state = this.#requireState(checkpointId);
    const fingerprint = canonicalHash(record);
    const existingById = state.recordsById.get(
      record.graph_projection_record_id,
    );
    if (existingById !== undefined) {
      if (existingById.fingerprint !== fingerprint) {
        throw new GraphProjectionError(
          "PROJECTION_RECORD_ID_ALREADY_REGISTERED",
          "The projection record ID is already bound to a different attempt.",
        );
      }
      return state.checkpoint;
    }
    this.#assertExpectedRevision(state, expectedRevision);
    this.#validateRecord(state, outbox, record);

    const previousAttempts =
      state.recordsByOutbox.get(outbox.outbox_id)?.length ?? 0;
    if (record.content.attempt !== previousAttempts + 1) {
      throw new GraphProjectionError(
        "PROJECTION_ATTEMPT_INVALID",
        "Projection attempts must be contiguous for each outbox record.",
      );
    }
    const position = positionSequence(state.checkpoint);
    const sequence = outbox.target_sequence;
    if (sequence <= position) {
      throw new GraphProjectionError(
        "PROJECTION_RECORD_STALE",
        "A new projection attempt cannot overwrite an already advanced position.",
      );
    }

    if (record.content.outcome.outcome_kind === "applied") {
      if (sequence !== position + 1) {
        throw new GraphProjectionError(
          "PROJECTION_SEQUENCE_GAP",
          "The projector cannot advance past a missing target sequence.",
        );
      }
      this.#validateAppliedEffect(outbox, record);
      this.#storeRecord(state, record, fingerprint);
      state.appliedOutboxIds.add(outbox.outbox_id);
      const head = state.checkpoint.content.observed_head.target_sequence;
      const pending = head - sequence;
      const freshness =
        pending === 0
          ? ({ state: "current", pending_records: 0 } as const)
          : ({ state: "catching_up", pending_records: pending } as const);
      return this.#advanceCheckpoint(
        state,
        {
          position: {
            position_kind: "advanced",
            ...record.content.outbox_ref,
            graph_projection_record_id: record.graph_projection_record_id,
            advanced_at: record.content.completed_at,
          },
          observed_head: structuredClone(
            state.checkpoint.content.observed_head,
          ),
          freshness,
        },
        record.recorded_by,
        record.recorded_at,
      );
    }

    if (
      sequence !== position + 1 &&
      record.content.outcome.failure.code !== "SEQUENCE_GAP"
    ) {
      throw new GraphProjectionError(
        "PROJECTION_FAILURE_INVALID",
        "A later outbox record may be blocked only by an explicit SEQUENCE_GAP failure.",
      );
    }
    this.#storeRecord(state, record, fingerprint);
    const pending =
      state.checkpoint.content.observed_head.target_sequence - position;
    return this.#advanceCheckpoint(
      state,
      {
        position: structuredClone(state.checkpoint.content.position),
        observed_head: structuredClone(state.checkpoint.content.observed_head),
        freshness: {
          state: "blocked",
          pending_records: pending,
          blocking_projection_record_id: record.graph_projection_record_id,
          failure_code: record.content.outcome.failure.code,
          message: record.content.outcome.failure.message,
          blocked_at: record.content.completed_at,
        },
      },
      record.recorded_by,
      record.recorded_at,
    );
  }

  #validateRecord(
    state: ProjectionState,
    outbox: PetraOutboxRecord,
    record: PetraGraphProjectionRecord,
  ): void {
    assertOutboxForCheckpoint(state.checkpoint, outbox);
    if (record.content_hash !== canonicalHash(record.content)) {
      throw new GraphProjectionError(
        "PROJECTION_RECORD_CONTENT_HASH_MISMATCH",
        "The projection record content hash does not identify its exact content.",
      );
    }
    if (
      record.project_id !== state.checkpoint.project_id ||
      !identitiesMatch(record.projection, state.checkpoint.projection)
    ) {
      throw new GraphProjectionError(
        "PROJECTION_IDENTITY_MISMATCH",
        "The projection record must use the checkpoint's exact Project and projection identity.",
      );
    }
    if (
      canonicalize(record.content.outbox_ref) !==
      canonicalize(graphProjectionOutboxReference(outbox))
    ) {
      throw new GraphProjectionError(
        "PROJECTION_OUTBOX_REFERENCE_MISMATCH",
        "The projection record must identify the exact outbox record and embedded event.",
      );
    }
    const head = state.checkpoint.content.observed_head;
    if (outbox.target_sequence > head.target_sequence) {
      throw new GraphProjectionError(
        "PROJECTION_OUTBOX_NOT_OBSERVED",
        "The checkpoint must observe an outbox head before recording its projection attempt.",
      );
    }
    if (
      record.content.completed_at < record.content.started_at ||
      record.recorded_at < record.content.completed_at
    ) {
      throw new GraphProjectionError(
        "PROJECTION_TIMESTAMP_INVALID",
        "Projection completion and recording timestamps must be monotonic.",
      );
    }
  }

  #validateAppliedEffect(
    outbox: PetraOutboxRecord,
    record: PetraGraphProjectionRecord,
  ): void {
    const outcome = record.content.outcome;
    if (outcome.outcome_kind !== "applied") return;
    if (outcome.effect_hash !== canonicalHash(outcome.effect)) {
      throw new GraphProjectionError(
        "PROJECTION_EFFECT_HASH_MISMATCH",
        "The projection effect hash does not identify its exact canonical effect.",
      );
    }
    if (
      canonicalize(outcome.effect) !==
      canonicalize(graphProjectionEffectForOutbox(outbox))
    ) {
      throw new GraphProjectionError(
        "PROJECTION_EFFECT_MISMATCH",
        "The graph effect must exactly reproduce the revisions embedded in the applied event.",
      );
    }
  }

  #storeRecord(
    state: ProjectionState,
    record: PetraGraphProjectionRecord,
    fingerprint: string,
  ): void {
    const stored: StoredProjectionRecord = {
      fingerprint,
      record: immutableCopy(record),
    };
    state.records.push(stored);
    state.recordsById.set(record.graph_projection_record_id, stored);
    const attempts = state.recordsByOutbox.get(
      record.content.outbox_ref.outbox_id,
    );
    if (attempts === undefined) {
      state.recordsByOutbox.set(record.content.outbox_ref.outbox_id, [stored]);
    } else {
      attempts.push(stored);
    }
  }

  #advanceCheckpoint(
    state: ProjectionState,
    content: ProjectionCheckpointContent,
    recordedBy: PetraProjectionCheckpoint["recorded_by"],
    recordedAt: string,
  ): DeepReadonly<PetraProjectionCheckpoint> {
    const next: PetraProjectionCheckpoint = {
      ...structuredClone(state.checkpoint),
      revision: state.checkpoint.revision + 1,
      content,
      content_hash: canonicalHash(content),
      recorded_by: structuredClone(recordedBy),
      recorded_at: recordedAt,
    };
    assertCheckpointSemantics(next);
    const stored = immutableCopy(next);
    state.checkpoint = stored;
    state.history.set(next.revision, stored);
    return stored;
  }

  #requireState(checkpointId: string): ProjectionState {
    const state = this.#states.get(checkpointId);
    if (state === undefined) {
      throw new GraphProjectionError(
        "CHECKPOINT_NOT_REGISTERED",
        `Projection checkpoint ${checkpointId} is not registered.`,
      );
    }
    return state;
  }

  #assertExpectedRevision(
    state: ProjectionState,
    expectedRevision: number,
  ): void {
    if (state.checkpoint.revision !== expectedRevision) {
      throw new GraphProjectionError(
        "STALE_CHECKPOINT_REVISION",
        `Expected checkpoint revision ${expectedRevision}, found ${state.checkpoint.revision}.`,
      );
    }
  }
}
