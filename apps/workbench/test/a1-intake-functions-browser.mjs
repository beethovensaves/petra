import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";
const root = resolve(import.meta.dirname, "../../..");
const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const question =
  "Synthetic A1 inspection: help me plan a neighborhood volunteer checklist for families, with a $500 budget and an indoor rain option. What consequential choices need clarification before I review a Project?";
const outcome =
  "Plan a neighborhood volunteer checklist for families, with a $500 budget and an indoor rain option.";
const chrome = await startChrome({ profilePrefix: "petra-a1-intake-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate } = cdp;
  const until = async (expression, label, timeout = 30000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise((resolveWait) => setTimeout(resolveWait, 200));
    }
    throw new Error(
      `Timed out waiting for ${label}: ${await evaluate("document.body.innerText")}`,
    );
  };
  const errors = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
  });
  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  await send("Page.navigate", { url: origin + "/" });
  await until(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).some(button=>button.textContent==='Start a new discussion')",
    "intake policy and normal chat",
  );
  await evaluate(
    "document.querySelector('.reference-intake-panel input[type=checkbox]').click()",
  );
  await until(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).some(button=>button.textContent==='Start a new discussion'&&!button.disabled)",
    "eligible actual intake model and acknowledged policy",
  );
  await evaluate(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).find(button=>button.textContent==='Start a new discussion').click()",
  );
  await until(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).some(button=>button.textContent==='Review a Project'&&!button.disabled)",
    "retained owner-only session",
  );
  const intakeId = await evaluate(
    "JSON.parse(sessionStorage.getItem('petra:intake:selected'))",
  );
  const setText = async (selector, value) =>
    evaluate(
      `(() => {const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
  await setText("#intake-question", question);
  await evaluate(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).find(button=>button.textContent==='Send').click()",
  );
  await until(
    "document.querySelector('[aria-label=\"Pre-Project answer\"]')!==null",
    "validated actual-model answer in Workspace",
    180000,
  );
  const initial = await evaluate(
    `fetch('/api/intake-sessions/${intakeId}',{headers:{authorization:'Bearer petra-local-development'}}).then(response=>response.json())`,
  );
  assert.equal(initial.turns.length, 1);
  assert.equal(initial.turns[0].question, question);
  assert.equal(initial.turns[0].terminal.state, "completed");
  assert(initial.turns[0].input_manifest);
  assert(initial.turns[0].terminal.provider_turn_id);
  assert(
    initial.turns[0].terminal.output.blocks.every(
      (block) => block.kind !== "source_report" && block.citations.length === 0,
    ),
  );
  await send("Page.reload");
  await until(
    "document.querySelector('.reference-intake-panel .copilot-transcript')?.textContent.includes('Synthetic A1 inspection')",
    "fresh browser restores original Q and A",
  );
  await evaluate(
    "Array.from(document.querySelectorAll('.reference-intake-panel button')).find(button=>button.textContent==='Review a Project').click()",
  );
  await until(
    "document.querySelector('.project-profile-command textarea')!==null",
    "exact outcome review in Workspace",
  );
  await setText(".project-profile-command textarea", outcome);
  await evaluate(
    "Array.from(document.querySelectorAll('.project-profile-command button')).find(button=>button.textContent==='Review Project').click()",
  );
  await until(
    "document.querySelector('.project-definition-review')?.textContent.includes('Assumptions')",
    "server-owned definition and capability review",
  );
  await evaluate(
    "document.querySelector('.project-profile-command__confirmation input').click()",
  );
  // Lose delivery only after the real creation response has committed. The
  // browser must read its binding before any retry; no command body is altered.
  await evaluate(
    `(() => {window.__a1CreationCalls=0;const original=window.fetch.bind(window);window.fetch=async(...args)=>{const response=await original(...args);const url=String(args[0] instanceof Request?args[0].url:args[0]);if(url.includes('/api/commands/projects/from-definition-draft')){window.__a1CreationCalls++;if(window.__a1CreationCalls===1){await response.text();throw new Error('Synthetic delivery interruption after creation committed.');}}return response;};})()`,
  );
  await evaluate(
    "Array.from(document.querySelectorAll('.project-profile-command button')).find(button=>button.textContent==='Create Project').click()",
  );
  await until(
    "document.querySelector('.project-profile-command__error')?.textContent.includes('Synthetic delivery interruption')",
    "unknown creation effect retained",
  );
  assert.equal(
    await evaluate(
      "JSON.parse(sessionStorage.getItem('petra:intake:creation:'+JSON.parse(sessionStorage.getItem('petra:intake:selected')))).schema_version",
    ),
    "1.1.0",
  );
  assert(
    await evaluate(
      "Array.from(document.querySelectorAll('.reference-intake-panel button')).find(button=>button.textContent==='Send').disabled",
    ),
  );
  await send("Page.reload");
  await until(
    "document.querySelector('.reference-intake-panel .copilot-transcript')?.textContent.includes('Synthetic A1 inspection')",
    "retained intake after lost creation response",
  );
  const bound = await evaluate(
    `fetch('/api/intake-sessions/${intakeId}',{headers:{authorization:'Bearer petra-local-development'}}).then(response=>response.json())`,
  );
  assert(bound.binding);
  assert.equal(bound.draft.content.request.outcome, outcome);
  assert.equal(bound.binding.content.original_turns.length, 1);
  // A committed binding exposes its exact Project even when the original
  // creation response was lost and no second creation command is sent.
  await evaluate(
    "Array.from(document.querySelectorAll('.reference-intake-panel a')).find(link=>link.textContent==='the created Project').click()",
  );
  await until(
    "document.querySelector('.copilot-intake-origin')!==null",
    "original discussion in the exact created Project",
  );
  const projectId = bound.binding.content.project_id;
  assert.equal(
    await evaluate("location.pathname"),
    `/projects/${projectId}/brief`,
  );
  await evaluate(
    "document.querySelector('.copilot-intake-origin summary').click()",
  );
  assert(
    await evaluate(
      "document.querySelector('.copilot-intake-origin').textContent.includes('Synthetic A1 inspection')",
    ),
  );
  await until(
    "document.querySelector('.copilot-conversation')?.dataset.readiness==='ready'",
    "eligible empty-Project copilot",
  );
  const current = await evaluate(
    `fetch('/api/projects/${projectId}/copilot',{headers:{authorization:'Bearer petra-local-development'}}).then(response=>response.json())`,
  );
  assert(
    current.context.records.some(
      (record) => record.kind === "pre_project_discussion",
    ),
  );
  assert(
    !current.context.records.some((record) => record.kind === "source_span"),
  );
  // The created Project starts a new scoped conversation, with the pre-creation
  // discussion admitted explicitly as advice rather than invented evidence.
  const followup =
    "Synthetic A1 inspection: which uncertainty in our original discussion remains unresolved? Do not invent source evidence or claim a completed task.";
  await setText("#copilot-question", followup);
  await evaluate(
    `document.querySelector('button[aria-label="Send message to Petra"]').click()`,
  );
  await until(
    "document.querySelector('.copilot-workspace-result')?.textContent.includes('which uncertainty in our original discussion')",
    "actual empty-Project answer and Workspace update",
    180000,
  );
  const continued = await evaluate(
    `fetch('/api/projects/${projectId}/copilot',{headers:{authorization:'Bearer petra-local-development'}}).then(response=>response.json())`,
  );
  assert.equal(continued.turns.length, 1);
  assert.equal(continued.turns[0].terminal.state, "completed");
  assert(continued.turns[0].input_manifest);
  assert(
    continued.turns[0].terminal.output.blocks.every(
      (block) => block.kind !== "source_report",
    ),
  );
  await send("Page.reload");
  await until(
    "document.querySelector('.copilot-transcript')?.textContent.includes('which uncertainty in our original discussion')",
    "retained Project continuation after reload",
  );
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    resolve(root, "reports/FE-A1-INTAKE-HANDOFF.png"),
    Buffer.from(screenshot.data, "base64"),
  );
  assert.deepEqual(errors, []);
  const certificate = JSON.parse(
    await readFile(
      resolve(
        root,
        "reports/model-certifications/codex-project-copilot-1.0.0.json",
      ),
      "utf8",
    ),
  );
  const proof = {
    status: "passed",
    verified_at: new Date().toISOString(),
    scope:
      "Production HTTP, PostgreSQL, official AG-UI, actual eligible managed model, browser intake Q&A, exact native definition review, atomic creation, lost response/reload, original discussion binding, empty-Project continuation and retained answers. This function proof is not complete A1 acceptance.",
    intake_session_id: intakeId,
    project_id: projectId,
    provider_model: certificate.provider_model,
    runtime: certificate.runtime,
    intake_turn: initial.turns[0],
    binding: bound.binding,
    created_project_turn: continued.turns[0],
    browser_errors: errors,
  };
  await writeFile(
    resolve(root, "reports/FE-A1-INTAKE-FUNCTION-BROWSER.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  process.stdout.write(
    "Intake, exact creation binding, lost response recovery and empty-Project continuation browser checks passed.\n",
  );
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) {
    const closed = new Promise((resolveClosed) =>
      chrome.child.once("exit", resolveClosed),
    );
    chrome.child.kill("SIGTERM");
    await closed;
  }
  rmSync(chrome.profile, { recursive: true, force: true });
}
