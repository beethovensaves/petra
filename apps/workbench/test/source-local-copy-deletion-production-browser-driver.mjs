import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const stablePort = 4311;
const stableUrl = `http://127.0.0.1:${stablePort}`;
const deletionReason =
  "Delete the eligible walkthrough bytes after reviewing the retained Project authority.";

const button = (label) =>
  `[...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

const setTextArea = (label, value) => `(()=>{
  const control=[...document.querySelectorAll("textarea")].find((candidate)=>candidate.labels?.[0]?.textContent.includes(${JSON.stringify(label)}));
  if(!control) throw new Error("Missing textarea: " + ${JSON.stringify(label)});
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(control,${JSON.stringify(value)});
  control.dispatchEvent(new Event("input",{bubbles:true}));
})()`;

export const exerciseProductionSourceLocalCopyDeletionInBrowser = async ({
  root,
  baseUrl,
  pool,
  scientific,
  artifactStore,
}) => {
  const source = scientific.localCopyWalkthrough?.projectSource;
  assert.ok(
    source !== undefined,
    "The representative local-copy deletion ProjectSource was not seeded.",
  );
  const projectId = source.project_id;
  const projectSourceId = source.project_source_id;
  const sourceTitle = "Local-copy deletion walkthrough";
  const calls = [];
  let disconnectDeletionResponse = true;
  let workbench;
  let chrome;
  let cdp;
  let failure;
  let result;

  try {
    workbench = await startWorkbench({
      root,
      getBackendUrl: () => baseUrl,
      calls,
      port: stablePort,
      strictPort: true,
      shouldDisconnectResponse: (call) => {
        if (
          disconnectDeletionResponse &&
          call.method === "POST" &&
          call.path ===
            `/api/commands/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion` &&
          call.status >= 200 &&
          call.status < 300
        ) {
          disconnectDeletionResponse = false;
          return true;
        }
        return false;
      },
    });
    assert.equal(workbench.url, stableUrl);
    chrome = await startChrome({
      profilePrefix: "petra-source-local-copy-production-",
    });
    cdp = await createCdp(chrome.socketUrl);
    const { send, evaluate, until } = cdp;
    await Promise.all([
      send("Page.enable"),
      send("Runtime.enable"),
      send("Accessibility.enable"),
      send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 960,
        deviceScaleFactor: 1,
        mobile: false,
      }),
    ]);

    const navigate = async (path, ready, label) => {
      const navigation = await send("Page.navigate", {
        url: new URL(path, workbench.url).href,
      });
      assert.equal(
        navigation.errorText,
        undefined,
        `Chrome could not navigate to ${label}.`,
      );
      try {
        await until(ready, label);
      } catch (error) {
        throw new Error(
          `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nCalls: ${JSON.stringify(calls.map(({ method, path: callPath, status }) => ({ method, path: callPath, status })))}`,
          { cause: error },
        );
      }
      await evaluate("document.fonts.ready");
    };
    const latestCall = (predicate) => [...calls].reverse().find(predicate);
    const sourceRead = () =>
      latestCall(
        (call) =>
          call.method === "GET" &&
          call.path ===
            `/api/queries/projects/${projectId}/sources/${projectSourceId}`,
      );
    const readRetainedHistory = () =>
      evaluate(`fetch(${JSON.stringify(`/api/queries/projects/${projectId}/history/events?limit=50`)}, {
        headers: { authorization: "Bearer petra-local-development" },
      }).then(async (response)=>({status:response.status,json:await response.json()}))`);

    await navigate(
      "/guide",
      'document.querySelector(".checkpoint-guide") !== null',
      "stable in-product guide",
    );
    assert.equal(await evaluate("window.location.href"), `${stableUrl}/guide`);
    const guideText = await evaluate("document.body.innerText");
    for (const value of [
      "Use Petra for one grounded Project task",
      "Return to a registered start",
      "Open the reset control",
    ]) {
      assert.ok(guideText.includes(value), `The guide omitted ${value}.`);
    }
    const resetPath = await evaluate(`(()=>{
      const link=[...document.querySelectorAll("a")].find((candidate)=>candidate.textContent.includes("Open the reset control"));
      const url=new URL(link.href);
      return url.pathname+url.search;
    })()`);
    assert.equal(resetPath, `/settings?project=${projectId}`);
    await navigate(
      resetPath,
      'document.querySelector("#project-reset-title") !== null',
      "documented additive reset control",
    );
    const resetText = await evaluate("document.body.innerText");
    assert.ok(resetText.includes("Reset with a registered profile"));
    assert.ok(resetText.includes("archives this exact Project revision"));

    await navigate(
      `/projects/${projectId}/history`,
      'document.querySelector(".history-episodes, #history-empty-title") !== null',
      "History before local-copy deletion",
    );
    const historyRouteBefore = await evaluate(
      'document.querySelector("#reference-main").innerText',
    );
    const historyBefore = await readRetainedHistory();
    assert.equal(historyBefore.status, 200);

    await navigate(
      `/projects/${projectId}/sources`,
      'document.querySelector(".reference-source-list") !== null',
      "representative Project Sources",
    );
    assert.ok(
      (await evaluate("document.body.innerText")).includes(sourceTitle),
      "The representative deletion source was not visible in Sources.",
    );
    await navigate(
      `/projects/${projectId}/sources/${projectSourceId}?from=sources`,
      'document.querySelector(".reference-reader") !== null',
      "exact local-copy deletion source",
    );
    const sourceBefore = sourceRead();
    assert.equal(sourceBefore?.status, 200);
    assert.equal(sourceBefore?.json?.content?.identity?.title, sourceTitle);
    assert.equal(
      await evaluate(`${button("Remove from Project")} !== undefined`),
      true,
      "Project-link removal must remain a distinct visible control.",
    );
    await evaluate(`${button("Delete local copy")}.click()`);
    await until(
      'document.body.innerText.includes("Exact copy is eligible") && document.body.innerText.includes("What remains and what changes")',
      "eligible production local-copy preview",
    );
    const previewCall = latestCall(
      (call) =>
        call.method === "GET" &&
        call.path ===
          `/api/queries/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion`,
    );
    assert.equal(previewCall?.status, 200);
    assert.equal(previewCall?.authorization, "Bearer petra-local-development");
    const preview = previewCall.json;
    assert.equal(preview?.eligibility?.state, "eligible");
    assert.equal(preview?.operation?.state, "ready");
    assert.equal(preview?.expected?.copy_ref?.store_name, "petra-artifacts");
    await evaluate(
      '[...document.querySelectorAll("summary")].find((element)=>element.textContent.includes("Inspect exact storage identity")).click()',
    );
    const previewText = await evaluate("document.body.innerText");
    for (const value of [
      preview.expected.copy_ref.store_name,
      preview.expected.copy_ref.object_key,
      preview.expected.copy_ref.artifact_manifest_id,
      preview.expected.copy_ref.content_hash,
      "Canonical source identity",
      "Rights history",
      "Exact selectors",
      "Provenance and History",
      "The Project link is not removed",
    ]) {
      assert.ok(
        previewText.includes(value),
        `The deletion preview omitted ${value}.`,
      );
    }

    await evaluate(
      setTextArea("Reason for deleting this exact local copy", deletionReason),
    );
    await evaluate(`${button("Confirm exact local-copy deletion")}.click()`);
    await until(
      'document.body.innerText.includes("Deletion outcome not confirmed")',
      "honest unknown browser delivery outcome",
    );
    assert.equal(
      await evaluate("document.querySelector('textarea').value"),
      deletionReason,
      "The production UI did not retain the exact reviewed reason.",
    );
    const firstDeletionCall = latestCall(
      (call) =>
        call.method === "POST" &&
        call.path ===
          `/api/commands/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion`,
    );
    assert.equal(firstDeletionCall?.status, 201);
    assert.equal(firstDeletionCall?.json?.applied, true);
    assert.equal(
      firstDeletionCall?.requestJson?.reason,
      deletionReason,
      "The production UI changed the reviewed deletion reason.",
    );
    for (const field of [
      "actor",
      "capability_grant_id",
      "recorded_at",
      "receipt_id",
    ]) {
      assert.equal(
        field in firstDeletionCall.requestJson,
        false,
        `The client supplied server-owned field ${field}.`,
      );
    }

    await evaluate(`${button("Check deletion effect")}.click()`);
    await until(
      'document.body.innerText.includes("Local-copy deletion confirmed")',
      "durable local-copy recovery result",
    );
    const recoveryCall = latestCall(
      (call) =>
        call.method === "POST" &&
        call.path ===
          `/api/queries/projects/${projectId}/sources/${projectSourceId}/local-copy-deletion-recovery`,
    );
    assert.equal(recoveryCall?.status, 200);
    assert.deepEqual(
      recoveryCall?.requestJson,
      firstDeletionCall.requestJson,
      "Recovery did not reuse the exact reviewed request.",
    );
    assert.equal(recoveryCall?.json?.effect?.state, "effect_confirmed");
    const resultText = await evaluate("document.body.innerText");
    for (const value of [
      "Local-copy deletion confirmed",
      "Retained · still belongs to this Project",
      "Identity, copy manifest, rights, selectors, provenance, History",
    ]) {
      assert.ok(resultText.includes(value), `The result omitted ${value}.`);
    }
    const exactReturn = await evaluate(`(()=>{
      const link=[...document.querySelectorAll("a")].find((candidate)=>candidate.textContent.includes("Return to the exact source task"));
      const url=new URL(link.href);
      return url.pathname+url.search;
    })()`);
    assert.equal(
      exactReturn,
      `/projects/${projectId}/sources/${projectSourceId}?from=sources`,
    );

    const replay =
      await evaluate(`fetch(${JSON.stringify(firstDeletionCall.path)}, {
      method: "POST",
      headers: {
        authorization: "Bearer petra-local-development",
        "content-type": "application/json",
      },
      body: ${JSON.stringify(JSON.stringify(firstDeletionCall.requestJson))},
    }).then(async (response)=>({status:response.status,json:await response.json()}))`);
    assert.equal(replay.status, 200);
    assert.equal(replay.json.applied, false);
    assert.deepEqual(
      replay.json.receipt,
      firstDeletionCall.json.receipt,
      "The exact browser replay did not return the retained receipt.",
    );

    await navigate(
      exactReturn,
      'document.querySelector(".reference-reader") !== null',
      "exact source after local-copy deletion",
    );
    const sourceAfter = sourceRead();
    assert.equal(sourceAfter?.status, 200);
    assert.deepEqual(
      sourceAfter?.json?.content,
      sourceBefore?.json?.content,
      "Local-copy deletion changed the retained Project source authority.",
    );
    const afterSourceText = await evaluate("document.body.innerText");
    for (const value of [sourceTitle, source.project_source_id, "Rights"]) {
      assert.ok(
        afterSourceText.includes(value),
        `The retained source route omitted ${value}.`,
      );
    }

    await navigate(
      `/projects/${projectId}/history`,
      'document.querySelector(".history-episodes, #history-empty-title") !== null',
      "History after local-copy deletion",
    );
    const historyRouteAfter = await evaluate(
      'document.querySelector("#reference-main").innerText',
    );
    assert.equal(
      historyRouteAfter,
      historyRouteBefore,
      "The local-copy operation changed the usable History route.",
    );
    const historyAfter = await readRetainedHistory();
    assert.equal(historyAfter.status, 200);
    assert.deepEqual(
      historyAfter.json.content,
      historyBefore.json.content,
      "Local-copy deletion rewrote canonical Project History.",
    );

    const durable = await pool.query(
      `SELECT
         (SELECT count(*)::integer FROM petra.project_sources
           WHERE project_source_id = $1) AS project_links,
         (SELECT count(*)::integer
            FROM petra.project_source_local_copy_deletion_attempts
           WHERE project_source_id = $1) AS deletion_attempts,
         (SELECT count(*)::integer
            FROM petra.project_source_local_copy_deletion_receipts
           WHERE project_source_id = $1) AS deletion_receipts`,
      [projectSourceId],
    );
    assert.deepEqual(durable.rows[0], {
      project_links: 1,
      deletion_attempts: 1,
      deletion_receipts: 1,
    });
    assert.equal(
      await artifactStore.inspectByHash(
        preview.expected.copy_ref.content_hash,
        {
          byteSize: preview.expected.copy_ref.byte_size,
          mediaType: preview.expected.copy_ref.media_type,
        },
      ),
      undefined,
      "The exact content-addressed S3 copy remained after confirmed deletion.",
    );

    const report = {
      schema_name:
        "petra.wave6-source-local-copy-deletion-production-browser-observation",
      schema_version: 1,
      status: "passed",
      observed_at: new Date().toISOString(),
      operation: "source.delete-local-copy",
      stable_url: `${stableUrl}/guide`,
      documented_reset_path: resetPath,
      project_id: projectId,
      project_source_id: projectSourceId,
      source_title: sourceTitle,
      copy_identity: {
        store_name: preview.expected.copy_ref.store_name,
        object_key: preview.expected.copy_ref.object_key,
        artifact_manifest_id: preview.expected.copy_ref.artifact_manifest_id,
        content_hash: preview.expected.copy_ref.content_hash,
        byte_size: preview.expected.copy_ref.byte_size,
        media_type: preview.expected.copy_ref.media_type,
      },
      command: {
        command_id: firstDeletionCall.requestJson.command_id,
        idempotency_key: firstDeletionCall.requestJson.idempotency_key,
        first_applied: firstDeletionCall.json.applied,
        browser_delivery_interrupted_after_server_terminal: true,
        recovered_effect: recoveryCall.json.effect.state,
        replay_applied: replay.json.applied,
      },
      preservation: firstDeletionCall.json.receipt.preservation,
      retained_counts: durable.rows[0],
      source_authority_unchanged: true,
      canonical_history_unchanged: true,
      exact_return: exactReturn,
      backend_artifact:
        "reports/WAVE6-SOURCE-LOCAL-COPY-DELETION-PRODUCTION.json",
      boundary:
        "Isolated Chrome used the stable production workbench URL and production React Router source route over authenticated live server routes backed by disposable PostgreSQL and S3 services. The proxy interrupted only the first successful command response so the product's durable recovery control could reconcile the exact server-owned effect; the same browser session replayed the exact request and received the retained receipt.",
      exclusions: [
        "This bounded trace does not claim the complete UX1.6-SOURCES register/process/inspect/replace/remove/delete/recovery lifecycle.",
        "The documented reset control was inspected but not invoked because reset archives the exact Project and creates an additive replacement.",
      ],
    };
    const reportPath = resolve(
      process.env.PETRA_WAVE6_SOURCE_LOCAL_COPY_DELETION_BROWSER_OUTPUT ??
        "reports/WAVE6-SOURCE-LOCAL-COPY-DELETION-BROWSER.json",
    );
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(
      `Wave 6 production source local-copy deletion browser checks passed: ${reportPath}\n`,
    );

    result = {
      project_source_id: projectSourceId,
      title: sourceTitle,
      stable_url: report.stable_url,
      preview_content_hash: preview.content_hash,
      store_name: preview.expected.copy_ref.store_name,
      object_key: preview.expected.copy_ref.object_key,
      command_id: firstDeletionCall.requestJson.command_id,
      idempotency_key: firstDeletionCall.requestJson.idempotency_key,
      first_applied: firstDeletionCall.json.applied,
      replay_applied: replay.json.applied,
      confirmed_effect: recoveryCall.json.effect.state,
      preservation: firstDeletionCall.json.receipt.preservation,
      retained_counts: durable.rows[0],
      canonical_history_unchanged: true,
      browser_executed: true,
    };
  } catch (error) {
    failure = error;
  } finally {
    try {
      cdp?.socket.close();
      await workbench?.vite.close();
      if (chrome !== undefined) {
        if (chrome.child.exitCode === null) {
          chrome.child.kill("SIGTERM");
          await Promise.race([
            once(chrome.child, "exit"),
            new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
          ]);
        }
        rmSync(chrome.profile, {
          recursive: true,
          force: true,
          maxRetries: 10,
          retryDelay: 100,
        });
      }
    } catch (closeError) {
      if (failure === undefined) failure = closeError;
    }
  }
  if (failure !== undefined) throw failure;
  assert.ok(result !== undefined);
  return result;
};
