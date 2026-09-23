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
const screenshotOutput = process.env.PETRA_SHELL_NAVIGATION_SCREENSHOT_OUTPUT;
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
  const desktopFrame = await evaluate(`(() => {
    const layout = document.querySelector('.reference-project-layout');
    const agent = document.querySelector('.reference-agent-panel');
    const workspace = document.querySelector('.reference-workspace-panel');
    const layoutRect = layout?.getBoundingClientRect();
    const agentRect = agent?.getBoundingClientRect();
    const workspaceRect = workspace?.getBoundingClientRect();
    return {
      agentLabel: agent?.getAttribute('aria-labelledby'),
      agentTitle: document.querySelector('#project-agent-title')?.textContent,
      workspaceLabel: workspace?.getAttribute('aria-labelledby'),
      workspaceTitle: document.querySelector('#project-workspace-title')?.textContent,
      agentRatio:
        layoutRect && agentRect ? agentRect.width / layoutRect.width : 0,
      workspaceRatio:
        layoutRect && workspaceRect ? workspaceRect.width / layoutRect.width : 0,
      primaryAction: document.querySelector('.reference-agent-action span')?.textContent?.trim(),
      inspectionOpen: document.querySelector('.reference-project-inspection')?.hasAttribute('open'),
      guideVisible: document.body.innerText.includes('Test guide'),
    };
  })()`);
  assert.equal(desktopFrame.agentLabel, "project-agent-title");
  assert.equal(desktopFrame.agentTitle, "Petra");
  assert.equal(desktopFrame.workspaceLabel, "project-workspace-title");
  assert.equal(desktopFrame.workspaceTitle, "Overview");
  assert.ok(desktopFrame.agentRatio >= 0.29 && desktopFrame.agentRatio <= 0.31);
  assert.ok(
    desktopFrame.workspaceRatio >= 0.69 && desktopFrame.workspaceRatio <= 0.71,
  );
  assert.equal(desktopFrame.primaryAction, "Work with Petra");
  assert.equal(desktopFrame.inspectionOpen, false);
  assert.equal(desktopFrame.guideVisible, false);
  if (screenshotOutput !== undefined) {
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    writeFileSync(resolve(root, screenshotOutput), screenshot.data, "base64");
  }
  await evaluate(
    "document.querySelector('.reference-project-inspection').open = true",
  );

  const navAccessibility = await send("Accessibility.getFullAXTree");
  assert.ok(
    navAccessibility.nodes.some(
      (node) =>
        node.name?.value === `${expected.projectTitle} workspace destinations`,
    ),
    "the named Workspace navigation must be present in the accessibility tree",
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
      const profile = document.querySelector('.reference-project-inspection__definition strong');
      const profileLink = [...document.querySelectorAll('.reference-project-inspection a')].find(
        (candidate) => candidate.textContent?.trim() === 'Project definition',
      );
      const snapshot = document.querySelector('.reference-project-inspection__state > span:first-child');
      const projection = document.querySelector('.reference-project-inspection__state .reference-status');
      return {
        route: window.shellNavigationRouter.state.location.pathname,
        currentPlace: document.querySelector('.reference-project-main')?.dataset.place,
        tracePlace: trace?.dataset.tracePlace,
        projectId: trace?.dataset.projectId,
        projectTitle: document.querySelector('.reference-context-bar__identity strong')?.textContent,
        definitionId: trace?.dataset.definitionId,
        profileLabel: profile?.textContent,
        profileHref: profileLink?.getAttribute('href'),
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

  const routeBeforeMobileSwitch = await evaluate(route);
  await send("Emulation.setDeviceMetricsOverride", {
    width: 420,
    height: 820,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await until(
    `getComputedStyle(document.querySelector('.reference-agent-panel')).display === 'none'`,
    "Workspace-first narrow layout",
  );
  await evaluate(`(() => {
    const control = [...document.querySelectorAll('.reference-mobile-pane-switcher button')]
      .find((candidate) => candidate.textContent?.trim() === 'Agent');
    control?.click();
  })()`);
  await until(
    `getComputedStyle(document.querySelector('.reference-agent-panel')).display !== 'none' && getComputedStyle(document.querySelector('.reference-workspace-panel')).display === 'none'`,
    "narrow Agent pane",
  );
  assert.equal(await evaluate(route), routeBeforeMobileSwitch);
  assert.equal(
    await evaluate("document.querySelector('.shell-navigation-trace') !== null"),
    true,
    "switching panes must preserve the mounted task",
  );
  await evaluate(`(() => {
    const control = [...document.querySelectorAll('.reference-mobile-pane-switcher button')]
      .find((candidate) => candidate.textContent?.trim() === 'Workspace');
    control?.click();
  })()`);
  await until(
    `getComputedStyle(document.querySelector('.reference-workspace-panel')).display !== 'none'`,
    "restored narrow Workspace pane",
  );
  assert.equal(await evaluate(route), routeBeforeMobileSwitch);
  if (screenshotOutput !== undefined) {
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const mobileOutput = screenshotOutput.endsWith(".png")
      ? screenshotOutput.slice(0, -4) + "-mobile.png"
      : screenshotOutput + "-mobile.png";
    writeFileSync(resolve(root, mobileOutput), screenshot.data, "base64");
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
    schema_name: "petra.frontend-step2-agent-workspace-browser-evidence",
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
      visible_control: "Agent and Workspace shell",
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
      desktop_split: {
        agent: desktopFrame.agentRatio,
        workspace: desktopFrame.workspaceRatio,
      },
      narrow_pane_switch_preserved_task: true,
      graph_controls_progressively_disclosed: true,
      shell_reads: calls.length,
      authenticated_requests: true,
      command_requests: 0,
      context_stable: true,
    },
    calls,
    boundary:
      "Isolated Chromium opened one representative Project through the production loadProjectRecord and ProjectShellClient path. It measured the desktop Agent and Workspace regions at 30/70, confirmed graph controls begin behind a closed Inspect disclosure, deliberately opened that disclosure, and keyboard-activated every retained destination. At each destination, exact Project, Objective, route, current place, active control, authority snapshot, and projection stayed coherent. At 420 px it switched Agent to Workspace without changing the route or unmounting the task. Deterministic schema-valid authenticated HTTP supplied browser transport. The child route body is a context observer, so this record proves the structural FE-A1.1 shell and shell.navigate; it does not prove Project creation, Agent conversation or Work control, destination task renderers, the complete Inspect experience, or final frontend acceptance.",
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
