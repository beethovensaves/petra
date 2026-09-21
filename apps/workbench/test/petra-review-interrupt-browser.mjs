import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const workbenchUrl =
  process.env.PETRA_REVIEW_INTERRUPT_WORKBENCH_URL ?? "http://127.0.0.1:4314";
let socketUrl = process.env.PETRA_REVIEW_INTERRUPT_CHROME_SOCKET;
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
  if (result.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
};
const until = async (expression, label) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(
    `Timed out waiting for ${label}:\n${await evaluate("document.body.innerText")}`,
  );
};
const button = (label) =>
  `[...document.querySelectorAll("button")].find(element => element.textContent.trim() === ${JSON.stringify(label)})`;
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
const url = `${workbenchUrl}/test/petra-review-interrupt-browser.html`;
await send("Page.navigate", { url });
await until(
  'document.querySelector(".petra-review-interrupt") !== null',
  "durable Review response",
);
await evaluate("document.fonts.ready");
assert.equal(
  await evaluate(`${button("Respond")}.getAttribute("aria-disabled")`),
  "true",
);

await evaluate(
  'document.querySelector("input[value=accept]").focus(); document.querySelector("input[value=accept]").click()',
);
const rationale = "The exact source basis supports this bounded candidate.";
await evaluate(`(() => {
  const textarea = document.querySelector(".petra-review-interrupt textarea");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
  setter.call(textarea, ${JSON.stringify(rationale)});
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
})()`);
await until(
  `${button("Respond")}.getAttribute("aria-disabled") !== "true"`,
  "available Respond control",
);
await activate(button("Respond"));
await until(
  'document.body.innerText.includes("Review response was not confirmed")',
  "uncertain delivery recovery",
);
assert.equal(await evaluate("window.reviewCalls.length"), 1);
assert.ok(
  (await evaluate("document.body.innerText")).includes(
    "The exact response remains retained",
  ),
);
await activate(button("Respond"));
await until(
  'document.querySelector(".petra-review-interrupt")?.dataset.responseState === "resolved"',
  "durable response outcome",
);

const calls = await evaluate("window.reviewCalls");
assert.equal(calls.length, 2);
assert.deepEqual(calls[0].body, calls[1].body);
assert.equal(calls[0].method, "POST");
assert.equal(calls[0].authorization, "Bearer petra-local-development");
assert.ok(calls[0].url.endsWith("/api/commands/reviews/resolve"));
assert.equal(calls[0].body.decision, "accept");
assert.equal(calls[0].body.rationale, rationale);
assert.equal(
  calls[0].body.interrupt_ref.interaction_interrupt_id,
  "interaction_interrupt_01ARZ3NDEKTSV4RRFFQ69G5FD8",
);
assert.equal(
  calls[0].body.change_set_ref.change_set_id,
  "change_set_01ARZ3NDEKTSV4RRFFQ69G5FBF",
);
assert.equal("actor" in calls[0].body, false);
assert.equal("capability_grant_id" in calls[0].body, false);

const outcomeText = await evaluate(
  'document.querySelector(".petra-review-interrupt__outcome").innerText',
);
assert.ok(outcomeText.includes("Authenticated decision applied"));
assert.ok(outcomeText.includes("Complete · member Applied · snapshot Current"));
assert.ok(outcomeText.includes("actor_01ARZ3NDEKTSV4RRFFQ69G5FAV"));
const links = await evaluate(
  '[...document.querySelectorAll(".petra-review-interrupt__outcome nav a")].map(link => ({ text: link.textContent.trim(), href: link.getAttribute("href") }))',
);
assert.deepEqual(links, [
  {
    text: "Return to Extract supported claims",
    href: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
  },
  {
    text: "Open exact Review",
    href: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/review/review_session_01K4D000000000000000000004",
  },
  {
    text: "Open originating Work",
    href: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/work/work_unit_01ARZ3NDEKTSV4RRFFQ69G5FC2",
  },
  {
    text: "Open originating Project thread",
    href: "/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/petra/project_thread_01K4C000000000000000000101",
  },
]);

await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
await evaluate('document.documentElement.style.fontSize = "200%"');
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await evaluate(
  "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
);
const accessibility = await send("Accessibility.getFullAXTree");
for (const label of [
  "Respond before Work can continue",
  "Authenticated decision applied",
  "Exact Review response destinations",
]) {
  assert.ok(
    accessibility.nodes.some((node) => node.name?.value === label),
    `Missing accessibility node: ${label}`,
  );
}

const report = {
  operation_id: "petra.respond-interrupt",
  status: "passed",
  url,
  control: "Respond",
  interaction: {
    keyboard_submit: true,
    first_delivery: "unconfirmed",
    exact_retry_payload_reused: true,
    durable_outcome: "applied",
  },
  identities: {
    project_id: calls[0].body.project_id,
    interaction_run_id: calls[0].body.interaction_run_id,
    interrupt_ref: calls[0].body.interrupt_ref,
    change_set_ref: calls[0].body.change_set_ref,
  },
  authority: {
    payload_contains_actor: false,
    payload_contains_capability_grant: false,
    authenticated_actor_rendered: "actor_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  },
  exact_return_links: links,
  accessibility: {
    landmarks_and_names: true,
    narrow_200_percent_reflow: true,
    visible_text_outcome: true,
  },
  boundary:
    "Focused Chromium exercises the production Petra Review-interrupt component and typed command client with a synthetic response transport. Real PostgreSQL authority, restart replay, ArtifactStore bytes, and command parity remain covered separately by reports/WAVE6-DIRECT-PETRA-COMMAND-PARITY.json.",
};
const output = process.env.PETRA_REVIEW_INTERRUPT_BROWSER_OUTPUT;
if (output !== undefined && output.trim() !== "") {
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
}
socket.close();
