import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const workbenchUrl =
  process.env.PETRA_SOURCE_REVISION_WORKBENCH_URL ?? "http://127.0.0.1:4311";
const socketUrl = process.env.PETRA_SOURCE_REVISION_CHROME_SOCKET;
if (socketUrl === undefined) {
  throw new Error("The focused source revision Chrome socket is required.");
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
    url: `${workbenchUrl}/test/source-revision-browser.html?mode=${mode}`,
  });
  await until('document.body.innerText.includes("Reviewed version identity")');
};
const setField = async (label, value) => {
  await evaluate(`(()=>{
    const field=[...document.querySelectorAll("label.petra-field")].find((candidate)=>candidate.querySelector(".petra-field__label")?.textContent.startsWith(${JSON.stringify(label)}));
    const control=field?.querySelector("input, textarea, select");
    if(!control) throw new Error("Missing field: "+${JSON.stringify(label)});
    const prototype=control instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:control instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype,"value").set.call(control,${JSON.stringify(value)});
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement?"change":"input",{bubbles:true}));
  })()`);
};
const fillForm = async () => {
  await setField("Version label", "Corrected manuscript");
  await setField("Publication status", "corrected");
  await setField("Metadata source", "Publisher record");
  await setField("Metadata record ID", "version-2");
  await setField("Metadata observed at", "2026-09-20T12:00");
  await setField("Source location", "https://example.test/corrected.pdf");
  await setField("Access basis", "open_license");
  await setField("Rights decision status", "verified");
  await setField(
    "Rights rationale",
    "The corrected copy carries the observed license.",
  );
  await setField("Rights observed at", "2026-09-20T12:01");
  await setField("Rights policy version", "petra-local-rights-v1");
  await setField(
    "Why this is the newer version",
    "The publisher identifies this exact copy as the correction.",
  );
  await setField("Replacement reviewed at", "2026-09-20T12:02");
  await evaluate(`(()=>{
    const field=[...document.querySelectorAll("label.petra-field")].find((candidate)=>candidate.textContent.includes("New version file"));
    const input=field.querySelector('input[type="file"]');
    const transfer=new DataTransfer();
    transfer.items.add(new File(["corrected source bytes"],"corrected.txt",{type:"text/plain"}));
    input.files=transfer.files;
    input.dispatchEvent(new Event("change",{bubbles:true}));
    const store=[...document.querySelectorAll("label")].find((candidate)=>candidate.textContent.trim()==="Store this exact copy")?.querySelector("input");
    store.click();
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
for (const copy of [
  "Add new version",
  "Copy-specific rights",
  "Governed replacement review",
  "does not exclude the earlier version or create the relationship",
]) {
  assert.equal(
    await evaluate(`document.body.innerText.includes(${JSON.stringify(copy)})`),
    true,
    `missing source revision copy: ${copy}`,
  );
}
await fillForm();
await evaluate(`${button("Add new immutable version")}.click()`);
await until('document.body.innerText.includes("Adding new version")');
await until('document.body.innerText.includes("outcome not confirmed")');
assert.equal(
  await evaluate(`(()=>{
    const field=[...document.querySelectorAll("label.petra-field")].find((candidate)=>candidate.textContent.includes("Version label"));
    return field.querySelector("input").value;
  })()`),
  "Corrected manuscript",
  "unknown outcome must preserve reviewed input",
);
await evaluate(`${button("Check source-version effect")}.click()`);
await until('document.body.innerText.includes("outcome is still unknown")');
await evaluate(`${button("Retry exact source version")}.click()`);
await until(
  'document.body.innerText.includes("This exact version was already added")',
);
const recovered = await evaluate(
  "({requests:window.sourceRevisionCalls.requests,recoveries:window.sourceRevisionCalls.recoveries})",
);
assert.equal(recovered.requests.length, 2);
assert.equal(recovered.recoveries.length, 1);
assert.deepEqual(recovered.requests[0], recovered.recoveries[0]);
assert.deepEqual(recovered.requests[0], recovered.requests[1]);
assert.deepEqual(recovered.requests[0].expected, {
  project_ref: recovered.requests[1].expected.project_ref,
  project_definition_ref: recovered.requests[1].expected.project_definition_ref,
  current_source_ref: recovered.requests[1].expected.current_source_ref,
});
for (const field of [
  "actor",
  "capability_grant_id",
  "successor_source_ref",
  "storage",
  "recorded_at",
]) {
  assert.equal(field in recovered.requests[0], false);
}
assert.equal(
  await evaluate(
    'document.body.innerText.includes("The earlier version has not been replaced")',
  ),
  true,
);
assert.equal(await evaluate("window.sourceRevisionCalls.exclusions.length"), 0);
assert.equal(
  await evaluate("window.sourceRevisionCalls.replacements.length"),
  0,
);
await evaluate(`${button("Review and exclude earlier version")}.click()`);
await until('document.body.innerText.includes("Earlier version excluded")');
assert.equal(await evaluate("window.sourceRevisionCalls.exclusions.length"), 1);
assert.equal(
  await evaluate("window.sourceRevisionCalls.replacements.length"),
  0,
);
await evaluate(`${button("Record version replacement")}.click()`);
await until(
  'document.body.innerText.includes("Newer-version relationship recorded")',
);
const handoff = await evaluate(
  "({exclusion:window.sourceRevisionCalls.exclusions[0],replacement:window.sourceRevisionCalls.replacements[0]})",
);
assert.equal(handoff.exclusion.requestedAction, "exclude_project_source");
assert.equal(handoff.exclusion.expectedSourceRef.status, "active");
assert.equal(handoff.replacement.replacedSourceRef.status, "excluded");
assert.equal(handoff.replacement.replacementSourceRef.status, "active");
assert.notEqual(
  handoff.replacement.replacedSourceRef.project_source_id,
  handoff.replacement.replacementSourceRef.project_source_id,
);
assert.match(
  handoff.replacement.exclusionReceiptRef.record_hash,
  /^sha256:[0-9a-f]{64}$/u,
);
const exactReturn = await evaluate(`(()=>{
  const link=[...document.querySelectorAll("a")].find((candidate)=>candidate.textContent.includes("Return to the exact source task"));
  const url=new URL(link.href);
  return url.pathname+url.search;
})()`);
assert.equal(
  exactReturn,
  `/projects/${recovered.requests[0].expected.project_ref.project_id}/sources/${recovered.requests[0].expected.current_source_ref.project_source_id}?from=review&reviewId=review_session_01K6V000000000000000000027`,
);

await navigate("applied");
await fillForm();
await evaluate(`${button("Add new immutable version")}.click()`);
await until('document.body.innerText.includes("New immutable version added")');
assert.equal(
  await evaluate(
    'document.querySelector("[data-revision-outcome]").dataset.revisionOutcome',
  ),
  "applied",
);

for (const [mode, copy, kind] of [
  ["conflict", "The exact source state changed", "conflict"],
  ["authorization", "Source-version access changed", "authorization"],
  ["failure", "The new version was not retained", "rejected"],
]) {
  await navigate(mode);
  await fillForm();
  await evaluate(`${button("Add new immutable version")}.click()`);
  await until(`document.body.innerText.includes(${JSON.stringify(copy)})`);
  assert.equal(
    await evaluate(
      'document.querySelector("[data-failure-kind]").dataset.failureKind',
    ),
    kind,
  );
  assert.equal(
    await evaluate(`(()=>{
      const field=[...document.querySelectorAll("label.petra-field")].find((candidate)=>candidate.textContent.includes("Version label"));
      return field.querySelector("input").value;
    })()`),
    "Corrected manuscript",
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
await evaluate('document.documentElement.style.fontSize="200%"');
await evaluate(
  "new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)))",
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
  true,
  "source revision must reflow without horizontal page overflow",
);
assert.ok(
  (await evaluate(
    `${button("Add new immutable version")}.getBoundingClientRect().height`,
  )) >= 44,
);
await evaluate(`${button("Add new immutable version")}.focus()`);
assert.equal(
  await evaluate(
    'document.activeElement.textContent.trim() === "Add new immutable version"',
  ),
  true,
);
const accessibility = await send("Accessibility.getFullAXTree");
assert.ok(
  accessibility.nodes.some(
    (node) =>
      node.role?.value === "heading" && node.name?.value === "Add new version",
  ),
  "missing accessible Add new version heading",
);
for (const group of [
  "Reviewed version identity",
  "Exact new material",
  "Copy-specific rights",
  "Governed replacement review",
]) {
  assert.ok(
    accessibility.nodes.some(
      (node) => node.role?.value === "group" && node.name?.value === group,
    ),
    `missing accessible field group: ${group}`,
  );
}

const reportPath = resolve(
  process.env.PETRA_WAVE6_SOURCE_REVISION_BROWSER_OUTPUT ??
    "reports/WAVE6-SOURCE-REVISION-BROWSER.json",
);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      schema_name: "petra.wave6-source-revision-browser-observation",
      schema_version: 1,
      observed_at: new Date().toISOString(),
      operations: ["source.add-revision"],
      production_boundary:
        "Production SourceRevisionPanel with the renderer-neutral ProjectSourceRevisionClient boundary and deterministic typed transport.",
      exercised: [
        "exact Project, ProjectDefinition, and active predecessor binding",
        "immutable bytes, metadata, copy-rights, and replacement review",
        "pending, applied, replayed, conflict, authorization, rejected, and unknown-effect recovery states",
        "stable command and idempotency retry with preserved reviewed input",
        "separate predecessor exclusion and successor replacement controls",
        "exact originating source-task return",
        "narrow viewport, 200% text, reduced motion, keyboard focus, and browser semantics",
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
  `Wave 6 source revision browser checks passed: ${reportPath}\n`,
);
