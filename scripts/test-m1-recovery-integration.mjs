import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CreateBucketCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  RepositoryAuthorityGraphProjectionSource,
  ScientificGraphProjector,
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
import { S3ArtifactStore } from "@petra/s3";
import { canonicalize } from "json-canonicalize";
import neo4j from "neo4j-driver";
import pg from "pg";

const { Pool } = pg;
const root = resolve(import.meta.dirname, "..");
const composeFile = resolve(root, "infra/recovery/integration.compose.yaml");
const projectName = `petra-m19-recovery-${process.pid}-${Date.now()}`;
const postgresPassword = "petra-recovery-only";
const s3Credentials = {
  accessKeyId: "petra-recovery-access",
  secretAccessKey: "petra-recovery-secret",
};
const sourceBucket = "petra-recovery-source";
const restoredBucket = "petra-recovery-restored";

const hashBytes = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const hashRecord = (value) =>
  `sha256:${createHash("sha256").update(canonicalize(value)).digest("hex")}`;
const readFixture = (name) =>
  JSON.parse(
    readFileSync(
      resolve(root, `packages/contracts/fixtures/accepted/${name}.json`),
      "utf8",
    ),
  );
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
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
      `${program} ${args.join(" ")} failed (${result.code}):\n${result.stderr || result.stdout.toString("utf8")}`,
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
    throw new Error(`Could not resolve ${service}:${containerPort}.`);
  }
  return port;
};

const createS3Client = (port) =>
  new S3Client({
    region: "us-east-1",
    endpoint: `http://127.0.0.1:${port}`,
    forcePathStyle: true,
    credentials: s3Credentials,
  });

