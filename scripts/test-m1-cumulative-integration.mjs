import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { PetraInteractionClient } from "@petra/adapters";
import {
  ContextPacketCompiler,
  DeterministicCompositionRenderer,
  DurableReviewInterruptCoordinator,
  GroundedCompositionCompiler,
  InMemoryContextPacketRegistry,
  InMemoryEvidenceRegistry,
  InMemoryInteractionRecordRegistry,
  PetraInteractionRuntime,
  RepositoryAuthorityGraphProjectionSource,
  ScientificGraphProjector,
  admitEvidenceProposalBundle,
  buildCompensatingReversalCommandPlan,
  buildDeterministicEvidenceProposalBundle,
  buildReviewDecisionCommandPlan,
  deriveGroundedResponseInvalidation,
  derivePetraId,
  executeCompensatingReversalPlan,
  executeReviewDecisionPlan,
  replayScientificAuthority,
} from "@petra/core";
import { Neo4jAuthorityGraphStore } from "@petra/neo4j";
import {
  PostgresArtifactAuthorityRepository,
  PostgresChangeControlAuthorityRepository,
  PostgresDocumentAuthorityRepository,
  PostgresEvidenceAuthorityRepository,
  PostgresGraphProjectionAuthorityRepository,
  PostgresResearchScopeRepository,
  PostgresScholarlyIdentityRepository,
} from "@petra/postgres";
import {
  GraphGuidedRetrievalService,
  InMemoryScientificLexicalIndex,
} from "@petra/retrieval";
import { S3ArtifactStore } from "@petra/s3";
import { canonicalize } from "json-canonicalize";
import neo4j from "neo4j-driver";
import pg from "pg";

const { Pool } = pg;
const root = resolve(import.meta.dirname, "..");
const fixtureRoot = resolve(root, "fixtures/full-text/fair-guiding-principles");
const contractsRoot = resolve(root, "packages/contracts");
const modelsRoot = resolve(root, ".cache/docling/models");
const composeFile = resolve(root, "infra/recovery/integration.compose.yaml");
const outputPath = resolve(root, ".data/m1.9/cumulative-result.json");
const temporaryRoot = mkdtempSync(resolve(tmpdir(), "petra-m19-cumulative-"));
const workerOutput = resolve(temporaryRoot, "worker-output");
const projectName = "petra-m19-cumulative-" + process.pid + "-" + Date.now();
const postgresPassword = "petra-recovery-only";
const bucket = "petra-m19-cumulative";
const token = "petra-m19-cumulative-token";
const capabilityGrantId = "capability_grant_01ARZ3NDEKTSV4RRFFQ69G5FDF";
const projection = {
  target: "neo4j_graph",
  projection_name: "petra.authority_graph",
  projection_version: "1.0.0",
  configuration_hash: "sha256:" + "a".repeat(64),
};

const hashBytes = (bytes) =>
  "sha256:" + createHash("sha256").update(bytes).digest("hex");
const hashRecord = (value) => hashBytes(Buffer.from(canonicalize(value)));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readAccepted = (name) =>
  readJson(resolve(contractsRoot, "fixtures/accepted/" + name + ".json"));
const readFixtureRecord = (name) =>
  readJson(resolve(fixtureRoot, "records/" + name + ".json"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const chunks = function* (bytes) {
  yield bytes;
};

const run = (program, args, options = {}) =>
  new Promise((resolveRun) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveRun(result);
    };
    const child = spawn(program, args, {
      cwd: root,
      env: { ...process.env, ...options.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) =>
      finish({ code: 1, stdout: Buffer.concat(stdout), stderr: error.message }),
    );
    child.on("close", (code, signal) =>
      finish({
        code: code ?? 1,
        signal,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr).toString("utf8"),
      }),
    );
    child.stdin.end(options.input);
  });

const requireRun = async (program, args, options) => {
  const result = await run(program, args, options);
  if (result.code !== 0) {
    throw new Error(
      program +
        " " +
        args.join(" ") +
        " failed (" +
        result.code +
        "):\n" +
        (result.stderr || result.stdout.toString("utf8")),
    );
  }
  return result;
};

const composeArgs = (...args) => [
  "compose",
  "--project-name",
  projectName,
  "--file",
  composeFile,
  ...args,
];

const servicePort = async (service, containerPort) => {
  const result = await requireRun(
    "docker",
    composeArgs("port", service, containerPort),
  );
  const port = /:(\d+)\s*$/u.exec(result.stdout.toString("utf8"))?.[1];
  if (port === undefined) {
    throw new Error("Could not resolve " + service + ":" + containerPort + ".");
  }
  return port;
};

const resourceCount = async () => {
  const filter = "label=com.docker.compose.project=" + projectName;
  const results = await Promise.all([
    run("docker", ["ps", "--all", "--quiet", "--filter", filter]),
    run("docker", ["network", "ls", "--quiet", "--filter", filter]),
    run("docker", ["volume", "ls", "--quiet", "--filter", filter]),
  ]);
  return results.reduce(
    (count, result) =>
      count +
      result.stdout
        .toString("utf8")
        .split("\n")
        .filter((line) => line !== "").length,
    0,
  );
};

const createBucket = async (client) => {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (
      typeof error !== "object" ||
      error === null ||
      !["BucketAlreadyOwnedByYou", "BucketAlreadyExists"].includes(
        String(error.name),
      )
    ) {
      throw error;
    }
  }
};

const serviceActor = () => readFixtureRecord("actor");
const humanActor = () => readAccepted("actor");
const modelActor = () => ({
  ...serviceActor(),
  actor_id: derivePetraId("actor", "m1.9-cumulative-extractor"),
  actor_kind: "model",
  display_name: "Petra deterministic M1.9 extractor",
  created_at: "2026-09-08T12:00:00.000Z",
});
const actorRef = (actor) => ({
  actor_id: actor.actor_id,
  actor_kind: actor.actor_kind,
});

const domainFactory = () => {
  let eventIndex = 0;
  let outboxIndex = 0;
  let clockIndex = 0;
  return {
    nextId: (kind) =>
      derivePetraId(
        kind,
        "m1.9-cumulative:" +
          kind +
          ":" +
          (kind === "event" ? ++eventIndex : ++outboxIndex),
      ),
    now: () =>
      "2026-09-08T12:10:" + String(++clockIndex).padStart(2, "0") + ".000Z",
  };
};

const pageNumbers = (span) => {
  if (span.selector.selector_type === "page_region") {
    return [span.selector.page_region.page_number];
  }
  if (span.selector.selector_type !== "compound") return [];
  return span.selector.components.flatMap((component) =>
    component.component_kind === "page_region"
      ? [component.page_region.page_number]
      : [],
  );
};

const artifactInput = (available) => {
  const artifact = readFixtureRecord("artifact");
  const manifest = readFixtureRecord("artifact-manifest");
  const rightsDecision = readFixtureRecord("rights-decision");
  manifest.storage_ref = {
    storage_kind: "content_addressed_object",
    store_name: available.storeName,
    object_key: available.objectKey,
    content_hash: available.contentHash,
    availability: "available",
    verified_at: available.availableAt,
  };
  manifest.integrity.checked_at = available.availableAt;
  manifest.recorded_at = available.availableAt;
  return { artifact, manifest, rightsDecision };
};

