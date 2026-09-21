import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const workbenchUrl =
  process.env.PETRA_SOURCE_LINK_REMOVAL_WORKBENCH_URL ??
  "http://127.0.0.1:4311";
const socketUrl = process.env.PETRA_SOURCE_LINK_REMOVAL_CHROME_SOCKET;
if (socketUrl === undefined) {
  throw new Error("The focused source link removal Chrome socket is required.");
}
const socket = new WebSocket(socketUrl);
await new Promise((resolveOpen) =>
  socket.addEventListener("open", resolveOpen, { once: true }),
);
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id === undefined) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error === undefined) request.resolve(message.result);
  else request.reject(message.error);
});
const send = (method, params = {}) =>
  new Promise((resolveSend, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve: resolveSend, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails !== undefined) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
};
const until = async (expression) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(
    `Timed out: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
};
const button = (label) =>
  `[...document.querySelectorAll("button")].find((element) => element.textContent.trim() === ${JSON.stringify(label)})`;
const navigate = async (mode) => {
  await send("Page.navigate", {
    url: `${workbenchUrl}/test/source-link-removal-browser.html?mode=${mode}`,
  });
  await until(`${button("Remove from Project")} !== undefined`);
};
const openPreview = async () => {
  await evaluate(`${button("Remove from Project")}.click()`);
  await until(
    'document.body.innerText.includes("Exact link and freshness") && document.body.innerText.includes("Retention boundary")',
  );
};
const setReason = async () => {
  await evaluate(`(()=>{
    const control=[...document.querySelectorAll("textarea")].find((candidate)=>candidate.labels?.[0]?.textContent.includes("Reason for removing this Project link"));
    if(!control) throw new Error("Missing removal reason field");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(control,"This source no longer belongs in the current evidence set.");
    control.dispatchEvent(new Event("input",{bubbles:true}));
  })()`);
};

await send("Page.enable");
await send("Runtime.enable");
await send("Accessibility.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 960,
  deviceScaleFactor: 1,
  mobile: false,
});

await navigate("unknown");
assert.equal(
  await evaluate(`${button("Delete local copy")} !== undefined`),
  true,
);
assert.equal(
  await evaluate(
    'document.querySelector("#source-link-removal-trigger") !== null && document.querySelector("#source-local-copy-deletion-trigger") !== null',
  ),
  true,
);
await openPreview();
for (const copy of [
  "scientific.literature",
  "Project source",
  "Profile definition",
  "Retained dependency impact",
  "Active Work",
  "Open Reviews",
  "Grounded Petra responses",
  "Global source identity",
  "Immutable Project-link revisions",
  "Local copy",
  "Retained · deletion unavailable",
]) {
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(copy)})`),
    true,
    `missing source link removal copy: ${copy}`,
  );
}
assert.equal(
  await evaluate("window.sourceLinkRemovalCalls.previews.length"),
  1,
);
await setReason();
await evaluate(`${button("Confirm Project-link removal")}.click()`);
await until('document.body.innerText.includes("outcome not confirmed")');
assert.equal(
  await evaluate("document.querySelector('textarea').value"),
  "This source no longer belongs in the current evidence set.",
  "unknown effect must preserve the reviewed reason",
);
await evaluate(`${button("Check removal effect")}.click()`);
await until('document.body.innerText.includes("outcome is still unknown")');
await evaluate(`${button("Retry exact removal")}.click()`);
await until(
  'document.body.innerText.includes("Already removed from this Project")',
);
const recoveredCalls = await evaluate(
  "({removals:window.sourceLinkRemovalCalls.removals,recoveries:window.sourceLinkRemovalCalls.recoveries,revalidations:window.sourceLinkRemovalCalls.revalidations})",
);
assert.equal(recoveredCalls.removals.length, 2);
assert.equal(recoveredCalls.recoveries.length, 1);
assert.deepEqual(recoveredCalls.removals[0], recoveredCalls.removals[1]);
assert.deepEqual(recoveredCalls.removals[0], recoveredCalls.recoveries[0]);
assert.equal(recoveredCalls.revalidations, 1);
for (const field of [
  "actor",
  "capability_grant_id",
  "recorded_at",
  "resulting_source_ref",
]) {
  assert.equal(field in recoveredCalls.removals[0], false);
}
const exactReturn = await evaluate(`(()=>{
  const link=[...document.querySelectorAll("a")].find((candidate)=>candidate.textContent.includes("Return to the exact source task"));
  const url=new URL(link.href);
  return url.pathname+url.search;
})()`);
assert.equal(
  exactReturn,
  `/projects/${recoveredCalls.removals[0].expected.project_ref.project_id}/sources/${recoveredCalls.removals[0].expected.current_source_ref.project_source_id}?from=graph&graphNodeId=claim_01K6W000000000000000000007&graphLayer=current`,
);
await evaluate(`${button("Keep inspecting this source")}.click()`);
await until(
  'document.activeElement?.id === "source-link-removal-trigger" && !document.body.innerText.includes("Exact link and freshness")',
);

