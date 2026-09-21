import { spawn } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const backendHarness = resolve(
  root,
  "scripts/test-wave4-cumulative-integration.mjs",
);
const instrumentedHarness = resolve(
  root,
  `scripts/.wave6-source-local-copy-browser-${process.pid}.mjs`,
);
const harnessOutput = join(
  tmpdir(),
  `petra-wave6-source-local-copy-browser-${process.pid}.json`,
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The source local-copy production browser trace requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const replaceOnce = (source, expected, replacement) => {
  const first = source.indexOf(expected);
  if (first < 0 || source.indexOf(expected, first + expected.length) >= 0) {
    throw new Error(
      "The exact cumulative harness boundary changed; source deletion browser instrumentation was not applied.",
    );
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + expected.length)}`;
};

let source = readFileSync(backendHarness, "utf8");
source = replaceOnce(
  source,
  'import { createServer as createViteServer } from "vite";',
  `import { createServer as createViteServer } from "vite";
import { exerciseProductionSourceLocalCopyDeletionInBrowser } from "../apps/workbench/test/source-local-copy-deletion-production-browser-driver.mjs";`,
);
source = replaceOnce(
  source,
  `    const sourceLocalCopyDeletion = sourceLocalCopyDeletionMode
      ? await exerciseProductionSourceLocalCopyDeletion({
          baseUrl: active.url,
          pool,
          scientific,
          artifactStore,
        })
      : undefined;`,
  `    const sourceLocalCopyDeletion = sourceLocalCopyDeletionMode
      ? await exerciseProductionSourceLocalCopyDeletionInBrowser({
          root,
          baseUrl: active.url,
          pool,
          scientific,
          artifactStore,
        })
      : undefined;`,
);

const run = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [instrumentedHarness], {
      cwd: root,
      env: {
        ...process.env,
        PETRA_WAVE4_TRACE: "wave6-source-local-copy-deletion",
        PETRA_WAVE4_RESULT_OUTPUT: harnessOutput,
      },
      stdio: "inherit",
    });
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) resolveRun();
      else
        rejectRun(
          new Error(
            `The instrumented production source local-copy browser trace failed (${code ?? signal}).`,
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
  for (const path of [instrumentedHarness, harnessOutput]) {
    try {
      rmSync(path, { force: true });
    } catch (error) {
      if (failure === undefined) failure = error;
    }
  }
}

if (failure !== undefined) throw failure;
