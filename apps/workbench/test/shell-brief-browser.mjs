import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const workbenchUrl =
  process.env.PETRA_SHELL_BRIEF_WORKBENCH_URL ?? "http://127.0.0.1:4314";
let socketUrl = process.env.PETRA_SHELL_BRIEF_CHROME_SOCKET;
if (socketUrl === undefined) {
  const pages = await (await fetch("http://127.0.0.1:9434/json")).json();
  socketUrl = pages.find((page) => page.type === "page").webSocketDebuggerUrl;
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
  if (result.exceptionDetails !== undefined)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const until = async (expression) => {
  for (let index = 0; index < 120; index += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(
    `Timed out: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
};
const link = (text) =>
  `[...document.querySelectorAll("a")].find(element=>element.textContent.includes(${JSON.stringify(text)}))`;
const activate = async (expression) => {
  await evaluate(`${expression}.focus()`);
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
};
const route = "window.shellBriefRouter.state.location";

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", {
  url: `${workbenchUrl}/test/shell-brief-browser.html`,
});
await until('document.querySelector("#shell-attention-work") !== null');
await until('document.querySelector("#brief-focus") !== null');
await evaluate("document.fonts.ready");

assert.equal(
  await evaluate(
    'document.querySelector(".reference-context-bar__identity strong").textContent',
  ),
  "Competing explanations",
);
assert.equal(
  await evaluate(
    'document.querySelector(".reference-context-bar__identity a[href$=profile]").textContent',
  ),
  "Scientific evidence inquiry",
);
assert.equal(
  await evaluate(
    'document.querySelector(".brief-focus__statement").textContent',
  ),
  "Determine which claims in the selected source are supported by exact inspectable passages.",
);
assert.equal(
  await evaluate(
    'document.querySelector("#shell-attention-work").textContent.includes("1 task is active or need attention")',
  ),
  true,
);

const shellWorkLink = 'document.querySelector(".reference-attention-work a")';
const shellDestination = await evaluate(
  `${shellWorkLink}.getAttribute("href")`,
);
assert.match(shellDestination, /expected_work_revision=4/u);
assert.match(shellDestination, /expected_work_spec_hash=sha256%3A/u);
assert.match(shellDestination, /expected_work_record_hash=sha256%3A/u);
await activate(shellWorkLink);
await until(
  `${route}.pathname.endsWith("/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2")`,
);
await until('document.querySelector(".work-detail") !== null');
await activate(link("Return to Attention Work"));
await until(`${route}.pathname.endsWith("/brief")`);
await until('document.activeElement?.id === "shell-attention-work"');

const attentionOwnerLink =
  'document.querySelector(".brief-attention-list .reference-primary-link")';
await activate(attentionOwnerLink);
await until(
  `${route}.pathname.endsWith("/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2")`,
);
await activate(link("Return to Brief attention"));
await until(`${route}.pathname.endsWith("/brief")`);
await until('document.activeElement?.id === "brief-attention-item-0"');

await activate(
  link(
    "Compare from Applied the reviewed source replacement to current authority.",
  ),
);
await until(
  'document.body.innerText.includes("That baseline is no longer available")',
);
assert.equal(
  await evaluate(
    'window.shellBriefCalls.some(call=>call.status===422&&call.url.includes("baseline_event_id=event_01K4C000000000000000000058"))',
  ),
  true,
);
assert.equal(
  await evaluate(
    'document.body.innerText.includes("without inventing a historical snapshot")',
  ),
  true,
);

await activate(link("Compare from Recorded the inspectable source baseline."));
await until(
  'document.body.innerText.includes("This exact interval starts after the selected History event")',
);
assert.equal(
  await evaluate(
    'document.querySelector(".brief-change-list").textContent.includes("Applied the reviewed source replacement to current authority.")',
  ),
  true,
);
assert.equal(
  await evaluate(`${route}.search.includes("baseline_record_hash=sha256%3A")`),
  true,
);

await activate(link("Refresh this exact comparison"));
await until(
  'document.body.innerText.includes("The Brief changed before comparison")',
);
assert.equal(
  await evaluate(
    'window.shellBriefCalls.some(call=>call.status===409&&call.url.includes("expected_snapshot_hash="))',
  ),
  true,
);
assert.equal(
  await evaluate(
    'document.body.innerText.includes("without substituting a comparison")',
  ),
  true,
);

await activate(link("Compare from Recorded the inspectable source baseline."));
await until(
  'document.body.innerText.includes("Refresh this exact comparison")',
);
await activate(link("Return to current Brief"));
await until(`${route}.search === ""`);
await until('document.activeElement?.id === "brief-changed"');

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
await evaluate(
  "new Promise(resolveFrame=>requestAnimationFrame(()=>requestAnimationFrame(resolveFrame)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "the integrated shell and Brief must reflow at 375px and 200% text",
);
const targetHeight = await evaluate(
  'document.querySelector(".reference-attention-work a").getBoundingClientRect().height',
);
assert.ok(targetHeight >= 44);

const observation = {
  schema_name: "petra.wave6-shell-brief-browser-evidence",
  schema_version: "1.0.0",
  state: "passed",
  operation_ids: ["shell.attention-work", "brief.attention", "brief.change"],
  browser: "Chrome via CDP",
  transport: "deterministic schema-valid HTTP at the production UI boundary",
  checks: [
    "project-shell-view@1.3.0 consumed through ProjectShellClient and the production loader",
    "bounded active Work summary, reason, and exact destination visible in the shell",
    "keyboard-opened shell Work destination and focused return to Attention Work",
    "keyboard-opened Brief attention owner and focused return to the originating item",
    "recent-History baseline selected through a visible Brief control",
    "exact canonical comparison outcome and current-Brief return",
    "unavailable baseline recovery without a substituted comparison",
    "stale comparison replay recovery without false success",
    "Project context and current Objective orientation remained visible",
    "375px width, 200% text reflow, reduced motion, and 44px Work target",
  ],
  verified_not_credited: ["shell.inspect-context", "brief.orient"],
  named_scenario: null,
  boundary:
    "Isolated Chrome keyboard-invoked the production ProjectShell, ProjectBriefSurface, WorkDetailSurface, React Router controls, ProjectShellClient, ProjectBriefClient, exact Work destination checks, comparison success, unavailable recovery, stale recovery, and focused returns using deterministic schema-valid authenticated HTTP. The exact backend counterpart separately proves the live server and PostgreSQL owners. This artifact does not claim live server transport, PostgreSQL persistence, a complete guided workflow, or any frozen Wave 6 evidence-plan scenario.",
};
await writeFile(
  process.env.PETRA_SHELL_BRIEF_BROWSER_OUTPUT ??
    "reports/WAVE6-SHELL-BRIEF-BROWSER.json",
  `${JSON.stringify(observation, null, 2)}\n`,
);
console.log(JSON.stringify(observation, null, 2));
socket.close();
