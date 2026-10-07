import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { createCdp, startChrome } from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "../../..");
const url = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const projectId = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const calls = [];
const chrome = await startChrome({ profilePrefix: "petra-a1-copilot-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate } = cdp;
  const browserErrors = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
    if (message.method === "Network.responseReceived" && message.params.response.url.includes("/api/")) calls.push({ url: message.params.response.url, status: message.params.response.status });
  });
  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable"), send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })]);
  const until = async (expression, label) => {
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise((next) => setTimeout(next, 200));
    }
    throw new Error(`${label} did not become ready. ${await evaluate("document.body.innerText.slice(-3500)")}`);
  };
  const read = async () => {
    const response = await fetch(`${url}/api/projects/${projectId}/copilot`, { headers: { authorization: "Bearer petra-local-development" } });
    assert.equal(response.status, 200); return response.json();
  };
  const before = await read(); assert.equal(before.availability.state, "ready");
  // Limit this external-model trace to the verified disposable fixture metadata.
  // The exact context hash prevents substituting a changed payload after checking.
  assert.equal(before.context.project_label, "Competing explanations");
  assert.equal(before.context.objective_statement, "Determine which claims in the selected source are supported by exact inspectable passages.");
  assert(before.context.records.length > 0);
  for (const record of before.context.records) {
    assert.equal(record.label, "scientific.claim");
    const metadata = JSON.parse(record.text);
    assert.deepEqual(Object.keys(metadata).sort(), ["candidate_operation", "object_record_ref", "registration"]);
    assert.equal(metadata.registration.semantic_key, "scientific.claim");
    assert.equal(metadata.object_record_ref.schema_name, "petra.claim");
  }
  const allowedQuestions = ["What is the current claim and what evidence is represented in this Project's supplied context?", "Which uncertainty in your answer should we examine next, and why?"];
  assert(before.turns.every((turn) => allowedQuestions.includes(turn.question)), "The synthetic trace must not disclose another retained conversation.");
  await send("Page.navigate", { url: `${url}/projects/${projectId}/brief` });
  await until("document.querySelector('.copilot-conversation')?.dataset.readiness === 'ready'", "normal copilot composer");
  assert(await evaluate("Array.from(document.querySelectorAll('.reference-workspace-destinations a')).some(a=>a.textContent==='Graph')"));
  const ask = async (question) => {
    await evaluate(`(() => { const input=document.getElementById('copilot-question'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(question)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await until("document.querySelector('.copilot-compose-actions button')?.disabled === false", "send enabled");
    await evaluate("document.querySelector('.copilot-compose-area form').requestSubmit()");
  };
  const firstQuestion = "What is the current claim and what evidence is represented in this Project's supplied context?";
  await ask(firstQuestion);
  await until("document.querySelector('.copilot-workspace-result h2')?.textContent.includes('What is the current claim')", "reactive Workspace answer");
  const first = await read(); const firstTurn = first.turns.at(-1); assert.equal(firstTurn.question, firstQuestion); assert.equal(firstTurn.terminal.state, "completed");
  assert.equal(first.context.basis.event_position, before.context.basis.event_position, "An advisory answer must not mutate domain authority");
  assert(firstTurn.terminal.output.blocks.some((block) => block.citations.length > 0), "The supplied-record answer must carry validated citations");
  await until("document.querySelector('.copilot-citations button') !== null", "evidence citation");
  await evaluate("document.querySelector('.copilot-citations button').click()");
  await until("document.querySelector('.copilot-workspace-result')?.getAttribute('aria-label') === 'Evidence selected in conversation'", "exact cited evidence in Workspace");
  const recordLabel = await evaluate("document.querySelector('.copilot-workspace-result h2').textContent");
  assert(firstTurn.context.records.some((record) => record.label === recordLabel));
  await evaluate("document.querySelector('.copilot-workspace-result > header button').click()");
  const followup = "Which uncertainty in your answer should we examine next, and why?";
  await ask(followup);
  await until("document.querySelector('.copilot-workspace-result h2')?.textContent.includes('Which uncertainty')", "retained contextual follow-up");
  const second = await read(); const secondTurn = second.turns.at(-1); assert.equal(secondTurn.parent_run_id, firstTurn.run_id); assert.equal(secondTurn.terminal.state, "completed");
  const reloadMarker = `a1-reload-${Date.now()}`;
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__a1ReloadMarker=${JSON.stringify(reloadMarker)}` });
  await send("Page.reload");
  await until(`window.__a1ReloadMarker === ${JSON.stringify(reloadMarker)}`, "new reload document");
  await until("document.querySelector('.copilot-transcript')?.textContent.includes('Which uncertainty in your answer')", "readable conversation after reload");
  assert(await evaluate("document.querySelector('.copilot-transcript').textContent.includes('What is the current claim')"));
  await evaluate("Array.from(document.querySelectorAll('.reference-workspace-destinations a')).find(a=>a.textContent==='Graph').click()");
  await until("location.pathname.endsWith('/graph') && document.querySelector('#graph-selection') !== null", "discoverable functioning Graph");
  const graphNodes = await evaluate("document.querySelectorAll('[data-node-id]').length");
  await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then((result) => writeFile(resolve(root, "reports/FE-A1-COPILOT-CONSTRUCTION.png"), Buffer.from(result.data, "base64")));
  assert.deepEqual(browserErrors, []);
  const proof = { status: "passed", scope: "Ordinary real-model Project conversation, exact citation selection, reactive answer Workspace, readable reload, and discoverable Graph. A1 remains incomplete; this is construction evidence only.", verified_at: new Date().toISOString(), url, project_id: projectId, model: secondTurn.terminal.model, run_ids: [firstTurn.run_id, secondTurn.run_id], questions: [firstQuestion, followup], cited_record_label: recordLabel, graph_nodes: graphNodes, calls, browser_errors: browserErrors };
  await writeFile(resolve(root, "reports/FE-A1-COPILOT-CONSTRUCTION-BROWSER.json"), `${JSON.stringify(proof, null, 2)}\n`);
  process.stdout.write("Real copilot conversation and reactive Workspace browser checks passed.\n");
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) {
    const closed = new Promise((resolveClosed) => chrome.child.once("exit", resolveClosed));
    chrome.child.kill("SIGTERM");
    await closed;
  }
  rmSync(chrome.profile, { recursive: true, force: true });
}