const createBucket = async (client, bucket) => {
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

const bodyBytes = async (body) => {
  if (
    typeof body === "object" &&
    body !== null &&
    "transformToByteArray" in body &&
    typeof body.transformToByteArray === "function"
  ) {
    return Buffer.from(await body.transformToByteArray());
  }
  throw new Error("The S3 recovery source did not return readable bytes.");
};

const streamBytes = async (stream) => {
  const parts = [];
  let byteSize = 0;
  for await (const part of stream) {
    assert(part instanceof Uint8Array, "Artifact stream returned non-bytes.");
    parts.push(part);
    byteSize += part.byteLength;
  }
  return Buffer.concat(parts, byteSize);
};

const chunks = function* (bytes) {
  yield bytes;
};

const serviceActor = () => ({
  ...readFixture("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBH",
  actor_kind: "service",
  display_name: "Petra recovery service",
  created_at: "2026-09-04T07:00:00.000Z",
});

const modelActor = () => ({
  ...readFixture("actor"),
  actor_id: "actor_01ARZ3NDEKTSV4RRFFQ69G5FBE",
  actor_kind: "model",
  display_name: "Petra recovery extraction fixture",
  created_at: "2026-09-04T07:00:01.000Z",
});

const projection = {
  target: "neo4j_graph",
  projection_name: "petra.authority_graph",
  projection_version: "1.0.0",
  configuration_hash: `sha256:${"a".repeat(64)}`,
};

const sourceArtifactInput = (available) => {
  const artifact = readFixture("artifact");
  artifact.content_hash = available.contentHash;
  artifact.byte_size = available.byteSize;
  artifact.media_type = available.mediaType;
  artifact.created_by.actor_kind = "human";

  const manifest = readFixture("artifact-manifest");
  manifest.origin.response_metadata.content_length = available.byteSize;
  manifest.origin.response_metadata.content_type = available.mediaType;
  manifest.storage_ref = {
    storage_kind: "content_addressed_object",
    store_name: available.storeName,
    object_key: available.objectKey,
    content_hash: available.contentHash,
    availability: "available",
    verified_at: available.availableAt,
  };
  manifest.integrity.checked_at = available.availableAt;
  manifest.recorded_by.actor_kind = "human";

  const rightsDecision = readFixture("rights-decision");
  rightsDecision.decision_maker.actor_kind = "human";
  return { artifact, manifest, rightsDecision };
};

const parserArtifactInput = (source, available) => {
  const artifact = structuredClone(source.artifact);
  artifact.artifact_id = "artifact_01ARZ3NDEKTSV4RRFFQ69G5FB8";
  artifact.artifact_kind = "structured_text";
  artifact.media_type = available.mediaType;
  artifact.content_hash = available.contentHash;
  artifact.byte_size = available.byteSize;
  artifact.created_at = "2026-09-04T07:00:03.000Z";

  const manifest = structuredClone(source.manifest);
  manifest.artifact_manifest_id =
    "artifact_manifest_01ARZ3NDEKTSV4RRFFQ69G5FB9";
  manifest.artifact_id = artifact.artifact_id;
  manifest.rights_decision_id = "rights_decision_01ARZ3NDEKTSV4RRFFQ69G5FBA";
  manifest.origin = {
    origin_kind: "generated",
    generator_name: "petra-docling-adapter",
    generator_version: "1.0.0",
    generated_at: "2026-09-04T07:00:03.000Z",
    input_artifact_ids: [source.artifact.artifact_id],
  };
  manifest.storage_ref = {
    storage_kind: "content_addressed_object",
    store_name: available.storeName,
    object_key: available.objectKey,
    content_hash: available.contentHash,
    availability: "available",
    verified_at: available.availableAt,
  };
  manifest.integrity.checked_at = available.availableAt;
  manifest.recorded_at = "2026-09-04T07:00:03.000Z";

  const rightsDecision = structuredClone(source.rightsDecision);
  rightsDecision.rights_decision_id = manifest.rights_decision_id;
  rightsDecision.artifact_manifest_id = manifest.artifact_manifest_id;
  rightsDecision.source_location =
    "urn:petra:recovery:parser-output:01ARZ3NDEKTSV4RRFFQ69G5FB8";
  rightsDecision.observed_license = {
    statement:
      "Petra-generated parser output retained under source-copy terms.",
    source: "artifact",
  };
  rightsDecision.access_basis = "permission";
  rightsDecision.authorization_reference = "petra-recovery/1.0.0";
  rightsDecision.observed_at = "2026-09-04T07:00:03.000Z";
  rightsDecision.created_at = "2026-09-04T07:00:03.000Z";
  return { artifact, manifest, rightsDecision };
};

const commandFixtures = () => {
  const submit = readFixture("command-submit-change-set");
  const approve = readFixture("command-record-approval");
  const apply = readFixture("command-apply-change-set");
  assert(
    submit.command.command_name === "SubmitChangeSet" &&
      approve.command.command_name === "RecordApproval" &&
      apply.command.command_name === "ApplyChangeSet",
    "The recovery command fixtures have unexpected command kinds.",
  );
  submit.actor = {
    actor_id: modelActor().actor_id,
    actor_kind: "model",
  };
  submit.command.change_set.content.proposed_by = structuredClone(submit.actor);
  submit.command.change_set.content_hash = hashRecord(
    submit.command.change_set.content,
  );
  approve.command.approval.subject.change_set_content_hash =
    submit.command.change_set.content_hash;
  apply.command.change_set_content_hash =
    submit.command.change_set.content_hash;
  return { submit, approve, apply };
};

const domainFactory = () => {
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
    now: () => "2026-09-04T07:00:04.000Z",
  };
};

const seedAuthority = async (pool, artifactStore) => {
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    artifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);

  const human = readFixture("actor");
  await scopes.registerActor(human);
  await scopes.registerActor(serviceActor());
  await scopes.registerActor(modelActor());
  const project = readFixture("project");
  const author = readFixture("author");
  const work = readFixture("work");
  const workVersion = readFixture("work-version");
  await scopes.registerProjectRevision(project);
  await identities.registerAuthorRevision(author);
  await identities.registerWorkRevision(work);
  await identities.registerWorkVersionRevision(workVersion);

  const sourceBytes = Buffer.from("%PDF-1.7\nPetra recovery fixture\n");
  const sourceStage = await artifactStore.stage({
    bytes: chunks(sourceBytes),
    declaredByteSize: sourceBytes.byteLength,
    declaredMediaType: "application/pdf",
    expectedContentHash: hashBytes(sourceBytes),
  });
  const sourceAvailable = await artifactStore.makeAvailable(sourceStage);
  const sourceArtifact = sourceArtifactInput(sourceAvailable);
  await artifacts.registerVerifiedAcquisition(sourceArtifact);

  const parserBytes = Buffer.from('{"parser":"recovery-output"}\n');
  const parserStage = await artifactStore.stage({
    bytes: chunks(parserBytes),
    declaredByteSize: parserBytes.byteLength,
    declaredMediaType: "application/json",
    expectedContentHash: hashBytes(parserBytes),
  });
  const parserAvailable = await artifactStore.makeAvailable(parserStage);
  const parserArtifact = parserArtifactInput(sourceArtifact, parserAvailable);
  await artifacts.registerVerifiedAcquisition(parserArtifact);

  const document = readFixture("parsed-document");
  const block = readFixture("structural-block");
  const span = readFixture("source-span");
  document.source_artifact_content_hash = sourceArtifact.artifact.content_hash;
  document.created_by.actor_kind = "human";
  span.artifact_content_hash = sourceArtifact.artifact.content_hash;
  span.created_by.actor_kind = "human";
  await documents.registerDocumentBundle({
    sourceArtifactManifestId: sourceArtifact.manifest.artifact_manifest_id,
    document,
    blocks: [block],
    spans: [span],
  });

  const claim = readFixture("claim");
  claim.created_by = {
    actor_id: modelActor().actor_id,
    actor_kind: "model",
  };
  assert(claim.basis.basis_kind === "source", "Expected source Claim.");
  claim.basis.proposed_by = structuredClone(claim.created_by);
  const assertion = readFixture("assertion");
  assertion.created_by = structuredClone(claim.created_by);
  await evidence.proposeClaim(claim);
  await evidence.proposeAssertion(assertion);

  const commands = commandFixtures();
  const changes = new PostgresChangeControlAuthorityRepository(
    pool,
    { authorize: () => true },
    domainFactory(),
  );
  await changes.executeCommand(commands.submit);
  await changes.executeCommand(commands.approve);
  await changes.executeCommand(commands.apply);
  const outboxes = await changes.getOutboxRecords({
    projectId: project.project_id,
    target: "neo4j_graph",
  });
  assert(outboxes.length === 1, "Expected one promoted graph outbox.");
  const currentClaim = await evidence.getClaim(claim.claim_id);
  const currentAssertion = await evidence.getAssertion(assertion.assertion_id);
  assert(
    currentClaim?.revision === 2 && currentAssertion?.revision === 2,
    "The recovery fixture did not reach trusted revision two.",
  );

  return {
    schema_name: "petra.m1-recovery-source",
    revision: 1,
    project: {
      project_id: project.project_id,
      revision: project.revision,
      record_hash: hashRecord(project),
    },
    work: {
      work_id: work.work_id,
      revision: work.revision,
      record_hash: hashRecord(work),
    },
    work_version: {
      work_version_id: workVersion.work_version_id,
      revision: workVersion.revision,
      record_hash: hashRecord(workVersion),
    },
    source_span: {
      source_span_id: span.source_span_id,
      revision: span.revision,
      record_hash: hashRecord(span),
    },
    claim: {
      claim_id: currentClaim.claim_id,
      revision: currentClaim.revision,
      record_hash: hashRecord(currentClaim),
    },
    assertion: {
      assertion_id: currentAssertion.assertion_id,
      revision: currentAssertion.revision,
      record_hash: hashRecord(currentAssertion),
    },
    artifacts: [sourceAvailable, parserAvailable].map((available) => ({
      content_hash: available.contentHash,
      byte_size: available.byteSize,
      media_type: available.mediaType,
      object_key: available.objectKey,
    })),
    outbox: {
      count: outboxes.length,
      ids: outboxes.map((record) => record.outbox_id),
      target_sequences: outboxes.map((record) => record.target_sequence),
    },
  };
};

