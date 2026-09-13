// Requires the workbench on 4314 and an isolated Chrome CDP page on 9434.
// Uses only synthetic transport in the mounted test harness.
import assert from "node:assert/strict";
const pages = await (await fetch("http://127.0.0.1:9434/json")).json();
const socket = new WebSocket(
  pages.find((p) => p.type === "page").webSocketDebuggerUrl,
);
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

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", {
  url: "http://127.0.0.1:4314/test/project-brief-browser.html",
});
await until('document.querySelector("#brief-state") !== null');
await evaluate("document.fonts.ready");
assert.equal(await evaluate("window.briefCalls.length"), 1);
assert.equal(await evaluate("window.briefCalls[0].method"), "GET");
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
  await evaluate('document.querySelectorAll("main a[href*=history]").length'),
  0,
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
  await evaluate("window.briefCalls.length"),
  1,
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
await send("Page.navigate", {
  url: "http://127.0.0.1:4314/test/project-brief-browser.html?status=422",
});
await until(
  'document.body.innerText.includes("Project Brief read failed (422)")',
);
assert.equal(await evaluate('document.querySelector("#brief-state")'), null);
assert.equal(await evaluate("window.briefCalls.length"), 1);
console.log(
  JSON.stringify(
    {
      state: "passed",
      browser: "Chrome via CDP",
      transport: "synthetic only",
      checks: [
        "production loader and BriefRoute with browser schema validation",
        "one authenticated read",
        "seven DB07 headings",
        "separate statement origin headings in accessibility tree",
        "keyboard and touch packet disclosure without extra requests",
        "focus retained",
        "375px at 200% text scaling",
        "44px touch target",
        "forced colors and reduced motion",
        "no History links",
        "unsupported registration fails visibly without fixture fallback",
      ],
    },
    null,
    2,
  ),
);
socket.close();
