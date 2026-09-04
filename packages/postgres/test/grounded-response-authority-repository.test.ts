import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAuthor,
  PetraDomainEventRecord,
  PetraEvidencePacket,
  PetraGroundedResponse,
  PetraInteractionFeatureManifest,
  PetraInteractionRun,
  PetraProject,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWork,
  PetraWorkUnit,
  PetraWorkVersion,
} from "@petra/contracts";
import type { PersistVerifiedArtifactInput } from "@petra/core";
import {
  groundedResponseCacheKey,
  InMemoryContextPacketRegistry,
  type RegisterGroundedResponseInput,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresGroundedResponseAuthorityRepository } from "../src/grounded-response-authority-repository.js";
import { PostgresInteractionAuthorityRepository } from "../src/interaction-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { PostgresSynthesistExecutionRepository } from "../src/synthesist-execution-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
import { availableArtifactStore } from "./artifact-store-fixture.js";

const { Pool } = pg;
const connectionString = process.env.PETRA_TEST_POSTGRES_URL;
const describePostgres =
  connectionString === undefined ? describe.skip : describe;

const RESPONSE_TEXT =
  "H01 — The selected study reports a measurable improvement on its evaluation task.\n\nThe claim is limited to its study-defined evaluation task.";

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

const sha256 = (bytes: Uint8Array): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const canonicalHash = (value: unknown): string =>
  sha256(new TextEncoder().encode(canonicalize(value)));

const serviceActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "service",
  display_name: "Petra grounded-response service",
  created_at: "2026-08-28T18:00:01.000Z",
});

const serviceRef = () => ({
  actor_id: serviceActor().actor_id,
  actor_kind: "service" as const,
});

const makePackets = (): {
  registry: InMemoryContextPacketRegistry;
  evidence: PetraEvidencePacket;
} => {
  const registry = new InMemoryContextPacketRegistry();
  const context =
    readFixture<
      Parameters<InMemoryContextPacketRegistry["registerContextPacket"]>[0]
    >("context-packet");
  const evidence = readFixture<PetraEvidencePacket>("evidence-packet");
  const applied = readFixture<PetraDomainEventRecord>(
    "domain-event-change-set-applied",
  );
  if (applied.event.event_type !== "change_set.applied") {
    throw new Error("Expected an applied authority event fixture.");
  }
  context.compiled_by = serviceRef();
  evidence.compiled_by = serviceRef();
  registry.registerContextPacket(context, [
    applied.event.payload.claim,
    applied.event.payload.assertion,
    readFixture<PetraSourceSpan>("source-span"),
  ]);
  registry.registerEvidencePacket(evidence);
  return { registry, evidence };
};

const certification = (): PetraSynthesistRoleCertification => {
  const value = readFixture<PetraSynthesistRoleCertification>(
    "model-role-certification-synthesist",
  );
  value.content_hash = canonicalHash({
    deployment: value.deployment,
    role_profile: value.role_profile,
    scope: value.scope,
    evaluation: value.evaluation,
    decision: value.decision,
  });
  return value;
};

const execution = (): {
  request: PetraSynthesistModelRequest;
  call: PetraSynthesistModelCall;
} => {
  const request = readFixture<PetraSynthesistModelRequest>(
    "model-request-synthesist",
  );
  const call = readFixture<PetraSynthesistModelCall>("model-call-synthesist");
  if (
    request.content.terminal.state !== "completed" ||
    call.content.output === undefined
  ) {
    throw new Error("Expected completed synthesist fixtures.");
  }
  request.content.terminal.output_hash = canonicalHash(call.content.output);
  call.content_hash = canonicalHash(call.content);
  request.content_hash = canonicalHash(request.content);
  return { request, call };
};

