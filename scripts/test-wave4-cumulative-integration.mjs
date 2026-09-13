import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ProjectBriefClient,
  ProjectWorkingStateClient,
  ReviewSessionApplyClient,
} from "@petra/adapters";
import { PetraContractRegistry } from "@petra/contracts/validator";
import {
  RepositoryAuthorityGraphProjectionSource,
  ScientificGraphProjector,
  derivePetraId,
} from "@petra/core";
import { Neo4jAuthorityGraphStore } from "@petra/neo4j";
import {
  PostgresArtifactAuthorityRepository,
  PostgresCapabilityGrantAuthorityRepository,
  PostgresCapabilityGrantCommandAuthorizer,
  PostgresChangeControlAuthorityRepository,
  PostgresDocumentAuthorityRepository,
  PostgresEvidenceAuthorityRepository,
  PostgresGraphProjectionAuthorityRepository,
  PostgresProjectDefinitionAuthorityRepository,
  PostgresProjectSourceAuthorityRepository,
  PostgresResearchScopeRepository,
  PostgresReviewSessionAuthorityRepository,
  PostgresScholarlyIdentityRepository,
  PostgresWorkingStateAuthorityRepository,
  PostgresWorkUnitAuthorityRepository,
} from "@petra/postgres";
import {
  createProjectShellPersistenceFromEnvironment,
  startPetraServer,
} from "@petra/server";
import { canonicalize } from "json-canonicalize";
import neo4j from "neo4j-driver";
import pg from "pg";
import { createServer as createViteServer } from "vite";

const { Pool } = pg;
const root = resolve(import.meta.dirname, "..");
const composeFile = resolve(root, "infra/recovery/integration.compose.yaml");
const projectName = `petra-wave4-cumulative-${process.pid}-${Date.now()}`;
const token = "petra-local-development";
const postgresPassword = "petra-recovery-only";
const humanActorId = "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV";
const serviceActorId = "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE";
const graphActorId = "actor_01ARZ3NDEKTSV4RRFFQ69G5FBH";
const scientificProjectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const writingProjectId = "project_01K4E000000000000000000001";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readAccepted = (name) =>
  readJson(
    resolve(root, "packages/contracts/fixtures/accepted", `${name}.json`),
  );
const hash = (value) =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const workingHash = (record) => {
  const material = structuredClone(record);
  delete material.content_hash;
  return hash(material);
};
const exactRef = (record, idKey) => ({
  schema_name: record.schema_name,
  schema_version: record.schema_version,
  record_id: record[idKey],
  revision: record.revision,
  record_hash: hash(record),
});
const clone = (value) => structuredClone(value);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const progress = (message) =>
  process.stderr.write(`[wave4-cumulative] ${message}\n`);

const availableArtifactStore = {
  inspectByHash: (contentHash, expected) => {
    if (expected === undefined)
      throw new Error("Artifact admission requires one exact identity.");
    const hex = contentHash.slice("sha256:".length);
    return Promise.resolve({
      storeName: "petra-local",
      objectKey: `sha256/${hex.slice(0, 2)}/${hex.slice(2)}`,
      contentHash,
      byteSize: expected.byteSize,
      mediaType: expected.mediaType,
      availableAt: "2026-08-28T18:10:00.000Z",
      verification: {
        status: "verified",
        declaredMediaType: expected.mediaType,
        observedMediaType: expected.mediaType,
        method: "test-fixture",
        problems: [],
      },
    });
  },
};

const sourceArtifactInput = () => {
  const artifact = readAccepted("artifact");
  const manifest = readAccepted("artifact-manifest");
  const rightsDecision = readAccepted("rights-decision");
  artifact.created_by.actor_kind = "human";
  manifest.recorded_by.actor_kind = "human";
  rightsDecision.decision_maker.actor_kind = "human";
  return { artifact, manifest, rightsDecision };
};

const parserArtifactInput = (source) => {
  const parserBytes = new TextEncoder().encode('{"parser":"output"}');
  const parserHash = `sha256:${createHash("sha256").update(parserBytes).digest("hex")}`;
  const artifact = clone(source.artifact);
  artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB8";
  artifact.artifact_kind = "structured_text";
  artifact.media_type = "application/json";
  artifact.content_hash = parserHash;
  artifact.byte_size = parserBytes.byteLength;
  artifact.created_at = "2026-09-13T12:00:01.000Z";
  const manifest = clone(source.manifest);
  manifest.artifact_manifest_id =
    "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB9";
  manifest.artifact_id = artifact.artifact_id;
  manifest.rights_decision_id = "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FBA";
  manifest.origin = {
    origin_kind: "generated",
    generator_name: "petra-wave4-cumulative-parser",
    generator_version: "1.0.0",
    generated_at: "2026-09-13T12:00:01.000Z",
    input_artifact_ids: [source.artifact.artifact_id],
  };
  manifest.storage_ref.object_key = `sha256/${parserHash.slice(7, 9)}/${parserHash.slice(9)}`;
  manifest.storage_ref.content_hash = parserHash;
  manifest.storage_ref.verified_at = "2026-09-13T12:00:01.000Z";
  manifest.integrity.checked_at = "2026-09-13T12:00:01.000Z";
  manifest.recorded_at = "2026-09-13T12:00:01.000Z";
  const rightsDecision = clone(source.rightsDecision);
  rightsDecision.rights_decision_id = manifest.rights_decision_id;
  rightsDecision.artifact_manifest_id = manifest.artifact_manifest_id;
  rightsDecision.source_location = "urn:petra:wave4-cumulative:parser-output";
  rightsDecision.observed_license = {
    statement: "Generated parser output retained under source-copy terms.",
    source: "artifact",
  };
  rightsDecision.access_basis = "permission";
  rightsDecision.authorization_reference = "petra-wave4-cumulative/1.0.0";
  rightsDecision.observed_at = "2026-09-13T12:00:01.000Z";
  rightsDecision.created_at = "2026-09-13T12:00:01.000Z";
  return { artifact, manifest, rightsDecision };
};

const documentBundle = (sourceManifestId) => {
  const document = readAccepted("parsed-document");
  const block = readAccepted("structural-block");
  const span = readAccepted("source-span");
  document.created_by.actor_kind = "human";
  span.created_by.actor_kind = "human";
  return {
    sourceArtifactManifestId: sourceManifestId,
    document,
    blocks: [block],
    spans: [span],
  };
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
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) =>
      finish({ code: 1, stdout, stderr: error.message }),
    );
    child.on("close", (code, signal) =>
      finish({ code: code ?? 1, signal, stdout, stderr }),
    );
  });

const requireRun = async (program, args, options) => {
  const result = await run(program, args, options);
  if (result.code !== 0)
    throw new Error(
      `${program} ${args.join(" ")} failed (${result.code}):\n${result.stderr || result.stdout}`,
    );
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
  const port = /:(\d+)\s*$/u.exec(result.stdout)?.[1];
  if (port === undefined)
    throw new Error(`Could not resolve ${service}:${containerPort}.`);
  return port;
};

const resourceCount = async () => {
  const filter = `label=com.docker.compose.project=${projectName}`;
  const results = await Promise.all([
    run("docker", ["ps", "--all", "--quiet", "--filter", filter]),
    run("docker", ["network", "ls", "--quiet", "--filter", filter]),
    run("docker", ["volume", "ls", "--quiet", "--filter", filter]),
  ]);
  return results.reduce(
    (count, result) =>
      count + result.stdout.split("\n").filter((line) => line !== "").length,
    0,
  );
};

