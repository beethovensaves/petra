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
const summary = (label) =>
  `[...document.querySelectorAll('summary')].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;

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
    assert.ok(
      chrome.profile.startsWith(join(tmpdir(), "petra-wave6-history-")),
    );
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
};

export const startWave6HistoryRecoveryBrowser = async ({
  root,
  getBackendUrl,
  projectId,
}) => {
  const calls = [];
  const consoleFailures = [];
  const workbench = await startWorkbench({ root, getBackendUrl, calls });
  const chrome = await startChrome({ profilePrefix: "petra-wave6-history-" });
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
          calls.slice(-20).map((call) => ({
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
        : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(
        control,
        ${JSON.stringify(value)},
      );
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
  const latestCall = (predicate) => [...calls].reverse().find(predicate);
  const historyCollectionCall = (call) => {
    if (call.method !== "GET" || call.status !== 200) return false;
    const url = new URL(call.path, "http://petra.local");
    return (
      url.pathname === `/api/queries/projects/${projectId}/history/events` &&
      call.json?.schema_name === "petra.project-history-retained-view"
    );
  };

  const briefPath = `/projects/${projectId}/brief`;
  const historyPath = `/projects/${projectId}/history`;
  await navigate(
    briefPath,
    'document.querySelector(".live-project-brief") !== null',
    "updated production Brief",
  );
  const initialBrief = latestCall(
    (call) =>
      call.method === "GET" &&
      call.path === `/api/queries/projects/${projectId}/brief`,
  );
  assert.equal(initialBrief?.status, 200);
  assert.ok(
    (await evaluate("document.body.innerText")).includes("Recent decisions"),
  );
  await activate(link("View all Project History"));
  await until(
    'document.querySelector("[data-runtime-history=authenticated-retained]") !== null',
    "retained Project History",
  );
  const initialCollection = latestCall(historyCollectionCall);
  assert.equal(
    initialCollection?.authorization,
    "Bearer petra-local-development",
  );
  assert.equal(initialCollection?.json?.schema_version, "1.2.0");
  const applied = initialCollection.json.content.changes.find(
    (change) =>
      change.command_ref.command_name === "ApplyChangeSet" &&
      change.event_ref.event_type === "change_set.applied" &&
      change.observed_effect.effect === "authority_change_applied" &&
      change.observed_effect.outcome === "completed",
  );
  assert.ok(
    applied,
    "No exact applied ChangeSet event is available in History.",
  );
  const exactTarget = applied.targets.find(
    (target) => target.semantic_key === "petra.change-set",
  );
  assert.ok(exactTarget, "The applied event has no exact ChangeSet target.");
  const targetValue = `${exactTarget.semantic_key}::${exactTarget.object_id}`;
  assert.equal(
    await evaluate(
      `document.querySelector('select[name=target] option[value=${JSON.stringify(targetValue)}]') !== null`,
    ),
    true,
    "The exact applied ChangeSet is absent from the visible target catalogue.",
  );

  await setControlValue("select[name=family]", "change_control");
  await setControlValue("select[name=command_name]", "ApplyChangeSet");
  await setControlValue("select[name=event_type]", "change_set.applied");
  await setControlValue("select[name=actor_id]", applied.actor.actor_id);
  await setControlValue("select[name=outcome]", "completed");
  await setControlValue("select[name=effect]", "authority_change_applied");
  await setControlValue("select[name=target]", targetValue);
  await activate(button("Apply exact filters"));
  await until(
    `window.location.search.includes("event_type=change_set.applied") && document.querySelectorAll(".history-retained-events ol > li").length === 1`,
    "exact filtered History event",
  );
  const filteredCollection = latestCall(historyCollectionCall);
  assert.deepEqual(filteredCollection.json.content.query.filters, {
    family: "change_control",
    command_name: "ApplyChangeSet",
    event_type: "change_set.applied",
    actor_id: applied.actor.actor_id,
    outcome: "completed",
    effect: "authority_change_applied",
    target: {
      semantic_key: exactTarget.semantic_key,
      object_id: exactTarget.object_id,
    },
  });
  assert.deepEqual(
    filteredCollection.json.content.changes.map(
      (change) => change.event_ref.event_id,
    ),
    [applied.event_ref.event_id],
  );

  const eventPath = `${historyPath}/${applied.event_ref.event_id}`;
  await activate(
    `[...document.querySelectorAll(".history-retained-events ol a")].find((element) => new URL(element.href).pathname === ${JSON.stringify(eventPath)})`,
  );
  await until(
    `window.location.pathname === ${JSON.stringify(eventPath)} && document.querySelector(".history-event") !== null`,
    "exact retained History event",
  );
  const episode = latestCall((call) =>
    call.path.endsWith(`/history/events/${applied.event_ref.event_id}`),
  );
  const impact = latestCall((call) =>
    call.path.endsWith(`/history/events/${applied.event_ref.event_id}/impact`),
  );
  const recovery = latestCall((call) =>
    call.path.endsWith(
      `/history/events/${applied.event_ref.event_id}/recovery`,
    ),
  );
  assert.equal(episode?.status, 200);
  assert.equal(impact?.status, 200);
  assert.equal(
    recovery?.json?.content?.assessment?.state,
    "eligible_for_preview",
  );
  await activate(summary("Compare recorded state"));
  await until(
    'document.querySelector(".history-event__comparison").open === true',
    "historical comparison",
  );
  let text = await evaluate("document.body.innerText");
  for (const value of [
    "Historical position and current read",
    "exact retained Project profile definition revision",
    "Impact and recovery boundary",
  ]) {
    assert.ok(text.includes(value), `Missing History comparison: ${value}`);
  }
  await activate(summary("Inspect impact and recovery"));
  await until(
    'document.querySelector(".history-event__impact-details").open === true',
    "impact and recovery inspection",
  );
  text = await evaluate("document.body.innerText");
  assert.ok(text.includes("eligible_for_preview"));
  assert.ok(text.includes("No compensation preview, plan, or execution"));

  const executeCount = calls.filter((call) =>
    call.path.endsWith("/recovery/execute"),
  ).length;
  await activate(button("Read governed Revert preview"));
  await until(
    'document.querySelector(".history-event__preview") !== null',
    "read-only governed Revert preview",
  );
  assert.equal(
    calls.filter((call) => call.path.endsWith("/recovery/execute")).length,
    executeCount,
  );
  await evaluate(`(() => {
    const values = [
      ["Reason for governed Revert", "The exact accepted change must be compensated after reviewing its retained impact and recovery boundary."],
      ["Approval rationale", "The complete revision-bound compensation plan is explicitly approved after the History review."],
    ];
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    for (const [labelText, value] of values) {
      const area = [...document.querySelectorAll("textarea")].find((candidate) =>
        document.querySelector("label[for='" + candidate.id + "']")?.textContent.includes(labelText));
      setter.call(area, value);
      area.dispatchEvent(new Event("input", { bubbles: true }));
    }
  })()`);
  await until(
    `${button("Confirm and compose Revert plan")}.getAttribute("aria-disabled") !== "true"`,
    "confirmed governed Revert inputs",
  );
  await activate(button("Confirm and compose Revert plan"));
  await until(
    'document.querySelector(".history-event__plan") !== null',
    "confirmed governed Revert plan",
  );
  const plan = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/recovery/plan"),
  );
  assert.equal(plan?.status, 200);
  assert.equal(plan?.requestJson?.confirmation?.confirmed, true);
  assert.equal(
    calls.filter((call) => call.path.endsWith("/recovery/execute")).length,
    executeCount,
  );
  await activate(button("Execute governed Revert"));
  await until(
    'document.body.innerText.includes("Governed Revert completed")',
    "completed governed Revert",
  );
  const execution = latestCall(
    (call) => call.method === "POST" && call.path.endsWith("/recovery/execute"),
  );
  assert.equal(execution?.status, 200);
  assert.equal(execution?.requestJson?.execution_confirmation?.confirmed, true);
  assert.equal(execution?.json?.content?.outcome, "completed");
  assert.equal(
    calls.filter((call) => call.path.endsWith("/recovery/execute")).length,
    executeCount + 1,
  );
  const compensationEventIds = execution.json.content.steps
    .map((step) => step.event_ref?.event_id)
    .filter(Boolean);
  assert.ok(compensationEventIds.length > 0);

  await activate(link("Return to updated Brief"));
  await until(
    `window.location.pathname === ${JSON.stringify(briefPath)} && document.querySelector(".live-project-brief") !== null`,
    "updated Brief after governed Revert",
  );
  const updatedBrief = latestCall(
    (call) =>
      call.method === "GET" &&
      call.path === `/api/queries/projects/${projectId}/brief`,
  );
  assert.equal(updatedBrief?.status, 200);
  assert.notEqual(
    updatedBrief?.json?.content_hash,
    initialBrief?.json?.content_hash,
  );
  assert.ok(
    compensationEventIds.some((eventId) =>
      updatedBrief.json.content.recent_decisions.content.changes.some(
        (change) => change.event_ref.event_id === eventId,
      ),
    ),
    "The updated Brief omitted the additive compensation History event.",
  );

  await activate(link("View all Project History"));
  await until(
    `window.location.pathname === ${JSON.stringify(historyPath)} && document.querySelector("[data-runtime-history=authenticated-retained]") !== null`,
    "post-Revert retained Project History",
  );
  const postRevertCollection = latestCall(historyCollectionCall);
  const retainedEventIds = postRevertCollection.json.content.changes.map(
    (change) => change.event_ref.event_id,
  );
  assert.ok(retainedEventIds.includes(applied.event_ref.event_id));
  assert.ok(
    compensationEventIds.some((eventId) => retainedEventIds.includes(eventId)),
  );
  await activate(link("Return to current Brief"));
  await until(
    `window.location.pathname === ${JSON.stringify(briefPath)} && document.querySelector(".live-project-brief") !== null`,
    "final exact Brief return",
  );

  const accessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    accessibility.nodes.some(
      (node) =>
        node.role?.value === "heading" &&
        node.name?.value === "Recent decisions",
    ),
    "The final Recent decisions heading is absent from Chrome's accessibility tree.",
  );
  assert.deepEqual(consoleFailures, []);

  const observation = {
    browser: browserVersion.product,
    stable_url: workbench.url,
    project_id: projectId,
    applied_event_id: applied.event_ref.event_id,
    exact_filters: filteredCollection.json.content.query.filters,
    collection_hash_before: initialCollection.json.content_hash,
    collection_hash_filtered: filteredCollection.json.content_hash,
    episode_hash: episode.json.content_hash,
    impact_hash: impact.json.content_hash,
    recovery_hash: recovery.json.content_hash,
    plan_hash: plan.json.content_hash,
    execution_hash: execution.json.content_hash,
    compensation_event_ids: compensationEventIds,
    brief_hash_before: initialBrief.json.content_hash,
    brief_hash_after: updatedBrief.json.content_hash,
    collection_hash_after: postRevertCollection.json.content_hash,
    final_path: await evaluate("window.location.pathname"),
    request_counts: {
      retained_history: calls.filter(historyCollectionCall).length,
      episode: calls.filter((call) =>
        call.path.endsWith(`/history/events/${applied.event_ref.event_id}`),
      ).length,
      impact: calls.filter((call) => call.path.endsWith("/impact")).length,
      recovery: calls.filter((call) => call.path.endsWith("/recovery")).length,
      preview: calls.filter((call) => call.path.endsWith("/recovery/preview"))
        .length,
      plan: calls.filter((call) => call.path.endsWith("/recovery/plan")).length,
      execute: calls.filter((call) => call.path.endsWith("/recovery/execute"))
        .length,
      brief: calls.filter(
        (call) => call.path === `/api/queries/projects/${projectId}/brief`,
      ).length,
    },
  };

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await closeChrome({ chrome, cdp });
    } finally {
      await workbench.vite.close();
    }
  };
  return { observation, close };
};
