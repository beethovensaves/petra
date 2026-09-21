import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { format } from "prettier";
import { createServer as createViteServer } from "vite";

import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";

const root = resolve(import.meta.dirname, "../../..");
const output = resolve(
  root,
  process.env.PETRA_PROJECT_SEARCH_BROWSER_OUTPUT ??
    "reports/WAVE6-PROJECT-SEARCH-BROWSER.json",
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
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  assert.ok(address !== null && typeof address === "object");
  chrome = await startChrome({ profilePrefix: "petra-project-search-" });
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
      `Timed out waiting for ${label}\nBody: ${await evaluate("document.body.innerText.slice(0, 6000)")}\nFailures: ${JSON.stringify(browserFailures)}`,
    );
  };
  const input = '.reference-project-search input[type="search"]';
  const statusSelect = '.reference-project-search select[name="status"]';
  const profileSelect = '.reference-project-search select[name="profile"]';
  const button = (label) =>
    `[...document.querySelectorAll('button')].find((candidate) => candidate.textContent.trim() === ${JSON.stringify(label)})`;
  const setControl = async (selector, value, eventName) => {
    await evaluate(`(() => {
      const control = document.querySelector(${JSON.stringify(selector)});
      const setter = Object.getOwnPropertyDescriptor(
        control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(control, ${JSON.stringify(value)});
      control.dispatchEvent(new Event(${JSON.stringify(eventName)}, { bubbles: true }));
    })()`);
  };
  const click = async (label) => {
    await until(`${button(label)} !== undefined`, `${label} button`);
    await evaluate(`${button(label)}.click()`);
  };
  const waitForCallCount = async (count) =>
    until(
      `window.projectSearchCalls.length === ${count}`,
      `${count} search calls`,
    );
  const cardsContain = (text) =>
    `[...document.querySelectorAll('.reference-project-card')].some((card) => card.textContent.includes(${JSON.stringify(text)}))`;

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
    url: `http://127.0.0.1:${address.port}/test/project-search-browser.html`,
  });
  await until(
    `${cardsContain("Arctic evidence review")}`,
    "initial server page",
  );
  assert.equal(
    await evaluate(`${cardsContain("Retired turbine study")}`),
    false,
  );

  await click("Next page");
  await waitForCallCount(1);
  await until(`${cardsContain("Retired turbine study")}`, "second server page");
  assert.match(
    await evaluate("window.projectSearchCalls[0].path"),
    /limit=2&cursor=offset%3A2/u,
  );
  await click("Previous page");
  await waitForCallCount(2);
  await until(
    `${cardsContain("Arctic evidence review")}`,
    "previous server page",
  );

  await setControl(input, "winter inlet", "input");
  await click("Find Projects");
  await waitForCallCount(3);
  await until(
    `${cardsContain("Arctic evidence review")}`,
    "Objective search result",
  );
  assert.match(
    await evaluate("window.projectSearchCalls[2].path"),
    /search=winter\+inlet/u,
  );

  await setControl(input, "Controlled writing", "input");
  await click("Find Projects");
  await waitForCallCount(4);
  await until(
    `${cardsContain("Field procedure revision")}`,
    "profile label result",
  );

  await setControl(input, "", "input");
  await setControl(statusSelect, "archived", "change");
  await setControl(profileSelect, "petra.scientific-evidence", "change");
  await click("Find Projects");
  await waitForCallCount(5);
  await until(
    `${cardsContain("Retired turbine study")}`,
    "status and profile result",
  );
  const boundedFilterCall = await evaluate("window.projectSearchCalls[4]");
  assert.match(boundedFilterCall.path, /status=archived/u);
  assert.match(boundedFilterCall.path, /profile=petra.scientific-evidence/u);
  assert.equal(
    boundedFilterCall.authorization,
    "Bearer browser-project-search-token",
  );

  await setControl(input, "no matching authority", "input");
  await setControl(statusSelect, "", "change");
  await setControl(profileSelect, "", "change");
  await click("Find Projects");
  await waitForCallCount(6);
  await until(
    'document.body.innerText.includes("No Projects match this search")',
    "server-owned empty result",
  );

  const beforeInvalid = await evaluate("window.projectSearchCalls.length");
  await setControl(input, "x".repeat(241), "input");
  await click("Find Projects");
  await until(
    'document.body.innerText.includes("Enter up to 240 characters")',
    "invalid query guidance",
  );
  assert.equal(
    await evaluate("window.projectSearchCalls.length"),
    beforeInvalid,
  );

  await click("Clear search");
  await waitForCallCount(7);
  await until(
    `${cardsContain("Arctic evidence review")}`,
    "restored server results",
  );
  await evaluate("window.projectSearchUnavailable = true");
  await setControl(input, "Arctic", "input");
  await click("Find Projects");
  await waitForCallCount(8);
  await until(
    'document.body.innerText.includes("Project search is temporarily unavailable")',
    "unavailable search result",
  );
  assert.equal(
    await evaluate(`${cardsContain("Arctic evidence review")}`),
    true,
  );
  assert.ok(
    (await evaluate("document.body.innerText")).includes(
      "No local substitute was used",
    ),
  );
  await evaluate("window.projectSearchUnavailable = false");
  await click("Retry search");
  await waitForCallCount(9);
  await until(
    `${cardsContain("Arctic evidence review")} && !document.body.innerText.includes("temporarily unavailable")`,
    "successful retry",
  );

  await evaluate("window.projectSearchDelay = true");
  await setControl(input, "safety evidence", "input");
  await click("Find Projects");
  await waitForCallCount(10);
  await until(
    'document.body.innerText.includes("Searching Projects…")',
    "visible loading state",
  );
  await until(
    `!document.body.innerText.includes("Searching Projects…") && ${cardsContain("Arctic evidence review")}`,
    "delayed search result",
  );
  await evaluate("window.projectSearchDelay = false");

  const accessibility = await send("Accessibility.getFullAXTree");
  const names = accessibility.nodes
    .map((node) => node.name?.value)
    .filter((value) => typeof value === "string");
  for (const name of ["Find a Project", "Status", "Profile", "Find Projects"]) {
    assert.ok(names.includes(name), `Accessibility tree omitted ${name}`);
  }
  assert.deepEqual(browserFailures, []);

  const calls = await evaluate("structuredClone(window.projectSearchCalls)");
  const artifact = {
    schema_name: "petra.wave6-project-search-browser-evidence",
    schema_version: "1.0.0",
    status: "passed",
    operation_id: "project.search",
    executed_at: new Date().toISOString(),
    verified: {
      production_client: "ProjectShellClient.search",
      authenticated_requests: calls.every(
        (call) => call.authorization === "Bearer browser-project-search-token",
      ),
      membership_surfaces: [
        "current Project name",
        "current Objective statement",
        "registered profile label",
      ],
      bounded_filters: ["status", "profile"],
      pagination: ["next server cursor", "previous server page"],
      visible_states: [
        "loading",
        "empty",
        "invalid query",
        "unavailable with retained last result",
        "retry success",
      ],
      request_count: calls.length,
    },
    calls,
    boundary:
      "Isolated Chromium executed the visible Projects controls through the production renderer-neutral ProjectShellClient and schema-valid authenticated GET /api/queries/projects responses. Transport was deterministic browser-local HTTP; the retained backend authority artifact separately proves real PostgreSQL membership, filtering, and pagination.",
  };
  await writeFile(
    output,
    await format(JSON.stringify(artifact), { parser: "json" }),
    "utf8",
  );
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
} finally {
  cdp?.socket.close();
  if (chrome?.child.exitCode === null) chrome.child.kill("SIGTERM");
  await vite.close();
}
