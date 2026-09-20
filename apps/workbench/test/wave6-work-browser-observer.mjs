import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { ReviewSessionApplyClient } from "@petra/adapters";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

const link = (label) =>
  `[...document.querySelectorAll('a')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

export const createWave4EvidenceObserver = async ({ root }) => {
  const calls = [];
  const consoleErrors = [];
  let backendUrl;
  let token;
  let scientificProjectId;
  let scientificReviewSessionId;
  let completedWorkUnitId;
  let workbench;
  let chrome;
  let cdp;
  let observation;
  let closed = false;
  const execution = {
    completed_checks: [],
    worker_output_manifest: undefined,
  };

  const writeObservation = () => {
    if (observation === undefined) return;
    const output = resolve(
      root,
      process.env.PETRA_WAVE6_WORK_BROWSER_OUTPUT ??
        "reports/WAVE6-WORK-BROWSER-OBSERVATION.json",
    );
    writeFileSync(output, `${JSON.stringify(observation, null, 2)}\n`);
  };

  const readReviewSelection = async (reviewSessionId) => {
    const response = await fetch(
      new URL(
        `/api/queries/projects/${scientificProjectId}/reviews/${reviewSessionId}`,
        backendUrl,
      ),
      { headers: { authorization: `Bearer ${token}` } },
    );
    assert.equal(response.status, 200, "The Work trace Review read failed.");
    const review = await response.json();
    const session = review?.content?.session;
    const selected = review?.content?.members?.[0];
    assert.ok(session && selected, "The Work trace Review is not actionable.");
    return {
      project_id: scientificProjectId,
      review_session_id: reviewSessionId,
      expected_revision: session.revision,
      expected_content_hash: session.content_hash,
      selected_review_member_id: selected.review_member_id,
    };
  };

  const prepareAndApply = async (reviewSessionId, beforeApply) => {
    const client = new ReviewSessionApplyClient({ baseUrl: backendUrl, token });
    const checkpoint = await client.prepare(
      await readReviewSelection(reviewSessionId),
    );
    await beforeApply?.();
    const request = {
      schema_name: "petra.review-session-apply-request",
      schema_version: "1.0.0",
      checkpoint,
      decided_at: new Date().toISOString(),
    };
    return { request, result: await client.apply(request) };
  };

  const start = async () => {
    if (workbench !== undefined) return;
    workbench = await startWorkbench({
      root,
      getBackendUrl: () => backendUrl,
      calls,
    });
    chrome = await startChrome({ profilePrefix: "petra-wave6-work-browser-" });
    cdp = await createCdp(chrome.socketUrl);
    cdp.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.consoleAPICalled") {
        if (["error", "assert"].includes(message.params?.type)) {
          consoleErrors.push(
            message.params.args?.map((argument) => argument.value),
          );
        }
      }
      if (message.method === "Runtime.exceptionThrown") {
        consoleErrors.push(message.params?.exceptionDetails);
      }
    });
    await Promise.all([
      cdp.send("Page.enable"),
      cdp.send("Runtime.enable"),
      cdp.send("Accessibility.enable"),
      cdp.send("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      }),
    ]);
  };

  const navigate = async (path, ready, label) => {
    const result = await cdp.send("Page.navigate", {
      url: new URL(path, workbench.url).href,
    });
    assert.equal(result.errorText, undefined, `Could not open ${label}.`);
    await cdp.until(ready, label);
    await cdp.evaluate("document.fonts.ready");
  };

  const activate = async (expression) => {
    await cdp.evaluate(`${expression}.focus()`);
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
      text: "\r",
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    });
  };

  const run = async () => {
    await start();
    await navigate(
      `/projects/${scientificProjectId}/work`,
      'document.querySelector(".work-units") !== null',
      "Project Work collection",
    );
    const collectionText = await cdp.evaluate("document.body.innerText");
    assert.ok(
      collectionText.includes("Research question"),
      "The registered scientific inquiry path is not visible in Work.",
    );
    execution.completed_checks.push("registered scientific inquiry visible");
    const attentionPath = await cdp.evaluate(`(() => {
      const group = [...document.querySelectorAll(".work-group")].find(
        (candidate) => candidate.querySelector("h3")?.textContent.trim() === "Needs attention",
      );
      return group?.querySelector("a")?.getAttribute("href");
    })()`);
    assert.ok(attentionPath, "No exact Work task requiring input is visible.");

    await navigate(
      attentionPath,
      'document.querySelector("#required-input") !== null',
      "Work required input",
    );
    const inputText = await cdp.evaluate("document.body.innerText");
    for (const value of [
      "Required input",
      "Manage this task",
      "Project authority remains unchanged",
    ]) {
      assert.ok(inputText.includes(value), `Work input omitted ${value}.`);
    }
    await cdp.evaluate(
      'document.querySelector("#required-input button")?.click()',
    );
    await cdp.until(
      'document.querySelector(".work-operation-result") !== null',
      "recorded Work input",
    );
    const inputReceipt = await cdp.evaluate(
      'document.querySelector(".work-operation-result")?.textContent',
    );
    assert.ok(inputReceipt.includes("Project authority unchanged"));
    execution.completed_checks.push("required input recorded");

    const startDisabled = await cdp.evaluate(
      `${button("Start work")}.getAttribute("aria-disabled")`,
    );
    if (startDisabled !== "true") {
      await cdp.evaluate(`${button("Start work")}.click()`);
      await cdp.until(
        'document.querySelector(".work-operation-result")?.textContent.includes("started") === true || document.querySelector(".work-operation-result")?.textContent.includes("queued") === true',
        "started Work",
      );
    }
    const detachAvailable = await cdp.evaluate(
      `${link("Leave running")} !== undefined`,
    );
    assert.ok(detachAvailable, "The active Work cannot be left running.");
    await activate(link("Leave running"));
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(`/projects/${scientificProjectId}/brief`)}`,
      "detached Work return",
    );
    await navigate(
      attentionPath,
      'document.querySelector(".work-controls") !== null',
      "detached Work task",
    );
    execution.completed_checks.push("active Work left running and reopened");
    const cancelDisabled = await cdp.evaluate(
      `${button("Cancel work")}.getAttribute("aria-disabled")`,
    );
    if (cancelDisabled !== "true") {
      await cdp.evaluate(`${button("Cancel work")}.click()`);
      await cdp.until(
        `${button("Confirm cancellation")} !== undefined`,
        "Work cancellation confirmation",
      );
      await cdp.evaluate(`${button("Confirm cancellation")}.click()`);
      await cdp.until(
        'document.querySelector(".work-operation-result")?.textContent.toLocaleLowerCase().includes("cancel") === true',
        "cancelled Work",
      );
      execution.completed_checks.push("active Work cancellation confirmed");
    }

    await navigate(
      `/projects/${scientificProjectId}/work/${completedWorkUnitId}`,
      'document.querySelector(".work-results--destinations") !== null',
      "completed grounded Work",
    );
    const completedText = await cdp.evaluate("document.body.innerText");
    for (const value of [
      "DECLARED DEPENDENCY PLAN",
      "Stages",
      "Measured use",
      "Open exact results",
      "grounded response",
      "worker output manifest",
      "Reconnect",
      "Replay delivery",
    ]) {
      assert.ok(
        completedText.includes(value),
        `Completed Work omitted ${value}. Rendered text: ${completedText.slice(0, 2_000)}`,
      );
    }
    execution.completed_checks.push(
      "completed Work stages, resources, and result destinations rendered",
    );
    await cdp.evaluate(`${button("Reconnect")}.click()`);
    await cdp.until(
      'document.querySelector(".work-operation-result")?.textContent.includes("retained") === true',
      "reconnected Work delivery",
    );
    await cdp.evaluate(`${button("Replay delivery")}.click()`);
    await cdp.until(
      'document.querySelector(".work-operation-result")?.textContent.toLocaleLowerCase().includes("replayed") === true',
      "replayed Work delivery",
    );
    execution.completed_checks.push(
      "durable delivery reconnected and replayed",
    );

    const resultIdentities = await cdp.evaluate(`
      [...document.querySelectorAll(".work-results--destinations li")].map((item) => ({
        kind: item.querySelector("strong")?.textContent.trim(),
        id: item.querySelector("code")?.textContent.trim(),
      }))
    `);
    assert.equal(resultIdentities.length, 2);
    const groundedResult = resultIdentities.find(
      (result) => result.kind === "grounded response",
    );
    const workerResult = resultIdentities.find(
      (result) => result.kind === "worker output manifest",
    );
    assert.ok(groundedResult?.id && workerResult?.id);

    await cdp.evaluate(`(() => {
      const item = [...document.querySelectorAll(".work-results--destinations li")].find(
        (candidate) => candidate.querySelector("strong")?.textContent.trim() === "worker output manifest",
      );
      item?.querySelector("a")?.click();
    })()`);
    await cdp.until(
      'document.querySelector("#selected-work-result") !== null',
      "selected WorkerOutputManifest",
    );
    const workerUrl = await cdp.evaluate("window.location.href");
    const workerText = await cdp.evaluate(
      'document.querySelector("#selected-work-result")?.innerText',
    );
    const manifestCall = calls.findLast(
      (call) =>
        call.method === "GET" &&
        call.path.includes(
          `/worker-output-manifests/${encodeURIComponent(workerResult.id)}`,
        ),
    );
    assert.equal(
      manifestCall?.status,
      200,
      "The selected result did not perform its exact production manifest read.",
    );
    const exactDiagnostics = manifestCall?.json?.content?.diagnostics;
    assert.ok(
      Array.isArray(exactDiagnostics),
      "The production manifest response omitted its exact diagnostics array.",
    );
    const renderedDiagnostics = await cdp.evaluate(`
      [...document.querySelectorAll(".selected-worker-output__diagnostics > li")].map((item) => ({
        code: item.querySelector("strong")?.textContent.trim(),
        severity: item.querySelector("span")?.textContent.trim().toLocaleLowerCase(),
        message: item.querySelector("p")?.textContent.trim(),
      }))
    `);
    assert.ok(
      workerUrl.includes(`/work/${completedWorkUnitId}?`),
      "The manifest was treated as a WorkUnit route identity.",
    );
    assert.ok(workerUrl.includes(encodeURIComponent(workerResult.id)));
    for (const value of [
      workerResult.id,
      completedWorkUnitId,
      "Reported outputs",
      "Measured resources",
      "Identity hashes and limitations",
    ]) {
      assert.ok(workerText.includes(value), `Worker result omitted ${value}.`);
    }
    assert.equal(renderedDiagnostics.length, exactDiagnostics.length);
    if (exactDiagnostics.length === 0) {
      assert.ok(workerText.includes("No diagnostics reported"));
    } else {
      assert.deepEqual(
        renderedDiagnostics,
        exactDiagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          severity: diagnostic.severity,
          message: diagnostic.message,
        })),
      );
    }
    assert.ok(!workerText.includes("Exact diagnostics unavailable"));
    execution.worker_output_manifest = {
      id: workerResult.id,
      producing_work_unit_id: completedWorkUnitId,
      destination: workerUrl,
      exact_outputs_rendered: true,
      measured_resources_rendered: true,
      exact_diagnostics_rendered: true,
      diagnostics_count: exactDiagnostics.length,
    };
    execution.completed_checks.push(
      "manifest opened through producing Work with selected manifest identity retained",
    );

    await cdp.evaluate(`(() => {
      const item = [...document.querySelectorAll(".work-results--destinations li")].find(
        (candidate) => candidate.querySelector("strong")?.textContent.trim() === "grounded response",
      );
      item?.querySelector("a")?.click();
    })()`);
    await cdp.until(
      'document.querySelector(".communication-plan, .reference-route-error") !== null',
      "grounded-response destination",
    );
    const groundedUrl = await cdp.evaluate("window.location.href");
    assert.ok(
      await cdp.evaluate(
        'document.querySelector(".communication-plan") !== null',
      ),
      `The exact retained grounded response did not render at ${groundedUrl}. Calls: ${JSON.stringify(calls.slice(-4))}`,
    );
    assert.ok(groundedUrl.includes(`/projects/${scientificProjectId}/petra?`));
    assert.ok(groundedUrl.includes(encodeURIComponent(groundedResult.id)));
    const communicationCall = calls.findLast(
      (call) =>
        call.method === "GET" &&
        call.path.includes("/communication?response_id="),
    );
    assert.equal(
      communicationCall?.status,
      200,
      "The exact production communication read did not return 200.",
    );
    const communication = communicationCall?.json;
    assert.equal(
      communication?.content?.source_response?.grounded_response_id,
      groundedResult.id,
    );
    assert.ok(communication?.content?.context_packet?.context_packet_id);
    assert.ok(communication?.content?.evidence_packet?.evidence_packet_id);
    assert.ok(
      communication?.content?.segments?.some(
        (segment) => segment.original_statement?.evidence_refs?.length > 0,
      ),
      "The exact communication response omitted its references.",
    );
    assert.ok(
      Array.isArray(communication?.content?.limitations) &&
        communication.content.limitations.length > 0,
      "The exact communication response omitted its authority limits.",
    );
    assert.equal(communication?.content?.authority?.effect, "none");
    await cdp.evaluate(`(() => {
      const details = [...document.querySelectorAll(".communication-plan__details")].find(
        (candidate) => candidate.querySelector("summary")?.textContent.trim() === "Exact record and version bindings",
      );
      details?.querySelector("summary")?.click();
    })()`);
    const groundedText = await cdp.evaluate("document.body.innerText");
    for (const value of [
      "Exact response, preservation, and limits",
      "Context packet",
      "Evidence packet",
      "Exact references",
      "Return to producing Work task",
    ]) {
      assert.ok(
        groundedText.includes(value),
        `Grounded response omitted ${value}.`,
      );
    }
    assert.ok(
      groundedText.toLocaleLowerCase().includes("communication boundary"),
      "Grounded response omitted its visible communication boundary.",
    );
    await activate(
      `[...document.querySelectorAll('a')].find((element) => element.textContent.includes("Return to producing Work task"))`,
    );
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(`/projects/${scientificProjectId}/work/${completedWorkUnitId}`)}`,
      "exact Work return",
    );
    await cdp.until(
      'document.querySelector(".work-results--destinations") !== null',
      "returned Work destinations",
    );

    const operationCalls = calls.filter(
      (call) =>
        call.path.includes("/work/") &&
        (call.method === "POST" || call.path.endsWith("/operations")),
    );
    assert.deepEqual(consoleErrors, []);
    observation = {
      scenario: "UX1.6-WORK/usable-work-ui",
      status: "passed",
      stable_url: workbench.url,
      project_id: scientificProjectId,
      registered_inquiry_visible: true,
      input_recorded: true,
      start_exercised: startDisabled !== "true",
      cancel_exercised: cancelDisabled !== "true",
      detach_exercised: true,
      reconnect_exercised: true,
      replay_exercised: true,
      grounded_response: {
        id: groundedResult.id,
        destination: groundedUrl,
        exact_response_rendered: true,
        context_packet_id:
          communication.content.context_packet.context_packet_id,
        evidence_packet_id:
          communication.content.evidence_packet.evidence_packet_id,
        exact_references_rendered: true,
        authority_limits_rendered: true,
        producing_work_return_rendered: true,
      },
      worker_output_manifest: {
        id: workerResult.id,
        producing_work_unit_id: completedWorkUnitId,
        destination: workerUrl,
        exact_outputs_rendered: true,
        measured_resources_rendered: true,
        exact_diagnostics_rendered: true,
        diagnostics_count: exactDiagnostics.length,
      },
      boundary:
        "Executed the complete production Work browser path through registered controls and exact result reads. Worker registration and representative setup occur through the cumulative disposable-store harness; no browser response or Work result is mocked.",
      operation_call_count: operationCalls.length,
      console_errors: consoleErrors,
    };
    return observation;
  };

  const record = async (stage, context) => {
    backendUrl = context.backendUrl;
    token = context.token;
    scientificProjectId = context.scientificProjectId;
    scientificReviewSessionId = context.scientificReviewSessionId;
    if (stage === "corrected_blocked_limited_basis") {
      completedWorkUnitId = context.workUnitId;
      return undefined;
    }
    if (stage === "refreshed_paired_profile") {
      try {
        observation = await run();
        writeObservation();
        assert.equal(
          observation.status,
          "passed",
          observation.blocking_boundary,
        );
      } catch (error) {
        observation = {
          scenario: "UX1.6-WORK/usable-work-ui",
          status: "incomplete",
          stable_url: workbench?.url,
          project_id: scientificProjectId,
          producing_work_unit_id: completedWorkUnitId,
          completed_checks: execution.completed_checks,
          worker_output_manifest: execution.worker_output_manifest,
          blocking_boundary:
            error instanceof Error
              ? error.message.split(". Calls:")[0]
              : String(error),
          final_calls: calls.slice(-8).map((call) => ({
            method: call.method,
            path: call.path,
            status: call.status,
            error_code: call.json?.error?.code,
            error_message: call.json?.error?.message,
          })),
          console_errors: consoleErrors,
        };
        writeObservation();
        throw error;
      }
      return undefined;
    }
    if (stage === "stale_before_refresh" || stage === "restart_complete") {
      return undefined;
    }
    if (stage === "projection_lag") {
      return prepareAndApply(scientificReviewSessionId);
    }
    if (stage === "governed_command_failure") {
      return prepareAndApply(
        context.failureReviewSessionId,
        context.advanceAuthority,
      );
    }
    throw new Error(`Unsupported Wave 6 Work observer stage: ${stage}`);
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    writeObservation();
    try {
      if (cdp?.socket.readyState === WebSocket.OPEN) {
        await Promise.race([
          cdp.send("Browser.close").catch(() => undefined),
          wait(2_000),
        ]);
      }
    } finally {
      cdp?.socket.close();
      if (chrome?.child.exitCode === null) {
        chrome.child.kill("SIGTERM");
        await Promise.race([
          new Promise((resolveExit) =>
            chrome.child.addListener("close", resolveExit),
          ),
          wait(5_000),
        ]);
      }
      if (chrome?.child.exitCode === null) chrome.child.kill("SIGKILL");
      await workbench?.vite.close();
      if (
        chrome?.profile?.startsWith(join(tmpdir(), "petra-wave6-work-browser-"))
      ) {
        rmSync(chrome.profile, {
          recursive: true,
          force: true,
          maxRetries: 10,
          retryDelay: 100,
        });
      }
    }
  };

  return { record, close };
};
