// Isolated Chrome trace around the production retained-Project import UI.
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
  profilePrefix: "petra-wave6-project-import-",
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
    `Timed out waiting for ${label}\nRoute: ${await evaluate("window.importRouter?.state.location.pathname")}\nVite: ${await evaluate("document.querySelector('vite-error-overlay')?.shadowRoot?.textContent")}\nBody: ${await evaluate("document.body.innerText.slice(0, 6000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
  );
};
const button = (text) =>
  `[...document.querySelectorAll('button')].find((element) => element.textContent.includes(${JSON.stringify(text)}))`;
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
const calls = async () => evaluate("structuredClone(window.importCalls)");
const operationCalls = (recorded, path) =>
  recorded.filter((call) => call.path === path);

const prepareImport = async (nextMode) => {
  await evaluate(`window.setImportMode(${JSON.stringify(nextMode)})`);
  await evaluate(
    'window.importRouter.navigate("/projects/project_01K6P000000000000000000802/brief")',
  );
  await until(
    'window.importRouter.state.location.pathname === "/projects/project_01K6P000000000000000000802/brief"',
    "intermediate Project route",
  );
  await evaluate('window.importRouter.navigate("/")');
  await until(
    `${button("Import Project")} !== undefined`,
    "Import Project control",
  );
  await activate(button("Import Project"), "Import Project control");
  await until(
    'document.body.innerText.includes("Import a retained Project")',
    "retained Project import panel",
  );
  await activate(
    'document.querySelector("input[name=project-import-source]")',
    "retained Project source choice",
    " ",
  );
  await until(
    'document.body.innerText.includes("One bounded copy into a new Project")',
    "reviewed admission",
  );
  await activate(
    'document.querySelector(".project-profile-command__confirmation input")',
    "reviewed admission confirmation",
    " ",
  );
  assert.equal(
    await evaluate(
      `${button("Import as new Project")}.getAttribute("aria-disabled")`,
    ),
    null,
  );
};

let failure;
let artifact;
try {
  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Accessibility.enable"),
    send("Emulation.setDeviceMetricsOverride", {
      width: 1100,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    }),
  ]);
  await send("Page.navigate", {
    url: new URL("/test/project-import-browser.html", workbenchUrl).href,
  });
  await until(
    'document.body.innerText.includes("Choose where to continue")',
    "Project collection",
  );
  await evaluate("document.fonts.ready");

  await prepareImport("success");
  const reviewText = await evaluate("document.body.innerText");
  for (const value of [
    "Project revision 1",
    "Project definition revision",
    "Focused objective revision",
    "Project identity and History",
    "Sources, Work, and Reviews",
    "preserves the original Project without modification",
  ]) {
    assert.ok(reviewText.includes(value), `admission review omitted ${value}`);
  }
  await activate(button("Import as new Project"), "reviewed import command");
  await until(
    'document.body.innerText.includes("Derived Project ready")',
    "retained import outcome",
  );
  const successText = await evaluate("document.body.innerText");
  for (const value of [
    "Copied into the new Project",
    "Stays with the original Project",
    "Original History",
    "Original Sources",
    "Only the exact definition and focused objective are copied.",
  ]) {
    assert.ok(successText.includes(value), `import outcome omitted ${value}`);
  }
  const successCalls = await calls();
  assert.equal(
    operationCalls(successCalls, "/api/commands/projects/import").length,
    1,
  );
  assert.equal(
    operationCalls(
      successCalls,
      "/api/queries/projects/project_01K6P000000000000000000802/import-ancestry",
    ).length,
    1,
  );
  const successRequest = operationCalls(
    successCalls,
    "/api/commands/projects/import",
  )[0].body;
  assert.equal(
    successRequest.source.project_id,
    "project_01ARZ3NDEKTSV4RRFFQ69G5FAW",
  );
  assert.equal(successRequest.source.project_revision, 1);
  assert.equal(
    successRequest.admission.copy_scope,
    "definition_and_focused_objective",
  );
  assert.equal(
    successRequest.admission.source_effect,
    "preserve_without_modification",
  );
  await activate(
    button("Open derived Project Brief"),
    "exact derived Brief return",
  );
  await until(
    'window.importRouter.state.location.pathname === "/projects/project_01K6P000000000000000000802/brief"',
    "derived Project Brief",
  );

  await prepareImport("unknown");
  await activate(button("Import as new Project"), "uncertain import command");
  await until(
    'document.body.innerText.includes("Import outcome not confirmed")',
    "uncertain import failure",
  );
  await activate(button("Check import effect"), "import recovery read");
  await until(
    'document.body.innerText.includes("Import outcome still unknown")',
    "unknown import effect",
  );
  assert.equal(
    await evaluate('document.body.innerText.includes("Derived Project ready")'),
    false,
  );
  const unknownBeforeRetry = await calls();
  const unknownCommandsBefore = operationCalls(
    unknownBeforeRetry,
    "/api/commands/projects/import",
  );
  const unknownRecoveries = operationCalls(
    unknownBeforeRetry,
    "/api/queries/project-import-command-recovery",
  );
  assert.equal(unknownCommandsBefore.length, 1);
  assert.equal(unknownRecoveries.length, 1);
  assert.deepEqual(unknownRecoveries[0].body, unknownCommandsBefore[0].body);
  await activate(button("Retry exact import"), "exact idempotent import retry");
  await until(
    'document.body.innerText.includes("Derived Project ready")',
    "confirmed retried import",
  );
  const unknownCalls = await calls();
  const unknownCommands = operationCalls(
    unknownCalls,
    "/api/commands/projects/import",
  );
  assert.equal(unknownCommands.length, 2);
  assert.deepEqual(unknownCommands[1].body, unknownCommands[0].body);
  assert.equal(
    operationCalls(
      unknownCalls,
      "/api/queries/projects/project_01K6P000000000000000000802/import-ancestry",
    ).length,
    1,
  );

  await prepareImport("conflict");
  await activate(button("Import as new Project"), "conflicting import command");
  await until(
    'document.body.innerText.includes("Import outcome not confirmed")',
    "conflicting import failure",
  );
  await activate(button("Check import effect"), "conflicting recovery read");
  await until(
    'document.body.innerText.includes("Import cannot be verified")',
    "conflicting import identity",
  );
  const conflictText = await evaluate("document.body.innerText");
  assert.ok(conflictText.includes("will not expose another request or retry"));
  assert.ok(conflictText.includes("Return to Projects"));
  assert.equal(
    await evaluate(`${button("Retry exact import")} === undefined`),
    true,
  );
  assert.equal(
    await evaluate('document.body.innerText.includes("Derived Project ready")'),
    false,
  );
  const conflictCalls = await calls();
  assert.equal(
    operationCalls(conflictCalls, "/api/commands/projects/import").length,
    1,
  );
  assert.equal(
    operationCalls(
      conflictCalls,
      "/api/queries/project-import-command-recovery",
    ).length,
    1,
  );
  assert.equal(
    operationCalls(
      conflictCalls,
      "/api/queries/projects/project_01K6P000000000000000000802/import-ancestry",
    ).length,
    0,
  );
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name: "petra.wave6-project-import-browser-observation",
    schema_version: "1.0.0",
    status: "passed",
    recorded_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:project-import-ui",
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    route_transport:
      "Production Project collection and import controls with deterministic schema-valid HTTP responses in isolated Chrome.",
    checks: [
      "keyboard operation selects one exact server-owned Project, definition, and focused-objective binding",
      "reviewed admission names the bounded copied and retained-only scope before command availability",
      "successful import invokes the production command and verifies the retained ancestry read before showing success",
      "copied material, retained-only material, limitations, and exact derived Brief return remain visible",
      "unknown outcome keeps the exact request, performs read-only recovery, and reuses command and idempotency identities for retry",
      "conflicting identity exposes no retry, no derived destination, and no false success",
    ],
    observations: {
      success_calls: successCalls,
      unknown_calls: unknownCalls,
      conflict_calls: conflictCalls,
      exact_destination: `/projects/project_01K6P000000000000000000802/brief`,
    },
    boundary: {
      browser:
        "Isolated headless Chrome executed the production Project collection and retained-Project import controls.",
      transport:
        "The harness supplied deterministic schema-valid HTTP responses; backend PostgreSQL command ownership is proven by the exact counterpart commit and is not re-claimed here.",
      authority:
        "The UI submitted only the exact Project shell binding and explicit reviewed admission, then required matching retained ancestry before success.",
      scope:
        "This operation record covers project.import only; it does not claim the complete source lifecycle or any named Wave 6 evidence-plan scenario.",
    },
  };
  writeFileSync(
    resolve(root, "reports/WAVE6-PROJECT-IMPORT-BROWSER.json"),
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
      chrome.profile.startsWith(join(tmpdir(), "petra-wave6-project-import-")),
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
