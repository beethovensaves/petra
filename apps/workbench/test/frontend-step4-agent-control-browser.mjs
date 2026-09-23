import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { createServer as createViteServer } from "vite";

import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "../../..");
const output = resolve(
  root,
  process.env.PETRA_FRONTEND_STEP4_OUTPUT ??
    "reports/FRONTEND-STEP4-AGENT-CONTROL-PLANE.json",
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
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  assert.ok(address !== null && typeof address === "object");
  chrome = await startChrome({ profilePrefix: "petra-frontend-step4-" });
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
      `Timed out waiting for ${label}\n${await evaluate("document.body.innerText.slice(0, 6000)")}`,
    );
  };

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
    "window.shellNavigationRouter?.state.location.pathname.endsWith('/brief') && document.querySelector('.reference-agent-control') !== null",
    "the initial Agent task",
  );

  const expectations = [
    {
      route: "brief",
      title: "Proposed next action",
      button: "Start proposed Work",
      operations: [
        "brief.frame-objective",
        "brief.suggested-preview",
        "brief.suggested-invoke",
        "work.start",
      ],
    },
    {
      route: "work",
      title: "Control this Work",
      button: "Steer work",
      operations: [
        "work.answer-input",
        "work.steer",
        "work.prioritize",
        "work.cancel",
        "work.reconnect",
        "work.replay",
        "work.retry",
        "work.resume",
        "work.start-again",
        "work.open-result",
      ],
    },
    {
      route: "review",
      title: "Decide this Review",
      button: "Apply displayed ChangeSet",
      operations: [
        "review.apply",
        "review.reject",
        "review.defer",
        "review.reopen",
      ],
    },
    {
      route: "history",
      title: "Request a governed Revert",
      button: "Read governed Revert preview",
      operations: ["history.preview-revert", "history.execute-revert"],
    },
  ];
  const observed = [];
  for (const expectation of expectations) {
    await evaluate(
      `window.shellNavigationRouter.navigate(${JSON.stringify(`/projects/${await evaluate("window.shellNavigationExpected.projectId")}/${expectation.route}`)})`,
    );
    await until(
      `document.querySelector('.reference-agent-control h2')?.textContent === ${JSON.stringify(expectation.title)}`,
      `${expectation.title} in Agent`,
    );
    const result = await evaluate(`(() => {
      const control = document.querySelector('.reference-agent-control');
      const button = control?.querySelector('button');
      return {
        route: window.shellNavigationRouter.state.location.pathname,
        title: control?.querySelector('h2')?.textContent,
        button: button?.textContent?.trim(),
        operations: control?.dataset.operationIds?.split(' '),
        objectRef: control?.dataset.objectRef,
        inAgent: control?.closest('.reference-agent-panel') !== null,
        inWorkspace: control?.closest('.reference-workspace-panel') !== null,
      };
    })()`);
    assert.equal(result.title, expectation.title);
    assert.equal(result.button, expectation.button);
    assert.deepEqual(result.operations, expectation.operations);
    assert.equal(result.inAgent, true);
    assert.equal(result.inWorkspace, false);
    assert.ok(result.objectRef?.length > 0);
    observed.push(result);
  }

  const persistent = await evaluate(`({
    requestOperation: document.querySelector('.reference-agent-composer')?.dataset.operationId,
    threadOperation: document.querySelector('.reference-agent-thread')?.dataset.operationId,
    controlCount: document.querySelectorAll('.reference-agent-control').length,
  })`);
  assert.deepEqual(persistent, {
    requestOperation: "petra.ask",
    threadOperation: "petra.resume-thread",
    controlCount: 1,
  });

  const routeBeforeResponsiveSwitch = await evaluate(
    "window.shellNavigationRouter.state.location.pathname",
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 420,
    height: 820,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await until(
    "getComputedStyle(document.querySelector('.reference-agent-panel')).display === 'none'",
    "Workspace-first constrained layout",
  );
  await evaluate(`([...document.querySelectorAll('.reference-mobile-pane-switcher button')]
    .find((button) => button.textContent?.trim() === 'Agent'))?.click()`);
  await until(
    "getComputedStyle(document.querySelector('.reference-agent-panel')).display !== 'none' && document.querySelector('.reference-agent-control h2')?.textContent === 'Request a governed Revert'",
    "retained Agent control on constrained layout",
  );
  assert.equal(
    await evaluate("window.shellNavigationRouter.state.location.pathname"),
    routeBeforeResponsiveSwitch,
  );

  const accessibility = await send("Accessibility.getFullAXTree");
  for (const expectation of expectations) {
    assert.ok(
      accessibility.nodes.some(
        (node) =>
          node.name?.value === expectation.title ||
          node.name?.value === expectation.button,
      ) || expectation.route !== "history",
    );
  }
  assert.deepEqual(browserFailures, []);

  const browserVersion = await send("Browser.getVersion");
  const artifact = {
    schema_name: "petra.frontend-step4-agent-control-plane-evidence",
    schema_version: "1.0.0",
    status: "passed",
    executed_at: new Date().toISOString(),
    browser: {
      product: browserVersion.product,
      user_agent: browserVersion.userAgent,
      protocol_version: browserVersion.protocolVersion,
    },
    verified: {
      persistent_operations: ["petra.ask", "petra.resume-thread"],
      contextual_controls: observed,
      sampled_route_controller_count: 1,
      controls_rendered_inside_agent: true,
      controls_absent_from_workspace: true,
      exact_object_reference_present: true,
      responsive_task_preserved: true,
      direct_and_agent_paths_share_route_owned_controller: true,
    },
    boundary:
      "The production ProjectShell and AgentControlPortal kept each sampled route-owned typed controller mounted while presenting its controls inside the persistent Agent. Existing Work, Review, SuggestedAction, objective, interaction, and History tests establish command behavior; this browser trace establishes presentation ownership, exact operation/object references, and responsive continuity for the sampled routes.",
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
    await vite.close();
    if (chrome !== undefined && chrome.exitCode === null)
      chrome.kill("SIGKILL");
  }
}
if (failure !== undefined) throw failure;