const parserArtifactInput = (parseBundle, source, available) => {
  const service = serviceActor();
  const generatedAt = parseBundle.document.parser_provenance.completed_at;
  const artifact = {
    schema_name: "petra.artifact",
    schema_version: "1.0.0",
    artifact_id: parseBundle.document.parser_output_artifact_id,
    revision: 1,
    artifact_kind: "structured_text",
    media_type: available.mediaType,
    content_hash: available.contentHash,
    byte_size: available.byteSize,
    created_by: actorRef(service),
    created_at: generatedAt,
  };
  const seed = artifact.artifact_id + ":" + artifact.content_hash;
  const manifest = {
    schema_name: "petra.artifact-manifest",
    schema_version: "1.0.0",
    artifact_manifest_id: derivePetraId("artifact_manifest", seed),
    revision: 1,
    artifact_id: artifact.artifact_id,
    rights_decision_id: derivePetraId("rights_decision", seed),
    origin: {
      origin_kind: "generated",
      generator_name: parseBundle.document.adapter.name,
      generator_version: parseBundle.document.adapter.version,
      generated_at: generatedAt,
      input_artifact_ids: [source.artifact.artifact_id],
    },
    storage_ref: {
      storage_kind: "content_addressed_object",
      store_name: available.storeName,
      object_key: available.objectKey,
      content_hash: available.contentHash,
      availability: "available",
      verified_at: available.availableAt,
    },
    integrity: {
      status: "verified",
      checked_at: available.availableAt,
      problems: [],
    },
    recorded_by: actorRef(service),
    recorded_at: available.availableAt,
  };
  const rightsDecision = {
    schema_name: "petra.rights-decision",
    schema_version: "1.0.0",
    rights_decision_id: manifest.rights_decision_id,
    revision: 1,
    artifact_manifest_id: manifest.artifact_manifest_id,
    source_location: "urn:petra:docling-output:" + artifact.artifact_id,
    license_status: "known",
    observed_license: {
      statement:
        "Petra-generated parser output retained under the source-copy terms.",
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
    required_notices: [
      "Consult the acquired source ArtifactManifest before external use.",
    ],
    authorization_reference: "petra-docling-local-output/1.0.0",
    decision_maker: actorRef(service),
    rationale:
      "The local parser output may be retained and indexed without changing the rights of the source copy.",
    observed_at: generatedAt,
    policy_version: "petra-rights/1.0.0",
    created_at: generatedAt,
  };
  return { artifact, manifest, rightsDecision };
};

const buildProposal = (parseBundle) => {
  const fixture = readJson(resolve(fixtureRoot, "source-manifest.json"));
  const workerInput = readFixtureRecord("worker-input-manifest");
  const targets = new Map(
    fixture.source_span_targets.map((target) => [target.target_id, target]),
  );
  const primary = targets.get("broad-machine-actionability-claim");
  const qualification = targets.get("principles-not-standard-qualification");
  assert(primary !== undefined, "The primary source target is absent.");
  assert(
    qualification !== undefined,
    "The qualification source target is absent.",
  );
  return buildDeterministicEvidenceProposalBundle(parseBundle, {
    recipe_name: "petra-fair-calibration-mapper",
    recipe_version: "1.0.0",
    project_id: workerInput.project_id,
    created_by: actorRef(modelActor()),
    created_at: "2026-09-08T12:05:00.000Z",
    candidates: [
      {
        candidate_key: primary.target_id,
        proposal_role: "primary",
        source: {
          selection_kind: "exact_text",
          exact_text: primary.exact_text,
          page_number: primary.page_number,
        },
        canonical_text:
          "The FAIR Principles emphasize enabling machines to find and use data automatically.",
        claim_kind: "descriptive",
        scope: {
          outcome: {
            description: "Machine ability to find and use data automatically",
            entity_refs: [],
          },
          setting: {
            description: "Scientific data management and stewardship",
            entity_refs: [],
          },
          unreported_dimensions: [
            "population",
            "language",
            "task",
            "model_family",
            "dataset",
            "intervention_or_exposure",
            "comparator",
            "temporal_boundary",
          ],
        },
        detail_level: "broad",
        source_stance: "states",
        attribution: "Wilkinson et al. (2016)",
        modality: "asserted",
        negated: false,
      },
      {
        candidate_key: qualification.target_id,
        proposal_role: "qualification",
        source: {
          selection_kind: "exact_text",
          exact_text: qualification.exact_text,
          page_number: qualification.page_number,
        },
        canonical_text:
          "The FAIR Principles are not themselves a standard or specification.",
        claim_kind: "descriptive",
        scope: {
          intervention_or_exposure: {
            description: "The FAIR Principles",
            entity_refs: [],
          },
          outcome: {
            description: "Status as a formal standard or specification",
            entity_refs: [],
          },
          unreported_dimensions: [
            "population",
            "language",
            "task",
            "model_family",
            "dataset",
            "comparator",
            "setting",
            "temporal_boundary",
          ],
        },
        detail_level: "detailed",
        source_stance: "qualifies",
        attribution: "Wilkinson et al. (2016)",
        modality: "asserted",
        negated: true,
      },
      {
        candidate_key: "fabricated-guarantee-negative-control",
        proposal_role: "negative_control",
        source: {
          selection_kind: "explicit_span",
          exact_text:
            "The FAIR Principles guarantee reproducible scientific results.",
          source_span_ids: ["source_span_00000000000000000000000000"],
        },
        canonical_text:
          "Following the FAIR Principles guarantees reproducible scientific results.",
        claim_kind: "causal",
        scope: {
          intervention_or_exposure: {
            description: "Following the FAIR Principles",
            entity_refs: [],
          },
          outcome: {
            description: "Reproducible scientific results",
            entity_refs: [],
          },
          unreported_dimensions: [
            "population",
            "language",
            "task",
            "model_family",
            "dataset",
            "comparator",
            "setting",
            "temporal_boundary",
          ],
        },
        detail_level: "detailed",
        source_stance: "reports",
        attribution: "Wilkinson et al. (2016)",
        modality: "asserted",
        negated: false,
      },
    ],
  });
};

const reviewPlan = (projectId, candidate, decision, timing, rationale) =>
  buildReviewDecisionCommandPlan({
    project_id: projectId,
    candidate,
    origin: "worker_proposal",
    proposed_by: actorRef(modelActor()),
    reviewer: actorRef(humanActor()),
    capability_grant_id: capabilityGrantId,
    decision,
    reason: "Review the exact source-grounded Claim and ASSERTS pair.",
    rationale,
    impact_summary:
      "This decision changes representation authority, not the proposition's truth value.",
    timing,
  });

const checkpointFor = (projectId, outbox) => {
  const checkpoint = readAccepted("projection-checkpoint-catching-up");
  checkpoint.projection_checkpoint_id = derivePetraId(
    "projection_checkpoint",
    projectId + ":" + canonicalize(projection),
  );
  checkpoint.project_id = projectId;
  checkpoint.projection = structuredClone(projection);
  checkpoint.content.observed_head = {
    outbox_id: outbox.outbox_id,
    outbox_position: outbox.outbox_position,
    target_sequence: outbox.target_sequence,
    event_id: outbox.message.event.event_id,
    event_position: outbox.message.event.event_position,
    stream_revision: outbox.message.event.stream_revision,
    observed_at: "2026-09-08T12:11:00.000Z",
  };
  checkpoint.content.freshness.pending_records = outbox.target_sequence;
  checkpoint.content_hash = hashRecord(checkpoint.content);
  checkpoint.recorded_by = actorRef(serviceActor());
  checkpoint.recorded_at = checkpoint.content.observed_head.observed_at;
  return checkpoint;
};

const packetCandidate = (record, roles, route, rank) => ({
  record,
  evidenceRoles: roles,
  sourceAccess:
    record.schema_name === "petra.source-span"
      ? "full_text_structured"
      : "full_text_analyzed",
  selection: {
    route,
    rank,
    score: String(1 / rank),
    reason:
      "Selected from the exact trusted graph neighborhood produced in this cumulative run.",
  },
  material: true,
});

const compilePackets = ({
  projectId,
  appliedEvent,
  claim,
  assertion,
  sourceSpan,
  rightsDecision,
}) => {
  const registry = new InMemoryContextPacketRegistry();
  const compiler = new ContextPacketCompiler(registry);
  const snapshotRef = {
    snapshot_id: derivePetraId("snapshot", appliedEvent.event_id),
    snapshot_revision: 1,
    event_position: appliedEvent.event_position,
    content_hash: hashRecord({
      project_id: projectId,
      event_id: appliedEvent.event_id,
      event_position: appliedEvent.event_position,
      claim,
      assertion,
    }),
  };
  const context = compiler.compileContextPacket({
    projectId,
    snapshotRef,
    recipeRef: {
      recipe_name: "petra-bounded-lexical-graph",
      recipe_version: "1.0.0",
      content_hash: hashRecord({
        recipe_name: "petra-bounded-lexical-graph",
        recipe_version: "1.0.0",
      }),
    },
    objective: {
      kind: "answer",
      statement:
        "What do the FAIR Principles report about machine actionability, within the reviewed source boundary?",
      targetObjectIds: [claim.claim_id],
    },
    candidates: [
      packetCandidate(claim, ["relevant", "supporting"], "lexical", 1),
      packetCandidate(assertion, ["supporting"], "graph_expansion", 2),
      packetCandidate(sourceSpan, ["source_location"], "graph_expansion", 3),
    ],
    omissions: [
      {
        omission_kind: "search_boundary",
        boundary:
          "No literature discovery beyond the acquired FAIR Principles paper was performed.",
        reason: "not_retrieved",
        material: true,
        detail:
          "Coverage is the current project snapshot and exact promoted evidence path, not the literature.",
      },
    ],
    coverageStatement:
      "Coverage is bounded to the promoted Claim, ASSERTS relation, and exact source span.",
    contraryEvidenceChecked: true,
    budget: {
      maxInputTokens: 10_000,
      maxObjects: 10,
      maxSourceSpans: 5,
    },
    dependencies: [
      {
        dependency_kind: "projection",
        name: projection.projection_name,
        version: projection.projection_version,
        content_hash: projection.configuration_hash,
      },
      {
        dependency_kind: "ranking",
        name: "petra-bounded-lexical-graph",
        version: "1.0.0",
        content_hash: hashRecord({
          recipe_name: "petra-bounded-lexical-graph",
          recipe_version: "1.0.0",
        }),
      },
      {
        dependency_kind: "policy",
        name: "rights-decision:" + rightsDecision.rights_decision_id,
        version: String(rightsDecision.revision),
        content_hash: hashRecord(rightsDecision),
      },
    ],
    compiledBy: actorRef(serviceActor()),
    compiledAt: "2026-09-08T12:12:00.000Z",
  });
  const evidence = compiler.compileEvidencePacket({
    contextPacketId: context.context_packet_id,
    compositionObjective:
      "Explain the selected FAIR Principles statement without exceeding its reviewed evidence boundary.",
    temporalPerspective: {
      perspective: "current",
      as_of: "2026-09-08T12:12:01.000Z",
    },
    decisions: context.content.included_objects.map((inclusion) => ({
      decision: "select",
      objectId: inclusion.object_ref.object_id,
      bearing:
        inclusion.object_ref.object_kind === "source_span"
          ? "background"
          : "supporting",
      inclusionReason:
        "Selected for the bounded cumulative demonstration composition.",
      useLimitations: ["Do not generalize beyond the recorded source scope."],
    })),
    coverageStatement:
      "Every object in the bounded ContextPacket is selected; literature coverage remains bounded.",
    contraryEvidenceChecked: true,
    qualifyingEvidenceChecked: true,
    freshness: {
      state: "current_for_snapshot",
      checked_at: "2026-09-08T12:12:01.000Z",
    },
    compiledBy: actorRef(serviceActor()),
    compiledAt: "2026-09-08T12:12:01.000Z",
  });
  return { registry, context, evidence };
};

const exactPacketSelection = (packet, objectKind) => {
  const selection = packet.content.selected_evidence.find(
    (item) => item.object_ref.object_kind === objectKind,
  );
  assert(selection !== undefined, "Missing " + objectKind + " evidence.");
  return structuredClone(selection);
};

const buildComposition = ({
  projectId,
  context,
  evidence,
  packets,
  scholarlyRecords,
}) => {
  const claimSelection = exactPacketSelection(evidence, "claim");
  const assertionSelection = exactPacketSelection(evidence, "assertion");
  const claimRef = claimSelection.object_ref;
  const assertionRef = assertionSelection.object_ref;
  const responseText =
    "Wilkinson et al. report that the FAIR Principles emphasize enabling machines to find and use data automatically. This bounded record concerns scientific data management and stewardship.";

  const request = readAccepted("composition-request");
  request.composition_request_id = derivePetraId(
    "composition_request",
    projectId + ":" + context.context_packet_id,
  );
  request.project_id = projectId;
  request.snapshot_ref = structuredClone(context.snapshot_ref);
  request.content.objective = evidence.content.composition_objective;
  request.content.subject_refs = [structuredClone(claimRef)];
  request.content_hash = hashRecord(request.content);
  request.requested_by = actorRef(humanActor());
  request.requested_at = "2026-09-08T12:13:00.000Z";

  const plan = readAccepted("composition-plan");
  plan.composition_plan_id = derivePetraId(
    "composition_plan",
    request.composition_request_id,
  );
  plan.project_id = projectId;
  plan.composition_request_ref = {
    composition_request_id: request.composition_request_id,
    revision: request.revision,
    content_hash: request.content_hash,
  };
  plan.evidence_packet_ref = {
    evidence_packet_id: evidence.evidence_packet_id,
    revision: evidence.revision,
    content_hash: evidence.content_hash,
  };
  plan.snapshot_ref = structuredClone(context.snapshot_ref);
  const section = plan.content.sections[0];
  assert(section !== undefined, "The composition fixture has no section.");
  section.section_id = derivePetraId(
    "composition_section",
    plan.composition_plan_id + ":section:1",
  );
  section.heading = "Bounded FAIR finding";
  section.purpose =
    "Report the reviewed source statement and retain its declared setting.";
  const firstMove = section.moves[0];
  const secondMove = section.moves[1];
  assert(
    firstMove !== undefined && secondMove !== undefined,
    "The composition fixture needs two moves.",
  );
  firstMove.move_id = derivePetraId(
    "composition_move",
    plan.composition_plan_id + ":move:1",
  );
  firstMove.planned_text =
    "Wilkinson et al. report that the FAIR Principles emphasize enabling machines to find and use data automatically.";
  firstMove.evidence_refs = [
    {
      context_selection_order: claimSelection.context_selection_order,
      object_ref: structuredClone(claimRef),
      relation: "direct_report",
    },
    {
      context_selection_order: assertionSelection.context_selection_order,
      object_ref: structuredClone(assertionRef),
      relation: "direct_report",
    },
  ];
  firstMove.limitations = [
    "Attribute the statement to Wilkinson et al. and do not convert it into an independently established guarantee.",
  ];
  secondMove.move_id = derivePetraId(
    "composition_move",
    plan.composition_plan_id + ":move:2",
  );
  secondMove.planned_text =
    "This bounded record concerns scientific data management and stewardship.";
  secondMove.evidence_refs = [
    {
      context_selection_order: claimSelection.context_selection_order,
      object_ref: structuredClone(claimRef),
      relation: "qualification",
    },
  ];
  secondMove.limitations = [
    "Do not generalize beyond the setting represented in the reviewed Claim.",
  ];
  plan.content.coverage.statement =
    "The plan accounts for every object selected for this bounded response; it does not claim literature completeness.";
  plan.content_hash = hashRecord(plan.content);
  plan.compiled_by = actorRef(serviceActor());
  plan.compiled_at = "2026-09-08T12:13:01.000Z";

  const groundedResponse = readAccepted("grounded-response");
  groundedResponse.grounded_response_id = derivePetraId(
    "grounded_response",
    plan.composition_plan_id,
  );
  groundedResponse.project_id = projectId;
  groundedResponse.content.response_artifact_ref = {
    artifact_id: derivePetraId(
      "artifact",
      hashBytes(Buffer.from(responseText)),
    ),
    content_hash: hashBytes(Buffer.from(responseText)),
    byte_size: Buffer.byteLength(responseText),
    media_type: "text/markdown; charset=utf-8",
  };
  groundedResponse.content.context_packet_ref = {
    context_packet_id: context.context_packet_id,
    revision: context.revision,
    content_hash: context.content_hash,
  };
  groundedResponse.content.evidence_packet_ref = {
    evidence_packet_id: evidence.evidence_packet_id,
    revision: evidence.revision,
    content_hash: evidence.content_hash,
  };
  groundedResponse.content.snapshot_ref = structuredClone(context.snapshot_ref);
  groundedResponse.content.execution_ref = {
    model_request_id: derivePetraId(
      "model_request",
      groundedResponse.grounded_response_id,
    ),
    model_call_id: derivePetraId(
      "model_call",
      groundedResponse.grounded_response_id,
    ),
    model_deployment_id: derivePetraId(
      "model_deployment",
      "m1.9-cumulative-deterministic",
    ),
    role_certification_id: derivePetraId(
      "role_certification",
      "m1.9-cumulative-grounded-synthesist",
    ),
  };
  groundedResponse.content.dependencies =
    evidence.content.selected_evidence.map((selection) => ({
      dependency_role: "selected_evidence",
      object_ref: structuredClone(selection.object_ref),
    }));
  groundedResponse.content.model_output_hash = hashBytes(
    Buffer.from(responseText),
  );
  groundedResponse.content.cache = {
    state: "reusable",
    cache_key:
      "grounded-response:v1:" +
      hashBytes(
        Buffer.from(
          groundedResponse.grounded_response_id + ":" + evidence.content_hash,
        ),
      ).slice("sha256:".length),
    checked_at: "2026-09-08T12:13:02.000Z",
  };
  groundedResponse.content.terminal = {
    state: "completed",
    persisted_at: "2026-09-08T12:13:02.000Z",
    authority_effect: "none",
  };
  groundedResponse.content_hash = hashRecord(groundedResponse.content);
  groundedResponse.recorded_by = actorRef(serviceActor());
  groundedResponse.recorded_at = "2026-09-08T12:13:02.000Z";

  const compiler = new GroundedCompositionCompiler(packets);
  const compiled = compiler.compile({
    request,
    plan,
    evidence,
    groundedResponse,
    modelActor: actorRef(modelActor()),
    serviceActor: actorRef(serviceActor()),
    promptProfile: {
      name: "petra-grounded-synthesist",
      version: "1.0.0",
    },
    promptHash: hashRecord({
      name: "petra-grounded-synthesist",
      version: "1.0.0",
    }),
    scholarlyRecords,
  });
  const renderer = new DeterministicCompositionRenderer();
  const rendered = renderer.renderRequested({
    aggregate: {
      draft: compiled.draft,
      spans: compiled.spans,
      provenanceMap: compiled.provenanceMap,
      citationBundle: compiled.citationBundle,
    },
    renderedBy: actorRef(serviceActor()),
    renderedAt: "2026-09-08T12:13:03.000Z",
  });
  assert(
    compiled.draft.content.text === responseText,
    "The compiled DraftArtifact text changed from the reviewed plan.",
  );
  const selectedIdentities = new Set(
    evidence.content.selected_evidence.map(
      (selection) =>
        selection.object_ref.object_id +
        ":" +
        selection.object_ref.object_revision +
        ":" +
        selection.object_ref.object_hash,
    ),
  );
  assert(
    compiled.provenanceMap.content.mappings.every(
      (mapping) =>
        mapping.bases.length > 0 &&
        mapping.bases
          .filter((basis) => basis.basis_kind === "evidence")
          .every((basis) =>
            selectedIdentities.has(
              basis.object_ref.object_id +
                ":" +
                basis.object_ref.object_revision +
                ":" +
                basis.object_ref.object_hash,
            ),
          ),
    ),
    "A material DraftSpan escaped the exact EvidencePacket.",
  );
  return { request, plan, groundedResponse, compiled, rendered };
};

const createInteractionFixture = ({ projectId, candidate, changes }) => {
  const response = readAccepted("review-interrupt-response");
  response.client_response_id = "review-response-m19-cumulative-1";
  response.project_id = projectId;
  response.rationale =
    "The qualification is an exact, source-grounded statement that should enter trusted authority.";
  response.decided_at = "2026-09-08T12:20:00.000Z";

  const buildPlan = (input) =>
    reviewPlan(
      projectId,
      candidate,
      input.decision,
      {
        proposed_at: "2026-09-08T12:19:00.000Z",
        decided_at: input.decided_at,
        applied_at: input.decided_at,
      },
      input.rationale,
    );
  const plan = buildPlan({
    decision: "accepted",
    rationale: response.rationale,
    decided_at: response.decided_at,
    actor: actorRef(humanActor()),
    capability_grant_id: capabilityGrantId,
  });

  const interactions = new InMemoryInteractionRecordRegistry();
  const feature = readAccepted("interaction-feature-manifest");
  feature.compiled_by = actorRef(serviceActor());
  feature.compiled_at = "2026-09-08T12:18:00.000Z";
  feature.content_hash = hashRecord(feature.content);
  interactions.registerFeatureManifest(feature);

  const interactionRun = readAccepted("interaction-run");
  interactionRun.interaction_run_id = derivePetraId(
    "interaction_run",
    projectId + ":m1.9-cumulative-review",
  );
  interactionRun.project_id = projectId;
  interactionRun.feature_manifest_ref = {
    interaction_feature_manifest_id: feature.interaction_feature_manifest_id,
    revision: feature.revision,
    content_hash: feature.content_hash,
  };
  interactionRun.content.correlation.protocol_thread_id =
    "thread-m19-cumulative";
  interactionRun.content.correlation.protocol_run_id =
    "run-m19-cumulative-review";
  interactionRun.content.authority_context.actor = actorRef(humanActor());
  interactionRun.content.authority_context.capability_grant_id =
    capabilityGrantId;
  interactionRun.content_hash = hashRecord(interactionRun.content);
  interactionRun.created_by = actorRef(humanActor());
  interactionRun.created_at = "2026-09-08T12:18:01.000Z";
  interactionRun.updated_at = interactionRun.created_at;
  interactions.registerRun(interactionRun);

  const event = readAccepted("interaction-event-record");
  event.interaction_event_record_id = derivePetraId(
    "interaction_event_record",
    interactionRun.interaction_run_id + ":1",
  );
  event.project_id = projectId;
  event.interaction_run_ref = {
    interaction_run_id: interactionRun.interaction_run_id,
    revision: interactionRun.revision,
    content_hash: interactionRun.content_hash,
  };
  event.content.protocol.protocol_event_id =
    "event-m19-cumulative-review-interrupt";
  event.content_hash = hashRecord(event.content);
  event.recorded_by = actorRef(serviceActor());
  event.recorded_at = "2026-09-08T12:18:02.000Z";
  interactions.appendEvent(event);

  const pending = readAccepted("interaction-interrupt-pending");
  pending.interaction_interrupt_id = derivePetraId(
    "interaction_interrupt",
    interactionRun.interaction_run_id + ":review",
  );
  pending.project_id = projectId;
  pending.interaction_run_ref = structuredClone(event.interaction_run_ref);
  pending.content.request_event_ref = {
    interaction_event_record_id: event.interaction_event_record_id,
    sequence: event.sequence,
    content_hash: event.content_hash,
  };
  pending.content.subject_refs = [plan.change_set.change_set_id];
  pending.content.response_schema_ref = {
    schema_name: "review-interrupt-response",
    schema_version: "1.0.0",
    content_hash:
      "sha256:81a8a6771e1e7155681741b024f94862bf0e4c1cb7b8ff737b2fcf14f2a20306",
  };
  pending.content_hash = hashRecord(pending.content);
  pending.recorded_by = actorRef(serviceActor());
  pending.created_at = "2026-09-08T12:18:02.000Z";
  pending.updated_at = pending.created_at;
  interactions.registerInterrupt(pending);

  response.interaction_run_id = interactionRun.interaction_run_id;
  response.interrupt_ref = {
    interaction_interrupt_id: pending.interaction_interrupt_id,
    revision: pending.revision,
    content_hash: pending.content_hash,
  };
  response.change_set_ref = {
    change_set_id: plan.change_set.change_set_id,
    revision: plan.change_set.revision,
    content_hash: plan.change_set.content_hash,
  };

  const repository = {
    getRunRevision: (id, revision) => {
      const value = interactions.getRun(id, revision);
      return value === undefined ? undefined : structuredClone(value);
    },
    getInterrupt: (id) => {
      const value = interactions.getInterrupt(id);
      return value === undefined ? undefined : structuredClone(value);
    },
    getInterruptRevision: (id, revision) => {
      const value = interactions.getInterruptRevision(id, revision);
      return value === undefined ? undefined : structuredClone(value);
    },
    registerInterrupt: (value) =>
      structuredClone(interactions.registerInterrupt(value)),
  };
  const coordinator = new DurableReviewInterruptCoordinator({
    repository,
    executor: changes,
    payloads: {
      recordResponse: (value) => {
        const bytes = Buffer.from(canonicalize(value));
        return {
          artifact_id: derivePetraId("artifact", hashBytes(bytes)),
          content_sha256: hashBytes(bytes),
          byte_size: bytes.byteLength,
          media_type: "application/json",
        };
      },
    },
    authorizer: { authorize: () => true },
    serviceActor: actorRef(serviceActor()),
  });
  coordinator.registerBinding({
    presentation: {
      protocol_run_id: "run-m19-cumulative-review",
      project_id: projectId,
      interaction_run_id: interactionRun.interaction_run_id,
      interrupt_ref: structuredClone(response.interrupt_ref),
      change_set_ref: structuredClone(response.change_set_ref),
    },
    authority_context: {
      actor: actorRef(humanActor()),
      capability_grant_id: capabilityGrantId,
    },
    buildPlan,
  });
  return {
    coordinator,
    interactions,
    response,
    plan,
    runtime: new PetraInteractionRuntime({ reviewBoundary: coordinator }),
  };
};

const interactionInput = (runId, mode = "success", afterSequence = 0) => ({
  threadId: "thread_" + runId,
  runId,
  state: {},
  messages: [
    {
      id: "user_" + runId,
      role: "user",
      content: "Inspect the bounded project evidence path.",
    },
  ],
  tools: [],
  context: [],
  forwardedProps: {
    petra: {
      workflow: "fixture",
      fixtureMode: mode,
      afterSequence,
    },
  },
});

const rawRun = (server, runId, options = {}) =>
  fetch(server.url + "/api/interactions/run", {
    method: "POST",
    headers: {
      accept: "text/event-stream",
      authorization: "Bearer " + token,
      "content-type": "application/json",
      "x-petra-trace-id": "trace_" + runId,
    },
    body: JSON.stringify(
      interactionInput(
        runId,
        options.mode ?? "success",
        options.afterSequence ?? 0,
      ),
    ),
  });

const decodeSse = (wire) =>
  wire
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));

