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
  `scripts/.wave4-cumulative-browser-${process.pid}.mjs`,
);

if (process.versions.node !== "24.20.0") {
  throw new Error(
    `The Wave 4 production browser trace requires Node 24.20.0; received ${process.versions.node}.`,
  );
}

const replaceOnce = (source, expected, replacement) => {
  const first = source.indexOf(expected);
  if (first < 0 || source.indexOf(expected, first + expected.length) >= 0) {
    throw new Error(
      "The exact cumulative harness boundary changed; browser instrumentation was not applied.",
    );
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + expected.length)}`;
};

let source = readFileSync(backendHarness, "utf8");
source = replaceOnce(
  source,
  'import { createServer as createViteServer } from "vite";',
  `import { createServer as createViteServer } from "vite";
import { startCumulativeProductionBrowser } from "../apps/workbench/test/cumulative-production-browser-driver.mjs";`,
);
source = replaceOnce(
  source,
  `  let active;
  let vite;
  const nativeFetch = globalThis.fetch;`,
  `  let active;
  let vite;
  let browserTrace;
  const nativeFetch = globalThis.fetch;`,
);
source = replaceOnce(
  source,
  `    progress("Review deferred, resumed, and returned to exact open revision 3");`,
  `    progress("Review deferred, resumed, and returned to exact open revision 3");
    await projectData.loadProjectRecord({
      params: { projectId: scientificProjectId },
      request: new Request(
        \`http://petra.local/projects/\${scientificProjectId}/graph?layer=working\`,
      ),
    });
    const liveOverlay = await projectData.loadProjectRelationshipOverlay(scientificProjectId);
    assert(liveOverlay !== undefined, "The live relationship overlay is absent.");
    const mappedGraph = projectData.graphQuestionFromOverlayView(liveOverlay);
    assert(mappedGraph !== undefined, "The workbench Graph mapper returned no live result.");
    progress("production shell and Graph loaders accepted the live cumulative response");
    await vite.close();
    vite = undefined;
    browserTrace = await startCumulativeProductionBrowser({
      root,
      getBackendUrl: () => active.url,
      scientificProjectId,
      writingProjectId,
      scientific,
      writing,
    });
    await browserTrace.exerciseBeforeApply();
    progress("production browser rendered live Graph, Review, source return, and initial Brief");`,
);
source = replaceOnce(
  source,
  '    const request = {\n      schema_name: "petra.review-session-apply-request",',
  '    let request = {\n      schema_name: "petra.review-session-apply-request",',
);
source = replaceOnce(
  source,
  `    const applied = await new ReviewSessionApplyClient({
      baseUrl: active.url,
      token,
    }).apply(request);`,
  `    const browserApplication = await browserTrace.applyDisplayedChangeSet();
    request = browserApplication.request;
    const applied = browserApplication.result;`,
);
source = replaceOnce(
  source,
  `    progress(
      "manual Apply updated Brief and retained all three History events",
    );`,
  `    progress(
      "manual Apply updated Brief and retained all three History events",
    );
    await browserTrace.exerciseAfterApply();
    progress("production browser retained partial outcomes and rendered the updated Brief and History window");`,
);
source = replaceOnce(
  source,
  "    await Promise.all([vite?.close(), active?.shutdown()]);",
  "    await Promise.all([browserTrace?.close(), vite?.close(), active?.shutdown()]);",
);

const run = () =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [instrumentedHarness], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", rejectRun);
    child.on("close", (code, signal) => {
      if (code === 0) resolveRun();
      else
        rejectRun(
          new Error(
            `The instrumented cumulative browser trace failed (${code ?? signal}).`,
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
