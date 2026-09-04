import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraInteractionEventRecord,
  PetraInteractionFeatureManifest,
  PetraInteractionInterrupt,
  PetraInteractionReplayRecord,
  PetraInteractionRun,
  PetraProject,
  PetraRightsDecision,
  PetraWorkerInputManifest,
  PetraWork,
  PetraWorkUnit,
  PetraWorkVersion,
} from "@petra/contracts";
import {
  DurableInteractionHistory,
  type PersistVerifiedArtifactInput,
  type PetraInteractionEvent,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresInteractionAuthorityRepository } from "../src/interaction-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
import {
  availableArtifactStore,
  createMemoryArtifactStore,
} from "./artifact-store-fixture.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

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

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service",
  display_name: "Petra interaction service",
  created_at: "2026-08-28T18:00:01.000Z",
});

const serviceRef = () => ({
  actor_id: serviceActor().actor_id,
  actor_kind: "service" as const,
});

const artifactRegistration = (
  artifactId: string,
  idTail: string,
  contentHash: string,
  byteSize: number,
  mediaType: string,
): PersistVerifiedArtifactInput => {
  const artifact = readFixture<PetraArtifact>("artifact");
  const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
  const rightsDecision = readFixture<PetraRightsDecision>("rights-decision");
  artifact.artifact_id = artifactId;
  artifact.artifact_kind =
    mediaType === "application/pdf" ? "pdf" : "structured_text";
  artifact.media_type = mediaType;
  artifact.content_hash = contentHash;
  artifact.byte_size = byteSize;
  artifact.created_by = serviceRef();
  manifest.artifact_manifest_id = `artifact_manifest_${idTail}`;
  manifest.artifact_id = artifactId;
  manifest.rights_decision_id = `rights_decision_${idTail}`;
  manifest.storage_ref.content_hash = contentHash;
  manifest.storage_ref.object_key = `sha256/${contentHash.slice(7, 9)}/${contentHash.slice(9)}`;
  manifest.recorded_by = serviceRef();
  if (manifest.origin.origin_kind !== "acquired") {
    throw new Error("Expected acquired Artifact fixture.");
  }
  manifest.origin.response_metadata.content_type = mediaType;
  manifest.origin.response_metadata.content_length = byteSize;
  rightsDecision.rights_decision_id = manifest.rights_decision_id;
  rightsDecision.artifact_manifest_id = manifest.artifact_manifest_id;
  rightsDecision.decision_maker = serviceRef();
  return { artifact, manifest, rightsDecision };
};

