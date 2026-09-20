import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const workbenchUrl =
  process.env.PETRA_SOURCE_LOCAL_COPY_DELETION_WORKBENCH_URL ??
  "http://127.0.0.1:4311";
const socketUrl = process.env.PETRA_SOURCE_LOCAL_COPY_DELETION_CHROME_SOCKET;
if (socketUrl === undefined) {
  throw new Error(
    "The focused source local-copy deletion Chrome socket is required.",
  );
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
    url: `${workbenchUrl}/test/source-local-copy-deletion-browser.html?mode=${mode}`,
  });
  await until(`${button("Delete local copy")} !== undefined`);
};
const openPreview = async () => {
  await evaluate(`${button("Delete local copy")}.click()`);
  await until(
    'document.body.innerText.includes("Exact copy and freshness") && document.body.innerText.includes("What remains and what changes")',
  );
};
const setReason = async () => {
  await evaluate(`(()=>{
    const control=[...document.querySelectorAll("textarea")].find((candidate)=>candidate.labels?.[0]?.textContent.includes("Reason for deleting this exact local copy"));
    if(!control) throw new Error("Missing local-copy deletion reason field");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set.call(control,"The registered origin can safely supply these bytes again.");
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

await navigate("blocked");
assert.equal(
  await evaluate(`${button("Remove from Project")} !== undefined`),
  true,
  "Project-link removal must remain a distinct visible control",
);
await openPreview();
await evaluate(
  '[...document.querySelectorAll("summary")].find((element)=>element.textContent.includes("Inspect blocking identities")).click()',
);
for (const copy of [
  "Exact copy cannot be deleted yet",
  "Active Work depends on this copy",
  "work_unit_01K6W000000000000000000010",
  "Refresh eligibility",
]) {
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(copy)})`),
    true,
    `missing blocked deletion copy: ${copy}`,
  );
}
assert.equal(
  await evaluate(
    `${button("Confirm exact local-copy deletion")} === undefined`,
  ),
  true,
  "blocked eligibility must not expose the destructive command",
);