const actor = (actorId, actorKind, displayName) => ({
  ...readAccepted("actor"),
  actor_id: actorId,
  actor_kind: actorKind,
  display_name: displayName,
  created_at: "2026-09-13T12:00:00.000Z",
});

const authorityPosition = async (pool, projectId) => {
  const result = await pool.query(
    `SELECT authority.event_position::integer,
            COALESCE(stream.current_stream_revision, 0)::integer
              AS stream_revision
       FROM petra.authority_positions AS authority
       LEFT JOIN petra.project_event_stream_heads AS stream
         ON stream.project_id = $1
      WHERE authority.singleton`,
    [projectId],
  );
  assert(result.rows[0] !== undefined, "Authority position is unavailable.");
  return result.rows[0];
};

const makeChangeCommands = ({ label, claim, assertion, decision, grant }) => {
  const correlationId = derivePetraId("trace", `${label}:correlation`);
  const changeSetId = derivePetraId("change_set", label);
  const submit = readAccepted("command-submit-change-set");
  submit.command_id = derivePetraId("command", `${label}:submit`);
  submit.idempotency_key = `wave4:${label}:submit:v1`;
  submit.actor = { actor_id: humanActorId, actor_kind: "human" };
  submit.capability_grant_id = grant.capability_grant_id;
  submit.correlation_id = correlationId;
  submit.submitted_at = "2026-09-13T12:10:00.000Z";
  submit.command.change_set.change_set_id = changeSetId;
  submit.command.change_set.content.proposed_by = clone(submit.actor);
  submit.command.change_set.content.reason = `Retain the exact ${label} Claim and ASSERTS relationship as one atomic pair.`;
  submit.command.change_set.content.operations[0].target_id = claim.claim_id;
  submit.command.change_set.content.operations[1].target_id =
    assertion.assertion_id;
  submit.command.change_set.content.impact.affected_object_ids = [
    claim.claim_id,
    assertion.assertion_id,
  ];
  submit.command.change_set.content.impact.generated_at = submit.submitted_at;
  submit.command.change_set.content_hash = hash(
    submit.command.change_set.content,
  );
  submit.command.change_set.proposed_at = submit.submitted_at;

  const approval = readAccepted("command-record-approval");
  approval.command_id = derivePetraId("command", `${label}:approval`);
  approval.idempotency_key = `wave4:${label}:approval:v1`;
  approval.actor = clone(submit.actor);
  approval.capability_grant_id = grant.capability_grant_id;
  approval.correlation_id = correlationId;
  approval.causation_id = submit.command_id;
  approval.submitted_at = "2026-09-13T12:10:01.000Z";
  approval.command.approval.approval_id = derivePetraId("approval", label);
  approval.command.approval.subject.change_set_id = changeSetId;
  approval.command.approval.subject.change_set_content_hash =
    submit.command.change_set.content_hash;
  approval.command.approval.decision = decision;
  approval.command.approval.decided_by = clone(submit.actor);
  approval.command.approval.rationale =
    decision === "approved"
      ? `The ${label} pair preserves its exact source basis.`
      : `The ${label} pair remains rejected independently.`;
  approval.command.approval.decided_at = approval.submitted_at;

  if (decision === "rejected") return { submit, approval };
  const apply = readAccepted("command-apply-change-set");
  apply.command_id = derivePetraId("command", `${label}:apply`);
  apply.idempotency_key = `wave4:${label}:apply:v1`;
  apply.actor = clone(submit.actor);
  apply.capability_grant_id = grant.capability_grant_id;
  apply.correlation_id = correlationId;
  apply.causation_id = approval.command_id;
  apply.submitted_at = "2026-09-13T12:10:02.000Z";
  apply.command.change_set_id = changeSetId;
  apply.command.change_set_content_hash =
    submit.command.change_set.content_hash;
  apply.command.approval_id = approval.command.approval.approval_id;
  return { submit, approval, apply };
};

const executeChangeCommands = async (changes, commands) => {
  await changes.executeCommand(commands.submit);
  await changes.executeCommand(commands.approval);
  if (commands.apply !== undefined)
    await changes.executeCommand(commands.apply);
};

const makeScientificPair = ({
  definition,
  objective,
  workUnit,
  sourceSpan,
  workVersion,
  label,
  sequence,
}) => {
  const createdBy = { actor_id: humanActorId, actor_kind: "human" };
  const claim = readAccepted("claim");
  claim.claim_id = derivePetraId("claim", `${label}:claim`);
  claim.canonical_text =
    sequence === 1
      ? "The cumulative trace candidate retains an exact inspectable source passage."
      : "The independent exception candidate remains rejected without affecting the selected candidate.";
  claim.created_by = clone(createdBy);
  assert(claim.basis.basis_kind === "source", "Expected source Claim.");
  claim.basis.proposed_by = clone(createdBy);
  claim.created_at = `2026-09-13T12:2${sequence}:00.000Z`;
  const assertion = readAccepted("assertion");
  assertion.assertion_id = derivePetraId("assertion", `${label}:assertion`);
  assertion.object = { object_kind: "entity", entity_id: claim.claim_id };
  assertion.created_by = clone(createdBy);
  const sourceRef = exactRef(sourceSpan, "source_span_id");
  const candidate = readAccepted("working-candidate");
  candidate.working_candidate_id = derivePetraId(
    "working_candidate",
    `${label}:candidate`,
  );
  candidate.project_id = scientificProjectId;
  candidate.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    definition_family: definition.definition_family,
  };
  candidate.profile_object.object_record_ref = exactRef(claim, "claim_id");
  candidate.producer = {
    producer_kind: "human",
    actor: clone(createdBy),
    contribution_kind: "direct_edit",
  };
  candidate.task_context = {
    task_kind: "work_unit",
    objective_ref: exactRef(objective, "objective_id"),
    work_unit_ref: exactRef(workUnit, "work_unit_id"),
  };
  candidate.input_snapshot = {
    snapshot_ref: {
      snapshot_id: derivePetraId("snapshot", `${label}:snapshot`),
      revision: 1,
      event_position: 3,
      content_hash: `sha256:${String(sequence).repeat(64)}`,
    },
    input_record_refs: [sourceRef],
  };
  candidate.origin = {
    origin_kind: "direct_edit",
    source_record_refs: [sourceRef],
    summary: "The human author retained this exact source-grounded candidate.",
  };
  candidate.basis = [
    {
      basis_role: "source",
      record_ref: sourceRef,
      summary: "The exact SourceSpan is the candidate basis.",
    },
  ];
  candidate.provenance = [
    {
      provenance_role: "input",
      record_ref: sourceRef,
      statement: "The exact SourceSpan remains input provenance.",
    },
  ];
  candidate.qualifications = {
    assessment_state: "none_recorded",
    statements: [],
  };
  candidate.validation.target_record_hash = hash(claim);
  for (const result of candidate.validation.results)
    result.validated_by = clone(createdBy);
  candidate.lineage = { lineage_kind: "root" };
  candidate.created_by = clone(createdBy);
  candidate.created_at = claim.created_at;
  candidate.recorded_at = `2026-09-13T12:2${sequence}:01.000Z`;
  candidate.content_hash = workingHash(candidate);

  const relationship = readAccepted("working-relationship");
  relationship.working_relationship_id = derivePetraId(
    "working_relationship",
    `${label}:relationship`,
  );
  relationship.project_id = scientificProjectId;
  relationship.project_definition_ref = clone(candidate.project_definition_ref);
  relationship.profile_relationship.relationship_record_ref = exactRef(
    assertion,
    "assertion_id",
  );
  relationship.endpoints = {
    subject: {
      endpoint_kind: "profile_record",
      record_ref: exactRef(workVersion, "work_version_id"),
    },
    object: {
      endpoint_kind: "working_candidate",
      candidate_ref: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
    },
  };
  relationship.producer = clone(candidate.producer);
  relationship.task_context = clone(candidate.task_context);
  relationship.input_snapshot = clone(candidate.input_snapshot);
  relationship.origin = {
    ...clone(candidate.origin),
    summary: "The human author retained the exact task-aligned ASSERTS edge.",
  };
  relationship.basis = clone(candidate.basis);
  relationship.provenance = clone(candidate.provenance);
  relationship.qualifications = clone(candidate.qualifications);
  relationship.validation.target_record_hash = hash(assertion);
  for (const result of relationship.validation.results)
    result.validated_by = clone(createdBy);
  relationship.lineage = { lineage_kind: "root" };
  relationship.created_by = clone(createdBy);
  relationship.created_at = claim.created_at;
  relationship.recorded_at = `2026-09-13T12:2${sequence}:02.000Z`;
  relationship.content_hash = workingHash(relationship);
  return { claim, assertion, candidate, relationship };
};

