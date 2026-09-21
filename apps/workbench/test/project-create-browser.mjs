import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";

import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "../../..");
const output = resolve(
  root,
  process.env.PETRA_PROJECT_CREATE_BROWSER_OUTPUT ??
    "reports/WAVE6-PROJECT-CREATE-BROWSER.json",
);
const vite = await createViteServer({
  root: resolve(root, "apps/workbench"),
  configFile: false,
  appType: "spa",
  logLevel: "silent",
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@petra/contracts/validator",
        replacement: resolve(
          root,
          "apps/workbench/src/product/browser-contract-registry.ts",
        ),
      },
      {
        find: /^@petra\/core$/u,
        replacement: resolve(
          root,
          "apps/workbench/test/wave5-browser-core-shim.ts",
        ),
      },
    ],
  },
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});

let chrome;
let cdp;
let failure;
let artifact;
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  assert.ok(address !== null && typeof address === "object");
  chrome = await startChrome({ profilePrefix: "petra-project-create-" });
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate } = cdp;
  const browserFailures = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (
      message.method === "Runtime.consoleAPICalled" &&
      ["error", "assert"].includes(message.params?.type)
    ) {
      browserFailures.push(
        message.params.args?.map((argument) => argument.value),
      );
    }
    if (message.method === "Runtime.exceptionThrown") {
      browserFailures.push(message.params?.exceptionDetails);
    }
  });
  const route = "window.projectCreateRouter?.state.location.pathname";
  const until = async (expression, label = expression) => {
    for (let index = 0; index < 180; index += 1) {
      if (await evaluate(expression)) return;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    throw new Error(
      `Timed out waiting for ${label}\nRoute: ${await evaluate(route)}\nCalls: ${await evaluate("JSON.stringify(window.projectCreateCalls)")}\nBody: ${await evaluate("document.body.innerText.slice(0, 8000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
    );
  };
  const button = (text) =>
    `[...document.querySelectorAll('button')].find((element) => element.textContent.trim() === ${JSON.stringify(text)})`;
  const press = async (key, code, text = "") => {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      windowsVirtualKeyCode: key === "Enter" ? 13 : 32,
      text,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode: key === "Enter" ? 13 : 32,
    });
  };
  const activate = async (expression, label, key = "Enter") => {
    await until(`${expression} !== undefined && ${expression} !== null`, label);
    await evaluate(`${expression}.focus()`);
    assert.equal(
      await evaluate(`document.activeElement === ${expression}`),
      true,
    );
    await press(
      key,
      key === "Enter" ? "Enter" : "Space",
      key === "Enter" ? "\r" : " ",
    );
  };
  const enterText = async (expression, value, label) => {
    await until(`${expression} !== undefined && ${expression} !== null`, label);
    await evaluate(`${expression}.focus()`);
    await send("Input.insertText", { text: value });
    assert.equal(await evaluate(`${expression}.value`), value);
  };

  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Accessibility.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  await send("Page.navigate", {
    url: `http://127.0.0.1:${address.port}/test/project-create-browser.html`,
  });
  await until(`${button("New Project")} !== undefined`, "New Project control");
  await evaluate("document.fonts.ready");

  const expected = await evaluate(
    "structuredClone(window.projectCreateExpected)",
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(
      expected.unrelatedProjectTitle,
    ),
    "the unrelated Project must be available before creation",
  );
  await activate(button("New Project"), "New Project control");
  await until(
    'document.querySelector("#new-project-title")?.textContent === "Create a Project"',
    "Project creation panel",
  );

  const profileCard =
    "document.querySelector('[data-family=\"petra.scientific-evidence\"]')";
  await activate(
    `${profileCard}.querySelector('input[name=project-profile]')`,
    "registered scientific profile choice",
    " ",
  );
  await activate(
    `${profileCard}.querySelector('summary')`,
    "registered profile inspection",
  );
  await until(
    `${profileCard}.querySelector('details').open === true`,
    "expanded exact profile taxonomy",
  );
  const profileText = await evaluate(`${profileCard}.innerText`);
  for (const phrase of [
    "Scientific evidence inquiry",
    "Terms used in this Project",
    "Research questions",
    "Relationship meanings",
    "Model roles",
    "Unavailable operations",
  ]) {
    assert.ok(
      profileText.includes(phrase),
      `profile inspection omitted ${phrase}`,
    );
  }

  await enterText(
    'document.querySelector(".project-profile-command__fields input")',
    expected.projectName,
    "Project name",
  );
  await enterText(
    'document.querySelectorAll(".project-profile-command__fields textarea")[1]',
    expected.firstFocus,
    "first focus",
  );
  assert.equal(
    await evaluate(`${button("Create Project")}.getAttribute('aria-disabled')`),
    null,
  );
  await activate(button("Create Project"), "Project create submission");
  await until(
    'document.body.innerText.includes("Project not created.") && document.body.innerText.includes("Recover Project")',
    "unresolved Project response",
  );
  assert.equal(await evaluate("window.projectCreateState.commandAttempts"), 1);
  assert.equal(await evaluate("window.projectCreateState.effectCount"), 0);

  await activate(button("Recover Project"), "Project recovery assessment");
  await until(
    'document.body.innerText.includes("Outcome still unknown") && document.body.innerText.includes("Retry exact command")',
    "unknown-effect assessment",
  );
  const recoveryText = await evaluate(
    "document.querySelector('.project-recovery')?.innerText",
  );
  for (const phrase of [
    "Exact request",
    "Client session",
    "Safe return",
    "Return to Projects",
    "execution rechecks current authority",
  ]) {
    assert.ok(recoveryText.includes(phrase), `recovery omitted ${phrase}`);
  }

  await activate(button("Retry exact command"), "exact idempotent retry");
  await until(
    `${route} === '/projects/' + window.projectCreateState.resultingProjectId + '/brief' && document.querySelector('.live-project-brief h1')?.textContent === 'Brief'`,
    "receipt-bound Project Brief",
  );
  const resultingProjectId = await evaluate(
    "window.projectCreateState.resultingProjectId",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-context-bar__identity strong')?.textContent",
    ),
    expected.projectName,
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(expected.firstFocus),
  );
  assert.equal(
    await evaluate(
      "document.querySelector('[data-created-project-id]')?.dataset.createdProjectId",
    ),
    resultingProjectId,
  );
  assert.equal(await evaluate("window.projectCreateState.commandAttempts"), 2);
  assert.equal(await evaluate("window.projectCreateState.effectCount"), 1);

  await activate(
    "document.querySelector('.reference-context-back')",
    "return to Projects",
  );
  await until(
    `${route} === '/' && document.body.innerText.includes(${JSON.stringify(expected.unrelatedProjectTitle)})`,
    "unrelated Project after creation",
  );

  const calls = await evaluate("structuredClone(window.projectCreateCalls)");
  const commandCalls = calls.filter(
    (call) => call.path === "/api/commands/projects",
  );
  const recoveryCalls = calls.filter(
    (call) => call.path === "/api/queries/project-profile-command-recovery",
  );
  assert.equal(commandCalls.length, 2);
  assert.equal(recoveryCalls.length, 1);
  assert.deepEqual(commandCalls[1].body, commandCalls[0].body);
  assert.deepEqual(recoveryCalls[0].body, commandCalls[0].body);
  assert.deepEqual(commandCalls[0].body.profile_ref, {
    profile_id: expected.selectedProfileId,
    profile_version: expected.selectedProfileVersion,
    content_hash: expected.selectedProfileHash,
  });
  assert.deepEqual(commandCalls[0].body.project, {
    name: expected.projectName,
  });
  assert.deepEqual(commandCalls[0].body.objective, {
    statement: expected.firstFocus,
  });
  assert.ok(
    calls.every(
      (call) => call.authorization === "Bearer browser-project-create-token",
    ),
  );

  const accessibility = await send("Accessibility.getFullAXTree");
  for (const name of ["New Project", "Scientific evidence inquiry"]) {
    assert.ok(
      accessibility.nodes.some((node) => node.name?.value === name),
      `${name} must remain in the accessibility tree`,
    );
  }
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name: "petra.wave6-project-create-browser-evidence",
    schema_version: "1.0.0",
    status: "passed",
    operation_ids: ["project.create", "project.recover"],
    executed_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:project-create-ui",
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    verified: {
      visible_control: "New Project",
      selected_profile: {
        profile_id: expected.selectedProfileId,
        profile_version: expected.selectedProfileVersion,
        content_hash: expected.selectedProfileHash,
      },
      profile_inspection: true,
      project_name: expected.projectName,
      first_focus: expected.firstFocus,
      initial_submit_count: 1,
      recovery_assessment_count: recoveryCalls.length,
      recovery_state: "outcome_unknown",
      retry_reused_exact_request: true,
      command_attempt_count: commandCalls.length,
      material_effect_count: 1,
      resulting_project_id: resultingProjectId,
      receipt_bound_destination: `/projects/${resultingProjectId}/brief`,
      resulting_project_context: expected.projectName,
      resulting_brief_focus: expected.firstFocus,
      unrelated_project_id: expected.unrelatedProjectId,
      unrelated_project_available_after_creation: true,
      authenticated_requests: true,
    },
    calls,
    boundary:
      "Isolated Chromium keyboard-activated the production Project collection's visible New Project control, selected and expanded one exact registered profile, entered a Project name and first focus, submitted once, assessed an unresolved response through the visible Recover Project control, reused the exact command and idempotency identities through Retry exact command, loaded the receipt-bound Project shell at its Brief destination, and returned to a collection that still exposed the unrelated Project. Deterministic schema-valid authenticated HTTP supplied browser transport; reports/WAVE6-PROJECT-CREATE-AUTHORITY.json separately proves the same ProjectProfileClient create/recovery and ProjectShellClient owners against real PostgreSQL and the production HTTP server, including canonical persistence and no duplicate effect. This operation record covers project.create and project.recover only and does not claim a named Wave 6 evidence-plan scenario or the complete guided workflow.",
  };
  writeFileSync(output, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
} catch (error) {
  failure = error;
} finally {
  try {
    if (cdp?.socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        cdp.send("Browser.close").catch(() => undefined),
        new Promise((resolveClose) => setTimeout(resolveClose, 2_000)),
      ]);
    }
  } finally {
    cdp?.socket.close();
    if (chrome?.child.exitCode === null) chrome.child.kill("SIGTERM");
    if (chrome !== undefined) {
      await Promise.race([
        new Promise((resolveExit) =>
          chrome.child.addListener("close", resolveExit),
        ),
        new Promise((resolveExit) => setTimeout(resolveExit, 5_000)),
      ]);
      if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
      assert.ok(
        chrome.profile.startsWith(join(tmpdir(), "petra-project-create-")),
      );
      rmSync(chrome.profile, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
    await vite.close();
  }
}

if (failure !== undefined) throw failure;
assert.equal(artifact?.status, "passed");