const backupArtifacts = async (client, bucket) => {
  const listed = await client.send(
    new ListObjectsV2Command({ Bucket: bucket }),
  );
  assert(
    !listed.IsTruncated,
    "The bounded recovery fixture unexpectedly paged.",
  );
  const objects = [];
  for (const item of listed.Contents ?? []) {
    assert(
      item.Key !== undefined,
      "The artifact listing omitted an object key.",
    );
    const object = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: item.Key }),
    );
    objects.push({
      key: item.Key,
      bytes: await bodyBytes(object.Body),
      contentType: object.ContentType,
      metadata: object.Metadata ?? {},
    });
  }
  return objects;
};

const restoreArtifacts = async (client, bucket, objects) => {
  await createBucket(client, bucket);
  for (const object of objects) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: object.key,
        Body: object.bytes,
        ContentLength: object.bytes.byteLength,
        ...(object.contentType === undefined
          ? {}
          : { ContentType: object.contentType }),
        Metadata: object.metadata,
      }),
    );
  }
};

const verifyRecovery = async (pool, artifactStore, neo4jUri, source) => {
  const scopes = new PostgresResearchScopeRepository(pool);
  const identities = new PostgresScholarlyIdentityRepository(pool);
  const artifacts = new PostgresArtifactAuthorityRepository(
    pool,
    artifactStore,
  );
  const documents = new PostgresDocumentAuthorityRepository(pool);
  const evidence = new PostgresEvidenceAuthorityRepository(pool);
  const changes = new PostgresChangeControlAuthorityRepository(
    pool,
    { authorize: () => false },
    domainFactory(),
  );
  const projectionAuthority = new PostgresGraphProjectionAuthorityRepository(
    pool,
  );

  const [project, work, workVersion, span, claim, assertion] =
    await Promise.all([
      scopes.getProject(source.project.project_id),
      identities.getWork(source.work.work_id),
      identities.getWorkVersion(source.work_version.work_version_id),
      documents.getSourceSpan(source.source_span.source_span_id),
      evidence.getClaim(source.claim.claim_id),
      evidence.getAssertion(source.assertion.assertion_id),
    ]);
  for (const [value, expected, label] of [
    [project, source.project, "Project"],
    [work, source.work, "Work"],
    [workVersion, source.work_version, "WorkVersion"],
    [span, source.source_span, "SourceSpan"],
    [claim, source.claim, "Claim"],
    [assertion, source.assertion, "Assertion"],
  ]) {
    assert(value !== undefined, `${label} is missing after restore.`);
    assert(
      value.revision === expected.revision &&
        hashRecord(value) === expected.record_hash,
      `${label} identity or canonical record changed during restore.`,
    );
  }

  for (const expected of source.artifacts) {
    const available = await artifactStore.inspectByHash(expected.content_hash, {
      byteSize: expected.byte_size,
      mediaType: expected.media_type,
    });
    assert(
      available?.objectKey === expected.object_key,
      `Artifact ${expected.content_hash} is unavailable after restore.`,
    );
    const read = await artifactStore.readByHash(expected.content_hash);
    const bytes = await streamBytes(read.bytes);
    assert(
      hashBytes(bytes) === expected.content_hash,
      `Artifact ${expected.content_hash} bytes changed during restore.`,
    );
  }

  const outboxes = await changes.getOutboxRecords({
    projectId: source.project.project_id,
    target: "neo4j_graph",
  });
  assert(
    canonicalize(outboxes.map((record) => record.outbox_id)) ===
      canonicalize(source.outbox.ids) &&
      canonicalize(outboxes.map((record) => record.target_sequence)) ===
        canonicalize(source.outbox.target_sequences),
    "The restored graph outbox stream changed identity or order.",
  );

  const driver = neo4j.driver(
    neo4jUri,
    neo4j.auth.basic("neo4j", "petra-recovery-only"),
  );
  const graph = new Neo4jAuthorityGraphStore({ driver });
  try {
    await graph.prepare();
    const projector = new ScientificGraphProjector({
      authority: projectionAuthority,
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
          "graph_projection_record_01ARZ3NDEKTSV4RRFFQ69G5FF0",
        now: () => "2026-09-04T07:00:05.000Z",
        serviceActor: {
          actor_id: serviceActor().actor_id,
          actor_kind: "service",
        },
      },
    });
    const receipts = await projector.rebuild(
      source.project.project_id,
      projection,
      outboxes,
    );
    const assertionView = await graph.getObject(
      source.project.project_id,
      source.assertion.assertion_id,
    );
    const provenance = await graph.getProvenancePath(
      source.project.project_id,
      source.assertion.assertion_id,
    );
    assert(
      receipts.length === source.outbox.count &&
        assertionView?.kind === "ASSERTS" &&
        assertionView.authoritativeRevision === source.assertion.revision &&
        assertionView.recordHash === source.assertion.record_hash,
      "Neo4j rebuild did not recover the exact active Assertion edge.",
    );
    assert(
      provenance?.claim.id === source.claim.claim_id &&
        provenance.sourceSpans.some(
          (item) => item.id === source.source_span.source_span_id,
        ),
      "The rebuilt graph lost its authoritative provenance path.",
    );
    return {
      graph_receipts: receipts.length,
      assertion_edge_id: assertionView.assertionId,
      provenance_source_span_ids: provenance.sourceSpans.map((item) => item.id),
    };
  } finally {
    await driver.close();
  }
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
      count +
      result.stdout
        .toString("utf8")
        .split("\n")
        .filter((line) => line !== "").length,
    0,
  );
};

