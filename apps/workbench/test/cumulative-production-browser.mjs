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
import { startCumulativeProductionBrowser } from "../apps/workbench/test/cumulative-production-browser-driver.mjs";
import { startItem50ProductionBrowser } from "../apps/workbench/test/item50-production-browser-driver.mjs";`,
);
source = replaceOnce(
  source,
  `  let active;
  let vite;
  const nativeFetch = globalThis.fetch;`,
  `  let active;
  let vite;
  let browserTrace;
  let recoveryBrowserTrace;
  const nativeFetch = globalThis.fetch;`,
);
source = replaceOnce(
  source,
  `    const reopenInput = projectData.createReviewSessionReopenCommandInput(`,
  `    await vite.close();
    vite = undefined;
    browserTrace = await startCumulativeProductionBrowser({
      root,
      getBackendUrl: () => active.url,
      scientificProjectId,
      writingProjectId,
      scientific,
      writing,
    });
    await browserTrace.exerciseLifecycleState("deferred");
    progress("production browser recorded the exact deferred Review before reopen");
    const reopenInput = projectData.createReviewSessionReopenCommandInput(`,
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
  `    progress("restart replay retained exact cardinalities without duplicates");
    return {`,
  `    progress("restart replay retained exact cardinalities without duplicates");
    const appliedHistoryEvent = replayedHistory.content.changes.find(
      (change) =>
        appliedCommandIds.has(change.command_ref.command_id) &&
        change.event_ref.event_type === "change_set.applied",
    );
    assert(appliedHistoryEvent !== undefined, "The applied ChangeSet History event was not retained.");
    recoveryBrowserTrace = await startItem50ProductionBrowser({
      root,
      getBackendUrl: () => active.url,
      scientificProjectId,
      writingProjectId,
      scientificReviewSessionId: scientific.session.review_session_id,
      writingReviewSessionId: writing.session.review_session_id,
    });
    const governedRevert = await recoveryBrowserTrace.recordRestartedBriefAndRevert({
      appliedEventId: appliedHistoryEvent.event_ref.event_id,
    });
    progress("production browser completed governed Revert and the already-compensated failure state");
    return {
      item50_browser: {
        item49_model_evidence: "reports/WAVE4-NATURAL-CONVERSATION-MODEL-IDENTITY-TRACE.md",
        repeated_external_model_call: false,
        governed_revert: governedRevert,
      },`,
);
source = replaceOnce(
  source,
  "    await Promise.all([vite?.close(), active?.shutdown()]);",
  "    await Promise.all([recoveryBrowserTrace?.close(), browserTrace?.close(), vite?.close(), active?.shutdown()]);",
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