await navigate("unknown");
await openPreview();
await evaluate(
  '[...document.querySelectorAll("summary")].find((element)=>element.textContent.includes("Inspect exact storage identity")).click()',
);
for (const copy of [
  "Exact copy is eligible",
  "application/pdf",
  "21 bytes",
  "petra-local",
  "sha256/",
  "Copy manifest and tombstone",
  "Canonical source identity",
  "Rights history",
  "Exact selectors",
  "Provenance and History",
  "Deleted only after confirmation",
  "Petra can reacquire the bytes from the registered origin",
  "The Project link is not removed",
]) {
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(copy)})`),
    true,
    `missing eligible deletion copy: ${copy}`,
  );
}
assert.equal(
  await evaluate("window.sourceLocalCopyDeletionCalls.previews.length"),
  1,
);
await setReason();
await evaluate(`${button("Confirm exact local-copy deletion")}.click()`);
await until('document.body.innerText.includes("outcome not confirmed")');
assert.equal(
  await evaluate("document.querySelector('textarea').value"),
  "The registered origin can safely supply these bytes again.",
  "unknown storage effect must preserve the reviewed reason",
);
await evaluate(`${button("Check deletion effect")}.click()`);
await until('document.body.innerText.includes("outcome is still unknown")');
assert.equal(
  await evaluate(
    'document.body.innerText.includes("retained the deletion intent")',
  ),
  true,
);
await evaluate(`${button("Retry exact deletion")}.click()`);
await until(
  'document.body.innerText.includes("Exact deletion result replayed")',
);
const recoveredCalls = await evaluate(
  "({deletions:window.sourceLocalCopyDeletionCalls.deletions,recoveries:window.sourceLocalCopyDeletionCalls.recoveries,revalidations:window.sourceLocalCopyDeletionCalls.revalidations})",
);
assert.equal(recoveredCalls.deletions.length, 2);
assert.equal(recoveredCalls.recoveries.length, 1);
assert.deepEqual(recoveredCalls.deletions[0], recoveredCalls.deletions[1]);
assert.deepEqual(recoveredCalls.deletions[0], recoveredCalls.recoveries[0]);
assert.equal(recoveredCalls.revalidations, 1);
for (const field of [
  "actor",
  "capability_grant_id",
  "recorded_at",
  "receipt_id",
]) {
  assert.equal(field in recoveredCalls.deletions[0], false);
}
assert.equal(
  await evaluate(
    'document.body.innerText.includes("Project link") && document.body.innerText.includes("Retained · still belongs to this Project")',
  ),
  true,
);
const exactReturn = await evaluate(`(()=>{
  const link=[...document.querySelectorAll("a")].find((candidate)=>candidate.textContent.includes("Return to the exact source task"));
  const url=new URL(link.href);
  return url.pathname+url.search;
})()`);
assert.equal(
  exactReturn,
  `/projects/${recoveredCalls.deletions[0].expected.project_ref.project_id}/sources/${recoveredCalls.deletions[0].expected.current_source_ref.project_source_id}?from=graph&graphNodeId=claim_01K6W000000000000000000014&graphLayer=current`,
);
await evaluate(`${button("Keep inspecting this source")}.click()`);
await until(
  'document.activeElement?.id === "source-local-copy-deletion-trigger" && !document.body.innerText.includes("Exact copy and freshness")',
);

for (const [mode, copy, outcome] of [
  ["applied", "Local copy deleted", "applied"],
  ["replayed", "Exact deletion result replayed", "replayed"],
]) {
  await navigate(mode);
  await openPreview();
  await setReason();
  await evaluate(`${button("Confirm exact local-copy deletion")}.click()`);
  await until(`document.body.innerText.includes(${JSON.stringify(copy)})`);
  assert.equal(
    await evaluate(
      'document.querySelector("[data-local-copy-deletion-outcome]").dataset.localCopyDeletionOutcome',
    ),
    outcome,
  );
}

for (const [mode, copy, kind] of [
  ["conflict", "The Project, source, or copy changed", "conflict"],
  ["authorization", "Storage permission changed", "permission"],
  ["failure", "Local copy was not deleted", "rejected"],
]) {
  await navigate(mode);
  await openPreview();
  await setReason();
  await evaluate(`${button("Confirm exact local-copy deletion")}.click()`);
  await until(`document.body.innerText.includes(${JSON.stringify(copy)})`);
  assert.equal(
    await evaluate(
      'document.querySelector("[data-local-copy-failure-kind]").dataset.localCopyFailureKind',
    ),
    kind,
  );
  assert.equal(
    await evaluate("document.querySelector('textarea').value"),
    "The registered origin can safely supply these bytes again.",
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
  "source local-copy deletion must reflow without horizontal page overflow",
);
assert.ok(
  (await evaluate(
    `${button("Confirm exact local-copy deletion")}.getBoundingClientRect().height`,
  )) >= 44,
);
await evaluate(`${button("Confirm exact local-copy deletion")}.focus()`);
assert.equal(
  await evaluate(
    'document.activeElement.textContent.trim() === "Confirm exact local-copy deletion"',
  ),
  true,
);
const accessibility = await send("Accessibility.getFullAXTree");
for (const heading of [
  "Details",
  "Delete local copy",
  "Exact copy is eligible",
  "Exact copy and freshness",
  "What remains and what changes",
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
      node.name?.value.includes("Reason for deleting this exact local copy"),
  ),
  "missing accessible deletion-reason textbox",
);

const reportPath = resolve(
  process.env.PETRA_WAVE6_SOURCE_LOCAL_COPY_DELETION_BROWSER_OUTPUT ??
    "reports/WAVE6-SOURCE-LOCAL-COPY-DELETION-BROWSER.json",
);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      schema_name: "petra.wave6-source-local-copy-deletion-browser-observation",
      schema_version: 1,
      observed_at: new Date().toISOString(),
      operations: ["source.delete-local-copy"],
      production_boundary:
        "Production Source Details SourceLocalCopyDeletionAction with the renderer-neutral ProjectSourceLocalCopyDeletionClient boundary and deterministic typed transport.",
      exercised: [
        "distinct Project-link removal and local-copy deletion controls",
        "server-owned eligible and dependency-blocked preview states",
        "exact Project, ProjectDefinition, ProjectSource, manifest, Artifact, hash, size, and media-type presentation",
        "retained Project link, identities, rights, selectors, provenance, History, and reacquisition consequences",
        "required human reason and exact command/idempotency retry",
        "applied, replayed, conflict, permission, rejected, and durable unknown-effect recovery outcomes",
        "exact originating source-task selection and trigger-focus return",
        "narrow viewport, 200% text, reduced motion, keyboard focus, touch target, and browser semantics",
      ],
      exclusions: [
        "No PostgreSQL or S3 service was started by this focused browser run.",
        "The representative production setup still needs an eligible stored copy and DeleteLocalSourceCopy grant before this operation can be marked live.",
        "This is not the complete UX1.6-SOURCES register/process/inspect/replace/remove/delete/recovery workflow.",
      ],
    },
    null,
    2,
  )}\n`,
  "utf8",
);
process.stdout.write(
  `Wave 6 source local-copy deletion browser checks passed: ${reportPath}\n`,
);
