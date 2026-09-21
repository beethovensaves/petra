import { spawn } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const backendHarness = resolve(
  root,
  "scripts/test-wave4-cumulative-integration.mjs",
);
const workRunner = resolve(
  root,
  "apps/workbench/test/run-wave6-work-browser.mjs",
);
const reviewRunner = resolve(
  root,
  "apps/workbench/test/run-wave6-review-workflow-browser.mjs",
);
const instrumentedHarness = resolve(
  root,
  `scripts/.wave6-final-exit-${process.pid}.mjs`,
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 6 final browser exit requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const replaceOnce = (source, expected, replacement) => {
  const first = source.indexOf(expected);
  if (first < 0 || source.indexOf(expected, first + expected.length) >= 0) {
    throw new Error(
      "The exact cumulative harness boundary changed; final-exit instrumentation was not applied.",
    );
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + expected.length)}`;
};

const extractTemplate = (path, name) => {
  const source = readFileSync(path, "utf8");
  const opening = `const ${name} = \``;
  const start = source.indexOf(opening);
  if (start < 0) throw new Error(`Missing ${name} in ${path}.`);
  const contentStart = start + opening.length;
  const end = source.indexOf("`;\n", contentStart);
  if (end < 0) throw new Error(`Unterminated ${name} in ${path}.`);
  return source
    .slice(contentStart, end)
    .replaceAll("\\`", "`")
    .replaceAll("\\${", "${");
};

const retryFixture = extractTemplate(workRunner, "retryFixture");
const reviewSeedHelper = extractTemplate(reviewRunner, "seedHelper");

let source = readFileSync(backendHarness, "utf8");
source = replaceOnce(
  source,
  "const item53Counts = async (pool) => {",
  `${retryFixture}${reviewSeedHelper}const item53Counts = async (pool) => {`,
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
source = replaceOnce(
  source,
  `    await record("restart_complete", {
      item49ReviewHash: postRestartReview?.content_hash,
      failureReviewHash: failureReview.content_hash,
    });`,
  `    const wave6ReviewScenario = await seedWave6ReviewWorkflow({
      pool,
      scientific,
    });
    await record("restart_complete", {
      item49ReviewHash: postRestartReview?.content_hash,
      failureReviewHash: failureReview.content_hash,
      wave6ReviewScenario,
    });`,
);

const run = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [instrumentedHarness], {
      cwd: root,
      env: {
        ...process.env,
        PETRA_WAVE4_TRACE: "wave5-cumulative",
        PETRA_WAVE4_EVIDENCE_OBSERVER:
          "./apps/workbench/test/wave6-final-exit-observer.mjs",
        PETRA_WAVE4_RESULT_OUTPUT: "/tmp/petra-wave6-final-design-runtime.json",
        PETRA_WAVE6_WORK_BROWSER_OUTPUT:
          "/tmp/petra-wave6-final-design-work.json",
        PETRA_WAVE6_FINAL_EXIT_OUTPUT: "reports/WAVE6-FINAL-DESIGN-EXIT.json",
        PETRA_WAVE6_FINAL_EXIT: "1",
      },
      stdio: "inherit",
    });
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) resolveRun();
      else
        rejectRun(
          new Error(
            `The instrumented final browser exit failed (${code ?? signal}).`,
          ),
        );
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
