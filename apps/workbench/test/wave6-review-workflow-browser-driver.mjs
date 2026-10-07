import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const exactLink = (path) =>
  `[...document.querySelectorAll('a')].find((element) => new URL(element.href).pathname === ${JSON.stringify(path)})`;

const closeChrome = async ({ chrome, cdp }) => {
  try {
    if (cdp.socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        cdp.send("Browser.close").catch(() => undefined),
        wait(2_000),
      ]);
    }
  } finally {
    cdp.socket.close();
    if (chrome.child.exitCode === null) chrome.child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) =>
        chrome.child.addListener("close", resolveExit),
      ),
      wait(5_000),
    ]);
    if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
    assert.ok(chrome.profile.startsWith(join(tmpdir(), "petra-wave6-review-")));
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
};

export const startWave6ReviewWorkflowBrowser = async ({
  root,
  getBackendUrl,
  projectId,
  scenario,
  existingSession,
}) => {
  const ownsBrowser = existingSession === undefined;
  const calls = existingSession?.calls ?? [];
  const consoleFailures = existingSession?.consoleFailures ?? [];
  const workbench =
    existingSession?.workbench ??
    (await startWorkbench({ root, getBackendUrl, calls }));
  const chrome =
    existingSession?.chrome ??
    (await startChrome({ profilePrefix: "petra-wave6-review-" }));
  const cdp = existingSession?.cdp ?? (await createCdp(chrome.socketUrl));
  const { send, evaluate, until } = cdp;
  let closed = false;
  const capture = async (name) => {
    const directory = process.env.PETRA_FRONTEND_VISUAL_CAPTURE_DIR;
    if (directory === undefined || directory.trim().length === 0) return;
    await evaluate("document.fonts.ready");
    const result = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    writeFileSync(
      resolve(directory, "review-" + name + ".png"),
      result.data,
      "base64",
    );
  };

  if (ownsBrowser) {
    cdp.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (
        message.method === "Runtime.consoleAPICalled" &&
        ["error", "assert"].includes(message.params?.type)
      ) {
        consoleFailures.push(
          message.params.args?.map(
            (argument) => argument.value ?? argument.description,
          ),
        );
      }
      if (message.method === "Runtime.exceptionThrown") {
        consoleFailures.push(
          message.params?.exceptionDetails?.exception?.description ??
            message.params?.exceptionDetails,
        );
      }
    });
  }

  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Accessibility.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  const browserVersion = await send("Browser.getVersion");

  const navigate = async (path, ready, label) => {
    const navigation = await send("Page.navigate", {
      url: new URL(path, workbench.url).href,
    });
    assert.equal(navigation.errorText, undefined);
    try {
      await until(ready, label);
      await evaluate("document.fonts.ready");
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nBody: ${await evaluate("document.body.innerText")}\nCalls: ${JSON.stringify(
          calls.slice(-16).map((call) => ({
            method: call.method,
            path: call.path,
            status: call.status,
            request_schema: call.requestJson?.schema_name,
            response_schema: call.json?.schema_name,
            error_code: call.json?.error?.code,
          })),
        )}\nConsole: ${JSON.stringify(consoleFailures)}`,
        { cause: error },
      );
    }
  };

  const key = async (keyValue, code, keyCode, text = undefined) => {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: keyValue,
      code,
      windowsVirtualKeyCode: keyCode,
      ...(text === undefined ? {} : { text }),
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: keyValue,
      code,
      windowsVirtualKeyCode: keyCode,
    });
  };
  const activate = async (expression) => {
    await evaluate(`${expression}.focus()`);
    await key("Enter", "Enter", 13, "\r");
  };
  const setControlValue = async (selector, value) =>
    evaluate(`(() => {
      const control = document.querySelector(${JSON.stringify(selector)});
      if (control === null) throw new Error(${JSON.stringify(`Missing control ${selector}`)});
      const prototype = control instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(
        control,
        ${JSON.stringify(value)},
      );
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
  const latestCall = (predicate) => [...calls].reverse().find(predicate);
  const reviewPath = (reviewSessionId) =>
    `/projects/${projectId}/review/${reviewSessionId}`;
  const returnPath = `/projects/${projectId}/work/${scenario.return_work_unit_id}`;

  const correctionPath = reviewPath(scenario.correction_review_session_id);
  await navigate(
    `/projects/${projectId}/review`,
    'document.querySelector(".review-group") !== null',
    "production Review queue",
  );
  await capture("queue-desktop");
  await until(
    "document.querySelector('.reference-agent-review-attention[data-operation-id=\"review.queue\"]') !== null",
    "open Review sessions raised in Agent context",
  );
  await until(
    `${exactLink(correctionPath)} !== undefined`,
    "scenario Review link",
  );
  await activate(exactLink(correctionPath));
  await until(
    `window.location.pathname === ${JSON.stringify(correctionPath)} && ${button("Edit candidate")} !== undefined`,
    "opened exact correction Review",
  );
  await capture("detail-desktop");
  await activate(
    'document.querySelector(".review-decision a.reference-text-link")',
  );
  await until(
    `(() => {
      const actions = document.querySelector("#review-decision-actions");
      const firstButton = actions?.querySelector("button");
      const composer = document.querySelector(".reference-agent-composer");
      const panel = document.querySelector(".reference-agent-panel");
      return document.activeElement === actions && firstButton !== null &&
        composer !== null && panel !== null &&
        firstButton.getBoundingClientRect().top >= panel.getBoundingClientRect().top &&
        firstButton.getBoundingClientRect().top < composer.getBoundingClientRect().top;
    })()`,
    "keyboard jump exposes Review decision controls above the composer",
  );
  await activate(button("Edit candidate"));
  await until(
    'document.querySelector("#review-candidate-canonical-text") !== null',
    "candidate editor",
  );
  const correctedText =
    "The reviewed study reports a bounded improvement on its defined evaluation task.";
  await setControlValue("#review-candidate-canonical-text", correctedText);
  const sourceCollectionPath = `/projects/${projectId}/sources`;
  await evaluate(
    `document.querySelector('.reference-workspace-destinations a[href=${JSON.stringify(sourceCollectionPath)}]')?.click()`,
  );
  await until(
    `window.location.pathname === ${JSON.stringify(sourceCollectionPath)} && document.querySelector('.reference-source-list') !== null`,
    "Sources Workspace while candidate edit is drafted",
  );
  await evaluate("window.history.back()");
  await until(
    `window.location.pathname === ${JSON.stringify(correctionPath)} && ${button("Edit candidate")} !== undefined`,
    "Review Workspace after Source task",
  );
  if (
    !(await evaluate(
      "document.querySelector('#review-candidate-canonical-text') !== null",
    ))
  ) {
    await activate(button("Edit candidate"));
  }
  await until(
    `document.querySelector('#review-candidate-canonical-text')?.value === ${JSON.stringify(correctedText)}`,
    "candidate edit after Workspace renderer change",
  );
  await until(
    `${button("Save working correction")}.getAttribute("aria-disabled") !== "true"`,
    "available candidate correction",
  );
  await activate(button("Save working correction"));
  await until(
    'document.querySelector(".review-correction-notice[data-state=success]") !== null',
    "confirmed candidate correction",
  );
  const correctionCall = latestCall(
    (call) =>
      call.method === "POST" && call.path.endsWith("/candidate-correction"),
  );
  assert.equal(correctionCall?.status, 200);
  assert.equal(correctionCall?.authorization, "Bearer petra-local-development");
  assert.equal(
    correctionCall?.requestJson?.correction_input?.canonical_text,
    correctedText,
  );
  assert.equal(correctionCall?.json?.applied, true);

  await navigate(
    correctionPath,
    `${button("Change basis")} !== undefined`,
    "reloaded corrected Review",
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(correctedText),
  );
  await activate(button("Change basis"));
  await until(
    'document.querySelector("#review-basis-editor") !== null',
    "basis revision editor",
  );
  await setControlValue("#review-basis-source-scope", "full_text");
  await setControlValue("#review-basis-detail-level", "broad");
  await setControlValue("#review-basis-source-stance", "qualifies");
  await setControlValue("#review-basis-modality", "hedged");
  await setControlValue(
    "#review-basis-attribution",
    "The study authors in the exact retained passage",
  );
  await setControlValue(
    "#review-basis-uncertainty",
    "The passage does not establish generalization beyond the study-defined task.",
  );
  await setControlValue(
    "#review-basis-reason",
    "Retain the exact material qualification while leaving the corrected Claim text unchanged.",
  );
  await until(
    `${button("Save working basis revision")}.getAttribute("aria-disabled") !== "true"`,
    "available basis revision",
  );
  await activate(button("Save working basis revision"));
  await until(
    'document.querySelector(".review-basis-revision-notice[data-state=success]") !== null',
    "confirmed basis revision",
  );
  const basisCall = latestCall(
    (call) =>
      call.method === "POST" && call.path.endsWith("/candidate-basis-revision"),
  );
  assert.equal(basisCall?.status, 200);
  assert.equal(basisCall?.json?.applied, true);
  assert.equal(
    basisCall?.requestJson?.basis_revision_input?.source_scope,
    "full_text",
  );
  assert.equal(
    basisCall?.requestJson?.basis_revision_input?.detail_level,
    "broad",
  );
  await evaluate(`${exactLink(returnPath)}.click()`);
  try {
    await until(
      `window.location.pathname === ${JSON.stringify(returnPath)} && document.querySelector(".work-detail") !== null`,
      "candidate and basis exact Work return",
    );
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nLocation: ${await evaluate("window.location.href")}\nFocus: ${await evaluate("document.activeElement?.outerHTML")}\nCalls: ${JSON.stringify(calls.slice(-12).map((call) => ({ method: call.method, path: call.path, status: call.status, error_code: call.json?.error?.code })))}\nConsole: ${JSON.stringify(consoleFailures)}`,
      { cause: error },
    );
  }

  const separationPath = reviewPath(scenario.separation_review_session_id);
  await navigate(
    separationPath,
    'document.querySelectorAll(".review-member-selector").length === 2',
    "multi-member Review",
  );
  await activate('document.querySelectorAll(".review-member-selector")[1]');
  await until(
    'document.querySelectorAll(".review-member-selector")[1].getAttribute("aria-pressed") === "true"',
    "exact Review member selection",
  );
  await activate(button("Separate changes"));
  await until(
    'document.querySelector(".review-separation-notice[data-state=success]") !== null',
    "confirmed Review separation",
  );
  const separationCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/separation"),
  );
  assert.equal(separationCall?.status, 200);
  assert.equal(separationCall?.json?.applied, true);
  assert.equal(
    separationCall?.requestJson?.review_member_id,
    scenario.separated_review_member_id,
  );
  const separatedPath = await evaluate(`(() => {
    const link = document.querySelector(".review-separation-notice a");
    if (link === null) return undefined;
    const path = new URL(link.href).pathname;
    link.click();
    return path;
  })()`);
  assert.equal(
    separatedPath,
    reviewPath(separationCall.json.separated_review_session.review_session_id),
  );
  await until(
    `window.location.pathname === ${JSON.stringify(separatedPath)} && document.querySelectorAll(".review-member-selector").length === 0`,
    "opened separated Review",
  );
  const separatedRead = latestCall((call) =>
    call.path.endsWith(
      `/reviews/${separationCall.json.separated_review_session.review_session_id}`,
    ),
  );
  assert.equal(separatedRead?.json?.content?.members?.length, 1);
  assert.equal(
    separatedRead?.json?.content?.members?.[0]?.review_member_id,
    scenario.separated_review_member_id,
  );

  const applyPath = reviewPath(scenario.apply_review_session_id);
  await navigate(
    applyPath,
    `${button("Decide later")} !== undefined`,
    "Review lifecycle start",
  );
  await activate(
    'document.querySelector(".review-decision__defer-input summary")',
  );
  await until(
    'document.querySelector(".review-decision__defer-input")?.open === true',
    "optional defer reason disclosed by keyboard",
  );
  await setControlValue(
    ".review-decision__defer-input textarea",
    "Pause this exact Review while the independent rejection is considered.",
  );
  await activate(button("Decide later"));
  await until(
    'document.querySelector(".review-lifecycle-notice[data-state=success]")?.innerText.includes("Review deferred")',
    "deferred Review",
  );
  const deferCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/lifecycle"),
  );
  assert.equal(deferCall?.status, 200);
  assert.equal(
    deferCall?.requestJson?.requested_action ??
      deferCall?.requestJson?.requestedAction,
    "defer",
  );
  await navigate(
    applyPath,
    `${button("Reopen review")} !== undefined`,
    "deferred Review reload",
  );
  await activate(button("Reopen review"));
  await until(
    'document.querySelector(".review-lifecycle-notice[data-state=success]")?.innerText.includes("Review reopened")',
    "reopened Review",
  );
  const lifecycleCalls = calls.filter(
    (call) => call.method === "POST" && call.path.endsWith("/lifecycle"),
  );
  assert.equal(lifecycleCalls.length, 2);
  assert.equal(lifecycleCalls[1]?.status, 200);

  const rejectPath = reviewPath(scenario.reject_review_session_id);
  await navigate(
    rejectPath,
    `${button("Reject candidate")} !== undefined`,
    "Review rejection start",
  );
  const rejectPostsBefore = calls.filter(
    (call) => call.method === "POST" && call.path.endsWith("/reject"),
  ).length;
  await activate(button("Reject candidate"));
  await until(
    'document.querySelector(".review-reject-preview") !== null',
    "prepared exact rejection",
  );
  const rejectCheckpoint = latestCall((call) =>
    call.path.includes("/reject-checkpoint"),
  );
  assert.equal(rejectCheckpoint?.status, 200);
  assert.equal(
    calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/reject"),
    ).length,
    rejectPostsBefore,
  );
  await setControlValue(
    ".review-decision__reject-input textarea",
    "Reject this exact candidate because its independent conclusion is outside the accepted Project position.",
  );
  await until(
    `${button("Reject displayed ChangeSet")}.getAttribute("aria-disabled") !== "true"`,
    "available explicit rejection",
  );
  await activate(button("Reject displayed ChangeSet"));
  await until(
    'document.querySelector(".review-reject-notice")?.innerText.includes("The displayed ChangeSet was rejected")',
    "confirmed Review rejection",
  );
  const rejectCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/reject"),
  );
  assert.equal(rejectCall?.status, 200);
  assert.equal(rejectCall?.json?.outcome, "rejected");
  assert.ok(
    rejectCall.json.assessment.content.review.members.some(
      (member) => member.outcome === "rejected",
    ),
  );
  assert.ok(
    (
      await evaluate(
        'document.querySelector(".review-reject-notice").innerText',
      )
    ).includes("Effect: Outcome unknown"),
  );
  await activate(
    `document.querySelector(${JSON.stringify(`.review-reject-notice a[href="${returnPath}"]`)})`,
  );
  await until(
    `window.location.pathname === ${JSON.stringify(returnPath)} && document.querySelector(".work-detail") !== null`,
    "rejection exact Work return",
  );

  await navigate(
    applyPath,
    'document.querySelector(".review-refresh-notice") !== null',
    "stale Review after independent decision",
  );
  const staleText = await evaluate("document.body.innerText");
  assert.ok(staleText.includes("Review snapshot is stale"));
  assert.equal(
    await evaluate(
      `${button("Prepare changes to apply")}.getAttribute("aria-disabled")`,
    ),
    "true",
  );
  await until(
    'document.querySelector(".review-refresh-notice[data-state=success]")?.innerText.includes("Review refreshed")',
    "automatic stale Review refresh",
  );
  const refreshCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/refresh"),
  );
  assert.equal(refreshCall?.status, 200);
  assert.equal(refreshCall?.json?.applied, true);

  await navigate(
    applyPath,
    `${button("Prepare changes to apply")} !== undefined`,
    "refreshed Review commitment",
  );
  const applyPostsBefore = calls.filter(
    (call) => call.method === "POST" && call.path.endsWith("/apply"),
  ).length;
  await activate(button("Prepare changes to apply"));
  await until(
    'document.querySelector(".review-apply-preview") !== null',
    "prepared exact ChangeSet",
  );
  const applyCheckpoint = latestCall((call) =>
    call.path.includes("/apply-checkpoint"),
  );
  assert.equal(applyCheckpoint?.status, 200);
  assert.equal(
    calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/apply"),
    ).length,
    applyPostsBefore,
  );
  const preparedText = await evaluate(
    'document.querySelector(".review-apply-preview").innerText',
  );
  for (const text of [
    "One complete atomic ChangeSet",
    "Complete atomic membership",
    "Every operation",
    "Delegated and automatic Apply are unavailable",
  ]) {
    assert.ok(preparedText.includes(text), `Missing Apply preview: ${text}`);
  }
  await activate(button("Apply displayed ChangeSet"));
  await until(
    'document.querySelector(".review-apply-notice")?.innerText.includes("The displayed ChangeSet applied")',
    "confirmed exact Apply",
  );
  const applyCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/apply"),
  );
  assert.equal(applyCall?.status, 200);
  assert.equal(applyCall?.json?.outcome, "applied");
  assert.ok(
    applyCall.json.assessment.content.review.members.some(
      (member) => member.outcome === "applied",
    ),
  );
  assert.equal(
    calls.filter(
      (call) => call.method === "POST" && call.path.endsWith("/apply"),
    ).length,
    applyPostsBefore + 1,
  );
  await evaluate(`${exactLink(returnPath)}.click()`);
  await until(
    `window.location.pathname === ${JSON.stringify(returnPath)} && document.querySelector(".work-detail") !== null`,
    "Apply exact Work return",
  );

  const accessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "main" || node.role?.value === "heading",
    ),
  );
  assert.deepEqual(consoleFailures, []);

  const summarize = (call) => ({
    method: call.method,
    path: call.path,
    status: call.status,
    request_schema: call.requestJson?.schema_name,
    response_schema: call.json?.schema_name,
    outcome: call.json?.outcome,
    applied: call.json?.applied,
  });
  const observation = {
    browser: browserVersion.product,
    workbench_url: workbench.url,
    project_id: projectId,
    reviews: {
      correction: scenario.correction_review_session_id,
      separation: scenario.separation_review_session_id,
      separated: separationCall.json.separated_review_session.review_session_id,
      rejection: scenario.reject_review_session_id,
      lifecycle_refresh_apply: scenario.apply_review_session_id,
    },
    operations: {
      correction: summarize(correctionCall),
      basis_revision: summarize(basisCall),
      separation: summarize(separationCall),
      defer: summarize(lifecycleCalls[0]),
      reopen: summarize(lifecycleCalls[1]),
      reject_checkpoint: summarize(rejectCheckpoint),
      reject: summarize(rejectCall),
      refresh: summarize(refreshCall),
      apply_checkpoint: summarize(applyCheckpoint),
      apply: summarize(applyCall),
    },
    member_outcomes: {
      rejected: rejectCall.json.assessment.content.review.members.map(
        (member) => ({
          review_member_id: member.review_member_id,
          outcome: member.outcome,
        }),
      ),
      applied: applyCall.json.assessment.content.review.members.map(
        (member) => ({
          review_member_id: member.review_member_id,
          outcome: member.outcome,
        }),
      ),
      separated: separatedRead.json.content.members.map((member) => ({
        review_member_id: member.review_member_id,
        outcome: member.outcome,
      })),
    },
    return_path: returnPath,
    checks: [
      "Review queue and exact session opened through visible links",
      "candidate text correction invoked once and retained a working-only result",
      "candidate draft survived a Review-to-Source-to-Review renderer change",
      "material source-basis revision invoked once and reset validation without a decision",
      "exact multi-member selection and separation invoked once",
      "defer and reopen invoked as distinct exact lifecycle commands",
      "rejection preview sent no decision before the explicit rejected Approval",
      "stale Review blocked preparation until visible Refresh completed",
      "Apply preview sent no decision before one explicit Apply",
      "rejected, separated, and applied member outcomes rendered",
      "candidate, rejection, and Apply paths returned to the exact originating Work",
      "no browser console or runtime failures",
    ],
  };

  return { observation, close };

  async function close() {
    if (closed || !ownsBrowser) return;
    closed = true;
    try {
      await closeChrome({ chrome, cdp });
    } finally {
      await workbench.vite.close();
    }
  }
};
