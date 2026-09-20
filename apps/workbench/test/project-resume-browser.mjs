// Isolated Chrome trace around production Project collection, shell, resume, Graph, and recovery UI.
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
const vite = await createViteServer({
  root: resolve(root, "apps/workbench"),
  configFile: false,
  appType: "spa",
  logLevel: "silent",
  plugins: [
    react(),
    {
      name: "project-resume-graph-fixture",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url !== "/__project-resume-graph-fixture") {
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
          "apps/workbench/test/project-resume-browser-adapters.ts",
        ),
      },
    ],
  },
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
await vite.listen();
const viteAddress = vite.httpServer?.address();
assert.ok(viteAddress !== null && typeof viteAddress === "object");
const workbenchUrl = `http://127.0.0.1:${viteAddress.port}`;
const chrome = await startChrome({
  profilePrefix: "petra-wave6-project-resume-",
});
const cdp = await createCdp(chrome.socketUrl);
const { socket, send, evaluate } = cdp;
const browserFailures = [];
socket.addEventListener("message", (event) => {
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
  for (let index = 0; index < 150; index += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(
    `Timed out waiting for ${label}\nRoute: ${await evaluate("window.resumeRouter?.state.location.pathname + window.resumeRouter?.state.location.search")}\nVite: ${await evaluate("document.querySelector('vite-error-overlay')?.shadowRoot?.textContent")}\nBody: ${await evaluate("document.body.innerText.slice(0, 6000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
  );
};
const exactLink = (text) =>
  `[...document.querySelectorAll('a')].find((element) => element.textContent.includes(${JSON.stringify(text)}))`;
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
const activateLink = async (text) => {
  const link = exactLink(text);
  await until(`${link} !== undefined`, `${text} link`);
  await evaluate(`${link}.focus()`);
  assert.equal(await evaluate(`document.activeElement === ${link}`), true);
  await pressEnter();
};
const returnToCollection = async (mode, marker) => {
  await evaluate(`window.setResumeMode(${JSON.stringify(mode)})`);
  await evaluate('window.resumeRouter.navigate("/")');
  await until(
    `document.body.innerText.includes(${JSON.stringify(marker)}) && document.querySelector('.reference-route-error') === null`,
    `${mode} Project collection`,
  );
};
const calls = async () => evaluate("structuredClone(window.resumeCalls)");
const graphCalls = (recorded) =>
  recorded.filter((call) => call.path.includes("/focused-graph"));

let failure;
let artifact;
try {
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
    url: new URL("/test/project-resume-browser.html", workbenchUrl).href,
  });
  await until(
    'document.body.innerText.includes("Retained task ready")',
    "available retained task in the Project collection",
  );
  await evaluate("document.fonts.ready");

  const availableCollectionText = await evaluate("document.body.innerText");
  for (const value of [
    "Resume Project",
    "Retained task ready",
    "Which retained relationship should I inspect next?",
  ]) {
    assert.ok(
      availableCollectionText.includes(value),
      `available collection omitted ${value}`,
    );
  }
  await activateLink("Resume Project");
  await until(
    'document.querySelector(".focused-graph-resume[data-resume-state=available]") !== null',
    "exact retained Graph task",
  );
  assert.equal(
    await evaluate("window.resumeRouter.state.location.pathname"),
    `/projects/project_01ARZ3NDEKTSV4RRFFQ69G5FAW/resume`,
  );
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    "relationship:assertion-a",
  );
  const availableBody = await evaluate("document.body.innerText");
  for (const value of [
    "Resumed exact task",
    "Opened from Brief",
    "1 retained relationship selection",
    "Which retained relationship should I inspect next?",
    "Return to Brief",
  ]) {
    assert.ok(availableBody.includes(value), `resumed Graph omitted ${value}`);
  }
  const availableCalls = await calls();
  assert.equal(graphCalls(availableCalls).length, 1);
  assert.deepEqual(
    graphCalls(availableCalls)[0].body,
    await evaluate("structuredClone(window.resumeExpectedRequest)"),
    "the production loader must submit the exact server-retained request",
  );

  await returnToCollection("stale", "Brief recovery");
  await activateLink("Open Brief recovery");
  await until(
    'document.querySelector(".project-resume-outcome[data-resume-state=stale]") !== null',
    "stale resume Brief recovery",
  );
  await evaluate(
    'document.querySelector(".project-resume-outcome details summary").focus()',
  );
  await pressEnter();
  await until(
    'document.querySelector(".project-resume-outcome details").open',
    "stale retained context disclosure",
  );
  const staleBody = await evaluate("document.body.innerText");
  for (const value of [
    "The retained task belongs to an archived Project.",
    "Review the current Brief before continuing",
    "Which retained relationship should I inspect next?",
    "Continue in current Brief",
  ]) {
    assert.ok(staleBody.includes(value), `stale recovery omitted ${value}`);
  }
  const staleCalls = await calls();
  assert.equal(graphCalls(staleCalls).length, 0);

  await returnToCollection("not_found", "Brief recovery");
  await activateLink("Open Brief recovery");
  await until(
    'document.querySelector(".project-resume-outcome[data-resume-state=not_found]") !== null',
    "not-found resume Brief recovery",
  );
  const notFoundBody = await evaluate("document.body.innerText");
  for (const value of [
    "No retained task is available",
    "This Project has no retained task to resume.",
    "Continue in current Brief",
  ]) {
    assert.ok(
      notFoundBody.includes(value),
      `not-found recovery omitted ${value}`,
    );
  }
  const notFoundCalls = await calls();
  assert.equal(graphCalls(notFoundCalls).length, 0);

  await returnToCollection("unavailable", "Resume read unavailable");
  await activateLink("Retry Resume");
  await until(
    'document.querySelector(".project-resume-outcome[data-resume-state=unavailable]") !== null',
    "unavailable resume context and retry",
  );
  const unavailableBody = await evaluate("document.body.innerText");
  for (const value of [
    "Resume is temporarily unavailable",
    "The retained task could not be verified from its immutable Project records.",
    "Retry Project resume",
    "do not reconstruct task identity in the client",
  ]) {
    assert.ok(
      unavailableBody.includes(value),
      `unavailable recovery omitted ${value}`,
    );
  }
  const unavailableCalls = await calls();
  assert.equal(graphCalls(unavailableCalls).length, 0);

  await evaluate('window.setResumeMode("available")');
  await activateLink("Retry Project resume");
  await until(
    'document.querySelector(".focused-graph-resume[data-resume-state=available]") !== null',
    "successful retry of the exact retained task",
  );
  assert.equal(
    await evaluate(
      'document.querySelector(".focused-graph-exploration__selection select").value',
    ),
    "relationship:assertion-a",
  );
  const retryCalls = await calls();
  assert.equal(graphCalls(retryCalls).length, 1);
  assert.deepEqual(
    graphCalls(retryCalls)[0].body,
    await evaluate("structuredClone(window.resumeExpectedRequest)"),
  );
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name: "petra.wave6-project-resume-browser-observation",
    schema_version: "1.0.0",
    status: "passed",
    recorded_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:project-resume-ui",
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    route_transport:
      "Production React Router loaders and controls with deterministic typed HTTP responses in isolated Chrome.",
    checks: [
      "Project collection renders the server-owned resume state and visible Resume Project control",
      "keyboard activation opens the exact retained task through project-shell-view@1.2.0",
      "retained task, origin, focus, selection, destination, and request reach the Graph unchanged",
      "stale archived state follows the server-returned Brief recovery while preserving retained context",
      "not-found state follows the server-returned Brief recovery without inventing a task",
      "unavailable state preserves Project context and exposes the returned retry",
      "retry repeats the authorized read and opens the exact retained task without client-generated identity",
    ],
    observations: {
      available_calls: availableCalls,
      stale_calls: staleCalls,
      not_found_calls: notFoundCalls,
      unavailable_calls: unavailableCalls,
      retry_calls: retryCalls,
      retained_selection: "relationship:assertion-a",
    },
    boundary: {
      browser:
        "Isolated headless Chrome executed the production Project collection, shell, resume, Graph, Brief recovery, and retry controls.",
      transport:
        "The harness supplied deterministic schema-shaped HTTP responses around production loaders; it did not claim a live server or PostgreSQL trace.",
      authority:
        "The UI reused project-shell-view@1.2.0 identities and recovery and never derived a replacement request from labels or model prose.",
      scope:
        "This operation record covers project.resume only; it does not claim a complete guided workflow or a named Wave 6 evidence-plan scenario.",
    },
  };
  writeFileSync(
    resolve(root, "reports/WAVE6-PROJECT-RESUME-BROWSER.json"),
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  console.log(JSON.stringify(artifact, null, 2));
} catch (error) {
  failure = error;
} finally {
  try {
    if (socket.readyState === WebSocket.OPEN) {
      await Promise.race([
        send("Browser.close").catch(() => undefined),
        new Promise((resolveClose) => setTimeout(resolveClose, 2_000)),
      ]);
    }
  } finally {
    socket.close();
    if (chrome.child.exitCode === null) chrome.child.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) =>
        chrome.child.addListener("close", resolveExit),
      ),
      new Promise((resolveExit) => setTimeout(resolveExit, 5_000)),
    ]);
    if (chrome.child.exitCode === null) chrome.child.kill("SIGKILL");
    await vite.close();
    assert.ok(
      chrome.profile.startsWith(join(tmpdir(), "petra-wave6-project-resume-")),
    );
    rmSync(chrome.profile, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
}

if (failure !== undefined) throw failure;
assert.equal(artifact?.status, "passed");
