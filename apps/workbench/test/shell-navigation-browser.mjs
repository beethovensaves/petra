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
  process.env.PETRA_SHELL_NAVIGATION_BROWSER_OUTPUT ??
    "reports/WAVE6-SHELL-NAVIGATION-BROWSER.json",
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
  chrome = await startChrome({ profilePrefix: "petra-shell-navigation-" });
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
  const route = "window.shellNavigationRouter?.state.location.pathname";
  const until = async (expression, label = expression) => {
    for (let index = 0; index < 180; index += 1) {
      if (await evaluate(expression)) return;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    throw new Error(
      `Timed out waiting for ${label}\nRoute: ${await evaluate(route)}\nBody: ${await evaluate("document.body.innerText.slice(0, 6000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
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
  const navLink = (label) => `(() => {
    const nav = document.querySelector('.reference-project-nav nav');
    return [...(nav?.querySelectorAll('a') ?? [])].find(
      (candidate) => candidate.querySelector('span')?.textContent.trim() === ${JSON.stringify(label)},
    );
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
    url: `http://127.0.0.1:${address.port}/test/shell-navigation-browser.html`,
  });
  await until(
    `${route}?.endsWith('/brief') && document.querySelector('.shell-navigation-trace') !== null`,
    "opened representative Project shell",
  );
  await evaluate("document.fonts.ready");

  const expected = await evaluate(
    "structuredClone(window.shellNavigationExpected)",
  );
  const navAccessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    navAccessibility.nodes.some(
      (node) => node.name?.value === `${expected.projectTitle} places`,
    ),
    "the named Project-place navigation must be present in the accessibility tree",
  );
  for (const target of expected.navigation) {
    assert.ok(
      navAccessibility.nodes.some((node) =>
        node.name?.value?.startsWith(target.label),
      ),
      `${target.label} must be present in the accessibility tree`,
    );
    assert.equal(
      await evaluate(`${navLink(target.label)}?.getAttribute('href')`),
      `/projects/${expected.projectId}/${target.route}`,
    );
  }

  const contexts = [];
  for (const target of expected.navigation) {
    const expression = navLink(target.label);
    await evaluate(`${expression}.focus()`);
    assert.equal(
      await evaluate(`document.activeElement === ${expression}`),
      true,
      `${target.label} did not receive keyboard focus`,
    );
    await pressEnter();
    const destination = `/projects/${expected.projectId}/${target.route}`;
    await until(
      `${route} === ${JSON.stringify(destination)} && document.querySelector('.reference-project-main')?.dataset.place === ${JSON.stringify(target.place)} && document.querySelector('.shell-navigation-trace')?.dataset.tracePlace === ${JSON.stringify(target.place)} && ${navLink(target.label)}?.getAttribute('aria-current') === 'page'`,
      `${target.label} route and current-place state`,
    );

    const context = await evaluate(`(() => {
      const trace = document.querySelector('.shell-navigation-trace');
      const objective = trace?.querySelector('[data-objective-id]');
      const profile = document.querySelector('.reference-context-bar__identity a[href$="/profile"]');
      const snapshot = document.querySelector('.reference-context-bar__state > span:first-child');
      const projection = document.querySelector('.reference-context-bar__state .reference-status');
      return {
        route: window.shellNavigationRouter.state.location.pathname,
        currentPlace: document.querySelector('.reference-project-main')?.dataset.place,
        tracePlace: trace?.dataset.tracePlace,
        projectId: trace?.dataset.projectId,
        projectTitle: document.querySelector('.reference-context-bar__identity strong')?.textContent,
        definitionId: trace?.dataset.definitionId,
        profileLabel: profile?.textContent,
        profileHref: profile?.getAttribute('href'),
        objectiveId: objective?.dataset.objectiveId,
        objective: objective?.textContent?.trim(),
        snapshot: snapshot?.querySelector('strong')?.textContent,
        projection: projection?.lastChild?.textContent?.trim(),
        activeLabel: document.querySelector('.reference-project-nav nav a[aria-current="page"] > span:first-child')?.textContent,
      };
    })()`);
    assert.deepEqual(context, {
      route: destination,
      currentPlace: target.place,
      tracePlace: target.place,
      projectId: expected.projectId,
      projectTitle: expected.projectTitle,
      definitionId: expected.definitionId,
      profileLabel: expected.profileLabel,
      profileHref: `/projects/${expected.projectId}/profile`,
      objectiveId: expected.objectiveId,
      objective: expected.objective,
      snapshot: expected.snapshotLabel,
      projection: expected.projectionLabel,
      activeLabel: target.label,
    });
    contexts.push(context);
  }

  const calls = await evaluate("structuredClone(window.shellNavigationCalls)");
  assert.deepEqual(calls, [
    {
      method: "GET",
      path: `/api/queries/projects/${expected.projectId}/shell`,
      authorization: "Bearer browser-shell-navigation-token",
    },
  ]);
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name: "petra.wave6-shell-navigation-browser-evidence",
    schema_version: "1.0.0",
    status: "passed",
    operation_id: "shell.navigate",
    executed_at: new Date().toISOString(),
    command:
      "PATH=/opt/homebrew/opt/node@24/bin:$PATH npm run test:wave6:shell-navigation-ui",
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    verified: {
      visible_control: "Project navigation",
      keyboard_activation: true,
      project_id: expected.projectId,
      project_title: expected.projectTitle,
      registered_profile: {
        project_definition_id: expected.definitionId,
        label: expected.profileLabel,
      },
      current_objective: {
        objective_id: expected.objectiveId,
        statement: expected.objective,
      },
      snapshot: expected.snapshotLabel,
      projection: expected.projectionLabel,
      visited_places: contexts.map(({ route, currentPlace, activeLabel }) => ({
        route,
        current_place: currentPlace,
        active_control: activeLabel,
      })),
      shell_reads: calls.length,
      authenticated_requests: true,
      command_requests: 0,
      context_stable: true,
    },
    calls,
    boundary:
      "Isolated Chromium opened one representative Project through the production loadProjectRecord and ProjectShellClient path, then keyboard-activated every visible persistent Project workflow navigation control in the production ProjectShell. At each destination the React Router path, shell current-place state, active control, exact Project, registered ProjectDefinition label, current Objective, authority snapshot, and projection label remained coherent. Deterministic schema-valid authenticated HTTP supplied the browser transport; reports/WAVE6-SHELL-NAVIGATION-AUTHORITY.json separately proves the same ProjectShellClient owner and context against real PostgreSQL and the production server. The child route body is a trace-only context observer, so this record proves shell.navigate only: it does not prove any destination task surface, shell.return, exact return or focus preservation, UX1.6-GRAPH, a named evidence-plan scenario, or the complete guided workflow.",
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
        chrome.profile.startsWith(join(tmpdir(), "petra-shell-navigation-")),
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