const reviewMember = (pair, memberId, memberRole = "ordinary") => ({
  review_member_id: memberId,
  member_role: memberRole,
  working_state: {
    candidate_ref: {
      working_candidate_id: pair.candidate.working_candidate_id,
      revision: pair.candidate.revision,
      content_hash: pair.candidate.content_hash,
    },
    relationship_refs: [
      {
        working_relationship_id: pair.relationship.working_relationship_id,
        revision: pair.relationship.revision,
        content_hash: pair.relationship.content_hash,
      },
    ],
  },
  candidate_bindings: [
    {
      semantic_key: "scientific.claim",
      binding_role: "candidate",
      record_ref: {
        record_id: pair.claim.claim_id,
        revision: pair.claim.revision,
        record_hash: hash(pair.claim),
      },
    },
    {
      semantic_key: "scientific.assertion",
      binding_role: "relationship",
      record_ref: {
        record_id: pair.assertion.assertion_id,
        revision: pair.assertion.revision,
        record_hash: hash(pair.assertion),
      },
    },
  ],
});

const seedScientific = async (pool, neo4jUri) => {
  const contracts = new PetraContractRegistry();
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    availableArtifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const sources = new PostgresProjectSourceAuthorityRepository(pool);
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const working = new PostgresWorkingStateAuthorityRepository(pool);
  const sessions = new PostgresReviewSessionAuthorityRepository(pool);
  const grants = new PostgresCapabilityGrantAuthorityRepository(
    pool,
    contracts,
  );
  const projections = new PostgresGraphProjectionAuthorityRepository(pool);
  const human = actor(humanActorId, "human", "Wave 4 Project author");
  const service = actor(serviceActorId, "service", "Petra worker");
  const graphActor = actor(graphActorId, "service", "Petra graph projector");
  for (const value of [human, service, graphActor])
    await scopes.registerActor(value);
  const project = readAccepted("project");
  await scopes.registerProjectRevision(project);
  const author = readAccepted("author");
  const work = readAccepted("work");
  const workVersion = readAccepted("work-version");
  await identities.registerAuthorRevision(author);
  await identities.registerWorkRevision(work);
  await identities.registerWorkVersionRevision(workVersion);

  const definitionOne = readAccepted("project-definition-scientific");
  const objectiveOne = readAccepted("project-objective");
  await definitions.registerDefinitionRevision(definitionOne);
  await definitions.registerObjectiveRevision(objectiveOne);
  const source = sourceArtifactInput();
  await artifacts.registerVerifiedAcquisition(source);
  await artifacts.registerVerifiedAcquisition(parserArtifactInput(source));
  const bundle = documentBundle(source.manifest.artifact_manifest_id);
  await documents.registerDocumentBundle(bundle);

  const definition = readAccepted("project-definition-working-scientific");
  const briefEntry = contracts.entries.find(
    (entry) =>
      entry.name === "research-brief-payload" && entry.version === "1.1.0",
  );
  assert(briefEntry !== undefined, "The Brief 1.1 registry entry is missing.");
  definition.content.registrations.push({
    registration_kind: "extension",
    semantic_key: "scientific.research-brief",
    contract: {
      name: "petra.research-brief-payload",
      version: "1.1.0",
      content_hash: briefEntry.canonical_sha256,
    },
  });
  definition.content_hash = hash(definition.content);
  await definitions.registerDefinitionRevision(definition);
  const objective = readAccepted("project-objective-working-scientific");
  objective.project_definition_ref.content_hash = definition.content_hash;
  await definitions.registerObjectiveRevision(objective);
  await definitions.setCurrentObjectiveFocus({
    project_id: scientificProjectId,
    objective_ref: {
      objective_id: objective.objective_id,
      revision: objective.revision,
      content_hash: objective.content_hash,
    },
    changed_by: { actor_id: humanActorId, actor_kind: "human" },
    changed_at: "2026-09-13T12:01:00.000Z",
  });

  const projectSource = readAccepted("project-source");
  projectSource.content.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
  };
  projectSource.content.artifact_manifest_ref.record_hash = hash(
    source.manifest,
  );
  projectSource.content_hash = hash(projectSource.content);
  await sources.registerProjectSourceRevision(projectSource);

  const applyGrant = readAccepted("capability-grant");
  await grants.registerCapabilityGrant(applyGrant);
  const lifecycleContent = {
    scope_kind: "project_commands",
    allowed_commands: ["DeferReviewSession", "ReopenReviewSession"],
    valid_from: "2026-09-08T00:00:00.000Z",
    reason: "Allow the author to pause and resume the exact cumulative Review.",
  };
  const lifecycleGrant = {
    schema_name: "petra.capability-grant",
    schema_version: "1.3.0",
    capability_grant_id: derivePetraId(
      "capability_grant",
      "wave4-cumulative-review-lifecycle",
    ),
    revision: 1,
    project_id: scientificProjectId,
    grantee: { actor_id: humanActorId, actor_kind: "human" },
    content: lifecycleContent,
    content_hash: hash(lifecycleContent),
    issued_by: { actor_id: humanActorId, actor_kind: "human" },
    issued_at: "2026-09-08T00:00:00.000Z",
  };
  await grants.registerCapabilityGrant(lifecycleGrant);
  const changes = new PostgresChangeControlAuthorityRepository(
    pool,
    new PostgresCapabilityGrantCommandAuthorizer(contracts),
  );

  const baselineClaim = readAccepted("claim");
  baselineClaim.created_by = { actor_id: humanActorId, actor_kind: "human" };
  assert(
    baselineClaim.basis.basis_kind === "source",
    "Expected baseline source Claim.",
  );
  baselineClaim.basis.proposed_by = clone(baselineClaim.created_by);
  const baselineAssertion = readAccepted("assertion");
  baselineAssertion.created_by = clone(baselineClaim.created_by);
  await evidence.proposeClaim(baselineClaim);
  await evidence.proposeAssertion(baselineAssertion);
  const baselineCommands = makeChangeCommands({
    label: "baseline-authority",
    claim: baselineClaim,
    assertion: baselineAssertion,
    decision: "approved",
    grant: applyGrant,
  });
  await executeChangeCommands(changes, baselineCommands);
  const graphOutbox = (
    await changes.getOutboxRecords({
      projectId: scientificProjectId,
      target: "neo4j_graph",
    })
  )[0];
  assert(graphOutbox !== undefined, "Baseline graph outbox is missing.");
  const checkpoint = readAccepted("projection-checkpoint-catching-up");
  checkpoint.recorded_by = {
    actor_id: graphActorId,
    actor_kind: "service",
  };
  checkpoint.recorded_at = "2026-09-13T12:10:03.000Z";
  checkpoint.content.observed_head = {
    target_sequence: graphOutbox.target_sequence,
    outbox_id: graphOutbox.outbox_id,
    outbox_position: graphOutbox.outbox_position,
    event_id: graphOutbox.message.event.event_id,
    event_position: graphOutbox.message.event.event_position,
    stream_revision: graphOutbox.message.event.stream_revision,
    observed_at: checkpoint.recorded_at,
  };
  checkpoint.content_hash = hash(checkpoint.content);
  await projections.register(checkpoint);
  const driver = neo4j.driver(
    neo4jUri,
    neo4j.auth.basic("neo4j", postgresPassword),
  );
  const graph = new Neo4jAuthorityGraphStore({ driver });
  try {
    await graph.prepare();
    let projectionRecord = 0;
    const projector = new ScientificGraphProjector({
      authority: projections,
      source: new RepositoryAuthorityGraphProjectionSource({
        researchScope: scopes,
        scholarlyIdentity: identities,
        artifacts,
        documents,
        evidence,
      }),
      graph,
      factory: {
        nextProjectionRecordId: () =>
          derivePetraId(
            "graph_projection_record",
            `wave4-cumulative:${++projectionRecord}`,
          ),
        now: () => "2026-09-13T12:10:04.000Z",
        serviceActor: {
          actor_id: graphActorId,
          actor_kind: "service",
        },
      },
    });
    const projected = await projector.project(
      checkpoint.projection_checkpoint_id,
      graphOutbox,
    );
    assert(
      projected.checkpoint.content.freshness.state === "current",
      "Baseline graph projection did not become current.",
    );
  } finally {
    await driver.close();
  }

  const inputManifest = readAccepted("worker-input-manifest");
  inputManifest.issued_by = {
    actor_id: serviceActorId,
    actor_kind: "service",
  };
  const requested = readAccepted("work-unit-requested");
  requested.created_by = clone(inputManifest.issued_by);
  const workUnit = await workUnits.register({
    workUnit: requested,
    inputManifest,
  });
  const selected = makeScientificPair({
    definition,
    objective,
    workUnit,
    sourceSpan: bundle.spans[0],
    workVersion,
    label: "selected-candidate",
    sequence: 1,
  });
  const rejected = makeScientificPair({
    definition,
    objective,
    workUnit,
    sourceSpan: bundle.spans[0],
    workVersion,
    label: "rejected-candidate",
    sequence: 2,
  });
  for (const pair of [selected, rejected]) {
    await evidence.proposeClaim(pair.claim);
    await evidence.proposeAssertion(pair.assertion);
    await working.admitWorkingCandidateRevision({
      candidate: pair.candidate,
      profileRecord: pair.claim,
    });
    await working.admitWorkingRelationshipRevision({
      relationship: pair.relationship,
      profileRecord: pair.assertion,
    });
  }
  assert(
    canonicalize(
      await working.admitWorkingCandidateRevision({
        candidate: clone(selected.candidate),
        profileRecord: clone(selected.claim),
      }),
    ) === canonicalize(selected.candidate),
    "Selected candidate admission retry diverged.",
  );
  const rejectedCommands = makeChangeCommands({
    label: "independent-rejection",
    claim: rejected.claim,
    assertion: rejected.assertion,
    decision: "rejected",
    grant: applyGrant,
  });
  await executeChangeCommands(changes, rejectedCommands);
  const position = await authorityPosition(pool, scientificProjectId);
  const session = readAccepted("review-session-working-candidate");
  session.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
  };
  session.content.objective_ref = {
    objective_id: objective.objective_id,
    revision: objective.revision,
    content_hash: objective.content_hash,
  };
  session.content.snapshot = {
    event_position: position.event_position,
    stream_revision: position.stream_revision,
    captured_at: "2026-09-13T12:30:00.000Z",
  };
  session.content.origin.record_refs = [workUnit.work_unit_id];
  session.content.return_context.object_ref = workUnit.work_unit_id;
  session.content.members = [
    reviewMember(
      selected,
      derivePetraId("review_member", "wave4-cumulative:selected"),
    ),
    reviewMember(
      rejected,
      derivePetraId("review_member", "wave4-cumulative:rejected"),
      "exception",
    ),
  ];
  session.content_hash = hash(session.content);
  await sessions.registerReviewSessionRevision(session);
  return {
    project,
    definition,
    objective,
    projectSource,
    applyGrant,
    lifecycleGrant,
    baselineCommands,
    rejectedCommands,
    selected,
    rejected,
    session,
    briefSchemaHash: briefEntry.canonical_sha256,
  };
};

