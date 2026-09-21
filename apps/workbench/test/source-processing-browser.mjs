import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const workbenchUrl =
  process.env.PETRA_SOURCE_PROCESSING_WORKBENCH_URL ?? "http://127.0.0.1:4311";
const socketUrl = process.env.PETRA_SOURCE_PROCESSING_CHROME_SOCKET;
if (socketUrl === undefined) {
  throw new Error("The focused source processing Chrome socket is required.");
}
const socket = new WebSocket(socketUrl);
await new Promise((resolveOpen) =>
  socket.addEventListener("open", resolveOpen, { once: true }),
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
  new Promise((resolveSend, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve: resolveSend, reject });
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
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(
    `Timed out: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
};
const button = (label) =>
  `[...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const navigate = async (mode) => {
  await send("Page.navigate", {
    url: `${workbenchUrl}/test/source-processing-browser.html?mode=${mode}`,
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

await navigate("unknown");
await until(
  'document.body.innerText.includes("Start bounded processing Work")',
);
for (const copy of [
  "Scientific evidence inquiry",
  "Source processing",
  "Identity only",
  "Selected text cannot be sent remotely",
]) {
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(copy)})`),
    true,
    `missing processing copy: ${copy}`,
  );
}
assert.equal(
  await evaluate('document.body.innerText.includes("sha256:")'),
  false,
);
await evaluate(`${button("Process source")}.click()`);
await until('document.body.innerText.includes("outcome not confirmed")');
await evaluate(`${button("Check processing effect")}.click()`);
await until('document.body.innerText.includes("outcome is still unknown")');
await evaluate(`${button("Retry exact processing request")}.click()`);
await until('document.body.innerText.includes("Processing Work started")');
const recovery = await evaluate(
  "({requests:window.sourceProcessingCalls.requests,recoveries:window.sourceProcessingCalls.recoveries})",
);
assert.equal(recovery.requests.length, 2);
assert.equal(recovery.recoveries.length, 1);
assert.deepEqual(recovery.requests[0], recovery.recoveries[0]);
assert.deepEqual(recovery.requests[0], recovery.requests[1]);
assert.deepEqual(recovery.requests[0].expected, recovery.requests[1].expected);
for (const field of [
  "actor",
  "capability_grant_id",
  "work_unit_id",
  "worker",
  "recorded_at",
]) {
  assert.equal(field in recovery.requests[0], false);
}
const workReturn = await evaluate(`(()=>{
  const link=[...document.querySelectorAll("a")].find((element)=>element.textContent.includes("Open processing Work"));
  const url=new URL(link.href);
  return {
    pathname:url.pathname,
    returnTo:url.searchParams.get("return_to"),
    returnLabel:url.searchParams.get("return_label"),
    returnFocus:url.searchParams.get("return_focus")
  };
})()`);
assert.equal(
  workReturn.pathname,
  "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/work/work_unit_01K6T000000000000000000009",
);
assert.equal(
  workReturn.returnTo,
  "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/sources/project_source_01K4C000000000000000000007?from=sources&sourceQuery=Ada",
);
assert.equal(workReturn.returnLabel, "source processing");
assert.equal(workReturn.returnFocus, "source-processing");

await navigate("stale");
await until(
  'document.body.innerText.includes("Start bounded processing Work")',
);
await evaluate(`${button("Process source")}.click()`);
await until('document.body.innerText.includes("Work is running")');
assert.equal(await evaluate("window.sourceProcessingCalls.reads"), 2);
assert.equal(
  await evaluate('document.body.innerText.includes("Processing Work started")'),
  false,
  "a stale request must not render a durable success receipt",
);

for (const [mode, copy] of [
  ["unavailable", "Processing is not permitted"],
  ["active", "Work is running"],
  ["terminal", "Work is completed"],
  ["load-failure", "Processing details unavailable"],
]) {
  await navigate(mode);
  await until(`document.body.innerText.includes(${JSON.stringify(copy)})`);
}

await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await navigate("ready");
await until(
  'document.body.innerText.includes("Start bounded processing Work")',
);
await evaluate('document.documentElement.style.fontSize="200%"');
await evaluate(
  "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "source processing must reflow without horizontal page overflow",
);
assert.ok(
  (await evaluate(
    `${button("Process source")}.getBoundingClientRect().height`,
  )) >= 44,
);
await evaluate(`${button("Process source")}.focus()`);
assert.equal(
  await evaluate(
    'document.activeElement.textContent.trim() === "Process source"',
  ),
  true,
);
const accessibility = await send("Accessibility.getFullAXTree");
for (const heading of [
  "Processing details",
  "Retained representation",
  "Start bounded processing Work",
  "Processing limits",
]) {
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "heading" && node.name?.value === heading,
    ),
    `missing accessible heading: ${heading}`,
  );
}

const reportPath = resolve(
  process.env.PETRA_WAVE6_SOURCE_PROCESSING_BROWSER_OUTPUT ??
    "reports/WAVE6-SOURCE-PROCESSING-BROWSER.json",
);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      schema_name: "petra.wave6-source-processing-browser-observation",
      schema_version: 1,
      observed_at: new Date().toISOString(),
      operations: ["source.start-processing", "source.inspect-processing"],
      production_boundary:
        "Production SourceProcessingPanel with the renderer-neutral ProjectSourceProcessingClient boundary and deterministic typed transport.",
      exercised: [
        "server-composed ready request",
        "stable command and idempotency retry",
        "unknown-effect recovery assessment",
        "durable receipt and exact Work destination",
        "ready, unavailable, active, and terminal states",
        "exact profile, source, representation, and limitation inspection",
        "same-Project task and focus return",
        "narrow viewport, 200% text, reduced motion, keyboard focus, and browser semantics",
      ],
      exclusions: [
        "No PostgreSQL service was started by this focused browser run.",
        "This is not the complete UX1.6-SOURCES register/process/inspect/replace/remove/delete/recovery workflow.",
      ],
    },
    null,
    2,
  )}\n`,
  "utf8",
);
process.stdout.write(
  `Wave 6 source processing browser checks passed: ${reportPath}\n`,
);