describePostgres("PostgreSQL durable interaction authority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const interactions = new PostgresInteractionAuthorityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );

    await artifacts.registerVerifiedAcquisition(
      artifactRegistration(
        "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1",
        "01ARZ3NDEKTSV4RRFFQ69G5FB2",
        "sha256:76313fbb039e79b42da7b3ee67b26123f2b7e7157c80f019e688682337a0f09e",
        21,
        "application/pdf",
      ),
    );
    await artifacts.registerVerifiedAcquisition(
      artifactRegistration(
        "artifact_01ARZ3NDEKTSV4RRFFQ69G5FDJ",
        "01ARZ3NDEKTSV4RRFFQ69G5FDJ",
        "sha256:4444444444444444444444444444444444444444444444444444444444444444",
        512,
        "application/json",
      ),
    );
    await artifacts.registerVerifiedAcquisition(
      artifactRegistration(
        "artifact_01ARZ3NDEKTSV4RRFFQ69G5FDK",
        "01ARZ3NDEKTSV4RRFFQ69G5FDK",
        "sha256:5555555555555555555555555555555555555555555555555555555555555555",
        384,
        "application/json",
      ),
    );

    const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
    const inputManifest = readFixture<PetraWorkerInputManifest>(
      "worker-input-manifest",
    );
    workUnit.created_by = serviceRef();
    inputManifest.issued_by = serviceRef();
    await workUnits.register({ workUnit, inputManifest });
  });

  afterAll(async () => {
    await pool.end();
  });

  const feature = (): PetraInteractionFeatureManifest => {
    const value = readFixture<PetraInteractionFeatureManifest>(
      "interaction-feature-manifest",
    );
    value.compiled_by = serviceRef();
    return value;
  };

  const run = (): PetraInteractionRun => readFixture("interaction-run");

  const event = (): PetraInteractionEventRecord => {
    const value = readFixture<PetraInteractionEventRecord>(
      "interaction-event-record",
    );
    value.recorded_by = serviceRef();
    return value;
  };

  const pendingInterrupt = (): PetraInteractionInterrupt => {
    const value = readFixture<PetraInteractionInterrupt>(
      "interaction-interrupt-pending",
    );
    value.recorded_by = serviceRef();
    return value;
  };

  const respondedInterrupt = (): PetraInteractionInterrupt => {
    const value = readFixture<PetraInteractionInterrupt>(
      "interaction-interrupt-responded",
    );
    value.recorded_by = serviceRef();
    return value;
  };

  const replay = (): PetraInteractionReplayRecord => {
    const value = readFixture<PetraInteractionReplayRecord>(
      "interaction-replay-record",
    );
    value.recorded_by = serviceRef();
    return value;
  };

  const registerRun = async () => {
    await interactions.registerFeatureManifest(feature());
    await interactions.registerRun(run());
  };

  const appendEvent = async () => {
    await registerRun();
    await interactions.appendEvent(event());
  };

  it("persists the exact AG-UI profile, run correlation, and ordered presentation event", async () => {
    const manifest = feature();
    const interactionRun = run();
    const interactionEvent = event();
    expect(await interactions.registerFeatureManifest(manifest)).toEqual(
      manifest,
    );
    expect(await interactions.registerFeatureManifest(manifest)).toEqual(
      manifest,
    );
    expect(await interactions.registerRun(interactionRun)).toEqual(
      interactionRun,
    );
    expect(await interactions.appendEvent(interactionEvent)).toEqual(
      interactionEvent,
    );
    expect(await interactions.appendEvent(interactionEvent)).toEqual(
      interactionEvent,
    );
    expect(
      await interactions.listEvents(interactionRun.interaction_run_id),
    ).toEqual([interactionEvent]);
    expect(
      await interactions.listEvents(interactionRun.interaction_run_id, 1),
    ).toEqual([]);

    const typed = await pool.query<{
      protocol_name: string;
      sdk_version: string;
      protocol_event_type: string;
      custom_event_name: string;
      semantic_kind: string;
      artifact_id: string;
    }>(
      `SELECT feature.protocol_name, feature.sdk_version,
              event.protocol_event_type, event.custom_event_name,
              event.semantic_kind, artifact.artifact_id
         FROM petra.interaction_event_records AS event
         JOIN petra.interaction_runs AS run
           ON run.interaction_run_id = event.interaction_run_id
         JOIN petra.interaction_feature_manifests AS feature
           ON feature.interaction_feature_manifest_id = run.feature_manifest_id
         JOIN petra.artifacts AS artifact
           ON artifact.artifact_id = event.payload_artifact_id
        WHERE event.interaction_event_record_id = $1`,
      [interactionEvent.interaction_event_record_id],
    );
    expect(typed.rows[0]).toEqual({
      protocol_name: "ag-ui",
      sdk_version: "0.0.59",
      protocol_event_type: "CUSTOM",
      custom_event_name: "petra.review.interrupt",
      semantic_kind: "interrupt",
      artifact_id: "artifact_01ARZ3NDEKTSV4RRFFQ69G5FDJ",
    });
  });

  it("retains interrupt request and response history without granting authority", async () => {
    await appendEvent();
    const pending = pendingInterrupt();
    const responded = respondedInterrupt();
    await interactions.registerInterrupt(pending);
    await interactions.registerInterrupt(responded);
    expect(
      (await interactions.getInterrupt(pending.interaction_interrupt_id))
        ?.content.state,
    ).toBe("responded");
    expect(
      (
        await interactions.getInterruptRevision(
          pending.interaction_interrupt_id,
          1,
        )
      )?.content.state,
    ).toBe("pending");

    const typed = await pool.query<{
      state: string;
      subject_ref: string;
      resulting_command_id: string;
      authority_effect: string;
      command_count: string;
    }>(
      `SELECT revision.state, subject.subject_ref,
              revision.resulting_command_id, revision.authority_effect,
              (SELECT count(*)::text FROM petra.command_executions) AS command_count
         FROM petra.interaction_interrupt_revisions AS revision
         JOIN petra.interaction_interrupt_subjects AS subject
           ON subject.interaction_interrupt_id = revision.interaction_interrupt_id
          AND subject.revision = revision.revision
        WHERE revision.interaction_interrupt_id = $1 AND revision.revision = 2`,
      [pending.interaction_interrupt_id],
    );
    expect(typed.rows[0]).toEqual({
      state: "responded",
      subject_ref: "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF",
      resulting_command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FBM",
      authority_effect: "command_input_only",
      command_count: "0",
    });
  });

  it("advances an exact run head and records reconnect attempts without reapplying work", async () => {
    await appendEvent();
    const pending = pendingInterrupt();
    await interactions.registerInterrupt(pending);
    const root = run();
    const next = run();
    next.revision = 2;
    next.lineage = {
      lineage_kind: "revision",
      parent_revision: 1,
      parent_hash: root.content_hash,
    };
    next.content.lifecycle = {
      state: "awaiting_interrupt",
      started_at: "2026-08-29T16:00:01.000Z",
      interaction_interrupt_ids: [pending.interaction_interrupt_id],
    };
    next.content.stream_head = {
      state: "advanced",
      event_count: 1,
      latest_sequence: 1,
      head_hash: event().content_hash,
    };
    next.updated_at = "2026-08-29T16:00:03.000Z";
    next.content_hash = canonicalHash(next.content);
    await interactions.registerRun(next);
    expect((await interactions.getRun(root.interaction_run_id))?.revision).toBe(
      2,
    );

    const initial = replay();
    await interactions.registerReplay(initial);
    expect(await interactions.registerReplay(initial)).toEqual(initial);
    const resumed = replay();
    resumed.interaction_replay_record_id =
      "interaction_replay_record_01ARZ3NDEKTSV4RRFFQ69G5FDP";
    resumed.content.attempt = 2;
    resumed.content.request = { delivery_kind: "resume", after_sequence: 1 };
    resumed.content.delivered_event_refs = [];
    resumed.content.started_at = "2026-08-29T16:00:04.000Z";
    resumed.content.completed_at = "2026-08-29T16:00:05.000Z";
    resumed.recorded_at = "2026-08-29T16:00:05.000Z";
    resumed.content_hash = canonicalHash(resumed.content);
    await interactions.registerReplay(resumed);

    const observation = await pool.query<{
      current_attempt: number;
      work_revision: string;
      work_state: string;
      authority_reapplied: string;
      commands_reexecuted: string;
      durable_work_cancelled: string;
    }>(
      `SELECT connection.current_attempt,
              work.revision AS work_revision, work.state AS work_state,
              replay.payload #>> '{content,authority_boundary,authority_reapplied}' AS authority_reapplied,
              replay.payload #>> '{content,authority_boundary,commands_reexecuted}' AS commands_reexecuted,
              replay.payload #>> '{content,authority_boundary,durable_work_cancelled}' AS durable_work_cancelled
         FROM petra.interaction_connections AS connection
         JOIN petra.interaction_replay_records AS replay
           ON replay.connection_id = connection.connection_id
          AND replay.attempt = connection.current_attempt
         JOIN petra.work_unit_revisions AS work
           ON work.work_unit_id = replay.observed_work_unit_id
          AND work.revision = replay.observed_work_unit_revision
        WHERE connection.connection_id = $1`,
      [initial.content.connection_id],
    );
    expect(observation.rows[0]).toEqual({
      current_attempt: 2,
      work_revision: "1",
      work_state: "requested",
      authority_reapplied: "false",
      commands_reexecuted: "false",
      durable_work_cancelled: "false",
    });
  });

  it("rejects event gaps, incomplete replay, and rebound identities atomically", async () => {
    await registerRun();
    const gap = event();
    gap.interaction_event_record_id =
      "interaction_event_record_01ARZ3NDEKTSV4RRFFQ69G5FDN";
    gap.sequence = 2;
    gap.lineage = {
      lineage_kind: "continuation",
      previous_event_record_id:
        "interaction_event_record_01ARZ3NDEKTSV4RRFFQ69G5FD7",
      previous_sequence: 1,
      previous_content_hash: event().content_hash,
    };
    await expect(interactions.appendEvent(gap)).rejects.toEqual(
      expect.objectContaining({ code: "INTERACTION_EVENT_SEQUENCE_INVALID" }),
    );
    expect(await interactions.listEvents(run().interaction_run_id)).toEqual([]);

    await interactions.appendEvent(event());
    const incomplete = replay();
    incomplete.content.delivered_event_refs = [];
    incomplete.content_hash = canonicalHash(incomplete.content);
    await expect(interactions.registerReplay(incomplete)).rejects.toEqual(
      expect.objectContaining({ code: "INTERACTION_REPLAY_OUTCOME_INVALID" }),
    );
    expect(
      await interactions.getReplay(incomplete.interaction_replay_record_id),
    ).toBe(undefined);

    const rebound = event();
    rebound.content.visibility.audience = "project";
    rebound.content_hash = canonicalHash(rebound.content);
    await expect(interactions.appendEvent(rebound)).rejects.toEqual(
      expect.objectContaining({ code: "INTERACTION_ID_ALREADY_REGISTERED" }),
    );
  });

  it("enforces payload provenance and append-only history in PostgreSQL", async () => {
    await appendEvent();
    await interactions.registerInterrupt(pendingInterrupt());
    await interactions.registerReplay(replay());

    await expect(
      pool.query(
        "UPDATE petra.interaction_event_records SET semantic_kind = 'custom'",
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query("DELETE FROM petra.interaction_replay_records"),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));
    await expect(
      pool.query(
        "UPDATE petra.interaction_runs SET protocol_run_id = 'rebound'",
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "55000" }));

    const missingArtifact = event();
    missingArtifact.interaction_event_record_id =
      "interaction_event_record_01ARZ3NDEKTSV4RRFFQ69G5FDQ";
    missingArtifact.sequence = 2;
    missingArtifact.lineage = {
      lineage_kind: "continuation",
      previous_event_record_id: event().interaction_event_record_id,
      previous_sequence: 1,
      previous_content_hash: event().content_hash,
    };
    missingArtifact.content.payload_artifact_ref.artifact_id =
      "artifact_01ARZ3NDEKTSV4RRFFQ69G5FDR";
    missingArtifact.content_hash = canonicalHash(missingArtifact.content);
    await expect(interactions.appendEvent(missingArtifact)).rejects.toEqual(
      expect.objectContaining({ code: "23503" }),
    );
    expect(
      await interactions.listEvents(run().interaction_run_id),
    ).toHaveLength(1);
  });

  it("persists logical events as immutable Artifacts and restores exact replay after restart", async () => {
    await registerRun();
    const root = run();
    const originalWorkUnit = await workUnits.getWorkUnit(
      root.content.correlation.work_unit_ref.work_unit_id,
    );
    const store = createMemoryArtifactStore();
    const history = new DurableInteractionHistory({
      serviceActor: serviceActor(),
      artifactStore: store,
      artifacts: new PostgresArtifactAuthorityRepository(pool, store),
      interactions,
      workUnits,
    });
    const envelope = {
      threadId: root.content.correlation.protocol_thread_id,
      runId: root.content.correlation.protocol_run_id,
      workUnitId: root.content.correlation.work_unit_ref.work_unit_id,
      modelRequestId: root.content.correlation.model_request_id!,
      requestId: root.content.correlation.request_id,
      traceId: root.content.correlation.trace_id,
    };
    const events = [
      {
        ...envelope,
        sequence: 1,
        timestamp: Date.parse("2026-09-04T02:30:00.000Z"),
        kind: "run.started",
      },
      {
        ...envelope,
        sequence: 2,
        timestamp: Date.parse("2026-09-04T02:30:00.100Z"),
        kind: "text.start",
        messageId: "message_durable_replay",
      },
      {
        ...envelope,
        sequence: 3,
        timestamp: Date.parse("2026-09-04T02:30:00.200Z"),
        kind: "text.delta",
        messageId: "message_durable_replay",
        delta: "A durable, non-authoritative presentation event.",
      },
    ] satisfies PetraInteractionEvent[];

    const initialRecords = await history.persistEvents(
      root,
      events.slice(0, 2),
    );
    const terminalLifecycle = {
      state: "completed",
      started_at: root.content.lifecycle.started_at,
      ended_at: "2026-09-04T02:30:02.000Z",
      outcome_code: "INTERACTION_PRESENTATION_READY",
    } as const;
    const terminal = await history.advanceRun(
      root,
      initialRecords,
      terminalLifecycle,
      terminalLifecycle.ended_at,
    );
    expect(terminal.revision).toBe(2);
    expect(terminal.content.stream_head).toEqual(
      expect.objectContaining({ event_count: 2, latest_sequence: 2 }),
    );

    const completeRecords = await history.persistEvents(terminal, [events[2]!]);
    const presented = await history.advanceRun(
      terminal,
      completeRecords,
      terminal.content.lifecycle,
      "2026-09-04T02:30:03.000Z",
    );
    expect(presented.revision).toBe(3);
    expect(presented.content.lifecycle).toEqual(terminal.content.lifecycle);
    expect(presented.content.stream_head).toEqual(
      expect.objectContaining({ event_count: 3, latest_sequence: 3 }),
    );

    const restored = await history.restore(envelope.threadId, envelope.runId);
    expect(restored?.events).toEqual(events);
    expect(restored?.run).toEqual(presented);
    expect(restored?.status).toBe("completed");

    const connectionId = "interaction_connection_01ARZ3NDEKTSV4RRFFQ69G5FDS";
    await history.recordDelivery({
      connectionId,
      threadId: envelope.threadId,
      runId: envelope.runId,
      deliveryKind: "initial",
      afterSequence: 0,
      lastDeliveredSequence: 3,
      outcome: "completed",
      startedAt: "2026-09-04T02:30:04.000Z",
      completedAt: "2026-09-04T02:30:05.000Z",
    });
    await history.recordDelivery({
      connectionId,
      threadId: envelope.threadId,
      runId: envelope.runId,
      deliveryKind: "resume",
      afterSequence: 3,
      lastDeliveredSequence: 3,
      outcome: "completed",
      startedAt: "2026-09-04T02:30:06.000Z",
      completedAt: "2026-09-04T02:30:07.000Z",
    });
    expect(await interactions.getConnectionAttempt(connectionId)).toBe(2);
    expect(await workUnits.getWorkUnit(envelope.workUnitId)).toEqual(
      originalWorkUnit,
    );
  });
});
