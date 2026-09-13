// Requires the workbench on 4314 and an isolated Chrome CDP page on 9434.
// Uses only synthetic transport in the mounted test harness.
import assert from "node:assert/strict";

const pages = await (await fetch("http://127.0.0.1:9434/json")).json();
const socket = new WebSocket(
  pages.find((page) => page.type === "page").webSocketDebuggerUrl,
);
await new Promise((resolve) =>
  socket.addEventListener("open", resolve, { once: true }),
);
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? request.reject(message.error)
      : request.resolve(message.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const until = async (expression) => {
  for (let index = 0; index < 100; index++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timed out: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
};

await send("Page.enable");
await send("Runtime.enable");
await send("Accessibility.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", {
  url: "http://127.0.0.1:4314/test/communication-plan-browser.html",
});
await until('document.querySelector("#communication-plan-title") !== null');
await evaluate("document.fonts.ready");

assert.equal(
  await evaluate(
    'window.communicationCalls.filter(call => call.url.includes("/communication?")).length',
  ),
  1,
);
assert.equal(
  await evaluate(
    'window.communicationCalls.find(call => call.url.includes("/communication?")).authorization',
  ),
  "Bearer petra-local-development",
);
assert.equal(await evaluate("window.communicationCalls.length"), 1);
assert.deepEqual(
  await evaluate(
    '[...document.querySelectorAll(".communication-segment h3")].map(element => element.textContent)',
  ),
  ["Attributed report", "Petra assessment", "Inference", "Action report"],
);
assert.deepEqual(
  await evaluate(
    '[...document.querySelectorAll(".communication-segment")].map(element => element.dataset.preservation)',
  ),
  ["blocked", "blocked", "passed", "passed"],
);
const bodyText = await evaluate("document.body.innerText");
for (const text of [
  "Language validation blocked",
  "This record is not a validated answer.",
  "Structured preservation blocked",
  "Structured preservation passed",
  "Source and current delivery state",
  "Running",
  "Failed",
  "Completed · Worker failed",
  "Available · No authority effect",
  "Cancelled · DELIVERY_STOPPED",
  "No generalization evidence is present in the packet.",
  "No repair was recorded.",
]) {
  assert.ok(bodyText.includes(text), `missing textual meaning: ${text}`);
}
for (const identity of [
  "claim_01ARZ3NDEKTSV4RRFFQ69G5FBB",
  "assertion_01ARZ3NDEKTSV4RRFFQ69G5FBC",
  "source_span_01ARZ3NDEKTSV4RRFFQ69G5FB7",
  "command_01K4C000000000000000000062",
]) {
  assert.ok(bodyText.includes(identity), `missing exact identity: ${identity}`);
}
assert.equal(bodyText.includes("No exact invocation was supplied."), false);
assert.equal(bodyText.includes("No linked invocation action report"), false);
assert.equal(
  await evaluate(
    'document.querySelector(".petra-state-notice").getAttribute("role")',
  ),
  "alert",
);

const validationSummary =
  '[...document.querySelectorAll("summary")].find(element => element.textContent.startsWith("Complete validation receipt"))';
await evaluate(`${validationSummary}.focus()`);
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
  text: "\r",
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
});
assert.equal(await evaluate(`${validationSummary}.parentElement.open`), true);
assert.equal(
  await evaluate(`document.activeElement === ${validationSummary}`),
  true,
);
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Tab",
  code: "Tab",
  windowsVirtualKeyCode: 9,
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Tab",
  code: "Tab",
  windowsVirtualKeyCode: 9,
});
assert.equal(
  await evaluate(
    'document.activeElement.textContent.startsWith("Exact record and version bindings")',
  ),
  true,
);
await send("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
  text: "\r",
});
await send("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Enter",
  code: "Enter",
  windowsVirtualKeyCode: 13,
});
assert.equal(await evaluate("document.activeElement.parentElement.open"), true);
assert.ok(
  (await evaluate("document.body.innerText")).includes("Renderer binding"),
);
assert.ok(
  (await evaluate("document.body.innerText")).includes("Not implemented"),
);

await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Emulation.setEmulatedMedia", {
  features: [
    { name: "forced-colors", value: "active" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ],
});
await evaluate('document.documentElement.style.fontSize="200%"');
await send("Emulation.setTouchEmulationEnabled", {
  enabled: true,
  maxTouchPoints: 1,
});
await evaluate(
  "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "narrow scaled communication content must wrap",
);
const recoverySummary =
  '[...document.querySelectorAll("summary")].find(element => element.textContent.startsWith("Current server-owned recovery assessment"))';
await evaluate(
  `${recoverySummary}.scrollIntoView({block: "center", behavior: "instant"})`,
);
await new Promise((resolve) => setTimeout(resolve, 200));
const summaryRect = await evaluate(
  `(() => { const rect = ${recoverySummary}.getBoundingClientRect(); return { x: (Math.max(0, rect.left) + Math.min(window.innerWidth, rect.right)) / 2, y: rect.y + rect.height / 2, height: rect.height, right: rect.right }; })()`,
);
assert.ok(summaryRect.height >= 44);
assert.ok(summaryRect.right <= 375);
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: summaryRect.x, y: summaryRect.y }],
});
await send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await until(`${recoverySummary}.parentElement.open === true`);
assert.notEqual(
  await evaluate(
    'getComputedStyle(document.querySelector(".petra-state-notice")).borderTopStyle',
  ),
  "none",
);
const reducedMotionDuration = await evaluate(
  `getComputedStyle(${validationSummary}).transitionDuration`,
);
assert.ok(
  ["0s", "0.01ms", "0.00001s", "1e-05s"].includes(reducedMotionDuration),
);
assert.ok(
  (await evaluate(
    '[...document.querySelectorAll(".communication-preservation")].every(element => /Structured preservation (blocked|passed)/.test(element.textContent))',
  )) === true,
);
const accessibility = await send("Accessibility.getFullAXTree");
for (const label of [
  "Attributed report",
  "Petra assessment",
  "Inference",
  "Action report",
]) {
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "heading" && node.name?.value === label,
    ),
  );
}
assert.deepEqual(await evaluate("window.communicationConsoleErrors"), []);

await send("Page.navigate", {
  url: "http://127.0.0.1:4314/test/communication-plan-browser.html?status=422",
});
await until(
  'document.body.innerText.includes("Communication read failed (422)")',
);
assert.equal(
  await evaluate('document.querySelector("#communication-plan-title")'),
  null,
);
assert.equal(
  await evaluate(
    'window.communicationCalls.filter(call => call.url.includes("/communication?")).length',
  ),
  1,
);

console.log(
  JSON.stringify(
    {
      state: "passed",
      browser: "Chrome via CDP",
      transport: "synthetic only",
      checks: [
        "production Petra loader and CommunicationPlanClient with browser schema validation",
        "one authenticated exact read without fallback",
        "ordered families and partial preservation",
        "blocked full-language validation",
        "exact references and separate response, Work, result, and delivery observations",
        "complete validation and binding disclosures",
        "keyboard disclosure, focus retention, and forward focus order",
        "375px viewport at 200% text scaling",
        "touch disclosure with a 44px target",
        "forced colors, reduced motion, and non-color status meaning",
        "HTTP 422 fails visibly without fixture fallback",
      ],
    },
    null,
    2,
  ),
);
socket.close();
