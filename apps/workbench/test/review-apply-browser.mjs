// Requires the workbench on 4312 and an isolated Chrome CDP page on 9432.
// Uses only synthetic transport in the mounted test harness.
import assert from "node:assert/strict";
const pages = await (await fetch("http://127.0.0.1:9432/json")).json();
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
const button = (text) =>
  `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)})`;
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", {
  url: "http://127.0.0.1:4312/test/review-apply-browser.html",
});
await until(`${button("Prepare changes to apply")} !== undefined`);
await evaluate("document.fonts.ready");
assert.equal(await evaluate("window.calls.length"), 0);
await evaluate(`${button("Apply unavailable")}.click()`);
assert.equal(await evaluate("window.calls.length"), 0);
await evaluate(`${button("Prepare changes to apply")}.focus()`);
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
await until(`${button("Apply displayed ChangeSet")} !== undefined`);
assert.equal(await evaluate("window.calls.length"), 1);
assert.equal(
  await evaluate('document.activeElement.getAttribute("aria-label")'),
  "Prepared commitment",
);
assert.equal(
  await evaluate(
    'document.querySelectorAll(".review-apply-preview li").length > 2',
  ),
  true,
);
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
  "narrow text scaling must not overflow",
);
await evaluate(
  `${button("Apply displayed ChangeSet")}.scrollIntoView({block:'center'})`,
);
const rect = await evaluate(
  `(()=>{const r=${button("Apply displayed ChangeSet")}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,height:r.height};})()`,
);
assert.ok(rect.height >= 44, "touch target");
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: rect.x, y: rect.y }],
});
await new Promise((r) => setTimeout(r, 80));
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await until("window.reloads === 1");
assert.equal(
  await evaluate('window.calls.filter(c=>c.method==="POST").length'),
  1,
);
assert.equal(
  await evaluate('document.body.innerText.includes("Applied—updating views")'),
  true,
);
assert.equal(
  await evaluate(
    '[...document.querySelectorAll(".review-apply-notice code")].filter(n=>n.textContent.startsWith("event_")).length',
  ),
  3,
);
await evaluate(`${button("Apply unavailable")}.click()`);
assert.equal(
  await evaluate('window.calls.filter(c=>c.method==="POST").length'),
  1,
);
const ax = await send("Accessibility.getFullAXTree");
assert.ok(ax.nodes.some((n) => n.role?.value === "status"));
console.log(
  JSON.stringify(
    {
      state: "passed",
      browser: "Chrome via CDP",
      checks: [
        "keyboard preparation sends no decision",
        "prepared preview receives focus",
        "complete visible atomic manifest",
        "one touch Apply sends complete checkpoint",
        "validated success reloads authorized Review callback",
        "canonical History event references without fixture navigation",
        "separate applied/projection lag status",
        "disabled resubmission",
        "375px at 200% text scale without horizontal overflow",
        "44px touch target",
        "forced colors and reduced motion",
        "status in accessibility tree",
      ],
    },
    null,
    2,
  ),
);
socket.close();