const seedControlledWriting = async (pool, sourceManifest) => {
  const scopes = new PostgresResearchScopeRepository(pool);
  const definitions = new PostgresProjectDefinitionAuthorityRepository(pool);
  const sources = new PostgresProjectSourceAuthorityRepository(pool);
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const working = new PostgresWorkingStateAuthorityRepository(pool);
  const sessions = new PostgresReviewSessionAuthorityRepository(pool);
  const project = readAccepted("project-controlled-writing");
  const definition = readAccepted("project-definition-controlled-writing");
  const objective = readAccepted("project-objective-controlled-writing");
  await scopes.registerProjectRevision(project);
  await definitions.registerDefinitionRevision(definition);
  await definitions.registerObjectiveRevision(objective);
  const projectSource = readAccepted("project-source");
  projectSource.project_source_id = "project_source_01K4E000000000000000000006";
  projectSource.project_id = writingProjectId;
  projectSource.content.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
  };
  projectSource.content.source_role = "writing.authority-source";
  projectSource.content.artifact_manifest_ref.record_hash =
    hash(sourceManifest);
  projectSource.content_hash = hash(projectSource.content);
  await sources.registerProjectSourceRevision(projectSource);

  const inputManifest = readAccepted("worker-input-manifest");
  inputManifest.worker_input_manifest_id =
    "worker_input_manifest_01K4E000000000000000000009";
  inputManifest.work_unit_id = "work_unit_01K4E000000000000000000010";
  inputManifest.project_id = writingProjectId;
  inputManifest.issued_by = {
    actor_id: serviceActorId,
    actor_kind: "service",
  };
  inputManifest.content.task = {
    task_family: "reasoning",
    task_name: "petra.writing.requirement-proposal",
    task_version: "1.0.0",
  };
  inputManifest.content.worker = {
    executor_kind: "typescript_worker",
    worker_name: "petra.writing",
    worker_version: "1.0.0",
    runtime_name: "node",
    runtime_version: "24.20.0",
    entrypoint: "petra.writing.propose-requirement",
  };
  inputManifest.content.inputs = [
    {
      binding_kind: "record",
      name: "authority_source",
      record_id: projectSource.project_source_id,
      record_revision: projectSource.revision,
      snapshot_hash: hash(projectSource),
    },
  ];
  inputManifest.content.expected_outputs = [
    {
      output_name: "requirement_proposal",
      output_role: "proposal",
      required: true,
      media_type: "application/json",
      max_bytes: 100_000,
      contract: {
        schema_name: "petra.controlled-writing-requirement",
        schema_version: "1.0.0",
        schema_hash:
          "sha256:5a6d449b44078f2df1c2f29fe15164d22b0c4151a05c6f35dd8718964c3c3f1e",
      },
    },
  ];
  inputManifest.content_hash = hash(inputManifest.content);
  const requested = readAccepted("work-unit-requested");
  requested.work_unit_id = inputManifest.work_unit_id;
  requested.project_id = writingProjectId;
  requested.spec.workflow_name = "petra.writing.requirement-proposal";
  requested.spec.workflow_version = "1.0.0";
  requested.spec.objective =
    "Propose one non-authoritative Requirement from the registered authority source.";
  requested.spec.input_manifest_ref.worker_input_manifest_id =
    inputManifest.worker_input_manifest_id;
  requested.spec.input_manifest_ref.content_hash = inputManifest.content_hash;
  requested.spec.idempotency_key =
    "writing:requirement-proposal:wave4-cumulative:v1";
  assert(
    requested.spec.cache.cache_mode !== "disabled",
    "Expected reusable writing Work fixture.",
  );
  requested.spec.cache.cache_key =
    "writing:requirement-proposal:wave4-cumulative:v1";
  requested.spec_hash = hash(requested.spec);
  requested.created_by = clone(inputManifest.issued_by);
  const workUnit = await workUnits.register({
    workUnit: requested,
    inputManifest,
  });

  const requirement = readAccepted("controlled-writing-requirement");
  const sourceRef = exactRef(projectSource, "project_source_id");
  const requirementRef = exactRef(requirement, "requirement_id");
  const governing = readAccepted("controlled-writing-governing-relationship");
  governing.content.authority_source_ref = clone(sourceRef);
  governing.content.requirement_ref = clone(requirementRef);
  governing.content_hash = hash(governing.content);
  const candidate = readAccepted("working-candidate");
  candidate.working_candidate_id =
    "working_candidate_01K4E000000000000000000007";
  candidate.project_id = writingProjectId;
  candidate.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
    definition_family: definition.definition_family,
  };
  candidate.profile_object = {
    registration: clone(
      definition.content.registrations.find(
        (entry) => entry.semantic_key === "writing.requirement",
      ),
    ),
    object_record_ref: clone(requirementRef),
    candidate_operation: "create",
  };
  candidate.producer = {
    producer_kind: "human",
    actor: { actor_id: humanActorId, actor_kind: "human" },
    contribution_kind: "direct_edit",
  };
  candidate.task_context = {
    task_kind: "work_unit",
    objective_ref: exactRef(objective, "objective_id"),
    work_unit_ref: exactRef(workUnit, "work_unit_id"),
  };
  const position = await authorityPosition(pool, writingProjectId);
  candidate.input_snapshot = {
    snapshot_ref: {
      snapshot_id: "snapshot_01K4E000000000000000000011",
      revision: 1,
      event_position: position.event_position,
      content_hash: `sha256:${"1".repeat(64)}`,
    },
    input_record_refs: [sourceRef],
  };
  candidate.origin = {
    origin_kind: "direct_edit",
    source_record_refs: [sourceRef],
    summary:
      "The human author proposed this Requirement from the exact authority source.",
  };
  candidate.basis = [
    {
      basis_role: "source",
      record_ref: sourceRef,
      summary: "The exact ProjectSource is the Requirement basis.",
    },
  ];
  candidate.provenance = [
    {
      provenance_role: "input",
      record_ref: sourceRef,
      statement: "The authority-source revision remains exact provenance.",
    },
  ];
  candidate.qualifications = {
    assessment_state: "none_recorded",
    statements: [],
  };
  candidate.validation = {
    state: "pending",
    target_record_hash: hash(requirement),
    results: [],
  };
  candidate.lineage = { lineage_kind: "root" };
  candidate.created_by = clone(requirement.created_by);
  candidate.created_at = requirement.created_at;
  candidate.recorded_at = "2026-09-13T12:40:00.000Z";
  candidate.content_hash = workingHash(candidate);

  const governingRef = exactRef(governing, "governing_relationship_id");
  const relationship = readAccepted("working-relationship");
  relationship.working_relationship_id =
    "working_relationship_01K4E000000000000000000008";
  relationship.project_id = writingProjectId;
  relationship.project_definition_ref = clone(candidate.project_definition_ref);
  relationship.profile_relationship = {
    registration: clone(
      definition.content.registrations.find(
        (entry) => entry.semantic_key === "writing.governs",
      ),
    ),
    predicate: "GOVERNS",
    relationship_record_ref: governingRef,
    candidate_operation: "create",
  };
  relationship.endpoints = {
    subject: { endpoint_kind: "profile_record", record_ref: sourceRef },
    object: {
      endpoint_kind: "working_candidate",
      candidate_ref: {
        working_candidate_id: candidate.working_candidate_id,
        revision: candidate.revision,
        content_hash: candidate.content_hash,
      },
    },
  };
  relationship.producer = clone(candidate.producer);
  relationship.task_context = clone(candidate.task_context);
  relationship.input_snapshot = clone(candidate.input_snapshot);
  relationship.origin = clone(candidate.origin);
  relationship.basis = clone(candidate.basis);
  relationship.provenance = clone(candidate.provenance);
  relationship.qualifications = clone(candidate.qualifications);
  relationship.validation = {
    state: "pending",
    target_record_hash: hash(governing),
    results: [],
  };
  relationship.lineage = { lineage_kind: "root" };
  relationship.created_by = clone(governing.created_by);
  relationship.created_at = governing.created_at;
  relationship.recorded_at = "2026-09-13T12:40:01.000Z";
  relationship.content_hash = workingHash(relationship);
  await working.admitWorkingCandidateRevision({
    candidate,
    profileRecord: requirement,
  });
  await working.admitWorkingRelationshipRevision({
    relationship,
    profileRecord: governing,
  });

  const session = readAccepted("review-session-working-candidate");
  session.review_session_id = "review_session_01K4E000000000000000000023";
  session.project_id = writingProjectId;
  session.project_definition_ref = {
    project_definition_id: definition.project_definition_id,
    revision: definition.revision,
    content_hash: definition.content_hash,
  };
  session.content.title = "Review the controlled-writing Requirement";
  session.content.objective_summary =
    "Inspect the Requirement and GOVERNS relationship without a writing Apply path.";
  session.content.objective_ref = {
    objective_id: objective.objective_id,
    revision: objective.revision,
    content_hash: objective.content_hash,
  };
  session.content.snapshot = {
    event_position: position.event_position,
    stream_revision: position.stream_revision,
    captured_at: "2026-09-13T12:40:02.000Z",
  };
  session.content.origin = {
    origin_kind: "direct_edit",
    record_refs: [workUnit.work_unit_id],
    summary: "Opened from the exact controlled-writing working records.",
  };
  session.content.return_context = {
    place: "work",
    object_ref: workUnit.work_unit_id,
    label: "Requirement proposal work",
  };
  session.content.members = [
    {
      review_member_id: "review_member_01K4E000000000000000000024",
      member_role: "ordinary",
      working_state: {
        candidate_ref: {
          working_candidate_id: candidate.working_candidate_id,
          revision: candidate.revision,
          content_hash: candidate.content_hash,
        },
        relationship_refs: [
          {
            working_relationship_id: relationship.working_relationship_id,
            revision: relationship.revision,
            content_hash: relationship.content_hash,
          },
        ],
      },
      candidate_bindings: [
        {
          semantic_key: "writing.requirement",
          binding_role: "candidate",
          record_ref: {
            record_id: requirement.requirement_id,
            revision: requirement.revision,
            record_hash: hash(requirement),
          },
        },
        {
          semantic_key: "writing.governs",
          binding_role: "relationship",
          record_ref: {
            record_id: governing.governing_relationship_id,
            revision: governing.revision,
            record_hash: hash(governing),
          },
        },
      ],
    },
  ];
  session.content_hash = hash(session.content);
  session.created_at = "2026-09-13T12:40:02.000Z";
  session.updated_at = session.created_at;
  await sessions.registerReviewSessionRevision(session);
  await sessions.registerReviewSessionRevision(clone(session));
  return {
    project,
    definition,
    objective,
    projectSource,
    workUnit,
    requirement,
    governing,
    candidate,
    relationship,
    session,
  };
};

