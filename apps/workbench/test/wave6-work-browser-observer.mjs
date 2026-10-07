import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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
  let inputWorkUnitId;
  let retryWorkUnitId;
  let resumableWorkUnitId;
  let startAgainWorkUnitId;
  let workbench;
  let chrome;
  let cdp;
  let observation;
  let disconnectPredicate;
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

  const capture = async (name) => {
    const directory = process.env.PETRA_FRONTEND_VISUAL_CAPTURE_DIR;
    if (directory === undefined) return;
    mkdirSync(directory, { recursive: true });
    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    writeFileSync(resolve(directory, `${name}.png`), screenshot.data, "base64");
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
      shouldDisconnectResponse: (call) => disconnectPredicate?.(call) === true,
      ...(process.env.PETRA_WAVE6_FINAL_EXIT === "1"
        ? { port: 4311, strictPort: true }
        : {}),
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
    const destination = new URL(path, workbench.url);
    const result = await cdp.send("Page.navigate", {
      url: destination.href,
    });
    assert.equal(result.errorText, undefined, `Could not open ${label}.`);
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(destination.pathname)} && (${ready})`,
      label,
    );
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
    if (observation !== undefined) return observation;
    await start();
    await navigate(
      `/projects/${scientificProjectId}/work`,
      'document.querySelector(".work-units") !== null',
      "Project Work collection",
    );
    await capture("work-collection-desktop");
    const collectionText = await cdp.evaluate("document.body.innerText");
    assert.ok(
      collectionText.includes("Research question"),
      "The registered scientific inquiry path is not visible in Work.",
    );
    execution.completed_checks.push("registered scientific inquiry visible");
    assert.ok(
      inputWorkUnitId,
      "No exact Work task requiring registered input is available.",
    );
    const attentionPath = await cdp.evaluate(`(() => {
      const group = [...document.querySelectorAll(".work-group")].find(
        (candidate) => candidate.querySelector("h3")?.textContent.trim() === "Needs attention",
      );
      return [...(group?.querySelectorAll("a") ?? [])].find(
        (candidate) => candidate.getAttribute("href")?.endsWith(${JSON.stringify(`/work/${inputWorkUnitId}`)}),
      )?.getAttribute("href");
    })()`);
    assert.ok(attentionPath, "No exact Work task requiring input is visible.");

    assert.ok(
      resumableWorkUnitId,
      "No exact registered-checkpoint Work task is available to Resume.",
    );
    const resumePath = `/projects/${scientificProjectId}/work/${resumableWorkUnitId}`;
    await navigate(
      resumePath,
      'document.querySelector(".work-controls") !== null',
      "checkpointed Work task",
    );
    await capture("work-checkpoint-desktop");
    assert.equal(
      await cdp.evaluate(
        'document.querySelector("#work-execution-controls button")?.textContent.trim()',
      ),
      "Resume work",
      "The available Resume action did not lead the execution controls.",
    );
    await cdp.evaluate(
      `document.querySelector('a[href="#work-execution-controls"]')?.click()`,
    );
    const jump = await cdp.evaluate(`(() => {
      const first = document.querySelector('#work-execution-controls button');
      const composer = document.querySelector('.reference-agent-composer');
      return { firstTop: first?.getBoundingClientRect().top, composerTop: composer?.getBoundingClientRect().top };
    })()`);
    assert.ok(
      jump.firstTop < jump.composerTop,
      "The Work control jump left the available action behind the composer.",
    );
    await capture("work-controls-jump-desktop");
    const assessedResume = calls.findLast(
      (call) =>
        call.method === "GET" &&
        call.path.endsWith(`/work/${resumableWorkUnitId}/operations`),
    );
    const resumeBinding = assessedResume?.json?.resume_binding;
    assert.equal(
      assessedResume?.json?.controls?.find(
        (control) => control.operation === "resume",
      )?.state,
      "available",
      "The production assessment did not make registered Resume available.",
    );
    assert.ok(
      resumeBinding,
      "The available Resume control omitted its exact checkpoint binding.",
    );
    assert.equal(
      await cdp.evaluate(
        `${button("Resume work")}.getAttribute("aria-disabled")`,
      ),
      null,
      "The visible Resume control stayed unavailable despite its exact binding.",
    );
    assert.equal(
      await cdp.evaluate(
        `${button("Start again")}.getAttribute("aria-disabled")`,
      ),
      "true",
      "Start again became available without a workflow-specific fresh-input transition.",
    );
    await cdp.evaluate(`${button("Resume work")}.click()`);
    await cdp.until(
      'document.querySelector(".work-operation-result")?.textContent.includes("registered compatible transition") === true',
      "resumed checkpointed Work",
    );
    const resumeCall = calls.findLast(
      (call) =>
        call.method === "POST" &&
        call.path.endsWith(`/work/${resumableWorkUnitId}/resume`),
    );
    assert.ok(
      resumeCall,
      "The visible Resume control issued no production command.",
    );
    assert.deepEqual(
      resumeCall.requestJson.expected_work_unit_ref,
      resumeBinding.expected_work_unit_ref,
      "Resume did not copy the exact assessed Work revision and specification.",
    );
    assert.deepEqual(
      resumeCall.requestJson.expected_checkpoint,
      resumeBinding.expected_checkpoint,
      "Resume did not copy the exact assessed checkpoint.",
    );
    assert.equal(
      Object.hasOwn(resumeCall.requestJson, "actor"),
      false,
      "The browser selected resume authority.",
    );
    const resumeResultText = await cdp.evaluate(
      'document.querySelector(".work-operation-result")?.innerText',
    );
    for (const value of [
      "Resumed attempt 1",
      "retained checkpoint and prior attempts preserved",
      "Project authority unchanged",
      "Return to this Work task",
    ]) {
      assert.ok(
        resumeResultText.includes(value),
        `Resume outcome omitted ${value}.`,
      );
    }
    const resumeReturn = await cdp.evaluate(
      `${link("Return to this Work task")}.getAttribute("href")`,
    );
    assert.equal(
      resumeReturn,
      `${resumePath}#work-control-boundary`,
      "Resume did not preserve the exact Work return.",
    );
    assert.equal(
      await cdp.evaluate("window.location.pathname"),
      resumePath,
      "Resume left the originating Work task.",
    );
    assert.equal(
      await cdp.evaluate(
        `${button("Resume work")}.getAttribute("aria-disabled")`,
      ),
      "true",
      "Resume remained available after the checkpoint was consumed.",
    );
    execution.completed_checks.push(
      "registered checkpoint resumed through exact visible control",
    );
    const workListPath = `/projects/${scientificProjectId}/work`;
    await cdp.evaluate(
      `document.querySelector('.work-detail__heading a[href=${JSON.stringify(workListPath)}]')?.click()`,
    );
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(workListPath)} && document.querySelector('.work-units') !== null`,
      "Work collection after Resume",
    );
    await cdp.evaluate(
      `[...document.querySelectorAll('a')].find((item) => item.getAttribute('href') === ${JSON.stringify(resumePath)})?.click()`,
    );
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(resumePath)} && document.querySelector('.work-operation-result')?.textContent.includes('Resumed attempt 1')`,
      "retained Resume receipt after Workspace route change",
    );
    await cdp.evaluate(
      "document.querySelector('.reference-workspace-inspect')?.click()",
    );
    await cdp.until(
      `window.location.pathname.endsWith('/inspect') && document.querySelector('.reference-inspect')?.textContent.includes(${JSON.stringify(resumeCall.json.receipt_id)}) && document.querySelector('.reference-inspect')?.textContent.includes('Server-assessed Work controls')`,
      "exact Resume receipt in Work Inspect",
    );
    await capture("work-inspect-desktop");
    await cdp.send("Page.reload", { ignoreCache: true });
    await cdp.until(
      `performance.getEntriesByType('navigation')[0]?.type === 'reload' && document.readyState === 'complete' && window.location.pathname.endsWith('/inspect') && ${link("Return to task")} !== undefined`,
      "fresh Inspect with a return link",
    );
    await cdp.evaluate(`(() => {
      const summary = [...document.querySelectorAll('.reference-inspect summary')]
        .find((item) => item.textContent.trim() === 'Control and identity');
      summary?.click();
    })()`);
    await cdp.until(
      `document.querySelector('.reference-inspect')?.textContent.includes(${JSON.stringify(resumeCall.json.receipt_id)}) && document.querySelector('.reference-inspect')?.textContent.includes('Recent retained command receipts')`,
      "retained Resume receipt after full browser reload",
    );
    const reloadReturn = await cdp.evaluate(
      `(() => { const target = ${link("Return to task")}; const href = target?.getAttribute('href'); target?.click(); return href; })()`,
    );
    assert.ok(
      reloadReturn === resumePath ||
        reloadReturn === `${resumePath}#work-control-boundary`,
      `Inspect lost the exact Work return after full reload: ${reloadReturn}`,
    );
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(resumePath)} && document.querySelector('.work-detail__heading') !== null && document.querySelector('.work-controls') !== null`,
      "exact Work return after receipt inspection",
    );
    execution.completed_checks.push(
      "exact Resume receipt survived navigation and full reload in Inspect",
    );

    assert.ok(
      completedWorkUnitId && startAgainWorkUnitId,
      "No exact terminal prior Work and registered fresh Work are available for Start again.",
    );
    const priorWorkPath = `/projects/${scientificProjectId}/work/${completedWorkUnitId}`;
    const freshWorkPath = `/projects/${scientificProjectId}/work/${startAgainWorkUnitId}`;
    await navigate(
      priorWorkPath,
      'document.querySelector(".work-controls") !== null',
      "terminal Work with registered fresh execution",
    );
    const assessedStartAgain = calls.findLast(
      (call) =>
        call.method === "GET" &&
        call.path.endsWith(`/work/${completedWorkUnitId}/operations`),
    );
    const startAgainBinding = assessedStartAgain?.json?.start_again_binding;
    assert.equal(
      assessedStartAgain?.json?.controls?.find(
        (control) => control.operation === "start_again",
      )?.state,
      "available",
      "The production assessment did not make registered Start again available.",
    );
    assert.ok(
      startAgainBinding,
      "The available Start again control omitted its exact fresh-input binding.",
    );
    assert.equal(
      startAgainBinding.fresh_work_unit_ref.work_unit_id,
      startAgainWorkUnitId,
      "The Start again assessment selected a different fresh Work identity.",
    );
    assert.equal(
      await cdp.evaluate(
        `${button("Start again")}.getAttribute("aria-disabled")`,
      ),
      null,
      "The visible Start again control stayed unavailable despite its exact binding.",
    );
    assert.equal(
      await cdp.evaluate(
        `${button("Resume work")}.getAttribute("aria-disabled")`,
      ),
      "true",
      "Resume became available on the separate terminal fresh-execution path.",
    );
    await cdp.evaluate(`${button("Start again")}.click()`);
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(freshWorkPath)} && document.querySelector(".work-start-again-outcome") !== null`,
      "fresh linked Work destination",
    );
    const startAgainCall = calls.findLast(
      (call) =>
        call.method === "POST" &&
        call.path.endsWith(`/work/${completedWorkUnitId}/start-again`),
    );
    assert.ok(
      startAgainCall,
      "The visible Start again control issued no production command.",
    );
    assert.deepEqual(
      startAgainCall.requestJson.expected_prior_work_unit_ref,
      startAgainBinding.expected_prior_work_unit_ref,
      "Start again did not copy the exact assessed prior Work revision and specification.",
    );
    assert.deepEqual(
      startAgainCall.requestJson.start_again_registration_ref,
      startAgainBinding.start_again_registration_ref,
      "Start again did not copy the exact assessed fresh-input registration.",
    );
    for (const forbidden of [
      "actor",
      "capability_grant_id",
      "fresh_work_unit_ref",
      "input_transition",
    ]) {
      assert.equal(
        Object.hasOwn(startAgainCall.requestJson, forbidden),
        false,
        `The browser selected server-owned ${forbidden}.`,
      );
    }
    assert.equal(startAgainCall.status, 200);
    assert.equal(
      startAgainCall.json?.destination?.work_unit_ref?.work_unit_id,
      startAgainWorkUnitId,
      "The Start again receipt did not own the opened Work destination.",
    );
    const startAgainText = await cdp.evaluate(
      'document.querySelector(".work-start-again-outcome")?.innerText',
    );
    for (const value of [
      "Started again with fresh input",
      "Prior attempt retained",
      "Fresh immutable input",
      "Output reuse",
      "None. Prior outputs, history, and incurred use remain",
      "New linked Work",
      `lineage attempt ${startAgainCall.json.new_attempt.lineage_attempt}`,
      startAgainBinding.input_transition.fresh_input_manifest_ref
        .worker_input_manifest_id,
    ]) {
      assert.ok(
        startAgainText.includes(value),
        `Start again outcome omitted ${value}.`,
      );
    }
    const priorReturn = await cdp.evaluate(
      'document.querySelector(".work-detail__heading > .reference-context-back")?.getAttribute("href")',
    );
    assert.equal(
      priorReturn,
      `${priorWorkPath}#work-control-boundary`,
      "The fresh Work destination did not preserve return to the prior Work task.",
    );
    await activate(
      'document.querySelector(".work-detail__heading > .reference-context-back")',
    );
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(priorWorkPath)}`,
      "prior Work contextual return",
    );
    assert.equal(
      await cdp.evaluate(
        `${button("Start again")}.getAttribute("aria-disabled")`,
      ),
      "true",
      "Start again remained available after its registered fresh Work was consumed.",
    );
    execution.completed_checks.push(
      "registered fresh-input Start again opened linked Work and returned to retained prior Work",
    );

    await navigate(
      attentionPath,
      'document.querySelector(".reference-agent-control #required-input")?.getClientRects().length > 0',
      "Work required input",
    );
    const inputText = await cdp.evaluate("document.body.innerText");
    assert.match(inputText, /required input/i);
    for (const value of [
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

    await cdp.evaluate(`(() => {
      const select = document.querySelector(".work-steering select");
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      setter.call(select, "user_visible");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    assert.equal(
      await cdp.evaluate(
        `${button("Set priority")}.getAttribute("aria-disabled")`,
      ),
      null,
      "The visible priority control stayed unavailable for active Work.",
    );
    await cdp.evaluate(`${button("Set priority")}.click()`);
    await cdp.until(
      'document.querySelector(".work-operation-result")?.textContent.includes("selected Work scheduling priority") === true',
      "prioritized active Work",
    );
    const prioritizeCall = calls.findLast(
      (call) =>
        call.method === "POST" &&
        call.path.endsWith(`/work/${inputWorkUnitId}`) &&
        call.requestJson?.operation === "prioritize",
    );
    assert.equal(prioritizeCall?.status, 200);
    assert.equal(prioritizeCall?.requestJson?.priority, "user_visible");
    execution.completed_checks.push("active Work priority recorded");

    const steeringInstruction =
      "Preserve table captions with their nearest table.";
    await cdp.evaluate(`(() => {
      const textarea = document.querySelector(".work-steering textarea");
      const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
      textareaSetter.call(textarea, ${JSON.stringify("Preserve table captions with their nearest table.")});
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      const select = document.querySelector(".work-steering select");
      const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
      selectSetter.call(select, "user_blocking");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    await cdp.evaluate(
      `document.querySelector('.reference-workspace-destinations a[href=${JSON.stringify(`/projects/${scientificProjectId}/review`)}]')?.click()`,
    );
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(`/projects/${scientificProjectId}/review`)}`,
      "Review Workspace while Work instruction is drafted",
    );
    await cdp.evaluate("window.history.back()");
    await cdp.until(
      `window.location.pathname.endsWith(${JSON.stringify(`/work/${inputWorkUnitId}`)}) && document.querySelector('.work-steering textarea')?.value === ${JSON.stringify(steeringInstruction)} && document.querySelector('.work-steering select')?.value === 'user_blocking'`,
      "Work instruction and priority after Review Workspace return",
    );
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 420,
      height: 820,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.evaluate(`(() => {
      const button = [...document.querySelectorAll('.reference-mobile-pane-switcher button')]
        .find((item) => item.textContent.trim() === 'Agent');
      button?.click();
    })()`);
    await cdp.until(
      `getComputedStyle(document.querySelector('.reference-agent-panel')).display !== 'none' && document.querySelector('.work-steering textarea')?.value === ${JSON.stringify(steeringInstruction)} && document.querySelector('.work-steering select')?.value === 'user_blocking'`,
      "live Work draft in narrow Agent pane",
    );
    const agentScale = await cdp.evaluate(`(() => {
      document.documentElement.style.fontSize = '200%';
      const panel = document.querySelector('.reference-agent-panel');
      return { client: panel.clientWidth, content: panel.scrollWidth };
    })()`);
    assert.ok(
      agentScale.content <= agentScale.client + 1,
      `The live Work Agent clips at 200% text scale: ${JSON.stringify(agentScale)}`,
    );
    await cdp.evaluate(`(() => {
      const button = [...document.querySelectorAll('.reference-mobile-pane-switcher button')]
        .find((item) => item.textContent.trim() === 'Workspace');
      button?.click();
    })()`);
    await cdp.until(
      "getComputedStyle(document.querySelector('.reference-workspace-panel')).display !== 'none'",
      "live Work Workspace after narrow pane switch",
    );
    const workspaceScale = await cdp.evaluate(`(() => {
      const panel = document.querySelector('.reference-workspace-panel');
      return { client: panel.clientWidth, content: panel.scrollWidth };
    })()`);
    assert.ok(
      workspaceScale.content <= workspaceScale.client + 1,
      `The live Work Workspace clips at 200% text scale: ${JSON.stringify(workspaceScale)}`,
    );
    await cdp.evaluate("document.documentElement.style.fontSize = ''");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    execution.completed_checks.push(
      "Work instruction survived Review route change and narrow pane switches; both panes fit 420 px at 200% text scale",
    );
    await cdp.until(
      `${button("Steer work")}.getAttribute("aria-disabled") !== "true"`,
      "active Work steering input",
    );
    await cdp.evaluate(`${button("Steer work")}.click()`);
    await cdp.until(
      'document.querySelector(".work-operation-result")?.textContent.includes("Work instruction") === true',
      "steered active Work",
    );
    const steerCall = calls.findLast(
      (call) =>
        call.method === "POST" &&
        call.path.endsWith(`/work/${inputWorkUnitId}`) &&
        call.requestJson?.operation === "steer",
    );
    assert.equal(steerCall?.status, 200);
    assert.equal(steerCall?.requestJson?.instruction, steeringInstruction);
    assert.equal(steerCall?.requestJson?.priority, "user_blocking");
    execution.completed_checks.push("active Work steering recorded");

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

    assert.ok(
      retryWorkUnitId,
      "No exact retryable failed Work task is available.",
    );
    const retryPath = `/projects/${scientificProjectId}/work/${retryWorkUnitId}`;
    await navigate(
      retryPath,
      'document.querySelector(".work-controls") !== null',
      "retryable failed Work",
    );
    const failedWorkText = await cdp.evaluate("document.body.innerText");
    for (const value of ["Failed", "Retry failed work"]) {
      assert.ok(
        failedWorkText.includes(value),
        `Retryable failed Work omitted ${value}.`,
      );
    }
    assert.equal(
      await cdp.evaluate(
        `${button("Retry failed work")}.getAttribute("aria-disabled")`,
      ),
      null,
      "The visible Retry control stayed unavailable for retryable failed Work.",
    );
    await cdp.evaluate(`${button("Retry failed work")}.click()`);
    await cdp.until(
      'document.querySelector(".work-operation-result")?.textContent.includes("eligible failed Work entered its next recorded attempt") === true',
      "retried failed Work",
    );
    const retryCall = calls.findLast(
      (call) =>
        call.method === "POST" &&
        call.path.endsWith(`/work/${retryWorkUnitId}`) &&
        call.requestJson?.operation === "retry",
    );
    assert.equal(retryCall?.status, 200);
    assert.equal(retryCall?.json?.outcome, "retried");
    assert.equal(
      retryCall?.requestJson?.expected_work_unit_ref?.work_unit_id,
      retryWorkUnitId,
    );
    await cdp.until(
      'document.querySelector(".work-state")?.textContent.includes("Running") === true',
      "visible running Work state after retry",
    );
    execution.completed_checks.push(
      "retryable failed Work entered its next retained attempt",
    );

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
    ]) {
      assert.ok(
        completedText.includes(value),
        `Completed Work omitted ${value}. Rendered text: ${completedText.slice(0, 2_000)}`,
      );
    }
    execution.completed_checks.push(
      "completed Work stages, resources, and result destinations rendered",
    );
    const completedWorkPath = `/projects/${scientificProjectId}/work/${completedWorkUnitId}`;
    const completedInspectPath = await cdp.evaluate(`(() => {
      const link = document.querySelector('.reference-workspace-inspect');
      if (!link) return undefined;
      const url = new URL(link.href);
      return url.pathname + url.search;
    })()`);
    assert.ok(
      completedInspectPath?.includes(
        `/projects/${scientificProjectId}/inspect?`,
      ),
    );
    await cdp.evaluate(
      "document.querySelector('.reference-workspace-inspect').click()",
    );
    await cdp.until(
      `window.location.pathname.endsWith('/inspect') && document.querySelector('.reference-workspace-panel')?.dataset.workspaceObjectRef === ${JSON.stringify(completedWorkUnitId)} && document.querySelector('.reference-inspect')?.textContent.includes('Authorized limit') && document.querySelector('.reference-inspect')?.textContent.includes('Server-assessed Work controls')`,
      "exact Work inspection",
    );
    assert.equal(
      await cdp.evaluate(
        "document.querySelector('.reference-inspect__intro a')?.getAttribute('href')",
      ),
      completedWorkPath,
    );
    await cdp.evaluate(
      "document.querySelector('.reference-inspect__intro a').click()",
    );
    await cdp.until(
      `window.location.pathname === ${JSON.stringify(completedWorkPath)} && document.querySelector('.work-results--destinations') !== null`,
      "exact Work return from Inspect",
    );
    execution.completed_checks.push(
      "single Inspect entry resolved exact Work and returned to its task",
    );
    await cdp.until(
      '[...document.querySelectorAll(".work-operation-result")].some((item) => item.textContent.includes("Canonical Work delivery")) && [...document.querySelectorAll(".work-operation-result")].some((item) => item.textContent.toLocaleLowerCase().includes("replayed"))',
      "automatic Work delivery restoration",
    );
    execution.completed_checks.push(
      "durable delivery reconnected and replayed automatically",
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
      steer_exercised: true,
      prioritize_exercised: true,
      start_exercised: startDisabled !== "true",
      cancel_exercised: cancelDisabled !== "true",
      retry_exercised: true,
      detach_exercised: true,
      reconnect_exercised: true,
      replay_exercised: true,
      resume_exercised: true,
      start_again_exercised: true,
      inspector_exact_work_return: true,
      work_draft_survived_review_and_narrow_panes: true,
      retried_work: {
        work_unit_id: retryWorkUnitId,
        resulting_revision: retryCall.json.resulting_work_unit_ref.revision,
        outcome: retryCall.json.outcome,
        prior_attempts_preserved:
          retryCall.json.effect.prior_attempts_preserved,
        domain_authority_changed:
          retryCall.json.effect.domain_authority_changed,
      },
      resumed_work: {
        work_unit_id: resumableWorkUnitId,
        requested_revision:
          resumeCall.requestJson.expected_work_unit_ref.revision,
        resulting_revision: resumeCall.json.resulting_work_unit_ref.revision,
        resumed_attempt: resumeCall.json.resumed_attempt,
        exact_checkpoint_copied: true,
        contextual_return: resumeReturn,
        start_again_unavailable: true,
        authority_selected_by_browser: false,
      },
      started_again_work: {
        prior_work_unit_id: completedWorkUnitId,
        prior_work_attempt: startAgainCall.json.prior_attempt.work_attempt,
        prior_lineage_attempt:
          startAgainCall.json.prior_attempt.lineage_attempt,
        fresh_work_unit_id: startAgainWorkUnitId,
        fresh_work_attempt: startAgainCall.json.new_attempt.work_attempt,
        fresh_lineage_attempt: startAgainCall.json.new_attempt.lineage_attempt,
        fresh_input_manifest_id:
          startAgainCall.json.fresh_input.fresh_input_manifest_ref
            .worker_input_manifest_id,
        retained_output_reuse:
          startAgainCall.json.fresh_input.retained_output_reuse,
        exact_registration_copied: true,
        prior_work_preserved: startAgainCall.json.effect.prior_work_preserved,
        contextual_return: priorReturn,
        authority_selected_by_browser: false,
      },
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
        "Executed the complete production Work browser path through registered controls, including separate exact registered-checkpoint Resume and registered fresh-input Start again transitions, linked Work navigation and return, and exact result reads. Worker registration and representative setup occur through the cumulative disposable-store harness; no browser response or Work result is mocked, and the browser selects no authority, replacement Work, lineage, or input-reuse policy.",
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
      inputWorkUnitId = context.inputWorkUnitId;
      retryWorkUnitId = context.retryWorkUnitId;
      resumableWorkUnitId = context.resumableWorkUnitId;
      startAgainWorkUnitId = context.startAgainWorkUnitId;
      return undefined;
    }
    if (stage === "refreshed_paired_profile") {
      if (process.env.PETRA_WAVE6_FINAL_EXIT === "1") return undefined;
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

  return {
    record,
    close,
    startBrowser: start,
    runWorkflow: run,
    setDisconnectPredicate(predicate) {
      disconnectPredicate = predicate;
    },
    get browserSession() {
      if (
        workbench === undefined ||
        chrome === undefined ||
        cdp === undefined
      ) {
        return undefined;
      }
      return {
        calls,
        consoleFailures: consoleErrors,
        workbench,
        chrome,
        cdp,
      };
    },
    get observation() {
      return observation;
    },
  };
};