let failure;
let sourcePool;
let restoredPool;
let sourceS3;
let restoredS3;
try {
  const build = await requireRun("npm", ["run", "build:packages"]);
  process.stdout.write(build.stdout);
  await requireRun(
    "docker",
    composeArgs(
      "up",
      "--detach",
      "--wait",
      "postgres-source",
      "postgres-restored",
      "artifacts-source",
      "artifacts-restored",
      "neo4j-restored",
    ),
  );
  const migration = await requireRun(
    "docker",
    composeArgs("run", "--rm", "migrations", "migrate"),
  );
  process.stdout.write(migration.stdout);

  const [
    sourcePostgresPort,
    restoredPostgresPort,
    sourceS3Port,
    restoredS3Port,
    neo4jPort,
  ] = await Promise.all([
    servicePort("postgres-source", "5432"),
    servicePort("postgres-restored", "5432"),
    servicePort("artifacts-source", "8333"),
    servicePort("artifacts-restored", "8333"),
    servicePort("neo4j-restored", "7687"),
  ]);
  sourcePool = new Pool({
    connectionString: `postgresql://petra:${postgresPassword}@127.0.0.1:${sourcePostgresPort}/petra`,
  });
  sourceS3 = createS3Client(sourceS3Port);
  restoredS3 = createS3Client(restoredS3Port);
  await createBucket(sourceS3, sourceBucket);
  const sourceStore = new S3ArtifactStore({
    client: sourceS3,
    bucket: sourceBucket,
    storeName: "petra-recovery",
    namespace: "petra-recovery",
    now: () => new Date("2026-09-04T07:00:02.000Z"),
    createStageId: (() => {
      let index = 0;
      return () => `recovery-stage-${++index}`;
    })(),
  });
  const source = await seedAuthority(sourcePool, sourceStore);

  const dump = await requireRun(
    "docker",
    composeArgs(
      "exec",
      "--no-TTY",
      "postgres-source",
      "pg_dump",
      "--username=petra",
      "--dbname=petra",
      "--format=plain",
      "--no-owner",
      "--no-privileges",
    ),
  );
  assert(dump.stdout.byteLength > 0, "PostgreSQL backup is empty.");
  const artifactBackup = await backupArtifacts(sourceS3, sourceBucket);
  assert(
    artifactBackup.length === source.artifacts.length,
    "Artifact backup did not contain every authoritative object.",
  );

  await requireRun(
    "docker",
    composeArgs(
      "exec",
      "--no-TTY",
      "postgres-restored",
      "psql",
      "--username=petra",
      "--dbname=petra",
      "--set=ON_ERROR_STOP=1",
    ),
    { input: dump.stdout },
  );
  await requireRun(
    "docker",
    composeArgs(
      "run",
      "--rm",
      "--no-deps",
      "--env",
      "FLYWAY_URL=jdbc:postgresql://postgres-restored:5432/petra?ApplicationName=petra-recovery-validate",
      "migrations",
      "validate",
    ),
  );
  await restoreArtifacts(restoredS3, restoredBucket, artifactBackup);
  const restoredStore = new S3ArtifactStore({
    client: restoredS3,
    bucket: restoredBucket,
    storeName: "petra-recovery",
    namespace: "petra-recovery",
  });
  restoredPool = new Pool({
    connectionString: `postgresql://petra:${postgresPassword}@127.0.0.1:${restoredPostgresPort}/petra`,
  });
  const recovered = await verifyRecovery(
    restoredPool,
    restoredStore,
    `bolt://127.0.0.1:${neo4jPort}`,
    source,
  );
  const migrationCount = await restoredPool.query(
    "SELECT count(*)::text AS count FROM public.flyway_schema_history WHERE success",
  );
  assert(
    migrationCount.rows[0]?.count === "18",
    "The restored Flyway history does not contain all 18 migrations.",
  );

  console.log(
    JSON.stringify(
      {
        schema_name: "petra.m1-recovery-result",
        revision: 1,
        state: "passed",
        postgres: {
          dump_hash: hashBytes(dump.stdout),
          dump_byte_size: dump.stdout.byteLength,
          restored_migrations: 18,
          project_id: source.project.project_id,
          claim: source.claim,
          assertion: source.assertion,
          outbox: source.outbox,
        },
        artifacts: {
          restored_count: artifactBackup.length,
          content_hashes: source.artifacts.map((item) => item.content_hash),
        },
        neo4j: recovered,
        authority_boundary: {
          postgresql_is_authoritative: true,
          neo4j_was_rebuilt_not_restored: true,
          result_is_scientific_evidence: false,
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  failure = error;
  const logs = await run("docker", composeArgs("logs", "--tail=160"));
  process.stderr.write(`${logs.stdout.toString("utf8")}\n${logs.stderr || ""}`);
} finally {
  await Promise.allSettled([
    sourcePool?.end(),
    restoredPool?.end(),
    Promise.resolve(sourceS3?.destroy()),
    Promise.resolve(restoredS3?.destroy()),
  ]);
  const cleanup = await run(
    "docker",
    composeArgs("down", "--volumes", "--remove-orphans"),
  );
  if (cleanup.code !== 0 && failure === undefined) {
    failure = new Error(cleanup.stderr || cleanup.stdout.toString("utf8"));
  }
  const remaining = await resourceCount();
  if (remaining !== 0 && failure === undefined) {
    failure = new Error(
      `Disposable recovery cleanup left ${remaining} labeled resources.`,
    );
  }
}

if (failure !== undefined) throw failure;
