import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";
const root = resolve(import.meta.dirname, "../../..");
const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const retained = JSON.parse(
  await readFile(
    resolve(root, "reports/FE-A1-INTAKE-FUNCTION-BROWSER.json"),
    "utf8",
  ),
);
const projectId = retained.project_id;
const questions = [
  "Synthetic A1 model-route inspection: which information is missing before this volunteer checklist can be examined?",
  "Synthetic A1 model-route inspection: which of those missing inputs should I clarify first, and why?",
];
const read = async () => {
  const response = await fetch(`${origin}/api/projects/${projectId}/copilot`, {
    headers: { authorization: "Bearer petra-local-development" },
  });
  assert.equal(response.status, 200);
  return response.json();
};
const before = await read();
assert.equal(before.availability.state, "ready");
const workingReadinessResponse = await fetch(
  `${origin}/api/projects/${projectId}/copilot/working-plan`,
  { headers: { authorization: "Bearer petra-local-development" } },
);
assert.equal(workingReadinessResponse.status, 200);
const workingReadiness = await workingReadinessResponse.json();
assert.equal(workingReadiness.role, "petra.copilot-working-plan@1.0.0");
assert.equal(workingReadiness.availability.state, "ready");
assert.equal(workingReadiness.invocation.state, "owner_required");
assert.equal(
  before.context.objective_statement,
  "Plan a neighborhood volunteer checklist for families, with a $500 budget and an indoor rain option.",
);
assert(
  before.turns.every((turn) => turn.question.startsWith("Synthetic A1")),
  "Only the retained disposable test conversation may be sent to the evaluation provider.",
);
assert(
  before.context.records.every((record) =>
    [
      "pre_project_discussion",
      "project-examination-scene",
      "project-definition-context",
      "project-inquiry-context",
      "project-work-context",
    ].includes(record.kind),
  ),
  "The test Project must contain no private source bytes.",
);
const chrome = await startChrome({ profilePrefix: "petra-a1-model-routes-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate } = cdp;
  const errors = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
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
      await new Promise((next) => setTimeout(next, 200));
    }
    throw new Error(
      `The browser did not reach ${label}: ${await evaluate("document.body.innerText.slice(-3500)")}`,
    );
  };
  await send("Page.navigate", { url: `${origin}/projects/${projectId}/brief` });
  await until(
    "document.querySelector('.copilot-conversation')?.dataset.readiness === 'ready'",
    "eligible ordinary conversation",
  );
  const turns = [];
  for (const question of questions) {
    await evaluate(
      `(() => { const input=document.getElementById('copilot-question'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(question)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`,
    );
    await until(
      "document.querySelector('.copilot-compose-actions button')?.disabled === false",
      "eligible send",
    );
    await evaluate(
      "document.querySelector('.copilot-compose-area form').requestSubmit()",
    );
    await until(
      `document.querySelector('.copilot-workspace-result h2')?.textContent === ${JSON.stringify(question)}`,
      "retained actual-model answer",
    );
    const after = await read();
    const turn = after.turns.at(-1);
    assert.equal(turn.question, question);
    assert.equal(turn.terminal.state, "completed");
    assert(turn.terminal.provider_turn_id);
    assert(turn.input_manifest);
    assert.equal(turn.context.project_id, projectId);
    assert.equal(
      after.context.basis.event_position,
      before.context.basis.event_position,
    );
    assert(
      turn.terminal.output.blocks.every(
        (block) => block.kind !== "source_report",
      ),
    );
    if (turns.length) {
      assert.equal(turn.parent_run_id, turns[0].run_id);
      assert(
        turn.input_manifest,
        "The follow-up must retain its actual bounded input manifest.",
      );
    }
    turns.push(turn);
  }
  const reloadMarker = `conversation-reload-${Date.now()}`;
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `window.__a1ConversationReload=${JSON.stringify(reloadMarker)}`,
  });
  await send("Page.reload");
  await until(
    `window.__a1ConversationReload === ${JSON.stringify(reloadMarker)}`,
    "a genuinely new document after reload",
  );
  await until(
    `document.querySelector('.copilot-transcript')?.textContent.includes(${JSON.stringify(questions[1])})`,
    "actual Q and A after reload",
  );
  assert(
    await evaluate(
      `document.querySelector('.copilot-transcript').textContent.includes(${JSON.stringify(questions[0])})`,
    ),
  );
  assert.deepEqual(errors, []);
  const proof = {
    status: "passed",
    verified_at: new Date().toISOString(),
    scope:
      "Two actual managed-model turns through the production HTTP service, PostgreSQL persistence, official AG-UI client and browser; followed by durable readable reload. This does not establish canonical owner integration or A1 product acceptance.",
    project_id: projectId,
    provider_model: turns[0].terminal.model,
    input_manifests: turns.map((turn) => turn.input_manifest),
    turns,
    browser_errors: errors,
    working_role_readiness: workingReadiness,
    source_fingerprints: Object.fromEntries(
      await Promise.all(
        [
          "apps/server/src/project-copilot.ts",
          "apps/server/src/project-copilot-model.ts",
          "apps/server/src/project-copilot-routes.ts",
          "packages/postgres/src/project-copilot-repository.ts",
          "packages/core/src/project-copilot.ts",
          "packages/adapters/src/project-copilot-ag-ui.ts",
          "apps/workbench/src/product/ProjectCopilotConversation.tsx",
          "apps/workbench/src/product/CopilotWorkspace.tsx",
          "apps/workbench/test/a1-conversation-model-browser.mjs",
        ].map(async (path) => [
          path,
          `sha256:${createHash("sha256")
            .update(await readFile(resolve(root, path)))
            .digest("hex")}`,
        ]),
      ),
    ),
  };
  await writeFile(
    resolve(root, "reports/FE-A1-CONVERSATION-MODEL-BROWSER.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  process.stdout.write(
    "Actual application question and distinct follow-up passed.\n",
  );
  process.stdout.write(
    JSON.stringify({
      artifact: "reports/FE-A1-CONVERSATION-MODEL-BROWSER.json",
      provider_model: proof.provider_model,
      provider_turn_ids: turns.map((turn) => turn.terminal.provider_turn_id),
      source_fingerprints: proof.source_fingerprints,
    }) + "\n",
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
