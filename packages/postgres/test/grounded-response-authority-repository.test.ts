import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import type {
  PetraActor,
  PetraArtifact,
  PetraArtifactManifest,
  PetraAssertion,
  PetraAuthor,
  PetraClaim,
  PetraCommandEnvelope,
  PetraDomainEventRecord,
  PetraEvidencePacket,
  PetraGroundedResponse,
  PetraInteractionFeatureManifest,
  PetraInteractionRun,
  PetraProject,
  PetraParsedDocument,
  PetraRightsDecision,
  PetraSourceSpan,
  PetraStructuralBlock,
  PetraSynthesistModelCall,
  PetraSynthesistModelRequest,
  PetraSynthesistRoleCertification,
  PetraWorkerInputManifest,
  PetraWorkerOutputManifest,
  PetraWork,
  PetraWorkUnit,
  PetraWorkVersion,
} from "@petra/contracts";
import type {
  DomainRecordFactory,
  PersistDocumentBundleInput,
  PersistVerifiedArtifactInput,
} from "@petra/core";
import {
  buildCompensatingReversalCommandPlan,
  derivePetraId,
  executeCompensatingReversalPlan,
  GroundedSynthesisTerminalRecorder,
  groundedResponseCacheKey,
  InMemoryContextPacketRegistry,
  type GroundedSynthesisTerminalRequest,
  type RegisterGroundedResponseInput,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresChangeControlAuthorityRepository } from "../src/change-control-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresGroundedResponseAuthorityRepository } from "../src/grounded-response-authority-repository.js";
import { PostgresInteractionAuthorityRepository } from "../src/interaction-authority-repository.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import { PostgresScholarlyIdentityRepository } from "../src/scholarly-identity-repository.js";
import { PostgresSynthesistExecutionRepository } from "../src/synthesist-execution-repository.js";
import { PostgresWorkUnitAuthorityRepository } from "../src/work-unit-authority-repository.js";
import {
  availableArtifactStore,
  createMemoryArtifactStore,
} from "./artifact-store-fixture.js";

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

