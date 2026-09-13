// Requires the workbench on 4316 and an isolated Chrome CDP page on 9436.
// The harness supplies synthetic HTTP transport around production loaders and renderers.
import assert from "node:assert/strict";

const scientificProjectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const scientificReviewId = "review_session_01K4D000000000000000000004";
const writingProjectId = "project_01K4E000000000000000000001";
const writingReviewId = "review_session_01K4E000000000000000000009";

const pages = await (await fetch("http://127.0.0.1:9436/json")).json();
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
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
};
const until = async (expression) => {
  for (let index = 0; index < 100; index += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timed out: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
};
const button = (text) =>
  `[...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)})`;
const key = async (name, code, virtualKeyCode, text = undefined) => {
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: name,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
    ...(text === undefined ? {} : { text }),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: name,
    code,
    windowsVirtualKeyCode: virtualKeyCode,
  });
};
const navigate = async (path, marker) => {
  await evaluate(`window.pairedRouter.navigate(${JSON.stringify(path)})`);
  await until(
    `document.body.innerText.includes(${JSON.stringify(marker)}) && document.querySelector('.reference-route-error') === null`,
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
  url: "http://127.0.0.1:4316/test/paired-profile-browser.html",
});
await until('document.querySelector(".graph-surface") !== null');
await evaluate("document.fonts.ready");

assert.equal(await evaluate("window.pairedCalls.length"), 2);
assert.equal(
  await evaluate(
    'window.pairedCalls.every(call => call.authorization === "Bearer petra-local-development")',
  ),
  true,
);
assert.equal(
  await evaluate(
    'window.pairedCalls.filter(call => call.url.includes("relationship-overlay")).length',
  ),
  1,
);
assert.equal(
  await evaluate(
    'window.pairedCalls.some(call => call.url.endsWith("relationship-view"))',
  ),
  false,
  "the production Graph loader must not take its fallback path",
);
let body = await evaluate("document.body.innerText");
for (const text of [
  "Scientific evidence inquiry",
  "Claim",
  "Source",
  "Evidence relationship",
  "asserts",
  "Working — not authoritative",
  "Validation is pending; this does not grant authority.",
]) {
  assert.ok(body.includes(text), `missing scientific Graph meaning: ${text}`);
}

await evaluate(`${button("Text")}.focus()`);
await key("Enter", "Enter", 13, "\r");
await until('document.querySelector(".graph-text-view") !== null');
assert.equal(
  await evaluate(`document.activeElement === ${button("Text")}`),
  true,
);
assert.equal(
  await evaluate(
    'document.querySelectorAll(".graph-text-view__nodes > li").length',
  ),
  2,
);
assert.equal(
  await evaluate(
    'document.querySelectorAll("section[aria-labelledby=graph-text-relationships-title] > ol > li").length',
  ),
  1,
);

await navigate(
  `/projects/${writingProjectId}/graph?layer=working`,
  "Controlled operating procedure",
);
await until('document.querySelector(".graph-surface") !== null');
assert.equal(
  await evaluate(
    `window.pairedCalls.filter(call => call.url.includes(${JSON.stringify(writingProjectId)})).length`,
  ),
  2,
);
body = await evaluate("document.body.innerText");
for (const text of [
  "Controlled writing",
  "Requirement",
  "Authority source",
  "Governing link",
  "governs",
  "Working — not authoritative",
  "Controlled-writing overlay transport is not installed",
]) {
  assert.ok(body.includes(text), `missing controlled Graph meaning: ${text}`);
}
assert.equal(body.includes("Claim"), false);
await evaluate(`${button("Text")}.focus()`);
await key("Enter", "Enter", 13, "\r");
await until('document.querySelector(".graph-text-view") !== null');
assert.equal(
  await evaluate(`document.activeElement === ${button("Text")}`),
  true,
);
body = await evaluate("document.body.innerText");
for (const text of [
  "Objects",
  "Relationships",
  "Meaning:",
  "Scope:",
  "Basis:",
  "Current authority",
  "Working — not authoritative",
]) {
  assert.ok(body.includes(text), `missing textual Graph peer: ${text}`);
}

await navigate(
  `/projects/${scientificProjectId}/review/${scientificReviewId}`,
  "Source-grounded Claim and relationship",
);
await until('document.querySelector(".review-session") !== null');
body = await evaluate("document.body.innerText");
for (const text of [
  "Current and Candidate",
  "Origin",
  "Basis",
  "Consequences",
  "Decision",
  "Recovery",
  "Claim",
  "ASSERTS",
  "Prepare changes to apply",
]) {
  assert.ok(body.includes(text), `missing scientific Review meaning: ${text}`);
}

await navigate(
  `/projects/${writingProjectId}/review/${writingReviewId}`,
  "Review the controlled-writing Requirement",
);
await until('document.querySelector(".review-session") !== null');
body = await evaluate("document.body.innerText");
for (const text of [
  "Needs your decision",
  "Project author",
  "Validation pending",
  "Current and Candidate",
  "Current · authoritative",
  "Candidate · working",
  "Origin",
  "Basis",
  "Authority source",
  "Governing link",
  "Consequences",
  "Commitment unavailable",
  "Decision",
  "Recovery",
  "Preparation unavailable",
  "Apply unavailable",
  "No controlled-writing ChangeSet operation, Approval, or Apply path",
  "Recovery remains a read-only status check",
]) {
  assert.ok(body.includes(text), `missing controlled Review meaning: ${text}`);
}
for (const prohibited of [
  "Prepare changes to apply",
  "Edit candidate",
  "Edit working Claim text",
  "Apply requires the exact server-prepared commitment",
]) {
  assert.equal(
    body.includes(prohibited),
    false,
    `controlled Review invented unavailable behavior: ${prohibited}`,
  );
}
const callsBeforeUnavailableControls = await evaluate(
  "window.pairedCalls.length",
);
await evaluate(`${button("Preparation unavailable")}.click()`);
await evaluate(`${button("Apply unavailable")}.click()`);
assert.equal(
  await evaluate("window.pairedCalls.length"),
  callsBeforeUnavailableControls,
  "unavailable commitment controls must not send requests",
);

