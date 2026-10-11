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
  "Synthetic A1 canonical-owner inspection: which information is missing before this volunteer checklist can be examined?",
  "Synthetic A1 canonical-owner inspection: which of those missing inputs should I clarify first, and why?",
];
const read = async () => {
  const response = await fetch(`${origin}/api/projects/${projectId}/copilot`, {
    headers: { authorization: "Bearer petra-local-development" },
  });
  assert.equal(response.status, 200);
  return response.json();
};
let before = await read();
assert(["ready", "required"].includes(before.authorization?.state));
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
const chrome = await startChrome({
  profilePrefix: "petra-a1-canonical-owners-",
});
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
    "document.getElementById('copilot-permission-consent')!==null || document.querySelector('.copilot-conversation')?.dataset.readiness === 'ready'",
    "eligible ordinary conversation",
  );
  let permissionReceipt;
  if (before.authorization?.state === "required") {
    await until(
      "document.getElementById('copilot-permission-consent')!==null",
      "explicit owner permission preview",
    );
    assert.equal(
      await evaluate(
        "document.querySelector('.copilot-compose-actions button')?.disabled",
      ),
      true,
    );
    await evaluate(
      "document.getElementById('copilot-permission-consent').click()",
    );
    const seen = [];
    cdp.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (
        message.method === "Network.responseReceived" &&
        message.params.response.url.endsWith("/copilot/authorize")
      )
        seen.push(message.params.requestId);
    });
    await evaluate(
      "document.getElementById('copilot-enable-conversation').click()",
    );
    await until(
      "document.querySelector('.copilot-conversation')?.dataset.readiness === 'ready'",
      "actual narrow conversation permission",
    );
    assert.equal(seen.length, 1);
    const body = await send("Network.getResponseBody", { requestId: seen[0] });
    permissionReceipt = JSON.parse(body.body);
    assert.deepEqual(permissionReceipt.content.grant.content.allowed_commands, [
      "RunProjectCopilot",
    ]);
    before = await read();
    assert.equal(before.authorization.state, "ready");
    assert.equal(before.availability.state, "ready");
  }
  let authorizedPage = before;
  for (;;) {
    assert(
      authorizedPage.turns.every((turn) =>
        turn.question.startsWith("Synthetic A1"),
      ),
      "Only the known disposable conversation may reach the evaluation provider.",
    );
    if (!authorizedPage.history_page.has_more) break;
    const response = await fetch(
      `${origin}/api/projects/${projectId}/copilot?cursor=${encodeURIComponent(authorizedPage.history_page.next_cursor)}`,
      { headers: { authorization: "Bearer petra-local-development" } },
    );
    assert.equal(response.status, 200);
    authorizedPage = await response.json();
  }
  const turns = [];
  const owners = [];
  const ownerViews = [];
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
    const owner = after.owners?.[turn.run_id];
    assert(owner);
    assert.equal(owner.capture, "native");
    assert.equal(owner.project_id, projectId);
    assert.equal(owner.protocol_run_id, turn.run_id);
    const views = await Promise.all(
      [
        `/threads/${owner.project_thread_ref.project_thread_id}`,
        `/work/${owner.work_unit_ref.work_unit_id}`,
      ].map(async (suffix) => {
        const response = await fetch(
          `${origin}/api/queries/projects/${projectId}${suffix}`,
          {
            headers: { authorization: "Bearer petra-local-development" },
          },
        );
        assert.equal(response.status, 200);
        // Consume each body as soon as its headers arrive. Holding a large
        // unread response while awaiting another header can pause Node's HTTP
        // parser before the local proxy closes the connection.
        return response.json();
      }),
    );
    assert.equal(views[0].schema_version, "1.1.0");
    assert.equal(views[0].content.view_kind, "detail");
    assert.equal(views[1].content.view_kind, "detail");
    owners.push(owner);
    ownerViews.push(views);
    await until(
      `Array.from(document.querySelectorAll('.copilot-message a')).some(link=>link.getAttribute('href')===${JSON.stringify(`/projects/${projectId}/work/${owner.work_unit_ref.work_unit_id}`)})`,
      "readable canonical task link",
    );
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
  for (const turn of turns) {
    const visible = await evaluate(
      `document.querySelector('.copilot-transcript').textContent`,
    );
    assert(visible.includes(turn.question));
    for (const block of turn.terminal.output.blocks)
      assert(visible.includes(block.text));
    for (const key of turn.terminal.output.blocks.flatMap(
      (block) => block.citations,
    )) {
      const record = turn.context.records.find((record) => record.key === key);
      assert(record);
      assert(visible.includes(record.label));
    }
  }
  const firstResponse = await fetch(
    `${origin}/api/projects/${projectId}/copilot?limit=1`,
    { headers: { authorization: "Bearer petra-local-development" } },
  );
  assert.equal(firstResponse.status, 200);
  const firstPage = await firstResponse.json();
  assert.equal(firstPage.history_page.returned_count, 1);
  assert(firstPage.history_page.has_more);
  const olderResponse = await fetch(
    `${origin}/api/projects/${projectId}/copilot?limit=1&cursor=${encodeURIComponent(firstPage.history_page.next_cursor)}`,
    { headers: { authorization: "Bearer petra-local-development" } },
  );
  assert.equal(olderResponse.status, 200);
  const olderPage = await olderResponse.json();
  assert.equal(
    olderPage.history_page.anchor_sequence,
    firstPage.history_page.anchor_sequence,
  );
  assert.equal(olderPage.turns.at(-1).run_id, turns[0].run_id);
  if (before.history_page.has_more) {
    const earliest = before.turns[0].question;
    await evaluate(
      "Array.from(document.querySelectorAll('.copilot-transcript button')).find(button=>button.textContent.includes('Load earlier')).click()",
    );
    await until(
      `document.querySelector('.copilot-transcript').textContent.includes(${JSON.stringify(earliest)})`,
      "earlier original questions after bounded paging",
    );
  }
  assert.deepEqual(errors, []);
  const screenshotPath = "reports/FE-A1-OWNED-CONVERSATION-BROWSER.png";
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    resolve(root, screenshotPath),
    Buffer.from(screenshot.data, "base64"),
  );
  const proof = {
    screenshot: screenshotPath,
    status: "passed",
    verified_at: new Date().toISOString(),
    scope:
      "Two actual managed-model advisory turns through production HTTP, PostgreSQL, official AG-UI and the browser; exact canonical Thread/Run/Work references, content Artifacts, normal owner queries, bounded history paging and fresh-document Q/A/citation/outcome restoration. No proposal command, native examiner or A1 product acceptance is inferred.",
    project_id: projectId,
    provider_model: turns[0].terminal.model,
    input_manifests: turns.map((turn) => turn.input_manifest),
    turns,
    owners,
    permission_receipt: permissionReceipt ?? null,
    owner_views: ownerViews,
    history_pages: [firstPage, olderPage],
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
          "apps/workbench/test/a1-owned-conversation-browser.mjs",
          "packages/core/src/conversation-authority.ts",
          "packages/postgres/src/canonical-copilot-ownership.ts",
          "packages/postgres/src/project-thread-authority-repository.ts",
          "packages/postgres/src/work-unit-authority-repository.ts",
          "infra/postgres/migrations/V066__canonical_copilot_conversation.sql",
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
    resolve(root, "reports/FE-A1-OWNED-CONVERSATION-BROWSER.json"),
    JSON.stringify(proof, null, 2) + "\n",
  );
  process.stdout.write(
    "Actual canonical conversation and fresh-browser restoration passed.\n",
  );
  process.stdout.write(
    JSON.stringify({
      artifact: "reports/FE-A1-OWNED-CONVERSATION-BROWSER.json",
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