const durableCounts = async (pool) => {
  const result = await pool.query(
    `SELECT
       (SELECT count(*)::integer FROM petra.working_candidates
         WHERE project_id = $1) AS scientific_working_candidates,
       (SELECT count(*)::integer FROM petra.working_candidate_revisions
         WHERE project_id = $1) AS scientific_working_candidate_revisions,
       (SELECT count(*)::integer FROM petra.working_relationships
         WHERE project_id = $1) AS scientific_working_relationships,
       (SELECT count(*)::integer FROM petra.working_relationship_revisions
         WHERE project_id = $1) AS scientific_working_relationship_revisions,
       (SELECT count(*)::integer FROM petra.review_sessions
         WHERE project_id = $1) AS scientific_reviews,
       (SELECT count(*)::integer FROM petra.review_session_revisions
         WHERE project_id = $1) AS scientific_review_revisions,
       (SELECT count(*)::integer FROM petra.review_session_lifecycle_receipts
         WHERE project_id = $1) AS lifecycle_receipts,
       (SELECT count(*)::integer FROM petra.change_sets
         WHERE project_id = $1) AS scientific_change_sets,
       (SELECT count(*)::integer FROM petra.approvals
         WHERE change_set_id IN (
           SELECT change_set_id FROM petra.change_sets WHERE project_id = $1
         )) AS scientific_approvals,
       (SELECT count(*)::integer FROM petra.command_executions
         WHERE project_id = $1) AS scientific_commands,
       (SELECT count(*)::integer FROM petra.domain_events
         WHERE project_id = $1) AS scientific_events,
       (SELECT count(*)::integer FROM petra.outbox_records
         WHERE partition_key = $1 AND target = 'neo4j_graph')
         AS scientific_graph_outboxes,
       (SELECT count(*)::integer
          FROM petra.controlled_writing_requirement_records
         WHERE project_id = $1) AS scientific_requirements,
       (SELECT count(*)::integer
          FROM petra.controlled_writing_governing_relationship_records
         WHERE project_id = $1) AS scientific_governing_relationships,
       (SELECT count(*)::integer FROM petra.working_candidates
         WHERE project_id = $2) AS writing_working_candidates,
       (SELECT count(*)::integer FROM petra.working_candidate_revisions
         WHERE project_id = $2) AS writing_working_candidate_revisions,
       (SELECT count(*)::integer FROM petra.working_relationships
         WHERE project_id = $2) AS writing_working_relationships,
       (SELECT count(*)::integer FROM petra.working_relationship_revisions
         WHERE project_id = $2) AS writing_working_relationship_revisions,
       (SELECT count(*)::integer FROM petra.review_sessions
         WHERE project_id = $2) AS writing_reviews,
       (SELECT count(*)::integer FROM petra.review_session_revisions
         WHERE project_id = $2) AS writing_review_revisions,
       (SELECT count(*)::integer FROM petra.review_session_lifecycle_receipts
         WHERE project_id = $2) AS writing_lifecycle_receipts,
       (SELECT count(*)::integer FROM petra.change_sets
         WHERE project_id = $2) AS writing_change_sets,
       (SELECT count(*)::integer FROM petra.command_executions
         WHERE project_id = $2) AS writing_commands,
       (SELECT count(*)::integer FROM petra.domain_events
         WHERE project_id = $2) AS writing_events,
       (SELECT count(*)::integer
          FROM petra.controlled_writing_requirement_records
         WHERE project_id = $2) AS writing_requirements,
       (SELECT count(*)::integer
          FROM petra.controlled_writing_governing_relationship_records
         WHERE project_id = $2) AS writing_governing_relationships`,
    [scientificProjectId, writingProjectId],
  );
  return result.rows[0];
};

