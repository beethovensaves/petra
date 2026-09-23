// Uses only synthetic transport in the mounted production-UI harness.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const workbenchUrl =
  process.env.PETRA_PROJECT_BRIEF_WORKBENCH_URL ?? "http://127.0.0.1:4314";
let socketUrl = process.env.PETRA_PROJECT_BRIEF_CHROME_SOCKET;
if (socketUrl === undefined) {
  const pages = await (await fetch("http://127.0.0.1:9434/json")).json();
  socketUrl = pages.find((page) => page.type === "page").webSocketDebuggerUrl;
}
const socket = new WebSocket(socketUrl);
await new Promise((r) => socket.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
socket.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    m.error ? p.reject(m.error) : p.resolve(m.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const until = async (expression) => {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    "Timed out: " +
      expression +
      "\n" +
      (await evaluate("document.body.innerText")),
  );
};
const button = (label) =>
  `[...document.querySelectorAll("button")].find(e=>e.textContent.trim()===${JSON.stringify(label)})`;
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
const setObjectiveDraft = async (index, value) => {
  await evaluate(`(()=>{
    const field=document.querySelectorAll(".brief-objective-control textarea")[${index}];
    const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set;
    setter.call(field,${JSON.stringify(value)});
    field.dispatchEvent(new Event("input",{bubbles:true}));
  })()`);
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", {
  url: `${workbenchUrl}/test/project-brief-browser.html`,
});
await until('document.querySelector("#brief-state") !== null');
await evaluate("document.fonts.ready");
assert.equal(
  await evaluate(
    'window.briefCalls.filter(call=>call.url.endsWith("/brief")).length',
  ),
  1,
);
assert.equal(
  await evaluate(
    'window.briefCalls.find(call=>call.url.endsWith("/brief")).method',
  ),
  "GET",
);
assert.deepEqual(
  await evaluate(
    '[...document.querySelectorAll("main > section > h2")].map(e=>e.textContent)',
  ),
  [
    "Current focus",
    "Needs your attention",
    "What changed",
    "Current state",
    "Work",
    "Next steps",
    "Recent decisions",
  ],
);
assert.equal(
  await evaluate(
    '[...document.querySelectorAll("main a[href*=history]")].filter(link=>link.closest(".reference-agent-control")===null).length',
  ),
  1,
);
assert.equal(
  await evaluate(
    '[...document.querySelectorAll("main a[href*=history]")].find(link=>link.closest(".reference-agent-control")===null)?.textContent.trim()',
  ),
  "View all Project History",
);
const summary =
  '[...document.querySelectorAll("summary")].find(e=>e.textContent.startsWith("Complete original ContextPacket"))';
await evaluate(`${summary}.focus()`);
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
assert.equal(await evaluate(`${summary}.parentElement.open`), true);
assert.equal(await evaluate(`document.activeElement === ${summary}`), true);
await evaluate("document.activeElement.blur()");
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
await evaluate('document.documentElement.style.fontSize="200%"');
await send("Emulation.setTouchEmulationEnabled", {
  enabled: true,
  maxTouchPoints: 1,
});
await evaluate(
  "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "narrow scaled content must wrap",
);
await new Promise((resolve) => setTimeout(resolve, 200));
await evaluate(
  `${summary}.scrollIntoView({block: "center", behavior: "instant"})`,
);
await new Promise((resolve) => setTimeout(resolve, 200));
await evaluate(
  "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
);
const rect = await evaluate(
  `(()=>{const r=${summary}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,height:r.height};})()`,
);
assert.ok(rect.height >= 44);
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: rect.x, y: rect.y }],
});
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await until(`${summary}.parentElement.open === false`);
assert.equal(
  await evaluate(
    'window.briefCalls.filter(call=>call.url.includes("/api/")).length',
  ),
  2,
  "disclosure must not read or mutate authority",
);
const ax = await send("Accessibility.getFullAXTree");
for (const label of [
  "Source report",
  "Petra synthesis",
  "Unresolved inference",
])
  assert.ok(
    ax.nodes.some(
      (n) => n.role?.value === "heading" && n.name?.value === label,
    ),
  );

await activate(button("Revise objective"));
assert.equal(
  await evaluate(
    'document.querySelectorAll(".brief-objective-control textarea")[0].readOnly',
  ),
  true,
);
await setObjectiveDraft(
  1,
  "Which exact population, task, and outcome are supported by inspectable passages?",
);
await activate(button("Review proposed objective"));
await until('document.body.innerText.includes("Review exact wording")');
await activate(button("Apply reviewed objective"));
await until('document.body.innerText.includes("Objective revised")');
assert.equal(
  await evaluate("window.briefRouter.state.location.hash"),
  "#brief-focus",
);
assert.equal(
  await evaluate("window.briefRouter.state.location.pathname"),
  "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/brief",
);
const appliedRequest = await evaluate(
  'window.briefCalls.find(call=>call.url.endsWith("/objective")&&call.method==="POST").body',
);
assert.equal(appliedRequest.operation, "revise");
assert.equal(
  appliedRequest.review.rough_statement,
  "Determine which claims in the selected source are supported by exact inspectable passages.",
);
assert.equal(
  appliedRequest.review.proposed_content.statement,
  "Which exact population, task, and outcome are supported by inspectable passages?",
);
for (const clientAuthority of [
  "actor",
  "capability_grant_id",
  "objective_id",
  "revision",
  "recorded_at",
])
  assert.equal(clientAuthority in appliedRequest, false);

