import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

import { runner as runNodePgMigrate } from "node-pg-migrate";
import pg from "pg";

const { Client } = pg;

const root = resolve(import.meta.dirname, "../..");
const experimentRoot = resolve(import.meta.dirname);
const composeFile = join(experimentRoot, "compose.yaml");
const migrationRoot = join(experimentRoot, "migrations");
const fixtureRoot = join(experimentRoot, "fixtures");
const cacheRoot = join(root, ".cache", "disc-04");
const postgresPassword = "petra-disc04-only";
const flywayImage =
  "flyway/flyway@sha256:e19dbd5c73a1487d825ffe02f9e11e0ce3f37b80bbc012ece1cba15af4f9f9ce";
const postgresImage =
  "postgres@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280";
const candidates = ["flyway", "node-pg-migrate"];

const evidence = {
  experiment: "DISC-04",
  startedAt: new Date().toISOString(),
  environment: {
    platform: `${process.platform}/${process.arch}`,
    node: process.version,
    postgresImage,
    flywayImage,
    nodePgMigrate: "9.0.0",
    pg: "8.16.3",
  },
  candidates: Object.fromEntries(
    candidates.map((candidate) => [candidate, { gates: {} }]),
  ),
  sharedGates: {},
  comparisons: {},
};

let projectName;
let hostPort;
let runRoot;
let containerSequence = 0;

function compact(value) {
  return value.replaceAll(/\s+/g, " ").trim();
}

function command(program, args, options = {}) {
  const started = performance.now();
  return new Promise((resolveCommand) => {
    const child = spawn(program, args, {
      cwd: options.cwd ?? root,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, options.timeoutMs)
      : undefined;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code, signal) => {
      if (timeout) clearTimeout(timeout);
      resolveCommand({
        code: code ?? 1,
        signal,
        timedOut,
        stdout,
        stderr,
        durationMs: Math.round(performance.now() - started),
      });
    });
  });
}

async function requireCommand(program, args, options) {
  const result = await command(program, args, options);
  if (result.code !== 0) {
    throw new Error(
      `${program} ${args.join(" ")} failed (${result.code}): ${compact(
        `${result.stdout}\n${result.stderr}`,
      )}`,
    );
  }
  return result;
}

function composeArgs(...args) {
  return ["compose", "-p", projectName, "-f", composeFile, ...args];
}

function hostDatabaseUrl(database) {
  return `postgresql://petra:${postgresPassword}@127.0.0.1:${hostPort}/${database}`;
}

function flywayDatabaseUrl(database) {
  return `jdbc:postgresql://postgres:5432/${database}?ApplicationName=petra-disc04-flyway`;
}

async function withClient(database, operation) {
  const client = new Client({ connectionString: hostDatabaseUrl(database) });
  await client.connect();
  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

async function recreateDatabase(database) {
  if (!/^[a-z][a-z0-9_]+$/.test(database)) {
    throw new Error(`Unsafe DISC-04 database name: ${database}`);
  }
  await withClient("postgres", async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${database}"`);
  });
}

async function query(database, text, values = []) {
  return withClient(database, (client) => client.query(text, values));
}

async function queryFails(database, text) {
  try {
    await query(database, text);
    return false;
  } catch {
    return true;
  }
}

