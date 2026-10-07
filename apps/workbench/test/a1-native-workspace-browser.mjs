import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { createCdp, startChrome } from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "../../..");
const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const scientific = "project_01ARZ3NDEKTSV4RRFFQ69G5FAW";
const writing = "project_01K4E000000000000000000001";
const chrome = await startChrome({ profilePrefix: "petra-a1-native-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  const failures = [];
  cdp.socket.addEventListener("message", (event) => { const message = JSON.parse(event.data); if (message.method === "Runtime.exceptionThrown") failures.push(message.params.exceptionDetails.text); });
  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })]);
  await send("Page.navigate", { url: `${origin}/projects/${scientific}/graph` });
  await until("document.querySelectorAll('[data-node-id]').length > 0 && document.querySelector('.copilot-conversation')?.dataset.readiness === 'ready'", "native graph and copilot");
  const scienceNodes = await evaluate("document.querySelectorAll('[data-node-id]').length");
  assert(scienceNodes >= 7);
  await evaluate("document.querySelectorAll('[data-node-id]')[0].dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  await until("document.querySelector('.native-material-examiner')!==null", "explicit scientific object selection");
  assert(await evaluate("document.querySelector('.native-material-examiner').textContent.includes('The study reports') || document.querySelector('.native-material-examiner').textContent.includes('candidate')"));
  await evaluate("document.querySelectorAll('[data-node-id]')[1].dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  await until("document.querySelector('.copilot-context-chip')?.textContent.startsWith('About:')", "graph selection in next-turn context");
  await evaluate("Array.from(document.querySelectorAll('.semantic-graph-toolbar button')).find(button=>button.textContent==='Objects and relationships').click()");
  assert.equal(await evaluate("document.querySelectorAll('.semantic-graph-scene ol > li').length"), scienceNodes);
  assert(await evaluate("document.querySelectorAll('.semantic-graph-scene ul > li').length > 0"));
  await evaluate("(() => { const input=document.getElementById('copilot-question'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Keep this unsent question while I examine the graph.'); input.dispatchEvent(new Event('input',{bubbles:true})); })()");
  await until("document.getElementById('copilot-question').value.includes('Keep this unsent')", "unsent draft");
  await evaluate("Array.from(document.querySelectorAll('.reference-workspace-destinations a')).find(link=>link.textContent==='Overview').click()");
  await until("location.pathname.endsWith('/brief')", "return to outcome");
  assert(await evaluate("document.getElementById('copilot-question').value.includes('Keep this unsent')"));
  await until("document.querySelector('.copilot-transcript')?.textContent.includes('Which uncertainty in your answer')", "readable retained real-model turns");
  await evaluate("document.querySelector('.copilot-open-answer').click()");
  await until("document.querySelector('.copilot-workspace-result') !== null", "retained answer in Workspace");
  await evaluate("document.querySelector('.copilot-citations button').click()");
  await until("document.querySelector('.copilot-workspace-result')?.getAttribute('aria-label') === 'Evidence selected in conversation'", "citation in Workspace");
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(resolve(root, "reports/FE-A1-COPILOT-CONSTRUCTION.png"), Buffer.from(screenshot.data, "base64"));
  await send("Page.navigate", { url: `${origin}/projects/${writing}/graph` });
  await until("document.querySelectorAll('[data-node-id]').length === 2", "native writing graph");
  await evaluate("document.querySelectorAll('[data-node-id]')[0].dispatchEvent(new MouseEvent('click',{bubbles:true}))");
  await until("document.querySelector('.native-material-examiner h2')?.textContent === 'Requirement'", "native writing examiner");
  const writingNodes = await evaluate("document.querySelectorAll('[data-node-id]').length");
  assert.equal(writingNodes, 2);
  assert(await evaluate("document.querySelector('.native-material-examiner').textContent.includes('operating procedure')"));
  assert.deepEqual(failures, []);
  const proof = { status: "passed", verified_at: new Date().toISOString(), scope: "Read-only production browser proof of native scientific and writing graphs, exact material examiner, complete textual peer, explicit next-turn graph context, retained readable real-model turns, citation-to-Workspace selection, and preserved unsent draft. No new model calls or authority mutations were made. A1 remains incomplete.", scientific_nodes: scienceNodes, writing_nodes: writingNodes, browser_errors: failures };
  await writeFile(resolve(root, "reports/FE-A1-NATIVE-WORKSPACE-BROWSER.json"), `${JSON.stringify(proof, null, 2)}\n`);
  process.stdout.write("Native graph and reactive Workspace read-only browser checks passed.\n");
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) { const closed = new Promise((resolveClosed) => chrome.child.once("exit", resolveClosed)); chrome.child.kill("SIGTERM"); await closed; }
  rmSync(chrome.profile, { recursive: true, force: true });
}
