import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";
const root = resolve(import.meta.dirname, "../../..");
const origin =
  process.env.PETRA_A1_READINESS_PREVIEW_URL ?? "http://127.0.0.1:4315";
const retained = JSON.parse(
  await readFile(
    resolve(root, "reports/FE-A1-INTAKE-FUNCTION-BROWSER.json"),
    "utf8",
  ),
);
const projectId = retained.project_id;
const read = async () => {
  const response = await fetch(`${origin}/api/projects/${projectId}/copilot`, {
    headers: { authorization: "Bearer petra-local-development" },
  });
  assert.equal(response.status, 200);
  return response.json();
};
const before = await read();
assert.equal(before.availability.state, "unavailable");
const question =
  "Synthetic A1 readiness inspection: preserve this question until the model role becomes eligible.";
const chrome = await startChrome({
  profilePrefix: "petra-a1-model-unavailable-",
});
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate } = cdp;
  await Promise.all([send("Page.enable"), send("Runtime.enable")]);
  const until = async (expression, label) => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise((done) => setTimeout(done, 100));
    }
    throw new Error(
      `The unavailable role did not expose ${label}: ${await evaluate("document.body.innerText.slice(-3000)")}`,
    );
  };
  await send("Page.navigate", { url: `${origin}/projects/${projectId}/brief` });
  await until(
    "document.querySelector('.copilot-conversation')?.dataset.readiness === 'unavailable'",
    "actual server readiness failure",
  );
  await evaluate(
    `(() => { const input=document.getElementById('copilot-question'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(question)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  );
  await until(
    `JSON.parse(sessionStorage.getItem(${JSON.stringify(`petra:copilot:draft:${projectId}`)})) === ${JSON.stringify(question)}`,
    "retained user input",
  );
  assert(
    await evaluate(
      "document.querySelector('.copilot-compose-actions button').disabled",
    ),
  );
  assert(
    await evaluate(
      `document.querySelector('.copilot-conversation').textContent.includes(${JSON.stringify(before.availability.reason)})`,
    ),
  );
  await evaluate(
    "document.querySelector('.copilot-compose-area form').requestSubmit()",
  );
  assert.equal(
    (await read()).turns.length,
    before.turns.length,
    "An unavailable role must not record or invoke a turn.",
  );
  const reloadMarker = `unavailable-reload-${Date.now()}`;
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__a1ReadinessReload=${JSON.stringify(reloadMarker)}`,
  });
  await send("Page.reload");
  await until(
    `window.__a1ReadinessReload === ${JSON.stringify(reloadMarker)} && document.querySelector('.copilot-conversation')?.dataset.readiness === 'unavailable'`,
    "a new document with actual unavailable readiness",
  );
  await until(
    `document.getElementById('copilot-question')?.value === ${JSON.stringify(question)}`,
    "the original draft after reload",
  );
  assert(
    await evaluate(
      "document.querySelector('.copilot-compose-actions button').disabled",
    ),
  );
  const after = await read();
  assert.equal(after.turns.length, before.turns.length);
  await writeFile(
    resolve(root, "reports/FE-A1-MODEL-UNAVAILABLE-BROWSER.json"),
    JSON.stringify(
      {
        status: "passed",
        verified_at: new Date().toISOString(),
        scope:
          "Critical browser challenge against the production HTTP and PostgreSQL service configured without an eligible model provider. The actual readiness failure is visible, submit cannot start a turn, and the input survives reload. No provider call occurs.",
        project_id: projectId,
        availability: before.availability,
        preserved_question: question,
        turns_before: before.turns.length,
        turns_after: after.turns.length,
        model_calls: 0,
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "Actual readiness failure preserved the question and prevented invocation.\n",
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