const modelActor = (): PetraActor => ({
  ...readFixture<PetraActor>("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FF1",
  actor_kind: "model",
  display_name: "Petra evidence extractor",
  created_at: "2026-08-28T18:00:02.000Z",
});

const makePackets = (
  selectedRecords?: readonly [PetraClaim, PetraAssertion, PetraSourceSpan],
): {
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
  const records: readonly [PetraClaim, PetraAssertion, PetraSourceSpan] =
    selectedRecords ?? [
      applied.event.payload.claim,
      applied.event.payload.assertion,
      readFixture<PetraSourceSpan>("source-span"),
    ];
  const objectRefs = [
    {
      object_kind: "claim" as const,
      object_id: records[0].claim_id,
      object_revision: records[0].revision,
      object_hash: canonicalHash(records[0]),
    },
    {
      object_kind: "assertion" as const,
      object_id: records[1].assertion_id,
      object_revision: records[1].revision,
      object_hash: canonicalHash(records[1]),
    },
    {
      object_kind: "source_span" as const,
      object_id: records[2].source_span_id,
      object_revision: records[2].revision,
      object_hash: canonicalHash(records[2]),
    },
  ];
  context.content.objective.target_refs = [structuredClone(objectRefs[0]!)];
  for (const [index, inclusion] of context.content.included_objects.entries()) {
    inclusion.object_ref = structuredClone(objectRefs[index]!);
  }
  context.content_hash = canonicalHash(context.content);
  evidence.content.context_packet_ref.content_hash = context.content_hash;
  for (const [
    index,
    selection,
  ] of evidence.content.selected_evidence.entries()) {
    selection.object_ref = structuredClone(objectRefs[index]!);
  }
  evidence.content_hash = canonicalHash(evidence.content);
  context.compiled_by = serviceRef();
  evidence.compiled_by = serviceRef();
  registry.registerContextPacket(context, records);
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

const execution = (
  evidence: PetraEvidencePacket,
): {
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
  const contextRef = evidence.content.context_packet_ref;
  request.content.context_packet_ref = {
    context_packet_id: contextRef.context_packet_id,
    content_hash: contextRef.content_hash,
  };
  request.content.evidence_packet_ref = {
    evidence_packet_id: evidence.evidence_packet_id,
    content_hash: evidence.content_hash,
  };
  const outboundRefs = evidence.content.selected_evidence.map((selection) =>
    structuredClone(selection.object_ref),
  );
  request.content.outbound_context.context_object_refs = [
    outboundRefs[0]!,
    ...outboundRefs.slice(1),
  ];
  call.content.input.context_packet_ref = structuredClone(
    request.content.context_packet_ref,
  );
  call.content.input.evidence_packet_ref = structuredClone(
    request.content.evidence_packet_ref,
  );
  for (const [
    index,
    selection,
  ] of call.content.input.context_selections.entries()) {
    selection.object_ref = structuredClone(
      evidence.content.selected_evidence[index]!.object_ref,
    );
  }
  const selectedById = new Map(
    evidence.content.selected_evidence.map((selection) => [
      selection.object_ref.object_id,
      selection.object_ref,
    ]),
  );
  const modelOutput = call.content.output;
  for (const statement of modelOutput.statements) {
    for (const reference of statement.evidence_refs) {
      const selected = selectedById.get(reference.object_id);
      if (selected === undefined) continue;
      reference.object_revision = selected.object_revision;
      reference.object_hash = selected.object_hash;
    }
  }
  call.content.raw_output = structuredClone(modelOutput);
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
  generatedFrom?: string,
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
  if (generatedFrom === undefined) {
    manifest.origin.response_metadata.content_type = mediaType;
    manifest.origin.response_metadata.content_length = byteSize;
  } else {
    manifest.origin = {
      origin_kind: "generated",
      generator_name: "petra-test-parser",
      generator_version: "1.0.0",
      generated_at: "2026-09-03T18:31:05.500Z",
      input_artifact_ids: [generatedFrom],
    };
    rightsDecision.observed_license = {
      statement: "Generated test output retained under its source terms.",
      source: "artifact",
    };
    rightsDecision.access_basis = "permission";
    rightsDecision.authorization_reference = "petra-test/1.0.0";
  }
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
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidenceAuthority = new PostgresEvidenceAuthorityRepository(pool);
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
    await scopes.registerActor(modelActor());
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

  const deterministicFactory = (): DomainRecordFactory => {
    let eventIndex = 0;
    let outboxIndex = 0;
    return {
      nextId: (kind) => {
        if (kind === "event") {
          eventIndex += 1;
          return `event_01ARZ3NDEKTSV4RRFFQ69G5F${String(eventIndex).padStart(2, "0")}`;
        }
        outboxIndex += 1;
        return `outbox_01ARZ3NDEKTSV4RRFFQ69G5F${String(outboxIndex + 20).padStart(2, "0")}`;
      },
      now: () => "2026-09-04T02:04:00.000Z",
    };
  };

  const registerReviewedPromotion = async (): Promise<{
    authority: PostgresChangeControlAuthorityRepository;
    changeSetId: string;
    claim: PetraClaim;
    assertion: PetraAssertion;
    span: PetraSourceSpan;
  }> => {
    await artifacts.registerVerifiedAcquisition(
      verifiedArtifact(
        "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB8",
        "01ARZ3NDEKTSV4RRFFQ69G5FB8",
        "sha256:abababababababababababababababababababababababababababababababab",
        256,
        "application/json",
        "structured_text",
        "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB1",
      ),
    );
    const document = readFixture<PetraParsedDocument>("parsed-document");
    const block = readFixture<PetraStructuralBlock>("structural-block");
    const span = readFixture<PetraSourceSpan>("source-span");
    document.created_by = serviceRef();
    span.created_by = serviceRef();
    const bundle: PersistDocumentBundleInput = {
      sourceArtifactManifestId: "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB2",
      document,
      blocks: [block],
      spans: [span],
    };
    await documents.registerDocumentBundle(bundle);

    const claim = readFixture<PetraClaim>("claim");
    const assertion = readFixture<PetraAssertion>("assertion");
    claim.created_by = {
      actor_id: modelActor().actor_id,
      actor_kind: "model",
    };
    if (claim.basis.basis_kind !== "source") {
      throw new Error("Expected a source-derived Claim fixture.");
    }
    claim.basis.proposed_by = structuredClone(claim.created_by);
    assertion.created_by = structuredClone(claim.created_by);
    await evidenceAuthority.proposeClaim(claim);
    await evidenceAuthority.proposeAssertion(assertion);

    const submit = readFixture<PetraCommandEnvelope>(
      "command-submit-change-set",
    );
    const approve = readFixture<PetraCommandEnvelope>(
      "command-record-approval",
    );
    const apply = readFixture<PetraCommandEnvelope>("command-apply-change-set");
    if (
      submit.command.command_name !== "SubmitChangeSet" ||
      approve.command.command_name !== "RecordApproval" ||
      apply.command.command_name !== "ApplyChangeSet"
    ) {
      throw new Error("Expected the accepted promotion command sequence.");
    }
    submit.actor = structuredClone(claim.created_by);
    submit.command.change_set.content.proposed_by = structuredClone(
      claim.created_by,
    );
    submit.command.change_set.content_hash = canonicalHash(
      submit.command.change_set.content,
    );
    approve.command.approval.subject.change_set_content_hash =
      submit.command.change_set.content_hash;
    apply.command.change_set_content_hash =
      submit.command.change_set.content_hash;

    const authority = new PostgresChangeControlAuthorityRepository(
      pool,
      { authorize: () => true },
      deterministicFactory(),
    );
    await authority.executeCommand(submit);
    await authority.executeCommand(approve);
    const applied = await authority.executeCommand(apply);
    if (applied.outcome !== "applied") {
      throw new Error("Expected the reviewed evidence pair to be promoted.");
    }
    const trustedClaim = await evidenceAuthority.getClaim(claim.claim_id);
    const trustedAssertion = await evidenceAuthority.getAssertion(
      assertion.assertion_id,
    );
    if (trustedClaim === undefined || trustedAssertion === undefined) {
      throw new Error("Expected promoted scientific authority records.");
    }
    return {
      authority,
      changeSetId: applied.change_set_id,
      claim: structuredClone(trustedClaim),
      assertion: structuredClone(trustedAssertion),
      span,
    };
  };

  const persistTerminal = async (
    selectedRecords?: readonly [PetraClaim, PetraAssertion, PetraSourceSpan],
  ): Promise<{
    packets: InMemoryContextPacketRegistry;
    input: RegisterGroundedResponseInput;
  }> => {
    const { registry: packets, evidence } = makePackets(selectedRecords);
    const { request, call } = execution(evidence);
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
    response.content.context_packet_ref = {
      context_packet_id: evidence.content.context_packet_ref.context_packet_id,
      revision: 1,
      content_hash: evidence.content.context_packet_ref.content_hash,
    };
    response.content.evidence_packet_ref = {
      evidence_packet_id: evidence.evidence_packet_id,
      revision: evidence.revision,
      content_hash: evidence.content_hash,
    };
    response.content.snapshot_ref = structuredClone(evidence.snapshot_ref);
    const responseDependencies = evidence.content.selected_evidence.map(
      (selection) => ({
        dependency_role: "selected_evidence" as const,
        object_ref: structuredClone(selection.object_ref),
      }),
    );
    response.content.dependencies = [
      responseDependencies[0]!,
      ...responseDependencies.slice(1),
    ];
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

  it("records the complete grounded terminal and converges on exact replay", async () => {
    const { registry: packets, evidence } = makePackets();
    const { request, call } = execution(evidence);
    if (call.content.output === undefined) {
      throw new Error("Expected a successful synthesist output fixture.");
    }
    const store = createMemoryArtifactStore();
    const artifactAuthority = new PostgresArtifactAuthorityRepository(
      pool,
      store,
    );
    const feature = readFixture<PetraInteractionFeatureManifest>(
      "interaction-feature-manifest",
    );
    feature.compiled_by = serviceRef();
    const role = certification();
    const recorder = new GroundedSynthesisTerminalRecorder({
      actors: [readFixture<PetraActor>("actor"), serviceActor()],
      serviceActor: serviceActor(),
      project: readFixture<PetraProject>("project"),
      featureManifest: feature,
      roleCertification: role,
      packets,
      scopes,
      artifactStore: store,
      artifacts: artifactAuthority,
      executions: synthesist,
      workUnits,
      interactions,
      groundedResponses: new PostgresGroundedResponseAuthorityRepository(
        pool,
        packets,
      ),
      runtimeVersion: "24.20.0",
    });
    const selected = request.content.routing.selected;
    if (
      selected === undefined ||
      request.content.terminal.state !== "completed"
    ) {
      throw new Error("Expected one completed selected synthesist route.");
    }
    const terminalRequest: GroundedSynthesisTerminalRequest = {
      interaction: {
        protocol_thread_id: "thread_grounded_terminal",
        protocol_run_id: "run_grounded_terminal",
        request_id: "request_grounded_terminal",
        trace_id: "trace_grounded_terminal",
        work_unit_id: readFixture<PetraWorkUnit>("work-unit-requested")
          .work_unit_id,
        started_at: "2026-09-04T02:29:59.000Z",
      },
      prompt: "What does the selected study report?",
      presentation_events: [],
      result: {
        hypothesis: {
          reference: "H01",
          descriptor: "The selected study reports a measurable improvement",
        },
        rendered_text: RESPONSE_TEXT,
        output: structuredClone(call.content.output),
        context_packet_ref: structuredClone(request.content.context_packet_ref),
        evidence_packet_ref: structuredClone(
          request.content.evidence_packet_ref,
        ),
        snapshot_id: evidence.snapshot_ref.snapshot_id,
        model_request_id: request.model_request_id,
        model_call_id: call.model_call_id,
        model_deployment_id: selected.model_deployment_id,
        role_certification_id: selected.role_certification_id,
        output_hash: request.content.terminal.output_hash,
        execution_source: "provider",
        trace: {
          retrieval_ms: 0,
          lexical_ms: 0,
          graph_ms: 0,
          context_compilation_ms: 0,
          evidence_compilation_ms: 0,
          packet_compilation_ms: 0,
          model_ms: call.content.timing.total_ms,
          validation_ms: call.content.timing.validation_ms,
          projection_ms: 0,
          total_ms: call.content.timing.total_ms,
        },
        cost: structuredClone(call.content.cost),
        model_request: structuredClone(request),
        model_call: structuredClone(call),
      },
    };

    const first = await recorder.persist(terminalRequest);
    expect(await recorder.persist(structuredClone(terminalRequest))).toEqual(
      first,
    );
    const cacheRunId = "run_grounded_terminal_cache";
    const cacheRequest: GroundedSynthesisTerminalRequest = {
      ...structuredClone(terminalRequest),
      interaction: {
        ...structuredClone(terminalRequest.interaction),
        protocol_run_id: cacheRunId,
        request_id: "request_grounded_terminal_cache",
        trace_id: "trace_grounded_terminal_cache",
        work_unit_id: derivePetraId("work_unit", cacheRunId),
      },
    };
    const cacheHit = await recorder.persist(cacheRequest);
    expect(cacheHit).toEqual(
      expect.objectContaining({
        grounded_response_id: first.grounded_response_id,
        grounded_response_revision: first.grounded_response_revision,
        grounded_response_hash: first.grounded_response_hash,
        response_artifact_id: first.response_artifact_id,
        response_artifact_hash: first.response_artifact_hash,
      }),
    );
    expect(cacheHit.work_unit_id).not.toBe(first.work_unit_id);
    expect(cacheHit.interaction_run_id).not.toBe(first.interaction_run_id);
    const restarted = new PostgresGroundedResponseAuthorityRepository(
      pool,
      new InMemoryContextPacketRegistry(),
    );
    const response = await restarted.get(first.grounded_response_id);
    expect(response).toEqual(
      expect.objectContaining({
        grounded_response_id: first.grounded_response_id,
        revision: first.grounded_response_revision,
        content_hash: first.grounded_response_hash,
      }),
    );
    expect(response?.content.response_artifact_ref).toEqual({
      artifact_id: first.response_artifact_id,
      content_hash: first.response_artifact_hash,
      byte_size: new TextEncoder().encode(RESPONSE_TEXT).byteLength,
      media_type: "text/markdown; charset=utf-8",
    });
    const persistedWorkUnit = await workUnits.getWorkUnit(first.work_unit_id);
    expect(persistedWorkUnit?.revision).toBe(first.work_unit_revision);
    expect(persistedWorkUnit?.spec_hash).toBe(first.work_unit_spec_hash);
    expect(persistedWorkUnit?.status.state).toBe("completed");
    expect(
      persistedWorkUnit?.status.state === "completed"
        ? persistedWorkUnit.status.terminal_outcome
        : undefined,
    ).toBe("succeeded");
    const persistedInteraction = await interactions.getRun(
      first.interaction_run_id,
    );
    expect(persistedInteraction?.revision).toBe(first.interaction_run_revision);
    expect(persistedInteraction?.content_hash).toBe(first.interaction_run_hash);
    expect(persistedInteraction?.content.lifecycle.state).toBe("completed");
    const counts = await pool.query<{
      responses: string;
      artifacts: string;
      work_units: string;
      interaction_runs: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.grounded_responses) AS responses,
         (SELECT count(*)::text FROM petra.artifacts) AS artifacts,
         (SELECT count(*)::text FROM petra.work_units) AS work_units,
         (SELECT count(*)::text FROM petra.interaction_runs) AS interaction_runs`,
    );
    expect(counts.rows[0]).toEqual({
      responses: "1",
      artifacts: "2",
      work_units: "2",
      interaction_runs: "2",
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

  it("appends invalidation after a durable compensating reversal without rewriting evidence", async () => {
    const promotion = await registerReviewedPromotion();
    const terminal = await persistTerminal([
      promotion.claim,
      promotion.assertion,
      promotion.span,
    ]);
    const repository = new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    );
    const original = await repository.register(terminal.input);
    const artifactBefore = await pool.query<{ record_hash: string }>(
      "SELECT record_hash FROM petra.artifacts WHERE artifact_id = $1",
      [original.content.response_artifact_ref.artifact_id],
    );

    const researcher = readFixture<PetraActor>("actor");
    const reviewer = {
      actor_id: researcher.actor_id,
      actor_kind: "human" as const,
    };
    const reversalPlan = buildCompensatingReversalCommandPlan({
      project_id: original.project_id,
      claim: promotion.claim,
      assertion: promotion.assertion,
      compensates_change_set_id: promotion.changeSetId,
      proposed_by: reviewer,
      reviewer,
      capability_grant_id: "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FBJ",
      reason: "The direct evidence review was corrected by the researcher.",
      rationale: "Invalidate derivatives without erasing scientific history.",
      impact_summary:
        "The Claim and its ASSERTS edge leave active scientific authority.",
      timing: {
        proposed_at: "2026-09-04T02:01:00.000Z",
        decided_at: "2026-09-04T02:02:00.000Z",
        applied_at: "2026-09-04T02:03:00.000Z",
      },
    });
    await executeCompensatingReversalPlan(promotion.authority, reversalPlan);
    const events = await promotion.authority.getDomainEvents({
      projectId: original.project_id,
    });
    const reversal = events.at(-1);
    if (reversal?.event.event_type !== "change_set.reverted") {
      throw new Error("Expected a persisted compensating-reversal event.");
    }

    const [invalidated] = await repository.invalidateByAuthorityEvent(reversal);
    expect(invalidated).toEqual(
      expect.objectContaining({
        grounded_response_id: original.grounded_response_id,
        revision: 2,
        lineage: {
          lineage_kind: "revision",
          parent_revision: 1,
          parent_hash: original.content_hash,
        },
      }),
    );
    expect(invalidated?.content.cache.state).toBe("invalidated");
    expect(invalidated?.content.response_artifact_ref).toEqual(
      original.content.response_artifact_ref,
    );

    const restarted = new PostgresGroundedResponseAuthorityRepository(
      pool,
      new InMemoryContextPacketRegistry(),
    );
    expect(await restarted.invalidateByAuthorityEvent(reversal)).toEqual([
      invalidated,
    ]);
    expect(await restarted.get(original.grounded_response_id)).toEqual(
      invalidated,
    );
    expect(
      await restarted.getRevision(original.grounded_response_id, 1),
    ).toEqual(original);
    expect(
      await restarted.getReusableByCacheKey(original.content.cache.cache_key),
    ).toBeUndefined();
    expect(
      await pool.query<{ record_hash: string }>(
        "SELECT record_hash FROM petra.artifacts WHERE artifact_id = $1",
        [original.content.response_artifact_ref.artifact_id],
      ),
    ).toEqual(artifactBefore);

    const typed = await pool.query<{
      current_revision: string;
      event_id: string;
      event_type: string;
      change_set_id: string;
    }>(
      `SELECT response.current_revision::text, cause.event_id,
              cause.event_type, cause.change_set_id
         FROM petra.grounded_responses AS response
         JOIN petra.grounded_response_invalidation_causes AS cause
           ON cause.grounded_response_id = response.grounded_response_id
          AND cause.response_revision = response.current_revision
        WHERE response.grounded_response_id = $1`,
      [original.grounded_response_id],
    );
    expect(typed.rows).toEqual([
      {
        current_revision: "2",
        event_id: reversal.event_id,
        event_type: "change_set.reverted",
        change_set_id: reversal.event.payload.change_set_id,
      },
    ]);
  });
});