const workerArguments = [
  "run",
  "--project",
  "workers/science",
  "petra-document-worker",
  "--contracts-root",
  contractsRoot,
  "--input-root",
  fixtureRoot,
  "--manifest",
  "records/worker-input-manifest.json",
  "--bindings",
  "records/worker-input-bindings.json",
  "--models",
  modelsRoot,
  "--output-root",
  workerOutput,
  "--attempt",
  "1",
];

const logStep = (number, label) => {
  process.stdout.write(
    "[M1.9-DEMO-" + String(number).padStart(2, "0") + "] " + label + "\n",
  );
};

let failure;
let currentStep = "initialization";
let pool;
let s3;
let neo4jDriver;
let interactionServer;
let resultManifest;
try {
  assert(
    process.versions.node === "24.20.0",
    "The cumulative gate requires Node 24.20.0; received " +
      process.versions.node +
      ".",
  );
  currentStep = "setup: clean build and model verification";
  process.stdout.write(
    "[M1.9-SETUP] clean build and pinned model verification\n",
  );
  await requireRun("npm", ["run", "build:packages"]);
  await requireRun(process.execPath, [
    "scripts/prepare-docling-models.mjs",
    "--check",
  ]);

  currentStep = "setup: disposable service startup and migration";
  process.stdout.write(
    "[M1.9-SETUP] start one disposable PostgreSQL, S3, and Neo4j stack\n",
  );
  await requireRun(
    "docker",
    composeArgs(
      "up",
      "--detach",
      "--wait",
      "postgres-source",
      "artifacts-source",
      "neo4j-restored",
    ),
  );
  await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "migrate"),
  );
  const [postgresPort, s3Port, neo4jPort] = await Promise.all([
    servicePort("postgres-source", "5432"),
    servicePort("artifacts-source", "8333"),
    servicePort("neo4j-restored", "7687"),
  ]);
  pool = new Pool({
    connectionString:
      "postgresql://petra:" +
      postgresPassword +
      "@127.0.0.1:" +
      postgresPort +
      "/petra",
  });
  s3 = new S3Client({
    region: "us-east-1",
    endpoint: "http://127.0.0.1:" + s3Port,
    forcePathStyle: true,
    credentials: {
      accessKeyId: "petra-recovery-access",
      secretAccessKey: "petra-recovery-secret",
    },
  });
  await createBucket(s3);
  const artifactStore = new S3ArtifactStore({
    client: s3,
    bucket,
    storeName: "petra-m19-cumulative",
    namespace: "petra-m19-cumulative",
    now: () => new Date("2026-09-08T12:02:00.000Z"),
    createStageId: (() => {
      let index = 0;
      return () => "m19-stage-" + ++index;
    })(),
  });

  currentStep = "Docling worker: offline full-text parse";
  await requireRun("uv", workerArguments, {
    env: {
      HF_HUB_OFFLINE: "1",
      PYTHONHASHSEED: "0",
      TRANSFORMERS_OFFLINE: "1",
      UV_CACHE_DIR: ".cache/uv",
    },
  });
  await requireRun(process.execPath, [
    "scripts/verify-document-worker-output.mjs",
    "fixtures/full-text/fair-guiding-principles",
    workerOutput,
  ]);
  const parseBundle = readJson(
    resolve(workerOutput, "document-parse-bundle.json"),
  );
  const workerManifest = readJson(
    resolve(workerOutput, "worker-output-manifest.json"),
  );
  assert(
    parseBundle.document.quality_state === "partial" &&
      parseBundle.blocks.length === 116 &&
      parseBundle.spans.length === 116,
    "The known FAIR parse did not retain its 116-block partial-quality boundary.",
  );
  assert(
    workerManifest.content.network_activity.length === 0 &&
      workerManifest.content.resource_usage.network_bytes === 0,
    "The parser attempted network access.",
  );

  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    artifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidenceAuthority = new PostgresEvidenceAuthorityRepository(pool);
  const changes = new PostgresChangeControlAuthorityRepository(
    pool,
    { authorize: () => true },
    domainFactory(),
  );
  const projectionAuthority = new PostgresGraphProjectionAuthorityRepository(
    pool,
  );

  currentStep = "M1.9-DEMO-01 project creation";
  logStep(1, "create the Project and canonical scholarly identity");
  const human = humanActor();
  const service = serviceActor();
  const model = modelActor();
  await scopes.registerActor(human);
  await scopes.registerActor(service);
  await scopes.registerActor(model);
  const workerInput = readFixtureRecord("worker-input-manifest");
  const project = readAccepted("project");
  project.project_id = workerInput.project_id;
  project.name = "FAIR Principles cumulative demonstration";
  project.description =
    "One clean-start M1.9 scientific workflow preserving exact provenance and authority.";
  project.created_by = actorRef(human);
  project.created_at = "2026-09-08T12:00:00.000Z";
  project.updated_at = project.created_at;
  await scopes.registerProjectRevision(project);
  const authors = readFixtureRecord("authors");
  const work = readFixtureRecord("work");
  const workVersion = readFixtureRecord("work-version");
  const externalIdentifiers = readFixtureRecord("external-identifiers");
  for (const author of authors) {
    await identities.registerAuthorRevision(author);
  }
  await identities.registerWorkRevision(work);
  await identities.registerWorkVersionRevision(workVersion);
  for (const identifier of externalIdentifiers) {
    await identities.registerExternalIdentifierRevision(identifier);
  }

  currentStep = "M1.9-DEMO-02 full-text acquisition";
  logStep(2, "register the acquired full-text fixture");
  const sourceBytes = readFileSync(
    resolve(fixtureRoot, "source/wilkinson-et-al-2016.pdf"),
  );
  const sourceStage = await artifactStore.stage({
    bytes: chunks(sourceBytes),
    declaredByteSize: sourceBytes.byteLength,
    declaredMediaType: "application/pdf",
    expectedContentHash: hashBytes(sourceBytes),
  });
  const sourceAvailable = await artifactStore.makeAvailable(sourceStage);
  const sourceArtifact = artifactInput(sourceAvailable);
  await artifacts.registerVerifiedAcquisition(sourceArtifact);

  currentStep = "M1.9-DEMO-03 artifact and rights verification";
  logStep(3, "verify the source Artifact hash and RightsDecision");
  const verifiedSource = await artifactStore.inspectByHash(
    sourceArtifact.artifact.content_hash,
    {
      byteSize: sourceArtifact.artifact.byte_size,
      mediaType: sourceArtifact.artifact.media_type,
    },
  );
  assert(
    verifiedSource?.objectKey === sourceAvailable.objectKey &&
      sourceArtifact.rightsDecision.decision_status === "verified" &&
      sourceArtifact.rightsDecision.permissions.parse === true,
    "The acquired source did not retain verified bytes and parse rights.",
  );

  currentStep = "M1.9-DEMO-04 pinned Docling parse";
  logStep(4, "record the pinned offline Docling parse and parser Artifact");
  const nativeOutput = workerManifest.content.outcome.produced_outputs.find(
    (output) => output.output_name === "docling_document",
  );
  assert(nativeOutput !== undefined, "The native Docling output is absent.");
  const parserBytes = readFileSync(
    resolve(workerOutput, nativeOutput.output_handle.slice("output:".length)),
  );
  const parserStage = await artifactStore.stage({
    bytes: chunks(parserBytes),
    declaredByteSize: parserBytes.byteLength,
    declaredMediaType: nativeOutput.media_type,
    expectedContentHash: nativeOutput.content_hash,
  });
  const parserAvailable = await artifactStore.makeAvailable(parserStage);
  const parserArtifact = parserArtifactInput(
    parseBundle,
    sourceArtifact,
    parserAvailable,
  );
  await artifacts.registerVerifiedAcquisition(parserArtifact);

  await documents.registerDocumentBundle({
    sourceArtifactManifestId: sourceArtifact.manifest.artifact_manifest_id,
    document: parseBundle.document,
    blocks: parseBundle.blocks,
    spans: parseBundle.spans,
  });

  currentStep = "M1.9-DEMO-05 SourceSpan inspection";
  logStep(5, "inspect the exact SourceSpan in structural context");
  const sourceTargets = readJson(resolve(fixtureRoot, "source-manifest.json"));
  const inspectionTarget = sourceTargets.source_span_targets.find(
    (target) => target.target_id === "broad-machine-actionability-claim",
  );
  const inspectedBlock = parseBundle.blocks.find(
    (block) =>
      inspectionTarget !== undefined &&
      block.content.content_kind === "text" &&
      block.content.text.includes(inspectionTarget.exact_text) &&
      block.page_locations.some(
        (location) => location.page_number === inspectionTarget.page_number,
      ),
  );
  const inspectedSourceSpan = parseBundle.spans.find(
    (span) =>
      inspectedBlock?.source_span_ids.includes(span.source_span_id) === true,
  );
  assert(
    inspectedSourceSpan !== undefined &&
      inspectionTarget !== undefined &&
      inspectedBlock?.structural_block_id ===
        inspectedSourceSpan.structural_block_id &&
      pageNumbers(inspectedSourceSpan).includes(inspectionTarget.page_number),
    "The target SourceSpan did not resolve to its surrounding structural block.",
  );

  currentStep = "M1.9-DEMO-06 deterministic Claim proposals";
  logStep(6, "ingest deterministic Claim proposals into quarantine");
  const proposal = buildProposal(parseBundle);
  const inMemoryEvidence = new InMemoryEvidenceRegistry({
    getSourceSpan: (id) =>
      parseBundle.spans.find((span) => span.source_span_id === id),
    getParsedDocument: (id) =>
      parseBundle.document.parsed_document_id === id
        ? parseBundle.document
        : undefined,
  });
  const admission = admitEvidenceProposalBundle(
    proposal,
    parseBundle,
    inMemoryEvidence,
  );
  currentStep = "M1.9-DEMO-07 rejection and review promotion";
  logStep(7, "reject the unsupported control and promote the supported pair");
  assert(
    admission.admitted_count === 2 && admission.rejected_count === 1,
    "Expected two admitted proposals and one rejected negative control.",
  );
  const negative = admission.candidates.find(
    (item) => item.outcome === "rejected",
  );
  assert(
    negative?.error_code === "SOURCE_SPAN_NOT_IN_BUNDLE",
    "The fabricated source span crossed the admission boundary.",
  );
  const admittedCandidates = proposal.content.candidates.filter((candidate) =>
    admission.candidates.some(
      (item) =>
        item.candidate_id === candidate.candidate_id &&
        item.outcome === "admitted",
    ),
  );
  assert(
    admittedCandidates.length === 2,
    "The admitted proposal identities could not be recovered.",
  );
  for (const candidate of admittedCandidates) {
    await evidenceAuthority.proposeClaim(candidate.claim);
    await evidenceAuthority.proposeAssertion(candidate.assertion);
  }
  const primary = admittedCandidates.find(
    (candidate) => candidate.proposal_role === "primary",
  );
  const qualification = admittedCandidates.find(
    (candidate) => candidate.proposal_role === "qualification",
  );
  assert(
    primary !== undefined && qualification !== undefined,
    "The primary or qualification proposal is absent.",
  );

  const primaryPlan = reviewPlan(
    project.project_id,
    primary,
    "accepted",
    {
      proposed_at: "2026-09-08T12:09:00.000Z",
      decided_at: "2026-09-08T12:09:30.000Z",
      applied_at: "2026-09-08T12:10:00.000Z",
    },
    "The representation matches the exact source passage.",
  );
  const promotion = await executeReviewDecisionPlan(changes, primaryPlan);
  assert(promotion.outcome === "applied", "Primary review was not applied.");
  const trustedClaim = await evidenceAuthority.getClaim(primary.claim.claim_id);
  const trustedAssertion = await evidenceAuthority.getAssertion(
    primary.assertion.assertion_id,
  );
  assert(
    trustedClaim?.revision === 2 &&
      trustedClaim.authority.zone === "trusted" &&
      trustedAssertion?.revision === 2 &&
      trustedAssertion.authority.zone === "trusted",
    "PostgreSQL did not retain the exact trusted revision-two pair.",
  );

  currentStep = "M1.9-DEMO-08 Neo4j projection";
  logStep(8, "trace the Neo4j edge back to PostgreSQL authority");
  const initialEvents = await changes.getDomainEvents({
    projectId: project.project_id,
  });
  const initialOutboxes = await changes.getOutboxRecords({
    projectId: project.project_id,
    target: "neo4j_graph",
  });
  const initialAppliedEvent = initialEvents.find(
    (event) => event.event.event_type === "change_set.applied",
  );
  assert(
    initialAppliedEvent !== undefined && initialOutboxes.length === 1,
    "The promotion did not create one applied event and one graph outbox; events=" +
      initialEvents.map((event) => event.event.event_type).join(",") +
      ", outboxes=" +
      initialOutboxes.length +
      ".",
  );
  neo4jDriver = neo4j.driver(
    "neo4j://127.0.0.1:" + neo4jPort,
    neo4j.auth.basic("neo4j", postgresPassword),
  );
  const graph = new Neo4jAuthorityGraphStore({ driver: neo4jDriver });
  await graph.prepare();
  let projectionRecordIndex = 0;
  let projectionClockIndex = 0;
  const projector = new ScientificGraphProjector({
    authority: projectionAuthority,
    source: new RepositoryAuthorityGraphProjectionSource({
      researchScope: scopes,
      scholarlyIdentity: identities,
      artifacts,
      documents,
      evidence: evidenceAuthority,
    }),
    graph,
    factory: {
      nextProjectionRecordId: () =>
        derivePetraId(
          "graph_projection_record",
          project.project_id + ":" + ++projectionRecordIndex,
        ),
      now: () =>
        "2026-09-08T12:30:" +
        String(++projectionClockIndex).padStart(2, "0") +
        ".000Z",
      serviceActor: actorRef(service),
    },
  });
  const initialOutbox = initialOutboxes[0];
  const checkpoint = checkpointFor(project.project_id, initialOutbox);
  await projectionAuthority.register(checkpoint);
  const firstProjection = await projector.project(
    checkpoint.projection_checkpoint_id,
    initialOutbox,
  );
  assert(
    firstProjection.record?.content.outcome.outcome_kind === "applied" &&
      firstProjection.checkpoint.content.freshness.state === "current",
    "The trusted pair did not reach a current Neo4j projection.",
  );
  const graphClaim = await graph.getObject(
    project.project_id,
    trustedClaim.claim_id,
  );
  const graphPath = await graph.getProvenancePath(
    project.project_id,
    trustedAssertion.assertion_id,
  );
  assert(
    graphClaim?.authoritativeRevision === trustedClaim.revision &&
      graphClaim.recordHash === hashRecord(trustedClaim) &&
      graphPath?.claim.id === trustedClaim.claim_id,
    "Neo4j did not retain the exact trusted PostgreSQL identity.",
  );

  currentStep = "M1.9-DEMO-09 graph-guided retrieval and packet";
  logStep(9, "ask a bounded question and inspect its EvidencePacket");
  const retrieval = new GraphGuidedRetrievalService(
    graph,
    new InMemoryScientificLexicalIndex([
      {
        projectId: project.project_id,
        objectId: trustedClaim.claim_id,
        objectKind: "Claim",
        authoritativeRevision: trustedClaim.revision,
        recordHash: hashRecord(trustedClaim),
        fields: {
          title: work.title,
          body: trustedClaim.canonical_text,
        },
      },
    ]),
  );
  const retrieved = await retrieval.retrieveHybrid({
    query: "machines find and use data automatically",
    scope: {
      projectId: project.project_id,
      objectKinds: ["Claim"],
    },
    limit: 5,
    graph: {
      direction: "either",
      predicates: ["ASSERTS", "GROUNDED_IN"],
      neighborsPerCandidate: 10,
    },
  });
  assert(
    retrieved.candidates.length === 1 &&
      retrieved.omissions.length === 0 &&
      retrieved.candidates[0].object.id === trustedClaim.claim_id,
    "Hybrid retrieval did not resolve the exact current graph object.",
  );
  const primarySpanId = primary.source_quote.source_span_ids[0];
  const primarySourceSpan = await documents.getSourceSpan(primarySpanId);
  assert(
    primarySourceSpan !== undefined &&
      pageNumbers(primarySourceSpan).includes(1),
    "The retrieved Claim lost its exact page-one SourceSpan.",
  );

  const packets = compilePackets({
    projectId: project.project_id,
    appliedEvent: initialAppliedEvent,
    claim: trustedClaim,
    assertion: trustedAssertion,
    sourceSpan: primarySourceSpan,
    rightsDecision: sourceArtifact.rightsDecision,
  });
  currentStep = "M1.9-DEMO-10 grounded composition and exports";
  logStep(10, "generate grounded prose, citations, BibTeX, and LaTeX");
  const composition = buildComposition({
    projectId: project.project_id,
    context: packets.context,
    evidence: packets.evidence,
    packets: packets.registry,
    scholarlyRecords: {
      authors,
      works: [work],
      workVersions: [workVersion],
      externalIdentifiers,
    },
  });
  assert(
    composition.compiled.citationBundle.content.citations.some(
      (citation) =>
        citation.work_version_ref.work_version_id ===
        workVersion.work_version_id,
    ) && composition.rendered.length === 3,
    "The deterministic composition did not retain its canonical citation exports.",
  );

  currentStep = "M1.9-DEMO-11 compensating reversal";
  logStep(11, "reverse the trusted Assertion without deleting history");
  const reversalPlan = buildCompensatingReversalCommandPlan({
    project_id: project.project_id,
    claim: trustedClaim,
    assertion: trustedAssertion,
    compensates_change_set_id: primaryPlan.change_set.change_set_id,
    proposed_by: actorRef(human),
    reviewer: actorRef(human),
    capability_grant_id: capabilityGrantId,
    reason: "Demonstrate additive reversal and stale-output propagation.",
    rationale:
      "The cumulative gate intentionally retracts this pair to verify recovery semantics.",
    impact_summary:
      "The grounded response and graph projection depend on this pair.",
    downstream_object_ids: [
      composition.groundedResponse.grounded_response_id,
      composition.compiled.draft.draft_artifact_id,
    ],
    timing: {
      proposed_at: "2026-09-08T12:14:00.000Z",
      decided_at: "2026-09-08T12:14:30.000Z",
      applied_at: "2026-09-08T12:15:00.000Z",
    },
  });
  const reversal = await executeCompensatingReversalPlan(changes, reversalPlan);
  assert(reversal.outcome === "reverted", "The reversal was not applied.");
  const allEvents = await changes.getDomainEvents({
    projectId: project.project_id,
  });
  const allOutboxes = await changes.getOutboxRecords({
    projectId: project.project_id,
    target: "neo4j_graph",
  });
  const reversedEvent = allEvents.find(
    (event) => event.event.event_type === "change_set.reverted",
  );
  assert(
    reversedEvent !== undefined && allOutboxes.length === 2,
    "The reversal did not append one reverted event and one additional outbox.",
  );
  currentStep = "M1.9-DEMO-12 projection catch-up and invalidation";
  logStep(12, "observe graph catch-up and dependent-output invalidation");
  const invalidatedResponse = deriveGroundedResponseInvalidation(
    composition.groundedResponse,
    reversedEvent,
  );
  assert(
    invalidatedResponse?.revision === 2 &&
      invalidatedResponse.content.cache.state === "invalidated" &&
      invalidatedResponse.content.cache.affected_dependency_ids.includes(
        trustedClaim.claim_id,
      ),
    "The dependent GroundedResponse did not become explicitly invalidated.",
  );
  const observed = await projectionAuthority.observeHead(
    checkpoint.projection_checkpoint_id,
    allOutboxes[1],
    firstProjection.checkpoint.revision,
    "2026-09-08T12:15:01.000Z",
  );
  const secondProjection = await projector.project(
    checkpoint.projection_checkpoint_id,
    allOutboxes[1],
  );
  assert(
    observed.content.freshness.state === "catching_up" &&
      secondProjection.record?.content.outcome.outcome_kind === "applied" &&
      secondProjection.checkpoint.content.freshness.state === "current",
    "The reversal graph projection did not catch up through the PostgreSQL checkpoint.",
  );
  const retractedGraphAssertion = await graph.getObject(
    project.project_id,
    trustedAssertion.assertion_id,
  );
  assert(
    retractedGraphAssertion === undefined,
    "The reversed ASSERTS edge remains active in Neo4j.",
  );

  currentStep = "M1.9-DEMO-13 authoritative replay and graph rebuild";
  logStep(13, "replay PostgreSQL history and rebuild Neo4j from outboxes");
  const replayedAuthority = replayScientificAuthority(
    project.project_id,
    allEvents,
  );
  const replayedClaim = replayedAuthority.claims.find(
    (claim) => claim.claim_id === trustedClaim.claim_id,
  );
  const replayedAssertion = replayedAuthority.assertions.find(
    (assertion) => assertion.assertion_id === trustedAssertion.assertion_id,
  );
  const [claimRevisionOne, claimRevisionTwo, claimRevisionThree] =
    await Promise.all([
      evidenceAuthority.getClaim(trustedClaim.claim_id, 1),
      evidenceAuthority.getClaim(trustedClaim.claim_id, 2),
      evidenceAuthority.getClaim(trustedClaim.claim_id, 3),
    ]);
  const rebuiltReceipts = await projector.rebuild(
    project.project_id,
    projection,
    allOutboxes,
  );
  const rebuiltAssertion = await graph.getObject(
    project.project_id,
    trustedAssertion.assertion_id,
  );
  currentStep = "M1.9-DEMO-14 recovered identities and history";
  logStep(14, "recover the same active IDs and retained historical trace");
  assert(
    replayedClaim?.revision === 3 &&
      replayedClaim.authority.zone === "quarantine" &&
      replayedAssertion?.revision === 3 &&
      replayedAssertion.authority.zone === "quarantine" &&
      claimRevisionOne?.revision === 1 &&
      claimRevisionTwo?.revision === 2 &&
      claimRevisionThree?.revision === 3 &&
      rebuiltReceipts.length === 2 &&
      rebuiltAssertion === undefined,
    "Replay or graph rebuild did not preserve the additive reversal history.",
  );

  currentStep = "M1.9-DEMO-15 interaction recovery and review";
  logStep(
    15,
    "reconnect, resolve review, and distinguish abort from cancellation",
  );
  const reviewFixture = createInteractionFixture({
    projectId: project.project_id,
    candidate: qualification,
    changes,
  });
  const { startPetraServer } = await import("../apps/server/dist/server.js");
  interactionServer = await startPetraServer({
    port: 0,
    authToken: token,
    runtime: reviewFixture.runtime,
    reviewAuthority: {
      actor: actorRef(human),
      capability_grant_id: capabilityGrantId,
    },
  });
  const interactionClient = new PetraInteractionClient({
    endpoint: interactionServer.url + "/api/interactions/run",
    token,
    traceId: "trace-m19-cumulative-review",
  });
  const reviewInteraction = await interactionClient.run({
    threadId: "thread-m19-cumulative",
    runId: "run-m19-cumulative-review",
    prompt: "Review the exact source-grounded qualification.",
    fixtureMode: "review",
  });
  assert(
    reviewInteraction.pendingInterrupts.length === 1 &&
      reviewInteraction.pendingInterrupts[0].id ===
        reviewFixture.response.interrupt_ref.interaction_interrupt_id,
    "The AG-UI stream did not expose the exact durable review interrupt.",
  );
  const replayResponse = await fetch(
    interactionServer.url +
      "/api/interactions/run-m19-cumulative-review?after=3",
    {
      headers: {
        accept: "text/event-stream",
        authorization: "Bearer " + token,
        "x-petra-trace-id": "trace-m19-cumulative-reconnect",
      },
    },
  );
  const replayEvents = decodeSse(await replayResponse.text());
  assert(
    replayResponse.ok &&
      replayEvents.length > 0 &&
      replayEvents.length < reviewInteraction.events.length,
    "AG-UI reconnect did not replay the bounded suffix.",
  );
  const firstResolution = await interactionClient.resolveReview(
    reviewFixture.response,
  );
  const replayResolution = await interactionClient.resolveReview(
    reviewFixture.response,
  );
  const trustedQualification = await evidenceAuthority.getClaim(
    qualification.claim.claim_id,
  );
  const currentInterrupt = reviewFixture.interactions.getInterrupt(
    reviewFixture.response.interrupt_ref.interaction_interrupt_id,
  );
  assert(
    firstResolution.replayed === false &&
      firstResolution.response_recorded === true &&
      firstResolution.result.outcome === "applied" &&
      replayResolution.replayed === true &&
      replayResolution.response_recorded === false &&
      trustedQualification?.revision === 2 &&
      trustedQualification.authority.zone === "trusted" &&
      currentInterrupt?.revision === 2 &&
      currentInterrupt.content.state === "responded",
    "Durable review resolution or idempotent replay failed.",
  );
  const finalOutboxes = await changes.getOutboxRecords({
    projectId: project.project_id,
    target: "neo4j_graph",
  });
  assert(
    finalOutboxes.length === 3,
    "The AG-UI review did not produce exactly one authoritative outbox.",
  );
  const observedQualification = await projectionAuthority.observeHead(
    checkpoint.projection_checkpoint_id,
    finalOutboxes[2],
    secondProjection.checkpoint.revision,
    "2026-09-08T12:20:01.000Z",
  );
  const qualificationProjection = await projector.project(
    checkpoint.projection_checkpoint_id,
    finalOutboxes[2],
  );
  const qualificationPath = await graph.getProvenancePath(
    project.project_id,
    qualification.assertion.assertion_id,
  );
  assert(
    observedQualification.content.freshness.state === "catching_up" &&
      qualificationProjection.checkpoint.content.freshness.state ===
        "current" &&
      qualificationPath?.claim.id === qualification.claim.claim_id,
    "The AG-UI-approved qualification did not reach the current graph.",
  );

  await interactionServer.shutdown();
  interactionServer = undefined;

  currentStep = "M1.9-DEMO-15 delivery abort and explicit cancellation";
  const deliveryRuntime = new PetraInteractionRuntime({ stepDelayMs: 75 });
  interactionServer = await startPetraServer({
    port: 0,
    authToken: token,
    runtime: deliveryRuntime,
  });
  const abortResponse = await rawRun(
    interactionServer,
    "run-m19-cumulative-abort",
  );
  const abortReader = abortResponse.body?.getReader();
  assert(abortReader !== undefined, "The abort stream has no reader.");
  await abortReader.read();
  await abortReader.cancel();
  await deliveryRuntime.drain();
  const abortSnapshot = deliveryRuntime.snapshot("run-m19-cumulative-abort");
  assert(
    abortSnapshot.status === "completed" &&
      abortSnapshot.delivery.aborted === 1,
    "Connection abort incorrectly cancelled durable work.",
  );

  const cancellationResponse = await rawRun(
    interactionServer,
    "run-m19-cumulative-cancel",
  );
  const cancellationCommandId = derivePetraId(
    "command",
    project.project_id + ":explicit-cancellation",
  );
  const cancellation = await fetch(
    interactionServer.url + "/api/work-units/run-m19-cumulative-cancel/cancel",
    {
      method: "POST",
      headers: {
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify({ commandId: cancellationCommandId }),
    },
  );
  const cancellationResult = await cancellation.json();
  const cancellationEvents = decodeSse(await cancellationResponse.text());
  await deliveryRuntime.drain();
  const cancellationSnapshot = deliveryRuntime.snapshot(
    "run-m19-cumulative-cancel",
  );
  assert(
    cancellation.ok &&
      cancellationResult.applied === true &&
      cancellationEvents.at(-1)?.type === "RUN_ERROR" &&
      cancellationEvents.at(-1)?.code === "WORK_UNIT_CANCELLED" &&
      cancellationSnapshot.status === "cancelled",
    "Explicit cancellation did not terminate the run exactly once.",
  );

  const finalEvents = await changes.getDomainEvents({
    projectId: project.project_id,
  });
  resultManifest = {
    schema_name: "petra.m1-cumulative-demonstration-result",
    schema_version: "1.0.0",
    milestone: "M1.9-W03",
    status: "pass",
    runtime: {
      node: process.versions.node,
      parser: {
        adapter: structuredClone(parseBundle.document.adapter),
        engine: structuredClone(parseBundle.document.parser_provenance.parser),
        configuration_hash:
          parseBundle.document.parser_provenance.configuration_hash,
        component_models: structuredClone(
          parseBundle.document.parser_provenance.component_models,
        ),
        network_activity_count: workerManifest.content.network_activity.length,
      },
      services: {
        postgresql: "18.6",
        s3_compatible: "SeaweedFS 4.41",
        neo4j: "2026.07.1",
      },
    },
    clean_start: true,
    demonstrations: Array.from({ length: 15 }, (_, index) => ({
      id: "M1.9-DEMO-" + String(index + 1).padStart(2, "0"),
      status: "pass",
    })),
    identity_chain: {
      project_id: project.project_id,
      work_id: work.work_id,
      work_version_id: workVersion.work_version_id,
      source_artifact_id: sourceArtifact.artifact.artifact_id,
      source_artifact_hash: sourceArtifact.artifact.content_hash,
      parser_artifact_id: parserArtifact.artifact.artifact_id,
      parsed_document_id: parseBundle.document.parsed_document_id,
      parsed_blocks: parseBundle.blocks.length,
      source_spans: parseBundle.spans.length,
      primary_claim_id: primary.claim.claim_id,
      primary_assertion_id: primary.assertion.assertion_id,
      qualification_claim_id: qualification.claim.claim_id,
      context_packet_id: packets.context.context_packet_id,
      evidence_packet_id: packets.evidence.evidence_packet_id,
      grounded_response_id: composition.groundedResponse.grounded_response_id,
      draft_artifact_id: composition.compiled.draft.draft_artifact_id,
    },
    evidence_admission: {
      admitted: admission.admitted_count,
      rejected: admission.rejected_count,
      negative_control_error: negative.error_code,
      remote_model_calls: 0,
    },
    authority_history: {
      domain_events: finalEvents.length,
      event_types: finalEvents.map((event) => event.event.event_type),
      graph_outboxes: finalOutboxes.length,
      primary_revisions_retained: [1, 2, 3],
      primary_current_zone: claimRevisionThree.authority.zone,
      qualification_current_zone: trustedQualification.authority.zone,
      replay_through_stream_revision: replayedAuthority.throughStreamRevision,
      rebuilt_graph_receipts: rebuiltReceipts.length,
      final_projection_state:
        qualificationProjection.checkpoint.content.freshness.state,
    },
    composition: {
      selected_evidence_count:
        packets.evidence.content.selected_evidence.length,
      material_draft_spans: composition.compiled.spans.length,
      citation_count:
        composition.compiled.citationBundle.content.citations.length,
      rendered_formats: composition.rendered.map((rendered) => rendered.format),
      invalidated_revision: invalidatedResponse.revision,
    },
    interaction: {
      review_interrupt_id:
        reviewFixture.response.interrupt_ref.interaction_interrupt_id,
      reconnect_event_count: replayEvents.length,
      first_resolution_replayed: firstResolution.replayed,
      duplicate_resolution_replayed: replayResolution.replayed,
      aborted_delivery_count: abortSnapshot.delivery.aborted,
      aborted_run_status: abortSnapshot.status,
      explicit_cancellation_status: cancellationSnapshot.status,
    },
    authority_boundary: {
      postgresql_is_scientific_authority: true,
      s3_is_artifact_byte_authority: true,
      neo4j_is_rebuildable_projection: true,
      interaction_state_is_not_scientific_authority: true,
      deterministic_composition_is_not_model_quality_evidence: true,
    },
    design_freeze: {
      baseline_commit: "655d094",
      frontend_completion_claimed: false,
      remaining_work_item: "M1.9-W04",
    },
    completed_at: "2026-09-08T12:31:00.000Z",
  };
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  failure = new Error(currentStep + " failed: " + message, {
    cause: error,
  });
  const logs = await run(
    "docker",
    composeArgs("logs", "--no-color", "--tail", "120"),
  );
  if (logs.stdout.length > 0) process.stderr.write(logs.stdout);
  if (logs.stderr.length > 0) process.stderr.write(logs.stderr);
} finally {
  if (interactionServer !== undefined) {
    try {
      await interactionServer.shutdown();
    } catch (error) {
      if (failure === undefined) {
        failure = new Error(
          "Interaction server cleanup failed: " +
            (error instanceof Error ? error.message : String(error)),
          { cause: error },
        );
      }
    }
  }
  const cleanupResults = await Promise.allSettled([
    pool?.end(),
    neo4jDriver?.close(),
    s3?.destroy(),
  ]);
  const rejectedCleanup = cleanupResults.find(
    (result) => result.status === "rejected",
  );
  if (rejectedCleanup !== undefined && failure === undefined) {
    failure = new Error(
      "Client cleanup failed: " + String(rejectedCleanup.reason),
    );
  }
  const composeCleanup = await run(
    "docker",
    composeArgs("down", "--volumes", "--remove-orphans"),
  );
  if (composeCleanup.code !== 0 && failure === undefined) {
    failure = new Error(
      "Docker cleanup failed: " +
        (composeCleanup.stderr || composeCleanup.stdout.toString("utf8")),
    );
  }
  const remainingResources = await resourceCount();
  if (remainingResources !== 0 && failure === undefined) {
    failure = new Error(
      "Disposable cleanup left " +
        remainingResources +
        " labeled Docker resources.",
    );
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
}

if (failure !== undefined) throw failure;
assert(resultManifest !== undefined, "The pass manifest was not produced.");
mkdirSync(resolve(root, ".data/m1.9"), { recursive: true });
writeFileSync(outputPath, JSON.stringify(resultManifest, null, 2) + "\n");
process.stdout.write(JSON.stringify(resultManifest, null, 2) + "\n");