const rawReview = async (baseUrl, projectId, reviewSessionId) => {
  const response = await fetch(
    new URL(
      `/api/queries/projects/${projectId}/reviews/${reviewSessionId}`,
      baseUrl,
    ),
    { headers: { authorization: `Bearer ${token}` } },
  );
  assert(response.ok, `Review route failed (${response.status}).`);
  const view = await response.json();
  new PetraContractRegistry().assertValid(
    "project-review-view",
    view.schema_version,
    view,
  );
  assert(
    view.project_id === projectId && view.review_session_id === reviewSessionId,
    "Review route substituted an identity.",
  );
  return view;
};

const exerciseTrace = async (environment, pool, scientific, writing) => {
  let active;
  let vite;
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const resolved =
      typeof input === "string" && input.startsWith("/")
        ? new URL(input, active?.url ?? "http://petra.invalid")
        : input;
    return nativeFetch(resolved, init);
  };
  const launch = async () => {
    const persistence =
      await createProjectShellPersistenceFromEnvironment(environment);
    try {
      return await startPetraServer({
        port: 0,
        authToken: token,
        projectShellPersistence: persistence,
      });
    } catch (error) {
      await persistence.close();
      throw error;
    }
  };
  const restart = async () => {
    await active?.shutdown();
    active = await launch();
    progress("production server restarted against retained stores");
  };
  const workingClient = () =>
    new ProjectWorkingStateClient({
      baseUrl: active.url,
      token,
    });
  const briefClient = () =>
    new ProjectBriefClient({
      baseUrl: active.url,
      token,
      registeredProfileSchemaHash: scientific.briefSchemaHash,
    });
  try {
    active = await launch();
    progress("production server started on fresh PostgreSQL and Neo4j stores");
    vite = await createViteServer({
      root,
      appType: "custom",
      logLevel: "silent",
      server: { middlewareMode: true },
    });
    const projectData = await vite.ssrLoadModule(
      "/apps/workbench/src/product/project-data.ts",
    );
    const unauthorized = await nativeFetch(
      new URL(
        `/api/queries/projects/${scientificProjectId}/working-state`,
        active.url,
      ),
    );
    assert(
      unauthorized.status === 401,
      "Working state was readable without authentication.",
    );
    const directWorking = await workingClient().read(scientificProjectId);
    const directWritingWorking = await workingClient().read(writingProjectId);
    assert(
      directWorking.content.candidates.some(
        (candidate) =>
          candidate.working_candidate_id ===
          scientific.selected.candidate.working_candidate_id,
      ) &&
        directWorking.content.relationships.some(
          (relationship) =>
            relationship.working_relationship_id ===
            scientific.selected.relationship.working_relationship_id,
        ),
      "The typed working-state read lost the selected candidate pair.",
    );
    assert(
      directWorking.content.candidates.find(
        (candidate) =>
          candidate.working_candidate_id ===
          scientific.selected.candidate.working_candidate_id,
      )?.producer.actor.actor_id === humanActorId,
      "The scientific candidate lost human producer provenance.",
    );
    const overlay =
      await projectData.loadProjectRelationshipOverlay(scientificProjectId);
    assert(overlay !== undefined, "The production working overlay is absent.");
    assert(
      overlay.content.relationships.filter(
        (relationship) => relationship.layer === "working",
      ).length === 2 &&
        overlay.content.textual_peer.relationships.length ===
          overlay.content.relationships.length &&
        overlay.content.positions.authoritative.projection.state === "current",
      "The live overlay lost working pairs, textual parity, or projection state.",
    );
    progress("typed clients read working state and the live overlay");

    let review = await projectData.loadProjectReviewSession({
      params: {
        projectId: scientificProjectId,
        reviewId: scientific.session.review_session_id,
      },
    });
    assert(
      review.exactRef.revision === 1 &&
        review.members.length === 2 &&
        review.memberOutcome === "awaiting_decision",
      "The production Review loader lost its initial exact members.",
    );
    const initialWritingReview = await rawReview(
      active.url,
      writingProjectId,
      writing.session.review_session_id,
    );
    assert(
      initialWritingReview.schema_version === "1.3.0" &&
        initialWritingReview.content.members[0].candidate.profile_payload
          .apply_available === false &&
        initialWritingReview.content.members[0].change_sets.length === 0,
      "Controlled-writing Review exposed unsupported commitment state.",
    );
    const deferInput = projectData.createReviewSessionDeferCommandInput(
      review,
      {
        commandId: derivePetraId("command", "wave4-cumulative:defer"),
        idempotencyKey: "wave4-cumulative:review:defer:v1",
        rationale: "Pause before the exact manual checkpoint.",
      },
    );
    const deferred =
      await projectData.executeReviewSessionLifecycleCommand(deferInput);
    assert(
      deferred.receipt.content.resulting_review_session_ref.lifecycle ===
        "deferred",
      "The Review did not retain its deferred state.",
    );
    review = await projectData.loadProjectReviewSession({
      params: {
        projectId: scientificProjectId,
        reviewId: scientific.session.review_session_id,
      },
    });
    assert(
      review.lifecycle === "deferred" && review.exactRef.revision === 2,
      "The deferred Review was not resumable through its production read.",
    );
    const reopenInput = projectData.createReviewSessionReopenCommandInput(
      review,
      {
        commandId: derivePetraId("command", "wave4-cumulative:reopen"),
        idempotencyKey: "wave4-cumulative:review:reopen:v1",
      },
    );
    const reopened =
      await projectData.executeReviewSessionLifecycleCommand(reopenInput);
    assert(
      reopened.receipt.content.resulting_review_session_ref.lifecycle ===
        "open",
      "The Review did not reopen.",
    );
    review = await projectData.loadProjectReviewSession({
      params: {
        projectId: scientificProjectId,
        reviewId: scientific.session.review_session_id,
      },
    });
    assert(
      review.lifecycle === "open" && review.exactRef.revision === 3,
      "The reopened Review did not retain its exact revision.",
    );
    progress("Review deferred, resumed, and returned to exact open revision 3");

    const initialBrief = await briefClient().read(scientificProjectId);
    const applyClient = new ReviewSessionApplyClient({
      baseUrl: active.url,
      token,
    });
    const checkpoint = await applyClient.prepare({
      project_id: scientificProjectId,
      review_session_id: review.id,
      expected_revision: review.exactRef.revision,
      expected_content_hash: review.exactRef.contentHash,
      selected_review_member_id: review.reviewMemberId,
    });
    assert(
      checkpoint.binding.review_policy.applicability === "not_applicable" &&
        checkpoint.binding.authorization_basis.kind ===
          "authenticated_human_checkpoint" &&
        checkpoint.binding.authorization_basis.decision === "apply" &&
        checkpoint.binding.authorization_basis.actor.actor_id === humanActorId,
      "Apply preparation invented policy or lost exact human authority.",
    );
    const request = {
      schema_name: "petra.review-session-apply-request",
      schema_version: "1.0.0",
      checkpoint,
      decided_at: new Date().toISOString(),
    };
    const directReview = await rawReview(
      active.url,
      scientificProjectId,
      scientific.session.review_session_id,
    );
    await restart();
    const modelMediatedWorking =
      await workingClient().read(scientificProjectId);
    const modelMediatedWritingWorking =
      await workingClient().read(writingProjectId);
    const modelMediatedReview = await rawReview(
      active.url,
      scientificProjectId,
      scientific.session.review_session_id,
    );
    const modelMediatedWritingReview = await rawReview(
      active.url,
      writingProjectId,
      writing.session.review_session_id,
    );
    assert(
      directWorking.content_hash === modelMediatedWorking.content_hash &&
        canonicalize(directWorking.content) ===
          canonicalize(modelMediatedWorking.content) &&
        directWritingWorking.content_hash ===
          modelMediatedWritingWorking.content_hash &&
        directReview.content_hash === modelMediatedReview.content_hash &&
        initialWritingReview.content_hash ===
          modelMediatedWritingReview.content_hash,
      "Direct and restarted model-mediated caller seams diverged in identity.",
    );
    progress("direct and model-mediated caller seams converged after restart");

    const applied = await new ReviewSessionApplyClient({
      baseUrl: active.url,
      token,
    }).apply(request);
    assert(
      applied.outcome === "applied" &&
        canonicalize(applied.steps.map((step) => step.observation)) ===
          canonicalize(["executed", "executed", "executed"]),
      "The exact manual checkpoint did not execute once.",
    );
    const memberOutcomes = applied.assessment.content.review.members.map(
      (member) => member.outcome,
    );
    assert(
      canonicalize(memberOutcomes) === canonicalize(["applied", "rejected"]),
      "The Apply result lost independent member outcomes.",
    );
    const resultingBrief = await briefClient().read(scientificProjectId);
    const history =
      await projectData.getRecentProjectHistory(scientificProjectId);
    const appliedCommandIds = new Set(
      applied.steps.map((step) => step.envelope.command_id),
    );
    assert(
      resultingBrief.snapshot_hash !== initialBrief.snapshot_hash &&
        resultingBrief.content.reviews[0].content.members
          .map((member) => member.outcome)
          .includes("applied") &&
        history.content.changes.filter((change) =>
          appliedCommandIds.has(change.command_ref.command_id),
        ).length === 3,
      "The resulting Brief or retained History lost the applied commitment.",
    );
    const countsAfterApply = await durableCounts(pool);
    progress(
      "manual Apply updated Brief and retained all three History events",
    );

    await restart();
    const replay = await new ReviewSessionApplyClient({
      baseUrl: active.url,
      token,
    }).apply(request);
    assert(
      replay.outcome === "applied" &&
        replay.steps.every((step) => step.observation === "replayed"),
      "Restart replay did not return the exact completed checkpoint.",
    );
    const replayedBrief = await briefClient().read(scientificProjectId);
    const replayedHistory =
      await projectData.getRecentProjectHistory(scientificProjectId);
    const finalReview = await rawReview(
      active.url,
      scientificProjectId,
      scientific.session.review_session_id,
    );
    const finalWritingReview = await rawReview(
      active.url,
      writingProjectId,
      writing.session.review_session_id,
    );
    const countsAfterReplay = await durableCounts(pool);
    assert(
      canonicalize(countsAfterApply) === canonicalize(countsAfterReplay) &&
        replayedBrief.snapshot_hash === resultingBrief.snapshot_hash &&
        replayedHistory.content_hash === history.content_hash,
      "Restart replay duplicated an effect or changed Brief/History identity.",
    );
    assert(
      finalWritingReview.content.members[0].candidate.profile_payload
        .apply_available === false &&
        countsAfterReplay.writing_change_sets === 0 &&
        countsAfterReplay.writing_commands === 0 &&
        countsAfterReplay.writing_events === 0,
      "The paired controlled-writing path crossed its read-only boundary.",
    );
    assert(
      canonicalize(countsAfterReplay) ===
        canonicalize({
          scientific_working_candidates: 2,
          scientific_working_candidate_revisions: 2,
          scientific_working_relationships: 2,
          scientific_working_relationship_revisions: 2,
          scientific_reviews: 1,
          scientific_review_revisions: 3,
          lifecycle_receipts: 2,
          scientific_change_sets: 3,
          scientific_approvals: 3,
          scientific_commands: 10,
          scientific_events: 8,
          scientific_graph_outboxes: 2,
          scientific_requirements: 0,
          scientific_governing_relationships: 0,
          writing_working_candidates: 1,
          writing_working_candidate_revisions: 1,
          writing_working_relationships: 1,
          writing_working_relationship_revisions: 1,
          writing_reviews: 1,
          writing_review_revisions: 1,
          writing_lifecycle_receipts: 0,
          writing_change_sets: 0,
          writing_commands: 0,
          writing_events: 0,
          writing_requirements: 1,
          writing_governing_relationships: 1,
        }),
      `Durable cardinalities drifted: ${JSON.stringify(countsAfterReplay)}`,
    );
    progress("restart replay retained exact cardinalities without duplicates");
    return {
      ok: true,
      stores: {
        postgres: "fresh disposable PostgreSQL 18.6",
        neo4j: "fresh disposable Neo4j 2026.07.1",
      },
      production_paths: {
        server_restarts: 2,
        typed_clients: [
          "ProjectWorkingStateClient",
          "loadProjectRelationshipOverlay",
          "loadProjectReviewSession",
          "executeReviewSessionLifecycleCommand",
          "ReviewSessionApplyClient",
          "ProjectBriefClient",
          "getRecentProjectHistory",
        ],
      },
      scientific: {
        project_id: scientificProjectId,
        candidate_id: scientific.selected.candidate.working_candidate_id,
        relationship_id:
          scientific.selected.relationship.working_relationship_id,
        producer: scientific.selected.candidate.producer,
        review_session_id: scientific.session.review_session_id,
        review_revisions: [1, 2, 3],
        checkpoint_hash: checkpoint.displayed_commitment_hash,
        applied_change_set_id: checkpoint.binding.change_set.change_set_id,
        member_outcomes: memberOutcomes,
        brief_snapshots: {
          before: initialBrief.snapshot_hash,
          after: resultingBrief.snapshot_hash,
          after_restart: replayedBrief.snapshot_hash,
        },
        history_event_ids: history.content.changes
          .filter((change) =>
            appliedCommandIds.has(change.command_ref.command_id),
          )
          .map((change) => change.event_ref.event_id),
        apply_step_observations: applied.steps.map((step) => step.observation),
        replay_step_observations: replay.steps.map((step) => step.observation),
        final_review_content_hash: finalReview.content_hash,
      },
      controlled_writing: {
        project_id: writingProjectId,
        candidate_id: writing.candidate.working_candidate_id,
        relationship_id: writing.relationship.working_relationship_id,
        review_session_id: writing.session.review_session_id,
        review_schema_version: finalWritingReview.schema_version,
        apply_available: false,
        stopped_before_apply: true,
      },
      identity_convergence: {
        scientific_working_content_hash: directWorking.content_hash,
        scientific_review_content_hash: directReview.content_hash,
        writing_working_content_hash: directWritingWorking.content_hash,
        writing_review_content_hash: initialWritingReview.content_hash,
      },
      durable_counts: countsAfterReplay,
    };
  } finally {
    globalThis.fetch = nativeFetch;
    await Promise.all([vite?.close(), active?.shutdown()]);
  }
};