const verifiedArtifact = (
  artifactId: string,
  idTail: string,
  contentHash: string,
  byteSize: number,
  mediaType: string,
  kind: PetraArtifact["artifact_kind"],
): PersistVerifiedArtifactInput => {
  const artifact = readFixture<PetraArtifact>("artifact");
  const manifest = readFixture<PetraArtifactManifest>("artifact-manifest");
  const rightsDecision = readFixture<PetraRightsDecision>("rights-decision");
  artifact.artifact_id = artifactId;
  artifact.artifact_kind = kind;
  artifact.media_type = mediaType;
  artifact.content_hash = contentHash;
  artifact.byte_size = byteSize;
  artifact.created_by = serviceRef();
  artifact.created_at = "2026-09-03T18:31:05.500Z";
  manifest.artifact_manifest_id = `artifact_manifest_${idTail}`;
  manifest.artifact_id = artifactId;
  manifest.rights_decision_id = `rights_decision_${idTail}`;
  if (manifest.origin.origin_kind !== "acquired") {
    throw new Error("Expected an acquired ArtifactManifest fixture.");
  }
  manifest.origin.response_metadata.content_type = mediaType;
  manifest.origin.response_metadata.content_length = byteSize;
  manifest.storage_ref.content_hash = contentHash;
  manifest.storage_ref.object_key = `sha256/${contentHash.slice(7, 9)}/${contentHash.slice(9)}`;
  manifest.recorded_by = serviceRef();
  manifest.recorded_at = "2026-09-03T18:31:05.500Z";
  rightsDecision.rights_decision_id = manifest.rights_decision_id;
  rightsDecision.artifact_manifest_id = manifest.artifact_manifest_id;
  rightsDecision.decision_maker = serviceRef();
  rightsDecision.created_at = "2026-09-03T18:31:05.500Z";
  return { artifact, manifest, rightsDecision };
};

const makeWork = (
  request: PetraSynthesistModelRequest,
  evidence: PetraEvidencePacket,
): {
  workUnit: PetraWorkUnit;
  inputManifest: PetraWorkerInputManifest;
  outputManifest: PetraWorkerOutputManifest;
} => {
  const workUnit = readFixture<PetraWorkUnit>("work-unit-requested");
  const inputManifest = readFixture<PetraWorkerInputManifest>(
    "worker-input-manifest",
  );
  const outputManifest = readFixture<PetraWorkerOutputManifest>(
    "worker-output-manifest",
  );
  const cacheKey = groundedResponseCacheKey(request, evidence);
  workUnit.spec.workflow_name = "petra.synthesis.grounded";
  workUnit.spec.workflow_version = "1.0.0";
  workUnit.spec.objective = request.content.objective;
  workUnit.spec.work_mode = "interactive";
  workUnit.spec.priority = "user_blocking";
  workUnit.spec.idempotency_key = `work:${cacheKey}`;
  workUnit.spec.cache = { cache_mode: "reuse_exact", cache_key: cacheKey };
  workUnit.created_by = serviceRef();
  workUnit.spec_hash = canonicalHash(workUnit.spec);
  inputManifest.issued_by = serviceRef();
  outputManifest.content.started_at = "2026-09-03T18:31:01.000Z";
  outputManifest.content.completed_at = "2026-09-03T18:31:04.000Z";
  outputManifest.reported_at = outputManifest.content.completed_at;
  outputManifest.content_hash = canonicalHash(outputManifest.content);
  return { workUnit, inputManifest, outputManifest };
};

const terminalInteraction = (
  request: PetraSynthesistModelRequest,
  workUnit: PetraWorkUnit,
): {
  feature: PetraInteractionFeatureManifest;
  runs: PetraInteractionRun[];
} => {
  const feature = readFixture<PetraInteractionFeatureManifest>(
    "interaction-feature-manifest",
  );
  feature.compiled_by = serviceRef();
  const initial = readFixture<PetraInteractionRun>("interaction-run");
  initial.content.correlation.work_unit_ref = {
    work_unit_id: workUnit.work_unit_id,
    revision: workUnit.revision,
    spec_hash: workUnit.spec_hash,
  };
  initial.content.correlation.model_request_id = request.model_request_id;
  initial.content_hash = canonicalHash(initial.content);
  const terminal = structuredClone(initial);
  terminal.revision = 2;
  terminal.lineage = {
    lineage_kind: "revision",
    parent_revision: 1,
    parent_hash: initial.content_hash,
  };
  terminal.content.lifecycle = {
    state: "completed",
    started_at: initial.content.lifecycle.started_at,
    ended_at: "2026-09-03T18:31:06.000Z",
    outcome_code: "GROUNDED_RESPONSE_READY",
  };
  terminal.updated_at = "2026-09-03T18:31:06.000Z";
  terminal.content_hash = canonicalHash(terminal.content);
  return { feature, runs: [initial, terminal] };
};

