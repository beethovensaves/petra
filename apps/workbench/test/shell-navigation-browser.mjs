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
const workspaceHostOutput = process.env.PETRA_WORKSPACE_HOST_OUTPUT;
const output = resolve(
  root,
  workspaceHostOutput ??
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
      workspaceRole: workspace?.dataset.workspaceRole,
      agentRatio:
        layoutRect && agentRect ? agentRect.width / layoutRect.width : 0,
      workspaceRatio:
        layoutRect && workspaceRect ? workspaceRect.width / layoutRect.width : 0,
      agentRequestOperation: document.querySelector('.reference-agent-composer')?.dataset.operationId,
      agentThreadOperation: document.querySelector('.reference-agent-thread')?.dataset.operationId,
      inspectionOpen: document.querySelector('.reference-project-inspection')?.hasAttribute('open'),
      guideVisible: document.body.innerText.includes('Test guide'),
    };
  })()`);
  assert.equal(desktopFrame.agentLabel, "project-agent-title");
  assert.equal(desktopFrame.agentTitle, "Petra");
  assert.equal(desktopFrame.workspaceLabel, "project-workspace-title");
  assert.equal(desktopFrame.workspaceTitle, "Outcome");
  assert.equal(desktopFrame.workspaceRole, "outcome");
  assert.ok(desktopFrame.agentRatio >= 0.29 && desktopFrame.agentRatio <= 0.31);
  assert.ok(
    desktopFrame.workspaceRatio >= 0.69 && desktopFrame.workspaceRatio <= 0.71,
  );
  await evaluate("document.querySelector('.reference-agent-resize').focus()");
  assert.equal(
    await evaluate("document.activeElement?.getAttribute('role')"),
    "separator",
  );
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "ArrowRight",
    code: "ArrowRight",
    windowsVirtualKeyCode: 39,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "ArrowRight",
    code: "ArrowRight",
    windowsVirtualKeyCode: 39,
  });
  await until(
    "document.querySelector('.reference-agent-resize')?.getAttribute('aria-valuenow') === '32'",
    "keyboard resized Agent panel",
  );
  const resizedAgentRatio = await evaluate(`(() => {
    const layout = document.querySelector('.reference-project-layout');
    const agent = document.querySelector('.reference-agent-panel');
    return agent.getBoundingClientRect().width / layout.getBoundingClientRect().width;
  })()`);
  assert.ok(resizedAgentRatio >= 0.31 && resizedAgentRatio <= 0.33);
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Home",
    code: "Home",
    windowsVirtualKeyCode: 36,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Home",
    code: "Home",
    windowsVirtualKeyCode: 36,
  });
  await until(
    "document.querySelector('.reference-agent-resize')?.getAttribute('aria-valuenow') === '30'",
    "default Agent width restored",
  );
  const splitterPosition = await evaluate(`(() => {
    const handle = document.querySelector('.reference-agent-resize').getBoundingClientRect();
    const layout = document.querySelector('.reference-project-layout').getBoundingClientRect();
    return {
      fromX: handle.left + handle.width / 2,
      toX: layout.left + layout.width * 0.36,
      y: handle.top + 240,
    };
  })()`);
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: splitterPosition.fromX,
    y: splitterPosition.y,
    button: "left",
    clickCount: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: splitterPosition.toX,
    y: splitterPosition.y,
    button: "left",
    buttons: 1,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: splitterPosition.toX,
    y: splitterPosition.y,
    button: "left",
    clickCount: 1,
  });
  await until(
    "Number(document.querySelector('.reference-agent-resize')?.getAttribute('aria-valuenow')) >= 35",
    "pointer resized Agent panel",
  );
  const pointerResizedAgentRatio = await evaluate(`(() => {
    const layout = document.querySelector('.reference-project-layout');
    const agent = document.querySelector('.reference-agent-panel');
    return agent.getBoundingClientRect().width / layout.getBoundingClientRect().width;
  })()`);
  assert.ok(
    pointerResizedAgentRatio >= 0.35 && pointerResizedAgentRatio <= 0.37,
  );
  await evaluate("document.querySelector('.reference-agent-resize').focus()");
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Home",
    code: "Home",
    windowsVirtualKeyCode: 36,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Home",
    code: "Home",
    windowsVirtualKeyCode: 36,
  });
  await until(
    "document.querySelector('.reference-agent-resize')?.getAttribute('aria-valuenow') === '30'",
    "Agent width restored after pointer resize",
  );
  assert.equal(desktopFrame.agentRequestOperation, "petra.ask");
  assert.equal(desktopFrame.agentThreadOperation, "petra.resume-thread");
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
  const workspaceRoles = {
    brief: "outcome",
    sources: "source",
    review: "review",
    composition: "artifact",
    work: "work",
    graph: "inspect",
    history: "inspect",
    profile_tool: "inspect",
    petra: "outcome",
  };
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
    await until(
      "document.activeElement?.id === 'project-workspace-title'",
      `${target.label} Workspace focus restoration`,
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
        workspaceRole: document.querySelector('.reference-workspace-panel')?.dataset.workspaceRole,
        workspaceSnapshot: document.querySelector('.reference-workspace-panel')?.dataset.workspaceSnapshot,
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
      workspaceRole: workspaceRoles[target.place],
      workspaceSnapshot: `authority-event-3`,
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
    await evaluate(
      "document.querySelector('.shell-navigation-trace') !== null",
    ),
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

  const sourcesPath = `/projects/${expected.projectId}/sources`;
  const reviewPath = `/projects/${expected.projectId}/review`;
  await evaluate(
    `window.shellNavigationRouter.navigate(${JSON.stringify(sourcesPath)})`,
  );
  await until(`${route} === ${JSON.stringify(sourcesPath)}`);
  await evaluate(`(() => {
    const input = document.querySelector('input[aria-label="Workspace draft probe"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('Missing Workspace draft');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Retained source note');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await until(
    "document.querySelector('input[aria-label=\"Workspace draft probe\"]')?.value === 'Retained source note'",
  );
  await evaluate(
    `window.shellNavigationRouter.navigate(${JSON.stringify(reviewPath)})`,
  );
  await until(`${route} === ${JSON.stringify(reviewPath)}`);
  await evaluate(
    `window.shellNavigationRouter.navigate(${JSON.stringify(sourcesPath)})`,
  );
  await until(
    `${route} === ${JSON.stringify(sourcesPath)} && document.querySelector('input[aria-label="Workspace draft probe"]')?.value === 'Retained source note'`,
    "Source draft after switching Workspace renderers",
  );

  const directSourcePath = `/projects/${expected.projectId}/sources/${expected.selectedSourceId}`;
  await evaluate(
    `window.shellNavigationRouter.navigate(${JSON.stringify(directSourcePath)})`,
  );
  await until(
    `${route} === ${JSON.stringify(directSourcePath)} && document.querySelector('.reference-workspace-panel')?.dataset.workspaceObjectRef === ${JSON.stringify(expected.selectedSourceId)} && document.querySelector('.shell-navigation-trace')?.dataset.tracePlace === 'sources'`,
    "the exact server-resolved Source Workspace",
  );
  await until(
    "document.activeElement?.id === 'project-workspace-title'",
    "direct Source focus restoration",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-workspace-panel')?.dataset.workspaceRole",
    ),
    "source",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-workspace-selection')?.textContent.trim()",
    ),
    "Current · revision 1",
  );

  const inspectFocus = await evaluate(`(() => {
    const link = document.querySelector('.reference-workspace-inspect');
    link?.focus();
    return {
      active: document.activeElement === link,
      href: link?.getAttribute('href'),
      mobilePane: link?.closest('[data-mobile-pane]')?.getAttribute('data-mobile-pane'),
      display: link ? getComputedStyle(link).display : null,
    };
  })()`);
  assert.equal(inspectFocus.active, true, JSON.stringify(inspectFocus));
  await evaluate(
    "document.querySelector('.reference-workspace-inspect')?.click()",
  );
  await until(
    `${route} === ${JSON.stringify(`/projects/${expected.projectId}/inspect`)} && document.querySelector('.reference-workspace-panel')?.dataset.workspaceRole === 'inspect' && document.querySelector('.reference-inspect') !== null`,
    "one Inspect action opens the exact Source in Workspace",
  );
  const inspect = await evaluate(`(() => ({
    object: document.querySelector('.reference-workspace-panel')?.dataset.workspaceObjectRef,
    snapshot: document.querySelector('.reference-inspect')?.dataset.inspectSnapshot,
    explanation: document.querySelector('#inspect-explanation')?.textContent,
    returnHref: document.querySelector('.reference-inspect__intro a')?.getAttribute('href'),
    disclosureCount: document.querySelectorAll('.reference-inspect details').length,
  }))()`);
  assert.deepEqual(inspect, {
    object: expected.selectedSourceId,
    snapshot: "authority-event-3",
    explanation: "Explanation",
    returnHref: directSourcePath,
    disclosureCount: 3,
  });
  await until(
    "document.querySelector('.reference-inspect')?.textContent.includes('Petra could not read this exact Source')",
    "plain-language Source read failure",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-inspect')?.textContent.includes('/api/queries/')",
    ),
    false,
  );
  const inspectWidth = await evaluate(`(() => {
    const panel = document.querySelector('.reference-inspect');
    const explanation = document.querySelector('#inspect-explanation + p');
    return {
      client: panel.clientWidth,
      content: panel.scrollWidth,
      explanationRight: explanation?.getBoundingClientRect().right,
      viewport: document.documentElement.clientWidth,
    };
  })()`);
  assert.ok(
    inspectWidth.content <= inspectWidth.client + 1 &&
      inspectWidth.explanationRight <= inspectWidth.viewport + 1,
    `Inspect clips text on narrow screens: ${JSON.stringify(inspectWidth)}`,
  );
  if (screenshotOutput !== undefined) {
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const inspectOutput = screenshotOutput.endsWith(".png")
      ? screenshotOutput.slice(0, -4) + "-inspect.png"
      : screenshotOutput + "-inspect.png";
    writeFileSync(resolve(root, inspectOutput), screenshot.data, "base64");
  }
  await evaluate(
    "document.querySelector('.reference-inspect__intro a')?.click()",
  );
  await until(
    `${route} === ${JSON.stringify(directSourcePath)} && document.querySelector('.reference-workspace-panel')?.dataset.workspaceObjectRef === ${JSON.stringify(expected.selectedSourceId)}`,
    "Inspect returns to the exact Source task",
  );
  await until(
    "document.activeElement?.id === 'project-workspace-title'",
    "Inspect return focus restoration",
  );

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(
    `window.shellNavigationRouter.navigate(${JSON.stringify(reviewPath)})`,
  );
  await until(
    `${route} === ${JSON.stringify(reviewPath)} && document.querySelector('a[aria-label="Inspect Decide this Review"]') !== null`,
    "Review agent result",
  );
  const reviewInspectFocus = await evaluate(`(() => {
    const link = document.querySelector('a[aria-label="Inspect Decide this Review"]');
    link?.focus();
    return document.activeElement === link;
  })()`);
  assert.equal(reviewInspectFocus, true);
  await evaluate(
    "document.querySelector('a[aria-label=\"Inspect Decide this Review\"]')?.click()",
  );
  await until(
    `${route} === ${JSON.stringify(`/projects/${expected.projectId}/inspect`)} && document.querySelector('.reference-inspect')?.textContent.includes(${JSON.stringify(expected.reviewSessionId)}) && document.querySelector('.reference-inspect')?.textContent.includes('Review basis')`,
    "authoritative Review inspection from Agent result",
  );
  assert.equal(
    await evaluate(
      "document.querySelector('.reference-inspect__intro a')?.getAttribute('href')",
    ),
    reviewPath,
  );

  await send("Emulation.setDeviceMetricsOverride", {
    width: 420,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  const inspectAccessibility = await evaluate(`(() => {
    document.documentElement.style.fontSize = '200%';
    return {
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
      inspectClient: document.querySelector('.reference-inspect').clientWidth,
      inspectContent: document.querySelector('.reference-inspect').scrollWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      returnVisible: getComputedStyle(document.querySelector('.reference-inspect__intro a')).display !== 'none',
    };
  })()`);
  assert.equal(inspectAccessibility.reducedMotion, true);
  assert.equal(inspectAccessibility.returnVisible, true);
  assert.ok(
    inspectAccessibility.content <= inspectAccessibility.viewport + 1 &&
      inspectAccessibility.inspectContent <=
        inspectAccessibility.inspectClient + 1,
    `Inspect overflows at 200% text scale: ${JSON.stringify(inspectAccessibility)}`,
  );
  await evaluate("document.documentElement.style.fontSize = ''");

  const calls = await evaluate("structuredClone(window.shellNavigationCalls)");
  assert.ok(
    calls.some(
      (call) =>
        call.method === "GET" &&
        call.path === `/api/queries/projects/${expected.projectId}/shell` &&
        call.authorization === "Bearer browser-shell-navigation-token",
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call.path ===
          `/api/queries/projects/${expected.projectId}/shell?semanticKey=petra.project-source&objectId=${expected.selectedSourceId}&taskIntent=inspect` &&
        call.authorization === "Bearer browser-shell-navigation-token",
    ),
    "direct Source entry must resolve exact identity in the server shell",
  );
  assert.ok(
    calls.some(
      (call) =>
        call.method === "GET" &&
        call.path ===
          `/api/queries/projects/${expected.projectId}/model-readiness` &&
        call.authorization === "Bearer browser-shell-navigation-token",
    ),
  );
  assert.ok(
    calls.some(
      (call) =>
        call.method === "GET" &&
        call.path ===
          `/api/queries/projects/${expected.projectId}/threads?limit=1&lifecycle=open` &&
        call.authorization === "Bearer browser-shell-navigation-token",
    ),
  );
  assert.equal(
    calls.some((call) => call.method !== "GET"),
    false,
  );
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  artifact = {
    schema_name:
      workspaceHostOutput === undefined
        ? "petra.frontend-step2-agent-workspace-browser-evidence"
        : "petra.frontend-step5-workspace-host-browser-evidence",
    schema_version: "1.0.0",
    status: "passed",
    operation_id: "shell.navigate",
    executed_at: new Date().toISOString(),
    command:
      workspaceHostOutput === undefined
        ? "npm run test:wave6:shell-navigation-ui"
        : "npm run test:frontend:step5-workspace-host",
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
      visited_places: contexts.map(
        ({
          route,
          currentPlace,
          activeLabel,
          workspaceRole,
          workspaceSnapshot,
        }) => ({
          route,
          current_place: currentPlace,
          active_control: activeLabel,
          workspace_role: workspaceRole,
          workspace_snapshot: workspaceSnapshot,
        }),
      ),
      desktop_split: {
        agent: desktopFrame.agentRatio,
        workspace: desktopFrame.workspaceRatio,
      },
      keyboard_resize_agent_ratio: resizedAgentRatio,
      pointer_resize_agent_ratio: pointerResizedAgentRatio,
      narrow_pane_switch_preserved_task: true,
      route_focus_restored_to_workspace: true,
      workspace_draft_preserved_across_renderers: true,
      direct_source_path: directSourcePath,
      direct_source_exact_identity: expected.selectedSourceId,
      direct_source_server_resolved: true,
      inspect_exact_source_and_return: true,
      inspect_agent_review_from_authoritative_read: true,
      inspect_200_percent_text_scale_no_horizontal_overflow: true,
      inspect_reduced_motion_mode: true,
      graph_controls_progressively_disclosed: true,
      shell_reads: calls.length,
      agent_request_operation: desktopFrame.agentRequestOperation,
      agent_thread_operation: desktopFrame.agentThreadOperation,
      authenticated_requests: true,
      command_requests: 0,
      context_stable: true,
    },
    calls,
    boundary:
      workspaceHostOutput === undefined
        ? "Isolated Chromium opened one representative Project through the production loadProjectRecord and ProjectShellClient path. It measured the desktop Agent and Workspace regions at 30/70, confirmed the persistent Agent owns petra.ask and retained-thread presentation, confirmed graph controls begin behind a closed Inspect disclosure, deliberately opened that disclosure, and keyboard-activated every retained Workspace destination. At each destination, exact Project, Objective, route, current place, active control, authority snapshot, and projection stayed coherent. At 420 px it switched Agent to Workspace without changing the route or unmounting the task. Deterministic authenticated HTTP supplied browser transport. The child route body remains a context observer, so this record proves the structural shell and persistent Agent boundary; contextual Work, Review, and recovery commands require their FE-A1.3 task test."
        : "Isolated Chromium opened one representative Project using the production shell read and Workspace host. It keyboard-activated each registered destination and confirmed the renderer role and authority snapshot remained bound to the same Project. A draft survived a Source-to-Review-to-Source renderer change. A direct Source URL resolved its exact object and revision through a server shell read. The single Inspect action carried that identity and snapshot into the Workspace and returned to the exact Source task with focus restored. The 30/70 frame and narrow Agent/Workspace switch preserved the mounted task. Deterministic authenticated HTTP supplied browser transport; child route bodies were context observers. Live Source, Review, Work, and Artifact content remain outside this structural trace.",
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