await send("Page.navigate", {
  url: `${workbenchUrl}/test/project-brief-browser.html?mode=recovery`,
});
await until(`${button("Revise objective")} !== undefined`);
await activate(button("Revise objective"));
const retainedRough =
  "Determine which claims in the selected source are supported by exact inspectable passages.";
const retainedProposal =
  "Which exact retained outcome should the Project compare after recovery?";
await setObjectiveDraft(1, retainedProposal);
await activate(button("Review proposed objective"));
await activate(button("Apply reviewed objective"));
await until('document.body.innerText.includes("Objective outcome is unknown")');
assert.deepEqual(
  await evaluate(
    '[...document.querySelectorAll(".brief-objective-control textarea")].map(field=>field.value)',
  ),
  [retainedRough, retainedProposal],
);
const uncertainRequest = await evaluate(
  'window.briefCalls.find(call=>call.url.endsWith("/objective")&&call.method==="POST").body',
);
await activate(button("Check exact command outcome"));
await until('document.body.innerText.includes("Outcome still unknown")');
await activate(button("Retry exact command"));
await until('document.body.innerText.includes("Exact command replayed")');
const retriedRequests = await evaluate(
  'window.briefCalls.filter(call=>call.url.endsWith("/objective")&&call.method==="POST").map(call=>call.body)',
);
assert.equal(retriedRequests.length, 2);
assert.deepEqual(retriedRequests[0], uncertainRequest);
assert.deepEqual(retriedRequests[1], uncertainRequest);
assert.equal(
  await evaluate("window.briefRouter.state.location.hash"),
  "#brief-focus",
);

await send("Page.navigate", {
  url: `${workbenchUrl}/test/project-brief-browser.html?mode=conflict`,
});
await until(`${button("Revise objective")} !== undefined`);
await activate(button("Revise objective"));
await setObjectiveDraft(1, "Conflict test proposed Objective wording.");
await activate(button("Review proposed objective"));
await activate(button("Apply reviewed objective"));
await until('document.body.innerText.includes("Command identity conflict")');
await activate(button("Check exact command outcome"));
await until('document.body.innerText.includes("Petra will not retry it")');
assert.equal(
  await evaluate(
    `[...document.querySelectorAll("button")].some(e=>e.textContent.trim()==="Retry exact command")`,
  ),
  false,
);
await send("Page.navigate", {
  url: `${workbenchUrl}/test/project-brief-browser.html?status=422`,
});
await until(
  'document.body.innerText.includes("Project Brief read failed (422)")',
);
assert.equal(await evaluate('document.querySelector("#brief-state")'), null);
assert.equal(
  await evaluate(
    'window.briefCalls.filter(call=>call.url.endsWith("/brief")).length',
  ),
  1,
);
const observation = {
  state: "passed",
  browser: "Chrome via CDP",
  transport: "schema-valid synthetic HTTP at the production UI boundary",
  checks: [
    "production loader and BriefRoute with browser schema validation",
    "exact Project, ProjectDefinition, and focused Objective bindings",
    "reviewed rough and proposed wording",
    "applied result and exact Brief focus return",
    "unknown-effect assessment with drafts preserved",
    "exact command identity reuse and replayed outcome",
    "command identity conflict with fail-closed recovery",
    "no client actor, capability grant, Objective identity, revision, or authority timestamps; only the required human review time",
    "seven DB07 headings",
    "separate statement origin headings in accessibility tree",
    "keyboard and touch packet disclosure without extra requests",
    "375px at 200% text scaling",
    "44px touch target",
    "forced colors and reduced motion",
    "unsupported registration fails visibly without fixture fallback",
  ],
  boundary:
    "Isolated Chrome executed the production Brief loader, reviewed Objective component, typed command adapter, recovery adapter, and exact return with deterministic schema-valid HTTP. Live server and PostgreSQL execution remain covered by the exact backend counterpart and were not re-executed by this browser artifact.",
};
await writeFile(
  process.env.PETRA_WAVE6_OBJECTIVE_BROWSER_OUTPUT ??
    "reports/WAVE6-OBJECTIVE-COMMAND-BROWSER.json",
  `${JSON.stringify(observation, null, 2)}\n`,
);
console.log(JSON.stringify(observation, null, 2));
socket.close();
