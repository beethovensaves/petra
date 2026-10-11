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
const question =
  "Synthetic A1 progressive-disclosure inspection: provide three separate advisory blocks: first identify missing inputs, then suggest a bounded next examination, then ask one clarifying question. Do not treat advice as a verified claim.";
const headers = { authorization: "Bearer petra-local-development" };
const read = async () => {
  const response = await fetch(`${origin}/api/projects/${projectId}/copilot`, {
    headers,
  });
  assert.equal(response.status, 200);
  return response.json();
};
const before = await read();
assert.equal(before.authorization.state, "ready");
assert.equal(before.availability.state, "ready");
assert(before.turns.every((turn) => turn.question.startsWith("Synthetic A1")));
assert(
  before.context.records.every((record) =>
    ["pre_project_discussion", "project-examination-scene"].includes(
      record.kind,
    ),
  ),
  "Only the disposable Project with no private source material may reach the provider.",
);
const chrome = await startChrome({ profilePrefix: "petra-a1-progressive-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate } = cdp;
  const requests = [],
    errors = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (
      message.method === "Network.requestWillBeSent" &&
      message.params.request.url.endsWith("/copilot/run")
    )
      requests.push(message.params.request);
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
  const until = async (expression, label, timeout = 180000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
      `Browser did not reach ${label}: ${await evaluate("document.body.innerText.slice(-3500)")}`,
    );
  };
  await send("Page.navigate", { url: `${origin}/projects/${projectId}/brief` });
  await until(
    "document.querySelector('.copilot-conversation')?.dataset.readiness==='ready'",
    "ordinary conversation readiness",
  );
  await evaluate(`(() => {
    window.__a1Progress=[];
    const observe=()=>{
      const node=document.querySelector('[data-copilot-phase]'); if(!node)return;
      const item={phase:node.dataset.copilotPhase,run:node.dataset.runId,blocks:Array.from(node.querySelectorAll('[data-disclosed-block]')).map(block=>({index:Number(block.dataset.disclosedBlock),text:block.textContent}))};
      const previous=window.__a1Progress.at(-1);
      if(JSON.stringify(previous)!==JSON.stringify(item))window.__a1Progress.push(item);
    };
    window.__a1ProgressObserver=new MutationObserver(observe);
    window.__a1ProgressObserver.observe(document.querySelector('.reference-agent-panel'),{childList:true,subtree:true,attributes:true});
    const input=document.getElementById('copilot-question'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(question)}); input.dispatchEvent(new Event('input',{bubbles:true}));
  })()`);
  await until(
    "document.querySelector('.copilot-compose-actions button')?.disabled===false",
    "eligible send",
  );
  await evaluate(
    "document.querySelector('.copilot-compose-area form').requestSubmit()",
  );
  await until(
    "document.querySelector('[data-copilot-phase]')?.dataset.copilotPhase==='completed'",
    "validated terminal activity",
  );
  await until(
    `document.querySelector('.copilot-workspace-result h2')?.textContent===${JSON.stringify(question)}`,
    "exact retained answer in Workspace",
  );
  const after = await read(),
    turn = after.turns.at(-1),
    owner = after.owners[turn.run_id];
  assert.equal(turn.question, question);
  assert.equal(turn.terminal.state, "completed");
  assert(turn.terminal.provider_turn_id);
  assert(turn.terminal.provider_thread_id);
  assert.equal(owner.capture, "native");
  assert.equal(owner.project_id, projectId);
  const observations = await evaluate("window.__a1Progress");
  assert(
    observations.some(
      (item) => item.phase === "running" && item.run === turn.run_id,
    ),
  );
  const disclosures = observations.filter(
    (item) => item.phase === "disclosing" && item.run === turn.run_id,
  );
  assert(
    disclosures.length >= 2,
    "More than one validated block must visibly arrive before the terminal.",
  );
  assert.deepEqual(
    disclosures.map((item) => item.blocks.length),
    turn.terminal.output.blocks.map((_, index) => index + 1),
  );
  for (const item of disclosures)
    for (const block of item.blocks)
      assert.equal(block.text, turn.terminal.output.blocks[block.index].text);
  assert.equal(
    requests.length,
    1,
    "One official SDK request submits this question.",
  );
  const request = JSON.parse(requests[0].postData);
  assert.equal(request.runId, turn.run_id);
  assert.equal(request.threadId, turn.thread_id);
  assert.deepEqual(request.tools, []);
  const workPath = `/projects/${projectId}/work/${owner.work_unit_ref.work_unit_id}`;
  assert(
    await evaluate(
      `Array.from(document.querySelectorAll('.copilot-live-activity a')).some(link=>link.getAttribute('href')===${JSON.stringify(workPath)})`,
    ),
  );
  const response = await fetch(`${origin}/api/queries${workPath}`, { headers });
  assert.equal(response.status, 200);
  const work = await response.json();
  assert.equal(work.content.view_kind, "detail");
  assert.equal(
    after.context.basis.event_position,
    before.context.basis.event_position,
    "Advisory disclosure applies no Project command.",
  );
  assert.equal(errors.length, 0);
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(
    resolve(root, "reports/FE-A1-PROGRESSIVE-COPILOT-BROWSER.png"),
    Buffer.from(screenshot.data, "base64"),
  );
  await writeFile(
    resolve(root, "reports/FE-A1-PROGRESSIVE-COPILOT-BROWSER.json"),
    JSON.stringify(
      {
        checked_at: new Date().toISOString(),
        project_id: projectId,
        run_id: turn.run_id,
        actual_model: turn.terminal.model,
        provider_turn_id: turn.terminal.provider_turn_id,
        owner,
        observations,
        sdk_requests: requests.length,
        sdk_input: request,
        authority_effect: "none",
        boundary:
          "Actual managed model, production authenticated API, canonical owner read, official SDK and visibly disclosed retained answer blocks. This does not establish command mediation, native examiner or cyclic verification completion.",
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "Actual managed-model progressive disclosure and canonical Work inspection passed.\n",
  );
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) {
    const closed = new Promise((resolve) => chrome.child.once("exit", resolve));
    chrome.child.kill("SIGTERM");
    await closed;
  }
  rmSync(chrome.profile, { recursive: true, force: true });
}