for (const [mode, copy, outcome] of [
  ["applied", "Removed from this Project", "applied"],
  ["replayed", "Already removed from this Project", "replayed"],
]) {
  await navigate(mode);
  await openPreview();
  await setReason();
  await evaluate(`${button("Confirm Project-link removal")}.click()`);
  await until(`document.body.innerText.includes(${JSON.stringify(copy)})`);
  assert.equal(
    await evaluate(
      'document.querySelector("[data-removal-outcome]").dataset.removalOutcome',
    ),
    outcome,
  );
  assert.equal(
    await evaluate(
      'document.body.innerText.includes("Local copy") && document.body.innerText.includes("Retained · not deleted")',
    ),
    true,
  );
}

for (const [mode, copy, kind] of [
  ["conflict", "The Project or source changed", "conflict"],
  ["authorization", "Source access changed", "permission"],
  ["failure", "Source link was not removed", "rejected"],
]) {
  await navigate(mode);
  await openPreview();
  await setReason();
  await evaluate(`${button("Confirm Project-link removal")}.click()`);
  await until(`document.body.innerText.includes(${JSON.stringify(copy)})`);
  assert.equal(
    await evaluate(
      'document.querySelector("[data-failure-kind]").dataset.failureKind',
    ),
    kind,
  );
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    "This source no longer belongs in the current evidence set.",
  );
}

await send("Emulation.setDeviceMetricsOverride", {
  width: 375,
  height: 812,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await navigate("applied");
await openPreview();
await evaluate('document.documentElement.style.fontSize="200%"');
await evaluate(
  "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "source link removal must reflow without horizontal page overflow",
);
assert.ok(
  (await evaluate(
    `${button("Confirm Project-link removal")}.getBoundingClientRect().height`,
  )) >= 44,
);
await evaluate(`${button("Confirm Project-link removal")}.focus()`);
assert.equal(
  await evaluate(
    'document.activeElement.textContent.trim() === "Confirm Project-link removal"',
  ),
  true,
);
const accessibility = await send("Accessibility.getFullAXTree");
for (const heading of [
  "Details",
  "Remove from Project",
  "Exact link and freshness",
  "Retained dependency impact",
  "Retention boundary",
]) {
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "heading" && node.name?.value === heading,
    ),
    `missing accessible heading: ${heading}`,
  );
}
assert.ok(
  accessibility.nodes.some(
    (node) =>
      node.role?.value === "textbox" &&
      node.name?.value.includes("Reason for removing this Project link"),
  ),
  "missing accessible removal-reason textbox",
);

const reportPath = resolve(
  process.env.PETRA_WAVE6_SOURCE_LINK_REMOVAL_BROWSER_OUTPUT ??
    "reports/WAVE6-SOURCE-LINK-REMOVAL-BROWSER.json",
);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      schema_name: "petra.wave6-source-link-removal-browser-observation",
      schema_version: 1,
      observed_at: new Date().toISOString(),
      operations: ["source.remove-project-link"],
      production_boundary:
        "Production Source Details SourceLinkRemovalActions with the renderer-neutral ProjectSourceLinkRemovalClient boundary and deterministic typed transport.",
      exercised: [
        "authenticated preview invocation boundary and exact Project, ProjectDefinition, ProjectSource, and registered role presentation",
        "registered direct and scientific dependency impact plus explicit limitations",
        "retained global identity, immutable revisions, copy manifest, local copy, parsed representation, and provenance",
        "required human reason and exact command/idempotency retry",
        "applied, replayed, conflict, permission, rejected, and unknown-effect recovery outcomes",
        "distinct local-copy deletion control without invoking its separate production owner",
        "exact originating source-task selection and trigger-focus return",
        "narrow viewport, 200% text, reduced motion, keyboard focus, touch target, and browser semantics",
      ],
      exclusions: [
        "No PostgreSQL service was started by this focused browser run.",
        "This is not the complete UX1.6-SOURCES register/process/inspect/replace/remove/delete/recovery workflow.",
      ],
    },
    null,
    2,
  )}\n`,
  "utf8",
);
process.stdout.write(
  `Wave 6 source link removal browser checks passed: ${reportPath}\n`,
);
