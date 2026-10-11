import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCdp,
  startChrome,
} from "./cumulative-production-browser-driver.mjs";
const root = resolve(import.meta.dirname, "../../..");
const origin = process.env.PETRA_A1_PREVIEW_URL ?? "http://127.0.0.1:4313";
const { project_id: projectId } = JSON.parse(
  await readFile(
    resolve(root, "reports/FE-A1-INTAKE-FUNCTION-BROWSER.json"),
    "utf8",
  ),
);
const headers = { authorization: "Bearer petra-local-development" };
const read = async (path) => {
  const response = await fetch(`${origin}${path}`, { headers });
  assert.equal(response.status, 200);
  return response.json();
};
const graph = await read(`/api/queries/projects/${projectId}/semantic-graph`);
const ref = graph.content.definition_ref;
const definition = await read(
  `/api/queries/projects/${projectId}/definition?definition_revision=${ref.revision}`,
);
assert.equal(definition.project_definition_id, ref.record_id);
assert.equal(definition.content_hash, ref.content_hash);
const chrome = await startChrome({ profilePrefix: "petra-a1-definition-" });
let cdp;
try {
  cdp = await createCdp(chrome.socketUrl);
  const { send, evaluate, until } = cdp;
  const errors = [],
    definitions = [],
    commands = [];
  cdp.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown")
      errors.push(message.params.exceptionDetails.text);
    if (message.method === "Network.requestWillBeSent") {
      const request = message.params.request;
      if (request.url.includes("/definition?")) definitions.push(request.url);
      if (request.method !== "GET" && request.url.includes("/api/commands/"))
        commands.push(request.url);
    }
  });
  await Promise.all([
    send("Page.enable"),
    send("Runtime.enable"),
    send("Network.enable"),
  ]);
  await send("Page.navigate", { url: `${origin}/projects/${projectId}/graph` });
  await until(
    "document.querySelector('.project-definition-components')!==null",
    "exact definition components",
  );
  await evaluate(
    "document.querySelector('.project-definition-components').open=true",
  );
  await evaluate(
    "document.querySelector('.project-definition-components details').open=true",
  );
  const displayed = await evaluate(
    "document.querySelector('.project-definition-components').innerText",
  );
  assert(displayed.includes(definition.content.description));
  assert(displayed.includes(`revision ${ref.revision}`));
  assert(displayed.includes(ref.content_hash));
  assert(
    displayed.includes("no component implements"),
    "The Project remains valid with explicit missing execution capabilities.",
  );
  assert.equal(
    await evaluate("document.body.innerText.includes('Route unavailable')"),
    false,
  );
  assert(
    definitions.length >= 1,
    "The browser must perform the actual immutable read.",
  );
  assert.equal(
    new Set(definitions).size,
    1,
    "Development remounts may repeat only the same exact read.",
  );
  for (const request of definitions) {
    const url = new URL(request);
    assert.equal(url.pathname, `/api/queries/projects/${projectId}/definition`);
    assert.equal(url.search, `?definition_revision=${ref.revision}`);
  }
  assert.deepEqual(commands, []);
  assert.deepEqual(errors, []);
  const after = await read(`/api/queries/projects/${projectId}/semantic-graph`);
  assert.deepEqual(after.content.authority, graph.content.authority);
  assert.equal(after.content_hash, graph.content_hash);
  await writeFile(
    resolve(root, "reports/FE-A1-DEFINITION-COMPONENTS-BROWSER.json"),
    JSON.stringify(
      {
        status: "passed",
        boundary:
          "Actual production Project graph, immutable definition read, and browser component loading; no command or model invocation.",
        project_id: projectId,
        definition_ref: ref,
        definition_requests: definitions,
        displayed,
        commands,
        errors,
        authority_before: graph.content.authority,
        authority_after: after.content.authority,
      },
      null,
      2,
    ) + "\n",
  );
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    resolve(root, "reports/FE-A1-DEFINITION-COMPONENTS-BROWSER.png"),
    Buffer.from(screenshot.data, "base64"),
  );
  process.stdout.write(
    "Exact definition components loaded in the production browser without an authority effect.\n",
  );
} finally {
  cdp?.socket.close();
  if (chrome.child.exitCode === null) {
    const closed = new Promise((done) => chrome.child.once("exit", done));
    chrome.child.kill("SIGTERM");
    await closed;
  }
  rmSync(chrome.profile, { recursive: true, force: true });
}
