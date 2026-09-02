import { createHash } from "node:crypto";

import type {
  PetraGraphProjectionRecord,
  PetraOutboxRecord,
  PetraProjectionCheckpoint,
  ProjectionIdentity,
} from "@petra/contracts";
import { canonicalize } from "json-canonicalize";

import {
  buildAuthorityGraphBatch,
  type AuthorityGraphProjectionSource,
} from "./authority-graph-projection.js";
import type { GraphProjectionAuthorityRepository } from "./graph-projection-authority-repository.js";
import {
  GraphProjectionError,
  graphProjectionEffectForOutbox,
  graphProjectionOutboxReference,
} from "./graph-projection-registry.js";
import {
  AuthorityGraphStoreError,
  type AuthorityGraphStore,
  type GraphCommitReceipt,
} from "./graph-store.js";

export interface ScientificGraphProjectorFactory {
  nextProjectionRecordId(): string;
  now(): string;
  serviceActor: {
    actor_id: string;
    actor_kind: "service";
  };
}

export interface ScientificGraphProjectionResult {
  checkpoint: PetraProjectionCheckpoint;
  record?: PetraGraphProjectionRecord;
  replayed: boolean;
}

const hash = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;

const currentPosition = (checkpoint: PetraProjectionCheckpoint): number =>
  checkpoint.content.position.target_sequence;

const failureCode = (error: unknown): string => {
  if (
    error instanceof AuthorityGraphStoreError &&
    error.code === "GRAPH_PROJECTION_GAP"
  ) {
    return "SEQUENCE_GAP";
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "GRAPH_PROJECTION_FAILED";
};

const failureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "The graph projection failed.";

const failureRetryable = (error: unknown): boolean =>
  !(
    error instanceof AuthorityGraphStoreError &&
    ["GRAPH_BATCH_INVALID", "GRAPH_IDENTITY_CONFLICT"].includes(error.code)
  );

/**
 * Coordinates the one permitted dual-system sequence: commit Neo4j first, then
 * append its receipt and advance the PostgreSQL checkpoint. A retry after a
 * crash between those commits is safe because AuthorityGraphStore.apply is
 * idempotent for the exact outbox identity.
 */
export class ScientificGraphProjector {
  readonly #authority: GraphProjectionAuthorityRepository;
  readonly #source: AuthorityGraphProjectionSource;
  readonly #graph: AuthorityGraphStore;
  readonly #factory: ScientificGraphProjectorFactory;

  constructor(options: {
    authority: GraphProjectionAuthorityRepository;
    source: AuthorityGraphProjectionSource;
    graph: AuthorityGraphStore;
    factory: ScientificGraphProjectorFactory;
  }) {
    this.#authority = options.authority;
    this.#source = options.source;
    this.#graph = options.graph;
    this.#factory = options.factory;
  }

  async project(
    checkpointId: string,
    outbox: PetraOutboxRecord,
  ): Promise<ScientificGraphProjectionResult> {
    const checkpoint = await this.#authority.getCheckpoint(checkpointId);
    if (checkpoint === undefined) {
      throw new GraphProjectionError(
        "CHECKPOINT_NOT_REGISTERED",
        `Projection checkpoint ${checkpointId} is not registered.`,
      );
    }
    const records = await this.#authority.getProjectionRecords(checkpointId);
    const prior = records.filter(
      (record) => record.content.outbox_ref.outbox_id === outbox.outbox_id,
    );
    const applied = prior.find(
      (record) => record.content.outcome.outcome_kind === "applied",
    );
    if (applied !== undefined) {
      return { checkpoint, record: applied, replayed: true };
    }
    if (outbox.target_sequence !== currentPosition(checkpoint) + 1) {
      throw new GraphProjectionError(
        "PROJECTION_SEQUENCE_GAP",
        "The projector accepts only the next contiguous graph outbox sequence.",
      );
    }

    const startedAt = this.#factory.now();
    let receipt: GraphCommitReceipt;
    try {
      const material = await this.#source.load(outbox);
      const batch = buildAuthorityGraphBatch(
        checkpoint.projection,
        outbox,
        material,
      );
      receipt = await this.#graph.apply(batch);
    } catch (error) {
      const completedAt = this.#factory.now();
      const record = this.#record(outbox, checkpoint.projection, {
        attempt: prior.length + 1,
        startedAt,
        completedAt,
        outcome: {
          outcome_kind: "failed",
          failure: {
            code: failureCode(error),
            message: failureMessage(error),
            retryable: failureRetryable(error),
          },
        },
      });
      const next = await this.#authority.record(
        checkpointId,
        outbox,
        record,
        checkpoint.revision,
      );
      return { checkpoint: next, record, replayed: false };
    }

    const completedAt = this.#factory.now();
    const effect = graphProjectionEffectForOutbox(outbox);
    const record = this.#record(outbox, checkpoint.projection, {
      attempt: prior.length + 1,
      startedAt,
      completedAt,
      outcome: {
        outcome_kind: "applied",
        effect,
        effect_hash: hash(effect),
        backend_receipt: {
          backend_kind: receipt.backendKind,
          receipt: receipt.receipt,
        },
      },
    });
    const next = await this.#authority.record(
      checkpointId,
      outbox,
      record,
      checkpoint.revision,
    );
    return { checkpoint: next, record, replayed: receipt.duplicate };
  }

  async rebuild(
    projectId: string,
    projection: ProjectionIdentity,
    outboxes: readonly PetraOutboxRecord[],
  ): Promise<readonly GraphCommitReceipt[]> {
    const ordered = [...outboxes].sort(
      (left, right) => left.target_sequence - right.target_sequence,
    );
    for (const [index, outbox] of ordered.entries()) {
      if (
        outbox.partition_key !== projectId ||
        outbox.target !== "neo4j_graph" ||
        outbox.target_sequence !== index + 1
      ) {
        throw new GraphProjectionError(
          "PROJECTION_SEQUENCE_GAP",
          "A rebuild requires the complete contiguous Neo4j outbox stream for one Project.",
        );
      }
    }
    await this.#graph.clearProject(projectId, projection);
    const receipts: GraphCommitReceipt[] = [];
    for (const outbox of ordered) {
      const material = await this.#source.load(outbox);
      receipts.push(
        await this.#graph.apply(
          buildAuthorityGraphBatch(projection, outbox, material),
        ),
      );
    }
    return receipts;
  }

  #record(
    outbox: PetraOutboxRecord,
    projection: ProjectionIdentity,
    input: Pick<
      PetraGraphProjectionRecord["content"],
      "attempt" | "outcome"
    > & { startedAt: string; completedAt: string },
  ): PetraGraphProjectionRecord {
    const content: PetraGraphProjectionRecord["content"] = {
      outbox_ref: graphProjectionOutboxReference(outbox),
      attempt: input.attempt,
      started_at: input.startedAt,
      completed_at: input.completedAt,
      outcome: input.outcome,
    };
    return {
      schema_name: "petra.graph-projection-record",
      schema_version: "1.0.0",
      graph_projection_record_id: this.#factory.nextProjectionRecordId(),
      revision: 1,
      project_id: outbox.partition_key,
      projection: structuredClone(projection),
      content,
      content_hash: hash(content),
      recorded_by: structuredClone(this.#factory.serviceActor),
      recorded_at: input.completedAt,
    };
  }
}
