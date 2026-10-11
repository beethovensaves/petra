import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";
const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const outcomes = [
  "Compare scientific claims against scholarly evidence and retained sources.",
  "Prepare a controlled writing procedure governed by auditable requirements.",
  "Plan a neighborhood block party with a budget, volunteer shifts, and a rain date.",
];
const chrome = await startChrome({
  profilePrefix: "petra-a1-outcome-drafting-",
});
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate } = cdp;
  const writes = [],
    errors = [],
    observations = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (
      message.method === "Network.requestWillBeSent" &&
      message.params.request.method === "POST"
    )
      writes.push(message.params.request.url);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
  });
  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Network.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  const until = async (expression, label) => {
    const end = Date.now() + 30000;
    while (Date.now() < end) {
      if (await evaluate(expression)) return;
      await new Promise((done) => setTimeout(done, 100));
    }
    throw new Error(
      `Did not reach ${label}: ${await evaluate("document.body.innerText.slice(-3000)")}`,
    );
  };
  await send("Page.navigate", { url: origin + "/" });
  await until(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).some(e=>e.textContent==='Start a new discussion')",
    "intake entry",
  );
  await evaluate(
    "document.querySelector('.reference-intake-panel input[type=checkbox]').click()",
  );
  await until(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).some(e=>e.textContent==='Start a new discussion'&&!e.disabled)",
    "acknowledged intake policy",
  );
  await evaluate(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).find(e=>e.textContent==='Start a new discussion').click()",
  );
  await until(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).some(e=>e.textContent==='Review a Project'&&!e.disabled)",
    "server-owned session",
  );
  await evaluate(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).find(e=>e.textContent==='Review a Project').click()",
  );
  await until(
    "document.querySelector('.project-profile-command textarea')!==null",
    "outcome-first form",
  );
  const sessionId = await evaluate(
    "JSON.parse(sessionStorage.getItem('petra:intake:selected'))",
  );
  for (const outcome of outcomes) {
    const entry = await evaluate(
      "(()=>{const e=document.querySelector('.project-definition-example');return {open:e.open,selection:e.querySelector('select').value,required:e.querySelector('select').required};})()",
    );
    assert.deepEqual(entry, { open: false, selection: "", required: false });
    await evaluate(
      `(()=>{const e=document.querySelector('.project-profile-command textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(outcome)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await until(
      "Array.from(document.querySelectorAll('.project-profile-command button')).some(e=>e.textContent==='Review Project'&&!e.disabled)",
      "review without mandatory example",
    );
    await evaluate(
      "Array.from(document.querySelectorAll('.project-profile-command button')).find(e=>e.textContent==='Review Project').click()",
    );
    await until(
      "document.querySelector('.project-definition-review')!==null",
      "proposed definition",
    );
    const retained = await evaluate(
      `fetch('/api/intake-sessions/${sessionId}',{headers:{authorization:'Bearer petra-local-development'}}).then(e=>e.json())`,
    );
    const draft = retained.draft;
    assert(draft);
    assert.equal(draft.content.request.outcome, outcome);
    assert.equal(draft.content.objective.statement, outcome);
    assert.equal(draft.content.request.example_ref, undefined);
    assert.equal(
      draft.content.definition_content.kernel_compatibility,
      "petra.project-kernel@1.0.0",
    );
    assert(draft.content.assumptions.length > 0);
    assert(draft.content.selected_capabilities.length > 0);
    assert(Array.isArray(draft.content.unsupported_capabilities));
    const visible = await evaluate(
      "(()=>{const e=document.querySelector('.project-definition-review'),button=Array.from(e.querySelectorAll('button')).find(e=>e.textContent==='Create Project');return {text:e.innerText,confirmed:e.querySelector('input[type=checkbox]').checked,disabled:button.disabled || button.getAttribute('aria-disabled')==='true'};})()",
    );
    assert.equal(visible.confirmed, false);
    assert.equal(visible.disabled, true);
    await evaluate(
      "Array.from(document.querySelectorAll('.project-definition-review button')).find(e=>e.textContent==='Create Project').click()",
    );
    await evaluate("new Promise(done=>requestAnimationFrame(done))");
    assert(
      !writes.some((url) => /\/from-definition-draft$/u.test(url)),
      "The actual unavailable button must send no creation command.",
    );
    for (const assumption of draft.content.assumptions) {
      assert(visible.text.includes(assumption.statement));
      assert(visible.text.includes(assumption.consequence));
    }
    observations.push({
      outcome,
      family: draft.content.definition_family,
      draft,
      optional_example: entry,
      unaccepted_creation_disabled: visible.disabled,
    });
    await evaluate(
      "Array.from(document.querySelectorAll('.project-definition-review button')).find(e=>e.textContent==='Revise').click()",
    );
    await until(
      "document.querySelector('.project-definition-review')===null",
      "explicit revision",
    );
  }
  assert(
    !writes.some((url) => /\/copilot\/run|\/from-definition-draft$/u.test(url)),
    "Draft inspection invokes no model and creates no Project.",
  );
  assert.equal(errors.length, 0);
  await writeFile(
    "reports/FE-A1-OUTCOME-DRAFTING-BROWSER.json",
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        session_id: sessionId,
        observations,
        writes,
        boundary:
          "Actual empty-project intake and server-retained definition drafts through the same production UI entry for three outcome types. No model invocation, accepted Project creation, native examiner, command bridge, or overall A1 completion inferred.",
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "Outcome-first drafting for all three outcome types and explicit assumption review passed.\n",
  );
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) {
    const stopped = new Promise((done) => chrome.child.once("exit", done));
    chrome.child.kill("SIGTERM");
    await stopped;
  }
  rmSync(chrome.profile, { recursive: true, force: true });
}
