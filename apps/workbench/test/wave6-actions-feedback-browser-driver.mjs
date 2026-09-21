import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createCdp,
  startChrome,
  startWorkbench,
} from "./cumulative-production-browser-driver.mjs";

const wait = (milliseconds) =>
  new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
const button = (label) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const link = (label) =>
  `[...document.querySelectorAll('a')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
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
}) => {
  const calls = [];
  const consoleFailures = [];
  const disconnectedInvocationCommands = new Set();
  const workbench = await startWorkbench({
    root,
    getBackendUrl,
    calls,
    shouldDisconnectResponse: (call) => {
      const commandId = call.requestJson?.command_id;
      if (
        call.method !== "POST" ||
        !call.path.includes("/suggested-actions/") ||
        !call.path.endsWith("/invoke") ||
        call.status !== 200 ||
        typeof commandId !== "string" ||
        disconnectedInvocationCommands.has(commandId)
      ) {
        return false;
      }
      disconnectedInvocationCommands.add(commandId);
      return true;
    },
  });
  const chrome = await startChrome({ profilePrefix: "petra-wave6-review-" });
  const cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  let closed = false;

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
  const untilLong = async (expression, label) => {
    for (let attempt = 0; attempt < 1_500; attempt += 1) {
      if (await evaluate(expression)) return;
      await wait(100);
    }
    throw new Error(
      `Timed out waiting for ${label}:\n${await evaluate("document.body.innerText")}`,
    );
  };
  const reviewPath = (reviewSessionId) =>
    `/projects/${projectId}/review/${reviewSessionId}`;
  const returnPath = `/projects/${projectId}/work/${scenario.return_work_unit_id}`;
  const interruptReturnPath = `/projects/${projectId}/work/${scenario.interrupt.return_work_unit_id}`;

  const actionLinkId = scenario.action.inquiry_result_link_id;
  const briefActionPath = `/projects/${projectId}/brief?inquiry_result_link_id=${encodeURIComponent(actionLinkId)}`;
  await navigate(
    briefActionPath,
    'document.querySelector("[data-presentation-path=direct]") !== null',
    "Brief SuggestedAction preview",
  );
  const directActionId = await evaluate(
    'document.querySelector("[data-presentation-path=direct]").querySelector("details.reference-suggested-action__identity code").textContent',
  );
  await activate(link("Continue with Petra"));
  await until(
    'document.querySelector("[data-presentation-path=conversational]") !== null',
    "Petra SuggestedAction preview",
  );
  const petraActionId = await evaluate(
    'document.querySelector("[data-presentation-path=conversational]").querySelector("details.reference-suggested-action__identity code").textContent',
  );
  assert.equal(petraActionId, directActionId);
  await activate(button("Start exact Work"));
  await until(
    `${button("Confirm exact start")} !== undefined`,
    "Petra exact confirmation",
  );
  await activate(button("Confirm exact start"));
  await untilLong(
    `${button("Return focus to action")} !== undefined && ${button("Retry exact start")} !== undefined`,
    "Petra uncertain-delivery feedback",
  );
  await activate(button("Return focus to action"));
  await until(
    'document.activeElement?.id === "suggested-work-action-control-conversational"',
    "Petra action focus return",
  );
  await activate(button("Start exact Work"));
  await until(
    `${button("Confirm exact start")} !== undefined`,
    "Petra retained-command confirmation",
  );
  await activate(button("Confirm exact start"));
  await untilLong(
    'document.querySelector("[data-presentation-path=conversational] .reference-suggested-action__invocation") !== null && ' +
      `${button("Dismiss feedback")} !== undefined`,
    "Petra exact invocation result",
  );
  await activate(button("Dismiss feedback"));
  await until(
    `${button("Dismiss feedback")} === undefined`,
    "dismissed Petra transient feedback",
  );
  await activate(link("Return to the same Brief action"));
  await until(
    `window.location.pathname === ${JSON.stringify(`/projects/${projectId}/brief`)} && document.querySelector("[data-presentation-path=direct]") !== null`,
    "returned to the same Brief action",
  );
  await activate(button("Start exact Work"));
  await until(
    `${button("Confirm exact start")} !== undefined`,
    "Brief exact confirmation",
  );
  await activate(button("Confirm exact start"));
  await untilLong(
    `${button("Retry exact start")} !== undefined`,
    "Brief retained-command retry",
  );
  await activate(button("Retry exact start"));
  await untilLong(
    'document.querySelector("[data-presentation-path=direct] .reference-suggested-action__invocation") !== null && ' +
      `${button("Return focus to action")} !== undefined`,
    "Brief exact invocation result",
  );
  await activate(button("Return focus to action"));
  await until(
    'document.activeElement?.id === "suggested-work-action-control-direct"',
    "Brief action focus return",
  );

  const invocationCalls = calls.filter(
    (call) =>
      call.method === "POST" &&
      call.path.includes("/suggested-actions/") &&
      call.path.endsWith("/invoke"),
  );
  const invocationGroups = Map.groupBy(
    invocationCalls,
    (call) => call.requestJson.command_id,
  );
  assert.equal(invocationGroups.size, 2);
  for (const attempts of invocationGroups.values()) {
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[0].requestJson, attempts[1].requestJson);
    assert.equal(attempts[0].status, 200);
    assert.equal(attempts[1].status, 200);
    assert.deepEqual(attempts[1].json.content, attempts[0].json.content);
    assert.equal(attempts[1].json.content_hash, attempts[0].json.content_hash);
  }

  await evaluate(`sessionStorage.setItem(
    ${JSON.stringify(`petra.model-run.${projectId}`)},
    JSON.stringify({
      threadId: ${JSON.stringify(scenario.interrupt.protocol_thread_id)},
      runId: ${JSON.stringify(scenario.interrupt.protocol_run_id)},
      connectionId: "interaction_connection_01K5R000000000000000000001",
    }),
  )`);
  await navigate(
    `/projects/${projectId}/petra?return_to=${encodeURIComponent(interruptReturnPath)}&return_label=${encodeURIComponent("Review workflow Work")}`,
    `${button("Reconnect and replay")} !== undefined`,
    "Petra durable interrupt return context",
  );
  await activate(button("Reconnect and replay"));
  await until(
    'document.querySelector(".petra-review-interrupt[data-response-state=pending]") !== null',
    "durable Review interrupt",
  );
  await evaluate(
    'document.querySelector(".petra-review-interrupt input[value=accept]").click()',
  );
  await setControlValue(
    ".petra-review-interrupt textarea",
    "Accept this exact registered ChangeSet after inspecting its retained Review binding.",
  );
  await until(
    `${button("Respond")}.getAttribute("aria-disabled") !== "true"`,
    "available durable interrupt response",
  );
  await activate(button("Respond"));
  await untilLong(
    'document.querySelector(".petra-review-interrupt[data-response-state=resolved]") !== null',
    "durable interrupt outcome",
  );
  const interruptCall = latestCall(
    (call) =>
      call.method === "POST" && call.path === "/api/commands/reviews/resolve",
  );
  assert.equal(interruptCall?.status, 200);
  assert.equal(
    interruptCall?.requestJson?.interrupt_ref?.interaction_interrupt_id,
    scenario.interrupt.interaction_interrupt_id,
  );
  assert.equal(interruptCall?.json?.result?.outcome, "applied");
  await activate(exactLink(interruptReturnPath));
  await until(
    `window.location.pathname === ${JSON.stringify(interruptReturnPath)} && document.querySelector(".work-detail") !== null`,
    "durable interrupt exact Work return",
  );

  const correctionPath = reviewPath(scenario.correction_review_session_id);
  await navigate(
    `/projects/${projectId}/review`,
    'document.querySelector(".review-group") !== null',
    "production Review queue",
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
  await activate(button("Edit candidate"));
  await until(
    'document.querySelector("#review-candidate-canonical-text") !== null',
    "candidate editor",
  );
  const correctedText =
    "The reviewed study reports a bounded improvement on its defined evaluation task.";
  await setControlValue("#review-candidate-canonical-text", correctedText);
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
  await activate(exactLink(returnPath));
  await until(
    `window.location.pathname === ${JSON.stringify(returnPath)} && document.querySelector(".work-detail") !== null`,
    "candidate and basis exact Work return",
  );

  const decisionPath = reviewPath(scenario.apply_review_session_id);
  await navigate(
    decisionPath,
    `${button("Refresh Review")} !== undefined`,
    "stale prevalidated Review decision",
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(
      "Review snapshot is stale",
    ),
  );
  await activate(button("Refresh Review"));
  await until(
    'document.querySelector(".review-refresh-notice[data-state=success]")?.innerText.includes("Review refreshed")',
    "confirmed decision Review refresh",
  );
  const refreshCall = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/refresh"),
  );
  assert.equal(refreshCall?.status, 200);
  assert.equal(refreshCall?.json?.applied, true);

  await navigate(
    decisionPath,
    `${button("Prepare changes to apply")} !== undefined`,
    "refreshed Review decision",
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
  await activate(button("Apply displayed ChangeSet"));
  await until(
    'document.querySelector(".review-apply-notice")?.innerText.includes("The displayed ChangeSet applied")',
    "confirmed exact Review decision",
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
  await activate(exactLink(returnPath));
  await until(
    `window.location.pathname === ${JSON.stringify(returnPath)} && document.querySelector(".work-detail") !== null`,
    "corrected Review decision exact Work return",
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
    suggested_action: {
      suggested_action_id: directActionId,
      inquiry_result_link_id: actionLinkId,
      presentation_paths: ["direct", "conversational"],
      command_attempts: [...invocationGroups].map(([command_id, attempts]) => ({
        command_id,
        attempts: attempts.length,
        exact_request_reused:
          JSON.stringify(attempts[0].requestJson) ===
          JSON.stringify(attempts[1].requestJson),
        replay_applied: attempts[1].json.content.invocation.applied,
      })),
      feedback: {
        confirmation: true,
        exact_retry: true,
        dismissed: true,
        direct_focus_return: "suggested-work-action-control-direct",
        conversational_focus_return:
          "suggested-work-action-control-conversational",
      },
    },
    durable_interrupt: {
      interaction_interrupt_id: scenario.interrupt.interaction_interrupt_id,
      interaction_run_id: scenario.interrupt.interaction_run_id,
      review_session_id: scenario.interrupt.review_session_id,
      resolution: summarize(interruptCall),
      return_path: interruptReturnPath,
    },
    reviews: {
      correction: scenario.correction_review_session_id,
      decision: scenario.apply_review_session_id,
    },
    operations: {
      correction: summarize(correctionCall),
      basis_revision: summarize(basisCall),
      refresh: summarize(refreshCall),
      apply_checkpoint: summarize(applyCheckpoint),
      apply: summarize(applyCall),
    },
    member_outcomes: {
      applied: applyCall.json.assessment.content.review.members.map(
        (member) => ({
          review_member_id: member.review_member_id,
          outcome: member.outcome,
        }),
      ),
    },
    return_path: returnPath,
    checks: [
      "Brief and Petra rendered the same registered SuggestedAction identity",
      "both presentation paths exposed an exact consequence-naming confirmation",
      "uncertain delivery retained and retried byte-equivalent command input",
      "transient feedback dismissed without changing server-owned state",
      "feedback return restored focus to each initiating action control",
      "Petra replayed and resolved a PostgreSQL-backed durable Review interrupt",
      "the durable response returned to the exact originating Work",
      "Review queue and exact session opened through visible links",
      "candidate text correction invoked once and retained a working-only result",
      "material source-basis revision invoked once and reset validation without a decision",
      "the independent prevalidated Review visibly refreshed after the earlier authority effect",
      "Apply preview sent no decision before one explicit Apply",
      "the applied member outcome rendered",
      "candidate and decision paths returned to the exact originating Work",
      "no browser console or runtime failures",
    ],
  };

  return { observation, close };

  async function close() {
    if (closed) return;
    closed = true;
    try {
      await closeChrome({ chrome, cdp });
    } finally {
      await workbench.vite.close();
    }
  }
};