async function tableExists(database, table) {
  const result = await query(
    database,
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${table}`],
  );
  return result.rows[0].exists;
}

async function indexExists(database, index) {
  const result = await query(
    database,
    "SELECT to_regclass($1) IS NOT NULL AS exists",
    [`public.${index}`],
  );
  return result.rows[0].exists;
}

async function terminateInterruptedFlywaySessions(database) {
  const result = await query(
    database,
    `SELECT count(*) FILTER (WHERE terminated)::int AS terminated
       FROM (
         SELECT pg_terminate_backend(pid) AS terminated
           FROM pg_stat_activity
          WHERE datname = current_database()
            AND application_name = 'petra-disc04-flyway'
            AND pid <> pg_backend_pid()
       ) AS interrupted_sessions`,
  );
  return result.rows[0].terminated;
}

function delay(durationMs) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, durationMs));
}

function candidateFilename(candidate, sourceName) {
  if (candidate === "flyway") {
    const match = /^(\d{3})_(.+)$/.exec(sourceName);
    if (!match)
      throw new Error(`Cannot create Flyway filename from ${sourceName}`);
    return `V${match[1]}__${match[2]}`;
  }
  return sourceName;
}

async function prepareMigrations(candidate, scenario, sources) {
  const directory = join(runRoot, candidate, scenario);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  for (const source of sources) {
    const sourcePath = join(source.root ?? migrationRoot, source.name);
    const targetName = candidateFilename(candidate, source.name);
    await writeFile(join(directory, targetName), await readFile(sourcePath));
  }
  return directory;
}

async function addMigration(candidate, directory, source) {
  const sourcePath = join(source.root ?? migrationRoot, source.name);
  const targetName = candidateFilename(candidate, source.name);
  await writeFile(join(directory, targetName), await readFile(sourcePath));
  return join(directory, targetName);
}

function startFlyway(database, directory, action = "migrate") {
  containerSequence += 1;
  const containerName = `${projectName}-flyway-${containerSequence}`;
  return {
    containerName,
    result: command(
      "docker",
      [
        "run",
        "--rm",
        "--name",
        containerName,
        "--network",
        `${projectName}_default`,
        "--volume",
        `${directory}:/flyway/sql:ro`,
        flywayImage,
        `-url=${flywayDatabaseUrl(database)}`,
        "-user=petra",
        `-password=${postgresPassword}`,
        "-connectRetries=10",
        "-lockRetryCount=10",
        "-postgresql.transactional.lock=false",
        action,
      ],
      { timeoutMs: 30_000 },
    ),
  };
}

async function runFlyway(database, directory, action = "migrate") {
  return startFlyway(database, directory, action).result;
}

async function runNodePg(database, directory, options = {}) {
  const messages = [];
  const started = performance.now();
  try {
    const applied = await runNodePgMigrate({
      databaseUrl: hostDatabaseUrl(database),
      dir: directory,
      direction: "up",
      migrationsTable: "pgmigrations",
      schema: "public",
      checkOrder: true,
      singleTransaction: options.singleTransaction ?? true,
      advisoryLockMode: "wait",
      log: (message) => messages.push(String(message)),
      verbose: false,
    });
    return {
      code: 0,
      stdout: messages.join("\n"),
      stderr: "",
      durationMs: Math.round(performance.now() - started),
      applied: applied.length,
    };
  } catch (error) {
    return {
      code: 1,
      stdout: messages.join("\n"),
      stderr:
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      durationMs: Math.round(performance.now() - started),
      applied: 0,
    };
  }
}

function runMigration(candidate, database, directory, options) {
  return candidate === "flyway"
    ? runFlyway(database, directory)
    : runNodePg(database, directory, options);
}

async function historyCount(candidate, database) {
  const table =
    candidate === "flyway" ? "flyway_schema_history" : "pgmigrations";
  const predicate = candidate === "flyway" ? "WHERE success" : "";
  const result = await query(
    database,
    `SELECT count(*)::int AS count FROM ${table} ${predicate}`,
  );
  return result.rows[0].count;
}

async function inspectSchema(database) {
  const excluded = ["flyway_schema_history", "pgmigrations"];
  const columns = await query(
    database,
    `SELECT table_name, column_name, ordinal_position, data_type, udt_name,
            is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name <> ALL($1::text[])
      ORDER BY table_name, ordinal_position`,
    [excluded],
  );
  const constraints = await query(
    database,
    `SELECT relation.relname AS table_name,
            constraint_row.conname AS constraint_name,
            constraint_row.contype AS constraint_type,
            pg_get_constraintdef(constraint_row.oid, true) AS definition
       FROM pg_constraint AS constraint_row
       JOIN pg_class AS relation ON relation.oid = constraint_row.conrelid
       JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname <> ALL($1::text[])
      ORDER BY relation.relname, constraint_row.conname`,
    [excluded],
  );
  const indexes = await query(
    database,
    `SELECT tablename AS table_name, indexname AS index_name, indexdef AS definition
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename <> ALL($1::text[])
      ORDER BY tablename, indexname`,
    [excluded],
  );
  const triggers = await query(
    database,
    `SELECT event_object_table AS table_name, trigger_name,
            action_timing, event_manipulation, action_statement
       FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name, event_manipulation`,
  );
  const domains = await query(
    database,
    `SELECT domain_name, data_type, udt_name
       FROM information_schema.domains
      WHERE domain_schema = 'public'
      ORDER BY domain_name`,
  );
  return {
    columns: columns.rows,
    constraints: constraints.rows,
    indexes: indexes.rows,
    triggers: triggers.rows,
    domains: domains.rows,
  };
}

function record(candidate, gate, pass, details) {
  evidence.candidates[candidate].gates[gate] = { pass, details };
}

async function bootstrapAndNoop(candidate) {
  const database = `${candidate === "flyway" ? "fly" : "node"}_empty`;
  await recreateDatabase(database);
  const directory = await prepareMigrations(candidate, "empty", [
    { name: "001_evidence_spine.sql" },
    { name: "002_artifact_authority.sql" },
  ]);
  const first = await runMigration(candidate, database, directory);
  const second = await runMigration(candidate, database, directory);
  const count = first.code === 0 ? await historyCount(candidate, database) : 0;
  const schema = first.code === 0 ? await inspectSchema(database) : null;
  const expectedObjects =
    schema !== null &&
    (await tableExists(database, "domain_event")) &&
    (await tableExists(database, "outbox_record")) &&
    (await tableExists(database, "projection_checkpoint")) &&
    (await tableExists(database, "artifact_manifest"));
  record(candidate, "T01", first.code === 0 && expectedObjects, {
    migrationCount: count,
    durationMs: first.durationMs,
    diagnostic: compact(`${first.stdout}\n${first.stderr}`).slice(0, 800),
  });
  record(
    candidate,
    "T02",
    first.code === 0 && second.code === 0 && count === 2,
    {
      secondRunDurationMs: second.durationMs,
      migrationCountAfterSecondRun: count,
      diagnostic: compact(`${second.stdout}\n${second.stderr}`).slice(0, 800),
    },
  );
  return { database, schema };
}

async function seedV001(database) {
  await query(
    database,
    await readFile(join(fixtureRoot, "seed-v001.sql"), "utf8"),
  );
}

async function upgradeSeeded(candidate) {
  const database = `${candidate === "flyway" ? "fly" : "node"}_upgrade`;
  await recreateDatabase(database);
  const directory = await prepareMigrations(candidate, "upgrade", [
    { name: "001_evidence_spine.sql" },
  ]);
  const v1 = await runMigration(candidate, database, directory);
  if (v1.code !== 0)
    throw new Error(`${candidate} could not apply V001: ${v1.stderr}`);
  await seedV001(database);
  await addMigration(candidate, directory, {
    name: "002_artifact_authority.sql",
  });
  const v2 = await runMigration(candidate, database, directory);
  const state = await query(
    database,
    `SELECT evidence.authority_scope,
            event.event_position,
            checkpoint.last_event_position,
            outbox.event_position AS outbox_event_position
       FROM evidence_record AS evidence
       CROSS JOIN domain_event AS event
       CROSS JOIN projection_checkpoint AS checkpoint
       CROSS JOIN outbox_record AS outbox`,
  );
  const row = state.rows[0];
  const appendOnly = await queryFails(
    database,
    "UPDATE domain_event SET event_type = 'Changed' WHERE event_position = 1",
  );
  const duplicateIdempotency = await queryFails(
    database,
    `INSERT INTO domain_event (
       event_id, stream_id, stream_revision, event_type,
       schema_version, idempotency_key, payload
     ) VALUES (
       '30000000-0000-4000-8000-000000000002',
       '10000000-0000-4000-8000-000000000002',
       1, 'Duplicate', '1.0.0', 'disc04-seed-event-1',
       '{"schema_version":"1.0.0"}'::jsonb
     )`,
  );
  const invalidJsonVersion = await queryFails(
    database,
    `INSERT INTO evidence_record (
       evidence_id, revision, project_id, evidence_kind,
       schema_version, payload, authority_scope
     ) VALUES (
       '20000000-0000-4000-8000-000000000002', 1,
       '10000000-0000-4000-8000-000000000001', 'claim',
       '1.0.0', '{"schema_version":"2.0.0"}'::jsonb, 'proposal'
     )`,
  );
  const preserved =
    v2.code === 0 &&
    row?.authority_scope === "proposal" &&
    Number(row?.event_position) === 1 &&
    Number(row?.last_event_position) === 1 &&
    Number(row?.outbox_event_position) === 1;
  record(
    candidate,
    "T03",
    preserved && appendOnly && duplicateIdempotency && invalidJsonVersion,
    {
      preserved,
      appendOnly,
      duplicateIdempotency,
      invalidJsonVersion,
      durationMs: v1.durationMs + v2.durationMs,
    },
  );
  return { database, schema: await inspectSchema(database) };
}

async function mutationDetection(candidate) {
  const database = `${candidate === "flyway" ? "fly" : "node"}_mutation`;
  await recreateDatabase(database);
  const directory = await prepareMigrations(candidate, "mutation", [
    { name: "001_evidence_spine.sql" },
  ]);
  const first = await runMigration(candidate, database, directory);
  if (first.code !== 0)
    throw new Error(`${candidate} mutation setup failed: ${first.stderr}`);
  const v1Name = candidateFilename(candidate, "001_evidence_spine.sql");
  const v1Path = join(directory, v1Name);
  await writeFile(
    v1Path,
    `${await readFile(v1Path, "utf8")}\n-- altered after application\n`,
  );
  await addMigration(candidate, directory, {
    name: "002_artifact_authority.sql",
  });
  const changed = await runMigration(candidate, database, directory);
  const laterMigrationApplied = await tableExists(
    database,
    "artifact_manifest",
  );
  const rejectedBeforeLaterWork = changed.code !== 0 && !laterMigrationApplied;
  record(candidate, "T04", rejectedBeforeLaterWork, {
    nativeMutationRejected: changed.code !== 0,
    laterMigrationApplied,
    durationMs: changed.durationMs,
    diagnostic: compact(`${changed.stdout}\n${changed.stderr}`).slice(0, 1200),
  });
}

async function concurrency(candidate) {
  const database = `${candidate === "flyway" ? "fly" : "node"}_concurrent`;
  await recreateDatabase(database);
  const directory = await prepareMigrations(candidate, "concurrent", [
    { name: "001_evidence_spine.sql" },
    { name: "002_artifact_authority.sql" },
  ]);
  const attempts = await Promise.all([
    runMigration(candidate, database, directory),
    runMigration(candidate, database, directory),
  ]);
  const count = await historyCount(candidate, database).catch(() => 0);
  const bothExitedCleanly = attempts.every((attempt) => attempt.code === 0);
  record(candidate, "T05", bothExitedCleanly && count === 2, {
    exitCodes: attempts.map((attempt) => attempt.code),
    durationsMs: attempts.map((attempt) => attempt.durationMs),
    migrationCount: count,
    diagnostics: attempts.map((attempt) =>
      compact(`${attempt.stdout}\n${attempt.stderr}`).slice(0, 500),
    ),
  });
}

async function transactionalFailure(candidate) {
  const database = `${candidate === "flyway" ? "fly" : "node"}_rollback`;
  await recreateDatabase(database);
  const directory = await prepareMigrations(candidate, "rollback", [
    { name: "001_evidence_spine.sql" },
  ]);
  const first = await runMigration(candidate, database, directory);
  if (first.code !== 0)
    throw new Error(`${candidate} rollback setup failed: ${first.stderr}`);
  await addMigration(candidate, directory, {
    root: fixtureRoot,
    name: "002_failing_transaction.sql",
  });
  const failed = await runMigration(candidate, database, directory);
  const probeExists = await tableExists(database, "transaction_rollback_probe");
  const count = await historyCount(candidate, database);
  const diagnostic = compact(`${failed.stdout}\n${failed.stderr}`);
  record(
    candidate,
    "T06",
    failed.code !== 0 &&
      !probeExists &&
      count === 1 &&
      diagnostic.includes("002"),
    {
      failedAsExpected: failed.code !== 0,
      probeExists,
      migrationCount: count,
      durationMs: failed.durationMs,
      diagnostic: diagnostic.slice(0, 1200),
    },
  );
}

async function nontransactionalRecovery(candidate) {
  const database = `${candidate === "flyway" ? "fly" : "node"}_nontransactional`;
  await recreateDatabase(database);
  const directory = await prepareMigrations(candidate, "nontransactional", [
    { name: "001_evidence_spine.sql" },
    { name: "002_artifact_authority.sql" },
  ]);
  const head = await runMigration(candidate, database, directory);
  if (head.code !== 0) {
    throw new Error(
      `${candidate} nontransactional setup failed: ${head.stderr}`,
    );
  }
  const migrationPath = await addMigration(candidate, directory, {
    root: fixtureRoot,
    name: "003_nontransactional_probe.sql",
  });
  if (candidate === "flyway") {
    await writeFile(`${migrationPath}.conf`, "executeInTransaction=false\n");
  }
  if (candidate === "flyway") {
    const running = startFlyway(database, directory);
    let partialIndex = false;
    for (let attempt = 0; attempt < 150; attempt += 1) {
      partialIndex = await indexExists(
        database,
        "evidence_record_payload_schema_version",
      );
      if (partialIndex) break;
      await delay(100);
    }
    const stopped = partialIndex
      ? await command("docker", ["stop", "--time", "1", running.containerName])
      : { code: 1, stdout: "", stderr: "index was not created before timeout" };
    const interrupted = await running.result;
    const terminatedSessions =
      await terminateInterruptedFlywaySessions(database);
    const repaired = await runFlyway(database, directory, "repair");
    await query(
      database,
      "DROP INDEX CONCURRENTLY IF EXISTS evidence_record_payload_schema_version",
    );
    const cleanSql = (await readFile(migrationPath, "utf8")).replace(
      "\nSELECT pg_sleep(30);\n",
      "\n",
    );
    await writeFile(migrationPath, cleanSql);
    const recovered = await runMigration(candidate, database, directory);
    const count =
      recovered.code === 0 ? await historyCount(candidate, database) : 0;
    record(
      candidate,
      "T07",
      stopped.code === 0 &&
        interrupted.code !== 0 &&
        partialIndex &&
        repaired.code === 0 &&
        recovered.code === 0 &&
        count === 3,
      {
        explicitOptOut: "V003 sidecar: executeInTransaction=false",
        processInterrupted: stopped.code === 0 && interrupted.code !== 0,
        partialIndex,
        terminatedStaleSessions: terminatedSessions,
        repairExitedCleanly: repaired.code === 0,
        recoveryExitedCleanly: recovered.code === 0,
        migrationCount: count,
        interruptionDiagnostic: compact(
          `${interrupted.stdout}\n${interrupted.stderr}`,
        ).slice(0, 1200),
        repairDiagnostic: compact(
          `${repaired.stdout}\n${repaired.stderr}`,
        ).slice(0, 1200),
        recoveryDiagnostic: compact(
          `${recovered.stdout}\n${recovered.stderr}`,
        ).slice(0, 1200),
      },
    );
  } else {
    const interrupted = await runMigration(candidate, database, directory, {
      singleTransaction: false,
    });
    const partialIndex = await indexExists(
      database,
      "evidence_record_payload_schema_version",
    );
    record(candidate, "T07", false, {
      explicitOptOut: "unavailable to a forward-only plain-SQL migration",
      firstRunFailed: interrupted.code !== 0,
      partialIndex,
      reason:
        "singleTransaction=false still wraps each SQL migration; CREATE INDEX CONCURRENTLY is rejected inside that transaction unless the migration becomes runner-specific JavaScript.",
      diagnostic: compact(`${interrupted.stdout}\n${interrupted.stderr}`).slice(
        0,
        1200,
      ),
    });
  }
}

function sameSchema(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function runCandidate(candidate) {
  const started = performance.now();
  const empty = await bootstrapAndNoop(candidate);
  const upgraded = await upgradeSeeded(candidate);
  const equivalent = sameSchema(empty.schema, upgraded.schema);
  record(candidate, "T09", equivalent, {
    emptyToHeadEqualsUpgrade: equivalent,
    inspectedSections: Object.keys(empty.schema),
  });
  await mutationDetection(candidate);
  await concurrency(candidate);
  await transactionalFailure(candidate);
  await nontransactionalRecovery(candidate);
  evidence.candidates[candidate].durationMs = Math.round(
    performance.now() - started,
  );
  record(candidate, "T10", true, {
    totalDurationMs: evidence.candidates[candidate].durationMs,
    dependency:
      candidate === "flyway"
        ? flywayImage
        : "node-pg-migrate@9.0.0 + pg@8.16.3",
    runtimeBoundary: candidate === "flyway" ? "Docker/JVM" : "Node.js",
    diagnosticsCapturedPerGate: true,
  });
}

async function startStack() {
  await mkdir(cacheRoot, { recursive: true });
  runRoot = await mkdtemp(join(cacheRoot, "run-"));
  projectName = `petra-disc04-${Date.now()}`;
  const coldStart = await requireCommand(
    "docker",
    composeArgs("up", "--detach", "--wait"),
  );
  const port = await requireCommand(
    "docker",
    composeArgs("port", "postgres", "5432"),
  );
  const match = /:(\d+)\s*$/.exec(port.stdout);
  if (!match)
    throw new Error(
      `Could not parse disposable PostgreSQL port: ${port.stdout}`,
    );
  hostPort = Number(match[1]);
  evidence.harness = {
    composeProject: projectName,
    coldStartDurationMs: coldStart.durationMs,
    hostPortWasDynamic: true,
  };
}

async function stopStack() {
  if (!projectName) return;
  const stopped = await command(
    "docker",
    composeArgs("down", "--volumes", "--remove-orphans"),
  );
  evidence.harness = {
    ...evidence.harness,
    cleanupExitCode: stopped.code,
    cleanupDurationMs: stopped.durationMs,
  };
}

async function main() {
  let fatal;
  try {
    await startStack();
    for (const candidate of candidates) {
      await runCandidate(candidate);
    }
    evidence.comparisons.finalSchemaEquivalentAcrossCandidates = sameSchema(
      await inspectSchema("fly_empty"),
      await inspectSchema("node_empty"),
    );
    evidence.sharedGates.T08 = {
      status: "companion harness",
      normalCommand: "npm run disc04:integration",
      controlledFailureCommand:
        "node experiments/disc-04/run-integration.mjs --force-test-failure",
      evidence: "experiments/disc-04/EVIDENCE.md",
    };
  } catch (error) {
    fatal =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    evidence.fatal = fatal;
  } finally {
    await stopStack();
    if (runRoot) await rm(runRoot, { recursive: true, force: true });
    evidence.completedAt = new Date().toISOString();
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  }
  if (fatal) process.exitCode = 1;
}

await main();
