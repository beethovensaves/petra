import assert from "node:assert/strict";

const workbenchUrl =
  process.env.PETRA_SOURCE_REUSE_WORKBENCH_URL ?? "http://127.0.0.1:4311";
const socketUrl = process.env.PETRA_SOURCE_REUSE_CHROME_SOCKET;
if (socketUrl === undefined) {
  throw new Error("The focused source reuse Chrome socket is required.");
}
const socket = new WebSocket(socketUrl);
await new Promise((resolve) =>
  socket.addEventListener("open", resolve, { once: true }),
);
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id === undefined) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error === undefined) request.resolve(message.result);
  else request.reject(message.error);
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
  if (result.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
};
const until = async (expression) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Timed out: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
};
const button = (label) =>
  `[...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const navigate = async (mode) => {
  await send("Page.navigate", {
    url: `${workbenchUrl}/test/source-reuse-browser.html?mode=${mode}`,
  });
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

await navigate("stale");
await until('document.body.innerText.includes("Reusable source")');
assert.equal(
  await evaluate('document.body.innerText.includes("sha256:")'),
  false,
);
assert.equal(
  await evaluate('document.body.innerText.includes("artifact_manifest")'),
  false,
);
await evaluate(
  'document.querySelector("input[name=source-reuse-candidate]").click()',
);
await evaluate(
  '(()=>{const select=document.querySelector("#source-reuse-project-role");select.value="scientific.background";select.dispatchEvent(new Event("change",{bubbles:true}));})()',
);
await until(
  `${button("Use existing source")}.getAttribute("aria-disabled") === null`,
);
await evaluate(`${button("Use existing source")}.click()`);
await until(
  'document.body.innerText.includes("The reviewed source choice changed")',
);
assert.equal(await evaluate("window.sourceReuseCalls.optionReads"), 2);
assert.equal(
  await evaluate(
    'document.querySelector("input[name=source-reuse-candidate]").checked',
  ),
  true,
  "stale refresh must preserve the selected candidate when it remains current",
);
assert.equal(
  await evaluate('document.querySelector("#source-reuse-project-role").value'),
  "scientific.background",
  "stale refresh must preserve the selected registered role",
);
await evaluate(`${button("Use existing source")}.click()`);
await until("window.sourceReuseCompletion !== undefined");
const submitted = await evaluate("window.sourceReuseCalls.requests");
assert.equal(submitted.length, 2);
assert.notEqual(submitted[0].command_id, submitted[1].command_id);
assert.notEqual(submitted[0].idempotency_key, submitted[1].idempotency_key);
assert.deepEqual(submitted[0].expected, submitted[1].expected);
assert.deepEqual(submitted[0].existing_source, submitted[1].existing_source);
assert.deepEqual(
  submitted[0].project_membership,
  submitted[1].project_membership,
);
assert.equal(
  submitted[0].project_membership.source_role,
  "scientific.background",
);
assert.equal("actor" in submitted[0], false);
assert.equal("capability_grant_id" in submitted[0], false);
assert.equal("project_source_id" in submitted[0], false);
assert.equal("recorded_at" in submitted[0], false);
assert.equal(
  await evaluate("window.sourceReuseCompletion.projectSourceId"),
  "project_source_01K6T000000000000000000009",
);

for (const [mode, heading] of [
  ["empty", "No permitted source is available to reuse"],
  ["all-linked", "Every permitted source is already linked"],
  ["unsupported", "This Project profile is not supported for source reuse"],
  ["roles", "No registered Project role can receive this source"],
  ["permission", "Source reuse access changed"],
  ["failure", "Existing sources could not be loaded"],
]) {
  await navigate(mode);
  await until(`document.body.innerText.includes(${JSON.stringify(heading)})`);
}

await navigate("duplicate");
await until('document.body.innerText.includes("Reusable source")');
await evaluate(
  'document.querySelector("input[name=source-reuse-candidate]").click()',
);
await evaluate(`${button("Use existing source")}.click()`);
await until(
  'document.body.innerText.includes("This source is already linked")',
);
await until(
  'document.body.innerText.includes("Every permitted source is already linked")',
);
assert.equal(await evaluate("window.sourceReuseCalls.optionReads"), 2);

await navigate("unknown");
await until('document.body.innerText.includes("Reusable source")');
await evaluate(
  'document.querySelector("input[name=source-reuse-candidate]").click()',
);
await evaluate(`${button("Use existing source")}.click()`);
await until('document.body.innerText.includes("outcome not confirmed")');
await evaluate(`${button("Check source reuse effect")}.click()`);
await until('document.body.innerText.includes("outcome is still unknown")');
await evaluate(`${button("Retry exact source reuse")}.click()`);
await until("window.sourceReuseCompletion !== undefined");
const recovery = await evaluate(
  "({requests:window.sourceReuseCalls.requests,recoveries:window.sourceReuseCalls.recoveries})",
);
assert.equal(recovery.requests.length, 2);
assert.equal(recovery.recoveries.length, 1);
assert.deepEqual(recovery.requests[0], recovery.recoveries[0]);
assert.deepEqual(recovery.requests[0], recovery.requests[1]);

await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await evaluate('document.documentElement.style.fontSize="200%"');
await navigate("stale");
await until('document.body.innerText.includes("Reusable source")');
await evaluate(
  "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "source reuse must reflow without horizontal page overflow",
);
const radioHeight = await evaluate(
  'document.querySelector(".source-reuse-candidate").getBoundingClientRect().height',
);
assert.ok(radioHeight >= 44);
const accessibility = await send("Accessibility.getFullAXTree");
for (const heading of [
  "Use existing source",
  "Scientific evidence inquiry",
  "Review the exact effect",
]) {
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "heading" && node.name?.value === heading,
    ),
    `missing accessible heading: ${heading}`,
  );
}
