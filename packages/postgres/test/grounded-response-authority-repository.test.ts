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
  PetraCompositionPlan,
  PetraCompositionRequest,
  PetraDomainEventRecord,
  PetraEvidencePacket,
  PetraGroundedResponse,
  PetraInteractionFeatureManifest,
  PetraInteractionRun,
  PetraProject,
  PetraProjectDefinition,
  PetraProjectInquiryLink,
  PetraProjectInquiryRole,
  PetraProjectObjective,
  PetraProjectThread,
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
  CompositionArtifactPublisher,
  type CompositionPublicationError,
  derivePetraId,
  DeterministicCompositionRenderer,
  DraftRevisionEngine,
  DurableInteractionHistory,
  executeCompensatingReversalPlan,
  FelicityRevisionEngine,
  GroundedCompositionCompiler,
  GroundedSynthesisTerminalRecorder,
  groundedResponseCacheKey,
  InMemoryContextPacketRegistry,
  type GroundedSynthesisTerminalRequest,
  type PetraInteractionEvent,
  type RegisterGroundedResponseInput,
  type RenderedArtifactAuthorityRepository,
} from "@petra/core";
import { canonicalize } from "json-canonicalize";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PostgresArtifactAuthorityRepository } from "../src/artifact-authority-repository.js";
import { PostgresChangeControlAuthorityRepository } from "../src/change-control-authority-repository.js";
import {
  type CompositionAggregatePersistenceError,
  type CompositionAggregatePersistenceErrorCode,
  PostgresCompositionAggregateRepository,
} from "../src/composition-aggregate-repository.js";
import {
  type CompositionPersistenceError,
  type CompositionPersistenceErrorCode,
  PostgresCompositionAuthorityRepository,
} from "../src/composition-authority-repository.js";
import { PostgresDocumentAuthorityRepository } from "../src/document-authority-repository.js";
import { PostgresEvidenceAuthorityRepository } from "../src/evidence-authority-repository.js";
import { PostgresGroundedResponseAuthorityRepository } from "../src/grounded-response-authority-repository.js";
import { PostgresInteractionAuthorityRepository } from "../src/interaction-authority-repository.js";
import { PostgresProjectDefinitionAuthorityRepository } from "../src/project-definition-authority-repository.js";
import {
  PostgresProjectInquiryAuthorityRepository,
  type PostgresProjectInquiryError,
  projectInquiryRoleRef,
} from "../src/project-inquiry-authority-repository.js";
import {
  PostgresProjectThreadAuthorityRepository,
  type PostgresProjectThreadError,
} from "../src/project-thread-authority-repository.js";
import { PostgresProjectThreadViewReader } from "../src/project-thread-view-reader.js";
import { PostgresProjectObjectLocationViewReader } from "../src/project-object-location-view-reader.js";
import { PostgresResearchScopeRepository } from "../src/research-scope-repository.js";
import {
  PostgresRenderedArtifactAuthorityRepository,
  type RenderedArtifactPersistenceError,
  type RenderedArtifactPersistenceErrorCode,
} from "../src/rendered-artifact-authority-repository.js";
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

const expectCompositionCode = async (
  operation: () => Promise<unknown>,
  code: CompositionPersistenceErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<CompositionPersistenceError>>({ code }),
  );
};

const expectCompositionAggregateCode = async (
  operation: () => Promise<unknown>,
  code: CompositionAggregatePersistenceErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<CompositionAggregatePersistenceError>>({
      code,
    }),
  );
};

const expectRenderedArtifactCode = async (
  operation: () => Promise<unknown>,
  code: RenderedArtifactPersistenceErrorCode,
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<RenderedArtifactPersistenceError>>({
      code,
    }),
  );
};

const expectProjectThreadCode = async (
  operation: () => Promise<unknown>,
  code: PostgresProjectThreadError["code"],
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresProjectThreadError>>({ code }),
  );
};

