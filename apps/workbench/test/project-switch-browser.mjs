import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";

import { focusedGraphFixture } from "../../../packages/contracts/test/fixtures/focused-graph-view.ts";
import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "../../..");
const graphFixture = focusedGraphFixture();
const output = resolve(
  root,
  process.env.PETRA_PROJECT_SWITCH_BROWSER_OUTPUT ??
    "reports/WAVE6-PROJECT-SWITCH-BROWSER.json",
);
const vite = await createViteServer({
  root: resolve(root, "apps/workbench"),
  configFile: false,
  appType: "spa",
  logLevel: "silent",
  plugins: [
    react(),
    {
      name: "project-switch-graph-fixture",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url !== "/__project-switch-graph-fixture") {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify(graphFixture));
        });
      },
    },
  ],
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
      {
        find: /^@petra\/adapters$/u,
        replacement: resolve(
          root,
          "apps/workbench/test/project-switch-browser-adapters.ts",
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
  chrome = await startChrome({ profilePrefix: "petra-project-switch-" });
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
  const route =
    "window.projectSwitchRouter?.state.location.pathname + window.projectSwitchRouter?.state.location.search + window.projectSwitchRouter?.state.location.hash";
  const until = async (expression, label = expression) => {
    for (let index = 0; index < 180; index += 1) {
      if (await evaluate(expression)) return;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    throw new Error(
      `Timed out waiting for ${label}\nRoute: ${await evaluate(route)}\nErrors: ${await evaluate("JSON.stringify(window.projectSwitchRouter?.state.errors, Object.getOwnPropertyNames(Error.prototype))")}\nCalls: ${await evaluate("JSON.stringify(window.projectSwitchCalls)")}\nBody: ${await evaluate("document.body.innerText.slice(0, 6000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
    );
  };
  const pressEnter = async () => {
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
      text: "\r",
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13,
    });
  };
  const activate = async (expression, label) => {
    await until(`${expression} !== undefined && ${expression} !== null`, label);
    await evaluate(`${expression}.focus()`);
    assert.equal(
      await evaluate(`document.activeElement === ${expression}`),
      true,
    );
    await pressEnter();
  };
  const exactLink = (text) =>
    `[...document.querySelectorAll('a')].find((element) => element.textContent.trim() === ${JSON.stringify(text)})`;
  const targetOpenLink = `(() => {
    const expected = window.projectSwitchExpected;
    const card = [...document.querySelectorAll('.reference-project-card')]
      .find((candidate) => candidate.textContent.includes(expected.targetTitle));
    return [...(card?.querySelectorAll('a') ?? [])]
      .find((candidate) => candidate.textContent.trim() === 'Open Brief');
  })()`;

  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Accessibility.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  await send("Page.navigate", {
    url: `http://127.0.0.1:${address.port}/test/project-switch-browser.html`,
  });
  await until(
    "document.querySelector('.focused-graph-resume[data-resume-state=available]') !== null && document.activeElement?.id === 'focused-graph-active-selection'",
    "prior retained Graph task and exact focus",
  );
  await evaluate("document.fonts.ready");

  const expected = await evaluate(
    "structuredClone(window.projectSwitchExpected)",
  );
  assert.equal(await evaluate(route), expected.priorRoute);
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-context-bar__identity strong')?.textContent",
    ),
    expected.priorTitle,
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes("Resumed exact task"),
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#focused-graph-active-selection').value",
    ),
    expected.retainedSelection,
  );

  await activate(exactLink("← Projects"), "Projects switch control");
  await until(
    "document.querySelector('#project-switch-title')?.textContent.includes('Choose another Project')",
    "Project switch explanation",
  );
  const switchText = await evaluate(
    "document.querySelector('.reference-project-switch')?.innerText",
  );
  for (const phrase of [
    "without stopping prior Work",
    "does not cancel or replace Work",
    "Unsubmitted fields, local selection, browser focus, and local presentation history are not transferred",
    "Return to prior task",
  ]) {
    assert.ok(
      switchText.includes(phrase),
      `switch explanation omitted ${phrase}`,
    );
  }

  const collectionAccessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    collectionAccessibility.nodes.some(
      (node) => node.name?.value === "Return to prior task",
    ),
    "the exact return control must be present in the accessibility tree",
  );
  await activate(targetOpenLink, "target Project Open Brief");
  const targetRoute = `/projects/${expected.targetProjectId}/brief`;
  await until(
    `${route} === ${JSON.stringify(targetRoute)} && document.querySelector('.reference-context-bar__identity strong')?.textContent === ${JSON.stringify(expected.targetTitle)} && document.querySelector('.live-project-brief h1')?.textContent === 'Brief'`,
    "target Project server-owned Brief",
  );
  const returnLabel = `Return to ${expected.priorTitle}`;
  assert.ok((await evaluate("document.body.innerText")).includes(returnLabel));

  const callsAtTarget = await evaluate(
    "structuredClone(window.projectSwitchCalls)",
  );
  assert.ok(
    callsAtTarget.some(
      (call) =>
        call.path === `/api/queries/projects/${expected.targetProjectId}/shell`,
    ),
  );
  assert.ok(
    callsAtTarget.every(
      (call) =>
        !call.path.startsWith("/api/commands/") &&
        call.authorization === "Bearer browser-project-switch-token",
    ),
    "switch navigation must not issue a command or lose authentication",
  );

  await activate(exactLink(returnLabel), "exact prior task return");
  await until(
    `${route} === ${JSON.stringify(expected.priorRoute)} && document.activeElement?.id === 'focused-graph-active-selection'`,
    "exact prior retained task route and focus",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-context-bar__identity strong')?.textContent",
    ),
    expected.priorTitle,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('#focused-graph-active-selection').value",
    ),
    expected.retainedSelection,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.focused-graph-exploration')?.dataset.historyCount",
    ),
    "1",
  );
  assert.deepEqual(browserFailures, []);

  const calls = await evaluate("structuredClone(window.projectSwitchCalls)");
  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name: "petra.wave6-project-switch-browser-evidence",
    schema_version: "1.0.0",
    status: "passed",
    operation_id: "project.switch",
    executed_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/Cellar/node@24/24.20.0/bin:$PATH npm run test:wave6:project-switch-ui",
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    verified: {
      visible_switch_control: "Projects",
      switch_explanation: true,
      prior_project_id: expected.priorProjectId,
      prior_route: expected.priorRoute,
      prior_focus_target: "focused-graph-active-selection",
      retained_task: "Which retained relationship should I inspect next?",
      retained_selection: expected.retainedSelection,
      target_project_id: expected.targetProjectId,
      target_route: targetRoute,
      target_shell_title: expected.targetTitle,
      target_was_different: true,
      substituted_project: false,
      command_requests_during_switch: calls.filter((call) =>
        call.path.startsWith("/api/commands/"),
      ).length,
      exact_return_control: returnLabel,
      returned_route: expected.priorRoute,
      returned_focus_target: "focused-graph-active-selection",
      local_draft_disposition:
        "no local draft entered; the UI explicitly disclosed that unsubmitted fields are not transferred",
      local_selection_disposition:
        "server-retained selection reloaded; the UI explicitly disclosed that local selection is not transferred",
      local_presentation_history_disposition:
        "no local history entry created; the UI explicitly disclosed that local presentation history is not transferred",
      prior_work_disposition:
        "no browser command issued; separately proven unchanged by the PostgreSQL authority artifact",
    },
    calls,
    boundary:
      "Isolated Chromium keyboard-activated the production Project shell's visible Projects control from an exact server-retained Graph task, read the switch-state explanation, opened a different exact collection member through the production React Router collection and server-owned shell at its Brief route, and used the visible exact-return control to reload the prior retained task, server-retained selection, route, and focus. The target Brief body is trace-only orientation; reports/WAVE6-PROJECT-SWITCH-AUTHORITY.json separately proves the server-owned target Brief fallback and, against real PostgreSQL, that the prior retained task and running Work remain unchanged. No local draft, selection change, or local history entry was created; the visible disclosure explains that those browser-local states are not transferred. Deterministic schema-shaped authenticated HTTP supplied browser transport, and the browser issued no cancellation or other command. This operation record covers project.switch only and does not claim a named Wave 6 evidence-plan scenario.",
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
        chrome.profile.startsWith(join(tmpdir(), "petra-project-switch-")),
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