const recoverySummary =
  '[...document.querySelectorAll("summary")].find(summary => summary.textContent.trim() === "Recovery")';
await evaluate(`${recoverySummary}.focus()`);
await key("Enter", "Enter", 13, "\r");
assert.equal(await evaluate(`${recoverySummary}.parentElement.open`), true);
assert.equal(
  await evaluate(`document.activeElement === ${recoverySummary}`),
  true,
);
await key("Enter", "Enter", 13, "\r");
assert.equal(await evaluate(`${recoverySummary}.parentElement.open`), false);

await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Emulation.setEmulatedMedia", {
  features: [
    { name: "forced-colors", value: "active" },
    { name: "prefers-reduced-motion", value: "reduce" },
  ],
});
await evaluate('document.documentElement.style.fontSize = "200%"');
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
  "controlled Review must reflow at 200% text in a 375px viewport",
);
await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
await until(
  `(() => { const rect = ${recoverySummary}.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= window.innerHeight; })()`,
);
const recoveryRect = await evaluate(
  `(() => { const rect = ${recoverySummary}.getBoundingClientRect(); return { x: (Math.max(0, rect.left) + Math.min(window.innerWidth, rect.right)) / 2, y: rect.top + rect.height / 2, height: rect.height, left: rect.left, right: rect.right }; })()`,
);
assert.ok(recoveryRect.height >= 44, "Recovery touch target");
assert.ok(recoveryRect.left >= 0, "Recovery target starts in viewport");
assert.ok(recoveryRect.right <= 375, "Recovery target stays in viewport");
assert.ok(recoveryRect.y >= 0, "Recovery target top stays in viewport");
assert.ok(recoveryRect.y <= 812, "Recovery target bottom stays in viewport");
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [
    {
      id: 1,
      x: recoveryRect.x,
      y: recoveryRect.y,
      radiusX: 1,
      radiusY: 1,
      force: 1,
    },
  ],
});
await new Promise((resolve) => setTimeout(resolve, 80));
await send("Input.dispatchTouchEvent", {
  type: "touchEnd",
  touchPoints: [],
});
await until(`${recoverySummary}.parentElement.open === true`);
assert.notEqual(
  await evaluate(
    'getComputedStyle(document.querySelector(".review-validation")).borderTopStyle',
  ),
  "none",
);
assert.ok(
  ["0s", "0.01ms", "0.00001s", "1e-05s"].includes(
    await evaluate(
      'getComputedStyle(document.querySelector(".petra-button")).transitionDuration',
    ),
  ),
  "reduced-motion transition",
);
body = await evaluate("document.body.innerText");
assert.ok(body.includes("Validation pending"));
assert.ok(body.includes("Preparation unavailable"));
assert.ok(body.includes("Apply unavailable"));

const accessibility = await send("Accessibility.getFullAXTree");
for (const label of [
  "Current and Candidate",
  "Basis",
  "Consequences",
  "Commitment unavailable",
  "Decision",
]) {
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "heading" && node.name?.value === label,
    ),
    `missing accessibility heading: ${label}`,
  );
}
for (const label of ["Preparation unavailable", "Apply unavailable"]) {
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "button" && node.name?.value === label,
    ),
    `missing accessibility control: ${label}`,
  );
}

await navigate(
  `/projects/${writingProjectId}/graph?layer=working`,
  "Controlled operating procedure",
);
await until('document.querySelector(".graph-surface") !== null');
await evaluate(`${button("Text")}.click()`);
await until('document.querySelector(".graph-text-view") !== null');
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "controlled textual Graph peer must reflow at 200% text",
);
assert.equal(
  await evaluate(
    'getComputedStyle(document.querySelector(".graph-text-view li[data-layer=working]")).borderLeftStyle',
  ),
  "dashed",
  "forced colors must retain a non-color working-layer distinction",
);
assert.deepEqual(await evaluate("window.pairedConsoleErrors"), []);

console.log(
  JSON.stringify(
    {
      state: "passed",
      browser: "Chrome via CDP",
      transport: "synthetic only",
      checks: [
        "production Project, relationship-overlay, and Review loaders",
        "scientific and controlled-writing ProjectDefinition terminology",
        "complete working Graph textual peer for both renderer scenarios",
        "scientific Review capability retained",
        "controlled-writing Review 1.3 with no commitment request path",
        "shared selection, validation, status, decision, authority, and recovery meaning",
        "keyboard activation and focus retention",
        "375px viewport at 200% text scaling",
        "44px touch disclosure",
        "forced colors and reduced motion",
        "non-color status and authority wording",
        "accessibility-tree headings and unavailable controls",
      ],
      limitation:
        "The controlled-writing Graph response is a renderer-only synthetic packet because the installed relationship-overlay contract and server route remain scientific-only.",
    },
    null,
    2,
  ),
);
socket.close();