describePostgres("PostgreSQL grounded-response authority", () => {
  const pool = new Pool({ connectionString });
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const synthesist = new PostgresSynthesistExecutionRepository(pool);
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const interactions = new PostgresInteractionAuthorityRepository(pool);

  beforeAll(async () => {
    await pool.query("SELECT 1");
  });

  beforeEach(async () => {
    await pool.query("TRUNCATE petra.actors CASCADE");
    await pool.query(
      `UPDATE petra.authority_positions
          SET event_position = 0, outbox_position = 0
        WHERE singleton`,
    );
    await scopes.registerActor(readFixture<PetraActor>("actor"));
    await scopes.registerActor(serviceActor());
    await scopes.registerProjectRevision(readFixture<PetraProject>("project"));
    await identities.registerAuthorRevision(readFixture<PetraAuthor>("author"));
    await identities.registerWorkRevision(readFixture<PetraWork>("work"));
    await identities.registerWorkVersionRevision(
      readFixture<PetraWorkVersion>("work-version"),
    );
    const source = readFixture<PetraArtifact>("artifact");
    await artifacts.registerVerifiedAcquisition(
      verifiedArtifact(
        source.artifact_id,
        "01ARZ3NDEKTSV4RRFFQ69G5FB2",
        source.content_hash,
        source.byte_size,
        source.media_type,
        source.artifact_kind,
      ),
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  const persistTerminal = async (): Promise<{
    packets: InMemoryContextPacketRegistry;
    input: RegisterGroundedResponseInput;
  }> => {
    const { registry: packets, evidence } = makePackets();
    const { request, call } = execution();
    const role = certification();
    await synthesist.registerCertification(role);
    await synthesist.persistExecution({ request, calls: [call] });

    const work = makeWork(request, evidence);
    await workUnits.register({
      workUnit: work.workUnit,
      inputManifest: work.inputManifest,
    });
    const queued = await workUnits.queue(
      work.workUnit.work_unit_id,
      1,
      "2026-09-03T18:31:00.500Z",
    );
    const running = await workUnits.start(
      work.workUnit.work_unit_id,
      queued.revision,
      1,
      "2026-09-03T18:31:01.000Z",
    );
    const completed = await workUnits.complete(
      work.outputManifest,
      running.revision,
    );

    const responseBytes = new TextEncoder().encode(RESPONSE_TEXT);
    const responseArtifact = verifiedArtifact(
      "artifact_01ARZ3NDEKTSV4RRFFQ69G5FEA",
      "01ARZ3NDEKTSV4RRFFQ69G5FEA",
      sha256(responseBytes),
      responseBytes.byteLength,
      "text/markdown; charset=utf-8",
      "run_output",
    );
    await artifacts.registerVerifiedAcquisition(responseArtifact);

    const interaction = terminalInteraction(request, completed);
    await interactions.registerFeatureManifest(interaction.feature);
    await interactions.registerRun(interaction.runs[0]!);
    await interactions.registerRun(interaction.runs[1]!);

    const response = readFixture<PetraGroundedResponse>("grounded-response");
    if (request.content.terminal.state !== "completed") {
      throw new Error("Expected a completed synthesist request.");
    }
    response.recorded_by = serviceRef();
    response.recorded_at = "2026-09-03T18:31:07.000Z";
    response.content.response_artifact_ref = {
      artifact_id: responseArtifact.artifact.artifact_id,
      content_hash: responseArtifact.artifact.content_hash,
      byte_size: responseArtifact.artifact.byte_size,
      media_type: "text/markdown; charset=utf-8",
    };
    response.content.model_output_hash = request.content.terminal.output_hash;
    response.content.cache.cache_key = groundedResponseCacheKey(
      request,
      evidence,
    );
    response.content.cache.checked_at = response.recorded_at;
    response.content.terminal.persisted_at = response.recorded_at;
    response.content.interaction_ref = {
      interaction_run_ref: {
        interaction_run_id: interaction.runs[1]!.interaction_run_id,
        revision: interaction.runs[1]!.revision,
        content_hash: interaction.runs[1]!.content_hash,
      },
      work_unit_ref: {
        work_unit_id: completed.work_unit_id,
        revision: completed.revision,
        spec_hash: completed.spec_hash,
      },
    };
    response.content_hash = canonicalHash(response.content);
    return {
      packets,
      input: {
        response,
        responseArtifact: responseArtifact.artifact,
        responseBytes,
        modelRequest: request,
        modelCall: call,
        interactionRun: interaction.runs[1]!,
        workUnit: completed,
      },
    };
  };

  it("persists an exact reusable response and rehydrates it after restart", async () => {
    const terminal = await persistTerminal();
    const repository = new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    );
    const stored = await repository.register(terminal.input);
    expect(await repository.register(structuredClone(terminal.input))).toEqual(
      stored,
    );

    const restarted = new PostgresGroundedResponseAuthorityRepository(
      pool,
      new InMemoryContextPacketRegistry(),
    );
    expect(await restarted.get(stored.grounded_response_id)).toEqual(stored);
    expect(await restarted.getRevision(stored.grounded_response_id, 1)).toEqual(
      stored,
    );
    expect(
      await restarted.getReusableByCacheKey(stored.content.cache.cache_key),
    ).toEqual(stored);

    const typed = await pool.query<{
      current_revision: string;
      dependency_count: string;
      context_packet_id: string;
      model_request_id: string;
    }>(
      `SELECT response.current_revision, response.context_packet_id,
              response.model_request_id,
              count(dependency.position)::text AS dependency_count
         FROM petra.grounded_responses AS response
         JOIN petra.grounded_response_dependencies AS dependency
           ON dependency.grounded_response_id = response.grounded_response_id
          AND dependency.response_revision = response.current_revision
        WHERE response.grounded_response_id = $1
        GROUP BY response.grounded_response_id`,
      [stored.grounded_response_id],
    );
    expect(typed.rows[0]).toEqual({
      current_revision: "1",
      dependency_count: "3",
      context_packet_id: stored.content.context_packet_ref.context_packet_id,
      model_request_id: stored.content.execution_ref.model_request_id,
    });
  });

  it("rolls back packets and response state when an exact upstream binding is absent", async () => {
    const terminal = await persistTerminal();
    terminal.input.interactionRun.interaction_run_id =
      "interaction_run_01ARZ3NDEKTSV4RRFFQ69G5FEF";
    terminal.input.response.content.interaction_ref.interaction_run_ref.interaction_run_id =
      terminal.input.interactionRun.interaction_run_id;
    terminal.input.response.content_hash = canonicalHash(
      terminal.input.response.content,
    );
    const repository = new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    );

    await expect(repository.register(terminal.input)).rejects.toEqual(
      expect.objectContaining({
        code: "GROUNDED_RESPONSE_PERSISTENCE_REFERENCE_MISSING",
      }),
    );
    const counts = await pool.query<{
      contexts: string;
      evidence: string;
      responses: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.context_packets) AS contexts,
         (SELECT count(*)::text FROM petra.evidence_packets) AS evidence,
         (SELECT count(*)::text FROM petra.grounded_responses) AS responses`,
    );
    expect(counts.rows[0]).toEqual({
      contexts: "0",
      evidence: "0",
      responses: "0",
    });
  });
});
