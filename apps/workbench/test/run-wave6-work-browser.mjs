import { spawn } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const backendHarness = resolve(
  root,
  "scripts/test-wave4-cumulative-integration.mjs",
);
const instrumentedHarness = resolve(
  root,
  `scripts/.wave6-work-browser-${process.pid}.mjs`,
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 6 Work browser trace requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const replaceOnce = (source, expected, replacement) => {
  const first = source.indexOf(expected);
  if (first < 0 || source.indexOf(expected, first + expected.length) >= 0) {
    throw new Error(
      "The exact cumulative harness boundary changed; Work browser instrumentation was not applied.",
    );
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + expected.length)}`;
};

const retryFixture = `const seedWave6RetryableWork = async (pool) => {
  const workUnits = new PostgresWorkUnitAuthorityRepository(pool);
  const inputManifest = readAccepted("worker-input-manifest");
  inputManifest.worker_input_manifest_id = derivePetraId(
    "worker_input_manifest",
    "wave6-browser-retryable-work",
  );
  inputManifest.work_unit_id = derivePetraId(
    "work_unit",
    "wave6-browser-retryable-work",
  );
  inputManifest.project_id = scientificProjectId;
  inputManifest.issued_at = "2026-09-19T00:01:00.000Z";
  inputManifest.issued_by = {
    actor_id: serviceActorId,
    actor_kind: "service",
  };
  inputManifest.content_hash = hash(inputManifest.content);

  const requested = readAccepted("work-unit-requested");
  requested.work_unit_id = inputManifest.work_unit_id;
  requested.project_id = scientificProjectId;
  requested.spec.objective =
    "Retry the exact retained scientific parsing input after a retryable output-validation failure.";
  requested.spec.input_manifest_ref = {
    worker_input_manifest_id: inputManifest.worker_input_manifest_id,
    content_hash: inputManifest.content_hash,
  };
  requested.spec.idempotency_key = "wave6-browser:retryable-work:v1";
  requested.spec.cache = {
    cache_mode: "reuse_exact",
    cache_key: "wave6-browser:retryable-work:v1",
  };
  requested.spec_hash = hash(requested.spec);
  requested.trace_id = derivePetraId(
    "trace",
    "wave6-browser-retryable-work",
  );
  requested.created_by = clone(inputManifest.issued_by);
  requested.status.requested_at = inputManifest.issued_at;
  requested.created_at = inputManifest.issued_at;
  requested.updated_at = inputManifest.issued_at;

  let work = await workUnits.register({ workUnit: requested, inputManifest });
  work = await workUnits.queue(
    work.work_unit_id,
    work.revision,
    "2026-09-19T00:01:01.000Z",
  );
  work = await workUnits.start(
    work.work_unit_id,
    work.revision,
    1,
    "2026-09-19T00:01:02.000Z",
  );
  work = await workUnits.failValidation(
    work.work_unit_id,
    work.revision,
    1,
    {
      code: "OUTPUT_CONTRACT_INVALID",
      message:
        "The first output did not satisfy its declared contract; exact retained input remains eligible for retry.",
      retryable: true,
    },
    "2026-09-19T00:01:03.000Z",
  );
  return work.work_unit_id;
};

`;

let source = readFileSync(backendHarness, "utf8");
source = replaceOnce(
  source,
  "const item53Counts = async (pool) => {",
  `${retryFixture}const item53Counts = async (pool) => {`,
);
source = replaceOnce(
  source,
  `    await record("corrected_blocked_limited_basis", {
      projectThreadId: continuation.grounded.projectThread.project_thread_id,`,
  `    const retryWorkUnitId = await seedWave6RetryableWork(pool);
    await record("corrected_blocked_limited_basis", {
      retryWorkUnitId,
      projectThreadId: continuation.grounded.projectThread.project_thread_id,`,
);

const run = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [instrumentedHarness], {
      cwd: root,
      env: {
        ...process.env,
        PETRA_WAVE4_TRACE: "wave5-cumulative",
        PETRA_WAVE4_EVIDENCE_OBSERVER:
          "./apps/workbench/test/wave6-work-browser-observer.mjs",
        PETRA_WAVE4_RESULT_OUTPUT: "reports/WAVE6-WORK-CUMULATIVE-TRACE.json",
        PETRA_WAVE6_WORK_BROWSER_OUTPUT:
          "reports/WAVE6-WORK-BROWSER-OBSERVATION.json",
      },
      stdio: "inherit",
    });
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) resolveRun();
      else {
        rejectRun(
          new Error(
            `The instrumented Work browser trace failed (${code ?? signal}).`,
          ),
        );
      }
    });
  });

let failure;
try {
  writeFileSync(instrumentedHarness, source, { flag: "wx" });
  await run();
} catch (error) {
  failure = error;
} finally {
  try {
    unlinkSync(instrumentedHarness);
  } catch (error) {
    if (error?.code !== "ENOENT" && failure === undefined) failure = error;
  }
}

if (failure !== undefined) throw failure;
