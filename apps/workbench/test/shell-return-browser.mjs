import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { format } from "prettier";
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
  process.env.PETRA_SHELL_RETURN_BROWSER_OUTPUT ??
    "reports/WAVE6-SHELL-RETURN-BROWSER.json",
);
const vite = await createViteServer({
  root: resolve(root, "apps/workbench"),
  configFile: false,
  appType: "spa",
  logLevel: "silent",
  plugins: [
    react(),
    {
      name: "shell-return-graph-fixture",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url !== "/__shell-return-graph-fixture") {
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
  chrome = await startChrome({ profilePrefix: "petra-shell-return-" });
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
        message.params.args?.map(
          (argument) =>
            argument.value ?? argument.description ?? argument.preview,
        ),
      );
    }
    if (message.method === "Runtime.exceptionThrown") {
      browserFailures.push(message.params?.exceptionDetails);
    }
  });
  const route =
    "window.shellReturnRouter?.state.location.pathname + window.shellReturnRouter?.state.location.search + window.shellReturnRouter?.state.location.hash";
  const until = async (expression, label = expression) => {
    for (let index = 0; index < 180; index += 1) {
      if (await evaluate(expression)) return;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    throw new Error(
      `Timed out waiting for ${label}\nRoute: ${await evaluate(route)}\nErrors: ${await evaluate("JSON.stringify(Object.fromEntries(Object.entries(window.shellReturnRouter?.state.errors ?? {}).map(([key, error]) => [key, { name: error?.name, message: error?.message, stack: error?.stack, data: error?.data, status: error?.status, statusText: error?.statusText }])))")}\nCalls: ${await evaluate("JSON.stringify(window.shellReturnCalls)")}\nBody: ${await evaluate("document.body.innerText.slice(0, 6000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
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
  const contextualGraphLink = `[...document.querySelectorAll('a')].find(
    (element) => element.textContent.trim().startsWith("Inspect bounded current relationships for"),
  )`;

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
    url: `http://127.0.0.1:${address.port}/test/shell-return-browser.html`,
  });
  await until(
    `document.querySelector(".live-project-brief") !== null && ${contextualGraphLink} !== undefined`,
    "contextual Brief result",
  );
  await evaluate("document.fonts.ready");

  const projectTitle = await evaluate(
    "document.querySelector('.reference-context-bar__identity strong')?.textContent",
  );
  const graphHref = await evaluate(
    `${contextualGraphLink}.getAttribute("href")`,
  );
  const entry = new URL(graphHref, `http://127.0.0.1:${address.port}`);
  const projectId = entry.pathname.split("/")[2];
  assert.ok(projectId);
  const returnPath = entry.searchParams.get("returnPath");
  const returnFocus = entry.searchParams.get("returnFocus");
  assert.equal(entry.searchParams.get("origin"), "brief");
  assert.equal(entry.searchParams.get("returnDestinationState"), "available");
  assert.equal(
    entry.searchParams.get("returnDestinationOwner"),
    "project_brief_view",
  );
  assert.match(returnFocus ?? "", /^brief-result-[0-9]+$/u);
  assert.equal(returnPath, `/projects/${projectId}/brief#${returnFocus}`);

  await activate(contextualGraphLink, "contextual Graph entry control");
  await until(
    `document.querySelector(".focused-graph-exploration") !== null && document.querySelector(".reference-project-main")?.dataset.place === "graph"`,
    "focused Graph subordinate surface",
  );
  const calls = await evaluate("structuredClone(window.shellReturnCalls)");
  const focusedCall = [...calls]
    .reverse()
    .find(
      (call) => call.method === "POST" && call.path.endsWith("/focused-graph"),
    );
  assert.ok(focusedCall);
  const binding = await evaluate(
    "structuredClone(window.shellReturnServerBinding)",
  );
  assert.equal(binding.project_id, projectId);
  assert.equal(binding.task.request_id, focusedCall.body.request_id);
  assert.equal(binding.task.origin.origin_kind, "brief");
  assert.deepEqual(binding.task.focus_refs, [focusedCall.body.focus_ref]);
  assert.equal(
    binding.task.return_destination_key,
    focusedCall.body.return_destination.destination_key,
  );
  assert.deepEqual(
    binding.return_destination,
    focusedCall.body.return_destination,
  );
  assert.equal(binding.return_action.action_kind, "return_to_origin");
  assert.deepEqual(binding.return_action.availability, {
    state: "available",
    destination_key: binding.return_destination.destination_key,
  });

  const selectedKey = await evaluate(`(() => {
    const control = document.querySelector("#focused-graph-active-selection");
    const relationship = [...control.options].find((option) =>
      option.value.startsWith("relationship:"),
    );
    control.focus();
    control.value = relationship.value;
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return relationship.value;
  })()`);
  await until(
    `document.querySelector("#focused-graph-active-selection")?.value === ${JSON.stringify(selectedKey)}`,
    "exact visible Graph selection",
  );
  assert.equal(
    await evaluate(
      `${exactLink("Return to Brief result")}.getAttribute("href")`,
    ),
    returnPath,
  );
  const accessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    accessibility.nodes.some(
      (node) => node.name?.value === "Return to Brief result",
    ),
  );

  await activate(
    exactLink("Return to Brief result"),
    "visible Return to origin control",
  );
  await until(
    `${route} === ${JSON.stringify(returnPath)} && document.querySelector(".reference-project-main")?.dataset.place === "brief" && document.activeElement?.id === ${JSON.stringify(returnFocus)}`,
    "exact Brief result route and focus",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-context-bar__identity strong')?.textContent",
    ),
    projectTitle,
  );
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name: "petra.wave6-shell-return-browser-evidence",
    schema_version: "1.0.0",
    status: "passed",
    operation_id: "shell.return",
    executed_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:shell-return-ui",
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    verified: {
      visible_entry_control:
        "Inspect bounded current relationships for this Claim",
      visible_return_control: "Return to Brief result",
      keyboard_activation: true,
      project_id: projectId,
      project_title: projectTitle,
      originating_task_route: `/projects/${projectId}/brief`,
      result_selection: returnFocus,
      graph_route: entry.pathname,
      graph_selection_before_return: selectedKey,
      server_task: binding.task,
      server_return_destination: binding.return_destination,
      server_return_action: binding.return_action,
      returned_route: returnPath,
      returned_focus_target: returnFocus,
    },
    calls,
    boundary:
      "Isolated Chromium keyboard-entered the production focused Graph from a contextual ProjectBriefSurface result, changed the production FocusedGraphExploration selection, and keyboard-activated the visible server-gated Return to Brief result control. Production React Router and ProjectShell restored the exact Project, Brief route, result hash, and focused result heading. Deterministic schema-shaped authenticated HTTP supplied ProjectShell, Brief, effective-controls, and focused-graph data; this browser record does not claim live server transport, persistence, every originating surface, shell.navigate, focus preservation beyond the exercised path, UX1.6-GRAPH/task-graph-details-return, or any named Wave 6 evidence-plan scenario.",
  };
  writeFileSync(
    output,
    await format(JSON.stringify(artifact), { parser: "json" }),
  );
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
        chrome.profile.startsWith(join(tmpdir(), "petra-shell-return-")),
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
