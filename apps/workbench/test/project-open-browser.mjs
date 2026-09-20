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
  process.env.PETRA_PROJECT_OPEN_BROWSER_OUTPUT ??
    "reports/WAVE6-PROJECT-OPEN-BROWSER.json",
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
  chrome = await startChrome({ profilePrefix: "petra-project-open-" });
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
  const until = async (expression, label = expression) => {
    for (let index = 0; index < 180; index += 1) {
      if (await evaluate(expression)) return;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    throw new Error(
      `Timed out waiting for ${label}\nRoute: ${await evaluate("window.projectOpenRouter?.state.location.pathname")}\nBody: ${await evaluate("document.body.innerText.slice(0, 6000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
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
  const selectedOpenLink = `(() => {
    const expected = window.projectOpenExpected;
    const card = [...document.querySelectorAll('.reference-project-card')]
      .find((candidate) => candidate.textContent.includes(expected.title));
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
    url: `http://127.0.0.1:${address.port}/test/project-open-browser.html`,
  });
  await until(`${selectedOpenLink} !== undefined`, "representative Open Brief");
  await evaluate("document.fonts.ready");

  const expected = await evaluate(
    "structuredClone(window.projectOpenExpected)",
  );
  const openHref = await evaluate(`${selectedOpenLink}.getAttribute('href')`);
  assert.equal(openHref, `/projects/${expected.projectId}/brief`);
  const collectionAccessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    collectionAccessibility.nodes.some(
      (node) => node.name?.value === "Open Brief",
    ),
    "the visible Open Brief control must be present in the accessibility tree",
  );

  await evaluate(`${selectedOpenLink}.focus()`);
  assert.equal(
    await evaluate(`document.activeElement === ${selectedOpenLink}`),
    true,
  );
  await pressEnter();
  const destination = `/projects/${expected.projectId}/brief`;
  await until(
    `window.projectOpenRouter.state.location.pathname === ${JSON.stringify(destination)} && document.querySelector('.live-project-brief h1')?.textContent === 'Brief'`,
    "exact Project Brief destination",
  );

  assert.equal(
    await evaluate(
      "document.querySelector('.reference-context-bar__identity strong')?.textContent",
    ),
    expected.title,
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.live-project-brief .reference-eyebrow')?.textContent",
    ),
    expected.title,
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(expected.objective),
  );
  const destinationCalls = await evaluate(
    "structuredClone(window.projectOpenCalls)",
  );
  const shellCalls = destinationCalls.filter((call) =>
    call.path.endsWith("/shell"),
  );
  const briefCalls = destinationCalls.filter((call) =>
    call.path.endsWith("/brief"),
  );
  const controlsCalls = destinationCalls.filter((call) =>
    call.path.endsWith("/effective-controls"),
  );
  assert.deepEqual(
    shellCalls.map((call) => call.path),
    [`/api/queries/projects/${expected.projectId}/shell`],
  );
  assert.deepEqual(
    briefCalls.map((call) => call.path),
    [`/api/queries/projects/${expected.projectId}/brief`],
  );
  assert.deepEqual(
    controlsCalls.map((call) => call.path),
    [`/api/queries/projects/${expected.projectId}/effective-controls`],
  );

  await evaluate("document.querySelector('.reference-context-back').focus()");
  assert.equal(
    await evaluate(
      "document.activeElement === document.querySelector('.reference-context-back')",
    ),
    true,
  );
  await pressEnter();
  await until(
    `window.projectOpenRouter.state.location.pathname === '/' && ${selectedOpenLink} !== undefined`,
    "return to the Project collection",
  );
  assert.equal(
    await evaluate(`${selectedOpenLink}.getAttribute('href')`),
    destination,
  );
  const calls = await evaluate("structuredClone(window.projectOpenCalls)");
  assert.equal(
    calls.filter((call) => call.path.startsWith("/api/queries/projects?"))
      .length,
    2,
  );
  assert.ok(
    calls.every(
      (call) =>
        call.authorization === "Bearer browser-project-open-token" &&
        !call.path.includes("project_01ARZ3NDEKTSV4RRFFQ69G5FAX/shell"),
    ),
  );
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name: "petra.wave6-project-open-browser-evidence",
    schema_version: "1.0.0",
    status: "passed",
    operation_id: "project.open",
    executed_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:project-open-ui",
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    verified: {
      visible_control: "Open Brief",
      keyboard_activation: true,
      collection_project_id: expected.projectId,
      destination,
      shell_project_id: expected.projectId,
      brief_project_id: expected.projectId,
      project_title: expected.title,
      current_objective: expected.objective,
      return_control: "Projects",
      returned_destination: "/",
      substituted_project: false,
      authenticated_requests: calls.every(
        (call) => call.authorization === "Bearer browser-project-open-token",
      ),
    },
    calls,
    boundary:
      "Isolated Chromium keyboard-activated the visible Open Brief control for one representative Project through the production React Router collection, Project shell, and Brief loaders, then returned through the visible Projects control with the same Project destination retained. Deterministic schema-valid authenticated HTTP supplied the browser transport; reports/WAVE6-PROJECT-OPEN-AUTHORITY.json separately proves the same collection and shell owner against real PostgreSQL and the production server. This operation record covers project.open only and does not claim a named Wave 6 evidence-plan scenario or the complete guided workflow.",
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
        chrome.profile.startsWith(join(tmpdir(), "petra-project-open-")),
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