if (process.versions.node !== "24.20.0")
  throw new Error(
    `The Wave 4 cumulative trace requires Node 24.20.0; received ${process.versions.node}.`,
  );

let failure;
let pool;
try {
  await requireRun(
    "docker",
    composeArgs(
      "up",
      "--detach",
      "--wait",
      "postgres-source",
      "neo4j-restored",
    ),
  );
  const migration = await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "migrate"),
  );
  process.stdout.write(`${migration.stdout}${migration.stderr}`);
  await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "validate"),
  );
  const postgresPort = await servicePort("postgres-source", "5432");
  const neo4jPort = await servicePort("neo4j-restored", "7687");
  const environment = {
    PETRA_AUTH_TOKEN: token,
    PETRA_LOCAL_ACTOR_ID: humanActorId,
    PETRA_POSTGRES_HOST: "127.0.0.1",
    PETRA_POSTGRES_HOST_PORT: postgresPort,
    PETRA_POSTGRES_USER: "petra",
    PETRA_POSTGRES_PASSWORD: postgresPassword,
    PETRA_POSTGRES_DATABASE: "petra",
    PETRA_NEO4J_URI: `bolt://127.0.0.1:${neo4jPort}`,
    PETRA_NEO4J_USER: "neo4j",
    PETRA_NEO4J_PASSWORD: postgresPassword,
    PETRA_NEO4J_DATABASE: "neo4j",
  };
  pool = new Pool({
    connectionString: `postgresql://petra:${postgresPassword}@127.0.0.1:${postgresPort}/petra`,
    application_name: "petra-wave4-cumulative-proof",
  });
  const scientific = await seedScientific(pool, environment.PETRA_NEO4J_URI);
  progress("scientific authority, working state, and Review seeded");
  const writing = await seedControlledWriting(
    pool,
    sourceArtifactInput().manifest,
  );
  progress("controlled-writing candidate and Review seeded without Apply");
  const result = await exerciseTrace(environment, pool, scientific, writing);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  failure = error;
  const logs = await run("docker", composeArgs("logs", "--tail=160"));
  process.stderr.write(`${logs.stdout}\n${logs.stderr}`);
} finally {
  await pool?.end();
  const cleanup = await run(
    "docker",
    composeArgs("down", "--volumes", "--remove-orphans"),
  );
  if (cleanup.code !== 0 && failure === undefined)
    failure = new Error(cleanup.stderr || cleanup.stdout);
  const remaining = await resourceCount();
  if (remaining !== 0 && failure === undefined)
    failure = new Error(
      `Disposable Wave 4 cleanup left ${remaining} labeled resources.`,
    );
}

if (failure !== undefined) throw failure;