const expectProjectInquiryCode = async (
  operation: () => Promise<unknown>,
  code: PostgresProjectInquiryError["code"],
): Promise<void> => {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining<Partial<PostgresProjectInquiryError>>({ code }),
  );
};

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
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const objectLocations = new PostgresProjectObjectLocationViewReader(pool);

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
    await definitions.registerDefinitionRevision(
      readFixture<PetraProjectDefinition>("project-definition-scientific"),
    );
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

  const projectThread = (
    terminal: Awaited<ReturnType<typeof persistTerminal>>,
    response: PetraGroundedResponse,
  ): PetraProjectThread => {
    const definition = readFixture<PetraProjectDefinition>(
      "project-definition-scientific",
    );
    const context = terminal.packets.getContextPacket(
      response.content.context_packet_ref.context_packet_id,
    );
    if (context === undefined) {
      throw new Error("Expected the exact ContextPacket for the Project turn.");
    }
    const run = terminal.input.interactionRun;
    const content: PetraProjectThread["content"] = {
      title: "Selected study result",
      task: "Explain what the selected study reports and bound the answer to recorded evidence.",
      lifecycle: "open",
      origin: { origin_kind: "root" },
      turns: [
        {
          project_turn_id: "project_turn_01K4C000000000000000000102",
          sequence: 1,
          project_definition_ref: {
            project_definition_id: definition.project_definition_id,
            revision: definition.revision,
            content_hash: definition.content_hash,
            definition_family: definition.definition_family,
          },
          input: {
            retention_state: "hash_only",
            input_hash: run.content.input.input_hash,
            source_message_id: run.content.input.source_message_id,
            limitation:
              "The originating run predates retained prompt artifacts; exact input bytes are unavailable.",
          },
          context: {
            context_record_ref: {
              schema_name: "petra.context-packet",
              schema_version: "1.0.0",
              record_id: context.context_packet_id,
              revision: context.revision,
              content_hash: context.content_hash,
            },
            snapshot_ref: structuredClone(context.snapshot_ref),
            included_object_count: context.content.included_objects.length,
            omission_count: context.content.omissions.length,
            coverage_state: context.content.coverage.state,
            coverage_statement: context.content.coverage.statement,
          },
          execution: structuredClone(response.content.interaction_ref),
          authority_context: {
            actor: structuredClone(run.content.authority_context.actor),
            capability_grant_id:
              run.content.authority_context.capability_grant_id,
            privacy_profile_ref: structuredClone(
              run.content.authority_context.privacy_profile_ref,
            ),
            budget_profile_ref: structuredClone(
              run.content.authority_context.budget_profile_ref,
            ),
            review_policy: {
              state: "unavailable",
              reason:
                "The originating InteractionRun predates exact review-policy capture.",
            },
          },
          response: {
            state: "completed",
            result_record_ref: {
              schema_name: "petra.grounded-response",
              schema_version: "1.0.0",
              record_id: response.grounded_response_id,
              revision: response.revision,
              content_hash: response.content_hash,
            },
            response_artifact_ref: structuredClone(
              response.content.response_artifact_ref,
            ),
            force: "explanation_only",
            authority_effect: "none",
          },
          compaction: { state: "unmodified" },
          proposal_decision_linkage: {
            state: "unavailable",
            reason:
              "No proposal or decision was produced by this explanatory turn.",
          },
          presentation_context: {
            state: "unavailable",
            reason:
              "Presentation-state capture is outside this foundation contract.",
          },
          recorded_at: "2026-09-03T18:31:08.000Z",
        },
      ],
      retention: {
        state: "retained",
        limitation:
          "Material turn bindings are durable; the prompt is represented by its exact hash because no prompt artifact was retained.",
      },
    };
    return {
      schema_name: "petra.project-thread",
      schema_version: "1.0.0",
      project_thread_id: "project_thread_01K4C000000000000000000101",
      revision: 1,
      project_id: response.project_id,
      project_definition_ref: {
        project_definition_id: definition.project_definition_id,
        revision: definition.revision,
        content_hash: definition.content_hash,
        definition_family: definition.definition_family,
      },
      lineage: { lineage_kind: "root" },
      content,
      content_hash: canonicalHash(content),
      created_by: {
        actor_id: readFixture<PetraActor>("actor").actor_id,
        actor_kind: "human",
      },
      created_at: "2026-09-03T18:31:08.000Z",
      updated_at: "2026-09-03T18:31:08.000Z",
    };
  };

  const compileDurableComposition = async () => {
    const terminal = await persistTerminal();
    const groundedResponse =
      await new PostgresGroundedResponseAuthorityRepository(
        pool,
        terminal.packets,
      ).register(terminal.input);
    const request = readFixture<PetraCompositionRequest>("composition-request");
    const plan = readFixture<PetraCompositionPlan>("composition-plan");
    plan.compiled_by = serviceRef();
    const controls = new PostgresCompositionAuthorityRepository(
      pool,
      terminal.packets,
    );
    await controls.registerRequest(request);
    await controls.registerPlan(plan);
    const scholarlyRecords = {
      works: [readFixture<PetraWork>("work")],
      workVersions: [readFixture<PetraWorkVersion>("work-version")],
      authors: [readFixture<PetraAuthor>("author")],
      externalIdentifiers: [],
    };
    const evidence = terminal.packets.getEvidencePacket(
      plan.evidence_packet_ref.evidence_packet_id,
    );
    if (evidence === undefined) {
      throw new Error("Expected the composition EvidencePacket fixture.");
    }
    const compiled = new GroundedCompositionCompiler(terminal.packets).compile({
      request,
      plan,
      evidence: structuredClone(evidence) as PetraEvidencePacket,
      groundedResponse,
      modelActor: {
        actor_id: modelActor().actor_id,
        actor_kind: "model",
      },
      serviceActor: serviceRef(),
      promptProfile: {
        name: "petra.grounded-composition",
        version: "1.0.0",
      },
      promptHash: canonicalHash({
        profile: "petra.grounded-composition",
        version: "1.0.0",
      }),
      scholarlyRecords,
    });
    return { terminal, compiled };
  };

  const compileDurableEdit = async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const repository = new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    );
    await repository.register(compiled);
    const firstSpan = compiled.spans[0];
    if (firstSpan === undefined) {
      throw new Error("Expected a compiled DraftSpan for the edit fixture.");
    }
    const researcher = readFixture<PetraActor>("actor");
    const engine = new DraftRevisionEngine();
    const edited = engine.edit({
      previous: compiled,
      commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FCY",
      researcher: {
        actor_id: researcher.actor_id,
        actor_kind: "human",
      },
      serviceActor: serviceRef(),
      replacements: [
        {
          draftSpanId: firstSpan.draft_span_id,
          expectedExactTextHash: firstSpan.content.exact_text_hash,
          replacementText:
            "The selected study reports a modest measurable improvement.",
        },
      ],
      editedAt: "2026-09-04T05:00:00.000Z",
    });
    return { terminal, compiled, repository, engine, researcher, edited };
  };

  const compileDurableFelicityRevision = async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const repository = new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    );
    await repository.register(compiled);
    const engine = new FelicityRevisionEngine();
    const revised = engine.revise({
      previous: compiled,
      commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FD3",
      serviceActor: serviceRef(),
      revisedAt: "2026-09-04T06:00:00.000Z",
    });
    return { terminal, compiled, repository, engine, revised };
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

  it("maps an existing Objective as inquiry and preserves zero, many, and shared Work links", async () => {
    const terminal = await persistTerminal();
    const response = await new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    ).register(terminal.input);
    const objective = readFixture<PetraProjectObjective>("project-objective");
    await definitions.registerObjectiveRevision(objective);

    const inquiries = new PostgresProjectInquiryAuthorityRepository(pool);
    const role = readFixture<PetraProjectInquiryRole>("project-inquiry-role");
    expect(await inquiries.registerProjectInquiryRoleRevision(role)).toEqual(
      role,
    );
    expect(
      await inquiries.registerProjectInquiryRoleRevision(structuredClone(role)),
    ).toEqual(role);
    expect(
      await inquiries.getProjectInquiryRole(
        role.project_id,
        role.project_inquiry_role_id,
      ),
    ).toEqual(role);
    expect(await inquiries.listProjectInquiryRoles(role.project_id)).toEqual([
      role,
    ]);

    const inquiryAnchor = (value: PetraProjectObjective) => ({
      anchor_kind: "project_objective" as const,
      semantic_key: value.content.objective_kind,
      objective_ref: {
        objective_id: value.objective_id,
        revision: value.revision,
        content_hash: value.content_hash,
        record_hash: canonicalHash(value),
      },
    });
    const workLink = readFixture<PetraProjectInquiryLink>(
      "project-inquiry-work-link",
    );
    workLink.content.inquiry_role_ref = projectInquiryRoleRef(role);
    workLink.content.inquiry_anchor = inquiryAnchor(objective);
    if (workLink.content.target.target_kind !== "work") {
      throw new Error("Expected a Work inquiry-link fixture.");
    }
    workLink.content.target.work_unit_ref = {
      work_unit_id: terminal.input.workUnit.work_unit_id,
      revision: terminal.input.workUnit.revision,
      spec_hash: terminal.input.workUnit.spec_hash,
      record_hash: canonicalHash(terminal.input.workUnit),
    };
    workLink.content_hash = canonicalHash(workLink.content);
    expect(await inquiries.registerProjectInquiryLink(workLink)).toEqual(
      workLink,
    );

    const evidence = terminal.packets.getEvidencePacket(
      response.content.evidence_packet_ref.evidence_packet_id,
    );
    if (evidence === undefined) {
      throw new Error("Expected the exact EvidencePacket for follow-up Work.");
    }
    const followUp = makeWork(
      terminal.input.modelRequest,
      structuredClone(evidence) as PetraEvidencePacket,
    );
    followUp.workUnit.work_unit_id = "work_unit_01ARZ3NDEKTSV4RRFFQ69G5FD8";
    followUp.inputManifest.worker_input_manifest_id =
      "worker_input_manifest_01ARZ3NDEKTSV4RRFFQ69G5FD9";
    followUp.inputManifest.work_unit_id = followUp.workUnit.work_unit_id;
    followUp.workUnit.spec.input_manifest_ref = {
      worker_input_manifest_id: followUp.inputManifest.worker_input_manifest_id,
      content_hash: followUp.inputManifest.content_hash,
    };
    followUp.workUnit.spec.idempotency_key =
      "work:project-inquiry-follow-up:01ARZ3NDEKTSV4RRFFQ69G5FD8";
    followUp.workUnit.spec_hash = canonicalHash(followUp.workUnit.spec);
    const followUpWork = await workUnits.register({
      workUnit: followUp.workUnit,
      inputManifest: followUp.inputManifest,
    });
    const secondWorkLink = structuredClone(workLink);
    secondWorkLink.project_inquiry_link_id =
      "project_inquiry_link_01K4F000000000000000000004";
    secondWorkLink.created_at = "2026-09-08T18:34:00.000Z";
    if (secondWorkLink.content.target.target_kind !== "work") {
      throw new Error("Expected a Work inquiry link.");
    }
    secondWorkLink.content.target.work_unit_ref = {
      work_unit_id: followUpWork.work_unit_id,
      revision: followUpWork.revision,
      spec_hash: followUpWork.spec_hash,
      record_hash: canonicalHash(followUpWork),
    };
    secondWorkLink.content_hash = canonicalHash(secondWorkLink.content);
    expect(await inquiries.registerProjectInquiryLink(secondWorkLink)).toEqual(
      secondWorkLink,
    );

    const resultLink = readFixture<PetraProjectInquiryLink>(
      "project-inquiry-result-link",
    );
    resultLink.content.inquiry_role_ref = projectInquiryRoleRef(role);
    resultLink.content.inquiry_anchor = inquiryAnchor(objective);
    if (resultLink.content.target.target_kind !== "result") {
      throw new Error("Expected a result inquiry-link fixture.");
    }
    resultLink.content.target.result_ref = {
      schema_name: response.schema_name,
      schema_version: response.schema_version,
      record_id: response.grounded_response_id,
      revision: response.revision,
      content_hash: response.content_hash,
      record_hash: canonicalHash(response),
    };
    resultLink.content.target.produced_by_work_ref = {
      work_unit_id: terminal.input.workUnit.work_unit_id,
      revision: terminal.input.workUnit.revision,
      spec_hash: terminal.input.workUnit.spec_hash,
      record_hash: canonicalHash(terminal.input.workUnit),
    };
    resultLink.content_hash = canonicalHash(resultLink.content);
    expect(await inquiries.registerProjectInquiryLink(resultLink)).toEqual(
      resultLink,
    );

    const sharedObjective = structuredClone(objective);
    sharedObjective.objective_id = "objective_01K4C000000000000000000006";
    sharedObjective.content.statement =
      "Determine which limitations remain after inspecting the selected source.";
    sharedObjective.content_hash = canonicalHash(sharedObjective.content);
    sharedObjective.created_at = "2026-09-08T18:35:00.000Z";
    sharedObjective.updated_at = sharedObjective.created_at;
    await definitions.registerObjectiveRevision(sharedObjective);
    const sharedLink = structuredClone(workLink);
    sharedLink.project_inquiry_link_id =
      "project_inquiry_link_01K4F000000000000000000005";
    sharedLink.content.inquiry_anchor = inquiryAnchor(sharedObjective);
    sharedLink.content_hash = canonicalHash(sharedLink.content);
    sharedLink.created_at = "2026-09-08T18:36:00.000Z";
    expect(await inquiries.registerProjectInquiryLink(sharedLink)).toEqual(
      sharedLink,
    );

    const zeroWorkObjective = structuredClone(objective);
    zeroWorkObjective.objective_id = "objective_01K4C000000000000000000007";
    zeroWorkObjective.content.statement =
      "Clarify whether another source is needed before scheduling Work.";
    zeroWorkObjective.content_hash = canonicalHash(zeroWorkObjective.content);
    zeroWorkObjective.created_at = "2026-09-08T18:37:00.000Z";
    zeroWorkObjective.updated_at = zeroWorkObjective.created_at;
    await definitions.registerObjectiveRevision(zeroWorkObjective);

    expect(
      await inquiries.listProjectInquiryLinks(
        objective.project_id,
        objective.objective_id,
      ),
    ).toEqual([workLink, resultLink, secondWorkLink]);
    expect(
      await inquiries.listProjectInquiryLinks(
        zeroWorkObjective.project_id,
        zeroWorkObjective.objective_id,
      ),
    ).toEqual([]);
    expect(
      await inquiries.listProjectInquiryLinksForWork(
        objective.project_id,
        terminal.input.workUnit.work_unit_id,
      ),
    ).toEqual([workLink, resultLink, sharedLink]);
    expect(
      await inquiries.getProjectInquiryLink(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        workLink.project_inquiry_link_id,
      ),
    ).toBeUndefined();
    expect(
      (await definitions.getObjective(objective.objective_id))?.content.status,
    ).toBe("active");

    const overclaim = structuredClone(resultLink);
    overclaim.project_inquiry_link_id =
      "project_inquiry_link_01K4F000000000000000000006";
    if (overclaim.content.target.target_kind !== "result") {
      throw new Error("Expected a result inquiry link.");
    }
    overclaim.content.target.bearing = "accepted_finding";
    overclaim.content_hash = canonicalHash(overclaim.content);
    await expectProjectInquiryCode(
      () => inquiries.registerProjectInquiryLink(overclaim),
      "PROJECT_INQUIRY_TARGET_UNSUPPORTED",
    );

    await expect(
      pool.query(
        `DELETE FROM petra.project_inquiry_links
          WHERE project_inquiry_link_id = $1`,
        [workLink.project_inquiry_link_id],
      ),
    ).rejects.toBeTruthy();
  });

  it("persists immutable Project threads, revisions, and exact branch origins", async () => {
    const terminal = await persistTerminal();
    const response = await new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    ).register(terminal.input);
    const repository = new PostgresProjectThreadAuthorityRepository(pool);
    const root = projectThread(terminal, response);

    expect(await repository.registerProjectThreadRevision(root)).toEqual(root);
    expect(
      await repository.registerProjectThreadRevision(structuredClone(root)),
    ).toEqual(root);
    expect(
      await repository.getProjectThread(
        root.project_id,
        root.project_thread_id,
      ),
    ).toEqual(root);
    expect(await repository.listProjectThreads(root.project_id)).toEqual([
      root,
    ]);
    expect(
      await repository.getProjectThread(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        root.project_thread_id,
      ),
    ).toBeUndefined();

    const archived = structuredClone(root);
    archived.revision = 2;
    archived.lineage = {
      lineage_kind: "revision",
      parent_revision: root.revision,
      parent_hash: root.content_hash,
    };
    archived.content.lifecycle = "archived";
    archived.content_hash = canonicalHash(archived.content);
    archived.updated_at = "2026-09-03T18:32:00.000Z";
    expect(await repository.registerProjectThreadRevision(archived)).toEqual(
      archived,
    );

    const branch = structuredClone(root);
    branch.project_thread_id = "project_thread_01K4C000000000000000000103";
    branch.content.origin = {
      origin_kind: "branch",
      parent_thread_ref: {
        project_thread_id: archived.project_thread_id,
        revision: archived.revision,
        content_hash: archived.content_hash,
      },
      parent_turn_id: root.content.turns[0]!.project_turn_id,
      continuation_mode: "compare_then_continue",
    };
    branch.content.title = "Alternative continuation";
    branch.content.turns = [];
    branch.content_hash = canonicalHash(branch.content);
    branch.created_at = "2026-09-03T18:33:00.000Z";
    branch.updated_at = branch.created_at;
    expect(await repository.registerProjectThreadRevision(branch)).toEqual(
      branch,
    );
    expect(await repository.listProjectThreads(root.project_id)).toEqual([
      branch,
      archived,
    ]);

    const views = new PostgresProjectThreadViewReader(pool);
    const collection = await views.listProjectThreadView(root.project_id, {
      limit: 1,
      lifecycle: "open",
    });
    expect(collection?.content.view_kind).toBe("collection");
    if (collection?.content.view_kind !== "collection") {
      throw new Error("Expected a Project thread collection view.");
    }
    expect(collection.content.threads).toHaveLength(1);
    expect(collection.content.threads[0]?.title).toBe(branch.content.title);
    expect(collection.content.threads[0]?.turn_count).toBe(0);
    expect(collection.content.threads[0]?.latest_turn.state).toBe(
      "unavailable",
    );
    const detail = await views.getProjectThreadView(
      root.project_id,
      archived.project_thread_id,
    );
    expect(detail?.content.view_kind).toBe("detail");
    if (detail?.content.view_kind !== "detail") {
      throw new Error("Expected a Project thread detail view.");
    }
    expect(detail.content.summary.lifecycle).toBe("archived");
    expect(detail.content.turns[0]?.input_representation.state).toBe(
      "hash_only",
    );
    expect(detail.content.turns[0]?.response_representation.state).toBe(
      "metadata_only",
    );
    expect(detail.content.turns[0]?.work_destination).toEqual({
      role: "work",
      work_unit_ref: root.content.turns[0]!.execution.work_unit_ref,
    });
    expect(
      await views.getProjectThreadView(
        "project_01ARZ3NDEKTSV4RRFFQ69G5FZZ",
        archived.project_thread_id,
      ),
    ).toBeUndefined();

    const changed = structuredClone(archived);
    changed.content.turns[0]!.input.input_hash =
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    changed.content_hash = canonicalHash(changed.content);
    await expectProjectThreadCode(
      () => repository.registerProjectThreadRevision(changed),
      "PROJECT_THREAD_REVISION_CONFLICT",
    );

    try {
      await pool.query(
        `DELETE FROM petra.project_thread_turn_bindings
          WHERE project_thread_id = $1`,
        [root.project_thread_id],
      );
      throw new Error("Expected immutable Project turns to reject deletion.");
    } catch (error: unknown) {
      expect(error).toEqual(expect.objectContaining({ code: "55000" }));
    }
  });

  it("persists immutable composition controls and rehydrates them after restart", async () => {
    const terminal = await persistTerminal();
    await new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    ).register(terminal.input);
    const request = readFixture<PetraCompositionRequest>("composition-request");
    const plan = readFixture<PetraCompositionPlan>("composition-plan");
    plan.compiled_by = serviceRef();
    const repository = new PostgresCompositionAuthorityRepository(
      pool,
      terminal.packets,
    );

    const storedRequest = await repository.registerRequest(request);
    const storedPlan = await repository.registerPlan(plan);
    expect(await repository.registerRequest(structuredClone(request))).toEqual(
      storedRequest,
    );
    expect(await repository.registerPlan(structuredClone(plan))).toEqual(
      storedPlan,
    );

    const restarted = new PostgresCompositionAuthorityRepository(
      pool,
      new InMemoryContextPacketRegistry(),
    );
    expect(await restarted.getRequest(request.composition_request_id)).toEqual(
      storedRequest,
    );
    expect(await restarted.getPlan(plan.composition_plan_id)).toEqual(
      storedPlan,
    );
    expect(await restarted.registerPlan(structuredClone(plan))).toEqual(
      storedPlan,
    );

    const counts = await pool.query<{
      evidence_refs: string;
      plans: string;
      requests: string;
      subjects: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.composition_requests) AS requests,
         (SELECT count(*)::text FROM petra.composition_request_subjects) AS subjects,
         (SELECT count(*)::text FROM petra.composition_plans) AS plans,
         (SELECT count(*)::text FROM petra.composition_plan_evidence_refs) AS evidence_refs`,
    );
    expect(counts.rows[0]).toEqual({
      requests: "1",
      subjects: "1",
      plans: "1",
      evidence_refs: "3",
    });
  });

  it("rejects conflicting control identities and missing durable evidence atomically", async () => {
    const terminal = await persistTerminal();
    await new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    ).register(terminal.input);
    const repository = new PostgresCompositionAuthorityRepository(
      pool,
      terminal.packets,
    );
    const request = readFixture<PetraCompositionRequest>("composition-request");
    await repository.registerRequest(request);

    const changedRequest = structuredClone(request);
    changedRequest.content.objective = "A different composition objective.";
    changedRequest.content_hash = canonicalHash(changedRequest.content);
    await expectCompositionCode(
      () => repository.registerRequest(changedRequest),
      "COMPOSITION_PERSISTENCE_REQUEST_ID_CONFLICT",
    );

    const missingEvidence =
      readFixture<PetraCompositionPlan>("composition-plan");
    missingEvidence.evidence_packet_ref.evidence_packet_id =
      "evidence_packet_01ARZ3NDEKTSV4RRFFQ69G5FD0";
    await expectCompositionCode(
      () => repository.registerPlan(missingEvidence),
      "COMPOSITION_PERSISTENCE_REFERENCE_MISSING",
    );
    const count = await pool.query<{ value: string }>(
      "SELECT count(*)::text AS value FROM petra.composition_plans",
    );
    expect(count.rows[0]?.value).toBe("0");
  });

  it("prevents SQL mutation of composition controls", async () => {
    const terminal = await persistTerminal();
    await new PostgresGroundedResponseAuthorityRepository(
      pool,
      terminal.packets,
    ).register(terminal.input);
    const repository = new PostgresCompositionAuthorityRepository(
      pool,
      terminal.packets,
    );
    const request = readFixture<PetraCompositionRequest>("composition-request");
    await repository.registerRequest(request);

    try {
      await pool.query(
        `UPDATE petra.composition_requests
            SET requested_at = requested_at + interval '1 second'
          WHERE composition_request_id = $1`,
        [request.composition_request_id],
      );
      throw new Error("Expected the immutable trigger to reject the update.");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toEqual(expect.objectContaining({ code: "55000" }));
      if (error instanceof Error) {
        expect(error.message).toContain(
          "Composition control records are immutable",
        );
      }
    }
    expect(await repository.getRequest(request.composition_request_id)).toEqual(
      request,
    );
  });

  it("persists the complete composition aggregate atomically and rehydrates it after restart", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const repository = new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    );
    const stored = await repository.register(compiled);
    expect(await repository.register(structuredClone(compiled))).toEqual(
      stored,
    );

    const restarted = new PostgresCompositionAggregateRepository(
      pool,
      new InMemoryContextPacketRegistry(),
    );
    expect(await restarted.get(compiled.draft.draft_artifact_id, 1)).toEqual(
      stored,
    );
    expect(
      await restarted.getCurrent(compiled.draft.draft_artifact_id),
    ).toEqual(stored);
    expect(await restarted.register(structuredClone(compiled))).toEqual(stored);
    const location = await objectLocations.locateProjectObject({
      project_id: compiled.draft.project_id,
      object_ref: {
        semantic_key: "petra.draft-artifact",
        object_id: compiled.draft.draft_artifact_id,
      },
      task_intent: "inspect",
    });
    expect(location?.content.resolution.state).toBe("current");
    expect(location?.content.primary_destination.role).toBe("composition");

    const counts = await pool.query<{
      authors: string;
      bases: string;
      bundles: string;
      citations: string;
      dependencies: string;
      drafts: string;
      linked_spans: string;
      maps: string;
      mappings: string;
      grounded_response_id: string;
      spans: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.draft_artifact_revisions) AS drafts,
         (SELECT count(*)::text FROM petra.draft_spans) AS spans,
         (SELECT count(*)::text FROM petra.provenance_maps) AS maps,
         (SELECT count(*)::text FROM petra.provenance_span_mappings) AS mappings,
         (SELECT count(*)::text FROM petra.provenance_bases) AS bases,
         (SELECT count(*)::text FROM petra.citation_bundles) AS bundles,
         (SELECT count(*)::text FROM petra.citation_entries) AS citations,
         (SELECT count(*)::text FROM petra.citation_author_refs) AS authors,
         (SELECT count(*)::text FROM petra.citation_linked_spans) AS linked_spans,
         (SELECT count(*)::text FROM petra.draft_authority_dependencies) AS dependencies,
         (SELECT grounded_response_id FROM petra.draft_artifact_revisions LIMIT 1) AS grounded_response_id`,
    );
    expect(counts.rows[0]).toEqual({
      drafts: "1",
      spans: "2",
      maps: "1",
      mappings: "2",
      bases: "3",
      bundles: "1",
      citations: "1",
      authors: "1",
      linked_spans: "2",
      dependencies: "6",
      grounded_response_id: terminal.input.response.grounded_response_id,
    });
  });

  it("rejects a model draft without its exact reusable GroundedResponse and rolls back", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    if (compiled.draft.production.origin_kind !== "model_generated") {
      throw new Error("Expected a model-generated draft fixture.");
    }
    compiled.draft.production.model_call_id =
      "model_call_01ARZ3NDEKTSV4RRFFQ69G5FD0";
    const repository = new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    );
    await expectCompositionAggregateCode(
      () => repository.register(compiled),
      "COMPOSITION_AGGREGATE_GROUNDED_RESPONSE_NOT_REUSABLE",
    );
    const count = await pool.query<{ value: string }>(
      "SELECT count(*)::text AS value FROM petra.draft_artifacts",
    );
    expect(count.rows[0]?.value).toBe("0");
  });

  it("rejects citation authority that is not present at its exact durable hash", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const work = compiled.scholarlyRecords.works[0];
    const citation = compiled.citationBundle.content.citations[0];
    if (work === undefined || citation === undefined) {
      throw new Error("Expected one canonical citation fixture.");
    }
    work.title = "A changed canonical account of competing explanations";
    citation.work_ref.content_hash = canonicalHash(work);
    citation.metadata.title = work.title;
    compiled.citationBundle.content_hash = canonicalHash(
      compiled.citationBundle.content,
    );
    const repository = new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    );
    await expectCompositionAggregateCode(
      () => repository.register(compiled),
      "COMPOSITION_AGGREGATE_REFERENCE_MISSING",
    );
    const count = await pool.query<{ value: string }>(
      "SELECT count(*)::text AS value FROM petra.draft_artifact_revisions",
    );
    expect(count.rows[0]?.value).toBe("0");
  });

  it("rejects conflicting aggregate replay and direct SQL mutation", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const repository = new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    );
    await repository.register(compiled);
    const changed = structuredClone(compiled);
    changed.draft.content.text += " Changed.";
    changed.draft.content_hash = canonicalHash(changed.draft.content);
    await expectCompositionAggregateCode(
      () => repository.register(changed),
      "COMPOSITION_AGGREGATE_ID_CONFLICT",
    );

    try {
      await pool.query(
        `UPDATE petra.draft_spans
            SET start_codepoint = start_codepoint + 1
          WHERE draft_span_id = $1`,
        [compiled.spans[0]?.draft_span_id],
      );
      throw new Error("Expected the immutable trigger to reject the update.");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toEqual(expect.objectContaining({ code: "55000" }));
      if (error instanceof Error) {
        expect(error.message).toContain(
          "Composition aggregate records are immutable",
        );
      }
    }
    const unchanged = await repository.get(compiled.draft.draft_artifact_id, 1);
    expect(unchanged?.draft.content.text).toBe(
      "The selected study reports a measurable improvement. The claim is limited to its study-defined evaluation task.",
    );
  });

  it("persists an additive draft edit and root support assessment atomically", async () => {
    const { compiled, repository, edited } = await compileDurableEdit();
    const stored = await repository.registerRevision(edited);
    expect(await repository.registerRevision(structuredClone(edited))).toEqual(
      stored,
    );
    expect(stored).toEqual({
      composition: {
        draft: edited.composition.draft,
        spans: edited.composition.spans,
        provenanceMap: edited.composition.provenanceMap,
        citationBundle: edited.composition.citationBundle,
      },
      assessment: edited.assessment,
    });

    const restarted = new PostgresCompositionAggregateRepository(
      pool,
      new InMemoryContextPacketRegistry(),
    );
    expect(await restarted.get(compiled.draft.draft_artifact_id, 1)).toEqual({
      draft: compiled.draft,
      spans: compiled.spans,
      provenanceMap: compiled.provenanceMap,
      citationBundle: compiled.citationBundle,
    });
    expect(
      await restarted.getCurrent(compiled.draft.draft_artifact_id),
    ).toEqual(stored.composition);
    expect(
      await restarted.getCurrentAssessment(
        edited.assessment.draft_support_assessment_id,
      ),
    ).toEqual(edited.assessment);
    expect(await restarted.registerRevision(structuredClone(edited))).toEqual(
      stored,
    );

    const counts = await pool.query<{
      assessment_revisions: string;
      assessments: string;
      bundles: string;
      citation_assessments: string;
      drafts: string;
      maps: string;
      span_assessments: string;
      spans: string;
      stale_spans: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.draft_artifact_revisions) AS drafts,
         (SELECT count(*)::text FROM petra.draft_spans) AS spans,
         (SELECT count(*)::text FROM petra.provenance_maps) AS maps,
         (SELECT count(*)::text FROM petra.citation_bundles) AS bundles,
         (SELECT count(*)::text FROM petra.draft_support_assessments) AS assessments,
         (SELECT count(*)::text FROM petra.draft_support_assessment_revisions) AS assessment_revisions,
         (SELECT count(*)::text FROM petra.draft_support_span_assessments) AS span_assessments,
         (SELECT count(*)::text FROM petra.draft_support_citation_assessments) AS citation_assessments,
         (SELECT count(*)::text FROM petra.draft_support_citation_stale_spans) AS stale_spans`,
    );
    expect(counts.rows[0]).toEqual({
      drafts: "2",
      spans: "4",
      maps: "2",
      bundles: "2",
      assessments: "1",
      assessment_revisions: "1",
      span_assessments: "2",
      citation_assessments: "1",
      stale_spans: "1",
    });
  });

  it("appends passing support revalidation without rewriting the edited draft", async () => {
    const { repository, engine, researcher, edited } =
      await compileDurableEdit();
    await repository.registerRevision(edited);
    const staleSpan = edited.assessment.content.span_assessments.find(
      (span) => span.support_state === "stale",
    );
    if (staleSpan === undefined) throw new Error("Expected one stale span.");
    const revalidated = engine.revalidate({
      composition: edited.composition,
      previousAssessment: edited.assessment,
      commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FCZ",
      requestedBy: {
        actor_id: researcher.actor_id,
        actor_kind: "human",
      },
      serviceActor: serviceRef(),
      spanResults: [
        {
          draftSpanId: staleSpan.draft_span_id,
          outcome: "pass",
          validatorResults: [
            {
              validator: "petra.span-support",
              version: "1.0.0",
              outcome: "pass",
              code: "EDITED_SPAN_SUPPORT_PRESERVED",
            },
          ],
          reason:
            "The wording remains within the exact evidence and scientific-force boundary.",
        },
      ],
      validatorResults: [
        {
          validator: "petra.felicity-force-preservation",
          version: "1.0.0",
          outcome: "pass",
          code: "SCIENTIFIC_FORCE_PRESERVED",
        },
      ],
      limitations: [
        "Revalidation covers the existing EvidencePacket, not a new literature search.",
      ],
      assessedAt: "2026-09-04T05:01:00.000Z",
    });

    expect(await repository.registerAssessment(revalidated)).toEqual(
      revalidated,
    );
    expect(
      await repository.registerAssessment(structuredClone(revalidated)),
    ).toEqual(revalidated);
    const rebound = structuredClone(revalidated);
    rebound.draft_support_assessment_id = derivePetraId(
      "draft_support_assessment",
      "conflicting-revalidation-command",
    );
    await expectCompositionAggregateCode(
      () => repository.registerAssessment(rebound),
      "DRAFT_SUPPORT_ASSESSMENT_COMMAND_CONFLICT",
    );
    expect(
      await repository.getAssessment(
        revalidated.draft_support_assessment_id,
        1,
      ),
    ).toEqual(edited.assessment);
    expect(
      await repository.getCurrentAssessment(
        revalidated.draft_support_assessment_id,
      ),
    ).toEqual(revalidated);
    expect(
      await repository.getCurrent(edited.composition.draft.draft_artifact_id),
    ).toEqual({
      draft: edited.composition.draft,
      spans: edited.composition.spans,
      provenanceMap: edited.composition.provenanceMap,
      citationBundle: edited.composition.citationBundle,
    });

    const typed = await pool.query<{
      current_revision: string;
      current_spans: string;
      passed_spans: string;
      reuse_allowed: boolean;
      state: string;
    }>(
      `SELECT authority.current_revision::text,
              revision.assessment_state AS state,
              revision.reuse_allowed,
              count(span.position) FILTER (
                WHERE span.support_state = 'current'
              )::text AS current_spans,
              count(span.position) FILTER (
                WHERE span.support_state = 'passed'
              )::text AS passed_spans
         FROM petra.draft_support_assessments AS authority
         JOIN petra.draft_support_assessment_revisions AS revision
           ON revision.draft_support_assessment_id =
                authority.draft_support_assessment_id
          AND revision.revision = authority.current_revision
         JOIN petra.draft_support_span_assessments AS span
           ON span.draft_support_assessment_id =
                revision.draft_support_assessment_id
          AND span.assessment_revision = revision.revision
        WHERE authority.draft_support_assessment_id = $1
        GROUP BY authority.current_revision, revision.assessment_state,
                 revision.reuse_allowed`,
      [revalidated.draft_support_assessment_id],
    );
    expect(typed.rows[0]).toEqual({
      current_revision: "2",
      state: "passed",
      reuse_allowed: true,
      current_spans: "1",
      passed_spans: "1",
    });
  });

  it("persists failed revalidation as non-reusable support state", async () => {
    const { repository, engine, researcher, edited } =
      await compileDurableEdit();
    await repository.registerRevision(edited);
    const staleSpan = edited.assessment.content.span_assessments.find(
      (span) => span.support_state === "stale",
    );
    if (staleSpan === undefined) throw new Error("Expected one stale span.");
    const failed = engine.revalidate({
      composition: edited.composition,
      previousAssessment: edited.assessment,
      commandId: "command_01ARZ3NDEKTSV4RRFFQ69G5FD0",
      requestedBy: {
        actor_id: researcher.actor_id,
        actor_kind: "human",
      },
      serviceActor: serviceRef(),
      spanResults: [
        {
          draftSpanId: staleSpan.draft_span_id,
          outcome: "fail",
          validatorResults: [
            {
              validator: "petra.span-support",
              version: "1.0.0",
              outcome: "fail",
              code: "EDITED_SPAN_STRENGTHENS_CLAIM",
            },
          ],
          reason: "The wording exceeds the source-reported claim strength.",
        },
      ],
      validatorResults: [
        {
          validator: "petra.felicity-force-preservation",
          version: "1.0.0",
          outcome: "fail",
          code: "SCIENTIFIC_FORCE_STRENGTHENED",
        },
      ],
      limitations: ["The strengthened wording is not supported."],
      assessedAt: "2026-09-04T05:01:00.000Z",
    });

    expect(await repository.registerAssessment(failed)).toMatchObject({
      content: {
        state: "failed",
        reuse_policy: { reuse_allowed: false },
        citation_assessments: [{ link_state: "partially_stale" }],
      },
    });
    const typed = await pool.query<{
      assessment_state: string;
      reuse_allowed: boolean;
      stale_span_count: string;
    }>(
      `SELECT revision.assessment_state, revision.reuse_allowed,
              count(stale.draft_span_id)::text AS stale_span_count
         FROM petra.draft_support_assessment_revisions AS revision
         JOIN petra.draft_support_citation_assessments AS citation
           ON citation.draft_support_assessment_id =
                revision.draft_support_assessment_id
          AND citation.assessment_revision = revision.revision
         LEFT JOIN petra.draft_support_citation_stale_spans AS stale
           ON stale.draft_support_assessment_id =
                citation.draft_support_assessment_id
          AND stale.assessment_revision = citation.assessment_revision
          AND stale.citation_position = citation.position
        WHERE revision.draft_support_assessment_id = $1
          AND revision.revision = 2
        GROUP BY revision.assessment_state, revision.reuse_allowed`,
      [failed.draft_support_assessment_id],
    );
    expect(typed.rows[0]).toEqual({
      assessment_state: "failed",
      reuse_allowed: false,
      stale_span_count: "1",
    });
  });

  it("rejects an invalid root assessment and rolls back the entire new aggregate", async () => {
    const { compiled, repository, edited } = await compileDurableEdit();
    const invalid = structuredClone(edited);
    const compiledFirstSpan = compiled.spans[0];
    if (compiledFirstSpan === undefined) {
      throw new Error("Expected one compiled DraftSpan.");
    }
    invalid.assessment.content.span_assessments[0].draft_span_id =
      compiledFirstSpan.draft_span_id;
    invalid.assessment.content_hash = canonicalHash(invalid.assessment.content);
    await expect(repository.registerRevision(invalid)).rejects.toEqual(
      expect.objectContaining({
        code: "DRAFT_SUPPORT_ASSESSMENT_SPAN_INVALID",
      }),
    );

    const skippedHead = structuredClone(edited);
    skippedHead.composition.draft.revision = 3;
    if (skippedHead.composition.draft.lineage.lineage_kind !== "revision") {
      throw new Error("Expected a revision lineage fixture.");
    }
    skippedHead.composition.draft.lineage.parent_revision = 2;
    await expectCompositionAggregateCode(
      () => repository.registerRevision(skippedHead),
      "COMPOSITION_AGGREGATE_REVISION_HEAD_CONFLICT",
    );

    expect(
      await repository.get(compiled.draft.draft_artifact_id, 2),
    ).toBeUndefined();
    expect(
      await repository.getCurrent(compiled.draft.draft_artifact_id),
    ).toEqual({
      draft: compiled.draft,
      spans: compiled.spans,
      provenanceMap: compiled.provenanceMap,
      citationBundle: compiled.citationBundle,
    });
    const count = await pool.query<{ value: string }>(
      "SELECT count(*)::text AS value FROM petra.draft_support_assessments",
    );
    expect(count.rows[0]?.value).toBe("0");
  });

  it("enforces immutable support history at the database boundary", async () => {
    const { repository, edited } = await compileDurableEdit();
    await repository.registerRevision(edited);
    try {
      await pool.query(
        `UPDATE petra.draft_support_span_assessments
            SET support_state = 'passed'
          WHERE draft_support_assessment_id = $1`,
        [edited.assessment.draft_support_assessment_id],
      );
      throw new Error("Expected immutable support history to reject mutation.");
    } catch (error: unknown) {
      expect(error).toEqual(expect.objectContaining({ code: "55000" }));
      if (error instanceof Error) {
        expect(error.message).toContain(
          "DraftSupportAssessment records are immutable",
        );
      }
    }
  });

  it("persists a bounded Felicity revision and receipt atomically", async () => {
    const { compiled, repository, revised } =
      await compileDurableFelicityRevision();
    const stored = await repository.registerFelicityRevision(revised);
    expect(
      await repository.registerFelicityRevision(structuredClone(revised)),
    ).toEqual(stored);
    expect(stored).toEqual({
      composition: {
        draft: revised.composition.draft,
        spans: revised.composition.spans,
        provenanceMap: revised.composition.provenanceMap,
        citationBundle: revised.composition.citationBundle,
      },
      record: revised.record,
    });

    const restarted = new PostgresCompositionAggregateRepository(
      pool,
      new InMemoryContextPacketRegistry(),
    );
    expect(await restarted.get(compiled.draft.draft_artifact_id, 1)).toEqual({
      draft: compiled.draft,
      spans: compiled.spans,
      provenanceMap: compiled.provenanceMap,
      citationBundle: compiled.citationBundle,
    });
    expect(
      await restarted.getCurrent(compiled.draft.draft_artifact_id),
    ).toEqual(stored.composition);
    expect(
      await restarted.getFelicityRevision(
        revised.record.felicity_revision_record_id,
      ),
    ).toEqual(revised.record);
    expect(
      await restarted.registerFelicityRevision(structuredClone(revised)),
    ).toEqual(stored);

    const counts = await pool.query<{
      commands: string;
      drafts: string;
      records: string;
      transformations: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.draft_artifact_revisions) AS drafts,
         (SELECT count(*)::text FROM petra.felicity_revision_records) AS records,
         (SELECT count(*)::text FROM petra.felicity_span_transformations) AS transformations,
         (SELECT count(*)::text FROM petra.composition_revision_commands) AS commands`,
    );
    expect(counts.rows[0]).toEqual({
      drafts: "2",
      records: "1",
      transformations: String(revised.record.content.transformations.length),
      commands: "1",
    });
  });

  it("keeps normalized Felicity transformations and required validators queryable", async () => {
    const { repository, revised } = await compileDurableFelicityRevision();
    await repository.registerFelicityRevision(revised);
    const typed = await pool.query<{
      edit_origin: string;
      passing_required_validators: string;
      production_origin: string;
      transformation_count: string;
      validation_state: string;
    }>(
      `SELECT draft.edit_origin, draft.production_origin,
              draft.validation_state,
              count(DISTINCT transformation.position)::text AS transformation_count,
              count(DISTINCT validator.payload ->> 'validator') FILTER (
                WHERE validator.payload ->> 'outcome' = 'pass'
                  AND validator.payload ->> 'validator' = ANY($2::text[])
              )::text AS passing_required_validators
         FROM petra.felicity_revision_records AS record
         JOIN petra.draft_artifact_revisions AS draft
           ON draft.draft_artifact_id = record.revised_draft_artifact_id
          AND draft.revision = record.revised_draft_revision
         JOIN petra.felicity_span_transformations AS transformation
           ON transformation.felicity_revision_record_id =
                record.felicity_revision_record_id
          AND transformation.record_revision = record.revision
        CROSS JOIN LATERAL jsonb_array_elements(
          record.payload #> '{content,validator_results}'
        ) AS validator(payload)
        WHERE record.felicity_revision_record_id = $1
        GROUP BY draft.edit_origin, draft.production_origin,
                 draft.validation_state`,
      [
        revised.record.felicity_revision_record_id,
        [
          "felicity-language-contract",
          "scientific-force-preservation",
          "epistemic-origin-preservation",
          "provenance-basis-preservation",
          "citation-scope-preservation",
        ],
      ],
    );
    expect(typed.rows[0]).toEqual({
      edit_origin: "felicity_revision",
      production_origin: "deterministic",
      validation_state: "passed",
      transformation_count: String(
        revised.record.content.transformations.length,
      ),
      passing_required_validators: "5",
    });
  });

  it("rolls back a Felicity revision whose receipt drifts from its exact prior span", async () => {
    const { compiled, repository, revised } =
      await compileDurableFelicityRevision();
    const invalid = structuredClone(revised);
    invalid.record.content.transformations[0].previous_exact_text_hash =
      "sha256:0000000000000000000000000000000000000000000000000000000000000000";
    invalid.record.content_hash = canonicalHash(invalid.record.content);

    await expect(repository.registerFelicityRevision(invalid)).rejects.toEqual(
      expect.objectContaining({ code: "FELICITY_REVISION_RECORD_MISMATCH" }),
    );
    expect(
      await repository.get(compiled.draft.draft_artifact_id, 2),
    ).toBeUndefined();
    expect(
      await repository.getCurrent(compiled.draft.draft_artifact_id),
    ).toEqual({
      draft: compiled.draft,
      spans: compiled.spans,
      provenanceMap: compiled.provenanceMap,
      citationBundle: compiled.citationBundle,
    });
    expect(
      await repository.getFelicityRevision(
        invalid.record.felicity_revision_record_id,
      ),
    ).toBeUndefined();
  });

  it("reserves a revision command globally across Felicity and researcher edits", async () => {
    const { repository, revised } = await compileDurableFelicityRevision();
    await repository.registerFelicityRevision(revised);
    const firstSpan = revised.composition.spans[0];
    if (firstSpan === undefined) throw new Error("Expected a revised span.");
    const conflictingEdit = new DraftRevisionEngine().edit({
      previous: revised.composition,
      commandId: revised.record.command_id,
      researcher: {
        actor_id: readFixture<PetraActor>("actor").actor_id,
        actor_kind: "human",
      },
      serviceActor: serviceRef(),
      replacements: [
        {
          draftSpanId: firstSpan.draft_span_id,
          expectedExactTextHash: firstSpan.content.exact_text_hash,
          replacementText: `${firstSpan.content.exact_text} In this evaluation.`,
        },
      ],
      editedAt: "2026-09-04T06:01:00.000Z",
    });
    await expectCompositionAggregateCode(
      () => repository.registerRevision(conflictingEdit),
      "DRAFT_SUPPORT_ASSESSMENT_COMMAND_CONFLICT",
    );
    expect(
      await repository.getCurrent(revised.composition.draft.draft_artifact_id),
    ).toEqual({
      draft: revised.composition.draft,
      spans: revised.composition.spans,
      provenanceMap: revised.composition.provenanceMap,
      citationBundle: revised.composition.citationBundle,
    });
  });

  it("enforces immutable Felicity receipts at the database boundary", async () => {
    const { repository, revised } = await compileDurableFelicityRevision();
    await repository.registerFelicityRevision(revised);
    try {
      await pool.query(
        `UPDATE petra.felicity_span_transformations
            SET transformation_kind = 'unchanged'
          WHERE felicity_revision_record_id = $1`,
        [revised.record.felicity_revision_record_id],
      );
      throw new Error(
        "Expected immutable Felicity history to reject mutation.",
      );
    } catch (error: unknown) {
      expect(error).toEqual(expect.objectContaining({ code: "55000" }));
      if (error instanceof Error) {
        expect(error.message).toContain(
          "FelicityRevisionRecord records are immutable",
        );
      }
    }
  });

  it("publishes all requested composition formats and rehydrates their exact durable lineage", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const aggregate = await new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    ).register(compiled);
    const rendered = new DeterministicCompositionRenderer().renderRequested({
      aggregate,
      renderedBy: serviceRef(),
      renderedAt: "2026-09-04T02:30:00.000Z",
    });
    const store = createMemoryArtifactStore();
    const artifactAuthority = new PostgresArtifactAuthorityRepository(
      pool,
      store,
    );
    const repository = new PostgresRenderedArtifactAuthorityRepository(pool);
    const publisher = new CompositionArtifactPublisher({
      serviceActor: serviceActor(),
      artifactStore: store,
      artifacts: artifactAuthority,
      renderedArtifacts: repository,
    });

    const published = await publisher.publishAll(rendered);
    expect(
      published.map((item) => item.renderedArtifact.content.format),
    ).toEqual(["markdown", "latex", "bibtex"]);
    expect(await publisher.publishAll(structuredClone(rendered))).toEqual(
      published,
    );

    const restarted = new PostgresRenderedArtifactAuthorityRepository(pool);
    expect(
      await restarted.getForDraft(aggregate.draft.draft_artifact_id, 1),
    ).toEqual(published.map((item) => item.renderedArtifact));
    for (const item of published) {
      const read = await store.readByHash(
        item.artifactRegistration.artifact.content_hash,
        {
          byteSize: item.artifactRegistration.artifact.byte_size,
          mediaType: item.artifactRegistration.artifact.media_type,
        },
      );
      const chunks: Uint8Array[] = [];
      for await (const chunk of read.bytes) chunks.push(chunk);
      expect(chunks).toHaveLength(1);
      expect(new TextDecoder().decode(chunks[0])).toBe(
        rendered.find(
          (candidate) =>
            candidate.artifact.artifact_id ===
            item.artifactRegistration.artifact.artifact_id,
        )?.text,
      );
      expect(item.artifactRegistration.manifest.origin).toMatchObject({
        origin_kind: "generated",
        generator_name: "petra.deterministic-composition-renderer",
        input_artifact_ids: [],
      });
      expect(item.artifactRegistration.rightsDecision.permissions).toEqual({
        store_raw_bytes: true,
        parse: true,
        index: true,
        embed: true,
        send_selected_text_remotely: false,
        quote_publicly: false,
        redistribute_artifact: false,
      });
    }
    const counts = await pool.query<{
      rendered: string;
      output_artifacts: string;
      output_manifests: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM petra.rendered_artifacts) AS rendered,
         (SELECT count(*)::text FROM petra.artifacts
           WHERE artifact_kind = 'export') AS output_artifacts,
         (SELECT count(*)::text FROM petra.artifact_manifests
           WHERE origin_generator_name = 'petra.deterministic-composition-renderer')
           AS output_manifests`,
    );
    expect(counts.rows[0]).toEqual({
      rendered: "3",
      output_artifacts: "3",
      output_manifests: "3",
    });
  });

  it("recovers an interrupted publication from its already-available Artifact", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const aggregate = await new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    ).register(compiled);
    const rendered = new DeterministicCompositionRenderer().renderOne(
      {
        aggregate,
        renderedBy: serviceRef(),
        renderedAt: "2026-09-04T02:30:00.000Z",
      },
      "markdown",
    );
    const store = createMemoryArtifactStore();
    const artifactAuthority = new PostgresArtifactAuthorityRepository(
      pool,
      store,
    );
    const interrupted: RenderedArtifactAuthorityRepository = {
      register: () => Promise.reject(new Error("simulated database outage")),
      get: () => Promise.resolve(undefined),
      getForDraft: () => Promise.resolve([]),
    };
    const firstPublisher = new CompositionArtifactPublisher({
      serviceActor: serviceActor(),
      artifactStore: store,
      artifacts: artifactAuthority,
      renderedArtifacts: interrupted,
    });
    await expect(firstPublisher.publish(rendered)).rejects.toThrow(
      "simulated database outage",
    );
    expect(
      await artifactAuthority.getArtifact(rendered.artifact.artifact_id),
    ).toEqual(rendered.artifact);
    expect(
      await store.inspectByHash(rendered.artifact.content_hash, {
        byteSize: rendered.artifact.byte_size,
        mediaType: rendered.artifact.media_type,
      }),
    ).toBeDefined();

    const repository = new PostgresRenderedArtifactAuthorityRepository(pool);
    const recovered = await new CompositionArtifactPublisher({
      serviceActor: serviceActor(),
      artifactStore: store,
      artifacts: artifactAuthority,
      renderedArtifacts: repository,
    }).publish(structuredClone(rendered));
    expect(recovered.renderedArtifact).toEqual(rendered.record);
    expect(await repository.get(rendered.record.rendered_artifact_id)).toEqual(
      rendered.record,
    );
  });

  it("rejects changed render bytes and a record whose output Artifact is missing", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const aggregate = await new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    ).register(compiled);
    const rendered = new DeterministicCompositionRenderer().renderOne(
      {
        aggregate,
        renderedBy: serviceRef(),
        renderedAt: "2026-09-04T02:30:00.000Z",
      },
      "markdown",
    );
    const store = createMemoryArtifactStore();
    const repository = new PostgresRenderedArtifactAuthorityRepository(pool);
    const publisher = new CompositionArtifactPublisher({
      serviceActor: serviceActor(),
      artifactStore: store,
      artifacts: new PostgresArtifactAuthorityRepository(pool, store),
      renderedArtifacts: repository,
    });
    const changedBytes = {
      ...rendered,
      bytes: new TextEncoder().encode(`${rendered.text}changed`),
    };
    await expect(publisher.publish(changedBytes)).rejects.toEqual(
      expect.objectContaining<Partial<CompositionPublicationError>>({
        code: "COMPOSITION_PUBLICATION_RENDER_INVALID",
      }),
    );
    expect(
      await store.inspectByHash(rendered.artifact.content_hash),
    ).toBeUndefined();
    await expectRenderedArtifactCode(
      () => repository.register(rendered.record),
      "RENDERED_ARTIFACT_REFERENCE_MISSING",
    );
  });

  it("rejects RenderedArtifact identity drift and direct SQL mutation", async () => {
    const { terminal, compiled } = await compileDurableComposition();
    const aggregate = await new PostgresCompositionAggregateRepository(
      pool,
      terminal.packets,
    ).register(compiled);
    const rendered = new DeterministicCompositionRenderer().renderOne(
      {
        aggregate,
        renderedBy: serviceRef(),
        renderedAt: "2026-09-04T02:30:00.000Z",
      },
      "markdown",
    );
    const store = createMemoryArtifactStore();
    const artifactAuthority = new PostgresArtifactAuthorityRepository(
      pool,
      store,
    );
    const repository = new PostgresRenderedArtifactAuthorityRepository(pool);
    await new CompositionArtifactPublisher({
      serviceActor: serviceActor(),
      artifactStore: store,
      artifacts: artifactAuthority,
      renderedArtifacts: repository,
    }).publish(rendered);

    const changed = structuredClone(rendered.record);
    changed.content.warnings.push({
      code: "TEST_DRIFT",
      message: "This warning was not part of the persisted representation.",
    });
    changed.content_hash = canonicalHash(changed.content);
    await expectRenderedArtifactCode(
      () => repository.register(changed),
      "RENDERED_ARTIFACT_ID_CONFLICT",
    );

    const competing = structuredClone(rendered.record);
    competing.rendered_artifact_id = derivePetraId(
      "rendered_artifact",
      "competing-render-slot",
    );
    await expectRenderedArtifactCode(
      () => repository.register(competing),
      "RENDERED_ARTIFACT_SLOT_CONFLICT",
    );

    try {
      await pool.query(
        `UPDATE petra.rendered_artifacts
            SET rendered_at = rendered_at + interval '1 second'
          WHERE rendered_artifact_id = $1`,
        [rendered.record.rendered_artifact_id],
      );
      throw new Error("Expected the immutable trigger to reject the update.");
    } catch (error: unknown) {
      expect(error).toEqual(expect.objectContaining({ code: "55000" }));
      if (error instanceof Error) {
        expect(error.message).toContain(
          "RenderedArtifact records are immutable",
        );
      }
    }
    expect(await repository.get(rendered.record.rendered_artifact_id)).toEqual(
      rendered.record,
    );
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

    const running = await recorder.startWork({
      interaction: terminalRequest.interaction,
      prompt: terminalRequest.prompt,
    });
    expect(running).toMatchObject({
      work_unit_revision: 3,
      state: "running",
    });
    const startedWorkUnit = await workUnits.getWorkUnit(running.work_unit_id);
    expect(startedWorkUnit?.spec.cancellation_policy).toBe("cancellable");
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
    expect(
      await recorder.startWork({
        interaction: cacheRequest.interaction,
        prompt: cacheRequest.prompt,
      }),
    ).toMatchObject({ state: "running", work_unit_revision: 3 });
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
      artifacts: "3",
      work_units: "2",
      interaction_runs: "2",
    });
  });

  it("persists explicit cancellation and restores its terminal interaction without model work", async () => {
    const { registry: packets } = makePackets();
    const store = createMemoryArtifactStore();
    const artifactAuthority = new PostgresArtifactAuthorityRepository(
      pool,
      store,
    );
    const feature = readFixture<PetraInteractionFeatureManifest>(
      "interaction-feature-manifest",
    );
    feature.compiled_by = serviceRef();
    const history = new DurableInteractionHistory({
      serviceActor: serviceActor(),
      artifactStore: store,
      artifacts: artifactAuthority,
      interactions,
      workUnits,
    });
    const recorder = new GroundedSynthesisTerminalRecorder({
      actors: [readFixture<PetraActor>("actor"), serviceActor()],
      serviceActor: serviceActor(),
      project: readFixture<PetraProject>("project"),
      featureManifest: feature,
      roleCertification: certification(),
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
      interactionHistory: history,
      runtimeVersion: "24.20.0",
    });
    const interaction = {
      protocol_thread_id: "thread_grounded_cancellation",
      protocol_run_id: "run_grounded_cancellation",
      request_id: "request_grounded_cancellation",
      trace_id: "trace_grounded_cancellation",
      work_unit_id: derivePetraId("work_unit", "run_grounded_cancellation"),
      started_at: "2026-09-04T02:29:59.000Z",
    };
    const prompt = "Stop this bounded synthesis before it produces an answer.";
    const running = await recorder.startWork({ interaction, prompt });
    const cancellation = await recorder.cancelWork({
      interaction,
      work: running,
      command_id: "command_01ARZ3NDEKTSV4RRFFQ69G5FE9",
      reason: "The researcher explicitly stopped this running task.",
      requested_at: "2026-09-04T02:30:01.000Z",
    });
    const envelope = {
      threadId: interaction.protocol_thread_id,
      runId: interaction.protocol_run_id,
      workUnitId: interaction.work_unit_id,
      modelRequestId: "unavailable",
      requestId: interaction.request_id,
      traceId: interaction.trace_id,
    };
    const events = [
      {
        ...envelope,
        sequence: 1,
        timestamp: Date.parse(interaction.started_at),
        kind: "run.started",
      },
      {
        ...envelope,
        sequence: 2,
        timestamp: Date.parse("2026-09-04T02:30:00.000Z"),
        kind: "activity.snapshot",
        activityType: "petra.work_unit.status",
        content: {
          label: "Cancellable grounded work registered",
          status: "running",
          workUnitRevision: 3,
          detail: { authority_effect: "none" },
        },
      },
      {
        ...envelope,
        sequence: 3,
        timestamp: Date.parse(cancellation.cancelled_at),
        kind: "run.error",
        code: "WORK_UNIT_CANCELLED",
        message: "The WorkUnit was cancelled by an explicit Petra command.",
      },
    ] satisfies PetraInteractionEvent[];

    await recorder.persistCancellation({
      interaction,
      prompt,
      cancellation,
      presentation_events: events,
    });
    const replayedCancellation = await recorder.cancelWork({
      interaction,
      work: running,
      command_id: cancellation.command_id,
      reason: "The researcher explicitly stopped this running task.",
      requested_at: "2026-09-04T02:30:05.000Z",
    });
    expect(replayedCancellation).toEqual({
      ...cancellation,
      applied: false,
    });
    const restored = await history.restore(
      interaction.protocol_thread_id,
      interaction.protocol_run_id,
    );
    expect(restored?.status).toBe("cancelled");
    expect(restored?.events).toEqual(events);
    expect(restored?.workUnit.revision).toBe(4);
    expect(restored?.workUnit.status.state).toBe("cancelled");
    expect(restored?.run.content.lifecycle).toEqual({
      state: "cancelled",
      started_at: interaction.started_at,
      ended_at: cancellation.cancelled_at,
      outcome_code: "WORK_UNIT_CANCELLED",
    });
    expect(
      await pool.query(
        "SELECT count(*)::integer AS count FROM petra.grounded_responses",
      ),
    ).toEqual(expect.objectContaining({ rows: [{ count: 0 }] }));
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
