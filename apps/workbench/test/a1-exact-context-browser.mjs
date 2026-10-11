import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";
const root = resolve(import.meta.dirname, "../../..");
const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const { project_id: projectId } = JSON.parse(
  await readFile(
    resolve(root, "reports/FE-A1-INTAKE-FUNCTION-BROWSER.json"),
    "utf8",
  ),
);
const response = await fetch(`${origin}/api/projects/${projectId}/copilot`, {
  headers: { authorization: "Bearer petra-local-development" },
});
assert.equal(response.status, 200);
const before = await response.json();
const turn = before.turns.findLast(
  (value) =>
    value.terminal?.state === "completed" &&
    value.input_manifest &&
    value.context.records.some(
      (record) => record.kind === "project-definition-context",
    ),
);
assert(
  turn,
  "A fresh managed-model turn on the integrated context candidate is required.",
);
assert(turn.question.startsWith("Synthetic A1"));
assert.deepEqual(
  turn.input_manifest.content.context_record_keys,
  turn.context.records.map((record) => record.key),
);
const chrome = await startChrome({ profilePrefix: "petra-a1-exact-context-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  const commands = [],
    errors = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
    if (
      message.method === "Network.requestWillBeSent" &&
      message.params.request.method !== "GET" &&
      message.params.request.url.includes("/api/commands/")
    )
      commands.push(message.params.request.url);
  });
  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Network.enable"),
  ]);
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: `${origin}/projects/${projectId}/petra` });
  await until(
    `Array.from(document.querySelectorAll('.copilot-exchange')).some(node=>node.textContent.includes(${JSON.stringify(turn.run_id)}))`,
    "retained context turn",
  );
  const inspect = `Array.from(document.querySelectorAll('.copilot-exchange')).find(node=>node.textContent.includes(${JSON.stringify(turn.run_id)})).querySelector('.copilot-input-manifest')`;
  await evaluate(
    `${inspect}.open=true; ${inspect}.querySelectorAll('details').forEach(node=>node.open=true)`,
  );
  const displayed = await evaluate(`${inspect}.innerText`);
  for (const limitation of turn.context.limitations)
    assert(displayed.includes(limitation));
  for (const record of turn.context.records) {
    assert(displayed.includes(record.label));
    if (record.text) assert(displayed.includes(record.text));
  }
  assert(
    displayed.includes(turn.context.content_hash),
    "Retained manifest must bind this exact context hash.",
  );
  assert(displayed.includes("Included context and withheld material"));
  const originalDisplayed = displayed;
  await send("Emulation.setDeviceMetricsOverride", {
    width: 640,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(
    "Array.from(document.querySelectorAll('.reference-mobile-pane-switcher button')).find(button=>button.textContent.trim()==='Agent').click()",
  );
  await until(
    "document.querySelector('[data-mobile-pane]').getAttribute('data-mobile-pane')==='agent'",
    "visible narrow copilot pane",
  );
  assert.equal(await evaluate(`${inspect}.innerText`), originalDisplayed);
  const overflow = await evaluate(
    `(()=>{const node=${inspect};return [...node.querySelectorAll('pre')].map(item=>({wrap:getComputedStyle(item).whiteSpace, width:item.getBoundingClientRect().width, container:node.getBoundingClientRect().width}))})()`,
  );
  assert(
    overflow.every(
      (item) => item.wrap === "pre-wrap" && item.width <= item.container + 1,
    ),
  );
  assert.deepEqual(commands, []);
  assert.deepEqual(errors, []);
  await writeFile(
    resolve(root, "reports/FE-A1-EXACT-CONTEXT-BROWSER.json"),
    JSON.stringify(
      {
        status: "passed",
        boundary:
          "Actual retained input disclosure in the production browser; no new command or model call. Whole admitted records and limitations remain exact at desktop and narrow widths.",
        project_id: projectId,
        run_id: turn.run_id,
        context_hash: turn.context.content_hash,
        input_manifest: turn.input_manifest,
        record_keys: turn.context.records.map((record) => record.key),
        errors,
        commands,
        overflow,
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "Exact retained input disclosure matched the production context.\n",
  );
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) {
    const closed = new Promise((done) => chrome.child.once("exit", done));
    chrome.child.kill("SIGTERM");
    await closed;
  }
  rmSync(chrome.profile, { recursive: true, force: true });
}
